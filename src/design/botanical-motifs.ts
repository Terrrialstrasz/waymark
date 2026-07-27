import { getWaymarkSkinAsset } from "./skin-assets";
import {
  BotanicalDecorationPreset,
  BotanicalDensityToken,
  BotanicalOpacityToken,
  BotanicalPlacementToken,
} from "../theme/tokens";

export type BotanicalMotifId =
  | "botanical.headerLeafMark"
  | "botanical.pressedLeaf"
  | "botanical.sprig"
  | "botanical.sectionSprig"
  | "botanical.cornerBranch"
  | "botanical.wreathLeft"
  | "botanical.wreathRight"
  | "botanical.wreathSeal"
  | "botanical.leafVein"
  | "botanical.seedDot"
  | "botanical.trailCurve"
  | "botanical.branchTick"
  | "botanical.stampRing"
  | "botanical.ribbonBookmark"
  | "botanical.photoOverlay"
  | "botanical.headerSystemSprig";

export type BotanicalMotifRegistryItem = {
  id: BotanicalMotifId;
  file: string;
  name: string;
  family: "botanicalMotif";
  width: number;
  height: number;
  aspectRatio: number;
  allowedPresets: readonly BotanicalDecorationPreset[];
  defaultOpacity: BotanicalOpacityToken;
  defaultPlacement: BotanicalPlacementToken;
  defaultDensity: BotanicalDensityToken;
  decorativeOnly: true;
  interactiveAllowed: false;
  cropBox?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    aspectRatio: number;
  };
  notes: string;
  assetId: string;
};

const botanicalSourceMap: Record<
  BotanicalMotifId,
  {
    assetId: string;
    allowedPresets: readonly BotanicalDecorationPreset[];
    defaultOpacity: BotanicalOpacityToken;
    defaultPlacement: BotanicalPlacementToken;
    defaultDensity: BotanicalDensityToken;
  }
