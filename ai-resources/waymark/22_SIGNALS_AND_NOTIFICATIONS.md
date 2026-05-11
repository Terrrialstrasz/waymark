# Signals and Notifications

## Purpose

Signals return the user to the path at the right moment.

> Notifications are not nags. They are Signals.

Signals do not create Marks directly. They open existing workflows.

## Signal types

| Kind | Purpose | Opens |
|---|---|---|
| pack_check | Transition reminder | Pack Check screen |
| planned_mark | Planned action reminder | PlannedMark Action |
| close_trail | Evening closure | Close the Trail |
| weekly_review | Weekly review/report | Weekly Coding Report |
| path_protection | Protect neglected path | Path/QuickMark/PlannedMark flow |
| dominance_warning | Project/path taking over | Expedition or Close Trail |
| recovery | Encourage recovery | Health/QuickMark flow |
| tool_return | Return from external app | ToolSession return prompt |
| memory_prompt | Preserve moment | Memory capture |

## Signal lifecycle

| Status | Meaning |
|---|---|
| scheduled | Waiting |
| delivered | Shown to user |
| acted | User opened/completed target flow |
| snoozed | Moved later |
| dismissed | Not now |
| cancelled | No longer relevant |
| expired | Too old |

## Signal channels

| Channel ID | Purpose |
|---|---|
| pack_checks | Morning/office/gym checks |
| daily_close | Close the Trail |
| today_marks | PlannedMarks |
| path_protection | Family/Health protection |
| expedition_warnings | Dominance warnings |
| weekly_review | Weekly Coding Report |
| tools_return | Tool return prompts |
| quiet_memories | Memory prompts |

## Permission strategy

Do not ask for notification permission at first launch.

Ask contextually when the user enables or reaches the first meaningful Signal.

```text
User enables Morning Pack Check Signal
→ Explain Signals briefly
→ Request permission
→ If denied, use in-app Signal Center fallback
```

## Signal target relationships

| Signal field | Opens |
|---|---|
| relatedPlannedMarkId | PlannedMark action |
| relatedPackCheckConfigId | Pack Check |
| relatedExpeditionId | Expedition detail |
| relatedToolSessionId | Tool return prompt |
| relatedDate | Close Trail / day view |
| relatedPathId | Path / path protection |

## Anti-fatigue rules

| Rule | Requirement |
|---|---|
| Daily cap | Limit total signals |
| Quiet hours | No non-critical signals during sleep |
| Expiry | Old signals expire |
| No shame copy | Never say failed/behind |
| Batch minor reminders | Avoid notification spam |
| Dismiss without punishment | Not now means not now |
| Signal Center fallback | If OS notifications off, show in app |

Suggested caps:

| Category | Max/day |
|---|---:|
| Pack Checks | 2–3 |
| Today Marks | 2 |
| Path Protection | 2 |
| Close Trail | 1–2 including snooze |
| Memory prompts | 1 |
| Dominance warnings | 1 |

## Build order

| Phase | Feature |
|---|---|
| 1 | Signal schema/repository |
| 2 | Signal templates in Map |
| 3 | In-app Signal Center |
| 4 | Close Trail Signal |
| 5 | Morning Pack Check Signal |
| 6 | PlannedMark Signals |
| 7 | Snooze/dismiss/acted lifecycle |
| 8 | Quiet hours and daily caps |
| 9 | Path protection |
| 10 | Expedition warnings |
| 11 | Tool return Signals |

## Visibility

Do not show Signal bell until Signal Center works and at least one target flow is complete.

## Acceptance criteria

| Test | Expected |
|---|---|
| Tap Close Trail Signal | Opens Close Trail |
| Complete target flow | Signal becomes acted |
| Snooze Signal | New scheduled time |
| Dismiss Signal | Dismissed, no shame |
| Target flow hidden | Signal not generated |
| Quiet hours active | Non-critical Signals suppressed |
