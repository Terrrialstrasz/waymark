import { useCallback, useEffect, useState } from "react";
import { MarkDetailItem } from "../components/mark-detail/model";
import type { Expedition, MarkInstance, Path, TrailDay } from "../domain/waymark";
import { MarkInstanceOrigin, MarkInstanceStatus, MediaAssetOwnerType } from "../domain/waymark/enums";
import type { Locale } from "../types/ui";
import { useWaymarkApp } from "./WaymarkAppProvider";
import { mapUiPathId, pathLabelById } from "./waymarkUi";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";
import { deleteMarkDetail } from "../lib/waymark/shellAppAdapters";
import { sanitizeUserFacingMarkDetail } from "../lib/waymark/userFacingMarkText";
import { ensureMarkExecutionChecklist } from "../lib/waymark/markExecutionChecklistStore";
import { getMarkTemplateSeedMetadata } from "../lib/waymark/markTemplateSeedStore";
import { getPackCheckSurfacePolicy } from "../lib/waymark/packCheckSurfacePolicyStore";
import { getCopy } from "../i18n/copy";
import { listWaymarkMediaForOwner } from "./waymarkMediaSelectors";

type MarkDetailState =
  | { status: "idle" | "loading"; error: null; mark: MarkDetailItem | null }
  | { status: "error"; error: Error; mark: null }
  | { status: "ready"; error: null; mark: MarkDetailItem | null };

