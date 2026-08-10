import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import {
  buildTypedHierarchyMutationId,
  getWaymarkTursoRemoteSchemaSql,
  uploadHierarchyProjectionToTurso,
  type TursoPlanningExpeditionProgressPatch,
  type TursoPlanningMarkInstanceSnapshot,
  type TursoPlanningMilestoneProgressPatch,
  type TursoPlanningMutationResult,
  type TursoPlanningPathSnapshot,
  type TursoPlanningTrailDaySnapshot,
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
    entityType: "path" | "expedition" | "milestone" | "trail_day" | "mark_instance";
    entityId: string;
    mutationId: string;
    snapshot:
      | TursoPlanningPathSnapshot
      | TursoPlanningExpeditionProgressPatch
      | TursoPlanningMilestoneProgressPatch
      | TursoPlanningTrailDaySnapshot
      | TursoPlanningMarkInstanceSnapshot;
  }> = [];
  seen = new Map<string, TursoPlanningMutationResult>();

  async upsertPlanningPathSnapshot(input: {
    snapshot: TursoPlanningPathSnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    return this.record("path", input.snapshot.id, input.mutationId, input.snapshot);
  }

  async updatePlanningExpeditionProgressPatch(input: {
    patch: TursoPlanningExpeditionProgressPatch;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    return this.record("expedition", input.patch.id, input.mutationId, input.patch);
  }

  async upsertPlanningTrailDaySnapshot(input: {
    snapshot: TursoPlanningTrailDaySnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    return this.record("trail_day", input.snapshot.id, input.mutationId, input.snapshot);
  }

  async updatePlanningMilestoneProgressPatch(input: {
    patch: TursoPlanningMilestoneProgressPatch;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    return this.record("milestone", input.patch.id, input.mutationId, input.patch);
  }

  async upsertPlanningMarkInstanceSnapshot(input: {
    snapshot: TursoPlanningMarkInstanceSnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    return this.record("mark_instance", input.snapshot.id, input.mutationId, input.snapshot);
  }

  private record(
    entityType: "path" | "expedition" | "milestone" | "trail_day" | "mark_instance",
    entityId: string,
    mutationId: string,
    snapshot:
      | TursoPlanningPathSnapshot
      | TursoPlanningExpeditionProgressPatch
      | TursoPlanningMilestoneProgressPatch
      | TursoPlanningTrailDaySnapshot
      | TursoPlanningMarkInstanceSnapshot,
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
      entityType: "milestone",
      entityId: "milestone_1",
      localRevision: 3,
      payloadHash: "abc123",
    }),
    "typed_hierarchy:vault_1:device_1:milestone:milestone_1:3:abc123",
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
      `INSERT INTO milestones (
        id, user_id, expedition_id, title, description, status, start_date,
        target_date, sort_order, order_index, completed_at, created_at, updated_at,
        deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'dirty', ?);`,
      "milestone_1",
      "user_1",
      "expedition_1",
      "Reach 75kg",
      "Milestone detail",
      "planned",
      "2026-08-03",
      "2026-08-09",
      1,
      1,
      null,
      15,
      25,
      6,
    );
    await harness.db.runAsync(
      `INSERT INTO trail_days (
        id, user_id, local_date, status, anchor_path_id, planned_mark_count,
        completed_mark_count, skipped_mark_count, memory_count, created_at, updated_at,
        deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, 1, 0, 0, 0, ?, ?, NULL, 'dirty', ?);`,
      "trail_day_1",
      "user_1",
      "2026-08-06",
      "open",
      "path_1",
      16,
      26,
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
      "milestone_1",
      "Reach 75kg check-in",
      "Historical or weekly planned mark",
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
      17,
      27,
      7,
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

    assert.equal(first.scanned, 5);
    assert.equal(first.uploaded, 5);
    assert.equal(first.duplicates, 0);
    assert.equal(first.failed.length, 0);
    assert.equal(second.scanned, 5);
    assert.equal(second.uploaded, 0);
    assert.equal(second.duplicates, 5);
    assert.deepEqual(
      adapter.calls.slice(0, 5).map((call) => call.entityType),
      ["path", "trail_day", "expedition", "milestone", "mark_instance"],
    );
    assert.equal((adapter.calls[1]?.snapshot as TursoPlanningTrailDaySnapshot).localDate, "2026-08-06");
    assert.match(adapter.calls[1]?.mutationId ?? "", /^typed_hierarchy:vault_1:device_1:trail_day:trail_day_1:1:/);
    assert.equal((adapter.calls[3]?.snapshot as TursoPlanningMilestoneProgressPatch).status, "planned");
    assert.equal("title" in (adapter.calls[3]?.snapshot as Record<string, unknown>), false);
    assert.equal("description" in (adapter.calls[3]?.snapshot as Record<string, unknown>), false);
    assert.equal("expeditionId" in (adapter.calls[3]?.snapshot as Record<string, unknown>), false);
    assert.match(adapter.calls[3]?.mutationId ?? "", /^typed_hierarchy:vault_1:device_1:milestone:milestone_1:6:/);
    assert.equal((adapter.calls[4]?.snapshot as TursoPlanningMarkInstanceSnapshot).title, "Reach 75kg check-in");
    assert.match(adapter.calls[4]?.mutationId ?? "", /^typed_hierarchy:vault_1:device_1:mark_instance:mark_1:7:/);

    const syncRows = await harness.db.getAllAsync<{ id: string; sync_status: string }>(
      "SELECT id, sync_status FROM mark_instances ORDER BY id;",
    );
    assert.equal(syncRows.length, 1);
    assert.equal(syncRows[0]?.id, "mark_1");
    assert.equal(syncRows[0]?.sync_status, "synced");

    await harness.db.runAsync(
      "UPDATE mark_instances SET status = 'completed', completed_at = ?, local_revision = 8, sync_status = 'dirty' WHERE id = ?;",
      300,
      "mark_1",
    );
    const incremental = await uploadHierarchyProjectionToTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      onlyDirty: true,
    });
    assert.equal(incremental.scanned, 1);
    assert.equal(incremental.uploaded, 1);
    assert.equal(incremental.byEntityType.mark_instance.scanned, 1);
    assert.equal(adapter.calls.at(-1)?.entityType, "mark_instance");
    assert.match(adapter.calls.at(-1)?.mutationId ?? "", /^typed_hierarchy:vault_1:device_1:mark_instance:mark_1:8:/);

    await harness.db.runAsync(
      "UPDATE expeditions SET status = 'completed', completed_at = ?, local_revision = 5, sync_status = 'dirty' WHERE id = ?;",
      400,
      "expedition_1",
    );
    await harness.db.runAsync(
      "UPDATE milestones SET status = 'completed', completed_at = ?, local_revision = 9, sync_status = 'dirty' WHERE id = ?;",
      400,
      "milestone_1",
    );
    const statusUpload = await uploadHierarchyProjectionToTurso({
      executor: harness.db as any,
      adapter: adapter as any,
      vaultId: "vault_1",
      deviceId: "device_1",
      onlyDirty: true,
      entityTypes: ["expedition", "milestone", "trail_day", "mark_instance"],
    });
    assert.equal(statusUpload.scanned, 2);
    assert.equal(statusUpload.uploaded, 2);
    assert.equal(statusUpload.byEntityType.expedition.scanned, 1);
    assert.equal(statusUpload.byEntityType.milestone.scanned, 1);
    assert.equal(adapter.calls.at(-2)?.entityType, "expedition");
    assert.equal((adapter.calls.at(-2)?.snapshot as TursoPlanningExpeditionProgressPatch).status, "completed");
    assert.equal("title" in (adapter.calls.at(-2)?.snapshot as Record<string, unknown>), false);
    assert.equal("pathId" in (adapter.calls.at(-2)?.snapshot as Record<string, unknown>), false);
    assert.match(adapter.calls.at(-2)?.mutationId ?? "", /^typed_hierarchy:vault_1:device_1:expedition:expedition_1:5:/);
    assert.equal(adapter.calls.at(-1)?.entityType, "milestone");
    assert.equal((adapter.calls.at(-1)?.snapshot as TursoPlanningMilestoneProgressPatch).status, "completed");
    assert.equal("title" in (adapter.calls.at(-1)?.snapshot as Record<string, unknown>), false);
    assert.equal("expeditionId" in (adapter.calls.at(-1)?.snapshot as Record<string, unknown>), false);
    assert.match(adapter.calls.at(-1)?.mutationId ?? "", /^typed_hierarchy:vault_1:device_1:milestone:milestone_1:9:/);
  } finally {
    harness.close();
  }

  assertProgressViews();
}

