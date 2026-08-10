import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";

const require = createRequire(import.meta.url);
const compiledRoot = path.resolve(process.cwd(), ".tmp/repo-tests/src");

if (!fs.existsSync(path.join(compiledRoot, "db/migrations/runner.js"))) {
  throw new Error("Compiled repository files are missing. Run `npx tsc -p tsconfig.repo-tests.json` first.");
}

const { applyMigrationsAsync } = require(path.join(compiledRoot, "db/migrations/runner.js"));
const { createSQLiteRepositoryProvider } = require(path.join(compiledRoot, "db/adapters/index.js"));
const { runWaymarkVaultBootGateAsync } = require(path.join(compiledRoot, "app/waymarkVaultBootGate.js"));
const { bootstrapWaymarkMap } = require(path.join(compiledRoot, "waymark-map/bootstrap.js"));
const { WAYMARK_MAP_CONFIG } = require(path.join(compiledRoot, "waymark-map/index.js"));

class NodeSqliteAdapter {
  constructor(db) {
    this.db = db;
  }

  async execAsync(source) {
    this.db.exec(source);
  }

  async runAsync(source, ...params) {
    const result = this.db.prepare(source).run(...params);
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid ?? 0) };
  }

  async getFirstAsync(source, ...params) {
    return this.db.prepare(source).get(...params) ?? null;
  }

  async getAllAsync(source, ...params) {
    return this.db.prepare(source).all(...params);
  }

  async withExclusiveTransactionAsync(work) {
    this.db.exec("BEGIN IMMEDIATE;");
    try {
      const result = await work(this);
      this.db.exec("COMMIT;");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }
}

const cliArgs = process.argv.slice(2);
const outputArg = cliArgs.find((value) => !value.startsWith("--"));
const outputPath = outputArg
  ? path.resolve(outputArg)
  : path.join(os.tmpdir(), `waymark-code-owned-catalog-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
if (fs.existsSync(outputPath)) {
  fs.rmSync(outputPath);
}

const raw = new DatabaseSync(outputPath);
raw.exec("PRAGMA foreign_keys = ON;");
const adapter = new NodeSqliteAdapter(raw);

try {
  await applyMigrationsAsync(adapter);
  await runWaymarkVaultBootGateAsync(adapter, {
    mapVersion: WAYMARK_MAP_CONFIG.version,
    seedVersion: WAYMARK_MAP_CONFIG.version,
    clientType: "main",
    cloudRestoreConfigured: false,
  });
  const repos = createSQLiteRepositoryProvider(async () => adapter, async () => adapter, false);
  await repos.userProfiles.getOrCreateLocalUserProfile({
    userId: process.env.WAYMARK_USER_ID ?? "waymark-local-user",
    locale: "en-US",
    timezone: "Asia/Saigon",
    weekStartsOn: 1,
  });
  await bootstrapWaymarkMap({ repositories: repos, userId: process.env.WAYMARK_USER_ID ?? "waymark-local-user" }, WAYMARK_MAP_CONFIG, {
    mode: "development",
    includeDevDemoSeed: true,
    includeBlockedUserOwnedSeed: true,
    allowHierarchySeedCreation: true,
  });
  console.log(outputPath);
} finally {
  raw.close();
}
