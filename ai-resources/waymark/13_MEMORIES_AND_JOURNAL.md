# Memories and Journal

## Core principle

> Memory is its own archive entity. A Mark may be marked as a Memory, but a quick Memory always creates a Mark.

## UI naming

| Domain | UI |
|---|---|
| Trail | Journal |
| Trail item | Journal item |
| DailyClosure | Closed day |

Use **Journal** in user-facing navigation. Domain code may still use Trail/proof timeline language internally.

## Memory rules

| Rule | Meaning |
|---|---|
| Quick memory creates Mark | Memory + MediaAsset + Mark are created |
| Existing Mark can become Memory | Mark remains proof; Memory adds archive layer |
| Memory can link multiple paths | Use MemoryPathLink |
| Memory can hold many photos | Use MediaAsset |
| Memory can belong to collection | Trip, anniversary, event, album, season |
| Memory can have place | MemoryPlace enables travel map |
| Memory can have calendar | Anniversary/trip/event dates |
| Memory counts toward path balance only through linked Mark | Memory itself is archive |

## Memory entities

| Entity | Purpose |
|---|---|
| Memory | Preserved life moment |
| MediaAsset | Photo/video/audio/file |
| MemoryPathLink | Many-to-many path link |
| MemoryCollection | Trip, anniversary, event, album, season |
| MemoryCollectionLink | Many-to-many memory collection link |
| MemoryPlace | Place/province/geographic tagging |
| MemoryCalendarEntry | Anniversary/trip/event date |

## Quick Memory flow

```text
Capture → Quick Memory
  → take/select photo or write memory
  → choose path(s)
  → optional caption
  → save Memory
  → save MediaAsset(s)
  → create Mark linked to Memory
  → show in Journal
```

## Promote Mark to Memory

```text
Journal → Mark Detail
  → Keep as Memory
  → add optional caption/photo/path/place
  → create Memory
  → link Mark to Memory
```

This does not need to create a new Mark.

## Journal Home

Journal shows proof timeline and archive items.

| Journal item | Source |
|---|---|
| Mark | marks |
| Memory | memories |
| Closed day | daily_closures |
| Workout proof | workout_session_runs + generated Mark |
| Pack Check proof | pack_check_runs + optional Mark |
| Expedition proof | marks with expeditionId |
| Review | reviews later |

## Journal screens

| Screen | Purpose |
|---|---|
| Journal Home | Timeline of proof |
| Mark Detail | One Mark |
| Memory Detail | One Memory and media |
| Closed Day Detail | DailyClosure summary |
| Filtered Journal | By path, expedition, memory-only |
| Travel Memory Map | Later, province → trip → memories |

## Memory Collection kinds

| Kind | Example |
|---|---|
| trip | Đà Nẵng family trip |
| anniversary | Wedding anniversary |
| event | Child school event |
| album | Family weekends |
| season | Golf season |
| memory_cleanup | Imported gallery cleanup batch |

## Travel Memory Map rule

| Concept | Meaning |
|---|---|
| Province | Geography |
| Trip | Story |
| Memory | Proof |

Flow:

```text
Tap province → see trips → tap trip → see memories → tap memory → Memory Detail / Journal Detail
```

## Visibility rules

| Feature | Show only when |
|---|---|
| Memory capture | Memory + MediaAsset + Mark flow complete |
| Memory Journal item | Memory detail opens correctly |
| Travel Memory Map | Province/trip/memory flow complete |
| Memory calendar | Calendar entries and prompts work |

## Acceptance criteria

| Test | Expected |
|---|---|
| Create photo memory | MediaAsset saved locally |
| Save quick memory | Memory and Mark created |
| Path selected | MemoryPathLink created |
| Caption blank | Allowed |
| Open Journal | Memory appears |
| Promote Mark | Memory created and linked; original Mark remains |
