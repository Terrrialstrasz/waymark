import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import {
  WAYMARK_TURSO_ACTIVITY_UPLOAD_TABLES,
  WAYMARK_TURSO_CANONICAL_TABLES,
  enqueueSyncOutboxMutation,
  enqueueAllWaymarkTablesForTursoUpload,
  listPendingSyncOutboxRows,
  type SyncOutboxRow,
} from "../src/lib/waymark";

type RunResult = {
  changes: number;
  lastInsertRowId: number;
};

class NodeSqliteAdapter {
  constructor(private readonly db: DatabaseSync) {}

  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
  }

  async runAsync(source: string, ...params: unknown[]): Promise<RunResult> {
    const result = this.db.prepare(source).run(...(params as any[]));
    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid ?? 0),
    };
  }

  async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
    return (this.db.prepare(source).get(...(params as any[])) as T | undefined) ?? null;
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(source).all(...(params as any[])) as T[];
  }

  async withExclusiveTransactionAsync(task: (txn: NodeSqliteAdapter) => Promise<void>): Promise<void> {
    this.db.exec("BEGIN IMMEDIATE;");
    const txn = new NodeSqliteAdapter(this.db);
    try {
      await task(txn);
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }
}

async function createHarness() {
  const database = new DatabaseSync(":memory:");
  const db = new NodeSqliteAdapter(database);
  await applyMigrationsAsync(db as any);
  return { db, close: () => database.close() };
}

async function run() {
  assert.equal(WAYMARK_TURSO_CANONICAL_TABLES.length, 34);
  assert.equal(WAYMARK_TURSO_CANONICAL_TABLES.some((table) => table.entityType === "path"), true);
  assert.equal(WAYMARK_TURSO_CANONICAL_TABLES.some((table) => table.entityType === "week_plan_item"), true);
  assert.equal(WAYMARK_TURSO_CANONICAL_TABLES.some((table) => table.entityType === "signal"), true);
  assert.equal(WAYMARK_TURSO_ACTIVITY_UPLOAD_TABLES.some((table) => table.entityType === "path"), false);
  assert.equal(WAYMARK_TURSO_ACTIVITY_UPLOAD_TABLES.some((table) => table.entityType === "week_plan_item"), false);
  assert.equal(WAYMARK_TURSO_ACTIVITY_UPLOAD_TABLES.some((table) => table.entityType === "mark_template"), false);
  assert.equal(WAYMARK_TURSO_ACTIVITY_UPLOAD_TABLES.some((table) => table.entityType === "signal"), true);

  const harness = await createHarness();
  try {
    const schema = await harness.db.getFirstAsync<{ version: number }>(
      "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;",
    );
    assert.equal(schema?.version, 23);
    const planningState = await harness.db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'planning_sync_state' LIMIT 1;",
    );
    const planningEntityState = await harness.db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'planning_entity_state' LIMIT 1;",
    );
    const planningRetries = await harness.db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'planning_side_effect_retries' LIMIT 1;",
    );
    const planningConflicts = await harness.db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'planning_conflicts' LIMIT 1;",
    );
    assert.equal(planningState?.name, "planning_sync_state");
    assert.equal(planningEntityState?.name, "planning_entity_state");
    assert.equal(planningRetries?.name, "planning_side_effect_retries");
    assert.equal(planningConflicts?.name, "planning_conflicts");

    await harness.db.runAsync(
      `INSERT INTO trail_days (
        id, user_id, local_date, status, anchor_path_id, closed_at, reopened_at, close_summary,
        tomorrow_first_step, character_result, planned_mark_count, completed_mark_count,
        skipped_mark_count, memory_count, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, 'open', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 1, 2, NULL, 'dirty', 3);`,
      "trail_day_activity_1",
      "user_1",
      "2026-08-07",
    );

    const first = await enqueueAllWaymarkTablesForTursoUpload({
      executor: harness.db as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      dbInstanceId: "db_1",
      now: 10,
    });
    const second = await enqueueAllWaymarkTablesForTursoUpload({
      executor: harness.db as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      dbInstanceId: "db_1",
      now: 20,
    });
    const pending = await listPendingSyncOutboxRows(harness.db as any, { vaultId: "vault_1", limit: 1000 });
    const trailDayOutbox = await harness.db.getFirstAsync<SyncOutboxRow>(
      "SELECT * FROM sync_outbox WHERE entity_type = 'trail_day' AND entity_id = ? LIMIT 1;",
      "trail_day_activity_1",
    );
    const payload = JSON.parse(trailDayOutbox?.payload_json ?? "{}") as Record<string, unknown>;

    assert.equal(first.scanned, 1);
    assert.equal(first.enqueued, 1);
    assert.equal(second.scanned, 1);
    assert.equal(second.enqueued, 1);
    assert.equal(pending.length, 1);
    assert.equal(trailDayOutbox?.local_revision, 3);
    assert.equal(payload.id, "trail_day_activity_1");
    assert.equal(payload.local_date, "2026-08-07");
    assert.equal(payload.__waymark_table, "trail_days");
  } finally {
    harness.close();
  }

  {
    const collisionHarness = await createHarness();
    try {
      const sharedPrefix = "bootstrap_all_tables:vault_1:device_1:week_plan_item:" + "x".repeat(180);
      const first = await enqueueSyncOutboxMutation(collisionHarness.db as any, {
        vaultId: "vault_1",
        deviceId: "device_1",
        dbInstanceId: "db_1",
        entityType: "week_plan_item",
        entityId: `${sharedPrefix}:a`,
        operation: "update",
        localRevision: 1,
        idempotencyKey: `${sharedPrefix}:a`,
        payload: { id: "a" },
      });
      const second = await enqueueSyncOutboxMutation(collisionHarness.db as any, {
        vaultId: "vault_1",
        deviceId: "device_1",
        dbInstanceId: "db_1",
        entityType: "week_plan_item",
        entityId: `${sharedPrefix}:b`,
        operation: "update",
        localRevision: 1,
        idempotencyKey: `${sharedPrefix}:b`,
        payload: { id: "b" },
      });

      assert.notEqual(first.id, second.id);
    } finally {
      collisionHarness.close();
    }
  }
}

void run()
  .then(() => {
    console.log("turso-all-tables-bootstrap tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
