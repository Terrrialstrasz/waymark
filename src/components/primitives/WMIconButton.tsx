import { Pressable, StyleSheet } from "react-native";
import { foundationColors, getWaymarkPressStyle, semanticBorder, semanticRadius, spacing, useReducedMotionEnabled } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { WMText } from "./Text";

type Props = {
  icon: string;
  label: string;
  hidden?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

export function WMIconButton({ icon, label, hidden, disabled, onPress }: Props) {
  const reducedMotion = useReducedMotionEnabled();

  if (hidden) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        disabled && styles.disabled,
        getWaymarkPressStyle({ pressed, reducedMotion, variant: "icon" }),
      ]}
    >
      <WMText variant="bodyStrong">{icon}</WMText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 42,
    height: 42,
    borderRadius: semanticRadius.badge,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle(semanticBorder.card.subtle),
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  disabled: {
    opacity: 0.4,
  },
});
