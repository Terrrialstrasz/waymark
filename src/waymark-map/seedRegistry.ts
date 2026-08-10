import type { AppSettingsRepository } from "../domain/waymark";
import type { SeedEntityType, SeedOwnership, SeedRecord } from "./types";

const SEED_RECORD_PREFIX = "seed_registry:";

function buildSeedRecordKey(entityType: SeedEntityType, entityId: string) {
  return `${SEED_RECORD_PREFIX}${entityType}:${entityId}`;
}

export async function getSeedRecord(
  settings: AppSettingsRepository,
  userId: string,
  entityType: SeedEntityType,
  entityId: string,
): Promise<SeedRecord | null> {
  const setting = await settings.getSetting(userId, buildSeedRecordKey(entityType, entityId));
  if (!setting || typeof setting.value !== "object" || setting.value === null) {
    return null;
  }
  return setting.value as SeedRecord;
}

export async function saveSeedRecord(
  settings: AppSettingsRepository,
  userId: string,
  record: SeedRecord,
): Promise<SeedRecord> {
  await settings.setSetting(userId, buildSeedRecordKey(record.entityType, record.entityId), record);
  return record;
}

export async function replaceSeedRecordForSource(
  settings: AppSettingsRepository,
  userId: string,
  record: SeedRecord,
): Promise<SeedRecord> {
  await replaceSeedRecordsForSources(settings, userId, [record]);
  return record;
}

export async function replaceSeedRecordsForSources(
  settings: AppSettingsRepository,
  userId: string,
  records: SeedRecord[],
): Promise<SeedRecord[]> {
  const existingRecords = await listSeedRecords(settings, userId);
  const replacements = new Map(
    records.map((record) => [`${record.entityType}:${record.sourceSeedId}`, record] as const),
  );
  const staleRecords = existingRecords.filter(
    (candidate) => {
      const replacement = replacements.get(`${candidate.entityType}:${candidate.sourceSeedId}`);
      return replacement !== undefined && candidate.entityId !== replacement.entityId;
    },
  );
  for (const stale of staleRecords) {
    await settings.deleteSetting(userId, buildSeedRecordKey(stale.entityType, stale.entityId));
  }
  for (const record of records) {
    await saveSeedRecord(settings, userId, record);
  }
  return records;
}

export async function listSeedRecords(settings: AppSettingsRepository, userId: string): Promise<SeedRecord[]> {
  const all = await settings.listSettings(userId);
  return all
    .filter((setting) => setting.key.startsWith(SEED_RECORD_PREFIX))
    .map((setting) => setting.value)
    .filter((value): value is SeedRecord => typeof value === "object" && value !== null)
    .map((value) => value as SeedRecord);
}

export async function findSeedRecordBySource(
  settings: AppSettingsRepository,
  userId: string,
  entityType: SeedEntityType,
  sourceSeedId: string,
): Promise<SeedRecord | null> {
  const records = await listSeedRecords(settings, userId);
  return (
    records.find((record) => record.entityType === entityType && record.sourceSeedId === sourceSeedId) ?? null
  );
}

export async function markSeedRecordDeprecated(
  settings: AppSettingsRepository,
  userId: string,
  record: SeedRecord,
  deprecatedAt: string,
): Promise<SeedRecord> {
  const updated: SeedRecord = {
    ...record,
    ownership: "deprecated_seed",
    deprecatedAt,
    lastBootstrappedAt: deprecatedAt,
  };
  await saveSeedRecord(settings, userId, updated);
  return updated;
}

export async function markSeedRecordUserModified(
  settings: AppSettingsRepository,
  userId: string,
  entityType: SeedEntityType,
  entityId: string,
  modifiedAt = new Date().toISOString(),
): Promise<SeedRecord | null> {
  const record = await getSeedRecord(settings, userId, entityType, entityId);
  if (!record) {
    return null;
  }
  const updated: SeedRecord = {
    ...record,
    ownership: "system_seed_user_modified",
    userModifiedAt: modifiedAt,
    lastBootstrappedAt: modifiedAt,
  };
  await saveSeedRecord(settings, userId, updated);
  return updated;
}

export function buildSeedRecord(
  entityType: SeedEntityType,
  entityId: string,
  sourceSeedId: string,
  seedVersion: number,
  lastAppliedSyncVersion: number,
  ownership: SeedOwnership,
  now: string,
): SeedRecord {
  return {
    entityType,
    entityId,
    sourceSeedId,
    seedVersion,
    ownership,
    lastAppliedSyncVersion,
    lastBootstrappedAt: now,
  };
}
