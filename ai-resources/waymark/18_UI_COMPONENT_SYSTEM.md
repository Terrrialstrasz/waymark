# UI Component System

## Core principle

> Build the component language before building full screens.

Waymark has highly customized UI. The component phase must come before Today, Capture, Journal, Paths, and Me screen assembly.

## Phase goal

The UI Component Phase establishes:

| Area | Requirement |
|---|---|
| Tokens | Colors, typography, spacing, radius, shadows |
| Components | Reusable primitives and domain components |
| State variants | ready, completed, postponed, substituted, blocked, missed, hidden, private-sensitive |
| Localization | English/Vietnamese text fitting |
| Behavior | Pressable cards, sheets, carousels, hidden states |
| Component Lab | Dev-only preview before screen assembly |

## Design tokens

| Token group | Purpose |
|---|---|
| color | Path colors, primary, warning, completion, background |
| typography | Screen title, section header, card title, body, metadata |
| spacing | Mobile layout rhythm |
| radius | Rounded Waymark card system |
| shadow | Soft tactile card feel |
| icon | Path/action/status icons |
| image | Shared image usage, variants, loading strategy, fallback behavior |
| state | Completed/postponed/substituted/blocked/missed/private |

## Primitive components

| Component | Purpose | Must support |
|---|---|---|
| WMButton | Primary/secondary/ghost actions | loading, disabled, icon, full width |
| WMIconButton | Header/action icons | hidden/disabled |
| WMCard | Base card | pressable, tint, shadow, hidden |
| WMBadge | Path/status badge | path color, warning, completed |
| WMChip | Filter/tag | selected/unselected |
| WMSheet | Bottom action sheet | PlannedMark and Capture actions |
| WMListRow | Settings/list rows | icon, title, subtitle, action |
| WMEmptyState | Empty screen state | localized copy |
| WMSectionHeader | Section title | optional action hidden if incomplete |
| WMCarousel | Horizontal scroll | no clipped text |
| WMProgressLine | Small progress/status | path/weekly summaries |
| WaymarkImage | Shared image primitive | usage-based variant selection, loading strategy, object-fit, fallback, decorative mode |

## Domain components

| Component | Used in | Required behavior |
|---|---|---|
| PathCard | Paths overview | status, recent mark, weekly count |
| MarkCard | Journal, summaries | path, time, source, note preview |
| PlannedMarkCard | Today | opens action sheet when ready |
| PlannedMarkActionSheet | Today | Done/Postpone/Substitute |
| PackCheckCard | Today | opens checklist only if flow ready |
| PackCheckList | Pack Check screen | completed/skipped items |
| ExpeditionCard | Today / Paths | destination, path, warning, progress |
| MemoryCard | Journal / Paths | photo, caption, paths |
| JournalItem | Journal timeline | Mark/Memory/Closure variants |
| CloseTrailSummaryCard | Close Trail | planned vs completed |
| CharacterResultPicker | Close Trail | result selection |
| WorkoutSessionCard | Today Health | A/Walk/B states |
| ExerciseStepCard | Health runner | target, actual, status |
| CaptureOptionCard | Capture | Mark / Memory / Backlog |
| BacklogItemCard | Me / Weekly Coding | raw idea, status, conversion |
| WeeklyReportCard | Me | weekly summary/path balance |

## Shared image system

All UI imagery must go through the shared image layer.

| Asset group | Required handling |
|---|---|
| Utility / nav / entity icons | Use shared registry entry and icon usage config |
| Path medallions / path icons | Use `pathIcon` usage through `WaymarkImage` or wrapper |
| Status seals | Use `statusSeal` usage through `WaymarkImage` or wrapper |
| Botanical motifs | Use decorative lazy-loaded motif assets with token-driven opacity |
| Logo marks | Use `logo` usage; eager only when above the fold |
| Compact card photos | Use `compactCardBackground` usage; absolute image with simple gradient overlay if needed |
| Journal / Memory media | Use `journalCard` or `detailImage` usage; never original photo files |
| Hero images | Use `hero` usage with stable aspect ratio and light readability scrim only when needed |
| Fullscreen preview | Use `fullscreenPreview` on demand only |

### Component rules for images

| Rule | Requirement |
|---|---|
| No raw asset paths in feature components | Reference image asset IDs or pass through `WaymarkImage` |
| No direct original uploads in UI | Photo cards and heroes must use optimized variants only |
| No CSS-like heavy visual effects | Avoid heavy blur, backdrop-filter-like effects, and large shadows on photo-heavy lists |
| Preserve readability | Photo overlays should use simple gradients, not blur layers |
| Preserve sharpness | Icons and seals use `contain`; heroes and photo cards use `cover` |
| Preserve layout stability | Hero and card media should reserve space and avoid layout shift |

## State variants

### PlannedMarkCard

| State | Behavior |
|---|---|
| ready | Tappable; opens action sheet |
| completed | Shows proof/check |
| postponed | Muted with new date/window |
| substituted | Shows replacement proof |
| blocked | Shows blocker |
| missed | Muted; reviewed in Close Trail |
| hidden | Not rendered |

### MarkCard

| State | Behavior |
|---|---|
| normal | Standard proof |
| memory_linked | Shows memory/photo indicator |
| expedition_linked | Shows Expedition badge |
| private_sensitive | Masked when locked |
| deleted | Hidden |

### WorkoutSessionCard

| State | Behavior |
|---|---|
| workout_a_ready | Opens Workout A runner |
| walk_ready | Opens Walk runner |
| workout_b_ready | Opens Workout B runner |
| in_progress | Resume session |
| completed | Opens summary |
| partial | Shows partial state |
| not_ready | Hidden |

## Component Lab

Create a dev-only Component Lab with:

| Lab | Purpose |
|---|---|
| Buttons & Tokens | Check visual foundation |
| Cards | Check WMCard, PathCard, MarkCard |
| Today Components | PlannedMark, Body, PackCheck, Expedition |
| Journal Components | JournalItem, MemoryCard, ClosureCard |
| Close Trail Components | Summary, result picker |
| Health Components | Workout card, Exercise step |
| Capture Components | Capture options and sheets |
| Localization Lab | English/Vietnamese side by side |
| State Lab | All state variants |

## Localization in components

Components must support both English and Vietnamese text. Vietnamese may be longer, so components need flexible height and wrapping.

| Requirement | Component implication |
|---|---|
| No half-translated pages | All visible labels come from copy config |
| Diacritics render well | Font must be tested |
| Buttons fit | Short labels or wrapping |
| Empty states localized | No hardcoded English |

## Acceptance criteria

| Test | Expected |
|---|---|
| Open Component Lab | All core components render |
| Switch locale to Vietnamese | Text fits without clipping |
| PlannedMarkCard ready | Opens action sheet |
| PackCheckCard not ready | Hidden, not disabled placeholder |
| Private-sensitive Mark locked | Content masked |
| Carousel | Scrolls smoothly |
| JournalItem variants | Mark/Memory/Closure all render |
