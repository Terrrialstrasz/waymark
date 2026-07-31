import type { UserProfile, WaymarkRepositories } from "../../domain/waymark";
import type { DependencyEngine, MarkEngine, PackCheckEngine, SignalEngine, StrengthSessionEngine } from "../../domain/waymark/services";
import { MarkInstanceOrigin, MarkInstanceStatus, PackCheckInstanceStatus, SessionExerciseStatus, SignalTargetType, WorkoutExercisePhase, WorkoutSessionPhase, WorkoutSessionStatus, type ExerciseTargetType } from "../../domain/waymark/enums";
import { todayPathHeroPaths } from "./todayPathHero";
import { isReusableIndependentPackCheckInstance } from "./packCheckEngine";
import type { Locale } from "../../types/ui";
import type { CaptureMediaAttachment } from "../../types/capture";
import { getPackCheckCatalogEntryByTitle } from "../../config/packCheckCatalog";
import { MediaAssetOwnerType } from "../../domain/waymark";
import { saveMediaAssetsForOwner } from "../../app/waymarkMediaPipeline";
import type {
  ExerciseTargetMetric,
  SessionPhase,
  StrengthExercise,
  StrengthSessionData,
  StrengthSet,
  StretchItem,
  WorkoutDayType,
} from "../../types/strengthSession";
import { ExerciseTargetType as StrengthTargetType } from "../../domain/waymark/enums";

type ShellPathId = "career" | "snag" | "health" | "family" | "character" | "golf" | "culture";

export type ShellAppAdapterContext = {
  repositories: WaymarkRepositories;
  user: UserProfile;
  markEngine: MarkEngine;
  packCheckEngine: PackCheckEngine;
  dependencyEngine: DependencyEngine;
  signalEngine: SignalEngine;
  strengthSessionEngine?: StrengthSessionEngine;
};

export type PackCheckDetailReadModel = {
  packCheck:
    | {
        id: string;
        name: string;
        path: ShellPathId;
        status: PackCheckInstanceStatus;
        isReusable: boolean;
      }
    | null;
  items: Array<{
    id: string;
    label: string;
    checked: boolean;
    required: boolean;
    disabled?: boolean;
  }>;
  isDisabled: boolean;
};

export type StrengthSessionReadModel =
  | { status: "not_found"; session: null }
  | { status: "unavailable"; session: null }
  | {
      status: "ready";
      session: {
        id: string;
        markInstanceId: string;
        routineTemplateId: string;
        sessionStatus: WorkoutSessionStatus;
      };
      uiSession: StrengthSessionData;
    };

export async function loadPackCheckDetailReadModel(
  context: ShellAppAdapterContext,
  packCheckInstanceId: string,
): Promise<PackCheckDetailReadModel | null> {
  const instance = await context.repositories.packChecks.getInstanceById(packCheckInstanceId);
  if (!instance) {
    return null;
  }

  const items = await context.repositories.packChecks.listItemInstances(instance.id);
  const path = await resolvePackCheckPath(
    context,
    instance.id,
    instance.title,
    instance.templateId,
    instance.targetMarkInstanceId,
    instance.trailDayId,
  );
  const isEditableCompletedIndependent =
    instance.status === PackCheckInstanceStatus.Completed && isReusableIndependentPackCheckInstance(instance);

  return {
    packCheck: {
      id: instance.id,
      name: instance.title,
      path,
      status: instance.status,
      isReusable: isReusableIndependentPackCheckInstance(instance),
    },
    items: items.map((item) => ({
      id: item.id,
      label: item.label,
      checked: item.isChecked,
      required: item.isRequired,
      disabled: instance.status === PackCheckInstanceStatus.Completed && item.isRequired && !isEditableCompletedIndependent,
    })),
    isDisabled: FINAL_PACK_CHECK_STATUSES.has(instance.status) && !isEditableCompletedIndependent,
  };
}

export async function togglePackCheckDetailItem(
  context: ShellAppAdapterContext,
  packCheckInstanceId: string,
  itemId: string,
  checked: boolean,
) {
  await context.packCheckEngine.setPackCheckItemChecked(packCheckInstanceId, itemId, checked);
  return loadPackCheckDetailReadModel(context, packCheckInstanceId);
}

