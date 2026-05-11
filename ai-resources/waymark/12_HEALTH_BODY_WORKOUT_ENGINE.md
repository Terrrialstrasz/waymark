# Health & Body Workout Engine

## Core principle

Health is the main true outlier flow.

> Workout A and Workout B are guided sessions with exercises and stretch. Walk day is just walk. Completing A → next is Walk. Completing Walk → next is B. Completing B → next is A.

## Simplified Health model

| Entity | Purpose |
|---|---|
| WorkoutSessionRun | Actual session: Workout A, Walk, or Workout B |
| WorkoutExerciseRun | Exercise result inside Workout A/B |
| ExerciseProgressionState | Current target and consecutive completions per exercise |
| Mark | Final proof created after full completion |

Removed for now:

| Removed | Reason |
|---|---|
| WorkoutSetRun | Too detailed |
| WalkSegmentRun | Walk Day just has walk |
| StretchRun | Stretch is a field on WorkoutSessionRun |
| BodyMetricLog | BP/weight can use Mark.valueJson or Close Trail later |

## Cycle

| Completed base session | Next session |
|---|---|
| Workout A | Walk |
| Walk | Workout B |
| Workout B | Workout A |

Only full completed base sessions advance the cycle.

| Result | Advances cycle? |
|---|---:|
| Workout A completed | Yes |
| Walk completed | Yes |
| Workout B completed | Yes |
| Partial workout | No |
| Recovery mark | No |
| Cancelled session | No |

## WorkoutSessionRun

| Field | Meaning |
|---|---|
| plannedMarkId | Today Body PlannedMark |
| sessionType | workout_a / walk / workout_b |
| status | started / completed / partial / cancelled |
| walkTargetSteps | For Walk only |
| walkActualSteps | For Walk only |
| walkCompleted | For Walk only |
| stretchCompleted | For Workout A/B |
| generatedMarkId | Health Mark after completion |

## WorkoutExerciseRun

| Field | Meaning |
|---|---|
| workoutSessionRunId | Parent session |
| exerciseId | Config exercise ID |
| plannedValue | Target weight/time/reps |
| actualValue | Edited actual value |
| unit | kg / seconds / reps |
| targetSets | From config |
| targetReps | From config |
| completedSets | Simple summary |
| completedReps | Optional total |
| status | pending / completed / skipped / failed |

## ExerciseProgressionState

| Field | Meaning |
|---|---|
| exerciseId | Config ID |
| currentTargetValue | Next target |
| unit | kg / seconds / reps |
| consecutiveCompletions | Current streak toward increment |
| lastCompletedWorkoutSessionRunId | Audit |
| lastCompletedAt | Audit |

## Progression rules

| Exercise/category | Required completions | Increment |
|---|---:|---:|
| Squat | 2 | +2.5kg |
| Bench Press | 2 | +2.5kg |
| Barbell Row | 2 | +2.5kg |
| Deadlift | 1 | +2.5kg |
| Military Press | 3 | +2.5kg |
| Machine/cable exercise | 3 | +5kg |
| Plank | 1 | +1s until 120s |
| Ab Wheel | 1 | +1 rep until 30 reps |

## Progression logic

| Result | Behavior |
|---|---|
| Exercise completed | Increment consecutive completions |
| Streak reaches threshold | Increase target for next session and reset streak |
| User edits actual and completes | Future basis uses actual completed value |
| Exercise skipped/failed | No progression; reset or hold streak at 0 |
| Partial session | No base cycle advance |

## Workout A/B workflow

```text
Today Body Card
  → open correct WorkoutSessionRun
  → show exercises with current targets
  → user marks each exercise completed/skipped/failed
  → user edits actual value if needed
  → user completes stretch
  → summary
  → create Health Mark
  → update progression states
  → advance cycle
```

## Walk workflow

```text
Today Body Card
  → open Walk session
  → enter/track walk result
  → complete walk
  → create Health Mark
  → advance cycle to Workout B
```

## Today visibility

Do not show Body Card until Workout A/Walk/Workout B runner is complete.

| Visible card | Must open |
|---|---|
| Workout A | Workout A runner |
| Walk | Walk runner |
| Workout B | Workout B runner |

## Acceptance criteria

| Test | Expected |
|---|---|
| Complete Workout A | Health Mark created; next session Walk |
| Complete Walk | Health Mark created; next session Workout B |
| Complete Workout B | Health Mark created; next session Workout A |
| Complete Squat twice | Squat target increases next time |
| Skip exercise | Exercise does not progress |
| Partial workout | Cycle does not advance |
| User changes actual value and completes | Progression uses actual completed value |
