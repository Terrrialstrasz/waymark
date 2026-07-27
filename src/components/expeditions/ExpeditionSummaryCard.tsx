import { StyleSheet, View } from "react-native";
import { ExpeditionDetailItem } from "./types";
import { JournalCard } from "../primitives/JournalCard";
import { IconBadge } from "../primitives/IconBadge";
import { WMText } from "../primitives/Text";
import { foundationColors, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { ExpeditionProgressBlock } from "./ExpeditionProgressBlock";
import { formatExpeditionDateRangeLong } from "./detailModel";
import { getCopy } from "../../i18n/copy";

type Props = {
  expedition: ExpeditionDetailItem;
  locale: Locale;
};

export function ExpeditionSummaryCard({ expedition, locale }: Props) {
  const copy = getCopy(locale).expeditionDetail;
  const summaryTitle = expedition.summaryTitle ?? copy.summaryTitle;
  const dateRange = formatExpeditionDateRangeLong(expedition.startDate, expedition.endDate, locale);
  const percentFormatter = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US");

  return (
    <JournalCard decorative decorationPreset="entityCard" style={styles.card} variant="hero">
      <View style={styles.headerRow}>
        <IconBadge semanticName="entity.expedition" shape="circle" size="md" tone="green" />
        <WMText style={styles.title} variant="pageTitle">
          {summaryTitle}
        </WMText>
      </View>

      <WMText style={styles.summary} variant="bodyLg">
        {expedition.summaryText}
      </WMText>

      {dateRange ? (
        <WMText style={styles.dateRange} variant="bodyStrong">
          {dateRange}
        </WMText>
      ) : null}

      <ExpeditionProgressBlock accentColor={expedition.pathAccent ?? expedition.pathColor} locale={locale} percentComplete={expedition.percentComplete} />

      <View style={styles.statsRow}>
        <SummaryStat label={copy.labels.marks} value={`${expedition.completedMarks} / ${expedition.totalMarks}`} />
        <View style={styles.divider} />
        <SummaryStat label={copy.labels.milestones} value={`${expedition.completedMilestones} / ${expedition.totalMilestones}`} />
        <View style={styles.divider} />
        <SummaryStat label={copy.labels.complete} value={`${percentFormatter.format(Math.round(expedition.percentComplete))}%`} />
      </View>
    </JournalCard>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <WMText style={styles.statValue} variant="cardTitle">
        {value}
      </WMText>
      <WMText style={styles.statLabel} variant="meta">
        {label}
      </WMText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: foundationColors.border.soft,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  summary: {
    color: foundationColors.ink.primary,
  },
  dateRange: {
    color: foundationColors.archive.blue,
  },
  statsRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.sm,
  },
  divider: {
    alignSelf: "stretch",
    borderRightWidth: 1,
    borderRightColor: foundationColors.border.subtle,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statValue: {
    color: foundationColors.green.deep,
    fontVariant: ["tabular-nums"],
    fontSize: 18,
    lineHeight: 24,
  },
  statLabel: {
    color: foundationColors.ink.secondary,
  },
});
