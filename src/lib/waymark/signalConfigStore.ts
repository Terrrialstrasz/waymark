import type { AppSettingsRepository } from "../../domain/waymark";

export type SeededSignalConfig = {
  id: string;
  sourceSeedId: string;
  label: string;
  targetType: "global" | "mark_template" | "pack_check_template";
  targetId?: string;
  scheduledTime?: string;
  leadMinutes?: number;
  repeatAfterMinutes?: number;
  maxRings?: number;
  strict: boolean;
  quietHoursBypass?: boolean;
  isActive: boolean;
};

const PREFIX = "signal_config:";

function key(id: string) {
  return `${PREFIX}${id}`;
}

export async function getSignalConfig(
  settings: AppSettingsRepository,
  userId: string,
  id: string,
): Promise<SeededSignalConfig | null> {
  const setting = await settings.getSetting(userId, key(id));
  if (!setting || typeof setting.value !== "object" || setting.value === null) {
    return null;
  }
  return setting.value as SeededSignalConfig;
}

export async function setSignalConfig(
  settings: AppSettingsRepository,
  userId: string,
  config: SeededSignalConfig,
): Promise<SeededSignalConfig> {
  await settings.setSetting(userId, key(config.id), config);
  return config;
}

export async function listSignalConfigs(
  settings: AppSettingsRepository,
  userId: string,
): Promise<SeededSignalConfig[]> {
  const all = await settings.listSettings(userId);
  return all
    .filter((setting) => setting.key.startsWith(PREFIX))
    .map((setting) => setting.value)
    .filter((value): value is SeededSignalConfig => typeof value === "object" && value !== null)
    .map((value) => value as SeededSignalConfig);
}
