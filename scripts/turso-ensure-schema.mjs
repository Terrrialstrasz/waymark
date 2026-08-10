import fs from "node:fs";
import path from "node:path";
import { createClient } from "@tursodatabase/serverless/compat";

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function extractTemplateLiteral(source, constName) {
  const pattern = new RegExp(`(?:export\\s+)?const\\s+${constName}\\s*=\\s*\`([\\s\\S]*?)\`;`);
  const match = source.match(pattern);
  if (!match?.[1]) {
    throw new Error(`Unable to extract ${constName} from source.`);
  }
  return match[1];
}

function loadRemoteSchemaSql() {
  const adapterSource = readSource("src/lib/waymark/tursoRemoteAdapter.ts");
  const planningSource = readSource("src/lib/waymark/tursoPlanningSchema.ts");
  const catalogSource = readSource("src/lib/waymark/tursoCatalogSchema.ts");
  const contextSource = readSource("src/lib/waymark/tursoPlanningContextSchema.ts");
  const contextViewDrops = buildPlanningContextDropSql();
  const planningCheckMatch = planningSource.match(/const\s+PLANNING_ENTITY_TYPE_CHECK\s*=\s*\n\s*"([^"]+)";/);
  if (!planningCheckMatch?.[1]) {
    throw new Error("Unable to extract PLANNING_ENTITY_TYPE_CHECK from planning schema.");
  }
  const remoteSchema = extractTemplateLiteral(adapterSource, "REMOTE_SCHEMA_SQL");
  const planningSchema = extractTemplateLiteral(planningSource, "TURSO_PLANNING_SCHEMA_SQL")
    .replaceAll("${WAYMARK_TURSO_PLANNING_CONTEXT_VIEW_DROPS}", contextViewDrops)
    .replaceAll("${PLANNING_ENTITY_TYPE_CHECK}", planningCheckMatch[1]);
  const catalogSchema = extractTemplateLiteral(catalogSource, "TURSO_CATALOG_SCHEMA_SQL");
  const contextSchema = extractTemplateLiteral(contextSource, "TURSO_CHATGPT_CONTEXT_SCHEMA_SQL").replaceAll(
    "${getWaymarkTursoPlanningContextDropSql()}",
    contextViewDrops,
  );
  return `${remoteSchema}\n${planningSchema}\n${catalogSchema}\n${contextSchema}`;
}

function buildPlanningContextDropSql() {
  return [
    "chatgpt_week_planning_context",
    "chatgpt_expedition_progress_context",
    "chatgpt_milestone_mark_context",
    "chatgpt_signal_plan_context",
    "chatgpt_catalog_template_context",
  ]
    .map((viewName) => `DROP VIEW IF EXISTS ${viewName};`)
    .join("\n");
}

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
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

loadDotEnv();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
  process.exit(1);
}

const client = createClient({ url, authToken });

