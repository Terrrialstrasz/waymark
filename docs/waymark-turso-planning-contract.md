# Waymark Turso Planning Contract

Status: Phase 0 contract locked. Production typed tables, triggers, and runtime pull are not implemented by this document.

## 1. Architecture Boundary

Waymark uses the following ownership boundary:

```text
Turso typed planning tables = remote planning management authority
Local SQLite               = execution working state and history
Manual Pull                = explicit planning application boundary
```

The first physical-table scope is:

1. `week_plans`
2. `week_plan_items`
3. `signals`
4. `paths`
5. `expeditions`
6. `milestones`

Primer/Mark Details, resources, media, memories, reflections, trail history, workout logs, pack-check execution, and local sync infrastructure are outside this physical planning scope. Existing generic remote records may continue to carry backup/restore projections for other canonical entities.

There is no automatic planning pull, draft/publish workflow, editing state, admin replan UI, or physical-table migration for all canonical tables.

## 2. Turso Studio Contract

Turso Studio is the regular replan tool for the selected planning tables. The supported operating assumption is:

```text
one planning administrator
one Turso Studio editing session at a time
no concurrent edits to the same row in multiple tabs
Studio-to-Studio conflicts use trusted last-write-wins behavior
```

Studio may edit only entity-specific planning fields. It must not edit stable IDs, `vault_id`, revision fields, generation/import keys, sync metadata, Mark runtime state, Signal runtime state, or execution history. Normal Studio use must soft-delete through `deleted_at`; privileged purge remains a separate operational path.

Waymark planning pushes, if enabled later, must provide an expected entity revision. Studio edits are exempt from that precondition only because of the explicit single-writer assumption.

## 3. Version And Snapshot Model

The remote planning store uses three separate identities:

| Identity | Scope | Purpose |
|---|---|---|
| `change_sequence` | global per Vault planning stream | pull cursor and pull ceiling |
| `entity_revision` | one planning row | row version and client conflict precondition |
| `mutation_id` | client/API mutation | retry idempotency |

Each accepted physical planning-table change appends a full post-change entity snapshot containing:

```text
change_sequence
vault_id
entity_type
entity_id
entity_revision
operation
payload_snapshot
schema_version
changed_at
```

A tombstone event retains the complete row snapshot and `deleted_at`. Full snapshots are required so a client can reconstruct state at its captured ceiling without reading a newer physical row.

## 4. Manual Pull Contract

Planning changes reach a device only after explicit user action.

1. Capture `pull_ceiling = MAX(change_sequence)` at pull start.
2. Fetch events where `cursor < change_sequence <= pull_ceiling`.
3. Coalesce by `vault_id + entity_type + entity_id`.
4. Keep the final event for each entity.
5. Use that event's `payload_snapshot`; do not read the current physical row for payload.
6. Preflight the complete projected batch.
7. Sort parent entities before children.
8. Apply planning rows and allowed Mark reconciliation in one local SQLite transaction.
9. Persist applied entity revisions and advance the cursor to `pull_ceiling` in that transaction.
10. Commit before any notification side effect.
11. Reconcile Signal notifications after commit.
12. Persist notification retry state if a side effect fails; do not roll back committed planning data.

Planning validation failure rolls back the complete pull and does not advance the cursor. Preflight validates schema compatibility, immutable fields, enums, same-Vault foreign keys, parent state, tombstones, Signal targets, Mark execution protection, generation identity, and duplicate active materialization.

Coalescing validates final state rather than replaying invalid intermediate Studio edits. A later intentional restore may supersede a tombstone before the ceiling. A stale update may not implicitly resurrect a tombstoned row.

## 5. Exact Local Schema Audit

The typed remote schema and field allowlists must follow current local vocabulary.

| Entity | Existing planning fields | Not currently present |
|---|---|---|
| `week_plans` | `week_start_date`, `week_end_date`, `status`, `summary`, `note`, `deleted_at` | name, label, priority |
| `week_plan_items` | `status`, `local_date`, `start_time`, `end_time`, `title`, `description`, `note`, `sort_order`, `order_index`, current foreign keys, `deleted_at` | priority, duration, enabled |
| `signals` | `target_type`, `target_id`, `scheduled_at`, runtime status/timestamps, `deleted_at` | `is_enabled`, recurrence, display content, notification system ID |
| `paths` | name/title/description/status/sort/active and presentation metadata | remote revision metadata |
| `expeditions` | parent Path, title/purpose/description/status/order/date fields | remote revision metadata |
| `milestones` | parent Expedition, title/description/status/order/date fields | remote revision metadata |

Duration changes for a weekly item use `start_time` and `end_time`. Priority is a separate future domain migration. The first planning contract does not invent either column.

## 6. Field Ownership

### Weekly planning

Turso owns the planning fields of activated physical `week_plans` and `week_plan_items` rows. Local SQLite remains the UI working copy after Manual Pull. After cutover, generic bootstrap/upload and weekly regeneration must not overwrite those physical planning rows or locally applied remote-owned fields.

