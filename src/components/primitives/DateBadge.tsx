import { StyleSheet, View } from "react-native";
import { colors, semanticBorder, semanticRadius, spacing } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { WMText } from "./Text";

type Props = {
  day: string;
  month: string;
};

export function DateBadge({ day, month }: Props) {
  return (
    <View style={styles.wrap}>
      <WMText variant="meta">{month}</WMText>
      <WMText variant="numeric">{day}</WMText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: semanticRadius.badge,
    backgroundColor: colors.surface,
    ...getBorderStyle(semanticBorder.card.subtle),
  },
});
