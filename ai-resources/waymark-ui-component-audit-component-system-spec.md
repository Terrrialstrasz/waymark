# Waymark UI Component Audit & Component System Spec

## 0. System Summary

| Area | Decision |
|---|---|
| Product identity | Waymark is a private field-journal Life OS, not a dashboard, not a social app, not task-management software. |
| Visual language | Warm cream background, dark green serif typography, soft rounded cards, botanical leaf details, gold/green accents, calm private tone. |
| Core navigation | Bottom nav has Today, Journal, Paths, Me, and center Capture action. |
| Capture rule | Center Capture opens Capture Chooser. Camera is only photo/camera capture, not the main capture flow. |
| Journal rule | Journal is a selected-day record. A Journal Overview may exist, but the canonical Journal feed shows one day only. |
| Path rule | Path is ongoing life direction. It has pulse/alive/weak/protected/neglected/growing states. It must not show percent complete. |
| Expedition rule | Expedition is finite. It can show date range, milestones, marks, and percent complete. |
| PlannedMark rule | PlannedMark row tap opens Mark Detail. Today may use a quick action sheet for immediate completion. |
| Health rule | Day A and Day B share Strength Session template. Walk Day must use a lighter Walk Session template. |
| Localization rule | Each page must be localized as a whole page. No half-English, half-Vietnamese UI. |
| Feature rule | If a feature is not end-to-end, hide it completely. Do not show dead buttons or fake statuses. |

---

# 1. Screen Inventory Table

| Screen | Entry point | Main entity | Key sections | Notes |
|---|---|---|---|---|
| Today Cockpit | Bottom nav: Today | Selected day / Today state | Header, Today’s Path hero, Marks to Leave, Pack Checks, Current Expedition, Close the Trail, bottom nav | Main daily cockpit. Should stay action-oriented, not analytics-heavy. |
| Capture Chooser Sheet | Center Capture button | Capture draft | Dimmed backdrop, note input, add photo, destination buttons: Mark / Memory / Backlog | Correct concept. Photo is attachment only. |
| PlannedMark Action Sheet | Tap Today planned mark | PlannedMark | Sheet header, mark title, path, time window, intention, Leave Mark, Substitute, Reschedule, Skip | Action sheet only. Should not become Mark Detail. |
| Daily Journal | Journal date selector / selected day | Selected day journal | Header, date selector, day entries, Day Closed card | Canonical Journal screen. One selected day only. |
| Journal Home / Overview | Bottom nav: Journal or overview route | Journal overview / memory summary | Latest memories, recent day summaries, look-back memories, upcoming memories | Concept-sensitive. Should not replace selected-day Journal. |
| Mark Detail | Tap Mark row/card | Mark | Header, visual hero, summary, proof/context, metadata, long-term containers | Destination for PlannedMark rows and proof review. |
| Memory Detail | Tap Memory card | Memory | Header, photo/symbol hero, memory summary, reflection, metadata, containers | Uses same detail structure as Mark but media is primary. |
| Pack Check | Tap pack check card | PackCheck | Header, readiness hero, checklist, Leave Pack Check, Reset | Preparation checklist. Not a full task system. |
| Strength Session — Set Active | Tap Health mark / Leave Mark | Health Session | Header, session hero, exercise progress, active exercise, set rows, rest after set, Complete Set | State of Strength Session template. |
| Strength Session — Resting | After completing set | Health Session | Active exercise, completed set, rest timer, Skip Rest | State of same Strength Session template. |
| Strength Session — Timed Exercise | During plank/timed movement | Health Session | Previous exercises done, timed exercise panel, timer, Complete Timed Set | Timed variant of same Strength Session template. |
| Stretch / Cooldown Session | After Day A/Day B strength | Cooldown phase | Strength complete summary, stretch progress, active stretch, timer, next stretch list | Should be phase/sub-template, not a separate product concept. |
| Paths Overview | Bottom nav: Paths | Path collection | Header, path stat cards, Life Paths list, Path Insight | Overview of life directions. No percent complete. |
| Path Detail | Tap Path row/card | Path | Header, Path Pulse, Recent Proof, Next Marks, Current Expeditions, Why it matters | Correct concept: living path, not project dashboard. |
| Expeditions List | Paths → View all expeditions | Expedition collection | Header, search, filters, expedition cards | Expedition list can show percent complete. |
| Expedition Detail | Tap expedition card | Expedition | Header, summary, progress, timed milestones, PlannedMarks under milestones | Correct finite project/season container. |
| Backlog | Me → Backlog / Capture → Backlog | Backlog item collection | Header, count, sort, filters, backlog item cards, add action | BacklogItem is not Mark until pulled/converted. |
| Weekly Coding Report | Me → Weekly Coding | Selected week plan/report | Header, week navigator, Pulled into Week section, Open Backlog, pulled item rows | Scoped to selected week only. No Deferred section. |
| Close the Trail | Today → Close the Trail | Daily close / judgment | Summary, mark outcomes, reflection, tomorrow first step, close action | Daily judgment engine, but UI must stay calm. |
| Me Overview | Bottom nav: Me | Basecamp / settings hub | Private Documents, Weekly Coding, Backlog, Settings, Principle | Many rows need feature gating. |

---

# 2. Entity Boundary Table

| Entity | What it is | What it is not | UI implication |
|---|---|---|---|
| Path | Ongoing life direction | Project, task, expedition, percent-complete object | Use pulse/state language: Alive, Protected, Weak, Neglected, Growing. |
| Expedition | Finite execution container | Ongoing identity/path | Can show milestones, date range, marks, percent complete. |
| Mark | Proof/action left behind | Generic task item | Can be planned, quick, done, skipped, postponed, substituted. |
| PlannedMark | Intentional mark scheduled/pulled into a day/week | Backlog idea | Appears in Today, Expedition, Weekly Coding. |
| Memory | Personal record, often with media | Social post | Can be photo-based or pictureless. Appears in Journal. |
| PackCheck | Preparation checklist that can create proof | Full task/project | Keep simple: checklist readiness + leave pack check. |
| BacklogItem | Idea/future plan/not-yet-pulled item | Mark by default | Becomes scheduled only when pulled into week/day. |
| Daily Close | End-of-day judgment/reflection | Analytics dashboard | Shows judgment, proof, reflection, repair, tomorrow step. |
| Weekly Coding Report | Selected-week planning result | Full backlog or project manager | Shows only items pulled into selected week. |
| Capture Draft | Temporary input before routing | Entity by itself | Routes to Mark, Memory, or Backlog. |

