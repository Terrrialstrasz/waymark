import { EntityId, ISODateTimeString, LocalDateString, QueryPage, QueryResult, TransactionRunner } from "./core";
import {
  AppSetting,
  AppSettingValue,
  BacklogItem,
  ExerciseDefinition,
  ExerciseProgressState,
  ExerciseSetLog,
  Expedition,
  MarkDependency,
  MarkInstance,
  MarkPackCheckRule,
  MarkTemplate,
  MediaAsset,
  DailyMediaUploadBatch,
  DailyMediaUploadBatchStatus,
  Memory,
  Milestone,
  PackCheckInstance,
  PackCheckItemInstance,
  PackCheckItemTemplate,
  PackCheckTemplate,
  Path,
  ReflectionEntry,
  RoutineExerciseTemplate,
  SessionExerciseSnapshot,
  Signal,
  TrailDay,
  UserProfile,
  WeekPlan,
  WeekPlanItem,
  WorkoutRoutineTemplate,
  WorkoutSessionInstance,
} from "./entities";
import { MarkInstanceOrigin, MarkInstanceStatus, MarkTemplateType, MediaAssetOwnerType, MediaAssetType, SignalStatus, SignalTargetType, TrailDayStatus } from "./enums";

export type MarkTemplateRange = {
  startDate?: LocalDateString;
  endDate?: LocalDateString;
};

export type CreatePathInput = {
  userId: EntityId;
  slug: string;
  title: string;
  description?: string | null;
  status?: Path["status"];
  sortOrder: number;
  heroMediaAssetId?: EntityId | null;
};

export type UpdatePathPatch = {
  slug?: string;
  title?: string;
  description?: string | null;
  status?: Path["status"];
  sortOrder?: number;
  heroMediaAssetId?: EntityId | null;
};

export type UpdateTrailDayPatch = {
  status?: TrailDayStatus;
  closedAt?: ISODateTimeString | null;
  reopenedAt?: ISODateTimeString | null;
  closeSummary?: string | null;
  tomorrowFirstStep?: string | null;
  characterResult?: string | null;
  plannedMarkCount?: number;
  completedMarkCount?: number;
  skippedMarkCount?: number;
  memoryCount?: number;
};

export type UpdateTrailDayClosePatch = Pick<
  UpdateTrailDayPatch,
  "status" | "closedAt" | "reopenedAt" | "closeSummary" | "tomorrowFirstStep" | "characterResult" | "plannedMarkCount" | "completedMarkCount" | "skippedMarkCount" | "memoryCount"
>;

export type CreateMarkTemplateInput = {
  userId: EntityId;
  pathId: EntityId;
  title: string;
  description?: string | null;
  templateType: MarkTemplateType;
  recurrenceRule: MarkTemplate["recurrenceRule"];
  defaultDurationMin?: number | null;
  defaultSignalRule?: MarkTemplate["defaultSignalRule"];
  isActive?: boolean;
};

export type UpdateMarkTemplatePatch = {
  title?: string;
  description?: string | null;
  templateType?: MarkTemplateType;
  recurrenceRule?: MarkTemplate["recurrenceRule"];
  defaultDurationMin?: number | null;
  defaultSignalRule?: MarkTemplate["defaultSignalRule"] | null;
  isActive?: boolean;
};

export type CreateMarkInstanceInput = {
  userId: EntityId;
  pathId: EntityId;
  trailDayId: EntityId;
  templateId?: EntityId | null;
  expeditionId?: EntityId | null;
  milestoneId?: EntityId | null;
  title: string;
  description?: string | null;
  origin: MarkInstanceOrigin;
  status: MarkInstanceStatus;
  scheduledStartAt?: ISODateTimeString | null;
  scheduledEndAt?: ISODateTimeString | null;
  dueAt?: ISODateTimeString | null;
  completedAt?: ISODateTimeString | null;
  skippedAt?: ISODateTimeString | null;
  expiredAt?: ISODateTimeString | null;
  proofNote?: string | null;
  completionSummary?: string | null;
  substitutedByMarkId?: EntityId | null;
  rescheduledToMarkId?: EntityId | null;
  sourceBacklogItemId?: EntityId | null;
  generationKey?: string | null;
  proofMediaAssetIds?: EntityId[];
};

