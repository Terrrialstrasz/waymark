import type { BacklogItem, Expedition, MarkTemplate, Milestone, PackCheckTemplate, Path, WaymarkRepositories, WorkoutRoutineTemplate } from "../domain/waymark";
import {
  BacklogItemStatus,
  ExerciseCategory,
  ExerciseTargetType,
  PathStatus,
  SignalTargetType,
  WorkoutExercisePhase,
  WorkoutRoutineType,
} from "../domain/waymark";
import {
  type AnchorPathRotationRule,
  type CloseTrailRuleConfig,
  type DailyMarkAssignment,
  type MarkTemplateSeedMetadata,
  setAnchorPathRotationRule,
  setCloseTrailRuleConfig,
  setDailyMarkAssignment,
  setMarkTemplateSeedMetadata,
  setPackCheckSurfacePolicy,
  setSignalConfig,
} from "../lib/waymark";
import type {
  SeedAnchorPathRotationConfig,
  SeedBacklogItemConfig,
  SeedCloseTrailRuleConfig,
  SeedDailyMarkAssignmentConfig,
  SeedEntityType,
  SeedExpeditionConfig,
  SeedMarkTemplateConfig,
  SeedMilestoneConfig,
  SeedPackCheckTemplateConfig,
  SeedPathConfig,
  SeedRecord,
  SeedSignalConfig,
  SeedWorkoutRoutineConfig,
  SeedDisciplineDefinition,
  WaymarkMapConfig,
} from "./types";
import {
  buildSeedRecord,
  findSeedRecordBySource,
  listSeedRecords,
  markSeedRecordDeprecated,
  saveSeedRecord,
} from "./seedRegistry";
import { canSeedEntity, type SeedPolicyOptions } from "./seedClassification";

type BootstrapContext = {
  repositories: WaymarkRepositories;
  userId: string;
};

type SeedMaps = {
  pathIds: Map<string, string>;
  expeditionIds: Map<string, string>;
  milestoneIds: Map<string, string>;
  markTemplateIds: Map<string, string>;
  packCheckTemplateIds: Map<string, string>;
  backlogItemIds: Map<string, string>;
  workoutRoutineIds: Map<string, string>;
};

type MutableEntity = Path | Expedition | Milestone | MarkTemplate | PackCheckTemplate | BacklogItem | WorkoutRoutineTemplate;

export type BootstrapResult = {
  mapVersion: number;
  created: string[];
  updated: string[];
  deprecated: string[];
  untouched: string[];
};

export type AuthoritativeWorkoutRoutineRepairResult = {
  repaired: {
    sourceSeedId: string;
    routineId: string;
    exerciseCount: number;
  }[];
};

export const GOLF_AUTHORITATIVE_WORKOUT_ROUTINE_REPAIR_SEED_IDS = [
  "golf_practice_putting_routine",
  "golf_practice_chipping_3m_routine",
  "golf_practice_chipping_5m_routine",
  "golf_practice_chipping_7m_routine",
  "golf_practice_chipping_3_5_7m_routine",
] as const;

export async function repairAuthoritativeWorkoutRoutines(
  context: BootstrapContext,
  config: WaymarkMapConfig,
  sourceSeedIds: readonly string[] = DEFAULT_AUTHORITATIVE_WORKOUT_ROUTINE_REPAIR_SEED_IDS,
): Promise<AuthoritativeWorkoutRoutineRepairResult> {
  const selectedSeedIds = new Set(sourceSeedIds);
  const selectedConfigs = (config.workoutRoutines ?? []).filter((routine) => selectedSeedIds.has(routine.sourceSeedId));

  return context.repositories.transaction.runInTransaction(async (repositories) => {
    const repairContext: BootstrapContext = {
      repositories,
      userId: context.userId,
    };
    const maps: SeedMaps = {
      pathIds: new Map(),
      expeditionIds: new Map(),
      milestoneIds: new Map(),
      markTemplateIds: new Map(),
      packCheckTemplateIds: new Map(),
      backlogItemIds: new Map(),
      workoutRoutineIds: new Map(),
    };

    for (const routineConfig of selectedConfigs) {
      const pathRecord = await findSeedRecordBySource(
        repositories.appSettings,
        context.userId,
        "path",
        routineConfig.pathSeedId,
      );
      if (!pathRecord) {
        throw new Error(`Missing seeded path ${routineConfig.pathSeedId} required to repair ${routineConfig.sourceSeedId}.`);
      }
      maps.pathIds.set(routineConfig.pathSeedId, pathRecord.entityId);

      if (routineConfig.markTemplateSeedId) {
        const markTemplateRecord = await findSeedRecordBySource(
          repositories.appSettings,
          context.userId,
          "mark_template",
          routineConfig.markTemplateSeedId,
        );
        if (!markTemplateRecord) {
          throw new Error(
            `Missing seeded mark template ${routineConfig.markTemplateSeedId} required to repair ${routineConfig.sourceSeedId}.`,
          );
        }
        maps.markTemplateIds.set(routineConfig.markTemplateSeedId, markTemplateRecord.entityId);
      }
    }

    const now = new Date().toISOString();
    const repaired: AuthoritativeWorkoutRoutineRepairResult["repaired"] = [];
    for (const routineConfig of selectedConfigs) {
      const existingRecord = await findSeedRecordBySource(
        repositories.appSettings,
        context.userId,
        "workout_routine",
        routineConfig.sourceSeedId,
      );
      const routineId = existingRecord?.entityId ?? deterministicId("workout_routine", routineConfig.sourceSeedId);
      const existing = await repositories.strength.getRoutineById(routineId);
      const pathId = requireResolvedId(maps.pathIds, "path", routineConfig.pathSeedId);
      const markTemplateId =
        routineConfig.markTemplateSeedId ?
          requireResolvedId(maps.markTemplateIds, "mark_template", routineConfig.markTemplateSeedId)
        : undefined;

      await rebuildSeedWorkoutRoutine(
        repairContext,
        maps,
        routineConfig,
        config.version,
        now,
        existingRecord,
        existing,
        routineId,
        pathId,
        markTemplateId,
      );
      repaired.push({
        sourceSeedId: routineConfig.sourceSeedId,
        routineId,
        exerciseCount: routineConfig.exercises.length,
      });
    }

    return { repaired };
  });
}

