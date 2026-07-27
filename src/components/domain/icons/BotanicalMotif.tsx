import { StyleProp, ViewStyle } from "react-native";
import { BotanicalMotifId } from "../../../design/botanical-motifs";
import { BotanicalMotif as BotanicalMotifPrimitive } from "../../primitives/BotanicalMotif";
import { BotanicalOpacityToken } from "../../../theme/tokens";

type Props = {
  motif: BotanicalMotifId;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero" | "background";
  opacity?: BotanicalOpacityToken;
  style?: StyleProp<ViewStyle>;
};

export function BotanicalMotif({ motif, size = "hero", opacity = "subtle", style }: Props) {
  return <BotanicalMotifPrimitive motif={motif} opacity={opacity} size={size} style={style} testID={`botanical-${motif}`} />;
}
