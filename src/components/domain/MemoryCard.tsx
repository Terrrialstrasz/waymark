import { StyleSheet, View } from "react-native";
import { MemoryModel } from "../../mocks/data";
import { foundationColors, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMCard } from "../primitives/WMCard";
import { WMText } from "../primitives/Text";
import { WMChip } from "../primitives/WMChip";

type Props = {
  item: MemoryModel;
  locale: Locale;
};

export function MemoryCard({ item, locale }: Props) {
  const caption = item.masked
    ? locale === "en"
      ? "Memory text is masked."
      : "Nội dung ký ức đang được che."
    : t(item.caption, locale);

  return (
    <WMCard gate={item.gate} tint="gold">
      <View style={styles.hero}>
        <WMText style={styles.heroMark} variant="display">
          {item.hasPhoto ? "◐" : "◎"}
        </WMText>
      </View>
      <WMText variant="cardTitle">{t(item.title, locale)}</WMText>
      <WMText style={styles.caption} variant="body">
        {caption}
      </WMText>
      <View style={styles.tags}>
        {t(item.pathLabels, locale).map((tag) => (
          <WMChip key={tag} label={tag} />
        ))}
      </View>
      <WMText variant="meta">{t(item.dateLabel, locale)}</WMText>
    </WMCard>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 120,
    borderRadius: 18,
    backgroundColor: foundationColors.bg.paper,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroMark: {
    color: foundationColors.gold.deep,
  },
  caption: {
    color: foundationColors.ink.secondary,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
