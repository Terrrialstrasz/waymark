import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type { CurrentExpeditionItem, CloseTrailStatus } from "../components/today/__fixtures__/todayExpedition.fixtures";
import type {
  TodayMarkActionSheetDependency,
  TodayMarkActionSheetConfig,
  TodayMarkItem,
  TodayMarkStatus,
  TodayPackCheckItem,
} from "../components/today/__fixtures__/todayCarousel.fixtures";
import type { PackCheckItem } from "../components/pack-check";
import type { TodayPathHeroPath } from "../lib/waymark/todayPathHero";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";
import type { TodayCockpitFeatureFlags } from "../components/today/TodayCockpitScreen";
import type { Locale, PathId } from "../types/ui";
import type { PackCheckInstance, PackCheckItemInstance, Path, Expedition, MarkDependency, MarkInstance, Signal } from "../domain/waymark";
import {
  DependencyStatus,
  ExpeditionStatus,
  MarkInstanceStatus,
  PackCheckInstanceStatus,
  SignalStatus,
  SignalTargetType,
  TrailDayStatus,
  WorkoutSessionStatus,
} from "../domain/waymark/enums";
import { useWaymarkApp } from "./WaymarkAppProvider";
import type { WaymarkAppServices } from "./WaymarkAppProvider";
import { getPackCheckSurfacePolicy } from "../lib/waymark/packCheckSurfacePolicyStore";
import { getPackCheckCatalogEntryByTitle } from "../config/packCheckCatalog";
import { ensureMarkExecutionChecklist, setMarkExecutionChecklistItemChecked } from "../lib/waymark/markExecutionChecklistStore";
import { getMarkTemplateSeedMetadata } from "../lib/waymark/markTemplateSeedStore";
import {
  optimisticallyCompleteTodayMark,
  optimisticallyCompleteTodayPackCheck,
  optimisticallyResolveTodayMark,
  optimisticallyToggleChecklistItem,
  optimisticallyToggleTodayPackCheckItem,
  rollbackCompletedTodayMark,
} from "./todayMutationState";
import { getCurrentRuntimeLocalDate, materializeRuntimeForDate } from "./runtimeLifecycle";
import {
  loadTodayData as loadTodayDataCore,
  reportTodayLoadIssue as reportTodayLoadIssueCore,
  type TodayData as TodayDataModel,
} from "./todayDataLoader";
import { resolveGolfPracticeWorkoutTypeForMarkTitle } from "../lib/waymark/golfPracticeMark";

type TodayData = {
  trailDayId: string;
  selectedPathId: PathId;
  paths: TodayPathHeroPath[];
  marks: TodayMarkItem[];
  packChecks: TodayPackCheckItem[];
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

type TodayState =
  | { status: "loading"; data: null; error: null; isRefreshing: false }
  | { status: "error"; data: null; error: Error; isRefreshing: false }
  | { status: "ready"; data: TodayDataModel; error: null; isRefreshing: boolean };

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
  isIndependentPackChecksEnabled: true,
  isPrepareTomorrowEnabled: true,
  isPackCheckDetailEnabled: true,
  isCurrentExpeditionEnabled: true,
  isExpeditionDetailEnabled: true,
  isCloseTrailEnabled: true,
};

function reportTodayLoadIssue(stage: string, error: unknown) {
  console.error(`[WaymarkToday] ${stage}`, error);
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
): Promise<TodayDataModel> {
  return loadTodayDataCore(app, locale, options);
}