---

# 3. Repeating Pattern Table

| Pattern | Screens used | Proposed component | Notes |
|---|---|---|---|
| Field-journal page shell | All screens | `FieldJournalScreenShell` | Owns background, safe area, scroll spacing, botanical layer. |
| Large serif page header | All major screens | `PageHeader` | Variants: home, detail, entity, report, with actions. |
| Circular header actions | Today, Journal, Paths, Me, Backlog, Health | `HeaderIconButton` / `HeaderActionGroup` | Bell, language, camera, search, overflow, calendar. Feature-gate aggressively. |
| Bottom nav with center capture | Today, Journal, Paths, Me, details | `BottomNavBar` | Center opens Capture Chooser only. |
| Soft rounded card | All screens | `JournalCard` | Most important primitive. No screen-specific card styling. |
| Status chip | All domain screens | `StatusChip` | Planned, Active, Done, Upcoming, Missed, Postponed, Protected, Weak. |
| Metadata/entity chip | Details, Paths, Health, Weekly | `EntityChip` | Path, date, duration, count, type, timing. |
| Row/card with icon + title + trailing | Details, Expedition, Backlog, Weekly, Settings, Health | `EntityRow` | Shared row anatomy. |
| Expand/collapse section | Health, Expedition, Close | `ExpandableSection` | Same chevron, expansion, animation behavior. |
| Media hero | Journal, Mark Detail, Memory Detail | `MediaHero` | Supports photo, collage, symbolic illustration, missing media. |
| Horizontal rail | Journal Home | `HorizontalRail` | Used for look-back and upcoming memories. |
| Date tile | Journal Home, Weekly, upcoming memories | `DateBadge` | Locale-aware. |
| Circular timer | Strength rest, plank, stretch | `CircularTimer` | One timer component with mode variants. |
| Linear progress | Expedition only | `LinearProgressBar` | Forbidden for Path. |
| Segment progress | Health and stretch | `SegmentProgress` | Exercise/stretches count. |
| Action sheet | Capture, PlannedMark Action | `ActionSheet` | Shared shell, different domain content. |
| Primary CTA | PlannedMark, Health, PackCheck, Close | `PrimaryActionButton` | Green full-width action. |
| Secondary action | PlannedMark, PackCheck, Health | `SecondaryActionButton` | Reschedule, Skip, Reset, End Session. |
| Search/filter controls | Backlog, Expeditions | `SearchBar`, `FilterChipGroup`, `SortSelector` | Hide if not functional. |
| Detail metadata list | Mark Detail, Memory Detail, Me settings | `MetadataList` | Icon-left facts with dividers. |
| Container link list | Mark Detail, Memory Detail | `ContainerLinkList` | Optional. Hide if empty. |
| Insight/footer card | Paths, Expeditions, Me | `InsightCard` | Calm guidance note, not analytics. |

---

# 4. Component Catalog

## 4.1 Design Tokens

| Token group | Purpose | Used in | Key values / variants | Acceptance test |
|---|---|---|---|---|
| Color tokens | Central Waymark palette | All screens | Cream surface, dark green text, gold accent, blue accent, lavender, success, warning, muted gray | No component hardcodes random colors outside token map. |
| Typography tokens | Field-journal identity | All screens | Display serif, title serif, body serif, small label, chip text, numeric display | English and Vietnamese diacritics render cleanly. |
| Spacing tokens | Consistent rhythm | All screens | Page padding, section gap, card padding, row gap, chip gap | Screens feel like one system, not stitched mockups. |
| Radius tokens | Soft private-journal shape | All cards/buttons/chips | Small, medium, large, pill, circle | Cards, chips, buttons use defined radius scale. |
| Elevation tokens | Soft paper depth | Cards, sheets, nav | Flat, card, floating, sheet | Shadow intensity is consistent. |
| Border tokens | Define active/selected states | Cards, chips, inputs | Muted border, active green, active gold, warning, disabled | Active panels use semantic border. |
| Icon tokens | Normalize icon system | All screens | 16, 20, 24, 32, 48, hero icon sizes | Header/action/list icons align consistently. |
| Botanical tokens | Control leaf ornamentation | All screens | Corner leaf, inline leaf, wreath, divider leaf, opacity levels | Leaves never block text or tap targets. |
| Motion tokens | Consistent feel | Sheets, accordions, timers, nav | Sheet slide, expand/collapse, press feedback, timer tick | Reduced-motion mode remains usable. |
| Semantic state tokens | Shared state language | All domain screens | Planned, Active, In progress, Done, Missed, Skipped, Postponed, Upcoming, Protected, Weak, Alive | Same state maps to same visual meaning everywhere. |
| Localization tokens | Page-level language | All screens | `en`, `vi`, namespace per screen | No page mixes languages except proper nouns. |

---

## 4.2 Primitive Components

