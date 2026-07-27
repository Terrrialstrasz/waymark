import { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { foundationColors, getWaymarkPressStyle, spacing, useReducedMotionEnabled } from "../../theme/tokens";
import { WMText } from "../primitives/Text";

type Props = {
  title: string;
  subtitle?: string;
  icon: WaymarkSemanticIconName;
  statusBadge?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  reducedMotion?: boolean;
  titleVariant?: "bodyStrong" | "cardTitle";
};

export function SettingsRow({
  title,
  subtitle,
  statusBadge,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  reducedMotion,
  titleVariant = "bodyStrong",
}: Props) {
  const resolvedReducedMotion = useReducedMotionEnabled(reducedMotion);
  const interactive = Boolean(onPress) && !disabled;

  const rowBody = (
    <View style={[styles.row, disabled ? styles.disabled : null, loading ? styles.loading : null]}>
      <View style={styles.headerRow}>
        <WMText numberOfLines={2} style={styles.title} variant={titleVariant}>
          {title}
        </WMText>
        <View style={styles.headerTrailing}>
          {statusBadge}
        </View>
      </View>

      {subtitle ? (
        <WMText numberOfLines={2} style={styles.subtitle} variant="bodySm">
          {subtitle}
        </WMText>
      ) : null}
    </View>
  );

  if (!interactive) {
    return rowBody;
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, getWaymarkPressStyle({ pressed, reducedMotion: resolvedReducedMotion, variant: "row" })]}
    >
      {rowBody}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 18,
  },
  row: {
    minHeight: 72,
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  headerTrailing: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
    flexShrink: 1,
  },
  title: {
    color: foundationColors.ink.primary,
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
    flex: 1,
    minWidth: 0,
  },
  disabled: {
    opacity: 0.52,
  },
  loading: {
    opacity: 0.76,
  },
});
