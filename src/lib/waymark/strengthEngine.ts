import {
  AbandonWorkoutSessionInput,
  ApplyProgressionUpdatesInput,
  CompleteCooldownInput,
  CompleteExerciseSetInput,
  CompleteRestInput,
  CompleteWorkoutSessionInput,
  CompleteWorkoutSessionResult,
  CreateSessionSnapshotsInput,
  EndWorkoutSessionInput,
  EndWorkoutSessionResult,
  EntityId,
  EnterCooldownInput,
  EvaluateExerciseResultInput,
  EvaluateWorkoutProgressionInput,
  ExerciseDefinition,
  ExerciseProgressState,
  ExerciseProgressionEvaluation,
  ExerciseSetLog,
  ExerciseTargetType,
  ISODateTimeString,
  MarkInstance,
  MarkInstanceStatus,
  OverrideSessionExerciseTargetInput,
  ResetWorkoutSessionInput,
  RoutineExerciseTemplate,
  SessionExerciseSnapshot,
  SessionExerciseStatus,
  SkipRestInput,
  StartExerciseInput,
  StartSetInput,
  StartWorkoutSessionInput,
  StrengthProgressionService,
  StrengthSessionEngine,
  WorkoutCycleStep,
  WorkoutRoutineTemplate,
  WorkoutSessionInstance,
  WorkoutSessionPhase,
  WorkoutSessionStatus,
  WorkoutRoutineType,
  WaymarkRepositories,
  WorkoutExercisePhase,
} from "../../domain/waymark";
import { createMarkEngine } from "./markEngine";
import { resolveRoutineBinding, RoutineBindingResolutionError } from "./routineBindingResolver";

const WORKOUT_SESSION_STATUS_DISPLAY_LABELS: Record<WorkoutSessionStatus, string> = {
  [WorkoutSessionStatus.NotStarted]: "Not Started",
  [WorkoutSessionStatus.WarmingUp]: "Warming Up",
  [WorkoutSessionStatus.Active]: "Active",
  [WorkoutSessionStatus.ExerciseActive]: "Exercise Active",
  [WorkoutSessionStatus.SetActive]: "Set Active",
  [WorkoutSessionStatus.Resting]: "Resting",
  [WorkoutSessionStatus.Cooldown]: "Cooldown",
  [WorkoutSessionStatus.Completed]: "Completed",
  [WorkoutSessionStatus.PartiallyCompleted]: "Partial Complete",
  [WorkoutSessionStatus.Abandoned]: "Abandoned",
};

const WORKOUT_SESSION_TRANSITIONS: Record<WorkoutSessionStatus, ReadonlySet<WorkoutSessionStatus>> = {
  [WorkoutSessionStatus.NotStarted]: new Set([WorkoutSessionStatus.Active]),
  [WorkoutSessionStatus.WarmingUp]: new Set(),
  [WorkoutSessionStatus.Active]: new Set([
    WorkoutSessionStatus.ExerciseActive,
    WorkoutSessionStatus.Cooldown,
    WorkoutSessionStatus.PartiallyCompleted,
    WorkoutSessionStatus.Abandoned,
  ]),
  [WorkoutSessionStatus.ExerciseActive]: new Set([
    WorkoutSessionStatus.SetActive,
    WorkoutSessionStatus.Cooldown,
    WorkoutSessionStatus.PartiallyCompleted,
    WorkoutSessionStatus.Abandoned,
  ]),
  [WorkoutSessionStatus.SetActive]: new Set([
    WorkoutSessionStatus.Resting,
    WorkoutSessionStatus.Active,
    WorkoutSessionStatus.Cooldown,
    WorkoutSessionStatus.PartiallyCompleted,
    WorkoutSessionStatus.Abandoned,
  ]),
  [WorkoutSessionStatus.Resting]: new Set([
    WorkoutSessionStatus.SetActive,
    WorkoutSessionStatus.ExerciseActive,
    WorkoutSessionStatus.Cooldown,
    WorkoutSessionStatus.PartiallyCompleted,
    WorkoutSessionStatus.Abandoned,
  ]),
  [WorkoutSessionStatus.Cooldown]: new Set([
    WorkoutSessionStatus.Completed,
    WorkoutSessionStatus.PartiallyCompleted,
    WorkoutSessionStatus.Abandoned,
  ]),
  [WorkoutSessionStatus.Completed]: new Set(),
  [WorkoutSessionStatus.PartiallyCompleted]: new Set(),
  [WorkoutSessionStatus.Abandoned]: new Set(),
};

type SessionNoteMeta = {
  acceptForProgressionBySnapshotId?: Record<string, boolean>;
  freeformNote?: string;
};

type ProgressionRule = {
  thresholdSessions: number;
  loadIncrementKg?: number;
  repIncrement?: number;
  durationIncrementSec?: number;
  capReps?: number;
  capDurationSec?: number;
};

export class InvalidWorkoutSessionTransitionError extends Error {
  constructor(from: WorkoutSessionStatus, to: WorkoutSessionStatus) {
    super(`Invalid WorkoutSession status transition ${from} -> ${to}.`);
    this.name = "InvalidWorkoutSessionTransitionError";
  }
}

export class StrengthEngineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StrengthEngineValidationError";
  }
}

export function getWorkoutSessionStatusDisplayLabel(status: WorkoutSessionStatus): string {
  return WORKOUT_SESSION_STATUS_DISPLAY_LABELS[status];
}

export function getWorkoutCycleStep(cycleIndex: number): WorkoutCycleStep {
  const steps: WorkoutCycleStep[] = [
    { cycleIndex: 0, kind: "day_a_strength", title: "Day A1 Strength", routineTitle: "Day A1 Strength" },
    { cycleIndex: 1, kind: "day_b_strength", title: "Day B Strength", routineTitle: "Day B Strength" },
    { cycleIndex: 2, kind: "walk_day", title: "Walk Day", routineTitle: "Walk Day" },
    { cycleIndex: 3, kind: "day_a_strength", title: "Day A2 Strength", routineTitle: "Day A2 Strength" },
    { cycleIndex: 4, kind: "day_b_strength", title: "Day B Strength", routineTitle: "Day B Strength" },
    { cycleIndex: 5, kind: "walk_day", title: "Walk Day", routineTitle: "Walk Day" },
    { cycleIndex: 6, kind: "walk_day", title: "Walk Day", routineTitle: "Walk Day" },
  ];
  return steps[((cycleIndex % steps.length) + steps.length) % steps.length]!;
}

export function isWorkoutSessionFinalStatus(status: WorkoutSessionStatus): boolean {
  return (
    status === WorkoutSessionStatus.Completed ||
    status === WorkoutSessionStatus.PartiallyCompleted ||
    status === WorkoutSessionStatus.Abandoned
  );
}

export function isWorkoutSessionActiveStatus(status: WorkoutSessionStatus): boolean {
  return (
    status === WorkoutSessionStatus.Active ||
    status === WorkoutSessionStatus.ExerciseActive ||
    status === WorkoutSessionStatus.SetActive ||
    status === WorkoutSessionStatus.Resting ||
    status === WorkoutSessionStatus.Cooldown
  );
}

export function canStartWorkoutSession(session: WorkoutSessionInstance): boolean {
  return !isWorkoutSessionFinalStatus(session.status) && session.status === WorkoutSessionStatus.NotStarted;
}

export function canCompleteSet(session: WorkoutSessionInstance, snapshot: SessionExerciseSnapshot): boolean {
  return (
    !isWorkoutSessionFinalStatus(session.status) &&
    snapshot.status !== SessionExerciseStatus.Completed &&
    session.status === WorkoutSessionStatus.SetActive
  );
}

