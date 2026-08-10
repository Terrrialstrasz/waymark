import type { TodayMarkItem, TodayMarkStatus } from "../components/today/__fixtures__/todayCarousel.fixtures";
import type { MarkInstance, MarkInstanceDetail, Path } from "../domain/waymark";
import { MarkInstanceStatus, WeekPlanItemStatus } from "../domain/waymark/enums";
import type { Locale, PathId } from "../types/ui";
import { getWeekStartDate, mapUiPathId } from "./waymarkUi";
import type { WaymarkAppServices } from "./WaymarkAppProvider";

export type DayReviewData = {
  localDate: string;
  marks: TodayMarkItem[];
  hasWeeklyTimetableForDate: boolean;
  plannedItemCount: number;
};

export async function loadDayReviewData(
  app: WaymarkAppServices,
  localDate: string,
  locale: Locale,
): Promise<DayReviewData> {
  const [marks, weeklyPlanState, paths] = await Promise.all([
    app.markEngine.listVisibleMarksForDay(app.user.id, localDate),
    loadWeeklyPlanStateForDate(app, localDate),
    app.repositories.paths.listActivePaths(app.user.id),
  ]);
  const pathById = new Map(paths.map((path) => [path.id, path] as const));

  for (const pathId of new Set(marks.map((mark) => mark.pathId))) {
    if (!pathById.has(pathId)) {
      const path = await app.repositories.paths.getPathById(pathId);
      if (path) {
        pathById.set(path.id, path);
      }
    }
  }

  const mappedMarks: TodayMarkItem[] = [];
  for (const mark of marks) {
    const detail = await app.repositories.marks.getMarkInstanceDetail(mark.id);
    const item = mapMarkInstanceToDayReviewItem(mark, detail, pathById.get(mark.pathId), locale);
    if (item) {
      mappedMarks.push(item);
    }
  }

  return {
    localDate,
    marks: mappedMarks.sort(compareDayReviewMarks),
    hasWeeklyTimetableForDate: weeklyPlanState.plannedItemCount > 0,
    plannedItemCount: weeklyPlanState.plannedItemCount,
  };
}

async function loadWeeklyPlanStateForDate(app: WaymarkAppServices, localDate: string) {
  const weekStartDate = getWeekStartDate(localDate, app.user.weekStartsOn);
  const weekPlan = await app.repositories.weekPlans.getByWeekStart(app.user.id, weekStartDate);
  if (!weekPlan) {
    return { plannedItemCount: 0 };
  }

  const items = await app.repositories.weekPlans.listItems(weekPlan.id);
  return {
    plannedItemCount: items.filter((item) => item.localDate === localDate && item.status !== WeekPlanItemStatus.Removed).length,
  };
}

function mapMarkInstanceToDayReviewItem(
  mark: MarkInstance,
  detail: MarkInstanceDetail | null,
  path: Path | undefined,
  locale: Locale,
): TodayMarkItem | null {
  const pathId = mapUiPathId(path?.slug, path?.title);
  if (!pathId) {
    return null;
  }

  const status = mapMarkStatus(mark.status);
  const statusLabel = humanizeDayReviewMarkStatus(status, locale);
  const primerText = detail?.primerSnapshot?.trim() || mark.description;
  const markNote = detail?.preActionComment?.trim();

  return {
    id: mark.id,
    title: { en: mark.title, vi: mark.title },
    pathId,
    pathEntityId: mark.pathId,
    expeditionId: mark.expeditionId,
    milestoneId: mark.milestoneId,
    status,
    summary: primerText ? { en: primerText, vi: primerText } : undefined,
    timeLabel: buildMarkTimeLabel(mark),
    timeRangeLabel: buildMarkTimeRangeLabel(mark),
    sortAt: mark.scheduledStartAt ?? mark.dueAt ?? mark.scheduledEndAt ?? mark.completedAt ?? mark.createdAt,
    detailEnabled: true,
    actionSheet: {
      statusLabel: { en: humanizeDayReviewMarkStatus(status, "en"), vi: humanizeDayReviewMarkStatus(status, "vi") },
      intentionText: primerText ? { en: primerText, vi: primerText } : undefined,
      markNote: markNote ? { en: markNote, vi: markNote } : undefined,
      periodLabel: buildMarkPeriodLabel(mark),
    },
    accessibilityLabel: { en: `${statusLabel}: ${mark.title}`, vi: `${statusLabel}: ${mark.title}` },
  };
}

