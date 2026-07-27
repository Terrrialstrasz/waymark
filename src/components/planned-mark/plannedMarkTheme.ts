import { foundationColors } from "../../theme/tokens";
import { PathId } from "../../types/ui";
import { getTodayPathHeroPath, todayPathHeroPaths } from "../../lib/waymark/todayPathHero";

export type PlannedMarkPathTheme = {
  ink: string;
  surface: string;
  surfaceSoft: string;
  border: string;
  accent: string;
  deep: string;
};

export function getPlannedMarkPathTheme(pathId: PathId): PlannedMarkPathTheme {
  const path = getTodayPathHeroPath(pathId, todayPathHeroPaths);

  return {
    ink: foundationColors.ink.primary,
    surface: foundationColors.bg.paper,
    surfaceSoft: path.color.accentSoft,
    border: path.color.accentMuted,
    accent: path.color.accent,
    deep: path.color.accentDeep,
  };
}

export function resolvePlannedMarkPathId(pathLabel: string): PathId {
  const normalized = pathLabel.trim().toLowerCase();

  switch (normalized) {
    case "family & home":
    case "gia đình & tổ ấm":
    case "gia dinh & to am":
      return "family";
    case "career craft":
    case "sự nghiệp & tay nghề":
    case "su nghiep & tay nghe":
      return "career";
    case "health & body":
    case "sức khỏe & cơ thể":
    case "suc khoe & co the":
      return "health";
    case "character & stoicism":
    case "character stoicism":
      return "character";
    case "golf craft":
      return "golf";
    case "culture, class & romance":
    case "culture class romance":
      return "culture";
    case "snag golf vietnam":
      return "snag";
    default:
      return "career";
  }
}
