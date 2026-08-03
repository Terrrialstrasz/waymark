import { useEffect, useMemo, useState } from "react";
import type { MarkInstance, Milestone } from "../domain/waymark";
import { ExpeditionStatus, MarkInstanceStatus, MilestoneStatus } from "../domain/waymark";
import type {
  WeeklyMilestoneItem,
  WeeklyMilestonePathFilterItem,
  WeeklyMilestoneUrgency,
} from "../components/paths/types";
import type { Locale, PathId } from "../types/ui";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";
import { formatLocalDate, getWeekEndDate, getWeekStartDate, mapUiPathId } from "./waymarkUi";
import { useWaymarkApp } from "./WaymarkAppProvider";

type WeeklyMilestonesState =
  | { status: "loading"; error: null; items: WeeklyMilestoneItem[]; missingStartDateCount: number }
  | { status: "error"; error: Error; items: WeeklyMilestoneItem[]; missingStartDateCount: number }
  | { status: "ready"; error: null; items: WeeklyMilestoneItem[]; missingStartDateCount: number };

export function useWaymarkWeeklyMilestones(locale: Locale, options: { enabled?: boolean; selectedPathId?: "all" | PathId } = {}) {
  const app = useWaymarkApp();
  const enabled = options.enabled ?? true;
  const selectedPathId = options.selectedPathId ?? "all";
  const [state, setState] = useState<WeeklyMilestonesState>({
    status: "loading",
    error: null,
    items: [],
    missingStartDateCount: 0,
  });

  const today = useMemo(() => formatLocalDate(new Date(), app.user.timezone), [app.user.timezone]);
  const weekStart = useMemo(() => getWeekStartDate(today, app.user.weekStartsOn), [app.user.weekStartsOn, today]);
  const weekEnd = useMemo(() => getWeekEndDate(weekStart), [weekStart]);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      setState({ status: "loading", error: null, items: [], missingStartDateCount: 0 });

      try {
        const paths = await app.repositories.paths.listActivePaths(app.user.id);
        const loadedItems: WeeklyMilestoneItem[] = [];
        let missingStartDateCount = 0;

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
              if (!isOpenMilestone(milestone)) {
                continue;
              }

              if (!milestone.startDate) {
                missingStartDateCount += 1;
                continue;
              }

              if (milestone.startDate >= weekStart) {
                continue;
              }

              const marks = await app.repositories.marks.listMarkInstancesByMilestone(milestone.id);
              loadedItems.push({
                id: milestone.id,
                pathRecordId: path.id,
                pathId,
                pathTitle: visual.label[locale],
                pathAccent: visual.color.accent,
                pathAccentDeep: visual.color.accentDeep,
                pathAccentSoft: visual.color.accentSoft,
                pathIconSemanticName: `pathIdentity.${visual.icon}`,
                expeditionId: expedition.id,
                expeditionTitle: expedition.title,
                title: milestone.title,
                startDate: milestone.startDate,
                targetDate: milestone.targetDate ?? null,
                targetDateLabel: formatMilestoneTargetDate(milestone.targetDate, locale),
                urgency: getMilestoneUrgency(milestone.targetDate, weekStart, weekEnd),
                marks: marks
                  .filter((mark) => isMarkInWeek(mark, weekStart, weekEnd))
                  .sort(compareMarks)
                  .map((mark) => ({
                    id: mark.id,
                    title: mark.title,
                    weekdayLabel: formatMarkWeekday(mark, locale),
                    completed: isResolvedMark(mark),
                  })),
                sortOrder: path.sortOrder * 100000 + expedition.sortOrder * 1000 + milestone.sortOrder * 10 + milestone.orderIndex,
              });
            }
          }
        }

        loadedItems.sort(compareWeeklyMilestones);

        if (!cancelled) {
          setState({ status: "ready", error: null, items: loadedItems, missingStartDateCount });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load weekly milestones."),
            items: [],
            missingStartDateCount: 0,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, enabled, locale, weekEnd, weekStart]);

  const filteredItems = useMemo(
    () => (selectedPathId === "all" ? state.items : state.items.filter((item) => item.pathId === selectedPathId)),
    [selectedPathId, state.items],
  );

  const pathFilters = useMemo((): WeeklyMilestonePathFilterItem[] => {
    const countsByPathId = new Map<PathId, number>();
    for (const item of state.items) {
      countsByPathId.set(item.pathId, (countsByPathId.get(item.pathId) ?? 0) + 1);
    }

    return [
      { id: "all", label: locale === "vi" ? "All paths" : "All paths", count: state.items.length },
      ...todayPathHeroPaths
        .filter((path) => countsByPathId.has(path.id))
        .map((path) => ({
          id: path.id,
          label: path.compactLabel[locale],
          count: countsByPathId.get(path.id) ?? 0,
        })),
    ];
  }, [locale, state.items]);

  return {
    ...state,
    items: filteredItems,
    allItems: state.items,
    pathFilters,
    weekStart,
    weekEnd,
  };
}

function isOpenMilestone(milestone: Milestone) {
  return milestone.status === MilestoneStatus.Planned || milestone.status === MilestoneStatus.Active;
}

function getMilestoneUrgency(targetDate: string | undefined, weekStart: string, weekEnd: string): WeeklyMilestoneUrgency {
  if (!targetDate) {
    return "no_target";
  }
  if (targetDate < weekStart) {
    return "overdue";
  }
  if (targetDate <= weekEnd) {
    return "due_this_week";
  }
  return "ahead";
}

function formatMilestoneTargetDate(targetDate: string | undefined, locale: Locale) {
  if (!targetDate) {
    return locale === "vi" ? "Chua co target" : "No target";
  }

  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${targetDate}T00:00:00.000Z`));
}

function isMarkInWeek(mark: MarkInstance, weekStart: string, weekEnd: string) {
  const localDate = getMarkLocalDate(mark);
  return Boolean(localDate && localDate >= weekStart && localDate <= weekEnd);
}

function getMarkLocalDate(mark: MarkInstance) {
  return (mark.scheduledStartAt ?? mark.dueAt ?? mark.completedAt ?? "").slice(0, 10) || null;
}

function formatMarkWeekday(mark: MarkInstance, locale: Locale) {
  const localDate = getMarkLocalDate(mark);
  if (!localDate) {
    return locale === "vi" ? "Tuan nay" : "This week";
  }

  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "short",
  }).format(new Date(`${localDate}T00:00:00.000Z`));
}

function isResolvedMark(mark: MarkInstance) {
  return (
    mark.status === MarkInstanceStatus.Completed ||
    mark.status === MarkInstanceStatus.PartiallyCompleted ||
    Boolean(mark.completedAt)
  );
}

function compareMarks(left: MarkInstance, right: MarkInstance) {
  return (getMarkLocalDate(left) ?? "9999-12-31").localeCompare(getMarkLocalDate(right) ?? "9999-12-31");
}

const urgencyRank: Record<WeeklyMilestoneUrgency, number> = {
  overdue: 0,
  due_this_week: 1,
  ahead: 2,
  no_target: 3,
};

function compareWeeklyMilestones(left: WeeklyMilestoneItem, right: WeeklyMilestoneItem) {
  if (left.pathRecordId !== right.pathRecordId) {
    return left.sortOrder - right.sortOrder;
  }

  if (urgencyRank[left.urgency] !== urgencyRank[right.urgency]) {
    return urgencyRank[left.urgency] - urgencyRank[right.urgency];
  }

  return (left.targetDate ?? "9999-12-31").localeCompare(right.targetDate ?? "9999-12-31") || left.sortOrder - right.sortOrder;
}
