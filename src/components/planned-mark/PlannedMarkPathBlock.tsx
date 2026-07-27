import { StyleSheet, View } from "react-native";
import { WMText } from "../primitives/Text";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { PlannedMarkPathTheme } from "./plannedMarkTheme";

type Props = {
  label: string;
  pathLabel: string;
  theme: PlannedMarkPathTheme;
};

export function PlannedMarkPathBlock({ label, pathLabel, theme }: Props) {
  return (
    <View
      style={[
        styles.block,
        {
          backgroundColor: theme.surfaceSoft,
          borderColor: theme.border,
        },
      ]}
    >
      <WMText style={styles.label} variant="label">
        {label}
      </WMText>
      <WMText style={[styles.value, { color: theme.deep }]} variant="sectionTitle">
        {pathLabel}
      </WMText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  label: {
    color: foundationColors.ink.secondary,
  },
  value: {
    fontSize: 18,
    lineHeight: 24,
  },
});
