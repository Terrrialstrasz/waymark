# Mark Flows: Planned and Quick

## Core principle

> There are only two normal Mark flows: PlannedMark and QuickMark.

Anything outside these two flows must be deliberately coded as an outlier.

## What a Mark is

A `Mark` is proof that something happened. It should stay small and simple.

| Mark should contain | Mark should not contain |
|---|---|
| pathId | planning logic |
| source | backlog conversion logic |
| title | consumed-day logic |
| note | workout progression |
| links to parent entities | memory archive rules |
| label snapshot | pack check item state |
| privacy | expedition route planning |

## Flow A: PlannedMark → Mark

Used for committed actions selected during Weekly Coding.

```text
Weekly Coding → PlannedMark → Today → Done/Postpone/Substitute → Mark or status update
```

### PlannedMark actions

| Action | Meaning | Output |
|---|---|---|
| Done | Completed as intended | Create Mark and link it |
| Postpone | Same work moved | Original becomes postponed; future PlannedMark created/linked |
| Substitute | Different meaningful proof replaces original | Create substitute Mark |
| Block | Cannot move until input arrives | Save blocker reason |
| Cancel | No longer worth doing | Cancel PlannedMark |
| Missed | Not done and not honestly moved | Usually set during Close Trail |

### PlannedMark required fields

| Field | Why |
|---|---|
| pathId | Path served |
| date | Today visibility |
| title | User-facing action |
| status | Execution state |
| slotId | Daily Finish Line relation |
| timingType | anchored/window/floating/recovery |
| doneCondition | Especially for Career/SNAG |
| expeditionId | If pulled from Expedition |
| actualMarkId | Proof link |
| labelSnapshot | Historical label safety |

## Flow B: QuickMarkTemplate → Mark

Used for fast proof.

```text
Tap/type quick proof → optional note/attachment → save Mark
```

### QuickMark rules

| Rule | Meaning |
|---|---|
| Routine QuickMarks require no text | Tap should save immediately |
| Optional note comes after proof | Note must not block completion |
| QuickMarks are common actions only | Rare actions should be free text or Backlog |
| QuickMark does not create future work | Future ideas go to Backlog |
| QuickMark can create Memory only if configured | Quick memory is its own flow |

## What is not a separate Mark flow

| Use case | Correct treatment |
|---|---|
| Expedition work | PlannedMark with `expeditionId` |
| Career delivery | PlannedMark template |
| SNAG content | PlannedMark template |
| Family plan | PlannedMark proof that planning happened |
| Family trip task | ExpeditionRouteItem → PlannedMark |
| Content calendar item | ExpeditionRouteItem → PlannedMark |
| Reading shelf item | ExpeditionRouteItem → PlannedMark or QuickMark |
| Golf event task | ExpeditionRouteItem → PlannedMark |
| Pack Check completion | PackCheckRun may create Mark based on config |
| Close the Trail | DailyClosure creates Character Mark |
| Workout completion | WorkoutSessionRun creates Health Mark |
| Quick memory | Memory + Mark |

## True outlier flows

| Outlier | Why not normal Mark flow |
|---|---|
| WorkoutSessionRun | Needs guided session and progression |
| Memory | Needs media, collection, path links, archive logic |
| PackCheckRun | Needs checklist item completion |
| DailyClosure | Needs day judgment and CharacterEvidence |
| Signal | Reminder lifecycle, no direct Mark |
| ToolSession | External app purpose/return result |

## Today visibility rule

A Mark-producing item appears in Today only if the complete underlying flow works.

| Today item | Required flow |
|---|---|
| Simple PlannedMark | PlannedMark action sheet |
| Body Mark | Health Session Runner |
| Pack Check | PackCheckRun flow |
| Memory capture | Memory + MediaAsset + Mark flow |
| Current Expedition | Expedition detail and route/proof |
| Close Trail | DailyClosure + Character Mark |
