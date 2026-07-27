import { Alert, StyleSheet, View } from "react-native";
import { countCompletedTodayMarks, isSettledTodayMarkStatus } from "../../app/todayMarksSummary";
import { getCopy } from "../../i18n/copy";
import { foundationColors, spacing } from "../../theme/tokens";
import { FeatureState, Locale } from "../../types/ui";
import { isFeatureVisible } from "../../utils/featureGate";
import { MarkCard } from "../marks/MarkCard";
import { BotanicalDecorationLayer } from "../primitives/BotanicalDecorationLayer";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMText } from "../primitives/Text";
import { FieldJournalCarouselRail } from "../shared/FieldJournalCarouselRail";
import { TodayMarkItem } from "./__fixtures__/todayCarousel.fixtures";

type Props = {
  marks: TodayMarkItem[];
  locale: Locale;
  gate?: FeatureState;
  onOpenMarkDetail?: (mark: TodayMarkItem) => void;
  title?: string;
  summary?: string | null;
  emptyTitle?: string;
  emptyBody?: string;
  variant?: "default" | "closeTrailReview";
};

export function MarksToLeaveSection({
  marks,
  locale,
  gate = "enabled",
  onOpenMarkDetail,
  title,
  summary,
  emptyTitle,
  emptyBody,
  variant = "default",
}: Props) {
  if (!isFeatureVisible(gate)) {
    return null;
  }

  const sortedMarks = sortMarksForRail(marks);
  const doneCount = countCompletedTodayMarks(marks);
  const resolvedTitle = title ?? (locale === "vi" ? "Dau moc can de lai" : "Marks to Leave");
  const resolvedSummary =
    summary ??
    formatTemplate(getCopy(locale).today.marks.completedSummary, {
      done: String(doneCount),
      total: String(marks.length),
    });

  if (marks.length === 0) {
    return (
      <View style={styles.stack}>
        <SectionHeader summary={resolvedSummary} title={resolvedTitle} />
        <WMEmptyState
          body={
            emptyBody ??
            (locale === "vi"
              ? "Hom nay chua co dau moc nao can dua len rail nay."
              : "No marks are visible for this rail yet.")
          }
          title={emptyTitle ?? (locale === "vi" ? "Chua co dau moc nao" : "No marks yet")}
        />
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <SectionHeader summary={resolvedSummary} title={resolvedTitle} />
      <FieldJournalCarouselRail ariaLabel={resolvedTitle}>
        {sortedMarks.map((mark) => (
          <MarkCard
            isDetailEnabled={mark.detailEnabled}
            key={mark.id}
            locale={locale}
            mark={mark}
            variant={variant}
            onPress={
              onOpenMarkDetail ??
              ((item) => Alert.alert(locale === "vi" ? "Mark Detail" : "Mark Detail", item.title[locale]))
            }
          />
        ))}
      </FieldJournalCarouselRail>
    </View>
  );
}

function SectionHeader({ title, summary }: { title: string; summary?: string | null }) {
  return (
    <BotanicalDecorationLayer preset="sectionHeader">
      <View style={styles.headerRow}>
        <WMText variant="sectionTitle">{title}</WMText>
        {summary ? (
          <WMText style={styles.summary} variant="meta">
            {summary}
          </WMText>
        ) : null}
      </View>
    </BotanicalDecorationLayer>
  );
}

function sortMarksForRail(marks: TodayMarkItem[]) {
  const activeMarks = marks.filter((mark) => !isSettledTodayMarkStatus(mark.status));
  const settledMarks = marks.filter((mark) => isSettledTodayMarkStatus(mark.status));
  return [...activeMarks, ...settledMarks];
}

function formatTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/gu, (_, key: string) => values[key] ?? "");
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  summary: {
    color: foundationColors.ink.secondary,
  },
});
