import { createClient } from "@tursodatabase/serverless/compat";

const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run") || !apply;
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
}

const client = createClient({ url, authToken });
try {
  const planningRepairs = await findLegacyPlanningRepairs();
  const candidates = await findRepairCandidates();
  console.log(`Legacy execution planning repairs: ${planningRepairs.length}`);
  for (const [key, count] of summarizePlanningRepairs(planningRepairs)) {
    console.log(`  ${key}: ${count}`);
  }
  console.log(`Deterministic template repairs: ${candidates.length}`);
  for (const row of candidates) {
    console.log(
      `${row.local_date ?? "no-date"} | ${row.mark_id} | ${row.mark_title} | ${row.template_id} | ${row.template_title}`,
    );
  }

  if (dryRun) {
    console.log("Dry run complete. No Turso writes were made. Use --apply to repair these rows.");
  } else {
    let repairedPlanningItems = 0;
    const planningNow = Date.now();
    for (const row of planningRepairs) {
      const result = await client.execute({
        sql: `UPDATE week_plan_items
          SET template_id = ?,
              updated_at = CASE WHEN updated_at < ? THEN ? ELSE updated_at END,
              last_mutation_id = ?
          WHERE vault_id = ? AND id = ? AND deleted_at IS NULL AND template_id IS NULL;`,
        args: [
          row.template_id,
          planningNow,
          planningNow,
          `workspace_template_repair:${row.id}:${row.template_id}`,
          row.vault_id,
          row.id,
        ],
      });
      repairedPlanningItems += Number(result.rowsAffected ?? 0);
    }

    const markCandidates = planningRepairs.length > 0 ? await findRepairCandidates() : candidates;
    let repaired = 0;
    const now = Date.now();
    for (const row of markCandidates) {
      const result = await client.execute({
        sql: `UPDATE mark_instances
          SET template_id = ?,
              updated_at = CASE WHEN updated_at < ? THEN ? ELSE updated_at END,
              last_mutation_id = ?
          WHERE vault_id = ? AND id = ? AND deleted_at IS NULL AND template_id IS NULL;`,
        args: [
          row.template_id,
          now,
          now,
          `workspace_template_repair:${row.week_plan_item_id}:${row.template_id}`,
          row.vault_id,
          row.mark_id,
        ],
      });
      repaired += Number(result.rowsAffected ?? 0);
    }

    const [remainingPlanning, remainingMarks] = await Promise.all([
      findLegacyPlanningRepairs(),
      findRepairCandidates(),
    ]);
    console.log(
      `Applied template repairs: planning_items=${repairedPlanningItems}, marks=${repaired}, remaining_planning=${remainingPlanning.length}, remaining_marks=${remainingMarks.length}`,
    );
    if (remainingPlanning.length > 0 || remainingMarks.length > 0) {
      throw new Error(
        `${remainingPlanning.length} planning and ${remainingMarks.length} mark template repairs remain after apply.`,
      );
    }
  }
} finally {
  client.close();
}

async function findRepairCandidates() {
  const result = await client.execute(`
    SELECT mi.vault_id, mi.id AS mark_id, mi.title AS mark_title,
           td.local_date, wpi.id AS week_plan_item_id,
           wpi.template_id, mt.title AS template_title
    FROM mark_instances mi
    JOIN week_plan_items wpi
      ON wpi.vault_id = mi.vault_id
     AND wpi.deleted_at IS NULL
     AND wpi.template_id IS NOT NULL
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
    JOIN mark_templates mt
      ON mt.vault_id = mi.vault_id
     AND mt.id = wpi.template_id
     AND mt.deleted_at IS NULL
     AND mt.is_active = 1
    LEFT JOIN trail_days td
      ON td.vault_id = mi.vault_id AND td.id = mi.trail_day_id AND td.deleted_at IS NULL
    WHERE mi.deleted_at IS NULL AND mi.template_id IS NULL
    ORDER BY td.local_date, mi.scheduled_start_at, mi.id;
  `);
  return result.rows.map((row) =>
    Object.fromEntries(result.columns.map((column, index) => [column, row[index]])),
  );
}

