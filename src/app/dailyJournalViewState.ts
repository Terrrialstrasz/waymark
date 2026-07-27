import type { BotanicalMotifId } from "../design/botanical-motifs";
import type { PathId } from "../types/ui";
import type { WaymarkMediaItem } from "./waymarkMediaSelectors";

export type DailyJournalContentState = "empty" | "content";

export type DailyJournalEntryItem = {
  id: string;
  sourceId: string;
  sourceType: "mark_instance" | "memory";
  entryType: "mark" | "memory";
  title: string;
  body?: string;
  pathId?: PathId;
  chips: Array<{
    id: string;
    label: string;
    variant: "metadata" | "status";
    stateTone?: "done" | "planned" | "weak" | "missed";
    iconName?: "calendar" | "done" | "heart" | "warning" | "target" | "sparkles" | "clock";
  }>;
  pathLabel: string;
  status: "done" | "default";
  image?: {
    src?: string;
    alt: string;
  };
  mediaItems?: WaymarkMediaItem[];
};

export type DailyJournalMemoryItem = DailyJournalEntryItem & {
  entryType: "memory";
  sourceType: "memory";
  timeLabel?: string;
};

export type DailyJournalTrailItem = DailyJournalEntryItem & {
  entryType: "mark";
  sourceType: "mark_instance";
  timeLabel?: string;
  statusLabel?: string;
  statusTone?: "done" | "planned" | "weak" | "missed";
};

export type DailyJournalClosedDayCard = {
  variant?: "protected" | "repair" | "neutral" | "notClosed";
  dayTitle?: string;
  dayIconSemanticName?: "judgment.trailResult" | "judgment.repairPath";
  characterLabel?: string;
  characterIconSemanticName?: "judgment.protectedCharacter" | "judgment.repairPath";
  summary?: string;
  whatMattered?: string;
  tomorrowFirstStep?: string;
  markCountLabel?: string;
};

export type DailyJournalViewState = {
  dayKey: string;
  dateLabel: string;
  isToday: boolean;
  backgroundMotif?: BotanicalMotifId;
  memoryCount: number;
  featuredMemory?: DailyJournalMemoryItem;
  memoryPreviews: DailyJournalMemoryItem[];
  memoryOverflowCount: number;
  trailEntries: DailyJournalTrailItem[];
  entries: DailyJournalEntryItem[];
  closedDayCard?: DailyJournalClosedDayCard;
  previousDayKey: string;
  nextDayKey?: string;
};

type SortableDailyEntry = {
  sortAt: string;
  entry: DailyJournalEntryItem;
};

export function resolveDailyJournalContentState(input: {
  memoryCount?: number;
  trailEntries?: unknown[];
  entries?: unknown[];
  closedDayCard?: unknown;
}): DailyJournalContentState {
  const hasNewContent =
    (input.memoryCount ?? 0) > 0 ||
    (input.trailEntries?.length ?? 0) > 0 ||
    Boolean(input.closedDayCard);
  const hasLegacyContent = (input.entries?.length ?? 0) > 0 || Boolean(input.closedDayCard);
  return hasNewContent || hasLegacyContent ? "content" : "empty";
}

export function projectDailyJournalViewState(input: {
  dayKey: string;
  todayKey: string;
  dateLabel: string;
  backgroundMotif?: BotanicalMotifId;
  entries: SortableDailyEntry[];
  closedDayCard?: DailyJournalClosedDayCard;
}): DailyJournalViewState {
  const sorted = input.entries
    .slice()
    .sort((left, right) => left.sortAt.localeCompare(right.sortAt) || left.entry.id.localeCompare(right.entry.id));
  const entries = sorted.map(({ entry }) => entry);
  const sortedMemories = sorted
    .filter((item): item is SortableDailyEntry & { entry: DailyJournalMemoryItem } => item.entry.entryType === "memory")
    .sort(compareNewestFirst)
    .map(({ entry }) => withEntryLabels(entry));
  const featuredMemory = selectFeaturedMemory(sortedMemories);
  const memoryPreviews = sortedMemories
    .filter((memory) => memory.id !== featuredMemory?.id)
    .slice();
  const memoryOverflowCount = Math.max(0, sortedMemories.length - (featuredMemory ? 1 : 0) - memoryPreviews.length);
  const trailEntries = sorted
    .filter((item): item is SortableDailyEntry & { entry: DailyJournalTrailItem } => item.entry.entryType === "mark")
    .map(({ entry }) => withEntryLabels(entry));

  return {
    dayKey: input.dayKey,
    dateLabel: input.dateLabel,
    isToday: input.dayKey === input.todayKey,
    backgroundMotif: input.backgroundMotif,
    memoryCount: sortedMemories.length,
    featuredMemory,
    memoryPreviews,
    memoryOverflowCount,
    trailEntries,
    entries,
    closedDayCard: input.closedDayCard,
    previousDayKey: shiftDailyJournalDate(input.dayKey, -1),
    nextDayKey: input.dayKey < input.todayKey ? shiftDailyJournalDate(input.dayKey, 1) : undefined,
  };
}

export function shiftDailyJournalDate(localDate: string, offsetDays: number) {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function compareNewestFirst(left: SortableDailyEntry, right: SortableDailyEntry) {
  return right.sortAt.localeCompare(left.sortAt) || right.entry.id.localeCompare(left.entry.id);
}

function selectFeaturedMemory(memories: DailyJournalMemoryItem[]) {
  return memories.find(hasRenderableMedia) ?? memories[0];
}

function hasRenderableMedia(memory: DailyJournalMemoryItem) {
  return Boolean(memory.image?.src || memory.mediaItems?.some((item) => item.posterSrc || item.src || item.assetId));
}

function withEntryLabels<T extends DailyJournalEntryItem>(entry: T) {
  const timeLabel = entry.chips.find((chip) => chip.iconName === "clock")?.label;
  const statusChip = entry.chips.find((chip) => chip.variant === "status");
  const statusLabel = statusChip?.label;
  const statusTone = statusChip?.stateTone;
  return {
    ...entry,
    timeLabel,
    statusLabel,
    statusTone,
  } as T & { timeLabel?: string; statusLabel?: string; statusTone?: "done" | "planned" | "weak" | "missed" };
}
