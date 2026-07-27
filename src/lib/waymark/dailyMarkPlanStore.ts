import type { AppSettingsRepository } from "../../domain/waymark";
import type { LocalDateString } from "../../domain/waymark";

export type DailyMarkAssignmentSource = "weekly_coding" | "generated_by_engine";
export type DailyMarkBlockType = "focus_block" | "supervising_block" | "family_block" | "workout_block";
export type DailyMarkTaskKind = "work_focus";

export type DailyMarkAssignment = {
  id: string;
  sourceSeedId: string;
  localDate: LocalDateString;
  markTemplateId: string;
  title?: string;
  description?: string;
  scheduledTime?: string;
  scheduledEndTime?: string;
  dueTime?: string;
  orderIndex?: number;
  blockType?: DailyMarkBlockType;
  taskKind?: DailyMarkTaskKind;
  source?: DailyMarkAssignmentSource;
  pathId?: string;
  expeditionId?: string;
  milestoneId?: string;
  milestoneSourceSeedId?: string;
  appearsInToday?: boolean;
  requiresText?: boolean;
  countsAsPathProof?: boolean;
  executionChecklistItems?: string[];
};

const PREFIX = "daily_mark_assignment:";

function key(id: string) {
  return `${PREFIX}${id}`;
}

export async function getDailyMarkAssignment(
  settings: AppSettingsRepository,
  userId: string,
  id: string,
): Promise<DailyMarkAssignment | null> {
  const setting = await settings.getSetting(userId, key(id));
  if (!setting || typeof setting.value !== "object" || setting.value === null) {
    return null;
  }
  return setting.value as DailyMarkAssignment;
}

export async function setDailyMarkAssignment(
  settings: AppSettingsRepository,
  userId: string,
  assignment: DailyMarkAssignment,
): Promise<DailyMarkAssignment> {
  await settings.setSetting(userId, key(assignment.id), assignment);
  return assignment;
}

export async function listDailyMarkAssignments(
  settings: AppSettingsRepository,
  userId: string,
): Promise<DailyMarkAssignment[]> {
  const all = await settings.listSettings(userId);
  return all
    .filter((setting) => setting.key.startsWith(PREFIX))
    .map((setting) => setting.value)
    .filter((value): value is DailyMarkAssignment => typeof value === "object" && value !== null)
    .map((value) => value as DailyMarkAssignment);
}

export async function getDailyMarkAssignmentForTemplateDate(
  settings: AppSettingsRepository,
  userId: string,
  markTemplateId: string,
  localDate: LocalDateString,
): Promise<DailyMarkAssignment | null> {
  const assignments = await listDailyMarkAssignments(settings, userId);
  return (
    assignments.find((assignment) => assignment.markTemplateId === markTemplateId && assignment.localDate === localDate) ??
    null
  );
}
