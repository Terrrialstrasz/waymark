ALTER TABLE media_assets ADD COLUMN local_date TEXT;
ALTER TABLE media_assets ADD COLUMN daily_batch_id TEXT;
ALTER TABLE media_assets ADD COLUMN upload_status TEXT NOT NULL DEFAULT 'local_only';
ALTER TABLE media_assets ADD COLUMN local_status TEXT NOT NULL DEFAULT 'local_available';
ALTER TABLE media_assets ADD COLUMN source_cleanup_status TEXT NOT NULL DEFAULT 'not_requested';
ALTER TABLE media_assets ADD COLUMN original_picker_uri TEXT;
ALTER TABLE media_assets ADD COLUMN library_asset_id TEXT;
ALTER TABLE media_assets ADD COLUMN drive_file_id TEXT;
ALTER TABLE media_assets ADD COLUMN drive_folder_id TEXT;
ALTER TABLE media_assets ADD COLUMN drive_root_folder_id TEXT;
ALTER TABLE media_assets ADD COLUMN drive_web_view_link TEXT;
ALTER TABLE media_assets ADD COLUMN drive_web_content_link TEXT;
ALTER TABLE media_assets ADD COLUMN drive_mime_type TEXT;
ALTER TABLE media_assets ADD COLUMN drive_size_bytes INTEGER;
ALTER TABLE media_assets ADD COLUMN drive_md5_checksum TEXT;
ALTER TABLE media_assets ADD COLUMN content_hash TEXT;
ALTER TABLE media_assets ADD COLUMN content_hash_algorithm TEXT;
ALTER TABLE media_assets ADD COLUMN thumbnail_drive_file_id TEXT;
ALTER TABLE media_assets ADD COLUMN thumbnail_content_hash TEXT;
ALTER TABLE media_assets ADD COLUMN thumbnail_content_hash_algorithm TEXT;
ALTER TABLE media_assets ADD COLUMN uploaded_at INTEGER;
ALTER TABLE media_assets ADD COLUMN source_deleted_at INTEGER;
ALTER TABLE media_assets ADD COLUMN local_deleted_at INTEGER;
ALTER TABLE media_assets ADD COLUMN last_sync_error TEXT;

CREATE TABLE IF NOT EXISTS daily_media_upload_batches (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL,
  media_count INTEGER NOT NULL DEFAULT 0,
  uploaded_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  run_sequence INTEGER NOT NULL DEFAULT 0,
  lock_owner TEXT,
  lock_acquired_at INTEGER,
  lock_expires_at INTEGER,
  sealed_at INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, local_date)
);

CREATE INDEX IF NOT EXISTS idx_media_eod_user_date_status
  ON media_assets(user_id, local_date, upload_status, deleted_at);

CREATE INDEX IF NOT EXISTS idx_media_daily_batch
  ON media_assets(daily_batch_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_daily_media_batches_catchup
  ON daily_media_upload_batches(user_id, local_date, status, deleted_at);
