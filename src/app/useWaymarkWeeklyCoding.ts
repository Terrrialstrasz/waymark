import { useCallback, useEffect, useMemo, useState } from "react";
import type { MoveMarkValue } from "../components/planned-mark/PlannedMarkActionSheetContent";
import { MarkDetailItem } from "../components/mark-detail/model";
import { WeeklyCodingReportItem } from "../components/weekly-coding/WeeklyCoding.types";
import type { BacklogItem, Expedition, MarkInstance, Milestone, Path, WeekPlan, WeekPlanItem } from "../domain/waymark";
import { BacklogItemStatus, BacklogItemType, MarkInstanceStatus, SignalStatus, SignalTargetType, WeekPlanItemStatus, WeekPlanStatus } from "../domain/waymark/enums";
import { getMarkMetadata, setMarkMetadata } from "../lib/waymark/markMetadataStore";
import { recomputeTrailDayCountersForDate } from "../lib/waymark/plannedMarkSourceOfTruth";
import type { Locale } from "../types/ui";
import { useWaymarkApp, type WaymarkAppServices } from "./WaymarkAppProvider";
import { formatDayLabel, formatLocalDate, formatWeekRangeLabel, getWeekEndDate, getWeekStartDate, mapUiPathId, pathLabelById } from "./waymarkUi";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";
import { materializeWeeklyPlannedMark } from "../lib/waymark/weeklyPlannedMarkMaterializer";

type WeeklyTimetableReviewItem = {
  id: string;
  localDate: string | null;
  dayLabel: string;
  timeLabel: string;
  title: string;
  pathLabel: string;
  expeditionLabel?: string;
  milestoneLabel?: string;
  createdMarkInstanceId?: string;
  createdMarkStatus?: string;
  issue?: string;
};

type WeeklyTimetableReviewDay = {
  id: string;
  localDate: string | null;
  label: string;
  items: WeeklyTimetableReviewItem[];
};

type WeeklyTimetableVerificationSummary = {
  weekPlanItemCount: number;
  materializedMarkCount: number;
  missingCreatedMarkInstanceCount: number;
  duplicateMarkCount: number;
  lastImportedAt?: string;
};

type WeeklySignalReviewItem = {
  id: string;
  localDate: string;
  timeLabel: string;
  title: string;
  statusLabel: string;
  targetTypeLabel: string;
  targetTitle: string;
  snoozedUntilLabel?: string;
};

type WeeklySignalReviewDay = {
  id: string;
  localDate: string;
  label: string;
  items: WeeklySignalReviewItem[];
};

type WeeklySignalSummary = {
  activeSignalCount: number;
  scheduledCount: number;
  ringingCount: number;
  snoozedCount: number;
  weekStartDate: string;
  weekEndDate: string;
};

type WeeklyData = {
  weekPlan: WeekPlan | null;
  items: WeekPlanItem[];
  backlogById: Record<string, BacklogItem>;
  pathsById: Record<string, Path>;
  expeditionsById: Record<string, Expedition>;
  milestonesById: Record<string, Milestone>;
  createdMarksById: Record<string, MarkInstance>;
  signalDays: WeeklySignalReviewDay[];
  signalSummary: WeeklySignalSummary;
  selectedWeekStart: string;
};

type WeeklyState =
  | { status: "loading"; error: null; data: null }
  | { status: "error"; error: Error; data: null }
  | { status: "ready"; error: null; data: WeeklyData };

