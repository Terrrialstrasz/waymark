import { useEffect, useMemo, useState } from "react";
import { PathRowItem, PathStatCardItem } from "../components/paths/types";
import type { MarkInstance, Path } from "../domain/waymark";
import { MarkInstanceStatus } from "../domain/waymark";
import { getPathsCopy } from "../i18n/pathsCopy";
import type { Locale, PathId, PathPulse } from "../types/ui";
import { useWaymarkApp } from "./WaymarkAppProvider";
import { formatLocalDate, getWeekStartDate, mapUiPathId, shiftLocalDate } from "./waymarkUi";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";

type PathsState =
  | { status: "loading"; error: null; paths: Path[]; proofStatsByPathId: Record<string, PathProofStats> }
  | { status: "error"; error: Error; paths: Path[]; proofStatsByPathId: Record<string, PathProofStats> }
  | { status: "ready"; error: null; paths: Path[]; proofStatsByPathId: Record<string, PathProofStats> };

type InternalPathPulseStatus = "protected" | "alive" | "growing" | "sleeping" | "repair";

type PathProofStats = {
  proofCountWeek: number;
  proofDaysWeek: number;
  deepProofCountWeek: number;
  lastProofDate: string | null;
  daysSinceLastProof: number | null;
  weeklyMinimum: number;
  expectedProofsSoFar: number;
  strengthScore: number;
  weaknessScore: number;
  internalStatus: InternalPathPulseStatus;
  uiStatus: PathPulse;
  mapOrder: number;
};

type PathRowWithStats = PathRowItem & {
  proofStats: PathProofStats;
};

const weakAfterDays = 7;
const aliveStatuses = new Set<PathPulse>(["protected", "alive", "growing"]);
const statusRank: Record<PathPulse, number> = {
  neglected: 5,
  weak: 4,
  growing: 3,
  alive: 2,
  protected: 1,
};

export function useWaymarkPaths(locale: Locale, options: { enabled?: boolean } = {}) {
  const app = useWaymarkApp();
  const enabled = options.enabled ?? true;
  const [state, setState] = useState<PathsState>({
    status: "loading",
    error: null,
    paths: [],
    proofStatsByPathId: {},
  });

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      setState({ status: "loading", error: null, paths: [], proofStatsByPathId: {} });

      try {
        const paths = await app.repositories.paths.listActivePaths(app.user.id);
        const proofStatsByPathId = await loadProofStatsByPath(app, paths);
        if (!cancelled) {
          setState({ status: "ready", error: null, paths, proofStatsByPathId });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load paths."),
            paths: [],
            proofStatsByPathId: {},
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, enabled]);

  const pathRows = useMemo(
    (): PathRowWithStats[] =>
      state.paths.flatMap((path) => {
        const pathId = mapUiPathId(path.slug, path.title);
        const visual = pathId ? todayPathHeroPaths.find((entry) => entry.id === pathId) : null;
        if (!pathId || !visual) {
          return [];
        }
        const proofStats = state.proofStatsByPathId[path.id] ?? createEmptyProofStats(path);
        return [
          {
            id: path.id,
            pathId,
            title: visual.label,
            question: visual.subtitle,
            status: proofStats.uiStatus,
            markCount: proofStats.proofCountWeek,
            proofStats,
          },
        ];
      }),
    [state.paths, state.proofStatsByPathId],
  );

  const stats = useMemo(() => {
    const alivePathRows = pathRows.filter((path) => aliveStatuses.has(path.status));
    const countLabel = String(alivePathRows.length);
    const strongest = [...pathRows].sort(compareStrongest)[0] ?? pathRows[0];
    const weakest = [...pathRows].sort(compareWeakest)[0] ?? pathRows[pathRows.length - 1] ?? pathRows[0];

    return [
      {
        id: "active-paths",
        label: localizedStatLabel("pathAlive"),
        value: { en: countLabel, vi: countLabel },
        backgroundIconSemanticName: "judgment.trailResult",
      },
      {
        id: "strongest-path",
        label: localizedStatLabel("strongest"),
        value: strongest ? localizedPathShortName(strongest.pathId) : localizedEmptyValue(),
        backgroundIconSemanticName: "judgment.protectedCharacter",
      },
      {
        id: "weakest-path",
        label: localizedStatLabel("weakest"),
        value: weakest ? localizedPathShortName(weakest.pathId) : localizedEmptyValue(),
        backgroundIconSemanticName: "judgment.repairPath",
      },
    ] satisfies PathStatCardItem[];
  }, [pathRows]);

  return {
    ...state,
    pathRows,
    stats,
  };
}