> = {
  "botanical.headerLeafMark": {
    assetId: "08_botanical_motif_library.header_leaf_mark_motif",
    allowedPresets: ["pageHeader", "screenShell"],
    defaultOpacity: "subtle",
    defaultPlacement: "topRight",
    defaultDensity: "low",
  },
  "botanical.pressedLeaf": {
    assetId: "08_botanical_motif_library.pressed_leaf_motif",
    allowedPresets: ["journalCard", "entityCard", "emptyState", "screenShell"],
    defaultOpacity: "whisper",
    defaultPlacement: "cardCorner",
    defaultDensity: "low",
  },
  "botanical.sprig": {
    assetId: "08_botanical_motif_library.botanical_sprig_motif",
    allowedPresets: ["sectionHeader", "emptyState"],
    defaultOpacity: "subtle",
    defaultPlacement: "sectionEnd",
    defaultDensity: "trace",
  },
  "botanical.sectionSprig": {
    assetId: "08_botanical_motif_library.section_sprig_motif",
    allowedPresets: ["pageHeader", "sectionHeader"],
    defaultOpacity: "subtle",
    defaultPlacement: "sectionEnd",
    defaultDensity: "trace",
  },
  "botanical.cornerBranch": {
    assetId: "08_botanical_motif_library.corner_branch_motif",
    allowedPresets: ["journalCard", "entityCard"],
    defaultOpacity: "whisper",
    defaultPlacement: "cardCorner",
    defaultDensity: "low",
  },
  "botanical.wreathLeft": {
    assetId: "08_botanical_motif_library.wreath_left_motif",
    allowedPresets: ["resultSeal"],
    defaultOpacity: "visible",
    defaultPlacement: "sealAround",
    defaultDensity: "seal",
  },
  "botanical.wreathRight": {
    assetId: "08_botanical_motif_library.wreath_right_motif",
    allowedPresets: ["resultSeal"],
    defaultOpacity: "visible",
    defaultPlacement: "sealAround",
    defaultDensity: "seal",
  },
  "botanical.wreathSeal": {
    assetId: "08_botanical_motif_library.wreath_seal_motif",
    allowedPresets: ["resultSeal"],
    defaultOpacity: "visible",
    defaultPlacement: "sealAround",
    defaultDensity: "seal",
  },
  "botanical.leafVein": {
    assetId: "08_botanical_motif_library.leaf_vein_motif",
    allowedPresets: ["journalCard"],
    defaultOpacity: "whisper",
    defaultPlacement: "cardCorner",
    defaultDensity: "low",
  },
  "botanical.seedDot": {
    assetId: "08_botanical_motif_library.seed_dot_motif",
    allowedPresets: ["sectionHeader", "emptyState"],
    defaultOpacity: "ghost",
    defaultPlacement: "sectionEnd",
    defaultDensity: "trace",
  },
  "botanical.trailCurve": {
    assetId: "08_botanical_motif_library.trail_curve_motif",
    allowedPresets: ["entityCard", "emptyState"],
    defaultOpacity: "whisper",
    defaultPlacement: "bottomRight",
    defaultDensity: "low",
  },
  "botanical.branchTick": {
    assetId: "08_botanical_motif_library.branch_tick_motif",
    allowedPresets: ["resultSeal"],
    defaultOpacity: "visible",
    defaultPlacement: "sealAround",
    defaultDensity: "seal",
  },
  "botanical.stampRing": {
    assetId: "08_botanical_motif_library.stamp_ring_motif",
    allowedPresets: ["resultSeal"],
    defaultOpacity: "visible",
    defaultPlacement: "sealAround",
    defaultDensity: "seal",
  },
  "botanical.ribbonBookmark": {
    assetId: "08_botanical_motif_library.ribbon_bookmark_motif",
    allowedPresets: ["journalCard"],
    defaultOpacity: "soft",
    defaultPlacement: "cardCorner",
    defaultDensity: "low",
  },
  "botanical.photoOverlay": {
    assetId: "08_botanical_motif_library.photo_botanical_overlay_motif",
    allowedPresets: ["mediaHero"],
    defaultOpacity: "mediaOverlay",
    defaultPlacement: "mediaCorner",
    defaultDensity: "low",
  },
  "botanical.headerSystemSprig": {
    assetId: "08_botanical_motif_library.pressed_botanical_header_system_sprig",
    allowedPresets: ["screenShell", "pageHeader"],
    defaultOpacity: "ghost",
    defaultPlacement: "topRight",
    defaultDensity: "trace",
  },
};

export const botanicalMotifRegistry = Object.fromEntries(
  Object.entries(botanicalSourceMap).map(([id, config]) => {
    const skinAsset = getWaymarkSkinAsset(config.assetId);

    if (!skinAsset) {
      throw new Error(`Missing botanical skin asset for ${id}`);
    }

    return [
      id,
      {
        id: id as BotanicalMotifId,
        file: skinAsset.file,
        name: skinAsset.name,
        family: "botanicalMotif",
        width: skinAsset.width,
        height: skinAsset.height,
        aspectRatio: skinAsset.aspectRatio,
        allowedPresets: config.allowedPresets,
        defaultOpacity: config.defaultOpacity,
        defaultPlacement: config.defaultPlacement,
        defaultDensity: config.defaultDensity,
        decorativeOnly: true,
        interactiveAllowed: false,
        cropBox: skinAsset.cropBox,
        notes: skinAsset.notes,
        assetId: config.assetId,
      } satisfies BotanicalMotifRegistryItem,
    ];
  })
) as Record<BotanicalMotifId, BotanicalMotifRegistryItem>;

export function getBotanicalMotif(motifId: BotanicalMotifId) {
  return botanicalMotifRegistry[motifId];
}

export function getAllBotanicalMotifs() {
  return Object.values(botanicalMotifRegistry);
}
