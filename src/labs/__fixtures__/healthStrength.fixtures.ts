import { Locale } from "../../types/ui";
import { ExerciseMode, StrengthSessionData, StretchItem, StretchState, WorkoutDayType } from "../../components/health/strength";

type WorkoutExerciseBlueprint = {
  id: string;
  order: number;
  title: Record<Locale, string>;
  mode: ExerciseMode;
  targetReps: number;
  setCount: number;
  targetLoad?: number;
  timedSeconds?: number;
};

const cooldownStretchBlueprint = [
  { id: "stretch-calf-left", order: 1, title: { en: "Calf Stretch Left", vi: "Calf Stretch Left" }, durationLabel: "00:30", totalSeconds: 30 },
  { id: "stretch-calf-right", order: 2, title: { en: "Calf Stretch Right", vi: "Calf Stretch Right" }, durationLabel: "00:30", totalSeconds: 30 },
  { id: "stretch-forward-bend", order: 3, title: { en: "Forward Bend", vi: "Forward Bend" }, durationLabel: "00:45", totalSeconds: 45 },
  {
    id: "stretch-kneeling-lunge-left",
    order: 4,
    title: { en: "Kneeling Lunge Stretch Left", vi: "Kneeling Lunge Stretch Left" },
    durationLabel: "00:30",
    totalSeconds: 30,
  },
  {
    id: "stretch-kneeling-lunge-right",
    order: 5,
    title: { en: "Kneeling Lunge Stretch Right", vi: "Kneeling Lunge Stretch Right" },
    durationLabel: "00:30",
    totalSeconds: 30,
  },
  {
    id: "stretch-levator-left",
    order: 6,
    title: { en: "Levator Scapulae Stretch Left", vi: "Levator Scapulae Stretch Left" },
    durationLabel: "00:30",
    totalSeconds: 30,
  },
  {
    id: "stretch-levator-right",
    order: 7,
    title: { en: "Levator Scapulae Stretch Right", vi: "Levator Scapulae Stretch Right" },
    durationLabel: "00:30",
    totalSeconds: 30,
  },
  {
    id: "stretch-shoulder-roll-clockwise",
    order: 8,
    title: { en: "Shoulder Roll Clockwise", vi: "Shoulder Roll Clockwise" },
    durationLabel: "00:45",
    totalSeconds: 45,
  },
  {
    id: "stretch-spine-twist-left",
    order: 9,
    title: { en: "Spine Lumbar Twist Stretch Left", vi: "Spine Lumbar Twist Stretch Left" },
    durationLabel: "00:30",
    totalSeconds: 30,
  },
  {
    id: "stretch-spine-twist-right",
    order: 10,
    title: { en: "Spine Lumbar Twist Stretch Right", vi: "Spine Lumbar Twist Stretch Right" },
    durationLabel: "00:30",
    totalSeconds: 30,
  },
  { id: "stretch-glute-left", order: 11, title: { en: "Glute Stretch Left", vi: "Glute Stretch Left" }, durationLabel: "00:30", totalSeconds: 30 },
  {
    id: "stretch-glute-right",
    order: 12,
    title: { en: "Glute Stretch Right", vi: "Glute Stretch Right" },
    durationLabel: "00:30",
    totalSeconds: 30,
  },
  { id: "stretch-cat-cow", order: 13, title: { en: "Cat Cow Pose", vi: "Cat Cow Pose" }, durationLabel: "01:00", totalSeconds: 60 },
  { id: "stretch-child-pose", order: 14, title: { en: "Child Pose", vi: "Child Pose" }, durationLabel: "01:00", totalSeconds: 60 },
] as const;

const workoutPlans: Record<
  WorkoutDayType,
  {
    dayLabel: Record<Locale, string>;
    sessionTitle: Record<Locale, string>;
    totalDurationLabel: Record<Locale, string>;
    exercises: WorkoutExerciseBlueprint[];
  }
