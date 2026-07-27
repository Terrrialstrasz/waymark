CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  db_instance_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mark_instance', 'memory', 'media_asset', 'trail_day')),
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

CREATE TABLE IF NOT EXISTS sync_tombstones (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mark_instance', 'memory', 'media_asset', 'trail_day')),
  entity_id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  local_revision INTEGER NOT NULL,
  reason TEXT,
  PRIMARY KEY (entity_type, entity_id)
);

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

CREATE UNIQUE INDEX IF NOT EXISTS ux_media_assets_user_content_owner_active
  ON media_assets(user_id, content_hash, owner_type, owner_id)
  WHERE content_hash IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_drive_file
  ON media_assets(drive_file_id, deleted_at)
  WHERE drive_file_id IS NOT NULL;
