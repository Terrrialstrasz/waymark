import { Locale, PathId } from "../../../types/ui";
import { TodayPathHeroPath, todayPathHeroPaths } from "../../../lib/waymark/todayPathHero";

export type TodayPathHeroFixture = {
  id: string;
  title: string;
  selectedPathId: PathId;
  paths?: TodayPathHeroPath[];
  isLoading?: boolean;
  isPathDetailEnabled?: boolean;
};

export const todayPathHeroFixtures: TodayPathHeroFixture[] = [
  { id: "family-home", title: "family-home selected", selectedPathId: "family", isPathDetailEnabled: true },
  { id: "career-craft", title: "career-craft selected", selectedPathId: "career", isPathDetailEnabled: true },
  { id: "snag-golf-vietnam", title: "snag-golf-vietnam selected", selectedPathId: "snag", isPathDetailEnabled: true },
  { id: "health-body", title: "health-body selected", selectedPathId: "health", isPathDetailEnabled: true },
  { id: "character-stoicism", title: "character-stoicism selected", selectedPathId: "character", isPathDetailEnabled: true },
  { id: "golf-craft", title: "golf-craft selected", selectedPathId: "golf", isPathDetailEnabled: true },
  { id: "culture-class-romance", title: "culture-class-romance selected", selectedPathId: "culture", isPathDetailEnabled: true },
  {
    id: "missing-image",
    title: "Missing image fallback",
    selectedPathId: "snag",
    paths: todayPathHeroPaths.map((path) => (path.id === "snag" ? { ...path, heroAssetId: undefined } : path)),
  },
  {
    id: "long-title",
    title: "Long localized title",
    selectedPathId: "culture",
    paths: todayPathHeroPaths.map((path) =>
      path.id === "culture"
        ? {
            ...path,
            label: {
              en: path.label.en,
              vi: "Van hoa, Khi chat va Lang man",
            },
            titleFontSize: 23,
          }
        : path
    ),
  },
  {
    id: "loading",
    title: "Loading",
    selectedPathId: "family",
    isLoading: true,
  },
  {
    id: "detail-disabled",
    title: "Path detail disabled",
    selectedPathId: "career",
    isPathDetailEnabled: false,
  },
];

export const narrowViewportFixture = {
  id: "narrow-viewport",
  title: "Narrow viewport",
  selectedPathId: "character" as PathId,
};

export function getTodayPathHeroFixtureTitle(locale: Locale, title: string) {
  return locale === "vi" ? title : title;
}
