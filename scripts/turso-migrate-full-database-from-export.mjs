import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";

const require = createRequire(import.meta.url);
const compiledRoot = path.resolve(process.cwd(), ".tmp/repo-tests/src/lib/waymark");
const contractPath = path.join(compiledRoot, "tursoFullDatabaseContract.js");
const schemaPath = path.join(compiledRoot, "tursoFullDatabaseSchema.js");
if (!fs.existsSync(contractPath) || !fs.existsSync(schemaPath)) {
  throw new Error("Compiled Full-DB files are missing. Run `npx tsc -p tsconfig.repo-tests.json` first.");
}

const {
  WAYMARK_TURSO_FULL_DB_TABLES,
  WAYMARK_TURSO_PROTECTED_CANONICAL_TABLES,
  isWaymarkFullDbLocalOnlyColumn,
} = require(contractPath);
const {
  WAYMARK_TURSO_FULL_DB_SCHEMA_SQL,
  WAYMARK_TURSO_FULL_DB_SCHEMA_VERSION,
} = require(schemaPath);
const { createClient } = require("@tursodatabase/serverless/compat");
const { connect } = require("@tursodatabase/serverless");

loadDotEnv();

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const latestExport = args.includes("--latest-export");
const confirmVault = readOption("--confirm-vault");
const databaseArgument = args.filter((value, index) => {
  if (value.startsWith("--")) return false;
  if (index > 0 && args[index - 1] === "--confirm-vault") return false;
  return true;
}).join(" ");
const databasePath = latestExport ? resolveLatestExportDatabasePath() : resolveExportDatabasePath(databaseArgument);

if (!databasePath || !fs.existsSync(databasePath)) {
  throw new Error(
    "Usage: npm run turso:migrate-full-db -- <export-dir-or-waymark.db> [--apply --confirm-vault <vault-id>], or use --latest-export.",
  );
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
}

const database = new DatabaseSync(databasePath, { readOnly: true });
const metadata = database
  .prepare("SELECT db_instance_id, vault_id, device_id FROM app_db_metadata LIMIT 1;")
  .get();
if (!metadata?.db_instance_id || !metadata?.vault_id || !metadata?.device_id) {
  throw new Error("The export is missing app_db_metadata provenance.");
}

const vaultId = String(metadata.vault_id);
const deviceId = String(metadata.device_id);
const dbInstanceId = String(metadata.db_instance_id);
if (apply && confirmVault !== vaultId) {
  throw new Error(`Apply requires --confirm-vault ${vaultId}.`);
}

const client = createClient({ url, authToken });
const batchClient = connect({ url, authToken });
const migrationId = `full_db_${vaultId}_${Date.now()}`;
const now = Date.now();

try {
  const localTables = listLocalTables(database);
  const contractTables = new Set(WAYMARK_TURSO_FULL_DB_TABLES.map((spec) => spec.tableName));
  const missingContract = [...localTables].filter((tableName) => !contractTables.has(tableName));
  if (missingContract.length > 0) {
    throw new Error(`Full-DB contract is missing local tables: ${missingContract.join(", ")}`);
  }

  const remoteTables = await listRemoteTables(client);
  const protectedBaseline = await captureProtectedBaseline(client, vaultId);
  assertProtectedBaselineIsUsable(protectedBaseline);

  const plan = [];
  for (const spec of [...WAYMARK_TURSO_FULL_DB_TABLES].sort((left, right) => left.wave - right.wave || left.tableName.localeCompare(right.tableName))) {
    const localSchema = readLocalSchema(database, spec.tableName);
    const sourceRows = readSourceRows(database, spec.tableName);
    const filteredRows = sourceRows.filter((row) => shouldMigrateRow(spec.tableName, row));
    const sourceChecksum = checksumRows(filteredRows, localSchema.primaryKeyColumns);
    const remoteExists = remoteTables.has(spec.tableName);
    const protectedRemote = spec.migrationMode === "preserve_remote";
    const remoteColumns = remoteExists ? await readRemoteColumns(client, spec.tableName) : [];
    const compatibilityIssues = protectedRemote
      ? []
      : findRequiredRemoteColumnsWithoutValues(spec, localSchema, remoteColumns);
    const item = {
      tableName: spec.tableName,
      wave: spec.wave,
      mode: spec.migrationMode,
      remoteExists,
      sourceRows: sourceRows.length,
      eligibleRows: filteredRows.length,
      excludedRows: sourceRows.length - filteredRows.length,
      sourceChecksum,
      compatibilityIssues,
      action: protectedRemote ? "preserve_remote" : remoteExists ? "seed_missing_into_existing" : "create_and_seed_missing",
    };
    plan.push(item);
  }

  const dryRunReport = {
    mode: apply ? "apply" : "dry-run",
    databasePath,
    vaultId,
    deviceId,
    dbInstanceId,
    protectedBaseline,
    tables: plan,
  };
  console.log(JSON.stringify(dryRunReport, null, 2));
  if (!apply) {
    console.log("Dry-run only. Re-run with --apply and the exact --confirm-vault value to mutate Turso.");
    process.exitCode = 0;
  } else {
    await applyMigration({
      client,
      database,
      vaultId,
      deviceId,
      dbInstanceId,
      migrationId,
      now,
      plan,
      protectedBaseline,
      remoteTables,
      batchClient,
    });
  }
} finally {
  client.close();
  await batchClient.close();
  database.close();
}

