import { MigrationDefinition } from "./types";

// The raw .sql files under ./sql are the source-of-truth artifacts for human review.
// This runtime manifest mirrors those files as embedded strings because Metro does not
// execute raw .sql imports without an extra loader/generation step.

export const MIGRATIONS: MigrationDefinition[] = [
  {
    version: 1,
    name: "0001_create_schema_migrations.sql",
    sql: `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);`,
  },
  {
    version: 2,
    name: "0002_create_user_and_settings.sql",
    sql: `
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
);`,
  },
  {
    version: 3,
    name: "0003_create_paths_expeditions_milestones.sql",
    sql: `
CREATE TABLE IF NOT EXISTS paths (
  id TEXT PRIMARY KEY NOT NULL,
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expeditions (
  id TEXT PRIMARY KEY NOT NULL,
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(path_id) REFERENCES paths(id)
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY NOT NULL,
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(expedition_id) REFERENCES expeditions(id)
);`,
  },
  {
    version: 4,
    name: "0004_create_trail_days_and_marks.sql",
    sql: `
CREATE TABLE IF NOT EXISTS trail_days (
  id TEXT PRIMARY KEY NOT NULL,
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, local_date),
  FOREIGN KEY(anchor_path_id) REFERENCES paths(id)
);

CREATE TABLE IF NOT EXISTS mark_templates (
  id TEXT PRIMARY KEY NOT NULL,
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(path_id) REFERENCES paths(id)
);

CREATE TABLE IF NOT EXISTS mark_instances (
  id TEXT PRIMARY KEY NOT NULL,
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(path_id) REFERENCES paths(id),
  FOREIGN KEY(trail_day_id) REFERENCES trail_days(id),
  FOREIGN KEY(template_id) REFERENCES mark_templates(id),
  FOREIGN KEY(expedition_id) REFERENCES expeditions(id),
  FOREIGN KEY(milestone_id) REFERENCES milestones(id)
);`,
  },
  {
    version: 5,
    name: "0005_create_memories_backlog_week_plans.sql",
    sql: `
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
);`,
  },
  {
    version: 6,
    name: "0006_create_pack_checks.sql",
    sql: `
CREATE TABLE IF NOT EXISTS pack_check_templates (
  id TEXT PRIMARY KEY NOT NULL,
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(path_id) REFERENCES paths(id)
);

CREATE TABLE IF NOT EXISTS pack_check_item_templates (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  pack_check_template_id TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_required INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(pack_check_template_id) REFERENCES pack_check_templates(id)
);

CREATE TABLE IF NOT EXISTS pack_check_instances (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  template_id TEXT,
  trail_day_id TEXT NOT NULL,
  target_mark_instance_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  available_from INTEGER,
  due_at INTEGER,
  completed_at INTEGER,
  skipped_at INTEGER,
  cancelled_at INTEGER,
  generation_key TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(template_id) REFERENCES pack_check_templates(id),
  FOREIGN KEY(trail_day_id) REFERENCES trail_days(id),
  FOREIGN KEY(target_mark_instance_id) REFERENCES mark_instances(id)
);

CREATE TABLE IF NOT EXISTS pack_check_item_instances (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  pack_check_instance_id TEXT NOT NULL,
  template_item_id TEXT,
  label TEXT NOT NULL,
  is_required INTEGER NOT NULL DEFAULT 1,
  is_checked INTEGER NOT NULL DEFAULT 0,
  checked_at INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(pack_check_instance_id) REFERENCES pack_check_instances(id)
);`,
  },
  {
    version: 7,
    name: "0007_create_signals_dependencies.sql",
    sql: `
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
);`,
  },
  {
    version: 8,
    name: "0008_create_media_assets.sql",
    sql: `
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  local_uri TEXT,
  thumbnail_uri TEXT,
  remote_uri TEXT,
  backup_status TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  backup_path TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  byte_size INTEGER,
  captured_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0
);`,
  },
  {
    version: 9,
    name: "0009_create_strength_tables.sql",
    sql: `
CREATE TABLE IF NOT EXISTS exercise_definitions (
  id TEXT PRIMARY KEY NOT NULL,
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(path_id) REFERENCES paths(id)
);

CREATE TABLE IF NOT EXISTS workout_routine_templates (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  path_id TEXT NOT NULL,
  mark_template_id TEXT,
  title TEXT NOT NULL,
  routine_type TEXT NOT NULL,
  description TEXT,
  cycle_key TEXT,
  estimated_duration_min INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(path_id) REFERENCES paths(id),
  FOREIGN KEY(mark_template_id) REFERENCES mark_templates(id)
);

CREATE TABLE IF NOT EXISTS routine_exercise_templates (
  id TEXT PRIMARY KEY NOT NULL,
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
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(workout_routine_template_id) REFERENCES workout_routine_templates(id),
  FOREIGN KEY(exercise_definition_id) REFERENCES exercise_definitions(id)
);

CREATE TABLE IF NOT EXISTS workout_session_instances (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  mark_instance_id TEXT NOT NULL,
  routine_template_id TEXT NOT NULL,
  status TEXT NOT NULL,
  phase TEXT NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  current_exercise_snapshot_id TEXT,
  current_set_number INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(mark_instance_id) REFERENCES mark_instances(id),
  FOREIGN KEY(routine_template_id) REFERENCES workout_routine_templates(id)
);

CREATE TABLE IF NOT EXISTS session_exercise_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  workout_session_instance_id TEXT NOT NULL,
  routine_exercise_template_id TEXT,
  exercise_definition_id TEXT NOT NULL,
  exercise_name_snapshot TEXT NOT NULL,
  phase TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_load_kg REAL,
  target_reps INTEGER,
  target_sets INTEGER,
  target_duration_sec INTEGER,
  target_distance_m INTEGER,
  target_steps INTEGER,
  was_overridden INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(workout_session_instance_id) REFERENCES workout_session_instances(id),
  FOREIGN KEY(routine_exercise_template_id) REFERENCES routine_exercise_templates(id),
  FOREIGN KEY(exercise_definition_id) REFERENCES exercise_definitions(id)
);

CREATE TABLE IF NOT EXISTS exercise_set_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  session_exercise_snapshot_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  actual_load_kg REAL,
  actual_reps INTEGER,
  actual_duration_sec INTEGER,
  actual_distance_m INTEGER,
  actual_steps INTEGER,
  completed INTEGER NOT NULL DEFAULT 0,
  failed_reason TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(session_exercise_snapshot_id) REFERENCES session_exercise_snapshots(id)
);

CREATE TABLE IF NOT EXISTS exercise_progress_states (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  exercise_definition_id TEXT NOT NULL,
  current_load_kg REAL,
  current_reps INTEGER,
  current_duration_sec INTEGER,
  current_distance_m INTEGER,
  current_steps INTEGER,
  current_target_load_kg REAL,
  current_target_reps INTEGER,
  current_target_sets INTEGER,
  current_target_duration_sec INTEGER,
  current_target_distance_m INTEGER,
  current_target_steps INTEGER,
  success_count_since_progression INTEGER NOT NULL DEFAULT 0,
  last_session_result TEXT,
  last_progressed_at INTEGER,
  manual_override INTEGER NOT NULL DEFAULT 0,
  last_session_at INTEGER,
  last_progression_outcome TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(exercise_definition_id) REFERENCES exercise_definitions(id)
);`,
  },
  {
    version: 10,
    name: "0010_create_indexes.sql",
    sql: `
CREATE INDEX IF NOT EXISTS idx_paths_user_sort ON paths(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_expeditions_path_status ON expeditions(path_id, status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_milestones_expedition_date ON milestones(expedition_id, target_date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_trail_days_user_date ON trail_days(user_id, local_date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_mark_templates_path_active ON mark_templates(path_id, is_active, deleted_at);
CREATE INDEX IF NOT EXISTS idx_mark_instances_day_status ON mark_instances(trail_day_id, status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_mark_instances_path_status ON mark_instances(path_id, status, deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS ux_mark_instances_generation_key_active
  ON mark_instances(user_id, generation_key)
  WHERE generation_key IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memories_day ON memories(trail_day_id, captured_at, deleted_at);
CREATE INDEX IF NOT EXISTS idx_reflection_entries_trail_day ON reflection_entries(trail_day_id, order_index, deleted_at);
CREATE INDEX IF NOT EXISTS idx_backlog_path_status ON backlog_items(path_id, status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_week_plans_user_week ON week_plans(user_id, week_start_date, deleted_at);
CREATE INDEX IF NOT EXISTS idx_week_plan_items_week ON week_plan_items(week_plan_id, status, sort_order, deleted_at);
CREATE INDEX IF NOT EXISTS idx_pack_check_instances_day_status ON pack_check_instances(trail_day_id, status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_pack_check_instances_target ON pack_check_instances(target_mark_instance_id, deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pack_check_instances_generation_key_active
  ON pack_check_instances(user_id, generation_key)
  WHERE generation_key IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_signals_scheduled_status ON signals(scheduled_at, status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_signals_target ON signals(target_type, target_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_dependencies_dependent ON mark_dependencies(dependent_mark_instance_id, status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_dependencies_required ON mark_dependencies(required_entity_type, required_entity_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_media_owner ON media_assets(owner_type, owner_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_exercise_definitions_slug ON exercise_definitions(canonical_slug, deleted_at);
CREATE INDEX IF NOT EXISTS idx_workout_routines_path_active ON workout_routine_templates(path_id, is_active, deleted_at);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_order ON routine_exercise_templates(workout_routine_template_id, order_index, deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS ux_workout_sessions_mark_active
  ON workout_session_instances(mark_instance_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_session_snapshots_session_order ON session_exercise_snapshots(workout_session_instance_id, order_index, deleted_at);
CREATE INDEX IF NOT EXISTS idx_set_logs_snapshot_set ON exercise_set_logs(session_exercise_snapshot_id, set_number, deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS ux_exercise_progress_states_user_exercise_active
  ON exercise_progress_states(user_id, exercise_definition_id)
  WHERE deleted_at IS NULL;`,
  },
  {
    version: 11,
    name: "0011_create_mark_pack_check_rules.sql",
    sql: `
CREATE TABLE IF NOT EXISTS mark_pack_check_rules (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  mark_template_id TEXT NOT NULL,
  pack_check_template_id TEXT NOT NULL,
  available_offset_min INTEGER,
  due_offset_min INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(mark_template_id) REFERENCES mark_templates(id),
  FOREIGN KEY(pack_check_template_id) REFERENCES pack_check_templates(id)
);

CREATE INDEX IF NOT EXISTS idx_mark_pack_check_rules_mark_template
  ON mark_pack_check_rules(mark_template_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_mark_pack_check_rules_pack_check_template
  ON mark_pack_check_rules(pack_check_template_id, deleted_at);`,
  },
  {
    version: 12,
    name: "0012_add_signal_cancelled_at.sql",
    sql: `
ALTER TABLE signals ADD COLUMN cancelled_at INTEGER;`,
  },
  {
    version: 13,
    name: "0013_extend_week_plan_items_for_timetable.sql",
    sql: `
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
  WHERE deterministic_import_key IS NOT NULL AND deleted_at IS NULL;`,
  },
  {
    version: 14,
    name: "0014_extend_media_assets_for_multimedia.sql",
    sql: `
ALTER TABLE media_assets ADD COLUMN kind TEXT NOT NULL DEFAULT 'image';
ALTER TABLE media_assets ADD COLUMN duration_ms INTEGER;
ALTER TABLE media_assets ADD COLUMN sort_index INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_media_owner_sort
  ON media_assets(owner_type, owner_id, sort_index, created_at, deleted_at);`,
  },
  {
    version: 15,
    name: "0015_create_vault_provenance_tables.sql",
    sql: `
CREATE TABLE IF NOT EXISTS vaults (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  client_type TEXT NOT NULL CHECK (client_type IN ('main', 'lite')),
  device_name TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  FOREIGN KEY(vault_id) REFERENCES vaults(id)
);

CREATE TABLE IF NOT EXISTS app_db_metadata (
  db_instance_id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  client_type TEXT NOT NULL CHECK (client_type IN ('main', 'lite')),
  schema_version INTEGER NOT NULL,
  map_version INTEGER NOT NULL,
  seed_version INTEGER NOT NULL,
  restore_state TEXT NOT NULL CHECK (restore_state IN ('fresh_local', 'restored_from_cloud', 'migrated_existing', 'dev_reset')),
  created_at INTEGER NOT NULL,
  last_migration_at INTEGER NOT NULL,
  last_seed_at INTEGER,
  last_cloud_sync_at INTEGER,
  FOREIGN KEY(vault_id) REFERENCES vaults(id),
  FOREIGN KEY(device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS sync_state (
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  last_cloud_revision INTEGER NOT NULL DEFAULT 0,
  last_successful_sync_at INTEGER,
  sync_mode TEXT NOT NULL CHECK (sync_mode IN ('none', 'manual', 'eod')),
  protection_status TEXT NOT NULL CHECK (protection_status IN ('local_only', 'cloud_configured', 'syncing', 'protected', 'error')),
  PRIMARY KEY (vault_id, device_id),
  FOREIGN KEY(vault_id) REFERENCES vaults(id),
  FOREIGN KEY(device_id) REFERENCES devices(id)
);

CREATE INDEX IF NOT EXISTS idx_devices_vault_client
  ON devices(vault_id, client_type);

CREATE INDEX IF NOT EXISTS idx_app_db_metadata_vault_device
  ON app_db_metadata(vault_id, device_id);`,
  },
  {
    version: 16,
    name: "0016_create_daily_media_upload_batches.sql",
    sql: `
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
  ON daily_media_upload_batches(user_id, local_date, status, deleted_at);`,
  },
  {
    version: 17,
    name: "0017_add_exercise_set_log_metadata.sql",
    sql: `
ALTER TABLE exercise_set_logs ADD COLUMN metadata_json TEXT;`,
  },
  {
    version: 18,
    name: "0018_create_sync_outbox_and_mark_details.sql",
    sql: `
CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  db_instance_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mark_instance', 'memory', 'media_asset', 'trail_day')),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  idempotency_key TEXT NOT NULL,
  local_revision INTEGER NOT NULL,
  base_remote_revision INTEGER,
  payload_json TEXT NOT NULL,
  payload_schema_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('pending', 'syncing', 'synced', 'failed', 'conflict')) DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  UNIQUE(idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_pending
  ON sync_outbox(vault_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity
  ON sync_outbox(entity_type, entity_id, status);

CREATE TABLE IF NOT EXISTS sync_tombstones (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mark_instance', 'memory', 'media_asset', 'trail_day')),
  entity_id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  local_revision INTEGER NOT NULL,
  reason TEXT,
  PRIMARY KEY (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS mark_instance_details (
  mark_instance_id TEXT PRIMARY KEY NOT NULL,
  primer_snapshot TEXT,
  pre_action_comment TEXT,
  post_action_feedback TEXT,
  user_edited_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sync_status TEXT NOT NULL DEFAULT 'local',
  local_revision INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(mark_instance_id) REFERENCES mark_instances(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_media_assets_user_content_owner_active
  ON media_assets(user_id, content_hash, owner_type, owner_id)
  WHERE content_hash IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_drive_file
  ON media_assets(drive_file_id, deleted_at)
  WHERE drive_file_id IS NOT NULL;`,
  },
  {
    version: 19,
    name: "0019_extend_sync_outbox_entity_types.sql",
    sql: `
DROP INDEX IF EXISTS idx_sync_outbox_pending;
DROP INDEX IF EXISTS idx_sync_outbox_entity;

ALTER TABLE sync_outbox RENAME TO sync_outbox_legacy;

CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  db_instance_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mark_instance', 'mark_instance_detail', 'memory', 'media_asset', 'trail_day', 'week_plan', 'week_plan_item', 'signal')),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  idempotency_key TEXT NOT NULL,
  local_revision INTEGER NOT NULL,
  base_remote_revision INTEGER,
  payload_json TEXT NOT NULL,
  payload_schema_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('pending', 'syncing', 'synced', 'failed', 'conflict')) DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  UNIQUE(idempotency_key)
);

INSERT INTO sync_outbox (
  id,
  vault_id,
  device_id,
  db_instance_id,
  entity_type,
  entity_id,
  operation,
  idempotency_key,
  local_revision,
  base_remote_revision,
  payload_json,
  payload_schema_version,
  status,
  retry_count,
  last_error,
  created_at,
  updated_at,
  synced_at
)
SELECT
  id,
  vault_id,
  device_id,
  db_instance_id,
  entity_type,
  entity_id,
  operation,
  idempotency_key,
  local_revision,
  base_remote_revision,
  payload_json,
  payload_schema_version,
  status,
  retry_count,
  last_error,
  created_at,
  updated_at,
  synced_at
FROM sync_outbox_legacy
WHERE entity_type IN ('mark_instance', 'memory', 'media_asset', 'trail_day');

DROP TABLE sync_outbox_legacy;

CREATE INDEX IF NOT EXISTS idx_sync_outbox_pending
  ON sync_outbox(vault_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity
  ON sync_outbox(entity_type, entity_id, status);

ALTER TABLE sync_tombstones RENAME TO sync_tombstones_legacy;

CREATE TABLE IF NOT EXISTS sync_tombstones (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('mark_instance', 'mark_instance_detail', 'memory', 'media_asset', 'trail_day', 'week_plan', 'week_plan_item', 'signal')),
  entity_id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  local_revision INTEGER NOT NULL,
  reason TEXT,
  PRIMARY KEY (entity_type, entity_id)
);

INSERT INTO sync_tombstones (
  entity_type,
  entity_id,
  vault_id,
  device_id,
  deleted_at,
  local_revision,
  reason
)
SELECT
  entity_type,
  entity_id,
  vault_id,
  device_id,
  deleted_at,
  local_revision,
  reason
FROM sync_tombstones_legacy
WHERE entity_type IN ('mark_instance', 'memory', 'media_asset', 'trail_day');

DROP TABLE sync_tombstones_legacy;`,
  },
  {
    version: 20,
    name: "0020_extend_sync_outbox_all_waymark_tables.sql",
    sql: `DROP INDEX IF EXISTS idx_sync_outbox_pending;
DROP INDEX IF EXISTS idx_sync_outbox_entity;

ALTER TABLE sync_outbox RENAME TO sync_outbox_legacy;

CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  db_instance_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'app_db_metadata',
    'app_setting',
    'backlog_item',
    'daily_media_upload_batch',
    'device',
    'exercise_definition',
    'exercise_progress_state',
    'exercise_set_log',
    'expedition',
    'mark_dependency',
    'mark_instance',
    'mark_instance_detail',
    'mark_pack_check_rule',
    'mark_template',
    'media_asset',
    'memory',
    'milestone',
    'pack_check_instance',
    'pack_check_item_instance',
    'pack_check_item_template',
    'pack_check_template',
    'path',
    'reflection_entry',
    'routine_exercise_template',
    'session_exercise_snapshot',
    'signal',
    'sync_state',
    'trail_day',
    'user_profile',
    'vault',
    'week_plan',
    'week_plan_item',
    'workout_routine_template',
    'workout_session_instance'
  )),
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  idempotency_key TEXT NOT NULL,
  local_revision INTEGER NOT NULL,
  base_remote_revision INTEGER,
  payload_json TEXT NOT NULL,
  payload_schema_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('pending', 'syncing', 'synced', 'failed', 'conflict')) DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  UNIQUE(idempotency_key)
);

INSERT INTO sync_outbox (
  id,
  vault_id,
  device_id,
  db_instance_id,
  entity_type,
  entity_id,
  operation,
  idempotency_key,
  local_revision,
  base_remote_revision,
  payload_json,
  payload_schema_version,
  status,
  retry_count,
  last_error,
  created_at,
  updated_at,
  synced_at
)
SELECT
  id,
  vault_id,
  device_id,
  db_instance_id,
  entity_type,
  entity_id,
  operation,
  idempotency_key,
  local_revision,
  base_remote_revision,
  payload_json,
  payload_schema_version,
  status,
  retry_count,
  last_error,
  created_at,
  updated_at,
  synced_at
FROM sync_outbox_legacy;

DROP TABLE sync_outbox_legacy;

CREATE INDEX IF NOT EXISTS idx_sync_outbox_pending
  ON sync_outbox(vault_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity
  ON sync_outbox(entity_type, entity_id, status);

ALTER TABLE sync_tombstones RENAME TO sync_tombstones_legacy;

CREATE TABLE IF NOT EXISTS sync_tombstones (
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'app_db_metadata',
    'app_setting',
    'backlog_item',
    'daily_media_upload_batch',
    'device',
    'exercise_definition',
    'exercise_progress_state',
    'exercise_set_log',
    'expedition',
    'mark_dependency',
    'mark_instance',
    'mark_instance_detail',
    'mark_pack_check_rule',
    'mark_template',
    'media_asset',
    'memory',
    'milestone',
    'pack_check_instance',
    'pack_check_item_instance',
    'pack_check_item_template',
    'pack_check_template',
    'path',
    'reflection_entry',
    'routine_exercise_template',
    'session_exercise_snapshot',
    'signal',
    'sync_state',
    'trail_day',
    'user_profile',
    'vault',
    'week_plan',
    'week_plan_item',
    'workout_routine_template',
    'workout_session_instance'
  )),
  entity_id TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  local_revision INTEGER NOT NULL,
  reason TEXT,
  PRIMARY KEY (entity_type, entity_id)
);

INSERT INTO sync_tombstones (
  entity_type,
  entity_id,
  vault_id,
  device_id,
  deleted_at,
  local_revision,
  reason
)
SELECT
  entity_type,
  entity_id,
  vault_id,
  device_id,
  deleted_at,
  local_revision,
  reason
FROM sync_tombstones_legacy;

DROP TABLE sync_tombstones_legacy;`,
  },
  {
    version: 21,
    name: "0021_create_planning_pull_state.sql",
    sql: `CREATE TABLE IF NOT EXISTS planning_sync_state (
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  last_planning_change_sequence INTEGER NOT NULL DEFAULT 0,
  last_pull_started_at INTEGER,
  last_pull_completed_at INTEGER,
  last_pull_status TEXT NOT NULL DEFAULT 'idle' CHECK (last_pull_status IN ('idle', 'pulling', 'success', 'error')),
  last_error TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (vault_id, device_id),
  FOREIGN KEY(vault_id) REFERENCES vaults(id),
  FOREIGN KEY(device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS planning_entity_state (
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('week_plan', 'week_plan_item', 'signal', 'path', 'expedition', 'milestone')),
  entity_id TEXT NOT NULL,
  entity_revision INTEGER NOT NULL,
  last_change_sequence INTEGER NOT NULL,
  last_pulled_at INTEGER NOT NULL,
  PRIMARY KEY (vault_id, entity_type, entity_id),
  FOREIGN KEY(vault_id) REFERENCES vaults(id)
);

CREATE TABLE IF NOT EXISTS planning_side_effect_retries (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('week_plan', 'week_plan_item', 'signal', 'path', 'expedition', 'milestone')),
  entity_id TEXT NOT NULL,
  side_effect_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(vault_id) REFERENCES vaults(id)
);

CREATE INDEX IF NOT EXISTS idx_planning_side_effect_retries_pending
  ON planning_side_effect_retries(vault_id, status, created_at);`,
  },
  {
    version: 22,
    name: "0022_create_planning_conflicts.sql",
    sql: `CREATE TABLE IF NOT EXISTS planning_conflicts (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('path', 'expedition', 'milestone')),
  entity_id TEXT NOT NULL,
  local_revision INTEGER NOT NULL,
  remote_entity_revision INTEGER NOT NULL,
  remote_change_sequence INTEGER NOT NULL,
  reason TEXT NOT NULL,
  remote_snapshot_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(vault_id, entity_type, entity_id),
  FOREIGN KEY(vault_id) REFERENCES vaults(id)
);

CREATE INDEX IF NOT EXISTS idx_planning_conflicts_open
  ON planning_conflicts(vault_id, status, updated_at);`,
  },
  {
    version: 23,
    name: "0023_add_turso_full_db_cursor_state.sql",
    sql: `ALTER TABLE sync_state ADD COLUMN full_db_schema_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sync_state ADD COLUMN full_db_snapshot_completed_at INTEGER;`,
  },
  {
    version: 24,
    name: "0024_add_application_provenance.sql",
    sql: `ALTER TABLE devices ADD COLUMN application_id TEXT;
ALTER TABLE app_db_metadata ADD COLUMN application_id TEXT;
ALTER TABLE sync_outbox ADD COLUMN source_application_id TEXT;
ALTER TABLE sync_tombstones ADD COLUMN source_application_id TEXT;

CREATE INDEX IF NOT EXISTS idx_sync_outbox_application_pending
  ON sync_outbox(vault_id, source_application_id, status, created_at);`,
  },
  {
    version: 25,
    name: "0025_harden_sync_outbox.sql",
    sql: `DROP INDEX IF EXISTS idx_sync_outbox_pending;
DROP INDEX IF EXISTS idx_sync_outbox_entity;
DROP INDEX IF EXISTS idx_sync_outbox_application_pending;

ALTER TABLE sync_outbox RENAME TO sync_outbox_legacy;

CREATE TABLE sync_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  db_instance_id TEXT NOT NULL,
  source_application_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  idempotency_key TEXT NOT NULL,
  local_revision INTEGER NOT NULL,
  base_remote_revision INTEGER,
  payload_json TEXT NOT NULL,
  payload_schema_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'syncing', 'synced', 'failed', 'conflict',
    'superseded', 'retry_wait', 'quarantined'
  )) DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  error_kind TEXT,
  next_attempt_at INTEGER,
  remote_revision INTEGER,
  canonical_entity_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  UNIQUE(idempotency_key)
);

INSERT INTO sync_outbox (
  id, vault_id, device_id, db_instance_id, source_application_id,
  entity_type, entity_id, operation, idempotency_key, local_revision,
  base_remote_revision, payload_json, payload_schema_version, status,
  retry_count, last_error, error_kind, next_attempt_at, remote_revision,
  canonical_entity_id, created_at, updated_at, synced_at
)
SELECT
  id, vault_id, device_id, db_instance_id, source_application_id,
  entity_type, entity_id, operation, idempotency_key, local_revision,
  base_remote_revision, payload_json, payload_schema_version, status,
  retry_count, last_error, NULL, NULL, NULL, NULL,
  created_at, updated_at, synced_at
FROM sync_outbox_legacy;

DROP TABLE sync_outbox_legacy;

CREATE INDEX idx_sync_outbox_pending
  ON sync_outbox(vault_id, status, created_at);

CREATE INDEX idx_sync_outbox_entity
  ON sync_outbox(entity_type, entity_id, status);

CREATE INDEX idx_sync_outbox_application_pending
  ON sync_outbox(vault_id, source_application_id, status, next_attempt_at, created_at);`,
  },
];
