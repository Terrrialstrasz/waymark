import type { SQLiteDatabase } from "expo-sqlite";
import {
  AppSettingsRepository,
  AppSettingValue,
  AcquireDailyMediaUploadBatchLockInput,
  BacklogRepository,
  CreateDependencyInput,
  CreateExpeditionInput,
  CreateMarkInstanceInput,
  CreateMarkTemplateInput,
  CreateMediaAssetInput,
  CreateMemoryInput,
  CreatePathInput,
  CreateMilestoneInput,
  CreateReflectionEntryInput,
  CreateSignalInput,
  CreateUserProfileInput,
  DailyMediaUploadBatchRepository,
  DependencyRepository,
  ExpeditionRepository,
  MarkRepository,
  MarkTemplateRange,
  MediaRepository,
  MemoryRepository,
  PackCheckRepository,
  PathRepository,
  SignalRepository,
  StrengthRepository,
  TrailDayRepository,
  TransactionRunner,
  UpdateDependencyPatch,
  UpdateDailyMediaUploadBatchPatch,
  UpdateExpeditionPatch,
  UpdateMarkInstancePatch,
  UpdateMarkTemplatePatch,
  UpdateMediaAssetPatch,
  UpdateMemoryPatch,
  UpdateMilestonePatch,
  UpdatePathPatch,
  UpdateTrailDayClosePatch,
  UpdateTrailDayPatch,
  UpdateSignalPatch,
  UpdateUserProfilePatch,
  UpsertDailyMediaUploadBatchInput,
  UserProfileRepository,
  WaymarkRepositories,
  WeekPlanRepository,
} from "../../domain/waymark";
import {
  AppSetting,
  BacklogItem,
  DailyMediaUploadBatch,
  Expedition,
  MarkDependency,
  MarkInstance,
  MarkPackCheckRule,
  MarkTemplate,
  Memory,
  Milestone,
  MediaAssetKind,
  PackCheckInstance,
  PackCheckItemInstance,
  PackCheckItemTemplate,
  PackCheckTemplate,
  Path,
  ReflectionEntry,
  Signal,
  TrailDay,
  MediaAsset,
  WorkoutRoutineTemplate,
  RoutineExerciseTemplate,
  WorkoutSessionInstance,
  SessionExerciseSnapshot,
  ExerciseSetLog,
  ExerciseDefinition,
  ExerciseProgressState,
  WeekPlan,
  WeekPlanItem,
  MediaAssetOwnerType,
  MediaAssetType,
  SignalTargetType,
  MarkInstanceStatus,
  PathStatus,
  SignalStatus,
  TrailDayStatus,
  UserProfile,
  WeekPlanItemStatus,
  WeekPlanStatus,
} from "../../domain/waymark";
import { WAYMARK_TABLES } from "../constants";
import {
  fromAppSettingRow,
  fromBacklogItemRow,
  fromDailyMediaUploadBatchRow,
  fromExerciseDefinitionRow,
  fromExerciseProgressStateRow,
  fromExerciseSetLogRow,
  fromExpeditionRow,
  fromReflectionEntryRow,
  fromMarkDependencyRow,
  fromMarkInstanceRow,
  fromMarkPackCheckRuleRow,
  fromMarkTemplateRow,
  fromMediaAssetRow,
  fromMemoryRow,
  fromMilestoneRow,
  fromPackCheckInstanceRow,
  fromPackCheckItemInstanceRow,
  fromPackCheckItemTemplateRow,
  fromPackCheckTemplateRow,
  fromPathRow,
  fromRoutineExerciseTemplateRow,
  fromSessionExerciseSnapshotRow,
  fromSignalRow,
  fromTrailDayRow,
  fromUserProfileRow,
  fromWeekPlanItemRow,
  fromWeekPlanRow,
  fromWorkoutRoutineTemplateRow,
  fromWorkoutSessionInstanceRow,
  toAppSettingRow,
  toBacklogItemRow,
  toDailyMediaUploadBatchRow,
  toExerciseDefinitionRow,
  toExerciseProgressStateRow,
  toExerciseSetLogRow,
  toExpeditionRow,
  toReflectionEntryRow,
  toMarkDependencyRow,
  toMarkInstanceRow,
  toMarkPackCheckRuleRow,
  toMarkTemplateRow,
  toMediaAssetRow,
  toMemoryRow,
  toMilestoneRow,
  toPackCheckInstanceRow,
  toPackCheckItemInstanceRow,
  toPackCheckItemTemplateRow,
  toPackCheckTemplateRow,
  toPathRow,
  toRoutineExerciseTemplateRow,
  toSessionExerciseSnapshotRow,
  toSignalRow,
  toTrailDayRow,
  toUserProfileRow,
  toWeekPlanItemRow,
  toWeekPlanRow,
  toWorkoutRoutineTemplateRow,
  toWorkoutSessionInstanceRow,
} from "../mappers";
import {
  AppSettingRow,
  BacklogItemRow,
  DailyMediaUploadBatchRow,
  ExerciseDefinitionRow,
  ExerciseProgressStateRow,
  ExerciseSetLogRow,
  ExpeditionRow,
  ReflectionEntryRow,
  MarkDependencyRow,
  MarkInstanceRow,
  MarkPackCheckRuleRow,
  MarkTemplateRow,
  MediaAssetRow,
  MemoryRow,
  MilestoneRow,
  PackCheckInstanceRow,
  PackCheckItemInstanceRow,
  PackCheckItemTemplateRow,
  PackCheckTemplateRow,
  PathRow,
  RoutineExerciseTemplateRow,
  SessionExerciseSnapshotRow,
  SignalRow,
  TrailDayRow,
  UserProfileRow,
  WeekPlanItemRow,
  WeekPlanRow,
  WorkoutRoutineTemplateRow,
  WorkoutSessionInstanceRow,
} from "../rows";
import {
  ConstraintViolationRepositoryError,
  getErrorMessage,
  NotImplementedRepositoryError,
  NotFoundRepositoryError,
  RepositoryValidationError,
  TransactionRepositoryError,
  UnsupportedPolymorphicReferenceRepositoryError,
} from "./errors";
import {
  runExclusiveSqliteWrite,
  SQLiteExecutorProvider,
  SQLiteQueryable,
  SQLiteRepositoryBase,
  SQLiteTransactionalDatabase,
} from "./SQLiteRepositoryBase";

function generateEntityId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateDailyMediaUploadBatchId(localDate: string, userId: string): string {
  return `daily_${localDate}_${userId}`.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function asArrayParams(ids: readonly string[]): string {
  return ids.map(() => "?").join(", ");
}

class SQLiteTransactionRunner implements TransactionRunner<WaymarkRepositories> {
  constructor(
    private readonly rootDatabaseProvider: () => Promise<SQLiteTransactionalDatabase>,
    private readonly scopedRepositories: WaymarkRepositories | null,
  ) {}

  async runInTransaction<T>(work: (repositories: WaymarkRepositories) => Promise<T>): Promise<T> {
    if (this.scopedRepositories) {
      return work(this.scopedRepositories);
    }

    const runTransaction = async (): Promise<T> => {
      const db = await this.rootDatabaseProvider();
      let result!: T;

      try {
        await runExclusiveSqliteWrite(() =>
          db.withExclusiveTransactionAsync(async (txn) => {
            const txRepos = createSQLiteRepositoryProvider(this.rootDatabaseProvider, async () => txn, true);
            result = await work(txRepos);
          }),
        );
        return result;
      } catch (error) {
        const detail = getErrorMessage(error);
        throw new TransactionRepositoryError(
          detail ? `Repository transaction failed: ${detail}` : "Repository transaction failed.",
          { cause: error },
        );
      }
    };

    return runTransaction();
  }
}

abstract class SQLiteStubRepository extends SQLiteRepositoryBase {
  protected fail(method: string): never {
    throw new NotImplementedRepositoryError(`${this.constructor.name}.${method} is not implemented in the current repository slice.`);
  }
}

export class SQLiteAppSettingsRepository extends SQLiteRepositoryBase implements AppSettingsRepository {
  async getSetting(userId: string, key: string): Promise<AppSetting | null> {
    const row = await this.getFirst<AppSettingRow>(
      `SELECT * FROM ${WAYMARK_TABLES.appSettings} WHERE user_id = ? AND key = ? AND deleted_at IS NULL LIMIT 1;`,
      userId,
      key,
    );
    return row ? fromAppSettingRow(row) : null;
  }

  async setSetting(userId: string, key: string, value: AppSettingValue): Promise<AppSetting> {
    const existing = await this.getFirst<AppSettingRow>(
      `SELECT * FROM ${WAYMARK_TABLES.appSettings} WHERE user_id = ? AND key = ? LIMIT 1;`,
      userId,
      key,
    );

    if (!existing) {
      const created = {
        id: generateEntityId("app_setting"),
        userId,
        key,
        value,
        createdAt: this.getNowIsoString(),
        updatedAt: this.getNowIsoString(),
        syncVersion: 0,
      } satisfies AppSetting;

      const row = toAppSettingRow(created);
      await this.insertRow(WAYMARK_TABLES.appSettings, row);
      return created;
    }

    const current = fromAppSettingRow(existing);
    const updatedDomain: AppSetting = this.nextUpdateMetadata({
      ...current,
      value,
      deletedAt: undefined,
    });
    const updatedRow = this.toMutableUpdate(toAppSettingRow(updatedDomain));
    updatedRow.deleted_at = null;
    await this.updateRow(WAYMARK_TABLES.appSettings, updatedRow);
    return updatedDomain;
  }

  async listSettings(userId: string): Promise<AppSetting[]> {
    const rows = await this.getAll<AppSettingRow>(
      `SELECT * FROM ${WAYMARK_TABLES.appSettings} WHERE user_id = ? AND deleted_at IS NULL ORDER BY key ASC;`,
      userId,
    );
    return rows.map(fromAppSettingRow);
  }

  async deleteSetting(userId: string, key: string): Promise<void> {
    const row = await this.getFirst<AppSettingRow>(
      `SELECT * FROM ${WAYMARK_TABLES.appSettings} WHERE user_id = ? AND key = ? AND deleted_at IS NULL LIMIT 1;`,
      userId,
      key,
    );

    if (!row) {
      return;
    }

    const deletedRow = this.toMutableDelete(row);
    await this.updateRow(WAYMARK_TABLES.appSettings, deletedRow);
  }
}

export class SQLiteUserProfileRepository extends SQLiteRepositoryBase implements UserProfileRepository {
  async getUserProfileById(userId: string): Promise<UserProfile | null> {
    const row = await this.getActiveRowById<UserProfileRow>(WAYMARK_TABLES.userProfiles, userId);
    return row ? fromUserProfileRow(row) : null;
  }

  async getOrCreateLocalUserProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    const existing = await this.getUserProfileById(input.userId);
    if (existing) {
      return existing;
    }

    const now = this.getNowIsoString();
    const profile: UserProfile = {
      id: input.userId,
      userId: input.userId,
      displayName: input.displayName ?? undefined,
      locale: input.locale,
      timezone: input.timezone,
      weekStartsOn: input.weekStartsOn,
      closeTrailPromptTime: input.closeTrailPromptTime ?? undefined,
      createdAt: now,
      updatedAt: now,
      syncVersion: 0,
    };

    try {
      await this.insertRow(WAYMARK_TABLES.userProfiles, toUserProfileRow(profile));
      return profile;
    } catch (error) {
      if (error instanceof Error && /unique|constraint/i.test(error.message)) {
        const concurrent = await this.getUserProfileById(input.userId);
        if (concurrent) {
          return concurrent;
        }
      }
      throw error;
    }
  }

  async updateUserProfile(userId: string, patch: UpdateUserProfilePatch): Promise<UserProfile> {
    const row = await this.getActiveRowById<UserProfileRow>(WAYMARK_TABLES.userProfiles, userId);
    const current = this.assertFound(row, WAYMARK_TABLES.userProfiles, userId);
    const entity = fromUserProfileRow(current);
    const updated = this.nextUpdateMetadata<UserProfile>({
      ...entity,
      displayName: patch.displayName === undefined ? entity.displayName : patch.displayName ?? undefined,
      locale: patch.locale ?? entity.locale,
      timezone: patch.timezone ?? entity.timezone,
      weekStartsOn: patch.weekStartsOn ?? entity.weekStartsOn,
      closeTrailPromptTime:
        patch.closeTrailPromptTime === undefined ? entity.closeTrailPromptTime : patch.closeTrailPromptTime ?? undefined,
      deletedAt: undefined,
    });
    const updatedRow = this.toMutableUpdate(toUserProfileRow(updated));
    await this.updateRow(WAYMARK_TABLES.userProfiles, updatedRow);
    return updated;
  }
}

export class SQLitePathRepository extends SQLiteRepositoryBase implements PathRepository {
  async createPath(input: CreatePathInput): Promise<Path> {
    if (!input.userId || !input.slug || !input.title) {
      throw new RepositoryValidationError("Path creation requires userId, slug, and title.");
    }

    const now = this.getNowIsoString();
    const path: Path = {
      id: generateEntityId("path"),
      userId: input.userId,
      slug: input.slug,
      title: input.title,
      description: input.description ?? undefined,
      status: input.status ?? PathStatus.Active,
      sortOrder: input.sortOrder,
      heroMediaAssetId: input.heroMediaAssetId ?? undefined,
      createdAt: now,
      updatedAt: now,
      syncVersion: 0,
    };

    await this.insertRow(WAYMARK_TABLES.paths, toPathRow(path));
    return path;
  }

  async updatePath(pathId: string, patch: UpdatePathPatch): Promise<Path> {
    const currentRow = await this.getFirst<PathRow>(
      `SELECT * FROM ${WAYMARK_TABLES.paths} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      pathId,
    );
    const row = this.assertFound(currentRow, WAYMARK_TABLES.paths, pathId);
    const current = fromPathRow(row);
    const updated: Path = this.nextUpdateMetadata({
      ...current,
      slug: patch.slug ?? current.slug,
      title: patch.title ?? current.title,
      description: patch.description === undefined ? current.description : patch.description ?? undefined,
      status: patch.status ?? current.status,
      sortOrder: patch.sortOrder ?? current.sortOrder,
      heroMediaAssetId: patch.heroMediaAssetId === undefined ? current.heroMediaAssetId : patch.heroMediaAssetId ?? undefined,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toPathRow(updated));
    await this.updateRow(WAYMARK_TABLES.paths, updatedRow);
    return updated;
  }

  async getPathById(pathId: string): Promise<Path | null> {
    const row = await this.getFirst<PathRow>(
      `SELECT * FROM ${WAYMARK_TABLES.paths} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      pathId,
    );
    return row ? fromPathRow(row) : null;
  }

  async listActivePaths(userId: string): Promise<Path[]> {
    const rows = await this.getAll<PathRow>(
      `SELECT * FROM ${WAYMARK_TABLES.paths} WHERE user_id = ? AND status = ? AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC;`,
      userId,
      "active",
    );
    return rows.map(fromPathRow);
  }

  async reorderPaths(userId: string, orderedPathIds: string[]): Promise<void> {
    if (orderedPathIds.length === 0) {
      return;
    }

    await this.withAtomicWrite(async (executor) => {
      const rows = await executor.getAllAsync<PathRow>(
        `SELECT * FROM ${WAYMARK_TABLES.paths} WHERE user_id = ? AND id IN (${asArrayParams(orderedPathIds)}) AND deleted_at IS NULL;`,
        userId,
        ...orderedPathIds,
      );

      if (rows.length !== orderedPathIds.length) {
        throw new NotFoundRepositoryError("One or more paths were not found for reorder.", WAYMARK_TABLES.paths);
      }

      const rowsById = new Map(rows.map((row) => [row.id, row]));
      const now = this.getNowEpochMs();

      for (const [index, pathId] of orderedPathIds.entries()) {
        const row = rowsById.get(pathId);
        if (!row) {
          throw new NotFoundRepositoryError("Path missing during reorder.", WAYMARK_TABLES.paths, pathId);
        }

        await executor.runAsync(
          `UPDATE ${WAYMARK_TABLES.paths}
           SET sort_order = ?, updated_at = ?, sync_status = ?, local_revision = ?
           WHERE id = ?;`,
          index,
          now,
          "dirty",
          row.local_revision + 1,
          pathId,
        );
      }
    });
  }

