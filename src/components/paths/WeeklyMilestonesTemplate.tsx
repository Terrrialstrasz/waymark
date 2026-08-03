import { Pressable, StyleSheet, View } from "react-native";
import { useState } from "react";
import type { BottomTabId, Locale, PathId } from "../../types/ui";
import { foundationColors, getWaymarkPressStyle, radius, semanticBorder, spacing } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { DEBUG_LAYOUT, DEBUG_LAYOUT_VERSION, DebugBanner, DebugLayerBox } from "../../debug/layoutDebug";
import { BottomNavBar } from "../primitives/BottomNavBar";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { SemanticIcon } from "../primitives/SemanticIcon";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMChip } from "../primitives/WMChip";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMText } from "../primitives/Text";
import type { WeeklyMilestoneItem, WeeklyMilestonePathFilterItem, WeeklyMilestoneUrgency } from "./types";

type Props = {
  locale: Locale;
  weekStart: string;
  weekEnd: string;
  status: "loading" | "ready" | "error";
  errorMessage?: string;
  milestones: WeeklyMilestoneItem[];
  missingStartDateCount: number;
  pathFilters: WeeklyMilestonePathFilterItem[];
  selectedPathId: "all" | PathId;
  onSelectPath: (pathId: "all" | PathId) => void;
  onOpenPath?: (pathId: PathId) => void;
  showBottomNav?: boolean;
  onTabPress?: (tab: Exclude<BottomTabId, "capture">) => void;
};

export function WeeklyMilestonesTemplate({
  locale,
  weekStart,
  weekEnd,
  status,
  errorMessage,
  milestones,
  missingStartDateCount,
  pathFilters,
  selectedPathId,
  onSelectPath,
  onOpenPath,
  showBottomNav = true,
  onTabPress,
}: Props) {
  const copy = getWeeklyMilestonesCopy(locale);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const weekRangeLabel = formatWeekRangeLabel(weekStart, weekEnd, locale);

  const toggleExpanded = (milestoneId: string) => {
    setExpandedIds((current) => ({
      ...current,
      [milestoneId]: !current[milestoneId],
    }));
  };

  return (
    <FieldJournalScreenShell
      botanicalAmbient
      botanicalMotifs={["botanical.trailCurve"]}
      debugLabel="WeeklyMilestonesTemplate.FieldJournalScreenShell"
      variant="navAware"
    >
      <DebugLayerBox label="WeeklyMilestonesTemplate.Root" tone="blue">
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <WMText variant="screenTitle">{copy.title}</WMText>
            <WMText style={styles.subtitle} variant="bodySm">
              {copy.subtitle}
            </WMText>
            <WMText style={styles.weekRange} variant="body">
              {weekRangeLabel}
            </WMText>
          </View>
        </View>

        <View style={styles.filterRow}>
          {pathFilters.map((filter) => (
            <WMChip
              key={filter.id}
              label={`${filter.label}${filter.count > 0 ? ` ${filter.count}` : ""}`}
              onPress={() => onSelectPath(filter.id)}
              selected={filter.id === selectedPathId}
            />
          ))}
        </View>

        {DEBUG_LAYOUT ? (
          <DebugBanner
            label={`DEBUG WEEKLY MILESTONES TEMPLATE ACTIVE - ${DEBUG_LAYOUT_VERSION}`}
            lines={[`milestones=${milestones.length}`, `missingStartDateCount=${missingStartDateCount}`, `status=${status}`]}
          />
        ) : null}

        {missingStartDateCount > 0 ? (
          <View style={styles.auditBanner}>
            <SemanticIcon semanticName="utility.warning" size="sm" />
            <WMText style={styles.auditText} variant="bodyXs">
              {copy.missingStartDate(missingStartDateCount)}
            </WMText>
          </View>
        ) : null}

        {status === "error" ? (
          <WMEmptyState body={errorMessage ?? copy.errorBody} title={copy.errorTitle} />
        ) : status === "loading" ? (
          <WMEmptyState body={copy.loadingBody} title={copy.loadingTitle} />
        ) : milestones.length === 0 ? (
          <WMEmptyState body={copy.emptyBody} title={copy.emptyTitle} />
        ) : (
          <View style={styles.list}>
            {milestones.map((milestone) => (
              <WeeklyMilestoneCard
                key={milestone.id}
                copy={copy}
                expanded={expandedIds[milestone.id] ?? milestone.marks.length > 0}
                item={milestone}
                locale={locale}
                onOpenPath={onOpenPath}
                onToggle={() => toggleExpanded(milestone.id)}
              />
            ))}
          </View>
        )}

        {showBottomNav ? <BottomNavBar activeTab="paths" locale={locale} onTabPress={onTabPress} /> : null}
      </DebugLayerBox>
    </FieldJournalScreenShell>
  );
}

