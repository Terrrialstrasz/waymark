import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import {
  buildTypedWeekPlanMutationId,
  pullTypedPlanningWeekPlansFromTurso,
  uploadTypedWeekPlanItemsToTurso,
  uploadTypedWeekPlansToTurso,
  type TursoPlanningChangeRecord,
  type TursoPlanningMutationResult,
  type TursoPlanningWeekPlanItemSnapshot,
  type TursoPlanningWeekPlanSnapshot,
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

class FakePlanningAdapter {
  calls: Array<{ snapshot: TursoPlanningWeekPlanSnapshot; mutationId: string }> = [];
  seen = new Map<string, TursoPlanningMutationResult>();
  changes: TursoPlanningChangeRecord[] = [];
  weekPlanItemFailuresRemaining = 0;
  weekPlanItemFailureMessage = "No cursor response received";

  async upsertPlanningWeekPlanSnapshot(input: {
    snapshot: TursoPlanningWeekPlanSnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    this.calls.push(input);
    const existing = this.seen.get(input.mutationId);
    if (existing) {
      return { ...existing, duplicate: true };
    }
    const result: TursoPlanningMutationResult = {
      changeSequence: this.seen.size + 1,
      entityType: "week_plan",
      entityId: input.snapshot.id,
      mutationId: input.mutationId,
      duplicate: false,
    };
    this.seen.set(input.mutationId, result);
    return result;
  }

  async upsertPlanningWeekPlanItemSnapshot(input: {
    snapshot: TursoPlanningWeekPlanItemSnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    this.calls.push({ snapshot: input.snapshot as any, mutationId: input.mutationId });
    if (this.weekPlanItemFailuresRemaining > 0) {
      this.weekPlanItemFailuresRemaining -= 1;
      throw new Error(this.weekPlanItemFailureMessage);
    }
    const existing = this.seen.get(input.mutationId);
    if (existing) {
      return { ...existing, duplicate: true };
    }
    const result: TursoPlanningMutationResult = {
      changeSequence: this.seen.size + 1,
      entityType: "week_plan_item",
      entityId: input.snapshot.id,
      mutationId: input.mutationId,
      duplicate: false,
    };
    this.seen.set(input.mutationId, result);
    return result;
  }

  async getPlanningChangeCeiling(input: { vaultId: string }): Promise<number> {
    return this.changes
      .filter((change) => change.vaultId === input.vaultId)
      .reduce((max, change) => Math.max(max, change.changeSequence), 0);
  }

  async listPlanningChangesInWindow(input: {
    vaultId: string;
    afterChangeSequence: number;
    throughChangeSequence: number;
    entityTypes?: readonly string[];
    limit?: number;
  }): Promise<TursoPlanningChangeRecord[]> {
    return this.changes
      .filter((change) => change.vaultId === input.vaultId)
      .filter((change) => change.changeSequence > input.afterChangeSequence && change.changeSequence <= input.throughChangeSequence)
      .filter((change) => !input.entityTypes?.length || input.entityTypes.includes(change.entityType))
      .slice(0, input.limit ?? 500);
  }
}

async function createHarness() {
  const database = new DatabaseSync(":memory:");
  const db = new NodeSqliteAdapter(database);
  await applyMigrationsAsync(db as any);
  return { db, close: () => database.close() };
}

async function run() {
  assert.equal(
    buildTypedWeekPlanMutationId({
      vaultId: "vault_1",
      deviceId: "device_1",
      weekPlanId: "week_plan_1",
      localRevision: 7,
    }),
    "typed_planning_week_plan:vault_1:device_1:week_plan_1:7",
  );

  const harness = await createHarness();
  try {
    await harness.db.runAsync(
      "INSERT INTO vaults (id, name, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?);",
      "vault_1",
      "Test Vault",
      1,
      1,
      "active",
    );
    await harness.db.runAsync(
      "INSERT INTO devices (id, vault_id, client_type, device_name, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?);",
      "device_1",
      "vault_1",
      "main",
      "Test Device",
      1,
      1,
    );
    await harness.db.runAsync(
      `INSERT INTO week_plans (
        id, user_id, week_start_date, week_end_date, status, summary, note,
        created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'dirty', ?);`,
      "week_plan_1",
      "user_1",
      "2026-07-13",
      "2026-07-19",
      "draft",
      "Typed upload",
      "Edit in Turso Studio",
      10,
      20,
      7,
    );
    await harness.db.runAsync(
      `INSERT INTO week_plan_items (
        id, user_id, week_plan_id, backlog_item_id, status, local_date, start_time,
        end_time, title, path_id, template_id, expedition_id, milestone_id,
        expedition_context, milestone_context, description, note, origin, block_key,
        deterministic_import_key, import_batch_id, created_mark_instance_id, sort_order,
        order_index, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      "week_plan_item_1",
      "user_1",
      "week_plan_1",
      null,
      "pulled",
      "2026-07-13",
      "09:00",
      "10:00",
      "Original item",
      null,
      null,
      null,
      null,
      null,
      null,
      "Original description",
      "Original note",
      "weekly_timetable",
      "block_a",
      "import_key_1",
      null,
      null,
      1,
      1,
      11,
      21,
      null,
      "dirty",
      5,
    );
    await harness.db.runAsync(
      `INSERT INTO week_plan_items (
        id, user_id, week_plan_id, backlog_item_id, status, local_date, start_time,
        end_time, title, path_id, template_id, expedition_id, milestone_id,
        expedition_context, milestone_context, description, note, origin, block_key,
        deterministic_import_key, import_batch_id, created_mark_instance_id, sort_order,
        order_index, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      "week_plan_item_2",
      "user_1",
      "week_plan_1",
      null,
      "pulled",
      "2026-07-13",
      "10:00",
      "11:00",
      "Second item",
      null,
      null,
      null,
      null,
      null,
      null,
      "Second description",
      "Second note",
      "weekly_timetable",
      "block_b",
      "import_key_2",
      null,
      null,
      2,
      2,
      12,
      22,
      null,
      "dirty",
      5,
    );

    const adapter = new FakePlanningAdapter();
    const first = await uploadTypedWeekPlansToTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
    });
    const second = await uploadTypedWeekPlansToTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
    });

    assert.equal(first.scanned, 1);
    assert.equal(first.uploaded, 1);
    assert.equal(first.duplicates, 0);
    assert.equal(second.scanned, 1);
    assert.equal(second.uploaded, 0);
    assert.equal(second.duplicates, 1);
    assert.equal(adapter.calls[0]?.snapshot.summary, "Typed upload");
    assert.equal(adapter.calls[0]?.mutationId, "typed_planning_week_plan:vault_1:device_1:week_plan_1:7");

    const firstItems = await uploadTypedWeekPlanItemsToTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
    });
    const secondItems = await uploadTypedWeekPlanItemsToTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
    });

    assert.equal(firstItems.scanned, 2);
    assert.equal(firstItems.uploaded, 2);
    assert.equal(secondItems.duplicates, 2);

    const transientAdapter = new FakePlanningAdapter();
    transientAdapter.weekPlanItemFailuresRemaining = 2;
    const transientItems = await uploadTypedWeekPlanItemsToTurso({
      executor: harness.db as any,
      adapter: transientAdapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      maxPushAttempts: 2,
      stopOnTransientFailure: true,
    });

    assert.equal(transientItems.scanned, 2);
    assert.equal(transientItems.uploaded, 0);
    assert.equal(transientItems.failed.length, 1);
    assert.equal(transientItems.stoppedAfterTransientFailure, true);
    assert.equal(transientAdapter.calls.length, 2);

    const retryAdapter = new FakePlanningAdapter();
    retryAdapter.weekPlanItemFailuresRemaining = 1;
    const retriedItems = await uploadTypedWeekPlanItemsToTurso({
      executor: harness.db as any,
      adapter: retryAdapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      maxPushAttempts: 2,
      stopOnTransientFailure: true,
    });

    assert.equal(retriedItems.scanned, 2);
    assert.equal(retriedItems.uploaded, 2);
    assert.equal(retriedItems.failed.length, 0);
    assert.equal(retriedItems.stoppedAfterTransientFailure, false);

    adapter.changes.push({
      changeSequence: 1,
      vaultId: "vault_1",
      entityType: "week_plan",
      entityId: "week_plan_1",
      operation: "update",
      entityRevision: 2,
      payloadSchemaVersion: 1,
      payloadSnapshot: {
        id: "week_plan_1",
        week_start_date: "2026-07-13",
        week_end_date: "2026-07-19",
        status: "approved",
        summary: "Edited in Turso",
        note: "Pulled manually",
        updated_at: 30,
        deleted_at: null,
      },
      deletedAt: null,
      updatedAt: 30,
      mutationId: "studio:week_plan:week_plan_1:1",
      createdAt: 31,
    });
    adapter.changes.push({
      changeSequence: 2,
      vaultId: "vault_1",
      entityType: "week_plan_item",
      entityId: "week_plan_item_1",
      operation: "update",
      entityRevision: 3,
      payloadSchemaVersion: 1,
      payloadSnapshot: {
        id: "week_plan_item_1",
        week_plan_id: "week_plan_1",
        backlog_item_id: null,
        status: "pulled",
        local_date: "2026-07-13",
        start_time: "09:30",
        end_time: "10:30",
        title: "Edited in Turso item",
        path_id: null,
        template_id: null,
        expedition_id: null,
        milestone_id: null,
        expedition_context: null,
        milestone_context: null,
        description: "Remote description",
        note: "Remote item note",
        origin: "weekly_timetable",
        block_key: "block_a",
        deterministic_import_key: "import_key_1",
        import_batch_id: null,
        created_mark_instance_id: null,
        sort_order: 2,
        order_index: 2,
        updated_at: 32,
        deleted_at: null,
      },
      deletedAt: null,
      updatedAt: 32,
      mutationId: "studio:week_plan_item:week_plan_item_1:1",
      createdAt: 33,
    });

    const pull = await pullTypedPlanningWeekPlansFromTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      now: 40,
    });
    const secondPull = await pullTypedPlanningWeekPlansFromTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      now: 50,
    });
    const pulledRow = await harness.db.getFirstAsync<{ status: string; summary: string; note: string; sync_status: string }>(
      "SELECT status, summary, note, sync_status FROM week_plans WHERE id = ? LIMIT 1;",
      "week_plan_1",
    );
    const pulledItem = await harness.db.getFirstAsync<{ title: string; start_time: string; note: string; sort_order: number; sync_status: string }>(
      "SELECT title, start_time, note, sort_order, sync_status FROM week_plan_items WHERE id = ? LIMIT 1;",
      "week_plan_item_1",
    );
    const planningState = await harness.db.getFirstAsync<{ last_planning_change_sequence: number }>(
      "SELECT last_planning_change_sequence FROM planning_sync_state WHERE vault_id = ? AND device_id = ? LIMIT 1;",
      "vault_1",
      "device_1",
    );
    const entityState = await harness.db.getFirstAsync<{ entity_revision: number; last_change_sequence: number }>(
      "SELECT entity_revision, last_change_sequence FROM planning_entity_state WHERE vault_id = ? AND entity_type = 'week_plan' AND entity_id = ? LIMIT 1;",
      "vault_1",
      "week_plan_1",
    );

    assert.equal(pull.fetched, 2);
    assert.equal(pull.applied, 2);
    assert.equal(secondPull.fetched, 0);
    assert.equal(secondPull.applied, 0);
    assert.equal(pulledRow?.status, "approved");
    assert.equal(pulledRow?.summary, "Edited in Turso");
    assert.equal(pulledRow?.note, "Pulled manually");
    assert.equal(pulledRow?.sync_status, "synced");
    assert.equal(pulledItem?.title, "Edited in Turso item");
    assert.equal(pulledItem?.start_time, "09:30");
    assert.equal(pulledItem?.note, "Remote item note");
    assert.equal(pulledItem?.sort_order, 2);
    assert.equal(pulledItem?.sync_status, "synced");
    assert.equal(planningState?.last_planning_change_sequence, 2);
    assert.equal(entityState?.entity_revision, 2);
    assert.equal(entityState?.last_change_sequence, 1);
  } finally {
    harness.close();
  }
}

void run()
  .then(() => {
    console.log("turso-planning-sync tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
