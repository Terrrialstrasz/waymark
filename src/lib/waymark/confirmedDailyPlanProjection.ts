import type { MarkInstance } from "../../domain/waymark";
import { MarkInstanceStatus } from "../../domain/waymark/enums";
import type { EffectiveDailyPlan } from "./dailyPlanEngine";
import type { DailyReplanConfirmedPlanEntry } from "./dailyReplanStateStore";
import { EFFECTIVE_DAILY_MARK_STATUSES, type PlannedMarkLineage } from "./plannedMarkLineage";

export const UNRESOLVED_CONFIRMED_PLAN_STATUSES = new Set<MarkInstanceStatus>([
  MarkInstanceStatus.Planned,
  MarkInstanceStatus.Ready,
  MarkInstanceStatus.Blocked,
  MarkInstanceStatus.Active,
]);

export type ConfirmedDailyPlanProjectionEntry = {
  rootMarkId: string;
  baselineLeafMarkId: string;
  baselineMark: MarkInstance;
  currentLeaf: MarkInstance;
  lineage: PlannedMarkLineage;
  postConfirmChain: MarkInstance[];
  outcomeMark: MarkInstance;
  skippedMark?: MarkInstance;
  movedMark?: MarkInstance;
  substitutedMark?: MarkInstance;
  completed: boolean;
  partiallyCompleted: boolean;
  expired: boolean;
  cancelled: boolean;
  unresolved: boolean;
};

export type ConfirmedDailyPlanProjection = {
  entries: ConfirmedDailyPlanProjectionEntry[];
  initialCandidateCount: number;
  replanExcludedCount: number;
  confirmedPlannedCount: number;
  completedCount: number;
  partiallyCompletedCount: number;
  skippedAfterConfirmCount: number;
  movedAfterConfirmCount: number;
  substitutedAfterConfirmCount: number;
  expiredCount: number;
  cancelledCount: number;
  unresolvedCount: number;
};

function compareIsoTime(left: string | undefined, right: string): number {
  if (!left) {
    return 1;
  }
  const leftEpoch = Date.parse(left);
  const rightEpoch = Date.parse(right);
  if (!Number.isNaN(leftEpoch) && !Number.isNaN(rightEpoch)) {
    return leftEpoch - rightEpoch;
  }
  return left.localeCompare(right);
}

function occurredAtOrBefore(mark: MarkInstance, confirmedAt: string) {
  const occurredAt =
    mark.status === MarkInstanceStatus.Skipped ? mark.skippedAt
    : mark.status === MarkInstanceStatus.Expired ? mark.expiredAt
    : mark.updatedAt;
  return compareIsoTime(occurredAt, confirmedAt) <= 0;
}

function legacyBaselineEntry(
  lineage: PlannedMarkLineage,
  trailDayId: string,
  confirmedAt: string,
): DailyReplanConfirmedPlanEntry | null {
  let baselineIndex = 0;
  for (let index = 0; index < lineage.chain.length - 1; index += 1) {
    const node = lineage.chain[index];
    const successor = lineage.chain[index + 1];
    if (node.status !== MarkInstanceStatus.Rescheduled && node.status !== MarkInstanceStatus.Substituted) {
      break;
    }
    if (occurredAtOrBefore(node, confirmedAt) && compareIsoTime(successor.createdAt, confirmedAt) <= 0) {
      baselineIndex = index + 1;
      continue;
    }
    break;
  }

  const baseline = lineage.chain[baselineIndex];
  if (baseline.trailDayId !== trailDayId) {
    return null;
  }
  if (
    baseline.status === MarkInstanceStatus.Skipped &&
    occurredAtOrBefore(baseline, confirmedAt)
  ) {
    return null;
  }
  if (
    baseline.status === MarkInstanceStatus.Cancelled &&
    occurredAtOrBefore(baseline, confirmedAt)
  ) {
    return null;
  }
  if (
    (baseline.status === MarkInstanceStatus.Rescheduled || baseline.status === MarkInstanceStatus.Substituted) &&
    occurredAtOrBefore(baseline, confirmedAt)
  ) {
    return null;
  }

  return {
    rootMarkId: lineage.root.id,
    baselineLeafMarkId: baseline.id,
  };
}

export function buildConfirmedPlanEntriesFromLineages(
  lineages: PlannedMarkLineage[],
  trailDayId: string,
): DailyReplanConfirmedPlanEntry[] {
  return lineages
    .filter(
      (lineage) =>
        lineage.leaf.trailDayId === trailDayId && EFFECTIVE_DAILY_MARK_STATUSES.has(lineage.leaf.status),
    )
    .map((lineage) => ({
      rootMarkId: lineage.root.id,
      baselineLeafMarkId: lineage.leaf.id,
    }))
    .sort((left, right) => left.rootMarkId.localeCompare(right.rootMarkId));
}

