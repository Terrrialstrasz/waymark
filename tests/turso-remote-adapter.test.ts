import assert from "node:assert/strict";
import { WaymarkTursoRemoteAdapter, getWaymarkTursoRemoteSchemaSql } from "../src/lib/waymark/tursoRemoteAdapter";
import type { SyncOutboxRow } from "../src/lib/waymark/ssotOutbox";
import { WAYMARK_TURSO_DEV_CLEAR_TABLES } from "../src/lib/waymark/tursoPlanningSchema";

type FakeResultSet = {
  rows: any[];
  lastInsertRowid?: bigint;
};

class FakeTursoCompatClient {
  schemaSql = "";
  revision = 0;
  idempotency = new Map<string, any>();
  planningIdempotency = new Map<string, any>();
  records = new Map<string, any>();
  weekPlans = new Map<string, any>();
  paths = new Map<string, any>();
  expeditions = new Map<string, any>();
  markInstances = new Map<string, any>();
  changes: any[] = [];
  planningChanges: any[] = [];
  closed = false;
  protocol = "fake";

  async execute(stmt: any): Promise<FakeResultSet> {
    const sql = typeof stmt === "string" ? stmt : stmt.sql;
    const args = typeof stmt === "string" ? [] : stmt.args ?? [];
    if (sql.includes("FROM waymark_remote_idempotency")) {
      const row = this.idempotency.get(String(args[0]));
      return { rows: row ? [row] : [] };
    }
    if (sql.includes("FROM waymark_planning_idempotency")) {
      const row = this.planningIdempotency.get(String(args[0]));
      return { rows: row ? [row] : [] };
    }
    if (sql.includes("MAX(change_sequence)") && sql.includes("waymark_planning_change_log")) {
      const vaultId = String(args[0]);
      return {
        rows: [
          {
            change_sequence: BigInt(
              this.planningChanges
                .filter((row) => row.vault_id === vaultId)
                .reduce((max, row) => Math.max(max, Number(row.change_sequence)), 0),
            ),
          },
        ],
      };
    }
    if (sql.includes("FROM waymark_planning_change_log")) {
      const vaultId = String(args[0]);
      const after = Number(args[1]);
      const through = Number(args[2]);
      const entityArgs = args.slice(3, -1).map(String);
      const limit = Number(args[args.length - 1]);
      const rows = this.planningChanges
        .filter((row) => row.vault_id === vaultId)
        .filter((row) => Number(row.change_sequence) > after && Number(row.change_sequence) <= through)
        .filter((row) => entityArgs.length === 0 || entityArgs.includes(row.entity_type))
        .slice(0, limit);
      return { rows };
    }
    if (sql.includes("FROM waymark_remote_change_log")) {
      const vaultId = String(args[0]);
      const after = Number(args[1]);
      const entityArgs = args.slice(2, -1).map(String);
      const limit = Number(args[args.length - 1]);
      const rows = this.changes
        .filter((row) => row.vault_id === vaultId)
        .filter((row) => Number(row.remote_revision) > after)
        .filter((row) => entityArgs.length === 0 || entityArgs.includes(row.entity_type))
        .slice(0, limit);
      return { rows };
    }
    return { rows: [] };
  }

  async executeMultiple(sql: string): Promise<void> {
    this.schemaSql = sql;
  }