  async softDeletePath(pathId: string): Promise<void> {
    const row = await this.getFirst<PathRow>(
      `SELECT * FROM ${WAYMARK_TABLES.paths} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      pathId,
    );
    if (!row) {
      return;
    }

    const deletedRow = this.toMutableDelete(row);
    await this.updateRow(WAYMARK_TABLES.paths, deletedRow);
  }
}

export class SQLiteTrailDayRepository extends SQLiteRepositoryBase implements TrailDayRepository {
  async getOrCreateTrailDay(userId: string, localDate: string): Promise<TrailDay> {
    const existing = await this.getTrailDayByDate(userId, localDate);
    if (existing) {
      return existing;
    }

    const now = this.getNowIsoString();
    const trailDay: TrailDay = {
      id: `trailday_${userId}_${localDate}`,
      userId,
      date: localDate,
      status: TrailDayStatus.Open,
      plannedMarkCount: 0,
      completedMarkCount: 0,
      skippedMarkCount: 0,
      memoryCount: 0,
      createdAt: now,
      updatedAt: now,
      syncVersion: 0,
    };

    try {
      await this.insertRow(WAYMARK_TABLES.trailDays, toTrailDayRow(trailDay));
      return trailDay;
    } catch (error) {
      if (error instanceof Error && /unique|constraint/i.test(error.message)) {
        const concurrent = await this.getTrailDayByDate(userId, localDate);
        if (concurrent) {
          return concurrent;
        }
      }
      throw error;
    }
  }

  async getTrailDayById(trailDayId: string): Promise<TrailDay | null> {
    const row = await this.getFirst<TrailDayRow>(
      `SELECT * FROM ${WAYMARK_TABLES.trailDays} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      trailDayId,
    );
    return row ? fromTrailDayRow(row) : null;
  }

  async getTrailDayByDate(userId: string, localDate: string): Promise<TrailDay | null> {
    const row = await this.getFirst<TrailDayRow>(
      `SELECT * FROM ${WAYMARK_TABLES.trailDays} WHERE user_id = ? AND local_date = ? AND deleted_at IS NULL LIMIT 1;`,
      userId,
      localDate,
    );
    return row ? fromTrailDayRow(row) : null;
  }

  async updateTrailDay(trailDayId: string, patch: UpdateTrailDayPatch): Promise<TrailDay> {
    const row = await this.getFirst<TrailDayRow>(
      `SELECT * FROM ${WAYMARK_TABLES.trailDays} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      trailDayId,
    );
    const current = this.assertFound(row, WAYMARK_TABLES.trailDays, trailDayId);
    const entity = fromTrailDayRow(current);
    const updated: TrailDay = this.nextUpdateMetadata({
      ...entity,
      status: patch.status ?? entity.status,
      closedAt: patch.closedAt === undefined ? entity.closedAt : patch.closedAt ?? undefined,
      reopenedAt: patch.reopenedAt === undefined ? entity.reopenedAt : patch.reopenedAt ?? undefined,
      closeSummary: patch.closeSummary === undefined ? entity.closeSummary : patch.closeSummary ?? undefined,
      tomorrowFirstStep:
        patch.tomorrowFirstStep === undefined ? entity.tomorrowFirstStep : patch.tomorrowFirstStep ?? undefined,
      characterResult: patch.characterResult === undefined ? entity.characterResult : patch.characterResult ?? undefined,
      plannedMarkCount: patch.plannedMarkCount ?? entity.plannedMarkCount,
      completedMarkCount: patch.completedMarkCount ?? entity.completedMarkCount,
      skippedMarkCount: patch.skippedMarkCount ?? entity.skippedMarkCount,
      memoryCount: patch.memoryCount ?? entity.memoryCount,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toTrailDayRow(updated));
    updatedRow.anchor_path_id = current.anchor_path_id;
    await this.updateRow(WAYMARK_TABLES.trailDays, updatedRow);
    return { ...updated, anchorPathId: current.anchor_path_id ?? undefined };
  }

  async setAnchorPath(trailDayId: string, pathId: string): Promise<TrailDay> {
    const row = await this.getFirst<TrailDayRow>(
      `SELECT * FROM ${WAYMARK_TABLES.trailDays} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      trailDayId,
    );
    const current = this.assertFound(row, WAYMARK_TABLES.trailDays, trailDayId);
    const entity = fromTrailDayRow(current);
    const updated: TrailDay = this.nextUpdateMetadata({
      ...entity,
      anchorPathId: pathId,
      deletedAt: undefined,
    });
    const updatedRow = this.toMutableUpdate(toTrailDayRow(updated));
    await this.updateRow(WAYMARK_TABLES.trailDays, updatedRow);
    return updated;
  }

  async updateCloseState(trailDayId: string, patch: UpdateTrailDayClosePatch): Promise<TrailDay> {
    return this.updateTrailDay(trailDayId, patch);
  }

  async listTrailDaysInRange(userId: string, startDate: string, endDate: string): Promise<TrailDay[]> {
    const rows = await this.getAll<TrailDayRow>(
      `SELECT * FROM ${WAYMARK_TABLES.trailDays}
       WHERE user_id = ? AND local_date >= ? AND local_date <= ? AND deleted_at IS NULL
       ORDER BY local_date ASC;`,
      userId,
      startDate,
      endDate,
    );
    return rows.map(fromTrailDayRow);
  }

  async listMemories(trailDayId: string): Promise<Memory[]> {
    const rows = await this.getAll<MemoryRow>(
      `SELECT * FROM ${WAYMARK_TABLES.memories}
       WHERE trail_day_id = ? AND deleted_at IS NULL
       ORDER BY captured_at ASC, created_at ASC;`,
      trailDayId,
    );
    return rows.map(fromMemoryRow);
  }

  async createMemory(input: CreateMemoryInput): Promise<Memory> {
    const trailDayExists = await this.activeRecordExists(WAYMARK_TABLES.trailDays, input.trailDayId);
    if (!trailDayExists) {
      this.validation("Memory creation requires an existing TrailDay.");
    }

    if (input.pathId) {
      const pathExists = await this.activeRecordExists(WAYMARK_TABLES.paths, input.pathId);
      if (!pathExists) {
        this.validation("Memory pathId must reference an existing Path when provided.");
      }
    }

    const created = this.nextCreateMetadata<Memory>({
      id: generateEntityId("memory"),
      userId: input.userId,
      trailDayId: input.trailDayId,
      pathId: input.pathId ?? undefined,
      title: input.title,
      note: input.note ?? undefined,
      capturedAt: input.capturedAt,
      privacy: input.privacy,
      location: input.location,
      mediaAssetIds: input.mediaAssetIds ?? [],
      createdAt: this.getNowIsoString(),
      updatedAt: this.getNowIsoString(),
      syncVersion: 0,
    });
    await this.insertRow(WAYMARK_TABLES.memories, toMemoryRow(created));
    return created;
  }

  async updateMemory(memoryId: string, patch: UpdateMemoryPatch): Promise<Memory> {
    const existing = await this.getActiveRowById<MemoryRow>(WAYMARK_TABLES.memories, memoryId);
    const current = this.assertFound(existing, WAYMARK_TABLES.memories, memoryId);
    const entity = fromMemoryRow(current);

    if (patch.pathId) {
      const pathExists = await this.activeRecordExists(WAYMARK_TABLES.paths, patch.pathId);
      if (!pathExists) {
        this.validation("Memory pathId must reference an existing Path when provided.");
      }
    }

    const updated = this.nextUpdateMetadata<Memory>({
      ...entity,
      pathId: patch.pathId === undefined ? entity.pathId : patch.pathId ?? undefined,
      title: patch.title ?? entity.title,
      note: patch.note === undefined ? entity.note : patch.note ?? undefined,
      capturedAt: patch.capturedAt ?? entity.capturedAt,
      privacy: patch.privacy ?? entity.privacy,
      location: patch.location === undefined ? entity.location : patch.location,
      mediaAssetIds: patch.mediaAssetIds ?? entity.mediaAssetIds,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toMemoryRow(updated));
    updatedRow.deleted_at = null;
    await this.updateRow(WAYMARK_TABLES.memories, updatedRow);
    return updated;
  }

  async listReflectionEntries(trailDayId: string): Promise<ReflectionEntry[]> {
    const rows = await this.getAll<ReflectionEntryRow>(
      `SELECT * FROM ${WAYMARK_TABLES.reflectionEntries}
       WHERE trail_day_id = ? AND deleted_at IS NULL
       ORDER BY order_index ASC, created_at ASC;`,
      trailDayId,
    );
    return rows.map(fromReflectionEntryRow);
  }

  async replaceReflectionEntries(trailDayId: string, entries: CreateReflectionEntryInput[]): Promise<ReflectionEntry[]> {
    const trailDay = await this.getActiveRowById<TrailDayRow>(WAYMARK_TABLES.trailDays, trailDayId);
    const currentTrailDay = this.assertFound(trailDay, WAYMARK_TABLES.trailDays, trailDayId);

    return this.withAtomicWrite(async (executor) => {
      const existingRows = await executor.getAllAsync<ReflectionEntryRow>(
        `SELECT * FROM ${WAYMARK_TABLES.reflectionEntries}
         WHERE trail_day_id = ? AND deleted_at IS NULL;`,
        trailDayId,
      );

      for (const row of existingRows) {
        const deletedRow = this.toMutableDelete(row);
        await executor.runAsync(
          `UPDATE ${WAYMARK_TABLES.reflectionEntries}
           SET updated_at = ?, deleted_at = ?, sync_status = ?, local_revision = ?
           WHERE id = ?;`,
          deletedRow.updated_at,
          deletedRow.deleted_at,
          deletedRow.sync_status,
          deletedRow.local_revision,
          row.id,
        );
      }

      const createdEntries: ReflectionEntry[] = [];
      for (const entry of entries) {
        const created = this.nextCreateMetadata<ReflectionEntry>({
          id: entry.id || generateEntityId("reflection_entry"),
          trailDayId,
          cluster: entry.cluster,
          text: entry.text,
          orderIndex: entry.orderIndex,
          createdAt: this.getNowIsoString(),
          updatedAt: this.getNowIsoString(),
          syncVersion: 0,
        });
        const row = toReflectionEntryRow(created, currentTrailDay.user_id);
        const columns = Object.keys(row);
        const placeholders = columns.map(() => "?").join(", ");
        const values = columns.map((column) => (row as unknown as Record<string, unknown>)[column]);
        await executor.runAsync(
          `INSERT INTO ${WAYMARK_TABLES.reflectionEntries} (${columns.join(", ")}) VALUES (${placeholders});`,
          ...(values as any[]),
        );
        createdEntries.push(created);
      }

      return createdEntries;
    });
  }
}

export class SQLiteMarkRepository extends SQLiteRepositoryBase implements MarkRepository {
  async createMarkTemplate(input: CreateMarkTemplateInput): Promise<MarkTemplate> {
    if (!input.userId || !input.pathId || !input.title) {
      throw new RepositoryValidationError("Mark template creation requires userId, pathId, and title.");
    }

    const now = this.getNowIsoString();
    const template: MarkTemplate = {
      id: generateEntityId("mark_template"),
      userId: input.userId,
      pathId: input.pathId,
      title: input.title,
      description: input.description ?? undefined,
      templateType: input.templateType,
      recurrenceRule: input.recurrenceRule,
      defaultDurationMin: input.defaultDurationMin ?? undefined,
      defaultSignalRule: input.defaultSignalRule,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
      syncVersion: 0,
    };

    await this.insertRow(WAYMARK_TABLES.markTemplates, toMarkTemplateRow(template));
    return template;
  }

