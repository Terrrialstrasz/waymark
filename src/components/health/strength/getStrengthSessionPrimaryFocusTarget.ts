import { StrengthPrimaryActionResolution, StrengthSessionData } from "./types";
import { getActiveExercise, getActiveStretch, getCurrentSet, getNextStretch } from "./utils";

export type StrengthPrimaryFocusAlignment = "upper-middle" | "center" | "top";

export type StrengthPrimaryFocusTarget = {
  focusKey: string;
  anchorKey: string;
  targetType: string;
  preferredAlignment: StrengthPrimaryFocusAlignment;
  debugLabel: string;
};

export function getStrengthSessionPrimaryFocusTarget(
  session: StrengthSessionData,
  primaryAction: StrengthPrimaryActionResolution,
): StrengthPrimaryFocusTarget | null {
  const activeExercise = getActiveExercise(session);
  const currentSet = getCurrentSet(activeExercise);
  const activeStretch = getActiveStretch(session);
  const nextStretch = getNextStretch(session);

  switch (primaryAction.actionType) {
    case "complete_strength_set":
      if (!activeExercise || !currentSet) {
        return null;
      }
      return {
        focusKey: `complete_strength_set:${activeExercise.id}:set-${currentSet.setNumber}`,
        anchorKey: `complete_strength_set:${activeExercise.id}:set-${currentSet.setNumber}`,
        targetType: "set",
        preferredAlignment: "upper-middle",
        debugLabel: `Complete Set ${currentSet.setNumber}`,
      };
    case "start_next_set":
      if (!activeExercise || activeExercise.completedSetNumber == null) {
        return null;
      }
      return {
        focusKey: `start_next_set:${activeExercise.id}:after-set-${activeExercise.completedSetNumber}`,
        anchorKey: `start_next_set:${activeExercise.id}:after-set-${activeExercise.completedSetNumber}`,
        targetType: "rest_panel",
        preferredAlignment: "center",
        debugLabel: `Start Set after ${activeExercise.completedSetNumber}`,
      };
    case "next_exercise":
      if (!activeExercise) {
        return null;
      }
      return {
        focusKey: `next_exercise:${activeExercise.id}`,
        anchorKey: `next_exercise:${activeExercise.id}:final-set`,
        targetType: "exercise_transition",
        preferredAlignment: "center",
        debugLabel: "Next Exercise",
      };
    case "start_cooldown":
      return {
        focusKey: "start_cooldown:session-main",
        anchorKey: "start_cooldown:session-main",
        targetType: "cooldown_intro",
        preferredAlignment: "center",
        debugLabel: "Start Cooldown",
      };
    case "complete_timed_set":
      if (!activeExercise) {
        return null;
      }
      return {
        focusKey: `complete_timed_set:${activeExercise.id}`,
        anchorKey: `complete_timed_set:${activeExercise.id}`,
        targetType: "timed_exercise",
        preferredAlignment: "center",
        debugLabel: "Complete Timed Set",
      };
    case "complete_stretch":
      if (!activeStretch) {
        return null;
      }
      return {
        focusKey: `complete_stretch:${activeStretch.id}`,
        anchorKey: `complete_stretch:${activeStretch.id}`,
        targetType: "stretch_timer",
        preferredAlignment: "center",
        debugLabel: "Complete Stretch",
      };
    case "start_next_stretch":
      if (!nextStretch) {
        return null;
      }
      return {
        focusKey: `start_next_stretch:${nextStretch.id}`,
        anchorKey: `start_next_stretch:${nextStretch.id}`,
        targetType: "stretch_transition",
        preferredAlignment: "center",
        debugLabel: "Start Next Stretch",
      };
    case "finish_session":
      return {
        focusKey: "finish_session:cooldown-final",
        anchorKey: "finish_session:cooldown-final",
        targetType: "cooldown_complete",
        preferredAlignment: "center",
        debugLabel: "Finish Session",
      };
    case "done":
      return {
        focusKey: "done:session-complete",
        anchorKey: "done:session-complete",
        targetType: "session_complete",
        preferredAlignment: "center",
        debugLabel: "Done",
      };
    default:
      return {
        focusKey: `continue_disabled:${session.phase}`,
        anchorKey: "continue_disabled:session",
        targetType: "fallback",
        preferredAlignment: "top",
        debugLabel: "Continue disabled",
      };
  }
}