export async function bootstrapWaymarkMap(
  context: BootstrapContext,
  config: WaymarkMapConfig,
  seedPolicy: SeedPolicyOptions = {},
): Promise<BootstrapResult> {
  const now = new Date().toISOString();
  const created: string[] = [];
  const updated: string[] = [];
  const deprecated: string[] = [];
  const untouched: string[] = [];
  const seenSeedKeys = new Set<string>();
  const maps: SeedMaps = {
    pathIds: new Map(),
    expeditionIds: new Map(),
    milestoneIds: new Map(),
    markTemplateIds: new Map(),
    packCheckTemplateIds: new Map(),
    backlogItemIds: new Map(),
    workoutRoutineIds: new Map(),
  };

  await context.repositories.appSettings.setSetting(context.userId, "waymark.bootstrap.version", {
    mapVersion: config.version,
    bootstrappedAt: now,
  });

  for (const pathConfig of config.paths ?? []) {
    const key = seedKey("path", pathConfig.sourceSeedId);
    seenSeedKeys.add(key);
    const outcome = await upsertSeedPath(context, maps, pathConfig, config.version, now);
    collectOutcome(key, outcome, created, updated, untouched);
  }

  for (const expeditionConfig of config.expeditions ?? []) {
    const key = seedKey("expedition", expeditionConfig.sourceSeedId);
    seenSeedKeys.add(key);
    const outcome = await upsertSeedExpedition(context, maps, expeditionConfig, config.version, now);
    collectOutcome(key, outcome, created, updated, untouched);
  }

  for (const milestoneConfig of config.milestones ?? []) {
    const key = seedKey("milestone", milestoneConfig.sourceSeedId);
    seenSeedKeys.add(key);
    const outcome = await upsertSeedMilestone(context, maps, milestoneConfig, config.version, now);
    collectOutcome(key, outcome, created, updated, untouched);
  }

  for (const templateConfig of config.markTemplates ?? []) {
    const key = seedKey("mark_template", templateConfig.sourceSeedId);
    seenSeedKeys.add(key);
    const outcome = await upsertSeedMarkTemplate(context, maps, templateConfig, config.version, now);
    collectOutcome(key, outcome, created, updated, untouched);
  }

  for (const assignmentConfig of config.dailyMarkAssignments ?? []) {
    const key = seedKey("daily_mark_assignment", assignmentConfig.sourceSeedId);
    seenSeedKeys.add(key);
    if (!canSeedEntity("daily_mark_assignment", seedPolicy)) {
      collectOutcome(key, "untouched", created, updated, untouched);
      continue;
    }
    const outcome = await upsertDailyMarkAssignment(context, maps, assignmentConfig, config.version, now);
    collectOutcome(key, outcome, created, updated, untouched);
  }

  for (const packCheckTemplateConfig of config.packCheckTemplates ?? []) {
    const key = seedKey("pack_check_template", packCheckTemplateConfig.sourceSeedId);
    seenSeedKeys.add(key);
    const outcome = await upsertSeedPackCheckTemplate(context, maps, packCheckTemplateConfig, config.version, now);
    collectOutcome(key, outcome, created, updated, untouched);
  }

  for (const routineConfig of config.workoutRoutines ?? []) {
    const key = seedKey("workout_routine", routineConfig.sourceSeedId);
    seenSeedKeys.add(key);
    const outcome = await upsertSeedWorkoutRoutine(context, maps, routineConfig, config.version, now);
    collectOutcome(key, outcome, created, updated, untouched);
  }

  for (const backlogConfig of config.backlogItems ?? []) {
    const key = seedKey("backlog_item", backlogConfig.sourceSeedId);
    seenSeedKeys.add(key);
    if (!canSeedEntity("backlog_item", seedPolicy)) {
      collectOutcome(key, "untouched", created, updated, untouched);
      continue;
    }
    const outcome = await upsertSeedBacklogItem(context, maps, backlogConfig, config.version, now);
    collectOutcome(key, outcome, created, updated, untouched);
  }

  for (const signalConfig of config.signalConfigs ?? []) {
    const key = seedKey("signal_config", signalConfig.sourceSeedId);
    seenSeedKeys.add(key);
    const outcome = await upsertSeedSignalConfig(context, maps, signalConfig, config.version, now);
    collectOutcome(key, outcome, created, updated, untouched);
  }

  for (const closeTrailRule of config.closeTrailRules ?? []) {
    const key = seedKey("close_trail_rule", closeTrailRule.sourceSeedId);
    seenSeedKeys.add(key);
    const outcome = await upsertCloseTrailRuleConfig(context, maps, closeTrailRule, config.version, now);
    collectOutcome(key, outcome, created, updated, untouched);
  }

  for (const anchorRotation of config.anchorPathRotations ?? []) {
    const key = seedKey("anchor_path_rotation", anchorRotation.sourceSeedId);
    seenSeedKeys.add(key);
    const outcome = await upsertAnchorPathRotation(context, maps, anchorRotation, config.version, now);
    collectOutcome(key, outcome, created, updated, untouched);
  }

  const existingSeedRecords = await listSeedRecords(context.repositories.appSettings, context.userId);
  for (const record of existingSeedRecords) {
    const key = seedKey(record.entityType, record.sourceSeedId);
    if (seenSeedKeys.has(key) || record.ownership === "deprecated_seed") {
      continue;
    }
    await deprecateSeedRecord(context, record, now);
    deprecated.push(key);
  }

  return {
    mapVersion: config.version,
    created,
    updated,
    deprecated,
    untouched,
  };
}

function seedKey(entityType: SeedEntityType, sourceSeedId: string) {
  return `${entityType}:${sourceSeedId}`;
}

function collectOutcome(
  key: string,
  outcome: "created" | "updated" | "untouched",
  created: string[],
  updated: string[],
  untouched: string[],
) {
  if (outcome === "created") {
    created.push(key);
    return;
  }
  if (outcome === "updated") {
    updated.push(key);
    return;
  }
  untouched.push(key);
}

async function upsertSeedPath(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedPathConfig,
  seedVersion: number,
  now: string,
): Promise<"created" | "updated" | "untouched"> {
  const existingRecord = await findSeedRecordBySource(context.repositories.appSettings, context.userId, "path", config.sourceSeedId);
  if (!existingRecord) {
    const created = await context.repositories.paths.createPath({
      userId: context.userId,
      slug: config.slug,
      title: config.title,
      description: config.description ?? null,
      status: config.status ?? PathStatus.Active,
      sortOrder: config.sortOrder,
    });
    maps.pathIds.set(config.sourceSeedId, created.id);
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("path", created.id, config.sourceSeedId, seedVersion, created.syncVersion ?? 0, "system_seed", now),
    );
    return "created";
  }

  const path = await context.repositories.paths.getPathById(existingRecord.entityId);
  if (!path) {
    const recreated = await context.repositories.paths.createPath({
      userId: context.userId,
      slug: config.slug,
      title: config.title,
      description: config.description ?? null,
      status: config.status ?? PathStatus.Active,
      sortOrder: config.sortOrder,
    });
    maps.pathIds.set(config.sourceSeedId, recreated.id);
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("path", recreated.id, config.sourceSeedId, seedVersion, recreated.syncVersion ?? 0, "system_seed", now),
    );
    return "created";
  }

  maps.pathIds.set(config.sourceSeedId, path.id);
  if (shouldPreserveExisting(existingRecord, path.syncVersion ?? 0)) {
    await saveSeedRecord(context.repositories.appSettings, context.userId, {
      ...existingRecord,
      ownership: "system_seed_user_modified",
      seedVersion,
      userModifiedAt: existingRecord.userModifiedAt ?? now,
      lastBootstrappedAt: now,
    });
    return "untouched";
  }

  const changed =
    path.slug !== config.slug ||
    path.title !== config.title ||
    (path.description ?? null) !== (config.description ?? null) ||
    path.status !== (config.status ?? PathStatus.Active) ||
    path.sortOrder !== config.sortOrder;

  if (!changed) {
    await saveSeedRecord(context.repositories.appSettings, context.userId, {
      ...existingRecord,
      seedVersion,
      lastBootstrappedAt: now,
    });
    return "untouched";
  }

  const updated = await context.repositories.paths.updatePath(path.id, {
    slug: config.slug,
    title: config.title,
    description: config.description ?? null,
    status: config.status ?? PathStatus.Active,
    sortOrder: config.sortOrder,
  });
  await saveSeedRecord(context.repositories.appSettings, context.userId, {
    ...existingRecord,
    seedVersion,
    ownership: "system_seed",
    lastAppliedSyncVersion: updated.syncVersion ?? existingRecord.lastAppliedSyncVersion,
    deprecatedAt: undefined,
    lastBootstrappedAt: now,
  });
  return "updated";
}