async function applyMigration(input) {
  const backupDirectory = path.resolve(process.cwd(), ".tmp", "full-db-migrations", input.migrationId);
  fs.mkdirSync(backupDirectory, { recursive: true });
  const incompatibleTables = input.plan.filter((item) => item.compatibilityIssues.length > 0);
  if (incompatibleTables.length > 0) {
    throw new Error(`Remote schema preflight failed: ${incompatibleTables.map((item) => `${item.tableName} (${item.compatibilityIssues.join(", ")})`).join("; ")}`);
  }
  fs.writeFileSync(
    path.join(backupDirectory, "protected-baseline.json"),
    `${JSON.stringify(input.protectedBaseline, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(backupDirectory, "migration-plan.json"),
    `${JSON.stringify(input.plan, null, 2)}\n`,
    "utf8",
  );
  const remoteBackup = await captureRemoteBackup(input.client, input.remoteTables, input.vaultId);
  fs.writeFileSync(
    path.join(backupDirectory, "remote-before.json"),
    `${stableJson(remoteBackup)}\n`,
    "utf8",
  );

  await input.client.executeMultiple(WAYMARK_TURSO_FULL_DB_SCHEMA_SQL);
  await input.client.execute({
    sql: `UPDATE waymark_full_db_schema_metadata
          SET migration_mode = 'preparing', activated_at = NULL, updated_at = ?
          WHERE singleton_id = 1;`,
    args: [Date.now()],
  });
  await ensureSemanticDuplicateCompatibleSchema(input.client, input.batchClient);
  await input.client.execute({
    sql: `INSERT INTO waymark_full_db_migrations (
            migration_id, vault_id, source_db_instance_id, source_device_id,
            source_exported_at, status, protected_baseline_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'applying', ?, ?, ?);`,
    args: [
      input.migrationId,
      input.vaultId,
      input.dbInstanceId,
      input.deviceId,
      readExportedAt(input.database),
      JSON.stringify(input.protectedBaseline),
      input.now,
      input.now,
    ],
  });

  const results = [];
  try {
    for (const spec of [...WAYMARK_TURSO_FULL_DB_TABLES].sort((left, right) => left.wave - right.wave || left.tableName.localeCompare(right.tableName))) {
      const localSchema = readLocalSchema(input.database, spec.tableName);
      const sourceRows = readSourceRows(input.database, spec.tableName).filter((row) => shouldMigrateRow(spec.tableName, row));
      const sourceChecksum = checksumRows(sourceRows, localSchema.primaryKeyColumns);

      if (spec.migrationMode === "preserve_remote") {
        await ensureRemoteBusinessIdentityIndexes(input.client, spec, await readRemoteColumns(input.client, spec.tableName));
        const remoteManifest = await captureRemoteTableManifest(input.client, spec.tableName, input.vaultId);
        const result = {
          tableName: spec.tableName,
          status: "protected",
          sourceRows: sourceRows.length,
          insertedRows: 0,
          skippedRows: sourceRows.length,
          conflictRows: 0,
          sourceChecksum,
          remoteBeforeChecksum: remoteManifest.checksum,
          remoteAfterChecksum: remoteManifest.checksum,
        };
        await writeTableManifest(input.client, input, result);
        results.push(result);
        continue;
      }

      const targetSchema = await ensureRemoteMirrorTable(input.client, {
        spec,
        localSchema,
      });
      const remoteBefore = await captureRemoteTableManifest(input.client, spec.tableName, input.vaultId);
      const insertResult = await insertMissingRows(input.batchClient, {
        spec,
        localSchema,
        targetSchema,
        rows: sourceRows,
        vaultId: input.vaultId,
        deviceId: input.deviceId,
        migrationId: input.migrationId,
      });
      const remoteAfter = await captureRemoteTableManifest(input.client, spec.tableName, input.vaultId);
      const missingSourceKeys = await findMissingSourceKeys(input.client, {
        spec,
        localSchema,
        targetSchema,
        rows: sourceRows,
        vaultId: input.vaultId,
        deviceId: input.deviceId,
      });
      if (missingSourceKeys.length > 0) {
        throw new Error(`${spec.tableName} is missing ${missingSourceKeys.length} source keys after migration; samples: ${missingSourceKeys.slice(0, 5).join(", ")}`);
      }
      const result = {
        tableName: spec.tableName,
        status: "verified",
        sourceRows: sourceRows.length,
        insertedRows: Math.max(0, remoteAfter.rowCount - remoteBefore.rowCount),
        updatedRows: Math.max(0, insertResult.applied - Math.max(0, remoteAfter.rowCount - remoteBefore.rowCount)),
        skippedRows: Math.max(0, sourceRows.length - insertResult.applied),
        conflictRows: missingSourceKeys.length,
        sourceChecksum,
        remoteBeforeChecksum: remoteBefore.checksum,
        remoteAfterChecksum: remoteAfter.checksum,
      };
      await writeTableManifest(input.client, input, result);
      results.push(result);
    }

    const protectedAfter = await captureProtectedBaseline(input.client, input.vaultId);
    if (stableJson(protectedAfter) !== stableJson(input.protectedBaseline)) {
      throw new Error("Protected canonical checksum changed during Full-DB migration.");
    }
    const foreignKeyValidation = await validateRemoteForeignKeys(input.client, input.database, input.vaultId);
    if (foreignKeyValidation.issues.length > 0) {
      throw new Error(`Remote logical FK validation failed: ${foreignKeyValidation.issues.map((issue) => `${issue.childTable}->${issue.parentTable}:${issue.orphanCount}`).join(", ")}`);
    }

    for (const spec of WAYMARK_TURSO_FULL_DB_TABLES) {
      await ensureFullDbChangeTriggers(input.client, spec, input.vaultId);
    }
    const throughRevision = await readFullDbChangeCeiling(input.client, input.vaultId);
    const snapshotId = `snapshot_${input.vaultId}_${Date.now()}`;
    await input.client.execute({
      sql: `INSERT INTO waymark_full_db_snapshots (
              snapshot_id, vault_id, through_global_revision, schema_version,
              table_manifest_json, status, created_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, 'ready', ?, ?);`,
      args: [
        snapshotId,
        input.vaultId,
        throughRevision,
        WAYMARK_TURSO_FULL_DB_SCHEMA_VERSION,
        JSON.stringify({ tables: results, foreignKeyValidation }),
        Date.now(),
        Date.now(),
      ],
    });
    await input.client.execute({
      sql: `UPDATE waymark_full_db_migrations
            SET status = 'verified', result_manifest_json = ?, updated_at = ?, completed_at = ?
            WHERE migration_id = ?;`,
      args: [JSON.stringify({ snapshotId, results, protectedAfter }), Date.now(), Date.now(), input.migrationId],
    });
    await input.client.execute({
      sql: `UPDATE waymark_full_db_schema_metadata
            SET schema_version = ?, migration_mode = 'active', activated_at = COALESCE(activated_at, ?), updated_at = ?
            WHERE singleton_id = 1;`,
      args: [WAYMARK_TURSO_FULL_DB_SCHEMA_VERSION, Date.now(), Date.now()],
    });

    const report = { migrationId: input.migrationId, snapshotId, protectedAfter, foreignKeyValidation, tables: results };
    fs.writeFileSync(path.join(backupDirectory, "result.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    await input.client.execute({
      sql: `UPDATE waymark_full_db_migrations
            SET status = 'failed', error_message = ?, updated_at = ?, completed_at = ?
            WHERE migration_id = ?;`,
      args: [formatError(error), Date.now(), Date.now(), input.migrationId],
    });
    throw error;
  }
}

async function ensureRemoteMirrorTable(client, input) {
  const tableName = input.spec.tableName;
  const existingColumns = await readRemoteColumns(client, tableName);
  if (existingColumns.length === 0) {
    const createSql = buildRemoteMirrorCreateSql(input.spec, input.localSchema);
    await client.execute(createSql);
  }

  let targetColumns = await readRemoteColumns(client, tableName);
  const targetColumnNames = new Set(targetColumns.map((column) => column.name));
  for (const column of input.localSchema.columns) {
    if (isWaymarkFullDbLocalOnlyColumn(column.name)) continue;
    if (targetColumnNames.has(column.name)) continue;
    await client.execute(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${quoteIdentifier(column.name)} ${normalizeType(column.type)};`);
    targetColumnNames.add(column.name);
  }
  for (const [name, sqlType] of [
    ["_remote_entity_revision", "INTEGER NOT NULL DEFAULT 1"],
    ["_remote_last_mutation_id", "TEXT"],
    ["_remote_import_id", "TEXT"],
  ]) {
    if (targetColumnNames.has(name)) continue;
    await client.execute(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${quoteIdentifier(name)} ${sqlType};`);
    targetColumnNames.add(name);
  }
  if (!targetColumnNames.has("vault_id")) {
    throw new Error(`Remote Full-DB table ${tableName} has no vault_id after schema preparation.`);
  }
  if (input.spec.scope === "device" && !targetColumnNames.has("device_id") && !targetColumnNames.has("source_device_id")) {
    await client.execute(`ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN source_device_id TEXT;`);
  }
  targetColumns = await readRemoteColumns(client, tableName);
  await ensureRemoteBusinessIdentityIndexes(client, input.spec, targetColumns);
  return {
    columns: targetColumns.map((column) => column.name),
    primaryKeyColumns: targetColumns
      .filter((column) => Number(column.pk) > 0)
      .sort((left, right) => Number(left.pk) - Number(right.pk))
      .map((column) => column.name),
  };
}

async function ensureRemoteBusinessIdentityIndexes(client, spec, remoteColumns) {
  const available = new Set(remoteColumns.map((column) => column.name));
  for (const identity of spec.businessIdentities ?? []) {
    const scopeColumns = [];
    if (available.has("vault_id")) scopeColumns.push("vault_id");
    if (spec.scope === "device") {
      if (available.has("device_id")) scopeColumns.push("device_id");
      else if (available.has("source_device_id")) scopeColumns.push("source_device_id");
    }
    const columns = [...new Set([...scopeColumns, ...identity.columns])];
    const missing = columns.filter((column) => !available.has(column));
    if (missing.length > 0) {
      throw new Error(`Cannot enforce remote business identity ${spec.tableName}.${identity.name}; missing: ${missing.join(", ")}.`);
    }
    const predicates = [
      ...(identity.requireNonNull ?? []).map((column) => `${quoteIdentifier(column)} IS NOT NULL`),
      ...(identity.whereNull ?? []).map((column) => `${quoteIdentifier(column)} IS NULL`),
    ];
    const indexName = `ux_full_db_${spec.tableName}_${identity.name}`;
    await client.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS ${quoteIdentifier(indexName)}
       ON ${quoteIdentifier(spec.tableName)} (${columns.map(quoteIdentifier).join(", ")})${
         predicates.length > 0 ? ` WHERE ${predicates.join(" AND ")}` : ""
       };`,
    );
  }
}

