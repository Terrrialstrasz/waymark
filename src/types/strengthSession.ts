import { Locale } from "./ui";

export type SessionPhase = "strength" | "rest" | "timed" | "cooldown" | "complete";
export type ExerciseMode = "reps_load" | "reps_only" | "timed";
export type ExerciseState = "done" | "active" | "rest" | "upcoming";
export type SetState = "done" | "active" | "next" | "upcoming" | "failed" | "skipped";
export type StretchState = "done" | "active" | "next" | "upcoming";
export type TimerState = "idle" | "running" | "paused" | "warning" | "completed";
export type WeightUnit = "kg" | "lb";
export type WorkoutDayType = "day_a" | "day_b" | "walk" | "bodyweight_rep_progress";
export type ExerciseTargetMetric = "reps" | "duration" | "distance_m" | "steps";

export type LocalizedText = Record<Locale, string>;

export type StrengthSet = {
  id: string;
  setNumber: number;
  repsLabel: string;
  state: SetState;
  actualLoad?: number | null;
  targetLoad?: number | null;
  actualWeight?: number | null;
  canEditWeight?: boolean;
};

export type SessionTimer = {
  totalSeconds: number;
  elapsedSeconds: number;
  state: TimerState;
};

export type StrengthExercise = {
  id: string;
  order: number;
  title: LocalizedText;
  prescriptionLabel: string;
  mode: ExerciseMode;
  targetMetric?: ExerciseTargetMetric;
  targetValue?: number | null;
  supportsLoad?: boolean;
  state: ExerciseState;
  sets?: StrengthSet[];
  timedSetLabel?: string;
  timer?: SessionTimer;
  restTimer?: SessionTimer;
  completedSetNumber?: number;
  nextSetNumber?: number;
  notes?: LocalizedText;
};

export type StretchItem = {
  id: string;
  order: number;
  title: LocalizedText;
  durationLabel: string;
  durationSeconds: number;
  state: StretchState;
};

export type StrengthSessionData = {
  locale: Locale;
  dayType: WorkoutDayType;
  dayLabel: string;
  totalDurationLabel: string;
  exerciseCountLabel: string;
  stretchCountLabel: string;
  sessionTitle: LocalizedText;
  phase: SessionPhase;
  phaseTitle?: LocalizedText;
  phaseBody?: LocalizedText;
  phaseStatusLabel?: string;
  strengthIndex: number;
  strengthTotal: number;
  cooldownIndex: number;
  cooldownTotal: number;
  exercises: StrengthExercise[];
  stretches: StretchItem[];
  activeExerciseId?: string;
  activeStretchId?: string;
  stretchTimer?: SessionTimer;
  nextStretchName?: string;
  unit: WeightUnit;
  strengthComplete: boolean;
  cooldownStarted: boolean;
  sessionComplete: boolean;
};

export type StrengthActionType =
  | "complete_strength_set"
  | "start_next_set"
  | "next_exercise"
  | "complete_timed_set"
  | "start_cooldown"
  | "complete_stretch"
  | "start_next_stretch"
  | "finish_session"
  | "done"
  | "continue_disabled";

export type StrengthPrimaryActionLabelKey =
  | "completeSet"
  | "startSet"
  | "nextExercise"
  | "completeTimedSet"
  | "startCooldown"
  | "completeStretch"
  | "startStretch"
  | "finishSession"
  | "done"
  | "continue";

export type StrengthPrimaryActionIcon =
  | "health.setDone"
  | "health.strength"
  | "health.cooldown"
  | "status.done";

export type StrengthPrimaryActionResolution = {
  labelKey: StrengthPrimaryActionLabelKey;
  labelParams?: Record<string, string | number>;
  icon: StrengthPrimaryActionIcon;
  disabled: boolean;
  actionType: StrengthActionType;
};
