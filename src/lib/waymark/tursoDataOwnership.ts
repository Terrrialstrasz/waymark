import { WAYMARK_TABLES, type WaymarkTableName } from "../../db/constants";

export type WaymarkTursoOwnershipMode =
  | "turso_primary_pull_only"
  | "turso_primary_planning"
  | "waymark_primary_activity"
  | "local_only";

export type WaymarkTursoOwnershipSpec = {
  entityType: string;
  tableName?: WaymarkTableName;
  mode: WaymarkTursoOwnershipMode;
  notes: string;
};

export const WAYMARK_TURSO_OWNERSHIP_SPECS: readonly WaymarkTursoOwnershipSpec[] = [
  spec("vault", WAYMARK_TABLES.vaults, "turso_primary_pull_only", "The Vault envelope is canonical in Turso."),
  spec("device", WAYMARK_TABLES.devices, "local_only", "Device identity is operational metadata, not a Waymark-authored domain entity."),
  spec(
    "app_db_metadata",
    WAYMARK_TABLES.appDbMetadata,
    "local_only",
    "Database identity is mirrored for diagnostics, not used as planning truth.",
  ),
  spec("sync_state", WAYMARK_TABLES.syncState, "local_only", "Local cursor and protection state must not be uploaded raw."),
  spec("app_setting", WAYMARK_TABLES.appSettings, "local_only", "Raw app_settings mixes local runtime state with typed policies."),
  spec("user_profile", WAYMARK_TABLES.userProfiles, "turso_primary_pull_only", "User profile identity is canonical in Turso."),
  spec("path", WAYMARK_TABLES.paths, "turso_primary_pull_only", "Clean hierarchy is authored outside Waymark and pulled from Turso."),
  spec(
    "expedition",
    WAYMARK_TABLES.expeditions,
    "turso_primary_pull_only",
    "Clean hierarchy structure is authored outside Waymark and pulled from Turso; lived-in status fields can be pushed through typed progress projection.",
  ),
  spec(
    "milestone",
    WAYMARK_TABLES.milestones,
    "turso_primary_pull_only",
    "Clean hierarchy structure is authored outside Waymark and pulled from Turso; lived-in status fields can be pushed through typed progress projection.",
  ),
  spec("trail_day", WAYMARK_TABLES.trailDays, "turso_primary_pull_only", "Trail-day identity is received from Turso; local computation is cache-only."),
  spec("reflection_entry", WAYMARK_TABLES.reflectionEntries, "turso_primary_pull_only", "Reflection rows are not runtime-created domain entities."),
  spec("mark_template", WAYMARK_TABLES.markTemplates, "turso_primary_pull_only", "Workspace scripts publish definitions to Turso; the app only pulls them."),
  spec("mark_instance", WAYMARK_TABLES.markInstances, "waymark_primary_activity", "Marks are lived in locally and uploaded manually."),
  spec(
    "mark_instance_detail",
    WAYMARK_TABLES.markInstanceDetails,
    "turso_primary_pull_only",
    "Mark execution detail is not an independently runtime-created domain entity.",
  ),
  spec("memory", WAYMARK_TABLES.memories, "waymark_primary_activity", "Memories are captured in Waymark."),
  spec("backlog_item", WAYMARK_TABLES.backlogItems, "waymark_primary_activity", "Backlog is authored and curated in Waymark."),
  spec("week_plan", WAYMARK_TABLES.weekPlans, "turso_primary_planning", "Planning API/ChatGPT owns week plan rows after cutover."),
  spec(
    "week_plan_item",
    WAYMARK_TABLES.weekPlanItems,
    "turso_primary_planning",
    "Planning API/ChatGPT owns plan item rows; local materialization owns runtime marks.",
  ),
  spec(
    "pack_check_template",
    WAYMARK_TABLES.packCheckTemplates,
    "turso_primary_pull_only",
    "Workspace scripts publish definitions to Turso; the app only pulls them.",
  ),
  spec(
    "pack_check_item_template",
    WAYMARK_TABLES.packCheckItemTemplates,
    "turso_primary_pull_only",
    "Workspace scripts publish definitions to Turso; the app only pulls them.",
  ),
  spec(
    "mark_pack_check_rule",
    WAYMARK_TABLES.markPackCheckRules,
    "turso_primary_pull_only",
    "Workspace scripts publish definitions to Turso; the app only pulls them.",
  ),
  spec("pack_check_instance", WAYMARK_TABLES.packCheckInstances, "turso_primary_pull_only", "Pack checks are pulled execution state, not app-created canonical entities."),
  spec(
    "pack_check_item_instance",
    WAYMARK_TABLES.packCheckItemInstances,
    "turso_primary_pull_only",
    "Pack check item state is pulled execution state.",
  ),
  spec("signal", WAYMARK_TABLES.signals, "turso_primary_pull_only", "Signals are received from Turso planning data."),
  spec("signal_plan", undefined, "turso_primary_planning", "Signal plans are authored by planning and materialized locally."),
  spec("mark_dependency", WAYMARK_TABLES.markDependencies, "turso_primary_pull_only", "Dependencies are received as canonical Mark support data."),
  spec("media_asset", WAYMARK_TABLES.mediaAssets, "local_only", "Media is operational support for a Memory or Mark, not an independently app-created domain entity."),
  spec(
    "daily_media_upload_batch",
    WAYMARK_TABLES.dailyMediaUploadBatches,
    "local_only",
    "Upload batch diagnostics are device-local operational state.",
  ),
  spec(
    "exercise_definition",
    WAYMARK_TABLES.exerciseDefinitions,
    "turso_primary_pull_only",
    "Workspace scripts publish definitions to Turso; the app only pulls them.",
  ),
  spec(
    "workout_routine_template",
    WAYMARK_TABLES.workoutRoutineTemplates,
    "turso_primary_pull_only",
    "Workspace scripts publish definitions to Turso; the app only pulls them.",
  ),
  spec(
    "routine_exercise_template",
    WAYMARK_TABLES.routineExerciseTemplates,
    "turso_primary_pull_only",
    "Workspace scripts publish definitions to Turso; the app only pulls them.",
  ),
  spec(
    "workout_session_instance",
    WAYMARK_TABLES.workoutSessionInstances,
    "turso_primary_pull_only",
    "Workout sessions are pulled support state, not independently created canonical entities.",
  ),
  spec(
    "session_exercise_snapshot",
    WAYMARK_TABLES.sessionExerciseSnapshots,
    "turso_primary_pull_only",
    "Workout execution snapshots are pulled support state.",
  ),
  spec("exercise_set_log", WAYMARK_TABLES.exerciseSetLogs, "turso_primary_pull_only", "Exercise logs are pulled support state."),
  spec(
    "exercise_progress_state",
    WAYMARK_TABLES.exerciseProgressStates,
    "turso_primary_pull_only",
    "Exercise progress is pulled support state.",
  ),
] as const;