async function ensureSemanticDuplicateCompatibleSchema(client, batchClient) {
  const tableName = "exercise_definitions";
  const schemaResult = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?;",
    args: [tableName],
  });
  const schemaSql = String(schemaResult.rows[0]?.sql ?? "");
  const semanticConstraint = /,\s*UNIQUE\s*\(\s*vault_id\s*,\s*canonical_slug\s*\)\s*/i;
  if (!semanticConstraint.test(schemaSql)) return;
  const columns = await readRemoteColumns(client, tableName);
  const rebuildName = `${tableName}_full_db_rebuild`;
  const createSql = schemaSql
    .replace(new RegExp(`CREATE\\s+TABLE\\s+(?:"${tableName}"|${tableName})`, "i"), `CREATE TABLE ${quoteIdentifier(rebuildName)}`)
    .replace(semanticConstraint, "");
  const columnList = columns.map((column) => quoteIdentifier(column.name)).join(", ");
  await batchClient.execute("PRAGMA foreign_keys = OFF;");
  try {
    await batchClient.batch([
      `DROP TRIGGER IF EXISTS trg_full_db_${tableName}_insert;`,
      `DROP TRIGGER IF EXISTS trg_full_db_${tableName}_update;`,
      `DROP TRIGGER IF EXISTS trg_full_db_${tableName}_delete;`,
      `DROP TABLE IF EXISTS ${quoteIdentifier(rebuildName)};`,
      createSql,
      `INSERT INTO ${quoteIdentifier(rebuildName)} (${columnList}) SELECT ${columnList} FROM ${quoteIdentifier(tableName)};`,
      `DROP TABLE ${quoteIdentifier(tableName)};`,
      `ALTER TABLE ${quoteIdentifier(rebuildName)} RENAME TO ${quoteIdentifier(tableName)};`,
    ], "immediate");
  } finally {
    await batchClient.execute("PRAGMA foreign_keys = ON;");
  }
}

