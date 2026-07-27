import { Pressable, StyleSheet, View } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { foundationColors, getWaymarkPressStyle, semanticElevation, semanticRadius, spacing, useReducedMotionEnabled } from "../../theme/tokens";
import { PlannedMarkPathTheme } from "./plannedMarkTheme";

export type PlannedMarkRowAction = {
  key: string;
  label: string;
  variant: "primary" | "secondary";
  icon: WaymarkSemanticIconName;
  onPress: () => void;
};

type Props = {
  actions: PlannedMarkRowAction[];
  theme: PlannedMarkPathTheme;
};

export function PlannedMarkActionRow({ actions, theme }: Props) {
  const isTwoByTwoGrid = actions.length === 4;

  return (
    <View style={[styles.row, isTwoByTwoGrid ? styles.gridRow : null]}>
      {actions.map((action) =>
        action.variant === "primary" ? (
          <PrimaryRowAction key={action.key} action={action} theme={theme} twoByTwo={isTwoByTwoGrid} />
        ) : (
          <SecondaryRowAction key={action.key} action={action} theme={theme} twoByTwo={isTwoByTwoGrid} />
        ),
      )}
    </View>
  );
}

function PrimaryRowAction({
  action,
  theme,
  twoByTwo = false,
}: {
  action: PlannedMarkRowAction;
  theme: PlannedMarkPathTheme;
  twoByTwo?: boolean;
}) {
  const reducedMotion = useReducedMotionEnabled();

  return (
    <Pressable
      accessibilityLabel={action.label}
      accessibilityRole="button"
      onPress={action.onPress}
      style={({ pressed }) => [
        styles.button,
        twoByTwo ? styles.gridButton : null,
        styles.primaryButton,
        {
          backgroundColor: theme.deep,
          borderColor: theme.deep,
        },
        pressed ? styles.primaryPressed : null,
        getWaymarkPressStyle({ pressed, reducedMotion, variant: "primary" }),
      ]}
    >
      <View style={[styles.buttonInner, twoByTwo ? styles.gridButtonInner : null]}>
        <WaymarkIcon semanticName={action.icon} size="lg" state="selected" />
        <WMText
          numberOfLines={1}
          style={[styles.primaryLabel, twoByTwo ? styles.gridLabel : null]}
          variant="bodyStrong"
        >
          {action.label}
        </WMText>
      </View>
    </Pressable>
  );
}

function SecondaryRowAction({
  action,
  theme,
  twoByTwo = false,
}: {
  action: PlannedMarkRowAction;
  theme: PlannedMarkPathTheme;
  twoByTwo?: boolean;
}) {
  const reducedMotion = useReducedMotionEnabled();

  return (
    <Pressable
      accessibilityLabel={action.label}
      accessibilityRole="button"
      onPress={action.onPress}
      style={({ pressed }) => [
        styles.button,
        twoByTwo ? styles.gridButton : null,
        styles.secondaryButton,
        {
          backgroundColor: foundationColors.bg.paper,
          borderColor: theme.border,
        },
        pressed ? styles.secondaryPressed : null,
        getWaymarkPressStyle({ pressed, reducedMotion, variant: "secondary" }),
      ]}
    >
      <View style={[styles.buttonInner, twoByTwo ? styles.gridButtonInner : null]}>
        <WaymarkIcon semanticName={action.icon} size="lg" state="muted" />
        <WMText
          numberOfLines={1}
          style={[styles.secondaryLabel, { color: theme.deep }, twoByTwo ? styles.gridLabel : null]}
          variant="bodyStrong"
        >
          {action.label}
        </WMText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  gridRow: {
    flexWrap: "wrap",
  },
  button: {
    flex: 1,
    minHeight: 60,
    borderRadius: semanticRadius.button.default,
    borderWidth: 1,
    overflow: "hidden",
  },
  gridButton: {
    flexBasis: "48%",
    minWidth: "48%",
    maxWidth: "48%",
    minHeight: 74,
  },
  primaryButton: {
    boxShadow: semanticElevation.row,
  },
  secondaryButton: {
    boxShadow: semanticElevation.flat,
  },
  buttonInner: {
    minHeight: 60,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  gridButtonInner: {
    minHeight: 74,
    gap: 6,
  },
  primaryLabel: {
    color: foundationColors.ink.inverse,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 14,
  },
  secondaryLabel: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 14,
  },
  gridLabel: {
    fontSize: 15,
    lineHeight: 18,
  },
  primaryPressed: {
    boxShadow: semanticElevation.pressed,
  },
  secondaryPressed: {
    boxShadow: semanticElevation.pressed,
  },
});
