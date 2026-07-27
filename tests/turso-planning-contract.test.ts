import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const contractPath = path.join(repoRoot, "docs", "waymark-turso-planning-contract.md");

const requiredAcceptanceNames = [
  "turso_planning_manual_pull_uses_revision_ceiling",
  "turso_planning_pull_uses_snapshot_at_ceiling_not_current_row",
  "turso_planning_coalesces_to_last_snapshot_per_entity",
  "turso_planning_error_rolls_back_batch_and_cursor",
  "turso_planning_pull_does_not_enqueue_echo",
  "turso_week_plan_item_remote_insert_uses_stable_id",
  "turso_week_plan_item_replan_keeps_generation_identity",
  "turso_week_plan_item_replan_updates_existing_unstarted_mark",
  "turso_week_plan_item_replan_recomputes_old_and_new_trail_days",
  "turso_week_plan_item_replan_rejects_started_mark",
  "turso_week_plan_item_tombstone_does_not_rewrite_finalized_mark",
  "turso_signal_planning_pull_preserves_runtime_fields",
  "turso_signal_notification_reconciles_only_after_commit",
  "turso_signal_notification_failure_records_durable_retry",
  "turso_planning_full_resync_does_not_duplicate_entities_or_marks",
  "turso_planning_client_preserves_unknown_snapshot_fields",
] as const;

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function run() {
  assert.equal(fs.existsSync(contractPath), true, "Typed Turso planning contract must exist before production work.");
  const contract = fs.readFileSync(contractPath, "utf8");

  for (const testName of requiredAcceptanceNames) {
    assert.match(contract, new RegExp(`\\b${testName}\\b`), `Planning acceptance skeleton missing: ${testName}`);
  }

  assert.match(contract, /pull_ceiling = MAX\(change_sequence\)/, "Planning pull must capture a revision ceiling.");
  assert.match(contract, /payload_snapshot/, "Planning change log must retain full snapshots.");
  assert.match(contract, /write_source = remote_pull/, "Planning pull must suppress outbound echo.");
  assert.match(contract, /one planning administrator/, "Studio single-writer assumption must be explicit.");

  const markSchema = read("src/db/migrations/sql/0004_create_trail_days_and_marks.sql");
  assert.doesNotMatch(markSchema, /\bstarted_at\b/, "Phase 0 audit expects started_at to require an explicit migration decision.");

  const signalSchema = read("src/db/migrations/sql/0007_create_signals_dependencies.sql");
  assert.doesNotMatch(signalSchema, /\bis_enabled\b/, "Phase 0 audit expects Signal is_enabled to require a migration.");

  const weeklyImport = read("src/lib/waymark/weeklyTimetableImport.ts");
  assert.match(weeklyImport, /localDate:\s*raw\.localDate/, "Weekly identity audit must continue to cover local date.");
  assert.match(weeklyImport, /startTime:\s*raw\.startTime/, "Weekly identity audit must continue to cover start time.");
  assert.match(weeklyImport, /endTime:\s*raw\.endTime/, "Weekly identity audit must continue to cover end time.");
}

run();
console.log("turso planning Phase 0 contract tests passed");