export type UpdateMarkInstancePatch = {
  pathId?: EntityId;
  templateId?: EntityId | null;
  expeditionId?: EntityId | null;
  milestoneId?: EntityId | null;
  title?: string;
  description?: string | null;
  origin?: MarkInstanceOrigin;
  status?: MarkInstanceStatus;
  scheduledStartAt?: ISODateTimeString | null;
  scheduledEndAt?: ISODateTimeString | null;
  dueAt?: ISODateTimeString | null;
  completedAt?: ISODateTimeString | null;
  skippedAt?: ISODateTimeString | null;
  expiredAt?: ISODateTimeString | null;
  proofNote?: string | null;
  completionSummary?: string | null;
  substitutedByMarkId?: EntityId | null;
  rescheduledToMarkId?: EntityId | null;
  sourceBacklogItemId?: EntityId | null;
  generationKey?: string | null;
  proofMediaAssetIds?: EntityId[];
};

export type CreateUserProfileInput = {
  userId: EntityId;
  displayName?: string | null;
  locale: string;
  timezone: string;
  weekStartsOn: number;
  closeTrailPromptTime?: string | null;
};

export type UpdateUserProfilePatch = {
  displayName?: string | null;
  locale?: string;
  timezone?: string;
  weekStartsOn?: number;
  closeTrailPromptTime?: string | null;
};

export type CreateExpeditionInput = {
  userId: EntityId;
  pathId: EntityId;
  title: string;
  description?: string | null;
  status: Expedition["status"];
  sortOrder: number;
  startDate?: LocalDateString | null;
  targetDate?: LocalDateString | null;
  startedAt?: ISODateTimeString | null;
  targetEndAt?: ISODateTimeString | null;
  completedAt?: ISODateTimeString | null;
  heroMediaAssetId?: EntityId | null;
};

export type UpdateExpeditionPatch = {
  title?: string;
  description?: string | null;
  status?: Expedition["status"];
  sortOrder?: number;
  startDate?: LocalDateString | null;
  targetDate?: LocalDateString | null;
  startedAt?: ISODateTimeString | null;
  targetEndAt?: ISODateTimeString | null;
  completedAt?: ISODateTimeString | null;
  heroMediaAssetId?: EntityId | null;
};

export type CreateMilestoneInput = {
  userId: EntityId;
  expeditionId: EntityId;
  title: string;
  description?: string | null;
  status: Milestone["status"];
  startDate?: LocalDateString | null;
  targetDate?: LocalDateString | null;
  sortOrder: number;
  orderIndex: number;
  completedAt?: ISODateTimeString | null;
};

export type UpdateMilestonePatch = {
  title?: string;
  description?: string | null;
  status?: Milestone["status"];
  startDate?: LocalDateString | null;
  targetDate?: LocalDateString | null;
  sortOrder?: number;
  orderIndex?: number;
  completedAt?: ISODateTimeString | null;
};

export type CreateMemoryInput = {
  userId: EntityId;
  trailDayId: EntityId;
  pathId?: EntityId | null;
  title: string;
  note?: string | null;
  capturedAt: ISODateTimeString;
  privacy: Memory["privacy"];
  location?: Memory["location"];
  mediaAssetIds?: EntityId[];
};

export type UpdateMemoryPatch = {
  pathId?: EntityId | null;
  title?: string;
  note?: string | null;
  capturedAt?: ISODateTimeString;
  privacy?: Memory["privacy"];
  location?: Memory["location"];
  mediaAssetIds?: EntityId[];
};

export type CreateSignalInput = {
  userId: EntityId;
  targetType: Signal["targetType"];
  targetId: EntityId;
  scheduledAt: ISODateTimeString;
  status: Signal["status"];
  ringingStartedAt?: ISODateTimeString | null;
  snoozedUntil?: ISODateTimeString | null;
  resolvedAt?: ISODateTimeString | null;
  dismissedAt?: ISODateTimeString | null;
  expiredAt?: ISODateTimeString | null;
  cancelledAt?: ISODateTimeString | null;
};

export type UpdateSignalPatch = {
  scheduledAt?: ISODateTimeString;
  status?: Signal["status"];
  ringingStartedAt?: ISODateTimeString | null;
  snoozedUntil?: ISODateTimeString | null;
  resolvedAt?: ISODateTimeString | null;
  dismissedAt?: ISODateTimeString | null;
  expiredAt?: ISODateTimeString | null;
  cancelledAt?: ISODateTimeString | null;
};