function buildRemoteMirrorCreateSql(spec, localSchema) {
  const localNames = new Set(localSchema.columns.map((column) => column.name));
  const columns = [];
  if (!localNames.has("vault_id")) columns.push("vault_id TEXT NOT NULL");
  if (spec.scope === "device" && !localNames.has("device_id")) columns.push("source_device_id TEXT NOT NULL");
  for (const column of localSchema.columns) {
    if (isWaymarkFullDbLocalOnlyColumn(column.name)) continue;
    const parts = [quoteIdentifier(column.name), normalizeType(column.type)];
    if (column.notnull) parts.push("NOT NULL");
    if (column.defaultValue !== null && column.defaultValue !== undefined) parts.push(`DEFAULT ${column.defaultValue}`);
    columns.push(parts.join(" "));
  }
  columns.push("_remote_entity_revision INTEGER NOT NULL DEFAULT 1");
  columns.push("_remote_last_mutation_id TEXT");
  columns.push("_remote_import_id TEXT");

  const primaryKey = [];
  if (!localNames.has("vault_id")) primaryKey.push("vault_id");
  if (spec.scope === "device" && !localNames.has("device_id")) primaryKey.push("source_device_id");
  primaryKey.push(...localSchema.primaryKeyColumns);
  if (primaryKey.length === 0) {
    throw new Error(`Cannot create Full-DB table ${spec.tableName}: local table has no primary key.`);
  }
  columns.push(`PRIMARY KEY (${primaryKey.map(quoteIdentifier).join(", ")})`);

  return `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(spec.tableName)} (\n  ${columns.join(",\n  ")}\n);`;
}

