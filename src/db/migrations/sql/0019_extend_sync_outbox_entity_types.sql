DROP INDEX IF EXISTS idx_sync_outbox_pending;
DROP INDEX IF EXISTS idx_sync_outbox_entity;

ALTER TABLE sync_outbox RENAME TO sync_outbox_legacy;

CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  db_instance_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mark_instance', 'mark_instance_detail', 'memory', 'media_asset', 'trail_day', 'week_plan', 'week_plan_item', 'signal')),
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

INSERT INTO sync_outbox (
  id,
  vault_id,
  device_id,
  db_instance_id,
  entity_type,
  entity_id,
  operation,
  idempotency_key,
  local_revision,
  base_remote_revision,
  payload_json,
  payload_schema_version,
  status,
  retry_count,
  last_error,
  created_at,
  updated_at,
  synced_at
)
SELECT
  id,
  vault_id,
  device_id,
  db_instance_id,
  entity_type,
  entity_id,
  operation,
  idempotency_key,
  local_revision,
  base_remote_revision,
  payload_json,
  payload_schema_version,
  status,
  retry_count,
  last_error,
  created_at,
  updated_at,
  synced_at
FROM sync_outbox_legacy
WHERE entity_type IN ('mark_instance', 'memory', 'media_asset', 'trail_day');

DROP TABLE sync_outbox_legacy;

CREATE INDEX IF NOT EXISTS idx_sync_outbox_pending
  ON sync_outbox(vault_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity
  ON sync_outbox(entity_type, entity_id, status);

ALTER TABLE sync_tombstones RENAME TO sync_tombstones_legacy;

CREATE TABLE IF NOT EXISTS sync_tombstones (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mark_instance', 'mark_instance_detail', 'memory', 'media_asset', 'trail_day', 'week_plan', 'week_plan_item', 'signal')),
  entity_id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  local_revision INTEGER NOT NULL,
  reason TEXT,
  PRIMARY KEY (entity_type, entity_id)
);

INSERT INTO sync_tombstones (
  entity_type,
  entity_id,
  vault_id,
  device_id,
  deleted_at,
  local_revision,
  reason
)
SELECT
  entity_type,
  entity_id,
  vault_id,
  device_id,
  deleted_at,
  local_revision,
  reason
FROM sync_tombstones_legacy
WHERE entity_type IN ('mark_instance', 'memory', 'media_asset', 'trail_day');

DROP TABLE sync_tombstones_legacy;
