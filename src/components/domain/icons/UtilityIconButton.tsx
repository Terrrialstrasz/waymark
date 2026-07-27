import { IconBadge } from "../../primitives/IconBadge";
import { WaymarkUtilitySemanticName } from "../../../design/waymark-icon-map";

type Props = {
  icon: WaymarkUtilitySemanticName;
  accessibilityLabel: string;
  disabled?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
};

export function UtilityIconButton({ icon, accessibilityLabel, disabled, onPress, size = "md" }: Props) {
  return (
    <IconBadge
      accessibilityLabel={accessibilityLabel}
      decorative={false}
      onPress={onPress}
      semanticName={`utility.${icon}`}
      shape="rounded"
      size={size}
      state={disabled ? "disabled" : "default"}
      tone="default"
    />
  );
}
