import { runExclusiveSqliteWrite, type SQLiteQueryable, type SQLiteTransactionalDatabase } from "../../db/adapters/SQLiteRepositoryBase";
import type { SyncOutboxEntityType, SyncOutboxOperation, SyncOutboxRow } from "./ssotOutbox";

export type TursoEditableEntityType = "week_plan" | "week_plan_item" | "signal";
export type TursoInboundApplyStatus = "applied" | "conflict" | "rejected" | "ignored";

export type TursoProjectionRecord = {
  vaultId: string;
  entityType: SyncOutboxEntityType;
  entityId: string;
  operation: SyncOutboxOperation;
  remoteRevision: number;
  lastIdempotencyKey: string;
  payload: Record<string, unknown>;
  deletedAt: number | null;
  updatedAt: number;
};

export type TursoInboundApplyResult = {
  entityType: SyncOutboxEntityType;
  entityId: string;
  status: TursoInboundApplyStatus;
  remoteRevision: number;
  reason?: string;
};

export class FakeTursoProjectionStore {
  private readonly records = new Map<string, TursoProjectionRecord>();
  private readonly acceptedIdempotency = new Map<string, TursoProjectionRecord>();
  private remoteRevision = 0;

  pushOutboxRow(row: SyncOutboxRow): TursoProjectionRecord {
    const accepted = this.acceptedIdempotency.get(row.idempotency_key);
    if (accepted) {
      return accepted;
    }

    const payload = JSON.parse(row.payload_json) as Record<string, unknown>;
    const record: TursoProjectionRecord = {
      vaultId: row.vault_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      remoteRevision: ++this.remoteRevision,
      lastIdempotencyKey: row.idempotency_key,
      payload,
      deletedAt: typeof payload.deleted_at === "number" ? payload.deleted_at : null,
      updatedAt: row.updated_at,
    };

    this.records.set(this.recordKey(record.vaultId, record.entityType, record.entityId), record);
    this.acceptedIdempotency.set(row.idempotency_key, record);
    return record;
  }

  upsertRemoteEdit(input: Omit<TursoProjectionRecord, "remoteRevision" | "lastIdempotencyKey"> & { remoteRevision?: number; lastIdempotencyKey?: string }): TursoProjectionRecord {
    const revision = input.remoteRevision ?? ++this.remoteRevision;
    if (revision > this.remoteRevision) {
      this.remoteRevision = revision;
    }

    const record: TursoProjectionRecord = {
      ...input,
      remoteRevision: revision,
      lastIdempotencyKey: input.lastIdempotencyKey ?? `remote:${input.vaultId}:${input.entityType}:${input.entityId}:${revision}`,
    };
    this.records.set(this.recordKey(record.vaultId, record.entityType, record.entityId), record);
    return record;
  }

  listChangesSince(input: { vaultId: string; afterRemoteRevision: number; entityTypes?: readonly SyncOutboxEntityType[] }): TursoProjectionRecord[] {
    const allowed = input.entityTypes ? new Set(input.entityTypes) : null;
    return [...this.records.values()]
      .filter((record) => record.vaultId === input.vaultId)
      .filter((record) => record.remoteRevision > input.afterRemoteRevision)
      .filter((record) => !allowed || allowed.has(record.entityType))
      .sort((a, b) => a.remoteRevision - b.remoteRevision);
  }

  countRecords(input: { vaultId: string; entityType: SyncOutboxEntityType }): number {
    return [...this.records.values()].filter(
      (record) => record.vaultId === input.vaultId && record.entityType === input.entityType,
    ).length;
  }

  private recordKey(vaultId: string, entityType: SyncOutboxEntityType, entityId: string) {
    return `${vaultId}:${entityType}:${entityId}`;
  }
}

export async function applyTursoInboundChangesToLocalSqlite(
  database: SQLiteTransactionalDatabase,
  records: TursoProjectionRecord[],
): Promise<TursoInboundApplyResult[]> {
  const results: TursoInboundApplyResult[] = [];

  await runExclusiveSqliteWrite(() =>
    database.withExclusiveTransactionAsync(async (txn) => {
      for (const record of records) {
        results.push(await applyTursoInboundRecord(txn, record));
      }
    }),
  );

  return results;
}

async function applyTursoInboundRecord(
  executor: SQLiteQueryable,
  record: TursoProjectionRecord,
): Promise<TursoInboundApplyResult> {
  if (!record.remoteRevision || record.remoteRevision < 1) {
    return result(record, "rejected", "missing_remote_revision");
  }

  if (record.entityType === "week_plan") {
    return applyWeekPlanRemoteEdit(executor, record);
  }
  if (record.entityType === "week_plan_item") {
    return applyWeekPlanItemRemoteEdit(executor, record);
  }
  if (record.entityType === "signal") {
    return applySignalRemoteEdit(executor, record);
  }

  return result(record, "ignored", "entity_type_not_remote_editable");
}

