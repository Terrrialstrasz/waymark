CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  trail_day_id TEXT NOT NULL,
  path_id TEXT,
  title TEXT,
  body TEXT,
  mood TEXT,
  note TEXT,
  captured_at INTEGER NOT NULL,
  privacy TEXT NOT NULL DEFAULT 'private',
  latitude REAL,
  longitude REAL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(trail_day_id) REFERENCES trail_days(id),
  FOREIGN KEY(path_id) REFERENCES paths(id)
);

CREATE TABLE IF NOT EXISTS backlog_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  path_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL,
  horizon TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT,
  horizon_label TEXT,
  converted_mark_instance_id TEXT,
  converted_pack_check_template_id TEXT,
  converted_to_mark_instance_id TEXT,
  converted_to_expedition_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(path_id) REFERENCES paths(id)
);

CREATE TABLE IF NOT EXISTS week_plans (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  week_start_date TEXT NOT NULL,
  week_end_date TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT,
  note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS week_plan_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  week_plan_id TEXT NOT NULL,
  backlog_item_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_mark_instance_id TEXT,
  sort_order INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(week_plan_id) REFERENCES week_plans(id),
  FOREIGN KEY(backlog_item_id) REFERENCES backlog_items(id)
);

CREATE TABLE IF NOT EXISTS reflection_entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  trail_day_id TEXT NOT NULL,
  cluster TEXT NOT NULL,
  text TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(trail_day_id) REFERENCES trail_days(id)
);
