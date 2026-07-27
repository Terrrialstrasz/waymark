import type { SQLiteDatabase } from "expo-sqlite";
import { SCHEMA_MIGRATIONS_TABLE } from "../constants";
import { MIGRATIONS } from "./manifest";
import { runPostMigrationBackfillsAsync } from "./postMigrationBackfills";

type AppliedMigrationRow = {
  version: number;
};

export async function applyMigrationsAsync(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA busy_timeout = 5000;");
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA_MIGRATIONS_TABLE} (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const appliedRows = await db.getAllAsync<AppliedMigrationRow>(
    `SELECT version FROM ${SCHEMA_MIGRATIONS_TABLE} ORDER BY version ASC;`
  );
  const appliedVersions = new Set(appliedRows.map((row) => row.version));

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(migration.sql);
      await tx.runAsync(
        `INSERT INTO ${SCHEMA_MIGRATIONS_TABLE} (version, name, applied_at) VALUES (?, ?, ?);`,
        migration.version,
        migration.name,
        Date.now(),
      );
    });
  }

  await runPostMigrationBackfillsAsync(db as never);
}
