import { Pressable, StyleSheet, View } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { captureChooserTokens, getWaymarkPressStyle, spacing, useReducedMotionEnabled } from "../../theme/tokens";
import { WaymarkIcon } from "./WaymarkIcon";
import { WMText } from "./Text";

type Props = {
  label: string;
  iconSemanticName: WaymarkSemanticIconName;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

export function CaptureDestinationButton({
  label,
  iconSemanticName,
  onPress,
  disabled = false,
  accessibilityLabel,
}: Props) {
  const reducedMotion = useReducedMotionEnabled();

  const body = (
    <View style={[styles.card, disabled ? styles.disabled : null]}>
      <WaymarkIcon semanticName={iconSemanticName} size="xl" state="default" decorative />
      <WMText numberOfLines={1} style={styles.label} variant="cardTitle">
        {label}
      </WMText>
    </View>
  );

  if (!onPress) {
    return <View style={styles.wrap}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        getWaymarkPressStyle({ pressed, reducedMotion, variant: "row" }),
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  card: {
    minHeight: captureChooserTokens.size.destinationMinHeight,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: captureChooserTokens.color.border,
    borderRadius: captureChooserTokens.radius.destination,
    backgroundColor: captureChooserTokens.color.surfaceWarm,
    boxShadow: "0px 2px 8px rgba(80, 58, 22, 0.04)",
  },
  label: {
    color: captureChooserTokens.color.title,
    fontSize: 17,
    lineHeight: 22,
  },
  disabled: {
    opacity: 0.56,
  },
});
