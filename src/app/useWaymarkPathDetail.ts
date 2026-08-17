import { useCallback, useEffect, useState } from "react";
import type { NextMarkItem, PathDetailExpeditionItem, PathDetailItem, PathDetailMarkItem, PathDetailMilestoneItem, PathProofItem } from "../components/paths/types";
import type { Expedition, MarkInstance, Memory, Milestone, Path } from "../domain/waymark";
import { ExpeditionStatus, MarkInstanceStatus, MilestoneStatus } from "../domain/waymark/enums";
import { isFinalMarkInstanceStatus } from "../domain/waymark/markStatus";
import { getMarkMetadata, listDisciplineProofsByTrailDay, projectCharacterFromRecords } from "../lib/waymark";
import type { Locale, PathId } from "../types/ui";
import { useWaymarkApp } from "./WaymarkAppProvider";
import { buildCharacterPathProofItems, buildPathProofItems } from "./readModelProjections";
import { groupExpeditionMarksByMilestone } from "./expeditionDetailModel";
import { formatLocalDate, mapUiPathId, shiftLocalDate } from "./waymarkUi";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";

type PathDetailData = {
  path: PathDetailItem | null;
  proofs: PathProofItem[];
  nextMarks: NextMarkItem[];
  expeditions: PathDetailExpeditionItem[];
};

type PathDetailState =
  | { status: "idle" | "loading"; error: null; data: PathDetailData }
  | { status: "error"; error: Error; data: PathDetailData }
  | { status: "ready"; error: null; data: PathDetailData };

const EMPTY_DATA: PathDetailData = {
  path: null,
  proofs: [],
  nextMarks: [],
  expeditions: [],
};

