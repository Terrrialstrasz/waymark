import type { StrengthExercise, StrengthSessionData, StrengthSet } from "../../types/strengthSession";

const DEFAULT_REST_SECONDS = 90;
const DEFAULT_STRETCH_SECONDS = 40;

function getStretchDurationSeconds(durationSeconds?: number) {
  return durationSeconds && durationSeconds > 0 ? durationSeconds : DEFAULT_STRETCH_SECONDS;
}

export function updateStrengthSetActualLoad(session: StrengthSessionData, setId: string, value: number | null): StrengthSessionData {
  return {
    ...session,
    exercises: session.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets?.map((set) => (set.id === setId ? { ...set, actualLoad: value } : { ...set })),
      title: { ...exercise.title },
      notes: exercise.notes ? { ...exercise.notes } : exercise.notes,
      timer: exercise.timer ? { ...exercise.timer } : exercise.timer,
      restTimer: exercise.restTimer ? { ...exercise.restTimer } : exercise.restTimer,
    })),
    stretches: session.stretches.map((stretch) => ({ ...stretch, title: { ...stretch.title } })),
    sessionTitle: { ...session.sessionTitle },
    stretchTimer: session.stretchTimer ? { ...session.stretchTimer } : session.stretchTimer,
  };
}

export function advanceStrengthSession(session: StrengthSessionData, actionType: string): StrengthSessionData {
  switch (actionType) {
    case "complete_strength_set":
      return completeStrengthSet(session);
    case "start_next_set":
      return startNextSet(session);
    case "next_exercise":
      return moveToNextExercise(session);
    case "complete_timed_set":
      return completeTimedSet(session);
    case "start_cooldown":
      return startCooldown(session);
    case "complete_stretch":
      return completeStretch(session);
    case "start_next_stretch":
      return startNextStretch(session);
    case "finish_session":
      return finishSession(session);
    default:
      return cloneSession(session);
  }
}

export function tickStrengthSession(session: StrengthSessionData, deltaSeconds = 1): StrengthSessionData {
  const next = cloneSession(session);

  if (next.phase === "rest") {
    const exerciseIndex = getActiveExerciseIndex(next);
    if (exerciseIndex >= 0) {
      const timer = next.exercises[exerciseIndex]?.restTimer;
      if (timer?.state === "running") {
        const elapsedSeconds = Math.min(timer.totalSeconds, timer.elapsedSeconds + deltaSeconds);
        next.exercises[exerciseIndex]!.restTimer = {
          ...timer,
          elapsedSeconds,
          state: elapsedSeconds >= timer.totalSeconds ? "completed" : "running",
        };
      }
    }
    return next;
  }

  if (next.phase === "timed") {
    const exerciseIndex = getActiveExerciseIndex(next);
    if (exerciseIndex >= 0) {
      const timer = next.exercises[exerciseIndex]?.timer;
      if (timer?.state === "running") {
        const elapsedSeconds = Math.min(timer.totalSeconds, timer.elapsedSeconds + deltaSeconds);
        next.exercises[exerciseIndex]!.timer = {
          ...timer,
          elapsedSeconds,
          state: elapsedSeconds >= timer.totalSeconds ? "completed" : "running",
        };
      }
    }
    return next;
  }

  if (next.phase === "cooldown" && next.stretchTimer?.state === "running") {
    const elapsedSeconds = Math.min(next.stretchTimer.totalSeconds, next.stretchTimer.elapsedSeconds + deltaSeconds);
    next.stretchTimer = {
      ...next.stretchTimer,
      elapsedSeconds,
      state: elapsedSeconds >= next.stretchTimer.totalSeconds ? "completed" : "running",
    };
  }

  return next;
}

function completeStrengthSet(session: StrengthSessionData): StrengthSessionData {
  const next = cloneSession(session);
  const exerciseIndex = getActiveExerciseIndex(next);
  if (exerciseIndex < 0) {
    return next;
  }

  const exercise = next.exercises[exerciseIndex];
  if (!exercise.sets?.length) {
    return next;
  }

  const currentSetIndex = exercise.sets.findIndex((set) => set.state === "active");
  if (currentSetIndex < 0) {
    return next;
  }

  exercise.sets[currentSetIndex].state = "done";
  const nextSetIndex = exercise.sets.findIndex((set, index) => index > currentSetIndex && set.state !== "done");

  if (nextSetIndex >= 0) {
    exercise.state = "rest";
    exercise.completedSetNumber = exercise.sets[currentSetIndex].setNumber;
    exercise.nextSetNumber = exercise.sets[nextSetIndex].setNumber;
    exercise.restTimer = {
      totalSeconds: DEFAULT_REST_SECONDS,
      elapsedSeconds: 0,
      state: "running",
    };
    next.phase = "rest";
    exercise.sets = exercise.sets.map((set, index) => {
      if (index === nextSetIndex) {
        return { ...set, state: "next" };
      }

      if (index > nextSetIndex && set.state !== "done") {
        return { ...set, state: "upcoming" };
      }

      return set;
    });
    return next;
  }

  exercise.state = "done";
  exercise.completedSetNumber = undefined;
  exercise.nextSetNumber = undefined;
  exercise.restTimer = undefined;
  return stabilizeAfterExerciseCompletion(next, exerciseIndex);
}

