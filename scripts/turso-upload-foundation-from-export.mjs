import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";

const require = createRequire(import.meta.url);
const compiledRoot = path.resolve(process.cwd(), ".tmp/repo-tests/src/lib/waymark");

if (!fs.existsSync(path.join(compiledRoot, "tursoRemoteAdapter.js"))) {
  throw new Error("Compiled repository files are missing. Run `npx tsc -p tsconfig.repo-tests.json` first.");
}

const {
  createWaymarkTursoClient,
  WaymarkTursoRemoteAdapter,
} = require(path.join(compiledRoot, "tursoRemoteAdapter.js"));

loadDotEnv();

const cliArgs = process.argv.slice(2);
const catalogOnly = cliArgs.includes("--catalog-only");
const planningOnly = cliArgs.includes("--planning-only");
const latestExport = cliArgs.includes("--latest-export");
const databasePathArgument = cliArgs.filter((value) => !value.startsWith("--")).join(" ");
if (latestExport && databasePathArgument) {
  throw new Error("Use either --latest-export or an explicit export path, not both.");
}
const databasePath = latestExport ? resolveLatestExportDatabasePath() : resolveExportDatabasePath(databasePathArgument);

if (!databasePath || !fs.existsSync(databasePath)) {
  throw new Error(
    "Usage: npm run turso:upload-foundation-from-export -- <path-to-export-dir-or-waymark.db> [--catalog-only | --planning-only], or use --latest-export.",
  );
}
if (catalogOnly && planningOnly) {
  throw new Error("Use at most one of --catalog-only and --planning-only.");
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
}

const database = new DatabaseSync(databasePath, { readOnly: true });
const client = createWaymarkTursoClient({ url, authToken });
console.log(`Foundation source database: ${databasePath}`);

try {
  const metadata = database
    .prepare("SELECT db_instance_id, vault_id, device_id FROM app_db_metadata LIMIT 1;")
    .get();
  if (!metadata?.vault_id || !metadata?.device_id) {
    throw new Error("The exported database is missing Waymark vault/device provenance.");
  }

  const vaultId = String(metadata.vault_id);
  const deviceId = String(metadata.device_id);
  const adapter = new WaymarkTursoRemoteAdapter(client);
  await adapter.ensureSchema();

  const result = {
    catalog: [],
    weekPlans: null,
    weekPlanItems: null,
  };

  if (!planningOnly) {
    const canonicalExerciseDefinitionIds = await buildCanonicalExerciseDefinitionIds(database, client, vaultId);
    for (const table of getCatalogTables()) {
      result.catalog.push(
        await uploadCatalogTable({ database, client, vaultId, table, canonicalExerciseDefinitionIds }),
      );
    }
  }

  if (!catalogOnly) {
    result.weekPlans = await uploadWeekPlans({ database, adapter, vaultId, deviceId });
    result.weekPlanItems = await uploadWeekPlanItems({ database, adapter, vaultId, deviceId });
  }

  for (const item of result.catalog) {
    console.log(`Catalog upload ${item.tableName}: scanned=${item.scanned}, uploaded=${item.uploaded}, batches=${item.batches}`);
  }
  if (result.weekPlans) {
    console.log(
      `Planning upload week_plans: scanned=${result.weekPlans.scanned}, uploaded=${result.weekPlans.uploaded}, duplicates=${result.weekPlans.duplicates}, failed=${result.weekPlans.failed.length}`,
    );
  }
  if (result.weekPlanItems) {
    console.log(
      `Planning upload week_plan_items: scanned=${result.weekPlanItems.scanned}, uploaded=${result.weekPlanItems.uploaded}, duplicates=${result.weekPlanItems.duplicates}, failed=${result.weekPlanItems.failed.length}`,
    );
  }

  const failed = [result.weekPlans, result.weekPlanItems].filter(Boolean).flatMap((item) => item.failed);
  if (failed.length > 0) {
    console.error(JSON.stringify(failed, null, 2));
    process.exitCode = 1;
  }
} finally {
  client.close();
  database.close();
}

