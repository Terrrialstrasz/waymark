import type { SQLiteQueryable, SQLiteTransactionalDatabase } from "../../db/adapters/SQLiteRepositoryBase";
import { runExclusiveSqliteWrite } from "../../db/adapters/SQLiteRepositoryBase";
import {
  WAYMARK_TURSO_FULL_DB_SNAPSHOT_TABLES,
  type WaymarkFullDbChange,
  type WaymarkFullDbSnapshotRow,
  type WaymarkTursoFullDatabaseRemoteAdapter,
} from "./tursoFullDatabaseRemote";
import {
  WAYMARK_TURSO_FULL_DB_TABLES,
  getWaymarkFullDbTableSpec,
  isWaymarkFullDbLocalOnlyColumn,
  type WaymarkFullDbBusinessIdentity,
} from "./tursoFullDatabaseContract";
import {
  listPendingSyncOutboxRows,
  buildSyncOutboxIdempotencyKey,
  enqueueSyncOutboxMutation,
  markSyncOutboxRowFailed,
  markSyncOutboxRowQuarantined,
  markSyncOutboxRowRetryWait,
  markSyncOutboxRowSynced,
  markSyncOutboxRowSyncing,
  supersedeSyncOutboxRow,
  supersedeSyncOutboxRows,
  type SyncOutboxRow,
} from "./ssotOutbox";
import { getWaymarkFullDbEntitySpec } from "./tursoFullDatabaseContract";
import { isTransientTursoUploadError } from "./tursoSyncService";

export type FullDbPullAdapter = Pick<
  WaymarkTursoFullDatabaseRemoteAdapter,
  "getSchemaState" | "getChangeCeiling" | "listSnapshotRows" | "listChanges"
>;

export type WaymarkFullDbPullInput = {
  database: SQLiteTransactionalDatabase;
  adapter: FullDbPullAdapter;
  vaultId: string;
  deviceId: string;
  pageSize?: number;
  now?: number;
};

export type WaymarkFullDbPullResult = {
  mode: "snapshot" | "incremental";
  fromGlobalRevision: number;
  throughGlobalRevision: number;
  fetched: number;
  applied: number;
  skipped: number;
  byTable: Record<string, number>;
};

type LocalColumn = {
  name: string;
  primaryKeyPosition: number;
  notNull: boolean;
  defaultValue: unknown;
};

type ForeignKeyReference = {
  childTable: string;
  childColumn: string;
  parentColumn: string;
};

type SnapshotApplyContext = {
  localSchemaCache: Map<string, LocalColumn[]>;
  foreignKeyReferenceCache: Map<string, ForeignKeyReference[]>;
  mode: "snapshot" | "incremental";
};

const TURSO_CANONICAL_WORKSPACE_TABLES = [
  "mark_templates",
  "pack_check_templates",
  "pack_check_item_templates",
  "mark_pack_check_rules",
  "exercise_definitions",
  "workout_routine_templates",
  "routine_exercise_templates",
  "week_plans",
  "week_plan_items",
] as const;

