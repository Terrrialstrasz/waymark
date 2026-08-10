import { WAYMARK_TABLES, type WaymarkTableName } from "../../db/constants";
import type { SQLiteQueryable } from "../../db/adapters/SQLiteRepositoryBase";
import { enqueueSyncOutboxMutation, type SyncOutboxEntityType, type SyncOutboxRow } from "./ssotOutbox";
import { canBootstrapWaymarkActivityTable } from "./tursoDataOwnership";

type CanonicalTableSpec = {
  tableName: WaymarkTableName;
  entityType: SyncOutboxEntityType;
  entityId: (row: Record<string, unknown>) => string;
  orderBy: string;
};

export type WaymarkAllTablesBootstrapInput = {
  executor: SQLiteQueryable;
  vaultId: string;
  deviceId: string;
  dbInstanceId: string;
  now?: number;
  limitPerTable?: number;
};

export type WaymarkAllTablesBootstrapTableResult = {
  tableName: WaymarkTableName;
  entityType: SyncOutboxEntityType;
  scanned: number;
  enqueued: number;
};

export type WaymarkAllTablesBootstrapResult = {
  tables: WaymarkAllTablesBootstrapTableResult[];
  scanned: number;
  enqueued: number;
};

export const WAYMARK_TURSO_CANONICAL_TABLES: readonly CanonicalTableSpec[] = [
  table(WAYMARK_TABLES.vaults, "vault"),
  table(WAYMARK_TABLES.devices, "device"),
  table(WAYMARK_TABLES.appDbMetadata, "app_db_metadata", "db_instance_id"),
  compositeTable(WAYMARK_TABLES.syncState, "sync_state", ["vault_id", "device_id"]),
  table(WAYMARK_TABLES.userProfiles, "user_profile"),
  table(WAYMARK_TABLES.appSettings, "app_setting"),
  table(WAYMARK_TABLES.paths, "path"),
  table(WAYMARK_TABLES.expeditions, "expedition"),
  table(WAYMARK_TABLES.milestones, "milestone"),
  table(WAYMARK_TABLES.trailDays, "trail_day"),
  table(WAYMARK_TABLES.reflectionEntries, "reflection_entry"),
  table(WAYMARK_TABLES.markTemplates, "mark_template"),
  table(WAYMARK_TABLES.markInstances, "mark_instance"),
  table(WAYMARK_TABLES.markInstanceDetails, "mark_instance_detail", "mark_instance_id"),
  table(WAYMARK_TABLES.memories, "memory"),
  table(WAYMARK_TABLES.backlogItems, "backlog_item"),
  table(WAYMARK_TABLES.weekPlans, "week_plan"),
  table(WAYMARK_TABLES.weekPlanItems, "week_plan_item"),
  table(WAYMARK_TABLES.packCheckTemplates, "pack_check_template"),
  table(WAYMARK_TABLES.packCheckItemTemplates, "pack_check_item_template"),
  table(WAYMARK_TABLES.markPackCheckRules, "mark_pack_check_rule"),
  table(WAYMARK_TABLES.packCheckInstances, "pack_check_instance"),
  table(WAYMARK_TABLES.packCheckItemInstances, "pack_check_item_instance"),
  table(WAYMARK_TABLES.signals, "signal"),
  table(WAYMARK_TABLES.markDependencies, "mark_dependency"),
  table(WAYMARK_TABLES.mediaAssets, "media_asset"),
  table(WAYMARK_TABLES.dailyMediaUploadBatches, "daily_media_upload_batch"),
  table(WAYMARK_TABLES.exerciseDefinitions, "exercise_definition"),
  table(WAYMARK_TABLES.workoutRoutineTemplates, "workout_routine_template"),
  table(WAYMARK_TABLES.routineExerciseTemplates, "routine_exercise_template"),
  table(WAYMARK_TABLES.workoutSessionInstances, "workout_session_instance"),
  table(WAYMARK_TABLES.sessionExerciseSnapshots, "session_exercise_snapshot"),
  table(WAYMARK_TABLES.exerciseSetLogs, "exercise_set_log"),
  table(WAYMARK_TABLES.exerciseProgressStates, "exercise_progress_state"),
] as const;