export function useWaymarkWeeklyCoding(locale: Locale, options: { enabled?: boolean } = {}) {
  const app = useWaymarkApp();
  const enabled = options.enabled ?? true;
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() =>
    getWeekStartDate(formatLocalDate(new Date(), app.user.timezone), app.user.weekStartsOn),
  );
  const [state, setState] = useState<WeeklyState>({
    status: "loading",
    error: null,
    data: null,
  });

  const refresh = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      setState({ status: "loading", error: null, data: null });

      try {
        const weekPlan = await app.repositories.weekPlans.getByWeekStart(app.user.id, selectedWeekStart);
        const items = weekPlan ? await app.repositories.weekPlans.listItems(weekPlan.id) : [];
        const activeItems = items.filter((item) => item.status !== WeekPlanItemStatus.Removed);
        const linkedBacklog = await Promise.all(
          activeItems
            .filter(hasBacklogItemId)
            .map((item) => app.repositories.backlog.getById(item.backlogItemId)),
        );
        const paths = await app.repositories.paths.listActivePaths(app.user.id);

        const expeditionIds = [...new Set(activeItems.map((item) => item.expeditionId).filter((value): value is string => Boolean(value)))];
        const expeditions = await Promise.all(expeditionIds.map((id) => app.repositories.expeditions.getExpeditionById(id)));
        const expeditionList = expeditions.filter((item): item is Expedition => Boolean(item));
        const milestones = await Promise.all(
          expeditionList.map((expedition) => app.repositories.expeditions.listMilestonesByExpedition(expedition.id)),
        );
        const milestoneList = milestones.flat();
        const createdMarkIds = [...new Set(activeItems.map((item) => item.createdMarkInstanceId).filter((value): value is string => Boolean(value)))];
        const createdMarks = await Promise.all(createdMarkIds.map((id) => app.repositories.marks.getMarkInstanceById(id)));
        const signalReview = await loadWeeklySignals(app, selectedWeekStart, getWeekEndDate(selectedWeekStart), locale);

        if (!cancelled) {
          setState({
            status: "ready",
            error: null,
            data: {
              weekPlan,
              items: activeItems,
              backlogById: Object.fromEntries(
                linkedBacklog.filter((item): item is BacklogItem => Boolean(item)).map((item) => [item.id, item]),
              ),
              pathsById: Object.fromEntries(paths.map((path) => [path.id, path])),
              expeditionsById: Object.fromEntries(expeditionList.map((expedition) => [expedition.id, expedition])),
              milestonesById: Object.fromEntries(milestoneList.map((milestone) => [milestone.id, milestone])),
              createdMarksById: Object.fromEntries(
                createdMarks.filter((mark): mark is MarkInstance => Boolean(mark)).map((mark) => [mark.id, mark]),
              ),
              signalDays: signalReview.days,
              signalSummary: signalReview.summary,
              selectedWeekStart,
            },
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load weekly coding."),
            data: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, enabled, reloadToken, selectedWeekStart]);

  const pulledItems = useMemo(() => {
    if (state.status !== "ready") {
      return [] as WeeklyCodingReportItem[];
    }
    return state.data.items
      .map((item) =>
        mapWeeklyItem(
          item,
          item.backlogItemId ? state.data.backlogById[item.backlogItemId] : undefined,
          state.data.pathsById,
          locale,
        ),
      )
      .filter((item): item is WeeklyCodingReportItem => Boolean(item));
  }, [locale, state]);

  const detailById = useMemo(() => {
    if (state.status !== "ready") {
      return {} as Record<string, MarkDetailItem>;
    }

    return Object.fromEntries(
      state.data.items.map((item) => [
        item.id,
        mapWeekPlanDetailItem(
          item,
          item.backlogItemId ? state.data.backlogById[item.backlogItemId] : undefined,
          state.data.pathsById,
          state.data.expeditionsById,
          state.data.milestonesById,
          state.data.createdMarksById,
          locale,
        ),
      ]),
    );
  }, [locale, state]);

  const reviewDays = useMemo(() => {
    if (state.status !== "ready") {
      return [] as WeeklyTimetableReviewDay[];
    }

    const grouped = new Map<string, WeeklyTimetableReviewDay>();
    for (const item of state.data.items) {
      const localDate = item.localDate ?? null;
      const key = localDate ?? "unscheduled";
      const group =
        grouped.get(key) ??
        {
          id: key,
          localDate,
          label:
            localDate ?
              formatDayLabel(localDate, locale)
            : locale === "vi" ? "Chua xep lich" : "Unscheduled",
          items: [],
        };

      const path = item.pathId ? state.data.pathsById[item.pathId] : undefined;
      const expedition = item.expeditionId ? state.data.expeditionsById[item.expeditionId] : undefined;
      const milestone = item.milestoneId ? state.data.milestonesById[item.milestoneId] : undefined;
      const createdMark = item.createdMarkInstanceId ? state.data.createdMarksById[item.createdMarkInstanceId] : undefined;
      group.items.push({
        id: item.id,
        localDate,
        dayLabel: group.label,
        timeLabel: item.startTime && item.endTime ? `${item.startTime}-${item.endTime}` : item.blockKey ?? "No slot",
        title: item.title ?? (locale === "vi" ? "Muc lich khong ten" : "Untitled timetable item"),
        pathLabel: path?.title ?? item.expeditionContext ?? (locale === "vi" ? "Chua gan path" : "No path"),
        expeditionLabel: expedition?.title ?? item.expeditionContext ?? undefined,
        milestoneLabel: milestone?.title ?? item.milestoneContext ?? undefined,
        createdMarkInstanceId: item.createdMarkInstanceId,
        createdMarkStatus: createdMark?.status,
        issue:
          !item.createdMarkInstanceId ? locale === "vi" ? "Chua materialize mark" : "Missing created mark"
          : !createdMark ? locale === "vi" ? "Con tro mark bi hong" : "Broken created mark link"
          : undefined,
      });
      grouped.set(key, group);
    }

    return [...grouped.values()].sort((left, right) => {
      if (!left.localDate) {
        return 1;
      }
      if (!right.localDate) {
        return -1;
      }
      return left.localDate.localeCompare(right.localDate);
    });
  }, [locale, state]);

  const reviewSummary = useMemo(() => {
    if (state.status !== "ready") {
      return null as WeeklyTimetableVerificationSummary | null;
    }

    const createdMarkIds = state.data.items
      .map((item) => item.createdMarkInstanceId)
      .filter((value): value is string => Boolean(value));
    const duplicateMarkCount = Object.values(
      createdMarkIds.reduce<Record<string, number>>((accumulator, id) => {
        accumulator[id] = (accumulator[id] ?? 0) + 1;
        return accumulator;
      }, {}),
    ).filter((count) => count > 1).length;

    return {
      weekPlanItemCount: state.data.items.length,
      materializedMarkCount: createdMarkIds.length,
      missingCreatedMarkInstanceCount: state.data.items.filter((item) => !item.createdMarkInstanceId).length,
      duplicateMarkCount,
      lastImportedAt: state.data.weekPlan?.updatedAt,
    };
  }, [state]);

  const signalDays = state.status === "ready" ? state.data.signalDays : [];
  const signalSummary = state.status === "ready" ? state.data.signalSummary : null;

  const actions = useMemo(
    () => ({
      refresh,
      selectedWeekLabel: locale === "vi" ? "Tuan nay" : "This Week",
      selectedWeekDateRange: formatWeekRangeLabel(selectedWeekStart, locale),
      previousWeekDisabled: false,
      nextWeekDisabled: false,
      previousWeek() {
        setSelectedWeekStart((current) => shiftWeek(current, -7));
      },
      nextWeek() {
        setSelectedWeekStart((current) => shiftWeek(current, 7));
      },
      async removeFromWeek(itemId: string) {
        if (state.status !== "ready" || !state.data.weekPlan) {
          return;
        }
        const item = state.data.items.find((entry) => entry.id === itemId);
        if (!item) {
          return;
        }
        await app.repositories.weekPlans.upsertItems([
          {
            ...item,
            status: WeekPlanItemStatus.Removed,
          },
        ]);
        const backlog = item.backlogItemId ? state.data.backlogById[item.backlogItemId] : undefined;
        if (backlog && backlog.status === BacklogItemStatus.Pulled) {
          await app.repositories.backlog.upsert({
            ...backlog,
            status: BacklogItemStatus.Open,
          });
        }
        refresh();
      },
      async deleteItem(itemId: string) {
        if (state.status !== "ready") {
          return;
        }
        const item = state.data.items.find((entry) => entry.id === itemId);
        if (!item) {
          return;
        }
        await app.repositories.weekPlans.softDeleteWeekPlanItem(item.id);
        const backlog = item.backlogItemId ? state.data.backlogById[item.backlogItemId] : undefined;
        if (backlog && backlog.status === BacklogItemStatus.Pulled) {
          await app.repositories.backlog.upsert({
            ...backlog,
            status: BacklogItemStatus.Open,
          });
        }
        refresh();
      },
      async addItemToToday(itemId: string) {
        if (state.status !== "ready") {
          return;
        }
        const item = state.data.items.find((entry) => entry.id === itemId);
        if (!item) {
          return;
        }
        if (item.createdMarkInstanceId) {
          const existingMetadata = await getMarkMetadata(app.repositories.appSettings, app.user.id, item.createdMarkInstanceId);
          await setMarkMetadata(app.repositories.appSettings, app.user.id, {
            ...existingMetadata,
            markId: item.createdMarkInstanceId,
            appearsInToday: true,
            orderIndex: item.sortOrder,
          });
          if (item.localDate) {
            await recomputeTrailDayCountersForDate(app.repositories, app.user.id, item.localDate);
          }
          refresh();
          return;
        }

        const result = await materializeWeeklyPlannedMark(app.repositories, app.user.id, item, { allowOverlap: true });
        if (result.mark && item.localDate) {
          await recomputeTrailDayCountersForDate(app.repositories, app.user.id, item.localDate);
        }
        refresh();
      },
      async moveItem(itemId: string, value: MoveMarkValue) {
        if (state.status !== "ready") {
          return;
        }
        const item = state.data.items.find((entry) => entry.id === itemId);
        if (!item) {
          return;
        }

        const nextLocalDate = value.date.trim();
        const nextStartTime = value.startTime?.trim() || item.startTime;
        const nextEndTime = value.endTime?.trim() || item.endTime || (nextStartTime ? addMinutesToTime(nextStartTime, 90) : undefined);
        const previousLocalDate = item.localDate;
        const updatedItem =
          (
            await app.repositories.weekPlans.upsertItems([
              {
                ...item,
                localDate: nextLocalDate,
                startTime: nextStartTime,
                endTime: nextEndTime,
              },
            ])
          )[0] ?? item;

        const linkedMark = item.createdMarkInstanceId ? await app.repositories.marks.getMarkInstanceById(item.createdMarkInstanceId) : null;
        const nextStartAt = nextStartTime ? buildFloatingDateTime(nextLocalDate, nextStartTime) : undefined;
        const nextEndAt = nextEndTime ? buildFloatingDateTime(nextLocalDate, nextEndTime) : undefined;

        if (linkedMark && canMoveExistingMark(linkedMark.status)) {
          const existingSignals = await app.repositories.signals.listSignalsByTarget(SignalTargetType.MarkInstance, linkedMark.id);
          if (previousLocalDate && previousLocalDate !== nextLocalDate) {
            const previousGenerationKey = linkedMark.generationKey;
            const rescheduled = await app.markEngine.rescheduleMarkInstance({
              markInstanceId: linkedMark.id,
              targetLocalDate: nextLocalDate,
              scheduledStartAt: nextStartAt,
              scheduledEndAt: nextEndAt,
              dueAt: nextEndAt,
              reason: "Moved from Weekly detail",
            });
            let replacement = rescheduled.replacement;
            if (previousGenerationKey) {
              await app.repositories.marks.updateMarkInstance(rescheduled.original.id, { generationKey: null });
              replacement = await app.repositories.marks.updateMarkInstance(replacement.id, { generationKey: previousGenerationKey });
            }
            await app.repositories.weekPlans.upsertItems([{ ...updatedItem, createdMarkInstanceId: replacement.id }]);
            await setMarkMetadata(app.repositories.appSettings, app.user.id, {
              ...(await getMarkMetadata(app.repositories.appSettings, app.user.id, replacement.id)),
              markId: replacement.id,
              appearsInToday: true,
              orderIndex: updatedItem.sortOrder,
            });
            if (nextStartAt && existingSignals.some((signal) => WEEKLY_MOVE_SIGNAL_STATUSES.has(signal.status))) {
              await app.repositories.signals.createSignal({
                userId: app.user.id,
                targetType: SignalTargetType.MarkInstance,
                targetId: replacement.id,
                scheduledAt: nextStartAt,
                status: SignalStatus.Scheduled,
              });
            }
          } else {
            await app.repositories.marks.updateMarkInstance(linkedMark.id, {
              scheduledStartAt: nextStartAt ?? null,
              scheduledEndAt: nextEndAt ?? null,
              dueAt: nextEndAt ?? null,
            });
            if (nextStartAt) {
              await updateMovableSignalsForMark(app, linkedMark.id, nextStartAt);
            }
          }
        } else if (!linkedMark) {
          await materializeWeeklyPlannedMark(app.repositories, app.user.id, updatedItem, { allowOverlap: true });
        }

        if (previousLocalDate) {
          await recomputeTrailDayCountersForDate(app.repositories, app.user.id, previousLocalDate);
        }
        await recomputeTrailDayCountersForDate(app.repositories, app.user.id, nextLocalDate);
        refresh();
      },
      async getWeekPlanItemById(itemId: string) {
        return app.repositories.weekPlans.getItemById(itemId);
      },
      async ensureCurrentWeekPlan() {
        const weekStartDate = getWeekStartDate(formatLocalDate(new Date(), app.user.timezone), app.user.weekStartsOn);
        const existing = await app.repositories.weekPlans.getByWeekStart(app.user.id, weekStartDate);
        return (
          existing ??
          app.repositories.weekPlans.upsertWeekPlan({
            id: createLocalId("week_plan"),
            userId: app.user.id,
            weekStartDate,
            weekEndDate: getWeekEndDate(weekStartDate),
            status: WeekPlanStatus.Active,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        );
      },
    }),
    [app, locale, refresh, selectedWeekStart, state],
  );

  return {
    ...state,
    pulledItems,
    detailById,
    reviewDays,
    reviewSummary,
    signalDays,
    signalSummary,
    weekPlan: state.status === "ready" ? state.data.weekPlan : null,
    ...actions,
  };
}

function mapWeeklyItem(
  item: WeekPlanItem,
  backlog: BacklogItem | undefined,
  pathsById: Record<string, Path>,
  locale: Locale,
): WeeklyCodingReportItem | null {
  if (!backlog) {
    return null;
  }
  const pathId = resolveWeeklyPathId(item, backlog, pathsById[backlog.pathId ?? ""]);
  const path = todayPathHeroPaths.find((entry) => entry.id === pathId);

  return {
    id: item.id,
    title: backlog.title,
    body: backlog.description,
    pathLabel: path?.compactLabel[locale] ?? pathLabelById(pathId, locale),
    pathId,
    pathColor: path?.color.accent,
    statusLabel:
      item.status === WeekPlanItemStatus.Done ?
        locale === "vi" ? "Da xong" : "Done"
      : locale === "vi" ? "Da keo vao tuan" : "Pulled into week",
    statusTone: item.status === WeekPlanItemStatus.Done ? "done" : "planned",
    scheduleLabel: backlog.horizonLabel ?? (locale === "vi" ? "Tuan nay" : "This week"),
  };
}

function mapWeekPlanDetailItem(
  item: WeekPlanItem,
  backlog: BacklogItem | undefined,
  pathsById: Record<string, Path>,
  expeditionsById: Record<string, Expedition>,
  milestonesById: Record<string, Milestone>,
  createdMarksById: Record<string, MarkInstance>,
  locale: Locale,
): MarkDetailItem {
  const path = item.pathId ? pathsById[item.pathId] : backlog?.pathId ? pathsById[backlog.pathId] : undefined;
  const pathId = resolveWeeklyPathId(item, backlog, path);
  const visual = todayPathHeroPaths.find((entry) => entry.id === pathId);
  const expedition = item.expeditionId ? expeditionsById[item.expeditionId] : undefined;
  const milestone = item.milestoneId ? milestonesById[item.milestoneId] : undefined;
  const createdMark = item.createdMarkInstanceId ? createdMarksById[item.createdMarkInstanceId] : undefined;
  const title = backlog?.title ?? item.title ?? (locale === "vi" ? "Muc lich khong ten" : "Untitled timetable item");

  return {
    id: item.id,
    title,
    note: backlog?.description ?? item.description ?? item.note,
    date: item.localDate ? `${item.localDate}T00:00:00.000Z` : item.updatedAt,
    status: "planned",
    sourceType: "week_plan_item",
    path: {
      id: pathId,
      name: visual?.label[locale] ?? path?.title ?? (locale === "vi" ? "Weekly Timetable" : "Weekly Timetable"),
      skin: {
        color: visual?.color.accent ?? "#1E5F9E",
        deepColor: visual?.color.accentDeep ?? "#0B3764",
        softColor: visual?.color.accentSoft ?? "#DCECF7",
      },
    },
    proofDetail: item.note ?? item.description ?? backlog?.description,
    metadata: [
      { id: "week-plan-item", label: "Week item", value: item.status },
      { id: "schedule", label: "Schedule", value: item.startTime && item.endTime ? `${item.startTime}-${item.endTime}` : item.blockKey ?? "No slot" },
      { id: "path", label: "Path", value: path?.title ?? "-" },
      { id: "expedition", label: "Expedition", value: expedition?.title ?? item.expeditionContext ?? "-" },
      { id: "milestone", label: "Milestone", value: milestone?.title ?? item.milestoneContext ?? "-" },
      { id: "created-mark", label: "Created mark", value: createdMark ? `${createdMark.title} (${createdMark.status})` : item.createdMarkInstanceId ? "Missing mark row" : "Not materialized" },
    ],
  };
}

function resolveWeeklyPathId(item: WeekPlanItem, backlog: BacklogItem | undefined, path: Path | undefined) {
  const mapped = path ? mapUiPathId(path.slug, path.title) : undefined;
  if (mapped) {
    return mapped;
  }
  if (item.pathId || backlog?.pathId) {
    return "career";
  }
  return backlog?.itemType === BacklogItemType.MarkCandidate ? "career" : "culture";
}

function shiftWeek(weekStart: string, deltaDays: number) {
  const date = new Date(`${weekStart}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

function hasBacklogItemId(item: WeekPlanItem): item is WeekPlanItem & { backlogItemId: string } {
  return typeof item.backlogItemId === "string" && item.backlogItemId.length > 0;
}

const ACTIVE_WEEKLY_SIGNAL_STATUSES = [
  SignalStatus.Scheduled,
  SignalStatus.Ringing,
  SignalStatus.Snoozed,
];

async function loadWeeklySignals(
  app: WaymarkAppServices,
  weekStartDate: string,
  weekEndDate: string,
  locale: Locale,
): Promise<{ days: WeeklySignalReviewDay[]; summary: WeeklySignalSummary }> {
  const signals = (await app.repositories.signals.listSignalsByStatus(ACTIVE_WEEKLY_SIGNAL_STATUSES)).items
    .filter((signal) => {
      const localDate = getSignalDisplayLocalDate(signal.scheduledAt, app.user.timezone);
      return localDate >= weekStartDate && localDate <= weekEndDate;
    })
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));

  const targetLabels = new Map<string, { title: string; typeLabel: string }>();
  await Promise.all(
    signals.map(async (signal) => {
      targetLabels.set(signal.id, await resolveSignalTargetLabel(app, signal.targetType, signal.targetId, locale));
    }),
  );

  const grouped = new Map<string, WeeklySignalReviewDay>();
  for (const signal of signals) {
    const localDate = getSignalDisplayLocalDate(signal.scheduledAt, app.user.timezone);
    const group =
      grouped.get(localDate) ??
      {
        id: localDate,
        localDate,
        label: formatDayLabel(localDate, locale),
        items: [],
      };
    const target = targetLabels.get(signal.id) ?? {
      title: signal.targetId,
      typeLabel: signal.targetType,
    };
    group.items.push({
      id: signal.id,
      localDate,
      timeLabel: getSignalDisplayTime(signal.scheduledAt, app.user.timezone),
      title: target.title,
      statusLabel: formatSignalStatus(signal.status, locale),
      targetTypeLabel: target.typeLabel,
      targetTitle: target.title,
      snoozedUntilLabel: signal.snoozedUntil ? getSignalDisplayTime(signal.snoozedUntil, app.user.timezone) : undefined,
    });
    grouped.set(localDate, group);
  }

  return {
    days: [...grouped.values()],
    summary: {
      activeSignalCount: signals.length,
      scheduledCount: signals.filter((signal) => signal.status === SignalStatus.Scheduled).length,
      ringingCount: signals.filter((signal) => signal.status === SignalStatus.Ringing).length,
      snoozedCount: signals.filter((signal) => signal.status === SignalStatus.Snoozed).length,
      weekStartDate,
      weekEndDate,
    },
  };
}

async function resolveSignalTargetLabel(
  app: WaymarkAppServices,
  targetType: SignalTargetType,
  targetId: string,
  locale: Locale,
) {
  switch (targetType) {
    case SignalTargetType.MarkInstance: {
      const mark = await app.repositories.marks.getMarkInstanceById(targetId);
      return {
        title: mark?.title ?? targetId,
        typeLabel: locale === "vi" ? "Mark" : "Mark",
      };
    }
    case SignalTargetType.PackCheckInstance: {
      const pack = await app.repositories.packChecks.getInstanceById(targetId);
      return {
        title: pack?.title ?? targetId,
        typeLabel: locale === "vi" ? "Pack Check" : "Pack Check",
      };
    }
    case SignalTargetType.TrailDay: {
      const trailDay = await app.repositories.trailDays.getTrailDayById(targetId);
      return {
        title: trailDay ? (locale === "vi" ? `Khep ngay ${trailDay.date}` : `Close Trail ${trailDay.date}`) : targetId,
        typeLabel: locale === "vi" ? "Trail Day" : "Trail Day",
      };
    }
    default:
      return {
        title: targetId,
        typeLabel: targetType,
      };
  }
}

function formatSignalStatus(status: SignalStatus, locale: Locale) {
  switch (status) {
    case SignalStatus.Ringing:
      return locale === "vi" ? "Dang reo" : "Ringing";
    case SignalStatus.Snoozed:
      return locale === "vi" ? "Da snooze" : "Snoozed";
    case SignalStatus.Scheduled:
    default:
      return locale === "vi" ? "Da len lich" : "Scheduled";
  }
}

function getSignalDisplayLocalDate(value: string, timezone: string) {
  return formatLocalDate(new Date(value), timezone);
}

function getSignalDisplayTime(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function createLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const WEEKLY_MOVE_SIGNAL_STATUSES = new Set<SignalStatus>([
  SignalStatus.Scheduled,
  SignalStatus.Ringing,
  SignalStatus.Snoozed,
]);

function canMoveExistingMark(status: MarkInstanceStatus) {
  return (
    status === MarkInstanceStatus.Planned ||
    status === MarkInstanceStatus.Ready ||
    status === MarkInstanceStatus.Blocked
  );
}

function buildFloatingDateTime(localDate: string, time: string) {
  return `${localDate}T${time}:00.000`;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return undefined;
  }

  const totalMinutes = hour * 60 + minute + minutesToAdd;
  const nextHour = Math.floor((totalMinutes % 1440) / 60);
  const nextMinute = totalMinutes % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

async function updateMovableSignalsForMark(app: WaymarkAppServices, markId: string, scheduledAt: string) {
  const signals = await app.repositories.signals.listSignalsByTarget(SignalTargetType.MarkInstance, markId);
  await Promise.all(
    signals
      .filter((signal) => WEEKLY_MOVE_SIGNAL_STATUSES.has(signal.status))
      .map((signal) =>
        app.repositories.signals.updateSignal(signal.id, {
          scheduledAt,
          status: SignalStatus.Scheduled,
          ringingStartedAt: null,
          snoozedUntil: null,
        }),
      ),
  );
}
