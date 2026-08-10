import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ExpeditionMilestoneActions, ExpeditionMilestoneItem, ExpeditionNoMilestoneGroupItem, ExpeditionPlannedMarkItem } from "./types";
import { Locale } from "../../types/ui";
import { JournalCard } from "../primitives/JournalCard";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMText } from "../primitives/Text";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { getCopy } from "../../i18n/copy";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { formatMilestoneMarkCount, getStatusLabel } from "./detailModel";

type Props = {
  milestones: ExpeditionMilestoneItem[];
  locale: Locale;
  unassignedMarks?: ExpeditionNoMilestoneGroupItem | null;
  onOpenMarkDetail?: (markId: string) => void;
} & ExpeditionMilestoneActions;

export function MilestoneTimeline({
  milestones,
  locale,
  unassignedMarks,
  onCompleteMilestone,
  onOpenMarkDetail,
  onRescheduleMilestone,
  onSkipMilestone,
}: Props) {
  const copy = getCopy(locale).expeditionDetail;
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() =>
    milestones.reduce<Record<string, boolean>>((acc, milestone) => {
      acc[milestone.id] = Boolean(milestone.isExpanded);
      return acc;
    }, {})
  );

  const hasMilestones = milestones.length > 0;
  const hasUnassignedMarks = Boolean(unassignedMarks && unassignedMarks.plannedMarks.length > 0);
  const toggleMilestone = (milestoneId: string) => {
    setExpandedIds((current) => ({
      ...current,
      [milestoneId]: !current[milestoneId],
    }));
  };

  if (!hasMilestones && !hasUnassignedMarks) {
    return <WMEmptyState body={copy.emptyMilestonesBody} title={copy.emptyMilestonesTitle} />;
  }

  return (
    <JournalCard style={styles.card} variant="standard">
      <View style={styles.header}>
        <WMText variant="pageTitle">{copy.timedMilestonesTitle}</WMText>
        <WMText style={styles.support} variant="bodySm">
          {copy.timedMilestonesBody}
        </WMText>
      </View>

      <View style={styles.list}>
        {milestones.map((milestone, index) => (
          <ExpeditionPathStyleMilestoneRow
            expanded={Boolean(expandedIds[milestone.id])}
            index={index}
            key={milestone.id}
            locale={locale}
            milestone={milestone}
            onCompleteMilestone={onCompleteMilestone}
            onOpenMarkDetail={onOpenMarkDetail}
            onRescheduleMilestone={onRescheduleMilestone}
            onSkipMilestone={onSkipMilestone}
            onToggle={() => toggleMilestone(milestone.id)}
          />
        ))}
        {unassignedMarks && hasUnassignedMarks ? (
          <ExpeditionNoMilestoneRow
            expanded={Boolean(expandedIds[unassignedMarks.id])}
            locale={locale}
            onOpenMarkDetail={onOpenMarkDetail}
            onToggle={() => toggleMilestone(unassignedMarks.id)}
            unassignedMarks={unassignedMarks}
          />
        ) : null}
      </View>
    </JournalCard>
  );
}

