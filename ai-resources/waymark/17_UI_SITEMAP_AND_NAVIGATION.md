# UI Sitemap and Navigation

## Core decision

There is no **Map** tab. Use **Me** instead.

Weekly Coding Report and Backlog access live under Me. Current active Expeditions can be accessed from Today. The full list of Expeditions is accessed from each Path screen.

## Bottom navigation

| Tab | Purpose |
|---|---|
| Today | Execute today |
| Capture | Capture proof, memory, or future idea |
| Journal | Review proof timeline and memories |
| Paths | Review seven paths and path-owned expeditions |
| Me | Weekly Coding Report, Backlog, settings, language, privacy, backup, signals |

## Top-level sitemap

```text
Waymark App
├─ Today
│  ├─ Today Cockpit
│  ├─ PlannedMark Action Sheet
│  ├─ Health Session Runner
│  ├─ Pack Check Run
│  ├─ Active Expedition Detail
│  └─ Close the Trail
│
├─ Capture
│  ├─ Capture Home
│  ├─ Quick Mark
│  ├─ Quick Memory
│  ├─ Backlog Capture
│  └─ Note / Lesson Capture
│
├─ Journal
│  ├─ Journal Home
│  ├─ Mark Detail
│  ├─ Memory Detail
│  ├─ Closed Day Detail
│  └─ Filtered Journal
│
├─ Paths
│  ├─ Paths Overview
│  ├─ Path Detail
│  ├─ Path Expeditions
│  └─ Expedition Detail
│
└─ Me
   ├─ Me Home
   ├─ Weekly Coding Report
   ├─ Backlog
   ├─ Settings
   ├─ Language
   ├─ Privacy
   ├─ Backup
   └─ Signals
```

## Today responsibilities

| Responsibility | Yes/No |
|---|---:|
| Show today’s executable PlannedMarks | Yes |
| Run workout session | Yes, when Health ready |
| Run Pack Check | Yes |
| Open current active Expedition | Yes |
| Show all Expeditions | No |
| Show Backlog | No |
| Run Weekly Coding | No |
| Close the Trail | Yes |

## Capture responsibilities

| Responsibility | Yes/No |
|---|---:|
| Create QuickMark | Yes |
| Create Quick Memory | Yes when Memory ready |
| Create BacklogItem | Yes |
| Plan the week | No |
| Manage Expedition routes | No |

## Journal responsibilities

| Responsibility | Yes/No |
|---|---:|
| Show Marks | Yes |
| Show Memories | Yes when ready |
| Show DailyClosures | Yes when ready |
| Filter by Path | Yes |
| Filter by Expedition | Yes when Expeditions ready |
| Process Backlog | No |

## Paths responsibilities

| Responsibility | Yes/No |
|---|---:|
| Show path status | Yes |
| Show path proof | Yes |
| Show path-linked memories | Yes when ready |
| Show Expeditions for that path | Yes |
| Create/open Expedition for path | Yes when Expedition ready |
| Show all app backlog | No |
| Run Weekly Coding | No |

## Me responsibilities

| Responsibility | Yes/No |
|---|---:|
| Weekly Coding Report | Yes |
| Backlog access | Yes |
| Language settings | Yes |
| Privacy/app lock | Yes when ready |
| Backup | Yes when ready |
| Signal settings | Yes when ready |
| App/Map version | Yes |

## Screen table

| Area | Screen | Main entity | User job |
|---|---|---|---|
| Today | Today Cockpit | DailyPlan, PlannedMark | Execute |
| Today | PlannedMark Action | PlannedMark, Mark | Done/Postpone/Substitute |
| Today | Workout Session | WorkoutSessionRun | Complete body session |
| Today | Pack Check | PackCheckRun | Complete transition |
| Today | Active Expedition Detail | Expedition | See current Expedition context |
| Today | Close the Trail | DailyClosure | Finish day |
| Capture | Capture Home | Config | Choose capture type |
| Capture | Quick Mark | Mark | Leave proof |
| Capture | Quick Memory | Memory, Mark | Save memory |
| Capture | Backlog Capture | BacklogItem | Save idea |
| Journal | Journal Home | Mark, Memory, DailyClosure | Review proof |
| Journal | Mark Detail | Mark | Inspect proof |
| Journal | Memory Detail | Memory | Relive/archive |
| Paths | Paths Overview | Path status | See balance |
| Paths | Path Detail | Mark, PlannedMark, Expedition | Review one path |
| Paths | Path Expeditions | Expedition | See path-owned Expeditions |
| Me | Me Home | App state | Personal control |
| Me | Weekly Coding Report | WeeklyCodingRun, BacklogItem | Review and generate week |
| Me | Backlog | BacklogItem | Process possibilities |

## Journal naming

Use **Journal** in UI. The underlying concept can still be Trail/proof timeline in domain code.

## Localization requirement

Every visible page must be fully localized for the selected language. A half-translated page must be hidden in that language.
