import type { AppSettingsRepository } from "../../domain/waymark";

export type SeededDisciplineDefinition = {
  key: string;
  label: string;
  pathId: string;
  expeditionId?: string;
  milestoneId?: string;
};

export type CloseTrailRuleConfig = {
  id: string;
  sourceSeedId: string;
  disciplines: SeededDisciplineDefinition[];
};

const PREFIX = "close_trail_rule:";

function key(id: string) {
  return `${PREFIX}${id}`;
}

export async function getCloseTrailRuleConfig(
  settings: AppSettingsRepository,
  userId: string,
  id: string,
): Promise<CloseTrailRuleConfig | null> {
  const setting = await settings.getSetting(userId, key(id));
  if (!setting || typeof setting.value !== "object" || setting.value === null) {
    return null;
  }
  return setting.value as CloseTrailRuleConfig;
}

export async function setCloseTrailRuleConfig(
  settings: AppSettingsRepository,
  userId: string,
  config: CloseTrailRuleConfig,
): Promise<CloseTrailRuleConfig> {
  await settings.setSetting(userId, key(config.id), config);
  return config;
}

export async function listCloseTrailRuleConfigs(
  settings: AppSettingsRepository,
  userId: string,
): Promise<CloseTrailRuleConfig[]> {
  const all = await settings.listSettings(userId);
  return all
    .filter((setting) => setting.key.startsWith(PREFIX))
    .map((setting) => setting.value)
    .filter((value): value is CloseTrailRuleConfig => typeof value === "object" && value !== null)
    .map((value) => value as CloseTrailRuleConfig);
}
