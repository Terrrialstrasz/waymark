import { useEffect, useState } from "react";
import type { CurrentExpeditionItem } from "../components/today/__fixtures__/todayExpedition.fixtures";
import type { NextMarkItem, PathDetailItem, PathProofItem } from "../components/paths/types";
import type { Expedition, Memory, Path } from "../domain/waymark";
import { ExpeditionStatus, MarkInstanceStatus } from "../domain/waymark/enums";
import { getMarkMetadata, listDisciplineProofsByTrailDay, projectCharacterFromRecords } from "../lib/waymark";
import type { Locale, PathId } from "../types/ui";
import { useWaymarkApp } from "./WaymarkAppProvider";
import { buildCharacterPathProofItems, buildPathProofItems } from "./readModelProjections";
import { formatLocalDate, mapUiPathId, pathLabelById, shiftLocalDate } from "./waymarkUi";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";

type PathDetailData = {
  path: PathDetailItem | null;
  proofs: PathProofItem[];
  nextMarks: NextMarkItem[];
  expeditions: CurrentExpeditionItem[];
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
              expeditions: await Promise.all(expeditions.map((entry) => mapPathExpeditionToCurrentItem(app, entry, path, locale))),
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
  }, [app, locale, uiPathId]);

  return state;
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

async function mapPathExpeditionToCurrentItem(
  app: ReturnType<typeof useWaymarkApp>,
  expedition: Expedition,
  path: Path,
  locale: Locale,
): Promise<CurrentExpeditionItem> {
  const pathId = mapUiPathId(path.slug, path.title) ?? "career";
  const milestones = await app.repositories.expeditions.listMilestonesByExpedition(expedition.id);
  const firstOpenMilestone = milestones.find((milestone) => milestone.status !== "completed") ?? milestones[0];
  const currentDeadline = firstOpenMilestone?.targetDate ?? expedition.targetDate ?? expedition.targetEndAt;

  return {
    id: expedition.id,
    pathId,
    title: { en: expedition.title, vi: expedition.title },
    milestoneLabel: firstOpenMilestone
      ? {
          en: `Milestone: ${firstOpenMilestone.title}`,
          vi: `Cot moc: ${firstOpenMilestone.title}`,
        }
      : undefined,
    deadlineLabel: currentDeadline
      ? {
          en: `Deadline: ${currentDeadline}`,
          vi: `Han: ${currentDeadline}`,
        }
      : undefined,
    detailEnabled: true,
  };
  void locale;
}
