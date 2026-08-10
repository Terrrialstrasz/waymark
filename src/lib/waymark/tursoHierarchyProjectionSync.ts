import type { SQLiteQueryable } from "../../db/adapters/SQLiteRepositoryBase";
import type {
  TursoPlanningExpeditionProgressPatch,
  TursoPlanningMarkInstanceSnapshot,
  TursoPlanningMilestoneProgressPatch,
  TursoPlanningMutationResult,
  TursoPlanningPathSnapshot,
  TursoPlanningTrailDaySnapshot,
  WaymarkTursoRemoteAdapter,
} from "./tursoRemoteAdapter";

type HierarchyEntityType = "path" | "expedition" | "milestone" | "trail_day" | "mark_instance";

export const WAYMARK_PROGRESS_PROJECTION_ENTITY_TYPES = [
  "expedition",
  "milestone",
  "trail_day",
  "mark_instance",
] as const satisfies readonly HierarchyEntityType[];

type PathRow = {
  id: string;
  user_id: string;
  name: string;
  subtitle: string | null;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  color_token: string | null;
  icon_key: string | null;
  sort_order: number;
  is_active: number;
  hero_media_asset_id: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  local_revision: number;
};

type ExpeditionRow = {
  id: string;
  user_id: string;
  path_id: string;
  title: string;
  purpose: string | null;
  description: string | null;
  status: string;
  sort_order: number;
  start_date: string | null;
  target_date: string | null;
  started_at: number | null;
  target_end_at: number | null;
  completed_at: number | null;
  hero_media_asset_id: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  local_revision: number;
};

type MilestoneRow = {
  id: string;
  user_id: string;
  expedition_id: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  target_date: string | null;
  sort_order: number;
  order_index: number;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  local_revision: number;
};

type TrailDayRow = {
  id: string;
  user_id: string;
  local_date: string;
  status: string;
  anchor_path_id: string | null;
  closed_at: number | null;
  reopened_at: number | null;
  close_summary: string | null;
  tomorrow_first_step: string | null;
  character_result: string | null;
  planned_mark_count: number;
  completed_mark_count: number;
  skipped_mark_count: number;
  memory_count: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  local_revision: number;
};

type MarkInstanceRow = {
  id: string;
  user_id: string;
  path_id: string;
  trail_day_id: string;
  template_id: string | null;
  expedition_id: string | null;
  milestone_id: string | null;
  title: string;
  description: string | null;
  origin: string;
  status: string;
  scheduled_start_at: number | null;
  scheduled_end_at: number | null;
  due_at: number | null;
  completed_at: number | null;
  skipped_at: number | null;
  expired_at: number | null;
  proof_note: string | null;
  completion_summary: string | null;
  substituted_by_mark_id: string | null;
  rescheduled_to_mark_id: string | null;
  source_backlog_item_id: string | null;
  generation_key: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  local_revision: number;
};

type UploadStats = {
  scanned: number;
  uploaded: number;
  duplicates: number;
  failed: number;
};

export type UploadHierarchyProjectionToTursoInput = {
  executor: SQLiteQueryable;
  adapter: Pick<
    WaymarkTursoRemoteAdapter,
    | "upsertPlanningPathSnapshot"
    | "upsertPlanningTrailDaySnapshot"
    | "updatePlanningExpeditionProgressPatch"
    | "updatePlanningMilestoneProgressPatch"
    | "upsertPlanningMarkInstanceSnapshot"
  >;
  vaultId: string;
  deviceId: string;
  onlyDirty?: boolean;
  limitPerEntity?: number;
  maxPushAttempts?: number;
  retryDelayMs?: number;
  stopOnTransientFailure?: boolean;
  entityTypes?: readonly HierarchyEntityType[];
};

export type UploadHierarchyProjectionToTursoResult = {
  scanned: number;
  uploaded: number;
  duplicates: number;
  failed: Array<{ entityType: HierarchyEntityType; entityId: string; message: string }>;
  byEntityType: Record<HierarchyEntityType, UploadStats>;
  mutations: TursoPlanningMutationResult[];
  stoppedAfterTransientFailure: boolean;
};