export type CreateDependencyInput = {
  dependentMarkInstanceId: EntityId;
  dependencyType: MarkDependency["dependencyType"];
  requiredEntityType: MarkDependency["requiredEntityType"];
  requiredEntityId: EntityId;
  isRequired: boolean;
  status: MarkDependency["status"];
  satisfiedAt?: ISODateTimeString | null;
  waivedAt?: ISODateTimeString | null;
};

export type UpdateDependencyPatch = {
  isRequired?: boolean;
  status?: MarkDependency["status"];
  satisfiedAt?: ISODateTimeString | null;
  waivedAt?: ISODateTimeString | null;
};

export type CreateMediaAssetInput = {
  userId: EntityId;
  ownerType: MediaAsset["ownerType"];
  ownerId: EntityId;
  kind?: MediaAsset["kind"];
  assetType: MediaAsset["assetType"];
  fileName: string;
  mimeType?: string | null;
  storagePath: string;
  thumbnailPath?: string | null;
  backupPath?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  byteSize?: number | null;
  sortIndex?: number | null;
  capturedAt?: ISODateTimeString | null;
  localDate?: LocalDateString | null;
  dailyBatchId?: EntityId | null;
  uploadStatus?: MediaAsset["uploadStatus"] | null;
  localStatus?: MediaAsset["localStatus"] | null;
  sourceCleanupStatus?: MediaAsset["sourceCleanupStatus"] | null;
  originalPickerUri?: string | null;
  libraryAssetId?: string | null;
};

export type UpdateMediaAssetPatch = {
  kind?: MediaAsset["kind"];
  assetType?: MediaAsset["assetType"];
  fileName?: string;
  mimeType?: string | null;
  storagePath?: string;
  thumbnailPath?: string | null;
  backupPath?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  byteSize?: number | null;
  sortIndex?: number | null;
  capturedAt?: ISODateTimeString | null;
  localDate?: LocalDateString | null;
  dailyBatchId?: EntityId | null;
  uploadStatus?: MediaAsset["uploadStatus"] | null;
  localStatus?: MediaAsset["localStatus"] | null;
  sourceCleanupStatus?: MediaAsset["sourceCleanupStatus"] | null;
  originalPickerUri?: string | null;
  libraryAssetId?: string | null;
  driveFileId?: string | null;
  driveFolderId?: string | null;
  driveRootFolderId?: string | null;
  driveWebViewLink?: string | null;
  driveWebContentLink?: string | null;
  driveMimeType?: string | null;
  driveSizeBytes?: number | null;
  driveMd5Checksum?: string | null;
  contentHash?: string | null;
  contentHashAlgorithm?: string | null;
  thumbnailDriveFileId?: string | null;
  thumbnailContentHash?: string | null;
  thumbnailContentHashAlgorithm?: string | null;
  uploadedAt?: ISODateTimeString | null;
  sourceDeletedAt?: ISODateTimeString | null;
  localDeletedAt?: ISODateTimeString | null;
  lastSyncError?: string | null;
};

export type UpsertDailyMediaUploadBatchInput = {
  id?: EntityId;
  userId: EntityId;
  localDate: LocalDateString;
  timezone: string;
  status?: DailyMediaUploadBatchStatus;
  mediaCount?: number;
  uploadedCount?: number;
  failedCount?: number;
  runSequence?: number;
  lockOwner?: string | null;
  lockAcquiredAt?: ISODateTimeString | null;
  lockExpiresAt?: ISODateTimeString | null;
  sealedAt?: ISODateTimeString | null;
  startedAt?: ISODateTimeString | null;
  completedAt?: ISODateTimeString | null;
  lastError?: string | null;
};

export type UpdateDailyMediaUploadBatchPatch = Partial<Omit<UpsertDailyMediaUploadBatchInput, "id" | "userId" | "localDate">>;

export type AcquireDailyMediaUploadBatchLockInput = {
  batchId: EntityId;
  lockOwner: string;
  lockAcquiredAt: ISODateTimeString;
  lockExpiresAt: ISODateTimeString;
  staleBefore: ISODateTimeString;
  mediaCount: number;
};

export type CreateReflectionEntryInput = {
  id?: EntityId;
  cluster: string;
  text: string;
  orderIndex: number;
};

export interface UserProfileRepository {
  getUserProfileById(userId: EntityId): Promise<UserProfile | null>;
  getOrCreateLocalUserProfile(input: CreateUserProfileInput): Promise<UserProfile>;
  updateUserProfile(userId: EntityId, patch: UpdateUserProfilePatch): Promise<UserProfile>;
}

