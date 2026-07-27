import {
  ExerciseSetLog,
  MarkInstanceOrigin,
  MarkInstanceStatus,
  SessionExerciseSnapshot,
  SessionExerciseStatus,
  WaymarkRepositories,
  WorkoutRoutineTemplate,
  WorkoutRoutineType,
  WorkoutSessionPhase,
  WorkoutSessionStatus,
} from "../../domain/waymark";
import type { EntityId, ISODateTimeString } from "../../domain/waymark";
import type {
  GolfClub,
  GolfPracticeHistory,
  GolfPracticeHistoryItem,
  GolfPracticeMode,
  GolfPuttingSetInput,
  GolfRepResult,
  GolfShortGameSetInput,
  GolfShotType,
  GolfSwingSetInput,
  GolfWorkoutType,
  SaveGolfPracticeLogInput,
} from "../../types/golfPractice";

type GolfLogMetadata =
  | {
      kind: "golf_putting";
      workoutType: "putting";
      distanceCm: number;
      reps: number;
      hits: number;
      misses: number;
      repResults?: GolfRepResult[];
      hitRate: number;
      note?: string;
    }
  | {
      kind: "golf_swing";
      workoutType: "swing";
      club: GolfClub;
      shotType: GolfShotType;
      practiceMode: GolfPracticeMode;
      reps: number;
      distancesYards?: number[];
      averageDistanceYards?: number;
      formScores?: number[];
      coachScore?: number;
      note?: string;
    }
  | {
      kind: "golf_short_game";
      workoutType: "putting";
      setNumber: number;
      label: string;
      distanceLabel: string;
      landingZoneLabel?: string;
      reps: number;
      hits: number;
      misses: number;
      repResults?: GolfRepResult[];
      hitRate: number;
      note?: string;
    }
  | {
      kind: "golf_warmup";
      workoutType: GolfWorkoutType;
      warmupCompleted: boolean;
    };

const PUTTING_DISTANCES: Array<60 | 90 | 120 | 150 | 180> = [60, 90, 120, 150, 180];

function generateEntityId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(input?: ISODateTimeString): ISODateTimeString {
  return input ?? new Date().toISOString();
}

function average(values: number[]): number | undefined {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((total, value) => total + value, 0) / valid.length : undefined;
}

function hitRate(hits: number, reps: number): number {
  return reps > 0 ? hits / reps : 0;
}

function isGolfPathTitle(slug: string, title: string): boolean {
  return slug === "golf-craft" || slug === "golf" || title.toLowerCase() === "golf craft";
}

async function requireGolfPathId(repositories: WaymarkRepositories, userId: EntityId): Promise<EntityId> {
  const paths = await repositories.paths.listActivePaths(userId);
  const path = paths.find((item) => isGolfPathTitle(item.slug, item.title));
  if (!path) {
    throw new Error("Golf Craft path is not available.");
  }
  return path.id;
}

async function requireGolfRoutine(
  repositories: WaymarkRepositories,
  pathId: EntityId,
  workoutType: GolfWorkoutType,
): Promise<WorkoutRoutineTemplate> {
  const titles = workoutType === "putting" ? ["Golf Practice Short Game", "Golf Practice Putting"] : ["Golf Practice Swing"];
  const routine = (await repositories.strength.listRoutinesByPath(pathId)).find(
    (item) => item.isActive && item.routineType === WorkoutRoutineType.GolfPractice && titles.includes(item.title),
  );
  if (!routine) {
    throw new Error(`${titles[0]} routine is not available.`);
  }
  return routine;
}

function buildSessionNotes(input: SaveGolfPracticeLogInput): string {
  return JSON.stringify({
    kind: "golf_practice",
    workoutType: input.workoutType,
    warmupCompleted: input.warmupCompleted,
    note: input.note,
    progressionMode: "log_only",
    progressionStep: 0,
  });
}

