import {
  BacklogItemHorizon,
  BacklogItemType,
  BacklogItemStatus,
  DependencyRequiredEntityType,
  DependencyStatus,
  DependencyType,
  ExerciseTargetType,
  ExerciseCategory,
  ExpeditionStatus,
  MarkInstanceOrigin,
  MarkInstanceStatus,
  MarkTemplateType,
  MediaAssetKind,
  MediaAssetType,
  MediaAssetOwnerType,
  MemoryPrivacy,
  MilestoneStatus,
  PackCheckInstanceStatus,
  PathStatus,
  ProgressionPolicyType,
  RecurrenceKind,
  SessionExerciseStatus,
  SignalStatus,
  SignalTargetType,
  TrailDayStatus,
  WorkoutExercisePhase,
  WorkoutRoutineType,
  WeekPlanItemStatus,
  WeekPlanStatus,
  WorkoutSessionPhase,
  WorkoutSessionStatus,
} from "./enums";
import {
  EntityId,
  GeoPoint,
  ISODateTimeString,
  LocalDateString,
  LocalRecordMetadata,
  LocalWindow,
  UserScopedRecord,
} from "./core";

export type AppSettingValue = string | number | boolean | null | string[] | Record<string, unknown>;

export interface UserProfile extends UserScopedRecord {
  displayName?: string;
  locale: string;
  timezone: string;
  weekStartsOn: number;
  closeTrailPromptTime?: string;
}

// App settings stay in the domain package because they are product-visible preferences.
// The later SQLite phase will introduce row types and mappers instead of exposing raw DB JSON here.
export interface AppSetting extends UserScopedRecord {
  key: string;
  value: AppSettingValue;
}

export interface Path extends UserScopedRecord {
  slug: string;
  title: string;
  description?: string;
  status: PathStatus;
  sortOrder: number;
  heroMediaAssetId?: EntityId;
}

export interface Expedition extends UserScopedRecord {
  pathId: EntityId;
  title: string;
  description?: string;
  status: ExpeditionStatus;
  sortOrder: number;
  startDate?: LocalDateString;
  targetDate?: LocalDateString;
  startedAt?: ISODateTimeString;
  targetEndAt?: ISODateTimeString;
  completedAt?: ISODateTimeString;
  heroMediaAssetId?: EntityId;
}

export interface Milestone extends UserScopedRecord {
  expeditionId: EntityId;
  title: string;
  description?: string;
  status: MilestoneStatus;
  startDate?: LocalDateString;
  targetDate?: LocalDateString;
  sortOrder: number;
  completedAt?: ISODateTimeString;
  orderIndex: number;
}

export interface SignalRuleConfig {
  leadMinutes?: number;
  scheduledTime?: string;
  allowSnooze?: boolean;
  quietHoursBypass?: boolean;
}

export interface RecurrenceRuleConfig {
  kind: RecurrenceKind;
  rrule?: string;
  timezone?: string;
  customCycleKey?: string;
  customCycleIndex?: number;
  interval?: number;
  daysOfWeek?: number[];
  contextualTrigger?: "close_trail_ready" | "close_trail_prompt";
}

export interface MarkTemplate extends UserScopedRecord {
  pathId: EntityId;
  title: string;
  description?: string;
  templateType: MarkTemplateType;
  recurrenceRule: RecurrenceRuleConfig;
  defaultDurationMin?: number;
  defaultSignalRule?: SignalRuleConfig;
  isActive: boolean;
}

export interface MarkInstance extends UserScopedRecord, LocalWindow {
  pathId: EntityId;
  trailDayId: EntityId;
  templateId?: EntityId;
  expeditionId?: EntityId;
  milestoneId?: EntityId;
  title: string;
  description?: string;
  origin: MarkInstanceOrigin;
  status: MarkInstanceStatus;
  dueAt?: ISODateTimeString;
  completedAt?: ISODateTimeString;
  skippedAt?: ISODateTimeString;
  expiredAt?: ISODateTimeString;
  proofNote?: string;
  completionSummary?: string;
  proofMediaAssetIds: EntityId[];
  generationKey?: string;
  substitutedByMarkId?: EntityId;
  rescheduledToMarkId?: EntityId;
  sourceBacklogItemId?: EntityId;
}