export interface AppSettingsRepository {
  getSetting(userId: EntityId, key: string): Promise<AppSetting | null>;
  setSetting(userId: EntityId, key: string, value: AppSettingValue): Promise<AppSetting>;
  listSettings(userId: EntityId): Promise<AppSetting[]>;
  deleteSetting(userId: EntityId, key: string): Promise<void>;
}

export interface PathRepository {
  createPath(input: CreatePathInput): Promise<Path>;
  updatePath(pathId: EntityId, patch: UpdatePathPatch): Promise<Path>;
  getPathById(pathId: EntityId): Promise<Path | null>;
  listActivePaths(userId: EntityId): Promise<Path[]>;
  reorderPaths(userId: EntityId, orderedPathIds: EntityId[]): Promise<void>;
  softDeletePath(pathId: EntityId): Promise<void>;
}

export interface ExpeditionRepository {
  createExpedition(input: CreateExpeditionInput): Promise<Expedition>;
  updateExpedition(expeditionId: EntityId, patch: UpdateExpeditionPatch): Promise<Expedition>;
  getExpeditionById(id: EntityId): Promise<Expedition | null>;
  listExpeditionsByPath(pathId: EntityId, page?: QueryPage): Promise<QueryResult<Expedition>>;
  listMilestonesByExpedition(expeditionId: EntityId): Promise<Milestone[]>;
  createMilestone(input: CreateMilestoneInput): Promise<Milestone>;
  updateMilestone(milestoneId: EntityId, patch: UpdateMilestonePatch): Promise<Milestone>;
}

export interface MarkRepository {
  createMarkTemplate(input: CreateMarkTemplateInput): Promise<MarkTemplate>;
  updateMarkTemplate(templateId: EntityId, patch: UpdateMarkTemplatePatch): Promise<MarkTemplate>;
  getMarkTemplateById(templateId: EntityId): Promise<MarkTemplate | null>;
  listActiveMarkTemplatesByPath(pathId: EntityId): Promise<MarkTemplate[]>;
  createMarkInstance(input: CreateMarkInstanceInput): Promise<MarkInstance>;
  updateMarkInstance(markInstanceId: EntityId, patch: UpdateMarkInstancePatch): Promise<MarkInstance>;
  getMarkInstanceById(markInstanceId: EntityId): Promise<MarkInstance | null>;
  listPredecessorMarkInstances(markInstanceId: EntityId): Promise<MarkInstance[]>;
  listMarkInstancesByTrailDay(trailDayId: EntityId): Promise<MarkInstance[]>;
  listMarkInstancesByDate(userId: EntityId, localDate: LocalDateString): Promise<MarkInstance[]>;
  listMarkInstancesByExpedition(expeditionId: EntityId): Promise<MarkInstance[]>;
  listMarkInstancesByMilestone(milestoneId: EntityId): Promise<MarkInstance[]>;
  listMarkInstancesByTemplate(templateId: EntityId, range?: MarkTemplateRange): Promise<MarkInstance[]>;
  findMarkInstanceByGenerationKey(userId: EntityId, generationKey: string): Promise<MarkInstance | null>;
  softDeleteMarkInstance(markInstanceId: EntityId): Promise<void>;
}

export interface PackCheckRepository {
  getTemplateById(id: EntityId): Promise<PackCheckTemplate | null>;
  listTemplatesByPath(pathId: EntityId): Promise<PackCheckTemplate[]>;
  listItemTemplates(templateId: EntityId): Promise<PackCheckItemTemplate[]>;
  listMarkPackCheckRulesForMarkTemplate(markTemplateId: EntityId): Promise<MarkPackCheckRule[]>;
  listMarkPackCheckRulesForPackCheckTemplate(packCheckTemplateId: EntityId): Promise<MarkPackCheckRule[]>;
  upsertTemplate(template: PackCheckTemplate): Promise<PackCheckTemplate>;
  upsertItemTemplates(items: PackCheckItemTemplate[]): Promise<PackCheckItemTemplate[]>;
  upsertMarkPackCheckRules(items: MarkPackCheckRule[]): Promise<MarkPackCheckRule[]>;
  getInstanceById(id: EntityId): Promise<PackCheckInstance | null>;
  listInstancesByTrailDay(trailDayId: EntityId): Promise<PackCheckInstance[]>;
  listInstancesByTargetMark(markInstanceId: EntityId): Promise<PackCheckInstance[]>;
  listItemInstances(packCheckInstanceId: EntityId): Promise<PackCheckItemInstance[]>;
  findInstanceByGenerationKey(userId: EntityId, generationKey: string): Promise<PackCheckInstance | null>;
  upsertInstance(instance: PackCheckInstance): Promise<PackCheckInstance>;
  upsertItemInstances(items: PackCheckItemInstance[]): Promise<PackCheckItemInstance[]>;
  softDeleteInstance(id: EntityId): Promise<void>;
}