export function useWaymarkToday(locale: Locale, options: { enabled?: boolean } = {}) {
  const app = useWaymarkApp();
  const enabled = options.enabled ?? true;
  const lastLoadedLocalDateRef = useRef<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const [state, setState] = useState<TodayState>({
    status: "loading",
    data: null,
    error: null,
    isRefreshing: false,
  });

  const loadToday = useCallback(
    async ({ preserveData }: { preserveData: boolean }) => {
      if (!enabled) {
        return;
      }

      const requestId = ++loadRequestIdRef.current;

      setState((current) => {
        if (!preserveData || current.status !== "ready") {
          return { status: "loading", data: null, error: null, isRefreshing: false };
        }

        return {
          ...current,
          isRefreshing: true,
        };
      });

      try {
        const data = await loadTodayDataCore(app, locale);
        const localDate = getCurrentRuntimeLocalDate(app.user.timezone, new Date());

        if (requestId !== loadRequestIdRef.current) {
          return;
        }

        lastLoadedLocalDateRef.current = localDate;
        setState((current) => ({
          status: "ready",
          error: null,
          data: current.status === "ready" && preserveData ? { ...current.data, ...data } : data,
          isRefreshing: false,
        }));
      } catch (error) {
        reportTodayLoadIssueCore("today load", error);
        if (requestId !== loadRequestIdRef.current) {
          return;
        }

        setState((current) => {
          if (preserveData && current.status === "ready") {
            return {
              ...current,
              isRefreshing: false,
            };
          }

          return {
            status: "error",
            data: null,
            error: error instanceof Error ? error : new Error("Failed to load Today."),
            isRefreshing: false,
          };
        });
      }
    },
    [app, enabled, locale],
  );

  const refresh = useCallback(
    (preserveData = state.status === "ready") => {
      if (!enabled) {
        return;
      }
      void loadToday({ preserveData });
    },
    [enabled, loadToday, state.status],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const currentLocalDate = getCurrentRuntimeLocalDate(app.user.timezone, new Date());
    if (lastLoadedLocalDateRef.current === currentLocalDate) {
      return;
    }
    void loadToday({ preserveData: state.status === "ready" });
  }, [app.user.timezone, enabled, loadToday, state.status]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        return;
      }
      const currentLocalDate = getCurrentRuntimeLocalDate(app.user.timezone, new Date());
      if (lastLoadedLocalDateRef.current !== currentLocalDate) {
        void loadToday({ preserveData: false });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [app.user.timezone, enabled, loadToday]);

  const actions = useMemo(
    () => ({
      refresh,
      async completeMark(markId: string) {
        let rollbackSnapshot: TodayDataModel | null = null;

        setState((current) => {
          if (current.status !== "ready") {
            return current;
          }
          rollbackSnapshot = current.data;
          return {
            ...current,
            data: optimisticallyCompleteTodayMark(current.data, markId),
          };
        });

        try {
          await app.markEngine.completeMarkInstance({ markInstanceId: markId });
        } catch (error) {
          if (rollbackSnapshot) {
            setState((current) => {
              if (current.status !== "ready") {
                return current;
              }
              return {
                ...current,
                data: rollbackCompletedTodayMark(current.data, rollbackSnapshot!, markId),
              };
            });
          }
          throw error;
        }
      },
      async skipMark(markId: string) {
        let rollbackSnapshot: TodayDataModel | null = null;

        setState((current) => {
          if (current.status !== "ready") {
            return current;
          }
          rollbackSnapshot = current.data;
          return {
            ...current,
            data: optimisticallyResolveTodayMark(current.data, markId),
          };
        });

        try {
          await app.markEngine.skipMarkInstance({ markInstanceId: markId });
        } catch (error) {
          if (rollbackSnapshot) {
            setState((current) => (current.status === "ready" ? { ...current, data: rollbackSnapshot! } : current));
          }
          throw error;
        }
      },
      async rescheduleMark(markId: string, value: { date: string; startTime?: string; endTime?: string }) {
        let rollbackSnapshot: TodayDataModel | null = null;

        setState((current) => {
          if (current.status !== "ready") {
            return current;
          }
          rollbackSnapshot = current.data;
          return {
            ...current,
            data: optimisticallyResolveTodayMark(current.data, markId),
          };
        });

        try {
          await app.markEngine.rescheduleMarkInstance({
            markInstanceId: markId,
            targetLocalDate: value.date,
            scheduledStartAt: value.startTime ? buildMoveDateTime(value.date, value.startTime) : undefined,
            scheduledEndAt: value.endTime ? buildMoveDateTime(value.date, value.endTime) : undefined,
          });
        } catch (error) {
          if (rollbackSnapshot) {
            setState((current) => (current.status === "ready" ? { ...current, data: rollbackSnapshot! } : current));
          }
          throw error;
        }
      },
      async togglePackCheckItem(packCheckId: string, itemId: string, checked: boolean) {
        let rollbackSnapshot: TodayDataModel | null = null;

        setState((current) => {
          if (current.status !== "ready") {
            return current;
          }
          rollbackSnapshot = current.data;
          return {
            ...current,
            data: optimisticallyToggleTodayPackCheckItem(current.data, packCheckId, itemId, checked),
          };
        });

        try {
          await app.packCheckEngine.setPackCheckItemChecked(packCheckId, itemId, checked);
        } catch (error) {
          if (rollbackSnapshot) {
            setState((current) => (current.status === "ready" ? { ...current, data: rollbackSnapshot! } : current));
          }
          throw error;
        }
      },
      async completePackCheck(packCheckId: string) {
        let rollbackSnapshot: TodayDataModel | null = null;

        setState((current) => {
          if (current.status !== "ready") {
            return current;
          }
          rollbackSnapshot = current.data;
          return {
            ...current,
            data: optimisticallyCompleteTodayPackCheck(current.data, packCheckId),
          };
        });

        try {
          await app.packCheckEngine.completePackCheckInstance({ packCheckInstanceId: packCheckId });
        } catch (error) {
          if (rollbackSnapshot) {
            setState((current) => (current.status === "ready" ? { ...current, data: rollbackSnapshot! } : current));
          }
          throw error;
        }
      },
      async toggleEmbeddedChecklistItem(_markId: string, packCheckId: string, itemId: string, checked: boolean) {
        let rollbackSnapshot: TodayDataModel | null = null;

        setState((current) => {
          if (current.status !== "ready") {
            return current;
          }
          rollbackSnapshot = current.data;
          return {
            ...current,
            data: optimisticallyToggleChecklistItem(current.data, _markId, packCheckId, itemId, checked),
          };
        });

        if (packCheckId.startsWith("execution:")) {
          try {
            const markId = packCheckId.slice("execution:".length);
            await setMarkExecutionChecklistItemChecked(app.repositories.appSettings, app.user.id, markId, itemId, checked);
          } catch (error) {
            if (rollbackSnapshot) {
              setState((current) => {
                if (current.status !== "ready") {
                  return current;
                }
                return {
                  ...current,
                  data: rollbackSnapshot!,
                };
              });
            }
            throw error;
          }
          return;
        }

        try {
          await app.packCheckEngine.setPackCheckItemChecked(packCheckId, itemId, checked);
        } catch (error) {
          if (rollbackSnapshot) {
            setState((current) => {
              if (current.status !== "ready") {
                return current;
              }
              return {
                ...current,
                data: rollbackSnapshot!,
              };
            });
          }
          throw error;
        }
      },
      async setAnchorPath(pathId: PathId) {
        if (state.status !== "ready") {
          return;
        }
        const now = new Date();
        const localDate = formatLocalDate(now, app.user.timezone);
        const trailDay = await app.repositories.trailDays.getOrCreateTrailDay(app.user.id, localDate);
        const path = await findPathByUiPathId(app.repositories.paths.listActivePaths(app.user.id), pathId);
        if (!path) {
          return;
        }
        await app.repositories.trailDays.setAnchorPath(trailDay.id, path.id);
        void loadToday({ preserveData: true });
      },
    }),
    [app, loadToday, refresh, state.status],
  );

  return { ...state, ...actions };
}

