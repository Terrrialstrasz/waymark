import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Share } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getWaymarkDatabaseAsync } from "../db";
import {
  WaymarkTursoRemoteAdapter,
  WaymarkTursoFullDatabaseRemoteAdapter,
  applyTursoInboundChangesToLocalSqlite,
  createWaymarkTursoClient,
  createWaymarkTursoPipelineReadClient,
  pullAllMarkInstancesFromTurso,
  pullAllTrailDaysFromTurso,
  enqueueDirtyWaymarkRowsForEod,
  pushWaymarkFullDatabaseAtEod,
  recoverStaleWaymarkEodRows,
  runWaymarkTursoPull,
  type SyncOutboxDrainTrigger,
} from "../lib/waymark";
import type { Locale } from "../types/ui";
import { recordProductionDiagnostic } from "./productionDiagnostics";

type TursoDevSyncStatus = "idle" | "uploading" | "pulling" | "clearing" | "success" | "error";

type TursoRuntimeConfig = {
  url: string;
  authToken: string;
};

const WAYMARK_DEV_APPLICATION_ID = "com.waymark.lifeos.dev";

type AppDbMetadataRow = {
  db_instance_id: string;
  vault_id: string;
  device_id: string;
  application_id: string;
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
  const uploadInFlightRef = useRef(false);

  const updateLastMessage = useCallback((message: string | null) => {
    lastMessageRef.current = message;
    setLastMessage(message);
  }, []);

  const appendDebugLog = useCallback((event: string, payload?: Record<string, unknown>) => {
    const sanitizedPayload = sanitizeDebugPayload(payload);
    const entry = {
      id: Date.now(),
      at: new Date().toISOString(),
      event,
      payload: sanitizedPayload,
    };
    console.log("[Waymark Turso]", entry);
    void recordProductionDiagnostic({
      category: event.includes("planning") ? "planning_materialization" : "turso_sync",
      name: event,
      severity: event.includes("error") || event.includes("failed") || event.includes("rejected") ? "error" : "info",
      context: sanitizedPayload,
    });
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
      if (uploadInFlightRef.current) {
        appendDebugLog("turso_upload_skipped_in_flight", { trigger });
        return null;
      }
      uploadInFlightRef.current = true;
      const runId = createTursoDiagnosticRunId("upload");
      const appendEodDiagnostic = (event: string, payload: Record<string, unknown>) => {
        appendDebugLog(`turso_full_db_eod_${event}`, { runId, ...payload });
      };
      const appendRemoteDiagnostic = (event: string, payload: Record<string, unknown>) => {
        appendDebugLog(`turso_full_db_${event}`, { runId, ...payload });
      };

      setStatus("uploading");
      updateLastMessage(locale === "vi" ? "Dang day mutation EOD vao Turso Full-DB." : "Pushing EOD mutations into Turso Full-DB.");
      appendDebugLog("turso_upload_start", {
        runId,
        trigger,
        url: maskTursoUrl(config.url),
      });
      try {
        const db = await getWaymarkDatabaseAsync();
        const metadata = await readCurrentMetadata(db);
        const outboxBefore = await readTursoOutboxDiagnostics(db, metadata.vault_id, metadata.application_id);
        const quarantinedLegacy = await db.runAsync(
          `UPDATE sync_outbox
           SET status = 'quarantined',
               error_kind = 'missing_provenance',
               last_error = 'Legacy outbox has no source_application_id; refusing to claim it for the current build.',
               next_attempt_at = NULL,
               updated_at = ?
           WHERE source_application_id IS NULL
             AND device_id = ?
             AND status IN ('pending', 'failed', 'retry_wait');`,
          Date.now(),
          metadata.device_id,
        );
        const recovered = await recoverStaleWaymarkEodRows({
          executor: db,
          vaultId: metadata.vault_id,
          sourceApplicationId: metadata.application_id,
          staleBefore: Date.now() - 10 * 60 * 1000,
        });
        const reconciled = await enqueueDirtyWaymarkRowsForEod({
          executor: db,
          vaultId: metadata.vault_id,
          deviceId: metadata.device_id,
          dbInstanceId: metadata.db_instance_id,
          sourceApplicationId: metadata.application_id,
        });
        const outboxAfterPreflight = await readTursoOutboxDiagnostics(db, metadata.vault_id, metadata.application_id);
        appendDebugLog("turso_full_db_eod_preflight", {
          runId,
          sourceApplicationId: metadata.application_id,
          vaultId: metadata.vault_id,
          deviceId: metadata.device_id,
          dbInstanceId: metadata.db_instance_id,
          quarantinedLegacy: Number(quarantinedLegacy.changes ?? 0),
          recovered,
          ...reconciled,
          outboxBefore,
          outboxAfterPreflight,
        });
        const adapter = new WaymarkTursoFullDatabaseRemoteAdapter(createWaymarkTursoClient(config), {
          diagnosticLog: appendRemoteDiagnostic,
        });
        const schemaState = await adapter.getSchemaState();
        appendDebugLog("turso_full_db_schema_state", { runId, schemaState });
        if (!schemaState || schemaState.migrationMode !== "active") {
          throw new Error("Turso Full-DB migration is not active; legacy projection upload is disabled.");
        }
        const result = {
          attempted: 0,
          uploaded: 0,
          duplicates: 0,
          rejected: 0,
          failed: [] as Array<{ outboxId: string; message: string }>,
          stoppedAfterTransientFailure: false,
        };
        let batches = 0;
        while (batches < 20) {
          const batch = await pushWaymarkFullDatabaseAtEod({
            executor: db,
            adapter,
            vaultId: metadata.vault_id,
            sourceApplicationId: metadata.application_id,
            limit: 500,
            diagnosticLog: appendEodDiagnostic,
          });
          result.attempted += batch.attempted;
          result.uploaded += batch.uploaded;
          result.duplicates += batch.duplicates;
          result.rejected += batch.rejected;
          result.failed.push(...batch.failed);
          result.stoppedAfterTransientFailure ||= batch.stoppedAfterTransientFailure;
          batches += 1;
          if (batch.attempted === 0 || batch.failed.length > 0 || batch.stoppedAfterTransientFailure) break;
        }
        const outboxAfterUpload = await readTursoOutboxDiagnostics(db, metadata.vault_id, metadata.application_id);
        appendDebugLog("turso_full_db_eod_upload_result", {
          runId,
          sourceApplicationId: metadata.application_id,
          batches,
          attempted: result.attempted,
          uploaded: result.uploaded,
          duplicates: result.duplicates,
          rejected: result.rejected,
          stoppedAfterTransientFailure: result.stoppedAfterTransientFailure,
          failedCount: result.failed.length,
          failedByMessage: countFailuresByMessage(result.failed),
          failedSample: result.failed.slice(0, 20),
          outboxAfterUpload,
        });
        const failed = result.failed.length;
        await markCloudSyncAttempt(db, metadata, result.attempted > 0 && failed === 0 && result.rejected === 0);
        setStatus(failed > 0 || result.rejected > 0 ? "error" : "success");
        updateLastMessage(
          result.attempted === 0
            ? locale === "vi" ? "EOD Full-DB: khong co thay doi can day." : "EOD Full-DB: no changes to push."
            : locale === "vi"
            ? `EOD Full-DB: ${result.uploaded}/${result.attempted} mutation, ${result.duplicates} trung lap, ${result.rejected} bi ownership tu choi, ${failed} loi.`
            : `EOD Full-DB: ${result.uploaded}/${result.attempted} mutations, ${result.duplicates} duplicates, ${result.rejected} rejected by ownership, ${failed} failed.`,
        );
        return result;
      } catch (error) {
        const message = formatError(error);
        setStatus("error");
        updateLastMessage(message);
        appendDebugLog("turso_upload_error", { runId, message, trigger, ...describeTursoError(error) });
        return null;
      } finally {
        uploadInFlightRef.current = false;
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

    const runId = createTursoDiagnosticRunId("pull");
    const appendRemoteDiagnostic = (event: string, payload: Record<string, unknown>) => {
      appendDebugLog(`turso_full_db_${event}`, { runId, ...payload });
    };
    setStatus("pulling");
    updateLastMessage(locale === "vi" ? "Dang dong bo Turso Full-DB vao cache local." : "Syncing Turso Full-DB into the local cache.");
    appendDebugLog("turso_pull_start", { runId, url: maskTursoUrl(config.url), transport: "pipeline_json" });
    try {
      const db = await getWaymarkDatabaseAsync();
      const metadata = await readCurrentMetadata(db);
      const coordinated = await retryTursoPull(
        async () => {
          const client = createWaymarkTursoPipelineReadClient(config);
          const fullDbAdapter = new WaymarkTursoFullDatabaseRemoteAdapter(client, {
            diagnosticLog: appendRemoteDiagnostic,
          });
          try {
            const coordinated = await runWaymarkTursoPull({
              mode: "full",
              // A full snapshot is intentional here: Turso IDs are canonical, so
              // rows removed or replaced upstream must also disappear locally.
              fullDbMode: "snapshot",
              database: db as any,
              fullDbAdapter,
              planningAdapter: new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config)),
              vaultId: metadata.vault_id,
              deviceId: metadata.device_id,
            });
            appendDebugLog("turso_pull_coordinator_result", {
              runId,
              ...(coordinated as unknown as Record<string, unknown>),
            });
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
          appendDebugLog: (event, payload) => appendDebugLog(event, { runId, ...payload }),
        },
      );
      const pull = coordinated.fullDatabase!;
      await markCloudSyncAttempt(db, metadata, true);
      setStatus("success");
      appendDebugLog("turso_full_db_pull_result", { runId, ...pull });
      const materialized =
        coordinated.planning.materializedWeekPlanItems.created +
        coordinated.planning.materializedWeekPlanItems.updated +
        coordinated.planning.materializedWeekPlanItems.adopted +
        coordinated.localRepair.materializedWeekPlanItems.created +
        coordinated.localRepair.materializedWeekPlanItems.updated +
        coordinated.localRepair.materializedWeekPlanItems.adopted;
      updateLastMessage(
        locale === "vi"
          ? `Full-DB ${pull.mode}: applied ${pull.applied}/${pull.fetched}, revision ${pull.throughGlobalRevision}; planning cursor ${coordinated.planning.throughChangeSequence}, materialized ${materialized} Marks.`
          : `Full-DB ${pull.mode}: applied ${pull.applied}/${pull.fetched}, revision ${pull.throughGlobalRevision}; planning cursor ${coordinated.planning.throughChangeSequence}, materialized ${materialized} Marks.`,
      );
      return coordinated;
    } catch (error) {
      const message = formatError(error);
      setStatus("error");
      updateLastMessage(message);
      appendDebugLog("turso_pull_error", { runId, message, ...describeTursoError(error) });
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
      const adapter = new WaymarkTursoRemoteAdapter(createWaymarkTursoClient(config));
      const coordinated = await retryTursoPull(
        () =>
          runWaymarkTursoPull({
            mode: "hierarchy",
            database: db as any,
            planningAdapter: adapter,
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
      if (metadata.application_id !== WAYMARK_DEV_APPLICATION_ID) {
        throw new Error(
          `Clear Dev is restricted to ${WAYMARK_DEV_APPLICATION_ID}; current application_id is ${metadata.application_id}.`,
        );
      }
      const adapter = new WaymarkTursoFullDatabaseRemoteAdapter(createWaymarkTursoClient(config));
      const preview = await adapter.previewApplicationCleanup({
        vaultId: metadata.vault_id,
        applicationId: WAYMARK_DEV_APPLICATION_ID,
        limit: 5000,
      });
      appendDebugLog("turso_clear_dev_pushes_preview", {
        sourceApplicationId: metadata.application_id,
        candidates: preview.length,
        sample: preview.slice(0, 20),
      });
      const result = await adapter.cleanupApplicationMutations({
        vaultId: metadata.vault_id,
        applicationId: WAYMARK_DEV_APPLICATION_ID,
        limit: 5000,
      });
      appendDebugLog("turso_clear_dev_pushes_result", {
        ...result,
      });
      setStatus(result.conflicts.length > 0 ? "error" : "success");
      updateLastMessage(
        locale === "vi"
          ? `Da rollback ${result.reverted}/${result.requested} mutation cua ${result.applicationId}; ${result.conflicts.length} xung dot.`
          : `Rolled back ${result.reverted}/${result.requested} mutations from ${result.applicationId}; ${result.conflicts.length} conflicts.`,
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
  };
}

async function readCurrentMetadata(db: {
  getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null>;
}): Promise<AppDbMetadataRow> {
  const metadata = await db.getFirstAsync<AppDbMetadataRow>(
    "SELECT db_instance_id, vault_id, device_id, application_id FROM app_db_metadata ORDER BY created_at ASC LIMIT 1;",
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

async function readTursoOutboxDiagnostics(
  db: {
    getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]>;
  },
  vaultId: string,
  sourceApplicationId: string,
) {
  const rows = await db.getAllAsync<{
    status: string;
    entity_type: string;
    error_kind: string | null;
    row_count: number;
  }>(
    `SELECT status, entity_type, error_kind, COUNT(*) AS row_count
     FROM sync_outbox
     WHERE vault_id = ? AND source_application_id = ?
     GROUP BY status, entity_type, error_kind
     ORDER BY status, entity_type, error_kind;`,
    vaultId,
    sourceApplicationId,
  );
  const result = {
    total: 0,
    byStatus: {} as Record<string, number>,
    byEntityType: {} as Record<string, number>,
    byErrorKind: {} as Record<string, number>,
    statusByEntityType: {} as Record<string, Record<string, number>>,
  };
  for (const row of rows) {
    const count = Number(row.row_count ?? 0);
    const errorKind = row.error_kind ?? "none";
    result.total += count;
    result.byStatus[row.status] = (result.byStatus[row.status] ?? 0) + count;
    result.byEntityType[row.entity_type] = (result.byEntityType[row.entity_type] ?? 0) + count;
    result.byErrorKind[errorKind] = (result.byErrorKind[errorKind] ?? 0) + count;
    result.statusByEntityType[row.status] ??= {};
    result.statusByEntityType[row.status][row.entity_type] =
      (result.statusByEntityType[row.status][row.entity_type] ?? 0) + count;
  }
  return result;
}

function createTursoDiagnosticRunId(kind: string) {
  return `${kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function countFailuresByMessage(rows: ReadonlyArray<{ message: string }>) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const message = row.message.toLowerCase();
    const kind =
      message.includes("unknownhost") || message.includes("resolve host") || message.includes("fetch failed")
        ? "network_dns"
        : message.includes("no cursor response")
          ? "cursor_response_missing"
          : message.includes("unique constraint")
            ? "business_identity_conflict"
            : message.includes("not null constraint") || message.includes("missing required")
              ? "missing_required_field"
              : "other";
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
  return counts;
}

function describeTursoError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { errorMessage: String(error).slice(0, 500) };
  const value = error as Error & { code?: unknown; cause?: unknown };
  const cause = value.cause;
  return {
    errorName: value.name,
    errorCode: value.code == null ? null : String(value.code),
    errorCause:
      cause instanceof Error
        ? { name: cause.name, message: cause.message.slice(0, 500) }
        : cause == null
          ? null
          : String(cause).slice(0, 500),
  };
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
