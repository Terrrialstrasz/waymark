import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import {
  WAYMARK_TURSO_EOD_MUTABLE_TABLES,
  WAYMARK_TURSO_FULL_DB_MIGRATABLE_TABLES,
  WAYMARK_TURSO_FULL_DB_SNAPSHOT_TABLES,
  WAYMARK_TURSO_FULL_DB_SCHEMA_SQL,
  WAYMARK_TURSO_FULL_DB_TABLES,
  WAYMARK_TURSO_PROTECTED_CANONICAL_TABLES,
  canMigrateLocalRowsIntoTursoTable,
  canWaymarkMutateFullDbField,
  getWaymarkFullDbTableSpec,
  isWaymarkFullDbLocalOnlyColumn,
  pullWaymarkFullDatabaseChanges,
  pullWaymarkFullDatabaseSnapshot,
  type WaymarkFullDbChange,
} from "../src/lib/waymark";

type RunResult = { changes: number; lastInsertRowId: number };

class NodeSqliteAdapter {
  constructor(private readonly db: DatabaseSync) {}

  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
  }

  async runAsync(source: string, ...params: unknown[]): Promise<RunResult> {
    const result = this.db.prepare(source).run(...(params as any[]));
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid ?? 0) };
  }

  async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
    return (this.db.prepare(source).get(...(params as any[])) as T | undefined) ?? null;
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(source).all(...(params as any[])) as T[];
  }

  async withExclusiveTransactionAsync(task: (txn: NodeSqliteAdapter) => Promise<void>): Promise<void> {
    this.db.exec("BEGIN IMMEDIATE;");
    try {
      await task(new NodeSqliteAdapter(this.db));
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }
}

