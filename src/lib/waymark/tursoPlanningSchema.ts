export const WAYMARK_TURSO_PLANNING_ENTITY_TYPES = [
  "week_plan",
  "week_plan_item",
  "signal_plan",
  "signal",
  "path",
  "expedition",
  "milestone",
  "mark_instance",
] as const;

export type WaymarkTursoPlanningEntityType = (typeof WAYMARK_TURSO_PLANNING_ENTITY_TYPES)[number];

export const WAYMARK_TURSO_PLANNING_ACTIVE_ENTITY_TYPES = [
  "week_plan",
  "week_plan_item",
  "signal_plan",
  "path",
  "expedition",
  "milestone",
  "mark_instance",
] as const satisfies readonly WaymarkTursoPlanningEntityType[];

export type WaymarkTursoDevClearTable = {
  tableName: string;
  vaultScoped: boolean;
};

export const WAYMARK_TURSO_DEV_CLEAR_TABLES = [
  { tableName: "mark_instances", vaultScoped: true },
  { tableName: "trail_days", vaultScoped: true },
  { tableName: "milestones", vaultScoped: true },
  { tableName: "expeditions", vaultScoped: true },
  { tableName: "paths", vaultScoped: true },
  { tableName: "week_plan_items", vaultScoped: true },
  { tableName: "signal_plans", vaultScoped: true },
  { tableName: "week_plans", vaultScoped: true },
  { tableName: "signals", vaultScoped: true },
  { tableName: "waymark_planning_change_log", vaultScoped: true },
  { tableName: "waymark_planning_idempotency", vaultScoped: true },
  { tableName: "waymark_remote_change_log", vaultScoped: true },
  { tableName: "waymark_remote_records", vaultScoped: true },
  { tableName: "waymark_remote_idempotency", vaultScoped: true },
] as const satisfies readonly WaymarkTursoDevClearTable[];

const PLANNING_ENTITY_TYPE_CHECK =
  "entity_type IN ('week_plan', 'week_plan_item', 'signal_plan', 'signal', 'path', 'expedition', 'milestone', 'mark_instance')";

export const WAYMARK_TURSO_PLANNING_CONTEXT_VIEW_DROPS = `
DROP VIEW IF EXISTS chatgpt_week_planning_context;
DROP VIEW IF EXISTS chatgpt_expedition_progress_context;
DROP VIEW IF EXISTS chatgpt_milestone_mark_context;
DROP VIEW IF EXISTS chatgpt_signal_plan_context;
DROP VIEW IF EXISTS chatgpt_catalog_template_context;
`;

