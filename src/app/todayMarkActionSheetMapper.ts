import type { TodayMarkActionSheetDependency, TodayMarkItem } from "../components/today/__fixtures__/todayCarousel.fixtures";
import type {
  PlannedMarkActionSheetMark,
  PathTheme,
  PlannedMarkDependencyItem,
  PlannedMarkPackCheckLink,
} from "../components/planned-mark/PlannedMarkActionSheetContent";
import type { Locale, PathId } from "../types/ui";

const pathLabels: Record<Locale, Record<PathId, string>> = {
  en: {
    career: "Career",
    snag: "SNAG",
    health: "Body",
    family: "Family",
    character: "Character",
    golf: "Golf",
    culture: "Culture",
  },
  vi: {
    career: "Sự nghiệp",
    snag: "SNAG",
    health: "Cơ thể",
    family: "Gia đình",
    character: "Khí chất",
    golf: "Golf",
    culture: "Văn hóa",
  },
};

export function mapTodayMarkToActionSheetMark(
  item: TodayMarkItem,
  locale: Locale,
  handlers?: {
    openDependencyMark?: (markId: string) => void;
    openDependencyPackCheck?: (packCheckId: string) => void;
    openSignal?: (markId: string) => void;
    toggleEmbeddedChecklistItem?: (markId: string, packCheckId: string, itemId: string, checked: boolean) => void;
  },
): PlannedMarkActionSheetMark {
  const actionSheet = item.actionSheet;
  const pathLabel = pathLabels[locale][item.pathId];

  return {
    id: item.id,
    title: item.title[locale],
    status: mapStatus(item.status),
    statusLabel: actionSheet?.statusLabel?.[locale] ?? getStatusLabel(item.status, locale),
    path: {
      id: item.pathId,
      label: pathLabel,
      theme: fallbackThemes[item.pathId],
    },
    periodLabel: actionSheet?.periodLabel?.[locale],
    timeLabel: item.timeLabel?.[locale],
    expeditionLabel: actionSheet?.expeditionLabel?.[locale],
    intentionText: actionSheet?.intentionText?.[locale] ?? item.summary?.[locale],
    signalLabel: actionSheet?.signalLabel?.[locale],
    onOpenSignal: actionSheet?.signalLabel && handlers?.openSignal ? () => handlers.openSignal?.(item.id) : undefined,
    dependencies: mapDependencies(actionSheet?.dependencies, locale, handlers),
    relatedPackChecks: mapRelatedPackChecks(actionSheet?.relatedPackChecks, locale, handlers),
    checklist: actionSheet?.embeddedChecklist
      ? {
          packCheckId: actionSheet.embeddedChecklist.packCheckId,
          items: actionSheet.embeddedChecklist.items.map((checklistItem) => ({
            ...checklistItem,
            onToggle: handlers?.toggleEmbeddedChecklistItem
              ? (checked) =>
                  handlers.toggleEmbeddedChecklistItem?.(
                    item.id,
                    actionSheet.embeddedChecklist!.packCheckId,
                    checklistItem.id,
                    checked,
                  )
              : undefined,
          })),
        }
      : undefined,
    primaryActionLabel: actionSheet?.primaryActionLabel?.[locale],
    primaryActionHint: actionSheet?.primaryActionHint?.[locale],
  };
}

export function getTodayMarkPathLabels() {
  return pathLabels;
}

function mapDependencies(
  dependencies: TodayMarkActionSheetDependency[] | undefined,
  locale: Locale,
  handlers?: {
    openDependencyMark?: (markId: string) => void;
    openDependencyPackCheck?: (packCheckId: string) => void;
  },
): PlannedMarkDependencyItem[] | undefined {
  if (!dependencies?.length) {
    return undefined;
  }

  return dependencies.map((dependency) => ({
    id: dependency.id,
    title: dependency.title[locale],
    detail: dependency.detail?.[locale],
    typeLabel: dependency.typeLabel?.[locale],
    statusLabel: dependency.statusLabel?.[locale],
    group: dependency.group,
    onPress:
      dependency.targetType === "mark" && dependency.targetId && handlers?.openDependencyMark
        ? () => handlers.openDependencyMark?.(dependency.targetId!)
        : dependency.targetType === "pack_check" && dependency.targetId && handlers?.openDependencyPackCheck
          ? () => handlers.openDependencyPackCheck?.(dependency.targetId!)
          : undefined,
  }));
}

