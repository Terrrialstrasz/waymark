import { MediaAsset, MediaAssetKind, MediaAssetOwnerType, type Memory, type WaymarkRepositories } from "../domain/waymark";
import type { DriveMediaAdapter, DriveFileRef } from "./driveMediaAdapter";
import { normalizeWaymarkTimezone } from "./mediaDailyUploadDates";

export type DailyUploadResult = {
  batchId: string;
  localDate: string;
  status: "verified" | "partial_failed";
  mediaCount: number;
  uploadedCount: number;
  failedCount: number;
};

export type DailyMediaUploadOptions = {
  repositories: WaymarkRepositories;
  drive: DriveMediaAdapter;
  userId: string;
  timezone: string;
  localDate: string;
  lockOwner?: string;
  now?: Date;
  lockTimeoutMs?: number;
  getLocalFileInfo?: (uri: string) => Promise<{ exists: boolean; size?: number }>;
  computeSha256?: (uri: string) => Promise<string | null>;
  includeVerifiedMedia?: boolean;
};

type UploadableMedia = MediaAsset & { localDate: string };
type MediaUploadContext = {
  asset: MediaAsset;
  entityFolderPath: string[];
  kind: "memory" | "system";
  mediaFileName: string;
  thumbnailFileName: string;
  labelProperties: Record<string, string>;
};