async function upsertSeedExpedition(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedExpeditionConfig,
  seedVersion: number,
  now: string,
): Promise<"created" | "updated" | "untouched"> {
  const pathId = requireResolvedId(maps.pathIds, "path", config.pathSeedId);
  const existingRecord = await findSeedRecordBySource(context.repositories.appSettings, context.userId, "expedition", config.sourceSeedId);
  if (!existingRecord) {
    const created = await context.repositories.expeditions.createExpedition({
      userId: context.userId,
      pathId,
      title: config.title,
      description: config.description ?? null,
      status: config.status,
      sortOrder: config.sortOrder,
      startDate: config.startDate ?? null,
      targetDate: config.targetDate ?? null,
    });
    maps.expeditionIds.set(config.sourceSeedId, created.id);
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("expedition", created.id, config.sourceSeedId, seedVersion, created.syncVersion ?? 0, "system_seed", now),
    );
    return "created";
  }

  const entity = await context.repositories.expeditions.getExpeditionById(existingRecord.entityId);
  if (!entity) {
    const recreated = await context.repositories.expeditions.createExpedition({
      userId: context.userId,
      pathId,
      title: config.title,
      description: config.description ?? null,
      status: config.status,
      sortOrder: config.sortOrder,
      startDate: config.startDate ?? null,
      targetDate: config.targetDate ?? null,
    });
    maps.expeditionIds.set(config.sourceSeedId, recreated.id);
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("expedition", recreated.id, config.sourceSeedId, seedVersion, recreated.syncVersion ?? 0, "system_seed", now),
    );
    return "created";
  }

  maps.expeditionIds.set(config.sourceSeedId, entity.id);
  if (shouldPreserveExisting(existingRecord, entity.syncVersion ?? 0)) {
    await saveSeedRecord(context.repositories.appSettings, context.userId, {
      ...existingRecord,
      ownership: "system_seed_user_modified",
      seedVersion,
      userModifiedAt: existingRecord.userModifiedAt ?? now,
      lastBootstrappedAt: now,
    });
    return "untouched";
  }

  const changed =
    entity.pathId !== pathId ||
    entity.title !== config.title ||
    (entity.description ?? null) !== (config.description ?? null) ||
    entity.status !== config.status ||
    entity.sortOrder !== config.sortOrder ||
    (entity.startDate ?? null) !== (config.startDate ?? null) ||
    (entity.targetDate ?? null) !== (config.targetDate ?? null);
  if (!changed) {
    await saveSeedRecord(context.repositories.appSettings, context.userId, {
      ...existingRecord,
      seedVersion,
      lastBootstrappedAt: now,
    });
    return "untouched";
  }

  const updated = await context.repositories.expeditions.updateExpedition(entity.id, {
    title: config.title,
    description: config.description ?? null,
    status: config.status,
    sortOrder: config.sortOrder,
    startDate: config.startDate ?? null,
    targetDate: config.targetDate ?? null,
  });
  await saveSeedRecord(context.repositories.appSettings, context.userId, {
    ...existingRecord,
    seedVersion,
    ownership: "system_seed",
    lastAppliedSyncVersion: updated.syncVersion ?? existingRecord.lastAppliedSyncVersion,
    deprecatedAt: undefined,
    lastBootstrappedAt: now,
  });
  return "updated";
}

async function upsertSeedMilestone(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedMilestoneConfig,
  seedVersion: number,
  now: string,
): Promise<"created" | "updated" | "untouched"> {
  const expeditionId = requireResolvedId(maps.expeditionIds, "expedition", config.expeditionSeedId);
  const existingRecord = await findSeedRecordBySource(context.repositories.appSettings, context.userId, "milestone", config.sourceSeedId);
  if (!existingRecord) {
    const created = await context.repositories.expeditions.createMilestone({
      userId: context.userId,
      expeditionId,
      title: config.title,
      description: config.description ?? null,
      status: config.status,
      startDate: config.startDate ?? null,
      targetDate: config.targetDate ?? null,
      sortOrder: config.sortOrder,
      orderIndex: config.orderIndex,
    });
    maps.milestoneIds.set(config.sourceSeedId, created.id);
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("milestone", created.id, config.sourceSeedId, seedVersion, created.syncVersion ?? 0, "system_seed", now),
    );
    return "created";
  }

  const expeditionMilestones = await context.repositories.expeditions.listMilestonesByExpedition(expeditionId);
  const entity = expeditionMilestones.find((item) => item.id === existingRecord.entityId) ?? null;
  if (!entity) {
    const recreated = await context.repositories.expeditions.createMilestone({
      userId: context.userId,
      expeditionId,
      title: config.title,
      description: config.description ?? null,
      status: config.status,
      startDate: config.startDate ?? null,
      targetDate: config.targetDate ?? null,
      sortOrder: config.sortOrder,
      orderIndex: config.orderIndex,
    });
    maps.milestoneIds.set(config.sourceSeedId, recreated.id);
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("milestone", recreated.id, config.sourceSeedId, seedVersion, recreated.syncVersion ?? 0, "system_seed", now),
    );
    return "created";
  }

  maps.milestoneIds.set(config.sourceSeedId, entity.id);
  if (shouldPreserveExisting(existingRecord, entity.syncVersion ?? 0)) {
    await saveSeedRecord(context.repositories.appSettings, context.userId, {
      ...existingRecord,
      ownership: "system_seed_user_modified",
      seedVersion,
      userModifiedAt: existingRecord.userModifiedAt ?? now,
      lastBootstrappedAt: now,
    });
    return "untouched";
  }

  const changed =
    entity.title !== config.title ||
    (entity.description ?? null) !== (config.description ?? null) ||
    entity.status !== config.status ||
    entity.sortOrder !== config.sortOrder ||
    entity.orderIndex !== config.orderIndex ||
    (entity.startDate ?? null) !== (config.startDate ?? null) ||
    (entity.targetDate ?? null) !== (config.targetDate ?? null);
  if (!changed) {
    await saveSeedRecord(context.repositories.appSettings, context.userId, {
      ...existingRecord,
      seedVersion,
      lastBootstrappedAt: now,
    });
    return "untouched";
  }

  const updated = await context.repositories.expeditions.updateMilestone(entity.id, {
    title: config.title,
    description: config.description ?? null,
    status: config.status,
    startDate: config.startDate ?? null,
    targetDate: config.targetDate ?? null,
    sortOrder: config.sortOrder,
    orderIndex: config.orderIndex,
  });
  await saveSeedRecord(context.repositories.appSettings, context.userId, {
    ...existingRecord,
    seedVersion,
    ownership: "system_seed",
    lastAppliedSyncVersion: updated.syncVersion ?? existingRecord.lastAppliedSyncVersion,
    deprecatedAt: undefined,
    lastBootstrappedAt: now,
  });
  return "updated";
}