function getEntrySpecs(plan: EffectiveDailyPlan): DailyReplanConfirmedPlanEntry[] {
  const state = plan.state;
  if (state?.status !== "confirmed") {
    return [];
  }
  if (state.schemaVersion === 2) {
    return state.confirmedPlanEntries;
  }
  return plan.lineages
    .map((lineage) => legacyBaselineEntry(lineage, plan.trailDayId, state.confirmedAt))
    .filter((entry): entry is DailyReplanConfirmedPlanEntry => entry !== null)
    .sort((left, right) => left.rootMarkId.localeCompare(right.rootMarkId));
}

function findFirstPostConfirmMark(
  chain: MarkInstance[],
  trailDayId: string,
  status: MarkInstanceStatus,
) {
  return chain.find((mark) => mark.trailDayId === trailDayId && mark.status === status);
}

export function projectConfirmedDailyPlan(plan: EffectiveDailyPlan): ConfirmedDailyPlanProjection {
  const lineagesByRoot = new Map(plan.lineages.map((lineage) => [lineage.root.id, lineage] as const));
  const entries = getEntrySpecs(plan).map((spec) => {
    const lineage = lineagesByRoot.get(spec.rootMarkId);
    if (!lineage) {
      throw new Error(`Confirmed Daily Plan root ${spec.rootMarkId} is missing its lineage.`);
    }
    const baselineIndex = lineage.chain.findIndex((mark) => mark.id === spec.baselineLeafMarkId);
    if (baselineIndex < 0) {
      throw new Error(`Confirmed Daily Plan baseline ${spec.baselineLeafMarkId} is not in lineage ${spec.rootMarkId}.`);
    }

    const baselineMark = lineage.chain[baselineIndex];
    const postConfirmChain = lineage.chain.slice(baselineIndex);
    const movedMark = findFirstPostConfirmMark(postConfirmChain, plan.trailDayId, MarkInstanceStatus.Rescheduled);
    const substitutedMark = findFirstPostConfirmMark(postConfirmChain, plan.trailDayId, MarkInstanceStatus.Substituted);
    const currentSameDayLeaf = lineage.leaf.trailDayId === plan.trailDayId ? lineage.leaf : undefined;
    const skippedMark =
      !movedMark && currentSameDayLeaf?.status === MarkInstanceStatus.Skipped ? currentSameDayLeaf : undefined;
    const outcomeMark = movedMark ?? currentSameDayLeaf ?? baselineMark;
    const completed =
      !movedMark &&
      (currentSameDayLeaf?.status === MarkInstanceStatus.Completed ||
        currentSameDayLeaf?.status === MarkInstanceStatus.PartiallyCompleted);
    const partiallyCompleted =
      !movedMark && currentSameDayLeaf?.status === MarkInstanceStatus.PartiallyCompleted;
    const expired = !movedMark && currentSameDayLeaf?.status === MarkInstanceStatus.Expired;
    const cancelled = !movedMark && currentSameDayLeaf?.status === MarkInstanceStatus.Cancelled;
    const unresolved =
      !movedMark && !!currentSameDayLeaf && UNRESOLVED_CONFIRMED_PLAN_STATUSES.has(currentSameDayLeaf.status);

    return {
      rootMarkId: spec.rootMarkId,
      baselineLeafMarkId: spec.baselineLeafMarkId,
      baselineMark,
      currentLeaf: lineage.leaf,
      lineage,
      postConfirmChain,
      outcomeMark,
      skippedMark,
      movedMark,
      substitutedMark,
      completed,
      partiallyCompleted,
      expired,
      cancelled,
      unresolved,
    };
  });

  return {
    entries,
    initialCandidateCount: plan.candidateRootMarkIds.length,
    replanExcludedCount: Math.max(0, plan.candidateRootMarkIds.length - entries.length),
    confirmedPlannedCount: entries.length,
    completedCount: entries.filter((entry) => entry.completed).length,
    partiallyCompletedCount: entries.filter((entry) => entry.partiallyCompleted).length,
    skippedAfterConfirmCount: entries.filter((entry) => entry.skippedMark).length,
    movedAfterConfirmCount: entries.filter((entry) => entry.movedMark).length,
    substitutedAfterConfirmCount: entries.filter((entry) => entry.substitutedMark).length,
    expiredCount: entries.filter((entry) => entry.expired).length,
    cancelledCount: entries.filter((entry) => entry.cancelled).length,
    unresolvedCount: entries.filter((entry) => entry.unresolved).length,
  };
}