| Component | Purpose | Used in screens | Props | States | Variants | Tap behavior | Localization needs | Feature gate | Acceptance test |
|---|---|---|---|---|---|---|---|---|---|
| `FieldJournalScreenShell` | Base page shell | All | `activeTab`, `showBottomNav`, `scrollable`, `backgroundVariant`, `safeArea` | Loading, ready | With nav, without nav, sheet backdrop | None | None | Always on | All screens share same background/safe-area behavior. |
| `PageHeader` | Unified screen header | All major screens | `title`, `subtitle`, `leading`, `actions`, `entityIcon`, `dateLabel` | Default, compact, scrolled | Home, detail, entity, report | Leading/action callbacks | Title/subtitle localized | Always on | Header alignment is consistent across app. |
| `HeaderIconButton` | Circular icon action | Today, Journal, Paths, Me, Health | `icon`, `label`, `tone`, `disabled` | Default, pressed, disabled | Bell, language, camera, search, calendar, overflow | Executes callback | Accessibility label localized | Per feature | Hidden if target flow is not ready. |
| `BottomNavBar` | Main app nav | Main tabs/details | `activeTab`, `items`, `centerAction` | Active, inactive, pressed | Standard with center capture | Tabs navigate; center opens capture chooser | Labels localized | Always on | Center button never opens camera directly. |
| `JournalCard` | Base card surface | All screens | `children`, `padding`, `tone`, `border`, `elevation`, `decoration`, `pressable` | Default, active, selected, disabled, pressed | Plain, hero, compact, elevated | Optional tap | Child-owned | Always on | No screen creates custom card shell. |
| `SectionHeader` | Section label and optional action | All lists/sections | `title`, `icon`, `actionLabel`, `actionIcon` | Default, with action, disabled | Plain, leaf, counter | Optional action | Localized | Action gated | Section headers are visually consistent. |
| `StatusChip` | Status display | All domain screens | `status`, `label`, `icon`, `tone`, `size` | Default, selected, disabled | Planned, Active, Done, Upcoming, Missed, Postponed, Protected, Weak | Optional only if filter chip | Localized | Always on | Same status uses same color everywhere. |
| `EntityChip` | Metadata chip | Details, Health, Weekly, Paths | `icon`, `label`, `value`, `tone` | Default, selected, disabled | Path, date, duration, count, type | Optional | Localized | Always on | Chips wrap correctly in Vietnamese. |
| `EntityRow` | Standard row/card anatomy | Health, Expedition, Backlog, Settings, Detail lists | `leading`, `title`, `subtitle`, `metadata`, `status`, `trailing`, `chevron` | Default, active, done, disabled | Compact, normal, dense, divided | Row opens configured target | Localized | Target gated | Row behavior is predictable by context. |
| `ExpandableSection` | Reusable accordion | Health, Expedition, Close | `header`, `expanded`, `children`, `summary` | Collapsed, expanded, disabled | Row accordion, card accordion, prompt accordion | Toggle or open target depending mode | Localized | Always on | Chevron and animation are consistent. |
| `PrimaryActionButton` | Main action CTA | PlannedMark, Health, PackCheck, Close | `label`, `icon`, `loading`, `disabled`, `fullWidth` | Default, pressed, loading, disabled | Green, gold, compact, full-width | Executes primary action | Localized | Action gated | Main action is visually dominant. |
| `SecondaryActionButton` | Secondary actions | PlannedMark, PackCheck, Health | `label`, `icon`, `tone`, `layout` | Default, pressed, disabled | Outline, neutral, warning, reset, end-session | Executes action | Localized | Action gated | Does not compete with primary CTA. |
| `ActionSheet` | Base bottom sheet | Capture, PlannedMark Action | `title`, `children`, `snapPoint`, `dismissible`, `backdrop` | Open, closing, dismissed | Compact, large, action-focused | Drag/close/dismiss | Localized title | Per feature | Sheet never becomes full dashboard. |
| `MediaHero` | Visual hero block | Journal, Mark Detail, Memory Detail | `media`, `fallbackIcon`, `aspectRatio`, `layout`, `alt` | Loading, loaded, missing, error | Single image, collage, illustration, symbolic | Optional open viewer | Alt/caption localized | Media viewer gated | Missing media fallback looks intentional. |
| `HorizontalRail` | Horizontal content rail | Journal Home | `items`, `cardType`, `title`, `actionLabel` | Empty, loading, populated | Memory rail, upcoming rail | Card/action callbacks | Localized | View-all gated | Rail scrolls smoothly without nav conflict. |
| `DateBadge` | Compact date visual | Journal, Weekly | `date`, `tone`, `format` | Default, selected, disabled | Day tile, calendar tile, small badge | Optional date select | Locale-aware | Always on | Date format matches locale. |
| `SearchBar` | Search input | Backlog, Expeditions | `placeholder`, `value`, `clearable` | Empty, typing, filled, disabled | Full, compact | Focus/search/clear | Placeholder localized | Search gated | Hidden if search is not real. |
| `FilterChipGroup` | Filter controls | Backlog, Expeditions | `options`, `selected`, `multiSelect` | Default, selected, disabled | Status, type, category | Tap filters list | Labels localized | Filter gated | Selected filter changes visible data. |
| `SortSelector` | Sort dropdown | Backlog | `selected`, `options` | Closed, open, selected | By horizon, type, date | Opens selector | Localized | Sort gated | Label matches actual order. |
| `LinearProgressBar` | Finite progress | Expedition only | `value`, `max`, `tone` | Empty, partial, complete | Thin, card summary | None | Optional label localized | Expedition only | Never used on Path. |
| `SegmentProgress` | Step progress | Health, Stretch | `current`, `total`, `completed` | Empty, partial, complete | Exercise, stretch | None | Optional label localized | Health enabled | Shows correct 1 of N state. |
| `CircularTimer` | Timer display/control | Strength, Stretch | `mode`, `duration`, `remaining`, `elapsed`, `status`, `controls` | Idle, running, paused, complete, skipped | Rest, exercise, stretch | Pause/skip/complete if enabled | Timer labels localized | Health enabled | Rest, plank, stretch share one timer. |
| `MetadataList` | Icon-left fact list | Mark, Memory, Settings | `items`, `divided`, `tone` | Empty, populated | Metadata, settings | Optional row tap | Localized | Per item gated | Alignment and dividers are consistent. |
| `FloatingActionButton` | Floating add action | Backlog | `icon`, `label`, `position` | Default, pressed, disabled | Add | Opens add flow | Accessibility label localized | Add flow gated | Does not conflict with bottom nav. |
| `InsightCard` | Calm guidance/footer note | Paths, Me, Expeditions | `title`, `body`, `icon`, `tone` | Default, warning, positive | Principle, insight, reminder | Optional | Localized | Always on | Reads as guidance, not dashboard alert. |

---

## 4.3 Domain Components

