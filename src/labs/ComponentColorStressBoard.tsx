import { StyleSheet, View } from "react-native";
import { ComponentLab } from "./ComponentLab";
import { BoardSection } from "./BoardPrimitives";
import { Locale } from "../types/ui";
import { WMBadge } from "../components/primitives/WMBadge";
import { WMButton } from "../components/primitives/WMButton";
import { WMCard } from "../components/primitives/WMCard";
import { WMText } from "../components/primitives/Text";
import { foundationColors, semanticElevation, spacing } from "../theme/tokens";

export function ComponentColorStressBoard({ locale }: { locale: Locale }) {
  return (
    <View style={styles.stack}>
      <BoardSection
        title="ComponentColorStressBoard"
        subtitle="Cards, buttons, badges, bottom navigation, and action-sheet surfaces under the locked palette."
      >
        <View style={styles.buttonRow}>
          <WMButton label={locale === "en" ? "Primary action" : "Hành động chính"} />
          <WMButton label={locale === "en" ? "Secondary action" : "Hành động phụ"} variant="secondary" />
          <WMButton label={locale === "en" ? "Disabled" : "Vô hiệu hóa"} disabled />
        </View>
      </BoardSection>

      <WMCard>
        <WMText variant="cardTitle">
          {locale === "en" ? "Status chips on paper" : "Chip trạng thái trên nền giấy"}
        </WMText>
        <View style={styles.chipWrap}>
          <WMBadge label="planned" state="planned" />
          <WMBadge label="active" state="active" />
          <WMBadge label="done" state="done" />
          <WMBadge label="weak" state="weak" />
          <WMBadge label="missed" state="missed" />
        </View>
      </WMCard>

      <View style={styles.sheetPreview}>
        <View style={styles.sheetHandle} />
        <WMText variant="sectionTitle">
          {locale === "en" ? "Action Sheet Preview" : "Xem thử Action Sheet"}
        </WMText>
        <WMButton label={locale === "en" ? "Continue" : "Tiếp tục"} fullWidth />
        <WMButton label={locale === "en" ? "Not now" : "Để sau"} fullWidth variant="secondary" />
      </View>

      <ComponentLab locale={locale} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  buttonRow: {
    gap: spacing.sm,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  sheetPreview: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: 28,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
    boxShadow: semanticElevation.sheet,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: foundationColors.border.proof,
  },
});
