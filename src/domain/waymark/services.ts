import { EntityId, ISODateTimeString, LocalDateString } from "./core";
import {
  ExerciseDefinition,
  ExerciseProgressState,
  ExerciseSetLog,
  MarkDependency,
  MarkInstance,
  Memory,
  PackCheckInstance,
  PackCheckItemInstance,
  PackCheckTemplate,
  ReflectionEntry,
  RoutineExerciseTemplate,
  SessionExerciseSnapshot,
  Signal,
  TrailDay,
  WorkoutRoutineTemplate,
  WorkoutSessionInstance,
} from "./entities";
import type { CreateReflectionEntryInput, CreateSignalInput } from "./repositories";
import {
  ExerciseTargetType,
  MarkInstanceStatus,
  PackCheckInstanceStatus,
  SessionExerciseStatus,
  SignalStatus,
  SignalTargetType,
  TrailDayStatus,
  WorkoutSessionPhase,
  WorkoutSessionStatus,
} from "./enums";

export interface CompleteMarkInstanceInput {
  markInstanceId: EntityId;
  completedAt?: ISODateTimeString;
  proofNote?: string;
  completionSummary?: string;
  mediaAssetIds?: EntityId[];
  force?: boolean;
}

export interface SkipMarkInstanceInput {
  markInstanceId: EntityId;
  skippedAt?: ISODateTimeString;
  reason?: string;
  note?: string;
}

export interface RescheduleMarkInstanceInput {
  markInstanceId: EntityId;
  targetTrailDayId?: EntityId;
  targetLocalDate?: LocalDateString;
  scheduledStartAt?: ISODateTimeString;
  scheduledEndAt?: ISODateTimeString;
  dueAt?: ISODateTimeString;
  reason?: string;
}

export interface SubstituteMarkInstanceCompletedNowMode {
  mode: "completed_now";
  completedAt?: ISODateTimeString;
  proofNote?: string;
  completionSummary?: string;
}

export interface SubstituteMarkInstanceReadyMode {
  mode: "ready";
}

export type SubstituteMarkInstanceMode =
  | SubstituteMarkInstanceCompletedNowMode
  | SubstituteMarkInstanceReadyMode;

export interface SubstituteMarkInstanceInput {
  markInstanceId: EntityId;
  substituteTitle: string;
  substituteDescription?: string;
  substitutePathId?: EntityId;
  substituteTrailDayId?: EntityId;
  substituteLocalDate?: LocalDateString;
  substituteScheduledStartAt?: ISODateTimeString;
  substituteScheduledEndAt?: ISODateTimeString;
  substituteDueAt?: ISODateTimeString;
  substituteMode: SubstituteMarkInstanceMode;
}

export interface MarkReadinessResult {
  mark: MarkInstance;
  status: MarkInstanceStatus.Ready | MarkInstanceStatus.Blocked;
  unmetDependencies: MarkDependency[];
}

export interface RescheduleMarkInstanceResult {
  original: MarkInstance;
  replacement: MarkInstance;
}

export interface SubstituteMarkInstanceResult {
  original: MarkInstance;
  substitute: MarkInstance;
}

export interface MarkEngine {
  canTransitionMarkStatus(from: MarkInstanceStatus, to: MarkInstanceStatus): boolean;
  completeMarkInstance(input: CompleteMarkInstanceInput): Promise<MarkInstance>;
  skipMarkInstance(input: SkipMarkInstanceInput): Promise<MarkInstance>;
  rescheduleMarkInstance(input: RescheduleMarkInstanceInput): Promise<RescheduleMarkInstanceResult>;
  substituteMarkInstance(input: SubstituteMarkInstanceInput): Promise<SubstituteMarkInstanceResult>;
  evaluateMarkReadiness(markInstanceId: EntityId): Promise<MarkReadinessResult>;
  refreshMarkReadiness(markInstanceId: EntityId): Promise<MarkInstance>;
  listVisibleMarksForDay(userId: EntityId, localDate: LocalDateString): Promise<MarkInstance[]>;
  generateMarkInstancesForDate(userId: EntityId, localDate: LocalDateString): Promise<MarkInstance[]>;
}

