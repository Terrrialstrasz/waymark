import type { SQLiteDatabase } from "expo-sqlite";
import { MIGRATIONS } from "../db/migrations/manifest";

export type WaymarkClientType = "main" | "lite";
export type WaymarkRestoreState = "fresh_local" | "restored_from_cloud" | "migrated_existing" | "dev_reset";
export type WaymarkSyncMode = "none" | "manual" | "eod";
export type WaymarkProtectionStatus = "local_only" | "cloud_configured" | "syncing" | "protected" | "error";

export type AppDbMetadata = {
  dbInstanceId: string;
  vaultId: string;
  deviceId: string;
  clientType: WaymarkClientType;
  applicationId: string;
  schemaVersion: number;
  mapVersion: number;
  seedVersion: number;
  restoreState: WaymarkRestoreState;
  createdAt: number;
  lastMigrationAt: number;
  lastSeedAt: number | null;
  lastCloudSyncAt: number | null;
};

type AppDbMetadataRow = {
  db_instance_id: string;
  vault_id: string;
  device_id: string;
  client_type: WaymarkClientType;
  application_id: string | null;
  schema_version: number;
  map_version: number;
  seed_version: number;
  restore_state: WaymarkRestoreState;
  created_at: number;
  last_migration_at: number;
  last_seed_at: number | null;
  last_cloud_sync_at: number | null;
};

export type RestoreWaymarkVaultResult = {
  restored: boolean;
};

export type WaymarkVaultBootGateOptions = {
  clientType?: WaymarkClientType;
  applicationId?: string;
  deviceName?: string;
  mapVersion: number;
  seedVersion: number;
  now?: number;
  cloudRestoreConfigured?: boolean;
  restoreWaymarkVault?: (context: {
    db: SQLiteDatabase;
    vaultId: string;
    deviceId: string;
    clientType: WaymarkClientType;
  }) => Promise<RestoreWaymarkVaultResult>;
};

export type WaymarkVaultBootGateResult = {
  metadata: AppDbMetadata;
  isFreshDb: boolean;
  restoreAttempted: boolean;
  restoreCompleted: boolean;
  protectionStatus: WaymarkProtectionStatus;
};

const DEFAULT_VAULT_NAME = "Waymark Vault";
const DEFAULT_TURSO_VAULT_ID = "vault_mqfvyeyy_g86zwdmw";
const METADATA_ROW_LIMIT = 1;

const USER_DATA_TABLES = [
  "user_profiles",
  "paths",
  "expeditions",
  "milestones",
  "trail_days",
  "mark_templates",
  "mark_instances",
  "memories",
  "backlog_items",
  "week_plans",
  "week_plan_items",
  "pack_check_templates",
  "pack_check_instances",
  "signals",
  "media_assets",
  "workout_session_instances",
] as const;

export async function restoreWaymarkVaultIfAvailable(): Promise<RestoreWaymarkVaultResult> {
  return { restored: false };
}

