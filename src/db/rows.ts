export type DbSyncStatus = "local" | "dirty" | "synced" | "conflict";

export interface MutableDbRow {
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  sync_status: DbSyncStatus;
  local_revision: number;
}

export interface UserProfileRow extends MutableDbRow {
  id: string;
  user_id: string;
  display_name: string | null;
  locale: string;
  timezone: string;
  week_starts_on: number;
  close_trail_prompt_time: string | null;
}

export interface AppSettingRow extends MutableDbRow {
  id: string;
  user_id: string;
  key: string;
  value_json: string;
}

export interface PathRow extends MutableDbRow {
  id: string;
  user_id: string;
  name: string;
  subtitle: string | null;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  color_token: string | null;
  icon_key: string | null;
  sort_order: number;
  is_active: number;
  hero_media_asset_id: string | null;
}

export interface ExpeditionRow extends MutableDbRow {
  id: string;
  user_id: string;
  path_id: string;
  title: string;
  purpose: string | null;
  description: string | null;
  status: string;
  sort_order: number;
  start_date: string | null;
  target_date: string | null;
  started_at: number | null;
  target_end_at: number | null;
  completed_at: number | null;
  hero_media_asset_id: string | null;
}

export interface MilestoneRow extends MutableDbRow {
  id: string;
  user_id: string;
  expedition_id: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  target_date: string | null;
  sort_order: number;
  order_index: number;
  completed_at: number | null;
}

export interface TrailDayRow extends MutableDbRow {
  id: string;
  user_id: string;
  local_date: string;
  status: string;
  anchor_path_id: string | null;
  closed_at: number | null;
  reopened_at: number | null;
  close_summary: string | null;
  tomorrow_first_step: string | null;
  character_result: string | null;
  planned_mark_count: number;
  completed_mark_count: number;
  skipped_mark_count: number;
  memory_count: number;
}

export interface ReflectionEntryRow extends MutableDbRow {
  id: string;
  user_id: string;
  trail_day_id: string;
  cluster: string;
  text: string;
  order_index: number;
}

export interface MarkTemplateRow extends MutableDbRow {
  id: string;
  user_id: string;
  path_id: string;
  title: string;
  description: string | null;
  template_type: string;
  recurrence_type: string;
  recurrence_rule_json: string;
  default_duration_min: number | null;
  default_signal_rule_json: string | null;
  is_active: number;
}

export interface MarkInstanceRow extends MutableDbRow {
  id: string;
  user_id: string;
  path_id: string;
  trail_day_id: string;
  template_id: string | null;
  expedition_id: string | null;
  milestone_id: string | null;
  title: string;
  description: string | null;
  origin: string;
  status: string;
  scheduled_start_at: number | null;
  scheduled_end_at: number | null;
  due_at: number | null;
  completed_at: number | null;
  skipped_at: number | null;
  expired_at: number | null;
  proof_note: string | null;
  completion_summary: string | null;
  substituted_by_mark_id: string | null;
  rescheduled_to_mark_id: string | null;
  source_backlog_item_id: string | null;
  generation_key: string | null;
}

export interface MemoryRow extends MutableDbRow {
  id: string;
  user_id: string;
  trail_day_id: string;
  path_id: string | null;
  title: string | null;
  body: string | null;
  mood: string | null;
  note: string | null;
  captured_at: number;
  privacy: string;
  latitude: number | null;
  longitude: number | null;
}

export interface BacklogItemRow extends MutableDbRow {
  id: string;
  user_id: string;
  path_id: string | null;
  title: string;
  description: string | null;
  item_type: string;
  horizon: string;
  status: string;
  source: string | null;
  horizon_label: string | null;
  converted_mark_instance_id: string | null;
  converted_pack_check_template_id: string | null;
  converted_to_mark_instance_id: string | null;
  converted_to_expedition_id: string | null;
}

export interface WeekPlanRow extends MutableDbRow {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  status: string;
  summary: string | null;
  note: string | null;
}