export async function enforceTursoCanonicalWorkspaceCache(input: {
  database: SQLiteTransactionalDatabase;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const localSchemaCache = new Map<string, LocalColumn[]>();
  await runExclusiveSqliteWrite(() =>
    input.database.withExclusiveTransactionAsync(async (transaction) => {
      for (const tableName of [...TURSO_CANONICAL_WORKSPACE_TABLES].reverse()) {
        const columns = await readLocalColumns(transaction, tableName, localSchemaCache);
        const available = new Set(columns.map((column) => column.name));
        if (!available.has("sync_status") || !available.has("deleted_at")) continue;
        const assignments = ["deleted_at = COALESCE(deleted_at, ?)"];
        if (available.has("is_active")) assignments.push("is_active = 0");
        await transaction.runAsync(
          `UPDATE ${quoteIdentifier(tableName)}
           SET ${assignments.join(", ")}
           WHERE sync_status <> 'synced';`,
          now,
        );
      }
    }),
  );
}

export type WaymarkFullDbEodPushResult = {
  attempted: number;
  uploaded: number;
  duplicates: number;
  rejected: number;
  failed: Array<{ outboxId: string; message: string }>;
  stoppedAfterTransientFailure: boolean;
};

export type WaymarkFullDbEodDiagnosticLogger = (
  event: string,
  context: Record<string, unknown>,
) => void;

export type WaymarkFullDbEodReconcileResult = {
  scanned: number;
  pending: number;
  superseded: number;
  repaired: number;
  byEntityType: Record<string, number>;
};

export async function enqueueDirtyWaymarkRowsForEod(input: {
  executor: SQLiteTransactionalDatabase;
  vaultId: string;
  deviceId: string;
  dbInstanceId: string;
  sourceApplicationId: string;
  limitPerTable?: number;
}): Promise<WaymarkFullDbEodReconcileResult> {
  const result: WaymarkFullDbEodReconcileResult = { scanned: 0, pending: 0, superseded: 0, repaired: 0, byEntityType: {} };
  const specs = WAYMARK_TURSO_FULL_DB_TABLES.filter(
    (spec) => spec.writer === "waymark_eod" || spec.writer === "workspace_and_waymark_eod",
  );
  await runExclusiveSqliteWrite(() =>
    input.executor.withExclusiveTransactionAsync(async (transaction) => {
      for (const spec of specs) {
        const openRows = await transaction.getAllAsync<SyncOutboxRow>(
          `SELECT * FROM sync_outbox
           WHERE vault_id = ? AND source_application_id = ? AND entity_type = ?
             AND status IN ('pending', 'failed', 'retry_wait')
           ORDER BY created_at ASC;`,
          input.vaultId,
          input.sourceApplicationId,
          spec.entityType,
        );
        const hadOpenCreate = new Set(openRows.filter((row) => row.operation === "create").map((row) => row.entity_id));

        for (const outbox of openRows) {
          const source = await transaction.getFirstAsync<Record<string, unknown>>(
            `SELECT id, sync_status, local_revision, deleted_at FROM ${quoteIdentifier(spec.tableName)} WHERE id = ? LIMIT 1;`,
            outbox.entity_id,
          );
          let reason: string | null = null;
          if (!source) reason = "Superseded before EOD push: local source entity no longer exists.";
          else if (source.sync_status === "synced" || source.sync_status === "conflict") {
            reason = `Superseded before EOD push: local source status is ${String(source.sync_status)}.`;
          } else if (Number(source.local_revision ?? 0) !== Number(outbox.local_revision)) {
            reason = `Superseded before EOD push: local revision advanced to ${String(source.local_revision ?? 0)}.`;
          }
          if (reason && await supersedeSyncOutboxRow(transaction, { id: outbox.id, reason })) result.superseded += 1;
        }

        const rows = await transaction.getAllAsync<Record<string, unknown>>(
          `SELECT * FROM ${quoteIdentifier(spec.tableName)}
           WHERE sync_status IN ('local', 'dirty')
           ORDER BY updated_at ASC
           LIMIT ?;`,
          input.limitPerTable ?? 5000,
        );
        for (const row of rows) {
          const entityId = String(row.id ?? "");
          if (!entityId) continue;
          const deleted = row.deleted_at != null;
          if (deleted && !spec.mobileDeleteAllowed) continue;
          const localRevision = Number(row.local_revision ?? 0);
          const operation = deleted
            ? "delete" as const
            : spec.mobileCreateAllowed && (row.sync_status === "local" || hadOpenCreate.has(entityId))
              ? "create" as const
              : "update" as const;
          const desiredKey = buildSyncOutboxIdempotencyKey({
            vaultId: input.vaultId,
            deviceId: input.deviceId,
            dbInstanceId: input.dbInstanceId,
            sourceApplicationId: input.sourceApplicationId,
            entityType: spec.entityType,
            entityId,
            operation,
            localRevision,
          });
          result.superseded += await supersedeSyncOutboxRows(transaction, {
            vaultId: input.vaultId,
            sourceApplicationId: input.sourceApplicationId,
            entityType: spec.entityType,
            entityId,
            exceptIdempotencyKey: desiredKey,
            reason: `Superseded by compacted EOD revision ${localRevision}.`,
          });
          const outbox = await enqueueSyncOutboxMutation(transaction, {
            vaultId: input.vaultId,
            deviceId: input.deviceId,
            dbInstanceId: input.dbInstanceId,
            sourceApplicationId: input.sourceApplicationId,
            entityType: spec.entityType,
            entityId,
            operation,
            localRevision,
            payload: row,
            now: Number(row.updated_at ?? Date.now()),
          });
          result.scanned += 1;
          result.byEntityType[spec.entityType] = (result.byEntityType[spec.entityType] ?? 0) + 1;
          if (outbox.status === "synced") {
            const repaired = await transaction.runAsync(
              `UPDATE ${quoteIdentifier(spec.tableName)}
               SET sync_status = 'synced'
               WHERE id = ? AND local_revision = ? AND sync_status IN ('local', 'dirty');`,
              entityId,
              localRevision,
            );
            result.repaired += Number(repaired.changes ?? 0);
          } else if (outbox.status === "pending" || outbox.status === "failed" || outbox.status === "retry_wait") {
            result.pending += 1;
          }
        }
      }
    }),
  );
  return result;
}

export async function recoverStaleWaymarkEodRows(input: {
  executor: SQLiteQueryable;
  vaultId: string;
  sourceApplicationId: string;
  staleBefore: number;
}): Promise<number> {
  const updated = await input.executor.runAsync(
    `UPDATE sync_outbox
     SET status = 'failed',
          retry_count = retry_count + 1,
          last_error = 'Recovered stale EOD upload lease.',
          error_kind = 'stale_lease',
          next_attempt_at = NULL,
          updated_at = ?
     WHERE vault_id = ?
       AND source_application_id = ?
       AND status = 'syncing'
       AND updated_at < ?;`,
    Date.now(),
    input.vaultId,
    input.sourceApplicationId,
    input.staleBefore,
  );
  return Number(updated.changes ?? 0);
}

export async function pushWaymarkFullDatabaseAtEod(input: {
  executor: SQLiteTransactionalDatabase;
  adapter: Pick<WaymarkTursoFullDatabaseRemoteAdapter, "pushOutboxRowAtEod">;
  vaultId: string;
  sourceApplicationId?: string;
  limit?: number;
  now?: () => number;
  retryDelayMs?: number;
  diagnosticLog?: WaymarkFullDbEodDiagnosticLogger;
}): Promise<WaymarkFullDbEodPushResult> {
  const now = input.now ?? Date.now;
  const startedAt = now();
  const rows = await listPendingSyncOutboxRows(input.executor, {
    vaultId: input.vaultId,
    sourceApplicationId: input.sourceApplicationId,
    limit: input.limit ?? 500,
    now: now(),
  });
  const result: WaymarkFullDbEodPushResult = {
    attempted: 0,
    uploaded: 0,
    duplicates: 0,
    rejected: 0,
    failed: [],
    stoppedAfterTransientFailure: false,
  };
  emitEodDiagnostic(input.diagnosticLog, "batch_start", {
    selected: rows.length,
    limit: input.limit ?? 500,
    sourceApplicationId: input.sourceApplicationId ?? null,
    byEntityType: countOutboxRowsBy(rows, (row) => row.entity_type),
    byOperation: countOutboxRowsBy(rows, (row) => row.operation),
  });
  for (const row of rows) {
    const spec = getWaymarkFullDbEntitySpec(row.entity_type);
    if (!spec || (spec.writer !== "waymark_eod" && spec.writer !== "workspace_and_waymark_eod")) {
      const message = `Writer policy rejects Waymark EOD for ${row.entity_type}.`;
      await rejectOutboxRow(input.executor, row, message, now());
      result.rejected += 1;
      emitEodDiagnostic(input.diagnosticLog, "mutation_rejected", {
        ...describeOutboxRow(row),
        errorKind: "writer_policy",
        message,
        resultingStatus: "conflict",
      });
      continue;
    }
    const syncing = await markSyncOutboxRowSyncing(input.executor, { id: row.id, now: now() });
    if (!syncing || syncing.status !== "syncing") {
      emitEodDiagnostic(input.diagnosticLog, "mutation_lease_skipped", {
        ...describeOutboxRow(row),
        resultingStatus: syncing?.status ?? "missing",
      });
      continue;
    }
    result.attempted += 1;
    const mutationStartedAt = now();
    emitEodDiagnostic(input.diagnosticLog, "mutation_start", {
      ...describeOutboxRow(syncing),
      queuePosition: result.attempted,
      payloadFields: listPayloadFields(syncing.payload_json),
    });
    try {
      const pushed = await input.adapter.pushOutboxRowAtEod(syncing);
      await acknowledgeWaymarkEodPush(input.executor, spec.tableName, syncing, pushed.remoteRevision, now());
      result.uploaded += 1;
      if (pushed.duplicate) result.duplicates += 1;
      emitEodDiagnostic(input.diagnosticLog, "mutation_success", {
        ...describeOutboxRow(syncing),
        durationMs: Math.max(0, now() - mutationStartedAt),
        remoteRevision: pushed.remoteRevision,
        duplicate: pushed.duplicate,
        resultingStatus: "synced",
      });
    } catch (error) {
      const failureNow = now();
      const errorKind = classifyFullDbPushError(error);
      const transient = isTransientTursoUploadError(error);
      let resultingStatus: "retry_wait" | "quarantined" | "failed";
      let nextAttemptAt: number | null = null;
      if (transient) {
        nextAttemptAt = failureNow + Math.max(5_000, input.retryDelayMs ?? 30_000);
        await markSyncOutboxRowRetryWait(input.executor, {
          id: syncing.id,
          error,
          errorKind,
          nextAttemptAt,
          now: failureNow,
        });
        resultingStatus = "retry_wait";
        result.failed.push({ outboxId: syncing.id, message: formatError(error) });
        result.stoppedAfterTransientFailure = true;
        emitEodDiagnostic(input.diagnosticLog, "mutation_failure", {
          ...describeOutboxRow(syncing),
          durationMs: Math.max(0, failureNow - mutationStartedAt),
          errorKind,
          transient,
          ...describeDiagnosticError(error),
          resultingStatus,
          nextAttemptAt,
          stoppedBatch: true,
        });
        break;
      }
      if (errorKind === "business_identity_conflict" || errorKind === "missing_required_field") {
        await markSyncOutboxRowQuarantined(input.executor, { id: syncing.id, error, errorKind, now: failureNow });
        result.rejected += 1;
        resultingStatus = "quarantined";
      } else {
        await markSyncOutboxRowFailed(input.executor, { id: syncing.id, error, now: failureNow });
        resultingStatus = "failed";
      }
      result.failed.push({ outboxId: syncing.id, message: formatError(error) });
      emitEodDiagnostic(input.diagnosticLog, "mutation_failure", {
        ...describeOutboxRow(syncing),
        durationMs: Math.max(0, failureNow - mutationStartedAt),
        errorKind,
        transient,
        ...describeDiagnosticError(error),
        resultingStatus,
        nextAttemptAt,
        stoppedBatch: false,
      });
    }
  }
  emitEodDiagnostic(input.diagnosticLog, "batch_complete", {
    durationMs: Math.max(0, now() - startedAt),
    selected: rows.length,
    attempted: result.attempted,
    uploaded: result.uploaded,
    duplicates: result.duplicates,
    rejected: result.rejected,
    failed: result.failed.length,
    stoppedAfterTransientFailure: result.stoppedAfterTransientFailure,
  });
  return result;
}

async function acknowledgeWaymarkEodPush(
  database: SQLiteTransactionalDatabase,
  tableName: string,
  row: SyncOutboxRow,
  remoteRevision: number,
  now: number,
) {
  await runExclusiveSqliteWrite(() =>
    database.withExclusiveTransactionAsync(async (transaction) => {
      await markSyncOutboxRowSynced(transaction, { id: row.id, remoteRevision, now });
      await transaction.runAsync(
        `UPDATE ${quoteIdentifier(tableName)}
         SET sync_status = 'synced'
         WHERE id = ? AND local_revision = ? AND sync_status IN ('local', 'dirty');`,
        row.entity_id,
        row.local_revision,
      );
    }),
  );
}

export async function pullWaymarkFullDatabaseSnapshot(input: WaymarkFullDbPullInput): Promise<WaymarkFullDbPullResult> {
  await assertFullDbActive(input.adapter);
  const pageSize = Math.max(1, input.pageSize ?? 500);
  const throughGlobalRevision = await input.adapter.getChangeCeiling(input.vaultId);
  const rows: WaymarkFullDbSnapshotRow[] = [];
  const byTable: Record<string, number> = {};

  for (const tableName of WAYMARK_TURSO_FULL_DB_SNAPSHOT_TABLES) {
    let offset = 0;
    while (true) {
      const page = await input.adapter.listSnapshotRows({
        vaultId: input.vaultId,
        deviceId: input.deviceId,
        tableName,
        offset,
        limit: pageSize,
      });
      const wrongTable = page.find((row) => row.tableName !== tableName);
      if (wrongTable) {
        throw new Error(`Full-DB snapshot contract violation: requested ${tableName} but received ${wrongTable.tableName}.`);
      }
      rows.push(...page);
      byTable[tableName] = (byTable[tableName] ?? 0) + page.length;
      if (page.length < pageSize) break;
      offset += page.length;
    }
  }

  validateRemoteSnapshotBusinessIdentities(rows);

  let applied = 0;
  let skipped = 0;
  const context: SnapshotApplyContext = {
    localSchemaCache: new Map<string, LocalColumn[]>(),
    foreignKeyReferenceCache: new Map<string, ForeignKeyReference[]>(),
    mode: "snapshot",
  };
  await runExclusiveSqliteWrite(() =>
    input.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync("PRAGMA defer_foreign_keys = ON;");
      await validateLocalUniqueIdentityCoverage(transaction, context.localSchemaCache);
      for (const row of rows) {
        const status = await applySnapshotRow(transaction, row, context);
        if (status === "applied") applied += 1;
        else skipped += 1;
      }
      await tombstoneLocalWorkspaceRowsMissingFromTurso(
        transaction,
        rows,
        context.localSchemaCache,
        input.now ?? Date.now(),
      );
      await updateLocalCursor(transaction, input, throughGlobalRevision, "protected");
    }),
  );

  return {
    mode: "snapshot",
    fromGlobalRevision: 0,
    throughGlobalRevision,
    fetched: rows.length,
    applied,
    skipped,
    byTable,
  };
}