function ExpeditionNoMilestoneRow({
  expanded,
  locale,
  onOpenMarkDetail,
  onToggle,
  unassignedMarks,
}: {
  expanded: boolean;
  locale: Locale;
  onOpenMarkDetail?: (markId: string) => void;
  onToggle: () => void;
  unassignedMarks: ExpeditionNoMilestoneGroupItem;
}) {
  const sortedMarks = sortExpeditionMarks(unassignedMarks.plannedMarks);

  return (
    <View style={styles.milestoneStack}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.milestoneRow, pressed ? styles.milestoneRowPressed : null]}
      >
        <View style={[styles.milestoneOrdinal, styles.noMilestoneOrdinal]}>
          <WMText style={styles.noMilestoneOrdinalText} variant="metaCompact">
            --
          </WMText>
        </View>
        <View style={styles.milestoneCopy}>
          <WMText numberOfLines={2} style={styles.milestoneTitle} variant="bodyStrong">
            {unassignedMarks.title}
          </WMText>
          <WMText numberOfLines={1} style={styles.milestoneMeta} variant="metaCompact">
            {formatMilestoneMarkCount(unassignedMarks.completedMarks, unassignedMarks.totalMarks, locale)}
          </WMText>
        </View>
        <WaymarkIcon decorative semanticName={expanded ? "utility.chevronUp" : "utility.chevronDown"} size="xs" state="muted" />
      </Pressable>

      {expanded ? (
        <View style={styles.milestoneExpandedPanel}>
          <View style={styles.milestoneMarksPanel}>
            <WMText style={styles.milestoneMarksLabel} variant="metaCompact">
              {locale === "vi" ? "MARKS" : "MARKS"}
            </WMText>
            <View style={styles.markList}>
              {sortedMarks.map((mark) => (
                <ExpeditionPathStyleMarkRow key={mark.id} locale={locale} mark={mark} onOpenMarkDetail={onOpenMarkDetail} />
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ExpeditionPathStyleMilestoneRow({
  expanded,
  index,
  locale,
  milestone,
  onCompleteMilestone,
  onOpenMarkDetail,
  onRescheduleMilestone,
  onSkipMilestone,
  onToggle,
}: {
  expanded: boolean;
  index: number;
  locale: Locale;
  milestone: ExpeditionMilestoneItem;
  onOpenMarkDetail?: (markId: string) => void;
  onToggle: () => void;
} & ExpeditionMilestoneActions) {
  const done = milestone.status === "done";
  const closed = done || milestone.status === "skipped";
  const sortedMarks = sortExpeditionMarks(milestone.plannedMarks);

  return (
    <View style={styles.milestoneStack}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.milestoneRow, pressed ? styles.milestoneRowPressed : null]}
      >
        <View style={[styles.milestoneOrdinal, done ? styles.milestoneOrdinalDone : null]}>
          <WMText style={[styles.milestoneOrdinalText, done ? styles.milestoneOrdinalTextDone : null]} variant="metaCompact">
            {String(milestone.number || index + 1).padStart(2, "0")}
          </WMText>
        </View>
        <View style={styles.milestoneCopy}>
          <WMText numberOfLines={2} style={[styles.milestoneTitle, done ? styles.milestoneTitleDone : null]} variant="bodyStrong">
            {milestone.title}
          </WMText>
          <WMText numberOfLines={1} style={[styles.milestoneMeta, done ? styles.milestoneMetaDone : null]} variant="metaCompact">
            {buildExpeditionMilestoneMeta(milestone, locale)}
          </WMText>
        </View>
        <WaymarkIcon decorative semanticName={expanded ? "utility.chevronUp" : "utility.chevronDown"} size="xs" state="muted" />
      </Pressable>

      {expanded ? (
        <View style={styles.milestoneExpandedPanel}>
          <View style={styles.milestoneActionsRow}>
            <ExpeditionMilestoneActionButton
              disabled={!onCompleteMilestone || closed}
              label={locale === "vi" ? "Hoan thanh" : "Complete"}
              tone="done"
              onPress={() => onCompleteMilestone?.(milestone.id)}
            />
            <ExpeditionMilestoneActionButton
              disabled={!onRescheduleMilestone || closed}
              label={locale === "vi" ? "Doi lich" : "Reschedule"}
              tone="move"
              onPress={() => onRescheduleMilestone?.(milestone.id)}
            />
            <ExpeditionMilestoneActionButton
              disabled={!onSkipMilestone || closed}
              label={locale === "vi" ? "Huy" : "Cancel"}
              tone="cancel"
              onPress={() => onSkipMilestone?.(milestone.id)}
            />
          </View>

          <View style={styles.milestoneMarksPanel}>
            <WMText style={styles.milestoneMarksLabel} variant="metaCompact">
              {locale === "vi" ? "MARKS" : "MARKS"}
            </WMText>
            {sortedMarks.length > 0 ? (
              <View style={styles.markList}>
                {sortedMarks.map((mark) => (
                  <ExpeditionPathStyleMarkRow key={mark.id} locale={locale} mark={mark} onOpenMarkDetail={onOpenMarkDetail} />
                ))}
              </View>
            ) : (
              <WMText style={styles.emptyMarkText} variant="bodySm">
                {locale === "vi" ? "Milestone nay chua co mark linked." : "This milestone does not have linked marks yet."}
              </WMText>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ExpeditionMilestoneActionButton({
  disabled,
  label,
  onPress,
  tone,
}: {
  disabled?: boolean;
  label: string;
  onPress?: () => void;
  tone: "done" | "move" | "cancel";
}) {
  const color =
    tone === "done"
      ? foundationColors.green.deep
      : tone === "move"
        ? foundationColors.gold.deep
        : foundationColors.clay.base;
  const icon = tone === "done" ? "✓" : tone === "move" ? "↻" : "×";

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { borderColor: color, opacity: disabled ? 0.38 : pressed ? 0.76 : 1 },
      ]}
    >
      <WMText style={[styles.actionIcon, { color }]} variant="sectionTitle">
        {icon}
      </WMText>
    </Pressable>
  );
}

function ExpeditionPathStyleMarkRow({
  locale,
  mark,
  onOpenMarkDetail,
}: {
  locale: Locale;
  mark: ExpeditionPlannedMarkItem;
  onOpenMarkDetail?: (markId: string) => void;
}) {
  const done = isDoneMark(mark);
  const interactive = Boolean(onOpenMarkDetail);

  return (
    <Pressable
      accessibilityRole={interactive ? "button" : "text"}
      disabled={!interactive}
      onPress={() => onOpenMarkDetail?.(mark.id)}
      style={({ pressed }) => [styles.markRow, done ? styles.markRowDone : null, pressed ? styles.markRowPressed : null]}
    >
      <WMText numberOfLines={1} style={[styles.markTime, done ? styles.markMetaDone : null]} variant="metaCompact">
        {formatMarkTiming(mark)}
      </WMText>
      <WMText numberOfLines={2} style={[styles.markTitle, done ? styles.markTitleDone : null]} variant="bodySm">
        {mark.title}
      </WMText>
      <WMText numberOfLines={1} style={[styles.markStatus, done ? styles.markMetaDone : null]} variant="metaCompact">
        {getStatusLabel(mark.status, locale)}
      </WMText>
    </Pressable>
  );
}

function buildExpeditionMilestoneMeta(milestone: ExpeditionMilestoneItem, locale: Locale) {
  const status = getStatusLabel(milestone.status, locale);
  const count = formatMilestoneMarkCount(milestone.completedMarks, milestone.totalMarks, locale);
  if (milestone.status === "done" && milestone.completedAt) {
    return `${status} Â· ${formatMilestoneDate(milestone.completedAt)} Â· ${count}`;
  }
  return `${status} · ${count}`;
}

function sortExpeditionMarks(marks: ExpeditionPlannedMarkItem[]) {
  return [...marks].sort((left, right) => {
    return getMarkSortTime(left).localeCompare(getMarkSortTime(right)) || left.title.localeCompare(right.title);
  });
}

function isDoneMark(mark: ExpeditionPlannedMarkItem) {
  return mark.status === "completed";
}

function getMarkSortTime(mark: ExpeditionPlannedMarkItem) {
  return mark.sortTime ?? mark.timingLabel ?? "";
}

function formatMarkTiming(mark: ExpeditionPlannedMarkItem) {
  return mark.timingLabel?.replace("T", " ").slice(0, 16) ?? "—";
}

function formatMilestoneDate(value: string | Date) {
  const raw = value instanceof Date ? value.toISOString() : value;
  const [datePart] = raw.split("T");
  const [, month, day] = datePart.split("-");
  return day && month ? `${day}/${month}` : datePart;
}

const styles = StyleSheet.create({
  card: {
    borderColor: foundationColors.border.soft,
  },
  header: {
    gap: spacing.xxs,
  },
  support: {
    color: foundationColors.ink.secondary,
  },
  list: {
    gap: spacing.xs,
  },
  milestoneStack: {
    gap: spacing.xs,
  },
  milestoneRow: {
    alignItems: "flex-start",
    borderRadius: semanticRadius.button.compact,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  milestoneRowPressed: {
    backgroundColor: "rgba(64, 53, 40, 0.04)",
  },
  milestoneOrdinal: {
    alignItems: "center",
    backgroundColor: foundationColors.bg.paperWarm,
    borderColor: foundationColors.border.subtle,
    borderRadius: semanticRadius.badge,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  milestoneOrdinalDone: {
    backgroundColor: foundationColors.green.soft,
    borderColor: foundationColors.border.protected,
  },
  milestoneOrdinalText: {
    color: foundationColors.ink.tertiary,
    fontWeight: "700",
  },
  milestoneOrdinalTextDone: {
    color: foundationColors.green.deep,
  },
  noMilestoneOrdinal: {
    backgroundColor: foundationColors.bg.paperSoft,
  },
  noMilestoneOrdinalText: {
    color: foundationColors.ink.tertiary,
    fontWeight: "700",
  },
  milestoneCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  milestoneTitle: {
    color: foundationColors.ink.primary,
  },
  milestoneTitleDone: {
    color: foundationColors.ink.secondary,
    textDecorationLine: "line-through",
  },
  milestoneMeta: {
    color: foundationColors.ink.tertiary,
  },
  milestoneMetaDone: {
    color: foundationColors.ink.disabled,
  },
  milestoneExpandedPanel: {
    borderLeftColor: foundationColors.border.subtle,
    borderLeftWidth: 1,
    gap: spacing.sm,
    marginLeft: 16,
    paddingBottom: spacing.xs,
    paddingLeft: spacing.md,
  },
  milestoneActionsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: foundationColors.bg.paper,
    borderRadius: semanticRadius.badge,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingVertical: spacing.xs,
  },
  actionIcon: {
    fontSize: 21,
    fontWeight: "700",
    lineHeight: 24,
  },
  milestoneMarksPanel: {
    gap: spacing.xs,
  },
  milestoneMarksLabel: {
    color: foundationColors.ink.secondary,
    fontWeight: "700",
    letterSpacing: 1,
  },
  markList: {
    gap: spacing.xxs,
  },
  markRow: {
    alignItems: "flex-start",
    borderRadius: semanticRadius.button.compact,
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  markRowPressed: {
    backgroundColor: "rgba(64, 53, 40, 0.04)",
  },
  markRowDone: {
    opacity: 0.82,
  },
  markTime: {
    color: foundationColors.ink.secondary,
    minWidth: 68,
  },
  markTitle: {
    color: foundationColors.ink.primary,
    flex: 1,
    minWidth: 0,
  },
  markStatus: {
    color: foundationColors.ink.tertiary,
    textAlign: "right",
  },
  markTitleDone: {
    color: foundationColors.ink.disabled,
    textDecorationLine: "line-through",
  },
  markMetaDone: {
    color: foundationColors.ink.disabled,
  },
  emptyMarkText: {
    color: foundationColors.ink.secondary,
  },
});