> = {
  day_a: {
    dayLabel: { en: "Day A", vi: "Ng\u00e0y A" },
    sessionTitle: { en: "Day A Strength Training", vi: "Bu\u1ed5i s\u1ee9c m\u1ea1nh Ng\u00e0y A" },
    totalDurationLabel: { en: "42 min", vi: "42 ph\u00fat" },
    exercises: [
      {
        id: "barbell-squat",
        order: 1,
        title: { en: "Barbell Squat", vi: "Barbell Squat" },
        mode: "reps_load",
        setCount: 3,
        targetReps: 5,
        targetLoad: 60,
      },
      {
        id: "standing-barbell-military-press",
        order: 2,
        title: { en: "Standing Barbell Military Press", vi: "Standing Barbell Military Press" },
        mode: "reps_load",
        setCount: 2,
        targetReps: 8,
        targetLoad: 24,
      },
      {
        id: "barbell-bench-press",
        order: 3,
        title: { en: "Barbell Bench Press", vi: "Barbell Bench Press" },
        mode: "reps_load",
        setCount: 3,
        targetReps: 8,
        targetLoad: 45,
      },
      {
        id: "pallof-press",
        order: 4,
        title: { en: "Pallof Press", vi: "Pallof Press" },
        mode: "reps_load",
        setCount: 2,
        targetReps: 10,
        targetLoad: 15,
      },
      {
        id: "plank",
        order: 5,
        title: { en: "Plank", vi: "Plank" },
        mode: "timed",
        setCount: 1,
        targetReps: 1,
        timedSeconds: 50,
      },
    ],
  },
  day_b: {
    dayLabel: { en: "Day B", vi: "Ng\u00e0y B" },
    sessionTitle: { en: "Day B Strength Training", vi: "Bu\u1ed5i s\u1ee9c m\u1ea1nh Ng\u00e0y B" },
    totalDurationLabel: { en: "42 min", vi: "42 ph\u00fat" },
    exercises: [
      {
        id: "barbell-deadlift",
        order: 1,
        title: { en: "Barbell Deadlift", vi: "Barbell Deadlift" },
        mode: "reps_load",
        setCount: 2,
        targetReps: 5,
        targetLoad: 70,
      },
      {
        id: "bent-over-barbell-row",
        order: 2,
        title: { en: "Bent Over Barbell Row", vi: "Bent Over Barbell Row" },
        mode: "reps_load",
        setCount: 3,
        targetReps: 8,
        targetLoad: 34,
      },
      {
        id: "wood-chop",
        order: 3,
        title: { en: "Wood Chop", vi: "Wood Chop" },
        mode: "reps_load",
        setCount: 1,
        targetReps: 10,
        targetLoad: 10,
      },
      {
        id: "kneeling-ab-wheel-rollout",
        order: 4,
        title: { en: "Kneeling Ab Wheel Rollout", vi: "Kneeling Ab Wheel Rollout" },
        mode: "reps_only",
        setCount: 2,
        targetReps: 10,
      },
    ],
  },
  walk: {
    dayLabel: { en: "Walk", vi: "Di b\u1ed9" },
    sessionTitle: { en: "Walk Day", vi: "Ng\u00e0y \u0111i b\u1ed9" },
    totalDurationLabel: { en: "30 min", vi: "30 ph\u00fat" },
    exercises: [
      {
        id: "walk-day",
        order: 1,
        title: { en: "Walk", vi: "Walk" },
        mode: "timed",
        setCount: 1,
        targetReps: 1,
        timedSeconds: 1800,
      },
    ],
  },
};

function localizedCount(locale: Locale, count: number, nounEn: string, nounVi: string) {
  return locale === "vi" ? `${count} ${nounVi}` : `${count} ${nounEn}`;
}

function createCooldownStretches(activeOrder?: number, nextOrder?: number, completedOrders: number[] = []): StretchItem[] {
  return cooldownStretchBlueprint.map((stretch) => {
    let state: StretchState = "upcoming";

    if (completedOrders.includes(stretch.order)) {
      state = "done";
    } else if (stretch.order === activeOrder) {
      state = "active";
    } else if (stretch.order === nextOrder) {
      state = "next";
    }

    return {
      id: stretch.id,
      order: stretch.order,
      title: stretch.title,
      durationLabel: stretch.durationLabel,
      durationSeconds: stretch.totalSeconds,
      state,
    };
  });
}

