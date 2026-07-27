# Waymark Source-of-Truth Contract

## Governing Sentence

Waymark Vault is the logical source of truth. Local SQLite is the working copy. Turso is the structured reconciliation store. Google Drive is the media blob store. Seed is static config only.

## Core Definition

Waymark Vault is not a new database, folder, or cloud runtime. It is the logical ownership boundary for one user's Waymark life data, identified by `vaultId`. Local SQLite, Turso, and Google Drive are storage layers governed by the Vault contract. Waymark Main and Waymark Lite are clients of the same Vault.

## Sync Trigger Contract

Waymark outbound sync is batch-driven. Typed Turso planning intake is Manual Pull only.

Local writes must update SQLite first and may create durable `sync_outbox` rows, but outbox rows must not be drained immediately after every write. Upload/sync to Turso is allowed only through:

1. Explicit EOD sync, usually after Close Trail or another user-visible end-of-day action.
2. Explicit user action through an Upload/Sync button.
3. A future scheduled batch job only if the user has opted in and the app shows clear sync status.

Remote planning edits made in Turso reach Waymark only after the user invokes Manual Pull. The intake service captures a revision ceiling, validates and applies the coalesced planning batch to local SQLite in a transaction, then lets UI selectors refresh from local SQLite. Turso rows must not be read directly by screens as live UI state. The detailed contract is `docs/waymark-turso-planning-contract.md`.

Forbidden sync triggers:

- Push to Turso directly from a repository write.
- Push to Turso directly from a screen save handler.
- Background real-time sync after every Mark, Memory, MediaAsset, or TrailDay mutation.
- UI waiting for Turso before rendering local data.
- Remote realtime subscriptions deciding local UI state without first applying accepted changes to local SQLite.
- Automatic or foreground polling for typed Turso planning edits.
- Raw Turso console edits that skip `vault_id`, stable entity ID, revision metadata, and updated timestamp/change-log metadata.

Standard local-first write flow:

```text
User action
-> local SQLite transaction
-> canonical row updated
-> sync_outbox row created
-> UI renders from local SQLite
-> outbox waits for EOD sync or explicit Upload/Sync button
```

Standard inbound remote edit flow:

```text
Turso canonical row edited
-> remote revision/change metadata advances
-> user invokes Manual Pull
-> Waymark captures a remote revision ceiling
-> local SQLite transaction validates and applies change
-> local revision/conflict state updated
-> UI renders from local SQLite selectors
```

## Layer Responsibilities

| Layer | Role | Can create user records? | Can mutate user records? | Can delete user records? | Can decide final truth? | Can run during reinstall? |
|---|---|---:|---:|---:|---:|---:|
| Waymark Vault | Logical source-of-truth boundary for one user's Waymark world | Yes, through authorized clients and reconciliation | Yes, through authorized clients and reconciliation | Yes, through tombstone-aware rules | Yes | Yes |
| Local SQLite | Local/offline working copy for a client | Yes, as pending local mutations | Yes, as pending local mutations | Yes, by writing tombstones | No | Yes, after provenance and restore checks |
| Turso | Structured reconciliation store and selected planning management store used by the Vault | Yes, for activated typed planning tables through the Studio contract | Stores accepted structured mutations and trusted single-writer planning edits | Stores accepted tombstones | No, it applies the reconcile contract | Yes, through restore/sync only |
| Google Drive | Media blob store used by the Vault | No structured records | Stores media blobs and Drive metadata | Deletes/removes media blobs only by Vault rules | No | Yes, through media restore/lazy load only |
| Seed runner | Static config/template initializer | No | No user-owned mutation | No user-owned deletion | No | Yes, after restore gate only |
| Sync outbox | Pending local mutation log | No direct creation outside repository writes | Tracks mutation status | Marks mutations failed/synced/conflict | No | Yes, existing pending state must be preserved |
| Reconcile engine | Rule layer for accepted state | Accepts/rejects client mutations | Resolves or flags competing mutations | Applies tombstone rules | Yes, by contract | Yes, during restore/sync |
| Waymark Main | Full local-first client of the Vault | Yes, via local SQLite and outbox | Yes, via local SQLite and outbox | Yes, via tombstone mutations | No | Yes |
| Waymark Lite | Lightweight local-first client of the same Vault | Yes, via same ID/provenance/outbox rules | Yes, for allowed features | Yes, for allowed features | No | Yes |

## Full Turso Projection Contract

Every canonical Waymark table must have a Turso projection plan. "Canonical" means the table stores product, user, config, template, restore, or audit state that should survive device loss or be shared across Waymark clients.

The projection plan has three modes:

| Mode | Meaning | Turso behavior |
|---|---|---|
| `editable_remote` | The table may be edited from Turso and pulled into Waymark. | Requires remote revision/change-log metadata and inbound validation before local apply. |
| `synced_readonly_remote` | Waymark pushes/restores the table, but Turso console edits are not accepted as product intent. | Remote changes are ignored, rejected, or surfaced as admin conflicts. |
| `local_only` | The table is device/runtime-only and should not be pushed as Vault truth. | Not projected except diagnostics/export when explicitly requested. |

Weekly timetable and Signal tables are first-class `editable_remote` tables:

- `week_plans`
- `week_plan_items`
- `signals`

