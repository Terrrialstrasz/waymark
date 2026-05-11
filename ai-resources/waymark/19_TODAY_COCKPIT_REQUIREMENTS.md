# Today Cockpit Requirements

## Core principle

> Today Cockpit is not a preview screen. It is the operating cockpit.

Every visible item is a promise. If the user can see it and tap it, the full workflow behind it must work.

## Today reads from

| Source | Use |
|---|---|
| DailyPlan | Date, anchor path, planned day |
| PlannedMark | Marks to leave |
| Mark | Completed proof |
| PackCheckRun | Pack check status |
| WorkoutSessionRun | Body session status |
| Expedition | Current active Expedition |
| DailyClosure | Day closed state |
| Signal | Signal icon/center |
| Map config | Labels, icons, visibility |

## Visible item contract

| Visible item | Required complete behavior |
|---|---|
| Main Mark | Opens exact PlannedMark flow |
| Body Mark | Opens Workout A / Walk / Workout B runner |
| Family Mark | Opens planned family action or quick mark flow |
| Attention Mark | Opens relevant Pack Check / transition flow |
| Pack Check card | Opens checklist and can save PackCheckRun |
| Current Expedition | Opens Expedition Detail with route/proof |
| Close the Trail | Opens DailyClosure flow and generates Character Mark |
| Capture button | Opens only working capture options |
| Journal tab | Shows real proof timeline |
| Paths tab | Shows functional path views |
| Me tab | Shows working personal/settings/report areas |
| Language button | Actually switches language |
| Signal bell | Opens working Signal Center |

## Today hidden rules

| Not ready | Hide |
|---|---|
| Workout guidance incomplete | Body Card |
| PackCheckRun incomplete | Pack Check carousel |
| Expedition detail incomplete | Current Expedition card |
| Memory capture incomplete | Memory/camera option |
| Signal Center incomplete | Bell icon |
| Language page incomplete | Language button/page in that locale |
| Path screen incomplete | Path action/section |

## Today layout

```text
Today Cockpit
├─ Header
│  ├─ Date
│  ├─ Day status
│  ├─ optional Signal icon
│  └─ optional language/settings icon
│
├─ Anchor Path Card
│  ├─ Today’s path
│  ├─ Path name
│  └─ Daily question
│
├─ Marks to Leave
│  ├─ Main Mark
│  ├─ Body Mark, only if Health runner ready
│  ├─ Family Mark
│  ├─ Attention Mark
│  └─ Other PlannedMarks
│
├─ Pack Checks, only if PackCheckRun ready
├─ Current Expedition, only if Expedition detail ready
├─ Quick Capture
└─ Close the Trail, only if DailyClosure flow ready
```

## Today item states

| State | Meaning |
|---|---|
| ready | Can open and complete |
| completed | Proof exists |
| postponed | Moved intentionally |
| substituted | Replaced with different proof |
| blocked | Waiting on input |
| hidden | Not rendered |
| closed | Day has DailyClosure |

## Today actions

| Card type | Tap behavior |
|---|---|
| Simple PlannedMark | PlannedMarkActionSheet |
| Career/SNAG PlannedMark | PlannedMark detail with done condition |
| Expedition PlannedMark | PlannedMark detail with Expedition context |
| Health Body Mark | Workout session runner |
| Pack Check | PackCheckRun screen |
| Current Expedition | Expedition Detail |
| Close Trail | Close the Trail flow |
| Quick Capture | Capture options sheet/screen |

## First usable Today

Visible early:

| Item | Condition |
|---|---|
| Header/date | Always |
| PlannedMark cards | PlannedMark action flow complete |
| Quick Capture | QuickMark/Backlog capture complete |
| Close Trail | Close Trail flow complete |

Hidden early:

| Item | Reason |
|---|---|
| Body Card | Requires full Health runner |
| Pack Checks | Requires PackCheckRun flow |
| Expedition card | Requires Expedition detail |
| Memory capture | Requires Memory + MediaAsset |
| Signal bell | Requires Signal Center |

## Acceptance criteria

| Test | Expected |
|---|---|
| Open Today | Only executable items render |
| Tap PlannedMark | Action sheet opens and saves actions |
| Completed item | Shows completed state |
| Hidden feature disabled | No placeholder appears |
| Day closed | Closed state appears |
| Locale switched | Full page is localized or hidden |
