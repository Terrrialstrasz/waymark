import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageResizeMode,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { getImageUsageConfig, WaymarkImageUsage } from "../../assets/imageUsage";
import {
  getWaymarkImageAsset,
  resolveWaymarkImageVariantSource,
  WaymarkImageAsset,
  WaymarkImageAssetId,
} from "../../assets/imageRegistry";
import { foundationColors } from "../../theme/tokens";

type Props = {
  assetId?: WaymarkImageAssetId | string;
  src?: ImageSourcePropType | string;
  alt: string;
  usage: WaymarkImageUsage;
  priority?: boolean;
  decorative?: boolean;
  rounded?: boolean;
  objectFit?: "cover" | "contain";
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  fallback?: React.ReactNode;
  onError?: () => void;
  testID?: string;
};

export function WaymarkImage({
  assetId,
  src,
  alt,
  usage,
  priority = false,
  decorative = false,
  rounded = false,
  objectFit,
  style,
  imageStyle,
  fallback,
  onError,
  testID,
}: Props) {
  const usageConfig = getImageUsageConfig(usage);
  const asset = assetId ? getWaymarkImageAsset(assetId) : undefined;
  const preferredVariant = src || usageConfig.useOriginalSource ? undefined : usageConfig.preferredVariant;
  const primarySource = useMemo(
    () => resolvePrimarySource(asset, src, preferredVariant, usageConfig.useOriginalSource === true),
    [asset, preferredVariant, src, usageConfig.useOriginalSource]
  );
  const fallbackSource = useMemo(() => resolveFallbackSource(asset), [asset]);
  const candidates = useMemo(
    () => [primarySource, fallbackSource].filter(Boolean) as ImageSourcePropType[],
    [fallbackSource, primarySource]
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [didFinalError, setDidFinalError] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setDidFinalError(false);
  }, [primarySource, fallbackSource]);

  const resolvedSource = candidates[candidateIndex];
  const resizeMode = (objectFit ?? usageConfig.objectFit) as ImageResizeMode;

  useWaymarkImageDevWarnings({
    alt,
    asset,
    assetId,
    decorative,
    preferredVariant,
    priority,
    src,
    usage,
  });

  if (!resolvedSource || didFinalError) {
    return <>{fallback ?? <DefaultImageFallback rounded={rounded} style={style} usage={usage} />}</>;
  }

  return (
    <View
      accessible={!decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "auto"}
      style={[styles.frame, rounded ? styles.rounded : null, style]}
      testID={testID}
    >
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={decorative ? undefined : alt}
        accessible={!decorative}
        onError={() => {
          const hasNextCandidate = candidateIndex < candidates.length - 1;

          if (hasNextCandidate) {
            if (__DEV__) {
              console.debug(
                `[WaymarkImage] source failed for usage="${usage}"${assetId ? ` asset="${assetId}"` : ""}; trying fallback candidate ${candidateIndex + 2}/${candidates.length}.`
              );
            }
            setCandidateIndex((current) => current + 1);
            return;
          }

          setDidFinalError(true);
          onError?.();
        }}
        resizeMode={resizeMode}
        source={resolvedSource}
        style={[styles.image, rounded ? styles.rounded : null, imageStyle]}
      />
    </View>
  );
}

function resolvePrimarySource(
  asset: WaymarkImageAsset | undefined,
  src: Props["src"],
  preferredVariant?: ReturnType<typeof getImageUsageConfig>["preferredVariant"],
  preferOriginalSource = false
) {
  if (src) {
    return typeof src === "string" ? { uri: src } : src;
  }

  if (!asset) {
    return undefined;
  }

  if (preferOriginalSource) {
    return asset.fallbackSrc ?? asset.src;
  }

  return resolveWaymarkImageVariantSource(asset, preferredVariant);
}

function resolveFallbackSource(asset: WaymarkImageAsset | undefined) {
  return asset?.fallbackSrc;
}

