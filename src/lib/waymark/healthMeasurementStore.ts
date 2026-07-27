import type { AppSettingsRepository, EntityId, WaymarkRepositories } from "../../domain/waymark";

export type HealthMeasurementType = "weight";

export type HealthMeasurementRecord = {
  id: string;
  type: HealthMeasurementType;
  value: number;
  unit: "kg";
  recordedAt: string;
  sourceMarkId?: string;
};

export type WeightProgressSummary = {
  latest: HealthMeasurementRecord;
  reachedMilestoneIds: EntityId[];
};

const PREFIX = "health_measurement:";

function buildKey(id: string) {
  return `${PREFIX}${id}`;
}

export async function recordHealthMeasurement(
  settings: AppSettingsRepository,
  userId: string,
  input: Omit<HealthMeasurementRecord, "id"> & { id?: string },
): Promise<HealthMeasurementRecord> {
  const record: HealthMeasurementRecord = {
    id: input.id ?? `health_measurement_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    ...input,
  };
  await settings.setSetting(userId, buildKey(record.id), record);
  return record;
}

export async function listHealthMeasurements(
  settings: AppSettingsRepository,
  userId: string,
  type?: HealthMeasurementType,
): Promise<HealthMeasurementRecord[]> {
  const all = await settings.listSettings(userId);
  const items = all
    .filter((setting) => setting.key.startsWith(PREFIX))
    .map((setting) => setting.value)
    .filter((value): value is HealthMeasurementRecord => typeof value === "object" && value !== null)
    .map((value) => value as HealthMeasurementRecord);

  return items
    .filter((item) => (type ? item.type === type : true))
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt));
}

export async function getLatestHealthMeasurement(
  settings: AppSettingsRepository,
  userId: string,
  type: HealthMeasurementType,
): Promise<HealthMeasurementRecord | null> {
  const items = await listHealthMeasurements(settings, userId, type);
  return items.at(-1) ?? null;
}

export async function evaluateWeightMilestoneProgress(
  repositories: WaymarkRepositories,
  userId: string,
  pathId: string,
): Promise<WeightProgressSummary | null> {
  const latest = await getLatestHealthMeasurement(repositories.appSettings, userId, "weight");
  if (!latest) {
    return null;
  }

  const expeditions = (await repositories.expeditions.listExpeditionsByPath(pathId)).items;
  const milestoneIds: EntityId[] = [];
  for (const expedition of expeditions) {
    const milestones = await repositories.expeditions.listMilestonesByExpedition(expedition.id);
    for (const milestone of milestones) {
      const targetKg = parseKilogramValue(milestone.title);
      if (targetKg !== null && latest.value <= targetKg) {
        milestoneIds.push(milestone.id);
      }
    }
  }

  return {
    latest,
    reachedMilestoneIds: milestoneIds,
  };
}

function parseKilogramValue(title: string): number | null {
  const match = title.match(/(\d+(?:\.\d+)?)\s*kg/i);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}
