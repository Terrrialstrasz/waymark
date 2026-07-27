import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import { enqueueSyncOutboxMutation } from "../src/lib/waymark/ssotOutbox";
import {
  applyTursoInboundChangesToLocalSqlite,
  FakeTursoProjectionStore,
  type TursoProjectionRecord,
} from "../src/lib/waymark/tursoProjection";

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
  const adapter = new NodeSqliteAdapter(database);
  await applyMigrationsAsync(adapter as any);
  return { db: adapter, close: () => database.close() };
}

async function seedWeeklyHarness(db: NodeSqliteAdapter) {
  const now = Date.UTC(2026, 6, 10, 8, 0, 0);
  await db.runAsync(
    `INSERT INTO paths (
      id, user_id, name, subtitle, slug, title, description, status,
      color_token, hero_media_asset_id, icon_key, sort_order, is_active,
      created_at, updated_at, deleted_at,
      sync_status, local_revision
    ) VALUES (?, ?, ?, NULL, ?, ?, NULL, ?, ?, NULL, NULL, 0, 1, ?, ?, NULL, 'synced', 0);`,
    "path_1",
    "user_1",
    "Path",
    "path",
    "Path",
    "active",
    "blue",
    now,
    now,
  );
  await db.runAsync(
    `INSERT INTO trail_days (
      id, user_id, local_date, status, anchor_path_id, closed_at, reopened_at,
      close_summary, tomorrow_first_step, character_result, planned_mark_count,
      completed_mark_count, skipped_mark_count, memory_count, created_at,
      updated_at, deleted_at,
      sync_status, local_revision
    ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, 1, 0, 0, 0, ?, ?, NULL, 'synced', 0);`,
    "trail_day_1",
    "user_1",
    "2026-07-10",
    "open",
    "path_1",
    now,
    now,
  );
  await db.runAsync(
    `INSERT INTO mark_instances (
      id, user_id, path_id, trail_day_id, template_id, milestone_id, title,
      description, origin, status, scheduled_start_at, scheduled_end_at, due_at,
      completed_at, skipped_at, expired_at, proof_note, completion_summary,
      substituted_by_mark_id, rescheduled_to_mark_id, generation_key, created_at,
      updated_at, deleted_at, sync_status, local_revision
    ) VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, NULL, 'synced', 0);`,
    "mark_1",
    "user_1",
    "path_1",
    "trail_day_1",
    "Materialized weekly mark",
    "weekly_planned",
    "planned",
    "weekly_planned:one",
    now,
    now,
  );
  await db.runAsync(
    `INSERT INTO week_plans (
      id, user_id, week_start_date, week_end_date, status, summary, note,
      created_at, updated_at, deleted_at, sync_status, local_revision
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'synced', 0);`,
    "week_plan_1",
    "user_1",
    "2026-07-06",
    "2026-07-12",
    "draft",
    "Initial week",
    "Initial week",
    now,
    now,
  );
  await db.runAsync(
    `INSERT INTO week_plan_items (
      id, user_id, week_plan_id, backlog_item_id, status, local_date, start_time, end_time,
      title, path_id, template_id, expedition_id, milestone_id, expedition_context,
      milestone_context, description, note, origin, block_key, deterministic_import_key,
      import_batch_id, created_mark_instance_id, sort_order, order_index, created_at,
      updated_at, deleted_at, sync_status, local_revision
    ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, NULL, 'synced', 0);`,
    "week_plan_item_1",
    "user_1",
    "week_plan_1",
    "planned",
    "2026-07-10",
    "09:00",
    "10:00",
    "Original weekly item",
    "Original details",
    "Original note",
    "weekly_timetable",
    "deep_work",
    "weekly_timetable:2026-07-06:2026-07-10:09:00:10:00:deep_work:waymark",
    "batch_1",
    "mark_1",
    now,
    now,
  );
  await db.runAsync(
    `INSERT INTO mark_instance_details (
      mark_instance_id, primer_snapshot, pre_action_comment, post_action_feedback,
      user_edited_at, created_at, updated_at, deleted_at, sync_status, local_revision
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'synced', 3);`,
    "mark_1",
    "Protected materialized detail",
    "User pre comment",
    "User feedback",
    now,
    now,
    now,
  );
}

