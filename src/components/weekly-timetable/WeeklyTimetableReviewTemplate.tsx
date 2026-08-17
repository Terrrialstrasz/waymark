import { View, StyleSheet } from "react-native";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WMButton } from "../primitives/WMButton";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMText } from "../primitives/Text";
import { WeekNavigator } from "../weekly-coding/WeekNavigator";
import type { Locale } from "../../types/ui";
import { WeeklyMilestoneCollection } from "../paths/WeeklyMilestonesTemplate";
import type { WeeklyMilestoneItem, WeeklyMilestoneMarkItem } from "../paths/types";
import type { TodayMarkItem } from "../today/__fixtures__/todayCarousel.fixtures";
import { foundationColors, spacing } from "../../theme/tokens";
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
  timetableStatus?: "loading" | "ready" | "error";
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
  dayReviewIsHistorical?: boolean;
  onSelectDayDate?: (localDate: string) => void;
  onOpenDayReviewMark?: (mark: TodayMarkItem) => void;
};

export function WeeklyTimetableReviewTemplate({
  locale = "en",
  selectedWeekLabel,
  selectedWeekDateRange,
  status,
  timetableStatus = status,
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
  days = [],
  summary = null,
  weekStartDate,
  weekEndDate,
  weekStatus,
  onOpenItem,
  dayNavigatorDays = [],
  selectedDayDate = null,
  selectedDayLabel,
  dayReviewStatus = "ready",
  dayReviewErrorMessage,
  dayReviewMarks = [],
  dayReviewHasWeeklyTimetableForDate = true,
  dayReviewPlannedItemCount = 0,
  dayReviewIsHistorical = false,
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

      <WeeklyTimetablePlanSection
        days={days}
        locale={locale}
        onOpenItem={onOpenItem}
        status={timetableStatus}
        summary={summary}
        weekEndDate={weekEndDate}
        weekStartDate={weekStartDate}
        weekStatus={weekStatus}
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
          isHistorical={dayReviewIsHistorical}
          localDate={selectedDayDate}
          locale={locale}
          marks={dayReviewMarks}
          onOpenMarkDetail={onOpenDayReviewMark}
          plannedItemCount={dayReviewPlannedItemCount}
          status={dayReviewStatus}
        />
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
    </FieldJournalScreenShell>
  );
}

