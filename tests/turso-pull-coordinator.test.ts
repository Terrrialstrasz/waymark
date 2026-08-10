import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import { runWaymarkTursoPull, WaymarkTursoPullInProgressError } from "../src/lib/waymark";

type RunResult = { changes: number; lastInsertRowId: number };

class NodeSqliteAdapter {
  constructor(private readonly db: DatabaseSync) {}

  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
  }

  async runAsync(source: string, ...params: unknown[]): Promise<RunResult> {
    const result = this.db.prepare(source).run(...(params as any[]));
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid ?? 0) };
  }

  async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
    return (this.db.prepare(source).get(...(params as any[])) as T | undefined) ?? null;
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(source).all(...(params as any[])) as T[];
  }

  async withExclusiveTransactionAsync(task: (txn: NodeSqliteAdapter) => Promise<void>): Promise<void> {
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

async function run() {
  const sqlite = new DatabaseSync(":memory:");
  const db = new NodeSqliteAdapter(sqlite);
  await applyMigrationsAsync(db as any);
  sqlite.exec(`
    INSERT INTO vaults (id, name, created_at, updated_at, status)
    VALUES ('vault_coordinator', 'Coordinator', 1, 1, 'active');
    INSERT INTO devices (id, vault_id, client_type, device_name, created_at, last_seen_at)
    VALUES ('device_coordinator', 'vault_coordinator', 'main', 'Coordinator', 1, 1);
    INSERT INTO user_profiles (
      id, user_id, display_name, locale, timezone, week_starts_on,
      created_at, updated_at, sync_status, local_revision
    ) VALUES ('user_1', 'user_1', 'User', 'vi', 'Asia/Saigon', 1, 1, 1, 'synced', 1);
    INSERT INTO paths (
      id, user_id, name, slug, title, status, sort_order,
      created_at, updated_at, sync_status, local_revision
    ) VALUES ('path_1', 'user_1', 'Career', 'career', 'Career', 'active', 0, 1, 1, 'synced', 1);
    INSERT INTO week_plans (
      id, user_id, week_start_date, week_end_date, status,
      created_at, updated_at, sync_status, local_revision
    ) VALUES ('week_1', 'user_1', '2026-08-10', '2026-08-16', 'active', 1, 1, 'synced', 1);
    INSERT INTO week_plan_items (
      id, user_id, week_plan_id, status, local_date, start_time, end_time,
      title, path_id, deterministic_import_key, created_mark_instance_id,
      sort_order, order_index, created_at, updated_at, sync_status, local_revision
    ) VALUES
      ('item_timed', 'user_1', 'week_1', 'planned', '2026-08-10', '06:00', '06:30',
       'Morning focus', 'path_1', 'weekly_timetable:2026-08-10:morning-focus', NULL,
       0, 0, 1, 1, 'synced', 1),
      ('item_untimed', 'user_1', 'week_1', 'planned', '2026-08-16', NULL, NULL,
       'Tony golf pending schedule', 'path_1', 'weekly_timetable:2026-08-16:tony-golf', NULL,
       1, 1, 1, 1, 'synced', 1);
  `);

  const planningAdapter = {
    async getPlanningChangeCeiling() {
      return 0;
    },
    async listPlanningChangesInWindow() {
      return [];
    },
  };

  const first = await runWaymarkTursoPull({
    mode: "planning",
    database: db as any,
    planningAdapter: planningAdapter as any,
    vaultId: "vault_coordinator",
    deviceId: "device_coordinator",
    now: 10,
  });
  assert.equal(first.localRepair.materializedWeekPlanItems.created, 1);
  assert.equal(first.localRepair.materializedWeekPlanItems.skipped, 1);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM mark_instances;").get()?.count, 1);
  assert.ok(sqlite.prepare("SELECT created_mark_instance_id FROM week_plan_items WHERE id = 'item_timed';").get()?.created_mark_instance_id);
  assert.equal(sqlite.prepare("SELECT created_mark_instance_id FROM week_plan_items WHERE id = 'item_untimed';").get()?.created_mark_instance_id, null);

  await runWaymarkTursoPull({
    mode: "planning",
    database: db as any,
    planningAdapter: planningAdapter as any,
    vaultId: "vault_coordinator",
    deviceId: "device_coordinator",
    now: 11,
  });
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM mark_instances;").get()?.count, 1, "Coordinator retry must be idempotent.");

  let releaseCeiling!: () => void;
  const ceilingGate = new Promise<void>((resolve) => {
    releaseCeiling = resolve;
  });
  const blockedAdapter = {
    async getPlanningChangeCeiling() {
      await ceilingGate;
      return 0;
    },
    async listPlanningChangesInWindow() {
      return [];
    },
  };
  const running = runWaymarkTursoPull({
    mode: "planning",
    database: db as any,
    planningAdapter: blockedAdapter as any,
    vaultId: "vault_coordinator",
    deviceId: "device_coordinator",
    now: 12,
  });
  await assert.rejects(
    runWaymarkTursoPull({
      mode: "planning",
      database: db as any,
      planningAdapter: planningAdapter as any,
      vaultId: "vault_coordinator",
      deviceId: "device_coordinator",
      now: 12,
    }),
    WaymarkTursoPullInProgressError,
  );
  releaseCeiling();
  await running;

  sqlite.close();
}

void run()
  .then(() => console.log("turso-pull-coordinator tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