export async function uploadHierarchyProjectionToTurso(
  input: UploadHierarchyProjectionToTursoInput,
): Promise<UploadHierarchyProjectionToTursoResult> {
  const maxPushAttempts = Math.max(1, input.maxPushAttempts ?? 2);
  const retryDelayMs = Math.max(0, input.retryDelayMs ?? 0);
  const stopOnTransientFailure = input.stopOnTransientFailure ?? true;
  const limit = input.limitPerEntity ?? 10000;
  const dirtyWhere = input.onlyDirty ? "WHERE sync_status <> 'synced'" : "";
  const entityTypes = new Set(input.entityTypes ?? ["path", "expedition", "milestone", "trail_day", "mark_instance"]);
  const result = createEmptyResult();

  const paths = await input.executor.getAllAsync<PathRow>(
    `SELECT
        id, user_id, name, subtitle, slug, title, description, status, color_token,
        icon_key, sort_order, is_active, hero_media_asset_id, created_at, updated_at,
        deleted_at, local_revision
      FROM paths
      ${dirtyWhere}
      ORDER BY sort_order ASC, id ASC
      LIMIT ?;`,
    limit,
  );
  if (entityTypes.has("path")) {
    validateUniqueIds("path", paths);
    await uploadRows({
      rows: paths,
      entityType: "path",
      result,
      stopOnTransientFailure,
      toEntityId: (row) => row.id,
      markUploaded: (row) => markHierarchyRowSynced(input.executor, "paths", row.id),
      push: async (row) => {
        const snapshot = toPathSnapshot(row, input.vaultId);
        return pushPlanningSnapshotWithRetry(
          () =>
            input.adapter.upsertPlanningPathSnapshot({
              snapshot,
              mutationId: buildTypedHierarchyMutationId({
                vaultId: input.vaultId,
                deviceId: input.deviceId,
                entityType: "path",
                entityId: row.id,
                localRevision: row.local_revision,
                payloadHash: stablePayloadHash(snapshot),
              }),
            }),
          { maxPushAttempts, retryDelayMs },
        );
      },
    });
    if (result.stoppedAfterTransientFailure) {
      return result;
    }
  }

  const trailDays = await input.executor.getAllAsync<TrailDayRow>(
    `SELECT
        id, user_id, local_date, status, anchor_path_id, closed_at, reopened_at,
        close_summary, tomorrow_first_step, character_result, planned_mark_count,
        completed_mark_count, skipped_mark_count, memory_count, created_at,
        updated_at, deleted_at, local_revision
      FROM trail_days
      ${dirtyWhere}
      ORDER BY local_date ASC, id ASC
      LIMIT ?;`,
    limit,
  );
  if (entityTypes.has("trail_day")) {
    validateUniqueIds("trail_day", trailDays);
  }
  if (entityTypes.has("trail_day") && !input.onlyDirty) {
    validateTrailDayParents(trailDays, paths);
  }
  if (entityTypes.has("trail_day")) {
    await uploadRows({
      rows: trailDays,
      entityType: "trail_day",
      result,
      stopOnTransientFailure,
      toEntityId: (row) => row.id,
      markUploaded: (row) => markHierarchyRowSynced(input.executor, "trail_days", row.id),
      push: async (row) => {
        const snapshot = toTrailDaySnapshot(row, input.vaultId);
        return pushPlanningSnapshotWithRetry(
          () =>
            input.adapter.upsertPlanningTrailDaySnapshot({
              snapshot,
              mutationId: buildTypedHierarchyMutationId({
                vaultId: input.vaultId,
                deviceId: input.deviceId,
                entityType: "trail_day",
                entityId: row.id,
                localRevision: row.local_revision,
                payloadHash: stablePayloadHash(snapshot),
              }),
            }),
          { maxPushAttempts, retryDelayMs },
        );
      },
    });
    if (result.stoppedAfterTransientFailure) {
      return result;
    }
  }

  const expeditions = await input.executor.getAllAsync<ExpeditionRow>(
    `SELECT
        id, user_id, path_id, title, purpose, description, status, sort_order,
        start_date, target_date, started_at, target_end_at, completed_at,
        hero_media_asset_id, created_at, updated_at, deleted_at, local_revision
      FROM expeditions
      ${dirtyWhere}
      ORDER BY path_id ASC, sort_order ASC, id ASC
      LIMIT ?;`,
    limit,
  );
  if (entityTypes.has("expedition")) {
    validateUniqueIds("expedition", expeditions);
  }
  if (entityTypes.has("expedition") && !input.onlyDirty) {
    validateExpeditionParents(expeditions, paths);
  }
  if (entityTypes.has("expedition")) {
    await uploadRows({
      rows: expeditions,
      entityType: "expedition",
      result,
      stopOnTransientFailure,
      toEntityId: (row) => row.id,
      markUploaded: (row) => markHierarchyRowSynced(input.executor, "expeditions", row.id),
      push: async (row) => {
        const patch = toExpeditionProgressPatch(row, input.vaultId);
        return pushPlanningSnapshotWithRetry(
          () =>
            input.adapter.updatePlanningExpeditionProgressPatch({
              patch,
              mutationId: buildTypedHierarchyMutationId({
                vaultId: input.vaultId,
                deviceId: input.deviceId,
                entityType: "expedition",
                entityId: row.id,
                localRevision: row.local_revision,
                payloadHash: stablePayloadHash(patch),
              }),
            }),
          { maxPushAttempts, retryDelayMs },
        );
      },
    });
    if (result.stoppedAfterTransientFailure) {
      return result;
    }
  }

  const milestones = await input.executor.getAllAsync<MilestoneRow>(
    `SELECT
        id, user_id, expedition_id, title, description, status, start_date,
        target_date, sort_order, order_index, completed_at, created_at,
        updated_at, deleted_at, local_revision
      FROM milestones
      ${dirtyWhere}
      ORDER BY expedition_id ASC, sort_order ASC, order_index ASC, id ASC
      LIMIT ?;`,
    limit,
  );
  if (entityTypes.has("milestone")) {
    validateUniqueIds("milestone", milestones);
  }
  if (entityTypes.has("milestone") && !input.onlyDirty) {
    validateMilestoneParents(milestones, expeditions);
  }
  if (entityTypes.has("milestone")) {
    await uploadRows({
      rows: milestones,
      entityType: "milestone",
      result,
      stopOnTransientFailure,
      toEntityId: (row) => row.id,
      markUploaded: (row) => markHierarchyRowSynced(input.executor, "milestones", row.id),
      push: async (row) => {
        const patch = toMilestoneProgressPatch(row, input.vaultId);
        return pushPlanningSnapshotWithRetry(
          () =>
            input.adapter.updatePlanningMilestoneProgressPatch({
              patch,
              mutationId: buildTypedHierarchyMutationId({
                vaultId: input.vaultId,
                deviceId: input.deviceId,
                entityType: "milestone",
                entityId: row.id,
                localRevision: row.local_revision,
                payloadHash: stablePayloadHash(patch),
              }),
            }),
          { maxPushAttempts, retryDelayMs },
        );
      },
    });

    if (result.stoppedAfterTransientFailure) {
      return result;
    }
  }

  const markInstances = await input.executor.getAllAsync<MarkInstanceRow>(
    `SELECT
        id, user_id, path_id, trail_day_id, template_id, expedition_id, milestone_id,
        title, description, origin, status, scheduled_start_at, scheduled_end_at,
        due_at, completed_at, skipped_at, expired_at, proof_note, completion_summary,
        substituted_by_mark_id, rescheduled_to_mark_id, source_backlog_item_id,
        generation_key, created_at, updated_at, deleted_at, local_revision
      FROM mark_instances
      ${dirtyWhere}
      ORDER BY path_id ASC, expedition_id ASC, milestone_id ASC, scheduled_start_at ASC, id ASC
      LIMIT ?;`,
    limit,
  );
  if (entityTypes.has("mark_instance")) {
    validateUniqueIds("mark_instance", markInstances);
  }
  if (entityTypes.has("mark_instance") && !input.onlyDirty) {
    validateMarkParents(markInstances, paths, trailDays, expeditions, milestones);
  }
  if (entityTypes.has("mark_instance")) {
    await uploadRows({
      rows: markInstances,
      entityType: "mark_instance",
      result,
      stopOnTransientFailure,
      toEntityId: (row) => row.id,
      markUploaded: (row) => markHierarchyRowSynced(input.executor, "mark_instances", row.id),
      push: async (row) => {
        const snapshot = toMarkInstanceSnapshot(row, input.vaultId);
        return pushPlanningSnapshotWithRetry(
          () =>
            input.adapter.upsertPlanningMarkInstanceSnapshot({
              snapshot,
              mutationId: buildTypedHierarchyMutationId({
                vaultId: input.vaultId,
                deviceId: input.deviceId,
                entityType: "mark_instance",
                entityId: row.id,
                localRevision: row.local_revision,
                payloadHash: stablePayloadHash(snapshot),
              }),
            }),
          { maxPushAttempts, retryDelayMs },
        );
      },
    });
  }

  return result;
}

