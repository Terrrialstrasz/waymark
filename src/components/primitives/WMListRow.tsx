import { Pressable, StyleSheet, View } from "react-native";
import { colors, getWaymarkPressStyle, semanticBorder, semanticElevation, semanticRadius, semanticSpacing, useReducedMotionEnabled } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { WMText } from "./Text";

type Props = {
  icon?: string;
  title: string;
  subtitle?: string;
  trailing?: string;
  action?: () => void;
  elevated?: boolean;
};

export function WMListRow({ icon, title, subtitle, trailing, action, elevated = false }: Props) {
  const reducedMotion = useReducedMotionEnabled();
  const content = (
    <View style={[styles.row, elevated ? styles.rowElevated : null]}>
      <View style={styles.leading}>
        {icon ? <WMText variant="bodyStrong">{icon}</WMText> : null}
        <View style={styles.copy}>
          <WMText variant="bodyStrong">{title}</WMText>
          {subtitle ? (
            <WMText style={styles.subtitle} variant="meta">
              {subtitle}
            </WMText>
          ) : null}
        </View>
      </View>
      {trailing ? (
        <WMText style={styles.trailing} variant="label">
          {trailing}
        </WMText>
      ) : null}
    </View>
  );

  if (!action) {
    return content;
  }

  return (
    <Pressable onPress={action} style={({ pressed }) => [getWaymarkPressStyle({ pressed, reducedMotion, variant: "row" })]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: semanticSpacing.row.gap,
    paddingHorizontal: semanticSpacing.row.paddingX,
    paddingVertical: semanticSpacing.row.paddingY,
    borderRadius: semanticRadius.row.default,
    ...getBorderStyle(semanticBorder.divider.subtle, "bottom"),
  },
  rowElevated: {
    backgroundColor: colors.surface,
    ...getBorderStyle(semanticBorder.row.default),
    boxShadow: semanticElevation.row,
  },
  leading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: semanticSpacing.row.gap,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    color: colors.textMuted,
  },
  trailing: {
    color: colors.textMuted,
  },
});
