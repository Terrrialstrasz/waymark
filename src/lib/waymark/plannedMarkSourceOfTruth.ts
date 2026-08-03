import type { MarkInstance, WaymarkRepositories } from "../../domain/waymark";
import {
  MarkInstanceOrigin,
  MarkInstanceStatus,
  SignalTargetType,
} from "../../domain/waymark/enums";
import type { SignalEngine } from "../../domain/waymark/services";
import { getMarkMetadata, setMarkMetadata, type MarkMetadata } from "./markMetadataStore";
import { createDailyPlanEngine } from "./dailyPlanEngine";

const LEGACY_AUTO_GENERATED_UNRESOLVED_STATUSES = new Set<MarkInstanceStatus>([
  MarkInstanceStatus.Planned,
  MarkInstanceStatus.Ready,
  MarkInstanceStatus.Blocked,
  MarkInstanceStatus.Active,
]);

const TRAIL_DAY_COUNTER_ORIGINS = new Set<MarkInstanceOrigin>([
  MarkInstanceOrigin.WeeklyPlanned,
  MarkInstanceOrigin.ManualPlan,
  MarkInstanceOrigin.BacklogConverted,
]);

function countsTowardPlannedTrailDayCounters(mark: MarkInstance) {
  return TRAIL_DAY_COUNTER_ORIGINS.has(mark.origin) && mark.status !== MarkInstanceStatus.Cancelled;
}

function withLegacySourceCleared(metadata: MarkMetadata): MarkMetadata {
  const next: MarkMetadata = {
    ...metadata,
    appearsInToday: false,
  };
  delete next.sourceKind;
  return next;
}

export async function recomputeTrailDayCountersForTrailDay(
  repos: WaymarkRepositories,
  trailDayId: string,
) {
  const trailDay = await repos.trailDays.getTrailDayById(trailDayId);
  if (!trailDay) {
    return null;
  }

  const marks = await repos.marks.listMarkInstancesByTrailDay(trailDayId);
  const memories = await repos.memories.listMemoriesByTrailDay(trailDayId);
  let plannedMarkCount = 0;
  let completedMarkCount = 0;
  let skippedMarkCount = 0;
  const memoryCount = memories.length;

  for (const mark of marks) {
    if (!countsTowardPlannedTrailDayCounters(mark)) {
      continue;
    }
    plannedMarkCount += 1;
    if (mark.status === MarkInstanceStatus.Completed) {
      completedMarkCount += 1;
    }
    if (mark.status === MarkInstanceStatus.Skipped) {
      skippedMarkCount += 1;
    }
  }

  if (
    trailDay.plannedMarkCount === plannedMarkCount &&
    trailDay.completedMarkCount === completedMarkCount &&
    trailDay.skippedMarkCount === skippedMarkCount &&
    trailDay.memoryCount === memoryCount
  ) {
    return trailDay;
  }

  return repos.trailDays.updateTrailDay(trailDayId, {
    plannedMarkCount,
    completedMarkCount,
    skippedMarkCount,
    memoryCount,
  });
}

export async function recomputeTrailDayCountersForDate(
  repos: WaymarkRepositories,
  userId: string,
  localDate: string,
) {
  const trailDay = await repos.trailDays.getTrailDayByDate(userId, localDate);
  if (!trailDay) {
    return null;
  }
  return recomputeTrailDayCountersForTrailDay(repos, trailDay.id);
}

/**
 * Recomputes counters whose meaning is the committed/effective work for one
 * TrailDay. Weekly import and future-planning callers intentionally continue
 * to use recomputeTrailDayCountersForDate above.
 */
export async function recomputeEffectiveTrailDayExecutionCounters(
  repos: WaymarkRepositories,
  userId: string,
  localDate: string,
) {
  const trailDay = await repos.trailDays.getTrailDayByDate(userId, localDate);
  if (!trailDay) {
    return null;
  }
  const dailyPlanEngine = createDailyPlanEngine(repos);
  if ((await dailyPlanEngine.getCloseCompatibility(userId, localDate)) === "legacy") {
    return recomputeTrailDayCountersForTrailDay(repos, trailDay.id);
  }
  const plan = await dailyPlanEngine.resolveEffectiveDailyPlan(userId, localDate);
  const completedMarkCount = plan.effectiveMarks.filter(
    (mark) => mark.status === MarkInstanceStatus.Completed,
  ).length;
  const skippedMarkCount = plan.lineages.filter(
    (lineage) =>
      lineage.leaf.trailDayId === trailDay.id && lineage.leaf.status === MarkInstanceStatus.Skipped,
  ).length;
  const memoryCount = (await repos.memories.listMemoriesByTrailDay(trailDay.id)).length;
  const plannedMarkCount = plan.effectiveMarks.length;

  if (
    trailDay.plannedMarkCount === plannedMarkCount &&
    trailDay.completedMarkCount === completedMarkCount &&
    trailDay.skippedMarkCount === skippedMarkCount &&
    trailDay.memoryCount === memoryCount
  ) {
    return trailDay;
  }
  return repos.trailDays.updateTrailDay(trailDay.id, {
    plannedMarkCount,
    completedMarkCount,
    skippedMarkCount,
    memoryCount,
  });
}

export async function cleanupLegacyTemplateGeneratedMarks(
  repos: WaymarkRepositories,
  signalEngine: SignalEngine,
  userId: string,
) {
  const trailDays = await repos.trailDays.listTrailDaysInRange(userId, "2000-01-01", "2100-12-31");
  let deletedMarkCount = 0;
  let hiddenLegacyHistoryCount = 0;

  for (const trailDay of trailDays) {
    const marks = await repos.marks.listMarkInstancesByTrailDay(trailDay.id);

    for (const mark of marks) {
      if (mark.origin !== MarkInstanceOrigin.TemplateGenerated) {
        continue;
      }

      const metadata = await getMarkMetadata(repos.appSettings, userId, mark.id);
      if (LEGACY_AUTO_GENERATED_UNRESOLVED_STATUSES.has(mark.status)) {
        await signalEngine.cancelSignalsForTarget({
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          reason: "legacy_template_generation_cleanup",
        });

        const linkedPackChecks = await repos.packChecks.listInstancesByTargetMark(mark.id);
        for (const packCheck of linkedPackChecks) {
          await signalEngine.cancelSignalsForTarget({
            targetType: SignalTargetType.PackCheckInstance,
            targetId: packCheck.id,
            reason: "legacy_template_generation_cleanup",
          });
          await repos.packChecks.softDeleteInstance(packCheck.id);
        }

        await repos.marks.softDeleteMarkInstance(mark.id);
        await repos.appSettings.deleteSetting(userId, `mark_metadata:${mark.id}`);
        deletedMarkCount += 1;
        continue;
      }

      const cleanedMetadata = withLegacySourceCleared(metadata ?? { markId: mark.id });
      const changed =
        !metadata ||
        cleanedMetadata.appearsInToday !== metadata.appearsInToday ||
        cleanedMetadata.sourceKind !== metadata.sourceKind;
      if (changed) {
        await setMarkMetadata(repos.appSettings, userId, cleanedMetadata);
        hiddenLegacyHistoryCount += 1;
      }
    }

    await recomputeTrailDayCountersForTrailDay(repos, trailDay.id);
  }

  return {
    trailDaysProcessed: trailDays.length,
    deletedMarkCount,
    hiddenLegacyHistoryCount,
  };
}