  async transaction() {
    const client = this;
    return {
      closed: false,
      async execute(stmt: any): Promise<FakeResultSet> {
        const sql = stmt.sql;
        const args = stmt.args ?? [];
        if (sql.includes("INSERT INTO waymark_remote_change_log")) {
          const remote_revision = BigInt(++client.revision);
          const row = {
            remote_revision,
            vault_id: args[0],
            entity_type: args[1],
            entity_id: args[2],
            operation: args[3],
            payload_json: args[4],
            deleted_at: args[6] ?? null,
            updated_at: args[7],
          };
          client.changes.push(row);
          return { rows: [], lastInsertRowid: remote_revision };
        }
        if (sql.includes("INSERT INTO waymark_remote_records")) {
          const row = {
            vault_id: args[0],
            entity_type: args[1],
            entity_id: args[2],
            operation: args[3],
            remote_revision: BigInt(Number(args[4])),
            last_idempotency_key: args[5],
            payload_json: args[6],
            deleted_at: args[8] ?? null,
            updated_at: args[9],
          };
          client.records.set(`${row.vault_id}:${row.entity_type}:${row.entity_id}`, row);
          return { rows: [] };
        }
        if (sql.includes("INSERT INTO waymark_remote_idempotency")) {
          const row = {
            idempotency_key: args[0],
            vault_id: args[1],
            entity_type: args[2],
            entity_id: args[3],
            operation: args[4],
            remote_revision: BigInt(Number(args[5])),
            created_at: args[6],
          };
          client.idempotency.set(String(args[0]), row);
          return { rows: [] };
        }
        if (sql.includes("INSERT INTO week_plans")) {
          const key = `${args[1]}:${args[0]}`;
          const existing = client.weekPlans.get(key);
          const revision = BigInt(existing ? Number(existing.entity_revision) + 1 : 1);
          const row = {
            id: args[0],
            vault_id: args[1],
            user_id: args[2],
            week_start_date: args[3],
            week_end_date: args[4],
            status: args[5],
            summary: args[6],
            note: args[7],
            created_at: args[8],
            updated_at: args[9],
            deleted_at: args[10] ?? null,
            last_mutation_id: args[11],
            entity_revision: Number(revision),
          };
          client.weekPlans.set(key, row);
          const change_sequence = BigInt(client.planningChanges.length + 1);
          client.planningChanges.push({
            change_sequence,
            vault_id: row.vault_id,
            entity_type: "week_plan",
            entity_id: row.id,
            operation: row.deleted_at === null ? (existing ? "update" : "create") : "delete",
            entity_revision: revision,
            payload_snapshot: JSON.stringify(row),
            payload_schema_version: BigInt(1),
            deleted_at: row.deleted_at,
            updated_at: row.updated_at,
            mutation_id: row.last_mutation_id,
            created_at: 99,
          });
          return { rows: [] };
        }
        if (sql.includes("INSERT INTO paths")) {
          const row = {
            id: args[0],
            vault_id: args[1],
            user_id: args[2],
            name: args[3],
            subtitle: args[4],
            slug: args[5],
            title: args[6],
            description: args[7],
            status: args[8],
            color_token: args[9],
            icon_key: args[10],
            sort_order: args[11],
            is_active: args[12],
            hero_media_asset_id: args[13],
            created_at: args[14],
            updated_at: args[15],
            deleted_at: args[16] ?? null,
            last_mutation_id: args[17],
          };
          client.paths.set(`${row.vault_id}:${row.id}`, row);
          return { rows: [] };
        }
        if (sql.includes("MAX(change_sequence)") && sql.includes("waymark_planning_change_log")) {
          const vaultId = String(args[0]);
          const entityId = String(args[1]);
          const change = client.planningChanges
            .filter((row) => row.vault_id === vaultId && row.entity_id === entityId)
            .at(-1);
          return { rows: [{ change_sequence: change?.change_sequence ?? BigInt(0) }] };
        }
        if (sql.includes("INSERT INTO waymark_planning_idempotency")) {
          const row = {
            mutation_id: args[0],
            vault_id: args[1],
            entity_type: "week_plan",
            entity_id: args[2],
            operation: args[3],
            change_sequence: BigInt(Number(args[4])),
            created_at: args[5],
          };
          client.planningIdempotency.set(String(args[0]), row);
          return { rows: [] };
        }
        if (sql.includes("DELETE FROM week_plan_items")) {
          return { rows: [] };
        }
        if (sql.includes("DELETE FROM mark_instances")) {
          const vaultId = String(args[0]);
          for (const key of Array.from(client.markInstances.keys())) {
            if (key.startsWith(`${vaultId}:`)) {
              client.markInstances.delete(key);
            }
          }
          return { rows: [] };
        }
        if (sql.includes("DELETE FROM expeditions")) {
          const vaultId = String(args[0]);
          for (const key of Array.from(client.expeditions.keys())) {
            if (key.startsWith(`${vaultId}:`)) {
              client.expeditions.delete(key);
            }
          }
          return { rows: [] };
        }
        if (sql.includes("DELETE FROM paths")) {
          const vaultId = String(args[0]);
          for (const key of Array.from(client.paths.keys())) {
            if (key.startsWith(`${vaultId}:`)) {
              client.paths.delete(key);
            }
          }
          return { rows: [] };
        }
        if (sql.includes("DELETE FROM week_plans")) {
          const vaultId = String(args[0]);
          for (const key of Array.from(client.weekPlans.keys())) {
            if (key.startsWith(`${vaultId}:`)) {
              client.weekPlans.delete(key);
            }
          }
          return { rows: [] };
        }
        if (sql.includes("DELETE FROM signals")) {
          return { rows: [] };
        }
        if (sql.includes("DELETE FROM waymark_planning_change_log")) {
          const vaultId = String(args[0]);
          client.planningChanges = client.planningChanges.filter((row) => row.vault_id !== vaultId);
          return { rows: [] };
        }
        if (sql.includes("DELETE FROM waymark_planning_idempotency")) {
          const vaultId = String(args[0]);
          for (const [key, row] of Array.from(client.planningIdempotency.entries())) {
            if (row.vault_id === vaultId) {
              client.planningIdempotency.delete(key);
            }
          }
          return { rows: [] };
        }
        if (sql.includes("DELETE FROM waymark_remote_change_log")) {
          const vaultId = String(args[0]);
          client.changes = client.changes.filter((row) => row.vault_id !== vaultId);
          return { rows: [] };
        }
        if (sql.includes("DELETE FROM waymark_remote_records")) {
          const vaultId = String(args[0]);
          for (const key of Array.from(client.records.keys())) {
            if (key.startsWith(`${vaultId}:`)) {
              client.records.delete(key);
            }
          }
          return { rows: [] };
        }
        if (sql.includes("DELETE FROM waymark_remote_idempotency")) {
          const vaultId = String(args[0]);
          for (const [key, row] of Array.from(client.idempotency.entries())) {
            if (row.vault_id === vaultId) {
              client.idempotency.delete(key);
            }
          }
          return { rows: [] };
        }
        return { rows: [] };
      },
      async batch() {
        return [];
      },
      async executeMultiple() {},
      async commit() {},
      async rollback() {},
      close() {
        this.closed = true;
      },
    };
  }

