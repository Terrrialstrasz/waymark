import type { AppSettingsRepository } from "../../domain/waymark";

export const RUNTIME_AUTO_GENERATE_PLANNED_MARKS_KEY = "runtime.autoGeneratePlannedMarks";

export async function shouldAutoGenerateRuntimePlannedMarks(
  settings: AppSettingsRepository,
  userId: string,
): Promise<boolean> {
  const stored = await settings.getSetting(userId, RUNTIME_AUTO_GENERATE_PLANNED_MARKS_KEY);
  return stored?.value !== false;
}