export async function completePackCheckDetail(
  context: ShellAppAdapterContext,
  packCheckInstanceId: string,
) {
  const existing = await context.repositories.packChecks.getInstanceById(packCheckInstanceId);
  if (!existing) {
    return null;
  }
  if (
    FINAL_PACK_CHECK_STATUSES.has(existing.status) &&
    !(existing.status === PackCheckInstanceStatus.Completed && isReusableIndependentPackCheckInstance(existing))
  ) {
    return loadPackCheckDetailReadModel(context, packCheckInstanceId);
  }

  await context.packCheckEngine.completePackCheckInstance({ packCheckInstanceId });
  return loadPackCheckDetailReadModel(context, packCheckInstanceId);
}

export async function clearPackCheckDetail(
  context: ShellAppAdapterContext,
  packCheckInstanceId: string,
) {
  const items = await context.repositories.packChecks.listItemInstances(packCheckInstanceId);
  for (const item of items.filter((entry) => entry.isChecked)) {
    await context.packCheckEngine.setPackCheckItemChecked(packCheckInstanceId, item.id, false);
  }
  return loadPackCheckDetailReadModel(context, packCheckInstanceId);
}

export async function deletePackCheckDetail(
  context: ShellAppAdapterContext,
  packCheckInstanceId: string,
) {
  await context.signalEngine.cancelSignalsForTarget({
    targetType: SignalTargetType.PackCheckInstance,
    targetId: packCheckInstanceId,
    reason: "deleted",
  });
  await context.dependencyEngine.cancelDependenciesByRequiredEntity({
    requiredEntityType: "pack_check_instance",
    requiredEntityId: packCheckInstanceId,
  });
  await context.repositories.packChecks.softDeleteInstance(packCheckInstanceId);
}

export async function deleteMarkDetail(
  context: ShellAppAdapterContext,
  markInstanceId: string,
) {
  const linkedPackChecks = await context.repositories.packChecks.listInstancesByTargetMark(markInstanceId);

  await context.signalEngine.cancelSignalsForTarget({
    targetType: SignalTargetType.MarkInstance,
    targetId: markInstanceId,
    reason: "deleted",
  });
  await context.dependencyEngine.cancelDependenciesByRequiredEntity({
    requiredEntityType: "mark_instance",
    requiredEntityId: markInstanceId,
  });

  for (const packCheck of linkedPackChecks) {
    await deletePackCheckDetail(context, packCheck.id);
  }

  await context.repositories.marks.softDeleteMarkInstance(markInstanceId);
}

export async function deleteMemoryDetail(
  context: ShellAppAdapterContext,
  memoryId: string,
) {
  await context.repositories.memories.softDeleteMemory(memoryId);
}

export async function createQuickCaptureMark(
  context: ShellAppAdapterContext,
  title: string,
  detail: string,
  uiPathId: ShellPathId,
  now = new Date(),
  mediaAttachments: CaptureMediaAttachment[] = [],
) {
  const localDate = formatLocalDate(now, context.user.timezone);
  const paths = await context.repositories.paths.listActivePaths(context.user.id);
  const path = findPathByUiPathId(paths, uiPathId);
  if (!path) {
    return null;
  }

  const trailDay = await context.repositories.trailDays.getOrCreateTrailDay(context.user.id, localDate);
  const mark = await context.repositories.marks.createMarkInstance({
    userId: context.user.id,
    pathId: path.id,
    trailDayId: trailDay.id,
    title: title.trim() || "Quick mark",
    description: detail.trim() || null,
    origin: MarkInstanceOrigin.QuickCapture,
    status: MarkInstanceStatus.Ready,
    scheduledStartAt: now.toISOString(),
    dueAt: now.toISOString(),
  });

  const completed = await context.markEngine.completeMarkInstance({
    markInstanceId: mark.id,
    completedAt: now.toISOString(),
    proofNote: detail.trim() || undefined,
    completionSummary: detail.trim() || undefined,
  });

  if (mediaAttachments.length > 0) {
    const assets = await saveMediaAssetsForOwner({
      repositories: context.repositories,
      userId: context.user.id,
      ownerType: MediaAssetOwnerType.MarkInstance,
      ownerId: completed.id,
      mediaAttachments,
      capturedAt: now,
      userTimezone: context.user.timezone,
    });
    await context.repositories.marks.updateMarkInstance(completed.id, {
      proofMediaAssetIds: assets.map((asset) => asset.id),
    });
  }

  return {
    markId: completed.id,
    trailDayId: trailDay.id,
  };
}

