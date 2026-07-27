import type { EntityId } from "../domain/waymark";
import type {
  BacklogItemHorizon,
  BacklogItemStatus,
  BacklogItemType,
  ExpeditionStatus,
  MarkTemplateType,
  MilestoneStatus,
  PackCheckTemplate,
  PathStatus,
  RecurrenceRuleConfig,
  SignalRuleConfig,
  WorkoutExercisePhase,
  WorkoutRoutineType,
  ExerciseTargetType,
} from "../domain/waymark";

export type SeedEntityType =
  | "path"
  | "expedition"
  | "milestone"
  | "mark_template"
  | "daily_mark_assignment"
  | "pack_check_template"
  | "backlog_item"
  | "signal_config"
  | "workout_routine"
  | "close_trail_rule"
  | "anchor_path_rotation";

export type SeedOwnership =
  | "system_seed"
  | "system_seed_user_modified"
  | "user_created"
  | "generated_instance"
  | "deprecated_seed";

export type WaymarkMapConfig = {
  version: number;
  paths?: SeedPathConfig[];
  expeditions?: SeedExpeditionConfig[];
  milestones?: SeedMilestoneConfig[];
  markTemplates?: SeedMarkTemplateConfig[];
  dailyMarkAssignments?: SeedDailyMarkAssignmentConfig[];
  packCheckTemplates?: SeedPackCheckTemplateConfig[];
  backlogItems?: SeedBacklogItemConfig[];
  signalConfigs?: SeedSignalConfig[];
  workoutRoutines?: SeedWorkoutRoutineConfig[];
  closeTrailRules?: SeedCloseTrailRuleConfig[];
  anchorPathRotations?: SeedAnchorPathRotationConfig[];
};

export type SeedPathConfig = {
  sourceSeedId: string;
  slug: string;
  title: string;
  description?: string;
  status?: PathStatus;
  sortOrder: number;
};

export type SeedExpeditionConfig = {
  sourceSeedId: string;
  pathSeedId: string;
  title: string;
  description?: string;
  status: ExpeditionStatus;
  sortOrder: number;
  startDate?: string;
  targetDate?: string;
};

export type SeedMilestoneConfig = {
  sourceSeedId: string;
  expeditionSeedId: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  sortOrder: number;
  orderIndex: number;
  targetDate?: string;
};

export type SeedMarkTemplateConfig = {
  sourceSeedId: string;
  pathSeedId: string;
  title: string;
  description?: string;
  templateType: MarkTemplateType;
  recurrenceRule: RecurrenceRuleConfig;
  defaultDurationMin?: number;
  defaultSignalRule?: SignalRuleConfig;
  isActive?: boolean;
  generation?: SeedMarkGenerationMetadata;
};

export type SeedPackCheckTemplateConfig = {
  sourceSeedId: string;
  pathSeedId?: string;
  title: string;
  description?: string;
  defaultAvailableOffsetMin?: number;
  defaultDueOffsetMin?: number;
  defaultSignalRule?: PackCheckTemplate["defaultSignalRule"];
  isActive?: boolean;
  surfacePolicy?: SeedPackCheckSurfacePolicy;
  items?: SeedPackCheckItemTemplateConfig[];
  markRules?: SeedPackCheckRuleConfig[];
};

export type SeedBacklogItemConfig = {
  sourceSeedId: string;
  pathSeedId?: string;
  title: string;
  description?: string;
  itemType: BacklogItemType;
  horizon: BacklogItemHorizon;
  status: BacklogItemStatus;
};

export type SeedPackCheckItemTemplateConfig = {
  sourceSeedId: string;
  label: string;
  isRequired: boolean;
  orderIndex: number;
};

export type SeedPackCheckRuleConfig = {
  sourceSeedId: string;
  markTemplateSeedId: string;
  availableOffsetMin?: number;
  dueOffsetMin?: number;
};

export type SeedPackCheckSurfacePolicy =
  | "today_when_due"
  | "prepare_tomorrow"
  | "embedded_in_mark"
  | "all_pack_checks_only"
  | "manual_only"
  | "hidden_until_linked";

