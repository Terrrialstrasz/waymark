import { useCallback, useEffect, useState } from "react";
import type { Locale } from "../types/ui";
import {
  optimisticallyClearPackCheckItems,
  optimisticallyTogglePackCheckItem,
} from "./packCheckDetailState";
import {
  clearPackCheckDetail,
  completePackCheckDetail,
  deletePackCheckDetail,
  loadPackCheckDetailReadModel,
  togglePackCheckDetailItem,
} from "../lib/waymark/shellAppAdapters";
import { useWaymarkApp } from "./WaymarkAppProvider";

type PackCheckDetailState =
  | { status: "idle" | "loading"; error: null; data: null | Awaited<ReturnType<typeof loadPackCheckDetailReadModel>> }
  | { status: "error"; error: Error; data: null }
  | { status: "ready"; error: null; data: Awaited<ReturnType<typeof loadPackCheckDetailReadModel>> };

export function useWaymarkPackCheckDetail(locale: Locale, packCheckInstanceId: string | null) {
  const app = useWaymarkApp();
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<PackCheckDetailState>({
    status: packCheckInstanceId ? "loading" : "idle",
    error: null,
    data: null,
  });

  const refresh = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!packCheckInstanceId) {
      setState({ status: "idle", error: null, data: null });
      return;
    }

    void (async () => {
      setState({ status: "loading", error: null, data: null });
      try {
        const loaded = await loadPackCheckDetailReadModel(app, packCheckInstanceId);
        const data =
          loaded?.packCheck?.isReusable &&
          loaded.packCheck.status === "completed" &&
          loaded.items.some((item) => item.checked)
            ? await clearPackCheckDetail(app, packCheckInstanceId)
            : loaded;
        if (!cancelled) {
          setState({ status: "ready", error: null, data });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load pack check detail."),
            data: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, locale, packCheckInstanceId, reloadToken]);

  return {
    ...state,
    refresh,
    async toggleItem(itemId: string, checked: boolean) {
      if (!packCheckInstanceId) {
        return;
      }
      let rollbackData: Awaited<ReturnType<typeof loadPackCheckDetailReadModel>> | null = null;
      setState((current) => {
        if (current.status !== "ready" || !current.data) {
          return current;
        }
        rollbackData = current.data;
        return {
          ...current,
          data: optimisticallyTogglePackCheckItem(current.data, itemId, checked),
        };
      });

      try {
        const data = await togglePackCheckDetailItem(app, packCheckInstanceId, itemId, checked);
        setState((current) =>
          current.status === "ready" && data
            ? {
                ...current,
                data,
              }
            : current,
        );
      } catch (error) {
        if (rollbackData) {
          setState((current) =>
            current.status === "ready"
              ? {
                  ...current,
                  data: rollbackData,
                }
              : current,
          );
        }
        console.error("[PackCheckDetail] Failed to toggle item", error);
        throw error;
      }
    },
    async complete() {
      if (!packCheckInstanceId) {
        return;
      }
      const data = await completePackCheckDetail(app, packCheckInstanceId);
      setState((current) =>
        current.status === "ready" && data
          ? {
              ...current,
              data,
            }
          : current,
      );
    },
    async clearChecks() {
      if (!packCheckInstanceId) {
        return;
      }
      let rollbackData: Awaited<ReturnType<typeof loadPackCheckDetailReadModel>> | null = null;
      setState((current) => {
        if (current.status !== "ready" || !current.data) {
          return current;
        }
        rollbackData = current.data;
        return {
          ...current,
          data: optimisticallyClearPackCheckItems(current.data),
        };
      });

      try {
        const data = await clearPackCheckDetail(app, packCheckInstanceId);
        setState((current) =>
          current.status === "ready" && data
            ? {
                ...current,
                data,
              }
            : current,
        );
      } catch (error) {
        if (rollbackData) {
          setState((current) =>
            current.status === "ready"
              ? {
                  ...current,
                  data: rollbackData,
                }
              : current,
          );
        }
        console.error("[PackCheckDetail] Failed to clear checked items", error);
        throw error;
      }
    },
    async deletePackCheck() {
      if (!packCheckInstanceId) {
        return;
      }
      await deletePackCheckDetail(app, packCheckInstanceId);
      setState({ status: "ready", error: null, data: null });
    },
  };
}