| Component | Purpose | Used in screens | Props | States | Variants | Tap behavior | Localization needs | Feature gate | Acceptance test |
|---|---|---|---|---|---|---|---|---|---|
| `CaptureChooserSheet` | Route quick capture | Capture | `draftText`, `attachments`, `destinations` | Empty, typing, photo attached, saving | Mark, Memory, Backlog | Destination saves/routes draft | Full sheet localized | Capture enabled | Exactly 3 destinations appear. |
| `CaptureNoteInput` | Lightweight note input | Capture | `value`, `placeholder`, `maxLength` | Empty, typing, disabled | Single/multiline | Focus keyboard | Localized | Capture enabled | Input remains low-friction. |
| `CaptureAttachmentButton` | Add photo attachment | Capture | `type`, `count`, `disabled` | None, attached, disabled | Photo | Opens photo picker/camera | Localized | Photo gated | Photo is not a destination. |
| `CaptureDestinationButton` | Destination choice | Capture | `destination`, `icon`, `tone` | Default, selected, disabled | Mark, Memory, Backlog | Saves/routes capture | Localized | Destination gated | Disabled destination is hidden or clearly unavailable. |
| `TodayPathHero` | Show today’s anchor path | Today | `path`, `image`, `subtitle`, `icon`, `status` | Default, no image, loading | Path-specific | Opens Path Detail | Localized | Paths enabled | No percent complete. |
| `MarksToLeaveSection` | Today marks group | Today | `marks`, `completedCount`, `layout` | Empty, partial, complete | Carousel, grid | Card tap configured | Localized | Marks enabled | Count matches mark states. |
| `MarkCard` | Compact planned mark preview | Today | `mark`, `status`, `icon`, `accent` | Planned, done, missed, postponed | Main, Body, Family, Attention, custom | Opens action sheet or detail by context | Localized | Marks enabled | User understands status quickly. |
| `PlannedMarkActionSheetContent` | Fast planned mark action | PlannedMark Action | `mark`, `path`, `timeWindow`, `intention`, `actions` | Planned, overdue, done, skipped | Routine, expedition, one-off | Leave/Substitute/Reschedule/Skip | Localized | PlannedMark enabled | Routine mark completable under 5 seconds. |
| `JournalLatestHero` | Journal overview summary | Journal Home | `date`, `title`, `memoryCount`, `media` | Empty, populated | Collage, no-image | Opens day/collection | Localized | Journal enabled | Does not imply multi-day feed as canonical Journal. |
| `RecentCollectionRow` | Recent day/memory group | Journal Home | `date`, `title`, `subtitle`, `memoryCount`, `tags` | Default, selected | Day summary, trip group | Opens selected day/group | Localized | Journal enabled | Day row opens that date’s Daily Journal. |
| `MemoryLookBackCard` | Past memory preview | Journal Home | `memory`, `image`, `tag` | Default, no image | Photo, symbolic | Opens Memory Detail | Localized | Memories enabled | Supports pictureless memories. |
| `UpcomingMemoryCard` | Future memory/reminder | Journal Home | `title`, `date`, `daysToGo`, `icon` | Upcoming, due soon, today | Vacation, anniversary, birthday | Opens related detail if real | Date localized | Reminder gated | Hidden until reminder logic exists. |
| `DailyJournalTemplate` | One-day journal feed | Daily Journal | `selectedDate`, `entries`, `dayClosed` | Empty, open, closed | Photo entries, pictureless, closed | Entry opens detail | Full page localized | Journal enabled | Shows one selected day only. |
| `JournalEntryCard` | Day feed entry | Daily Journal | `entryType`, `title`, `summary`, `media`, `tags`, `status` | Default, no image, done, draft | Memory, Mark, DayClosed | Opens Mark/Memory/Close | Localized | Journal enabled | No blank media holes. |
| `DayClosedJournalCard` | Close result in Journal | Daily Journal | `characterResult`, `summary`, `reflection`, `tomorrowStep`, `chips` | Draft, closed | Compact, expanded | Opens Close result | Localized | Close enabled | Always appears at end of selected day when closed. |
| `MarkDetailTemplate` | Mark detail screen | Mark Detail | `mark`, `media`, `proof`, `metadata`, `containers` | Planned, done, skipped, postponed, substituted | Planned, quick, proof | Container rows open target | Full page localized | Marks enabled | Same Mark source as Today/Expedition. |
| `MemoryDetailTemplate` | Memory detail screen | Memory Detail | `memory`, `media`, `tags`, `reflection`, `metadata`, `containers` | Draft, saved, archived | Photo, pictureless | Container rows open target | Full page localized | Memories enabled | Photo memory prioritizes image. |
| `DetailSummaryCard` | Main detail content | Mark, Memory | `title`, `entityLine`, `summary`, `chips`, `bodySection` | Default, missing summary | Mark, Memory | Optional edit if enabled | Localized | Detail enabled | Mark and Memory share structure but remain distinct. |
| `ContainerLinkList` | Long-term container links | Mark, Memory | `containers`, `containerType` | Empty, populated | Expedition, Trip | Opens container | Localized | Containers gated | Section hidden if empty. |
| `PackCheckMiniCard` | Compact pack check summary | Today | `packCheck`, `count`, `icon`, `tone` | Not started, partial, ready | Morning, Office, Gym, Evening | Opens Pack Check | Localized | Pack enabled | Count only, not full checklist. |
| `PackCheckTemplate` | Checklist screen | Pack Check | `packCheck`, `items`, `readyCount`, `actions` | Empty, partial, ready, submitted | Morning, Office, Gym, Evening | Toggle/leave/reset | Full page localized | Pack enabled | Count updates immediately. |
| `PackCheckItemRow` | Checklist item | Pack Check | `item`, `checked`, `required` | Checked, unchecked, disabled | Icon row | Toggle checked | Localized | Pack enabled | Toggle changes ready count. |
| `HealthSessionHeader` | Health metadata header | Health screens | `sessionType`, `path`, `dayType`, `duration`, `exerciseCount` | Not started, active, complete | Day A, Day B, Walk Day | Header actions only | Localized | Health enabled | Day A/B use same header. |
| `HealthSessionHero` | Health phase summary | Health screens | `title`, `subtitle`, `phase`, `state` | Strength, rest, timed, cooldown, complete | Day A, Day B, Walk | None | Localized | Health enabled | Shows phase, not dashboard overload. |
| `StrengthSessionTemplate` | Day A/Day B execution | Strength screens | `session`, `exercises`, `currentPhase`, `timer` | Active set, resting, timed, cooldown, complete | Day A, Day B | Complete set, skip rest, end | Full page localized | Health enabled | Day A/B are data variants. |
| `ExerciseAccordion` | Active exercise panel | Strength | `exercise`, `sets`, `currentSet`, `expanded` | Upcoming, active, resting, done | Reps/weight, timed, bodyweight | Expand/open current | Exercise labels localized if needed | Health enabled | One active exercise expanded. |
| `SetRow` | One exercise set | Strength | `setNumber`, `targetReps`, `weight`, `status` | Upcoming, active, done, failed, skipped | Weight, bodyweight | Edit/complete active set | Units localized | Health enabled | Actual weight override supported. |
| `RestPanel` | Rest state panel | Strength | `duration`, `remaining`, `nextSet` | Idle, running, skipped, complete | Compact, circular | Skip rest | Localized | Health enabled | Rest is a state, not separate screen. |
| `TimedExercisePanel` | Plank/timed movement | Strength | `targetDuration`, `elapsed`, `status` | Ready, running, paused, complete | Plank, timed hold | Pause/complete | Localized | Health enabled | Uses shared timer. |
| `StretchSessionBlock` | Cooldown phase | Stretch | `stretches`, `currentIndex`, `timer` | Ready, active, paused, complete | Day A cooldown, Day B cooldown | Complete stretch | Localized | Health enabled | Reusable after both Day A/B. |
| `WalkSessionTemplate` | Lightweight walk flow | Walk Day | `walkTarget`, `steps`, `stretchBlock`, `homeWalk` | Not started, walking, stretching, walk home, done | Walk Day | Start/complete flow | Full page localized | Walk enabled | Does not reuse dense Strength UI. |
| `PathsOverviewTemplate` | Paths tab | Paths Overview | `paths`, `stats`, `insight` | Empty, normal | Full, minimal | Opens Path Detail | Full page localized | Paths enabled | No percent complete. |
| `PathRow` | One life path row | Paths Overview | `path`, `weeklyMarkCount`, `pulse`, `question` | Alive, protected, weak, neglected, growing | Standard path row | Opens Path Detail | Localized | Paths enabled | Uses pulse/dots, not progress %. |
| `PathPulseCard` | Path health summary | Path Detail | `pulse`, `summary`, `metrics` | Alive, protected, weak, neglected, growing | With metrics, compact | None | Localized | Paths enabled | Describes aliveness, not completion. |
| `RecentProofList` | Recent proof under path | Path Detail | `proofs` | Empty, populated | Compact rows | Opens Mark Detail | Localized | Paths/Marks enabled | Proof rows are read-only summaries. |
| `NextMarksList` | Upcoming marks for path | Path Detail | `marks` | Empty, planned, today, this week | Path next marks | Opens Mark Detail | Localized | Paths/Marks enabled | Does not replace Today cockpit. |
| `PathExpeditionCard` | Expedition card inside Path | Path Detail | `expedition`, `status`, `milestoneProgress` | Active, upcoming, done | Compact grid | Opens Expedition Detail | Localized | Expeditions enabled | Progress allowed because entity is Expedition. |
| `ExpeditionsListTemplate` | Expedition collection | Expeditions List | `expeditions`, `query`, `filters` | Empty, filtered, populated | All paths, path-specific | Opens Expedition Detail | Full page localized | Expeditions enabled | Search/filter affect list. |
| `ExpeditionListCard` | One expedition card | Expeditions List | `expedition`, `path`, `dateRange`, `progress`, `status` | Active, in progress, upcoming, done | Full-width card | Opens Expedition Detail | Localized | Expeditions enabled | Percent complete allowed. |
| `ExpeditionDetailTemplate` | Expedition detail | Expedition Detail | `expedition`, `milestones`, `plannedMarks` | Planned, active, completed, paused | With milestones, no milestones | Open mark detail, expand milestone | Full page localized | Expeditions enabled | PlannedMarks grouped under milestones. |
| `MilestoneTimeline` | Timed milestone structure | Expedition Detail | `milestones`, `currentMilestoneId` | Upcoming, in progress, done, blocked | Expanded/collapsed | Expand/collapse | Localized | Expeditions enabled | Date ranges visible. |
| `BacklogTemplate` | Backlog screen | Backlog | `items`, `filters`, `sort`, `count` | Empty, populated, filtered | All, Ideas, Plans, Marks, Other | Item opens detail if enabled | Full page localized | Backlog enabled | Unassigned items stay here. |
| `BacklogItemCard` | One backlog item | Backlog | `item`, `type`, `horizon`, `icon`, `actions` | Idea, Plan, Mark, Other | Normal, actionable, archived | Tap item; overflow actions | Localized | Backlog enabled | Backlog item is not automatically Mark. |
| `WeeklyCodingReportTemplate` | Selected week report | Weekly Coding | `selectedWeek`, `pulledItems`, `backlogShortcut` | Empty, populated, current week | Week N, Unplanned if later enabled | Open Backlog; item tap | Full page localized | Weekly enabled | No Deferred section. |
| `PulledBacklogItemRow` | Item pulled into week | Weekly Coding | `item`, `path`, `scheduleHint` | Planned, unscheduled, completed | Health, Career, Reading, SNAG | Opens planning/detail | Localized | Weekly enabled | Only selected week’s items appear. |
| `CloseTrailTemplate` | Daily close flow | Close | `day`, `markResults`, `reflection`, `tomorrowStep` | Not started, draft, closed | Normal, missed-heavy, protected | Select/edit/close/save | Full page localized | Close enabled | Calm judgment, not analytics dashboard. |
| `DailyCloseSummaryCard` | High-level close result | Close, Daily Journal | `plannedDone`, `plannedTotal`, `characterResult`, `summary` | Draft, closed | Calm summary | None or opens result | Localized | Close enabled | Clear without feeling like scorecard. |
| `DailyMarkResultList` | Outcomes list | Close | `marks`, `proofText`, `status` | Done, missed, postponed, substituted | Compact review | Opens Mark Detail if enabled | Localized | Close enabled | Status and proof are not confused. |
| `ReflectionPromptPanel` | Reflection accordion | Close | `question`, `selectedOptions`, `note`, `expanded` | Empty, partial, completed | What mattered, pressure, repair | Expand/select/edit | Localized | Close enabled | Notes remain optional. |
| `TomorrowFirstStepCard` | Next day first step | Close | `step`, `pathNeedingAttention`, `editable` | Empty, filled, edited | Editable input | Edit step | Localized | Close enabled | Saves draft safely. |
| `MeOverviewTemplate` | Basecamp hub | Me | `sections`, `settings`, `counts` | Normal, feature-limited | Full, minimal | Rows navigate | Full page localized | Me enabled | No dead feature rows. |
| `MeHubCard` | Large Me navigation card | Me | `title`, `subtitle`, `icon`, `badge`, `status` | Default, disabled, protected | Documents, Weekly, Backlog, Settings | Opens target | Localized | Per target gated | Hidden if target not ready. |
| `SettingsGroupCard` | Settings group | Me | `settings` | Default, partially gated | Privacy, backup, lock | Row opens setting | Localized | Settings gated | No fake security/backup claims. |

