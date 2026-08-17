import type { TodayMarkItem } from "../components/today/__fixtures__/todayCarousel.fixtures";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";
import type { Locale } from "../types/ui";

export type WeeklyDayPlanSourceItem = {
  id: string;
  timeLabel: string;
  title: string;
  pathLabel: string;
  expeditionLabel?: string;
  milestoneLabel?: string;
  createdMarkInstanceId?: string;
  createdMarkStatus?: string;
  issue?: string;
};

export type WeeklyDayPlanSourceDay = {
  id: string;
  localDate: string | null;
  label: string;
  items: WeeklyDayPlanSourceItem[];
};

export type WeeklyDayDisplayItem = {
  id: string;
  source: "week_plan" | "standalone_mark";
  sourceId: string;
  markInstanceId?: string;
  title: string;
  timeLabel: string;
  pathLabel: string;
  expeditionLabel?: string;
  milestoneLabel?: string;
  statusLabel?: string;
  issue?: string;
};

export function buildWeeklyDayItems(input: {
  days: WeeklyDayPlanSourceDay[];
  selectedDate: string | null;
  marks: TodayMarkItem[];
  locale: Locale;
}): WeeklyDayDisplayItem[] {
  const planItems = input.days.find((day) => day.localDate === input.selectedDate)?.items ?? [];
  const representedMarkIds = new Set(
    planItems
      .map((item) => item.createdMarkInstanceId)
      .filter((value): value is string => Boolean(value)),
  );
  const mappedPlanItems: WeeklyDayDisplayItem[] = planItems.map((item) => ({
    id: `week-plan:${item.id}`,
    source: "week_plan",
    sourceId: item.id,
    markInstanceId: item.createdMarkInstanceId,
    title: item.title,
    timeLabel: item.timeLabel,
    pathLabel: item.pathLabel,
    expeditionLabel: item.expeditionLabel,
    milestoneLabel: item.milestoneLabel,
    statusLabel: item.createdMarkStatus?.replaceAll("_", " "),
    issue: item.issue,
  }));
  const standaloneMarks: WeeklyDayDisplayItem[] = input.marks
    .filter((mark) => !representedMarkIds.has(mark.id))
    .map((mark) => {
      const visual = todayPathHeroPaths.find((path) => path.id === mark.pathId);
      return {
        id: `mark:${mark.id}`,
        source: "standalone_mark",
        sourceId: mark.id,
        markInstanceId: mark.id,
        title: mark.title[input.locale],
        timeLabel: resolveTodayMarkTime(mark, input.locale),
        pathLabel: visual?.compactLabel[input.locale] ?? mark.pathId,
        expeditionLabel: mark.actionSheet?.expeditionLabel?.[input.locale],
        milestoneLabel: mark.actionSheet?.milestoneLabel?.[input.locale],
        statusLabel: mark.actionSheet?.statusLabel?.[input.locale] ?? mark.status.replaceAll("_", " "),
      };
    });

  return [...mappedPlanItems, ...standaloneMarks].sort(compareWeeklyDayItems);
}

function resolveTodayMarkTime(mark: TodayMarkItem, locale: Locale) {
  const start = mark.timeRangeLabel?.start?.[locale];
  const end = mark.timeRangeLabel?.end?.[locale];
  if (start && end) {
    return `${start}-${end}`;
  }
  return start ?? end ?? mark.timeLabel?.[locale] ?? "";
}

function compareWeeklyDayItems(left: WeeklyDayDisplayItem, right: WeeklyDayDisplayItem) {
  return left.timeLabel.localeCompare(right.timeLabel) || left.title.localeCompare(right.title);
}
