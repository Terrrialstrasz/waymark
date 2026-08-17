import type { SQLiteQueryable } from "../../db/adapters/SQLiteRepositoryBase";
import { createSQLiteRepositoryProvider } from "../../db/adapters/SQLiteRepositories";
import type { WeekPlanItem } from "../../domain/waymark";
import { materializeWeeklyPlannedMark, type WeeklyPlannedMaterializationOutcome } from "./weeklyPlannedMarkMaterializer";
import type {
  TursoPlanningChangeRecord,
  TursoPlanningExpeditionSnapshot,
  TursoPlanningMilestoneSnapshot,
  TursoPlanningMarkInstanceSnapshot,
  TursoPlanningTrailDaySnapshot,
  TursoPlanningWeekPlanItemSnapshot,
  TursoPlanningMutationResult,
  TursoPlanningPathSnapshot,
  TursoPlanningWeekPlanSnapshot,
  TursoPlanningHierarchyEntityType,
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
  user_id: string;
  local_date: string | null;
  created_mark_instance_id: string | null;
};

type LocalPathIdentityRow = {
  id: string;
  user_id: string;
  slug: string;
  local_revision: number;
  sync_status: string;
};

type LocalExpeditionIdentityRow = {
  id: string;
  user_id: string;
  path_id: string;
  local_revision: number;
  sync_status: string;
};

type LocalMilestoneIdentityRow = {
  id: string;
  user_id: string;
  expedition_id: string;
  local_revision: number;
  sync_status: string;
};

type LocalMarkInstanceIdentityRow = {
  id: string;
  user_id: string;
  trail_day_id: string;
  sync_status: string;
  local_revision: number;
  updated_at: number;
  deleted_at: number | null;
};

type LocalTrailDayIdentityRow = {
  id: string;
  user_id: string;
  local_date: string;
  local_revision: number;
  updated_at: number;
  deleted_at: number | null;
};

type SQLiteTransactional = SQLiteQueryable & {
  withExclusiveTransactionAsync(task: (txn: SQLiteQueryable) => Promise<void>): Promise<void>;
};

export type PullTypedPlanningEntityType = "week_plan" | "week_plan_item" | "path" | "expedition" | "milestone";

type HierarchyAuthorityIds = Record<TursoPlanningHierarchyEntityType, Set<string>>;

type RetiredLocalOnlyHierarchyCounts = Record<TursoPlanningHierarchyEntityType, number>;

type HierarchyApplyStatus = { status: "applied" } | { status: "conflict"; message: string };

type WeeklyPlanningMaterializationCounts = Record<WeeklyPlannedMaterializationOutcome, number>;

export type PullTypedPlanningWeekPlansFromTursoInput = {
  executor: SQLiteQueryable;
  adapter: Pick<WaymarkTursoRemoteAdapter, "getPlanningChangeCeiling" | "listPlanningChangesInWindow"> &
    Partial<Pick<WaymarkTursoRemoteAdapter, "listActivePlanningHierarchyEntityIds">>;
  vaultId: string;
  deviceId: string;
  entityTypes?: readonly PullTypedPlanningEntityType[];
  retireLocalHierarchy?: boolean;
  replayFromBeginning?: boolean;
  advancePlanningCursor?: boolean;
  limit?: number;
  now?: number;
};

export type PullTypedPlanningWeekPlansFromTursoResult = {
  fromChangeSequence: number;
  throughChangeSequence: number;
  fetched: number;
  applied: number;
  skipped: number;
  byEntityType: Record<PullTypedPlanningEntityType, number>;
  retiredLocalOnly: RetiredLocalOnlyHierarchyCounts;
  materializedWeekPlanItems: WeeklyPlanningMaterializationCounts;
};

export type PullTypedPlanningFromTursoInput = PullTypedPlanningWeekPlansFromTursoInput;

export type PullTypedPlanningFromTursoResult = PullTypedPlanningWeekPlansFromTursoResult;

export type ReconcileLocalWeeklyPlanningResult = {
  weekPlanIds: string[];
  materializedWeekPlanItems: WeeklyPlanningMaterializationCounts;
};

export type PullAllMarkInstancesFromTursoInput = {
  executor: SQLiteQueryable;
  adapter: Pick<WaymarkTursoRemoteAdapter, "listAllPlanningMarkInstanceSnapshots">;
  vaultId: string;
  deviceId: string;
  pageSize?: number;
  now?: number;
};

export type PullAllMarkInstancesFromTursoResult = {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  conflicts: number;
  affectedTrailDays: number;
  conflictSamples: Array<{ markId: string; message: string }>;
};

export type PullAllTrailDaysFromTursoInput = {
  executor: SQLiteQueryable;
  adapter: Pick<WaymarkTursoRemoteAdapter, "listAllPlanningTrailDaySnapshots">;
  vaultId: string;
  deviceId: string;
  pageSize?: number;
  now?: number;
};

export type PullAllTrailDaysFromTursoResult = {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  conflicts: number;
  conflictSamples: Array<{ trailDayId: string; message: string }>;
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
  return pullTypedPlanningFromTurso({
    ...input,
    entityTypes: ["path", "expedition", "milestone", "week_plan", "week_plan_item"],
    retireLocalHierarchy: false,
  });
}

export async function pullTypedPlanningFromTurso(
  input: PullTypedPlanningFromTursoInput,
): Promise<PullTypedPlanningFromTursoResult> {
  const now = input.now ?? Date.now();
  const currentState = await input.executor.getFirstAsync<PlanningSyncStateRow>(
    `SELECT last_planning_change_sequence
     FROM planning_sync_state
     WHERE vault_id = ? AND device_id = ?
     LIMIT 1;`,
    input.vaultId,
    input.deviceId,
  );
  const currentCursor = currentState?.last_planning_change_sequence ?? 0;
  const fromChangeSequence = input.replayFromBeginning ? 0 : currentCursor;
  const throughChangeSequence = await input.adapter.getPlanningChangeCeiling({ vaultId: input.vaultId });
  const cursorAfterPull = input.advancePlanningCursor === false ? currentCursor : throughChangeSequence;
  const changes = await listAllPlanningChangesToCeiling({
    adapter: input.adapter,
    vaultId: input.vaultId,
    afterChangeSequence: fromChangeSequence,
    throughChangeSequence,
    entityTypes: input.entityTypes,
    limit: input.limit ?? 500,
  });
  const coalesced = coalescePlanningChanges(changes);
  const hierarchyAuthorityIds =
    input.retireLocalHierarchy === false ? null : await loadHierarchyAuthorityIds(input.adapter, input.vaultId);

  let applied = 0;
  let skipped = 0;
  const byEntityType = createEmptyPullEntityCounts();
  let retiredLocalOnly = createEmptyRetiredLocalOnlyCounts();
  let materializedWeekPlanItems = createEmptyWeeklyMaterializationCounts();
  let conflictMessage: string | null = null;

  await runPlanningTransaction(input.executor, async (txn) => {
    const affectedWeekPlanIds = new Set<string>();
    const affectedTrailDayDatesByUserId = new Map<string, Set<string>>();

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
        const status = await applyWeekPlanPlanningChange(txn, change, now);
        affectedWeekPlanIds.add(status.weekPlanId);
        applied += 1;
        byEntityType.week_plan += 1;
      } else if (change.entityType === "week_plan_item") {
        const status = await applyWeekPlanItemPlanningChange(txn, change, now);
        affectedWeekPlanIds.add(status.weekPlanId);
        addAffectedTrailDayDate(affectedTrailDayDatesByUserId, status.userId, status.previousLocalDate);
        addAffectedTrailDayDate(affectedTrailDayDatesByUserId, status.userId, status.nextLocalDate);
        applied += 1;
        byEntityType.week_plan_item += 1;
      } else if (change.entityType === "path") {
        const status = await applyPathPlanningChange(txn, change, now);
        if (status.status === "conflict") {
          conflictMessage = status.message;
          break;
        }
        applied += 1;
        byEntityType.path += 1;
      } else if (change.entityType === "expedition") {
        const status = await applyExpeditionPlanningChange(txn, change, now);
        if (status.status === "conflict") {
          conflictMessage = status.message;
          break;
        }
        applied += 1;
        byEntityType.expedition += 1;
      } else if (change.entityType === "milestone") {
        const status = await applyMilestonePlanningChange(txn, change, now);
        if (status.status === "conflict") {
          conflictMessage = status.message;
          break;
        }
        applied += 1;
        byEntityType.milestone += 1;
      } else {
        throw new Error(`Cannot pull Turso planning ${change.entityType} ${change.entityId}: entity type is not supported by this local intake.`);
      }
    }

    if (conflictMessage) {
      await txn.runAsync(
        `INSERT INTO planning_sync_state (
          vault_id,
          device_id,
          last_planning_change_sequence,
          last_pull_completed_at,
          last_pull_status,
          last_error,
          updated_at
        ) VALUES (?, ?, ?, ?, 'error', ?, ?)
        ON CONFLICT(vault_id, device_id) DO UPDATE SET
          last_pull_completed_at = excluded.last_pull_completed_at,
          last_pull_status = 'error',
          last_error = excluded.last_error,
          updated_at = excluded.updated_at;`,
        input.vaultId,
        input.deviceId,
        fromChangeSequence,
        now,
        conflictMessage,
        now,
      );
      return;
    }

    if (hierarchyAuthorityIds) {
      retiredLocalOnly = await reconcileLocalHierarchyToTursoAuthority(txn, {
        vaultId: input.vaultId,
        authorityIds: hierarchyAuthorityIds,
        now,
      });
    }

    const primerRepairWeekPlanIds = await listWeekPlanIdsNeedingPrimerRepair(txn);
    for (const weekPlanId of primerRepairWeekPlanIds) {
      affectedWeekPlanIds.add(weekPlanId);
    }

    if (affectedWeekPlanIds.size > 0) {
      materializedWeekPlanItems = await materializePulledWeeklyPlanItems(txn, {
        userIdByTrailDayDate: affectedTrailDayDatesByUserId,
        weekPlanIds: [...affectedWeekPlanIds],
        now,
      });
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
      cursorAfterPull,
      now,
      now,
    );
  });

  if (conflictMessage) {
    throw new Error(conflictMessage);
  }

  return {
    fromChangeSequence,
    throughChangeSequence: cursorAfterPull,
    fetched: changes.length,
    applied,
    skipped,
    byEntityType,
    retiredLocalOnly,
    materializedWeekPlanItems,
  };
}

