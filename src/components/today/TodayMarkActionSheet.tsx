import { useEffect, useMemo } from "react";
import { getTodayMarkPathLabels, mapTodayMarkToActionSheetMark } from "../../app/todayMarkActionSheetMapper";
import type { Locale, PathId } from "../../types/ui";
import {
  PlannedMarkActionSheetContent,
  type MoveMarkValue,
  type QuickSubstituteValue,
  type SubstituteCandidateMark,
} from "../planned-mark/PlannedMarkActionSheetContent";
import { getPlannedMarkPathTheme } from "../planned-mark/plannedMarkTheme";
import { WMSheet } from "../primitives/WMSheet";
import type { TodayMarkItem } from "./__fixtures__/todayCarousel.fixtures";

type Props = {
  visible: boolean;
  item: TodayMarkItem | null;
  marks?: TodayMarkItem[];
  locale: Locale;
  onClose: () => void;
  onOpenDependencyMark?: (markId: string) => void;
  onOpenDependencyPackCheck?: (packCheckId: string) => void;
  onOpenSignal?: (markId: string) => void;
  onMark?: (markId: string) => void | Promise<void>;
  onMove?: (markId: string, value: MoveMarkValue) => void | Promise<void>;
  onSkip?: (markId: string) => void | Promise<void>;
  onUpdateDetail?: (markId: string, detail: string) => void | Promise<void>;
  onToggleEmbeddedChecklistItem?: (markId: string, packCheckId: string, itemId: string, checked: boolean) => void;
  onSubstituteWithExisting?: (markId: string, substituteMarkId: string) => void | Promise<void>;
  onSubstituteWithQuickMark?: (markId: string, value: QuickSubstituteValue) => void | Promise<void>;
};

const pathLabels: Record<Locale, Record<PathId, string>> = getTodayMarkPathLabels();

export function TodayMarkActionSheet({
  visible,
  item,
  marks = [],
  locale,
  onClose,
  onOpenDependencyMark,
  onOpenDependencyPackCheck,
  onOpenSignal,
  onMark,
  onMove,
  onSkip,
  onUpdateDetail,
  onToggleEmbeddedChecklistItem,
  onSubstituteWithExisting,
  onSubstituteWithQuickMark,
}: Props) {
  const resolvedItem = useMemo(
    () => (item ? marks.find((candidate) => candidate.id === item.id) ?? item : null),
    [item, marks],
  );

  const mark = useMemo(
    () =>
      resolvedItem
        ? mapTodayMarkToActionSheetMark(resolvedItem, locale, {
            openDependencyMark: onOpenDependencyMark,
            openDependencyPackCheck: onOpenDependencyPackCheck,
            openSignal: onOpenSignal,
            toggleEmbeddedChecklistItem: onToggleEmbeddedChecklistItem,
          })
        : null,
    [locale, onOpenDependencyMark, onOpenDependencyPackCheck, onOpenSignal, onToggleEmbeddedChecklistItem, resolvedItem],
  );

  const substituteCandidates = useMemo<SubstituteCandidateMark[]>(
    () =>
      marks
        .filter((candidate) => candidate.id !== resolvedItem?.id)
        .map((candidate) => ({
          id: candidate.id,
          title: candidate.title[locale],
          pathLabel: pathLabels[locale][candidate.pathId],
          statusLabel: getStatusLabel(candidate.status, locale),
        })),
    [locale, marks, resolvedItem?.id],
  );

  useEffect(() => {
    if (visible && !resolvedItem) {
      onClose();
    }
  }, [onClose, resolvedItem, visible]);

  if (!visible || !mark) {
    return null;
  }

  return (
    <WMSheet contentStyle={{ paddingTop: 0, flex: 1 }} onClose={onClose} presentation="fullScreen" visible={visible}>
      <PlannedMarkActionSheetContent
        featureFlags={{ substitutePlannedMark: true }}
        layoutMode="fullScreen"
        locale={locale}
        mark={mark}
        onClose={onClose}
        onMark={async (markId) => {
          onClose();
          await onMark?.(markId);
        }}
        onMove={async (markId, value) => {
          onClose();
          await onMove?.(markId, value);
        }}
        onSkip={async (markId) => {
          onClose();
          await onSkip?.(markId);
        }}
        onUpdateDetail={onUpdateDetail}
        onSubstituteWithExisting={
          onSubstituteWithExisting
            ? async (markId, substituteMarkId) => {
                onClose();
                await onSubstituteWithExisting(markId, substituteMarkId);
              }
            : undefined
        }
        onSubstituteWithQuickMark={
          onSubstituteWithQuickMark
            ? async (markId, value) => {
                onClose();
                await onSubstituteWithQuickMark(markId, value);
              }
            : undefined
        }
        pathOptions={Object.entries(pathLabels[locale]).map(([id, label]) => ({
          id,
          label,
          theme: getPlannedMarkPathTheme(id as PathId),
        }))}
        substituteCandidates={substituteCandidates}
      />
    </WMSheet>
  );
}

function getStatusLabel(status: TodayMarkItem["status"], locale: Locale) {
  switch (status) {
    case "dependency_required":
      return locale === "vi" ? "Cáº§n phá»¥ thuá»™c" : "Dependency Required";
    case "blocked":
      return locale === "vi" ? "Bá»‹ cháº·n" : "Blocked";
    case "ready_with_advisory":
      return locale === "vi" ? "Khuyáº¿n nghá»‹" : "Advisory";
    case "ready_with_waiver":
      return locale === "vi" ? "ÄÃ£ miá»…n" : "Waived";
    case "needs_decision":
      return locale === "vi" ? "Cáº§n quyáº¿t Ä‘á»‹nh" : "Needs Decision";
    case "done":
      return locale === "vi" ? "ÄÃ£ xong" : "Done";
    case "resolved":
      return locale === "vi" ? "ÄÃ£ xá»­ lÃ½" : "Resolved";
    case "overdue":
      return locale === "vi" ? "QuÃ¡ háº¡n hÃ´m nay" : "Overdue today";
    default:
      return locale === "vi" ? "Sáºµn sÃ ng" : "Ready";
  }
}
