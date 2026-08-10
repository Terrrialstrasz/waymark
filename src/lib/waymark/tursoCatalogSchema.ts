export const TURSO_CATALOG_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS mark_templates (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  path_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL,
  recurrence_type TEXT NOT NULL,
  recurrence_rule_json TEXT NOT NULL,
  default_duration_min INTEGER,
  default_signal_rule_json TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  catalog_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_import_id TEXT,
  PRIMARY KEY (vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_mark_templates_path_active
  ON mark_templates(vault_id, path_id, is_active, deleted_at);

CREATE TABLE IF NOT EXISTS pack_check_templates (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  path_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  template_type TEXT,
  default_timing_rule_json TEXT,
  default_available_offset_min INTEGER,
  default_due_offset_min INTEGER,
  default_signal_rule_json TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  catalog_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_import_id TEXT,
  PRIMARY KEY (vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_pack_check_templates_path_active
  ON pack_check_templates(vault_id, path_id, is_active, deleted_at);

CREATE TABLE IF NOT EXISTS pack_check_item_templates (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  pack_check_template_id TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_required INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL,
  catalog_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_import_id TEXT,
  PRIMARY KEY (vault_id, id),
  FOREIGN KEY(vault_id, pack_check_template_id) REFERENCES pack_check_templates(vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_pack_check_item_templates_parent_sort
  ON pack_check_item_templates(vault_id, pack_check_template_id, sort_order, order_index, deleted_at);

CREATE TABLE IF NOT EXISTS mark_pack_check_rules (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  mark_template_id TEXT NOT NULL,
  pack_check_template_id TEXT NOT NULL,
  available_offset_min INTEGER,
  due_offset_min INTEGER,
  catalog_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_import_id TEXT,
  PRIMARY KEY (vault_id, id),
  FOREIGN KEY(vault_id, mark_template_id) REFERENCES mark_templates(vault_id, id),
  FOREIGN KEY(vault_id, pack_check_template_id) REFERENCES pack_check_templates(vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_mark_pack_check_rules_mark
  ON mark_pack_check_rules(vault_id, mark_template_id, deleted_at);

CREATE TABLE IF NOT EXISTS exercise_definitions (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT,
  path_id TEXT,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  canonical_slug TEXT NOT NULL,
  category TEXT NOT NULL,
  measurement_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  default_rest_sec INTEGER,
  default_unit TEXT,
  equipment TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  catalog_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_import_id TEXT,
  PRIMARY KEY (vault_id, id),
  UNIQUE(vault_id, canonical_slug)
);

CREATE INDEX IF NOT EXISTS idx_turso_exercise_definitions_path
  ON exercise_definitions(vault_id, path_id, category, deleted_at);

CREATE TABLE IF NOT EXISTS workout_routine_templates (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  path_id TEXT NOT NULL,
  mark_template_id TEXT,
  title TEXT NOT NULL,
  routine_type TEXT NOT NULL,
  description TEXT,
  cycle_key TEXT,
  estimated_duration_min INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  catalog_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_import_id TEXT,
  PRIMARY KEY (vault_id, id),
  FOREIGN KEY(vault_id, mark_template_id) REFERENCES mark_templates(vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_workout_routine_templates_path_active
  ON workout_routine_templates(vault_id, path_id, is_active, deleted_at);

CREATE TABLE IF NOT EXISTS routine_exercise_templates (
  id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  workout_routine_template_id TEXT NOT NULL,
  exercise_definition_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_load_kg REAL,
  target_reps INTEGER,
  target_sets INTEGER,
  target_duration_sec INTEGER,
  target_distance_m INTEGER,
  target_steps INTEGER,
  rest_duration_sec INTEGER,
  progression_policy_json TEXT,
  catalog_revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  last_import_id TEXT,
  PRIMARY KEY (vault_id, id),
  FOREIGN KEY(vault_id, workout_routine_template_id) REFERENCES workout_routine_templates(vault_id, id),
  FOREIGN KEY(vault_id, exercise_definition_id) REFERENCES exercise_definitions(vault_id, id)
);

CREATE INDEX IF NOT EXISTS idx_turso_routine_exercise_templates_parent_sort
  ON routine_exercise_templates(vault_id, workout_routine_template_id, phase, order_index, deleted_at);
`;

export function getWaymarkTursoCatalogSchemaSql(): string {
  return TURSO_CATALOG_SCHEMA_SQL;
}