export function canEnterCooldown(session: WorkoutSessionInstance): boolean {
  return (
    !isWorkoutSessionFinalStatus(session.status) &&
    (session.status === WorkoutSessionStatus.ExerciseActive ||
      session.status === WorkoutSessionStatus.Resting ||
      session.status === WorkoutSessionStatus.Active)
  );
}

export function canCompleteWorkoutSession(session: WorkoutSessionInstance): boolean {
  return !isWorkoutSessionFinalStatus(session.status) && session.status === WorkoutSessionStatus.Cooldown;
}

function isPristineSessionStatus(status: WorkoutSessionStatus): boolean {
  return (
    status === WorkoutSessionStatus.NotStarted ||
    status === WorkoutSessionStatus.Active ||
    status === WorkoutSessionStatus.ExerciseActive ||
    status === WorkoutSessionStatus.SetActive
  );
}

function canTransitionWorkoutSessionStatus(from: WorkoutSessionStatus, to: WorkoutSessionStatus): boolean {
  if (from === to) {
    return true;
  }
  return WORKOUT_SESSION_TRANSITIONS[from]?.has(to) ?? false;
}

function assertValidWorkoutSessionTransition(from: WorkoutSessionStatus, to: WorkoutSessionStatus): void {
  if (!canTransitionWorkoutSessionStatus(from, to)) {
    throw new InvalidWorkoutSessionTransitionError(from, to);
  }
}

function nowIso(input?: ISODateTimeString): ISODateTimeString {
  return input ?? new Date().toISOString();
}

function generateEntityId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseSessionNoteMeta(notes?: string): SessionNoteMeta {
  if (!notes) {
    return {};
  }
  try {
    const parsed = JSON.parse(notes) as SessionNoteMeta;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return { freeformNote: notes };
  }
}

function stringifySessionNoteMeta(meta: SessionNoteMeta): string | undefined {
  if (!meta.acceptForProgressionBySnapshotId && !meta.freeformNote) {
    return undefined;
  }
  return JSON.stringify(meta);
}

function withUpdatedSessionNoteMeta(
  session: WorkoutSessionInstance,
  mutate: (meta: SessionNoteMeta) => SessionNoteMeta,
): string | undefined {
  return stringifySessionNoteMeta(mutate(parseSessionNoteMeta(session.notes)));
}

function getAcceptanceFlag(session: WorkoutSessionInstance, snapshotId: EntityId): boolean {
  return parseSessionNoteMeta(session.notes).acceptForProgressionBySnapshotId?.[snapshotId] === true;
}

function getPrimaryTargetValue(snapshot: SessionExerciseSnapshot): number | undefined {
  switch (snapshot.targetType) {
    case ExerciseTargetType.RepsLoad:
      return snapshot.targetLoadKg;
    case ExerciseTargetType.RepsOnly:
      return snapshot.targetReps;
    case ExerciseTargetType.Timed:
      return snapshot.targetDurationSec;
    case ExerciseTargetType.WalkDistance:
      return snapshot.targetDistanceM;
    case ExerciseTargetType.Steps:
      return snapshot.targetSteps;
    default:
      return undefined;
  }
}

function getTargetSetCount(snapshot: SessionExerciseSnapshot): number {
  return Math.max(snapshot.targetSets ?? 1, 1);
}

function isMainPhase(phase: WorkoutExercisePhase): boolean {
  return phase === WorkoutExercisePhase.Strength || phase === WorkoutExercisePhase.Walk;
}

function isCooldownPhase(phase: WorkoutExercisePhase): boolean {
  return phase === WorkoutExercisePhase.Cooldown || phase === WorkoutExercisePhase.Stretch;
}

function getCompletedLogCount(logs: ExerciseSetLog[]): number {
  return logs.filter((log) => log.completed).length;
}

function getOrderedSnapshots(snapshots: SessionExerciseSnapshot[]): SessionExerciseSnapshot[] {
  return [...snapshots].sort((left, right) => left.orderIndex - right.orderIndex || left.createdAt.localeCompare(right.createdAt));
}

export function evaluateWorkoutEndDisposition(snapshots: SessionExerciseSnapshot[]): {
  disposition: "abandoned" | "partially_completed";
  completedMainExerciseCount: number;
  requiredCompletedMainExerciseCount: number;
} {
  const firstMainSnapshots = getOrderedSnapshots(snapshots).filter((snapshot) => isMainPhase(snapshot.phase)).slice(0, 2);
  const completedMainExerciseCount = firstMainSnapshots.filter(
    (snapshot) => snapshot.status === SessionExerciseStatus.Completed,
  ).length;
  const requiredCompletedMainExerciseCount = 2;
  return {
    disposition:
      requiredCompletedMainExerciseCount > 0 && completedMainExerciseCount >= requiredCompletedMainExerciseCount ?
        "partially_completed"
      : "abandoned",
    completedMainExerciseCount,
    requiredCompletedMainExerciseCount,
  };
}

function getProgressionRuleForExercise(
  exerciseDefinition: ExerciseDefinition,
  routineExerciseTemplate?: RoutineExerciseTemplate | null,
): ProgressionRule | null {
  const policy = routineExerciseTemplate?.progressionPolicy;
  if (policy) {
    return {
      thresholdSessions: Math.max(policy.successfulSessionsRequired ?? policy.minimumCompletedSets ?? 1, 1),
      loadIncrementKg: policy.loadIncrementKg,
      durationIncrementSec: policy.durationIncrementSec,
      repIncrement: policy.repIncrement ?? (policy.repCeiling ? 1 : undefined),
      capReps: policy.repCeiling,
      capDurationSec: policy.durationCeilingSec,
    };
  }

  const slug = normalizeText(exerciseDefinition.canonicalSlug || exerciseDefinition.title);
  if (slug.includes("barbell squat") || slug.includes("squat")) {
    return { thresholdSessions: 2, loadIncrementKg: 2.5 };
  }
  if (slug.includes("bench press") || slug.includes("bench")) {
    return { thresholdSessions: 2, loadIncrementKg: 2.5 };
  }
  if (slug.includes("pallof press") || slug.includes("pallof")) {
    return { thresholdSessions: 3, loadIncrementKg: 5 };
  }
  if (slug.includes("standing barbell military press") || slug.includes("military press") || slug.includes("press")) {
    return { thresholdSessions: 3, loadIncrementKg: 2.5 };
  }
  if (slug.includes("plank")) {
    return { thresholdSessions: 1, durationIncrementSec: 1, capDurationSec: 120 };
  }
  if (slug.includes("deadlift")) {
    return { thresholdSessions: 1, loadIncrementKg: 2.5 };
  }
  if (slug.includes("ab wheel") || slug.includes("ab wheel rollout") || slug.includes("rollout")) {
    return { thresholdSessions: 1, repIncrement: 1, capReps: 30 };
  }
  return null;
}