function WeeklyMilestoneCard({
  item,
  locale,
  copy,
  expanded,
  onToggle,
  onOpenPath,
}: {
  item: WeeklyMilestoneItem;
  locale: Locale;
  copy: ReturnType<typeof getWeeklyMilestonesCopy>;
  expanded: boolean;
  onToggle: () => void;
  onOpenPath?: (pathId: PathId) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpenPath?.(item.pathId)}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: item.pathAccent, shadowColor: item.pathAccentDeep },
        getWaymarkPressStyle({ pressed, reducedMotion: false, variant: "secondary" }),
      ]}
    >
      <View style={styles.cardMain}>
        <View style={[styles.iconFrame, { backgroundColor: item.pathAccentSoft, borderColor: item.pathAccent }]}>
          <WaymarkIcon semanticName={item.pathIconSemanticName} size="sm" />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.pathLine}>
            <WMText style={[styles.pathLabel, { color: item.pathAccentDeep }]} variant="label">
              {item.pathTitle.toUpperCase()}
            </WMText>
            <UrgencyPill urgency={item.urgency} copy={copy} />
          </View>

          <View style={styles.titleLine}>
            <View style={styles.dateBlock}>
              <SemanticIcon semanticName="utility.calendar" size="xs" />
              <WMText variant="bodyXs">{item.targetDateLabel}</WMText>
            </View>
            <View style={styles.titleBlock}>
              <WMText numberOfLines={2} style={styles.milestoneTitle} variant="bodyStrong">
                {item.title}
              </WMText>
              <WMText numberOfLines={2} variant="bodySm">
                {item.expeditionTitle}
              </WMText>
            </View>
          </View>

          {expanded && item.marks.length > 0 ? (
            <View style={styles.marksBox}>
              <WMText style={styles.marksTitle} variant="bodyStrong">
                {copy.marksTitle}
              </WMText>
              {item.marks.map((mark) => (
                <View key={mark.id} style={styles.markRow}>
                  <View style={[styles.markDot, mark.completed && styles.markDotDone]} />
                  <WMText style={styles.markDay} variant="bodySm">
                    {mark.weekdayLabel}
                  </WMText>
                  <WMText numberOfLines={2} style={styles.markTitle} variant="bodySm">
                    {mark.title}
                  </WMText>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Pressable accessibilityRole="button" onPress={onToggle} style={styles.chevronButton}>
          <SemanticIcon semanticName={expanded ? "utility.chevronUp" : "utility.chevronDown"} size="sm" />
        </Pressable>
      </View>
    </Pressable>
  );
}

function UrgencyPill({ urgency, copy }: { urgency: WeeklyMilestoneUrgency; copy: ReturnType<typeof getWeeklyMilestonesCopy> }) {
  return (
    <View style={[styles.urgencyPill, urgencyStyles[urgency]]}>
      <WMText style={styles.urgencyText} variant="metaCompact">
        {copy.urgency[urgency]}
      </WMText>
    </View>
  );
}

function formatWeekRangeLabel(weekStart: string, weekEnd: string, locale: Locale) {
  const formatter = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    day: "numeric",
    month: "short",
  });
  return `${formatter.format(new Date(`${weekStart}T00:00:00.000Z`))} - ${formatter.format(new Date(`${weekEnd}T00:00:00.000Z`))}`;
}

function getWeeklyMilestonesCopy(locale: Locale) {
  return {
    title: locale === "vi" ? "Weekly Milestones" : "Weekly Milestones",
    subtitle:
      locale === "vi"
        ? "Milestones chua ket thuc va da start truoc tuan nay"
        : "Unfinished milestones that started before this week",
    marksTitle: locale === "vi" ? "This week's marks" : "This week's marks",
    loadingTitle: locale === "vi" ? "Dang tai milestones" : "Loading milestones",
    loadingBody: locale === "vi" ? "Dang gom path, expedition va mark trong tuan." : "Gathering paths, expeditions, and this week's marks.",
    emptyTitle: locale === "vi" ? "Chua co milestone cua tuan" : "No weekly milestones",
    emptyBody:
      locale === "vi"
        ? "Khong co milestone open nao co start date truoc tuan nay trong filter hien tai."
        : "No open milestone has a start date before this week for the current filter.",
    errorTitle: locale === "vi" ? "Khong tai duoc Weekly Milestones" : "Weekly Milestones could not load",
    errorBody: locale === "vi" ? "Hay thu lai sau khi database san sang." : "Try again after the database is ready.",
    missingStartDate: (count: number) =>
      locale === "vi"
        ? `${count} milestone open dang thieu start date nen chua duoc hien thi.`
        : `${count} open milestone${count === 1 ? "" : "s"} are missing start dates and are not shown.`,
    urgency: {
      overdue: locale === "vi" ? "Overdue" : "Overdue",
      due_this_week: locale === "vi" ? "Due this week" : "Due this week",
      ahead: locale === "vi" ? "Ahead" : "Ahead",
      no_target: locale === "vi" ? "No target" : "No target",
    },
  };
}

const urgencyStyles = StyleSheet.create({
  overdue: {
    backgroundColor: foundationColors.missed.soft,
    borderColor: foundationColors.border.missed,
  },
  due_this_week: {
    backgroundColor: foundationColors.gold.soft,
    borderColor: foundationColors.gold.base,
  },
  ahead: {
    backgroundColor: foundationColors.green.soft,
    borderColor: foundationColors.border.active,
  },
  no_target: {
    backgroundColor: foundationColors.bg.paperSoft,
    borderColor: foundationColors.border.subtle,
  },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
  },
  weekRange: {
    color: foundationColors.ink.primary,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  auditBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: foundationColors.gold.soft,
    borderRadius: radius.sm,
    ...getBorderStyle(semanticBorder.state.weak),
  },
  auditText: {
    flex: 1,
    color: foundationColors.gold.deep,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: foundationColors.bg.paper,
    borderRadius: radius.sm,
    borderLeftWidth: 4,
    padding: spacing.md,
    ...getBorderStyle(semanticBorder.card.default),
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  iconFrame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  pathLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  pathLabel: {
    flex: 1,
    fontWeight: "700",
  },
  titleLine: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateBlock: {
    width: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
  },
  milestoneTitle: {
    color: foundationColors.ink.primary,
  },
  urgencyPill: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    flexShrink: 0,
  },
  urgencyText: {
    color: foundationColors.ink.primary,
  },
  marksBox: {
    marginTop: spacing.xs,
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: foundationColors.bg.paperWarm,
    ...getBorderStyle(semanticBorder.card.subtle),
  },
  marksTitle: {
    color: foundationColors.green.deep,
  },
  markRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  markDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: foundationColors.ink.tertiary,
  },
  markDotDone: {
    backgroundColor: foundationColors.green.base,
    borderColor: foundationColors.green.deep,
  },
  markDay: {
    width: 42,
    color: foundationColors.ink.secondary,
  },
  markTitle: {
    flex: 1,
    color: foundationColors.ink.primary,
  },
  chevronButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
