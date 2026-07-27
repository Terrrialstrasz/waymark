import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { getCopy } from "../../i18n/copy";
import { getPathHeroImage, resolvePathHeroFromHint, resolvePathIdFromHint } from "../../tokens/pathHeroImages";
import { getPathVisualTokens } from "../../tokens/pathVisualTokens";
import { Locale, PathId } from "../../types/ui";
import {
  ExpeditionDetailItem,
  ExpeditionDetailStatus,
  ExpeditionMilestoneItem,
  ExpeditionPlannedMarkItem,
  MilestoneStatus,
  PlannedMarkDetailStatus,
} from "./types";

export function clampProgress(percentComplete: number) {
  if (!Number.isFinite(percentComplete)) {
    return 0;
  }

  return Math.max(0, Math.min(100, percentComplete));
}

export function formatExpeditionDateRange(startDate: string | Date | undefined, endDate: string | Date | undefined, locale: Locale) {
  if (!startDate && !endDate) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    day: "numeric",
    month: locale === "vi" ? "2-digit" : "short",
  });

  const start = startDate ? formatter.format(resolveDate(startDate)) : "";
  const end = endDate ? formatter.format(resolveDate(endDate)) : "";

  return start && end ? `${start} – ${end}` : start || end;
}

export function formatExpeditionDateRangeLong(startDate: string | Date | undefined, endDate: string | Date | undefined, locale: Locale) {
  if (!startDate && !endDate) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const start = startDate ? formatter.format(resolveDate(startDate)) : "";
  const end = endDate ? formatter.format(resolveDate(endDate)) : "";

  return start && end ? `${start} – ${end}` : start || end;
}

export function formatCountLabel(count: number, noun: "marks" | "milestones" | "complete", locale: Locale) {
  const c = getCopy(locale).expeditionDetail;
  const formatted = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(count);
  const labels = {
    marks: c.labels.marks,
    milestones: c.labels.milestones,
    complete: c.labels.complete,
  } as const;

  return `${formatted} ${labels[noun]}`;
}

export function formatMilestoneMarkCount(completedMarks: number, totalMarks: number, locale: Locale) {
  const c = getCopy(locale).expeditionDetail;
  const formatter = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US");
  return `${formatter.format(completedMarks)} / ${formatter.format(totalMarks)} ${c.labels.marks}`;
}

export function getExpeditionStatusTone(status: ExpeditionDetailStatus) {
  switch (status) {
    case "done":
      return "done";
    case "active":
      return "active";
    case "archived":
      return "archived";
    default:
      return "upcoming";
  }
}

export function getMilestoneStatusTone(status: MilestoneStatus) {
  switch (status) {
    case "done":
      return "done";
    case "inProgress":
      return "active";
    case "skipped":
      return "skipped";
    default:
      return "upcoming";
  }
}

export function getPlannedMarkStatusTone(status: PlannedMarkDetailStatus) {
  switch (status) {
    case "done":
      return "done";
    case "missed":
    case "needsRepair":
      return "missed";
    case "upcoming":
      return "upcoming";
    default:
      return "planned";
  }
}

export function getStatusLabel(
  status: ExpeditionDetailStatus | MilestoneStatus | PlannedMarkDetailStatus,
  locale: Locale
) {
  const c = getCopy(locale).expeditionDetail.status;

  switch (status) {
    case "inProgress":
      return c.inProgress;
    case "planned":
      return c.planned;
    case "done":
      return c.done;
    case "missed":
      return c.missed;
    case "skipped":
      return locale === "vi" ? "Da skip" : "Skipped";
    case "needsRepair":
      return c.needsRepair;
    case "upcoming":
      return c.upcoming;
    case "archived":
      return c.archived;
    default:
      return c.active;
  }
}

export function resolveExpeditionPathId(expedition: Pick<ExpeditionDetailItem, "pathId" | "pathName">) {
  return expedition.pathId ?? resolvePathIdFromHint(expedition.pathName);
}

export function resolvePlannedMarkPathId(mark: Pick<ExpeditionPlannedMarkItem, "pathId" | "pathName">) {
  return mark.pathId ?? resolvePathIdFromHint(mark.pathName);
}

export function resolvePlannedMarkHero(mark: Pick<ExpeditionPlannedMarkItem, "heroImage" | "pathHeroImage" | "pathId" | "pathName">) {
  if (mark.heroImage || mark.pathHeroImage) {
    return mark.heroImage ?? mark.pathHeroImage;
  }

  const pathId = resolvePlannedMarkPathId(mark);
  return getPathHeroImage(pathId)?.assetId ?? resolvePathHeroFromHint(mark.pathName)?.assetId;
}

export function resolvePlannedMarkVisual(mark: Pick<ExpeditionPlannedMarkItem, "pathId" | "pathName">, accentOverride?: string) {
  return getPathVisualTokens(resolvePlannedMarkPathId(mark), accentOverride);
}

export function resolvePathChipIcon(pathId?: PathId): WaymarkSemanticIconName {
  switch (pathId) {
    case "career":
      return "pathIdentity.careerCraft";
    case "snag":
      return "pathIdentity.snagGolf";
    case "health":
      return "pathIdentity.healthBody";
    case "family":
      return "pathIdentity.familyHome";
    case "character":
      return "pathIdentity.characterShield";
    case "golf":
      return "pathIdentity.golfCraft";
    case "culture":
      return "pathIdentity.cultureRomance";
    default:
      return "entity.path";
  }
}

export function buildMilestoneScreenReaderLabel(
  milestone: ExpeditionMilestoneItem,
  locale: Locale,
  expanded: boolean
) {
  const c = getCopy(locale).expeditionDetail.accessibility;
  const parts = [
    c.milestonePrefix.replace("{number}", String(milestone.number)),
    milestone.title,
    getStatusLabel(milestone.status, locale),
    c.milestoneMarks
      .replace("{completed}", String(milestone.completedMarks))
      .replace("{total}", String(milestone.totalMarks)),
  ];
  const dateRange = formatExpeditionDateRange(milestone.startDate, milestone.endDate, locale);

  if (dateRange) {
    parts.push(dateRange);
  }

  parts.push(expanded ? c.expanded : c.collapsed);

  return parts.join(", ");
}

export function buildMarkScreenReaderLabel(mark: ExpeditionPlannedMarkItem, locale: Locale) {
  const c = getCopy(locale).expeditionDetail.accessibility;
  const parts = [c.openMarkDetail.replace("{title}", mark.title), getStatusLabel(mark.status, locale), mark.pathName, mark.timingLabel]
    .filter(Boolean);
  return parts.join(", ");
}

function resolveDate(date: string | Date) {
  return typeof date === "string" ? new Date(date) : date;
}
