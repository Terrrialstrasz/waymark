# Waymark Domain Model

This package is the DB preparation layer for Waymark. It defines the canonical vocabulary, lifecycle enums, entity boundaries, repository contracts, and engine/service contracts before any concrete database adapter is introduced.

## Canonical Naming

- `MarkInstance` is the only concrete Mark entity.
- Planned Marks are `MarkInstance` records with planned origins such as `weekly_planned`, `template_generated`, `manual_plan`, or `backlog_converted`.
- Quick Marks are `MarkInstance` records with `origin = quick_capture`.
- `MarkInstance.trailDayId` is required. If something is not attached to a `TrailDay`, it is not a concrete `MarkInstance` yet.
- Substitutions and reschedules stay inside the `MarkInstance` model through origin, status, and linking fields.
- Close the Trail is stored on `TrailDay`, not as a separate top-level entity.

## Package Layout

- `core.ts`: shared primitives for ids, timestamps, pagination, transactions, and local-first metadata.
- `enums.ts`: lifecycle enums and other canonical state vocabularies.
- `entities.ts`: canonical entities, child records, ERD relationship constants, and ownership boundaries.
- `repositories.ts`: persistence-facing interfaces only. No business rules belong here.
- `services.ts`: engine and service signatures. UI should call these contracts instead of mutating records directly.

## Key Relationship Rules

- `Path -> Expedition -> Milestone -> MarkInstance` is preserved.
- `MarkTemplate` generates `MarkInstance`; templates are never completed.
- `PackCheckTemplate` generates `PackCheckInstance`; completion is always instance-scoped.
- `PackCheckInstance` snapshots its own title and description so historical occurrences do not drift when templates change.
- `PackCheckInstance` may appear on one `TrailDay` while protecting a future `MarkInstance`.
- `Signal` targets exactly one `MarkInstance` or `PackCheckInstance`.
- Dependencies are concrete and instance-level only. Do not depend directly on `Expedition`, `Milestone`, or `MarkTemplate`, and do not use `time_window_open` as a dependency type in MVP.
- `WorkoutSessionInstance` is a specialized execution body under `MarkInstance`.
- Strength remains a minimal execution model under `MarkInstance`, not a second planning system.

## Local-First Rules

- Domain entities contain business-facing fields only.
- Every persisted record carries `createdAt` and `updatedAt`.
- Optional sync metadata lives in `LocalRecordMetadata` so repositories can stay local-first without hard-coding a sync backend.
- The model avoids event-sourcing tables for MVP; lifecycle history is represented through current-state fields and linked records.
- The later SQLite phase will add DB row types and mappers for persistence-only concerns such as `deleted_at`, `sync_status`, `local_revision`, epoch timestamps, and local-date keys.

## Migration Note

The existing UI still contains older `PlannedMark`-named mock shapes. Those are presentation artifacts only. New storage, repositories, engines, and future screen integrations should bind to `MarkInstance` and the types in this package.
