import { useCallback, useEffect, useMemo, useState } from "react";
import type { CloseTrailFixture } from "../components/close-trail/__fixtures__/closeTrail.fixtures";
import type { TodayMarkItem } from "../components/today/__fixtures__/todayCarousel.fixtures";
import { TrailDayStatus } from "../domain/waymark/enums";
import type { Locale } from "../types/ui";
import { useWaymarkApp } from "./WaymarkAppProvider";
import {
  buildCloseTrailJudgmentFixture,
  buildCloseTrailReviewFixture,
  buildEmptyCloseTrailReviewFixture,
} from "./closeTrailViewModel";

type CloseTrailState =
  | { status: "loading"; error: null; trailDayId: string | null; fixture: CloseTrailFixture | null }
  | { status: "error"; error: Error; trailDayId: string | null; fixture: CloseTrailFixture | null }
  | { status: "ready"; error: null; trailDayId: string; fixture: CloseTrailFixture };

export function useWaymarkCloseTrail(
  locale: Locale,
  marks: TodayMarkItem[],
  todayTrailDayId?: string | null,
  options: { enabled?: boolean } = {},
) {
  const app = useWaymarkApp();
  const enabled = options.enabled ?? true;
  const { closeTrailEngine, repositories, user } = app;
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<CloseTrailState>({
    status: "loading",
    error: null,
    trailDayId: null,
    fixture: null,
  });

  const marksSignature = useMemo(
    () =>
      marks
        .map((mark) => `${mark.id}:${mark.status}:${mark.timeLabel?.en ?? ""}:${mark.timeLabel?.vi ?? ""}`)
        .join("|"),
    [marks],
  );

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
      setState((current) =>
        current.fixture
          ? current
          : {
              status: "loading",
              error: null,
              trailDayId: todayTrailDayId ?? null,
              fixture: null,
            },
      );

      try {
        const now = new Date();
        const trailDay =
          todayTrailDayId
            ? await repositories.trailDays.getTrailDayById(todayTrailDayId)
            : await repositories.trailDays.getOrCreateTrailDay(user.id, formatLocalDate(now, user.timezone));
        if (!trailDay) {
          throw new Error("Trail day is not available.");
        }
        const fixture =
          trailDay.status === TrailDayStatus.Closed ? 
            buildCloseTrailJudgmentFixture(await closeTrailEngine.getCloseTrailJudgment(trailDay.id))
          : buildCloseTrailReviewFixture(
              await closeTrailEngine.getCloseTrailReview(trailDay.id, now.toISOString()),
              marks,
            );

        if (!cancelled) {
          setState({
            status: "ready",
            error: null,
            trailDayId: trailDay.id,
            fixture,
          });
        }
      } catch (error) {
        if (!cancelled) {
          const resolvedError = error instanceof Error ? error : new Error("Failed to load close trail review.");
          setState((current) => ({
            status: "error",
            error: resolvedError,
            trailDayId: todayTrailDayId ?? current.trailDayId,
            fixture: current.fixture ?? buildEmptyCloseTrailReviewFixture(marks),
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [closeTrailEngine, enabled, repositories, user.id, user.timezone, marksSignature, reloadToken, todayTrailDayId]);

  const actions = useMemo(
    () => ({
      refresh,
      async closeDay(input: {
        disciplineSelections?: Array<{ key: string; label: string; pathId: string; expeditionId?: string; milestoneId?: string }>;
        tomorrowFirstStep?: string;
      }) {
        if (state.status !== "ready") {
          return;
        }
        try {
          const result = await closeTrailEngine.closeTrailDay({
            trailDayId: state.trailDayId,
            closedAt: new Date().toISOString(),
            allowUnresolvedMarks: true,
            disciplineSelections: input.disciplineSelections,
            tomorrowFirstStep: input.tomorrowFirstStep,
            resolveSignals: true,
          });
          setState({
            status: "ready",
            error: null,
            trailDayId: result.trailDay.id,
            fixture: buildCloseTrailJudgmentFixture(result.judgment),
          });
        } catch (error) {
          const resolvedError = error instanceof Error ? error : new Error("Failed to close trail day.");
          console.error("[CloseTrail] Failed to close trail day", error);
          setState({
            status: "error",
            error: resolvedError,
            trailDayId: state.trailDayId,
            fixture: state.fixture,
          });
          throw resolvedError;
        }
      },
    }),
    [closeTrailEngine, refresh, state],
  );

  return {
    ...state,
    ...actions,
  };
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
