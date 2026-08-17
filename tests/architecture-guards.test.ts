import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..", "..");

function readFile(relativePath: string) {
  return stripComments(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function stripComments(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function walkFiles(relativeDir: string, extension: string, output: string[] = []) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(absoluteDir)) {
    return output;
  }

  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(relativePath, extension, output);
      continue;
    }
    if (entry.isFile() && relativePath.endsWith(extension)) {
      output.push(relativePath);
    }
  }

  return output;
}

function assertDoesNotContain(source: string, pattern: RegExp, message: string) {
  assert.equal(pattern.test(source), false, message);
}

function run() {
  const catalogIdBindings = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, "ai-resources", "Waymark DB sources", "catalog", "catalog-id-bindings.json"),
      "utf8",
    ),
  );
  const currentWeeklyPlan = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, "ai-resources", "Waymark DB sources", "weekly-plans", "weekly-plan-2026-08-10.json"),
      "utf8",
    ),
  );
  const workoutMinimalTemplateIds = new Set(
    currentWeeklyPlan.items
      .filter((item: { title?: string }) => item.title === "Workout Minimal")
      .map((item: { templateId?: string }) => item.templateId),
  );
  assert.deepEqual(
    [...workoutMinimalTemplateIds],
    [catalogIdBindings.markTemplates["Body weight rep progress"]],
    "Workspace catalog and weekly plan must bind Workout Minimal to the same canonical Turso template ID.",
  );

  const productionScreens = walkFiles("src/screens", ".tsx");
  const uiComponents = walkFiles("src/components", ".tsx");
  const appHooks = walkFiles("src/app", ".ts");
  const repositoryFiles = walkFiles(path.join("src", "db"), ".ts");
  const engineFiles = walkFiles(path.join("src", "lib", "waymark"), ".ts");
  const markdownFiles = [...walkFiles("docs", ".md"), ...walkFiles(path.join("ai-resources", "waymark"), ".md")];
  const ssotAcceptanceTestFiles = [
    "tests/ssot-outbox-mvp.test.ts",
    "tests/media-sync-hardening.test.ts",
    "tests/restore-before-seed.test.ts",
    "tests/weekly-primer-ssot.test.ts",
    "tests/turso-weekly-live-intake.test.ts",
    "tests/turso-signal-live-intake.test.ts",
  ];
  const requiredSsotAcceptanceTestNames = [
    "ssot_outbox_complete_planned_mark_retry_creates_one_completed_mark",
    "ssot_media_create_memory_photo_upload_fail_keeps_memory_and_marks_media_failed",
    "ssot_drive_upload_retry_reuses_existing_drive_file_for_media_asset",
    "ssot_sync_same_outbox_twice_does_not_duplicate_remote_record",
    "ssot_restore_before_seed_does_not_duplicate_paths_expeditions_milestones",
    "ssot_weekly_regenerate_preserves_materialized_mark_primer_and_user_edits",
    "ssot_journal_missing_local_media_does_not_render_ghost_poster",
    "ssot_delete_mark_writes_tombstone_without_remote_hard_delete",
    "ssot_weekly_timetable_upload_pushes_week_plan_and_items_once",
    "ssot_turso_remote_week_plan_item_edit_applies_to_local_sqlite_before_ui",
    "ssot_turso_remote_week_plan_item_edit_does_not_overwrite_materialized_mark_details",
    "ssot_turso_remote_edit_without_revision_is_rejected_or_conflict",
    "ssot_remote_week_plan_item_tombstone_hides_item_without_hard_deleting_completed_mark",
    "ssot_turso_remote_signal_edit_updates_local_sqlite_before_signal_engine",
    "ssot_turso_remote_signal_edit_with_missing_target_becomes_conflict",
    "ssot_remote_signal_tombstone_cancels_signal_without_mutating_target",
  ];

  const forbiddenFixtureSymbols = [
    "todayCockpitFixtures",
    "todayMarksFixture",
    "todayPackChecksFixture",
    "currentExpeditionFixtures",
    "plannedMarkFixtures",
    "expeditionDetailScreenFixtures",
    "closeTrailFixture",
    "pathCards",
    "backlogMockItems",
    "initialWeeklyItems",
    "initialJournalEvents",
    "initialJournalMemories",
    "initialShellSignals",
    "createDayAStrengthScenario",
    "createDayBStrengthScenario",
  ];
  const allowedFixtureSymbolsByScreen: Record<string, Set<string>> = {};

  for (const screenPath of productionScreens) {
    const source = readFile(screenPath);
    assertDoesNotContain(
      source,
      /\.\.\/db\/sqlite|SQLiteRepositories|getWaymarkDatabaseAsync|openWaymarkDatabaseAsync/,
      `Production screen must not query SQLite directly: ${screenPath}`,
    );

    for (const symbol of forbiddenFixtureSymbols) {
      if (allowedFixtureSymbolsByScreen[screenPath]?.has(symbol)) {
        continue;
      }
      assertDoesNotContain(
        source,
        new RegExp(`\\b${symbol}\\b`),
        `Production screen must not depend on fixture/mock symbol ${symbol}: ${screenPath}`,
      );
    }
  }

  for (const appPath of appHooks) {
    const source = readFile(appPath);
    for (const symbol of forbiddenFixtureSymbols) {
      assertDoesNotContain(
        source,
        new RegExp(`\\b${symbol}\\b`),
        `Production app hook/adapter must not depend on fixture/mock symbol ${symbol}: ${appPath}`,
      );
    }
  }

  for (const componentPath of uiComponents) {
    const source = readFile(componentPath);
    assertDoesNotContain(
      source,
      /src\/domain\/waymark\/repositories|domain\/waymark\/repositories|lib\/waymark\/(?!todayPathHero)|db\/sqlite|SQLiteRepositories/,
      `UI component must not import repositories/engines/SQLite directly: ${componentPath}`,
    );
    assertDoesNotContain(
      source,
      /app\/WaymarkAppProvider|src\/app\/WaymarkAppProvider|from "\.\.\/app"|from "\.\.\/\.\.\/app"/,
      `UI component must not import app provider/boundary directly: ${componentPath}`,
    );
  }

  for (const filePath of repositoryFiles) {
    const source = readFile(filePath);
    assertDoesNotContain(
      source,
      /from "\.\.\/components|from "\.\.\/\.\.\/components|src\/components\//,
      `Repository/db layer must not import React components: ${filePath}`,
    );
  }

  for (const filePath of engineFiles) {
    const source = readFile(filePath);
    assertDoesNotContain(
      source,
      /from "\.\.\/components|from "\.\.\/\.\.\/components|src\/components\//,
      `Engine/lib layer must not import React components: ${filePath}`,
    );
  }

  assert.equal(
    fs.existsSync(path.join(repoRoot, "src", "components", "domain", "CharacterResultPicker.tsx")),
    false,
    "Manual CharacterResultPicker must not remain in MVP after derived character result cleanup.",
  );
  assert.equal(
    fs.existsSync(path.join(repoRoot, "src", "components", "domain", "CharacterResultSummary.tsx")),
    true,
    "Derived CharacterResultSummary display component must exist.",
  );

  const contractPath = path.join(repoRoot, "docs", "waymark-source-of-truth-contract.md");
  assert.equal(fs.existsSync(contractPath), true, "Waymark source-of-truth contract doc must exist.");
  const contract = fs.readFileSync(contractPath, "utf8");
  assert.match(
    contract,
    /The existing Waymark Turso database is the sole structured-data source of truth for the Vault\. Local SQLite is a disposable offline cache\/working copy\. Google Drive stores media blobs; Turso stores every `media_assets` metadata row\./,
    "Waymark source-of-truth contract must include the governing sentence.",
  );
  assert.match(contract, /Lite may filter features and views but must not fork truth\./, "Waymark Lite must be documented as a filtered client, not a separate truth.");
  assert.match(contract, /Screens render from local SQLite and do not query Turso directly\./, "SSOT contract must keep screens on the local cache.");
  assert.match(contract, /The production drain point is EOD, normally after Close Trail:/, "SSOT contract must require EOD outbound mutation drain.");
  assert.match(contract, /Workspace-owned rows are rejected from the Waymark outbox\./, "SSOT contract must enforce writer ownership.");
  assert.match(contract, /Every other local SQLite table is migrated into that same database\./, "SSOT contract must require all tables in the existing Turso database.");
  assert.match(contract, /Catalog\/templates \| Workspace scripts publishing directly to Turso/, "SSOT contract must keep catalog publishing in workspace scripts.");
  assert.match(contract, /Human-readable names and titles are not unique keys\./, "SSOT contract must not forbid same-title semantic duplicates.");
  assert.match(contract, /Export migration must not insert, update, delete, tombstone, recreate, or replace them\./, "SSOT contract must protect the live baseline tables.");

  const fullDbAdrPath = path.join(repoRoot, "docs", "waymark-turso-full-database-v2.md");
  assert.equal(fs.existsSync(fullDbAdrPath), true, "Turso Full-DB v2 ADR must exist.");
  const fullDbAdr = fs.readFileSync(fullDbAdrPath, "utf8");
  assert.match(fullDbAdr, /Replacement database\/branch: forbidden/, "Full-DB cutover must stay in the existing Turso database.");
  assert.match(fullDbAdr, /`paths`, `expeditions`, and `mark_instances` retain their current remote rows/, "ADR must name protected live baselines.");

  const planningContractPath = path.join(repoRoot, "docs", "waymark-turso-planning-contract.md");
  assert.equal(fs.existsSync(planningContractPath), true, "Typed Turso planning contract doc must exist.");
  const planningContract = fs.readFileSync(planningContractPath, "utf8");
  assert.match(planningContract, /pull_ceiling = MAX\(change_sequence\)/, "Planning contract must define a pull ceiling.");
  assert.match(planningContract, /payload_snapshot/, "Planning contract must require full change snapshots.");
  assert.match(planningContract, /one planning administrator/, "Planning contract must state the Studio single-writer assumption.");

  const mvpContractPath = path.join(repoRoot, "docs", "waymark-ssot-mvp-implementation-contract.md");
  assert.equal(fs.existsSync(mvpContractPath), true, "Waymark SSOT MVP implementation contract doc must exist.");
  const mvpContract = fs.readFileSync(mvpContractPath, "utf8");
  assert.match(mvpContract, /Turso outbound upload is batch-driven, not real-time\./, "SSOT MVP contract must forbid realtime outbound Turso upload.");
  assert.match(mvpContract, /Waymark may create only `mark_instances`, `memories`, and `backlog_items`\./, "SSOT MVP contract must restrict mobile entity creation.");
  assert.match(mvpContract, /mobile bundle never seeds, repairs, imports, or publishes catalog\/planning entities\./, "SSOT MVP contract must keep workspace publishers out of mobile runtime.");
  assert.match(mvpContract, /\| `week_plans` \| editable_remote \| yes \|/, "SSOT MVP contract must mark week_plans remote-editable.");
  assert.match(mvpContract, /\| `week_plan_items` \| editable_remote \| yes \|/, "SSOT MVP contract must mark week_plan_items remote-editable.");
  assert.match(mvpContract, /\| `signals` \| editable_remote \| yes \|/, "SSOT MVP contract must mark signals remote-editable.");
  assert.match(mvpContract, /Signal remote edit rules are superseded by the planning contract:/, "SSOT MVP contract must delegate Signal field ownership to the planning contract.");
  assert.match(mvpContract, /Manual Pull flow for typed Turso planning edits:/, "SSOT MVP contract must define Manual Pull intake.");
  assert.match(mvpContract, /No realtime outbound sync and no immediate outbox drain after writes\./, "SSOT MVP contract must explicitly block immediate outbound drains.");

  const ssotAcceptanceSource = ssotAcceptanceTestFiles
    .map((relativePath) => {
      const absolutePath = path.join(repoRoot, relativePath);
      assert.equal(fs.existsSync(absolutePath), true, `SSOT Phase 0 acceptance test skeleton must exist: ${relativePath}`);
      return fs.readFileSync(absolutePath, "utf8");
    })
    .join("\n");
  for (const testName of requiredSsotAcceptanceTestNames) {
    assert.match(ssotAcceptanceSource, new RegExp(`\\b${testName}\\b`), `SSOT Phase 0 acceptance test skeleton missing: ${testName}`);
  }

  for (const markdownPath of markdownFiles) {
    const source = fs.readFileSync(path.join(repoRoot, markdownPath), "utf8");
    assertDoesNotContain(source, /Phone owns the truth|phone owns truth|SQLite\s*\|\s*Source of truth|Cloud not source of truth|Phone remains source/i, `Documentation must use the Waymark Vault source-of-truth model: ${markdownPath}`);
    assertDoesNotContain(source, /Turso is a structured sync and restore layer|Turso is still not the sole source of truth|Waymark-primary activity tables/i, `Documentation must not retain the legacy projection authority model: ${markdownPath}`);
  }

  const gitignore = fs.readFileSync(path.join(repoRoot, ".gitignore"), "utf8");
  assert.match(gitignore, /^\.env$/m, ".env must be ignored so real sync tokens are not committed.");

  const providerSource = readFile(path.join("src", "app", "WaymarkAppProvider.tsx"));
  assert.ok(
    providerSource.indexOf("runWaymarkVaultBootGateAsync") >= 0,
    "WaymarkAppProvider must run the Vault boot gate.",
  );
  assertDoesNotContain(
    providerSource,
    /bootstrapWaymarkMap|repairAuthoritativeWorkoutRoutines|createMarkTemplate|importWeeklyTimetable/,
    "Waymark runtime provider must never create or repair workspace-owned catalog/planning entities.",
  );

  const bootstrapSource = readFile(path.join("src", "waymark-map", "bootstrap.ts"));
  assert.match(bootstrapSource, /canSeedEntity\("daily_mark_assignment"/, "Production seed must guard dailyMarkAssignments.");
  assert.match(bootstrapSource, /canSeedEntity\("backlog_item"/, "Production seed must guard backlogItems.");

  const tursoHookSource = readFile(path.join("src", "app", "useWaymarkTursoDevSync.ts"));
  assert.match(tursoHookSource, /runWaymarkTursoPull/, "App Turso pull actions must use the shared coordinator.");
  assertDoesNotContain(
    tursoHookSource,
    /\bpullWaymarkFullDatabase(?:Snapshot|Changes)\b|\bpullTypedPlanning(?:FromTurso|WeekPlansFromTurso)\b/,
    "App Turso pull actions must not bypass the shared coordinator.",
  );

  const shellSource = readFile(path.join("src", "screens", "WaymarkShellApp.tsx"));
  assertDoesNotContain(
    shellSource,
    /importWeeklyTimetable20|importGolfProgramDevMarks|repairWorkoutDatabase|dev-weekly-imports/,
    "Workspace catalog/planning publishers must not be linked into the mobile runtime bundle.",
  );
  assert.match(
    shellSource,
    /days=\{weekly\.reviewDays\}/,
    "Weekly Timetable must receive the raw pulled timetable days instead of exposing only milestone-linked marks.",
  );
  assert.match(
    shellSource,
    /summary=\{weekly\.reviewSummary\}/,
    "Weekly Timetable must expose its materialization summary so missing local Mark links remain visible.",
  );
  assert.match(shellSource, /<PathsHomeTemplate/, "The Paths tab must own the weekly timetable experience.");
  assertDoesNotContain(
    shellSource,
    /pushRoute\(\{ kind: "weeklyTimetable" \}\)/,
    "Weekly Timetable must not remain a separate destination under Me.",
  );

  const pathsHomeSource = readFile(path.join("src", "components", "paths", "PathsHomeTemplate.tsx"));
  assert.ok(
    pathsHomeSource.indexOf("<WeeklyMilestoneCollection") < pathsHomeSource.indexOf("<DayOfWeekNavigator"),
    "Paths Home must render Weekly Milestones before Day of the Week.",
  );
  assert.match(
    pathsHomeSource,
    /<WeeklyDayPlanList/,
    "Day of the Week must merge raw plan items with materialized and standalone Marks.",
  );
  assert.match(
    pathsHomeSource,
    /isHistorical=\{selectedDayIsHistorical\}/,
    "Past Weekly Timetable dates must remain identifiable as Mark history.",
  );
  assert.match(pathsHomeSource, /onPull=\{onPullTurso\}/, "Paths Home must expose Turso Pull beside Weekly Timetable.");
  assert.match(pathsHomeSource, /onPush=\{onPushTurso\}/, "Paths Home must expose Turso Push beside Weekly Timetable.");

  const journalHomeSource = readFile(path.join("src", "components", "journal", "JournalHomeTemplate.tsx"));
  assert.match(journalHomeSource, /<JournalMediaSyncCard/, "Journal Home must own the Drive media backup action.");
  assertDoesNotContain(
    shellSource,
    /id: "prod-google-drive-(?:connect|run-upload)"/,
    "Drive connect/upload operations must not remain duplicated in Me settings.",
  );

  const appBarrelSource = readFile(path.join("src", "app", "index.ts"));
  assertDoesNotContain(
    appBarrelSource,
    /weeklyTimetableImport|golfProgramDevImport|repairWorkoutDatabase|sampleWeeklyTimetableImport/,
    "Workspace-only publishers must not be exported from the runtime app boundary.",
  );

  const waymarkLibBarrelSource = readFile(path.join("src", "lib", "waymark", "index.ts"));
  assertDoesNotContain(
    waymarkLibBarrelSource,
    /waymark-map\/bootstrap|weeklyTimetableImport|tursoAllTablesBootstrap/,
    "Runtime library barrel must not pull workspace bootstrap/publisher modules into the app bundle.",
  );

  const pullCoordinatorSource = readFile(path.join("src", "lib", "waymark", "tursoPullCoordinator.ts"));
  assertDoesNotContain(
    pullCoordinatorSource,
    /waymark-map|SeedRegistry|reconcilePulledHierarchySeedRegistry/,
    "Turso pull must apply canonical remote IDs directly without seed-registry reconciliation.",
  );
}

run();
console.log("architecture-guards tests passed");
