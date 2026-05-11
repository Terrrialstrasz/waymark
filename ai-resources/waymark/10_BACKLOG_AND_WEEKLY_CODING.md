# Backlog and Weekly Coding

## Core principle

> Backlog holds possibilities. Weekly Coding turns selected possibilities into PlannedMarks or Expeditions.

Backlog is not Today. Backlog is not proof. Backlog does not create pressure.

## BacklogItem

A `BacklogItem` is anything not yet pulled into the daily cockpit.

| Source | Example | Later becomes |
|---|---|---|
| Quick capture idea | “Try family picnic at West Lake” | PlannedMark or ExpeditionRouteItem |
| SNAG content idea | “Mini games article” | ExpeditionRouteItem in content calendar |
| Family planning idea | “Plan Sunday family activity” | PlannedMark |
| Family trip idea | “Đà Nẵng holiday” | Expedition(kind="family_trip") |
| Golf seasonal idea | “Summer golf tour” | Expedition(kind="golf_season") |
| Reading idea | “Read Meditations again” | ExpeditionRouteItem in reading_shelf |
| Memory idea | “Organize Huế photos” | Expedition(kind="memory_cleanup") |
| Tool result | Useful future action found in another app | BacklogItem |

## Backlog statuses

| Status | Meaning |
|---|---|
| inbox | Captured, not analyzed |
| analyzing | Being reviewed in Weekly Coding |
| ready | Clear enough to convert |
| converted | Became PlannedMark/Expedition/RouteItem |
| parked | Kept for later |
| cancelled | Discarded |

## Weekly Coding Report

Weekly Coding is not a Map tab and not a heavy planning workspace. It lives under **Me** as a report/review/generation screen.

## Weekly Coding responsibilities

| Responsibility | Reads | Writes |
|---|---|---|
| Review last week | Marks, PlannedMarks, DailyClosures | Review, BacklogItems |
| Process backlog | BacklogItems | PlannedMarks, Expeditions, RouteItems |
| Pull expedition items | ExpeditionRouteItems | PlannedMarks |
| Protect path balance | Path config, weekly minimums | DailyPlans, PlannedMarks |
| Generate the week | Weekly plan config | WeeklyCodingRun, DailyPlans, PlannedMarks |

## Conversion rules

| Backlog conversion | Output |
|---|---|
| Simple action | PlannedMark |
| Large multi-step direction | Expedition |
| Item belongs to existing Expedition | ExpeditionRouteItem |
| Family weekend planning | PlannedMark |
| Major family trip | Expedition(kind="family_trip") |
| SNAG content calendar item | ExpeditionRouteItem inside content_calendar Expedition |
| Reading shelf item | ExpeditionRouteItem inside reading_shelf Expedition |
| Golf event or season | Expedition(kind="golf_event" or "golf_season") |
| Not worth doing | Cancelled |
| Not now | Parked |

## Weekly Coding flow

```text
Me → Weekly Coding Report
  → Review last week
  → Review backlog
  → Review active path Expeditions
  → Pull route items into week
  → Create PlannedMarks
  → Assign date/window/slot
  → Generate DailyPlans
  → Save WeeklyCodingRun
```

## What appears in Today

Only `PlannedMarks` generated or selected for the current date appear in Today.

| Item | Today? |
|---|---:|
| BacklogItem | No |
| ExpeditionRouteItem not pulled | No |
| Active Expedition card | Maybe, if current and detail works |
| PlannedMark for today | Yes |
| PlannedMark for future | No |

## Weekly Coding Report sections

| Section | Purpose |
|---|---|
| Week summary | Planned vs completed, finished/partial/consumed days |
| Path balance report | Which paths were protected/weak/dominating |
| Backlog waiting | Items needing review |
| Active expeditions | Route items ready to pull |
| Next week generated marks | Preview daily commitments |
| Warnings | Repeated postpones, neglected paths, expedition dominance |

## Acceptance criteria

| Test | Expected |
|---|---|
| Capture random idea | BacklogItem created and hidden from Today |
| Open Weekly Coding Report | Backlog item appears |
| Convert backlog to PlannedMark | PlannedMark created |
| Convert large idea to Expedition | Expedition created |
| Pull route item | PlannedMark has `expeditionId` and `expeditionRouteItemId` |
| Generate week | DailyPlans exist and Today shows only today’s executable PlannedMarks |
