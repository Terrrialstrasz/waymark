export type WaymarkFullDbWriter = "workspace" | "waymark_eod" | "workspace_and_waymark_eod" | "system" | "none";

export type WaymarkFullDbSource =
  | "remote_current"
  | "workspace_publish"
  | "local_export_seed"
  | "device_operational";

export type WaymarkFullDbScope = "vault" | "device";

export type WaymarkFullDbMigrationMode =
  | "preserve_remote"
  | "seed_missing_rows"
  | "archive_device_state";

export type WaymarkFullDbBusinessIdentity = {
  /** Stable logical identity enforced by a local UNIQUE constraint/index. */
  name: string;
  columns: readonly string[];
  /** The identity does not apply when any of these values is NULL. */
  requireNonNull?: readonly string[];
  /** Mirrors active-row partial UNIQUE indexes such as `deleted_at IS NULL`. */
  whereNull?: readonly string[];
};

export type WaymarkFullDbTableSpec = {
  tableName: string;
  entityType: string;
  source: WaymarkFullDbSource;
  writer: WaymarkFullDbWriter;
  scope: WaymarkFullDbScope;
  migrationMode: WaymarkFullDbMigrationMode;
  wave: number;
  protectedCanonical?: boolean;
  mobileCreateAllowed?: boolean;
  mobileDeleteAllowed?: boolean;
  mobileMutationFields?: readonly string[];
  businessIdentities?: readonly WaymarkFullDbBusinessIdentity[];
  notes: string;
};

/**
 * These columns describe the state of a device's local SQLite cache. They are
 * never authoritative in Turso and must be regenerated when remote rows are
 * materialized locally.
 */
export const WAYMARK_TURSO_FULL_DB_LOCAL_ONLY_COLUMNS = ["sync_status", "local_revision"] as const;

const localOnlyColumnNames = new Set<string>(WAYMARK_TURSO_FULL_DB_LOCAL_ONLY_COLUMNS);

export function isWaymarkFullDbLocalOnlyColumn(columnName: string): boolean {
  return localOnlyColumnNames.has(columnName);
}

const table = (spec: WaymarkFullDbTableSpec): WaymarkFullDbTableSpec => spec;

/**
 * Full-DB target contract for the existing Waymark Turso database.
 *
 * `protectedCanonical` means an export migration may not insert, update, delete,
 * or tombstone that table. Those rows already live in Turso and are the baseline
 * against which the migration verifies checksums.
 */
