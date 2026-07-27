import { StyleSheet, View, useWindowDimensions } from "react-native";
import { WMSectionHeader } from "../primitives/WMSectionHeader";
import { CurrentExpeditionCard } from "../expeditions/CurrentExpeditionCard";
import { MARK_CARD_WIDTH } from "../marks/MarkCard";
import { CurrentExpeditionItem } from "./__fixtures__/todayExpedition.fixtures";
import { FeatureState, Locale } from "../../types/ui";
import { isFeatureVisible } from "../../utils/featureGate";
import { shellTokens, spacing } from "../../theme/tokens";
import { FieldJournalCarouselRail } from "../shared/FieldJournalCarouselRail";

type Props = {
  expeditions: CurrentExpeditionItem[];
  locale: Locale;
  gate?: FeatureState;
  onOpenExpeditionDetail?: (expedition: CurrentExpeditionItem) => void;
  title?: string;
};

export function CurrentExpeditionSection({ expeditions, locale, gate = "enabled", onOpenExpeditionDetail, title }: Props) {
  const { width } = useWindowDimensions();

  if (!isFeatureVisible(gate) || expeditions.length === 0) {
    return null;
  }

  const resolvedTitle = title ?? (locale === "vi" ? "Hanh trinh hien tai" : "Current Expedition");
  const contentWidth = width - shellTokens.spacing.screenXCompact * 2;
  const cardWidth = Math.min(MARK_CARD_WIDTH, contentWidth);

  return (
    <View style={styles.stack}>
      <WMSectionHeader title={resolvedTitle} />
      <FieldJournalCarouselRail ariaLabel={`${resolvedTitle} carousel`} itemGap={spacing.sm}>
        {expeditions.map((expedition) => (
          <CurrentExpeditionCard
            cardWidth={cardWidth}
            expedition={expedition}
            isDetailEnabled={expedition.detailEnabled}
            key={expedition.id}
            locale={locale}
            onPress={onOpenExpeditionDetail}
          />
        ))}
      </FieldJournalCarouselRail>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
});
