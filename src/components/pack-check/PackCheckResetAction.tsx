import { Pressable, StyleSheet, View } from "react-native";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { useCopy } from "../../i18n/useCopy";
import { foundationColors, getWaymarkPressStyle, semanticBorder, semanticElevation, semanticRadius, spacing, typography, useReducedMotionEnabled } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { WMText } from "../primitives/Text";

type Props = {
  locale: Locale;
  disabled?: boolean;
  loading?: boolean;
  onClearChecks?: () => void;
};

export function PackCheckResetAction({ locale, disabled = false, loading = false, onClearChecks }: Props) {
  const c = useCopy(locale).packCheck;
  const reducedMotion = useReducedMotionEnabled();
  const blocked = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={c.actions.clearChecksAccessibility}
      accessibilityRole="button"
      disabled={blocked}
      onPress={onClearChecks}
      style={({ pressed }) => [
        styles.base,
        blocked ? styles.disabled : null,
        pressed && !blocked ? styles.pressed : null,
        getWaymarkPressStyle({ pressed, reducedMotion, variant: "secondary" }),
      ]}
    >
      <View style={styles.inner}>
        <WMText style={styles.label} variant="button">
          {loading ? c.loading.ellipsis : c.actions.clearChecks}
        </WMText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    ...getBorderStyle(semanticBorder.button.secondary),
    alignItems: "center",
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: semanticRadius.button.default,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    width: "100%",
  },
  inner: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  label: {
    ...typography.button,
    color: foundationColors.ink.secondary,
  },
  pressed: {
    backgroundColor: foundationColors.bg.paperSoft,
    boxShadow: semanticElevation.pressed,
  },
  disabled: {
    boxShadow: semanticElevation.flat,
    opacity: 0.48,
  },
});
