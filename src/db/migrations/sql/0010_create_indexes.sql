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
  WHERE deleted_at IS NULL;