function DefaultImageFallback({
  usage,
  rounded,
  style,
}: {
  usage: WaymarkImageUsage;
  rounded: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const tone = getImageUsageConfig(usage).fallback;

  return (
    <View
      accessible={false}
      style={[
        styles.fallbackFrame,
        rounded ? styles.rounded : null,
        tone === "icon" ? styles.iconFallback : styles.paperFallback,
        style,
      ]}
    />
  );
}

function useWaymarkImageDevWarnings({
  alt,
  asset,
  assetId,
  decorative,
  preferredVariant,
  priority,
  src,
  usage,
}: {
  alt: string;
  asset?: WaymarkImageAsset;
  assetId?: string;
  decorative: boolean;
  preferredVariant?: ReturnType<typeof getImageUsageConfig>["preferredVariant"];
  priority: boolean;
  src?: Props["src"];
  usage: WaymarkImageUsage;
}) {
  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    const usageConfig = getImageUsageConfig(usage);
    const sourceDescriptor = getSourceDescriptor(asset, src, preferredVariant);
    const resolvedDimensions = resolveDimensions(asset, src, preferredVariant);

    if (!decorative && !alt.trim()) {
      console.warn(`[WaymarkImage] Missing alt text for usage "${usage}".`);
    }

    if (!assetId && src && looksLikeOriginalUpload(sourceDescriptor)) {
      console.warn(`[WaymarkImage] Direct source for usage "${usage}" looks like an original upload. Route it through an optimized variant first.`);
    }

    if (usage === "compactCardBackground" && resolvedDimensions?.width && resolvedDimensions.width > 720) {
      console.warn(`[WaymarkImage] Compact card image is ${resolvedDimensions.width}px wide. Use a 480px default or 720px max variant.`);
    }

    if (usage === "hero" && resolvedDimensions?.width && resolvedDimensions.width > 2048) {
      console.warn(`[WaymarkImage] Hero image is ${resolvedDimensions.width}px wide. Clamp hero or preview variants to 2048px max.`);
    }

    if (asset?.hasExcessiveTransparentPadding) {
      console.warn(`[WaymarkImage] Asset "${asset.id}" appears to include excessive transparent padding. Crop it tighter for sharper icon rendering.`);
    }

    if (priority && !usageConfig.shouldUsePriority) {
      console.warn(`[WaymarkImage] "${usage}" was marked priority. Reserve eager loading for above-the-fold hero, header, or logo assets.`);
    }
  }, [alt, asset, assetId, decorative, preferredVariant, priority, src, usage]);
}

function looksLikeOriginalUpload(sourceDescriptor?: string) {
  if (!sourceDescriptor) {
    return false;
  }

  return /(uploads?|original|camera|fullsize|full-size|IMG_|DSC_|\/tmp\/|\\tmp\\|file:\/\/)/iu.test(sourceDescriptor);
}

function getSourceDescriptor(
  asset: WaymarkImageAsset | undefined,
  src: Props["src"],
  preferredVariant?: ReturnType<typeof getImageUsageConfig>["preferredVariant"]
) {
  if (typeof src === "string") {
    return src;
  }

  if (src && typeof src === "object" && "uri" in src && typeof src.uri === "string") {
    return src.uri;
  }

  if (preferredVariant && asset?.variantSourcePaths?.[preferredVariant]) {
    return asset.variantSourcePaths[preferredVariant];
  }

  return asset?.sourcePath;
}

function resolveDimensions(
  asset: WaymarkImageAsset | undefined,
  src: Props["src"],
  preferredVariant?: ReturnType<typeof getImageUsageConfig>["preferredVariant"]
) {
  if (preferredVariant && asset?.variantDimensions?.[preferredVariant]) {
    return asset.variantDimensions[preferredVariant];
  }

  if (asset?.width && asset?.height) {
    return {
      width: asset.width,
      height: asset.height,
    };
  }

  const source = typeof src === "string" ? { uri: src } : src;

  if (!source) {
    return undefined;
  }

  try {
    const resolved = Image.resolveAssetSource(source);

    if (!resolved?.width || !resolved?.height) {
      return undefined;
    }

    return {
      width: resolved.width,
      height: resolved.height,
    };
  } catch {
    return undefined;
  }
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  rounded: {
    borderRadius: 18,
  },
  fallbackFrame: {
    minWidth: 24,
    minHeight: 24,
  },
  paperFallback: {
    backgroundColor: foundationColors.bg.paperSoft,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
  },
  iconFallback: {
    backgroundColor: foundationColors.bg.paperWarm,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
  },
});
