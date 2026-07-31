import { ExpeditionDetailItem, ExpeditionMilestoneItem } from "../components/expeditions/types";
import type { Expedition, MarkInstance, Milestone, Path } from "../domain/waymark";
import { ExpeditionStatus, MarkInstanceStatus, MilestoneStatus } from "../domain/waymark/enums";
import type { Locale } from "../types/ui";
import { mapUiPathId, pathLabelById } from "./waymarkUi";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";

export function buildExpeditionDetailModel(
  expedition: Expedition,
  path: Path | null,
  milestones: Milestone[],
  marksByMilestoneId: Map<string, MarkInstance[]>,
  locale: Locale,
): { expedition: ExpeditionDetailItem; milestones: ExpeditionMilestoneItem[] } {
  return {
    expedition: mapExpeditionDetail(expedition, path, milestones, marksByMilestoneId, locale),
    milestones: milestones.map((milestone, index) =>
      mapMilestoneDetail(milestone, index, marksByMilestoneId.get(milestone.id) ?? [], path, locale),
    ),
  };
}

function mapExpeditionDetail(
  expedition: Expedition,
  path: Path | null,
  milestones: Milestone[],
  marksByMilestoneId: Map<string, MarkInstance[]>,
  locale: Locale,
): ExpeditionDetailItem {
  const allMarks = milestones.flatMap((milestone) => marksByMilestoneId.get(milestone.id) ?? []);
  const completedMarks = allMarks.filter((mark) => mark.status === MarkInstanceStatus.Completed || mark.status === MarkInstanceStatus.PartiallyCompleted).length;
  const totalMarks = allMarks.length;
  const completedMilestones = milestones.filter((milestone) => milestone.status === MilestoneStatus.Completed).length;
  const totalMilestones = milestones.length;
  const pathId = mapUiPathId(path?.slug, path?.title);
  const visual = todayPathHeroPaths.find((entry) => entry.id === pathId);
  const percentComplete =
    totalMarks > 0 ? Math.round((completedMarks / totalMarks) * 100) : totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return {
    id: expedition.id,
    title: expedition.title,
    subtitle: expedition.description,
    status: mapExpeditionStatus(expedition.status),
    startDate: expedition.startDate,
    endDate: expedition.targetDate ?? expedition.targetEndAt,
    summaryText: expedition.description ?? (locale === "vi" ? "Expedition nay chua co mo ta." : "This expedition does not have a summary yet."),
    completedMarks,
    totalMarks,
    completedMilestones,
    totalMilestones,
    percentComplete,
    pathId,
    pathName: path?.title ?? (pathId ? pathLabelById(pathId, locale) : "Path"),
    pathColor: visual?.color.accent,
    pathAccent: visual?.color.accentDeep,
    whyItMatters: undefined,
  };
}

function mapMilestoneDetail(
  milestone: Milestone,
  index: number,
  marks: MarkInstance[],
  path: Path | null,
  locale: Locale,
): ExpeditionMilestoneItem {
  const pathId = mapUiPathId(path?.slug, path?.title);
  const pathName = path?.title ?? (pathId ? pathLabelById(pathId, locale) : "Path");

  return {
    id: milestone.id,
    number: index + 1,
    title: milestone.title,
    startDate: milestone.targetDate,
    endDate: milestone.targetDate,
    status:
      milestone.status === MilestoneStatus.Completed
        ? "done"
        : milestone.status === MilestoneStatus.Missed
          ? "skipped"
        : milestone.status === MilestoneStatus.Active
          ? "inProgress"
          : "upcoming",
    completedMarks: marks.filter((mark) => mark.status === MarkInstanceStatus.Completed || mark.status === MarkInstanceStatus.PartiallyCompleted).length,
    totalMarks: marks.length,
    plannedMarks: marks.map((mark) => ({
      id: mark.id,
      title: mark.title,
      subtitle: mark.description,
      status: mapPlannedMarkStatus(mark.status),
      pathId,
      pathName,
      timingLabel: formatMarkTimingLabel(mark),
    })),
  };
}

function formatMarkTimingLabel(mark: MarkInstance) {
  if (mark.scheduledStartAt && mark.scheduledEndAt) {
    return `${mark.scheduledStartAt}–${mark.scheduledEndAt}`;
  }
  return mark.scheduledStartAt ?? mark.dueAt ?? mark.scheduledEndAt ?? undefined;
}

function mapExpeditionStatus(status: ExpeditionStatus): ExpeditionDetailItem["status"] {
  switch (status) {
    case ExpeditionStatus.Completed:
      return "done";
    case ExpeditionStatus.Archived:
      return "archived";
    case ExpeditionStatus.Planned:
      return "upcoming";
    default:
      return "active";
  }
}

function mapPlannedMarkStatus(status: MarkInstanceStatus) {
  switch (status) {
    case MarkInstanceStatus.Completed:
      return "done";
    case MarkInstanceStatus.PartiallyCompleted:
      return "done";
    case MarkInstanceStatus.Expired:
      return "missed";
    case MarkInstanceStatus.Active:
    case MarkInstanceStatus.Ready:
      return "planned";
    default:
      return "upcoming";
  }
}