Strategic-map tables are promoted to `editable_remote` only in their ordered planning phase:

- `paths`
- `expeditions`
- `milestones`

All other canonical tables start as `synced_readonly_remote` unless a product requirement explicitly promotes them to `editable_remote`.

Technical tables such as local migration bookkeeping are `local_only`. Device-private caches, transient UI state, and temporary local files are also `local_only`.

## Lifecycle Rules

| Lifecycle | Required behavior |
|---|---|
| App restart | Open local DB, run migrations, read provenance, keep existing local working copy, then run safe static seed and runtime materialization. |
| App update | Run migrations, preserve `dbInstanceId`, `vaultId`, `deviceId`, client type, tombstones, and pending outbox rows. |
| Fresh install | Create local DB provenance first. If restore is configured, restore Vault state before seed. If not configured, mark the DB as `fresh_local` and `local_only`. |
| Uninstall/reinstall | App-specific local storage may be gone. Only records already synced into the Vault can be restored. Unsynced local-only records must be treated honestly as missing/unrecoverable. |
| EOD sync | Upload media blobs first and push structured outbox mutations. Typed planning changes are not pulled automatically. |
| Manual Upload/Sync | User explicitly drains pending outbox rows. The app must show pending/uploading/synced/failed/conflict status and must not block local UI rendering. |
| Manual Pull | User explicitly captures a planning revision ceiling and applies the validated coalesced batch to local SQLite before UI refresh. |
| Offline creation | Create the domain row locally and create a `sync_outbox` mutation with `vaultId`, `deviceId`, `clientType`, record type, stable ID, operation, payload, and revision. |
| Conflict | Deterministically resolve or create a conflict state. Do not silently overwrite competing user data. |
| Delete/tombstone | Deletes are tombstone mutations. Tombstones must prevent stale remote/local updates from resurrecting records. |
| Media upload failure | Keep the media row in `pending_upload`, `failed`, or `missing` status. Do not pretend cloud media exists. |
| Restore-before-seed | On a fresh DB with restore configured, restore structured Vault state and media metadata before running static seed. |

## Data Classification

### Static/config/template data

- Path definitions.
- Mark type definitions.
- Static icon/config metadata.
- Default pack check templates.
- Default signal templates.
- Static close trail rules if they are not user history.
- Static anchor rotation templates if they are not user-owned plans.

### User-owned life data

- Memories.
- Marks.
- Media assets.
- Planned marks.
- Weekly timetable imports.
- Daily closures.
- Reflections.
- Judgment results.
- Pack check runs.
- Signal occurrences.
- User-edited signal configs.
- User-created or user-modified expeditions.
- User-created or user-modified milestones.
- Backlog items unless explicitly classified as static demo/config and disabled for production.

## Seed Contract

Seed may:

- Upsert static/config/template data by stable key.
- Preserve user modifications.
- Run after migration.
- Run after restore.

Seed must never:

- Create fake user history.
- Create user memories.
- Create user marks.
- Create planned marks from production runtime unless explicitly imported by the user.
- Create media assets.
- Create pack check runs.
- Create daily closures.
- Create reflections or judgments.
- Overwrite user-owned rows.
- Delete user-owned rows.
- Run before cloud restore on a fresh DB when restore is configured.

## Boot Contract

Correct boot order:

1. Open/create local DB.
2. Run migrations.
3. Read DB provenance.
4. Determine restore state.
5. If fresh DB and cloud restore configured, restore Vault state first.
6. Run safe static seed.
7. Initialize runtime/materialization.
8. Render app.

Forbidden boot order:

1. Open DB.
2. Detect empty DB.
3. Run seed.
4. Create local user/world.
5. Later attempt restore.

## Main/Lite Contract

- Waymark Main and Waymark Lite are both clients of one Vault.
- Lite may filter display and feature access.
- Lite must not fork truth.
- Lite-created records must use the same stable ID, `vaultId`, `deviceId`, `clientType`, and sync metadata rules.
- Lite display filtering must not be implemented as separate data ownership.

## Initial Seed Classification

| Seeded entity | Classification | Production behavior | Notes |
|---|---|---|---|
| `paths` | `static_config_allowed` | Seed allowed | Built-in map definitions only. |
| `markTemplates` | `template_allowed` | Seed allowed | Templates may create runtime marks later by explicit runtime rules. |
| `packCheckTemplates` | `template_allowed` | Seed allowed | Templates only, not runs. |
| `signalConfigs` | `template_allowed` | Seed allowed | Default templates/configs only, not occurrences. |
| `workoutRoutines` | `template_allowed` | Seed allowed | Routine templates and exercise definitions only. |
| `closeTrailRules` | `static_config_allowed` | Seed allowed | Static rule config only. |
| `anchorPathRotations` | `static_config_allowed` | Seed allowed | Static template/config only. |
| `expeditions` | `needs_decision` | Seed allowed only as built-in static map objects | User-created/user-modified expeditions must never be overwritten. |
| `milestones` | `needs_decision` | Seed allowed only as built-in static map objects | User-created/user-modified milestones must never be overwritten. |
| `dailyMarkAssignments` | `user_owned_blocked` | Production seed blocked | Treat as planned marks/plans, not static seed. |
| `backlogItems` | `dev_demo_only` | Production seed blocked | May exist in fixtures/demo only, not production seed. |
