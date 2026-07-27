export const WAYMARK_DATABASE_NAME = "waymark.db";

export const SCHEMA_MIGRATIONS_TABLE = "schema_migrations";

export const WAYMARK_TABLES = {
  appDbMetadata: "app_db_metadata",
  vaults: "vaults",
  devices: "devices",
  syncState: "sync_state",
  syncOutbox: "sync_outbox",
  syncTombstones: "sync_tombstones",
  userProfiles: "user_profiles",
  appSettings: "app_settings",
  paths: "paths",
  expeditions: "expeditions",
  milestones: "milestones",
  trailDays: "trail_days",
  reflectionEntries: "reflection_entries",
  markTemplates: "mark_templates",
  markInstances: "mark_instances",
  markInstanceDetails: "mark_instance_details",
  memories: "memories",
  backlogItems: "backlog_items",
  weekPlans: "week_plans",
  weekPlanItems: "week_plan_items",
  packCheckTemplates: "pack_check_templates",
  packCheckItemTemplates: "pack_check_item_templates",
  markPackCheckRules: "mark_pack_check_rules",
  packCheckInstances: "pack_check_instances",
  packCheckItemInstances: "pack_check_item_instances",
  signals: "signals",
  markDependencies: "mark_dependencies",
  mediaAssets: "media_assets",
  dailyMediaUploadBatches: "daily_media_upload_batches",
  exerciseDefinitions: "exercise_definitions",
  workoutRoutineTemplates: "workout_routine_templates",
  routineExerciseTemplates: "routine_exercise_templates",
  workoutSessionInstances: "workout_session_instances",
  sessionExerciseSnapshots: "session_exercise_snapshots",
  exerciseSetLogs: "exercise_set_logs",
  exerciseProgressStates: "exercise_progress_states",
} as const;

export type WaymarkTableName = (typeof WAYMARK_TABLES)[keyof typeof WAYMARK_TABLES];
