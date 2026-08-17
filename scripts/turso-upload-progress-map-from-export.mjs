import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";

const require = createRequire(import.meta.url);
const compiledRoot = path.resolve(process.cwd(), ".tmp/repo-tests/src/lib/waymark");

if (!fs.existsSync(path.join(compiledRoot, "tursoHierarchyProjectionSync.js"))) {
  throw new Error("Compiled repository files are missing. Run `npx tsc -p tsconfig.repo-tests.json` first.");
}

const {
  WAYMARK_PROGRESS_PROJECTION_ENTITY_TYPES,
  uploadHierarchyProjectionToTurso,
} = require(path.join(compiledRoot, "tursoHierarchyProjectionSync.js"));
const { createWaymarkTursoClient, WaymarkTursoRemoteAdapter } = require(path.join(compiledRoot, "tursoRemoteAdapter.js"));

class NodeSqliteAdapter {
  constructor(database, planningTemplateByMarkId = new Map()) {
    this.database = database;
    this.planningTemplateByMarkId = planningTemplateByMarkId;
  }

  async runAsync(source, ...params) {
    const result = this.database.prepare(source).run(...params);
    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid ?? 0),
    };
  }

  async getFirstAsync(source, ...params) {
    return this.database.prepare(source).get(...params) ?? null;
  }

  async getAllAsync(source, ...params) {
    const rows = this.database.prepare(source).all(...params);
    if (!/\bFROM\s+mark_instances\b/iu.test(source)) {
      return rows;
    }
    return rows.map((row) => applyPlanningTemplateFallback(row, this.planningTemplateByMarkId));
  }
}

loadDotEnv();

const cliArgs = process.argv.slice(2);
const marksOnlyFast = cliArgs.includes("--marks-only-fast");
const trailDaysOnly = cliArgs.includes("--trail-days-only");
const databasePathArgument = cliArgs.filter((value) => !value.startsWith("--")).join(" ");
const databasePath = databasePathArgument ? path.resolve(databasePathArgument) : null;
if (!databasePath || !fs.existsSync(databasePath)) {
  throw new Error(
    "Usage: npm run turso:upload-progress-from-export -- <path-to-waymark.db-copy> [--marks-only-fast | --trail-days-only]",
  );
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
}

const database = new DatabaseSync(databasePath);
const bindingResolution = resolvePlanningTemplateBindings(database);
const executor = new NodeSqliteAdapter(database, bindingResolution.templateByMarkId);
const client = createWaymarkTursoClient({ url, authToken });