---

# 5. Screen-to-Component Map

| Screen | Components used |
|---|---|
| Today Cockpit | `FieldJournalScreenShell`, `PageHeader`, `HeaderActionGroup`, `TodayPathHero`, `MarksToLeaveSection`, `MarkCard`, `PackCheckMiniCard`, `CurrentExpeditionCard`, `CloseTrailEntryCard`, `BottomNavBar`, `JournalCard`, `StatusChip`, `EntityChip` |
| Capture Chooser | `ActionSheet`, `CaptureChooserSheet`, `CaptureNoteInput`, `CaptureAttachmentButton`, `CaptureDestinationButton`, `BottomNavBar`, `JournalCard` |
| PlannedMark Action Sheet | `ActionSheet`, `PlannedMarkActionSheetContent`, `StatusChip`, `EntityChip`, `PrimaryActionButton`, `SecondaryActionButton` |
| Daily Journal | `FieldJournalScreenShell`, `PageHeader`, `DateBadge`, `JournalEntryCard`, `DayClosedJournalCard`, `MediaHero`, `BottomNavBar`, `StatusChip`, `EntityChip` |
| Journal Home / Overview | `FieldJournalScreenShell`, `PageHeader`, `JournalLatestHero`, `MediaCollage`, `RecentCollectionRow`, `HorizontalRail`, `MemoryLookBackCard`, `UpcomingMemoryCard`, `DateBadge`, `SectionHeader`, `BottomNavBar` |
| Mark Detail | `FieldJournalScreenShell`, `PageHeader`, `MediaHero`, `DetailSummaryCard`, `MetadataList`, `ContainerLinkList`, `EntityRow`, `StatusChip`, `EntityChip`, `BottomNavBar` |
| Memory Detail | `FieldJournalScreenShell`, `PageHeader`, `MediaHero`, `DetailSummaryCard`, `MetadataList`, `ContainerLinkList`, `EntityRow`, `EntityChip`, `BottomNavBar` |
| Pack Check | `FieldJournalScreenShell`, `PageHeader`, `PackCheckHero`, `PackCheckItemRow`, `PrimaryActionButton`, `SecondaryActionButton`, `BottomNavBar`, `JournalCard` |
| Strength Session | `FieldJournalScreenShell`, `PageHeader`, `HealthSessionHeader`, `HealthSessionHero`, `StrengthSessionTemplate`, `SegmentProgress`, `ExerciseAccordion`, `SetRow`, `RestPanel`, `TimedExercisePanel`, `CircularTimer`, `PrimaryActionButton`, `SecondaryActionButton` |
| Stretch / Cooldown | `FieldJournalScreenShell`, `PageHeader`, `HealthSessionHeader`, `HealthSessionHero`, `StretchSessionBlock`, `StretchRow`, `CircularTimer`, `SegmentProgress`, `PrimaryActionButton`, `SecondaryActionButton` |
| Walk Session | `FieldJournalScreenShell`, `PageHeader`, `HealthSessionHeader`, `HealthSessionHero`, `WalkSessionTemplate`, `SegmentProgress`, `PrimaryActionButton` |
| Paths Overview | `FieldJournalScreenShell`, `PageHeader`, `PathOverviewStatStrip`, `StatCard`, `PathRow`, `ProgressDots`, `InsightCard`, `BottomNavBar`, `StatusChip` |
| Path Detail | `FieldJournalScreenShell`, `PageHeader`, `PathPulseCard`, `RecentProofList`, `NextMarksList`, `PathExpeditionCard`, `InsightCard`, `BottomNavBar`, `StatusChip`, `EntityChip` |
| Expeditions List | `FieldJournalScreenShell`, `PageHeader`, `SearchBar`, `FilterChipGroup`, `ExpeditionsListTemplate`, `ExpeditionListCard`, `LinearProgressBar`, `StatusChip`, `EntityChip`, `BottomNavBar` |
| Expedition Detail | `FieldJournalScreenShell`, `ExpeditionDetailTemplate`, `ExpeditionSummaryCard`, `LinearProgressBar`, `MilestoneTimeline`, `MilestoneRow`, `ExpeditionPlannedMarkRow`, `EntityRow`, `StatusChip`, `EntityChip`, `BottomNavBar` |
| Backlog | `FieldJournalScreenShell`, `PageHeader`, `SearchBar`, `SortSelector`, `FilterChipGroup`, `BacklogTemplate`, `BacklogItemCard`, `FloatingActionButton`, `StatusChip`, `EntityChip` |
| Weekly Coding Report | `FieldJournalScreenShell`, `PageHeader`, `WeekNavigator`, `WeeklyCodingReportTemplate`, `PulledBacklogItemRow`, `SectionHeader`, `EntityChip`, `StatusChip`, `BottomNavBar` |
| Close the Trail | `FieldJournalScreenShell`, `PageHeader`, `DailyCloseSummaryCard`, `DailyMarkResultList`, `ReflectionPromptPanel`, `TomorrowFirstStepCard`, `PrimaryActionButton`, `SecondaryActionButton`, `BottomNavBar` |
| Me Overview | `FieldJournalScreenShell`, `PageHeader`, `MeOverviewTemplate`, `MeHubCard`, `SettingsGroupCard`, `MetadataList`, `InsightCard`, `BottomNavBar`, `StatusChip` |

