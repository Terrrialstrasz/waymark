export const WAYMARK_TURSO_PLANNING_ENTITY_TYPES = [
  "week_plan",
  "week_plan_item",
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
  "signal",
  "path",
  "expedition",
  "mark_instance",
] as const satisfies readonly WaymarkTursoPlanningEntityType[];

export type WaymarkTursoDevClearTable = {
  tableName: string;
  vaultScoped: boolean;
};

export const WAYMARK_TURSO_DEV_CLEAR_TABLES = [
  { tableName: "mark_instances", vaultScoped: true },
  { tableName: "expeditions", vaultScoped: true },
  { tableName: "paths", vaultScoped: true },
  { tableName: "week_plan_items", vaultScoped: true },
  { tableName: "week_plans", vaultScoped: true },
  { tableName: "signals", vaultScoped: true },
  { tableName: "waymark_planning_change_log", vaultScoped: true },
  { tableName: "waymark_planning_idempotency", vaultScoped: true },
  { tableName: "waymark_remote_change_log", vaultScoped: true },
  { tableName: "waymark_remote_records", vaultScoped: true },
  { tableName: "waymark_remote_idempotency", vaultScoped: true },
] as const satisfies readonly WaymarkTursoDevClearTable[];

const PLANNING_ENTITY_TYPE_CHECK =
  "entity_type IN ('week_plan', 'week_plan_item', 'signal', 'path', 'expedition', 'milestone', 'mark_instance')";

export const TURSO_PLANNING_SCHEMA_SQL = `
DROP TRIGGER IF EXISTS trg_turso_week_plans_insert_log;
DROP TRIGGER IF EXISTS trg_turso_week_plans_update_log;
DROP TRIGGER IF EXISTS trg_turso_week_plans_delete_log;
DROP TRIGGER IF EXISTS trg_turso_week_plan_items_insert_log;
DROP TRIGGER IF EXISTS trg_turso_week_plan_items_update_log;
DROP TRIGGER IF EXISTS trg_turso_week_plan_items_delete_log;

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
WHERE entity_type IN ('week_plan', 'week_plan_item', 'signal', 'path', 'expedition', 'milestone', 'mark_instance');

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
WHERE entity_type IN ('week_plan', 'week_plan_item', 'signal', 'path', 'expedition', 'milestone', 'mark_instance');

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
WHERE entity_type IN ('week_plan', 'week_plan_item', 'signal', 'path', 'expedition', 'milestone', 'mark_instance');

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
  FOREIGN KEY(vault_id, expedition_id) REFERENCES expeditions(vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_mark_instances_expedition
  ON mark_instances(vault_id, expedition_id, status, scheduled_start_at, deleted_at);

CREATE INDEX IF NOT EXISTS idx_turso_mark_instances_path_schedule
  ON mark_instances(vault_id, path_id, status, scheduled_start_at, deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_turso_mark_instances_generation_key_active
  ON mark_instances(vault_id, user_id, generation_key)
  WHERE generation_key IS NOT NULL AND deleted_at IS NULL;

CREATE VIEW IF NOT EXISTS expedition_planned_marks AS
SELECT
  m.vault_id,
  p.id AS path_id,
  p.title AS path_title,
  e.id AS expedition_id,
  e.title AS expedition_title,
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
  m.deleted_at,
  m.updated_at
FROM mark_instances m
JOIN expeditions e ON e.vault_id = m.vault_id AND e.id = m.expedition_id
JOIN paths p ON p.vault_id = m.vault_id AND p.id = m.path_id
WHERE m.expedition_id IS NOT NULL;

INSERT INTO waymark_planning_authority (entity_type, mode, schema_version, activated_at, updated_at)
VALUES
  ('week_plan', 'editable_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('week_plan_item', 'editable_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('signal', 'editable_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('path', 'synced_readonly_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('expedition', 'synced_readonly_remote', 1, CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('milestone', 'inactive', 1, NULL, CAST(strftime('%s', 'now') AS INTEGER) * 1000),
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
`;

export function getWaymarkTursoPlanningSchemaSql(): string {
  return TURSO_PLANNING_SCHEMA_SQL;
}
