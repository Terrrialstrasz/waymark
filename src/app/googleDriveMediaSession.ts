import * as FileSystem from "expo-file-system/legacy";

let sessionAccessToken: string | null = null;
let sessionAccessTokenProvider: GoogleDriveMediaSessionAccessTokenProvider | null = null;
let sessionDebugLog: GoogleDriveMediaSessionDebugLogger | null = null;
const inFlightDownloads = new Map<string, Promise<string | undefined>>();

export type GoogleDriveMediaSessionDebugLogger = (event: string, payload?: Record<string, unknown>) => void;
export type GoogleDriveMediaSessionAccessTokenProvider = (options?: { forceRefresh?: boolean }) => Promise<string | null>;

export function setGoogleDriveMediaSessionAccessToken(accessToken: string | null) {
  sessionAccessToken = accessToken;
}

export function getGoogleDriveMediaSessionAccessToken() {
  return sessionAccessToken;
}

export function setGoogleDriveMediaSessionAccessTokenProvider(provider: GoogleDriveMediaSessionAccessTokenProvider | null) {
  sessionAccessTokenProvider = provider;
}

async function getGoogleDriveMediaSessionValidAccessToken(options?: { forceRefresh?: boolean }) {
  if (sessionAccessTokenProvider) {
    const accessToken = await sessionAccessTokenProvider(options);
    sessionAccessToken = accessToken;
    return accessToken;
  }
  return sessionAccessToken;
}

export function setGoogleDriveMediaSessionDebugLogger(debugLog: GoogleDriveMediaSessionDebugLogger | null) {
  sessionDebugLog = debugLog;
}

export async function cacheGoogleDriveMediaFile(input: {
  driveFileId?: string;
  fileName?: string;
  mimeType?: string;
  usage?: string;
}): Promise<string | undefined> {
  if (!input.driveFileId) {
    logDriveMediaCache("drive_media_cache_skipped", {
      driveFileId: input.driveFileId,
      fileName: input.fileName,
      reason: "missing_drive_file_id",
      usage: input.usage,
    });
    return undefined;
  }

  try {
    const cacheRoot = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!cacheRoot) {
      logDriveMediaCache("drive_media_cache_skipped", {
        driveFileId: input.driveFileId,
        fileName: input.fileName,
        reason: "missing_cache_directory",
        usage: input.usage,
      });
      return undefined;
    }

    const directoryUri = `${cacheRoot}waymark/drive-media-cache`;
    await FileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });
    const fileUri = `${directoryUri}/${sanitizeCacheName(input.driveFileId)}${resolveFileExtension(input)}`;
    const cacheKey = fileUri;
    const existing = await FileSystem.getInfoAsync(fileUri);
    if (existing.exists) {
      if (typeof existing.size === "number" && existing.size <= 0) {
        logDriveMediaCache("drive_media_cache_invalid", {
          driveFileId: input.driveFileId,
          fileName: input.fileName,
          fileUri,
          reason: "empty_file",
          size: existing.size,
          usage: input.usage,
        });
        try {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        } catch {
          // Continue to re-download; downloadAsync can overwrite on supported platforms.
        }
      } else {
        logDriveMediaCache("drive_media_cache_hit", {
          driveFileId: input.driveFileId,
          fileName: input.fileName,
          fileUri,
          size: existing.size,
          usage: input.usage,
        });
        return fileUri;
      }
    }

    const accessToken = await getGoogleDriveMediaSessionValidAccessToken();
    if (!accessToken) {
      logDriveMediaCache("drive_media_cache_skipped", {
        driveFileId: input.driveFileId,
        fileName: input.fileName,
        hasAccessToken: false,
        reason: "missing_access_token",
        usage: input.usage,
      });
      return undefined;
    }

    const existingDownload = inFlightDownloads.get(cacheKey);
    if (existingDownload) {
      logDriveMediaCache("drive_media_cache_join_inflight", {
        driveFileId: input.driveFileId,
        fileName: input.fileName,
        fileUri,
        usage: input.usage,
      });
      return existingDownload;
    }

    const download = downloadGoogleDriveMediaFile({
      ...input,
      accessToken,
      directoryUri,
      driveFileId: input.driveFileId,
      fileUri,
    });
    inFlightDownloads.set(cacheKey, download);
    try {
      return await download;
    } finally {
      inFlightDownloads.delete(cacheKey);
    }
  } catch (error) {
    logDriveMediaCache("drive_media_cache_error", {
      driveFileId: input.driveFileId,
      fileName: input.fileName,
      message: error instanceof Error ? error.message : String(error),
      usage: input.usage,
    });
    return undefined;
  }
}