export function buildTypedHierarchyMutationId(input: {
  vaultId: string;
  deviceId: string;
  entityType: HierarchyEntityType;
  entityId: string;
  localRevision: number;
  payloadHash: string;
}) {
  return [
    "typed_hierarchy",
    input.vaultId,
    input.deviceId,
    input.entityType,
    input.entityId,
    String(input.localRevision),
    input.payloadHash,
  ].join(":");
}

async function uploadRows<T>(input: {
  rows: T[];
  entityType: HierarchyEntityType;
  result: UploadHierarchyProjectionToTursoResult;
  stopOnTransientFailure: boolean;
  toEntityId(row: T): string;
  markUploaded(row: T): Promise<unknown>;
  push(row: T): Promise<TursoPlanningMutationResult>;
}) {
  input.result.scanned += input.rows.length;
  input.result.byEntityType[input.entityType].scanned += input.rows.length;

  for (const row of input.rows) {
    const entityId = input.toEntityId(row);
    try {
      const mutation = await input.push(row);
      input.result.mutations.push(mutation);
      if (mutation.duplicate) {
        input.result.duplicates += 1;
        input.result.byEntityType[input.entityType].duplicates += 1;
      } else {
        input.result.uploaded += 1;
        input.result.byEntityType[input.entityType].uploaded += 1;
      }
      await input.markUploaded(row);
    } catch (error) {
      const message = formatHierarchyUploadError(error);
      input.result.failed.push({ entityType: input.entityType, entityId, message });
      input.result.byEntityType[input.entityType].failed += 1;
      if (input.stopOnTransientFailure && isTransientHierarchyUploadError(error)) {
        input.result.stoppedAfterTransientFailure = true;
        break;
      }
    }
  }
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
      if (attempt >= input.maxPushAttempts || !isTransientHierarchyUploadError(error)) {
        break;
      }
      if (input.retryDelayMs > 0) {
        await delay(input.retryDelayMs);
      }
    }
  }
  throw lastError;
}