export interface SignalRepository {
  getSignalById(signalId: EntityId): Promise<Signal | null>;
  listSignalsByTarget(targetType: SignalTargetType, targetId: EntityId): Promise<Signal[]>;
  listSignalsByStatus(statuses: SignalStatus[], page?: QueryPage): Promise<QueryResult<Signal>>;
  createSignal(input: CreateSignalInput): Promise<Signal>;
  updateSignal(signalId: EntityId, patch: UpdateSignalPatch): Promise<Signal>;
}

export interface MemoryRepository {
  createMemory(input: CreateMemoryInput): Promise<Memory>;
  updateMemory(memoryId: EntityId, patch: UpdateMemoryPatch): Promise<Memory>;
  getMemoryById(memoryId: EntityId): Promise<Memory | null>;
  listMemoriesByTrailDay(trailDayId: EntityId): Promise<Memory[]>;
  softDeleteMemory(memoryId: EntityId): Promise<void>;
}

export interface BacklogRepository {
  getById(id: EntityId): Promise<BacklogItem | null>;
  listActiveBacklogItems(userId: EntityId): Promise<BacklogItem[]>;
  listByPath(pathId: EntityId, page?: QueryPage): Promise<QueryResult<BacklogItem>>;
  upsert(item: BacklogItem): Promise<BacklogItem>;
  softDeleteBacklogItem(id: EntityId): Promise<void>;
}

export interface WeekPlanRepository {
  getById(id: EntityId): Promise<WeekPlan | null>;
  getItemById(id: EntityId): Promise<WeekPlanItem | null>;
  findActiveItemByCreatedMarkInstanceId(markInstanceId: EntityId): Promise<WeekPlanItem | null>;
  getByWeekStart(userId: EntityId, weekStartDate: string): Promise<WeekPlan | null>;
  listItems(weekPlanId: EntityId): Promise<WeekPlanItem[]>;
  listItemsByExpedition(userId: EntityId, expeditionId: EntityId): Promise<WeekPlanItem[]>;
  upsertWeekPlan(weekPlan: WeekPlan): Promise<WeekPlan>;
  upsertItems(items: WeekPlanItem[]): Promise<WeekPlanItem[]>;
  softDeleteWeekPlanItem(id: EntityId): Promise<void>;
}

export interface TrailDayRepository {
  getOrCreateTrailDay(userId: EntityId, localDate: LocalDateString): Promise<TrailDay>;
  getTrailDayById(trailDayId: EntityId): Promise<TrailDay | null>;
  getTrailDayByDate(userId: EntityId, localDate: LocalDateString): Promise<TrailDay | null>;
  updateTrailDay(trailDayId: EntityId, patch: UpdateTrailDayPatch): Promise<TrailDay>;
  setAnchorPath(trailDayId: EntityId, pathId: EntityId): Promise<TrailDay>;
  updateCloseState(trailDayId: EntityId, patch: UpdateTrailDayClosePatch): Promise<TrailDay>;
  listTrailDaysInRange(userId: EntityId, startDate: LocalDateString, endDate: LocalDateString): Promise<TrailDay[]>;
  listMemories(trailDayId: EntityId): Promise<Memory[]>;
  createMemory(input: CreateMemoryInput): Promise<Memory>;
  updateMemory(memoryId: EntityId, patch: UpdateMemoryPatch): Promise<Memory>;
  listReflectionEntries(trailDayId: EntityId): Promise<ReflectionEntry[]>;
  replaceReflectionEntries(trailDayId: EntityId, entries: CreateReflectionEntryInput[]): Promise<ReflectionEntry[]>;
}

export interface MediaRepository {
  getById(id: EntityId): Promise<MediaAsset | null>;
  listByOwner(ownerType: MediaAssetOwnerType, ownerId: EntityId): Promise<MediaAsset[]>;
  listPendingEodUpload(userId: EntityId, localDate: LocalDateString, options?: { includeVerified?: boolean }): Promise<MediaAsset[]>;
  listPendingEodUploadDates(userId: EntityId, nowLocalDate: LocalDateString, options?: { includeVerified?: boolean }): Promise<LocalDateString[]>;
  createMediaAsset(input: CreateMediaAssetInput): Promise<MediaAsset>;
  updateMediaAsset(assetId: EntityId, patch: UpdateMediaAssetPatch): Promise<MediaAsset>;
}