function getCatalogTables() {
  return [
  {
    tableName: "mark_templates",
    columns: [
      "id",
      "user_id",
      "path_id",
      "title",
      "description",
      "template_type",
      "recurrence_type",
      "recurrence_rule_json",
      "default_duration_min",
      "default_signal_rule_json",
      "is_active",
      "created_at",
      "updated_at",
      "deleted_at",
      "local_revision",
    ],
  },
  {
    tableName: "pack_check_templates",
    columns: [
      "id",
      "user_id",
      "path_id",
      "title",
      "description",
      "template_type",
      "default_timing_rule_json",
      "default_available_offset_min",
      "default_due_offset_min",
      "default_signal_rule_json",
      "is_active",
      "created_at",
      "updated_at",
      "deleted_at",
      "local_revision",
    ],
  },
  {
    tableName: "pack_check_item_templates",
    columns: [
      "id",
      "user_id",
      "pack_check_template_id",
      "label",
      "description",
      "is_required",
      "sort_order",
      "order_index",
      "created_at",
      "updated_at",
      "deleted_at",
      "local_revision",
    ],
  },
  {
    tableName: "mark_pack_check_rules",
    columns: [
      "id",
      "user_id",
      "mark_template_id",
      "pack_check_template_id",
      "available_offset_min",
      "due_offset_min",
      "created_at",
      "updated_at",
      "deleted_at",
      "local_revision",
    ],
  },
  {
    tableName: "exercise_definitions",
    columns: [
      "id",
      "user_id",
      "path_id",
      "name",
      "title",
      "canonical_slug",
      "category",
      "measurement_type",
      "target_type",
      "default_rest_sec",
      "default_unit",
      "equipment",
      "is_system",
      "description",
      "created_at",
      "updated_at",
      "deleted_at",
      "local_revision",
    ],
  },
  {
    tableName: "workout_routine_templates",
    columns: [
      "id",
      "user_id",
      "path_id",
      "mark_template_id",
      "title",
      "routine_type",
      "description",
      "cycle_key",
      "estimated_duration_min",
      "is_active",
      "created_at",
      "updated_at",
      "deleted_at",
      "local_revision",
    ],
  },
  {
    tableName: "routine_exercise_templates",
    columns: [
      "id",
      "user_id",
      "workout_routine_template_id",
      "exercise_definition_id",
      "phase",
      "order_index",
      "target_type",
      "target_load_kg",
      "target_reps",
      "target_sets",
      "target_duration_sec",
      "target_distance_m",
      "target_steps",
      "rest_duration_sec",
      "progression_policy_json",
      "created_at",
      "updated_at",
      "deleted_at",
      "local_revision",
    ],
  },
  ];
}

async function uploadCatalogTable({ database, client, vaultId, table, canonicalExerciseDefinitionIds }) {
  const selectColumns = table.columns.join(", ");
  const sourceRows = database.prepare(`SELECT ${selectColumns} FROM ${table.tableName} ORDER BY id;`).all();
  const rows = normalizeCatalogRows(table.tableName, sourceRows, canonicalExerciseDefinitionIds);
  const remoteColumns = [
    "id",
    "vault_id",
    ...table.columns.filter((column) => column !== "id" && column !== "local_revision"),
    "last_import_id",
  ];
  const updateColumns = remoteColumns.filter((column) => column !== "id" && column !== "vault_id" && column !== "created_at");
  const insertPrefix = `INSERT INTO ${table.tableName} (${remoteColumns.join(", ")}) VALUES `;
  const updateSuffix = ` ON CONFLICT(vault_id, id) DO UPDATE SET ${updateColumns
    .map((column) => `${column} = excluded.${column}`)
    .join(", ")};`;

  let batches = 0;
  for (let index = 0; index < rows.length; index += 100) {
    const chunk = rows.slice(index, index + 100);
    const statements = chunk.map((row) => {
      const values = [
        row.id,
        vaultId,
        ...table.columns
          .filter((column) => column !== "id" && column !== "local_revision")
          .map((column) => row[column]),
        `catalog_export:${vaultId}:${table.tableName}:${row.id}:${row.local_revision ?? 0}`,
      ];
      return `${insertPrefix}(${values.map(sqlLiteral).join(", ")})${updateSuffix}`;
    });
    if (statements.length > 0) {
      await client.executeMultiple(statements.join("\n"));
      batches += 1;
    }
  }

  return { tableName: table.tableName, scanned: sourceRows.length, uploaded: rows.length, batches };
}

