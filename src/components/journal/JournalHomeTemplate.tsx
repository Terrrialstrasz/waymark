import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { getCopy } from "../../i18n/copy";
import { Locale } from "../../types/ui";
import { foundationColors, spacing } from "../../theme/tokens";
import { JournalLatestHero } from "./JournalLatestHero";
import { MemoryLookBackCard } from "./MemoryLookBackCard";
import { RecentCollectionRow } from "./RecentCollectionRow";
import { UpcomingMemoryCard } from "./UpcomingMemoryCard";
import { FieldJournalCarouselRail } from "../shared/FieldJournalCarouselRail";
import { DateSelectorChip } from "./DateSelectorChip";

type Props = {
  locale?: Locale;
  dateLabel: string;
  dateOptions?: Array<{ id: string; label: string }>;
  latestHero: Parameters<typeof JournalLatestHero>[0];
  recentRows: Array<Parameters<typeof RecentCollectionRow>[0] & { id: string }>;
  lookBackCards: Array<Parameters<typeof MemoryLookBackCard>[0] & { id: string }>;
  upcomingCards: Array<Parameters<typeof UpcomingMemoryCard>[0] & { id: string }>;
  datePickerReady?: boolean;
  selectedDateId?: string;
  onSelectDate?: (dayKey: string) => void;
  onOpenRecentCollection?: (rowId: string) => void;
};

export function JournalHomeTemplate({
  locale = "en",
  dateLabel,
  dateOptions,
  latestHero,
  recentRows,
  lookBackCards,
  upcomingCards,
  datePickerReady = false,
  selectedDateId,
  onSelectDate,
  onOpenRecentCollection,
}: Props) {
  const c = getCopy(locale);
  const [showAllRecentRows, setShowAllRecentRows] = useState(false);
  const visibleRecentRows = showAllRecentRows ? recentRows : recentRows.slice(0, 7);
  const canPickDate = Boolean(dateOptions?.length && onSelectDate);

  return (
    <FieldJournalScreenShell botanicalAmbient botanicalMotifs={["botanical.photoOverlay"]} variant="navAware">
      <PageHeader
        actions={
          canPickDate ? (
            <DateSelectorChip
              active
              label={dateLabel}
              loading={!datePickerReady}
              locale={locale}
              onSelect={onSelectDate}
              options={dateOptions}
              selectedId={selectedDateId}
              sheetTitle={locale === "vi" ? "Chon ngay Journal" : "Choose journal day"}
              triggerVariant="icon"
            />
          ) : undefined
        }
        decorativeAccent
        decorativeMotifs={["botanical.photoOverlay"]}
        logoSize="lg"
        logoVariant="primary"
        subtitle={dateLabel}
        title={c.journal.title}
      />
      <JournalLatestHero locale={locale} ownerId="journal-latest-hero" {...latestHero} />

      <SectionActionHeader
        actionable={!showAllRecentRows && recentRows.length > 7}
        actionLabel={c.journal.viewAll}
        onPress={() => setShowAllRecentRows(true)}
        title={c.journal.recentCollections}
      />
      <View style={styles.stack}>
        {visibleRecentRows.map((row, index) => (
          <RecentCollectionRow
            key={row.id}
            ownerId={row.id}
            onPress={onOpenRecentCollection ? () => onOpenRecentCollection(row.id) : row.onPress}
            visualIndex={index}
            {...row}
          />
        ))}
      </View>

      <SectionLabel title={c.journal.lookBack} />
      <FieldJournalCarouselRail ariaLabel={locale === "vi" ? "Look back carousel" : "Look back carousel"}>
        {lookBackCards.map((card) => (
          <MemoryLookBackCard key={card.id} locale={locale} {...card} />
        ))}
      </FieldJournalCarouselRail>

      <SectionLabel title={c.journal.lookForward} />
      <FieldJournalCarouselRail ariaLabel={locale === "vi" ? "Look forward carousel" : "Look forward carousel"}>
        {upcomingCards.map((card) => (
          <UpcomingMemoryCard key={card.id} locale={locale} {...card} />
        ))}
      </FieldJournalCarouselRail>
    </FieldJournalScreenShell>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <View style={styles.sectionRow}>
      <WMText variant="sectionTitle">{title}</WMText>
    </View>
  );
}

function SectionActionHeader({
  title,
  actionLabel,
  actionable,
  onPress,
}: {
  title: string;
  actionLabel: string;
  actionable: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.sectionActionRow}>
      <WMText variant="sectionTitle">{title}</WMText>
      {actionable ? (
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.sectionActionButton}>
          <WMText style={styles.sectionActionText} variant="bodySm">
            {actionLabel}
          </WMText>
          <View pointerEvents="none" style={styles.sectionActionChevron}>
            <WaymarkIcon decorative semanticName="utility.chevron" size="xs" state="muted" />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  sectionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  sectionActionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionActionButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 4,
  },
  sectionActionChevron: {
    opacity: 0.64,
  },
  sectionActionText: {
    color: foundationColors.green.deep,
  },
});
