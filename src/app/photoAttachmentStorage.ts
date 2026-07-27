import { MediaAssetKind, MediaAssetOwnerType } from "../domain/waymark";
import type { CaptureMediaAttachment, CapturePhotoAttachment } from "../types/capture";

type PersistMediaAttachmentOptions = {
  ownerType: MediaAssetOwnerType;
};

export type PersistedMediaAttachment = CaptureMediaAttachment & {
  fileName: string;
  uri: string;
};

export async function persistMediaAttachmentToWaymarkStorage(
  mediaAttachment: CaptureMediaAttachment,
  { ownerType }: PersistMediaAttachmentOptions,
): Promise<PersistedMediaAttachment> {
  const fileSystem = getLegacyFileSystem();
  const rootDirectory = fileSystem.documentDirectory;

  if (!rootDirectory) {
    throw new Error("Waymark storage is unavailable on this device.");
  }

  const mediaDirectory = `${rootDirectory}waymark/media/${ownerType}/${resolveKindDirectory(mediaAttachment.kind)}`;
  await fileSystem.makeDirectoryAsync(mediaDirectory, { intermediates: true });

  const fileName = buildStoredFileName(mediaAttachment);
  const destinationUri = `${mediaDirectory}/${fileName}`;
  await fileSystem.copyAsync({
    from: mediaAttachment.uri,
    to: destinationUri,
  });

  const thumbnailUri =
    mediaAttachment.kind === "video"
      ? await createStoredVideoThumbnailAsync(destinationUri, mediaDirectory, fileSystem, mediaAttachment)
      : mediaAttachment.thumbnailUri;

  return {
    ...mediaAttachment,
    uri: destinationUri,
    fileName: mediaAttachment.fileName ?? fileName,
    thumbnailUri,
  };
}

export async function persistPhotoAttachmentToWaymarkStorage(
  photoAttachment: CapturePhotoAttachment,
): Promise<PersistedMediaAttachment> {
  return persistMediaAttachmentToWaymarkStorage(
    {
      ...photoAttachment,
      kind: MediaAssetKind.Image,
    },
    { ownerType: MediaAssetOwnerType.Memory },
  );
}

function resolveKindDirectory(kind?: CaptureMediaAttachment["kind"] | null) {
  return kind === "video" ? "videos" : "images";
}

function buildStoredFileName(mediaAttachment: CaptureMediaAttachment) {
  const originalName = mediaAttachment.fileName?.trim() || mediaAttachment.uri.split("/").pop()?.split("?")[0]?.trim() || "media";
  const sanitizedBase = sanitizeBaseName(stripExtension(originalName)) || "media";
  const extension = normalizeExtension(extractExtension(originalName), mediaAttachment.mimeType, mediaAttachment.kind);
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}-${sanitizedBase}.${extension}`;
}

function stripExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index > 0 ? fileName.slice(0, index) : fileName;
}

function extractExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index > -1 ? fileName.slice(index + 1) : "";
}

function sanitizeBaseName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function normalizeExtension(
  extension: string,
  mimeType?: string | null,
  kind?: CaptureMediaAttachment["kind"] | null,
) {
  const cleaned = extension.toLowerCase();
  if (cleaned) {
    return cleaned === "jpeg" ? "jpg" : cleaned;
  }

  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    case "video/quicktime":
      return "mov";
    case "video/webm":
      return "webm";
    case "video/mp4":
      return "mp4";
    default:
      return kind === "video" ? "mp4" : "jpg";
  }
}

async function createStoredVideoThumbnailAsync(
  videoUri: string,
  mediaDirectory: string,
  fileSystem: typeof import("expo-file-system/legacy"),
  mediaAttachment: CaptureMediaAttachment,
) {
  const VideoThumbnails = getVideoThumbnails();
  const generated = await VideoThumbnails.getThumbnailAsync(videoUri, {
    time: 0,
  });
  const thumbnailFileName = buildThumbnailFileName(mediaAttachment);
  const thumbnailDestinationUri = `${mediaDirectory}/${thumbnailFileName}`;
  await fileSystem.copyAsync({
    from: generated.uri,
    to: thumbnailDestinationUri,
  });
  return thumbnailDestinationUri;
}

function buildThumbnailFileName(mediaAttachment: CaptureMediaAttachment) {
  const originalName = mediaAttachment.fileName?.trim() || mediaAttachment.uri.split("/").pop()?.split("?")[0]?.trim() || "video";
  const sanitizedBase = sanitizeBaseName(stripExtension(originalName)) || "video";
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}-${sanitizedBase}-thumb.jpg`;
}

function getLegacyFileSystem(): typeof import("expo-file-system/legacy") {
  return require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
}

function getVideoThumbnails(): typeof import("expo-video-thumbnails") {
  return require("expo-video-thumbnails") as typeof import("expo-video-thumbnails");
}
