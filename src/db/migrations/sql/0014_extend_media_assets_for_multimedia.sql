ALTER TABLE media_assets ADD COLUMN kind TEXT NOT NULL DEFAULT 'image';
ALTER TABLE media_assets ADD COLUMN duration_ms INTEGER;
ALTER TABLE media_assets ADD COLUMN sort_index INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_media_owner_sort
  ON media_assets(owner_type, owner_id, sort_index, created_at, deleted_at);