  async updateMarkTemplate(templateId: string, patch: UpdateMarkTemplatePatch): Promise<MarkTemplate> {
    const row = await this.getFirst<MarkTemplateRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markTemplates} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      templateId,
    );
    const current = this.assertFound(row, WAYMARK_TABLES.markTemplates, templateId);
    const entity = fromMarkTemplateRow(current);
    const updated: MarkTemplate = this.nextUpdateMetadata({
      ...entity,
      title: patch.title ?? entity.title,
      description: patch.description === undefined ? entity.description : patch.description ?? undefined,
      templateType: patch.templateType ?? entity.templateType,
      recurrenceRule: patch.recurrenceRule ?? entity.recurrenceRule,
      defaultDurationMin:
        patch.defaultDurationMin === undefined ? entity.defaultDurationMin : patch.defaultDurationMin ?? undefined,
      defaultSignalRule:
        patch.defaultSignalRule === undefined ? entity.defaultSignalRule : patch.defaultSignalRule ?? undefined,
      isActive: patch.isActive ?? entity.isActive,
      deletedAt: undefined,
    });
    const updatedRow = this.toMutableUpdate(toMarkTemplateRow(updated));
    await this.updateRow(WAYMARK_TABLES.markTemplates, updatedRow);
    return updated;
  }

  async getMarkTemplateById(templateId: string): Promise<MarkTemplate | null> {
    const row = await this.getFirst<MarkTemplateRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markTemplates} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      templateId,
    );
    return row ? fromMarkTemplateRow(row) : null;
  }

  async listActiveMarkTemplatesByPath(pathId: string): Promise<MarkTemplate[]> {
    const rows = await this.getAll<MarkTemplateRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markTemplates}
       WHERE path_id = ? AND is_active = 1 AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      pathId,
    );
    return rows.map(fromMarkTemplateRow);
  }

  async createMarkInstance(input: CreateMarkInstanceInput): Promise<MarkInstance> {
    if (!input.userId || !input.pathId || !input.trailDayId || !input.title) {
      throw new RepositoryValidationError("Mark instance creation requires userId, pathId, trailDayId, and title.");
    }

    const now = this.getNowIsoString();
    const mark: MarkInstance = {
      id: generateEntityId("mark_instance"),
      userId: input.userId,
      pathId: input.pathId,
      trailDayId: input.trailDayId,
      templateId: input.templateId ?? undefined,
      expeditionId: input.expeditionId ?? undefined,
      milestoneId: input.milestoneId ?? undefined,
      title: input.title,
      description: input.description ?? undefined,
      origin: input.origin,
      status: input.status,
      scheduledStartAt: input.scheduledStartAt ?? undefined,
      scheduledEndAt: input.scheduledEndAt ?? undefined,
      dueAt: input.dueAt ?? undefined,
      completedAt: input.completedAt ?? undefined,
      skippedAt: input.skippedAt ?? undefined,
      expiredAt: input.expiredAt ?? undefined,
      proofNote: input.proofNote ?? undefined,
      completionSummary: input.completionSummary ?? undefined,
      proofMediaAssetIds: input.proofMediaAssetIds ?? [],
      substitutedByMarkId: input.substitutedByMarkId ?? undefined,
      rescheduledToMarkId: input.rescheduledToMarkId ?? undefined,
      sourceBacklogItemId: input.sourceBacklogItemId ?? undefined,
      generationKey: input.generationKey ?? undefined,
      createdAt: now,
      updatedAt: now,
      syncVersion: 0,
    };

    await this.insertRow(WAYMARK_TABLES.markInstances, toMarkInstanceRow(mark));
    return mark;
  }

  async updateMarkInstance(markInstanceId: string, patch: UpdateMarkInstancePatch): Promise<MarkInstance> {
    const row = await this.getFirst<MarkInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markInstances} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      markInstanceId,
    );
    const current = this.assertFound(row, WAYMARK_TABLES.markInstances, markInstanceId);
    const entity = fromMarkInstanceRow(current);

      const updated: MarkInstance = this.nextUpdateMetadata({
        ...entity,
        pathId: patch.pathId ?? entity.pathId,
        templateId: patch.templateId === undefined ? entity.templateId : patch.templateId ?? undefined,
      expeditionId: patch.expeditionId === undefined ? entity.expeditionId : patch.expeditionId ?? undefined,
      milestoneId: patch.milestoneId === undefined ? entity.milestoneId : patch.milestoneId ?? undefined,
      title: patch.title ?? entity.title,
      description: patch.description === undefined ? entity.description : patch.description ?? undefined,
      origin: patch.origin ?? entity.origin,
      status: patch.status ?? entity.status,
      scheduledStartAt: patch.scheduledStartAt === undefined ? entity.scheduledStartAt : patch.scheduledStartAt ?? undefined,
      scheduledEndAt: patch.scheduledEndAt === undefined ? entity.scheduledEndAt : patch.scheduledEndAt ?? undefined,
      dueAt: patch.dueAt === undefined ? entity.dueAt : patch.dueAt ?? undefined,
      completedAt: patch.completedAt === undefined ? entity.completedAt : patch.completedAt ?? undefined,
      skippedAt: patch.skippedAt === undefined ? entity.skippedAt : patch.skippedAt ?? undefined,
      expiredAt: patch.expiredAt === undefined ? entity.expiredAt : patch.expiredAt ?? undefined,
      proofNote: patch.proofNote === undefined ? entity.proofNote : patch.proofNote ?? undefined,
      completionSummary:
        patch.completionSummary === undefined ? entity.completionSummary : patch.completionSummary ?? undefined,
      substitutedByMarkId:
        patch.substitutedByMarkId === undefined ? entity.substitutedByMarkId : patch.substitutedByMarkId ?? undefined,
      rescheduledToMarkId:
        patch.rescheduledToMarkId === undefined ? entity.rescheduledToMarkId : patch.rescheduledToMarkId ?? undefined,
        sourceBacklogItemId:
          patch.sourceBacklogItemId === undefined ? entity.sourceBacklogItemId : patch.sourceBacklogItemId ?? undefined,
        generationKey: patch.generationKey === undefined ? entity.generationKey : patch.generationKey ?? undefined,
        proofMediaAssetIds: patch.proofMediaAssetIds ?? entity.proofMediaAssetIds,
        deletedAt: undefined,
      });

    const updatedRow = this.toMutableUpdate(toMarkInstanceRow(updated));
    await this.updateRow(WAYMARK_TABLES.markInstances, updatedRow);
    return updated;
  }

  async getMarkInstanceById(markInstanceId: string): Promise<MarkInstance | null> {
    const row = await this.getFirst<MarkInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markInstances} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      markInstanceId,
    );
    return row ? fromMarkInstanceRow(row) : null;
  }

  async listPredecessorMarkInstances(markInstanceId: string): Promise<MarkInstance[]> {
    const rows = await this.getAll<MarkInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markInstances}
       WHERE (substituted_by_mark_id = ? OR rescheduled_to_mark_id = ?)
         AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      markInstanceId,
      markInstanceId,
    );
    return rows.map(fromMarkInstanceRow);
  }

  async listMarkInstancesByTrailDay(trailDayId: string): Promise<MarkInstance[]> {
    const rows = await this.getAll<MarkInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markInstances}
       WHERE trail_day_id = ? AND deleted_at IS NULL
       ORDER BY scheduled_start_at ASC, created_at ASC;`,
      trailDayId,
    );
    return rows.map(fromMarkInstanceRow);
  }

  async listMarkInstancesByDate(userId: string, localDate: string): Promise<MarkInstance[]> {
    const rows = await this.getAll<MarkInstanceRow>(
      `SELECT mi.*
       FROM ${WAYMARK_TABLES.markInstances} mi
       INNER JOIN ${WAYMARK_TABLES.trailDays} td ON td.id = mi.trail_day_id
       WHERE td.user_id = ? AND td.local_date = ? AND mi.deleted_at IS NULL AND td.deleted_at IS NULL
       ORDER BY mi.scheduled_start_at ASC, mi.created_at ASC;`,
      userId,
      localDate,
    );
    return rows.map(fromMarkInstanceRow);
  }

  async listMarkInstancesByExpedition(expeditionId: string): Promise<MarkInstance[]> {
    const rows = await this.getAll<MarkInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markInstances}
       WHERE expedition_id = ? AND deleted_at IS NULL
       ORDER BY scheduled_start_at ASC, created_at ASC;`,
      expeditionId,
    );
    return rows.map(fromMarkInstanceRow);
  }

  async listMarkInstancesByMilestone(milestoneId: string): Promise<MarkInstance[]> {
    const rows = await this.getAll<MarkInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markInstances}
       WHERE milestone_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      milestoneId,
    );
    return rows.map(fromMarkInstanceRow);
  }

  async listMarkInstancesByTemplate(templateId: string, range?: MarkTemplateRange): Promise<MarkInstance[]> {
    const clauses = [`template_id = ?`, `deleted_at IS NULL`];
    const params: unknown[] = [templateId];

    if (range?.startDate) {
      clauses.push(
        `trail_day_id IN (SELECT id FROM ${WAYMARK_TABLES.trailDays} WHERE local_date >= ? AND deleted_at IS NULL)`,
      );
      params.push(range.startDate);
    }
    if (range?.endDate) {
      clauses.push(
        `trail_day_id IN (SELECT id FROM ${WAYMARK_TABLES.trailDays} WHERE local_date <= ? AND deleted_at IS NULL)`,
      );
      params.push(range.endDate);
    }

    const rows = await this.getAll<MarkInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markInstances} WHERE ${clauses.join(" AND ")} ORDER BY created_at ASC;`,
      ...params,
    );
    return rows.map(fromMarkInstanceRow);
  }

  async findMarkInstanceByGenerationKey(userId: string, generationKey: string): Promise<MarkInstance | null> {
    const row = await this.getFirst<MarkInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markInstances}
       WHERE user_id = ? AND generation_key = ? AND deleted_at IS NULL
       LIMIT 1;`,
      userId,
      generationKey,
    );
    return row ? fromMarkInstanceRow(row) : null;
  }

  async softDeleteMarkInstance(markInstanceId: string): Promise<void> {
    const row = await this.getFirst<MarkInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markInstances} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      markInstanceId,
    );
    if (!row) {
      return;
    }

    const deletedRow = this.toMutableDelete(row);
    await this.updateRow(WAYMARK_TABLES.markInstances, deletedRow);
  }
}

export class SQLiteExpeditionRepository extends SQLiteStubRepository implements ExpeditionRepository {
  async createExpedition(input: CreateExpeditionInput): Promise<Expedition> {
    const pathExists = await this.activeRecordExists(WAYMARK_TABLES.paths, input.pathId);
    if (!pathExists) {
      this.validation("Expedition requires an existing Path.");
    }

    const created = this.nextCreateMetadata<Expedition>({
      id: generateEntityId("expedition"),
      userId: input.userId,
      pathId: input.pathId,
      title: input.title,
      description: input.description ?? undefined,
      status: input.status,
      sortOrder: input.sortOrder,
      startDate: input.startDate ?? undefined,
      targetDate: input.targetDate ?? undefined,
      startedAt: input.startedAt ?? undefined,
      targetEndAt: input.targetEndAt ?? undefined,
      completedAt: input.completedAt ?? undefined,
      heroMediaAssetId: input.heroMediaAssetId ?? undefined,
      createdAt: this.getNowIsoString(),
      updatedAt: this.getNowIsoString(),
      syncVersion: 0,
    });
    await this.insertRow(WAYMARK_TABLES.expeditions, toExpeditionRow(created));
    return created;
  }

  async updateExpedition(expeditionId: string, patch: UpdateExpeditionPatch): Promise<Expedition> {
    const row = await this.getActiveRowById<ExpeditionRow>(WAYMARK_TABLES.expeditions, expeditionId);
    const current = this.assertFound(row, WAYMARK_TABLES.expeditions, expeditionId);
    const entity = fromExpeditionRow(current);

    const updated = this.nextUpdateMetadata<Expedition>({
      ...entity,
      title: patch.title ?? entity.title,
      description: patch.description === undefined ? entity.description : patch.description ?? undefined,
      status: patch.status ?? entity.status,
      sortOrder: patch.sortOrder ?? entity.sortOrder,
      startDate: patch.startDate === undefined ? entity.startDate : patch.startDate ?? undefined,
      targetDate: patch.targetDate === undefined ? entity.targetDate : patch.targetDate ?? undefined,
      startedAt: patch.startedAt === undefined ? entity.startedAt : patch.startedAt ?? undefined,
      targetEndAt: patch.targetEndAt === undefined ? entity.targetEndAt : patch.targetEndAt ?? undefined,
      completedAt: patch.completedAt === undefined ? entity.completedAt : patch.completedAt ?? undefined,
      heroMediaAssetId:
        patch.heroMediaAssetId === undefined ? entity.heroMediaAssetId : patch.heroMediaAssetId ?? undefined,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toExpeditionRow(updated));
    await this.updateRow(WAYMARK_TABLES.expeditions, updatedRow);
    return updated;
  }

  async getExpeditionById(id: string): Promise<Expedition | null> {
    const row = await this.getActiveRowById<ExpeditionRow>(WAYMARK_TABLES.expeditions, id);
    return row ? fromExpeditionRow(row) : null;
  }

  async listExpeditionsByPath(pathId: string): Promise<{ items: Expedition[]; nextCursor?: string }> {
    const rows = await this.getAll<ExpeditionRow>(
      `SELECT * FROM ${WAYMARK_TABLES.expeditions}
       WHERE path_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC;`,
      pathId,
    );
    return { items: rows.map(fromExpeditionRow) };
  }

  async listMilestonesByExpedition(expeditionId: string): Promise<Milestone[]> {
    const rows = await this.getAll<MilestoneRow>(
      `SELECT * FROM ${WAYMARK_TABLES.milestones}
       WHERE expedition_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, order_index ASC, created_at ASC;`,
      expeditionId,
    );
    return rows.map(fromMilestoneRow);
  }

  async createMilestone(input: CreateMilestoneInput): Promise<Milestone> {
    const expeditionExists = await this.activeRecordExists(WAYMARK_TABLES.expeditions, input.expeditionId);
    if (!expeditionExists) {
      this.validation("Milestone requires an existing Expedition.");
    }

    const created = this.nextCreateMetadata<Milestone>({
      id: generateEntityId("milestone"),
      userId: input.userId,
      expeditionId: input.expeditionId,
      title: input.title,
      description: input.description ?? undefined,
      status: input.status,
      startDate: input.startDate ?? undefined,
      targetDate: input.targetDate ?? undefined,
      sortOrder: input.sortOrder,
      orderIndex: input.orderIndex,
      completedAt: input.completedAt ?? undefined,
      createdAt: this.getNowIsoString(),
      updatedAt: this.getNowIsoString(),
      syncVersion: 0,
    });
    await this.insertRow(WAYMARK_TABLES.milestones, toMilestoneRow(created));
    return created;
  }

  async updateMilestone(milestoneId: string, patch: UpdateMilestonePatch): Promise<Milestone> {
    const row = await this.getActiveRowById<MilestoneRow>(WAYMARK_TABLES.milestones, milestoneId);
    const current = this.assertFound(row, WAYMARK_TABLES.milestones, milestoneId);
    const entity = fromMilestoneRow(current);

    const updated = this.nextUpdateMetadata<Milestone>({
      ...entity,
      title: patch.title ?? entity.title,
      description: patch.description === undefined ? entity.description : patch.description ?? undefined,
      status: patch.status ?? entity.status,
      startDate: patch.startDate === undefined ? entity.startDate : patch.startDate ?? undefined,
      targetDate: patch.targetDate === undefined ? entity.targetDate : patch.targetDate ?? undefined,
      sortOrder: patch.sortOrder ?? entity.sortOrder,
      orderIndex: patch.orderIndex ?? entity.orderIndex,
      completedAt: patch.completedAt === undefined ? entity.completedAt : patch.completedAt ?? undefined,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toMilestoneRow(updated));
    await this.updateRow(WAYMARK_TABLES.milestones, updatedRow);
    return updated;
  }
}

export class SQLitePackCheckRepository extends SQLiteStubRepository implements PackCheckRepository {
  async getTemplateById(id: string): Promise<PackCheckTemplate | null> {
    const row = await this.getActiveRowById<PackCheckTemplateRow>(WAYMARK_TABLES.packCheckTemplates, id);
    return row ? fromPackCheckTemplateRow(row) : null;
  }

  async listTemplatesByPath(pathId: string): Promise<PackCheckTemplate[]> {
    const rows = await this.getAll<PackCheckTemplateRow>(
      `SELECT * FROM ${WAYMARK_TABLES.packCheckTemplates}
       WHERE path_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      pathId,
    );
    return rows.map(fromPackCheckTemplateRow);
  }

  async listItemTemplates(templateId: string): Promise<PackCheckItemTemplate[]> {
    const rows = await this.getAll<PackCheckItemTemplateRow>(
      `SELECT * FROM ${WAYMARK_TABLES.packCheckItemTemplates}
       WHERE pack_check_template_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, order_index ASC, created_at ASC;`,
      templateId,
    );
    return rows.map(fromPackCheckItemTemplateRow);
  }

  async listMarkPackCheckRulesForMarkTemplate(markTemplateId: string): Promise<MarkPackCheckRule[]> {
    const rows = await this.getAll<MarkPackCheckRuleRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markPackCheckRules}
       WHERE mark_template_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      markTemplateId,
    );
    return rows.map(fromMarkPackCheckRuleRow);
  }

  async listMarkPackCheckRulesForPackCheckTemplate(packCheckTemplateId: string): Promise<MarkPackCheckRule[]> {
    const rows = await this.getAll<MarkPackCheckRuleRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markPackCheckRules}
       WHERE pack_check_template_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      packCheckTemplateId,
    );
    return rows.map(fromMarkPackCheckRuleRow);
  }

  async upsertTemplate(template: PackCheckTemplate): Promise<PackCheckTemplate> {
    if (template.pathId) {
      const pathExists = await this.activeRecordExists(WAYMARK_TABLES.paths, template.pathId);
      if (!pathExists) {
        this.validation("PackCheckTemplate pathId must reference an existing Path when provided.");
      }
    }

    const existing = template.id
      ? await this.getFirst<PackCheckTemplateRow>(`SELECT * FROM ${WAYMARK_TABLES.packCheckTemplates} WHERE id = ? LIMIT 1;`, template.id)
      : null;

    if (!existing) {
      const created = this.nextCreateMetadata<PackCheckTemplate>({
        ...template,
        id: template.id || generateEntityId("pack_check_template"),
      });
      await this.insertRow(WAYMARK_TABLES.packCheckTemplates, toPackCheckTemplateRow(created));
      return created;
    }

    const current = fromPackCheckTemplateRow(existing);
    const updated = this.nextUpdateMetadata<PackCheckTemplate>({
      ...current,
      pathId: template.pathId === undefined ? current.pathId : template.pathId,
      title: template.title,
      description: template.description,
      defaultAvailableOffsetMin: template.defaultAvailableOffsetMin,
      defaultDueOffsetMin: template.defaultDueOffsetMin,
      defaultSignalRule: template.defaultSignalRule,
      isActive: template.isActive,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toPackCheckTemplateRow(updated));
    updatedRow.deleted_at = null;
    await this.updateRow(WAYMARK_TABLES.packCheckTemplates, updatedRow);
    return updated;
  }

  async upsertItemTemplates(items: PackCheckItemTemplate[]): Promise<PackCheckItemTemplate[]> {
    if (items.length === 0) {
      return [];
    }

    return this.withAtomicWrite(async (executor) => {
      const templateIds = [...new Set(items.map((item) => item.packCheckTemplateId))];
      const templateRows = await this.getAllFromExecutor<PackCheckTemplateRow>(
        executor,
        `SELECT * FROM ${WAYMARK_TABLES.packCheckTemplates}
         WHERE id IN (${asArrayParams(templateIds)}) AND deleted_at IS NULL;`,
        ...templateIds,
      );
      if (templateRows.length !== templateIds.length) {
        this.validation("PackCheckItemTemplate upsert requires existing PackCheckTemplates.");
      }

      const userIdByTemplateId = new Map(templateRows.map((row) => [row.id, row.user_id]));
      const results: PackCheckItemTemplate[] = [];

      for (const item of items) {
        const userId = userIdByTemplateId.get(item.packCheckTemplateId);
        if (!userId) {
          this.validation("PackCheckItemTemplate upsert could not resolve parent template owner.");
        }

        const existing = item.id
          ? await this.getFirstFromExecutor<PackCheckItemTemplateRow>(
              executor,
              `SELECT * FROM ${WAYMARK_TABLES.packCheckItemTemplates} WHERE id = ? LIMIT 1;`,
              item.id,
            )
          : null;

        if (!existing) {
          const created = this.nextCreateMetadata<PackCheckItemTemplate>({
            ...item,
            id: item.id || generateEntityId("pack_check_item_template"),
          });
          await this.insertRowWithExecutor(executor, WAYMARK_TABLES.packCheckItemTemplates, toPackCheckItemTemplateRow(created, userId));
          results.push(created);
          continue;
        }

        const current = fromPackCheckItemTemplateRow(existing);
        const updated = this.nextUpdateMetadata<PackCheckItemTemplate>({
          ...current,
          packCheckTemplateId: item.packCheckTemplateId,
          label: item.label,
          isRequired: item.isRequired,
          orderIndex: item.orderIndex,
          deletedAt: undefined,
        });
        const updatedRow = this.toMutableUpdate(toPackCheckItemTemplateRow(updated, userId));
        updatedRow.deleted_at = null;
        await this.updateRowWithExecutor(executor, WAYMARK_TABLES.packCheckItemTemplates, updatedRow);
        results.push(updated);
      }

      return results;
    });
  }

  async upsertMarkPackCheckRules(items: MarkPackCheckRule[]): Promise<MarkPackCheckRule[]> {
    if (items.length === 0) {
      return [];
    }

    return this.withAtomicWrite(async (executor) => {
      const markTemplateIds = [...new Set(items.map((item) => item.markTemplateId))];
      const markTemplateRows = await this.getAllFromExecutor<MarkTemplateRow>(
        executor,
        `SELECT id, user_id FROM ${WAYMARK_TABLES.markTemplates}
         WHERE id IN (${asArrayParams(markTemplateIds)}) AND deleted_at IS NULL;`,
        ...markTemplateIds,
      );
      if (markTemplateRows.length !== markTemplateIds.length) {
        this.validation("MarkPackCheckRule upsert requires existing MarkTemplates.");
      }

      const templateIds = [...new Set(items.map((item) => item.packCheckTemplateId))];
      const packCheckTemplateRows = await this.getAllFromExecutor<PackCheckTemplateRow>(
        executor,
        `SELECT id FROM ${WAYMARK_TABLES.packCheckTemplates}
         WHERE id IN (${asArrayParams(templateIds)}) AND deleted_at IS NULL;`,
        ...templateIds,
      );
      if (packCheckTemplateRows.length !== templateIds.length) {
        this.validation("MarkPackCheckRule upsert requires existing PackCheckTemplates.");
      }

      const userIdByMarkTemplate = new Map(markTemplateRows.map((row) => [row.id, row.user_id]));
      const results: MarkPackCheckRule[] = [];

      for (const item of items) {
        const userId = userIdByMarkTemplate.get(item.markTemplateId);
        if (!userId) {
          this.validation("MarkPackCheckRule upsert could not resolve MarkTemplate owner.");
        }

        const existing = item.id
          ? await this.getFirstFromExecutor<MarkPackCheckRuleRow>(
              executor,
              `SELECT * FROM ${WAYMARK_TABLES.markPackCheckRules} WHERE id = ? LIMIT 1;`,
              item.id,
            )
          : null;

        if (!existing) {
          const created = this.nextCreateMetadata<MarkPackCheckRule>({
            ...item,
            id: item.id || generateEntityId("mark_pack_check_rule"),
          });
          await this.insertRowWithExecutor(executor, WAYMARK_TABLES.markPackCheckRules, toMarkPackCheckRuleRow(created, userId));
          results.push(created);
          continue;
        }

        const current = fromMarkPackCheckRuleRow(existing);
        const updated = this.nextUpdateMetadata<MarkPackCheckRule>({
          ...current,
          markTemplateId: item.markTemplateId,
          packCheckTemplateId: item.packCheckTemplateId,
          availableOffsetMin: item.availableOffsetMin,
          dueOffsetMin: item.dueOffsetMin,
          deletedAt: undefined,
        });
        const updatedRow = this.toMutableUpdate(toMarkPackCheckRuleRow(updated, userId));
        updatedRow.deleted_at = null;
        await this.updateRowWithExecutor(executor, WAYMARK_TABLES.markPackCheckRules, updatedRow);
        results.push(updated);
      }

      return results;
    });
  }

  async getInstanceById(id: string): Promise<PackCheckInstance | null> {
    const row = await this.getActiveRowById<PackCheckInstanceRow>(WAYMARK_TABLES.packCheckInstances, id);
    return row ? fromPackCheckInstanceRow(row) : null;
  }

  async listInstancesByTrailDay(trailDayId: string): Promise<PackCheckInstance[]> {
    const rows = await this.getAll<PackCheckInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.packCheckInstances}
       WHERE trail_day_id = ? AND deleted_at IS NULL
       ORDER BY available_from ASC, created_at ASC;`,
      trailDayId,
    );
    return rows.map(fromPackCheckInstanceRow);
  }

  async listInstancesByTargetMark(markInstanceId: string): Promise<PackCheckInstance[]> {
    const rows = await this.getAll<PackCheckInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.packCheckInstances}
       WHERE target_mark_instance_id = ? AND deleted_at IS NULL
       ORDER BY available_from ASC, created_at ASC;`,
      markInstanceId,
    );
    return rows.map(fromPackCheckInstanceRow);
  }

  async listItemInstances(packCheckInstanceId: string): Promise<PackCheckItemInstance[]> {
    const rows = await this.getAll<PackCheckItemInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.packCheckItemInstances}
       WHERE pack_check_instance_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, order_index ASC, created_at ASC;`,
      packCheckInstanceId,
    );
    return rows.map(fromPackCheckItemInstanceRow);
  }

