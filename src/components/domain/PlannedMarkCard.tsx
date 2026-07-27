import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { PlannedMarkModel } from "../../mocks/data";
import { colors, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMCard } from "../primitives/WMCard";
import { WMSheet } from "../primitives/WMSheet";
import { WMText } from "../primitives/Text";
import { PlannedMarkActionSheet } from "./PlannedMarkActionSheet";

type Props = {
  item: PlannedMarkModel;
  locale: Locale;
};

export function PlannedMarkCard({ item, locale }: Props) {
  const [open, setOpen] = useState(false);
  const hidden = item.state === "hidden";
  const tappable = item.state !== "done" && item.state !== "hidden";
  const readinessLabel = getReadinessLabel(item.state, locale);

  return (
    <>
      <WMCard hidden={hidden} gate={item.gate} onPress={() => setOpen(true)} pressable={tappable} style={styles.card}>
        <View style={styles.headerRow}>
          <WMText style={styles.readinessChip} variant="metaCompact">
            {readinessLabel}
          </WMText>
          <WMText variant="metaCompact">{t(item.windowLabel, locale)}</WMText>
        </View>
        <WMText variant="cardTitle">{t(item.title, locale)}</WMText>
        <WMText style={styles.copy} variant="body">
          {t(item.intention, locale)}
        </WMText>
      </WMCard>
      <WMSheet visible={open} onClose={() => setOpen(false)}>
        <PlannedMarkActionSheet item={item} locale={locale} onClose={() => setOpen(false)} />
      </WMSheet>
    </>
  );
}

function getReadinessLabel(state: PlannedMarkModel["state"], locale: Locale) {
  switch (state) {
    case "blocked":
      return locale === "vi" ? "Bị chặn" : "Blocked";
    case "postponed":
      return locale === "vi" ? "Cần quyết định" : "Needs Decision";
    case "substituted":
      return locale === "vi" ? "Đã xử lý" : "Resolved";
    case "done":
      return locale === "vi" ? "Đã xong" : "Done";
    default:
      return locale === "vi" ? "Sẵn sàng" : "Ready";
  }
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  readinessChip: {
    backgroundColor: "rgba(43,42,34,0.06)",
    borderRadius: 999,
    color: colors.text,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copy: {
    color: colors.textMuted,
  },
});
