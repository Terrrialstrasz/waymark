import type { DriveFileRef, DriveFolderRef, DriveMediaAdapter } from "./driveMediaAdapter";
import * as FileSystem from "expo-file-system/legacy";

type GoogleDriveAdapterOptions = {
  getAccessToken: (options?: { forceRefresh?: boolean }) => Promise<string>;
  debugLog?: GoogleDriveDebugLogger;
};

export type GoogleDriveDebugLogger = (entry: {
  event: string;
  payload?: Record<string, unknown>;
}) => void;

type GoogleDriveFileResponse = {
  id: string;
  name?: string;
  mimeType?: string;
  parents?: string[];
  size?: string;
  md5Checksum?: string;
  webViewLink?: string;
  webContentLink?: string;
  appProperties?: Record<string, string>;
  trashed?: boolean;
};

type GoogleDriveListResponse = {
  files?: GoogleDriveFileResponse[];
};

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const WAYMARK_ROOT_PATH = ["Waymark Vault", "Media"];
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const DRIVE_FILE_FIELDS = "id,name,mimeType,parents,size,md5Checksum,webViewLink,webContentLink,appProperties,trashed";
const DRIVE_FETCH_MAX_ATTEMPTS = 3;

export class GoogleDriveAdapter implements DriveMediaAdapter {
  private readonly folderPathCache = new Map<string, DriveFolderRef>();
  private readonly folderPathInFlight = new Map<string, Promise<DriveFolderRef>>();

  constructor(private readonly options: GoogleDriveAdapterOptions) {}

  async ensureVaultRoot(): Promise<DriveFolderRef> {
    return this.ensureFolderPath(WAYMARK_ROOT_PATH);
  }

  async ensureFolderPath(path: string[]): Promise<DriveFolderRef> {
    const pathKey = buildFolderPathKey(path);
    const cached = this.folderPathCache.get(pathKey);
    if (cached) {
      this.log("drive_folder_cache_hit", {
        folderId: cached.id,
        path,
      });
      return cached;
    }

    const inFlight = this.folderPathInFlight.get(pathKey);
    if (inFlight) {
      this.log("drive_folder_cache_wait", { path });
      return inFlight;
    }

    const resolver = this.resolveFolderPath(path).finally(() => {
      this.folderPathInFlight.delete(pathKey);
    });
    this.folderPathInFlight.set(pathKey, resolver);
    return resolver;
  }

  private async resolveFolderPath(path: string[]): Promise<DriveFolderRef> {
    let parentId = "root";
    const resolvedPath: string[] = [];
    let current: DriveFolderRef | null = null;

    for (const segment of path) {
      resolvedPath.push(segment);
      const segmentPath = [...resolvedPath];
      const segmentPathKey = buildFolderPathKey(segmentPath);
      const cachedSegment = this.folderPathCache.get(segmentPathKey);
      if (cachedSegment) {
        current = cachedSegment;
        parentId = cachedSegment.id;
        continue;
      }

      current = await this.findFolder(parentId, segment);
      if (!current) {
        current = await this.createFolder(parentId, segment, segmentPath);
      } else {
        current = { ...current, path: segmentPath };
      }
      this.folderPathCache.set(segmentPathKey, current);
      parentId = current.id;
    }

    if (!current) {
      throw new Error("Google Drive folder path is empty.");
    }
    this.folderPathCache.set(buildFolderPathKey(path), current);
    return current;
  }

  async findFileByMediaAssetId({ folderId, mediaAssetId }: { folderId: string; mediaAssetId: string }) {
    return this.findFileByAppProperties({
      folderId,
      appProperties: {
        waymarkMediaAssetId: mediaAssetId,
        waymarkArtifactKind: "original",
      },
    });
  }