  async findInstanceByGenerationKey(userId: string, generationKey: string): Promise<PackCheckInstance | null> {
    const row = await this.getFirst<PackCheckInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.packCheckInstances}
       WHERE user_id = ? AND generation_key = ? AND deleted_at IS NULL
       LIMIT 1;`,
      userId,
      generationKey,
    );
    return row ? fromPackCheckInstanceRow(row) : null;
  }

  async upsertInstance(instance: PackCheckInstance): Promise<PackCheckInstance> {
    const trailDayExists = await this.activeRecordExists(WAYMARK_TABLES.trailDays, instance.trailDayId);
    if (!trailDayExists) {
      this.validation("PackCheckInstance requires an existing TrailDay.");
    }
    if (instance.templateId) {
      const templateExists = await this.activeRecordExists(WAYMARK_TABLES.packCheckTemplates, instance.templateId);
      if (!templateExists) {
        this.validation("PackCheckInstance templateId must reference an existing PackCheckTemplate when provided.");
      }
    }
    if (instance.targetMarkInstanceId) {
      const markExists = await this.activeRecordExists(WAYMARK_TABLES.markInstances, instance.targetMarkInstanceId);
      if (!markExists) {
        this.validation("PackCheckInstance targetMarkInstanceId must reference an existing MarkInstance when provided.");
      }
    }

    const existing = instance.id
      ? await this.getFirst<PackCheckInstanceRow>(`SELECT * FROM ${WAYMARK_TABLES.packCheckInstances} WHERE id = ? LIMIT 1;`, instance.id)
      : null;
    if (!existing) {
      const created = this.nextCreateMetadata<PackCheckInstance>({
        ...instance,
        id: instance.id || generateEntityId("pack_check_instance"),
      });
      await this.insertRow(WAYMARK_TABLES.packCheckInstances, toPackCheckInstanceRow(created));
      return created;
    }

    const current = fromPackCheckInstanceRow(existing);
    const updated = this.nextUpdateMetadata<PackCheckInstance>({
      ...current,
      templateId: instance.templateId === undefined ? current.templateId : instance.templateId,
      trailDayId: instance.trailDayId,
      targetMarkInstanceId:
        instance.targetMarkInstanceId === undefined ? current.targetMarkInstanceId : instance.targetMarkInstanceId,
      title: instance.title,
      description: instance.description,
      status: instance.status,
      availableFrom: instance.availableFrom,
      dueAt: instance.dueAt,
      completedAt: instance.completedAt,
      skippedAt: instance.skippedAt,
      cancelledAt: instance.cancelledAt,
      generationKey: instance.generationKey,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toPackCheckInstanceRow(updated));
    updatedRow.deleted_at = null;
    await this.updateRow(WAYMARK_TABLES.packCheckInstances, updatedRow);
    return updated;
  }

  async upsertItemInstances(items: PackCheckItemInstance[]): Promise<PackCheckItemInstance[]> {
    if (items.length === 0) {
      return [];
    }

    return this.withAtomicWrite(async (executor) => {
      const instanceIds = [...new Set(items.map((item) => item.packCheckInstanceId))];
      const instanceRows = await this.getAllFromExecutor<PackCheckInstanceRow>(
        executor,
        `SELECT * FROM ${WAYMARK_TABLES.packCheckInstances}
         WHERE id IN (${asArrayParams(instanceIds)}) AND deleted_at IS NULL;`,
        ...instanceIds,
      );
      if (instanceRows.length !== instanceIds.length) {
        this.validation("PackCheckItemInstance upsert requires existing PackCheckInstances.");
      }

      const userIdByInstanceId = new Map(instanceRows.map((row) => [row.id, row.user_id]));
      const results: PackCheckItemInstance[] = [];

      for (const item of items) {
        const userId = userIdByInstanceId.get(item.packCheckInstanceId);
        if (!userId) {
          this.validation("PackCheckItemInstance upsert could not resolve parent instance owner.");
        }

        const existing = item.id
          ? await this.getFirstFromExecutor<PackCheckItemInstanceRow>(
              executor,
              `SELECT * FROM ${WAYMARK_TABLES.packCheckItemInstances} WHERE id = ? LIMIT 1;`,
              item.id,
            )
          : null;

        if (!existing) {
          const created = this.nextCreateMetadata<PackCheckItemInstance>({
            ...item,
            id: item.id || generateEntityId("pack_check_item_instance"),
          });
          await this.insertRowWithExecutor(executor, WAYMARK_TABLES.packCheckItemInstances, toPackCheckItemInstanceRow(created, userId));
          results.push(created);
          continue;
        }

        const current = fromPackCheckItemInstanceRow(existing);
        const updated = this.nextUpdateMetadata<PackCheckItemInstance>({
          ...current,
          packCheckInstanceId: item.packCheckInstanceId,
          templateItemId: item.templateItemId === undefined ? current.templateItemId : item.templateItemId,
          label: item.label,
          isRequired: item.isRequired,
          isChecked: item.isChecked,
          checkedAt: item.checkedAt,
          orderIndex: item.orderIndex,
          deletedAt: undefined,
        });
        const updatedRow = this.toMutableUpdate(toPackCheckItemInstanceRow(updated, userId));
        updatedRow.deleted_at = null;
        await this.updateRowWithExecutor(executor, WAYMARK_TABLES.packCheckItemInstances, updatedRow);
        results.push(updated);
      }

      return results;
    });
  }

  async softDeleteInstance(id: string): Promise<void> {
    await this.withAtomicWrite(async (executor) => {
      const row = await executor.getFirstAsync<PackCheckInstanceRow>(
        `SELECT * FROM ${WAYMARK_TABLES.packCheckInstances} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
        id,
      );
      if (!row) {
        return;
      }

      const deletedRow = this.toMutableDelete(row);
      await executor.runAsync(
        `UPDATE ${WAYMARK_TABLES.packCheckInstances}
         SET updated_at = ?, deleted_at = ?, sync_status = ?, local_revision = ?
         WHERE id = ?;`,
        deletedRow.updated_at,
        deletedRow.deleted_at,
        deletedRow.sync_status,
        deletedRow.local_revision,
        id,
      );

      const itemRows = await executor.getAllAsync<PackCheckItemInstanceRow>(
        `SELECT * FROM ${WAYMARK_TABLES.packCheckItemInstances}
         WHERE pack_check_instance_id = ? AND deleted_at IS NULL;`,
        id,
      );

      for (const itemRow of itemRows) {
        const deletedItemRow = this.toMutableDelete(itemRow);
        await executor.runAsync(
          `UPDATE ${WAYMARK_TABLES.packCheckItemInstances}
           SET updated_at = ?, deleted_at = ?, sync_status = ?, local_revision = ?
           WHERE id = ?;`,
          deletedItemRow.updated_at,
          deletedItemRow.deleted_at,
          deletedItemRow.sync_status,
          deletedItemRow.local_revision,
          itemRow.id,
        );
      }
    });
  }
}

export class SQLiteSignalRepository extends SQLiteStubRepository implements SignalRepository {
  private async validateTarget(targetType: SignalTargetType, targetId: string): Promise<void> {
    switch (targetType) {
      case SignalTargetType.MarkInstance: {
        if (!(await this.activeRecordExists(WAYMARK_TABLES.markInstances, targetId))) {
          throw new UnsupportedPolymorphicReferenceRepositoryError(
            `Signal target ${targetType}:${targetId} does not exist.`,
          );
        }
        return;
      }
      case SignalTargetType.PackCheckInstance: {
        if (!(await this.activeRecordExists(WAYMARK_TABLES.packCheckInstances, targetId))) {
          throw new UnsupportedPolymorphicReferenceRepositoryError(
            `Signal target ${targetType}:${targetId} does not exist.`,
          );
        }
        return;
      }
      case SignalTargetType.TrailDay: {
        if (!(await this.activeRecordExists(WAYMARK_TABLES.trailDays, targetId))) {
          throw new UnsupportedPolymorphicReferenceRepositoryError(
            `Signal target ${targetType}:${targetId} does not exist.`,
          );
        }
        return;
      }
      default:
        throw new UnsupportedPolymorphicReferenceRepositoryError(`Unsupported signal target type ${targetType} for ${targetId}.`);
    }
  }

  async getSignalById(signalId: string): Promise<Signal | null> {
    const row = await this.getActiveRowById<SignalRow>(WAYMARK_TABLES.signals, signalId);
    return row ? fromSignalRow(row) : null;
  }

  async listSignalsByTarget(targetType: SignalTargetType, targetId: string): Promise<Signal[]> {
    const rows = await this.getAll<SignalRow>(
      `SELECT * FROM ${WAYMARK_TABLES.signals}
       WHERE target_type = ? AND target_id = ? AND deleted_at IS NULL
       ORDER BY scheduled_at ASC, created_at ASC;`,
      targetType,
      targetId,
    );
    return rows.map(fromSignalRow);
  }

  async listSignalsByStatus(statuses: SignalStatus[]): Promise<{ items: Signal[]; nextCursor?: string }> {
    if (statuses.length === 0) {
      return { items: [] };
    }

    const rows = await this.getAll<SignalRow>(
      `SELECT * FROM ${WAYMARK_TABLES.signals}
       WHERE status IN (${asArrayParams(statuses)}) AND deleted_at IS NULL
       ORDER BY scheduled_at ASC, created_at ASC;`,
      ...statuses,
    );
    return { items: rows.map(fromSignalRow) };
  }

  async createSignal(input: CreateSignalInput): Promise<Signal> {
    await this.validateTarget(input.targetType, input.targetId);

    const created = this.nextCreateMetadata<Signal>({
      id: generateEntityId("signal"),
      userId: input.userId,
      targetType: input.targetType,
      targetId: input.targetId,
      scheduledAt: input.scheduledAt,
      status: input.status,
      ringingStartedAt: input.ringingStartedAt ?? undefined,
      snoozedUntil: input.snoozedUntil ?? undefined,
      resolvedAt: input.resolvedAt ?? undefined,
      dismissedAt: input.dismissedAt ?? undefined,
      expiredAt: input.expiredAt ?? undefined,
      cancelledAt: input.cancelledAt ?? undefined,
      createdAt: this.getNowIsoString(),
      updatedAt: this.getNowIsoString(),
      syncVersion: 0,
    });
    await this.insertRow(WAYMARK_TABLES.signals, toSignalRow(created));
    return created;
  }

