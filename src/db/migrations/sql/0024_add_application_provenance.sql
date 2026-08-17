ALTER TABLE devices ADD COLUMN application_id TEXT;
ALTER TABLE app_db_metadata ADD COLUMN application_id TEXT;
ALTER TABLE sync_outbox ADD COLUMN source_application_id TEXT;
ALTER TABLE sync_tombstones ADD COLUMN source_application_id TEXT;

CREATE INDEX IF NOT EXISTS idx_sync_outbox_application_pending
  ON sync_outbox(vault_id, source_application_id, status, created_at);
