import assert from "node:assert/strict";
import { createCooldownScenario, createDayAStrengthScenario, createDayBStrengthScenario, createTimedScenario } from "../src/labs/__fixtures__/healthStrength.fixtures";
import { advanceStrengthSession, updateStrengthSetActualLoad } from "../src/lib/waymark/strengthSessionExecution";
import { getStrengthSessionPrimaryAction } from "../src/components/health/strength/getStrengthSessionPrimaryAction";
import { getStrengthSessionPrimaryFocusTarget } from "../src/components/health/strength/getStrengthSessionPrimaryFocusTarget";

type StrengthSessionScenario =
  | ReturnType<typeof createDayAStrengthScenario>
  | ReturnType<typeof createDayBStrengthScenario>
  | ReturnType<typeof createTimedScenario>
  | ReturnType<typeof createCooldownScenario>;

function expectDefined<T>(value: T | null | undefined, label: string): NonNullable<T> {
  assert.ok(value, `${label} should be defined`);
  return value as NonNullable<T>;
}

function getExercise(session: StrengthSessionScenario, exerciseId: string) {
  const exercise = session.exercises.find((item) => item.id === exerciseId);
  return expectDefined(exercise, `exercise ${exerciseId}`);
}

function getSet(session: StrengthSessionScenario, exerciseId: string, setNumber: number) {
  const exercise = getExercise(session, exerciseId);
  const sets = expectDefined(exercise.sets, `sets for ${exerciseId}`);
  const set = sets.find((item) => item.setNumber === setNumber);
  return expectDefined(set, `set ${setNumber} for ${exerciseId}`);
}