async function buildCanonicalExerciseDefinitionIds(database, client, vaultId) {
  const rows = database
    .prepare("SELECT id, canonical_slug FROM exercise_definitions ORDER BY canonical_slug, id;")
    .all();
  const remote = await client.execute({
    sql: `SELECT id, canonical_slug
          FROM exercise_definitions
          WHERE vault_id = ?
          ORDER BY canonical_slug, id;`,
    args: [vaultId],
  });
  const canonicalIdBySlug = new Map(
    remote.rows.map((row) => [String(row.canonical_slug), String(row.id)]),
  );
  const canonicalIdBySourceId = new Map();

  for (const row of rows) {
    const slug = String(row.canonical_slug);
    const sourceId = String(row.id);
    const canonicalId = canonicalIdBySlug.get(slug) ?? sourceId;
    canonicalIdBySlug.set(slug, canonicalId);
    canonicalIdBySourceId.set(sourceId, canonicalId);
  }

  return canonicalIdBySourceId;
}

function normalizeCatalogRows(tableName, rows, canonicalExerciseDefinitionIds) {
  if (tableName === "exercise_definitions") {
    const emittedIds = new Set();
    const normalizedRows = [];
    for (const row of rows) {
      const canonicalId = canonicalExerciseDefinitionIds.get(String(row.id)) ?? String(row.id);
      if (emittedIds.has(canonicalId)) {
        continue;
      }
      emittedIds.add(canonicalId);
      normalizedRows.push({ ...row, id: canonicalId });
    }
    return normalizedRows;
  }
  if (tableName === "routine_exercise_templates") {
    return rows.map((row) => ({
      ...row,
      exercise_definition_id:
        canonicalExerciseDefinitionIds.get(String(row.exercise_definition_id)) ?? String(row.exercise_definition_id),
    }));
  }
  return rows;
}