const DEFAULT_LOCK_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export async function runDailyMediaUpload({
  repositories,
  drive,
  userId,
  timezone,
  localDate,
  lockOwner = "waymark-eod-upload",
  now = new Date(),
  lockTimeoutMs = DEFAULT_LOCK_TIMEOUT_MS,
  getLocalFileInfo = getExpoLocalFileInfo,
  computeSha256 = async () => null,
  includeVerifiedMedia = false,
}: DailyMediaUploadOptions): Promise<DailyUploadResult> {
  const normalizedTimezone = normalizeWaymarkTimezone(timezone);
  const lockExpiresAt = new Date(now.getTime() + lockTimeoutMs).toISOString();

  let batch = await repositories.dailyMediaUploadBatches.getOrCreate({
    userId,
    localDate,
    timezone: normalizedTimezone,
    status: "open",
  });

  const media = (await repositories.media.listPendingEodUpload(userId, localDate, { includeVerified: includeVerifiedMedia })).filter(
    (asset): asset is UploadableMedia => asset.localDate === localDate,
  );

  const lockedBatch = await repositories.dailyMediaUploadBatches.acquireUploadLock({
    batchId: batch.id,
    lockAcquiredAt: now.toISOString(),
    lockExpiresAt,
    lockOwner,
    mediaCount: media.length,
    staleBefore: now.toISOString(),
  });
  if (!lockedBatch) {
    throw new Error(`Daily media upload is already running for ${localDate}.`);
  }
  batch = lockedBatch;

  let uploadedCount = 0;
  let failedCount = 0;
  const manifestItems = [];
  const entityManifests = new Map<string, unknown[]>();

  try {
    const root = await drive.ensureVaultRoot();
    const dayFolder = await drive.ensureFolderPath(["Waymark Vault", "Media", ...splitLocalDate(localDate)]);

    for (const asset of media) {
      await repositories.media.updateMediaAsset(asset.id, {
        dailyBatchId: batch.id,
        uploadStatus: "uploading",
      });

      try {
        const uploadContext = await buildMediaUploadContext(repositories, asset);
        const entityFolder = await drive.ensureFolderPath([...dayFolder.path, ...uploadContext.entityFolderPath]);
        const mediaFolder =
          uploadContext.kind === "memory" ? await drive.ensureFolderPath([...entityFolder.path, "media"]) : entityFolder;
        const thumbnailFolder =
          uploadContext.kind === "memory" ? await drive.ensureFolderPath([...entityFolder.path, "thumbnails"]) : entityFolder;
        let remote = asset.driveFileId ? await drive.getFileMetadata(asset.driveFileId) : null;
        remote = remote?.folderId === mediaFolder.id ? remote : null;
        remote = remote ?? (await drive.findFileByMediaAssetId({ folderId: mediaFolder.id, mediaAssetId: asset.id }));

        const localInfo = await getLocalFileInfo(asset.storagePath);
        if (!remote && !localInfo.exists) {
          failedCount += 1;
          await repositories.media.updateMediaAsset(asset.id, {
            lastSyncError: "Local media file is missing before EOD upload.",
            localStatus: "local_missing",
            uploadStatus: "upload_failed",
          });
          continue;
        }

        const contentHash = localInfo.exists ? (await computeSha256(asset.storagePath)) ?? asset.contentHash : asset.contentHash;
        const appProperties = buildMediaAppProperties({
          asset,
          batchId: batch.id,
          contentHash,
          labelProperties: uploadContext.labelProperties,
          localDate,
          userId,
        });
        remote =
          remote ??
          (await drive.uploadResumable({
            folderId: mediaFolder.id,
            fileName: uploadContext.mediaFileName,
            localUri: asset.storagePath,
            mimeType: asset.mimeType ?? "application/octet-stream",
            appProperties,
          }));

        const thumbnail = await uploadThumbnailIfAvailable({
          asset,
          batchId: batch.id,
          contentHash,
          drive,
          thumbnailFolderId: thumbnailFolder.id,
          localDate,
          uploadContext,
          userId,
        });
        const cleanupPatch = await cleanupLocalMediaCache(asset, now.toISOString());

        if (uploadContext.kind !== "memory") {
          const metadataAppProperties = {
            ...appProperties,
            waymarkArtifactKind: "media_metadata",
          };
          await uploadJsonArtifact({
            appProperties: metadataAppProperties,
            drive,
            fileName: `${asset.id}__metadata.json`,
            folderId: entityFolder.id,
            json: buildMediaMetadataJson(asset, remote, thumbnail, contentHash),
          });
        }

        await repositories.media.updateMediaAsset(asset.id, {
          contentHash: contentHash ?? null,
          contentHashAlgorithm: contentHash ? "sha256" : null,
          dailyBatchId: batch.id,
          driveFileId: remote.id,
          driveFolderId: entityFolder.id,
          driveRootFolderId: root.id,
          driveMd5Checksum: remote.md5Checksum ?? null,
          driveMimeType: remote.mimeType,
          driveSizeBytes: remote.sizeBytes ?? localInfo.size ?? null,
          driveWebContentLink: remote.webContentLink ?? null,
          driveWebViewLink: remote.webViewLink ?? null,
          lastSyncError: null,
          ...cleanupPatch,
          thumbnailDriveFileId: thumbnail?.id ?? null,
          uploadStatus: "verified",
          uploadedAt: now.toISOString(),
        });

        uploadedCount += 1;
        const manifestItem = buildManifestItem(asset, remote, thumbnail, contentHash, localInfo.size);
        manifestItems.push(manifestItem);
        const entityKey = `${asset.ownerType}:${asset.ownerId}:${entityFolder.id}:${uploadContext.kind}`;
        entityManifests.set(entityKey, [...(entityManifests.get(entityKey) ?? []), manifestItem]);
      } catch (error) {
        failedCount += 1;
        await repositories.media.updateMediaAsset(asset.id, {
          lastSyncError: error instanceof Error ? error.message : "EOD upload failed.",
          uploadStatus: "upload_failed",
        });
      }
    }

    for (const [key, items] of entityManifests) {
      const keyParts = key.split(":");
      const uploadKind = keyParts.pop();
      const folderId = keyParts.pop()!;
      const entityId = keyParts.pop()!;
      const entityType = keyParts.pop()!;
      await uploadJsonArtifact({
        drive,
        folderId,
        fileName: uploadKind === "memory" ? "memory.json" : "manifest.json",
        json: {
          schemaVersion: 1,
          kind: uploadKind === "memory" ? "waymark_memory_media_manifest" : "waymark_entity_media_manifest",
          batchId: batch.id,
          localDate,
          media: items,
        },
        appProperties: {
          waymarkEntityId: entityId,
          waymarkEntityType: entityType,
          waymarkUserId: userId,
          waymarkDailyBatchId: batch.id,
          waymarkLocalDate: localDate,
          waymarkArtifactKind: "entity_manifest",
        },
      });
    }

    const finalStatus = failedCount === 0 ? "verified" : "partial_failed";
    await uploadJsonArtifact({
      drive,
      folderId: dayFolder.id,
      fileName: "_daily_manifest.json",
      json: {
        schemaVersion: 1,
        kind: "waymark_daily_media_manifest",
        waymarkUserId: userId,
        localDate,
        timezone: normalizedTimezone,
        batchId: batch.id,
        status: finalStatus,
        media: manifestItems,
      },
      appProperties: {
        waymarkUserId: userId,
        waymarkDailyBatchId: batch.id,
        waymarkLocalDate: localDate,
        waymarkArtifactKind: "daily_manifest",
      },
    });
    await uploadJsonArtifact({
      drive,
      folderId: dayFolder.id,
      fileName: "_daily_upload_report.json",
      json: {
        schemaVersion: 1,
        kind: "waymark_daily_media_upload_report",
        batchId: batch.id,
        localDate,
        status: finalStatus,
        mediaCount: media.length,
        uploadedCount,
        failedCount,
        completedAt: now.toISOString(),
      },
      appProperties: {
        waymarkUserId: userId,
        waymarkDailyBatchId: batch.id,
        waymarkLocalDate: localDate,
        waymarkArtifactKind: "daily_upload_report",
      },
    });

    await repositories.dailyMediaUploadBatches.update(batch.id, {
      completedAt: now.toISOString(),
      failedCount,
      lockAcquiredAt: null,
      lockExpiresAt: null,
      lockOwner: null,
      mediaCount: media.length,
      status: finalStatus,
      uploadedCount,
    });

    return {
      batchId: batch.id,
      failedCount,
      localDate,
      mediaCount: media.length,
      status: finalStatus,
      uploadedCount,
    };
  } catch (error) {
    await repositories.dailyMediaUploadBatches.update(batch.id, {
      failedCount,
      lastError: error instanceof Error ? error.message : "Daily media upload failed.",
      lockAcquiredAt: null,
      lockExpiresAt: null,
      lockOwner: null,
      mediaCount: media.length,
      status: "retry_pending",
      uploadedCount,
    });
    throw error;
  }
}

