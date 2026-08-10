import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import type { Locale } from "../../types/ui";
import { WMText } from "../primitives/Text";

export type DayOfWeekNavigatorItem = {
  localDate: string;
  weekdayLabel: string;
  dateLabel: string;
  plannedItemCount: number;
  markCount: number;
  isToday?: boolean;
};

type Props = {
  locale: Locale;
  days: DayOfWeekNavigatorItem[];
  selectedDate: string | null;
  onSelectDate: (localDate: string) => void;
};

export function DayOfWeekNavigator({ locale, days, selectedDate, onSelectDate }: Props) {
  return (
    <View style={styles.stack}>
      <View style={styles.headerRow}>
        <WMText style={styles.title} variant="sectionTitle">
          {locale === "vi" ? "Day of the Week" : "Day of the Week"}
        </WMText>
        <WMText style={styles.subtitle} variant="meta">
          {locale === "vi" ? "Review ngay trong tuan ke hoach" : "Review a planned day"}
        </WMText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroller} contentContainerStyle={styles.row}>
        {days.map((day) => (
          <DayChip
            day={day}
            key={day.localDate}
            locale={locale}
            onPress={() => onSelectDate(day.localDate)}
            selected={day.localDate === selectedDate}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function DayChip({
  day,
  locale,
  selected,
  onPress,
}: {
  day: DayOfWeekNavigatorItem;
  locale: Locale;
  selected: boolean;
  onPress: () => void;
}) {
  const hasPlan = day.plannedItemCount > 0 || day.markCount > 0;
  const countLabel =
    day.markCount > 0 ? `${day.markCount} Mark`
    : day.plannedItemCount > 0 ? `${day.plannedItemCount} Plan`
    : locale === "vi" ? "Trong" : "Clear";

  return (
    <Pressable
      accessibilityLabel={`${day.weekdayLabel} ${day.dateLabel}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : null,
        pressed ? styles.chipPressed : null,
      ]}
    >
      <View style={styles.chipTopRow}>
        <WMText numberOfLines={1} style={[styles.weekday, selected ? styles.weekdaySelected : null]} variant="metaCompact">
          {day.weekdayLabel}
        </WMText>
        {hasPlan ? <View style={[styles.planDot, selected ? styles.planDotSelected : null]} /> : null}
      </View>
      <WMText numberOfLines={1} style={[styles.date, selected ? styles.dateSelected : null]} variant="sectionTitle">
        {day.dateLabel}
      </WMText>
      <WMText numberOfLines={1} style={[styles.count, selected ? styles.countSelected : null]} variant="metaCompact">
        {day.isToday ? (locale === "vi" ? "Today" : "Today") : countLabel}
      </WMText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  headerRow: {
    gap: spacing.xxs,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
  },
  scroller: {
    marginRight: -spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  chip: {
    backgroundColor: foundationColors.bg.paperSoft,
    borderColor: foundationColors.border.subtle,
    borderRadius: semanticRadius.chip,
    borderWidth: 1,
    gap: 3,
    minHeight: 76,
    minWidth: 74,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    backgroundColor: foundationColors.green.base,
    borderColor: foundationColors.green.deep,
  },
  chipPressed: {
    opacity: 0.78,
  },
  chipTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  weekday: {
    color: foundationColors.ink.secondary,
    textTransform: "uppercase",
  },
  weekdaySelected: {
    color: foundationColors.bg.paper,
  },
  date: {
    color: foundationColors.ink.primary,
    fontVariant: ["tabular-nums"],
  },
  dateSelected: {
    color: foundationColors.bg.paper,
  },
  count: {
    color: foundationColors.ink.tertiary,
  },
  countSelected: {
    color: foundationColors.bg.paper,
  },
  planDot: {
    backgroundColor: foundationColors.green.base,
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  planDotSelected: {
    backgroundColor: foundationColors.bg.paper,
  },
});