function evaluateSnapshotSuccess(snapshot: SessionExerciseSnapshot, logs: ExerciseSetLog[]): boolean {
  const ordered = [...logs].sort((left, right) => left.setNumber - right.setNumber);
  const targetSetCount = getTargetSetCount(snapshot);
  if (ordered.length < targetSetCount) {
    return false;
  }

  const workLogs = ordered.slice(0, targetSetCount);
  switch (snapshot.targetType) {
    case ExerciseTargetType.RepsLoad:
      return workLogs.every(
        (log) =>
          log.completed &&
          (log.actualLoadKg ?? 0) >= (snapshot.targetLoadKg ?? 0) &&
          (log.actualReps ?? 0) >= (snapshot.targetReps ?? 0),
      );
    case ExerciseTargetType.RepsOnly:
      return workLogs.every((log) => log.completed && (log.actualReps ?? 0) >= (snapshot.targetReps ?? 0));
    case ExerciseTargetType.Timed:
      return workLogs.every((log) => log.completed && (log.actualDurationSec ?? 0) >= (snapshot.targetDurationSec ?? 0));
    case ExerciseTargetType.WalkDistance:
      return workLogs.every((log) => log.completed && (log.actualDistanceM ?? 0) >= (snapshot.targetDistanceM ?? 0));
    case ExerciseTargetType.Steps:
      return workLogs.every((log) => log.completed && (log.actualSteps ?? 0) >= (snapshot.targetSteps ?? 0));
    default:
      return false;
  }
}

function getLatestCompletedWorkSetLoadKg(snapshot: SessionExerciseSnapshot, logs: ExerciseSetLog[]): number | undefined {
  const targetSetCount = getTargetSetCount(snapshot);
  return [...logs]
    .sort((left, right) => left.setNumber - right.setNumber)
    .slice(0, targetSetCount)
    .filter((log) => log.completed && typeof log.actualLoadKg === "number")
    .at(-1)?.actualLoadKg;
}

class DefaultStrengthProgressionService implements StrengthProgressionService {
  constructor(private readonly repositories: WaymarkRepositories) {}

  async createSessionExerciseSnapshots(input: CreateSessionSnapshotsInput): Promise<SessionExerciseSnapshot[]> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const session = await this.requireSession(repos, input.workoutSessionInstanceId);
      const existing = await repos.strength.listSessionSnapshots(session.id);
      if (existing.length > 0) {
        return getOrderedSnapshots(existing);
      }

      const routineExercises = await repos.strength.listRoutineExercises(session.routineTemplateId);
      if (routineExercises.length === 0) {
        throw new StrengthEngineValidationError(`Routine ${session.routineTemplateId} has no exercises.`);
      }

      const snapshots: SessionExerciseSnapshot[] = [];
      for (const routineExercise of routineExercises) {
        const exerciseDefinition = await repos.strength.getExerciseDefinitionById(routineExercise.exerciseDefinitionId);
        if (!exerciseDefinition) {
          throw new StrengthEngineValidationError(
            `ExerciseDefinition ${routineExercise.exerciseDefinitionId} does not exist for routine exercise ${routineExercise.id}.`,
          );
        }

        const progressState = await repos.strength.getProgressState(session.userId, routineExercise.exerciseDefinitionId);
        snapshots.push({
          id: generateEntityId("session_exercise_snapshot"),
          workoutSessionInstanceId: session.id,
          routineExerciseTemplateId: routineExercise.id,
          exerciseDefinitionId: routineExercise.exerciseDefinitionId,
          exerciseNameSnapshot: exerciseDefinition.title,
          phase: routineExercise.phase,
          orderIndex: routineExercise.orderIndex,
          targetType: routineExercise.targetType,
          targetLoadKg: progressState?.currentTargetLoadKg ?? routineExercise.targetLoadKg,
          targetReps: progressState?.currentTargetReps ?? routineExercise.targetReps,
          targetSets: progressState?.currentTargetSets ?? routineExercise.targetSets,
          targetDurationSec: progressState?.currentTargetDurationSec ?? routineExercise.targetDurationSec,
          targetDistanceM: progressState?.currentTargetDistanceM ?? routineExercise.targetDistanceM,
          targetSteps: progressState?.currentTargetSteps ?? routineExercise.targetSteps,
          wasOverridden: false,
          status: SessionExerciseStatus.NotStarted,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
      }

      return repos.strength.upsertSessionSnapshots(snapshots);
    });
  }

  async evaluateExerciseResult(input: EvaluateExerciseResultInput): Promise<ExerciseProgressionEvaluation> {
    const success = evaluateSnapshotSuccess(input.snapshot, input.setLogs);
    const acceptedForProgression = success && (!input.snapshot.wasOverridden || input.acceptForProgression === true);
    const actualLoadBaselineKg =
      acceptedForProgression && input.snapshot.targetType === ExerciseTargetType.RepsLoad ?
        getLatestCompletedWorkSetLoadKg(input.snapshot, input.setLogs)
      : undefined;
    const baselineState =
      input.currentState ??
      ({
        id: generateEntityId("exercise_progress_state"),
        userId: "",
        exerciseDefinitionId: input.snapshot.exerciseDefinitionId,
        currentTargetLoadKg: input.routineExerciseTemplate?.targetLoadKg ?? input.snapshot.targetLoadKg,
        currentTargetReps: input.routineExerciseTemplate?.targetReps ?? input.snapshot.targetReps,
        currentTargetSets: input.routineExerciseTemplate?.targetSets ?? input.snapshot.targetSets,
        currentTargetDurationSec: input.routineExerciseTemplate?.targetDurationSec ?? input.snapshot.targetDurationSec,
        currentTargetDistanceM: input.routineExerciseTemplate?.targetDistanceM ?? input.snapshot.targetDistanceM,
        currentTargetSteps: input.routineExerciseTemplate?.targetSteps ?? input.snapshot.targetSteps,
        successCountSinceProgression: 0,
        manualOverride: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      } satisfies ExerciseProgressState);

    const latestAt =
      [...input.setLogs]
        .map((item) => item.completedAt ?? item.startedAt)
        .filter((value): value is ISODateTimeString => Boolean(value))
        .sort()
        .at(-1) ?? nowIso();

    let nextState: ExerciseProgressState = {
      ...baselineState,
      currentTargetLoadKg: actualLoadBaselineKg ?? baselineState.currentTargetLoadKg,
      lastSessionAt: latestAt,
      lastSessionResult: success ? "completed" : "failed",
      lastProgressionOutcome: "held",
      manualOverride: input.snapshot.wasOverridden,
    };

    const rule = getProgressionRuleForExercise(input.exerciseDefinition, input.routineExerciseTemplate);
    if (!success || !acceptedForProgression || !rule) {
      return {
        snapshotId: input.snapshot.id,
        exerciseDefinitionId: input.snapshot.exerciseDefinitionId,
        success,
        acceptedForProgression,
        advanced: false,
        nextState,
      };
    }

    const successCount = (baselineState.successCountSinceProgression ?? 0) + 1;
    if (successCount < rule.thresholdSessions) {
      nextState = {
        ...nextState,
        successCountSinceProgression: successCount,
      };
      return {
        snapshotId: input.snapshot.id,
        exerciseDefinitionId: input.snapshot.exerciseDefinitionId,
        success,
        acceptedForProgression,
        advanced: false,
        nextState,
      };
    }

    nextState = {
      ...nextState,
      successCountSinceProgression: 0,
      lastProgressedAt: latestAt,
      lastProgressionOutcome: "advanced",
    };

    if (rule.loadIncrementKg) {
      nextState.currentTargetLoadKg =
        (actualLoadBaselineKg ?? baselineState.currentTargetLoadKg ?? input.snapshot.targetLoadKg ?? 0) + rule.loadIncrementKg;
    }
    if (rule.repIncrement) {
      const nextReps = (baselineState.currentTargetReps ?? input.snapshot.targetReps ?? 0) + rule.repIncrement;
      nextState.currentTargetReps = rule.capReps ? Math.min(nextReps, rule.capReps) : nextReps;
    }
    if (rule.durationIncrementSec) {
      const nextDuration =
        (baselineState.currentTargetDurationSec ?? input.snapshot.targetDurationSec ?? 0) + rule.durationIncrementSec;
      nextState.currentTargetDurationSec = rule.capDurationSec ? Math.min(nextDuration, rule.capDurationSec) : nextDuration;
    }

    return {
      snapshotId: input.snapshot.id,
      exerciseDefinitionId: input.snapshot.exerciseDefinitionId,
      success,
      acceptedForProgression,
      advanced: true,
      nextState,
    };
  }

  async evaluateWorkoutProgression(input: EvaluateWorkoutProgressionInput): Promise<ExerciseProgressionEvaluation[]> {
    const session = await this.requireSession(this.repositories, input.workoutSessionInstanceId);
    const routine = await this.repositories.strength.getRoutineById(session.routineTemplateId);
    if (routine?.routineType === WorkoutRoutineType.GolfPractice) {
      return [];
    }
    const snapshots = getOrderedSnapshots(await this.repositories.strength.listSessionSnapshots(session.id));
    const evaluations: ExerciseProgressionEvaluation[] = [];

    for (const snapshot of snapshots) {
      if (isCooldownPhase(snapshot.phase)) {
        continue;
      }
      const exerciseDefinition = await this.requireExerciseDefinition(this.repositories, snapshot.exerciseDefinitionId);
      const routineExercise =
        snapshot.routineExerciseTemplateId ?
          (await this.repositories.strength.listRoutineExercises(session.routineTemplateId)).find(
            (item) => item.id === snapshot.routineExerciseTemplateId,
          ) ?? null
        : null;
      const progressState = await this.repositories.strength.getProgressState(session.userId, snapshot.exerciseDefinitionId);
      const setLogs = await this.repositories.strength.listSetLogs(snapshot.id);
      evaluations.push(
        await this.evaluateExerciseResult({
          snapshot,
          setLogs,
          currentState: progressState,
          exerciseDefinition,
          routineExerciseTemplate: routineExercise,
          acceptForProgression: getAcceptanceFlag(session, snapshot.id),
        }),
      );
    }

    return evaluations;
  }

  async applyProgressionUpdates(input: ApplyProgressionUpdatesInput): Promise<ExerciseProgressState[]> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const states: ExerciseProgressState[] = [];
      for (const update of input.updates) {
        states.push(await repos.strength.upsertExerciseProgressState(update.nextState));
      }
      return states;
    });
  }

  private async requireSession(repos: WaymarkRepositories, workoutSessionInstanceId: EntityId): Promise<WorkoutSessionInstance> {
    const session = await repos.strength.getSessionById(workoutSessionInstanceId);
    if (!session) {
      throw new StrengthEngineValidationError(`WorkoutSessionInstance ${workoutSessionInstanceId} does not exist.`);
    }
    return session;
  }

  private async requireExerciseDefinition(repos: WaymarkRepositories, exerciseDefinitionId: EntityId): Promise<ExerciseDefinition> {
    const definition = await repos.strength.getExerciseDefinitionById(exerciseDefinitionId);
    if (!definition) {
      throw new StrengthEngineValidationError(`ExerciseDefinition ${exerciseDefinitionId} does not exist.`);
    }
    return definition;
  }
}

