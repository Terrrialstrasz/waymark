import { useEffect, useMemo, useState } from "react";
import type { MarkInstance, Milestone } from "../domain/waymark";
import { ExpeditionStatus, isFinalMarkInstanceStatus, MarkInstanceStatus, MilestoneStatus, WeekPlanItemStatus } from "../domain/waymark";
import type { WeeklyMilestoneItem, WeeklyMilestoneMarkItem } from "../components/paths/types";
import type { Locale } from "../types/ui";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";
import { formatLocalDate, getWeekEndDate, getWeekStartDate, mapUiPathId, shiftLocalDate } from "./waymarkUi";
import { useWaymarkApp } from "./WaymarkAppProvider";

type WeeklyMilestonesState =
  | { status: "loading"; error: null; items: WeeklyMilestoneItem[] }
  | { status: "error"; error: Error; items: WeeklyMilestoneItem[] }
  | { status: "ready"; error: null; items: WeeklyMilestoneItem[] };

export function useWaymarkWeeklyMilestones(locale: Locale, options: { enabled?: boolean; weekStartDate?: string } = {}) {
  const app = useWaymarkApp();
  const enabled = options.enabled ?? true;
  const selectedWeekStart = options.weekStartDate;
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<WeeklyMilestonesState>({
    status: "loading",
    error: null,
    items: [],
  });

  const today = useMemo(() => formatLocalDate(new Date(), app.user.timezone), [app.user.timezone]);
  const currentWeekStart = useMemo(() => getWeekStartDate(today, app.user.weekStartsOn), [app.user.weekStartsOn, today]);
  const weekStart = selectedWeekStart ?? currentWeekStart;
  const weekEnd = useMemo(() => getWeekEndDate(weekStart), [weekStart]);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      setState({ status: "loading", error: null, items: [] });

      try {
        const paths = await app.repositories.paths.listActivePaths(app.user.id);
        const loadedItems: WeeklyMilestoneItem[] = [];
        const weeklyPlanMarksByMilestoneId = await loadWeeklyPlanMarksByMilestone(app, weekStart);
        const marksByMilestoneId = mergeWeeklyMarkMaps(
          weeklyPlanMarksByMilestoneId,
          await loadWeeklyDateMarksByMilestone(app, weekStart, weekEnd),
        );

        for (const path of paths) {
          const pathId = mapUiPathId(path.slug, path.title);
          const visual = pathId ? todayPathHeroPaths.find((entry) => entry.id === pathId) : null;
          if (!pathId || !visual) {
            continue;
          }

          const expeditions = await app.repositories.expeditions.listExpeditionsByPath(path.id);
          for (const expedition of expeditions.items) {
            if (expedition.status === ExpeditionStatus.Completed || expedition.status === ExpeditionStatus.Archived) {
              continue;
            }

            const milestones = await app.repositories.expeditions.listMilestonesByExpedition(expedition.id);
            for (const milestone of milestones) {
              const marks = marksByMilestoneId.get(milestone.id) ?? [];
              const hasWeeklyPlanMark = (weeklyPlanMarksByMilestoneId.get(milestone.id)?.length ?? 0) > 0;
              if (!isWeeklyMilestone(milestone, weekStart, weekEnd, hasWeeklyPlanMark)) {
                continue;
              }

              loadedItems.push({
                id: milestone.id,
                pathRecordId: path.id,
                pathId,
                pathTitle: visual.label[locale],
                pathAccent: visual.color.accent,
                pathAccentDeep: visual.color.accentDeep,
                pathAccentSoft: visual.color.accentSoft,
                pathIconAssetId: visual.pathIconAssetId,
                pathIconSemanticName: `pathIdentity.${visual.icon}`,
                expeditionId: expedition.id,
                expeditionTitle: expedition.title,
                title: milestone.title,
                startDate: milestone.startDate ?? null,
                endDate: milestone.targetDate ?? null,
                completedAt: milestone.completedAt ?? null,
                status: milestone.status,
                sortOrder: path.sortOrder * 100000 + expedition.sortOrder * 1000 + milestone.sortOrder * 10 + milestone.orderIndex,
                marks,
              });
            }
          }
        }

        loadedItems.sort(compareWeeklyMilestones);

        if (!cancelled) {
          setState({ status: "ready", error: null, items: loadedItems });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load weekly milestones."),
            items: [],
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, enabled, locale, refreshKey, weekEnd, weekStart]);

  return {
    ...state,
    items: state.items,
    allItems: state.items,
    refresh: () => setRefreshKey((current) => current + 1),
    weekStart,
    weekEnd,
  };
}