export async function ssot_weekly_timetable_upload_pushes_week_plan_and_items_once() {
  const harness = await createHarness();
  try {
    const store = new FakeTursoProjectionStore();
    const weekPlanOutbox = await enqueueSyncOutboxMutation(harness.db as any, {
      vaultId: "vault_1",
      deviceId: "device_1",
      dbInstanceId: "db_1",
      entityType: "week_plan",
      entityId: "week_plan_1",
      operation: "update",
      localRevision: 1,
      idempotencyKey: "vault_1:device_1:week_plan:week_plan_1:update:1",
      payload: { id: "week_plan_1", status: "active" },
    });
    const itemOutbox = await enqueueSyncOutboxMutation(harness.db as any, {
      vaultId: "vault_1",
      deviceId: "device_1",
      dbInstanceId: "db_1",
      entityType: "week_plan_item",
      entityId: "week_plan_item_1",
      operation: "update",
      localRevision: 1,
      idempotencyKey: "vault_1:device_1:week_plan_item:week_plan_item_1:update:1",
      payload: { id: "week_plan_item_1", title: "Pushed once" },
    });

    store.pushOutboxRow(weekPlanOutbox);
    store.pushOutboxRow(itemOutbox);
    store.pushOutboxRow(weekPlanOutbox);
    store.pushOutboxRow(itemOutbox);

    assert.equal(store.countRecords({ vaultId: "vault_1", entityType: "week_plan" }), 1);
    assert.equal(store.countRecords({ vaultId: "vault_1", entityType: "week_plan_item" }), 1);
  } finally {
    harness.close();
  }
}

export async function ssot_turso_remote_week_plan_item_edit_applies_to_local_sqlite_before_ui() {
  const harness = await createHarness();
  try {
    await seedWeeklyHarness(harness.db);
    const store = new FakeTursoProjectionStore();
    const remote = store.upsertRemoteEdit({
      vaultId: "vault_1",
      entityType: "week_plan_item",
      entityId: "week_plan_item_1",
      operation: "update",
      payload: { title: "Edited from Turso", start_time: "11:00", note: "Remote note" },
      deletedAt: null,
      updatedAt: Date.UTC(2026, 6, 10, 9, 0, 0),
    });

    const results = await applyTursoInboundChangesToLocalSqlite(harness.db as any, [remote]);
    const row = await harness.db.getFirstAsync<{ title: string; start_time: string; note: string; sync_status: string }>(
      "SELECT title, start_time, note, sync_status FROM week_plan_items WHERE id = ?;",
      "week_plan_item_1",
    );

    assert.equal(results[0]?.status, "applied");
    assert.equal(row?.title, "Edited from Turso");
    assert.equal(row?.start_time, "11:00");
    assert.equal(row?.note, "Remote note");
    assert.equal(row?.sync_status, "synced");
  } finally {
    harness.close();
  }
}

export async function ssot_turso_remote_week_plan_item_edit_does_not_overwrite_materialized_mark_details() {
  const harness = await createHarness();
  try {
    await seedWeeklyHarness(harness.db);
    const remote: TursoProjectionRecord = {
      vaultId: "vault_1",
      entityType: "week_plan_item",
      entityId: "week_plan_item_1",
      operation: "update",
      remoteRevision: 1,
      lastIdempotencyKey: "remote:weekly:1",
      payload: { description: "Changed remote weekly item detail", note: "Changed remote note" },
      deletedAt: null,
      updatedAt: Date.UTC(2026, 6, 10, 9, 0, 0),
    };

    const results = await applyTursoInboundChangesToLocalSqlite(harness.db as any, [remote]);
    const detail = await harness.db.getFirstAsync<{
      primer_snapshot: string;
      pre_action_comment: string;
      post_action_feedback: string;
      local_revision: number;
    }>("SELECT primer_snapshot, pre_action_comment, post_action_feedback, local_revision FROM mark_instance_details WHERE mark_instance_id = ?;", "mark_1");

    assert.equal(results[0]?.status, "applied");
    assert.equal(detail?.primer_snapshot, "Protected materialized detail");
    assert.equal(detail?.pre_action_comment, "User pre comment");
    assert.equal(detail?.post_action_feedback, "User feedback");
    assert.equal(detail?.local_revision, 3);
  } finally {
    harness.close();
  }
}

