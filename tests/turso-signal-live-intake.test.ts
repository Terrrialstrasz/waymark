import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import {
  applyTursoInboundChangesToLocalSqlite,
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

async function seedSignalHarness(db: NodeSqliteAdapter) {
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
    "Signal target mark",
    "manual_plan",
    "planned",
    "manual:mark_1",
    now,
    now,
  );
  await db.runAsync(
    `INSERT INTO signals (
      id, user_id, target_type, target_id, scheduled_at, status, ringing_started_at,
      snoozed_until, resolved_at, dismissed_at, expired_at, cancelled_at, created_at,
      updated_at, deleted_at, sync_status, local_revision
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, NULL, 'synced', 0);`,
    "signal_1",
    "user_1",
    "mark_instance",
    "mark_1",
    Date.UTC(2026, 6, 10, 9, 0, 0),
    "scheduled",
    now,
    now,
  );
}

export async function ssot_turso_remote_signal_edit_updates_local_sqlite_before_signal_engine() {
  const harness = await createHarness();
  try {
    await seedSignalHarness(harness.db);
    const remote: TursoProjectionRecord = {
      vaultId: "vault_1",
      entityType: "signal",
      entityId: "signal_1",
      operation: "update",
      remoteRevision: 1,
      lastIdempotencyKey: "remote:signal:1",
      payload: {
        scheduled_at: Date.UTC(2026, 6, 10, 10, 30, 0),
        status: "snoozed",
        snoozed_until: Date.UTC(2026, 6, 10, 10, 45, 0),
      },
      deletedAt: null,
      updatedAt: Date.UTC(2026, 6, 10, 10, 0, 0),
    };

    const results = await applyTursoInboundChangesToLocalSqlite(harness.db as any, [remote]);
    const row = await harness.db.getFirstAsync<{ scheduled_at: number; status: string; snoozed_until: number; sync_status: string }>(
      "SELECT scheduled_at, status, snoozed_until, sync_status FROM signals WHERE id = ?;",
      "signal_1",
    );

    assert.equal(results[0]?.status, "applied");
    assert.equal(row?.scheduled_at, Date.UTC(2026, 6, 10, 10, 30, 0));
    assert.equal(row?.status, "snoozed");
    assert.equal(row?.snoozed_until, Date.UTC(2026, 6, 10, 10, 45, 0));
    assert.equal(row?.sync_status, "synced");
  } finally {
    harness.close();
  }
}

export async function ssot_turso_remote_signal_edit_with_missing_target_becomes_conflict() {
  const harness = await createHarness();
  try {
    await seedSignalHarness(harness.db);
    const remote: TursoProjectionRecord = {
      vaultId: "vault_1",
      entityType: "signal",
      entityId: "signal_1",
      operation: "update",
      remoteRevision: 1,
      lastIdempotencyKey: "remote:signal:missing_target",
      payload: { target_type: "mark_instance", target_id: "missing_mark", status: "scheduled" },
      deletedAt: null,
      updatedAt: Date.UTC(2026, 6, 10, 10, 0, 0),
    };

    const results = await applyTursoInboundChangesToLocalSqlite(harness.db as any, [remote]);
    const row = await harness.db.getFirstAsync<{ target_id: string }>(
      "SELECT target_id FROM signals WHERE id = ?;",
      "signal_1",
    );

    assert.equal(results[0]?.status, "conflict");
    assert.equal(results[0]?.reason, "missing_signal_target");
    assert.equal(row?.target_id, "mark_1");
  } finally {
    harness.close();
  }
}

export async function ssot_remote_signal_tombstone_cancels_signal_without_mutating_target() {
  const harness = await createHarness();
  try {
    await seedSignalHarness(harness.db);
    const deletedAt = Date.UTC(2026, 6, 10, 10, 0, 0);
    const remote: TursoProjectionRecord = {
      vaultId: "vault_1",
      entityType: "signal",
      entityId: "signal_1",
      operation: "delete",
      remoteRevision: 1,
      lastIdempotencyKey: "remote:signal:tombstone",
      payload: { status: "cancelled", cancelled_at: deletedAt, deleted_at: deletedAt },
      deletedAt,
      updatedAt: deletedAt,
    };

    const results = await applyTursoInboundChangesToLocalSqlite(harness.db as any, [remote]);
    const signal = await harness.db.getFirstAsync<{ status: string; deleted_at: number | null; cancelled_at: number | null }>(
      "SELECT status, deleted_at, cancelled_at FROM signals WHERE id = ?;",
      "signal_1",
    );
    const mark = await harness.db.getFirstAsync<{ status: string; deleted_at: number | null }>(
      "SELECT status, deleted_at FROM mark_instances WHERE id = ?;",
      "mark_1",
    );

    assert.equal(results[0]?.status, "applied");
    assert.equal(signal?.status, "cancelled");
    assert.equal(signal?.deleted_at, deletedAt);
    assert.equal(signal?.cancelled_at, deletedAt);
    assert.equal(mark?.status, "planned");
    assert.equal(mark?.deleted_at, null);
  } finally {
    harness.close();
  }
}

async function run() {
  await ssot_turso_remote_signal_edit_updates_local_sqlite_before_signal_engine();
  await ssot_turso_remote_signal_edit_with_missing_target_becomes_conflict();
  await ssot_remote_signal_tombstone_cancels_signal_without_mutating_target();
}

void run()
  .then(() => {
    console.log("turso-signal-live-intake contract tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