try {
  await dropPlanningContextViews(client);
  await repairPlanningSchemaResidue(client);
  await client.executeMultiple(loadRemoteSchemaSql());
  const result = await client.execute(`
    SELECT name
    FROM sqlite_master
    WHERE type IN ('table', 'view')
      AND name IN (
        'waymark_remote_records',
        'waymark_remote_change_log',
        'waymark_remote_idempotency',
        'waymark_planning_authority',
        'waymark_planning_change_log',
        'waymark_planning_idempotency',
        'week_plans',
        'week_plan_items',
        'signals',
        'paths',
        'expeditions',
        'milestones',
        'mark_templates',
        'pack_check_templates',
        'pack_check_item_templates',
        'mark_pack_check_rules',
        'exercise_definitions',
        'workout_routine_templates',
        'routine_exercise_templates',
        'chatgpt_week_planning_context',
        'chatgpt_expedition_progress_context',
        'chatgpt_milestone_mark_context',
        'chatgpt_signal_plan_context',
        'chatgpt_catalog_template_context',
        'mark_instances',
        'expedition_planned_marks',
        'expedition_milestone_marks',
        'milestone_progress',
        'expedition_progress'
      )
    ORDER BY name;
  `);
  const objects = result.rows.map((row) => String(row.name));
  console.log(`Turso schema ready: ${objects.join(", ")}`);
  const coverage = await client.execute(`
    SELECT
      (SELECT COUNT(*) FROM paths WHERE deleted_at IS NULL) AS paths,
      (SELECT COUNT(*) FROM expeditions WHERE deleted_at IS NULL) AS expeditions,
      (SELECT COUNT(*) FROM milestones WHERE deleted_at IS NULL) AS milestones,
      (SELECT COUNT(*) FROM mark_templates WHERE deleted_at IS NULL) AS mark_templates,
      (SELECT COUNT(*) FROM pack_check_templates WHERE deleted_at IS NULL) AS pack_check_templates,
      (SELECT COUNT(*) FROM exercise_definitions WHERE deleted_at IS NULL) AS exercise_definitions,
      (SELECT COUNT(*) FROM workout_routine_templates WHERE deleted_at IS NULL) AS workout_routine_templates,
      (SELECT COUNT(*) FROM mark_instances WHERE deleted_at IS NULL) AS marks,
      (SELECT COUNT(*) FROM mark_instances WHERE deleted_at IS NULL AND completed_at IS NOT NULL) AS historical_completed_marks,
      (SELECT COUNT(*) FROM mark_instances WHERE deleted_at IS NULL AND origin = 'weekly_planned') AS weekly_planned_marks,
      (SELECT COUNT(*) FROM mark_instances WHERE deleted_at IS NULL AND milestone_id IS NOT NULL) AS milestone_linked_marks,
      (SELECT COUNT(*) FROM expedition_milestone_marks WHERE mark_instance_id IS NOT NULL) AS hierarchy_view_marks,
      (SELECT COUNT(*) FROM milestone_progress) AS milestone_progress_rows,
      (SELECT COUNT(*) FROM expedition_progress) AS expedition_progress_rows;
  `);
  const counts = coverage.rows[0] ?? {};
  console.log(
    `Turso progress coverage: paths=${counts.paths ?? 0}, expeditions=${counts.expeditions ?? 0}, milestones=${counts.milestones ?? 0}, marks=${counts.marks ?? 0}, completed=${counts.historical_completed_marks ?? 0}, weekly_planned=${counts.weekly_planned_marks ?? 0}, milestone_linked=${counts.milestone_linked_marks ?? 0}, hierarchy_view_marks=${counts.hierarchy_view_marks ?? 0}, milestone_progress_rows=${counts.milestone_progress_rows ?? 0}, expedition_progress_rows=${counts.expedition_progress_rows ?? 0}`,
  );
  console.log(
    `Turso catalog coverage: mark_templates=${counts.mark_templates ?? 0}, pack_check_templates=${counts.pack_check_templates ?? 0}, exercise_definitions=${counts.exercise_definitions ?? 0}, workout_routine_templates=${counts.workout_routine_templates ?? 0}`,
  );
} finally {
  client.close();
}

async function repairPlanningSchemaResidue(client) {
  await dropPlanningTriggers(client);
  await restoreInterruptedPlanningTableRename(client, "waymark_planning_authority");
  await restoreInterruptedPlanningTableRename(client, "waymark_planning_idempotency");
  await restoreInterruptedPlanningTableRename(client, "waymark_planning_change_log");
}

async function dropPlanningContextViews(client) {
  for (const viewName of [
    "chatgpt_week_planning_context",
    "chatgpt_expedition_progress_context",
    "chatgpt_milestone_mark_context",
    "chatgpt_signal_plan_context",
    "chatgpt_catalog_template_context",
  ]) {
    await client.execute(`DROP VIEW IF EXISTS ${viewName};`);
  }
}

async function dropPlanningTriggers(client) {
  for (const triggerName of [
    "trg_turso_week_plans_insert_log",
    "trg_turso_week_plans_update_log",
    "trg_turso_week_plans_delete_log",
    "trg_turso_week_plan_items_insert_log",
    "trg_turso_week_plan_items_update_log",
    "trg_turso_week_plan_items_delete_log",
    "trg_turso_paths_insert_log",
    "trg_turso_paths_update_log",
    "trg_turso_paths_delete_log",
    "trg_turso_expeditions_insert_log",
    "trg_turso_expeditions_update_log",
    "trg_turso_expeditions_delete_log",
    "trg_turso_milestones_insert_log",
    "trg_turso_milestones_update_log",
    "trg_turso_milestones_delete_log",
  ]) {
    await client.execute(`DROP TRIGGER IF EXISTS ${triggerName};`);
  }
}

async function restoreInterruptedPlanningTableRename(client, tableName) {
  const nextTableName = `${tableName}_next`;
  const result = await client.execute({
    sql: `SELECT name
          FROM sqlite_master
          WHERE type = 'table' AND name IN (?, ?);`,
    args: [tableName, nextTableName],
  });
  const tableNames = new Set(result.rows.map((row) => String(row.name)));
  if (!tableNames.has(tableName) && tableNames.has(nextTableName)) {
    await client.execute(`ALTER TABLE ${nextTableName} RENAME TO ${tableName};`);
  }
}