  async updateSignal(signalId: string, patch: UpdateSignalPatch): Promise<Signal> {
    const row = await this.getActiveRowById<SignalRow>(WAYMARK_TABLES.signals, signalId);
    const current = this.assertFound(row, WAYMARK_TABLES.signals, signalId);
    const entity = fromSignalRow(current);

    const updated = this.nextUpdateMetadata<Signal>({
      ...entity,
      scheduledAt: patch.scheduledAt ?? entity.scheduledAt,
      status: patch.status ?? entity.status,
      ringingStartedAt:
        patch.ringingStartedAt === undefined ? entity.ringingStartedAt : patch.ringingStartedAt ?? undefined,
      snoozedUntil: patch.snoozedUntil === undefined ? entity.snoozedUntil : patch.snoozedUntil ?? undefined,
      resolvedAt: patch.resolvedAt === undefined ? entity.resolvedAt : patch.resolvedAt ?? undefined,
      dismissedAt: patch.dismissedAt === undefined ? entity.dismissedAt : patch.dismissedAt ?? undefined,
      expiredAt: patch.expiredAt === undefined ? entity.expiredAt : patch.expiredAt ?? undefined,
      cancelledAt: patch.cancelledAt === undefined ? entity.cancelledAt : patch.cancelledAt ?? undefined,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toSignalRow(updated));
    await this.updateRow(WAYMARK_TABLES.signals, updatedRow);
    return updated;
  }
}

export class SQLiteMemoryRepository extends SQLiteStubRepository implements MemoryRepository {
  async createMemory(input: CreateMemoryInput): Promise<Memory> {
    const trailDayExists = await this.activeRecordExists(WAYMARK_TABLES.trailDays, input.trailDayId);
    if (!trailDayExists) {
      this.validation("Memory requires an existing TrailDay.");
    }

    if (input.pathId) {
      const pathExists = await this.activeRecordExists(WAYMARK_TABLES.paths, input.pathId);
      if (!pathExists) {
        this.validation("Memory pathId must reference an existing Path when provided.");
      }
    }

    const created = this.nextCreateMetadata<Memory>({
      id: generateEntityId("memory"),
      userId: input.userId,
      trailDayId: input.trailDayId,
      pathId: input.pathId ?? undefined,
      title: input.title,
      note: input.note ?? undefined,
      capturedAt: input.capturedAt,
      privacy: input.privacy,
      location: input.location,
      mediaAssetIds: input.mediaAssetIds ?? [],
      createdAt: this.getNowIsoString(),
      updatedAt: this.getNowIsoString(),
      syncVersion: 0,
    });
    await this.insertRow(WAYMARK_TABLES.memories, toMemoryRow(created));
    return created;
  }

