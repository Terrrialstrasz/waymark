import { ImageSourcePropType } from "react-native";

// Runtime originals are bundled from the mirrored `assets/skins` tree.
// Generated UI variants are rebuilt alongside them from `ai-resources/Waymark Icon skins`.
// Run `npm run assets:sync:waymark-skins` whenever source files drift or processed variants go missing.
const skinManifest = require("../../ai-resources/Waymark Icon skins/manifest.json") as {
  count: number;
  assets: Array<{
    file: keyof typeof assetSources;
    board: string;
    category: keyof typeof familyByCategory;
    name: string;
    width: number;
    height: number;
    crop_box_xyxy?: [number, number, number, number];
    notes: string;
  }>;
};

const assetSources = {
  "01_utility_signature_set/back.webp": require("../../assets/skins/waymark/default/01_utility_signature_set/back.webp"),
  "01_utility_signature_set/bell.webp": require("../../assets/skins/waymark/default/01_utility_signature_set/bell.webp"),
  "01_utility_signature_set/calendar.webp": require("../../assets/skins/waymark/default/01_utility_signature_set/calendar.webp"),
  "01_utility_signature_set/camera.webp": require("../../assets/skins/waymark/default/01_utility_signature_set/camera.webp"),
  "01_utility_signature_set/chevron.webp": require("../../assets/skins/waymark/default/01_utility_signature_set/chevron.webp"),
  "01_utility_signature_set/clock.webp": require("../../assets/skins/waymark/default/01_utility_signature_set/clock.webp"),
  "01_utility_signature_set/close.webp": require("../../assets/skins/waymark/default/01_utility_signature_set/close.webp"),
  "01_utility_signature_set/language.webp": require("../../assets/skins/waymark/default/01_utility_signature_set/language.webp"),
  "01_utility_signature_set/more.webp": require("../../assets/skins/waymark/default/01_utility_signature_set/more.webp"),
  "01_utility_signature_set/search.webp": require("../../assets/skins/waymark/default/01_utility_signature_set/search.webp"),
  "02_navigation_signature_set/capture_leaf_seal_icon.webp": require("../../assets/skins/waymark/default/02_navigation_signature_set/capture_leaf_seal_icon.webp"),
  "02_navigation_signature_set/journal_book_icon.webp": require("../../assets/skins/waymark/default/02_navigation_signature_set/journal_book_icon.webp"),
  "02_navigation_signature_set/me_profile_icon.webp": require("../../assets/skins/waymark/default/02_navigation_signature_set/me_profile_icon.webp"),
  "02_navigation_signature_set/path_signpost_icon.webp": require("../../assets/skins/waymark/default/02_navigation_signature_set/path_signpost_icon.webp"),
  "02_navigation_signature_set/today_trail_leaf_icon.webp": require("../../assets/skins/waymark/default/02_navigation_signature_set/today_trail_leaf_icon.webp"),
  "03_entity_signature_set/backlog_notebook_icon.webp": require("../../assets/skins/waymark/default/03_entity_signature_set/backlog_notebook_icon.webp"),
  "03_entity_signature_set/expedition_flag_mountain_icon.webp": require("../../assets/skins/waymark/default/03_entity_signature_set/expedition_flag_mountain_icon.webp"),
  "03_entity_signature_set/living_path_icon.webp": require("../../assets/skins/waymark/default/03_entity_signature_set/living_path_icon.webp"),
  "03_entity_signature_set/mark_proof_leaf_icon.webp": require("../../assets/skins/waymark/default/03_entity_signature_set/mark_proof_leaf_icon.webp"),
  "03_entity_signature_set/memory_seal_icon.webp": require("../../assets/skins/waymark/default/03_entity_signature_set/memory_seal_icon.webp"),
  "03_entity_signature_set/pack_check_bag_icon.webp": require("../../assets/skins/waymark/default/03_entity_signature_set/pack_check_bag_icon.webp"),
  "03_entity_signature_set/private_document_icon.webp": require("../../assets/skins/waymark/default/03_entity_signature_set/private_document_icon.webp"),
  "03_entity_signature_set/weekly_coding_report_icon.webp": require("../../assets/skins/waymark/default/03_entity_signature_set/weekly_coding_report_icon.webp"),
  "04_status_signature_set/active_seed_dot_icon.webp": require("../../assets/skins/waymark/default/04_status_signature_set/active_seed_dot_icon.webp"),
  "04_status_signature_set/done_proof_check_icon.webp": require("../../assets/skins/waymark/default/04_status_signature_set/done_proof_check_icon.webp"),
  "04_status_signature_set/in_progress_seed_icon.webp": require("../../assets/skins/waymark/default/04_status_signature_set/in_progress_seed_icon.webp"),
  "04_status_signature_set/missed_faded_mark_icon.webp": require("../../assets/skins/waymark/default/04_status_signature_set/missed_faded_mark_icon.webp"),
  "04_status_signature_set/planned_seed_star_icon.webp": require("../../assets/skins/waymark/default/04_status_signature_set/planned_seed_star_icon.webp"),
  "04_status_signature_set/protected_leaf_shield_icon.webp": require("../../assets/skins/waymark/default/04_status_signature_set/protected_leaf_shield_icon.webp"),
  "04_status_signature_set/upcoming_quiet_calendar_icon.webp": require("../../assets/skins/waymark/default/04_status_signature_set/upcoming_quiet_calendar_icon.webp"),
  "04_status_signature_set/weak_wilted_leaf_icon.webp": require("../../assets/skins/waymark/default/04_status_signature_set/weak_wilted_leaf_icon.webp"),
  "05_domain_path_identity_medallions/career_craft_medallion_icon.webp": require("../../assets/skins/waymark/default/05_domain_path_identity_medallions/career_craft_medallion_icon.webp"),
  "05_domain_path_identity_medallions/character_shield_medallion_icon.webp": require("../../assets/skins/waymark/default/05_domain_path_identity_medallions/character_shield_medallion_icon.webp"),
  "05_domain_path_identity_medallions/culture_romance_medallion_icon.webp": require("../../assets/skins/waymark/default/05_domain_path_identity_medallions/culture_romance_medallion_icon.webp"),
  "05_domain_path_identity_medallions/family_home_medallion_icon.webp": require("../../assets/skins/waymark/default/05_domain_path_identity_medallions/family_home_medallion_icon.webp"),
  "05_domain_path_identity_medallions/golf_craft_medallion_icon.webp": require("../../assets/skins/waymark/default/05_domain_path_identity_medallions/golf_craft_medallion_icon.webp"),
  "05_domain_path_identity_medallions/health_body_medallion_icon.webp": require("../../assets/skins/waymark/default/05_domain_path_identity_medallions/health_body_medallion_icon.webp"),
  "05_domain_path_identity_medallions/learning_wisdom_medallion_icon.webp": require("../../assets/skins/waymark/default/05_domain_path_identity_medallions/learning_wisdom_medallion_icon.webp"),
  "05_domain_path_identity_medallions/snag_golf_path_medallion_icon.webp": require("../../assets/skins/waymark/default/05_domain_path_identity_medallions/snag_golf_path_medallion_icon.webp"),
  "06_result_judgment_seals/day_closed_shield_seal_icon.webp": require("../../assets/skins/waymark/default/06_result_judgment_seals/day_closed_shield_seal_icon.webp"),
  "06_result_judgment_seals/protected_character_seal_icon.webp": require("../../assets/skins/waymark/default/06_result_judgment_seals/protected_character_seal_icon.webp"),
  "06_result_judgment_seals/repair_path_seal_icon.webp": require("../../assets/skins/waymark/default/06_result_judgment_seals/repair_path_seal_icon.webp"),
  "06_result_judgment_seals/trail_result_seal_icon.webp": require("../../assets/skins/waymark/default/06_result_judgment_seals/trail_result_seal_icon.webp"),
  "07_health_session_icons/cooldown_leaf_icon.webp": require("../../assets/skins/waymark/default/07_health_session_icons/cooldown_leaf_icon.webp"),
  "07_health_session_icons/rest_leaf_timer_icon.webp": require("../../assets/skins/waymark/default/07_health_session_icons/rest_leaf_timer_icon.webp"),
  "07_health_session_icons/session_timer_icon.webp": require("../../assets/skins/waymark/default/07_health_session_icons/session_timer_icon.webp"),
  "07_health_session_icons/set_done_proof_icon.webp": require("../../assets/skins/waymark/default/07_health_session_icons/set_done_proof_icon.webp"),
  "07_health_session_icons/strength_medallion_icon.webp": require("../../assets/skins/waymark/default/07_health_session_icons/strength_medallion_icon.webp"),
  "07_health_session_icons/stretch_leaf_icon.webp": require("../../assets/skins/waymark/default/07_health_session_icons/stretch_leaf_icon.webp"),
  "07_health_session_icons/walk_trail_icon.webp": require("../../assets/skins/waymark/default/07_health_session_icons/walk_trail_icon.webp"),
  "08_botanical_motif_library/botanical_sprig_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/botanical_sprig_motif.webp"),
  "08_botanical_motif_library/branch_tick_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/branch_tick_motif.webp"),
  "08_botanical_motif_library/corner_branch_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/corner_branch_motif.webp"),
  "08_botanical_motif_library/header_leaf_mark_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/header_leaf_mark_motif.webp"),
  "08_botanical_motif_library/leaf_vein_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/leaf_vein_motif.webp"),
  "08_botanical_motif_library/photo_botanical_overlay_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/photo_botanical_overlay_motif.webp"),
  "08_botanical_motif_library/pressed_botanical_header_system_sprig.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/pressed_botanical_header_system_sprig.webp"),
  "08_botanical_motif_library/pressed_leaf_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/pressed_leaf_motif.webp"),
  "08_botanical_motif_library/ribbon_bookmark_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/ribbon_bookmark_motif.webp"),
  "08_botanical_motif_library/section_sprig_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/section_sprig_motif.webp"),
  "08_botanical_motif_library/seed_dot_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/seed_dot_motif.webp"),
  "08_botanical_motif_library/stamp_ring_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/stamp_ring_motif.webp"),
  "08_botanical_motif_library/trail_curve_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/trail_curve_motif.webp"),
  "08_botanical_motif_library/wreath_left_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/wreath_left_motif.webp"),
  "08_botanical_motif_library/wreath_right_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/wreath_right_motif.webp"),
  "08_botanical_motif_library/wreath_seal_motif.webp": require("../../assets/skins/waymark/default/08_botanical_motif_library/wreath_seal_motif.webp"),
} as const satisfies Record<string, ImageSourcePropType>;

