import { SemanticState } from "../theme/tokens";

export type Locale = "en" | "vi";

export type FeatureState = "enabled" | "hidden" | "disabled_dev";

export type BottomTabId = "today" | "journal" | "capture" | "paths" | "me";

export type PathId =
  | "career"
  | "snag"
  | "health"
  | "family"
  | "character"
  | "golf"
  | "culture";

export type DomainCardState = SemanticState;

export type PathPulse = Extract<
  SemanticState,
  "alive" | "protected" | "weak" | "neglected" | "growing"
>;

export type PlannedMarkState = Extract<
  SemanticState,
  "planned" | "due_now" | "done" | "missed" | "postponed" | "substituted" | "blocked" | "hidden"
>;

export type ExpeditionState = Extract<
  SemanticState,
  "planned" | "active" | "upcoming" | "done" | "paused" | "archived"
>;

export type JournalItemKind = "mark" | "memory" | "closure";
