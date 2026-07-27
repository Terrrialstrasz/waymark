import { openDatabaseAsync, SQLiteDatabase } from "expo-sqlite";
import { WAYMARK_DATABASE_NAME } from "./constants";
import { applyMigrationsAsync } from "./migrations/runner";

let databasePromise: Promise<SQLiteDatabase> | null = null;

export async function openWaymarkDatabaseAsync(): Promise<SQLiteDatabase> {
  return withDatabaseOpenRetry(async () => {
    const db = await openDatabaseAsync(WAYMARK_DATABASE_NAME);
    try {
      await applyMigrationsAsync(db);
      return db;
    } catch (error) {
      try {
        await db.closeAsync();
      } catch {
        // Ignore close failures while surfacing the original open/migration error.
      }
      throw error;
    }
  });
}

export async function getWaymarkDatabaseAsync(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openWaymarkDatabaseAsync().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function closeWaymarkDatabaseAsync(): Promise<void> {
  if (!databasePromise) {
    return;
  }

  const db = await databasePromise;
  databasePromise = null;
  await db.closeAsync();
}

async function withDatabaseOpenRetry(open: () => Promise<SQLiteDatabase>): Promise<SQLiteDatabase> {
  const delaysMs = [120, 300, 700, 1200];
  let lastError: unknown;

  for (let attempt = 0; attempt <= delaysMs.length; attempt += 1) {
    try {
      return await open();
    } catch (error) {
      lastError = error;
      if (!isDatabaseLockedError(error) || attempt === delaysMs.length) {
        throw error;
      }
      await delay(delaysMs[attempt]);
    }
  }

  throw lastError;
}

function isDatabaseLockedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /database is locked|SQLITE_BUSY|SQLITE_LOCKED|NativeStatement\.finalizeAsync/iu.test(message);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