function isWeeklyMilestone(milestone: Milestone, weekStart: string, weekEnd: string, hasWeeklyPlanMark: boolean) {
  const targetDate = milestone.targetDate?.slice(0, 10) ?? null;
  const completedDate = milestone.completedAt?.slice(0, 10) ?? null;
  const isOpenWeekly =
    (milestone.status === MilestoneStatus.Planned || milestone.status === MilestoneStatus.Active) &&
    targetDate != null &&
    targetDate >= weekStart &&
    targetDate <= weekEnd;
  const isCompletedThisWeek =
    milestone.status === MilestoneStatus.Completed &&
    completedDate != null &&
    completedDate >= weekStart &&
    completedDate <= weekEnd;

  return isOpenWeekly || isCompletedThisWeek || hasWeeklyPlanMark;
}

async function loadWeeklyPlanMarksByMilestone(
  app: ReturnType<typeof useWaymarkApp>,
  weekStart: string,
): Promise<Map<string, WeeklyMilestoneMarkItem[]>> {
  const marksByMilestoneId = new Map<string, WeeklyMilestoneMarkItem[]>();
  const weekPlan = await app.repositories.weekPlans.getByWeekStart(app.user.id, weekStart);
  if (!weekPlan) {
    return marksByMilestoneId;
  }

  const items = await app.repositories.weekPlans.listItems(weekPlan.id);
  for (const item of items) {
    if (item.status === WeekPlanItemStatus.Removed || !item.createdMarkInstanceId) {
      continue;
    }
    const mark = await app.repositories.marks.getMarkInstanceById(item.createdMarkInstanceId);
    if (!mark?.milestoneId || !isWeeklyMilestoneMarkVisible(mark.status)) {
      continue;
    }
    const localDate = mark.scheduledStartAt?.slice(0, 10) ?? item.localDate;
    if (!localDate) {
      continue;
    }
    appendWeeklyMilestoneMark(marksByMilestoneId, mark.milestoneId, mapWeeklyMilestoneMark(mark, localDate));
  }

  sortWeeklyMarkMap(marksByMilestoneId);
  return marksByMilestoneId;
}

async function loadWeeklyDateMarksByMilestone(
  app: ReturnType<typeof useWaymarkApp>,
  weekStart: string,
  weekEnd: string,
): Promise<Map<string, WeeklyMilestoneMarkItem[]>> {
  const marksByMilestoneId = new Map<string, WeeklyMilestoneMarkItem[]>();
  const weekDates = enumerateWeekDates(weekStart, weekEnd);
  const weeklyMarks = await Promise.all(
    weekDates.map(async (localDate) => {
      const marks = await app.repositories.marks.listMarkInstancesByDate(app.user.id, localDate);
      return marks
        .filter((mark) => mark.milestoneId && isWeeklyMilestoneMarkVisible(mark.status))
        .map((mark) => mapWeeklyMilestoneMark(mark, localDate));
    }),
  );

  for (const marks of weeklyMarks) {
    for (const mark of marks) {
      const source = mark as WeeklyMilestoneMarkItem & { milestoneId: string };
      appendWeeklyMilestoneMark(marksByMilestoneId, source.milestoneId, mark);
    }
  }

  sortWeeklyMarkMap(marksByMilestoneId);
  return marksByMilestoneId;
}

