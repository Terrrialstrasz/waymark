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

export type WaymarkTursoFullDatabaseDiagnosticLogger = (
  event: string,
  context: Record<string, unknown>,
) => void;

export type WaymarkTursoFullDatabaseRemoteOptions = {
  diagnosticLog?: WaymarkTursoFullDatabaseDiagnosticLogger;
};

export type WaymarkFullDbCleanupCandidate = {
  mutationId: string;
  tableName: string;
  rowKey: string;
  operation: "create" | "update" | "delete";
  beforePayload: Record<string, unknown> | null;
};

export type WaymarkFullDbCleanupResult = {
  applicationId: string;
  requested: number;
  reverted: number;
  conflicts: Array<{ mutationId: string; message: string }>;
};

type RemoteColumn = {
  name: string;
  notNull: boolean;
  primaryKeyPosition: number;
  defaultValue: unknown;
};

type TransactionLike = {
  execute(statement: string | InStatement): Promise<any>;
  commit(): Promise<unknown>;
  rollback(): Promise<unknown>;
  close(): void;
};

export class WaymarkTursoFullDatabaseRemoteAdapter {
  private pushProvenanceSchemaReady = false;

  constructor(
    private readonly client: Client,
    private readonly options: WaymarkTursoFullDatabaseRemoteOptions = {},
  ) {}

  async getSchemaState(): Promise<WaymarkFullDbSchemaState | null> {
    const startedAt = Date.now();
    try {
      const result = await this.client.execute(
        "SELECT schema_version, migration_mode FROM waymark_full_db_schema_metadata WHERE singleton_id = 1 LIMIT 1;",
      );
      const row = result.rows[0];
      const state = row
        ? {
            schemaVersion: toNumber(readResultValue(result, row, "schema_version"), "schema_version"),
            migrationMode: String(readResultValue(result, row, "migration_mode")) as WaymarkFullDbSchemaState["migrationMode"],
          }
        : null;
      this.emitDiagnostic("remote_read_success", {
        operation: "schema_state",
        durationMs: Date.now() - startedAt,
        found: Boolean(state),
      });
      return state;
    } catch (error) {
      this.emitDiagnostic("remote_read_error", {
        operation: "schema_state",
        durationMs: Date.now() - startedAt,
        ...describeRemoteError(error),
      });
      throw error;
    }
  }

  async getChangeCeiling(vaultId: string): Promise<number> {
    const startedAt = Date.now();
    try {
      const result = await this.client.execute({
        sql: "SELECT COALESCE(MAX(global_revision), 0) AS revision FROM waymark_full_db_change_log WHERE vault_id = ?;",
        args: [vaultId],
      });
      const row = result.rows[0];
      const revision = row ? toNumber(readResultValue(result, row, "revision"), "change ceiling") : 0;
      this.emitDiagnostic("remote_read_success", {
        operation: "change_ceiling",
        durationMs: Date.now() - startedAt,
        revision,
      });
      return revision;
    } catch (error) {
      this.emitDiagnostic("remote_read_error", {
        operation: "change_ceiling",
        durationMs: Date.now() - startedAt,
        ...describeRemoteError(error),
      });
      throw error;
    }
  }