async function createSnapshotsForRoutine(
  repositories: WaymarkRepositories,
  routine: WorkoutRoutineTemplate,
  workoutSessionInstanceId: EntityId,
  completedAt: ISODateTimeString,
): Promise<SessionExerciseSnapshot[]> {
  const routineExercises = await repositories.strength.listRoutineExercises(routine.id);
  const snapshots: SessionExerciseSnapshot[] = [];
  for (const routineExercise of routineExercises) {
    const definition = await repositories.strength.getExerciseDefinitionById(routineExercise.exerciseDefinitionId);
    if (!definition) {
      throw new Error(`Missing exercise definition ${routineExercise.exerciseDefinitionId}.`);
    }
    snapshots.push({
      id: generateEntityId("session_exercise_snapshot"),
      workoutSessionInstanceId,
      routineExerciseTemplateId: routineExercise.id,
      exerciseDefinitionId: routineExercise.exerciseDefinitionId,
      exerciseNameSnapshot: definition.title,
      phase: routineExercise.phase,
      orderIndex: routineExercise.orderIndex,
      targetType: routineExercise.targetType,
      targetLoadKg: routineExercise.targetLoadKg,
      targetReps: routineExercise.targetReps,
      targetSets: routineExercise.targetSets,
      targetDurationSec: routineExercise.targetDurationSec,
      targetDistanceM: routineExercise.targetDistanceM,
      targetSteps: routineExercise.targetSteps,
      wasOverridden: false,
      status: SessionExerciseStatus.Completed,
      startedAt: completedAt,
      completedAt,
      createdAt: completedAt,
      updatedAt: completedAt,
    });
  }
  return repositories.strength.upsertSessionSnapshots(snapshots);
}

function buildWarmupLogs(
  snapshots: SessionExerciseSnapshot[],
  workoutType: GolfWorkoutType,
  warmupCompleted: boolean,
  completedAt: ISODateTimeString,
): ExerciseSetLog[] {
  return snapshots
    .filter((snapshot) => snapshot.orderIndex < 6)
    .map((snapshot) => ({
      id: generateEntityId("exercise_set_log"),
      sessionExerciseSnapshotId: snapshot.id,
      setNumber: 1,
      actualReps: snapshot.targetReps,
      completed: warmupCompleted,
      metadata: { kind: "golf_warmup", workoutType, warmupCompleted } satisfies GolfLogMetadata,
      completedAt,
      createdAt: completedAt,
      updatedAt: completedAt,
    }));
}

function buildPuttingLogs(
  snapshots: SessionExerciseSnapshot[],
  sets: GolfPuttingSetInput[],
  completedAt: ISODateTimeString,
): ExerciseSetLog[] {
  const snapshotByDistance = new Map<number, SessionExerciseSnapshot>();
  for (const snapshot of snapshots.filter((item) => item.orderIndex >= 6)) {
    const distance = PUTTING_DISTANCES.find((item) => snapshot.exerciseNameSnapshot.includes(`${item} cm`));
    if (distance) {
      snapshotByDistance.set(distance, snapshot);
    }
  }

  return sets.map((set) => {
    const reps = Math.max(set.reps, set.hits + set.misses);
    const snapshot = snapshotByDistance.get(set.distanceCm);
    if (!snapshot) {
      throw new Error(`Missing putting snapshot for ${set.distanceCm} cm.`);
    }
    return {
      id: generateEntityId("exercise_set_log"),
      sessionExerciseSnapshotId: snapshot.id,
      setNumber: 1,
      actualReps: reps,
      completed: true,
      metadata: {
        kind: "golf_putting",
        workoutType: "putting",
        distanceCm: set.distanceCm,
        reps,
        hits: set.hits,
        misses: set.misses,
        repResults: set.repResults,
        hitRate: hitRate(set.hits, reps),
        note: set.note,
      } satisfies GolfLogMetadata,
      completedAt,
      createdAt: completedAt,
      updatedAt: completedAt,
    };
  });
}