async function upsertSeedMarkTemplate(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedMarkTemplateConfig,
  seedVersion: number,
  now: string,
): Promise<"created" | "updated" | "untouched"> {
  const pathId = requireResolvedId(maps.pathIds, "path", config.pathSeedId);
  const existingRecord = await findSeedRecordBySource(context.repositories.appSettings, context.userId, "mark_template", config.sourceSeedId);
  if (!existingRecord) {
    const created = await context.repositories.marks.createMarkTemplate({
      userId: context.userId,
      pathId,
      title: config.title,
      description: config.description ?? null,
      templateType: config.templateType,
      recurrenceRule: config.recurrenceRule,
      defaultDurationMin: config.defaultDurationMin ?? null,
      defaultSignalRule: config.defaultSignalRule,
      isActive: config.isActive ?? true,
    });
    maps.markTemplateIds.set(config.sourceSeedId, created.id);
    await persistMarkTemplateMetadata(context, maps, config, created.id);
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("mark_template", created.id, config.sourceSeedId, seedVersion, created.syncVersion ?? 0, "system_seed", now),
    );
    return "created";
  }

  const entity = await context.repositories.marks.getMarkTemplateById(existingRecord.entityId);
  if (!entity) {
    const recreated = await context.repositories.marks.createMarkTemplate({
      userId: context.userId,
      pathId,
      title: config.title,
      description: config.description ?? null,
      templateType: config.templateType,
      recurrenceRule: config.recurrenceRule,
      defaultDurationMin: config.defaultDurationMin ?? null,
      defaultSignalRule: config.defaultSignalRule,
      isActive: config.isActive ?? true,
    });
    maps.markTemplateIds.set(config.sourceSeedId, recreated.id);
    await persistMarkTemplateMetadata(context, maps, config, recreated.id);
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("mark_template", recreated.id, config.sourceSeedId, seedVersion, recreated.syncVersion ?? 0, "system_seed", now),
    );
    return "created";
  }

  maps.markTemplateIds.set(config.sourceSeedId, entity.id);
  if (shouldPreserveExisting(existingRecord, entity.syncVersion ?? 0)) {
    await saveSeedRecord(context.repositories.appSettings, context.userId, {
      ...existingRecord,
      ownership: "system_seed_user_modified",
      seedVersion,
      userModifiedAt: existingRecord.userModifiedAt ?? now,
      lastBootstrappedAt: now,
    });
    return "untouched";
  }

  const changed =
    entity.pathId !== pathId ||
    entity.title !== config.title ||
    (entity.description ?? null) !== (config.description ?? null) ||
    entity.templateType !== config.templateType ||
    JSON.stringify(entity.recurrenceRule) !== JSON.stringify(config.recurrenceRule) ||
    (entity.defaultDurationMin ?? null) !== (config.defaultDurationMin ?? null) ||
    JSON.stringify(entity.defaultSignalRule ?? null) !== JSON.stringify(config.defaultSignalRule ?? null) ||
    entity.isActive !== (config.isActive ?? true);
  if (!changed) {
    await persistMarkTemplateMetadata(context, maps, config, entity.id);
    await saveSeedRecord(context.repositories.appSettings, context.userId, {
      ...existingRecord,
      seedVersion,
      lastBootstrappedAt: now,
    });
    return "untouched";
  }

  const updated = await context.repositories.marks.updateMarkTemplate(entity.id, {
    title: config.title,
    description: config.description ?? null,
    templateType: config.templateType,
    recurrenceRule: config.recurrenceRule,
    defaultDurationMin: config.defaultDurationMin ?? null,
    defaultSignalRule: config.defaultSignalRule ?? null,
    isActive: config.isActive ?? true,
  });
  await persistMarkTemplateMetadata(context, maps, config, updated.id);
  await saveSeedRecord(context.repositories.appSettings, context.userId, {
    ...existingRecord,
    seedVersion,
    ownership: "system_seed",
    lastAppliedSyncVersion: updated.syncVersion ?? existingRecord.lastAppliedSyncVersion,
    deprecatedAt: undefined,
    lastBootstrappedAt: now,
  });
  return "updated";
}