export function useWaymarkMarkDetail(locale: Locale, markId: string | null) {
  const app = useWaymarkApp();
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<MarkDetailState>({
    status: markId ? "loading" : "idle",
    error: null,
    mark: null,
  });

  const refresh = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!markId) {
      setState({ status: "idle", error: null, mark: null });
      return;
    }

    void (async () => {
      setState({ status: "loading", error: null, mark: null });
      try {
        const mark = await app.repositories.marks.getMarkInstanceById(markId);
        if (!mark) {
          if (!cancelled) {
            setState({ status: "ready", error: null, mark: null });
          }
          return;
        }
        const [path, expedition, trailDay] = await Promise.all([
          app.repositories.paths.getPathById(mark.pathId),
          mark.expeditionId ? app.repositories.expeditions.getExpeditionById(mark.expeditionId) : Promise.resolve(null),
          app.repositories.trailDays.getTrailDayById(mark.trailDayId),
        ]);
        const [checklist, mediaItems] = await Promise.all([
          resolveMarkDetailChecklist(app, mark),
          resolveMarkDetailMediaItems(app, mark),
        ]);

        if (!cancelled) {
          setState({
            status: "ready",
            error: null,
            mark: mapMarkDetailItem(mark, path, expedition, trailDay, locale, app.user.timezone, checklist, mediaItems),
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load mark detail."),
            mark: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, locale, markId, reloadToken]);

  return {
    ...state,
    refresh,
    async deleteMark() {
      if (!markId) {
        return;
      }
      await deleteMarkDetail(app, markId);
      setState({ status: "ready", error: null, mark: null });
    },
  };
}

async function resolveMarkDetailChecklist(app: ReturnType<typeof useWaymarkApp>, mark: MarkInstance) {
  if (mark.templateId) {
    const templateMetadata = await getMarkTemplateSeedMetadata(app.repositories.appSettings, app.user.id, mark.templateId);
    if (templateMetadata?.executionChecklistItems?.length) {
      const checklist = await ensureMarkExecutionChecklist(
        app.repositories.appSettings,
        app.user.id,
        mark.id,
        templateMetadata.executionChecklistItems,
      );
      return {
        title: "Checklist",
        items: checklist.items.map((item) => ({
          id: item.id,
          label: item.label,
          checked: item.checked,
        })),
      };
    }
  }

  const linked = await app.repositories.packChecks.listInstancesByTargetMark(mark.id);
  for (const pack of linked) {
    const policy = await getPackCheckSurfacePolicy(app.repositories.appSettings, app.user.id, pack.templateId);
    if (policy !== "embedded_in_mark") {
      continue;
    }
    const items = await app.repositories.packChecks.listItemInstances(pack.id);
    return {
      title: pack.title,
      items: items.map((item) => ({
        id: item.id,
        label: item.label,
        checked: item.isChecked,
      })),
    };
  }

  return undefined;
}

async function resolveMarkDetailMediaItems(app: ReturnType<typeof useWaymarkApp>, mark: MarkInstance) {
  return listWaymarkMediaForOwner(app.repositories, {
    ownerType: MediaAssetOwnerType.MarkInstance,
    ownerId: mark.id,
    alt: mark.title,
    legacyMediaAssetIds: mark.proofMediaAssetIds,
  });
}

function mapMarkDetailItem(
  mark: MarkInstance,
  path: Path | null,
  expedition: Expedition | null,
  trailDay: TrailDay | null,
  locale: Locale,
  timezone: string,
  checklist: MarkDetailItem["checklist"],
  mediaItems: NonNullable<MarkDetailItem["mediaItems"]>,
): MarkDetailItem {
  const c = getCopy(locale);
  const pathId = mapUiPathId(path?.slug, path?.title);
  const pathVisual = todayPathHeroPaths.find((entry) => entry.id === pathId);
  const userFacingDetail = sanitizeUserFacingMarkDetail(mark.completionSummary ?? mark.proofNote ?? mark.description);
  const userFacingNote = sanitizeUserFacingMarkDetail(mark.description);
  const detailStatus = mapMarkDetailStatus(mark.status);

  return {
    id: mark.id,
    title: mark.title,
    note: userFacingNote,
    date: mark.completedAt ?? mark.scheduledStartAt ?? mark.dueAt ?? mark.createdAt,
    status: mapMarkDetailStatus(mark.status),
    sourceType: mark.origin === MarkInstanceOrigin.QuickCapture ? "quickMark" : "plannedMark",
    path: {
      id: pathId,
      name: path ? path.title : pathId ? pathLabelById(pathId, locale) : "Path",
      skin: {
        color: pathVisual?.color.accent ?? "#1E5F9E",
        deepColor: pathVisual?.color.accentDeep ?? "#0B3764",
        softColor: pathVisual?.color.accentSoft ?? "#DCECF7",
      },
    },
    proofDetail: userFacingDetail,
    mediaItems,
    checklist,
    metadata: [
      {
        id: "status",
        label: c.markDetail.metadata.status,
        value: c.markDetail.metadata.statusValue[detailStatus],
        iconSemanticName: "status.done" as const,
      },
      {
        id: "origin",
        label: c.markDetail.metadata.origin,
        value: mapOriginLabel(mark.origin, c),
        iconSemanticName: "entity.mark" as const,
      },
      {
        id: "scheduled-start",
        label: c.markDetail.metadata.start,
        value: formatDetailDateTime(mark.scheduledStartAt, locale, timezone),
        iconSemanticName: "utility.clock" as const,
      },
      {
        id: "scheduled-end",
        label: c.markDetail.metadata.end,
        value: formatDetailDateTime(mark.scheduledEndAt, locale, timezone),
        iconSemanticName: "utility.clock" as const,
      },
      {
        id: "trail-day",
        label: c.markDetail.metadata.trailDay,
        value: trailDay?.date ?? mark.trailDayId,
        iconSemanticName: "utility.calendar" as const,
      },
    ].filter((item) => Boolean(item.value)),
    expeditions: expedition
      ? [
          {
            id: expedition.id,
            title: expedition.title,
            description: expedition.description,
          },
        ]
      : undefined,
  };
}

function mapMarkDetailStatus(status: MarkInstanceStatus) {
  switch (status) {
    case MarkInstanceStatus.Completed:
      return "done";
    case MarkInstanceStatus.PartiallyCompleted:
      return "done";
    case MarkInstanceStatus.Skipped:
      return "skipped";
    case MarkInstanceStatus.Expired:
      return "missed";
    default:
      return "planned";
  }
}

function mapOriginLabel(origin: MarkInstanceOrigin, copy: ReturnType<typeof getCopy>) {
  switch (origin) {
    case MarkInstanceOrigin.QuickCapture:
      return copy.markDetail.metadata.originValue.quickMark;
    case MarkInstanceOrigin.TemplateGenerated:
      return copy.markDetail.metadata.originValue.templateGenerated;
    case MarkInstanceOrigin.WeeklyPlanned:
      return copy.markDetail.metadata.originValue.weeklyPlanned;
    case MarkInstanceOrigin.ManualPlan:
      return copy.markDetail.metadata.originValue.manualPlan;
    case MarkInstanceOrigin.BacklogConverted:
      return copy.markDetail.metadata.originValue.backlogConverted;
    case MarkInstanceOrigin.Substitution:
      return copy.markDetail.metadata.originValue.substitution;
    default:
      return copy.markDetail.metadata.originValue.plannedMark;
  }
}

function formatDetailDateTime(value: string | undefined, locale: Locale, timezone: string) {
  if (!value) {
    return undefined;
  }

  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
