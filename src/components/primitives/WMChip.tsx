import { Pressable, StyleSheet } from "react-native";
import { foundationColors, getWaymarkPressStyle, semanticBorder, semanticRadius, semanticSpacing, useReducedMotionEnabled } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { WMText } from "./Text";

type Props = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

export function WMChip({ label, selected, disabled, onPress }: Props) {
  const reducedMotion = useReducedMotionEnabled();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        disabled && styles.disabled,
        disabled ? getBorderStyle(semanticBorder.button.disabled) : null,
        getWaymarkPressStyle({ pressed, reducedMotion, variant: "secondary" }),
      ]}
    >
      <WMText variant="chip">{label}</WMText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: semanticRadius.chip,
    paddingHorizontal: semanticSpacing.chip.paddingX,
    paddingVertical: semanticSpacing.chip.paddingY,
    alignSelf: "flex-start",
  },
  selected: {
    backgroundColor: foundationColors.green.soft,
    ...getBorderStyle(semanticBorder.row.selected),
  },
  unselected: {
    backgroundColor: foundationColors.bg.paperSoft,
    ...getBorderStyle(semanticBorder.chip.default),
  },
  disabled: {
    opacity: 0.55,
  },
});