`week_start_date` is immutable during normal Studio editing. A different week requires a different stable `week_plan` row.

### Signal

Before the Signal physical-table phase, add a planning field equivalent to `is_enabled`.

Turso owns:

```text
target_type
target_id
scheduled_at
is_enabled
```

Local Signal Engine owns runtime status, ringing, snooze, resolve, dismiss, expire, cancellation delivery state, and OS notification identifiers. Pull must preserve those runtime fields.

### Strategic map

`paths`, `expeditions`, and `milestones` start with update/tombstone. Remote insert opens only after stable ID defaults and same-Vault parent validation are proven.

## 7. Remote Create

`week_plan_items` must support Studio insert in its physical-table phase. A remote-created item requires a database-generated or approved-tool-generated stable ID, `vault_id`, valid parent plan, valid date and status, initial entity revision, and an automatic full-snapshot change event. Title is never identity.

`week_plans` initially supports update/tombstone of an existing week. Signals and strategic-map inserts are later steps after their dependency contracts are implemented.

## 8. Mark Identity And Reconciliation

Do not add `mark_instances.source_week_plan_item_id` in the first implementation. Reuse:

```text
week_plan_items.created_mark_instance_id
week_plan_items.deterministic_import_key
mark_instances.generation_key
```

Current audit result: imported weekly item identity is derived from a deterministic import key that includes the original slot date/time, and Mark generation identity is derived from that key. Replanning must never recalculate or edit those keys. Existing imported items may retain their original immutable keys even after their schedule changes.

New Studio-created items need a generation identity derived from the stable `week_plan_item.id`, not from mutable date/time. Import/regeneration after physical cutover must preserve remote-owned planning fields and the existing Mark link.

At most one Mark may be linked/materialized for one weekly item. Pull retries and full resync must update the linked Mark instead of creating another one.

Current `mark_instances` has no `started_at` column. Before Phase 2 implementation, choose and migrate an explicit started marker or formally define `status = 'active'` as started. Until that migration decision is implemented, the conservative protected statuses are:

```text
active
completed
skipped
rescheduled
substituted
cancelled
```

For an unstarted Mark, a schedule change updates the existing Mark, resolves the new Trail Day, moves `trail_day_id`, updates scheduled timestamps and due date, and recomputes old/new Trail Day counters in the same transaction. It does not overwrite Mark Details. A requested change to a protected Mark fails the complete Manual Pull.

Tombstoning an item may tombstone/cancel only an unstarted materialized Mark. It must not rewrite or delete execution history.

## 9. Echo And Compatibility Rules

Local writes performed by Manual Pull use `write_source = remote_pull` or an equivalent transaction context. They do not create local outbox mutations and do not increment a user-mutation revision. They record the last applied remote entity revision.

Each entity type has an authority mode. Once activated as `physical`, its generic remote record is compatibility/rollback data and cannot overwrite the physical row. Unknown snapshot fields must be preserved or rejected by schema-version preflight; an older client must never erase fields introduced by a newer client.

## 10. Delivery Phases

| Phase | Scope |
|---|---|
| Phase 0 | Contract, schema audit, field ownership, trigger design, acceptance skeleton |
| Phase 1 | `week_plans` update/tombstone and Manual Pull |
| Phase 2 | `week_plan_items` update/insert/tombstone and unstarted Mark reconciliation |
| Phase 3 | `signals`, `is_enabled`, target validation, post-commit notification retry |
| Phase 4 | `paths`, then `expeditions`, then `milestones` |
| Phase 5 | Per-entity generic/physical comparison and cutover decision |

Phase 0 does not create production remote schema, triggers, migrations, or runtime pull code.

## 11. Acceptance Test Skeleton

The following exact behavior names must exist before production typed-table work:

1. `turso_planning_manual_pull_uses_revision_ceiling`
2. `turso_planning_pull_uses_snapshot_at_ceiling_not_current_row`
3. `turso_planning_coalesces_to_last_snapshot_per_entity`
4. `turso_planning_error_rolls_back_batch_and_cursor`
5. `turso_planning_pull_does_not_enqueue_echo`
6. `turso_week_plan_item_remote_insert_uses_stable_id`
7. `turso_week_plan_item_replan_keeps_generation_identity`
8. `turso_week_plan_item_replan_updates_existing_unstarted_mark`
9. `turso_week_plan_item_replan_recomputes_old_and_new_trail_days`
10. `turso_week_plan_item_replan_rejects_started_mark`
11. `turso_week_plan_item_tombstone_does_not_rewrite_finalized_mark`
12. `turso_signal_planning_pull_preserves_runtime_fields`
13. `turso_signal_notification_reconciles_only_after_commit`
14. `turso_signal_notification_failure_records_durable_retry`
15. `turso_planning_full_resync_does_not_duplicate_entities_or_marks`
16. `turso_planning_client_preserves_unknown_snapshot_fields`