async function insertMissingRows(batchClient, input) {
  const targetColumnSet = new Set(input.targetSchema.columns);
  const localColumnNames = input.localSchema.columns
    .map((column) => column.name)
    .filter((columnName) => !isWaymarkFullDbLocalOnlyColumn(columnName));
  const statements = [];
  for (const row of input.rows) {
    const payload = {};
    if (!localColumnNames.includes("vault_id")) payload.vault_id = input.vaultId;
    if (input.spec.scope === "device" && !localColumnNames.includes("device_id")) payload.source_device_id = input.deviceId;
    for (const columnName of localColumnNames) {
      if (targetColumnSet.has(columnName)) payload[columnName] = normalizeSqlValue(row[columnName]);
    }
    if (input.spec.tableName === "signals") {
      if (targetColumnSet.has("runtime_status")) payload.runtime_status = String(row.status ?? "scheduled");
      if (targetColumnSet.has("is_enabled")) payload.is_enabled = signalIsEnabled(row) ? 1 : 0;
      if (targetColumnSet.has("entity_revision")) payload.entity_revision = numericRevision(row);
      if (targetColumnSet.has("last_mutation_id")) payload.last_mutation_id = input.migrationId;
    }
    if (targetColumnSet.has("entity_revision") && payload.entity_revision === undefined) {
      payload.entity_revision = numericRevision(row);
    }
    if (targetColumnSet.has("last_mutation_id") && payload.last_mutation_id === undefined) {
      payload.last_mutation_id = input.migrationId;
    }
    if (targetColumnSet.has("_remote_entity_revision")) payload._remote_entity_revision = numericRevision(row);
    if (targetColumnSet.has("_remote_last_mutation_id")) payload._remote_last_mutation_id = input.migrationId;
    if (targetColumnSet.has("_remote_import_id")) payload._remote_import_id = input.migrationId;
    const columnNames = Object.keys(payload);
    const primaryKey = input.targetSchema.primaryKeyColumns;
    const mutableColumns = columnNames.filter((columnName) => !primaryKey.includes(columnName));
    const conflictAction = mutableColumns.length > 0
      ? `DO UPDATE SET ${mutableColumns.map((columnName) => `${quoteIdentifier(columnName)} = excluded.${quoteIdentifier(columnName)}`).join(", ")}`
      : "DO NOTHING";
    statements.push({
      sql: `INSERT INTO ${quoteIdentifier(input.spec.tableName)} (${columnNames.map(quoteIdentifier).join(", ")}) VALUES (${columnNames.map(() => "?").join(", ")}) ON CONFLICT (${primaryKey.map(quoteIdentifier).join(", ")}) ${conflictAction};`,
      args: columnNames.map((columnName) => payload[columnName]),
    });
  }

  let applied = 0;
  for (let index = 0; index < statements.length; index += 100) {
    const batch = await batchClient.batch(statements.slice(index, index + 100), "immediate");
    applied += Number(batch.rowsAffected ?? 0);
  }
  return { applied };
}

async function findMissingSourceKeys(client, input) {
  if (input.rows.length === 0) return [];
  const primaryKey = input.targetSchema.primaryKeyColumns;
  if (primaryKey.length === 0) throw new Error(`Remote table ${input.spec.tableName} has no primary key.`);
  const hasVaultId = input.targetSchema.columns.includes("vault_id");
  const result = await client.execute({
    sql: `SELECT ${primaryKey.map(quoteIdentifier).join(", ")} FROM ${quoteIdentifier(input.spec.tableName)}${hasVaultId ? " WHERE vault_id = ?" : ""};`,
    args: hasVaultId ? [input.vaultId] : [],
  });
  const remoteKeys = new Set(result.rows.map((row) => primaryKey.map((column) => String(row[column] ?? "")).join("\u0000")));
  const missing = [];
  for (const row of input.rows) {
    const key = primaryKey.map((column) => {
      if (column === "vault_id") return input.vaultId;
      if (column === "source_device_id") return input.deviceId;
      if (column === "device_id" && row[column] == null) return input.deviceId;
      return String(row[column] ?? "");
    }).join("\u0000");
    if (!remoteKeys.has(key)) missing.push(key.replaceAll("\u0000", ":"));
  }
  return missing;
}