  async updateMemory(memoryId: string, patch: UpdateMemoryPatch): Promise<Memory> {
    const row = await this.getActiveRowById<MemoryRow>(WAYMARK_TABLES.memories, memoryId);
    const current = this.assertFound(row, WAYMARK_TABLES.memories, memoryId);
    const entity = fromMemoryRow(current);

    if (patch.pathId && patch.pathId !== entity.pathId) {
      const pathExists = await this.activeRecordExists(WAYMARK_TABLES.paths, patch.pathId);
      if (!pathExists) {
        this.validation("Memory pathId must reference an existing Path when provided.");
      }
    }

    const updated = this.nextUpdateMetadata<Memory>({
      ...entity,
      pathId: patch.pathId === undefined ? entity.pathId : patch.pathId ?? undefined,
      title: patch.title ?? entity.title,
      note: patch.note === undefined ? entity.note : patch.note ?? undefined,
      capturedAt: patch.capturedAt ?? entity.capturedAt,
      privacy: patch.privacy ?? entity.privacy,
      location: patch.location === undefined ? entity.location : patch.location,
      mediaAssetIds: patch.mediaAssetIds ?? entity.mediaAssetIds,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toMemoryRow(updated));
    await this.updateRow(WAYMARK_TABLES.memories, updatedRow);
    return updated;
  }

  async getMemoryById(memoryId: string): Promise<Memory | null> {
    const row = await this.getActiveRowById<MemoryRow>(WAYMARK_TABLES.memories, memoryId);
    return row ? fromMemoryRow(row) : null;
  }

  async listMemoriesByTrailDay(trailDayId: string): Promise<Memory[]> {
    const rows = await this.getAll<MemoryRow>(
      `SELECT * FROM ${WAYMARK_TABLES.memories}
       WHERE trail_day_id = ? AND deleted_at IS NULL
       ORDER BY captured_at ASC, created_at ASC;`,
      trailDayId,
    );
    return rows.map(fromMemoryRow);
  }

  async softDeleteMemory(memoryId: string): Promise<void> {
    const row = await this.getFirst<MemoryRow>(
      `SELECT * FROM ${WAYMARK_TABLES.memories} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      memoryId,
    );
    if (!row) {
      return;
    }

    await this.updateRow(WAYMARK_TABLES.memories, this.toMutableDelete(row));
  }
}

export class SQLiteBacklogRepository extends SQLiteStubRepository implements BacklogRepository {
  async getById(id: string): Promise<BacklogItem | null> {
    const row = await this.getActiveRowById<BacklogItemRow>(WAYMARK_TABLES.backlogItems, id);
    return row ? fromBacklogItemRow(row) : null;
  }

  async listActiveBacklogItems(userId: string): Promise<BacklogItem[]> {
    const rows = await this.getAll<BacklogItemRow>(
      `SELECT * FROM ${WAYMARK_TABLES.backlogItems}
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC;`,
      userId,
    );
    return rows.map(fromBacklogItemRow);
  }

  async listByPath(pathId: string): Promise<{ items: BacklogItem[]; nextCursor?: string }> {
    const rows = await this.getAll<BacklogItemRow>(
      `SELECT * FROM ${WAYMARK_TABLES.backlogItems}
       WHERE path_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      pathId,
    );
    return { items: rows.map(fromBacklogItemRow) };
  }

  async upsert(item: BacklogItem): Promise<BacklogItem> {
    if (item.pathId) {
      const pathExists = await this.activeRecordExists(WAYMARK_TABLES.paths, item.pathId);
      if (!pathExists) {
        this.validation("BacklogItem pathId must reference an existing Path when provided.");
      }
    }

    const existing = item.id ? await this.getFirst<BacklogItemRow>(`SELECT * FROM ${WAYMARK_TABLES.backlogItems} WHERE id = ? LIMIT 1;`, item.id) : null;
    if (!existing) {
      const created = this.nextCreateMetadata<BacklogItem>({
        ...item,
        id: item.id || generateEntityId("backlog_item"),
      });
      await this.insertRow(WAYMARK_TABLES.backlogItems, toBacklogItemRow(created));
      return created;
    }

    const current = fromBacklogItemRow(existing);
    const updated = this.nextUpdateMetadata<BacklogItem>({
      ...current,
      pathId: item.pathId === undefined ? current.pathId : item.pathId,
      title: item.title,
      description: item.description,
      itemType: item.itemType,
      horizon: item.horizon,
      status: item.status,
      horizonLabel: item.horizonLabel,
      convertedToMarkInstanceId: item.convertedToMarkInstanceId,
      convertedToExpeditionId: item.convertedToExpeditionId,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toBacklogItemRow(updated));
    updatedRow.deleted_at = null;
    await this.updateRow(WAYMARK_TABLES.backlogItems, updatedRow);
    return updated;
  }

  async softDeleteBacklogItem(id: string): Promise<void> {
    const row = await this.getFirst<BacklogItemRow>(
      `SELECT * FROM ${WAYMARK_TABLES.backlogItems} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      id,
    );
    if (!row) {
      return;
    }

    await this.updateRow(WAYMARK_TABLES.backlogItems, this.toMutableDelete(row));
  }
}

export class SQLiteWeekPlanRepository extends SQLiteStubRepository implements WeekPlanRepository {
  async getById(id: string): Promise<WeekPlan | null> {
    const row = await this.getActiveRowById<WeekPlanRow>(WAYMARK_TABLES.weekPlans, id);
    return row ? fromWeekPlanRow(row) : null;
  }

  async getItemById(id: string): Promise<WeekPlanItem | null> {
    const row = await this.getActiveRowById<WeekPlanItemRow>(WAYMARK_TABLES.weekPlanItems, id);
    return row ? fromWeekPlanItemRow(row) : null;
  }

  async findActiveItemByCreatedMarkInstanceId(markInstanceId: string): Promise<WeekPlanItem | null> {
    const row = await this.getFirst<WeekPlanItemRow>(
      `SELECT wpi.*
       FROM ${WAYMARK_TABLES.weekPlanItems} wpi
       INNER JOIN ${WAYMARK_TABLES.weekPlans} wp ON wp.id = wpi.week_plan_id
       WHERE wpi.created_mark_instance_id = ?
         AND wpi.status <> ?
         AND wp.status = ?
         AND wpi.deleted_at IS NULL
         AND wp.deleted_at IS NULL
       ORDER BY wpi.created_at ASC
       LIMIT 1;`,
      markInstanceId,
      WeekPlanItemStatus.Removed,
      WeekPlanStatus.Active,
    );
    return row ? fromWeekPlanItemRow(row) : null;
  }

  async getByWeekStart(userId: string, weekStartDate: string): Promise<WeekPlan | null> {
    const row = await this.getFirst<WeekPlanRow>(
      `SELECT * FROM ${WAYMARK_TABLES.weekPlans}
       WHERE user_id = ? AND week_start_date = ? AND deleted_at IS NULL
       LIMIT 1;`,
      userId,
      weekStartDate,
    );
    return row ? fromWeekPlanRow(row) : null;
  }

  async listItems(weekPlanId: string): Promise<WeekPlanItem[]> {
    const rows = await this.getAll<WeekPlanItemRow>(
      `SELECT * FROM ${WAYMARK_TABLES.weekPlanItems}
       WHERE week_plan_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, order_index ASC, created_at ASC;`,
      weekPlanId,
    );
    return rows.map(fromWeekPlanItemRow);
  }

  async listItemsByExpedition(userId: string, expeditionId: string): Promise<WeekPlanItem[]> {
    const rows = await this.getAll<WeekPlanItemRow>(
      `SELECT wpi.*
       FROM ${WAYMARK_TABLES.weekPlanItems} wpi
       INNER JOIN ${WAYMARK_TABLES.weekPlans} wp ON wp.id = wpi.week_plan_id
       WHERE wp.user_id = ? AND wpi.expedition_id = ? AND wpi.deleted_at IS NULL AND wp.deleted_at IS NULL
       ORDER BY wpi.local_date ASC, wpi.start_time ASC, wpi.created_at ASC;`,
      userId,
      expeditionId,
    );
    return rows.map(fromWeekPlanItemRow);
  }

  async upsertWeekPlan(weekPlan: WeekPlan): Promise<WeekPlan> {
    const existing = weekPlan.id ? await this.getFirst<WeekPlanRow>(`SELECT * FROM ${WAYMARK_TABLES.weekPlans} WHERE id = ? LIMIT 1;`, weekPlan.id) : null;
    if (!existing) {
      const created = this.nextCreateMetadata<WeekPlan>({
        ...weekPlan,
        id: weekPlan.id || generateEntityId("week_plan"),
      });
      await this.insertRow(WAYMARK_TABLES.weekPlans, toWeekPlanRow(created));
      return created;
    }

    const current = fromWeekPlanRow(existing);
    const updated = this.nextUpdateMetadata<WeekPlan>({
      ...current,
      weekStartDate: weekPlan.weekStartDate,
      weekEndDate: weekPlan.weekEndDate,
      status: weekPlan.status,
      note: weekPlan.note,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toWeekPlanRow(updated));
    updatedRow.deleted_at = null;
    await this.updateRow(WAYMARK_TABLES.weekPlans, updatedRow);
    return updated;
  }

  async upsertItems(items: WeekPlanItem[]): Promise<WeekPlanItem[]> {
    if (items.length === 0) {
      return [];
    }

    return this.withAtomicWrite(async (executor) => {
      const weekPlanIds = [...new Set(items.map((item) => item.weekPlanId))];
      const backlogIds = [...new Set(items.map((item) => item.backlogItemId).filter((value): value is string => Boolean(value)))];

      const weekPlans = await this.getAllFromExecutor<WeekPlanRow>(
        executor,
        `SELECT * FROM ${WAYMARK_TABLES.weekPlans}
         WHERE id IN (${asArrayParams(weekPlanIds)}) AND deleted_at IS NULL;`,
        ...weekPlanIds,
      );
      if (weekPlans.length !== weekPlanIds.length) {
        this.validation("WeekPlanItem upsert requires existing WeekPlans.");
      }

      if (backlogIds.length > 0) {
        const backlogRows = await this.getAllFromExecutor<BacklogItemRow>(
          executor,
          `SELECT * FROM ${WAYMARK_TABLES.backlogItems}
           WHERE id IN (${asArrayParams(backlogIds)}) AND deleted_at IS NULL;`,
          ...backlogIds,
        );
        if (backlogRows.length !== backlogIds.length) {
          this.validation("WeekPlanItem upsert requires existing BacklogItems when backlogItemId is provided.");
        }
      }

      const userIdByWeekPlanId = new Map(weekPlans.map((row) => [row.id, row.user_id]));
      const results: WeekPlanItem[] = [];

      for (const item of items) {
        const userId = userIdByWeekPlanId.get(item.weekPlanId);
        if (!userId) {
          this.validation("WeekPlanItem upsert could not resolve parent WeekPlan owner.");
        }

        const existing = item.id
          ? await this.getFirstFromExecutor<WeekPlanItemRow>(
              executor,
              `SELECT * FROM ${WAYMARK_TABLES.weekPlanItems} WHERE id = ? LIMIT 1;`,
              item.id,
            )
          : null;

        if (!existing) {
          const created = this.nextCreateMetadata<WeekPlanItem>({
            ...item,
            id: item.id || generateEntityId("week_plan_item"),
          });
          await this.insertRowWithExecutor(executor, WAYMARK_TABLES.weekPlanItems, toWeekPlanItemRow(created, userId));
          results.push(created);
          continue;
        }

        const current = fromWeekPlanItemRow(existing);
        const updated = this.nextUpdateMetadata<WeekPlanItem>({
          ...current,
          weekPlanId: item.weekPlanId,
          backlogItemId: item.backlogItemId,
          status: item.status,
          localDate: item.localDate,
          startTime: item.startTime,
          endTime: item.endTime,
          title: item.title,
          pathId: item.pathId,
          templateId: item.templateId,
          expeditionId: item.expeditionId,
          milestoneId: item.milestoneId,
          expeditionContext: item.expeditionContext,
          milestoneContext: item.milestoneContext,
          description: item.description,
          note: item.note,
          origin: item.origin,
          blockKey: item.blockKey,
          deterministicImportKey: item.deterministicImportKey,
          createdMarkInstanceId: item.createdMarkInstanceId,
          importBatchId: item.importBatchId,
          sortOrder: item.sortOrder,
          orderIndex: item.orderIndex,
          deletedAt: undefined,
        });
        const updatedRow = this.toMutableUpdate(toWeekPlanItemRow(updated, userId));
        updatedRow.deleted_at = null;
        await this.updateRowWithExecutor(executor, WAYMARK_TABLES.weekPlanItems, updatedRow);
        results.push(updated);
      }

      return results;
    });
  }

  async softDeleteWeekPlanItem(id: string): Promise<void> {
    const row = await this.getFirst<WeekPlanItemRow>(
      `SELECT * FROM ${WAYMARK_TABLES.weekPlanItems} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      id,
    );
    if (!row) {
      return;
    }

    await this.updateRow(WAYMARK_TABLES.weekPlanItems, this.toMutableDelete(row));
  }
}

export class SQLiteDependencyRepository extends SQLiteStubRepository implements DependencyRepository {
  private async validateRequiredEntity(requiredType: MarkDependency["requiredEntityType"], requiredId: string): Promise<void> {
    const targetTable =
      requiredType === "mark_instance" ? WAYMARK_TABLES.markInstances
      : requiredType === "pack_check_instance" ? WAYMARK_TABLES.packCheckInstances
      : null;

    if (!targetTable) {
      throw new UnsupportedPolymorphicReferenceRepositoryError(
        `Unsupported dependency required entity type ${requiredType} for ${requiredId}.`,
      );
    }

    if (!(await this.activeRecordExists(targetTable, requiredId))) {
      throw new UnsupportedPolymorphicReferenceRepositoryError(
        `Dependency required entity ${requiredType}:${requiredId} does not exist.`,
      );
    }
  }

  async createDependency(input: CreateDependencyInput): Promise<MarkDependency> {
    const dependentExists = await this.activeRecordExists(WAYMARK_TABLES.markInstances, input.dependentMarkInstanceId);
    if (!dependentExists) {
      this.validation("Dependency requires an existing dependent MarkInstance.");
    }

    await this.validateRequiredEntity(input.requiredEntityType, input.requiredEntityId);

    const dependentRow = await this.getFirst<MarkInstanceRow>(
      `SELECT user_id FROM ${WAYMARK_TABLES.markInstances} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      input.dependentMarkInstanceId,
    );
    const userId = dependentRow?.user_id;
    if (!userId) {
      this.validation("Dependency could not resolve dependent MarkInstance owner.");
    }

    const created = this.nextCreateMetadata<MarkDependency>({
      id: generateEntityId("mark_dependency"),
      dependentMarkInstanceId: input.dependentMarkInstanceId,
      dependencyType: input.dependencyType,
      requiredEntityType: input.requiredEntityType,
      requiredEntityId: input.requiredEntityId,
      isRequired: input.isRequired,
      status: input.status,
      satisfiedAt: input.satisfiedAt ?? undefined,
      waivedAt: input.waivedAt ?? undefined,
      createdAt: this.getNowIsoString(),
      updatedAt: this.getNowIsoString(),
      syncVersion: 0,
    });
    await this.insertRow(WAYMARK_TABLES.markDependencies, toMarkDependencyRow(created, userId));
    return created;
  }

  async updateDependency(dependencyId: string, patch: UpdateDependencyPatch): Promise<MarkDependency> {
    const row = await this.getActiveRowById<MarkDependencyRow>(WAYMARK_TABLES.markDependencies, dependencyId);
    const current = this.assertFound(row, WAYMARK_TABLES.markDependencies, dependencyId);
    const entity = fromMarkDependencyRow(current);

    const updated = this.nextUpdateMetadata<MarkDependency>({
      ...entity,
      isRequired: patch.isRequired ?? entity.isRequired,
      status: patch.status ?? entity.status,
      satisfiedAt: patch.satisfiedAt === undefined ? entity.satisfiedAt : patch.satisfiedAt ?? undefined,
      waivedAt: patch.waivedAt === undefined ? entity.waivedAt : patch.waivedAt ?? undefined,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toMarkDependencyRow(updated, current.user_id));
    await this.updateRow(WAYMARK_TABLES.markDependencies, updatedRow);
    return updated;
  }

  async listDependenciesForMark(markInstanceId: string): Promise<MarkDependency[]> {
    const rows = await this.getAll<MarkDependencyRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markDependencies}
       WHERE dependent_mark_instance_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      markInstanceId,
    );
    return rows.map(fromMarkDependencyRow);
  }

  async listDependenciesByRequiredEntity(requiredType: MarkDependency["requiredEntityType"], requiredId: string): Promise<MarkDependency[]> {
    const rows = await this.getAll<MarkDependencyRow>(
      `SELECT * FROM ${WAYMARK_TABLES.markDependencies}
       WHERE required_entity_type = ? AND required_entity_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      requiredType,
      requiredId,
    );
    return rows.map(fromMarkDependencyRow);
  }
}

export class SQLiteMediaRepository extends SQLiteStubRepository implements MediaRepository {
  private async validateOwner(ownerType: MediaAssetOwnerType, ownerId: string): Promise<void> {
    const targetTable =
      ownerType === MediaAssetOwnerType.MarkInstance ? WAYMARK_TABLES.markInstances
      : ownerType === MediaAssetOwnerType.Memory ? WAYMARK_TABLES.memories
      : ownerType === MediaAssetOwnerType.Path ? WAYMARK_TABLES.paths
      : ownerType === MediaAssetOwnerType.Expedition ? WAYMARK_TABLES.expeditions
      : ownerType === MediaAssetOwnerType.BacklogItem ? WAYMARK_TABLES.backlogItems
      : null;

    if (!targetTable) {
      throw new UnsupportedPolymorphicReferenceRepositoryError(`Unsupported media owner type ${ownerType} for ${ownerId}.`);
    }

    if (!(await this.activeRecordExists(targetTable, ownerId))) {
      throw new UnsupportedPolymorphicReferenceRepositoryError(`Media owner ${ownerType}:${ownerId} does not exist.`);
    }
  }

  async getById(id: string): Promise<MediaAsset | null> {
    const row = await this.getActiveRowById<MediaAssetRow>(WAYMARK_TABLES.mediaAssets, id);
    return row ? fromMediaAssetRow(row) : null;
  }

  async listByOwner(ownerType: MediaAssetOwnerType, ownerId: string): Promise<MediaAsset[]> {
    const rows = await this.getAll<MediaAssetRow>(
      `SELECT * FROM ${WAYMARK_TABLES.mediaAssets}
       WHERE owner_type = ? AND owner_id = ? AND deleted_at IS NULL
       ORDER BY sort_index ASC, created_at ASC, id ASC;`,
      ownerType,
      ownerId,
    );
    return rows.map(fromMediaAssetRow);
  }

  async listPendingEodUpload(userId: string, localDate: string, options?: { includeVerified?: boolean }): Promise<MediaAsset[]> {
    const uploadStatuses = options?.includeVerified
      ? "'pending_eod_upload', 'in_eod_batch', 'upload_failed', 'retry_pending', 'remote_missing', 'uploaded', 'verified'"
      : "'pending_eod_upload', 'in_eod_batch', 'upload_failed', 'retry_pending', 'remote_missing'";
    const rows = await this.getAll<MediaAssetRow>(
      `SELECT * FROM ${WAYMARK_TABLES.mediaAssets}
       WHERE user_id = ? AND local_date = ? AND deleted_at IS NULL
         AND upload_status IN (${uploadStatuses})
       ORDER BY created_at ASC, sort_index ASC, id ASC;`,
      userId,
      localDate,
    );
    return rows.map(fromMediaAssetRow);
  }

  async listPendingEodUploadDates(userId: string, nowLocalDate: string, options?: { includeVerified?: boolean }): Promise<string[]> {
    const uploadStatuses = options?.includeVerified
      ? "'pending_eod_upload', 'in_eod_batch', 'upload_failed', 'retry_pending', 'remote_missing', 'uploaded', 'verified'"
      : "'pending_eod_upload', 'in_eod_batch', 'upload_failed', 'retry_pending', 'remote_missing'";
    const rows = await this.getAll<{ local_date: string }>(
      `SELECT DISTINCT local_date FROM ${WAYMARK_TABLES.mediaAssets}
       WHERE user_id = ? AND local_date IS NOT NULL AND local_date <= ? AND deleted_at IS NULL
         AND upload_status IN (${uploadStatuses})
       ORDER BY local_date ASC;`,
      userId,
      nowLocalDate,
    );
    return rows.map((row) => row.local_date);
  }

  async createMediaAsset(input: CreateMediaAssetInput): Promise<MediaAsset> {
    await this.validateOwner(input.ownerType, input.ownerId);

    const created = this.nextCreateMetadata<MediaAsset>({
      id: generateEntityId("media_asset"),
      userId: input.userId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      kind: input.kind ?? inferMediaAssetKind(input.assetType, input.mimeType),
      assetType: input.assetType,
      fileName: input.fileName,
      mimeType: input.mimeType ?? undefined,
      storagePath: input.storagePath,
      thumbnailPath: input.thumbnailPath ?? undefined,
      backupPath: input.backupPath ?? undefined,
      width: input.width ?? undefined,
      height: input.height ?? undefined,
      durationMs: input.durationMs ?? undefined,
      byteSize: input.byteSize ?? undefined,
      sortIndex: input.sortIndex ?? 0,
      capturedAt: input.capturedAt ?? undefined,
      localDate: input.localDate ?? undefined,
      dailyBatchId: input.dailyBatchId ?? undefined,
      uploadStatus: input.uploadStatus ?? "local_only",
      localStatus: input.localStatus ?? "local_available",
      sourceCleanupStatus: input.sourceCleanupStatus ?? "not_requested",
      originalPickerUri: input.originalPickerUri ?? undefined,
      libraryAssetId: input.libraryAssetId ?? undefined,
      createdAt: this.getNowIsoString(),
      updatedAt: this.getNowIsoString(),
      syncVersion: 0,
    });
    await this.insertRow(WAYMARK_TABLES.mediaAssets, toMediaAssetRow(created));
    return created;
  }

  async updateMediaAsset(assetId: string, patch: UpdateMediaAssetPatch): Promise<MediaAsset> {
    const row = await this.getActiveRowById<MediaAssetRow>(WAYMARK_TABLES.mediaAssets, assetId);
    const current = this.assertFound(row, WAYMARK_TABLES.mediaAssets, assetId);
    const entity = fromMediaAssetRow(current);

    const updated = this.nextUpdateMetadata<MediaAsset>({
      ...entity,
      kind: patch.kind ?? entity.kind,
      assetType: patch.assetType ?? entity.assetType,
      fileName: patch.fileName ?? entity.fileName,
      mimeType: patch.mimeType === undefined ? entity.mimeType : patch.mimeType ?? undefined,
      storagePath: patch.storagePath ?? entity.storagePath,
      thumbnailPath: patch.thumbnailPath === undefined ? entity.thumbnailPath : patch.thumbnailPath ?? undefined,
      backupPath: patch.backupPath === undefined ? entity.backupPath : patch.backupPath ?? undefined,
      width: patch.width === undefined ? entity.width : patch.width ?? undefined,
      height: patch.height === undefined ? entity.height : patch.height ?? undefined,
      durationMs: patch.durationMs === undefined ? entity.durationMs : patch.durationMs ?? undefined,
      byteSize: patch.byteSize === undefined ? entity.byteSize : patch.byteSize ?? undefined,
      sortIndex: patch.sortIndex === undefined ? entity.sortIndex : patch.sortIndex ?? 0,
      capturedAt: patch.capturedAt === undefined ? entity.capturedAt : patch.capturedAt ?? undefined,
      localDate: patch.localDate === undefined ? entity.localDate : patch.localDate ?? undefined,
      dailyBatchId: patch.dailyBatchId === undefined ? entity.dailyBatchId : patch.dailyBatchId ?? undefined,
      uploadStatus: patch.uploadStatus === undefined ? entity.uploadStatus : patch.uploadStatus ?? undefined,
      localStatus: patch.localStatus === undefined ? entity.localStatus : patch.localStatus ?? undefined,
      sourceCleanupStatus:
        patch.sourceCleanupStatus === undefined ? entity.sourceCleanupStatus : patch.sourceCleanupStatus ?? undefined,
      originalPickerUri: patch.originalPickerUri === undefined ? entity.originalPickerUri : patch.originalPickerUri ?? undefined,
      libraryAssetId: patch.libraryAssetId === undefined ? entity.libraryAssetId : patch.libraryAssetId ?? undefined,
      driveFileId: patch.driveFileId === undefined ? entity.driveFileId : patch.driveFileId ?? undefined,
      driveFolderId: patch.driveFolderId === undefined ? entity.driveFolderId : patch.driveFolderId ?? undefined,
      driveRootFolderId: patch.driveRootFolderId === undefined ? entity.driveRootFolderId : patch.driveRootFolderId ?? undefined,
      driveWebViewLink: patch.driveWebViewLink === undefined ? entity.driveWebViewLink : patch.driveWebViewLink ?? undefined,
      driveWebContentLink:
        patch.driveWebContentLink === undefined ? entity.driveWebContentLink : patch.driveWebContentLink ?? undefined,
      driveMimeType: patch.driveMimeType === undefined ? entity.driveMimeType : patch.driveMimeType ?? undefined,
      driveSizeBytes: patch.driveSizeBytes === undefined ? entity.driveSizeBytes : patch.driveSizeBytes ?? undefined,
      driveMd5Checksum: patch.driveMd5Checksum === undefined ? entity.driveMd5Checksum : patch.driveMd5Checksum ?? undefined,
      contentHash: patch.contentHash === undefined ? entity.contentHash : patch.contentHash ?? undefined,
      contentHashAlgorithm:
        patch.contentHashAlgorithm === undefined ? entity.contentHashAlgorithm : patch.contentHashAlgorithm ?? undefined,
      thumbnailDriveFileId:
        patch.thumbnailDriveFileId === undefined ? entity.thumbnailDriveFileId : patch.thumbnailDriveFileId ?? undefined,
      thumbnailContentHash:
        patch.thumbnailContentHash === undefined ? entity.thumbnailContentHash : patch.thumbnailContentHash ?? undefined,
      thumbnailContentHashAlgorithm:
        patch.thumbnailContentHashAlgorithm === undefined ?
          entity.thumbnailContentHashAlgorithm
        : patch.thumbnailContentHashAlgorithm ?? undefined,
      uploadedAt: patch.uploadedAt === undefined ? entity.uploadedAt : patch.uploadedAt ?? undefined,
      sourceDeletedAt: patch.sourceDeletedAt === undefined ? entity.sourceDeletedAt : patch.sourceDeletedAt ?? undefined,
      localDeletedAt: patch.localDeletedAt === undefined ? entity.localDeletedAt : patch.localDeletedAt ?? undefined,
      lastSyncError: patch.lastSyncError === undefined ? entity.lastSyncError : patch.lastSyncError ?? undefined,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toMediaAssetRow(updated));
    await this.updateRow(WAYMARK_TABLES.mediaAssets, updatedRow);
    return updated;
  }
}

export class SQLiteDailyMediaUploadBatchRepository extends SQLiteStubRepository implements DailyMediaUploadBatchRepository {
  async getById(id: string): Promise<DailyMediaUploadBatch | null> {
    const row = await this.getActiveRowById<DailyMediaUploadBatchRow>(WAYMARK_TABLES.dailyMediaUploadBatches, id);
    return row ? fromDailyMediaUploadBatchRow(row) : null;
  }

  async getByUserDate(userId: string, localDate: string): Promise<DailyMediaUploadBatch | null> {
    const row = await this.getFirst<DailyMediaUploadBatchRow>(
      `SELECT * FROM ${WAYMARK_TABLES.dailyMediaUploadBatches}
       WHERE user_id = ? AND local_date = ? AND deleted_at IS NULL
       LIMIT 1;`,
      userId,
      localDate,
    );
    return row ? fromDailyMediaUploadBatchRow(row) : null;
  }

  async listCatchUpCandidates(userId: string, nowLocalDate: string, nowIso: string): Promise<DailyMediaUploadBatch[]> {
    const rows = await this.getAll<DailyMediaUploadBatchRow>(
      `SELECT * FROM ${WAYMARK_TABLES.dailyMediaUploadBatches}
       WHERE user_id = ? AND local_date <= ? AND deleted_at IS NULL
         AND (
           status IN ('open', 'sealed', 'missed_pending', 'retry_pending', 'partial_failed')
           OR (status = 'uploading' AND (lock_expires_at IS NULL OR lock_expires_at <= ?))
         )
       ORDER BY local_date ASC, created_at ASC;`,
      userId,
      nowLocalDate,
      new Date(nowIso).getTime(),
    );
    return rows.map(fromDailyMediaUploadBatchRow);
  }

  async getOrCreate(input: UpsertDailyMediaUploadBatchInput): Promise<DailyMediaUploadBatch> {
    const existing = await this.getByUserDate(input.userId, input.localDate);
    if (existing) {
      return existing;
    }
    return this.upsert(input);
  }

  async acquireUploadLock(input: AcquireDailyMediaUploadBatchLockInput): Promise<DailyMediaUploadBatch | null> {
    const nowMs = new Date(input.lockAcquiredAt).getTime();
    const lockExpiresMs = new Date(input.lockExpiresAt).getTime();
    const staleBeforeMs = new Date(input.staleBefore).getTime();
    const executor = await this.getExecutor();
    const result = await this.runWithExecutor(
      executor,
      `UPDATE ${WAYMARK_TABLES.dailyMediaUploadBatches}
       SET status = 'uploading',
           media_count = ?,
           run_sequence = run_sequence + 1,
           lock_owner = ?,
           lock_acquired_at = ?,
           lock_expires_at = ?,
           sealed_at = COALESCE(sealed_at, ?),
           started_at = ?,
           updated_at = ?,
           sync_status = 'dirty',
           local_revision = local_revision + 1
       WHERE id = ? AND deleted_at IS NULL
         AND (
           status != 'uploading'
           OR lock_expires_at IS NULL
           OR lock_expires_at <= ?
         );`,
      input.mediaCount,
      input.lockOwner,
      nowMs,
      lockExpiresMs,
      nowMs,
      nowMs,
      nowMs,
      input.batchId,
      staleBeforeMs,
    );
    if (result.changes === 0) {
      return null;
    }
    return this.getById(input.batchId);
  }

  async upsert(input: UpsertDailyMediaUploadBatchInput): Promise<DailyMediaUploadBatch> {
    const existing =
      input.id ?
        await this.getFirst<DailyMediaUploadBatchRow>(
          `SELECT * FROM ${WAYMARK_TABLES.dailyMediaUploadBatches} WHERE id = ? LIMIT 1;`,
          input.id,
        )
      : await this.getFirst<DailyMediaUploadBatchRow>(
          `SELECT * FROM ${WAYMARK_TABLES.dailyMediaUploadBatches}
           WHERE user_id = ? AND local_date = ? AND deleted_at IS NULL LIMIT 1;`,
          input.userId,
          input.localDate,
        );

    if (!existing) {
      const created = this.nextCreateMetadata<DailyMediaUploadBatch>({
        id: input.id ?? generateDailyMediaUploadBatchId(input.localDate, input.userId),
        userId: input.userId,
        localDate: input.localDate,
        timezone: input.timezone,
        status: input.status ?? "open",
        mediaCount: input.mediaCount ?? 0,
        uploadedCount: input.uploadedCount ?? 0,
        failedCount: input.failedCount ?? 0,
        runSequence: input.runSequence ?? 0,
        lockOwner: input.lockOwner ?? undefined,
        lockAcquiredAt: input.lockAcquiredAt ?? undefined,
        lockExpiresAt: input.lockExpiresAt ?? undefined,
        sealedAt: input.sealedAt ?? undefined,
        startedAt: input.startedAt ?? undefined,
        completedAt: input.completedAt ?? undefined,
        lastError: input.lastError ?? undefined,
        createdAt: this.getNowIsoString(),
        updatedAt: this.getNowIsoString(),
      });
      await this.insertRow(WAYMARK_TABLES.dailyMediaUploadBatches, toDailyMediaUploadBatchRow(created));
      return created;
    }

    const current = fromDailyMediaUploadBatchRow(existing);
    return this.update(current.id, input);
  }

  async update(batchId: string, patch: UpdateDailyMediaUploadBatchPatch): Promise<DailyMediaUploadBatch> {
    const row = await this.getActiveRowById<DailyMediaUploadBatchRow>(WAYMARK_TABLES.dailyMediaUploadBatches, batchId);
    const current = fromDailyMediaUploadBatchRow(this.assertFound(row, WAYMARK_TABLES.dailyMediaUploadBatches, batchId));
    const updated = this.nextUpdateMetadata<DailyMediaUploadBatch>({
      ...current,
      timezone: patch.timezone ?? current.timezone,
      status: patch.status ?? current.status,
      mediaCount: patch.mediaCount ?? current.mediaCount,
      uploadedCount: patch.uploadedCount ?? current.uploadedCount,
      failedCount: patch.failedCount ?? current.failedCount,
      runSequence: patch.runSequence ?? current.runSequence,
      lockOwner: patch.lockOwner === undefined ? current.lockOwner : patch.lockOwner ?? undefined,
      lockAcquiredAt: patch.lockAcquiredAt === undefined ? current.lockAcquiredAt : patch.lockAcquiredAt ?? undefined,
      lockExpiresAt: patch.lockExpiresAt === undefined ? current.lockExpiresAt : patch.lockExpiresAt ?? undefined,
      sealedAt: patch.sealedAt === undefined ? current.sealedAt : patch.sealedAt ?? undefined,
      startedAt: patch.startedAt === undefined ? current.startedAt : patch.startedAt ?? undefined,
      completedAt: patch.completedAt === undefined ? current.completedAt : patch.completedAt ?? undefined,
      lastError: patch.lastError === undefined ? current.lastError : patch.lastError ?? undefined,
      deletedAt: undefined,
    });
    const updatedRow = this.toMutableUpdate(toDailyMediaUploadBatchRow(updated));
    await this.updateRow(WAYMARK_TABLES.dailyMediaUploadBatches, updatedRow);
    return updated;
  }
}

function inferMediaAssetKind(assetType: MediaAssetType, mimeType?: string | null) {
  if (mimeType?.toLowerCase().startsWith("video/")) {
    return MediaAssetKind.Video;
  }

  if (
    assetType === MediaAssetType.ProofVideo ||
    assetType === MediaAssetType.MemoryVideo ||
    assetType === MediaAssetType.BacklogVideo
  ) {
    return MediaAssetKind.Video;
  }

  return MediaAssetKind.Image;
}

export class SQLiteStrengthRepository extends SQLiteStubRepository implements StrengthRepository {
  async getRoutineById(id: string): Promise<WorkoutRoutineTemplate | null> {
    const row = await this.getActiveRowById<WorkoutRoutineTemplateRow>(WAYMARK_TABLES.workoutRoutineTemplates, id);
    return row ? fromWorkoutRoutineTemplateRow(row) : null;
  }

  async listRoutinesByPath(pathId: string): Promise<WorkoutRoutineTemplate[]> {
    const rows = await this.getAll<WorkoutRoutineTemplateRow>(
      `SELECT * FROM ${WAYMARK_TABLES.workoutRoutineTemplates}
       WHERE path_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      pathId,
    );
    return rows.map(fromWorkoutRoutineTemplateRow);
  }

  async listRoutineExercises(routineTemplateId: string): Promise<RoutineExerciseTemplate[]> {
    const rows = await this.getAll<RoutineExerciseTemplateRow>(
      `SELECT * FROM ${WAYMARK_TABLES.routineExerciseTemplates}
       WHERE workout_routine_template_id = ? AND deleted_at IS NULL
       ORDER BY order_index ASC, created_at ASC;`,
      routineTemplateId,
    );
    return rows.map(fromRoutineExerciseTemplateRow);
  }

  async softDeleteRoutineExercisesExcept(routineTemplateId: string, keepIds: string[]): Promise<void> {
    await this.withAtomicWrite(async (executor) => {
      const rows = await executor.getAllAsync<RoutineExerciseTemplateRow>(
        `SELECT * FROM ${WAYMARK_TABLES.routineExerciseTemplates}
         WHERE workout_routine_template_id = ? AND deleted_at IS NULL;`,
        routineTemplateId,
      );

      const keep = new Set(keepIds);
      for (const row of rows) {
        if (keep.has(row.id)) {
          continue;
        }
        const deletedRow = this.toMutableDelete(row);
        await executor.runAsync(
          `UPDATE ${WAYMARK_TABLES.routineExerciseTemplates}
           SET updated_at = ?, deleted_at = ?, sync_status = ?, local_revision = ?
           WHERE id = ?;`,
          deletedRow.updated_at,
          deletedRow.deleted_at,
          deletedRow.sync_status,
          deletedRow.local_revision,
          deletedRow.id,
        );
      }
    });
  }

  async upsertRoutine(routine: WorkoutRoutineTemplate): Promise<WorkoutRoutineTemplate> {
    const pathExists = await this.activeRecordExists(WAYMARK_TABLES.paths, routine.pathId);
    if (!pathExists) {
      this.validation("WorkoutRoutineTemplate requires an existing Path.");
    }
    if (routine.markTemplateId) {
      const templateExists = await this.activeRecordExists(WAYMARK_TABLES.markTemplates, routine.markTemplateId);
      if (!templateExists) {
        this.validation("WorkoutRoutineTemplate markTemplateId must reference an existing MarkTemplate when provided.");
      }
    }

    const existing = routine.id
      ? await this.getFirst<WorkoutRoutineTemplateRow>(`SELECT * FROM ${WAYMARK_TABLES.workoutRoutineTemplates} WHERE id = ? LIMIT 1;`, routine.id)
      : null;
    if (!existing) {
      const created = this.nextCreateMetadata<WorkoutRoutineTemplate>({
        ...routine,
        id: routine.id || generateEntityId("workout_routine"),
      });
      await this.insertRow(WAYMARK_TABLES.workoutRoutineTemplates, toWorkoutRoutineTemplateRow(created));
      return created;
    }

    const current = fromWorkoutRoutineTemplateRow(existing);
    const updated = this.nextUpdateMetadata<WorkoutRoutineTemplate>({
      ...current,
      pathId: routine.pathId,
      markTemplateId: routine.markTemplateId === undefined ? current.markTemplateId : routine.markTemplateId,
      title: routine.title,
      routineType: routine.routineType,
      description: routine.description,
      cycleKey: routine.cycleKey,
      estimatedDurationMin: routine.estimatedDurationMin,
      isActive: routine.isActive,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toWorkoutRoutineTemplateRow(updated));
    updatedRow.deleted_at = null;
    await this.updateRow(WAYMARK_TABLES.workoutRoutineTemplates, updatedRow);
    return updated;
  }

  async upsertRoutineExercises(items: RoutineExerciseTemplate[]): Promise<RoutineExerciseTemplate[]> {
    if (items.length === 0) {
      return [];
    }

    return this.withAtomicWrite(async (executor) => {
      const routineIds = [...new Set(items.map((item) => item.workoutRoutineTemplateId))];
      const exerciseIds = [...new Set(items.map((item) => item.exerciseDefinitionId))];

      const routineRows = await this.getAllFromExecutor<WorkoutRoutineTemplateRow>(
        executor,
        `SELECT * FROM ${WAYMARK_TABLES.workoutRoutineTemplates}
         WHERE id IN (${asArrayParams(routineIds)}) AND deleted_at IS NULL;`,
        ...routineIds,
      );
      if (routineRows.length !== routineIds.length) {
        this.validation("RoutineExerciseTemplate upsert requires existing WorkoutRoutineTemplates.");
      }

      const exerciseRows = await this.getAllFromExecutor<ExerciseDefinitionRow>(
        executor,
        `SELECT * FROM ${WAYMARK_TABLES.exerciseDefinitions}
         WHERE id IN (${asArrayParams(exerciseIds)}) AND deleted_at IS NULL;`,
        ...exerciseIds,
      );
      if (exerciseRows.length !== exerciseIds.length) {
        this.validation("RoutineExerciseTemplate upsert requires existing ExerciseDefinitions.");
      }

      const userIdByRoutineId = new Map(routineRows.map((row) => [row.id, row.user_id]));
      const results: RoutineExerciseTemplate[] = [];

      for (const item of items) {
        const userId = userIdByRoutineId.get(item.workoutRoutineTemplateId);
        if (!userId) {
          this.validation("RoutineExerciseTemplate upsert could not resolve parent routine owner.");
        }

        const existing = item.id
          ? await this.getFirstFromExecutor<RoutineExerciseTemplateRow>(
              executor,
              `SELECT * FROM ${WAYMARK_TABLES.routineExerciseTemplates} WHERE id = ? LIMIT 1;`,
              item.id,
            )
          : null;

        if (!existing) {
          const created = this.nextCreateMetadata<RoutineExerciseTemplate>({
            ...item,
            id: item.id || generateEntityId("routine_exercise"),
          });
          await this.insertRowWithExecutor(executor, WAYMARK_TABLES.routineExerciseTemplates, toRoutineExerciseTemplateRow(created, userId));
          results.push(created);
          continue;
        }

        const current = fromRoutineExerciseTemplateRow(existing);
        const updated = this.nextUpdateMetadata<RoutineExerciseTemplate>({
          ...current,
          workoutRoutineTemplateId: item.workoutRoutineTemplateId,
          exerciseDefinitionId: item.exerciseDefinitionId,
          phase: item.phase,
          orderIndex: item.orderIndex,
          targetType: item.targetType,
          targetLoadKg: item.targetLoadKg,
          targetReps: item.targetReps,
          targetSets: item.targetSets,
          targetDurationSec: item.targetDurationSec,
          targetDistanceM: item.targetDistanceM,
          targetSteps: item.targetSteps,
          restDurationSec: item.restDurationSec,
          progressionPolicy: item.progressionPolicy,
          deletedAt: undefined,
        });
        const updatedRow = this.toMutableUpdate(toRoutineExerciseTemplateRow(updated, userId));
        updatedRow.deleted_at = null;
        await this.updateRowWithExecutor(executor, WAYMARK_TABLES.routineExerciseTemplates, updatedRow);
        results.push(updated);
      }

      return results;
    });
  }

  async getSessionById(id: string): Promise<WorkoutSessionInstance | null> {
    const row = await this.getActiveRowById<WorkoutSessionInstanceRow>(WAYMARK_TABLES.workoutSessionInstances, id);
    return row ? fromWorkoutSessionInstanceRow(row) : null;
  }

  async getSessionByMarkInstance(markInstanceId: string): Promise<WorkoutSessionInstance | null> {
    const row = await this.getFirst<WorkoutSessionInstanceRow>(
      `SELECT * FROM ${WAYMARK_TABLES.workoutSessionInstances}
       WHERE mark_instance_id = ? AND deleted_at IS NULL
       LIMIT 1;`,
      markInstanceId,
    );
    return row ? fromWorkoutSessionInstanceRow(row) : null;
  }

  async upsertSession(session: WorkoutSessionInstance): Promise<WorkoutSessionInstance> {
    const markExists = await this.activeRecordExists(WAYMARK_TABLES.markInstances, session.markInstanceId);
    if (!markExists) {
      this.validation("WorkoutSessionInstance requires an existing MarkInstance.");
    }
    const routineExists = await this.activeRecordExists(WAYMARK_TABLES.workoutRoutineTemplates, session.routineTemplateId);
    if (!routineExists) {
      this.validation("WorkoutSessionInstance requires an existing WorkoutRoutineTemplate.");
    }
    if (session.currentExerciseSnapshotId) {
      const snapshotExists = await this.activeRecordExists(WAYMARK_TABLES.sessionExerciseSnapshots, session.currentExerciseSnapshotId);
      if (!snapshotExists) {
        this.validation("WorkoutSessionInstance currentExerciseSnapshotId must reference an existing SessionExerciseSnapshot when provided.");
      }
    }

    const existing = session.id
      ? await this.getFirst<WorkoutSessionInstanceRow>(`SELECT * FROM ${WAYMARK_TABLES.workoutSessionInstances} WHERE id = ? LIMIT 1;`, session.id)
      : null;
    if (!existing) {
      const created = this.nextCreateMetadata<WorkoutSessionInstance>({
        ...session,
        id: session.id || generateEntityId("workout_session"),
      });
      await this.insertRow(WAYMARK_TABLES.workoutSessionInstances, toWorkoutSessionInstanceRow(created));
      return created;
    }

    const current = fromWorkoutSessionInstanceRow(existing);
    const updated = this.nextUpdateMetadata<WorkoutSessionInstance>({
      ...current,
      markInstanceId: session.markInstanceId,
      routineTemplateId: session.routineTemplateId,
      status: session.status,
      phase: session.phase,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      currentExerciseSnapshotId:
        session.currentExerciseSnapshotId === undefined ? current.currentExerciseSnapshotId : session.currentExerciseSnapshotId,
      currentSetNumber: session.currentSetNumber === undefined ? current.currentSetNumber : session.currentSetNumber ?? undefined,
      notes: session.notes,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toWorkoutSessionInstanceRow(updated));
    updatedRow.deleted_at = null;
    await this.updateRow(WAYMARK_TABLES.workoutSessionInstances, updatedRow);
    return updated;
  }

  async listSessionSnapshots(workoutSessionInstanceId: string): Promise<SessionExerciseSnapshot[]> {
    const rows = await this.getAll<SessionExerciseSnapshotRow>(
      `SELECT * FROM ${WAYMARK_TABLES.sessionExerciseSnapshots}
       WHERE workout_session_instance_id = ? AND deleted_at IS NULL
       ORDER BY order_index ASC, created_at ASC;`,
      workoutSessionInstanceId,
    );
    return rows.map(fromSessionExerciseSnapshotRow);
  }

  async softDeleteSessionSnapshots(workoutSessionInstanceId: string): Promise<void> {
    const rows = await this.getAll<SessionExerciseSnapshotRow>(
      `SELECT * FROM ${WAYMARK_TABLES.sessionExerciseSnapshots}
       WHERE workout_session_instance_id = ? AND deleted_at IS NULL;`,
      workoutSessionInstanceId,
    );
    if (rows.length === 0) {
      return;
    }

    await this.withAtomicWrite(async (executor) => {
      for (const row of rows) {
        const deletedRow = this.toMutableDelete(row);
        await executor.runAsync(
          `UPDATE ${WAYMARK_TABLES.sessionExerciseSnapshots}
           SET updated_at = ?, deleted_at = ?, sync_status = ?, local_revision = ?
           WHERE id = ?;`,
          deletedRow.updated_at,
          deletedRow.deleted_at,
          deletedRow.sync_status,
          deletedRow.local_revision,
          row.id,
        );
      }
    });
  }

  async upsertSessionSnapshots(snapshots: SessionExerciseSnapshot[]): Promise<SessionExerciseSnapshot[]> {
    if (snapshots.length === 0) {
      return [];
    }

    return this.withAtomicWrite(async (executor) => {
      const sessionIds = [...new Set(snapshots.map((item) => item.workoutSessionInstanceId))];
      const exerciseIds = [...new Set(snapshots.map((item) => item.exerciseDefinitionId))];
      const routineExerciseIds = [...new Set(snapshots.map((item) => item.routineExerciseTemplateId).filter(Boolean) as string[])];

      const sessionRows = await this.getAllFromExecutor<WorkoutSessionInstanceRow>(
        executor,
        `SELECT * FROM ${WAYMARK_TABLES.workoutSessionInstances}
         WHERE id IN (${asArrayParams(sessionIds)}) AND deleted_at IS NULL;`,
        ...sessionIds,
      );
      if (sessionRows.length !== sessionIds.length) {
        this.validation("SessionExerciseSnapshot upsert requires existing WorkoutSessionInstances.");
      }

      const exerciseRows = await this.getAllFromExecutor<ExerciseDefinitionRow>(
        executor,
        `SELECT * FROM ${WAYMARK_TABLES.exerciseDefinitions}
         WHERE id IN (${asArrayParams(exerciseIds)}) AND deleted_at IS NULL;`,
        ...exerciseIds,
      );
      if (exerciseRows.length !== exerciseIds.length) {
        this.validation("SessionExerciseSnapshot upsert requires existing ExerciseDefinitions.");
      }

      if (routineExerciseIds.length > 0) {
        const routineExerciseRows = await this.getAllFromExecutor<RoutineExerciseTemplateRow>(
          executor,
          `SELECT * FROM ${WAYMARK_TABLES.routineExerciseTemplates}
           WHERE id IN (${asArrayParams(routineExerciseIds)}) AND deleted_at IS NULL;`,
          ...routineExerciseIds,
        );
        if (routineExerciseRows.length !== routineExerciseIds.length) {
          this.validation("SessionExerciseSnapshot routineExerciseTemplateId must reference existing RoutineExerciseTemplates when provided.");
        }
      }

      const userIdBySessionId = new Map(sessionRows.map((row) => [row.id, row.user_id]));
      const results: SessionExerciseSnapshot[] = [];

      for (const item of snapshots) {
        const userId = userIdBySessionId.get(item.workoutSessionInstanceId);
        if (!userId) {
          this.validation("SessionExerciseSnapshot upsert could not resolve parent session owner.");
        }

        const existing = item.id
          ? await this.getFirstFromExecutor<SessionExerciseSnapshotRow>(
              executor,
              `SELECT * FROM ${WAYMARK_TABLES.sessionExerciseSnapshots} WHERE id = ? LIMIT 1;`,
              item.id,
            )
          : null;

        if (!existing) {
          const created = this.nextCreateMetadata<SessionExerciseSnapshot>({
            ...item,
            id: item.id || generateEntityId("session_exercise_snapshot"),
          });
          await this.insertRowWithExecutor(executor, WAYMARK_TABLES.sessionExerciseSnapshots, toSessionExerciseSnapshotRow(created, userId));
          results.push(created);
          continue;
        }

        const current = fromSessionExerciseSnapshotRow(existing);
        const updated = this.nextUpdateMetadata<SessionExerciseSnapshot>({
          ...current,
          workoutSessionInstanceId: item.workoutSessionInstanceId,
          routineExerciseTemplateId:
            item.routineExerciseTemplateId === undefined ? current.routineExerciseTemplateId : item.routineExerciseTemplateId,
          exerciseDefinitionId: item.exerciseDefinitionId,
          exerciseNameSnapshot: item.exerciseNameSnapshot,
          phase: item.phase,
          orderIndex: item.orderIndex,
          targetType: item.targetType,
          targetLoadKg: item.targetLoadKg,
          targetReps: item.targetReps,
          targetSets: item.targetSets,
          targetDurationSec: item.targetDurationSec,
          targetDistanceM: item.targetDistanceM,
          targetSteps: item.targetSteps,
          wasOverridden: item.wasOverridden,
          status: item.status,
          startedAt: item.startedAt,
          completedAt: item.completedAt,
          deletedAt: undefined,
        });
        const updatedRow = this.toMutableUpdate(toSessionExerciseSnapshotRow(updated, userId));
        updatedRow.deleted_at = null;
        await this.updateRowWithExecutor(executor, WAYMARK_TABLES.sessionExerciseSnapshots, updatedRow);
        results.push(updated);
      }

      return results;
    });
  }

  async listSetLogs(sessionExerciseSnapshotId: string): Promise<ExerciseSetLog[]> {
    const rows = await this.getAll<ExerciseSetLogRow>(
      `SELECT * FROM ${WAYMARK_TABLES.exerciseSetLogs}
       WHERE session_exercise_snapshot_id = ? AND deleted_at IS NULL
       ORDER BY set_number ASC, created_at ASC;`,
      sessionExerciseSnapshotId,
    );
    return rows.map(fromExerciseSetLogRow);
  }

  async upsertSetLogs(logs: ExerciseSetLog[]): Promise<ExerciseSetLog[]> {
    if (logs.length === 0) {
      return [];
    }

    return this.withAtomicWrite(async (executor) => {
      const snapshotIds = [...new Set(logs.map((log) => log.sessionExerciseSnapshotId))];
      const snapshotRows = await this.getAllFromExecutor<SessionExerciseSnapshotRow>(
        executor,
        `SELECT * FROM ${WAYMARK_TABLES.sessionExerciseSnapshots}
         WHERE id IN (${asArrayParams(snapshotIds)}) AND deleted_at IS NULL;`,
        ...snapshotIds,
      );
      if (snapshotRows.length !== snapshotIds.length) {
        this.validation("ExerciseSetLog upsert requires existing SessionExerciseSnapshots.");
      }

      const userIdBySnapshotId = new Map(snapshotRows.map((row) => [row.id, row.user_id]));
      const results: ExerciseSetLog[] = [];

      for (const log of logs) {
        const userId = userIdBySnapshotId.get(log.sessionExerciseSnapshotId);
        if (!userId) {
          this.validation("ExerciseSetLog upsert could not resolve parent snapshot owner.");
        }

        const existing = log.id
          ? await this.getFirstFromExecutor<ExerciseSetLogRow>(
              executor,
              `SELECT * FROM ${WAYMARK_TABLES.exerciseSetLogs} WHERE id = ? LIMIT 1;`,
              log.id,
            )
          : null;

        if (!existing) {
          const created = this.nextCreateMetadata<ExerciseSetLog>({
            ...log,
            id: log.id || generateEntityId("exercise_set_log"),
          });
          await this.insertRowWithExecutor(executor, WAYMARK_TABLES.exerciseSetLogs, toExerciseSetLogRow(created, userId));
          results.push(created);
          continue;
        }

        const current = fromExerciseSetLogRow(existing);
        const updated = this.nextUpdateMetadata<ExerciseSetLog>({
          ...current,
          sessionExerciseSnapshotId: log.sessionExerciseSnapshotId,
          setNumber: log.setNumber,
          actualLoadKg: log.actualLoadKg,
          actualReps: log.actualReps,
          actualDurationSec: log.actualDurationSec,
          actualDistanceM: log.actualDistanceM,
          actualSteps: log.actualSteps,
          completed: log.completed,
          failedReason: log.failedReason,
          metadata: log.metadata,
          startedAt: log.startedAt,
          completedAt: log.completedAt,
          deletedAt: undefined,
        });
        const updatedRow = this.toMutableUpdate(toExerciseSetLogRow(updated, userId));
        updatedRow.deleted_at = null;
        await this.updateRowWithExecutor(executor, WAYMARK_TABLES.exerciseSetLogs, updatedRow);
        results.push(updated);
      }

      return results;
    });
  }

  async getExerciseDefinitionById(id: string): Promise<ExerciseDefinition | null> {
    const row = await this.getActiveRowById<ExerciseDefinitionRow>(WAYMARK_TABLES.exerciseDefinitions, id);
    return row ? fromExerciseDefinitionRow(row) : null;
  }

  async listExerciseDefinitions(): Promise<ExerciseDefinition[]> {
    const rows = await this.getAll<ExerciseDefinitionRow>(
      `SELECT * FROM ${WAYMARK_TABLES.exerciseDefinitions}
       WHERE deleted_at IS NULL
       ORDER BY is_system DESC, title ASC, created_at ASC;`,
    );
    return rows.map(fromExerciseDefinitionRow);
  }

  async upsertExerciseDefinition(exercise: ExerciseDefinition): Promise<ExerciseDefinition> {
    if (exercise.pathId) {
      const pathExists = await this.activeRecordExists(WAYMARK_TABLES.paths, exercise.pathId);
      if (!pathExists) {
        this.validation("ExerciseDefinition pathId must reference an existing Path when provided.");
      }
    }

    const existing = exercise.id
      ? await this.getFirst<ExerciseDefinitionRow>(`SELECT * FROM ${WAYMARK_TABLES.exerciseDefinitions} WHERE id = ? LIMIT 1;`, exercise.id)
      : null;
    if (!existing) {
      const created = this.nextCreateMetadata<ExerciseDefinition>({
        ...exercise,
        id: exercise.id || generateEntityId("exercise_definition"),
      });
      await this.insertRow(WAYMARK_TABLES.exerciseDefinitions, toExerciseDefinitionRow(created));
      return created;
    }

    const current = fromExerciseDefinitionRow(existing);
    const updated = this.nextUpdateMetadata<ExerciseDefinition>({
      ...current,
      pathId: exercise.pathId === undefined ? current.pathId : exercise.pathId,
      title: exercise.title,
      canonicalSlug: exercise.canonicalSlug,
      category: exercise.category,
      targetType: exercise.targetType,
      defaultRestSec: exercise.defaultRestSec,
      defaultUnit: exercise.defaultUnit,
      equipment: exercise.equipment,
      isSystem: exercise.isSystem,
      description: exercise.description,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toExerciseDefinitionRow(updated));
    updatedRow.deleted_at = null;
    await this.updateRow(WAYMARK_TABLES.exerciseDefinitions, updatedRow);
    return updated;
  }

  async getProgressState(userId: string, exerciseDefinitionId: string): Promise<ExerciseProgressState | null> {
    const row = await this.getFirst<ExerciseProgressStateRow>(
      `SELECT * FROM ${WAYMARK_TABLES.exerciseProgressStates}
       WHERE user_id = ? AND exercise_definition_id = ? AND deleted_at IS NULL
       LIMIT 1;`,
      userId,
      exerciseDefinitionId,
    );
    return row ? fromExerciseProgressStateRow(row) : null;
  }

  async upsertExerciseProgressState(state: ExerciseProgressState): Promise<ExerciseProgressState> {
    const exerciseExists = await this.activeRecordExists(WAYMARK_TABLES.exerciseDefinitions, state.exerciseDefinitionId);
    if (!exerciseExists) {
      this.validation("ExerciseProgressState requires an existing ExerciseDefinition.");
    }

    const existingByCompositeKey = async () =>
      this.getFirst<ExerciseProgressStateRow>(
        `SELECT * FROM ${WAYMARK_TABLES.exerciseProgressStates}
         WHERE user_id = ? AND exercise_definition_id = ? AND deleted_at IS NULL
         LIMIT 1;`,
        state.userId,
        state.exerciseDefinitionId,
      );

    const existingById =
      state.id ?
        await this.getFirst<ExerciseProgressStateRow>(`SELECT * FROM ${WAYMARK_TABLES.exerciseProgressStates} WHERE id = ? LIMIT 1;`, state.id)
      : null;
    const existing = existingById ?? (await existingByCompositeKey());

    if (!existing) {
      const created = this.nextCreateMetadata<ExerciseProgressState>({
        ...state,
        id: state.id || generateEntityId("exercise_progress_state"),
      });
      try {
        await this.insertRow(WAYMARK_TABLES.exerciseProgressStates, toExerciseProgressStateRow(created));
      } catch (error) {
        const recovered = await existingByCompositeKey();
        if (!recovered) {
          this.wrapSqlError(error, "Failed to create ExerciseProgressState.");
        }

        const current = fromExerciseProgressStateRow(recovered);
        const updated = this.nextUpdateMetadata<ExerciseProgressState>({
          ...current,
          userId: state.userId,
          exerciseDefinitionId: state.exerciseDefinitionId,
          currentTargetLoadKg: state.currentTargetLoadKg,
          currentTargetReps: state.currentTargetReps,
          currentTargetSets: state.currentTargetSets,
          currentTargetDurationSec: state.currentTargetDurationSec,
          currentTargetDistanceM: state.currentTargetDistanceM,
          currentTargetSteps: state.currentTargetSteps,
          successCountSinceProgression: state.successCountSinceProgression,
          lastSessionResult: state.lastSessionResult,
          lastProgressedAt: state.lastProgressedAt,
          manualOverride: state.manualOverride,
          lastSessionAt: state.lastSessionAt,
          lastProgressionOutcome: state.lastProgressionOutcome,
          deletedAt: undefined,
        });

        const updatedRow = this.toMutableUpdate(toExerciseProgressStateRow(updated));
        updatedRow.deleted_at = null;
        await this.updateRow(WAYMARK_TABLES.exerciseProgressStates, updatedRow);
        return updated;
      }
      return created;
    }

    const current = fromExerciseProgressStateRow(existing);
    const updated = this.nextUpdateMetadata<ExerciseProgressState>({
      ...current,
      userId: state.userId,
      exerciseDefinitionId: state.exerciseDefinitionId,
      currentTargetLoadKg: state.currentTargetLoadKg,
      currentTargetReps: state.currentTargetReps,
      currentTargetSets: state.currentTargetSets,
      currentTargetDurationSec: state.currentTargetDurationSec,
      currentTargetDistanceM: state.currentTargetDistanceM,
      currentTargetSteps: state.currentTargetSteps,
      successCountSinceProgression: state.successCountSinceProgression,
      lastSessionResult: state.lastSessionResult,
      lastProgressedAt: state.lastProgressedAt,
      manualOverride: state.manualOverride,
      lastSessionAt: state.lastSessionAt,
      lastProgressionOutcome: state.lastProgressionOutcome,
      deletedAt: undefined,
    });

    const updatedRow = this.toMutableUpdate(toExerciseProgressStateRow(updated));
    updatedRow.deleted_at = null;
    await this.updateRow(WAYMARK_TABLES.exerciseProgressStates, updatedRow);
    return updated;
  }
}

async function defaultRootDatabaseProvider(): Promise<SQLiteTransactionalDatabase> {
  const { getWaymarkDatabaseAsync } = require("../sqlite") as typeof import("../sqlite");
  return getWaymarkDatabaseAsync() as Promise<SQLiteTransactionalDatabase>;
}

export function createSQLiteRepositoryProvider(
  rootDatabaseProvider: () => Promise<SQLiteTransactionalDatabase> = defaultRootDatabaseProvider,
  executorProvider: SQLiteExecutorProvider = rootDatabaseProvider,
  transactionScoped = false,
): WaymarkRepositories {
  const repositories = {} as WaymarkRepositories;

  repositories.userProfiles = new SQLiteUserProfileRepository(executorProvider, transactionScoped);
  repositories.paths = new SQLitePathRepository(executorProvider, transactionScoped);
  repositories.expeditions = new SQLiteExpeditionRepository(executorProvider, transactionScoped);
  repositories.trailDays = new SQLiteTrailDayRepository(executorProvider, transactionScoped);
  repositories.marks = new SQLiteMarkRepository(executorProvider, transactionScoped);
  repositories.packChecks = new SQLitePackCheckRepository(executorProvider, transactionScoped);
  repositories.signals = new SQLiteSignalRepository(executorProvider, transactionScoped);
  repositories.memories = new SQLiteMemoryRepository(executorProvider, transactionScoped);
  repositories.backlog = new SQLiteBacklogRepository(executorProvider, transactionScoped);
  repositories.weekPlans = new SQLiteWeekPlanRepository(executorProvider, transactionScoped);
  repositories.dependencies = new SQLiteDependencyRepository(executorProvider, transactionScoped);
  repositories.media = new SQLiteMediaRepository(executorProvider, transactionScoped);
  repositories.dailyMediaUploadBatches = new SQLiteDailyMediaUploadBatchRepository(executorProvider, transactionScoped);
  repositories.appSettings = new SQLiteAppSettingsRepository(executorProvider, transactionScoped);
  repositories.strength = new SQLiteStrengthRepository(executorProvider, transactionScoped);
  repositories.transaction = new SQLiteTransactionRunner(rootDatabaseProvider, transactionScoped ? repositories : null);

  return repositories;
}
