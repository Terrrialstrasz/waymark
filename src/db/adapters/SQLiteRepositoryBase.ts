import type { SQLiteDatabase } from "expo-sqlite";
import { DbSyncStatus, MutableDbRow } from "../rows";
import { buildCurrentSyncOutboxIdempotencyKey, buildSyncOutboxLocalId } from "../syncOutboxIdentity";
import {
  ConstraintViolationRepositoryError,
  MapperRepositoryError,
  NotFoundRepositoryError,
  NotImplementedRepositoryError,
  RepositoryValidationError,
  TransactionRepositoryError,
} from "./errors";

export type SQLiteQueryable = Pick<SQLiteDatabase, "getFirstAsync" | "getAllAsync" | "runAsync" | "execAsync">;
export type SQLiteTransactionalDatabase = SQLiteQueryable & {
  withExclusiveTransactionAsync(task: (txn: SQLiteQueryable) => Promise<void>): Promise<void>;
};
export type SQLiteExecutorProvider = () => Promise<SQLiteQueryable>;

type OutboxMutableRow = {
  id: string;
  local_revision?: number;
  sync_status?: DbSyncStatus;
  deleted_at?: number | null;
  updated_at?: number;
  [key: string]: unknown;
};

const EOD_OUTBOX_POLICY: Record<string, { entityType: string; create: boolean; delete: boolean; updateFields?: readonly string[] }> = {
  mark_instances: {
    entityType: "mark_instance",
    create: true,
    delete: false,
    updateFields: [
      "status",
      "completed_at",
      "skipped_at",
      "expired_at",
      "proof_note",
      "completion_summary",
      "substituted_by_mark_id",
      "rescheduled_to_mark_id",
    ],
  },
  memories: { entityType: "memory", create: true, delete: true },
  trail_days: {
    entityType: "trail_day",
    create: true,
    delete: false,
    updateFields: [
      "status",
      "anchor_path_id",
      "closed_at",
      "reopened_at",
      "close_summary",
      "tomorrow_first_step",
      "character_result",
      "planned_mark_count",
      "completed_mark_count",
      "skipped_mark_count",
      "memory_count",
    ],
  },
  backlog_items: { entityType: "backlog_item", create: true, delete: true },
  expeditions: {
    entityType: "expedition",
    create: false,
    delete: false,
    updateFields: ["status", "started_at", "completed_at"],
  },
  milestones: {
    entityType: "milestone",
    create: false,
    delete: false,
    updateFields: ["status", "completed_at"],
  },
};

let sqliteWriteQueue: Promise<void> = Promise.resolve();

export async function runExclusiveSqliteWrite<T>(work: () => Promise<T>): Promise<T> {
  const pending = sqliteWriteQueue.catch(() => undefined);
  const nextWrite = pending.then(work);
  sqliteWriteQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );
  return nextWrite;
}

export abstract class SQLiteRepositoryBase {
  constructor(
    protected readonly executorProvider: SQLiteExecutorProvider,
    private readonly transactionScoped = false,
  ) {}

  protected async getExecutor(): Promise<SQLiteQueryable> {
    return this.executorProvider();
  }

  protected isTransactionScoped(): boolean {
    return this.transactionScoped;
  }

  protected getNowEpochMs(): number {
    return Date.now();
  }

  protected getNowIsoString(): string {
    return new Date(this.getNowEpochMs()).toISOString();
  }

  protected nextCreateMetadata<T extends { createdAt: string; updatedAt: string; deletedAt?: string; syncVersion?: number }>(
    target: T,
  ): T {
    const now = this.getNowIsoString();
    return {
      ...target,
      createdAt: now,
      updatedAt: now,
      deletedAt: undefined,
      syncVersion: 0,
    };
  }

  protected nextUpdateMetadata<T extends { updatedAt: string; syncVersion?: number }>(target: T): T {
    return {
      ...target,
      updatedAt: this.getNowIsoString(),
      syncVersion: (target.syncVersion ?? 0) + 1,
    };
  }

  protected nextDeleteMetadata<T extends { updatedAt: string; deletedAt?: string; syncVersion?: number }>(target: T): T {
    const now = this.getNowIsoString();
    return {
      ...target,
      updatedAt: now,
      deletedAt: now,
      syncVersion: (target.syncVersion ?? 0) + 1,
    };
  }

  protected async getFirst<Row>(sql: string, ...params: any[]): Promise<Row | null> {
    const executor = await this.getExecutor();
    return this.getFirstFromExecutor<Row>(executor, sql, ...params);
  }

