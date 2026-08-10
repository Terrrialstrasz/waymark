import {
  MarkInstance,
  MarkInstanceOrigin,
  MarkInstanceStatus,
  WeekPlanItem,
  WaymarkRepositories,
} from "../../domain/waymark";
import { setMarkMetadata } from "./markMetadataStore";
import { sanitizeImportedWeeklyPlannedStorageText } from "./userFacingMarkText";
import { detectWeeklyTimetableConflicts, WeeklyTimetableConflict } from "./weeklyTimetableConflictDetector";

export type WeeklyPlannedMaterializationOutcome =
  | "created"
  | "updated"
  | "adopted"
  | "protected"
  | "conflict"
  | "skipped";

export type WeeklyPlannedMaterializationResult = {
  outcome: WeeklyPlannedMaterializationOutcome;
  itemId: string;
  mark?: MarkInstance;
  finalStatus?: MarkInstanceStatus;
  conflicts?: WeeklyTimetableConflict[];
  reason?: string;
};

const INITIAL_WEEKLY_PLANNED_MARK_STATUS = MarkInstanceStatus.Planned;

type WeeklyPlannedMaterializationOptions = {
  allowOverlap?: boolean;
  setDueAt?: boolean;
};

function buildFloatingDateTime(localDate: string, time: string): string {
  return `${localDate}T${time}:00.000`;
}

function toMarkGenerationKey(importKey: string): string {
  return importKey.startsWith("weekly_timetable:")
    ? `weekly_planned:${importKey.slice("weekly_timetable:".length)}`
    : `weekly_planned:${importKey}`;
}

function resolveMarkGenerationKey(item: WeekPlanItem): string {
  return item.deterministicImportKey ? toMarkGenerationKey(item.deterministicImportKey) : `weekly_planned:item:${item.id}`;
}

function isProtectedMark(mark: MarkInstance): boolean {
  return (
    mark.status === MarkInstanceStatus.Active ||
    mark.status === MarkInstanceStatus.Completed ||
    mark.status === MarkInstanceStatus.Skipped ||
    mark.status === MarkInstanceStatus.Rescheduled ||
    mark.status === MarkInstanceStatus.Substituted ||
    mark.status === MarkInstanceStatus.Cancelled ||
    (mark.syncVersion ?? 0) > 0
  );
}

async function isProtectedMarkWithDetail(repos: WaymarkRepositories, mark: MarkInstance): Promise<boolean> {
  if (isProtectedMark(mark)) {
    return true;
  }

  const detail = await repos.marks.getMarkInstanceDetail(mark.id);
  return Boolean(detail?.userEditedAt);
}

function isPristineUnresolvedMark(mark: MarkInstance): boolean {
  return (
    (mark.syncVersion ?? 0) === 0 &&
    (mark.status === MarkInstanceStatus.Planned ||
      mark.status === MarkInstanceStatus.Ready ||
      mark.status === MarkInstanceStatus.Blocked)
  );
}

function sameSlot(item: WeekPlanItem, mark: MarkInstance): boolean {
  return (
    mark.pathId === item.pathId &&
    mark.scheduledStartAt?.slice(0, 10) === item.localDate &&
    mark.scheduledEndAt?.slice(0, 10) === item.localDate &&
    mark.scheduledStartAt?.slice(11, 16) === item.startTime &&
    mark.scheduledEndAt?.slice(11, 16) === item.endTime
  );
}

function findAdoptableLegacyMark(item: WeekPlanItem, marks: MarkInstance[]): MarkInstance | null {
  const candidates = marks.filter((mark) => {
    if (!sameSlot(item, mark) || !isPristineUnresolvedMark(mark)) {
      return false;
    }
    if (mark.origin !== MarkInstanceOrigin.TemplateGenerated && mark.origin !== MarkInstanceOrigin.WeeklyPlanned) {
      return false;
    }
    if (item.templateId && mark.templateId === item.templateId) {
      return true;
    }
    return Boolean(item.title && mark.title === item.title);
  });

  return candidates[0] ?? null;
}

