import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createSQLiteRepositoryProvider } from "../src/db/adapters";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import { verifyWaymarkSchemaAsync } from "../src/db/schemaVerification";
import {
  BacklogItemHorizon,
  BacklogItemStatus,
  BacklogItemType,
  DependencyRequiredEntityType,
  DependencyStatus,
  DependencyType,
  ExerciseCategory,
  ExerciseTargetType,
  ExpeditionStatus,
  MarkInstanceOrigin,
  MarkInstanceStatus,
  MarkTemplateType,
  MediaAssetKind,
  MediaAssetOwnerType,
  MediaAssetType,
  MemoryPrivacy,
  MilestoneStatus,
  PackCheckInstanceStatus,
  PathStatus,
  RecurrenceKind,
  SessionExerciseStatus,
  SignalStatus,
  SignalTargetType,
  TrailDayStatus,
  UserProfile,
  WeekPlanItemStatus,
  WeekPlanStatus,
  WorkoutExercisePhase,
  WorkoutRoutineType,
  WorkoutSessionPhase,
  WorkoutSessionStatus,
} from "../src/domain/waymark";
import type { CaptureMediaAttachment } from "../src/types/capture";
import {
  bootstrapWaymarkMap,
  evaluateWeightMilestoneProgress,
  createCloseTrailEngine,
  createDefaultDependencyEngine,
  createMarkEngine,
  createPackCheckEngine,
  createSignalEngine,
  createQuickCaptureMark,
  ensureStrictSignalBehavior,
  getMarkMetadata,
  getMarkTemplateSeedMetadata,
  getSignalBehavior,
  listHealthMeasurements,
  listSeedRecords,
  listSignalConfigs,
  listDisciplineProofsByTrailDay,
  loadPackCheckDetailReadModel,
  loadStrengthSessionReadModel,
  markSeedRecordUserModified,
  importWeeklyTimetable,
  recordHealthMeasurement,
  getPackCheckSurfacePolicy,
  setPackCheckSurfacePolicy,
  setSignalBehavior,
  setSignalConfig,
  setMarkMetadata,
  togglePackCheckDetailItem,
  completePackCheckDetail,
  createDisciplineProof,
  createStrengthProgressionService,
  createStrengthSessionEngine,
  evaluateWorkoutEndDisposition,
  getWorkoutCycleStep,
  projectCharacterFromRecords,
  RUNTIME_AUTO_GENERATE_PLANNED_MARKS_KEY,
  repairWeeklyTimetableMilestoneLinksForExpedition,
  repairAuthoritativeWorkoutRoutines,
  resolveAnchorPathIdForDate,
} from "../src/lib/waymark";
import {
  buildChippingShortGamePracticePlanForMarkTitle,
  buildPuttingShortGamePracticePlanForMarkTitle,
  resolveGolfPracticeWorkoutTypeForMarkTitle,
} from "../src/lib/waymark/golfPracticeMark";
import { importWeeklyTimetable20260622To0628 } from "../src/app/weeklyTimetableImport20260622";
import { importWeeklyTimetable20260629To0705, importWeeklyTimetable202607020305Patch } from "../src/app/weeklyTimetableImport20260629";
import { importWeeklyTimetable20260706To0712 } from "../src/app/weeklyTimetableImport20260706";
import { importBreakfastMarks20260713To0719, importWeeklyTimetable20260713To0719 } from "../src/app/weeklyTimetableImport20260713";
import { importWeekendHospitalCarePatch20260725To0726, importWeeklyTimetable20260720To0726 } from "../src/app/weeklyTimetableImport20260720";
import { importWeeklyTimetable20260727To0802 } from "../src/app/weeklyTimetableImport20260727";
import { importWeeklyTimetable20260803To0809 } from "../src/app/weeklyTimetableImport20260803";
import { clearPackCheckDetail, deleteMarkDetail, deleteMemoryDetail, deletePackCheckDetail } from "../src/lib/waymark/shellAppAdapters";
import {
  buildCharacterPathProofItems,
  buildPathProofItems,
  mapMarkToJournalEntry,
} from "../src/app/readModelProjections";
import { buildCloseTrailFixture } from "../src/app/closeTrailViewModel";
import { resolveDailyJournalContentState } from "../src/app/dailyJournalViewState";
import { createJournalMemoryCapture } from "../src/app/journalMemoryCapture";
import { mapMemoryToDailyEntry } from "../src/app/journalEntryMappers";
import { normalizeWaymarkMediaDrafts, saveMediaAssetsForOwner } from "../src/app/waymarkMediaPipeline";
import { runDailyMediaUpload } from "../src/app/dailyMediaUploadService";
import { FakeDriveAdapter } from "../src/app/driveMediaAdapter";
import {
  importSampleWeeklyTimetable20260601To0607,
  SAMPLE_WEEKLY_TIMETABLE_2026_06_01_TO_06_07_COUNTS,
} from "../src/app/sampleWeeklyTimetableImport";
import { materializeRuntimeForDate } from "../src/app/runtimeLifecycle";
import { runWaymarkVaultBootGateAsync } from "../src/app/waymarkVaultBootGate";
import { loadTodayData } from "../src/app/todayDataLoader";
import { buildExpeditionDetailModel } from "../src/app/expeditionDetailModel";
import { PACK_CHECK_CATALOG } from "../src/config/packCheckCatalog";
import { runPostMigrationBackfillsAsync } from "../src/db/migrations/postMigrationBackfills";
import { resolveSelectedDisciplines } from "../src/components/close-trail/model";
import { mapTodayMarkToActionSheetMark } from "../src/app/todayMarkActionSheetMapper";
import { sanitizeImportedWeeklyPlannedStorageText } from "../src/lib/waymark/userFacingMarkText";
import { canSeedEntity, SEED_CLASSIFICATION_REPORT, WAYMARK_MAP_CONFIG } from "../src/waymark-map";
import { WEEKLY_TIMETABLE_EXPECTED_COUNTS, WEEKLY_TIMETABLE_IMPORT_FIXTURE } from "./weekly-timetable-import.fixture";

type RunResult = {
  changes: number;
  lastInsertRowId: number;
};

type TestCase = {
  name: string;
  run: () => Promise<void>;
};

class NodeSqliteAdapter {
  constructor(private readonly db: DatabaseSync) {}

  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
  }

  async runAsync(source: string, ...params: unknown[]): Promise<RunResult> {
    const result = this.db.prepare(source).run(...(params as any[]));
    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid ?? 0),
    };
  }

  async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
    return (this.db.prepare(source).get(...(params as any[])) as T | undefined) ?? null;
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(source).all(...(params as any[])) as T[];
  }

  async withExclusiveTransactionAsync(task: (txn: NodeSqliteAdapter) => Promise<void>): Promise<void> {
    this.db.exec("BEGIN IMMEDIATE;");
    const txn = new NodeSqliteAdapter(this.db);
    try {
      await task(txn);
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }
}

async function createHarness() {
  const database = new DatabaseSync(":memory:");
  const adapter = new NodeSqliteAdapter(database);
  await applyMigrationsAsync(adapter as never);
  const repos = createSQLiteRepositoryProvider(
    async () => adapter as never,
    async () => adapter as never,
    false,
  );

  return {
    db: adapter,
    repos,
    close: () => database.close(),
  };
}

async function createPathAndTrailDay(harness: Awaited<ReturnType<typeof createHarness>>, userId: string, localDate: string) {
  const path = await harness.repos.paths.createPath({
    userId,
    slug: `path-${localDate}`,
    title: `Path ${localDate}`,
    sortOrder: 0,
  });
  const trailDay = await harness.repos.trailDays.getOrCreateTrailDay(userId, localDate);
  return { path, trailDay };
}

async function bootstrapFullConfig(harness: Awaited<ReturnType<typeof createHarness>>, userId = "user_1") {
  return bootstrapWaymarkMap({ repositories: harness.repos, userId }, WAYMARK_MAP_CONFIG, {
    mode: "development",
    includeDevDemoSeed: true,
    includeBlockedUserOwnedSeed: true,
  });
}

function createShellAdapter(
  harness: Awaited<ReturnType<typeof createHarness>>,
  user: UserProfile,
  overrides: Partial<{
    markEngine: ReturnType<typeof createMarkEngine>;
    packCheckEngine: ReturnType<typeof createPackCheckEngine>;
    dependencyEngine: ReturnType<typeof createDefaultDependencyEngine>;
    signalEngine: ReturnType<typeof createSignalEngine>;
  }> = {},
) {
  return {
    repositories: harness.repos,
    user,
    markEngine: overrides.markEngine ?? createMarkEngine(harness.repos),
    packCheckEngine: overrides.packCheckEngine ?? createPackCheckEngine(harness.repos),
    dependencyEngine: overrides.dependencyEngine ?? createDefaultDependencyEngine(harness.repos),
    signalEngine: overrides.signalEngine ?? createSignalEngine(harness.repos),
  };
}

async function getPathByTitle(harness: Awaited<ReturnType<typeof createHarness>>, userId: string, title: string) {
  const paths = await harness.repos.paths.listActivePaths(userId);
  return paths.find((path) => path.title === title) ?? null;
}

async function createMark(
  harness: Awaited<ReturnType<typeof createHarness>>,
  options: {
    userId?: string;
    localDate?: string;
    pathId?: string;
    trailDayId?: string;
    title?: string;
    status?: MarkInstanceStatus;
    origin?: MarkInstanceOrigin;
    templateId?: string;
    generationKey?: string;
  } = {},
) {
  const userId = options.userId ?? "user_1";
  const localDate = options.localDate ?? "2026-05-24";
  let pathId = options.pathId;
  let trailDayId = options.trailDayId;

  if (!pathId || !trailDayId) {
    const base = await createPathAndTrailDay(harness, userId, localDate);
    pathId = pathId ?? base.path.id;
    trailDayId = trailDayId ?? base.trailDay.id;
  }

  return harness.repos.marks.createMarkInstance({
    userId,
    pathId,
    trailDayId,
    templateId: options.templateId ?? null,
    title: options.title ?? "Test mark",
    origin: options.origin ?? MarkInstanceOrigin.ManualPlan,
    status: options.status ?? MarkInstanceStatus.Planned,
    generationKey: options.generationKey ?? null,
    proofMediaAssetIds: [],
  });
}

async function importApprovedWeeklyTimetable(
  harness: Awaited<ReturnType<typeof createHarness>>,
  userId = "user_1",
) {
  return importWeeklyTimetable(harness.repos, {
    userId,
    weekStartDate: "2026-05-25",
    weekEndDate: "2026-06-07",
    note: "Approved weekly timetable import",
    importBatchId: "weekly_import_2026_05_25_fixture",
    items: WEEKLY_TIMETABLE_IMPORT_FIXTURE,
  });
}

async function listMarksByDateMap(
  harness: Awaited<ReturnType<typeof createHarness>>,
  userId: string,
  dates: string[],
) {
  const entries = await Promise.all(
    dates.map(async (date) => [date, await harness.repos.marks.listMarkInstancesByDate(userId, date)] as const),
  );
  return Object.fromEntries(entries);
}

async function createPackCheckTemplate(
  harness: Awaited<ReturnType<typeof createHarness>>,
  options: {
    userId?: string;
    pathId?: string | null;
    title?: string;
    defaultAvailableOffsetMin?: number;
    defaultDueOffsetMin?: number;
    isActive?: boolean;
  } = {},
) {
  return harness.repos.packChecks.upsertTemplate({
    id: `pct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    userId: options.userId ?? "user_1",
    pathId: options.pathId ?? undefined,
    title: options.title ?? "Pack check",
    defaultAvailableOffsetMin: options.defaultAvailableOffsetMin,
    defaultDueOffsetMin: options.defaultDueOffsetMin,
    isActive: options.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function createPackCheckItemTemplate(
  harness: Awaited<ReturnType<typeof createHarness>>,
  templateId: string,
  label: string,
  isRequired: boolean,
  orderIndex: number,
) {
  const [item] = await harness.repos.packChecks.upsertItemTemplates([
    {
      id: `pct_item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      packCheckTemplateId: templateId,
      label,
      isRequired,
      orderIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
  return item!;
}

async function createPackCheckInstance(
  harness: Awaited<ReturnType<typeof createHarness>>,
  options: {
    userId?: string;
    templateId?: string;
    trailDayId: string;
    targetMarkInstanceId?: string;
    title?: string;
    description?: string;
    status?: PackCheckInstanceStatus;
    availableFrom?: string;
    dueAt?: string;
    generationKey?: string;
  },
) {
  return harness.repos.packChecks.upsertInstance({
    id: `pci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    userId: options.userId ?? "user_1",
    templateId: options.templateId,
    trailDayId: options.trailDayId,
    targetMarkInstanceId: options.targetMarkInstanceId,
    title: options.title ?? "Pack check instance",
    description: options.description,
    status: options.status ?? PackCheckInstanceStatus.Scheduled,
    availableFrom: options.availableFrom,
    dueAt: options.dueAt,
    generationKey: options.generationKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function createSignal(
  harness: Awaited<ReturnType<typeof createHarness>>,
  options: {
    userId?: string;
    targetType: SignalTargetType;
    targetId: string;
    scheduledAt?: string;
    status?: SignalStatus;
    ringingStartedAt?: string;
    snoozedUntil?: string;
    resolvedAt?: string;
    dismissedAt?: string;
    expiredAt?: string;
    cancelledAt?: string;
  },
) {
  return harness.repos.signals.createSignal({
    userId: options.userId ?? "user_1",
    targetType: options.targetType,
    targetId: options.targetId,
    scheduledAt: options.scheduledAt ?? "2026-06-07T07:00:00.000Z",
    status: options.status ?? SignalStatus.Scheduled,
    ringingStartedAt: options.ringingStartedAt,
    snoozedUntil: options.snoozedUntil,
    resolvedAt: options.resolvedAt,
    dismissedAt: options.dismissedAt,
    expiredAt: options.expiredAt,
    cancelledAt: options.cancelledAt,
  });
}

async function createExerciseDefinition(
  harness: Awaited<ReturnType<typeof createHarness>>,
  options: {
    id?: string;
    userId?: string;
    pathId?: string;
    title: string;
    canonicalSlug: string;
    category: ExerciseCategory;
    targetType: ExerciseTargetType;
    defaultRestSec?: number;
    defaultUnit?: string;
  },
) {
  return harness.repos.strength.upsertExerciseDefinition({
    id: options.id ?? `ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    userId: options.userId ?? "user_1",
    pathId: options.pathId,
    title: options.title,
    canonicalSlug: options.canonicalSlug,
    category: options.category,
    targetType: options.targetType,
    defaultRestSec: options.defaultRestSec,
    defaultUnit: options.defaultUnit,
    isSystem: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function createWorkoutRoutine(
  harness: Awaited<ReturnType<typeof createHarness>>,
  options: {
    id?: string;
    userId?: string;
    pathId: string;
    markTemplateId?: string;
    title: string;
    routineType: WorkoutRoutineType;
    cycleKey?: string;
  },
) {
  return harness.repos.strength.upsertRoutine({
    id: options.id ?? `routine_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    userId: options.userId ?? "user_1",
    pathId: options.pathId,
    markTemplateId: options.markTemplateId,
    title: options.title,
    routineType: options.routineType,
    cycleKey: options.cycleKey,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function addRoutineExercise(
  harness: Awaited<ReturnType<typeof createHarness>>,
  options: {
    id?: string;
    routineId: string;
    exerciseDefinitionId: string;
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
  },
) {
  const [item] = await harness.repos.strength.upsertRoutineExercises([
    {
      id: options.id ?? `routine_ex_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      workoutRoutineTemplateId: options.routineId,
      exerciseDefinitionId: options.exerciseDefinitionId,
      phase: options.phase,
      orderIndex: options.orderIndex,
      targetType: options.targetType,
      targetLoadKg: options.targetLoadKg,
      targetReps: options.targetReps,
      targetSets: options.targetSets,
      targetDurationSec: options.targetDurationSec,
      targetDistanceM: options.targetDistanceM,
      targetSteps: options.targetSteps,
      restDurationSec: options.restDurationSec,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
  return item!;
}

const tests: TestCase[] = [
  {
    name: "DB opens and migrations are applied",
    run: async () => {
      const harness = await createHarness();
      try {
        const report = await verifyWaymarkSchemaAsync(harness.db as never);
        assert.equal(report.ok, true);
        assert.ok(report.appliedSchemaVersion >= 1);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Vault boot gate creates local provenance and sync state before seed",
    run: async () => {
      const harness = await createHarness();
      try {
        const result = await runWaymarkVaultBootGateAsync(harness.db as never, {
          mapVersion: 42,
          seedVersion: 42,
          clientType: "main",
          cloudRestoreConfigured: false,
          now: 1_000,
        });

        assert.equal(result.isFreshDb, true);
        assert.equal(result.metadata.restoreState, "fresh_local");
        assert.equal(result.protectionStatus, "local_only");

        const metadataRows = await harness.db.getAllAsync<{ db_instance_id: string; vault_id: string; device_id: string }>(
          "SELECT db_instance_id, vault_id, device_id FROM app_db_metadata;",
        );
        assert.equal(metadataRows.length, 1);

        const syncState = await harness.db.getFirstAsync<{ protection_status: string; sync_mode: string }>(
          "SELECT protection_status, sync_mode FROM sync_state WHERE vault_id = ? AND device_id = ?;",
          metadataRows[0]!.vault_id,
          metadataRows[0]!.device_id,
        );
        assert.equal(syncState?.protection_status, "local_only");
        assert.equal(syncState?.sync_mode, "none");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Fresh DB with restore configured calls restore gate before seed",
    run: async () => {
      const harness = await createHarness();
      const events: string[] = [];
      try {
        const boot = await runWaymarkVaultBootGateAsync(harness.db as never, {
          mapVersion: 1,
          seedVersion: 1,
          clientType: "lite",
          cloudRestoreConfigured: true,
          now: 2_000,
          restoreWaymarkVault: async () => {
            events.push("restore");
            return { restored: true };
          },
        });
        events.push("seed");
        await bootstrapWaymarkMap(
          { repositories: harness.repos, userId: "user_1" },
          { version: 1, paths: [{ sourceSeedId: "family", slug: "family", title: "Family", sortOrder: 0 }] },
        );

        assert.deepEqual(events, ["restore", "seed"]);
        assert.equal(boot.restoreAttempted, true);
        assert.equal(boot.restoreCompleted, true);
        assert.equal(boot.metadata.restoreState, "restored_from_cloud");
        assert.equal(boot.metadata.clientType, "lite");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Production seed skips user-owned and demo-only seed categories",
    run: async () => {
      const harness = await createHarness();
      try {
        assert.equal(canSeedEntity("daily_mark_assignment"), false);
        assert.equal(canSeedEntity("backlog_item"), false);
        assert.ok(SEED_CLASSIFICATION_REPORT.some((row) => row.entityType === "daily_mark_assignment" && row.classification === "user_owned_blocked"));

        await bootstrapWaymarkMap(
          { repositories: harness.repos, userId: "user_1" },
          {
            version: 1,
            paths: [{ sourceSeedId: "career", slug: "career", title: "Career", sortOrder: 0 }],
            markTemplates: [
              {
                sourceSeedId: "career.template",
                pathSeedId: "career",
                title: "Template",
                templateType: MarkTemplateType.Routine,
                recurrenceRule: { kind: RecurrenceKind.Manual },
              },
            ],
            dailyMarkAssignments: [
              {
                sourceSeedId: "daily.assignment",
                localDate: "2026-06-10",
                markTemplateSeedId: "career.template",
                title: "Blocked planned mark",
                orderIndex: 0,
              },
            ],
            backlogItems: [
              {
                sourceSeedId: "demo.backlog",
                title: "Blocked backlog",
                itemType: BacklogItemType.Idea,
                horizon: BacklogItemHorizon.Near,
                status: BacklogItemStatus.Open,
              },
            ],
          },
        );

        const seedRecords = await listSeedRecords(harness.repos.appSettings, "user_1");
        assert.equal(seedRecords.some((record) => record.entityType === "daily_mark_assignment"), false);
        assert.equal(seedRecords.some((record) => record.entityType === "backlog_item"), false);
        assert.equal((await harness.repos.backlog.listActiveBacklogItems("user_1")).length, 0);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "UserProfileRepository getOrCreateLocalUserProfile does not duplicate profile",
    run: async () => {
      const harness = await createHarness();
      try {
        const first = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "vi-VN",
          timezone: "Asia/Saigon",
          weekStartsOn: 1,
        });
        const second = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 0,
        });

        assert.equal(first.id, second.id);
        const fetched = await harness.repos.userProfiles.getUserProfileById("user_1");
        assert.equal(fetched?.locale, "vi-VN");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "UserProfileRepository updateUserProfile updates allowed fields only",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "vi-VN",
          timezone: "Asia/Saigon",
          weekStartsOn: 1,
        });
        const updated = await harness.repos.userProfiles.updateUserProfile("user_1", {
          displayName: "Admin",
          locale: "en-US",
          closeTrailPromptTime: "21:30",
        });
        assert.equal(updated.displayName, "Admin");
        assert.equal(updated.locale, "en-US");
        assert.equal(updated.userId, "user_1");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "AppSettingsRepository can set and get JSON setting",
    run: async () => {
      const harness = await createHarness();
      try {
        const created = await harness.repos.appSettings.setSetting("user_1", "today.anchorPathId", {
          pathId: "path_123",
          pinned: true,
        });
        assert.equal(created.userId, "user_1");
        assert.ok(!("value_json" in created));

        const fetched = await harness.repos.appSettings.getSetting("user_1", "today.anchorPathId");
        assert.deepEqual(fetched?.value, { pathId: "path_123", pinned: true });

        await harness.repos.appSettings.setSetting("user_1", "today.anchorPathId", { pathId: "path_456" });
        const all = await harness.repos.appSettings.listSettings("user_1");
        assert.equal(all.length, 1);
        assert.deepEqual(all[0]?.value, { pathId: "path_456" });
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "deleteMarkDetail soft-deletes planned mark, linked checklist, and cancels signals",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-05-22");
        const mark = await createMark(harness, {
          userId: user.id,
          localDate: "2026-05-22",
          pathId: path.id,
          trailDayId: trailDay.id,
          title: "Planned mark to delete",
        });
        const packTemplate = await createPackCheckTemplate(harness, {
          userId: user.id,
          pathId: path.id,
          title: "Linked checklist",
        });
        const packCheck = await createPackCheckInstance(harness, {
          userId: user.id,
          templateId: packTemplate.id,
          trailDayId: trailDay.id,
          targetMarkInstanceId: mark.id,
          title: "Linked checklist",
          status: PackCheckInstanceStatus.Available,
        });
        const [packItem] = await harness.repos.packChecks.upsertItemInstances([
          {
            id: "pci_item_delete_mark",
            packCheckInstanceId: packCheck.id,
            label: "Check item",
            isRequired: true,
            isChecked: false,
            orderIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        assert.ok(packItem);

        const markSignal = await createSignal(harness, {
          userId: user.id,
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
        });
        const packSignal = await createSignal(harness, {
          userId: user.id,
          targetType: SignalTargetType.PackCheckInstance,
          targetId: packCheck.id,
        });

        await deleteMarkDetail(createShellAdapter(harness, user), mark.id);

        assert.equal(await harness.repos.marks.getMarkInstanceById(mark.id), null);
        assert.equal(await harness.repos.packChecks.getInstanceById(packCheck.id), null);
        assert.equal((await harness.repos.packChecks.listItemInstances(packCheck.id)).length, 0);
        assert.equal((await harness.repos.signals.getSignalById(markSignal.id))?.status, SignalStatus.Cancelled);
        assert.equal((await harness.repos.signals.getSignalById(packSignal.id))?.status, SignalStatus.Cancelled);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "deleteMarkDetail soft-deletes quick mark",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-05-22");
        const quickMark = await createMark(harness, {
          userId: user.id,
          localDate: "2026-05-22",
          pathId: path.id,
          trailDayId: trailDay.id,
          title: "Quick mark to delete",
          origin: MarkInstanceOrigin.QuickCapture,
        });

        await deleteMarkDetail(createShellAdapter(harness, user), quickMark.id);

        assert.equal(await harness.repos.marks.getMarkInstanceById(quickMark.id), null);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "deleteMemoryDetail soft-deletes memory",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay(user.id, "2026-05-22");
        const memory = await harness.repos.memories.createMemory({
          userId: user.id,
          trailDayId: trailDay.id,
          title: "Memory to delete",
          note: "Delete me",
          capturedAt: "2026-05-22T08:00:00.000Z",
          privacy: MemoryPrivacy.Private,
          mediaAssetIds: [],
        });

        await deleteMemoryDetail(createShellAdapter(harness, user), memory.id);

        assert.equal(await harness.repos.memories.getMemoryById(memory.id), null);
        assert.equal((await harness.repos.memories.listMemoriesByTrailDay(trailDay.id)).length, 0);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "BacklogRepository soft delete hides backlog item from reads",
    run: async () => {
      const harness = await createHarness();
      try {
        const item = await harness.repos.backlog.upsert({
          id: "backlog_delete_1",
          userId: "user_1",
          title: "Backlog to delete",
          description: "Delete me",
          itemType: BacklogItemType.Project,
          horizon: BacklogItemHorizon.Near,
          status: BacklogItemStatus.Open,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        await harness.repos.backlog.softDeleteBacklogItem(item.id);

        assert.equal(await harness.repos.backlog.getById(item.id), null);
        assert.equal((await harness.repos.backlog.listActiveBacklogItems("user_1")).length, 0);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "WeekPlanRepository soft delete hides weekly item from reads",
    run: async () => {
      const harness = await createHarness();
      try {
        const backlog = await harness.repos.backlog.upsert({
          id: "backlog_weekly_delete_1",
          userId: "user_1",
          title: "Weekly source item",
          description: "Delete weekly item",
          itemType: BacklogItemType.Project,
          horizon: BacklogItemHorizon.Near,
          status: BacklogItemStatus.Pulled,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        const weekPlan = await harness.repos.weekPlans.upsertWeekPlan({
          id: "week_plan_delete_1",
          userId: "user_1",
          weekStartDate: "2026-05-18",
          weekEndDate: "2026-05-24",
          status: WeekPlanStatus.Active,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        const [item] = await harness.repos.weekPlans.upsertItems([
          {
            id: "week_plan_item_delete_1",
            weekPlanId: weekPlan.id,
            backlogItemId: backlog.id,
            status: WeekPlanItemStatus.Pulled,
            sortOrder: 0,
            orderIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);

        await harness.repos.weekPlans.softDeleteWeekPlanItem(item!.id);

        assert.equal(await harness.repos.weekPlans.getItemById(item!.id), null);
        assert.equal((await harness.repos.weekPlans.listItems(weekPlan.id)).length, 0);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "deletePackCheckDetail soft-deletes checklist and cancels signals",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-05-22");
        const packTemplate = await createPackCheckTemplate(harness, {
          userId: user.id,
          pathId: path.id,
          title: "Checklist to delete",
        });
        const packCheck = await createPackCheckInstance(harness, {
          userId: user.id,
          templateId: packTemplate.id,
          trailDayId: trailDay.id,
          title: "Checklist to delete",
          status: PackCheckInstanceStatus.Available,
        });
        await harness.repos.packChecks.upsertItemInstances([
          {
            id: "pci_item_delete_pack",
            packCheckInstanceId: packCheck.id,
            label: "Item one",
            isRequired: true,
            isChecked: false,
            orderIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        const signal = await createSignal(harness, {
          userId: user.id,
          targetType: SignalTargetType.PackCheckInstance,
          targetId: packCheck.id,
        });

        await deletePackCheckDetail(createShellAdapter(harness, user), packCheck.id);

        assert.equal(await harness.repos.packChecks.getInstanceById(packCheck.id), null);
        assert.equal((await harness.repos.packChecks.listItemInstances(packCheck.id)).length, 0);
        assert.equal((await harness.repos.signals.getSignalById(signal.id))?.status, SignalStatus.Cancelled);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "TrailDayRepository reflection entries can be written and fetched by TrailDay",
    run: async () => {
      const harness = await createHarness();
      try {
        const day = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-17");
        await harness.repos.trailDays.replaceReflectionEntries(day.id, [
          { cluster: "wins", text: "Shipped repo pass", orderIndex: 0 },
          { cluster: "lesson", text: "Keep patches explicit", orderIndex: 1 },
        ]);

        const entries = await harness.repos.trailDays.listReflectionEntries(day.id);
        assert.equal(entries.length, 2);
        assert.equal(entries[0]?.cluster, "wins");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "replaceReflectionEntries is atomic",
    run: async () => {
      const harness = await createHarness();
      try {
        const day = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-16");
        await harness.repos.trailDays.replaceReflectionEntries(day.id, [
          { cluster: "baseline", text: "Original", orderIndex: 0 },
        ]);

        await assert.rejects(() =>
          harness.repos.transaction.runInTransaction(async (txRepos) => {
            await txRepos.trailDays.replaceReflectionEntries(day.id, [
              { cluster: "next", text: "Should rollback", orderIndex: 0 },
            ]);
            throw new Error("force rollback after replacement");
          }),
        );

        const entries = await harness.repos.trailDays.listReflectionEntries(day.id);
        assert.equal(entries.length, 1);
        assert.equal(entries[0]?.cluster, "baseline");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrailEngine readiness when all planned marks are resolved",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-19");
        await createMark(harness, { trailDayId: trailDay.id, status: MarkInstanceStatus.Completed });
        const engine = createCloseTrailEngine(harness.repos);
        const readiness = await engine.evaluateCloseReadiness(trailDay.id, "2026-05-19T20:00:00.000Z");
        assert.equal(readiness.canClose, true);
        assert.equal(readiness.reasonCode, "all_planned_marks_resolved");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrailEngine readiness at or after 21:30 with unresolved marks",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-19");
        await createMark(harness, { trailDayId: trailDay.id, status: MarkInstanceStatus.Planned });
        const engine = createCloseTrailEngine(harness.repos);
        const readiness = await engine.evaluateCloseReadiness(trailDay.id, "2026-05-19T21:30:00.000Z");
        assert.equal(readiness.canClose, true);
        assert.equal(readiness.reasonCode, "time_threshold_with_marks");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrailEngine readiness for memory or quick mark day after threshold",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-19");
        await harness.repos.memories.createMemory({
          userId: "user_1",
          trailDayId: trailDay.id,
          title: "Captured memory",
          note: "Reflective note",
          capturedAt: "2026-05-19T18:00:00.000Z",
          privacy: MemoryPrivacy.Private,
          location: undefined,
          mediaAssetIds: [],
        });
        await createMark(harness, {
          trailDayId: trailDay.id,
          status: MarkInstanceStatus.Completed,
          origin: MarkInstanceOrigin.QuickCapture,
        });
        const engine = createCloseTrailEngine(harness.repos);
        const readiness = await engine.evaluateCloseReadiness(trailDay.id, "2026-05-19T21:30:00.000Z");
        assert.equal(readiness.canClose, true);
        assert.equal(readiness.reasonCode, "time_threshold_memories_or_quick_marks");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrailEngine empty day is not auto-ready",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-19");
        const engine = createCloseTrailEngine(harness.repos);
        const readiness = await engine.evaluateCloseReadiness(trailDay.id, "2026-05-19T21:30:00.000Z");
        assert.equal(readiness.canClose, false);
        assert.equal(readiness.reasonCode, "no_activity");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrailEngine rejects not-ready close without manualCloseReason",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-19");
        await createMark(harness, { trailDayId: trailDay.id, status: MarkInstanceStatus.Planned });
        const engine = createCloseTrailEngine(harness.repos);
        await assert.rejects(
          () =>
            engine.closeTrailDay({
              trailDayId: trailDay.id,
              closedAt: "2026-05-19T20:00:00.000Z",
            }),
          {
            name: "CloseTrailEngineValidationError",
          },
        );
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrailEngine full close and reopen flow stores only read-model summaries",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-19");
        await harness.repos.trailDays.replaceReflectionEntries(trailDay.id, [
          { cluster: "baseline", text: "start", orderIndex: 0 },
        ]);
        await createMark(harness, { trailDayId: trailDay.id, status: MarkInstanceStatus.Planned });
        const signal = await createSignal(harness, {
          targetType: SignalTargetType.TrailDay,
          targetId: trailDay.id,
          status: SignalStatus.Scheduled,
          scheduledAt: "2026-05-19T08:00:00.000Z",
        });

        const engine = createCloseTrailEngine(harness.repos);
        const result = await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-05-19T22:00:00.000Z",
          manualCloseReason: "Forced close",
          tomorrowFirstStep: "Begin with hydration",
          reflectionEntries: [
            { cluster: "wins", text: "Shipped code", orderIndex: 0 },
          ],
        });

        assert.equal(result.trailDay.status, TrailDayStatus.Closed);
        assert.equal(result.trailDay.closedAt, "2026-05-19T22:00:00.000Z");
        assert.equal(result.trailDay.tomorrowFirstStep, "Begin with hydration");
        assert.equal(result.reflectionEntries.length, 1);
        assert.equal(result.reflectionEntries[0]?.cluster, "wins");
        assert.equal(result.summary.plannedCount, 1);
        assert.equal(result.trailDay.plannedMarkCount, 0);

        const reloadedSignal = await harness.repos.signals.getSignalById(signal.id);
        assert.equal(reloadedSignal?.status, SignalStatus.Resolved);
        assert.equal(reloadedSignal?.resolvedAt, "2026-05-19T22:00:00.000Z");

        const tomorrow = await harness.repos.trailDays.getTrailDayByDate("user_1", "2026-05-20");
        assert.equal(tomorrow, null);

        const reopened = await engine.reopenTrailDay({
          trailDayId: trailDay.id,
          reopenedAt: "2026-05-20T07:00:00.000Z",
        });
        assert.equal(reopened.status, TrailDayStatus.Reopened);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "PathRepository can create, list, update, and soft-delete paths",
    run: async () => {
      const harness = await createHarness();
      try {
        const created = await harness.repos.paths.createPath({
          userId: "user_1",
          slug: "health",
          title: "Health",
          sortOrder: 0,
          status: PathStatus.Active,
        });

        assert.equal(created.title, "Health");
        assert.ok(!("sort_order" in created));

        const fetched = await harness.repos.paths.getPathById(created.id);
        assert.equal(fetched?.slug, "health");

        const updated = await harness.repos.paths.updatePath(created.id, {
          title: "Health Core",
          description: "Training and recovery",
        });
        assert.equal(updated.title, "Health Core");
        assert.equal(updated.description, "Training and recovery");

        const active = await harness.repos.paths.listActivePaths("user_1");
        assert.equal(active.length, 1);

        await harness.repos.paths.softDeletePath(created.id);
        const deleted = await harness.repos.paths.getPathById(created.id);
        assert.equal(deleted, null);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "reorderPaths updates sort order atomically",
    run: async () => {
      const harness = await createHarness();
      try {
        const a = await harness.repos.paths.createPath({ userId: "user_1", slug: "a", title: "A", sortOrder: 0 });
        const b = await harness.repos.paths.createPath({ userId: "user_1", slug: "b", title: "B", sortOrder: 1 });
        const c = await harness.repos.paths.createPath({ userId: "user_1", slug: "c", title: "C", sortOrder: 2 });

        await harness.repos.paths.reorderPaths("user_1", [c.id, a.id, b.id]);
        const reordered = await harness.repos.paths.listActivePaths("user_1");
        assert.deepEqual(
          reordered.map((item) => item.id),
          [c.id, a.id, b.id],
        );

        await assert.rejects(() => harness.repos.paths.reorderPaths("user_1", [a.id, "missing_path", c.id]));
        const afterFailure = await harness.repos.paths.listActivePaths("user_1");
        assert.deepEqual(
          afterFailure.map((item) => item.id),
          [c.id, a.id, b.id],
        );
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "TrailDayRepository getOrCreate is idempotent by user/date",
    run: async () => {
      const harness = await createHarness();
      try {
        const dayA = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-18");
        const dayB = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-18");
        assert.equal(dayA.id, dayB.id);

        const fetched = await harness.repos.trailDays.getTrailDayByDate("user_1", "2026-05-18");
        assert.equal(fetched?.id, dayA.id);

        const updated = await harness.repos.trailDays.updateCloseState(dayA.id, {
          status: TrailDayStatus.ReadyToClose,
          closeSummary: "Solid day.",
        });
        assert.equal(updated.status, TrailDayStatus.ReadyToClose);
        assert.equal(updated.closeSummary, "Solid day.");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkRepository can create MarkInstance with required trailDayId",
    run: async () => {
      const harness = await createHarness();
      try {
        const path = await harness.repos.paths.createPath({
          userId: "user_1",
          slug: "career",
          title: "Career",
          sortOrder: 0,
        });
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-18");

        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          title: "Ship repository slice",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Planned,
        });

        assert.equal(mark.trailDayId, trailDay.id);
        assert.ok(!("trail_day_id" in mark));

        const byDay = await harness.repos.marks.listMarkInstancesByTrailDay(trailDay.id);
        assert.equal(byDay.length, 1);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkRepository rejects create without trailDayId",
    run: async () => {
      const harness = await createHarness();
      try {
        const path = await harness.repos.paths.createPath({
          userId: "user_1",
          slug: "writing",
          title: "Writing",
          sortOrder: 0,
        });

        await assert.rejects(() =>
          harness.repos.marks.createMarkInstance({
            userId: "user_1",
            pathId: path.id,
            trailDayId: "" as never,
            title: "Invalid mark",
            origin: MarkInstanceOrigin.ManualPlan,
            status: MarkInstanceStatus.Planned,
          }),
        );
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "TransactionRunner rolls back if an error is thrown",
    run: async () => {
      const harness = await createHarness();
      try {
        await assert.rejects(() =>
          harness.repos.transaction.runInTransaction(async (txRepos) => {
            await txRepos.paths.createPath({
              userId: "user_1",
              slug: "rollback-test",
              title: "Rollback",
              sortOrder: 0,
            });
            throw new Error("force rollback");
          }),
        );

        const paths = await harness.repos.paths.listActivePaths("user_1");
        assert.equal(paths.length, 0);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "ExpeditionRepository can create expedition and milestone reads",
    run: async () => {
      const harness = await createHarness();
      try {
        const path = await harness.repos.paths.createPath({
          userId: "user_1",
          slug: "health",
          title: "Health",
          sortOrder: 0,
        });

        const expedition = await harness.repos.expeditions.createExpedition({
          userId: "user_1",
          pathId: path.id,
          title: "12 Week Cut",
          status: ExpeditionStatus.Active,
          sortOrder: 0,
        });
        const milestone = await harness.repos.expeditions.createMilestone({
          userId: "user_1",
          expeditionId: expedition.id,
          title: "Week 4 checkpoint",
          status: MilestoneStatus.Planned,
          sortOrder: 0,
          orderIndex: 0,
        });

        const list = await harness.repos.expeditions.listExpeditionsByPath(path.id);
        assert.equal(list.items.length, 1);
        const milestones = await harness.repos.expeditions.listMilestonesByExpedition(expedition.id);
        assert.equal(milestones[0]?.id, milestone.id);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MemoryRepository can create and list memories by TrailDay",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-19");
        const created = await harness.repos.memories.createMemory({
          userId: "user_1",
          trailDayId: trailDay.id,
          title: "Morning walk",
          note: "Good weather",
          capturedAt: new Date().toISOString(),
          privacy: MemoryPrivacy.Private,
          mediaAssetIds: [],
        });

        const listed = await harness.repos.memories.listMemoriesByTrailDay(trailDay.id);
        assert.equal(listed.length, 1);
        assert.equal(created.id, listed[0]?.id);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "BacklogRepository can upsert and list backlog items by path",
    run: async () => {
      const harness = await createHarness();
      try {
        const path = await harness.repos.paths.createPath({
          userId: "user_1",
          slug: "career",
          title: "Career",
          sortOrder: 0,
        });
        await harness.repos.backlog.upsert({
          id: "backlog_1",
          userId: "user_1",
          pathId: path.id,
          title: "Explore repo contracts",
          itemType: BacklogItemType.Idea,
          horizon: BacklogItemHorizon.Near,
          status: BacklogItemStatus.Open,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const listed = await harness.repos.backlog.listByPath(path.id);
        assert.equal(listed.items.length, 1);
        assert.equal(listed.items[0]?.title, "Explore repo contracts");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "WeekPlanRepository can upsert plan and plan items",
    run: async () => {
      const harness = await createHarness();
      try {
        const path = await harness.repos.paths.createPath({
          userId: "user_1",
          slug: "writing",
          title: "Writing",
          sortOrder: 0,
        });
        const backlog = await harness.repos.backlog.upsert({
          id: "backlog_2",
          userId: "user_1",
          pathId: path.id,
          title: "Draft essay",
          itemType: BacklogItemType.MarkCandidate,
          horizon: BacklogItemHorizon.Near,
          status: BacklogItemStatus.Open,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        const weekPlan = await harness.repos.weekPlans.upsertWeekPlan({
          id: "week_1",
          userId: "user_1",
          weekStartDate: "2026-05-18",
          weekEndDate: "2026-05-24",
          status: WeekPlanStatus.Active,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        await harness.repos.weekPlans.upsertItems([
          {
            id: "week_item_1",
            weekPlanId: weekPlan.id,
            backlogItemId: backlog.id,
            status: WeekPlanItemStatus.Pulled,
            sortOrder: 0,
            orderIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);

        const items = await harness.repos.weekPlans.listItems(weekPlan.id);
        assert.equal(items.length, 1);
        assert.equal(items[0]?.backlogItemId, backlog.id);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "PackCheckRepository can persist template, instance, and item snapshots",
    run: async () => {
      const harness = await createHarness();
      try {
        const path = await harness.repos.paths.createPath({
          userId: "user_1",
          slug: "ops",
          title: "Ops",
          sortOrder: 0,
        });
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-20");
        const template = await harness.repos.packChecks.upsertTemplate({
          id: "pct_1",
          userId: "user_1",
          pathId: path.id,
          title: "Preflight",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await harness.repos.packChecks.upsertItemTemplates([
          {
            id: "pct_item_1",
            packCheckTemplateId: template.id,
            label: "Water bottle",
            isRequired: true,
            orderIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        const instance = await harness.repos.packChecks.upsertInstance({
          id: "pci_1",
          userId: "user_1",
          templateId: template.id,
          trailDayId: trailDay.id,
          title: "Preflight",
          description: "Frozen snapshot",
          status: PackCheckInstanceStatus.Available,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await harness.repos.packChecks.upsertItemInstances([
          {
            id: "pci_item_1",
            packCheckInstanceId: instance.id,
            label: "Water bottle",
            isRequired: true,
            isChecked: false,
            orderIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);

        const listed = await harness.repos.packChecks.listInstancesByTrailDay(trailDay.id);
        const itemInstances = await harness.repos.packChecks.listItemInstances(instance.id);
        assert.equal(listed[0]?.title, "Preflight");
        assert.equal(itemInstances.length, 1);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "DependencyRepository can create and query dependencies by required entity",
    run: async () => {
      const harness = await createHarness();
      try {
        const path = await harness.repos.paths.createPath({
          userId: "user_1",
          slug: "gym",
          title: "Gym",
          sortOrder: 0,
        });
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-21");
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          title: "Workout",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Planned,
        });
        const packTemplate = await harness.repos.packChecks.upsertTemplate({
          id: "pct_2",
          userId: "user_1",
          title: "Gym bag",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        const packInstance = await harness.repos.packChecks.upsertInstance({
          id: "pci_2",
          userId: "user_1",
          templateId: packTemplate.id,
          trailDayId: trailDay.id,
          targetMarkInstanceId: mark.id,
          title: "Gym bag",
          status: PackCheckInstanceStatus.Available,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: mark.id,
          dependencyType: DependencyType.PackCheckCompleted,
          requiredEntityType: DependencyRequiredEntityType.PackCheckInstance,
          requiredEntityId: packInstance.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        const deps = await harness.repos.dependencies.listDependenciesByRequiredEntity(
          DependencyRequiredEntityType.PackCheckInstance,
          packInstance.id,
        );
        assert.equal(deps.length, 1);
        assert.equal(deps[0]?.dependentMarkInstanceId, mark.id);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "SignalRepository validates target and persists signal reads",
    run: async () => {
      const harness = await createHarness();
      try {
        const path = await harness.repos.paths.createPath({
          userId: "user_1",
          slug: "admin",
          title: "Admin",
          sortOrder: 0,
        });
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-22");
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          title: "Send invoice",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Planned,
        });

        const signal = await harness.repos.signals.createSignal({
          userId: "user_1",
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          scheduledAt: new Date().toISOString(),
          status: SignalStatus.Scheduled,
        });

        const listed = await harness.repos.signals.listSignalsByTarget(SignalTargetType.MarkInstance, mark.id);
        assert.equal(listed.length, 1);
        assert.equal(signal.id, listed[0]?.id);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MediaRepository validates owner and lists assets by owner",
    run: async () => {
      const harness = await createHarness();
      try {
        const path = await harness.repos.paths.createPath({
          userId: "user_1",
          slug: "photos",
          title: "Photos",
          sortOrder: 0,
        });
        const created = await harness.repos.media.createMediaAsset({
          userId: "user_1",
          ownerType: MediaAssetOwnerType.Path,
          ownerId: path.id,
          assetType: MediaAssetType.HeroImage,
          fileName: "hero.webp",
          storagePath: "/tmp/hero.webp",
        });

        const listed = await harness.repos.media.listByOwner(MediaAssetOwnerType.Path, path.id);
        assert.equal(listed.length, 1);
        assert.equal(created.id, listed[0]?.id);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "normalizeWaymarkMediaDrafts preserves order for supported counts and rejects 21 items",
    run: async () => {
      for (const count of [1, 2, 4, 5, 20]) {
        const drafts = normalizeWaymarkMediaDrafts(
          Array.from({ length: count }, (_, index) => ({
            uri: `file:///media-${index}.jpg`,
            mimeType: index % 2 === 0 ? "image/jpeg" : null,
          })),
        );
        assert.equal(drafts.length, count);
        assert.deepEqual(
          drafts.map((draft) => draft.sortIndex),
          Array.from({ length: count }, (_, index) => index),
        );
      }

      assert.throws(
        () =>
          normalizeWaymarkMediaDrafts(
            Array.from({ length: 21 }, (_, index) => ({
              uri: `file:///overflow-${index}.jpg`,
              mimeType: "image/jpeg",
            })),
          ),
        /up to 20 media items/i,
      );
    },
  },
  {
    name: "saveMediaAssetsForOwner persists ordered mixed media for shared owner types",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-06-04");
        const mark = await harness.repos.marks.createMarkInstance({
          userId: user.id,
          pathId: path.id,
          trailDayId: trailDay.id,
          title: "Mixed media mark",
          origin: MarkInstanceOrigin.QuickCapture,
          status: MarkInstanceStatus.Completed,
          proofMediaAssetIds: [],
        });
        const backlogItem = await harness.repos.backlog.upsert({
          id: "backlog_media_test",
          userId: user.id,
          pathId: path.id,
          title: "Backlog with media",
          itemType: BacklogItemType.Project,
          horizon: BacklogItemHorizon.Near,
          status: BacklogItemStatus.Open,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const attachments: CaptureMediaAttachment[] = [
          {
            uri: "file:///image-1.jpg",
            fileName: "image-1.jpg",
            kind: MediaAssetKind.Image,
            mimeType: "image/jpeg",
            width: 1200,
            height: 900,
          },
          {
            uri: "file:///video-1.mp4",
            fileName: "video-1.mp4",
            kind: MediaAssetKind.Video,
            mimeType: "video/mp4",
            durationMs: 4200,
            thumbnailUri: "file:///video-1-thumb.jpg",
          },
        ];

        const persistMediaAttachment = async (attachment: CaptureMediaAttachment) => ({
          ...attachment,
          fileName: attachment.fileName ?? "stored-media",
          thumbnailUri:
            attachment.kind === MediaAssetKind.Video
              ? attachment.thumbnailUri ?? `${attachment.uri}.thumb.jpg`
              : attachment.thumbnailUri ?? attachment.uri,
          uri: attachment.uri.replace("file:///", "waymark:///"),
        });

        const markAssets = await saveMediaAssetsForOwner({
          repositories: harness.repos,
          userId: user.id,
          ownerType: MediaAssetOwnerType.MarkInstance,
          ownerId: mark.id,
          mediaAttachments: [...attachments],
          persistMediaAttachment,
        });
        const backlogAssets = await saveMediaAssetsForOwner({
          repositories: harness.repos,
          userId: user.id,
          ownerType: MediaAssetOwnerType.BacklogItem,
          ownerId: backlogItem.id,
          mediaAttachments: [...attachments],
          persistMediaAttachment,
        });

        assert.deepEqual(
          markAssets.map((asset) => [asset.kind, asset.sortIndex, asset.assetType]),
          [
            [MediaAssetKind.Image, 0, MediaAssetType.ProofPhoto],
            [MediaAssetKind.Video, 1, MediaAssetType.ProofVideo],
          ],
        );
        assert.deepEqual(
          backlogAssets.map((asset) => [asset.kind, asset.sortIndex, asset.assetType]),
          [
            [MediaAssetKind.Image, 0, MediaAssetType.BacklogPhoto],
            [MediaAssetKind.Video, 1, MediaAssetType.BacklogVideo],
          ],
        );
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "post-migration backfill imports legacy photo_uri once without duplicates",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.db.runAsync(`ALTER TABLE memories ADD COLUMN photo_uri TEXT;`);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-04");
        const memory = await harness.repos.memories.createMemory({
          userId: "user_1",
          trailDayId: trailDay.id,
          title: "Legacy photo memory",
          note: "legacy",
          capturedAt: "2026-06-04T10:00:00.000Z",
          privacy: MemoryPrivacy.Private,
          mediaAssetIds: [],
        });

        await harness.db.runAsync(`UPDATE memories SET photo_uri = ? WHERE id = ?;`, "file:///legacy-photo.jpg", memory.id);
        await runPostMigrationBackfillsAsync(harness.db as never);
        await runPostMigrationBackfillsAsync(harness.db as never);

        const assets = await harness.repos.media.listByOwner(MediaAssetOwnerType.Memory, memory.id);
        assert.equal(assets.length, 1);
        assert.equal(assets[0]?.kind, MediaAssetKind.Image);
        assert.equal(assets[0]?.storagePath, "file:///legacy-photo.jpg");
        assert.equal(assets[0]?.sortIndex, 0);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Daily media upload verifies pending EOD media with fake Drive idempotency",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "Asia/Saigon",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-06-24");
        const memory = await harness.repos.memories.createMemory({
          userId: user.id,
          trailDayId: trailDay.id,
          pathId: path.id,
          title: "EOD batch memory",
          capturedAt: "2026-06-24T08:00:00.000Z",
          privacy: MemoryPrivacy.Private,
          mediaAssetIds: [],
        });
        const persistMediaAttachment = async (attachment: CaptureMediaAttachment) => ({
          ...attachment,
          fileName: attachment.fileName ?? "stored-media",
          thumbnailUri: "file:///cache/thumb.jpg",
          uri: "file:///cache/original.jpg",
        });

        const [asset] = await saveMediaAssetsForOwner({
          repositories: harness.repos,
          userId: user.id,
          ownerType: MediaAssetOwnerType.Memory,
          ownerId: memory.id,
          mediaAttachments: [
            {
              uri: "file:///picker/original.jpg",
              fileName: "original.jpg",
              kind: MediaAssetKind.Image,
              libraryAssetId: "library-asset-1",
              mimeType: "image/jpeg",
              originalPickerUri: "file:///picker/original.jpg",
            },
          ],
          capturedAt: new Date("2026-06-24T08:00:00.000Z"),
          persistMediaAttachment,
          userTimezone: user.timezone,
        });

        assert.equal(asset?.uploadStatus, "pending_eod_upload");
        assert.equal(asset?.localDate, "2026-06-24");
        assert.equal(asset?.driveFileId, undefined);

        const drive = new FakeDriveAdapter();
        const firstRun = await runDailyMediaUpload({
          repositories: harness.repos,
          drive,
          userId: user.id,
          timezone: user.timezone,
          localDate: "2026-06-24",
          computeSha256: async () => "sha256-test",
          getLocalFileInfo: async () => ({ exists: true, size: 1234 }),
          now: new Date("2026-06-24T15:30:00.000Z"),
        });

        assert.equal(firstRun.status, "verified");
        assert.equal(firstRun.uploadedCount, 1);
        const uploadedAsset = await harness.repos.media.getById(asset!.id);
        assert.equal(uploadedAsset?.uploadStatus, "verified");
        assert.equal(uploadedAsset?.contentHash, "sha256-test");
        assert.ok(uploadedAsset?.driveFileId);
        assert.ok(uploadedAsset?.thumbnailDriveFileId);

        await harness.repos.media.updateMediaAsset(asset!.id, {
          uploadStatus: "retry_pending",
        });
        const secondRun = await runDailyMediaUpload({
          repositories: harness.repos,
          drive,
          userId: user.id,
          timezone: user.timezone,
          localDate: "2026-06-24",
          computeSha256: async () => "sha256-test",
          getLocalFileInfo: async () => ({ exists: true, size: 1234 }),
          now: new Date("2026-06-24T16:30:00.000Z"),
        });
        const retriedAsset = await harness.repos.media.getById(asset!.id);
        assert.equal(secondRun.status, "verified");
        assert.equal(retriedAsset?.driveFileId, uploadedAsset?.driveFileId);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Daily media upload reuses remote media after partial upload failure",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "Asia/Saigon",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-06-24");
        const memory = await harness.repos.memories.createMemory({
          userId: user.id,
          trailDayId: trailDay.id,
          pathId: path.id,
          title: "Reconnect upload memory",
          capturedAt: "2026-06-24T08:00:00.000Z",
          privacy: MemoryPrivacy.Private,
          mediaAssetIds: [],
        });
        const [asset] = await saveMediaAssetsForOwner({
          repositories: harness.repos,
          userId: user.id,
          ownerType: MediaAssetOwnerType.Memory,
          ownerId: memory.id,
          mediaAttachments: [
            {
              uri: "file:///picker/original.jpg",
              fileName: "original.jpg",
              kind: MediaAssetKind.Image,
              libraryAssetId: "library-asset-1",
              mimeType: "image/jpeg",
              originalPickerUri: "file:///picker/original.jpg",
            },
          ],
          capturedAt: new Date("2026-06-24T08:00:00.000Z"),
          persistMediaAttachment: async (attachment) => ({
            ...attachment,
            fileName: attachment.fileName ?? "stored-media",
            thumbnailUri: "file:///cache/thumb.jpg",
            uri: "file:///cache/original.jpg",
          }),
          userTimezone: user.timezone,
        });

        class ThumbnailFailingDriveAdapter extends FakeDriveAdapter {
          failThumbnail = true;
          originalUploadCalls = 0;
          thumbnailUploadCalls = 0;
          originalFileId: string | null = null;

          override async uploadResumable(params: Parameters<FakeDriveAdapter["uploadResumable"]>[0]) {
            if (params.appProperties.waymarkArtifactKind === "original") {
              this.originalUploadCalls += 1;
              const file = await super.uploadResumable(params);
              this.originalFileId = file.id;
              return file;
            }
            if (params.appProperties.waymarkArtifactKind === "thumbnail") {
              this.thumbnailUploadCalls += 1;
              if (this.failThumbnail) {
                throw new Error("forced thumbnail network failure");
              }
            }
            return super.uploadResumable(params);
          }
        }

        const drive = new ThumbnailFailingDriveAdapter();
        const firstRun = await runDailyMediaUpload({
          repositories: harness.repos,
          drive,
          userId: user.id,
          timezone: user.timezone,
          localDate: "2026-06-24",
          computeSha256: async () => "sha256-test",
          getLocalFileInfo: async () => ({ exists: true, size: 1234 }),
          now: new Date("2026-06-24T15:30:00.000Z"),
        });
        const failedAsset = await harness.repos.media.getById(asset!.id);
        assert.equal(firstRun.status, "partial_failed");
        assert.equal(failedAsset?.uploadStatus, "upload_failed");
        assert.equal(failedAsset?.driveFileId, undefined);
        assert.equal(drive.originalUploadCalls, 1);
        assert.equal(drive.thumbnailUploadCalls, 1);
        assert.ok(drive.originalFileId);

        drive.failThumbnail = false;
        await harness.repos.media.updateMediaAsset(asset!.id, {
          uploadStatus: "retry_pending",
        });
        const secondRun = await runDailyMediaUpload({
          repositories: harness.repos,
          drive,
          userId: user.id,
          timezone: user.timezone,
          localDate: "2026-06-24",
          computeSha256: async () => "sha256-test",
          getLocalFileInfo: async () => ({ exists: true, size: 1234 }),
          now: new Date("2026-06-24T16:30:00.000Z"),
        });
        const retriedAsset = await harness.repos.media.getById(asset!.id);
        assert.equal(secondRun.status, "verified");
        assert.equal(drive.originalUploadCalls, 1);
        assert.equal(drive.thumbnailUploadCalls, 2);
        assert.equal(retriedAsset?.driveFileId, drive.originalFileId);
        assert.ok(retriedAsset?.thumbnailDriveFileId);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Daily media upload uses memory title labels for Drive folders and files",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-06-24");
        const memory = await harness.repos.memories.createMemory({
          userId: user.id,
          trailDayId: trailDay.id,
          pathId: path.id,
          title: "First Swing at Da Nang",
          capturedAt: "2026-06-24T08:00:00.000Z",
          privacy: MemoryPrivacy.Private,
          mediaAssetIds: [],
        });
        const shortMemoryId = memory.id.split("_").filter(Boolean).pop()!.slice(-8);
        const [asset] = await saveMediaAssetsForOwner({
          repositories: harness.repos,
          userId: user.id,
          ownerType: MediaAssetOwnerType.Memory,
          ownerId: memory.id,
          mediaAttachments: [
            {
              uri: "file:///picker/camera-roll-name.jpg",
              fileName: "camera-roll-name.jpg",
              kind: MediaAssetKind.Image,
              mimeType: "image/jpeg",
            },
          ],
          capturedAt: new Date("2026-06-24T08:00:00.000Z"),
          persistMediaAttachment: async (attachment) => ({
            ...attachment,
            fileName: attachment.fileName ?? "stored-media",
            thumbnailUri: "file:///cache/thumb.jpg",
            uri: "file:///cache/original.jpg",
          }),
          userTimezone: user.timezone,
        });

        class RecordingDriveAdapter extends FakeDriveAdapter {
          readonly ensuredPaths: string[][] = [];
          readonly uploadedFiles: Parameters<FakeDriveAdapter["uploadResumable"]>[0][] = [];
          readonly uploadedJsonFiles: Parameters<FakeDriveAdapter["uploadJson"]>[0][] = [];
          readonly folderIdsByPath = new Map<string, string>();

          override async ensureFolderPath(path: string[]) {
            this.ensuredPaths.push([...path]);
            const folder = await super.ensureFolderPath(path);
            this.folderIdsByPath.set(path.join("/"), folder.id);
            return folder;
          }

          override async uploadResumable(params: Parameters<FakeDriveAdapter["uploadResumable"]>[0]) {
            this.uploadedFiles.push(params);
            return super.uploadResumable(params);
          }

          override async uploadJson(params: Parameters<FakeDriveAdapter["uploadJson"]>[0]) {
            this.uploadedJsonFiles.push(params);
            return super.uploadJson(params);
          }
        }

        const drive = new RecordingDriveAdapter();
        await runDailyMediaUpload({
          repositories: harness.repos,
          drive,
          userId: user.id,
          timezone: user.timezone,
          localDate: "2026-06-24",
          computeSha256: async () => "sha256-test",
          getLocalFileInfo: async () => ({ exists: true, size: 1234 }),
          now: new Date("2026-06-24T15:30:00.000Z"),
        });

        const memoryFolderPath = `Waymark Vault/Media/2026/06/2026-06-24/first-swing-at-da-nang__mem_${shortMemoryId}`;
        const mediaFolderPath = `${memoryFolderPath}/media`;
        const thumbnailsFolderPath = `${memoryFolderPath}/thumbnails`;
        assert.ok(
          drive.ensuredPaths.some(
            (path) => path.join("/") === memoryFolderPath,
          ),
        );
        assert.ok(drive.ensuredPaths.some((path) => path.join("/") === mediaFolderPath));
        assert.ok(drive.ensuredPaths.some((path) => path.join("/") === thumbnailsFolderPath));
        assert.ok(
          drive.uploadedFiles.some(
            (file) =>
              file.fileName === "first-swing-at-da-nang__001_photo.jpg" &&
              file.folderId === drive.folderIdsByPath.get(mediaFolderPath),
          ),
        );
        assert.ok(
          drive.uploadedFiles.some(
            (file) =>
              file.fileName === "first-swing-at-da-nang__001_thumb.jpg" &&
              file.folderId === drive.folderIdsByPath.get(thumbnailsFolderPath),
          ),
        );
        assert.ok(
          drive.uploadedJsonFiles.some(
            (file) => file.fileName === "memory.json" && file.folderId === drive.folderIdsByPath.get(memoryFolderPath),
          ),
        );
        assert.ok(!drive.uploadedFiles.some((file) => file.fileName.includes("camera-roll-name")));
        assert.equal(asset?.fileName, "camera-roll-name.jpg");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Daily media upload reuploads when stored Drive file is missing",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-06-24");
        const memory = await harness.repos.memories.createMemory({
          userId: user.id,
          trailDayId: trailDay.id,
          pathId: path.id,
          title: "Deleted remote memory",
          capturedAt: "2026-06-24T08:00:00.000Z",
          privacy: MemoryPrivacy.Private,
          mediaAssetIds: [],
        });
        const [asset] = await saveMediaAssetsForOwner({
          repositories: harness.repos,
          userId: user.id,
          ownerType: MediaAssetOwnerType.Memory,
          ownerId: memory.id,
          mediaAttachments: [
            {
              uri: "file:///picker/original.jpg",
              fileName: "original.jpg",
              kind: MediaAssetKind.Image,
              mimeType: "image/jpeg",
            },
          ],
          capturedAt: new Date("2026-06-24T08:00:00.000Z"),
          persistMediaAttachment: async (attachment) => ({
            ...attachment,
            fileName: attachment.fileName ?? "stored-media",
            thumbnailUri: undefined,
            uri: "file:///cache/original.jpg",
          }),
          userTimezone: user.timezone,
        });
        await harness.repos.media.updateMediaAsset(asset!.id, {
          driveFileId: "deleted_drive_file",
          uploadStatus: "verified",
        });

        class RecordingDriveAdapter extends FakeDriveAdapter {
          readonly uploadedFiles: Parameters<FakeDriveAdapter["uploadResumable"]>[0][] = [];

          override async uploadResumable(params: Parameters<FakeDriveAdapter["uploadResumable"]>[0]) {
            this.uploadedFiles.push(params);
            return super.uploadResumable(params);
          }
        }

        const drive = new RecordingDriveAdapter();
        const result = await runDailyMediaUpload({
          repositories: harness.repos,
          drive,
          userId: user.id,
          timezone: user.timezone,
          localDate: "2026-06-24",
          computeSha256: async () => "sha256-test",
          getLocalFileInfo: async () => ({ exists: true, size: 1234 }),
          includeVerifiedMedia: true,
          now: new Date("2026-06-24T15:30:00.000Z"),
        });

        const reuploadedAsset = await harness.repos.media.getById(asset!.id);
        assert.equal(result.status, "verified");
        assert.ok(drive.uploadedFiles.some((file) => file.appProperties.waymarkArtifactKind === "original"));
        assert.ok(reuploadedAsset?.driveFileId);
        assert.notEqual(reuploadedAsset?.driveFileId, "deleted_drive_file");
        assert.equal(reuploadedAsset?.lastSyncError, undefined);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Daily media upload respects active batch lock and catches up stale locks",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const activeLock = await harness.repos.dailyMediaUploadBatches.upsert({
          userId: user.id,
          localDate: "2026-06-24",
          timezone: "UTC",
          status: "uploading",
          lockOwner: "worker-a",
          lockAcquiredAt: "2026-06-24T20:00:00.000Z",
          lockExpiresAt: "2026-06-24T22:00:00.000Z",
        });

        await assert.rejects(
          () =>
            runDailyMediaUpload({
              repositories: harness.repos,
              drive: new FakeDriveAdapter(),
              userId: user.id,
              timezone: "UTC",
              localDate: "2026-06-24",
              now: new Date("2026-06-24T21:00:00.000Z"),
            }),
          /already running/i,
        );
        const lockedBatch = await harness.repos.dailyMediaUploadBatches.getById(activeLock.id);
        assert.equal(lockedBatch?.status, "uploading");
        assert.equal(lockedBatch?.lockOwner, "worker-a");

        await harness.repos.dailyMediaUploadBatches.upsert({
          userId: user.id,
          localDate: "2026-06-23",
          timezone: "UTC",
          status: "uploading",
          lockOwner: "stale-worker",
          lockAcquiredAt: "2026-06-23T20:00:00.000Z",
          lockExpiresAt: "2026-06-23T22:00:00.000Z",
        });
        const candidates = await harness.repos.dailyMediaUploadBatches.listCatchUpCandidates(
          user.id,
          "2026-06-24",
          "2026-06-24T10:00:00.000Z",
        );
        assert.ok(candidates.some((batch) => batch.localDate === "2026-06-23"));
        assert.ok(!candidates.some((batch) => batch.localDate === "2026-06-24"));
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Daily media upload releases lock when manifest artifact upload fails",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-06-24");
        const memory = await harness.repos.memories.createMemory({
          userId: user.id,
          trailDayId: trailDay.id,
          pathId: path.id,
          title: "Manifest failure memory",
          capturedAt: "2026-06-24T08:00:00.000Z",
          privacy: MemoryPrivacy.Private,
          mediaAssetIds: [],
        });
        const [asset] = await saveMediaAssetsForOwner({
          repositories: harness.repos,
          userId: user.id,
          ownerType: MediaAssetOwnerType.Memory,
          ownerId: memory.id,
          mediaAttachments: [
            {
              uri: "file:///picker/original.jpg",
              fileName: "original.jpg",
              kind: MediaAssetKind.Image,
              mimeType: "image/jpeg",
            },
          ],
          capturedAt: new Date("2026-06-24T08:00:00.000Z"),
          persistMediaAttachment: async (attachment) => ({
            ...attachment,
            fileName: attachment.fileName ?? "stored-media",
            thumbnailUri: "file:///cache/thumb.jpg",
            uri: "file:///cache/original.jpg",
          }),
          userTimezone: user.timezone,
        });

        class ManifestFailingDriveAdapter extends FakeDriveAdapter {
          override async uploadJson(params: Parameters<FakeDriveAdapter["uploadJson"]>[0]) {
            if (params.fileName === "_daily_manifest.json") {
              throw new Error("forced manifest failure");
            }
            return super.uploadJson(params);
          }
        }

        await assert.rejects(
          () =>
            runDailyMediaUpload({
              repositories: harness.repos,
              drive: new ManifestFailingDriveAdapter(),
              userId: user.id,
              timezone: user.timezone,
              localDate: "2026-06-24",
              computeSha256: async () => "sha256-test",
              getLocalFileInfo: async () => ({ exists: true, size: 1234 }),
              now: new Date("2026-06-24T15:30:00.000Z"),
            }),
          /forced manifest failure/i,
        );

        const batch = await harness.repos.dailyMediaUploadBatches.getByUserDate(user.id, "2026-06-24");
        const uploadedAsset = await harness.repos.media.getById(asset!.id);
        assert.equal(batch?.status, "retry_pending");
        assert.equal(batch?.lockOwner, undefined);
        assert.equal(batch?.lockExpiresAt, undefined);
        assert.equal(uploadedAsset?.uploadStatus, "verified");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "createJournalMemoryCapture persists selected photo on the created memory",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const path = await harness.repos.paths.createPath({
          userId: user.id,
          slug: "family",
          title: "Family",
          sortOrder: 0,
        });

        const memory = await createJournalMemoryCapture({
          repositories: harness.repos,
          user,
          locale: "en",
          title: "Beach sunset",
          noteDetail: "Quiet light over the water",
          resolvedPathId: path.id,
          photoAttachment: {
            uri: "file:///photos/beach-sunset.jpg",
            fileName: "beach-sunset.jpg",
            mimeType: "image/jpeg",
            width: 1440,
            height: 1080,
            fileSize: 345678,
          },
          persistPhotoAttachment: async (photoAttachment) => ({
            ...photoAttachment,
            uri: "file:///waymark/media/memories/imported-beach-sunset.jpg",
          }),
        });

        assert.equal(memory.title, "Beach sunset");
        assert.equal(memory.note, "Quiet light over the water");
        assert.equal(memory.mediaAssetIds.length, 1);
        const media = await harness.repos.media.getById(memory.mediaAssetIds[0]!);
        assert.ok(media);
        assert.equal(media?.ownerType, MediaAssetOwnerType.Memory);
        assert.equal(media?.ownerId, memory.id);
        assert.equal(media?.assetType, MediaAssetType.MemoryPhoto);
        assert.equal(media?.storagePath, "file:///waymark/media/memories/imported-beach-sunset.jpg");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Daily journal state covers empty day, memory, completed mark, and closed trail for 2026-06-01",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-06-01");

        assert.equal(resolveDailyJournalContentState({ entries: [], closedDayCard: undefined }), "empty");

        const memory = await harness.repos.memories.createMemory({
          userId: user.id,
          trailDayId: trailDay.id,
          pathId: path.id,
          title: "Porch dinner",
          note: "Porch dinner",
          capturedAt: "2026-06-01T12:00:00.000Z",
          privacy: MemoryPrivacy.Private,
          mediaAssetIds: [],
        });
        const storedMemories = await harness.repos.memories.listMemoriesByTrailDay(trailDay.id);
        assert.equal(storedMemories.length, 1);
        const memoryEntry = mapMemoryToDailyEntry(memory, "en", "Family");
        assert.equal(memoryEntry.title, "Porch dinner");
        assert.equal(resolveDailyJournalContentState({ entries: [memoryEntry], closedDayCard: undefined }), "content");

        const completedMark = await createMark(harness, {
          userId: user.id,
          localDate: "2026-06-01",
          pathId: path.id,
          trailDayId: trailDay.id,
          title: "Morning walk",
        });
        const completedMarkRecord = await harness.repos.marks.updateMarkInstance(completedMark.id, {
          status: MarkInstanceStatus.Completed,
          completedAt: "2026-06-01T06:30:00.000Z",
          completionSummary: "Walk completed before work.",
        });
        const storedMarks = await harness.repos.marks.listMarkInstancesByTrailDay(trailDay.id);
        assert.equal(storedMarks.length, 1);
        const completedMarkEntry = mapMarkToJournalEntry(completedMarkRecord, null, "en", "Health");
        assert.deepEqual(
          completedMarkEntry.chips.map((chip) => chip.label),
          ["06h30", "Done"],
        );
        assert.equal(resolveDailyJournalContentState({ entries: [completedMarkEntry], closedDayCard: undefined }), "content");

        const closeTrailEngine = createCloseTrailEngine(harness.repos);
        await closeTrailEngine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-01T21:30:00.000Z",
          manualCloseReason: "Journal verification",
          reflectionEntries: [{ cluster: "what_mattered", orderIndex: 0, text: "Dinner stayed present." }],
        });
        const judgment = await closeTrailEngine.getCloseTrailJudgment(trailDay.id);
        const closedTrail = await harness.repos.trailDays.getTrailDayById(trailDay.id);
        assert.equal(closedTrail?.status, TrailDayStatus.Closed);
        const closedDayCard = {
          variant: judgment.day.passed === false ? "repair" : judgment.character.passed ? "protected" : "neutral",
          summary: judgment.plannedMarkOutcomes.sentence,
        };
        assert.equal(resolveDailyJournalContentState({ entries: [], closedDayCard }), "content");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthRepository can persist routine, session, snapshot, set log, and progression state",
    run: async () => {
      const harness = await createHarness();
      try {
        const path = await harness.repos.paths.createPath({
          userId: "user_1",
          slug: "strength",
          title: "Strength",
          sortOrder: 0,
        });
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-23");
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          title: "Day A",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Active,
        });
        const exercise = await harness.repos.strength.upsertExerciseDefinition({
          id: "ex_1",
          userId: "user_1",
          title: "Barbell Squat",
          canonicalSlug: "barbell-squat",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
          isSystem: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        const routine = await harness.repos.strength.upsertRoutine({
          id: "routine_1",
          userId: "user_1",
          pathId: path.id,
          title: "Day A",
          routineType: WorkoutRoutineType.Strength,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await harness.repos.strength.upsertRoutineExercises([
          {
            id: "routine_ex_1",
            workoutRoutineTemplateId: routine.id,
            exerciseDefinitionId: exercise.id,
            phase: WorkoutExercisePhase.Strength,
            orderIndex: 0,
            targetType: ExerciseTargetType.RepsLoad,
            targetLoadKg: 100,
            targetReps: 5,
            targetSets: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        const session = await harness.repos.strength.upsertSession({
          id: "session_1",
          userId: "user_1",
          markInstanceId: mark.id,
          routineTemplateId: routine.id,
          status: WorkoutSessionStatus.Active,
          phase: WorkoutSessionPhase.Strength,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        const [snapshot] = await harness.repos.strength.upsertSessionSnapshots([
          {
            id: "snapshot_1",
            workoutSessionInstanceId: session.id,
            exerciseDefinitionId: exercise.id,
            exerciseNameSnapshot: "Barbell Squat",
            phase: WorkoutExercisePhase.Strength,
            orderIndex: 0,
            targetType: ExerciseTargetType.RepsLoad,
            targetLoadKg: 100,
            targetReps: 5,
            targetSets: 3,
            wasOverridden: false,
            status: SessionExerciseStatus.Active,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        await harness.repos.strength.upsertSetLogs([
          {
            id: "set_1",
            sessionExerciseSnapshotId: snapshot!.id,
            setNumber: 1,
            actualLoadKg: 100,
            actualReps: 5,
            completed: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        await harness.repos.strength.upsertExerciseProgressState({
          id: "progress_1",
          userId: "user_1",
          exerciseDefinitionId: exercise.id,
          currentTargetLoadKg: 102.5,
          currentTargetReps: 5,
          currentTargetSets: 3,
          successCountSinceProgression: 1,
          manualOverride: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const logs = await harness.repos.strength.listSetLogs(snapshot!.id);
        const progress = await harness.repos.strength.getProgressState("user_1", exercise.id);
        assert.equal(logs.length, 1);
        assert.equal(progress?.currentTargetLoadKg, 102.5);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine rejects invalid transitions from Completed",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        assert.equal(engine.canTransitionMarkStatus(MarkInstanceStatus.Completed, MarkInstanceStatus.Ready), false);

        const mark = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Completed,
          title: "Already done",
        });

        await assert.rejects(() => engine.completeMarkInstance({ markInstanceId: mark.id }));
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine refreshMarkReadiness changes Planned to Ready when dependencies are satisfied",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const required = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Completed,
          title: "Required complete",
        });
        const dependent = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Planned,
          title: "Dependent planned",
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: dependent.id,
          dependencyType: DependencyType.MarkCompleted,
          requiredEntityType: DependencyRequiredEntityType.MarkInstance,
          requiredEntityId: required.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        const refreshed = await engine.refreshMarkReadiness(dependent.id);
        assert.equal(refreshed.status, MarkInstanceStatus.Ready);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine refreshMarkReadiness changes Planned to Blocked when dependencies are unmet",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const required = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Planned,
          title: "Required incomplete",
        });
        const dependent = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Planned,
          title: "Dependent planned",
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: dependent.id,
          dependencyType: DependencyType.MarkCompleted,
          requiredEntityType: DependencyRequiredEntityType.MarkInstance,
          requiredEntityId: required.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        const refreshed = await engine.refreshMarkReadiness(dependent.id);
        assert.equal(refreshed.status, MarkInstanceStatus.Blocked);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine refreshMarkReadiness changes Ready to Blocked and Blocked to Ready as dependencies change",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const required = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Completed,
        });
        const dependent = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Planned,
        });
        const dependency = await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: dependent.id,
          dependencyType: DependencyType.MarkCompleted,
          requiredEntityType: DependencyRequiredEntityType.MarkInstance,
          requiredEntityId: required.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        const first = await engine.refreshMarkReadiness(dependent.id);
        assert.equal(first.status, MarkInstanceStatus.Ready);

        await harness.repos.marks.updateMarkInstance(required.id, {
          status: MarkInstanceStatus.Skipped,
          skippedAt: new Date().toISOString(),
        });
        const blocked = await engine.refreshMarkReadiness(dependent.id);
        assert.equal(blocked.status, MarkInstanceStatus.Blocked);

        await harness.repos.marks.updateMarkInstance(required.id, {
          status: MarkInstanceStatus.Completed,
          skippedAt: null,
          completedAt: new Date().toISOString(),
        });
        await harness.repos.dependencies.updateDependency(dependency.id, {
          status: DependencyStatus.Pending,
          satisfiedAt: null,
        });
        const readyAgain = await engine.refreshMarkReadiness(dependent.id);
        assert.equal(readyAgain.status, MarkInstanceStatus.Ready);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine refreshMarkReadiness does not mutate final Marks",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const statuses = [
          MarkInstanceStatus.Completed,
          MarkInstanceStatus.Skipped,
          MarkInstanceStatus.Rescheduled,
          MarkInstanceStatus.Substituted,
          MarkInstanceStatus.Expired,
          MarkInstanceStatus.Cancelled,
        ];

        for (const [index, status] of statuses.entries()) {
          const mark = await createMark(harness, {
            localDate: `2026-05-${25 + index}`,
            status,
            title: `Final ${status}`,
          });
          const refreshed = await engine.refreshMarkReadiness(mark.id);
          assert.equal(refreshed.status, status);
        }
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine completes Planned Mark through Planned to Ready to Completed when dependencies are satisfied",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const required = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Completed,
        });
        const mark = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Planned,
          title: "Planned finish",
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: mark.id,
          dependencyType: DependencyType.MarkCompleted,
          requiredEntityType: DependencyRequiredEntityType.MarkInstance,
          requiredEntityId: required.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        const completed = await engine.completeMarkInstance({
          markInstanceId: mark.id,
          proofNote: "done",
          completionSummary: "finished cleanly",
        });
        assert.equal(completed.status, MarkInstanceStatus.Completed);
        assert.equal(completed.proofNote, "done");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine rejects completion for Planned Mark with unmet dependency and writes nothing",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const required = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Planned,
        });
        const mark = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Planned,
          title: "Blocked planned",
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: mark.id,
          dependencyType: DependencyType.MarkCompleted,
          requiredEntityType: DependencyRequiredEntityType.MarkInstance,
          requiredEntityId: required.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        await assert.rejects(() => engine.completeMarkInstance({ markInstanceId: mark.id }));
        const unchanged = await harness.repos.marks.getMarkInstanceById(mark.id);
        assert.equal(unchanged?.status, MarkInstanceStatus.Planned);
        assert.equal(unchanged?.completedAt, undefined);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine completes Ready Mark, resolves Signals, and satisfies mark_completed dependencies",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const mark = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Ready,
          title: "Ready mark",
        });
        const dependent = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Planned,
          title: "Downstream",
        });
        await harness.repos.signals.createSignal({
          userId: mark.userId,
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          scheduledAt: new Date().toISOString(),
          status: SignalStatus.Scheduled,
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: dependent.id,
          dependencyType: DependencyType.MarkCompleted,
          requiredEntityType: DependencyRequiredEntityType.MarkInstance,
          requiredEntityId: mark.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        const completed = await engine.completeMarkInstance({ markInstanceId: mark.id });
        assert.equal(completed.status, MarkInstanceStatus.Completed);

        const signals = await harness.repos.signals.listSignalsByTarget(SignalTargetType.MarkInstance, mark.id);
        assert.equal(signals[0]?.status, SignalStatus.Resolved);

        const deps = await harness.repos.dependencies.listDependenciesByRequiredEntity(
          DependencyRequiredEntityType.MarkInstance,
          mark.id,
        );
        assert.equal(deps[0]?.status, DependencyStatus.Satisfied);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine rejects completion for Blocked Mark",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const mark = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Blocked,
        });

        await assert.rejects(() => engine.completeMarkInstance({ markInstanceId: mark.id }));
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine skip sets Skipped and satisfies mark_resolved but not mark_completed",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const mark = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Ready,
        });
        const resolvedDependent = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Planned,
          title: "Resolved dependent",
        });
        const completedDependent = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Planned,
          title: "Completed dependent",
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: resolvedDependent.id,
          dependencyType: DependencyType.MarkResolved,
          requiredEntityType: DependencyRequiredEntityType.MarkInstance,
          requiredEntityId: mark.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: completedDependent.id,
          dependencyType: DependencyType.MarkCompleted,
          requiredEntityType: DependencyRequiredEntityType.MarkInstance,
          requiredEntityId: mark.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        const skipped = await engine.skipMarkInstance({ markInstanceId: mark.id });
        assert.equal(skipped.status, MarkInstanceStatus.Skipped);
        assert.ok(skipped.skippedAt);

        const deps = await harness.repos.dependencies.listDependenciesByRequiredEntity(
          DependencyRequiredEntityType.MarkInstance,
          mark.id,
        );
        const resolvedDep = deps.find((item) => item.dependentMarkInstanceId === resolvedDependent.id);
        const completedDep = deps.find((item) => item.dependentMarkInstanceId === completedDependent.id);
        assert.equal(resolvedDep?.status, DependencyStatus.Satisfied);
        assert.equal(completedDep?.status, DependencyStatus.Failed);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine evaluateMarkReadiness treats Expired as not resolved in MVP",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const expiredMark = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Expired,
        });
        const dependent = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Planned,
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: dependent.id,
          dependencyType: DependencyType.MarkResolved,
          requiredEntityType: DependencyRequiredEntityType.MarkInstance,
          requiredEntityId: expiredMark.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        const readiness = await engine.evaluateMarkReadiness(dependent.id);
        assert.equal(readiness.status, MarkInstanceStatus.Blocked);
        assert.equal(readiness.unmetDependencies.length, 1);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine reschedule creates replacement Mark and recreates dependencies",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const required = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Completed,
        });
        const baseOriginal = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Ready,
          title: "Original mark",
        });
        const original = await harness.repos.marks.updateMarkInstance(baseOriginal.id, {
          scheduledStartAt: "2026-05-24T09:00:00.000",
          scheduledEndAt: "2026-05-24T10:30:00.000",
          dueAt: "2026-05-24T09:00:00.000",
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: original.id,
          dependencyType: DependencyType.MarkCompleted,
          requiredEntityType: DependencyRequiredEntityType.MarkInstance,
          requiredEntityId: required.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        const result = await engine.rescheduleMarkInstance({
          markInstanceId: original.id,
          targetLocalDate: "2026-05-25",
        });

        assert.equal(result.original.status, MarkInstanceStatus.Rescheduled);
        assert.equal(result.original.rescheduledToMarkId, result.replacement.id);
        assert.notEqual(result.original.trailDayId, result.replacement.trailDayId);
        assert.equal(result.replacement.scheduledStartAt, "2026-05-25T09:00:00.000");
        assert.equal(result.replacement.scheduledEndAt, "2026-05-25T10:30:00.000");
        assert.equal(result.replacement.dueAt, "2026-05-25T09:00:00.000");

        const replacementDeps = await harness.repos.dependencies.listDependenciesForMark(result.replacement.id);
        assert.equal(replacementDeps.length, 1);
        assert.equal(replacementDeps[0]?.requiredEntityId, required.id);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine substitute creates substitute Mark with explicit mode and recreated dependencies",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const required = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Completed,
        });
        const original = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Ready,
          title: "Original task",
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: original.id,
          dependencyType: DependencyType.MarkCompleted,
          requiredEntityType: DependencyRequiredEntityType.MarkInstance,
          requiredEntityId: required.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        const completedNow = await engine.substituteMarkInstance({
          markInstanceId: original.id,
          substituteTitle: "Recovery walk",
          substituteMode: {
            mode: "completed_now",
            completedAt: new Date().toISOString(),
            proofNote: "Walked instead",
          },
        });
        assert.equal(completedNow.original.status, MarkInstanceStatus.Substituted);
        assert.equal(completedNow.substitute.status, MarkInstanceStatus.Completed);
        assert.equal(completedNow.original.substitutedByMarkId, completedNow.substitute.id);

        const substituteDeps = await harness.repos.dependencies.listDependenciesForMark(completedNow.substitute.id);
        assert.equal(substituteDeps.length, 1);

        const secondOriginal = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Ready,
          title: "Second original",
        });
        const readyMode = await engine.substituteMarkInstance({
          markInstanceId: secondOriginal.id,
          substituteTitle: "Stretch block",
          substituteDescription: "Swap to a lighter recovery block",
          substituteMode: { mode: "ready" },
        });
        assert.equal(readyMode.substitute.status, MarkInstanceStatus.Ready);
        assert.equal(readyMode.substitute.description, "Swap to a lighter recovery block");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine listVisibleMarksForDay excludes Cancelled by default",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Active,
          title: "Visible active",
        });
        await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Completed,
          title: "Visible complete",
        });
        const cancelled = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Cancelled,
          title: "Hidden cancelled",
        });
        await createMark(harness, {
          localDate: "2026-05-25",
          status: MarkInstanceStatus.Ready,
          title: "Other day",
        });

        const visible = await engine.listVisibleMarksForDay("user_1", "2026-05-24");
        assert.equal(visible.some((mark) => mark.id === cancelled.id), false);
        assert.equal(visible.length, 2);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine generateMarkInstancesForDate is idempotent and generated Marks have trailDayId",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createMarkEngine(harness.repos);
        const { path } = await createPathAndTrailDay(harness, "user_1", "2026-05-24");
        await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Daily walk",
          templateType: MarkTemplateType.Routine,
          recurrenceRule: {
            kind: RecurrenceKind.Daily,
            interval: 1,
          },
        });

        const first = await engine.generateMarkInstancesForDate("user_1", "2026-05-24");
        const second = await engine.generateMarkInstancesForDate("user_1", "2026-05-24");

        assert.equal(first.length, 1);
        assert.equal(second.length, 1);
        assert.equal(first[0]?.id, second[0]?.id);
        assert.ok(first[0]?.trailDayId);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "MarkEngine transaction rollback prevents partial completion side effects",
    run: async () => {
      const harness = await createHarness();
      try {
        const rollbackRepos = {
          ...harness.repos,
          transaction: {
            runInTransaction: <T,>(work: (repositories: typeof harness.repos) => Promise<T>) =>
              harness.repos.transaction.runInTransaction(async (txRepos) => {
                await work(txRepos);
                throw new Error("force mark engine rollback");
              }),
          },
        };
        const engine = createMarkEngine(rollbackRepos);
        const mark = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Ready,
        });
        const dependent = await createMark(harness, {
          localDate: "2026-05-24",
          status: MarkInstanceStatus.Planned,
        });
        await harness.repos.signals.createSignal({
          userId: mark.userId,
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          scheduledAt: new Date().toISOString(),
          status: SignalStatus.Scheduled,
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: dependent.id,
          dependencyType: DependencyType.MarkCompleted,
          requiredEntityType: DependencyRequiredEntityType.MarkInstance,
          requiredEntityId: mark.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        await assert.rejects(() => engine.completeMarkInstance({ markInstanceId: mark.id }));

        const persistedMark = await harness.repos.marks.getMarkInstanceById(mark.id);
        const signals = await harness.repos.signals.listSignalsByTarget(SignalTargetType.MarkInstance, mark.id);
        const deps = await harness.repos.dependencies.listDependenciesByRequiredEntity(
          DependencyRequiredEntityType.MarkInstance,
          mark.id,
        );
        assert.equal(persistedMark?.status, MarkInstanceStatus.Ready);
        assert.equal(signals[0]?.status, SignalStatus.Scheduled);
        assert.equal(deps[0]?.status, DependencyStatus.Pending);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "PackCheckEngine rejects invalid transition from Completed",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createPackCheckEngine(harness.repos);
        assert.equal(
          engine.canTransitionPackCheckStatus(PackCheckInstanceStatus.Completed, PackCheckInstanceStatus.InProgress),
          false,
        );
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "PackCheckEngine refreshPackCheckAvailability opens scheduled window and preserves final statuses",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createPackCheckEngine(harness.repos);
        const today = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-01");
        const scheduled = await createPackCheckInstance(harness, {
          trailDayId: today.id,
          status: PackCheckInstanceStatus.Scheduled,
          availableFrom: "2026-06-01T18:00:00.000Z",
        });
        const available = await engine.refreshPackCheckAvailability(scheduled.id, "2026-06-01T18:30:00.000Z");
        assert.equal(available.status, PackCheckInstanceStatus.Available);

        const completed = await createPackCheckInstance(harness, {
          trailDayId: today.id,
          status: PackCheckInstanceStatus.Completed,
        });
        const skipped = await createPackCheckInstance(harness, {
          trailDayId: today.id,
          status: PackCheckInstanceStatus.Skipped,
        });
        const expired = await createPackCheckInstance(harness, {
          trailDayId: today.id,
          status: PackCheckInstanceStatus.Expired,
        });
        const cancelled = await createPackCheckInstance(harness, {
          trailDayId: today.id,
          status: PackCheckInstanceStatus.Cancelled,
        });

        assert.equal((await engine.refreshPackCheckAvailability(completed.id, "2026-06-02T01:00:00.000Z")).status, PackCheckInstanceStatus.Completed);
        assert.equal((await engine.refreshPackCheckAvailability(skipped.id, "2026-06-02T01:00:00.000Z")).status, PackCheckInstanceStatus.Skipped);
        assert.equal((await engine.refreshPackCheckAvailability(expired.id, "2026-06-02T01:00:00.000Z")).status, PackCheckInstanceStatus.Expired);
        assert.equal((await engine.refreshPackCheckAvailability(cancelled.id, "2026-06-02T01:00:00.000Z")).status, PackCheckInstanceStatus.Cancelled);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "PackCheckEngine keeps required-items-checked state editable until explicit completion",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createPackCheckEngine(harness.repos);
        const today = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-01");
        const template = await createPackCheckTemplate(harness, { title: "Gym bag" });
        const reqA = await createPackCheckItemTemplate(harness, template.id, "Shoes", true, 0);
        const reqB = await createPackCheckItemTemplate(harness, template.id, "Bottle", true, 1);
        const optional = await createPackCheckItemTemplate(harness, template.id, "Towel", false, 2);
        const instance = await createPackCheckInstance(harness, {
          templateId: template.id,
          trailDayId: today.id,
          status: PackCheckInstanceStatus.Available,
          title: template.title,
        });
        await harness.repos.packChecks.upsertItemInstances([
          {
            id: "pci_item_a",
            packCheckInstanceId: instance.id,
            templateItemId: reqA.id,
            label: reqA.label,
            isRequired: true,
            isChecked: false,
            orderIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "pci_item_b",
            packCheckInstanceId: instance.id,
            templateItemId: reqB.id,
            label: reqB.label,
            isRequired: true,
            isChecked: false,
            orderIndex: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "pci_item_c",
            packCheckInstanceId: instance.id,
            templateItemId: optional.id,
            label: optional.label,
            isRequired: false,
            isChecked: false,
            orderIndex: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);

        const partial = await engine.setPackCheckItemChecked(instance.id, "pci_item_a", true, "2026-06-01T09:00:00.000Z");
        assert.equal(partial.packCheck.status, PackCheckInstanceStatus.PartiallyCompleted);

        const readyToComplete = await engine.setPackCheckItemChecked(instance.id, "pci_item_b", true, "2026-06-01T09:05:00.000Z");
        assert.equal(readyToComplete.packCheck.status, PackCheckInstanceStatus.PartiallyCompleted);

        const reopened = await engine.setPackCheckItemChecked(instance.id, "pci_item_a", false, "2026-06-01T09:06:00.000Z");
        assert.equal(reopened.packCheck.status, PackCheckInstanceStatus.InProgress);

        await engine.setPackCheckItemChecked(instance.id, "pci_item_a", true, "2026-06-01T09:07:00.000Z");
        const completed = await engine.completePackCheckInstance({
          packCheckInstanceId: instance.id,
          completedAt: "2026-06-01T09:08:00.000Z",
        });
        assert.equal(completed.status, PackCheckInstanceStatus.Completed);

        const restarted = await engine.setPackCheckItemChecked(instance.id, "pci_item_a", false, "2026-06-01T09:09:00.000Z");
        assert.equal(restarted.packCheck.status, PackCheckInstanceStatus.InProgress);
        assert.equal(restarted.packCheck.completedAt, undefined);

        await engine.setPackCheckItemChecked(instance.id, "pci_item_a", true, "2026-06-01T09:10:00.000Z");
        const recompleted = await engine.completePackCheckInstance({
          packCheckInstanceId: instance.id,
          completedAt: "2026-06-01T09:11:00.000Z",
        });
        assert.equal(recompleted.status, PackCheckInstanceStatus.Completed);
        assert.equal(recompleted.completedAt, "2026-06-01T09:11:00.000Z");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "PackCheckEngine generation is idempotent and snapshots instance plus item labels for linked Mark",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createPackCheckEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-02");
        const markTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Workout",
          templateType: MarkTemplateType.Workout,
          recurrenceRule: { kind: RecurrenceKind.Manual },
        });
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Workout today",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Planned,
          scheduledStartAt: "2026-06-02T09:00:00.000Z",
          proofMediaAssetIds: [],
        });
        const template = await createPackCheckTemplate(harness, { pathId: path.id, title: "Gym bag", defaultAvailableOffsetMin: 30 });
        await createPackCheckItemTemplate(harness, template.id, "Shoes", true, 0);
        await createPackCheckItemTemplate(harness, template.id, "Bottle", true, 1);
        await harness.repos.packChecks.upsertMarkPackCheckRules([
          {
            id: "rule_1",
            markTemplateId: markTemplate.id,
            packCheckTemplateId: template.id,
            availableOffsetMin: 30,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);

        const first = await engine.generatePackChecksForMarkInstance(mark.id);
        const second = await engine.generatePackChecksForMarkInstance(mark.id);
        assert.equal(first.length, 1);
        assert.equal(second.length, 1);
        assert.equal(first[0]?.id, second[0]?.id);
        assert.equal(first[0]?.title, "Gym bag");
        assert.equal(first[0]?.targetMarkInstanceId, mark.id);
        const items = await harness.repos.packChecks.listItemInstances(first[0]!.id);
        assert.deepEqual(items.map((item) => item.label), ["Shoes", "Bottle"]);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "PackCheckEngine completion is exact-instance scoped and optional unchecked items do not block completion",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createPackCheckEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-03");
        const mark = await createMark(harness, {
          pathId: path.id,
          trailDayId: trailDay.id,
          localDate: "2026-06-03",
          status: MarkInstanceStatus.Ready,
        });
        const siblingMark = await createMark(harness, {
          pathId: path.id,
          trailDayId: trailDay.id,
          localDate: "2026-06-03",
          status: MarkInstanceStatus.Ready,
        });
        const template = await createPackCheckTemplate(harness, { pathId: path.id, title: "Desk reset" });
        const req = await createPackCheckItemTemplate(harness, template.id, "Laptop", true, 0);
        const opt = await createPackCheckItemTemplate(harness, template.id, "Snack", false, 1);
        const instanceA = await createPackCheckInstance(harness, {
          templateId: template.id,
          trailDayId: trailDay.id,
          targetMarkInstanceId: mark.id,
          title: template.title,
          status: PackCheckInstanceStatus.Available,
        });
        const instanceB = await createPackCheckInstance(harness, {
          templateId: template.id,
          trailDayId: trailDay.id,
          targetMarkInstanceId: siblingMark.id,
          title: template.title,
          status: PackCheckInstanceStatus.Available,
        });
        for (const [instance, prefix] of [[instanceA, "a"], [instanceB, "b"]] as const) {
          await harness.repos.packChecks.upsertItemInstances([
            {
              id: `item_${prefix}_1`,
              packCheckInstanceId: instance.id,
              templateItemId: req.id,
              label: req.label,
              isRequired: true,
              isChecked: false,
              orderIndex: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: `item_${prefix}_2`,
              packCheckInstanceId: instance.id,
              templateItemId: opt.id,
              label: opt.label,
              isRequired: false,
              isChecked: false,
              orderIndex: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]);
        }
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: mark.id,
          dependencyType: DependencyType.PackCheckCompleted,
          requiredEntityType: DependencyRequiredEntityType.PackCheckInstance,
          requiredEntityId: instanceA.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: siblingMark.id,
          dependencyType: DependencyType.PackCheckCompleted,
          requiredEntityType: DependencyRequiredEntityType.PackCheckInstance,
          requiredEntityId: instanceB.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        await assert.rejects(() => engine.completePackCheckInstance({ packCheckInstanceId: instanceA.id }));
        await engine.completePackCheckInstance({
          packCheckInstanceId: instanceA.id,
          checkedItemIds: ["item_a_1"],
          completedAt: "2026-06-03T08:00:00.000Z",
        });
        const depsA = await harness.repos.dependencies.listDependenciesByRequiredEntity(
          DependencyRequiredEntityType.PackCheckInstance,
          instanceA.id,
        );
        const depsB = await harness.repos.dependencies.listDependenciesByRequiredEntity(
          DependencyRequiredEntityType.PackCheckInstance,
          instanceB.id,
        );
        assert.equal(depsA[0]?.status, DependencyStatus.Satisfied);
        assert.equal(depsB[0]?.status, DependencyStatus.Pending);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "PackCheckEngine future-linked visibility respects 7 PM and earliest unresolved signal while same-day linked stays in today",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createPackCheckEngine(harness.repos);
        const { path: todayPath, trailDay: todayDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-04");
        const futureDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-05");
        const futureMark = await createMark(harness, {
          pathId: todayPath.id,
          trailDayId: futureDay.id,
          localDate: "2026-06-05",
          status: MarkInstanceStatus.Planned,
        });
        const sameDayMark = await createMark(harness, {
          pathId: todayPath.id,
          trailDayId: todayDay.id,
          localDate: "2026-06-04",
          status: MarkInstanceStatus.Planned,
        });
        const futurePack = await createPackCheckInstance(harness, {
          trailDayId: todayDay.id,
          targetMarkInstanceId: futureMark.id,
          title: "Prepare tomorrow",
          status: PackCheckInstanceStatus.Scheduled,
        });
        const sameDayPack = await createPackCheckInstance(harness, {
          trailDayId: todayDay.id,
          targetMarkInstanceId: sameDayMark.id,
          title: "Same day prep",
          status: PackCheckInstanceStatus.Available,
        });

        let visible = await engine.listVisiblePackChecksForDay("user_1", "2026-06-04", "2026-06-04T11:00:00.000Z");
        assert.equal(visible.prepareTomorrow.length, 0);
        assert.equal(visible.today.some((item) => item.id === sameDayPack.id), true);

        await harness.repos.signals.createSignal({
          userId: "user_1",
          targetType: SignalTargetType.PackCheckInstance,
          targetId: futurePack.id,
          scheduledAt: "2026-06-04T11:15:00.000Z",
          status: SignalStatus.Resolved,
          resolvedAt: "2026-06-04T11:16:00.000Z",
        });
        await harness.repos.signals.createSignal({
          userId: "user_1",
          targetType: SignalTargetType.PackCheckInstance,
          targetId: futurePack.id,
          scheduledAt: "2026-06-04T11:45:00.000Z",
          status: SignalStatus.Scheduled,
        });
        visible = await engine.listVisiblePackChecksForDay("user_1", "2026-06-04", "2026-06-04T11:30:00.000Z");
        assert.equal(visible.prepareTomorrow.length, 0);

        visible = await engine.listVisiblePackChecksForDay("user_1", "2026-06-04", "2026-06-04T11:50:00.000Z");
        assert.equal(visible.prepareTomorrow.some((item) => item.id === futurePack.id), true);

        const futurePackNoSignal = await createPackCheckInstance(harness, {
          trailDayId: todayDay.id,
          targetMarkInstanceId: futureMark.id,
          title: "Prepare tomorrow 2",
          status: PackCheckInstanceStatus.Scheduled,
        });
        visible = await engine.listVisiblePackChecksForDay("user_1", "2026-06-04", "2026-06-04T11:50:00.000Z");
        assert.equal(visible.prepareTomorrow.some((item) => item.id === futurePackNoSignal.id), false);
        visible = await engine.listVisiblePackChecksForDay("user_1", "2026-06-04", "2026-06-04T12:05:00.000Z");
        assert.equal(visible.prepareTomorrow.some((item) => item.id === futurePackNoSignal.id), true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "PackCheckEngine skip, expire, and cancel update exact dependency outcomes and visibility scope",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createPackCheckEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-06");
        const targetMark = await createMark(harness, {
          pathId: path.id,
          trailDayId: trailDay.id,
          localDate: "2026-06-06",
          status: MarkInstanceStatus.Ready,
        });
        const otherMark = await createMark(harness, {
          pathId: path.id,
          trailDayId: trailDay.id,
          localDate: "2026-06-06",
          status: MarkInstanceStatus.Ready,
        });
        const independent = await createPackCheckInstance(harness, {
          trailDayId: trailDay.id,
          status: PackCheckInstanceStatus.Available,
          title: "Independent",
        });
        const linkedA = await createPackCheckInstance(harness, {
          trailDayId: trailDay.id,
          targetMarkInstanceId: targetMark.id,
          status: PackCheckInstanceStatus.Available,
          title: "Linked A",
        });
        const linkedB = await createPackCheckInstance(harness, {
          trailDayId: trailDay.id,
          targetMarkInstanceId: targetMark.id,
          status: PackCheckInstanceStatus.InProgress,
          title: "Linked B",
        });
        const sibling = await createPackCheckInstance(harness, {
          trailDayId: trailDay.id,
          targetMarkInstanceId: otherMark.id,
          status: PackCheckInstanceStatus.Available,
          title: "Sibling",
        });
        const skipDep = await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: targetMark.id,
          dependencyType: DependencyType.PackCheckCompleted,
          requiredEntityType: DependencyRequiredEntityType.PackCheckInstance,
          requiredEntityId: linkedA.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });
        const expireDep = await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: targetMark.id,
          dependencyType: DependencyType.PackCheckCompleted,
          requiredEntityType: DependencyRequiredEntityType.PackCheckInstance,
          requiredEntityId: linkedB.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });
        const cancelDep = await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: otherMark.id,
          dependencyType: DependencyType.PackCheckCompleted,
          requiredEntityType: DependencyRequiredEntityType.PackCheckInstance,
          requiredEntityId: sibling.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });

        const skipped = await engine.skipPackCheckInstance({ packCheckInstanceId: linkedA.id });
        assert.equal(skipped.status, PackCheckInstanceStatus.Skipped);
        assert.equal((await harness.repos.dependencies.listDependenciesByRequiredEntity(DependencyRequiredEntityType.PackCheckInstance, linkedA.id))[0]?.status, DependencyStatus.Failed);

        const expiring = await createPackCheckInstance(harness, {
          trailDayId: trailDay.id,
          targetMarkInstanceId: targetMark.id,
          status: PackCheckInstanceStatus.Available,
          title: "Expiring",
          dueAt: "2026-06-06T09:00:00.000Z",
        });
        await harness.repos.dependencies.createDependency({
          dependentMarkInstanceId: targetMark.id,
          dependencyType: DependencyType.PackCheckCompleted,
          requiredEntityType: DependencyRequiredEntityType.PackCheckInstance,
          requiredEntityId: expiring.id,
          isRequired: true,
          status: DependencyStatus.Pending,
        });
        const expired = await engine.expirePackCheckInstance({
          packCheckInstanceId: expiring.id,
          expiredAt: "2026-06-06T09:10:00.000Z",
        });
        assert.equal(expired.status, PackCheckInstanceStatus.Expired);
        assert.equal((await harness.repos.dependencies.listDependenciesByRequiredEntity(DependencyRequiredEntityType.PackCheckInstance, expiring.id))[0]?.status, DependencyStatus.Failed);

        const cancelled = await engine.cancelPackChecksForMarkInstance(targetMark.id);
        assert.equal(cancelled.some((item) => item.id === linkedB.id), true);
        assert.equal(cancelled.some((item) => item.id === independent.id), false);
        assert.equal(cancelled.some((item) => item.id === sibling.id), false);
        const linkedBDep = (await harness.repos.dependencies.listDependenciesByRequiredEntity(
          DependencyRequiredEntityType.PackCheckInstance,
          linkedB.id,
        ))[0];
        if (linkedBDep) {
          assert.equal(linkedBDep.status, DependencyStatus.Cancelled);
        }
        const siblingDep = (await harness.repos.dependencies.listDependenciesByRequiredEntity(
          DependencyRequiredEntityType.PackCheckInstance,
          sibling.id,
        ))[0];
        assert.equal(siblingDep?.status, DependencyStatus.Pending);
        const visible = await engine.listVisiblePackChecksForDay("user_1", "2026-06-06", "2026-06-06T10:00:00.000Z");
        assert.equal(visible.today.some((item) => item.id === linkedB.id), false);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthEngine cycle helper returns A1 B Walk A2 B Walk Walk sequence",
    run: async () => {
      assert.deepEqual(
        [0, 1, 2, 3, 4, 5, 6, 7].map((index) => getWorkoutCycleStep(index).title),
        [
          "Day A1 Strength",
          "Day B Strength",
          "Walk Day",
          "Day A2 Strength",
          "Day B Strength",
          "Walk Day",
          "Walk Day",
          "Day A1 Strength",
        ],
      );
    },
  },
  {
    name: "StrengthEngine end-session disposition requires the first two main exercises",
    run: async () => {
      const snapshot = (orderIndex: number, status: SessionExerciseStatus, phase = WorkoutExercisePhase.Strength) => ({
        id: `snapshot-${orderIndex}`,
        orderIndex,
        status,
        phase,
        createdAt: `2026-06-12T00:00:0${orderIndex}.000Z`,
      });
      assert.deepEqual(
        evaluateWorkoutEndDisposition([
          snapshot(0, SessionExerciseStatus.Completed),
          snapshot(1, SessionExerciseStatus.Completed),
          snapshot(2, SessionExerciseStatus.NotStarted),
        ] as never),
        { disposition: "partially_completed", completedMainExerciseCount: 2, requiredCompletedMainExerciseCount: 2 },
      );
      assert.deepEqual(
        evaluateWorkoutEndDisposition([
          snapshot(0, SessionExerciseStatus.Completed),
          snapshot(1, SessionExerciseStatus.NotStarted),
        ] as never),
        { disposition: "abandoned", completedMainExerciseCount: 1, requiredCompletedMainExerciseCount: 2 },
      );
    },
  },
  {
    name: "StrengthSessionEngine startWorkoutSession creates session under Mark and freezes snapshot targets",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createStrengthSessionEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-12");
        const markTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Day A Strength",
          templateType: MarkTemplateType.Workout,
          recurrenceRule: { kind: RecurrenceKind.Manual },
        });
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Day A Strength",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const squat = await createExerciseDefinition(harness, {
          title: "Barbell Squat",
          canonicalSlug: "barbell-squat",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
        });
        const routine = await createWorkoutRoutine(harness, {
          pathId: path.id,
          markTemplateId: markTemplate.id,
          title: "Day A Strength",
          routineType: WorkoutRoutineType.Strength,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: squat.id,
          phase: WorkoutExercisePhase.Strength,
          orderIndex: 0,
          targetType: ExerciseTargetType.RepsLoad,
          targetLoadKg: 100,
          targetReps: 5,
          targetSets: 3,
        });
        await harness.repos.strength.upsertExerciseProgressState({
          id: "progress_start",
          userId: "user_1",
          exerciseDefinitionId: squat.id,
          currentTargetLoadKg: 102.5,
          currentTargetReps: 5,
          currentTargetSets: 3,
          successCountSinceProgression: 1,
          manualOverride: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const session = await engine.startWorkoutSession({
          markInstanceId: mark.id,
          startedAt: "2026-06-12T06:00:00.000Z",
        });
        const persisted = await harness.repos.strength.getSessionByMarkInstance(mark.id);
        const snapshots = await harness.repos.strength.listSessionSnapshots(session.id);
        assert.equal(persisted?.markInstanceId, mark.id);
        assert.equal(session.status, WorkoutSessionStatus.Active);
        assert.equal(snapshots[0]?.targetLoadKg, 102.5);

        await harness.repos.strength.upsertExerciseProgressState({
          id: "progress_start",
          userId: "user_1",
          exerciseDefinitionId: squat.id,
          currentTargetLoadKg: 105,
          currentTargetReps: 5,
          currentTargetSets: 3,
          successCountSinceProgression: 0,
          manualOverride: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        const frozenAgain = await harness.repos.strength.listSessionSnapshots(session.id);
        assert.equal(frozenAgain[0]?.targetLoadKg, 102.5);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSessionEngine rejects invalid workout completion transition before cooldown",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createStrengthSessionEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-13");
        const markTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Day B Strength",
          templateType: MarkTemplateType.Workout,
          recurrenceRule: { kind: RecurrenceKind.Manual },
        });
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Day B Strength",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const deadlift = await createExerciseDefinition(harness, {
          title: "Barbell Deadlift",
          canonicalSlug: "barbell-deadlift",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
        });
        const routine = await createWorkoutRoutine(harness, {
          pathId: path.id,
          markTemplateId: markTemplate.id,
          title: "Day B Strength",
          routineType: WorkoutRoutineType.Strength,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: deadlift.id,
          phase: WorkoutExercisePhase.Strength,
          orderIndex: 0,
          targetType: ExerciseTargetType.RepsLoad,
          targetLoadKg: 120,
          targetReps: 5,
          targetSets: 1,
        });

        const session = await engine.startWorkoutSession({ markInstanceId: mark.id });
        await assert.rejects(() =>
          engine.completeWorkoutSession({ workoutSessionInstanceId: session.id, completedAt: "2026-06-13T06:30:00.000Z" }),
        );
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSessionEngine set completion creates ExerciseSetLog then moves to Resting and Cooldown",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createStrengthSessionEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-14");
        const markTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Day A Strength",
          templateType: MarkTemplateType.Workout,
          recurrenceRule: { kind: RecurrenceKind.Manual },
        });
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Day A Strength",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const squat = await createExerciseDefinition(harness, {
          title: "Barbell Squat",
          canonicalSlug: "barbell-squat",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
        });
        const stretch = await createExerciseDefinition(harness, {
          title: "Hamstring Stretch",
          canonicalSlug: "hamstring-stretch",
          category: ExerciseCategory.Stretch,
          targetType: ExerciseTargetType.Timed,
        });
        const routine = await createWorkoutRoutine(harness, {
          pathId: path.id,
          markTemplateId: markTemplate.id,
          title: "Day A Strength",
          routineType: WorkoutRoutineType.Hybrid,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: squat.id,
          phase: WorkoutExercisePhase.Strength,
          orderIndex: 0,
          targetType: ExerciseTargetType.RepsLoad,
          targetLoadKg: 100,
          targetReps: 5,
          targetSets: 2,
          restDurationSec: 90,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: stretch.id,
          phase: WorkoutExercisePhase.Cooldown,
          orderIndex: 1,
          targetType: ExerciseTargetType.Timed,
          targetDurationSec: 60,
        });

        const session = await engine.startWorkoutSession({ markInstanceId: mark.id });
        const [snapshot] = await harness.repos.strength.listSessionSnapshots(session.id);
        await engine.startExercise({ workoutSessionInstanceId: session.id, sessionExerciseSnapshotId: snapshot!.id });
        await engine.startSet({ workoutSessionInstanceId: session.id, sessionExerciseSnapshotId: snapshot!.id, setNumber: 1 });
        const logOne = await engine.completeExerciseSet({
          workoutSessionInstanceId: session.id,
          sessionExerciseSnapshotId: snapshot!.id,
          setNumber: 1,
          actualLoadKg: 100,
          actualReps: 5,
          completed: true,
          completedAt: "2026-06-14T06:10:00.000Z",
        });
        assert.equal(logOne.setNumber, 1);
        assert.equal((await harness.repos.strength.getSessionById(session.id))?.status, WorkoutSessionStatus.Resting);

        await engine.completeRest({ workoutSessionInstanceId: session.id });
        assert.equal((await harness.repos.strength.getSessionById(session.id))?.status, WorkoutSessionStatus.SetActive);

        await engine.completeExerciseSet({
          workoutSessionInstanceId: session.id,
          sessionExerciseSnapshotId: snapshot!.id,
          setNumber: 2,
          actualLoadKg: 100,
          actualReps: 5,
          completed: true,
          completedAt: "2026-06-14T06:20:00.000Z",
        });
        const afterFinalSet = await harness.repos.strength.getSessionById(session.id);
        assert.equal(afterFinalSet?.status, WorkoutSessionStatus.Active);
        assert.equal(afterFinalSet?.phase, WorkoutSessionPhase.Strength);

        await engine.enterCooldown({ workoutSessionInstanceId: session.id });
        assert.equal((await harness.repos.strength.getSessionById(session.id))?.status, WorkoutSessionStatus.Cooldown);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSession read model carries completed set load into the next persisted set",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const shell = createShellAdapter(harness, user);
        const engine = createStrengthSessionEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-14");
        const markTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Day A Strength",
          templateType: MarkTemplateType.Workout,
          recurrenceRule: { kind: RecurrenceKind.Manual },
        });
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Day A Strength",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const squat = await createExerciseDefinition(harness, {
          title: "Barbell Squat",
          canonicalSlug: "barbell-squat",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
        });
        const routine = await createWorkoutRoutine(harness, {
          pathId: path.id,
          markTemplateId: markTemplate.id,
          title: "Day A Strength",
          routineType: WorkoutRoutineType.Hybrid,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: squat.id,
          phase: WorkoutExercisePhase.Strength,
          orderIndex: 0,
          targetType: ExerciseTargetType.RepsLoad,
          targetLoadKg: 60,
          targetReps: 5,
          targetSets: 3,
          restDurationSec: 90,
        });

        const session = await engine.startWorkoutSession({ markInstanceId: mark.id });
        const [snapshot] = await harness.repos.strength.listSessionSnapshots(session.id);
        await engine.startExercise({ workoutSessionInstanceId: session.id, sessionExerciseSnapshotId: snapshot!.id });
        await engine.startSet({ workoutSessionInstanceId: session.id, sessionExerciseSnapshotId: snapshot!.id, setNumber: 1 });
        await engine.completeExerciseSet({
          workoutSessionInstanceId: session.id,
          sessionExerciseSnapshotId: snapshot!.id,
          setNumber: 1,
          actualLoadKg: 62.5,
          actualReps: 5,
          completed: true,
          completedAt: "2026-06-14T06:10:00.000Z",
        });

        const restingReadModel = await loadStrengthSessionReadModel(shell, mark.id, "en");
        assert.equal(restingReadModel.status, "ready");
        if (restingReadModel.status === "ready") {
          const setTwo = restingReadModel.uiSession.exercises[0]?.sets?.find((set) => set.setNumber === 2);
          assert.equal(setTwo?.state, "next");
          assert.equal(setTwo?.actualLoad, 62.5);
        }

        await engine.completeRest({ workoutSessionInstanceId: session.id });

        const activeReadModel = await loadStrengthSessionReadModel(shell, mark.id, "en");
        assert.equal(activeReadModel.status, "ready");
        if (activeReadModel.status === "ready") {
          const setTwo = activeReadModel.uiSession.exercises[0]?.sets?.find((set) => set.setNumber === 2);
          assert.equal(setTwo?.state, "active");
          assert.equal(setTwo?.actualLoad, 62.5);
        }
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSessionEngine completeCooldown completes workout session and parent Mark",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createStrengthSessionEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-15");
        const markTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Walk Day",
          templateType: MarkTemplateType.Workout,
          recurrenceRule: { kind: RecurrenceKind.Manual },
        });
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Walk Day",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const walk = await createExerciseDefinition(harness, {
          title: "Walk",
          canonicalSlug: "walk",
          category: ExerciseCategory.Walk,
          targetType: ExerciseTargetType.Steps,
        });
        const stretch = await createExerciseDefinition(harness, {
          title: "Calf Stretch",
          canonicalSlug: "calf-stretch",
          category: ExerciseCategory.Stretch,
          targetType: ExerciseTargetType.Timed,
        });
        const routine = await createWorkoutRoutine(harness, {
          pathId: path.id,
          markTemplateId: markTemplate.id,
          title: "Walk Day",
          routineType: WorkoutRoutineType.Walk,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: walk.id,
          phase: WorkoutExercisePhase.Walk,
          orderIndex: 0,
          targetType: ExerciseTargetType.Steps,
          targetSteps: 6000,
          targetSets: 1,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: stretch.id,
          phase: WorkoutExercisePhase.Cooldown,
          orderIndex: 1,
          targetType: ExerciseTargetType.Timed,
          targetDurationSec: 30,
          targetSets: 1,
        });

        const session = await engine.startWorkoutSession({ markInstanceId: mark.id });
        const snapshots = await harness.repos.strength.listSessionSnapshots(session.id);
        const walkSnapshot = snapshots.find((item) => item.phase === WorkoutExercisePhase.Walk)!;
        await engine.startExercise({ workoutSessionInstanceId: session.id, sessionExerciseSnapshotId: walkSnapshot.id });
        await engine.startSet({ workoutSessionInstanceId: session.id, sessionExerciseSnapshotId: walkSnapshot.id, setNumber: 1 });
        await engine.completeExerciseSet({
          workoutSessionInstanceId: session.id,
          sessionExerciseSnapshotId: walkSnapshot.id,
          setNumber: 1,
          actualSteps: 6200,
          completed: true,
          completedAt: "2026-06-15T07:00:00.000Z",
        });
        await engine.enterCooldown({ workoutSessionInstanceId: session.id });

        const completedSession = await engine.completeCooldown({
          workoutSessionInstanceId: session.id,
          completedAt: "2026-06-15T07:10:00.000Z",
          proofNote: "Walk done",
        });
        assert.equal(completedSession.status, WorkoutSessionStatus.Completed);
        assert.equal((await harness.repos.marks.getMarkInstanceById(mark.id))?.status, MarkInstanceStatus.Completed);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSessionEngine timed walk can complete without explicit startSet",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createStrengthSessionEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-16");
        const markTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Walk Day",
          templateType: MarkTemplateType.Workout,
          recurrenceRule: { kind: RecurrenceKind.Manual },
        });
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Walk Day",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const walk = await createExerciseDefinition(harness, {
          title: "Walk",
          canonicalSlug: "walk",
          category: ExerciseCategory.Walk,
          targetType: ExerciseTargetType.Timed,
        });
        const routine = await createWorkoutRoutine(harness, {
          pathId: path.id,
          markTemplateId: markTemplate.id,
          title: "Walk Day",
          routineType: WorkoutRoutineType.Walk,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: walk.id,
          phase: WorkoutExercisePhase.Walk,
          orderIndex: 0,
          targetType: ExerciseTargetType.Timed,
          targetDurationSec: 1800,
          targetSets: 1,
        });

        const session = await engine.startWorkoutSession({ markInstanceId: mark.id });
        const snapshots = await harness.repos.strength.listSessionSnapshots(session.id);
        const walkSnapshot = snapshots.find((item) => item.phase === WorkoutExercisePhase.Walk)!;

        const startedExercise = await engine.startExercise({
          workoutSessionInstanceId: session.id,
          sessionExerciseSnapshotId: walkSnapshot.id,
        });
        assert.equal(startedExercise.status, WorkoutSessionStatus.ExerciseActive);
        assert.equal(startedExercise.currentSetNumber, 1);

        const log = await engine.completeExerciseSet({
          workoutSessionInstanceId: session.id,
          sessionExerciseSnapshotId: walkSnapshot.id,
          setNumber: 1,
          actualDurationSec: 1800,
          completed: true,
          completedAt: "2026-06-16T07:00:00.000Z",
        });

        assert.equal(log.setNumber, 1);
        assert.equal((await harness.repos.strength.getSessionById(session.id))?.status, WorkoutSessionStatus.Cooldown);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSessionEngine repairs legacy walk session stuck in exercise_active without set",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createStrengthSessionEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-17");
        const markTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Walk Day",
          templateType: MarkTemplateType.Workout,
          recurrenceRule: { kind: RecurrenceKind.Manual },
        });
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Walk Day",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const walk = await createExerciseDefinition(harness, {
          title: "Walk",
          canonicalSlug: "walk",
          category: ExerciseCategory.Walk,
          targetType: ExerciseTargetType.Steps,
        });
        const routine = await createWorkoutRoutine(harness, {
          pathId: path.id,
          markTemplateId: markTemplate.id,
          title: "Walk Day",
          routineType: WorkoutRoutineType.Walk,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: walk.id,
          phase: WorkoutExercisePhase.Walk,
          orderIndex: 0,
          targetType: ExerciseTargetType.Steps,
          targetSteps: 6000,
          targetSets: 1,
        });

        const started = await engine.startWorkoutSession({ markInstanceId: mark.id });
        const snapshots = await harness.repos.strength.listSessionSnapshots(started.id);
        const walkSnapshot = snapshots.find((item) => item.phase === WorkoutExercisePhase.Walk)!;

        await harness.repos.strength.upsertSessionSnapshots([
          {
            ...walkSnapshot,
            status: SessionExerciseStatus.Active,
            startedAt: "2026-06-17T07:00:00.000Z",
          },
        ]);
        await harness.repos.strength.upsertSession({
          ...started,
          status: WorkoutSessionStatus.ExerciseActive,
          currentExerciseSnapshotId: walkSnapshot.id,
          currentSetNumber: null,
        });

        const repaired = await engine.startWorkoutSession({ markInstanceId: mark.id });
        assert.equal(repaired.status, WorkoutSessionStatus.SetActive);
        assert.equal(repaired.currentExerciseSnapshotId, walkSnapshot.id);
        assert.equal(repaired.currentSetNumber, 1);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSessionEngine appends missing cooldown stretches for legacy walk session",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createStrengthSessionEngine(harness.repos);
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const shell = createShellAdapter(harness, user);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-18");
        const markTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Walk Day",
          templateType: MarkTemplateType.Workout,
          recurrenceRule: { kind: RecurrenceKind.Manual },
        });
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Walk Day",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const walk = await createExerciseDefinition(harness, {
          title: "Walk",
          canonicalSlug: "walk",
          category: ExerciseCategory.Walk,
          targetType: ExerciseTargetType.Timed,
        });
        const stretch = await createExerciseDefinition(harness, {
          title: "Calf Stretch",
          canonicalSlug: "calf-stretch",
          category: ExerciseCategory.Stretch,
          targetType: ExerciseTargetType.Timed,
        });
        const routine = await createWorkoutRoutine(harness, {
          pathId: path.id,
          markTemplateId: markTemplate.id,
          title: "Walk Day",
          routineType: WorkoutRoutineType.Walk,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: walk.id,
          phase: WorkoutExercisePhase.Walk,
          orderIndex: 0,
          targetType: ExerciseTargetType.Timed,
          targetDurationSec: 1800,
          targetSets: 1,
        });

        const session = await engine.startWorkoutSession({ markInstanceId: mark.id });
        const snapshots = await harness.repos.strength.listSessionSnapshots(session.id);
        const walkSnapshot = snapshots.find((item) => item.phase === WorkoutExercisePhase.Walk)!;
        await engine.startExercise({ workoutSessionInstanceId: session.id, sessionExerciseSnapshotId: walkSnapshot.id });
        await engine.completeExerciseSet({
          workoutSessionInstanceId: session.id,
          sessionExerciseSnapshotId: walkSnapshot.id,
          setNumber: 1,
          actualDurationSec: 1800,
          completed: true,
          completedAt: "2026-06-18T07:00:00.000Z",
        });

        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: stretch.id,
          phase: WorkoutExercisePhase.Stretch,
          orderIndex: 1,
          targetType: ExerciseTargetType.Timed,
          targetDurationSec: 30,
          targetSets: 1,
        });

        const reopened = await engine.startWorkoutSession({ markInstanceId: mark.id });
        assert.equal(reopened.status, WorkoutSessionStatus.Cooldown);

        const readModel = await loadStrengthSessionReadModel(shell, mark.id, "en");
        assert.equal(readModel.status, "ready");
        if (readModel.status === "ready") {
          assert.equal(readModel.uiSession.dayLabel, "Walk");
          assert.equal(readModel.uiSession.stretches.length, 1);
        }
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSessionEngine rejects completeExerciseSet before a set is started and does not write logs",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createStrengthSessionEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-15");
        const markTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Day B Strength",
          templateType: MarkTemplateType.Workout,
          recurrenceRule: { kind: RecurrenceKind.Manual },
        });
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Day B Strength",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const deadlift = await createExerciseDefinition(harness, {
          title: "Deadlift",
          canonicalSlug: "deadlift",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
        });
        const routine = await createWorkoutRoutine(harness, {
          pathId: path.id,
          markTemplateId: markTemplate.id,
          title: "Day B Strength",
          routineType: WorkoutRoutineType.Strength,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: deadlift.id,
          phase: WorkoutExercisePhase.Strength,
          orderIndex: 0,
          targetType: ExerciseTargetType.RepsLoad,
          targetLoadKg: 70,
          targetReps: 5,
          targetSets: 3,
          restDurationSec: 90,
        });

        const session = await engine.startWorkoutSession({ markInstanceId: mark.id });
        const [snapshot] = await harness.repos.strength.listSessionSnapshots(session.id);
        await engine.startExercise({ workoutSessionInstanceId: session.id, sessionExerciseSnapshotId: snapshot!.id });

        await assert.rejects(async () => {
          try {
            await engine.completeExerciseSet({
              workoutSessionInstanceId: session.id,
              sessionExerciseSnapshotId: snapshot!.id,
              setNumber: 1,
              actualLoadKg: 70,
              actualReps: 5,
              completed: true,
              completedAt: "2026-06-15T07:00:00.000Z",
            });
          } catch (error) {
            const message =
              error instanceof Error && error.cause instanceof Error ? error.cause.message
              : error instanceof Error ? error.message
              : "";
            assert.match(message, /no set is active/i);
            throw error;
          }
        });
        assert.equal((await harness.repos.strength.getSessionById(session.id))?.status, WorkoutSessionStatus.ExerciseActive);
        assert.equal((await harness.repos.strength.listSetLogs(snapshot!.id)).length, 0);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSessionEngine rebuilds pristine stale workout snapshots to match the current routine",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);
        const markEngine = createMarkEngine(harness.repos);
        const sessionEngine = createStrengthSessionEngine(harness.repos);

        await markEngine.generateMarkInstancesForDate("user_1", "2026-05-20");
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);
        const marks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-05-20");
        const workoutMark = marks.find((mark) => mark.pathId === healthPath!.id && mark.title === "Workout B");
        assert.ok(workoutMark);

        const dayBRoutine = (await harness.repos.strength.listRoutinesByPath(healthPath!.id)).find(
          (routine) => routine.markTemplateId === workoutMark!.templateId,
        );
        assert.ok(dayBRoutine);

        const staleSession = await harness.repos.strength.upsertSession({
          id: "stale_day_b_session",
          userId: "user_1",
          markInstanceId: workoutMark!.id,
          routineTemplateId: dayBRoutine!.id,
          status: WorkoutSessionStatus.Active,
          phase: WorkoutSessionPhase.Strength,
          currentExerciseSnapshotId: undefined,
          currentSetNumber: undefined,
          createdAt: "2026-05-25T05:00:00.000Z",
          updatedAt: "2026-05-25T05:00:00.000Z",
        });
        const staleDeadlift = await createExerciseDefinition(harness, {
          id: "stale_deadlift_def",
          title: "Deadlift",
          canonicalSlug: "deadlift",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
        });
        const stalePress = await createExerciseDefinition(harness, {
          id: "stale_press_def",
          title: "Standing Barbell Military Press",
          canonicalSlug: "standing-barbell-military-press",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
        });
        const staleStretch = await createExerciseDefinition(harness, {
          id: "stale_ab_wheel_def",
          title: "Ab Wheel Rollout",
          canonicalSlug: "ab-wheel-rollout",
          category: ExerciseCategory.Mobility,
          targetType: ExerciseTargetType.RepsOnly,
        });
        await harness.repos.strength.upsertSessionSnapshots([
          {
            id: "stale_snapshot_deadlift",
            workoutSessionInstanceId: staleSession.id,
            exerciseDefinitionId: staleDeadlift.id,
            exerciseNameSnapshot: "Deadlift",
            phase: WorkoutExercisePhase.Strength,
            orderIndex: 0,
            targetType: ExerciseTargetType.RepsLoad,
            targetLoadKg: 70,
            targetReps: 5,
            targetSets: 3,
            wasOverridden: false,
            status: SessionExerciseStatus.Active,
            createdAt: "2026-05-25T05:00:00.000Z",
            updatedAt: "2026-05-25T05:00:00.000Z",
          },
          {
            id: "stale_snapshot_press",
            workoutSessionInstanceId: staleSession.id,
            exerciseDefinitionId: stalePress.id,
            exerciseNameSnapshot: "Standing Barbell Military Press",
            phase: WorkoutExercisePhase.Strength,
            orderIndex: 1,
            targetType: ExerciseTargetType.RepsLoad,
            targetLoadKg: 30,
            targetReps: 5,
            targetSets: 3,
            wasOverridden: false,
            status: SessionExerciseStatus.NotStarted,
            createdAt: "2026-05-25T05:00:00.000Z",
            updatedAt: "2026-05-25T05:00:00.000Z",
          },
          {
            id: "stale_snapshot_ab_wheel",
            workoutSessionInstanceId: staleSession.id,
            exerciseDefinitionId: staleStretch.id,
            exerciseNameSnapshot: "Ab Wheel Rollout",
            phase: WorkoutExercisePhase.Cooldown,
            orderIndex: 2,
            targetType: ExerciseTargetType.RepsOnly,
            targetReps: 8,
            targetSets: 2,
            wasOverridden: false,
            status: SessionExerciseStatus.NotStarted,
            createdAt: "2026-05-25T05:00:00.000Z",
            updatedAt: "2026-05-25T05:00:00.000Z",
          },
        ]);
        await harness.repos.strength.upsertSession({
          ...staleSession,
          status: WorkoutSessionStatus.SetActive,
          currentExerciseSnapshotId: "stale_snapshot_deadlift",
          currentSetNumber: 1,
          updatedAt: "2026-05-25T05:00:00.000Z",
        });

        const started = await sessionEngine.startWorkoutSession({ markInstanceId: workoutMark!.id });
        assert.equal(started.id, staleSession.id);

        const freshSnapshots = await harness.repos.strength.listSessionSnapshots(staleSession.id);
        assert.equal(freshSnapshots.length, 18);
        assert.deepEqual(
          freshSnapshots
            .filter((snapshot) => snapshot.phase === WorkoutExercisePhase.Strength)
            .map((snapshot) => snapshot.exerciseNameSnapshot),
          [
            "Barbell Deadlift",
            "Bent Over Barbell Row",
            "Wood Chop",
            "Kneeling Ab Wheel Rollout",
          ],
        );
        assert.deepEqual(
          freshSnapshots
            .filter((snapshot) => snapshot.phase === WorkoutExercisePhase.Stretch)
            .slice(0, 3)
            .map((snapshot) => snapshot.exerciseNameSnapshot),
          ["Calf Stretch Left", "Calf Stretch Right", "Forward Bend"],
        );
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthProgressionService applies named progression rules and caps",
    run: async () => {
      const harness = await createHarness();
      try {
        const service = createStrengthProgressionService(harness.repos);
        const cases: Array<{
          slug: string;
          title: string;
          targetType: ExerciseTargetType;
          currentState: {
            currentTargetLoadKg?: number;
            currentTargetReps?: number;
            currentTargetSets?: number;
            currentTargetDurationSec?: number;
            successCountSinceProgression: number;
          };
          logs: Array<{
            actualLoadKg?: number;
            actualReps?: number;
            actualDurationSec?: number;
            completed: boolean;
          }>;
          expectLoad?: number;
          expectDuration?: number;
          expectReps?: number;
        }> = [
          {
            slug: "barbell-squat",
            title: "Barbell Squat",
            targetType: ExerciseTargetType.RepsLoad,
            currentState: { currentTargetLoadKg: 100, currentTargetReps: 5, currentTargetSets: 3, successCountSinceProgression: 1 },
            logs: [{ actualLoadKg: 100, actualReps: 5, completed: true }, { actualLoadKg: 100, actualReps: 5, completed: true }, { actualLoadKg: 100, actualReps: 5, completed: true }],
            expectLoad: 102.5,
          },
          {
            slug: "barbell-squat-actual-baseline-held",
            title: "Barbell Squat Actual Baseline Held",
            targetType: ExerciseTargetType.RepsLoad,
            currentState: { currentTargetLoadKg: 60, currentTargetReps: 5, currentTargetSets: 3, successCountSinceProgression: 0 },
            logs: [{ actualLoadKg: 62.5, actualReps: 5, completed: true }, { actualLoadKg: 62.5, actualReps: 5, completed: true }, { actualLoadKg: 62.5, actualReps: 5, completed: true }],
            expectLoad: 62.5,
          },
          {
            slug: "barbell-squat-actual-baseline-advanced",
            title: "Barbell Squat Actual Baseline Advanced",
            targetType: ExerciseTargetType.RepsLoad,
            currentState: { currentTargetLoadKg: 60, currentTargetReps: 5, currentTargetSets: 3, successCountSinceProgression: 1 },
            logs: [{ actualLoadKg: 62.5, actualReps: 5, completed: true }, { actualLoadKg: 62.5, actualReps: 5, completed: true }, { actualLoadKg: 62.5, actualReps: 5, completed: true }],
            expectLoad: 65,
          },
          {
            slug: "standing-barbell-military-press",
            title: "Standing Barbell Military Press",
            targetType: ExerciseTargetType.RepsLoad,
            currentState: { currentTargetLoadKg: 60, currentTargetReps: 8, currentTargetSets: 2, successCountSinceProgression: 2 },
            logs: [{ actualLoadKg: 60, actualReps: 8, completed: true }, { actualLoadKg: 60, actualReps: 8, completed: true }],
            expectLoad: 62.5,
          },
          {
            slug: "barbell-bench-press",
            title: "Barbell Bench Press",
            targetType: ExerciseTargetType.RepsLoad,
            currentState: { currentTargetLoadKg: 80, currentTargetReps: 8, currentTargetSets: 3, successCountSinceProgression: 1 },
            logs: [{ actualLoadKg: 80, actualReps: 8, completed: true }, { actualLoadKg: 80, actualReps: 8, completed: true }, { actualLoadKg: 80, actualReps: 8, completed: true }],
            expectLoad: 82.5,
          },
          {
            slug: "barbell-deadlift",
            title: "Barbell Deadlift",
            targetType: ExerciseTargetType.RepsLoad,
            currentState: { currentTargetLoadKg: 140, currentTargetReps: 5, currentTargetSets: 3, successCountSinceProgression: 0 },
            logs: [{ actualLoadKg: 140, actualReps: 5, completed: true }, { actualLoadKg: 140, actualReps: 5, completed: true }, { actualLoadKg: 140, actualReps: 5, completed: true }],
            expectLoad: 142.5,
          },
          {
            slug: "plank",
            title: "Plank",
            targetType: ExerciseTargetType.Timed,
            currentState: { currentTargetDurationSec: 120, currentTargetSets: 1, successCountSinceProgression: 0 },
            logs: [{ actualDurationSec: 130, completed: true }],
            expectDuration: 120,
          },
          {
            slug: "kneeling-ab-wheel-rollout",
            title: "Kneeling Ab Wheel Rollout",
            targetType: ExerciseTargetType.RepsOnly,
            currentState: { currentTargetReps: 30, currentTargetSets: 2, successCountSinceProgression: 0 },
            logs: [{ actualReps: 30, completed: true }, { actualReps: 30, completed: true }],
            expectReps: 30,
          },
        ];

        for (const item of cases) {
          const exercise = await createExerciseDefinition(harness, {
            title: item.title,
            canonicalSlug: item.slug,
            category: ExerciseCategory.Strength,
            targetType: item.targetType,
          });
          const evaluation = await service.evaluateExerciseResult({
            snapshot: {
              id: `snapshot_${item.slug}`,
              workoutSessionInstanceId: "session_strength",
              exerciseDefinitionId: exercise.id,
              exerciseNameSnapshot: item.title,
              phase: WorkoutExercisePhase.Strength,
              orderIndex: 0,
              targetType: item.targetType,
              targetLoadKg: item.currentState.currentTargetLoadKg ?? undefined,
              targetReps: item.currentState.currentTargetReps ?? undefined,
              targetSets: item.currentState.currentTargetSets,
              targetDurationSec: item.currentState.currentTargetDurationSec ?? undefined,
              wasOverridden: false,
              status: SessionExerciseStatus.Completed,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            setLogs: item.logs.map((log, index) => ({
              id: `log_${item.slug}_${index}`,
              sessionExerciseSnapshotId: `snapshot_${item.slug}`,
              setNumber: index + 1,
              actualLoadKg: "actualLoadKg" in log ? log.actualLoadKg : undefined,
              actualReps: "actualReps" in log ? log.actualReps : undefined,
              actualDurationSec: "actualDurationSec" in log ? log.actualDurationSec : undefined,
              completed: log.completed,
              completedAt: "2026-06-15T08:00:00.000Z",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })),
            currentState: {
              id: `progress_${item.slug}`,
              userId: "user_1",
              exerciseDefinitionId: exercise.id,
              currentTargetLoadKg: item.currentState.currentTargetLoadKg ?? undefined,
              currentTargetReps: item.currentState.currentTargetReps ?? undefined,
              currentTargetSets: item.currentState.currentTargetSets,
              currentTargetDurationSec: item.currentState.currentTargetDurationSec ?? undefined,
              successCountSinceProgression: item.currentState.successCountSinceProgression,
              manualOverride: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            exerciseDefinition: exercise,
            acceptForProgression: true,
          });

          if ("expectLoad" in item) {
            assert.equal(evaluation.nextState.currentTargetLoadKg, item.expectLoad);
          }
          if ("expectDuration" in item) {
            assert.equal(evaluation.nextState.currentTargetDurationSec, item.expectDuration);
          }
          if ("expectReps" in item) {
            assert.equal(evaluation.nextState.currentTargetReps, item.expectReps);
          }
        }
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthProgressionService failure holds progression and does not reset success count in MVP",
    run: async () => {
      const harness = await createHarness();
      try {
        const service = createStrengthProgressionService(harness.repos);
        const exercise = await createExerciseDefinition(harness, {
          title: "Barbell Squat",
          canonicalSlug: "barbell-squat",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
        });
        const evaluation = await service.evaluateExerciseResult({
          snapshot: {
            id: "snapshot_fail",
            workoutSessionInstanceId: "session_fail",
            exerciseDefinitionId: exercise.id,
            exerciseNameSnapshot: exercise.title,
            phase: WorkoutExercisePhase.Strength,
            orderIndex: 0,
            targetType: ExerciseTargetType.RepsLoad,
            targetLoadKg: 100,
            targetReps: 5,
            targetSets: 3,
            wasOverridden: false,
            status: SessionExerciseStatus.Failed,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          setLogs: [
            {
              id: "log_fail",
              sessionExerciseSnapshotId: "snapshot_fail",
              setNumber: 1,
              actualLoadKg: 100,
              actualReps: 3,
              completed: false,
              completedAt: "2026-06-15T09:00:00.000Z",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          currentState: {
            id: "progress_fail",
            userId: "user_1",
            exerciseDefinitionId: exercise.id,
            currentTargetLoadKg: 100,
            currentTargetReps: 5,
            currentTargetSets: 3,
            successCountSinceProgression: 1,
            manualOverride: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          exerciseDefinition: exercise,
          acceptForProgression: true,
        });

        assert.equal(evaluation.advanced, false);
        assert.equal(evaluation.nextState.currentTargetLoadKg, 100);
        assert.equal(evaluation.nextState.successCountSinceProgression, 1);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthRepository upsertExerciseProgressState recovers when incoming state id is stale but active user exercise row already exists",
    run: async () => {
      const harness = await createHarness();
      try {
        const { path } = await createPathAndTrailDay(harness, "user_1", "2026-06-18");
        const exercise = await createExerciseDefinition(harness, {
          pathId: path.id,
          title: "Barbell Squat",
          canonicalSlug: "barbell-squat",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
        });

        const existing = await harness.repos.strength.upsertExerciseProgressState({
          id: "progress_existing",
          userId: "user_1",
          exerciseDefinitionId: exercise.id,
          currentTargetLoadKg: 60,
          currentTargetReps: 5,
          currentTargetSets: 3,
          successCountSinceProgression: 1,
          manualOverride: false,
          createdAt: "2026-06-18T06:00:00.000Z",
          updatedAt: "2026-06-18T06:00:00.000Z",
        });

        const updated = await harness.repos.strength.upsertExerciseProgressState({
          id: "progress_stale_from_runtime",
          userId: "user_1",
          exerciseDefinitionId: exercise.id,
          currentTargetLoadKg: 62.5,
          currentTargetReps: 5,
          currentTargetSets: 3,
          successCountSinceProgression: 0,
          lastSessionResult: "completed",
          lastSessionAt: "2026-06-18T06:30:00.000Z",
          manualOverride: false,
          lastProgressionOutcome: "advanced",
          createdAt: "2026-06-18T06:30:00.000Z",
          updatedAt: "2026-06-18T06:30:00.000Z",
        });

        assert.equal(updated.id, existing.id);
        assert.equal(updated.currentTargetLoadKg, 62.5);
        assert.equal(updated.lastProgressionOutcome, "advanced");

        const persisted = await harness.repos.strength.getProgressState("user_1", exercise.id);
        assert.equal(persisted?.id, existing.id);
        assert.equal(persisted?.currentTargetLoadKg, 62.5);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSessionEngine manual override lower does not progress by default and higher can progress when accepted",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createStrengthSessionEngine(harness.repos);
        const service = createStrengthProgressionService(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-16");
        const markTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Press Day",
          templateType: MarkTemplateType.Workout,
          recurrenceRule: { kind: RecurrenceKind.Manual },
        });
        const exercise = await createExerciseDefinition(harness, {
          title: "Standing Barbell Military Press",
          canonicalSlug: "standing-barbell-military-press",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
        });
        const routine = await createWorkoutRoutine(harness, {
          pathId: path.id,
          markTemplateId: markTemplate.id,
          title: "Press Day",
          routineType: WorkoutRoutineType.Strength,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: exercise.id,
          phase: WorkoutExercisePhase.Strength,
          orderIndex: 0,
          targetType: ExerciseTargetType.RepsLoad,
          targetLoadKg: 60,
          targetReps: 8,
          targetSets: 2,
        });
        await harness.repos.strength.upsertExerciseProgressState({
          id: "progress_override",
          userId: "user_1",
          exerciseDefinitionId: exercise.id,
          currentTargetLoadKg: 60,
          currentTargetReps: 8,
          currentTargetSets: 2,
          successCountSinceProgression: 2,
          manualOverride: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        const lowerMark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Press Day",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const lowerSession = await engine.startWorkoutSession({ markInstanceId: lowerMark.id });
        const [lowerSnapshot] = await harness.repos.strength.listSessionSnapshots(lowerSession.id);
        const lowered = await engine.overrideSessionExerciseTarget({
          workoutSessionInstanceId: lowerSession.id,
          sessionExerciseSnapshotId: lowerSnapshot!.id,
          targetLoadKg: 55,
        });
        const lowerEval = await service.evaluateExerciseResult({
          snapshot: lowered,
          setLogs: [
            {
              id: "log_lower_1",
              sessionExerciseSnapshotId: lowered.id,
              setNumber: 1,
              actualLoadKg: 55,
              actualReps: 8,
              completed: true,
              completedAt: "2026-06-16T07:00:00.000Z",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: "log_lower_2",
              sessionExerciseSnapshotId: lowered.id,
              setNumber: 2,
              actualLoadKg: 55,
              actualReps: 8,
              completed: true,
              completedAt: "2026-06-16T07:10:00.000Z",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          currentState: await harness.repos.strength.getProgressState("user_1", exercise.id),
          exerciseDefinition: exercise,
          acceptForProgression: false,
        });
        assert.equal(lowerEval.advanced, false);
        assert.equal(lowerEval.nextState.currentTargetLoadKg, 60);

        const higherMark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Press Day 2",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const higherSession = await engine.startWorkoutSession({ markInstanceId: higherMark.id });
        const [higherSnapshot] = await harness.repos.strength.listSessionSnapshots(higherSession.id);
        const raised = await engine.overrideSessionExerciseTarget({
          workoutSessionInstanceId: higherSession.id,
          sessionExerciseSnapshotId: higherSnapshot!.id,
          targetLoadKg: 62.5,
          acceptForProgression: true,
        });
        const higherEval = await service.evaluateExerciseResult({
          snapshot: raised,
          setLogs: [
            {
              id: "log_higher_1",
              sessionExerciseSnapshotId: raised.id,
              setNumber: 1,
              actualLoadKg: 62.5,
              actualReps: 8,
              completed: true,
              completedAt: "2026-06-16T08:00:00.000Z",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: "log_higher_2",
              sessionExerciseSnapshotId: raised.id,
              setNumber: 2,
              actualLoadKg: 62.5,
              actualReps: 8,
              completed: true,
              completedAt: "2026-06-16T08:10:00.000Z",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          currentState: await harness.repos.strength.getProgressState("user_1", exercise.id),
          exerciseDefinition: exercise,
          acceptForProgression: true,
        });
        assert.equal(higherEval.advanced, true);
        assert.equal(higherEval.nextState.currentTargetLoadKg, 65);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSessionEngine transaction rollback prevents partial workout completion and abandon does not complete Mark",
    run: async () => {
      const harness = await createHarness();
      try {
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-17");
        const markTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: path.id,
          title: "Ab Wheel Day",
          templateType: MarkTemplateType.Workout,
          recurrenceRule: { kind: RecurrenceKind.Manual },
        });
        const exercise = await createExerciseDefinition(harness, {
          title: "Kneeling Ab Wheel Rollout",
          canonicalSlug: "kneeling-ab-wheel-rollout",
          category: ExerciseCategory.Core,
          targetType: ExerciseTargetType.RepsOnly,
        });
        const routine = await createWorkoutRoutine(harness, {
          pathId: path.id,
          markTemplateId: markTemplate.id,
          title: "Ab Wheel Day",
          routineType: WorkoutRoutineType.Strength,
        });
        await addRoutineExercise(harness, {
          routineId: routine.id,
          exerciseDefinitionId: exercise.id,
          phase: WorkoutExercisePhase.Strength,
          orderIndex: 0,
          targetType: ExerciseTargetType.RepsOnly,
          targetReps: 10,
          targetSets: 2,
        });
        const mark = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Ab Wheel Day",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const sessionEngine = createStrengthSessionEngine(harness.repos);
        const session = await sessionEngine.startWorkoutSession({ markInstanceId: mark.id });
        const [snapshot] = await harness.repos.strength.listSessionSnapshots(session.id);
        await sessionEngine.startExercise({ workoutSessionInstanceId: session.id, sessionExerciseSnapshotId: snapshot!.id });
        await sessionEngine.startSet({ workoutSessionInstanceId: session.id, sessionExerciseSnapshotId: snapshot!.id, setNumber: 1 });
        await sessionEngine.completeExerciseSet({
          workoutSessionInstanceId: session.id,
          sessionExerciseSnapshotId: snapshot!.id,
          setNumber: 1,
          actualReps: 10,
          completed: true,
          completedAt: "2026-06-17T07:00:00.000Z",
        });
        await sessionEngine.completeRest({ workoutSessionInstanceId: session.id });
        await sessionEngine.completeExerciseSet({
          workoutSessionInstanceId: session.id,
          sessionExerciseSnapshotId: snapshot!.id,
          setNumber: 2,
          actualReps: 10,
          completed: true,
          completedAt: "2026-06-17T07:10:00.000Z",
        });
        assert.equal((await harness.repos.strength.getSessionById(session.id))?.status, WorkoutSessionStatus.Cooldown);

        const rollbackRepos = {
          ...harness.repos,
          transaction: {
            runInTransaction: <T,>(work: (repositories: typeof harness.repos) => Promise<T>) =>
              harness.repos.transaction.runInTransaction(async (txRepos) => {
                await work(txRepos);
                throw new Error("force strength rollback");
              }),
          },
        };
        const rollbackEngine = createStrengthSessionEngine(rollbackRepos);
        await assert.rejects(() =>
          rollbackEngine.completeWorkoutSession({
            workoutSessionInstanceId: session.id,
            completedAt: "2026-06-17T07:20:00.000Z",
          }),
        );
        assert.equal((await harness.repos.strength.getSessionById(session.id))?.status, WorkoutSessionStatus.Cooldown);
        assert.equal((await harness.repos.marks.getMarkInstanceById(mark.id))?.status, MarkInstanceStatus.Active);

        const markTwo = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: path.id,
          trailDayId: trailDay.id,
          templateId: markTemplate.id,
          title: "Ab Wheel Day 2",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Ready,
          proofMediaAssetIds: [],
        });
        const activeSession = await sessionEngine.startWorkoutSession({ markInstanceId: markTwo.id });
        const abandoned = await sessionEngine.abandonWorkoutSession({
          workoutSessionInstanceId: activeSession.id,
          note: "Stopped early",
        });
        assert.equal(abandoned.status, WorkoutSessionStatus.Abandoned);
        assert.notEqual((await harness.repos.marks.getMarkInstanceById(markTwo.id))?.status, MarkInstanceStatus.Completed);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "SignalEngine rejects invalid transition from Resolved to Ringing",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createSignalEngine(harness.repos);
        assert.equal(engine.canTransitionSignalStatus(SignalStatus.Resolved, SignalStatus.Ringing), false);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "SignalEngine rings due scheduled signals and ignores not-yet-due or dismissed signals",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createSignalEngine(harness.repos);
        const mark = await createMark(harness, { localDate: "2026-06-07", status: MarkInstanceStatus.Ready });
        const due = await createSignal(harness, {
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          scheduledAt: "2026-06-07T07:00:00.000Z",
          status: SignalStatus.Scheduled,
        });
        const later = await createSignal(harness, {
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          scheduledAt: "2026-06-07T08:00:00.000Z",
          status: SignalStatus.Scheduled,
        });
        await createSignal(harness, {
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          scheduledAt: "2026-06-07T06:00:00.000Z",
          status: SignalStatus.Dismissed,
          dismissedAt: "2026-06-07T06:01:00.000Z",
        });

        const rung = await engine.ringDueSignals({ now: "2026-06-07T07:15:00.000Z" });
        assert.deepEqual(rung.map((item) => item.id), [due.id]);
        assert.equal((await harness.repos.signals.getSignalById(due.id))?.status, SignalStatus.Ringing);
        assert.equal((await harness.repos.signals.getSignalById(later.id))?.status, SignalStatus.Scheduled);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Runtime startup resolves non-today signals before ringing today's due signals",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en",
          timezone: "UTC",
          weekStartsOn: 1,
          closeTrailPromptTime: "21:30",
        });
        const yesterdayMark = await createMark(harness, {
          userId: user.id,
          localDate: "2026-06-21",
          status: MarkInstanceStatus.Ready,
          title: "Yesterday signal",
        });
        const todayMark = await createMark(harness, {
          userId: user.id,
          localDate: "2026-06-22",
          status: MarkInstanceStatus.Ready,
          title: "Today signal",
        });
        const futureMark = await createMark(harness, {
          userId: user.id,
          localDate: "2026-06-23",
          status: MarkInstanceStatus.Ready,
          title: "Future signal",
        });
        const yesterdaySignal = await createSignal(harness, {
          userId: user.id,
          targetType: SignalTargetType.MarkInstance,
          targetId: yesterdayMark.id,
          scheduledAt: "2026-06-21T21:00:00.000Z",
          status: SignalStatus.Scheduled,
        });
        const todaySignal = await createSignal(harness, {
          userId: user.id,
          targetType: SignalTargetType.MarkInstance,
          targetId: todayMark.id,
          scheduledAt: "2026-06-22T08:00:00.000Z",
          status: SignalStatus.Scheduled,
        });
        const futureSignal = await createSignal(harness, {
          userId: user.id,
          targetType: SignalTargetType.MarkInstance,
          targetId: futureMark.id,
          scheduledAt: "2026-06-23T08:00:00.000Z",
          status: SignalStatus.Scheduled,
        });
        const signalEngine = createSignalEngine(harness.repos);
        const services = {
          repositories: harness.repos,
          user,
          markEngine: createMarkEngine(harness.repos),
          packCheckEngine: createPackCheckEngine(harness.repos),
          signalEngine,
        };

        const report = await materializeRuntimeForDate(services as never, "2026-06-22", "2026-06-22T09:00:00.000Z");

        assert.deepEqual(report.resolvedNonTodaySignals.map((signal) => signal.id), [yesterdaySignal.id]);
        assert.deepEqual(report.ringingSignals.map((signal) => signal.id), [todaySignal.id]);
        assert.equal((await harness.repos.signals.getSignalById(yesterdaySignal.id))?.status, SignalStatus.Resolved);
        assert.equal((await harness.repos.signals.getSignalById(todaySignal.id))?.status, SignalStatus.Ringing);
        assert.equal((await harness.repos.signals.getSignalById(futureSignal.id))?.status, SignalStatus.Scheduled);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Runtime startup misses today's signals more than 90 minutes overdue before ringing due signals",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en",
          timezone: "UTC",
          weekStartsOn: 1,
          closeTrailPromptTime: "21:30",
        });
        const staleMark = await createMark(harness, {
          userId: user.id,
          localDate: "2026-06-22",
          status: MarkInstanceStatus.Ready,
          title: "Stale scheduled signal",
        });
        const boundaryMark = await createMark(harness, {
          userId: user.id,
          localDate: "2026-06-22",
          status: MarkInstanceStatus.Ready,
          title: "Boundary scheduled signal",
        });
        const staleSnoozedMark = await createMark(harness, {
          userId: user.id,
          localDate: "2026-06-22",
          status: MarkInstanceStatus.Ready,
          title: "Stale snoozed signal",
        });
        const boundarySnoozedMark = await createMark(harness, {
          userId: user.id,
          localDate: "2026-06-22",
          status: MarkInstanceStatus.Ready,
          title: "Boundary snoozed signal",
        });
        const staleSignal = await createSignal(harness, {
          userId: user.id,
          targetType: SignalTargetType.MarkInstance,
          targetId: staleMark.id,
          scheduledAt: "2026-06-22T07:00:00.000Z",
          status: SignalStatus.Scheduled,
        });
        const boundarySignal = await createSignal(harness, {
          userId: user.id,
          targetType: SignalTargetType.MarkInstance,
          targetId: boundaryMark.id,
          scheduledAt: "2026-06-22T07:01:00.000Z",
          status: SignalStatus.Scheduled,
        });
        const staleSnoozedSignal = await createSignal(harness, {
          userId: user.id,
          targetType: SignalTargetType.MarkInstance,
          targetId: staleSnoozedMark.id,
          scheduledAt: "2026-06-22T06:00:00.000Z",
          status: SignalStatus.Snoozed,
          snoozedUntil: "2026-06-22T07:00:00.000Z",
        });
        const boundarySnoozedSignal = await createSignal(harness, {
          userId: user.id,
          targetType: SignalTargetType.MarkInstance,
          targetId: boundarySnoozedMark.id,
          scheduledAt: "2026-06-22T06:00:00.000Z",
          status: SignalStatus.Snoozed,
          snoozedUntil: "2026-06-22T07:01:00.000Z",
        });
        const services = {
          repositories: harness.repos,
          user,
          markEngine: createMarkEngine(harness.repos),
          packCheckEngine: createPackCheckEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
        };

        const report = await materializeRuntimeForDate(services as never, "2026-06-22", "2026-06-22T08:31:00.000Z");

        assert.deepEqual(
          report.missedStaleSignals.map((signal) => signal.id).sort(),
          [staleSignal.id, staleSnoozedSignal.id].sort(),
        );
        assert.deepEqual(
          report.ringingSignals.map((signal) => signal.id).sort(),
          [boundarySignal.id, boundarySnoozedSignal.id].sort(),
        );
        assert.equal((await harness.repos.signals.getSignalById(staleSignal.id))?.status, SignalStatus.Missed);
        assert.equal((await harness.repos.signals.getSignalById(staleSnoozedSignal.id))?.status, SignalStatus.Missed);
        assert.equal((await harness.repos.signals.getSignalById(boundarySignal.id))?.status, SignalStatus.Ringing);
        assert.equal((await harness.repos.signals.getSignalById(boundarySnoozedSignal.id))?.status, SignalStatus.Ringing);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "SignalEngine snoozes ringing signal and re-rings when snoozedUntil is due",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createSignalEngine(harness.repos);
        const mark = await createMark(harness, { localDate: "2026-06-07", status: MarkInstanceStatus.Ready });
        const signal = await createSignal(harness, {
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          status: SignalStatus.Ringing,
          scheduledAt: "2026-06-07T07:00:00.000Z",
          ringingStartedAt: "2026-06-07T07:00:00.000Z",
        });

        const snoozed = await engine.snoozeSignal({
          signalId: signal.id,
          snoozedUntil: "2026-06-07T07:30:00.000Z",
          now: "2026-06-07T07:05:00.000Z",
        });
        assert.equal(snoozed.status, SignalStatus.Snoozed);
        assert.equal(snoozed.snoozedUntil, "2026-06-07T07:30:00.000Z");

        await assert.rejects(() =>
          engine.snoozeSignal({
            signalId: signal.id,
            snoozedUntil: "2026-06-07T07:00:00.000Z",
            now: "2026-06-07T07:05:00.000Z",
          }),
        );

        const rung = await engine.ringDueSignals({ now: "2026-06-07T07:31:00.000Z" });
        assert.equal(rung.some((item) => item.id === signal.id), true);
        assert.equal((await harness.repos.signals.getSignalById(signal.id))?.status, SignalStatus.Ringing);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "SignalEngine dismisses and resolves exact target signals for Mark PackCheck and TrailDay",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createSignalEngine(harness.repos);
        const { trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-08");
        const mark = await createMark(harness, {
          trailDayId: trailDay.id,
          localDate: "2026-06-08",
          status: MarkInstanceStatus.Ready,
        });
        const packCheck = await createPackCheckInstance(harness, {
          trailDayId: trailDay.id,
          targetMarkInstanceId: mark.id,
          status: PackCheckInstanceStatus.Available,
        });

        const ringing = await createSignal(harness, {
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          status: SignalStatus.Ringing,
          scheduledAt: "2026-06-08T08:00:00.000Z",
          ringingStartedAt: "2026-06-08T08:00:00.000Z",
        });
        const markScheduled = await createSignal(harness, {
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
        });
        const packSignal = await createSignal(harness, {
          targetType: SignalTargetType.PackCheckInstance,
          targetId: packCheck.id,
        });
        const trailSignal = await createSignal(harness, {
          targetType: SignalTargetType.TrailDay,
          targetId: trailDay.id,
        });

        const dismissed = await engine.dismissSignal({
          signalId: ringing.id,
          dismissedAt: "2026-06-08T08:05:00.000Z",
        });
        assert.equal(dismissed.status, SignalStatus.Dismissed);

        const resolvedMark = await engine.resolveSignalsForTarget({
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          resolvedAt: "2026-06-08T08:06:00.000Z",
        });
        assert.equal(resolvedMark.some((item) => item.id === markScheduled.id), true);
        assert.equal(resolvedMark.some((item) => item.id === ringing.id), false);
        assert.equal((await harness.repos.signals.getSignalById(markScheduled.id))?.status, SignalStatus.Resolved);

        const resolvedPack = await engine.resolveSignalsForTarget({
          targetType: SignalTargetType.PackCheckInstance,
          targetId: packCheck.id,
          resolvedAt: "2026-06-08T08:07:00.000Z",
        });
        assert.equal(resolvedPack[0]?.id, packSignal.id);

        const resolvedTrail = await engine.resolveSignalsForTarget({
          targetType: SignalTargetType.TrailDay,
          targetId: trailDay.id,
          resolvedAt: "2026-06-08T08:08:00.000Z",
        });
        assert.equal(resolvedTrail[0]?.id, trailSignal.id);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "SignalEngine cancels and expires unresolved signals without reopening finals",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createSignalEngine(harness.repos);
        const mark = await createMark(harness, { localDate: "2026-06-09", status: MarkInstanceStatus.Ready });
        const scheduled = await createSignal(harness, {
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          status: SignalStatus.Scheduled,
        });
        const snoozed = await createSignal(harness, {
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          status: SignalStatus.Snoozed,
          snoozedUntil: "2026-06-09T10:00:00.000Z",
        });
        const dismissed = await createSignal(harness, {
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          status: SignalStatus.Dismissed,
          dismissedAt: "2026-06-09T07:30:00.000Z",
        });

        const expired = await engine.expireSignal({
          signalId: scheduled.id,
          expiredAt: "2026-06-09T08:00:00.000Z",
        });
        assert.equal(expired.status, SignalStatus.Expired);

        const cancelled = await engine.cancelSignalsForTarget({
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          cancelledAt: "2026-06-09T08:10:00.000Z",
        });
        assert.equal(cancelled.some((item) => item.id === snoozed.id), true);
        assert.equal(cancelled.some((item) => item.id === dismissed.id), false);
        assert.equal((await harness.repos.signals.getSignalById(snoozed.id))?.status, SignalStatus.Cancelled);
        assert.equal((await harness.repos.signals.getSignalById(snoozed.id))?.cancelledAt, "2026-06-09T08:10:00.000Z");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "SignalEngine validates target type and returns SignalModeContext for exact target",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createSignalEngine(harness.repos);
        const { trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-10");
        const mark = await createMark(harness, {
          trailDayId: trailDay.id,
          localDate: "2026-06-10",
          status: MarkInstanceStatus.Ready,
        });
        const packCheck = await createPackCheckInstance(harness, {
          trailDayId: trailDay.id,
          targetMarkInstanceId: mark.id,
          status: PackCheckInstanceStatus.Available,
        });

        await assert.rejects(() =>
          engine.createSignal({
            userId: "user_1",
            targetType: "unsupported_target" as SignalTargetType,
            targetId: mark.id,
            scheduledAt: "2026-06-10T07:00:00.000Z",
            status: SignalStatus.Scheduled,
          }),
        );

        const markSignal = await createSignal(harness, {
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
        });
        const packSignal = await createSignal(harness, {
          targetType: SignalTargetType.PackCheckInstance,
          targetId: packCheck.id,
        });
        const trailSignal = await createSignal(harness, {
          targetType: SignalTargetType.TrailDay,
          targetId: trailDay.id,
        });

        assert.equal((await engine.getSignalModeContext(markSignal.id)).targetType, SignalTargetType.MarkInstance);
        assert.equal((await engine.getSignalModeContext(packSignal.id)).targetType, SignalTargetType.PackCheckInstance);
        assert.equal((await engine.getSignalModeContext(trailSignal.id)).targetType, SignalTargetType.TrailDay);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "SignalEngine transaction rollback prevents partial signal side effects",
    run: async () => {
      const harness = await createHarness();
      try {
        const rollbackRepos = {
          ...harness.repos,
          transaction: {
            runInTransaction: <T,>(work: (repositories: typeof harness.repos) => Promise<T>) =>
              harness.repos.transaction.runInTransaction(async (txRepos) => {
                await work(txRepos);
                throw new Error("force signal engine rollback");
              }),
          },
        };
        const engine = createSignalEngine(rollbackRepos);
        const mark = await createMark(harness, { localDate: "2026-06-11", status: MarkInstanceStatus.Ready });
        const signal = await createSignal(harness, {
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          status: SignalStatus.Ringing,
          scheduledAt: "2026-06-11T07:00:00.000Z",
          ringingStartedAt: "2026-06-11T07:00:00.000Z",
        });

        await assert.rejects(() =>
          engine.resolveSignal({
            signalId: signal.id,
            resolvedAt: "2026-06-11T07:05:00.000Z",
          }),
        );

        const persisted = await harness.repos.signals.getSignalById(signal.id);
        assert.equal(persisted?.status, SignalStatus.Ringing);
        assert.equal(persisted?.resolvedAt, undefined);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Shell adapter loadPackCheckDetailReadModel returns null when PackCheckInstance is missing",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          displayName: "User 1",
          locale: "en",
          timezone: "Asia/Saigon",
          weekStartsOn: 1,
        });
        const adapter = createShellAdapter(harness, user);

        const result = await loadPackCheckDetailReadModel(adapter, "missing-pack-check");
        assert.equal(result, null);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Shell adapter loadPackCheckDetailReadModel resolves PackCheck and item instances",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          displayName: "User 1",
          locale: "en",
          timezone: "Asia/Saigon",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-06-12");
        const mark = await createMark(harness, { userId: user.id, trailDayId: trailDay.id, pathId: path.id, status: MarkInstanceStatus.Ready });
        const pack = await createPackCheckInstance(harness, {
          userId: user.id,
          trailDayId: trailDay.id,
          targetMarkInstanceId: mark.id,
          title: "Gym bag",
          status: PackCheckInstanceStatus.Available,
        });

        await harness.repos.packChecks.upsertItemInstances([
          {
            id: "pci_item_1",
            packCheckInstanceId: pack.id,
            label: "Shoes",
            isRequired: true,
            isChecked: false,
            orderIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "pci_item_2",
            packCheckInstanceId: pack.id,
            label: "Bottle",
            isRequired: false,
            isChecked: true,
            checkedAt: "2026-06-12T06:00:00.000Z",
            orderIndex: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);

        const adapter = createShellAdapter(harness, user);

        const result = await loadPackCheckDetailReadModel(adapter, pack.id);
        assert.ok(result?.packCheck);
        assert.equal(result?.packCheck?.id, pack.id);
        assert.equal(result?.packCheck?.name, "Gym bag");
        assert.equal(result?.packCheck?.path, "health");
        assert.equal(result?.items.length, 2);
        assert.equal(result?.items[0]?.checked, false);
        assert.equal(result?.items[1]?.checked, true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Shell adapter PackCheck detail mutations persist and refresh",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          displayName: "User 1",
          locale: "en",
          timezone: "Asia/Saigon",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-06-13");
        const mark = await createMark(harness, { userId: user.id, trailDayId: trailDay.id, pathId: path.id, status: MarkInstanceStatus.Ready });
        const pack = await createPackCheckInstance(harness, {
          userId: user.id,
          trailDayId: trailDay.id,
          targetMarkInstanceId: mark.id,
          title: "Desk reset",
          status: PackCheckInstanceStatus.Available,
        });

        await harness.repos.packChecks.upsertItemInstances([
          {
            id: "pci_mut_a",
            packCheckInstanceId: pack.id,
            label: "Notebook",
            isRequired: true,
            isChecked: false,
            orderIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "pci_mut_b",
            packCheckInstanceId: pack.id,
            label: "Pen",
            isRequired: true,
            isChecked: false,
            orderIndex: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);

        const adapter = createShellAdapter(harness, user);

        const toggled = await togglePackCheckDetailItem(adapter, pack.id, "pci_mut_a", true);
        assert.equal(toggled?.items.find((item) => item.id === "pci_mut_a")?.checked, true);
        assert.equal(toggled?.items.find((item) => item.id === "pci_mut_a")?.required, true);
        const readyToComplete = await togglePackCheckDetailItem(adapter, pack.id, "pci_mut_b", true);
        assert.equal(readyToComplete?.items.find((item) => item.id === "pci_mut_b")?.checked, true);
        const cleared = await clearPackCheckDetail(adapter, pack.id);
        assert.equal(cleared?.items.every((item: { checked: boolean }) => item.checked === false), true);

        const retoggled = await togglePackCheckDetailItem(adapter, pack.id, "pci_mut_a", true);
        assert.equal(retoggled?.items.find((item) => item.id === "pci_mut_a")?.checked, true);
        const readyAgain = await togglePackCheckDetailItem(adapter, pack.id, "pci_mut_b", true);
        assert.equal(readyAgain?.items.find((item) => item.id === "pci_mut_b")?.checked, true);

        const completed = await completePackCheckDetail(adapter, pack.id);
        assert.equal(completed?.packCheck?.status, PackCheckInstanceStatus.Completed);

        const persistedPack = await harness.repos.packChecks.getInstanceById(pack.id);
        const persistedItems = await harness.repos.packChecks.listItemInstances(pack.id);
        assert.equal(persistedPack?.status, PackCheckInstanceStatus.Completed);
        assert.equal(persistedItems.every((item) => item.isChecked), true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Shell adapter createQuickCaptureMark creates quick_capture Mark and completes through MarkEngine",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          displayName: "User 1",
          locale: "en",
          timezone: "Asia/Saigon",
          weekStartsOn: 1,
        });
        await harness.repos.paths.createPath({
          userId: user.id,
          slug: "career",
          title: "Career Craft",
          sortOrder: 0,
        });

        const baseEngine = createMarkEngine(harness.repos);
        let completeCalls = 0;
        const markEngine = {
          ...baseEngine,
          async completeMarkInstance(input: Parameters<typeof baseEngine.completeMarkInstance>[0]) {
            completeCalls += 1;
            return baseEngine.completeMarkInstance(input);
          },
        };
        const adapter = createShellAdapter(harness, user, { markEngine });

        const result = await createQuickCaptureMark(
          adapter,
          "Capture title",
          "Quick proof from capture",
          "career",
          new Date("2026-06-14T07:30:00.000Z"),
        );
        assert.ok(result);
        assert.equal(completeCalls, 1);

        const mark = await harness.repos.marks.getMarkInstanceById(result!.markId);
        const trailDay = await harness.repos.trailDays.getTrailDayById(result!.trailDayId);
        assert.equal(mark?.title, "Capture title");
        assert.equal(mark?.description, "Quick proof from capture");
        assert.equal(mark?.proofNote, "Quick proof from capture");
        assert.equal(mark?.completionSummary, "Quick proof from capture");
        assert.equal(mark?.origin, MarkInstanceOrigin.QuickCapture);
        assert.equal(mark?.status, MarkInstanceStatus.Completed);
        assert.equal(mark?.trailDayId, trailDay?.id);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Shell adapter loadStrengthSessionReadModel returns unavailable when no session exists",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          displayName: "User 1",
          locale: "en",
          timezone: "Asia/Saigon",
          weekStartsOn: 1,
        });
        const mark = await createMark(harness, { userId: user.id, localDate: "2026-06-15", status: MarkInstanceStatus.Ready });
        const adapter = createShellAdapter(harness, user);

        const missing = await loadStrengthSessionReadModel(adapter, "missing-mark");
        const unavailable = await loadStrengthSessionReadModel(adapter, mark.id);
        assert.equal(missing.status, "not_found");
        assert.equal(unavailable.status, "unavailable");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Bootstrap re-run is idempotent and removed seed paths are deprecated not hard deleted",
    run: async () => {
      const harness = await createHarness();
      try {
        const first = await bootstrapWaymarkMap(
          { repositories: harness.repos, userId: "user_1" },
          {
            version: 1,
            paths: [{ sourceSeedId: "career", slug: "career", title: "Career", sortOrder: 0 }],
          },
        );
        assert.equal(first.created.length, 1);
        assert.equal((await harness.repos.paths.listActivePaths("user_1")).length, 1);

        const second = await bootstrapWaymarkMap(
          { repositories: harness.repos, userId: "user_1" },
          {
            version: 1,
            paths: [{ sourceSeedId: "career", slug: "career", title: "Career", sortOrder: 0 }],
          },
        );
        assert.equal(second.created.length, 0);
        assert.equal((await harness.repos.paths.listActivePaths("user_1")).length, 1);

        const activePath = (await harness.repos.paths.listActivePaths("user_1"))[0];
        assert.ok(activePath);

        const removed = await bootstrapWaymarkMap(
          { repositories: harness.repos, userId: "user_1" },
          { version: 2, paths: [] },
        );
        assert.equal(removed.deprecated.length, 1);
        const archived = await harness.repos.paths.getPathById(activePath!.id);
        assert.equal(archived?.status, PathStatus.Archived);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Bootstrap preserves user-modified seeded path fields",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapWaymarkMap(
          { repositories: harness.repos, userId: "user_1" },
          {
            version: 1,
            paths: [{ sourceSeedId: "career", slug: "career", title: "Career", sortOrder: 0 }],
          },
        );
        const path = (await harness.repos.paths.listActivePaths("user_1"))[0]!;
        const edited = await harness.repos.paths.updatePath(path.id, { title: "Career Custom" });
        await markSeedRecordUserModified(harness.repos.appSettings, "user_1", "path", edited.id);

        await bootstrapWaymarkMap(
          { repositories: harness.repos, userId: "user_1" },
          {
            version: 2,
            paths: [{ sourceSeedId: "career", slug: "career", title: "Career Seed Changed", sortOrder: 0 }],
          },
        );

        const preserved = await harness.repos.paths.getPathById(path.id);
        assert.equal(preserved?.title, "Career Custom");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Signal strict behavior dismiss silences signal and never mutates mark status",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createSignalEngine(harness.repos);
        const mark = await createMark(harness, { status: MarkInstanceStatus.Ready, localDate: "2026-06-16" });
        const signal = await createSignal(harness, {
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          status: SignalStatus.Ringing,
          scheduledAt: "2026-06-16T05:45:00.000Z",
          ringingStartedAt: "2026-06-16T05:45:00.000Z",
        });
        await ensureStrictSignalBehavior(harness.repos.appSettings, "user_1", signal.id, {
          ringCount: 1,
          maxRings: 3,
          repeatAfterMinutes: 5,
        });

        const firstDismiss = await engine.dismissSignal({ signalId: signal.id, dismissedAt: "2026-06-16T05:46:00.000Z" });
        assert.equal(firstDismiss.status, SignalStatus.Dismissed);
        assert.equal((await harness.repos.marks.getMarkInstanceById(mark.id))?.status, MarkInstanceStatus.Ready);

        const behavior = await getSignalBehavior(harness.repos.appSettings, "user_1", signal.id);
        assert.equal(behavior?.ringCount, 1);
        assert.equal(behavior?.nextRingAt, undefined);
        assert.equal(behavior?.silencedAt, "2026-06-16T05:46:00.000Z");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "All Pack Checks only surface rule hides default Today appearance",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createPackCheckEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-17");
        const template = await createPackCheckTemplate(harness, { pathId: path.id, title: "Family cabinet" });
        await setPackCheckSurfacePolicy(harness.repos.appSettings, "user_1", template.id, "all_pack_checks_only");
        await createPackCheckItemTemplate(harness, template.id, "Bandage", true, 0);
        const instance = await createPackCheckInstance(harness, {
          trailDayId: trailDay.id,
          templateId: template.id,
          title: "Family cabinet",
          status: PackCheckInstanceStatus.Available,
        });

        const visible = await engine.listVisiblePackChecksForDay("user_1", "2026-06-17", "2026-06-17T10:00:00.000Z");
        assert.equal(visible.today.some((item) => item.id === instance.id), false);
        assert.equal((await harness.repos.packChecks.getInstanceById(instance.id))?.id, instance.id);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail selected discipline creates proof and hidden quick mark metadata",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createCloseTrailEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-18");
        await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-18T21:35:00.000Z",
          manualCloseReason: "closing with discipline",
          disciplineSelections: [
            {
              key: "no_eating_outside_window",
              label: "No eating outside of eating window",
              pathId: path.id,
            },
          ],
        });

        const proofs = await listDisciplineProofsByTrailDay(harness.repos.appSettings, "user_1", trailDay.id);
        assert.equal(proofs.length, 1);
        const marks = await harness.repos.marks.listMarkInstancesByTrailDay(trailDay.id);
        const disciplineMark = marks.find((entry) => entry.origin === MarkInstanceOrigin.QuickCapture);
        assert.ok(disciplineMark);
        const metadata = await getMarkMetadata(harness.repos.appSettings, "user_1", disciplineMark!.id);
        assert.equal(metadata?.appearsInToday, false);
        assert.equal(metadata?.appearsInPathProof, true);
        const visible = await createMarkEngine(harness.repos).listVisibleMarksForDay("user_1", "2026-06-18");
        assert.equal(visible.some((entry) => entry.id === disciplineMark!.id), false);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Mark resolution metadata preserves honestly resolved meaning without status churn",
    run: async () => {
      const harness = await createHarness();
      try {
        const mark = await createMark(harness, { status: MarkInstanceStatus.Completed, localDate: "2026-06-19" });
        await setMarkMetadata(harness.repos.appSettings, "user_1", {
          markId: mark.id,
          resolutionKind: "honestly_resolved",
          resolutionReason: "blocked_by_external_dependency",
          characterEffect: "protected",
          countsAsPathProof: false,
        });
        const reloaded = await harness.repos.marks.getMarkInstanceById(mark.id);
        const metadata = await getMarkMetadata(harness.repos.appSettings, "user_1", mark.id);
        assert.equal(reloaded?.status, MarkInstanceStatus.Completed);
        assert.equal(metadata?.resolutionKind, "honestly_resolved");
        assert.equal(metadata?.countsAsPathProof, false);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Independent Pack Checks create a fresh daily instance after prior-day completion",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en",
          timezone: "UTC",
          weekStartsOn: 1,
          closeTrailPromptTime: "21:30",
        });
        const engine = createPackCheckEngine(harness.repos);
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);

        const template = await createPackCheckTemplate(harness, {
          userId: "user_1",
          pathId: healthPath!.id,
          title: "Before Leaving Home Check",
        });
        await createPackCheckItemTemplate(harness, template.id, "Keys", true, 0);
        await createPackCheckItemTemplate(harness, template.id, "Wallet", true, 1);

        const dayD = await engine.generatePackCheckInstancesForDate("user_1", "2026-05-28");
        const dayDInstance = dayD.find(
          (item) => item.templateId === template.id && item.generationKey?.includes("2026-05-28"),
        );
        assert.ok(dayDInstance);

        const dayDItems = await harness.repos.packChecks.listItemInstances(dayDInstance!.id);
        await engine.completePackCheckInstance({
          packCheckInstanceId: dayDInstance!.id,
          completedAt: "2026-05-28T08:00:00.000Z",
          checkedItemIds: dayDItems.map((item) => item.id),
        });

        const persistedDayD = await harness.repos.packChecks.getInstanceById(dayDInstance!.id);
        assert.equal(persistedDayD?.status, PackCheckInstanceStatus.Completed);

        const dayDPlusOne = await engine.generatePackCheckInstancesForDate("user_1", "2026-05-29");
        const dayDPlusOneInstance = dayDPlusOne.find(
          (item) => item.templateId === template.id && item.generationKey?.includes("2026-05-29"),
        );
        assert.ok(dayDPlusOneInstance);
        assert.notEqual(dayDPlusOneInstance?.id, dayDInstance!.id);
        assert.equal(dayDPlusOneInstance?.status, PackCheckInstanceStatus.Available);

        const dayDPlusOneItems = await harness.repos.packChecks.listItemInstances(dayDPlusOneInstance!.id);
        assert.equal(dayDPlusOneItems.every((item) => item.isChecked === false), true);

        const persistedTemplate = await harness.repos.packChecks.getTemplateById(template.id);
        assert.equal(persistedTemplate?.isActive, true);

        const services = {
          repositories: harness.repos,
          user,
          markEngine: createMarkEngine(harness.repos),
          packCheckEngine: engine,
          dependencyEngine: createDefaultDependencyEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
          closeTrailEngine: createCloseTrailEngine(harness.repos),
          strengthProgressionService: createStrengthProgressionService(harness.repos),
          strengthSessionEngine: createStrengthSessionEngine(
            harness.repos,
            createStrengthProgressionService(harness.repos),
          ),
        };

        const todayD = await loadTodayData(services, "en", {
          now: new Date("2026-05-28T09:00:00.000Z"),
        });
        const dayDPack = todayD.packChecks.find((item) => item.id === dayDInstance!.id);
        assert.ok(dayDPack);
        assert.equal(dayDPack?.detailEnabled, true);

        const todayDPlusOne = await loadTodayData(services, "en", {
          now: new Date("2026-05-29T09:00:00.000Z"),
        });
        const dayDPlusOnePack = todayDPlusOne.packChecks.find((item) => item.id === dayDPlusOneInstance!.id);
        assert.ok(dayDPlusOnePack);
        assert.equal(dayDPlusOnePack?.detailEnabled, true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Independent Pack Check current-day completion stays editable and can complete again the same day",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          displayName: "User 1",
          locale: "en",
          timezone: "UTC",
          weekStartsOn: 1,
          closeTrailPromptTime: "21:30",
        });
        const engine = createPackCheckEngine(harness.repos);
        const { path } = await createPathAndTrailDay(harness, "user_1", "2026-06-02");
        const template = await createPackCheckTemplate(harness, {
          pathId: path.id,
          title: "Before Leaving Home Check",
        });
        await createPackCheckItemTemplate(harness, template.id, "Keys", true, 0);
        await createPackCheckItemTemplate(harness, template.id, "Wallet", true, 1);
        const [instance] = await engine.generatePackCheckInstancesForDate("user_1", "2026-06-02");
        assert.ok(instance);

        const adapter = createShellAdapter(harness, user, { packCheckEngine: engine });
        const initialDetail = await loadPackCheckDetailReadModel(adapter, instance!.id);
        assert.ok(initialDetail?.packCheck);

        const detailItems = await harness.repos.packChecks.listItemInstances(instance!.id);
        for (const item of detailItems) {
          await togglePackCheckDetailItem(adapter, instance!.id, item.id, true);
        }
        const completed = await completePackCheckDetail(adapter, instance!.id);
        assert.equal(completed?.packCheck?.status, PackCheckInstanceStatus.Completed);
        assert.ok(completed?.packCheck?.id === instance!.id);
        assert.equal(completed?.isDisabled, false);
        assert.equal(completed?.items.every((item) => item.disabled !== true), true);

        const reopened = await loadPackCheckDetailReadModel(adapter, instance!.id);
        assert.equal(reopened?.packCheck?.status, PackCheckInstanceStatus.Completed);
        assert.equal(reopened?.isDisabled, false);

        const unchecked = await togglePackCheckDetailItem(adapter, instance!.id, detailItems[0]!.id, false);
        assert.equal(unchecked?.packCheck?.status, PackCheckInstanceStatus.InProgress);
        assert.equal(unchecked?.items.find((item) => item.id === detailItems[0]!.id)?.checked, false);

        const rechecked = await togglePackCheckDetailItem(adapter, instance!.id, detailItems[0]!.id, true);
        assert.equal(rechecked?.packCheck?.status, PackCheckInstanceStatus.PartiallyCompleted);
        assert.equal(rechecked?.items.every((item) => item.checked), true);

        const recompleted = await completePackCheckDetail(adapter, instance!.id);
        assert.equal(recompleted?.packCheck?.status, PackCheckInstanceStatus.Completed);
        assert.equal(recompleted?.packCheck?.id, instance!.id);
        assert.equal(detailItems.length > 0, true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Linked Pack Check completion remains locked after completion",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          displayName: "User 1",
          locale: "en",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        const { path, trailDay } = await createPathAndTrailDay(harness, user.id, "2026-06-03");
        const mark = await createMark(harness, { userId: user.id, trailDayId: trailDay.id, pathId: path.id, status: MarkInstanceStatus.Ready });
        const pack = await createPackCheckInstance(harness, {
          userId: user.id,
          trailDayId: trailDay.id,
          targetMarkInstanceId: mark.id,
          title: "Desk reset",
          status: PackCheckInstanceStatus.Completed,
        });
        await harness.repos.packChecks.upsertItemInstances([
          {
            id: "pci_locked_required",
            packCheckInstanceId: pack.id,
            label: "Notebook",
            isRequired: true,
            isChecked: true,
            checkedAt: "2026-06-03T08:00:00.000Z",
            orderIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);

        const adapter = createShellAdapter(harness, user);
        const detail = await loadPackCheckDetailReadModel(adapter, pack.id);
        assert.equal(detail?.packCheck?.status, PackCheckInstanceStatus.Completed);
        assert.equal(detail?.isDisabled, true);
        assert.equal(detail?.items[0]?.disabled, true);
        await assert.rejects(() => togglePackCheckDetailItem(adapter, pack.id, "pci_locked_required", false));
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Embedded checklist maps into action sheet without separate Today card behavior",
    run: async () => {
      let toggled: { markId: string; packCheckId: string; itemId: string; checked: boolean } | null = null;
      const mapped = mapTodayMarkToActionSheetMark(
        {
          id: "mark-1",
          title: { en: "Daily Project Supervision", vi: "Daily Project Supervision" },
          pathId: "career",
          status: "ready",
          actionSheet: {
            embeddedChecklist: {
              packCheckId: "pack-1",
              items: [
                { id: "jira", label: "Check Jira", checked: false },
                { id: "dashboard", label: "Check dashboard", checked: true },
              ],
            },
          },
        },
        "en",
        {
          toggleEmbeddedChecklistItem: (markId, packCheckId, itemId, checked) => {
            toggled = { markId, packCheckId, itemId, checked };
          },
        },
      );
        assert.equal(mapped.checklist?.items.length, 2);
        mapped.checklist?.items[0]?.onToggle?.(true);
        assert.deepEqual(toggled, {
          markId: "mark-1",
          packCheckId: "pack-1",
          itemId: "jira",
          checked: true,
        });
    },
  },
  {
    name: "Bootstrap imports full 7-path seed config without duplicates across supported object types",
    run: async () => {
      const harness = await createHarness();
      try {
        const first = await bootstrapFullConfig(harness);
        const paths = await harness.repos.paths.listActivePaths("user_1");
        assert.equal(paths.length, 7);
        assert.ok(first.created.length > 7);

        const seedRecords = await listSeedRecords(harness.repos.appSettings, "user_1");
        assert.equal(
          seedRecords.length,
          (WAYMARK_MAP_CONFIG.paths?.length ?? 0) +
            (WAYMARK_MAP_CONFIG.expeditions?.length ?? 0) +
            (WAYMARK_MAP_CONFIG.milestones?.length ?? 0) +
            (WAYMARK_MAP_CONFIG.markTemplates?.length ?? 0) +
            (WAYMARK_MAP_CONFIG.dailyMarkAssignments?.length ?? 0) +
            (WAYMARK_MAP_CONFIG.packCheckTemplates?.length ?? 0) +
            (WAYMARK_MAP_CONFIG.backlogItems?.length ?? 0) +
            (WAYMARK_MAP_CONFIG.signalConfigs?.length ?? 0) +
            (WAYMARK_MAP_CONFIG.workoutRoutines?.length ?? 0) +
            (WAYMARK_MAP_CONFIG.closeTrailRules?.length ?? 0) +
            (WAYMARK_MAP_CONFIG.anchorPathRotations?.length ?? 0),
        );

        const second = await bootstrapFullConfig(harness);
        const seedRecordsAfter = await listSeedRecords(harness.repos.appSettings, "user_1");
        assert.equal(second.created.length, 0);
        assert.equal(seedRecordsAfter.length, seedRecords.length);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Bootstrap seeds the required expedition and milestone master table without duplicates",
    run: async () => {
      const harness = await createHarness();
      try {
        const expected = [
          {
            path: "Career",
            expedition: "SCH Smart Counter Hub Project",
            milestones: [
              ["Phát hànhThẻ GNQT — Ghép luồng Onboarding", "2026-06-20"],
              ["OBD Thẻ GNQT — Quản lý sự đồng ý của KH", "2026-07-31"],
              ["GD tài chính thẻ tín dụng — Thu nợ & điều chỉnh thu nợ", "2026-08-31"],
              ["Điều chỉnh hạn mức giao dịch thẻ theo kỳ sao kê — đợt tháng 8", "2026-08-31"],
              ["Tự động lập Biểu mẫu QLSD Thẻ", "2026-08-31"],
              ["Xác nhận 20 tính năng QLSD thẻ trên SMB", "2026-08-31"],
              ["Điều chỉnh hạn mức giao dịch thẻ theo kỳ sao kê — đợt tháng 9", "2026-09-30"],
              ["Card Art — Phát hành lại và gia hạn thẻ", "2026-09-30"],
              ["Đổi nguồn tiền giao dịch JCB HB & QLSD thay đổi nguồn tiền", "2026-09-30"],
              ["QLSD thẻ GNND theo dự án Cortex", "2026-10-31"],
              ["Phát hành thẻ GNND theo dự án Cortex", "2026-10-31"],
              ["PHT ghi nợ quốc tế/nội địa", "2026-10-31"],
              ["Gia hạn thẻ theo lô", "2026-10-31"],
              ["PHT tín dụng cá nhân/Hybrid — đã có HMTD & HMTD 0 đồng", "2026-11-30"],
              ["PHT Hybrid chưa có HMTD — bổ sung lựa chọn Card Art", "2026-11-30"],
              ["Thẻ trả trước quốc tế vô danh theo lô", "2026-11-30"],
              ["GD lãi/phí thẻ — thu và hủy", "2026-12-31"],
            ],
          },
          {
            path: "SNAG Golf Vietnam",
            expedition: "SNAG Golf Vietnam Growth",
            milestones: [
              ["Tạo Dashboard phân tích bài", "2026-06-30"],
              ["Content foundation", "2026-07-30"],
            ],
          },
          {
            path: "Family & Home",
            expedition: "Dạy con Tiếng Anh",
            milestones: [["Đọc xong sách ngữ pháp tiếng Anh cho con", "2026-07-30"]],
          },
          {
            path: "Family & Home",
            expedition: "Building Waymark",
            milestones: [["Xây dựng Waymark Anniversary edition", "2026-06-12"]],
          },
          {
            path: "Family & Home",
            expedition: "Kế hoạch Du lịch Việt Nam",
            milestones: [["Ninh Bình tháng 9/2026", "2026-09-01"]],
          },
          {
            path: "Health & Body",
            expedition: "Cut to 70",
            milestones: [
              ["Reach 76kg", "2026-06-30"],
              ["Reach 75kg", "2026-07-31"],
              ["Reach 74kg", "2026-08-31"],
              ["Reach 73kg", "2026-09-30"],
              ["Reach 72kg", "2026-10-31"],
              ["Reach 71kg", "2026-11-30"],
              ["Reach 70kg", "2026-12-31"],
            ],
          },
          {
            path: "Golf Craft",
            expedition: "Beginning: From SNAG to 3D Line",
            milestones: [["Home and SNAG practice phase", "2026-08-15"]],
          },
        ] as const;

        await bootstrapFullConfig(harness);
        await bootstrapFullConfig(harness);

        let expeditionCount = 0;
        let milestoneCount = 0;

        for (const group of expected) {
          const path = await getPathByTitle(harness, "user_1", group.path);
          assert.ok(path);

          const expeditions = (await harness.repos.expeditions.listExpeditionsByPath(path!.id)).items;
          const expedition = expeditions.find((item) => item.title === group.expedition);
          assert.ok(expedition);
          expeditionCount += 1;

          const milestones = await harness.repos.expeditions.listMilestonesByExpedition(expedition!.id);
          assert.equal(milestones.length, group.milestones.length);
          milestoneCount += milestones.length;

          for (const [title, deadline] of group.milestones) {
            const milestone = milestones.find((item) => item.title === title);
            assert.ok(milestone);
            assert.equal(milestone?.targetDate, deadline);
          }
        }

        assert.equal(expeditionCount, 7);
        assert.equal(milestoneCount, 30);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "User-modified seeded Expedition MarkTemplate and PackCheckTemplate are not overwritten",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const records = await listSeedRecords(harness.repos.appSettings, "user_1");
        const expeditionRecord = records.find((record) => record.sourceSeedId === "career.sch.expedition.smart-counter-hub-project" && record.entityType === "expedition")!;
        const templateRecord = records.find((record) => record.sourceSeedId === "career.weekday.focus_block_1" && record.entityType === "mark_template")!;
        const packRecord = records.find((record) => record.sourceSeedId === "family.before-leaving-home-check" && record.entityType === "pack_check_template")!;

        const expedition = await harness.repos.expeditions.updateExpedition(expeditionRecord.entityId, { title: "SCH Custom" });
        await markSeedRecordUserModified(harness.repos.appSettings, "user_1", "expedition", expedition.id);
        const template = await harness.repos.marks.updateMarkTemplate(templateRecord.entityId, { title: "Career Focus Block 1 Custom" });
        await markSeedRecordUserModified(harness.repos.appSettings, "user_1", "mark_template", template.id);
        const pack = await harness.repos.packChecks.getTemplateById(packRecord.entityId);
        assert.ok(pack);
        await harness.repos.packChecks.upsertTemplate({ ...pack!, title: "Medicine Cabinet Custom" });
        await markSeedRecordUserModified(harness.repos.appSettings, "user_1", "pack_check_template", pack!.id);

        await bootstrapFullConfig(harness);

        assert.equal((await harness.repos.expeditions.getExpeditionById(expedition.id))?.title, "SCH Custom");
        assert.equal((await harness.repos.marks.getMarkTemplateById(template.id))?.title, "Career Focus Block 1 Custom");
        assert.equal((await harness.repos.packChecks.getTemplateById(pack!.id))?.title, "Medicine Cabinet Custom");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekday marks for 2026-05-22 generate ordered focus supervising family structure with embedded readiness and execution checklist",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const markEngine = createMarkEngine(harness.repos);
        const packCheckEngine = createPackCheckEngine(harness.repos);
        await markEngine.generateMarkInstancesForDate("user_1", "2026-05-22");
        await packCheckEngine.generatePackCheckInstancesForDate("user_1", "2026-05-22");

        const marks = await markEngine.listVisibleMarksForDay("user_1", "2026-05-22");
        assert.equal(marks.length, 7);

        const [workout, focus1, supervisingAm, focus2, supervisingPm, focus3, family] = marks;
        assert.ok(workout);
        assert.equal(workout!.title, "Workout A2");
        assert.equal(workout!.scheduledStartAt, "2026-05-22T05:00:00.000");
        assert.equal(workout!.scheduledEndAt, "2026-05-22T07:30:00.000");
        assert.equal((await getMarkMetadata(harness.repos.appSettings, "user_1", workout!.id))?.orderIndex, 1);

        assert.equal(focus1?.title, "Vi\u1ebft RSD Template x\u00e1c nh\u1eadn giao d\u1ecbch QLSD Th\u1ebb tr\u00ean SMB");
        assert.equal(focus2?.title, "Vi\u1ebft RSD API v\u1ea5n tin chi ti\u1ebft giao d\u1ecbch QLSD Th\u1ebb tr\u00ean SCH");
        assert.equal(focus3?.title, "Buffer ho\u00e0n thi\u1ec7n 2 RSD ng\u00e0y 22/05");
        assert.equal(family?.title, "Family Activity Block");

        const focus1Meta = await getMarkMetadata(harness.repos.appSettings, "user_1", focus1!.id);
        const focus2Meta = await getMarkMetadata(harness.repos.appSettings, "user_1", focus2!.id);
        const focus3Meta = await getMarkMetadata(harness.repos.appSettings, "user_1", focus3!.id);
        const familyMeta = await getMarkMetadata(harness.repos.appSettings, "user_1", family!.id);
        assert.equal(focus1Meta?.blockType, "focus_block");
        assert.equal(focus1Meta?.taskKind, "work_focus");
        assert.equal(focus1Meta?.countsAsPathProof, true);
        assert.equal(focus1Meta?.milestoneSourceSeedId, "career.sch.milestone.2026-06.smb-card-service-confirmation");
        assert.equal(focus2Meta?.milestoneSourceSeedId, "career.sch.milestone.2026-06.smb-card-service-confirmation");
        assert.equal(focus3Meta?.milestoneSourceSeedId, undefined);
        assert.equal(familyMeta?.countsAsPathProof, true);

        const focus1LinkedPackChecks = await harness.repos.packChecks.listInstancesByTargetMark(focus1!.id);
        assert.equal(focus1LinkedPackChecks.length, 0);

        const supervisingPacks = await harness.repos.packChecks.listInstancesByTargetMark(supervisingAm!.id);
        assert.equal(supervisingPacks.length, 0);

        let toggled: { markId: string; packCheckId: string; itemId: string; checked: boolean } | null = null;
        const mapped = mapTodayMarkToActionSheetMark(
          {
            id: supervisingAm!.id,
            title: { en: supervisingAm!.title, vi: supervisingAm!.title },
            pathId: "career",
            status: "ready",
            actionSheet: {
              embeddedChecklist: {
                packCheckId: `execution:${supervisingAm!.id}`,
                items: [
                  { id: "1", label: "Check Zalo", checked: false },
                  { id: "2", label: "Check mail", checked: false },
                  { id: "3", label: "Check Confluence", checked: false },
                  { id: "4", label: "Check Jira", checked: false },
                ],
              },
            },
          },
          "en",
          {
            toggleEmbeddedChecklistItem: (markId, packCheckId, itemId, checked) => {
              toggled = { markId, packCheckId, itemId, checked };
            },
          },
        );
        mapped.checklist?.items[0]?.onToggle?.(true);
        assert.equal(mapped.checklist?.items.length, 4);
        assert.deepEqual(toggled, {
          markId: supervisingAm!.id,
          packCheckId: `execution:${supervisingAm!.id}`,
          itemId: "1",
          checked: true,
        });

        const careerPath = await getPathByTitle(harness, "user_1", "Career");
        const familyPath = await getPathByTitle(harness, "user_1", "Family & Home");
        const milestoneMarks = await harness.repos.marks.listMarkInstancesByMilestone(focus1!.milestoneId!);
        assert.equal(milestoneMarks.some((mark) => mark.id === focus1!.id), true);
        assert.equal(milestoneMarks.some((mark) => mark.id === focus2!.id), true);
        assert.equal(focus1!.pathId, careerPath!.id);
        assert.equal(family!.pathId, familyPath!.id);

        const editedFocus = await harness.repos.marks.updateMarkInstance(focus1!.id, { title: "User custom focus title" });
        await markEngine.generateMarkInstancesForDate("user_1", "2026-05-22");
        const rerunMarks = await markEngine.listVisibleMarksForDay("user_1", "2026-05-22");
        assert.equal(rerunMarks.length, 7);
        assert.equal((await harness.repos.marks.getMarkInstanceById(editedFocus.id))?.title, "User custom focus title");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Independent grooming and before-leaving-home pack checks use the new surfaces and content",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const packCheckEngine = createPackCheckEngine(harness.repos);
        await packCheckEngine.generatePackCheckInstancesForDate("user_1", "2026-05-22");
        const visible = await packCheckEngine.listVisiblePackChecksForDay("user_1", "2026-05-22", "2026-05-22T10:00:00.000Z");
        assert.equal(visible.today.some((item) => item.title === "Daily Grooming Presence Check"), true);
        assert.equal(visible.today.some((item) => item.title === "Before Leaving Home Check"), true);
        assert.equal(visible.today.some((item) => item.title === "Work Task Readiness Check"), false);

        const trailDay = await harness.repos.trailDays.getTrailDayByDate("user_1", "2026-05-22");
        const allPackChecks = await harness.repos.packChecks.listInstancesByTrailDay(trailDay!.id);
        const grooming = allPackChecks.find((item) => item.title === "Daily Grooming Presence Check")!;
        const leavingHome = allPackChecks.find((item) => item.title === "Before Leaving Home Check")!;
        const groomingItems = await harness.repos.packChecks.listItemInstances(grooming.id);
        const leavingHomeItems = await harness.repos.packChecks.listItemInstances(leavingHome.id);
        assert.equal(grooming.targetMarkInstanceId, undefined);
        assert.equal(leavingHome.targetMarkInstanceId, undefined);
        assert.equal(groomingItems.some((item) => item.label === "Shoes presentable"), true);
        assert.equal(leavingHomeItems.some((item) => item.label === "Mũ bảo hiểm"), true);
        assert.equal(leavingHomeItems.some((item) => item.label === "Thẻ cơ quan"), true);

        const signalConfigs = await listSignalConfigs(harness.repos.appSettings, "user_1");
        assert.equal(signalConfigs.some((config) => config.sourceSeedId === "style_grooming_morning_signal"), true);
        assert.equal(signalConfigs.some((config) => config.sourceSeedId === "style_grooming_midday_signal"), true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Today pack rail canonicalizes stale weekend snapshot title back to Weekend Hanoi and family path color",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
          closeTrailPromptTime: "21:30",
        });
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay(user.id, "2026-06-04");
        const familyPath = await getPathByTitle(harness, user.id, "Family & Home");
        assert.ok(familyPath);
        const templates = await harness.repos.packChecks.listTemplatesByPath(familyPath!.id);
        const weekendTemplate = templates.find((template) => template.title === "Weekend Hanoi Check");
        assert.ok(weekendTemplate);

        const instance = await harness.repos.packChecks.upsertInstance({
          id: "pci_stale_weekend_hanoi",
          userId: user.id,
          templateId: weekendTemplate!.id,
          trailDayId: trailDay.id,
          title: "Weekend Around Hanoi Readiness Check",
          status: PackCheckInstanceStatus.Available,
          availableFrom: "2026-06-04T08:00:00.000",
          dueAt: "2026-06-04T22:00:00.000",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await harness.repos.packChecks.upsertItemInstances([
          {
            id: "pci_stale_weekend_hanoi_item_1",
            packCheckInstanceId: instance.id,
            label: "Đã xác nhận điểm đến",
            isRequired: true,
            isChecked: false,
            orderIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);

        const today = await loadTodayData(
          {
            repositories: harness.repos,
            user,
            markEngine: createMarkEngine(harness.repos),
            packCheckEngine: createPackCheckEngine(harness.repos),
            dependencyEngine: createDefaultDependencyEngine(harness.repos),
            signalEngine: createSignalEngine(harness.repos),
            closeTrailEngine: createCloseTrailEngine(harness.repos),
            strengthProgressionService: createStrengthProgressionService(harness.repos),
            strengthSessionEngine: createStrengthSessionEngine(
              harness.repos,
              createStrengthProgressionService(harness.repos),
            ),
          },
          "en",
          { now: new Date("2026-06-04T10:00:00.000Z") },
        );
        const weekendPack = today.packChecks.find((pack) => pack.id === instance.id);
        assert.ok(weekendPack);
        assert.equal(weekendPack?.title.en, "Weekend Hanoi Check");
        assert.equal(weekendPack?.sourceSeedId, "family.weekend-around-hanoi-readiness-check");
        assert.equal(weekendPack?.pathId, "family");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSessionEngine can reset a workout session and rebuild fresh snapshots",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);
        const markEngine = createMarkEngine(harness.repos);
        const sessionEngine = createStrengthSessionEngine(harness.repos);

        await markEngine.generateMarkInstancesForDate("user_1", "2026-05-20");
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);
        const marks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-05-20");
        const workoutMark = marks.find((mark) => mark.pathId === healthPath!.id && mark.title === "Workout B");
        assert.ok(workoutMark);

        const session = await sessionEngine.startWorkoutSession({ markInstanceId: workoutMark!.id });
        await sessionEngine.startExercise({ workoutSessionInstanceId: session.id });
        await sessionEngine.startSet({ workoutSessionInstanceId: session.id });

        const startedSession = await harness.repos.strength.getSessionById(session.id);
        assert.equal(startedSession?.status, WorkoutSessionStatus.SetActive);
        assert.ok((await harness.repos.strength.listSessionSnapshots(session.id)).length > 0);

        await sessionEngine.resetWorkoutSession({ workoutSessionInstanceId: session.id });
        const resetSession = await harness.repos.strength.getSessionById(session.id);
        assert.equal(resetSession?.status, WorkoutSessionStatus.NotStarted);
        assert.equal((await harness.repos.strength.listSessionSnapshots(session.id)).length, 0);

        const rebuilt = await sessionEngine.startWorkoutSession({ markInstanceId: workoutMark!.id });
        assert.equal(rebuilt.id, session.id);
        const rebuiltSnapshots = await harness.repos.strength.listSessionSnapshots(session.id);
        assert.equal(rebuiltSnapshots.length, 18);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "StrengthSessionEngine resolves walk-day workout marks to the shared walk routine",
    run: async () => {
      const harness = await createHarness();
      try {
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);
        const markEngine = createMarkEngine(harness.repos);
        const sessionEngine = createStrengthSessionEngine(harness.repos);

        await markEngine.generateMarkInstancesForDate("user_1", "2026-05-21");
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);
        const marks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-05-21");
        const workoutMark = marks.find((mark) => mark.pathId === healthPath!.id && mark.title === "Workout Walk");
        assert.ok(workoutMark);

        const session = await sessionEngine.startWorkoutSession({ markInstanceId: workoutMark!.id });
        const routine = await harness.repos.strength.getRoutineById(session.routineTemplateId);
        const shell = createShellAdapter(harness, user);
        const readModel = await loadStrengthSessionReadModel(shell, workoutMark!.id, "en");

        assert.equal(routine?.title, "Walk Day");
        assert.equal(routine?.routineType, WorkoutRoutineType.Walk);
        assert.equal(readModel.status, "ready");
        if (readModel.status === "ready") {
          assert.deepEqual(readModel.uiSession.exercises.map((exercise) => exercise.title.en), ["Walk"]);
          assert.equal(readModel.uiSession.stretches.length, 14);
          assert.equal(readModel.uiSession.stretchCountLabel, "14 stretches");
        }
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Health test assignments create manual Day A Day B plus canonical workout on 2026-05-27",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const markEngine = createMarkEngine(harness.repos);
        await markEngine.generateMarkInstancesForDate("user_1", "2026-05-27");

        const titles = (await markEngine.listVisibleMarksForDay("user_1", "2026-05-27")).map((mark) => mark.title);
        assert.equal(titles.includes("Workout Day A"), true);
        assert.equal(titles.includes("Workout Day B"), true);
        assert.equal(titles.includes("Workout B"), true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Today workout planned marks expose Start Workout then Resume Workout through the planned mark sheet model",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);
        const user = await harness.repos.userProfiles.getUserProfileById("user_1");
        assert.ok(user);

        const markEngine = createMarkEngine(harness.repos);
        const services = {
          repositories: harness.repos,
          user: user!,
          markEngine,
          packCheckEngine: createPackCheckEngine(harness.repos),
          dependencyEngine: createDefaultDependencyEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
          closeTrailEngine: createCloseTrailEngine(harness.repos),
          strengthProgressionService: createStrengthProgressionService(harness.repos),
          strengthSessionEngine: createStrengthSessionEngine(
            harness.repos,
            createStrengthProgressionService(harness.repos),
          ),
        };

        await importApprovedWeeklyTimetable(harness);
        const todayNow = new Date("2026-06-01T09:00:00.000Z");
        const firstToday = await loadTodayData(services, "en", { now: todayNow });
        const dayAMark = firstToday.marks.find((mark) => mark.title.en === "Workout Day A");
        assert.ok(dayAMark);
        assert.equal(dayAMark?.interactionKind, "strength_session");
        assert.equal(dayAMark?.actionSheet?.primaryActionLabel?.en, "Start Workout");

        await services.strengthSessionEngine.startWorkoutSession({ markInstanceId: dayAMark!.id });

        const resumedToday = await loadTodayData(services, "en", { now: todayNow });
        const resumedDayAMark = resumedToday.marks.find((mark) => mark.id === dayAMark!.id);
        assert.ok(resumedDayAMark);
        assert.equal(resumedDayAMark?.actionSheet?.primaryActionLabel?.en, "Resume Workout");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Today current expeditions derive from today's marks and health workout marks stay linked to Cut to 70 milestone",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);

        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);
        const cutTo70 = (await harness.repos.expeditions.listExpeditionsByPath(healthPath!.id)).items.find(
          (expedition) => expedition.title === "Cut to 70",
        );
        assert.ok(cutTo70);
        const markEngine = createMarkEngine(harness.repos);
        await importApprovedWeeklyTimetable(harness);

        const marks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-06-01");
        const workoutMark = marks.find((mark) => mark.pathId === healthPath!.id && mark.title === "Workout Day A");
        assert.ok(workoutMark);
        assert.equal(workoutMark?.expeditionId, cutTo70!.id);
        assert.ok(workoutMark?.milestoneId);

        const user = await harness.repos.userProfiles.getUserProfileById("user_1");
        assert.ok(user);
        const services = {
          repositories: harness.repos,
          user: user!,
          markEngine,
          packCheckEngine: createPackCheckEngine(harness.repos),
          dependencyEngine: createDefaultDependencyEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
          closeTrailEngine: createCloseTrailEngine(harness.repos),
          strengthProgressionService: createStrengthProgressionService(harness.repos),
          strengthSessionEngine: createStrengthSessionEngine(
            harness.repos,
            createStrengthProgressionService(harness.repos),
          ),
        };

        const today = await loadTodayData(services, "en", { now: new Date("2026-06-01T09:00:00.000Z") });
        const expeditionTitles = today.currentExpeditions.map((item) => item.title.en);
        assert.equal(expeditionTitles.includes("Cut to 70"), true);
        assert.equal(expeditionTitles.includes("SNAG Golf Vietnam Growth"), false);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Today only surfaces Close Trail after 8 PM or when all planned marks are settled",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
          closeTrailPromptTime: "21:30",
        });
        await bootstrapFullConfig(harness);
        const user = await harness.repos.userProfiles.getUserProfileById("user_1");
        assert.ok(user);

        const markEngine = createMarkEngine(harness.repos);
        const services = {
          repositories: harness.repos,
          user: user!,
          markEngine,
          packCheckEngine: createPackCheckEngine(harness.repos),
          dependencyEngine: createDefaultDependencyEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
          closeTrailEngine: createCloseTrailEngine(harness.repos),
          strengthProgressionService: createStrengthProgressionService(harness.repos),
          strengthSessionEngine: createStrengthSessionEngine(
            harness.repos,
            createStrengthProgressionService(harness.repos),
          ),
        };

        await importApprovedWeeklyTimetable(harness);

        const beforeEight = await loadTodayData(services, "en", { now: new Date("2026-06-01T19:00:00.000Z") });
        assert.equal(beforeEight.closeTrailStatus, "hidden");

        const afterEight = await loadTodayData(services, "en", { now: new Date("2026-06-01T20:00:00.000Z") });
        assert.equal(afterEight.closeTrailStatus, "default");

        const dayMarks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-06-01");
        for (const mark of dayMarks) {
          await harness.repos.marks.updateMarkInstance(mark.id, {
            status: MarkInstanceStatus.Completed,
            completedAt: "2026-06-01T19:10:00.000Z",
          });
        }

        const allSettledBeforeEight = await loadTodayData(services, "en", { now: new Date("2026-06-01T19:15:00.000Z") });
        assert.equal(allSettledBeforeEight.closeTrailStatus, "default");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Bootstrap removes stale legacy routine exercises before rebuilding Day B sessions",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);

        const markEngine = createMarkEngine(harness.repos);
        const sessionEngine = createStrengthSessionEngine(harness.repos);

        await markEngine.generateMarkInstancesForDate("user_1", "2026-05-20");
        const marks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-05-20");
        const workoutMark = marks.find((mark) => mark.pathId === healthPath!.id && mark.title === "Workout B");
        assert.ok(workoutMark);

        const dayBRoutine = (await harness.repos.strength.listRoutinesByPath(healthPath!.id)).find(
          (routine) => routine.markTemplateId === workoutMark!.templateId,
        );
        assert.ok(dayBRoutine);

        const legacyExercise = await createExerciseDefinition(harness, {
          id: "legacy_day_b_press_def",
          title: "Standing Barbell Military Press",
          canonicalSlug: "standing-barbell-military-press-legacy",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
        });
        await harness.repos.strength.upsertRoutineExercises([
          {
            id: "legacy_day_b_press_exercise",
            workoutRoutineTemplateId: dayBRoutine!.id,
            exerciseDefinitionId: legacyExercise.id,
            phase: WorkoutExercisePhase.Strength,
            orderIndex: 1,
            targetType: ExerciseTargetType.RepsLoad,
            targetLoadKg: 24,
            targetReps: 8,
            targetSets: 2,
            restDurationSec: 120,
            createdAt: "2026-05-25T05:00:00.000Z",
            updatedAt: "2026-05-25T05:00:00.000Z",
          },
        ]);
        assert.equal((await harness.repos.strength.listRoutineExercises(dayBRoutine!.id)).some((item) => item.id === "legacy_day_b_press_exercise"), true);

        await bootstrapFullConfig(harness);

        const canonicalRoutineExercises = await harness.repos.strength.listRoutineExercises(dayBRoutine!.id);
        assert.equal(canonicalRoutineExercises.some((item) => item.id === "legacy_day_b_press_exercise"), false);
        assert.deepEqual(
          canonicalRoutineExercises
            .filter((item) => item.phase === WorkoutExercisePhase.Strength)
            .map((item) => item.orderIndex),
          [0, 1, 2, 3],
        );

        await sessionEngine.startWorkoutSession({ markInstanceId: workoutMark!.id });
        const session = await harness.repos.strength.getSessionByMarkInstance(workoutMark!.id);
        assert.ok(session);
        const snapshots = await harness.repos.strength.listSessionSnapshots(session!.id);
        assert.deepEqual(
          snapshots
            .filter((snapshot) => snapshot.phase === WorkoutExercisePhase.Strength)
            .map((snapshot) => snapshot.exerciseNameSnapshot),
          [
            "Barbell Deadlift",
            "Bent Over Barbell Row",
            "Wood Chop",
            "Kneeling Ab Wheel Rollout",
          ],
        );
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Bootstrap repairs false user-modified Day A workout seed drift",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);

        const dayARoutine = (await harness.repos.strength.listRoutinesByPath(healthPath!.id)).find((routine) => routine.title === "Day A1 Strength");
        assert.ok(dayARoutine);
        await harness.repos.strength.upsertRoutine({
          ...dayARoutine!,
          title: "Day A Strength",
        });

        const routineExercises = await harness.repos.strength.listRoutineExercises(dayARoutine!.id);
        const exerciseDefinitions = await Promise.all(routineExercises.map((exercise) => harness.repos.strength.getExerciseDefinitionById(exercise.exerciseDefinitionId)));
        const exerciseBySlug = new Map(routineExercises.map((exercise, index) => [exerciseDefinitions[index]?.canonicalSlug, exercise]));
        const pressDefinition = await createExerciseDefinition(harness, {
          id: "exercise_definition_health_day_a_routine_press",
          title: "Standing Barbell Military Press",
          canonicalSlug: "standing-barbell-military-press",
          category: ExerciseCategory.Strength,
          targetType: ExerciseTargetType.RepsLoad,
        });
        await harness.repos.strength.upsertRoutineExercises([
          {
            ...exerciseBySlug.get("barbell-squat")!,
            orderIndex: 0,
            targetLoadKg: 60,
            targetReps: 5,
            targetSets: 3,
            restDurationSec: 90,
          },
          {
            id: "routine_exercise_health_day_a_routine_press",
            workoutRoutineTemplateId: dayARoutine!.id,
            exerciseDefinitionId: pressDefinition.id,
            phase: WorkoutExercisePhase.Strength,
            orderIndex: 1,
            targetType: ExerciseTargetType.RepsLoad,
            targetLoadKg: 24,
            targetReps: 8,
            targetSets: 2,
            restDurationSec: 90,
            createdAt: "2026-06-07T11:44:19.323Z",
            updatedAt: "2026-06-07T11:44:19.323Z",
          },
          {
            ...exerciseBySlug.get("barbell-bench-press")!,
            orderIndex: 2,
            targetLoadKg: 45,
            targetReps: 8,
            targetSets: 3,
            restDurationSec: 90,
          },
          {
            ...exerciseBySlug.get("pallof-press")!,
            orderIndex: 3,
            targetLoadKg: 15,
            targetReps: 10,
            targetSets: 2,
            restDurationSec: 90,
          },
          {
            ...exerciseBySlug.get("plank")!,
            orderIndex: 4,
            targetDurationSec: 50,
            targetSets: 1,
          },
        ]);
        await markSeedRecordUserModified(harness.repos.appSettings, "user_1", "workout_routine", dayARoutine!.id, "2026-06-07T11:44:19.323Z");

        await bootstrapFullConfig(harness);

        const repairedRoutine = await harness.repos.strength.getRoutineById(dayARoutine!.id);
        assert.equal(repairedRoutine?.title, "Day A1 Strength");
        const repairedExercises = await harness.repos.strength.listRoutineExercises(dayARoutine!.id);
        const repairedDefinitions = await Promise.all(repairedExercises.map((exercise) => harness.repos.strength.getExerciseDefinitionById(exercise.exerciseDefinitionId)));
        assert.deepEqual(
          repairedExercises
            .map((exercise, index) => ({ exercise, definition: repairedDefinitions[index] }))
            .filter((entry) => entry.exercise.phase === WorkoutExercisePhase.Strength)
            .map((entry) => entry.definition?.canonicalSlug),
          ["barbell-squat", "barbell-bench-press", "pallof-press", "plank"],
        );
        const records = await listSeedRecords(harness.repos.appSettings, "user_1");
        const record = records.find((item) => item.entityType === "workout_routine" && item.sourceSeedId === "health_day_a_routine");
        assert.equal(record?.ownership, "system_seed");
        assert.equal(record?.userModifiedAt, undefined);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Workout database repair force-restores authoritative Day A after non-legacy drift",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);

        const dayARoutine = (await harness.repos.strength.listRoutinesByPath(healthPath!.id)).find(
          (routine) => routine.title === "Day A1 Strength",
        );
        assert.ok(dayARoutine);
        await harness.repos.strength.upsertRoutine({
          ...dayARoutine!,
          title: "Custom Day A",
        });
        const exercises = await harness.repos.strength.listRoutineExercises(dayARoutine!.id);
        const squat = exercises.find((exercise) => exercise.orderIndex === 0 && exercise.phase === WorkoutExercisePhase.Strength);
        assert.ok(squat);
        await harness.repos.strength.upsertRoutineExercises([
          {
            ...squat!,
            targetLoadKg: 61,
          },
        ]);
        await markSeedRecordUserModified(
          harness.repos.appSettings,
          "user_1",
          "workout_routine",
          dayARoutine!.id,
          "2026-07-23T09:00:00.000Z",
        );

        await bootstrapFullConfig(harness);
        assert.equal((await harness.repos.strength.getRoutineById(dayARoutine!.id))?.title, "Custom Day A");

        const report = await repairAuthoritativeWorkoutRoutines(
          { repositories: harness.repos, userId: "user_1" },
          WAYMARK_MAP_CONFIG,
        );
        assert.deepEqual(
          report.repaired.map((item) => item.sourceSeedId),
          ["health_day_a_routine", "health_day_b_routine"],
        );
        assert.equal((await harness.repos.strength.getRoutineById(dayARoutine!.id))?.title, "Day A1 Strength");
        const repairedExercises = await harness.repos.strength.listRoutineExercises(dayARoutine!.id);
        const repairedSquat = repairedExercises.find(
          (exercise) => exercise.orderIndex === 0 && exercise.phase === WorkoutExercisePhase.Strength,
        );
        assert.equal(repairedSquat?.targetLoadKg, 60);

        const records = await listSeedRecords(harness.repos.appSettings, "user_1");
        const record = records.find(
          (item) => item.entityType === "workout_routine" && item.sourceSeedId === "health_day_a_routine",
        );
        assert.equal(record?.ownership, "system_seed");
        assert.equal(record?.userModifiedAt, undefined);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Health seeded A1 A2 and B routines create the canonical strength and shared cooldown order",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);
        const user = await harness.repos.userProfiles.getUserProfileById("user_1");
        assert.ok(user);
        const markEngine = createMarkEngine(harness.repos);
        const sessionEngine = createStrengthSessionEngine(harness.repos);
        const shell = createShellAdapter(harness, user!, { markEngine, signalEngine: createSignalEngine(harness.repos) });

        const expectedDayA1Exercises = [
          "Barbell Squat",
          "Barbell Bench Press",
          "Pallof Press",
          "Plank",
        ];
        const expectedDayA2Exercises = [
          "Barbell Squat",
          "Standing Barbell Military Press",
          "Pallof Press",
          "Plank",
        ];
        const expectedDayBExercises = [
          "Barbell Deadlift",
          "Bent Over Barbell Row",
          "Wood Chop",
          "Kneeling Ab Wheel Rollout",
        ];
        const expectedCooldown = [
          "Calf Stretch Left",
          "Calf Stretch Right",
          "Forward Bend",
          "Kneeling Lunge Stretch Left",
          "Kneeling Lunge Stretch Right",
          "Levator Scapulae Stretch Left",
          "Levator Scapulae Stretch Right",
          "Shoulder Roll Clockwise",
          "Spine Lumbar Twist Stretch Left",
          "Spine Lumbar Twist Stretch Right",
          "Glute Stretch Left",
          "Glute Stretch Right",
          "Cat Cow Pose",
          "Child Pose",
        ];

        for (const [date, expectedWorkoutTitle, expectedStrengthTitles, expectedDayType, expectedRestCount, expectedStrengthSets] of [
          ["2026-05-19", "Workout A1", expectedDayA1Exercises, "day_a", 3, [3, 2, 2, 1]],
          ["2026-05-20", "Workout B", expectedDayBExercises, "day_b", 4, [3, 2, 1, 2]],
          ["2026-05-22", "Workout A2", expectedDayA2Exercises, "day_a", 3, [3, 2, 2, 1]],
        ] as const) {
          await markEngine.generateMarkInstancesForDate("user_1", date);
          const marks = await harness.repos.marks.listMarkInstancesByDate("user_1", date);
          const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
          assert.ok(healthPath);
          const workoutMark = marks.find((mark) => mark.pathId === healthPath!.id && mark.title === expectedWorkoutTitle);
          assert.ok(workoutMark);

          await sessionEngine.startWorkoutSession({ markInstanceId: workoutMark!.id });
          const readModel = await loadStrengthSessionReadModel(shell, workoutMark!.id, "en");
          assert.equal(readModel.status, "ready");
          if (readModel.status !== "ready") {
            continue;
          }

          assert.equal(readModel.uiSession.dayType, expectedDayType);
          assert.deepEqual(
            readModel.uiSession.exercises.map((exercise) => exercise.title.en),
            expectedStrengthTitles,
          );
          assert.deepEqual(
            readModel.uiSession.stretches.map((stretch) => stretch.title.en),
            expectedCooldown,
          );
          const routineExercises = await harness.repos.strength.listRoutineExercises(readModel.session.routineTemplateId);
          assert.deepEqual(
            routineExercises
              .filter((exercise) => exercise.phase === WorkoutExercisePhase.Strength)
              .map((exercise) => exercise.targetSets),
            expectedStrengthSets,
          );
          assert.deepEqual(
            routineExercises
              .filter((exercise) => exercise.phase === WorkoutExercisePhase.Strength && exercise.targetType !== ExerciseTargetType.Timed)
              .map((exercise) => exercise.restDurationSec ?? null),
            Array(expectedRestCount).fill(90),
          );
          assert.equal(readModel.uiSession.exerciseCountLabel, `${expectedStrengthTitles.length} exercises`);
          assert.equal(readModel.uiSession.stretchCountLabel, "14 stretches");
        }
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Health seeds drive workout cycle weekly weight and workout readiness without attaching readiness to career focus blocks",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const markEngine = createMarkEngine(harness.repos);
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);
        const sequences: string[] = [];
        for (const date of ["2026-05-22", "2026-05-23", "2026-05-24", "2026-05-25"]) {
          await markEngine.generateMarkInstancesForDate("user_1", date);
          const marks = await markEngine.listVisibleMarksForDay("user_1", date);
          const primary = marks.find((mark) => mark.pathId === healthPath!.id);
          sequences.push(primary?.title ?? "missing");
        }
        assert.deepEqual(sequences, ["Workout A2", "Workout B", "Workout Walk", "Workout Walk"]);

        await recordHealthMeasurement(harness.repos.appSettings, "user_1", {
          type: "weight",
          value: 75.5,
          unit: "kg",
          recordedAt: "2026-06-20T08:00:00.000Z",
        });
        const measurements = await listHealthMeasurements(harness.repos.appSettings, "user_1", "weight");
        const progress = await evaluateWeightMilestoneProgress(harness.repos, "user_1", healthPath!.id);
        assert.equal(measurements.length, 1);
        assert.equal(progress?.latest.value, 75.5);
        assert.equal(progress?.reachedMilestoneIds.length, 1);

        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-20");
        assert.equal((await harness.repos.memories.listMemoriesByTrailDay(trailDay.id)).length, 0);

        const packCheckEngine = createPackCheckEngine(harness.repos);
        await markEngine.generateMarkInstancesForDate("user_1", "2026-05-22");
        await packCheckEngine.generatePackCheckInstancesForDate("user_1", "2026-05-22");
        const marks0522 = await markEngine.listVisibleMarksForDay("user_1", "2026-05-22");
        const focusTitles = [
          "Viết RSD Template xác nhận giao dịch QLSD Thẻ trên SMB",
          "Viết RSD API vấn tin chi tiết giao dịch QLSD Thẻ trên SCH",
          "Buffer hoàn thiện 2 RSD ngày 22/05",
        ];
        for (const title of focusTitles) {
          const mark = marks0522.find((item) => item.title === title)!;
          const linkedPacks = await harness.repos.packChecks.listInstancesByTargetMark(mark.id);
          assert.equal(linkedPacks.length, 0);
        }
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Style and Golf seed metadata import without duplicate recurring templates",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapWaymarkMap(
          { repositories: harness.repos, userId: "user_1" },
          {
            version: 1,
            paths: [{ sourceSeedId: "career", slug: "career", title: "Career", sortOrder: 0 }],
            markTemplates: [
              {
                sourceSeedId: "career.weekday.focus_block_1",
                pathSeedId: "career",
                title: "Career Focus Block 1",
                templateType: MarkTemplateType.Routine,
                recurrenceRule: { kind: RecurrenceKind.Weekly, daysOfWeek: [1, 2, 3, 4, 5] },
              },
            ],
            packCheckTemplates: [
              {
                sourceSeedId: "career.rsd-writing-input-ready",
                pathSeedId: "career",
                title: "RSD Writing Input Ready",
                items: [{ sourceSeedId: "item_1", label: "Old item", isRequired: true, orderIndex: 0 }],
                markRules: [{ sourceSeedId: "legacy_rule", markTemplateSeedId: "career.weekday.focus_block_1" }],
              },
            ],
          },
        );

        const recordsBefore = await listSeedRecords(harness.repos.appSettings, "user_1");
        const legacyPackRecord = recordsBefore.find(
          (record) =>
            record.entityType === "pack_check_template" &&
            record.sourceSeedId === "career.rsd-writing-input-ready",
        )!;
        assert.ok(legacyPackRecord);

        await bootstrapFullConfig(harness);
        const stylePath = await getPathByTitle(harness, "user_1", "Style & Class");
        assert.ok(stylePath);

        const stylePackChecks = await harness.repos.packChecks.listTemplatesByPath(stylePath!.id);
        const groomingPack = stylePackChecks.find((item) => item.title === "Daily Grooming Presence Check");
        assert.ok(groomingPack);
        const groomingItems = await harness.repos.packChecks.listItemTemplates(groomingPack!.id);
        assert.equal(groomingItems.some((item) => item.label === "Shoes presentable"), true);
        assert.equal(groomingItems.some((item) => item.label === "Need items"), false);

        const recordsAfter = await listSeedRecords(harness.repos.appSettings, "user_1");
        const deprecatedLegacyRecord = recordsAfter.find(
          (record) =>
            record.entityType === "pack_check_template" &&
            record.sourceSeedId === "career.rsd-writing-input-ready",
        )!;
        assert.equal(deprecatedLegacyRecord.ownership, "deprecated_seed");
        const legacyTemplate = await harness.repos.packChecks.getTemplateById(legacyPackRecord.entityId);
        assert.equal(legacyTemplate?.isActive, false);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Seeded runtime signal generation materializes style and family signals without SNAG runtime instances",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const markEngine = createMarkEngine(harness.repos);
        const packCheckEngine = createPackCheckEngine(harness.repos);
        const signalEngine = createSignalEngine(harness.repos);
        await markEngine.generateMarkInstancesForDate("user_1", "2026-06-16");
        await markEngine.generateMarkInstancesForDate("user_1", "2026-06-17");
        await packCheckEngine.generatePackCheckInstancesForDate("user_1", "2026-06-16");
        const signals = await signalEngine.generateSeededSignalsForDate("user_1", "2026-06-16");

        const marks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-06-16");
        const trailDay = await harness.repos.trailDays.getTrailDayByDate("user_1", "2026-06-16");
        const packChecks = await harness.repos.packChecks.listInstancesByTrailDay(trailDay!.id);
        const groomingPack = packChecks.find((pack) => pack.title === "Daily Grooming Presence Check");
        const healthReadiness =
          packChecks.find((pack) => pack.title === "Workout Readiness Check") ??
          packChecks.find((pack) => pack.title === "Walk Readiness Check");
        assert.ok(groomingPack);
        assert.ok(healthReadiness);

        const styleSignals = await harness.repos.signals.listSignalsByTarget(
          SignalTargetType.PackCheckInstance,
          groomingPack!.id,
        );
        assert.deepEqual(
          styleSignals.map((signal) => signal.scheduledAt).sort(),
          ["2026-06-16T07:45:00.000Z", "2026-06-16T13:15:00.000Z"],
        );
        const workoutSignals = await harness.repos.signals.listSignalsByTarget(
          SignalTargetType.PackCheckInstance,
          healthReadiness!.id,
        );
        assert.deepEqual(workoutSignals.map((signal) => signal.scheduledAt), ["2026-06-16T21:00:00.000Z"]);

        const snagPath = await getPathByTitle(harness, "user_1", "SNAG Golf Vietnam");
        const snagMarks = marks.filter((mark) => mark.pathId === snagPath!.id);
        assert.equal(snagMarks.length, 0);
        assert.equal(signals.some((signal) => snagMarks.some((mark) => mark.id === signal.targetId)), false);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Seeded strict grooming signals re-ring and stop silently at max without mutating pack check state",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const markEngine = createMarkEngine(harness.repos);
        const packCheckEngine = createPackCheckEngine(harness.repos);
        const signalEngine = createSignalEngine(harness.repos);
        await markEngine.generateMarkInstancesForDate("user_1", "2026-06-16");
        await packCheckEngine.generatePackCheckInstancesForDate("user_1", "2026-06-16");
        await signalEngine.generateSeededSignalsForDate("user_1", "2026-06-16");

        const trailDay = await harness.repos.trailDays.getTrailDayByDate("user_1", "2026-06-16");
        const stylePack = (await harness.repos.packChecks.listInstancesByTrailDay(trailDay!.id)).find(
          (pack) => pack.title === "Daily Grooming Presence Check",
        )!;
        const initialPackStatus = (await harness.repos.packChecks.getInstanceById(stylePack.id))?.status;
        const styleSignals = await harness.repos.signals.listSignalsByTarget(
          SignalTargetType.PackCheckInstance,
          stylePack.id,
        );
        const morningSignal = styleSignals.find((signal) => signal.scheduledAt === "2026-06-16T07:45:00.000Z")!;
        await signalEngine.ringDueSignals({ now: "2026-06-16T07:45:01.000Z" });

        const firstDismiss = await signalEngine.dismissSignal({
          signalId: morningSignal.id,
          dismissedAt: "2026-06-16T07:46:00.000Z",
        });
        assert.equal(firstDismiss.status, SignalStatus.Dismissed);
        assert.equal((await harness.repos.packChecks.getInstanceById(stylePack.id))?.status, initialPackStatus);
        assert.equal((await getSignalBehavior(harness.repos.appSettings, "user_1", morningSignal.id))?.ringCount, 1);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Runtime materialization reruns keep signal identities stable and do not duplicate instances",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const services = {
          repositories: harness.repos,
          user: { id: "user_1", timezone: "UTC" },
          markEngine: createMarkEngine(harness.repos),
          packCheckEngine: createPackCheckEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
        };

        await materializeRuntimeForDate(services as never, "2026-06-16", "2026-06-16T07:45:01.000Z");
        const firstSignals = (await harness.repos.signals.listSignalsByStatus([
          SignalStatus.Scheduled,
          SignalStatus.Ringing,
          SignalStatus.Snoozed,
          SignalStatus.Dismissed,
        ])).items;

        await materializeRuntimeForDate(services as never, "2026-06-16", "2026-06-16T10:00:00.000Z");
        const secondSignals = (await harness.repos.signals.listSignalsByStatus([
          SignalStatus.Scheduled,
          SignalStatus.Ringing,
          SignalStatus.Snoozed,
          SignalStatus.Dismissed,
        ])).items;

        assert.equal(secondSignals.length, firstSignals.length);
        assert.deepEqual(
          secondSignals.map((signal) => signal.id).sort(),
          firstSignals.map((signal) => signal.id).sort(),
        );
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Silenced grooming signal is not recreated on regeneration and next day creates a new instance",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const markEngine = createMarkEngine(harness.repos);
        const packCheckEngine = createPackCheckEngine(harness.repos);
        const signalEngine = createSignalEngine(harness.repos);
        await markEngine.generateMarkInstancesForDate("user_1", "2026-06-16");
        await packCheckEngine.generatePackCheckInstancesForDate("user_1", "2026-06-16");
        await signalEngine.generateSeededSignalsForDate("user_1", "2026-06-16");

        const trailDay = await harness.repos.trailDays.getTrailDayByDate("user_1", "2026-06-16");
        const stylePack = (await harness.repos.packChecks.listInstancesByTrailDay(trailDay!.id)).find(
          (pack) => pack.title === "Daily Grooming Presence Check",
        )!;
        const styleSignal = (await harness.repos.signals.listSignalsByTarget(SignalTargetType.PackCheckInstance, stylePack.id)).find(
          (signal) => signal.scheduledAt === "2026-06-16T07:45:00.000Z",
        )!;

        await setSignalBehavior(harness.repos.appSettings, "user_1", {
          signalId: styleSignal.id,
          ringCount: 1,
          maxRings: 1,
          repeatAfterMinutes: 5,
        });
        await harness.repos.signals.updateSignal(styleSignal.id, {
          status: SignalStatus.Ringing,
          ringingStartedAt: "2026-06-16T07:57:01.000Z",
        });
        const dismissed = await signalEngine.dismissSignal({
          signalId: styleSignal.id,
          dismissedAt: "2026-06-16T07:58:00.000Z",
        });
        assert.equal(dismissed.status, SignalStatus.Dismissed);

        await signalEngine.generateSeededSignalsForDate("user_1", "2026-06-16");
        const sameDaySignals = await harness.repos.signals.listSignalsByTarget(
          SignalTargetType.PackCheckInstance,
          stylePack.id,
        );
        assert.equal(sameDaySignals.filter((signal) => signal.scheduledAt === "2026-06-16T07:45:00.000Z").length, 1);
        assert.equal(sameDaySignals.find((signal) => signal.id === styleSignal.id)?.status, SignalStatus.Dismissed);

        await markEngine.generateMarkInstancesForDate("user_1", "2026-06-17");
        await packCheckEngine.generatePackCheckInstancesForDate("user_1", "2026-06-17");
        await signalEngine.generateSeededSignalsForDate("user_1", "2026-06-17");
        const nextTrailDay = await harness.repos.trailDays.getTrailDayByDate("user_1", "2026-06-17");
        const nextDayPack = (await harness.repos.packChecks.listInstancesByTrailDay(nextTrailDay!.id)).find(
          (pack) => pack.title === "Daily Grooming Presence Check",
        )!;
        const nextDaySignals = await harness.repos.signals.listSignalsByTarget(
          SignalTargetType.PackCheckInstance,
          nextDayPack.id,
        );
        assert.equal(nextDaySignals.some((signal) => signal.scheduledAt === "2026-06-17T07:45:00.000Z"), true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Anchor path rotation resolves by weekday and manual override stays scoped to one date",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const activePaths = await harness.repos.paths.listActivePaths("user_1");
        const career = await getPathByTitle(harness, "user_1", "Career");
        const snag = await getPathByTitle(harness, "user_1", "SNAG Golf Vietnam");
        const family = await getPathByTitle(harness, "user_1", "Family & Home");
        assert.ok(career);
        assert.ok(snag);
        assert.ok(family);

        const expected: Array<[string, string]> = [
          ["2026-05-25", career!.id],
          ["2026-05-26", snag!.id],
          ["2026-05-27", career!.id],
          ["2026-05-28", snag!.id],
          ["2026-05-29", career!.id],
          ["2026-05-30", family!.id],
          ["2026-05-31", family!.id],
        ];
        for (const [date, pathId] of expected) {
          const resolved = await resolveAnchorPathIdForDate(
            harness.repos.appSettings,
            "user_1",
            { date, anchorPathId: undefined },
            activePaths,
          );
          assert.equal(resolved, pathId);
        }

        const services = {
          repositories: harness.repos,
          user: { id: "user_1", timezone: "UTC" },
          markEngine: createMarkEngine(harness.repos),
          packCheckEngine: createPackCheckEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
        };

        const monday = await materializeRuntimeForDate(services as never, "2026-05-25", "2026-05-25T09:00:00.000Z");
        assert.equal(monday.trailDay.anchorPathId, career!.id);
        await harness.repos.trailDays.setAnchorPath(monday.trailDay.id, family!.id);
        const rerunMonday = await materializeRuntimeForDate(services as never, "2026-05-25", "2026-05-25T10:00:00.000Z");
        assert.equal(rerunMonday.trailDay.anchorPathId, family!.id);

        const tuesday = await materializeRuntimeForDate(services as never, "2026-05-26", "2026-05-26T09:00:00.000Z");
        assert.equal(tuesday.trailDay.anchorPathId, snag!.id);

        const thursdayTrailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-28");
        const closeTrail = createCloseTrailEngine(harness.repos);
        await closeTrail.getCloseTrailReview(thursdayTrailDay.id, "2026-05-28T21:00:00.000Z");
        const persistedThursday = await harness.repos.trailDays.getTrailDayById(thursdayTrailDay.id);
        assert.equal(persistedThursday?.anchorPathId, snag!.id);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Materializing today does not auto-generate marks pack checks or signals without a Weekly Timetable",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);

        const services = {
          repositories: harness.repos,
          user: { id: "user_1", timezone: "UTC" },
          markEngine: createMarkEngine(harness.repos),
          packCheckEngine: createPackCheckEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
        };

        await materializeRuntimeForDate(services as never, "2026-05-22", "2026-05-22T21:00:00.000Z");

        const tomorrowMarks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-05-23");
        assert.equal(tomorrowMarks.length, 0);

        const packVisibility = await services.packCheckEngine.listVisiblePackChecksForDay(
          "user_1",
          "2026-05-22",
          "2026-05-22T21:00:00.000Z",
        );
        assert.equal(packVisibility.today.length, 0);
        assert.equal(packVisibility.prepareTomorrow.length, 0);

        const activeSignals = await harness.repos.signals.listSignalsByStatus([
          SignalStatus.Scheduled,
          SignalStatus.Ringing,
          SignalStatus.Snoozed,
        ]);
        assert.equal(activeSignals.items.length, 0);

        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-22");
        const closeTrail = createCloseTrailEngine(harness.repos);
        const review = await closeTrail.getCloseTrailReview(trailDay.id, "2026-05-22T21:00:00.000Z");
        assert.equal(review.suggestedTomorrowFirstStep == null, true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Runtime materialization does not create seeded TrailDay or PackCheck signals",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const customPath = await harness.repos.paths.createPath({
          userId: "user_1",
          slug: "signal-order-test",
          title: "Signal Order Test",
          sortOrder: 999,
        });
        const linkedMarkTemplate = await harness.repos.marks.createMarkTemplate({
          userId: "user_1",
          pathId: customPath.id,
          title: "Deterministic linked mark",
          templateType: MarkTemplateType.Routine,
          recurrenceRule: {
            kind: RecurrenceKind.Daily,
            interval: 1,
          },
        });
        const linkedPackTemplate = await createPackCheckTemplate(harness, {
          pathId: customPath.id,
          title: "Deterministic linked pack",
          defaultAvailableOffsetMin: 0,
          defaultDueOffsetMin: 0,
        });
        await createPackCheckItemTemplate(harness, linkedPackTemplate.id, "Bottle", true, 0);
        await harness.repos.packChecks.upsertMarkPackCheckRules([
          {
            id: "signal_order_rule",
            markTemplateId: linkedMarkTemplate.id,
            packCheckTemplateId: linkedPackTemplate.id,
            availableOffsetMin: 0,
            dueOffsetMin: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        const seededLinkedMark = await createMark(harness, {
          userId: "user_1",
          localDate: "2026-06-16",
          pathId: customPath.id,
          title: "Deterministic linked mark",
          templateId: linkedMarkTemplate.id,
          origin: MarkInstanceOrigin.ManualPlan,
        });
        const services = {
          repositories: harness.repos,
          user: { id: "user_1", timezone: "UTC" },
          markEngine: createMarkEngine(harness.repos),
          packCheckEngine: createPackCheckEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
        };
        await setSignalConfig(harness.repos.appSettings, "user_1", {
          id: "pack_check_signal_test",
          sourceSeedId: "pack_check_signal_test",
          label: "Pack check signal test",
          targetType: "pack_check_template",
          targetId: linkedPackTemplate.id,
          scheduledTime: "21:00",
          repeatAfterMinutes: 5,
          maxRings: 3,
          strict: true,
          quietHoursBypass: false,
          isActive: true,
        });

        const first = await materializeRuntimeForDate(services as never, "2026-06-16", "2026-06-16T21:00:01.000Z");
        const second = await materializeRuntimeForDate(services as never, "2026-06-16", "2026-06-16T21:05:01.000Z");
        assert.equal(first.trailDay.id, second.trailDay.id);

        const globalTrailSignals = await harness.repos.signals.listSignalsByTarget(SignalTargetType.TrailDay, first.trailDay.id);
        assert.equal(globalTrailSignals.length, 0);

        const linkedPack = (await harness.repos.packChecks.listInstancesByTrailDay(first.trailDay.id)).find(
          (instance) =>
            instance.templateId === linkedPackTemplate.id &&
            instance.targetMarkInstanceId === seededLinkedMark.id,
        );
        const rerunPack = (await harness.repos.packChecks.listInstancesByTrailDay(second.trailDay.id)).find(
          (instance) =>
            instance.templateId === linkedPackTemplate.id &&
            instance.targetMarkInstanceId === seededLinkedMark.id,
        );
        assert.equal(linkedPack, undefined);
        assert.equal(rerunPack, undefined);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail save creates matching discipline proof and linked quick-mark proof pairs",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const engine = createCloseTrailEngine(harness.repos);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-18");
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);
        const cutTo70 = (await harness.repos.expeditions.listExpeditionsByPath(healthPath!.id)).items.find(
          (expedition) => expedition.title === "Cut to 70",
        );
        const cutTo70Milestone = cutTo70 ?
          (await harness.repos.expeditions.listMilestonesByExpedition(cutTo70.id)).find((milestone) => milestone.title === "Reach 76kg")
        : null;
        assert.ok(cutTo70);
        assert.ok(cutTo70Milestone);

        await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-18T21:35:00.000Z",
          manualCloseReason: "close with saved disciplines",
          disciplineSelections: [
            {
              key: "no_eating_outside_window",
              label: "No eating outside of eating window",
              pathId: healthPath!.id,
              expeditionId: cutTo70!.id,
              milestoneId: cutTo70Milestone!.id,
            },
            {
              key: "no_overeating_during_window",
              label: "No overeating during eating window",
              pathId: healthPath!.id,
              expeditionId: cutTo70!.id,
              milestoneId: cutTo70Milestone!.id,
            },
          ],
        });

        const proofs = await listDisciplineProofsByTrailDay(harness.repos.appSettings, "user_1", trailDay.id);
        assert.equal(proofs.length, 2);
        const marks = await harness.repos.marks.listMarkInstancesByTrailDay(trailDay.id);
        const disciplineMarks = await Promise.all(
          marks
            .filter((entry) => entry.origin === MarkInstanceOrigin.QuickCapture)
            .map(async (entry) => ({
              mark: entry,
              metadata: await getMarkMetadata(harness.repos.appSettings, "user_1", entry.id),
            })),
        );
        assert.equal(disciplineMarks.length, 2);
        assert.equal(
          disciplineMarks.every(
            ({ mark, metadata }) =>
              mark.status === MarkInstanceStatus.Completed &&
              mark.expeditionId === cutTo70!.id &&
              mark.milestoneId === cutTo70Milestone!.id &&
              metadata?.source === "close_trail" &&
              metadata?.quickMarkType === "discipline_to_keep" &&
              metadata?.appearsInToday === false &&
              metadata?.appearsInPathProof === true &&
              metadata?.appearsInJournal === true &&
              proofs.some((proof) => proof.id === metadata?.sourceDisciplineProofId),
          ),
          true,
        );
        assert.equal((await harness.repos.trailDays.getTrailDayById(trailDay.id))?.characterResult, "Character is Protected.");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail review close allows unresolved marks and keeps them open for judgment",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-19");
        const completedMark = await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Completed planned mark",
          status: MarkInstanceStatus.Completed,
        });
        const openMark = await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Open planned mark",
          status: MarkInstanceStatus.Planned,
        });
        await harness.repos.memories.createMemory({
          userId: "user_1",
          trailDayId: trailDay.id,
          pathId: null,
          title: "One memory",
          note: null,
          capturedAt: "2026-06-19T20:30:00.000Z",
          privacy: MemoryPrivacy.Private,
          mediaAssetIds: [],
        });

        const engine = createCloseTrailEngine(harness.repos);
        const result = await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-19T20:45:00.000Z",
          allowUnresolvedMarks: true,
        });

        assert.equal(result.trailDay.status, TrailDayStatus.Closed);
        assert.equal(result.judgment.day.passed, false);
        assert.equal(result.judgment.day.label, "The Day Needs Repair.");
        assert.equal(result.judgment.plannedMarkOutcomes.counts.completed, 1);
        assert.equal(result.judgment.plannedMarkOutcomes.counts.unresolved, 1);

        const reloadedCompleted = await harness.repos.marks.getMarkInstanceById(completedMark.id);
        const reloadedOpen = await harness.repos.marks.getMarkInstanceById(openMark.id);
        assert.equal(reloadedCompleted?.status, MarkInstanceStatus.Completed);
        assert.equal(reloadedOpen?.status, MarkInstanceStatus.Planned);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail counts a same-day substitute mark for a substituted supervising mark",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-22");
        const markEngine = createMarkEngine(harness.repos);
        const supervising = await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Morning supervising",
          status: MarkInstanceStatus.Ready,
        });
        const retainedSupervising = await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Afternoon supervising",
          status: MarkInstanceStatus.Completed,
        });
        await setMarkMetadata(harness.repos.appSettings, "user_1", {
          markId: supervising.id,
          blockType: "supervising_block",
        });
        await setMarkMetadata(harness.repos.appSettings, "user_1", {
          markId: retainedSupervising.id,
          blockType: "supervising_block",
        });

        await markEngine.substituteMarkInstance({
          markInstanceId: supervising.id,
          substituteTitle: "Incident response substitute",
          substituteMode: {
            mode: "completed_now",
            completedAt: "2026-06-22T10:30:00.000Z",
            proofNote: "Handled urgent support instead.",
          },
        });

        const summary = await createCloseTrailEngine(harness.repos).getCloseTrailSummary(trailDay.id);

        assert.equal(summary.plannedCount, 2);
        assert.equal(summary.completedCount, 2);
        assert.equal(summary.substitutedCount, 1);
        assert.equal(summary.completionRatio.completed, 1);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail keeps one original supervising mark when all supervising marks are substituted",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-23");
        const markEngine = createMarkEngine(harness.repos);
        const morning = await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Morning supervising",
          status: MarkInstanceStatus.Ready,
        });
        const afternoon = await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Afternoon supervising",
          status: MarkInstanceStatus.Ready,
        });
        await setMarkMetadata(harness.repos.appSettings, "user_1", {
          markId: morning.id,
          blockType: "supervising_block",
        });
        await setMarkMetadata(harness.repos.appSettings, "user_1", {
          markId: afternoon.id,
          blockType: "supervising_block",
        });

        await markEngine.substituteMarkInstance({
          markInstanceId: morning.id,
          substituteTitle: "Morning substitute",
          substituteMode: {
            mode: "completed_now",
            completedAt: "2026-06-23T10:30:00.000Z",
          },
        });
        await markEngine.substituteMarkInstance({
          markInstanceId: afternoon.id,
          substituteTitle: "Afternoon substitute",
          substituteMode: {
            mode: "completed_now",
            completedAt: "2026-06-23T16:30:00.000Z",
          },
        });

        const summary = await createCloseTrailEngine(harness.repos).getCloseTrailSummary(trailDay.id);

        assert.equal(summary.plannedCount, 3);
        assert.equal(summary.completedCount, 2);
        assert.equal(summary.substitutedCount, 2);
        assert.equal(summary.completionRatio.completed, 2 / 3);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail counts an incomplete supervising substitute in planned total but not completed total",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-24");
        const markEngine = createMarkEngine(harness.repos);
        const supervising = await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Morning supervising",
          status: MarkInstanceStatus.Ready,
        });
        const retainedSupervising = await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Afternoon supervising",
          status: MarkInstanceStatus.Completed,
        });
        await setMarkMetadata(harness.repos.appSettings, "user_1", {
          markId: supervising.id,
          blockType: "supervising_block",
        });
        await setMarkMetadata(harness.repos.appSettings, "user_1", {
          markId: retainedSupervising.id,
          blockType: "supervising_block",
        });

        await markEngine.substituteMarkInstance({
          markInstanceId: supervising.id,
          substituteTitle: "Pending substitute",
          substituteMode: { mode: "ready" },
        });

        const summary = await createCloseTrailEngine(harness.repos).getCloseTrailSummary(trailDay.id);

        assert.equal(summary.plannedCount, 2);
        assert.equal(summary.completedCount, 1);
        assert.equal(summary.completionRatio.completed, 0.5);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail does not count unrelated discipline quick captures as planned marks",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-25");
        await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Completed planned mark",
          status: MarkInstanceStatus.Completed,
        });
        const discipline = await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Discipline proof",
          status: MarkInstanceStatus.Completed,
          origin: MarkInstanceOrigin.QuickCapture,
        });
        await setMarkMetadata(harness.repos.appSettings, "user_1", {
          markId: discipline.id,
          quickMarkType: "discipline_to_keep",
          source: "close_trail",
        });

        const summary = await createCloseTrailEngine(harness.repos).getCloseTrailSummary(trailDay.id);

        assert.equal(summary.plannedCount, 1);
        assert.equal(summary.completedCount, 1);
        assert.equal(summary.quickMarkCount, 1);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail day judgment fails when memories are missing even if planned marks are completed",
    run: async () => {
      const harness = await createHarness();
      try {
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-20");
        await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Completed planned mark 1",
          status: MarkInstanceStatus.Completed,
        });
        await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Completed planned mark 2",
          status: MarkInstanceStatus.Completed,
        });

        const engine = createCloseTrailEngine(harness.repos);
        const result = await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-20T22:00:00.000Z",
        });

        assert.equal(result.judgment.day.passed, false);
        assert.equal(result.judgment.day.memoryCount, 0);
        assert.equal(result.judgment.day.label, "The Day Needs Repair.");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail commits discipline proof marks before character judgment is computed",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const engine = createCloseTrailEngine(harness.repos);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-21");
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);
        const cutTo70 = (await harness.repos.expeditions.listExpeditionsByPath(healthPath!.id)).items.find(
          (expedition) => expedition.title === "Cut to 70",
        );
        assert.ok(cutTo70);

        const result = await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-21T22:00:00.000Z",
          manualCloseReason: "close with no planned marks",
          disciplineSelections: [
            {
              key: "no_eating_outside_window",
              label: "No eating outside of eating window",
              pathId: healthPath!.id,
              expeditionId: cutTo70!.id,
            },
            {
              key: "no_overeating_during_window",
              label: "No overeating during eating window",
              pathId: healthPath!.id,
              expeditionId: cutTo70!.id,
            },
          ],
        });

        assert.equal(result.judgment.character.completedDisciplineStandards, 2);
        assert.equal(result.judgment.character.totalDisciplineStandards, 2);
        assert.equal(result.judgment.character.passed, true);

        const marks = await harness.repos.marks.listMarkInstancesByTrailDay(trailDay.id);
        const committedDisciplineMarks = marks.filter(
          (entry) => entry.origin === MarkInstanceOrigin.QuickCapture && entry.status === MarkInstanceStatus.Completed,
        );
        assert.equal(committedDisciplineMarks.length, 2);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail read-model exposes discipline cluster and derived character summary without persisting selection",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const engine = createCloseTrailEngine(harness.repos);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-22");
        const review = await engine.getCloseTrailReview(trailDay.id, "2026-06-22T21:00:00.000Z");
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        const cutTo70 = healthPath ?
          (await harness.repos.expeditions.listExpeditionsByPath(healthPath.id)).items.find((expedition) => expedition.title === "Cut to 70")
        : null;
        const cutTo70Milestone = cutTo70 ?
          (await harness.repos.expeditions.listMilestonesByExpedition(cutTo70.id)).find((milestone) => milestone.title === "Reach 76kg")
        : null;
        const fixture = buildCloseTrailFixture(review, []);
        assert.equal(fixture.phase, "review");
        const selected =
          fixture.phase === "review" ?
            resolveSelectedDisciplines(fixture.disciplineCluster, ["no_eating_outside_window"], "en")
          : [];

        assert.equal(fixture.phase === "review" ? fixture.disciplineCluster.items.length : 0, 2);
        assert.deepEqual(selected, [
          {
            key: "no_eating_outside_window",
            label: "No eating outside of eating window",
            pathId:
              fixture.phase === "review" ?
                fixture.disciplineCluster.items.find((item) => item.key === "no_eating_outside_window")!.pathId
              : "",
            expeditionId:
              fixture.phase === "review" ?
                fixture.disciplineCluster.items.find((item) => item.key === "no_eating_outside_window")!.expeditionId
              : undefined,
            milestoneId:
              fixture.phase === "review" ?
                fixture.disciplineCluster.items.find((item) => item.key === "no_eating_outside_window")!.milestoneId
              : undefined,
          },
        ]);
        assert.equal(selected[0]?.expeditionId, cutTo70?.id);
        assert.equal(selected[0]?.milestoneId, cutTo70Milestone?.id);
        assert.equal((await listDisciplineProofsByTrailDay(harness.repos.appSettings, "user_1", trailDay.id)).length, 0);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail review tolerates malformed scheduled time in tomorrow first step preview",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const engine = createCloseTrailEngine(harness.repos);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-07-20");
        const nextTrailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-07-21");
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);

        const tomorrowMark = await createMark(harness, {
          trailDayId: nextTrailDay.id,
          localDate: "2026-07-21",
          pathId: healthPath!.id,
          title: "Malformed time mark",
        });
        const originalListMarkInstancesByDate = harness.repos.marks.listMarkInstancesByDate.bind(harness.repos.marks);
        harness.repos.marks.listMarkInstancesByDate = async (userId, localDate) => {
          const marks = await originalListMarkInstancesByDate(userId, localDate);
          return marks.map((mark) =>
            mark.id === tomorrowMark.id
              ? {
                  ...mark,
                  scheduledStartAt: "bad-time-value",
                }
              : mark,
          );
        };

        try {
          const review = await engine.getCloseTrailReview(trailDay.id, "2026-07-20T21:00:00.000Z");
          assert.equal(review.suggestedTomorrowFirstStep?.plannedMarkId, tomorrowMark.id);
          assert.equal(review.suggestedTomorrowFirstStep?.scheduledTime, "bad-time-value");
        } finally {
          harness.repos.marks.listMarkInstancesByDate = originalListMarkInstancesByDate;
        }
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail review keeps floating local scheduled time for tomorrow first step preview chip",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const engine = createCloseTrailEngine(harness.repos);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-07-20");
        const nextTrailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-07-21");
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);

        const tomorrowMark = await createMark(harness, {
          trailDayId: nextTrailDay.id,
          localDate: "2026-07-21",
          pathId: healthPath!.id,
          title: "Floating time mark",
        });
        await harness.repos.marks.updateMarkInstance(tomorrowMark.id, {
          scheduledStartAt: "2026-07-21T05:30:00.000",
          dueAt: "2026-07-21T07:00:00.000",
        });

        const review = await engine.getCloseTrailReview(trailDay.id, "2026-07-20T21:00:00.000Z");
        assert.equal(review.suggestedTomorrowFirstStep?.plannedMarkId, tomorrowMark.id);
        assert.equal(review.suggestedTomorrowFirstStep?.scheduledTime, "5:30 AM");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail with no saved discipline selection creates no discipline proof pair",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const engine = createCloseTrailEngine(harness.repos);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-19");
        await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-19T21:35:00.000Z",
          manualCloseReason: "close without saved discipline",
          disciplineSelections: [],
        });

        assert.equal((await listDisciplineProofsByTrailDay(harness.repos.appSettings, "user_1", trailDay.id)).length, 0);
        const marks = await harness.repos.marks.listMarkInstancesByTrailDay(trailDay.id);
        assert.equal(marks.some((entry) => entry.origin === MarkInstanceOrigin.QuickCapture), false);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail character judgment uses planned marks plus discipline proofs for the 80 percent rule",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const engine = createCloseTrailEngine(harness.repos);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-19");
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        const cutTo70 = (await harness.repos.expeditions.listExpeditionsByPath(healthPath!.id)).items.find(
          (expedition) => expedition.title === "Cut to 70",
        );
        assert.ok(healthPath);
        assert.ok(cutTo70);

        await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Completed mark 1",
          status: MarkInstanceStatus.Completed,
        });
        await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Completed mark 2",
          status: MarkInstanceStatus.Completed,
        });
        await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Completed mark 3",
          status: MarkInstanceStatus.Completed,
        });
        await createMark(harness, {
          trailDayId: trailDay.id,
          title: "Completed mark 4",
          status: MarkInstanceStatus.Completed,
        });

        const result = await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-19T21:40:00.000Z",
          disciplineSelections: [
            {
              key: "no_eating_outside_window",
              label: "No eating outside of eating window",
              pathId: healthPath!.id,
              expeditionId: cutTo70!.id,
            },
          ],
        });

        assert.equal(result.judgment.character.completedPlannedMarks, 4);
        assert.equal(result.judgment.character.totalPlannedMarks, 4);
        assert.equal(result.judgment.character.completedDisciplineStandards, 1);
        assert.equal(result.judgment.character.totalDisciplineStandards, 2);
        assert.equal(result.judgment.character.completedCharacterItems, 5);
        assert.equal(result.judgment.character.totalCharacterItems, 6);
        assert.equal(result.judgment.character.passed, true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail reopen and re-close reuses discipline proof mark instead of duplicating it",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const engine = createCloseTrailEngine(harness.repos);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-23");
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        const cutTo70 = (await harness.repos.expeditions.listExpeditionsByPath(healthPath!.id)).items.find(
          (expedition) => expedition.title === "Cut to 70",
        );
        const cutTo70Milestone = cutTo70 ?
          (await harness.repos.expeditions.listMilestonesByExpedition(cutTo70.id)).find((milestone) => milestone.title === "Reach 76kg")
        : null;
        assert.ok(healthPath);
        assert.ok(cutTo70);
        assert.ok(cutTo70Milestone);

        await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-23T21:35:00.000Z",
          manualCloseReason: "first close",
          disciplineSelections: [
            {
              key: "no_eating_outside_window",
              label: "No eating outside of eating window",
              pathId: healthPath!.id,
              expeditionId: cutTo70!.id,
              milestoneId: cutTo70Milestone!.id,
            },
          ],
        });
        await engine.reopenTrailDay({
          trailDayId: trailDay.id,
          reopenedAt: "2026-06-23T22:00:00.000Z",
        });
        await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-23T22:05:00.000Z",
          manualCloseReason: "second close",
          disciplineSelections: [
            {
              key: "no_eating_outside_window",
              label: "No eating outside of eating window",
              pathId: healthPath!.id,
              expeditionId: cutTo70!.id,
              milestoneId: cutTo70Milestone!.id,
            },
          ],
        });

        const proofs = await listDisciplineProofsByTrailDay(harness.repos.appSettings, "user_1", trailDay.id);
        assert.equal(proofs.length, 1);
        const marks = await harness.repos.marks.listMarkInstancesByTrailDay(trailDay.id);
        const disciplineMarks = marks.filter((entry) => entry.origin === MarkInstanceOrigin.QuickCapture);
        assert.equal(disciplineMarks.length, 1);
        assert.equal(disciplineMarks[0]?.milestoneId, cutTo70Milestone!.id);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "CloseTrail transaction tolerates malformed legacy mark time on reused discipline proof mark",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const engine = createCloseTrailEngine(harness.repos);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-23");
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);

        await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-23T21:35:00.000Z",
          manualCloseReason: "first close",
          disciplineSelections: [
            {
              key: "no_eating_outside_window",
              label: "No eating outside of eating window",
              pathId: healthPath!.id,
            },
          ],
        });

        const proofMarks = await harness.repos.marks.listMarkInstancesByTrailDay(trailDay.id);
        const existingProofMark = proofMarks.find((entry) => entry.origin === MarkInstanceOrigin.QuickCapture);
        assert.ok(existingProofMark);

        await harness.repos.transaction.runInTransaction(async (txRepos) => {
          await (txRepos as typeof harness.repos).trailDays.updateCloseState(trailDay.id, {
            status: TrailDayStatus.Reopened,
            reopenedAt: "2026-06-23T21:50:00.000Z",
          });
        });

        await harness.db.runAsync(
          "UPDATE mark_instances SET scheduled_end_at = ? WHERE id = ?;",
          8_640_000_000_000_001,
          existingProofMark!.id,
        );

        const reclosed = await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-23T22:00:00.000Z",
          manualCloseReason: "second close",
          disciplineSelections: [
            {
              key: "no_eating_outside_window",
              label: "No eating outside of eating window",
              pathId: healthPath!.id,
            },
          ],
        });

        assert.equal(reclosed.trailDay.status, TrailDayStatus.Closed);
        const updatedProofMarks = await harness.repos.marks.listMarkInstancesByTrailDay(trailDay.id);
        assert.equal(updatedProofMarks.filter((entry) => entry.origin === MarkInstanceOrigin.QuickCapture).length, 1);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Character projection reads discipline proof and honest resolutions without false protection",
    run: async () => {
      const harness = await createHarness();
      try {
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-20");
        const completed = await createMark(harness, {
          trailDayId: trailDay.id,
          pathId: path.id,
          status: MarkInstanceStatus.Completed,
          localDate: "2026-06-20",
          title: "Completed planned mark",
        });
        const honest = await createMark(harness, {
          trailDayId: trailDay.id,
          pathId: path.id,
          status: MarkInstanceStatus.Completed,
          localDate: "2026-06-20",
          title: "Protected mark",
        });
        const avoidance = await createMark(harness, {
          trailDayId: trailDay.id,
          pathId: path.id,
          status: MarkInstanceStatus.Completed,
          localDate: "2026-06-20",
          title: "Avoided mark",
        });
        await createDisciplineProof(harness.repos.appSettings, "user_1", {
          trailDayId: trailDay.id,
          pathId: path.id,
          key: "no_eating_outside_window",
          label: "No eating outside of eating window",
          savedAt: "2026-06-20T21:30:00.000Z",
        });
        await setMarkMetadata(harness.repos.appSettings, "user_1", {
          markId: honest.id,
          resolutionKind: "honestly_resolved",
          resolutionReason: "blocked_by_external_dependency",
          characterEffect: "protected",
          countsAsPathProof: false,
        });
        await setMarkMetadata(harness.repos.appSettings, "user_1", {
          markId: avoidance.id,
          resolutionKind: "honestly_resolved",
          resolutionReason: "avoidance",
          characterEffect: "protected",
          countsAsPathProof: false,
        });

        const marks = [completed, honest, avoidance];
        const projection = projectCharacterFromRecords({
          marks: await Promise.all(
            marks.map(async (mark) => ({
              mark,
              metadata: await getMarkMetadata(harness.repos.appSettings, "user_1", mark.id),
            })),
          ),
          disciplineProofs: await listDisciplineProofsByTrailDay(harness.repos.appSettings, "user_1", trailDay.id),
        });

        assert.equal(projection.keptCount, 2);
        assert.equal(projection.protectedCount, 1);
        assert.equal(projection.repairCount, 1);
        assert.equal(projection.displayLabel, "Steady");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Discipline quick-mark projections stay out of Today and appear in Journal and Path proof",
    run: async () => {
      const harness = await createHarness();
      try {
        const engine = createCloseTrailEngine(harness.repos);
        const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-06-21");
        await engine.closeTrailDay({
          trailDayId: trailDay.id,
          closedAt: "2026-06-21T21:35:00.000Z",
          manualCloseReason: "discipline proof projection",
          disciplineSelections: [
            {
              key: "no_eating_outside_window",
              label: "No eating outside of eating window",
              pathId: path.id,
            },
          ],
        });

        const disciplineMark = (await harness.repos.marks.listMarkInstancesByTrailDay(trailDay.id)).find(
          (entry) => entry.origin === MarkInstanceOrigin.QuickCapture,
        )!;
        const metadata = await getMarkMetadata(harness.repos.appSettings, "user_1", disciplineMark.id);
        const todayMarks = await createMarkEngine(harness.repos).listVisibleMarksForDay("user_1", "2026-06-21");
        assert.equal(todayMarks.some((entry) => entry.id === disciplineMark.id), false);

        const dailyEntry = mapMarkToJournalEntry(disciplineMark, metadata, "en", "Health & Body");
        assert.equal(dailyEntry.title, "No eating outside of eating window");
        assert.equal(dailyEntry.chips[0]?.label, "21h35");
        assert.equal(dailyEntry.chips[1]?.label, "Discipline kept");

        const pathProofs = buildPathProofItems([{ mark: disciplineMark, metadata }], [], "en");
        assert.equal(pathProofs.length, 1);
        assert.equal(("sourceDisciplineProofId" in pathProofs[0]! ? pathProofs[0]!.sourceDisciplineProofId : undefined), metadata?.sourceDisciplineProofId);

        const characterProofs = buildCharacterPathProofItems(
          projectCharacterFromRecords({
            marks: [{ mark: disciplineMark, metadata }],
            disciplineProofs: await listDisciplineProofsByTrailDay(harness.repos.appSettings, "user_1", trailDay.id),
          }).proofEvents,
        );
        assert.equal(characterProofs[0]?.sourceDisciplineProofId, metadata?.sourceDisciplineProofId);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Corrected 7-path seed import keeps Today sane after runtime generation",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const markEngine = createMarkEngine(harness.repos);
        const packCheckEngine = createPackCheckEngine(harness.repos);
        const signalEngine = createSignalEngine(harness.repos);
        await markEngine.generateMarkInstancesForDate("user_1", "2026-05-22");
        await packCheckEngine.generatePackCheckInstancesForDate("user_1", "2026-05-22");
        await signalEngine.generateSeededSignalsForDate("user_1", "2026-05-22");

        const visibleMarks = await markEngine.listVisibleMarksForDay("user_1", "2026-05-22");
        const packVisibility = await packCheckEngine.listVisiblePackChecksForDay(
          "user_1",
          "2026-05-22",
          "2026-05-22T10:00:00.000Z",
        );
        const titles = visibleMarks.map((mark) => mark.title);
        const visibleMarkMetadata = await Promise.all(
          visibleMarks.map(async (mark) => [mark.id, await getMarkMetadata(harness.repos.appSettings, "user_1", mark.id)] as const),
        );
        const visiblePackPolicies = await Promise.all(
          packVisibility.today.map(async (pack) => [pack.id, await getPackCheckSurfacePolicy(harness.repos.appSettings, "user_1", pack.templateId)] as const),
        );

        assert.equal(titles.includes("Workout A2"), true);
        assert.equal(titles.includes("Viết RSD Template xác nhận giao dịch QLSD Thẻ trên SMB"), true);
        assert.equal(titles.includes("Viết RSD API vấn tin chi tiết giao dịch QLSD Thẻ trên SCH"), true);
        assert.equal(titles.includes("Buffer hoàn thiện 2 RSD ngày 22/05"), true);
        assert.equal(titles.includes("Family Activity Block"), true);
        assert.equal(packVisibility.today.some((item) => item.title === "Work Task Readiness Check"), false);
        assert.equal(packVisibility.today.some((item) => item.title === "Daily Grooming Presence Check"), true);
        assert.equal(packVisibility.today.some((item) => item.title === "Before Leaving Home Check"), true);
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
          closeTrailPromptTime: "21:30",
        });
        const strengthProgressionService = createStrengthProgressionService(harness.repos);
        const today = await loadTodayData(
          {
            repositories: harness.repos,
            user,
            markEngine,
            packCheckEngine,
            dependencyEngine: createDefaultDependencyEngine(harness.repos),
            signalEngine,
            closeTrailEngine: createCloseTrailEngine(harness.repos),
            strengthProgressionService,
            strengthSessionEngine: createStrengthSessionEngine(harness.repos, strengthProgressionService),
          },
          "en",
          { now: new Date("2026-05-22T10:00:00.000Z") },
        );
        assert.equal(today.allPackChecks.length, PACK_CHECK_CATALOG.length);
        assert.equal(today.packChecks.length < today.allPackChecks.length, true);
        assert.equal(today.allPackChecks.some((item) => item.title.en === "Workout Readiness Check"), true);
        assert.equal(today.allPackChecks.some((item) => item.title.en === "Pilgrimage Readiness Check"), true);
        const snagPath = await getPathByTitle(harness, "user_1", "SNAG Golf Vietnam");
        assert.ok(snagPath);
        assert.equal(visibleMarks.some((mark) => mark.pathId === snagPath!.id), false);
        const unresolvedSignals = (await harness.repos.signals.listSignalsByStatus([
          SignalStatus.Scheduled,
          SignalStatus.Ringing,
          SignalStatus.Snoozed,
        ])).items;
        const styleSignals = unresolvedSignals.filter(
          (signal) =>
            signal.scheduledAt === "2026-05-22T07:45:00.000Z" || signal.scheduledAt === "2026-05-22T13:15:00.000Z",
        );
        assert.equal(styleSignals.length, 1);
        assert.equal(styleSignals[0]?.scheduledAt, "2026-05-22T13:15:00.000Z");
        const missedStyleSignals = (await harness.repos.signals.listSignalsByStatus([SignalStatus.Missed])).items.filter(
          (signal) => signal.scheduledAt === "2026-05-22T07:45:00.000Z",
        );
        assert.equal(missedStyleSignals.length, 1);

        const characterPath = await getPathByTitle(harness, "user_1", "Stoicism & Character");
        assert.ok(characterPath);
        assert.equal(visibleMarks.some((mark) => mark.pathId === characterPath!.id), false);
        assert.equal(visibleMarkMetadata.every(([, metadata]) => metadata?.appearsInToday !== false), true);
        assert.equal(
          visiblePackPolicies.every(([, policy]) => policy !== "all_pack_checks_only" && policy !== "embedded_in_mark" && policy !== "manual_only"),
          true,
        );
        const workoutMark = visibleMarks.find((mark) => mark.title === "Workout A2");
        assert.ok(workoutMark);
        assert.equal(workoutMark?.scheduledStartAt, "2026-05-22T05:00:00.000");
        assert.equal(workoutMark?.scheduledEndAt, "2026-05-22T07:30:00.000");
        assert.equal(visibleMarks.length, 7);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Today loader tolerates expedition read failures and still returns core Today data",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en",
          timezone: "UTC",
          weekStartsOn: 1,
          closeTrailPromptTime: "21:30",
        });
        const services = {
          repositories: harness.repos,
          user,
          markEngine: createMarkEngine(harness.repos),
          packCheckEngine: createPackCheckEngine(harness.repos),
          dependencyEngine: createDefaultDependencyEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
          closeTrailEngine: createCloseTrailEngine(harness.repos),
          strengthProgressionService: createStrengthProgressionService(harness.repos),
          strengthSessionEngine: createStrengthSessionEngine(
            harness.repos,
            createStrengthProgressionService(harness.repos),
          ),
        };
        await importApprovedWeeklyTimetable(harness);

        const originalGetExpeditionById = harness.repos.expeditions.getExpeditionById.bind(harness.repos.expeditions);
        harness.repos.expeditions.getExpeditionById = async () => {
          throw new Error("forced expedition failure");
        };

        try {
          const data = await loadTodayData(services, "en", { now: new Date("2026-06-01T09:00:00.000Z") });
          assert.equal(data.trailDayId.length > 0, true);
          assert.equal(data.currentExpeditions.length, 0);
          assert.equal(data.marks.length > 0, true);
        } finally {
          harness.repos.expeditions.getExpeditionById = originalGetExpeditionById;
        }
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Runtime materialization preserves final legacy generated marks but removes them from Today",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const careerPath = await getPathByTitle(harness, "user_1", "Career");
        assert.ok(careerPath);
        const templates = await harness.repos.marks.listActiveMarkTemplatesByPath(careerPath!.id);
        const focusTemplate = templates.find((template) => template.title === "Focus Block 1");
        assert.ok(focusTemplate);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-05-22");

        const stale = await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: careerPath!.id,
          trailDayId: trailDay.id,
          templateId: focusTemplate!.id,
          title: "Legacy focus title",
          description: "Legacy description",
          origin: MarkInstanceOrigin.TemplateGenerated,
          status: MarkInstanceStatus.Skipped,
          scheduledStartAt: "2026-05-22T08:30:00.000Z",
          scheduledEndAt: "2026-05-22T09:00:00.000Z",
          generationKey: `mark_template:${focusTemplate!.id}:date:2026-05-22:kind:weekly`,
          proofNote: "keep existing note",
          proofMediaAssetIds: [],
        });

        const services = {
          repositories: harness.repos,
          user: { id: "user_1", timezone: "UTC" },
          markEngine: createMarkEngine(harness.repos),
          packCheckEngine: createPackCheckEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
        };

        await materializeRuntimeForDate(services as never, "2026-05-22", "2026-05-22T08:10:00.000Z");

        const reconciled = await harness.repos.marks.getMarkInstanceById(stale.id);
        const visibleMarks = await services.markEngine.listVisibleMarksForDay("user_1", "2026-05-22");

        assert.equal(reconciled?.title, "Legacy focus title");
        assert.equal(reconciled?.scheduledStartAt, "2026-05-22T08:30:00.000");
        assert.equal(reconciled?.scheduledEndAt, "2026-05-22T09:00:00.000");
        assert.equal(reconciled?.status, MarkInstanceStatus.Skipped);
        assert.equal(reconciled?.proofNote, "keep existing note");
        assert.equal(reconciled?.milestoneId ?? null, null);
        assert.equal(visibleMarks.some((mark) => mark.id === stale.id), false);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import fixture creates 53 marks without duplicates or stray titles",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const first = await importApprovedWeeklyTimetable(harness);
        const second = await importApprovedWeeklyTimetable(harness);
        assert.equal(first.items.length, 53);
        assert.equal(second.items.length, 53);

        const marksByDate = await listMarksByDateMap(harness, "user_1", Object.keys(WEEKLY_TIMETABLE_EXPECTED_COUNTS));
        const total = Object.values(marksByDate).reduce((sum, items) => sum + items.length, 0);
        assert.equal(total, 53);

        for (const [date, expected] of Object.entries(WEEKLY_TIMETABLE_EXPECTED_COUNTS)) {
          assert.equal(marksByDate[date]?.length, expected, `Unexpected mark count for ${date}`);
        }

        const allMarks = Object.values(marksByDate).flat();
        const careerPath = await getPathByTitle(harness, "user_1", "Career");
        assert.equal(allMarks.filter((mark) => mark.title === "Viết Testcase — PHT GNQT Luồng KHTC").length, 1);
        assert.equal(allMarks.some((mark) => /iphone|waymark lite|lite iphone/i.test(mark.title)), false);
        assert.equal(
          (marksByDate["2026-06-06"] ?? []).some(
            (mark) => mark.pathId === careerPath?.id && /waymark|execute|dữ liệu kỷ niệm/i.test(mark.title),
          ),
          false,
        );
        assert.equal(
          allMarks.filter((mark) => /health engine/i.test(mark.title)).length,
          0,
        );
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import 2026-06-22 creates body start mark signals and pack check signals without duplicates",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);

        const services = {
          repositories: harness.repos,
          signalEngine: createSignalEngine(harness.repos),
        };
        const first = await importWeeklyTimetable20260622To0628(services, "user_1", "UTC");
        const second = await importWeeklyTimetable20260622To0628(services, "user_1", "UTC");

        assert.equal(first.items.length, 49);
        assert.equal(first.results.length, 49);
        assert.equal(first.packChecks.length, 24);
        assert.equal(first.signals.length, 31);
        assert.equal(second.packChecks.length, 24);
        assert.equal(second.signals.length, 31);
        assert.equal(new Set(second.signals.map((signal) => signal.id)).size, 31);
        assert.equal(second.signals.filter((signal) => signal.targetType === SignalTargetType.MarkInstance).length, 7);
        assert.equal(second.signals.filter((signal) => signal.targetType === SignalTargetType.PackCheckInstance).length, 24);

        const scheduled = await harness.repos.signals.listSignalsByStatus([SignalStatus.Scheduled], { limit: 100 });
        assert.equal(scheduled.items.length, 31);
        assert.equal(new Set(scheduled.items.map((signal) => signal.targetId)).size, 31);

        const scheduledAt = new Set(scheduled.items.map((signal) => signal.scheduledAt));
        assert.equal(scheduledAt.has("2026-06-26T21:45:00.000Z"), true);
        assert.equal(scheduledAt.has("2026-06-27T06:30:00.000Z"), true);
        assert.equal(scheduledAt.has("2026-06-28T08:00:00.000Z"), true);
        assert.equal(scheduledAt.has("2026-06-28T21:45:00.000Z"), true);

        const bodyStartTargets = await Promise.all(
          scheduled.items
            .filter((signal) => signal.targetType === SignalTargetType.MarkInstance && signal.scheduledAt.endsWith("T05:30:00.000Z"))
            .map(async (signal) => {
              const mark = await harness.repos.marks.getMarkInstanceById(signal.targetId);
              return mark?.title;
            }),
        );
        assert.deepEqual(bodyStartTargets.sort(), [
          "Di chuyển / chuẩn bị giải Golf Diễn Lâm",
          "Workout Day A",
          "Workout Day A",
          "Workout Day B",
          "Workout Day B",
          "Workout Day A nhẹ / phục hồi",
          "Workout Walk",
        ].sort());

        const packTitles = await Promise.all(
          scheduled.items.filter((signal) => signal.targetType === SignalTargetType.PackCheckInstance).map(async (signal) => {
            const packCheck = await harness.repos.packChecks.getInstanceById(signal.targetId);
            return packCheck?.title;
          }),
        );
        assert.equal(packTitles.includes("Travel Tour Readiness Check"), true);
        assert.equal(packTitles.includes("Golf Outing Readiness Check"), true);
        assert.equal(packTitles.includes("Weekend Hanoi Check"), true);
        assert.equal(packTitles.includes("Pilgrimage Readiness Check"), true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import 2026-06-29 creates structure, no-due marks, and signals without duplicates",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);

        const services = {
          repositories: harness.repos,
          signalEngine: createSignalEngine(harness.repos),
        };
        const first = await importWeeklyTimetable20260629To0705(services, "user_1", "UTC");
        const second = await importWeeklyTimetable20260629To0705(services, "user_1", "UTC");

        assert.equal(first.expeditions.length, 2);
        assert.equal(first.milestones.length, 2);
        assert.equal(first.items.length, 56);
        assert.equal(first.results.length, 56);
        assert.equal(first.packChecks.length, 23);
        assert.equal(first.signals.length, 31);
        assert.equal(second.packChecks.length, 23);
        assert.equal(second.signals.length, 31);
        assert.equal(new Set(second.signals.map((signal) => signal.id)).size, 31);

        const dch = first.expeditions.find((expedition) => expedition.title === "DCH Deposit Core Hub");
        const baCore = first.expeditions.find((expedition) => expedition.title === "Transfer kiến thức BA lên Core");
        assert.equal(dch?.targetDate, "2026-12-30");
        assert.equal(baCore?.targetDate, "2026-12-30");
        assert.equal(first.milestones.find((milestone) => milestone.title === "DCH Sprint 0")?.targetDate, "2026-07-12");
        assert.equal(first.milestones.find((milestone) => milestone.title === "Quy trình BA và RSD")?.targetDate, "2026-07-12");

        const marksByDate = await listMarksByDateMap(harness, "user_1", [
          "2026-06-29",
          "2026-06-30",
          "2026-07-01",
          "2026-07-02",
          "2026-07-03",
          "2026-07-04",
          "2026-07-05",
        ]);
        const allMarks = Object.values(marksByDate).flat();
        assert.equal(allMarks.length, 56);
        assert.equal(allMarks.every((mark) => mark.origin === MarkInstanceOrigin.WeeklyPlanned), true);
        assert.equal(allMarks.every((mark) => mark.dueAt === undefined), true);
        assert.equal(allMarks.some((mark) => mark.title === "Thắp hương ngày rằm"), true);
        assert.equal(allMarks.some((mark) => mark.title === "DCH — Luồng giao dịch rút tiền sub account; luồng giao dịch chuyển tiền nội bộ sub account"), true);
        assert.equal(allMarks.some((mark) => mark.title === "EPGA support — đưa đón / theo dõi buổi học"), true);
        assert.equal(allMarks.some((mark) => mark.title === "Thi đấu 9 hố ở EPGA — tiếp tục / support"), true);

        const scheduled = await harness.repos.signals.listSignalsByStatus([SignalStatus.Scheduled], { limit: 100 });
        assert.equal(scheduled.items.length, 31);
        assert.equal(scheduled.items.filter((signal) => signal.targetType === SignalTargetType.MarkInstance).length, 8);
        assert.equal(scheduled.items.filter((signal) => signal.targetType === SignalTargetType.PackCheckInstance).length, 23);
        assert.equal(new Set(scheduled.items.map((signal) => signal.targetId)).size, 31);

        const scheduledAt = new Set(scheduled.items.map((signal) => signal.scheduledAt));
        assert.equal(scheduledAt.has("2026-07-01T07:00:00.000Z"), true);
        assert.equal(scheduledAt.has("2026-07-04T13:00:00.000Z"), true);
        assert.equal(scheduledAt.has("2026-07-05T13:30:00.000Z"), false);

        const packTitles = await Promise.all(
          scheduled.items.filter((signal) => signal.targetType === SignalTargetType.PackCheckInstance).map(async (signal) => {
            const packCheck = await harness.repos.packChecks.getInstanceById(signal.targetId);
            return packCheck?.title;
          }),
        );
        assert.equal(packTitles.includes("Pilgrimage Readiness Check"), true);
        assert.equal(packTitles.includes("Golf Outing Readiness Check"), true);
        assert.equal(packTitles.includes("Before Leaving Home Check"), true);
        assert.equal(packTitles.includes("Home Shutdown Check"), true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import 2026-07-06 creates updated Waymark afternoon blocks and full-screen alarm signals",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);

        const services = {
          repositories: harness.repos,
          signalEngine: createSignalEngine(harness.repos),
        };
        const first = await importWeeklyTimetable20260706To0712(services, "user_1", "UTC");
        const second = await importWeeklyTimetable20260706To0712(services, "user_1", "UTC");

        assert.equal(first.expeditions.length, 2);
        assert.equal(first.milestones.length, 5);
        assert.equal(first.items.length, 56);
        assert.equal(first.results.length, 56);
        assert.equal(first.signals.length, 51);
        assert.equal(second.signals.length, 51);
        assert.equal(new Set(second.signals.map((signal) => signal.id)).size, 51);

        const marksByDate = await listMarksByDateMap(harness, "user_1", [
          "2026-07-06",
          "2026-07-07",
          "2026-07-08",
          "2026-07-09",
          "2026-07-10",
          "2026-07-11",
          "2026-07-12",
        ]);
        const allMarks = Object.values(marksByDate).flat();
        assert.equal(allMarks.length, 56);
        assert.equal(allMarks.every((mark) => mark.origin === MarkInstanceOrigin.WeeklyPlanned), true);
        assert.equal(allMarks.every((mark) => mark.dueAt === undefined), true);
        assert.equal(allMarks.some((mark) => mark.title === "Waymark — Tích hợp Google Drive"), true);
        assert.equal(allMarks.some((mark) => mark.title === "Waymark — Tích hợp Turso"), true);
        assert.equal((marksByDate["2026-07-09"] ?? []).some((mark) => mark.title === "Waymark — Tích hợp Google Drive" && mark.scheduledStartAt === "2026-07-09T13:30:00.000"), true);
        assert.equal((marksByDate["2026-07-10"] ?? []).some((mark) => mark.title === "Waymark — Tích hợp Turso" && mark.scheduledStartAt === "2026-07-10T13:30:00.000"), true);

        const scheduled = await harness.repos.signals.listSignalsByStatus([SignalStatus.Scheduled], { limit: 100 });
        assert.equal(scheduled.items.length, 51);
        assert.equal(scheduled.items.filter((signal) => signal.targetType === SignalTargetType.MarkInstance).length, 44);
        assert.equal(scheduled.items.filter((signal) => signal.targetType === SignalTargetType.TrailDay).length, 7);
        assert.equal(new Set(scheduled.items.map((signal) => signal.targetId)).size, 51);

        const scheduledAt = new Set(scheduled.items.map((signal) => signal.scheduledAt));
        assert.equal(scheduledAt.has("2026-07-06T13:00:00.000Z"), true);
        assert.equal(scheduledAt.has("2026-07-07T13:00:00.000Z"), true);
        assert.equal(scheduledAt.has("2026-07-09T13:00:00.000Z"), true);
        assert.equal(scheduledAt.has("2026-07-10T13:00:00.000Z"), true);
        assert.equal(scheduledAt.has("2026-07-09T15:10:00.000Z"), true);
        assert.equal(scheduledAt.has("2026-07-10T15:10:00.000Z"), true);
        assert.equal(scheduledAt.has("2026-07-12T21:15:00.000Z"), true);

        const signalTargets = await Promise.all(
          scheduled.items.map(async (signal) => {
            if (signal.targetType !== SignalTargetType.MarkInstance) {
              return null;
            }
            const mark = await harness.repos.marks.getMarkInstanceById(signal.targetId);
            return { scheduledAt: signal.scheduledAt, title: mark?.title };
          }),
        );
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-09T13:00:00.000Z" && item.title === "Waymark — Tích hợp Google Drive"), true);
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-10T13:00:00.000Z" && item.title === "Waymark — Tích hợp Turso"), true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import 2026-07-13 creates Mark Signal V3 plan and direct golf mark signals",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);
        const user = await harness.repos.userProfiles.getUserProfileById("user_1");
        assert.ok(user);
        const markEngine = createMarkEngine(harness.repos);
        const strengthProgressionService = createStrengthProgressionService(harness.repos);

        const services = {
          repositories: harness.repos,
          user: user!,
          markEngine,
          packCheckEngine: createPackCheckEngine(harness.repos),
          dependencyEngine: createDefaultDependencyEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
          closeTrailEngine: createCloseTrailEngine(harness.repos),
          strengthProgressionService,
          strengthSessionEngine: createStrengthSessionEngine(harness.repos, strengthProgressionService),
        };
        const first = await importWeeklyTimetable20260713To0719(services, "user_1", "UTC");
        const second = await importWeeklyTimetable20260713To0719(services, "user_1", "UTC");

        assert.equal(first.expeditions.length, 10);
        assert.equal(first.milestones.length, 1);
        assert.equal(first.items.length, 77);
        assert.equal(first.results.length, 77);
        assert.equal(first.packChecks.length, 28);
        assert.equal(first.signals.length, 51);
        assert.equal(second.signals.length, 51);
        assert.equal(new Set(second.signals.map((signal) => signal.id)).size, 51);

        const marksByDate = await listMarksByDateMap(harness, "user_1", [
          "2026-07-13",
          "2026-07-14",
          "2026-07-15",
          "2026-07-16",
          "2026-07-17",
          "2026-07-18",
          "2026-07-19",
        ]);
        const allMarks = Object.values(marksByDate).flat();
        assert.equal(allMarks.length, 77);
        assert.equal(allMarks.every((mark) => mark.origin === MarkInstanceOrigin.WeeklyPlanned), true);
        assert.equal(allMarks.every((mark) => mark.dueAt === undefined), true);
        assert.equal(allMarks.some((mark) => mark.title === "Planning DCH Sprint 7.2"), true);
        assert.equal(allMarks.some((mark) => mark.title === "Xem quy hoạch Hà Nội 100 năm"), true);
        assert.equal(allMarks.some((mark) => mark.title === "Cắt tóc sau lịch EPGA"), true);
        assert.equal(allMarks.filter((mark) => mark.title === "Chuẩn bị bữa sáng cho cả nhà").length, 7);

        assert.equal(allMarks.some((mark) => mark.title === "SNAG Roller Stroke 7h-5h"), true);
        assert.equal(allMarks.some((mark) => mark.title === "SNAG Launcher Chip 8h-4h"), true);
        assert.equal(allMarks.some((mark) => mark.title === "SNAG Launcher Pitch 9h-3h"), true);
        assert.equal(allMarks.some((mark) => mark.title === "SNAG Launcher Full Swing 10h-2h"), true);
        assert.equal(allMarks.some((mark) => mark.title === "SNAG Snapper POP Full Swing"), true);
        assert.equal(allMarks.some((mark) => mark.title === "Putting Ladder Mon 60-180 cm"), true);
        assert.equal(allMarks.some((mark) => mark.title === "Putting Ladder Sun 60-180 cm"), true);

        const saturdayGolfTitles = new Set(["SNAG Launcher Full Swing 10h-2h", "Putting Ladder Sat 60-180 cm"]);
        const sundayGolfTitles = new Set(["SNAG Snapper POP Full Swing", "Putting Ladder Sun 60-180 cm"]);
        const saturdayGolfMarks = (marksByDate["2026-07-18"] ?? []).filter((mark) => saturdayGolfTitles.has(mark.title));
        const sundayGolfMarks = (marksByDate["2026-07-19"] ?? []).filter((mark) => sundayGolfTitles.has(mark.title));
        assert.deepEqual(saturdayGolfMarks.map((mark) => mark.scheduledStartAt?.slice(11, 16)).sort(), ["05:30", "06:00"]);
        assert.deepEqual(sundayGolfMarks.map((mark) => mark.scheduledStartAt?.slice(11, 16)).sort(), ["05:30", "06:00"]);
        assert.equal(saturdayGolfMarks.some((mark) => mark.scheduledStartAt?.slice(11, 16) === "12:00" || mark.scheduledStartAt?.slice(11, 16) === "18:30"), false);
        assert.equal(sundayGolfMarks.some((mark) => mark.scheduledStartAt?.slice(11, 16) === "12:00" || mark.scheduledStartAt?.slice(11, 16) === "18:30"), false);

        const scheduled = await harness.repos.signals.listSignalsByStatus([SignalStatus.Scheduled], { limit: 100 });
        assert.equal(scheduled.items.length, 51);
        assert.equal(scheduled.items.filter((signal) => signal.targetType === SignalTargetType.MarkInstance).length, 23);
        assert.equal(scheduled.items.filter((signal) => signal.targetType === SignalTargetType.PackCheckInstance).length, 28);
        const futureGolfSignal = scheduled.items.find((signal) => signal.scheduledAt === "2026-07-18T05:30:00.000Z");
        assert.ok(futureGolfSignal);
        await harness.repos.signals.updateSignal(futureGolfSignal.id, {
          status: SignalStatus.Resolved,
          resolvedAt: "2026-07-13T12:00:00.000Z",
        });
        await importWeeklyTimetable20260713To0719(services, "user_1", "UTC");
        assert.equal((await harness.repos.signals.getSignalById(futureGolfSignal.id))?.status, SignalStatus.Scheduled);
        assert.equal((await harness.repos.signals.listSignalsByStatus([SignalStatus.Scheduled], { limit: 100 })).items.length, 51);

        const signalTargets = await Promise.all(
          scheduled.items.map(async (signal) => {
            if (signal.targetType !== SignalTargetType.MarkInstance) {
              return null;
            }
            const mark = await harness.repos.marks.getMarkInstanceById(signal.targetId);
            return { scheduledAt: signal.scheduledAt, title: mark?.title, start: mark?.scheduledStartAt };
          }),
        );
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-13T11:30:00.000Z" && item.title === "SNAG Roller Stroke 7h-5h"), true);
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-13T18:00:00.000Z" && item.title === "Putting Ladder Mon 60-180 cm"), true);
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-18T05:30:00.000Z" && item.title === "SNAG Launcher Full Swing 10h-2h"), true);
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-19T06:00:00.000Z" && item.title === "Putting Ladder Sun 60-180 cm"), true);

        const mondayToday = await loadTodayData(services, "en", { now: new Date("2026-07-13T12:15:00.000Z") });
        const swingPractice = mondayToday.marks.find((mark) => mark.title.en === "SNAG Roller Stroke 7h-5h");
        const puttPractice = mondayToday.marks.find((mark) => mark.title.en === "Putting Ladder Mon 60-180 cm");
        assert.ok(swingPractice);
        assert.ok(puttPractice);
        assert.equal(swingPractice?.interactionKind, "golf_practice");
        assert.equal(puttPractice?.interactionKind, "golf_practice");
        assert.equal(swingPractice?.actionSheet?.primaryActionLabel?.en, "Start Practice");
        assert.equal(puttPractice?.actionSheet?.primaryActionLabel?.en, "Start Practice");

        const packTitles = await Promise.all(
          scheduled.items.filter((signal) => signal.targetType === SignalTargetType.PackCheckInstance).map(async (signal) => {
            const packCheck = await harness.repos.packChecks.getInstanceById(signal.targetId);
            return packCheck?.title;
          }),
        );
        assert.equal(packTitles.includes("Daily Grooming Presence Check"), true);
        assert.equal(packTitles.includes("Before Leaving Home Check"), true);
        assert.equal(packTitles.includes("Home Shutdown Check"), true);
        assert.equal(packTitles.includes("Golf Outing Readiness Check"), true);
        assert.equal(packTitles.includes("Golf Practice Pack Check"), false);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import 2026-07-20 applies data-only plan without new hierarchy or duplicate signals",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);

        const countHierarchy = async () => {
          const paths = await harness.repos.paths.listActivePaths("user_1");
          const expeditions = (
            await Promise.all(paths.map((path) => harness.repos.expeditions.listExpeditionsByPath(path.id)))
          ).flatMap((result) => result.items);
          const milestones = (
            await Promise.all(expeditions.map((expedition) => harness.repos.expeditions.listMilestonesByExpedition(expedition.id)))
          ).flat();
          return { paths: paths.length, expeditions: expeditions.length, milestones: milestones.length };
        };

        const hierarchyBefore = await countHierarchy();
        const user = await harness.repos.userProfiles.getUserProfileById("user_1");
        assert.ok(user);
        const markEngine = createMarkEngine(harness.repos);
        const strengthProgressionService = createStrengthProgressionService(harness.repos);
        const services = {
          repositories: harness.repos,
          user: user!,
          markEngine,
          packCheckEngine: createPackCheckEngine(harness.repos),
          dependencyEngine: createDefaultDependencyEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
          closeTrailEngine: createCloseTrailEngine(harness.repos),
          strengthProgressionService,
          strengthSessionEngine: createStrengthSessionEngine(harness.repos, strengthProgressionService),
        };
        const first = await importWeeklyTimetable20260720To0726(services, "user_1", "UTC");
        const familyPath = await getPathByTitle(harness, "user_1", "Family & Home");
        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(familyPath);
        assert.ok(healthPath);
        const legacyTrailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-07-20");
        const legacyMorningFoodMark = await createMark(harness, {
          localDate: "2026-07-20",
          pathId: healthPath!.id,
          trailDayId: legacyTrailDay.id,
          title: "Morning Food Intake — Brainfood baseline",
          origin: MarkInstanceOrigin.WeeklyPlanned,
          status: MarkInstanceStatus.Planned,
          generationKey: "legacy_morning_food_for_cleanup",
        });
        const legacyBreakfastMark = await createMark(harness, {
          localDate: "2026-07-20",
          pathId: familyPath!.id,
          trailDayId: legacyTrailDay.id,
          title: "Chuẩn bị bữa sáng cho cả nhà",
          origin: MarkInstanceOrigin.WeeklyPlanned,
          status: MarkInstanceStatus.Planned,
          generationKey: "legacy_family_breakfast_for_cleanup",
        });
        const saturdayTrailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-07-25");
        const legacySaturdayMorningMark = await createMark(harness, {
          localDate: "2026-07-25",
          pathId: familyPath!.id,
          trailDayId: saturdayTrailDay.id,
          title: "Family activity",
          origin: MarkInstanceOrigin.WeeklyPlanned,
          status: MarkInstanceStatus.Planned,
          generationKey: "legacy_saturday_family_activity_for_cleanup",
        });
        const legacySaturdaySupportMark = await createMark(harness, {
          localDate: "2026-07-25",
          pathId: familyPath!.id,
          trailDayId: saturdayTrailDay.id,
          title: "Family support",
          origin: MarkInstanceOrigin.WeeklyPlanned,
          status: MarkInstanceStatus.Planned,
          generationKey: "legacy_saturday_family_support_for_cleanup",
        });
        const snagPath = await getPathByTitle(harness, "user_1", "SNAG Golf Vietnam");
        assert.ok(snagPath);
        const legacySnagTrailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-07-21");
        const legacyGoogleTagMark = await createMark(harness, {
          localDate: "2026-07-21",
          pathId: snagPath!.id,
          trailDayId: legacySnagTrailDay.id,
          title: "Gắn Google tag website SNAG",
          origin: MarkInstanceOrigin.WeeklyPlanned,
          status: MarkInstanceStatus.Planned,
          generationKey: "legacy_google_tag_for_cleanup",
        });
        const second = await importWeeklyTimetable20260720To0726(services, "user_1", "UTC");
        const hierarchyAfter = await countHierarchy();

        assert.deepEqual(hierarchyAfter, hierarchyBefore);
        assert.equal(first.items.length, 69);
        assert.equal(first.results.length, 69);
        assert.equal(first.packChecks.length, 27);
        assert.equal(first.signals.length, 62);
        assert.equal(second.signals.length, 62);
        assert.equal(new Set(second.signals.map((signal) => signal.id)).size, 62);
        assert.equal(await harness.repos.marks.getMarkInstanceById(legacyMorningFoodMark.id), null);
        assert.equal(await harness.repos.marks.getMarkInstanceById(legacyBreakfastMark.id), null);
        assert.equal(await harness.repos.marks.getMarkInstanceById(legacySaturdayMorningMark.id), null);
        assert.equal(await harness.repos.marks.getMarkInstanceById(legacySaturdaySupportMark.id), null);
        assert.equal(await harness.repos.marks.getMarkInstanceById(legacyGoogleTagMark.id), null);
        assert.equal(first.hierarchyLinks.skipped.some((item) => item.title === "Tạo GA4 cho website SNAG"), true);

        const marksByDate = await listMarksByDateMap(harness, "user_1", [
          "2026-07-20",
          "2026-07-21",
          "2026-07-22",
          "2026-07-23",
          "2026-07-24",
          "2026-07-25",
          "2026-07-26",
        ]);
        const allMarks = Object.values(marksByDate).flat();
        assert.equal(allMarks.length, 69);
        assert.equal(allMarks.every((mark) => mark.origin === MarkInstanceOrigin.WeeklyPlanned), true);
        assert.equal(allMarks.every((mark) => mark.dueAt === undefined), true);
        assert.equal(allMarks.filter((mark) => mark.title === "Weight In").length, 7);
        assert.equal(allMarks.filter((mark) => mark.title === "Morning Food Intake — Brainfood baseline").length, 0);
        assert.equal(allMarks.filter((mark) => mark.title === "Chuẩn bị bữa sáng cho cả nhà").length, 0);
        const postWorkoutRoutineMarks = allMarks.filter((mark) => mark.title === "Post Workout Routine");
        assert.equal(postWorkoutRoutineMarks.length, 5);
        assert.equal(postWorkoutRoutineMarks.every((mark) => mark.scheduledStartAt?.slice(11, 16) === "07:00" && mark.scheduledEndAt?.slice(11, 16) === "07:30"), true);
        assert.equal(postWorkoutRoutineMarks.every((mark) => Boolean(mark.templateId)), true);
        assert.equal(postWorkoutRoutineMarks.every((mark) => mark.description?.includes("Brainfood") && mark.description?.includes("thắp hương")), true);
        const postWorkoutTemplateMetadata = await getMarkTemplateSeedMetadata(harness.repos.appSettings, "user_1", postWorkoutRoutineMarks[0]!.templateId!);
        assert.deepEqual(postWorkoutTemplateMetadata?.executionChecklistItems, [
          "Pha sữa Hikid cho con.",
          "Pha Glucerna cho mẹ.",
          "Brainfood: ăn 1-2 trứng, uống một cốc trà xanh, kiểm tra tỏi cho bữa trưa hoặc tối.",
          "Thắp hương buổi sáng: chuẩn bị bàn thờ gọn gàng, thắp hương và dọn lại đồ dùng.",
        ]);
        const snagContentTitles = new Set([
          "Tạo GA4 cho website SNAG",
          "Cập nhật sự kiện golf tháng 5–7",
          "Lập kế hoạch content đa kênh SNAG",
          "Thiết kế Mark đăng bài định kỳ",
        ]);
        assert.equal(allMarks.filter((mark) => snagContentTitles.has(mark.title)).length, 4);
        assert.equal(allMarks.some((mark) => mark.title === "Gắn Google tag website SNAG"), false);
        assert.equal(allMarks.some((mark) => mark.title === "Cấu hình event GA4 cho SNAG"), false);
        assert.equal(allMarks.some((mark) => mark.title === "Kiểm thử GA4 website SNAG"), false);
        assert.equal(allMarks.some((mark) => mark.title === "Cập nhật sự kiện golf tháng 5–7" && mark.description?.includes("lập backlog bài viết")), true);
        assert.equal(allMarks.some((mark) => mark.title === "Lập kế hoạch content đa kênh SNAG" && mark.description?.includes("ma trận chủ đề")), true);
        assert.equal(allMarks.some((mark) => mark.title === "Thiết kế Mark đăng bài định kỳ" && mark.description?.includes("lịch Mark định kỳ")), true);
        assert.equal(allMarks.filter((mark) => mark.title.includes("thu chi GL")).length, 3);
        assert.equal(allMarks.some((mark) => mark.title === "Viết RSD chi tiền mặt DCH"), true);
        assert.equal(allMarks.some((mark) => mark.title === "Viết test SIT QLSD Thẻ"), true);
        assert.equal(allMarks.some((mark) => mark.title === "Hoàn thiện Backup/Restore Turso"), true);
        assert.equal(allMarks.some((mark) => mark.title === "Hoàn thiện edit hierarchy Turso" && mark.scheduledStartAt === "2026-07-24T08:00:00.000"), true);
        assert.equal(allMarks.some((mark) => mark.title === "Hoàn thiện Weekly Planning Turso"), true);
        assert.equal(allMarks.some((mark) => mark.title === "Waymark Planning"), true);
        assert.equal((marksByDate["2026-07-26"] ?? []).some((mark) => mark.pathId && mark.title.includes("RSD")), false);
        const characterPath = await getPathByTitle(harness, "user_1", "Stoicism & Character");
        assert.ok(characterPath);
        const saturdayMarks = marksByDate["2026-07-25"] ?? [];
        const sundayMarks = marksByDate["2026-07-26"] ?? [];
        const hospitalCareMarks = [...saturdayMarks, ...sundayMarks].filter((mark) => mark.title === "Trông bố trong viện");
        assert.equal(hospitalCareMarks.length, 6);
        assert.equal(hospitalCareMarks.every((mark) => mark.pathId === characterPath!.id), true);
        assert.equal(hospitalCareMarks.every((mark) => mark.expeditionId === undefined && mark.milestoneId === undefined), true);
        assert.equal(hospitalCareMarks.every((mark) => mark.description?.includes("lau vùng hạ bộ") && mark.description?.includes("thay bỉm")), true);
        assert.deepEqual(
          hospitalCareMarks.map((mark) => `${mark.scheduledStartAt?.slice(0, 16)}-${mark.scheduledEndAt?.slice(11, 16)}`).sort(),
          [
            "2026-07-25T07:00-08:30",
            "2026-07-25T11:00-12:00",
            "2026-07-25T18:00-19:00",
            "2026-07-26T07:00-08:30",
            "2026-07-26T11:00-12:00",
            "2026-07-26T18:00-19:00",
          ],
        );
        assert.equal(allMarks.some((mark) => mark.title === "Chơi ở nhà cùng gia đình"), false);
        assert.equal(allMarks.some((mark) => mark.title === "Tham quan Festival Mỹ thuật trẻ tại VCCA"), false);
        assert.equal(allMarks.some((mark) => mark.title === "Chuẩn bị đồ golf EPGA ngày mai"), false);
        assert.equal(allMarks.some((mark) => mark.title === "Mua hoa tặng vợ sáng thứ 7"), false);
        assert.equal(allMarks.some((mark) => mark.title.startsWith("EPGA golf")), false);
        assert.equal(sundayMarks.some((mark) => mark.title === "Chuẩn bị trứng ngâm tương 3 ngày"), true);
        assert.equal(saturdayMarks.some((mark) => mark.title.includes("Chipping 7 m")), true);
        assert.equal(saturdayMarks.some((mark) => mark.title.includes("23 putts")), true);
        assert.equal(allMarks.some((mark) => ["Family activity", "Family support", "Morning Support", "Afternoon Support"].includes(mark.title)), false);

        const chippingMarks = allMarks.filter((mark) => mark.title.includes("Chipping"));
        const puttingMarks = allMarks.filter((mark) => mark.title.includes("23 putts"));
        assert.equal(chippingMarks.length, 7);
        assert.equal(puttingMarks.length, 7);
        assert.equal(chippingMarks.every((mark) => mark.title.startsWith("Chipping") && mark.title.includes("Hit Flagsticky")), true);
        assert.equal(chippingMarks.some((mark) => mark.title.includes("Short Game Practice")), false);
        assert.equal(puttingMarks.every((mark) => mark.title.startsWith("Putt Practice")), true);
        assert.equal(allMarks.some((mark) => mark.title.includes("Chipping 3 m") && mark.title.includes("1.2 m")), true);
        assert.equal(allMarks.some((mark) => mark.title.includes("Chipping 5 m") && mark.title.includes("2.0 m")), true);
        assert.equal(allMarks.some((mark) => mark.title.includes("Chipping 7 m") && mark.title.includes("2.8 m")), true);
        assert.equal(allMarks.some((mark) => mark.title.includes("Chipping 3-5-7 m")), true);
        assert.equal(resolveGolfPracticeWorkoutTypeForMarkTitle(chippingMarks[0]!.title), "putting");
        assert.equal(chippingMarks.filter((mark) => mark.description?.includes("3 sets x 8 reps = 24 chips")).length, 6);
        assert.equal(chippingMarks.filter((mark) => mark.description?.includes("6 sets x 4 reps = 24 chips")).length, 1);
        const threeMeterChippingPlan = buildChippingShortGamePracticePlanForMarkTitle(chippingMarks.find((mark) => mark.title.includes("Chipping 3 m"))!.title);
        assert.equal(threeMeterChippingPlan?.length, 3);
        assert.equal(threeMeterChippingPlan?.reduce((total, set) => total + set.reps, 0), 24);
        assert.deepEqual(threeMeterChippingPlan?.map((set) => set.reps), [8, 8, 8]);
        const chippingTestPlan = buildChippingShortGamePracticePlanForMarkTitle(chippingMarks.find((mark) => mark.title.includes("Chipping 3-5-7 m"))!.title);
        assert.equal(chippingTestPlan?.length, 6);
        assert.equal(chippingTestPlan?.reduce((total, set) => total + set.reps, 0), 24);
        assert.deepEqual(chippingTestPlan?.map((set) => `${set.distanceLabel}:${set.reps}`), ["3 m:4", "5 m:4", "7 m:4", "3 m:4", "5 m:4", "7 m:4"]);

        const scheduled = await harness.repos.signals.listSignalsByStatus([SignalStatus.Scheduled], { limit: 100 });
        assert.equal(scheduled.items.length, 62);
        assert.equal(scheduled.items.filter((signal) => signal.targetType === SignalTargetType.MarkInstance).length, 35);
        assert.equal(scheduled.items.filter((signal) => signal.targetType === SignalTargetType.PackCheckInstance).length, 27);
        assert.equal(new Set(scheduled.items.map((signal) => signal.targetId)).size, 62);

        const signalTargets = await Promise.all(
          scheduled.items.map(async (signal) => {
            if (signal.targetType !== SignalTargetType.MarkInstance) {
              return null;
            }
            const mark = await harness.repos.marks.getMarkInstanceById(signal.targetId);
            return { scheduledAt: signal.scheduledAt, title: mark?.title };
          }),
        );
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-20T05:30:00.000Z" && item.title === "Weight In"), true);
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-20T11:30:00.000Z" && item.title?.includes("Chipping 3 m")), true);
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-24T18:00:00.000Z" && item.title?.includes("23 putts")), true);
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-25T07:00:00.000Z" && item.title === "Mua hoa tặng vợ sáng thứ 7"), false);
        assert.equal(
          signalTargets.filter((item) => item?.title === "Trông bố trong viện").map((item) => item!.scheduledAt).sort().join("|"),
          [
            "2026-07-25T06:45:00.000Z",
            "2026-07-25T10:45:00.000Z",
            "2026-07-25T17:45:00.000Z",
            "2026-07-26T06:45:00.000Z",
            "2026-07-26T10:45:00.000Z",
            "2026-07-26T17:45:00.000Z",
          ].join("|"),
        );

        const terminalCandidate = scheduled.items.find((signal) => signal.scheduledAt === "2026-07-20T11:30:00.000Z");
        assert.ok(terminalCandidate);
        await harness.repos.signals.updateSignal(terminalCandidate!.id, {
          status: SignalStatus.Resolved,
          resolvedAt: "2026-07-20T12:05:00.000Z",
        });
        await importWeeklyTimetable20260720To0726(services, "user_1", "UTC");
        assert.equal((await harness.repos.signals.getSignalById(terminalCandidate!.id))?.status, SignalStatus.Resolved);

        const mondayToday = await loadTodayData(services, "en", { now: new Date("2026-07-20T12:15:00.000Z") });
        const swingPractice = mondayToday.marks.find((mark) => mark.title.en.includes("Chipping 3 m"));
        const puttPractice = mondayToday.marks.find((mark) => mark.title.en.includes("23 putts"));
        const postWorkoutRoutine = mondayToday.marks.find((mark) => mark.title.en === "Post Workout Routine");
        assert.equal(swingPractice?.interactionKind, "golf_practice");
        assert.equal(puttPractice?.interactionKind, "golf_practice");
        assert.equal(postWorkoutRoutine?.actionSheet?.embeddedChecklist?.items.length, 4);
        assert.equal(postWorkoutRoutine?.actionSheet?.embeddedChecklist?.items.some((item) => item.label.includes("Hikid")), true);
        assert.equal(postWorkoutRoutine?.actionSheet?.embeddedChecklist?.items.some((item) => item.label.includes("Brainfood")), true);
        assert.equal(postWorkoutRoutine?.actionSheet?.embeddedChecklist?.items.some((item) => item.label.includes("Thắp hương")), true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekend hospital care patch 2026-07-25 preserves history and creates only direct care signals",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);

        const familyPath = await getPathByTitle(harness, "user_1", "Family & Home");
        const characterPath = await getPathByTitle(harness, "user_1", "Stoicism & Character");
        assert.ok(familyPath);
        assert.ok(characterPath);
        const saturdayTrailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-07-25");
        const pristineFlower = await createMark(harness, {
          localDate: "2026-07-25",
          pathId: familyPath!.id,
          trailDayId: saturdayTrailDay.id,
          title: "Mua hoa tặng vợ sáng thứ 7",
          origin: MarkInstanceOrigin.WeeklyPlanned,
          status: MarkInstanceStatus.Planned,
          generationKey: "legacy_saturday_flower_for_hospital_patch",
        });
        const completedVcca = await createMark(harness, {
          localDate: "2026-07-25",
          pathId: familyPath!.id,
          trailDayId: saturdayTrailDay.id,
          title: "Tham quan Festival Mỹ thuật trẻ tại VCCA",
          origin: MarkInstanceOrigin.WeeklyPlanned,
          status: MarkInstanceStatus.Completed,
          generationKey: "legacy_vcca_completed_for_hospital_patch",
        });

        const services = {
          repositories: harness.repos,
          signalEngine: createSignalEngine(harness.repos),
        };
        const first = await importWeekendHospitalCarePatch20260725To0726(services, "user_1", "UTC");
        const second = await importWeekendHospitalCarePatch20260725To0726(services, "user_1", "UTC");

        assert.equal(first.items.length, 13);
        assert.equal(first.results.length, 13);
        assert.equal(first.signals.length, 6);
        assert.equal(second.signals.length, 6);
        assert.equal(first.cleanup.removedMarkIds.includes(pristineFlower.id), true);
        assert.equal(first.cleanup.skipped.some((item) => item.title === completedVcca.title), true);
        assert.equal(await harness.repos.marks.getMarkInstanceById(pristineFlower.id), null);
        assert.equal((await harness.repos.marks.getMarkInstanceById(completedVcca.id))?.status, MarkInstanceStatus.Completed);

        const marksByDate = await listMarksByDateMap(harness, "user_1", ["2026-07-25", "2026-07-26"]);
        const allMarks = Object.values(marksByDate).flat();
        const careMarks = allMarks.filter((mark) => mark.title === "Trông bố trong viện");
        assert.equal(careMarks.length, 6);
        assert.equal(careMarks.every((mark) => mark.pathId === characterPath!.id), true);
        assert.equal(allMarks.filter((mark) => mark.title === "Weight In").length, 2);
        assert.equal(allMarks.filter((mark) => mark.title.includes("Chipping")).length, 2);
        assert.equal(allMarks.filter((mark) => mark.title.includes("23 putts")).length, 2);
        assert.equal(allMarks.some((mark) => mark.title === "Chuẩn bị trứng ngâm tương 3 ngày"), true);

        const scheduled = await harness.repos.signals.listSignalsByStatus([SignalStatus.Scheduled], { limit: 100 });
        assert.equal(scheduled.items.length, 6);
        assert.equal(scheduled.items.every((signal) => signal.targetType === SignalTargetType.MarkInstance), true);
        const targetTitles = await Promise.all(
          scheduled.items.map(async (signal) => (await harness.repos.marks.getMarkInstanceById(signal.targetId))?.title),
        );
        assert.equal(targetTitles.every((title) => title === "Trông bố trong viện"), true);
        assert.deepEqual(
          scheduled.items.map((signal) => signal.scheduledAt).sort(),
          [
            "2026-07-25T06:45:00.000Z",
            "2026-07-25T10:45:00.000Z",
            "2026-07-25T17:45:00.000Z",
            "2026-07-26T06:45:00.000Z",
            "2026-07-26T10:45:00.000Z",
            "2026-07-26T17:45:00.000Z",
          ],
        );
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import 2026-07-27 creates the V7 data-only week, weekend events, and direct signals",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);

        const services = {
          repositories: harness.repos,
          signalEngine: createSignalEngine(harness.repos),
        };
        const first = await importWeeklyTimetable20260727To0802(services, "user_1", "UTC");
        const second = await importWeeklyTimetable20260727To0802(services, "user_1", "UTC");

        assert.equal(first.items.length, 74);
        assert.equal(first.results.length, 74);
        assert.equal(first.packChecks.length, 28);
        assert.equal(first.signals.length, 58);
        assert.equal(second.signals.length, 58);
        assert.equal(new Set(second.signals.map((signal) => signal.id)).size, 58);

        const marksByDate = await listMarksByDateMap(harness, "user_1", [
          "2026-07-27",
          "2026-07-28",
          "2026-07-29",
          "2026-07-30",
          "2026-07-31",
          "2026-08-01",
          "2026-08-02",
        ]);
        const allMarks = Object.values(marksByDate).flat();
        assert.equal(allMarks.length, 74);
        assert.equal(allMarks.every((mark) => mark.origin === MarkInstanceOrigin.WeeklyPlanned), true);
        assert.equal(allMarks.every((mark) => mark.dueAt === undefined), true);
        assert.equal(allMarks.filter((mark) => mark.title === "Weight In").length, 7);
        assert.equal(allMarks.filter((mark) => mark.title === "Post Workout Routine").length, 7);
        assert.equal(allMarks.filter((mark) => mark.title.includes("Chipping")).length, 7);
        assert.equal(allMarks.filter((mark) => mark.title.includes("23 putts")).length, 7);
        assert.equal(allMarks.filter((mark) => mark.title.startsWith("Viết RSD")).length, 7);
        assert.equal(allMarks.filter((mark) => mark.title.startsWith("Book ")).length, 2);

        const snagTitles = new Set([
          "Brainstorm pipeline tăng view website",
          "Tạo prompt mark đăng bài hàng tuần",
          "Viết bài website SNAG #1",
          "Viết bài website SNAG #2",
          "Viết bài website SNAG #3",
        ]);
        assert.equal(allMarks.filter((mark) => snagTitles.has(mark.title)).length, 5);
        assert.equal(allMarks.some((mark) => mark.title === "Waymark Planning" && mark.description?.includes("chu kỳ xuất bản nội dung")), true);

        const saturdayMarks = marksByDate["2026-08-01"] ?? [];
        const saturdayLeague = saturdayMarks.filter((mark) => mark.title === "SNAG Golf League");
        const saturdayDriving = saturdayMarks.filter((mark) => mark.title === "Lái xe cùng con tại phố đi bộ");
        assert.equal(saturdayLeague.length, 1);
        assert.equal(saturdayLeague[0]?.scheduledStartAt, "2026-08-01T08:00:00.000");
        assert.equal(saturdayLeague[0]?.scheduledEndAt, "2026-08-01T11:30:00.000");
        assert.equal(saturdayDriving.length, 1);
        assert.equal(saturdayDriving[0]?.scheduledStartAt, "2026-08-01T13:30:00.000");
        assert.equal(saturdayDriving[0]?.scheduledEndAt, "2026-08-01T16:45:00.000");
        assert.equal(saturdayMarks.some((mark) => mark.title === "Chọn ảnh và kể lại trải nghiệm ngày"), true);
        assert.equal(saturdayMarks.some((mark) => mark.title === "Mua hoa tặng vợ sáng thứ 7" && mark.scheduledStartAt === "2026-08-01T07:30:00.000"), true);

        const sundayMarks = marksByDate["2026-08-02"] ?? [];
        assert.equal(sundayMarks.filter((mark) => mark.title.startsWith("EPGA golf")).length, 2);
        assert.equal(sundayMarks.some((mark) => mark.title === "Nghỉ và sắp đồ cho tuần mới"), true);
        assert.equal(sundayMarks.some((mark) => mark.title === "Chuẩn bị bài Thứ 2"), true);

        const chippingMarks = allMarks.filter((mark) => mark.title.includes("Chipping"));
        const puttingMarks = allMarks.filter((mark) => mark.title.includes("23 putts"));
        assert.equal(chippingMarks.every((mark) => mark.title.startsWith("Chipping") && mark.title.includes("Hit Flagsticky")), true);
        assert.equal(chippingMarks.some((mark) => mark.title.includes("Short Game Practice")), false);
        const chippingTestPlan = buildChippingShortGamePracticePlanForMarkTitle(chippingMarks.find((mark) => mark.title.includes("Chipping 3-5-7 m"))!.title);
        assert.equal(chippingTestPlan?.reduce((total, set) => total + set.reps, 0), 24);
        assert.deepEqual(chippingTestPlan?.map((set) => `${set.distanceLabel}:${set.reps}`), ["3 m:4", "5 m:4", "7 m:4", "3 m:4", "5 m:4", "7 m:4"]);
        const puttingPlan = buildPuttingShortGamePracticePlanForMarkTitle(puttingMarks[0]!.title);
        assert.equal(puttingPlan?.reduce((total, set) => total + set.reps, 0), 23);
        assert.deepEqual(puttingPlan?.map((set) => `${set.distanceLabel}:${set.reps}`), ["60 cm:3", "90 cm:1", "120 cm:2", "150 cm:2", "180 cm:15"]);

        const golfPath = await getPathByTitle(harness, "user_1", "Golf Craft");
        assert.ok(golfPath);
        const golfRoutines = await harness.repos.strength.listRoutinesByPath(golfPath!.id);
        const routineRepsByTitle = async (title: string) => {
          const routine = golfRoutines.find((item) => item.title === title && item.routineType === WorkoutRoutineType.GolfPractice && item.isActive);
          assert.ok(routine, `Missing routine ${title}`);
          return (await harness.repos.strength.listRoutineExercises(routine!.id))
            .filter((exercise) => exercise.orderIndex >= 6)
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((exercise) => exercise.targetReps);
        };
        assert.deepEqual(await routineRepsByTitle("Golf Practice Putting 23 Putts"), [3, 1, 2, 2, 15]);
        assert.deepEqual(await routineRepsByTitle("Golf Practice Chipping 3 m"), [8, 8, 8]);
        assert.deepEqual(await routineRepsByTitle("Golf Practice Chipping 5 m"), [8, 8, 8]);
        assert.deepEqual(await routineRepsByTitle("Golf Practice Chipping 7 m"), [8, 8, 8]);
        assert.deepEqual(await routineRepsByTitle("Golf Practice Chipping 3-5-7 m"), [4, 4, 4, 4, 4, 4]);

        const scheduled = await harness.repos.signals.listSignalsByStatus([SignalStatus.Scheduled], { limit: 100 });
        assert.equal(scheduled.items.length, 58);
        assert.equal(scheduled.items.filter((signal) => signal.targetType === SignalTargetType.MarkInstance).length, 30);
        assert.equal(scheduled.items.filter((signal) => signal.targetType === SignalTargetType.PackCheckInstance).length, 28);
        assert.equal(new Set(scheduled.items.map((signal) => signal.targetId)).size, 58);

        const signalTargets = await Promise.all(
          scheduled.items.map(async (signal) => {
            if (signal.targetType !== SignalTargetType.MarkInstance) {
              return null;
            }
            const mark = await harness.repos.marks.getMarkInstanceById(signal.targetId);
            return { scheduledAt: signal.scheduledAt, title: mark?.title };
          }),
        );
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-27T05:30:00.000Z" && item.title === "Weight In"), true);
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-27T11:30:00.000Z" && item.title?.includes("Chipping 3 m")), true);
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-07-31T18:00:00.000Z" && item.title?.includes("23 putts")), true);
        assert.equal(signalTargets.some((item) => item?.scheduledAt === "2026-08-01T07:30:00.000Z" && item.title === "Mua hoa tặng vợ sáng thứ 7"), true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import 2026-08-03 creates routed workout, golf, course, and EPGA marks without duplicates",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);

        const user = await harness.repos.userProfiles.getUserProfileById("user_1");
        assert.ok(user);
        const services = {
          repositories: harness.repos,
          user: user!,
          markEngine: createMarkEngine(harness.repos),
          packCheckEngine: createPackCheckEngine(harness.repos),
          dependencyEngine: createDefaultDependencyEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
          closeTrailEngine: createCloseTrailEngine(harness.repos),
          strengthProgressionService: createStrengthProgressionService(harness.repos),
          strengthSessionEngine: createStrengthSessionEngine(
            harness.repos,
            createStrengthProgressionService(harness.repos),
          ),
        };
        const first = await importWeeklyTimetable20260803To0809(services, "user_1", "UTC");
        const second = await importWeeklyTimetable20260803To0809(services, "user_1", "UTC");

        assert.equal(first.items.length, 85);
        assert.equal(first.results.length, 85);
        assert.equal(first.packChecks.length, 28);
        assert.equal(first.signals.length, 58);
        assert.equal(second.items.length, 85);
        assert.equal(second.results.length, 85);
        assert.equal(second.signals.length, 58);
        assert.equal(new Set(second.signals.map((signal) => signal.id)).size, 58);

        const marksByDate = await listMarksByDateMap(harness, "user_1", [
          "2026-08-03",
          "2026-08-04",
          "2026-08-05",
          "2026-08-06",
          "2026-08-07",
          "2026-08-08",
          "2026-08-09",
        ]);
        const allMarks = Object.values(marksByDate).flat();
        assert.equal(allMarks.length, 85);
        assert.equal(allMarks.every((mark) => mark.origin === MarkInstanceOrigin.WeeklyPlanned), true);
        assert.equal(allMarks.every((mark) => mark.dueAt === undefined), true);
        assert.equal(allMarks.filter((mark) => mark.title === "Weight In").length, 7);
        assert.equal(allMarks.filter((mark) => mark.title === "Post Workout Routine").length, 7);
        assert.equal(allMarks.filter((mark) => mark.title.startsWith("Học AI n8n")).length, 16);
        assert.equal(allMarks.filter((mark) => mark.title === "Supervising + Daily DCH + tổng hợp n8n").length, 4);
        assert.equal(allMarks.filter((mark) => mark.title.includes("Chipping")).length, 7);
        assert.equal(allMarks.filter((mark) => mark.title.includes("23 putts")).length, 7);
        assert.equal(allMarks.filter((mark) => mark.title.startsWith("EPGA golf")).length, 4);
        assert.equal(allMarks.some((mark) => mark.title === "Waymark Planning" && mark.scheduledStartAt === "2026-08-07T21:00:00.000"), true);

        const focusTitles = new Set([
          "Test biểu mẫu QLSD Thẻ",
          "Hoàn thiện slide Sub Account LNH",
          "Planning SCH và rà checklist golive",
          "Supervising BIDV + Daily DCH",
          "Thiết kế báo cáo và đối soát DCH",
          "Supervising + Daily DCH + tổng hợp n8n",
        ]);
        const ninetyMinuteMarks = allMarks.filter((mark) => focusTitles.has(mark.title) || mark.title.startsWith("Học AI n8n"));
        assert.equal(ninetyMinuteMarks.length, 25);
        assert.equal(ninetyMinuteMarks.every((mark) => {
          assert.ok(mark.scheduledStartAt);
          assert.ok(mark.scheduledEndAt);
          return new Date(mark.scheduledEndAt!).getTime() - new Date(mark.scheduledStartAt!).getTime() === 90 * 60 * 1000;
        }), true);

        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);
        const workoutTemplateTitles = await Promise.all(
          ["Workout A1", "Workout B", "Workout Walk", "Workout A2"].map(async (title) => {
            const mark = allMarks.find((item) => item.pathId === healthPath!.id && item.title === title);
            assert.ok(mark, `Missing ${title}`);
            assert.ok(mark!.templateId, `${title} should keep templateId for Strength Session routing`);
            const template = await harness.repos.marks.getMarkTemplateById(mark!.templateId!);
            const metadata = await getMarkTemplateSeedMetadata(harness.repos.appSettings, "user_1", mark!.templateId!);
            assert.equal(metadata?.blockType, "workout_block");
            return template?.title;
          }),
        );
        assert.deepEqual(workoutTemplateTitles, ["Workout A1", "Workout B", "Workout Walk", "Workout A2"]);

        const chippingMarks = allMarks.filter((mark) => mark.title.includes("Chipping"));
        assert.equal(chippingMarks.some((mark) => mark.title.includes("Chipping 3-5-7 m")), false);
        for (const mark of chippingMarks) {
          const plan = buildChippingShortGamePracticePlanForMarkTitle(mark.title);
          assert.equal(plan?.reduce((total, set) => total + set.reps, 0), 24);
          assert.equal(plan?.length, 3);
          assert.equal(resolveGolfPracticeWorkoutTypeForMarkTitle(mark.title), "putting");
        }
        assert.deepEqual(
          chippingMarks.map((mark) => mark.title.match(/Chipping ([357]) m/)?.[1]).filter(Boolean),
          ["3", "3", "5", "5", "7", "7", "3"],
        );

        const puttingMarks = allMarks.filter((mark) => mark.title.includes("23 putts"));
        for (const mark of puttingMarks) {
          const plan = buildPuttingShortGamePracticePlanForMarkTitle(mark.title);
          assert.equal(plan?.reduce((total, set) => total + set.reps, 0), 23);
          assert.deepEqual(plan?.map((set) => `${set.distanceLabel}:${set.reps}`), ["60 cm:3", "90 cm:1", "120 cm:2", "150 cm:2", "180 cm:15"]);
          assert.equal(resolveGolfPracticeWorkoutTypeForMarkTitle(mark.title), "putting");
        }

        const saturdayMarks = marksByDate["2026-08-08"] ?? [];
        assert.equal(saturdayMarks.some((mark) => mark.title === "Chơi ở nhà, chuẩn bị đi VCCA"), true);
        assert.equal(saturdayMarks.some((mark) => mark.title === "Tham quan Festival Mỹ thuật Trẻ tại VCCA"), true);
        assert.equal(saturdayMarks.some((mark) => mark.title === "Mua hoa tặng vợ" && mark.scheduledStartAt === "2026-08-08T07:30:00.000"), true);
        const sundayMarks = marksByDate["2026-08-09"] ?? [];
        assert.equal(sundayMarks.filter((mark) => mark.title.startsWith("EPGA golf")).length, 4);
        assert.equal(sundayMarks.every((mark) => !mark.title.startsWith("EPGA golf") || resolveGolfPracticeWorkoutTypeForMarkTitle(mark.title) === null), true);

        const scheduled = await harness.repos.signals.listSignalsByStatus([SignalStatus.Scheduled], { limit: 100 });
        assert.equal(scheduled.items.length, 58);
        assert.equal(scheduled.items.filter((signal) => signal.targetType === SignalTargetType.MarkInstance).length, 30);
        assert.equal(scheduled.items.filter((signal) => signal.targetType === SignalTargetType.PackCheckInstance).length, 28);

        const mondayToday = await loadTodayData(services, "en", { now: new Date("2026-08-03T12:15:00.000Z") });
        const workoutA1 = mondayToday.marks.find((mark) => mark.title.en === "Workout A1");
        const chipping = mondayToday.marks.find((mark) => mark.title.en.includes("Chipping 3 m"));
        const putting = mondayToday.marks.find((mark) => mark.title.en.includes("23 putts"));
        assert.equal(workoutA1?.interactionKind, "strength_session");
        assert.equal(workoutA1?.actionSheet?.primaryActionLabel?.en, "Start Workout");
        assert.equal(chipping?.interactionKind, "golf_practice");
        assert.equal(chipping?.actionSheet?.primaryActionLabel?.en, "Start Practice");
        assert.equal(putting?.interactionKind, "golf_practice");
        assert.equal(putting?.actionSheet?.primaryActionLabel?.en, "Start Practice");

        const sundayToday = await loadTodayData(services, "en", { now: new Date("2026-08-09T08:30:00.000Z") });
        const epga = sundayToday.marks.find((mark) => mark.title.en === "EPGA golf — buổi sáng 1");
        assert.ok(epga);
        assert.equal(epga?.interactionKind, "default");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Breakfast-only import 2026-07-13 skips existing same-day breakfast marks",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const familyPath = await getPathByTitle(harness, "user_1", "Family & Home");
        assert.ok(familyPath);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-07-13");
        await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: familyPath!.id,
          trailDayId: trailDay.id,
          title: "Chuẩn bị bữa sáng cho cả nhà",
          description: "Existing manual breakfast mark",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Planned,
          scheduledStartAt: "2026-07-13T07:00:00.000",
          scheduledEndAt: "2026-07-13T07:20:00.000",
          proofMediaAssetIds: [],
        });

        const first = await importBreakfastMarks20260713To0719(harness.repos, "user_1");
        const second = await importBreakfastMarks20260713To0719(harness.repos, "user_1");

        assert.equal(first.totalRequested, 7);
        assert.equal(first.created.length, 6);
        assert.equal(first.skippedExisting.length, 1);
        assert.equal(second.created.length, 0);
        assert.equal(second.skippedExisting.length, 7);

        const marksByDate = await listMarksByDateMap(harness, "user_1", [
          "2026-07-13",
          "2026-07-14",
          "2026-07-15",
          "2026-07-16",
          "2026-07-17",
          "2026-07-18",
          "2026-07-19",
        ]);
        const breakfastMarks = Object.values(marksByDate)
          .flat()
          .filter((mark) => mark.title === "Chuẩn bị bữa sáng cho cả nhà");
        assert.equal(breakfastMarks.length, 7);
        assert.equal(breakfastMarks.filter((mark) => mark.origin === MarkInstanceOrigin.ManualPlan).length, 1);
        assert.equal(breakfastMarks.filter((mark) => mark.origin === MarkInstanceOrigin.WeeklyPlanned).length, 6);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable patch 2026-07-02 2026-07-03 2026-07-05 updates only target days and preserves other days",
    run: async () => {
      const harness = await createHarness();
      try {
        await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
        });
        await bootstrapFullConfig(harness);

        const services = {
          repositories: harness.repos,
          signalEngine: createSignalEngine(harness.repos),
        };
        await importWeeklyTimetable20260629To0705(services, "user_1", "UTC");

        const before = await listMarksByDateMap(harness, "user_1", [
          "2026-06-29",
          "2026-06-30",
          "2026-07-01",
          "2026-07-02",
          "2026-07-03",
          "2026-07-04",
          "2026-07-05",
        ]);
        const untouchedBeforeCounts = {
          "2026-06-29": before["2026-06-29"]?.length ?? 0,
          "2026-06-30": before["2026-06-30"]?.length ?? 0,
          "2026-07-01": before["2026-07-01"]?.length ?? 0,
          "2026-07-04": before["2026-07-04"]?.length ?? 0,
        };
        const staleMorningMark = before["2026-07-02"]?.find((mark) => mark.scheduledStartAt?.slice(11, 16) === "08:00");
        assert.ok(staleMorningMark);
        await harness.repos.marks.updateMarkInstance(staleMorningMark.id, {
          title: "Core BA Transfer — Tạo slide đề xuất quy trình BA và RSD",
        });

        const patch = await importWeeklyTimetable202607020305Patch(services, "user_1");
        assert.equal(patch.items.length, 21);
        assert.equal(patch.results.length, 21);
        assert.equal(patch.removedMarkIds.length, 3);
        assert.equal(patch.removedWeekPlanItemIds.length, 3);

        const after = await listMarksByDateMap(harness, "user_1", [
          "2026-06-29",
          "2026-06-30",
          "2026-07-01",
          "2026-07-02",
          "2026-07-03",
          "2026-07-04",
          "2026-07-05",
        ]);
        assert.equal(after["2026-06-29"]?.length, untouchedBeforeCounts["2026-06-29"]);
        assert.equal(after["2026-06-30"]?.length, untouchedBeforeCounts["2026-06-30"]);
        assert.equal(after["2026-07-01"]?.length, untouchedBeforeCounts["2026-07-01"]);
        assert.equal(after["2026-07-04"]?.length, untouchedBeforeCounts["2026-07-04"]);

        const targetMarks = [...(after["2026-07-02"] ?? []), ...(after["2026-07-03"] ?? []), ...(after["2026-07-05"] ?? [])];
        assert.equal(targetMarks.some((mark) => mark.title === "Morning Food Intake — Brainfood baseline"), false);
        assert.equal(targetMarks.some((mark) => mark.title === "DCH — Đề xuất cơ chế quản lý dự án, lấy story done trong tuần, công việc Scrum Master, masterplan DCH"), true);
        assert.equal(targetMarks.some((mark) => mark.title === "Core BA Transfer — Tạo slide đề xuất quy trình BA và RSD"), false);
        assert.equal(targetMarks.some((mark) => mark.title === "Chỉnh sửa / xin ý kiến / transfer luồng sequence sub account"), true);
        assert.equal(targetMarks.some((mark) => mark.title === "Thi đấu 9 hố ở EPGA — tiếp tục / support"), true);
        assert.equal(targetMarks.every((mark) => mark.dueAt === undefined), true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Sample weekly timetable import 2026-06-01 to 2026-06-07 creates 45 weekly planned marks without duplicates",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const report = await importSampleWeeklyTimetable20260601To0607(harness.repos, "user_1");
        assert.equal(report.items.length, 45);
        assert.equal(report.results.length, 45);

        const marksByDate = await listMarksByDateMap(
          harness,
          "user_1",
          Object.keys(SAMPLE_WEEKLY_TIMETABLE_2026_06_01_TO_06_07_COUNTS),
        );
        const total = Object.values(marksByDate).reduce((sum, items) => sum + items.length, 0);
        assert.equal(total, 45);

        for (const [date, expected] of Object.entries(SAMPLE_WEEKLY_TIMETABLE_2026_06_01_TO_06_07_COUNTS)) {
          assert.equal(marksByDate[date]?.length, expected, `Unexpected mark count for ${date}`);
        }

        const allMarks = Object.values(marksByDate).flat();
        assert.equal(allMarks.every((mark) => mark.origin === MarkInstanceOrigin.WeeklyPlanned), true);
        assert.equal(report.items.every((item) => typeof item.createdMarkInstanceId === "string" && item.createdMarkInstanceId.length > 0), true);

        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
          closeTrailPromptTime: "21:30",
        });
        const todayData = await loadTodayData(
          {
            repositories: harness.repos,
            user,
            markEngine: createMarkEngine(harness.repos),
            packCheckEngine: createPackCheckEngine(harness.repos),
            dependencyEngine: createDefaultDependencyEngine(harness.repos),
            signalEngine: createSignalEngine(harness.repos),
            closeTrailEngine: createCloseTrailEngine(harness.repos),
            strengthProgressionService: createStrengthProgressionService(harness.repos),
            strengthSessionEngine: createStrengthSessionEngine(
              harness.repos,
              createStrengthProgressionService(harness.repos),
            ),
          },
          "en",
          { now: new Date("2026-06-01T09:00:00.000Z") },
        );
        const workoutDayA = todayData.marks.find((mark) => mark.title.en === "Workout Day A");
        assert.ok(workoutDayA);
        assert.equal(workoutDayA?.summary, undefined);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import strips exact generated provenance from imported mark detail storage and hides empty detail cards",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const report = await importWeeklyTimetable(harness.repos, {
          userId: "user_1",
          weekStartDate: "2026-06-01",
          weekEndDate: "2026-06-07",
          importBatchId: "weekly_import_exact_provenance_cleanup",
          items: [
            {
              localDate: "2026-06-01",
              startTime: "05:30",
              endTime: "07:00",
              title: "Workout Day A",
              pathId: "path_mpuywm4t_l3n1hknd",
              pathRef: "Health & Body",
              blockKey: "workout",
              expeditionId: "expedition_mpuywmbi_sli3qt9g",
              expeditionRef: "Cut to 70",
              milestoneId: "milestone_mpuywpcw_gruw2rjv",
              milestoneRef: "Reach 76kg",
              note: "Imported from cleaned 2026-06-01 to 2026-06-07 weekly timetable.",
            },
          ],
        });

        assert.equal(report.items.length, 1);
        assert.equal(report.results[0]?.finalStatus, MarkInstanceStatus.Planned);
        assert.equal(report.items[0]?.note, undefined);
        assert.equal(
          sanitizeImportedWeeklyPlannedStorageText("Imported from cleaned 2026-06-01 to 2026-06-07 weekly timetable."),
          undefined,
        );
        assert.equal(
          sanitizeImportedWeeklyPlannedStorageText("Imported from cleaned 2026-06-01 to 2026-06-07 weekly timetable. Keep blockers here."),
          "Imported from cleaned 2026-06-01 to 2026-06-07 weekly timetable. Keep blockers here.",
        );

        const dayMarks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-06-01");
        const imported = dayMarks.find((mark) => mark.title === "Workout Day A");
        assert.ok(imported);
        assert.equal(imported?.description, undefined);

        const user = await harness.repos.userProfiles.getOrCreateLocalUserProfile({
          userId: "user_1",
          locale: "en-US",
          timezone: "UTC",
          weekStartsOn: 1,
          closeTrailPromptTime: "21:30",
        });
        const todayData = await loadTodayData(
          {
            repositories: harness.repos,
            user,
            markEngine: createMarkEngine(harness.repos),
            packCheckEngine: createPackCheckEngine(harness.repos),
            dependencyEngine: createDefaultDependencyEngine(harness.repos),
            signalEngine: createSignalEngine(harness.repos),
            closeTrailEngine: createCloseTrailEngine(harness.repos),
            strengthProgressionService: createStrengthProgressionService(harness.repos),
            strengthSessionEngine: createStrengthSessionEngine(
              harness.repos,
              createStrengthProgressionService(harness.repos),
            ),
          },
          "en",
          { now: new Date("2026-06-01T09:00:00.000Z") },
        );
        const todayMark = todayData.marks.find((mark) => mark.title.en === "Workout Day A");
        assert.ok(todayMark);
        assert.equal(todayMark?.summary, undefined);
        assert.equal(todayMark?.actionSheet?.intentionText, undefined);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import workout marks resolve Day A Day B and Walk routines",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        await importApprovedWeeklyTimetable(harness);
        const sessionEngine = createStrengthSessionEngine(harness.repos);
        const marks = Object.values(
          await listMarksByDateMap(harness, "user_1", ["2026-06-01", "2026-06-02", "2026-06-03"]),
        ).flat();
        const dayA = marks.find((mark) => mark.title === "Workout Day A");
        const dayB = marks.find((mark) => mark.title === "Workout Day B");
        const walk = marks.find((mark) => mark.title === "Workout Walk");
        assert.ok(dayA);
        assert.ok(dayB);
        assert.ok(walk);

        const legacyDayARoutine = await createWorkoutRoutine(harness, {
          id: "legacy_day_a_strength_routine",
          pathId: dayA!.pathId,
          title: "Day A Strength",
          routineType: WorkoutRoutineType.Strength,
        });
        const legacyExerciseDefinitions = await Promise.all(
          ["Barbell Squat", "Standing Barbell Military Press", "Barbell Bench Press", "Pallof Press", "Plank"].map((title, index) =>
            createExerciseDefinition(harness, {
              id: `legacy_day_a_exercise_${index}`,
              pathId: dayA!.pathId,
              title,
              canonicalSlug: `legacy-day-a-${index}`,
              category: ExerciseCategory.Strength,
              targetType: index === 4 ? ExerciseTargetType.Timed : ExerciseTargetType.RepsLoad,
            }),
          ),
        );
        const legacySession = await harness.repos.strength.upsertSession({
          id: "legacy_day_a_session_for_imported_mark",
          userId: "user_1",
          markInstanceId: dayA!.id,
          routineTemplateId: legacyDayARoutine.id,
          status: WorkoutSessionStatus.Active,
          phase: WorkoutSessionPhase.Strength,
          createdAt: "2026-06-01T05:30:00.000Z",
          updatedAt: "2026-06-01T05:30:00.000Z",
        });
        await harness.repos.strength.upsertSessionSnapshots(
          legacyExerciseDefinitions.map((definition, index) => ({
            id: `legacy_day_a_snapshot_${index}`,
            workoutSessionInstanceId: legacySession.id,
            exerciseDefinitionId: definition.id,
            exerciseNameSnapshot: definition.title,
            phase: WorkoutExercisePhase.Strength,
            orderIndex: index,
            targetType: index === 4 ? ExerciseTargetType.Timed : ExerciseTargetType.RepsLoad,
            targetLoadKg: index === 4 ? undefined : 10,
            targetReps: index === 4 ? undefined : 5,
            targetSets: index === 4 ? 1 : 2,
            targetDurationSec: index === 4 ? 50 : undefined,
            wasOverridden: false,
            status: SessionExerciseStatus.NotStarted,
            createdAt: "2026-06-01T05:30:00.000Z",
            updatedAt: "2026-06-01T05:30:00.000Z",
          })),
        );
        await harness.repos.strength.upsertSession({
          ...legacySession,
          status: WorkoutSessionStatus.ExerciseActive,
          currentExerciseSnapshotId: "legacy_day_a_snapshot_0",
          currentSetNumber: 1,
        });

        const dayASession = await sessionEngine.startWorkoutSession({ markInstanceId: dayA!.id });
        assert.equal(dayASession.id, legacySession.id);
        const dayARoutine = await harness.repos.strength.getRoutineById(dayASession.routineTemplateId);
        assert.equal(dayARoutine?.title, "Day A1 Strength");
        const dayASnapshots = await harness.repos.strength.listSessionSnapshots(dayASession.id);
        assert.deepEqual(
          dayASnapshots
            .filter((snapshot) => snapshot.phase === WorkoutExercisePhase.Strength)
            .map((snapshot) => snapshot.exerciseNameSnapshot),
          ["Barbell Squat", "Barbell Bench Press", "Pallof Press", "Plank"],
        );

        const dayBSession = await sessionEngine.startWorkoutSession({ markInstanceId: dayB!.id });
        const dayBRoutine = await harness.repos.strength.getRoutineById(dayBSession.routineTemplateId);
        assert.equal(dayBRoutine?.title, "Day B Strength");

        const walkSession = await sessionEngine.startWorkoutSession({ markInstanceId: walk!.id });
        const walkRoutine = await harness.repos.strength.getRoutineById(walkSession.routineTemplateId);
        assert.equal(walkRoutine?.routineType, WorkoutRoutineType.Walk);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import protects completed and user-edited marks on rerun",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        await importApprovedWeeklyTimetable(harness);

        const dayOneMarks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-06-01");
        const completed = dayOneMarks.find((mark) => mark.title === "Execute Testcase — PHT GNQT Luồng KHCN thẻ phụ");
        const edited = dayOneMarks.find((mark) => mark.title === "Cập nhật và Ký duyệt RSD biểu mẫu");
        assert.ok(completed);
        assert.ok(edited);

        await harness.repos.marks.updateMarkInstance(completed!.id, {
          status: MarkInstanceStatus.Completed,
          completedAt: "2026-06-01T09:29:00.000Z",
          proofNote: "Completed before rerun",
        });
        await harness.repos.marks.updateMarkInstance(edited!.id, {
          title: "User tuned RSD title",
        });

        const rerun = await importApprovedWeeklyTimetable(harness);
        assert.equal(rerun.counts.protected >= 2, true);

        const completedAfter = await harness.repos.marks.getMarkInstanceById(completed!.id);
        const editedAfter = await harness.repos.marks.getMarkInstanceById(edited!.id);
        assert.equal(completedAfter?.status, MarkInstanceStatus.Completed);
        assert.equal(completedAfter?.proofNote, "Completed before rerun");
        assert.equal(editedAfter?.title, "User tuned RSD title");
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable rerun leaves protected weekly planned mark hierarchy links untouched",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        await importSampleWeeklyTimetable20260601To0607(harness.repos, "user_1");

        const initialMarks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-06-01");
        const imported = initialMarks.find((mark) => mark.title === "Workout Day A");
        assert.ok(imported?.milestoneId);
        assert.ok(imported?.expeditionId);

        await harness.repos.marks.updateMarkInstance(imported!.id, {
          title: "User tuned workout title",
          status: MarkInstanceStatus.Completed,
          completedAt: "2026-06-01T06:55:00.000Z",
          milestoneId: null,
          expeditionId: null,
        });

        await importSampleWeeklyTimetable20260601To0607(harness.repos, "user_1");

        const protectedAfter = await harness.repos.marks.getMarkInstanceById(imported!.id);
        assert.equal(protectedAfter?.title, "User tuned workout title");
        assert.equal(protectedAfter?.status, MarkInstanceStatus.Completed);
        assert.equal(protectedAfter?.milestoneId, undefined);
        assert.equal(protectedAfter?.expeditionId, undefined);

        const milestoneMarks = await harness.repos.marks.listMarkInstancesByMilestone(imported!.milestoneId!);
        assert.equal(milestoneMarks.some((mark) => mark.id === imported!.id), false);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Expedition detail repair restores milestone-linked weekly planned marks for Cut to 70 and updates summary counts",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        await importSampleWeeklyTimetable20260601To0607(harness.repos, "user_1");

        const healthPath = await getPathByTitle(harness, "user_1", "Health & Body");
        assert.ok(healthPath);
        const cutTo70 = (await harness.repos.expeditions.listExpeditionsByPath(healthPath!.id)).items.find(
          (expedition) => expedition.title === "Cut to 70",
        );
        assert.ok(cutTo70);

        const items = await harness.repos.weekPlans.listItemsByExpedition("user_1", cutTo70!.id);
        const workoutItems = items.filter((item) => item.title?.startsWith("Workout "));
        assert.equal(workoutItems.length, 7);

        await harness.repos.weekPlans.upsertItems(
          workoutItems.map((item) => ({
            ...item,
            milestoneId: undefined,
          })),
        );

        for (const item of workoutItems) {
          assert.ok(item.createdMarkInstanceId);
          await harness.repos.marks.updateMarkInstance(item.createdMarkInstanceId!, {
            milestoneId: null,
          });
        }

        const milestonesBefore = await harness.repos.expeditions.listMilestonesByExpedition(cutTo70!.id);
        const marksByMilestoneBefore = new Map(
          await Promise.all(
            milestonesBefore.map(async (milestone) => [milestone.id, await harness.repos.marks.listMarkInstancesByMilestone(milestone.id)] as const),
          ),
        );
        const beforeDetail = buildExpeditionDetailModel(cutTo70!, healthPath!, milestonesBefore, marksByMilestoneBefore, "en");
        assert.equal(beforeDetail.expedition.totalMilestones, 7);
        assert.equal(beforeDetail.expedition.totalMarks, 0);
        assert.equal(beforeDetail.milestones[0]?.totalMarks, 0);

        const repair = await repairWeeklyTimetableMilestoneLinksForExpedition(harness.repos, "user_1", cutTo70!.id);
        assert.equal(repair.repairedItemIds.length, 7);
        assert.equal(repair.repairedMarkIds.length, 7);

        const milestonesAfter = await harness.repos.expeditions.listMilestonesByExpedition(cutTo70!.id);
        const marksByMilestoneAfter = new Map(
          await Promise.all(
            milestonesAfter.map(async (milestone) => [milestone.id, await harness.repos.marks.listMarkInstancesByMilestone(milestone.id)] as const),
          ),
        );
        const afterDetail = buildExpeditionDetailModel(cutTo70!, healthPath!, milestonesAfter, marksByMilestoneAfter, "en");
        assert.equal(afterDetail.expedition.totalMilestones, 7);
        assert.equal(afterDetail.expedition.totalMarks, 7);
        assert.equal(afterDetail.milestones[0]?.title, "Reach 76kg");
        assert.equal(afterDetail.milestones[0]?.totalMarks, 7);
        assert.equal(afterDetail.milestones[0]?.plannedMarks.length, 7);
        assert.equal(afterDetail.milestones[1]?.totalMarks, 0);
        assert.equal(afterDetail.milestones[1]?.plannedMarks.length, 0);

        const firstWorkoutMark = afterDetail.milestones[0]?.plannedMarks[0];
        assert.ok(firstWorkoutMark);
        await harness.repos.marks.updateMarkInstance(firstWorkoutMark!.id, {
          status: MarkInstanceStatus.Completed,
          completedAt: "2026-06-01T07:00:00.000Z",
        });

        const marksByMilestoneCompleted = new Map(
          await Promise.all(
            milestonesAfter.map(async (milestone) => [milestone.id, await harness.repos.marks.listMarkInstancesByMilestone(milestone.id)] as const),
          ),
        );
        const completedDetail = buildExpeditionDetailModel(cutTo70!, healthPath!, milestonesAfter, marksByMilestoneCompleted, "en");
        assert.equal(completedDetail.expedition.completedMarks, 1);
        assert.equal(completedDetail.expedition.totalMarks, 7);
        assert.equal(completedDetail.milestones[0]?.completedMarks, 1);
        assert.equal(completedDetail.milestones[0]?.totalMarks, 7);

        const familyPath = await getPathByTitle(harness, "user_1", "Family & Home");
        assert.ok(familyPath);
        const familyTrailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-01");
        await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: familyPath!.id,
          trailDayId: familyTrailDay.id,
          title: "Unrelated family mark",
          origin: MarkInstanceOrigin.WeeklyPlanned,
          status: MarkInstanceStatus.Completed,
          scheduledStartAt: "2026-06-01T20:00:00.000",
          scheduledEndAt: "2026-06-01T21:00:00.000",
          dueAt: "2026-06-01T21:00:00.000",
          proofMediaAssetIds: [],
        });

        const marksByMilestoneUnrelated = new Map(
          await Promise.all(
            milestonesAfter.map(async (milestone) => [milestone.id, await harness.repos.marks.listMarkInstancesByMilestone(milestone.id)] as const),
          ),
        );
        const unrelatedDetail = buildExpeditionDetailModel(cutTo70!, healthPath!, milestonesAfter, marksByMilestoneUnrelated, "en");
        assert.equal(unrelatedDetail.expedition.totalMarks, 7);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import reports conflict for same slot different existing mark",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const careerPath = await getPathByTitle(harness, "user_1", "Career");
        assert.ok(careerPath);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-01");
        await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: careerPath!.id,
          trailDayId: trailDay.id,
          title: "Manual slot conflict",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Planned,
          scheduledStartAt: "2026-06-01T08:00:00.000",
          scheduledEndAt: "2026-06-01T09:30:00.000",
          proofMediaAssetIds: [],
        });

        const conflictReport = await importWeeklyTimetable(harness.repos, {
          userId: "user_1",
          weekStartDate: "2026-06-01",
          weekEndDate: "2026-06-07",
          items: [
            {
              localDate: "2026-06-01",
              startTime: "08:00",
              endTime: "09:30",
              title: "Execute Testcase — PHT GNQT Luồng KHCN thẻ phụ",
              pathRef: "Career",
              blockKey: "morning_activity",
            },
          ],
        });

        assert.equal(conflictReport.counts.conflict, 1);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Weekly timetable import allows moved weekly planned carry-over mark in same slot",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const careerPath = await getPathByTitle(harness, "user_1", "Career");
        assert.ok(careerPath);
        const trailDay = await harness.repos.trailDays.getOrCreateTrailDay("user_1", "2026-06-01");
        await harness.repos.marks.createMarkInstance({
          userId: "user_1",
          pathId: careerPath!.id,
          trailDayId: trailDay.id,
          title: "Moved carry-over mark",
          origin: MarkInstanceOrigin.WeeklyPlanned,
          status: MarkInstanceStatus.Planned,
          scheduledStartAt: "2026-06-01T08:00:00.000",
          scheduledEndAt: "2026-06-01T09:30:00.000",
          proofMediaAssetIds: [],
        });

        const report = await importWeeklyTimetable(harness.repos, {
          userId: "user_1",
          weekStartDate: "2026-06-01",
          weekEndDate: "2026-06-07",
          items: [
            {
              localDate: "2026-06-01",
              startTime: "08:00",
              endTime: "09:30",
              title: "Execute Testcase — PHT GNQT Luồng KHCN thẻ phụ",
              pathRef: "Career",
              blockKey: "morning_activity",
            },
          ],
        });

        assert.equal(report.counts.created, 1);
        assert.equal(report.counts.conflict, 0);
        const dayMarks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-06-01");
        assert.equal(dayMarks.some((mark) => mark.title === "Moved carry-over mark"), true);
        assert.equal(dayMarks.some((mark) => mark.title === "Execute Testcase — PHT GNQT Luồng KHCN thẻ phụ"), true);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Runtime reload does not create additional planned marks when runtime generation flag is off",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        await importApprovedWeeklyTimetable(harness);
        await harness.repos.appSettings.setSetting("user_1", RUNTIME_AUTO_GENERATE_PLANNED_MARKS_KEY, false);

        const services = {
          repositories: harness.repos,
          user: { id: "user_1", timezone: "UTC" },
          markEngine: createMarkEngine(harness.repos),
          packCheckEngine: createPackCheckEngine(harness.repos),
          signalEngine: createSignalEngine(harness.repos),
        };

        const before = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-06-01");
        await materializeRuntimeForDate(services as never, "2026-06-01", "2026-06-01T08:05:00.000Z");
        await materializeRuntimeForDate(services as never, "2026-06-01", "2026-06-01T08:15:00.000Z");
        const after = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-06-01");
        assert.equal(after.length, before.length);
      } finally {
        harness.close();
      }
    },
  },
  {
    name: "Stoicism and Character imports the pilgrimage pack without creating a separate daily task",
    run: async () => {
      const harness = await createHarness();
      try {
        await bootstrapFullConfig(harness);
        const characterPath = await getPathByTitle(harness, "user_1", "Stoicism & Character");
        assert.ok(characterPath);
        const markTemplates = await harness.repos.marks.listActiveMarkTemplatesByPath(characterPath!.id);
        const packCheckTemplates = await harness.repos.packChecks.listTemplatesByPath(characterPath!.id);
        const expeditions = (await harness.repos.expeditions.listExpeditionsByPath(characterPath!.id)).items;
        assert.equal(markTemplates.length, 0);
        assert.equal(packCheckTemplates.length, 1);
        assert.equal(packCheckTemplates[0]!.title, "Pilgrimage Readiness Check");
        assert.equal(expeditions.length, 0);
      } finally {
        harness.close();
      }
    },
  },
];

async function main() {
  let passed = 0;

  for (const testCase of tests) {
    try {
      await testCase.run();
      passed += 1;
      console.log(`PASS ${testCase.name}`);
    } catch (error) {
      console.error(`FAIL ${testCase.name}`);
      console.error(error);
      process.exitCode = 1;
      break;
    }
  }

  if (process.exitCode !== 1) {
    console.log(`Repository slice tests passed: ${passed}/${tests.length}`);
  }
}

void main();