/**
 * Repairs derived local Marks after a Full-DB snapshot copied planning rows
 * without replaying the typed planning materializer. This deliberately does
 * not advance the planning cursor; only the typed remote intake may do that.
 */
export async function reconcileLocalWeeklyPlanningMaterialization(input: {
  executor: SQLiteQueryable;
  now?: number;
}): Promise<ReconcileLocalWeeklyPlanningResult> {
  const now = input.now ?? Date.now();
  let weekPlanIds: string[] = [];
  let materializedWeekPlanItems = createEmptyWeeklyMaterializationCounts();

  await runPlanningTransaction(input.executor, async (txn) => {
    const rows = await txn.getAllAsync<{ id: string; week_plan_id: string }>(
      `SELECT wpi.id, wpi.week_plan_id
       FROM week_plan_items wpi
       INNER JOIN week_plans wp
         ON wp.id = wpi.week_plan_id
        AND wp.deleted_at IS NULL
        AND wp.status IN ('draft', 'active')
       LEFT JOIN mark_instances mi
         ON (
           mi.id = wpi.created_mark_instance_id
           OR (
             wpi.created_mark_instance_id IS NULL
             AND wpi.deterministic_import_key IS NOT NULL
             AND mi.generation_key = CASE
               WHEN wpi.deterministic_import_key LIKE 'weekly_timetable:%'
                 THEN 'weekly_planned:' || SUBSTR(wpi.deterministic_import_key, LENGTH('weekly_timetable:') + 1)
               ELSE 'weekly_planned:' || wpi.deterministic_import_key
             END
           )
         )
        AND mi.deleted_at IS NULL
       LEFT JOIN mark_instance_details mid
         ON mid.mark_instance_id = mi.id
        AND mid.deleted_at IS NULL
       WHERE wpi.deleted_at IS NULL
         AND wpi.status NOT IN ('removed', 'done')
         AND wpi.sync_status = 'synced'
         AND (
           mi.id IS NULL
           OR wpi.created_mark_instance_id IS NULL
           OR (
             wpi.template_id IS NOT NULL
             AND mi.template_id IS NULL
           )
           OR (
             mi.id IS NOT NULL
             AND TRIM(COALESCE(wpi.description, '')) <> ''
             AND TRIM(COALESCE(mid.primer_snapshot, '')) = ''
           )
         )
       ORDER BY wpi.week_plan_id ASC, wpi.sort_order ASC, wpi.order_index ASC, wpi.id ASC;`,
    );
    weekPlanIds = [...new Set(rows.map((row) => row.week_plan_id))];
    if (weekPlanIds.length === 0) return;

    materializedWeekPlanItems = await materializePulledWeeklyPlanItems(txn, {
      userIdByTrailDayDate: new Map<string, Set<string>>(),
      weekPlanItemIds: rows.map((row) => row.id),
      now,
    });
  });

  return { weekPlanIds, materializedWeekPlanItems };
}

export async function pullAllMarkInstancesFromTurso(
  input: PullAllMarkInstancesFromTursoInput,
): Promise<PullAllMarkInstancesFromTursoResult> {
  const now = input.now ?? Date.now();
  const snapshots = await input.adapter.listAllPlanningMarkInstanceSnapshots({
    vaultId: input.vaultId,
    pageSize: input.pageSize ?? 500,
  });
  const result: PullAllMarkInstancesFromTursoResult = {
    fetched: snapshots.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    conflicts: 0,
    affectedTrailDays: 0,
    conflictSamples: [],
  };
  const affectedTrailDayIds = new Set<string>();

  await runPlanningTransaction(input.executor, async (txn) => {
    for (const snapshot of snapshots) {
      const status = await applyMarkInstanceSnapshotFromTurso(txn, {
        vaultId: input.vaultId,
        snapshot,
        now,
      });
      if (status.status === "inserted") {
        result.inserted += 1;
        affectedTrailDayIds.add(snapshot.trailDayId);
      } else if (status.status === "updated") {
        result.updated += 1;
        affectedTrailDayIds.add(snapshot.trailDayId);
        if (status.previousTrailDayId && status.previousTrailDayId !== snapshot.trailDayId) {
          affectedTrailDayIds.add(status.previousTrailDayId);
        }
      } else if (status.status === "conflict") {
        result.conflicts += 1;
        if (result.conflictSamples.length < 10) {
          result.conflictSamples.push({ markId: snapshot.id, message: status.message });
        }
      } else {
        result.skipped += 1;
      }
    }

    for (const trailDayId of affectedTrailDayIds) {
      await recomputeTrailDayCountersFromPulledMarks(txn, trailDayId, now);
    }
  });

  result.affectedTrailDays = affectedTrailDayIds.size;
  return result;
}

export async function pullAllTrailDaysFromTurso(
  input: PullAllTrailDaysFromTursoInput,
): Promise<PullAllTrailDaysFromTursoResult> {
  const now = input.now ?? Date.now();
  const snapshots = await input.adapter.listAllPlanningTrailDaySnapshots({
    vaultId: input.vaultId,
    pageSize: input.pageSize ?? 500,
  });
  const result: PullAllTrailDaysFromTursoResult = {
    fetched: snapshots.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    conflicts: 0,
    conflictSamples: [],
  };

  await runPlanningTransaction(input.executor, async (txn) => {
    for (const snapshot of snapshots) {
      const status = await applyTrailDaySnapshotFromTurso(txn, {
        vaultId: input.vaultId,
        snapshot,
        now,
      });
      if (status.status === "inserted") {
        result.inserted += 1;
      } else if (status.status === "updated") {
        result.updated += 1;
      } else if (status.status === "conflict") {
        result.conflicts += 1;
        if (result.conflictSamples.length < 10) {
          result.conflictSamples.push({ trailDayId: snapshot.id, message: status.message });
        }
      } else {
        result.skipped += 1;
      }
    }
  });

  return result;
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
    createdMarkInstanceId: null,
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
  return [...byEntity.values()].sort(
    (left, right) => getPlanningApplyOrder(left.entityType) - getPlanningApplyOrder(right.entityType) || left.changeSequence - right.changeSequence,
  );
}

