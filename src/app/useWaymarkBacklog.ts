import { useCallback, useEffect, useMemo, useState } from "react";
import { BacklogItemViewModel } from "../components/backlog/types";
import { MarkDetailItem } from "../components/mark-detail/model";
import type { BacklogItem, Path } from "../domain/waymark";
import { BacklogItemHorizon, BacklogItemStatus, BacklogItemType, MediaAssetOwnerType } from "../domain/waymark/enums";
import type { Locale, PathId } from "../types/ui";
import { useWaymarkApp } from "./WaymarkAppProvider";
import { findPathByUiPathId, formatLocalDate, mapUiPathId, pathLabelById } from "./waymarkUi";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";
import type { CaptureMediaAttachment } from "../types/capture";
import { saveMediaAssetsForOwner } from "./waymarkMediaPipeline";
import { listWaymarkMediaForOwner, type WaymarkMediaItem } from "./waymarkMediaSelectors";

type BacklogState =
  | { status: "loading"; error: null; items: BacklogItem[]; mediaById: Record<string, WaymarkMediaItem[]>; pathsById: Record<string, Path> }
  | { status: "error"; error: Error; items: BacklogItem[]; mediaById: Record<string, WaymarkMediaItem[]>; pathsById: Record<string, Path> }
  | { status: "ready"; error: null; items: BacklogItem[]; mediaById: Record<string, WaymarkMediaItem[]>; pathsById: Record<string, Path> };

const VISIBLE_BACKLOG_STATUSES = new Set<BacklogItemStatus>([
  BacklogItemStatus.Open,
  BacklogItemStatus.Pulled,
  BacklogItemStatus.Planned,
]);

export function useWaymarkBacklog(locale: Locale, options: { enabled?: boolean } = {}) {
  const app = useWaymarkApp();
  const enabled = options.enabled ?? true;
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<BacklogState>({
    status: "loading",
    error: null,
    items: [],
    mediaById: {},
    pathsById: {},
  });

  const refresh = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      setState({ status: "loading", error: null, items: [], mediaById: {}, pathsById: {} });

      try {
        const items = await app.repositories.backlog.listActiveBacklogItems(app.user.id);
        const paths = await app.repositories.paths.listActivePaths(app.user.id);
        const visible = items.filter((item) => VISIBLE_BACKLOG_STATUSES.has(item.status));
        const mediaEntries = await Promise.all(
          visible.map(async (item) => [
            item.id,
            await listWaymarkMediaForOwner(app.repositories, {
              ownerType: MediaAssetOwnerType.BacklogItem,
              ownerId: item.id,
              alt: item.title,
            }),
          ] as const),
        );

        if (!cancelled) {
          setState({
            status: "ready",
            error: null,
            items: visible,
            mediaById: Object.fromEntries(mediaEntries),
            pathsById: Object.fromEntries(paths.map((path) => [path.id, path])),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load backlog."),
            items: [],
            mediaById: {},
            pathsById: {},
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, enabled, reloadToken]);

  const items = useMemo(() => state.items.map((item) => mapBacklogItemViewModel(item, locale)), [locale, state.items]);

  const detailById = useMemo(() => {
    return Object.fromEntries(
      state.items.map((item) => [
        item.id,
        mapBacklogDetailItem(item, locale, state.pathsById[item.pathId ?? ""], state.mediaById[item.id] ?? []),
      ] as const),
    );
  }, [locale, state.items, state.mediaById, state.pathsById]);

  const actions = useMemo(
    () => ({
      refresh,
      async archiveItem(itemId: string) {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) {
          return;
        }
        await app.repositories.backlog.upsert({
          ...item,
          status: BacklogItemStatus.Archived,
        });
        refresh();
      },
      async deleteItem(itemId: string) {
        await app.repositories.backlog.softDeleteBacklogItem(itemId);
        refresh();
      },
      async createCapturedBacklogItem(
        title: string,
        detail: string,
        pathId: PathId,
        mediaAttachments: CaptureMediaAttachment[] = [],
      ) {
        const now = new Date();
        const localDate = formatLocalDate(now, app.user.timezone);
        const paths = await app.repositories.paths.listActivePaths(app.user.id);
        const resolvedPath = findPathByUiPathId(paths, pathId);
        const backlogItem = await app.repositories.backlog.upsert({
          id: createLocalId("backlog_item"),
          userId: app.user.id,
          pathId: resolvedPath?.id,
          title: title.trim() || (locale === "vi" ? "Ghi nhanh moi" : "New quick backlog"),
          description: detail.trim() || undefined,
          itemType: BacklogItemType.Project,
          horizon: BacklogItemHorizon.Near,
          status: BacklogItemStatus.Open,
          horizonLabel: locale === "vi" ? "Tuan nay" : "This week",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
        if (mediaAttachments.length > 0) {
          await saveMediaAssetsForOwner({
            repositories: app.repositories,
            userId: app.user.id,
            ownerType: MediaAssetOwnerType.BacklogItem,
            ownerId: backlogItem.id,
            mediaAttachments,
            capturedAt: now,
            userTimezone: app.user.timezone,
          });
        }
        void localDate;
        refresh();
      },
    }),
    [app, locale, refresh, state.items],
  );

  return {
    ...state,
    items,
    detailById,
    ...actions,
  };
}

function mapBacklogItemViewModel(item: BacklogItem, locale: Locale): BacklogItemViewModel {
  return {
    id: item.id,
    title: item.title,
    subtitle: item.description,
    type:
      item.itemType === BacklogItemType.MarkCandidate
        ? "mark"
        : item.itemType === BacklogItemType.Project
          ? "plan"
          : "idea",
    horizonLabel: item.horizonLabel,
    horizonTone: item.horizon === "near" ? "near" : item.horizon === "someday" ? "someday" : "unplanned",
  };
}

function mapBacklogDetailItem(
  item: BacklogItem,
  locale: Locale,
  path: Path | undefined,
  mediaItems: WaymarkMediaItem[],
): MarkDetailItem {
  const pathId = resolveBacklogPathId(item, path);
  const visual = todayPathHeroPaths.find((entry) => entry.id === pathId);
  return {
    id: item.id,
    title: item.title,
    note: item.description,
    date: item.updatedAt,
    status: "planned",
    sourceType: "backlog_item",
    path: {
      id: pathId,
      name: visual ? visual.label[locale] : path?.title ?? (locale === "vi" ? "Backlog" : "Backlog"),
      skin: {
        color: visual?.color.accent ?? "#8B6A10",
        deepColor: visual?.color.accentDeep ?? "#5C203C",
        softColor: visual?.color.accentSoft ?? "#F7EBC3",
      },
    },
    proofDetail: item.description,
    mediaItems,
    metadata: [
      { id: "type", label: "Backlog type", value: item.itemType },
      { id: "horizon", label: "Horizon", value: item.horizonLabel ?? item.horizon },
      { id: "status", label: "Status", value: item.status },
    ],
  };
}

function resolveBacklogPathId(item: BacklogItem, path: Path | undefined): PathId {
  const mapped = path ? mapUiPathId(path.slug, path.title) : undefined;
  if (mapped) {
    return mapped;
  }
  switch (item.itemType) {
    case BacklogItemType.MarkCandidate:
      return "career";
    case BacklogItemType.Project:
      return "career";
    default:
      return "culture";
  }
}

function createLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