export async function listDailyMediaUploadCatchUpDates(
  repositories: WaymarkRepositories,
  userId: string,
  nowLocalDate: string,
  options?: { includeVerifiedMedia?: boolean },
) {
  const nowIso = new Date().toISOString();
  const batchDates = (await repositories.dailyMediaUploadBatches.listCatchUpCandidates(userId, nowLocalDate, nowIso)).map(
    (batch) => batch.localDate,
  );
  const mediaDates = await repositories.media.listPendingEodUploadDates(userId, nowLocalDate, {
    includeVerified: options?.includeVerifiedMedia,
  });
  return [...new Set([...batchDates, ...mediaDates])].sort();
}

function splitLocalDate(localDate: string) {
  const [year = "1970", month = "01"] = localDate.split("-");
  return [year, month, localDate];
}

async function buildMediaUploadContext(repositories: WaymarkRepositories, asset: MediaAsset): Promise<MediaUploadContext> {
  if (asset.ownerType === MediaAssetOwnerType.Memory) {
    const memory = await repositories.memories.getMemoryById(asset.ownerId);
    return buildMemoryUploadContext(asset, memory);
  }
  return {
    asset,
    entityFolderPath: resolveSystemEntityFolderPath(asset),
    kind: "system",
    labelProperties: {},
    mediaFileName: buildOriginalFileName(asset),
    thumbnailFileName: `${stripExtension(buildOriginalFileName(asset))}__thumb.jpg`,
  };
}

function buildMemoryUploadContext(asset: MediaAsset, memory: Memory | null): MediaUploadContext {
  const memoryTitleSlug = slugifyDisplayLabel(memory?.title ?? "memory");
  const memoryShortId = shortEntityId(asset.ownerId);
  const order = formatMediaOrder(asset);
  const mediaType = resolveMemoryMediaType(asset);
  const thumbType = asset.kind === MediaAssetKind.Video ? "poster" : "thumb";
  const folderName = `${memoryTitleSlug}__mem_${memoryShortId}`;

  return {
    asset,
    entityFolderPath: [folderName],
    kind: "memory",
    labelProperties: {
      waymarkMemoryTitleSlug: memoryTitleSlug,
      waymarkMemoryShortId: memoryShortId,
    },
    mediaFileName: `${memoryTitleSlug}__${order}_${mediaType}.${resolveExtension(asset)}`,
    thumbnailFileName: `${memoryTitleSlug}__${order}_${thumbType}.jpg`,
  };
}

