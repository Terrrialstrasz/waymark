import type { Client, InStatement } from "@tursodatabase/serverless/compat";
import type { SyncOutboxRow } from "./ssotOutbox";
import {
  WAYMARK_TURSO_FULL_DB_TABLES,
  canWaymarkMutateFullDbField,
  getWaymarkFullDbEntitySpec,
  getWaymarkFullDbTableSpec,
  type WaymarkFullDbTableSpec,
} from "./tursoFullDatabaseContract";

export type WaymarkFullDbSchemaState = {
  schemaVersion: number;
  migrationMode: "preparing" | "active" | "rollback";
};

export type WaymarkFullDbSnapshotRow = {
  tableName: string;
  values: Record<string, unknown>;
};

export type WaymarkFullDbChange = {
  globalRevision: number;
  tableName: string;
  deviceId: string | null;
  rowKey: string;
  operation: "create" | "update" | "delete";
  entityRevision: number;
  payload: Record<string, unknown>;
  mutationId: string | null;
  changedAt: number;
};

export type WaymarkFullDbPushResult = {
  remoteRevision: number;
  entityType: string;
  entityId: string;
  idempotencyKey: string;
  duplicate: boolean;
};

type RemoteColumn = {
  name: string;
  notNull: boolean;
  primaryKeyPosition: number;
};

type TransactionLike = {
  execute(statement: string | InStatement): Promise<any>;
  commit(): Promise<unknown>;
  rollback(): Promise<unknown>;
  close(): void;
};

export class WaymarkTursoFullDatabaseRemoteAdapter {
  constructor(private readonly client: Client) {}

  async getSchemaState(): Promise<WaymarkFullDbSchemaState | null> {
    const result = await this.client.execute(
      "SELECT schema_version, migration_mode FROM waymark_full_db_schema_metadata WHERE singleton_id = 1 LIMIT 1;",
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      schemaVersion: toNumber(readResultValue(result, row, "schema_version"), "schema_version"),
      migrationMode: String(readResultValue(result, row, "migration_mode")) as WaymarkFullDbSchemaState["migrationMode"],
    };
  }

  async getChangeCeiling(vaultId: string): Promise<number> {
    const result = await this.client.execute({
      sql: "SELECT COALESCE(MAX(global_revision), 0) AS revision FROM waymark_full_db_change_log WHERE vault_id = ?;",
      args: [vaultId],
    });
    const row = result.rows[0];
    return row ? toNumber(readResultValue(result, row, "revision"), "change ceiling") : 0;
  }

  async listSnapshotRows(input: {
    vaultId: string;
    deviceId: string;
    tableName: string;
    offset?: number;
    limit?: number;
  }): Promise<WaymarkFullDbSnapshotRow[]> {
    const spec = assertFullDbTable(input.tableName);
    const columns = await this.readColumns(spec.tableName);
    const columnNames = new Set(columns.map((column) => column.name));
    const filters = ["vault_id = ?"];
    const args: Array<string | number> = [input.vaultId];
    if (spec.scope === "device") {
      if (columnNames.has("device_id")) {
        filters.push("device_id = ?");
        args.push(input.deviceId);
      } else if (columnNames.has("source_device_id")) {
        filters.push("source_device_id = ?");
        args.push(input.deviceId);
      }
    }
    const primaryKey = columns
      .filter((column) => column.primaryKeyPosition > 0)
      .sort((left, right) => left.primaryKeyPosition - right.primaryKeyPosition)
      .map((column) => column.name);
    const result = await this.client.execute({
      sql: `SELECT * FROM ${quoteIdentifier(spec.tableName)} WHERE ${filters.join(" AND ")} ORDER BY ${primaryKey.map(quoteIdentifier).join(", ")} LIMIT ? OFFSET ?;`,
      args: [...args, Math.max(1, input.limit ?? 500), Math.max(0, input.offset ?? 0)],
    });
    return result.rows.map((row) => ({
      tableName: spec.tableName,
      values: Object.fromEntries(result.columns.map((columnName, index) => [columnName, normalizeValue(row[index])])),
    }));
  }

