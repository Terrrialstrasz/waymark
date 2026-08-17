import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import {
  buildTypedWeekPlanMutationId,
  pullAllMarkInstancesFromTurso,
  pullAllTrailDaysFromTurso,
  pullTypedPlanningFromTurso,
  pullTypedPlanningWeekPlansFromTurso,
  reconcileLocalWeeklyPlanningMaterialization,
  uploadTypedWeekPlanItemsToTurso,
  uploadTypedWeekPlansToTurso,
  type TursoPlanningMarkInstanceSnapshot,
  type TursoPlanningTrailDaySnapshot,
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
  markSnapshots: TursoPlanningMarkInstanceSnapshot[] = [];
  trailDaySnapshots: TursoPlanningTrailDaySnapshot[] = [];
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

  async listAllPlanningMarkInstanceSnapshots(input: {
    vaultId: string;
    pageSize?: number;
  }): Promise<TursoPlanningMarkInstanceSnapshot[]> {
    return this.markSnapshots.filter((snapshot) => snapshot.vaultId === input.vaultId).slice(0, input.pageSize ?? 500);
  }

  async listAllPlanningTrailDaySnapshots(input: {
    vaultId: string;
    pageSize?: number;
  }): Promise<TursoPlanningTrailDaySnapshot[]> {
    return this.trailDaySnapshots.filter((snapshot) => snapshot.vaultId === input.vaultId).slice(0, input.pageSize ?? 500);
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
    await harness.db.runAsync(
      `INSERT INTO paths (
        id, user_id, name, subtitle, slug, title, description, status, color_token,
        icon_key, sort_order, is_active, hero_media_asset_id, created_at, updated_at,
        deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      "path_1",
      "user_1",
      "Health",
      null,
      "health",
      "Health",
      "Local path",
      "active",
      "green",
      "leaf",
      1,
      1,
      null,
      10,
      20,
      null,
      "synced",
      1,
    );
    await harness.db.runAsync(
      `INSERT INTO expeditions (
        id, user_id, path_id, title, purpose, description, status, sort_order,
        start_date, target_date, started_at, target_end_at, completed_at,
        hero_media_asset_id, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      "expedition_1",
      "user_1",
      "path_1",
      "Health Expedition",
      "Build health",
      "Local expedition",
      "active",
      1,
      "2026-08-03",
      "2026-08-30",
      null,
      null,
      null,
      null,
      11,
      21,
      null,
      "synced",
      1,
    );
    await harness.db.runAsync(
      `INSERT INTO milestones (
        id, user_id, expedition_id, title, description, status, start_date,
        target_date, sort_order, order_index, completed_at, created_at, updated_at,
        deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      "milestone_1",
      "user_1",
      "expedition_1",
      "Baseline milestone",
      "Local milestone",
      "planned",
      "2026-08-03",
      "2026-08-09",
      1,
      1,
      null,
      12,
      22,
      null,
      "synced",
      1,
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
        user_id: "user_1",
        week_start_date: "2026-07-13",
        week_end_date: "2026-07-19",
        status: "approved",
        summary: "Edited in Turso",
        note: "Pulled manually",
        created_at: 10,
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
        user_id: "user_1",
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
        created_at: 11,
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

    adapter.changes.push({
      changeSequence: 3,
      vaultId: "vault_1",
      entityType: "milestone",
      entityId: "milestone_1",
      operation: "update",
      entityRevision: 2,
      payloadSchemaVersion: 1,
      payloadSnapshot: {
        id: "milestone_1",
        vault_id: "vault_1",
        user_id: "user_1",
        expedition_id: "expedition_1",
        title: "Remote milestone",
        description: "Remote milestone description",
        status: "active",
        start_date: "2026-08-03",
        target_date: "2026-08-16",
        sort_order: 2,
        order_index: 2,
        completed_at: null,
        created_at: 12,
        updated_at: 52,
        deleted_at: null,
      },
      deletedAt: null,
      updatedAt: 52,
      mutationId: "studio:milestone:milestone_1:1",
      createdAt: 53,
    });
    adapter.changes.push({
      changeSequence: 4,
      vaultId: "vault_1",
      entityType: "expedition",
      entityId: "expedition_1",
      operation: "update",
      entityRevision: 2,
      payloadSchemaVersion: 1,
      payloadSnapshot: {
        id: "expedition_1",
        vault_id: "vault_1",
        user_id: "user_1",
        path_id: "path_1",
        title: "Remote expedition",
        purpose: "Remote purpose",
        description: "Remote expedition description",
        status: "active",
        sort_order: 2,
        start_date: "2026-08-03",
        target_date: "2026-08-30",
        started_at: null,
        target_end_at: null,
        completed_at: null,
        hero_media_asset_id: null,
        created_at: 11,
        updated_at: 54,
        deleted_at: null,
      },
      deletedAt: null,
      updatedAt: 54,
      mutationId: "studio:expedition:expedition_1:1",
      createdAt: 55,
    });
    adapter.changes.push({
      changeSequence: 5,
      vaultId: "vault_1",
      entityType: "path",
      entityId: "path_1",
      operation: "update",
      entityRevision: 2,
      payloadSchemaVersion: 1,
      payloadSnapshot: {
        id: "path_1",
        vault_id: "vault_1",
        user_id: "user_1",
        name: "Health",
        subtitle: "Remote subtitle",
        slug: "health",
        title: "Remote Health",
        description: "Remote path description",
        status: "active",
        color_token: "emerald",
        icon_key: "leaf",
        sort_order: 3,
        is_active: 1,
        hero_media_asset_id: null,
        created_at: 10,
        updated_at: 56,
        deleted_at: null,
      },
      deletedAt: null,
      updatedAt: 56,
      mutationId: "studio:path:path_1:1",
      createdAt: 57,
    });

    const hierarchyPull = await pullTypedPlanningFromTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      now: 60,
      entityTypes: ["path", "expedition", "milestone"],
      limit: 1,
    });
    const pulledPath = await harness.db.getFirstAsync<{ title: string; description: string; sort_order: number; sync_status: string }>(
      "SELECT title, description, sort_order, sync_status FROM paths WHERE id = ? LIMIT 1;",
      "path_1",
    );
    const pulledExpedition = await harness.db.getFirstAsync<{ title: string; description: string; sort_order: number; sync_status: string }>(
      "SELECT title, description, sort_order, sync_status FROM expeditions WHERE id = ? LIMIT 1;",
      "expedition_1",
    );
    const pulledMilestone = await harness.db.getFirstAsync<{ title: string; target_date: string; sort_order: number; sync_status: string }>(
      "SELECT title, target_date, sort_order, sync_status FROM milestones WHERE id = ? LIMIT 1;",
      "milestone_1",
    );
    const hierarchyState = await harness.db.getFirstAsync<{ last_planning_change_sequence: number }>(
      "SELECT last_planning_change_sequence FROM planning_sync_state WHERE vault_id = ? AND device_id = ? LIMIT 1;",
      "vault_1",
      "device_1",
    );

    assert.equal(hierarchyPull.fetched, 3);
    assert.equal(hierarchyPull.applied, 3);
    assert.equal(hierarchyPull.byEntityType.path, 1);
    assert.equal(hierarchyPull.byEntityType.expedition, 1);
    assert.equal(hierarchyPull.byEntityType.milestone, 1);
    assert.equal(pulledPath?.title, "Remote Health");
    assert.equal(pulledPath?.sort_order, 3);
    assert.equal(pulledPath?.sync_status, "synced");
    assert.equal(pulledExpedition?.title, "Remote expedition");
    assert.equal(pulledExpedition?.sort_order, 2);
    assert.equal(pulledExpedition?.sync_status, "synced");
    assert.equal(pulledMilestone?.title, "Remote milestone");
    assert.equal(pulledMilestone?.target_date, "2026-08-16");
    assert.equal(pulledMilestone?.sync_status, "synced");
    assert.equal(hierarchyState?.last_planning_change_sequence, 5);

    await harness.db.runAsync("DELETE FROM milestones WHERE id = ?;", "milestone_1");
    await harness.db.runAsync("DELETE FROM expeditions WHERE id = ?;", "expedition_1");
    await harness.db.runAsync("DELETE FROM paths WHERE id = ?;", "path_1");

    const hierarchyRestore = await pullTypedPlanningFromTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      now: 65,
      entityTypes: ["path", "expedition", "milestone"],
      replayFromBeginning: true,
      advancePlanningCursor: false,
      limit: 1,
    });
    const restoredPath = await harness.db.getFirstAsync<{ created_at: number; local_revision: number; sync_status: string }>(
      "SELECT created_at, local_revision, sync_status FROM paths WHERE id = ? LIMIT 1;",
      "path_1",
    );
    const restoredExpedition = await harness.db.getFirstAsync<{ path_id: string; local_revision: number; sync_status: string }>(
      "SELECT path_id, local_revision, sync_status FROM expeditions WHERE id = ? LIMIT 1;",
      "expedition_1",
    );
    const restoredMilestone = await harness.db.getFirstAsync<{ expedition_id: string; local_revision: number; sync_status: string }>(
      "SELECT expedition_id, local_revision, sync_status FROM milestones WHERE id = ? LIMIT 1;",
      "milestone_1",
    );

    assert.equal(hierarchyRestore.fromChangeSequence, 0);
    assert.equal(hierarchyRestore.throughChangeSequence, 5);
    assert.equal(hierarchyRestore.fetched, 3);
    assert.equal(hierarchyRestore.applied, 3);
    assert.equal(restoredPath?.created_at, 10);
    assert.equal(restoredPath?.local_revision, 0);
    assert.equal(restoredPath?.sync_status, "synced");
    assert.equal(restoredExpedition?.path_id, "path_1");
    assert.equal(restoredExpedition?.local_revision, 0);
    assert.equal(restoredExpedition?.sync_status, "synced");
    assert.equal(restoredMilestone?.expedition_id, "expedition_1");
    const cursorAfterHierarchyReplay = await harness.db.getFirstAsync<{ last_planning_change_sequence: number }>(
      "SELECT last_planning_change_sequence FROM planning_sync_state WHERE vault_id = ? AND device_id = ? LIMIT 1;",
      "vault_1",
      "device_1",
    );
    assert.equal(cursorAfterHierarchyReplay?.last_planning_change_sequence, 5);
    assert.equal(restoredMilestone?.local_revision, 0);
    assert.equal(restoredMilestone?.sync_status, "synced");

    await harness.db.runAsync("UPDATE paths SET sync_status = 'dirty', local_revision = local_revision + 1 WHERE id = ?;", "path_1");
    await harness.db.runAsync(
      `INSERT INTO sync_outbox (
        id,
        vault_id,
        device_id,
        db_instance_id,
        entity_type,
        entity_id,
        operation,
        idempotency_key,
        local_revision,
        base_remote_revision,
        payload_json,
        payload_schema_version,
        status,
        retry_count,
        last_error,
        created_at,
        updated_at,
        synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending', 0, NULL, ?, ?, NULL);`,
      "outbox_path_1",
      "vault_1",
      "device_1",
      "db_1",
      "path",
      "path_1",
      "update",
      "vault_1:device_1:path:path_1:update:2",
      2,
      2,
      JSON.stringify({ id: "path_1", title: "Local dirty title" }),
      75,
      75,
    );
    await harness.db.runAsync(
      `INSERT INTO planning_conflicts (
        id,
        vault_id,
        entity_type,
        entity_id,
        local_revision,
        remote_entity_revision,
        remote_change_sequence,
        reason,
        remote_snapshot_json,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, 'path', ?, ?, ?, ?, ?, ?, 'open', ?, ?);`,
      "planning_conflict:vault_1:path:path_1",
      "vault_1",
      "path_1",
      2,
      2,
      5,
      "Old open conflict",
      "{}",
      75,
      75,
    );
    adapter.changes.push({
      changeSequence: 6,
      vaultId: "vault_1",
      entityType: "path",
      entityId: "path_1",
      operation: "update",
      entityRevision: 3,
      payloadSchemaVersion: 1,
      payloadSnapshot: {
        id: "path_1",
        vault_id: "vault_1",
        user_id: "user_1",
        name: "Health",
        subtitle: "Remote conflict",
        slug: "health",
        title: "Remote Conflict Health",
        description: "Remote conflict description",
        status: "active",
        color_token: "emerald",
        icon_key: "leaf",
        sort_order: 4,
        is_active: 1,
        hero_media_asset_id: null,
        created_at: 10,
        updated_at: 70,
        deleted_at: null,
      },
      deletedAt: null,
      updatedAt: 70,
      mutationId: "studio:path:path_1:2",
      createdAt: 71,
    });
    const remoteWinsPull = await pullTypedPlanningFromTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      now: 80,
      entityTypes: ["path", "expedition", "milestone"],
    });
    const conflictState = await harness.db.getFirstAsync<{ last_planning_change_sequence: number; last_pull_status: string }>(
      "SELECT last_planning_change_sequence, last_pull_status FROM planning_sync_state WHERE vault_id = ? AND device_id = ? LIMIT 1;",
      "vault_1",
      "device_1",
    );
    const remoteWinsPath = await harness.db.getFirstAsync<{ title: string; description: string; sort_order: number; sync_status: string }>(
      "SELECT title, description, sort_order, sync_status FROM paths WHERE id = ? LIMIT 1;",
      "path_1",
    );
    const retiredOutbox = await harness.db.getFirstAsync<{ status: string; last_error: string }>(
      "SELECT status, last_error FROM sync_outbox WHERE id = ? LIMIT 1;",
      "outbox_path_1",
    );
    const resolvedConflict = await harness.db.getFirstAsync<{ entity_id: string; status: string; remote_change_sequence: number; reason: string }>(
      "SELECT entity_id, status, remote_change_sequence, reason FROM planning_conflicts WHERE vault_id = ? AND entity_type = 'path' AND entity_id = ? LIMIT 1;",
      "vault_1",
      "path_1",
    );
    assert.equal(remoteWinsPull.fetched, 1);
    assert.equal(remoteWinsPull.applied, 1);
    assert.equal(conflictState?.last_planning_change_sequence, 6);
    assert.equal(conflictState?.last_pull_status, "success");
    assert.equal(remoteWinsPath?.title, "Remote Conflict Health");
    assert.equal(remoteWinsPath?.description, "Remote conflict description");
    assert.equal(remoteWinsPath?.sort_order, 4);
    assert.equal(remoteWinsPath?.sync_status, "synced");
    assert.equal(retiredOutbox?.status, "conflict");
    assert.match(retiredOutbox?.last_error ?? "", /Superseded by Turso planning pull change 6/);
    assert.equal(resolvedConflict?.entity_id, "path_1");
    assert.equal(resolvedConflict?.status, "resolved");
    assert.equal(resolvedConflict?.remote_change_sequence, 6);

    await harness.db.runAsync(
      `INSERT INTO paths (
        id, user_id, name, subtitle, slug, title, description, status, color_token,
        icon_key, sort_order, is_active, hero_media_asset_id, created_at, updated_at,
        deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      "path_local_only",
      "user_1",
      "Local only",
      null,
      "local-only",
      "Local only",
      "Must be retired by Turso authority",
      "active",
      "green",
      "leaf",
      99,
      1,
      null,
      81,
      81,
      null,
      "dirty",
      4,
    );
    await harness.db.runAsync(
      `INSERT INTO expeditions (
        id, user_id, path_id, title, purpose, description, status, sort_order,
        start_date, target_date, started_at, target_end_at, completed_at,
        hero_media_asset_id, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      "expedition_local_only",
      "user_1",
      "path_local_only",
      "Local only expedition",
      null,
      null,
      "active",
      99,
      null,
      null,
      null,
      null,
      null,
      null,
      82,
      82,
      null,
      "dirty",
      4,
    );
    await harness.db.runAsync(
      `INSERT INTO milestones (
        id, user_id, expedition_id, title, description, status, start_date,
        target_date, sort_order, order_index, completed_at, created_at, updated_at,
        deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      "milestone_local_only",
      "user_1",
      "expedition_local_only",
      "Local only milestone",
      null,
      "planned",
      null,
      null,
      99,
      99,
      null,
      83,
      83,
      null,
      "dirty",
      4,
    );

    const authorityAdapter = {
      getPlanningChangeCeiling: adapter.getPlanningChangeCeiling.bind(adapter),
      listPlanningChangesInWindow: adapter.listPlanningChangesInWindow.bind(adapter),
      async listActivePlanningHierarchyEntityIds(input: { entityType: "path" | "expedition" | "milestone" }) {
        return input.entityType === "path" ? ["path_1"] : input.entityType === "expedition" ? ["expedition_1"] : ["milestone_1"];
      },
    };
    const authorityPull = await pullTypedPlanningFromTurso({
      executor: harness.db as any,
      adapter: authorityAdapter,
      vaultId: "vault_1",
      deviceId: "device_1",
      now: 90,
      entityTypes: ["path", "expedition", "milestone"],
    });
    const retiredPath = await harness.db.getFirstAsync<{ deleted_at: number; sync_status: string }>(
      "SELECT deleted_at, sync_status FROM paths WHERE id = ? LIMIT 1;",
      "path_local_only",
    );
    const retiredExpedition = await harness.db.getFirstAsync<{ deleted_at: number; sync_status: string }>(
      "SELECT deleted_at, sync_status FROM expeditions WHERE id = ? LIMIT 1;",
      "expedition_local_only",
    );
    const retiredMilestone = await harness.db.getFirstAsync<{ deleted_at: number; sync_status: string }>(
      "SELECT deleted_at, sync_status FROM milestones WHERE id = ? LIMIT 1;",
      "milestone_local_only",
    );
    assert.equal(authorityPull.fetched, 0);
    assert.deepEqual(authorityPull.retiredLocalOnly, { path: 1, expedition: 1, milestone: 1 });
    assert.equal(retiredPath?.deleted_at, 90);
    assert.equal(retiredPath?.sync_status, "synced");
    assert.equal(retiredExpedition?.deleted_at, 90);
    assert.equal(retiredExpedition?.sync_status, "synced");
    assert.equal(retiredMilestone?.deleted_at, 90);
    assert.equal(retiredMilestone?.sync_status, "synced");

    await harness.db.runAsync(
      `INSERT INTO trail_days (
        id, user_id, local_date, status, anchor_path_id, closed_at, reopened_at,
        close_summary, tomorrow_first_step, character_result, planned_mark_count,
        completed_mark_count, skipped_mark_count, memory_count, created_at, updated_at,
        deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, ?, ?, NULL, 'synced', 1);`,
      "trail_day_1",
      "user_1",
      "2026-08-03",
      "open",
      "path_1",
      100,
      100,
    );
    await harness.db.runAsync(
      `INSERT INTO sync_outbox (
        id, vault_id, device_id, db_instance_id, entity_type, entity_id, operation,
        idempotency_key, local_revision, base_remote_revision, payload_json,
        payload_schema_version, status, retry_count, last_error, created_at, updated_at, synced_at
      ) VALUES (?, ?, ?, ?, 'trail_day', ?, 'update', ?, 1, NULL, ?, 1, 'pending', 0, NULL, ?, ?, NULL);`,
      "outbox_trail_day_1",
      "vault_1",
      "device_1",
      "db_1",
      "trail_day_1",
      "vault_1:device_1:trail_day:trail_day_1:update:1",
      JSON.stringify({ id: "trail_day_1", status: "open" }),
      100,
      100,
    );
    adapter.trailDaySnapshots = [
      {
        id: "trail_day_1",
        vaultId: "vault_1",
        userId: "user_1",
        localDate: "2026-08-03",
        status: "closed",
        anchorPathId: "path_1",
        closedAt: 105,
        reopenedAt: null,
        closeSummary: "Remote close summary",
        tomorrowFirstStep: "Remote next step",
        characterResult: "steady",
        plannedMarkCount: 2,
        completedMarkCount: 1,
        skippedMarkCount: 0,
        memoryCount: 1,
        createdAt: 100,
        updatedAt: 106,
        deletedAt: null,
      },
      {
        id: "trail_day_remote",
        vaultId: "vault_1",
        userId: "user_1",
        localDate: "2026-08-04",
        status: "open",
        anchorPathId: "path_1",
        closedAt: null,
        reopenedAt: null,
        closeSummary: null,
        tomorrowFirstStep: null,
        characterResult: null,
        plannedMarkCount: 1,
        completedMarkCount: 0,
        skippedMarkCount: 0,
        memoryCount: 0,
        createdAt: 107,
        updatedAt: 108,
        deletedAt: null,
      },
      {
        id: "trail_day_deleted_remote",
        vaultId: "vault_1",
        userId: "user_1",
        localDate: "2026-08-05",
        status: "open",
        anchorPathId: null,
        closedAt: null,
        reopenedAt: null,
        closeSummary: null,
        tomorrowFirstStep: null,
        characterResult: null,
        plannedMarkCount: 0,
        completedMarkCount: 0,
        skippedMarkCount: 0,
        memoryCount: 0,
        createdAt: 109,
        updatedAt: 110,
        deletedAt: 111,
      },
      {
        id: "trail_day_date_collision",
        vaultId: "vault_1",
        userId: "user_1",
        localDate: "2026-08-03",
        status: "open",
        anchorPathId: "path_1",
        closedAt: null,
        reopenedAt: null,
        closeSummary: null,
        tomorrowFirstStep: null,
        characterResult: null,
        plannedMarkCount: 0,
        completedMarkCount: 0,
        skippedMarkCount: 0,
        memoryCount: 0,
        createdAt: 112,
        updatedAt: 113,
        deletedAt: null,
      },
    ];

    const trailDayPull = await pullAllTrailDaysFromTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      now: 115,
    });
    const restoredTrailDay = await harness.db.getFirstAsync<{ status: string; close_summary: string; sync_status: string }>(
      "SELECT status, close_summary, sync_status FROM trail_days WHERE id = ? LIMIT 1;",
      "trail_day_remote",
    );
    const updatedTrailDay = await harness.db.getFirstAsync<{ status: string; close_summary: string; sync_status: string }>(
      "SELECT status, close_summary, sync_status FROM trail_days WHERE id = ? LIMIT 1;",
      "trail_day_1",
    );
    const supersededTrailDayOutbox = await harness.db.getFirstAsync<{ status: string; last_error: string }>(
      "SELECT status, last_error FROM sync_outbox WHERE id = ? LIMIT 1;",
      "outbox_trail_day_1",
    );

    assert.equal(trailDayPull.fetched, 4);
    assert.equal(trailDayPull.inserted, 1);
    assert.equal(trailDayPull.updated, 1);
    assert.equal(trailDayPull.skipped, 1);
    assert.equal(trailDayPull.conflicts, 1);
    assert.match(trailDayPull.conflictSamples[0]?.message ?? "", /already belongs to trail_day_1/);
    assert.equal(restoredTrailDay?.status, "open");
    assert.equal(restoredTrailDay?.sync_status, "synced");
    assert.equal(updatedTrailDay?.status, "closed");
    assert.equal(updatedTrailDay?.close_summary, "Remote close summary");
    assert.equal(updatedTrailDay?.sync_status, "synced");
    assert.equal(supersededTrailDayOutbox?.status, "conflict");
    assert.match(supersededTrailDayOutbox?.last_error ?? "", /Superseded by full Turso Trail Day pull/);

    await harness.db.runAsync(
      `INSERT INTO mark_instances (
        id, user_id, path_id, trail_day_id, template_id, expedition_id, milestone_id,
        title, description, origin, status, scheduled_start_at, scheduled_end_at,
        due_at, completed_at, skipped_at, expired_at, proof_note, completion_summary,
        substituted_by_mark_id, rescheduled_to_mark_id, source_backlog_item_id,
        generation_key, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, NULL, 'synced', 1);`,
      "mark_existing_clean",
      "user_1",
      "path_1",
      "trail_day_1",
      "expedition_1",
      "milestone_1",
      "Local clean mark",
      "Local clean description",
      "weekly_planned",
      "planned",
      101,
      102,
      "generation_clean",
      101,
      101,
    );
    await harness.db.runAsync(
      `INSERT INTO mark_instances (
        id, user_id, path_id, trail_day_id, template_id, expedition_id, milestone_id,
        title, description, origin, status, scheduled_start_at, scheduled_end_at,
        due_at, completed_at, skipped_at, expired_at, proof_note, completion_summary,
        substituted_by_mark_id, rescheduled_to_mark_id, source_backlog_item_id,
        generation_key, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, NULL, 'dirty', 2);`,
      "mark_existing_dirty",
      "user_1",
      "path_1",
      "trail_day_1",
      "expedition_1",
      "milestone_1",
      "Local dirty mark",
      "Local dirty description",
      "weekly_planned",
      "planned",
      103,
      104,
      "generation_dirty",
      103,
      103,
    );
    await harness.db.runAsync(
      `INSERT INTO sync_outbox (
        id, vault_id, device_id, db_instance_id, entity_type, entity_id, operation,
        idempotency_key, local_revision, base_remote_revision, payload_json,
        payload_schema_version, status, retry_count, last_error, created_at, updated_at, synced_at
      ) VALUES (?, ?, ?, ?, 'mark_instance', ?, 'update', ?, 2, NULL, ?, 1, 'pending', 0, NULL, ?, ?, NULL);`,
      "outbox_mark_dirty",
      "vault_1",
      "device_1",
      "db_1",
      "mark_existing_dirty",
      "vault_1:device_1:mark_instance:mark_existing_dirty:update:2",
      JSON.stringify({ id: "mark_existing_dirty", title: "Local dirty mark" }),
      104,
      104,
    );

    adapter.markSnapshots = [
      {
        id: "mark_new_remote",
        vaultId: "vault_1",
        userId: "user_1",
        pathId: "path_1",
        trailDayId: "trail_day_remote",
        templateId: null,
        expeditionId: "expedition_1",
        milestoneId: "milestone_1",
        title: "Remote new mark",
        description: "Remote new description",
        origin: "weekly_planned",
        status: "completed",
        scheduledStartAt: 105,
        scheduledEndAt: 106,
        dueAt: null,
        completedAt: 107,
        skippedAt: null,
        expiredAt: null,
        proofNote: "Proof",
        completionSummary: "Done",
        substitutedByMarkId: null,
        rescheduledToMarkId: null,
        sourceBacklogItemId: null,
        generationKey: "generation_new",
        createdAt: 105,
        updatedAt: 108,
        deletedAt: null,
      },
      {
        id: "mark_existing_clean",
        vaultId: "vault_1",
        userId: "user_1",
        pathId: "path_1",
        trailDayId: "trail_day_1",
        templateId: null,
        expeditionId: "expedition_1",
        milestoneId: "milestone_1",
        title: "Remote clean mark",
        description: "Remote clean description",
        origin: "weekly_planned",
        status: "skipped",
        scheduledStartAt: 101,
        scheduledEndAt: 102,
        dueAt: null,
        completedAt: null,
        skippedAt: 109,
        expiredAt: null,
        proofNote: null,
        completionSummary: null,
        substitutedByMarkId: null,
        rescheduledToMarkId: null,
        sourceBacklogItemId: null,
        generationKey: "generation_clean",
        createdAt: 101,
        updatedAt: 110,
        deletedAt: null,
      },
      {
        id: "mark_existing_dirty",
        vaultId: "vault_1",
        userId: "user_1",
        pathId: "path_1",
        trailDayId: "trail_day_1",
        templateId: null,
        expeditionId: "expedition_1",
        milestoneId: "milestone_1",
        title: "Remote dirty mark",
        description: "Remote dirty description",
        origin: "weekly_planned",
        status: "completed",
        scheduledStartAt: 103,
        scheduledEndAt: 104,
        dueAt: null,
        completedAt: 111,
        skippedAt: null,
        expiredAt: null,
        proofNote: null,
        completionSummary: null,
        substitutedByMarkId: null,
        rescheduledToMarkId: null,
        sourceBacklogItemId: null,
        generationKey: "generation_dirty",
        createdAt: 103,
        updatedAt: 112,
        deletedAt: null,
      },
    ];

    const markPull = await pullAllMarkInstancesFromTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      now: 120,
    });
    const newMark = await harness.db.getFirstAsync<{ title: string; status: string; sync_status: string }>(
      "SELECT title, status, sync_status FROM mark_instances WHERE id = ? LIMIT 1;",
      "mark_new_remote",
    );
    const cleanMark = await harness.db.getFirstAsync<{ title: string; status: string; skipped_at: number; sync_status: string }>(
      "SELECT title, status, skipped_at, sync_status FROM mark_instances WHERE id = ? LIMIT 1;",
      "mark_existing_clean",
    );
    const dirtyMark = await harness.db.getFirstAsync<{ title: string; status: string; sync_status: string }>(
      "SELECT title, status, sync_status FROM mark_instances WHERE id = ? LIMIT 1;",
      "mark_existing_dirty",
    );
    const trailDayCounters = await harness.db.getFirstAsync<{
      planned_mark_count: number;
      completed_mark_count: number;
      skipped_mark_count: number;
    }>("SELECT planned_mark_count, completed_mark_count, skipped_mark_count FROM trail_days WHERE id = ? LIMIT 1;", "trail_day_1");

    assert.equal(markPull.fetched, 3);
    assert.equal(markPull.inserted, 1);
    assert.equal(markPull.updated, 1);
    assert.equal(markPull.conflicts, 1);
    assert.equal(markPull.affectedTrailDays, 2);
    assert.equal(newMark?.title, "Remote new mark");
    assert.equal(newMark?.status, "completed");
    assert.equal(newMark?.sync_status, "synced");
    assert.equal(cleanMark?.title, "Remote clean mark");
    assert.equal(cleanMark?.status, "skipped");
    assert.equal(cleanMark?.skipped_at, 109);
    assert.equal(cleanMark?.sync_status, "synced");
    assert.equal(dirtyMark?.title, "Local dirty mark");
    assert.equal(dirtyMark?.status, "planned");
    assert.equal(dirtyMark?.sync_status, "dirty");
    assert.equal(trailDayCounters?.planned_mark_count, 2);
    assert.equal(trailDayCounters?.completed_mark_count, 0);
    assert.equal(trailDayCounters?.skipped_mark_count, 1);

    const repeatedMarkPull = await pullAllMarkInstancesFromTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      now: 125,
    });

    assert.equal(repeatedMarkPull.fetched, 3);
    assert.equal(repeatedMarkPull.inserted, 0);
    assert.equal(repeatedMarkPull.updated, 0);
    assert.equal(repeatedMarkPull.skipped, 2);
    assert.equal(repeatedMarkPull.conflicts, 1);
    assert.equal(repeatedMarkPull.affectedTrailDays, 0);

    const cleanHarness = await createHarness();
    try {
      await cleanHarness.db.runAsync(
        "INSERT INTO vaults (id, name, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?);",
        "vault_clean",
        "Clean Vault",
        1,
        1,
        "active",
      );
      await cleanHarness.db.runAsync(
        "INSERT INTO devices (id, vault_id, client_type, device_name, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?);",
        "device_clean",
        "vault_clean",
        "main",
        "Clean Device",
        1,
        1,
      );
      await cleanHarness.db.runAsync(
        `INSERT INTO paths (
          id, user_id, name, subtitle, slug, title, description, status, color_token,
          icon_key, sort_order, is_active, hero_media_asset_id, created_at, updated_at,
          deleted_at, sync_status, local_revision
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        "path_clean",
        "user_clean",
        "Health",
        null,
        "health",
        "Health",
        "Foundation path",
        "active",
        "green",
        "leaf",
        1,
        1,
        null,
        10,
        10,
        null,
        "synced",
        0,
      );

      const cleanAdapter = new FakePlanningAdapter();
      cleanAdapter.changes = [
        {
          changeSequence: 1,
          vaultId: "vault_clean",
          entityType: "expedition",
          entityId: "expedition_remote",
          operation: "create",
          entityRevision: 1,
          payloadSchemaVersion: 1,
          payloadSnapshot: {
            id: "expedition_remote",
            vault_id: "vault_clean",
            user_id: "user_clean",
            path_id: "path_clean",
            title: "Workspace expedition",
            purpose: "Created by weekly planning",
            description: "Remote new expedition",
            status: "active",
            sort_order: 1,
            start_date: "2026-08-10",
            target_date: "2026-08-31",
            started_at: null,
            target_end_at: null,
            completed_at: null,
            hero_media_asset_id: null,
            created_at: 90,
            updated_at: 90,
            deleted_at: null,
          },
          deletedAt: null,
          updatedAt: 90,
          mutationId: "workspace:expedition:remote:1",
          createdAt: 90,
        },
        {
          changeSequence: 2,
          vaultId: "vault_clean",
          entityType: "milestone",
          entityId: "milestone_remote",
          operation: "create",
          entityRevision: 1,
          payloadSchemaVersion: 1,
          payloadSnapshot: {
            id: "milestone_remote",
            vault_id: "vault_clean",
            user_id: "user_clean",
            expedition_id: "expedition_remote",
            title: "Workspace milestone",
            description: "Remote new milestone",
            status: "planned",
            start_date: "2026-08-10",
            target_date: "2026-08-31",
            sort_order: 1,
            order_index: 1,
            completed_at: null,
            created_at: 95,
            updated_at: 95,
            deleted_at: null,
          },
          deletedAt: null,
          updatedAt: 95,
          mutationId: "workspace:milestone:remote:1",
          createdAt: 95,
        },
        {
          changeSequence: 3,
          vaultId: "vault_clean",
          entityType: "week_plan",
          entityId: "week_plan_remote",
          operation: "create",
          entityRevision: 1,
          payloadSchemaVersion: 1,
          payloadSnapshot: {
            id: "week_plan_remote",
            user_id: "user_clean",
            week_start_date: "2026-08-10",
            week_end_date: "2026-08-16",
            status: "active",
            summary: "Remote weekly plan",
            note: "Created in workspace",
            created_at: 100,
            updated_at: 100,
            deleted_at: null,
          },
          deletedAt: null,
          updatedAt: 100,
          mutationId: "workspace:week_plan:remote:1",
          createdAt: 100,
        },
        {
          changeSequence: 4,
          vaultId: "vault_clean",
          entityType: "week_plan_item",
          entityId: "week_plan_item_remote",
          operation: "create",
          entityRevision: 1,
          payloadSchemaVersion: 1,
          payloadSnapshot: {
            id: "week_plan_item_remote",
            user_id: "user_clean",
            week_plan_id: "week_plan_remote",
            backlog_item_id: null,
            status: "pulled",
            local_date: "2026-08-12",
            start_time: "09:00",
            end_time: "10:00",
            title: "Workspace planned mark",
            path_id: "path_clean",
            template_id: null,
            expedition_id: "expedition_remote",
            milestone_id: "milestone_remote",
            expedition_context: null,
            milestone_context: null,
            description: "Pulled from Turso typed planning",
            note: null,
            origin: "weekly_timetable",
            block_key: "focus",
            deterministic_import_key: "workspace_weekly_plan:week_plan_remote:focus_mark",
            import_batch_id: "workspace_20260810",
            created_mark_instance_id: "remote_pointer_must_be_ignored",
            sort_order: 1,
            order_index: 1,
            created_at: 101,
            updated_at: 101,
            deleted_at: null,
          },
          deletedAt: null,
          updatedAt: 101,
          mutationId: "workspace:week_plan_item:remote:1",
          createdAt: 101,
        },
      ];

      const cleanPull = await pullTypedPlanningWeekPlansFromTurso({
        executor: cleanHarness.db as any,
        adapter: cleanAdapter as any,
        vaultId: "vault_clean",
        deviceId: "device_clean",
        now: 150,
      });
      await cleanHarness.db.runAsync(
        `UPDATE mark_instance_details
         SET primer_snapshot = NULL,
             pre_action_comment = 'User-authored Mark Note',
             user_edited_at = 155
         WHERE mark_instance_id = (
           SELECT created_mark_instance_id
           FROM week_plan_items
           WHERE id = 'week_plan_item_remote'
         );`,
      );
      const cleanSecondPull = await pullTypedPlanningWeekPlansFromTurso({
        executor: cleanHarness.db as any,
        adapter: cleanAdapter as any,
        vaultId: "vault_clean",
        deviceId: "device_clean",
        now: 160,
      });
      const cleanItem = await cleanHarness.db.getFirstAsync<{ created_mark_instance_id: string; sync_status: string }>(
        "SELECT created_mark_instance_id, sync_status FROM week_plan_items WHERE id = ? LIMIT 1;",
        "week_plan_item_remote",
      );
      const cleanMarkCount = await cleanHarness.db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM mark_instances WHERE generation_key = ? AND deleted_at IS NULL;",
        "weekly_planned:workspace_weekly_plan:week_plan_remote:focus_mark",
      );
      const cleanMark = await cleanHarness.db.getFirstAsync<{ title: string; status: string; trail_date: string }>(
        `SELECT mi.title, mi.status, td.local_date AS trail_date
         FROM mark_instances mi
         INNER JOIN trail_days td ON td.id = mi.trail_day_id
         WHERE mi.id = ?
         LIMIT 1;`,
        cleanItem?.created_mark_instance_id,
      );
      const cleanMilestone = await cleanHarness.db.getFirstAsync<{ title: string; expedition_id: string }>(
        "SELECT title, expedition_id FROM milestones WHERE id = ? LIMIT 1;",
        "milestone_remote",
      );
      const cleanTrailDay = await cleanHarness.db.getFirstAsync<{ planned_mark_count: number }>(
        "SELECT planned_mark_count FROM trail_days WHERE user_id = ? AND local_date = ? LIMIT 1;",
        "user_clean",
        "2026-08-12",
      );
      const cleanDetail = await cleanHarness.db.getFirstAsync<{ primer_snapshot: string; pre_action_comment: string }>(
        `SELECT primer_snapshot, pre_action_comment
         FROM mark_instance_details
         WHERE mark_instance_id = ?
         LIMIT 1;`,
        cleanItem?.created_mark_instance_id,
      );

      assert.equal(cleanPull.fetched, 4);
      assert.equal(cleanPull.applied, 4);
      assert.equal(cleanPull.byEntityType.expedition, 1);
      assert.equal(cleanPull.byEntityType.milestone, 1);
      assert.equal(cleanPull.materializedWeekPlanItems.created, 1);
      assert.equal(cleanSecondPull.fetched, 0);
      assert.equal(cleanSecondPull.applied, 0);
      assert.equal(cleanSecondPull.materializedWeekPlanItems.protected, 1);
      assert.ok(cleanItem?.created_mark_instance_id);
      assert.notEqual(cleanItem?.created_mark_instance_id, "remote_pointer_must_be_ignored");
      assert.equal(cleanItem?.sync_status, "synced");
      assert.equal(cleanMarkCount?.count, 1);
      assert.equal(cleanMark?.title, "Workspace planned mark");
      assert.equal(cleanMark?.status, "planned");
      assert.equal(cleanMark?.trail_date, "2026-08-12");
      assert.equal(cleanMilestone?.title, "Workspace milestone");
      assert.equal(cleanMilestone?.expedition_id, "expedition_remote");
      assert.equal(cleanTrailDay?.planned_mark_count, 1);
      assert.equal(cleanDetail?.primer_snapshot, "Pulled from Turso typed planning");
      assert.equal(cleanDetail?.pre_action_comment, "User-authored Mark Note");

      await cleanHarness.db.runAsync(
        `INSERT INTO mark_templates (
           id, user_id, path_id, title, template_type, recurrence_type,
           recurrence_rule_json, is_active, created_at, updated_at, sync_status, local_revision
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        "template_late_binding",
        "user_clean",
        "path_clean",
        "Late workout template",
        "workout",
        "none",
        "{}",
        1,
        160,
        160,
        "synced",
        1,
      );
      await cleanHarness.db.runAsync(
        "UPDATE mark_instances SET status = 'active', template_id = NULL WHERE id = ?;",
        cleanItem?.created_mark_instance_id,
      );
      await cleanHarness.db.runAsync(
        "UPDATE week_plan_items SET template_id = 'template_late_binding', sync_status = 'synced' WHERE id = 'week_plan_item_remote';",
      );
      const lateBindingRepair = await reconcileLocalWeeklyPlanningMaterialization({
        executor: cleanHarness.db as any,
        now: 165,
      });
      const protectedLateBinding = await cleanHarness.db.getFirstAsync<{
        status: string;
        template_id: string | null;
        created_mark_instance_id: string;
      }>(
        `SELECT mi.status, mi.template_id, wpi.created_mark_instance_id
         FROM week_plan_items wpi
         INNER JOIN mark_instances mi ON mi.id = wpi.created_mark_instance_id
         WHERE wpi.id = 'week_plan_item_remote';`,
      );
      assert.equal(lateBindingRepair.materializedWeekPlanItems.protected, 1);
      assert.equal(protectedLateBinding?.status, "active");
      assert.equal(protectedLateBinding?.template_id, null);
      assert.equal(protectedLateBinding?.created_mark_instance_id, cleanItem?.created_mark_instance_id);

      cleanAdapter.changes.push({
        changeSequence: 5,
        vaultId: "vault_clean",
        entityType: "week_plan_item",
        entityId: "week_plan_item_duplicate_key",
        operation: "create",
        entityRevision: 1,
        payloadSchemaVersion: 1,
        payloadSnapshot: {
          id: "week_plan_item_duplicate_key",
          user_id: "user_clean",
          week_plan_id: "week_plan_remote",
          backlog_item_id: null,
          status: "pulled",
          local_date: "2026-08-13",
          start_time: "11:00",
          end_time: "12:00",
          title: "Duplicate semantic item",
          path_id: "path_clean",
          template_id: null,
          expedition_id: "expedition_remote",
          milestone_id: "milestone_remote",
          expedition_context: null,
          milestone_context: null,
          description: "Should be rejected by deterministic key guard",
          note: null,
          origin: "weekly_timetable",
          block_key: "focus",
          deterministic_import_key: "workspace_weekly_plan:week_plan_remote:focus_mark",
          import_batch_id: "workspace_20260810",
          created_mark_instance_id: null,
          sort_order: 2,
          order_index: 2,
          created_at: 170,
          updated_at: 170,
          deleted_at: null,
        },
        deletedAt: null,
        updatedAt: 170,
        mutationId: "workspace:week_plan_item:duplicate-key",
        createdAt: 170,
      });
      await assert.rejects(
        pullTypedPlanningWeekPlansFromTurso({
          executor: cleanHarness.db as any,
          adapter: cleanAdapter as any,
          vaultId: "vault_clean",
          deviceId: "device_clean",
          now: 180,
        }),
        /deterministic_import_key collides/,
      );
      const cleanDuplicateItem = await cleanHarness.db.getFirstAsync<{ id: string }>(
        "SELECT id FROM week_plan_items WHERE id = ? LIMIT 1;",
        "week_plan_item_duplicate_key",
      );
      const cleanPlanningStateAfterRejectedDuplicate = await cleanHarness.db.getFirstAsync<{ last_planning_change_sequence: number }>(
        "SELECT last_planning_change_sequence FROM planning_sync_state WHERE vault_id = ? AND device_id = ? LIMIT 1;",
        "vault_clean",
        "device_clean",
      );
      assert.equal(cleanDuplicateItem, null);
      assert.equal(cleanPlanningStateAfterRejectedDuplicate?.last_planning_change_sequence, 4);
    } finally {
      cleanHarness.close();
    }
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
