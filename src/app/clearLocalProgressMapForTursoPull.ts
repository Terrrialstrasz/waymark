import { getWaymarkDatabaseAsync } from "../db";

export type ClearLocalProgressMapReport = {
  expeditions: number;
  milestones: number;
  markInstances: number;
  dependentSettings: number;
  weekPlanItemsUpdated: number;
  syncOutboxRows: number;
  planningStateRows: number;
};

export async function clearLocalProgressMapForTursoPull(): Promise<ClearLocalProgressMapReport> {
  const db = await getWaymarkDatabaseAsync();
  const report: ClearLocalProgressMapReport = {
    expeditions: await countRows(db, "expeditions"),
    milestones: await countRows(db, "milestones"),
    markInstances: await countRows(db, "mark_instances"),
    dependentSettings: await countRowsWhere(
      db,
      "app_settings",
      "key LIKE 'mark_metadata:%' OR key LIKE 'daily_replan:%' OR key LIKE 'mark_execution_checklist:%'",
    ),
    weekPlanItemsUpdated: 0,
    syncOutboxRows: await countRowsWhere(db, "sync_outbox", "entity_type IN ('mark_instance', 'expedition', 'milestone')"),
    planningStateRows: await countRowsWhere(
      db,
      "planning_entity_state",
      "entity_type IN ('mark_instance', 'expedition', 'milestone')",
    ),
  };
  const now = Date.now();

  await db.withExclusiveTransactionAsync(async (txn) => {
    const weekPlanUpdate = await txn.runAsync(
      `UPDATE week_plan_items
       SET expedition_id = NULL,
           milestone_id = NULL,
           created_mark_instance_id = NULL,
           updated_at = ?,
           sync_status = 'synced'
       WHERE expedition_id IS NOT NULL
          OR milestone_id IS NOT NULL
          OR created_mark_instance_id IS NOT NULL;`,
      now,
    );
    report.weekPlanItemsUpdated = Number(weekPlanUpdate.changes ?? 0);

    await txn.runAsync(
      `UPDATE backlog_items
       SET converted_mark_instance_id = NULL,
           converted_to_mark_instance_id = NULL,
           converted_to_expedition_id = NULL,
           updated_at = ?,
           sync_status = 'synced'
       WHERE converted_mark_instance_id IS NOT NULL
          OR converted_to_mark_instance_id IS NOT NULL
          OR converted_to_expedition_id IS NOT NULL;`,
      now,
    );
    await txn.runAsync("DELETE FROM exercise_set_logs WHERE session_exercise_snapshot_id IN (SELECT id FROM session_exercise_snapshots WHERE workout_session_instance_id IN (SELECT id FROM workout_session_instances WHERE mark_instance_id IN (SELECT id FROM mark_instances)));");
    await txn.runAsync("DELETE FROM session_exercise_snapshots WHERE workout_session_instance_id IN (SELECT id FROM workout_session_instances WHERE mark_instance_id IN (SELECT id FROM mark_instances));");
    await txn.runAsync("DELETE FROM workout_session_instances WHERE mark_instance_id IN (SELECT id FROM mark_instances);");
    await txn.runAsync("DELETE FROM pack_check_item_instances WHERE pack_check_instance_id IN (SELECT id FROM pack_check_instances WHERE target_mark_instance_id IN (SELECT id FROM mark_instances));");
    await txn.runAsync("DELETE FROM pack_check_instances WHERE target_mark_instance_id IN (SELECT id FROM mark_instances);");
    await txn.runAsync("DELETE FROM mark_dependencies WHERE dependent_mark_instance_id IN (SELECT id FROM mark_instances) OR (required_entity_type = 'mark_instance' AND required_entity_id IN (SELECT id FROM mark_instances));");
    await txn.runAsync("DELETE FROM mark_instance_details WHERE mark_instance_id IN (SELECT id FROM mark_instances);");
    await txn.runAsync("DELETE FROM signals WHERE target_type = 'mark_instance' AND target_id IN (SELECT id FROM mark_instances);");
    await txn.runAsync("DELETE FROM media_assets WHERE (owner_type = 'mark_instance' AND owner_id IN (SELECT id FROM mark_instances)) OR (owner_type = 'expedition' AND owner_id IN (SELECT id FROM expeditions));");
    await txn.runAsync(
      "DELETE FROM app_settings WHERE key LIKE 'mark_metadata:%' OR key LIKE 'daily_replan:%' OR key LIKE 'mark_execution_checklist:%';",
    );
    await txn.runAsync("DELETE FROM sync_tombstones WHERE entity_type IN ('mark_instance', 'expedition', 'milestone');");
    await txn.runAsync("DELETE FROM sync_outbox WHERE entity_type IN ('mark_instance', 'expedition', 'milestone');");
    await txn.runAsync("DELETE FROM planning_conflicts WHERE entity_type IN ('mark_instance', 'expedition', 'milestone');");
    await txn.runAsync("DELETE FROM planning_entity_state WHERE entity_type IN ('mark_instance', 'expedition', 'milestone');");
    await txn.runAsync("DELETE FROM mark_instances;");
    await txn.runAsync("DELETE FROM milestones;");
    await txn.runAsync("DELETE FROM expeditions;");
    await txn.runAsync(
      `UPDATE trail_days
       SET planned_mark_count = 0,
           completed_mark_count = 0,
           skipped_mark_count = 0,
           memory_count = (SELECT COUNT(*) FROM memories WHERE memories.trail_day_id = trail_days.id AND memories.deleted_at IS NULL),
           updated_at = ?
       WHERE deleted_at IS NULL;`,
      now,
    );
  });

  return report;
}

async function countRows(db: { getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> }, tableName: string) {
  return countRowsWhere(db, tableName, "1 = 1");
}

async function countRowsWhere(
  db: { getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> },
  tableName: string,
  whereClause: string,
) {
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${tableName} WHERE ${whereClause};`);
  return row?.count ?? 0;
}