  async listChanges(input: {
    vaultId: string;
    afterGlobalRevision: number;
    throughGlobalRevision: number;
    limit?: number;
  }): Promise<WaymarkFullDbChange[]> {
    const result = await this.client.execute({
      sql: `SELECT global_revision, table_name, device_id, row_key, operation, entity_revision,
                   payload_snapshot, mutation_id, changed_at
            FROM waymark_full_db_change_log
            WHERE vault_id = ? AND global_revision > ? AND global_revision <= ?
            ORDER BY global_revision ASC
            LIMIT ?;`,
      args: [input.vaultId, input.afterGlobalRevision, input.throughGlobalRevision, Math.max(1, input.limit ?? 500)],
    });
    return result.rows.map((row) => {
      const deviceId = readResultValue(result, row, "device_id");
      const mutationId = readResultValue(result, row, "mutation_id");
      return {
        globalRevision: toNumber(readResultValue(result, row, "global_revision"), "global_revision"),
        tableName: String(readResultValue(result, row, "table_name")),
        deviceId: deviceId == null ? null : String(deviceId),
        rowKey: String(readResultValue(result, row, "row_key")),
        operation: String(readResultValue(result, row, "operation")) as WaymarkFullDbChange["operation"],
        entityRevision: toNumber(readResultValue(result, row, "entity_revision"), "entity_revision"),
        payload: parsePayload(readResultValue(result, row, "payload_snapshot")),
        mutationId: mutationId == null ? null : String(mutationId),
        changedAt: toNumber(readResultValue(result, row, "changed_at"), "changed_at"),
      };
    });
  }