try {
  const metadata = database
    .prepare("SELECT db_instance_id, vault_id, device_id FROM app_db_metadata LIMIT 1;")
    .get();
  if (!metadata?.vault_id || !metadata?.device_id) {
    throw new Error("The exported database is missing Waymark vault/device provenance.");
  }

  const localCoverage = database
    .prepare(`
      SELECT
        COUNT(*) AS total_marks,
        SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) AS active_marks,
        SUM(CASE WHEN deleted_at IS NULL AND status = 'completed' THEN 1 ELSE 0 END) AS completed_marks,
        SUM(CASE WHEN deleted_at IS NULL AND origin = 'weekly_planned' THEN 1 ELSE 0 END) AS weekly_planned_marks,
        SUM(CASE WHEN deleted_at IS NULL AND expedition_id IS NOT NULL THEN 1 ELSE 0 END) AS expedition_linked_marks,
        SUM(CASE WHEN deleted_at IS NULL AND milestone_id IS NOT NULL THEN 1 ELSE 0 END) AS milestone_linked_marks
      FROM mark_instances;
    `)
    .get();
  const brokenReferences = database
    .prepare(`
      SELECT COUNT(*) AS count
      FROM mark_instances m
      LEFT JOIN paths p ON p.id = m.path_id
      LEFT JOIN expeditions e ON e.id = m.expedition_id
      LEFT JOIN milestones ms ON ms.id = m.milestone_id
      WHERE p.id IS NULL
        OR (m.expedition_id IS NOT NULL AND e.id IS NULL)
        OR (m.milestone_id IS NOT NULL AND ms.id IS NULL);
    `)
    .get();
  if (Number(brokenReferences?.count ?? 0) > 0) {
    throw new Error(`Export contains ${brokenReferences.count} mark rows with broken hierarchy references.`);
  }

  console.log(
    `Local progress coverage: marks=${localCoverage?.active_marks ?? 0}, completed=${localCoverage?.completed_marks ?? 0}, weekly_planned=${localCoverage?.weekly_planned_marks ?? 0}, expedition_linked=${localCoverage?.expedition_linked_marks ?? 0}, milestone_linked=${localCoverage?.milestone_linked_marks ?? 0}`,
  );

  const adapter = new WaymarkTursoRemoteAdapter(client);
  await adapter.ensureSchema();
  await validateRemoteTemplateReferences({ client, vaultId: String(metadata.vault_id), database, bindingResolution });
  console.log(
    `Template binding preflight: planning_links=${bindingResolution.linkedMarks}, recovered=${bindingResolution.recoveredMarks}, conflicts=0`,
  );
  if (marksOnlyFast || trailDaysOnly) {
    const trailDays = await uploadTrailDaysFromExport({
      database,
      adapter,
      vaultId: String(metadata.vault_id),
      deviceId: String(metadata.device_id),
    });
    console.log(`Turso Trail Day bootstrap: scanned=${trailDays.scanned}, uploaded=${trailDays.uploaded}`);
  }
  if (marksOnlyFast) {
    const result = await uploadMarksInBatches({
      database,
      client,
      vaultId: String(metadata.vault_id),
      planningTemplateByMarkId: bindingResolution.templateByMarkId,
    });
    console.log(`Turso mark bootstrap: scanned=${result.scanned}, uploaded=${result.uploaded}, batches=${result.batches}`);
  } else if (!trailDaysOnly) {
    const result = await uploadHierarchyProjectionToTurso({
      executor,
      adapter,
      vaultId: String(metadata.vault_id),
      deviceId: String(metadata.device_id),
      limitPerEntity: 100000,
      entityTypes: WAYMARK_PROGRESS_PROJECTION_ENTITY_TYPES,
      maxPushAttempts: 3,
      retryDelayMs: 750,
      stopOnTransientFailure: true,
    });

    console.log(
      `Turso progress upload: scanned=${result.scanned}, uploaded=${result.uploaded}, duplicates=${result.duplicates}, failed=${result.failed.length}`,
    );
    for (const [entityType, stats] of Object.entries(result.byEntityType)) {
      console.log(
        `  ${entityType}: scanned=${stats.scanned}, uploaded=${stats.uploaded}, duplicates=${stats.duplicates}, failed=${stats.failed}`,
      );
    }
    if (result.failed.length > 0) {
      console.error(JSON.stringify(result.failed, null, 2));
      process.exitCode = 1;
    }
  }
} finally {
  client.close();
  database.close();
}

