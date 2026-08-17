import { runExclusiveSqliteWrite, type SQLiteQueryable, type SQLiteTransactionalDatabase } from "../../db/adapters/SQLiteRepositoryBase";
import { buildCurrentSyncOutboxIdempotencyKey, buildSyncOutboxLocalId } from "../../db/syncOutboxIdentity";

export type SyncOutboxEntityType = string;
export type SyncOutboxOperation = "create" | "update" | "delete";
export type SyncOutboxStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "conflict"
  | "superseded"
  | "retry_wait"
  | "quarantined";
export type SyncOutboxDrainTrigger = "eod" | "manual_upload";

export type SyncOutboxRow = {
  id: string;
  vault_id: string;
  device_id: string;
  db_instance_id: string;
  source_application_id?: string | null;
  entity_type: SyncOutboxEntityType;
  entity_id: string;
  operation: SyncOutboxOperation;
  idempotency_key: string;
  local_revision: number;
  base_remote_revision: number | null;
  payload_json: string;
  payload_schema_version: number;
  status: SyncOutboxStatus;
  retry_count: number;
  last_error: string | null;
  error_kind?: string | null;
  next_attempt_at?: number | null;
  remote_revision?: number | null;
  canonical_entity_id?: string | null;
  created_at: number;
  updated_at: number;
  synced_at: number | null;
};

export type SyncOutboxMutationInput = {
  vaultId: string;
  deviceId: string;
  dbInstanceId: string;
  sourceApplicationId?: string | null;
  entityType: SyncOutboxEntityType;
  entityId: string;
  operation: SyncOutboxOperation;
  localRevision: number;
  payload: unknown;
  idempotencyKey?: string;
  baseRemoteRevision?: number | null;
  now?: number;
};

export type LocalSsotMutationInput = SyncOutboxMutationInput & {
  tombstoneReason?: string;
};

export function buildSyncOutboxIdempotencyKey(input: Omit<SyncOutboxMutationInput, "payload">) {
  return buildCurrentSyncOutboxIdempotencyKey(input);
}

export async function enqueueSyncOutboxMutation(
  executor: SQLiteQueryable,
  input: SyncOutboxMutationInput,
): Promise<SyncOutboxRow> {
  const now = input.now ?? Date.now();
  const idempotencyKey = input.idempotencyKey ?? buildSyncOutboxIdempotencyKey(input);
  const id = buildSyncOutboxLocalId(idempotencyKey);
  const payloadJson = JSON.stringify(input.payload);

  const existing = await executor.getFirstAsync<SyncOutboxRow>(
    "SELECT * FROM sync_outbox WHERE idempotency_key = ? LIMIT 1;",
    idempotencyKey,
  );
  if (existing) {
    return existing;
  }

  await executor.runAsync(
    `INSERT INTO sync_outbox (
      id,
      vault_id,
      device_id,
      db_instance_id,
      source_application_id,
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending', 0, NULL, ?, ?, NULL);`,
    id,
    input.vaultId,
    input.deviceId,
    input.dbInstanceId,
    input.sourceApplicationId ?? null,
    input.entityType,
    input.entityId,
    input.operation,
    idempotencyKey,
    input.localRevision,
    input.baseRemoteRevision ?? null,
    payloadJson,
    now,
    now,
  );

  const row = await executor.getFirstAsync<SyncOutboxRow>(
    "SELECT * FROM sync_outbox WHERE idempotency_key = ? LIMIT 1;",
    idempotencyKey,
  );
  if (!row) {
    throw new Error("Failed to enqueue sync_outbox mutation.");
  }
  return row;
}

export async function writeSyncTombstone(
  executor: SQLiteQueryable,
  input: Pick<LocalSsotMutationInput, "entityType" | "entityId" | "vaultId" | "deviceId" | "sourceApplicationId" | "localRevision" | "tombstoneReason" | "now">,
) {
  const now = input.now ?? Date.now();
  await executor.runAsync(
    `INSERT INTO sync_tombstones (
      entity_type,
      entity_id,
      vault_id,
      device_id,
      source_application_id,
      deleted_at,
      local_revision,
      reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(entity_type, entity_id) DO UPDATE SET
      vault_id = excluded.vault_id,
      device_id = excluded.device_id,
      source_application_id = excluded.source_application_id,
      deleted_at = excluded.deleted_at,
      local_revision = excluded.local_revision,
      reason = excluded.reason;`,
    input.entityType,
    input.entityId,
    input.vaultId,
    input.deviceId,
    input.sourceApplicationId ?? null,
    now,
    input.localRevision,
    input.tombstoneReason ?? null,
  );
}

