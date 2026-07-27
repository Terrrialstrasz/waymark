import type { SQLiteDatabase } from "expo-sqlite";
import { DbSyncStatus, MutableDbRow } from "../rows";
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
    const executor = await this.getExecutor();
    await this.insertRowWithExecutor(executor, tableName, row);
  }

  protected async updateRow<Row extends { id: string }>(tableName: string, row: Row): Promise<void> {
    const executor = await this.getExecutor();
    await this.updateRowWithExecutor(executor, tableName, row);
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
