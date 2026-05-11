# Build Backlog and Order

## Build philosophy

> MVP means limited exposure, not weak architecture.

No visible feature unless its workflow is complete end to end.

## Release 0 — Project foundation

| ID | Feature | Done when |
|---|---|---|
| R0.1 | Expo app shell | App opens |
| R0.2 | Bottom tabs | Today, Capture, Journal, Paths, Me render |
| R0.3 | Theme provider | Components can read tokens |
| R0.4 | SQLite setup | Migrations run |
| R0.5 | Feature visibility registry | Hidden flows are guarded |
| R0.6 | Route guards | Hidden screens cannot be opened |
| R0.7 | Map config folder | Config exports stable IDs |
| R0.8 | Domain types | Types compile |
| R0.9 | Localization base | `en`/`vi` helper works |
| R0.10 | Privacy scopes | Records support privacy |

## Release 1 — UI Component Phase

| ID | Feature | Done when |
|---|---|---|
| R1.1 | Tokens | Colors/type/spacing/radius/shadow ready |
| R1.2 | Primitive components | Button, Card, Sheet, Chip, Badge, Carousel ready |
| R1.3 | Domain components | PathCard, MarkCard, PlannedMarkCard, PackCheckCard, ExpeditionCard, MemoryCard ready |
| R1.4 | Component Lab | Dev preview works |
| R1.5 | State Lab | All states render |
| R1.6 | Localization Lab | EN/VI layout works |

## Release 2 — Data model and repositories

| ID | Feature | Done when |
|---|---|---|
| R2.1 | Planning schema | Backlog, WeeklyCoding, DailyPlan, PlannedMark CRUD works |
| R2.2 | Mark schema | Mark save/load works |
| R2.3 | Expedition schema | Expedition and RouteItem CRUD works |
| R2.4 | Health schema | WorkoutSession/Exercise/Progression CRUD works |
| R2.5 | Memory schema | Memory/media/link CRUD works |
| R2.6 | Pack Check schema | PackCheckRun CRUD works |
| R2.7 | Close Trail schema | DailyClosure saves |
| R2.8 | Support schema | Signals, ToolSessions, Reviews hidden but ready |
| R2.9 | Repository layer | Screens do not use raw SQLite |

## Release 3 — Map config and seed data

| ID | Feature | Done when |
|---|---|---|
| R3.1 | Seven paths config | Career/SNAG separated |
| R3.2 | QuickMark templates | Minimal templates localized |
| R3.3 | PlannedMark templates | Main/body/family/work templates |
| R3.4 | Daily Finish Line config | Required slots coded |
| R3.5 | Weekly plan config | Can generate plan |
| R3.6 | PackCheck config | Completion mark rules coded |
| R3.7 | Workout config | A/Walk/B templates complete |
| R3.8 | Progression rules | Per-exercise rules complete |
| R3.9 | Expedition kind config | Kinds and visibility ready |
| R3.10 | Page copy config | No half-translated pages |

## Release 4 — Core Mark flows

| ID | Feature | Done when |
|---|---|---|
| R4.1 | QuickMark → Mark | One-tap save works |
| R4.2 | Optional note | Note attaches after save |
| R4.3 | Undo recent mark | Soft delete works |
| R4.4 | PlannedMark creation | Records save |
| R4.5 | PlannedMark action sheet | Done/Postpone/Substitute works |
| R4.6 | Done | Creates linked Mark |
| R4.7 | Postpone | Moves out of Today |
| R4.8 | Substitute | Creates substitute Mark |
| R4.9 | PlannedMark status summary | Close Trail can read it |

## Release 5 — First executable Today

| ID | Feature | Done when |
|---|---|---|
| R5.1 | Today data composer | Builds view model |
| R5.2 | Header/date | Localized |
| R5.3 | Marks to Leave | Only executable PlannedMarks render |
| R5.4 | Quick Capture footer | Opens working capture options |
| R5.5 | Completed state | UI updates immediately |
| R5.6 | Hidden feature filtering | No placeholders |
| R5.7 | Empty-safe state | No broken Today |

## Release 6 — Capture and Backlog

| ID | Feature | Done when |
|---|---|---|
| R6.1 | Capture Home | Only working options show |
| R6.2 | Quick Mark capture | Mark saved |
| R6.3 | Backlog capture | BacklogItem saved |
| R6.4 | Note/Lesson capture | Mark or Backlog choice works |
| R6.5 | Path picker | Localized path labels |

## Release 7 — Journal

| ID | Feature | Done when |
|---|---|---|
| R7.1 | Journal Home | Marks render by time |
| R7.2 | JournalItem renderer | Mark variant works |
| R7.3 | Mark Detail | Proof opens |
| R7.4 | Path filter | Works by path ID |
| R7.5 | Closure/Memory variants | Hidden until flows ready |