async function findLegacyPlanningRepairs() {
  const [planningResult, routineResult] = await Promise.all([
    client.execute(`
      SELECT vault_id, id, title, local_date, block_key
      FROM week_plan_items
      WHERE deleted_at IS NULL
        AND status NOT IN ('removed', 'done')
        AND template_id IS NULL
        AND LOWER(COALESCE(block_key, '')) IN ('workout', 'golf_swing', 'golf_putt')
      ORDER BY local_date, start_time, id;
    `),
    client.execute(`
      SELECT wrt.id, wrt.mark_template_id, mt.title AS template_title
      FROM workout_routine_templates wrt
      JOIN mark_templates mt
        ON mt.vault_id = wrt.vault_id
       AND mt.id = wrt.mark_template_id
       AND mt.deleted_at IS NULL
       AND mt.is_active = 1
      WHERE wrt.deleted_at IS NULL
        AND wrt.is_active = 1
        AND wrt.id IN (
          'workout_routine_health_day_a_routine',
          'workout_routine_health_day_a2_routine',
          'workout_routine_health_day_b_routine',
          'workout_routine_health_walk_routine',
          'workout_routine_golf_practice_putting_routine',
          'workout_routine_golf_practice_chipping_3m_routine',
          'workout_routine_golf_practice_chipping_5m_routine',
          'workout_routine_golf_practice_chipping_7m_routine',
          'workout_routine_golf_practice_chipping_3_5_7m_routine',
          'workout_routine_golf_practice_swing_routine'
        );
    `),
  ]);
  const planningRows = rowsToObjects(planningResult);
  const routineRows = rowsToObjects(routineResult);
  const routineById = new Map(routineRows.map((row) => [String(row.id), row]));
  const repairs = [];
  const unresolved = [];
  for (const row of planningRows) {
    const routineId = resolveLegacyRoutineId(row);
    const routine = routineId ? routineById.get(routineId) : null;
    if (!routine?.mark_template_id) {
      unresolved.push(`${row.id} (${row.block_key}: ${row.title}) -> ${routineId ?? "unmapped"}`);
      continue;
    }
    repairs.push({
      ...row,
      routine_id: routineId,
      template_id: String(routine.mark_template_id),
      template_title: String(routine.template_title),
    });
  }
  if (unresolved.length > 0) {
    throw new Error(`Legacy execution items require an explicit mapping:\n${unresolved.join("\n")}`);
  }
  return repairs;
}

function resolveLegacyRoutineId(row) {
  const blockKey = String(row.block_key ?? "").trim().toLowerCase();
  const title = normalizeLegacyTitle(row.title);
  if (blockKey === "golf_putt") {
    return "workout_routine_golf_practice_putting_routine";
  }
  if (blockKey === "golf_swing") {
    if (title.includes("chipping 3-5-7")) return "workout_routine_golf_practice_chipping_3_5_7m_routine";
    if (title.includes("chipping 3 m")) return "workout_routine_golf_practice_chipping_3m_routine";
    if (title.includes("chipping 5 m")) return "workout_routine_golf_practice_chipping_5m_routine";
    if (title.includes("chipping 7 m")) return "workout_routine_golf_practice_chipping_7m_routine";
    if (title.startsWith("snag ")) return "workout_routine_golf_practice_swing_routine";
    return null;
  }
  if (blockKey !== "workout") {
    return null;
  }
  const workoutRoutineByTitle = new Map([
    ["workout a", "workout_routine_health_day_a_routine"],
    ["workout a1", "workout_routine_health_day_a_routine"],
    ["workout day a", "workout_routine_health_day_a_routine"],
    ["workout a2", "workout_routine_health_day_a2_routine"],
    ["workout b", "workout_routine_health_day_b_routine"],
    ["workout day b", "workout_routine_health_day_b_routine"],
    ["workout walk", "workout_routine_health_walk_routine"],
  ]);
  return workoutRoutineByTitle.get(title) ?? null;
}

function normalizeLegacyTitle(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[–—]/gu, "-")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

function summarizePlanningRepairs(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = `${row.routine_id} -> ${row.template_title}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function rowsToObjects(result) {
  return result.rows.map((row) =>
    Object.fromEntries(result.columns.map((column, index) => [column, row[index]])),
  );
}