export class DefaultStrengthSessionEngine implements StrengthSessionEngine {
  constructor(
    private readonly repositories: WaymarkRepositories,
    private readonly progressionService: StrengthProgressionService = new DefaultStrengthProgressionService(repositories),
  ) {}

  async startWorkoutSession(input: StartWorkoutSessionInput): Promise<WorkoutSessionInstance> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const mark = await this.requireMark(repos, input.markInstanceId);
      if (
        mark.status === MarkInstanceStatus.Completed ||
        mark.status === MarkInstanceStatus.Skipped ||
        mark.status === MarkInstanceStatus.Rescheduled ||
        mark.status === MarkInstanceStatus.Substituted ||
        mark.status === MarkInstanceStatus.Expired ||
        mark.status === MarkInstanceStatus.Cancelled
      ) {
        throw new StrengthEngineValidationError(`Mark ${mark.id} in status ${mark.status} cannot start a workout session.`);
      }

      const selectedRoutine = input.routineTemplateId ? await this.requireSelectableRoutineForMark(repos, mark, input.routineTemplateId) : undefined;
      const session = await this.reconcileLegacyInFlightSession(
        await this.reconcilePristineSessionForMark(
          await this.getOrCreateSessionForMark(repos, mark, selectedRoutine),
          mark,
          repos,
          selectedRoutine,
        ),
        repos,
      );
      const sessionWithCooldownSnapshots = await this.reconcileMissingCooldownSnapshots(session, repos);
      const progressionService = new DefaultStrengthProgressionService(repos);
      await progressionService.createSessionExerciseSnapshots({ workoutSessionInstanceId: sessionWithCooldownSnapshots.id });
      const started = await repos.strength.upsertSession({
        ...sessionWithCooldownSnapshots,
        status:
          sessionWithCooldownSnapshots.status === WorkoutSessionStatus.NotStarted || sessionWithCooldownSnapshots.status === WorkoutSessionStatus.WarmingUp ?
            WorkoutSessionStatus.Active
          : sessionWithCooldownSnapshots.status,
        phase: WorkoutSessionPhase.Strength,
        startedAt: sessionWithCooldownSnapshots.startedAt ?? nowIso(input.startedAt),
      });

      if (mark.status === MarkInstanceStatus.Planned || mark.status === MarkInstanceStatus.Ready) {
        await repos.marks.updateMarkInstance(mark.id, { status: MarkInstanceStatus.Active });
      }