export interface PackCheckTemplate extends UserScopedRecord {
  pathId?: EntityId;
  title: string;
  description?: string;
  defaultAvailableOffsetMin?: number;
  defaultDueOffsetMin?: number;
  defaultSignalRule?: SignalRuleConfig;
  isActive: boolean;
}

export interface PackCheckInstance extends UserScopedRecord {
  templateId?: EntityId;
  trailDayId: EntityId;
  targetMarkInstanceId?: EntityId;
  title: string;
  description?: string;
  status: PackCheckInstanceStatus;
  availableFrom?: ISODateTimeString;
  dueAt?: ISODateTimeString;
  completedAt?: ISODateTimeString;
  skippedAt?: ISODateTimeString;
  cancelledAt?: ISODateTimeString;
  generationKey?: string;
}

export interface Signal extends UserScopedRecord {
  targetType: SignalTargetType;
  targetId: EntityId;
  scheduledAt: ISODateTimeString;
  status: SignalStatus;
  ringingStartedAt?: ISODateTimeString;
  snoozedUntil?: ISODateTimeString;
  resolvedAt?: ISODateTimeString;
  dismissedAt?: ISODateTimeString;
  expiredAt?: ISODateTimeString;
  cancelledAt?: ISODateTimeString;
}

export interface BacklogItem extends UserScopedRecord {
  pathId?: EntityId;
  title: string;
  description?: string;
  itemType: BacklogItemType;
  horizon: BacklogItemHorizon;
  status: BacklogItemStatus;
  horizonLabel?: string;
  convertedToMarkInstanceId?: EntityId;
  convertedToExpeditionId?: EntityId;
}

export interface WeekPlan extends UserScopedRecord {
  weekStartDate: LocalDateString;
  weekEndDate: LocalDateString;
  status: WeekPlanStatus;
  note?: string;
}

export type WeekPlanItemOrigin = "weekly_coding" | "weekly_timetable";

export type WeekPlanItemBlockKey =
  | "workout"
  | "morning_activity"
  | "supervising_am"
  | "afternoon_activity"
  | "supervising_pm"
  | "final_focus"
  | "evening_activity"
  | "morning_family"
  | "afternoon_family"
  | "family_final"
  | (string & {});

export interface TrailDay extends UserScopedRecord {
  date: LocalDateString;
  status: TrailDayStatus;
  anchorPathId?: EntityId;
  closedAt?: ISODateTimeString;
  reopenedAt?: ISODateTimeString;
  closeSummary?: string;
  tomorrowFirstStep?: string;
  characterResult?: string;
  plannedMarkCount: number;
  completedMarkCount: number;
  skippedMarkCount: number;
  memoryCount: number;
}

export interface Memory extends UserScopedRecord {
  trailDayId: EntityId;
  pathId?: EntityId;
  title: string;
  note?: string;
  capturedAt: ISODateTimeString;
  privacy: MemoryPrivacy;
  location?: GeoPoint;
  mediaAssetIds: EntityId[];
}

export interface MediaAsset extends UserScopedRecord {
  ownerType: MediaAssetOwnerType;
  ownerId: EntityId;
  kind: MediaAssetKind;
  assetType: MediaAssetType;
  fileName: string;
  mimeType?: string;
  storagePath: string;
  thumbnailPath?: string;
  backupPath?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  byteSize?: number;
  sortIndex: number;
  capturedAt?: ISODateTimeString;
  localDate?: LocalDateString;
  dailyBatchId?: EntityId;
  uploadStatus?: MediaEodUploadStatus;
  localStatus?: MediaLocalStatus;
  sourceCleanupStatus?: MediaSourceCleanupStatus;
  originalPickerUri?: string;
  libraryAssetId?: string;
  driveFileId?: string;
  driveFolderId?: string;
  driveRootFolderId?: string;
  driveWebViewLink?: string;
  driveWebContentLink?: string;
  driveMimeType?: string;
  driveSizeBytes?: number;
  driveMd5Checksum?: string;
  contentHash?: string;
  contentHashAlgorithm?: string;
  thumbnailDriveFileId?: string;
  thumbnailContentHash?: string;
  thumbnailContentHashAlgorithm?: string;
  uploadedAt?: ISODateTimeString;
  sourceDeletedAt?: ISODateTimeString;
  localDeletedAt?: ISODateTimeString;
  lastSyncError?: string;
}