export async function loadStrengthSessionReadModel(
  context: ShellAppAdapterContext,
  markInstanceId: string,
  locale: Locale = "en",
): Promise<StrengthSessionReadModel> {
  const mark = await context.repositories.marks.getMarkInstanceById(markInstanceId);
  if (!mark) {
    return { status: "not_found", session: null };
  }

  const session = await context.repositories.strength.getSessionByMarkInstance(markInstanceId);
  if (!session) {
    return { status: "unavailable", session: null };
  }

  const routine = await context.repositories.strength.getRoutineById(session.routineTemplateId);
  const snapshots = sortSessionSnapshots(await context.repositories.strength.listSessionSnapshots(session.id));
  const routineExercises = await context.repositories.strength.listRoutineExercises(session.routineTemplateId);
  const routineExerciseById = new Map(routineExercises.map((item) => [item.id, item] as const));
  const logsBySnapshotId = new Map<string, Awaited<ReturnType<typeof context.repositories.strength.listSetLogs>>>();
  const definitionById = new Map<string, Awaited<ReturnType<typeof context.repositories.strength.getExerciseDefinitionById>>>();

  for (const snapshot of snapshots) {
    logsBySnapshotId.set(snapshot.id, await context.repositories.strength.listSetLogs(snapshot.id));
    if (!definitionById.has(snapshot.exerciseDefinitionId)) {
      definitionById.set(snapshot.exerciseDefinitionId, await context.repositories.strength.getExerciseDefinitionById(snapshot.exerciseDefinitionId));
    }
  }

  const uiSession = buildStrengthSessionUiModel({
    locale,
    markTitle: mark.title,
    routineTitle: routine?.title ?? mark.title,
    estimatedDurationMin: routine?.estimatedDurationMin,
    session,
    snapshots,
    routineExerciseById,
    logsBySnapshotId,
    definitionById,
  });

  return {
    status: "ready",
    session: {
      id: session.id,
      markInstanceId: session.markInstanceId,
      routineTemplateId: session.routineTemplateId,
      sessionStatus: session.status,
    },
    uiSession,
  };
}

const DEFAULT_REST_SECONDS = 90;

function buildStrengthSessionUiModel({
  locale,
  markTitle,
  routineTitle,
  estimatedDurationMin,
  session,
  snapshots,
  routineExerciseById,
  logsBySnapshotId,
  definitionById,
}: {
  locale: Locale;
  markTitle: string;
  routineTitle: string;
  estimatedDurationMin?: number;
  session: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["getSessionByMarkInstance"]>> extends infer T ? NonNullable<T> : never;
  snapshots: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSessionSnapshots"]>>;
  routineExerciseById: Map<string, Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listRoutineExercises"]>>[number]>;
  logsBySnapshotId: Map<string, Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSetLogs"]>>>;
  definitionById: Map<string, Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["getExerciseDefinitionById"]>>>;
}): StrengthSessionData {
  const dayType = inferWorkoutDayType(routineTitle, markTitle);
  const mainSnapshots = snapshots.filter((item) => item.phase === WorkoutExercisePhase.Strength || item.phase === WorkoutExercisePhase.Walk);
  const cooldownSnapshots = snapshots.filter((item) => item.phase === WorkoutExercisePhase.Cooldown || item.phase === WorkoutExercisePhase.Stretch);
  const activeMainSnapshot = mainSnapshots.find((item) => item.id === session.currentExerciseSnapshotId) ?? mainSnapshots.find((item) => item.status === SessionExerciseStatus.Active);
  const activeCooldownSnapshot = cooldownSnapshots.find((item) => item.id === session.currentExerciseSnapshotId) ?? cooldownSnapshots.find((item) => item.status === SessionExerciseStatus.Active);
  const resolvedPhase = resolveUiPhase(session, activeMainSnapshot);
  const exercises = mainSnapshots.map((snapshot, index) =>
    buildStrengthExercise({
      locale,
      snapshot,
      snapshotIndex: index,
      activeMainSnapshotId: activeMainSnapshot?.id,
      session,
      routineExerciseById,
      logs: logsBySnapshotId.get(snapshot.id) ?? [],
      definitionTitle: definitionById.get(snapshot.exerciseDefinitionId)?.title,
    }),
  );
  const stretches = cooldownSnapshots.map((snapshot, index) => buildStretchItem(snapshot, index, activeCooldownSnapshot?.id));
  const activeExercise = exercises.find((item) => item.id === activeMainSnapshot?.id);
  const activeStretch = stretches.find((item) => item.id === activeCooldownSnapshot?.id);
  const doneStretchCount = stretches.filter((item) => item.state === "done").length;

  return {
    locale,
    dayType,
    dayLabel:
      dayType === "day_b" ? (locale === "vi" ? "Ngay B" : "Day B")
      : dayType === "walk" ? (locale === "vi" ? "Di bo" : "Walk")
      : locale === "vi" ? "Ngay A"
      : "Day A",
    totalDurationLabel: formatDurationLabel(locale, estimatedDurationMin),
    exerciseCountLabel: formatCountLabel(locale, exercises.length, "exercises", "bai tap"),
    stretchCountLabel: formatCountLabel(locale, stretches.length, "stretches", "dong tac gian"),
    sessionTitle: { en: routineTitle, vi: routineTitle },
    phase: resolvedPhase,
    strengthIndex: activeExercise?.order ?? Math.min(exercises.length, exercises.filter((item) => item.state === "done").length + 1),
    strengthTotal: exercises.length,
    cooldownIndex:
      activeStretch?.order ??
      (resolvedPhase === "cooldown" ? Math.min(stretches.length, doneStretchCount + 1) : 1),
    cooldownTotal: stretches.length,
    exercises,
    stretches,
    activeExerciseId: activeExercise?.id,
    activeStretchId: activeStretch?.id,
    stretchTimer:
      resolvedPhase === "cooldown" && activeCooldownSnapshot ?
        buildTimer(activeCooldownSnapshot.startedAt, activeCooldownSnapshot.completedAt, activeCooldownSnapshot.targetDurationSec)
      : undefined,
    unit: "kg",
    strengthComplete:
      resolvedPhase === "cooldown" ||
      resolvedPhase === "complete" ||
      exercises.every((item) => item.state === "done"),
    cooldownStarted: resolvedPhase === "cooldown" || resolvedPhase === "complete",
    sessionComplete: resolvedPhase === "complete",
  };
}

