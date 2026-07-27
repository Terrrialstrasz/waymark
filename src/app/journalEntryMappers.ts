import type { Memory } from "../domain/waymark/entities";
import type { Locale } from "../types/ui";
import type { PathId } from "../types/ui";
import { resolveMemoryJournalTime } from "./journalEntryTime";
import type { WaymarkMediaItem } from "./waymarkMediaSelectors";

export function mapMemoryToDailyEntry(
  memory: Memory,
  locale: Locale,
  pathLabel: string,
  pathId?: PathId,
  timezone: string = "UTC",
  image?: {
    src?: string;
    alt: string;
  },
  mediaItems?: WaymarkMediaItem[],
) {
  const time = resolveMemoryJournalTime({ ...memory, timezone });

  return {
    id: `memory-${memory.id}-${memory.capturedAt}`,
    sourceId: memory.id,
    sourceType: "memory" as const,
    entryType: "memory" as const,
    title: memory.title,
    body: memory.note ?? undefined,
    chips: [
      ...(time.chipLabel
        ? [
            {
              id: `${memory.id}-time`,
              label: time.chipLabel,
              iconName: "clock" as const,
              variant: "metadata" as const,
            },
          ]
        : []),
      { id: `${memory.id}-chip`, label: locale === "vi" ? "Ky uc" : "Memory", variant: "metadata" as const },
    ],
    pathId,
    pathLabel,
    status: "default" as const,
    image,
    mediaItems,
  };
}