function startNextSet(session: StrengthSessionData): StrengthSessionData {
  const next = cloneSession(session);
  const exerciseIndex = getActiveExerciseIndex(next);
  if (exerciseIndex < 0) {
    return next;
  }

  const exercise = next.exercises[exerciseIndex];
  const nextSetIndex = exercise.sets?.findIndex((set) => set.state === "next") ?? -1;
  if (!exercise.sets?.length || nextSetIndex < 0) {
    return next;
  }

  const previousSet = exercise.sets[nextSetIndex - 1];
  const targetSet = exercise.sets[nextSetIndex];
  if (exercise.mode === "reps_load" && targetSet.actualLoad == null) {
    const carryValue = previousSet?.actualLoad ?? previousSet?.actualWeight ?? targetSet.targetLoad ?? null;
    targetSet.actualLoad = carryValue;
  }

  exercise.sets = exercise.sets.map((set, index) => {
    if (index === nextSetIndex) {
      return { ...set, state: "active" };
    }
    return set;
  });
  exercise.state = "active";
  exercise.completedSetNumber = undefined;
  exercise.nextSetNumber = undefined;
  exercise.restTimer = undefined;
  next.phase = "strength";
  return next;
}

function moveToNextExercise(session: StrengthSessionData): StrengthSessionData {
  const next = cloneSession(session);
  const currentIndex = getActiveExerciseIndex(next);
  if (currentIndex < 0) {
    return next;
  }

  const currentExercise = next.exercises[currentIndex];
  currentExercise.state = "done";
  currentExercise.completedSetNumber = undefined;
  currentExercise.nextSetNumber = undefined;
  currentExercise.restTimer = undefined;

  const nextExercise = next.exercises[currentIndex + 1];
  if (!nextExercise) {
    return next;
  }

  next.activeExerciseId = nextExercise.id;
  next.strengthIndex = nextExercise.order;

  if (nextExercise.mode === "timed") {
    next.phase = "timed";
    nextExercise.state = "active";
    if (nextExercise.timer) {
      nextExercise.timer = {
        ...nextExercise.timer,
        elapsedSeconds: 0,
        state: "running",
      };
    }
    return next;
  }

  next.phase = "strength";
  nextExercise.state = "active";
  const firstSetIndex = nextExercise.sets?.findIndex((set) => set.state !== "done") ?? -1;
  if (firstSetIndex >= 0 && nextExercise.sets) {
    nextExercise.sets = nextExercise.sets.map((set, index) => {
      if (index === firstSetIndex) {
        const resolvedLoad = set.actualLoad ?? set.actualWeight ?? set.targetLoad ?? null;
        return { ...set, state: "active", actualLoad: resolvedLoad };
      }

      if (index > firstSetIndex && set.state !== "done") {
        return { ...set, state: "upcoming" };
      }

      return set;
    });
  }

  return next;
}

function completeTimedSet(session: StrengthSessionData): StrengthSessionData {
  const next = cloneSession(session);
  const exerciseIndex = getActiveExerciseIndex(next);
  if (exerciseIndex < 0) {
    return next;
  }

  const exercise = next.exercises[exerciseIndex];
  exercise.state = "done";
  if (exercise.timer) {
    exercise.timer = {
      ...exercise.timer,
      elapsedSeconds: exercise.timer.totalSeconds,
      state: "completed",
    };
  }

  return stabilizeAfterExerciseCompletion(next, exerciseIndex);
}

function stabilizeAfterExerciseCompletion(session: StrengthSessionData, completedExerciseIndex: number) {
  const completedExercise = session.exercises[completedExerciseIndex];
  const nextExercise = session.exercises[completedExerciseIndex + 1];

  session.phase = completedExercise?.mode === "timed" ? "timed" : "strength";
  session.activeExerciseId = completedExercise?.id;
  session.strengthIndex = completedExercise?.order ?? session.strengthIndex;

  if (!nextExercise) {
    session.strengthComplete = true;
    return session;
  }

  return session;
}