async function tombstoneLocalWorkspaceRowsMissingFromTurso(
  executor: SQLiteQueryable,
  rows: readonly WaymarkFullDbSnapshotRow[],
  localSchemaCache: Map<string, LocalColumn[]>,
  now: number,
) {
  await executor.runAsync(
    `CREATE TEMP TABLE IF NOT EXISTS waymark_remote_canonical_ids (
       table_name TEXT NOT NULL,
       entity_id TEXT NOT NULL,
       PRIMARY KEY (table_name, entity_id)
     );`,
  );
  await executor.runAsync("DELETE FROM waymark_remote_canonical_ids;");

  for (const row of rows) {
    if (!TURSO_CANONICAL_WORKSPACE_TABLES.includes(row.tableName as typeof TURSO_CANONICAL_WORKSPACE_TABLES[number])) {
      continue;
    }
    if (row.values.id == null) continue;
    await executor.runAsync(
      "INSERT OR IGNORE INTO waymark_remote_canonical_ids (table_name, entity_id) VALUES (?, ?);",
      row.tableName,
      String(row.values.id),
    );
  }

  for (const tableName of [...TURSO_CANONICAL_WORKSPACE_TABLES].reverse()) {
    const columns = await readLocalColumns(executor, tableName, localSchemaCache);
    const available = new Set(columns.map((column) => column.name));
    if (!available.has("id") || !available.has("deleted_at")) continue;
    const assignments = ["deleted_at = ?"];
    if (available.has("is_active")) assignments.push("is_active = 0");
    await executor.runAsync(
      `UPDATE ${quoteIdentifier(tableName)}
       SET ${assignments.join(", ")}
       WHERE deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1
           FROM waymark_remote_canonical_ids remote
           WHERE remote.table_name = ? AND remote.entity_id = ${quoteIdentifier(tableName)}.id
         );`,
      now,
      tableName,
    );
  }

  await executor.runAsync("DROP TABLE waymark_remote_canonical_ids;");
}

