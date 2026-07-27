import { Pressable, StyleSheet, View } from "react-native";
import {
  foundationColors,
  getWaymarkPressStyle,
  semanticBorder,
  semanticElevation,
  semanticRadius,
  semanticSpacing,
  spacing,
  typography,
  useReducedMotionEnabled,
} from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { WMText } from "./Text";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  label: string;
  variant?: Variant;
  icon?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function WMButton({
  label,
  variant = "primary",
  icon,
  fullWidth = false,
  disabled = false,
  loading = false,
  onPress,
  accessibilityLabel,
}: Props) {
  const reducedMotion = useReducedMotionEnabled();
  const palette = palettes[variant];
  const pressVariant = variant === "primary" ? "primary" : "secondary";
  const borderStyle = disabled
    ? getBorderStyle(semanticBorder.button.disabled)
    : getBorderStyle(buttonBorders[variant]);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        borderStyle,
        { backgroundColor: palette.bg },
        variant === "primary" ? styles.primaryElevation : null,
        disabled && styles.disabled,
        pressed && !disabled ? styles.pressed : null,
        getWaymarkPressStyle({ pressed, reducedMotion, variant: pressVariant }),
      ]}
    >
      <View style={styles.inner}>
        {icon ? (
          <WMText style={{ color: palette.fg }} variant="button">
            {icon}
          </WMText>
        ) : null}
        <WMText
          style={[typography.button, { color: palette.fg }]}
          variant="button"
        >
          {loading ? "..." : label}
        </WMText>
      </View>
    </Pressable>
  );
}

const palettes = {
  primary: {
    bg: foundationColors.green.base,
    fg: foundationColors.ink.inverse,
    border: foundationColors.green.base,
  },
  secondary: {
    bg: foundationColors.bg.paper,
    fg: foundationColors.green.deep,
    border: foundationColors.border.soft,
  },
  ghost: {
    bg: "transparent",
    fg: foundationColors.ink.secondary,
    border: "transparent",
  },
};

const buttonBorders = {
  primary: semanticBorder.button.primary,
  secondary: semanticBorder.button.secondary,
  ghost: semanticBorder.none,
} as const;

const styles = StyleSheet.create({
  base: {
    minHeight: semanticSpacing.button.minHeight,
    borderRadius: semanticRadius.button.default,
    paddingHorizontal: semanticSpacing.button.paddingX,
    paddingVertical: spacing.sm,
    justifyContent: "center",
  },
  primaryElevation: {
    boxShadow: semanticElevation.row,
  },
  fullWidth: {
    width: "100%",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: semanticSpacing.button.gap,
  },
  disabled: {
    opacity: 0.5,
    boxShadow: semanticElevation.flat,
  },
  pressed: {
    boxShadow: semanticElevation.pressed,
  },
});
