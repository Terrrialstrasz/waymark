import { WaymarkSkinAssetId } from "./skin-assets";
import {
  CodeOwnedWaymarkSemanticIconName,
  isCodeOwnedWaymarkSemanticIconName,
  WaymarkEntitySemanticName,
  WaymarkHealthSemanticName,
  WaymarkStatusSemanticName,
  WaymarkUtilitySemanticName,
} from "./semantic-icon-types";

export const waymarkIconMap = {
  nav: {
    today: "02_navigation_signature_set.today_trail_leaf_icon",
    journal: "02_navigation_signature_set.journal_book_icon",
    capture: "02_navigation_signature_set.capture_leaf_seal_icon",
    paths: "02_navigation_signature_set.path_signpost_icon",
    me: "02_navigation_signature_set.me_profile_icon",
  },
  pathIdentity: {
    careerCraft: "05_domain_path_identity_medallions.career_craft_medallion_icon",
    snagGolf: "05_domain_path_identity_medallions.snag_golf_path_medallion_icon",
    healthBody: "05_domain_path_identity_medallions.health_body_medallion_icon",
    familyHome: "05_domain_path_identity_medallions.family_home_medallion_icon",
    characterShield: "05_domain_path_identity_medallions.character_shield_medallion_icon",
    golfCraft: "05_domain_path_identity_medallions.golf_craft_medallion_icon",
    cultureRomance: "05_domain_path_identity_medallions.culture_romance_medallion_icon",
    learningWisdom: "05_domain_path_identity_medallions.learning_wisdom_medallion_icon",
  },
  judgment: {
    trailResult: "06_result_judgment_seals.trail_result_seal_icon",
    dayClosed: "06_result_judgment_seals.day_closed_shield_seal_icon",
    protectedCharacter: "06_result_judgment_seals.protected_character_seal_icon",
    repairPath: "06_result_judgment_seals.repair_path_seal_icon",
  },
  botanical: {
    headerLeafMark: "08_botanical_motif_library.header_leaf_mark_motif",
    pressedLeaf: "08_botanical_motif_library.pressed_leaf_motif",
    botanicalSprig: "08_botanical_motif_library.botanical_sprig_motif",
    sectionSprig: "08_botanical_motif_library.section_sprig_motif",
    cornerBranch: "08_botanical_motif_library.corner_branch_motif",
    wreathLeft: "08_botanical_motif_library.wreath_left_motif",
    wreathRight: "08_botanical_motif_library.wreath_right_motif",
    wreathSeal: "08_botanical_motif_library.wreath_seal_motif",
    leafVein: "08_botanical_motif_library.leaf_vein_motif",
    seedDot: "08_botanical_motif_library.seed_dot_motif",
    trailCurve: "08_botanical_motif_library.trail_curve_motif",
    branchTick: "08_botanical_motif_library.branch_tick_motif",
    stampRing: "08_botanical_motif_library.stamp_ring_motif",
    ribbonBookmark: "08_botanical_motif_library.ribbon_bookmark_motif",
    photoBotanicalOverlay: "08_botanical_motif_library.photo_botanical_overlay_motif",
    pressedBotanicalHeaderSystemSprig: "08_botanical_motif_library.pressed_botanical_header_system_sprig",
  },
} as const satisfies Record<string, Record<string, WaymarkSkinAssetId>>;

export const assetBackedWaymarkIconLookup = {
  "nav.today": waymarkIconMap.nav.today,
  "nav.journal": waymarkIconMap.nav.journal,
  "nav.capture": waymarkIconMap.nav.capture,
  "nav.paths": waymarkIconMap.nav.paths,
  "nav.me": waymarkIconMap.nav.me,
  "pathIdentity.careerCraft": waymarkIconMap.pathIdentity.careerCraft,
  "pathIdentity.snagGolf": waymarkIconMap.pathIdentity.snagGolf,
  "pathIdentity.healthBody": waymarkIconMap.pathIdentity.healthBody,
  "pathIdentity.familyHome": waymarkIconMap.pathIdentity.familyHome,
  "pathIdentity.characterShield": waymarkIconMap.pathIdentity.characterShield,
  "pathIdentity.golfCraft": waymarkIconMap.pathIdentity.golfCraft,
  "pathIdentity.cultureRomance": waymarkIconMap.pathIdentity.cultureRomance,
  "pathIdentity.learningWisdom": waymarkIconMap.pathIdentity.learningWisdom,
  "judgment.trailResult": waymarkIconMap.judgment.trailResult,
  "judgment.dayClosed": waymarkIconMap.judgment.dayClosed,
  "judgment.protectedCharacter": waymarkIconMap.judgment.protectedCharacter,
  "judgment.repairPath": waymarkIconMap.judgment.repairPath,
  "botanical.headerLeafMark": waymarkIconMap.botanical.headerLeafMark,
  "botanical.pressedLeaf": waymarkIconMap.botanical.pressedLeaf,
  "botanical.botanicalSprig": waymarkIconMap.botanical.botanicalSprig,
  "botanical.sectionSprig": waymarkIconMap.botanical.sectionSprig,
  "botanical.cornerBranch": waymarkIconMap.botanical.cornerBranch,
  "botanical.wreathLeft": waymarkIconMap.botanical.wreathLeft,
  "botanical.wreathRight": waymarkIconMap.botanical.wreathRight,
  "botanical.wreathSeal": waymarkIconMap.botanical.wreathSeal,
  "botanical.leafVein": waymarkIconMap.botanical.leafVein,
  "botanical.seedDot": waymarkIconMap.botanical.seedDot,
  "botanical.trailCurve": waymarkIconMap.botanical.trailCurve,
  "botanical.branchTick": waymarkIconMap.botanical.branchTick,
  "botanical.stampRing": waymarkIconMap.botanical.stampRing,
  "botanical.ribbonBookmark": waymarkIconMap.botanical.ribbonBookmark,
  "botanical.photoBotanicalOverlay": waymarkIconMap.botanical.photoBotanicalOverlay,
  "botanical.pressedBotanicalHeaderSystemSprig": waymarkIconMap.botanical.pressedBotanicalHeaderSystemSprig,
} as const satisfies Record<string, WaymarkSkinAssetId>;

export type AssetBackedWaymarkSemanticIconName = keyof typeof assetBackedWaymarkIconLookup;
export type WaymarkSemanticIconName = CodeOwnedWaymarkSemanticIconName | AssetBackedWaymarkSemanticIconName;
export type WaymarkNavSemanticName = keyof typeof waymarkIconMap.nav;
export type WaymarkPathIdentitySemanticName = keyof typeof waymarkIconMap.pathIdentity;
export type WaymarkJudgmentSemanticName = keyof typeof waymarkIconMap.judgment;
export type WaymarkBotanicalSemanticName = keyof typeof waymarkIconMap.botanical;

export { isCodeOwnedWaymarkSemanticIconName };
export type {
  CodeOwnedWaymarkSemanticIconName,
  WaymarkEntitySemanticName,
  WaymarkHealthSemanticName,
  WaymarkStatusSemanticName,
  WaymarkUtilitySemanticName,
};

export function isAssetBackedWaymarkSemanticIconName(name: WaymarkSemanticIconName): name is AssetBackedWaymarkSemanticIconName {
  return name in assetBackedWaymarkIconLookup;
}

export function resolveWaymarkSemanticIcon(name: AssetBackedWaymarkSemanticIconName) {
  return assetBackedWaymarkIconLookup[name];
}
