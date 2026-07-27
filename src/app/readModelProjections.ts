import type { Memory, MarkInstance } from "../domain/waymark";
import { MarkInstanceStatus } from "../domain/waymark/enums";
import type { Locale } from "../types/ui";
import type { PathId } from "../types/ui";
import type { PathProofItem } from "../components/paths/types";
import type { MarkMetadata } from "../lib/waymark/markMetadataStore";
import type { CharacterProofEvent } from "../lib/waymark/characterProjection";
import { resolveMarkJournalTime, resolveMemoryJournalTime } from "./journalEntryTime";

export function mapMarkToJournalEntry(
  mark: {
    id: string;
    title: string;
    description?: string;
    completionSummary?: string;
    proofNote?: string;
    status: MarkInstanceStatus;
    completedAt?: string;
    skippedAt?: string;
    createdAt: string;
  },
  metadata: MarkMetadata | null,
  locale: Locale,
  pathLabel: string,
  timezone: string = "UTC",
  pathId?: PathId,
) {
  const time = resolveMarkJournalTime({ ...mark, timezone });
  const statusLabel = resolveJournalMarkStatusLabel(mark.status, metadata, locale);
  const statusTone =
    mark.status === MarkInstanceStatus.Skipped ||
    mark.status === MarkInstanceStatus.Substituted ||
    mark.status === MarkInstanceStatus.Rescheduled ||
    metadata?.resolutionKind === "honestly_resolved_rescheduled" ||
    metadata?.resolutionKind === "honestly_resolved_substituted" ||
    metadata?.resolutionKind === "not_kept"
      ? "missed"
      : "done";

  return {
    id: `mark-${mark.id}-${mark.completedAt ?? mark.skippedAt ?? mark.createdAt}`,
    sourceId: mark.id,
    sourceType: "mark_instance" as const,
    entryType: "mark" as const,
    title: mark.title,
    body: mark.completionSummary ?? mark.proofNote ?? mark.description ?? undefined,
    chips: [
      ...(time.chipLabel
        ? [
            {
              id: `${mark.id}-time`,
              label: time.chipLabel,
              iconName: "clock" as const,
              variant: "metadata" as const,
            },
          ]
        : []),
      {
        id: `${mark.id}-status`,
        label: statusLabel,
        variant: "status" as const,
        stateTone: statusTone as "done" | "missed",
      },
    ],
    pathId,
    pathLabel,
    status: "done" as const,
  };
}

function resolveJournalMarkStatusLabel(
  status: MarkInstanceStatus,
  metadata: MarkMetadata | null,
  locale: Locale,
) {
  if (status === MarkInstanceStatus.Completed) {
    return metadata?.resolutionKind === "discipline_kept"
      ? locale === "vi" ? "Ky luat da giu" : "Discipline kept"
      : locale === "vi" ? "Da xong" : "Done";
  }

  if (status === MarkInstanceStatus.Rescheduled) {
    return locale === "vi" ? "Da doi lich" : "Rescheduled";
  }

  if (status === MarkInstanceStatus.Skipped) {
    return locale === "vi" ? "Da bo qua" : "Skipped";
  }

  if (status === MarkInstanceStatus.Substituted) {
    return locale === "vi" ? "Da thay the" : "Substituted";
  }

  if (metadata?.resolutionKind === "not_kept") {
    return locale === "vi" ? "Khong giu" : "Not kept";
  }

  if (metadata?.resolutionKind === "honestly_resolved") {
    return "Protected";
  }

  return locale === "vi" ? "Da giai quyet" : "Resolved";
}

export function buildPathProofItems(
  marks: Array<{ mark: Pick<MarkInstance, "id" | "title" | "completedAt" | "createdAt">; metadata: MarkMetadata | null }>,
  memories: Memory[],
  locale: Locale,
  timezone: string = "UTC",
) {
  const markProofs = marks
    .filter(({ mark, metadata }) => Boolean(mark.completedAt) && metadata?.appearsInPathProof !== false && metadata?.countsAsPathProof !== false)
    .sort((left, right) =>
      (right.mark.completedAt ?? right.mark.createdAt).localeCompare(left.mark.completedAt ?? left.mark.createdAt),
    )
    .slice(0, 2)
    .map(
      ({ mark, metadata }) =>
        ({
          id: mark.id,
          kind: "mark",
          title: { en: mark.title, vi: mark.title },
          metadata: {
            en:
              metadata?.sourceDisciplineProofId
                ? "Discipline kept"
                : resolveMarkJournalTime({
                    status: MarkInstanceStatus.Completed,
                    timezone,
                    completedAt: mark.completedAt,
                    createdAt: mark.createdAt,
                  }).chipLabel ?? mark.completedAt ?? mark.createdAt,
            vi:
              metadata?.sourceDisciplineProofId
                ? "Discipline kept"
                : resolveMarkJournalTime({
                    status: MarkInstanceStatus.Completed,
                    timezone,
                    completedAt: mark.completedAt,
                    createdAt: mark.createdAt,
                  }).chipLabel ?? mark.completedAt ?? mark.createdAt,
          },
          sourceDisciplineProofId: metadata?.sourceDisciplineProofId,
        }) satisfies PathProofItem,
    );

  const memoryProofs = memories
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))
    .slice(0, Math.max(0, 2 - markProofs.length))
    .map(
      (memory) =>
        ({
          id: memory.id,
          kind: "memory",
          title: { en: memory.title, vi: memory.title },
          metadata: {
            en: resolveMemoryJournalTime({ capturedAt: memory.capturedAt, timezone }).chipLabel ?? memory.capturedAt,
            vi: resolveMemoryJournalTime({ capturedAt: memory.capturedAt, timezone }).chipLabel ?? memory.capturedAt,
          },
        }) satisfies PathProofItem,
    );

  void locale;
  return [...markProofs, ...memoryProofs];
}

export function buildCharacterPathProofItems(events: CharacterProofEvent[]) {
  return events.slice(0, 2).map(
    (event) =>
      ({
        id: event.id,
        kind: "mark",
        title: { en: event.title, vi: event.title },
        metadata: { en: event.detail ?? event.occurredAt, vi: event.detail ?? event.occurredAt },
        sourceDisciplineProofId: event.sourceDisciplineProofId,
      }) satisfies PathProofItem,
  );
}
