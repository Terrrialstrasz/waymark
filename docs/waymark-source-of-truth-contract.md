# Waymark Turso Full-DB v2 Source-of-Truth Contract

## Governing sentence

The existing Waymark Turso database is the sole structured-data source of truth for the Vault. Local SQLite is a disposable offline cache/working copy. Google Drive stores media blobs; Turso stores every `media_assets` metadata row.

This decision supersedes the former projection model. There is no second Turso database, no new branch for the cutover, and no canonical Waymark table that remains local-only.

## Existing live baseline

The cutover uses the Turso database already linked to the Waymark Vault.

These three existing remote tables are protected during migration:

- `paths`
- `expeditions`
- `mark_instances`

Their current Turso rows are the baseline. Export migration must not insert, update, delete, tombstone, recreate, or replace them. Before and after migration, row counts and deterministic checksums must match.

Every other local SQLite table is migrated into that same database. Migration uses create-if-missing plus insert-missing semantics; it never performs a blanket upsert over existing Turso rows.

## Writer ownership

| Data family | Authoritative writer | Waymark behavior |
|---|---|---|
| Paths | Workspace/admin | Pull and cache; never push from Waymark. |
| Expedition structure | Workspace/admin | Pull and cache. Waymark may update only `status`; it cannot create or restructure Expeditions. |
| Marks | Turso baseline plus Waymark-authorized creation | Pull and cache. Waymark may create Marks and subsequently update only `status`. |
| Milestone structure | Workspace/admin | Pull and cache. Waymark may update only `status`; it cannot create or restructure Milestones. |
| Catalog/templates | Workspace scripts publishing directly to Turso | Pull and cache; mobile never creates, repairs, seeds, or publishes definitions. |
| Week plans/items | Workspace scripts publishing directly to Turso | Pull and cache; Waymark may materialize Marks but never authors or repairs plan rows. |
| Memories and Backlog | Waymark through EOD mutation log | Waymark may create and maintain these user-authored entities. |
| Media, reflections, signals, pack/workout execution support | Turso or device-operational support | Not independently created as canonical domain entities by the Waymark app. |
| Schema, migration, idempotency, change log, snapshot and cursor control | System | Never edited through product UI. |

Field ownership is enforced in `tursoFullDatabaseContract.ts`. A writer designation is not permission to mutate every column.

## Local cache contract

Screens render from local SQLite and do not query Turso directly. That makes SQLite the operational read cache, not an independent truth owner.

First synchronization:

```text
Verify Full-DB schema is active
-> capture global change ceiling
-> pull every contracted Turso table in dependency order
-> upsert remote rows into local SQLite in one protected write
-> persist the global revision cursor
-> render from SQLite
```

Subsequent synchronization:

```text
Read local global revision cursor
-> capture a new ceiling
-> fetch ordered change-log pages through that ceiling
-> apply accepted snapshots/tombstones to SQLite
-> advance cursor only after each transaction commits
```

If Full-DB metadata is absent or not `active`, Waymark refuses to treat a partial remote database as cache authority.

## Outbound mutation contract

Waymark writes the domain row and durable `sync_outbox` entry in a local transaction. It does not push on each item edit.

The production drain point is EOD, normally after Close Trail:

```text
Close Trail commits locally
-> load pending outbox mutations
-> validate table writer, operation and field allowlist
-> apply mutation to the typed Turso table
-> record idempotency key and global change revision
-> mark the local outbox row synced
```

Workspace-owned rows are rejected from the Waymark outbox. Unauthorized mutations become explicit conflicts; they are not silently redirected into a generic projection table.

## Media contract

Turso owns structured media metadata. Google Drive owns binary objects. A `media_assets` row must truthfully reflect pending, uploaded, failed or missing blob state. Pulling Full-DB can restore media metadata without claiming a missing local or Drive blob exists.

## Migration safety

The in-place migration must:

1. Confirm the export Vault ID and require the same explicit Vault ID for apply.
2. Capture a local backup of every pre-existing remote table before schema/data writes.
3. Create control tables idempotently in the existing Turso database.
4. Refuse apply if an existing remote table has required columns the source mapping cannot satisfy.
5. Preserve the three protected baseline tables byte-for-byte by deterministic manifest checksum.
6. Seed every other table using stable primary keys and `INSERT OR IGNORE`.
7. Record per-table source count, inserted count, skipped count, checksum and status.
8. Install typed table change-log triggers only after initial migration rows are loaded.
9. Activate Full-DB only after all manifests verify.

The migration command is dry-run by default:

```text
npm run turso:migrate-full-db -- --latest-export
```

Apply requires an explicit Vault confirmation:

```text
npm run turso:migrate-full-db -- --latest-export --apply --confirm-vault <vault-id>
```

## Seed and restore

Workspace scripts may define and publish catalog and planning data directly to Turso. They are one-run publisher tools and are not linked into the mobile bundle. The mobile runtime has no catalog or planning seed/bootstrap path.

On a fresh install, Waymark creates only the minimum local provenance needed to connect, then restores the Turso Full-DB snapshot before runtime materialization. Reinstall recovery is limited only by EOD mutations that were never pushed and media blobs that were never uploaded.

At runtime, the only domain entity creates accepted from Waymark are `memories`, `mark_instances`, and `backlog_items`. The only workspace-owned entity mutations accepted from Waymark are `status` changes on `expeditions`, `milestones`, and `mark_instances`.

## Semantic identity

Human-readable names and titles are not unique keys. Duplicate protection uses Vault ID, stable row primary keys, mutation idempotency keys, revisions and generation lineage.

Waymark Main and Waymark Lite are clients of the same Turso Vault. Lite may filter features and views but must not fork truth.