export async function pullWaymarkFullDatabaseChanges(input: WaymarkFullDbPullInput): Promise<WaymarkFullDbPullResult> {
  await assertFullDbActive(input.adapter);
  const cursor = await input.database.getFirstAsync<{ last_cloud_revision: number }>(
    "SELECT last_cloud_revision FROM sync_state WHERE vault_id = ? AND device_id = ? LIMIT 1;",
    input.vaultId,
    input.deviceId,
  );
  const fromGlobalRevision = Number(cursor?.last_cloud_revision ?? 0);
  const throughGlobalRevision = await input.adapter.getChangeCeiling(input.vaultId);
  const pageSize = Math.max(1, input.pageSize ?? 500);
  const byTable: Record<string, number> = {};
  let after = fromGlobalRevision;
  let fetched = 0;
  let applied = 0;
  let skipped = 0;
  const context: SnapshotApplyContext = {
    localSchemaCache: new Map<string, LocalColumn[]>(),
    foreignKeyReferenceCache: new Map<string, ForeignKeyReference[]>(),
    mode: "incremental",
  };

  while (after < throughGlobalRevision) {
    const changes = await input.adapter.listChanges({
      vaultId: input.vaultId,
      afterGlobalRevision: after,
      throughGlobalRevision,
      limit: pageSize,
    });
    if (changes.length === 0) break;
    await runExclusiveSqliteWrite(() =>
      input.database.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.runAsync("PRAGMA defer_foreign_keys = ON;");
        for (const change of changes) {
          fetched += 1;
          byTable[change.tableName] = (byTable[change.tableName] ?? 0) + 1;
          const spec = getWaymarkFullDbTableSpec(change.tableName);
          if (!spec || (spec.scope === "device" && change.deviceId !== input.deviceId)) {
            skipped += 1;
            continue;
          }
          const status = await applyChange(transaction, change, context);
          if (status === "applied") applied += 1;
          else skipped += 1;
        }
        after = changes[changes.length - 1].globalRevision;
        await updateLocalCursor(transaction, input, after, "protected");
      }),
    );
  }

  return { mode: "incremental", fromGlobalRevision, throughGlobalRevision: after, fetched, applied, skipped, byTable };
}