async function upsertSeedPackCheckTemplate(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedPackCheckTemplateConfig,
  seedVersion: number,
  now: string,
): Promise<"created" | "updated" | "untouched"> {
  const pathId = config.pathSeedId ? requireResolvedId(maps.pathIds, "path", config.pathSeedId) : undefined;
  const existingRecord = await findSeedRecordBySource(context.repositories.appSettings, context.userId, "pack_check_template", config.sourceSeedId);
  if (!existingRecord) {
    const created = await context.repositories.packChecks.upsertTemplate({
      id: deterministicId("pack_check_template", config.sourceSeedId),
      userId: context.userId,
      pathId,
      title: config.title,
      description: config.description,
      defaultAvailableOffsetMin: config.defaultAvailableOffsetMin,
      defaultDueOffsetMin: config.defaultDueOffsetMin,
      defaultSignalRule: config.defaultSignalRule,
      isActive: config.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    maps.packCheckTemplateIds.set(config.sourceSeedId, created.id);
    await persistPackCheckTemplateDetails(context, maps, config, created.id, now);
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("pack_check_template", created.id, config.sourceSeedId, seedVersion, created.syncVersion ?? 0, "system_seed", now),
    );
    return "created";
  }

  const entity = await context.repositories.packChecks.getTemplateById(existingRecord.entityId);
  if (!entity) {
    const recreated = await context.repositories.packChecks.upsertTemplate({
      id: existingRecord.entityId,
      userId: context.userId,
      pathId,
      title: config.title,
      description: config.description,
      defaultAvailableOffsetMin: config.defaultAvailableOffsetMin,
      defaultDueOffsetMin: config.defaultDueOffsetMin,
      defaultSignalRule: config.defaultSignalRule,
      isActive: config.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    maps.packCheckTemplateIds.set(config.sourceSeedId, recreated.id);
    await persistPackCheckTemplateDetails(context, maps, config, recreated.id, now);
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("pack_check_template", recreated.id, config.sourceSeedId, seedVersion, recreated.syncVersion ?? 0, "system_seed", now),
    );
    return "created";
  }

  maps.packCheckTemplateIds.set(config.sourceSeedId, entity.id);
  if (shouldPreserveExisting(existingRecord, entity.syncVersion ?? 0)) {
    await saveSeedRecord(context.repositories.appSettings, context.userId, {
      ...existingRecord,
      ownership: "system_seed_user_modified",
      seedVersion,
      userModifiedAt: existingRecord.userModifiedAt ?? now,
      lastBootstrappedAt: now,
    });
    return "untouched";
  }

  const changed =
    (entity.pathId ?? undefined) !== pathId ||
    entity.title !== config.title ||
    (entity.description ?? null) !== (config.description ?? null) ||
    (entity.defaultAvailableOffsetMin ?? null) !== (config.defaultAvailableOffsetMin ?? null) ||
    (entity.defaultDueOffsetMin ?? null) !== (config.defaultDueOffsetMin ?? null) ||
    JSON.stringify(entity.defaultSignalRule ?? null) !== JSON.stringify(config.defaultSignalRule ?? null) ||
    entity.isActive !== (config.isActive ?? true);

  const updatedEntity =
    changed ?
      await context.repositories.packChecks.upsertTemplate({
        ...entity,
        pathId,
        title: config.title,
        description: config.description,
        defaultAvailableOffsetMin: config.defaultAvailableOffsetMin,
        defaultDueOffsetMin: config.defaultDueOffsetMin,
        defaultSignalRule: config.defaultSignalRule,
        isActive: config.isActive ?? true,
      })
    : entity;

  await persistPackCheckTemplateDetails(context, maps, config, updatedEntity.id, now);
  await saveSeedRecord(context.repositories.appSettings, context.userId, {
    ...existingRecord,
    seedVersion,
    ownership: "system_seed",
    lastAppliedSyncVersion: updatedEntity.syncVersion ?? existingRecord.lastAppliedSyncVersion,
    deprecatedAt: undefined,
    lastBootstrappedAt: now,
  });
  return changed ? "updated" : "untouched";
}

async function upsertSeedWorkoutRoutine(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedWorkoutRoutineConfig,
  seedVersion: number,
  now: string,
): Promise<"created" | "updated" | "untouched"> {
  const pathId = requireResolvedId(maps.pathIds, "path", config.pathSeedId);
  const markTemplateId = config.markTemplateSeedId ? requireResolvedId(maps.markTemplateIds, "mark_template", config.markTemplateSeedId) : undefined;
  const existingRecord = await findSeedRecordBySource(context.repositories.appSettings, context.userId, "workout_routine", config.sourceSeedId);

  const routineId = existingRecord?.entityId ?? deterministicId("workout_routine", config.sourceSeedId);
  const existing = existingRecord ? await context.repositories.strength.getRoutineById(existingRecord.entityId) : null;

  if (existing && shouldPreserveExisting(existingRecord!, existing.syncVersion ?? 0)) {
    const shouldRepair = await shouldRepairAuthoritativeWorkoutRoutine(context, config, existingRecord!, existing);
    if (shouldRepair) {
      const repaired = await rebuildSeedWorkoutRoutine(context, maps, config, seedVersion, now, existingRecord!, existing, routineId, pathId, markTemplateId);
      return repaired;
    }

    maps.workoutRoutineIds.set(config.sourceSeedId, existing.id);
    await saveSeedRecord(context.repositories.appSettings, context.userId, {
      ...existingRecord!,
      ownership: "system_seed_user_modified",
      seedVersion,
      userModifiedAt: existingRecord!.userModifiedAt ?? now,
      lastBootstrappedAt: now,
    });
    return "untouched";
  }

  const routine = await rebuildSeedWorkoutRoutine(context, maps, config, seedVersion, now, existingRecord, existing, routineId, pathId, markTemplateId);
  return routine;
}

async function rebuildSeedWorkoutRoutine(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedWorkoutRoutineConfig,
  seedVersion: number,
  now: string,
  existingRecord: SeedRecord | null,
  existing: WorkoutRoutineTemplate | null,
  routineId: string,
  pathId: string,
  markTemplateId?: string,
): Promise<"created" | "updated" | "untouched"> {
  const routine = await context.repositories.strength.upsertRoutine({
    id: routineId,
    userId: context.userId,
    pathId,
    markTemplateId,
    title: config.title,
    description: config.description,
    routineType: config.routineType,
    cycleKey: config.cycleKey,
    estimatedDurationMin: config.estimatedDurationMin,
    isActive: config.isActive ?? true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    syncVersion: existing?.syncVersion ?? 0,
  });
  maps.workoutRoutineIds.set(config.sourceSeedId, routine.id);

  await upsertRoutineExercises(context, routine.id, pathId, config, now);

  if (!existingRecord) {
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("workout_routine", routine.id, config.sourceSeedId, seedVersion, routine.syncVersion ?? 0, "system_seed", now),
    );
    return "created";
  }

  await saveSeedRecord(context.repositories.appSettings, context.userId, {
    ...existingRecord,
    seedVersion,
    ownership: "system_seed",
    lastAppliedSyncVersion: routine.syncVersion ?? existingRecord.lastAppliedSyncVersion,
    userModifiedAt: undefined,
    deprecatedAt: undefined,
    lastBootstrappedAt: now,
  });

  return existing ? "updated" : "created";
}

const DEFAULT_AUTHORITATIVE_WORKOUT_ROUTINE_REPAIR_SEED_IDS = [
  "health_day_a_routine",
  "health_day_b_routine",
] as const;

const AUTHORITATIVE_WORKOUT_ROUTINE_REPAIR_SEED_IDS = new Set<string>([
  ...DEFAULT_AUTHORITATIVE_WORKOUT_ROUTINE_REPAIR_SEED_IDS,
  ...GOLF_AUTHORITATIVE_WORKOUT_ROUTINE_REPAIR_SEED_IDS,
]);

type WorkoutRoutineExerciseSignature = {
  id: string;
  canonicalSlug?: string;
  phase: string;
  orderIndex: number;
  targetType: string;
  targetLoadKg?: number;
  targetReps?: number;
  targetSets?: number;
  targetDurationSec?: number;
  targetDistanceM?: number;
  targetSteps?: number;
  restDurationSec?: number;
};

type LegacyWorkoutRoutineExerciseSignature = Omit<WorkoutRoutineExerciseSignature, "id">;

async function shouldRepairAuthoritativeWorkoutRoutine(
  context: BootstrapContext,
  config: SeedWorkoutRoutineConfig,
  record: SeedRecord,
  existing: WorkoutRoutineTemplate,
) {
  if (!AUTHORITATIVE_WORKOUT_ROUTINE_REPAIR_SEED_IDS.has(config.sourceSeedId)) {
    return false;
  }
  if (record.ownership !== "system_seed_user_modified" || !record.userModifiedAt) {
    return false;
  }

  const currentExercises = await listWorkoutRoutineExerciseSignatures(context, existing.id);
  return routineMatchesSeedConfig(config, currentExercises) || routineMatchesKnownLegacySeedShape(config.sourceSeedId, currentExercises);
}

async function listWorkoutRoutineExerciseSignatures(context: BootstrapContext, routineId: string): Promise<WorkoutRoutineExerciseSignature[]> {
  const exercises = await context.repositories.strength.listRoutineExercises(routineId);
  const signatures: WorkoutRoutineExerciseSignature[] = [];
  for (const exercise of exercises) {
    const definition = await context.repositories.strength.getExerciseDefinitionById(exercise.exerciseDefinitionId);
    signatures.push({
      id: exercise.id,
      canonicalSlug: definition?.canonicalSlug,
      phase: exercise.phase,
      orderIndex: exercise.orderIndex,
      targetType: exercise.targetType,
      targetLoadKg: exercise.targetLoadKg,
      targetReps: exercise.targetReps,
      targetSets: exercise.targetSets,
      targetDurationSec: exercise.targetDurationSec,
      targetDistanceM: exercise.targetDistanceM,
      targetSteps: exercise.targetSteps,
      restDurationSec: exercise.restDurationSec,
    });
  }
  return signatures;
}

function routineMatchesSeedConfig(config: SeedWorkoutRoutineConfig, actual: WorkoutRoutineExerciseSignature[]) {
  const expected = config.exercises.map((exercise) => ({
    id: deterministicId("routine_exercise", `${config.sourceSeedId}:${exercise.sourceSeedId}`),
    phase: exercise.phase,
    orderIndex: exercise.orderIndex,
    targetType: exercise.targetType,
    targetLoadKg: exercise.targetLoadKg,
    targetReps: exercise.targetReps,
    targetSets: exercise.targetSets,
    targetDurationSec: exercise.targetDurationSec,
    targetDistanceM: exercise.targetDistanceM,
    targetSteps: exercise.targetSteps,
    restDurationSec: exercise.restDurationSec,
  }));

  return exerciseSignaturesMatch(
    actual.map(({ canonicalSlug, ...exercise }) => exercise),
    expected,
  );
}

function routineMatchesKnownLegacySeedShape(sourceSeedId: string, actual: WorkoutRoutineExerciseSignature[]) {
  const strengthExercises = actual
    .filter((exercise) => exercise.phase === WorkoutExercisePhase.Strength)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const expected =
    sourceSeedId === "health_day_a_routine" ? LEGACY_DAY_A_STRENGTH_SIGNATURE
    : sourceSeedId === "health_day_b_routine" ? LEGACY_DAY_B_STRENGTH_SIGNATURE
    : [];

  return legacyExerciseSignaturesMatch(strengthExercises, expected);
}

function exerciseSignaturesMatch(actual: Omit<WorkoutRoutineExerciseSignature, "canonicalSlug">[], expected: Omit<WorkoutRoutineExerciseSignature, "canonicalSlug">[]): boolean;
function exerciseSignaturesMatch(actual: WorkoutRoutineExerciseSignature[], expected: WorkoutRoutineExerciseSignature[]): boolean;
function exerciseSignaturesMatch(actual: WorkoutRoutineExerciseSignature[], expected: WorkoutRoutineExerciseSignature[]) {
  if (actual.length !== expected.length) {
    return false;
  }
  return expected.every((expectedExercise, index) => {
    const actualExercise = actual[index];
    return (
      actualExercise.id === expectedExercise.id &&
      actualExercise.canonicalSlug === expectedExercise.canonicalSlug &&
      actualExercise.phase === expectedExercise.phase &&
      actualExercise.orderIndex === expectedExercise.orderIndex &&
      actualExercise.targetType === expectedExercise.targetType &&
      actualExercise.targetLoadKg === expectedExercise.targetLoadKg &&
      actualExercise.targetReps === expectedExercise.targetReps &&
      actualExercise.targetSets === expectedExercise.targetSets &&
      actualExercise.targetDurationSec === expectedExercise.targetDurationSec &&
      actualExercise.targetDistanceM === expectedExercise.targetDistanceM &&
      actualExercise.targetSteps === expectedExercise.targetSteps &&
      actualExercise.restDurationSec === expectedExercise.restDurationSec
    );
  });
}

function legacyExerciseSignaturesMatch(actual: WorkoutRoutineExerciseSignature[], expected: LegacyWorkoutRoutineExerciseSignature[]) {
  if (actual.length !== expected.length) {
    return false;
  }
  return expected.every((expectedExercise, index) => {
    const actualExercise = actual[index];
    return (
      actualExercise.canonicalSlug === expectedExercise.canonicalSlug &&
      actualExercise.phase === expectedExercise.phase &&
      actualExercise.orderIndex === expectedExercise.orderIndex &&
      actualExercise.targetType === expectedExercise.targetType &&
      actualExercise.targetLoadKg === expectedExercise.targetLoadKg &&
      actualExercise.targetReps === expectedExercise.targetReps &&
      actualExercise.targetSets === expectedExercise.targetSets &&
      actualExercise.targetDurationSec === expectedExercise.targetDurationSec &&
      actualExercise.targetDistanceM === expectedExercise.targetDistanceM &&
      actualExercise.targetSteps === expectedExercise.targetSteps &&
      actualExercise.restDurationSec === expectedExercise.restDurationSec
    );
  });
}

const LEGACY_DAY_A_STRENGTH_SIGNATURE: LegacyWorkoutRoutineExerciseSignature[] = [
  legacyStrengthExercise("barbell-squat", 0, ExerciseTargetType.RepsLoad, { targetLoadKg: 60, targetReps: 5, targetSets: 3, restDurationSec: 90 }),
  legacyStrengthExercise("standing-barbell-military-press", 1, ExerciseTargetType.RepsLoad, { targetLoadKg: 24, targetReps: 8, targetSets: 2, restDurationSec: 90 }),
  legacyStrengthExercise("barbell-bench-press", 2, ExerciseTargetType.RepsLoad, { targetLoadKg: 45, targetReps: 8, targetSets: 3, restDurationSec: 90 }),
  legacyStrengthExercise("pallof-press", 3, ExerciseTargetType.RepsLoad, { targetLoadKg: 15, targetReps: 10, targetSets: 2, restDurationSec: 90 }),
  legacyStrengthExercise("plank", 4, ExerciseTargetType.Timed, { targetDurationSec: 50, targetSets: 1 }),
];

const LEGACY_DAY_B_STRENGTH_SIGNATURE: LegacyWorkoutRoutineExerciseSignature[] = [
  legacyStrengthExercise("wide-grip-lat-pulldown", 0, ExerciseTargetType.RepsLoad, { targetLoadKg: 32, targetReps: 8, targetSets: 2, restDurationSec: 90 }),
  legacyStrengthExercise("wood-chop", 1, ExerciseTargetType.RepsLoad, { targetLoadKg: 10, targetReps: 10, targetSets: 1, restDurationSec: 90 }),
  legacyStrengthExercise("barbell-deadlift", 2, ExerciseTargetType.RepsLoad, { targetLoadKg: 70, targetReps: 5, targetSets: 3, restDurationSec: 90 }),
  legacyStrengthExercise("bent-over-barbell-row", 3, ExerciseTargetType.RepsLoad, { targetLoadKg: 34, targetReps: 8, targetSets: 3, restDurationSec: 90 }),
  legacyStrengthExercise("kneeling-ab-wheel-rollout", 4, ExerciseTargetType.RepsOnly, { targetReps: 10, targetSets: 2, restDurationSec: 90 }),
];

function legacyStrengthExercise(
  canonicalSlug: string,
  orderIndex: number,
  targetType: ExerciseTargetType,
  target: Pick<WorkoutRoutineExerciseSignature, "targetLoadKg" | "targetReps" | "targetSets" | "targetDurationSec" | "restDurationSec">,
): LegacyWorkoutRoutineExerciseSignature {
  return {
    canonicalSlug,
    phase: WorkoutExercisePhase.Strength,
    orderIndex,
    targetType,
    ...target,
  };
}

async function upsertSeedBacklogItem(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedBacklogItemConfig,
  seedVersion: number,
  now: string,
): Promise<"created" | "updated" | "untouched"> {
  const pathId = config.pathSeedId ? requireResolvedId(maps.pathIds, "path", config.pathSeedId) : undefined;
  const existingRecord = await findSeedRecordBySource(context.repositories.appSettings, context.userId, "backlog_item", config.sourceSeedId);
  const existing = existingRecord ? await context.repositories.backlog.getById(existingRecord.entityId) : null;

  if (existing && shouldPreserveExisting(existingRecord!, existing.syncVersion ?? 0)) {
    maps.backlogItemIds.set(config.sourceSeedId, existing.id);
    await saveSeedRecord(context.repositories.appSettings, context.userId, {
      ...existingRecord!,
      ownership: "system_seed_user_modified",
      seedVersion,
      userModifiedAt: existingRecord!.userModifiedAt ?? now,
      lastBootstrappedAt: now,
    });
    return "untouched";
  }

  const item = await context.repositories.backlog.upsert({
    id: existingRecord?.entityId ?? deterministicId("backlog_item", config.sourceSeedId),
    userId: context.userId,
    pathId,
    title: config.title,
    description: config.description,
    itemType: config.itemType,
    horizon: config.horizon,
    status: config.status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    syncVersion: existing?.syncVersion ?? 0,
  });
  maps.backlogItemIds.set(config.sourceSeedId, item.id);

  if (!existingRecord) {
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("backlog_item", item.id, config.sourceSeedId, seedVersion, item.syncVersion ?? 0, "system_seed", now),
    );
    return "created";
  }

  await saveSeedRecord(context.repositories.appSettings, context.userId, {
    ...existingRecord,
    seedVersion,
    ownership: "system_seed",
    lastAppliedSyncVersion: item.syncVersion ?? existingRecord.lastAppliedSyncVersion,
    deprecatedAt: undefined,
    lastBootstrappedAt: now,
  });
  return existing ? "updated" : "created";
}