function buildStrengthExercise({
  locale,
  snapshot,
  snapshotIndex,
  activeMainSnapshotId,
  session,
  routineExerciseById,
  logs,
  definitionTitle,
}: {
  locale: Locale;
  snapshot: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSessionSnapshots"]>>[number];
  snapshotIndex: number;
  activeMainSnapshotId?: string;
  session: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["getSessionByMarkInstance"]>> extends infer T ? NonNullable<T> : never;
  routineExerciseById: Map<string, Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listRoutineExercises"]>>[number]>;
  logs: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSetLogs"]>>;
  definitionTitle?: string;
}): StrengthExercise {
  const routineExercise = snapshot.routineExerciseTemplateId ? routineExerciseById.get(snapshot.routineExerciseTemplateId) : undefined;
  const mode = mapExerciseMode(snapshot.targetType);
  const title = definitionTitle ?? snapshot.exerciseNameSnapshot;
  const sortedLogs = [...logs].sort((a, b) => a.setNumber - b.setNumber);
  const completedLogs = sortedLogs.filter((item) => item.completed);
  const targetSetCount = resolveTargetSetCount(snapshot, routineExercise?.targetSets);
  const isCurrent = activeMainSnapshotId === snapshot.id;
  const currentSetNumber =
    isCurrent ?
      session.status === WorkoutSessionStatus.SetActive ?
        session.currentSetNumber ?? completedLogs.length + 1
      : completedLogs.length + 1
    : undefined;
  const isResting = isCurrent && session.status === WorkoutSessionStatus.Resting;
  const isSetActive = isCurrent && session.status === WorkoutSessionStatus.SetActive;
  const isExerciseActive =
    isCurrent &&
    (session.status === WorkoutSessionStatus.Active ||
      session.status === WorkoutSessionStatus.ExerciseActive ||
      session.status === WorkoutSessionStatus.WarmingUp);

  return {
    id: snapshot.id,
    order: snapshotIndex + 1,
    title: { en: title, vi: title },
    prescriptionLabel: buildPrescriptionLabel(snapshot, targetSetCount),
    mode,
    targetMetric: mapTargetMetric(snapshot.targetType),
    targetValue: resolvePrimaryTargetValue(snapshot),
    supportsLoad: mode === "reps_load",
    state:
      snapshot.status === SessionExerciseStatus.Completed ? "done"
      : isResting ? "rest"
      : isSetActive || isExerciseActive ? "active"
      : "upcoming",
    sets:
      mode === "timed" ? undefined
      : Array.from({ length: targetSetCount }, (_, index) => {
          const setNumber = index + 1;
          const log = sortedLogs.find((entry) => entry.setNumber === setNumber);
          return buildStrengthSet({
            snapshot,
            setNumber,
            log,
            logs: sortedLogs,
            currentSetNumber,
            completedSetCount: completedLogs.length,
            isCurrent,
            isResting,
            isSetActive,
          });
        }),
    timedSetLabel: mode === "timed" ? "Set 1 of 1" : undefined,
    timer:
      mode === "timed" ?
        buildTimer(
          snapshot.startedAt,
          snapshot.completedAt,
          snapshot.targetDurationSec,
          snapshot.status === SessionExerciseStatus.Completed ? "completed" : isCurrent ? "running" : "idle",
        )
      : undefined,
    restTimer:
      isResting ?
        buildTimer(
          undefined,
          undefined,
          routineExercise?.restDurationSec ?? definitionRestFallback(snapshot.targetType),
          "running",
        )
      : undefined,
    completedSetNumber: isResting ? completedLogs[completedLogs.length - 1]?.setNumber : undefined,
    nextSetNumber: isResting || isExerciseActive ? currentSetNumber : undefined,
  };
}

