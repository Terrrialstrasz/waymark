import type { SQLiteQueryable } from "../../db/adapters/SQLiteRepositoryBase";
import { canUploadWaymarkActivityEntity, getWaymarkTursoOwnershipForEntity } from "./tursoDataOwnership";
import {
  assertAllowedSyncOutboxDrainTrigger,
  listPendingSyncOutboxRows,
  markSyncOutboxRowFailed,
  markSyncOutboxRowSynced,
  markSyncOutboxRowSyncing,
  type SyncOutboxDrainTrigger,
  type SyncOutboxRow,
} from "./ssotOutbox";
import type { WaymarkTursoPushResult } from "./tursoRemoteAdapter";

export type WaymarkTursoUploadAdapter = {
  pushOutboxRow(row: SyncOutboxRow): Promise<WaymarkTursoPushResult>;
};

export type WaymarkTursoUploadInput = {
  executor: SQLiteQueryable;
  adapter: WaymarkTursoUploadAdapter;
  vaultId: string;
  trigger: SyncOutboxDrainTrigger;
  limit?: number;
  maxPushAttempts?: number;
  now?: () => number;
  retryDelayMs?: number;
  stopOnTransientFailure?: boolean;
};

export type WaymarkTursoUploadedRow = {
  outboxId: string;
  entityType: string;
  entityId: string;
  idempotencyKey: string;
  remoteRevision: number;
  duplicate: boolean;
};

export type WaymarkTursoUploadFailure = {
  outboxId: string;
  entityType: string;
  entityId: string;
  idempotencyKey: string;
  error: string;
};

export type WaymarkTursoSkippedUploadRow = {
  outboxId: string;
  entityType: string;
  entityId: string;
  idempotencyKey: string;
  reason: string;
};

export type WaymarkTursoUploadResult = {
  trigger: SyncOutboxDrainTrigger;
  attempted: number;
  uploaded: WaymarkTursoUploadedRow[];
  failed: WaymarkTursoUploadFailure[];
  skipped: WaymarkTursoSkippedUploadRow[];
  stoppedAfterTransientFailure: boolean;
};

export async function uploadWaymarkOutboxToTurso(input: WaymarkTursoUploadInput): Promise<WaymarkTursoUploadResult> {
  const trigger = assertAllowedSyncOutboxDrainTrigger(input.trigger);
  const maxPushAttempts = Math.max(1, input.maxPushAttempts ?? 2);
  const now = input.now ?? Date.now;
  const retryDelayMs = Math.max(0, input.retryDelayMs ?? 0);
  const stopOnTransientFailure = input.stopOnTransientFailure ?? true;
  const rows = await listPendingSyncOutboxRows(input.executor, {
    vaultId: input.vaultId,
    limit: input.limit ?? 100,
  });
  const result: WaymarkTursoUploadResult = {
    trigger,
    attempted: 0,
    uploaded: [],
    failed: [],
    skipped: [],
    stoppedAfterTransientFailure: false,
  };

  for (const row of rows) {
    if (!canUploadWaymarkActivityEntity(row.entity_type)) {
      const ownership = getWaymarkTursoOwnershipForEntity(row.entity_type);
      const reason = ownership
        ? `Skipped ${ownership.mode} entity during Waymark activity upload. ${ownership.notes}`
        : "Skipped entity type that is not part of Waymark activity upload.";
      await markSyncOutboxRowSynced(input.executor, {
        id: row.id,
        remoteRevision: null,
        now: now(),
      });
      result.skipped.push({
        outboxId: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        idempotencyKey: row.idempotency_key,
        reason,
      });
      continue;
    }

    const syncingRow = await markSyncOutboxRowSyncing(input.executor, {
      id: row.id,
      now: now(),
    });
    if (!syncingRow || syncingRow.status !== "syncing") {
      continue;
    }
    result.attempted += 1;

    try {
      const pushed = await pushOutboxRowWithRetry(input.adapter, syncingRow, {
        maxPushAttempts,
        retryDelayMs,
      });
      await markSyncOutboxRowSynced(input.executor, {
        id: syncingRow.id,
        remoteRevision: pushed.remoteRevision,
        now: now(),
      });
      result.uploaded.push({
        outboxId: syncingRow.id,
        entityType: pushed.entityType,
        entityId: pushed.entityId,
        idempotencyKey: pushed.idempotencyKey,
        remoteRevision: pushed.remoteRevision,
        duplicate: pushed.duplicate,
      });
    } catch (error) {
      await markSyncOutboxRowFailed(input.executor, {
        id: syncingRow.id,
        error,
        now: now(),
      });
      result.failed.push({
        outboxId: syncingRow.id,
        entityType: syncingRow.entity_type,
        entityId: syncingRow.entity_id,
        idempotencyKey: syncingRow.idempotency_key,
        error: formatUploadError(error),
      });
      if (stopOnTransientFailure && isTransientTursoUploadError(error)) {
        result.stoppedAfterTransientFailure = true;
        break;
      }
    }
  }

  return result;
}

async function pushOutboxRowWithRetry(
  adapter: WaymarkTursoUploadAdapter,
  row: SyncOutboxRow,
  input: {
    maxPushAttempts: number;
    retryDelayMs: number;
  },
): Promise<WaymarkTursoPushResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= input.maxPushAttempts; attempt += 1) {
    try {
      return await adapter.pushOutboxRow(row);
    } catch (error) {
      lastError = error;
      if (attempt >= input.maxPushAttempts || !isTransientTursoUploadError(error)) {
        break;
      }
      if (input.retryDelayMs > 0) {
        await delay(input.retryDelayMs);
      }
    }
  }
  throw lastError;
}

function isTransientTursoUploadError(error: unknown): boolean {
  const message = formatUploadError(error).toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("unknownhost") ||
    message.includes("unable to resolve host") ||
    message.includes("no cursor response received") ||
    message.includes("cannot commit - no transaction is active") ||
    message.includes("transaction is closed") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("connection")
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatUploadError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }
  return String(error).slice(0, 500);
}
