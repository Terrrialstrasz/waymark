import {
  MediaAssetKind,
  MediaAssetOwnerType,
  MediaAssetType,
  MemoryPrivacy,
  type MediaAsset,
  type UserProfile,
  type WaymarkRepositories,
} from "../domain/waymark";

type DevMemoryFixture = {
  sourceId: string;
  title: string;
  note: string | null;
  pathSlug: string;
  timeOfDay: string;
  media: DevMemoryMediaFixture[];
};

type DevMemoryMediaFixture = {
  kind: MediaAssetKind;
  assetType: MediaAssetType;
  fileName: string;
  mimeType: string;
  src: string;
  thumbnailSrc?: string;
  driveFileId?: string;
  driveWebContentLink?: string;
  thumbnailDriveFileId?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  sortIndex: number;
};

export type ImportDevJournalMemoriesResult = {
  createdMemories: number;
  skippedMemories: number;
  createdMediaAssets: number;
  repairedMediaAssets: number;
  localDate: string;
};

const DEV_MEMORY_FIXTURES: DevMemoryFixture[] = [
  {
    sourceId: "memory_mrjeomxm_xozlmjuq",
    title: "Tập putt với con",
    note: "Hôm nay 2 bố con lần đầu thi putt trên thảm, thật thú vị. Hoạt động cùng nhau",
    pathSlug: "golf-craft",
    timeOfDay: "22:57",
    media: [],
  },
  {
    sourceId: "memory_mrnmj42o_s2hiwitl",
    title: "Về sớm đi ăn vặt cùng 2 mẹ em",
    note: "Cực kỳ random, cực kỳ hạnh\nPhúc",
    pathSlug: "family-home",
    timeOfDay: "18:05",
    media: [
      {
        kind: MediaAssetKind.Image,
        assetType: MediaAssetType.MemoryPhoto,
        fileName: "1000041414.jpg",
        mimeType: "image/jpeg",
        src: "https://drive.google.com/uc?id=1LfxV88D8Q5V6JzMzHlypivnt-zEMRS1t&export=download",
        driveFileId: "1LfxV88D8Q5V6JzMzHlypivnt-zEMRS1t",
        driveWebContentLink: "https://drive.google.com/uc?id=1LfxV88D8Q5V6JzMzHlypivnt-zEMRS1t&export=download",
        width: 3000,
        height: 4000,
        sortIndex: 0,
      },
      {
        kind: MediaAssetKind.Image,
        assetType: MediaAssetType.MemoryPhoto,
        fileName: "1000041415.jpg",
        mimeType: "image/jpeg",
        src: "https://drive.google.com/uc?id=1QC_Uh0kFojuu3bcTVhoCLGl_NX_NZjR4&export=download",
        driveFileId: "1QC_Uh0kFojuu3bcTVhoCLGl_NX_NZjR4",
        driveWebContentLink: "https://drive.google.com/uc?id=1QC_Uh0kFojuu3bcTVhoCLGl_NX_NZjR4&export=download",
        width: 3000,
        height: 4000,
        sortIndex: 1,
      },
    ],
  },
  {
    sourceId: "memory_mrrwjmpz_l2vr16x6",
    title: "Golf ở EPGA",
    note: "Hôm nay của con là các động tác thăng bằng, thể lực, backslap. Bố cũng học được rất nhiều",
    pathSlug: "family-home",
    timeOfDay: "12:00",
    media: [
      {
        kind: MediaAssetKind.Image,
        assetType: MediaAssetType.MemoryPhoto,
        fileName: "1000041506.jpg",
        mimeType: "image/jpeg",
        src: "https://drive.google.com/uc?id=1sCmCPPM7xum0a_GIRx210HVhZ4VNaCZt&export=download",
        driveFileId: "1sCmCPPM7xum0a_GIRx210HVhZ4VNaCZt",
        driveWebContentLink: "https://drive.google.com/uc?id=1sCmCPPM7xum0a_GIRx210HVhZ4VNaCZt&export=download",
        width: 3000,
        height: 4000,
        sortIndex: 0,
      },
      {
        kind: MediaAssetKind.Video,
        assetType: MediaAssetType.MemoryVideo,
        fileName: "1000041497.mp4",
        mimeType: "video/mp4",
        src: "https://drive.google.com/uc?id=1fKHljT97zMKhnYgiCt4i4pHtQHSiEo-S&export=download",
        thumbnailSrc: "https://drive.google.com/uc?id=1EVU-0A2nSQ5pO9KuyFA46qdD7k1EOFTV&export=download",
        driveFileId: "1fKHljT97zMKhnYgiCt4i4pHtQHSiEo-S",
        driveWebContentLink: "https://drive.google.com/uc?id=1fKHljT97zMKhnYgiCt4i4pHtQHSiEo-S&export=download",
        thumbnailDriveFileId: "1EVU-0A2nSQ5pO9KuyFA46qdD7k1EOFTV",
        width: 1080,
        height: 1920,
        durationMs: 73451,
        sortIndex: 1,
      },
    ],
  },
  {
    sourceId: "memory_mqx9to58_zpzjpxt4",
    title: "Tony đánh golf",
    note: "Tony nhất 9 hố đấu U7.\nXịn quá",
    pathSlug: "family-home",
    timeOfDay: "07:00",
    media: [],
  },
];

