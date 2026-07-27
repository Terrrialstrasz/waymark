CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  scheduled_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  ringing_started_at INTEGER,
  snoozed_until INTEGER,
  resolved_at INTEGER,
  dismissed_at INTEGER,
  expired_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mark_dependencies (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  dependent_mark_instance_id TEXT NOT NULL,
  dependency_type TEXT NOT NULL,
  required_entity_type TEXT NOT NULL,
  required_entity_id TEXT NOT NULL,
  is_required INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  satisfied_at INTEGER,
  waived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(dependent_mark_instance_id) REFERENCES mark_instances(id)
);