function mapMarkStatus(status: MarkInstanceStatus): TodayMarkStatus {
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
      return "blocked";
    case MarkInstanceStatus.Active:
    case MarkInstanceStatus.Ready:
      return "ready";
    case MarkInstanceStatus.Planned:
    default:
      return "needs_decision";
  }
}

function humanizeDayReviewMarkStatus(status: TodayMarkStatus, locale: Locale) {
  const labels: Record<TodayMarkStatus, Record<Locale, string>> = {
    ready: { en: "Ready", vi: "San sang" },
    dependency_required: { en: "Dependency Required", vi: "Can phu thuoc" },
    blocked: { en: "Blocked", vi: "Bi chan" },
    ready_with_advisory: { en: "Ready", vi: "San sang" },
    ready_with_waiver: { en: "Ready", vi: "San sang" },
    needs_decision: { en: "Planned", vi: "Da len ke hoach" },
    done: { en: "Done", vi: "Da xong" },
    resolved: { en: "Resolved", vi: "Da xu ly" },
    overdue: { en: "Overdue", vi: "Qua han" },
  };
  return labels[status][locale];
}

function buildMarkTimeLabel(mark: MarkInstance): TodayMarkItem["timeLabel"] | undefined {
  const start = mark.scheduledStartAt;
  const end = mark.scheduledEndAt;
  const value = start ?? mark.dueAt ?? end;
  if (!value) {
    return undefined;
  }
  const startLabel = start ? getTimeLabel(start) : undefined;
  const endLabel = end ? getTimeLabel(end) : undefined;

  if (startLabel && endLabel) {
    return { en: `${startLabel}-${endLabel}`, vi: `${startLabel}-${endLabel}` };
  }

  const label = getTimeLabel(value);
  return label ? { en: label, vi: label } : undefined;
}

function buildMarkTimeRangeLabel(mark: MarkInstance): TodayMarkItem["timeRangeLabel"] | undefined {
  const start = mark.scheduledStartAt ?? mark.dueAt;
  const end = mark.scheduledEndAt;
  if (!start && !end) {
    return undefined;
  }

  const startLabel = start ? getTimeLabel(start) : undefined;
  const endLabel = end ? getTimeLabel(end) : undefined;
  return {
    start: startLabel ? { en: startLabel, vi: startLabel } : undefined,
    end: endLabel ? { en: endLabel, vi: endLabel } : undefined,
  };
}

function buildMarkPeriodLabel(mark: MarkInstance): NonNullable<TodayMarkItem["actionSheet"]>["periodLabel"] {
  const sourceDate = mark.scheduledStartAt ?? mark.dueAt ?? mark.scheduledEndAt ?? mark.createdAt;
  const localDate = sourceDate.slice(0, 10);
  const startLabel = mark.scheduledStartAt ? getTimeLabel(mark.scheduledStartAt) : undefined;
  const endLabel = mark.scheduledEndAt ? getTimeLabel(mark.scheduledEndAt) : undefined;
  const timeLabel = startLabel && endLabel ? `${startLabel}-${endLabel}` : startLabel;
  const label = timeLabel ? `${formatShortDate(localDate)} ${timeLabel}` : formatShortDate(localDate);
  return { en: label, vi: label };
}

function getTimeLabel(value: string) {
  const localTimeMatch = value.match(/T(\d{2}:\d{2})/u);
  if (localTimeMatch?.[1]) {
    return localTimeMatch[1];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatShortDate(localDate: string) {
  const [, month, day] = localDate.split("-");
  return day && month ? `${day}/${month}` : localDate;
}

function compareDayReviewMarks(left: TodayMarkItem, right: TodayMarkItem) {
  return (
    (left.sortAt ?? "").localeCompare(right.sortAt ?? "") ||
    left.id.localeCompare(right.id)
  );
}
