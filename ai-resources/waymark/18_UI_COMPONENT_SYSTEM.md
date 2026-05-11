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
