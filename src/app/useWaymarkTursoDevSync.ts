import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Share } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getWaymarkDatabaseAsync } from "../db";
import { createSQLiteRepositoryProvider } from "../db/adapters/SQLiteRepositories";
import {
  WaymarkTursoRemoteAdapter,
  WaymarkTursoFullDatabaseRemoteAdapter,
  WAYMARK_PROGRESS_PROJECTION_ENTITY_TYPES,
  applyTursoInboundChangesToLocalSqlite,
  createWaymarkTursoClient,
  createWaymarkTursoPipelineReadClient,
  enqueueAllWaymarkTablesForTursoUpload,
  listSyncOutboxRowsForDevice,
  pullAllMarkInstancesFromTurso,
  pullAllTrailDaysFromTurso,
  uploadHierarchyProjectionToTurso,
  uploadWaymarkOutboxToTurso,
  pushWaymarkFullDatabaseAtEod,
  runWaymarkTursoPull,
  type SyncOutboxDrainTrigger,
  type WaymarkTursoUploadResult,
} from "../lib/waymark";
import { WAYMARK_MAP_CONFIG } from "../waymark-map";
import type { Locale } from "../types/ui";

type TursoDevSyncStatus = "idle" | "uploading" | "pulling" | "clearing" | "success" | "error";

type TursoRuntimeConfig = {
  url: string;
  authToken: string;
};

type AppDbMetadataRow = {
  db_instance_id: string;
  vault_id: string;
  device_id: string;
};

type SyncStateRow = {
  last_cloud_revision: number | null;
  protection_status: string;
  full_db_schema_version: number;
};

type UploadAllTablesResult = {
  scanned: number;
  enqueued: number;
  attempted: number;
  uploaded: number;
  failed: number;
  batches: number;
};

type UploadHierarchyProjectionResult = {
  scanned: number;
  uploaded: number;
  duplicates: number;
  failed: number;
  stoppedAfterTransientFailure: boolean;
};

type PullTypedWeekPlansResult = {
  fromChangeSequence: number;
  throughChangeSequence: number;
  fetched: number;
  applied: number;
  skipped: number;
  byEntityType: {
    week_plan: number;
    week_plan_item: number;
    path: number;
    expedition: number;
    milestone: number;
  };
  retiredLocalOnly: {
    path: number;
    expedition: number;
    milestone: number;
  };
  materializedWeekPlanItems: {
    created: number;
    updated: number;
    adopted: number;
    protected: number;
    conflict: number;
    skipped: number;
  };
};

type PullHierarchyProjectionResult = PullTypedWeekPlansResult;

type PullAllMarkInstancesResult = {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  conflicts: number;
  affectedTrailDays: number;
  conflictSamples: Array<{ markId: string; message: string }>;
};

type PullAllTrailDaysResult = {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  conflicts: number;
  conflictSamples: Array<{ trailDayId: string; message: string }>;
};

type TursoDebugLogEntry = {
  id: number;
  at: string;
  event: string;
  payload?: Record<string, unknown>;
};

const MAX_TURSO_DEBUG_LOG_ENTRIES = 1000;
const TURSO_LINK_STORAGE_KEY = "waymark.turso.link.v1";
const TURSO_PULL_MAX_ATTEMPTS = 3;
const TURSO_PULL_RETRY_DELAY_MS = 800;