export interface WeekPlanItemRow extends MutableDbRow {
  id: string;
  user_id: string;
  week_plan_id: string;
  backlog_item_id: string | null;
  status: string;
  local_date: string | null;
  start_time: string | null;
  end_time: string | null;
  title: string | null;
  path_id: string | null;
  template_id: string | null;
  expedition_id: string | null;
  milestone_id: string | null;
  expedition_context: string | null;
  milestone_context: string | null;
  description: string | null;
  note: string | null;
  origin: string | null;
  block_key: string | null;
  deterministic_import_key: string | null;
  import_batch_id: string | null;
  created_mark_instance_id: string | null;
  sort_order: number;
  order_index: number;
}

export interface PackCheckTemplateRow extends MutableDbRow {
  id: string;
  user_id: string;
  path_id: string | null;
  title: string;
  description: string | null;
  template_type: string | null;
  default_timing_rule_json: string | null;
  default_available_offset_min: number | null;
  default_due_offset_min: number | null;
  default_signal_rule_json: string | null;
  is_active: number;
}

export interface PackCheckItemTemplateRow extends MutableDbRow {
  id: string;
  user_id: string;
  pack_check_template_id: string;
  label: string;
  description: string | null;
  is_required: number;
  sort_order: number;
  order_index: number;
}

export interface MarkPackCheckRuleRow extends MutableDbRow {
  id: string;
  user_id: string;
  mark_template_id: string;
  pack_check_template_id: string;
  available_offset_min: number | null;
  due_offset_min: number | null;
}

export interface PackCheckInstanceRow extends MutableDbRow {
  id: string;
  user_id: string;
  template_id: string | null;
  trail_day_id: string;
  target_mark_instance_id: string | null;
  title: string;
  description: string | null;
  status: string;
  available_from: number | null;
  due_at: number | null;
  completed_at: number | null;
  skipped_at: number | null;
  cancelled_at: number | null;
  generation_key: string | null;
}

export interface PackCheckItemInstanceRow extends MutableDbRow {
  id: string;
  user_id: string;
  pack_check_instance_id: string;
  template_item_id: string | null;
  label: string;
  is_required: number;
  is_checked: number;
  checked_at: number | null;
  sort_order: number;
  order_index: number;
}

export interface SignalRow extends MutableDbRow {
  id: string;
  user_id: string;
  target_type: string;
  target_id: string;
  scheduled_at: number;
  status: string;
  ringing_started_at: number | null;
  snoozed_until: number | null;
  resolved_at: number | null;
  dismissed_at: number | null;
  expired_at: number | null;
  cancelled_at: number | null;
}

export interface MarkDependencyRow extends MutableDbRow {
  id: string;
  user_id: string;
  dependent_mark_instance_id: string;
  dependency_type: string;
  required_entity_type: string;
  required_entity_id: string;
  is_required: number;
  status: string;
  satisfied_at: number | null;
  waived_at: number | null;
}

export interface MediaAssetRow extends MutableDbRow {
  id: string;
  user_id: string;
  owner_type: string;
  owner_id: string;
  kind: string;
  asset_type: string;
  local_uri: string | null;
  thumbnail_uri: string | null;
  remote_uri: string | null;
  backup_status: string | null;
  file_name: string;
  mime_type: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  backup_path: string | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  size_bytes: number | null;
  byte_size: number | null;
  sort_index: number | null;
  captured_at: number | null;
  local_date: string | null;
  daily_batch_id: string | null;
  upload_status: string;
  local_status: string;
  source_cleanup_status: string;
  original_picker_uri: string | null;
  library_asset_id: string | null;
  drive_file_id: string | null;
  drive_folder_id: string | null;
  drive_root_folder_id: string | null;
  drive_web_view_link: string | null;
  drive_web_content_link: string | null;
  drive_mime_type: string | null;
  drive_size_bytes: number | null;
  drive_md5_checksum: string | null;
  content_hash: string | null;
  content_hash_algorithm: string | null;
  thumbnail_drive_file_id: string | null;
  thumbnail_content_hash: string | null;
  thumbnail_content_hash_algorithm: string | null;
  uploaded_at: number | null;
  source_deleted_at: number | null;
  local_deleted_at: number | null;
  last_sync_error: string | null;
}

