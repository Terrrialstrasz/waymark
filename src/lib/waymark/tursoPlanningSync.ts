import type { SQLiteQueryable } from "../../db/adapters/SQLiteRepositoryBase";
import type {
  TursoPlanningChangeRecord,
  TursoPlanningWeekPlanItemSnapshot,
  TursoPlanningMutationResult,
  TursoPlanningWeekPlanSnapshot,
  WaymarkTursoRemoteAdapter,
} from "./tursoRemoteAdapter";

type WeekPlanRow = {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  status: string;
  summary: string | null;
  note: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  local_revision: number;
};

type WeekPlanItemRow = {
  id: string;
  user_id: string;
  week_plan_id: string;
  backlog_item_id: string | null;
  status: string;
  local_date: string | null;
  start_time: string | null;
  end_time: string | null;
  title: string | null;
  path_id: string | null;
  template_id: string | null;
  expedition_id: string | null;
  milestone_id: string | null;
  expedition_context: string | null;
  milestone_context: string | null;
  description: string | null;
  note: string | null;
  origin: string | null;
  block_key: string | null;
  deterministic_import_key: string | null;
  import_batch_id: string | null;
  created_mark_instance_id: string | null;
  sort_order: number;
  order_index: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  local_revision: number;
};

export type UploadTypedWeekPlansToTursoInput = {
  executor: SQLiteQueryable;
  adapter: WaymarkTursoRemoteAdapter;
  vaultId: string;
  deviceId: string;
  limit?: number;
  maxPushAttempts?: number;
  retryDelayMs?: number;
  stopOnTransientFailure?: boolean;
};

export type UploadTypedWeekPlansToTursoResult = {
  scanned: number;
  uploaded: number;
  duplicates: number;
  failed: Array<{ entityId: string; message: string }>;
  mutations: TursoPlanningMutationResult[];
  stoppedAfterTransientFailure: boolean;
};

export type UploadTypedWeekPlanItemsToTursoInput = UploadTypedWeekPlansToTursoInput;

export type UploadTypedWeekPlanItemsToTursoResult = UploadTypedWeekPlansToTursoResult;

type PlanningSyncStateRow = {
  last_planning_change_sequence: number | null;
};

type LocalWeekPlanIdentityRow = {
  id: string;
  week_start_date: string;
  week_end_date: string;
};

type LocalWeekPlanItemIdentityRow = {
  id: string;
  week_plan_id: string;
  created_mark_instance_id: string | null;
};

type SQLiteTransactional = SQLiteQueryable & {
  withExclusiveTransactionAsync(task: (txn: SQLiteQueryable) => Promise<void>): Promise<void>;
};

export type PullTypedPlanningWeekPlansFromTursoInput = {
  executor: SQLiteQueryable;
  adapter: Pick<WaymarkTursoRemoteAdapter, "getPlanningChangeCeiling" | "listPlanningChangesInWindow">;
  vaultId: string;
  deviceId: string;
  limit?: number;
  now?: number;
};

export type PullTypedPlanningWeekPlansFromTursoResult = {
  fromChangeSequence: number;
  throughChangeSequence: number;
  fetched: number;
  applied: number;
  skipped: number;
};

export async function uploadTypedWeekPlansToTurso(
  input: UploadTypedWeekPlansToTursoInput,
): Promise<UploadTypedWeekPlansToTursoResult> {
  const maxPushAttempts = Math.max(1, input.maxPushAttempts ?? 2);
  const retryDelayMs = Math.max(0, input.retryDelayMs ?? 0);
  const stopOnTransientFailure = input.stopOnTransientFailure ?? true;
  const rows = await input.executor.getAllAsync<WeekPlanRow>(
    `SELECT
        id,
        user_id,
        week_start_date,
        week_end_date,
        status,
        summary,
        note,
        created_at,
        updated_at,
        deleted_at,
        local_revision
      FROM week_plans
      ORDER BY week_start_date ASC, id ASC
      LIMIT ?;`,
    input.limit ?? 1000,
  );

  const result: UploadTypedWeekPlansToTursoResult = {
    scanned: rows.length,
    uploaded: 0,
    duplicates: 0,
    failed: [],
    mutations: [],
    stoppedAfterTransientFailure: false,
  };

  for (const row of rows) {
    try {
      const snapshot = toWeekPlanSnapshot(row, input.vaultId);
      const mutationId = buildTypedWeekPlanMutationId({
        vaultId: input.vaultId,
        deviceId: input.deviceId,
        weekPlanId: row.id,
        localRevision: row.local_revision,
      });
      const mutation = await pushPlanningSnapshotWithRetry(
        () =>
          input.adapter.upsertPlanningWeekPlanSnapshot({
            snapshot,
            mutationId,
          }),
        { maxPushAttempts, retryDelayMs },
      );
      result.mutations.push(mutation);
      if (mutation.duplicate) {
        result.duplicates += 1;
      } else {
        result.uploaded += 1;
      }
    } catch (error) {
      result.failed.push({
        entityId: row.id,
        message: formatPlanningUploadError(error),
      });
      if (stopOnTransientFailure && isTransientPlanningUploadError(error)) {
        result.stoppedAfterTransientFailure = true;
        break;
      }
    }
  }

  return result;
}