async function uploadTrailDaysFromExport({ database, adapter, vaultId, deviceId }) {
  const trailDays = database
    .prepare(`
      SELECT
        id, user_id, local_date, status, anchor_path_id, closed_at, reopened_at,
        close_summary, tomorrow_first_step, character_result, planned_mark_count,
        completed_mark_count, skipped_mark_count, memory_count, created_at,
        updated_at, deleted_at, local_revision
      FROM trail_days
      ORDER BY local_date, id;
    `)
    .all();

  let uploaded = 0;
  for (const trailDay of trailDays) {
    await adapter.upsertPlanningTrailDaySnapshot({
      snapshot: {
        id: String(trailDay.id),
        vaultId,
        userId: String(trailDay.user_id),
        localDate: String(trailDay.local_date),
        status: String(trailDay.status),
        anchorPathId: trailDay.anchor_path_id === null ? null : String(trailDay.anchor_path_id),
        closedAt: trailDay.closed_at === null ? null : Number(trailDay.closed_at),
        reopenedAt: trailDay.reopened_at === null ? null : Number(trailDay.reopened_at),
        closeSummary: trailDay.close_summary === null ? null : String(trailDay.close_summary),
        tomorrowFirstStep: trailDay.tomorrow_first_step === null ? null : String(trailDay.tomorrow_first_step),
        characterResult: trailDay.character_result === null ? null : String(trailDay.character_result),
        plannedMarkCount: Number(trailDay.planned_mark_count),
        completedMarkCount: Number(trailDay.completed_mark_count),
        skippedMarkCount: Number(trailDay.skipped_mark_count),
        memoryCount: Number(trailDay.memory_count),
        createdAt: Number(trailDay.created_at),
        updatedAt: Number(trailDay.updated_at),
        deletedAt: trailDay.deleted_at === null ? null : Number(trailDay.deleted_at),
      },
      mutationId: `bootstrap_export:${vaultId}:${deviceId}:trail_day:${trailDay.id}:${trailDay.local_revision}`,
    });
    uploaded += 1;
  }

  return { scanned: trailDays.length, uploaded };
}

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator < 0) {
      continue;
    }
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function uploadMarksInBatches({ database, client, vaultId, planningTemplateByMarkId }) {
  const marks = database
    .prepare(`
      SELECT
        id, user_id, path_id, trail_day_id, template_id, expedition_id, milestone_id,
        title, description, origin, status, scheduled_start_at, scheduled_end_at,
        due_at, completed_at, skipped_at, expired_at, proof_note, completion_summary,
        substituted_by_mark_id, rescheduled_to_mark_id, source_backlog_item_id,
        generation_key, created_at, updated_at, deleted_at, local_revision
      FROM mark_instances
      ORDER BY id;
    `)
    .all()
    .map((row) => applyPlanningTemplateFallback(row, planningTemplateByMarkId));
  const insertPrefix = `INSERT INTO mark_instances (
      id, vault_id, user_id, path_id, trail_day_id, template_id, expedition_id,
      milestone_id, title, description, origin, status, scheduled_start_at,
      scheduled_end_at, due_at, completed_at, skipped_at, expired_at,
      proof_note, completion_summary, substituted_by_mark_id,
      rescheduled_to_mark_id, source_backlog_item_id, generation_key,
      created_at, updated_at, deleted_at, last_mutation_id
    ) VALUES `;
  const updateSuffix = ` ON CONFLICT(vault_id, id) DO UPDATE SET
      path_id = excluded.path_id,
      trail_day_id = excluded.trail_day_id,
      template_id = COALESCE(excluded.template_id, mark_instances.template_id),
      expedition_id = excluded.expedition_id,
      milestone_id = excluded.milestone_id,
      title = excluded.title,
      description = excluded.description,
      origin = excluded.origin,
      status = excluded.status,
      scheduled_start_at = excluded.scheduled_start_at,
      scheduled_end_at = excluded.scheduled_end_at,
      due_at = excluded.due_at,
      completed_at = excluded.completed_at,
      skipped_at = excluded.skipped_at,
      expired_at = excluded.expired_at,
      proof_note = excluded.proof_note,
      completion_summary = excluded.completion_summary,
      substituted_by_mark_id = excluded.substituted_by_mark_id,
      rescheduled_to_mark_id = excluded.rescheduled_to_mark_id,
      source_backlog_item_id = excluded.source_backlog_item_id,
      generation_key = excluded.generation_key,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      last_mutation_id = excluded.last_mutation_id;`;

  let batches = 0;
  for (let index = 0; index < marks.length; index += 100) {
    const chunk = marks.slice(index, index + 100);
    const statements = chunk.map((mark) => {
      const values = [
          mark.id,
          vaultId,
          mark.user_id,
          mark.path_id,
          mark.trail_day_id,
          mark.template_id,
          mark.expedition_id,
          mark.milestone_id,
          mark.title,
          mark.description,
          mark.origin,
          mark.status,
          mark.scheduled_start_at,
          mark.scheduled_end_at,
          mark.due_at,
          mark.completed_at,
          mark.skipped_at,
          mark.expired_at,
          mark.proof_note,
          mark.completion_summary,
          mark.substituted_by_mark_id,
          mark.rescheduled_to_mark_id,
          mark.source_backlog_item_id,
          mark.generation_key,
          mark.created_at,
          mark.updated_at,
          mark.deleted_at,
          `bootstrap_export:${vaultId}:mark_instance:${mark.id}:${mark.local_revision}`,
        ];
      return `${insertPrefix}(${values.map(sqlLiteral).join(", ")})${updateSuffix}`;
    });
    await client.executeMultiple(statements.join("\n"));
    batches += 1;
    console.log(`Uploaded mark batch ${batches}: ${Math.min(index + chunk.length, marks.length)}/${marks.length}`);
  }
  return { scanned: marks.length, uploaded: marks.length, batches };
}