async function upsertSeedSignalConfig(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedSignalConfig,
  seedVersion: number,
  now: string,
): Promise<"created" | "updated" | "untouched"> {
  const existingRecord = await findSeedRecordBySource(context.repositories.appSettings, context.userId, "signal_config", config.sourceSeedId);
  const configId = existingRecord?.entityId ?? deterministicId("signal_config", config.sourceSeedId);
  const targetId =
    config.targetType === "mark_template" && config.targetSeedId ? requireResolvedId(maps.markTemplateIds, "mark_template", config.targetSeedId)
    : config.targetType === "pack_check_template" && config.targetSeedId ? requireResolvedId(maps.packCheckTemplateIds, "pack_check_template", config.targetSeedId)
    : undefined;

  await setSignalConfig(context.repositories.appSettings, context.userId, {
    id: configId,
    sourceSeedId: config.sourceSeedId,
    label: config.label,
    targetType: config.targetType,
    targetId,
    scheduledTime: config.scheduledTime,
    leadMinutes: config.leadMinutes,
    repeatAfterMinutes: config.repeatAfterMinutes,
    maxRings: config.maxRings,
    strict: config.strict ?? true,
    quietHoursBypass: config.quietHoursBypass,
    isActive: config.isActive ?? true,
  });

  if (!existingRecord) {
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("signal_config", configId, config.sourceSeedId, seedVersion, 0, "system_seed", now),
    );
    return "created";
  }

  await saveSeedRecord(context.repositories.appSettings, context.userId, {
    ...existingRecord,
    seedVersion,
    ownership: existingRecord.ownership === "system_seed_user_modified" ? "system_seed_user_modified" : "system_seed",
    deprecatedAt: undefined,
    lastBootstrappedAt: now,
  });
  return "updated";
}

