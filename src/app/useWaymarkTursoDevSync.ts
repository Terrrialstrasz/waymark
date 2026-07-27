import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Platform, Share } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getWaymarkDatabaseAsync } from "../db";
import {
  WaymarkTursoRemoteAdapter,
  applyTursoInboundChangesToLocalSqlite,
  createWaymarkTursoClient,
  enqueueAllWaymarkTablesForTursoUpload,
  listSyncOutboxRowsForDevice,
  pullTypedPlanningWeekPlansFromTurso,
  uploadHierarchyProjectionToTurso,
  uploadTypedWeekPlanItemsToTurso,
  uploadTypedWeekPlansToTurso,
  uploadWaymarkOutboxToTurso,
  type SyncOutboxDrainTrigger,
  type WaymarkTursoUploadResult,
} from "../lib/waymark";
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
};

type UploadAllTablesResult = {
  scanned: number;
  enqueued: number;
  attempted: number;
  uploaded: number;
  failed: number;
  batches: number;
};

type UploadTypedWeekPlansResult = {
  scanned: number;
  uploaded: number;
  duplicates: number;
  failed: number;
  stoppedAfterTransientFailure: boolean;
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
};

type TursoDebugLogEntry = {
  id: number;
  at: string;
  event: string;
  payload?: Record<string, unknown>;
};

const MAX_TURSO_DEBUG_LOG_ENTRIES = 1000;
const TURSO_LINK_STORAGE_KEY = "waymark.turso.link.v1";

