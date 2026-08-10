import type { CurrentExpeditionItem, CloseTrailStatus } from "../components/today/__fixtures__/todayExpedition.fixtures";
import type {
  TodayMarkActionSheetDependency,
  TodayMarkActionSheetConfig,
  TodayMarkItem,
  TodayMarkActionSheetPackLink,
  TodayMarkStatus,
  TodayPackCheckItem,
} from "../components/today/__fixtures__/todayCarousel.fixtures";
import type { PackCheckItem } from "../components/pack-check";
import type { TodayPathHeroPath } from "../lib/waymark/todayPathHero";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";
import type { TodayCockpitFeatureFlags } from "../components/today/TodayCockpitScreen";
import type { Locale, PathId } from "../types/ui";
import type {
  PackCheckInstance,
  PackCheckItemInstance,
  PackCheckTemplate,
  Path,
  Expedition,
  MarkDependency,
  MarkInstance,
  MarkInstanceDetail,
  Signal,
  WorkoutRoutineTemplate,
} from "../domain/waymark";
import {
  DependencyStatus,
  ExpeditionStatus,
  MarkInstanceStatus,
  SignalStatus,
  SignalTargetType,
  TrailDayStatus,
  WorkoutRoutineType,
  WorkoutSessionStatus,
} from "../domain/waymark/enums";
import type { WaymarkAppServices } from "./WaymarkAppProvider";
import { getPackCheckSurfacePolicy } from "../lib/waymark/packCheckSurfacePolicyStore";
import { PACK_CHECK_CATALOG, getPackCheckCatalogEntryBySourceSeedId, getPackCheckCatalogEntryByTitle, type PackCheckCatalogEntry } from "../config/packCheckCatalog";
import { ensureMarkExecutionChecklist } from "../lib/waymark/markExecutionChecklistStore";
import { getMarkTemplateSeedMetadata } from "../lib/waymark/markTemplateSeedStore";
import { getSeedRecord } from "../waymark-map/seedRegistry";
import { resolveGolfPracticeWorkoutTypeForMarkTitle } from "../lib/waymark/golfPracticeMark";
import { extractPackCheckReferenceLabels, sanitizeUserFacingMarkDetail } from "../lib/waymark/userFacingMarkText";
import { getCurrentRuntimeLocalDate, materializeRuntimeForDate } from "./runtimeLifecycle";
import { getWeekStartDate } from "./waymarkUi";
import { createDailyPlanEngine } from "../lib/waymark/dailyPlanEngine";

export type TodayData = {
  trailDayId: string;
  dailyPlanMode?: "replan" | "execution";
  hasWeeklyTimetableForDate: boolean;
  selectedPathId: PathId;
  paths: TodayPathHeroPath[];
  marks: TodayMarkItem[];
  packChecks: TodayPackCheckItem[];
  allPackChecks: TodayPackCheckItem[];
  packCheckItemsById: Record<string, PackCheckItem[]>;
  currentExpeditions: CurrentExpeditionItem[];
  closeTrailStatus: CloseTrailStatus;
  featureFlags: TodayCockpitFeatureFlags;
  signalIdByMarkId: Record<string, string>;
  signalIdByPackId: Record<string, string>;
  signalsById: Record<
    string,
    {
      id: string;
      targetType: SignalTargetType;
      targetId: string;
      status: SignalStatus;
      scheduledAt: string;
      snoozedUntil?: string;
    }
  >;
};

const UNRESOLVED_SIGNAL_STATUSES = new Set<SignalStatus>([
  SignalStatus.Scheduled,
  SignalStatus.Ringing,
  SignalStatus.Snoozed,
]);

const TODAY_FEATURE_FLAGS: TodayCockpitFeatureFlags = {
  isPathHeroEnabled: true,
  isPathDetailEnabled: true,
  isMarksEnabled: true,
  isMarkDetailEnabled: true,
  isIndependentPackChecksEnabled: false,
  isPrepareTomorrowEnabled: false,
  isPackCheckDetailEnabled: true,
  isCurrentExpeditionEnabled: false,
  isExpeditionDetailEnabled: false,
  isCloseTrailEnabled: true,
};

export function reportTodayLoadIssue(stage: string, error: unknown) {
  console.error(`[WaymarkToday] ${stage}`, error);
}

async function timeTodayLoadStep<T>(label: string, run: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  console.info(`[WaymarkTiming] today:${label}:start`);
  try {
    const result = await run();
    console.info(`[WaymarkTiming] today:${label}:end ${Date.now() - startedAt}ms`);
    return result;
  } catch (error) {
    console.info(`[WaymarkTiming] today:${label}:error ${Date.now() - startedAt}ms`);
    throw error;
  }
}

async function attemptTodaySection<T>(stage: string, load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    reportTodayLoadIssue(stage, error);
    return fallback;
  }
}

