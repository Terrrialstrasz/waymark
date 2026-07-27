import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import {
  buildTypedHierarchyMutationId,
  uploadHierarchyProjectionToTurso,
  type TursoPlanningExpeditionSnapshot,
  type TursoPlanningMarkInstanceSnapshot,
  type TursoPlanningMutationResult,
  type TursoPlanningPathSnapshot,
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

class FakeHierarchyAdapter {
  calls: Array<{
    entityType: "path" | "expedition" | "mark_instance";
    entityId: string;
    mutationId: string;
    snapshot: TursoPlanningPathSnapshot | TursoPlanningExpeditionSnapshot | TursoPlanningMarkInstanceSnapshot;
  }> = [];
  seen = new Map<string, TursoPlanningMutationResult>();

  async upsertPlanningPathSnapshot(input: {
    snapshot: TursoPlanningPathSnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    return this.record("path", input.snapshot.id, input.mutationId, input.snapshot);
  }

  async upsertPlanningExpeditionSnapshot(input: {
    snapshot: TursoPlanningExpeditionSnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    return this.record("expedition", input.snapshot.id, input.mutationId, input.snapshot);
  }

  async upsertPlanningMarkInstanceSnapshot(input: {
    snapshot: TursoPlanningMarkInstanceSnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    return this.record("mark_instance", input.snapshot.id, input.mutationId, input.snapshot);
  }

  private record(
    entityType: "path" | "expedition" | "mark_instance",
    entityId: string,
    mutationId: string,
    snapshot: TursoPlanningPathSnapshot | TursoPlanningExpeditionSnapshot | TursoPlanningMarkInstanceSnapshot,
  ): TursoPlanningMutationResult {
    this.calls.push({ entityType, entityId, mutationId, snapshot });
    const existing = this.seen.get(mutationId);
    if (existing) {
      return { ...existing, duplicate: true };
    }
    const result: TursoPlanningMutationResult = {
      changeSequence: this.seen.size + 1,
      entityType,
      entityId,
      mutationId,
      duplicate: false,
    };
    this.seen.set(mutationId, result);
    return result;
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
    buildTypedHierarchyMutationId({
      vaultId: "vault_1",
      deviceId: "device_1",
      entityType: "mark_instance",
      entityId: "mark_1",
      localRevision: 3,
      payloadHash: "abc123",
    }),
    "typed_hierarchy:vault_1:device_1:mark_instance:mark_1:3:abc123",
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
      `INSERT INTO paths (
        id, user_id, name, subtitle, slug, title, description, status, color_token,
        icon_key, sort_order, is_active, hero_media_asset_id, created_at, updated_at,
        deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'dirty', ?);`,
      "path_1",
      "user_1",
      "Health",
      "Health subtitle",
      "health",
      "Health",
      "Path description",
      "active",
      "green",
      "leaf",
      1,
      1,
      null,
      10,
      20,
      2,
    );
    await harness.db.runAsync(
      `INSERT INTO expeditions (
        id, user_id, path_id, title, purpose, description, status, sort_order,
        start_date, target_date, started_at, target_end_at, completed_at,
        hero_media_asset_id, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'dirty', ?);`,
      "expedition_1",
      "user_1",
      "path_1",
      "Cut to 70",
      "Purpose",
      "Expedition description",
      "active",
      1,
      "2026-07-01",
      "2026-08-01",
      11,
      12,
      null,
      null,
      13,
      23,
      4,
    );
    await harness.db.runAsync(
      `INSERT INTO trail_days (
        id, user_id, local_date, status, anchor_path_id, planned_mark_count,
        completed_mark_count, skipped_mark_count, memory_count, created_at, updated_at,
        deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, NULL, 'dirty', ?);`,
      "trail_day_1",
      "user_1",
      "2026-07-25",
      "open",
      "path_1",
      14,
      24,
      1,
    );
    await harness.db.runAsync(
      `INSERT INTO mark_instances (
        id, user_id, path_id, trail_day_id, template_id, expedition_id, milestone_id,
        title, description, origin, status, scheduled_start_at, scheduled_end_at,
        due_at, completed_at, skipped_at, expired_at, proof_note, completion_summary,
        substituted_by_mark_id, rescheduled_to_mark_id, source_backlog_item_id,
        generation_key, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'dirty', ?);`,
      "mark_1",
      "user_1",
      "path_1",
      "trail_day_1",
      null,
      "expedition_1",
      null,
      "Practice bunker shot",
      "Mark detail",
      "weekly_planned",
      "planned",
      100,
      200,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      "generation_1",
      15,
      25,
      6,
    );

    const adapter = new FakeHierarchyAdapter();
    const first = await uploadHierarchyProjectionToTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
    });
    const second = await uploadHierarchyProjectionToTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
    });

    assert.equal(first.scanned, 3);
    assert.equal(first.uploaded, 3);
    assert.equal(first.duplicates, 0);
    assert.equal(first.failed.length, 0);
    assert.equal(second.scanned, 3);
    assert.equal(second.uploaded, 0);
    assert.equal(second.duplicates, 3);
    assert.deepEqual(
      adapter.calls.slice(0, 3).map((call) => call.entityType),
      ["path", "expedition", "mark_instance"],
    );
    assert.equal(adapter.calls[2]?.snapshot.title, "Practice bunker shot");
    assert.match(adapter.calls[2]?.mutationId ?? "", /^typed_hierarchy:vault_1:device_1:mark_instance:mark_1:6:/);
  } finally {
    harness.close();
  }
}

void run()
  .then(() => {
    console.log("turso-hierarchy-projection-sync tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