async function ensureFullDbChangeTriggers(client, spec) {
  const columns = await readRemoteColumns(client, spec.tableName);
  if (columns.length === 0 || !columns.some((column) => column.name === "vault_id")) return;
  const columnNames = columns.map((column) => column.name);
  const pkColumns = columns.filter((column) => Number(column.pk) > 0).sort((left, right) => Number(left.pk) - Number(right.pk));
  const rowKeyColumns = pkColumns.filter((column) => column.name !== "vault_id").map((column) => column.name);
  if (rowKeyColumns.length === 0) return;

  const suffix = spec.tableName.replace(/[^A-Za-z0-9_]/g, "_");
  const payloadNew = jsonObjectExpression("NEW", columnNames);
  const payloadOld = jsonObjectExpression("OLD", columnNames);
  const rowKeyNew = rowKeyExpression("NEW", rowKeyColumns);
  const rowKeyOld = rowKeyExpression("OLD", rowKeyColumns);
  const revisionNew = columnNames.includes("entity_revision") ? "COALESCE(NEW.entity_revision, 1)" : "COALESCE(NEW._remote_entity_revision, 1)";
  const revisionOld = columnNames.includes("entity_revision") ? "COALESCE(OLD.entity_revision, 1)" : "COALESCE(OLD._remote_entity_revision, 1)";
  const mutationNew = columnNames.includes("last_mutation_id") ? "NEW.last_mutation_id" : "NEW._remote_last_mutation_id";
  const mutationOld = columnNames.includes("last_mutation_id") ? "OLD.last_mutation_id" : "OLD._remote_last_mutation_id";
  const deviceNew = columnNames.includes("device_id") ? "NEW.device_id" : columnNames.includes("source_device_id") ? "NEW.source_device_id" : "NULL";
  const deviceOld = columnNames.includes("device_id") ? "OLD.device_id" : columnNames.includes("source_device_id") ? "OLD.source_device_id" : "NULL";
  const hasDeletedAt = columnNames.includes("deleted_at");
  const updateOperation = hasDeletedAt ? "CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'delete' ELSE 'update' END" : "'update'";
  const nowExpression = "CAST(unixepoch('subsec') * 1000 AS INTEGER)";

  await client.executeMultiple(`
DROP TRIGGER IF EXISTS trg_full_db_${suffix}_insert;
DROP TRIGGER IF EXISTS trg_full_db_${suffix}_update;
DROP TRIGGER IF EXISTS trg_full_db_${suffix}_delete;
CREATE TRIGGER trg_full_db_${suffix}_insert AFTER INSERT ON ${quoteIdentifier(spec.tableName)}
BEGIN
  INSERT INTO waymark_full_db_change_log (
    vault_id, device_id, table_name, row_key, operation, entity_revision,
    payload_snapshot, payload_schema_version, mutation_id, changed_at
  ) VALUES (
    NEW.vault_id, ${deviceNew}, '${escapeSql(spec.tableName)}', ${rowKeyNew}, 'create', ${revisionNew},
    ${payloadNew}, 1, ${mutationNew}, ${nowExpression}
  );
END;
CREATE TRIGGER trg_full_db_${suffix}_update AFTER UPDATE ON ${quoteIdentifier(spec.tableName)}
BEGIN
  INSERT INTO waymark_full_db_change_log (
    vault_id, device_id, table_name, row_key, operation, entity_revision,
    payload_snapshot, payload_schema_version, mutation_id, changed_at
  ) VALUES (
    NEW.vault_id, ${deviceNew}, '${escapeSql(spec.tableName)}', ${rowKeyNew}, ${updateOperation}, ${revisionNew},
    ${payloadNew}, 1, ${mutationNew}, ${nowExpression}
  );
END;
CREATE TRIGGER trg_full_db_${suffix}_delete AFTER DELETE ON ${quoteIdentifier(spec.tableName)}
BEGIN
  INSERT INTO waymark_full_db_change_log (
    vault_id, device_id, table_name, row_key, operation, entity_revision,
    payload_snapshot, payload_schema_version, mutation_id, changed_at
  ) VALUES (
    OLD.vault_id, ${deviceOld}, '${escapeSql(spec.tableName)}', ${rowKeyOld}, 'delete', ${revisionOld},
    ${payloadOld}, 1, ${mutationOld}, ${nowExpression}
  );
END;
`);
}