export type DailyMediaUploadBatchStatus =
  | "open"
  | "sealed"
  | "uploading"
  | "uploaded"
  | "partial_failed"
  | "missed_pending"
  | "retry_pending"
  | "verified"
  | "cleanup_done";

export type MediaEodUploadStatus =
  | "local_only"
  | "pending_eod_upload"
  | "in_eod_batch"
  | "uploading"
  | "uploaded"
  | "verified"
  | "upload_failed"
  | "retry_pending"
  | "remote_missing";

export type MediaLocalStatus = "local_available" | "local_missing" | "cache_available" | "cache_evicted";

export type MediaSourceCleanupStatus =
  | "not_requested"
  | "pending"
  | "deleted"
  | "permission_required"
  | "failed"
  | "not_applicable";

export interface DailyMediaUploadBatch extends UserScopedRecord {
  localDate: LocalDateString;
  timezone: string;
  status: DailyMediaUploadBatchStatus;
  mediaCount: number;
  uploadedCount: number;
  failedCount: number;
  runSequence: number;
  lockOwner?: string;
  lockAcquiredAt?: ISODateTimeString;
  lockExpiresAt?: ISODateTimeString;
  sealedAt?: ISODateTimeString;
  startedAt?: ISODateTimeString;
  completedAt?: ISODateTimeString;
  lastError?: string;
}

export interface WorkoutRoutineTemplate extends UserScopedRecord {
  pathId: EntityId;
  markTemplateId?: EntityId;
  title: string;
  routineType: WorkoutRoutineType;
  description?: string;
  cycleKey?: string;
  estimatedDurationMin?: number;
  isActive: boolean;
}

export interface WorkoutSessionInstance extends UserScopedRecord {
  markInstanceId: EntityId;
  routineTemplateId: EntityId;
  status: WorkoutSessionStatus;
  phase: WorkoutSessionPhase;
  startedAt?: ISODateTimeString;
  completedAt?: ISODateTimeString;
  currentExerciseSnapshotId?: EntityId | null;
  currentSetNumber?: number | null;
  notes?: string;
}

export interface ExerciseDefinition extends UserScopedRecord {
  pathId?: EntityId;
  title: string;
  canonicalSlug: string;
  category: ExerciseCategory;
  targetType: ExerciseTargetType;
  defaultRestSec?: number;
  defaultUnit?: string;
  equipment?: string;
  isSystem: boolean;
  description?: string;
}

export interface ExerciseProgressState extends UserScopedRecord {
  exerciseDefinitionId: EntityId;
  currentTargetLoadKg?: number;
  currentTargetReps?: number;
  currentTargetSets?: number;
  currentTargetDurationSec?: number;
  currentTargetDistanceM?: number;
  currentTargetSteps?: number;
  successCountSinceProgression: number;
  lastSessionResult?: "completed" | "failed" | "skipped" | "held";
  lastProgressedAt?: ISODateTimeString;
  manualOverride: boolean;
  lastSessionAt?: ISODateTimeString;
  lastProgressionOutcome?: "held" | "advanced" | "regressed";
}

export interface PackCheckItemTemplate extends LocalRecordMetadata {
  id: EntityId;
  packCheckTemplateId: EntityId;
  label: string;
  isRequired: boolean;
  orderIndex: number;
}

export interface PackCheckItemInstance extends LocalRecordMetadata {
  id: EntityId;
  packCheckInstanceId: EntityId;
  templateItemId?: EntityId;
  label: string;
  isRequired: boolean;
  isChecked: boolean;
  checkedAt?: ISODateTimeString;
  orderIndex: number;
}