  async listSnapshotRows(input: {
    vaultId: string;
    deviceId: string;
    tableName: string;
    offset?: number;
    limit?: number;
  }): Promise<WaymarkFullDbSnapshotRow[]> {
    const startedAt = Date.now();
    const spec = assertFullDbTable(input.tableName);
    const offset = Math.max(0, input.offset ?? 0);
    const limit = Math.max(1, input.limit ?? 500);
    try {
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
        args: [...args, limit, offset],
      });
      const rows = result.rows.map((row) => ({
        tableName: spec.tableName,
        values: Object.fromEntries(result.columns.map((columnName, index) => [columnName, normalizeValue(row[index])])),
      }));
      this.emitDiagnostic("remote_read_success", {
        operation: "snapshot_page",
        tableName: spec.tableName,
        offset,
        limit,
        fetched: rows.length,
        durationMs: Date.now() - startedAt,
      });
      return rows;
    } catch (error) {
      this.emitDiagnostic("remote_read_error", {
        operation: "snapshot_page",
        tableName: spec.tableName,
        offset,
        limit,
        durationMs: Date.now() - startedAt,
        ...describeRemoteError(error),
      });
      throw error;
    }
  }

  async listChanges(input: {
    vaultId: string;
    afterGlobalRevision: number;
    throughGlobalRevision: number;
    limit?: number;
  }): Promise<WaymarkFullDbChange[]> {
    const startedAt = Date.now();
    const limit = Math.max(1, input.limit ?? 500);
    try {
      const result = await this.client.execute({
        sql: `SELECT global_revision, table_name, device_id, row_key, operation, entity_revision,
                     payload_snapshot, mutation_id, changed_at
              FROM waymark_full_db_change_log
              WHERE vault_id = ? AND global_revision > ? AND global_revision <= ?
              ORDER BY global_revision ASC
              LIMIT ?;`,
        args: [input.vaultId, input.afterGlobalRevision, input.throughGlobalRevision, limit],
      });
      const rows = result.rows.map((row) => {
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
      this.emitDiagnostic("remote_read_success", {
        operation: "change_page",
        afterGlobalRevision: input.afterGlobalRevision,
        throughGlobalRevision: input.throughGlobalRevision,
        limit,
        fetched: rows.length,
        durationMs: Date.now() - startedAt,
      });
      return rows;
    } catch (error) {
      this.emitDiagnostic("remote_read_error", {
        operation: "change_page",
        afterGlobalRevision: input.afterGlobalRevision,
        throughGlobalRevision: input.throughGlobalRevision,
        limit,
        durationMs: Date.now() - startedAt,
        ...describeRemoteError(error),
      });
      throw error;
    }
  }

  async pushOutboxRowAtEod(row: SyncOutboxRow): Promise<WaymarkFullDbPushResult> {
    const startedAt = Date.now();
    let stage = "validate_contract";
    let transaction: TransactionLike | null = null;
    const spec = getWaymarkFullDbEntitySpec(row.entity_type);
    try {
      if (!spec || (spec.writer !== "waymark_eod" && spec.writer !== "workspace_and_waymark_eod")) {
        throw new Error(`Waymark EOD is not allowed to write ${row.entity_type}.`);
      }
      if (!row.source_application_id) {
        throw new Error(`Waymark EOD mutation ${row.id} is missing source_application_id.`);
      }
      stage = "ensure_provenance_schema";
      await this.ensurePushProvenanceSchema();
      stage = "parse_payload";
      const payload = parsePayload(row.payload_json);
      stage = "read_remote_columns";
      const columns = await this.readColumns(spec.tableName);
      stage = "open_write_transaction";
      transaction = (await this.client.transaction("write")) as TransactionLike;
      stage = "idempotency_check";
      const duplicate = await transaction.execute({
        sql: "SELECT global_revision FROM waymark_full_db_idempotency WHERE mutation_id = ? LIMIT 1;",
        args: [row.idempotency_key],
      });
      if (duplicate.rows[0]) {
        stage = "duplicate_rollback";
        await transaction.rollback();
        const duplicateResult = toPushResult(
          row,
          toNumber(readResultValue(duplicate, duplicate.rows[0], "global_revision"), "idempotency global_revision"),
          true,
        );
        return duplicateResult;
      }

      stage = "read_before_payload";
      const beforePayload = row.operation === "create"
        ? null
        : await this.readRemoteRow(transaction, columns, spec, row, payload);
      stage = row.operation === "create" ? "insert_row" : "update_row";
      if (row.operation === "create") {
        if (!spec.mobileCreateAllowed) {
          throw new Error(`Waymark EOD may not create ${spec.tableName} rows.`);
        }
        await this.insertRow(transaction, spec, columns, row, payload);
      } else {
        if (row.operation === "delete" && !spec.mobileDeleteAllowed) {
          throw new Error(`Waymark EOD may not delete ${spec.tableName} rows.`);
        }
        const updated = await this.updateRow(transaction, spec, columns, row, payload);
        if (!updated) {
          if (row.operation === "update" && spec.mobileCreateAllowed) {
            await this.insertRow(transaction, spec, columns, row, payload);
          } else {
            throw new Error(`EOD mutation target not found: ${spec.tableName}:${row.entity_id}.`);
          }
        }
      }

      stage = "annotate_change_log";
      await transaction.execute({
        sql: `UPDATE waymark_full_db_change_log
              SET source_application_id = ?, before_payload_snapshot = ?
              WHERE vault_id = ? AND mutation_id = ?;`,
        args: [
          row.source_application_id,
          beforePayload == null ? null : JSON.stringify(beforePayload),
          row.vault_id,
          row.idempotency_key,
        ],
      });

      stage = "read_global_revision";
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
      stage = "write_idempotency";
      await transaction.execute({
        sql: `INSERT INTO waymark_full_db_idempotency (
                mutation_id, vault_id, device_id, source_application_id, table_name, row_key,
                operation, global_revision, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          row.idempotency_key,
          row.vault_id,
          row.device_id,
          row.source_application_id,
          spec.tableName,
          row.entity_id,
          row.operation,
          remoteRevision,
          Date.now(),
        ],
      });
      stage = "update_device_cursor";
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
      stage = "commit";
      await transaction.commit();
      const result = toPushResult(row, remoteRevision, false);
      return result;
    } catch (error) {
      if (transaction) await safeRollback(transaction);
      this.emitDiagnostic("remote_mutation_error", {
        ...describeRemoteMutation(row),
        tableName: spec?.tableName ?? null,
        stage,
        durationMs: Date.now() - startedAt,
        ...describeRemoteError(error),
      });
      throw error;
    } finally {
      if (transaction) {
        try {
          transaction.close();
        } catch (error) {
          this.emitDiagnostic("remote_transaction_close_error", {
            ...describeRemoteMutation(row),
            tableName: spec?.tableName ?? null,
            stage,
            durationMs: Date.now() - startedAt,
            ...describeRemoteError(error),
          });
          throw error;
        }
      }
    }
  }

  private emitDiagnostic(event: string, context: Record<string, unknown>) {
    if (!this.options.diagnosticLog) return;
    try {
      this.options.diagnosticLog(event, context);
    } catch {
      // Diagnostics must never change remote sync behavior.
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
    for (const column of columns) {
      if (!column.notNull || column.defaultValue != null || values[column.name] != null) continue;
      throw new Error(`EOD payload is missing required field ${spec.tableName}.${column.name}.`);
    }
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
  ): Promise<boolean> {
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
    const affected = Number(result.rowsAffected ?? 0);
    if (affected > 1) throw new Error(`EOD mutation target is ambiguous: ${spec.tableName}:${row.entity_id}.`);
    return affected === 1;
  }

  async previewApplicationCleanup(input: {
    vaultId: string;
    applicationId: string;
    limit?: number;
  }): Promise<WaymarkFullDbCleanupCandidate[]> {
    await this.ensurePushProvenanceSchema();
    const result = await this.client.execute({
      sql: `SELECT i.mutation_id, i.table_name, i.row_key, i.operation,
                   c.before_payload_snapshot
            FROM waymark_full_db_idempotency i
            LEFT JOIN waymark_full_db_change_log c
              ON c.vault_id = i.vault_id AND c.mutation_id = i.mutation_id
            WHERE i.vault_id = ?
              AND i.source_application_id = ?
              AND i.cleaned_at IS NULL
            GROUP BY i.mutation_id, i.table_name, i.row_key, i.operation, c.before_payload_snapshot, i.created_at
            ORDER BY i.created_at DESC
            LIMIT ?;`,
      args: [input.vaultId, input.applicationId, Math.max(1, input.limit ?? 5000)],
    });
    return result.rows.map((row) => {
      const before = readResultValue(result, row, "before_payload_snapshot");
      return {
        mutationId: String(readResultValue(result, row, "mutation_id")),
        tableName: String(readResultValue(result, row, "table_name")),
        rowKey: String(readResultValue(result, row, "row_key")),
        operation: String(readResultValue(result, row, "operation")) as WaymarkFullDbCleanupCandidate["operation"],
        beforePayload: before == null ? null : parsePayload(before),
      };
    });
  }

  async cleanupApplicationMutations(input: {
    vaultId: string;
    applicationId: string;
    limit?: number;
  }): Promise<WaymarkFullDbCleanupResult> {
    const candidates = await this.previewApplicationCleanup(input);
    const tableColumns = new Map<string, readonly RemoteColumn[]>();
    for (const candidate of candidates) {
      if (!getWaymarkFullDbTableSpec(candidate.tableName)) continue;
      if (!tableColumns.has(candidate.tableName)) tableColumns.set(candidate.tableName, await this.readColumns(candidate.tableName));
    }
    const result: WaymarkFullDbCleanupResult = {
      applicationId: input.applicationId,
      requested: candidates.length,
      reverted: 0,
      conflicts: [],
    };
    const transaction = (await this.client.transaction("write")) as TransactionLike;
    try {
      for (const candidate of candidates) {
        const columns = tableColumns.get(candidate.tableName);
        const spec = getWaymarkFullDbTableSpec(candidate.tableName);
        if (!columns || !spec || !columns.some((column) => column.name === "id")) {
          result.conflicts.push({ mutationId: candidate.mutationId, message: `Cleanup does not support ${candidate.tableName}.` });
          continue;
        }
        const current = await transaction.execute({
          sql: `SELECT * FROM ${quoteIdentifier(candidate.tableName)} WHERE vault_id = ? AND id = ? LIMIT 1;`,
          args: [input.vaultId, candidate.rowKey],
        });
        const currentRow = current.rows[0];
        if (!currentRow) {
          if (candidate.operation === "create") {
            await markRemoteMutationCleaned(transaction, candidate.mutationId);
            result.reverted += 1;
          } else {
            result.conflicts.push({ mutationId: candidate.mutationId, message: "Remote row no longer exists." });
          }
          continue;
        }
        const currentValues = Object.fromEntries(
          current.columns.map((columnName: string) => [
            columnName,
            normalizeValue(readResultValue(current, currentRow, columnName)),
          ]),
        );
        const mutationColumn = columns.some((column) => column.name === "last_mutation_id")
          ? "last_mutation_id"
          : "_remote_last_mutation_id";
        if (String(currentValues[mutationColumn] ?? "") !== candidate.mutationId) {
          result.conflicts.push({ mutationId: candidate.mutationId, message: "A newer mutation owns the remote row." });
          continue;
        }
        if (candidate.operation === "create") {
          await transaction.execute({
            sql: `DELETE FROM ${quoteIdentifier(candidate.tableName)} WHERE vault_id = ? AND id = ?;`,
            args: [input.vaultId, candidate.rowKey],
          });
        } else if (candidate.beforePayload) {
          const primaryKeys = new Set(columns.filter((column) => column.primaryKeyPosition > 0).map((column) => column.name));
          const values = filterPayload(candidate.beforePayload, new Set(columns.map((column) => column.name)));
          const names = Object.keys(values).filter((name) => !primaryKeys.has(name));
          await transaction.execute({
            sql: `UPDATE ${quoteIdentifier(candidate.tableName)} SET ${names.map((name) => `${quoteIdentifier(name)} = ?`).join(", ")} WHERE vault_id = ? AND id = ?;`,
            args: [...names.map((name) => toSqlValue(values[name])), input.vaultId, candidate.rowKey],
          });
        } else {
          result.conflicts.push({ mutationId: candidate.mutationId, message: "Before snapshot is unavailable." });
          continue;
        }
        await markRemoteMutationCleaned(transaction, candidate.mutationId);
        result.reverted += 1;
      }
      await transaction.commit();
      return result;
    } catch (error) {
      await safeRollback(transaction);
      throw error;
    } finally {
      transaction.close();
    }
  }

  private async readRemoteRow(
    transaction: TransactionLike,
    columns: readonly RemoteColumn[],
    spec: WaymarkFullDbTableSpec,
    row: SyncOutboxRow,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
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
    const result = await transaction.execute({
      sql: `SELECT * FROM ${quoteIdentifier(spec.tableName)} WHERE ${primaryKey.map((column) => `${quoteIdentifier(column.name)} = ?`).join(" AND ")} LIMIT 1;`,
      args: keyValues.map(toSqlValue),
    });
    const existing = result.rows[0];
    if (!existing) return null;
    return Object.fromEntries(
      result.columns.map((columnName: string) => [
        columnName,
        normalizeValue(readResultValue(result, existing, columnName)),
      ]),
    );
  }

  private async ensurePushProvenanceSchema() {
    if (this.pushProvenanceSchemaReady) return;
    await ensureColumn(this.client, "waymark_full_db_idempotency", "source_application_id", "TEXT");
    await ensureColumn(this.client, "waymark_full_db_change_log", "source_application_id", "TEXT");
    await ensureColumn(this.client, "waymark_full_db_change_log", "before_payload_snapshot", "TEXT");
    await ensureColumn(this.client, "waymark_full_db_idempotency", "cleaned_at", "INTEGER");
    await this.client.execute(
      "CREATE INDEX IF NOT EXISTS idx_waymark_full_db_idempotency_application_cleanup ON waymark_full_db_idempotency(vault_id, source_application_id, cleaned_at, created_at);",
    );
    await this.client.execute(
      "CREATE INDEX IF NOT EXISTS idx_waymark_full_db_change_log_mutation ON waymark_full_db_change_log(vault_id, mutation_id);",
    );
    this.pushProvenanceSchemaReady = true;
  }

  private async readColumns(tableName: string): Promise<RemoteColumn[]> {
    const result = await this.client.execute(`PRAGMA table_info(${quoteIdentifier(tableName)});`);
    if (result.rows.length === 0) throw new Error(`Turso Full-DB table is missing: ${tableName}.`);
    return result.rows.map((row) => ({
      name: String(readResultValue(result, row, "name")),
      notNull: toNumber(readResultValue(result, row, "notnull"), `${tableName}.notnull`) === 1,
      primaryKeyPosition: toNumber(readResultValue(result, row, "pk"), `${tableName}.pk`),
      defaultValue: readResultValue(result, row, "dflt_value"),
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

function describeRemoteMutation(row: SyncOutboxRow): Record<string, unknown> {
  return {
    outboxId: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    localRevision: row.local_revision,
    retryCount: row.retry_count,
    idempotencyKey: row.idempotency_key,
    sourceApplicationId: row.source_application_id,
  };
}

function describeRemoteError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { message: String(error).slice(0, 500) };
  const value = error as Error & { code?: unknown; cause?: unknown };
  const cause = value.cause;
  return {
    errorName: value.name,
    errorCode: value.code == null ? null : String(value.code),
    message: value.message.slice(0, 500),
    cause:
      cause instanceof Error
        ? { name: cause.name, message: cause.message.slice(0, 500) }
        : cause == null
          ? null
          : String(cause).slice(0, 500),
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

async function ensureColumn(client: Client, tableName: string, columnName: string, sqlType: string) {
  const info = await client.execute(`PRAGMA table_info(${quoteIdentifier(tableName)});`);
  const names = new Set(info.rows.map((row) => String(readResultValue(info, row, "name"))));
  if (!names.has(columnName)) {
    await client.execute(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${quoteIdentifier(columnName)} ${sqlType};`);
  }
}

async function markRemoteMutationCleaned(transaction: TransactionLike, mutationId: string) {
  await transaction.execute({
    sql: "UPDATE waymark_full_db_idempotency SET cleaned_at = ? WHERE mutation_id = ?;",
    args: [Date.now(), mutationId],
  });
}