async function upsertCloseTrailRuleConfig(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedCloseTrailRuleConfig,
  seedVersion: number,
  now: string,
): Promise<"created" | "updated" | "untouched"> {
  const existingRecord = await findSeedRecordBySource(context.repositories.appSettings, context.userId, "close_trail_rule", config.sourceSeedId);
  const configId = existingRecord?.entityId ?? deterministicId("close_trail_rule", config.sourceSeedId);
  await setCloseTrailRuleConfig(context.repositories.appSettings, context.userId, {
    id: configId,
    sourceSeedId: config.sourceSeedId,
    disciplines: config.disciplines.map((discipline) => resolveDisciplineDefinition(maps, discipline)),
  });

  if (!existingRecord) {
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("close_trail_rule", configId, config.sourceSeedId, seedVersion, 0, "system_seed", now),
    );
    return "created";
  }

  await saveSeedRecord(context.repositories.appSettings, context.userId, {
    ...existingRecord,
    seedVersion,
    deprecatedAt: undefined,
    lastBootstrappedAt: now,
  });
  return "updated";
}

async function upsertAnchorPathRotation(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedAnchorPathRotationConfig,
  seedVersion: number,
  now: string,
): Promise<"created" | "updated" | "untouched"> {
  const existingRecord = await findSeedRecordBySource(
    context.repositories.appSettings,
    context.userId,
    "anchor_path_rotation",
    config.sourceSeedId,
  );
  const configId = existingRecord?.entityId ?? deterministicId("anchor_path_rotation", config.sourceSeedId);
  const rule: AnchorPathRotationRule = {
    id: configId,
    sourceSeedId: config.sourceSeedId,
    weekdayPathIds: Object.fromEntries(
      Object.entries(config.weekdayPathSeedIds).map(([weekday, pathSeedId]) => [
        Number(weekday),
        requireResolvedId(maps.pathIds, "path", pathSeedId),
      ]),
    ),
  };
  await setAnchorPathRotationRule(context.repositories.appSettings, context.userId, rule);

  if (!existingRecord) {
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("anchor_path_rotation", configId, config.sourceSeedId, seedVersion, 0, "system_seed", now),
    );
    return "created";
  }

  await saveSeedRecord(context.repositories.appSettings, context.userId, {
    ...existingRecord,
    seedVersion,
    deprecatedAt: undefined,
    lastBootstrappedAt: now,
  });
  return "updated";
}

function resolveDisciplineDefinition(maps: SeedMaps, definition: SeedDisciplineDefinition) {
  return {
    key: definition.key,
    label: definition.label,
    pathId: requireResolvedId(maps.pathIds, "path", definition.pathSeedId),
    expeditionId:
      definition.expeditionSeedId ?
        requireResolvedId(maps.expeditionIds, "expedition", definition.expeditionSeedId)
      : undefined,
    milestoneId:
      definition.milestoneSeedId ?
        requireResolvedId(maps.milestoneIds, "milestone", definition.milestoneSeedId)
      : undefined,
  };
}

async function upsertDailyMarkAssignment(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedDailyMarkAssignmentConfig,
  seedVersion: number,
  now: string,
): Promise<"created" | "updated" | "untouched"> {
  const existingRecord = await findSeedRecordBySource(
    context.repositories.appSettings,
    context.userId,
    "daily_mark_assignment",
    config.sourceSeedId,
  );
  if (existingRecord && shouldPreserveExisting(existingRecord, existingRecord.lastAppliedSyncVersion)) {
    await saveSeedRecord(context.repositories.appSettings, context.userId, {
      ...existingRecord,
      ownership: "system_seed_user_modified",
      seedVersion,
      userModifiedAt: existingRecord.userModifiedAt ?? now,
      lastBootstrappedAt: now,
    });
    return "untouched";
  }
  const assignmentId = existingRecord?.entityId ?? deterministicId("daily_mark_assignment", config.sourceSeedId);
  const assignment: DailyMarkAssignment = {
    id: assignmentId,
    sourceSeedId: config.sourceSeedId,
    localDate: config.localDate,
    markTemplateId: requireResolvedId(maps.markTemplateIds, "mark_template", config.markTemplateSeedId),
    title: config.title,
    description: config.description,
    scheduledTime: config.scheduledTime,
    scheduledEndTime: config.scheduledEndTime,
    dueTime: config.dueTime,
    orderIndex: config.orderIndex,
    blockType: config.blockType,
    taskKind: config.taskKind,
    source: config.source,
    pathId: config.pathSeedId ? requireResolvedId(maps.pathIds, "path", config.pathSeedId) : undefined,
    expeditionId: config.expeditionSeedId ? requireResolvedId(maps.expeditionIds, "expedition", config.expeditionSeedId) : undefined,
    milestoneId: config.milestoneSeedId ? requireResolvedId(maps.milestoneIds, "milestone", config.milestoneSeedId) : undefined,
    milestoneSourceSeedId: config.milestoneSourceSeedId,
    appearsInToday: config.appearsInToday,
    requiresText: config.requiresText,
    countsAsPathProof: config.countsAsPathProof,
    executionChecklistItems: config.executionChecklistItems,
  };
  await setDailyMarkAssignment(context.repositories.appSettings, context.userId, assignment);

  if (!existingRecord) {
    await saveSeedRecord(
      context.repositories.appSettings,
      context.userId,
      buildSeedRecord("daily_mark_assignment", assignmentId, config.sourceSeedId, seedVersion, 0, "system_seed", now),
    );
    return "created";
  }

  await saveSeedRecord(context.repositories.appSettings, context.userId, {
    ...existingRecord,
    seedVersion,
    deprecatedAt: undefined,
    lastBootstrappedAt: now,
  });
  return "updated";
}

