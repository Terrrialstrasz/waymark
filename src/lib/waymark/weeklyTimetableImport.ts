import {
  MarkInstanceOrigin,
  MarkTemplate,
  WeekPlan,
  WeekPlanItem,
  WeekPlanItemOrigin,
  WeekPlanItemStatus,
  WeekPlanStatus,
  WaymarkRepositories,
} from "../../domain/waymark";
import { getMarkTemplateSeedMetadata } from "./markTemplateSeedStore";
import { recomputeTrailDayCountersForDate } from "./plannedMarkSourceOfTruth";
import { sanitizeImportedWeeklyPlannedStorageText } from "./userFacingMarkText";
import { materializeWeeklyPlannedMark, WeeklyPlannedMaterializationResult } from "./weeklyPlannedMarkMaterializer";

export type WeeklyTimetableImportSlotInput = {
  localDate: string;
  startTime: string;
  endTime: string;
  title: string;
  pathId?: string;
  pathRef?: string;
  blockKey: string;
  description?: string;
  note?: string;
  templateRef?: string;
  expeditionId?: string;
  expeditionRef?: string;
  milestoneId?: string;
  milestoneRef?: string;
  backlogItemId?: string;
  allowOverlap?: boolean;
};

export type WeeklyTimetableImportInput = {
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  note?: string;
  origin?: WeekPlanItemOrigin;
  importBatchId?: string;
  items: WeeklyTimetableImportSlotInput[];
  allowTitleRefs?: boolean;
  setMarkDueAt?: boolean;
};

export type WeeklyTimetableImportReport = {
  weekPlan: WeekPlan;
  items: WeekPlanItem[];
  results: WeeklyPlannedMaterializationResult[];
  counts: Record<WeeklyPlannedMaterializationResult["outcome"], number>;
};

type NormalizedImportSlot = {
  key: string;
  item: WeekPlanItem;
  allowOverlap?: boolean;
};

