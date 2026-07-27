import { StrengthPrimaryActionResolution, StrengthSessionData } from "./types";
import { getActiveExercise, getActiveStretch, getCurrentSet, getNextExercise, getNextSet, getNextStretch } from "./utils";

const fallbackResolution: StrengthPrimaryActionResolution = {
  labelKey: "continue",
  icon: "health.strength",
  disabled: true,
  actionType: "continue_disabled",
};

export function getStrengthSessionPrimaryAction(sessionState: StrengthSessionData): StrengthPrimaryActionResolution {
  if (!sessionState) {
    return fallbackResolution;
  }

  if (sessionState.sessionComplete || sessionState.phase === "complete") {
    return {
      labelKey: "done",
      icon: "status.done",
      disabled: false,
      actionType: "done",
    };
  }

  if (sessionState.phase === "cooldown") {
    if (sessionState.stretches.length === 0) {
      return {
        labelKey: "finishSession",
        icon: "status.done",
        disabled: false,
        actionType: "finish_session",
      };
    }

    const activeStretch = getActiveStretch(sessionState);
    const nextStretch = getNextStretch(sessionState);
    const doneCount = sessionState.stretches.filter((stretch) => stretch.state === "done").length;

    if (doneCount === sessionState.stretches.length && sessionState.stretches.length > 0) {
      return {
        labelKey: "finishSession",
        icon: "status.done",
        disabled: false,
        actionType: "finish_session",
      };
    }

    if (activeStretch) {
      return {
        labelKey: "completeStretch",
        labelParams: { currentStretchNumber: activeStretch.order },
        icon: "health.cooldown",
        disabled: false,
        actionType: "complete_stretch",
      };
    }

    if (nextStretch) {
      return {
        labelKey: "startStretch",
        labelParams: { nextStretchNumber: nextStretch.order },
        icon: "health.cooldown",
        disabled: false,
        actionType: "start_next_stretch",
      };
    }

    return fallbackResolution;
  }

  if (sessionState.strengthComplete && !sessionState.cooldownStarted) {
    if (sessionState.stretches.length === 0) {
      return {
        labelKey: "finishSession",
        icon: "status.done",
        disabled: false,
        actionType: "finish_session",
      };
    }

    return {
      labelKey: "startCooldown",
      icon: "health.cooldown",
      disabled: false,
      actionType: "start_cooldown",
    };
  }

  const activeExercise = getActiveExercise(sessionState);
  if (!activeExercise) {
    return fallbackResolution;
  }

  if (activeExercise.mode === "timed") {
    if (activeExercise.state === "done" || activeExercise.timer?.state === "completed") {
      if (getNextExercise(sessionState, activeExercise.id)) {
        return {
          labelKey: "nextExercise",
          icon: "health.strength",
          disabled: false,
          actionType: "next_exercise",
        };
      }

      if (sessionState.strengthComplete) {
        if (sessionState.stretches.length > 0) {
          return {
            labelKey: "startCooldown",
            icon: "health.cooldown",
            disabled: false,
            actionType: "start_cooldown",
          };
        }

        return {
          labelKey: "finishSession",
          icon: "status.done",
          disabled: false,
          actionType: "finish_session",
        };
      }
    }

    return {
      labelKey: "completeTimedSet",
      icon: "health.setDone",
      disabled: false,
      actionType: "complete_timed_set",
    };
  }

  if (sessionState.phase === "rest" || activeExercise.state === "rest") {
    const nextSet = getNextSet(activeExercise);
    if (!nextSet) {
      return fallbackResolution;
    }

    return {
      labelKey: "startSet",
      labelParams: { nextSetNumber: nextSet.setNumber },
      icon: "health.strength",
      disabled: false,
      actionType: "start_next_set",
    };
  }

  if (activeExercise.state === "done") {
    if (getNextExercise(sessionState, activeExercise.id)) {
      return {
        labelKey: "nextExercise",
        icon: "health.strength",
        disabled: false,
        actionType: "next_exercise",
      };
    }

    if (sessionState.strengthComplete && sessionState.stretches.length > 0) {
      return {
        labelKey: "startCooldown",
        icon: "health.cooldown",
        disabled: false,
        actionType: "start_cooldown",
      };
    }

    if (sessionState.strengthComplete) {
      return {
        labelKey: "finishSession",
        icon: "status.done",
        disabled: false,
        actionType: "finish_session",
      };
    }
  }

  const currentSet = getCurrentSet(activeExercise);
  if (currentSet && activeExercise.sets) {
    return {
      labelKey: "completeSet",
      labelParams: {
        currentSetNumber: currentSet.setNumber,
        totalSets: activeExercise.sets.length,
      },
      icon: "health.setDone",
      disabled: false,
      actionType: "complete_strength_set",
    };
  }

  const nextSet = getNextSet(activeExercise);
  if (nextSet && activeExercise.sets) {
    return {
      labelKey: "startSet",
      labelParams: {
        nextSetNumber: nextSet.setNumber,
      },
      icon: "health.strength",
      disabled: false,
      actionType: "start_next_set",
    };
  }

  return fallbackResolution;
}
