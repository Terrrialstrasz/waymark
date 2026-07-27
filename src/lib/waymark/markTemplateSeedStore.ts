import type { AppSettingsRepository } from "../../domain/waymark";
import type { SeedMarkGenerationMetadata } from "../../waymark-map";

export type MarkTemplateSeedMetadata = SeedMarkGenerationMetadata & {
  templateId: string;
  sourceSeedId: string;
  expeditionId?: string;
  milestoneId?: string;
};

const PREFIX = "mark_template_seed_meta:";

function key(templateId: string) {
  return `${PREFIX}${templateId}`;
}

export async function getMarkTemplateSeedMetadata(
  settings: AppSettingsRepository,
  userId: string,
  templateId: string,
): Promise<MarkTemplateSeedMetadata | null> {
  const setting = await settings.getSetting(userId, key(templateId));
  if (!setting || typeof setting.value !== "object" || setting.value === null) {
    return null;
  }
  return setting.value as MarkTemplateSeedMetadata;
}

export async function setMarkTemplateSeedMetadata(
  settings: AppSettingsRepository,
  userId: string,
  metadata: MarkTemplateSeedMetadata,
): Promise<MarkTemplateSeedMetadata> {
  await settings.setSetting(userId, key(metadata.templateId), metadata);
  return metadata;
}

export async function listMarkTemplateSeedMetadata(
  settings: AppSettingsRepository,
  userId: string,
): Promise<MarkTemplateSeedMetadata[]> {
  const all = await settings.listSettings(userId);
  return all
    .filter((setting) => setting.key.startsWith(PREFIX))
    .map((setting) => setting.value)
    .filter((value): value is MarkTemplateSeedMetadata => typeof value === "object" && value !== null)
    .map((value) => value as MarkTemplateSeedMetadata);
}