function resolveSystemEntityFolderPath(asset: MediaAsset) {
  if (asset.ownerType === MediaAssetOwnerType.MarkInstance) {
    return ["marks", asset.ownerId];
  }
  if (asset.ownerType === MediaAssetOwnerType.BacklogItem) {
    return ["backlog", asset.ownerId];
  }
  if (asset.ownerType === MediaAssetOwnerType.Path) {
    return ["system", "path-heroes", asset.ownerId];
  }
  if (asset.ownerType === MediaAssetOwnerType.Expedition) {
    return ["system", "expedition-heroes", asset.ownerId];
  }
  return ["system", "attachments", asset.ownerId];
}

function buildOriginalFileName(asset: MediaAsset) {
  return `${asset.id}__original.${resolveExtension(asset)}`;
}

function resolveExtension(asset: MediaAsset) {
  const fromName = asset.fileName.split(".").pop()?.toLowerCase();
  if (fromName && fromName !== asset.fileName.toLowerCase()) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (asset.mimeType === "image/png") {
    return "png";
  }
  if (asset.mimeType === "image/webp") {
    return "webp";
  }
  if (asset.mimeType === "video/quicktime") {
    return "mov";
  }
  return asset.kind === "video" ? "mp4" : "jpg";
}

function resolveMemoryMediaType(asset: MediaAsset) {
  if (asset.mimeType?.startsWith("audio/")) {
    return "audio";
  }
  return asset.kind === MediaAssetKind.Video ? "video" : "photo";
}

async function uploadThumbnailIfAvailable({
  asset,
  batchId,
  contentHash,
  drive,
  thumbnailFolderId,
  localDate,
  uploadContext,
  userId,
}: {
  asset: MediaAsset;
  batchId: string;
  contentHash?: string;
  drive: DriveMediaAdapter;
  thumbnailFolderId: string;
  localDate: string;
  uploadContext: MediaUploadContext;
  userId: string;
}) {
  const existingById = asset.thumbnailDriveFileId ? await drive.getFileMetadata(asset.thumbnailDriveFileId) : null;
  if (existingById?.folderId === thumbnailFolderId) {
    return existingById;
  }

  const existing = await drive.findFileByAppProperties({
    folderId: thumbnailFolderId,
    appProperties: {
      waymarkMediaAssetId: asset.id,
      waymarkArtifactKind: "thumbnail",
    },
  });
  if (existing) {
    return existing;
  }

  if (!asset.thumbnailPath || asset.thumbnailPath === asset.storagePath) {
    return null;
  }

  const fileName = uploadContext.thumbnailFileName;
  const appProperties = {
    ...uploadContext.labelProperties,
    waymarkUserId: userId,
    waymarkMediaAssetId: asset.id,
    waymarkEntityType: asset.ownerType,
    waymarkEntityId: asset.ownerId,
    waymarkLocalDate: localDate,
    waymarkDailyBatchId: batchId,
    waymarkContentHash: contentHash ?? "",
    waymarkArtifactKind: "thumbnail",
  };
  return drive.uploadResumable({
    folderId: thumbnailFolderId,
    fileName,
    localUri: asset.thumbnailPath,
    mimeType: "image/jpeg",
    appProperties,
  });
}

