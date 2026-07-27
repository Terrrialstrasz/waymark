import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Share } from "react-native";
import { refreshAsync } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import { getGoogleDriveMediaOAuthConfig } from "./googleDriveMediaConfig";
import { GoogleDriveAdapter } from "./googleDriveAdapter";
import {
  setGoogleDriveMediaSessionAccessToken,
  setGoogleDriveMediaSessionAccessTokenProvider,
  setGoogleDriveMediaSessionDebugLogger,
} from "./googleDriveMediaSession";
import {
  clearStoredGoogleDriveAuth,
  isStoredGoogleDriveAuthFresh,
  loadStoredGoogleDriveAuth,
  saveGoogleDriveAuth,
  type StoredGoogleDriveAuth,
} from "./googleDriveAuthStorage";
import { getCurrentRuntimeLocalDate } from "./runtimeLifecycle";
import { listDailyMediaUploadCatchUpDates, runDailyMediaUpload, type DailyUploadResult } from "./dailyMediaUploadService";
import { useWaymarkApp } from "./WaymarkAppProvider";
import type { Locale } from "../types/ui";

WebBrowser.maybeCompleteAuthSession();

type DriveDevUploadStatus =
  | "idle"
  | "restoring"
  | "authenticating"
  | "connected"
  | "uploading"
  | "success"
  | "reconnect_required"
  | "temporary_error"
  | "error";

type GoogleDriveDebugLogEntry = {
  id: number;
  at: string;
  event: string;
  payload?: Record<string, unknown>;
};

const MAX_DEBUG_LOG_ENTRIES = 1000;

