import { View, StyleSheet } from "react-native";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WeekNavigator } from "../weekly-coding/WeekNavigator";
import type { Locale } from "../../types/ui";
import { WeeklyMilestoneCollection } from "../paths/WeeklyMilestonesTemplate";
import type { WeeklyMilestoneItem, WeeklyMilestoneMarkItem } from "../paths/types";
import type { TodayMarkItem } from "../today/__fixtures__/todayCarousel.fixtures";
import { spacing } from "../../theme/tokens";
import { DayOfWeekNavigator, type DayOfWeekNavigatorItem } from "./DayOfWeekNavigator";
import { DayReviewCockpit } from "./DayReviewCockpit";

export type WeeklyTimetableReviewDay = {
  id: string;
  localDate: string | null;
  label: string;
  items: Array<{
    id: string;
    timeLabel: string;
    title: string;
    pathLabel: string;
    expeditionLabel?: string;
    milestoneLabel?: string;
    createdMarkInstanceId?: string;
    createdMarkStatus?: string;
    issue?: string;
  }>;
};

export type WeeklyTimetableVerificationSummary = {
  weekPlanItemCount: number;
  materializedMarkCount: number;
  missingCreatedMarkInstanceCount: number;
  duplicateMarkCount: number;
  lastImportedAt?: string;
};

type Props = {
  locale?: Locale;
  selectedWeekLabel: string;
  selectedWeekDateRange: string;
  status: "loading" | "ready" | "error";
  errorMessage?: string;
  milestones: WeeklyMilestoneItem[];
  previousWeekDisabled?: boolean;
  nextWeekDisabled?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  onCompleteMilestone?: (milestoneId: string) => void;
  onMoveMilestone?: (milestoneId: string) => void;
  onOpenMark?: (milestone: WeeklyMilestoneItem, mark: WeeklyMilestoneMarkItem) => void;
  onOpenPath?: (pathId: WeeklyMilestoneItem["pathId"]) => void;
  onOpenExpedition?: (expeditionId: string) => void;
  onSkipMilestone?: (milestoneId: string) => void;
  days?: WeeklyTimetableReviewDay[];
  summary?: WeeklyTimetableVerificationSummary | null;
  weekStartDate?: string;
  weekEndDate?: string;
  weekStatus?: string;
  onOpenItem?: (itemId: string) => void;
  dayNavigatorDays?: DayOfWeekNavigatorItem[];
  selectedDayDate?: string | null;
  selectedDayLabel?: string;
  dayReviewStatus?: "loading" | "ready" | "error";
  dayReviewErrorMessage?: string;
  dayReviewMarks?: TodayMarkItem[];
  dayReviewHasWeeklyTimetableForDate?: boolean;
  dayReviewPlannedItemCount?: number;
  onSelectDayDate?: (localDate: string) => void;
  onOpenDayReviewMark?: (mark: TodayMarkItem) => void;
};

export function WeeklyTimetableReviewTemplate({
  locale = "en",
  selectedWeekLabel,
  selectedWeekDateRange,
  status,
  errorMessage,
  milestones,
  previousWeekDisabled = false,
  nextWeekDisabled = false,
  showBack = false,
  onBack,
  onPreviousWeek,
  onNextWeek,
  onCompleteMilestone,
  onMoveMilestone,
  onOpenMark,
  onOpenPath,
  onOpenExpedition,
  onSkipMilestone,
  dayNavigatorDays = [],
  selectedDayDate = null,
  selectedDayLabel,
  dayReviewStatus = "ready",
  dayReviewErrorMessage,
  dayReviewMarks = [],
  dayReviewHasWeeklyTimetableForDate = true,
  dayReviewPlannedItemCount = 0,
  onSelectDayDate,
  onOpenDayReviewMark,
}: Props) {
  return (
    <FieldJournalScreenShell botanicalAmbient botanicalMotifs={["botanical.trailCurve"]} variant="navAware">
      <PageHeader
        decorativeAccent
        decorativeMotifs={["botanical.trailCurve"]}
        onBack={onBack}
        showBack={showBack}
        title={locale === "vi" ? "Weekly Timetable" : "Weekly Timetable"}
        variant={showBack ? "withBack" : "standard"}
      />

      <WeekNavigator
        dateRangeLabel={selectedWeekDateRange}
        locale={locale}
        nextDisabled={nextWeekDisabled}
        onNext={onNextWeek}
        onPrevious={onPreviousWeek}
        previousDisabled={previousWeekDisabled}
        weekLabel={selectedWeekLabel}
      />

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

      <View style={styles.dayReviewSection}>
        <DayOfWeekNavigator
          days={dayNavigatorDays}
          locale={locale}
          onSelectDate={(localDate) => onSelectDayDate?.(localDate)}
          selectedDate={selectedDayDate}
        />

        <DayReviewCockpit
          dateLabel={selectedDayLabel ?? selectedDayDate ?? ""}
          errorMessage={dayReviewErrorMessage}
          hasWeeklyTimetableForDate={dayReviewHasWeeklyTimetableForDate}
          localDate={selectedDayDate}
          locale={locale}
          marks={dayReviewMarks}
          onOpenMarkDetail={onOpenDayReviewMark}
          plannedItemCount={dayReviewPlannedItemCount}
          status={dayReviewStatus}
        />
      </View>
    </FieldJournalScreenShell>
  );
}

const styles = StyleSheet.create({
  dayReviewSection: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
});