export type SeedSignalConfig = {
  sourceSeedId: string;
  label: string;
  targetType: "global" | "mark_template" | "pack_check_template";
  targetSeedId?: string;
  scheduledTime?: string;
  leadMinutes?: number;
  repeatAfterMinutes?: number;
  maxRings?: number;
  strict?: boolean;
  quietHoursBypass?: boolean;
  isActive?: boolean;
};

export type SeedMarkGenerationMetadata = {
  startDate?: string;
  endDate?: string;
  calendarDates?: string[];
  scheduledTime?: string;
  scheduledEndTime?: string;
  dueTime?: string;
  visibility?: "default" | "private";
  checklistPackCheckTemplateSeedId?: string;
  phaseResolver?: SeedPhaseResolverConfig;
  measurementType?: "weight";
  canPromoteToMemory?: boolean;
  orderIndex?: number;
  blockType?: "focus_block" | "supervising_block" | "family_block" | "workout_block";
  taskKind?: "work_focus";
  source?: "weekly_coding" | "generated_by_engine";
  appearsInToday?: boolean;
  requiresText?: boolean;
  countsAsPathProof?: boolean;
  expeditionSeedId?: string;
  milestoneSeedId?: string;
  milestoneSourceSeedId?: string;
  executionChecklistItems?: string[];
};

export type SeedDailyMarkAssignmentConfig = {
  sourceSeedId: string;
  localDate: string;
  markTemplateSeedId: string;
  title?: string;
  description?: string;
  scheduledTime?: string;
  scheduledEndTime?: string;
  dueTime?: string;
  orderIndex?: number;
  blockType?: "focus_block" | "supervising_block" | "family_block" | "workout_block";
  taskKind?: "work_focus";
  source?: "weekly_coding" | "generated_by_engine";
  pathSeedId?: string;
  expeditionSeedId?: string;
  milestoneSeedId?: string;
  milestoneSourceSeedId?: string;
  appearsInToday?: boolean;
  requiresText?: boolean;
  countsAsPathProof?: boolean;
  executionChecklistItems?: string[];
};

export type SeedAnchorPathRotationConfig = {
  sourceSeedId: string;
  weekdayPathSeedIds: Record<number, string>;
};

export type SeedPhaseResolverConfig =
  | {
      kind: "golf_practice_phase";
      switchDate: string;
      beforeTitleSuffix: string;
      afterTitleSuffix: string;
      beforeDescription?: string;
      afterDescription?: string;
    };

export type SeedWorkoutRoutineConfig = {
  sourceSeedId: string;
  pathSeedId: string;
  markTemplateSeedId?: string;
  title: string;
  description?: string;
  routineType: WorkoutRoutineType;
  cycleKey?: string;
  estimatedDurationMin?: number;
  isActive?: boolean;
  exercises: SeedRoutineExerciseConfig[];
};

export type SeedRoutineExerciseConfig = {
  sourceSeedId: string;
  exerciseTitle: string;
  canonicalSlug: string;
  phase: WorkoutExercisePhase;
  orderIndex: number;
  targetType: ExerciseTargetType;
  targetLoadKg?: number;
  targetReps?: number;
  targetSets?: number;
  targetDurationSec?: number;
  targetDistanceM?: number;
  targetSteps?: number;
  restDurationSec?: number;
};

export type SeedCloseTrailRuleConfig = {
  sourceSeedId: string;
  disciplines: SeedDisciplineDefinition[];
};

export type SeedDisciplineDefinition = {
  key: string;
  label: string;
  pathSeedId: string;
  expeditionSeedId?: string;
  milestoneSeedId?: string;
};

export type SeedRecord = {
  entityType: SeedEntityType;
  entityId: EntityId;
  sourceSeedId: string;
  seedVersion: number;
  ownership: SeedOwnership;
  lastAppliedSyncVersion: number;
  userModifiedAt?: string;
  deprecatedAt?: string;
  lastBootstrappedAt: string;
};