function buildStrengthSet({
  snapshot,
  setNumber,
  log,
  logs,
  currentSetNumber,
  completedSetCount,
  isCurrent,
  isResting,
  isSetActive,
}: {
  snapshot: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSessionSnapshots"]>>[number];
  setNumber: number;
  log?: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSetLogs"]>>[number];
  logs: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSetLogs"]>>;
  currentSetNumber?: number;
  completedSetCount: number;
  isCurrent: boolean;
  isResting: boolean;
  isSetActive: boolean;
}): StrengthSet {
  const isDone = snapshot.status === SessionExerciseStatus.Completed || setNumber <= completedSetCount;
  const isNext = isCurrent && !isSetActive && currentSetNumber === setNumber && !isDone;
  const isActive = isCurrent && isSetActive && currentSetNumber === setNumber && !isDone;
  const carriedLoad =
    snapshot.targetType === StrengthTargetType.RepsLoad && (isActive || isNext) ?
      getLatestCompletedLoadBeforeSet(logs, setNumber) ?? snapshot.targetLoadKg ?? null
    : null;
  return {
    id: `${snapshot.id}:set:${setNumber}`,
    setNumber,
    repsLabel: buildRepsLabel(snapshot),
    state:
      isDone ? "done"
      : isActive ? "active"
      : isNext ? "next"
      : "upcoming",
    actualLoad: log?.actualLoadKg ?? carriedLoad,
    targetLoad: snapshot.targetLoadKg ?? null,
    actualWeight: log?.actualLoadKg,
    canEditWeight: snapshot.targetType === "reps_load",
  };
}

function getLatestCompletedLoadBeforeSet(
  logs: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSetLogs"]>>,
  setNumber: number,
) {
  return [...logs]
    .sort((left, right) => left.setNumber - right.setNumber)
    .filter((entry) => entry.completed && entry.setNumber < setNumber && typeof entry.actualLoadKg === "number")
    .at(-1)?.actualLoadKg;
}

function buildStretchItem(
  snapshot: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSessionSnapshots"]>>[number],
  index: number,
  activeStretchId?: string,
): StretchItem {
  const durationSeconds = snapshot.targetDurationSec ?? 0;
  return {
    id: snapshot.id,
    order: index + 1,
    title: { en: snapshot.exerciseNameSnapshot, vi: snapshot.exerciseNameSnapshot },
    durationLabel: formatSeconds(durationSeconds),
    durationSeconds,
    state:
      snapshot.status === SessionExerciseStatus.Completed ? "done"
      : snapshot.id === activeStretchId ? "active"
      : !activeStretchId && index === 0 ? "next"
      : "upcoming",
  };
}

