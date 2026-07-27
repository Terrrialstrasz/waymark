import type { AppSettingsRepository } from "../../domain/waymark";
import type { LocalDateString, Path, TrailDay } from "../../domain/waymark";

export type AnchorPathRotationRule = {
  id: string;
  sourceSeedId: string;
  weekdayPathIds: Record<number, string>;
};

const PREFIX = "anchor_path_rotation:";

function key(id: string) {
  return `${PREFIX}${id}`;
}

function localDateToWeekday(localDate: LocalDateString): number {
  return new Date(`${localDate}T00:00:00.000Z`).getUTCDay();
}

export async function setAnchorPathRotationRule(
  settings: AppSettingsRepository,
  userId: string,
  rule: AnchorPathRotationRule,
): Promise<AnchorPathRotationRule> {
  await settings.setSetting(userId, key(rule.id), rule);
  return rule;
}

export async function listAnchorPathRotationRules(
  settings: AppSettingsRepository,
  userId: string,
): Promise<AnchorPathRotationRule[]> {
  const all = await settings.listSettings(userId);
  return all
    .filter((setting) => setting.key.startsWith(PREFIX))
    .map((setting) => setting.value)
    .filter((value): value is AnchorPathRotationRule => typeof value === "object" && value !== null)
    .map((value) => value as AnchorPathRotationRule);
}

export async function resolveAnchorPathIdForDate(
  settings: AppSettingsRepository,
  userId: string,
  trailDay: Pick<TrailDay, "anchorPathId" | "date">,
  activePaths: Path[],
): Promise<string | undefined> {
  if (trailDay.anchorPathId && activePaths.some((path) => path.id === trailDay.anchorPathId)) {
    return trailDay.anchorPathId;
  }
  const [rule] = await listAnchorPathRotationRules(settings, userId);
  if (!rule) {
    return undefined;
  }
  const resolved = rule.weekdayPathIds[localDateToWeekday(trailDay.date)];
  return activePaths.some((path) => path.id === resolved) ? resolved : undefined;
}
