import { WAYMARK_TABLES, type WaymarkTableName } from "../../db/constants";

export type WaymarkTursoOwnershipMode =
  | "turso_primary_pull_only"
  | "code_owned_catalog"
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
  spec("vault", WAYMARK_TABLES.vaults, "waymark_primary_activity", "Vault envelope can be mirrored with activity upload."),
  spec("device", WAYMARK_TABLES.devices, "waymark_primary_activity", "Device identity is mirrored so uploads are attributable."),
  spec(
    "app_db_metadata",
    WAYMARK_TABLES.appDbMetadata,
    "waymark_primary_activity",
    "Database identity is mirrored for diagnostics, not used as planning truth.",
  ),
  spec("sync_state", WAYMARK_TABLES.syncState, "local_only", "Local cursor and protection state must not be uploaded raw."),
  spec("app_setting", WAYMARK_TABLES.appSettings, "local_only", "Raw app_settings mixes local runtime state with typed policies."),
  spec("user_profile", WAYMARK_TABLES.userProfiles, "waymark_primary_activity", "User-edited profile fields are lived-in Waymark data."),
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
  spec("trail_day", WAYMARK_TABLES.trailDays, "waymark_primary_activity", "Trail days are generated and lived in locally."),
  spec("reflection_entry", WAYMARK_TABLES.reflectionEntries, "waymark_primary_activity", "Reflections are authored in Waymark."),
  spec("mark_template", WAYMARK_TABLES.markTemplates, "code_owned_catalog", "Definitions/templates are owned by code; Turso exposes stable IDs through catalog views."),
  spec("mark_instance", WAYMARK_TABLES.markInstances, "waymark_primary_activity", "Marks are lived in locally and uploaded manually."),
  spec(
    "mark_instance_detail",
    WAYMARK_TABLES.markInstanceDetails,
    "waymark_primary_activity",
    "Mark execution detail is lived in locally.",
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
    "code_owned_catalog",
    "Definitions/templates are owned by code; Turso exposes stable IDs through catalog views.",
  ),
  spec(
    "pack_check_item_template",
    WAYMARK_TABLES.packCheckItemTemplates,
    "code_owned_catalog",
    "Definitions/templates are owned by code; Turso exposes stable IDs through catalog views.",
  ),
  spec(
    "mark_pack_check_rule",
    WAYMARK_TABLES.markPackCheckRules,
    "code_owned_catalog",
    "Definitions/templates are owned by code; Turso exposes stable IDs through catalog views.",
  ),
  spec("pack_check_instance", WAYMARK_TABLES.packCheckInstances, "waymark_primary_activity", "Pack checks are runtime activity."),
  spec(
    "pack_check_item_instance",
    WAYMARK_TABLES.packCheckItemInstances,
    "waymark_primary_activity",
    "Pack check item state is runtime activity.",
  ),
  spec("signal", WAYMARK_TABLES.signals, "waymark_primary_activity", "Current local signals are runtime signal instances."),
  spec("signal_plan", undefined, "turso_primary_planning", "Signal plans are authored by planning and materialized locally."),
  spec("mark_dependency", WAYMARK_TABLES.markDependencies, "waymark_primary_activity", "Dependencies are mark runtime/activity state."),
  spec("media_asset", WAYMARK_TABLES.mediaAssets, "waymark_primary_activity", "Portable media metadata is lived-in Waymark data."),
  spec(
    "daily_media_upload_batch",
    WAYMARK_TABLES.dailyMediaUploadBatches,
    "local_only",
    "Upload batch diagnostics are device-local operational state.",
  ),
  spec(
    "exercise_definition",
    WAYMARK_TABLES.exerciseDefinitions,
    "code_owned_catalog",
    "Definitions/templates are owned by code; Turso exposes stable IDs through catalog views.",
  ),
  spec(
    "workout_routine_template",
    WAYMARK_TABLES.workoutRoutineTemplates,
    "code_owned_catalog",
    "Definitions/templates are owned by code; Turso exposes stable IDs through catalog views.",
  ),
  spec(
    "routine_exercise_template",
    WAYMARK_TABLES.routineExerciseTemplates,
    "code_owned_catalog",
    "Definitions/templates are owned by code; Turso exposes stable IDs through catalog views.",
  ),
  spec(
    "workout_session_instance",
    WAYMARK_TABLES.workoutSessionInstances,
    "waymark_primary_activity",
    "Workout sessions are execution history.",
  ),
  spec(
    "session_exercise_snapshot",
    WAYMARK_TABLES.sessionExerciseSnapshots,
    "waymark_primary_activity",
    "Workout execution snapshots are activity history.",
  ),
  spec("exercise_set_log", WAYMARK_TABLES.exerciseSetLogs, "waymark_primary_activity", "Exercise logs are activity history."),
  spec(
    "exercise_progress_state",
    WAYMARK_TABLES.exerciseProgressStates,
    "waymark_primary_activity",
    "Progress state is user activity state.",
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