const familyByCategory = {
  "01_utility_signature_set": "utility",
  "02_navigation_signature_set": "navigation",
  "03_entity_signature_set": "entity",
  "04_status_signature_set": "status",
  "05_domain_path_identity_medallions": "pathIdentity",
  "06_result_judgment_seals": "judgmentSeal",
  "07_health_session_icons": "healthSession",
  "08_botanical_motif_library": "botanicalMotif",
} as const;

const familyDefaults = {
  utility: {
    defaultFit: "contain",
    defaultSize: "md",
    intendedUsage: "utilityActions",
    decorativeDefault: false,
    allowedComponents: ["WaymarkSkinAsset", "WaymarkIcon", "UtilityIconButton"],
  },
  navigation: {
    defaultFit: "contain",
    defaultSize: "lg",
    intendedUsage: "bottomNavigation",
    decorativeDefault: false,
    allowedComponents: ["WaymarkSkinAsset", "WaymarkIcon", "BottomNavIcon"],
  },
  entity: {
    defaultFit: "contain",
    defaultSize: "lg",
    intendedUsage: "entitySignifiers",
    decorativeDefault: false,
    allowedComponents: ["WaymarkSkinAsset", "WaymarkIcon", "EntityIcon"],
  },
  status: {
    defaultFit: "contain",
    defaultSize: "md",
    intendedUsage: "statusSignifiers",
    decorativeDefault: false,
    allowedComponents: ["WaymarkSkinAsset", "WaymarkIcon", "StatusIcon"],
  },
  pathIdentity: {
    defaultFit: "contain",
    defaultSize: "xl",
    intendedUsage: "pathIdentityMedallions",
    decorativeDefault: false,
    allowedComponents: ["WaymarkSkinAsset", "WaymarkIcon", "PathMedallion"],
  },
  judgmentSeal: {
    defaultFit: "contain",
    defaultSize: "hero",
    intendedUsage: "closureAndResultContexts",
    decorativeDefault: false,
    allowedComponents: ["WaymarkSkinAsset", "WaymarkIcon", "JudgmentSeal"],
  },
  healthSession: {
    defaultFit: "contain",
    defaultSize: "lg",
    intendedUsage: "healthSessionSteps",
    decorativeDefault: false,
    allowedComponents: ["WaymarkSkinAsset", "WaymarkIcon", "HealthSessionIcon"],
  },
  botanicalMotif: {
    defaultFit: "contain",
    defaultSize: "hero",
    intendedUsage: "decorativeLayoutMotifs",
    decorativeDefault: true,
    allowedComponents: ["WaymarkSkinAsset", "BotanicalMotif"],
  },
} as const;