export function useGoogleDriveDevUpload(locale: Locale) {
  const app = useWaymarkApp();
  const oauthConfig = useMemo(() => getGoogleDriveMediaOAuthConfig(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<DriveDevUploadStatus>("restoring");
  const [hasRefreshToken, setHasRefreshToken] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<DailyUploadResult | null>(null);
  const [debugLog, setDebugLog] = useState<GoogleDriveDebugLogEntry[]>([]);
  const authRef = useRef<StoredGoogleDriveAuth | null>(null);
  const refreshInFlightRef = useRef<Promise<StoredGoogleDriveAuth | null> | null>(null);
  const oauthExtraParams = useMemo(
    () => ({
      access_type: "offline",
      include_granted_scopes: "true",
      ...(hasRefreshToken ? {} : { prompt: "consent" }),
    }),
    [hasRefreshToken],
  );

  const appendDebugLog = useCallback((event: string, payload?: Record<string, unknown>) => {
    const entry = {
      id: Date.now(),
      at: new Date().toISOString(),
      event,
      payload: sanitizeDebugPayload(payload),
    };
    console.log("[Waymark Google Drive]", entry);
    setDebugLog((current) => [...current.slice(-(MAX_DEBUG_LOG_ENTRIES - 1)), entry]);
  }, []);

  useEffect(() => {
    setGoogleDriveMediaSessionDebugLogger(appendDebugLog);
    return () => {
      setGoogleDriveMediaSessionDebugLogger(null);
    };
  }, [appendDebugLog]);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: oauthConfig.androidClientId,
    extraParams: oauthExtraParams,
    scopes: [oauthConfig.scope],
  });

  const applyGoogleDriveAuth = useCallback(
    async (auth: StoredGoogleDriveAuth, source: "oauth" | "secure_store" | "refresh") => {
      authRef.current = auth;
      setGoogleDriveMediaSessionAccessToken(auth.accessToken);
      setAccessToken(auth.accessToken);
      setHasRefreshToken(Boolean(auth.refreshToken));
      setStatus("connected");
      setLastMessage(
        source === "secure_store"
          ? locale === "vi"
            ? "Google Drive da duoc khoi phuc tu thiet bi."
            : "Google Drive was restored from this device."
          : locale === "vi"
            ? "Google Drive da ket noi."
            : "Google Drive is connected.",
      );
      appendDebugLog("oauth_session_connected", {
        expiresAt: auth.expiresAt ? new Date(auth.expiresAt).toISOString() : null,
        hasRefreshToken: Boolean(auth.refreshToken),
        source,
        variant: auth.variant,
      });
      await saveGoogleDriveAuth(auth);
    },
    [appendDebugLog, locale],
  );

  useEffect(() => {
    appendDebugLog("oauth_config", {
      androidClientId: oauthConfig.androidClientId,
      packageName: oauthConfig.packageName,
      scope: oauthConfig.scope,
      variant: oauthConfig.variant,
    });
  }, [appendDebugLog, oauthConfig.androidClientId, oauthConfig.packageName, oauthConfig.scope, oauthConfig.variant]);

  useEffect(() => {
    if (!request) {
      appendDebugLog("oauth_request_not_ready");
      return;
    }

    appendDebugLog("oauth_request_ready", {
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      responseType: request.responseType,
      scopes: request.scopes,
      url: request.url,
    });
  }, [appendDebugLog, request]);

  const refreshStoredGoogleDriveAuth = useCallback(
    async (storedAuth: StoredGoogleDriveAuth): Promise<StoredGoogleDriveAuth | null> => {
      if (!storedAuth.refreshToken) {
        appendDebugLog("oauth_session_reconnect_required", {
          expiresAt: storedAuth.expiresAt ? new Date(storedAuth.expiresAt).toISOString() : null,
          hasRefreshToken: false,
          variant: storedAuth.variant,
        });
        await clearStoredGoogleDriveAuth(oauthConfig.variant).catch(() => undefined);
        authRef.current = null;
        setGoogleDriveMediaSessionAccessToken(null);
        setAccessToken(null);
        setHasRefreshToken(false);
        setStatus("reconnect_required");
        setLastMessage(
          locale === "vi"
            ? "Can dang nhap lai Google Drive mot lan de cap quyen offline."
            : "Sign in to Google Drive once more to enable offline access.",
        );
        return null;
      }

      if (refreshInFlightRef.current) {
        appendDebugLog("oauth_session_refresh_wait", { variant: storedAuth.variant });
        return await refreshInFlightRef.current;
      }

      appendDebugLog("oauth_session_refresh_start", {
        expiresAt: storedAuth.expiresAt ? new Date(storedAuth.expiresAt).toISOString() : null,
        variant: storedAuth.variant,
      });
      const refreshPromise = (async () => {
        try {
          const refreshedAuth = await refreshAsync(
            {
              clientId: oauthConfig.androidClientId,
              refreshToken: storedAuth.refreshToken,
              scopes: [oauthConfig.scope],
            },
            Google.discovery,
          );

          const nextAuth = {
            accessToken: refreshedAuth.accessToken,
            expiresAt: getTokenExpiresAt(refreshedAuth),
            refreshToken: refreshedAuth.refreshToken ?? storedAuth.refreshToken,
            scope: refreshedAuth.scope ?? storedAuth.scope,
            tokenType: refreshedAuth.tokenType ?? storedAuth.tokenType,
            updatedAt: new Date().toISOString(),
            variant: oauthConfig.variant,
          };
          await applyGoogleDriveAuth(nextAuth, "refresh");
          return nextAuth;
        } catch (error) {
          appendDebugLog("oauth_session_refresh_error", {
            message: error instanceof Error ? error.message : String(error),
            variant: storedAuth.variant,
          });

          if (isInvalidGrantError(error)) {
            await clearStoredGoogleDriveAuth(oauthConfig.variant).catch(() => undefined);
            authRef.current = null;
            setGoogleDriveMediaSessionAccessToken(null);
            setAccessToken(null);
            setHasRefreshToken(false);
            setStatus("reconnect_required");
            setLastMessage(
              locale === "vi"
                ? "Google Drive da het quyen hoac bi revoke. Hay dang nhap lai."
                : "Google Drive access expired or was revoked. Please sign in again.",
            );
            return null;
          }

          setStatus("temporary_error");
          setGoogleDriveMediaSessionAccessToken(null);
          setAccessToken(null);
          setHasRefreshToken(Boolean(storedAuth.refreshToken));
          setLastMessage(
            locale === "vi"
              ? "Tam thoi chua refresh duoc Google Drive. Du lieu local van hien thi, media Drive se thu lai sau."
              : "Google Drive could not be refreshed right now. Local data still shows; Drive media will retry later.",
          );
          return null;
        }
      })();

      refreshInFlightRef.current = refreshPromise;
      try {
        return await refreshPromise;
      } finally {
        if (refreshInFlightRef.current === refreshPromise) {
          refreshInFlightRef.current = null;
        }
      }
    },
    [appendDebugLog, applyGoogleDriveAuth, locale, oauthConfig.androidClientId, oauthConfig.scope, oauthConfig.variant],
  );

  const getValidGoogleDriveAccessToken = useCallback(
    async (options?: { forceRefresh?: boolean }): Promise<string | null> => {
      const currentAuth = authRef.current ?? (await loadStoredGoogleDriveAuth(oauthConfig.variant));
      if (!currentAuth) {
        appendDebugLog("oauth_session_restore_missing", { variant: oauthConfig.variant });
        authRef.current = null;
        setGoogleDriveMediaSessionAccessToken(null);
        setAccessToken(null);
        setHasRefreshToken(false);
        setStatus("idle");
        return null;
      }

      authRef.current = currentAuth;
      setHasRefreshToken(Boolean(currentAuth.refreshToken));
      if (!options?.forceRefresh && isStoredGoogleDriveAuthFresh(currentAuth)) {
        await applyGoogleDriveAuth(currentAuth, "secure_store");
        return currentAuth.accessToken;
      }

      setGoogleDriveMediaSessionAccessToken(null);
      setAccessToken(null);
      const refreshedAuth = await refreshStoredGoogleDriveAuth(currentAuth);
      return refreshedAuth?.accessToken ?? null;
    },
    [appendDebugLog, applyGoogleDriveAuth, oauthConfig.variant, refreshStoredGoogleDriveAuth],
  );

  useEffect(() => {
    setGoogleDriveMediaSessionAccessTokenProvider(getValidGoogleDriveAccessToken);
    return () => {
      setGoogleDriveMediaSessionAccessTokenProvider(null);
    };
  }, [getValidGoogleDriveAccessToken]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setStatus("restoring");
      if (!cancelled) {
        await getValidGoogleDriveAccessToken();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getValidGoogleDriveAccessToken]);

  useEffect(() => {
    if (!response) {
      return;
    }

    appendDebugLog("oauth_response", describeAuthResult(response));

    if (response.type === "success" && response.authentication?.accessToken) {
      void applyGoogleDriveAuth(
        {
          accessToken: response.authentication.accessToken,
          expiresAt: getTokenExpiresAt(response.authentication),
          refreshToken: response.authentication.refreshToken ?? authRef.current?.refreshToken,
          scope: response.authentication.scope,
          tokenType: response.authentication.tokenType,
          updatedAt: new Date().toISOString(),
          variant: oauthConfig.variant,
        },
        "oauth",
      );
      return;
    }

    if (response.type === "success") {
      setStatus("authenticating");
      setLastMessage(locale === "vi" ? "Dang hoan tat trao doi token Google." : "Finishing the Google token exchange.");
      return;
    }

    if (response.type === "cancel" || response.type === "dismiss") {
      setStatus(accessToken && authRef.current && isStoredGoogleDriveAuthFresh(authRef.current) ? "connected" : "idle");
      setLastMessage(locale === "vi" ? "Dang nhap Google Drive da bi huy." : "Google Drive sign-in was cancelled.");
      return;
    }

    if (response.type === "error") {
      setStatus("error");
      setLastMessage(response.error?.message ?? response.errorCode ?? "Google Drive sign-in failed.");
    }
  }, [accessToken, appendDebugLog, applyGoogleDriveAuth, locale, oauthConfig.variant, response]);

  const connect = async () => {
    if (!request) {
      setStatus("error");
      setLastMessage(locale === "vi" ? "OAuth request chua san sang." : "OAuth request is not ready yet.");
      appendDebugLog("oauth_connect_blocked_request_not_ready");
      return;
    }

    setStatus("authenticating");
    setLastMessage(locale === "vi" ? "Dang mo Google sign-in." : "Opening Google sign-in.");
    appendDebugLog("oauth_prompt_start", {
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      scopes: request.scopes,
      url: request.url,
    });
    const result = await promptAsync();
    appendDebugLog("oauth_prompt_result", describeAuthResult(result));
  };

  const runPendingUpload = async () => {
    if (!accessToken && !(await getValidGoogleDriveAccessToken())) {
      await connect();
      return;
    }

    const now = new Date();
    const todayLocalDate = getCurrentRuntimeLocalDate(app.user.timezone, now);
    const includeVerifiedMedia = true;
    const actionablePendingDates = await listDailyMediaUploadCatchUpDates(app.repositories, app.user.id, todayLocalDate);
    const repairCandidateDates = await listDailyMediaUploadCatchUpDates(app.repositories, app.user.id, todayLocalDate, { includeVerifiedMedia });
    const uploadQueue =
      actionablePendingDates.length > 0
        ? actionablePendingDates
        : [
            (repairCandidateDates.includes(todayLocalDate) ? todayLocalDate : undefined) ??
              repairCandidateDates[0] ??
              todayLocalDate,
          ];
    appendDebugLog("drive_upload_date_selection", {
      actionablePendingDates,
      includeVerifiedMedia,
      repairCandidateDates,
      selectedLocalDate: uploadQueue[0],
      todayLocalDate,
      uploadQueue,
    });

    if (uploadQueue.length === 1 && uploadQueue[0] === todayLocalDate && actionablePendingDates.length === 0) {
      Alert.alert(
        locale === "vi" ? "Upload media hom nay?" : "Upload today's media?",
        locale === "vi"
          ? "Manual upload se snapshot media pending cua hom nay len Google Drive. Tiep tuc?"
          : "Manual upload will snapshot today's pending media to Google Drive. Continue?",
        [
          { text: locale === "vi" ? "Huy" : "Cancel", style: "cancel" },
          {
            text: locale === "vi" ? "Upload" : "Upload",
            onPress: () => {
              void runUploadQueue(uploadQueue, now);
            },
          },
        ],
      );
      return;
    }

    await runUploadQueue(uploadQueue, now);
  };

  const runUploadQueue = async (localDates: string[], now: Date) => {
    appendDebugLog("drive_upload_queue_start", {
      localDates,
    });

    const results: DailyUploadResult[] = [];
    for (const localDate of localDates) {
      const result = await runUploadForDate(localDate, now);
      if (result) {
        results.push(result);
      }
    }

    if (localDates.length > 1) {
      const totalMedia = results.reduce((sum, result) => sum + result.mediaCount, 0);
      const totalUploaded = results.reduce((sum, result) => sum + result.uploadedCount, 0);
      const totalFailed = results.reduce((sum, result) => sum + result.failedCount, 0);
      const failedDateCount = localDates.length - results.length;
      const hasFailure = failedDateCount > 0 || totalFailed > 0 || results.some((result) => result.status !== "verified");
      setStatus(hasFailure ? "error" : "success");
      setLastMessage(
        locale === "vi"
          ? `Upload ${localDates.length} ngay: ${totalUploaded}/${totalMedia} verified, ${totalFailed} loi, ${failedDateCount} ngay loi.`
          : `Uploaded ${localDates.length} days: ${totalUploaded}/${totalMedia} verified, ${totalFailed} failed, ${failedDateCount} date errors.`,
      );
    }

    appendDebugLog("drive_upload_queue_done", {
      requestedLocalDates: localDates,
      results,
    });
  };

  const runUploadForDate = async (localDate: string, now: Date): Promise<DailyUploadResult | null> => {
    const uploadAccessToken = await getValidGoogleDriveAccessToken();
    if (!uploadAccessToken) {
      setStatus("error");
      setLastMessage(locale === "vi" ? "Google Drive chua ket noi." : "Google Drive is not connected.");
      appendDebugLog("drive_upload_blocked_missing_access_token");
      return null;
    }

    setStatus("uploading");
    setLastResult(null);
    setLastMessage(
      locale === "vi"
        ? `Dang upload media ngay ${localDate} len Google Drive.`
        : `Uploading ${localDate} media to Google Drive.`,
    );

    try {
      await releaseStaleManualUploadLock(localDate);
      const drive = new GoogleDriveAdapter({
        debugLog: ({ event, payload }) => appendDebugLog(event, payload),
        getAccessToken: async (options) => {
          const validAccessToken = await getValidGoogleDriveAccessToken(options);
          if (!validAccessToken) {
            throw new Error("Google Drive is not connected.");
          }
          return validAccessToken;
        },
      });
      const result = await runDailyMediaUpload({
        repositories: app.repositories,
        drive,
        userId: app.user.id,
        timezone: app.user.timezone,
        localDate,
        lockOwner: "waymark-dev-manual-drive-upload",
        now,
        includeVerifiedMedia: true,
      });
      setLastResult(result);
      setStatus(result.status === "verified" ? "success" : "error");
      setLastMessage(
        locale === "vi"
          ? `Upload ${localDate}: ${result.uploadedCount}/${result.mediaCount} verified, ${result.failedCount} loi.`
          : `Upload ${localDate}: ${result.uploadedCount}/${result.mediaCount} verified, ${result.failedCount} failed.`,
      );
      return result;
    } catch (error) {
      setStatus("error");
      appendDebugLog("drive_upload_error", {
        message: error instanceof Error ? error.message : String(error),
      });
      setLastMessage(error instanceof Error ? error.message : "Google Drive upload failed.");
      return null;
    }
  };

  const releaseStaleManualUploadLock = async (localDate: string) => {
    const batch = await app.repositories.dailyMediaUploadBatches.getByUserDate(app.user.id, localDate);
    if (batch?.status !== "uploading" || batch.lockOwner !== "waymark-dev-manual-drive-upload") {
      return;
    }

    appendDebugLog("drive_upload_manual_lock_reset", {
      batchId: batch.id,
      localDate,
      lockAcquiredAt: batch.lockAcquiredAt,
      lockExpiresAt: batch.lockExpiresAt,
      lockOwner: batch.lockOwner,
    });

    await app.repositories.dailyMediaUploadBatches.update(batch.id, {
      lockAcquiredAt: null,
      lockExpiresAt: null,
      lockOwner: null,
      status: "retry_pending",
    });
  };

  const checkDebugLog = () => {
    const text = formatDebugLog(debugLog, 10);
    console.log("[Waymark Google Drive debug log]\n", text);
    Alert.alert(
      locale === "vi" ? "Google Drive debug log" : "Google Drive debug log",
      text || (locale === "vi" ? "Chua co log Google Drive." : "No Google Drive log yet."),
    );
  };

  const recordOAuthCallbackUrl = useCallback(
    (url: string) => {
      appendDebugLog("oauth_deep_link_callback", describeCallbackUrl(url));
    },
    [appendDebugLog],
  );

  const recordDebugEvent = useCallback(
    (event: string, payload?: Record<string, unknown>) => {
      appendDebugLog(event, payload);
    },
    [appendDebugLog],
  );

  const resetDebugSession = () => {
    authRef.current = null;
    setGoogleDriveMediaSessionAccessToken(null);
    setAccessToken(null);
    setHasRefreshToken(false);
    setStatus("idle");
    setLastMessage(null);
    setLastResult(null);
    void clearStoredGoogleDriveAuth(oauthConfig.variant).catch((error) => {
      console.warn("[Waymark Google Drive] Failed to clear stored auth.", error);
    });
    const entry = {
      id: Date.now(),
      at: new Date().toISOString(),
      event: "debug_session_reset",
      payload: {
        clientId: oauthConfig.androidClientId,
        redirectUri: request?.redirectUri ?? "loading",
      },
    };
    console.log("[Waymark Google Drive]", entry);
    setDebugLog([entry]);
  };

  const resetDriveMediaForJulyTest = async () => {
    const targetDates = ["2026-07-09", "2026-07-10"];
    let resetCount = 0;
    const resetAssetIds: string[] = [];

    try {
      for (const localDate of targetDates) {
        const assets = await app.repositories.media.listPendingEodUpload(app.user.id, localDate, { includeVerified: true });
        const imageAssets = assets.filter((asset) => asset.kind === "image");
        for (const asset of imageAssets) {
          await app.repositories.media.updateMediaAsset(asset.id, {
            driveFileId: null,
            driveFolderId: null,
            driveRootFolderId: null,
            driveWebViewLink: null,
            driveWebContentLink: null,
            driveMimeType: null,
            driveSizeBytes: null,
            driveMd5Checksum: null,
            thumbnailDriveFileId: null,
            uploadedAt: null,
            lastSyncError: null,
            uploadStatus: "retry_pending",
          });
          resetCount += 1;
          resetAssetIds.push(asset.id);
        }

        const batch = await app.repositories.dailyMediaUploadBatches.getByUserDate(app.user.id, localDate);
        if (batch) {
          await app.repositories.dailyMediaUploadBatches.update(batch.id, {
            failedCount: 0,
            lastError: null,
            lockAcquiredAt: null,
            lockExpiresAt: null,
            lockOwner: null,
            status: "retry_pending",
          });
        }
      }

      appendDebugLog("drive_media_july_test_reset", {
        resetAssetIds,
        resetCount,
        targetDates,
      });
      setLastMessage(
        locale === "vi"
          ? `Da reset ${resetCount} anh Drive cho ngay 09/10-07.`
          : `Reset ${resetCount} Drive images for July 09/10.`,
      );
      Alert.alert(
        locale === "vi" ? "Da reset Drive media" : "Drive media reset",
        locale === "vi"
          ? `Da xoa metadata Drive cua ${resetCount} anh ngay 2026-07-09 va 2026-07-10. Hay chay upload lai.`
          : `Cleared Drive metadata for ${resetCount} images on 2026-07-09 and 2026-07-10. Run upload again.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendDebugLog("drive_media_july_test_reset_error", { message, targetDates });
      setStatus("error");
      setLastMessage(message);
      Alert.alert(locale === "vi" ? "Reset Drive media loi" : "Drive media reset failed", message);
    }
  };

  const downloadDebugLog = async () => {
    const text = formatDebugLog(debugLog);
    const exportRootDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!exportRootDirectory) {
      Alert.alert(
        locale === "vi" ? "Khong tao duoc log file" : "Unable to create log file",
        locale === "vi" ? "Thiet bi khong co thu muc tam kha dung." : "No writable temporary directory is available.",
      );
      return;
    }

    const exportDirectoryUri = `${exportRootDirectory}waymark/google-drive-debug-log`;
    await FileSystem.makeDirectoryAsync(exportDirectoryUri, { intermediates: true });
    const fileUri = `${exportDirectoryUri}/waymark-google-drive-log-${buildDebugLogFileStamp()}.txt`;
    await FileSystem.writeAsStringAsync(fileUri, text);

    appendDebugLog("debug_log_downloaded", {
      entryCount: debugLog.length,
      fileUri,
      textLength: text.length,
    });

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: locale === "vi" ? "Luu Google Drive log" : "Save Google Drive log",
          mimeType: "text/plain",
          UTI: "public.plain-text",
        });
        return;
      }
    } catch (error) {
      console.warn("[Waymark Google Drive] expo-sharing unavailable, falling back to platform share.", error);
    }

    const shareUri = Platform.OS === "android" ? await FileSystem.getContentUriAsync(fileUri) : fileUri;
    await Share.share({
      message: text,
      title: "Waymark Google Drive log",
      url: shareUri,
    });
  };

  const connected = Boolean(accessToken && authRef.current && isStoredGoogleDriveAuthFresh(authRef.current));

  return {
    accessToken,
    connect,
    connected,
    disabled: status === "restoring" || status === "authenticating" || status === "uploading",
    authDebug: {
      clientId: request?.clientId ?? oauthConfig.androidClientId,
      redirectUri: request?.redirectUri ?? "loading",
      url: request?.url ?? "loading",
    },
    checkDebugLog,
    debugLog,
    debugLogSummary: debugLog.length > 0
      ? `${debugLog.length} entries / last: ${debugLog[debugLog.length - 1]?.event}`
      : locale === "vi"
        ? "Chua co log. Bam ket noi de ghi OAuth request/response."
        : "No log yet. Tap connect to record OAuth request/response.",
    displayClientId: formatClientId(oauthConfig.androidClientId),
    downloadDebugLog,
    lastMessage,
    lastResult,
    oauthConfig,
    recordDebugEvent,
    recordOAuthCallbackUrl,
    resetDriveMediaForJulyTest,
    resetDebugSession,
    runPendingUpload,
    status,
  };
}

function formatClientId(clientId: string) {
  if (clientId.length <= 18) {
    return clientId;
  }
  return `${clientId.slice(0, 10)}...${clientId.slice(-16)}`;
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

function getTokenExpiresAt(token: { expiresIn?: number; issuedAt?: number }) {
  if (!token.expiresIn) {
    return undefined;
  }
  const issuedAtMs = (token.issuedAt ?? Math.floor(Date.now() / 1000)) * 1000;
  return issuedAtMs + token.expiresIn * 1000;
}

function isInvalidGrantError(error: unknown) {
  const text = error instanceof Error ? error.message : JSON.stringify(error);
  return /invalid_grant|invalid token|token has been expired or revoked/i.test(text ?? "");
}

function sanitizeDebugPayload(payload?: Record<string, unknown>) {
  if (!payload) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(payload, (_key, value) => {
    if (typeof value !== "string") {
      return value;
    }
    return value
      .replace(/(access_token|refresh_token|id_token|code)=([^&]+)/g, "$1=[redacted]")
      .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]");
  })) as Record<string, unknown>;
}

function describeAuthResult(result: unknown) {
  const authResult = result as {
    authentication?: {
      accessToken?: string;
      expiresIn?: number;
      issuedAt?: number;
      refreshToken?: string;
      scope?: string;
      tokenType?: string;
    };
    error?: {
      code?: string;
      message?: string;
      params?: Record<string, string>;
    };
    errorCode?: string;
    params?: Record<string, string>;
    type?: string;
    url?: string;
  };

  return {
    authentication: authResult.authentication
      ? {
          accessToken: authResult.authentication.accessToken ? "[present]" : undefined,
          expiresIn: authResult.authentication.expiresIn,
          issuedAt: authResult.authentication.issuedAt,
          refreshToken: authResult.authentication.refreshToken ? "[present]" : undefined,
          scope: authResult.authentication.scope,
          tokenType: authResult.authentication.tokenType,
        }
      : undefined,
    error: authResult.error
      ? {
          code: authResult.error.code,
          message: authResult.error.message,
          params: authResult.error.params ? sanitizeDebugPayload(authResult.error.params) : undefined,
        }
      : undefined,
    errorCode: authResult.errorCode,
    params: authResult.params ? sanitizeDebugPayload(authResult.params) : undefined,
    type: authResult.type,
    url: authResult.url ? sanitizeDebugPayload({ url: authResult.url })?.url : undefined,
  };
}

function describeCallbackUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      hash: sanitizeDebugPayload({ hash: parsed.hash })?.hash,
      host: parsed.host,
      params: sanitizeDebugPayload(Object.fromEntries(parsed.searchParams.entries())),
      pathname: parsed.pathname,
      protocol: parsed.protocol,
      url: sanitizeDebugPayload({ url })?.url,
    };
  } catch {
    return { url: sanitizeDebugPayload({ url })?.url };
  }
}

function formatDebugLog(entries: GoogleDriveDebugLogEntry[], limit = entries.length) {
  return entries
    .slice(-limit)
    .map((entry) => {
      const payload = entry.payload ? `\n${JSON.stringify(entry.payload, null, 2)}` : "";
      return `${entry.at} ${entry.event}${payload}`;
    })
    .join("\n\n");
}