async function applyWeekPlanRemoteEdit(
  executor: SQLiteQueryable,
  record: TursoProjectionRecord,
): Promise<TursoInboundApplyResult> {
  const payload = record.payload;
  const existing = await executor.getFirstAsync<{ local_revision: number; sync_status: string }>(
    "SELECT local_revision, sync_status FROM week_plans WHERE id = ? LIMIT 1;",
    record.entityId,
  );
  if (!existing) {
    return result(record, "conflict", "missing_week_plan");
  }
  if (existing.sync_status === "dirty") {
    return result(record, "conflict", "local_week_plan_dirty");
  }

  await executor.runAsync(
    `UPDATE week_plans
     SET week_start_date = COALESCE(?, week_start_date),
         week_end_date = COALESCE(?, week_end_date),
         status = COALESCE(?, status),
         summary = COALESCE(?, summary),
         deleted_at = COALESCE(?, deleted_at),
         updated_at = ?,
         sync_status = 'synced',
         local_revision = local_revision + 1
     WHERE id = ?;`,
    nullableText(payload.week_start_date),
    nullableText(payload.week_end_date),
    nullableText(payload.status),
    nullableText(payload.summary),
    nullableNumber(payload.deleted_at),
    record.updatedAt,
    record.entityId,
  );
  return result(record, "applied");
}

async function applyWeekPlanItemRemoteEdit(
  executor: SQLiteQueryable,
  record: TursoProjectionRecord,
): Promise<TursoInboundApplyResult> {
  const payload = record.payload;
  const existing = await executor.getFirstAsync<{ local_revision: number; sync_status: string }>(
    "SELECT local_revision, sync_status FROM week_plan_items WHERE id = ? LIMIT 1;",
    record.entityId,
  );
  if (!existing) {
    return result(record, "conflict", "missing_week_plan_item");
  }
  if (existing.sync_status === "dirty") {
    return result(record, "conflict", "local_week_plan_item_dirty");
  }

  await executor.runAsync(
    `UPDATE week_plan_items
     SET status = COALESCE(?, status),
         local_date = COALESCE(?, local_date),
         start_time = COALESCE(?, start_time),
         end_time = COALESCE(?, end_time),
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         note = COALESCE(?, note),
         deleted_at = COALESCE(?, deleted_at),
         updated_at = ?,
         sync_status = 'synced',
         local_revision = local_revision + 1
     WHERE id = ?;`,
    nullableText(payload.status),
    nullableText(payload.local_date),
    nullableText(payload.start_time),
    nullableText(payload.end_time),
    nullableText(payload.title),
    nullableText(payload.description),
    nullableText(payload.note),
    nullableNumber(payload.deleted_at),
    record.updatedAt,
    record.entityId,
  );
  return result(record, "applied");
}

async function applySignalRemoteEdit(
  executor: SQLiteQueryable,
  record: TursoProjectionRecord,
): Promise<TursoInboundApplyResult> {
  const payload = record.payload;
  const existing = await executor.getFirstAsync<{
    target_type: string;
    target_id: string;
    sync_status: string;
  }>("SELECT target_type, target_id, sync_status FROM signals WHERE id = ? LIMIT 1;", record.entityId);
  if (!existing) {
    return result(record, "conflict", "missing_signal");
  }
  if (existing.sync_status === "dirty") {
    return result(record, "conflict", "local_signal_dirty");
  }

  const targetType = nullableText(payload.target_type) ?? existing.target_type;
  const targetId = nullableText(payload.target_id) ?? existing.target_id;
  if (!(await signalTargetExists(executor, targetType, targetId))) {
    return result(record, "conflict", "missing_signal_target");
  }

  await executor.runAsync(
    `UPDATE signals
     SET target_type = ?,
         target_id = ?,
         scheduled_at = COALESCE(?, scheduled_at),
         status = COALESCE(?, status),
         ringing_started_at = COALESCE(?, ringing_started_at),
         snoozed_until = COALESCE(?, snoozed_until),
         resolved_at = COALESCE(?, resolved_at),
         dismissed_at = COALESCE(?, dismissed_at),
         expired_at = COALESCE(?, expired_at),
         cancelled_at = COALESCE(?, cancelled_at),
         deleted_at = COALESCE(?, deleted_at),
         updated_at = ?,
         sync_status = 'synced',
         local_revision = local_revision + 1
     WHERE id = ?;`,
    targetType,
    targetId,
    nullableNumber(payload.scheduled_at),
    nullableText(payload.status),
    nullableNumber(payload.ringing_started_at),
    nullableNumber(payload.snoozed_until),
    nullableNumber(payload.resolved_at),
    nullableNumber(payload.dismissed_at),
    nullableNumber(payload.expired_at),
    nullableNumber(payload.cancelled_at),
    nullableNumber(payload.deleted_at),
    record.updatedAt,
    record.entityId,
  );
  return result(record, "applied");
}

async function signalTargetExists(executor: SQLiteQueryable, targetType: string, targetId: string): Promise<boolean> {
  const table =
    targetType === "mark_instance"
      ? "mark_instances"
      : targetType === "pack_check_instance"
        ? "pack_check_instances"
        : targetType === "trail_day"
          ? "trail_days"
          : null;
  if (!table) {
    return false;
  }
  const row = await executor.getFirstAsync<{ id: string }>(
    `SELECT id FROM ${table} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
    targetId,
  );
  return Boolean(row);
}

function result(
  record: TursoProjectionRecord,
  status: TursoInboundApplyStatus,
  reason?: string,
): TursoInboundApplyResult {
  return {
    entityType: record.entityType,
    entityId: record.entityId,
    status,
    remoteRevision: record.remoteRevision,
    reason,
  };
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
