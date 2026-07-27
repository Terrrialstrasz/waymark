CREATE TABLE IF NOT EXISTS vaults (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  client_type TEXT NOT NULL CHECK (client_type IN ('main', 'lite')),
  device_name TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  FOREIGN KEY(vault_id) REFERENCES vaults(id)
);

CREATE TABLE IF NOT EXISTS app_db_metadata (
  db_instance_id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  client_type TEXT NOT NULL CHECK (client_type IN ('main', 'lite')),
  schema_version INTEGER NOT NULL,
  map_version INTEGER NOT NULL,
  seed_version INTEGER NOT NULL,
  restore_state TEXT NOT NULL CHECK (restore_state IN ('fresh_local', 'restored_from_cloud', 'migrated_existing', 'dev_reset')),
  created_at INTEGER NOT NULL,
  last_migration_at INTEGER NOT NULL,
  last_seed_at INTEGER,
  last_cloud_sync_at INTEGER,
  FOREIGN KEY(vault_id) REFERENCES vaults(id),
  FOREIGN KEY(device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS sync_state (
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  last_cloud_revision INTEGER NOT NULL DEFAULT 0,
  last_successful_sync_at INTEGER,
  sync_mode TEXT NOT NULL CHECK (sync_mode IN ('none', 'manual', 'eod')),
  protection_status TEXT NOT NULL CHECK (protection_status IN ('local_only', 'cloud_configured', 'syncing', 'protected', 'error')),
  PRIMARY KEY (vault_id, device_id),
  FOREIGN KEY(vault_id) REFERENCES vaults(id),
  FOREIGN KEY(device_id) REFERENCES devices(id)
);

CREATE INDEX IF NOT EXISTS idx_devices_vault_client
  ON devices(vault_id, client_type);

CREATE INDEX IF NOT EXISTS idx_app_db_metadata_vault_device
  ON app_db_metadata(vault_id, device_id);