export interface SetPackCheckItemCheckedResult {
  packCheck: PackCheckInstance;
  items: PackCheckItemInstance[];
}

export interface CompletePackCheckInstanceInput {
  packCheckInstanceId: EntityId;
  completedAt?: ISODateTimeString;
  checkedItemIds?: EntityId[];
}

export interface SkipPackCheckInstanceInput {
  packCheckInstanceId: EntityId;
  skippedAt?: ISODateTimeString;
}

export interface ExpirePackCheckInstanceInput {
  packCheckInstanceId: EntityId;
  expiredAt?: ISODateTimeString;
}

export interface PackCheckVisibilityResult {
  today: PackCheckInstance[];
  prepareTomorrow: PackCheckInstance[];
}

export interface PackCheckEngine {
  canTransitionPackCheckStatus(from: PackCheckInstanceStatus, to: PackCheckInstanceStatus): boolean;
  refreshPackCheckAvailability(packCheckInstanceId: EntityId, now: ISODateTimeString): Promise<PackCheckInstance>;
  generatePackCheckInstancesForDate(userId: EntityId, localDate: LocalDateString): Promise<PackCheckInstance[]>;
  generatePackChecksForMarkInstance(markInstanceId: EntityId): Promise<PackCheckInstance[]>;
  listAllPackChecksForDay(
    userId: EntityId,
    localDate: LocalDateString,
    now: ISODateTimeString,
  ): Promise<PackCheckInstance[]>;
  listVisiblePackChecksForDay(
    userId: EntityId,
    localDate: LocalDateString,
    now: ISODateTimeString,
  ): Promise<PackCheckVisibilityResult>;
  setPackCheckItemChecked(
    packCheckInstanceId: EntityId,
    itemInstanceId: EntityId,
    checked: boolean,
    checkedAt?: ISODateTimeString,
  ): Promise<SetPackCheckItemCheckedResult>;
  completePackCheckInstance(input: CompletePackCheckInstanceInput): Promise<PackCheckInstance>;
  skipPackCheckInstance(input: SkipPackCheckInstanceInput): Promise<PackCheckInstance>;
  expirePackCheckInstance(input: ExpirePackCheckInstanceInput): Promise<PackCheckInstance>;
  cancelPackChecksForMarkInstance(markInstanceId: EntityId): Promise<PackCheckInstance[]>;
}

export interface DependencyEvaluationResult {
  mark: MarkInstance;
  dependencies: MarkDependency[];
  blockingReasons: string[];
  isReady: boolean;
}

export interface SatisfyDependenciesByRequiredEntityInput {
  requiredEntityType: "mark_instance" | "pack_check_instance";
  requiredEntityId: EntityId;
  satisfiedAt?: ISODateTimeString;
  dependencyTypes?: MarkDependency["dependencyType"][];
}

export interface FailDependenciesByRequiredEntityInput {
  requiredEntityType: "mark_instance" | "pack_check_instance";
  requiredEntityId: EntityId;
  dependencyTypes?: MarkDependency["dependencyType"][];
}

export interface CancelDependenciesByRequiredEntityInput {
  requiredEntityType: "mark_instance" | "pack_check_instance";
  requiredEntityId: EntityId;
  dependencyTypes?: MarkDependency["dependencyType"][];
}

export interface WaiveDependencyInput {
  dependencyId: EntityId;
  waivedAt: ISODateTimeString;
}

export interface DependencyEngine {
  evaluateMarkReadiness(markInstanceId: EntityId, asOf?: ISODateTimeString): Promise<DependencyEvaluationResult>;
  refreshDependenciesForMark(markInstanceId: EntityId): Promise<DependencyEvaluationResult>;
  satisfyDependenciesByRequiredEntity(input: SatisfyDependenciesByRequiredEntityInput): Promise<MarkDependency[]>;
  failDependenciesByRequiredEntity(input: FailDependenciesByRequiredEntityInput): Promise<MarkDependency[]>;
  cancelDependenciesByRequiredEntity(input: CancelDependenciesByRequiredEntityInput): Promise<MarkDependency[]>;
  waiveDependency(input: WaiveDependencyInput): Promise<MarkDependency>;
}

export interface RingDueSignalsInput {
  now: ISODateTimeString;
}