function createEmptyProofStats(path: Path): PathProofStats {
  return {
    proofCountWeek: 0,
    proofDaysWeek: 0,
    deepProofCountWeek: 0,
    lastProofDate: null,
    daysSinceLastProof: null,
    weeklyMinimum: getWeeklyMinimumForPath(path),
    expectedProofsSoFar: 1,
    strengthScore: 0,
    weaknessScore: 140,
    internalStatus: "repair",
    uiStatus: "neglected",
    mapOrder: path.sortOrder,
  };
}

async function loadProofStatsByPath(app: ReturnType<typeof useWaymarkApp>, paths: Path[]) {
  const today = formatLocalDate(new Date(), app.user.timezone);
  const weekStart = getWeekStartDate(today, app.user.weekStartsOn);
  const lookbackDays = weakAfterDays * 2 + 1;
  const rangeStart = minLocalDate(weekStart, shiftLocalDate(today, -lookbackDays));
  const dates = getLocalDateRange(rangeStart, today);
  const marksByDay = await Promise.all(
    dates.map(async (date) => ({
      date,
      marks: await app.repositories.marks.listMarkInstancesByDate(app.user.id, date),
    })),
  );
  const elapsedDaysInWeek = getElapsedDaysInWeek(today, weekStart);
  const weeklyProofDaysByPathId: Record<string, Set<string>> = {};
  const draftStatsByPathId: Record<string, Omit<PathProofStats, "strengthScore" | "weaknessScore" | "internalStatus" | "uiStatus">> = {};

  for (const path of paths) {
    const weeklyMinimum = getWeeklyMinimumForPath(path);
    draftStatsByPathId[path.id] = {
      proofCountWeek: 0,
      proofDaysWeek: 0,
      deepProofCountWeek: 0,
      lastProofDate: null,
      daysSinceLastProof: null,
      weeklyMinimum,
      expectedProofsSoFar: Math.max(1, Math.ceil((weeklyMinimum * elapsedDaysInWeek) / 7)),
      mapOrder: path.sortOrder,
    };
    weeklyProofDaysByPathId[path.id] = new Set<string>();
  }

  for (const { date, marks } of marksByDay) {
    for (const mark of marks) {
      if (!isWeeklyProofMark(mark)) {
        continue;
      }

      const existingStats = draftStatsByPathId[mark.pathId];
      if (!existingStats) {
        continue;
      }

      if (!existingStats.lastProofDate || date > existingStats.lastProofDate) {
        existingStats.lastProofDate = date;
      }

      if (date >= weekStart && date <= today) {
        existingStats.proofCountWeek += 1;
        weeklyProofDaysByPathId[mark.pathId]?.add(date);

        if (isDeepProofMark(mark)) {
          existingStats.deepProofCountWeek += 1;
        }
      }
    }
  }

  return Object.fromEntries(
    Object.entries(draftStatsByPathId).map(([pathId, draftStats]) => {
      const proofDaysWeek = weeklyProofDaysByPathId[pathId]?.size ?? 0;
      const daysSinceLastProof = draftStats.lastProofDate ? getLocalDateDiffDays(draftStats.lastProofDate, today) : null;
      const strengthScore = calculateStrengthScore({
        ...draftStats,
        proofDaysWeek,
        daysSinceLastProof,
        elapsedDaysInWeek,
      });
      const internalStatus = derivePathStatus({
        proofCountWeek: draftStats.proofCountWeek,
        daysSinceLastProof,
        expectedProofsSoFar: draftStats.expectedProofsSoFar,
        weakAfterDays,
        isProtectedPath: isProtectedPathId(pathId),
      });
      const weaknessScore = calculateWeaknessScore(strengthScore, daysSinceLastProof);

      return [
        pathId,
        {
          ...draftStats,
          proofDaysWeek,
          daysSinceLastProof,
          strengthScore,
          weaknessScore,
          internalStatus,
          uiStatus: toUiPathPulse(internalStatus),
        },
      ];
    }),
  );
}

