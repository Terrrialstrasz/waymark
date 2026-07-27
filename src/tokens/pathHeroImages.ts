import { WaymarkImageAssetId } from "../assets/imageRegistry";
import { TodayPathHeroFocalPoint, todayPathHeroPaths } from "../lib/waymark/todayPathHero";
import { pathColors } from "../theme/tokens";
import { Locale, PathId } from "../types/ui";

type PathHeroRegistryItem = {
  pathId: PathId;
  assetId?: WaymarkImageAssetId;
  accentColor: string;
  labels: Record<Locale, string>;
  aliases: readonly string[];
  focalPoint?: TodayPathHeroFocalPoint;
};

const aliasMap: Record<PathId, readonly string[]> = {
  career: ["career", "career craft", "su nghiep", "cong viec"],
  snag: ["snag", "snag golf", "snag golf vietnam"],
  health: ["health", "health body", "suc khoe", "than the"],
  family: ["family", "family home", "gia dinh", "to am"],
  character: ["character", "stoicism", "character stoicism", "khi chat", "pham chat"],
  golf: ["golf", "golf craft"],
  culture: ["culture", "culture class romance", "lang man", "van hoa", "romance"],
};

export const pathHeroImageRegistry: Record<PathId, PathHeroRegistryItem> = todayPathHeroPaths.reduce(
  (registry, path) => {
    registry[path.id] = {
      pathId: path.id,
      assetId: path.heroAssetId,
      accentColor: pathColors[path.id],
      labels: path.label,
      aliases: aliasMap[path.id],
      focalPoint: path.heroFocalPoint,
    };
    return registry;
  },
  {} as Record<PathId, PathHeroRegistryItem>
);

const normalizedAliasIndex = Object.values(pathHeroImageRegistry).flatMap((entry) =>
  entry.aliases.map((alias) => [normalizeLookupText(alias), entry.pathId] as const)
);

const normalizedLabelIndex = Object.values(pathHeroImageRegistry).flatMap((entry) =>
  Object.values(entry.labels).map((label) => [normalizeLookupText(label), entry.pathId] as const)
);

const pathHintIndex = new Map<string, PathId>([...normalizedAliasIndex, ...normalizedLabelIndex]);

export function getPathHeroImage(pathId: PathId | undefined) {
  return pathId ? pathHeroImageRegistry[pathId] : undefined;
}

export function resolvePathIdFromHint(hint?: string | null) {
  if (!hint) {
    return undefined;
  }

  const normalized = normalizeLookupText(hint);

  for (const [candidate, pathId] of pathHintIndex.entries()) {
    if (normalized.includes(candidate)) {
      return pathId;
    }
  }

  return undefined;
}

export function resolvePathHeroFromHint(hint?: string | null) {
  const pathId = resolvePathIdFromHint(hint);
  return pathId ? pathHeroImageRegistry[pathId] : undefined;
}

function normalizeLookupText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