function deterministicId(prefix: string, seed: string) {
  return `${prefix}_${seed.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildWeekPlanItemImportKey(parts: {
  weekStartDate: string;
  localDate: string;
  startTime: string;
  endTime: string;
  blockKey: string;
  pathIdentity: string;
}): string {
  return `weekly_timetable:${parts.weekStartDate}:${parts.localDate}:${parts.startTime}:${parts.endTime}:${parts.blockKey}:${parts.pathIdentity}`;
}

function toMarkGenerationKey(importKey: string) {
  return importKey.startsWith("weekly_timetable:")
    ? `weekly_planned:${importKey.slice("weekly_timetable:".length)}`
    : `weekly_planned:${importKey}`;
}

function inferTemplateFromCareerBlock(
  templates: MarkTemplate[],
  blockKey: string,
): MarkTemplate | undefined {
  switch (blockKey) {
    case "morning_activity":
      return templates.find((template) => template.title === "Focus Block 1");
    case "supervising_am":
      return templates.find((template) => template.title.toLowerCase().includes("supervising block") && template.title.toLowerCase().includes("morning"));
    case "afternoon_activity":
      return templates.find((template) => template.title === "Focus Block 2");
    case "supervising_pm":
      return templates.find((template) => template.title.toLowerCase().includes("supervising block") && template.title.toLowerCase().includes("afternoon"));
    case "final_focus":
      return templates.find((template) => template.title === "Focus Block 3");
    default:
      return undefined;
  }
}

function inferTemplateFromHealthBlock(
  templates: MarkTemplate[],
  title: string,
): MarkTemplate | undefined {
  const normalizedTitle = normalizeText(title).toLowerCase();
  if (normalizedTitle.includes("day a2") || normalizedTitle.includes("workout a2")) {
    return templates.find((template) => template.title === "Workout A2");
  }
  if (normalizedTitle.includes("day a1") || normalizedTitle.includes("workout a1")) {
    return templates.find((template) => template.title === "Workout A1");
  }
  if (normalizedTitle.includes("day a") || normalizedTitle.includes("workout a")) {
    return templates.find((template) => template.title === "Workout A1");
  }
  if (normalizedTitle.includes("day b") || normalizedTitle.includes("workout b")) {
    return templates.find((template) => template.title === "Workout B");
  }
  if (normalizedTitle.includes("walk")) {
    return templates.find((template) => template.title === "Workout Walk");
  }
  return undefined;
}

async function resolveMilestoneIdForUser(
  repos: WaymarkRepositories,
  userId: string,
  expeditionId: string | undefined,
  milestoneRef: string | undefined,
  templateId?: string,
): Promise<string | undefined> {
  if (expeditionId && milestoneRef) {
    const milestones = await repos.expeditions.listMilestonesByExpedition(expeditionId);
    const match = milestones.find((item) => normalizeText(item.title).toLowerCase() === normalizeText(milestoneRef).toLowerCase());
    if (match?.id) {
      return match.id;
    }
  }

  if (!templateId) {
    return undefined;
  }

  const templateMetadata = await getMarkTemplateSeedMetadata(repos.appSettings, userId, templateId);
  if (!templateMetadata?.milestoneId) {
    return undefined;
  }

  if (expeditionId && templateMetadata.expeditionId && templateMetadata.expeditionId !== expeditionId) {
    return undefined;
  }

  return templateMetadata.milestoneId;
}

async function normalizeImportSlots(
  repos: WaymarkRepositories,
  input: WeeklyTimetableImportInput,
  weekPlan: WeekPlan,
): Promise<NormalizedImportSlot[]> {
  const paths = await repos.paths.listActivePaths(input.userId);
  const templatesByPath = new Map<string, MarkTemplate[]>();
  const expeditionsByPath = new Map<string, Awaited<ReturnType<typeof repos.expeditions.listExpeditionsByPath>>["items"]>();
  const nowIso = new Date().toISOString();

  async function getTemplates(pathId: string) {
    const existing = templatesByPath.get(pathId);
    if (existing) {
      return existing;
    }
    const templates = await repos.marks.listActiveMarkTemplatesByPath(pathId);
    templatesByPath.set(pathId, templates);
    return templates;
  }

  async function getExpeditions(pathId: string) {
    const existing = expeditionsByPath.get(pathId);
    if (existing) {
      return existing;
    }
    const expeditions = (await repos.expeditions.listExpeditionsByPath(pathId)).items;
    expeditionsByPath.set(pathId, expeditions);
    return expeditions;
  }

  const normalized: NormalizedImportSlot[] = [];
  for (const [index, raw] of input.items.entries()) {
    if (!input.allowTitleRefs) {
      if (!raw.pathId) {
        throw new Error(`pathId is required for slot "${raw.title}". Title-based path resolution is disabled.`);
      }
      if (raw.expeditionRef && !raw.expeditionId) {
        throw new Error(`expeditionId is required for slot "${raw.title}". Title-based expedition resolution is disabled.`);
      }
      if (raw.milestoneRef && !raw.milestoneId) {
        throw new Error(`milestoneId is required for slot "${raw.title}". Title-based milestone resolution is disabled.`);
      }
    }
    const path =
      (raw.pathId ? paths.find((item) => item.id === raw.pathId) : undefined) ??
      (input.allowTitleRefs && raw.pathRef
        ? paths.find(
            (item) =>
              normalizeText(item.title).toLowerCase() === normalizeText(raw.pathRef!).toLowerCase() ||
              normalizeText(item.slug).toLowerCase() === normalizeText(raw.pathRef!).toLowerCase(),
          )
        : undefined);
    if (!path) {
      const identifier = raw.pathId ?? raw.pathRef ?? "<missing>";
      throw new Error(`Unknown path identifier "${identifier}" for slot "${raw.title}".`);
    }

    const templates = await getTemplates(path.id);
    const template =
      raw.templateRef
        ? templates.find((item) => normalizeText(item.title).toLowerCase() === normalizeText(raw.templateRef!).toLowerCase())
        : path.title === "Career"
          ? inferTemplateFromCareerBlock(templates, raw.blockKey)
          : path.title === "Health & Body" && raw.blockKey === "workout"
            ? inferTemplateFromHealthBlock(templates, raw.title)
            : path.title === "Family & Home" && raw.blockKey === "evening_activity"
              ? templates.find((item) => item.title === "Family Activity Block")
              : undefined;

    const expeditions = await getExpeditions(path.id);
    const expeditionById = raw.expeditionId ? expeditions.find((item) => item.id === raw.expeditionId) : undefined;
    const expeditionByRef = input.allowTitleRefs && raw.expeditionRef
      ? expeditions.find((item) => normalizeText(item.title).toLowerCase() === normalizeText(raw.expeditionRef!).toLowerCase())
      : undefined;
    const expedition = expeditionById ?? expeditionByRef;
    if (raw.expeditionId && !expeditionById && !input.allowTitleRefs) {
      throw new Error(`Unknown expeditionId "${raw.expeditionId}" for slot "${raw.title}".`);
    }

    const expeditionMilestones = raw.milestoneId && expedition?.id
      ? await repos.expeditions.listMilestonesByExpedition(expedition.id)
      : undefined;
    const milestoneIdFromInput =
      raw.milestoneId && expeditionMilestones?.some((item) => item.id === raw.milestoneId)
        ? raw.milestoneId
        : undefined;
    const milestoneId =
      milestoneIdFromInput ??
      (await resolveMilestoneIdForUser(repos, input.userId, expedition?.id, raw.milestoneRef, template?.id));
    if (raw.milestoneId && !expedition?.id && !input.allowTitleRefs) {
      throw new Error(`milestoneId "${raw.milestoneId}" requires a valid expedition for slot "${raw.title}".`);
    }
    if (raw.milestoneId && expedition?.id && !milestoneIdFromInput && !milestoneId && !input.allowTitleRefs) {
        throw new Error(
          `milestoneId "${raw.milestoneId}" does not belong to expedition "${expedition.id}" for slot "${raw.title}".`,
        );
    }
    const deterministicImportKey = buildWeekPlanItemImportKey({
      weekStartDate: input.weekStartDate,
      localDate: raw.localDate,
      startTime: raw.startTime,
      endTime: raw.endTime,
      blockKey: raw.blockKey,
      pathIdentity: raw.pathId ?? path.id,
    });

    normalized.push({
      key: deterministicImportKey,
      allowOverlap: raw.allowOverlap,
      item: {
        id: deterministicId("week_plan_item", `${input.userId}:${deterministicImportKey}`),
        weekPlanId: weekPlan.id,
        backlogItemId: raw.backlogItemId,
        status: WeekPlanItemStatus.Pulled,
        localDate: raw.localDate,
        startTime: raw.startTime,
        endTime: raw.endTime,
        title: normalizeText(raw.title),
        pathId: path.id,
        templateId: template?.id,
        expeditionId: expedition?.id,
        milestoneId,
        expeditionContext: raw.expeditionRef,
        milestoneContext: raw.milestoneRef,
        description: sanitizeImportedWeeklyPlannedStorageText(raw.description),
        note: sanitizeImportedWeeklyPlannedStorageText(raw.note),
        origin: input.origin ?? "weekly_timetable",
        blockKey: raw.blockKey,
        deterministicImportKey,
        importBatchId: input.importBatchId,
        sortOrder: index,
        orderIndex: index,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    });
  }

  return normalized;
}

function validateSlots(items: WeeklyTimetableImportSlotInput[]) {
  for (const item of items) {
    if (!item.localDate || !item.startTime || !item.endTime || !item.title || (!item.pathId && !item.pathRef) || !item.blockKey) {
      throw new Error("Weekly timetable slot is missing required fields.");
    }
  }
}

function createEmptyCounts(): Record<WeeklyPlannedMaterializationResult["outcome"], number> {
  return {
    created: 0,
    updated: 0,
    adopted: 0,
    protected: 0,
    conflict: 0,
    skipped: 0,
  };
}

export type WeeklyTimetableMilestoneRepairReport = {
  repairedItemIds: string[];
  repairedMarkIds: string[];
};

export async function repairWeeklyTimetableMilestoneLinksForExpedition(
  repos: WaymarkRepositories,
  userId: string,
  expeditionId: string,
): Promise<WeeklyTimetableMilestoneRepairReport> {
  return repos.transaction.runInTransaction(async (txRepos) => {
    const items = await txRepos.weekPlans.listItemsByExpedition(userId, expeditionId);
    const marks = await txRepos.marks.listMarkInstancesByExpedition(expeditionId);
    const marksById = new Map(marks.map((mark) => [mark.id, mark] as const));
    const repairedItemIds: string[] = [];
    const repairedMarkIds: string[] = [];

    for (const item of items) {
      const resolvedMilestoneId = await resolveMilestoneIdForUser(
        txRepos,
        userId,
        item.expeditionId,
        item.milestoneContext,
        item.templateId,
      );
      if (!resolvedMilestoneId) {
        continue;
      }

      let effectiveItem = item;
      if (item.milestoneId !== resolvedMilestoneId) {
        const [updatedItem] = await txRepos.weekPlans.upsertItems([
          {
            ...item,
            milestoneId: resolvedMilestoneId,
          },
        ]);
        effectiveItem = updatedItem ?? { ...item, milestoneId: resolvedMilestoneId };
        repairedItemIds.push(item.id);
      }

      const linkedMark =
        (effectiveItem.createdMarkInstanceId ? marksById.get(effectiveItem.createdMarkInstanceId) : undefined) ??
        marks.find((mark) => mark.generationKey && mark.generationKey === toMarkGenerationKey(effectiveItem.deterministicImportKey ?? ""));
      if (!linkedMark) {
        continue;
      }

      if (linkedMark.origin !== MarkInstanceOrigin.WeeklyPlanned || linkedMark.milestoneId === resolvedMilestoneId) {
        continue;
      }

      const updatedMark = await txRepos.marks.updateMarkInstance(linkedMark.id, {
        milestoneId: resolvedMilestoneId,
      });
      marksById.set(updatedMark.id, updatedMark);
      repairedMarkIds.push(updatedMark.id);
    }

    return { repairedItemIds, repairedMarkIds };
  });
}

export async function importWeeklyTimetable(
  repos: WaymarkRepositories,
  input: WeeklyTimetableImportInput,
): Promise<WeeklyTimetableImportReport> {
  validateSlots(input.items);

  return repos.transaction.runInTransaction(async (txRepos) => {
    const existingWeekPlan = await txRepos.weekPlans.getByWeekStart(input.userId, input.weekStartDate);
    const weekPlan =
      existingWeekPlan
        ? await txRepos.weekPlans.upsertWeekPlan({
            ...existingWeekPlan,
            weekEndDate: input.weekEndDate,
            status: WeekPlanStatus.Active,
            note: input.note,
          })
        : await txRepos.weekPlans.upsertWeekPlan({
            id: deterministicId("week_plan", `${input.userId}:${input.weekStartDate}`),
            userId: input.userId,
            weekStartDate: input.weekStartDate,
            weekEndDate: input.weekEndDate,
            status: WeekPlanStatus.Active,
            note: input.note,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

    const normalized = await normalizeImportSlots(txRepos, input, weekPlan);
    const existingItems = await txRepos.weekPlans.listItems(weekPlan.id);
    const existingByKey = new Map(existingItems.map((item) => [item.deterministicImportKey, item] as const));
    const upsertPayload = normalized.map(({ key, item }) => {
      const existing = existingByKey.get(key);
      return existing ? { ...existing, ...item, id: existing.id, createdMarkInstanceId: existing.createdMarkInstanceId } : item;
    });
    const persistedItems = await txRepos.weekPlans.upsertItems(upsertPayload);

    const results: WeeklyPlannedMaterializationResult[] = [];
    const counts = createEmptyCounts();
    const allowOverlapByKey = new Map(normalized.map((slot) => [slot.key, slot.allowOverlap ?? false] as const));
    for (const item of persistedItems) {
      const result = await materializeWeeklyPlannedMark(txRepos, input.userId, item, {
        allowOverlap: item.deterministicImportKey ? allowOverlapByKey.get(item.deterministicImportKey) ?? false : false,
        setDueAt: input.setMarkDueAt ?? true,
      });
      results.push(result);
      counts[result.outcome] += 1;
    }

    const affectedDates = [...new Set(persistedItems.map((item) => item.localDate).filter((value): value is string => Boolean(value)))];
    for (const date of affectedDates) {
      await recomputeTrailDayCountersForDate(txRepos, input.userId, date);
    }

    return {
      weekPlan,
      items: await txRepos.weekPlans.listItems(weekPlan.id),
      results,
      counts,
    };
  });
}