async function writeTableManifest(client, input, result) {
  await client.execute({
    sql: `INSERT INTO waymark_full_db_table_manifests (
            migration_id, vault_id, table_name, source_row_count, inserted_row_count,
            skipped_row_count, conflict_row_count, source_checksum,
            remote_before_checksum, remote_after_checksum, status, details_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    args: [
      input.migrationId,
      input.vaultId,
      result.tableName,
      result.sourceRows,
      result.insertedRows,
      result.skippedRows,
      result.conflictRows,
      result.sourceChecksum,
      result.remoteBeforeChecksum,
      result.remoteAfterChecksum,
      result.status,
      JSON.stringify(result),
      Date.now(),
      Date.now(),
    ],
  });
}

async function captureProtectedBaseline(client, vaultId) {
  const baseline = {};
  for (const tableName of WAYMARK_TURSO_PROTECTED_CANONICAL_TABLES) {
    baseline[tableName] = await captureRemoteTableManifest(client, tableName, vaultId);
  }
  return baseline;
}

async function validateRemoteForeignKeys(client, database, vaultId) {
  const issues = [];
  let relationshipsChecked = 0;
  for (const childTable of listLocalTables(database)) {
    const foreignKeys = database.prepare(`PRAGMA foreign_key_list(${quoteIdentifier(childTable)});`).all();
    const groups = new Map();
    for (const foreignKey of foreignKeys) {
      const id = Number(foreignKey.id);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(foreignKey);
    }
    for (const group of groups.values()) {
      const parentTable = String(group[0].table);
      const childColumns = group.map((foreignKey) => String(foreignKey.from));
      const parentColumns = group.map((foreignKey) => String(foreignKey.to));
      const join = childColumns.map((column, index) => `parent.${quoteIdentifier(parentColumns[index])} = child.${quoteIdentifier(column)}`).join(" AND ");
      const present = childColumns.map((column) => `child.${quoteIdentifier(column)} IS NOT NULL`).join(" AND ");
      const result = await client.execute({
        sql: `SELECT COUNT(*) AS orphan_count
              FROM ${quoteIdentifier(childTable)} child
              LEFT JOIN ${quoteIdentifier(parentTable)} parent
                ON parent.vault_id = child.vault_id AND ${join}
              WHERE child.vault_id = ? AND ${present}
                AND parent.${quoteIdentifier(parentColumns[0])} IS NULL;`,
        args: [vaultId],
      });
      relationshipsChecked += 1;
      const orphanCount = Number(result.rows[0]?.orphan_count ?? 0);
      if (orphanCount > 0) issues.push({ childTable, parentTable, childColumns, orphanCount });
    }
  }
  return { relationshipsChecked, issues };
}

async function captureRemoteBackup(client, remoteTables, vaultId) {
  const backup = { capturedAt: Date.now(), vaultId, tables: {} };
  for (const tableName of [...remoteTables].sort()) {
    if (tableName.startsWith("sqlite_")) continue;
    const columns = await readRemoteColumns(client, tableName);
    const schemaResult = await client.execute({
      sql: "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?;",
      args: [tableName],
    });
    const hasVaultId = columns.some((column) => column.name === "vault_id");
    const rowsResult = await client.execute({
      sql: `SELECT * FROM ${quoteIdentifier(tableName)}${hasVaultId ? " WHERE vault_id = ?" : ""};`,
      args: hasVaultId ? [vaultId] : [],
    });
    backup.tables[tableName] = {
      schemaSql: schemaResult.rows[0]?.sql ?? null,
      columns,
      rows: rowsResult.rows.map((row) => Object.fromEntries(rowsResult.columns.map((columnName, index) => [columnName, normalizeSqlValue(row[index])]))),
    };
  }
  return backup;
}

function assertProtectedBaselineIsUsable(baseline) {
  for (const tableName of WAYMARK_TURSO_PROTECTED_CANONICAL_TABLES) {
    if (!baseline[tableName] || baseline[tableName].rowCount <= 0) {
      throw new Error(`Protected Turso table ${tableName} is empty or missing; refusing Full-DB migration.`);
    }
  }
}

async function captureRemoteTableManifest(client, tableName, vaultId) {
  const columns = await readRemoteColumns(client, tableName);
  if (columns.length === 0) return { rowCount: 0, checksum: checksumRows([], []) };
  const hasVaultId = columns.some((column) => column.name === "vault_id");
  const pkColumns = columns.filter((column) => Number(column.pk) > 0).sort((left, right) => Number(left.pk) - Number(right.pk)).map((column) => column.name);
  const result = await client.execute({
    sql: `SELECT * FROM ${quoteIdentifier(tableName)}${hasVaultId ? " WHERE vault_id = ?" : ""}${pkColumns.length > 0 ? ` ORDER BY ${pkColumns.map(quoteIdentifier).join(", ")}` : ""};`,
    args: hasVaultId ? [vaultId] : [],
  });
  const rows = result.rows.map((row) => Object.fromEntries(result.columns.map((columnName, index) => [columnName, normalizeSqlValue(row[index])])));
  return { rowCount: rows.length, checksum: checksumRows(rows, pkColumns) };
}

async function readFullDbChangeCeiling(client, vaultId) {
  const result = await client.execute({
    sql: "SELECT COALESCE(MAX(global_revision), 0) AS revision FROM waymark_full_db_change_log WHERE vault_id = ?;",
    args: [vaultId],
  });
  return Number(result.rows[0]?.revision ?? 0);
}

async function listRemoteTables(client) {
  const result = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;");
  return new Set(result.rows.map((row) => String(row.name)));
}

async function readRemoteColumns(client, tableName) {
  const tables = await listRemoteTables(client);
  if (!tables.has(tableName)) return [];
  const result = await client.execute(`PRAGMA table_info(${quoteIdentifier(tableName)});`);
  return result.rows.map((row) => ({
    name: String(row.name),
    type: String(row.type ?? ""),
    notnull: Number(row.notnull ?? 0),
    defaultValue: row.dflt_value,
    pk: Number(row.pk ?? 0),
  }));
}

function listLocalTables(database) {
  return new Set(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
      .all()
      .map((row) => String(row.name)),
  );
}

function readLocalSchema(database, tableName) {
  const columns = database.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)});`).all().map((row) => ({
    name: String(row.name),
    type: String(row.type ?? ""),
    notnull: Number(row.notnull ?? 0) === 1,
    defaultValue: row.dflt_value,
    pk: Number(row.pk ?? 0),
  }));
  if (columns.length === 0) throw new Error(`Local export is missing table ${tableName}.`);
  return {
    columns,
    primaryKeyColumns: columns.filter((column) => column.pk > 0).sort((left, right) => left.pk - right.pk).map((column) => column.name),
  };
}

function readSourceRows(database, tableName) {
  return database.prepare(`SELECT * FROM ${quoteIdentifier(tableName)};`).all().map((row) => ({ ...row }));
}

function shouldMigrateRow(tableName, row) {
  if (tableName !== "app_settings") return true;
  const key = String(row.key ?? "").toLowerCase();
  if (key.startsWith("seed_registry:")) return false;
  return !/(auth|token|secret|password|credential)/i.test(key);
}

function findRequiredRemoteColumnsWithoutValues(spec, localSchema, remoteColumns) {
  if (remoteColumns.length === 0) return [];
  const supplied = new Set(
    localSchema.columns
      .map((column) => column.name)
      .filter((columnName) => !isWaymarkFullDbLocalOnlyColumn(columnName)),
  );
  supplied.add("vault_id");
  supplied.add("_remote_entity_revision");
  supplied.add("_remote_last_mutation_id");
  supplied.add("_remote_import_id");
  if (spec.scope === "device") supplied.add("source_device_id");
  supplied.add("entity_revision");
  supplied.add("last_mutation_id");
  if (spec.tableName === "signals") {
    supplied.add("runtime_status");
    supplied.add("is_enabled");
  }
  return remoteColumns
    .filter((column) => column.notnull === 1 && column.defaultValue == null && Number(column.pk) === 0 && !supplied.has(column.name))
    .map((column) => column.name);
}

function checksumRows(rows, primaryKeyColumns) {
  const ordered = [...rows].sort((left, right) => {
    const leftKey = primaryKeyColumns.map((column) => String(left[column] ?? "")).join("\u0000");
    const rightKey = primaryKeyColumns.map((column) => String(right[column] ?? "")).join("\u0000");
    return leftKey.localeCompare(rightKey);
  });
  return crypto.createHash("sha256").update(stableJson(ordered)).digest("hex");
}

function stableJson(value) {
  return JSON.stringify(sortJson(value), (_key, item) => typeof item === "bigint" ? item.toString() : item);
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object" && !(value instanceof Uint8Array)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
  }
  if (value instanceof Uint8Array) return Buffer.from(value).toString("base64");
  return value;
}