async function applySnapshotRow(
  executor: SQLiteQueryable,
  row: WaymarkFullDbSnapshotRow,
  context: SnapshotApplyContext,
) {
  const columns = await readLocalColumns(executor, row.tableName, context.localSchemaCache);
  if (columns.length === 0) return "skipped" as const;
  const available = new Set(columns.map((column) => column.name));
  const primaryKey = columns
    .filter((column) => column.primaryKeyPosition > 0)
    .sort((left, right) => left.primaryKeyPosition - right.primaryKeyPosition)
    .map((column) => column.name);
  const values = normalizeInboundValues(row, columns, available, primaryKey);
  if (primaryKey.length === 0 || primaryKey.some((name) => values[name] == null)) return "skipped" as const;
  if (primaryKey.length === 1 && primaryKey[0] === "id" && available.has("sync_status")) {
    const existing = await executor.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM ${quoteIdentifier(row.tableName)} WHERE id = ? LIMIT 1;`,
      toLocalSqlValue(values.id),
    );
    const spec = getWaymarkFullDbTableSpec(row.tableName);
    if (existing && (existing.sync_status === "local" || existing.sync_status === "dirty") && spec) {
      if (spec.mobileMutationFields && spec.mobileMutationFields.length > 0) {
        for (const field of spec.mobileMutationFields) {
          if (available.has(field) && Object.prototype.hasOwnProperty.call(existing, field)) {
            values[field] = existing[field];
          }
        }
        values.sync_status = existing.sync_status;
        if (available.has("local_revision")) values.local_revision = existing.local_revision;
        if (available.has("updated_at") && Object.prototype.hasOwnProperty.call(existing, "updated_at")) {
          values.updated_at = existing.updated_at;
        }
      } else {
        await supersedeSyncOutboxRows(executor, {
          entityType: spec.entityType,
          entityId: String(values.id),
          reason: `Superseded by authoritative Turso ${context.mode} pull for the same canonical ID.`,
        });
      }
    }
  }
  await reconcileBusinessIdentity(executor, row.tableName, values, primaryKey, context);
  const names = Object.keys(values);
  const mutable = names.filter((name) => !primaryKey.includes(name));
  const conflictSql = mutable.length > 0
    ? `DO UPDATE SET ${mutable.map((name) => `${quoteIdentifier(name)} = excluded.${quoteIdentifier(name)}`).join(", ")}`
    : "DO NOTHING";
  try {
    await executor.runAsync(
      `INSERT INTO ${quoteIdentifier(row.tableName)} (${names.map(quoteIdentifier).join(", ")})
       VALUES (${names.map(() => "?").join(", ")})
       ON CONFLICT (${primaryKey.map(quoteIdentifier).join(", ")}) ${conflictSql};`,
      ...names.map((name) => toLocalSqlValue(values[name])),
    );
  } catch (error) {
    throw new Error(
      `Full-DB local apply failed for ${row.tableName} ${formatInboundRowKey(values, primaryKey)}: ${formatApplyError(error)}`,
      { cause: error },
    );
  }
  return "applied" as const;
}

async function applyChange(
  executor: SQLiteQueryable,
  change: WaymarkFullDbChange,
  context: SnapshotApplyContext,
) {
  if (change.operation !== "delete" || change.payload.deleted_at != null) {
    return applySnapshotRow(executor, { tableName: change.tableName, values: change.payload }, context);
  }
  const columns = await readLocalColumns(executor, change.tableName, context.localSchemaCache);
  const primaryKey = columns
    .filter((column) => column.primaryKeyPosition > 0)
    .sort((left, right) => left.primaryKeyPosition - right.primaryKeyPosition)
    .map((column) => column.name);
  const keyValues = primaryKey.map((name) => change.payload[name]);
  if (primaryKey.length === 0 || keyValues.some((value) => value == null)) return "skipped" as const;
  await executor.runAsync(
    `DELETE FROM ${quoteIdentifier(change.tableName)} WHERE ${primaryKey.map((name) => `${quoteIdentifier(name)} = ?`).join(" AND ")};`,
    ...keyValues.map(toLocalSqlValue),
  );
  return "applied" as const;
}

function validateRemoteSnapshotBusinessIdentities(rows: readonly WaymarkFullDbSnapshotRow[]) {
  const seen = new Map<string, string>();
  for (const row of rows) {
    const spec = getWaymarkFullDbTableSpec(row.tableName);
    for (const identity of spec?.businessIdentities ?? []) {
      if (!businessIdentityApplies(row.values, identity)) continue;
      const identityValues = identity.columns.map((column) => row.values[column]);
      if (identityValues.some((value) => value === undefined)) {
        throw new Error(
          `Full-DB snapshot contract violation: ${row.tableName}.${identity.name} is missing one or more identity columns.`,
        );
      }
      const key = `${row.tableName}\u0000${identity.name}\u0000${identityValues.map(stableIdentityValue).join("\u0000")}`;
      const rowId = String(row.values.id ?? "<no-id>");
      const previous = seen.get(key);
      if (previous) {
        throw new Error(
          `Full-DB snapshot contains duplicate ${row.tableName}.${identity.name}: ids ${previous} and ${rowId}.`,
        );
      }
      seen.set(key, rowId);
    }
  }
}

async function validateLocalUniqueIdentityCoverage(
  executor: SQLiteQueryable,
  localSchemaCache: Map<string, LocalColumn[]>,
) {
  for (const tableSpec of WAYMARK_TURSO_FULL_DB_TABLES) {
    const columns = await readLocalColumns(executor, tableSpec.tableName, localSchemaCache);
    if (columns.length === 0) continue;
    const indexes = await executor.getAllAsync<{ name: string; unique: number; origin: string }>(
      `PRAGMA index_list(${quoteIdentifier(tableSpec.tableName)});`,
    );
    const declared = tableSpec.businessIdentities ?? [];
    const discovered: string[][] = [];
    for (const index of indexes) {
      if (Number(index.unique) !== 1 || String(index.origin) === "pk") continue;
      const indexColumns = await executor.getAllAsync<{ name: string; seqno: number }>(
        `PRAGMA index_info(${quoteIdentifier(String(index.name))});`,
      );
      discovered.push(
        indexColumns
          .sort((left, right) => Number(left.seqno) - Number(right.seqno))
          .map((column) => String(column.name)),
      );
    }
    for (const uniqueColumns of discovered) {
      if (declared.some((identity) => sameOrderedColumns(identity.columns, uniqueColumns))) continue;
      throw new Error(
        `Full-DB pull contract is missing business identity for ${tableSpec.tableName}(${uniqueColumns.join(", ")}).`,
      );
    }
    for (const identity of declared) {
      if (discovered.some((uniqueColumns) => sameOrderedColumns(identity.columns, uniqueColumns))) continue;
      throw new Error(
        `Full-DB business identity ${tableSpec.tableName}.${identity.name} is not backed by a local UNIQUE constraint.`,
      );
    }
  }
}

async function reconcileBusinessIdentity(
  executor: SQLiteQueryable,
  tableName: string,
  values: Record<string, unknown>,
  primaryKey: readonly string[],
  context: SnapshotApplyContext,
) {
  const tableSpec = getWaymarkFullDbTableSpec(tableName);
  for (const identity of tableSpec?.businessIdentities ?? []) {
    if (!businessIdentityApplies(values, identity)) continue;
    if (identity.columns.some((column) => values[column] === undefined)) {
      throw new Error(`Full-DB inbound contract violation: ${tableName}.${identity.name} identity is incomplete.`);
    }
    const predicates = identity.columns.map((column) => `${quoteIdentifier(column)} = ?`);
    predicates.push(...(identity.whereNull ?? []).map((column) => `${quoteIdentifier(column)} IS NULL`));
    const localMatches = await executor.getAllAsync<Record<string, unknown>>(
      `SELECT *
       FROM ${quoteIdentifier(tableName)}
       WHERE ${predicates.join(" AND ")}
       LIMIT 2;`,
      ...identity.columns.map((column) => toLocalSqlValue(values[column])),
    );
    if (localMatches.length > 1) {
      throw new Error(`Local ${tableName}.${identity.name} identity is already duplicated; refusing ambiguous repair.`);
    }
    const localMatch = localMatches[0];
    if (!localMatch || primaryKeysEqual(localMatch, values, primaryKey)) continue;
    await reconcileCanonicalPrimaryKey(executor, {
      tableName,
      primaryKey,
      localValues: localMatch,
      remoteValues: values,
      identity,
      context,
    });
  }
}

async function reconcileCanonicalPrimaryKey(
  executor: SQLiteQueryable,
  input: {
    tableName: string;
    primaryKey: readonly string[];
    localValues: Record<string, unknown>;
    remoteValues: Record<string, unknown>;
    identity: WaymarkFullDbBusinessIdentity;
    context: SnapshotApplyContext;
  },
) {
  if (input.primaryKey.length !== 1) {
    throw new Error(
      `Full-DB cannot reconcile ${input.tableName}.${input.identity.name}: composite primary-key reconciliation is not declared.`,
    );
  }
  const primaryKey = input.primaryKey[0];
  const localId = input.localValues[primaryKey];
  const remoteId = input.remoteValues[primaryKey];
  if (localId == null || remoteId == null) {
    throw new Error(`Full-DB cannot reconcile ${input.tableName}.${input.identity.name}: primary key is missing.`);
  }

  const tableSpec = getWaymarkFullDbTableSpec(input.tableName);
  if (tableSpec) {
    await supersedeSyncOutboxRows(executor, {
      entityType: tableSpec.entityType,
      entityId: String(localId),
      canonicalEntityId: String(remoteId),
      reason: `Superseded by Turso canonical ID reconciliation: ${String(localId)} -> ${String(remoteId)}.`,
    });
  }

  if (input.context.mode === "snapshot" && input.tableName === "pack_check_instances") {
    // Turso owns the complete pack-check subtree. Keeping children generated for
    // the divergent local id would leave non-canonical execution rows behind.
    await executor.runAsync(
      `DELETE FROM pack_check_item_instances WHERE pack_check_instance_id IN (?, ?);`,
      toLocalSqlValue(localId),
      toLocalSqlValue(remoteId),
    );
  }

  const references = await readForeignKeyReferences(
    executor,
    input.tableName,
    primaryKey,
    input.context.foreignKeyReferenceCache,
  );
  for (const reference of references) {
    await executor.runAsync(
      `UPDATE ${quoteIdentifier(reference.childTable)}
       SET ${quoteIdentifier(reference.childColumn)} = ?
       WHERE ${quoteIdentifier(reference.childColumn)} = ?;`,
      toLocalSqlValue(remoteId),
      toLocalSqlValue(localId),
    );
  }
  await remapPolymorphicReferences(executor, input.tableName, localId, remoteId);

  const canonicalExists = await executor.getFirstAsync<Record<string, unknown>>(
    `SELECT ${quoteIdentifier(primaryKey)} FROM ${quoteIdentifier(input.tableName)}
     WHERE ${quoteIdentifier(primaryKey)} = ? LIMIT 1;`,
    toLocalSqlValue(remoteId),
  );
  if (canonicalExists) {
    await executor.runAsync(
      `DELETE FROM ${quoteIdentifier(input.tableName)} WHERE ${quoteIdentifier(primaryKey)} = ?;`,
      toLocalSqlValue(localId),
    );
  } else {
    await executor.runAsync(
      `UPDATE ${quoteIdentifier(input.tableName)}
       SET ${quoteIdentifier(primaryKey)} = ?
       WHERE ${quoteIdentifier(primaryKey)} = ?;`,
      toLocalSqlValue(remoteId),
      toLocalSqlValue(localId),
    );
  }
}

async function readForeignKeyReferences(
  executor: SQLiteQueryable,
  parentTable: string,
  parentColumn: string,
  cache: Map<string, ForeignKeyReference[]>,
): Promise<ForeignKeyReference[]> {
  const cacheKey = `${parentTable}.${parentColumn}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const tables = await executor.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';",
  );
  const references: ForeignKeyReference[] = [];
  for (const table of tables) {
    const childTable = String(table.name);
    const foreignKeys = await executor.getAllAsync<{ table: string; from: string; to: string }>(
      `PRAGMA foreign_key_list(${quoteIdentifier(childTable)});`,
    );
    for (const foreignKey of foreignKeys) {
      if (String(foreignKey.table) !== parentTable || String(foreignKey.to) !== parentColumn) continue;
      references.push({ childTable, childColumn: String(foreignKey.from), parentColumn });
    }
  }
  cache.set(cacheKey, references);
  return references;
}