function mergeWeeklyMarkMaps(
  primary: Map<string, WeeklyMilestoneMarkItem[]>,
  secondary: Map<string, WeeklyMilestoneMarkItem[]>,
): Map<string, WeeklyMilestoneMarkItem[]> {
  const merged = new Map<string, WeeklyMilestoneMarkItem[]>();
  for (const [milestoneId, marks] of primary.entries()) {
    for (const mark of marks) {
      appendWeeklyMilestoneMark(merged, milestoneId, mark);
    }
  }
  for (const [milestoneId, marks] of secondary.entries()) {
    for (const mark of marks) {
      appendWeeklyMilestoneMark(merged, milestoneId, mark);
    }
  }
  sortWeeklyMarkMap(merged);
  return merged;
}

function appendWeeklyMilestoneMark(
  target: Map<string, WeeklyMilestoneMarkItem[]>,
  milestoneId: string,
  mark: WeeklyMilestoneMarkItem,
) {
  const bucket = target.get(milestoneId) ?? [];
  if (!bucket.some((item) => item.id === mark.id)) {
    bucket.push(mark);
  }
  target.set(milestoneId, bucket);
}

function sortWeeklyMarkMap(target: Map<string, WeeklyMilestoneMarkItem[]>) {
  for (const marks of target.values()) {
    marks.sort(compareWeeklyMarks);
  }
}

function enumerateWeekDates(weekStart: string, weekEnd: string) {
  const dates: string[] = [];
  let date = weekStart;
  while (date <= weekEnd) {
    dates.push(date);
    date = shiftLocalDate(date, 1);
  }
  return dates;
}

function isWeeklyMilestoneMarkVisible(status: MarkInstanceStatus) {
  return (
    status === MarkInstanceStatus.Planned ||
    status === MarkInstanceStatus.Ready ||
    status === MarkInstanceStatus.Blocked ||
    status === MarkInstanceStatus.Active ||
    status === MarkInstanceStatus.Completed ||
    status === MarkInstanceStatus.PartiallyCompleted ||
    status === MarkInstanceStatus.Skipped ||
    status === MarkInstanceStatus.Rescheduled ||
    status === MarkInstanceStatus.Substituted ||
    status === MarkInstanceStatus.Expired ||
    status === MarkInstanceStatus.Cancelled
  );
}

function mapWeeklyMilestoneMark(mark: MarkInstance, localDate: string): WeeklyMilestoneMarkItem & { milestoneId: string } {
  return {
    id: mark.id,
    title: mark.title,
    status: mark.status as WeeklyMilestoneMarkItem["status"],
    localDate,
    dayLabel: formatWeekdayShortLabel(localDate),
    isDone: mark.status === MarkInstanceStatus.Completed,
    isFinal: isFinalMarkInstanceStatus(mark.status),
    expeditionTitle: undefined,
    milestoneTitle: undefined,
    description: mark.description,
    scheduledStartAt: mark.scheduledStartAt,
    scheduledEndAt: mark.scheduledEndAt,
    dueAt: mark.dueAt,
    milestoneId: mark.milestoneId!,
  };
}

function formatWeekdayShortLabel(localDate: string) {
  return new Date(`${localDate}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "short" });
}

function compareWeeklyMarks(left: WeeklyMilestoneMarkItem, right: WeeklyMilestoneMarkItem) {
  return (
    left.localDate.localeCompare(right.localDate) ||
    (left.scheduledStartAt ?? left.dueAt ?? "").localeCompare(right.scheduledStartAt ?? right.dueAt ?? "") ||
    left.title.localeCompare(right.title)
  );
}

function compareWeeklyMilestones(left: WeeklyMilestoneItem, right: WeeklyMilestoneItem) {
  if (left.pathRecordId !== right.pathRecordId) {
    return left.sortOrder - right.sortOrder;
  }

  return (
    (left.startDate ?? "9999-12-31").localeCompare(right.startDate ?? "9999-12-31") ||
    (left.endDate ?? "9999-12-31").localeCompare(right.endDate ?? "9999-12-31") ||
    left.sortOrder - right.sortOrder ||
    left.title.localeCompare(right.title)
  );
}