export async function ssot_turso_remote_edit_without_revision_is_rejected_or_conflict() {
  const harness = await createHarness();
  try {
    await seedWeeklyHarness(harness.db);
    const remote: TursoProjectionRecord = {
      vaultId: "vault_1",
      entityType: "week_plan_item",
      entityId: "week_plan_item_1",
      operation: "update",
      remoteRevision: 0,
      lastIdempotencyKey: "remote:missing_revision",
      payload: { title: "Should not apply" },
      deletedAt: null,
      updatedAt: Date.UTC(2026, 6, 10, 9, 0, 0),
    };

    const results = await applyTursoInboundChangesToLocalSqlite(harness.db as any, [remote]);
    const row = await harness.db.getFirstAsync<{ title: string }>(
      "SELECT title FROM week_plan_items WHERE id = ?;",
      "week_plan_item_1",
    );

    assert.equal(results[0]?.status, "rejected");
    assert.equal(row?.title, "Original weekly item");
  } finally {
    harness.close();
  }
}

export async function ssot_remote_week_plan_item_tombstone_hides_item_without_hard_deleting_completed_mark() {
  const harness = await createHarness();
  try {
    await seedWeeklyHarness(harness.db);
    await harness.db.runAsync(
      "UPDATE mark_instances SET status = ?, completed_at = ?, title = ? WHERE id = ?;",
      "completed",
      Date.UTC(2026, 6, 10, 8, 30, 0),
      "Completed mark",
      "mark_1",
    );
    const remote: TursoProjectionRecord = {
      vaultId: "vault_1",
      entityType: "week_plan_item",
      entityId: "week_plan_item_1",
      operation: "delete",
      remoteRevision: 1,
      lastIdempotencyKey: "remote:weekly:tombstone",
      payload: { deleted_at: Date.UTC(2026, 6, 10, 9, 0, 0) },
      deletedAt: Date.UTC(2026, 6, 10, 9, 0, 0),
      updatedAt: Date.UTC(2026, 6, 10, 9, 0, 0),
    };

    const results = await applyTursoInboundChangesToLocalSqlite(harness.db as any, [remote]);
    const item = await harness.db.getFirstAsync<{ deleted_at: number | null }>(
      "SELECT deleted_at FROM week_plan_items WHERE id = ?;",
      "week_plan_item_1",
    );
    const mark = await harness.db.getFirstAsync<{ status: string; deleted_at: number | null }>(
      "SELECT status, deleted_at FROM mark_instances WHERE id = ?;",
      "mark_1",
    );

    assert.equal(results[0]?.status, "applied");
    assert.equal(typeof item?.deleted_at, "number");
    assert.equal(mark?.status, "completed");
    assert.equal(mark?.deleted_at, null);
  } finally {
    harness.close();
  }
}

async function run() {
  await ssot_weekly_timetable_upload_pushes_week_plan_and_items_once();
  await ssot_turso_remote_week_plan_item_edit_applies_to_local_sqlite_before_ui();
  await ssot_turso_remote_week_plan_item_edit_does_not_overwrite_materialized_mark_details();
  await ssot_turso_remote_edit_without_revision_is_rejected_or_conflict();
  await ssot_remote_week_plan_item_tombstone_hides_item_without_hard_deleting_completed_mark();
}

void run()
  .then(() => {
    console.log("turso-weekly-live-intake contract tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