function resolvePlanningTemplateBindings(database) {
  const hasPlanningTable = database
    .prepare("SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = 'week_plan_items' LIMIT 1;")
    .get();
  if (!hasPlanningTable) {
    return { templateByMarkId: new Map(), linkedMarks: 0, recoveredMarks: 0 };
  }

  const rows = database
    .prepare(`
      SELECT m.id AS mark_id, m.template_id AS mark_template_id,
             wpi.id AS week_plan_item_id, wpi.template_id AS planning_template_id
      FROM mark_instances m
      JOIN week_plan_items wpi
        ON wpi.deleted_at IS NULL
       AND wpi.template_id IS NOT NULL
       AND (
         wpi.created_mark_instance_id = m.id
         OR (
           m.generation_key IS NOT NULL
           AND m.generation_key = CASE
             WHEN wpi.deterministic_import_key LIKE 'weekly_timetable:%'
               THEN 'weekly_planned:' || SUBSTR(wpi.deterministic_import_key, LENGTH('weekly_timetable:') + 1)
             ELSE 'weekly_planned:' || wpi.deterministic_import_key
           END
         )
       )
      WHERE m.deleted_at IS NULL
      ORDER BY m.id, wpi.id;
    `)
    .all();

  const candidatesByMarkId = new Map();
  for (const row of rows) {
    const markId = String(row.mark_id);
    const candidates = candidatesByMarkId.get(markId) ?? new Set();
    candidates.add(String(row.planning_template_id));
    candidatesByMarkId.set(markId, candidates);
  }

  const templateByMarkId = new Map();
  let recoveredMarks = 0;
  for (const [markId, candidates] of candidatesByMarkId) {
    if (candidates.size !== 1) {
      throw new Error(`Mark ${markId} is linked to conflicting planning templateIds: ${[...candidates].join(", ")}.`);
    }
    const planningTemplateId = [...candidates][0];
    const row = rows.find((candidate) => String(candidate.mark_id) === markId);
    if (row.mark_template_id && String(row.mark_template_id) !== planningTemplateId) {
      throw new Error(
        `Mark ${markId} template ${row.mark_template_id} conflicts with planning template ${planningTemplateId}.`,
      );
    }
    templateByMarkId.set(markId, planningTemplateId);
    if (!row.mark_template_id) {
      recoveredMarks += 1;
    }
  }
  return { templateByMarkId, linkedMarks: templateByMarkId.size, recoveredMarks };
}

function applyPlanningTemplateFallback(row, planningTemplateByMarkId) {
  if (!row || row.id === null || row.id === undefined || !("template_id" in row)) {
    return row;
  }
  const planningTemplateId = planningTemplateByMarkId.get(String(row.id));
  if (!planningTemplateId || row.template_id !== null) {
    return row;
  }
  return { ...row, template_id: planningTemplateId };
}

async function validateRemoteTemplateReferences({ client, vaultId, database, bindingResolution }) {
  const localTemplateIds = database
    .prepare("SELECT DISTINCT template_id FROM mark_instances WHERE deleted_at IS NULL AND template_id IS NOT NULL;")
    .all()
    .map((row) => String(row.template_id));
  const requiredIds = [...new Set([...localTemplateIds, ...bindingResolution.templateByMarkId.values()])];
  const existingIds = new Set();
  for (let index = 0; index < requiredIds.length; index += 100) {
    const chunk = requiredIds.slice(index, index + 100);
    const result = await client.execute({
      sql: `SELECT id FROM mark_templates
        WHERE vault_id = ? AND deleted_at IS NULL AND id IN (${chunk.map(() => "?").join(", ")});`,
      args: [vaultId, ...chunk],
    });
    for (const row of result.rows) existingIds.add(String(row[0]));
  }
  const missingIds = requiredIds.filter((id) => !existingIds.has(id));
  if (missingIds.length > 0) {
    throw new Error(`Export references MarkTemplates missing on Turso: ${missingIds.join(", ")}. Upload foundation first.`);
  }
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite numeric SQL value: ${value}`);
    }
    return String(value);
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}
