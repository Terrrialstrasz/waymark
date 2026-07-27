import type { SQLiteQueryable } from "../../db/adapters/SQLiteRepositoryBase";
import type {
  TursoPlanningExpeditionSnapshot,
  TursoPlanningMarkInstanceSnapshot,
  TursoPlanningMutationResult,
  TursoPlanningPathSnapshot,
  WaymarkTursoRemoteAdapter,
} from "./tursoRemoteAdapter";

type HierarchyEntityType = "path" | "expedition" | "mark_instance";

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
    "upsertPlanningPathSnapshot" | "upsertPlanningExpeditionSnapshot" | "upsertPlanningMarkInstanceSnapshot"
  >;
  vaultId: string;
  deviceId: string;
  limitPerEntity?: number;
  maxPushAttempts?: number;
  retryDelayMs?: number;
  stopOnTransientFailure?: boolean;
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
  const result = createEmptyResult();

  const paths = await input.executor.getAllAsync<PathRow>(
    `SELECT
        id, user_id, name, subtitle, slug, title, description, status, color_token,
        icon_key, sort_order, is_active, hero_media_asset_id, created_at, updated_at,
        deleted_at, local_revision
      FROM paths
      ORDER BY sort_order ASC, id ASC
      LIMIT ?;`,
    limit,
  );
  await uploadRows({
    rows: paths,
    entityType: "path",
    result,
    stopOnTransientFailure,
    toEntityId: (row) => row.id,
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

  const expeditions = await input.executor.getAllAsync<ExpeditionRow>(
    `SELECT
        id, user_id, path_id, title, purpose, description, status, sort_order,
        start_date, target_date, started_at, target_end_at, completed_at,
        hero_media_asset_id, created_at, updated_at, deleted_at, local_revision
      FROM expeditions
      ORDER BY path_id ASC, sort_order ASC, id ASC
      LIMIT ?;`,
    limit,
  );
  await uploadRows({
    rows: expeditions,
    entityType: "expedition",
    result,
    stopOnTransientFailure,
    toEntityId: (row) => row.id,
    push: async (row) => {
      const snapshot = toExpeditionSnapshot(row, input.vaultId);
      return pushPlanningSnapshotWithRetry(
        () =>
          input.adapter.upsertPlanningExpeditionSnapshot({
            snapshot,
            mutationId: buildTypedHierarchyMutationId({
              vaultId: input.vaultId,
              deviceId: input.deviceId,
              entityType: "expedition",
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

  const markInstances = await input.executor.getAllAsync<MarkInstanceRow>(
    `SELECT
        id, user_id, path_id, trail_day_id, template_id, expedition_id, milestone_id,
        title, description, origin, status, scheduled_start_at, scheduled_end_at,
        due_at, completed_at, skipped_at, expired_at, proof_note, completion_summary,
        substituted_by_mark_id, rescheduled_to_mark_id, source_backlog_item_id,
        generation_key, created_at, updated_at, deleted_at, local_revision
      FROM mark_instances
      ORDER BY path_id ASC, expedition_id ASC, scheduled_start_at ASC, id ASC
      LIMIT ?;`,
    limit,
  );
  await uploadRows({
    rows: markInstances,
    entityType: "mark_instance",
    result,
    stopOnTransientFailure,
    toEntityId: (row) => row.id,
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

function toExpeditionSnapshot(row: ExpeditionRow, vaultId: string): TursoPlanningExpeditionSnapshot {
  return {
    id: row.id,
    vaultId,
    userId: row.user_id,
    pathId: row.path_id,
    title: row.title,
    purpose: row.purpose,
    description: row.description,
    status: row.status,
    sortOrder: row.sort_order,
    startDate: row.start_date,
    targetDate: row.target_date,
    startedAt: row.started_at,
    targetEndAt: row.target_end_at,
    completedAt: row.completed_at,
    heroMediaAssetId: row.hero_media_asset_id,
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
