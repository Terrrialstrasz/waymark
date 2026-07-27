import { StyleSheet, View } from "react-native";
import { BacklogItemModel } from "../../mocks/data";
import { colors, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMBadge } from "../primitives/WMBadge";
import { WMCard } from "../primitives/WMCard";
import { WMChip } from "../primitives/WMChip";
import { WMText } from "../primitives/Text";

type Props = {
  item: BacklogItemModel;
  locale: Locale;
};

export function BacklogItemCard({ item, locale }: Props) {
  return (
    <WMCard gate={item.gate}>
      <View style={styles.row}>
        <WMBadge label={t(item.typeLabel, locale)} state={item.state} />
        <WMChip label={t(item.horizonLabel, locale)} />
      </View>
      <WMText variant="cardTitle">{t(item.title, locale)}</WMText>
      <WMText style={styles.copy} variant="body">
        {t(item.body, locale)}
      </WMText>
    </WMCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  copy: {
    color: colors.textMuted,
  },
});