export function useWaymarkTursoDevSync(locale: Locale) {
  const envConfig = useMemo(() => getTursoRuntimeConfig(), []);
  const [storedConfig, setStoredConfig] = useState<TursoRuntimeConfig | null>(null);
  const config = storedConfig ?? envConfig;
  const [status, setStatus] = useState<TursoDevSyncStatus>("idle");
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const lastMessageRef = useRef<string | null>(null);
  const [debugLog, setDebugLog] = useState<TursoDebugLogEntry[]>([]);

  const updateLastMessage = useCallback((message: string | null) => {
    lastMessageRef.current = message;
    setLastMessage(message);
  }, []);

  const appendDebugLog = useCallback((event: string, payload?: Record<string, unknown>) => {
    const entry = {
      id: Date.now(),
      at: new Date().toISOString(),
      event,
      payload: sanitizeDebugPayload(payload),
    };
    console.log("[Waymark Turso]", entry);
    setDebugLog((current) => [...current.slice(-(MAX_TURSO_DEBUG_LOG_ENTRIES - 1)), entry]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const linked = await loadStoredTursoLink();
        if (!cancelled && linked) {
          setStoredConfig(linked);
          updateLastMessage(locale === "vi" ? "Turso da duoc link tu SecureStore." : "Turso is linked from SecureStore.");
          appendDebugLog("turso_link_restore_success", {
            url: maskTursoUrl(linked.url),
            hasAuthToken: Boolean(linked.authToken),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          updateLastMessage(formatError(error));
          appendDebugLog("turso_link_restore_error", { message: formatError(error) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appendDebugLog, locale, updateLastMessage]);

  const linkTurso = useCallback(
    async (input: TursoRuntimeConfig) => {
      const nextConfig = normalizeTursoConfig(input);
      setStatus("uploading");
      updateLastMessage(locale === "vi" ? "Dang kiem tra ket noi Turso." : "Checking the Turso connection.");
      appendDebugLog("turso_link_start", {
        url: maskTursoUrl(nextConfig.url),
        hasAuthToken: Boolean(nextConfig.authToken),
      });
      try {
        const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(nextConfig));
        await adapter.ensureSchema();
        await SecureStore.setItemAsync(TURSO_LINK_STORAGE_KEY, JSON.stringify(nextConfig));
        setStoredConfig(nextConfig);
        setStatus("success");
        updateLastMessage(locale === "vi" ? "Da link Waymark voi Turso." : "Waymark is linked with Turso.");
        appendDebugLog("turso_link_success", { url: maskTursoUrl(nextConfig.url) });
        return true;
      } catch (error) {
        const message = formatError(error);
        setStatus("error");
        updateLastMessage(message);
        appendDebugLog("turso_link_error", { message });
        return false;
      }
    },
    [appendDebugLog, locale, updateLastMessage],
  );

  const unlinkTurso = useCallback(async () => {
    await SecureStore.deleteItemAsync(TURSO_LINK_STORAGE_KEY);
    setStoredConfig(null);
    setStatus("idle");
    updateLastMessage(locale === "vi" ? "Da bo link Turso tren thiet bi nay." : "Turso was unlinked on this device.");
    appendDebugLog("turso_unlink_success");
  }, [appendDebugLog, locale, updateLastMessage]);

  const runUpload = useCallback(
    async (trigger: SyncOutboxDrainTrigger) => {
      if (trigger !== "eod") {
        setStatus("error");
        updateLastMessage(
          locale === "vi"
            ? "Turso Full-DB chỉ nhận mutation từ Waymark trong EOD sync."
            : "Turso Full-DB accepts Waymark mutations only during EOD sync.",
        );
        appendDebugLog("turso_full_db_upload_rejected_trigger", { trigger });
        return null;
      }
      if (!config) {
        setStatus("error");
        updateLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
        appendDebugLog("turso_upload_blocked_missing_config", { trigger });
        return null;
      }

      setStatus("uploading");
      updateLastMessage(locale === "vi" ? "Dang day mutation EOD vao Turso Full-DB." : "Pushing EOD mutations into Turso Full-DB.");
      appendDebugLog("turso_upload_start", {
        trigger,
        url: maskTursoUrl(config.url),
      });
      try {
        const db = await getWaymarkDatabaseAsync();
        const metadata = await readCurrentMetadata(db);
        const adapter = new WaymarkTursoFullDatabaseRemoteAdapter(createWaymarkTursoClient(config));
        const schemaState = await adapter.getSchemaState();
        if (!schemaState || schemaState.migrationMode !== "active") {
          throw new Error("Turso Full-DB migration is not active; legacy projection upload is disabled.");
        }
        const result = await pushWaymarkFullDatabaseAtEod({
          executor: db,
          adapter,
          vaultId: metadata.vault_id,
          limit: 500,
        });
        appendDebugLog("turso_full_db_eod_upload_result", {
          attempted: result.attempted,
          uploaded: result.uploaded,
          duplicates: result.duplicates,
          rejected: result.rejected,
          failed: result.failed,
        });
        const failed = result.failed.length;
        await markCloudSyncAttempt(db, metadata, failed === 0);
        setStatus(failed > 0 ? "error" : "success");
        updateLastMessage(
          locale === "vi"
            ? `EOD Full-DB: ${result.uploaded}/${result.attempted} mutation, ${result.duplicates} trung lap, ${result.rejected} bi ownership tu choi, ${failed} loi.`
            : `EOD Full-DB: ${result.uploaded}/${result.attempted} mutations, ${result.duplicates} duplicates, ${result.rejected} rejected by ownership, ${failed} failed.`,
        );
        return result;
      } catch (error) {
        const message = formatError(error);
        setStatus("error");
        updateLastMessage(message);
        appendDebugLog("turso_upload_error", { message, trigger });
        return null;
      }
    },
    [appendDebugLog, config, locale, updateLastMessage],
  );

  const pullRemoteEdits = useCallback(async () => {
    if (!config) {
      setStatus("error");
      updateLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_pull_blocked_missing_config");
      return null;
    }

    setStatus("pulling");
    updateLastMessage(locale === "vi" ? "Dang dong bo Turso Full-DB vao cache local." : "Syncing Turso Full-DB into the local cache.");
    appendDebugLog("turso_pull_start", { url: maskTursoUrl(config.url), transport: "pipeline_json" });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const coordinated = await retryTursoPull(
        async () => {
          const syncState = await db.getFirstAsync<SyncStateRow>(
            "SELECT last_cloud_revision, protection_status, full_db_schema_version FROM sync_state WHERE vault_id = ? AND device_id = ? LIMIT 1;",
            metadata.vault_id,
            metadata.device_id,
          );
          const client = createWaymarkTursoPipelineReadClient(config);
          const fullDbAdapter = new WaymarkTursoFullDatabaseRemoteAdapter(client);
          try {
            const coordinated = await runWaymarkTursoPull({
              mode: "full",
              fullDbMode: syncState?.full_db_schema_version === 1 ? "incremental" : "snapshot",
              database: db as any,
              fullDbAdapter,
              planningAdapter: new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config)),
              repositories: createSQLiteRepositoryProvider(),
              mapConfig: WAYMARK_MAP_CONFIG,
              userId: await readCurrentUserId(db),
              vaultId: metadata.vault_id,
              deviceId: metadata.device_id,
            });
            appendDebugLog("turso_pull_coordinator_result", coordinated as unknown as Record<string, unknown>);
            if (!coordinated.fullDatabase) {
              throw new Error("Full-DB coordinator completed without a Full-DB result.");
            }
            return coordinated;
          } finally {
            client.close();
          }
        },
        {
          eventPrefix: "turso_pull",
          appendDebugLog,
        },
      );
      const pull = coordinated.fullDatabase!;
      await markCloudSyncAttempt(db, metadata, true);
      setStatus("success");
      appendDebugLog("turso_full_db_pull_result", pull);
      const materialized =
        coordinated.planning.materializedWeekPlanItems.created +
        coordinated.planning.materializedWeekPlanItems.updated +
        coordinated.planning.materializedWeekPlanItems.adopted +
        coordinated.localRepair.materializedWeekPlanItems.created +
        coordinated.localRepair.materializedWeekPlanItems.updated +
        coordinated.localRepair.materializedWeekPlanItems.adopted;
      updateLastMessage(
        locale === "vi"
          ? `Full-DB ${pull.mode}: applied ${pull.applied}/${pull.fetched}, revision ${pull.throughGlobalRevision}; planning cursor ${coordinated.planning.throughChangeSequence}, materialized ${materialized} Marks; hierarchy reconciled.`
          : `Full-DB ${pull.mode}: applied ${pull.applied}/${pull.fetched}, revision ${pull.throughGlobalRevision}; planning cursor ${coordinated.planning.throughChangeSequence}, materialized ${materialized} Marks; hierarchy reconciled.`,
      );
      return coordinated;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      updateLastMessage(message);
      appendDebugLog("turso_pull_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale, updateLastMessage]);

  const uploadAllTables = useCallback(async (): Promise<UploadAllTablesResult | null> => {
    if (!config) {
      setStatus("error");
      updateLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_upload_all_tables_blocked_missing_config");
      return null;
    }

    setStatus("uploading");
    updateLastMessage(locale === "vi" ? "Dang snapshot toan bo bang Waymark len outbox." : "Snapshotting all Waymark tables to the outbox.");
    appendDebugLog("turso_upload_all_tables_start", {
      url: maskTursoUrl(config.url),
    });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      const bootstrap = await enqueueAllWaymarkTablesForTursoUpload({
        executor: db,
        vaultId: metadata.vault_id,
        deviceId: metadata.device_id,
        dbInstanceId: metadata.db_instance_id,
      });
      appendDebugLog("turso_upload_all_tables_snapshot", {
        enqueued: bootstrap.enqueued,
        scanned: bootstrap.scanned,
        tables: bootstrap.tables,
      });

      let attempted = 0;
      let uploaded = 0;
      let failed = 0;
      let batches = 0;

      while (batches < 100) {
        const batch = await uploadWaymarkOutboxToTurso({
          executor: db,
          adapter,
          vaultId: metadata.vault_id,
          trigger: "manual_upload",
          limit: 100,
          maxPushAttempts: 2,
          retryDelayMs: 750,
          stopOnTransientFailure: true,
        });
        if (batch.attempted === 0) {
          break;
        }
        batches += 1;
        appendDebugLog("turso_upload_all_tables_batch", {
          batch: batches,
          ...describeUploadResult(batch),
        });
        attempted += batch.attempted;
        uploaded += batch.uploaded.length;
        failed += batch.failed.length;
        if (batch.stoppedAfterTransientFailure) {
          break;
        }
        if (batch.failed.length > 0) {
          break;
        }
      }

      await markCloudSyncAttempt(db, metadata, failed === 0);
      const result = {
        scanned: bootstrap.scanned,
        enqueued: bootstrap.enqueued,
        attempted,
        uploaded,
        failed,
        batches,
      };
      appendDebugLog("turso_upload_all_tables_done", result);
      setStatus(failed > 0 ? "error" : "success");
      updateLastMessage(
        locale === "vi"
          ? `All tables: scan ${result.scanned}, outbox moi ${result.enqueued}, uploaded ${result.uploaded}/${result.attempted}, loi ${result.failed}.`
          : `All tables: scanned ${result.scanned}, new outbox ${result.enqueued}, uploaded ${result.uploaded}/${result.attempted}, failed ${result.failed}.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      updateLastMessage(message);
      appendDebugLog("turso_upload_all_tables_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale, updateLastMessage]);

  const uploadHierarchyProjection = useCallback(async (): Promise<UploadHierarchyProjectionResult | null> => {
    if (!config) {
      setStatus("error");
      updateLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_hierarchy_projection_upload_blocked_missing_config");
      return null;
    }

    setStatus("uploading");
    updateLastMessage(
      locale === "vi"
        ? "Dang upload typed expedition, milestone, trail days va marks len Turso."
        : "Uploading typed expeditions, milestones, trail days, and marks to Turso.",
    );
    appendDebugLog("turso_hierarchy_projection_upload_start", { url: maskTursoUrl(config.url) });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      const upload = await uploadHierarchyProjectionToTurso({
        executor: db,
        adapter,
        vaultId: metadata.vault_id,
        deviceId: metadata.device_id,
        entityTypes: WAYMARK_PROGRESS_PROJECTION_ENTITY_TYPES,
        maxPushAttempts: 2,
        retryDelayMs: 750,
        stopOnTransientFailure: true,
      });
      const result = {
        scanned: upload.scanned,
        uploaded: upload.uploaded,
        duplicates: upload.duplicates,
        failed: upload.failed.length,
        stoppedAfterTransientFailure: upload.stoppedAfterTransientFailure,
      };
      appendDebugLog("turso_hierarchy_projection_upload_result", {
        ...result,
        byEntityType: upload.byEntityType,
        failedRows: upload.failed,
        mutations: upload.mutations.slice(0, 20),
      });
      await markCloudSyncAttempt(db, metadata, upload.failed.length === 0);
      setStatus(upload.failed.length > 0 ? "error" : "success");
      updateLastMessage(
        locale === "vi"
          ? `Progress map typed: scanned ${result.scanned}, uploaded ${result.uploaded}, duplicate ${result.duplicates}, expeditions ${upload.byEntityType.expedition.scanned}, milestones ${upload.byEntityType.milestone.scanned}, trail days ${upload.byEntityType.trail_day.scanned}, marks ${upload.byEntityType.mark_instance.scanned}, loi ${result.failed}${result.stoppedAfterTransientFailure ? ", da dung som do loi ket noi" : ""}.`
          : `Progress map typed: scanned ${result.scanned}, uploaded ${result.uploaded}, duplicates ${result.duplicates}, expeditions ${upload.byEntityType.expedition.scanned}, milestones ${upload.byEntityType.milestone.scanned}, trail days ${upload.byEntityType.trail_day.scanned}, marks ${upload.byEntityType.mark_instance.scanned}, failed ${result.failed}${result.stoppedAfterTransientFailure ? ", stopped after a transient connection error" : ""}.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      updateLastMessage(message);
      appendDebugLog("turso_hierarchy_projection_upload_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale, updateLastMessage]);

  const pullTypedWeekPlans = useCallback(async (): Promise<PullTypedWeekPlansResult | null> => {
    if (!config) {
      setStatus("error");
      updateLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_typed_week_plans_pull_blocked_missing_config");
      return null;
    }

    setStatus("pulling");
    updateLastMessage(locale === "vi" ? "Dang pull typed planning tu Turso." : "Pulling typed planning from Turso.");
    appendDebugLog("turso_typed_week_plans_pull_start", { url: maskTursoUrl(config.url) });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      const coordinated = await retryTursoPull(
        () =>
          runWaymarkTursoPull({
            mode: "planning",
            database: db as any,
            planningAdapter: adapter,
            vaultId: metadata.vault_id,
            deviceId: metadata.device_id,
          }),
        {
          eventPrefix: "turso_typed_week_plans_pull",
          appendDebugLog,
        },
      );
      const result = coordinated.planning;
      appendDebugLog("turso_typed_week_plans_coordinator_result", coordinated as unknown as Record<string, unknown>);
      appendDebugLog("turso_typed_week_plans_pull_result", result);
      await markCloudSyncAttempt(db, metadata, true);
      setStatus("success");
      const retiredHierarchyCount =
        result.retiredLocalOnly.path + result.retiredLocalOnly.expedition + result.retiredLocalOnly.milestone;
      updateLastMessage(
        locale === "vi"
          ? `Typed planning pull: fetched ${result.fetched}, applied ${result.applied}, materialized ${result.materializedWeekPlanItems.created + result.materializedWeekPlanItems.updated + result.materializedWeekPlanItems.adopted}, protected ${result.materializedWeekPlanItems.protected}, retired local-only ${retiredHierarchyCount}, cursor ${result.throughChangeSequence}.`
          : `Typed planning pull: fetched ${result.fetched}, applied ${result.applied}, materialized ${result.materializedWeekPlanItems.created + result.materializedWeekPlanItems.updated + result.materializedWeekPlanItems.adopted}, protected ${result.materializedWeekPlanItems.protected}, retired local-only ${retiredHierarchyCount}, cursor ${result.throughChangeSequence}.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      updateLastMessage(message);
      appendDebugLog("turso_typed_week_plans_pull_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale, updateLastMessage]);

  const pullHierarchyProjection = useCallback(async (): Promise<PullHierarchyProjectionResult | null> => {
    if (!config) {
      setStatus("error");
      updateLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_hierarchy_projection_pull_blocked_missing_config");
      return null;
    }

    setStatus("pulling");
    updateLastMessage(
      locale === "vi"
        ? "Dang pull Paths/Expeditions/Milestones tu Turso."
        : "Pulling Paths/Expeditions/Milestones from Turso.",
    );
    appendDebugLog("turso_hierarchy_projection_pull_start", { url: maskTursoUrl(config.url) });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      appendDebugLog("turso_hierarchy_projection_pull_metadata", {
        dbInstanceId: metadata.db_instance_id,
        vaultId: metadata.vault_id,
        deviceId: metadata.device_id,
      });
      const userId = await readCurrentUserId(db);
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      const coordinated = await retryTursoPull(
        () =>
          runWaymarkTursoPull({
            mode: "hierarchy",
            database: db as any,
            planningAdapter: adapter,
            repositories: createSQLiteRepositoryProvider(),
            mapConfig: WAYMARK_MAP_CONFIG,
            userId,
            vaultId: metadata.vault_id,
            deviceId: metadata.device_id,
          }),
        {
          eventPrefix: "turso_hierarchy_projection_pull",
          appendDebugLog,
        },
      );
      const result = coordinated.planning;
      appendDebugLog("turso_hierarchy_projection_coordinator_result", coordinated as unknown as Record<string, unknown>);
      appendDebugLog("turso_hierarchy_projection_pull_result", {
        ...result,
        vaultId: metadata.vault_id,
        deviceId: metadata.device_id,
      });
      await markCloudSyncAttempt(db, metadata, true);
      setStatus("success");
      updateLastMessage(
        locale === "vi"
          ? `Hierarchy pull: paths ${result.byEntityType.path}, expeditions ${result.byEntityType.expedition}, milestones ${result.byEntityType.milestone}; retired local-only paths ${result.retiredLocalOnly.path}, expeditions ${result.retiredLocalOnly.expedition}, milestones ${result.retiredLocalOnly.milestone}; cursor ${result.throughChangeSequence}.`
          : `Hierarchy pull: paths ${result.byEntityType.path}, expeditions ${result.byEntityType.expedition}, milestones ${result.byEntityType.milestone}; retired local-only paths ${result.retiredLocalOnly.path}, expeditions ${result.retiredLocalOnly.expedition}, milestones ${result.retiredLocalOnly.milestone}; cursor ${result.throughChangeSequence}.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      updateLastMessage(message);
      appendDebugLog("turso_hierarchy_projection_pull_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale, updateLastMessage]);

  const pullAllTrailDays = useCallback(async (): Promise<PullAllTrailDaysResult | null> => {
    if (!config) {
      setStatus("error");
      updateLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_trail_days_pull_blocked_missing_config");
      return null;
    }

    setStatus("pulling");
    updateLastMessage(locale === "vi" ? "Dang pull toan bo Trail Days tu Turso." : "Pulling all Trail Days from Turso.");
    appendDebugLog("turso_trail_days_pull_start", { url: maskTursoUrl(config.url) });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      const result = await pullAllTrailDaysFromTurso({
        executor: db as any,
        adapter,
        vaultId: metadata.vault_id,
        deviceId: metadata.device_id,
      });
      appendDebugLog("turso_trail_days_pull_result", result);
      await markCloudSyncAttempt(db, metadata, result.conflicts === 0);
      setStatus(result.conflicts > 0 ? "error" : "success");
      updateLastMessage(
        `Trail Days pull: fetched ${result.fetched}, inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped}, conflicts ${result.conflicts}.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      updateLastMessage(message);
      appendDebugLog("turso_trail_days_pull_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale, updateLastMessage]);

  const pullAllMarkInstances = useCallback(async (): Promise<PullAllMarkInstancesResult | null> => {
    if (!config) {
      setStatus("error");
      updateLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_mark_instances_pull_blocked_missing_config");
      return null;
    }

    setStatus("pulling");
    updateLastMessage(locale === "vi" ? "Dang pull toan bo Marks tu Turso." : "Pulling all Marks from Turso.");
    appendDebugLog("turso_mark_instances_pull_start", { url: maskTursoUrl(config.url) });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      const result = await pullAllMarkInstancesFromTurso({
        executor: db as any,
        adapter,
        vaultId: metadata.vault_id,
        deviceId: metadata.device_id,
      });
      appendDebugLog("turso_mark_instances_pull_result", result);
      await markCloudSyncAttempt(db, metadata, result.conflicts === 0);
      setStatus(result.conflicts > 0 ? "error" : "success");
      updateLastMessage(
        locale === "vi"
          ? `Marks pull: fetched ${result.fetched}, inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped}, conflicts ${result.conflicts}, trail days ${result.affectedTrailDays}.`
          : `Marks pull: fetched ${result.fetched}, inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped}, conflicts ${result.conflicts}, trail days ${result.affectedTrailDays}.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      updateLastMessage(message);
      appendDebugLog("turso_mark_instances_pull_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale, updateLastMessage]);

  const clearDevRemotePushes = useCallback(async () => {
    if (!config) {
      setStatus("error");
      updateLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_clear_dev_pushes_blocked_missing_config");
      return null;
    }

    setStatus("clearing");
    updateLastMessage(locale === "vi" ? "Dang xoa remote pushes cua dev instance." : "Clearing remote pushes from this dev instance.");
    appendDebugLog("turso_clear_dev_pushes_start", { url: maskTursoUrl(config.url) });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const rows = await listSyncOutboxRowsForDevice(db, {
        vaultId: metadata.vault_id,
        deviceId: metadata.device_id,
        limit: 5000,
      });
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      const result = await adapter.purgeWaymarkDevData({
        vaultId: metadata.vault_id,
        outboxRows: rows,
      });
      appendDebugLog("turso_clear_dev_pushes_result", {
        localOutboxRows: rows.length,
        ...result,
      });
      setStatus("success");
      updateLastMessage(
        locale === "vi"
          ? `Da xoa Waymark Dev tren Turso: ${result.clearedTables?.length ?? 0} bang du lieu cua vault hien tai.`
          : `Cleared Waymark Dev on Turso: ${result.clearedTables?.length ?? 0} current-vault data tables.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      updateLastMessage(message);
      appendDebugLog("turso_clear_dev_pushes_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale, updateLastMessage]);

  const downloadDebugLog = useCallback(async () => {
    const text = formatDebugLog(debugLog);
    const exportRootDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!exportRootDirectory) {
      Alert.alert(
        locale === "vi" ? "Khong tao duoc log file" : "Unable to create log file",
        locale === "vi" ? "Thiet bi khong co thu muc tam kha dung." : "No writable temporary directory is available.",
      );
      return;
    }

    const exportDirectoryUri = `${exportRootDirectory}waymark/turso-upload-log`;
    await FileSystem.makeDirectoryAsync(exportDirectoryUri, { intermediates: true });
    const fileUri = `${exportDirectoryUri}/waymark-turso-upload-log-${buildDebugLogFileStamp()}.txt`;
    await FileSystem.writeAsStringAsync(fileUri, text || "No Waymark Turso upload log entries yet.");

    appendDebugLog("turso_debug_log_downloaded", {
      entryCount: debugLog.length,
      fileUri,
      textLength: text.length,
    });

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: locale === "vi" ? "Luu Turso upload log" : "Save Turso upload log",
          mimeType: "text/plain",
          UTI: "public.plain-text",
        });
        return;
      }
    } catch (error) {
      console.warn("[Waymark Turso] expo-sharing unavailable, falling back to platform share.", error);
    }

    const shareUri = Platform.OS === "android" ? await FileSystem.getContentUriAsync(fileUri) : fileUri;
    await Share.share({
      message: text,
      title: "Waymark Turso upload log",
      url: shareUri,
    });
  }, [appendDebugLog, debugLog, locale]);

  return {
    clearDevRemotePushes,
    configSummary: config ? `${config.url.replace(/^libsql:\/\//, "")} / token ${maskToken(config.authToken)}` : null,
    configured: Boolean(config),
    debugLog,
    debugLogSummary:
      debugLog.length > 0
        ? `${debugLog.length} entries / last: ${debugLog[debugLog.length - 1]?.event}`
        : locale === "vi"
          ? "Chua co log Turso. Chay upload de ghi failed rows."
          : "No Turso log yet. Run an upload to capture failed rows.",
    disabled: status === "uploading" || status === "pulling" || status === "clearing",
    downloadDebugLog,
    getLastMessage: () => lastMessageRef.current ?? lastMessage,
    linkTurso,
    lastMessage,
    pullAllTrailDays,
    pullAllMarkInstances,
    pullHierarchyProjection,
    pullRemoteEdits,
    pullTypedWeekPlans,
    runEodUpload: () => runUpload("eod"),
    runManualUpload: () => runUpload("manual_upload"),
    status,
    unlinkTurso,
    uploadAllTables,
    uploadHierarchyProjection,
  };
}

async function readCurrentMetadata(db: {
  getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null>;
}): Promise<AppDbMetadataRow> {
  const metadata = await db.getFirstAsync<AppDbMetadataRow>(
    "SELECT db_instance_id, vault_id, device_id FROM app_db_metadata ORDER BY created_at ASC LIMIT 1;",
  );
  if (!metadata) {
    throw new Error("Waymark app_db_metadata is missing.");
  }
  return metadata;
}

async function readCurrentUserId(db: {
  getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null>;
}): Promise<string> {
  const profile = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM user_profiles WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1;",
  );
  if (!profile) {
    throw new Error("Waymark local user profile is missing.");
  }
  return profile.id;
}

async function markCloudSyncAttempt(
  db: {
    runAsync(source: string, ...params: unknown[]): Promise<unknown>;
  },
  metadata: AppDbMetadataRow,
  success: boolean,
) {
  if (!success) {
    return;
  }
  await db.runAsync("UPDATE app_db_metadata SET last_cloud_sync_at = ? WHERE db_instance_id = ?;", Date.now(), metadata.db_instance_id);
}

function getTursoRuntimeConfig() {
  const url = getEnvValue("TURSO_DATABASE_URL") ?? getEnvValue("EXPO_PUBLIC_TURSO_DATABASE_URL");
  const authToken = getEnvValue("TURSO_AUTH_TOKEN") ?? getEnvValue("EXPO_PUBLIC_TURSO_AUTH_TOKEN");
  return url && authToken ? { url, authToken } : null;
}

async function loadStoredTursoLink(): Promise<TursoRuntimeConfig | null> {
  const rawValue = await SecureStore.getItemAsync(TURSO_LINK_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }
  const parsed = JSON.parse(rawValue) as Partial<TursoRuntimeConfig>;
  if (!parsed.url || !parsed.authToken) {
    await SecureStore.deleteItemAsync(TURSO_LINK_STORAGE_KEY);
    return null;
  }
  return normalizeTursoConfig({
    url: parsed.url,
    authToken: parsed.authToken,
  });
}

function normalizeTursoConfig(input: TursoRuntimeConfig): TursoRuntimeConfig {
  const url = input.url.trim();
  const authToken = input.authToken.trim();
  if (!url || !authToken) {
    throw new Error("Turso URL and auth token are required.");
  }
  if (!/^libsql:\/\//i.test(url) && !/^https:\/\//i.test(url)) {
    throw new Error("Turso URL must start with libsql:// or https://.");
  }
  return { url, authToken };
}

function maskToken(token: string) {
  if (token.length <= 12) {
    return "[saved]";
  }
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function maskTursoUrl(url: string) {
  return url.replace(/^libsql:\/\//, "").replace(/^https:\/\//, "");
}

function describeUploadResult(result: WaymarkTursoUploadResult): Record<string, unknown> {
  return {
    attempted: result.attempted,
    duplicateCount: result.uploaded.filter((row) => row.duplicate).length,
    failed: result.failed,
    failedCount: result.failed.length,
    skippedCount: result.skipped.length,
    skippedSample: result.skipped.slice(0, 20),
    stoppedAfterTransientFailure: result.stoppedAfterTransientFailure,
    trigger: result.trigger,
    uploadedCount: result.uploaded.length,
    uploadedSample: result.uploaded.slice(0, 10),
  };
}

function buildDebugLogFileStamp() {
  const now = new Date();
  const year = now.getFullYear().toString().padStart(4, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function sanitizeDebugPayload(payload?: Record<string, unknown>) {
  if (!payload) {
    return undefined;
  }
  return JSON.parse(
    JSON.stringify(payload, (_key, value) => {
      if (typeof value !== "string") {
        return value;
      }
      return value
        .replace(/access_token=([^&]+)/g, "access_token=[redacted]")
        .replace(/authToken["']?\s*[:=]\s*["']?[^"',\s}]+/gi, "authToken=[redacted]")
        .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
        .replace(/eyJ[A-Za-z0-9._-]+/g, "[jwt-redacted]");
    }),
  ) as Record<string, unknown>;
}

function formatDebugLog(entries: TursoDebugLogEntry[], limit = entries.length) {
  return entries
    .slice(-limit)
    .map((entry) => {
      const payload = entry.payload ? `\n${JSON.stringify(entry.payload, null, 2)}` : "";
      return `${entry.at} ${entry.event}${payload}`;
    })
    .join("\n\n");
}

function getEnvValue(key: string): string | null {
  const env =
    typeof process !== "undefined" && process.env ?
      (process.env as Record<string, string | undefined>)
    : {};
  const value = env[key];
  return value && value.trim().length > 0 ? value.trim() : null;
}

async function retryTursoPull<T>(
  task: () => Promise<T>,
  options: {
    eventPrefix: string;
    appendDebugLog(event: string, payload?: Record<string, unknown>): void;
  },
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= TURSO_PULL_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      const message = formatError(error);
      if (attempt >= TURSO_PULL_MAX_ATTEMPTS || !isTransientTursoPullError(error)) {
        break;
      }

      const delayMs = TURSO_PULL_RETRY_DELAY_MS * attempt;
      options.appendDebugLog(`${options.eventPrefix}_retry`, {
        attempt,
        maxAttempts: TURSO_PULL_MAX_ATTEMPTS,
        delayMs,
        message,
      });
      await delay(delayMs);
    }
  }

  throw lastError;
}

function isTransientTursoPullError(error: unknown): boolean {
  const message = formatError(error).toLowerCase();
  return (
    message.length === 0 ||
    message.includes("http error! status: 502") ||
    message.includes("http error! status: 503") ||
    message.includes("http error! status: 504") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("no cursor response received") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("connection") ||
    message.includes("expected numeric turso value")
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim() || error.name || "Unknown Turso error.";
  }
  const message = String(error).trim();
  return message || "Unknown Turso error.";
}