const ownershipByEntityType = new Map(WAYMARK_TURSO_OWNERSHIP_SPECS.map((item) => [item.entityType, item] as const));
const ownershipByTableName = new Map(
  WAYMARK_TURSO_OWNERSHIP_SPECS.flatMap((item) => (item.tableName ? [[item.tableName, item] as const] : [])),
);

export function getWaymarkTursoOwnershipForEntity(entityType: string): WaymarkTursoOwnershipSpec | null {
  return ownershipByEntityType.get(entityType) ?? null;
}

export function getWaymarkTursoOwnershipForTable(tableName: WaymarkTableName): WaymarkTursoOwnershipSpec | null {
  return ownershipByTableName.get(tableName) ?? null;
}

export function canUploadWaymarkActivityEntity(entityType: string): boolean {
  return getWaymarkTursoOwnershipForEntity(entityType)?.mode === "waymark_primary_activity";
}

export function canBootstrapWaymarkActivityTable(tableName: WaymarkTableName): boolean {
  return getWaymarkTursoOwnershipForTable(tableName)?.mode === "waymark_primary_activity";
}

export function isTursoPrimaryEntity(entityType: string): boolean {
  const mode = getWaymarkTursoOwnershipForEntity(entityType)?.mode;
  return mode === "turso_primary_pull_only" || mode === "turso_primary_planning";
}

function spec(
  entityType: string,
  tableName: WaymarkTableName | undefined,
  mode: WaymarkTursoOwnershipMode,
  notes: string,
): WaymarkTursoOwnershipSpec {
  return { entityType, tableName, mode, notes };
}