async function listAllPlanningChangesToCeiling(input: {
  adapter: Pick<WaymarkTursoRemoteAdapter, "listPlanningChangesInWindow">;
  vaultId: string;
  afterChangeSequence: number;
  throughChangeSequence: number;
  entityTypes?: readonly PullTypedPlanningEntityType[];
  limit: number;
}): Promise<TursoPlanningChangeRecord[]> {
  const limit = Math.max(1, input.limit);
  const changes: TursoPlanningChangeRecord[] = [];
  let afterChangeSequence = input.afterChangeSequence;

  while (afterChangeSequence < input.throughChangeSequence) {
    const page = await input.adapter.listPlanningChangesInWindow({
      vaultId: input.vaultId,
      afterChangeSequence,
      throughChangeSequence: input.throughChangeSequence,
      entityTypes: input.entityTypes,
      limit,
    });
    if (page.length === 0) {
      break;
    }
    changes.push(...page);
    afterChangeSequence = page[page.length - 1]!.changeSequence;
    if (page.length < limit) {
      break;
    }
  }

  return changes;
}

function getPlanningApplyOrder(entityType: string): number {
  switch (entityType) {
    case "path":
      return 10;
    case "expedition":
      return 20;
    case "milestone":
      return 30;
    case "week_plan":
      return 40;
    case "week_plan_item":
      return 50;
    default:
      return 100;
  }
}

function createEmptyPullEntityCounts(): Record<PullTypedPlanningEntityType, number> {
  return {
    week_plan: 0,
    week_plan_item: 0,
    path: 0,
    expedition: 0,
    milestone: 0,
  };
}

function createEmptyRetiredLocalOnlyCounts(): RetiredLocalOnlyHierarchyCounts {
  return {
    path: 0,
    expedition: 0,
    milestone: 0,
  };
}

function createEmptyWeeklyMaterializationCounts(): WeeklyPlanningMaterializationCounts {
  return {
    created: 0,
    updated: 0,
    adopted: 0,
    protected: 0,
    conflict: 0,
    skipped: 0,
  };
}

async function loadHierarchyAuthorityIds(
  adapter: PullTypedPlanningWeekPlansFromTursoInput["adapter"],
  vaultId: string,
): Promise<HierarchyAuthorityIds | null> {
  if (!adapter.listActivePlanningHierarchyEntityIds) {
    return null;
  }

  const [paths, expeditions, milestones] = await Promise.all([
    adapter.listActivePlanningHierarchyEntityIds({ vaultId, entityType: "path" }),
    adapter.listActivePlanningHierarchyEntityIds({ vaultId, entityType: "expedition" }),
    adapter.listActivePlanningHierarchyEntityIds({ vaultId, entityType: "milestone" }),
  ]);
  return {
    path: new Set(paths),
    expedition: new Set(expeditions),
    milestone: new Set(milestones),
  };
}

async function applyWeekPlanPlanningChange(
  txn: SQLiteQueryable,
  change: TursoPlanningChangeRecord,
  now: number,
): Promise<{ weekPlanId: string }> {
  const snapshot = parseWeekPlanSnapshot(change);
  const existing = await txn.getFirstAsync<LocalWeekPlanIdentityRow>(
    "SELECT id, week_start_date, week_end_date FROM week_plans WHERE id = ? LIMIT 1;",
    snapshot.id,
  );
  if (!existing) {
    await txn.runAsync(
      `INSERT INTO week_plans (
        id, user_id, week_start_date, week_end_date, status, summary, note,
        created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0);`,
      snapshot.id,
      snapshot.userId,
      snapshot.weekStartDate,
      snapshot.weekEndDate,
      snapshot.status,
      snapshot.summary,
      snapshot.note,
      snapshot.createdAt,
      snapshot.updatedAt,
      snapshot.deletedAt,
    );
  } else {
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
  }
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
  return { weekPlanId: snapshot.id };
}