export interface SnoozeSignalInput {
  signalId: EntityId;
  snoozedUntil: ISODateTimeString;
  now?: ISODateTimeString;
}

export interface DismissSignalInput {
  signalId: EntityId;
  dismissedAt?: ISODateTimeString;
  reason?: string;
}

export interface MissSignalInput {
  signalId: EntityId;
  missedAt?: ISODateTimeString;
  reason?: string;
}

export interface ResolveSignalInput {
  signalId: EntityId;
  resolvedAt?: ISODateTimeString;
  reason?: string;
}

export interface ResolveSignalsForTargetInput {
  targetType: SignalTargetType;
  targetId: EntityId;
  resolvedAt?: ISODateTimeString;
  reason?: string;
}

export interface ExpireSignalInput {
  signalId: EntityId;
  expiredAt?: ISODateTimeString;
}

export interface CancelSignalInput {
  signalId: EntityId;
  cancelledAt?: ISODateTimeString;
  reason?: string;
}

export interface CancelSignalsForTargetInput {
  targetType: SignalTargetType;
  targetId: EntityId;
  cancelledAt?: ISODateTimeString;
  reason?: string;
}

export interface SignalModeContext {
  signal: Signal;
  targetType: SignalTargetType;
  targetId: EntityId;
  mode: "signal";
  openedAt: ISODateTimeString;
}

export interface SignalAlarmAdapter {
  schedule(signal: Signal): Promise<void>;
  cancel(signalId: EntityId): Promise<void>;
  reschedule(signal: Signal): Promise<void>;
  reconcile?(signals: Signal[]): Promise<void>;
}

export interface SignalEngine {
  canTransitionSignalStatus(from: SignalStatus, to: SignalStatus): boolean;
  createSignal(input: CreateSignalInput): Promise<Signal>;
  generateSeededSignalsForDate(userId: EntityId, localDate: LocalDateString): Promise<Signal[]>;
  ringDueSignals(input: RingDueSignalsInput): Promise<Signal[]>;
  snoozeSignal(input: SnoozeSignalInput): Promise<Signal>;
  dismissSignal(input: DismissSignalInput): Promise<Signal>;
  missSignal(input: MissSignalInput): Promise<Signal>;
  resolveSignal(input: ResolveSignalInput): Promise<Signal>;
  resolveSignalsForTarget(input: ResolveSignalsForTargetInput): Promise<Signal[]>;
  expireSignal(input: ExpireSignalInput): Promise<Signal>;
  cancelSignal(input: CancelSignalInput): Promise<Signal>;
  cancelSignalsForTarget(input: CancelSignalsForTargetInput): Promise<Signal[]>;
  getSignalModeContext(signalId: EntityId): Promise<SignalModeContext>;
  reconcileSignalDeliveries(userId: EntityId): Promise<void>;
}

export interface TrailDayCloseInput {
  trailDayId: EntityId;
  closedAt: ISODateTimeString;
  closeSummary?: string;
  tomorrowFirstStep?: string;
  characterResult?: string;
  reflections?: ReflectionEntry[];
}

export interface TrailDayEngine {
  openDay(userId: EntityId, date: LocalDateString): Promise<TrailDay>;
  evaluateCloseReadiness(trailDayId: EntityId, asOf?: ISODateTimeString): Promise<TrailDay>;
  closeTrailDay(input: TrailDayCloseInput): Promise<TrailDay>;
  reopenTrailDay(trailDayId: EntityId, reopenedAt: ISODateTimeString): Promise<TrailDay>;
}

export type CloseTrailReadinessReason =
  | "already_closed"
  | "already_ready"
  | "all_planned_marks_resolved"
  | "time_threshold_with_marks"
  | "time_threshold_memories_or_quick_marks"
  | "no_activity"
  | "unresolved_marks"
  | "reopened_not_ready";

export interface CloseTrailReadiness {
  status: TrailDayStatus;
  canClose: boolean;
  reasonCode: CloseTrailReadinessReason;
  reasonMessage?: string;
}

