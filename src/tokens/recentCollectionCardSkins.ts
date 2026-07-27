import { BotanicalMotifId } from "../design/botanical-motifs";
import { foundationColors } from "../theme/tokens";

export type RecentCollectionMotifDensity = "sparse" | "standard" | "rich";
export type RecentCollectionWeekdayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type RecentCollectionCardSkin = {
  motif: BotanicalMotifId;
  anchor: {
    top?: number | `${number}%`;
    right?: number | `${number}%`;
    bottom?: number | `${number}%`;
    left?: number | `${number}%`;
    translateX?: number;
    translateY?: number;
  };
  widthPercent: number;
  opacity: number;
  rotation: number;
  scale: number;
  tint: string;
  density: RecentCollectionMotifDensity;
};

export const recentCollectionWeekdayMotifs: Record<RecentCollectionWeekdayKey, RecentCollectionCardSkin> = {
  monday: {
    motif: "botanical.cornerBranch",
    anchor: { right: "-10%", bottom: "-16%", translateX: 2, translateY: 1 },
    widthPercent: 162,
    opacity: 0.34,
    rotation: -8,
    scale: 1.48,
    tint: foundationColors.gold.deep,
    density: "standard",
  },
  tuesday: {
    motif: "botanical.leafVein",
    anchor: { right: "-18%", top: "-14%", translateX: -2, translateY: -1 },
    widthPercent: 176,
    opacity: 0.3,
    rotation: 6,
    scale: 1.52,
    tint: foundationColors.green.deep,
    density: "rich",
  },
  wednesday: {
    motif: "botanical.pressedLeaf",
    anchor: { left: "-8%", bottom: "-18%", translateX: -2, translateY: 1 },
    widthPercent: 148,
    opacity: 0.34,
    rotation: -4,
    scale: 1.5,
    tint: foundationColors.clay.base,
    density: "standard",
  },
  thursday: {
    motif: "botanical.trailCurve",
    anchor: { right: "-14%", bottom: "-20%", translateX: 0, translateY: 1 },
    widthPercent: 188,
    opacity: 0.28,
    rotation: 4,
    scale: 1.5,
    tint: foundationColors.green.deep,
    density: "sparse",
  },
  friday: {
    motif: "botanical.sectionSprig",
    anchor: { left: "-8%", top: "-10%", translateX: -1, translateY: -1 },
    widthPercent: 172,
    opacity: 0.34,
    rotation: 3,
    scale: 1.5,
    tint: foundationColors.gold.base,
    density: "standard",
  },
  saturday: {
    motif: "botanical.sprig",
    anchor: { right: "-2%", bottom: "-16%", translateX: 1, translateY: 1 },
    widthPercent: 160,
    opacity: 0.3,
    rotation: -7,
    scale: 1.52,
    tint: foundationColors.green.deep,
    density: "sparse",
  },
  sunday: {
    motif: "botanical.headerSystemSprig",
    anchor: { left: "-10%", top: "-12%", translateX: -3, translateY: -2 },
    widthPercent: 186,
    opacity: 0.28,
    rotation: -3,
    scale: 1.48,
    tint: foundationColors.gold.deep,
    density: "rich",
  },
} as const;

const weekdayOrder: readonly RecentCollectionWeekdayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const fallbackWeekdayOrder: readonly RecentCollectionWeekdayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export function resolveRecentCollectionCardSkin(date?: Date | null, visualIndex = 0) {
  const weekdayKey = date ? weekdayOrder[date.getDay()] : fallbackWeekdayOrder[positiveModulo(visualIndex, fallbackWeekdayOrder.length)];
  return recentCollectionWeekdayMotifs[weekdayKey];
}

export function getRecentCollectionWeekdayKey(date?: Date | null, visualIndex = 0): RecentCollectionWeekdayKey {
  return date ? weekdayOrder[date.getDay()] : fallbackWeekdayOrder[positiveModulo(visualIndex, fallbackWeekdayOrder.length)];
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