export const TURSO_PLANNING_SCHEMA_SQL = `
${WAYMARK_TURSO_PLANNING_CONTEXT_VIEW_DROPS}

DROP TRIGGER IF EXISTS trg_turso_week_plans_insert_log;
DROP TRIGGER IF EXISTS trg_turso_week_plans_update_log;
DROP TRIGGER IF EXISTS trg_turso_week_plans_delete_log;
DROP TRIGGER IF EXISTS trg_turso_week_plan_items_insert_log;
DROP TRIGGER IF EXISTS trg_turso_week_plan_items_update_log;
DROP TRIGGER IF EXISTS trg_turso_week_plan_items_delete_log;
DROP TRIGGER IF EXISTS trg_turso_paths_insert_log;
DROP TRIGGER IF EXISTS trg_turso_paths_update_log;
DROP TRIGGER IF EXISTS trg_turso_paths_delete_log;
DROP TRIGGER IF EXISTS trg_turso_expeditions_insert_log;
DROP TRIGGER IF EXISTS trg_turso_expeditions_update_log;
DROP TRIGGER IF EXISTS trg_turso_expeditions_delete_log;
DROP TRIGGER IF EXISTS trg_turso_milestones_insert_log;
DROP TRIGGER IF EXISTS trg_turso_milestones_update_log;
DROP TRIGGER IF EXISTS trg_turso_milestones_delete_log;
DROP VIEW IF EXISTS expedition_planned_marks;
DROP VIEW IF EXISTS expedition_milestone_marks;
DROP VIEW IF EXISTS milestone_progress;
DROP VIEW IF EXISTS expedition_progress;

CREATE TABLE IF NOT EXISTS waymark_planning_authority (
  entity_type TEXT PRIMARY KEY NOT NULL CHECK (${PLANNING_ENTITY_TYPE_CHECK}),
  mode TEXT NOT NULL CHECK (mode IN ('editable_remote', 'synced_readonly_remote', 'inactive')),
  schema_version INTEGER NOT NULL,
  activated_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS waymark_planning_idempotency (
  mutation_id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (${PLANNING_ENTITY_TYPE_CHECK}),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  change_sequence INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS waymark_planning_change_log (
  change_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (${PLANNING_ENTITY_TYPE_CHECK}),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  entity_revision INTEGER NOT NULL,
  payload_snapshot TEXT NOT NULL,
  payload_schema_version INTEGER NOT NULL DEFAULT 1,
  deleted_at INTEGER,
  updated_at INTEGER NOT NULL,
  mutation_id TEXT,
  created_at INTEGER NOT NULL
);

DROP TABLE IF EXISTS waymark_planning_authority_next;

CREATE TABLE waymark_planning_authority_next (
  entity_type TEXT PRIMARY KEY NOT NULL CHECK (${PLANNING_ENTITY_TYPE_CHECK}),
  mode TEXT NOT NULL CHECK (mode IN ('editable_remote', 'synced_readonly_remote', 'inactive')),
  schema_version INTEGER NOT NULL,
  activated_at INTEGER,
  updated_at INTEGER NOT NULL
);

INSERT OR REPLACE INTO waymark_planning_authority_next (
  entity_type, mode, schema_version, activated_at, updated_at
)
SELECT entity_type, mode, schema_version, activated_at, updated_at
FROM waymark_planning_authority
WHERE entity_type IN ('week_plan', 'week_plan_item', 'signal_plan', 'signal', 'path', 'expedition', 'milestone', 'mark_instance');

DROP TABLE waymark_planning_authority;
ALTER TABLE waymark_planning_authority_next RENAME TO waymark_planning_authority;

DROP TABLE IF EXISTS waymark_planning_idempotency_next;

CREATE TABLE waymark_planning_idempotency_next (
  mutation_id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (${PLANNING_ENTITY_TYPE_CHECK}),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  change_sequence INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO waymark_planning_idempotency_next (
  mutation_id, vault_id, entity_type, entity_id, operation, change_sequence, created_at
)
SELECT mutation_id, vault_id, entity_type, entity_id, operation, change_sequence, created_at
FROM waymark_planning_idempotency
WHERE entity_type IN ('week_plan', 'week_plan_item', 'signal_plan', 'signal', 'path', 'expedition', 'milestone', 'mark_instance');

DROP TABLE waymark_planning_idempotency;
ALTER TABLE waymark_planning_idempotency_next RENAME TO waymark_planning_idempotency;

DROP TABLE IF EXISTS waymark_planning_change_log_next;

CREATE TABLE waymark_planning_change_log_next (
  change_sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (${PLANNING_ENTITY_TYPE_CHECK}),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  entity_revision INTEGER NOT NULL,
  payload_snapshot TEXT NOT NULL,
  payload_schema_version INTEGER NOT NULL DEFAULT 1,
  deleted_at INTEGER,
  updated_at INTEGER NOT NULL,
  mutation_id TEXT,
  created_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO waymark_planning_change_log_next (
  change_sequence, vault_id, entity_type, entity_id, operation, entity_revision,
  payload_snapshot, payload_schema_version, deleted_at, updated_at, mutation_id, created_at
)
SELECT
  change_sequence, vault_id, entity_type, entity_id, operation, entity_revision,
  payload_snapshot, payload_schema_version, deleted_at, updated_at, mutation_id, created_at
FROM waymark_planning_change_log
WHERE entity_type IN ('week_plan', 'week_plan_item', 'signal_plan', 'signal', 'path', 'expedition', 'milestone', 'mark_instance');

DROP TABLE waymark_planning_change_log;
ALTER TABLE waymark_planning_change_log_next RENAME TO waymark_planning_change_log;

CREATE INDEX IF NOT EXISTS idx_waymark_planning_change_log_vault_sequence
  ON waymark_planning_change_log(vault_id, change_sequence);

CREATE INDEX IF NOT EXISTS idx_waymark_planning_change_log_entity
  ON waymark_planning_change_log(vault_id, entity_type, entity_id, change_sequence);

CREATE TABLE IF NOT EXISTS week_plans (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  week_start_date TEXT NOT NULL,
  week_end_date TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT,
  note TEXT,
  entity_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_mutation_id TEXT,
  PRIMARY KEY (vault_id, id),
  UNIQUE(vault_id, user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS week_plan_items (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  week_plan_id TEXT NOT NULL,
  backlog_item_id TEXT,
  status TEXT NOT NULL,
  local_date TEXT,
  start_time TEXT,
  end_time TEXT,
  title TEXT,
  path_id TEXT,
  template_id TEXT,
  expedition_id TEXT,
  milestone_id TEXT,
  expedition_context TEXT,
  milestone_context TEXT,
  description TEXT,
  note TEXT,
  origin TEXT,
  block_key TEXT,
  deterministic_import_key TEXT,
  import_batch_id TEXT,
  created_mark_instance_id TEXT,
  sort_order INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  entity_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_mutation_id TEXT,
  PRIMARY KEY (vault_id, id),
  FOREIGN KEY(vault_id, week_plan_id) REFERENCES week_plans(vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_week_plan_items_week
  ON week_plan_items(vault_id, week_plan_id, status, sort_order, deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_turso_week_plan_items_import_key_active
  ON week_plan_items(vault_id, user_id, deterministic_import_key)
  WHERE deterministic_import_key IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS signal_plans (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  week_plan_id TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  local_date TEXT,
  scheduled_time TEXT,
  scheduled_at INTEGER,
  recurrence_rule_json TEXT,
  title TEXT,
  body TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  planning_item_key TEXT,
  entity_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_mutation_id TEXT,
  PRIMARY KEY (vault_id, id),
  FOREIGN KEY(vault_id, week_plan_id) REFERENCES week_plans(vault_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_turso_signal_plans_item_key_active
  ON signal_plans(vault_id, user_id, planning_item_key)
  WHERE planning_item_key IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_turso_signal_plans_target
  ON signal_plans(vault_id, target_type, target_id, is_enabled, deleted_at);

CREATE TABLE IF NOT EXISTS signals (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  scheduled_at INTEGER NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  runtime_status TEXT,
  entity_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_mutation_id TEXT,
  PRIMARY KEY (vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_signals_schedule
  ON signals(vault_id, scheduled_at, is_enabled, deleted_at);

CREATE TABLE IF NOT EXISTS paths (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  color_token TEXT,
  icon_key TEXT,
  sort_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  hero_media_asset_id TEXT,
  entity_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_mutation_id TEXT,
  PRIMARY KEY (vault_id, id),
  UNIQUE(vault_id, user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_turso_paths_user_sort
  ON paths(vault_id, user_id, is_active, sort_order, deleted_at);

CREATE TABLE IF NOT EXISTS expeditions (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  path_id TEXT NOT NULL,
  title TEXT NOT NULL,
  purpose TEXT,
  description TEXT,
  status TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  start_date TEXT,
  target_date TEXT,
  started_at INTEGER,
  target_end_at INTEGER,
  completed_at INTEGER,
  hero_media_asset_id TEXT,
  entity_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_mutation_id TEXT,
  PRIMARY KEY (vault_id, id),
  FOREIGN KEY(vault_id, path_id) REFERENCES paths(vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_expeditions_path_sort
  ON expeditions(vault_id, path_id, status, sort_order, deleted_at);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  expedition_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  start_date TEXT,
  target_date TEXT,
  sort_order INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  completed_at INTEGER,
  entity_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_mutation_id TEXT,
  PRIMARY KEY (vault_id, id),
  FOREIGN KEY(vault_id, expedition_id) REFERENCES expeditions(vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_milestones_expedition_sort
  ON milestones(vault_id, expedition_id, status, sort_order, order_index, deleted_at);

CREATE TABLE IF NOT EXISTS trail_days (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  status TEXT NOT NULL,
  anchor_path_id TEXT,
  closed_at INTEGER,
  reopened_at INTEGER,
  close_summary TEXT,
  tomorrow_first_step TEXT,
  character_result TEXT,
  planned_mark_count INTEGER NOT NULL DEFAULT 0,
  completed_mark_count INTEGER NOT NULL DEFAULT 0,
  skipped_mark_count INTEGER NOT NULL DEFAULT 0,
  memory_count INTEGER NOT NULL DEFAULT 0,
  entity_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_mutation_id TEXT,
  PRIMARY KEY (vault_id, id),
  UNIQUE(vault_id, user_id, local_date),
  FOREIGN KEY(vault_id, anchor_path_id) REFERENCES paths(vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_trail_days_user_date
  ON trail_days(vault_id, user_id, local_date, deleted_at);

CREATE TABLE IF NOT EXISTS mark_instances (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  path_id TEXT NOT NULL,
  trail_day_id TEXT NOT NULL,
  template_id TEXT,
  expedition_id TEXT,
  milestone_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  origin TEXT NOT NULL,
  status TEXT NOT NULL,
  scheduled_start_at INTEGER,
  scheduled_end_at INTEGER,
  due_at INTEGER,
  completed_at INTEGER,
  skipped_at INTEGER,
  expired_at INTEGER,
  proof_note TEXT,
  completion_summary TEXT,
  substituted_by_mark_id TEXT,
  rescheduled_to_mark_id TEXT,
  source_backlog_item_id TEXT,
  generation_key TEXT,
  entity_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_mutation_id TEXT,
  PRIMARY KEY (vault_id, id),
  FOREIGN KEY(vault_id, path_id) REFERENCES paths(vault_id, id),
  FOREIGN KEY(vault_id, expedition_id) REFERENCES expeditions(vault_id, id),
  FOREIGN KEY(vault_id, milestone_id) REFERENCES milestones(vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_mark_instances_expedition
  ON mark_instances(vault_id, expedition_id, status, scheduled_start_at, deleted_at);

CREATE INDEX IF NOT EXISTS idx_turso_mark_instances_path_schedule
  ON mark_instances(vault_id, path_id, status, scheduled_start_at, deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_turso_mark_instances_generation_key_active
  ON mark_instances(vault_id, user_id, generation_key)
  WHERE generation_key IS NOT NULL AND deleted_at IS NULL;

-- Waymark Turso projection views

CREATE VIEW IF NOT EXISTS expedition_planned_marks AS
SELECT
  m.vault_id,
  p.id AS path_id,
  p.title AS path_title,
  e.id AS expedition_id,
  e.title AS expedition_title,
  ms.id AS milestone_id,
  ms.title AS milestone_title,
  ms.status AS milestone_status,
  m.id AS mark_instance_id,
  m.title AS mark_title,
  m.description AS mark_description,
  m.origin AS mark_origin,
  m.status AS mark_status,
  m.scheduled_start_at,
  m.scheduled_end_at,
  m.due_at,
  m.completed_at,
  m.skipped_at,
  wp.id AS week_plan_id,
  wp.week_start_date,
  wp.week_end_date,
  wpi.local_date AS planned_local_date,
  wpi.start_time AS planned_start_time,
  wpi.end_time AS planned_end_time,
  m.deleted_at,
  m.updated_at
FROM mark_instances m
JOIN expeditions e ON e.vault_id = m.vault_id AND e.id = m.expedition_id
JOIN paths p ON p.vault_id = m.vault_id AND p.id = m.path_id
LEFT JOIN milestones ms ON ms.vault_id = m.vault_id AND ms.id = m.milestone_id
LEFT JOIN week_plan_items wpi
  ON wpi.vault_id = m.vault_id
  AND wpi.created_mark_instance_id = m.id
  AND wpi.deleted_at IS NULL
LEFT JOIN week_plans wp
  ON wp.vault_id = wpi.vault_id
  AND wp.id = wpi.week_plan_id
  AND wp.deleted_at IS NULL
WHERE m.expedition_id IS NOT NULL;

CREATE VIEW IF NOT EXISTS expedition_milestone_marks AS
SELECT
  ms.vault_id,
  p.id AS path_id,
  p.title AS path_title,
  e.id AS expedition_id,
  e.title AS expedition_title,
  e.status AS expedition_status,
  e.deleted_at AS expedition_deleted_at,
  ms.id AS milestone_id,
  ms.title AS milestone_title,
  ms.status AS milestone_status,
  ms.target_date AS milestone_target_date,
  ms.deleted_at AS milestone_deleted_at,
  m.id AS mark_instance_id,
  m.title AS mark_title,
  m.origin AS mark_origin,
  m.status AS mark_status,
  m.scheduled_start_at,
  m.completed_at,
  m.updated_at AS mark_updated_at
FROM milestones ms
JOIN expeditions e ON e.vault_id = ms.vault_id AND e.id = ms.expedition_id
JOIN paths p ON p.vault_id = e.vault_id AND p.id = e.path_id
LEFT JOIN mark_instances m
  ON m.vault_id = ms.vault_id
  AND m.milestone_id = ms.id
  AND m.deleted_at IS NULL
UNION ALL
SELECT
  m.vault_id,
  p.id AS path_id,
  p.title AS path_title,
  e.id AS expedition_id,
  e.title AS expedition_title,
  e.status AS expedition_status,
  e.deleted_at AS expedition_deleted_at,
  NULL AS milestone_id,
  NULL AS milestone_title,
  NULL AS milestone_status,
  NULL AS milestone_target_date,
  NULL AS milestone_deleted_at,
  m.id AS mark_instance_id,
  m.title AS mark_title,
  m.origin AS mark_origin,
  m.status AS mark_status,
  m.scheduled_start_at,
  m.completed_at,
  m.updated_at AS mark_updated_at
FROM mark_instances m
JOIN expeditions e ON e.vault_id = m.vault_id AND e.id = m.expedition_id
JOIN paths p ON p.vault_id = e.vault_id AND p.id = e.path_id
WHERE m.deleted_at IS NULL
  AND m.milestone_id IS NULL;

CREATE VIEW IF NOT EXISTS milestone_progress AS
SELECT
  ms.vault_id,
  p.id AS path_id,
  p.title AS path_title,
  e.id AS expedition_id,
  e.title AS expedition_title,
  ms.id AS milestone_id,
  ms.title AS milestone_title,
  ms.status AS milestone_status,
  ms.target_date,
  COUNT(m.id) AS total_mark_count,
  SUM(CASE WHEN m.status = 'completed' THEN 1 ELSE 0 END) AS completed_mark_count,
  SUM(CASE WHEN m.status = 'partially_completed' THEN 1 ELSE 0 END) AS partially_completed_mark_count,
  SUM(CASE WHEN m.status IN ('planned', 'ready', 'blocked', 'active') THEN 1 ELSE 0 END) AS open_mark_count,
  SUM(CASE WHEN m.status IN ('skipped', 'expired') THEN 1 ELSE 0 END) AS missed_mark_count,
  ROUND(
    100.0 * SUM(CASE WHEN m.status = 'completed' THEN 1 WHEN m.status = 'partially_completed' THEN 0.5 ELSE 0 END)
    / NULLIF(SUM(CASE WHEN m.status NOT IN ('cancelled', 'rescheduled', 'substituted') THEN 1 ELSE 0 END), 0),
    1
  ) AS progress_percent,
  MAX(COALESCE(m.completed_at, m.updated_at)) AS latest_mark_activity_at
FROM milestones ms
JOIN expeditions e ON e.vault_id = ms.vault_id AND e.id = ms.expedition_id
JOIN paths p ON p.vault_id = e.vault_id AND p.id = e.path_id
LEFT JOIN mark_instances m
  ON m.vault_id = ms.vault_id
  AND m.milestone_id = ms.id
  AND m.deleted_at IS NULL
WHERE ms.deleted_at IS NULL AND e.deleted_at IS NULL AND p.deleted_at IS NULL
GROUP BY ms.vault_id, p.id, p.title, e.id, e.title, ms.id, ms.title, ms.status, ms.target_date;

CREATE VIEW IF NOT EXISTS expedition_progress AS
WITH milestone_stats AS (
  SELECT
    vault_id,
    expedition_id,
    COUNT(id) AS milestone_count,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_milestone_count
  FROM milestones
  WHERE deleted_at IS NULL
  GROUP BY vault_id, expedition_id
),
mark_stats AS (
  SELECT
    vault_id,
    expedition_id,
    COUNT(id) AS total_mark_count,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_mark_count,
    SUM(CASE WHEN status IN ('planned', 'ready', 'blocked', 'active') THEN 1 ELSE 0 END) AS open_mark_count,
    ROUND(
      100.0 * SUM(CASE WHEN status = 'completed' THEN 1 WHEN status = 'partially_completed' THEN 0.5 ELSE 0 END)
      / NULLIF(SUM(CASE WHEN status NOT IN ('cancelled', 'rescheduled', 'substituted') THEN 1 ELSE 0 END), 0),
      1
    ) AS progress_percent,
    MAX(COALESCE(completed_at, updated_at)) AS latest_mark_activity_at
  FROM mark_instances
  WHERE deleted_at IS NULL AND expedition_id IS NOT NULL
  GROUP BY vault_id, expedition_id
)
SELECT
  e.vault_id,
  p.id AS path_id,
  p.title AS path_title,
  e.id AS expedition_id,
  e.title AS expedition_title,
  e.status AS expedition_status,
  e.target_date,
  COALESCE(ms.milestone_count, 0) AS milestone_count,
  COALESCE(ms.completed_milestone_count, 0) AS completed_milestone_count,
  COALESCE(m.total_mark_count, 0) AS total_mark_count,
  COALESCE(m.completed_mark_count, 0) AS completed_mark_count,
  COALESCE(m.open_mark_count, 0) AS open_mark_count,
  m.progress_percent,
  m.latest_mark_activity_at
FROM expeditions e
JOIN paths p ON p.vault_id = e.vault_id AND p.id = e.path_id
LEFT JOIN milestone_stats ms ON ms.vault_id = e.vault_id AND ms.expedition_id = e.id
LEFT JOIN mark_stats m ON m.vault_id = e.vault_id AND m.expedition_id = e.id
WHERE e.deleted_at IS NULL AND p.deleted_at IS NULL;

INSERT INTO waymark_planning_authority (entity_type, mode, schema_version, activated_at, updated_at)
VALUES
  ('week_plan', 'editable_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('week_plan_item', 'editable_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('signal_plan', 'editable_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('signal', 'synced_readonly_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('path', 'editable_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('expedition', 'editable_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('milestone', 'editable_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('mark_instance', 'synced_readonly_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
ON CONFLICT(entity_type) DO UPDATE SET
  mode = excluded.mode,
  schema_version = excluded.schema_version,
  activated_at = CASE
    WHEN excluded.mode = 'inactive' THEN waymark_planning_authority.activated_at
    ELSE COALESCE(waymark_planning_authority.activated_at, excluded.activated_at)
  END,
  updated_at = excluded.updated_at;

CREATE TRIGGER IF NOT EXISTS trg_turso_week_plans_insert_log
AFTER INSERT ON week_plans
BEGIN
  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  VALUES (
    NEW.vault_id, 'week_plan', NEW.id, CASE WHEN NEW.deleted_at IS NULL THEN 'create' ELSE 'delete' END,
    NEW.entity_revision,
    json_object(
      'id', NEW.id, 'vault_id', NEW.vault_id, 'user_id', NEW.user_id,
      'week_start_date', NEW.week_start_date, 'week_end_date', NEW.week_end_date,
      'status', NEW.status, 'summary', NEW.summary, 'note', NEW.note,
      'entity_revision', NEW.entity_revision, 'created_at', NEW.created_at,
      'updated_at', NEW.updated_at, 'deleted_at', NEW.deleted_at
    ),
    NEW.deleted_at, NEW.updated_at, NEW.last_mutation_id, CAST(strftime('%s', 'now') AS INTEGER) * 1000
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_week_plans_update_log
AFTER UPDATE ON week_plans
BEGIN
  UPDATE week_plans
    SET entity_revision = OLD.entity_revision + 1
    WHERE vault_id = NEW.vault_id AND id = NEW.id AND entity_revision = OLD.entity_revision;

  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  SELECT
    current.vault_id, 'week_plan', current.id, CASE WHEN current.deleted_at IS NULL THEN 'update' ELSE 'delete' END,
    current.entity_revision,
    json_object(
      'id', current.id, 'vault_id', current.vault_id, 'user_id', current.user_id,
      'week_start_date', current.week_start_date, 'week_end_date', current.week_end_date,
      'status', current.status, 'summary', current.summary, 'note', current.note,
      'entity_revision', current.entity_revision, 'created_at', current.created_at,
      'updated_at', current.updated_at, 'deleted_at', current.deleted_at
    ),
    current.deleted_at, current.updated_at,
    COALESCE(current.last_mutation_id, 'studio:week_plan:' || current.id || ':' || lower(hex(randomblob(16)))),
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
  FROM week_plans AS current
  WHERE current.vault_id = NEW.vault_id AND current.id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_week_plans_delete_log
AFTER DELETE ON week_plans
BEGIN
  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  VALUES (
    OLD.vault_id, 'week_plan', OLD.id, 'delete', OLD.entity_revision + 1,
    json_object(
      'id', OLD.id, 'vault_id', OLD.vault_id, 'user_id', OLD.user_id,
      'week_start_date', OLD.week_start_date, 'week_end_date', OLD.week_end_date,
      'status', OLD.status, 'summary', OLD.summary, 'note', OLD.note,
      'entity_revision', OLD.entity_revision + 1, 'created_at', OLD.created_at,
      'updated_at', OLD.updated_at, 'deleted_at', COALESCE(OLD.deleted_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
    ),
    COALESCE(OLD.deleted_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    OLD.updated_at,
    COALESCE(OLD.last_mutation_id, 'studio:week_plan:' || OLD.id || ':' || lower(hex(randomblob(16)))),
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_week_plan_items_insert_log
AFTER INSERT ON week_plan_items
BEGIN
  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  VALUES (
    NEW.vault_id, 'week_plan_item', NEW.id, CASE WHEN NEW.deleted_at IS NULL THEN 'create' ELSE 'delete' END,
    NEW.entity_revision,
    json_object(
      'id', NEW.id, 'vault_id', NEW.vault_id, 'user_id', NEW.user_id,
      'week_plan_id', NEW.week_plan_id, 'backlog_item_id', NEW.backlog_item_id,
      'status', NEW.status, 'local_date', NEW.local_date, 'start_time', NEW.start_time,
      'end_time', NEW.end_time, 'title', NEW.title, 'path_id', NEW.path_id,
      'template_id', NEW.template_id, 'expedition_id', NEW.expedition_id,
      'milestone_id', NEW.milestone_id, 'expedition_context', NEW.expedition_context,
      'milestone_context', NEW.milestone_context, 'description', NEW.description,
      'note', NEW.note, 'origin', NEW.origin, 'block_key', NEW.block_key,
      'deterministic_import_key', NEW.deterministic_import_key, 'import_batch_id', NEW.import_batch_id,
      'created_mark_instance_id', NEW.created_mark_instance_id, 'sort_order', NEW.sort_order,
      'order_index', NEW.order_index, 'entity_revision', NEW.entity_revision,
      'created_at', NEW.created_at, 'updated_at', NEW.updated_at, 'deleted_at', NEW.deleted_at
    ),
    NEW.deleted_at, NEW.updated_at, NEW.last_mutation_id, CAST(strftime('%s', 'now') AS INTEGER) * 1000
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_week_plan_items_update_log
AFTER UPDATE ON week_plan_items
BEGIN
  UPDATE week_plan_items
    SET entity_revision = OLD.entity_revision + 1
    WHERE vault_id = NEW.vault_id AND id = NEW.id AND entity_revision = OLD.entity_revision;

  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  SELECT
    current.vault_id, 'week_plan_item', current.id, CASE WHEN current.deleted_at IS NULL THEN 'update' ELSE 'delete' END,
    current.entity_revision,
    json_object(
      'id', current.id, 'vault_id', current.vault_id, 'user_id', current.user_id,
      'week_plan_id', current.week_plan_id, 'backlog_item_id', current.backlog_item_id,
      'status', current.status, 'local_date', current.local_date, 'start_time', current.start_time,
      'end_time', current.end_time, 'title', current.title, 'path_id', current.path_id,
      'template_id', current.template_id, 'expedition_id', current.expedition_id,
      'milestone_id', current.milestone_id, 'expedition_context', current.expedition_context,
      'milestone_context', current.milestone_context, 'description', current.description,
      'note', current.note, 'origin', current.origin, 'block_key', current.block_key,
      'deterministic_import_key', current.deterministic_import_key, 'import_batch_id', current.import_batch_id,
      'created_mark_instance_id', current.created_mark_instance_id, 'sort_order', current.sort_order,
      'order_index', current.order_index, 'entity_revision', current.entity_revision,
      'created_at', current.created_at, 'updated_at', current.updated_at, 'deleted_at', current.deleted_at
    ),
    current.deleted_at, current.updated_at,
    COALESCE(current.last_mutation_id, 'studio:week_plan_item:' || current.id || ':' || lower(hex(randomblob(16)))),
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
  FROM week_plan_items AS current
  WHERE current.vault_id = NEW.vault_id AND current.id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_week_plan_items_delete_log
AFTER DELETE ON week_plan_items
BEGIN
  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  VALUES (
    OLD.vault_id, 'week_plan_item', OLD.id, 'delete', OLD.entity_revision + 1,
    json_object(
      'id', OLD.id, 'vault_id', OLD.vault_id, 'user_id', OLD.user_id,
      'week_plan_id', OLD.week_plan_id, 'backlog_item_id', OLD.backlog_item_id,
      'status', OLD.status, 'local_date', OLD.local_date, 'start_time', OLD.start_time,
      'end_time', OLD.end_time, 'title', OLD.title, 'path_id', OLD.path_id,
      'template_id', OLD.template_id, 'expedition_id', OLD.expedition_id,
      'milestone_id', OLD.milestone_id, 'expedition_context', OLD.expedition_context,
      'milestone_context', OLD.milestone_context, 'description', OLD.description,
      'note', OLD.note, 'origin', OLD.origin, 'block_key', OLD.block_key,
      'deterministic_import_key', OLD.deterministic_import_key, 'import_batch_id', OLD.import_batch_id,
      'created_mark_instance_id', OLD.created_mark_instance_id, 'sort_order', OLD.sort_order,
      'order_index', OLD.order_index, 'entity_revision', OLD.entity_revision + 1,
      'created_at', OLD.created_at, 'updated_at', OLD.updated_at,
      'deleted_at', COALESCE(OLD.deleted_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
    ),
    COALESCE(OLD.deleted_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    OLD.updated_at,
    COALESCE(OLD.last_mutation_id, 'studio:week_plan_item:' || OLD.id || ':' || lower(hex(randomblob(16)))),
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_paths_insert_log
AFTER INSERT ON paths
BEGIN
  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  VALUES (
    NEW.vault_id, 'path', NEW.id, CASE WHEN NEW.deleted_at IS NULL THEN 'create' ELSE 'delete' END,
    NEW.entity_revision,
    json_object(
      'id', NEW.id, 'vault_id', NEW.vault_id, 'user_id', NEW.user_id,
      'name', NEW.name, 'subtitle', NEW.subtitle, 'slug', NEW.slug, 'title', NEW.title,
      'description', NEW.description, 'status', NEW.status, 'color_token', NEW.color_token,
      'icon_key', NEW.icon_key, 'sort_order', NEW.sort_order, 'is_active', NEW.is_active,
      'hero_media_asset_id', NEW.hero_media_asset_id, 'entity_revision', NEW.entity_revision,
      'created_at', NEW.created_at, 'updated_at', NEW.updated_at, 'deleted_at', NEW.deleted_at
    ),
    NEW.deleted_at, NEW.updated_at, NEW.last_mutation_id, CAST(strftime('%s', 'now') AS INTEGER) * 1000
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_paths_update_log
AFTER UPDATE ON paths
BEGIN
  UPDATE paths
    SET entity_revision = OLD.entity_revision + 1
    WHERE vault_id = NEW.vault_id AND id = NEW.id AND entity_revision = OLD.entity_revision;

  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  SELECT
    current.vault_id, 'path', current.id, CASE WHEN current.deleted_at IS NULL THEN 'update' ELSE 'delete' END,
    current.entity_revision,
    json_object(
      'id', current.id, 'vault_id', current.vault_id, 'user_id', current.user_id,
      'name', current.name, 'subtitle', current.subtitle, 'slug', current.slug, 'title', current.title,
      'description', current.description, 'status', current.status, 'color_token', current.color_token,
      'icon_key', current.icon_key, 'sort_order', current.sort_order, 'is_active', current.is_active,
      'hero_media_asset_id', current.hero_media_asset_id, 'entity_revision', current.entity_revision,
      'created_at', current.created_at, 'updated_at', current.updated_at, 'deleted_at', current.deleted_at
    ),
    current.deleted_at, current.updated_at,
    CASE
      WHEN current.last_mutation_id IS NULL OR current.last_mutation_id = OLD.last_mutation_id
        THEN 'studio:path:' || current.id || ':' || lower(hex(randomblob(16)))
      ELSE current.last_mutation_id
    END,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
  FROM paths AS current
  WHERE current.vault_id = NEW.vault_id AND current.id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_paths_delete_log
AFTER DELETE ON paths
BEGIN
  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  VALUES (
    OLD.vault_id, 'path', OLD.id, 'delete', OLD.entity_revision + 1,
    json_object(
      'id', OLD.id, 'vault_id', OLD.vault_id, 'user_id', OLD.user_id,
      'name', OLD.name, 'subtitle', OLD.subtitle, 'slug', OLD.slug, 'title', OLD.title,
      'description', OLD.description, 'status', OLD.status, 'color_token', OLD.color_token,
      'icon_key', OLD.icon_key, 'sort_order', OLD.sort_order, 'is_active', OLD.is_active,
      'hero_media_asset_id', OLD.hero_media_asset_id, 'entity_revision', OLD.entity_revision + 1,
      'created_at', OLD.created_at, 'updated_at', OLD.updated_at,
      'deleted_at', COALESCE(OLD.deleted_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
    ),
    COALESCE(OLD.deleted_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    OLD.updated_at,
    COALESCE(OLD.last_mutation_id, 'studio:path:' || OLD.id || ':' || lower(hex(randomblob(16)))),
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_expeditions_insert_log
AFTER INSERT ON expeditions
BEGIN
  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  VALUES (
    NEW.vault_id, 'expedition', NEW.id, CASE WHEN NEW.deleted_at IS NULL THEN 'create' ELSE 'delete' END,
    NEW.entity_revision,
    json_object(
      'id', NEW.id, 'vault_id', NEW.vault_id, 'user_id', NEW.user_id, 'path_id', NEW.path_id,
      'title', NEW.title, 'purpose', NEW.purpose, 'description', NEW.description,
      'status', NEW.status, 'sort_order', NEW.sort_order, 'start_date', NEW.start_date,
      'target_date', NEW.target_date, 'started_at', NEW.started_at, 'target_end_at', NEW.target_end_at,
      'completed_at', NEW.completed_at, 'hero_media_asset_id', NEW.hero_media_asset_id,
      'entity_revision', NEW.entity_revision, 'created_at', NEW.created_at,
      'updated_at', NEW.updated_at, 'deleted_at', NEW.deleted_at
    ),
    NEW.deleted_at, NEW.updated_at, NEW.last_mutation_id, CAST(strftime('%s', 'now') AS INTEGER) * 1000
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_expeditions_update_log
AFTER UPDATE ON expeditions
BEGIN
  UPDATE expeditions
    SET entity_revision = OLD.entity_revision + 1
    WHERE vault_id = NEW.vault_id AND id = NEW.id AND entity_revision = OLD.entity_revision;

  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  SELECT
    current.vault_id, 'expedition', current.id, CASE WHEN current.deleted_at IS NULL THEN 'update' ELSE 'delete' END,
    current.entity_revision,
    json_object(
      'id', current.id, 'vault_id', current.vault_id, 'user_id', current.user_id, 'path_id', current.path_id,
      'title', current.title, 'purpose', current.purpose, 'description', current.description,
      'status', current.status, 'sort_order', current.sort_order, 'start_date', current.start_date,
      'target_date', current.target_date, 'started_at', current.started_at, 'target_end_at', current.target_end_at,
      'completed_at', current.completed_at, 'hero_media_asset_id', current.hero_media_asset_id,
      'entity_revision', current.entity_revision, 'created_at', current.created_at,
      'updated_at', current.updated_at, 'deleted_at', current.deleted_at
    ),
    current.deleted_at, current.updated_at,
    CASE
      WHEN current.last_mutation_id IS NULL OR current.last_mutation_id = OLD.last_mutation_id
        THEN 'studio:expedition:' || current.id || ':' || lower(hex(randomblob(16)))
      ELSE current.last_mutation_id
    END,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
  FROM expeditions AS current
  WHERE current.vault_id = NEW.vault_id AND current.id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_expeditions_delete_log
AFTER DELETE ON expeditions
BEGIN
  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  VALUES (
    OLD.vault_id, 'expedition', OLD.id, 'delete', OLD.entity_revision + 1,
    json_object(
      'id', OLD.id, 'vault_id', OLD.vault_id, 'user_id', OLD.user_id, 'path_id', OLD.path_id,
      'title', OLD.title, 'purpose', OLD.purpose, 'description', OLD.description,
      'status', OLD.status, 'sort_order', OLD.sort_order, 'start_date', OLD.start_date,
      'target_date', OLD.target_date, 'started_at', OLD.started_at, 'target_end_at', OLD.target_end_at,
      'completed_at', OLD.completed_at, 'hero_media_asset_id', OLD.hero_media_asset_id,
      'entity_revision', OLD.entity_revision + 1, 'created_at', OLD.created_at,
      'updated_at', OLD.updated_at,
      'deleted_at', COALESCE(OLD.deleted_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
    ),
    COALESCE(OLD.deleted_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    OLD.updated_at,
    COALESCE(OLD.last_mutation_id, 'studio:expedition:' || OLD.id || ':' || lower(hex(randomblob(16)))),
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_milestones_insert_log
AFTER INSERT ON milestones
BEGIN
  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  VALUES (
    NEW.vault_id, 'milestone', NEW.id, CASE WHEN NEW.deleted_at IS NULL THEN 'create' ELSE 'delete' END,
    NEW.entity_revision,
    json_object(
      'id', NEW.id, 'vault_id', NEW.vault_id, 'user_id', NEW.user_id,
      'expedition_id', NEW.expedition_id, 'title', NEW.title, 'description', NEW.description,
      'status', NEW.status, 'start_date', NEW.start_date, 'target_date', NEW.target_date,
      'sort_order', NEW.sort_order, 'order_index', NEW.order_index, 'completed_at', NEW.completed_at,
      'entity_revision', NEW.entity_revision, 'created_at', NEW.created_at,
      'updated_at', NEW.updated_at, 'deleted_at', NEW.deleted_at
    ),
    NEW.deleted_at, NEW.updated_at, NEW.last_mutation_id, CAST(strftime('%s', 'now') AS INTEGER) * 1000
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_milestones_update_log
AFTER UPDATE ON milestones
BEGIN
  UPDATE milestones
    SET entity_revision = OLD.entity_revision + 1
    WHERE vault_id = NEW.vault_id AND id = NEW.id AND entity_revision = OLD.entity_revision;

  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  SELECT
    current.vault_id, 'milestone', current.id, CASE WHEN current.deleted_at IS NULL THEN 'update' ELSE 'delete' END,
    current.entity_revision,
    json_object(
      'id', current.id, 'vault_id', current.vault_id, 'user_id', current.user_id,
      'expedition_id', current.expedition_id, 'title', current.title, 'description', current.description,
      'status', current.status, 'start_date', current.start_date, 'target_date', current.target_date,
      'sort_order', current.sort_order, 'order_index', current.order_index, 'completed_at', current.completed_at,
      'entity_revision', current.entity_revision, 'created_at', current.created_at,
      'updated_at', current.updated_at, 'deleted_at', current.deleted_at
    ),
    current.deleted_at, current.updated_at,
    CASE
      WHEN current.last_mutation_id IS NULL OR current.last_mutation_id = OLD.last_mutation_id
        THEN 'studio:milestone:' || current.id || ':' || lower(hex(randomblob(16)))
      ELSE current.last_mutation_id
    END,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
  FROM milestones AS current
  WHERE current.vault_id = NEW.vault_id AND current.id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_turso_milestones_delete_log
AFTER DELETE ON milestones
BEGIN
  INSERT INTO waymark_planning_change_log (
    vault_id, entity_type, entity_id, operation, entity_revision, payload_snapshot,
    deleted_at, updated_at, mutation_id, created_at
  )
  VALUES (
    OLD.vault_id, 'milestone', OLD.id, 'delete', OLD.entity_revision + 1,
    json_object(
      'id', OLD.id, 'vault_id', OLD.vault_id, 'user_id', OLD.user_id,
      'expedition_id', OLD.expedition_id, 'title', OLD.title, 'description', OLD.description,
      'status', OLD.status, 'start_date', OLD.start_date, 'target_date', OLD.target_date,
      'sort_order', OLD.sort_order, 'order_index', OLD.order_index, 'completed_at', OLD.completed_at,
      'entity_revision', OLD.entity_revision + 1, 'created_at', OLD.created_at,
      'updated_at', OLD.updated_at,
      'deleted_at', COALESCE(OLD.deleted_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000)
    ),
    COALESCE(OLD.deleted_at, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    OLD.updated_at,
    COALESCE(OLD.last_mutation_id, 'studio:milestone:' || OLD.id || ':' || lower(hex(randomblob(16)))),
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
  );
END;
`;

export function getWaymarkTursoPlanningSchemaSql(): string {
  return TURSO_PLANNING_SCHEMA_SQL;
}
