import { MediaAssetKind, MediaAssetOwnerType, MediaAssetType, type WaymarkRepositories } from "../domain/waymark";
import type { CaptureMediaAttachment } from "../types/capture";
import { normalizeWaymarkTimezone, resolveWaymarkLocalDate } from "./mediaDailyUploadDates";
import { persistMediaAttachmentToWaymarkStorage, type PersistedMediaAttachment } from "./photoAttachmentStorage";

export type WaymarkMediaDraft = CaptureMediaAttachment & {
  kind: MediaAssetKind;
  sortIndex: number;
};

type SaveMediaAssetsForOwnerInput = {
  repositories: WaymarkRepositories;
  userId: string;
  ownerType: MediaAssetOwnerType;
  ownerId: string;
  mediaAttachments: CaptureMediaAttachment[];
  maxItems?: number;
  userTimezone?: string;
  capturedAt?: Date;
  persistMediaAttachment?: (
    attachment: CaptureMediaAttachment,
    options: { ownerType: MediaAssetOwnerType },
  ) => Promise<PersistedMediaAttachment>;
};

export async function saveMediaAssetsForOwner({
  repositories,
  userId,
  ownerType,
  ownerId,
  mediaAttachments,
  maxItems = 20,
  userTimezone = "UTC",
  capturedAt = new Date(),
  persistMediaAttachment = persistMediaAttachmentToWaymarkStorage,
}: SaveMediaAssetsForOwnerInput) {
  const drafts = normalizeWaymarkMediaDrafts(mediaAttachments, maxItems);
  if (drafts.length === 0) {
    return [];
  }

  const persistedFiles: PersistedMediaAttachment[] = [];

  try {
    for (const draft of drafts) {
      persistedFiles.push(
        await persistMediaAttachment(draft, {
          ownerType,
        }),
      );
    }
  } catch (error) {
    await cleanupPersistedMediaFiles(persistedFiles);
    throw new Error(resolveMediaPipelineErrorMessage(error, "Failed to copy selected media into Waymark storage."));
  }

  try {
    return await repositories.transaction.runInTransaction(async (tx) => {
      const normalizedTimezone = normalizeWaymarkTimezone(userTimezone);
      const localDate = resolveWaymarkLocalDate(capturedAt, normalizedTimezone);
      const dailyBatch = await tx.dailyMediaUploadBatches.getOrCreate({
        userId,
        localDate,
        timezone: normalizedTimezone,
        status: "open",
      });
      const existing = await tx.media.listByOwner(ownerType, ownerId);
      const baseSortIndex = existing.reduce((maxValue, asset) => Math.max(maxValue, asset.sortIndex), -1) + 1;

      const created = [];
      for (let index = 0; index < persistedFiles.length; index += 1) {
        const attachment = persistedFiles[index]!;
        const draft = drafts[index]!;
        created.push(
          await tx.media.createMediaAsset({
            userId,
            ownerType,
            ownerId,
            kind: draft.kind,
            assetType: resolveMediaAssetType(ownerType, draft.kind),
            fileName: resolveMediaFileName(attachment),
            mimeType: attachment.mimeType ?? null,
            storagePath: attachment.uri,
            thumbnailPath: resolveThumbnailPath(attachment),
            width: attachment.width ?? null,
            height: attachment.height ?? null,
            durationMs: attachment.durationMs ?? null,
            byteSize: attachment.fileSize ?? null,
            sortIndex: baseSortIndex + draft.sortIndex,
            capturedAt: capturedAt.toISOString(),
            dailyBatchId: dailyBatch.id,
            libraryAssetId: draft.libraryAssetId ?? null,
            localDate,
            localStatus: "local_available",
            originalPickerUri: draft.originalPickerUri ?? draft.uri,
            sourceCleanupStatus: "not_requested",
            uploadStatus: "pending_eod_upload",
          }),
        );
      }
      await tx.dailyMediaUploadBatches.update(dailyBatch.id, {
        mediaCount: dailyBatch.mediaCount + created.length,
      });
      return created;
    });
  } catch (error) {
    await cleanupPersistedMediaFiles(persistedFiles);
    throw new Error(resolveMediaPipelineErrorMessage(error, "Failed to save media records for this item."));
  }
}

export function normalizeWaymarkMediaDrafts(mediaAttachments: CaptureMediaAttachment[], maxItems = 20): WaymarkMediaDraft[] {
  const normalized: WaymarkMediaDraft[] = mediaAttachments
    .filter((attachment): attachment is CaptureMediaAttachment & { uri: string } => Boolean(attachment?.uri))
    .map((attachment, index) => ({
      ...attachment,
      durationMs: sanitizeOptionalNumber(attachment.durationMs),
      fileSize: sanitizeOptionalNumber(attachment.fileSize),
      height: sanitizeOptionalNumber(attachment.height),
      kind: resolveMediaKind(attachment),
      sortIndex: index,
      width: sanitizeOptionalNumber(attachment.width),
    }));

  if (normalized.length > maxItems) {
    throw new Error(`Waymark supports up to ${maxItems} media items per entry.`);
  }

  return normalized;
}

function resolveMediaKind(attachment: CaptureMediaAttachment): MediaAssetKind {
  if (attachment.kind === MediaAssetKind.Video) {
    return MediaAssetKind.Video;
  }
  if (attachment.kind === MediaAssetKind.Image) {
    return MediaAssetKind.Image;
  }
  if (attachment.mimeType?.toLowerCase().startsWith("video/")) {
    return MediaAssetKind.Video;
  }
  return MediaAssetKind.Image;
}

function resolveMediaAssetType(ownerType: MediaAssetOwnerType, kind: MediaAssetKind) {
  if (ownerType === MediaAssetOwnerType.MarkInstance) {
    return kind === MediaAssetKind.Video ? MediaAssetType.ProofVideo : MediaAssetType.ProofPhoto;
  }
  if (ownerType === MediaAssetOwnerType.BacklogItem) {
    return kind === MediaAssetKind.Video ? MediaAssetType.BacklogVideo : MediaAssetType.BacklogPhoto;
  }
  return kind === MediaAssetKind.Video ? MediaAssetType.MemoryVideo : MediaAssetType.MemoryPhoto;
}

function resolveMediaFileName(attachment: PersistedMediaAttachment) {
  if (attachment.fileName?.trim()) {
    return attachment.fileName.trim();
  }
  const fromUri = attachment.uri.split("/").pop()?.split("?")[0]?.trim();
  if (fromUri) {
    return fromUri;
  }
  return attachment.kind === MediaAssetKind.Video ? `video-${Date.now()}.mp4` : `image-${Date.now()}.jpg`;
}

function resolveThumbnailPath(attachment: PersistedMediaAttachment) {
  const thumbnailUri = attachment.thumbnailUri?.trim();
  if (thumbnailUri && thumbnailUri !== attachment.uri) {
    return thumbnailUri;
  }
  return null;
}

async function cleanupPersistedMediaFiles(attachments: PersistedMediaAttachment[]) {
  if (attachments.length === 0) {
    return;
  }

  try {
    const fileSystem = await import("expo-file-system/legacy");
    await Promise.all(
      attachments
        .map((attachment) => attachment.uri)
        .filter((uri): uri is string => Boolean(uri))
        .map((uri) => fileSystem.deleteAsync(uri, { idempotent: true })),
    );
  } catch {
    // Cleanup is best-effort so the original failure stays visible.
  }
}

function sanitizeOptionalNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function resolveMediaPipelineErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