async function persistMarkTemplateMetadata(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedMarkTemplateConfig,
  templateId: string,
) {
  const metadata: MarkTemplateSeedMetadata = {
    templateId,
    sourceSeedId: config.sourceSeedId,
    startDate: config.generation?.startDate,
    endDate: config.generation?.endDate,
    calendarDates: config.generation?.calendarDates,
    scheduledTime: config.generation?.scheduledTime,
    scheduledEndTime: config.generation?.scheduledEndTime,
    dueTime: config.generation?.dueTime,
    visibility: config.generation?.visibility,
    checklistPackCheckTemplateSeedId: config.generation?.checklistPackCheckTemplateSeedId,
    phaseResolver: config.generation?.phaseResolver,
    measurementType: config.generation?.measurementType,
    canPromoteToMemory: config.generation?.canPromoteToMemory,
    orderIndex: config.generation?.orderIndex,
    blockType: config.generation?.blockType,
    taskKind: config.generation?.taskKind,
    source: config.generation?.source,
    appearsInToday: config.generation?.appearsInToday,
    requiresText: config.generation?.requiresText,
    countsAsPathProof: config.generation?.countsAsPathProof,
    expeditionSeedId: config.generation?.expeditionSeedId,
    milestoneSeedId: config.generation?.milestoneSeedId,
    milestoneSourceSeedId: config.generation?.milestoneSourceSeedId,
    expeditionId: config.generation?.expeditionSeedId
      ? requireResolvedId(maps.expeditionIds, "expedition", config.generation.expeditionSeedId)
      : undefined,
    milestoneId: config.generation?.milestoneSeedId
      ? requireResolvedId(maps.milestoneIds, "milestone", config.generation.milestoneSeedId)
      : undefined,
    executionChecklistItems: config.generation?.executionChecklistItems,
  };
  await setMarkTemplateSeedMetadata(context.repositories.appSettings, context.userId, metadata);
}

async function persistPackCheckTemplateDetails(
  context: BootstrapContext,
  maps: SeedMaps,
  config: SeedPackCheckTemplateConfig,
  templateId: string,
  now: string,
) {
  if (config.surfacePolicy) {
    await setPackCheckSurfacePolicy(context.repositories.appSettings, context.userId, templateId, config.surfacePolicy);
  }

  if (config.items?.length) {
    await context.repositories.packChecks.upsertItemTemplates(
      config.items.map((item) => ({
        id: deterministicId("pack_check_item_template", `${config.sourceSeedId}:${item.sourceSeedId}`),
        packCheckTemplateId: templateId,
        label: item.label,
        isRequired: item.isRequired,
        orderIndex: item.orderIndex,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  if (config.markRules?.length) {
    await context.repositories.packChecks.upsertMarkPackCheckRules(
      config.markRules.map((rule) => ({
        id: deterministicId("mark_pack_check_rule", `${config.sourceSeedId}:${rule.sourceSeedId}`),
        markTemplateId: requireResolvedId(maps.markTemplateIds, "mark_template", rule.markTemplateSeedId),
        packCheckTemplateId: templateId,
        availableOffsetMin: rule.availableOffsetMin,
        dueOffsetMin: rule.dueOffsetMin,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }
}

async function upsertRoutineExercises(
  context: BootstrapContext,
  routineId: string,
  pathId: string,
  config: SeedWorkoutRoutineConfig,
  now: string,
) {
  const exercises = [];
  for (const exercise of config.exercises) {
    const definition = await context.repositories.strength.upsertExerciseDefinition({
      id: deterministicId("exercise_definition", `${config.sourceSeedId}:${exercise.sourceSeedId}`),
      userId: context.userId,
      pathId,
      title: exercise.exerciseTitle,
      canonicalSlug: exercise.canonicalSlug,
      category: inferExerciseCategory(exercise.phase, config.routineType),
      targetType: exercise.targetType,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    });

    exercises.push({
      id: deterministicId("routine_exercise", `${config.sourceSeedId}:${exercise.sourceSeedId}`),
      workoutRoutineTemplateId: routineId,
      exerciseDefinitionId: definition.id,
      phase: exercise.phase,
      orderIndex: exercise.orderIndex,
      targetType: exercise.targetType,
      targetLoadKg: exercise.targetLoadKg,
      targetReps: exercise.targetReps,
      targetSets: exercise.targetSets,
      targetDurationSec: exercise.targetDurationSec,
      targetDistanceM: exercise.targetDistanceM,
      targetSteps: exercise.targetSteps,
      restDurationSec: exercise.restDurationSec,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (exercises.length > 0) {
    await context.repositories.strength.upsertRoutineExercises(exercises);
    await context.repositories.strength.softDeleteRoutineExercisesExcept(
      routineId,
      exercises.map((exercise) => exercise.id),
    );
  }
}

function inferExerciseCategory(phase: string, routineType?: WorkoutRoutineType) {
  if (routineType === WorkoutRoutineType.GolfPractice) {
    return ExerciseCategory.Golf;
  }
  if (phase === "walk") {
    return ExerciseCategory.Walk;
  }
  if (phase === "cooldown") {
    return ExerciseCategory.Mobility;
  }
  if (phase === "stretch") {
    return ExerciseCategory.Stretch;
  }
  return ExerciseCategory.Strength;
}

async function deprecateSeedRecord(context: BootstrapContext, record: SeedRecord, now: string) {
  switch (record.entityType) {
    case "path": {
      const path = await context.repositories.paths.getPathById(record.entityId);
      if (path && path.status !== PathStatus.Archived) {
        await context.repositories.paths.updatePath(path.id, { status: PathStatus.Archived });
      }
      break;
    }
    case "expedition": {
      const entity = await context.repositories.expeditions.getExpeditionById(record.entityId);
      if (entity) {
        await context.repositories.expeditions.updateExpedition(entity.id, { status: "archived" as Expedition["status"] });
      }
      break;
    }
    case "milestone": {
      break;
    }
    case "mark_template": {
      const entity = await context.repositories.marks.getMarkTemplateById(record.entityId);
      if (entity) {
        await context.repositories.marks.updateMarkTemplate(entity.id, { isActive: false });
      }
      break;
    }
    case "daily_mark_assignment": {
      await context.repositories.appSettings.deleteSetting(context.userId, `daily_mark_assignment:${record.entityId}`);
      break;
    }
    case "pack_check_template": {
      const entity = await context.repositories.packChecks.getTemplateById(record.entityId);
      if (entity) {
        await context.repositories.packChecks.upsertTemplate({ ...entity, isActive: false });
      }
      break;
    }
    case "backlog_item": {
      const entity = await context.repositories.backlog.getById(record.entityId);
      if (entity) {
        await context.repositories.backlog.upsert({ ...entity, status: BacklogItemStatus.Archived });
      }
      break;
    }
    case "signal_config": {
      const current = await context.repositories.appSettings.getSetting(context.userId, `signal_config:${record.entityId}`);
      if (current && typeof current.value === "object" && current.value !== null) {
        await context.repositories.appSettings.setSetting(context.userId, `signal_config:${record.entityId}`, {
          ...(current.value as Record<string, unknown>),
          isActive: false,
        });
      }
      break;
    }
    case "workout_routine": {
      const entity = await context.repositories.strength.getRoutineById(record.entityId);
      if (entity) {
        await context.repositories.strength.upsertRoutine({ ...entity, isActive: false });
      }
      break;
    }
    case "close_trail_rule":
      break;
    case "anchor_path_rotation": {
      await context.repositories.appSettings.deleteSetting(context.userId, `anchor_path_rotation:${record.entityId}`);
      break;
    }
    default:
      break;
  }

  await markSeedRecordDeprecated(context.repositories.appSettings, context.userId, record, now);
}

function shouldPreserveExisting(record: SeedRecord, currentSyncVersion: number) {
  return record.ownership === "system_seed_user_modified" || !!record.userModifiedAt || currentSyncVersion > record.lastAppliedSyncVersion;
}

function requireResolvedId(map: Map<string, string>, entityType: string, sourceSeedId: string) {
  const value = map.get(sourceSeedId);
  if (!value) {
    throw new Error(`Missing resolved ${entityType} seed reference for ${sourceSeedId}.`);
  }
  return value;
}

function deterministicId(prefix: string, seed: string) {
  return `${prefix}_${seed.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
}
