import { StyleSheet, View } from "react-native";
import { getCopy } from "../../i18n/copy";
import { foundationColors, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { HorizontalJournalEntryCard } from "../journal";
import { PulledBacklogItemRow } from "./PulledBacklogItemRow";
import { WeeklyCodingReportItem } from "./WeeklyCoding.types";

type Props = {
  weekLabel: string;
  items: WeeklyCodingReportItem[];
  locale?: Locale;
  reducedMotion?: boolean;
  onOpenItem?: (itemId: string) => void;
  onOpenItemDetail?: (itemId: string) => void;
  onRequestMenuAnchor?: Parameters<typeof PulledBacklogItemRow>[0]["onRequestMenuAnchor"];
  onRemoveFromWeek?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
};

export function PulledIntoWeekSection({
  weekLabel,
  items,
  locale = "en",
  reducedMotion,
  onOpenItem,
  onOpenItemDetail,
  onRequestMenuAnchor,
  onRemoveFromWeek,
  onDeleteItem,
}: Props) {
  const c = getCopy(locale).weeklyCoding;
  const countLabel = items.length === 1 ? c.section.countOne : c.section.countOther;
  const title = c.section.title.replace("{week}", weekLabel);
  const count = countLabel.replace("{count}", String(items.length));

  return (
    <View style={styles.section}>
      <HorizontalJournalEntryCard
        entryType="mark"
        chips={[
          { id: "week", label: weekLabel, variant: "metadata" },
          { id: "count", label: count, variant: "metadata" },
        ]}
        body={count}
        pathColorToken={foundationColors.gold.soft}
        title={title}
      />

      <View style={styles.list}>
        {items.map((item) => (
          <PulledBacklogItemRow
            item={item}
            key={item.id}
            locale={locale}
            onDelete={onDeleteItem}
            onOpen={onOpenItem}
            onOpenDetail={onOpenItemDetail}
            onRemoveFromWeek={onRemoveFromWeek}
            onRequestMenuAnchor={onRequestMenuAnchor}
            reducedMotion={reducedMotion}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
});