function resolveUiPhase(
  session: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["getSessionByMarkInstance"]>> extends infer T ? NonNullable<T> : never,
  activeMainSnapshot?: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSessionSnapshots"]>>[number],
): SessionPhase {
  if (session.phase === WorkoutSessionPhase.Complete || session.status === WorkoutSessionStatus.Completed || session.status === WorkoutSessionStatus.PartiallyCompleted) {
    return "complete";
  }
  if (session.phase === WorkoutSessionPhase.Cooldown || session.status === WorkoutSessionStatus.Cooldown) {
    return "cooldown";
  }
  if (session.status === WorkoutSessionStatus.Resting) {
    return "rest";
  }
  if (activeMainSnapshot?.targetType === "timed" && activeMainSnapshot.status !== SessionExerciseStatus.Completed) {
    return "timed";
  }
  return "strength";
}

function mapExerciseMode(targetType: ExerciseTargetType): StrengthExercise["mode"] {
  switch (targetType) {
    case "timed":
      return "timed";
    case "steps":
    case "walk_distance":
    case "reps_only":
      return "reps_only";
    default:
      return "reps_load";
  }
}

function mapTargetMetric(targetType: ExerciseTargetType): ExerciseTargetMetric {
  switch (targetType) {
    case "timed":
      return "duration";
    case "walk_distance":
      return "distance_m";
    case "steps":
      return "steps";
    default:
      return "reps";
  }
}

function resolveTargetSetCount(
  snapshot: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSessionSnapshots"]>>[number],
  routineTargetSets?: number,
) {
  if (snapshot.targetType === "timed") {
    return 1;
  }
  return snapshot.targetSets ?? routineTargetSets ?? 1;
}

function buildPrescriptionLabel(
  snapshot: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSessionSnapshots"]>>[number],
  targetSetCount: number,
) {
  if (snapshot.targetType === "timed") {
    return `1 x ${formatSeconds(snapshot.targetDurationSec)}`;
  }
  if (snapshot.targetType === "walk_distance") {
    return `${targetSetCount} x ${snapshot.targetDistanceM ?? 0} m`;
  }
  if (snapshot.targetType === "steps") {
    return `${targetSetCount} x ${snapshot.targetSteps ?? 0} steps`;
  }
  if (snapshot.targetType === "reps_only") {
    return `${targetSetCount} x ${snapshot.targetReps ?? 0}`;
  }
  return `${targetSetCount} x ${snapshot.targetReps ?? 0}`;
}

function buildRepsLabel(snapshot: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSessionSnapshots"]>>[number]) {
  if (snapshot.targetType === "timed") {
    return formatSeconds(snapshot.targetDurationSec);
  }
  if (snapshot.targetType === "walk_distance") {
    return `${snapshot.targetDistanceM ?? 0} m`;
  }
  if (snapshot.targetType === "steps") {
    return `${snapshot.targetSteps ?? 0} steps`;
  }
  return `${snapshot.targetReps ?? 0} reps`;
}

function resolvePrimaryTargetValue(
  snapshot: Awaited<ReturnType<ShellAppAdapterContext["repositories"]["strength"]["listSessionSnapshots"]>>[number],
) {
  switch (snapshot.targetType) {
    case "timed":
      return snapshot.targetDurationSec ?? null;
    case "walk_distance":
      return snapshot.targetDistanceM ?? null;
    case "steps":
      return snapshot.targetSteps ?? null;
    default:
      return snapshot.targetReps ?? null;
  }
}

function buildTimer(
  startedAt?: string,
  completedAt?: string,
  totalSeconds?: number,
  explicitState?: "idle" | "running" | "completed",
) {
  const resolvedTotal = totalSeconds ?? DEFAULT_REST_SECONDS;
  const startedMs = startedAt ? new Date(startedAt).getTime() : undefined;
  const completedMs = completedAt ? new Date(completedAt).getTime() : undefined;
  const elapsed =
    completedMs && startedMs ? Math.round((completedMs - startedMs) / 1000)
    : completedMs ? resolvedTotal
    : startedMs ? Math.min(resolvedTotal, Math.max(0, Math.round((Date.now() - startedMs) / 1000)))
    : 0;
  return {
    totalSeconds: resolvedTotal,
    elapsedSeconds: Math.min(resolvedTotal, elapsed),
    state:
      explicitState === "completed" ? "completed"
      : explicitState === "running" ? "running"
      : explicitState === "idle" ? "idle"
      : completedAt ? "completed"
      : startedAt ? "running"
      : "idle",
  } as const;
}

function formatDurationLabel(locale: Locale, durationMin?: number) {
  const resolved = durationMin ?? 42;
  return locale === "vi" ? `${resolved} phut` : `${resolved} min`;
}