function buildShortGameLogs(
  snapshots: SessionExerciseSnapshot[],
  sets: GolfShortGameSetInput[],
  completedAt: ISODateTimeString,
): ExerciseSetLog[] {
  const practiceSnapshots = snapshots.filter((snapshot) => snapshot.orderIndex >= 6);
  return sets.map((set, index) => {
    const reps = Math.max(set.reps, set.hits + set.misses);
    const snapshot = practiceSnapshots[index] ?? practiceSnapshots[practiceSnapshots.length - 1];
    if (!snapshot) {
      throw new Error("Missing short game practice snapshots.");
    }
    return {
      id: generateEntityId("exercise_set_log"),
      sessionExerciseSnapshotId: snapshot.id,
      setNumber: set.setNumber,
      actualReps: reps,
      completed: true,
      metadata: {
        kind: "golf_short_game",
        workoutType: "putting",
        setNumber: set.setNumber,
        label: set.label,
        distanceLabel: set.distanceLabel,
        landingZoneLabel: set.landingZoneLabel,
        reps,
        hits: set.hits,
        misses: set.misses,
        repResults: set.repResults,
        hitRate: hitRate(set.hits, reps),
        note: set.note,
      } satisfies GolfLogMetadata,
      completedAt,
      createdAt: completedAt,
      updatedAt: completedAt,
    };
  });
}

function buildSwingLogs(
  snapshots: SessionExerciseSnapshot[],
  sets: GolfSwingSetInput[],
  completedAt: ISODateTimeString,
): ExerciseSetLog[] {
  const swingSnapshots = snapshots.filter((snapshot) => snapshot.orderIndex >= 6);
  return sets.map((set, index) => {
    const snapshot = swingSnapshots[index] ?? swingSnapshots[swingSnapshots.length - 1];
    if (!snapshot) {
      throw new Error("Missing swing practice snapshots.");
    }
    const averageDistanceYards = set.distancesYards ? average(set.distancesYards) : undefined;
    const averageFormScore = set.formScores ? average(set.formScores) : undefined;
    return {
      id: generateEntityId("exercise_set_log"),
      sessionExerciseSnapshotId: snapshot.id,
      setNumber: 1,
      actualReps: set.reps,
      completed: true,
      metadata: {
        kind: "golf_swing",
        workoutType: "swing",
        club: set.club,
        shotType: set.shotType,
        practiceMode: set.practiceMode,
        reps: set.reps,
        distancesYards: set.practiceMode === "distance" ? set.distancesYards : undefined,
        averageDistanceYards: set.practiceMode === "distance" ? averageDistanceYards : undefined,
        formScores: set.practiceMode === "form" ? set.formScores : undefined,
        coachScore: set.practiceMode === "form" ? averageFormScore ?? set.coachScore : undefined,
        note: set.note,
      } satisfies GolfLogMetadata,
      completedAt,
      createdAt: completedAt,
      updatedAt: completedAt,
    };
  });
}

export async function saveGolfPracticeLog(
  repositories: WaymarkRepositories,
  userId: EntityId,
  input: SaveGolfPracticeLogInput,
): Promise<{ markId: EntityId; workoutSessionInstanceId: EntityId }> {
  const completedAt = nowIso(input.completedAt);
  const existingMark = input.markInstanceId ? await repositories.marks.getMarkInstanceById(input.markInstanceId) : null;
  if (input.markInstanceId && !existingMark) {
    throw new Error("Golf Practice mark is not available.");
  }
  if (existingMark && existingMark.userId !== userId) {
    throw new Error("Golf Practice mark does not belong to the current user.");
  }
  const pathId = existingMark?.pathId ?? (await requireGolfPathId(repositories, userId));
  const routine = await requireGolfRoutine(repositories, pathId, input.workoutType);
  const trailDay = await repositories.trailDays.getOrCreateTrailDay(userId, completedAt.slice(0, 10));
  const title = input.workoutType === "putting" ? "Golf Practice Short Game" : "Golf Practice Swing";

  return repositories.transaction.runInTransaction(async (repos) => {
    const mark = existingMark
      ? await repos.marks.updateMarkInstance(existingMark.id, {
          description: input.note ?? existingMark.description,
          status: MarkInstanceStatus.Completed,
          completedAt,
          completionSummary: input.workoutType === "putting" ? "Short game practice logged." : "Swing practice logged.",
        })
      : await repos.marks.createMarkInstance({
          userId,
          pathId,
          trailDayId: trailDay.id,
          title,
          description: input.note,
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Completed,
          completedAt,
          completionSummary: input.workoutType === "putting" ? "Short game practice logged." : "Swing practice logged.",
        });

    const session = await repos.strength.upsertSession({
      id: generateEntityId("workout_session"),
      userId,
      markInstanceId: mark.id,
      routineTemplateId: routine.id,
      status: WorkoutSessionStatus.Completed,
      phase: WorkoutSessionPhase.Complete,
      startedAt: completedAt,
      completedAt,
      notes: buildSessionNotes(input),
      createdAt: completedAt,
      updatedAt: completedAt,
    });

    const snapshots = await createSnapshotsForRoutine(repos, routine, session.id, completedAt);
    const logs = [
      ...buildWarmupLogs(snapshots, input.workoutType, input.warmupCompleted, completedAt),
      ...(input.workoutType === "putting" && (input.shortGameSets?.length ?? 0) > 0
        ? buildShortGameLogs(snapshots, input.shortGameSets ?? [], completedAt)
        : input.workoutType === "putting"
          ? buildPuttingLogs(snapshots, input.puttingSets ?? [], completedAt)
          : []),
      ...(input.workoutType === "swing" ? buildSwingLogs(snapshots, input.swingSets ?? [], completedAt) : []),
    ];
    await repos.strength.upsertSetLogs(logs);

    return { markId: mark.id, workoutSessionInstanceId: session.id };
  });
}

