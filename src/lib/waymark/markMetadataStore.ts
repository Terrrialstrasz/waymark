import type { AppSettingsRepository } from "../../domain/waymark";

export type MarkResolutionKind =
  | "completed"
  | "honestly_resolved"
  | "honestly_resolved_rescheduled"
  | "honestly_resolved_substituted"
  | "discipline_kept"
  | "not_kept"
  | "unresolved";

export type MarkCharacterEffect = "kept" | "protected" | "broken" | "unresolved";

export type MarkMetadata = {
  markId: string;
  quickMarkType?: "discipline_to_keep";
  source?: "close_trail";
  sourceKind?: "weekly_coding" | "generated_by_engine";
  sourceDisciplineProofId?: string;
  sourceDisciplineKey?: string;
  appearsInToday?: boolean;
  appearsInPathProof?: boolean;
  appearsInJournal?: boolean;
  resolutionKind?: MarkResolutionKind;
  resolutionReason?: string;
  characterEffect?: MarkCharacterEffect;
  countsAsPathProof?: boolean;
  orderIndex?: number;
  blockType?: "focus_block" | "supervising_block" | "family_block" | "workout_block";
  taskKind?: "work_focus";
  requiresText?: boolean;
  milestoneSourceSeedId?: string;
};

const MARK_METADATA_PREFIX = "mark_metadata:";

function key(markId: string) {
  return `${MARK_METADATA_PREFIX}${markId}`;
}

export async function getMarkMetadata(
  settings: AppSettingsRepository,
  userId: string,
  markId: string,
): Promise<MarkMetadata | null> {
  const setting = await settings.getSetting(userId, key(markId));
  if (!setting || typeof setting.value !== "object" || setting.value === null) {
    return null;
  }
  return setting.value as MarkMetadata;
}

export async function setMarkMetadata(
  settings: AppSettingsRepository,
  userId: string,
  metadata: MarkMetadata,
): Promise<MarkMetadata> {
  await settings.setSetting(userId, key(metadata.markId), metadata);
  return metadata;
}