async function refreshMarkReadinessIfNeeded(app: ReturnType<typeof useWaymarkApp>, mark: MarkInstance) {
  if (
    mark.status === MarkInstanceStatus.Planned ||
    mark.status === MarkInstanceStatus.Ready ||
    mark.status === MarkInstanceStatus.Blocked
  ) {
    return app.markEngine.refreshMarkReadiness(mark.id);
  }
  return mark;
}

async function loadSignalIndex(
  app: ReturnType<typeof useWaymarkApp>,
  targetType: SignalTargetType,
  targetIds: string[],
) {
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
  app: ReturnType<typeof useWaymarkApp>,
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
        } satisfies TodayMarkActionSheetDependency;
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
      } satisfies TodayMarkActionSheetDependency;
    }),
  );

  return items.filter((item): item is TodayMarkActionSheetDependency => item !== null);
}

async function buildEmbeddedChecklist(
  app: ReturnType<typeof useWaymarkApp>,
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
  signal: Signal | undefined,
  embeddedChecklist: TodayMarkActionSheetConfig["embeddedChecklist"] | undefined,
  templateMetadata: Awaited<ReturnType<typeof getMarkTemplateSeedMetadata>> | null,
  workoutPrimaryAction: Pick<TodayMarkActionSheetConfig, "primaryActionLabel" | "primaryActionHint"> | null,
): TodayMarkItem | null {
  const pathId = mapPathToUiPathId(path);
  if (!pathId) {
    return null;
  }

  const status = mapMarkStatus(mark.status, dependencies.length > 0);
  const isWorkoutMark = templateMetadata?.blockType === "workout_block";
  const golfPracticeWorkoutType = pathId === "golf" ? resolveGolfPracticeWorkoutTypeForMarkTitle(mark.title) : null;
  const isGolfPracticeMark = Boolean(golfPracticeWorkoutType);
  const primaryAction = isGolfPracticeMark
    ? {
        primaryActionLabel: { en: "Start Practice", vi: "Bắt đầu luyện tập" },
        primaryActionHint: { en: "Enter the Golf Practice flow for this planned mark.", vi: "Vào flow Golf Practice cho planned mark này." },
      }
    : workoutPrimaryAction;
  const actionSheet: TodayMarkActionSheetConfig | undefined =
    dependencies.length > 0 || mark.description || signal || embeddedChecklist || isWorkoutMark || isGolfPracticeMark
      ? {
          statusLabel: {
            en: humanizeTodayMarkStatus(status, "en"),
            vi: humanizeTodayMarkStatus(status, "vi"),
          },
          intentionText: mark.description
            ? { en: mark.description, vi: mark.description }
            : undefined,
          signalLabel: signal
            ? {
                en: "Open the active signal for this mark.",
                vi: "Mở signal đang hoạt động cho mốc này.",
              }
            : undefined,
          dependencies: dependencies.length > 0 ? dependencies : undefined,
          embeddedChecklist,
          primaryActionLabel: primaryAction?.primaryActionLabel,
          primaryActionHint: primaryAction?.primaryActionHint,
        }
      : undefined;

  return {
    id: mark.id,
    title: { en: mark.title, vi: mark.title },
    pathId,
    status,
    interactionKind: isWorkoutMark ? "strength_session" : isGolfPracticeMark ? "golf_practice" : "default",
    summary: buildMarkSummary(mark, locale),
    timeLabel: buildMarkTimeLabel(mark, locale),
    detailEnabled: true,
    actionSheet,
  };
}