function isWeeklyProofMark(mark: MarkInstance) {
  return (
    (mark.status === MarkInstanceStatus.Completed || mark.status === MarkInstanceStatus.PartiallyCompleted) ||
    Boolean(mark.completedAt) ||
    Boolean(mark.proofNote?.trim()) ||
    Boolean(mark.completionSummary?.trim()) ||
    mark.proofMediaAssetIds.length > 0
  );
}

function isDeepProofMark(mark: MarkInstance) {
  return Boolean(mark.proofNote?.trim()) || Boolean(mark.completionSummary?.trim()) || mark.proofMediaAssetIds.length > 0;
}

function getWeeklyMinimumForPath(_path: Path) {
  return 1;
}

function isProtectedPathId(_pathId: string) {
  return false;
}

function derivePathStatus(input: {
  proofCountWeek: number;
  daysSinceLastProof: number | null;
  expectedProofsSoFar: number;
  weakAfterDays: number;
  isProtectedPath: boolean;
}): InternalPathPulseStatus {
  const hasProofThisWeek = input.proofCountWeek > 0;
  const hasRecentProof = input.daysSinceLastProof !== null && input.daysSinceLastProof <= input.weakAfterDays;
  const meetsExpectedPace = input.proofCountWeek >= input.expectedProofsSoFar;

  if (input.isProtectedPath && meetsExpectedPace) {
    return "protected";
  }

  if (meetsExpectedPace) {
    return "alive";
  }

  if (hasProofThisWeek || hasRecentProof) {
    return "growing";
  }

  if (input.daysSinceLastProof !== null && input.daysSinceLastProof <= input.weakAfterDays * 2) {
    return "sleeping";
  }

  return "repair";
}

function toUiPathPulse(status: InternalPathPulseStatus): PathPulse {
  switch (status) {
    case "sleeping":
      return "weak";
    case "repair":
      return "neglected";
    default:
      return status;
  }
}

function calculateStrengthScore(input: {
  proofCountWeek: number;
  proofDaysWeek: number;
  deepProofCountWeek: number;
  daysSinceLastProof: number | null;
  weeklyMinimum: number;
  expectedProofsSoFar: number;
  elapsedDaysInWeek: number;
}) {
  const paceScore = clamp(input.proofCountWeek / input.expectedProofsSoFar, 0, 1);
  const expectedActiveDaysSoFar = Math.min(input.elapsedDaysInWeek, Math.max(1, Math.min(input.weeklyMinimum, 3)));
  const consistencyScore = clamp(input.proofDaysWeek / expectedActiveDaysSoFar, 0, 1);
  const recencyScore =
    input.daysSinceLastProof === null ? 0
    : input.daysSinceLastProof === 0 ? 1
    : input.daysSinceLastProof <= 2 ? 0.75
    : input.daysSinceLastProof <= 7 ? 0.45
    : input.daysSinceLastProof <= weakAfterDays ? 0.25
    : 0;
  const depthScore = clamp(input.deepProofCountWeek / 2, 0, 1);

  return Math.round(100 * (0.45 * paceScore + 0.3 * consistencyScore + 0.2 * recencyScore + 0.05 * depthScore));
}