export interface DailyMediaUploadBatchRepository {
  getById(id: EntityId): Promise<DailyMediaUploadBatch | null>;
  getByUserDate(userId: EntityId, localDate: LocalDateString): Promise<DailyMediaUploadBatch | null>;
  getOrCreate(input: UpsertDailyMediaUploadBatchInput): Promise<DailyMediaUploadBatch>;
  acquireUploadLock(input: AcquireDailyMediaUploadBatchLockInput): Promise<DailyMediaUploadBatch | null>;
  listCatchUpCandidates(userId: EntityId, nowLocalDate: LocalDateString, nowIso: ISODateTimeString): Promise<DailyMediaUploadBatch[]>;
  upsert(input: UpsertDailyMediaUploadBatchInput): Promise<DailyMediaUploadBatch>;
  update(batchId: EntityId, patch: UpdateDailyMediaUploadBatchPatch): Promise<DailyMediaUploadBatch>;
}

export interface StrengthRepository {
  getRoutineById(id: EntityId): Promise<WorkoutRoutineTemplate | null>;
  listRoutinesByPath(pathId: EntityId): Promise<WorkoutRoutineTemplate[]>;
  listRoutineExercises(routineTemplateId: EntityId): Promise<RoutineExerciseTemplate[]>;
  softDeleteRoutineExercisesExcept(routineTemplateId: EntityId, keepIds: EntityId[]): Promise<void>;
  upsertRoutine(routine: WorkoutRoutineTemplate): Promise<WorkoutRoutineTemplate>;
  upsertRoutineExercises(items: RoutineExerciseTemplate[]): Promise<RoutineExerciseTemplate[]>;
  getSessionById(id: EntityId): Promise<WorkoutSessionInstance | null>;
  getSessionByMarkInstance(markInstanceId: EntityId): Promise<WorkoutSessionInstance | null>;
  upsertSession(session: WorkoutSessionInstance): Promise<WorkoutSessionInstance>;
  listSessionSnapshots(workoutSessionInstanceId: EntityId): Promise<SessionExerciseSnapshot[]>;
  softDeleteSessionSnapshots(workoutSessionInstanceId: EntityId): Promise<void>;
  upsertSessionSnapshots(snapshots: SessionExerciseSnapshot[]): Promise<SessionExerciseSnapshot[]>;
  listSetLogs(sessionExerciseSnapshotId: EntityId): Promise<ExerciseSetLog[]>;
  upsertSetLogs(logs: ExerciseSetLog[]): Promise<ExerciseSetLog[]>;
  getExerciseDefinitionById(id: EntityId): Promise<ExerciseDefinition | null>;
  listExerciseDefinitions(): Promise<ExerciseDefinition[]>;
  upsertExerciseDefinition(exercise: ExerciseDefinition): Promise<ExerciseDefinition>;
  getProgressState(userId: EntityId, exerciseDefinitionId: EntityId): Promise<ExerciseProgressState | null>;
  upsertExerciseProgressState(state: ExerciseProgressState): Promise<ExerciseProgressState>;
}

export interface DependencyRepository {
  createDependency(input: CreateDependencyInput): Promise<MarkDependency>;
  updateDependency(dependencyId: EntityId, patch: UpdateDependencyPatch): Promise<MarkDependency>;
  listDependenciesForMark(markInstanceId: EntityId): Promise<MarkDependency[]>;
  listDependenciesByRequiredEntity(requiredType: MarkDependency["requiredEntityType"], requiredId: EntityId): Promise<MarkDependency[]>;
}

export interface WaymarkRepositories {
  userProfiles: UserProfileRepository;
  paths: PathRepository;
  expeditions: ExpeditionRepository;
  trailDays: TrailDayRepository;
  marks: MarkRepository;
  packChecks: PackCheckRepository;
  signals: SignalRepository;
  memories: MemoryRepository;
  backlog: BacklogRepository;
  weekPlans: WeekPlanRepository;
  dependencies: DependencyRepository;
  media: MediaRepository;
  dailyMediaUploadBatches: DailyMediaUploadBatchRepository;
  appSettings: AppSettingsRepository;
  strength: StrengthRepository;
  transaction: TransactionRunner<WaymarkRepositories>;
}
