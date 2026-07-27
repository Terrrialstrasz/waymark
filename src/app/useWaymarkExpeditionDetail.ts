import { useCallback, useEffect, useState } from "react";
import { ExpeditionDetailItem, ExpeditionMilestoneItem } from "../components/expeditions/types";
import { MilestoneStatus } from "../domain/waymark/enums";
import type { Locale } from "../types/ui";
import { useWaymarkApp } from "./WaymarkAppProvider";
import { repairWeeklyTimetableMilestoneLinksForExpedition } from "../lib/waymark";
import { buildExpeditionDetailModel } from "./expeditionDetailModel";
import { formatLocalDate, shiftLocalDate } from "./waymarkUi";

type ExpeditionDetailState =
  | { status: "idle" | "loading"; error: null; expedition: ExpeditionDetailItem | null; milestones: ExpeditionMilestoneItem[] }
  | { status: "error"; error: Error; expedition: null; milestones: ExpeditionMilestoneItem[] }
  | { status: "ready"; error: null; expedition: ExpeditionDetailItem | null; milestones: ExpeditionMilestoneItem[] };

export function useWaymarkExpeditionDetail(locale: Locale, expeditionId: string | null) {
  const app = useWaymarkApp();
  const [state, setState] = useState<ExpeditionDetailState>({
    status: expeditionId ? "loading" : "idle",
    error: null,
    expedition: null,
    milestones: [],
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!expeditionId) {
      setState({ status: "idle", error: null, expedition: null, milestones: [] });
      return;
    }

    void (async () => {
      setState({ status: "loading", error: null, expedition: null, milestones: [] });

      try {
        const expedition = await app.repositories.expeditions.getExpeditionById(expeditionId);
        if (!expedition) {
          if (!cancelled) {
            setState({ status: "ready", error: null, expedition: null, milestones: [] });
          }
          return;
        }

        await repairWeeklyTimetableMilestoneLinksForExpedition(app.repositories, expedition.userId, expedition.id);

        const path = await app.repositories.paths.getPathById(expedition.pathId);
        const milestones = await app.repositories.expeditions.listMilestonesByExpedition(expedition.id);
        const milestoneMarks = await Promise.all(
          milestones.map(async (milestone) => [milestone.id, await app.repositories.marks.listMarkInstancesByMilestone(milestone.id)] as const),
        );
        const detail = buildExpeditionDetailModel(expedition, path, milestones, new Map(milestoneMarks), locale);

        if (!cancelled) {
          setState({
            status: "ready",
            error: null,
            expedition: detail.expedition,
            milestones: detail.milestones,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load expedition detail."),
            expedition: null,
            milestones: [],
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, expeditionId, locale, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  const completeMilestone = useCallback(
    async (milestoneId: string) => {
      await app.repositories.expeditions.updateMilestone(milestoneId, {
        status: MilestoneStatus.Completed,
        completedAt: new Date().toISOString(),
      });
      refresh();
    },
    [app.repositories.expeditions, refresh],
  );

  const skipMilestone = useCallback(
    async (milestoneId: string) => {
      await app.repositories.expeditions.updateMilestone(milestoneId, {
        status: MilestoneStatus.Missed,
        completedAt: null,
      });
      refresh();
    },
    [app.repositories.expeditions, refresh],
  );

  const rescheduleMilestone = useCallback(
    async (milestoneId: string) => {
      const milestone = state.milestones.find((item) => item.id === milestoneId);
      const currentTargetDate = toLocalDateString(milestone?.endDate) ?? formatLocalDate(new Date(), app.user.timezone);
      await app.repositories.expeditions.updateMilestone(milestoneId, {
        status: MilestoneStatus.Active,
        targetDate: shiftLocalDate(currentTargetDate, 7),
        completedAt: null,
      });
      refresh();
    },
    [app.repositories.expeditions, app.user.timezone, refresh, state.milestones],
  );

  return {
    ...state,
    completeMilestone,
    skipMilestone,
    rescheduleMilestone,
  };
}

function toLocalDateString(value: string | Date | undefined) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}