export async function runLocalSsotMutation<T>(
  database: SQLiteTransactionalDatabase,
  input: LocalSsotMutationInput,
  writeCanonicalRow: (executor: SQLiteQueryable) => Promise<T>,
): Promise<{ result: T; outbox: SyncOutboxRow }> {
  let result!: T;
  let outbox!: SyncOutboxRow;

  await runExclusiveSqliteWrite(() =>
    database.withExclusiveTransactionAsync(async (txn) => {
      result = await writeCanonicalRow(txn);
      if (input.operation === "delete") {
        await writeSyncTombstone(txn, input);
      }
      outbox = await enqueueSyncOutboxMutation(txn, input);
    }),
  );

  return { result, outbox };
}

export async function listPendingSyncOutboxRows(
  executor: SQLiteQueryable,
  input: {
    vaultId: string;
    sourceApplicationId?: string;
    limit?: number;
    now?: number;
  },
): Promise<SyncOutboxRow[]> {
  const applicationFilter = input.sourceApplicationId ? " AND source_application_id = ?" : "";
  const params: Array<string | number> = [input.vaultId];
  if (input.sourceApplicationId) params.push(input.sourceApplicationId);
  params.push(input.limit ?? 100);
  return executor.getAllAsync<SyncOutboxRow>(
    `SELECT * FROM sync_outbox
     WHERE vault_id = ?${applicationFilter}
       AND (
         status IN ('pending', 'failed')
         OR (status = 'retry_wait' AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
       )
     ORDER BY created_at ASC
     LIMIT ?;`,
    ...params.slice(0, -1),
    input.now ?? Date.now(),
    params[params.length - 1],
  );
}

export async function listSyncOutboxRowsForDevice(
  executor: SQLiteQueryable,
  input: {
    vaultId: string;
    deviceId: string;
    limit?: number;
  },
): Promise<SyncOutboxRow[]> {
  return executor.getAllAsync<SyncOutboxRow>(
    `SELECT * FROM sync_outbox
     WHERE vault_id = ? AND device_id = ?
     ORDER BY created_at ASC
     LIMIT ?;`,
    input.vaultId,
    input.deviceId,
    input.limit ?? 1000,
  );
}

export async function markSyncOutboxRowSyncing(
  executor: SQLiteQueryable,
  input: {
    id: string;
    now?: number;
  },
): Promise<SyncOutboxRow | null> {
  const now = input.now ?? Date.now();
  await executor.runAsync(
    `UPDATE sync_outbox
     SET status = 'syncing',
          last_error = NULL,
          error_kind = NULL,
          next_attempt_at = NULL,
          updated_at = ?
     WHERE id = ?
       AND (
         status IN ('pending', 'failed')
         OR (status = 'retry_wait' AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
       );`,
    now,
    input.id,
    now,
  );

  return executor.getFirstAsync<SyncOutboxRow>("SELECT * FROM sync_outbox WHERE id = ? LIMIT 1;", input.id);
}

export async function markSyncOutboxRowSynced(
  executor: SQLiteQueryable,
  input: {
    id: string;
    remoteRevision?: number | null;
    now?: number;
  },
): Promise<SyncOutboxRow | null> {
  const now = input.now ?? Date.now();
  await executor.runAsync(
    `UPDATE sync_outbox
      SET status = 'synced',
          last_error = NULL,
          error_kind = NULL,
          next_attempt_at = NULL,
          remote_revision = ?,
          updated_at = ?,
         synced_at = ?
     WHERE id = ? AND status = 'syncing';`,
    input.remoteRevision ?? null,
    now,
    now,
    input.id,
  );

  return executor.getFirstAsync<SyncOutboxRow>("SELECT * FROM sync_outbox WHERE id = ? LIMIT 1;", input.id);
}

export async function markSyncOutboxRowFailed(
  executor: SQLiteQueryable,
  input: {
    id: string;
    error: unknown;
    now?: number;
  },
): Promise<SyncOutboxRow | null> {
  const now = input.now ?? Date.now();
  await executor.runAsync(
    `UPDATE sync_outbox
     SET status = 'failed',
          retry_count = retry_count + 1,
          last_error = ?,
          error_kind = 'unknown',
          next_attempt_at = NULL,
          updated_at = ?
     WHERE id = ? AND status = 'syncing';`,
    formatSyncOutboxError(input.error),
    now,
    input.id,
  );

  return executor.getFirstAsync<SyncOutboxRow>("SELECT * FROM sync_outbox WHERE id = ? LIMIT 1;", input.id);
}

