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
| Route UI media through shared rules | UI images/icons must go through the shared image registry and `WaymarkImage`; do not render original assets directly in feature components |

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
| Build cloud-first | Waymark remains local-first at runtime; the Waymark Vault owns logical truth |
| Build AI runtime dependency | Core app must work without paid AI calls |
| Add back office/admin/CMS | Explicitly unwanted |
| Render original uploaded photos in cards/heroes | Always use optimized variants only |
| Hardcode direct image asset paths inside feature components | Use the image registry or a dedicated asset wrapper |
| Use large raw images for small icons/cards | Export or generate size-appropriate variants first |
| Use base64 or remote placeholder image URLs in UI | Keep assets bundled/local and variant-driven |

## Coding style

- Use TypeScript.
- Keep domain types explicit.
- Use constants and discriminated unions where useful.
- Prefer pure functions for rules.
- Use repositories; screens should not access SQLite directly.
- Store `mapVersion` and `labelSnapshot` on user-created records.
- Use stable IDs and localized labels.
- Use feature visibility guards for unfinished workflows.

## Executable Today marks

- Today items must route to their real execution flow, not only to generic Mark completion.
- Workout marks must open the Health Session flow through `interactionKind: "strength_session"`.
- Golf practice marks must open the Golf Practice flow through `interactionKind: "golf_practice"`, even when weekly imports give each session a specific title such as `SNAG Roller Stroke 7h-5h` or `Putting Ladder Mon 60-180 cm`.
- Golf practice title detection must stay centralized in `src/lib/waymark/golfPracticeMark.ts`; do not reimplement ad hoc title checks in screens or importers.
- Weekly timetable imports that change Workout or Golf exercise prescriptions must update/repair the matching `WorkoutRoutineTemplate` and `RoutineExerciseTemplate` records as part of the import job. Do not rely on Mark title/description text alone; session snapshots and completion gating come from routine exercises in the DB.
- For Golf weekly imports, ensure the relevant Golf routines are repaired before importing marks when putting/chipping distances, sets, or reps change. For Health Workout A/B/Walk changes, use the authoritative workout routine repair path before materializing or reusing workout marks.
- Weekly timetable import tests should assert executable Today behavior for any new session-like mark, not just mark creation and signal creation.

## Image and icon handling

- Never use large original image files directly inside UI components.
- Every UI image must resolve through an explicit asset variant rule.
- Use the shared image registry and `WaymarkImage` abstraction for hero art, logos, icons, path medallions, status seals, botanical motifs, journal photos, memory photos, and expedition media.
- Original uploaded photos may be stored, but UI must consume optimized variants only.
- Preserve transparency for icons, seals, logos, and motifs.
- Flatten non-transparent photos to efficient WebP/AVIF-style assets or equivalent optimized local formats.
- Prefer eager loading only for critical above-the-fold logo, header, and hero media.
- Default all below-fold media to lazy or on-demand loading.
- Do not use heavy blur, backdrop-filter-like effects, oversized shadows, or animated large images in scrolling surfaces.
- For decorative imagery, keep opacity in tokens/styles instead of baking it into the asset when possible.

### Required variant rules

| Usage | Rule |
|---|---|
| Small icon skin | Use SVG when available, otherwise tightly cropped transparent WebP exported at 2x/3x |
| Path icon | Use `iconMd`/`iconLg`; keep sharp and proportional |
| Status seal | Use `iconLg` or `sealMd`; no blur effects |
| Botanical motif | Use optimized decorative transparent asset; lazy unless in first visible shell |
| Logo mark | Prefer vector source or clean high-res fallback; never blur |
| Compact card photo | Use `compact` variant around 480px, never full original |
| Journal / Memory card | Use `card` variant around 720px |
| Hero image | Use `hero` variant around 1200-1600px |
| Fullscreen preview | Use `full` variant only on demand |

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
