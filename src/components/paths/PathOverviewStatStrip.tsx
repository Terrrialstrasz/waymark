import { StyleSheet, View } from "react-native";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { spacing } from "../../theme/tokens";
import { PathStatCardItem } from "./types";
import { StatCard } from "./StatCard";

type Props = {
  items: PathStatCardItem[];
  locale: Locale;
};

export function PathOverviewStatStrip({ items, locale }: Props) {
  const visibleItems: PathStatCardItem[] = items.slice(0, 3);

  return (
    <View style={styles.row}>
      {visibleItems.map((item) => (
        <StatCard
          key={item.id}
          debugLabel={`PathOverviewStatStrip.StatCard.${item.id}`}
          debugLines={[`label=${t(item.label, locale)}`, `value=${item.value ? t(item.value, locale) : "none"}`]}
          label={t(item.label, locale)}
          state={item.state}
          value={item.value ? t(item.value, locale) : undefined}
          backgroundIconSemanticName={item.backgroundIconSemanticName}
          watermarkAssetId={item.watermarkAssetId ?? item.heroAssetId}
          style={styles.card}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  card: {
    flexBasis: 0,
    flexGrow: 1,
  },
});
