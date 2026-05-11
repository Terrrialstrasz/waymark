# Pack Checks / Transition Guard

## Purpose

Pack Checks protect attention at transition moments.

> Stop before stepping out. Scan body, pockets, bag, and room.

A Pack Check is not a Mark. It is a checklist run. It may create a Mark only if Map config says so.

## Entities

| Entity | Role |
|---|---|
| PackCheckConfig | Coded template in Map |
| PackCheckRun | Actual completed checklist |
| Mark | Optional proof generated from completionMark config |

## Pack Check flow

```text
Open Pack Check
  → complete/skip checklist items
  → save PackCheckRun
  → if completionMark configured, create Mark
  → update Today and Journal
```

## PackCheckConfig completionMark

```ts
completionMark?: {
  pathId: LifePathId;
  quickMarkTemplateId?: string;
  defaultTitle: LocalizedText;
  level: MarkLevel;
  privacy: PrivacyScope;
}
```

If no `completionMark` exists, the PackCheckRun is saved but no Mark is created.

## Core Pack Checks

| Pack Check | Purpose | Likely completion Mark path |
|---|---|---|
| Morning Pack Check | Before leaving home | Character |
| Office Pack Check | Before leaving office | Character or Career/Character |
| Gym Pack Check | Before workout | Health or Character |
| Tomorrow Pack Check | Before sleep | Character |
| Style Standard Check | Hygiene/appearance | Culture or Character |
| Family Trip Pack Check | Family trip readiness | Family or Character |
| Golf Event Pack Check | Golf event readiness | Golf or Character |
| Tool Check | Open external apps with purpose | Character / ToolSession result |

## Morning Pack Check example

| Item | Type |
|---|---|
| Look down. Are you wearing your work shoes? | attention |
| Phone | item |
| Wallet | item |
| Keys | item |
| Laptop/documents if needed | item |
| Look once at desk, table, bed, and chair | attention |

## Office Pack Check example

| Item | Type |
|---|---|
| Laptop | item |
| Charger | item |
| Documents / notebook | item |
| Scan desk and chair | attention |
| Tomorrow’s first step is clear | clarity |

## PackCheckRun fields

| Field | Meaning |
|---|---|
| packCheckConfigId | Which template was run |
| date | Run date |
| status | started/completed/cancelled |
| completedItemIds | Items checked |
| skippedItemIds | Items skipped honestly |
| relatedPlannedMarkId | Optional context |
| relatedExpeditionId | Optional context |
| createdMarkId | Optional completion proof |

## Today visibility

Do not show a Pack Check card unless the PackCheckRun flow works and the checklist can be completed.

| State | UI behavior |
|---|---|
| available | Opens checklist |
| completed | Shows completed state |
| partial/skipped | Shows honest skipped state |
| not ready | Hidden |
| not relevant today | Hidden |

## Acceptance criteria

| Test | Expected |
|---|---|
| Open Morning Pack Check | Checklist appears |
| Complete items | PackCheckRun saved |
| Config has completionMark | Mark created on configured path |
| Config has no completionMark | No Mark created |
| Complete Pack Check | Today updates |
| Open Journal | Generated Mark/proof visible if configured |