export interface MarkPackCheckRule extends LocalRecordMetadata {
  id: EntityId;
  markTemplateId: EntityId;
  packCheckTemplateId: EntityId;
  availableOffsetMin?: number;
  dueOffsetMin?: number;
}

export interface MarkDependency extends LocalRecordMetadata {
  id: EntityId;
  dependentMarkInstanceId: EntityId;
  dependencyType: DependencyType;
  requiredEntityType: DependencyRequiredEntityType;
  requiredEntityId: EntityId;
  isRequired: boolean;
  status: DependencyStatus;
  satisfiedAt?: ISODateTimeString;
  waivedAt?: ISODateTimeString;
}

export interface WeekPlanItem extends LocalRecordMetadata {
  id: EntityId;
  weekPlanId: EntityId;
  backlogItemId?: EntityId;
  status: WeekPlanItemStatus;
  localDate?: LocalDateString;
  startTime?: string;
  endTime?: string;
  title?: string;
  pathId?: EntityId;
  templateId?: EntityId;
  expeditionId?: EntityId;
  milestoneId?: EntityId;
  expeditionContext?: string;
  milestoneContext?: string;
  description?: string;
  note?: string;
  origin?: WeekPlanItemOrigin;
  blockKey?: WeekPlanItemBlockKey;
  deterministicImportKey?: string;
  createdMarkInstanceId?: EntityId;
  importBatchId?: string;
  sortOrder: number;
  orderIndex: number;
}

export interface ReflectionEntry extends LocalRecordMetadata {
  id: EntityId;
  trailDayId: EntityId;
  cluster: string;
  text: string;
  orderIndex: number;
}

export interface ProgressionPolicy {
  type: ProgressionPolicyType;
  loadIncrementKg?: number;
  repCeiling?: number;
  durationIncrementSec?: number;
  minimumCompletedSets?: number;
  allowHigherManualOverride?: boolean;
}

export interface RoutineExerciseTemplate extends LocalRecordMetadata {
  id: EntityId;
  workoutRoutineTemplateId: EntityId;
  exerciseDefinitionId: EntityId;
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
  progressionPolicy?: ProgressionPolicy;
}

export interface SessionExerciseSnapshot extends LocalRecordMetadata {
  id: EntityId;
  workoutSessionInstanceId: EntityId;
  routineExerciseTemplateId?: EntityId;
  exerciseDefinitionId: EntityId;
  exerciseNameSnapshot: string;
  phase: WorkoutExercisePhase;
  orderIndex: number;
  targetType: ExerciseTargetType;
  targetLoadKg?: number;
  targetReps?: number;
  targetSets?: number;
  targetDurationSec?: number;
  targetDistanceM?: number;
  targetSteps?: number;
  wasOverridden: boolean;
  status: SessionExerciseStatus;
  startedAt?: ISODateTimeString;
  completedAt?: ISODateTimeString;
}

export interface ExerciseSetLog extends LocalRecordMetadata {
  id: EntityId;
  sessionExerciseSnapshotId: EntityId;
  setNumber: number;
  actualLoadKg?: number;
  actualReps?: number;
  actualDurationSec?: number;
  actualDistanceM?: number;
  actualSteps?: number;
  completed: boolean;
  failedReason?: string;
  metadata?: Record<string, unknown>;
  startedAt?: ISODateTimeString;
  completedAt?: ISODateTimeString;
}

export interface EntityRelationship {
  from: string;
  to: string;
  cardinality: string;
  meaning: string;
}

