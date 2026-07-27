import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { getBotanicalMotif, BotanicalMotifId } from "../../design/botanical-motifs";
import { WaymarkSkinAsset } from "./WaymarkSkinAsset";
import {
  botanicalDecorationTokens,
  BotanicalLayerToken,
  BotanicalOpacityToken,
  BotanicalSizeToken,
} from "../../theme/tokens";

type Props = {
  motif: BotanicalMotifId;
  size?: BotanicalSizeToken;
  opacity?: BotanicalOpacityToken;
  fit?: "contain" | "cover";
  rotation?: "none" | "slightLeft" | "slightRight";
  mirror?: boolean;
  decorative?: boolean;
  clipToParent?: boolean;
  layer?: BotanicalLayerToken;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function BotanicalMotif({
  motif,
  size,
  opacity,
  fit = "contain",
  rotation = "none",
  mirror = false,
  decorative = true,
  clipToParent = true,
  layer = "background",
  style,
  testID,
}: Props) {
  const descriptor = getBotanicalMotif(motif);

  if (!descriptor) {
    return null;
  }

  const resolvedSize = size ?? getSizeForOpacity(descriptor.defaultDensity);
  const visualBox = botanicalDecorationTokens.size[resolvedSize];

  return (
    <View
      accessible={false}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.base,
        {
          opacity: botanicalDecorationTokens.opacity[opacity ?? descriptor.defaultOpacity],
          overflow: clipToParent ? "hidden" : "visible",
          zIndex: botanicalDecorationTokens.layer[layer],
          transform: getTransform(rotation, mirror),
        },
        style,
      ]}
      testID={testID}
    >
      <WaymarkSkinAsset
        assetId={descriptor.assetId}
        customWidth={visualBox}
        decorative={decorative}
        fit={fit}
        size="custom"
      />
    </View>
  );
}

function getSizeForOpacity(density: "none" | "trace" | "low" | "medium" | "seal"): BotanicalSizeToken {
  if (density === "seal") {
    return "lg";
  }

  if (density === "medium") {
    return "xl";
  }

  if (density === "low") {
    return "md";
  }

  return "sm";
}

function getTransform(rotation: Props["rotation"], mirror: boolean) {
  const transforms: Array<{ scaleX: number } | { rotate: string }> = [];

  if (mirror) {
    transforms.push({ scaleX: -1 });
  }

  if (rotation === "slightLeft") {
    transforms.push({ rotate: "-8deg" });
  }

  if (rotation === "slightRight") {
    transforms.push({ rotate: "8deg" });
  }

  return transforms;
}

const styles = StyleSheet.create({
  base: {
    position: "absolute",
  },
});
