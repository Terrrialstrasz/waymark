# Workflow Requirements

## Master workflow principle

> Workflow readiness decides visibility.

A feature is not ready when a screen exists. It is ready when the full workflow can start, complete, save the correct entities, update Journal, and be understood by Close the Trail.

## Workflow contract

Every workflow must define:

| Field | Requirement |
|---|---|
| Workflow ID | Stable internal name |
| Entry point | Today, Capture, Journal, Paths, Me, Signal |
| Visibility condition | When it can appear |
| Preconditions | Data/config needed |
| User steps | Actual user actions |
| Entities read | Inputs |
| Entities written | Outputs |
| Mark output | Whether it creates a Mark |
| Cancel behavior | What happens if user exits |
| Journal behavior | What appears in Journal |
| Close Trail behavior | How closure interprets it |
| Acceptance test | Proof it works |

## Core workflows

| Workflow | Entry point | Entities written | Creates Mark? |
|---|---|---|---:|
| Quick Capture to Backlog | Capture | BacklogItem | No |
| QuickMark to Mark | Capture / Today | Mark | Yes |
| Weekly Coding Report | Me | WeeklyCodingRun, DailyPlan, PlannedMark | No |
| PlannedMark Execution | Today | PlannedMark, Mark | Yes if Done/Substitute |
| Expedition Route Planning | Paths / Me | Expedition, RouteItem, PlannedMark | Indirect |
| Health Workout Session | Today | WorkoutSessionRun, ExerciseRun, Mark | Yes |
| Pack Check Run | Today / Signal | PackCheckRun, optional Mark | Maybe |
| Quick Memory Capture | Capture | Memory, MediaAsset, Mark | Yes |
| Promote Mark to Memory | Journal | Memory | No new Mark required |
| Close the Trail | Today / Signal | DailyClosure, Character Mark | Yes |
| Signal Lifecycle | Notification / Signal Center | Signal | No |
| Tool Session | Tools later | ToolSession, optional outputs | Maybe |
| Review | Me later | Review, optional Mark/BacklogItems | Maybe |

## Quick Capture to Backlog

```text
Capture → Idea/Later → type raw idea → save BacklogItem → process in Weekly Coding
```

Acceptance:

| Test | Expected |
|---|---|
| Capture idea | BacklogItem created |
| Open Today | Idea hidden |
| Open Weekly Coding Report | Idea appears |

## QuickMark to Mark

```text
Tap QuickMark → Mark saved → optional note/photo/undo → Journal
```

Acceptance:

| Test | Expected |
|---|---|
| Tap routine quick mark | Mark saved instantly |
| Add optional note | Note attaches |
| Undo | Mark soft-deleted |

## Weekly Coding Report

```text
Me → Weekly Coding Report
  → review week
  → process backlog
  → review path expeditions
  → pull route items
  → generate DailyPlans and PlannedMarks
```

Acceptance:

| Test | Expected |
|---|---|
| Convert BacklogItem | PlannedMark or Expedition created |
| Pull route item | PlannedMark has expedition links |
| Generate week | Today shows date-relevant PlannedMarks |

## PlannedMark Execution

Actions:

| Action | Behavior |
|---|---|
| Done | Create Mark, set completed |
| Postpone | Move same work to new date/window |
| Substitute | Create substitute Mark |
| Block | Save blocker reason |
| Cancel | Cancel item |
| Missed | Usually set in Close Trail |

Acceptance:

| Test | Expected |
|---|---|
| Tap Done | Mark created and linked |
| Tap Postpone | Original removed from Today |
| Tap Substitute | Substitute Mark created |

## Health Workout Session

```text
Today Body Card → correct A/Walk/B runner → complete session → create Health Mark → update cycle/progression
```

Acceptance:

| Test | Expected |
|---|---|
| Complete A | Next is Walk |
| Complete Walk | Next is B |
| Complete B | Next is A |
| Exercise completes threshold | Target increases |

## Pack Check Run

```text
Open Pack Check → complete/skip items → save PackCheckRun → optional Mark based on config
```

Acceptance:

| Test | Expected |
|---|---|
| Complete Pack Check | PackCheckRun saved |
| Config has completionMark | Mark created |
| No completionMark | No Mark created |

## Quick Memory Capture

```text
Capture Memory → add photo/text → choose paths → save Memory + MediaAsset + Mark
```

Acceptance:

| Test | Expected |
|---|---|
| Save quick memory | Memory and Mark created |
| Select multiple paths | MemoryPathLinks created |
| Open Journal | Memory visible |

## Close the Trail

```text
Open Close Trail → summary → planned vs completed → consumed/anchor check → Character result → tomorrow step → DailyClosure + Character Mark
```

Acceptance:

| Test | Expected |
|---|---|
| Save closure | DailyClosure created |
| Closure saved | Character Mark generated |
| Consumed path detected | Stored in DailyClosure |

## Visibility rule

| If visible | Workflow required |
|---|---|
| Body Card | Health Workout Session |
| Pack Check card | Pack Check Run |
| Current Expedition | Expedition Detail and route/proof |
| Memory capture | Quick Memory Capture |
| Close Trail | Close the Trail |
| Signal bell | Signal Center and target flows |
| Journal tab | Journal Home and detail routes |
| Paths tab | Paths Overview and Path Detail |
