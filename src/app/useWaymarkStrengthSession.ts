import { useCallback, useEffect, useState } from "react";
import { loadStrengthSessionReadModel, type StrengthSessionReadModel } from "../lib/waymark/shellAppAdapters";
import type { Locale } from "../types/ui";
import { useWaymarkApp } from "./WaymarkAppProvider";

type StrengthSessionState =
  | { status: "idle" | "loading"; error: null; data: StrengthSessionReadModel }
  | { status: "error"; error: Error; data: StrengthSessionReadModel }
  | { status: "ready"; error: null; data: StrengthSessionReadModel };

const EMPTY_STATE: StrengthSessionReadModel = { status: "unavailable", session: null };

export function useWaymarkStrengthSession(locale: Locale, markInstanceId: string | null) {
  const app = useWaymarkApp();
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<StrengthSessionState>({
    status: markInstanceId ? "loading" : "idle",
    error: null,
    data: EMPTY_STATE,
  });

  const refresh = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!markInstanceId) {
      setState({ status: "idle", error: null, data: EMPTY_STATE });
      return;
    }

    void (async () => {
      setState((current) => {
        const hasExistingSession = current.data.status === "ready";
        return hasExistingSession ? { status: "ready", error: null, data: current.data } : { status: "loading", error: null, data: EMPTY_STATE };
      });
      try {
        const data = await loadStrengthSessionReadModel(app, markInstanceId, locale);
        if (!cancelled) {
          setState({ status: "ready", error: null, data });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load strength session."),
            data: EMPTY_STATE,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, locale, markInstanceId, reloadToken]);

  return {
    ...state,
    refresh,
  };
}
