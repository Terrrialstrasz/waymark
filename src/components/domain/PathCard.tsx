import { StyleSheet, View } from "react-native";
import { PathCardModel } from "../../mocks/data";
import { colors, pathColors, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMBadge } from "../primitives/WMBadge";
import { WMCard } from "../primitives/WMCard";
import { WMProgressLine } from "../primitives/WMProgressLine";
import { WMText } from "../primitives/Text";

type Props = {
  item: PathCardModel;
  locale: Locale;
};

export function PathCard({ item, locale }: Props) {
  return (
    <WMCard gate={item.gate}>
      <View style={styles.top}>
        <View style={[styles.dot, { backgroundColor: pathColors[item.id] }]} />
        <WMBadge label={item.pulse} state={item.pulse} />
      </View>
      <WMText variant="cardTitle">{t(item.title, locale)}</WMText>
      <WMText style={styles.note} variant="body">
        {t(item.note, locale)}
      </WMText>
      <WMText variant="meta">{t(item.recentMark, locale)}</WMText>
      <WMProgressLine
        label={locale === "en" ? "Weekly presence" : "Mức hiện diện trong tuần"}
        value={Math.min(1, item.weeklyCount / 7)}
        tint="gold"
      />
    </WMCard>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  note: {
    color: colors.textMuted,
  },
});
