import { useMemo, useState } from "react";
import { SignalModeCardModel, SignalModeIntentPayload } from "./signalMode.types";

type ResolveIntent = (payload: SignalModeIntentPayload) => Promise<void> | void;

type ControllerOptions = {
  model: SignalModeCardModel;
  resolveIntent?: ResolveIntent;
};

export function useSignalModeController({ model, resolveIntent }: ControllerOptions) {
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const actions = useMemo(
    () =>
      model.actions.map((action) => ({
        ...action,
        loading: action.id === activeActionId,
        disabled: Boolean(action.disabled) || (activeActionId !== null && activeActionId !== action.id),
      })),
    [activeActionId, model.actions],
  );

  async function handleIntent(payload: SignalModeIntentPayload) {
    const action = model.actions.find((candidate) => candidate.id === payload.actionId);

    if (!action) {
      return;
    }

    if (!resolveIntent || action.disabled) {
      return;
    }

    setActiveActionId(action.id);
    setErrorMessage(null);

    try {
      await resolveIntent({
        ...payload,
        occurredAt: payload.occurredAt ?? new Date().toISOString(),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to resolve signal.");
    } finally {
      setActiveActionId(null);
    }
  }

  return {
    model: {
      ...model,
      status: activeActionId ? "resolving" : model.status,
      errorMessage: errorMessage ?? model.errorMessage,
      actions,
    },
    activeActionId,
    handleIntent,
  };
}
