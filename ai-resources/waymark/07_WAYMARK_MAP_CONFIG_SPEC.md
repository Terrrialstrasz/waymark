# Waymark Map Config Specification

## Principle

> The Map is coded. It defines paths, labels, copy, templates, rules, UI visibility, and completion behavior.

The app records user data; it does not let the user edit the Map through a back office.

## Folder structure

```text
src/waymark-map/
  index.ts
  map-version.ts
  paths.ts
  quick-marks.ts
  planned-mark-templates.ts
  daily-finish-line.ts
  weekly-plan.ts
  weekly-minimums.ts
  pack-checks.ts
  workout-cycle.ts
  workout-exercises.ts
  progression-rules.ts
  expeditions.ts
  signals.ts
  tools.ts
  review-prompts.ts
  copy.ts
  theme.ts
  icons.ts
  feature-visibility.ts
  screen-localization.ts
```

## Map version

```ts
export const WAYMARK_MAP_VERSION = "2.0.0";
```

Every user-created record stores `mapVersion`.

## LocalizedText

```ts
export type WaymarkLocale = "en" | "vi";

export type LocalizedText = {
  en: string;
  vi: string;
};
```

## PathConfig

```ts
export type LifePathConfig = {
  id: LifePathId;
  name: LocalizedText;
  shortName: LocalizedText;
  metaphor: LocalizedText;
  purpose: LocalizedText;
  dailyQuestion: LocalizedText;
  minimumMark: LocalizedText;
  textPrompt: LocalizedText;
  weakAfterDays: number;
  colorToken: string;
  icon: string;
  defaultQuickMarkTemplateIds: string[];
  weeklyReviewQuestion: LocalizedText;
};
```

## QuickMarkTemplate

Quick marks are templates, not database-level mark types.

```ts
export type QuickMarkInputMode =
  | "tap"
  | "text_optional"
  | "free_text"
  | "photo"
  | "counter"
  | "duration";

export type QuickMarkTemplate = {
  id: string;
  pathId: LifePathId;
  label: LocalizedText;
  autoTitle: LocalizedText;
  inputMode: QuickMarkInputMode;
  level: MarkLevel;
  requiresText: false;
  privacy: PrivacyScope;
  optionalNotePrompt?: LocalizedText;
  createsMemory?: boolean;
};
```

Routine QuickMarks must not require text.

## PlannedMarkTemplate

```ts
export type PlannedMarkTemplate = {
  id: string;
  pathId: LifePathId;
  title: LocalizedText;
  defaultSlotId?: string;
  defaultTimingType: "anchored" | "window" | "floating" | "reactive" | "recovery";
  defaultTimeWindowId?: string;
  defaultDoneCondition?: LocalizedText;
  allowedActions: Array<"done" | "postpone" | "substitute" | "block" | "cancel">;
};
```

## Daily Finish Line config

```ts
export type DailyFinishSlotConfig = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  required: boolean;
  preferredPathId?: LifePathId;
};

export type DailyFinishLineConfig = {
  title: LocalizedText;
  morningPrompt: LocalizedText;
  eveningPrompt: LocalizedText;
  maxPlannedMarks: number;
  requiredSlots: DailyFinishSlotConfig[];
  completionCopy: Record<DayStatus, LocalizedText>;
};
```

## PackCheckConfig

Pack Check completion may create a Mark only if configured.

```ts
export type PackCheckItemConfig = {
  id: string;
  label: LocalizedText;
  type: "item" | "attention" | "clarity" | "safety";
  required?: boolean;
};

export type PackCheckConfig = {
  id: string;
  name: LocalizedText;
  triggerType: "manual" | "time" | "routine" | "event";
  description: LocalizedText;
  prompt: LocalizedText;
  items: PackCheckItemConfig[];
  completionMark?: {
    pathId: LifePathId;
    quickMarkTemplateId?: string;
    defaultTitle: LocalizedText;
    level: MarkLevel;
    privacy: PrivacyScope;
  };
};
```

## Workout config

```ts
export type WorkoutSessionType = "workout_a" | "walk" | "workout_b";

export type WorkoutSessionTemplate = {
  id: WorkoutSessionType;
  label: LocalizedText;
  exerciseIds: string[];
  includesStretch: boolean;
  walkTargetSteps?: number;
};

export type ExerciseTemplate = {
  id: string;
  label: LocalizedText;
  unit: "kg" | "seconds" | "reps";
  targetSets?: number;
  targetReps?: number;
};

export type ProgressionRule = {
  exerciseId: string;
  requiredConsecutiveCompletions: number;
  incrementValue: number;
  unit: "kg" | "seconds" | "reps";
  capValue?: number;
};
```

## ExpeditionKindConfig

```ts
export type ExpeditionKind =
  | "project"
  | "family_trip"
  | "golf_event"
  | "golf_season"
  | "content_calendar"
  | "reading_shelf"
  | "memory_cleanup"
  | "life_capability";

export type ExpeditionVisibilityConfig = {
  showOnToday: boolean;
  showOnPathScreen: boolean;
  showInExpeditionList: boolean;
  showAsCalendar: boolean;
  showAsShelf: boolean;
  showAsRoute: boolean;
};
```

## Feature visibility config

```ts
export type FeatureVisibility =
  | "hidden"
  | "schema_only"
  | "domain_ready"
  | "internal_hidden"
  | "weekly_coding_only"
  | "today_visible"
  | "path_visible"
  | "fully_visible";
```

## Screen localization status

```ts
export type ScreenLocalizationStatus = {
  screenId: string;
  readyLocales: WaymarkLocale[];
};
```

A page is visible in a selected language only if that page is fully localized for that language.

## Rule

The app must import from the Map. Do not duplicate path labels, quick mark labels, pack check labels, copy, or progression rules inside screen code.