function normalizeSqlValue(value) {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Uint8Array) return value;
  return value;
}

function numericRevision(row) {
  const revision = Number(row.local_revision ?? row.entity_revision ?? 1);
  return Number.isFinite(revision) && revision > 0 ? revision : 1;
}

function signalIsEnabled(row) {
  return row.deleted_at === null && !["resolved", "dismissed", "expired", "cancelled"].includes(String(row.status));
}

function jsonObjectExpression(prefix, columnNames) {
  return `json_object(${columnNames.map((columnName) => `'${escapeSql(columnName)}', ${prefix}.${quoteIdentifier(columnName)}`).join(", ")})`;
}

function rowKeyExpression(prefix, columnNames) {
  return columnNames.map((columnName) => `COALESCE(CAST(${prefix}.${quoteIdentifier(columnName)} AS TEXT), '')`).join(" || ':' || ");
}

function normalizeType(type) {
  const upper = String(type ?? "").trim().toUpperCase();
  if (!upper) return "TEXT";
  if (/^[A-Z]+(?:\([0-9, ]+\))?$/.test(upper)) return upper;
  return "TEXT";
}

function quoteIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
}

function escapeSql(value) {
  return String(value).replaceAll("'", "''");
}

function readExportedAt(database) {
  const columns = new Set(
    database.prepare("PRAGMA table_info(app_db_metadata);").all().map((row) => String(row.name)),
  );
  const candidates = ["last_cloud_sync_at", "last_seed_at", "last_migration_at", "created_at"].filter((name) => columns.has(name));
  if (candidates.length === 0) return Date.now();
  const expression = `COALESCE(${candidates.map(quoteIdentifier).join(", ")})`;
  const row = database.prepare(`SELECT MAX(${expression}) AS exported_at FROM app_db_metadata;`).get();
  return Number(row?.exported_at ?? Date.now());
}

function readOption(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? null : null;
}

function resolveExportDatabasePath(argument) {
  if (!argument) return null;
  const resolved = path.resolve(argument);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) return path.join(resolved, "waymark.db");
  return resolved;
}

function resolveLatestExportDatabasePath() {
  const exportRoot = path.resolve(process.cwd(), "..", "waymark db export");
  const candidates = fs.readdirSync(exportRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("waymark-db-export-"))
    .map((entry) => path.join(exportRoot, entry.name, "waymark.db"))
    .filter((candidate) => fs.existsSync(candidate))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
  return candidates[0] ?? null;
}

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
