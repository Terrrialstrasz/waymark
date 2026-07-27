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
  const planningCheckMatch = planningSource.match(/const\s+PLANNING_ENTITY_TYPE_CHECK\s*=\s*\n\s*"([^"]+)";/);
  if (!planningCheckMatch?.[1]) {
    throw new Error("Unable to extract PLANNING_ENTITY_TYPE_CHECK from planning schema.");
  }
  const remoteSchema = extractTemplateLiteral(adapterSource, "REMOTE_SCHEMA_SQL");
  const planningSchema = extractTemplateLiteral(planningSource, "TURSO_PLANNING_SCHEMA_SQL").replaceAll(
    "${PLANNING_ENTITY_TYPE_CHECK}",
    planningCheckMatch[1],
  );
  return `${remoteSchema}\n${planningSchema}`;
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
        'mark_instances',
        'expedition_planned_marks'
      )
    ORDER BY name;
  `);
  const objects = result.rows.map((row) => String(row.name));
  console.log(`Turso schema ready: ${objects.join(", ")}`);
} finally {
  client.close();
}

async function repairPlanningSchemaResidue(client) {
  await dropPlanningTriggers(client);
  await restoreInterruptedPlanningTableRename(client, "waymark_planning_authority");
  await restoreInterruptedPlanningTableRename(client, "waymark_planning_idempotency");
  await restoreInterruptedPlanningTableRename(client, "waymark_planning_change_log");
}

async function dropPlanningTriggers(client) {
  for (const triggerName of [
    "trg_turso_week_plans_insert_log",
    "trg_turso_week_plans_update_log",
    "trg_turso_week_plans_delete_log",
    "trg_turso_week_plan_items_insert_log",
    "trg_turso_week_plan_items_update_log",
    "trg_turso_week_plan_items_delete_log",
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