export const WAYMARK_TURSO_ACTIVITY_UPLOAD_TABLES: readonly CanonicalTableSpec[] =
  WAYMARK_TURSO_CANONICAL_TABLES.filter((spec) => canBootstrapWaymarkActivityTable(spec.tableName));

export async function enqueueAllWaymarkTablesForTursoUpload(
  input: WaymarkAllTablesBootstrapInput,
): Promise<WaymarkAllTablesBootstrapResult> {
  const now = input.now ?? Date.now();
  const tables: WaymarkAllTablesBootstrapTableResult[] = [];
  let scanned = 0;
  let enqueued = 0;

  for (const spec of WAYMARK_TURSO_ACTIVITY_UPLOAD_TABLES) {
    const rows = await input.executor.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${spec.tableName} ORDER BY ${spec.orderBy} ASC LIMIT ?;`,
      input.limitPerTable ?? 100000,
    );
    let tableEnqueued = 0;

    for (const row of rows) {
      const entityId = spec.entityId(row);
      const localRevision = resolveLocalRevision(row);
      const operation = typeof row.deleted_at === "number" && row.deleted_at > 0 ? "delete" : "update";
      const outbox = await enqueueSyncOutboxMutation(input.executor, {
        vaultId: input.vaultId,
        deviceId: input.deviceId,
        dbInstanceId: input.dbInstanceId,
        entityType: spec.entityType,
        entityId,
        operation,
        localRevision,
        idempotencyKey: buildAllTablesBootstrapIdempotencyKey({
          vaultId: input.vaultId,
          deviceId: input.deviceId,
          entityType: spec.entityType,
          entityId,
          localRevision,
        }),
        payload: {
          ...row,
          __waymark_bootstrap: "all_tables",
          __waymark_table: spec.tableName,
        },
        now,
      });
      if (outbox.status === "pending") {
        tableEnqueued += 1;
      }
    }

    tables.push({
      tableName: spec.tableName,
      entityType: spec.entityType,
      scanned: rows.length,
      enqueued: tableEnqueued,
    });
    scanned += rows.length;
    enqueued += tableEnqueued;
  }

  return { tables, scanned, enqueued };
}

export function buildAllTablesBootstrapIdempotencyKey(input: {
  vaultId: string;
  deviceId: string;
  entityType: SyncOutboxEntityType;
  entityId: string;
  localRevision: number;
}) {
  return [
    "bootstrap_all_tables",
    input.vaultId,
    input.deviceId,
    input.entityType,
    input.entityId,
    String(input.localRevision),
  ].join(":");
}

function table(
  tableName: WaymarkTableName,
  entityType: SyncOutboxEntityType,
  idColumn = "id",
): CanonicalTableSpec {
  return {
    tableName,
    entityType,
    orderBy: idColumn,
    entityId: (row) => assertEntityId(row[idColumn], tableName, idColumn),
  };
}

function compositeTable(
  tableName: WaymarkTableName,
  entityType: SyncOutboxEntityType,
  idColumns: readonly string[],
): CanonicalTableSpec {
  return {
    tableName,
    entityType,
    orderBy: idColumns.join(", "),
    entityId: (row) => idColumns.map((column) => assertEntityId(row[column], tableName, column)).join(":"),
  };
}

function resolveLocalRevision(row: Record<string, unknown>): number {
  const revision = row.local_revision;
  if (typeof revision === "number" && Number.isFinite(revision)) {
    return revision;
  }
  const updatedAt = row.updated_at;
  if (typeof updatedAt === "number" && Number.isFinite(updatedAt)) {
    return updatedAt;
  }
  return 0;
}

function assertEntityId(value: unknown, tableName: string, columnName: string): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  throw new Error(`Cannot build Turso entity id for ${tableName}.${columnName}.`);
}