const DEV_MEMORY_IMPORT_VERSION = 1;
const DEV_MEMORY_IMPORT_SETTING_PREFIX = "dev_journal_memory_fixture:";

type DevMemoryImportMarker = {
  kind: "dev_journal_memory_fixture";
  version: number;
  sourceId: string;
  memoryId: string;
  localDate: string;
};

export async function importDevJournalMemoriesFromExportFixture(input: {
  repositories: WaymarkRepositories;
  user: UserProfile;
}): Promise<ImportDevJournalMemoriesResult> {
  return input.repositories.transaction.runInTransaction(async (repositories) => {
    const localDate = formatLocalDate(new Date(), input.user.timezone);
    const trailDay = await repositories.trailDays.getOrCreateTrailDay(input.user.id, localDate);
    const paths = await repositories.paths.listActivePaths(input.user.id);
    const pathIdBySlug = new Map(paths.map((path) => [path.slug, path.id]));
    const existingMemories = await repositories.memories.listMemoriesByTrailDay(trailDay.id);
    const existingMemoryById = new Map(existingMemories.map((memory) => [memory.id, memory]));

    let createdMemories = 0;
    let skippedMemories = 0;
    let createdMediaAssets = 0;
    let repairedMediaAssets = 0;

    for (const fixture of DEV_MEMORY_FIXTURES) {
      const capturedAt = toTodayIso(localDate, fixture.timeOfDay, input.user.timezone);
      const marker = await readDevMemoryImportMarker(repositories, input.user.id, fixture.sourceId);
      const markedMemory = marker ? existingMemoryById.get(marker.memoryId) ?? await repositories.memories.getMemoryById(marker.memoryId) : null;
      const adoptedMemory = markedMemory ?? findAdoptableDevMemory(existingMemories, fixture, capturedAt);
      const existingMemory = adoptedMemory ?? null;
      if (existingMemory) {
        skippedMemories += 1;
      }

      const memory = existingMemory ?? (await repositories.memories.createMemory({
        userId: input.user.id,
        trailDayId: trailDay.id,
        pathId: pathIdBySlug.get(fixture.pathSlug) ?? null,
        title: fixture.title,
        note: fixture.note,
        capturedAt,
        privacy: MemoryPrivacy.Private,
        mediaAssetIds: [],
      }));

      await writeDevMemoryImportMarker(repositories, input.user.id, fixture.sourceId, {
        kind: "dev_journal_memory_fixture",
        version: DEV_MEMORY_IMPORT_VERSION,
        sourceId: fixture.sourceId,
        memoryId: memory.id,
        localDate,
      });

      const existingAssets = await repositories.media.listByOwner(MediaAssetOwnerType.Memory, memory.id);
      const existingAssetByFileName = new Map(existingAssets.map((asset) => [asset.fileName, asset]));
      const mediaAssets: MediaAsset[] = [];
      for (const media of fixture.media) {
        const existingAsset = existingAssetByFileName.get(media.fileName);
        const createdOrExistingAsset = existingAsset ?? (await repositories.media.createMediaAsset({
          userId: input.user.id,
          ownerType: MediaAssetOwnerType.Memory,
          ownerId: memory.id,
          kind: media.kind,
          assetType: media.assetType,
          fileName: media.fileName,
          mimeType: media.mimeType,
          storagePath: resolveSeedStoragePath(media),
          thumbnailPath: resolveSeedThumbnailPath(media),
          width: media.width ?? null,
          height: media.height ?? null,
          durationMs: media.durationMs ?? null,
          sortIndex: media.sortIndex,
          capturedAt,
          localDate,
          uploadStatus: media.driveFileId ? "verified" : "uploaded",
          localStatus: media.driveFileId ? "cache_evicted" : "cache_available",
          sourceCleanupStatus: "not_applicable",
        }));

        if (!existingAsset) {
          createdMediaAssets += 1;
        }

        const repairedAsset = await repositories.media.updateMediaAsset(createdOrExistingAsset.id, {
          kind: media.kind,
          assetType: media.assetType,
          fileName: media.fileName,
          mimeType: media.mimeType,
          storagePath: resolveSeedStoragePath(media),
          thumbnailPath: resolveSeedThumbnailPath(media),
          width: media.width ?? null,
          height: media.height ?? null,
          durationMs: media.durationMs ?? null,
          sortIndex: media.sortIndex,
          capturedAt,
          localDate,
          uploadStatus: media.driveFileId ? "verified" : "uploaded",
          localStatus: media.driveFileId ? "cache_evicted" : "cache_available",
          sourceCleanupStatus: "not_applicable",
          driveFileId: media.driveFileId ?? null,
          driveWebContentLink: media.driveWebContentLink ?? media.src,
          driveMimeType: media.mimeType,
          thumbnailDriveFileId: media.thumbnailDriveFileId ?? null,
          lastSyncError: null,
        });
        if (existingAsset) {
          repairedMediaAssets += 1;
        }
        mediaAssets.push(repairedAsset);
      }

      if (mediaAssets.length > 0) {
        await repositories.memories.updateMemory(memory.id, {
          mediaAssetIds: mediaAssets.map((asset) => asset.id),
        });
      }

      if (!existingMemory) {
        createdMemories += 1;
      }
    }

    return {
      createdMemories,
      skippedMemories,
      createdMediaAssets,
      repairedMediaAssets,
      localDate,
    };
  });
}

