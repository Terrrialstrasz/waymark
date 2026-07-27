CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  display_name TEXT,
  locale TEXT NOT NULL,
  timezone TEXT NOT NULL,
  week_starts_on INTEGER NOT NULL DEFAULT 1,
  close_trail_prompt_time TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, key)
);