function calculateWeaknessScore(strengthScore: number, daysSinceLastProof: number | null) {
  const stalePenalty =
    daysSinceLastProof === null ? 40
    : daysSinceLastProof > weakAfterDays * 2 ? 40
    : daysSinceLastProof > weakAfterDays ? 25
    : 0;

  return 100 - strengthScore + stalePenalty;
}

function compareStrongest(left: PathRowWithStats, right: PathRowWithStats) {
  if (right.proofStats.strengthScore !== left.proofStats.strengthScore) {
    return right.proofStats.strengthScore - left.proofStats.strengthScore;
  }

  if (right.proofStats.proofDaysWeek !== left.proofStats.proofDaysWeek) {
    return right.proofStats.proofDaysWeek - left.proofStats.proofDaysWeek;
  }

  if (right.proofStats.proofCountWeek !== left.proofStats.proofCountWeek) {
    return right.proofStats.proofCountWeek - left.proofStats.proofCountWeek;
  }

  return compareLastProofDesc(left.proofStats, right.proofStats) || left.proofStats.mapOrder - right.proofStats.mapOrder;
}

function compareWeakest(left: PathRowWithStats, right: PathRowWithStats) {
  if (statusRank[right.status] !== statusRank[left.status]) {
    return statusRank[right.status] - statusRank[left.status];
  }

  if (right.proofStats.weaknessScore !== left.proofStats.weaknessScore) {
    return right.proofStats.weaknessScore - left.proofStats.weaknessScore;
  }

  const leftDays = left.proofStats.daysSinceLastProof ?? Number.POSITIVE_INFINITY;
  const rightDays = right.proofStats.daysSinceLastProof ?? Number.POSITIVE_INFINITY;
  if (rightDays !== leftDays) {
    return rightDays - leftDays;
  }

  if (left.proofStats.proofDaysWeek !== right.proofStats.proofDaysWeek) {
    return left.proofStats.proofDaysWeek - right.proofStats.proofDaysWeek;
  }

  return left.proofStats.mapOrder - right.proofStats.mapOrder;
}

function compareLastProofDesc(left: PathProofStats, right: PathProofStats) {
  if (left.lastProofDate === right.lastProofDate) {
    return 0;
  }

  if (left.lastProofDate === null) {
    return 1;
  }

  if (right.lastProofDate === null) {
    return -1;
  }

  return right.lastProofDate.localeCompare(left.lastProofDate);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getElapsedDaysInWeek(today: string, weekStart: string) {
  return clamp(getLocalDateDiffDays(weekStart, today) + 1, 1, 7);
}

function getLocalDateRange(start: string, end: string) {
  const dayCount = getLocalDateDiffDays(start, end) + 1;
  return Array.from({ length: Math.max(0, dayCount) }, (_, index) => shiftLocalDate(start, index));
}

function minLocalDate(left: string, right: string) {
  return left <= right ? left : right;
}

function getLocalDateDiffDays(start: string, end: string) {
  return Math.round((getLocalDateUtcMs(end) - getLocalDateUtcMs(start)) / 86400000);
}

function getLocalDateUtcMs(localDate: string) {
  return new Date(`${localDate}T00:00:00.000Z`).getTime();
}

function localizedStatLabel(key: "pathAlive" | "strongest" | "weakest") {
  return {
    en: getPathsCopy("en").overview.stats[key],
    vi: getPathsCopy("vi").overview.stats[key],
  };
}

function localizedPathShortName(pathId: PathId) {
  return {
    en: getPathsCopy("en").pathShortNames[pathId],
    vi: getPathsCopy("vi").pathShortNames[pathId],
  };
}

function localizedEmptyValue() {
  return {
    en: getPathsCopy("en").stats.emptyValue,
    vi: getPathsCopy("vi").stats.emptyValue,
  };
}
