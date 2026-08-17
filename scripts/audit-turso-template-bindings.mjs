import { createClient } from "@tursodatabase/serverless/compat";

const EXECUTION_BLOCK_KEYS = new Set(["workout", "golf_swing", "golf_putt"]);

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
}

const client = createClient({ url, authToken });
try {
  const [templates, nullMarks, nullPlanItems, nullRoutines, invalidBindings] = await Promise.all([
    query(`
      SELECT mt.id, mt.title, mt.template_type, mt.is_active, mt.path_id,
             p.title AS path_title, mt.deleted_at
      FROM mark_templates mt
      LEFT JOIN paths p ON p.id = mt.path_id AND p.deleted_at IS NULL
      WHERE mt.deleted_at IS NULL
      ORDER BY p.sort_order, mt.title, mt.id;
    `),
    query(`
      SELECT mi.id, mi.title, mi.status, mi.origin, mi.generation_key,
             td.local_date, p.title AS path_title,
             wpi.id AS week_plan_item_id, wpi.block_key,
             wpi.template_id AS planning_template_id,
             mt.title AS planning_template_title,
             CASE
               WHEN wpi.template_id IS NOT NULL THEN 'repairable_from_planning'
               WHEN LOWER(COALESCE(wpi.block_key, '')) IN ('workout', 'golf_swing', 'golf_putt')
                 THEN 'execution_mark_missing_planning_template'
               ELSE 'nullable_by_design_or_unclassified'
             END AS classification
      FROM mark_instances mi
      LEFT JOIN trail_days td ON td.id = mi.trail_day_id AND td.deleted_at IS NULL
      LEFT JOIN paths p ON p.id = mi.path_id AND p.deleted_at IS NULL
      LEFT JOIN week_plan_items wpi
        ON wpi.deleted_at IS NULL
       AND (
         wpi.created_mark_instance_id = mi.id
         OR (
           mi.generation_key IS NOT NULL
           AND mi.generation_key = CASE
             WHEN wpi.deterministic_import_key LIKE 'weekly_timetable:%'
               THEN 'weekly_planned:' || SUBSTR(wpi.deterministic_import_key, LENGTH('weekly_timetable:') + 1)
             ELSE 'weekly_planned:' || wpi.deterministic_import_key
           END
         )
       )
      LEFT JOIN mark_templates mt ON mt.id = wpi.template_id AND mt.deleted_at IS NULL
      WHERE mi.deleted_at IS NULL AND mi.template_id IS NULL
      ORDER BY td.local_date, mi.scheduled_start_at, mi.id;
    `),
    query(`
      SELECT wpi.id, wpi.title, wpi.local_date, wpi.block_key,
             wpi.path_id, p.title AS path_title, wpi.deterministic_import_key
      FROM week_plan_items wpi
      LEFT JOIN paths p ON p.id = wpi.path_id AND p.deleted_at IS NULL
      WHERE wpi.deleted_at IS NULL
        AND wpi.status NOT IN ('removed', 'done')
        AND wpi.template_id IS NULL
      ORDER BY wpi.local_date, wpi.start_time, wpi.id;
    `),
    query(`
      SELECT wrt.id, wrt.title, wrt.routine_type, wrt.path_id,
             p.title AS path_title, wrt.is_active
      FROM workout_routine_templates wrt
      LEFT JOIN paths p ON p.id = wrt.path_id AND p.deleted_at IS NULL
      WHERE wrt.deleted_at IS NULL AND wrt.mark_template_id IS NULL
      ORDER BY p.sort_order, wrt.title, wrt.id;
    `),
    query(`
      SELECT 'mark_instance' AS entity_type, mi.id AS entity_id, mi.template_id,
             mi.title, 'missing_or_deleted_template' AS issue
      FROM mark_instances mi
      LEFT JOIN mark_templates mt ON mt.id = mi.template_id AND mt.deleted_at IS NULL
      WHERE mi.deleted_at IS NULL AND mi.template_id IS NOT NULL AND mt.id IS NULL
      UNION ALL
      SELECT 'week_plan_item', wpi.id, wpi.template_id, wpi.title, 'missing_or_deleted_template'
      FROM week_plan_items wpi
      LEFT JOIN mark_templates mt ON mt.id = wpi.template_id AND mt.deleted_at IS NULL
      WHERE wpi.deleted_at IS NULL AND wpi.template_id IS NOT NULL AND mt.id IS NULL
      UNION ALL
      SELECT 'workout_routine_template', wrt.id, wrt.mark_template_id, wrt.title, 'missing_or_deleted_template'
      FROM workout_routine_templates wrt
      LEFT JOIN mark_templates mt ON mt.id = wrt.mark_template_id AND mt.deleted_at IS NULL
      WHERE wrt.deleted_at IS NULL AND wrt.mark_template_id IS NOT NULL AND mt.id IS NULL
      ORDER BY entity_type, entity_id;
    `),
  ]);

  const allNullRows = process.argv.includes("--all-null");
  const repairableOnly = process.argv.includes("--repairable-only");
  const summaryOnly = process.argv.includes("--summary-only");
  const relevantNullMarks = nullMarks.filter((row) => row.classification !== "nullable_by_design_or_unclassified");
  const relevantNullPlanItems = nullPlanItems.filter(isExecutionPlanningRow);
  const repairableMarks = nullMarks.filter((row) => row.classification === "repairable_from_planning");
  const displayedTemplates = repairableOnly
    ? templates.filter((template) => repairableMarks.some((mark) => mark.planning_template_id === template.id))
    : templates;
  if (!summaryOnly) {
    printSection(repairableOnly ? "TEMPLATES USED BY REPAIRABLE MARKS" : "ACTIVE MARK TEMPLATES", displayedTemplates);
    printSection(
      repairableOnly ? "REPAIRABLE MARK INSTANCES" : allNullRows ? "MARK INSTANCES WITH template_id = NULL" : "EXECUTION MARKS WITH template_id = NULL",
      repairableOnly ? repairableMarks : allNullRows ? nullMarks : relevantNullMarks,
    );
    if (!repairableOnly) {
      printSection(
        allNullRows ? "ACTIVE WEEK PLAN ITEMS WITH template_id = NULL" : "EXECUTION WEEK PLAN ITEMS WITH template_id = NULL",
        allNullRows ? nullPlanItems : relevantNullPlanItems,
      );
      printSection("WORKOUT ROUTINES WITH mark_template_id = NULL", nullRoutines);
      printSection("INVALID NON-NULL TEMPLATE REFERENCES", invalidBindings);
    }
  }

  const summary = {
    templates: templates.length,
    nullMarks: nullMarks.length,
    repairableMarks: nullMarks.filter((row) => row.classification === "repairable_from_planning").length,
    unboundExecutionMarks: nullMarks.filter((row) => row.classification === "execution_mark_missing_planning_template").length,
    nullPlanItems: nullPlanItems.length,
    nullExecutionPlanItems: relevantNullPlanItems.length,
    nullRoutines: nullRoutines.length,
    invalidBindings: invalidBindings.length,
  };
  console.log("\nSUMMARY");
  console.table([summary]);
  if (summaryOnly) {
    console.log("\nREMAINING NULL MARKS BY ORIGIN / PATH");
    console.table(groupCounts(nullMarks, (row) => `${row.origin ?? "no-origin"} / ${row.path_title ?? "no-path"}`));
    console.log("\nREMAINING NULL PLAN ITEMS BY BLOCK KEY");
    console.table(groupCounts(nullPlanItems, (row) => row.block_key ?? "no-block-key"));
  }
} finally {
  client.close();
}

async function query(sql) {
  const result = await client.execute(sql);
  return result.rows.map((row) =>
    Object.fromEntries(result.columns.map((column, index) => [column, row[index]])),
  );
}

function printSection(title, rows) {
  console.log(`\n${title} (${rows.length})`);
  if (rows.length > 0) console.table(rows);
}

function isExecutionPlanningRow(row) {
  return EXECUTION_BLOCK_KEYS.has(String(row.block_key ?? "").trim().toLowerCase());
}

function groupCounts(rows, keyOf) {
  const counts = new Map();
  for (const row of rows) {
    const key = String(keyOf(row));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([group, count]) => ({ group, count }))
    .sort((left, right) => right.count - left.count || left.group.localeCompare(right.group));
}