async function remapPolymorphicReferences(
  executor: SQLiteQueryable,
  parentTable: string,
  localId: unknown,
  remoteId: unknown,
) {
  if (parentTable === "pack_check_instances") {
    await executor.runAsync(
      "UPDATE signals SET target_id = ? WHERE target_type = 'pack_check_instance' AND target_id = ?;",
      toLocalSqlValue(remoteId),
      toLocalSqlValue(localId),
    );
    await executor.runAsync(
      "UPDATE mark_dependencies SET required_entity_id = ? WHERE required_entity_type = 'pack_check_instance' AND required_entity_id = ?;",
      toLocalSqlValue(remoteId),
      toLocalSqlValue(localId),
    );
  }
  if (parentTable === "mark_instances") {
    await executor.runAsync(
      "UPDATE signals SET target_id = ? WHERE target_type = 'mark_instance' AND target_id = ?;",
      toLocalSqlValue(remoteId),
      toLocalSqlValue(localId),
    );
    await executor.runAsync(
      "UPDATE mark_dependencies SET required_entity_id = ? WHERE required_entity_type = 'mark_instance' AND required_entity_id = ?;",
      toLocalSqlValue(remoteId),
      toLocalSqlValue(localId),
    );
    await executor.runAsync(
      "UPDATE media_assets SET owner_id = ? WHERE owner_type = 'mark_instance' AND owner_id = ?;",
      toLocalSqlValue(remoteId),
      toLocalSqlValue(localId),
    );
  }
  if (parentTable === "trail_days") {
    await executor.runAsync(
      "UPDATE signals SET target_id = ? WHERE target_type = 'trail_day' AND target_id = ?;",
      toLocalSqlValue(remoteId),
      toLocalSqlValue(localId),
    );
  }
}

