import { StyleSheet, View } from "react-native";
import { MarkCardModel } from "../../mocks/data";
import { colors, getSemanticStateToneStyle, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMBadge } from "../primitives/WMBadge";
import { WMCard } from "../primitives/WMCard";
import { WMText } from "../primitives/Text";

type Props = {
  item: MarkCardModel;
  locale: Locale;
};

export function MarkCard({ item, locale }: Props) {
  const state = item.state === "private_sensitive" ? "private_sensitive" : "done";
  const palette = getSemanticStateToneStyle(state, "subtle");
  const body = item.masked
    ? locale === "en"
      ? "Private note is hidden until the device is unlocked."
      : "Ghi chú riêng tư đang được che cho đến khi thiết bị được mở khoá."
    : t(item.note, locale);

  return (
    <WMCard gate={item.gate} style={{ backgroundColor: palette.bg, borderColor: palette.border, borderWidth: 1 }}>
      <View style={styles.row}>
        <WMBadge locale={locale} state={state} />
        <WMText variant="meta">{t(item.timeLabel, locale)}</WMText>
      </View>
      <WMText variant="cardTitle">{t(item.title, locale)}</WMText>
      <WMText style={styles.note} variant="body">
        {body}
      </WMText>
      <View style={styles.metaRow}>
        <WMText variant="meta">{t(item.pathLabel, locale)}</WMText>
        {item.memoryLinked ? <WMText variant="meta">Memory</WMText> : null}
        {item.expeditionLinked ? <WMText variant="meta">Expedition</WMText> : null}
      </View>
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
  note: {
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
