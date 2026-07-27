import { runExclusiveSqliteWrite, type SQLiteQueryable, type SQLiteTransactionalDatabase } from "../../db/adapters/SQLiteRepositoryBase";

export type SyncOutboxEntityType = string;
export type SyncOutboxOperation = "create" | "update" | "delete";
export type SyncOutboxStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";
export type SyncOutboxDrainTrigger = "eod" | "manual_upload";

export type SyncOutboxRow = {
  id: string;
  vault_id: string;
  device_id: string;
  db_instance_id: string;
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
  created_at: number;
  updated_at: number;
  synced_at: number | null;
};

export type SyncOutboxMutationInput = {
  vaultId: string;
  deviceId: string;
  dbInstanceId: string;
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

function createLocalId(prefix: string, seed: string) {
  const readable = seed.replace(/[^a-z0-9]+/gi, "_").toLowerCase().slice(0, 120);
  return `${prefix}_${readable}_${hashStableSeed(seed)}`;
}

function hashStableSeed(seed: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function buildSyncOutboxIdempotencyKey(input: Omit<SyncOutboxMutationInput, "payload">) {
  return [
    input.vaultId,
    input.deviceId,
    input.entityType,
    input.entityId,
    input.operation,
    String(input.localRevision),
  ].join(":");
}

export async function enqueueSyncOutboxMutation(
  executor: SQLiteQueryable,
  input: SyncOutboxMutationInput,
): Promise<SyncOutboxRow> {
  const now = input.now ?? Date.now();
  const idempotencyKey = input.idempotencyKey ?? buildSyncOutboxIdempotencyKey(input);
  const id = createLocalId("outbox", idempotencyKey);
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
    id,
    input.vaultId,
    input.deviceId,
    input.dbInstanceId,
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
  input: Pick<LocalSsotMutationInput, "entityType" | "entityId" | "vaultId" | "deviceId" | "localRevision" | "tombstoneReason" | "now">,
) {
  const now = input.now ?? Date.now();
  await executor.runAsync(
    `INSERT INTO sync_tombstones (
      entity_type,
      entity_id,
      vault_id,
      device_id,
      deleted_at,
      local_revision,
      reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(entity_type, entity_id) DO UPDATE SET
      vault_id = excluded.vault_id,
      device_id = excluded.device_id,
      deleted_at = excluded.deleted_at,
      local_revision = excluded.local_revision,
      reason = excluded.reason;`,
    input.entityType,
    input.entityId,
    input.vaultId,
    input.deviceId,
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
    limit?: number;
  },
): Promise<SyncOutboxRow[]> {
  return executor.getAllAsync<SyncOutboxRow>(
    `SELECT * FROM sync_outbox
     WHERE vault_id = ? AND status IN ('pending', 'failed')
     ORDER BY created_at ASC
     LIMIT ?;`,
    input.vaultId,
    input.limit ?? 100,
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
         updated_at = ?
     WHERE id = ?
       AND status IN ('pending', 'failed');`,
    now,
    input.id,
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
         updated_at = ?,
         synced_at = ?
     WHERE id = ?;`,
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
         updated_at = ?
     WHERE id = ?;`,
    formatSyncOutboxError(input.error),
    now,
    input.id,
  );

  return executor.getFirstAsync<SyncOutboxRow>("SELECT * FROM sync_outbox WHERE id = ? LIMIT 1;", input.id);
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
