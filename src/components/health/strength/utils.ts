import { Locale } from "../../../types/ui";
import { getCopy } from "../../../i18n/copy";
import { LocalizedText, StrengthExercise, StrengthSessionData, StretchItem } from "./types";

export function resolveText(value: LocalizedText | undefined, locale: Locale, fallback = "") {
  return value?.[locale] ?? fallback;
}

export function formatTemplate(template: string, params?: Record<string, string | number>) {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template,
  );
}

export function getHealthStrengthCopy(locale: Locale) {
  return getCopy(locale).healthStrength;
}

export function getActiveExercise(session: StrengthSessionData) {
  return session.exercises.find((exercise) => exercise.id === session.activeExerciseId) ?? session.exercises.find((exercise) => exercise.state === "active" || exercise.state === "rest");
}

export function getActiveExerciseIndex(session: StrengthSessionData) {
  const activeExercise = getActiveExercise(session);
  if (!activeExercise) {
    return -1;
  }

  return session.exercises.findIndex((exercise) => exercise.id === activeExercise.id);
}

export function getCurrentSet(exercise?: StrengthExercise) {
  return exercise?.sets?.find((set) => set.state === "active");
}

export function getNextSet(exercise?: StrengthExercise) {
  return exercise?.sets?.find((set) => set.state === "next");
}

export function areAllSetsDone(exercise?: StrengthExercise) {
  return Boolean(exercise?.sets?.length) && exercise?.sets?.every((set) => set.state === "done");
}

export function getNextExercise(session: StrengthSessionData, currentExerciseId?: string) {
  const activeExercise = currentExerciseId ? session.exercises.find((exercise) => exercise.id === currentExerciseId) : getActiveExercise(session);
  if (!activeExercise) {
    return undefined;
  }

  const currentIndex = session.exercises.findIndex((exercise) => exercise.id === activeExercise.id);
  if (currentIndex < 0) {
    return undefined;
  }

  return session.exercises[currentIndex + 1];
}

export function getActiveStretch(session: StrengthSessionData) {
  return session.stretches.find((stretch) => stretch.id === session.activeStretchId) ?? session.stretches.find((stretch) => stretch.state === "active");
}

export function getNextStretch(session: StrengthSessionData) {
  return session.stretches.find((stretch) => stretch.state === "next");
}

export function isStretchComplete(stretch?: StretchItem) {
  return stretch?.state === "done";
}