  protected async getAll<Row>(sql: string, ...params: any[]): Promise<Row[]> {
    const executor = await this.getExecutor();
    return this.getAllFromExecutor<Row>(executor, sql, ...params);
  }

  protected async getActiveRowById<Row>(tableName: string, id: string): Promise<Row | null> {
    return this.getFirst<Row>(`SELECT * FROM ${tableName} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`, id);
  }

  protected async activeRecordExists(tableName: string, id: string): Promise<boolean> {
    const row = await this.getFirst<{ id: string }>(
      `SELECT id FROM ${tableName} WHERE id = ? AND deleted_at IS NULL LIMIT 1;`,
      id,
    );
    return row != null;
  }

  protected async run(sql: string, ...params: any[]) {
    const executor = await this.getExecutor();
    return this.runWithExecutor(executor, sql, ...params);
  }

  protected async withAtomicWrite<T>(work: (executor: SQLiteQueryable) => Promise<T>): Promise<T> {
    const executor = await this.getExecutor();

    if (this.transactionScoped) {
      return work(executor);
    }

    const database = executor as SQLiteTransactionalDatabase;
    let result!: T;

    try {
      await runExclusiveSqliteWrite(() =>
        database.withExclusiveTransactionAsync(async (txn) => {
          result = await work(txn);
        }),
      );
      return result;
    } catch (error) {
      throw new TransactionRepositoryError("Transaction failed.", { cause: error });
    }
  }

  protected async insertRow<Row extends { id: string }>(tableName: string, row: Row): Promise<void> {
    await this.withAtomicWrite(async (executor) => {
      await this.insertRowWithExecutor(executor, tableName, row);
      await this.enqueueEodMutationIfNeeded(executor, tableName, row as OutboxMutableRow, "create", null);
    });
  }

