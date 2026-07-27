export const waymarkUtilitySemanticNames = [
  "back",
  "close",
  "search",
  "more",
  "chevron",
  "chevronLeft",
  "chevronRight",
  "chevronUp",
  "chevronDown",
  "calendar",
  "clock",
  "camera",
  "image",
  "video",
  "microphone",
  "bell",
  "settings",
  "edit",
  "delete",
  "add",
  "remove",
  "share",
  "download",
  "upload",
  "refresh",
  "filter",
  "sort",
  "language",
  "lock",
  "unlock",
  "info",
  "warning",
  "help",
] as const;

export const waymarkEntitySemanticNames = [
  "mark",
  "proof",
  "memory",
  "journalEntry",
  "backlog",
  "path",
  "expedition",
  "milestone",
  "plannedMark",
  "quickMark",
  "packCheck",
  "signal",
  "privateDocument",
  "weeklyCodingReport",
  "mediaAttachment",
  "photoAttachment",
  "videoAttachment",
  "audioAttachment",
  "note",
  "reflection",
  "familyActivity",
  "document",
  "checklist",
  "task",
  "event",
] as const;

export const waymarkStatusSemanticNames = [
  "planned",
  "done",
  "active",
  "inProgress",
  "upcoming",
  "pending",
  "skipped",
  "rescheduled",
  "postponed",
  "substituted",
  "missed",
  "weak",
  "protected",
  "repaired",
  "blocked",
  "warning",
  "failed",
  "completed",
  "archived",
  "unresolved",
  "resolved",
  "synced",
  "offline",
  "error",
] as const;

export const waymarkHealthSemanticNames = [
  "strength",
  "walk",
  "stretch",
  "cooldown",
  "rest",
  "timer",
  "workTimer",
  "restTimer",
  "stretchTimer",
  "set",
  "setDone",
  "reps",
  "load",
  "distance",
  "steps",
  "duration",
  "exercise",
  "warmup",
  "recovery",
  "complete",
  "next",
  "pause",
  "play",
  "stop",
  "sessionTimer",
] as const;

export type WaymarkUtilitySemanticName = (typeof waymarkUtilitySemanticNames)[number];
export type WaymarkEntitySemanticName = (typeof waymarkEntitySemanticNames)[number];
export type WaymarkStatusSemanticName = (typeof waymarkStatusSemanticNames)[number];
export type WaymarkHealthSemanticName = (typeof waymarkHealthSemanticNames)[number];

export type CodeOwnedWaymarkSemanticIconName =
  | `utility.${WaymarkUtilitySemanticName}`
  | `entity.${WaymarkEntitySemanticName}`
  | `status.${WaymarkStatusSemanticName}`
  | `health.${WaymarkHealthSemanticName}`;

const codeOwnedWaymarkSemanticIconNameSet = new Set<string>([
  ...waymarkUtilitySemanticNames.map((name) => `utility.${name}`),
  ...waymarkEntitySemanticNames.map((name) => `entity.${name}`),
  ...waymarkStatusSemanticNames.map((name) => `status.${name}`),
  ...waymarkHealthSemanticNames.map((name) => `health.${name}`),
]);

export function isCodeOwnedWaymarkSemanticIconName(value: string): value is CodeOwnedWaymarkSemanticIconName {
  return codeOwnedWaymarkSemanticIconNameSet.has(value);
}