      return started;
    });
  }

  private async reconcileLegacyInFlightSession(
    session: WorkoutSessionInstance,
    repos: WaymarkRepositories,
  ): Promise<WorkoutSessionInstance> {
    if (
      session.status !== WorkoutSessionStatus.Active &&
      session.status !== WorkoutSessionStatus.ExerciseActive
    ) {
      return session;
    }

    if (session.currentSetNumber != null) {
      return session;
    }

    const snapshots = getOrderedSnapshots(await repos.strength.listSessionSnapshots(session.id));
    const activeSnapshot =
      (session.currentExerciseSnapshotId ?
        snapshots.find((item) => item.id === session.currentExerciseSnapshotId)
      : undefined) ?? snapshots.find((item) => item.status === SessionExerciseStatus.Active);
    if (!activeSnapshot) {
      return session;
    }

    const logs = await repos.strength.listSetLogs(activeSnapshot.id);
    if (logs.length > 0) {
      return session;
    }

    if (activeSnapshot.targetType === ExerciseTargetType.Timed) {
      return repos.strength.upsertSession({
        ...session,
        currentExerciseSnapshotId: activeSnapshot.id,
        currentSetNumber: 1,
      });
    }

    return repos.strength.upsertSession({
      ...session,
      status:
        session.status === WorkoutSessionStatus.ExerciseActive ? WorkoutSessionStatus.SetActive : WorkoutSessionStatus.SetActive,
      currentExerciseSnapshotId: activeSnapshot.id,
      currentSetNumber: 1,
    });
  }

  private async reconcileMissingCooldownSnapshots(
    session: WorkoutSessionInstance,
    repos: WaymarkRepositories,
  ): Promise<WorkoutSessionInstance> {
    const existingSnapshots = getOrderedSnapshots(await repos.strength.listSessionSnapshots(session.id));
    if (existingSnapshots.length === 0) {
      return session;
    }

    const routineExercises = await repos.strength.listRoutineExercises(session.routineTemplateId);
    const existingRoutineIds = new Set(
      existingSnapshots
        .map((snapshot) => snapshot.routineExerciseTemplateId)
        .filter((value): value is EntityId => Boolean(value)),
    );
    const missingCooldownExercises = routineExercises.filter(
      (exercise) =>
        isCooldownPhase(exercise.phase) &&
        !existingRoutineIds.has(exercise.id),
    );
    if (missingCooldownExercises.length === 0) {
      return session;
    }

    const cooldownProgressExists = existingSnapshots.some(
      (snapshot) =>
        isCooldownPhase(snapshot.phase) &&
        snapshot.status !== SessionExerciseStatus.NotStarted,
    );
    if (cooldownProgressExists) {
      return session;
    }

    const snapshotsToInsert: SessionExerciseSnapshot[] = [];
    for (const routineExercise of missingCooldownExercises) {
      const exerciseDefinition = await repos.strength.getExerciseDefinitionById(routineExercise.exerciseDefinitionId);
      if (!exerciseDefinition) {
        throw new StrengthEngineValidationError(
          `ExerciseDefinition ${routineExercise.exerciseDefinitionId} does not exist for routine exercise ${routineExercise.id}.`,
        );
      }

      const progressState = await repos.strength.getProgressState(session.userId, routineExercise.exerciseDefinitionId);
      snapshotsToInsert.push({
        id: generateEntityId("session_exercise_snapshot"),
        workoutSessionInstanceId: session.id,
        routineExerciseTemplateId: routineExercise.id,
        exerciseDefinitionId: routineExercise.exerciseDefinitionId,
        exerciseNameSnapshot: exerciseDefinition.title,
        phase: routineExercise.phase,
        orderIndex: routineExercise.orderIndex,
        targetType: routineExercise.targetType,
        targetLoadKg: progressState?.currentTargetLoadKg ?? routineExercise.targetLoadKg,
        targetReps: progressState?.currentTargetReps ?? routineExercise.targetReps,
        targetSets: progressState?.currentTargetSets ?? routineExercise.targetSets,
        targetDurationSec: progressState?.currentTargetDurationSec ?? routineExercise.targetDurationSec,
        targetDistanceM: progressState?.currentTargetDistanceM ?? routineExercise.targetDistanceM,
        targetSteps: progressState?.currentTargetSteps ?? routineExercise.targetSteps,
        wasOverridden: false,
        status: SessionExerciseStatus.NotStarted,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }

    await repos.strength.upsertSessionSnapshots(snapshotsToInsert);
    if (
      session.phase === WorkoutSessionPhase.Cooldown &&
      (session.currentExerciseSnapshotId == null ||
        existingSnapshots.every((snapshot) => snapshot.id !== session.currentExerciseSnapshotId || !isCooldownPhase(snapshot.phase)))
    ) {
      const firstCooldown = snapshotsToInsert.sort((left, right) => left.orderIndex - right.orderIndex)[0];
      if (firstCooldown) {
        return repos.strength.upsertSession({
          ...session,
          currentExerciseSnapshotId: firstCooldown.id,
        });
      }
    }

    return session;
  }

  async startExercise(input: StartExerciseInput): Promise<WorkoutSessionInstance> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const session = await this.requireSession(repos, input.workoutSessionInstanceId);
      if (isWorkoutSessionFinalStatus(session.status)) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} is final and cannot start an exercise.`);
      }

      const snapshots = getOrderedSnapshots(await repos.strength.listSessionSnapshots(session.id));
      const target =
        (input.sessionExerciseSnapshotId ?
          snapshots.find((item) => item.id === input.sessionExerciseSnapshotId)
        : snapshots.find((item) => item.status !== SessionExerciseStatus.Completed && !isCooldownPhase(item.phase))) ?? null;
      if (!target) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} has no startable exercise snapshot.`);
      }

      await repos.strength.upsertSessionSnapshots([
        {
          ...target,
          status: target.status === SessionExerciseStatus.NotStarted ? SessionExerciseStatus.Active : target.status,
          startedAt: target.startedAt ?? nowIso(input.startedAt),
        },
      ]);

      const isTimedTarget = target.targetType === ExerciseTargetType.Timed;

      return repos.strength.upsertSession({
        ...session,
        status: transitionWorkoutSessionStatus(session, WorkoutSessionStatus.ExerciseActive).status,
        currentExerciseSnapshotId: target.id,
        currentSetNumber: isTimedTarget ? 1 : undefined,
      });
    });
  }

  async startSet(input: StartSetInput): Promise<WorkoutSessionInstance> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const session = await this.requireSession(repos, input.workoutSessionInstanceId);
      if (isWorkoutSessionFinalStatus(session.status)) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} is final and cannot start a set.`);
      }

      const snapshots = getOrderedSnapshots(await repos.strength.listSessionSnapshots(session.id));
      const snapshot =
        (input.sessionExerciseSnapshotId ?
          snapshots.find((item) => item.id === input.sessionExerciseSnapshotId)
        : snapshots.find((item) => item.id === session.currentExerciseSnapshotId)) ?? null;
      if (!snapshot) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} does not have a selected exercise snapshot.`);
      }

      const logs = await repos.strength.listSetLogs(snapshot.id);
      const nextSetNumber = input.setNumber ?? Math.max(...logs.map((item) => item.setNumber), 0) + 1;
      return repos.strength.upsertSession({
        ...session,
        status:
          session.status === WorkoutSessionStatus.Resting ?
            transitionWorkoutSessionStatus(session, WorkoutSessionStatus.SetActive).status
          : session.status === WorkoutSessionStatus.ExerciseActive || session.status === WorkoutSessionStatus.Active ?
            WorkoutSessionStatus.SetActive
          : transitionWorkoutSessionStatus(session, WorkoutSessionStatus.SetActive).status,
        currentExerciseSnapshotId: snapshot.id,
        currentSetNumber: nextSetNumber,
      });
    });
  }

  async completeExerciseSet(input: CompleteExerciseSetInput): Promise<ExerciseSetLog> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const session = await this.requireSession(repos, input.workoutSessionInstanceId);
      const snapshot = (await repos.strength.listSessionSnapshots(session.id)).find(
        (item) => item.id === input.sessionExerciseSnapshotId,
      );
      if (!snapshot) {
        throw new StrengthEngineValidationError(`Snapshot ${input.sessionExerciseSnapshotId} does not belong to workout session ${session.id}.`);
      }
      const isImplicitTimedSet =
        snapshot.targetType === ExerciseTargetType.Timed &&
        session.currentExerciseSnapshotId === snapshot.id &&
        (session.status === WorkoutSessionStatus.Active || session.status === WorkoutSessionStatus.ExerciseActive);
      const effectiveSession =
        isImplicitTimedSet ?
          {
            ...session,
            status: WorkoutSessionStatus.SetActive,
            currentSetNumber: session.currentSetNumber ?? input.setNumber ?? 1,
          }
        : session;
      if (effectiveSession.status !== WorkoutSessionStatus.SetActive) {
        throw new StrengthEngineValidationError(
          `Cannot complete set because workout session ${session.id} is ${session.status} and no set is active.`,
        );
      }
      if (!canCompleteSet(effectiveSession, snapshot)) {
        throw new StrengthEngineValidationError(
          `Workout session ${session.id} in status ${effectiveSession.status} cannot complete a set for snapshot ${snapshot.id}.`,
        );
      }

      const [setLog] = await repos.strength.upsertSetLogs([
        {
          id: generateEntityId("exercise_set_log"),
          sessionExerciseSnapshotId: snapshot.id,
          setNumber: input.setNumber,
          actualLoadKg: input.actualLoadKg,
          actualReps: input.actualReps,
          actualDurationSec: input.actualDurationSec,
          actualDistanceM: input.actualDistanceM,
          actualSteps: input.actualSteps,
          completed: input.completed,
          failedReason: input.failedReason,
          metadata: input.metadata,
          startedAt: input.startedAt,
          completedAt: nowIso(input.completedAt),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        },
      ]);

      const logs = await repos.strength.listSetLogs(snapshot.id);
      const targetSetCount = getTargetSetCount(snapshot);
      const completedCount = getCompletedLogCount(logs);
      const exerciseComplete = completedCount >= targetSetCount;
      const updatedSnapshot =
        exerciseComplete ?
          {
            ...snapshot,
            status: SessionExerciseStatus.Completed,
            completedAt: nowIso(input.completedAt),
          }
        : {
            ...snapshot,
            status: SessionExerciseStatus.Active,
            startedAt: snapshot.startedAt ?? nowIso(input.startedAt),
          };
      await repos.strength.upsertSessionSnapshots([updatedSnapshot]);

      const allSnapshots = getOrderedSnapshots(await repos.strength.listSessionSnapshots(session.id));
      const nextMainSnapshot = allSnapshots.find(
        (item) =>
          isMainPhase(item.phase) &&
          item.id !== snapshot.id &&
          item.status !== SessionExerciseStatus.Completed &&
          item.orderIndex > snapshot.orderIndex,
      );
      const cooldownSnapshot = allSnapshots.find(
        (item) => isCooldownPhase(item.phase) && item.status !== SessionExerciseStatus.Completed,
      );

      if (!exerciseComplete) {
        await repos.strength.upsertSession({
          ...effectiveSession,
          status: transitionWorkoutSessionStatus(effectiveSession, WorkoutSessionStatus.Resting).status,
          currentExerciseSnapshotId: snapshot.id,
          currentSetNumber: input.setNumber,
        });
      } else if (nextMainSnapshot) {
        await repos.strength.upsertSession({
          ...effectiveSession,
          status: transitionWorkoutSessionStatus(effectiveSession, WorkoutSessionStatus.Active).status,
          currentExerciseSnapshotId: snapshot.id,
          currentSetNumber: undefined,
        });
      } else {
        if (cooldownSnapshot) {
          await repos.strength.upsertSession({
            ...effectiveSession,
            status: transitionWorkoutSessionStatus(effectiveSession, WorkoutSessionStatus.Active).status,
            phase: WorkoutSessionPhase.Strength,
            currentExerciseSnapshotId: snapshot.id,
            currentSetNumber: undefined,
          });
        } else {
          await repos.strength.upsertSession({
            ...session,
            status: transitionWorkoutSessionStatus(session, WorkoutSessionStatus.Cooldown).status,
            phase: WorkoutSessionPhase.Cooldown,
            currentExerciseSnapshotId: undefined,
            currentSetNumber: undefined,
          });
        }
      }

      return setLog!;
    });
  }

  async completeRest(input: CompleteRestInput): Promise<WorkoutSessionInstance> {
    return this.finishRestTransition(input.workoutSessionInstanceId);
  }

  async skipRest(input: SkipRestInput): Promise<WorkoutSessionInstance> {
    return this.finishRestTransition(input.workoutSessionInstanceId);
  }

  async enterCooldown(input: EnterCooldownInput): Promise<WorkoutSessionInstance> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const session = await this.requireSession(repos, input.workoutSessionInstanceId);
      if (!canEnterCooldown(session)) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} cannot enter cooldown from ${session.status}.`);
      }

      const snapshots = getOrderedSnapshots(await repos.strength.listSessionSnapshots(session.id));
      const mainIncomplete = snapshots.some(
        (item) => isMainPhase(item.phase) && item.status !== SessionExerciseStatus.Completed && item.status !== SessionExerciseStatus.Skipped,
      );
      if (mainIncomplete) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} still has incomplete main-phase exercises.`);
      }

      const cooldownSnapshot = snapshots.find((item) => isCooldownPhase(item.phase) && item.status !== SessionExerciseStatus.Completed);
      return repos.strength.upsertSession({
        ...session,
        status: transitionWorkoutSessionStatus(session, WorkoutSessionStatus.Cooldown).status,
        phase: WorkoutSessionPhase.Cooldown,
        currentExerciseSnapshotId: cooldownSnapshot?.id,
        currentSetNumber: undefined,
      });
    });
  }

  async completeCooldown(input: CompleteCooldownInput): Promise<WorkoutSessionInstance> {
    const result = await this.completeWorkoutSession({
      workoutSessionInstanceId: input.workoutSessionInstanceId,
      completedAt: input.completedAt,
      proofNote: input.proofNote,
      completionSummary: input.completionSummary,
      mediaAssetIds: input.mediaAssetIds,
    });
    return result.session;
  }

  async completeWorkoutSession(input: CompleteWorkoutSessionInput): Promise<CompleteWorkoutSessionResult> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const session = await this.requireSession(repos, input.workoutSessionInstanceId);
      if (!canCompleteWorkoutSession(session)) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} in status ${session.status} cannot be completed.`);
      }

      const snapshots = getOrderedSnapshots(await repos.strength.listSessionSnapshots(session.id));
      const cooldownSnapshots = snapshots.filter((item) => isCooldownPhase(item.phase) && item.status !== SessionExerciseStatus.Completed);
      if (cooldownSnapshots.length > 0) {
        await repos.strength.upsertSessionSnapshots(
          cooldownSnapshots.map((item) => ({
            ...item,
            status: SessionExerciseStatus.Completed,
            completedAt: item.completedAt ?? nowIso(input.completedAt),
          })),
        );
      }

      const routine = await repos.strength.getRoutineById(session.routineTemplateId);
      const progressionUpdates =
        routine?.routineType === WorkoutRoutineType.GolfPractice ? []
        : await (async () => {
            const progressionService = new DefaultStrengthProgressionService(repos);
            const evaluations = await progressionService.evaluateWorkoutProgression({
              workoutSessionInstanceId: session.id,
            });
            return progressionService.applyProgressionUpdates({ updates: evaluations });
          })();

      const updatedSession = await repos.strength.upsertSession({
        ...session,
        status: transitionWorkoutSessionStatus(session, WorkoutSessionStatus.Completed).status,
        phase: WorkoutSessionPhase.Complete,
        completedAt: nowIso(input.completedAt),
        currentExerciseSnapshotId: undefined,
        currentSetNumber: undefined,
      });

      const markEngine = createMarkEngine(repos);
      const completedMark = await markEngine.completeMarkInstance({
        markInstanceId: session.markInstanceId,
        completedAt: nowIso(input.completedAt),
        proofNote: input.proofNote,
        completionSummary: input.completionSummary,
        mediaAssetIds: input.mediaAssetIds,
      });

      return {
        session: updatedSession,
        completedMark,
        progressionUpdates,
      };
    });
  }

  async endWorkoutSession(input: EndWorkoutSessionInput): Promise<EndWorkoutSessionResult> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const session = await this.requireSession(repos, input.workoutSessionInstanceId);
      if (isWorkoutSessionFinalStatus(session.status)) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} is already final.`);
      }

      const endedAt = nowIso(input.endedAt);
      const snapshots = getOrderedSnapshots(await repos.strength.listSessionSnapshots(session.id));
      const routine = await repos.strength.getRoutineById(session.routineTemplateId);
      const disposition =
        routine?.routineType === WorkoutRoutineType.Strength ?
          evaluateWorkoutEndDisposition(snapshots)
        : {
            disposition: "abandoned" as const,
            completedMainExerciseCount: 0,
            requiredCompletedMainExerciseCount: 2,
          };

      if (disposition.disposition === "abandoned") {
        const abandonedSession = await repos.strength.upsertSession({
          ...session,
          status: transitionWorkoutSessionStatus(session, WorkoutSessionStatus.Abandoned).status,
          notes: withUpdatedSessionNoteMeta(session, (meta) => ({ ...meta, freeformNote: input.note })),
          currentExerciseSnapshotId: undefined,
          currentSetNumber: undefined,
        });
        return {
          session: abandonedSession,
          disposition: "abandoned",
          completedMainExerciseCount: disposition.completedMainExerciseCount,
          requiredCompletedMainExerciseCount: disposition.requiredCompletedMainExerciseCount,
          progressionUpdates: [],
        };
      }

      const completedSnapshotIds = new Set(
        snapshots
          .filter((snapshot) => isMainPhase(snapshot.phase) && snapshot.status === SessionExerciseStatus.Completed)
          .map((snapshot) => snapshot.id),
      );
      const progressionService = new DefaultStrengthProgressionService(repos);
      const evaluations = await progressionService.evaluateWorkoutProgression({
        workoutSessionInstanceId: session.id,
      });
      const progressionUpdates = await progressionService.applyProgressionUpdates({
        updates: evaluations.filter((evaluation) => completedSnapshotIds.has(evaluation.snapshotId)),
      });

      const updatedSession = await repos.strength.upsertSession({
        ...session,
        status: transitionWorkoutSessionStatus(session, WorkoutSessionStatus.PartiallyCompleted).status,
        phase: WorkoutSessionPhase.Complete,
        completedAt: endedAt,
        notes: withUpdatedSessionNoteMeta(session, (meta) => ({ ...meta, freeformNote: input.note })),
        currentExerciseSnapshotId: undefined,
        currentSetNumber: undefined,
      });

      const markEngine = createMarkEngine(repos);
      const mark = await markEngine.partiallyCompleteMarkInstance({
        markInstanceId: session.markInstanceId,
        completedAt: endedAt,
        proofNote: input.proofNote,
        completionSummary:
          input.completionSummary ??
          `Partial workout complete: ${disposition.completedMainExerciseCount}/${disposition.requiredCompletedMainExerciseCount} required exercises completed.`,
        mediaAssetIds: input.mediaAssetIds,
      });

      return {
        session: updatedSession,
        mark,
        disposition: "partially_completed",
        completedMainExerciseCount: disposition.completedMainExerciseCount,
        requiredCompletedMainExerciseCount: disposition.requiredCompletedMainExerciseCount,
        progressionUpdates,
      };
    });
  }

  async abandonWorkoutSession(input: AbandonWorkoutSessionInput): Promise<WorkoutSessionInstance> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const session = await this.requireSession(repos, input.workoutSessionInstanceId);
      if (isWorkoutSessionFinalStatus(session.status)) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} is already final.`);
      }

      return repos.strength.upsertSession({
        ...session,
        status: transitionWorkoutSessionStatus(session, WorkoutSessionStatus.Abandoned).status,
        notes: withUpdatedSessionNoteMeta(session, (meta) => ({ ...meta, freeformNote: input.note })),
      });
    });
  }

  async resetWorkoutSession(input: ResetWorkoutSessionInput): Promise<WorkoutSessionInstance> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const session = await this.requireSession(repos, input.workoutSessionInstanceId);

      await repos.strength.softDeleteSessionSnapshots(session.id);

      return repos.strength.upsertSession({
        ...session,
        status: WorkoutSessionStatus.NotStarted,
        phase: WorkoutSessionPhase.Strength,
        startedAt: undefined,
        completedAt: undefined,
        currentExerciseSnapshotId: null,
        currentSetNumber: null,
        updatedAt: nowIso(input.resetAt),
      });
    });
  }

  async overrideSessionExerciseTarget(input: OverrideSessionExerciseTargetInput): Promise<SessionExerciseSnapshot> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const session = await this.requireSession(repos, input.workoutSessionInstanceId);
      const snapshot = (await repos.strength.listSessionSnapshots(session.id)).find(
        (item) => item.id === input.sessionExerciseSnapshotId,
      );
      if (!snapshot) {
        throw new StrengthEngineValidationError(`Snapshot ${input.sessionExerciseSnapshotId} does not belong to workout session ${session.id}.`);
      }

      const updatedSnapshot = await repos.strength.upsertSessionSnapshots([
        {
          ...snapshot,
          targetLoadKg: input.targetLoadKg === undefined ? snapshot.targetLoadKg : input.targetLoadKg ?? undefined,
          targetReps: input.targetReps === undefined ? snapshot.targetReps : input.targetReps ?? undefined,
          targetSets: input.targetSets === undefined ? snapshot.targetSets : input.targetSets ?? undefined,
          targetDurationSec:
            input.targetDurationSec === undefined ? snapshot.targetDurationSec : input.targetDurationSec ?? undefined,
          targetDistanceM:
            input.targetDistanceM === undefined ? snapshot.targetDistanceM : input.targetDistanceM ?? undefined,
          targetSteps: input.targetSteps === undefined ? snapshot.targetSteps : input.targetSteps ?? undefined,
          wasOverridden: true,
        },
      ]);

      await repos.strength.upsertSession({
        ...session,
        notes: withUpdatedSessionNoteMeta(session, (meta) => ({
          ...meta,
          acceptForProgressionBySnapshotId: {
            ...(meta.acceptForProgressionBySnapshotId ?? {}),
            [snapshot.id]: input.acceptForProgression === true,
          },
        })),
      });

      return updatedSnapshot[0]!;
    });
  }

  private async finishRestTransition(workoutSessionInstanceId: EntityId): Promise<WorkoutSessionInstance> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const session = await this.requireSession(repos, workoutSessionInstanceId);
      if (session.status !== WorkoutSessionStatus.Resting) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} is not resting.`);
      }

      const snapshots = getOrderedSnapshots(await repos.strength.listSessionSnapshots(session.id));
      const currentSnapshot =
        session.currentExerciseSnapshotId ? snapshots.find((item) => item.id === session.currentExerciseSnapshotId) : undefined;
      if (!currentSnapshot) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} does not have a current rest target.`);
      }

      const logs = await repos.strength.listSetLogs(currentSnapshot.id);
      if (currentSnapshot.status !== SessionExerciseStatus.Completed && logs.length < getTargetSetCount(currentSnapshot)) {
        return repos.strength.upsertSession({
          ...session,
          status: transitionWorkoutSessionStatus(session, WorkoutSessionStatus.SetActive).status,
          currentExerciseSnapshotId: currentSnapshot.id,
          currentSetNumber: Math.max(...logs.map((item) => item.setNumber), 0) + 1,
        });
      }

      const nextMainSnapshot = snapshots.find(
        (item) =>
          isMainPhase(item.phase) &&
          item.id !== currentSnapshot.id &&
          item.status !== SessionExerciseStatus.Completed &&
          item.orderIndex > currentSnapshot.orderIndex,
      );
      if (nextMainSnapshot) {
        return repos.strength.upsertSession({
          ...session,
          status: transitionWorkoutSessionStatus(session, WorkoutSessionStatus.ExerciseActive).status,
          currentExerciseSnapshotId: nextMainSnapshot.id,
          currentSetNumber: undefined,
        });
      }

      const cooldownSnapshot = snapshots.find((item) => isCooldownPhase(item.phase) && item.status !== SessionExerciseStatus.Completed);
      return repos.strength.upsertSession({
        ...session,
        status: transitionWorkoutSessionStatus(session, WorkoutSessionStatus.Cooldown).status,
        phase: WorkoutSessionPhase.Cooldown,
        currentExerciseSnapshotId: cooldownSnapshot?.id,
        currentSetNumber: undefined,
      });
    });
  }

  private async getOrCreateSessionForMark(
    repos: WaymarkRepositories,
    mark: MarkInstance,
    selectedRoutine?: WorkoutRoutineTemplate,
  ): Promise<WorkoutSessionInstance> {
    const existing = await repos.strength.getSessionByMarkInstance(mark.id);
    if (existing) {
      return existing;
    }

    const routine = selectedRoutine ?? await this.resolveRoutineForMark(repos, mark);
    try {
      return await repos.strength.upsertSession({
        id: generateEntityId("workout_session"),
        userId: mark.userId,
        markInstanceId: mark.id,
        routineTemplateId: routine.id,
        status: WorkoutSessionStatus.NotStarted,
        phase: WorkoutSessionPhase.Strength,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    } catch (error) {
      const createdByConcurrentStart = await repos.strength.getSessionByMarkInstance(mark.id);
      if (createdByConcurrentStart) {
        return createdByConcurrentStart;
      }
      throw error;
    }
  }

  private async resolveRoutineForMark(repos: WaymarkRepositories, mark: MarkInstance): Promise<WorkoutRoutineTemplate> {
    try {
      return (await resolveRoutineBinding(repos, mark, "strength", undefined, { preferExistingSession: false })).routine;
    } catch (error) {
      if (error instanceof RoutineBindingResolutionError) {
        throw new StrengthEngineValidationError(error.message);
      }
      throw error;
    }
  }

  private async requireSelectableRoutineForMark(
    repos: WaymarkRepositories,
    mark: MarkInstance,
    routineTemplateId: EntityId,
  ): Promise<WorkoutRoutineTemplate> {
    const routine = await repos.strength.getRoutineById(routineTemplateId);
    if (!routine || !routine.isActive) {
      throw new StrengthEngineValidationError(`Workout routine ${routineTemplateId} is not available.`);
    }
    if (routine.pathId !== mark.pathId) {
      throw new StrengthEngineValidationError(`Workout routine ${routineTemplateId} does not belong to Mark ${mark.id}'s path.`);
    }
    if (routine.routineType === WorkoutRoutineType.GolfPractice) {
      throw new StrengthEngineValidationError(`Golf Practice routines cannot be started from the strength workout flow.`);
    }
    return routine;
  }

  private async reconcilePristineSessionForMark(
    session: WorkoutSessionInstance,
    mark: MarkInstance,
    repos: WaymarkRepositories,
    selectedRoutine?: WorkoutRoutineTemplate,
  ): Promise<WorkoutSessionInstance> {
    if (!isPristineSessionStatus(session.status)) {
      if (selectedRoutine && selectedRoutine.id !== session.routineTemplateId) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} has already started with a different routine.`);
      }
      return session;
    }

    const existingSnapshots = getOrderedSnapshots(await repos.strength.listSessionSnapshots(session.id));
    const existingLogs = await Promise.all(existingSnapshots.map((snapshot) => repos.strength.listSetLogs(snapshot.id)));
    const hasSetLogs = existingLogs.some((logs) => logs.length > 0);
    const hasProgress =
      Boolean(session.startedAt) ||
      hasSetLogs ||
      existingSnapshots.some(
        (snapshot) =>
          snapshot.status !== SessionExerciseStatus.NotStarted && snapshot.status !== SessionExerciseStatus.Active,
      );
    if (hasProgress) {
      if (selectedRoutine && selectedRoutine.id !== session.routineTemplateId) {
        throw new StrengthEngineValidationError(`Workout session ${session.id} has already started with a different routine.`);
      }
      return session;
    }

    const desiredRoutine = selectedRoutine ?? await this.resolveRoutineForMark(repos, mark);
    const routineChanged = desiredRoutine.id !== session.routineTemplateId;
    if (existingSnapshots.length === 0) {
      if (!routineChanged) {
        return session;
      }
      return repos.strength.upsertSession({
        ...session,
        routineTemplateId: desiredRoutine.id,
        status: WorkoutSessionStatus.NotStarted,
        phase: WorkoutSessionPhase.Strength,
        startedAt: undefined,
        currentExerciseSnapshotId: null,
        currentSetNumber: null,
      });
    }

    const routineExercises = await repos.strength.listRoutineExercises(desiredRoutine.id);
    const routineById = new Map(routineExercises.map((exercise) => [exercise.id, exercise] as const));
    const stale =
      routineChanged ||
      existingSnapshots.length !== routineExercises.length ||
      existingSnapshots.some((snapshot) => {
        const routineExercise =
          snapshot.routineExerciseTemplateId ? routineById.get(snapshot.routineExerciseTemplateId) : undefined;
        return (
          !routineExercise ||
          routineExercise.orderIndex !== snapshot.orderIndex ||
          routineExercise.phase !== snapshot.phase ||
          routineExercise.exerciseDefinitionId !== snapshot.exerciseDefinitionId ||
          routineExercise.targetType !== snapshot.targetType ||
          routineExercise.targetLoadKg !== snapshot.targetLoadKg ||
          routineExercise.targetReps !== snapshot.targetReps ||
          routineExercise.targetSets !== snapshot.targetSets ||
          routineExercise.targetDurationSec !== snapshot.targetDurationSec ||
          routineExercise.targetDistanceM !== snapshot.targetDistanceM ||
          routineExercise.targetSteps !== snapshot.targetSteps
        );
      });

    if (!stale) {
      return session;
    }

    await repos.strength.softDeleteSessionSnapshots(session.id);
    return repos.strength.upsertSession({
      ...session,
      routineTemplateId: desiredRoutine.id,
      status: WorkoutSessionStatus.NotStarted,
      phase: WorkoutSessionPhase.Strength,
      startedAt: undefined,
      currentExerciseSnapshotId: null,
      currentSetNumber: null,
    });
  }

  private async requireSession(repos: WaymarkRepositories, workoutSessionInstanceId: EntityId): Promise<WorkoutSessionInstance> {
    const session = await repos.strength.getSessionById(workoutSessionInstanceId);
    if (!session) {
      throw new StrengthEngineValidationError(`WorkoutSessionInstance ${workoutSessionInstanceId} does not exist.`);
    }
    return session;
  }

  private async requireMark(repos: WaymarkRepositories, markInstanceId: EntityId): Promise<MarkInstance> {
    const mark = await repos.marks.getMarkInstanceById(markInstanceId);
    if (!mark) {
      throw new StrengthEngineValidationError(`Mark ${markInstanceId} does not exist.`);
    }
    return mark;
  }
}

function transitionWorkoutSessionStatus(
  session: WorkoutSessionInstance,
  to: WorkoutSessionStatus,
): WorkoutSessionInstance {
  assertValidWorkoutSessionTransition(session.status, to);
  return { ...session, status: to };
}

export function createStrengthProgressionService(repositories: WaymarkRepositories): StrengthProgressionService {
  return new DefaultStrengthProgressionService(repositories);
}

export function createStrengthSessionEngine(
  repositories: WaymarkRepositories,
  progressionService?: StrengthProgressionService,
): StrengthSessionEngine {
  return new DefaultStrengthSessionEngine(repositories, progressionService);
}