async function buildWorkoutPrimaryActionConfig(
  app: WaymarkAppServices,
  mark: MarkInstance,
  templateMetadata: Awaited<ReturnType<typeof getMarkTemplateSeedMetadata>> | null,
): Promise<Pick<TodayMarkActionSheetConfig, "primaryActionLabel" | "primaryActionHint"> | null> {
  if (templateMetadata?.blockType !== "workout_block") {
    return null;
  }

  const session = await app.repositories.strength.getSessionByMarkInstance(mark.id);
  if (!session || session.status === WorkoutSessionStatus.NotStarted || session.status === WorkoutSessionStatus.Abandoned) {
    return {
      primaryActionLabel: { en: "Start Workout", vi: "Bắt đầu buổi tập" },
      primaryActionHint: { en: "Enter the workout flow for this planned mark.", vi: "Vào flow thực hiện buổi tập cho planned mark này." },
    };
  }

  if (session.status === WorkoutSessionStatus.Completed) {
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
  signal: Signal | undefined,
  isPrepareTomorrow: boolean,
): TodayPackCheckItem {
  const remainingRequired = items.filter((item) => item.isRequired && !item.isChecked).length;
  const linkedMark = pack.targetMarkInstanceId ? marks.find((mark) => mark.id === pack.targetMarkInstanceId) : undefined;
  const linkedPath = linkedMark ? pathById.get(linkedMark.pathId) : undefined;
  const catalogEntry = getPackCheckCatalogEntryByTitle(pack.title);
  const fallbackTone =
    isPrepareTomorrow ? "evening" : linkedPath?.slug.includes("health") ? "gym" : linkedPath?.slug.includes("career") ? "office" : "morning";

  return {
    id: pack.id,
    title: { en: pack.title, vi: pack.title },
    count: remainingRequired > 0 ? remainingRequired : items.length,
    tone: catalogEntry?.tone ?? fallbackTone,
    sourceSeedId: catalogEntry?.sourceSeedId,
    section: isPrepareTomorrow ? "prepare_tomorrow" : "independent",
    supportLabel: signal
      ? { en: "Signal active", vi: "Đang có signal" }
      : linkedMark
        ? { en: linkedMark.title, vi: linkedMark.title }
        : undefined,
    detailEnabled: true,
    pathId: catalogEntry?.uiPathId ?? mapPathToUiPathId(linkedPath),
  };
}

async function loadCurrentExpeditions(
  app: ReturnType<typeof useWaymarkApp>,
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
  app: ReturnType<typeof useWaymarkApp>,
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
          vi: `Cột mốc: ${firstOpenMilestone.title}`,
        }
      : undefined,
    deadlineLabel: currentDeadline
      ? {
          en: `Deadline: ${currentDeadline}`,
          vi: `Hạn: ${currentDeadline}`,
        }
      : undefined,
    pathId,
    detailEnabled: true,
  };
}

