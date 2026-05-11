# AI Working Rules for Waymark

Use this file as standing instructions for Codex or any AI assistant helping build Waymark.

## Core operating rule

> The Map belongs in code. The Marks belong to life.

## AI responsibilities

| Responsibility | Requirement |
|---|---|
| Build config-as-code | Paths, quick marks, weekly plan, pack checks, copy, rituals, workout templates, and progression rules live in files |
| Render from config | Screens consume Map config; do not hardcode path names or quick mark labels in UI |
| Preserve low friction | Routine quick marks are one-tap, no required typing |
| Protect privacy | Private by default; private-sensitive content must be maskable |
| Separate concepts | Backlog, Expedition, PlannedMark, Mark, Memory, PackCheckRun, DailyClosure are distinct |
| Hide incomplete flows | If an end-to-end flow is not complete, hide its entry point |
| Build components first | Do not assemble custom screens before the component system exists |
| Localize page by page | A visible page must be fully localized in selected language |
| Keep Career/SNAG separate | Different paths, separate statuses, separate expeditions, separate filters |

## AI must not do

| Do not | Reason |
|---|---|
| Create a Map tab | User rejected this; use Me instead |
| Build half-visible features | Today must never show placeholders |
| Add many mark types as entities | Use PlannedMark/QuickMark templates; avoid mark-type explosion |
| Create FamilyPlan entity | Family plan is a PlannedMark proof |
| Create ContentCalendar entity | Use Expedition(kind="content_calendar") and route items |
| Create ReadingShelf entity | Use Expedition(kind="reading_shelf") and route items |
| Create GolfEventPlan entity | Use Expedition(kind="golf_event") and route items |
| Put day judgment in Mark | Close the Trail owns planned-vs-completed, consumed, anchor deviation |
| Put checklist details in Mark | PackCheckRun owns checklist completion |
| Put memory archive rules in Mark | Memory owns archive/media/collections |
| Build cloud-first | Phone owns the truth |
| Build AI runtime dependency | Core app must work without paid AI calls |
| Add back office/admin/CMS | Explicitly unwanted |

## Coding style

- Use TypeScript.
- Keep domain types explicit.
- Use constants and discriminated unions where useful.
- Prefer pure functions for rules.
- Use repositories; screens should not access SQLite directly.
- Store `mapVersion` and `labelSnapshot` on user-created records.
- Use stable IDs and localized labels.
- Use feature visibility guards for unfinished workflows.

## UX tone

Waymark should sound direct, grounded, calm, purposeful, and private.

Good copy:

- “Marked.”
- “Today is marked. Rest.”
- “One mark can save the day.”
- “Pack check before you step out.”
- “This expedition is taking over the trail.”

Avoid:

- “You failed.”
- “Streak lost.”
- “Crush your goals.”
- “Maximize productivity.”
- “You are behind.”
