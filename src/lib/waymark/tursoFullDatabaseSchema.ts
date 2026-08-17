export const WAYMARK_TURSO_FULL_DB_SCHEMA_VERSION = 1;

export const WAYMARK_TURSO_FULL_DB_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS waymark_full_db_schema_metadata (
  singleton_id INTEGER PRIMARY KEY NOT NULL CHECK (singleton_id = 1),
  schema_version INTEGER NOT NULL,
  migration_mode TEXT NOT NULL CHECK (migration_mode IN ('preparing', 'active', 'rollback')),
  activated_at INTEGER,
  updated_at INTEGER NOT NULL
);

INSERT INTO waymark_full_db_schema_metadata (
  singleton_id, schema_version, migration_mode, activated_at, updated_at
) VALUES (1, ${WAYMARK_TURSO_FULL_DB_SCHEMA_VERSION}, 'preparing', NULL, 0)
ON CONFLICT(singleton_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS waymark_full_db_migrations (
  migration_id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  source_db_instance_id TEXT,
  source_device_id TEXT,
  source_exported_at INTEGER,
  status TEXT NOT NULL CHECK (status IN ('preparing', 'applying', 'verified', 'failed', 'rolled_back')),
  protected_baseline_json TEXT NOT NULL,
  result_manifest_json TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_waymark_full_db_migrations_vault_created
  ON waymark_full_db_migrations(vault_id, created_at);

CREATE TABLE IF NOT EXISTS waymark_full_db_table_manifests (
  migration_id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  source_row_count INTEGER NOT NULL,
  inserted_row_count INTEGER NOT NULL DEFAULT 0,
  skipped_row_count INTEGER NOT NULL DEFAULT 0,
  conflict_row_count INTEGER NOT NULL DEFAULT 0,
  source_checksum TEXT NOT NULL,
  remote_before_checksum TEXT,
  remote_after_checksum TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'applied', 'verified', 'failed', 'protected')),
  details_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (migration_id, table_name)
);

CREATE INDEX IF NOT EXISTS idx_waymark_full_db_table_manifests_vault_table
  ON waymark_full_db_table_manifests(vault_id, table_name, created_at);

CREATE TABLE IF NOT EXISTS waymark_full_db_idempotency (
  mutation_id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT,
  source_application_id TEXT,
  table_name TEXT NOT NULL,
  row_key TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  global_revision INTEGER,
  cleaned_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waymark_full_db_idempotency_vault_row
  ON waymark_full_db_idempotency(vault_id, table_name, row_key);

CREATE INDEX IF NOT EXISTS idx_waymark_full_db_idempotency_application_cleanup
  ON waymark_full_db_idempotency(vault_id, source_application_id, cleaned_at, created_at);

CREATE TABLE IF NOT EXISTS waymark_full_db_change_log (
  global_revision INTEGER PRIMARY KEY AUTOINCREMENT,
  vault_id TEXT NOT NULL,
  device_id TEXT,
  source_application_id TEXT,
  table_name TEXT NOT NULL,
  row_key TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  entity_revision INTEGER NOT NULL,
  payload_snapshot TEXT NOT NULL,
  before_payload_snapshot TEXT,
  payload_schema_version INTEGER NOT NULL DEFAULT 1,
  mutation_id TEXT,
  changed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waymark_full_db_change_log_vault_revision
  ON waymark_full_db_change_log(vault_id, global_revision);

CREATE INDEX IF NOT EXISTS idx_waymark_full_db_change_log_row
  ON waymark_full_db_change_log(vault_id, table_name, row_key, global_revision);

CREATE INDEX IF NOT EXISTS idx_waymark_full_db_change_log_mutation
  ON waymark_full_db_change_log(vault_id, mutation_id);

CREATE TABLE IF NOT EXISTS waymark_full_db_snapshots (
  snapshot_id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  through_global_revision INTEGER NOT NULL,
  schema_version INTEGER NOT NULL,
  table_manifest_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('building', 'ready', 'invalidated')),
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_waymark_full_db_snapshots_vault_created
  ON waymark_full_db_snapshots(vault_id, created_at);

CREATE TABLE IF NOT EXISTS waymark_full_db_device_cursors (
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  last_global_revision INTEGER NOT NULL DEFAULT 0,
  last_snapshot_id TEXT,
  last_pull_started_at INTEGER,
  last_pull_completed_at INTEGER,
  last_push_completed_at INTEGER,
  last_status TEXT,
  last_error TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (vault_id, device_id)
);
`;

export function getWaymarkTursoFullDatabaseSchemaSql(): string {
  return WAYMARK_TURSO_FULL_DB_SCHEMA_SQL;
}