  async findFileByAppProperties({
    folderId,
    appProperties,
    fileName,
  }: {
    folderId: string;
    appProperties: Record<string, string>;
    fileName?: string;
  }): Promise<DriveFileRef | null> {
    const propertyQuery = Object.entries(appProperties)
      .map(([key, value]) => `appProperties has { key='${escapeDriveQuery(key)}' and value='${escapeDriveQuery(value)}' }`)
      .join(" and ");
    const nameQuery = fileName ? ` and name = '${escapeDriveQuery(fileName)}'` : "";
    const response = await this.driveFetch<GoogleDriveListResponse>(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(
        `'${escapeDriveQuery(folderId)}' in parents and trashed = false${nameQuery}${propertyQuery ? ` and ${propertyQuery}` : ""}`,
      )}&fields=files(${DRIVE_FILE_FIELDS})`,
    );
    const file = response.files?.[0];
    return file ? mapDriveFile(file, folderId) : null;
  }

  async uploadResumable({
    appProperties,
    fileName,
    folderId,
    localUri,
    mimeType,
  }: {
    folderId: string;
    fileName: string;
    localUri: string;
    mimeType: string;
    appProperties: Record<string, string>;
  }): Promise<DriveFileRef> {
    const existing = await this.findFileByAppProperties({
      folderId,
      fileName,
      appProperties: {
        ...(appProperties.waymarkMediaAssetId ? { waymarkMediaAssetId: appProperties.waymarkMediaAssetId } : {}),
        ...(appProperties.waymarkArtifactKind ? { waymarkArtifactKind: appProperties.waymarkArtifactKind } : {}),
      },
    });
    if (existing) {
      return existing;
    }

    const metadata = {
      appProperties,
      mimeType,
      name: fileName,
      parents: [folderId],
    };
    this.log("drive_upload_session_request", {
      bodyPreview: previewText(JSON.stringify(metadata)),
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
      },
      method: "POST",
      url: `${DRIVE_UPLOAD_BASE}/files?uploadType=resumable&fields=${encodeURIComponent(DRIVE_FILE_FIELDS)}`,
    });
    const sessionResponse = await this.authenticatedFetchWithRefresh(
      `${DRIVE_UPLOAD_BASE}/files?uploadType=resumable&fields=${encodeURIComponent(DRIVE_FILE_FIELDS)}`,
      {
        body: JSON.stringify(metadata),
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
        },
        method: "POST",
      },
      {
        errorEvent: "drive_upload_session_error",
        retryEvent: "drive_upload_session_retry",
        payload: { fileName },
      },
    );
    await this.logFetchResponse("drive_upload_session_response", sessionResponse);
    if (!sessionResponse.ok) {
      throw new Error(`Failed to start Google Drive upload session: ${sessionResponse.status}`);
    }
    const uploadUrl = sessionResponse.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("Google Drive upload session did not return a Location header.");
    }

    this.log("drive_resumable_upload_request", {
      bodyPreview: `[local file: ${localUri}]`,
      headers: {
        Authorization: "[redacted]",
        "Content-Type": mimeType,
      },
      method: "PUT",
      url: uploadUrl,
    });

    const accessToken = await this.options.getAccessToken();
    const uploadResult = await this.uploadBinaryWithRefresh(uploadUrl, localUri, mimeType, accessToken, fileName);

    this.log("drive_resumable_upload_response", {
      bodyPreview: previewText(uploadResult.body ?? ""),
      ok: uploadResult.status >= 200 && uploadResult.status < 300,
      status: uploadResult.status,
      url: uploadUrl,
    });
    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error(`Failed to upload media to Google Drive: ${uploadResult.status}: ${previewText(uploadResult.body ?? "")}`);
    }

    const uploaded = JSON.parse(uploadResult.body) as GoogleDriveFileResponse;
    return mapDriveFile(uploaded, folderId);
  }

  private async uploadBinaryWithRefresh(
    uploadUrl: string,
    localUri: string,
    mimeType: string,
    accessToken: string,
    fileName: string,
  ): Promise<FileSystem.FileSystemUploadResult> {
    try {
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, localUri, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": mimeType,
        },
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });
      if (uploadResult.status !== 401) {
        return uploadResult;
      }

      this.log("drive_resumable_upload_retry_after_refresh", { fileName, localUri, status: uploadResult.status });
      const refreshedAccessToken = await this.options.getAccessToken({ forceRefresh: true });
      return await FileSystem.uploadAsync(uploadUrl, localUri, {
        headers: {
          Authorization: `Bearer ${refreshedAccessToken}`,
          "Content-Type": mimeType,
        },
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });
    } catch (error) {
      this.log("drive_resumable_upload_error", {
        fileName,
        localUri,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async uploadJson({
    appProperties,
    fileName,
    folderId,
    json,
  }: {
    folderId: string;
    fileName: string;
    json: unknown;
    appProperties: Record<string, string>;
  }): Promise<DriveFileRef> {
    const existing = await this.findFileByAppProperties({ folderId, fileName, appProperties });
    if (existing) {
      return existing;
    }

    const boundary = `waymark_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    const metadata = {
      appProperties,
      mimeType: "application/json",
      name: fileName,
      parents: [folderId],
    };
    const body = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(json),
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const response = await this.driveFetch<GoogleDriveFileResponse>(
      `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=${encodeURIComponent(DRIVE_FILE_FIELDS)}`,
      {
        body,
        headers: {
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        method: "POST",
      },
    );
    return mapDriveFile(response, folderId);
  }

  async getFileMetadata(fileId: string): Promise<DriveFileRef | null> {
    try {
      const response = await this.driveFetch<GoogleDriveFileResponse>(
        `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(DRIVE_FILE_FIELDS)}`,
      );
      if (response.trashed) {
        return null;
      }
      return mapDriveFile(response, "");
    } catch (error) {
      if (error instanceof GoogleDriveHttpError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private async findFolder(parentId: string, name: string): Promise<DriveFolderRef | null> {
    const response = await this.driveFetch<GoogleDriveListResponse>(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(
        `'${escapeDriveQuery(parentId)}' in parents and name = '${escapeDriveQuery(name)}' and mimeType = '${DRIVE_FOLDER_MIME_TYPE}' and trashed = false`,
      )}&fields=files(id,name)`,
    );
    const file = response.files?.[0];
    return file?.id ? { id: file.id, name: file.name ?? name, path: [] } : null;
  }

  private async createFolder(parentId: string, name: string, path: string[]): Promise<DriveFolderRef> {
    const response = await this.driveFetch<GoogleDriveFileResponse>(
      `${DRIVE_API_BASE}/files?fields=${encodeURIComponent("id,name")}`,
      {
        body: JSON.stringify({
          mimeType: DRIVE_FOLDER_MIME_TYPE,
          name,
          parents: [parentId],
        }),
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
        method: "POST",
      },
    );
    return {
      id: response.id,
      name: response.name ?? name,
      path: [...path],
    };
  }

  private async driveFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
    const method = init.method ?? "GET";
    this.log("drive_request", {
      bodyPreview: previewBody(init.body),
      headers: sanitizeHeaders(init.headers),
      method,
      url,
    });
    const response = await this.authenticatedFetchWithRefresh(
      url,
      init,
      {
        errorEvent: "drive_request_error",
        retryEvent: "drive_request_retry",
        payload: { method, url },
      },
    );
    const responseText = await response.text();
    this.log("drive_response", {
      bodyPreview: previewText(responseText),
      method,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url,
    });
    if (!response.ok) {
      throw new GoogleDriveHttpError(response.status, `Google Drive request failed: ${response.status}: ${previewText(responseText)}`);
    }
    return JSON.parse(responseText) as T;
  }

  private async authenticatedFetchWithRefresh(
    url: string,
    init: RequestInit,
    logContext: {
      errorEvent: string;
      payload?: Record<string, unknown>;
      retryEvent: string;
    },
  ): Promise<Response> {
    const accessToken = await this.options.getAccessToken();
    const response = await this.fetchWithNetworkRetry(
      url,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(init.headers ?? {}),
        },
      },
      logContext,
    );
    if (response.status !== 401) {
      return response;
    }

    this.log("drive_request_retry_after_refresh", {
      ...(logContext.payload ?? {}),
      status: response.status,
      url,
    });
    const refreshedAccessToken = await this.options.getAccessToken({ forceRefresh: true });
    return await this.fetchWithNetworkRetry(
      url,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${refreshedAccessToken}`,
          ...(init.headers ?? {}),
        },
      },
      logContext,
    );
  }

  private log(event: string, payload?: Record<string, unknown>) {
    this.options.debugLog?.({ event, payload });
  }

  private async fetchWithNetworkRetry(
    url: string,
    init: RequestInit,
    logContext: {
      errorEvent: string;
      payload?: Record<string, unknown>;
      retryEvent: string;
    },
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= DRIVE_FETCH_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await fetch(url, init);
      } catch (error) {
        lastError = error;
        const payload = {
          ...(logContext.payload ?? {}),
          attempt,
          maxAttempts: DRIVE_FETCH_MAX_ATTEMPTS,
          message: error instanceof Error ? error.message : String(error),
        };
        this.log(attempt < DRIVE_FETCH_MAX_ATTEMPTS ? logContext.retryEvent : logContext.errorEvent, payload);
        if (attempt < DRIVE_FETCH_MAX_ATTEMPTS) {
          await sleep(350 * attempt);
        }
      }
    }
    throw lastError;
  }

  private async logFetchResponse(event: string, response: Response) {
    this.log(event, {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    });
  }
}

class GoogleDriveHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function mapDriveFile(file: GoogleDriveFileResponse, fallbackFolderId: string): DriveFileRef {
  return {
    id: file.id,
    name: file.name ?? file.id,
    folderId: file.parents?.[0] ?? fallbackFolderId,
    parentIds: file.parents,
    mimeType: file.mimeType ?? "application/octet-stream",
    sizeBytes: file.size ? Number(file.size) : undefined,
    md5Checksum: file.md5Checksum,
    webContentLink: file.webContentLink,
    webViewLink: file.webViewLink,
    appProperties: file.appProperties,
  };
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildFolderPathKey(path: string[]) {
  return path.map((segment) => encodeURIComponent(segment)).join("/");
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sanitizeHeaders(headers: RequestInit["headers"]) {
  if (!headers) {
    return {};
  }

  const entries =
    headers instanceof Headers
      ? Array.from(headers.entries())
      : Array.isArray(headers)
        ? headers
        : Object.entries(headers);

  return entries.reduce<Record<string, string>>((result, [key, value]) => {
    result[key] = key.toLowerCase() === "authorization" ? "[redacted]" : String(value);
    return result;
  }, {});
}

function previewBody(body: RequestInit["body"]) {
  if (!body || typeof body !== "string") {
    return body ? `[${typeof body}]` : undefined;
  }
  return previewText(body);
}

function previewText(text: string) {
  return text.length > 1200 ? `${text.slice(0, 1200)}...` : text;
}