export async function uploadTypedWeekPlanItemsToTurso(
  input: UploadTypedWeekPlanItemsToTursoInput,
): Promise<UploadTypedWeekPlanItemsToTursoResult> {
  const maxPushAttempts = Math.max(1, input.maxPushAttempts ?? 2);
  const retryDelayMs = Math.max(0, input.retryDelayMs ?? 0);
  const stopOnTransientFailure = input.stopOnTransientFailure ?? true;
  const rows = await input.executor.getAllAsync<WeekPlanItemRow>(
    `SELECT
        id, user_id, week_plan_id, backlog_item_id, status, local_date, start_time,
        end_time, title, path_id, template_id, expedition_id, milestone_id,
        expedition_context, milestone_context, description, note, origin, block_key,
        deterministic_import_key, import_batch_id, created_mark_instance_id, sort_order,
        order_index, created_at, updated_at, deleted_at, local_revision
      FROM week_plan_items
      ORDER BY week_plan_id ASC, sort_order ASC, id ASC
      LIMIT ?;`,
    input.limit ?? 5000,
  );

  const result: UploadTypedWeekPlanItemsToTursoResult = {
    scanned: rows.length,
    uploaded: 0,
    duplicates: 0,
    failed: [],
    mutations: [],
    stoppedAfterTransientFailure: false,
  };

  for (const row of rows) {
    try {
      const snapshot = toWeekPlanItemSnapshot(row, input.vaultId);
      const mutationId = buildTypedWeekPlanItemMutationId({
        vaultId: input.vaultId,
        deviceId: input.deviceId,
        weekPlanItemId: row.id,
        localRevision: row.local_revision,
      });
      const mutation = await pushPlanningSnapshotWithRetry(
        () =>
          input.adapter.upsertPlanningWeekPlanItemSnapshot({
            snapshot,
            mutationId,
          }),
        { maxPushAttempts, retryDelayMs },
      );
      result.mutations.push(mutation);
      if (mutation.duplicate) {
        result.duplicates += 1;
      } else {
        result.uploaded += 1;
      }
    } catch (error) {
      result.failed.push({
        entityId: row.id,
        message: formatPlanningUploadError(error),
      });
      if (stopOnTransientFailure && isTransientPlanningUploadError(error)) {
        result.stoppedAfterTransientFailure = true;
        break;
      }
    }
  }

  return result;
}

async function pushPlanningSnapshotWithRetry(
  push: () => Promise<TursoPlanningMutationResult>,
  input: {
    maxPushAttempts: number;
    retryDelayMs: number;
  },
): Promise<TursoPlanningMutationResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= input.maxPushAttempts; attempt += 1) {
    try {
      return await push();
    } catch (error) {
      lastError = error;
      if (attempt >= input.maxPushAttempts || !isTransientPlanningUploadError(error)) {
        break;
      }
      if (input.retryDelayMs > 0) {
        await delay(input.retryDelayMs);
      }
    }
  }
  throw lastError;
}

function isTransientPlanningUploadError(error: unknown): boolean {
  const message = formatPlanningUploadError(error).toLowerCase();
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
    message.includes("connection") ||
    message.includes("expected numeric turso value")
  );
}