function businessIdentityApplies(values: Record<string, unknown>, identity: WaymarkFullDbBusinessIdentity) {
  return (identity.requireNonNull ?? []).every((column) => values[column] != null)
    && (identity.whereNull ?? []).every((column) => values[column] == null);
}

function primaryKeysEqual(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  primaryKey: readonly string[],
) {
  return primaryKey.every((column) => stableIdentityValue(left[column]) === stableIdentityValue(right[column]));
}

function sameOrderedColumns(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((column, index) => column === right[index]);
}

function stableIdentityValue(value: unknown) {
  if (value === null) return "null";
  return `${typeof value}:${String(value)}`;
}

async function readLocalColumns(
  executor: SQLiteQueryable,
  tableName: string,
  localSchemaCache: Map<string, LocalColumn[]>,
): Promise<LocalColumn[]> {
  const cached = localSchemaCache.get(tableName);
  if (cached) return cached;
  if (!getWaymarkFullDbTableSpec(tableName)) {
    localSchemaCache.set(tableName, []);
    return [];
  }
  const rows = await executor.getAllAsync<{ name: string; pk: number; notnull: number; dflt_value: unknown }>(
    `PRAGMA table_info(${quoteIdentifier(tableName)});`,
  );
  const columns = rows.map((row) => ({
    name: String(row.name),
    primaryKeyPosition: Number(row.pk),
    notNull: Number(row.notnull) === 1,
    defaultValue: row.dflt_value,
  }));
  localSchemaCache.set(tableName, columns);
  return columns;
}