async function downloadGoogleDriveMediaFile(input: {
  accessToken: string;
  directoryUri: string;
  driveFileId: string;
  fileName?: string;
  fileUri: string;
  mimeType?: string;
  usage?: string;
}): Promise<string | undefined> {
  const tempFileUri = `${input.directoryUri}/${sanitizeCacheName(input.driveFileId)}.${Date.now()}.tmp${resolveFileExtension(input)}`;
  try {
    logDriveMediaCache("drive_media_cache_download_start", {
      driveFileId: input.driveFileId,
      fileName: input.fileName,
      fileUri: input.fileUri,
      usage: input.usage,
    });
    const result = await downloadDriveFile(input.driveFileId, tempFileUri, input.accessToken);
    const finalResult =
      result.status === 401
        ? await retryDownloadAfterRefresh(input.driveFileId, tempFileUri, input.fileName, input.usage)
        : result;

    const success = finalResult.status >= 200 && finalResult.status < 300;
    if (!success) {
      await deleteCacheFile(tempFileUri);
      await deleteCacheFile(input.fileUri);
      logDriveMediaCache("drive_media_cache_download_failed", {
        driveFileId: input.driveFileId,
        fileName: input.fileName,
        fileUri: finalResult.uri,
        status: finalResult.status,
        usage: input.usage,
      });
      return undefined;
    }

    const downloaded = await FileSystem.getInfoAsync(finalResult.uri);
    if (!downloaded.exists || (typeof downloaded.size === "number" && downloaded.size <= 0)) {
      await deleteCacheFile(tempFileUri);
      await deleteCacheFile(input.fileUri);
      logDriveMediaCache("drive_media_cache_download_failed", {
        driveFileId: input.driveFileId,
        fileName: input.fileName,
        fileUri: finalResult.uri,
        reason: "empty_file",
        size: downloaded.exists ? downloaded.size : undefined,
        status: finalResult.status,
        usage: input.usage,
      });
      return undefined;
    }

    await deleteCacheFile(input.fileUri);
    await FileSystem.moveAsync({ from: finalResult.uri, to: input.fileUri });
    logDriveMediaCache("drive_media_cache_download_success", {
      driveFileId: input.driveFileId,
      fileName: input.fileName,
      fileUri: input.fileUri,
      size: downloaded.size,
      status: finalResult.status,
      usage: input.usage,
    });
    return input.fileUri;
  } catch (error) {
    await deleteCacheFile(tempFileUri);
    logDriveMediaCache("drive_media_cache_download_error", {
      driveFileId: input.driveFileId,
      fileName: input.fileName,
      message: error instanceof Error ? error.message : String(error),
      usage: input.usage,
    });
    return undefined;
  }
}

async function retryDownloadAfterRefresh(
  driveFileId: string,
  tempFileUri: string,
  fileName?: string,
  usage?: string,
) {
  const retryAccessToken = await getGoogleDriveMediaSessionValidAccessToken({ forceRefresh: true });
  if (!retryAccessToken) {
    return { uri: tempFileUri, status: 401 };
  }
  await deleteCacheFile(tempFileUri);
  logDriveMediaCache("drive_media_cache_download_retry_after_refresh", {
    driveFileId,
    fileName,
    usage,
  });
  return downloadDriveFile(driveFileId, tempFileUri, retryAccessToken);
}

function downloadDriveFile(driveFileId: string, fileUri: string, accessToken: string) {
  return FileSystem.downloadAsync(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}?alt=media`,
    fileUri,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}

async function deleteCacheFile(fileUri: string) {
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch {
    // Cache cleanup is best-effort; the next request can attempt a fresh download.
  }
}

function logDriveMediaCache(event: string, payload?: Record<string, unknown>) {
  sessionDebugLog?.(event, payload);
  console.log("[Waymark Google Drive media]", { event, payload });
}

function sanitizeCacheName(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_");
}

function resolveFileExtension(input: { fileName?: string; mimeType?: string }) {
  const fromName = input.fileName?.match(/\.[A-Za-z0-9]{2,8}$/)?.[0];
  if (fromName) {
    return fromName.toLowerCase();
  }

  if (input.mimeType?.includes("png")) {
    return ".png";
  }
  if (input.mimeType?.includes("webp")) {
    return ".webp";
  }
  if (input.mimeType?.includes("gif")) {
    return ".gif";
  }
  if (input.mimeType?.includes("video/mp4")) {
    return ".mp4";
  }
  return ".jpg";
}
