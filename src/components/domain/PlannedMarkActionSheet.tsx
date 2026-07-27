import { Locale } from "../../types/ui";
import { PlannedMarkModel } from "../../mocks/data";
import { PlannedMarkActionSheetContent, PlannedMarkActionSheetMark, PlannedMarkDependencyItem } from "../planned-mark/PlannedMarkActionSheetContent";
import { getPlannedMarkPathTheme, resolvePlannedMarkPathId } from "../planned-mark/plannedMarkTheme";

type Props = {
  item: PlannedMarkModel;
  locale: Locale;
  onClose: () => void;
};

export function PlannedMarkActionSheet({ item, locale, onClose }: Props) {
  const mark = mapLegacyPlannedMarkModel(item, locale);

  return (
    <PlannedMarkActionSheetContent
      locale={locale}
      mark={mark}
      onMark={onClose}
      onClose={onClose}
      onMove={() => onClose()}
      onSkip={onClose}
    />
  );
}

function mapLegacyPlannedMarkModel(item: PlannedMarkModel, locale: Locale): PlannedMarkActionSheetMark {
  const pathLabel = item.pathLabel[locale];
  const pathId = resolvePlannedMarkPathId(pathLabel);

  return {
    id: item.title.en,
    title: item.title[locale],
    status: mapLegacyState(item.state),
    statusLabel: getLegacyStatusLabel(item.state, locale),
    path: {
      id: pathId,
      label: pathLabel,
      theme: getPlannedMarkPathTheme(pathId),
    },
    timeLabel: item.windowLabel[locale],
    intentionText: item.intention[locale],
    dependencies: getLegacyDependencies(item.state, locale),
  };
}

function getLegacyDependencies(state: PlannedMarkModel["state"], locale: Locale): PlannedMarkDependencyItem[] {
  switch (state) {
    case "blocked":
      return [
        {
          id: "legacy-blocked-pack",
          title: locale === "vi" ? "Workout Readiness Check" : "Workout Readiness Check",
          detail: locale === "vi" ? "Pack Check này vẫn đang chặn mark." : "This Pack Check is still blocking the mark.",
          typeLabel: "Pack Check",
          group: "critical",
        },
      ];
    case "postponed":
      return [
        {
          id: "legacy-postponed-upstream",
          title: locale === "vi" ? "Upstream đã đổi lịch" : "Upstream mark moved",
          detail: locale === "vi" ? "Cần quyết định lại trước khi tiếp tục." : "Review the change before continuing.",
          typeLabel: "Sequence",
          group: "required",
        },
      ];
    default:
      return [];
  }
}

function getLegacyStatusLabel(state: PlannedMarkModel["state"], locale: Locale) {
  switch (state) {
    case "done":
      return locale === "vi" ? "Đã hoàn thành" : "Done";
    case "postponed":
      return locale === "vi" ? "Cần quyết định" : "Needs Decision";
    case "due_now":
      return locale === "vi" ? "Sẵn sàng" : "Ready";
    case "substituted":
      return locale === "vi" ? "Đã thay thế" : "Substituted";
    case "missed":
      return locale === "vi" ? "Đã lỡ" : "Missed";
    case "blocked":
      return locale === "vi" ? "Bị chặn" : "Blocked";
    default:
      return locale === "vi" ? "Sẵn sàng" : "Ready";
  }
}

function mapLegacyState(state: PlannedMarkModel["state"]): PlannedMarkActionSheetMark["status"] {
  switch (state) {
    case "done":
      return "done";
    case "postponed":
      return "needs_decision";
    case "due_now":
      return "ready";
    case "hidden":
      return "read_only_history";
    case "substituted":
      return "substituted";
    case "missed":
      return "missed";
    case "blocked":
      return "blocked";
    default:
      return "ready";
  }
}
