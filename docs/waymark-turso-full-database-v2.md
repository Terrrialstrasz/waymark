# ADR: Turso Full-DB v2 in-place cutover

- Status: accepted and in development
- Database: existing linked Waymark Turso database
- Replacement database/branch: forbidden
- Structured-data authority: Turso
- Local SQLite role: offline cache plus pending EOD outbox

## Decision

Waymark replaces the generic projection/partial typed-sync topology with one typed Full-DB topology in the existing Turso database. All current SQLite tables have an explicit Turso table contract. `paths`, `expeditions`, and `mark_instances` retain their current remote rows as protected migration baselines; all remaining tables are added or seeded in place.

## Control plane

Full-DB v2 adds schema metadata, migration manifests, mutation idempotency, a global revision change log, snapshot metadata and device cursors. Activation is gated by migration verification. Legacy generic projection tables may remain temporarily for rollback evidence but are no longer the v2 read/write path.

## Cutover gates

1. Contract covers every local SQLite table.
2. Dry-run source inventory and remote compatibility pass.
3. Protected-table before/after manifests match.
4. Every non-protected source row is inserted or already present by stable key.
5. Full snapshot restores a clean local cache.
6. Incremental pull advances one global revision cursor without gaps.
7. Close Trail drains allowed typed mutations through EOD idempotency.
8. Legacy hierarchy pull and generic activity upload controls are disabled.

## Rollback

Before apply, the migration stores a JSON backup of the pre-existing remote schemas and Vault rows under `.tmp/full-db-migrations/<migration-id>/remote-before.json`. A failed migration remains marked `failed` and Full-DB is not activated. Rollback restores from that artifact through a separately reviewed operation; the migration command does not automatically delete or overwrite live tables.
