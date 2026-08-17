import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import {
  enqueueSyncOutboxMutation,
  listPendingSyncOutboxRows,
  uploadWaymarkOutboxToTurso,
  type SyncOutboxRow,
} from "../src/lib/waymark";
import type { WaymarkTursoPushResult } from "../src/lib/waymark/tursoRemoteAdapter";

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

class FakeRemoteUploadAdapter {
  fail = false;
  failWithMessage: string | null = null;
  transientFailuresRemaining = 0;
  revision = 0;
  pushedRows: SyncOutboxRow[] = [];
  idempotency = new Map<string, WaymarkTursoPushResult>();

  async pushOutboxRow(row: SyncOutboxRow): Promise<WaymarkTursoPushResult> {
    this.pushedRows.push(row);
    if (this.transientFailuresRemaining > 0) {
      this.transientFailuresRemaining -= 1;
      throw new Error("fetch failed: java.net.UnknownHostException: Unable to resolve host");
    }
    if (this.failWithMessage) {
      throw new Error(this.failWithMessage);
    }
    if (this.fail) {
      throw new Error("network unavailable");
    }

    const existing = this.idempotency.get(row.idempotency_key);
    if (existing) {
      return { ...existing, duplicate: true };
    }

    const result = {
      remoteRevision: ++this.revision,
      entityType: row.entity_type,
      entityId: row.entity_id,
      idempotencyKey: row.idempotency_key,
      duplicate: false,
    };
    this.idempotency.set(row.idempotency_key, result);
    return result;
  }
}

async function createHarness() {
  const database = new DatabaseSync(":memory:");
  const db = new NodeSqliteAdapter(database);
  await applyMigrationsAsync(db as any);
  return { db, close: () => database.close() };
}

async function enqueueMemory(db: NodeSqliteAdapter, id: string, revision: number) {
  return enqueueSyncOutboxMutation(db as any, {
    vaultId: "vault_1",
    deviceId: "device_1",
    dbInstanceId: "db_1",
    entityType: "memory",
    entityId: id,
    operation: "create",
    localRevision: revision,
    payload: { id, title: `Memory ${revision}` },
    now: revision,
  });
}

async function turso_manual_upload_pushes_pending_outbox_in_order() {
  const harness = await createHarness();
  try {
    await enqueueMemory(harness.db, "memory_1", 1);
    await enqueueMemory(harness.db, "memory_2", 2);
    const adapter = new FakeRemoteUploadAdapter();

    const result = await uploadWaymarkOutboxToTurso({
      executor: harness.db as any,
      adapter,
      vaultId: "vault_1",
      trigger: "manual_upload",
      now: () => 10,
    });
    const rows = await harness.db.getAllAsync<SyncOutboxRow>("SELECT * FROM sync_outbox ORDER BY created_at ASC;");

    assert.equal(result.trigger, "manual_upload");
    assert.equal(result.attempted, 2);
    assert.deepEqual(adapter.pushedRows.map((row) => row.entity_id), ["memory_1", "memory_2"]);
    assert.deepEqual(rows.map((row) => row.status), ["synced", "synced"]);
    assert.equal(rows[0]?.synced_at, 10);
  } finally {
    harness.close();
  }
}

async function turso_eod_upload_uses_same_batch_service() {
  const harness = await createHarness();
  try {
    await enqueueMemory(harness.db, "memory_eod", 1);
    const adapter = new FakeRemoteUploadAdapter();

    const result = await uploadWaymarkOutboxToTurso({
      executor: harness.db as any,
      adapter,
      vaultId: "vault_1",
      trigger: "eod",
      now: () => 20,
    });

    assert.equal(result.trigger, "eod");
    assert.equal(result.uploaded.length, 1);
    assert.equal(result.failed.length, 0);
  } finally {
    harness.close();
  }
}

async function turso_upload_failure_keeps_local_canonical_state() {
  const harness = await createHarness();
  try {
    await harness.db.runAsync(
      `INSERT INTO trail_days (
        id, user_id, local_date, status, anchor_path_id, closed_at, reopened_at, close_summary,
        tomorrow_first_step, character_result, planned_mark_count, completed_mark_count,
        skipped_mark_count, memory_count, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, 'open', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, ?, ?, NULL, 'dirty', 1);`,
      "trail_day_fail",
      "user_1",
      "2026-07-12",
      1,
      1,
    );
    await harness.db.runAsync(
      `INSERT INTO memories (
        id, user_id, trail_day_id, path_id, title, body, mood, note, captured_at, privacy,
        latitude, longitude, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, NULL, ?, NULL, NULL, NULL, ?, 'private', NULL, NULL, ?, ?, NULL, 'dirty', 1);`,
      "memory_fail",
      "user_1",
      "trail_day_fail",
      "Keep me",
      1,
      1,
      1,
    );
    await enqueueMemory(harness.db, "memory_fail", 1);
    const adapter = new FakeRemoteUploadAdapter();
    adapter.fail = true;

    const result = await uploadWaymarkOutboxToTurso({
      executor: harness.db as any,
      adapter,
      vaultId: "vault_1",
      trigger: "manual_upload",
      now: () => 30,
    });
    const memory = await harness.db.getFirstAsync<{ title: string }>("SELECT title FROM memories WHERE id = ?;", "memory_fail");
    const outbox = await harness.db.getFirstAsync<SyncOutboxRow>("SELECT * FROM sync_outbox WHERE entity_id = ?;", "memory_fail");

    assert.equal(result.failed.length, 1);
    assert.equal(memory?.title, "Keep me");
    assert.equal(outbox?.status, "retry_wait");
    assert.equal(outbox?.retry_count, 1);
    assert.match(outbox?.last_error ?? "", /network unavailable/);
  } finally {
    harness.close();
  }
}