---

# 6. Component Build Backlog

## P0 Foundation

| Priority | Component | Why build first | Acceptance test |
|---|---|---|---|
| P0 | Design tokens | Prevents visual drift | All screens consume shared color/type/spacing/radius/elevation tokens. |
| P0 | Semantic state tokens | Prevents status chaos | Planned/Active/Done/etc. map consistently everywhere. |
| P0 | Localization namespace structure | Required by page-level localization | No page mixes EN/VI. |
| P0 | Feature gate boundary | Product rule | Unfinished feature is hidden completely. |
| P0 | `FieldJournalScreenShell` | Every screen depends on it | Background, safe area, scroll, bottom spacing are shared. |
| P0 | `JournalCard` | Most repeated primitive | No custom screen-owned card shells. |
| P0 | `PageHeader` | Used everywhere | Header layout consistent across app. |
| P0 | `HeaderIconButton` | Used in most headers | Icons are consistent and gated. |
| P0 | `BottomNavBar` | Core app navigation | Center Capture opens chooser only. |
| P0 | `StatusChip` | Used across all domains | Same status = same visual meaning. |
| P0 | `EntityChip` | Metadata pattern | Chips wrap and localize correctly. |
| P0 | `SectionHeader` | Repeated section pattern | Section title/action alignment consistent. |
| P0 | `EntityRow` | Main row pattern | Rows support icon/title/subtitle/status/chevron. |
| P0 | `PrimaryActionButton` | Main CTA pattern | Primary action hierarchy is consistent. |
| P0 | `SecondaryActionButton` | Secondary action pattern | Secondary actions do not compete visually. |
| P0 | `ActionSheet` | Capture and PlannedMark need it | Sheet behavior and backdrop are shared. |
| P0 | `MediaHero` | Journal/detail screens need it | Photo, collage, missing media all work. |
| P0 | `DateBadge` | Journal/weekly need it | Locale-aware dates. |
| P0 | `SearchBar`, `FilterChipGroup`, `SortSelector` | Backlog/Expedition controls | Hidden if not functional. |

