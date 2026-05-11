# Waymark Acceptance Tests

## Purpose

Use these tests to keep implementation honest.

A feature is not accepted when a screen appears. It is accepted when the workflow completes, saves correct data, updates Journal, and is understood by Close the Trail.

## Foundation tests

| Test | Expected |
|---|---|
| App opens | No crash |
| Bottom tabs show | Today, Capture, Journal, Paths, Me |
| Hidden route opened manually | Route guard blocks it |
| Locale set to Vietnamese | Only fully localized pages appear |
| SQLite restart | Existing records persist |
| Feature disabled | No placeholder UI appears |

## Component tests

| Test | Expected |
|---|---|
| Open Component Lab | All primitives render |
| Open State Lab | Ready/completed/postponed/substituted/blocked/missed/private states render |
| Switch to Vietnamese | No clipped labels or half-translated component |
| PlannedMarkCard ready | Opens action sheet |
| PackCheckCard not ready | Hidden |
| Private-sensitive Mark locked | Content masked |

## Mark engine tests

| Test | Expected |
|---|---|
| Tap routine QuickMark | Mark saved instantly |
| QuickMark requires text | False for routine marks |
| Add optional note | Note attaches to existing Mark |
| Undo recent Mark | Mark soft-deleted/hidden |
| Restart app | Mark still exists |
| Mark has mapVersion | True |
| Mark has labelSnapshot | True |
| Mark defaults private | True |

## PlannedMark tests

| Test | Expected |
|---|---|
| Create PlannedMark | Saved with date/path/status |
| Tap Done | Mark created and linked |
| Done PlannedMark | Status completed |
| Tap Postpone | Original removed from Today; future item created/linked |
| Tap Substitute | Substitute Mark created |
| Block item | Block reason saved |
| Close Trail reads status | Completed/postponed/substituted/missed counted correctly |

## Backlog and Weekly Coding tests

| Test | Expected |
|---|---|
| Capture random idea | BacklogItem created |
| Open Today | BacklogItem hidden |
| Open Weekly Coding Report | BacklogItem visible |
| Convert to PlannedMark | PlannedMark created |
| Convert to Expedition | Expedition created |
| Add to Expedition | RouteItem created |
| Generate week | DailyPlans and PlannedMarks created |
| Open Today | Only today’s executable PlannedMarks appear |

## Today Cockpit tests

| Test | Expected |
|---|---|
| Open Today | Date/header renders |
| Incomplete Health runner | Body Card hidden |
| Incomplete PackCheckRun | Pack Check carousel hidden |
| Incomplete Expedition detail | Current Expedition hidden |
| PlannedMark visible | Action sheet works |
| Mark completed | Card shows completed state |
| Day closed | Today shows closed state |

## Journal tests

| Test | Expected |
|---|---|
| Open Journal | Marks render by time |
| Tap Mark | Mark Detail opens |
| Filter by path | Correct marks shown |
| Private-sensitive locked | Sensitive data masked |
| Memory not ready | Memory section hidden |

## Paths tests

| Test | Expected |
|---|---|
| Open Paths | Seven path cards render |
| Career and SNAG | Separate cards and filters |
| Open Career | Career proof only |
| Open SNAG | SNAG proof only |
| Path status | Alive/protected/weak calculated |
| Path Expeditions | Only that path’s Expeditions appear |

## Close the Trail tests

| Test | Expected |
|---|---|
| Open Close Trail | Today summary appears |
| Planned vs completed | Correct count |
| Missed item | Can be marked missed |
| Consumed path | Suggested or selectable |
| Anchor deviation | Stored correctly |
| Save closure | DailyClosure saved |
| Character Mark | Generated and linked |
| Tomorrow first step | Saved |
| Journal | Closed day appears |

## Pack Check tests

| Test | Expected |
|---|---|
| Open Morning Pack Check | Checklist appears |
| Complete items | PackCheckRun saved |
| Skip item | skippedItemIds saved |
| Config has completionMark | Mark created on configured path |
| Config has no completionMark | No Mark created |
| Pack Check complete | Today updates |

## Health tests

| Test | Expected |
|---|---|
| No runner | Body Card hidden |
| Complete Workout A | Health Mark created; next session Walk |
| Complete Walk | Health Mark created; next session Workout B |
| Complete Workout B | Health Mark created; next session Workout A |
| Exercise completed below threshold | Target unchanged, streak increments |
| Exercise hits threshold | Target increases, streak resets |
| User edits actual and completes | Future target uses actual completed value |
| Exercise skipped | No progression |
| Partial session | Cycle does not advance |

## Expedition tests

| Test | Expected |
|---|---|
| Create Expedition | Saved with kind/path/destination |
| Add route item | RouteItem saved |
| Pull route item | PlannedMark created with expedition links |
| Complete route PlannedMark | Mark linked to Expedition |
| Open Path screen | Expedition appears under correct path |
| Today current Expedition | Opens detail if visible |
| Closed Expedition | Moves to closed archive |

## Memory tests

| Test | Expected |
|---|---|
| Memory capture hidden before ready | No camera/memory option |
| Create photo memory | MediaAsset saved locally |
| Save quick memory | Memory and Mark created |
| Select multiple paths | MemoryPathLinks created |
| Caption blank | Allowed |
| Open Journal | Memory appears |
| Promote Mark | Memory linked to existing Mark |

## Signal tests

| Test | Expected |
|---|---|
| Signal target hidden | Signal not generated |
| Close Trail Signal tapped | Opens Close Trail |
| Morning Pack Check Signal tapped | Opens Pack Check |
| Snooze Signal | Status snoozed and rescheduled |
| Dismiss Signal | Status dismissed without shame |
| Complete target flow | Signal acted |

## Privacy tests

| Test | Expected |
|---|---|
| Mark created | Privacy private by default |
| Private-sensitive Mark | Masked when locked |
| App unlocked | Sensitive content visible |
| Export backup later | File created |
| Encrypted backup later | Payload not readable as plaintext |

## Final acceptance principle

> If a visible item cannot complete its workflow, save the right entities, update Journal, and be interpreted by Close the Trail, it must not be visible.
