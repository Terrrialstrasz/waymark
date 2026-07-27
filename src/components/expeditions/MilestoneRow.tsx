import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";
import { ExpeditionMilestoneActions, ExpeditionMilestoneItem } from "./types";
import { Locale } from "../../types/ui";
import { buildMilestoneScreenReaderLabel, formatMilestoneMarkCount, getMilestoneStatusTone, getStatusLabel } from "./detailModel";
import { colors, foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { WMText } from "../primitives/Text";
import { StatusChip } from "../primitives/StatusChip";
import { MilestoneDateRangeBadge } from "./MilestoneDateRangeBadge";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { ExpeditionPlannedMarkRow } from "./ExpeditionPlannedMarkRow";

type Props = {
  milestone: ExpeditionMilestoneItem;
  locale: Locale;
  expanded: boolean;
  onToggle: () => void;
  onOpenMarkDetail?: (markId: string) => void;
  showConnector?: boolean;
} & ExpeditionMilestoneActions;

export function MilestoneRow({
  milestone,
  locale,
  expanded,
  onToggle,
  onCompleteMilestone,
  onOpenMarkDetail,
  onRescheduleMilestone,
  onSkipMilestone,
  showConnector = true,
}: Props) {
  const actionLabels = getMilestoneActionLabels(locale, milestone.title);
  const hasActions = Boolean(onCompleteMilestone || onSkipMilestone || onRescheduleMilestone);

  return (
    <View style={styles.rowWrap}>
      <View accessible={false} pointerEvents="none" style={styles.timelineColumn}>
        <MilestoneNode status={milestone.status} />
        {showConnector ? <View style={styles.connector} /> : null}
      </View>

      <View style={styles.contentColumn}>
        <Pressable
          accessibilityLabel={buildMilestoneScreenReaderLabel(milestone, locale, expanded)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={onToggle}
          style={({ pressed }) => [styles.headerPressable, pressed ? styles.headerPressed : null]}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.titleColumn}>
              <WMText style={styles.kicker} variant="meta">
                {milestone.number}.
              </WMText>
              <WMText numberOfLines={2} style={styles.title} variant="sectionTitle">
                {milestone.title}
              </WMText>
            </View>

            <StatusChip label={getStatusLabel(milestone.status, locale)} size="compact" stateTone={getMilestoneStatusTone(milestone.status)} />
          </View>

          <View style={styles.metaRow}>
            <MilestoneDateRangeBadge endDate={milestone.endDate} locale={locale} startDate={milestone.startDate} />
            <WMText style={styles.markCount} variant="bodySm">
              {formatMilestoneMarkCount(milestone.completedMarks, milestone.totalMarks, locale)}
            </WMText>
            <View style={styles.chevronSlot}>
              <WaymarkIcon semanticName="utility.chevron" size="sm" state="muted" style={expanded ? styles.chevronExpanded : undefined} />
            </View>
          </View>
        </Pressable>

        {hasActions ? (
          <View style={styles.actionsRow}>
            <MilestoneActionButton
              actionType="done"
              disabled={!onCompleteMilestone || milestone.status === "done"}
              label={actionLabels.complete}
              onPress={() => onCompleteMilestone?.(milestone.id)}
            />
            <MilestoneActionButton
              actionType="delete"
              disabled={!onSkipMilestone || milestone.status === "done" || milestone.status === "skipped"}
              label={actionLabels.skip}
              onPress={() => onSkipMilestone?.(milestone.id)}
            />
            <MilestoneActionButton
              actionType="extendDeadline"
              disabled={!onRescheduleMilestone || milestone.status === "done"}
              label={actionLabels.reschedule}
              onPress={() => onRescheduleMilestone?.(milestone.id)}
            />
          </View>
        ) : null}

        {expanded ? (
          <View style={styles.expandedList}>
            {milestone.plannedMarks.length > 0 ? (
              milestone.plannedMarks.map((mark) => (
                <ExpeditionPlannedMarkRow key={mark.id} locale={locale} mark={mark} onOpenMarkDetail={onOpenMarkDetail} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <WMText style={styles.emptyTitle} variant="bodyStrong">
                  {locale === "vi" ? "Chưa có planned mark nào" : "No linked planned marks yet"}
                </WMText>
                <WMText style={styles.emptyBody} variant="bodySm">
                  {milestone.totalMarks > 0 && __DEV__
                    ? locale === "vi"
                      ? "Bản ghi đếm mark tồn tại nhưng danh sách mark rỗng. Hãy kiểm tra lại dữ liệu truyền vào component."
                      : "Mark counts exist, but the rendered mark list is empty. Check the milestone render payload."
                    : locale === "vi"
                      ? "Milestone này chưa có planned mark được liên kết."
                      : "This milestone does not have any linked planned marks."}
                </WMText>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function MilestoneNode({ status }: { status: ExpeditionMilestoneItem["status"] }) {
  if (status === "done") {
    return (
      <View style={[styles.node, styles.nodeDone]}>
        <WaymarkIcon semanticName="status.done" size="xs" state="selected" />
      </View>
    );
  }

  if (status === "inProgress") {
    return (
      <View style={[styles.node, styles.nodeActive]}>
        <WaymarkIcon semanticName="status.inProgress" size="xs" state="active" />
      </View>
    );
  }

  if (status === "skipped") {
    return (
      <View style={[styles.node, styles.nodeSkipped]}>
        <WMText style={styles.nodeSkippedIcon} variant="bodyStrong">
          x
        </WMText>
      </View>
    );
  }

  return <View style={[styles.node, styles.nodeUpcoming]} />;
}

function getMilestoneActionLabels(locale: Locale, title: string) {
  if (locale === "vi") {
    return {
      complete: `Hoàn thành milestone ${title}`,
      skip: `Xóa milestone ${title}`,
      reschedule: `Gia hạn deadline milestone ${title}`,
    };
  }

  return {
    complete: `Mark milestone done ${title}`,
    skip: `Delete milestone ${title}`,
    reschedule: `Extend milestone deadline ${title}`,
  };
}

type MilestoneActionType = "done" | "delete" | "extendDeadline";

const MILESTONE_ACTION_BUTTON_SIZE = 40;
const MILESTONE_ACTION_ICON_SIZE = 25;
const MILESTONE_ACTION_HIT_SLOP = 4;

type MilestoneActionButtonProps = {
  actionType: MilestoneActionType;
  disabled?: boolean;
  label: string;
  onPress?: () => void;
};

const milestoneActionTokens: Record<MilestoneActionType, { backgroundColor: string; borderColor: string; iconColor: string }> = {
  done: {
    backgroundColor: foundationColors.green.soft,
    borderColor: foundationColors.border.protected,
    iconColor: foundationColors.green.deep,
  },
  delete: {
    backgroundColor: colors.dangerSoft,
    borderColor: foundationColors.border.missed,
    iconColor: foundationColors.clay.base,
  },
  extendDeadline: {
    backgroundColor: colors.warningSoft,
    borderColor: foundationColors.gold.base,
    iconColor: foundationColors.gold.deep,
  },
};

const disabledActionTokens = {
  backgroundColor: foundationColors.bg.disabled,
  borderColor: foundationColors.border.disabled,
  iconColor: foundationColors.ink.disabled,
};

function MilestoneActionButton({ actionType, disabled, label, onPress }: MilestoneActionButtonProps) {
  const tokens = disabled ? disabledActionTokens : milestoneActionTokens[actionType];

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={MILESTONE_ACTION_HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: tokens.backgroundColor,
          borderColor: tokens.borderColor,
          opacity: pressed && !disabled ? 0.82 : 1,
        },
      ]}
    >
      <MilestoneActionIcon actionType={actionType} color={tokens.iconColor} />
    </Pressable>
  );
}

function MilestoneActionIcon({ actionType, color }: { actionType: MilestoneActionType; color: string }) {
  switch (actionType) {
    case "done":
      return <MilestoneDoneIcon color={color} />;
    case "delete":
      return <MilestoneDeleteIcon color={color} />;
    case "extendDeadline":
      return <MilestoneExtendDeadlineIcon color={color} />;
    default:
      return null;
  }
}

function MilestoneDoneIcon({ color }: { color: string }) {
  return (
    <Svg color={color} fill="none" height={MILESTONE_ACTION_ICON_SIZE} viewBox="0 0 24 24" width={MILESTONE_ACTION_ICON_SIZE}>
      <Circle cx="12" cy="12" r="8" {...milestoneIconStrokeProps} />
      <Polyline points="8.5 12.3 11 14.8 15.8 9.4" {...milestoneIconStrokeProps} />
    </Svg>
  );
}

function MilestoneDeleteIcon({ color }: { color: string }) {
  return (
    <Svg color={color} fill="none" height={MILESTONE_ACTION_ICON_SIZE} viewBox="0 0 24 24" width={MILESTONE_ACTION_ICON_SIZE}>
      <Path d="M7.5 8h9" {...milestoneIconStrokeProps} />
      <Path d="M9.5 8V6.5h5V8" {...milestoneIconStrokeProps} />
      <Path d="M8.7 8.2l.7 9.3h5.2l.7-9.3" {...milestoneIconStrokeProps} />
      <Line x1="10.8" x2="10.8" y1="11" y2="15.5" {...milestoneIconStrokeProps} />
      <Line x1="13.2" x2="13.2" y1="11" y2="15.5" {...milestoneIconStrokeProps} />
    </Svg>
  );
}

function MilestoneExtendDeadlineIcon({ color }: { color: string }) {
  return (
    <Svg color={color} fill="none" height={MILESTONE_ACTION_ICON_SIZE} viewBox="0 0 24 24" width={MILESTONE_ACTION_ICON_SIZE}>
      <Rect height="11" rx="2.4" width="12" x="4.8" y="5.8" {...milestoneIconStrokeProps} />
      <Line x1="8" x2="8" y1="4.3" y2="7.7" {...milestoneIconStrokeProps} />
      <Line x1="13.6" x2="13.6" y1="4.3" y2="7.7" {...milestoneIconStrokeProps} />
      <Line x1="4.8" x2="16.8" y1="9.3" y2="9.3" {...milestoneIconStrokeProps} />
      <Path d="M13.5 18.2a4.4 4.4 0 004.9-4.9" {...milestoneIconStrokeProps} />
      <Polyline points="18.2 16.6 18.5 13.2 15.2 13.7" {...milestoneIconStrokeProps} />
    </Svg>
  );
}

const milestoneIconStrokeProps = {
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.85,
};

const styles = StyleSheet.create({
  rowWrap: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  timelineColumn: {
    alignItems: "center",
    width: 24,
  },
  node: {
    alignItems: "center",
    borderRadius: semanticRadius.badge,
    height: 24,
    justifyContent: "center",
    marginTop: 6,
    width: 24,
  },
  nodeDone: {
    backgroundColor: foundationColors.green.base,
    borderWidth: 1,
    borderColor: foundationColors.green.deep,
  },
  nodeActive: {
    backgroundColor: foundationColors.gold.soft,
    borderWidth: 1,
    borderColor: foundationColors.gold.base,
    borderStyle: "dashed",
  },
  nodeUpcoming: {
    backgroundColor: foundationColors.bg.paper,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
  },
  nodeSkipped: {
    backgroundColor: foundationColors.bg.paperSoft,
    borderWidth: 1,
    borderColor: foundationColors.border.missed,
  },
  nodeSkippedIcon: {
    color: foundationColors.ink.tertiary,
    lineHeight: 16,
  },
  connector: {
    backgroundColor: foundationColors.border.subtle,
    flex: 1,
    marginTop: spacing.xs,
    width: 2,
  },
  contentColumn: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
    paddingBottom: spacing.sm,
  },
  headerPressable: {
    borderRadius: semanticRadius.card.compact,
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  headerPressed: {
    backgroundColor: "rgba(64, 53, 40, 0.04)",
  },
  headerTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  titleColumn: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  kicker: {
    color: foundationColors.ink.tertiary,
  },
  title: {
    color: foundationColors.ink.primary,
    fontSize: 18,
    lineHeight: 24,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  markCount: {
    color: foundationColors.ink.secondary,
    marginLeft: "auto",
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.xs,
  },
  actionButton: {
    alignItems: "center",
    borderRadius: semanticRadius.badge,
    borderWidth: 1,
    height: MILESTONE_ACTION_BUTTON_SIZE,
    justifyContent: "center",
    padding: 0,
    width: MILESTONE_ACTION_BUTTON_SIZE,
  },
  chevronSlot: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 24,
    minWidth: 24,
  },
  chevronExpanded: {
    transform: [{ rotate: "90deg" }],
  },
  expandedList: {
    gap: spacing.xs,
    marginLeft: 0,
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
    paddingTop: spacing.xs,
  },
  emptyState: {
    backgroundColor: foundationColors.bg.paperWarm,
    borderColor: foundationColors.border.soft,
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  emptyTitle: {
    color: foundationColors.ink.primary,
  },
  emptyBody: {
    color: foundationColors.ink.secondary,
  },
});
