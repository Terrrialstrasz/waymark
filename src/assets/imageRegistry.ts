import { ImageSourcePropType } from "react-native";
import { waymarkSkinAssets } from "../design/skin-assets";
import {
  GeneratedWaymarkImageVariant,
  getGeneratedWaymarkImageVariants,
} from "./generated/waymarkGeneratedImageVariants";

export type ImageAssetCategory =
  | "icon"
  | "pathIcon"
  | "statusSeal"
  | "botanical"
  | "logo"
  | "hero"
  | "journal"
  | "memory"
  | "expedition";

export type ImageVariant =
  | "iconSm"
  | "iconMd"
  | "iconLg"
  | "sealMd"
  | "motifLg"
  | "thumb"
  | "compact"
  | "card"
  | "hero"
  | "large"
  | "full";

type ImageDimensions = {
  width: number;
  height: number;
};

export type WaymarkImageAsset = {
  id: string;
  category: ImageAssetCategory;
  src: ImageSourcePropType;
  alt: string;
  width?: number;
  height?: number;
  hasTransparency?: boolean;
  recommendedUse?: string;
  availableVariants?: Partial<Record<ImageVariant, ImageSourcePropType>>;
  variantDimensions?: Partial<Record<ImageVariant, ImageDimensions>>;
  variantSourcePaths?: Partial<Record<ImageVariant, string>>;
  fallbackSrc?: ImageSourcePropType;
  sourcePath?: string;
  notes?: string;
  hasExcessiveTransparentPadding?: boolean;
};

type ManualImageAssetDefinition = {
  id: string;
  category: "logo" | "hero" | "pathIcon";
  alt: string;
  recommendedUse: string;
  fallbackAssetId?: string;
  fallbackSrc?: ImageSourcePropType;
  fallbackSourcePath?: string;
};

