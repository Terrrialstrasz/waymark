import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(import.meta.dirname, "..");
const temporaryRoot = path.join(repoRoot, ".tmp") + path.sep;
const dbPath = path.resolve(process.argv[2] ?? "");
const weekStartDate = process.argv[3] ?? "2026-08-10";

assert.ok(dbPath.startsWith(temporaryRoot), "Audit refuses to mutate a database outside the repository .tmp directory.");

const { createSQLiteRepositoryProvider } = require(path.join(repoRoot, ".tmp/repo-tests/src/db/adapters/SQLiteRepositories.js"));
const { bootstrapWaymarkMap } = require(path.join(repoRoot, ".tmp/repo-tests/src/waymark-map/bootstrap.js"));
const { WAYMARK_MAP_CONFIG } = require(path.join(repoRoot, ".tmp/repo-tests/src/waymark-map/index.js"));
const { reconcileLocalWeeklyPlanningMaterialization } = require(
  path.join(repoRoot, ".tmp/repo-tests/src/lib/waymark/tursoPlanningSync.js"),
);

class NodeSqliteAdapter {
  constructor(db) {
    this.db = db;
  }

  async execAsync(source) {
    this.db.exec(source);
  }

  async runAsync(source, ...params) {
    const result = this.db.prepare(source).run(...params);
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid ?? 0) };
  }

  async getFirstAsync(source, ...params) {
    return this.db.prepare(source).get(...params) ?? null;
  }

  async getAllAsync(source, ...params) {
    return this.db.prepare(source).all(...params);
  }

  async withExclusiveTransactionAsync(task) {
    this.db.exec("BEGIN IMMEDIATE;");
    try {
      await task(new NodeSqliteAdapter(this.db));
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }
}

function readState(sqlite) {
  const plan = sqlite.prepare("SELECT id FROM week_plans WHERE week_start_date = ? AND deleted_at IS NULL LIMIT 1;").get(weekStartDate);
  assert.ok(plan?.id, `No active week plan starts on ${weekStartDate}.`);
  const itemCounts = sqlite.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN local_date IS NOT NULL AND start_time IS NOT NULL AND end_time IS NOT NULL THEN 1 ELSE 0 END) AS materializable,
      SUM(CASE WHEN created_mark_instance_id IS NOT NULL THEN 1 ELSE 0 END) AS linked
    FROM week_plan_items
    WHERE week_plan_id = ? AND deleted_at IS NULL;
  `).get(plan.id);
  const markCount = sqlite.prepare(`
    SELECT COUNT(DISTINCT mi.id) AS count
    FROM week_plan_items wpi
    INNER JOIN mark_instances mi ON mi.id = wpi.created_mark_instance_id AND mi.deleted_at IS NULL
    WHERE wpi.week_plan_id = ? AND wpi.deleted_at IS NULL;
  `).get(plan.id).count;
  const mondayMarks = sqlite.prepare(`
    SELECT COUNT(*) AS count
    FROM mark_instances mi
    INNER JOIN trail_days td ON td.id = mi.trail_day_id
    WHERE td.local_date = ? AND mi.deleted_at IS NULL;
  `).get(weekStartDate).count;
  const planningCursor = sqlite.prepare(`
    SELECT MAX(last_planning_change_sequence) AS value FROM planning_sync_state;
  `).get().value;
  return { planId: plan.id, ...itemCounts, markCount, mondayMarks, planningCursor };
}

const sqlite = new DatabaseSync(dbPath);
sqlite.exec("PRAGMA busy_timeout = 5000;");
const db = new NodeSqliteAdapter(sqlite);
const repositories = createSQLiteRepositoryProvider(async () => db, async () => db, false);
const profile = sqlite.prepare("SELECT id FROM user_profiles WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1;").get();
assert.ok(profile?.id, "Local user profile is missing.");

const before = readState(sqlite);
const bootstrap = await bootstrapWaymarkMap(
  { repositories, userId: profile.id },
  WAYMARK_MAP_CONFIG,
  { trustExistingPulledHierarchy: true },
);
const firstRepair = await reconcileLocalWeeklyPlanningMaterialization({ executor: db });
const afterFirst = readState(sqlite);
const secondRepair = await reconcileLocalWeeklyPlanningMaterialization({ executor: db });
const afterSecond = readState(sqlite);
const integrity = sqlite.prepare("PRAGMA quick_check;").get();
const foreignKeyViolations = sqlite.prepare("PRAGMA foreign_key_check;").all();
const hierarchyRecords = sqlite.prepare(`
  SELECT value_json
  FROM app_settings
  WHERE user_id = ? AND key LIKE 'seed_registry:%' AND deleted_at IS NULL;
`).all(profile.id).map((row) => JSON.parse(row.value_json)).filter((record) =>
  ["path", "expedition", "milestone"].includes(record.entityType),
);
const activeHierarchyRecords = hierarchyRecords.filter((record) => record.ownership !== "deprecated_seed");

console.log(JSON.stringify({
  dbPath,
  weekStartDate,
  before,
  bootstrap: {
    created: bootstrap.created.length,
    updated: bootstrap.updated.length,
    deprecated: bootstrap.deprecated.length,
    untouched: bootstrap.untouched.length,
  },
  firstRepair,
  afterFirst,
  secondRepair,
  afterSecond,
  hierarchy: {
    total: hierarchyRecords.length,
    active: activeHierarchyRecords.length,
    remotePrimary: activeHierarchyRecords.filter((record) => record.ownership === "remote_primary").length,
    nonRemotePrimary: activeHierarchyRecords.filter((record) => record.ownership !== "remote_primary"),
  },
  integrity,
  foreignKeyViolationCount: foreignKeyViolations.length,
}, null, 2));

sqlite.close();