async function updateLinkedWeekPlanItem(
  repos: WaymarkRepositories,
  item: WeekPlanItem,
  markId: string,
): Promise<WeekPlanItem> {
  const [updated] = await repos.weekPlans.upsertItems([
    {
      ...item,
      createdMarkInstanceId: markId,
    },
  ]);
  return updated ?? item;
}

function buildMarkPatch(
  item: WeekPlanItem,
  generationKey: string,
  trailDayId: string,
  currentStatus: MarkInstanceStatus,
  options: WeeklyPlannedMaterializationOptions,
) {
  const description = sanitizeImportedWeeklyPlannedStorageText(item.description);
  return {
    trailDayId,
    pathId: item.pathId,
    templateId: item.templateId ?? null,
    expeditionId: item.expeditionId ?? null,
    milestoneId: item.milestoneId ?? null,
    title: item.title,
    description: description ?? null,
    origin: MarkInstanceOrigin.WeeklyPlanned,
    status: currentStatus,
    scheduledStartAt: item.localDate && item.startTime ? buildFloatingDateTime(item.localDate, item.startTime) : null,
    scheduledEndAt: item.localDate && item.endTime ? buildFloatingDateTime(item.localDate, item.endTime) : null,
    dueAt: options.setDueAt === false ? null : item.localDate && item.endTime ? buildFloatingDateTime(item.localDate, item.endTime) : null,
    sourceBacklogItemId: item.backlogItemId ?? null,
    generationKey,
  };
}

function toBlockType(item: WeekPlanItem) {
  if (!item.blockKey) {
    return undefined;
  }
  if (item.blockKey === "workout") {
    return "workout_block" as const;
  }
  if (item.blockKey.includes("supervising")) {
    return "supervising_block" as const;
  }
  if (item.blockKey.includes("family")) {
    return "family_block" as const;
  }
  if (item.blockKey.includes("focus") || item.blockKey.includes("activity")) {
    return "focus_block" as const;
  }
  return undefined;
}

async function syncWeeklyPlannedMarkPrimer(
  repos: WaymarkRepositories,
  mark: MarkInstance,
  item: WeekPlanItem,
) {
  const primerSnapshot = sanitizeImportedWeeklyPlannedStorageText(item.description);
  const currentDetail = await repos.marks.getMarkInstanceDetail(mark.id);
  // Mark Note and Primer share the detail row, so userEditedAt can be set by a
  // note-only edit. Preserve an existing edited Primer, but still backfill a
  // missing Primer from planning data.
  if (currentDetail?.userEditedAt && currentDetail.primerSnapshot?.trim()) {
    return;
  }
  if (currentDetail?.primerSnapshot === primerSnapshot) {
    return;
  }

  await repos.marks.upsertMarkInstanceDetail(mark.id, {
    primerSnapshot: primerSnapshot ?? null,
  });
}

async function syncWeeklyPlannedMarkMetadata(
  repos: WaymarkRepositories,
  userId: string,
  item: WeekPlanItem,
  markId: string,
) {
  await setMarkMetadata(repos.appSettings, userId, {
    markId,
    appearsInToday: true,
    orderIndex: item.sortOrder,
    blockType: toBlockType(item),
  });
}

function buildProtectedMarkRepairPatch(item: WeekPlanItem, mark: MarkInstance) {
  const patch: Partial<ReturnType<typeof buildMarkPatch>> = {};

  return patch;
}

