import { MediaAssetKind, MediaAssetOwnerType, MemoryPrivacy, type UserProfile, type WaymarkRepositories } from "../domain/waymark";
import type { Locale } from "../types/ui";
import type { CaptureMediaAttachment, CapturePhotoAttachment } from "../types/capture";
import type { PersistedMediaAttachment } from "./photoAttachmentStorage";
import { saveMediaAssetsForOwner } from "./waymarkMediaPipeline";

type CreateJournalMemoryCaptureInput = {
  repositories: WaymarkRepositories;
  user: UserProfile;
  locale: Locale;
  title: string;
  noteDetail: string;
  resolvedPathId?: string | null;
  photoAttachment?: CapturePhotoAttachment | null;
  mediaAttachments?: CaptureMediaAttachment[];
  persistPhotoAttachment?: (photoAttachment: CapturePhotoAttachment) => Promise<CapturePhotoAttachment>;
  persistMediaAttachment?: (
    attachment: CaptureMediaAttachment,
    options: { ownerType: MediaAssetOwnerType },
  ) => Promise<PersistedMediaAttachment>;
};

export async function createJournalMemoryCapture({
  repositories,
  user,
  locale,
  title,
  noteDetail,
  resolvedPathId = null,
  photoAttachment = null,
  mediaAttachments = [],
  persistPhotoAttachment,
  persistMediaAttachment,
}: CreateJournalMemoryCaptureInput) {
  const now = new Date();
  const localDate = formatLocalDate(now, user.timezone);
  const normalizedMediaAttachments = normalizeCaptureMediaAttachments(mediaAttachments, photoAttachment);

  const trailDay = await repositories.trailDays.getOrCreateTrailDay(user.id, localDate);
  const memory = await repositories.memories.createMemory({
    userId: user.id,
    trailDayId: trailDay.id,
    pathId: resolvedPathId,
    title: title.trim() || (locale === "vi" ? "Ky uc moi" : "New memory"),
    note: noteDetail.trim() || null,
    capturedAt: now.toISOString(),
    privacy: MemoryPrivacy.Private,
    mediaAssetIds: [],
  });

  if (normalizedMediaAttachments.length === 0) {
    return memory;
  }

  try {
    const createdAssets = await saveMediaAssetsForOwner({
      repositories,
      userId: user.id,
      ownerType: MediaAssetOwnerType.Memory,
      ownerId: memory.id,
      mediaAttachments: normalizedMediaAttachments,
      capturedAt: now,
      userTimezone: user.timezone,
      persistMediaAttachment:
        persistMediaAttachment ??
        (
          persistPhotoAttachment && normalizedMediaAttachments.length === 1
            ? async (attachment) => {
                const persisted = await persistPhotoAttachment(attachment);
                return {
                  ...persisted,
                  fileName: persisted.fileName ?? attachment.fileName ?? "legacy-media.jpg",
                  uri: persisted.uri,
                };
              }
            : undefined
        ),
    });

    return await repositories.memories.updateMemory(memory.id, {
      mediaAssetIds: createdAssets.map((asset) => asset.id),
    });
  } catch (error) {
    throw error;
  }
}

function normalizeCaptureMediaAttachments(
  mediaAttachments: CaptureMediaAttachment[],
  photoAttachment: CapturePhotoAttachment | null,
) {
  if (mediaAttachments.length > 0) {
    return mediaAttachments;
  }

  if (!photoAttachment) {
    return [];
  }

  return [
    {
      ...photoAttachment,
      kind: photoAttachment.kind ?? MediaAssetKind.Image,
    },
  ];
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