  async pushOutboxRowAtEod(row: SyncOutboxRow): Promise<WaymarkFullDbPushResult> {
    const spec = getWaymarkFullDbEntitySpec(row.entity_type);
    if (!spec || (spec.writer !== "waymark_eod" && spec.writer !== "workspace_and_waymark_eod")) {
      throw new Error(`Waymark EOD is not allowed to write ${row.entity_type}.`);
    }
    const payload = parsePayload(row.payload_json);
    const columns = await this.readColumns(spec.tableName);
    const transaction = (await this.client.transaction("write")) as TransactionLike;
    try {
      const duplicate = await transaction.execute({
        sql: "SELECT global_revision FROM waymark_full_db_idempotency WHERE mutation_id = ? LIMIT 1;",
        args: [row.idempotency_key],
      });
      if (duplicate.rows[0]) {
        await transaction.rollback();
        return toPushResult(
          row,
          toNumber(readResultValue(duplicate, duplicate.rows[0], "global_revision"), "idempotency global_revision"),
          true,
        );
      }

      if (row.operation === "create") {
        if (!spec.mobileCreateAllowed) {
          throw new Error(`Waymark EOD may not create ${spec.tableName} rows.`);
        }
        await this.insertRow(transaction, spec, columns, row, payload);
      } else {
        await this.updateRow(transaction, spec, columns, row, payload);
      }

      const change = await transaction.execute({
        sql: `SELECT COALESCE(MAX(global_revision), 0) AS revision
              FROM waymark_full_db_change_log
              WHERE vault_id = ? AND mutation_id = ?;`,
        args: [row.vault_id, row.idempotency_key],
      });
      const changeRow = change.rows[0];
      const remoteRevision = changeRow
        ? toNumber(readResultValue(change, changeRow, "revision"), "mutation global_revision")
        : 0;
      await transaction.execute({
        sql: `INSERT INTO waymark_full_db_idempotency (
                mutation_id, vault_id, device_id, table_name, row_key,
                operation, global_revision, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          row.idempotency_key,
          row.vault_id,
          row.device_id,
          spec.tableName,
          row.entity_id,
          row.operation,
          remoteRevision,
          Date.now(),
        ],
      });
      await transaction.execute({
        sql: `INSERT INTO waymark_full_db_device_cursors (
                vault_id, device_id, last_push_completed_at, last_status, updated_at
              ) VALUES (?, ?, ?, 'push_ok', ?)
              ON CONFLICT(vault_id, device_id) DO UPDATE SET
                last_push_completed_at = excluded.last_push_completed_at,
                last_status = excluded.last_status,
                last_error = NULL,
                updated_at = excluded.updated_at;`,
        args: [row.vault_id, row.device_id, Date.now(), Date.now()],
      });
      await transaction.commit();
      return toPushResult(row, remoteRevision, false);
    } catch (error) {
      await safeRollback(transaction);
      throw error;
    } finally {
      transaction.close();
    }
  }

  private async insertRow(
    transaction: TransactionLike,
    spec: WaymarkFullDbTableSpec,
    columns: readonly RemoteColumn[],
    row: SyncOutboxRow,
    payload: Record<string, unknown>,
  ) {
    if (spec.tableName === "mark_instances") {
      const origin = String(payload.origin ?? "");
      const allowedOrigins = new Set([
        "template_generated",
        "weekly_planned",
        "quick_capture",
        "manual_plan",
        "backlog_converted",
        "substitution",
      ]);
      if (!allowedOrigins.has(origin)) throw new Error(`Mark creation origin is not allowed at EOD: ${origin || "missing"}.`);
    }
    const available = new Set(columns.map((column) => column.name));
    const values = filterPayload(payload, available);
    values.vault_id = row.vault_id;
    if (available.has("device_id") && values.device_id == null) values.device_id = row.device_id;
    if (available.has("source_device_id") && values.source_device_id == null) values.source_device_id = row.device_id;
    if (available.has("id") && values.id == null) values.id = row.entity_id;
    applyRemoteMetadata(values, available, row);
    const names = Object.keys(values);
    const result = await transaction.execute({
      sql: `INSERT INTO ${quoteIdentifier(spec.tableName)} (${names.map(quoteIdentifier).join(", ")}) VALUES (${names.map(() => "?").join(", ")});`,
      args: names.map((name) => toSqlValue(values[name])),
    });
    if (Number(result.rowsAffected ?? 0) !== 1) throw new Error(`Failed to create ${spec.tableName}:${row.entity_id}.`);
  }

  private async updateRow(
    transaction: TransactionLike,
    spec: WaymarkFullDbTableSpec,
    columns: readonly RemoteColumn[],
    row: SyncOutboxRow,
    payload: Record<string, unknown>,
  ) {
    const available = new Set(columns.map((column) => column.name));
    const values = filterPayload(payload, available, (name) => canWaymarkMutateFullDbField(spec.tableName, name));
    if (row.operation === "delete" && available.has("deleted_at")) values.deleted_at = payload.deleted_at ?? row.updated_at;
    applyRemoteMetadata(values, available, row);
    const primaryKey = columns
      .filter((column) => column.primaryKeyPosition > 0)
      .sort((left, right) => left.primaryKeyPosition - right.primaryKeyPosition);
    const keyValues = primaryKey.map((column) => {
      if (column.name === "vault_id") return row.vault_id;
      if (column.name === "device_id" || column.name === "source_device_id") return row.device_id;
      if (payload[column.name] != null) return payload[column.name];
      if (column.name === "id") return row.entity_id;
      if (primaryKey.length === 2) return row.entity_id;
      throw new Error(`Missing primary key ${spec.tableName}.${column.name} in EOD mutation.`);
    });
    const names = Object.keys(values).filter((name) => !primaryKey.some((column) => column.name === name));
    if (names.length === 0) throw new Error(`EOD mutation for ${spec.tableName}:${row.entity_id} has no allowed fields.`);
    const result = await transaction.execute({
      sql: `UPDATE ${quoteIdentifier(spec.tableName)} SET ${names.map((name) => `${quoteIdentifier(name)} = ?`).join(", ")} WHERE ${primaryKey.map((column) => `${quoteIdentifier(column.name)} = ?`).join(" AND ")};`,
      args: [...names.map((name) => toSqlValue(values[name])), ...keyValues.map(toSqlValue)],
    });
    if (Number(result.rowsAffected ?? 0) !== 1) {
      throw new Error(`EOD mutation target not found or ambiguous: ${spec.tableName}:${row.entity_id}.`);
    }
  }

  private async readColumns(tableName: string): Promise<RemoteColumn[]> {
    const result = await this.client.execute(`PRAGMA table_info(${quoteIdentifier(tableName)});`);
    if (result.rows.length === 0) throw new Error(`Turso Full-DB table is missing: ${tableName}.`);
    return result.rows.map((row) => ({
      name: String(readResultValue(result, row, "name")),
      notNull: toNumber(readResultValue(result, row, "notnull"), `${tableName}.notnull`) === 1,
      primaryKeyPosition: toNumber(readResultValue(result, row, "pk"), `${tableName}.pk`),
    }));
  }
}

// Contract declaration order is dependency order. Do not alphabetize tables
// within a wave: several children share a wave with their parent.
export const WAYMARK_TURSO_FULL_DB_SNAPSHOT_TABLES = WAYMARK_TURSO_FULL_DB_TABLES.map((spec) => spec.tableName);

function assertFullDbTable(tableName: string): WaymarkFullDbTableSpec {
  const spec = getWaymarkFullDbTableSpec(tableName);
  if (!spec) throw new Error(`Table is outside the Waymark Full-DB contract: ${tableName}.`);
  return spec;
}

function filterPayload(
  payload: Record<string, unknown>,
  available: ReadonlySet<string>,
  allowed: (name: string) => boolean = () => true,
) {
  return Object.fromEntries(
    Object.entries(payload).filter(([name]) => !name.startsWith("__") && available.has(name) && allowed(name)),
  );
}

function applyRemoteMetadata(values: Record<string, unknown>, available: ReadonlySet<string>, row: SyncOutboxRow) {
  if (available.has("entity_revision")) values.entity_revision = row.local_revision;
  if (available.has("last_mutation_id")) values.last_mutation_id = row.idempotency_key;
  if (available.has("_remote_entity_revision")) values._remote_entity_revision = row.local_revision;
  if (available.has("_remote_last_mutation_id")) values._remote_last_mutation_id = row.idempotency_key;
}

function toPushResult(row: SyncOutboxRow, remoteRevision: number, duplicate: boolean): WaymarkFullDbPushResult {
  return {
    remoteRevision,
    entityType: row.entity_type,
    entityId: row.entity_id,
    idempotencyKey: row.idempotency_key,
    duplicate,
  };
}

function parsePayload(value: unknown): Record<string, unknown> {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Full-DB payload must be a JSON object.");
  return parsed as Record<string, unknown>;
}

function quoteIdentifier(value: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
}

function readResultValue(result: { columns: readonly string[] }, row: any, columnName: string): unknown {
  const namedValue = row?.[columnName];
  if (namedValue !== undefined) return namedValue;
  const columnIndex = result.columns.indexOf(columnName);
  return columnIndex >= 0 ? row?.[columnIndex] : undefined;
}

function toNumber(value: unknown, label = "value") {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Expected numeric Turso value for ${label}.`);
  return number;
}

function normalizeValue(value: unknown) {
  return typeof value === "bigint" ? Number(value) : value;
}

function toSqlValue(value: unknown): any {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value as any;
}

async function safeRollback(transaction: TransactionLike) {
  try {
    await transaction.rollback();
  } catch {
    // The original mutation error is more useful than a secondary rollback error.
  }
}