---

## P1 Core App Loop

| Priority | Component / Template | Why | Acceptance test |
|---|---|---|---|
| P1 | `CaptureChooserSheet` | Core creation entry point | Exactly Mark, Memory, Backlog destinations. |
| P1 | `CaptureNoteInput` | Low-friction capture | Can type quick note without choosing too early. |
| P1 | `CaptureAttachmentButton` | Photo attachment | Photo is attachment only. |
| P1 | `TodayCockpitTemplate` | Main daily screen | Shows Today path, marks, pack checks, current expedition, close CTA. |
| P1 | `MarkCard` | Daily action unit | Status is clear in under 2 seconds. |
| P1 | `PlannedMarkActionSheetContent` | Fast completion | Routine mark completable under 5 seconds. |
| P1 | `DailyJournalTemplate` | Canonical journal | Shows one selected day only. |
| P1 | `JournalEntryCard` | Core journal record | Supports Mark, Memory, pictureless Memory. |
| P1 | `DayClosedJournalCard` | Connects Close to Journal | Appears at end of selected day. |
| P1 | `MarkDetailTemplate` | Required for row taps | PlannedMark row opens Mark Detail. |
| P1 | `MemoryDetailTemplate` | Required for memory navigation | Works with photo and no-photo memories. |
| P1 | `PackCheckTemplate` | Simple daily prep | Checklist state creates readiness proof. |
| P1 | `BacklogTemplate` | Capture and Weekly depend on it | Backlog item remains backlog until pulled. |
| P1 | `BacklogItemCard` | Backlog list unit | Type/horizon/actions clear. |
| P1 | `CloseTrailTemplate` | Daily judgment | Can save draft and close day calmly. |

---

## P2 Core Structure / Planning / Paths / Health

| Priority | Component / Template | Why | Acceptance test |
|---|---|---|---|
| P2 | `PathsOverviewTemplate` | Core Paths tab | Shows paths without percent complete. |
| P2 | `PathRow` | Path list unit | Uses pulse/dots, not project progress. |
| P2 | `PathDetailTemplate` | Path concept screen | Feels alive/protected/weak, not complete/incomplete. |
| P2 | `PathPulseCard` | Protects Path concept | No percent complete. |
| P2 | `RecentProofList` | Shows path proof | Rows open Mark Detail. |
| P2 | `NextMarksList` | Shows upcoming marks | Does not replace Today action cockpit. |
| P2 | `PathExpeditionCard` | Path-to-expedition bridge | Progress allowed only inside expedition card. |
| P2 | `ExpeditionsListTemplate` | All expeditions view | Search/filter work correctly. |
| P2 | `ExpeditionListCard` | Expedition list unit | Shows marks/milestones/% complete. |
| P2 | `ExpeditionDetailTemplate` | Finite work detail | PlannedMarks grouped under timed milestones. |
| P2 | `MilestoneTimeline` | Expedition structure | Expand/collapse milestones correctly. |
| P2 | `WeeklyCodingReportTemplate` | Weekly planning report | Shows only selected week’s pulled items. |
| P2 | `PulledBacklogItemRow` | Weekly item projection | No Deferred section. |
| P2 | `StrengthSessionTemplate` | Day A/B execution | Day A/B data-driven, no duplicate templates. |
| P2 | `ExerciseAccordion`, `SetRow`, `CircularTimer` | Health execution core | Active/rest/timed states work from same session. |
| P2 | `StretchSessionBlock` | Cooldown phase | Shared after Day A and Day B. |
| P2 | `WalkSessionTemplate` | Walk Day | Lighter than Strength Session. |

---

## P3 Later / Privacy / Settings / Overview Polish

| Priority | Component / Template | Why later | Acceptance test |
|---|---|---|---|
| P3 | `JournalHomeTemplate` | Nice overview, but concept-sensitive | Does not violate one-day Journal rule. |
| P3 | `UpcomingMemoryCard` | Needs real reminder logic | Hidden until reminder logic works. |
| P3 | `MeOverviewTemplate` | Many features need gates | No dead rows. |
| P3 | `MeHubCard` | Basecamp navigation | Only implemented targets appear. |
| P3 | `SettingsGroupCard` | Security/privacy sensitive | No fake backup/privacy/app-lock status. |
| P3 | Notification action | Header bell | Hidden until notifications work. |
| P3 | Language switcher | Header language icon | Switches whole page, not partial text. |
| P3 | Camera capture screen | Header camera | Camera opens photo capture only. |
| P3 | Private Documents | Me Overview | Hidden until document module exists. |
| P3 | Local Backup / Privacy Vault / App Lock | Me settings | Hidden until real storage/security behavior exists. |

---

# 7. State System Spec

| Domain | States | Notes |
|---|---|---|
| PlannedMark | Planned, Due now, Overdue, Done, Skipped, Missed, Postponed, Substituted | Shared across Today, Expedition, Close, Journal. |
| BacklogItem | Idea, Plan, Mark candidate, Other, Pulled, Archived | BacklogItem is not Mark until converted/pulled. |
| PackCheck | Not started, Partial, Ready, Submitted, Reset | Keep simple. |
| Memory | Draft, Saved, Archived | Can be photo or pictureless. |
| Path | Alive, Protected, Weak, Neglected, Growing | No percent complete. |
| Expedition | Planned, Active, In progress, Upcoming, Done, Paused, Archived | Can show percent complete. |
| Milestone | Upcoming, In progress, Done, Blocked | Belongs to Expedition only. |
| Health Session | Not started, Active set, Resting, Timed exercise, Cooldown, Completed, Ended early | Day A and Day B share this. |
| Exercise | Upcoming, Active, Resting after set, Done, Skipped | Exercise rows depend on this. |
| Set | Upcoming, Active, Done, Failed, Skipped | Weight override must be possible. |
| Timer | Idle, Running, Paused, Complete, Skipped | Rest, plank, stretch share timer. |
| Daily Close | Not started, Draft, Closed | Journal reads closed result. |
| Reflection Prompt | Empty, Expanded, Selected, Note added, Completed | Optional notes remain optional. |
| Feature | Enabled, Hidden, Disabled-in-dev only | Production should hide incomplete features. |