export type WaymarkSkinAssetFile = keyof typeof assetSources;
export type WaymarkSkinAssetFamily = (typeof familyByCategory)[keyof typeof familyByCategory];
export type WaymarkSkinAssetId = string;
export type WaymarkSkinAssetFit = "contain" | "cover" | "natural";
export type WaymarkSkinAssetSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";
export type WaymarkSkinAssetUsage =
  | "utilityActions"
  | "bottomNavigation"
  | "entitySignifiers"
  | "statusSignifiers"
  | "pathIdentityMedallions"
  | "closureAndResultContexts"
  | "healthSessionSteps"
  | "decorativeLayoutMotifs";
export type WaymarkSkinAllowedComponent =
  | "WaymarkSkinAsset"
  | "WaymarkIcon"
  | "UtilityIconButton"
  | "BottomNavIcon"
  | "EntityIcon"
  | "StatusIcon"
  | "PathMedallion"
  | "JudgmentSeal"
  | "HealthSessionIcon"
  | "BotanicalMotif";

export type WaymarkSkinAssetDescriptor = {
  id: WaymarkSkinAssetId;
  file: WaymarkSkinAssetFile;
  path: string;
  source: ImageSourcePropType;
  family: WaymarkSkinAssetFamily;
  name: string;
  board: string;
  width: number;
  height: number;
  aspectRatio: number;
  defaultFit: WaymarkSkinAssetFit;
  defaultSize: WaymarkSkinAssetSize;
  intendedUsage: WaymarkSkinAssetUsage;
  decorativeDefault: boolean;
  allowedComponents: readonly WaymarkSkinAllowedComponent[];
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
};