async function uploadWeekPlans({ database, adapter, vaultId, deviceId }) {
  const rows = database
    .prepare(
      `SELECT id, user_id, week_start_date, week_end_date, status, summary, note,
              created_at, updated_at, deleted_at, local_revision
       FROM week_plans
       ORDER BY week_start_date, id;`,
    )
    .all();
  const result = emptyPlanningUploadResult(rows.length);
  for (const row of rows) {
    try {
      const mutation = await adapter.upsertPlanningWeekPlanSnapshot({
        mutationId: `foundation_export:${vaultId}:${deviceId}:week_plan:${row.id}:${row.local_revision ?? 0}`,
        snapshot: {
          id: String(row.id),
          vaultId,
          userId: String(row.user_id),
          weekStartDate: String(row.week_start_date),
          weekEndDate: String(row.week_end_date),
          status: String(row.status),
          summary: row.summary === null ? null : String(row.summary),
          note: row.note === null ? null : String(row.note),
          createdAt: Number(row.created_at),
          updatedAt: Number(row.updated_at),
          deletedAt: row.deleted_at === null ? null : Number(row.deleted_at),
        },
      });
      if (mutation.duplicate) {
        result.duplicates += 1;
      } else {
        result.uploaded += 1;
      }
    } catch (error) {
      result.failed.push({ entityId: String(row.id), message: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}

async function uploadWeekPlanItems({ database, adapter, vaultId, deviceId }) {
  const rows = database
    .prepare(
      `SELECT id, user_id, week_plan_id, backlog_item_id, status, local_date, start_time, end_time,
              title, path_id, template_id, expedition_id, milestone_id, expedition_context,
              milestone_context, description, note, origin, block_key, deterministic_import_key,
              import_batch_id, created_mark_instance_id, sort_order, order_index, created_at,
              updated_at, deleted_at, local_revision
       FROM week_plan_items
       ORDER BY week_plan_id, sort_order, order_index, id;`,
    )
    .all();
  const result = emptyPlanningUploadResult(rows.length);
  for (const row of rows) {
    try {
      const mutation = await adapter.upsertPlanningWeekPlanItemSnapshot({
        mutationId: `foundation_export:${vaultId}:${deviceId}:week_plan_item:${row.id}:${row.local_revision ?? 0}`,
        snapshot: {
          id: String(row.id),
          vaultId,
          userId: String(row.user_id),
          weekPlanId: String(row.week_plan_id),
          backlogItemId: row.backlog_item_id === null ? null : String(row.backlog_item_id),
          status: String(row.status),
          localDate: row.local_date === null ? null : String(row.local_date),
          startTime: row.start_time === null ? null : String(row.start_time),
          endTime: row.end_time === null ? null : String(row.end_time),
          title: row.title === null ? null : String(row.title),
          pathId: row.path_id === null ? null : String(row.path_id),
          templateId: row.template_id === null ? null : String(row.template_id),
          expeditionId: row.expedition_id === null ? null : String(row.expedition_id),
          milestoneId: row.milestone_id === null ? null : String(row.milestone_id),
          expeditionContext: row.expedition_context === null ? null : String(row.expedition_context),
          milestoneContext: row.milestone_context === null ? null : String(row.milestone_context),
          description: row.description === null ? null : String(row.description),
          note: row.note === null ? null : String(row.note),
          origin: row.origin === null ? null : String(row.origin),
          blockKey: row.block_key === null ? null : String(row.block_key),
          deterministicImportKey: row.deterministic_import_key === null ? null : String(row.deterministic_import_key),
          importBatchId: row.import_batch_id === null ? null : String(row.import_batch_id),
          createdMarkInstanceId: null,
          sortOrder: Number(row.sort_order),
          orderIndex: Number(row.order_index),
          createdAt: Number(row.created_at),
          updatedAt: Number(row.updated_at),
          deletedAt: row.deleted_at === null ? null : Number(row.deleted_at),
        },
      });
      if (mutation.duplicate) {
        result.duplicates += 1;
      } else {
        result.uploaded += 1;
      }
    } catch (error) {
      result.failed.push({ entityId: String(row.id), message: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}

function emptyPlanningUploadResult(scanned) {
  return { scanned, uploaded: 0, duplicates: 0, failed: [] };
}

function resolveExportDatabasePath(input) {
  if (!input) {
    return null;
  }
  const resolved = path.resolve(input);
  if (!fs.existsSync(resolved)) {
    return resolved;
  }
  const stat = fs.statSync(resolved);
  return stat.isDirectory() ? path.join(resolved, "waymark.db") : resolved;
}

function resolveLatestExportDatabasePath() {
  const exportRoot = process.env.WAYMARK_DB_EXPORT_ROOT
    ? path.resolve(process.env.WAYMARK_DB_EXPORT_ROOT)
    : path.resolve(process.cwd(), "..", "waymark db export");
  if (!fs.existsSync(exportRoot) || !fs.statSync(exportRoot).isDirectory()) {
    return null;
  }
  const candidates = fs.readdirSync(exportRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("waymark-db-export-"))
    .map((entry) => path.join(exportRoot, entry.name, "waymark.db"))
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => ({ path: candidate, modifiedAt: fs.statSync(candidate).mtimeMs }))
    .sort((left, right) => right.modifiedAt - left.modifiedAt);
  return candidates[0]?.path ?? null;
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