function createEmptyResult(): UploadHierarchyProjectionToTursoResult {
  return {
    scanned: 0,
    uploaded: 0,
    duplicates: 0,
    failed: [],
    byEntityType: {
      path: { scanned: 0, uploaded: 0, duplicates: 0, failed: 0 },
      expedition: { scanned: 0, uploaded: 0, duplicates: 0, failed: 0 },
      milestone: { scanned: 0, uploaded: 0, duplicates: 0, failed: 0 },
      trail_day: { scanned: 0, uploaded: 0, duplicates: 0, failed: 0 },
      mark_instance: { scanned: 0, uploaded: 0, duplicates: 0, failed: 0 },
    },
    mutations: [],
    stoppedAfterTransientFailure: false,
  };
}

function toPathSnapshot(row: PathRow, vaultId: string): TursoPlanningPathSnapshot {
  return {
    id: row.id,
    vaultId,
    userId: row.user_id,
    name: row.name,
    subtitle: row.subtitle,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    colorToken: row.color_token,
    iconKey: row.icon_key,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    heroMediaAssetId: row.hero_media_asset_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toExpeditionProgressPatch(row: ExpeditionRow, vaultId: string): TursoPlanningExpeditionProgressPatch {
  return {
    id: row.id,
    vaultId,
    status: row.status,
    startDate: row.start_date,
    targetDate: row.target_date,
    startedAt: row.started_at,
    targetEndAt: row.target_end_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function toMilestoneProgressPatch(row: MilestoneRow, vaultId: string): TursoPlanningMilestoneProgressPatch {
  return {
    id: row.id,
    vaultId,
    status: row.status,
    startDate: row.start_date,
    targetDate: row.target_date,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function toTrailDaySnapshot(row: TrailDayRow, vaultId: string): TursoPlanningTrailDaySnapshot {
  return {
    id: row.id,
    vaultId,
    userId: row.user_id,
    localDate: row.local_date,
    status: row.status,
    anchorPathId: row.anchor_path_id,
    closedAt: row.closed_at,
    reopenedAt: row.reopened_at,
    closeSummary: row.close_summary,
    tomorrowFirstStep: row.tomorrow_first_step,
    characterResult: row.character_result,
    plannedMarkCount: row.planned_mark_count,
    completedMarkCount: row.completed_mark_count,
    skippedMarkCount: row.skipped_mark_count,
    memoryCount: row.memory_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toMarkInstanceSnapshot(row: MarkInstanceRow, vaultId: string): TursoPlanningMarkInstanceSnapshot {
  return {
    id: row.id,
    vaultId,
    userId: row.user_id,
    pathId: row.path_id,
    trailDayId: row.trail_day_id,
    templateId: row.template_id,
    expeditionId: row.expedition_id,
    milestoneId: row.milestone_id,
    title: row.title,
    description: row.description,
    origin: row.origin,
    status: row.status,
    scheduledStartAt: row.scheduled_start_at,
    scheduledEndAt: row.scheduled_end_at,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    skippedAt: row.skipped_at,
    expiredAt: row.expired_at,
    proofNote: row.proof_note,
    completionSummary: row.completion_summary,
    substitutedByMarkId: row.substituted_by_mark_id,
    rescheduledToMarkId: row.rescheduled_to_mark_id,
    sourceBacklogItemId: row.source_backlog_item_id,
    generationKey: row.generation_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function validateUniqueIds(entityType: HierarchyEntityType, rows: readonly { id: string }[]) {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.id) {
      throw new Error(`Cannot upload ${entityType}: empty id.`);
    }
    if (seen.has(row.id)) {
      throw new Error(`Cannot upload ${entityType}: duplicate id ${row.id}.`);
    }
    seen.add(row.id);
  }
}

function validateExpeditionParents(expeditions: readonly ExpeditionRow[], paths: readonly PathRow[]) {
  const pathIds = new Set(paths.map((row) => row.id));
  const orphan = expeditions.find((row) => !pathIds.has(row.path_id));
  if (orphan) {
    throw new Error(`Cannot upload expedition ${orphan.id}: missing parent path ${orphan.path_id}.`);
  }
}

function validateMilestoneParents(milestones: readonly MilestoneRow[], expeditions: readonly ExpeditionRow[]) {
  const expeditionIds = new Set(expeditions.map((row) => row.id));
  const orphan = milestones.find((row) => !expeditionIds.has(row.expedition_id));
  if (orphan) {
    throw new Error(`Cannot upload milestone ${orphan.id}: missing parent expedition ${orphan.expedition_id}.`);
  }
}

function validateTrailDayParents(trailDays: readonly TrailDayRow[], paths: readonly PathRow[]) {
  const pathIds = new Set(paths.map((row) => row.id));
  const orphan = trailDays.find((row) => row.anchor_path_id !== null && !pathIds.has(row.anchor_path_id));
  if (orphan) {
    throw new Error(`Cannot upload trail_day ${orphan.id}: missing anchor path ${orphan.anchor_path_id}.`);
  }
}

function validateMarkParents(
  marks: readonly MarkInstanceRow[],
  paths: readonly PathRow[],
  trailDays: readonly TrailDayRow[],
  expeditions: readonly ExpeditionRow[],
  milestones: readonly MilestoneRow[],
) {
  const pathIds = new Set(paths.map((row) => row.id));
  const trailDayIds = new Set(trailDays.map((row) => row.id));
  const expeditionById = new Map(expeditions.map((row) => [row.id, row]));
  const milestoneById = new Map(milestones.map((row) => [row.id, row]));

  for (const mark of marks) {
    if (!pathIds.has(mark.path_id)) {
      throw new Error(`Cannot upload mark_instance ${mark.id}: missing parent path ${mark.path_id}.`);
    }
    if (!trailDayIds.has(mark.trail_day_id)) {
      throw new Error(`Cannot upload mark_instance ${mark.id}: missing parent trail_day ${mark.trail_day_id}.`);
    }
    if (mark.expedition_id && !expeditionById.has(mark.expedition_id)) {
      throw new Error(`Cannot upload mark_instance ${mark.id}: missing parent expedition ${mark.expedition_id}.`);
    }
    if (mark.milestone_id) {
      const milestone = milestoneById.get(mark.milestone_id);
      if (!milestone) {
        throw new Error(`Cannot upload mark_instance ${mark.id}: missing parent milestone ${mark.milestone_id}.`);
      }
      if (mark.expedition_id && milestone.expedition_id !== mark.expedition_id) {
        throw new Error(
          `Cannot upload mark_instance ${mark.id}: milestone ${mark.milestone_id} belongs to expedition ${milestone.expedition_id}, not ${mark.expedition_id}.`,
        );
      }
    }
  }
}

async function markHierarchyRowSynced(
  executor: SQLiteQueryable,
  tableName: "paths" | "expeditions" | "milestones" | "trail_days" | "mark_instances",
  id: string,
) {
  await executor.runAsync(`UPDATE ${tableName} SET sync_status = 'synced' WHERE id = ?;`, id);
}

function stablePayloadHash(value: unknown): string {
  const json = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(",")}}`;
}

function isTransientHierarchyUploadError(error: unknown): boolean {
  const message = formatHierarchyUploadError(error).toLowerCase();
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

function formatHierarchyUploadError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }
  return String(error).slice(0, 500);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
