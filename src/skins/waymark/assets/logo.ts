import { ImageSourcePropType } from "react-native";

export type WaymarkLogoVariant = "primary" | "appIcon" | "mono";
export type WaymarkLogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";

export type WaymarkLogoAssetDescriptor = {
  id: string;
  variant: WaymarkLogoVariant;
  fileName: string;
  assetPath: string;
  width: number;
  height: number;
  aspectRatio: number;
  source?: ImageSourcePropType;
};

// The canonical runtime filenames live under `src/assets/skins/waymark/logo`.
// Re-sync them from `ai-resources/Waymark Icon skins/09_Logo` with
// `npm run assets:sync:waymark-skins` if the bundled files go missing.
export const waymarkLogoAssets: Record<WaymarkLogoVariant, WaymarkLogoAssetDescriptor> = {
  primary: {
    id: "waymarkStoneStampPrimary",
    variant: "primary",
    fileName: "waymark-stone-stamp-primary.webp",
    assetPath: "src/assets/skins/waymark/logo/waymark-stone-stamp-primary.webp",
    width: 1024,
    height: 1024,
    aspectRatio: 1,
    source: require("../../../assets/skins/waymark/logo/waymark-stone-stamp-primary.webp") as ImageSourcePropType,
  },
  appIcon: {
    id: "waymarkAppIconStoneStamp",
    variant: "appIcon",
    fileName: "waymark-app-icon-stone-stamp.webp",
    assetPath: "src/assets/skins/waymark/logo/waymark-app-icon-stone-stamp.webp",
    width: 1024,
    height: 1024,
    aspectRatio: 1,
    source: require("../../../assets/skins/waymark/logo/waymark-app-icon-stone-stamp.webp") as ImageSourcePropType,
  },
  mono: {
    id: "waymarkStoneStampMono",
    variant: "mono",
    fileName: "waymark-stone-stamp-mono.webp",
    assetPath: "src/assets/skins/waymark/logo/waymark-stone-stamp-mono.webp",
    width: 1024,
    height: 1024,
    aspectRatio: 1,
    source: require("../../../assets/skins/waymark/logo/waymark-stone-stamp-mono.webp") as ImageSourcePropType,
  },
};

export function getWaymarkLogoAsset(variant: WaymarkLogoVariant) {
  return waymarkLogoAssets[variant];
}

export function hasWaymarkLogoAssetSource(variant: WaymarkLogoVariant) {
  return Boolean(waymarkLogoAssets[variant].source);
}
