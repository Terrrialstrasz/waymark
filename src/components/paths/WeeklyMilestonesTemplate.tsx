import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useMemo, useState } from "react";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";
import type { BottomTabId, Locale } from "../../types/ui";
import { colors, foundationColors, getWaymarkPressStyle, semanticBorder, semanticElevation, semanticRadius, spacing } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { DEBUG_LAYOUT, DEBUG_LAYOUT_VERSION, DebugBanner, DebugLayerBox } from "../../debug/layoutDebug";
import { BottomNavBar } from "../primitives/BottomNavBar";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMText } from "../primitives/Text";
import type { WeeklyMilestoneItem, WeeklyMilestoneMarkItem } from "./types";
import { todayPathHeroPaths } from "../../lib/waymark/todayPathHero";

export type WeeklyMilestoneCollectionProps = {
  locale: Locale;
  status: "loading" | "ready" | "error";
  errorMessage?: string;
  milestones: WeeklyMilestoneItem[];
  onCompleteMilestone?: (milestoneId: string) => void;
  onMoveMilestone?: (milestoneId: string) => void;
  onOpenMark?: (milestone: WeeklyMilestoneItem, mark: WeeklyMilestoneMarkItem) => void;
  onOpenPath?: (pathId: WeeklyMilestoneItem["pathId"]) => void;
  onOpenExpedition?: (expeditionId: string) => void;
  onSkipMilestone?: (milestoneId: string) => void;
};

type Props = WeeklyMilestoneCollectionProps & {
  showBottomNav?: boolean;
  onTabPress?: (tab: Exclude<BottomTabId, "capture">) => void;
};

type WeeklyMilestonePathGroup = {
  pathId: WeeklyMilestoneItem["pathId"];
  pathTitle: string;
  pathSubtitle: string;
  pathAccent: string;
  pathAccentDeep: string;
  pathAccentSoft: string;
  milestones: WeeklyMilestoneItem[];
};