  protected async updateRow<Row extends { id: string }>(tableName: string, row: Row): Promise<void> {
    await this.withAtomicWrite(async (executor) => {
      const previous = await executor.getFirstAsync<OutboxMutableRow>(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1;`, row.id);
      await this.updateRowWithExecutor(executor, tableName, row);
      const mutable = row as OutboxMutableRow;
      const operation = mutable.deleted_at != null ? "delete" : "update";
      await this.enqueueEodMutationIfNeeded(executor, tableName, mutable, operation, previous);
    });
  }

  private async enqueueEodMutationIfNeeded(
    executor: SQLiteQueryable,
    tableName: string,
    row: OutboxMutableRow,
    operation: "create" | "update" | "delete",
    previous: OutboxMutableRow | null,
  ): Promise<void> {
    const policy = EOD_OUTBOX_POLICY[tableName];
    if (!policy || row.sync_status === "synced" || row.sync_status === "conflict") return;
    if (operation === "create" && !policy.create) return;
    if (operation === "delete" && !policy.delete) return;
    if (operation === "update" && policy.updateFields && previous) {
      const changed = policy.updateFields.some((field) => previous[field] !== row[field]);
      if (!changed) return;
    }

    const metadata = await executor.getFirstAsync<{
      db_instance_id: string;
      vault_id: string;
      device_id: string;
      application_id: string | null;
    }>(
      "SELECT db_instance_id, vault_id, device_id, application_id FROM app_db_metadata ORDER BY created_at ASC LIMIT 1;",
    );
    if (!metadata?.application_id) return;

    let effectiveOperation = operation;
    if (operation === "update" && policy.create) {
      const openCreate = await executor.getFirstAsync<{ id: string }>(
        `SELECT id FROM sync_outbox
         WHERE vault_id = ? AND source_application_id = ?
           AND entity_type = ? AND entity_id = ? AND operation = 'create'
           AND status IN ('pending', 'failed', 'retry_wait', 'syncing')
         LIMIT 1;`,
        metadata.vault_id,
        metadata.application_id,
        policy.entityType,
        row.id,
      );
      if (openCreate) effectiveOperation = "create";
    }

    const localRevision = Number(row.local_revision ?? 0);
    const idempotencyKey = buildCurrentSyncOutboxIdempotencyKey({
      vaultId: metadata.vault_id,
      sourceApplicationId: metadata.application_id,
      deviceId: metadata.device_id,
      entityType: policy.entityType,
      entityId: row.id,
      localRevision,
    });
    const now = Number(row.updated_at ?? Date.now());
    const outboxId = buildSyncOutboxLocalId(idempotencyKey);
    await executor.runAsync(
      `INSERT INTO sync_outbox (
         id, vault_id, device_id, db_instance_id, source_application_id,
         entity_type, entity_id, operation, idempotency_key, local_revision,
         base_remote_revision, payload_json, payload_schema_version, status,
         retry_count, last_error, created_at, updated_at, synced_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, 'pending', 0, NULL, ?, ?, NULL)
       ON CONFLICT(idempotency_key) DO NOTHING;`,
      outboxId,
      metadata.vault_id,
      metadata.device_id,
      metadata.db_instance_id,
      metadata.application_id,
      policy.entityType,
      row.id,
      effectiveOperation,
      idempotencyKey,
      localRevision,
      JSON.stringify(row),
      now,
      now,
    );

    if (effectiveOperation === "delete") {
      await executor.runAsync(
        `INSERT INTO sync_tombstones (
           entity_type, entity_id, vault_id, device_id, source_application_id,
           deleted_at, local_revision, reason
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local_delete')
         ON CONFLICT(entity_type, entity_id) DO UPDATE SET
           vault_id = excluded.vault_id,
           device_id = excluded.device_id,
           source_application_id = excluded.source_application_id,
           deleted_at = excluded.deleted_at,
           local_revision = excluded.local_revision,
           reason = excluded.reason;`,
        policy.entityType,
        row.id,
        metadata.vault_id,
        metadata.device_id,
        metadata.application_id,
        row.deleted_at ?? now,
        localRevision,
      );
    }
  }

  protected async getFirstFromExecutor<Row>(executor: SQLiteQueryable, sql: string, ...params: any[]): Promise<Row | null> {
    return executor.getFirstAsync<Row>(sql, ...params);
  }

  protected async getAllFromExecutor<Row>(executor: SQLiteQueryable, sql: string, ...params: any[]): Promise<Row[]> {
    return executor.getAllAsync<Row>(sql, ...params);
  }

  protected async runWithExecutor(executor: SQLiteQueryable, sql: string, ...params: any[]) {
    return executor.runAsync(sql, ...params);
  }

  protected async insertRowWithExecutor<Row extends { id: string }>(
    executor: SQLiteQueryable,
    tableName: string,
    row: Row,
  ): Promise<void> {
    const columns = Object.keys(row);
    const placeholders = columns.map(() => "?").join(", ");
    const rowRecord = row as Record<string, unknown>;
    const values = columns.map((column) => this.toSqlValue(rowRecord[column]));

    await this.runWithExecutor(executor, `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders});`, ...values);
  }

  protected async updateRowWithExecutor<Row extends { id: string }>(
    executor: SQLiteQueryable,
    tableName: string,
    row: Row,
  ): Promise<void> {
    const columns = Object.keys(row).filter((column) => column !== "id");
    const assignments = columns.map((column) => `${column} = ?`).join(", ");
    const rowRecord = row as Record<string, unknown>;
    const values = columns.map((column) => this.toSqlValue(rowRecord[column]));
    values.push(row.id);

    const result = await this.runWithExecutor(executor, `UPDATE ${tableName} SET ${assignments} WHERE id = ?;`, ...values);
    if (result.changes === 0) {
      throw new NotFoundRepositoryError(`${tableName} row not found for update.`, tableName, row.id);
    }
  }

  protected toMutableUpdate<Row extends MutableDbRow>(row: Row, syncStatus: DbSyncStatus = "dirty"): Row {
    return {
      ...row,
      updated_at: this.getNowEpochMs(),
      sync_status: syncStatus,
      local_revision: row.local_revision + 1,
    };
  }

  protected toMutableDelete<Row extends MutableDbRow>(row: Row): Row {
    const now = this.getNowEpochMs();
    return {
      ...row,
      updated_at: now,
      deleted_at: now,
      sync_status: "dirty",
      local_revision: row.local_revision + 1,
    };
  }

  protected assertFound<T>(value: T | null, tableName: string, id: string): T {
    if (value == null) {
      throw new NotFoundRepositoryError(`${tableName} record was not found.`, tableName, id);
    }
    return value;
  }

  protected validation(message: string): never {
    throw new RepositoryValidationError(message);
  }

  protected notImplemented(method: string): never {
    throw new NotImplementedRepositoryError(`${this.constructor.name}.${method} is not implemented yet.`);
  }

  protected mapperError(message: string, cause?: unknown): never {
    throw new MapperRepositoryError(message, { cause });
  }

  protected wrapSqlError(error: unknown, message: string): never {
    if (error instanceof Error && /constraint|unique|not null|foreign key/i.test(error.message)) {
      throw new ConstraintViolationRepositoryError(message, { cause: error });
    }
    throw error;
  }

  private toSqlValue(value: unknown): unknown {
    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }
    return value;
  }
}
