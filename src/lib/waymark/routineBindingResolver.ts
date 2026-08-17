import {
  MarkInstance,
  WorkoutRoutineTemplate,
  WorkoutRoutineType,
  WorkoutSessionStatus,
  WaymarkRepositories,
} from "../../domain/waymark";

export type RoutineExecutionKind = "strength" | "golf_practice";

export type RoutineBindingSource =
  | "existing_session"
  | "explicit_selection"
  | "mark_template"
  | "planning_template"
  | "exact_title"
  | "legacy_title_alias"
  | "single_path_routine";

export type RoutineBindingResolution = {
  routine: WorkoutRoutineTemplate;
  source: RoutineBindingSource;
  effectiveTemplateId?: string;
};

export class RoutineBindingResolutionError extends Error {
  constructor(
    readonly markId: string,
    readonly kind: RoutineExecutionKind,
    readonly reason: "unresolved" | "ambiguous" | "invalid_explicit_selection",
    readonly candidateRoutineIds: string[],
  ) {
    super(
      `Could not resolve ${kind} routine for Mark ${markId} (${reason}; candidates: ${candidateRoutineIds.join(", ") || "none"}).`,
    );
    this.name = "RoutineBindingResolutionError";
  }
}

export function normalizeRoutineBindingText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isFinalSessionStatus(status: WorkoutSessionStatus): boolean {
  return (
    status === WorkoutSessionStatus.Completed ||
    status === WorkoutSessionStatus.PartiallyCompleted ||
    status === WorkoutSessionStatus.Abandoned
  );
}

function filterRoutines(routines: WorkoutRoutineTemplate[], kind: RoutineExecutionKind) {
  return routines.filter(
    (routine) =>
      routine.isActive &&
      (kind === "golf_practice"
        ? routine.routineType === WorkoutRoutineType.GolfPractice
        : routine.routineType !== WorkoutRoutineType.GolfPractice),
  );
}

function resolveUnique(
  matches: WorkoutRoutineTemplate[],
  source: RoutineBindingSource,
  mark: MarkInstance,
  kind: RoutineExecutionKind,
  effectiveTemplateId?: string,
): RoutineBindingResolution | undefined {
  if (matches.length === 1) {
    return { routine: matches[0]!, source, effectiveTemplateId };
  }
  if (matches.length > 1) {
    throw new RoutineBindingResolutionError(mark.id, kind, "ambiguous", matches.map((item) => item.id));
  }
  return undefined;
}

function legacyAliasMatches(
  markTitle: string,
  routines: WorkoutRoutineTemplate[],
  kind: RoutineExecutionKind,
): WorkoutRoutineTemplate[] {
  const title = normalizeRoutineBindingText(markTitle);
  const normalized = routines.map((routine) => ({ routine, title: normalizeRoutineBindingText(routine.title) }));

  if (kind === "golf_practice") {
    if (title.includes("putt") || title.includes("short game")) {
      return normalized.filter((item) => item.title.includes("putt")).map((item) => item.routine);
    }
    if (title.includes("chip")) {
      const distances = ["3", "5", "7"].filter((distance) => new RegExp(`(?:^| )${distance}(?: |$)`).test(title));
      return normalized
        .filter((item) => {
          if (!item.title.includes("chip")) return false;
          if (distances.length === 0) return true;
          const routineDistances = ["3", "5", "7"].filter((distance) => new RegExp(`(?:^| )${distance}(?: |$)`).test(item.title));
          return routineDistances.length === distances.length && distances.every((distance) => routineDistances.includes(distance));
        })
        .map((item) => item.routine);
    }
    if (
      title.includes("swing") ||
      title.includes("golf") ||
      title.includes("snag launcher") ||
      title.includes("snag roller") ||
      title.includes("snag snapper")
    ) {
      return normalized
        .filter(
          (item) =>
            item.title === "golf practice swing" ||
            item.routine.id.toLowerCase().includes("golf_practice_swing"),
        )
        .map((item) => item.routine);
    }
    return [];
  }

  if (title.includes("workout minimal") || title.includes("body weight") || title.includes("bodyweight")) {
    return normalized
      .filter((item) => item.title.includes("home workout") || item.title.includes("body weight") || item.title.includes("bodyweight"))
      .map((item) => item.routine);
  }
  if (title.includes("day a1") || title.includes("workout a1")) {
    return normalized.filter((item) => item.title.includes("day a1")).map((item) => item.routine);
  }
  if (title.includes("day a2") || title.includes("workout a2")) {
    return normalized.filter((item) => item.title.includes("day a2")).map((item) => item.routine);
  }
  if (title.includes("day b") || title.includes("workout b")) {
    return normalized.filter((item) => item.title.includes("day b")).map((item) => item.routine);
  }
  if (title.includes("day a") || title.includes("workout a")) {
    const a1 = normalized.filter((item) => item.title.includes("day a1")).map((item) => item.routine);
    return a1.length > 0 ? a1 : normalized.filter((item) => item.title.includes("day a")).map((item) => item.routine);
  }
  if (title.includes("walk")) {
    return normalized.filter((item) => item.routine.routineType === WorkoutRoutineType.Walk || item.title.includes("walk")).map((item) => item.routine);
  }
  return [];
}