async function deriveCloseTrailStatus(
  app: ReturnType<typeof useWaymarkApp>,
  trailDayId: string,
  asOf: string,
): Promise<CloseTrailStatus> {
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
  readiness: Awaited<ReturnType<ReturnType<typeof useWaymarkApp>["closeTrailEngine"]["evaluateCloseReadiness"]>>,
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

async function findPathByUiPathId(pathsPromise: Promise<Path[]>, pathId: PathId) {
  const paths = await pathsPromise;
  return paths.find((path) => mapPathToUiPathId(path) === pathId);
}

function mapMarkStatus(status: MarkInstanceStatus, hasDependencies: boolean): TodayMarkStatus {
  switch (status) {
    case MarkInstanceStatus.Completed:
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
    ready: { en: "Ready", vi: "Sẵn sàng" },
    dependency_required: { en: "Dependency Required", vi: "Cần phụ thuộc" },
    blocked: { en: "Blocked", vi: "Bị chặn" },
    ready_with_advisory: { en: "Ready", vi: "Sẵn sàng" },
    ready_with_waiver: { en: "Ready", vi: "Sẵn sàng" },
    needs_decision: { en: "Planned", vi: "Đã lên kế hoạch" },
    done: { en: "Done", vi: "Đã xong" },
    resolved: { en: "Resolved", vi: "Đã giải quyết" },
    overdue: { en: "Overdue", vi: "Quá hạn" },
  };
  return map[status][locale];
}

function dependencyStatusLabel(status: MarkDependency["status"], locale: Locale) {
  const labels = {
    [DependencyStatus.Pending]: { en: "Pending", vi: "Đang chờ" },
    [DependencyStatus.Satisfied]: { en: "Done", vi: "Đã xong" },
    [DependencyStatus.Failed]: { en: "Blocked", vi: "Bị chặn" },
    [DependencyStatus.Waived]: { en: "Waived", vi: "Được bỏ qua" },
    [DependencyStatus.Cancelled]: { en: "Cancelled", vi: "Đã huỷ" },
  };
  return labels[status][locale];
}

function buildMarkSummary(mark: MarkInstance, locale: Locale): TodayMarkItem["summary"] | undefined {
  const text = mark.completionSummary || mark.proofNote || mark.description;
  return text ? { en: text, vi: text } : undefined;
}

function buildMoveDateTime(localDate: string, time: string) {
  return `${localDate}T${time}:00.000`;
}

function buildMarkTimeLabel(mark: MarkInstance, locale: Locale): TodayMarkItem["timeLabel"] | undefined {
  const start = mark.scheduledStartAt;
  const end = mark.scheduledEndAt;
  const date = start || mark.dueAt || end;
  if (!date) {
    return undefined;
  }
  const enOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const viOptions: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  const enStart = start ? new Date(start).toLocaleTimeString("en-US", enOptions) : undefined;
  const viStart = start ? new Date(start).toLocaleTimeString("vi-VN", viOptions) : undefined;
  const enEnd = end ? new Date(end).toLocaleTimeString("en-US", enOptions) : undefined;
  const viEnd = end ? new Date(end).toLocaleTimeString("vi-VN", viOptions) : undefined;

  if (enStart && enEnd && viStart && viEnd) {
    return {
      en: `${enStart}–${enEnd}`,
      vi: `${viStart}–${viEnd}`,
    };
  }

  return {
    en: new Date(date).toLocaleTimeString("en-US", enOptions),
    vi: new Date(date).toLocaleTimeString("vi-VN", viOptions),
  };
}

function formatLocalDate(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}
