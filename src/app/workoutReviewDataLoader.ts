import type {
  ExerciseDefinition,
  RoutineExerciseTemplate,
  SessionExerciseSnapshot,
  WorkoutRoutineTemplate,
} from "../domain/waymark/entities";
import { ExerciseTargetType, WorkoutExercisePhase, WorkoutRoutineType } from "../domain/waymark/enums";
import type { Locale } from "../types/ui";
import type { WaymarkAppServices } from "./WaymarkAppProvider";
import { repairWorkoutDatabase } from "./repairWorkoutDatabase";

const BODYWEIGHT_REP_PROGRESS_ROUTINE_SEED_ID = "health_bodyweight_rep_progress_routine";

export type WorkoutReviewExercise = {
  id: string;
  title: string;
  phase: "main" | "cooldown";
  prescription: string;
  restLabel?: string;
  resultLabel?: string;
};

export type WorkoutReviewData = {
  markId: string;
  markTitle: string;
  routineId: string;
  routineTitle: string;
  routineDescription?: string;
  durationLabel?: string;
  sessionStatusLabel?: string;
  exercises: WorkoutReviewExercise[];
};

export async function loadWorkoutReviewData(
  app: WaymarkAppServices,
  markId: string,
  locale: Locale,
  requestedRoutineId?: string,
): Promise<WorkoutReviewData | null> {
  const mark = await app.repositories.marks.getMarkInstanceById(markId);
  if (!mark) {
    return null;
  }

  if (normalizeText(mark.title).includes("workout minimal")) {
    await repairWorkoutDatabase(app.repositories, app.user.id, [BODYWEIGHT_REP_PROGRESS_ROUTINE_SEED_ID]);
  }

  const session = await app.repositories.strength.getSessionByMarkInstance(mark.id);
  const routines = (await app.repositories.strength.listRoutinesByPath(mark.pathId))
    .filter((routine) => routine.isActive && routine.routineType !== WorkoutRoutineType.GolfPractice)
    .sort((left, right) => left.title.localeCompare(right.title));
  const routine = resolveReviewRoutine(routines, mark.templateId, mark.title, session?.routineTemplateId, requestedRoutineId);
  if (!routine) {
    return null;
  }

  const routineExercises = await app.repositories.strength.listRoutineExercises(routine.id);
  const routineExerciseById = new Map(routineExercises.map((item) => [item.id, item] as const));
  const matchingSession = session?.routineTemplateId === routine.id ? session : null;
  const sourceExercises = matchingSession
    ? await app.repositories.strength.listSessionSnapshots(matchingSession.id)
    : routineExercises;
  const exercises: WorkoutReviewExercise[] = [];

  for (const source of [...sourceExercises].sort((left, right) => left.orderIndex - right.orderIndex)) {
    const definition = await app.repositories.strength.getExerciseDefinitionById(source.exerciseDefinitionId);
    if (!definition) {
      continue;
    }
    const template = "routineExerciseTemplateId" in source && source.routineExerciseTemplateId
      ? routineExerciseById.get(source.routineExerciseTemplateId)
      : source as RoutineExerciseTemplate;
    const logs = matchingSession && "workoutSessionInstanceId" in source
      ? await app.repositories.strength.listSetLogs(source.id)
      : [];
    exercises.push(mapReviewExercise(source, definition, template, logs, locale));
  }

  return {
    markId: mark.id,
    markTitle: mark.title,
    routineId: routine.id,
    routineTitle: routine.title,
    routineDescription: routine.description,
    durationLabel: routine.estimatedDurationMin
      ? locale === "vi" ? `${routine.estimatedDurationMin} phut` : `${routine.estimatedDurationMin} min`
      : undefined,
    sessionStatusLabel: matchingSession ? humanizeSessionStatus(matchingSession.status, locale) : undefined,
    exercises,
  };
}

