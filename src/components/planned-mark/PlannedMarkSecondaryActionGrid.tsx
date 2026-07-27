import { Pressable, StyleSheet, View } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { foundationColors, getWaymarkPressStyle, semanticElevation, semanticRadius, spacing, useReducedMotionEnabled } from "../../theme/tokens";
import { PlannedMarkPathTheme } from "./plannedMarkTheme";

export type PlannedMarkSecondaryAction = {
  key: "reschedule" | "substitute" | "skip";
  label: string;
  icon: WaymarkSemanticIconName;
  onPress: () => void;
};

type Props = {
  actions: PlannedMarkSecondaryAction[];
  theme: PlannedMarkPathTheme;
};

export function PlannedMarkSecondaryActionGrid({ actions, theme }: Props) {
  const reducedMotion = useReducedMotionEnabled();

  if (!actions.length) {
    return null;
  }

  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityLabel={action.label}
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
            pressed ? styles.cardPressed : null,
            getWaymarkPressStyle({ pressed, reducedMotion, variant: "secondary" }),
          ]}
        >
          <View style={[styles.accentBar, { backgroundColor: theme.accent }]} />
          <WaymarkIcon semanticName={action.icon} size="sm" state="muted" />
          <WMText style={[styles.label, { color: theme.deep }]} variant="bodyStrong">
            {action.label}
          </WMText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  card: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 96,
    minHeight: 78,
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    boxShadow: semanticElevation.flat,
    overflow: "hidden",
  },
  cardPressed: {
    boxShadow: semanticElevation.pressed,
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  label: {
    color: foundationColors.ink.primary,
    textAlign: "center",
  },
});