export async function loadTodayData(
  app: WaymarkAppServices,
  locale: Locale,
  options?: { now?: Date },
): Promise<TodayData> {
  const totalStartedAt = Date.now();
  const now = options?.now ?? new Date();
  const nowIso = now.toISOString();
  const localDate = getCurrentRuntimeLocalDate(app.user.timezone, now);
  console.info(`[WaymarkTiming] today:total:start localDate=${localDate}`);
  let trailDay = await timeTodayLoadStep("trailDay", () =>
    app.repositories.trailDays.getOrCreateTrailDay(app.user.id, localDate),
  );
  const hasWeeklyTimetableForDate = await timeTodayLoadStep("weeklyTimetableCheck", () =>
    hasWeeklyTimetableItemsForDate(app, localDate),
  );

  try {
    const runtime = await timeTodayLoadStep("runtimeMaterialization", () =>
      materializeRuntimeForDate(app, localDate, nowIso),
    );
    trailDay = runtime.trailDay;
  } catch (error) {
    reportTodayLoadIssue("runtime materialization", error);
  }

  const dailyPlanEngine = app.dailyPlanEngine ?? createDailyPlanEngine(app.repositories);
  const dailyPlan = await timeTodayLoadStep("dailyPlanGate", () =>
    dailyPlanEngine.beginReplan(app.user.id, localDate, app.user.timezone, nowIso),
  );

  const rawMarks = await timeTodayLoadStep("visibleMarks", async () => {
    if (dailyPlan.membership === "draft") {
      return dailyPlan.effectiveMarks;
    }
    const visible = await attemptTodaySection(
      "visible marks",
      () => app.markEngine.listVisibleMarksForDay(app.user.id, localDate),
      [],
    );
    const effectiveIds = new Set(dailyPlan.effectiveMarks.map((mark) => mark.id));
    const auxiliary = visible.filter(
      (mark) =>
        !effectiveIds.has(mark.id) &&
        (mark.origin === "quick_capture" ||
          mark.origin === "manual_plan" ||
          mark.origin === "backlog_converted" ||
          mark.origin === "template_generated"),
    );
    return [...dailyPlan.effectiveMarks, ...auxiliary];
  });
  const marks = await timeTodayLoadStep("markReadiness", async () => {
    const readyMarks: MarkInstance[] = [];
    for (const mark of rawMarks) {
      readyMarks.push(await attemptTodaySection(`mark readiness ${mark.id}`, () => refreshMarkReadinessIfNeeded(app, mark), mark));
    }
    console.info(`[WaymarkTiming] today:markReadiness:count ${readyMarks.length}`);
    return readyMarks;
  });
  const packVisibility = await timeTodayLoadStep("packVisibility", () =>
    attemptTodaySection(
      "pack visibility",
      () => app.packCheckEngine.listVisiblePackChecksForDay(app.user.id, localDate, nowIso),
      { today: [], prepareTomorrow: [] },
    ),
  );
  const allPackCheckInstances = await timeTodayLoadStep("allPackChecks", () =>
    attemptTodaySection(
      "all pack checks",
      () => app.packCheckEngine.listAllPackChecksForDay(app.user.id, localDate, nowIso),
      [...packVisibility.today, ...packVisibility.prepareTomorrow],
    ),
  );

  const activePaths = await timeTodayLoadStep("activePaths", () =>
    attemptTodaySection("active paths", () => app.repositories.paths.listActivePaths(app.user.id), []),
  );
  const pathRows = activePaths
    .map((path) => mapPathToHeroPath(path))
    .filter((path): path is TodayPathHeroPath => Boolean(path));
  const pathById = new Map(activePaths.map((path) => [path.id, path] as const));

  const signalsByMarkId = await timeTodayLoadStep("markSignals", () =>
    attemptTodaySection(
      "mark signals",
      () => loadSignalIndex(app, SignalTargetType.MarkInstance, marks.map((mark) => mark.id)),
      new Map<string, Signal>(),
    ),
  );
  const visiblePackChecks = [...packVisibility.today, ...packVisibility.prepareTomorrow];
  const catalogEntryByTemplateId = await timeTodayLoadStep("packCatalog", () =>
    buildPackCheckCatalogEntryByTemplateId(app, allPackCheckInstances),
  );
  const signalsByPackId = await timeTodayLoadStep("packSignals", () =>
    attemptTodaySection(
      "pack signals",
      () => loadSignalIndex(app, SignalTargetType.PackCheckInstance, allPackCheckInstances.map((pack) => pack.id)),
      new Map<string, Signal>(),
    ),
  );
  const signalIdByMarkId = Object.fromEntries(
    [...signalsByMarkId.entries()].map(([markId, signal]) => [markId, signal.id]),
  );
  const signalIdByPackId = Object.fromEntries(
    [...signalsByPackId.entries()].map(([packId, signal]) => [packId, signal.id]),
  );
  const signalsById = Object.fromEntries(
    [...signalsByMarkId.values(), ...signalsByPackId.values()].map((signal) => [
      signal.id,
      {
        id: signal.id,
        targetType: signal.targetType,
        targetId: signal.targetId,
        status: signal.status,
        scheduledAt: signal.scheduledAt,
        snoozedUntil: signal.snoozedUntil,
      },
    ]),
  );

  const markDependencies = new Map<string, TodayMarkActionSheetDependency[]>();
  const relatedPackChecksByMarkId = new Map<string, TodayMarkActionSheetPackLink[]>();
  const embeddedChecklistsByMarkId = new Map<string, NonNullable<TodayMarkActionSheetConfig["embeddedChecklist"]>>();
  const templateMetadataByMarkId = new Map<string, Awaited<ReturnType<typeof getMarkTemplateSeedMetadata>> | null>();
  const workoutPrimaryActionByMarkId = new Map<string, Pick<TodayMarkActionSheetConfig, "primaryActionLabel" | "primaryActionHint" | "launchConfig"> | null>();
  const markDetailByMarkId = new Map<string, MarkInstanceDetail | null>();
  await timeTodayLoadStep("markDetails", async () => {
    for (const mark of marks) {
      try {
        markDetailByMarkId.set(mark.id, await app.repositories.marks.getMarkInstanceDetail(mark.id));
        const templateMetadata = mark.templateId
          ? await getMarkTemplateSeedMetadata(app.repositories.appSettings, app.user.id, mark.templateId)
          : null;
        templateMetadataByMarkId.set(mark.id, templateMetadata);
        workoutPrimaryActionByMarkId.set(mark.id, await buildWorkoutPrimaryActionConfig(app, mark, templateMetadata));
        markDependencies.set(mark.id, await buildBlockingDependencies(app, mark, locale));
        relatedPackChecksByMarkId.set(mark.id, await buildRelatedPackChecks(app, mark, locale));
        const embeddedChecklist = await buildEmbeddedChecklist(app, mark);
        if (embeddedChecklist) {
          embeddedChecklistsByMarkId.set(mark.id, embeddedChecklist);
        }
      } catch (error) {
        reportTodayLoadIssue(`mark detail ${mark.id}`, error);
        templateMetadataByMarkId.set(mark.id, null);
        workoutPrimaryActionByMarkId.set(mark.id, null);
        markDependencies.set(mark.id, []);
        relatedPackChecksByMarkId.set(mark.id, []);
        markDetailByMarkId.set(mark.id, null);
      }
    }
    console.info(`[WaymarkTiming] today:markDetails:count ${marks.length}`);
  });

  const markItems = marks
    .map((mark) =>
      mapMarkToTodayItem(
        mark,
        pathById.get(mark.pathId),
        locale,
        markDependencies.get(mark.id) ?? [],
        relatedPackChecksByMarkId.get(mark.id) ?? [],
        signalsByMarkId.get(mark.id),
        embeddedChecklistsByMarkId.get(mark.id),
        templateMetadataByMarkId.get(mark.id) ?? null,
        workoutPrimaryActionByMarkId.get(mark.id) ?? null,
        markDetailByMarkId.get(mark.id) ?? null,
      ),
    )
    .filter((item): item is TodayMarkItem => Boolean(item));

  const packCheckItemsById: Record<string, PackCheckItem[]> = {};
  const packItems = await timeTodayLoadStep("packItems", async () => {
    const items = await Promise.all(
      allPackCheckInstances.map(async (pack) => {
        try {
          const packItems = await app.repositories.packChecks.listItemInstances(pack.id);
          packCheckItemsById[pack.id] = packItems.map(mapPackCheckItemInstance);
          return {
            pack,
            item: mapPackCheckToTodayItem(
              pack,
              packItems,
              marks,
              pathById,
              locale,
              catalogEntryByTemplateId.get(pack.templateId ?? "") ?? null,
              signalsByPackId.get(pack.id),
              packVisibility.prepareTomorrow.some((item) => item.id === pack.id),
            ),
          };
        } catch (error) {
          reportTodayLoadIssue(`pack detail ${pack.id}`, error);
          packCheckItemsById[pack.id] = [];
          return {
            pack,
            item: mapPackCheckToTodayItem(
              pack,
              [],
              marks,
              pathById,
              locale,
              catalogEntryByTemplateId.get(pack.templateId ?? "") ?? null,
              signalsByPackId.get(pack.id),
              packVisibility.prepareTomorrow.some((item) => item.id === pack.id),
            ),
          };
        }
      }),
    );
    console.info(`[WaymarkTiming] today:packItems:count ${items.length}`);
    return items;
  });
  const packItemById = new Map(packItems.map(({ pack, item }) => [pack.id, item] as const));
  const visiblePackItems = visiblePackChecks
    .map((pack) => packItemById.get(pack.id))
    .filter((item): item is TodayPackCheckItem => Boolean(item));
  const allPackItems = sortPackCheckItemsByCatalog(packItems.map(({ item }) => item));

  const currentExpeditions = await timeTodayLoadStep("currentExpeditions", () =>
    attemptTodaySection(
      "current expeditions",
      () => loadCurrentExpeditions(app, marks, locale),
      [],
    ),
  );
  const closeTrailStatus = await timeTodayLoadStep("closeTrailStatus", () =>
    attemptTodaySection(
      "close trail status",
      () => deriveCloseTrailStatus(app, trailDay.id, nowIso),
      "default" as CloseTrailStatus,
    ),
  );
  const selectedPathId = deriveSelectedPathId(pathRows, trailDay.anchorPathId, activePaths);
  console.info(
    `[WaymarkTiming] today:total:end ${Date.now() - totalStartedAt}ms marks=${markItems.length} packs=${allPackItems.length}`,
  );

  return {
    trailDayId: trailDay.id,
    dailyPlanMode: dailyPlan.membership === "draft" ? "replan" : "execution",
    hasWeeklyTimetableForDate,
    selectedPathId,
    paths: pathRows,
    marks: markItems,
    packChecks: visiblePackItems,
    allPackChecks: allPackItems,
    packCheckItemsById,
    currentExpeditions,
    closeTrailStatus,
    featureFlags: {
      ...TODAY_FEATURE_FLAGS,
      isPathHeroEnabled: pathRows.length > 0,
      isPathDetailEnabled: pathRows.length > 0,
    },
    signalIdByMarkId,
    signalIdByPackId,
    signalsById,
  };
}

