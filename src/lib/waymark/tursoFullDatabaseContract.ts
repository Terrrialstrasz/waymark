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
  table({ tableName: "vaults", entityType: "vault", source: "local_export_seed", writer: "system", scope: "vault", migrationMode: "seed_missing_rows", wave: 1, notes: "Vault envelope is seeded once and then owned by Turso." }),
  table({ tableName: "user_profiles", entityType: "user_profile", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 1, notes: "User profile is mutable through explicit Waymark mutations." }),
  table({ tableName: "devices", entityType: "device", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 1, notes: "Device identity and last-seen state are namespaced by device." }),
  table({ tableName: "app_db_metadata", entityType: "app_db_metadata", source: "device_operational", writer: "system", scope: "device", migrationMode: "archive_device_state", wave: 1, notes: "Database provenance is mirrored for restore and audit." }),

  table({ tableName: "paths", entityType: "path", source: "remote_current", writer: "workspace", scope: "vault", migrationMode: "preserve_remote", wave: 2, protectedCanonical: true, notes: "Existing Turso paths are source of truth and must never be overwritten from local export." }),
  table({ tableName: "expeditions", entityType: "expedition", source: "remote_current", writer: "workspace_and_waymark_eod", scope: "vault", migrationMode: "preserve_remote", wave: 2, protectedCanonical: true, mobileMutationFields: ["status", "start_date", "target_date", "started_at", "target_end_at", "completed_at"], notes: "Existing Turso expedition structure is protected; Waymark may push only progress fields at EOD." }),
  table({ tableName: "milestones", entityType: "milestone", source: "workspace_publish", writer: "workspace_and_waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 2, mobileMutationFields: ["status", "start_date", "target_date", "completed_at"], notes: "Workspace publishes milestone structure; migration may add missing rows without overwriting existing Turso rows." }),

  table({ tableName: "mark_templates", entityType: "mark_template", source: "workspace_publish", writer: "workspace", scope: "vault", migrationMode: "seed_missing_rows", wave: 3, notes: "Catalog definition published from workspace." }),
  table({ tableName: "pack_check_templates", entityType: "pack_check_template", source: "workspace_publish", writer: "workspace", scope: "vault", migrationMode: "seed_missing_rows", wave: 3, notes: "Catalog definition published from workspace." }),
  table({ tableName: "pack_check_item_templates", entityType: "pack_check_item_template", source: "workspace_publish", writer: "workspace", scope: "vault", migrationMode: "seed_missing_rows", wave: 3, notes: "Catalog definition published from workspace." }),
  table({ tableName: "mark_pack_check_rules", entityType: "mark_pack_check_rule", source: "workspace_publish", writer: "workspace", scope: "vault", migrationMode: "seed_missing_rows", wave: 3, notes: "Catalog relation published from workspace." }),
  table({ tableName: "exercise_definitions", entityType: "exercise_definition", source: "workspace_publish", writer: "workspace", scope: "vault", migrationMode: "seed_missing_rows", wave: 3, notes: "Catalog definition published from workspace." }),
  table({ tableName: "workout_routine_templates", entityType: "workout_routine_template", source: "workspace_publish", writer: "workspace", scope: "vault", migrationMode: "seed_missing_rows", wave: 3, notes: "Catalog definition published from workspace." }),
  table({ tableName: "routine_exercise_templates", entityType: "routine_exercise_template", source: "workspace_publish", writer: "workspace", scope: "vault", migrationMode: "seed_missing_rows", wave: 3, notes: "Catalog relation published from workspace." }),

  table({ tableName: "week_plans", entityType: "week_plan", source: "workspace_publish", writer: "workspace", scope: "vault", migrationMode: "seed_missing_rows", wave: 4, businessIdentities: [{ name: "user_week", columns: ["user_id", "week_start_date"] }], notes: "Planning row published from workspace." }),
  table({ tableName: "week_plan_items", entityType: "week_plan_item", source: "workspace_publish", writer: "workspace", scope: "vault", migrationMode: "seed_missing_rows", wave: 4, businessIdentities: [{ name: "active_import_key", columns: ["user_id", "deterministic_import_key"], requireNonNull: ["deterministic_import_key"], whereNull: ["deleted_at"] }], notes: "Planning item published from workspace and materialized by Waymark." }),
  table({ tableName: "trail_days", entityType: "trail_day", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 4, mobileCreateAllowed: true, mobileMutationFields: ["status", "anchor_path_id", "closed_at", "reopened_at", "close_summary", "tomorrow_first_step", "character_result", "planned_mark_count", "completed_mark_count", "skipped_mark_count", "memory_count", "updated_at", "deleted_at"], businessIdentities: [{ name: "user_local_date", columns: ["user_id", "local_date"] }], notes: "Trail-day history is seeded without overwriting existing Turso rows and then receives EOD updates." }),
  table({ tableName: "mark_instances", entityType: "mark_instance", source: "remote_current", writer: "waymark_eod", scope: "vault", migrationMode: "preserve_remote", wave: 5, protectedCanonical: true, mobileCreateAllowed: true, mobileMutationFields: ["trail_day_id", "status", "scheduled_start_at", "scheduled_end_at", "due_at", "completed_at", "skipped_at", "expired_at", "proof_note", "completion_summary", "substituted_by_mark_id", "rescheduled_to_mark_id", "updated_at", "deleted_at"], businessIdentities: [{ name: "active_generation_key", columns: ["user_id", "generation_key"], requireNonNull: ["generation_key"], whereNull: ["deleted_at"] }], notes: "Existing Turso Marks are source of truth; only rule-authorized new Marks and runtime fields may be pushed at EOD." }),

  table({ tableName: "memories", entityType: "memory", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 6, mobileCreateAllowed: true, notes: "Memory rows are seeded from trusted export and then mutated by Waymark." }),
  table({ tableName: "media_assets", entityType: "media_asset", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 6, mobileCreateAllowed: true, businessIdentities: [{ name: "active_content_owner", columns: ["user_id", "content_hash", "owner_type", "owner_id"], requireNonNull: ["content_hash"], whereNull: ["deleted_at"] }], notes: "Media metadata is canonical in Turso; blobs remain in Drive." }),
  table({ tableName: "reflection_entries", entityType: "reflection_entry", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 6, mobileCreateAllowed: true, notes: "Reflection history is seeded and EOD-synced." }),
  table({ tableName: "backlog_items", entityType: "backlog_item", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 6, mobileCreateAllowed: true, notes: "Backlog is user-authored activity data." }),
  table({ tableName: "signals", entityType: "signal", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 6, mobileCreateAllowed: true, notes: "Signal runtime rows are distinct from workspace-owned signal plans." }),
  table({ tableName: "mark_instance_details", entityType: "mark_instance_detail", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 6, mobileCreateAllowed: true, notes: "Execution details are Waymark-owned." }),
  table({ tableName: "mark_dependencies", entityType: "mark_dependency", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 6, mobileCreateAllowed: true, notes: "Runtime dependency rows are mirrored as typed data." }),

  table({ tableName: "pack_check_instances", entityType: "pack_check_instance", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 7, mobileCreateAllowed: true, businessIdentities: [{ name: "active_generation_key", columns: ["user_id", "generation_key"], requireNonNull: ["generation_key"], whereNull: ["deleted_at"] }], notes: "Pack-check execution history." }),
  table({ tableName: "pack_check_item_instances", entityType: "pack_check_item_instance", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 7, mobileCreateAllowed: true, notes: "Pack-check item execution state." }),
  table({ tableName: "workout_session_instances", entityType: "workout_session_instance", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 7, mobileCreateAllowed: true, businessIdentities: [{ name: "active_mark", columns: ["mark_instance_id"], whereNull: ["deleted_at"] }], notes: "Workout execution history." }),
  table({ tableName: "session_exercise_snapshots", entityType: "session_exercise_snapshot", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 7, mobileCreateAllowed: true, notes: "Workout session snapshot rows." }),
  table({ tableName: "exercise_set_logs", entityType: "exercise_set_log", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 7, mobileCreateAllowed: true, notes: "Workout set history." }),
  table({ tableName: "exercise_progress_states", entityType: "exercise_progress_state", source: "local_export_seed", writer: "waymark_eod", scope: "vault", migrationMode: "seed_missing_rows", wave: 7, mobileCreateAllowed: true, businessIdentities: [{ name: "active_user_exercise", columns: ["user_id", "exercise_definition_id"], whereNull: ["deleted_at"] }], notes: "Exercise progression state." }),

  table({ tableName: "app_settings", entityType: "app_setting", source: "device_operational", writer: "waymark_eod", scope: "device", migrationMode: "archive_device_state", wave: 8, mobileCreateAllowed: true, businessIdentities: [{ name: "user_key", columns: ["user_id", "key"] }], notes: "Settings are mirrored per device; secrets remain in SecureStore and are never included." }),
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
