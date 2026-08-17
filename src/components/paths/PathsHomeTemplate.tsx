import { StyleSheet, View } from "react-native";
import { todayPathHeroPaths } from "../../lib/waymark/todayPathHero";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import type { Locale, PathId } from "../../types/ui";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WMButton } from "../primitives/WMButton";
import { WMText } from "../primitives/Text";
import type { TodayMarkItem } from "../today/__fixtures__/todayCarousel.fixtures";
import { WeekNavigator } from "../weekly-coding/WeekNavigator";
import { DayOfWeekNavigator, type DayOfWeekNavigatorItem } from "../weekly-timetable/DayOfWeekNavigator";
import type {
  WeeklyTimetableReviewDay,
  WeeklyTimetableVerificationSummary,
} from "../weekly-timetable/WeeklyTimetableReviewTemplate";
import { WeeklyDayPlanList } from "../weekly-timetable/WeeklyDayPlanList";
import { PathHeroStrip } from "./PathHeroStrip";
import { WeeklyMilestoneCollection } from "./WeeklyMilestonesTemplate";
import type { WeeklyMilestoneItem, WeeklyMilestoneMarkItem } from "./types";

type Props = {
  locale: Locale;
  selectedWeekLabel: string;
  selectedWeekDateRange: string;
  previousWeekDisabled?: boolean;
  nextWeekDisabled?: boolean;
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  milestoneStatus: "loading" | "ready" | "error";
  milestoneErrorMessage?: string;
  milestones: WeeklyMilestoneItem[];
  onCompleteMilestone?: (milestoneId: string) => void;
  onMoveMilestone?: (milestoneId: string) => void;
  onOpenMark?: (milestone: WeeklyMilestoneItem, mark: WeeklyMilestoneMarkItem) => void;
  onOpenPath?: (pathId: PathId) => void;
  onOpenExpedition?: (expeditionId: string) => void;
  onSkipMilestone?: (milestoneId: string) => void;
  timetableStatus: "loading" | "ready" | "error";
  timetableErrorMessage?: string;
  days: WeeklyTimetableReviewDay[];
  summary: WeeklyTimetableVerificationSummary | null;
  dayNavigatorDays: DayOfWeekNavigatorItem[];
  selectedDayDate: string | null;
  selectedDayLabel: string;
  selectedDayMarks: TodayMarkItem[];
  selectedDayStatus: "loading" | "ready" | "error";
  selectedDayErrorMessage?: string;
  selectedDayIsHistorical?: boolean;
  onSelectDayDate?: (localDate: string) => void;
  onOpenDayMark?: (mark: TodayMarkItem) => void;
  onOpenPlanItem?: (itemId: string) => void;
  tursoConfigured: boolean;
  tursoMessage?: string | null;
  tursoPulling?: boolean;
  tursoPushing?: boolean;
  tursoDisabled?: boolean;
  onConnectTurso?: () => void;
  onPullTurso?: () => void;
  onPushTurso?: () => void;
};

export function PathsHomeTemplate({
  locale,
  selectedWeekLabel,
  selectedWeekDateRange,
  previousWeekDisabled = false,
  nextWeekDisabled = false,
  onPreviousWeek,
  onNextWeek,
  milestoneStatus,
  milestoneErrorMessage,
  milestones,
  onCompleteMilestone,
  onMoveMilestone,
  onOpenMark,
  onOpenPath,
  onOpenExpedition,
  onSkipMilestone,
  timetableStatus,
  timetableErrorMessage,
  days,
  summary,
  dayNavigatorDays,
  selectedDayDate,
  selectedDayLabel,
  selectedDayMarks,
  selectedDayStatus,
  selectedDayErrorMessage,
  selectedDayIsHistorical = false,
  onSelectDayDate,
  onOpenDayMark,
  onOpenPlanItem,
  tursoConfigured,
  tursoMessage,
  tursoPulling = false,
  tursoPushing = false,
  tursoDisabled = false,
  onConnectTurso,
  onPullTurso,
  onPushTurso,
}: Props) {
  const copy = getCopy(locale);
  const dayStatus = timetableStatus === "ready" ? selectedDayStatus : timetableStatus;
  const dayError = timetableStatus === "error" ? timetableErrorMessage : selectedDayErrorMessage;

  return (
    <FieldJournalScreenShell botanicalAmbient botanicalMotifs={["botanical.trailCurve"]} variant="navAware">
      <PageHeader
        decorativeAccent
        decorativeMotifs={["botanical.trailCurve"]}
        logoSize="lg"
        logoVariant="primary"
        title="Paths"
        variant="standard"
      />

      <PathHeroStrip locale={locale} onOpenPath={onOpenPath} paths={todayPathHeroPaths} />

      <View style={styles.timetableStack}>
        <View style={styles.timetableHeader}>
          <View style={styles.timetableTitleStack}>
            <WMText style={styles.timetableTitle} variant="sectionTitle">
              Weekly Timetable
            </WMText>
            <WMText style={styles.timetableSubtitle} variant="meta">
              {selectedWeekDateRange}
            </WMText>
          </View>
          <TursoPlanningActions
            configured={tursoConfigured}
            disabled={tursoDisabled}
            locale={locale}
            onConnect={onConnectTurso}
            onPull={onPullTurso}
            onPush={onPushTurso}
            pulling={tursoPulling}
            pushing={tursoPushing}
          />
        </View>

        {tursoMessage ? (
          <WMText style={styles.syncMessage} variant="metaCompact">
            {tursoMessage}
          </WMText>
        ) : null}

        <WeekNavigator
          dateRangeLabel={selectedWeekDateRange}
          locale={locale}
          nextDisabled={nextWeekDisabled}
          onNext={onNextWeek}
          onPrevious={onPreviousWeek}
          previousDisabled={previousWeekDisabled}
          weekLabel={selectedWeekLabel}
        />

        <PlanningSummary locale={locale} summary={summary} />

        <View style={styles.sectionStack}>
          <View style={styles.sectionHeader}>
            <WMText style={styles.sectionTitle} variant="sectionTitle">
              Weekly Milestones
            </WMText>
            <WMText style={styles.sectionSubtitle} variant="meta">
              {copy.milestonesSubtitle}
            </WMText>
          </View>
          <WeeklyMilestoneCollection
            errorMessage={milestoneErrorMessage}
            locale={locale}
            milestones={milestones}
            onCompleteMilestone={onCompleteMilestone}
            onMoveMilestone={onMoveMilestone}
            onOpenExpedition={onOpenExpedition}
            onOpenMark={onOpenMark}
            onOpenPath={onOpenPath}
            onSkipMilestone={onSkipMilestone}
            status={milestoneStatus}
          />
        </View>

        <View style={styles.sectionStack}>
          <DayOfWeekNavigator
            days={dayNavigatorDays}
            locale={locale}
            onSelectDate={(localDate) => onSelectDayDate?.(localDate)}
            selectedDate={selectedDayDate}
          />
          <WeeklyDayPlanList
            days={days}
            errorMessage={dayError}
            isHistorical={selectedDayIsHistorical}
            locale={locale}
            marks={selectedDayMarks}
            onOpenMark={onOpenDayMark}
            onOpenPlanItem={onOpenPlanItem}
            selectedDate={selectedDayDate}
            selectedDateLabel={selectedDayLabel}
            status={dayStatus}
          />
        </View>
      </View>
    </FieldJournalScreenShell>
  );
}

