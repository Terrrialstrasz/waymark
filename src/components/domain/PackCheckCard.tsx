import { StyleSheet, View } from "react-native";
import { PackCheckModel } from "../../mocks/data";
import { colors, getSemanticStateToneStyle, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMBadge } from "../primitives/WMBadge";
import { WMButton } from "../primitives/WMButton";
import { WMCard } from "../primitives/WMCard";
import { WMText } from "../primitives/Text";

type Props = {
  item: PackCheckModel;
  locale: Locale;
};

export function PackCheckCard({ item, locale }: Props) {
  if (item.state === "hidden") {
    return null;
  }

  const completed = item.items.filter((entry) => entry.checked).length;
  const state = item.state === "done" ? "done" : "weak";
  const palette = getSemanticStateToneStyle(state, "subtle");

  return (
    <WMCard gate={item.gate} style={{ backgroundColor: palette.bg, borderColor: palette.border, borderWidth: 1 }}>
      <View style={styles.row}>
        <WMBadge locale={locale} state={state} />
        <View style={[styles.dot, { backgroundColor: palette.accent }]} />
      </View>
      <WMText variant="cardTitle">{t(item.title, locale)}</WMText>
      <WMText style={styles.copy} variant="body">
        {t(item.summary, locale)}
      </WMText>
      <WMText variant="meta">
        {locale === "en"
          ? `${completed} of ${item.items.length} items ready`
          : `Đã sẵn sàng ${completed} trên ${item.items.length} món`}
      </WMText>
      <WMButton
        fullWidth
        disabled={item.state !== "done" && item.state !== "partial"}
        label={locale === "en" ? "Open checklist" : "Mở checklist"}
      />
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
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  copy: {
    color: colors.textMuted,
  },
});
