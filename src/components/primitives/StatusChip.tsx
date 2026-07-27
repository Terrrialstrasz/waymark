import { StyleProp, ViewStyle } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { SemanticState } from "../../theme/tokens";
import { EntityChip, EntityChipSize } from "./EntityChip";

type Props = {
  label: string;
  stateTone?: Exclude<SemanticState, "hidden">;
  iconSemanticName?: WaymarkSemanticIconName;
  size?: EntityChipSize;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function StatusChip({
  label,
  stateTone,
  iconSemanticName,
  size = "standard",
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  return (
    <EntityChip
      accessibilityLabel={accessibilityLabel}
      iconSemanticName={iconSemanticName}
      label={label}
      onPress={onPress}
      size={size}
      stateTone={stateTone}
      style={style}
      variant="status"
    />
  );
}