function resolveSeedStoragePath(media: DevMemoryMediaFixture) {
  return media.driveFileId ? `waymark-drive://media/${media.driveFileId}` : media.src;
}

function resolveSeedThumbnailPath(media: DevMemoryMediaFixture) {
  if (media.thumbnailDriveFileId) {
    return `waymark-drive://media/${media.thumbnailDriveFileId}`;
  }
  return media.driveFileId ? `waymark-drive://media/${media.driveFileId}` : media.thumbnailSrc ?? media.src;
}

function buildDevMemoryImportMarkerKey(sourceId: string) {
  return `${DEV_MEMORY_IMPORT_SETTING_PREFIX}${sourceId}`;
}

async function readDevMemoryImportMarker(
  repositories: WaymarkRepositories,
  userId: string,
  sourceId: string,
): Promise<DevMemoryImportMarker | null> {
  const setting = await repositories.appSettings.getSetting(userId, buildDevMemoryImportMarkerKey(sourceId));
  const value = setting?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  if (
    value.kind === "dev_journal_memory_fixture" &&
    typeof value.sourceId === "string" &&
    typeof value.memoryId === "string"
  ) {
    return value as DevMemoryImportMarker;
  }
  return null;
}

async function writeDevMemoryImportMarker(
  repositories: WaymarkRepositories,
  userId: string,
  sourceId: string,
  marker: DevMemoryImportMarker,
) {
  await repositories.appSettings.setSetting(userId, buildDevMemoryImportMarkerKey(sourceId), marker);
}

function findAdoptableDevMemory(existingMemories: MediaMemory[], fixture: DevMemoryFixture, capturedAt: string) {
  return existingMemories.find((memory) => {
    const capturedDeltaMs = Math.abs(new Date(memory.capturedAt).getTime() - new Date(capturedAt).getTime());
    return memory.title === fixture.title && capturedDeltaMs < 60_000;
  });
}

type MediaMemory = Awaited<ReturnType<WaymarkRepositories["memories"]["listMemoriesByTrailDay"]>>[number];

function toTodayIso(localDate: string, timeOfDay: string, timezone: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = timeOfDay.split(":").map(Number);
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const firstOffset = getTimezoneOffsetMs(new Date(naiveUtc), timezone);
  const zonedUtc = naiveUtc - firstOffset;
  const settledOffset = getTimezoneOffsetMs(new Date(zonedUtc), timezone);
  return new Date(naiveUtc - settledOffset).toISOString();
}

function getTimezoneOffsetMs(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return asUtc - date.getTime();
}

function formatLocalDate(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}
