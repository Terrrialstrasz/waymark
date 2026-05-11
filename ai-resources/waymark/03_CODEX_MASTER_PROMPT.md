# Codex Master Prompt: Build Waymark

Build **Waymark** as a private, mobile-first, local-first, config-as-code Life OS.

## Core concept

- Codex writes the Map.
- The user leaves the Marks.
- The app is for daily use, not configuration.
- No back office, no admin panel, no CMS, no SaaS dashboard.
- No runtime AI dependency for core features.

## Recommended stack

| Layer | Choice |
|---|---|
| Mobile app | React Native + Expo |
| Language | TypeScript |
| Navigation | Expo Router or React Navigation |
| Local DB | SQLite |
| Local files | Expo FileSystem |
| Secure storage | SecureStore/native secure storage |
| Notifications | Expo Notifications later |
| Cloud backup | Supabase later, encrypted client-side |

## Required navigation

Bottom tabs:

1. Today
2. Capture
3. Journal
4. Paths
5. Me

There is no Map tab. Weekly Coding Report and Backlog are under Me. Current active Expeditions can be opened from Today. The list of all Expeditions is accessed from each Path screen.

## Required architecture

```text
src/
  waymark-map/
  domain/
  storage/
  services/
  components/
  screens/
  navigation/
  theme/
```

## Build order principle

1. Foundation
2. UI Component System
3. Data model and repositories
4. Map config
5. Core Mark flows
6. Today v1
7. Capture / Journal / Paths / Me
8. Close the Trail
9. Pack Checks
10. Health Session Runner
11. Expeditions
12. Memories
13. Signals / Tools / Privacy later

## Domain rules

- `Mark` is proof only.
- `PlannedMark` is committed intention for a date/window.
- `QuickMarkTemplate` creates fast proof.
- `BacklogItem` holds raw possibilities before commitment.
- `Expedition` is a long-horizon container with route items.
- `ExpeditionRouteItem` can be pulled into Weekly Coding to create PlannedMarks.
- `Memory` is an archive entity; quick memory creates Memory + Mark.
- `PackCheckRun` stores checklist completion; config decides if it creates a Mark.
- `DailyClosure` owns planned-vs-completed, consumed, anchor deviation, and Character result.
- `WorkoutSessionRun` is the only Health outlier: Workout A, Walk, Workout B.

## Visibility rules

If a workflow is not end-to-end complete, hide the entry point entirely.

Visible Today item must open the correct complete flow:

| Visible item | Must open |
|---|---|
| PlannedMark card | Done/Postpone/Substitute flow |
| Body Mark | Workout A / Walk / Workout B runner |
| Pack Check card | PackCheckRun checklist |
| Expedition card | Expedition detail |
| Memory capture | Memory + MediaAsset + Mark flow |
| Close Trail | DailyClosure + Character Mark flow |

## Localization

Support English and Vietnamese as first-class languages. Apply localization page by page. A page should not be visible in a language unless all visible copy on that page is translated.

## Do not build

- Map tab
- Back office
- CMS
- Admin UI
- Cloud-first model
- AI-first model
- App blocker
- Gamified streaks
- Placeholder cockpit cards
- Uncontrolled mark-type entities
