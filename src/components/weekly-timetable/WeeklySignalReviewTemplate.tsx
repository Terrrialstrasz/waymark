import { StyleSheet, View } from "react-native";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WMButton } from "../primitives/WMButton";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMText } from "../primitives/Text";
import { WeekNavigator } from "../weekly-coding/WeekNavigator";
import type { Locale } from "../../types/ui";
import { foundationColors, spacing } from "../../theme/tokens";

export type WeeklySignalReviewDay = {
  id: string;
  localDate: string;
  label: string;
  items: Array<{
    id: string;
    timeLabel: string;
    title: string;
    statusLabel: string;
    targetTypeLabel: string;
    targetTitle: string;
    snoozedUntilLabel?: string;
  }>;
};

export type WeeklySignalSummary = {
  activeSignalCount: number;
  scheduledCount: number;
  ringingCount: number;
  snoozedCount: number;
  weekStartDate: string;
  weekEndDate: string;
};

type Props = {
  locale?: Locale;
  selectedWeekLabel: string;
  selectedWeekDateRange: string;
  days: WeeklySignalReviewDay[];
  summary: WeeklySignalSummary | null;
  previousWeekDisabled?: boolean;
  nextWeekDisabled?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  onOpenSignal?: (signalId: string) => void;
};

export function WeeklySignalReviewTemplate({
  locale = "en",
  selectedWeekLabel,
  selectedWeekDateRange,
  days,
  summary,
  previousWeekDisabled = false,
  nextWeekDisabled = false,
  showBack = false,
  onBack,
  onPreviousWeek,
  onNextWeek,
  onOpenSignal,
}: Props) {
  const subtitle =
    locale === "vi"
      ? "Xem cac signal active trong tuan, gom theo ngay va gio."
      : "Review active signals for the week, grouped by day and time.";

  return (
    <FieldJournalScreenShell botanicalAmbient variant="navAware">
      <PageHeader
        decorativeAccent
        onBack={onBack}
        showBack={showBack}
        subtitle={subtitle}
        title={locale === "vi" ? "Weekly Signal" : "Weekly Signal"}
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

      <View style={styles.summaryCard}>
        <WMText variant="sectionTitle">{locale === "vi" ? "Active signals" : "Active signals"}</WMText>
        <WMText variant="body">{`${locale === "vi" ? "Week" : "Week"}: ${summary?.weekStartDate ?? "-"} -> ${summary?.weekEndDate ?? "-"}`}</WMText>
        <WMText variant="body">{`${locale === "vi" ? "Total" : "Total"}: ${summary?.activeSignalCount ?? 0}`}</WMText>
        <WMText variant="body">{`${locale === "vi" ? "Scheduled" : "Scheduled"}: ${summary?.scheduledCount ?? 0}`}</WMText>
        <WMText variant="body">{`${locale === "vi" ? "Ringing" : "Ringing"}: ${summary?.ringingCount ?? 0}`}</WMText>
        <WMText variant="body">{`${locale === "vi" ? "Snoozed" : "Snoozed"}: ${summary?.snoozedCount ?? 0}`}</WMText>
      </View>

      {days.length === 0 ? (
        <WMEmptyState
          body={locale === "vi" ? "Khong co signal active nao trong tuan nay." : "No active signals are scheduled for this week."}
          title={locale === "vi" ? "Weekly Signal trong" : "Weekly Signal empty"}
        />
      ) : (
        <View style={styles.dayStack}>
          {days.map((day) => (
            <View key={day.id} style={styles.dayCard}>
              <WMText variant="sectionTitle">{day.label}</WMText>
              {day.items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <WMText variant="body">{`${item.timeLabel}  ${item.title}`}</WMText>
                  <WMText style={styles.itemMeta} variant="meta">{`${item.targetTypeLabel}: ${item.targetTitle}`}</WMText>
                  <WMText style={styles.itemMeta} variant="meta">
                    {item.snoozedUntilLabel
                      ? `${item.statusLabel} -> ${item.snoozedUntilLabel}`
                      : item.statusLabel}
                  </WMText>
                  {onOpenSignal ? (
                    <WMButton
                      label={locale === "vi" ? "Open signal" : "Open signal"}
                      onPress={() => onOpenSignal(item.id)}
                      variant="ghost"
                    />
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </FieldJournalScreenShell>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  dayStack: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  dayCard: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  itemCard: {
    borderTopColor: foundationColors.border.soft,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  itemMeta: {
    color: foundationColors.ink.secondary,
  },
});