function getCooldownStretchTotalSeconds(order: number) {
  return cooldownStretchBlueprint.find((stretch) => stretch.order === order)?.totalSeconds ?? 30;
}

function createSessionExercises(dayType: WorkoutDayType) {
  return workoutPlans[dayType].exercises.map((exercise, exerciseIndex) => {
      if (exercise.mode === "timed") {
      return {
        id: exercise.id,
        order: exercise.order,
        title: exercise.title,
        prescriptionLabel: `1 \u00d7 ${formatTimedLabel(exercise.timedSeconds ?? 0)}`,
        mode: exercise.mode,
        supportsLoad: false,
        state: exerciseIndex === 0 ? ("active" as const) : ("upcoming" as const),
        timedSetLabel: "Set 1 of 1",
        timer: {
          totalSeconds: exercise.timedSeconds ?? 0,
          elapsedSeconds: 0,
          state: "idle" as const,
        },
      };
    }

    return {
      id: exercise.id,
      order: exercise.order,
      title: exercise.title,
      prescriptionLabel: `${exercise.setCount} \u00d7 ${exercise.targetReps}`,
      mode: exercise.mode,
      supportsLoad: exercise.mode === "reps_load",
      state: exerciseIndex === 0 ? ("active" as const) : ("upcoming" as const),
      sets: Array.from({ length: exercise.setCount }, (_, setIndex) => ({
        id: `${exercise.id}-set-${setIndex + 1}`,
        setNumber: setIndex + 1,
        repsLabel: `${exercise.targetReps} reps`,
        actualLoad: exerciseIndex === 0 && setIndex === 0 && exercise.mode === "reps_load" ? exercise.targetLoad ?? null : null,
        targetLoad: exercise.mode === "reps_load" ? exercise.targetLoad ?? null : undefined,
        canEditWeight: exercise.mode === "reps_load",
        state: exerciseIndex === 0 && setIndex === 0 ? ("active" as const) : ("upcoming" as const),
      })),
    };
  });
}