function parseGolfSessionNotes(notes?: string): { workoutType?: GolfWorkoutType } {
  if (!notes) {
    return {};
  }
  try {
    const parsed = JSON.parse(notes) as { kind?: string; workoutType?: GolfWorkoutType };
    return parsed?.kind === "golf_practice" ? parsed : {};
  } catch {
    return {};
  }
}

function isGolfLogMetadata(value: unknown): value is GolfLogMetadata {
  return Boolean(value && typeof value === "object" && "kind" in value && String((value as { kind?: unknown }).kind).startsWith("golf_"));
}

export async function loadGolfPracticeHistory(
  repositories: WaymarkRepositories,
  userId: EntityId,
  daysBack = 90,
): Promise<GolfPracticeHistory> {
  const pathId = await requireGolfPathId(repositories, userId);
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - daysBack);
  const trailDays = await repositories.trailDays.listTrailDaysInRange(userId, start.toISOString().slice(0, 10), today.toISOString().slice(0, 10));

  const items: GolfPracticeHistoryItem[] = [];
  const putting = new Map<number, { hits: number; reps: number }>();
  const swingDistance = new Map<string, { club: GolfClub; shotType: GolfShotType; yards: number[]; reps: number }>();
  const swingForm = new Map<string, { club: GolfClub; shotType: GolfShotType; scores: number[] }>();

  for (const trailDay of trailDays) {
    const marks = (await repositories.marks.listMarkInstancesByTrailDay(trailDay.id)).filter(
      (mark) => mark.pathId === pathId && mark.status === MarkInstanceStatus.Completed,
    );
    for (const mark of marks) {
      const session = await repositories.strength.getSessionByMarkInstance(mark.id);
      if (!session) {
        continue;
      }
      const routine = await repositories.strength.getRoutineById(session.routineTemplateId);
      if (routine?.routineType !== WorkoutRoutineType.GolfPractice) {
        continue;
      }
      const notes = parseGolfSessionNotes(session.notes);
      const snapshots = await repositories.strength.listSessionSnapshots(session.id);
      const logs = (
        await Promise.all(snapshots.map((snapshot) => repositories.strength.listSetLogs(snapshot.id)))
      ).flat();

      for (const log of logs) {
        const metadata = log.metadata;
        if (!isGolfLogMetadata(metadata)) {
          continue;
        }
        if (metadata.kind === "golf_putting") {
          const current = putting.get(metadata.distanceCm) ?? { hits: 0, reps: 0 };
          current.hits += metadata.hits;
          current.reps += metadata.reps;
          putting.set(metadata.distanceCm, current);
        }
        if (metadata.kind === "golf_swing" && metadata.practiceMode === "distance" && metadata.distancesYards?.length) {
          const key = `${metadata.club}:${metadata.shotType}`;
          const current = swingDistance.get(key) ?? { club: metadata.club, shotType: metadata.shotType, yards: [], reps: 0 };
          current.yards.push(...metadata.distancesYards);
          current.reps += metadata.reps;
          swingDistance.set(key, current);
        }
        if (metadata.kind === "golf_swing" && metadata.practiceMode === "form" && ((metadata.formScores?.length ?? 0) > 0 || typeof metadata.coachScore === "number")) {
          const key = `${metadata.club}:${metadata.shotType}`;
          const current = swingForm.get(key) ?? { club: metadata.club, shotType: metadata.shotType, scores: [] };
          if (metadata.formScores?.length) {
            current.scores.push(...metadata.formScores);
          } else if (typeof metadata.coachScore === "number") {
            current.scores.push(metadata.coachScore);
          }
          swingForm.set(key, current);
        }
      }

      items.push({
        id: session.id,
        markId: mark.id,
        completedAt: session.completedAt ?? mark.completedAt ?? mark.updatedAt,
        workoutType: notes.workoutType ?? (routine.title.includes("Putting") || routine.title.includes("Short Game") ? "putting" : "swing"),
        title: mark.title,
        summary: summarizeGolfLogs(logs),
      });
    }
  }

  return {
    items: items.sort((left, right) => right.completedAt.localeCompare(left.completedAt)).slice(0, 10),
    puttingByDistance: [...putting.entries()]
      .sort(([left], [right]) => left - right)
      .map(([distanceCm, value]) => ({ distanceCm, hits: value.hits, reps: value.reps, hitRate: hitRate(value.hits, value.reps) })),
    swingDistanceAverages: [...swingDistance.values()].map((value) => ({
      club: value.club,
      shotType: value.shotType,
      averageYards: average(value.yards) ?? 0,
      reps: value.reps,
    })),
    swingFormAverages: [...swingForm.values()].map((value) => ({
      club: value.club,
      shotType: value.shotType,
      averageCoachScore: average(value.scores) ?? 0,
      sets: value.scores.length,
    })),
  };
}