function startCooldown(session: StrengthSessionData): StrengthSessionData {
  const next = cloneSession(session);
  const firstStretch = next.stretches[0];
  next.phase = "cooldown";
  next.cooldownStarted = true;
  next.strengthComplete = true;
  next.activeStretchId = firstStretch?.id;
  next.cooldownIndex = next.stretches.length > 0 ? 1 : 0;
  next.cooldownTotal = next.stretches.length;
  next.stretchTimer =
    next.stretches.length > 0
      ? {
          totalSeconds: getStretchDurationSeconds(firstStretch?.durationSeconds),
          elapsedSeconds: 0,
          state: "running",
        }
      : undefined;
  next.stretches = next.stretches.map((stretch, index) => ({
    ...stretch,
    state: index === 0 ? "active" : index === 1 ? "next" : "upcoming",
  }));
  return next;
}

function completeStretch(session: StrengthSessionData): StrengthSessionData {
  const next = cloneSession(session);
  const activeIndex = next.stretches.findIndex((stretch) => stretch.state === "active");
  if (activeIndex < 0) {
    return next;
  }

  const completedStretch = next.stretches[activeIndex];
  const completedDurationSeconds = getStretchDurationSeconds(completedStretch?.durationSeconds);
  next.stretches[activeIndex].state = "done";
  const upcomingIndex = next.stretches.findIndex((stretch, index) => index > activeIndex && stretch.state !== "done");

  if (upcomingIndex >= 0) {
    next.activeStretchId = undefined;
    next.cooldownIndex = next.stretches[upcomingIndex].order;
    next.stretchTimer = {
      totalSeconds: completedDurationSeconds,
      elapsedSeconds: completedDurationSeconds,
      state: "completed",
    };
    next.stretches = next.stretches.map((stretch, index) => ({
      ...stretch,
      state:
        index === upcomingIndex ? "next"
        : index > upcomingIndex && stretch.state !== "done" ? "upcoming"
        : stretch.state,
    }));
    return next;
  }

  next.activeStretchId = undefined;
  next.stretchTimer = {
    totalSeconds: completedDurationSeconds,
    elapsedSeconds: completedDurationSeconds,
    state: "completed",
  };
  return next;
}

function startNextStretch(session: StrengthSessionData): StrengthSessionData {
  const next = cloneSession(session);
  const nextIndex = next.stretches.findIndex((stretch) => stretch.state === "next");
  if (nextIndex < 0) {
    return next;
  }

  const nextStretch = next.stretches[nextIndex];
  next.activeStretchId = nextStretch.id;
  next.cooldownIndex = nextStretch.order;
  next.stretchTimer = {
    totalSeconds: getStretchDurationSeconds(nextStretch.durationSeconds),
    elapsedSeconds: 0,
    state: "running",
  };
  next.stretches = next.stretches.map((stretch, index) => ({
    ...stretch,
    state: index === nextIndex ? "active" : stretch.state,
  }));
  return next;
}

function finishSession(session: StrengthSessionData): StrengthSessionData {
  const next = cloneSession(session);
  next.phase = "complete";
  next.sessionComplete = true;
  next.activeStretchId = undefined;
  if (next.stretchTimer) {
    next.stretchTimer = {
      ...next.stretchTimer,
      elapsedSeconds: next.stretchTimer.totalSeconds,
      state: "completed",
    };
  }
  return next;
}

function getActiveExerciseIndex(session: StrengthSessionData) {
  return session.exercises.findIndex((exercise) => exercise.id === session.activeExerciseId || exercise.state === "active" || exercise.state === "rest");
}

function cloneSession(session: StrengthSessionData): StrengthSessionData {
  return {
    ...session,
    sessionTitle: { ...session.sessionTitle },
    phaseTitle: session.phaseTitle ? { ...session.phaseTitle } : session.phaseTitle,
    phaseBody: session.phaseBody ? { ...session.phaseBody } : session.phaseBody,
    exercises: session.exercises.map(cloneExercise),
    stretches: session.stretches.map((stretch) => ({ ...stretch, title: { ...stretch.title } })),
    stretchTimer: session.stretchTimer ? { ...session.stretchTimer } : session.stretchTimer,
  };
}

function cloneExercise(exercise: StrengthExercise): StrengthExercise {
  return {
    ...exercise,
    title: { ...exercise.title },
    notes: exercise.notes ? { ...exercise.notes } : exercise.notes,
    sets: exercise.sets?.map(cloneSet),
    timer: exercise.timer ? { ...exercise.timer } : exercise.timer,
    restTimer: exercise.restTimer ? { ...exercise.restTimer } : exercise.restTimer,
  };
}

function cloneSet(set: StrengthSet): StrengthSet {
  return { ...set };
}
