# Expeditions and Route Items

## Core principle

> Expedition is the generic long-horizon container. It does not create Marks directly. It generates PlannedMarks through Weekly Coding.

```text
Expedition → ExpeditionRouteItem → Weekly Coding pulls item → PlannedMark → Mark
```

## Expedition kinds

| Kind | Meaning | Example |
|---|---|---|
| project | Career/SNAG project | RSD package, website build |
| family_trip | Planned family trip | Public holiday trip |
| golf_event | Specific golf event | Tournament, course day |
| golf_season | Seasonal golf target | Summer golf tour |
| content_calendar | SNAG content calendar | Article pipeline |
| reading_shelf | Reading route | Current/on-deck/finished books |
| memory_cleanup | Organize media archive | Old gallery cleanup |
| life_capability | Enabling capability | Learn to drive |

## Removed separate entities

| Do not create | Use instead |
|---|---|
| FamilyTripPlan | Expedition(kind="family_trip") |
| ContentCalendarItem | ExpeditionRouteItem |
| ReadingShelf | Expedition(kind="reading_shelf") |
| GolfEventPlan | Expedition(kind="golf_event") |
| GolfSeasonPlan | Expedition(kind="golf_season") |

## Expedition fields

| Field | Meaning |
|---|---|
| kind | project / family_trip / content_calendar etc. |
| pathId | Primary path served |
| name | Display name |
| destination | What arrival means |
| whyItMatters | Meaning layer |
| definitionOfDone | Closure condition |
| status | draft / active / paused / closed / cancelled |
| intensity | normal / heavy / emergency |
| protectedPathIds | Paths protected from overconsumption |
| arrivalTargetDate | Desired finish |
| lastSafeDate | Latest safe date |
| visibility | Where it appears |
| metadataJson | Kind-specific flexible data |

## ExpeditionRouteItem

A route item is a future unit of work or step inside an Expedition.

| Field | Meaning |
|---|---|
| expeditionId | Parent Expedition |
| title | Route item title |
| description | Optional detail |
| status | route_backlog / ready / pulled / completed / parked / cancelled |
| sequence | Order |
| targetDate | Optional target |
| sourceBacklogItemId | Origin idea |
| createdPlannedMarkIds | PlannedMarks generated from this item |
| metadataJson | Kind-specific details |

## Visibility

| Expedition visibility | Location |
|---|---|
| Current active Expedition | Today, only if detail works |
| All Career Expeditions | Career Path screen |
| All SNAG Expeditions | SNAG Path screen |
| Family trip Expeditions | Family Path screen |
| Golf event/season Expeditions | Golf Path screen |
| Reading shelf Expedition | Culture Path screen |
| Memory cleanup Expedition | Journal or relevant path |

There is no central Map/Expedition tab.

## Weekly pulling flow

| Step | Behavior |
|---:|---|
| 1 | Open Weekly Coding Report under Me |
| 2 | Review active Expeditions |
| 3 | Select ready route items |
| 4 | Create PlannedMarks for this week |
| 5 | Route item status becomes pulled |
| 6 | Today shows only date-relevant PlannedMarks |
| 7 | Done creates Mark linked to Expedition and RouteItem |

## Expedition detail UI

| Section | Purpose |
|---|---|
| Header | Name, path, kind, status |
| Destination | What done means |
| Why it matters | Meaning |
| Definition of done | Closure condition |
| Protected paths | Anti-consumption guard |
| Route | Route backlog, ready items, pulled items |
| Proof | Marks linked to Expedition |
| Warnings | Dominance / last safe date |
| Close | Exit ritual later |

## Acceptance criteria

| Test | Expected |
|---|---|
| Create Expedition | Saved with path, kind, destination |
| Add route item | Route item saved |
| Pull route item | PlannedMark created with expedition links |
| Complete PlannedMark | Mark linked to Expedition |
| Open path screen | Expedition appears under its path |
| No active current Expedition | Today hides Expedition card |