function formatPlanningUploadError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }
  return String(error).slice(0, 500);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pullTypedPlanningWeekPlansFromTurso(
  input: PullTypedPlanningWeekPlansFromTursoInput,
): Promise<PullTypedPlanningWeekPlansFromTursoResult> {
  const now = input.now ?? Date.now();
  const currentState = await input.executor.getFirstAsync<PlanningSyncStateRow>(
    `SELECT last_planning_change_sequence
     FROM planning_sync_state
     WHERE vault_id = ? AND device_id = ?
     LIMIT 1;`,
    input.vaultId,
    input.deviceId,
  );
  const fromChangeSequence = currentState?.last_planning_change_sequence ?? 0;
  const throughChangeSequence = await input.adapter.getPlanningChangeCeiling({ vaultId: input.vaultId });
  const changes = await input.adapter.listPlanningChangesInWindow({
    vaultId: input.vaultId,
    afterChangeSequence: fromChangeSequence,
    throughChangeSequence,
    entityTypes: ["week_plan", "week_plan_item"],
    limit: input.limit ?? 500,
  });
  const coalesced = coalescePlanningChanges(changes);

  let applied = 0;
  let skipped = 0;

  await runPlanningTransaction(input.executor, async (txn) => {
    await txn.runAsync(
      `INSERT INTO planning_sync_state (
        vault_id,
        device_id,
        last_planning_change_sequence,
        last_pull_started_at,
        last_pull_status,
        updated_at
      ) VALUES (?, ?, ?, ?, 'pulling', ?)
      ON CONFLICT(vault_id, device_id) DO UPDATE SET
        last_pull_started_at = excluded.last_pull_started_at,
        last_pull_status = 'pulling',
        last_error = NULL,
        updated_at = excluded.updated_at;`,
      input.vaultId,
      input.deviceId,
      fromChangeSequence,
      now,
      now,
    );

    for (const change of coalesced) {
      if (change.entityType === "week_plan") {
        await applyWeekPlanPlanningChange(txn, change, now);
        applied += 1;
      } else if (change.entityType === "week_plan_item") {
        await applyWeekPlanItemPlanningChange(txn, change, now);
        applied += 1;
      } else {
        skipped += 1;
      }
    }

    await txn.runAsync(
      `INSERT INTO planning_sync_state (
        vault_id,
        device_id,
        last_planning_change_sequence,
        last_pull_completed_at,
        last_pull_status,
        updated_at
      ) VALUES (?, ?, ?, ?, 'success', ?)
      ON CONFLICT(vault_id, device_id) DO UPDATE SET
        last_planning_change_sequence = excluded.last_planning_change_sequence,
        last_pull_completed_at = excluded.last_pull_completed_at,
        last_pull_status = 'success',
        last_error = NULL,
        updated_at = excluded.updated_at;`,
      input.vaultId,
      input.deviceId,
      throughChangeSequence,
      now,
      now,
    );
  });

  return {
    fromChangeSequence,
    throughChangeSequence,
    fetched: changes.length,
    applied,
    skipped,
  };
}

export function buildTypedWeekPlanMutationId(input: {
  vaultId: string;
  deviceId: string;
  weekPlanId: string;
  localRevision: number;
}) {
  return [
    "typed_planning_week_plan",
    input.vaultId,
    input.deviceId,
    input.weekPlanId,
    String(input.localRevision),
  ].join(":");
}

export function buildTypedWeekPlanItemMutationId(input: {
  vaultId: string;
  deviceId: string;
  weekPlanItemId: string;
  localRevision: number;
}) {
  return [
    "typed_planning_week_plan_item",
    input.vaultId,
    input.deviceId,
    input.weekPlanItemId,
    String(input.localRevision),
  ].join(":");
}