export function findRoutineBindingByTitle(
  markTitle: string,
  routines: WorkoutRoutineTemplate[],
  kind: RoutineExecutionKind,
): WorkoutRoutineTemplate | undefined {
  const eligible = filterRoutines(routines, kind);
  const normalizedTitle = normalizeRoutineBindingText(markTitle);
  const exact = eligible.filter((item) => normalizeRoutineBindingText(item.title) === normalizedTitle);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return undefined;
  const aliased = legacyAliasMatches(markTitle, eligible, kind);
  return aliased.length === 1 ? aliased[0] : undefined;
}

export async function resolveRoutineBinding(
  repositories: WaymarkRepositories,
  mark: MarkInstance,
  kind: RoutineExecutionKind,
  explicitRoutineTemplateId?: string,
  options: { preferExistingSession?: boolean } = {},
): Promise<RoutineBindingResolution> {
  const routines = filterRoutines(await repositories.strength.listRoutinesByPath(mark.pathId), kind);
  const candidateIds = routines.map((item) => item.id);
  const existingSession = await repositories.strength.getSessionByMarkInstance(mark.id);

  if (options.preferExistingSession !== false && existingSession && !isFinalSessionStatus(existingSession.status)) {
    const routine = routines.find((item) => item.id === existingSession.routineTemplateId);
    if (routine) {
      return { routine, source: "existing_session", effectiveTemplateId: mark.templateId ?? undefined };
    }
  }

  if (explicitRoutineTemplateId) {
    const routine = routines.find((item) => item.id === explicitRoutineTemplateId);
    if (!routine) {
      throw new RoutineBindingResolutionError(mark.id, kind, "invalid_explicit_selection", candidateIds);
    }
    return { routine, source: "explicit_selection", effectiveTemplateId: mark.templateId ?? undefined };
  }

  const planningItem = await repositories.weekPlans.findActiveItemByCreatedMarkInstanceId(mark.id);
  const effectiveTemplateId = mark.templateId ?? planningItem?.templateId ?? undefined;
  if (effectiveTemplateId) {
    const byTemplate = resolveUnique(
      routines.filter((item) => item.markTemplateId === effectiveTemplateId),
      mark.templateId ? "mark_template" : "planning_template",
      mark,
      kind,
      effectiveTemplateId,
    );
    if (byTemplate) return byTemplate;
  }

  const normalizedTitle = normalizeRoutineBindingText(mark.title);
  const exactMatches = routines.filter((item) => normalizeRoutineBindingText(item.title) === normalizedTitle);
  const exact = resolveUnique(exactMatches, "exact_title", mark, kind, effectiveTemplateId);
  if (exact) return exact;

  const aliased = resolveUnique(legacyAliasMatches(mark.title, routines, kind), "legacy_title_alias", mark, kind, effectiveTemplateId);
  if (aliased) return aliased;

  if (routines.length === 1) {
    return { routine: routines[0]!, source: "single_path_routine", effectiveTemplateId };
  }

  throw new RoutineBindingResolutionError(mark.id, kind, "unresolved", candidateIds);
}