export interface CloseTrailSummary {
  trailDayId: EntityId;
  localDate: LocalDateString;
  plannedCount: number;
  completedCount: number;
  skippedCount: number;
  rescheduledCount: number;
  substitutedCount: number;
  expiredCount: number;
  cancelledCount: number;
  unresolvedCount: number;
  memoryCount: number;
  quickMarkCount: number;
  signalMissedCount: number;
  packCheckCompletedCount: number;
  completionRatio: {
    completed: number;
    planned: number;
  };
}

export interface CloseTrailMarkReview {
  unresolved: MarkInstance[];
  resolved: MarkInstance[];
}

export interface ReflectionPrompt {
  cluster: string;
  prompt: string;
}

export interface CloseTrailFirstStepPreview {
  plannedMarkId?: EntityId;
  title: string;
  pathLabel?: string;
  scheduledTime?: string;
  blockLabel?: string;
  statusLabel?: string;
  snapshotText: string;
}

export interface CloseTrailReview {
  trailDay: TrailDay;
  readiness: CloseTrailReadiness;
  summary: CloseTrailSummary;
  marksToReview: CloseTrailMarkReview;
  memories: Memory[];
  disciplineOptions: Array<{
    key: string;
    label: string;
    pathId: EntityId;
    expeditionId?: EntityId;
    milestoneId?: EntityId;
  }>;
  characterProjection: {
    judgment: "steady" | "protective" | "repairing" | "quiet";
    displayLabel?: string;
    keptCount: number;
    protectedCount: number;
    repairCount: number;
    completedMarkCount: number;
    disciplineProofCount: number;
    honestResolutionCount: number;
  };
  suggestedTomorrowFirstStep?: CloseTrailFirstStepPreview;
}

export interface CloseTrailDayInput {
  trailDayId: EntityId;
  closedAt: ISODateTimeString;
  reflectionEntries?: CreateReflectionEntryInput[];
  disciplineSelections?: Array<{
    key: string;
    label: string;
    pathId: EntityId;
    expeditionId?: EntityId;
    milestoneId?: EntityId;
  }>;
  tomorrowFirstStep?: string;
  closeSummary?: string;
  characterResult?: string;
  allowUnresolvedMarks?: boolean;
  manualCloseReason?: string;
  resolveSignals?: boolean;
}

export interface CloseTrailDayResult {
  trailDay: TrailDay;
  summary: CloseTrailSummary;
  reflectionEntries: ReflectionEntry[];
  marksToReview: CloseTrailMarkReview;
  memories: Memory[];
  judgment: CloseTrailJudgment;
}

export interface ReopenTrailDayInput {
  trailDayId: EntityId;
  reopenedAt: ISODateTimeString;
}

export interface CloseTrailDayJudgment {
  passed: boolean;
  label: string;
  icon: "judgment.trailResult" | "judgment.repairPath";
  memoryCount: number;
  disciplineProofCount: number;
}

export interface CloseTrailCharacterJudgment {
  passed: boolean;
  label: string;
  icon?: "judgment.protectedCharacter" | "judgment.repairPath";
  completedPlannedMarks: number;
  totalPlannedMarks: number;
  completedDisciplineStandards: number;
  totalDisciplineStandards: number;
  completedCharacterItems: number;
  totalCharacterItems: number;
}

export interface CloseTrailPlannedMarkOutcomeCounts {
  completed: number;
  substituted: number;
  skipped: number;
  moved: number;
  unresolved: number;
}

export interface CloseTrailSubstitutedOutcome {
  originalMarkId: EntityId;
  originalTitle: string;
  substituteMarkId?: EntityId;
  substituteTitle: string;
  resultLabel?: string;
}

export interface CloseTrailSkippedOutcome {
  markId: EntityId;
  title: string;
  reason?: string;
}

export interface CloseTrailMovedOutcome {
  markId: EntityId;
  title: string;
  destinationLabel: string;
  destinationDate?: string;
  destinationTime?: string;
  destinationBlock?: string;
  destinationPath?: string;
  reason?: string;
}

export interface CloseTrailUnresolvedOutcome {
  markId: EntityId;
  title: string;
  statusLabel: string;
}

export interface CloseTrailPlannedMarkOutcomeSummary {
  sentence: string;
  counts: CloseTrailPlannedMarkOutcomeCounts;
  substituted: CloseTrailSubstitutedOutcome[];
  skipped: CloseTrailSkippedOutcome[];
  moved: CloseTrailMovedOutcome[];
  unresolved: CloseTrailUnresolvedOutcome[];
}