function resolveReviewRoutine(
  routines: WorkoutRoutineTemplate[],
  markTemplateId: string | undefined,
  markTitle: string,
  sessionRoutineId: string | undefined,
  requestedRoutineId: string | undefined,
) {
  const normalizedMarkTitle = normalizeText(markTitle);
  return (
    (requestedRoutineId ? routines.find((routine) => routine.id === requestedRoutineId) : undefined) ??
    (sessionRoutineId ? routines.find((routine) => routine.id === sessionRoutineId) : undefined) ??
    (markTemplateId ? routines.find((routine) => routine.markTemplateId === markTemplateId) : undefined) ??
    routines.find((routine) => normalizeText(routine.title) === normalizedMarkTitle) ??
    routines.find((routine) => isWorkoutMinimalBodyweightRoutine(normalizedMarkTitle, routine)) ??
    routines.find((routine) => normalizedMarkTitle.includes("day b") && normalizeText(routine.title).includes("day b")) ??
    routines.find((routine) => normalizedMarkTitle.includes("walk") && routine.routineType === WorkoutRoutineType.Walk) ??
    routines.find((routine) => normalizeText(routine.title).includes("day a")) ??
    routines[0]
  );
}

function mapReviewExercise(
  source: RoutineExerciseTemplate | SessionExerciseSnapshot,
  definition: ExerciseDefinition,
  template: RoutineExerciseTemplate | undefined,
  logs: Array<{ completed: boolean; actualLoadKg?: number; actualReps?: number; actualDurationSec?: number; actualDistanceM?: number; actualSteps?: number }>,
  locale: Locale,
): WorkoutReviewExercise {
  const restSeconds = template?.restDurationSec ?? definition.defaultRestSec;
  const completedLogs = logs.filter((log) => log.completed);
  return {
    id: source.id,
    title: definition.title,
    phase: source.phase === WorkoutExercisePhase.Cooldown || source.phase === WorkoutExercisePhase.Stretch ? "cooldown" : "main",
    prescription: formatPrescription(source, locale),
    restLabel: restSeconds
      ? locale === "vi" ? `Nghi ${restSeconds} giay` : `Rest ${restSeconds} sec`
      : undefined,
    resultLabel: completedLogs.length > 0
      ? locale === "vi" ? `${completedLogs.length} set da ghi nhan` : `${completedLogs.length} recorded sets`
      : undefined,
  };
}

function formatPrescription(
  source: Pick<RoutineExerciseTemplate, "targetType" | "targetSets" | "targetReps" | "targetLoadKg" | "targetDurationSec" | "targetDistanceM" | "targetSteps">,
  locale: Locale,
) {
  const sets = source.targetSets ?? 1;
  switch (source.targetType) {
    case ExerciseTargetType.RepsLoad:
      return `${sets} x ${source.targetReps ?? "-"}${source.targetLoadKg != null ? ` @ ${source.targetLoadKg} kg` : ""}`;
    case ExerciseTargetType.RepsOnly:
      return `${sets} x ${source.targetReps ?? "-"}`;
    case ExerciseTargetType.Timed:
      return `${sets} x ${source.targetDurationSec ?? "-"} ${locale === "vi" ? "giay" : "sec"}`;
    case ExerciseTargetType.WalkDistance:
      return `${source.targetDistanceM ?? "-"} m`;
    case ExerciseTargetType.Steps:
      return `${source.targetSteps ?? "-"} ${locale === "vi" ? "buoc" : "steps"}`;
    default:
      return "-";
  }
}

function humanizeSessionStatus(status: string, locale: Locale) {
  const value = status.replace(/_/g, " ");
  return locale === "vi" ? `Session: ${value}` : `Session: ${value}`;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isWorkoutMinimalBodyweightRoutine(normalizedMarkTitle: string, routine: WorkoutRoutineTemplate) {
  if (!normalizedMarkTitle.includes("workout minimal")) {
    return false;
  }
  const normalizedRoutineTitle = normalizeText(routine.title);
  return normalizedRoutineTitle.includes("body weight rep progress") || normalizedRoutineTitle.includes("bodyweight rep progress");
}
