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
      assert.equal(report.expectedSchemaVersion, 23);
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