function sortPackCheckItemsByCatalog(items: TodayPackCheckItem[]) {
  return [...items].sort((left, right) => getPackCheckCatalogOrder(left) - getPackCheckCatalogOrder(right));
}

function getPackCheckCatalogOrder(item: TodayPackCheckItem) {
  if (!item.sourceSeedId) {
    return Number.MAX_SAFE_INTEGER;
  }
  const index = PACK_CHECK_CATALOG.findIndex((entry) => entry.sourceSeedId === item.sourceSeedId);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

async function buildPackCheckCatalogEntryByTemplateId(
  app: WaymarkAppServices,
  packs: PackCheckInstance[],
) {
  const templateIds = [...new Set(packs.map((pack) => pack.templateId).filter((value): value is string => Boolean(value)))];
  const byTemplateId = new Map<string, PackCheckCatalogEntry>();

  for (const templateId of templateIds) {
    const [template, seedRecord] = await Promise.all([
      app.repositories.packChecks.getTemplateById(templateId),
      getSeedRecord(app.repositories.appSettings, app.user.id, "pack_check_template", templateId),
    ]);
    const catalogEntry = resolvePackCheckCatalogEntry(template, seedRecord?.sourceSeedId);
    if (catalogEntry) {
      byTemplateId.set(templateId, catalogEntry);
    }
  }

  return byTemplateId;
}

function resolvePackCheckCatalogEntry(template?: PackCheckTemplate | null, sourceSeedId?: string | null) {
  return (
    getPackCheckCatalogEntryBySourceSeedId(sourceSeedId) ??
    getPackCheckCatalogEntryByTitle(template?.title) ??
    null
  );
}

async function hasWeeklyTimetableItemsForDate(
  app: WaymarkAppServices,
  localDate: string,
) {
  const weekStartDate = getWeekStartDate(localDate, app.user.weekStartsOn);
  const weekPlan = await app.repositories.weekPlans.getByWeekStart(app.user.id, weekStartDate);
  if (!weekPlan) {
    return false;
  }
  const items = await app.repositories.weekPlans.listItems(weekPlan.id);
  return items.some((item) => item.localDate === localDate && item.status !== "removed");
}

async function refreshMarkReadinessIfNeeded(app: WaymarkAppServices, mark: MarkInstance) {
  if (
    mark.status === MarkInstanceStatus.Planned ||
    mark.status === MarkInstanceStatus.Ready ||
    mark.status === MarkInstanceStatus.Blocked
  ) {
    return app.markEngine.refreshMarkReadiness(mark.id);
  }
  return mark;
}

async function loadSignalIndex(app: WaymarkAppServices, targetType: SignalTargetType, targetIds: string[]) {
  const index = new Map<string, Signal>();
  for (const id of targetIds) {
    const signals = await app.repositories.signals.listSignalsByTarget(targetType, id);
    const unresolved = signals.find((signal) => UNRESOLVED_SIGNAL_STATUSES.has(signal.status));
    if (unresolved) {
      index.set(id, unresolved);
    }
  }
  return index;
}

async function buildBlockingDependencies(
  app: WaymarkAppServices,
  mark: MarkInstance,
  locale: Locale,
): Promise<TodayMarkActionSheetDependency[]> {
  const dependencies = await app.repositories.dependencies.listDependenciesForMark(mark.id);
  const blocking = dependencies.filter((dependency) => dependency.status !== DependencyStatus.Satisfied && dependency.status !== DependencyStatus.Waived);

  const items: Array<TodayMarkActionSheetDependency | null> = await Promise.all(
    blocking.map(async (dependency) => {
      if (dependency.requiredEntityType === "mark_instance") {
        const target = await app.repositories.marks.getMarkInstanceById(dependency.requiredEntityId);
        if (!target) {
          return null;
        }
        return {
          id: dependency.id,
          title: { en: target.title, vi: target.title },
          statusLabel: { en: dependencyStatusLabel(dependency.status, "en"), vi: dependencyStatusLabel(dependency.status, "vi") },
          group: dependency.status === DependencyStatus.Failed ? "critical" : "required",
          targetType: "mark" as const,
          targetId: target.id,
        };
      }

      const pack = await app.repositories.packChecks.getInstanceById(dependency.requiredEntityId);
      if (!pack) {
        return null;
      }
      return {
        id: dependency.id,
        title: { en: pack.title, vi: pack.title },
        statusLabel: { en: dependencyStatusLabel(dependency.status, "en"), vi: dependencyStatusLabel(dependency.status, "vi") },
        group: dependency.status === DependencyStatus.Failed ? "critical" : "required",
        targetType: "pack_check" as const,
        targetId: pack.id,
      };
    }),
  );

  return items.filter((item): item is TodayMarkActionSheetDependency => item !== null);
}

async function buildRelatedPackChecks(
  app: WaymarkAppServices,
  mark: MarkInstance,
  locale: Locale,
): Promise<TodayMarkActionSheetPackLink[]> {
  const links = new Map<string, TodayMarkActionSheetPackLink>();
  const [trailDayPacks, directlyLinkedPacks] = await Promise.all([
    app.repositories.packChecks.listInstancesByTrailDay(mark.trailDayId),
    app.repositories.packChecks.listInstancesByTargetMark(mark.id),
  ]);
  const referencedLabels = extractPackCheckReferenceLabels(mark.description).map((label) => normalizePackCheckReferenceLabel(label));

  for (const pack of directlyLinkedPacks) {
    links.set(pack.id, mapPackCheckLink(pack, locale));
  }

  if (referencedLabels.length === 0) {
    return [...links.values()];
  }

  const packsByNormalizedTitle = new Map(
    trailDayPacks.map((pack) => [normalizePackCheckReferenceLabel(pack.title), pack] as const),
  );

  for (const label of referencedLabels) {
    const matchedPack = packsByNormalizedTitle.get(label);
    if (!matchedPack) {
      continue;
    }
    links.set(matchedPack.id, mapPackCheckLink(matchedPack, locale));
  }

  return [...links.values()];
}

async function buildEmbeddedChecklist(
  app: WaymarkAppServices,
  mark: MarkInstance,
): Promise<TodayMarkActionSheetConfig["embeddedChecklist"] | undefined> {
  if (mark.templateId) {
    const templateMetadata = await getMarkTemplateSeedMetadata(app.repositories.appSettings, app.user.id, mark.templateId);
    if (templateMetadata?.executionChecklistItems?.length) {
      const checklist = await ensureMarkExecutionChecklist(
        app.repositories.appSettings,
        app.user.id,
        mark.id,
        templateMetadata.executionChecklistItems,
      );
      return {
        packCheckId: `execution:${mark.id}`,
        items: checklist.items.map((item) => ({
          id: item.id,
          label: item.label,
          checked: item.checked,
          disabled: false,
        })),
      };
    }
  }

  const linked = await app.repositories.packChecks.listInstancesByTargetMark(mark.id);
  for (const pack of linked) {
    const policy = await getPackCheckSurfacePolicy(app.repositories.appSettings, app.user.id, pack.templateId);
    if (policy !== "embedded_in_mark") {
      continue;
    }
    const items = await app.repositories.packChecks.listItemInstances(pack.id);
    return {
      packCheckId: pack.id,
      items: items.map((item) => ({
        id: item.id,
        label: item.label,
        checked: item.isChecked,
        disabled: false,
      })),
    };
  }
  return undefined;
}

function mapMarkToTodayItem(
  mark: MarkInstance,
  path: Path | undefined,
  locale: Locale,
  dependencies: TodayMarkActionSheetDependency[],
  relatedPackChecks: TodayMarkActionSheetPackLink[],
  signal: Signal | undefined,
  embeddedChecklist: TodayMarkActionSheetConfig["embeddedChecklist"] | undefined,
  templateMetadata: Awaited<ReturnType<typeof getMarkTemplateSeedMetadata>> | null,
  workoutPrimaryAction: Pick<TodayMarkActionSheetConfig, "primaryActionLabel" | "primaryActionHint" | "launchConfig"> | null,
  markDetail: MarkInstanceDetail | null,
): TodayMarkItem | null {
  const pathId = mapPathToUiPathId(path);
  if (!pathId) {
    return null;
  }

  const status = mapMarkStatus(mark.status, dependencies.length > 0);
  const statusLabel = mark.status === MarkInstanceStatus.PartiallyCompleted
    ? { en: "Partial Complete", vi: "Hoàn thành một phần" }
    : { en: humanizeTodayMarkStatus(status, "en"), vi: humanizeTodayMarkStatus(status, "vi") };
  const isWorkoutMark = templateMetadata?.blockType === "workout_block";
  const golfPracticeWorkoutType = pathId === "golf" ? resolveGolfPracticeWorkoutTypeForMarkTitle(mark.title) : null;
  const isGolfPracticeMark = Boolean(golfPracticeWorkoutType);
  const primaryAction = isGolfPracticeMark
    ? {
        primaryActionLabel: { en: "Start Practice", vi: "Bắt đầu luyện tập" },
        primaryActionHint: { en: "Enter the Golf Practice flow for this planned mark.", vi: "Vào flow Golf Practice cho planned mark này." },
      }
    : workoutPrimaryAction;
  const launchConfig = isGolfPracticeMark ? workoutPrimaryAction?.launchConfig : primaryAction?.launchConfig;
  const primerText = sanitizeUserFacingMarkDetail(markDetail?.primerSnapshot ?? mark.description);
  const markNote = sanitizeUserFacingMarkDetail(markDetail?.preActionComment);
  const visibleRelatedPackChecks = relatedPackChecks.filter(
    (packCheck) => !dependencies.some((dependency) => dependency.targetType === "pack_check" && dependency.targetId === packCheck.targetId),
  );
  const actionSheet: TodayMarkActionSheetConfig | undefined =
    dependencies.length > 0 || visibleRelatedPackChecks.length > 0 || primerText || markNote || signal || embeddedChecklist || isWorkoutMark || isGolfPracticeMark
      ? {
          statusLabel: {
            en: statusLabel.en,
            vi: statusLabel.vi,
          },
          intentionText: primerText
            ? {
                en: primerText,
                vi: primerText,
              }
            : undefined,
          markNote: markNote ? { en: markNote, vi: markNote } : undefined,
          signalLabel: signal
            ? {
                en: "Open the active signal for this mark.",
                vi: "Mo signal dang hoat dong cho moc nay.",
              }
            : undefined,
          dependencies: dependencies.length > 0 ? dependencies : undefined,
          relatedPackChecks: visibleRelatedPackChecks.length > 0 ? visibleRelatedPackChecks : undefined,
          embeddedChecklist,
          primaryActionLabel: primaryAction?.primaryActionLabel,
          primaryActionHint: primaryAction?.primaryActionHint,
          launchConfig,
        }
      : undefined;

  return {
    id: mark.id,
    title: { en: mark.title, vi: mark.title },
    pathId,
    pathEntityId: mark.pathId,
    expeditionId: mark.expeditionId,
    milestoneId: mark.milestoneId,
    status,
    interactionKind: isWorkoutMark ? "strength_session" : isGolfPracticeMark ? "golf_practice" : "default",
    summary: buildMarkSummary(mark),
    timeLabel: buildMarkTimeLabel(mark),
    timeRangeLabel: buildMarkTimeRangeLabel(mark),
    sortAt: buildMarkSortAt(mark),
    detailEnabled: true,
    actionSheet,
  };
}

async function buildWorkoutPrimaryActionConfig(
  app: WaymarkAppServices,
  mark: MarkInstance,
  templateMetadata: Awaited<ReturnType<typeof getMarkTemplateSeedMetadata>> | null,
): Promise<Pick<TodayMarkActionSheetConfig, "primaryActionLabel" | "primaryActionHint" | "launchConfig"> | null> {
  if (resolveGolfPracticeWorkoutTypeForMarkTitle(mark.title)) {
    const launchConfig = await buildGolfPracticeLaunchConfig(app, mark);
    if (launchConfig) {
      return {
        primaryActionLabel: { en: "Start Practice", vi: "Bat dau luyen tap" },
        primaryActionHint: { en: "Enter the Golf Practice flow for this planned mark.", vi: "Vao flow Golf Practice cho planned mark nay." },
        launchConfig,
      };
    }
  }

  if (templateMetadata?.blockType !== "workout_block") {
    return null;
  }

  const session = await app.repositories.strength.getSessionByMarkInstance(mark.id);
  if (!session || session.status === WorkoutSessionStatus.NotStarted || session.status === WorkoutSessionStatus.Abandoned) {
    const launchConfig = await buildHealthWorkoutLaunchConfig(app, mark);
    return {
      launchConfig,
      primaryActionLabel: { en: "Start Workout", vi: "Bắt đầu buổi tập" },
      primaryActionHint: { en: "Enter the workout flow for this planned mark.", vi: "Vào flow thực hiện buổi tập cho planned mark này." },
    };
  }

  if (session.status === WorkoutSessionStatus.Completed || session.status === WorkoutSessionStatus.PartiallyCompleted) {
    return {
      primaryActionLabel: { en: "View Session", vi: "Xem buổi tập" },
      primaryActionHint: { en: "Open the recorded workout session.", vi: "Mở lại buổi tập đã được ghi nhận." },
    };
  }

  return {
    primaryActionLabel: { en: "Resume Workout", vi: "Tiếp tục buổi tập" },
    primaryActionHint: { en: "Resume the workout session already in progress.", vi: "Tiếp tục buổi tập đang dở." },
  };
}

export async function buildHealthWorkoutLaunchConfig(
  app: WaymarkAppServices,
  mark: MarkInstance,
): Promise<TodayMarkActionSheetConfig["launchConfig"]> {
  const routines = (await app.repositories.strength.listRoutinesByPath(mark.pathId))
    .filter((routine) => routine.isActive && routine.routineType !== WorkoutRoutineType.GolfPractice)
    .sort((left, right) => left.title.localeCompare(right.title));
  if (routines.length === 0) {
    return undefined;
  }

  const defaultRoutine =
    (mark.templateId ? routines.find((routine) => routine.markTemplateId === mark.templateId) : undefined) ??
    routines.find((routine) => normalizeLaunchText(routine.title) === normalizeLaunchText(mark.title)) ??
    routines.find((routine) => isWorkoutMinimalBodyweightRoutine(mark.title, routine)) ??
    routines.find((routine) => normalizeLaunchText(mark.title).includes("walk") && routine.routineType === WorkoutRoutineType.Walk) ??
    routines.find((routine) => normalizeLaunchText(mark.title).includes("day b") && normalizeLaunchText(routine.title).includes("day b")) ??
    routines.find((routine) => normalizeLaunchText(routine.title).includes("day a")) ??
    routines[0]!;
  const orderedRoutines = putDefaultRoutineFirst(routines, defaultRoutine.id);

  return {
    kind: "health_workout",
    defaultOptionId: defaultRoutine.id,
    options: orderedRoutines.map((routine) => ({
      id: routine.id,
      routineTemplateId: routine.id,
      title: { en: routine.title, vi: routine.title },
      detail: routine.estimatedDurationMin ? { en: `${routine.estimatedDurationMin} min`, vi: `${routine.estimatedDurationMin} phut` } : undefined,
      isDefault: routine.id === defaultRoutine.id,
    })),
  };
}

export async function buildGolfPracticeLaunchConfig(
  app: WaymarkAppServices,
  mark: MarkInstance,
): Promise<TodayMarkActionSheetConfig["launchConfig"]> {
  const routines = (await app.repositories.strength.listRoutinesByPath(mark.pathId))
    .filter((routine) => routine.isActive && routine.routineType === WorkoutRoutineType.GolfPractice)
    .sort((left, right) => left.title.localeCompare(right.title));
  if (routines.length === 0) {
    return undefined;
  }

  const defaultType = resolveGolfPracticeWorkoutTypeForMarkTitle(mark.title) ?? "putting";
  const defaultRoutine =
    (mark.templateId ? routines.find((routine) => routine.markTemplateId === mark.templateId) : undefined) ??
    routines.find((routine) => normalizeLaunchText(routine.title) === normalizeLaunchText(mark.title)) ??
    routines.find((routine) => isMatchingGolfPracticeRoutine(mark.title, routine.title)) ??
    (defaultType === "swing" ? routines.find((routine) => normalizeLaunchText(routine.title).includes("swing")) : undefined) ??
    routines.find((routine) => normalizeLaunchText(routine.title).includes("putting 23 putts")) ??
    routines[0]!;
  const orderedRoutines = putDefaultRoutineFirst(routines, defaultRoutine.id);

  return {
    kind: "golf_practice",
    defaultOptionId: defaultRoutine.id,
    options: orderedRoutines.map((routine) => ({
      id: routine.id,
      routineTemplateId: routine.id,
      title: { en: routine.title, vi: routine.title },
      detail: routine.estimatedDurationMin ? { en: `${routine.estimatedDurationMin} min`, vi: `${routine.estimatedDurationMin} phut` } : undefined,
      isDefault: routine.id === defaultRoutine.id,
    })),
  };
}

function normalizeLaunchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isWorkoutMinimalBodyweightRoutine(markTitle: string, routine: WorkoutRoutineTemplate) {
  const normalizedMarkTitle = normalizeLaunchText(markTitle);
  if (!normalizedMarkTitle.includes("workout minimal")) {
    return false;
  }
  const normalizedRoutineTitle = normalizeLaunchText(routine.title);
  return normalizedRoutineTitle.includes("body weight rep progress") || normalizedRoutineTitle.includes("bodyweight rep progress");
}

function putDefaultRoutineFirst(routines: WorkoutRoutineTemplate[], defaultRoutineId: string) {
  return [...routines].sort((left, right) => {
    if (left.id === defaultRoutineId) {
      return right.id === defaultRoutineId ? 0 : -1;
    }
    if (right.id === defaultRoutineId) {
      return 1;
    }
    return left.title.localeCompare(right.title);
  });
}

function isMatchingGolfPracticeRoutine(markTitle: string, routineTitle: string) {
  const normalizedMarkTitle = normalizeGolfLaunchText(markTitle);
  const normalizedRoutineTitle = normalizeGolfLaunchText(routineTitle);
  if (normalizedMarkTitle.includes("putt")) {
    return normalizedRoutineTitle.includes("putting 23 putts");
  }
  if (!normalizedMarkTitle.includes("chipping")) {
    return false;
  }
  if (normalizedMarkTitle.includes("3 5 7")) {
    return normalizedRoutineTitle.includes("chipping 3 5 7");
  }
  const distance = normalizedMarkTitle.match(/chipping ([357]) m/)?.[1];
  return Boolean(distance && normalizedRoutineTitle.includes(`chipping ${distance} m`));
}

function normalizeGolfLaunchText(value: string) {
  return normalizeLaunchText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapPackCheckItemInstance(item: PackCheckItemInstance): PackCheckItem {
  return {
    id: item.id,
    label: item.label,
    checked: item.isChecked,
    disabled: false,
  };
}

function mapPackCheckToTodayItem(
  pack: PackCheckInstance,
  items: PackCheckItemInstance[],
  marks: MarkInstance[],
  pathById: Map<string, Path>,
  locale: Locale,
  catalogEntryOverride: PackCheckCatalogEntry | null,
  signal: Signal | undefined,
  isPrepareTomorrow: boolean,
): TodayPackCheckItem {
  const remainingRequired = items.filter((item) => item.isRequired && !item.isChecked).length;
  const linkedMark = pack.targetMarkInstanceId ? marks.find((mark) => mark.id === pack.targetMarkInstanceId) : undefined;
  const linkedPath = linkedMark ? pathById.get(linkedMark.pathId) : undefined;
  const catalogEntry = catalogEntryOverride ?? getPackCheckCatalogEntryByTitle(pack.title);
  const fallbackTone =
    isPrepareTomorrow ? "evening" : linkedPath?.slug.includes("health") ? "gym" : linkedPath?.slug.includes("career") ? "office" : "morning";
  const resolvedTitle = catalogEntry?.title ?? pack.title;

  return {
    id: pack.id,
    title: { en: resolvedTitle, vi: resolvedTitle },
    count: remainingRequired > 0 ? remainingRequired : items.length,
    tone: catalogEntry?.tone ?? fallbackTone,
    sourceSeedId: catalogEntry?.sourceSeedId,
    section: isPrepareTomorrow ? "prepare_tomorrow" : "independent",
    supportLabel: signal
      ? { en: "Signal active", vi: "Dang co signal" }
      : linkedMark
        ? { en: linkedMark.title, vi: linkedMark.title }
        : undefined,
    detailEnabled: true,
    pathId: catalogEntry?.uiPathId ?? mapPathToUiPathId(linkedPath),
  };
}

async function loadCurrentExpeditions(
  app: WaymarkAppServices,
  marks: MarkInstance[],
  locale: Locale,
): Promise<CurrentExpeditionItem[]> {
  const expeditionIds = Array.from(
    new Set(marks.map((mark) => mark.expeditionId).filter((value): value is string => Boolean(value))),
  );
  const items: CurrentExpeditionItem[] = [];

  for (const expeditionId of expeditionIds) {
    const expedition = await app.repositories.expeditions.getExpeditionById(expeditionId);
    if (
      !expedition ||
      !(
        expedition.status === ExpeditionStatus.Active ||
        expedition.status === ExpeditionStatus.Planned ||
        expedition.status === ExpeditionStatus.Paused
      )
    ) {
      continue;
    }
    const path = await app.repositories.paths.getPathById(expedition.pathId);
    const pathId = mapPathToUiPathId(path ?? undefined);
    if (!pathId) {
      continue;
    }
    items.push(await mapExpeditionToCurrentItem(app, expedition, pathId, locale));
  }

  return items.slice(0, 3);
}

async function mapExpeditionToCurrentItem(
  app: WaymarkAppServices,
  expedition: Expedition,
  pathId: PathId,
  locale: Locale,
): Promise<CurrentExpeditionItem> {
  const milestones = await app.repositories.expeditions.listMilestonesByExpedition(expedition.id);
  const firstOpenMilestone = milestones.find((milestone) => milestone.status !== "completed") ?? milestones[0];
  const currentDeadline = firstOpenMilestone?.targetDate ?? expedition.targetDate ?? expedition.targetEndAt;

  return {
    id: expedition.id,
    title: { en: expedition.title, vi: expedition.title },
    milestoneLabel: firstOpenMilestone
      ? {
          en: `Milestone: ${firstOpenMilestone.title}`,
          vi: `Cot moc: ${firstOpenMilestone.title}`,
        }
      : undefined,
    deadlineLabel: currentDeadline
      ? {
          en: `Deadline: ${currentDeadline}`,
          vi: `Han: ${currentDeadline}`,
        }
      : undefined,
    pathId,
    detailEnabled: true,
  };
}

async function deriveCloseTrailStatus(app: WaymarkAppServices, trailDayId: string, asOf: string): Promise<CloseTrailStatus> {
  const readiness = await app.closeTrailEngine.evaluateCloseReadiness(trailDayId, asOf);
  if (readiness.status === TrailDayStatus.Closed) {
    return "completedToday";
  }

  if (shouldShowCloseTrailEntry(readiness, asOf, app.user.timezone)) {
    return "default";
  }

  return "hidden";
}

function shouldShowCloseTrailEntry(
  readiness: Awaited<ReturnType<WaymarkAppServices["closeTrailEngine"]["evaluateCloseReadiness"]>>,
  asOf: string,
  timezone: string,
) {
  if (readiness.reasonCode === "all_planned_marks_resolved") {
    return true;
  }

  const localHour = getLocalHour(asOf, timezone);
  return localHour >= 20;
}

function getLocalHour(asOf: string, timezone: string) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).format(new Date(asOf));
  const parsed = Number.parseInt(hour, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveSelectedPathId(paths: TodayPathHeroPath[], anchorPathId: string | undefined, activePaths: Path[]): PathId {
  if (anchorPathId) {
    const anchorPath = activePaths.find((path) => path.id === anchorPathId);
    const mappedAnchor = mapPathToUiPathId(anchorPath);
    if (mappedAnchor) {
      return mappedAnchor;
    }
  }
  return paths[0]?.id ?? "family";
}

function mapPathToHeroPath(path: Path): TodayPathHeroPath | null {
  const pathId = mapPathToUiPathId(path);
  if (!pathId) {
    return null;
  }
  return todayPathHeroPaths.find((item) => item.id === pathId) ?? null;
}

function mapPathToUiPathId(path: Pick<Path, "slug" | "title"> | undefined): PathId | undefined {
  if (!path) {
    return undefined;
  }
  const key = `${path.slug} ${path.title}`.toLowerCase();
  if (key.includes("career")) return "career";
  if (key.includes("snag")) return "snag";
  if (key.includes("health") || key.includes("body")) return "health";
  if (key.includes("family") || key.includes("home")) return "family";
  if (key.includes("character") || key.includes("stoic")) return "character";
  if (key.includes("golf")) return "golf";
  if (key.includes("culture") || key.includes("romance") || key.includes("class")) return "culture";
  return undefined;
}

function mapMarkStatus(status: MarkInstanceStatus, hasDependencies: boolean): TodayMarkStatus {
  switch (status) {
    case MarkInstanceStatus.Completed:
    case MarkInstanceStatus.PartiallyCompleted:
      return "done";
    case MarkInstanceStatus.Skipped:
    case MarkInstanceStatus.Rescheduled:
    case MarkInstanceStatus.Substituted:
    case MarkInstanceStatus.Cancelled:
      return "resolved";
    case MarkInstanceStatus.Expired:
      return "overdue";
    case MarkInstanceStatus.Blocked:
      return hasDependencies ? "dependency_required" : "blocked";
    case MarkInstanceStatus.Active:
    case MarkInstanceStatus.Ready:
      return "ready";
    case MarkInstanceStatus.Planned:
    default:
      return hasDependencies ? "dependency_required" : "needs_decision";
  }
}

function humanizeTodayMarkStatus(status: TodayMarkStatus, locale: Locale) {
  const map: Record<TodayMarkStatus, Record<Locale, string>> = {
    ready: { en: "Ready", vi: "San sang" },
    dependency_required: { en: "Dependency Required", vi: "Can phu thuoc" },
    blocked: { en: "Blocked", vi: "Bi chan" },
    ready_with_advisory: { en: "Ready", vi: "San sang" },
    ready_with_waiver: { en: "Ready", vi: "San sang" },
    needs_decision: { en: "Planned", vi: "Da len ke hoach" },
    done: { en: "Done", vi: "Da xong" },
    resolved: { en: "Resolved", vi: "Da giai quyet" },
    overdue: { en: "Overdue", vi: "Qua han" },
  };
  return map[status][locale];
}

function dependencyStatusLabel(status: MarkDependency["status"], locale: Locale) {
  const labels = {
    [DependencyStatus.Pending]: { en: "Pending", vi: "Dang cho" },
    [DependencyStatus.Satisfied]: { en: "Done", vi: "Da xong" },
    [DependencyStatus.Failed]: { en: "Blocked", vi: "Bi chan" },
    [DependencyStatus.Waived]: { en: "Waived", vi: "Duoc bo qua" },
    [DependencyStatus.Cancelled]: { en: "Cancelled", vi: "Da huy" },
  };
  return labels[status][locale];
}

function buildMarkSummary(mark: MarkInstance): TodayMarkItem["summary"] | undefined {
  const text = sanitizeUserFacingMarkDetail(mark.completionSummary || mark.proofNote || mark.description);
  return text ? { en: text, vi: text } : undefined;
}

function mapPackCheckLink(pack: PackCheckInstance, locale: Locale): TodayMarkActionSheetPackLink {
  return {
    id: pack.id,
    title: { en: pack.title, vi: pack.title },
    statusLabel: {
      en: humanizePackCheckStatus(pack.status, "en"),
      vi: humanizePackCheckStatus(pack.status, "vi"),
    },
    targetId: pack.id,
  };
}

function humanizePackCheckStatus(status: PackCheckInstance["status"], locale: Locale) {
  const labels: Record<PackCheckInstance["status"], Record<Locale, string>> = {
    scheduled: { en: "Scheduled", vi: "Da len lich" },
    available: { en: "Ready", vi: "San sang" },
    in_progress: { en: "In Progress", vi: "Dang lam" },
    partially_completed: { en: "In Progress", vi: "Dang lam" },
    completed: { en: "Done", vi: "Da xong" },
    skipped: { en: "Skipped", vi: "Da bo qua" },
    expired: { en: "Expired", vi: "Het han" },
    cancelled: { en: "Cancelled", vi: "Da huy" },
  };
  return labels[status][locale];
}

function normalizePackCheckReferenceLabel(value: string) {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function buildMarkTimeLabel(mark: MarkInstance): TodayMarkItem["timeLabel"] | undefined {
  const start = mark.scheduledStartAt;
  const end = mark.scheduledEndAt;
  const date = start || mark.dueAt || end;
  if (!date) {
    return undefined;
  }
  const enStart = start ? formatTime24(start, "en-US") : undefined;
  const viStart = start ? formatTime24(start, "vi-VN") : undefined;
  const enEnd = end ? formatTime24(end, "en-US") : undefined;
  const viEnd = end ? formatTime24(end, "vi-VN") : undefined;

  if (enStart && enEnd && viStart && viEnd) {
    return {
      en: `${enStart}-${enEnd}`,
      vi: `${viStart}-${viEnd}`,
    };
  }

  return {
    en: formatTime24(date, "en-US"),
    vi: formatTime24(date, "vi-VN"),
  };
}

function buildMarkSortAt(mark: MarkInstance): string | undefined {
  return mark.scheduledStartAt ?? mark.dueAt ?? mark.scheduledEndAt ?? mark.completedAt ?? mark.createdAt;
}

function buildMarkTimeRangeLabel(mark: MarkInstance): TodayMarkItem["timeRangeLabel"] | undefined {
  const start = mark.scheduledStartAt ?? mark.dueAt;
  const end = mark.scheduledEndAt;
  if (!start && !end) {
    return undefined;
  }

  return {
    start: start
      ? {
          en: formatTime24(start, "en-US"),
          vi: formatTime24(start, "vi-VN"),
        }
      : undefined,
    end: end
      ? {
          en: formatTime24(end, "en-US"),
          vi: formatTime24(end, "vi-VN"),
        }
      : undefined,
  };
}

function formatTime24(value: string, localeTag: "en-US" | "vi-VN") {
  return new Date(value).toLocaleTimeString(localeTag, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
