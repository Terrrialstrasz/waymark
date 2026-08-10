ALTER TABLE sync_state ADD COLUMN full_db_schema_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sync_state ADD COLUMN full_db_snapshot_completed_at INTEGER;