export async function runWaymarkVaultBootGateAsync(
  db: SQLiteDatabase,
  options: WaymarkVaultBootGateOptions,
): Promise<WaymarkVaultBootGateResult> {
  const existing = await readAppDbMetadataAsync(db);
  const now = options.now ?? Date.now();
  const schemaVersion = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
  const clientType = options.clientType ?? getConfiguredClientType();
  const applicationId = options.applicationId ?? getConfiguredApplicationId(clientType);
  const cloudRestoreConfigured = options.cloudRestoreConfigured ?? isCloudRestoreConfigured();
  const configuredVaultId = getConfiguredVaultId();
  const configuredDeviceId = getConfiguredDeviceId();

  if (existing) {
    const vaultId = configuredVaultId;
    if (existing.vaultId !== vaultId) {
      await ensureVaultAndDeviceRowsAsync(db, {
        vaultId,
        deviceId: existing.deviceId,
        clientType,
        applicationId,
        deviceName: options.deviceName ?? clientType,
        now,
      });
      await rehomeExistingMetadataAsync(db, existing, {
        vaultId,
        now,
      });
      await upsertSyncStateAsync(db, {
        vaultId,
        deviceId: existing.deviceId,
        protectionStatus: cloudRestoreConfigured ? "cloud_configured" : "local_only",
        syncMode: cloudRestoreConfigured ? "eod" : "none",
      });
    }
    await touchExistingMetadataAsync(db, existing, {
      clientType,
      applicationId,
      schemaVersion,
      mapVersion: options.mapVersion,
      seedVersion: options.seedVersion,
      now,
    });
    const refreshed = await readAppDbMetadataAsync(db);
    return {
      metadata: refreshed ?? existing,
      isFreshDb: false,
      restoreAttempted: false,
      restoreCompleted: false,
      protectionStatus: cloudRestoreConfigured ? "cloud_configured" : "local_only",
    };
  }

  const hasExistingUserData = await hasAnyUserDataAsync(db);
  const vaultId = configuredVaultId;
  const deviceId = configuredDeviceId ?? generateStableLocalId("device", now);
  const dbInstanceId = generateStableLocalId("db", now);
  const restoreAttempted = !hasExistingUserData && cloudRestoreConfigured;
  let restoreCompleted = false;

  await ensureVaultAndDeviceRowsAsync(db, {
    vaultId,
    deviceId,
    clientType,
    applicationId,
    deviceName: options.deviceName ?? clientType,
    now,
  });

  if (restoreAttempted) {
    const restore = options.restoreWaymarkVault ?? restoreWaymarkVaultIfAvailable;
    const result = await restore({ db, vaultId, deviceId, clientType });
    restoreCompleted = result.restored;
  }

  const restoreState: WaymarkRestoreState =
    hasExistingUserData ? "migrated_existing"
    : restoreCompleted ? "restored_from_cloud"
    : "fresh_local";
  const protectionStatus: WaymarkProtectionStatus =
    restoreCompleted ? "protected"
    : cloudRestoreConfigured ? "cloud_configured"
    : "local_only";

  await db.runAsync(
    `INSERT INTO app_db_metadata (
      db_instance_id,
      vault_id,
      device_id,
      client_type,
      application_id,
      schema_version,
      map_version,
      seed_version,
      restore_state,
      created_at,
      last_migration_at,
      last_seed_at,
      last_cloud_sync_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL);`,
    dbInstanceId,
    vaultId,
    deviceId,
    clientType,
    applicationId,
    schemaVersion,
    options.mapVersion,
    options.seedVersion,
    restoreState,
    now,
    now,
  );

  await upsertSyncStateAsync(db, {
    vaultId,
    deviceId,
    protectionStatus,
    syncMode: cloudRestoreConfigured ? "eod" : "none",
  });

  const metadata = await readAppDbMetadataAsync(db);
  if (!metadata) {
    throw new Error("Waymark Vault boot gate failed to create app_db_metadata.");
  }

  return {
    metadata,
    isFreshDb: !hasExistingUserData,
    restoreAttempted,
    restoreCompleted,
    protectionStatus,
  };
}

export async function recordWaymarkSeedCompletedAsync(
  db: SQLiteDatabase,
  input: {
    mapVersion: number;
    seedVersion: number;
    now?: number;
  },
): Promise<void> {
  await db.runAsync(
    `UPDATE app_db_metadata
     SET map_version = ?, seed_version = ?, last_seed_at = ?
     WHERE db_instance_id IN (
       SELECT db_instance_id FROM app_db_metadata ORDER BY created_at ASC LIMIT ${METADATA_ROW_LIMIT}
     );`,
    input.mapVersion,
    input.seedVersion,
    input.now ?? Date.now(),
  );
}

async function readAppDbMetadataAsync(db: SQLiteDatabase): Promise<AppDbMetadata | null> {
  const row = await db.getFirstAsync<AppDbMetadataRow>(
    `SELECT * FROM app_db_metadata ORDER BY created_at ASC LIMIT ${METADATA_ROW_LIMIT};`,
  );
  return row ? fromMetadataRow(row) : null;
}

async function touchExistingMetadataAsync(
  db: SQLiteDatabase,
  current: AppDbMetadata,
  input: {
    clientType: WaymarkClientType;
    applicationId: string;
    schemaVersion: number;
    mapVersion: number;
    seedVersion: number;
    now: number;
  },
): Promise<void> {
  await db.runAsync(
    `UPDATE app_db_metadata
     SET client_type = ?, application_id = ?, schema_version = ?, map_version = ?, seed_version = ?, last_migration_at = ?
     WHERE db_instance_id = ?;`,
    input.clientType,
    input.applicationId,
    input.schemaVersion,
    input.mapVersion,
    input.seedVersion,
    input.now,
    current.dbInstanceId,
  );
  await db.runAsync(
    "UPDATE devices SET application_id = ?, last_seen_at = ? WHERE id = ?;",
    input.applicationId,
    input.now,
    current.deviceId,
  );
}

async function rehomeExistingMetadataAsync(
  db: SQLiteDatabase,
  current: AppDbMetadata,
  input: {
    vaultId: string;
    now: number;
  },
): Promise<void> {
  await db.runAsync(
    `UPDATE app_db_metadata
     SET vault_id = ?, last_migration_at = ?
     WHERE db_instance_id = ?;`,
    input.vaultId,
    input.now,
    current.dbInstanceId,
  );
}

