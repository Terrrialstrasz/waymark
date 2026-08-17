import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createSQLiteRepositoryProvider } from "../src/db/adapters";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import { verifyWaymarkSchemaAsync } from "../src/db/schemaVerification";
import { MarkInstanceOrigin, MarkInstanceStatus } from "../src/domain/waymark";
import {
  enqueueSyncOutboxMutation,
  listPendingSyncOutboxRows,
  runLocalSsotMutation,
} from "../src/lib/waymark/ssotOutbox";
import { enqueueDirtyWaymarkRowsForEod, pushWaymarkFullDatabaseAtEod } from "../src/lib/waymark/tursoFullDatabaseSync";

type PendingSsotAcceptanceTest = {
  name: string;
  pendingReason: string;
};

export const ssotOutboxMvpAcceptanceTests: PendingSsotAcceptanceTest[] = [
  {
    name: "ssot_outbox_complete_planned_mark_retry_creates_one_completed_mark",
    pendingReason: "Phase 1 must add sync_outbox and idempotent completion before this test can execute.",
  },
  {
    name: "ssot_sync_same_outbox_twice_does_not_duplicate_remote_record",
    pendingReason: "Phase 1/2 must add sync_outbox and fake Turso adapter before this test can execute.",
  },
  {
    name: "ssot_delete_mark_writes_tombstone_without_remote_hard_delete",
    pendingReason: "Phase 1 must add tombstone outbox handling before this test can execute.",
  },
];

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
  const repos = createSQLiteRepositoryProvider(async () => adapter as any, async () => adapter as any, false);
  return { db: adapter, repos, close: () => database.close() };
}

export function assertSsotOutboxMvpSkeleton() {
  assert.deepEqual(
    ssotOutboxMvpAcceptanceTests.map((test) => test.name),
    [
      "ssot_outbox_complete_planned_mark_retry_creates_one_completed_mark",
      "ssot_sync_same_outbox_twice_does_not_duplicate_remote_record",
      "ssot_delete_mark_writes_tombstone_without_remote_hard_delete",
    ],
  );
}

