import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { WMText } from "../primitives/Text";
import { foundationColors, getWaymarkPressStyle, semanticElevation, semanticRadius, spacing, typography, useReducedMotionEnabled } from "../../theme/tokens";
import { PlannedMarkPathTheme } from "./plannedMarkTheme";

type Props = {
  label: string;
  onPress: () => void;
  theme: PlannedMarkPathTheme;
};

export function PlannedMarkPrimaryAction({ label, onPress, theme }: Props) {
  const reducedMotion = useReducedMotionEnabled();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        {
          borderColor: theme.deep,
        },
        pressed ? styles.pressed : null,
        getWaymarkPressStyle({ pressed, reducedMotion, variant: "primary" }),
      ]}
    >
      <Svg height="100%" style={StyleSheet.absoluteFillObject} width="100%">
        <Defs>
          <LinearGradient id="plannedMarkPrimaryActionGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <Stop offset="0%" stopColor={theme.accent} />
            <Stop offset="100%" stopColor={theme.deep} />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#plannedMarkPrimaryActionGradient)" height="100%" rx={semanticRadius.button.default} ry={semanticRadius.button.default} width="100%" />
      </Svg>
      <View style={styles.content}>
        <WMText style={styles.label} variant="sectionTitle">
          {label}
        </WMText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: 88,
    borderRadius: semanticRadius.button.default,
    borderWidth: 1,
    overflow: "hidden",
    boxShadow: semanticElevation.row,
  },
  content: {
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: {
    ...typography.sectionTitle,
    color: foundationColors.ink.inverse,
    fontSize: 19,
    lineHeight: 25,
    textAlign: "center",
  },
  pressed: {
    boxShadow: semanticElevation.pressed,
  },
});