type WeeklyMilestonePathFilter = {
  id: "all" | WeeklyMilestoneItem["pathId"];
  label: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

type MilestonePanelAction = "done" | "delete" | "move";

export function WeeklyMilestonesTemplate({
  locale,
  status,
  errorMessage,
  milestones,
  onCompleteMilestone,
  onMoveMilestone,
  onOpenMark,
  onOpenPath,
  onOpenExpedition,
  onSkipMilestone,
  showBottomNav = true,
  onTabPress,
}: Props) {
  const copy = getWeeklyMilestonesCopy(locale);

  return (
    <FieldJournalScreenShell
      botanicalAmbient
      botanicalMotifs={["botanical.trailCurve"]}
      debugLabel="WeeklyMilestonesTemplate.FieldJournalScreenShell"
      variant="navAware"
    >
      <DebugLayerBox label="WeeklyMilestonesTemplate.Root" tone="blue">
        <PageHeader
          decorativeAccent
          decorativeMotifs={["botanical.trailCurve"]}
          logoSize="lg"
          logoVariant="primary"
          title={copy.title}
          variant="standard"
        />

        <View style={styles.weeklySectionHeader}>
          <WMText style={styles.weeklySectionTitle} variant="sectionTitle">
            {copy.weeklySectionTitle}
          </WMText>
        </View>

        <WeeklyMilestoneCollection
          errorMessage={errorMessage}
          locale={locale}
          milestones={milestones}
          onCompleteMilestone={onCompleteMilestone}
          onMoveMilestone={onMoveMilestone}
          onOpenExpedition={onOpenExpedition}
          onOpenMark={onOpenMark}
          onOpenPath={onOpenPath}
          onSkipMilestone={onSkipMilestone}
          status={status}
        />

        {showBottomNav ? <BottomNavBar activeTab="paths" locale={locale} onTabPress={onTabPress} /> : null}
      </DebugLayerBox>
    </FieldJournalScreenShell>
  );
}

export function WeeklyMilestoneCollection({
  locale,
  status,
  errorMessage,
  milestones,
  onCompleteMilestone,
  onMoveMilestone,
  onOpenMark,
  onOpenPath,
  onOpenExpedition,
  onSkipMilestone,
}: WeeklyMilestoneCollectionProps) {
  const copy = getWeeklyMilestonesCopy(locale);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [selectedPathId, setSelectedPathId] = useState<"all" | WeeklyMilestoneItem["pathId"]>("all");
  const pathFilters = useMemo(() => buildPathFilters(locale, copy.allPathsLabel), [copy.allPathsLabel, locale]);
  const filteredMilestones = useMemo(
    () => (selectedPathId === "all" ? milestones : milestones.filter((milestone) => milestone.pathId === selectedPathId)),
    [milestones, selectedPathId],
  );
  const groups = useMemo(() => groupMilestonesByPath(filteredMilestones, locale, selectedPathId), [filteredMilestones, locale, selectedPathId]);

  const toggleExpanded = (milestoneId: string) => {
    setExpandedIds((current) => ({
      ...current,
      [milestoneId]: !current[milestoneId],
    }));
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterCarousel}
        contentContainerStyle={styles.filterRow}
      >
        {pathFilters.map((filter) => (
          <WeeklyPathFilterChip
            key={filter.id}
            filter={filter}
            onPress={() => setSelectedPathId(filter.id)}
            selected={filter.id === selectedPathId}
          />
        ))}
      </ScrollView>

      {DEBUG_LAYOUT ? (
        <DebugBanner
          label={`DEBUG WEEKLY MILESTONE COLLECTION ACTIVE - ${DEBUG_LAYOUT_VERSION}`}
          lines={[`milestones=${milestones.length}`, `filteredMilestones=${filteredMilestones.length}`, `groups=${groups.length}`, `status=${status}`]}
        />
      ) : null}

      {status === "error" ? (
        <WMEmptyState body={errorMessage ?? copy.errorBody} title={copy.errorTitle} />
      ) : status === "loading" ? (
        <WMEmptyState body={copy.loadingBody} title={copy.loadingTitle} />
      ) : (
        <View style={styles.groupList}>
          {groups.map((group) => (
            <View key={group.pathId} style={styles.pathGroup}>
              <Pressable
                accessibilityLabel={copy.openPathLabel(group.pathTitle)}
                accessibilityRole="button"
                disabled={!onOpenPath}
                onPress={() => onOpenPath?.(group.pathId)}
                style={({ pressed }) => [styles.pathHeader, pressed ? styles.pathHeaderPressed : null]}
              >
                <WMText style={[styles.pathTitle, { color: group.pathAccentDeep }]} variant="label">
                  {group.pathTitle}
                </WMText>
                <View style={[styles.pathRule, { backgroundColor: group.pathAccent }]} />
              </Pressable>

              <View style={styles.list}>
                {group.milestones.length > 0 ? (
                  group.milestones.map((milestone) => (
                    <WeeklyMilestoneTrailRow
                      key={milestone.id}
                      copy={copy}
                      expanded={expandedIds[milestone.id] ?? false}
                      item={milestone}
                      onCompleteMilestone={onCompleteMilestone}
                      onMoveMilestone={onMoveMilestone}
                      onOpenExpedition={onOpenExpedition}
                      onOpenMark={onOpenMark}
                      onSkipMilestone={onSkipMilestone}
                      onToggle={() => toggleExpanded(milestone.id)}
                    />
                  ))
                ) : (
                  <View
                    style={[
                      styles.pathSubtitleCard,
                      {
                        backgroundColor: makePathSurfaceColor(group.pathAccentSoft),
                        borderColor: group.pathAccent,
                      },
                    ]}
                  >
                    <WMText style={[styles.pathSubtitleText, { color: group.pathAccentDeep }]} variant="body">
                      {group.pathSubtitle.replace(/\n/gu, " ")}
                    </WMText>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

function WeeklyPathFilterChip({
  filter,
  selected,
  onPress,
}: {
  filter: WeeklyMilestonePathFilter;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        {
          backgroundColor: selected ? filter.borderColor : filter.backgroundColor,
          borderColor: filter.borderColor,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <WMText style={[styles.filterChipText, { color: selected ? foundationColors.bg.paper : filter.textColor }]} variant="chip">
        {filter.label}
      </WMText>
    </Pressable>
  );
}

function WeeklyMilestoneTrailRow({
  item,
  copy,
  expanded,
  onToggle,
  onCompleteMilestone,
  onMoveMilestone,
  onOpenMark,
  onOpenExpedition,
  onSkipMilestone,
}: {
  item: WeeklyMilestoneItem;
  copy: ReturnType<typeof getWeeklyMilestonesCopy>;
  expanded: boolean;
  onToggle: () => void;
  onCompleteMilestone?: (milestoneId: string) => void;
  onMoveMilestone?: (milestoneId: string) => void;
  onOpenMark?: (milestone: WeeklyMilestoneItem, mark: WeeklyMilestoneMarkItem) => void;
  onOpenExpedition?: (expeditionId: string) => void;
  onSkipMilestone?: (milestoneId: string) => void;
}) {
  const completed = item.status === "completed";
  const skipped = item.status === "missed" || item.status === "archived";
  const finalized = completed || skipped;
  const [pendingAction, setPendingAction] = useState<MilestonePanelAction | null>(null);
  const statusCopy = getMilestoneStatusCopy(item.status, copy);
  const pendingActionCopy = pendingAction ? getMilestoneActionPopupCopy(pendingAction, copy) : null;

  const confirmPendingAction = () => {
    if (!pendingAction) {
      return;
    }

    if (pendingAction === "done") {
      onCompleteMilestone?.(item.id);
    } else if (pendingAction === "move") {
      onMoveMilestone?.(item.id);
    } else {
      onSkipMilestone?.(item.id);
    }

    setPendingAction(null);
  };

  return (
    <View style={styles.rowStack}>
      <View
        style={[
          styles.row,
          {
            backgroundColor: makePathSurfaceColor(item.pathAccentSoft),
            borderColor: item.pathAccent,
          },
        ]}
      >
        <PathWatermark item={item} />

        <View style={styles.dateColumn}>
          <WMText numberOfLines={1} style={[styles.dateText, { color: item.pathAccentDeep }, completed ? styles.dateTextDone : null]} variant="meta">
            {formatMilestoneDate(item.startDate)}
          </WMText>
          <WMText numberOfLines={1} style={[styles.dateText, { color: item.pathAccentDeep }, completed ? styles.dateTextDone : null]} variant="meta">
            {formatMilestoneDate(item.endDate)}
          </WMText>
        </View>

        <View style={[styles.rowDivider, { backgroundColor: item.pathAccent }]} />

        <View style={styles.rowCopy}>
          <WMText numberOfLines={2} style={[styles.rowTitle, completed ? styles.rowTitleDone : null]} variant="sectionTitle">
            {item.title}
          </WMText>
          {statusCopy ? (
            <View style={[styles.statusBadge, { borderColor: statusCopy.borderColor, backgroundColor: statusCopy.backgroundColor }]}>
              <WMText numberOfLines={1} style={[styles.statusBadgeText, { color: statusCopy.textColor }]} variant="metaCompact">
                {statusCopy.label}
              </WMText>
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityLabel={expanded ? copy.collapseLabel : copy.expandLabel}
          accessibilityRole="button"
          onPress={onToggle}
          style={({ pressed }) => [styles.chevronButton, getWaymarkPressStyle({ pressed, reducedMotion: false, variant: "secondary" })]}
        >
          <WaymarkIcon decorative={false} semanticName={expanded ? "utility.chevronUp" : "utility.chevronDown"} size="sm" state="muted" />
        </Pressable>
      </View>

      {expanded ? (
        <View style={[styles.expandedPanel, { borderColor: item.pathAccent }]}>
          <View style={styles.actionsRow}>
            <MilestoneActionButton
              actionType="done"
              disabled={!onCompleteMilestone || finalized}
              accessibilityLabel={copy.completeAccessibilityLabel(item.title)}
              onPress={() => setPendingAction("done")}
            />
            <MilestoneActionButton
              actionType="move"
              disabled={!onMoveMilestone || finalized}
              accessibilityLabel={copy.moveAccessibilityLabel(item.title)}
              onPress={() => setPendingAction("move")}
            />
            <MilestoneActionButton
              actionType="delete"
              disabled={!onSkipMilestone || completed || skipped}
              accessibilityLabel={copy.cancelAccessibilityLabel(item.title)}
              onPress={() => setPendingAction("delete")}
            />
          </View>

          {pendingActionCopy ? (
            <View style={[styles.actionPopup, { borderColor: pendingActionCopy.borderColor, backgroundColor: pendingActionCopy.backgroundColor }]}>
              <View style={styles.actionPopupCopy}>
                <WMText style={styles.actionPopupTitle} variant="meta">
                  {pendingActionCopy.title}
                </WMText>
                <WMText style={styles.actionPopupBody} variant="body">
                  {pendingActionCopy.body}
                </WMText>
              </View>
              <View style={styles.actionPopupButtons}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPendingAction(null)}
                  style={({ pressed }) => [styles.actionPopupButton, styles.actionPopupButtonSecondary, pressed ? styles.actionPopupButtonPressed : null]}
                >
                  <WMText style={styles.actionPopupButtonSecondaryText} variant="metaCompact">
                    {copy.keepActionLabel}
                  </WMText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={confirmPendingAction}
                  style={({ pressed }) => [
                    styles.actionPopupButton,
                    { backgroundColor: pendingActionCopy.confirmColor, borderColor: pendingActionCopy.confirmColor },
                    pressed ? styles.actionPopupButtonPressed : null,
                  ]}
                >
                  <WMText style={styles.actionPopupButtonPrimaryText} variant="metaCompact">
                    {pendingActionCopy.confirmLabel}
                  </WMText>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.panelDivider} />

          <View style={styles.marksBlock}>
            <WMText style={[styles.panelSectionLabel, { color: item.pathAccentDeep }]} variant="metaCompact">
              {copy.marksLabel}
            </WMText>
            {item.marks.length > 0 ? (
              <View style={styles.markList}>
                {item.marks.map((mark) => (
                  <WeeklyMilestoneMarkRow
                    key={mark.id}
                    mark={mark}
                    milestone={item}
                    onOpenMark={onOpenMark}
                  />
                ))}
              </View>
            ) : (
              <WMText style={styles.emptyMarksText} variant="body">
                {copy.emptyMarksLabel}
              </WMText>
            )}
          </View>

          <View style={styles.panelDivider} />

          <Pressable
            accessibilityLabel={copy.openExpeditionLabel(item.expeditionTitle)}
            accessibilityRole="button"
            disabled={!onOpenExpedition}
            onPress={() => onOpenExpedition?.(item.expeditionId)}
            style={({ pressed }) => [styles.expeditionPressable, pressed ? styles.expeditionPressed : null]}
          >
            <View style={styles.expeditionCopy}>
              <WMText style={[styles.panelSectionLabel, { color: item.pathAccentDeep }]} variant="metaCompact">
                {copy.expeditionLabel}
              </WMText>
              <WMText numberOfLines={2} style={styles.expeditionTitle} variant="bodyStrong">
                {item.expeditionTitle}
              </WMText>
            </View>
            <WaymarkIcon decorative semanticName="utility.chevron" size="sm" state="muted" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function WeeklyMilestoneMarkRow({
  milestone,
  mark,
  onOpenMark,
}: {
  milestone: WeeklyMilestoneItem;
  mark: WeeklyMilestoneMarkItem;
  onOpenMark?: (milestone: WeeklyMilestoneItem, mark: WeeklyMilestoneMarkItem) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${mark.dayLabel} ${mark.title}`}
      accessibilityRole="button"
      disabled={!onOpenMark}
      onPress={() => onOpenMark?.(milestone, mark)}
      style={({ pressed }) => [styles.markRow, pressed ? styles.markRowPressed : null]}
    >
      <WMText numberOfLines={1} style={[styles.markDay, { color: milestone.pathAccentDeep }, mark.isDone ? styles.markDayDone : null]} variant="metaCompact">
        {mark.dayLabel}
      </WMText>
      <WMText numberOfLines={1} style={[styles.markTitle, mark.isDone ? styles.markTitleDone : null]} variant="body">
        {mark.title}
      </WMText>
    </Pressable>
  );
}

function PathWatermark({ item }: { item: WeeklyMilestoneItem }) {
  if (item.pathIconAssetId) {
    return (
      <View pointerEvents="none" style={styles.rowWatermarkWrap}>
        <WaymarkImage
          alt=""
          assetId={item.pathIconAssetId}
          decorative
          imageStyle={styles.rowWatermarkImage}
          usage="pathIcon"
        />
      </View>
    );
  }

  return (
    <WaymarkIcon
      decorative
      semanticName={item.pathIconSemanticName}
      size="custom"
      customHeight={64}
      customWidth={64}
      state="muted"
      style={styles.rowWatermarkFallback}
    />
  );
}

function MilestoneActionButton({
  actionType,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  actionType: MilestonePanelAction;
  accessibilityLabel: string;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const tokens = disabled ? disabledActionTokens : milestoneActionTokens[actionType];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={4}
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

function MilestoneActionIcon({ actionType, color }: { actionType: MilestonePanelAction; color: string }) {
  switch (actionType) {
    case "done":
      return <MilestoneDoneIcon color={color} />;
    case "delete":
      return <MilestoneDeleteIcon color={color} />;
    case "move":
      return <MilestoneMoveIcon color={color} />;
    default:
      return null;
  }
}

function MilestoneDoneIcon({ color }: { color: string }) {
  return (
    <Svg color={color} fill="none" height={25} viewBox="0 0 24 24" width={25}>
      <Circle cx="12" cy="12" r="8" {...milestoneIconStrokeProps} />
      <Polyline points="8.5 12.3 11 14.8 15.8 9.4" {...milestoneIconStrokeProps} />
    </Svg>
  );
}

function MilestoneDeleteIcon({ color }: { color: string }) {
  return (
    <Svg color={color} fill="none" height={25} viewBox="0 0 24 24" width={25}>
      <Path d="M7.5 8h9" {...milestoneIconStrokeProps} />
      <Path d="M9.5 8V6.5h5V8" {...milestoneIconStrokeProps} />
      <Path d="M8.7 8.2l.7 9.3h5.2l.7-9.3" {...milestoneIconStrokeProps} />
      <Line x1="10.8" x2="10.8" y1="11" y2="15.5" {...milestoneIconStrokeProps} />
      <Line x1="13.2" x2="13.2" y1="11" y2="15.5" {...milestoneIconStrokeProps} />
    </Svg>
  );
}

function MilestoneMoveIcon({ color }: { color: string }) {
  return (
    <Svg color={color} fill="none" height={25} viewBox="0 0 24 24" width={25}>
      <Rect height="11" rx="2.4" width="12" x="4.8" y="5.8" {...milestoneIconStrokeProps} />
      <Line x1="8" x2="8" y1="4.3" y2="7.7" {...milestoneIconStrokeProps} />
      <Line x1="13.6" x2="13.6" y1="4.3" y2="7.7" {...milestoneIconStrokeProps} />
      <Line x1="4.8" x2="16.8" y1="9.3" y2="9.3" {...milestoneIconStrokeProps} />
      <Path d="M13.5 18.2a4.4 4.4 0 004.9-4.9" {...milestoneIconStrokeProps} />
      <Polyline points="18.2 16.6 18.5 13.2 15.2 13.7" {...milestoneIconStrokeProps} />
    </Svg>
  );
}

function groupMilestonesByPath(
  milestones: WeeklyMilestoneItem[],
  locale: Locale,
  selectedPathId: "all" | WeeklyMilestoneItem["pathId"],
): WeeklyMilestonePathGroup[] {
  const milestonesByPathId = new Map<WeeklyMilestoneItem["pathId"], WeeklyMilestoneItem[]>();
  for (const milestone of milestones) {
    const bucket = milestonesByPathId.get(milestone.pathId) ?? [];
    bucket.push(milestone);
    milestonesByPathId.set(milestone.pathId, bucket);
  }

  return todayPathHeroPaths
    .filter((path) => selectedPathId === "all" || path.id === selectedPathId)
    .map((path) => ({
      pathId: path.id,
      pathTitle: path.label[locale],
      pathSubtitle: path.subtitle[locale],
      pathAccent: path.color.accent,
      pathAccentDeep: path.color.accentDeep,
      pathAccentSoft: path.color.accentSoft,
      milestones: milestonesByPathId.get(path.id) ?? [],
    }));
}

function buildPathFilters(locale: Locale, allPathsLabel: string): WeeklyMilestonePathFilter[] {
  return [
    {
      id: "all",
      label: allPathsLabel,
      backgroundColor: foundationColors.bg.paperSoft,
      borderColor: foundationColors.ink.secondary,
      textColor: foundationColors.ink.primary,
    },
    ...todayPathHeroPaths.map((path) => ({
      id: path.id,
      label: path.compactLabel[locale],
      backgroundColor: path.color.accentSoft,
      borderColor: path.color.accent,
      textColor: path.color.accentDeep,
    })),
  ];
}

function formatMilestoneDate(date: string | null) {
  if (!date) {
    return "";
  }

  const [, month, day] = date.split("-");
  if (!day || !month) {
    return "";
  }

  return `${day}/${month}`;
}

function makePathSurfaceColor(hexColor: string) {
  const normalized = hexColor.replace("#", "");
  if (normalized.length !== 6) {
    return hexColor;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, 0.32)`;
}

function getWeeklyMilestonesCopy(locale: Locale) {
  return {
    title: "My Paths",
    weeklySectionTitle: "Weekly Milestones",
    allPathsLabel: locale === "vi" ? "All" : "All",
    expeditionLabel: locale === "vi" ? "Expedition" : "Expedition",
    marksLabel: locale === "vi" ? "Marks" : "Marks",
    emptyMarksLabel: locale === "vi" ? "Chua co Mark nao gan milestone nay trong tuan." : "No marks are linked to this milestone this week.",
    expandLabel: locale === "vi" ? "Mo expedition cua milestone" : "Show milestone expedition",
    collapseLabel: locale === "vi" ? "Thu gon expedition cua milestone" : "Hide milestone expedition",
    openPathLabel: (title: string) => (locale === "vi" ? `Mo path ${title}` : `Open path ${title}`),
    openExpeditionLabel: (title: string) => (locale === "vi" ? `Mo expedition ${title}` : `Open expedition ${title}`),
    completeActionLabel: "Complete",
    rescheduleActionLabel: "Reschedule",
    cancelActionLabel: "Cancel",
    keepActionLabel: locale === "vi" ? "Giu lai" : "Keep",
    doneStatusLabel: locale === "vi" ? "Done" : "Done",
    plannedStatusLabel: locale === "vi" ? "Planned" : "Planned",
    missedStatusLabel: locale === "vi" ? "Missed" : "Missed",
    cancelledStatusLabel: locale === "vi" ? "Cancelled" : "Cancelled",
    confirmCompleteTitle: locale === "vi" ? "Hoan thanh milestone?" : "Complete milestone?",
    confirmCompleteBody:
      locale === "vi"
        ? "Milestone nay se duoc danh dau Done va giu lai trong tuan voi trang thai da hoan thanh."
        : "This milestone will be marked Done and remain visible this week with a completed state.",
    confirmMoveTitle: locale === "vi" ? "Doi lich milestone?" : "Reschedule milestone?",
    confirmMoveBody:
      locale === "vi"
        ? "Milestone nay se duoc day sang tuan tiep theo."
        : "This milestone will move to next week.",
    confirmCancelTitle: locale === "vi" ? "Huy milestone?" : "Cancel milestone?",
    confirmCancelBody:
      locale === "vi"
        ? "Milestone nay se duoc danh dau Cancelled va khong con la milestone dang lam."
        : "This milestone will be marked Cancelled and no longer treated as active.",
    completeAccessibilityLabel: (title: string) => (locale === "vi" ? `Hoan thanh milestone ${title}` : `Complete milestone ${title}`),
    cancelAccessibilityLabel: (title: string) => (locale === "vi" ? `Cancel milestone ${title}` : `Cancel milestone ${title}`),
    moveAccessibilityLabel: (title: string) => (locale === "vi" ? `Reschedule milestone ${title}` : `Reschedule milestone ${title}`),
    loadingTitle: locale === "vi" ? "Dang tai milestones" : "Loading milestones",
    loadingBody: locale === "vi" ? "Dang gom cac milestone trong tuan." : "Gathering this week's milestones.",
    emptyTitle: locale === "vi" ? "Chua co milestone cua tuan" : "No weekly milestones",
    emptyBody:
      locale === "vi"
        ? "Khong co milestone open nao bat dau truoc cuoi tuan nay."
        : "No open milestone starts on or before the end of this week.",
    errorTitle: locale === "vi" ? "Khong tai duoc Weekly Milestones" : "Weekly Milestones could not load",
    errorBody: locale === "vi" ? "Hay thu lai sau khi database san sang." : "Try again after the database is ready.",
  };
}

function getMilestoneStatusCopy(status: WeeklyMilestoneItem["status"], copy: ReturnType<typeof getWeeklyMilestonesCopy>) {
  if (status === "completed") {
    return {
      label: copy.doneStatusLabel,
      backgroundColor: foundationColors.green.soft,
      borderColor: foundationColors.border.protected,
      textColor: foundationColors.green.deep,
    };
  }

  if (status === "missed") {
    return {
      label: copy.missedStatusLabel,
      backgroundColor: colors.dangerSoft,
      borderColor: foundationColors.border.missed,
      textColor: foundationColors.clay.base,
    };
  }

  if (status === "archived") {
    return {
      label: copy.cancelledStatusLabel,
      backgroundColor: colors.dangerSoft,
      borderColor: foundationColors.border.missed,
      textColor: foundationColors.clay.base,
    };
  }

  return null;
}

function getMilestoneActionPopupCopy(actionType: MilestonePanelAction, copy: ReturnType<typeof getWeeklyMilestonesCopy>) {
  if (actionType === "done") {
    return {
      title: copy.confirmCompleteTitle,
      body: copy.confirmCompleteBody,
      confirmLabel: copy.completeActionLabel,
      backgroundColor: foundationColors.green.soft,
      borderColor: foundationColors.border.protected,
      confirmColor: foundationColors.green.base,
    };
  }

  if (actionType === "move") {
    return {
      title: copy.confirmMoveTitle,
      body: copy.confirmMoveBody,
      confirmLabel: copy.rescheduleActionLabel,
      backgroundColor: colors.warningSoft,
      borderColor: foundationColors.gold.base,
      confirmColor: foundationColors.gold.deep,
    };
  }

  return {
    title: copy.confirmCancelTitle,
    body: copy.confirmCancelBody,
    confirmLabel: copy.cancelActionLabel,
    backgroundColor: colors.dangerSoft,
    borderColor: foundationColors.border.missed,
    confirmColor: foundationColors.clay.base,
  };
}

const milestoneIconStrokeProps = {
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.85,
};

const milestoneActionTokens: Record<"done" | "delete" | "move", { backgroundColor: string; borderColor: string; iconColor: string }> = {
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
  move: {
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

const styles = StyleSheet.create({
  weeklySectionHeader: {
    marginTop: -spacing.xs,
  },
  weeklySectionTitle: {
    color: foundationColors.ink.primary,
  },
  filterCarousel: {
    marginRight: -spacing.md,
  },
  filterRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  filterChip: {
    alignItems: "center",
    borderRadius: semanticRadius.chip,
    borderWidth: 1,
    minHeight: 34,
    minWidth: 58,
    flexShrink: 0,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filterChipText: {
    fontWeight: "700",
  },
  groupList: {
    gap: spacing.lg,
  },
  pathGroup: {
    gap: spacing.sm,
  },
  pathHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  pathHeaderPressed: {
    opacity: 0.72,
  },
  pathTitle: {
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  pathRule: {
    flex: 1,
    height: 1,
    opacity: 0.72,
  },
  list: {
    gap: spacing.sm,
  },
  pathSubtitleCard: {
    borderRadius: semanticRadius.row.default,
    borderWidth: 1,
    minHeight: 74,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...getBorderStyle(semanticBorder.card.subtle),
  },
  pathSubtitleText: {
    fontStyle: "italic",
  },
  rowStack: {
    gap: spacing.xs,
  },
  row: {
    alignItems: "center",
    borderRadius: semanticRadius.row.default,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 76,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    position: "relative",
    ...getBorderStyle(semanticBorder.card.subtle),
    boxShadow: semanticElevation.flat,
  },
  rowWatermarkWrap: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    position: "absolute",
    right: 26,
    top: 0,
    width: 64,
    zIndex: 0,
  },
  rowWatermarkImage: {
    height: 64,
    opacity: 0.08,
    width: 64,
  },
  rowWatermarkFallback: {
    bottom: 0,
    opacity: 0.08,
    position: "absolute",
    right: 26,
    top: 0,
    width: 64,
    zIndex: 0,
  },
  dateColumn: {
    alignItems: "center",
    gap: 2,
    justifyContent: "center",
    minWidth: 62,
    zIndex: 2,
  },
  dateText: {
    fontSize: 19,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
    lineHeight: 25,
    minHeight: 25,
  },
  dateTextDone: {
    color: foundationColors.ink.disabled,
  },
  rowDivider: {
    height: 46,
    width: 1,
    zIndex: 2,
  },
  rowCopy: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
    paddingRight: spacing.xs,
    zIndex: 2,
  },
  rowTitle: {
    color: foundationColors.ink.primary,
  },
  rowTitleDone: {
    color: foundationColors.ink.secondary,
    textDecorationLine: "line-through",
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: semanticRadius.badge,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontWeight: "700",
    textTransform: "uppercase",
  },
  chevronButton: {
    alignItems: "center",
    borderRadius: semanticRadius.button.compact,
    height: 36,
    justifyContent: "center",
    width: 36,
    zIndex: 2,
  },
  expandedPanel: {
    backgroundColor: foundationColors.bg.paper,
    borderLeftWidth: 2,
    borderRadius: semanticRadius.row.default,
    gap: spacing.xs,
    marginLeft: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...getBorderStyle(semanticBorder.card.subtle),
  },
  marksBlock: {
    gap: spacing.xs,
  },
  panelSectionLabel: {
    textTransform: "uppercase",
  },
  markList: {
    gap: spacing.xxs,
  },
  markRow: {
    alignItems: "center",
    borderRadius: semanticRadius.button.compact,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 30,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  markRowPressed: {
    backgroundColor: "rgba(64, 53, 40, 0.04)",
  },
  markDay: {
    minWidth: 34,
  },
  markDayDone: {
    color: foundationColors.ink.disabled,
  },
  markTitle: {
    color: foundationColors.ink.primary,
    flex: 1,
    minWidth: 0,
  },
  markTitleDone: {
    color: foundationColors.ink.disabled,
    textDecorationLine: "line-through",
  },
  emptyMarksText: {
    color: foundationColors.ink.secondary,
  },
  panelDivider: {
    backgroundColor: foundationColors.border.subtle,
    height: 1,
  },
  expeditionPressable: {
    alignItems: "center",
    borderRadius: semanticRadius.button.compact,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  expeditionPressed: {
    backgroundColor: "rgba(64, 53, 40, 0.04)",
  },
  expeditionCopy: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  expeditionLabel: {
    textTransform: "uppercase",
  },
  expeditionTitle: {
    color: foundationColors.ink.primary,
  },
  actionsRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  actionButton: {
    alignItems: "center",
    borderRadius: semanticRadius.badge,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xxs,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  actionPopup: {
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  actionPopupCopy: {
    gap: spacing.xxs,
  },
  actionPopupTitle: {
    color: foundationColors.ink.primary,
    fontWeight: "700",
  },
  actionPopupBody: {
    color: foundationColors.ink.secondary,
  },
  actionPopupButtons: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  actionPopupButton: {
    alignItems: "center",
    borderRadius: semanticRadius.button.compact,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  actionPopupButtonSecondary: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.subtle,
  },
  actionPopupButtonPressed: {
    opacity: 0.82,
  },
  actionPopupButtonSecondaryText: {
    color: foundationColors.ink.secondary,
    fontWeight: "700",
  },
  actionPopupButtonPrimaryText: {
    color: foundationColors.bg.paper,
    fontWeight: "700",
  },
});
