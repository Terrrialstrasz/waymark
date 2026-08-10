import type { LocalDateString, MarkInstance, TrailDay, WaymarkRepositories } from "../../domain/waymark";
import { MarkInstanceStatus, TrailDayStatus } from "../../domain/waymark/enums";
import {
  ensureDailyReplanActivationDate,
  deleteDailyReplanState,
  getDailyReplanActivationDate,
  getDailyReplanState,
  setDailyReplanState,
  type DailyReplanState,
} from "./dailyReplanStateStore";
import {
  collectCandidateRootMarkIds,
  DailyPlanIntegrityError,
  EFFECTIVE_DAILY_MARK_STATUSES,
  resolvePlannedMarkLineage,
  type PlannedMarkLineage,
} from "./plannedMarkLineage";
import { getMarkMetadata } from "./markMetadataStore";
import {
  buildConfirmedPlanEntriesFromLineages,
  projectConfirmedDailyPlan,
} from "./confirmedDailyPlanProjection";

export type EffectiveDailyPlanMembership = "provisional" | "draft" | "confirmed";

export type EffectiveDailyPlan = {
  localDate: LocalDateString;
  trailDayId: string;
  membership: EffectiveDailyPlanMembership;
  candidateRootMarkIds: string[];
  effectiveMarks: MarkInstance[];
  lineages: PlannedMarkLineage[];
  state: DailyReplanState | null;
};

export type DailyPlanCloseCompatibility = "daily_replan" | "legacy";

export class DailyPlanValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DailyPlanValidationError";
  }
}

function assertReplannableTrailDay(trailDay: TrailDay) {
  if (trailDay.status === TrailDayStatus.Closed || trailDay.status === TrailDayStatus.Reopened) {
    throw new DailyPlanValidationError(`TrailDay ${trailDay.id} cannot enter Daily Replan in status ${trailDay.status}.`);
  }
}

export class DailyPlanEngine {
  constructor(private readonly repositories: WaymarkRepositories) {}

  async resolveEffectiveDailyPlan(userId: string, localDate: LocalDateString): Promise<EffectiveDailyPlan> {
    return this.resolveWithRepositories(this.repositories, userId, localDate);
  }