export interface CloseTrailJudgment {
  trailDay: TrailDay;
  summary: CloseTrailSummary;
  day: CloseTrailDayJudgment;
  character: CloseTrailCharacterJudgment;
  plannedMarkOutcomes: CloseTrailPlannedMarkOutcomeSummary;
  disciplineProofs: Array<{
    key: string;
    label: string;
    completed: boolean;
  }>;
  tomorrowFirstStep?: CloseTrailFirstStepPreview;
}

export interface CloseTrailEngine {
  evaluateCloseReadiness(trailDayId: EntityId, asOf?: ISODateTimeString): Promise<CloseTrailReadiness>;
  getCloseTrailSummary(trailDayId: EntityId): Promise<CloseTrailSummary>;
  getCloseTrailReview(trailDayId: EntityId, asOf?: ISODateTimeString): Promise<CloseTrailReview>;
  getCloseTrailJudgment(trailDayId: EntityId): Promise<CloseTrailJudgment>;
  closeTrailDay(input: CloseTrailDayInput): Promise<CloseTrailDayResult>;
  reopenTrailDay(input: ReopenTrailDayInput): Promise<TrailDay>;
}

export interface RecurrenceGenerationInput {
  userId: EntityId;
  rangeStartDate: LocalDateString;
  rangeEndDate: LocalDateString;
  timezone: string;
}

export interface RecurrenceGenerationResult {
  marks: MarkInstance[];
  packChecks: PackCheckInstance[];
  dependencies: MarkDependency[];
  signals: Signal[];
}

export interface RecurrenceEngine {
  generateInstances(input: RecurrenceGenerationInput): Promise<RecurrenceGenerationResult>;
  previewGeneration(input: RecurrenceGenerationInput): Promise<RecurrenceGenerationResult>;
  ensureIdempotentGenerationKey(templateId: EntityId, scheduledDate: LocalDateString, occurrenceId: string, cycleIndex?: number): string;
}

export type WorkoutCycleStepKind = "day_a_strength" | "walk_day" | "day_b_strength";

export interface WorkoutCycleStep {
  cycleIndex: number;
  kind: WorkoutCycleStepKind;
  title: string;
  routineTitle: string;
}

export interface StartWorkoutSessionInput {
  markInstanceId: EntityId;
  startedAt?: ISODateTimeString;
}

export interface StartExerciseInput {
  workoutSessionInstanceId: EntityId;
  sessionExerciseSnapshotId?: EntityId;
  startedAt?: ISODateTimeString;
}

export interface StartSetInput {
  workoutSessionInstanceId: EntityId;
  sessionExerciseSnapshotId?: EntityId;
  setNumber?: number;
  startedAt?: ISODateTimeString;
}

export interface CompleteExerciseSetInput {
  workoutSessionInstanceId: EntityId;
  sessionExerciseSnapshotId: EntityId;
  setNumber: number;
  actualLoadKg?: number;
  actualReps?: number;
  actualDurationSec?: number;
  actualDistanceM?: number;
  actualSteps?: number;
  completed: boolean;
  metadata?: Record<string, unknown>;
  startedAt?: ISODateTimeString;
  completedAt?: ISODateTimeString;
  failedReason?: string;
}

export interface CompleteRestInput {
  workoutSessionInstanceId: EntityId;
  completedAt?: ISODateTimeString;
}

export interface SkipRestInput {
  workoutSessionInstanceId: EntityId;
  skippedAt?: ISODateTimeString;
}

export interface EnterCooldownInput {
  workoutSessionInstanceId: EntityId;
  enteredAt?: ISODateTimeString;
}

export interface CompleteCooldownInput {
  workoutSessionInstanceId: EntityId;
  completedAt?: ISODateTimeString;
  proofNote?: string;
  completionSummary?: string;
  mediaAssetIds?: EntityId[];
}

export interface CompleteWorkoutSessionInput {
  workoutSessionInstanceId: EntityId;
  completedAt?: ISODateTimeString;
  proofNote?: string;
  completionSummary?: string;
  mediaAssetIds?: EntityId[];
}

