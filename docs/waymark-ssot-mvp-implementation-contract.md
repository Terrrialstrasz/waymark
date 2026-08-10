# Waymark SSOT MVP Implementation Contract

Status: legacy MVP/outbound contract. Typed planning intake is superseded by `docs/waymark-turso-planning-contract.md`. Do not use the live-intake language in this document for new implementation.

## 1. Scope

Waymark remains local-first and phone-first.

> Superseded architecture note: Turso Full-DB v2 in `waymark-source-of-truth-contract.md` now governs storage and sync. Historical implementation details below remain only for legacy-test context.

For runtime reads, local SQLite is the operational cache. Turso is the sole structured-data source of truth for the Waymark Vault. Google Drive is a media blob/artifact store. UI screens render selectors/view-models from the cache only.

Turso outbound upload is batch-driven, not real-time. Local writes create durable outbox rows, but the outbox may be drained only by EOD sync, an explicit Upload/Sync button, or a future user-approved scheduled batch job. Repository writes and screen save handlers must not push directly to Turso.

Typed Turso planning edits are Manual Pull only. The intake service must capture a revision ceiling and apply accepted changes to local SQLite first. UI screens still render local selectors/view-models and must not subscribe to Turso rows directly.

Every canonical Waymark table must be pushed to Turso eventually. The phased scope below controls implementation order, not final ownership. Weekly timetable and Signals are the first remote-editable group.

MVP Turso outbound sync covers:

- `mark_instances`
- `mark_instance_details`
- `memories`
- `media_assets`
- `trail_days`
- `week_plans`
- `week_plan_items`
- `signals`

Phase 2 sync covers:

- `pack_check_instances`
- `workout_session_instances`
- inbound remote edit intake for `week_plans`, `week_plan_items`, and `signals`

Later sync covers:

- `paths`
- `expeditions`
- `milestones`
- `reflection_entries`

Full Turso projection later covers all remaining canonical tables:

- `vaults`
- `devices`
- `sync_state`
- `user_profiles`
- `app_settings`
- `backlog_items`
- `mark_templates`
- `mark_dependencies`
- `pack_check_templates`
- `pack_check_item_templates`
- `mark_pack_check_rules`
- `pack_check_item_instances`
- `daily_media_upload_batches`
- `exercise_definitions`
- `workout_routine_templates`
- `routine_exercise_templates`
- `session_exercise_snapshots`
- `exercise_set_logs`
- `exercise_progress_states`

Local-only technical tables:

- `schema_migrations`
- local temporary/cache tables if added later

Do not add `planned_marks`, `actual_marks`, or `journal_entries`. The current DB vocabulary is canonical:

- Planned Mark is a product concept represented by `mark_instances` with planned/weekly/manual origin and scheduled fields.
- Actual Mark is a completed `mark_instances` row.
- Journal is a derived feed.
- Daily Closure is the Close the Trail product flow and continues to use `trail_days` for Phase 1. A richer `daily_closures` migration is not part of Phase 1.

## 2. File-Level Mutation Inventory

Legend:

- Tx: mutation is currently wrapped in repository transaction.
- Idem: has deterministic key or idempotent lookup for retry.
- Outbox: currently writes `sync_outbox`.
- Unique: DB unique/index protection exists today.

### MVP canonical entities

