import { StyleSheet, View } from "react-native";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { getCopy } from "../../i18n/copy";
import { foundationColors, semanticElevation, semanticRadius, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";

type Props = {
  locale?: Locale;
};

export function WeekEmptyState({ locale = "en" }: Props) {
  const c = getCopy(locale).weeklyCoding.empty;

  return (
    <View style={styles.card}>
      <View style={styles.iconSeal}>
        <WaymarkIcon decorative semanticName="entity.weeklyCodingReport" size="md" state="muted" />
      </View>
      <View style={styles.copy}>
        <WMText style={styles.title} variant="sectionTitle">
          {c.title}
        </WMText>
        <WMText style={styles.body} variant="body">
          {c.body}
        </WMText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 196,
    borderRadius: semanticRadius.card.hero,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle("1px solid " + foundationColors.border.soft),
    boxShadow: semanticElevation.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  iconSeal: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: foundationColors.bg.paperWarm,
    ...getBorderStyle("1px solid " + foundationColors.border.subtle),
  },
  copy: {
    gap: spacing.xs,
    alignItems: "center",
  },
  title: {
    textAlign: "center",
  },
  body: {
    color: foundationColors.ink.secondary,
    textAlign: "center",
  },
});
