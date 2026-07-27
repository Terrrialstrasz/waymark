import { useCallback, useEffect, useState } from "react";
import type { Memory, Path } from "../domain/waymark";
import { MediaAssetOwnerType } from "../domain/waymark/enums";
import type { Locale } from "../types/ui";
import type { MarkDetailItem } from "../components/mark-detail/model";
import { useWaymarkApp } from "./WaymarkAppProvider";
import { mapUiPathId, pathLabelById } from "./waymarkUi";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";
import { deleteMemoryDetail } from "../lib/waymark/shellAppAdapters";
import { listWaymarkMediaForOwner } from "./waymarkMediaSelectors";

type MemoryDetailState =
  | { status: "idle" | "loading"; error: null; memory: MarkDetailItem | null }
  | { status: "error"; error: Error; memory: null }
  | { status: "ready"; error: null; memory: MarkDetailItem | null };

export function useWaymarkMemoryDetail(locale: Locale, memoryId: string | null) {
  const app = useWaymarkApp();
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<MemoryDetailState>({
    status: memoryId ? "loading" : "idle",
    error: null,
    memory: null,
  });

  const refresh = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!memoryId) {
      setState({ status: "idle", error: null, memory: null });
      return;
    }

    void (async () => {
      setState({ status: "loading", error: null, memory: null });
      try {
        const memory = await app.repositories.memories.getMemoryById(memoryId);
        if (!memory) {
          if (!cancelled) {
            setState({ status: "ready", error: null, memory: null });
          }
          return;
        }

        const path = memory.pathId ? await app.repositories.paths.getPathById(memory.pathId) : null;
        if (!cancelled) {
          setState({
            status: "ready",
            error: null,
            memory: mapMemoryDetailItem(memory, path, locale, []),
          });
        }

        const mediaItems = await listWaymarkMediaForOwner(app.repositories, {
          ownerType: MediaAssetOwnerType.Memory,
          ownerId: memory.id,
          alt: memory.title,
          legacyMediaAssetIds: memory.mediaAssetIds,
          downloadPolicy: "thumbnails",
          usage: `memory-detail:${memory.id}`,
        });

        if (!cancelled) {
          setState({
            status: "ready",
            error: null,
            memory: mapMemoryDetailItem(memory, path, locale, mediaItems),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load memory detail."),
            memory: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, locale, memoryId, reloadToken]);

  return {
    ...state,
    refresh,
    async deleteMemory() {
      if (!memoryId) {
        return;
      }
      await deleteMemoryDetail(app, memoryId);
      setState({ status: "ready", error: null, memory: null });
    },
  };
}

function mapMemoryDetailItem(
  memory: Memory,
  path: Path | null,
  locale: Locale,
  mediaItems: NonNullable<MarkDetailItem["mediaItems"]>,
): MarkDetailItem {
  const pathId = mapUiPathId(path?.slug, path?.title);
  const pathVisual = todayPathHeroPaths.find((entry) => entry.id === pathId);

  return {
    id: memory.id,
    title: memory.title,
    note: memory.note,
    date: memory.capturedAt,
    status: "done",
    sourceType: "memory",
    path: {
      id: pathId,
      name: path ? path.title : pathId ? pathLabelById(pathId, locale) : locale === "vi" ? "Journal" : "Journal",
      skin: {
        color: pathVisual?.color.accent ?? "#8F7652",
        deepColor: pathVisual?.color.accentDeep ?? "#5C4A34",
        softColor: pathVisual?.color.accentSoft ?? "#F2E8D8",
      },
    },
    proofDetail: memory.note,
    mediaItems,
    metadata: [
      { id: "captured-at", label: "Captured", value: memory.capturedAt },
      { id: "privacy", label: "Privacy", value: memory.privacy },
      { id: "trail-day", label: "Trail day", value: memory.trailDayId },
    ],
  };
}
