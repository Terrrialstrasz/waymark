import { Locale, PathId } from "../../types/ui";
import { WaymarkPathIdentitySemanticName } from "../../design/waymark-icon-map";
import { WaymarkImageAssetId } from "../../assets/imageRegistry";

export type TodayPathHeroColorSet = {
  accent: string;
  accentDeep: string;
  accentSoft: string;
  accentMuted: string;
  heroText: string;
  heroPatch: string;
  heroPatchBorder: string;
};

export type TodayPathHeroFocalPoint = {
  x: number;
  y: number;
};

export type TodayPathHeroPath = {
  id: PathId;
  slug:
    | "career-craft"
    | "snag-golf-vietnam"
    | "health-body"
    | "family-home"
    | "character-stoicism"
    | "golf-craft"
    | "culture-class-romance";
  label: Record<Locale, string>;
  compactLabel: Record<Locale, string>;
  subtitle: Record<Locale, string>;
  heroAlt: Record<Locale, string>;
  icon: WaymarkPathIdentitySemanticName;
  color: TodayPathHeroColorSet;
  pathIconSrc?: string;
  pathIconAssetId?: WaymarkImageAssetId;
  heroAssetId?: WaymarkImageAssetId;
  heroFocalPoint?: TodayPathHeroFocalPoint;
  titleFontSize: number;
};

export const WAYMARK_PATH_ICON_ASSETS = {
  careerCraft: "/assets/skins/path-icon/career-craft_seal_icon.webp",
  characterStoicism: "/assets/skins/path-icon/character-stoicism_seal_icon.webp",
  cultureClassRomance: "/assets/skins/path-icon/culture-class-romance_seal_icon.webp",
  familyHome: "/assets/skins/path-icon/family-home_seal_icon.webp",
  golfCraft: "/assets/skins/path-icon/golf-craft_seal_icon.webp",
  healthBody: "/assets/skins/path-icon/health-body_seal_icon.webp",
  snagGolfVietnam: "/assets/skins/path-icon/snag-golf-vietnam_seal_icon.webp",
} as const;

export const WAYMARK_PATH_ICON_ASSET_IDS = {
  careerCraft: "pathIcon.board.careerCraft",
  characterStoicism: "pathIcon.board.characterStoicism",
  cultureClassRomance: "pathIcon.board.cultureRomance",
  familyHome: "pathIcon.board.familyHome",
  golfCraft: "pathIcon.board.golfCraft",
  healthBody: "pathIcon.board.healthBody",
  snagGolfVietnam: "pathIcon.board.snagGolf",
} as const satisfies Record<string, WaymarkImageAssetId>;

