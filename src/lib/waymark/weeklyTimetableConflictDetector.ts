import { MarkInstance, MarkInstanceOrigin, WeekPlanItem } from "../../domain/waymark";

export type WeeklyTimetableConflictCode =
  | "exact_slot_title_mismatch"
  | "slot_overlap"
  | "protected_completed_mark"
  | "protected_user_edited_mark"
  | "legacy_generated_mismatch";

export type WeeklyTimetableConflict = {
  code: WeeklyTimetableConflictCode;
  message: string;
  existingMarkId?: string;
  existingTitle?: string;
};

function toMinutes(value?: string): number | null {
  if (!value) {
    return null;
  }
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function getMarkTimeRange(mark: MarkInstance): { start: number | null; end: number | null } {
  const start = mark.scheduledStartAt?.slice(11, 16);
  const end = mark.scheduledEndAt?.slice(11, 16);
  return { start: toMinutes(start), end: toMinutes(end) };
}

function rangesOverlap(
  leftStart: number | null,
  leftEnd: number | null,
  rightStart: number | null,
  rightEnd: number | null,
): boolean {
  if (leftStart == null || leftEnd == null || rightStart == null || rightEnd == null) {
    return false;
  }
  return leftStart < rightEnd && rightStart < leftEnd;
}

export function detectWeeklyTimetableConflicts(
  item: WeekPlanItem,
  marks: MarkInstance[],
  expectedGenerationKey: string,
  skipMarkId?: string,
): WeeklyTimetableConflict[] {
  const start = toMinutes(item.startTime);
  const end = toMinutes(item.endTime);
  const conflicts: WeeklyTimetableConflict[] = [];

  for (const mark of marks) {
    if (mark.id === skipMarkId || mark.generationKey === expectedGenerationKey) {
      continue;
    }
    if (isMovedWeeklyPlannedCarryOver(mark)) {
      continue;
    }
    if (item.pathId && mark.pathId !== item.pathId) {
      continue;
    }

    const markRange = getMarkTimeRange(mark);
    const exactSlot =
      item.startTime &&
      item.endTime &&
      mark.scheduledStartAt?.slice(11, 16) === item.startTime &&
      mark.scheduledEndAt?.slice(11, 16) === item.endTime;

    if (exactSlot && item.title && mark.title !== item.title) {
      conflicts.push({
        code: "exact_slot_title_mismatch",
        message: `Existing mark "${mark.title}" already occupies the same slot.`,
        existingMarkId: mark.id,
        existingTitle: mark.title,
      });
      continue;
    }

    if (rangesOverlap(start, end, markRange.start, markRange.end)) {
      conflicts.push({
        code: "slot_overlap",
        message: `Existing mark "${mark.title}" overlaps the imported slot.`,
        existingMarkId: mark.id,
        existingTitle: mark.title,
      });
    }
  }

  return conflicts;
}

function isMovedWeeklyPlannedCarryOver(mark: MarkInstance): boolean {
  return mark.origin === MarkInstanceOrigin.WeeklyPlanned && !mark.generationKey;
}