---

# 8. Screen Concept Corrections

| Screen | Current risk | Required correction |
|---|---|---|
| Journal Home | Looks like multi-day feed while Journal rule says one selected day | Treat as `JournalOverview`; keep `DailyJournalTemplate` as canonical Journal feed. |
| PlannedMark Action Sheet | Has risk of becoming detail screen | Remove detail-like content. Keep only quick action. |
| Expedition PlannedMark rows | Could open action sheet incorrectly | Row tap opens Mark Detail. |
| Path Detail | Current Expeditions show progress | OK only because those cards are Expeditions. Do not move progress to Path. |
| Paths Overview | Stat cards may become dashboard-heavy | Keep stats calm, high-level, non-analytical. |
| Backlog | Type “Project” may introduce new entity | Avoid Project as entity. Use Plan/Idea/Mark/Other or convert finite work to Expedition. |
| Weekly Coding Report | Could become task manager | Keep only selected week’s pulled items and Backlog shortcut. |
| Me Overview | Shows privacy/backup/document features | Hide each feature until end-to-end. |
| Capture | Add photo may look like destination | Keep visual hierarchy: note first, optional photo attachment, then Mark/Memory/Backlog destinations. |
| Health Session | Dense strength UI could be reused for Walk Day | Do not reuse dense Strength template for Walk Day. |
| Close the Trail | Could become analytics dashboard | Keep summary + reflection + repair. Avoid charts and scoring overload. |

---

# 9. Acceptance Test Matrix

| Area | Acceptance test |
|---|---|
| Navigation | Bottom nav always has Today, Journal, Paths, Me, and center Capture. |
| Capture | Center button opens Capture Chooser, not camera. |
| Capture destinations | Only Mark, Memory, Backlog appear as destinations. |
| Photo | Photo is attachment input only. |
| Journal | Daily Journal shows one selected day only. |
| Journal close result | Day Closed card appears at the end of selected day feed. |
| Path | No Path screen shows percent complete. |
| Expedition | Expedition screens can show date range, milestones, marks, and percent complete. |
| PlannedMark | PlannedMark row tap opens Mark Detail. |
| Today quick action | Today may use action sheet for immediate completion, but action sheet is not detail. |
| Backlog | Backlog item is not a Mark until pulled/converted. |
| Weekly Coding | Selected week report shows only items pulled into that week. |
| Health | Day A and Day B use same Strength Session template. |
| Walk Day | Walk Day uses lighter Walk Session template. |
| Timer | Rest, plank, and stretch all use one `CircularTimer`. |
| Localization | Whole page switches language together. |
| Feature gates | Unfinished features are hidden, not disabled-but-visible. |
| Visual system | No screen owns custom card/chip/button/row/timer styling. |

---

# 10. Architecture Rules for Codex

| Rule | Instruction |
|---|---|
| No screen-owned primitives | Screens cannot define their own card, chip, row, button, timer, or sheet styles. |
| Compose from layers | Screen templates compose domain components; domain components compose primitives; primitives consume tokens. |
| Keep entity boundaries | Path, Expedition, Mark, Memory, PackCheck, BacklogItem are separate concepts. |
| Hide unfinished features | Feature not end-to-end must not render in production. |
| Preserve field-journal style | Warm, calm, private, botanical, serif, soft cards. |
| Avoid dashboard creep | Especially in Today, Paths, Close the Trail, and Journal. |
| Avoid task-manager creep | Especially in Backlog, Weekly Coding, Expedition, and Path Detail. |
| Do not over-model optional links | Long-term container sections are optional and hidden when empty. |
| Data-driven health | Day A/B exercises must be data-driven, not separate screen implementations. |
| Journal date scope | Daily Journal query/render scope is one selected date. |
| Capture routing | Capture draft routes into Mark, Memory, or Backlog only. |
| Localize by page | Copy namespace belongs to screen/template level. |

---

# 11. Final Component System Shape

| Layer | Components |
|---|---|
| Design Tokens | Color, typography, spacing, radius, elevation, border, icon, botanical decoration, motion, semantic state, localization |
| Primitive Components | `FieldJournalScreenShell`, `PageHeader`, `HeaderIconButton`, `BottomNavBar`, `JournalCard`, `SectionHeader`, `StatusChip`, `EntityChip`, `EntityRow`, `ExpandableSection`, `PrimaryActionButton`, `SecondaryActionButton`, `ActionSheet`, `MediaHero`, `HorizontalRail`, `DateBadge`, `SearchBar`, `FilterChipGroup`, `SortSelector`, `LinearProgressBar`, `SegmentProgress`, `CircularTimer`, `MetadataList`, `FloatingActionButton`, `InsightCard` |
| Domain Components | Capture components, Today components, Journal components, Mark/Memory detail components, PackCheck components, Health components, Path components, Expedition components, Backlog components, Weekly Coding components, Close the Trail components, Me components |
| Screen Templates | `TodayCockpitTemplate`, `CaptureChooserSheet`, `PlannedMarkActionSheetTemplate`, `DailyJournalTemplate`, `JournalOverviewTemplate`, `MarkDetailTemplate`, `MemoryDetailTemplate`, `PackCheckTemplate`, `StrengthSessionTemplate`, `StretchSessionTemplate`, `WalkSessionTemplate`, `PathsOverviewTemplate`, `PathDetailTemplate`, `ExpeditionsListTemplate`, `ExpeditionDetailTemplate`, `BacklogTemplate`, `WeeklyCodingReportTemplate`, `CloseTrailTemplate`, `MeOverviewTemplate` |

---

# 12. Sharp Implementation Directive

| Directive | Meaning |
|---|---|
| Build primitives before screens | The mockups look visually consistent, but the code will become messy if each screen owns its own UI pieces. |
| Protect the entity model | Most future bugs will come from confusing Path with Expedition, BacklogItem with Mark, Capture with Camera, or Journal Overview with Daily Journal. |
| Use feature gates early | Me, camera, language, notifications, backup, privacy, documents, reminders, and search/filter must be hidden until real. |
| Keep the app calm | Waymark should feel like leaving a mark in a private field journal, not managing a productivity dashboard. |

**Core rule:**

> Screens do not invent UI. Screens compose approved templates, domain components, primitives, and tokens.