export const WAYMARK_PATH_COLORS = {
  careerCraft: {
    id: "career-craft",
    accent: "#1E5F9E",
    accentDeep: "#0B3764",
    accentSoft: "#DCECF7",
    accentMuted: "#8AAED0",

    labelText: "#1E5F9E",
    titleText: "#0B3764",
    subtitleInk: "#224A73",
    chevronText: "#0B3764",

    bookmarkBg: "#1E5F9E",
    bookmarkBorder: "#0B3764",
    sideStripe: "#1E5F9E",

    textHalo: "0 1px 0 rgba(255,250,239,.88), 0 6px 18px rgba(255,250,239,.58)",
  },
  snagGolfVietnam: {
    id: "snag-golf-vietnam",
    accent: "#4E9A28",
    accentDeep: "#245C2B",
    accentSoft: "#DFF2CE",
    accentMuted: "#9CCB74",

    labelText: "#4E9A28",
    titleText: "#245C2B",
    subtitleInk: "#2F6532",
    chevronText: "#245C2B",

    bookmarkBg: "#4E9A28",
    bookmarkBorder: "#245C2B",
    sideStripe: "#4E9A28",

    textHalo: "0 1px 0 rgba(244,255,236,.88), 0 6px 18px rgba(244,255,236,.58)",
  },
  healthBody: {
    id: "health-body",
    accent: "#D4511E",
    accentDeep: "#7A2714",
    accentSoft: "#F8D8C5",
    accentMuted: "#E49A77",

    labelText: "#D4511E",
    titleText: "#7A2714",
    subtitleInk: "#6A2A15",
    chevronText: "#7A2714",

    bookmarkBg: "#D4511E",
    bookmarkBorder: "#7A2714",
    sideStripe: "#D4511E",

    textHalo: "0 1px 0 rgba(255,244,232,.90), 0 7px 22px rgba(255,244,232,.68)",
  },
  familyHome: {
    id: "family-home",
    accent: "#D8A51D",
    accentDeep: "#7A5811",
    accentSoft: "#FFF0BF",
    accentMuted: "#E6C765",

    labelText: "#B88412",
    titleText: "#7A5811",
    subtitleInk: "#6A4B12",
    chevronText: "#7A5811",

    bookmarkBg: "#D8A51D",
    bookmarkBorder: "#7A5811",
    sideStripe: "#D8A51D",

    textHalo: "0 1px 0 rgba(255,249,231,.88), 0 6px 18px rgba(255,249,231,.58)",
  },
  characterStoicism: {
    id: "character-stoicism",
    accent: "#7A8335",
    accentDeep: "#3F4A1E",
    accentSoft: "#E9E6C9",
    accentMuted: "#B5B16D",

    labelText: "#7A8335",
    titleText: "#3F4A1E",
    subtitleInk: "#4C5528",
    chevronText: "#3F4A1E",

    bookmarkBg: "#7A8335",
    bookmarkBorder: "#3F4A1E",
    sideStripe: "#7A8335",

    textHalo: "0 1px 0 rgba(255,250,231,.88), 0 6px 18px rgba(255,250,231,.58)",
  },
  golfCraft: {
    id: "golf-craft",
    accent: "#15806B",
    accentDeep: "#0A4D43",
    accentSoft: "#D7F0E7",
    accentMuted: "#84BFAE",

    labelText: "#15806B",
    titleText: "#0A4D43",
    subtitleInk: "#14584D",
    chevronText: "#0A4D43",

    bookmarkBg: "#15806B",
    bookmarkBorder: "#0A4D43",
    sideStripe: "#15806B",

    textHalo: "0 1px 0 rgba(241,255,248,.88), 0 6px 18px rgba(241,255,248,.58)",
  },
  cultureClassRomance: {
    id: "culture-class-romance",
    accent: "#A6426A",
    accentDeep: "#5C203C",
    accentSoft: "#F4DFE7",
    accentMuted: "#D49AB0",

    labelText: "#A6426A",
    titleText: "#5C203C",
    subtitleInk: "#6B3550",
    chevronText: "#5C203C",

    bookmarkBg: "#A6426A",
    bookmarkBorder: "#5C203C",
    sideStripe: "#A6426A",

    textHalo: "0 1px 0 rgba(255,246,243,.88), 0 6px 18px rgba(255,246,243,.58)",
  },
} as const;

export const todayPathHeroCopy = {
  en: {
    anchorLabel: "Today's Anchor Path",
    selectLabel: "Reselect today's anchor path",
  },
  vi: {
    anchorLabel: "Today's Anchor Path",
    selectLabel: "Reselect today's anchor path",
  },
} as const;

