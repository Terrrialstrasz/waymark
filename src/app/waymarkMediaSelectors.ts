import { MediaAssetKind, MediaAssetOwnerType, type MediaAsset, type WaymarkRepositories } from "../domain/waymark";
import type { WaymarkImageAssetId } from "../assets/imageRegistry";
import { cacheGoogleDriveMediaFile } from "./googleDriveMediaSession";

export type WaymarkMediaItem = {
  alt: string;
  assetId?: WaymarkImageAssetId;
  driveFileId?: string;
  thumbnailDriveFileId?: string;
  driveWebContentLink?: string;
  driveWebViewLink?: string;
  durationMs?: number;
  fileName?: string;
  height?: number;
  id: string;
  kind: MediaAssetKind;
  mimeType?: string;
  posterSrc?: string;
  resolvedSourceKind?: "local_cache" | "remote_cache" | "needs_download" | "missing" | "placeholder";
  canRenderNow?: boolean;
  src?: string;
  sortIndex: number;
  width?: number;
};

type MediaDownloadPolicy = "none" | "thumbnails" | "all";
const MEDIA_RESOLVE_CONCURRENCY = 3;

export async function listWaymarkMediaForOwner(
  repositories: WaymarkRepositories,
  input: {
    ownerType: MediaAssetOwnerType;
    ownerId: string;
    alt: string;
    legacyMediaAssetIds?: string[];
    downloadPolicy?: MediaDownloadPolicy;
    usage?: string;
  },
): Promise<WaymarkMediaItem[]> {
  const byOwner = await repositories.media.listByOwner(input.ownerType, input.ownerId);
  const resolvedAssets =
    byOwner.length > 0 ? byOwner : (await Promise.all((input.legacyMediaAssetIds ?? []).map((id) => repositories.media.getById(id))))
      .filter((asset): asset is MediaAsset => Boolean(asset));

  const sortedAssets = resolvedAssets
    .slice()
    .sort((left, right) => left.sortIndex - right.sortIndex || left.createdAt.localeCompare(right.createdAt));

  return mapWithConcurrency(
    sortedAssets,
    MEDIA_RESOLVE_CONCURRENCY,
    async (asset) => {
      const downloadPolicy = input.downloadPolicy ?? "all";
      const source = resolveMediaSource(asset);
      const poster = resolveMediaPoster(asset);
      const sourceKind = await resolveMediaSourceKind(asset, source);
      const shouldUseDriveSource = Boolean(asset.driveFileId);
      const canDownloadSource =
        downloadPolicy === "all" ||
        (downloadPolicy === "thumbnails" && asset.kind === MediaAssetKind.Image);
      const canDownloadPoster = downloadPolicy !== "none";
      const driveCachedSrc = canDownloadSource && (shouldUseDriveSource || sourceKind === "needs_download" || sourceKind === "missing")
        ? await cacheGoogleDriveMediaFile({
            driveFileId: asset.driveFileId,
            fileName: asset.fileName,
            mimeType: asset.driveMimeType ?? asset.mimeType,
            usage: input.usage ?? `${input.ownerType}:${input.ownerId}:source`,
          })
        : undefined;
      const posterAvailable = poster && !shouldUseDriveSource ? await localFileExists(poster) : false;
      const driveCachedThumbnail = canDownloadPoster && asset.thumbnailDriveFileId
        ? await cacheGoogleDriveMediaFile({
            driveFileId: asset.thumbnailDriveFileId,
            fileName: `${asset.id}-thumbnail.jpg`,
            mimeType: "image/jpeg",
            usage: `${input.usage ?? `${input.ownerType}:${input.ownerId}`}:thumbnail`,
          })
        : undefined;
      const driveCachedPoster = driveCachedThumbnail ?? driveCachedSrc;
      const resolvedSrc = driveCachedSrc ?? (shouldUseDriveSource || sourceKind === "needs_download" || sourceKind === "missing" ? undefined : source);
      return {
        alt: input.alt,
        driveFileId: asset.driveFileId,
        thumbnailDriveFileId: asset.thumbnailDriveFileId,
        driveWebContentLink: asset.driveWebContentLink,
        driveWebViewLink: asset.driveWebViewLink,
        durationMs: asset.durationMs,
        fileName: asset.fileName,
        id: asset.id,
        kind: asset.kind,
        mimeType: asset.driveMimeType ?? asset.mimeType,
        height: asset.height,
        posterSrc: driveCachedPoster ?? (posterAvailable ? poster : undefined),
        canRenderNow: sourceKind === "local_cache" || sourceKind === "remote_cache" || Boolean(driveCachedSrc || driveCachedPoster),
        resolvedSourceKind:
          driveCachedSrc || driveCachedPoster ? "remote_cache"
          : shouldUseDriveSource || sourceKind === "needs_download" ? "needs_download"
          : sourceKind,
        sortIndex: asset.sortIndex,
        src: resolvedSrc,
        width: asset.width,
      };
    },
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index], index);
      }
    }),
  );

  return results;
}

function resolveMediaPoster(asset: MediaAsset) {
  if (asset.kind === MediaAssetKind.Video) {
    return asset.thumbnailPath;
  }
  return asset.thumbnailPath ?? asset.storagePath;
}

function resolveMediaSource(asset: MediaAsset) {
  if (asset.kind === MediaAssetKind.Video) {
    return asset.storagePath;
  }
  return asset.storagePath;
}

async function resolveMediaSourceKind(asset: MediaAsset, source?: string | null): Promise<WaymarkMediaItem["resolvedSourceKind"]> {
  if (
    source &&
    asset.localStatus !== "local_missing" &&
    asset.localStatus !== "cache_evicted" &&
    (await localFileExists(source))
  ) {
    return "local_cache";
  }
  if (asset.driveFileId) {
    return "needs_download";
  }
  return "missing";
}

async function localFileExists(uri: string) {
  if (uri.startsWith("waymark-drive:")) {
    return false;
  }
  if (!uri.startsWith("file:")) {
    return true;
  }
  try {
    const fileSystem = await import("expo-file-system/legacy");
    const info = await fileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return true;
  }
}
