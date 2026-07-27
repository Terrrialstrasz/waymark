import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { WaymarkSkinAsset } from "./WaymarkSkinAsset";
import { WaymarkSkinAssetFit, WaymarkSkinAssetSize } from "../../design/skin-assets";
import {
  isAssetBackedWaymarkSemanticIconName,
  isCodeOwnedWaymarkSemanticIconName,
  WaymarkSemanticIconName,
  resolveWaymarkSemanticIcon,
} from "../../design/waymark-icon-map";
import { SemanticIcon } from "./SemanticIcon";

export type WaymarkIconState = "default" | "active" | "selected" | "pressed" | "disabled" | "muted";

type Props =
  {
    semanticName: WaymarkSemanticIconName;
    decorative?: boolean;
    accessibilityLabel?: string;
    size?: WaymarkSkinAssetSize | "custom";
    fit?: WaymarkSkinAssetFit;
    state?: WaymarkIconState;
    customWidth?: number;
    customHeight?: number;
    style?: StyleProp<ViewStyle>;
  };

export function WaymarkIcon({
  semanticName,
  size = "md",
  fit = "contain",
  state = "default",
  customWidth,
  customHeight,
  style,
  decorative = true,
  accessibilityLabel,
}: Props) {
  if (isCodeOwnedWaymarkSemanticIconName(semanticName)) {
    return (
      <View style={[styles.base, stateTransforms[state], style]}>
        <SemanticIcon
          accessibilityLabel={accessibilityLabel}
          customHeight={customHeight}
          customWidth={customWidth}
          decorative={decorative}
          semanticName={semanticName}
          size={size}
          state={state}
        />
      </View>
    );
  }

  if (!isAssetBackedWaymarkSemanticIconName(semanticName)) {
    return null;
  }

  return (
    <View style={[styles.base, stateTransforms[state], style]}>
      <WaymarkSkinAsset
        accessibilityLabel={accessibilityLabel}
        assetId={resolveWaymarkSemanticIcon(semanticName)}
        customHeight={customHeight}
        customWidth={customWidth}
        decorative={decorative}
        fit={fit}
        size={size}
        visualTone={state === "disabled" ? "disabled" : state === "muted" ? "muted" : "default"}
      />
    </View>
  );
}

const stateTransforms = StyleSheet.create({
  default: {},
  active: {
    transform: [{ scale: 1.02 }],
  },
  selected: {
    transform: [{ scale: 1.04 }],
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  disabled: {},
  muted: {},
});

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
});
