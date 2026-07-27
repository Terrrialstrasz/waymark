import { Pressable, StyleSheet, View } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { floatingActionButtonTokens, getWaymarkPressStyle, spacing, useReducedMotionEnabled } from "../../theme/tokens";
import { WaymarkIcon } from "./WaymarkIcon";
import { WMText } from "./Text";

type FloatingActionButtonVariant = "iconOnly" | "extended" | "insideCard" | "screenFloating" | "subtle";

type Props = {
  semanticName: WaymarkSemanticIconName;
  label?: string;
  onPress?: () => void;
  hidden?: boolean;
  disabled?: boolean;
  loading?: boolean;
  variant?: FloatingActionButtonVariant;
  accessibilityLabel: string;
};

export function FloatingActionButton({
  semanticName,
  label,
  onPress,
  hidden = false,
  disabled = false,
  loading = false,
  variant = "iconOnly",
  accessibilityLabel,
}: Props) {
  const reducedMotion = useReducedMotionEnabled();

  if (hidden) {
    return null;
  }

  const extended = variant === "extended";

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        extended ? styles.extended : styles.iconOnly,
        variant === "subtle" ? styles.subtle : null,
        disabled ? styles.disabled : null,
        loading ? styles.loading : null,
        getWaymarkPressStyle({ pressed, reducedMotion, variant: "icon" }),
      ]}
    >
      <WaymarkIcon decorative semanticName={semanticName} size="md" state={disabled ? "disabled" : "default"} />
      {extended && label ? (
        <WMText style={styles.label} variant="bodyStrong">
          {label}
        </WMText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: floatingActionButtonTokens.color.border,
    backgroundColor: floatingActionButtonTokens.color.surface,
    boxShadow: floatingActionButtonTokens.shadow.soft,
  },
  iconOnly: {
    width: floatingActionButtonTokens.size.iconOnly,
    height: floatingActionButtonTokens.size.iconOnly,
    borderRadius: floatingActionButtonTokens.radius.fab,
  },
  extended: {
    minHeight: floatingActionButtonTokens.size.extendedMinHeight,
    borderRadius: floatingActionButtonTokens.radius.extended,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  subtle: {
    backgroundColor: floatingActionButtonTokens.color.subtleSurface,
    boxShadow: floatingActionButtonTokens.shadow.none,
  },
  disabled: {
    opacity: 0.52,
  },
  loading: {
    opacity: 0.72,
  },
  label: {
    color: floatingActionButtonTokens.color.icon,
  },
});
