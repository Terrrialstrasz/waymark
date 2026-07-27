DROP INDEX IF EXISTS idx_week_plan_items_week;

ALTER TABLE week_plan_items RENAME TO week_plan_items_legacy;

CREATE TABLE IF NOT EXISTS week_plan_items (
  id TEXT PRIMARY KEY NOT NULL,
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(week_plan_id) REFERENCES week_plans(id),
  FOREIGN KEY(backlog_item_id) REFERENCES backlog_items(id),
  FOREIGN KEY(path_id) REFERENCES paths(id),
  FOREIGN KEY(template_id) REFERENCES mark_templates(id),
  FOREIGN KEY(expedition_id) REFERENCES expeditions(id),
  FOREIGN KEY(milestone_id) REFERENCES milestones(id),
  FOREIGN KEY(created_mark_instance_id) REFERENCES mark_instances(id)
);

INSERT INTO week_plan_items (
  id,
  user_id,
  week_plan_id,
  backlog_item_id,
  status,
  created_mark_instance_id,
  sort_order,
  order_index,
  created_at,
  updated_at,
  deleted_at,
  sync_status,
  local_revision
)
SELECT
  id,
  user_id,
  week_plan_id,
  backlog_item_id,
  status,
  created_mark_instance_id,
  sort_order,
  order_index,
  created_at,
  updated_at,
  deleted_at,
  sync_status,
  local_revision
FROM week_plan_items_legacy;

DROP TABLE week_plan_items_legacy;

CREATE INDEX IF NOT EXISTS idx_week_plan_items_week ON week_plan_items(week_plan_id, status, sort_order, deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS ux_week_plan_items_import_key_active
  ON week_plan_items(user_id, deterministic_import_key)
  WHERE deterministic_import_key IS NOT NULL AND deleted_at IS NULL;