function TursoPlanningActions({
  locale,
  configured,
  pulling,
  pushing,
  disabled,
  onConnect,
  onPull,
  onPush,
}: {
  locale: Locale;
  configured: boolean;
  pulling: boolean;
  pushing: boolean;
  disabled: boolean;
  onConnect?: () => void;
  onPull?: () => void;
  onPush?: () => void;
}) {
  if (!configured) {
    return (
      <WMButton
        disabled={disabled}
        label={locale === "vi" ? "Kết nối Turso" : "Connect Turso"}
        onPress={onConnect}
        variant="secondary"
      />
    );
  }

  const busy = pulling || pushing;
  return (
    <View style={styles.syncActions}>
      <WMButton disabled={disabled || busy} label="Pull" loading={pulling} onPress={onPull} variant="secondary" />
      <WMButton disabled={disabled || busy} label="Push" loading={pushing} onPress={onPush} variant="secondary" />
    </View>
  );
}

function PlanningSummary({ locale, summary }: { locale: Locale; summary: WeeklyTimetableVerificationSummary | null }) {
  if (!summary) {
    return null;
  }
  const copy = getCopy(locale);
  return (
    <View style={styles.summaryCard}>
      <SummaryValue label={copy.planItems} value={summary.weekPlanItemCount} />
      <SummaryValue label={copy.marks} value={summary.materializedMarkCount} />
      <SummaryValue isWarning={summary.missingCreatedMarkInstanceCount > 0} label={copy.missing} value={summary.missingCreatedMarkInstanceCount} />
    </View>
  );
}

function SummaryValue({ label, value, isWarning = false }: { label: string; value: number; isWarning?: boolean }) {
  return (
    <View style={styles.summaryItem}>
      <WMText style={isWarning ? styles.summaryWarning : styles.summaryValue} variant="sectionTitle">
        {value}
      </WMText>
      <WMText style={styles.summaryLabel} variant="metaCompact">
        {label}
      </WMText>
    </View>
  );
}

function getCopy(locale: Locale) {
  return {
    milestonesSubtitle: locale === "vi" ? "Các cột mốc và Planned Marks trong tuần." : "Milestones and their planned marks for the week.",
    planItems: locale === "vi" ? "Plan item" : "Plan items",
    marks: locale === "vi" ? "Mark" : "Marks",
    missing: locale === "vi" ? "Thiếu Mark" : "Missing Marks",
  };
}

const styles = StyleSheet.create({
  timetableStack: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  timetableHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  timetableTitleStack: {
    flex: 1,
    gap: spacing.xxs,
  },
  timetableTitle: {
    color: foundationColors.ink.primary,
  },
  timetableSubtitle: {
    color: foundationColors.ink.secondary,
  },
  syncActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  syncMessage: {
    color: foundationColors.ink.secondary,
  },
  summaryCard: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  summaryItem: {
    flex: 1,
    gap: spacing.xxs,
  },
  summaryValue: {
    color: foundationColors.green.deep,
  },
  summaryWarning: {
    color: foundationColors.gold.deep,
  },
  summaryLabel: {
    color: foundationColors.ink.secondary,
  },
  sectionStack: {
    gap: spacing.md,
  },
  sectionHeader: {
    gap: spacing.xxs,
  },
  sectionTitle: {
    color: foundationColors.ink.primary,
  },
  sectionSubtitle: {
    color: foundationColors.ink.secondary,
  },
});
