import { ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import {
  WaymarkSkinAssetFit,
  WaymarkSkinAssetId,
  WaymarkSkinAssetSize,
  getWaymarkSkinAsset,
} from "../../design/skin-assets";
import { foundationColors, iconSize, semanticTokens } from "../../theme/tokens";
import { WaymarkImage } from "./WaymarkImage";
import { WaymarkImageUsage } from "../../assets/imageUsage";

type VisualTone = "default" | "muted" | "disabled";

type SharedProps = {
  assetId: WaymarkSkinAssetId;
  size?: WaymarkSkinAssetSize | "custom";
  fit?: WaymarkSkinAssetFit;
  customWidth?: number;
  customHeight?: number;
  visualTone?: VisualTone;
  decorative?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  testID?: string;
};

const sizeTokens: Record<WaymarkSkinAssetSize, number> = {
  xs: iconSize.xs,
  sm: iconSize.sm,
  md: iconSize.md,
  lg: iconSize.lg,
  xl: iconSize.xl,
  hero: semanticTokens.size.captureLeaf.navSlot,
};

const opacityTokens: Record<VisualTone, number> = {
  default: 1,
  muted: 0.64,
  disabled: 0.34,
};

export function WaymarkSkinAsset({
  assetId,
  size = "md",
  fit = "contain",
  customWidth,
  customHeight,
  visualTone = "default",
  style,
  imageStyle,
  testID,
  decorative,
  accessibilityLabel,
}: SharedProps) {
  const asset = getWaymarkSkinAsset(assetId);

  if (!asset) {
    return null;
  }

  const resolvedDecorative = decorative ?? asset.decorativeDefault;
  const resolvedDimensions =
    size === "custom"
      ? getCustomDimensions(asset.width, asset.height, customWidth, customHeight)
      : getContainedDimensions(asset.width, asset.height, sizeTokens[size]);
  const usage = getUsageFromAsset(asset.intendedUsage);

  return (
    <View
      accessible={!resolvedDecorative}
      importantForAccessibility={resolvedDecorative ? "no-hide-descendants" : "auto"}
      style={[styles.frame, resolvedDimensions.frame, style]}
      testID={testID}
    >
      <WaymarkImage
        alt={resolvedDecorative ? asset.name : accessibilityLabel ?? asset.name}
        assetId={asset.id}
        decorative={resolvedDecorative}
        imageStyle={[
          resolvedDimensions.image,
          {
            opacity: opacityTokens[visualTone],
            backgroundColor: foundationColors.shadow.none,
          },
          imageStyle,
        ]}
        objectFit={fit === "cover" ? "cover" : "contain"}
        style={resolvedDimensions.frame}
        usage={usage}
      />
    </View>
  );
}

function getUsageFromAsset(intendedUsage: string): WaymarkImageUsage {
  switch (intendedUsage) {
    case "bottomNavigation":
      return "bottomNavigation";
    case "pathIdentityMedallions":
      return "pathIcon";
    case "closureAndResultContexts":
      return "statusSeal";
    case "decorativeLayoutMotifs":
      return "botanical";
    default:
      return "icon";
  }
}

function getContainedDimensions(width: number, height: number, maxBox: number) {
  const ratio = width / height;

  if (ratio >= 1) {
    return {
      frame: { width: maxBox, height: maxBox } satisfies ViewStyle,
      image: { width: maxBox, height: maxBox / ratio } satisfies ImageStyle,
    };
  }

  return {
    frame: { width: maxBox, height: maxBox } satisfies ViewStyle,
    image: { width: maxBox * ratio, height: maxBox } satisfies ImageStyle,
  };
}

function getCustomDimensions(width: number, height: number, customWidth?: number, customHeight?: number) {
  if (customWidth && customHeight) {
    return {
      frame: { width: customWidth, height: customHeight } satisfies ViewStyle,
      image: { width: customWidth, height: customHeight } satisfies ImageStyle,
    };
  }

  if (customWidth) {
    return {
      frame: { width: customWidth, height: customWidth * (height / width) } satisfies ViewStyle,
      image: { width: customWidth, height: customWidth * (height / width) } satisfies ImageStyle,
    };
  }

  if (customHeight) {
    return {
      frame: { width: customHeight * (width / height), height: customHeight } satisfies ViewStyle,
      image: { width: customHeight * (width / height), height: customHeight } satisfies ImageStyle,
    };
  }

  return {
    frame: { width, height } satisfies ViewStyle,
    image: { width, height } satisfies ImageStyle,
  };
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});
