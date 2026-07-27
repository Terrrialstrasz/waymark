import type { AppSettingsRepository } from "../../domain/waymark";

export type DisciplineSelectionInput = {
  key: string;
  label: string;
  pathId: string;
};

export type DisciplineProof = {
  id: string;
  trailDayId: string;
  pathId: string;
  key: string;
  label: string;
  createdMarkId?: string;
  savedAt: string;
};

const DISCIPLINE_PROOF_PREFIX = "discipline_proof:";

function buildKey(trailDayId: string, proofId: string) {
  return `${DISCIPLINE_PROOF_PREFIX}${trailDayId}:${proofId}`;
}

export async function createDisciplineProof(
  settings: AppSettingsRepository,
  userId: string,
  input: Omit<DisciplineProof, "id"> & { id?: string },
): Promise<DisciplineProof> {
  const proof: DisciplineProof = {
    id: input.id ?? `discipline_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    ...input,
  };
  await settings.setSetting(userId, buildKey(proof.trailDayId, proof.id), proof);
  return proof;
}

export async function saveDisciplineProof(
  settings: AppSettingsRepository,
  userId: string,
  proof: DisciplineProof,
): Promise<DisciplineProof> {
  await settings.setSetting(userId, buildKey(proof.trailDayId, proof.id), proof);
  return proof;
}

export async function listDisciplineProofsByTrailDay(
  settings: AppSettingsRepository,
  userId: string,
  trailDayId: string,
): Promise<DisciplineProof[]> {
  const all = await settings.listSettings(userId);
  return all
    .filter((setting) => setting.key.startsWith(`${DISCIPLINE_PROOF_PREFIX}${trailDayId}:`))
    .map((setting) => setting.value)
    .filter((value): value is DisciplineProof => typeof value === "object" && value !== null)
    .map((value) => value as DisciplineProof);
}
