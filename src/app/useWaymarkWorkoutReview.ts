import { useEffect, useState } from "react";
import type { Locale } from "../types/ui";
import { loadWorkoutReviewData, type WorkoutReviewData } from "./workoutReviewDataLoader";
import { useWaymarkApp } from "./WaymarkAppProvider";

type WorkoutReviewState =
  | { status: "idle" | "loading"; data: null; error: null }
  | { status: "ready"; data: WorkoutReviewData | null; error: null }
  | { status: "error"; data: null; error: Error };

export function useWaymarkWorkoutReview(
  locale: Locale,
  markId: string | null,
  routineTemplateId?: string,
) {
  const app = useWaymarkApp();
  const [state, setState] = useState<WorkoutReviewState>({ status: markId ? "loading" : "idle", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    if (!markId) {
      setState({ status: "idle", data: null, error: null });
      return;
    }

    setState({ status: "loading", data: null, error: null });
    void loadWorkoutReviewData(app, markId, locale, routineTemplateId)
      .then((data) => {
        if (!cancelled) {
          setState({ status: "ready", data, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ status: "error", data: null, error: error instanceof Error ? error : new Error("Unable to load workout review.") });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [app, locale, markId, routineTemplateId]);

  return state;
}
