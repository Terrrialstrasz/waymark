import { Alert, StyleSheet, View } from "react-native";
import { TodayPackCheckItem } from "./__fixtures__/todayCarousel.fixtures";
import { Locale, FeatureState } from "../../types/ui";
import { isFeatureVisible } from "../../utils/featureGate";
import { WMSectionHeader } from "../primitives/WMSectionHeader";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { FieldJournalCarouselRail } from "../shared/FieldJournalCarouselRail";
import { PackCheckMiniCard } from "../pack-checks/PackCheckMiniCard";
import { spacing } from "../../theme/tokens";

type Props = {
  packs: TodayPackCheckItem[];
  locale: Locale;
  gate?: FeatureState;
  onOpenPackCheck?: (pack: TodayPackCheckItem) => void;
  title?: string;
};

export function PackChecksSection({ packs, locale, gate = "enabled", onOpenPackCheck, title }: Props) {
  if (!isFeatureVisible(gate)) {
    return null;
  }

  const resolvedTitle = title ?? (locale === "vi" ? "Kiểm tra đồ" : "Pack Checks");

  if (packs.length === 0) {
    return (
      <View style={styles.stack}>
        <WMSectionHeader title={resolvedTitle} />
        <WMEmptyState
          body={locale === "vi" ? "Khi pack check đã sẵn sàng end-to-end, rail này mới hiện nội dung." : "This rail stays quiet until pack checks are ready end-to-end."}
          title={locale === "vi" ? "Chưa có pack check nào" : "No pack checks yet"}
        />
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <WMSectionHeader title={resolvedTitle} />
      <FieldJournalCarouselRail ariaLabel={resolvedTitle}>
        {packs.map((pack) => (
          <PackCheckMiniCard
            isDetailEnabled={pack.detailEnabled}
            key={pack.id}
            locale={locale}
            onPress={onOpenPackCheck ?? ((item) => Alert.alert(locale === "vi" ? "Pack Check" : "Pack Check", item.title[locale]))}
            pack={pack}
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
