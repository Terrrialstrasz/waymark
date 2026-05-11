# Waymark AI Resource Pack v2

This pack is the updated source of truth for building **Waymark** after the latest product, domain, workflow, and UI decisions.

Waymark is a private, phone-first, local-first Life OS built around paths, marks, memories, and daily closure.

Core sentence:

> Codex writes the Map. I leave the Mark.

## How to use this pack

1. Add this folder to the repository under `/ai-resources/waymark/` or `/docs/waymark/`.
2. Give Codex `03_CODEX_MASTER_PROMPT.md` first.
3. For any specific build task, also provide the relevant feature file.
4. Do not ask Codex to infer hidden product rules from memory. Point it to the specific file.
5. Build from components and workflows, not from isolated screens.

## Core non-negotiables

| Rule | Meaning |
|---|---|
| Phone owns the truth | SQLite/local storage first; cloud is backup later |
| Map lives in code | No back office, admin panel, or CMS |
| Marks are proof | Marks do not own planning, memory, pack check, workout, or closure logic |
| Two normal mark flows | PlannedMark and QuickMark |
| Hide incomplete flows | No placeholder, disabled, or coming-soon cockpit modules |
| Today is executable | If a visible item can be tapped, the end-to-end flow must work |
| Weekly Coding is report-like | It lives under Me; it is not a Map tab or heavy planning workspace |
| Journal is UI name | Domain may still call it Trail internally |
| Page-level localization | Every visible page must be fully localized in the selected language |
| Component phase first | Build the UI component system before full screens |

## Files in this pack

See `index.json` for the manifest. The most decision-changing files are:

| File | Why it matters |
|---|---|
| `06_DATA_MODEL_AND_SQLITE_SCHEMA.md` | Locks the corrected entity model |
| `09_MARK_FLOWS_PLANNED_AND_QUICK.md` | Prevents mark-type explosion |
| `10_BACKLOG_AND_WEEKLY_CODING.md` | Defines backlog and weekly conversion |
| `16_WORKFLOW_REQUIREMENTS.md` | Converts data model into real user flows |
| `17_UI_SITEMAP_AND_NAVIGATION.md` | Locks Today / Capture / Journal / Paths / Me |
| `18_UI_COMPONENT_SYSTEM.md` | Forces component phase before screens |
| `19_TODAY_COCKPIT_REQUIREMENTS.md` | Enforces visible means complete |
| `25_BUILD_BACKLOG_AND_ORDER.md` | Turns decisions into build sequence |

## Current bottom navigation

| Tab | Role |
|---|---|
| Today | Execute today |
| Capture | Capture proof, memory, or future idea |
| Journal | Review proof timeline and memories |
| Paths | Review seven life paths and path-owned expeditions |
| Me | Weekly Coding Report, Backlog, settings, privacy, backup, signals |
