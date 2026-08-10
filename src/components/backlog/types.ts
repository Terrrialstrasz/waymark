import { getCopy } from "../../i18n/copy";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { Locale } from "../../types/ui";

export type BacklogItemType = "idea" | "plan" | "mark";

export type BacklogHorizonTone = "near" | "next" | "later" | "someday" | "unplanned";

export type BacklogFilterValue = "all" | BacklogItemType;

export type BacklogEmptyStateMode = "trueEmpty" | "searchEmpty" | "filterEmpty";

export interface BacklogItemViewModel {
  id: string;
  title: string;
  subtitle?: string;
  type: BacklogItemType;
  horizonLabel?: string;
  horizonTone?: BacklogHorizonTone;
  iconKey?: WaymarkSemanticIconName;
}

export interface BacklogFeatureFlags {
  canDeleteBacklogItem?: boolean;
  canCreateMarkFromBacklog?: boolean;
  hasBacklogDetail?: boolean;
}

export type BacklogMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getBacklogTypeLabel(locale: Locale, type: BacklogItemType) {
  const backlog = getCopy(locale).backlog;

  switch (type) {
    case "idea":
      return backlog.type.idea;
    case "plan":
      return backlog.type.plan;
    case "mark":
      return backlog.type.mark;
  }
}

export function getBacklogHorizonLabel(locale: Locale, tone?: BacklogHorizonTone, label?: string) {
  if (label?.trim()) {
    return label.trim();
  }

  const backlog = getCopy(locale).backlog;

  switch (tone) {
    case "near":
      return backlog.horizon.thisWeek;
    case "next":
      return backlog.horizon.nextMonth;
    case "later":
      return backlog.horizon.later;
    case "someday":
      return backlog.horizon.someday;
    case "unplanned":
    default:
      return backlog.horizon.unplanned;
  }
}

export function getBacklogFilterLabel(locale: Locale, filter: BacklogFilterValue) {
  const backlog = getCopy(locale).backlog;

  switch (filter) {
    case "idea":
      return backlog.filter.ideas;
    case "plan":
      return backlog.filter.plans;
    case "mark":
      return backlog.filter.marks;
    case "all":
    default:
      return backlog.filter.all;
  }
}

export function getBacklogCountLabel(locale: Locale, count: number) {
  const backlog = getCopy(locale).backlog;
  return `${count} ${count === 1 ? backlog.count.savedItem : backlog.count.savedItems}`;
}

export function getBacklogEmptyBody(locale: Locale, mode: BacklogEmptyStateMode, filter?: BacklogFilterValue) {
  const backlog = getCopy(locale).backlog;

  if (mode === "trueEmpty") {
    return backlog.empty.trueEmptyBody;
  }

  if (mode === "searchEmpty") {
    return backlog.empty.searchBody;
  }

  const filterLabel = filter && filter !== "all" ? getBacklogTypeLabel(locale, filter) : backlog.filter.all;
  return backlog.empty.filterBody.replace("{type}", filterLabel.toLowerCase());
}

export function getBacklogTypeIcon(type: BacklogItemType) {
  switch (type) {
    case "idea":
      return "status.planned" as const;
    case "plan":
      return "entity.path" as const;
    case "mark":
      return "entity.mark" as const;
  }
}

export function getBacklogResolvedIcon(item: BacklogItemViewModel) {
  return item.iconKey ?? getBacklogTypeIcon(item.type);
}

export function matchesBacklogQuery(locale: Locale, item: BacklogItemViewModel, query: string) {
  const normalizedQuery = normalizeText(query, locale);

  if (!normalizedQuery) {
    return true;
  }

  const haystacks = [
    item.title,
    item.subtitle,
    getBacklogHorizonLabel(locale, item.horizonTone, item.horizonLabel),
    getBacklogTypeLabel(locale, item.type),
  ];

  return haystacks.some((value) => normalizeText(value, locale).includes(normalizedQuery));
}

function normalizeText(value: string | undefined, locale: Locale) {
  return (value ?? "").trim().toLocaleLowerCase(locale);
}