export const WAYMARK_TURSO_FULL_DB_TABLES: readonly WaymarkFullDbTableSpec[] = [
  table({ tableName: "schema_migrations", entityType: "schema_migration", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 0, notes: "Local schema history is retained per database instance for diagnostics." }),
  table({ tableName: "vaults", entityType: "vault", source: "remote_current", writer: "system", scope: "vault", migrationMode: "preserve_remote", wave: 1, protectedCanonical: true, notes: "The Vault envelope is canonical in Turso." }),
  table({ tableName: "user_profiles", entityType: "user_profile", source: "remote_current", writer: "workspace", scope: "vault", migrationMode: "preserve_remote", wave: 1, protectedCanonical: true, notes: "User profile identity is canonical in Turso." }),
  table({ tableName: "devices", entityType: "device", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 1, notes: "Device identity and last-seen state are namespaced by device." }),
  table({ tableName: "app_db_metadata", entityType: "app_db_metadata", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 1, notes: "Database provenance is mirrored for restore and audit." }),

  table({ tableName: "paths", entityType: "path", source: "remote_current", writer: "workspace", scope: "vault", migrationMode: "preserve_remote", wave: 2, protectedCanonical: true, notes: "Existing Turso paths are source of truth and must never be overwritten from local export." }),
  table({ tableName: "expeditions", entityType: "expedition", source: "remote_current", writer: "workspace_and_waymark_eod", scope: "vault", migrationMode: "preserve_remote", wave: 2, protectedCanonical: true, mobileMutationFields: ["status", "started_at", "completed_at"], notes: "Turso owns expedition identity and structure; Waymark may change only progress state." }),
  table({ tableName: "milestones", entityType: "milestone", source: "remote_current", writer: "workspace_and_waymark_eod", scope: "vault", migrationMode: "preserve_remote", wave: 2, protectedCanonical: true, mobileMutationFields: ["status", "completed_at"], notes: "Turso owns milestone identity and structure; Waymark may change only progress state." }),

  table({ tableName: "mark_templates", entityType: "mark_template", source: "remote_current", writer: "workspace", scope: "vault", migrationMode: "preserve_remote", wave: 3, protectedCanonical: true, notes: "Workspace scripts publish catalog definitions to Turso; Waymark only pulls them." }),
  table({ tableName: "pack_check_templates", entityType: "pack_check_template", source: "remote_current", writer: "workspace", scope: "vault", migrationMode: "preserve_remote", wave: 3, protectedCanonical: true, notes: "Workspace scripts publish catalog definitions to Turso; Waymark only pulls them." }),
  table({ tableName: "pack_check_item_templates", entityType: "pack_check_item_template", source: "remote_current", writer: "workspace", scope: "vault", migrationMode: "preserve_remote", wave: 3, protectedCanonical: true, notes: "Workspace scripts publish catalog definitions to Turso; Waymark only pulls them." }),
  table({ tableName: "mark_pack_check_rules", entityType: "mark_pack_check_rule", source: "remote_current", writer: "workspace", scope: "vault", migrationMode: "preserve_remote", wave: 3, protectedCanonical: true, notes: "Workspace scripts publish catalog relations to Turso; Waymark only pulls them." }),
  table({ tableName: "exercise_definitions", entityType: "exercise_definition", source: "remote_current", writer: "workspace", scope: "vault", migrationMode: "preserve_remote", wave: 3, protectedCanonical: true, notes: "Workspace scripts publish catalog definitions to Turso; Waymark only pulls them." }),
  table({ tableName: "workout_routine_templates", entityType: "workout_routine_template", source: "remote_current", writer: "workspace", scope: "vault", migrationMode: "preserve_remote", wave: 3, protectedCanonical: true, notes: "Workspace scripts publish catalog definitions to Turso; Waymark only pulls them." }),
  table({ tableName: "routine_exercise_templates", entityType: "routine_exercise_template", source: "remote_current", writer: "workspace", scope: "vault", migrationMode: "preserve_remote", wave: 3, protectedCanonical: true, notes: "Workspace scripts publish catalog relations to Turso; Waymark only pulls them." }),

  table({ tableName: "week_plans", entityType: "week_plan", source: "remote_current", writer: "workspace", scope: "vault", migrationMode: "preserve_remote", wave: 4, protectedCanonical: true, businessIdentities: [{ name: "user_week", columns: ["user_id", "week_start_date"] }], notes: "Workspace scripts publish planning rows to Turso; Waymark only pulls them." }),
  table({ tableName: "week_plan_items", entityType: "week_plan_item", source: "remote_current", writer: "workspace", scope: "vault", migrationMode: "preserve_remote", wave: 4, protectedCanonical: true, businessIdentities: [{ name: "active_import_key", columns: ["user_id", "deterministic_import_key"], requireNonNull: ["deterministic_import_key"], whereNull: ["deleted_at"] }], notes: "Workspace scripts publish plan items to Turso; Waymark only pulls and materializes Marks." }),
  table({ tableName: "trail_days", entityType: "trail_day", source: "remote_current", writer: "waymark_eod", scope: "vault", migrationMode: "preserve_remote", wave: 4, protectedCanonical: true, mobileCreateAllowed: true, mobileMutationFields: ["status", "anchor_path_id", "closed_at", "reopened_at", "close_summary", "tomorrow_first_step", "character_result", "planned_mark_count", "completed_mark_count", "skipped_mark_count", "memory_count"], businessIdentities: [{ name: "user_local_date", columns: ["user_id", "local_date"] }], notes: "Waymark creates and closes Trail Days at EOD." }),
  table({ tableName: "mark_instances", entityType: "mark_instance", source: "remote_current", writer: "waymark_eod", scope: "vault", migrationMode: "preserve_remote", wave: 5, protectedCanonical: true, mobileCreateAllowed: true, mobileMutationFields: ["status", "completed_at", "skipped_at", "expired_at", "proof_note", "completion_summary", "substituted_by_mark_id", "rescheduled_to_mark_id"], businessIdentities: [{ name: "active_generation_key", columns: ["user_id", "generation_key"], requireNonNull: ["generation_key"], whereNull: ["deleted_at"] }], notes: "Turso owns Mark identity; Waymark may create Marks and change Mark outcome state." }),

  table({ tableName: "memories", entityType: "memory", source: "remote_current", writer: "waymark_eod", scope: "vault", migrationMode: "preserve_remote", wave: 6, protectedCanonical: true, mobileCreateAllowed: true, mobileDeleteAllowed: true, notes: "Waymark may create and maintain Memories; their IDs become canonical in Turso." }),
  table({ tableName: "media_assets", entityType: "media_asset", source: "device_operational", writer: "none", scope: "device", migrationMode: "archive_device_state", wave: 6, businessIdentities: [{ name: "active_content_owner", columns: ["user_id", "content_hash", "owner_type", "owner_id"], requireNonNull: ["content_hash"], whereNull: ["deleted_at"] }], notes: "Media metadata is operational support for Memory/Mark blobs." }),
  table({ tableName: "reflection_entries", entityType: "reflection_entry", source: "remote_current", writer: "none", scope: "vault", migrationMode: "preserve_remote", wave: 6, protectedCanonical: true, notes: "Reflection support rows are pull-only." }),
  table({ tableName: "backlog_items", entityType: "backlog_item", source: "remote_current", writer: "waymark_eod", scope: "vault", migrationMode: "preserve_remote", wave: 6, protectedCanonical: true, mobileCreateAllowed: true, mobileDeleteAllowed: true, notes: "Waymark may create and maintain Backlog items; their IDs become canonical in Turso." }),
  table({ tableName: "signals", entityType: "signal", source: "remote_current", writer: "none", scope: "vault", migrationMode: "preserve_remote", wave: 6, protectedCanonical: true, notes: "Signals are pull-only support rows." }),
  table({ tableName: "mark_instance_details", entityType: "mark_instance_detail", source: "remote_current", writer: "none", scope: "vault", migrationMode: "preserve_remote", wave: 6, protectedCanonical: true, notes: "Mark details are pull-only support rows." }),
  table({ tableName: "mark_dependencies", entityType: "mark_dependency", source: "remote_current", writer: "none", scope: "vault", migrationMode: "preserve_remote", wave: 6, protectedCanonical: true, notes: "Mark dependencies are pull-only support rows." }),

  table({ tableName: "pack_check_instances", entityType: "pack_check_instance", source: "remote_current", writer: "none", scope: "vault", migrationMode: "preserve_remote", wave: 7, protectedCanonical: true, businessIdentities: [{ name: "active_generation_key", columns: ["user_id", "generation_key"], requireNonNull: ["generation_key"], whereNull: ["deleted_at"] }], notes: "Pack-check execution support is pull-only." }),
  table({ tableName: "pack_check_item_instances", entityType: "pack_check_item_instance", source: "remote_current", writer: "none", scope: "vault", migrationMode: "preserve_remote", wave: 7, protectedCanonical: true, notes: "Pack-check item support is pull-only." }),
  table({ tableName: "workout_session_instances", entityType: "workout_session_instance", source: "remote_current", writer: "none", scope: "vault", migrationMode: "preserve_remote", wave: 7, protectedCanonical: true, businessIdentities: [{ name: "active_mark", columns: ["mark_instance_id"], whereNull: ["deleted_at"] }], notes: "Workout execution support is pull-only." }),
  table({ tableName: "session_exercise_snapshots", entityType: "session_exercise_snapshot", source: "remote_current", writer: "none", scope: "vault", migrationMode: "preserve_remote", wave: 7, protectedCanonical: true, notes: "Workout snapshot support is pull-only." }),
  table({ tableName: "exercise_set_logs", entityType: "exercise_set_log", source: "remote_current", writer: "none", scope: "vault", migrationMode: "preserve_remote", wave: 7, protectedCanonical: true, notes: "Exercise log support is pull-only." }),
  table({ tableName: "exercise_progress_states", entityType: "exercise_progress_state", source: "remote_current", writer: "none", scope: "vault", migrationMode: "preserve_remote", wave: 7, protectedCanonical: true, businessIdentities: [{ name: "active_user_exercise", columns: ["user_id", "exercise_definition_id"], whereNull: ["deleted_at"] }], notes: "Exercise progress support is pull-only." }),

  table({ tableName: "app_settings", entityType: "app_setting", source: "device_operational", writer: "none", scope: "device", migrationMode: "archive_device_state", wave: 8, businessIdentities: [{ name: "user_key", columns: ["user_id", "key"] }], notes: "Settings remain device-local and are never domain mutations." }),
  table({ tableName: "daily_media_upload_batches", entityType: "daily_media_upload_batch", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 8, businessIdentities: [{ name: "user_local_date", columns: ["user_id", "local_date"] }], notes: "Device upload audit state." }),
  table({ tableName: "sync_state", entityType: "sync_state", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 8, notes: "Device cursor projection." }),
  table({ tableName: "sync_outbox", entityType: "sync_outbox", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 8, businessIdentities: [{ name: "idempotency_key", columns: ["idempotency_key"] }], notes: "Pending queue is mirrored for audit; it is never replayed onto another device." }),
  table({ tableName: "sync_tombstones", entityType: "sync_tombstone", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 8, notes: "Anti-resurrection tombstones are retained per Vault/device." }),
  table({ tableName: "planning_sync_state", entityType: "planning_sync_state", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 8, notes: "Legacy planning cursor retained during cutover." }),
  table({ tableName: "planning_entity_state", entityType: "planning_entity_state", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 8, notes: "Legacy applied entity revisions retained during cutover." }),
  table({ tableName: "planning_conflicts", entityType: "planning_conflict", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 8, businessIdentities: [{ name: "vault_entity", columns: ["vault_id", "entity_type", "entity_id"] }], notes: "Conflict audit state." }),
  table({ tableName: "planning_side_effect_retries", entityType: "planning_side_effect_retry", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 8, notes: "Post-commit retry audit state." }),
] as const;

