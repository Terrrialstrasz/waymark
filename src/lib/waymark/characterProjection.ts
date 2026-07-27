import type { MarkInstance } from "../../domain/waymark";
import type { DisciplineProof } from "./disciplineProofStore";
import type { MarkMetadata } from "./markMetadataStore";

export type CharacterJudgment = "steady" | "protective" | "repairing" | "quiet";

export type CharacterProofEvent = {
  id: string;
  title: string;
  occurredAt: string;
  kind: "discipline" | "kept_mark" | "protected_mark" | "repair_mark";
  detail?: string;
  sourceDisciplineProofId?: string;
};

export type CharacterProjection = {
  judgment: CharacterJudgment;
  displayLabel?: string;
  keptCount: number;
  protectedCount: number;
  repairCount: number;
  completedMarkCount: number;
  disciplineProofCount: number;
  honestResolutionCount: number;
  proofEvents: CharacterProofEvent[];
};

type ProjectableMark = {
  mark: MarkInstance;
  metadata: MarkMetadata | null;
};

const NON_PROTECTIVE_REASONS = new Set(["avoidance", "forgot", "unclear"]);

export function projectCharacterFromRecords(input: {
  marks: ProjectableMark[];
  disciplineProofs: DisciplineProof[];
}): CharacterProjection {
  const proofEvents: CharacterProofEvent[] = [];
  let keptCount = 0;
  let protectedCount = 0;
  let repairCount = 0;
  let completedMarkCount = 0;
  let honestResolutionCount = 0;
  const disciplineProofCount = input.disciplineProofs.length;

  for (const proof of input.disciplineProofs) {
    keptCount += 1;
    proofEvents.push({
      id: `discipline:${proof.id}`,
      title: proof.label,
      occurredAt: proof.savedAt,
      kind: "discipline",
      sourceDisciplineProofId: proof.id,
    });
  }

  for (const { mark, metadata } of input.marks) {
    if (metadata?.quickMarkType === "discipline_to_keep") {
      continue;
    }

    if (isProtectedResolution(metadata)) {
      protectedCount += 1;
      honestResolutionCount += 1;
      proofEvents.push({
        id: `protected:${mark.id}`,
        title: mark.title,
        occurredAt: mark.completedAt ?? mark.createdAt,
        kind: "protected_mark",
        detail: metadata?.resolutionReason,
      });
      continue;
    }

    if (isRepairResolution(metadata)) {
      repairCount += 1;
      proofEvents.push({
        id: `repair:${mark.id}`,
        title: mark.title,
        occurredAt: mark.completedAt ?? mark.createdAt,
        kind: "repair_mark",
        detail: metadata?.resolutionReason,
      });
      continue;
    }

    if (mark.status === "completed" && metadata?.countsAsPathProof !== false) {
      keptCount += 1;
      completedMarkCount += 1;
      proofEvents.push({
        id: `kept:${mark.id}`,
        title: mark.title,
        occurredAt: mark.completedAt ?? mark.createdAt,
        kind: "kept_mark",
        detail: mark.completionSummary ?? mark.proofNote ?? mark.description,
      });
    }
  }

  const sortedEvents = proofEvents.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  const judgment =
    keptCount > 0 ? "steady"
    : protectedCount > 0 ? "protective"
    : repairCount > 0 ? "repairing"
    : "quiet";

  return {
    judgment,
    displayLabel:
      judgment === "steady" ? "Steady"
      : judgment === "protective" ? "Protective"
      : judgment === "repairing" ? "Repairing"
      : undefined,
    keptCount,
    protectedCount,
    repairCount,
    completedMarkCount,
    disciplineProofCount,
    honestResolutionCount,
    proofEvents: sortedEvents,
  };
}

function isProtectedResolution(metadata: MarkMetadata | null): boolean {
  if (!metadata) {
    return false;
  }
  if (hasNonProtectiveReason(metadata.resolutionReason)) {
    return false;
  }
  if (metadata.characterEffect === "protected") {
    return true;
  }
  return (
    metadata.resolutionKind === "honestly_resolved" ||
    metadata.resolutionKind === "honestly_resolved_rescheduled" ||
    metadata.resolutionKind === "honestly_resolved_substituted"
  );
}

function isRepairResolution(metadata: MarkMetadata | null): boolean {
  if (!metadata) {
    return false;
  }
  if (metadata.characterEffect === "broken" || metadata.characterEffect === "unresolved") {
    return true;
  }
  return hasNonProtectiveReason(metadata.resolutionReason);
}

function hasNonProtectiveReason(reason?: string): boolean {
  return NON_PROTECTIVE_REASONS.has((reason ?? "").trim().toLowerCase());
}