async function hasAnyUserDataAsync(db: SQLiteDatabase): Promise<boolean> {
  for (const tableName of USER_DATA_TABLES) {
    const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${tableName};`);
    if ((row?.count ?? 0) > 0) {
      return true;
    }
  }
  return false;
}

async function ensureVaultAndDeviceRowsAsync(
  db: SQLiteDatabase,
  input: {
    vaultId: string;
    deviceId: string;
    clientType: WaymarkClientType;
    applicationId: string;
    deviceName: string;
    now: number;
  },
): Promise<void> {
  await db.runAsync(
    `INSERT INTO vaults (id, name, created_at, updated_at, status)
     VALUES (?, ?, ?, ?, 'active')
     ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, status = excluded.status;`,
    input.vaultId,
    DEFAULT_VAULT_NAME,
    input.now,
    input.now,
  );
  await db.runAsync(
    `INSERT INTO devices (id, vault_id, client_type, application_id, device_name, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       vault_id = excluded.vault_id,
       client_type = excluded.client_type,
       application_id = excluded.application_id,
       device_name = excluded.device_name,
       last_seen_at = excluded.last_seen_at;`,
    input.deviceId,
    input.vaultId,
    input.clientType,
    input.applicationId,
    input.deviceName,
    input.now,
    input.now,
  );
}

async function upsertSyncStateAsync(
  db: SQLiteDatabase,
  input: {
    vaultId: string;
    deviceId: string;
    protectionStatus: WaymarkProtectionStatus;
    syncMode: WaymarkSyncMode;
  },
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_state (
      vault_id,
      device_id,
      last_cloud_revision,
      last_successful_sync_at,
      sync_mode,
      protection_status
    ) VALUES (?, ?, 0, NULL, ?, ?)
    ON CONFLICT(vault_id, device_id) DO UPDATE SET
      sync_mode = excluded.sync_mode,
      protection_status = excluded.protection_status;`,
    input.vaultId,
    input.deviceId,
    input.syncMode,
    input.protectionStatus,
  );
}

function fromMetadataRow(row: AppDbMetadataRow): AppDbMetadata {
  return {
    dbInstanceId: row.db_instance_id,
    vaultId: row.vault_id,
    deviceId: row.device_id,
    clientType: row.client_type,
    applicationId: row.application_id ?? getConfiguredApplicationId(),
    schemaVersion: row.schema_version,
    mapVersion: row.map_version,
    seedVersion: row.seed_version,
    restoreState: row.restore_state,
    createdAt: row.created_at,
    lastMigrationAt: row.last_migration_at,
    lastSeedAt: row.last_seed_at,
    lastCloudSyncAt: row.last_cloud_sync_at,
  };
}

function getConfiguredClientType(): WaymarkClientType {
  return getEnvValue("WAYMARK_CLIENT_TYPE") === "lite" ? "lite" : "main";
}

export function getConfiguredApplicationId(clientType = getConfiguredClientType()): string {
  const explicit = getEnvValue("EXPO_PUBLIC_WAYMARK_APPLICATION_ID") ?? getEnvValue("WAYMARK_APPLICATION_ID");
  if (explicit) return explicit;
  if (clientType === "lite") return "com.waymark.lifeos.lite";
  const variant = getEnvValue("EXPO_PUBLIC_WAYMARK_APP_VARIANT");
  if (variant === "dev" || (variant == null && typeof __DEV__ !== "undefined" && __DEV__)) {
    return "com.waymark.lifeos.dev";
  }
  return "com.waymark.lifeos";
}

function getConfiguredVaultId(): string {
  return getEnvValue("WAYMARK_VAULT_ID") ?? DEFAULT_TURSO_VAULT_ID;
}

function getConfiguredDeviceId(): string | null {
  return getEnvValue("WAYMARK_DEVICE_ID");
}

function isCloudRestoreConfigured(): boolean {
  return (
    getEnvValue("WAYMARK_SYNC_ENABLED") === "true" &&
    Boolean(getEnvValue("WAYMARK_VAULT_ID")) &&
    Boolean(getEnvValue("TURSO_DATABASE_URL")) &&
    Boolean(getEnvValue("TURSO_AUTH_TOKEN"))
  );
}

function getEnvValue(key: string): string | null {
  const env =
    typeof process !== "undefined" && process.env ?
      (process.env as Record<string, string | undefined>)
    : {};
  const value = env[key];
  return value && value.trim().length > 0 ? value.trim() : null;
}

function generateStableLocalId(prefix: string, now: number): string {
  return `${prefix}_${now.toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