export interface CompleteWorkoutSessionResult {
  session: WorkoutSessionInstance;
  completedMark: MarkInstance;
  progressionUpdates: ExerciseProgressState[];
}

export interface AbandonWorkoutSessionInput {
  workoutSessionInstanceId: EntityId;
  abandonedAt?: ISODateTimeString;
  note?: string;
}

export interface ResetWorkoutSessionInput {
  workoutSessionInstanceId: EntityId;
  resetAt?: ISODateTimeString;
}

export interface OverrideSessionExerciseTargetInput {
  workoutSessionInstanceId: EntityId;
  sessionExerciseSnapshotId: EntityId;
  targetLoadKg?: number | null;
  targetReps?: number | null;
  targetSets?: number | null;
  targetDurationSec?: number | null;
  targetDistanceM?: number | null;
  targetSteps?: number | null;
  acceptForProgression?: boolean;
}

export interface CreateSessionSnapshotsInput {
  workoutSessionInstanceId: EntityId;
}

export interface TargetValueSnapshot {
  targetType: ExerciseTargetType;
  targetLoadKg?: number;
  targetReps?: number;
  targetSets?: number;
  targetDurationSec?: number;
  targetDistanceM?: number;
  targetSteps?: number;
}

export interface EvaluateExerciseResultInput {
  snapshot: SessionExerciseSnapshot;
  setLogs: ExerciseSetLog[];
  currentState: ExerciseProgressState | null;
  exerciseDefinition: ExerciseDefinition;
  routineExerciseTemplate?: RoutineExerciseTemplate | null;
  acceptForProgression?: boolean;
}

export interface ExerciseProgressionEvaluation {
  snapshotId: EntityId;
  exerciseDefinitionId: EntityId;
  success: boolean;
  acceptedForProgression: boolean;
  advanced: boolean;
  nextState: ExerciseProgressState;
}

export interface EvaluateWorkoutProgressionInput {
  workoutSessionInstanceId: EntityId;
}

export interface ApplyProgressionUpdatesInput {
  updates: ExerciseProgressionEvaluation[];
}

export interface StrengthSessionEngine {
  startWorkoutSession(input: StartWorkoutSessionInput): Promise<WorkoutSessionInstance>;
  startExercise(input: StartExerciseInput): Promise<WorkoutSessionInstance>;
  startSet(input: StartSetInput): Promise<WorkoutSessionInstance>;
  completeExerciseSet(input: CompleteExerciseSetInput): Promise<ExerciseSetLog>;
  completeRest(input: CompleteRestInput): Promise<WorkoutSessionInstance>;
  skipRest(input: SkipRestInput): Promise<WorkoutSessionInstance>;
  enterCooldown(input: EnterCooldownInput): Promise<WorkoutSessionInstance>;
  completeCooldown(input: CompleteCooldownInput): Promise<WorkoutSessionInstance>;
  completeWorkoutSession(input: CompleteWorkoutSessionInput): Promise<CompleteWorkoutSessionResult>;
  abandonWorkoutSession(input: AbandonWorkoutSessionInput): Promise<WorkoutSessionInstance>;
  resetWorkoutSession(input: ResetWorkoutSessionInput): Promise<WorkoutSessionInstance>;
  overrideSessionExerciseTarget(input: OverrideSessionExerciseTargetInput): Promise<SessionExerciseSnapshot>;
}

export interface StrengthProgressionService {
  createSessionExerciseSnapshots(input: CreateSessionSnapshotsInput): Promise<SessionExerciseSnapshot[]>;
  evaluateExerciseResult(input: EvaluateExerciseResultInput): Promise<ExerciseProgressionEvaluation>;
  evaluateWorkoutProgression(input: EvaluateWorkoutProgressionInput): Promise<ExerciseProgressionEvaluation[]>;
  applyProgressionUpdates(input: ApplyProgressionUpdatesInput): Promise<ExerciseProgressState[]>;
}

export interface MediaService {
  attachMediaToMark(markInstanceId: EntityId, mediaAssetIds: EntityId[]): Promise<MarkInstance>;
  attachMediaToMemory(memoryId: EntityId, mediaAssetIds: EntityId[]): Promise<void>;
  deriveThumbnailPath(storagePath: string): string;
}
