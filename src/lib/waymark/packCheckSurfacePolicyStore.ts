import type { AppSettingsRepository } from "../../domain/waymark";

export type PackCheckSurfacePolicy =
  | "today_when_due"
  | "prepare_tomorrow"
  | "embedded_in_mark"
  | "all_pack_checks_only"
  | "manual_only"
  | "hidden_until_linked";

const PREFIX = "pack_check_surface_policy:";

function key(templateId: string) {
  return `${PREFIX}${templateId}`;
}

export async function getPackCheckSurfacePolicy(
  settings: AppSettingsRepository,
  userId: string,
  templateId?: string,
): Promise<PackCheckSurfacePolicy | null> {
  if (!templateId) {
    return null;
  }
  const setting = await settings.getSetting(userId, key(templateId));
  if (!setting || typeof setting.value !== "string") {
    return null;
  }
  return setting.value as PackCheckSurfacePolicy;
}

export async function setPackCheckSurfacePolicy(
  settings: AppSettingsRepository,
  userId: string,
  templateId: string,
  policy: PackCheckSurfacePolicy,
): Promise<PackCheckSurfacePolicy> {
  await settings.setSetting(userId, key(templateId), policy);
  return policy;
}