async function run() {
  const local = new DatabaseSync(":memory:");
  const localAdapter = new NodeSqliteAdapter(local);
  await applyMigrationsAsync(localAdapter as any);

  const localTables = (local
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
    .all() as Array<{ name: string }>).map((row) => row.name);
  const contractTables = WAYMARK_TURSO_FULL_DB_TABLES.map((spec) => spec.tableName).sort();

  assert.deepEqual(contractTables, localTables, "Every local Waymark table must have a Full-DB contract entry.");
  assert.deepEqual([...WAYMARK_TURSO_PROTECTED_CANONICAL_TABLES].sort(), ["expeditions", "mark_instances", "paths"]);
  assert.deepEqual(
    WAYMARK_TURSO_FULL_DB_TABLES.filter((spec) => spec.migrationMode === "preserve_remote").map((spec) => spec.tableName).sort(),
    ["expeditions", "mark_instances", "paths"],
    "Only the three approved live Turso tables may bypass export migration",
  );
  assert.equal(canMigrateLocalRowsIntoTursoTable("paths"), false);
  assert.equal(canMigrateLocalRowsIntoTursoTable("expeditions"), false);
  assert.equal(canMigrateLocalRowsIntoTursoTable("mark_instances"), false);
  assert.equal(canMigrateLocalRowsIntoTursoTable("memories"), true);
  assert.equal(canMigrateLocalRowsIntoTursoTable("unknown_table"), false);
  assert.equal(getWaymarkFullDbTableSpec("memories")?.source, "local_export_seed");
  assert.equal(getWaymarkFullDbTableSpec("week_plan_items")?.source, "workspace_publish");
  assert.equal(canWaymarkMutateFullDbField("paths", "title"), false);
  assert.equal(canWaymarkMutateFullDbField("expeditions", "status"), true);
  assert.equal(canWaymarkMutateFullDbField("expeditions", "title"), false);
  assert.equal(canWaymarkMutateFullDbField("mark_instances", "status"), true);
  assert.equal(canWaymarkMutateFullDbField("mark_instances", "path_id"), false);
  assert.equal(isWaymarkFullDbLocalOnlyColumn("sync_status"), true);
  assert.equal(isWaymarkFullDbLocalOnlyColumn("local_revision"), true);
  assert.equal(isWaymarkFullDbLocalOnlyColumn("updated_at"), false);
  const snapshotPosition = (tableName: string) => WAYMARK_TURSO_FULL_DB_SNAPSHOT_TABLES.indexOf(tableName);
  assert.ok(snapshotPosition("paths") < snapshotPosition("expeditions"));
  assert.ok(snapshotPosition("expeditions") < snapshotPosition("milestones"));
  assert.ok(snapshotPosition("mark_templates") < snapshotPosition("mark_pack_check_rules"));
  assert.ok(snapshotPosition("pack_check_templates") < snapshotPosition("pack_check_item_templates"));
  assert.ok(snapshotPosition("week_plans") < snapshotPosition("week_plan_items"));
  assert.ok(snapshotPosition("pack_check_instances") < snapshotPosition("pack_check_item_instances"));
  assert.ok(snapshotPosition("workout_routine_templates") < snapshotPosition("routine_exercise_templates"));
  assert.equal(WAYMARK_TURSO_EOD_MUTABLE_TABLES.some((spec) => spec.tableName === "memories"), true);
  assert.equal(WAYMARK_TURSO_FULL_DB_MIGRATABLE_TABLES.some((spec) => spec.tableName === "paths"), false);
  assert.deepEqual(
    WAYMARK_TURSO_FULL_DB_TABLES
      .filter((spec) => (spec.businessIdentities?.length ?? 0) > 0)
      .map((spec) => spec.tableName)
      .sort(),
    [
      "app_settings",
      "daily_media_upload_batches",
      "exercise_progress_states",
      "mark_instances",
      "media_assets",
      "pack_check_instances",
      "planning_conflicts",
      "sync_outbox",
      "trail_days",
      "week_plan_items",
      "week_plans",
      "workout_session_instances",
    ],
    "Every synced table with an additional local UNIQUE key must declare its reconciliation identity.",
  );

  const remoteControl = new DatabaseSync(":memory:");
  remoteControl.exec(WAYMARK_TURSO_FULL_DB_SCHEMA_SQL);
  remoteControl.exec(WAYMARK_TURSO_FULL_DB_SCHEMA_SQL);
  const controlTables = (remoteControl
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'waymark_full_db_%' ORDER BY name;")
    .all() as Array<{ name: string }>).map((row) => row.name);
  assert.deepEqual(controlTables, [
    "waymark_full_db_change_log",
    "waymark_full_db_device_cursors",
    "waymark_full_db_idempotency",
    "waymark_full_db_migrations",
    "waymark_full_db_schema_metadata",
    "waymark_full_db_snapshots",
    "waymark_full_db_table_manifests",
  ]);

  local.exec(`
    INSERT INTO vaults (id, name, created_at, updated_at, status)
    VALUES ('vault_test', 'Test', 1, 1, 'active');
    INSERT INTO devices (id, vault_id, client_type, device_name, created_at, last_seen_at)
    VALUES ('device_test', 'vault_test', 'main', 'Test', 1, 1);
    INSERT INTO user_profiles (
      id, user_id, display_name, locale, timezone, week_starts_on,
      created_at, updated_at, sync_status, local_revision
    ) VALUES ('profile_test', 'user_test', 'Local', 'vi', 'Asia/Saigon', 1, 1, 1, 'local', 1);
  `);
  const snapshotAdapter = {
    async getSchemaState() {
      return { schemaVersion: 1, migrationMode: "active" as const };
    },
    async getChangeCeiling() {
      return 7;
    },
    async listSnapshotRows(input: { tableName: string; offset?: number }) {
      if ((input.offset ?? 0) > 0) return [];
      if (input.tableName === "user_profiles") {
        return [{
          tableName: "user_profiles",
          values: {
            id: "profile_test",
            user_id: "user_test",
            display_name: "Turso",
            locale: "vi",
            timezone: "Asia/Saigon",
            week_starts_on: 1,
            close_trail_prompt_time: null,
            created_at: 1,
            updated_at: 7,
            deleted_at: null,
            sync_status: null,
            local_revision: null,
            _remote_entity_revision: 7,
          },
        }];
      }
      if (input.tableName === "paths") {
        return [{
          tableName: "paths",
          values: {
            id: "path_remote",
            user_id: "user_test",
            name: "Remote Path",
            subtitle: null,
            slug: "remote-path",
            title: "Remote Path",
            description: null,
            status: "active",
            color_token: null,
            icon_key: null,
            sort_order: 0,
            is_active: null,
            hero_media_asset_id: null,
            created_at: 1,
            updated_at: 4,
            deleted_at: null,
            _remote_entity_revision: 4,
          },
        }];
      }
      if (input.tableName === "mark_templates") {
        return [{
          tableName: "mark_templates",
          values: {
            id: "template_legacy",
            user_id: "user_test",
            path_id: "path_remote",
            title: "Legacy Template",
            description: null,
            template_type: "habit",
            recurrence_type: "none",
            recurrence_rule_json: "{}",
            default_duration_min: null,
            default_signal_rule_json: null,
            is_active: 1,
            created_at: 1,
            updated_at: 5,
            deleted_at: null,
            sync_status: null,
            local_revision: null,
            _remote_entity_revision: 5,
          },
        }];
      }
      return [];
    },
    async listChanges() {
      return [] as WaymarkFullDbChange[];
    },
  };
  const snapshotResult = await pullWaymarkFullDatabaseSnapshot({
    database: localAdapter as any,
    adapter: snapshotAdapter,
    vaultId: "vault_test",
    deviceId: "device_test",
    pageSize: 10,
    now: 10,
  });
  assert.equal(snapshotResult.throughGlobalRevision, 7);
  assert.deepEqual(
    { ...local.prepare("SELECT display_name, sync_status, local_revision FROM user_profiles WHERE id = 'profile_test';").get() },
    { display_name: "Turso", sync_status: "synced", local_revision: 7 },
  );
  assert.deepEqual(
    { ...local.prepare("SELECT is_active, sync_status, local_revision FROM paths WHERE id = 'path_remote';").get() },
    { is_active: 1, sync_status: "synced", local_revision: 4 },
  );
  assert.deepEqual(
    { ...local.prepare("SELECT sync_status, local_revision FROM mark_templates WHERE id = 'template_legacy';").get() },
    { sync_status: "synced", local_revision: 5 },
  );
  assert.equal(local.prepare("SELECT last_cloud_revision FROM sync_state WHERE vault_id = 'vault_test';").get()?.last_cloud_revision, 7);

  const incrementalChanges: WaymarkFullDbChange[] = [
    {
      globalRevision: 8,
      tableName: "user_profiles",
      deviceId: null,
      rowKey: "profile_test",
      operation: "update",
      entityRevision: 8,
      payload: {
        id: "profile_test",
        user_id: "user_test",
        display_name: "Turso v2",
        locale: "vi",
        timezone: "Asia/Saigon",
        week_starts_on: 1,
        created_at: 1,
        updated_at: 8,
        sync_status: "dirty",
        local_revision: null,
        _remote_entity_revision: 8,
      },
      mutationId: "workspace_8",
      changedAt: 8,
    },
    {
      globalRevision: 9,
      tableName: "app_settings",
      deviceId: "another_device",
      rowKey: "setting_other",
      operation: "create",
      entityRevision: 1,
      payload: { id: "setting_other", user_id: "user_test", key: "other", value_json: "{}", created_at: 9, updated_at: 9 },
      mutationId: "other_device_9",
      changedAt: 9,
    },
  ];
  const incrementalResult = await pullWaymarkFullDatabaseChanges({
    database: localAdapter as any,
    adapter: {
      ...snapshotAdapter,
      async getChangeCeiling() {
        return 9;
      },
      async listChanges() {
        return incrementalChanges;
      },
    },
    vaultId: "vault_test",
    deviceId: "device_test",
    now: 11,
  });
  assert.equal(incrementalResult.applied, 1);
  assert.equal(incrementalResult.skipped, 1);
  assert.equal(local.prepare("SELECT display_name FROM user_profiles WHERE id = 'profile_test';").get()?.display_name, "Turso v2");
  assert.deepEqual(
    { ...local.prepare("SELECT sync_status, local_revision FROM user_profiles WHERE id = 'profile_test';").get() },
    { sync_status: "synced", local_revision: 8 },
  );
  assert.equal(local.prepare("SELECT COUNT(*) AS count FROM app_settings WHERE id = 'setting_other';").get()?.count, 0);
  assert.equal(local.prepare("SELECT last_cloud_revision FROM sync_state WHERE vault_id = 'vault_test';").get()?.last_cloud_revision, 9);

  const identityLocal = new DatabaseSync(":memory:");
  const identityAdapter = new NodeSqliteAdapter(identityLocal);
  await applyMigrationsAsync(identityAdapter as any);
  identityLocal.exec(`
    INSERT INTO vaults (id, name, created_at, updated_at, status)
    VALUES ('vault_identity', 'Identity vault', 1, 1, 'active');
    INSERT INTO devices (id, vault_id, client_type, device_name, created_at, last_seen_at)
    VALUES ('device_identity', 'vault_identity', 'main', 'Identity device', 1, 1);
    INSERT INTO trail_days (
      id, user_id, local_date, status, created_at, updated_at, sync_status, local_revision
    ) VALUES ('trail_identity', 'user_test', '2026-08-09', 'open', 1, 1, 'synced', 1);
    INSERT INTO pack_check_instances (
      id, user_id, trail_day_id, title, status, generation_key,
      created_at, updated_at, deleted_at, sync_status, local_revision
    ) VALUES
      ('pack_remote', 'user_test', 'trail_identity', 'Old canonical', 'cancelled', 'generation_test', 1, 2, 2, 'dirty', 2),
      ('pack_local', 'user_test', 'trail_identity', 'Divergent local', 'available', 'generation_test', 3, 3, NULL, 'dirty', 1);
    INSERT INTO pack_check_item_instances (
      id, user_id, pack_check_instance_id, label, is_required, is_checked,
      sort_order, order_index, created_at, updated_at, sync_status, local_revision
    ) VALUES
      ('item_local', 'user_test', 'pack_local', 'Stale local item', 1, 0, 0, 0, 3, 3, 'dirty', 1),
      ('item_old_remote', 'user_test', 'pack_remote', 'Stale canonical item', 1, 0, 0, 0, 2, 2, 'dirty', 1);
    INSERT INTO signals (
      id, user_id, target_type, target_id, scheduled_at, status,
      created_at, updated_at, sync_status, local_revision
    ) VALUES ('signal_local_pack', 'user_test', 'pack_check_instance', 'pack_local', 10, 'scheduled', 3, 3, 'dirty', 1);
  `);
  const identitySnapshotAdapter = {
    async getSchemaState() {
      return { schemaVersion: 1, migrationMode: "active" as const };
    },
    async getChangeCeiling() {
      return 12;
    },
    async listChanges() {
      return [] as WaymarkFullDbChange[];
    },
    async listSnapshotRows(input: { tableName: string; offset?: number }) {
      if ((input.offset ?? 0) > 0) return [];
      if (input.tableName === "pack_check_instances") {
        return [{
          tableName: "pack_check_instances",
          values: {
            id: "pack_remote",
            user_id: "user_test",
            template_id: null,
            trail_day_id: "trail_identity",
            target_mark_instance_id: null,
            title: "Canonical Turso pack",
            description: null,
            status: "available",
            available_from: null,
            due_at: null,
            completed_at: null,
            skipped_at: null,
            cancelled_at: null,
            generation_key: "generation_test",
            created_at: 1,
            updated_at: 12,
            deleted_at: null,
            _remote_entity_revision: 12,
          },
        }];
      }
      if (input.tableName === "pack_check_item_instances") {
        return [{
          tableName: "pack_check_item_instances",
          values: {
            id: "item_remote",
            user_id: "user_test",
            pack_check_instance_id: "pack_remote",
            template_item_id: null,
            label: "Canonical Turso item",
            is_required: 1,
            is_checked: 1,
            checked_at: 12,
            sort_order: 0,
            order_index: 0,
            created_at: 1,
            updated_at: 12,
            deleted_at: null,
            _remote_entity_revision: 12,
          },
        }];
      }
      return [];
    },
  };
  await pullWaymarkFullDatabaseSnapshot({
    database: identityAdapter as any,
    adapter: identitySnapshotAdapter,
    vaultId: "vault_identity",
    deviceId: "device_identity",
    now: 12,
  });
  assert.equal(identityLocal.prepare("SELECT COUNT(*) AS count FROM pack_check_instances WHERE id = 'pack_local';").get()?.count, 0);
  assert.deepEqual(
    { ...identityLocal.prepare("SELECT title, deleted_at, sync_status, local_revision FROM pack_check_instances WHERE id = 'pack_remote';").get() },
    { title: "Canonical Turso pack", deleted_at: null, sync_status: "synced", local_revision: 12 },
  );
  assert.deepEqual(
    identityLocal.prepare("SELECT id, pack_check_instance_id, label FROM pack_check_item_instances ORDER BY id;").all().map((row) => ({ ...row })),
    [{ id: "item_remote", pack_check_instance_id: "pack_remote", label: "Canonical Turso item" }],
  );
  assert.equal(
    identityLocal.prepare("SELECT target_id FROM signals WHERE id = 'signal_local_pack';").get()?.target_id,
    "pack_remote",
  );
  identityLocal.close();

  const duplicateRemote = new DatabaseSync(":memory:");
  const duplicateRemoteAdapter = new NodeSqliteAdapter(duplicateRemote);
  await applyMigrationsAsync(duplicateRemoteAdapter as any);
  await assert.rejects(
    pullWaymarkFullDatabaseSnapshot({
      database: duplicateRemoteAdapter as any,
      adapter: {
        ...identitySnapshotAdapter,
        async listSnapshotRows(input: { tableName: string; offset?: number }) {
          if ((input.offset ?? 0) > 0 || input.tableName !== "pack_check_instances") return [];
          const base = (await identitySnapshotAdapter.listSnapshotRows(input))[0];
          return [base, { ...base, values: { ...base.values, id: "pack_remote_duplicate" } }];
        },
      },
      vaultId: "vault_duplicate",
      deviceId: "device_duplicate",
      now: 12,
    }),
    /snapshot contains duplicate pack_check_instances\.active_generation_key/,
  );
  assert.equal(duplicateRemote.prepare("SELECT COUNT(*) AS count FROM sync_state;").get()?.count, 0);
  duplicateRemote.close();

  const rollbackLocal = new DatabaseSync(":memory:");
  const rollbackAdapter = new NodeSqliteAdapter(rollbackLocal);
  await applyMigrationsAsync(rollbackAdapter as any);
  rollbackLocal.prepare(`
    INSERT INTO paths (
      id, user_id, name, slug, title, status, sort_order,
      created_at, updated_at, sync_status, local_revision
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `).run("path_rollback", "user_test", "Before", "rollback", "Before", "active", 0, 1, 1, "local", 0);

  await assert.rejects(
    pullWaymarkFullDatabaseSnapshot({
      database: rollbackAdapter as any,
      adapter: {
        async getSchemaState() {
          return { schemaVersion: 1, migrationMode: "active" as const };
        },
        async getChangeCeiling() {
          return 99;
        },
        async listChanges() {
          return [];
        },
        async listSnapshotRows(input: { tableName: string }) {
          if (input.tableName === "paths") {
            return [{
              tableName: "paths",
              values: {
                id: "path_rollback",
                user_id: "user_test",
                name: "Remote",
                slug: "rollback",
                title: "Should Roll Back",
                status: "active",
                sort_order: 0,
                is_active: 1,
                created_at: 1,
                updated_at: 2,
                _remote_entity_revision: 2,
              },
            }];
          }
          if (input.tableName === "mark_templates") {
            return [{
              tableName: "mark_templates",
              values: {
                id: "template_invalid",
                user_id: "user_test",
                path_id: "path_rollback",
                title: null,
                template_type: "habit",
                recurrence_type: "none",
                recurrence_rule_json: "{}",
                is_active: 1,
                created_at: 1,
                updated_at: 2,
                sync_status: null,
                local_revision: null,
                _remote_entity_revision: 1,
              },
            }];
          }
          return [];
        },
      },
      vaultId: "vault_rollback",
      deviceId: "device_rollback",
      pageSize: 10,
      now: 100,
    }),
    /mark_templates\.title is required for id=template_invalid/,
  );
  assert.equal(rollbackLocal.prepare("SELECT title FROM paths WHERE id = 'path_rollback';").get()?.title, "Before");
  assert.equal(rollbackLocal.prepare("SELECT COUNT(*) AS count FROM mark_templates WHERE id = 'template_invalid';").get()?.count, 0);
  assert.equal(rollbackLocal.prepare("SELECT COUNT(*) AS count FROM sync_state WHERE vault_id = 'vault_rollback';").get()?.count, 0);
  rollbackLocal.close();

  local.close();
  remoteControl.close();
}

void run()
  .then(() => console.log("turso-full-database tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