## Release 8 — Paths

| ID | Feature | Done when |
|---|---|---|
| R8.1 | Paths Overview | Seven path cards render |
| R8.2 | Path status v1 | Alive/protected/weak works |
| R8.3 | Path Detail template | Recent proof/planned marks render |
| R8.4 | Career screen | No SNAG mixing |
| R8.5 | SNAG screen | Separate SNAG proof |
| R8.6 | Path Expedition list | After Expedition basics |

## Release 9 — Me, Weekly Coding Report, Backlog processing

| ID | Feature | Done when |
|---|---|---|
| R9.1 | Me Home | Ready sections render |
| R9.2 | Weekly Coding Report shell | Current week summary reads data |
| R9.3 | Planned vs actual summary | Counts correct |
| R9.4 | Path balance report | Counts by path |
| R9.5 | Backlog waiting | Opens Backlog |
| R9.6 | Generate week | DailyPlans/PlannedMarks created |
| R9.7 | Backlog list | Items render |
| R9.8 | Convert to PlannedMark | Works |
| R9.9 | Park/cancel backlog | Works |

## Release 10 — Close the Trail

| ID | Feature | Done when |
|---|---|---|
| R10.1 | Close Trail entry | Opens only when complete |
| R10.2 | Marks summary | Shows today proof |
| R10.3 | Planned vs completed | Correct summary |
| R10.4 | Missed detection | Updates PlannedMarks |
| R10.5 | Consumed path detection | User can confirm |
| R10.6 | Anchor deviation | Stored |
| R10.7 | CharacterEvidence | Generated |
| R10.8 | Tomorrow first step | Saved |
| R10.9 | DailyClosure save | Works |
| R10.10 | Character Mark generation | Works |

## Release 11 — Pack Checks

| ID | Feature | Done when |
|---|---|---|
| R11.1 | PackCheckRun engine | Runs save |
| R11.2 | Checklist UI | Complete/skip works |
| R11.3 | Completion Mark creation | Config decides |
| R11.4 | Morning Pack Check | Works end to end |
| R11.5 | Office Pack Check | Works end to end |
| R11.6 | Today carousel | Only complete checks visible |

## Release 12 — Health Session Runner

| ID | Feature | Done when |
|---|---|---|
| R12.1 | Body cycle engine | A→Walk→B works |
| R12.2 | Today Body Card | Opens correct session |
| R12.3 | Workout A runner | Complete and save |
| R12.4 | Walk runner | Complete and save |
| R12.5 | Workout B runner | Complete and save |
| R12.6 | Exercise result entry | Actual values save |
| R12.7 | Progression update | Targets update |
| R12.8 | Failed/skipped handling | No false progression |
| R12.9 | Health Mark generation | Works |

## Release 13 — Expeditions

| ID | Feature | Done when |
|---|---|---|
| R13.1 | Create Expedition | Saves with kind/path |
| R13.2 | Route items | CRUD works |
| R13.3 | Path Expedition List | Path-owned lists work |
| R13.4 | Expedition Detail | Route/proof renders |
| R13.5 | Pull route item | PlannedMark generated |
| R13.6 | Today Current Expedition card | Opens detail |

## Release 14 — Memories

| ID | Feature | Done when |
|---|---|---|
| R14.1 | Media service | Local file save works |
| R14.2 | Quick Memory | Memory + MediaAsset + Mark created |
| R14.3 | Memory path links | Multiple paths work |
| R14.4 | Memory Detail | Opens |
| R14.5 | Memory Journal item | Renders |
| R14.6 | Promote Mark to Memory | Later |
| R14.7 | Travel Memory Map | Later, only if complete |

## Release 15+ — Later layers

| Release | Scope |
|---|---|
| R15 | Expedition kind-specific views: content calendar, reading shelf, family trip, golf event |
| R16 | Signals and notifications |
| R17 | Tools Gateway |
| R18 | Privacy/App Lock/Backup |
| R19 | Reviews/Search/AI later |

## MVP definition

### MVP 1 — Honest Daily Core

Visible:

- Today with executable PlannedMarks only
- Capture with QuickMark and Backlog capture
- Journal with Marks
- Paths with path cards and path mark history
- Me with Weekly Coding Report and Backlog
- Close the Trail

Hidden:

- Health Body Card until runner works
- Pack Check carousel until PackCheckRun works
- Memory capture until Memory + MediaAsset works
- Current Expedition card until detail works
- Signal bell until Signal Center works

## Final build rule

> Build complete vertical workflows, not disconnected screens. Component first. Data model second. Core mark workflows third. Then assemble Today, Capture, Journal, Paths, and Me. Anything incomplete stays invisible.