function mapRelatedPackChecks(
  relatedPackChecks: NonNullable<TodayMarkItem["actionSheet"]>["relatedPackChecks"] | undefined,
  locale: Locale,
  handlers?: {
    openDependencyPackCheck?: (packCheckId: string) => void;
  },
): PlannedMarkPackCheckLink[] | undefined {
  if (!relatedPackChecks?.length) {
    return undefined;
  }

  return relatedPackChecks.map((packCheck) => ({
    id: packCheck.id,
    title: packCheck.title[locale],
    statusLabel: packCheck.statusLabel?.[locale],
    onPress: handlers?.openDependencyPackCheck ? () => handlers.openDependencyPackCheck?.(packCheck.targetId) : undefined,
  }));
}

function mapStatus(status: TodayMarkItem["status"]): PlannedMarkActionSheetMark["status"] {
  switch (status) {
    case "dependency_required":
      return "dependency_required";
    case "blocked":
      return "blocked";
    case "ready_with_advisory":
      return "ready_with_advisory";
    case "ready_with_waiver":
      return "ready_with_waiver";
    case "needs_decision":
      return "needs_decision";
    case "done":
    case "resolved":
      return "done";
    case "overdue":
      return "overdue_today";
    default:
      return "ready";
  }
}

function getStatusLabel(status: TodayMarkItem["status"], locale: Locale) {
  switch (status) {
    case "dependency_required":
      return locale === "vi" ? "Cần phụ thuộc" : "Dependency Required";
    case "blocked":
      return locale === "vi" ? "Bị chặn" : "Blocked";
    case "ready_with_advisory":
      return locale === "vi" ? "Khuyến nghị" : "Advisory";
    case "ready_with_waiver":
      return locale === "vi" ? "Đã miễn" : "Waived";
    case "needs_decision":
      return locale === "vi" ? "Cần quyết định" : "Needs Decision";
    case "done":
      return locale === "vi" ? "Đã xong" : "Done";
    case "resolved":
      return locale === "vi" ? "Đã xử lý" : "Resolved";
    case "overdue":
      return locale === "vi" ? "Quá hạn hôm nay" : "Overdue today";
    default:
      return locale === "vi" ? "Sẵn sàng" : "Ready";
  }
}
const fallbackThemes: Record<PathId, PathTheme> = {
  career: { ink: "#1F1B16", surface: "#FFFDF9", surfaceSoft: "#F3EADF", border: "#D7C6B2", accent: "#9A6B3D", deep: "#5B3D20" },
  snag: { ink: "#1F1B16", surface: "#FFFDF9", surfaceSoft: "#E8F4EC", border: "#BCD6C5", accent: "#4E8A61", deep: "#2F5C3E" },
  health: { ink: "#1F1B16", surface: "#FFFDF9", surfaceSoft: "#E8F0F7", border: "#BFD0E1", accent: "#4D7398", deep: "#294866" },
  family: { ink: "#1F1B16", surface: "#FFFDF9", surfaceSoft: "#F7EFE2", border: "#DECDB5", accent: "#B07A3F", deep: "#6D4C26" },
  character: { ink: "#1F1B16", surface: "#FFFDF9", surfaceSoft: "#EFE8F4", border: "#D2C3DE", accent: "#7B5E96", deep: "#4C365F" },
  golf: { ink: "#1F1B16", surface: "#FFFDF9", surfaceSoft: "#EEF5E8", border: "#CADCBF", accent: "#688F48", deep: "#406029" },
  culture: { ink: "#1F1B16", surface: "#FFFDF9", surfaceSoft: "#F8EAE8", border: "#E1C7C1", accent: "#B2675B", deep: "#6E3D35" },
};