function formatCountLabel(locale: Locale, count: number, nounEn: string, nounVi: string) {
  return locale === "vi" ? `${count} ${nounVi}` : `${count} ${nounEn}`;
}

function inferWorkoutDayType(routineTitle: string, markTitle: string): WorkoutDayType {
  const normalized = `${routineTitle} ${markTitle}`.toLowerCase();
  if (normalized.includes("walk")) {
    return "walk";
  }
  return normalized.includes("day b") ? "day_b" : "day_a";
}

function formatSeconds(totalSeconds?: number) {
  const resolved = totalSeconds ?? 0;
  const minutes = Math.floor(resolved / 60);
  const seconds = resolved % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function definitionRestFallback(targetType: ExerciseTargetType) {
  return targetType === "timed" ? 40 : DEFAULT_REST_SECONDS;
}

function sortSessionSnapshots<T extends { orderIndex: number }>(items: T[]) {
  return [...items].sort((a, b) => a.orderIndex - b.orderIndex);
}

const FINAL_PACK_CHECK_STATUSES = new Set<PackCheckInstanceStatus>([
  PackCheckInstanceStatus.Completed,
  PackCheckInstanceStatus.Skipped,
  PackCheckInstanceStatus.Expired,
  PackCheckInstanceStatus.Cancelled,
]);

async function resolvePackCheckPath(
  context: ShellAppAdapterContext,
  packCheckInstanceId: string,
  title: string,
  templateId?: string,
  targetMarkInstanceId?: string,
  trailDayId?: string,
): Promise<ShellPathId> {
  const catalogEntry = getPackCheckCatalogEntryByTitle(title);
  if (catalogEntry) {
    return catalogEntry.uiPathId;
  }

  if (targetMarkInstanceId) {
    const mark = await context.repositories.marks.getMarkInstanceById(targetMarkInstanceId);
    if (mark) {
      const path = await context.repositories.paths.getPathById(mark.pathId);
      const mapped = mapPathToUiPathId(path?.slug, path?.title);
      if (mapped) {
        return mapped;
      }
    }
  }

  if (templateId) {
    const template = await context.repositories.packChecks.getTemplateById(templateId);
    if (template?.pathId) {
      const path = await context.repositories.paths.getPathById(template.pathId);
      const mapped = mapPathToUiPathId(path?.slug, path?.title);
      if (mapped) {
        return mapped;
      }
    }
  }

  if (trailDayId) {
    const trailDay = await context.repositories.trailDays.getTrailDayById(trailDayId);
    if (trailDay?.anchorPathId) {
      const path = await context.repositories.paths.getPathById(trailDay.anchorPathId);
      const mapped = mapPathToUiPathId(path?.slug, path?.title);
      if (mapped) {
        return mapped;
      }
    }
  }

  void packCheckInstanceId;
  return inferPathFromTitle(title);
}

function inferPathFromTitle(title: string): ShellPathId {
  const normalized = normalize(title);
  if (normalized.includes("gym") || normalized.includes("strength") || normalized.includes("body")) {
    return "health";
  }
  if (normalized.includes("desk") || normalized.includes("office") || normalized.includes("career")) {
    return "career";
  }
  if (normalized.includes("home") || normalized.includes("family")) {
    return "family";
  }
  if (normalized.includes("golf") || normalized.includes("snag")) {
    return normalized.includes("snag") ? "snag" : "golf";
  }
  return "character";
}

function findPathByUiPathId(paths: Array<{ id: string; slug: string; title: string }>, uiPathId: ShellPathId) {
  return paths.find((path) => mapPathToUiPathId(path.slug, path.title) === uiPathId) ?? null;
}

function mapPathToUiPathId(slug?: string, title?: string): ShellPathId | null {
  const slugNormalized = normalize(slug);
  const titleNormalized = normalize(title);

  for (const path of todayPathHeroPaths) {
    if (
      slugNormalized === normalize(path.id) ||
      titleNormalized === normalize(path.label.en) ||
      titleNormalized === normalize(path.label.vi) ||
      titleNormalized === normalize(path.compactLabel.en) ||
      titleNormalized === normalize(path.compactLabel.vi)
    ) {
      return path.id;
    }
  }

  return null;
}

function formatLocalDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function normalize(value?: string) {
  return (
    value
      ?.normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim() ?? ""
  );
}