async function runExecutablePhase1Tests() {
  assertSsotOutboxMvpSkeleton();

  {
    const harness = await createHarness();
    try {
      const report = await verifyWaymarkSchemaAsync(harness.db as any);
      assert.equal(report.ok, true);
      assert.equal(report.expectedSchemaVersion, 25);
      assert.equal(report.missingTables.includes("sync_outbox"), false);
      assert.equal(report.missingTables.includes("sync_tombstones"), false);
      assert.equal(report.missingTables.includes("mark_instance_details"), false);
    } finally {
      harness.close();
    }
  }

  {
    const harness = await createHarness();
    try {
      await harness.db.runAsync(
        "INSERT INTO vaults (id, name, created_at, updated_at, status) VALUES ('vault_eod', 'EOD', 1, 1, 'active');",
      );
      await harness.db.runAsync(
        "INSERT INTO devices (id, vault_id, client_type, application_id, created_at) VALUES ('device_eod', 'vault_eod', 'main', 'com.waymark.lifeos.dev', 1);",
      );
      await harness.db.runAsync(
        `INSERT INTO app_db_metadata (
           db_instance_id, vault_id, device_id, client_type, application_id,
           schema_version, map_version, seed_version, restore_state, created_at, last_migration_at
         ) VALUES ('db_eod', 'vault_eod', 'device_eod', 'main', 'com.waymark.lifeos.dev', 25, 0, 0, 'fresh_local', 1, 1);`,
      );
      const path = await harness.repos.paths.createPath({
        userId: "user_eod",
        slug: "eod",
        title: "EOD",
        sortOrder: 0,
      });
      const expedition = await harness.repos.expeditions.createExpedition({
        userId: "user_eod",
        pathId: path.id,
        title: "EOD expedition",
        status: "planned" as any,
        sortOrder: 0,
      });
      const milestone = await harness.repos.expeditions.createMilestone({
        userId: "user_eod",
        expeditionId: expedition.id,
        title: "EOD milestone",
        status: "planned" as any,
        sortOrder: 0,
        orderIndex: 0,
      });
      const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_eod", "2026-08-10");
      const mark = await harness.repos.marks.createMarkInstance({
        userId: "user_eod",
        pathId: path.id,
        trailDayId: trailDay.id,
        expeditionId: expedition.id,
        milestoneId: milestone.id,
        title: "EOD mark",
        origin: MarkInstanceOrigin.QuickCapture,
        status: MarkInstanceStatus.Planned,
      });
      await harness.repos.marks.updateMarkInstance(mark.id, { status: MarkInstanceStatus.Completed });
      await harness.repos.memories.createMemory({
        userId: "user_eod",
        trailDayId: trailDay.id,
        title: "EOD memory",
        capturedAt: "2026-08-10T10:00:00.000Z",
        privacy: "private" as any,
      });
      await harness.repos.backlog.upsert({
        id: "backlog_eod",
        userId: "user_eod",
        title: "EOD backlog",
        itemType: "task" as any,
        horizon: "near" as any,
        status: "open" as any,
        createdAt: "2026-08-10T10:00:00.000Z",
        updatedAt: "2026-08-10T10:00:00.000Z",
      });
      await harness.repos.trailDays.updateCloseState(trailDay.id, { status: "closed" as any });
      await harness.repos.expeditions.updateExpedition(expedition.id, { status: "active" as any });
      await harness.repos.expeditions.updateMilestone(milestone.id, { status: "active" as any });

      const missingSourceOutbox = await enqueueSyncOutboxMutation(harness.db as any, {
        vaultId: "vault_eod",
        deviceId: "device_eod",
        dbInstanceId: "db_eod",
        sourceApplicationId: "com.waymark.lifeos.dev",
        entityType: "memory",
        entityId: "memory_missing_source",
        operation: "create",
        localRevision: 0,
        payload: { id: "memory_missing_source", sync_status: "local", local_revision: 0 },
      });

      const reconciled = await enqueueDirtyWaymarkRowsForEod({
        executor: harness.db as any,
        vaultId: "vault_eod",
        deviceId: "device_eod",
        dbInstanceId: "db_eod",
        sourceApplicationId: "com.waymark.lifeos.dev",
      });

      const pending = await listPendingSyncOutboxRows(harness.db as any, {
        vaultId: "vault_eod",
        sourceApplicationId: "com.waymark.lifeos.dev",
        limit: 100,
      });
      assert.deepEqual(
        Array.from(new Set(pending.map((row) => row.entity_type))).sort(),
        ["backlog_item", "expedition", "mark_instance", "memory", "milestone", "trail_day"],
      );
      assert.equal(pending.every((row) => row.source_application_id === "com.waymark.lifeos.dev"), true);
      assert.equal(pending.some((row) => row.entity_type === "mark_instance" && row.operation === "create"), true);
      assert.equal(pending.some((row) => row.entity_type === "mark_instance" && row.operation === "update"), false);
      assert.equal(pending.some((row) => row.entity_type === "trail_day" && row.operation === "create"), true);
      assert.equal(pending.some((row) => row.entity_type === "expedition" && row.operation === "create"), false);
      assert.equal(
        pending.every((row, index) => pending.findIndex((candidate) => candidate.entity_type === row.entity_type && candidate.entity_id === row.entity_id) === index),
        true,
        "EOD preflight must leave at most one current mutation per entity.",
      );
      assert.equal(reconciled.superseded > 0, true);
      assert.equal(
        (await harness.db.getFirstAsync<{ status: string }>("SELECT status FROM sync_outbox WHERE id = ?;", missingSourceOutbox.id))?.status,
        "superseded",
      );
      const expectedMarkRevision = await harness.db.getFirstAsync<{ local_revision: number }>(
        "SELECT local_revision FROM mark_instances WHERE id = ?;",
        mark.id,
      );

      const pushedApplicationIds: Array<string | null | undefined> = [];
      const diagnostics: Array<{ event: string; context: Record<string, unknown> }> = [];
      const pushed = await pushWaymarkFullDatabaseAtEod({
        executor: harness.db as any,
        vaultId: "vault_eod",
        sourceApplicationId: "com.waymark.lifeos.dev",
        adapter: {
          async pushOutboxRowAtEod(row) {
            pushedApplicationIds.push(row.source_application_id);
            return {
              remoteRevision: row.local_revision,
              entityType: row.entity_type,
              entityId: row.entity_id,
              idempotencyKey: row.idempotency_key,
              duplicate: false,
            };
          },
        },
        diagnosticLog: (event, context) => diagnostics.push({ event, context }),
      });
      assert.equal(pushed.attempted, pending.length);
      assert.equal(pushed.uploaded, pending.length);
      assert.equal(pushed.failed.length, 0);
      assert.equal(diagnostics[0]?.event, "batch_start");
      assert.equal(diagnostics.filter((entry) => entry.event === "mutation_start").length, pending.length);
      assert.equal(diagnostics.filter((entry) => entry.event === "mutation_success").length, pending.length);
      assert.equal(diagnostics.at(-1)?.event, "batch_complete");
      assert.equal(diagnostics.at(-1)?.context.uploaded, pending.length);
      assert.equal(pushedApplicationIds.every((applicationId) => applicationId === "com.waymark.lifeos.dev"), true);
      assert.equal(
        (await listPendingSyncOutboxRows(harness.db as any, {
          vaultId: "vault_eod",
          sourceApplicationId: "com.waymark.lifeos.dev",
          limit: 100,
        })).length,
        0,
      );
      const syncedMark = await harness.db.getFirstAsync<{ sync_status: string }>(
        "SELECT sync_status FROM mark_instances WHERE id = ?;",
        mark.id,
      );
      assert.equal(syncedMark?.sync_status, "synced");
      const acknowledged = await harness.db.getFirstAsync<{ remote_revision: number | null }>(
        "SELECT remote_revision FROM sync_outbox WHERE entity_type = 'mark_instance' AND entity_id = ? AND status = 'synced' ORDER BY synced_at DESC LIMIT 1;",
        mark.id,
      );
      assert.equal(acknowledged?.remote_revision, expectedMarkRevision?.local_revision);
    } finally {
      harness.close();
    }
  }

  {
    const harness = await createHarness();
    try {
      for (const entityId of ["memory_dns_1", "memory_dns_2"]) {
        await enqueueSyncOutboxMutation(harness.db as any, {
          vaultId: "vault_dns",
          deviceId: "device_dns",
          dbInstanceId: "db_dns",
          sourceApplicationId: "com.waymark.lifeos",
          entityType: "memory",
          entityId,
          operation: "create",
          localRevision: 0,
          payload: { id: entityId },
        });
      }
      const diagnostics: Array<{ event: string; context: Record<string, unknown> }> = [];
      const pushed = await pushWaymarkFullDatabaseAtEod({
        executor: harness.db as any,
        vaultId: "vault_dns",
        sourceApplicationId: "com.waymark.lifeos",
        adapter: {
          async pushOutboxRowAtEod() {
            throw new Error('fetch failed: java.net.UnknownHostException: Unable to resolve host "example.turso.io"');
          },
        },
        now: () => 100,
        diagnosticLog: (event, context) => diagnostics.push({ event, context }),
      });
      const rows = await harness.db.getAllAsync<{ status: string; error_kind: string | null }>(
        "SELECT status, error_kind FROM sync_outbox ORDER BY created_at ASC, entity_id ASC;",
      );
      assert.equal(pushed.attempted, 1);
      assert.equal(pushed.stoppedAfterTransientFailure, true);
      const failureDiagnostic = diagnostics.find((entry) => entry.event === "mutation_failure");
      assert.equal(failureDiagnostic?.context.errorKind, "transient_network");
      assert.equal(failureDiagnostic?.context.resultingStatus, "retry_wait");
      assert.equal(failureDiagnostic?.context.stoppedBatch, true);
      assert.equal(failureDiagnostic?.context.entityId, "memory_dns_1");
      assert.equal(diagnostics.at(-1)?.event, "batch_complete");
      assert.deepEqual(rows.map((row) => ({ ...row })), [
        { status: "retry_wait", error_kind: "transient_network" },
        { status: "pending", error_kind: null },
      ]);
    } finally {
      harness.close();
    }
  }

  {
    const harness = await createHarness();
    try {
      const row = await enqueueSyncOutboxMutation(harness.db as any, {
        vaultId: "vault_constraint",
        deviceId: "device_constraint",
        dbInstanceId: "db_constraint",
        sourceApplicationId: "com.waymark.lifeos",
        entityType: "mark_instance",
        entityId: "mark_conflict",
        operation: "create",
        localRevision: 0,
        payload: { id: "mark_conflict" },
      });
      const pushed = await pushWaymarkFullDatabaseAtEod({
        executor: harness.db as any,
        vaultId: "vault_constraint",
        sourceApplicationId: "com.waymark.lifeos",
        adapter: {
          async pushOutboxRowAtEod() {
            throw new Error("SQLite error: UNIQUE constraint failed: mark_instances.vault_id, mark_instances.user_id, mark_instances.generation_key");
          },
        },
      });
      const quarantined = await harness.db.getFirstAsync<{ status: string; error_kind: string | null }>(
        "SELECT status, error_kind FROM sync_outbox WHERE id = ?;",
        row.id,
      );
      assert.equal(pushed.rejected, 1);
      assert.deepEqual({ ...quarantined }, { status: "quarantined", error_kind: "business_identity_conflict" });
    } finally {
      harness.close();
    }
  }

  {
    const harness = await createHarness();
    try {
      const input = {
        vaultId: "vault_1",
        deviceId: "device_1",
        dbInstanceId: "db_1",
        entityType: "mark_instance" as const,
        entityId: "mark_1",
        operation: "update" as const,
        localRevision: 1,
        payload: { id: "mark_1", status: "completed" },
        idempotencyKey: "vault_1:device_1:mark_instance:mark_1:update:1",
      };
      const first = await enqueueSyncOutboxMutation(harness.db as any, input);
      const second = await enqueueSyncOutboxMutation(harness.db as any, input);
      const pending = await listPendingSyncOutboxRows(harness.db as any, { vaultId: "vault_1" });

      assert.equal(first.id, second.id);
      assert.equal(pending.length, 1);
      assert.equal(pending[0]?.idempotency_key, input.idempotencyKey);
    } finally {
      harness.close();
    }
  }

  {
    const harness = await createHarness();
    try {
      const weekly = await enqueueSyncOutboxMutation(harness.db as any, {
        vaultId: "vault_1",
        deviceId: "device_1",
        dbInstanceId: "db_1",
        entityType: "week_plan_item",
        entityId: "week_plan_item_1",
        operation: "update",
        localRevision: 1,
        payload: { id: "week_plan_item_1", title: "Remote editable weekly item" },
      });
      const signal = await enqueueSyncOutboxMutation(harness.db as any, {
        vaultId: "vault_1",
        deviceId: "device_1",
        dbInstanceId: "db_1",
        entityType: "signal",
        entityId: "signal_1",
        operation: "update",
        localRevision: 1,
        payload: { id: "signal_1", status: "scheduled" },
      });

      assert.equal(weekly.entity_type, "week_plan_item");
      assert.equal(signal.entity_type, "signal");
    } finally {
      harness.close();
    }
  }

  {
    const harness = await createHarness();
    try {
      const path = await harness.repos.paths.createPath({
        userId: "user_1",
        slug: "career",
        title: "Career",
        sortOrder: 0,
      });
      const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-07-10");
      const mark = await harness.repos.marks.createMarkInstance({
        userId: "user_1",
        pathId: path.id,
        trailDayId: trailDay.id,
        title: "Delete me",
        origin: MarkInstanceOrigin.ManualPlan,
        status: MarkInstanceStatus.Planned,
      });

      const mutation = await runLocalSsotMutation(
        harness.db as any,
        {
          vaultId: "vault_1",
          deviceId: "device_1",
          dbInstanceId: "db_1",
          entityType: "mark_instance",
          entityId: mark.id,
          operation: "delete",
          localRevision: 1,
          tombstoneReason: "user_deleted",
          payload: { id: mark.id, deletedAt: "2026-07-10T12:00:00.000Z" },
        },
        async (txn) => {
          await txn.runAsync(
            "UPDATE mark_instances SET deleted_at = ?, updated_at = ?, sync_status = 'dirty', local_revision = 1 WHERE id = ?;",
            Date.UTC(2026, 6, 10, 12, 0, 0),
            Date.UTC(2026, 6, 10, 12, 0, 0),
            mark.id,
          );
          return mark.id;
        },
      );
      const tombstone = await harness.db.getFirstAsync<{ entity_id: string; reason: string | null }>(
        "SELECT entity_id, reason FROM sync_tombstones WHERE entity_type = 'mark_instance' AND entity_id = ?;",
        mark.id,
      );

      assert.equal(mutation.result, mark.id);
      assert.equal(mutation.outbox.operation, "delete");
      assert.equal(tombstone?.entity_id, mark.id);
      assert.equal(tombstone?.reason, "user_deleted");
    } finally {
      harness.close();
    }
  }

  {
    const harness = await createHarness();
    try {
      const path = await harness.repos.paths.createPath({
        userId: "user_1",
        slug: "rollback",
        title: "Rollback",
        sortOrder: 0,
      });
      const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-07-11");
      const mark = await harness.repos.marks.createMarkInstance({
        userId: "user_1",
        pathId: path.id,
        trailDayId: trailDay.id,
        title: "Rollback mark",
        origin: MarkInstanceOrigin.ManualPlan,
        status: MarkInstanceStatus.Planned,
      });

      await assert.rejects(
        () =>
          runLocalSsotMutation(
            harness.db as any,
            {
              vaultId: "vault_1",
              deviceId: "device_1",
              dbInstanceId: "db_1",
              entityType: "mark_instance",
              entityId: mark.id,
              operation: "invalid" as any,
              localRevision: 1,
              payload: { id: mark.id },
            },
            async (txn) => {
              await txn.runAsync("UPDATE mark_instances SET title = ? WHERE id = ?;", "Should rollback", mark.id);
              return mark.id;
            },
          ),
        /CHECK constraint failed|constraint/i,
      );

      const row = await harness.db.getFirstAsync<{ title: string }>("SELECT title FROM mark_instances WHERE id = ?;", mark.id);
      const outboxCount = await harness.db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sync_outbox;");

      assert.equal(row?.title, "Rollback mark");
      assert.equal(outboxCount?.count, 0);
    } finally {
      harness.close();
    }
  }
}

void runExecutablePhase1Tests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