export function useWaymarkTursoDevSync(locale: Locale) {
  const envConfig = useMemo(() => getTursoRuntimeConfig(), []);
  const [storedConfig, setStoredConfig] = useState<TursoRuntimeConfig | null>(null);
  const config = storedConfig ?? envConfig;
  const [status, setStatus] = useState<TursoDevSyncStatus>("idle");
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<TursoDebugLogEntry[]>([]);

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
          setLastMessage(locale === "vi" ? "Turso da duoc link tu SecureStore." : "Turso is linked from SecureStore.");
          appendDebugLog("turso_link_restore_success", {
            url: maskTursoUrl(linked.url),
            hasAuthToken: Boolean(linked.authToken),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setLastMessage(formatError(error));
          appendDebugLog("turso_link_restore_error", { message: formatError(error) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appendDebugLog, locale]);

  const linkTurso = useCallback(
    async (input: TursoRuntimeConfig) => {
      const nextConfig = normalizeTursoConfig(input);
      setStatus("uploading");
      setLastMessage(locale === "vi" ? "Dang kiem tra ket noi Turso." : "Checking the Turso connection.");
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
        setLastMessage(locale === "vi" ? "Da link Waymark voi Turso." : "Waymark is linked with Turso.");
        appendDebugLog("turso_link_success", { url: maskTursoUrl(nextConfig.url) });
        return true;
      } catch (error) {
        const message = formatError(error);
        setStatus("error");
        setLastMessage(message);
        appendDebugLog("turso_link_error", { message });
        return false;
      }
    },
    [appendDebugLog, locale],
  );

  const unlinkTurso = useCallback(async () => {
    await SecureStore.deleteItemAsync(TURSO_LINK_STORAGE_KEY);
    setStoredConfig(null);
    setStatus("idle");
    setLastMessage(locale === "vi" ? "Da bo link Turso tren thiet bi nay." : "Turso was unlinked on this device.");
    appendDebugLog("turso_unlink_success");
  }, [appendDebugLog, locale]);

  const runUpload = useCallback(
    async (trigger: SyncOutboxDrainTrigger) => {
      if (!config) {
        setStatus("error");
        setLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
        appendDebugLog("turso_upload_blocked_missing_config", { trigger });
        return null;
      }

      setStatus("uploading");
      setLastMessage(locale === "vi" ? "Dang day outbox len Turso." : "Uploading outbox to Turso.");
      appendDebugLog("turso_upload_start", {
        trigger,
        url: maskTursoUrl(config.url),
      });
      try {
        const db = await getWaymarkDatabaseAsync();
        const metadata = await readCurrentMetadata(db);
        const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
        await adapter.ensureSchema();
        const result = await uploadWaymarkOutboxToTurso({
          executor: db,
          adapter,
          vaultId: metadata.vault_id,
          trigger,
          limit: 100,
          maxPushAttempts: 2,
          retryDelayMs: 750,
          stopOnTransientFailure: true,
        });
        appendDebugLog("turso_upload_result", describeUploadResult(result));
        await markCloudSyncAttempt(db, metadata, result.failed.length === 0);
        setStatus(result.failed.length > 0 ? "error" : "success");
        setLastMessage(
          locale === "vi"
            ? `${trigger}: da day ${result.uploaded.length}/${result.attempted}, loi ${result.failed.length}.`
            : `${trigger}: uploaded ${result.uploaded.length}/${result.attempted}, failed ${result.failed.length}.`,
        );
        return result;
      } catch (error) {
        const message = formatError(error);
        setStatus("error");
        setLastMessage(message);
        appendDebugLog("turso_upload_error", { message, trigger });
        return null;
      }
    },
    [appendDebugLog, config, locale],
  );

  const pullRemoteEdits = useCallback(async () => {
    if (!config) {
      setStatus("error");
      setLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_pull_blocked_missing_config");
      return null;
    }

    setStatus("pulling");
    setLastMessage(locale === "vi" ? "Dang keo remote edits tu Turso." : "Pulling remote edits from Turso.");
    appendDebugLog("turso_pull_start", { url: maskTursoUrl(config.url) });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const syncState = await db.getFirstAsync<SyncStateRow>(
        "SELECT last_cloud_revision FROM sync_state WHERE vault_id = ? AND device_id = ? LIMIT 1;",
        metadata.vault_id,
        metadata.device_id,
      );
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      await adapter.ensureSchema();
      const changes = await adapter.listChangesSince({
        vaultId: metadata.vault_id,
        afterRemoteRevision: syncState?.last_cloud_revision ?? 0,
        entityTypes: ["week_plan", "week_plan_item", "signal"],
        limit: 100,
      });
      const applyResults = await applyTursoInboundChangesToLocalSqlite(db as any, changes);
      const maxRevision = changes.reduce((max, record) => Math.max(max, record.remoteRevision), syncState?.last_cloud_revision ?? 0);
      await db.runAsync(
        `UPDATE sync_state
         SET last_cloud_revision = ?, last_successful_sync_at = ?, protection_status = 'protected'
         WHERE vault_id = ? AND device_id = ?;`,
        maxRevision,
        Date.now(),
        metadata.vault_id,
        metadata.device_id,
      );
      await markCloudSyncAttempt(db, metadata, true);
      const applied = applyResults.filter((result) => result.status === "applied").length;
      const conflicts = applyResults.filter((result) => result.status === "conflict").length;
      setStatus(conflicts > 0 ? "error" : "success");
      setLastMessage(
        locale === "vi"
          ? `Da keo ${changes.length} remote changes: applied ${applied}, conflict ${conflicts}.`
          : `Pulled ${changes.length} remote changes: applied ${applied}, conflicts ${conflicts}.`,
      );
      return { changes, applyResults };
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      setLastMessage(message);
      appendDebugLog("turso_pull_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale]);

  const uploadAllTables = useCallback(async (): Promise<UploadAllTablesResult | null> => {
    if (!config) {
      setStatus("error");
      setLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_upload_all_tables_blocked_missing_config");
      return null;
    }

    setStatus("uploading");
    setLastMessage(locale === "vi" ? "Dang snapshot toan bo bang Waymark len outbox." : "Snapshotting all Waymark tables to the outbox.");
    appendDebugLog("turso_upload_all_tables_start", {
      url: maskTursoUrl(config.url),
    });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      await adapter.ensureSchema();
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
      setLastMessage(
        locale === "vi"
          ? `All tables: scan ${result.scanned}, outbox moi ${result.enqueued}, uploaded ${result.uploaded}/${result.attempted}, loi ${result.failed}.`
          : `All tables: scanned ${result.scanned}, new outbox ${result.enqueued}, uploaded ${result.uploaded}/${result.attempted}, failed ${result.failed}.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      setLastMessage(message);
      appendDebugLog("turso_upload_all_tables_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale]);

  const uploadTypedWeekPlans = useCallback(async (): Promise<UploadTypedWeekPlansResult | null> => {
    if (!config) {
      setStatus("error");
      setLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_typed_week_plans_upload_blocked_missing_config");
      return null;
    }

    setStatus("uploading");
    setLastMessage(locale === "vi" ? "Dang upload typed week_plans len Turso." : "Uploading typed week_plans to Turso.");
    appendDebugLog("turso_typed_week_plans_upload_start", { url: maskTursoUrl(config.url) });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      await adapter.ensureSchema();
      const upload = await uploadTypedWeekPlansToTurso({
        executor: db,
        adapter,
        vaultId: metadata.vault_id,
        deviceId: metadata.device_id,
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
      appendDebugLog("turso_typed_week_plans_upload_result", {
        ...result,
        failedRows: upload.failed,
        mutations: upload.mutations.slice(0, 20),
      });
      await markCloudSyncAttempt(db, metadata, upload.failed.length === 0);
      setStatus(upload.failed.length > 0 ? "error" : "success");
      setLastMessage(
        locale === "vi"
          ? `Typed week_plans: scanned ${result.scanned}, uploaded ${result.uploaded}, duplicate ${result.duplicates}, loi ${result.failed}${result.stoppedAfterTransientFailure ? ", da dung som do loi ket noi" : ""}.`
          : `Typed week_plans: scanned ${result.scanned}, uploaded ${result.uploaded}, duplicates ${result.duplicates}, failed ${result.failed}${result.stoppedAfterTransientFailure ? ", stopped after a transient connection error" : ""}.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      setLastMessage(message);
      appendDebugLog("turso_typed_week_plans_upload_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale]);

  const uploadTypedWeekPlanItems = useCallback(async (): Promise<UploadTypedWeekPlansResult | null> => {
    if (!config) {
      setStatus("error");
      setLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_typed_week_plan_items_upload_blocked_missing_config");
      return null;
    }

    setStatus("uploading");
    setLastMessage(locale === "vi" ? "Dang upload typed week_plan_items len Turso." : "Uploading typed week_plan_items to Turso.");
    appendDebugLog("turso_typed_week_plan_items_upload_start", { url: maskTursoUrl(config.url) });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      await adapter.ensureSchema();
      const upload = await uploadTypedWeekPlanItemsToTurso({
        executor: db,
        adapter,
        vaultId: metadata.vault_id,
        deviceId: metadata.device_id,
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
      appendDebugLog("turso_typed_week_plan_items_upload_result", {
        ...result,
        failedRows: upload.failed,
        mutations: upload.mutations.slice(0, 20),
      });
      await markCloudSyncAttempt(db, metadata, upload.failed.length === 0);
      setStatus(upload.failed.length > 0 ? "error" : "success");
      setLastMessage(
        locale === "vi"
          ? `Typed week_plan_items: scanned ${result.scanned}, uploaded ${result.uploaded}, duplicate ${result.duplicates}, loi ${result.failed}${result.stoppedAfterTransientFailure ? ", da dung som do loi ket noi" : ""}.`
          : `Typed week_plan_items: scanned ${result.scanned}, uploaded ${result.uploaded}, duplicates ${result.duplicates}, failed ${result.failed}${result.stoppedAfterTransientFailure ? ", stopped after a transient connection error" : ""}.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      setLastMessage(message);
      appendDebugLog("turso_typed_week_plan_items_upload_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale]);

  const uploadHierarchyProjection = useCallback(async (): Promise<UploadHierarchyProjectionResult | null> => {
    if (!config) {
      setStatus("error");
      setLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_hierarchy_projection_upload_blocked_missing_config");
      return null;
    }

    setStatus("uploading");
    setLastMessage(
      locale === "vi"
        ? "Dang upload typed paths, expeditions va mark_instances len Turso."
        : "Uploading typed paths, expeditions, and mark_instances to Turso.",
    );
    appendDebugLog("turso_hierarchy_projection_upload_start", { url: maskTursoUrl(config.url) });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      await adapter.ensureSchema();
      const upload = await uploadHierarchyProjectionToTurso({
        executor: db,
        adapter,
        vaultId: metadata.vault_id,
        deviceId: metadata.device_id,
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
      setLastMessage(
        locale === "vi"
          ? `Hierarchy typed: scanned ${result.scanned}, uploaded ${result.uploaded}, duplicate ${result.duplicates}, loi ${result.failed}${result.stoppedAfterTransientFailure ? ", da dung som do loi ket noi" : ""}.`
          : `Hierarchy typed: scanned ${result.scanned}, uploaded ${result.uploaded}, duplicates ${result.duplicates}, failed ${result.failed}${result.stoppedAfterTransientFailure ? ", stopped after a transient connection error" : ""}.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      setLastMessage(message);
      appendDebugLog("turso_hierarchy_projection_upload_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale]);

  const pullTypedWeekPlans = useCallback(async (): Promise<PullTypedWeekPlansResult | null> => {
    if (!config) {
      setStatus("error");
      setLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_typed_week_plans_pull_blocked_missing_config");
      return null;
    }

    setStatus("pulling");
    setLastMessage(locale === "vi" ? "Dang pull typed planning tu Turso." : "Pulling typed planning from Turso.");
    appendDebugLog("turso_typed_week_plans_pull_start", { url: maskTursoUrl(config.url) });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      await adapter.ensureSchema();
      const result = await pullTypedPlanningWeekPlansFromTurso({
        executor: db as any,
        adapter,
        vaultId: metadata.vault_id,
        deviceId: metadata.device_id,
      });
      appendDebugLog("turso_typed_week_plans_pull_result", result);
      await markCloudSyncAttempt(db, metadata, true);
      setStatus("success");
      setLastMessage(
        locale === "vi"
          ? `Typed planning pull: fetched ${result.fetched}, applied ${result.applied}, cursor ${result.throughChangeSequence}.`
          : `Typed planning pull: fetched ${result.fetched}, applied ${result.applied}, cursor ${result.throughChangeSequence}.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      setLastMessage(message);
      appendDebugLog("turso_typed_week_plans_pull_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale]);

  const clearDevRemotePushes = useCallback(async () => {
    if (!config) {
      setStatus("error");
      setLastMessage(locale === "vi" ? "Chua cau hinh Turso URL/token." : "Turso URL/token is not configured.");
      appendDebugLog("turso_clear_dev_pushes_blocked_missing_config");
      return null;
    }

    setStatus("clearing");
    setLastMessage(locale === "vi" ? "Dang xoa remote pushes cua dev instance." : "Clearing remote pushes from this dev instance.");
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
      await adapter.ensureSchema();
      const result = await adapter.purgeWaymarkDevData({
        vaultId: metadata.vault_id,
        outboxRows: rows,
      });
      appendDebugLog("turso_clear_dev_pushes_result", {
        localOutboxRows: rows.length,
        ...result,
      });
      setStatus("success");
      setLastMessage(
        locale === "vi"
          ? `Da xoa Waymark Dev tren Turso: ${result.clearedTables?.length ?? 0} bang du lieu cua vault hien tai.`
          : `Cleared Waymark Dev on Turso: ${result.clearedTables?.length ?? 0} current-vault data tables.`,
      );
      return result;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      setLastMessage(message);
      appendDebugLog("turso_clear_dev_pushes_error", { message });
      return null;
    }
  }, [appendDebugLog, config, locale]);

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
    linkTurso,
    lastMessage,
    pullRemoteEdits,
    pullTypedWeekPlans,
    runEodUpload: () => runUpload("eod"),
    runManualUpload: () => runUpload("manual_upload"),
    status,
    unlinkTurso,
    uploadAllTables,
    uploadHierarchyProjection,
    uploadTypedWeekPlanItems,
    uploadTypedWeekPlans,
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

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