export async function materializeWeeklyPlannedMark(
  repos: WaymarkRepositories,
  userId: string,
  item: WeekPlanItem,
  options: WeeklyPlannedMaterializationOptions = {},
): Promise<WeeklyPlannedMaterializationResult> {
  if (
    !item.pathId ||
    !item.localDate ||
    !item.startTime ||
    !item.endTime ||
    !item.title
  ) {
    return {
      outcome: "skipped",
      itemId: item.id,
      reason: "Week plan item is missing required timetable slot fields.",
    };
  }

  const generationKey = resolveMarkGenerationKey(item);
  const trailDay = await repos.trailDays.getOrCreateTrailDay(userId, item.localDate);
  const linkedById = item.createdMarkInstanceId
    ? await repos.marks.getMarkInstanceById(item.createdMarkInstanceId)
    : null;
  const existingByKey =
    linkedById?.userId === userId
      ? linkedById
      : await repos.marks.findMarkInstanceByGenerationKey(userId, generationKey);

  if (existingByKey) {
    if (await isProtectedMarkWithDetail(repos, existingByKey)) {
      const protectedRepairPatch = buildProtectedMarkRepairPatch(item, existingByKey);
      const repaired =
        Object.keys(protectedRepairPatch).length > 0
          ? await repos.marks.updateMarkInstance(existingByKey.id, protectedRepairPatch)
          : existingByKey;

      await updateLinkedWeekPlanItem(repos, item, repaired.id);
      await syncWeeklyPlannedMarkPrimer(repos, repaired, item);
      await syncWeeklyPlannedMarkMetadata(repos, userId, item, repaired.id);
      return {
        outcome: "protected",
        itemId: item.id,
        mark: repaired,
        finalStatus: repaired.status,
        reason:
          repaired.status === MarkInstanceStatus.Completed ||
          repaired.status === MarkInstanceStatus.Skipped ||
          repaired.status === MarkInstanceStatus.Rescheduled ||
          repaired.status === MarkInstanceStatus.Substituted ||
          repaired.status === MarkInstanceStatus.Cancelled
            ? "Existing mark is already finalized."
            : "Existing mark has user edits.",
      };
    }

    const updated = await repos.marks.updateMarkInstance(existingByKey.id, buildMarkPatch(item, generationKey, trailDay.id, existingByKey.status, options));
    await updateLinkedWeekPlanItem(repos, item, updated.id);
    await syncWeeklyPlannedMarkPrimer(repos, updated, item);
    await syncWeeklyPlannedMarkMetadata(repos, userId, item, updated.id);
    return { outcome: "updated", itemId: item.id, mark: updated, finalStatus: updated.status };
  }

  const dayMarks = await repos.marks.listMarkInstancesByDate(userId, item.localDate);
  const adoptable = findAdoptableLegacyMark(item, dayMarks);
  const conflicts = options.allowOverlap ? [] : detectWeeklyTimetableConflicts(item, dayMarks, generationKey, adoptable?.id);
  if (conflicts.length > 0) {
    return { outcome: "conflict", itemId: item.id, conflicts };
  }

  if (adoptable) {
    if (await isProtectedMarkWithDetail(repos, adoptable)) {
      return {
        outcome: "protected",
        itemId: item.id,
        mark: adoptable,
        finalStatus: adoptable.status,
        reason: "Legacy generated mark is not pristine enough to adopt.",
      };
    }

    const adopted = await repos.marks.updateMarkInstance(
      adoptable.id,
      buildMarkPatch(item, generationKey, trailDay.id, adoptable.status, options),
    );
    await updateLinkedWeekPlanItem(repos, item, adopted.id);
    await syncWeeklyPlannedMarkPrimer(repos, adopted, item);
    await syncWeeklyPlannedMarkMetadata(repos, userId, item, adopted.id);
    return { outcome: "adopted", itemId: item.id, mark: adopted, finalStatus: adopted.status };
  }

  const created = await repos.marks.createMarkInstance({
    userId,
    pathId: item.pathId,
    trailDayId: trailDay.id,
    templateId: item.templateId ?? null,
    expeditionId: item.expeditionId ?? null,
    milestoneId: item.milestoneId ?? null,
    title: item.title,
    description: sanitizeImportedWeeklyPlannedStorageText(item.description) ?? null,
    origin: MarkInstanceOrigin.WeeklyPlanned,
    status: INITIAL_WEEKLY_PLANNED_MARK_STATUS,
    scheduledStartAt: buildFloatingDateTime(item.localDate, item.startTime),
    scheduledEndAt: buildFloatingDateTime(item.localDate, item.endTime),
    dueAt: options.setDueAt === false ? null : buildFloatingDateTime(item.localDate, item.endTime),
    sourceBacklogItemId: item.backlogItemId ?? null,
    generationKey,
    proofMediaAssetIds: [],
  });
  await updateLinkedWeekPlanItem(repos, item, created.id);
  await syncWeeklyPlannedMarkPrimer(repos, created, item);
  await syncWeeklyPlannedMarkMetadata(repos, userId, item, created.id);
  return { outcome: "created", itemId: item.id, mark: created, finalStatus: created.status };
}
