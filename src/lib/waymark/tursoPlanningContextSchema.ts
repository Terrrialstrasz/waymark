export const WAYMARK_TURSO_CHATGPT_CONTEXT_VIEW_NAMES = [
  "chatgpt_week_planning_context",
  "chatgpt_expedition_progress_context",
  "chatgpt_milestone_mark_context",
  "chatgpt_signal_plan_context",
  "chatgpt_catalog_template_context",
] as const;

export function getWaymarkTursoPlanningContextDropSql(): string {
  return WAYMARK_TURSO_CHATGPT_CONTEXT_VIEW_NAMES.map((viewName) => `DROP VIEW IF EXISTS ${viewName};`).join("\n");
}

export const TURSO_CHATGPT_CONTEXT_SCHEMA_SQL = `
${getWaymarkTursoPlanningContextDropSql()}

CREATE VIEW chatgpt_week_planning_context AS
SELECT
  wp.vault_id,
  wp.user_id,
  wp.id AS week_plan_id,
  wp.week_start_date,
  wp.week_end_date,
  wp.status AS week_status,
  wp.summary AS week_summary,
  wp.note AS week_note,
  wpi.id AS week_plan_item_id,
  wpi.status AS item_status,
  wpi.local_date,
  wpi.start_time,
  wpi.end_time,
  wpi.title AS item_title,
  wpi.description AS item_description,
  wpi.note AS item_note,
  wpi.origin AS item_origin,
  wpi.block_key,
  wpi.deterministic_import_key,
  wpi.created_mark_instance_id,
  p.id AS path_id,
  p.title AS path_title,
  e.id AS expedition_id,
  e.title AS expedition_title,
  ms.id AS milestone_id,
  ms.title AS milestone_title,
  mt.id AS mark_template_id,
  mt.title AS mark_template_title,
  mi.status AS materialized_mark_status,
  mi.scheduled_start_at AS materialized_mark_start_at,
  mi.completed_at AS materialized_mark_completed_at,
  wpi.sort_order,
  wpi.order_index,
  wpi.updated_at,
  wpi.deleted_at
FROM week_plan_items wpi
JOIN week_plans wp ON wp.vault_id = wpi.vault_id AND wp.id = wpi.week_plan_id
LEFT JOIN paths p ON p.vault_id = wpi.vault_id AND p.id = wpi.path_id
LEFT JOIN expeditions e ON e.vault_id = wpi.vault_id AND e.id = wpi.expedition_id
LEFT JOIN milestones ms ON ms.vault_id = wpi.vault_id AND ms.id = wpi.milestone_id
LEFT JOIN mark_templates mt ON mt.vault_id = wpi.vault_id AND mt.id = wpi.template_id
LEFT JOIN mark_instances mi ON mi.vault_id = wpi.vault_id AND mi.id = wpi.created_mark_instance_id
WHERE wp.deleted_at IS NULL;

CREATE VIEW chatgpt_expedition_progress_context AS
SELECT
  ep.vault_id,
  ep.path_id,
  ep.path_title,
  ep.expedition_id,
  ep.expedition_title,
  ep.expedition_status,
  ep.milestone_count,
  ep.completed_milestone_count,
  ep.total_mark_count,
  ep.completed_mark_count,
  ep.open_mark_count,
  ep.progress_percent,
  ep.latest_mark_activity_at
FROM expedition_progress ep;

CREATE VIEW chatgpt_milestone_mark_context AS
SELECT
  emm.vault_id,
  emm.path_id,
  emm.path_title,
  emm.expedition_id,
  emm.expedition_title,
  emm.expedition_status,
  emm.milestone_id,
  COALESCE(emm.milestone_title, 'No milestone') AS milestone_title,
  emm.milestone_status,
  emm.milestone_target_date,
  emm.mark_instance_id,
  emm.mark_title,
  emm.mark_origin,
  emm.mark_status,
  emm.scheduled_start_at,
  emm.completed_at,
  emm.mark_updated_at
FROM expedition_milestone_marks emm
WHERE emm.expedition_deleted_at IS NULL
  AND (emm.milestone_deleted_at IS NULL OR emm.milestone_id IS NULL);

CREATE VIEW chatgpt_signal_plan_context AS
SELECT
  sp.vault_id,
  sp.user_id,
  sp.id AS signal_plan_id,
  sp.week_plan_id,
  sp.target_type,
  sp.target_id,
  sp.local_date,
  sp.scheduled_time,
  sp.scheduled_at,
  sp.recurrence_rule_json,
  sp.title,
  sp.body,
  sp.is_enabled,
  sp.planning_item_key,
  mi.title AS target_mark_title,
  wpi.title AS target_week_plan_item_title,
  sp.updated_at,
  sp.deleted_at
FROM signal_plans sp
LEFT JOIN mark_instances mi
  ON sp.target_type = 'mark_instance'
  AND mi.vault_id = sp.vault_id
  AND mi.id = sp.target_id
LEFT JOIN week_plan_items wpi
  ON sp.target_type = 'week_plan_item'
  AND wpi.vault_id = sp.vault_id
  AND wpi.id = sp.target_id;

CREATE VIEW chatgpt_catalog_template_context AS
SELECT
  mt.vault_id,
  'mark_template' AS catalog_type,
  mt.id AS catalog_id,
  mt.title,
  mt.description,
  mt.path_id,
  p.title AS path_title,
  mt.template_type AS subtype,
  mt.recurrence_type AS recurrence_or_cycle,
  mt.default_duration_min AS duration_min,
  mt.is_active,
  mt.updated_at,
  mt.deleted_at
FROM mark_templates mt
LEFT JOIN paths p ON p.vault_id = mt.vault_id AND p.id = mt.path_id
UNION ALL
SELECT
  wrt.vault_id,
  'workout_routine_template' AS catalog_type,
  wrt.id AS catalog_id,
  wrt.title,
  wrt.description,
  wrt.path_id,
  p.title AS path_title,
  wrt.routine_type AS subtype,
  wrt.cycle_key AS recurrence_or_cycle,
  wrt.estimated_duration_min AS duration_min,
  wrt.is_active,
  wrt.updated_at,
  wrt.deleted_at
FROM workout_routine_templates wrt
LEFT JOIN paths p ON p.vault_id = wrt.vault_id AND p.id = wrt.path_id
UNION ALL
SELECT
  pct.vault_id,
  'pack_check_template' AS catalog_type,
  pct.id AS catalog_id,
  pct.title,
  pct.description,
  pct.path_id,
  p.title AS path_title,
  pct.template_type AS subtype,
  NULL AS recurrence_or_cycle,
  NULL AS duration_min,
  pct.is_active,
  pct.updated_at,
  pct.deleted_at
FROM pack_check_templates pct
LEFT JOIN paths p ON p.vault_id = pct.vault_id AND p.id = pct.path_id;
`;

export function getWaymarkTursoPlanningContextSchemaSql(): string {
  return TURSO_CHATGPT_CONTEXT_SCHEMA_SQL;
}