function summarizeGolfLogs(logs: ExerciseSetLog[]): string {
  const shortGameLogs = logs.map((log) => log.metadata).filter((item): item is Extract<GolfLogMetadata, { kind: "golf_short_game" }> => isGolfLogMetadata(item) && item.kind === "golf_short_game");
  if (shortGameLogs.length > 0) {
    const hits = shortGameLogs.reduce((total, item) => total + item.hits, 0);
    const reps = shortGameLogs.reduce((total, item) => total + item.reps, 0);
    const distances = [...new Set(shortGameLogs.map((item) => item.distanceLabel))].join("/");
    return `${hits}/${reps} chips (${Math.round(hitRate(hits, reps) * 100)}%)${distances ? ` · ${distances}` : ""}`;
  }

  const puttingLogs = logs.map((log) => log.metadata).filter((item): item is Extract<GolfLogMetadata, { kind: "golf_putting" }> => isGolfLogMetadata(item) && item.kind === "golf_putting");
  if (puttingLogs.length > 0) {
    const hits = puttingLogs.reduce((total, item) => total + item.hits, 0);
    const reps = puttingLogs.reduce((total, item) => total + item.reps, 0);
    return `${hits}/${reps} putts (${Math.round(hitRate(hits, reps) * 100)}%)`;
  }

  const swingLogs = logs.map((log) => log.metadata).filter((item): item is Extract<GolfLogMetadata, { kind: "golf_swing" }> => isGolfLogMetadata(item) && item.kind === "golf_swing");
  const distanceLogs = swingLogs.filter((item) => item.practiceMode === "distance");
  if (distanceLogs.length > 0) {
    const yards = distanceLogs.flatMap((item) => item.distancesYards ?? []);
    return `${yards.length} swings, ${Math.round(average(yards) ?? 0)} yd avg`;
  }
  const formScores = swingLogs.flatMap((item) => item.formScores?.length ? item.formScores : typeof item.coachScore === "number" ? [item.coachScore] : []);
  return formScores.length > 0 ? `${formScores.length} swings, ${Math.round((average(formScores) ?? 0) * 10) / 10}/10 avg` : "Golf practice logged";
}
