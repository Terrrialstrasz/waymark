import { MarkInstanceStatus } from "./enums";

const FINAL_MARK_INSTANCE_STATUSES: ReadonlySet<string> = new Set([
  MarkInstanceStatus.Completed,
  MarkInstanceStatus.PartiallyCompleted,
  MarkInstanceStatus.Skipped,
  MarkInstanceStatus.Rescheduled,
  MarkInstanceStatus.Substituted,
  MarkInstanceStatus.Expired,
  MarkInstanceStatus.Cancelled,
]);

export function isFinalMarkInstanceStatus(status: string) {
  return FINAL_MARK_INSTANCE_STATUSES.has(status);
}
