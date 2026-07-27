import { ReactNode } from "react";
import { WaymarkImageAssetId } from "../../assets/imageRegistry";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { formatJournalDateLabel } from "../journal/journalPlaceholders";
import { getPathSkin, PathSkin } from "../../tokens/pathVisualTokens";
import { getPathHeroImage } from "../../tokens/pathHeroImages";
import { FeatureState, Locale, PathId } from "../../types/ui";
import type { WaymarkMediaItem } from "../../app/waymarkMediaSelectors";
import { MediaAssetKind } from "../../domain/waymark";

export type MarkDetailMetadataItem = {
  id: string;
  label: string;
  value?: string;
  icon?: ReactNode;
  iconSemanticName?: WaymarkSemanticIconName;
  onPress?: () => void;
};

export type MarkDetailExpeditionItem = {
  id: string;
  title: string;
  milestoneLabel?: string;
  description?: string;
  href?: string;
  icon?: ReactNode;
  iconSemanticName?: WaymarkSemanticIconName;
  gate?: FeatureState;
  disabled?: boolean;
  onPress?: () => void;
};

export type MarkDetailItem = {
  id: string;
  title: string;
  note?: string;
  date: string | Date;
  status: "planned" | "done" | "missed" | "skipped" | string;
  sourceType?: "plannedMark" | "quickMark" | string;
  path: {
    id?: PathId | string;
    name: string;
    iconSemanticName?: WaymarkSemanticIconName;
    skin: {
      color: string;
      deepColor: string;
      softColor: string;
    };
  };
  proofDetail?: string;
  media?: {
    assetId?: WaymarkImageAssetId;
    url?: string;
    alt?: string;
    optimizedUrl?: string;
  };
  mediaItems?: Array<WaymarkMediaItem | { assetId?: WaymarkImageAssetId; alt?: string; src?: string }>;
  checklist?: {
    title?: string;
    items: Array<{
      id: string;
      label: string;
      checked: boolean;
    }>;
  };
  metadata: MarkDetailMetadataItem[];
  expeditions?: MarkDetailExpeditionItem[];
};

export type MarkDetailTemplateProps = {
  mark: MarkDetailItem;
  locale?: Locale;
  onBack?: () => void;
  onOpenExpedition?: (expedition: MarkDetailExpeditionItem) => void;
  headerTitle?: string;
  entityKind?: "mark" | "memory";
  onMarkAsMemory?: (mark: MarkDetailItem) => void;
  onAddPhoto?: (mark: MarkDetailItem) => void;
  signalContent?: ReactNode;
  actionButtons?: Array<{
    id: string;
    label: string;
    variant?: "primary" | "secondary" | "ghost";
    onPress?: () => void;
  }>;
};

export function resolveMarkPathId(pathId?: string, pathName?: string): PathId | undefined {
  if (pathId && isPathId(pathId)) {
    return pathId;
  }

  const normalized = normalizeLookup(pathName);

  switch (normalized) {
    case "career craft":
      return "career";
    case "snag golf vietnam":
    case "snag golf":
    case "snag":
      return "snag";
    case "health body":
    case "health":
      return "health";
    case "family home":
    case "family":
      return "family";
    case "character stoicism":
    case "character":
      return "character";
    case "golf craft":
    case "golf":
      return "golf";
    case "culture class romance":
    case "culture":
      return "culture";
    default:
      return undefined;
  }
}

export function resolveMarkPathSkin(mark: MarkDetailItem) {
  const pathId = resolveMarkPathId(mark.path.id, mark.path.name);

  return {
    pathId,
    skin: getPathSkin(pathId, mark.path.name, {
      color: mark.path.skin.color,
      deepColor: mark.path.skin.deepColor,
      softColor: mark.path.skin.softColor,
    }),
  };
}

export function resolveMarkPathShortLabel(pathId: PathId | undefined, pathName: string) {
  switch (pathId) {
    case "career":
      return "Career";
    case "snag":
      return "Snag";
    case "health":
      return "Health";
    case "family":
      return "Family";
    case "character":
      return "Character";
    case "golf":
      return "Golf";
    case "culture":
      return "Culture";
    default: {
      const [firstWord] = pathName.trim().split(/\s+/);
      return firstWord || pathName;
    }
  }
}

export function resolveMarkPathSemanticName(pathId?: PathId): WaymarkSemanticIconName {
  switch (pathId) {
    case "career":
      return "pathIdentity.careerCraft";
    case "snag":
      return "pathIdentity.snagGolf";
    case "health":
      return "pathIdentity.healthBody";
    case "family":
      return "pathIdentity.familyHome";
    case "character":
      return "pathIdentity.characterShield";
    case "golf":
      return "pathIdentity.golfCraft";
    case "culture":
      return "pathIdentity.cultureRomance";
    default:
      return "entity.path";
  }
}

export function resolveMarkHeroAssetId(pathId?: PathId): WaymarkImageAssetId | undefined {
  return getPathHeroImage(pathId)?.assetId;
}

export function formatMarkDetailDate(date: string | Date, locale: Locale) {
  const resolvedDate = typeof date === "string" ? new Date(date) : date;
  return formatJournalDateLabel(resolvedDate, locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatMarkDetailOverlayDate(date: string | Date, locale: Locale) {
  const resolvedDate = typeof date === "string" ? new Date(date) : date;
  return formatJournalDateLabel(resolvedDate, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isPlannedMarkSource(sourceType?: string) {
  return sourceType === "plannedMark";
}

export function resolveMarkMediaItems(mark: MarkDetailItem): WaymarkMediaItem[] {
  const fromItems = (mark.mediaItems ?? [])
    .filter((item) => item?.src || item?.assetId || ("posterSrc" in item && item.posterSrc))
    .map((item, index) => ({
      ...item,
      alt: item.alt ?? "",
      assetId: "assetId" in item ? item.assetId : undefined,
      id: "id" in item && item.id ? item.id : `${mark.id}:media:${index}`,
      kind: "kind" in item && item.kind ? item.kind : MediaAssetKind.Image,
      posterSrc: "posterSrc" in item ? item.posterSrc : undefined,
      sortIndex: "sortIndex" in item && typeof item.sortIndex === "number" ? item.sortIndex : index,
      src: item.src,
    }));

  if (fromItems.length) {
    return fromItems;
  }

  const fallbackSingle = mark.media
    ? [
        {
          alt: mark.media.alt ?? "",
          assetId: mark.media.assetId,
          id: `${mark.id}:legacy-media`,
          kind: MediaAssetKind.Image,
          posterSrc: mark.media.optimizedUrl ?? mark.media.url,
          sortIndex: 0,
          src: mark.media.optimizedUrl ?? mark.media.url,
        },
      ].filter((item) => item.src || item.posterSrc || item.assetId)
    : [];

  return fallbackSingle;
}

export function replaceTemplateValue(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((resolved, [key, value]) => resolved.replace(`{${key}}`, value), template);
}

function normalizeLookup(value?: string) {
  return (
    value
      ?.normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/&/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim() ?? ""
  );
}

function isPathId(value: string): value is PathId {
  return ["career", "snag", "health", "family", "character", "golf", "culture"].includes(value);
}

export type MarkDetailResolvedPath = {
  pathId?: PathId;
  skin: PathSkin;
};
