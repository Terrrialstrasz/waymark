# Waymark Local DB Foundation

This package scaffolds the SQLite persistence layer for Waymark without leaking storage-specific concerns into the domain package.

## Why SQLite

- Waymark is local-first, so it needs durable relational storage on-device.
- SQLite fits Expo well and supports structured queries, migrations, and export/backup flows.
- Repositories can sit on top of SQLite without forcing sync architecture too early.

Expo SQLite reference used for this scaffold:
- https://docs.expo.dev/versions/latest/sdk/sqlite/

## Persistence Model Decisions

- `mark_instances` is the canonical concrete Mark table. There are no separate `planned_mark_instances`, `quick_marks`, or `mark_proofs` tables.
- Mark proof lives on `mark_instances` through fields such as `completed_at`, `proof_note`, and `completion_summary`, with optional attachments in `media_assets`.
- `trail_days` stores Close the Trail status and summary fields directly.
- `signals` uses polymorphic targeting through `target_type + target_id`; SQLite does not enforce this FK, so repository or engine validation must.
- `media_assets` uses polymorphic ownership through `owner_type + owner_id`; repository validation must protect integrity here as well.
- `pack_check_instances` snapshots `title` and `description` so history does not drift when templates change later.
- Strength remains a minimal execution model under `MarkInstance`, not a separate planning system.

## Layer Split

- `rows.ts`: persistence-friendly row shapes with snake_case columns and epoch timestamps.
- `mappers.ts`: conversion boundaries between DB rows and domain entities.
- `migrations/`: forward-only SQL migrations plus a runtime manifest and runner.
- `adapters/`: repository adapter skeletons that match domain repository contracts.
- `sqlite.ts`: database open and migration bootstrap.
- `schemaVerification.ts`: dev-facing schema verification for required tables, columns, and key indexes.

## Notes

- Domain entities stay business-friendly.
- DB rows add persistence-only concerns such as `deleted_at`, `sync_status`, `local_revision`, and epoch-millisecond timestamps.
- Raw `.sql` files are kept for review and version control. The runtime manifest mirrors them as embedded strings because Metro does not execute raw SQL imports without an extra loader step.
- `AppRoot` now performs a dev-only, non-blocking bootstrap + schema smoke check so missing tables or columns surface early while the app still renders.
- Repository adapters are intentionally skeletal in this step. The contracts compile and the schema is in place, but query implementations remain a separate pass.