  async beginReplan(userId: string, localDate: LocalDateString, timezone: string, startedAt = new Date().toISOString()) {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const existing = await getDailyReplanState(repos.appSettings, userId, localDate);
      if (existing) {
        if (
          existing.status === "confirmed" &&
          existing.candidateRootMarkIds.length === 0 &&
          (existing.schemaVersion !== 2 || existing.confirmedPlanEntries.length === 0)
        ) {
          const candidateRootMarkIds = await collectCandidateRootMarkIds(repos, userId, localDate);
          if (candidateRootMarkIds.length > 0) {
            await setDailyReplanState(repos.appSettings, userId, {
              schemaVersion: 2,
              localDate,
              trailDayId: existing.trailDayId,
              timezone: existing.timezone,
              status: "draft",
              startedAt,
              candidateRootMarkIds,
            });
          }
        }
        try {
          return await this.resolveWithRepositories(repos, userId, localDate);
        } catch (error) {
          if (!isMissingDailyPlanRootError(error)) {
            throw error;
          }
          await deleteDailyReplanState(repos.appSettings, userId, localDate);
          const trailDay = await repos.trailDays.getOrCreateTrailDay(userId, localDate);
          assertReplannableTrailDay(trailDay);
          const candidateRootMarkIds = await collectCandidateRootMarkIds(repos, userId, localDate);
          await setDailyReplanState(repos.appSettings, userId, {
            schemaVersion: 2,
            localDate,
            trailDayId: trailDay.id,
            timezone,
            status: candidateRootMarkIds.length === 0 ? "confirmed" : "draft",
            startedAt,
            ...(candidateRootMarkIds.length === 0 ? { confirmedAt: startedAt, confirmedPlanEntries: [] } : {}),
            candidateRootMarkIds,
          } as DailyReplanState);
          const plan = await this.resolveWithRepositories(repos, userId, localDate);
          await this.recomputeExecutionCounters(repos, plan);
          return plan;
        }
      }

      const trailDay = await repos.trailDays.getOrCreateTrailDay(userId, localDate);
      assertReplannableTrailDay(trailDay);
      const candidateRootMarkIds = await collectCandidateRootMarkIds(repos, userId, localDate);
      await ensureDailyReplanActivationDate(repos.appSettings, userId, localDate);
      await setDailyReplanState(repos.appSettings, userId, {
        schemaVersion: 2,
        localDate,
        trailDayId: trailDay.id,
        timezone,
        status: candidateRootMarkIds.length === 0 ? "confirmed" : "draft",
        startedAt,
        ...(candidateRootMarkIds.length === 0 ? { confirmedAt: startedAt, confirmedPlanEntries: [] } : {}),
        candidateRootMarkIds,
      } as DailyReplanState);
      const plan = await this.resolveWithRepositories(repos, userId, localDate);
      await this.recomputeExecutionCounters(repos, plan);
      return plan;
    });
  }

  async confirmReplan(userId: string, localDate: LocalDateString, confirmedAt = new Date().toISOString()) {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const state = await getDailyReplanState(repos.appSettings, userId, localDate);
      if (!state) {
        throw new DailyPlanValidationError(`Daily Replan ${localDate} has not begun.`);
      }
      if (state.status === "confirmed") {
        return this.resolveWithRepositories(repos, userId, localDate);
      }
      const trailDay = await repos.trailDays.getTrailDayById(state.trailDayId);
      if (!trailDay) {
        throw new DailyPlanIntegrityError(`Daily Replan ${localDate} references missing TrailDay ${state.trailDayId}.`);
      }
      assertReplannableTrailDay(trailDay);
      const draftPlan = await this.resolveWithRepositories(repos, userId, localDate);
      const confirmedPlanEntries = buildConfirmedPlanEntriesFromLineages(draftPlan.lineages, trailDay.id);
      await setDailyReplanState(repos.appSettings, userId, {
        ...state,
        schemaVersion: 2,
        status: "confirmed",
        confirmedAt,
        confirmedPlanEntries,
      });
      const plan = await this.resolveWithRepositories(repos, userId, localDate);
      await this.recomputeExecutionCounters(repos, plan);
      return plan;
    });
  }

  async assertReplanActionAllowed(
    userId: string,
    localDate: LocalDateString,
    markId: string,
    action?: "skip" | "move" | "substitute",
  ) {
    const plan = await this.resolveEffectiveDailyPlan(userId, localDate);
    if (plan.membership !== "draft") {
      throw new DailyPlanValidationError(`Replan actions require a draft Daily Replan for ${localDate}.`);
    }
    const mark = plan.effectiveMarks.find((candidate) => candidate.id === markId);
    if (!mark) {
      throw new DailyPlanValidationError(`Mark ${markId} is not an effective candidate in Daily Replan ${localDate}.`);
    }
    if (
      mark.status !== MarkInstanceStatus.Planned &&
      mark.status !== MarkInstanceStatus.Ready &&
      mark.status !== MarkInstanceStatus.Blocked
    ) {
      throw new DailyPlanValidationError(`Mark ${markId} in status ${mark.status} cannot be changed in Replan mode.`);
    }
    if (action === "substitute") {
      const lineage = plan.lineages.find((candidate) => candidate.leaf.id === markId);
      if (lineage?.chain.some((node) => node.status === MarkInstanceStatus.Substituted)) {
        throw new DailyPlanValidationError(`Mark ${markId} already belongs to a substitution chain.`);
      }
    }
    return mark;
  }

  async getCloseCompatibility(userId: string, localDate: LocalDateString): Promise<DailyPlanCloseCompatibility> {
    if (await getDailyReplanState(this.repositories.appSettings, userId, localDate)) {
      return "daily_replan";
    }
    const activationDate = await getDailyReplanActivationDate(this.repositories.appSettings, userId);
    return activationDate && localDate >= activationDate ? "daily_replan" : "legacy";
  }

  private async resolveWithRepositories(
    repos: WaymarkRepositories,
    userId: string,
    localDate: LocalDateString,
  ): Promise<EffectiveDailyPlan> {
    const state = await getDailyReplanState(repos.appSettings, userId, localDate);
    const trailDay = state
      ? await repos.trailDays.getTrailDayById(state.trailDayId)
      : await repos.trailDays.getOrCreateTrailDay(userId, localDate);
    if (!trailDay) {
      throw new DailyPlanIntegrityError(`Daily plan ${localDate} references a missing TrailDay.`);
    }
    const roots = state?.candidateRootMarkIds ?? await collectCandidateRootMarkIds(repos, userId, localDate);
    const lineages = await Promise.all(roots.map((rootId) => resolvePlannedMarkLineage(repos, rootId)));
    const leafOwner = new Map<string, string>();
    for (const lineage of lineages) {
      const owner = leafOwner.get(lineage.leaf.id);
      if (owner && owner !== lineage.root.id) {
        throw new DailyPlanIntegrityError(`Daily plan roots ${owner} and ${lineage.root.id} converge at ${lineage.leaf.id}.`);
      }
      leafOwner.set(lineage.leaf.id, lineage.root.id);
    }

    const effective = lineages
      .map((lineage) => lineage.leaf)
      .filter((mark) => mark.trailDayId === trailDay.id && EFFECTIVE_DAILY_MARK_STATUSES.has(mark.status));
    const withOrder = await Promise.all(
      effective.map(async (mark) => ({
        mark,
        orderIndex: (await getMarkMetadata(repos.appSettings, userId, mark.id))?.orderIndex,
      })),
    );
    withOrder.sort((left, right) => {
      const order = (left.orderIndex ?? Number.MAX_SAFE_INTEGER) - (right.orderIndex ?? Number.MAX_SAFE_INTEGER);
      if (order !== 0) return order;
      const time = (left.mark.scheduledStartAt ?? "").localeCompare(right.mark.scheduledStartAt ?? "");
      if (time !== 0) return time;
      return left.mark.id.localeCompare(right.mark.id);
    });

    return {
      localDate,
      trailDayId: trailDay.id,
      membership: state?.status ?? "provisional",
      candidateRootMarkIds: [...roots],
      effectiveMarks: withOrder.map((entry) => entry.mark),
      lineages,
      state,
    };
  }

  private async recomputeExecutionCounters(repos: WaymarkRepositories, plan: EffectiveDailyPlan) {
    const trailDay = await repos.trailDays.getTrailDayById(plan.trailDayId);
    if (!trailDay) {
      throw new DailyPlanIntegrityError(`Daily plan ${plan.localDate} references missing TrailDay ${plan.trailDayId}.`);
    }
    const completedMarkCount = plan.effectiveMarks.filter(
      (mark) => mark.status === MarkInstanceStatus.Completed,
    ).length;
    const skippedMarkCount = plan.lineages.filter(
      (lineage) =>
        lineage.leaf.trailDayId === trailDay.id && lineage.leaf.status === MarkInstanceStatus.Skipped,
    ).length;
    const memoryCount = (await repos.memories.listMemoriesByTrailDay(trailDay.id)).length;
    const projection = plan.state?.status === "confirmed" ? projectConfirmedDailyPlan(plan) : null;
    const nextPlannedMarkCount = projection?.confirmedPlannedCount ?? plan.effectiveMarks.length;
    const nextCompletedMarkCount = projection?.completedCount ?? completedMarkCount;
    const nextSkippedMarkCount = projection?.skippedAfterConfirmCount ?? skippedMarkCount;

    if (
      trailDay.plannedMarkCount === nextPlannedMarkCount &&
      trailDay.completedMarkCount === nextCompletedMarkCount &&
      trailDay.skippedMarkCount === nextSkippedMarkCount &&
      trailDay.memoryCount === memoryCount
    ) {
      return trailDay;
    }
    return repos.trailDays.updateTrailDay(trailDay.id, {
      plannedMarkCount: nextPlannedMarkCount,
      completedMarkCount: nextCompletedMarkCount,
      skippedMarkCount: nextSkippedMarkCount,
      memoryCount,
    });
  }
}

export function createDailyPlanEngine(repositories: WaymarkRepositories) {
  return new DailyPlanEngine(repositories);
}

function isMissingDailyPlanRootError(error: unknown) {
  return (
    error instanceof DailyPlanIntegrityError &&
    /^Daily plan root .+ does not exist\.$/u.test(error.message)
  );
}