async function turso_retry_same_outbox_row_does_not_duplicate_remote_record() {
  const harness = await createHarness();
  try {
    const row = await enqueueMemory(harness.db, "memory_retry", 1);
    const adapter = new FakeRemoteUploadAdapter();
    adapter.idempotency.set(row.idempotency_key, {
      remoteRevision: 42,
      entityType: row.entity_type,
      entityId: row.entity_id,
      idempotencyKey: row.idempotency_key,
      duplicate: false,
    });

    const result = await uploadWaymarkOutboxToTurso({
      executor: harness.db as any,
      adapter,
      vaultId: "vault_1",
      trigger: "manual_upload",
      now: () => 40,
    });
    const pending = await listPendingSyncOutboxRows(harness.db as any, { vaultId: "vault_1" });

    assert.equal(result.uploaded.length, 1);
    assert.equal(result.uploaded[0]?.remoteRevision, 42);
    assert.equal(result.uploaded[0]?.duplicate, true);
    assert.equal(adapter.revision, 0);
    assert.equal(pending.length, 0);
  } finally {
    harness.close();
  }
}

async function turso_transient_network_failure_retries_then_stops_batch_early() {
  const harness = await createHarness();
  try {
    await enqueueMemory(harness.db, "memory_transient_1", 1);
    await enqueueMemory(harness.db, "memory_transient_2", 2);
    await enqueueMemory(harness.db, "memory_transient_3", 3);
    const adapter = new FakeRemoteUploadAdapter();
    adapter.transientFailuresRemaining = 2;

    const result = await uploadWaymarkOutboxToTurso({
      executor: harness.db as any,
      adapter,
      vaultId: "vault_1",
      trigger: "manual_upload",
      maxPushAttempts: 2,
      now: () => 50,
    });
    const rows = await harness.db.getAllAsync<SyncOutboxRow>("SELECT * FROM sync_outbox ORDER BY created_at ASC;");

    assert.equal(result.attempted, 1);
    assert.equal(result.failed.length, 1);
    assert.equal(result.stoppedAfterTransientFailure, true);
    assert.equal(adapter.pushedRows.length, 2);
    assert.deepEqual(rows.map((row) => row.status), ["retry_wait", "pending", "pending"]);
  } finally {
    harness.close();
  }
}

async function turso_turso_cursor_failure_is_treated_as_transient() {
  const harness = await createHarness();
  try {
    await enqueueMemory(harness.db, "memory_cursor_1", 1);
    await enqueueMemory(harness.db, "memory_cursor_2", 2);
    const adapter = new FakeRemoteUploadAdapter();
    adapter.failWithMessage = "No cursor response received";

    const result = await uploadWaymarkOutboxToTurso({
      executor: harness.db as any,
      adapter,
      vaultId: "vault_1",
      trigger: "manual_upload",
      maxPushAttempts: 2,
      now: () => 60,
    });
    const rows = await harness.db.getAllAsync<SyncOutboxRow>("SELECT * FROM sync_outbox ORDER BY created_at ASC;");

    assert.equal(result.attempted, 1);
    assert.equal(result.failed.length, 1);
    assert.equal(result.stoppedAfterTransientFailure, true);
    assert.equal(adapter.pushedRows.length, 2);
    assert.deepEqual(rows.map((row) => row.status), ["retry_wait", "pending"]);
  } finally {
    harness.close();
  }
}

async function turso_manual_upload_skips_turso_primary_outbox_rows() {
  const harness = await createHarness();
  try {
    await enqueueSyncOutboxMutation(harness.db as any, {
      vaultId: "vault_1",
      deviceId: "device_1",
      dbInstanceId: "db_1",
      entityType: "week_plan_item",
      entityId: "remote_owned_item_1",
      operation: "update",
      localRevision: 1,
      payload: { id: "remote_owned_item_1", title: "Should not upload" },
      now: 1,
    });
    await enqueueMemory(harness.db, "memory_after_skip", 2);
    const adapter = new FakeRemoteUploadAdapter();

    const result = await uploadWaymarkOutboxToTurso({
      executor: harness.db as any,
      adapter,
      vaultId: "vault_1",
      trigger: "manual_upload",
      now: () => 70,
    });
    const rows = await harness.db.getAllAsync<SyncOutboxRow>("SELECT * FROM sync_outbox ORDER BY created_at ASC;");

    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0]?.entityType, "week_plan_item");
    assert.equal(result.attempted, 1);
    assert.deepEqual(adapter.pushedRows.map((row) => row.entity_type), ["memory"]);
    assert.deepEqual(rows.map((row) => row.status), ["synced", "synced"]);
  } finally {
    harness.close();
  }
}

async function run() {
  await turso_manual_upload_pushes_pending_outbox_in_order();
  await turso_eod_upload_uses_same_batch_service();
  await turso_upload_failure_keeps_local_canonical_state();
  await turso_retry_same_outbox_row_does_not_duplicate_remote_record();
  await turso_transient_network_failure_retries_then_stops_batch_early();
  await turso_turso_cursor_failure_is_treated_as_transient();
  await turso_manual_upload_skips_turso_primary_outbox_rows();
}

void run()
  .then(() => {
    console.log("turso-sync-service tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