function assertProgressViews() {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(getWaymarkTursoRemoteSchemaSql());
    db.prepare(
      `INSERT INTO paths (
        id, vault_id, user_id, name, slug, title, status, sort_order, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    ).run("path_1", "vault_1", "user_1", "Health", "health", "Health", "active", 1, 1, 1, 1);
    db.prepare(
      `INSERT INTO expeditions (
        id, vault_id, user_id, path_id, title, status, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    ).run("expedition_1", "vault_1", "user_1", "path_1", "Cut to 70", "active", 1, 1, 1);
    const insertMilestone = db.prepare(
      `INSERT INTO milestones (
        id, vault_id, user_id, expedition_id, title, status, sort_order, order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    );
    insertMilestone.run("milestone_1", "vault_1", "user_1", "expedition_1", "Reach 75kg", "active", 1, 1, 1, 1);
    insertMilestone.run("milestone_2", "vault_1", "user_1", "expedition_1", "Reach 73kg", "planned", 2, 2, 1, 1);

    const insertTrailDay = db.prepare(
      `INSERT INTO trail_days (
        id, vault_id, user_id, local_date, status, anchor_path_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    );
    insertTrailDay.run("trail_1", "vault_1", "user_1", "2026-08-01", "closed", "path_1", 1, 1);
    insertTrailDay.run("trail_2", "vault_1", "user_1", "2026-08-02", "closed", "path_1", 1, 1);
    insertTrailDay.run("trail_3", "vault_1", "user_1", "2026-08-03", "open", "path_1", 1, 1);

    const insertMark = db.prepare(
      `INSERT INTO mark_instances (
        id, vault_id, user_id, path_id, trail_day_id, expedition_id, milestone_id,
        title, origin, status, scheduled_start_at, completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    );
    insertMark.run(
      "mark_completed",
      "vault_1",
      "user_1",
      "path_1",
      "trail_1",
      "expedition_1",
      "milestone_1",
      "Historical check-in",
      "manual_plan",
      "completed",
      100,
      150,
      1,
      150,
    );
    insertMark.run(
      "mark_partial",
      "vault_1",
      "user_1",
      "path_1",
      "trail_2",
      "expedition_1",
      "milestone_1",
      "Partial check-in",
      "manual_plan",
      "partially_completed",
      200,
      null,
      1,
      200,
    );
    insertMark.run(
      "mark_week",
      "vault_1",
      "user_1",
      "path_1",
      "trail_3",
      "expedition_1",
      null,
      "Weekly planned check-in",
      "weekly_planned",
      "planned",
      300,
      null,
      1,
      300,
    );
    db.prepare(
      `INSERT INTO week_plans (
        id, vault_id, user_id, week_start_date, week_end_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    ).run("week_1", "vault_1", "user_1", "2026-08-03", "2026-08-09", "active", 1, 1);
    db.prepare(
      `INSERT INTO week_plan_items (
        id, vault_id, user_id, week_plan_id, status, local_date, start_time, end_time,
        title, path_id, expedition_id, created_mark_instance_id, sort_order, order_index,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    ).run(
      "week_item_1",
      "vault_1",
      "user_1",
      "week_1",
      "planned",
      "2026-08-06",
      "08:00",
      "08:30",
      "Weekly planned check-in",
      "path_1",
      "expedition_1",
      "mark_week",
      1,
      1,
      1,
      1,
    );

    const expedition = db.prepare("SELECT * FROM expedition_progress WHERE expedition_id = ?;").get("expedition_1") as any;
    assert.equal(expedition.milestone_count, 2);
    assert.equal(expedition.total_mark_count, 3);
    assert.equal(expedition.completed_mark_count, 1);
    assert.equal(expedition.open_mark_count, 1);
    assert.equal(expedition.progress_percent, 50);

    const milestone = db.prepare("SELECT * FROM milestone_progress WHERE milestone_id = ?;").get("milestone_1") as any;
    assert.equal(milestone.total_mark_count, 2);
    assert.equal(milestone.completed_mark_count, 1);
    assert.equal(milestone.partially_completed_mark_count, 1);
    assert.equal(milestone.progress_percent, 75);

    const hierarchyRows = db
      .prepare("SELECT * FROM expedition_milestone_marks WHERE expedition_id = ?;")
      .all("expedition_1");
    assert.equal(hierarchyRows.length, 4);

    const weeklyMark = db
      .prepare("SELECT * FROM expedition_planned_marks WHERE mark_instance_id = ?;")
      .get("mark_week") as any;
    assert.equal(weeklyMark.week_start_date, "2026-08-03");
    assert.equal(weeklyMark.planned_local_date, "2026-08-06");
  } finally {
    db.close();
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