const manualImageAssetDefinitions: readonly ManualImageAssetDefinition[] = [
  {
    id: "pathIcon.board.careerCraft",
    category: "pathIcon",
    alt: "Career Craft path board icon",
    recommendedUse: "Path board icon",
    fallbackSrc: require("../../assets/skins/path-icon/career-craft_seal_icon.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-icon/career-craft_seal_icon.webp",
  },
  {
    id: "pathIcon.board.snagGolf",
    category: "pathIcon",
    alt: "SNAG Golf Vietnam path board icon",
    recommendedUse: "Path board icon",
    fallbackSrc: require("../../assets/skins/path-icon/snag-golf-vietnam_seal_icon.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-icon/snag-golf-vietnam_seal_icon.webp",
  },
  {
    id: "pathIcon.board.healthBody",
    category: "pathIcon",
    alt: "Health and Body path board icon",
    recommendedUse: "Path board icon",
    fallbackSrc: require("../../assets/skins/path-icon/health-body_seal_icon.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-icon/health-body_seal_icon.webp",
  },
  {
    id: "pathIcon.board.familyHome",
    category: "pathIcon",
    alt: "Family and Home path board icon",
    recommendedUse: "Path board icon",
    fallbackSrc: require("../../assets/skins/path-icon/family-home_seal_icon.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-icon/family-home_seal_icon.webp",
  },
  {
    id: "pathIcon.board.characterStoicism",
    category: "pathIcon",
    alt: "Character and Stoicism path board icon",
    recommendedUse: "Path board icon",
    fallbackSrc: require("../../assets/skins/path-icon/character-stoicism_seal_icon.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-icon/character-stoicism_seal_icon.webp",
  },
  {
    id: "pathIcon.board.golfCraft",
    category: "pathIcon",
    alt: "Golf Craft path board icon",
    recommendedUse: "Path board icon",
    fallbackSrc: require("../../assets/skins/path-icon/golf-craft_seal_icon.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-icon/golf-craft_seal_icon.webp",
  },
  {
    id: "pathIcon.board.cultureRomance",
    category: "pathIcon",
    alt: "Culture, Class and Romance path board icon",
    recommendedUse: "Path board icon",
    fallbackSrc: require("../../assets/skins/path-icon/culture-class-romance_seal_icon.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-icon/culture-class-romance_seal_icon.webp",
  },
  {
    id: "hero.path.careerCraft",
    category: "hero",
    alt: "Career Craft hero art",
    recommendedUse: "Today Path hero",
    fallbackSrc: require("../../assets/skins/path-hero/career-craft_hero_picture.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-hero/career-craft_hero_picture.webp",
  },
  {
    id: "hero.path.snagGolf",
    category: "hero",
    alt: "SNAG Golf Vietnam hero art",
    recommendedUse: "Today Path hero",
    fallbackSrc: require("../../assets/skins/path-hero/snag-golf-vietnam_hero_picture.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-hero/snag-golf-vietnam_hero_picture.webp",
  },
  {
    id: "hero.path.healthBody",
    category: "hero",
    alt: "Health and Body hero art",
    recommendedUse: "Today Path hero",
    fallbackSrc: require("../../assets/skins/path-hero/health-body_hero_picture.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-hero/health-body_hero_picture.webp",
  },
  {
    id: "hero.path.familyHome",
    category: "hero",
    alt: "Family and Home hero art",
    recommendedUse: "Today Path hero",
    fallbackSrc: require("../../assets/skins/path-hero/family-home_hero_picture.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-hero/family-home_hero_picture.webp",
  },
  {
    id: "hero.path.characterStoicism",
    category: "hero",
    alt: "Character and Stoicism hero art",
    recommendedUse: "Today Path hero",
    fallbackSrc: require("../../assets/skins/path-hero/character-stoicism_hero_picture.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-hero/character-stoicism_hero_picture.webp",
  },
  {
    id: "hero.path.golfCraft",
    category: "hero",
    alt: "Golf Craft hero art",
    recommendedUse: "Today Path hero",
    fallbackSrc: require("../../assets/skins/path-hero/golf-craft_hero_picture.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-hero/golf-craft_hero_picture.webp",
  },
  {
    id: "hero.path.cultureRomance",
    category: "hero",
    alt: "Culture, Class and Romance hero art",
    recommendedUse: "Today Path hero",
    fallbackSrc: require("../../assets/skins/path-hero/culture-class-romance_hero_picture.webp") as ImageSourcePropType,
    fallbackSourcePath: "assets/skins/path-hero/culture-class-romance_hero_picture.webp",
  },
  {
    id: "logo.primary",
    category: "logo",
    alt: "Waymark primary mark",
    recommendedUse: "Brand logo and mark",
    fallbackAssetId: "logo.appIcon",
  },
  {
    id: "logo.appIcon",
    category: "logo",
    alt: "Waymark app icon",
    recommendedUse: "App icon mark",
    fallbackAssetId: "logo.primary",
  },
  {
    id: "logo.mono",
    category: "logo",
    alt: "Waymark mono mark",
    recommendedUse: "Monotone logo mark",
    fallbackAssetId: "logo.primary",
  },
] as const;

function getCategoryFromSkinFamily(family: string): ImageAssetCategory | null {
  switch (family) {
    case "pathIdentity":
      return "pathIcon";
    case "judgmentSeal":
      return "statusSeal";
    case "botanicalMotif":
      return "botanical";
    case "utility":
    case "navigation":
    case "entity":
    case "status":
    case "healthSession":
      return "icon";
    default:
      return null;
  }
}

function getPreferredVariant(category: ImageAssetCategory): ImageVariant {
  switch (category) {
    case "pathIcon":
      return "iconLg";
    case "statusSeal":
      return "sealMd";
    case "botanical":
      return "motifLg";
    case "logo":
      return "iconLg";
    case "hero":
      return "hero";
    default:
      return "iconMd";
  }
}

function getFallbackVariantSources(
  category: ImageAssetCategory,
  source: ImageSourcePropType
): Partial<Record<ImageVariant, ImageSourcePropType>> {
  if (category === "pathIcon") {
    return {
      iconMd: source,
      iconLg: source,
    };
  }

  if (category === "statusSeal") {
    return {
      iconLg: source,
      sealMd: source,
    };
  }

  if (category === "botanical") {
    return {
      motifLg: source,
    };
  }

  if (category === "hero") {
    return {
      compact: source,
      card: source,
      hero: source,
      large: source,
      full: source,
    };
  }

  return {
    iconSm: source,
    iconMd: source,
    iconLg: source,
  };
}

function getGeneratedVariantBundle(assetId: string) {
  const variants = getGeneratedWaymarkImageVariants(assetId) as Partial<Record<ImageVariant, GeneratedWaymarkImageVariant>> | undefined;

  if (!variants) {
    return undefined;
  }

  const sources = {} as Partial<Record<ImageVariant, ImageSourcePropType>>;
  const dimensions = {} as Partial<Record<ImageVariant, ImageDimensions>>;
  const sourcePaths = {} as Partial<Record<ImageVariant, string>>;

  for (const [variantKey, variant] of Object.entries(variants) as Array<[ImageVariant, GeneratedWaymarkImageVariant | undefined]>) {
    if (!variant) {
      continue;
    }

    const typedKey = variantKey as ImageVariant;
    sources[typedKey] = variant.source;
    dimensions[typedKey] = {
      width: variant.width,
      height: variant.height,
    };
    sourcePaths[typedKey] = variant.sourcePath;
  }

  return {
    sources,
    dimensions,
    sourcePaths,
    variants,
  };
}

function pickPrimarySource(
  preferredVariant: ImageVariant,
  fallbackSource: ImageSourcePropType,
  generatedBundle?: ReturnType<typeof getGeneratedVariantBundle>
) {
  return generatedBundle?.sources[preferredVariant] ?? fallbackSource;
}

function pickPrimaryDimensions(
  preferredVariant: ImageVariant,
  width: number | undefined,
  height: number | undefined,
  generatedBundle?: ReturnType<typeof getGeneratedVariantBundle>
) {
  return generatedBundle?.dimensions[preferredVariant] ?? (width && height ? { width, height } : undefined);
}

function pickPrimarySourcePath(
  preferredVariant: ImageVariant,
  fallbackPath: string | undefined,
  generatedBundle?: ReturnType<typeof getGeneratedVariantBundle>
) {
  return generatedBundle?.sourcePaths[preferredVariant] ?? fallbackPath;
}

function resolveLogoFallbackSource(fallbackAssetId?: string) {
  if (!fallbackAssetId) {
    return undefined;
  }

  const fallbackVariants = getGeneratedWaymarkImageVariants(fallbackAssetId);
  return fallbackVariants?.iconLg?.source;
}

function toWaymarkImageAsset(
  input: {
    id: string;
    category: ImageAssetCategory;
    alt: string;
    baseSource?: ImageSourcePropType;
    fallbackSrc?: ImageSourcePropType;
    fallbackSourcePath?: string;
    hasTransparency: boolean;
    notes?: string;
    recommendedUse?: string;
    width?: number;
    height?: number;
  },
  generatedBundle?: ReturnType<typeof getGeneratedVariantBundle>
) {
  const preferredVariant = getPreferredVariant(input.category);
  const primaryDimensions = pickPrimaryDimensions(preferredVariant, input.width, input.height, generatedBundle);
  const baseSource = pickPrimarySource(preferredVariant, input.baseSource!, generatedBundle);
  const fallbackVariants = getFallbackVariantSources(input.category, baseSource);
  const availableVariants = generatedBundle?.sources ?? fallbackVariants;

  return {
    id: input.id,
    category: input.category,
    src: baseSource,
    alt: input.alt,
    width: primaryDimensions?.width,
    height: primaryDimensions?.height,
    hasTransparency: input.hasTransparency,
    recommendedUse: input.recommendedUse,
    availableVariants,
    variantDimensions: generatedBundle?.dimensions,
    variantSourcePaths: generatedBundle?.sourcePaths,
    fallbackSrc: input.fallbackSrc,
    sourcePath: pickPrimarySourcePath(preferredVariant, input.fallbackSourcePath, generatedBundle),
    notes: input.notes,
    hasExcessiveTransparentPadding: input.category === "botanical" && !generatedBundle?.sources.motifLg,
  } satisfies WaymarkImageAsset;
}

const skinAssetEntries = Object.values(waymarkSkinAssets).flatMap((asset) => {
  const category = getCategoryFromSkinFamily(asset.family);

  if (!category) {
    return [];
  }

  const generatedBundle = getGeneratedVariantBundle(asset.id);

  return [
    [
      asset.id,
      toWaymarkImageAsset(
        {
          id: asset.id,
          category,
          alt: asset.name,
          baseSource: asset.source,
          fallbackSrc: asset.source,
          fallbackSourcePath: asset.path,
          hasTransparency: true,
          notes: asset.notes,
          recommendedUse: asset.intendedUsage,
          width: asset.width,
          height: asset.height,
        },
        generatedBundle
      ),
    ] as const,
  ];
});

const manualAssetEntries = manualImageAssetDefinitions.map((definition) => {
  const generatedBundle = getGeneratedVariantBundle(definition.id);

  if (!generatedBundle) {
    throw new Error(`Missing generated variants for ${definition.id}. Run npm run assets:sync:waymark-skins.`);
  }

  return [
    definition.id,
    toWaymarkImageAsset(
      {
        id: definition.id,
        category: definition.category,
        alt: definition.alt,
        baseSource: generatedBundle.sources[getPreferredVariant(definition.category)]!,
        fallbackSrc: definition.fallbackSrc,
        fallbackSourcePath: definition.fallbackSourcePath ?? pickPrimarySourcePath(getPreferredVariant(definition.category), undefined, generatedBundle),
        hasTransparency: definition.category !== "hero",
        recommendedUse: definition.recommendedUse,
      },
      generatedBundle
    ),
  ] as const;
});

export const waymarkImageRegistry = Object.fromEntries([
  ...skinAssetEntries,
  ...manualAssetEntries,
]) as Record<string, WaymarkImageAsset>;

for (const definition of manualImageAssetDefinitions) {
  if (!definition.fallbackAssetId) {
    continue;
  }

  const asset = waymarkImageRegistry[definition.id];
  asset.fallbackSrc = resolveLogoFallbackSource(definition.fallbackAssetId);
}

export type WaymarkImageAssetId = keyof typeof waymarkImageRegistry;

export function getWaymarkImageAsset(assetId: string) {
  return waymarkImageRegistry[assetId];
}

export function resolveWaymarkImageVariantSource(asset: WaymarkImageAsset, variant?: ImageVariant) {
  if (!variant) {
    return asset.src;
  }

  return asset.availableVariants?.[variant] ?? asset.src;
}