async function applyWeekPlanItemPlanningChange(
  txn: SQLiteQueryable,
  change: TursoPlanningChangeRecord,
  now: number,
): Promise<{ weekPlanId: string; userId: string; previousLocalDate: string | null; nextLocalDate: string | null }> {
  const snapshot = parseWeekPlanItemSnapshot(change);
  await assertNoWeekPlanItemKeyCollision(txn, snapshot);
  const existing = await txn.getFirstAsync<LocalWeekPlanItemIdentityRow>(
    "SELECT id, week_plan_id, user_id, local_date, created_mark_instance_id FROM week_plan_items WHERE id = ? LIMIT 1;",
    snapshot.id,
  );
  if (!existing) {
    const parent = await txn.getFirstAsync<{ id: string }>("SELECT id FROM week_plans WHERE id = ? LIMIT 1;", snapshot.weekPlanId);
    if (!parent) {
      throw new Error(`Cannot pull Turso week_plan_item ${snapshot.id}: parent week plan ${snapshot.weekPlanId} is missing.`);
    }
    await txn.runAsync(
      `INSERT INTO week_plan_items (
        id, user_id, week_plan_id, backlog_item_id, status, local_date, start_time,
        end_time, title, path_id, template_id, expedition_id, milestone_id,
        expedition_context, milestone_context, description, note, origin, block_key,
        deterministic_import_key, import_batch_id, created_mark_instance_id, sort_order,
        order_index, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0);`,
      snapshot.id,
      snapshot.userId,
      snapshot.weekPlanId,
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
      null,
      snapshot.sortOrder,
      snapshot.orderIndex,
      snapshot.createdAt,
      snapshot.updatedAt,
      snapshot.deletedAt,
    );
  } else {
    if (existing.week_plan_id !== snapshot.weekPlanId) {
      throw new Error(`Cannot pull Turso week_plan_item ${snapshot.id}: parent week_plan_id is immutable in this phase.`);
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
  }
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
  return {
    weekPlanId: snapshot.weekPlanId,
    userId: snapshot.userId,
    previousLocalDate: existing?.local_date ?? null,
    nextLocalDate: snapshot.localDate,
  };
}

async function assertNoWeekPlanItemKeyCollision(txn: SQLiteQueryable, snapshot: TursoPlanningWeekPlanItemSnapshot) {
  if (!snapshot.deterministicImportKey || snapshot.deletedAt !== null) {
    return;
  }
  const existingByKey = await txn.getFirstAsync<{ id: string }>(
    `SELECT id
     FROM week_plan_items
     WHERE user_id = ?
       AND deterministic_import_key = ?
       AND deleted_at IS NULL
       AND id <> ?
     LIMIT 1;`,
    snapshot.userId,
    snapshot.deterministicImportKey,
    snapshot.id,
  );
  if (existingByKey) {
    throw new Error(
      `Cannot pull Turso week_plan_item ${snapshot.id}: deterministic_import_key collides with local item ${existingByKey.id}.`,
    );
  }
}

function addAffectedTrailDayDate(target: Map<string, Set<string>>, userId: string, localDate: string | null | undefined) {
  if (!localDate) {
    return;
  }
  const dates = target.get(userId) ?? new Set<string>();
  dates.add(localDate);
  target.set(userId, dates);
}

async function listWeekPlanIdsNeedingPrimerRepair(txn: SQLiteQueryable): Promise<string[]> {
  const rows = await txn.getAllAsync<{ week_plan_id: string }>(
    `SELECT DISTINCT wpi.week_plan_id
     FROM week_plan_items wpi
     INNER JOIN week_plans wp
       ON wp.id = wpi.week_plan_id
      AND wp.deleted_at IS NULL
      AND wp.status IN ('draft', 'active')
     INNER JOIN mark_instances mi
       ON mi.id = wpi.created_mark_instance_id
      AND mi.deleted_at IS NULL
     LEFT JOIN mark_instance_details mid
       ON mid.mark_instance_id = mi.id
      AND mid.deleted_at IS NULL
     WHERE wpi.deleted_at IS NULL
       AND wpi.sync_status = 'synced'
       AND wpi.status NOT IN ('removed', 'done')
       AND TRIM(COALESCE(wpi.description, '')) <> ''
       AND TRIM(COALESCE(mid.primer_snapshot, '')) = ''
     ORDER BY wpi.week_plan_id ASC;`,
  );
  return rows.map((row) => row.week_plan_id);
}

async function materializePulledWeeklyPlanItems(
  txn: SQLiteQueryable,
  input: {
    weekPlanIds?: readonly string[];
    weekPlanItemIds?: readonly string[];
    userIdByTrailDayDate: Map<string, Set<string>>;
    now: number;
  },
): Promise<WeeklyPlanningMaterializationCounts> {
  const counts = createEmptyWeeklyMaterializationCounts();
  const scopeIds = input.weekPlanItemIds ?? input.weekPlanIds ?? [];
  if (scopeIds.length === 0) {
    return counts;
  }

  const placeholders = scopeIds.map(() => "?").join(", ");
  const scopeColumn = input.weekPlanItemIds ? "id" : "week_plan_id";
  const rows = await txn.getAllAsync<WeekPlanItemRow>(
    `SELECT
       id, user_id, week_plan_id, backlog_item_id, status, local_date, start_time,
       end_time, title, path_id, template_id, expedition_id, milestone_id,
       expedition_context, milestone_context, description, note, origin, block_key,
       deterministic_import_key, import_batch_id, created_mark_instance_id, sort_order,
       order_index, created_at, updated_at, deleted_at, local_revision
     FROM week_plan_items
     WHERE ${scopeColumn} IN (${placeholders})
       AND deleted_at IS NULL
       AND status NOT IN ('removed', 'done')
     ORDER BY week_plan_id ASC, sort_order ASC, order_index ASC, id ASC;`,
    ...scopeIds,
  );
  if (rows.length === 0) {
    await recomputeAffectedTrailDayCounters(txn, input.userIdByTrailDayDate, input.now);
    return counts;
  }

  const txRepos = createSQLiteRepositoryProvider(async () => txn as any, async () => txn, true);
  for (const row of rows) {
    const item = mapWeekPlanItemRow(row);
    const result = await materializeWeeklyPlannedMark(txRepos, row.user_id, item, { allowOverlap: true });
    counts[result.outcome] += 1;
    if (result.outcome === "conflict") {
      throw new Error(`Cannot materialize pulled week_plan_item ${row.id}: weekly planned mark conflict.`);
    }
    if (result.mark) {
      const trailDay = await txn.getFirstAsync<{ local_date: string }>(
        "SELECT local_date FROM trail_days WHERE id = ? LIMIT 1;",
        result.mark.trailDayId,
      );
      addAffectedTrailDayDate(input.userIdByTrailDayDate, result.mark.userId, trailDay?.local_date ?? null);
    }
  }

  await txn.runAsync(
    `UPDATE week_plan_items
     SET sync_status = 'synced'
     WHERE ${scopeColumn} IN (${placeholders});`,
    ...scopeIds,
  );
  await recomputeAffectedTrailDayCounters(txn, input.userIdByTrailDayDate, input.now);
  return counts;
}

function mapWeekPlanItemRow(row: WeekPlanItemRow): WeekPlanItem {
  return {
    id: row.id,
    weekPlanId: row.week_plan_id,
    backlogItemId: row.backlog_item_id ?? undefined,
    status: row.status as WeekPlanItem["status"],
    localDate: row.local_date ?? undefined,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    title: row.title ?? undefined,
    pathId: row.path_id ?? undefined,
    templateId: row.template_id ?? undefined,
    expeditionId: row.expedition_id ?? undefined,
    milestoneId: row.milestone_id ?? undefined,
    expeditionContext: row.expedition_context ?? undefined,
    milestoneContext: row.milestone_context ?? undefined,
    description: row.description ?? undefined,
    note: row.note ?? undefined,
    origin: (row.origin as WeekPlanItem["origin"] | null) ?? undefined,
    blockKey: (row.block_key as WeekPlanItem["blockKey"] | null) ?? undefined,
    deterministicImportKey: row.deterministic_import_key ?? undefined,
    createdMarkInstanceId: row.created_mark_instance_id ?? undefined,
    importBatchId: row.import_batch_id ?? undefined,
    sortOrder: row.sort_order,
    orderIndex: row.order_index,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    deletedAt: row.deleted_at == null ? undefined : new Date(row.deleted_at).toISOString(),
    syncVersion: row.local_revision,
  };
}

async function recomputeAffectedTrailDayCounters(
  txn: SQLiteQueryable,
  affectedDatesByUserId: Map<string, Set<string>>,
  now: number,
) {
  for (const [userId, dates] of affectedDatesByUserId.entries()) {
    for (const localDate of dates) {
      const trailDay = await txn.getFirstAsync<{ id: string }>(
        "SELECT id FROM trail_days WHERE user_id = ? AND local_date = ? AND deleted_at IS NULL LIMIT 1;",
        userId,
        localDate,
      );
      if (trailDay) {
        await recomputeTrailDayCountersFromPulledMarks(txn, trailDay.id, now);
      }
    }
  }
}

async function applyTrailDaySnapshotFromTurso(
  txn: SQLiteQueryable,
  input: {
    vaultId: string;
    snapshot: TursoPlanningTrailDaySnapshot;
    now: number;
  },
): Promise<
  | { status: "inserted" }
  | { status: "updated" }
  | { status: "skipped" }
  | { status: "conflict"; message: string }
> {
  const { snapshot } = input;
  assertEnumValue(snapshot.status, ["open", "closed"], `trail_day ${snapshot.id} status`);
  if (snapshot.anchorPathId) {
    const anchorPath = await txn.getFirstAsync<{ id: string }>(
      "SELECT id FROM paths WHERE id = ? AND deleted_at IS NULL LIMIT 1;",
      snapshot.anchorPathId,
    );
    if (!anchorPath) {
      return {
        status: "conflict",
        message: `Cannot pull Turso trail_day ${snapshot.id}: anchor path ${snapshot.anchorPathId} is missing.`,
      };
    }
  }

  const existing = await txn.getFirstAsync<LocalTrailDayIdentityRow>(
    "SELECT id, user_id, local_date, local_revision, updated_at, deleted_at FROM trail_days WHERE id = ? LIMIT 1;",
    snapshot.id,
  );
  if (!existing) {
    if (snapshot.deletedAt !== null) {
      return { status: "skipped" };
    }
    const dateCollision = await txn.getFirstAsync<{ id: string }>(
      "SELECT id FROM trail_days WHERE user_id = ? AND local_date = ? LIMIT 1;",
      snapshot.userId,
      snapshot.localDate,
    );
    if (dateCollision) {
      return {
        status: "conflict",
        message: `Cannot pull Turso trail_day ${snapshot.id}: local date ${snapshot.localDate} already belongs to ${dateCollision.id}.`,
      };
    }
    await insertPulledTrailDay(txn, snapshot);
    return { status: "inserted" };
  }

  if (existing.user_id !== snapshot.userId) {
    return { status: "conflict", message: `Cannot pull Turso trail_day ${snapshot.id}: user_id is immutable.` };
  }
  if (existing.local_date !== snapshot.localDate) {
    return { status: "conflict", message: `Cannot pull Turso trail_day ${snapshot.id}: local_date is immutable.` };
  }
  if (existing.updated_at >= snapshot.updatedAt && sameNullableNumber(existing.deleted_at, snapshot.deletedAt)) {
    return { status: "skipped" };
  }

  await supersedeOpenLocalTrailDayOutbox(txn, {
    vaultId: input.vaultId,
    trailDayId: snapshot.id,
    now: input.now,
  });
  await updatePulledTrailDay(txn, snapshot, existing.local_revision);
  return { status: "updated" };
}

async function insertPulledTrailDay(txn: SQLiteQueryable, snapshot: TursoPlanningTrailDaySnapshot) {
  await txn.runAsync(
    `INSERT INTO trail_days (
      id, user_id, local_date, status, anchor_path_id, closed_at, reopened_at,
      close_summary, tomorrow_first_step, character_result, planned_mark_count,
      completed_mark_count, skipped_mark_count, memory_count, created_at,
      updated_at, deleted_at, sync_status, local_revision
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0);`,
    snapshot.id,
    snapshot.userId,
    snapshot.localDate,
    snapshot.status,
    snapshot.anchorPathId,
    snapshot.closedAt,
    snapshot.reopenedAt,
    snapshot.closeSummary,
    snapshot.tomorrowFirstStep,
    snapshot.characterResult,
    snapshot.plannedMarkCount,
    snapshot.completedMarkCount,
    snapshot.skippedMarkCount,
    snapshot.memoryCount,
    snapshot.createdAt,
    snapshot.updatedAt,
    snapshot.deletedAt,
  );
}

async function updatePulledTrailDay(
  txn: SQLiteQueryable,
  snapshot: TursoPlanningTrailDaySnapshot,
  localRevision: number,
) {
  await txn.runAsync(
    `UPDATE trail_days
     SET status = ?,
         anchor_path_id = ?,
         closed_at = ?,
         reopened_at = ?,
         close_summary = ?,
         tomorrow_first_step = ?,
         character_result = ?,
         planned_mark_count = ?,
         completed_mark_count = ?,
         skipped_mark_count = ?,
         memory_count = ?,
         updated_at = ?,
         deleted_at = ?,
         sync_status = 'synced',
         local_revision = ?
     WHERE id = ?;`,
    snapshot.status,
    snapshot.anchorPathId,
    snapshot.closedAt,
    snapshot.reopenedAt,
    snapshot.closeSummary,
    snapshot.tomorrowFirstStep,
    snapshot.characterResult,
    snapshot.plannedMarkCount,
    snapshot.completedMarkCount,
    snapshot.skippedMarkCount,
    snapshot.memoryCount,
    snapshot.updatedAt,
    snapshot.deletedAt,
    localRevision,
    snapshot.id,
  );
}

async function supersedeOpenLocalTrailDayOutbox(
  txn: SQLiteQueryable,
  input: { vaultId: string; trailDayId: string; now: number },
) {
  await txn.runAsync(
    `UPDATE sync_outbox
     SET status = 'conflict',
         last_error = 'Superseded by full Turso Trail Day pull.',
         updated_at = ?,
         synced_at = NULL
     WHERE vault_id = ?
       AND entity_type = 'trail_day'
       AND entity_id = ?
       AND status IN ('pending', 'syncing', 'failed', 'conflict');`,
    input.now,
    input.vaultId,
    input.trailDayId,
  );
}

async function applyMarkInstanceSnapshotFromTurso(
  txn: SQLiteQueryable,
  input: {
    vaultId: string;
    snapshot: TursoPlanningMarkInstanceSnapshot;
    now: number;
  },
): Promise<
  | { status: "inserted" }
  | { status: "updated"; previousTrailDayId: string }
  | { status: "skipped" }
  | { status: "conflict"; message: string }
> {
  const { snapshot } = input;
  assertMarkSnapshotIsSupported(snapshot);
  const existing = await txn.getFirstAsync<LocalMarkInstanceIdentityRow>(
    `SELECT id, user_id, trail_day_id, sync_status, local_revision, updated_at, deleted_at
     FROM mark_instances
     WHERE id = ?
     LIMIT 1;`,
    snapshot.id,
  );

  if (!existing) {
    if (snapshot.deletedAt !== null) {
      return { status: "skipped" };
    }
    const missingParent = await findMissingMarkSnapshotParent(txn, snapshot);
    if (missingParent) {
      return { status: "conflict", message: missingParent };
    }
    await insertPulledMarkInstance(txn, snapshot);
    return { status: "inserted" };
  }

  if (existing.user_id !== snapshot.userId) {
    return { status: "conflict", message: `Cannot pull Turso mark ${snapshot.id}: user_id is immutable.` };
  }
  if (await hasOpenLocalOutboxForMark(txn, input.vaultId, snapshot.id)) {
    return { status: "conflict", message: `Skipped Turso mark ${snapshot.id}: local outbox still has unsynced mark changes.` };
  }
  if (isMarkLocallyDirty(existing.sync_status, existing.local_revision)) {
    return { status: "conflict", message: `Skipped Turso mark ${snapshot.id}: local mark is dirty.` };
  }
  const missingParent = await findMissingMarkSnapshotParent(txn, snapshot);
  if (missingParent) {
    return { status: "conflict", message: missingParent };
  }
  if (existing.updated_at >= snapshot.updatedAt && sameNullableNumber(existing.deleted_at, snapshot.deletedAt)) {
    return { status: "skipped" };
  }

  await updatePulledMarkInstance(txn, snapshot, existing.local_revision);
  return { status: "updated", previousTrailDayId: existing.trail_day_id };
}

async function insertPulledMarkInstance(txn: SQLiteQueryable, snapshot: TursoPlanningMarkInstanceSnapshot) {
  await txn.runAsync(
    `INSERT INTO mark_instances (
      id, user_id, path_id, trail_day_id, template_id, expedition_id, milestone_id,
      title, description, origin, status, scheduled_start_at, scheduled_end_at,
      due_at, completed_at, skipped_at, expired_at, proof_note, completion_summary,
      substituted_by_mark_id, rescheduled_to_mark_id, source_backlog_item_id,
      generation_key, created_at, updated_at, deleted_at, sync_status, local_revision
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0);`,
    snapshot.id,
    snapshot.userId,
    snapshot.pathId,
    snapshot.trailDayId,
    snapshot.templateId,
    snapshot.expeditionId,
    snapshot.milestoneId,
    snapshot.title,
    snapshot.description,
    snapshot.origin,
    snapshot.status,
    snapshot.scheduledStartAt,
    snapshot.scheduledEndAt,
    snapshot.dueAt,
    snapshot.completedAt,
    snapshot.skippedAt,
    snapshot.expiredAt,
    snapshot.proofNote,
    snapshot.completionSummary,
    snapshot.substitutedByMarkId,
    snapshot.rescheduledToMarkId,
    snapshot.sourceBacklogItemId,
    snapshot.generationKey,
    snapshot.createdAt,
    snapshot.updatedAt,
    snapshot.deletedAt,
  );
}

async function updatePulledMarkInstance(
  txn: SQLiteQueryable,
  snapshot: TursoPlanningMarkInstanceSnapshot,
  localRevision: number,
) {
  await txn.runAsync(
    `UPDATE mark_instances
     SET path_id = ?,
         trail_day_id = ?,
         template_id = ?,
         expedition_id = ?,
         milestone_id = ?,
         title = ?,
         description = ?,
         origin = ?,
         status = ?,
         scheduled_start_at = ?,
         scheduled_end_at = ?,
         due_at = ?,
         completed_at = ?,
         skipped_at = ?,
         expired_at = ?,
         proof_note = ?,
         completion_summary = ?,
         substituted_by_mark_id = ?,
         rescheduled_to_mark_id = ?,
         source_backlog_item_id = ?,
         generation_key = ?,
         updated_at = ?,
         deleted_at = ?,
         sync_status = 'synced',
         local_revision = ?
     WHERE id = ?;`,
    snapshot.pathId,
    snapshot.trailDayId,
    snapshot.templateId,
    snapshot.expeditionId,
    snapshot.milestoneId,
    snapshot.title,
    snapshot.description,
    snapshot.origin,
    snapshot.status,
    snapshot.scheduledStartAt,
    snapshot.scheduledEndAt,
    snapshot.dueAt,
    snapshot.completedAt,
    snapshot.skippedAt,
    snapshot.expiredAt,
    snapshot.proofNote,
    snapshot.completionSummary,
    snapshot.substitutedByMarkId,
    snapshot.rescheduledToMarkId,
    snapshot.sourceBacklogItemId,
    snapshot.generationKey,
    snapshot.updatedAt,
    snapshot.deletedAt,
    localRevision,
    snapshot.id,
  );
}

async function findMissingMarkSnapshotParent(txn: SQLiteQueryable, snapshot: TursoPlanningMarkInstanceSnapshot): Promise<string | null> {
  const path = await txn.getFirstAsync<{ id: string }>("SELECT id FROM paths WHERE id = ? LIMIT 1;", snapshot.pathId);
  if (!path) {
    return `Cannot pull Turso mark ${snapshot.id}: parent path ${snapshot.pathId} is missing.`;
  }
  const trailDay = await txn.getFirstAsync<{ id: string }>("SELECT id FROM trail_days WHERE id = ? LIMIT 1;", snapshot.trailDayId);
  if (!trailDay) {
    return `Cannot pull Turso mark ${snapshot.id}: parent trail_day ${snapshot.trailDayId} is missing.`;
  }
  if (snapshot.expeditionId) {
    const expedition = await txn.getFirstAsync<{ id: string }>(
      "SELECT id FROM expeditions WHERE id = ? LIMIT 1;",
      snapshot.expeditionId,
    );
    if (!expedition) {
      return `Cannot pull Turso mark ${snapshot.id}: parent expedition ${snapshot.expeditionId} is missing.`;
    }
  }
  if (snapshot.milestoneId) {
    const milestone = await txn.getFirstAsync<{ id: string }>(
      "SELECT id FROM milestones WHERE id = ? LIMIT 1;",
      snapshot.milestoneId,
    );
    if (!milestone) {
      return `Cannot pull Turso mark ${snapshot.id}: parent milestone ${snapshot.milestoneId} is missing.`;
    }
  }
  return null;
}

async function hasOpenLocalOutboxForMark(txn: SQLiteQueryable, vaultId: string, markId: string): Promise<boolean> {
  const row = await txn.getFirstAsync<{ id: string }>(
    `SELECT id
     FROM sync_outbox
     WHERE vault_id = ?
       AND entity_type = 'mark_instance'
       AND entity_id = ?
       AND status IN ('pending', 'syncing', 'failed', 'conflict')
     LIMIT 1;`,
    vaultId,
    markId,
  );
  return row !== null;
}

async function recomputeTrailDayCountersFromPulledMarks(txn: SQLiteQueryable, trailDayId: string, now: number) {
  const counts = await txn.getFirstAsync<{
    planned_mark_count: number | null;
    completed_mark_count: number | null;
    skipped_mark_count: number | null;
    memory_count: number | null;
  }>(
    `SELECT
       COALESCE(SUM(CASE
         WHEN mi.origin IN ('weekly_planned', 'manual_plan', 'backlog_converted')
          AND mi.status <> 'cancelled'
         THEN 1 ELSE 0 END), 0) AS planned_mark_count,
       COALESCE(SUM(CASE WHEN mi.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_mark_count,
       COALESCE(SUM(CASE WHEN mi.status = 'skipped' THEN 1 ELSE 0 END), 0) AS skipped_mark_count,
       (SELECT COUNT(*) FROM memories mem WHERE mem.trail_day_id = ? AND mem.deleted_at IS NULL) AS memory_count
     FROM mark_instances mi
     WHERE mi.trail_day_id = ?
       AND mi.deleted_at IS NULL;`,
    trailDayId,
    trailDayId,
  );
  await txn.runAsync(
    `UPDATE trail_days
     SET planned_mark_count = ?,
         completed_mark_count = ?,
         skipped_mark_count = ?,
         memory_count = ?,
         updated_at = ?
     WHERE id = ?;`,
    counts?.planned_mark_count ?? 0,
    counts?.completed_mark_count ?? 0,
    counts?.skipped_mark_count ?? 0,
    counts?.memory_count ?? 0,
    now,
    trailDayId,
  );
}

function assertMarkSnapshotIsSupported(snapshot: TursoPlanningMarkInstanceSnapshot) {
  assertEnumValue(
    snapshot.status,
    ["planned", "ready", "blocked", "active", "completed", "partially_completed", "skipped", "expired", "rescheduled", "substituted", "cancelled"],
    `mark_instance ${snapshot.id} status`,
  );
}

function isMarkLocallyDirty(syncStatus: string, localRevision: number): boolean {
  return syncStatus === "dirty" || syncStatus === "conflict" || (syncStatus === "local" && localRevision > 0);
}

function sameNullableNumber(left: number | null, right: number | null): boolean {
  return left === right;
}

async function applyPathPlanningChange(
  txn: SQLiteQueryable,
  change: TursoPlanningChangeRecord,
  now: number,
): Promise<HierarchyApplyStatus> {
  const snapshot = parsePathSnapshot(change);
  const existing = await txn.getFirstAsync<LocalPathIdentityRow>(
    "SELECT id, user_id, slug, local_revision, sync_status FROM paths WHERE id = ? LIMIT 1;",
    snapshot.id,
  );
  assertEnumValue(snapshot.status, ["active", "paused", "archived"], `path ${snapshot.id} status`);
  if (!existing) {
    await txn.runAsync(
      `INSERT INTO paths (
        id, user_id, name, subtitle, slug, title, description, status, color_token,
        icon_key, sort_order, is_active, hero_media_asset_id, created_at, updated_at,
        deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0);`,
      snapshot.id,
      snapshot.userId,
      snapshot.name,
      snapshot.subtitle,
      snapshot.slug,
      snapshot.title,
      snapshot.description,
      snapshot.status,
      snapshot.colorToken,
      snapshot.iconKey,
      snapshot.sortOrder,
      snapshot.isActive,
      snapshot.heroMediaAssetId,
      snapshot.createdAt,
      snapshot.updatedAt,
      snapshot.deletedAt,
    );
    await upsertPlanningEntityState(txn, change, now);
    return { status: "applied" };
  }
  if (existing.user_id !== snapshot.userId) {
    throw new Error(`Cannot pull Turso path ${snapshot.id}: user_id is immutable.`);
  }
  if (existing.slug !== snapshot.slug) {
    throw new Error(`Cannot pull Turso path ${snapshot.id}: slug is immutable in this phase.`);
  }
  await acceptHierarchyRemoteAsAuthorityIfDirty(txn, {
    change,
    entityType: "path",
    localRevision: existing.local_revision,
    syncStatus: existing.sync_status,
    now,
  });

  await txn.runAsync(
    `UPDATE paths
     SET name = ?,
         subtitle = ?,
         title = ?,
         description = ?,
         status = ?,
         color_token = ?,
         icon_key = ?,
         sort_order = ?,
         is_active = ?,
         hero_media_asset_id = ?,
         updated_at = ?,
         deleted_at = ?,
         sync_status = 'synced'
     WHERE id = ?;`,
    snapshot.name,
    snapshot.subtitle,
    snapshot.title,
    snapshot.description,
    snapshot.status,
    snapshot.colorToken,
    snapshot.iconKey,
    snapshot.sortOrder,
    snapshot.isActive,
    snapshot.heroMediaAssetId,
    snapshot.updatedAt,
    snapshot.deletedAt,
    snapshot.id,
  );
  await upsertPlanningEntityState(txn, change, now);
  return { status: "applied" };
}

async function applyExpeditionPlanningChange(
  txn: SQLiteQueryable,
  change: TursoPlanningChangeRecord,
  now: number,
): Promise<HierarchyApplyStatus> {
  const snapshot = parseExpeditionSnapshot(change);
  const existing = await txn.getFirstAsync<LocalExpeditionIdentityRow>(
    "SELECT id, user_id, path_id, local_revision, sync_status FROM expeditions WHERE id = ? LIMIT 1;",
    snapshot.id,
  );
  assertEnumValue(snapshot.status, ["planned", "active", "paused", "completed", "archived"], `expedition ${snapshot.id} status`);
  await assertLocalRowExists(txn, "paths", snapshot.pathId, `Cannot pull Turso expedition ${snapshot.id}: parent path ${snapshot.pathId} is missing.`);
  if (!existing) {
    await txn.runAsync(
      `INSERT INTO expeditions (
        id, user_id, path_id, title, purpose, description, status, sort_order,
        start_date, target_date, started_at, target_end_at, completed_at,
        hero_media_asset_id, created_at, updated_at, deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0);`,
      snapshot.id,
      snapshot.userId,
      snapshot.pathId,
      snapshot.title,
      snapshot.purpose,
      snapshot.description,
      snapshot.status,
      snapshot.sortOrder,
      snapshot.startDate,
      snapshot.targetDate,
      snapshot.startedAt,
      snapshot.targetEndAt,
      snapshot.completedAt,
      snapshot.heroMediaAssetId,
      snapshot.createdAt,
      snapshot.updatedAt,
      snapshot.deletedAt,
    );
    await upsertPlanningEntityState(txn, change, now);
    return { status: "applied" };
  }
  if (existing.user_id !== snapshot.userId) {
    throw new Error(`Cannot pull Turso expedition ${snapshot.id}: user_id is immutable.`);
  }
  if (existing.path_id !== snapshot.pathId) {
    throw new Error(`Cannot pull Turso expedition ${snapshot.id}: path_id is immutable in this phase.`);
  }
  await acceptHierarchyRemoteAsAuthorityIfDirty(txn, {
    change,
    entityType: "expedition",
    localRevision: existing.local_revision,
    syncStatus: existing.sync_status,
    now,
  });

  await txn.runAsync(
    `UPDATE expeditions
     SET title = ?,
         purpose = ?,
         description = ?,
         status = ?,
         sort_order = ?,
         start_date = ?,
         target_date = ?,
         started_at = ?,
         target_end_at = ?,
         completed_at = ?,
         hero_media_asset_id = ?,
         updated_at = ?,
         deleted_at = ?,
         sync_status = 'synced'
     WHERE id = ?;`,
    snapshot.title,
    snapshot.purpose,
    snapshot.description,
    snapshot.status,
    snapshot.sortOrder,
    snapshot.startDate,
    snapshot.targetDate,
    snapshot.startedAt,
    snapshot.targetEndAt,
    snapshot.completedAt,
    snapshot.heroMediaAssetId,
    snapshot.updatedAt,
    snapshot.deletedAt,
    snapshot.id,
  );
  await upsertPlanningEntityState(txn, change, now);
  return { status: "applied" };
}

async function applyMilestonePlanningChange(
  txn: SQLiteQueryable,
  change: TursoPlanningChangeRecord,
  now: number,
): Promise<HierarchyApplyStatus> {
  const snapshot = parseMilestoneSnapshot(change);
  const existing = await txn.getFirstAsync<LocalMilestoneIdentityRow>(
    "SELECT id, user_id, expedition_id, local_revision, sync_status FROM milestones WHERE id = ? LIMIT 1;",
    snapshot.id,
  );
  assertEnumValue(snapshot.status, ["planned", "active", "completed", "missed", "archived"], `milestone ${snapshot.id} status`);
  await assertLocalRowExists(
    txn,
    "expeditions",
    snapshot.expeditionId,
    `Cannot pull Turso milestone ${snapshot.id}: parent expedition ${snapshot.expeditionId} is missing.`,
  );
  if (!existing) {
    await txn.runAsync(
      `INSERT INTO milestones (
        id, user_id, expedition_id, title, description, status, start_date,
        target_date, sort_order, order_index, completed_at, created_at, updated_at,
        deleted_at, sync_status, local_revision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0);`,
      snapshot.id,
      snapshot.userId,
      snapshot.expeditionId,
      snapshot.title,
      snapshot.description,
      snapshot.status,
      snapshot.startDate,
      snapshot.targetDate,
      snapshot.sortOrder,
      snapshot.orderIndex,
      snapshot.completedAt,
      snapshot.createdAt,
      snapshot.updatedAt,
      snapshot.deletedAt,
    );
    await upsertPlanningEntityState(txn, change, now);
    return { status: "applied" };
  }
  if (existing.user_id !== snapshot.userId) {
    throw new Error(`Cannot pull Turso milestone ${snapshot.id}: user_id is immutable.`);
  }
  if (existing.expedition_id !== snapshot.expeditionId) {
    throw new Error(`Cannot pull Turso milestone ${snapshot.id}: expedition_id is immutable in this phase.`);
  }
  await acceptHierarchyRemoteAsAuthorityIfDirty(txn, {
    change,
    entityType: "milestone",
    localRevision: existing.local_revision,
    syncStatus: existing.sync_status,
    now,
  });

  await txn.runAsync(
    `UPDATE milestones
     SET title = ?,
         description = ?,
         status = ?,
         start_date = ?,
         target_date = ?,
         sort_order = ?,
         order_index = ?,
         completed_at = ?,
         updated_at = ?,
         deleted_at = ?,
         sync_status = 'synced'
     WHERE id = ?;`,
    snapshot.title,
    snapshot.description,
    snapshot.status,
    snapshot.startDate,
    snapshot.targetDate,
    snapshot.sortOrder,
    snapshot.orderIndex,
    snapshot.completedAt,
    snapshot.updatedAt,
    snapshot.deletedAt,
    snapshot.id,
  );
  await upsertPlanningEntityState(txn, change, now);
  return { status: "applied" };
}

async function reconcileLocalHierarchyToTursoAuthority(
  txn: SQLiteQueryable,
  input: {
    vaultId: string;
    authorityIds: HierarchyAuthorityIds;
    now: number;
  },
): Promise<RetiredLocalOnlyHierarchyCounts> {
  const counts = createEmptyRetiredLocalOnlyCounts();
  const entities: Array<{ entityType: TursoPlanningHierarchyEntityType; tableName: "paths" | "expeditions" | "milestones" }> = [
    { entityType: "milestone", tableName: "milestones" },
    { entityType: "expedition", tableName: "expeditions" },
    { entityType: "path", tableName: "paths" },
  ];

  for (const { entityType, tableName } of entities) {
    const localRows = await txn.getAllAsync<{ id: string }>(
      `SELECT id FROM ${tableName} WHERE deleted_at IS NULL ORDER BY id ASC;`,
    );
    for (const row of localRows) {
      if (input.authorityIds[entityType].has(row.id)) {
        continue;
      }
      await retireLocalOnlyHierarchyEntity(txn, {
        vaultId: input.vaultId,
        entityType,
        tableName,
        entityId: row.id,
        now: input.now,
      });
      counts[entityType] += 1;
    }
  }

  return counts;
}

async function retireLocalOnlyHierarchyEntity(
  txn: SQLiteQueryable,
  input: {
    vaultId: string;
    entityType: TursoPlanningHierarchyEntityType;
    tableName: "paths" | "expeditions" | "milestones";
    entityId: string;
    now: number;
  },
): Promise<void> {
  const message = "Superseded by Turso authoritative hierarchy snapshot: entity is absent remotely.";
  await txn.runAsync(
    `UPDATE planning_conflicts
     SET status = 'resolved',
         reason = ?,
         updated_at = ?
     WHERE vault_id = ?
       AND entity_type = ?
       AND entity_id = ?
       AND status = 'open';`,
    message,
    input.now,
    input.vaultId,
    input.entityType,
    input.entityId,
  );
  await txn.runAsync(
    `UPDATE sync_outbox
     SET status = 'conflict',
         last_error = ?,
         updated_at = ?,
         synced_at = NULL
     WHERE vault_id = ?
       AND entity_type = ?
       AND entity_id = ?
       AND status IN ('pending', 'syncing', 'failed', 'conflict');`,
    message,
    input.now,
    input.vaultId,
    input.entityType,
    input.entityId,
  );
  await txn.runAsync(
    `UPDATE ${input.tableName}
     SET updated_at = ?,
         deleted_at = ?,
         sync_status = 'synced'
     WHERE id = ?
       AND deleted_at IS NULL;`,
    input.now,
    input.now,
    input.entityId,
  );
  await txn.runAsync(
    `DELETE FROM planning_entity_state
     WHERE vault_id = ?
       AND entity_type = ?
       AND entity_id = ?;`,
    input.vaultId,
    input.entityType,
    input.entityId,
  );
}

function parseWeekPlanSnapshot(change: TursoPlanningChangeRecord) {
  const payload = change.payloadSnapshot;
  const id = assertString(payload.id, "week_plan.id");
  return {
    id,
    userId: assertString(payload.user_id, "week_plan.user_id"),
    weekStartDate: assertString(payload.week_start_date, "week_plan.week_start_date"),
    weekEndDate: assertString(payload.week_end_date, "week_plan.week_end_date"),
    status: assertString(payload.status, "week_plan.status"),
    summary: nullableString(payload.summary, "week_plan.summary"),
    note: nullableString(payload.note, "week_plan.note"),
    createdAt: assertNumber(payload.created_at, "week_plan.created_at"),
    updatedAt: assertNumber(payload.updated_at, "week_plan.updated_at"),
    deletedAt: nullableNumber(payload.deleted_at, "week_plan.deleted_at"),
  };
}

function parseWeekPlanItemSnapshot(change: TursoPlanningChangeRecord) {
  const payload = change.payloadSnapshot;
  return {
    id: assertString(payload.id, "week_plan_item.id"),
    vaultId: change.vaultId,
    userId: assertString(payload.user_id, "week_plan_item.user_id"),
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
    createdAt: assertNumber(payload.created_at, "week_plan_item.created_at"),
    updatedAt: assertNumber(payload.updated_at, "week_plan_item.updated_at"),
    deletedAt: nullableNumber(payload.deleted_at, "week_plan_item.deleted_at"),
  };
}

function parsePathSnapshot(change: TursoPlanningChangeRecord): TursoPlanningPathSnapshot {
  const payload = change.payloadSnapshot;
  const id = assertString(payload.id, "path.id");
  assertSnapshotMatchesChange(change, id, nullableString(payload.vault_id, "path.vault_id"));
  return {
    id,
    vaultId: change.vaultId,
    userId: assertString(payload.user_id, "path.user_id"),
    name: assertString(payload.name, "path.name"),
    subtitle: nullableString(payload.subtitle, "path.subtitle"),
    slug: assertString(payload.slug, "path.slug"),
    title: assertString(payload.title, "path.title"),
    description: nullableString(payload.description, "path.description"),
    status: assertString(payload.status, "path.status"),
    colorToken: nullableString(payload.color_token, "path.color_token"),
    iconKey: nullableString(payload.icon_key, "path.icon_key"),
    sortOrder: assertNumber(payload.sort_order, "path.sort_order"),
    isActive: assertInteger(payload.is_active, "path.is_active"),
    heroMediaAssetId: nullableString(payload.hero_media_asset_id, "path.hero_media_asset_id"),
    createdAt: assertNumber(payload.created_at, "path.created_at"),
    updatedAt: assertNumber(payload.updated_at, "path.updated_at"),
    deletedAt: nullableNumber(payload.deleted_at, "path.deleted_at"),
  };
}

function parseExpeditionSnapshot(change: TursoPlanningChangeRecord): TursoPlanningExpeditionSnapshot {
  const payload = change.payloadSnapshot;
  const id = assertString(payload.id, "expedition.id");
  assertSnapshotMatchesChange(change, id, nullableString(payload.vault_id, "expedition.vault_id"));
  return {
    id,
    vaultId: change.vaultId,
    userId: assertString(payload.user_id, "expedition.user_id"),
    pathId: assertString(payload.path_id, "expedition.path_id"),
    title: assertString(payload.title, "expedition.title"),
    purpose: nullableString(payload.purpose, "expedition.purpose"),
    description: nullableString(payload.description, "expedition.description"),
    status: assertString(payload.status, "expedition.status"),
    sortOrder: assertNumber(payload.sort_order, "expedition.sort_order"),
    startDate: nullableString(payload.start_date, "expedition.start_date"),
    targetDate: nullableString(payload.target_date, "expedition.target_date"),
    startedAt: nullableNumber(payload.started_at, "expedition.started_at"),
    targetEndAt: nullableNumber(payload.target_end_at, "expedition.target_end_at"),
    completedAt: nullableNumber(payload.completed_at, "expedition.completed_at"),
    heroMediaAssetId: nullableString(payload.hero_media_asset_id, "expedition.hero_media_asset_id"),
    createdAt: assertNumber(payload.created_at, "expedition.created_at"),
    updatedAt: assertNumber(payload.updated_at, "expedition.updated_at"),
    deletedAt: nullableNumber(payload.deleted_at, "expedition.deleted_at"),
  };
}

function parseMilestoneSnapshot(change: TursoPlanningChangeRecord): TursoPlanningMilestoneSnapshot {
  const payload = change.payloadSnapshot;
  const id = assertString(payload.id, "milestone.id");
  assertSnapshotMatchesChange(change, id, nullableString(payload.vault_id, "milestone.vault_id"));
  return {
    id,
    vaultId: change.vaultId,
    userId: assertString(payload.user_id, "milestone.user_id"),
    expeditionId: assertString(payload.expedition_id, "milestone.expedition_id"),
    title: assertString(payload.title, "milestone.title"),
    description: nullableString(payload.description, "milestone.description"),
    status: assertString(payload.status, "milestone.status"),
    startDate: nullableString(payload.start_date, "milestone.start_date"),
    targetDate: nullableString(payload.target_date, "milestone.target_date"),
    sortOrder: assertNumber(payload.sort_order, "milestone.sort_order"),
    orderIndex: assertNumber(payload.order_index, "milestone.order_index"),
    completedAt: nullableNumber(payload.completed_at, "milestone.completed_at"),
    createdAt: assertNumber(payload.created_at, "milestone.created_at"),
    updatedAt: assertNumber(payload.updated_at, "milestone.updated_at"),
    deletedAt: nullableNumber(payload.deleted_at, "milestone.deleted_at"),
  };
}

async function upsertPlanningEntityState(txn: SQLiteQueryable, change: TursoPlanningChangeRecord, now: number) {
  await txn.runAsync(
    `INSERT INTO planning_entity_state (
      vault_id,
      entity_type,
      entity_id,
      entity_revision,
      last_change_sequence,
      last_pulled_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(vault_id, entity_type, entity_id) DO UPDATE SET
      entity_revision = excluded.entity_revision,
      last_change_sequence = excluded.last_change_sequence,
      last_pulled_at = excluded.last_pulled_at;`,
    change.vaultId,
    change.entityType,
    change.entityId,
    change.entityRevision,
    change.changeSequence,
    now,
  );
}

async function acceptHierarchyRemoteAsAuthorityIfDirty(
  txn: SQLiteQueryable,
  input: {
    change: TursoPlanningChangeRecord;
    entityType: "path" | "expedition" | "milestone";
    localRevision: number;
    syncStatus: string;
    now: number;
  },
): Promise<void> {
  if (!isHierarchyLocallyDirty(input.syncStatus, input.localRevision)) {
    return;
  }

  const message = `Superseded by Turso planning pull change ${input.change.changeSequence}.`;
  await txn.runAsync(
    `UPDATE planning_conflicts
     SET status = 'resolved',
         reason = ?,
         remote_entity_revision = ?,
         remote_change_sequence = ?,
         updated_at = ?
     WHERE vault_id = ?
       AND entity_type = ?
       AND entity_id = ?
       AND status = 'open';`,
    message,
    input.change.entityRevision,
    input.change.changeSequence,
    input.now,
    input.change.vaultId,
    input.entityType,
    input.change.entityId,
  );
  await txn.runAsync(
    `UPDATE sync_outbox
     SET status = 'conflict',
         last_error = ?,
         updated_at = ?,
         synced_at = NULL
     WHERE vault_id = ?
       AND entity_type = ?
       AND entity_id = ?
       AND status IN ('pending', 'syncing', 'failed', 'conflict');`,
    message,
    input.now,
    input.change.vaultId,
    input.entityType,
    input.change.entityId,
  );
}

function isHierarchyLocallyDirty(syncStatus: string, localRevision: number): boolean {
  return syncStatus === "dirty" || syncStatus === "conflict" || (syncStatus === "local" && localRevision > 0);
}

async function assertLocalRowExists(txn: SQLiteQueryable, tableName: "paths" | "expeditions", id: string, message: string) {
  const row = await txn.getFirstAsync<{ id: string }>(`SELECT id FROM ${tableName} WHERE id = ? LIMIT 1;`, id);
  if (!row) {
    throw new Error(message);
  }
}

function assertSnapshotMatchesChange(change: TursoPlanningChangeRecord, payloadId: string, payloadVaultId: string | null) {
  if (payloadId !== change.entityId) {
    throw new Error(`Invalid Turso planning snapshot: payload id ${payloadId} does not match change entity ${change.entityId}.`);
  }
  if (payloadVaultId !== null && payloadVaultId !== change.vaultId) {
    throw new Error(`Invalid Turso planning snapshot: payload vault ${payloadVaultId} does not match change vault ${change.vaultId}.`);
  }
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

function assertInteger(value: unknown, label: string): number {
  const numberValue = assertNumber(value, label);
  if (Number.isInteger(numberValue)) {
    return numberValue;
  }
  throw new Error(`Invalid Turso planning snapshot: ${label} must be an integer.`);
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

function assertEnumValue(value: string, allowed: readonly string[], label: string) {
  if (allowed.includes(value)) {
    return;
  }
  throw new Error(`Invalid Turso planning snapshot: ${label} "${value}" is not supported.`);
}
