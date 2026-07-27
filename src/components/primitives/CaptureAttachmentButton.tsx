import { Pressable, StyleSheet } from "react-native";
import { captureChooserTokens, getWaymarkPressStyle, spacing, useReducedMotionEnabled } from "../../theme/tokens";
import { WaymarkIcon } from "./WaymarkIcon";
import { WMText } from "./Text";

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  selected?: boolean;
};

export function CaptureAttachmentButton({ label, onPress, disabled = false, accessibilityLabel, selected = false }: Props) {
  const reducedMotion = useReducedMotionEnabled();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        disabled ? styles.disabled : null,
        selected ? styles.selected : null,
        getWaymarkPressStyle({ pressed, reducedMotion, variant: "secondary" }),
      ]}
    >
      <WaymarkIcon decorative semanticName="utility.camera" size="lg" state={disabled ? "disabled" : selected ? "active" : "muted"} />
      <WMText style={styles.label} variant="bodyStrong">
        {label}
      </WMText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "center",
    minWidth: captureChooserTokens.size.attachmentMinWidth,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: captureChooserTokens.color.border,
    borderRadius: captureChooserTokens.radius.attachment,
    backgroundColor: captureChooserTokens.color.surfaceWarm,
    boxShadow: "0px 1px 4px rgba(80, 58, 22, 0.04)",
  },
  label: {
    color: captureChooserTokens.color.attachmentText,
  },
  disabled: {
    opacity: 0.56,
  },
  selected: {
    borderColor: captureChooserTokens.color.attachmentText,
  },
});
