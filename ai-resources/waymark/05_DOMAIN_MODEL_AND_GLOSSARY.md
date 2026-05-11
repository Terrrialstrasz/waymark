# Waymark Domain Model and Glossary

## Core glossary

| Term | Meaning |
|---|---|
| Waymark | The app and the proof left along a chosen path |
| Map | The coded system defining paths, marks, rules, copy, workflows |
| Path | A major life direction |
| Mark | Actual proof that something happened |
| PlannedMark | Committed future action selected during Weekly Coding |
| QuickMark | Fast proof action created from a template |
| BacklogItem | Raw possibility not yet committed |
| Expedition | Long-horizon container that generates PlannedMarks |
| ExpeditionRouteItem | Item inside an Expedition route/backlog |
| Journal | User-facing name for the proof timeline |
| Trail | Internal/domain concept for proof timeline |
| Pack Check | Transition checklist/attention ritual |
| PackCheckRun | Actual completed checklist instance |
| Memory | Archive object preserving a life moment |
| DailyClosure | Close the Trail record and day judgment |
| CharacterEvidence | Derived integrity evidence for the day |
| Signal | Reminder/notification that returns user to an existing flow |
| ToolSession | Intentional external app/tool use |
| Weekly Coding Report | Weekly report/review/generation process under Me |

## Key distinctions

| Concept A | Concept B | Difference |
|---|---|---|
| BacklogItem | PlannedMark | BacklogItem is uncommitted; PlannedMark is committed |
| PlannedMark | Mark | PlannedMark is intention; Mark is proof |
| QuickMarkTemplate | Mark | Template defines action; Mark records actual proof |
| Expedition | PlannedMark | Expedition is long-horizon container; PlannedMark is weekly/daily pulled work |
| ExpeditionRouteItem | PlannedMark | RouteItem is inside Expedition; PlannedMark is scheduled for a date/window |
| Memory | Mark | Memory is archive; Mark is proof. Quick memory creates both |
| PackCheckRun | Mark | PackCheckRun stores checklist; Mark may be generated if config says so |
| DailyClosure | Mark | DailyClosure judges the day; it generates a Character Mark |
| Journal | Backlog | Journal is past proof; Backlog is future possibility |

## Seven Life Paths

| Path ID | Path | Core question |
|---|---|---|
| `career_craft` | Career Craft | Did I deliver clarity or raise my standard today? |
| `snag_golf_vietnam` | SNAG Golf Vietnam | Did I build the institution today? |
| `health_body` | Health & Body | Did I protect my body today? |
| `family_home` | Family & Home | Did I give presence to my family today? |
| `character_stoicism` | Character & Stoicism | Did I act according to my standard today? |
| `golf_craft` | Golf Craft | Did I practice or learn the craft today? |
| `culture_class_romance` | Culture, Class & Romance | Did I refine the man today? |

## Entity groups

| Group | Entities |
|---|---|
| Planning | BacklogItem, WeeklyCodingRun, DailyPlan, PlannedMark |
| Proof | Mark |
| Expedition | Expedition, ExpeditionRouteItem |
| Health outlier | WorkoutSessionRun, WorkoutExerciseRun, ExerciseProgressionState |
| Memory outlier | Memory, MediaAsset, MemoryCollection, MemoryPlace, MemoryCalendarEntry, MemoryPathLink |
| Pack Check outlier | PackCheckRun |
| Close Trail outlier | DailyClosure, CharacterEvidence |
| Support | Signal, ToolSession, Review |

## Removed concepts

| Do not create | Correct treatment |
|---|---|
| FamilyPlan entity | PlannedMark proof that planning happened |
| FamilyTripPlan entity | Expedition(kind="family_trip") |
| ContentCalendarItem entity | ExpeditionRouteItem inside Expedition(kind="content_calendar") |
| ReadingShelf entity | Expedition(kind="reading_shelf") |
| GolfEventPlan entity | Expedition(kind="golf_event") |
| GolfSeasonPlan entity | Expedition(kind="golf_season") |
| Many database-level mark types | QuickMark/PlannedMark templates and config |

## Status language

| Status | Meaning |
|---|---|
| Alive | Has recent proof |
| Protected | Minimum path protection met |
| Weak | No mark for too long |
| Dominating | Path/project taking too much of the trail |
| Finished | Enough right marks were left today |
| Partial | Real progress but important path missed |
| Consumed | One path/project took over |
| Recovered | Light day, but recovery was protected |
| Reset needed | Tomorrow should be simpler |