  async batch() {
    return [];
  }

  async migrate() {
    return [];
  }

  sync() {
    return Promise.resolve();
  }

  close() {
    this.closed = true;
  }
}

function createOutboxRow(): SyncOutboxRow {
  return {
    id: "outbox_1",
    vault_id: "vault_1",
    device_id: "device_1",
    db_instance_id: "db_1",
    entity_type: "week_plan_item",
    entity_id: "week_plan_item_1",
    operation: "update",
    idempotency_key: "vault_1:device_1:week_plan_item:week_plan_item_1:update:1",
    local_revision: 1,
    base_remote_revision: null,
    payload_json: JSON.stringify({ id: "week_plan_item_1", title: "Push to Turso" }),
    payload_schema_version: 1,
    status: "pending",
    retry_count: 0,
    last_error: null,
    created_at: 1,
    updated_at: 2,
    synced_at: null,
  };
}

async function run() {
  assert.match(getWaymarkTursoRemoteSchemaSql(), /CREATE TABLE IF NOT EXISTS waymark_remote_records/);
  assert.match(getWaymarkTursoRemoteSchemaSql(), /CREATE TABLE IF NOT EXISTS waymark_remote_change_log/);
  assert.match(getWaymarkTursoRemoteSchemaSql(), /CREATE TABLE IF NOT EXISTS waymark_remote_idempotency/);
  assert.match(getWaymarkTursoRemoteSchemaSql(), /CREATE TABLE IF NOT EXISTS waymark_planning_change_log/);
  assert.match(getWaymarkTursoRemoteSchemaSql(), /CREATE TABLE IF NOT EXISTS week_plans/);
  assert.match(getWaymarkTursoRemoteSchemaSql(), /CREATE TABLE IF NOT EXISTS week_plan_items/);
  assert.match(getWaymarkTursoRemoteSchemaSql(), /CREATE TABLE IF NOT EXISTS signals/);
  assert.match(getWaymarkTursoRemoteSchemaSql(), /CREATE TABLE IF NOT EXISTS paths/);
  assert.match(getWaymarkTursoRemoteSchemaSql(), /CREATE TABLE IF NOT EXISTS expeditions/);
  assert.match(getWaymarkTursoRemoteSchemaSql(), /CREATE TABLE IF NOT EXISTS mark_instances/);
  assert.match(getWaymarkTursoRemoteSchemaSql(), /CREATE VIEW IF NOT EXISTS expedition_planned_marks/);
  assert.deepEqual(
    WAYMARK_TURSO_DEV_CLEAR_TABLES.map((table) => table.tableName),
    [
      "mark_instances",
      "expeditions",
      "paths",
      "week_plan_items",
      "week_plans",
      "signals",
      "waymark_planning_change_log",
      "waymark_planning_idempotency",
      "waymark_remote_change_log",
      "waymark_remote_records",
      "waymark_remote_idempotency",
    ],
  );

  const fakeClient = new FakeTursoCompatClient();
  const adapter = new WaymarkTursoRemoteAdapter(fakeClient as any);
  await adapter.ensureSchema();
  assert.match(fakeClient.schemaSql, /waymark_remote_records/);

  const row = createOutboxRow();
  const first = await adapter.pushOutboxRow(row);
  const second = await adapter.pushOutboxRow(row);
  const changes = await adapter.listChangesSince({
    vaultId: "vault_1",
    afterRemoteRevision: 0,
    entityTypes: ["week_plan_item"],
  });

  assert.equal(first.remoteRevision, 1);
  assert.equal(first.duplicate, false);
  assert.equal(second.remoteRevision, 1);
  assert.equal(second.duplicate, true);
  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.entityType, "week_plan_item");
  assert.equal(changes[0]?.payload.title, "Push to Turso");

  const planningFirst = await adapter.upsertPlanningWeekPlanSnapshot({
    mutationId: "typed_planning_week_plan:vault_1:device_1:week_plan_1:1",
    snapshot: {
      id: "week_plan_1",
      vaultId: "vault_1",
      userId: "user_1",
      weekStartDate: "2026-07-13",
      weekEndDate: "2026-07-19",
      status: "draft",
      summary: "Studio editable week",
      note: null,
      createdAt: 1,
      updatedAt: 2,
      deletedAt: null,
    },
  });
  const planningSecond = await adapter.upsertPlanningWeekPlanSnapshot({
    mutationId: "typed_planning_week_plan:vault_1:device_1:week_plan_1:1",
    snapshot: {
      id: "week_plan_1",
      vaultId: "vault_1",
      userId: "user_1",
      weekStartDate: "2026-07-13",
      weekEndDate: "2026-07-19",
      status: "draft",
      summary: "Studio editable week",
      note: null,
      createdAt: 1,
      updatedAt: 2,
      deletedAt: null,
    },
  });
  const ceiling = await adapter.getPlanningChangeCeiling({ vaultId: "vault_1" });
  const planningChanges = await adapter.listPlanningChangesInWindow({
    vaultId: "vault_1",
    afterChangeSequence: 0,
    throughChangeSequence: ceiling,
    entityTypes: ["week_plan"],
  });

  assert.equal(planningFirst.duplicate, false);
  assert.equal(planningSecond.duplicate, true);
  assert.equal(planningSecond.changeSequence, planningFirst.changeSequence);
  assert.equal(planningChanges.length, 1);
  assert.equal(planningChanges[0]?.payloadSnapshot.summary, "Studio editable week");

  const hierarchyFirst = await adapter.upsertPlanningPathSnapshot({
    mutationId: "typed_hierarchy:vault_1:device_1:path:path_1:1:abc",
    snapshot: {
      id: "path_1",
      vaultId: "vault_1",
      userId: "user_1",
      name: "Health",
      subtitle: null,
      slug: "health",
      title: "Health",
      description: "Unified log path",
      status: "active",
      colorToken: "green",
      iconKey: "leaf",
      sortOrder: 1,
      isActive: 1,
      heroMediaAssetId: null,
      createdAt: 10,
      updatedAt: 20,
      deletedAt: null,
    },
  });
  const hierarchySecond = await adapter.upsertPlanningPathSnapshot({
    mutationId: "typed_hierarchy:vault_1:device_1:path:path_1:1:abc",
    snapshot: {
      id: "path_1",
      vaultId: "vault_1",
      userId: "user_1",
      name: "Health",
      subtitle: null,
      slug: "health",
      title: "Health",
      description: "Unified log path",
      status: "active",
      colorToken: "green",
      iconKey: "leaf",
      sortOrder: 1,
      isActive: 1,
      heroMediaAssetId: null,
      createdAt: 10,
      updatedAt: 20,
      deletedAt: null,
    },
  });
  const hierarchyChanges = await adapter.listChangesSince({
    vaultId: "vault_1",
    afterRemoteRevision: 0,
    entityTypes: ["path"],
  });

  assert.equal(hierarchyFirst.duplicate, false);
  assert.equal(hierarchySecond.duplicate, true);
  assert.equal(hierarchySecond.changeSequence, hierarchyFirst.changeSequence);
  assert.equal(hierarchyChanges.length, 1);
  assert.equal(hierarchyChanges[0]?.entityType, "path");
  assert.equal(hierarchyChanges[0]?.payload.description, "Unified log path");

  const purge = await adapter.purgeWaymarkDevData({
    vaultId: "vault_1",
    outboxRows: [row],
  });

  assert.equal(purge.requestedRows, 1);
  assert.equal(purge.clearedTables?.includes("week_plans"), true);
  assert.equal(fakeClient.records.size, 0);
  assert.equal(fakeClient.idempotency.size, 0);
  assert.equal(fakeClient.changes.length, 0);
  assert.equal(fakeClient.weekPlans.size, 0);
  assert.equal(fakeClient.planningIdempotency.size, 0);
  assert.equal(fakeClient.planningChanges.length, 0);
}

void run()
  .then(() => {
    console.log("turso-remote-adapter tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