function WeeklyTimetablePlanSection({
  locale,
  days,
  summary,
  status,
  weekStartDate,
  weekEndDate,
  weekStatus,
  onOpenItem,
}: {
  locale: Locale;
  days: WeeklyTimetableReviewDay[];
  summary: WeeklyTimetableVerificationSummary | null;
  status: Props["status"];
  weekStartDate?: string;
  weekEndDate?: string;
  weekStatus?: string;
  onOpenItem?: (itemId: string) => void;
}) {
  const copy = getTimetableCopy(locale);

  return (
    <View style={styles.timetableSection}>
      <View style={styles.sectionHeader}>
        <WMText style={styles.sectionTitle} variant="sectionTitle">
          {copy.timetableTitle}
        </WMText>
        <WMText style={styles.sectionSubtitle} variant="meta">
          {copy.timetableSubtitle}
        </WMText>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <SummaryMetric label={copy.planItems} value={summary?.weekPlanItemCount ?? 0} />
          <SummaryMetric label={copy.materializedMarks} value={summary?.materializedMarkCount ?? 0} />
          <SummaryMetric
            isWarning={Boolean(summary?.missingCreatedMarkInstanceCount)}
            label={copy.missingMarks}
            value={summary?.missingCreatedMarkInstanceCount ?? 0}
          />
        </View>
        <WMText style={styles.summaryMeta} variant="metaCompact">
          {[weekStartDate && weekEndDate ? `${weekStartDate} - ${weekEndDate}` : null, weekStatus ? `${copy.status}: ${weekStatus}` : null]
            .filter(Boolean)
            .join(" · ")}
        </WMText>
      </View>

      {status === "loading" ? (
        <WMEmptyState body={copy.loadingBody} title={copy.loadingTitle} />
      ) : status === "error" ? (
        <WMEmptyState body={copy.errorBody} title={copy.errorTitle} />
      ) : days.length === 0 ? (
        <WMEmptyState body={copy.emptyBody} title={copy.emptyTitle} />
      ) : (
        <View style={styles.dayStack}>
          {days.map((day) => (
            <View key={day.id} style={styles.dayCard}>
              <View style={styles.dayHeaderRow}>
                <WMText style={styles.dayTitle} variant="sectionTitle">
                  {day.label}
                </WMText>
                <WMText style={styles.dayCount} variant="metaCompact">
                  {`${day.items.length} ${copy.items}`}
                </WMText>
              </View>

              {day.items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemMainRow}>
                    <WMText style={styles.itemTime} variant="meta">
                      {item.timeLabel}
                    </WMText>
                    <View style={styles.itemBody}>
                      <WMText style={styles.itemTitle} variant="body">
                        {item.title}
                      </WMText>
                      <WMText style={styles.itemMeta} variant="metaCompact">
                        {[item.pathLabel, item.expeditionLabel, item.milestoneLabel].filter(Boolean).join(" · ")}
                      </WMText>
                      <WMText style={item.issue ? styles.itemIssue : styles.itemStatus} variant="metaCompact">
                        {item.issue ?? `${copy.markStatus}: ${formatStatus(item.createdMarkStatus, copy.notMaterialized)}`}
                      </WMText>
                    </View>
                  </View>
                  {item.createdMarkInstanceId && onOpenItem ? (
                    <WMButton label={copy.openMark} onPress={() => onOpenItem(item.id)} variant="ghost" />
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SummaryMetric({ label, value, isWarning = false }: { label: string; value: number; isWarning?: boolean }) {
  return (
    <View style={styles.summaryMetric}>
      <WMText style={isWarning ? styles.summaryValueWarning : styles.summaryValue} variant="sectionTitle">
        {value}
      </WMText>
      <WMText style={styles.summaryLabel} variant="metaCompact">
        {label}
      </WMText>
    </View>
  );
}

function formatStatus(status: string | undefined, fallback: string) {
  if (!status) {
    return fallback;
  }
  return status.replaceAll("_", " ");
}

function getTimetableCopy(locale: Locale) {
  return {
    timetableTitle: locale === "vi" ? "Timetable đã đồng bộ" : "Synced timetable",
    timetableSubtitle:
      locale === "vi"
        ? "Toàn bộ item trong tuần, kể cả item không gắn milestone."
        : "Every item in the week, including items without a milestone.",
    planItems: locale === "vi" ? "Plan item" : "Plan items",
    materializedMarks: locale === "vi" ? "Mark đã tạo" : "Materialized marks",
    missingMarks: locale === "vi" ? "Thiếu mark" : "Missing marks",
    status: locale === "vi" ? "Trạng thái" : "Status",
    items: locale === "vi" ? "item" : "items",
    markStatus: locale === "vi" ? "Mark" : "Mark",
    notMaterialized: locale === "vi" ? "chưa materialize" : "not materialized",
    openMark: locale === "vi" ? "Mở mark" : "Open mark",
    loadingTitle: locale === "vi" ? "Đang tải timetable" : "Loading timetable",
    loadingBody: locale === "vi" ? "Đang đọc dữ liệu kế hoạch local." : "Reading the local planning data.",
    errorTitle: locale === "vi" ? "Không tải được timetable" : "Timetable unavailable",
    errorBody: locale === "vi" ? "Không thể đọc dữ liệu kế hoạch của tuần này." : "The plan for this week could not be read.",
    emptyTitle: locale === "vi" ? "Tuần chưa có timetable" : "No timetable this week",
    emptyBody: locale === "vi" ? "Không có plan item active trong tuần đã chọn." : "There are no active plan items in the selected week.",
  };
}

const styles = StyleSheet.create({
  dayReviewSection: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  timetableSection: {
    gap: spacing.md,
    paddingTop: spacing.lg,
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
  summaryCard: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  summaryMetric: {
    flex: 1,
    gap: spacing.xxs,
  },
  summaryValue: {
    color: foundationColors.green.deep,
  },
  summaryValueWarning: {
    color: foundationColors.gold.deep,
  },
  summaryLabel: {
    color: foundationColors.ink.secondary,
  },
  summaryMeta: {
    color: foundationColors.ink.tertiary,
  },
  dayStack: {
    gap: spacing.md,
  },
  dayCard: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  dayHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayTitle: {
    color: foundationColors.ink.primary,
    flex: 1,
  },
  dayCount: {
    color: foundationColors.ink.tertiary,
  },
  itemCard: {
    borderTopColor: foundationColors.border.subtle,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  itemMainRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  itemTime: {
    color: foundationColors.green.deep,
    minWidth: 82,
  },
  itemBody: {
    flex: 1,
    gap: spacing.xxs,
  },
  itemTitle: {
    color: foundationColors.ink.primary,
  },
  itemMeta: {
    color: foundationColors.ink.secondary,
  },
  itemStatus: {
    color: foundationColors.green.deep,
    textTransform: "capitalize",
  },
  itemIssue: {
    color: foundationColors.gold.deep,
  },
});