function assetIdFromFile(file: string) {
  return file.replace(/\.webp$/u, "").replace(/\//gu, ".");
}

function resolveCropBox(cropBox: [number, number, number, number] | undefined) {
  if (!cropBox || cropBox.length !== 4) {
    return undefined;
  }

  const [left, top, right, bottom] = cropBox;
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);

  if (!width || !height) {
    return undefined;
  }

  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    aspectRatio: Number((width / height).toFixed(4)),
  };
}

export const waymarkSkinAssets = Object.fromEntries(
  skinManifest.assets.map((asset) => {
    const family = familyByCategory[asset.category];
    const defaults = familyDefaults[family];
    const id = assetIdFromFile(asset.file);

    return [
      id,
      {
        id,
        file: asset.file,
        path: `assets/skins/waymark/default/${asset.file}`,
        source: assetSources[asset.file],
        family,
        name: asset.name,
        board: asset.board,
        width: asset.width,
        height: asset.height,
        aspectRatio: Number((asset.width / asset.height).toFixed(4)),
        defaultFit: defaults.defaultFit,
        defaultSize: defaults.defaultSize,
        intendedUsage: defaults.intendedUsage,
        decorativeDefault: defaults.decorativeDefault,
        allowedComponents: defaults.allowedComponents,
        cropBox: resolveCropBox(asset.crop_box_xyxy),
        notes: asset.notes,
      } satisfies WaymarkSkinAssetDescriptor,
    ];
  })
) as Record<string, WaymarkSkinAssetDescriptor>;

export const waymarkSkinAssetFamilies = Object.values(familyByCategory);

export function getWaymarkSkinAsset(assetId: WaymarkSkinAssetId) {
  return waymarkSkinAssets[assetId];
}

export function getWaymarkSkinAssetsByFamily(family: WaymarkSkinAssetFamily) {
  return Object.values(waymarkSkinAssets).filter((asset) => asset.family === family);
}

export function isWaymarkSkinAssetId(value: string): value is WaymarkSkinAssetId {
  return value in waymarkSkinAssets;
}