function normalizeInboundValues(
  row: WaymarkFullDbSnapshotRow,
  columns: readonly LocalColumn[],
  available: ReadonlySet<string>,
  primaryKey: readonly string[],
): Record<string, unknown> {
  const values: Record<string, unknown> = Object.fromEntries(
    Object.entries(row.values).filter(([name]) => available.has(name) && !isWaymarkFullDbLocalOnlyColumn(name)),
  );

  if (available.has("sync_status")) values.sync_status = "synced";
  if (available.has("local_revision")) values.local_revision = readInboundRevision(row.values);

  for (const column of columns) {
    if (!column.notNull || primaryKey.includes(column.name)) continue;
    if (values[column.name] != null) continue;
    if (column.defaultValue != null) {
      delete values[column.name];
      continue;
    }
    throw new Error(
      `Full-DB inbound contract violation: ${row.tableName}.${column.name} is required for ${formatInboundRowKey(row.values, primaryKey)}.`,
    );
  }
  return values;
}

function readInboundRevision(values: Record<string, unknown>): number {
  for (const candidate of [
    values._remote_entity_revision,
    values.entity_revision,
    values.catalog_revision,
    values.local_revision,
  ]) {
    if (candidate == null) continue;
    const revision = Number(candidate);
    if (Number.isSafeInteger(revision) && revision >= 0) return revision;
  }
  return 0;
}

function formatInboundRowKey(values: Record<string, unknown>, primaryKey: readonly string[]) {
  if (primaryKey.length === 0) return "row with no primary key";
  return primaryKey.map((name) => `${name}=${String(values[name] ?? "<missing>")}`).join(", ");
}

function formatApplyError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function assertFullDbActive(adapter: FullDbPullAdapter) {
  const state = await adapter.getSchemaState();
  if (!state || state.migrationMode !== "active") {
    throw new Error("Waymark Turso Full-DB is not active; refusing to use a partial remote database as cache authority.");
  }
}

async function updateLocalCursor(
  executor: SQLiteQueryable,
  input: Pick<WaymarkFullDbPullInput, "vaultId" | "deviceId" | "now">,
  revision: number,
  protectionStatus: "protected" | "error",
) {
  const now = input.now ?? Date.now();
  await executor.runAsync(
    `INSERT INTO sync_state (
       vault_id, device_id, last_cloud_revision, last_successful_sync_at, sync_mode, protection_status
     ) VALUES (?, ?, ?, ?, 'manual', ?)
     ON CONFLICT(vault_id, device_id) DO UPDATE SET
       last_cloud_revision = excluded.last_cloud_revision,
       last_successful_sync_at = excluded.last_successful_sync_at,
       protection_status = excluded.protection_status,
       full_db_schema_version = 1,
       full_db_snapshot_completed_at = COALESCE(sync_state.full_db_snapshot_completed_at, excluded.last_successful_sync_at);`,
    input.vaultId,
    input.deviceId,
    revision,
    now,
    protectionStatus,
  );
  await executor.runAsync(
    `UPDATE sync_state
     SET full_db_schema_version = 1,
         full_db_snapshot_completed_at = COALESCE(full_db_snapshot_completed_at, ?)
     WHERE vault_id = ? AND device_id = ?;`,
    now,
    input.vaultId,
    input.deviceId,
  );
}

function quoteIdentifier(value: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
}

function toLocalSqlValue(value: unknown): any {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  return value as any;
}

async function rejectOutboxRow(executor: SQLiteQueryable, row: SyncOutboxRow, message: string, now: number) {
  await executor.runAsync(
    `UPDATE sync_outbox
     SET status = 'conflict', last_error = ?, error_kind = 'writer_policy', next_attempt_at = NULL, updated_at = ?
     WHERE id = ? AND status IN ('pending', 'failed', 'retry_wait');`,
    message,
    now,
    row.id,
  );
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
}

function emitEodDiagnostic(
  logger: WaymarkFullDbEodDiagnosticLogger | undefined,
  event: string,
  context: Record<string, unknown>,
) {
  if (!logger) return;
  try {
    logger(event, context);
  } catch {
    // Diagnostics must never change upload behavior.
  }
}

function describeOutboxRow(row: SyncOutboxRow): Record<string, unknown> {
  return {
    outboxId: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    localRevision: row.local_revision,
    retryCount: row.retry_count,
    idempotencyKey: row.idempotency_key,
    sourceApplicationId: row.source_application_id,
  };
}

function describeDiagnosticError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { message: formatError(error) };
  const value = error as Error & { code?: unknown; cause?: unknown };
  const cause = value.cause;
  return {
    errorName: value.name,
    errorCode: value.code == null ? null : String(value.code),
    message: formatError(value),
    cause:
      cause instanceof Error
        ? { name: cause.name, message: cause.message.slice(0, 500) }
        : cause == null
          ? null
          : String(cause).slice(0, 500),
  };
}

function listPayloadFields(payloadJson: string): string[] {
  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.keys(parsed).sort()
      : [];
  } catch {
    return ["[invalid_json]"];
  }
}

function countOutboxRowsBy(
  rows: readonly SyncOutboxRow[],
  select: (row: SyncOutboxRow) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = select(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function classifyFullDbPushError(error: unknown): string {
  const message = formatError(error).toLowerCase();
  if (isTransientTursoUploadError(error)) return "transient_network";
  if (message.includes("unique constraint") || message.includes("business identity")) {
    return "business_identity_conflict";
  }

  if (message.includes("not null constraint") || message.includes("missing required")) {
    return "missing_required_field";
  }
  if (message.includes("target not found")) return "target_missing";
  return "unknown";
}
