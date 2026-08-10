import { useCallback, useEffect, useMemo, useState } from "react";
import type { Locale } from "../types/ui";
import { useWaymarkApp } from "./WaymarkAppProvider";
import { type DayReviewData, loadDayReviewData } from "./dayReviewDataLoader";

type DayReviewState =
  | { status: "loading"; error: null; data: null }
  | { status: "error"; error: Error; data: null }
  | { status: "ready"; error: null; data: DayReviewData };

export function useWaymarkDayReview(
  locale: Locale,
  options: { enabled?: boolean; localDate: string | null },
) {
  const app = useWaymarkApp();
  const enabled = options.enabled ?? true;
  const localDate = options.localDate;
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<DayReviewState>({
    status: "loading",
    error: null,
    data: null,
  });

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!enabled || !localDate) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      setState({ status: "loading", error: null, data: null });

      try {
        const data = await loadDayReviewData(app, localDate, locale);
        if (!cancelled) {
          setState({ status: "ready", error: null, data });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load day review."),
            data: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, enabled, localDate, locale, refreshKey]);

  return useMemo(
    () => ({
      ...state,
      refresh,
      localDate,
      marks: state.status === "ready" ? state.data.marks : [],
      hasWeeklyTimetableForDate: state.status === "ready" ? state.data.hasWeeklyTimetableForDate : true,
      plannedItemCount: state.status === "ready" ? state.data.plannedItemCount : 0,
    }),
    [localDate, refresh, state],
  );
}