export async function markSyncOutboxRowRetryWait(
  executor: SQLiteQueryable,
  input: { id: string; error: unknown; errorKind: string; nextAttemptAt: number; now?: number },
): Promise<SyncOutboxRow | null> {
  const now = input.now ?? Date.now();
  await executor.runAsync(
    `UPDATE sync_outbox
     SET status = 'retry_wait',
         retry_count = retry_count + 1,
         last_error = ?,
         error_kind = ?,
         next_attempt_at = ?,
         updated_at = ?
     WHERE id = ? AND status = 'syncing';`,
    formatSyncOutboxError(input.error),
    input.errorKind,
    input.nextAttemptAt,
    now,
    input.id,
  );
  return executor.getFirstAsync<SyncOutboxRow>("SELECT * FROM sync_outbox WHERE id = ? LIMIT 1;", input.id);
}

export async function markSyncOutboxRowQuarantined(
  executor: SQLiteQueryable,
  input: { id: string; error: unknown; errorKind: string; canonicalEntityId?: string | null; now?: number },
): Promise<SyncOutboxRow | null> {
  const now = input.now ?? Date.now();
  await executor.runAsync(
    `UPDATE sync_outbox
     SET status = 'quarantined',
         retry_count = retry_count + 1,
         last_error = ?,
         error_kind = ?,
         canonical_entity_id = COALESCE(?, canonical_entity_id),
         next_attempt_at = NULL,
         updated_at = ?
     WHERE id = ? AND status = 'syncing';`,
    formatSyncOutboxError(input.error),
    input.errorKind,
    input.canonicalEntityId ?? null,
    now,
    input.id,
  );
  return executor.getFirstAsync<SyncOutboxRow>("SELECT * FROM sync_outbox WHERE id = ? LIMIT 1;", input.id);
}

export async function supersedeSyncOutboxRows(
  executor: SQLiteQueryable,
  input: {
    vaultId?: string;
    sourceApplicationId?: string;
    entityType: string;
    entityId: string;
    exceptIdempotencyKey?: string;
    canonicalEntityId?: string | null;
    reason: string;
    now?: number;
  },
): Promise<number> {
  const now = input.now ?? Date.now();
  const clauses = ["entity_type = ?", "entity_id = ?", "status IN ('pending', 'failed', 'retry_wait', 'syncing')"];
  const params: Array<string | number | null> = [input.entityType, input.entityId];
  if (input.vaultId) {
    clauses.push("vault_id = ?");
    params.push(input.vaultId);
  }
  if (input.sourceApplicationId) {
    clauses.push("source_application_id = ?");
    params.push(input.sourceApplicationId);
  }
  if (input.exceptIdempotencyKey) {
    clauses.push("idempotency_key <> ?");
    params.push(input.exceptIdempotencyKey);
  }
  const result = await executor.runAsync(
    `UPDATE sync_outbox
     SET status = 'superseded',
         last_error = ?,
         error_kind = 'superseded',
         canonical_entity_id = COALESCE(?, canonical_entity_id),
         next_attempt_at = NULL,
         updated_at = ?,
         synced_at = NULL
     WHERE ${clauses.join(" AND ")};`,
    input.reason,
    input.canonicalEntityId ?? null,
    now,
    ...params,
  );
  return Number(result.changes ?? 0);
}

export async function supersedeSyncOutboxRow(
  executor: SQLiteQueryable,
  input: { id: string; reason: string; canonicalEntityId?: string | null; now?: number },
): Promise<boolean> {
  const now = input.now ?? Date.now();
  const result = await executor.runAsync(
    `UPDATE sync_outbox
     SET status = 'superseded',
         last_error = ?,
         error_kind = 'superseded',
         canonical_entity_id = COALESCE(?, canonical_entity_id),
         next_attempt_at = NULL,
         updated_at = ?,
         synced_at = NULL
     WHERE id = ? AND status IN ('pending', 'failed', 'retry_wait', 'syncing');`,
    input.reason,
    input.canonicalEntityId ?? null,
    now,
    input.id,
  );
  return Number(result.changes ?? 0) === 1;
}

export function assertAllowedSyncOutboxDrainTrigger(trigger: SyncOutboxDrainTrigger): SyncOutboxDrainTrigger {
  return trigger;
}

function formatSyncOutboxError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }
  return String(error).slice(0, 500);
}