export interface DailyMediaUploadBatchRow extends MutableDbRow {
  id: string;
  user_id: string;
  local_date: string;
  timezone: string;
  status: string;
  media_count: number;
  uploaded_count: number;
  failed_count: number;
  run_sequence: number;
  lock_owner: string | null;
  lock_acquired_at: number | null;
  lock_expires_at: number | null;
  sealed_at: number | null;
  started_at: number | null;
  completed_at: number | null;
  last_error: string | null;
}

export interface ExerciseDefinitionRow extends MutableDbRow {
  id: string;
  user_id: string | null;
  path_id: string | null;
  name: string;
  title: string;
  canonical_slug: string;
  category: string;
  measurement_type: string;
  target_type: string;
  default_rest_sec: number | null;
  default_unit: string | null;
  equipment: string | null;
  is_system: number;
  description: string | null;
}

export interface WorkoutRoutineTemplateRow extends MutableDbRow {
  id: string;
  user_id: string;
  path_id: string;
  mark_template_id: string | null;
  title: string;
  routine_type: string;
  description: string | null;
  cycle_key: string | null;
  estimated_duration_min: number | null;
  is_active: number;
}

export interface RoutineExerciseTemplateRow extends MutableDbRow {
  id: string;
  user_id: string;
  workout_routine_template_id: string;
  exercise_definition_id: string;
  phase: string;
  order_index: number;
  target_type: string;
  target_load_kg: number | null;
  target_reps: number | null;
  target_sets: number | null;
  target_duration_sec: number | null;
  target_distance_m: number | null;
  target_steps: number | null;
  rest_duration_sec: number | null;
  progression_policy_json: string | null;
}

export interface WorkoutSessionInstanceRow extends MutableDbRow {
  id: string;
  user_id: string;
  mark_instance_id: string;
  routine_template_id: string;
  status: string;
  phase: string;
  started_at: number | null;
  completed_at: number | null;
  current_exercise_snapshot_id: string | null;
  current_set_number: number | null;
  notes: string | null;
}

export interface SessionExerciseSnapshotRow extends MutableDbRow {
  id: string;
  user_id: string;
  workout_session_instance_id: string;
  routine_exercise_template_id: string | null;
  exercise_definition_id: string;
  exercise_name_snapshot: string;
  phase: string;
  order_index: number;
  target_type: string;
  target_load_kg: number | null;
  target_reps: number | null;
  target_sets: number | null;
  target_duration_sec: number | null;
  target_distance_m: number | null;
  target_steps: number | null;
  was_overridden: number;
  status: string;
  started_at: number | null;
  completed_at: number | null;
}

export interface ExerciseSetLogRow extends MutableDbRow {
  id: string;
  user_id: string;
  session_exercise_snapshot_id: string;
  set_number: number;
  actual_load_kg: number | null;
  actual_reps: number | null;
  actual_duration_sec: number | null;
  actual_distance_m: number | null;
  actual_steps: number | null;
  completed: number;
  failed_reason: string | null;
  metadata_json: string | null;
  started_at: number | null;
  completed_at: number | null;
}

export interface ExerciseProgressStateRow extends MutableDbRow {
  id: string;
  user_id: string;
  exercise_definition_id: string;
  current_load_kg: number | null;
  current_reps: number | null;
  current_duration_sec: number | null;
  current_distance_m: number | null;
  current_steps: number | null;
  current_target_load_kg: number | null;
  current_target_reps: number | null;
  current_target_sets: number | null;
  current_target_duration_sec: number | null;
  current_target_distance_m: number | null;
  current_target_steps: number | null;
  success_count_since_progression: number;
  last_session_result: string | null;
  last_progressed_at: number | null;
  manual_override: number;
  last_session_at: number | null;
  last_progression_outcome: string | null;
}