export const WAYMARK_TURSO_PROTECTED_CANONICAL_TABLES = WAYMARK_TURSO_FULL_DB_TABLES
  .filter((spec) => spec.protectedCanonical)
  .map((spec) => spec.tableName);

export const WAYMARK_TURSO_FULL_DB_MIGRATABLE_TABLES = WAYMARK_TURSO_FULL_DB_TABLES.filter(
  (spec) => spec.migrationMode !== "preserve_remote",
);

export const WAYMARK_TURSO_EOD_MUTABLE_TABLES = WAYMARK_TURSO_FULL_DB_TABLES.filter(
  (spec) => spec.writer === "waymark_eod" || spec.writer === "workspace_and_waymark_eod",
);

const tableByName = new Map(WAYMARK_TURSO_FULL_DB_TABLES.map((spec) => [spec.tableName, spec] as const));
const tableByEntityType = new Map(WAYMARK_TURSO_FULL_DB_TABLES.map((spec) => [spec.entityType, spec] as const));

export function getWaymarkFullDbTableSpec(tableName: string): WaymarkFullDbTableSpec | null {
  return tableByName.get(tableName) ?? null;
}

export function getWaymarkFullDbEntitySpec(entityType: string): WaymarkFullDbTableSpec | null {
  return tableByEntityType.get(entityType) ?? null;
}

export function canMigrateLocalRowsIntoTursoTable(tableName: string): boolean {
  const spec = getWaymarkFullDbTableSpec(tableName);
  return Boolean(spec && spec.migrationMode !== "preserve_remote");
}

export function canWaymarkMutateFullDbField(tableName: string, fieldName: string): boolean {
  const spec = getWaymarkFullDbTableSpec(tableName);
  if (!spec || (spec.writer !== "waymark_eod" && spec.writer !== "workspace_and_waymark_eod")) {
    return false;
  }
  return spec.mobileMutationFields ? spec.mobileMutationFields.includes(fieldName) : true;
}