function toWeekPlanSnapshot(row: WeekPlanRow, vaultId: string): TursoPlanningWeekPlanSnapshot {
  return {
    id: row.id,
    vaultId,
    userId: row.user_id,
    weekStartDate: row.week_start_date,
    weekEndDate: row.week_end_date,
    status: row.status,
    summary: row.summary,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toWeekPlanItemSnapshot(row: WeekPlanItemRow, vaultId: string): TursoPlanningWeekPlanItemSnapshot {
  return {
    id: row.id,
    vaultId,
    userId: row.user_id,
    weekPlanId: row.week_plan_id,
    backlogItemId: row.backlog_item_id,
    status: row.status,
    localDate: row.local_date,
    startTime: row.start_time,
    endTime: row.end_time,
    title: row.title,
    pathId: row.path_id,
    templateId: row.template_id,
    expeditionId: row.expedition_id,
    milestoneId: row.milestone_id,
    expeditionContext: row.expedition_context,
    milestoneContext: row.milestone_context,
    description: row.description,
    note: row.note,
    origin: row.origin,
    blockKey: row.block_key,
    deterministicImportKey: row.deterministic_import_key,
    importBatchId: row.import_batch_id,
    createdMarkInstanceId: row.created_mark_instance_id,
    sortOrder: row.sort_order,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function coalescePlanningChanges(changes: readonly TursoPlanningChangeRecord[]): TursoPlanningChangeRecord[] {
  const byEntity = new Map<string, TursoPlanningChangeRecord>();
  for (const change of changes) {
    byEntity.set(`${change.entityType}:${change.entityId}`, change);
  }
  return [...byEntity.values()].sort((left, right) => left.changeSequence - right.changeSequence);
}

async function applyWeekPlanPlanningChange(
  txn: SQLiteQueryable,
  change: TursoPlanningChangeRecord,
  now: number,
): Promise<void> {
  const snapshot = parseWeekPlanSnapshot(change);
  const existing = await txn.getFirstAsync<LocalWeekPlanIdentityRow>(
    "SELECT id, week_start_date, week_end_date FROM week_plans WHERE id = ? LIMIT 1;",
    snapshot.id,
  );
  if (!existing) {
    throw new Error(`Cannot pull Turso week_plan ${snapshot.id}: local week plan is missing.`);
  }
  if (existing.week_start_date !== snapshot.weekStartDate || existing.week_end_date !== snapshot.weekEndDate) {
    throw new Error(`Cannot pull Turso week_plan ${snapshot.id}: week date range is immutable.`);
  }

  await txn.runAsync(
    `UPDATE week_plans
     SET status = ?,
         summary = ?,
         note = ?,
         updated_at = ?,
         deleted_at = ?,
         sync_status = 'synced'
     WHERE id = ?;`,
    snapshot.status,
    snapshot.summary,
    snapshot.note,
    snapshot.updatedAt,
    snapshot.deletedAt,
    snapshot.id,
  );
  await txn.runAsync(
    `INSERT INTO planning_entity_state (
      vault_id,
      entity_type,
      entity_id,
      entity_revision,
      last_change_sequence,
      last_pulled_at
    ) VALUES (?, 'week_plan', ?, ?, ?, ?)
    ON CONFLICT(vault_id, entity_type, entity_id) DO UPDATE SET
      entity_revision = excluded.entity_revision,
      last_change_sequence = excluded.last_change_sequence,
      last_pulled_at = excluded.last_pulled_at;`,
    change.vaultId,
    change.entityId,
    change.entityRevision,
    change.changeSequence,
    now,
  );
}

async function applyWeekPlanItemPlanningChange(
  txn: SQLiteQueryable,
  change: TursoPlanningChangeRecord,
  now: number,
): Promise<void> {
  const snapshot = parseWeekPlanItemSnapshot(change);
  const existing = await txn.getFirstAsync<LocalWeekPlanItemIdentityRow>(
    "SELECT id, week_plan_id, created_mark_instance_id FROM week_plan_items WHERE id = ? LIMIT 1;",
    snapshot.id,
  );
  if (!existing) {
    throw new Error(`Cannot pull Turso week_plan_item ${snapshot.id}: local week plan item is missing.`);
  }
  if (existing.week_plan_id !== snapshot.weekPlanId) {
    throw new Error(`Cannot pull Turso week_plan_item ${snapshot.id}: parent week_plan_id is immutable in this phase.`);
  }
  if (existing.created_mark_instance_id && existing.created_mark_instance_id !== snapshot.createdMarkInstanceId) {
    throw new Error(`Cannot pull Turso week_plan_item ${snapshot.id}: created_mark_instance_id is protected.`);
  }

  await txn.runAsync(
    `UPDATE week_plan_items
     SET backlog_item_id = ?,
         status = ?,
         local_date = ?,
         start_time = ?,
         end_time = ?,
         title = ?,
         path_id = ?,
         template_id = ?,
         expedition_id = ?,
         milestone_id = ?,
         expedition_context = ?,
         milestone_context = ?,
         description = ?,
         note = ?,
         origin = ?,
         block_key = ?,
         deterministic_import_key = ?,
         import_batch_id = ?,
         sort_order = ?,
         order_index = ?,
         updated_at = ?,
         deleted_at = ?,
         sync_status = 'synced'
     WHERE id = ?;`,
    snapshot.backlogItemId,
    snapshot.status,
    snapshot.localDate,
    snapshot.startTime,
    snapshot.endTime,
    snapshot.title,
    snapshot.pathId,
    snapshot.templateId,
    snapshot.expeditionId,
    snapshot.milestoneId,
    snapshot.expeditionContext,
    snapshot.milestoneContext,
    snapshot.description,
    snapshot.note,
    snapshot.origin,
    snapshot.blockKey,
    snapshot.deterministicImportKey,
    snapshot.importBatchId,
    snapshot.sortOrder,
    snapshot.orderIndex,
    snapshot.updatedAt,
    snapshot.deletedAt,
    snapshot.id,
  );
  await txn.runAsync(
    `INSERT INTO planning_entity_state (
      vault_id,
      entity_type,
      entity_id,
      entity_revision,
      last_change_sequence,
      last_pulled_at
    ) VALUES (?, 'week_plan_item', ?, ?, ?, ?)
    ON CONFLICT(vault_id, entity_type, entity_id) DO UPDATE SET
      entity_revision = excluded.entity_revision,
      last_change_sequence = excluded.last_change_sequence,
      last_pulled_at = excluded.last_pulled_at;`,
    change.vaultId,
    change.entityId,
    change.entityRevision,
    change.changeSequence,
    now,
  );
}

function parseWeekPlanSnapshot(change: TursoPlanningChangeRecord) {
  const payload = change.payloadSnapshot;
  const id = assertString(payload.id, "week_plan.id");
  return {
    id,
    weekStartDate: assertString(payload.week_start_date, "week_plan.week_start_date"),
    weekEndDate: assertString(payload.week_end_date, "week_plan.week_end_date"),
    status: assertString(payload.status, "week_plan.status"),
    summary: nullableString(payload.summary, "week_plan.summary"),
    note: nullableString(payload.note, "week_plan.note"),
    updatedAt: assertNumber(payload.updated_at, "week_plan.updated_at"),
    deletedAt: nullableNumber(payload.deleted_at, "week_plan.deleted_at"),
  };
}

function parseWeekPlanItemSnapshot(change: TursoPlanningChangeRecord) {
  const payload = change.payloadSnapshot;
  return {
    id: assertString(payload.id, "week_plan_item.id"),
    weekPlanId: assertString(payload.week_plan_id, "week_plan_item.week_plan_id"),
    backlogItemId: nullableString(payload.backlog_item_id, "week_plan_item.backlog_item_id"),
    status: assertString(payload.status, "week_plan_item.status"),
    localDate: nullableString(payload.local_date, "week_plan_item.local_date"),
    startTime: nullableString(payload.start_time, "week_plan_item.start_time"),
    endTime: nullableString(payload.end_time, "week_plan_item.end_time"),
    title: nullableString(payload.title, "week_plan_item.title"),
    pathId: nullableString(payload.path_id, "week_plan_item.path_id"),
    templateId: nullableString(payload.template_id, "week_plan_item.template_id"),
    expeditionId: nullableString(payload.expedition_id, "week_plan_item.expedition_id"),
    milestoneId: nullableString(payload.milestone_id, "week_plan_item.milestone_id"),
    expeditionContext: nullableString(payload.expedition_context, "week_plan_item.expedition_context"),
    milestoneContext: nullableString(payload.milestone_context, "week_plan_item.milestone_context"),
    description: nullableString(payload.description, "week_plan_item.description"),
    note: nullableString(payload.note, "week_plan_item.note"),
    origin: nullableString(payload.origin, "week_plan_item.origin"),
    blockKey: nullableString(payload.block_key, "week_plan_item.block_key"),
    deterministicImportKey: nullableString(payload.deterministic_import_key, "week_plan_item.deterministic_import_key"),
    importBatchId: nullableString(payload.import_batch_id, "week_plan_item.import_batch_id"),
    createdMarkInstanceId: nullableString(payload.created_mark_instance_id, "week_plan_item.created_mark_instance_id"),
    sortOrder: assertNumber(payload.sort_order, "week_plan_item.sort_order"),
    orderIndex: assertNumber(payload.order_index, "week_plan_item.order_index"),
    updatedAt: assertNumber(payload.updated_at, "week_plan_item.updated_at"),
    deletedAt: nullableNumber(payload.deleted_at, "week_plan_item.deleted_at"),
  };
}

async function runPlanningTransaction(executor: SQLiteQueryable, task: (txn: SQLiteQueryable) => Promise<void>) {
  const transactional = executor as Partial<SQLiteTransactional>;
  if (typeof transactional.withExclusiveTransactionAsync === "function") {
    await transactional.withExclusiveTransactionAsync(task);
    return;
  }
  await task(executor);
}

function assertString(value: unknown, label: string): string {
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`Invalid Turso planning snapshot: ${label} must be a string.`);
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`Invalid Turso planning snapshot: ${label} must be a string or null.`);
}

function assertNumber(value: unknown, label: string): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  throw new Error(`Invalid Turso planning snapshot: ${label} must be a number.`);
}

function nullableNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  throw new Error(`Invalid Turso planning snapshot: ${label} must be a number or null.`);
}