export function useWaymarkPathDetail(locale: Locale, uiPathId: PathId | null) {
  const app = useWaymarkApp();
  const [state, setState] = useState<PathDetailState>({
    status: uiPathId ? "loading" : "idle",
    error: null,
    data: EMPTY_DATA,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!uiPathId) {
      setState({ status: "idle", error: null, data: EMPTY_DATA });
      return;
    }

    void (async () => {
      setState({ status: "loading", error: null, data: EMPTY_DATA });

      try {
        const paths = await app.repositories.paths.listActivePaths(app.user.id);
        const path = paths.find((entry) => mapUiPathId(entry.slug, entry.title) === uiPathId) ?? null;
        if (!path) {
          if (!cancelled) {
            setState({ status: "ready", error: null, data: EMPTY_DATA });
          }
          return;
        }

        const todayLocalDate = formatLocalDate(new Date(), app.user.timezone);
        const trailDays = await app.repositories.trailDays.listTrailDaysInRange(
          app.user.id,
          shiftLocalDate(todayLocalDate, -21),
          todayLocalDate,
        );

        const markDays = await Promise.all(
          trailDays.map(async (trailDay) => ({
            trailDay,
            marks: await Promise.all(
              (await app.repositories.marks.listMarkInstancesByTrailDay(trailDay.id))
                .filter((mark) => mark.pathId === path.id)
                .map(async (mark) => ({
                  mark,
                  metadata: await getMarkMetadata(app.repositories.appSettings, app.user.id, mark.id),
                })),
            ),
            memories: (await app.repositories.memories.listMemoriesByTrailDay(trailDay.id)).filter((memory) => memory.pathId === path.id),
            allMarksWithMetadata: await Promise.all(
              (await app.repositories.marks.listMarkInstancesByTrailDay(trailDay.id)).map(async (mark) => ({
                mark,
                metadata: await getMarkMetadata(app.repositories.appSettings, app.user.id, mark.id),
              })),
            ),
            disciplineProofs: await listDisciplineProofsByTrailDay(app.repositories.appSettings, app.user.id, trailDay.id),
          })),
        );

        const expeditions = (await app.repositories.expeditions.listExpeditionsByPath(path.id)).items.filter(
          (entry) =>
            entry.status === ExpeditionStatus.Active ||
            entry.status === ExpeditionStatus.Planned ||
            entry.status === ExpeditionStatus.Paused,
        );

        if (!cancelled) {
          setState({
            status: "ready",
            error: null,
            data: {
              path: mapPathDetailItem(path, locale),
              proofs:
                uiPathId === "character"
                  ? buildCharacterProofs(
                      markDays.flatMap((entry) =>
                        projectCharacterFromRecords({
                          marks: entry.allMarksWithMetadata,
                          disciplineProofs: entry.disciplineProofs,
                        }).proofEvents,
                      ),
                    )
                  : buildProofs(markDays.flatMap((entry) => entry.marks), markDays.flatMap((entry) => entry.memories), locale, app.user.timezone),
              nextMarks: buildNextMarks(markDays.flatMap((entry) => entry.marks.map((item) => item.mark)), locale),
              expeditions: await Promise.all(expeditions.map((entry) => mapPathExpeditionDetailItem(app, entry, path))),
            },
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load path detail."),
            data: EMPTY_DATA,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, locale, refreshKey, uiPathId]);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  const completeMilestone = useCallback(
    async (milestoneId: string) => {
      await app.repositories.expeditions.updateMilestone(milestoneId, {
        status: MilestoneStatus.Completed,
      });
      refresh();
    },
    [app.repositories.expeditions, refresh],
  );

  const skipMilestone = useCallback(
    async (milestoneId: string) => {
      await app.repositories.expeditions.updateMilestone(milestoneId, {
        status: MilestoneStatus.Archived,
      });
      refresh();
    },
    [app.repositories.expeditions, refresh],
  );

  const rescheduleMilestone = useCallback(
    async (milestoneId: string) => {
      await app.repositories.expeditions.updateMilestone(milestoneId, {
        status: MilestoneStatus.Active,
      });
      refresh();
    },
    [app.repositories.expeditions, refresh],
  );

  return {
    ...state,
    completeMilestone,
    refresh,
    rescheduleMilestone,
    skipMilestone,
  };
}

function mapPathDetailItem(path: Path, locale: Locale): PathDetailItem {
  const pathId = mapUiPathId(path.slug, path.title) ?? "career";
  const visual = todayPathHeroPaths.find((entry) => entry.id === pathId);
  return {
    id: path.id,
    pathId,
    title: visual?.label ?? { en: path.title, vi: path.title },
    statement: undefined,
    status: "alive",
    sinceLabel: undefined,
    pulseSummary: undefined,
    pulseBody: undefined,
    whyThisPathBody: undefined,
    pulseMetrics: undefined,
  };
}

export function buildProofs(
  marks: Array<{ mark: { id: string; title: string; completedAt?: string; createdAt: string }; metadata: Awaited<ReturnType<typeof getMarkMetadata>> | null }>,
  memories: Memory[],
  locale: Locale,
  timezone: string = "UTC",
) {
  return buildPathProofItems(marks, memories, locale, timezone);
}

export function buildCharacterProofs(events: ReturnType<typeof projectCharacterFromRecords>["proofEvents"]) {
  return buildCharacterPathProofItems(events);
}

function buildNextMarks(
  marks: Array<{ id: string; title: string; status: MarkInstanceStatus; scheduledStartAt?: string; dueAt?: string; createdAt: string }>,
  locale: Locale,
) {
  return marks
    .filter((mark) =>
      mark.status === MarkInstanceStatus.Planned ||
      mark.status === MarkInstanceStatus.Ready ||
      mark.status === MarkInstanceStatus.Blocked ||
      mark.status === MarkInstanceStatus.Active,
    )
    .sort((left, right) => (left.scheduledStartAt ?? left.dueAt ?? left.createdAt).localeCompare(right.scheduledStartAt ?? right.dueAt ?? right.createdAt))
    .slice(0, 4)
    .map(
      (mark) =>
        ({
          id: mark.id,
          title: { en: mark.title, vi: mark.title },
          timingState: mark.status === MarkInstanceStatus.Active ? "today" : "planned",
        }) satisfies NextMarkItem,
    );
  void locale;
}

async function mapPathExpeditionDetailItem(
  app: ReturnType<typeof useWaymarkApp>,
  expedition: Expedition,
  path: Path,
): Promise<PathDetailExpeditionItem> {
  const pathId = mapUiPathId(path.slug, path.title) ?? "career";
  const milestones = await app.repositories.expeditions.listMilestonesByExpedition(expedition.id);
  const expeditionMarks = await app.repositories.marks.listMarkInstancesByExpedition(expedition.id);
  const { marksByMilestoneId, unassignedMarks } = groupExpeditionMarksByMilestone(milestones, expeditionMarks);

  return {
    id: expedition.id,
    pathId,
    title: expedition.title,
    description: expedition.description,
    status: expedition.status,
    startDate: expedition.startDate,
    targetDate: expedition.targetDate ?? expedition.targetEndAt,
    sortOrder: expedition.sortOrder,
    milestones: milestones
      .map((milestone) => mapPathMilestoneDetailItem(milestone, marksByMilestoneId.get(milestone.id) ?? []))
      .sort(comparePathDetailMilestones),
    unassignedMarks: sortPathDetailMarks(unassignedMarks.map(mapPathDetailMarkItem)),
  };
}

function mapPathMilestoneDetailItem(milestone: Milestone, marks: MarkInstance[]): PathDetailMilestoneItem {
  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    status: milestone.status,
    startDate: milestone.startDate,
    targetDate: milestone.targetDate,
    completedAt: milestone.completedAt,
    sortOrder: milestone.sortOrder,
    orderIndex: milestone.orderIndex,
    marks: sortPathDetailMarks(marks.map(mapPathDetailMarkItem)),
  };
}

function mapPathDetailMarkItem(mark: MarkInstance): PathDetailMarkItem {
  const sortTime = mark.scheduledStartAt ?? mark.dueAt ?? mark.completedAt ?? mark.createdAt;
  return {
    id: mark.id,
    title: mark.title,
    status: mark.status,
    scheduledStartAt: mark.scheduledStartAt,
    scheduledEndAt: mark.scheduledEndAt,
    dueAt: mark.dueAt,
    completedAt: mark.completedAt,
    createdAt: mark.createdAt,
    sortTime,
    isDone: mark.status === MarkInstanceStatus.Completed,
    isFinal: isFinalMarkInstanceStatus(mark.status),
  };
}

function sortPathDetailMarks(marks: PathDetailMarkItem[]) {
  return [...marks].sort((left, right) => {
    return left.sortTime.localeCompare(right.sortTime) || left.title.localeCompare(right.title);
  });
}

function comparePathDetailMilestones(left: PathDetailMilestoneItem, right: PathDetailMilestoneItem) {
  return (
    getMilestoneSortDate(left).localeCompare(getMilestoneSortDate(right)) ||
    left.sortOrder - right.sortOrder ||
    (left.orderIndex ?? 0) - (right.orderIndex ?? 0) ||
    left.title.localeCompare(right.title)
  );
}

function getMilestoneSortDate(milestone: PathDetailMilestoneItem) {
  return milestone.startDate ?? milestone.targetDate ?? "9999-12-31";
}
