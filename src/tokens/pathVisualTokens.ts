import { WAYMARK_PATH_COLORS } from "../lib/waymark/todayPathHero";
import { foundationColors, pathColors } from "../theme/tokens";
import { PathId } from "../types/ui";

export type PathVisualTokens = {
  accent: string;
  accentDeep: string;
  accentSoft: string;
  accentMuted: string;
  labelText: string;
  titleText: string;
  subtitleInk: string;
  sideStripe: string;
  bookmarkBg: string;
  bookmarkBorder: string;
};

export type PathSkin = {
  name: string;
  color: string;
  deepColor: string;
  softColor: string;
};

const pathVisualMap: Record<PathId, PathVisualTokens> = {
  career: WAYMARK_PATH_COLORS.careerCraft,
  snag: WAYMARK_PATH_COLORS.snagGolfVietnam,
  health: WAYMARK_PATH_COLORS.healthBody,
  family: WAYMARK_PATH_COLORS.familyHome,
  character: WAYMARK_PATH_COLORS.characterStoicism,
  golf: WAYMARK_PATH_COLORS.golfCraft,
  culture: WAYMARK_PATH_COLORS.cultureClassRomance,
};

const neutralPathVisualTokens: PathVisualTokens = {
  accent: foundationColors.border.soft,
  accentDeep: foundationColors.ink.secondary,
  accentSoft: foundationColors.bg.paperWarm,
  accentMuted: foundationColors.bg.paperSoft,
  labelText: foundationColors.ink.secondary,
  titleText: foundationColors.ink.primary,
  subtitleInk: foundationColors.ink.secondary,
  sideStripe: foundationColors.border.soft,
  bookmarkBg: foundationColors.bg.paperWarm,
  bookmarkBorder: foundationColors.border.soft,
};

export function getPathVisualTokens(pathId?: PathId, accentOverride?: string): PathVisualTokens {
  const resolved = pathId ? pathVisualMap[pathId] : undefined;
  const fallbackAccent = pathId ? pathColors[pathId] : undefined;
  const accent = accentOverride ?? resolved?.accent ?? fallbackAccent ?? neutralPathVisualTokens.accent;

  if (!resolved) {
    return {
      ...neutralPathVisualTokens,
      accent,
      accentDeep: accent,
      labelText: accent,
      sideStripe: accent,
      bookmarkBg: accent,
      bookmarkBorder: accent,
    };
  }

  return accentOverride
    ? {
        ...resolved,
        accent,
        sideStripe: accent,
        bookmarkBg: accent,
      }
    : resolved;
}

export function getPathSkin(pathId?: PathId, name = "Path", overrides?: Partial<Omit<PathSkin, "name">>): PathSkin {
  const tokens = getPathVisualTokens(pathId, overrides?.color);

  return {
    name,
    color: overrides?.color ?? tokens.accent,
    deepColor: overrides?.deepColor ?? tokens.accentDeep,
    softColor: overrides?.softColor ?? tokens.accentSoft,
  };
}
