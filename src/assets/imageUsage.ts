import { ImageVariant } from "./imageRegistry";

export type WaymarkImageUsage =
  | "icon"
  | "bottomNavigation"
  | "pathIcon"
  | "statusSeal"
  | "botanical"
  | "logo"
  | "compactCardBackground"
  | "journalCard"
  | "detailImage"
  | "hero"
  | "fullscreenPreview";

export type WaymarkImageLoadingStrategy = "eager" | "lazy" | "onDemand";

export type WaymarkImageUsageConfig = {
  preferredVariant: ImageVariant;
  useOriginalSource?: boolean;
  objectFit: "cover" | "contain";
  loading: WaymarkImageLoadingStrategy;
  sizes?: string;
  maxWidth?: number;
  allowTransparency: boolean;
  shouldUsePriority: boolean;
  fallback: "paper" | "icon";
};

const usageConfigMap: Record<WaymarkImageUsage, WaymarkImageUsageConfig> = {
  icon: {
    preferredVariant: "iconMd",
    objectFit: "contain",
    loading: "eager",
    maxWidth: 144,
    allowTransparency: true,
    shouldUsePriority: false,
    fallback: "icon",
  },
  bottomNavigation: {
    preferredVariant: "iconLg",
    useOriginalSource: true,
    objectFit: "contain",
    loading: "eager",
    maxWidth: 192,
    allowTransparency: true,
    shouldUsePriority: false,
    fallback: "icon",
  },
  pathIcon: {
    preferredVariant: "iconLg",
    objectFit: "contain",
    loading: "eager",
    maxWidth: 216,
    allowTransparency: true,
    shouldUsePriority: false,
    fallback: "icon",
  },
  statusSeal: {
    preferredVariant: "sealMd",
    objectFit: "contain",
    loading: "lazy",
    maxWidth: 216,
    allowTransparency: true,
    shouldUsePriority: false,
    fallback: "icon",
  },
  botanical: {
    preferredVariant: "motifLg",
    useOriginalSource: true,
    objectFit: "contain",
    loading: "lazy",
    maxWidth: 720,
    allowTransparency: true,
    shouldUsePriority: false,
    fallback: "paper",
  },
  logo: {
    preferredVariant: "iconLg",
    objectFit: "contain",
    loading: "eager",
    maxWidth: 512,
    allowTransparency: true,
    shouldUsePriority: true,
    fallback: "icon",
  },
  compactCardBackground: {
    preferredVariant: "compact",
    objectFit: "cover",
    loading: "lazy",
    sizes: "(max-width: 480px) 92vw, 420px",
    maxWidth: 720,
    allowTransparency: false,
    shouldUsePriority: false,
    fallback: "paper",
  },
  journalCard: {
    preferredVariant: "card",
    objectFit: "cover",
    loading: "lazy",
    sizes: "(max-width: 480px) 92vw, 640px",
    maxWidth: 1200,
    allowTransparency: false,
    shouldUsePriority: false,
    fallback: "paper",
  },
  detailImage: {
    preferredVariant: "large",
    objectFit: "cover",
    loading: "lazy",
    sizes: "(max-width: 768px) 100vw, 768px",
    maxWidth: 1600,
    allowTransparency: false,
    shouldUsePriority: false,
    fallback: "paper",
  },
  hero: {
    preferredVariant: "hero",
    objectFit: "cover",
    loading: "eager",
    sizes: "100vw",
    maxWidth: 1600,
    allowTransparency: false,
    shouldUsePriority: true,
    fallback: "paper",
  },
  fullscreenPreview: {
    preferredVariant: "full",
    objectFit: "contain",
    loading: "onDemand",
    maxWidth: 2048,
    allowTransparency: false,
    shouldUsePriority: false,
    fallback: "paper",
  },
};

export function getImageUsageConfig(usage: WaymarkImageUsage) {
  return usageConfigMap[usage];
}