export const todayPathHeroPaths: TodayPathHeroPath[] = [
  {
    id: "career",
    slug: "career-craft",
    label: { en: "Career Craft", vi: "Career Craft" },
    compactLabel: { en: "Career", vi: "Career" },
    subtitle: {
      en: "Build work that is worthy\nof your time.",
      vi: "Build work that is worthy\nof your time.",
    },
    heroAlt: {
      en: "Career Craft anchor path watercolor hero.",
      vi: "Career Craft anchor path watercolor hero.",
    },
    icon: "careerCraft",
    color: {
      accent: "#1E5F9E",
      accentDeep: "#0B3764",
      accentSoft: "#DCECF7",
      accentMuted: "#8AAED0",
      heroText: "#0B2E4F",
      heroPatch: "rgba(255, 250, 239, 0.78)",
      heroPatchBorder: "rgba(30, 95, 158, 0.24)",
    },
    pathIconSrc: WAYMARK_PATH_ICON_ASSETS.careerCraft,
    pathIconAssetId: WAYMARK_PATH_ICON_ASSET_IDS.careerCraft,
    heroAssetId: "hero.path.careerCraft",
    heroFocalPoint: { x: 0.35, y: 0.55 },
    titleFontSize: 34,
  },
  {
    id: "snag",
    slug: "snag-golf-vietnam",
    label: { en: "SNAG Golf Vietnam", vi: "SNAG Golf Vietnam" },
    compactLabel: { en: "SNAG", vi: "SNAG" },
    subtitle: {
      en: "Grow opportunity.\nServe the next generation.",
      vi: "Grow opportunity.\nServe the next generation.",
    },
    heroAlt: {
      en: "SNAG Golf Vietnam anchor path watercolor hero.",
      vi: "SNAG Golf Vietnam anchor path watercolor hero.",
    },
    icon: "snagGolf",
    color: {
      accent: "#4E9A28",
      accentDeep: "#245C2B",
      accentSoft: "#DFF2CE",
      accentMuted: "#9CCB74",
      heroText: "#173F1F",
      heroPatch: "rgba(244, 255, 236, 0.78)",
      heroPatchBorder: "rgba(78, 154, 40, 0.24)",
    },
    pathIconSrc: WAYMARK_PATH_ICON_ASSETS.snagGolfVietnam,
    pathIconAssetId: WAYMARK_PATH_ICON_ASSET_IDS.snagGolfVietnam,
    heroAssetId: "hero.path.snagGolf",
    titleFontSize: 28,
  },
  {
    id: "health",
    slug: "health-body",
    label: { en: "Health & Body", vi: "Health & Body" },
    compactLabel: { en: "Health", vi: "Health" },
    subtitle: {
      en: "Care for the vessel.\nBuild strength that lasts.",
      vi: "Care for the vessel.\nBuild strength that lasts.",
    },
    heroAlt: {
      en: "Health and Body anchor path watercolor hero.",
      vi: "Health and Body anchor path watercolor hero.",
    },
    icon: "healthBody",
    color: {
      accent: "#D4511E",
      accentDeep: "#7A2714",
      accentSoft: "#F8D8C5",
      accentMuted: "#E49A77",
      heroText: "#4B1A0D",
      heroPatch: "rgba(255, 244, 232, 0.80)",
      heroPatchBorder: "rgba(212, 81, 30, 0.26)",
    },
    pathIconSrc: WAYMARK_PATH_ICON_ASSETS.healthBody,
    pathIconAssetId: WAYMARK_PATH_ICON_ASSET_IDS.healthBody,
    heroAssetId: "hero.path.healthBody",
    titleFontSize: 34,
  },
  {
    id: "family",
    slug: "family-home",
    label: { en: "Family & Home", vi: "Family & Home" },
    compactLabel: { en: "Family", vi: "Family" },
    subtitle: {
      en: "Be present.\nBuild a home of belonging.",
      vi: "Be present.\nBuild a home of belonging.",
    },
    heroAlt: {
      en: "Family and Home anchor path watercolor hero.",
      vi: "Family and Home anchor path watercolor hero.",
    },
    icon: "familyHome",
    color: {
      accent: "#D8A51D",
      accentDeep: "#7A5811",
      accentSoft: "#FFF0BF",
      accentMuted: "#E6C765",
      heroText: "#3A2A0B",
      heroPatch: "rgba(255, 249, 231, 0.78)",
      heroPatchBorder: "rgba(216, 165, 29, 0.28)",
    },
    pathIconSrc: WAYMARK_PATH_ICON_ASSETS.familyHome,
    pathIconAssetId: WAYMARK_PATH_ICON_ASSET_IDS.familyHome,
    heroAssetId: "hero.path.familyHome",
    titleFontSize: 34,
  },
  {
    id: "character",
    slug: "character-stoicism",
    label: { en: "Character & Stoicism", vi: "Character & Stoicism" },
    compactLabel: { en: "Character", vi: "Character" },
    subtitle: {
      en: "Choose virtue.\nMaster what you can control.",
      vi: "Choose virtue.\nMaster what you can control.",
    },
    heroAlt: {
      en: "Character and Stoicism anchor path watercolor hero.",
      vi: "Character and Stoicism anchor path watercolor hero.",
    },
    icon: "characterShield",
    color: {
      accent: "#7A8335",
      accentDeep: "#3F4A1E",
      accentSoft: "#E9E6C9",
      accentMuted: "#B5B16D",
      heroText: "#2F341D",
      heroPatch: "rgba(255, 250, 231, 0.78)",
      heroPatchBorder: "rgba(122, 131, 53, 0.24)",
    },
    pathIconSrc: WAYMARK_PATH_ICON_ASSETS.characterStoicism,
    pathIconAssetId: WAYMARK_PATH_ICON_ASSET_IDS.characterStoicism,
    heroAssetId: "hero.path.characterStoicism",
    titleFontSize: 27,
  },
  {
    id: "golf",
    slug: "golf-craft",
    label: { en: "Golf Craft", vi: "Golf Craft" },
    compactLabel: { en: "Golf", vi: "Golf" },
    subtitle: {
      en: "Practice with purpose.\nPlay with composure.",
      vi: "Practice with purpose.\nPlay with composure.",
    },
    heroAlt: {
      en: "Golf Craft anchor path watercolor hero.",
      vi: "Golf Craft anchor path watercolor hero.",
    },
    icon: "golfCraft",
    color: {
      accent: "#15806B",
      accentDeep: "#0A4D43",
      accentSoft: "#D7F0E7",
      accentMuted: "#84BFAE",
      heroText: "#073E37",
      heroPatch: "rgba(241, 255, 248, 0.78)",
      heroPatchBorder: "rgba(21, 128, 107, 0.24)",
    },
    pathIconSrc: WAYMARK_PATH_ICON_ASSETS.golfCraft,
    pathIconAssetId: WAYMARK_PATH_ICON_ASSET_IDS.golfCraft,
    heroAssetId: "hero.path.golfCraft",
    titleFontSize: 34,
  },
  {
    id: "culture",
    slug: "culture-class-romance",
    label: { en: "Culture, Class & Romance", vi: "Culture, Class & Romance" },
    compactLabel: { en: "Culture", vi: "Culture" },
    subtitle: {
      en: "Seek beauty.\nLive with refinement and depth.",
      vi: "Seek beauty.\nLive with refinement and depth.",
    },
    heroAlt: {
      en: "Culture, Class and Romance anchor path watercolor hero.",
      vi: "Culture, Class and Romance anchor path watercolor hero.",
    },
    icon: "cultureRomance",
    color: {
      accent: "#A6426A",
      accentDeep: "#5C203C",
      accentSoft: "#F4DFE7",
      accentMuted: "#D49AB0",
      heroText: "#4A1C31",
      heroPatch: "rgba(255, 246, 243, 0.80)",
      heroPatchBorder: "rgba(166, 66, 106, 0.24)",
    },
    pathIconSrc: WAYMARK_PATH_ICON_ASSETS.cultureClassRomance,
    pathIconAssetId: WAYMARK_PATH_ICON_ASSET_IDS.cultureClassRomance,
    heroAssetId: "hero.path.cultureRomance",
    titleFontSize: 25,
  },
];

export function getTodayPathHeroPath(selectedPathId: PathId, paths = todayPathHeroPaths) {
  return paths.find((path) => path.id === selectedPathId) ?? paths[0];
}

export function getTodayPathHeroTextColorKey(pathId: PathId) {
  switch (pathId) {
    case "career":
      return "careerCraft";
    case "snag":
      return "snagGolfVietnam";
    case "health":
      return "healthBody";
    case "family":
      return "familyHome";
    case "character":
      return "characterStoicism";
    case "golf":
      return "golfCraft";
    case "culture":
      return "cultureClassRomance";
    default:
      return "careerCraft";
  }
}