| File/function | Entity | Operation | Tx | Idem | Outbox | Unique | Contract decision |
|---|---|---:|---:|---:|---:|---:|---|
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteTrailDayRepository.getOrCreateTrailDay` | `trail_days` | create-if-missing | partial | yes: `trailday_${userId}_${localDate}` and `UNIQUE(user_id, local_date)` | no | yes | Keep as primitive; Phase 1 wrapper must write outbox in same transaction when row is created or mutated. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteTrailDayRepository.updateTrailDay` | `trail_days` | update counters/status | no outer guarantee | no | no | id only | MVP outbox required for status/counter/closure changes. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteTrailDayRepository.updateCloseState` | `trail_days` | close/reopen fields | caller-dependent | no | no | id only | Product-level close/reopen service must own transaction and outbox. |
| `src/lib/waymark/closeTrailEngine.ts` `closeTrailDay` | `trail_days`, `reflection_entries`, optional marks | close day | yes | no | no | `trail_days(user_id, local_date)` | MVP outbox for `trail_days`; reflections are later scope. |
| `src/lib/waymark/closeTrailEngine.ts` `reopenTrailDay` | `trail_days` | reopen day | yes | no | no | id only | MVP outbox required. |
| `src/lib/waymark/plannedMarkSourceOfTruth.ts` `recomputeTrailDayCountersForTrailDay` | `trail_days` | derived counter update | no | deterministic recompute | no | id only | Treat counters as derived-but-stored cache; outbox optional only if syncing full `trail_days` snapshot. Prefer recompute after restore. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteMarkRepository.createMarkInstance` | `mark_instances` | create | caller-dependent | optional `generation_key` | no | `ux_mark_instances_generation_key_active` when key present | Phase 1: require product-level mutation wrapper to provide idempotency key for retryable creates. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteMarkRepository.updateMarkInstance` | `mark_instances` | update/complete | caller-dependent | id-based | no | id only | Phase 1 outbox required in same transaction. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteMarkRepository.softDeleteMarkInstance` | `mark_instances` | tombstone local row | caller-dependent | id-based | no | id only | Phase 1 must write tombstone outbox; no hard remote delete. |
| `src/lib/waymark/markEngine.ts` `completeMarkInstance` | `mark_instances` | complete | yes | id-based, not retry-idempotent enough | no | id only | Add idempotent completion behavior: retry completion of already-completed same mark returns existing completed row. |
| `src/lib/waymark/markEngine.ts` `skipMarkInstance` | `mark_instances` | skip | yes | id-based | no | id only | Outbox required if included in MVP write wrapper. |
| `src/lib/waymark/markEngine.ts` `rescheduleMarkInstance` | `mark_instances` | create replacement + update original | yes | no generation key on replacement | no | id only | MVP local contract only; remote sync uses both row mutations in one outbox batch. |
| `src/lib/waymark/markEngine.ts` `substituteMarkInstance` | `mark_instances` | create substitute + update original | yes | no | no | id only | Same as reschedule. |
| `src/lib/waymark/weeklyPlannedMarkMaterializer.ts` `materializeWeeklyPlannedMark` | `mark_instances` | create/update/adopt planned mark | caller-dependent | yes: `generation_key` | no | yes | Protect primer/user edits; do not overwrite protected/materialized snapshots. |
| `src/lib/waymark/shellAppAdapters.ts` `createQuickCaptureMark` | `mark_instances`, optional `media_assets` | quick create + complete | no single product tx | no | no | id only | Needs product-level transaction if promoted into MVP sync path. |
| `src/lib/waymark/shellAppAdapters.ts` `deleteMarkDetail` | `mark_instances` | soft delete | no single tx across dependencies | id-based | no | id only | MVP delete must become tombstone transaction. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteMemoryRepository.createMemory` | `memories` | create | caller-dependent | no deterministic key | no | id only | Phase 1 wrapper must create memory + outbox in same transaction. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteMemoryRepository.updateMemory` | `memories` | update | caller-dependent | id-based | no | id only | Phase 1 outbox required. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteMemoryRepository.softDeleteMemory` | `memories` | tombstone local row | caller-dependent | id-based | no | id only | Phase 1 tombstone outbox required. |
| `src/app/journalMemoryCapture.ts` `createJournalMemoryCapture` | `memories`, optional `media_assets` | create memory with media | no single tx across memory+media | no | no | id only | Current rollback soft-deletes memory on media save failure; change contract: memory survives upload/save failure once domain row is created. |
| `src/lib/waymark/shellAppAdapters.ts` `deleteMemoryDetail` | `memories` | soft delete | no | id-based | no | id only | Must write tombstone outbox in Phase 1. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteMediaRepository.createMediaAsset` | `media_assets` | create media row | caller-dependent | no content/idempotency uniqueness | no | owner index only | Phase 1: add idempotency rule for media asset creation. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteMediaRepository.updateMediaAsset` | `media_assets` | update status/Drive metadata | caller-dependent | id-based | no | id only | Phase 1 outbox for canonical metadata/status changes. |
| `src/app/waymarkMediaPipeline.ts` `saveMediaAssetsForOwner` | `media_assets`, `daily_media_upload_batches` | persist local file + create rows | yes for DB rows after file copy | bounded by owner/sort only | no | owner index only | Keep local file copy outside DB tx; DB writes must be atomic and outboxed. |
| `src/app/dailyMediaUploadService.ts` `runDailyMediaUpload` | `media_assets`, Drive files | upload/update status | no single tx across Drive | yes: Drive lookup by media asset appProperties | no | Drive appProperties only | Drive retry must not duplicate; local status remains canonical. |

### Weekly timetable canonical entities

| File/function | Entity | Operation | Tx | Idem | Outbox | Unique | Contract decision |
|---|---|---:|---:|---:|---:|---:|---|
| `src/lib/waymark/weeklyTimetableImport.ts` `importWeeklyTimetable` | `week_plans`, `week_plan_items`, `mark_instances`, `mark_instance_details` | import/materialize | yes | yes: deterministic import key and mark generation key | no | `week_plans(user_id, week_start_date)`, item import key expected | Move into MVP outbound sync. Import creates outbox rows for week plan, week items, materialized marks, and details in one product transaction. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteWeekPlanRepository.upsertWeekPlan` | `week_plans` | upsert | caller-dependent | `user_id+week_start_date` | no | yes | MVP outbound outbox. Manual Pull may update existing status, summary, note, and tombstone fields; normal Studio edits may not move a plan to another week. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteWeekPlanRepository.upsertItems` | `week_plan_items` | upsert items | caller-dependent | deterministic import key when present | no | expected by schema verification | MVP outbound outbox. Inbound remote edit may update canonical item fields but cannot overwrite protected materialized mark details. |

### Phase 2 canonical entities

| File/function | Entity | Operation | Tx | Idem | Outbox | Unique | Contract decision |
|---|---|---:|---:|---:|---:|---:|---|
| `src/db/adapters/SQLiteRepositories.ts` `SQLitePackCheckRepository.upsertInstance` | `pack_check_instances` | upsert run | caller-dependent | generation key when present | no | `ux_pack_check_instances_generation_key_active` | Phase 2 outbox. |
| `src/db/adapters/SQLiteRepositories.ts` `SQLiteStrengthRepository.upsertSession` | `workout_session_instances` | upsert session | caller-dependent | unique active mark session | no | `ux_workout_sessions_mark_active` | Phase 2 outbox. |

### Later canonical/static entities

| File/function | Entity | Operation | Contract decision |
|---|---|---|---|
| `src/waymark-map/bootstrap.ts` seed upserts | paths, expeditions, milestones, templates, configs | static seed/materialization | Do not sync as MVP user data; restore-before-seed must prevent duplicate built-ins. |
| `src/db/adapters/SQLiteRepositories.ts` Path/Expedition/Milestone methods | paths, expeditions, milestones | create/update/delete | Later sync only; must first classify built-in vs user-modified. |
| `src/db/adapters/SQLiteRepositories.ts` Signal methods | signals | create/update | MVP outbound and inbound editable. Typed planning may update target, schedule, and future `is_enabled`; runtime status and delivery effects remain local-owned. |
| `src/db/adapters/SQLiteRepositories.ts` reflection methods | reflection_entries | replace/list | Later sync only unless richer daily closure is promoted. |

### Full table projection policy

| Table | Projection mode | Remote edit allowed? | Notes |
|---|---|---:|---|
| `vaults` | synced_readonly_remote | no | Restored/shared Vault identity. |
| `devices` | synced_readonly_remote | no | Devices register locally; remote console edits are admin conflicts. |
| `sync_state` | synced_readonly_remote | no | Cursor/status projection for diagnostics and restore. |
| `sync_outbox` | synced_readonly_remote | no | Audit/debug projection only; canonical pending queue remains local. |
| `sync_tombstones` | synced_readonly_remote | no | Tombstone projection required for restore and anti-resurrection. |
| `user_profiles` | synced_readonly_remote | no | Product edit should happen in app first unless promoted later. |
| `app_settings` | synced_readonly_remote | no | Some settings may remain device-local; classify per key before full sync. |
| `paths` | editable_remote_phase_4 | later | Update/tombstone after weekly and Signal slices; insert requires stable identity and seed ownership rules. |
| `expeditions` | editable_remote_phase_4 | later | Update/tombstone after Path intake; insert requires same-Vault parent validation. |
| `milestones` | editable_remote_phase_4 | later | Update/tombstone after Expedition intake; insert requires same-Vault parent validation. |
| `trail_days` | synced_readonly_remote | no | Close the Trail is app-owned; remote edit conflicts by default. |
| `reflection_entries` | synced_readonly_remote | no | Sensitive payload; encryption required before production sync. |
| `mark_templates` | synced_readonly_remote | no | Template/config projection, not remote product editing yet. |
| `mark_instances` | synced_readonly_remote | no | Completion/state transitions remain app-owned. |
| `mark_instance_details` | synced_readonly_remote | no | Protected from weekly remote overwrite once materialized. |
| `memories` | synced_readonly_remote | no | Sensitive payload; media remains separate. |
| `backlog_items` | synced_readonly_remote | no | Remote editing may be promoted later after conflict rules. |
| `week_plans` | editable_remote | yes | First remote-editable product table. |
| `week_plan_items` | editable_remote | yes | First remote-editable product table; must preserve materialized mark details. |
| `pack_check_templates` | synced_readonly_remote | no | Template/config projection. |
| `pack_check_item_templates` | synced_readonly_remote | no | Template/config projection. |
| `mark_pack_check_rules` | synced_readonly_remote | no | Template/config projection. |
| `pack_check_instances` | synced_readonly_remote | no | Phase 2 outbound. |
| `pack_check_item_instances` | synced_readonly_remote | no | Phase 2/full outbound. |
| `signals` | editable_remote | yes | Remote planning owns target, scheduled_at, future is_enabled, and tombstone fields. Runtime status and delivery timestamps remain local-owned. |
| `mark_dependencies` | synced_readonly_remote | no | Derived relation projection. |
| `media_assets` | synced_readonly_remote | no | Drive ID is metadata; Drive manifest is not truth. |
| `daily_media_upload_batches` | synced_readonly_remote | no | Audit/status projection. |
| `exercise_definitions` | synced_readonly_remote | no | Template/config projection. |
| `workout_routine_templates` | synced_readonly_remote | no | Template/config projection. |
| `routine_exercise_templates` | synced_readonly_remote | no | Template/config projection. |
| `workout_session_instances` | synced_readonly_remote | no | Phase 2 outbound. |
| `session_exercise_snapshots` | synced_readonly_remote | no | Snapshot projection. |
| `exercise_set_logs` | synced_readonly_remote | no | User-owned workout log projection. |
| `exercise_progress_states` | synced_readonly_remote | no | User-owned progress projection. |
| `schema_migrations` | local_only | no | Local DB technical bookkeeping only. |

## 3. Minimal MVP Schema Diff

Add only the minimum needed for local-first outbox. Do not add Turso tables directly to product flow yet.

```sql
CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  db_instance_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mark_instance', 'mark_instance_detail', 'memory', 'media_asset', 'trail_day', 'week_plan', 'week_plan_item')),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  idempotency_key TEXT NOT NULL,
  local_revision INTEGER NOT NULL,
  base_remote_revision INTEGER,
  payload_json TEXT NOT NULL,
  payload_schema_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('pending', 'syncing', 'synced', 'failed', 'conflict')) DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  UNIQUE(idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_pending
  ON sync_outbox(vault_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity
  ON sync_outbox(entity_type, entity_id, status);
```

Add tombstone metadata only if current `deleted_at` is insufficient for remote deletes:

```sql
CREATE TABLE IF NOT EXISTS sync_tombstones (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  local_revision INTEGER NOT NULL,
  reason TEXT,
  PRIMARY KEY (entity_type, entity_id)
);
```

Media hardening indexes to consider in Phase 1:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS ux_media_assets_user_content_owner_active
  ON media_assets(user_id, content_hash, owner_type, owner_id)
  WHERE content_hash IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_drive_file
  ON media_assets(drive_file_id, deleted_at)
  WHERE drive_file_id IS NOT NULL;
```

Primer/Mark Detail storage diff is described below. It may be a migration in Phase 1 if product agrees.

## 4. Repository Write Contract

Every MVP canonical write must follow this shape:

1. Enter `repositories.transaction.runInTransaction`.
2. Apply domain validation.
3. Create/update/tombstone the canonical local row.
4. Increment `local_revision` and set `sync_status = 'dirty'`.
5. Insert exactly one `sync_outbox` row per changed canonical entity, or reuse the same `idempotency_key`.
6. Commit only after the canonical row and outbox row both succeed.
7. If outbox insert fails, rollback the canonical write.
8. If sync later fails, local state remains correct and outbox status becomes `failed`.

Primitive repository methods may remain storage primitives, but product-level write services must own the transaction. For MVP, add a small boundary such as `WaymarkMutationService` or repository decorators for `mark_instances`, `mark_instance_details`, `memories`, `media_assets`, `trail_days`, `week_plans`, and `week_plan_items`.

## 5. Outbox Transaction Contract

Idempotency key format:

```text
${vaultId}:${deviceId}:${entityType}:${entityId}:${operation}:${localRevision}
```

For retryable create flows with a domain generation key, include it in payload and remote constraints:

```text
${vaultId}:${deviceId}:mark_instance:${generationKey}:create
```

Rules:

- Same local mutation retried twice must reuse the same `idempotency_key`.
- `sync_outbox` records must not be drained immediately after every write.
- Allowed outbox drain triggers are EOD sync, explicit Upload/Sync button, or future user-approved scheduled batch only.
- Repository methods and UI save handlers must never call the Turso adapter directly.
- Syncing the same outbox row twice must be remote-idempotent.
- Remote adapter must upsert by stable `entity_id` first, then verify generation/content key constraints.
- Delete is a tombstone mutation. Do not hard-delete remote rows in MVP.
- Outbox payload is the local canonical snapshot after mutation, not a UI view-model.
- Encryption is required before production cloud sync for sensitive payloads; MVP fake adapter may use plaintext JSON in tests.

## 6. Mark Details Storage Decision

Primer is Mark Details. It is not a separate domain concept.

Decision:

- Weekly Planning may prepare detail text on `week_plan_items`, but the materialized Mark owns the runtime detail snapshot.
- Materialized Planned Mark owns detail fields through `mark_instance_details`.
- Mark Detail screen reads one selector/view-model and must not merge week plan item, mark, metadata settings, and UI state directly.

Minimal schema for Phase 1:

```sql
CREATE TABLE IF NOT EXISTS mark_instance_details (
  mark_instance_id TEXT PRIMARY KEY NOT NULL,
  primer_snapshot TEXT,
  pre_action_comment TEXT,
  post_action_feedback TEXT,
  user_edited_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(mark_instance_id) REFERENCES mark_instances(id)
);
```

Rules:

- When weekly planning materializes a mark, copy prepared Mark Details text into `mark_instance_details.primer_snapshot`.
- Regenerating weekly plan may update `week_plan_items`, but must not overwrite `mark_instance_details` when the mark exists.
- If mark is finalized, user-edited, or has `mark_instance_details.user_edited_at`, materialization cannot overwrite title, description, primer snapshot, pre-action comment, or post-action feedback.
- Pre-action comment and post-action feedback are canonical detail fields, not UI state and not loose app setting metadata.
- MVP Turso sync can defer `mark_instance_details` cloud payload until after local selectors and tests are stable. If deferred, mark detail rows remain local canonical with a clear `details_local_only` status in the implementation notes.

## 7. Media Ownership Contract

- `media_assets` is the canonical media state.
- Drive file ID is metadata.
- Drive manifests are audit artifacts, not Memory or Mark truth.
- Memory/Mark rows survive if media upload fails.
- Local/gallery cleanup is allowed only after `upload_status = 'verified'`, Drive metadata is present, and user permission is recorded.
- UI renders media only through `listWaymarkMediaForOwner`, or its successor selector, which verifies local file existence before returning poster/src.
- Missing local file with Drive metadata returns `needs_download`, not a ghost poster.

Important correction from current flow: `createJournalMemoryCapture` currently soft-deletes memory if media saving fails after memory creation. Phase 1 should change this product contract so the memory remains and media status records the failure when possible.

## 8. Turso MVP Sync Flow

No real Turso sync in Phase 0/1. Implement fake adapter tests first.

Local write flow:

1. Local user action writes SQLite and outbox in one transaction.
2. UI renders from local SQLite immediately.
3. Outbox remains pending.
4. No Turso network request is made from the write path.

Batch upload flow:

1. EOD sync or explicit Upload/Sync button starts the sync service.
2. Media upload to Drive runs first for pending media, updating `media_assets` locally.
3. Sync service selects pending outbox rows for the current `vault_id`.
4. Adapter pushes one mutation at a time with `idempotency_key`.
5. Remote fake/Turso upserts by `entity_type + entity_id`; duplicate `idempotency_key` returns prior accepted result.
6. On accepted mutation, local outbox row becomes `synced`.
7. On retryable failure, local outbox row becomes `failed` with retry count; canonical row remains unchanged.
8. On conflict, local outbox row becomes `conflict`; UI must not silently overwrite.
9. Restore pulls accepted records before seed. Seed can upsert static config but must not duplicate built-in map records.

Manual Pull flow for typed Turso planning edits:

1. A Turso canonical record is edited with required `vault_id`, `entity_type`, `entity_id`, `remote_revision`, and `updated_at` or equivalent change-log metadata.
2. The user explicitly invokes Manual Pull; foreground polling and automatic pull are forbidden.
3. Intake captures a revision ceiling and fetches remote changes newer than the local cursor up to that ceiling.
4. Each change is validated against the Vault, entity schema, tombstones, and local dirty/conflict state.
5. Accepted remote change is applied to local SQLite in a transaction.
6. If local row has unsynced local changes, intake writes a conflict state instead of silently overwriting.
7. UI refreshes from local SQLite selectors only.
8. Raw remote edits missing revision/change metadata are rejected or surfaced as conflicts.

Weekly timetable remote edit rules:

- Remote edits to `week_plans` and `week_plan_items` may update the persisted weekly timetable.
- If a remote edit changes a `week_plan_item` that already materialized a `mark_instances` row, Waymark must not overwrite `mark_instance_details` or user edits on the materialized mark.
- A remote `week_plan_item` tombstone hides/removes the weekly item locally, but any already completed materialized mark remains canonical unless a separate mark tombstone is accepted.
- Materialization after remote intake must reuse deterministic import/generation keys, so pulling the same remote weekly item twice does not duplicate marks.

Signal remote edit rules are superseded by the planning contract:

- Remote edits to `signals` may update planning-owned `target_type`, `target_id`, `scheduled_at`, `is_enabled`, and tombstone fields only. Runtime status and delivery timestamps remain local-owned.
- Remote signal edits must reference an existing local/remote target by `target_type + target_id`; missing targets become conflict or pending dependency, not a ghost notification.
- Remote edits cannot directly fire notifications. They update local SQLite, then the local SignalEngine decides ring/dismiss/resolve behavior.
- If local signal has unsynced runtime changes, remote edit becomes conflict instead of overwriting.
- Signal tombstones cancel/hide the signal locally, but do not mutate the target Mark, PackCheck, or TrailDay.

MVP remote record contract:

- `vault_id`
- `entity_type`
- `entity_id`
- `remote_revision`
- `last_idempotency_key`
- `payload_json` or ciphertext
- `deleted_at`
- `updated_at`

MVP inbound cursor contract:

- `vault_id`
- `client_id` or `device_id`
- `last_remote_revision_seen`
- `last_successful_pull_at`
- `status`
- `last_error`

## 9. Acceptance Tests To Add Before Real Turso

Add these exact test names before any real Turso adapter is wired into runtime:

1. `ssot_outbox_complete_planned_mark_retry_creates_one_completed_mark`
2. `ssot_media_create_memory_photo_upload_fail_keeps_memory_and_marks_media_failed`
3. `ssot_drive_upload_retry_reuses_existing_drive_file_for_media_asset`
4. `ssot_sync_same_outbox_twice_does_not_duplicate_remote_record`
5. `ssot_restore_before_seed_does_not_duplicate_paths_expeditions_milestones`
6. `ssot_weekly_regenerate_preserves_materialized_mark_primer_and_user_edits`
7. `ssot_journal_missing_local_media_does_not_render_ghost_poster`
8. `ssot_delete_mark_writes_tombstone_without_remote_hard_delete`
9. `ssot_weekly_timetable_upload_pushes_week_plan_and_items_once`
10. `ssot_turso_remote_week_plan_item_edit_applies_to_local_sqlite_before_ui`
11. `ssot_turso_remote_week_plan_item_edit_does_not_overwrite_materialized_mark_details`
12. `ssot_turso_remote_edit_without_revision_is_rejected_or_conflict`
13. `ssot_remote_week_plan_item_tombstone_hides_item_without_hard_deleting_completed_mark`
14. `ssot_turso_remote_signal_edit_updates_local_sqlite_before_signal_engine`
15. `ssot_turso_remote_signal_edit_with_missing_target_becomes_conflict`
16. `ssot_remote_signal_tombstone_cancels_signal_without_mutating_target`

Recommended locations:

- `tests/ssot-outbox-mvp.test.ts`
- `tests/media-sync-hardening.test.ts`
- `tests/weekly-primer-ssot.test.ts`
- `tests/restore-before-seed.test.ts`
- `tests/turso-weekly-live-intake.test.ts`
- `tests/turso-signal-live-intake.test.ts`

## 10. Phase 0 Implementation Steps

Phase 0 is audit/contract only:

1. Keep this document as the Phase 0 SSOT implementation contract.
2. Confirm MVP entity scope: `mark_instances`, `mark_instance_details`, `memories`, `media_assets`, `trail_days`, `week_plans`, `week_plan_items`, `signals`.
3. Confirm Primer/Mark Detail storage choice: linked detail table vs columns.
4. Confirm whether `trail_days` remains DailyClosure storage for the next release.
5. Create empty/failing test skeletons with the exact names above.
6. Do not create Turso network code.

## 11. Phase 1 Implementation Steps

Phase 1 is local-only sync infrastructure:

1. Add `sync_outbox` migration and schema verification.
2. Add fake remote sync adapter for tests only.
3. Add local mutation service/decorator for MVP entities.
4. Ensure each MVP canonical write creates outbox in the same transaction.
5. Add tombstone handling for mark and memory delete.
6. Add media hardening indexes/status tests.
7. Add `mark_instance_details` migration for Mark Details.
8. Add manual/EOD-only outbound sync service entrypoints; do not wire automatic realtime outbound drains.
9. Make acceptance tests pass against fake adapter.

## 12. Phase 2-A Weekly, Signals + Manual Pull Steps

Phase 2-A expands sync without making Turso the UI source of truth:

1. Extend `sync_outbox.entity_type` to include `week_plan`, `week_plan_item`, `mark_instance_detail`, and `signal`.
2. Wrap weekly timetable import in one product-level mutation boundary that writes `week_plans`, `week_plan_items`, materialized `mark_instances`, `mark_instance_details`, and outbox rows atomically.
3. Add fake remote adapter support for weekly timetable, signal payloads, and remote revisions.
4. Add inbound cursor storage for remote Turso changes.
5. Add Manual Pull intake service for `week_plans`, `week_plan_items`, and `signals` only.
6. Add conflict behavior for remote edits racing with local dirty rows.
7. Refresh UI only after remote changes are applied to local SQLite.
8. Keep outbound upload limited to EOD/manual Upload button.

## 13. Full Turso Projection Steps

Full projection means every canonical table has an outbound Turso representation. It does not mean every table is remotely editable.

1. Add table-by-table remote payload mappers for every `WAYMARK_TABLES` canonical table.
2. Add remote schema migrations for all canonical tables or a typed `remote_records` projection with entity-specific validators.
3. Add idempotent upsert rules for each table's stable identity and unique constraints.
4. Add tombstone rules for every user-owned table.
5. Add restore ordering so parent/config tables restore before child/history tables.
6. Add encryption rules for sensitive payloads before production cloud sync.
7. Keep only `week_plans`, `week_plan_items`, and `signals` as remote-editable until explicit product rules promote more tables.

## 14. Explicitly Not Implementing Yet

- No production Turso client.
- No realtime outbound sync and no immediate outbox drain after writes.
- No UI subscribing directly to Turso rows.
- No full entity sync implementation in Phase 2-A, even though every canonical table now has a projection requirement.
- No sync for `pack_check_instances` or `workout_session_instances` in MVP.
- No sync for `paths`, `expeditions`, `milestones`, or `reflection_entries` in MVP.
- No `planned_marks` table.
- No `actual_marks` table.
- No `journal_entries` table.
- No hard remote deletes.
- No Drive-as-domain-truth restore.
- No local/gallery cleanup automation.
- No UI screen directly merging DB, Drive, and local files.
- No overwrite of materialized primer snapshots or Mark Detail user edits during weekly regeneration.
