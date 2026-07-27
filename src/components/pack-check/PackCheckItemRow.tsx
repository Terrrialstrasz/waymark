import { AccessibilityState, Pressable, StyleSheet, View } from "react-native";
import { useCopy } from "../../i18n/useCopy";
import { getPathVisualTokens } from "../../tokens/pathVisualTokens";
import { Locale, PathId } from "../../types/ui";
import {
  foundationColors,
  getWaymarkPressStyle,
  semanticRadius,
  spacing,
  typography,
  useReducedMotionEnabled,
} from "../../theme/tokens";
import { WMText } from "../primitives/Text";

type Props = {
  id: string;
  index: number;
  label: string;
  locale: Locale;
  path: PathId;
  checked: boolean;
  disabled?: boolean;
  loading?: boolean;
  onToggle?: (id: string) => void;
};

export function PackCheckItemRow({
  id,
  index,
  label,
  locale,
  path,
  checked,
  disabled = false,
  loading = false,
  onToggle,
}: Props) {
  const c = useCopy(locale).packCheck;
  const reducedMotion = useReducedMotionEnabled();
  const blocked = disabled || loading;
  const statusText = checked ? c.row.status.checked : c.row.status.unchecked;
  const accessibilityState: AccessibilityState = { checked, disabled: blocked };
  const pathVisual = getPathVisualTokens(path);

  return (
    <Pressable
      accessibilityLabel={formatTemplate(c.row.accessibilityLabel, { label, status: statusText })}
      accessibilityRole="checkbox"
      accessibilityState={accessibilityState}
      disabled={blocked}
      onPress={() => onToggle?.(id)}
      style={({ pressed }) => [
        styles.pressable,
        blocked ? styles.disabled : null,
        pressed ? { backgroundColor: pathVisual.accentSoft } : null,
        getWaymarkPressStyle({ pressed, reducedMotion, variant: "row" }),
      ]}
    >
      <View
        style={[
          styles.numberBadge,
          {
            backgroundColor: checked ? pathVisual.accent : foundationColors.bg.paper,
            borderColor: checked ? pathVisual.accentDeep : pathVisual.accentMuted,
          },
        ]}
      >
        <WMText style={[styles.numberText, { color: checked ? foundationColors.ink.inverse : pathVisual.accentDeep }]} variant="meta">
          {index + 1}
        </WMText>
      </View>

      <View style={styles.copy}>
        <WMText numberOfLines={2} style={styles.label} variant="body">
          {label}
        </WMText>
      </View>

      <Pressable
        accessibilityLabel={formatTemplate(c.row.toggleControlLabel, { label, status: statusText })}
        accessibilityRole="checkbox"
        accessibilityState={accessibilityState}
        disabled={blocked}
        hitSlop={8}
        onPress={() => onToggle?.(id)}
        style={({ pressed }) => [
          styles.checkSlot,
          {
            backgroundColor: checked ? pathVisual.accent : foundationColors.bg.paper,
            borderColor: checked ? pathVisual.accentDeep : foundationColors.border.soft,
          },
          pressed && !blocked ? styles.checkPressed : null,
        ]}
      >
        <WMText style={[styles.checkGlyph, { color: checked ? foundationColors.ink.inverse : "transparent" }]} variant="bodyStrong">
          {`\u2713`}
        </WMText>
      </Pressable>
    </Pressable>
  );
}

function formatTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/gu, (_, key: string) => values[key] ?? "");
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  disabled: {
    opacity: 0.56,
  },
  numberBadge: {
    alignItems: "center",
    borderRadius: semanticRadius.badge,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  numberText: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  label: {
    color: foundationColors.ink.primary,
    ...typography.cardTitle,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.04,
  },
  checkSlot: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  checkPressed: {
    opacity: 0.84,
  },
  checkGlyph: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 20,
  },
});