async function runTests() {
  {
    let session = createDayAStrengthScenario("en");
    session = advanceStrengthSession(session, "complete_strength_set");

    assert.equal(session.phase, "rest");
    assert.equal(getExercise(session, "barbell-squat").restTimer?.totalSeconds, 90);
    assert.equal(getSet(session, "barbell-squat", 1).state, "done");
    assert.equal(getSet(session, "barbell-squat", 2).state, "next");
    assert.equal(getStrengthSessionPrimaryAction(session).actionType, "start_next_set");
  }

  {
    let session = createDayAStrengthScenario("en");
    session = advanceStrengthSession(session, "complete_strength_set");
    session = advanceStrengthSession(session, "start_next_set");

    assert.equal(session.phase, "strength");
    assert.equal(getSet(session, "barbell-squat", 2).state, "active");
    assert.equal(getSet(session, "barbell-squat", 2).actualLoad, 60);
    assert.equal(getStrengthSessionPrimaryAction(session).actionType, "complete_strength_set");
  }

  {
    const session = createDayAStrengthScenario("en");
    const activeExercise = session.exercises[0]!;
    activeExercise.sets = activeExercise.sets?.map((set, index) => ({
      ...set,
      state: index === 0 ? "next" : "upcoming",
      actualLoad: index === 0 ? null : set.actualLoad,
    }));

    assert.equal(getStrengthSessionPrimaryAction(session).actionType, "start_next_set");
  }

  {
    let session = createDayAStrengthScenario("en");
    session = advanceStrengthSession(session, "complete_strength_set");
    session = advanceStrengthSession(session, "start_next_set");
    session = updateStrengthSetActualLoad(session, "barbell-squat-set-2", 62.5);
    session = advanceStrengthSession(session, "complete_strength_set");
    session = advanceStrengthSession(session, "start_next_set");

    assert.equal(getSet(session, "barbell-squat", 3).actualLoad, 62.5);
  }

  {
    let session = createDayAStrengthScenario("en");
    session = advanceStrengthSession(session, "complete_strength_set");
    session = advanceStrengthSession(session, "start_next_set");
    session = advanceStrengthSession(session, "complete_strength_set");
    session = advanceStrengthSession(session, "start_next_set");
    session = advanceStrengthSession(session, "complete_strength_set");

    assert.equal(getSet(session, "barbell-squat", 3).state, "done");
    assert.equal(getExercise(session, "barbell-squat").restTimer, undefined);
    assert.equal(getExercise(session, "barbell-squat").state, "done");
    assert.equal(session.activeExerciseId, "barbell-squat");
    assert.equal(getExercise(session, "standing-barbell-military-press").state, "upcoming");
    assert.equal(getSet(session, "standing-barbell-military-press", 1).state, "upcoming");
    assert.equal(getSet(session, "standing-barbell-military-press", 1).actualLoad, null);
    assert.equal(getStrengthSessionPrimaryAction(session).actionType, "next_exercise");
  }

  {
    let session = createTimedScenario("en");
    session = advanceStrengthSession(session, "complete_timed_set");

    assert.equal(getExercise(session, "plank").state, "done");
    assert.equal(session.phase, "timed");
    assert.equal(session.activeExerciseId, "plank");
    assert.equal(session.activeStretchId, undefined);
    assert.equal(session.stretchTimer, undefined);
    assert.equal(getStrengthSessionPrimaryAction(session).actionType, "start_cooldown");
  }

  {
    let session = createCooldownScenario("en");

    assert.equal(session.stretchTimer?.totalSeconds, 30);

    session = advanceStrengthSession(session, "complete_stretch");

    assert.equal(session.activeStretchId, undefined);
    assert.equal(session.stretchTimer?.state, "completed");
    assert.equal(session.stretchTimer?.totalSeconds, 30);
    assert.equal(session.stretchTimer?.elapsedSeconds, 30);
    assert.equal(session.stretches[0]?.state, "done");
    assert.equal(session.stretches[1]?.state, "next");
    assert.equal(getStrengthSessionPrimaryAction(session).actionType, "start_next_stretch");

    session = advanceStrengthSession(session, "start_next_stretch");

    assert.equal(session.activeStretchId, "stretch-calf-right");
    assert.equal(session.stretchTimer?.totalSeconds, 30);
    assert.equal(session.stretchTimer?.elapsedSeconds, 0);
    assert.equal(getStrengthSessionPrimaryAction(session).actionType, "complete_stretch");

    session = advanceStrengthSession(session, "complete_stretch");
    assert.equal(session.stretches[2]?.state, "next");
    assert.equal(session.stretchTimer?.totalSeconds, 30);

    session = advanceStrengthSession(session, "start_next_stretch");
    assert.equal(session.activeStretchId, "stretch-forward-bend");
    assert.equal(session.stretchTimer?.totalSeconds, 45);
  }

  {
    const session = createCooldownScenario("en");
    session.stretches = [];
    session.activeStretchId = undefined;
    session.stretchTimer = undefined;

    assert.equal(getStrengthSessionPrimaryAction(session).actionType, "finish_session");
  }

  {
    let session = createDayBStrengthScenario("en");
    session = advanceStrengthSession(session, "complete_strength_set");
    assert.equal(getExercise(session, "wide-grip-lat-pulldown").restTimer?.totalSeconds, 90);
    session = advanceStrengthSession(session, "start_next_set");
    session = advanceStrengthSession(session, "complete_strength_set");

    assert.equal(session.activeExerciseId, "wide-grip-lat-pulldown");
    assert.equal(getStrengthSessionPrimaryAction(session).actionType, "next_exercise");

    session = advanceStrengthSession(session, "next_exercise");

    assert.equal(session.activeExerciseId, "wood-chop");
    assert.equal(getExercise(session, "wood-chop").state, "active");
    assert.equal(getSet(session, "wood-chop", 1).state, "active");

    session = advanceStrengthSession(session, "complete_strength_set");

    assert.equal(getExercise(session, "wood-chop").state, "done");
    assert.equal(getStrengthSessionPrimaryAction(session).actionType, "next_exercise");
  }

  {
    let session = createCooldownScenario("en");
    const stretchOneAction = getStrengthSessionPrimaryAction(session);
    const stretchOneTarget = getStrengthSessionPrimaryFocusTarget(session, stretchOneAction);
    assert.equal(stretchOneTarget?.focusKey, "complete_stretch:stretch-calf-left");

    session = advanceStrengthSession(session, "complete_stretch");
    const stretchTwoAction = getStrengthSessionPrimaryAction(session);
    const stretchTwoTarget = getStrengthSessionPrimaryFocusTarget(session, stretchTwoAction);
    assert.equal(stretchTwoTarget?.focusKey, "start_next_stretch:stretch-calf-right");
  }

  {
    let session = createDayAStrengthScenario("en");
    let action = getStrengthSessionPrimaryAction(session);
    let target = getStrengthSessionPrimaryFocusTarget(session, action);
    assert.equal(target?.focusKey, "complete_strength_set:barbell-squat:set-1");

    session = advanceStrengthSession(session, "complete_strength_set");
    action = getStrengthSessionPrimaryAction(session);
    target = getStrengthSessionPrimaryFocusTarget(session, action);
    assert.equal(target?.focusKey, "start_next_set:barbell-squat:after-set-1");

    session = advanceStrengthSession(session, "start_next_set");
    action = getStrengthSessionPrimaryAction(session);
    target = getStrengthSessionPrimaryFocusTarget(session, action);
    assert.equal(target?.focusKey, "complete_strength_set:barbell-squat:set-2");
  }

  {
    const session = createDayBStrengthScenario("en");

    assert.equal(session.dayType, "day_b");
    assert.equal(session.dayLabel, "Day B");
    assert.deepEqual(
      session.exercises.map((exercise) => exercise.title.en),
      [
        "Barbell Deadlift",
        "Bent Over Barbell Row",
        "Wood Chop",
        "Kneeling Ab Wheel Rollout",
      ],
    );
    const firstExercise = expectDefined(session.exercises[0], "first Day B exercise");
    const lastExercise = expectDefined(session.exercises[3], "last Day B exercise");
    assert.equal(firstExercise.mode, "reps_load");
    assert.equal(firstExercise.supportsLoad, true);
    assert.equal(lastExercise.mode, "reps_only");
    assert.equal(lastExercise.supportsLoad, false);
    assert.equal(expectDefined(lastExercise.sets, "last Day B exercise sets").every((set) => set.targetLoad == null), true);
    assert.deepEqual(
      session.stretches.map((stretch) => stretch.title.en),
      [
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
      ],
    );
    assert.equal(expectDefined(session.stretches[0], "stretch 0").durationSeconds, 30);
    assert.equal(expectDefined(session.stretches[2], "stretch 2").durationSeconds, 45);
    assert.equal(expectDefined(session.stretches[12], "stretch 12").durationSeconds, 60);
  }

  {
    const session = createDayAStrengthScenario("en");

    assert.deepEqual(
      session.exercises.map((exercise) => exercise.title.en),
      [
        "Barbell Squat",
        "Standing Barbell Military Press",
        "Barbell Bench Press",
        "Pallof Press",
        "Plank",
      ],
    );
  }
}

runTests()
  .then(() => console.log("strength-session-execution tests passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