function formatTimedLabel(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function createBaseSession(locale: Locale, dayType: WorkoutDayType): StrengthSessionData {
  const plan = workoutPlans[dayType];

  return {
    locale,
    dayType,
    dayLabel: plan.dayLabel[locale],
    totalDurationLabel: plan.totalDurationLabel[locale],
    exerciseCountLabel: localizedCount(locale, plan.exercises.length, "exercises", "b\u00e0i t\u1eadp"),
    stretchCountLabel: localizedCount(locale, cooldownStretchBlueprint.length, "stretches", "\u0111\u1ed9ng t\u00e1c gi\u00e3n"),
    sessionTitle: plan.sessionTitle,
    phase: "strength",
    strengthIndex: 1,
    strengthTotal: plan.exercises.length,
    cooldownIndex: 1,
    cooldownTotal: cooldownStretchBlueprint.length,
    unit: "kg",
    strengthComplete: false,
    cooldownStarted: false,
    sessionComplete: false,
    activeExerciseId: plan.exercises[0]?.id,
    stretches: createCooldownStretches(),
    exercises: createSessionExercises(dayType),
  };
}

export function createStrengthSessionScenario(locale: Locale, dayType: WorkoutDayType = "day_a"): StrengthSessionData {
  return createBaseSession(locale, dayType);
}

export function createDayAStrengthScenario(locale: Locale): StrengthSessionData {
  return createBaseSession(locale, "day_a");
}

export function createDayBStrengthScenario(locale: Locale): StrengthSessionData {
  return createBaseSession(locale, "day_b");
}

export function createStrengthStrengthScenario(locale: Locale): StrengthSessionData {
  return createDayAStrengthScenario(locale);
}

export function createRestScenario(locale: Locale, dayType: WorkoutDayType = "day_a"): StrengthSessionData {
  const session = createBaseSession(locale, dayType);
  const activeExercise = session.exercises[0];
  if (!activeExercise?.sets || activeExercise.sets.length < 2) {
    return session;
  }

  session.phase = "rest";
  session.exercises[0] = {
    ...activeExercise,
    state: "rest",
    completedSetNumber: 1,
    nextSetNumber: 2,
    sets: activeExercise.sets.map((set, index) => {
      if (index === 0) {
        return {
          ...set,
          actualLoad: activeExercise.mode === "reps_load" ? set.targetLoad ?? set.actualLoad ?? null : set.actualLoad,
          state: "done",
        };
      }

      if (index === 1) {
        return { ...set, state: "next" };
      }

      return { ...set, state: "upcoming" };
    }),
    restTimer: {
      totalSeconds: 90,
      elapsedSeconds: 28,
      state: "running",
    },
  };
  return session;
}

export function createTimedScenario(locale: Locale, dayType: WorkoutDayType = "day_a"): StrengthSessionData {
  const session = createBaseSession(locale, dayType);
  const timedExerciseIndex = session.exercises.findIndex((exercise) => exercise.mode === "timed");
  if (timedExerciseIndex < 0) {
    return session;
  }

  session.phase = "timed";
  session.activeExerciseId = session.exercises[timedExerciseIndex].id;
  session.strengthIndex = timedExerciseIndex + 1;
  session.exercises = session.exercises.map((exercise, index) => {
    if (index < timedExerciseIndex) {
      return {
        ...exercise,
        state: "done",
        sets: exercise.sets?.map((set) => ({
          ...set,
          state: "done",
          actualLoad: exercise.mode === "reps_load" ? set.targetLoad ?? set.actualLoad ?? null : set.actualLoad,
        })),
      };
    }

    if (index === timedExerciseIndex && exercise.timer) {
      return {
        ...exercise,
        state: "active",
        timer: {
          ...exercise.timer,
          elapsedSeconds: Math.min(18, exercise.timer.totalSeconds),
          state: "running",
        },
      };
    }

    return exercise;
  });
  return session;
}

export function createCooldownScenario(locale: Locale, dayType: WorkoutDayType = "day_a"): StrengthSessionData {
  const session = createBaseSession(locale, dayType);
  session.phase = "cooldown";
  session.strengthComplete = true;
  session.cooldownStarted = true;
  session.cooldownIndex = 1;
  session.activeStretchId = cooldownStretchBlueprint[0].id;
  session.stretchTimer = {
    totalSeconds: getCooldownStretchTotalSeconds(1),
    elapsedSeconds: 12,
    state: "running",
  };
  session.exercises = session.exercises.map((exercise) => ({
    ...exercise,
    state: "done",
    sets: exercise.sets?.map((set) => ({
      ...set,
      state: "done",
      actualLoad: exercise.mode === "reps_load" ? set.targetLoad ?? set.actualLoad ?? null : set.actualLoad,
    })),
    timer: exercise.timer ? { ...exercise.timer, elapsedSeconds: exercise.timer.totalSeconds, state: "completed" } : exercise.timer,
  }));
  session.stretches = createCooldownStretches(1, 2);
  return session;
}

export function createFinalStretchScenario(locale: Locale, dayType: WorkoutDayType = "day_a"): StrengthSessionData {
  const session = createCooldownScenario(locale, dayType);
  session.cooldownIndex = cooldownStretchBlueprint.length;
  session.activeStretchId = cooldownStretchBlueprint[cooldownStretchBlueprint.length - 1].id;
  session.stretchTimer = {
    totalSeconds: getCooldownStretchTotalSeconds(cooldownStretchBlueprint.length),
    elapsedSeconds: 22,
    state: "running",
  };
  session.stretches = createCooldownStretches(
    cooldownStretchBlueprint.length,
    undefined,
    cooldownStretchBlueprint.slice(0, -1).map((stretch) => stretch.order),
  );
  return session;
}

export function createCompleteScenario(locale: Locale, dayType: WorkoutDayType = "day_a"): StrengthSessionData {
  const session = createFinalStretchScenario(locale, dayType);
  session.phase = "complete";
  session.activeStretchId = undefined;
  session.stretchTimer = {
    totalSeconds: getCooldownStretchTotalSeconds(cooldownStretchBlueprint.length),
    elapsedSeconds: getCooldownStretchTotalSeconds(cooldownStretchBlueprint.length),
    state: "completed",
  };
  session.stretches = createCooldownStretches(
    undefined,
    undefined,
    cooldownStretchBlueprint.map((stretch) => stretch.order),
  );
  session.sessionComplete = true;
  return session;
}