export const WAYMARK_ENTITY_RELATIONSHIPS: EntityRelationship[] = [
  { from: "UserProfile", to: "Path", cardinality: "1 -> many", meaning: "User owns many Paths." },
  { from: "UserProfile", to: "TrailDay", cardinality: "1 -> many", meaning: "User has many daily records." },
  { from: "UserProfile", to: "WeekPlan", cardinality: "1 -> many", meaning: "User has many weekly plans." },
  { from: "Path", to: "Expedition", cardinality: "1 -> many", meaning: "Path contains finite missions." },
  { from: "Expedition", to: "Milestone", cardinality: "1 -> many", meaning: "Expedition contains timed checkpoints." },
  { from: "Path", to: "MarkTemplate", cardinality: "1 -> many", meaning: "Path defines reusable Mark blueprints." },
  { from: "MarkTemplate", to: "MarkInstance", cardinality: "1 -> many", meaning: "Template generates concrete Mark occurrences." },
  { from: "Path", to: "MarkInstance", cardinality: "1 -> many", meaning: "Every MarkInstance belongs to a Path." },
  { from: "TrailDay", to: "MarkInstance", cardinality: "1 -> many", meaning: "Day shows planned, quick, and completed Marks." },
  { from: "Milestone", to: "MarkInstance", cardinality: "1 -> many optional", meaning: "Mark may support an Expedition milestone." },
  { from: "Path", to: "PackCheckTemplate", cardinality: "1 -> many", meaning: "Path defines Pack Check blueprints." },
  { from: "PackCheckTemplate", to: "PackCheckInstance", cardinality: "1 -> many", meaning: "Template generates concrete Pack Checks." },
  { from: "MarkInstance", to: "PackCheckInstance", cardinality: "1 -> many optional", meaning: "Mark may require Pack Checks." },
  { from: "TrailDay", to: "PackCheckInstance", cardinality: "1 -> many", meaning: "Day shows Pack Checks active that day." },
  { from: "MarkInstance", to: "Signal", cardinality: "1 -> many optional", meaning: "Mark can have alarm Signals." },
  { from: "PackCheckInstance", to: "Signal", cardinality: "1 -> many optional", meaning: "Pack Check can have alarm Signals." },
  { from: "Path", to: "BacklogItem", cardinality: "1 -> many", meaning: "Backlog item belongs to Path." },
  { from: "WeekPlan", to: "BacklogItem", cardinality: "many <-> many", meaning: "WeekPlan pulls BacklogItems through WeekPlanItem." },
  { from: "TrailDay", to: "Memory", cardinality: "1 -> many", meaning: "Day records Memories." },
  { from: "Path", to: "Memory", cardinality: "1 -> many optional", meaning: "Memory may be associated with a Path." },
  { from: "MarkInstance", to: "WorkoutSessionInstance", cardinality: "1 -> 0/1", meaning: "Workout A, Workout B, or Workout Walk opens workout session." },
  { from: "WorkoutRoutineTemplate", to: "WorkoutSessionInstance", cardinality: "1 -> many", meaning: "Routine generates sessions." },
];

export interface LayerOwnership {
  layer: "ui" | "screen" | "engine" | "repository" | "db" | "sync";
  owns: string[];
  doesNotOwn: string[];
}

export const WAYMARK_LAYER_BOUNDARIES: LayerOwnership[] = [
  {
    layer: "ui",
    owns: ["rendering", "user input", "visual states", "empty states", "action buttons"],
    doesNotOwn: ["business rules", "lifecycle transitions", "recurrence generation", "progression logic"],
  },
  {
    layer: "screen",
    owns: ["component composition", "navigation", "loading state"],
    doesNotOwn: ["entity mutation rules"],
  },
  {
    layer: "engine",
    owns: ["state transitions", "recurrence generation", "dependency evaluation", "signal rules", "strength progression"],
    doesNotOwn: ["database persistence implementation"],
  },
  {
    layer: "repository",
    owns: ["crud", "query filters", "transactions", "local and remote persistence"],
    doesNotOwn: ["business meaning of transitions"],
  },
  {
    layer: "db",
    owns: ["durable state", "relationships", "constraints", "indexes"],
    doesNotOwn: ["product decisions", "ui behavior"],
  },
  {
    layer: "sync",
    owns: ["backup upload", "media backup", "conflict strategy"],
    doesNotOwn: ["domain state machine rules"],
  },
];