async function uploadJsonArtifact({
  appProperties,
  drive,
  fileName,
  folderId,
  json,
}: {
  appProperties: Record<string, string>;
  drive: DriveMediaAdapter;
  fileName: string;
  folderId: string;
  json: unknown;
}) {
  const existing = await drive.findFileByAppProperties({
    folderId,
    fileName,
    appProperties: {
      waymarkArtifactKind: appProperties.waymarkArtifactKind,
      ...(appProperties.waymarkEntityId ? { waymarkEntityId: appProperties.waymarkEntityId } : {}),
      ...(appProperties.waymarkEntityType ? { waymarkEntityType: appProperties.waymarkEntityType } : {}),
      ...(appProperties.waymarkLocalDate ? { waymarkLocalDate: appProperties.waymarkLocalDate } : {}),
      ...(appProperties.waymarkMediaAssetId ? { waymarkMediaAssetId: appProperties.waymarkMediaAssetId } : {}),
    },
  });
  if (existing) {
    return existing;
  }
  return drive.uploadJson({
    folderId,
    fileName,
    json,
    appProperties,
  });
}

function buildMediaAppProperties({
  asset,
  batchId,
  contentHash,
  labelProperties,
  localDate,
  userId,
}: {
  asset: MediaAsset;
  batchId: string;
  contentHash?: string;
  labelProperties?: Record<string, string>;
  localDate: string;
  userId: string;
}) {
  return {
    ...(labelProperties ?? {}),
    waymarkUserId: userId,
    waymarkMediaAssetId: asset.id,
    waymarkEntityType: asset.ownerType,
    waymarkEntityId: asset.ownerId,
    waymarkLocalDate: localDate,
    waymarkDailyBatchId: batchId,
    waymarkContentHash: contentHash ?? "",
    waymarkArtifactKind: "original",
  };
}

async function cleanupLocalMediaCache(asset: MediaAsset, deletedAt: string) {
  const candidates = [asset.storagePath, asset.thumbnailPath].filter(
    (uri, index, items): uri is string => Boolean(uri) && items.indexOf(uri) === index,
  );

  await Promise.all(
    candidates.map(async (uri) => {
      if (!uri.startsWith("file:")) {
        return;
      }
      try {
        const fileSystem = await import("expo-file-system/legacy");
        await fileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        // Cache cleanup must not turn a verified Drive upload into a failed sync.
      }
    }),
  );

  return {
    localDeletedAt: deletedAt,
    localStatus: "cache_evicted" as const,
  };
}

function formatMediaOrder(asset: MediaAsset) {
  return String(Math.max(0, asset.sortIndex) + 1).padStart(3, "0");
}

function shortEntityId(id: string) {
  const compact = id.split("_").filter(Boolean).pop() ?? id;
  return compact.slice(-8);
}

function slugifyDisplayLabel(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "memory";
}

function stripExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index > 0 ? fileName.slice(0, index) : fileName;
}

function buildMediaMetadataJson(asset: MediaAsset, remote: DriveFileRef, thumbnail: DriveFileRef | null, contentHash?: string) {
  return {
    schemaVersion: 1,
    waymarkUserId: asset.userId,
    mediaAssetId: asset.id,
    entityType: asset.ownerType,
    entityId: asset.ownerId,
    createdAt: asset.createdAt,
    contentHash,
    contentHashAlgorithm: contentHash ? "sha256" : undefined,
    mimeType: asset.mimeType,
    originalFileName: asset.fileName,
    localCreatedFrom: asset.libraryAssetId ? "gallery" : "unknown",
    driveFileId: remote.id,
    thumbnailDriveFileId: thumbnail?.id,
  };
}

function buildManifestItem(asset: MediaAsset, remote: DriveFileRef, thumbnail: DriveFileRef | null, contentHash?: string, sizeBytes?: number) {
  return {
    mediaAssetId: asset.id,
    entityType: asset.ownerType,
    entityId: asset.ownerId,
    createdAt: asset.createdAt,
    mimeType: asset.mimeType,
    originalFileName: asset.fileName,
    driveFileId: remote.id,
    thumbnailDriveFileId: thumbnail?.id,
    contentHashAlgorithm: contentHash ? "sha256" : undefined,
    contentHash,
    sizeBytes: remote.sizeBytes ?? sizeBytes,
    folderId: remote.folderId,
  };
}

async function getExpoLocalFileInfo(uri: string) {
  try {
    const fileSystem = await import("expo-file-system/legacy");
    const info = await fileSystem.getInfoAsync(uri);
    return {
      exists: info.exists,
      size: info.exists && "size" in info ? info.size : undefined,
    };
  } catch {
    return { exists: true };
  }
}
