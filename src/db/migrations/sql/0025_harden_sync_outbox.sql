DROP INDEX IF EXISTS idx_sync_outbox_pending;
DROP INDEX IF EXISTS idx_sync_outbox_entity;
DROP INDEX IF EXISTS idx_sync_outbox_application_pending;

ALTER TABLE sync_outbox RENAME TO sync_outbox_legacy;

CREATE TABLE sync_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  db_instance_id TEXT NOT NULL,
  source_application_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  idempotency_key TEXT NOT NULL,
  local_revision INTEGER NOT NULL,
  base_remote_revision INTEGER,
  payload_json TEXT NOT NULL,
  payload_schema_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'syncing', 'synced', 'failed', 'conflict',
    'superseded', 'retry_wait', 'quarantined'
  )) DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  error_kind TEXT,
  next_attempt_at INTEGER,
  remote_revision INTEGER,
  canonical_entity_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  UNIQUE(idempotency_key)
);

INSERT INTO sync_outbox (
  id, vault_id, device_id, db_instance_id, source_application_id,
  entity_type, entity_id, operation, idempotency_key, local_revision,
  base_remote_revision, payload_json, payload_schema_version, status,
  retry_count, last_error, error_kind, next_attempt_at, remote_revision,
  canonical_entity_id, created_at, updated_at, synced_at
)
SELECT
  id, vault_id, device_id, db_instance_id, source_application_id,
  entity_type, entity_id, operation, idempotency_key, local_revision,
  base_remote_revision, payload_json, payload_schema_version, status,
  retry_count, last_error, NULL, NULL, NULL, NULL,
  created_at, updated_at, synced_at
FROM sync_outbox_legacy;

DROP TABLE sync_outbox_legacy;

CREATE INDEX idx_sync_outbox_pending
  ON sync_outbox(vault_id, status, created_at);

CREATE INDEX idx_sync_outbox_entity
  ON sync_outbox(entity_type, entity_id, status);

CREATE INDEX idx_sync_outbox_application_pending
  ON sync_outbox(vault_id, source_application_id, status, next_attempt_at, created_at);
