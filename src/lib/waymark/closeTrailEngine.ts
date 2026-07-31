import {
  CloseTrailDayInput,
  CloseTrailDayResult,
  CloseTrailEngine,
  CloseTrailFirstStepPreview,
  CloseTrailJudgment,
  CloseTrailMarkReview,
  CloseTrailReadiness,
  CloseTrailReadinessReason,
  CloseTrailReview,
  CloseTrailSummary,
  ReopenTrailDayInput,
  SignalEngine,
  TrailDay,
  TrailDayStatus,
  WaymarkRepositories,
} from "../../domain/waymark";
import {
  MarkInstanceOrigin,
  MarkInstanceStatus,
  SignalStatus,
  SignalTargetType,
} from "../../domain/waymark";
import { projectCharacterFromRecords } from "./characterProjection";
import { resolveAnchorPathIdForDate } from "./anchorPathRuleStore";
import { listCloseTrailRuleConfigs } from "./closeTrailConfigStore";
import { createDisciplineProof, listDisciplineProofsByTrailDay, saveDisciplineProof } from "./disciplineProofStore";
import { getMarkMetadata, MarkMetadata, setMarkMetadata } from "./markMetadataStore";

const CLOSE_TRAIL_HOUR = 21;
const CLOSE_TRAIL_MINUTE = 30;

const RESOLVED_MARK_STATUSES = new Set<MarkInstanceStatus>([
  MarkInstanceStatus.Completed,
  MarkInstanceStatus.PartiallyCompleted,
  MarkInstanceStatus.Skipped,
  MarkInstanceStatus.Rescheduled,
  MarkInstanceStatus.Substituted,
  MarkInstanceStatus.Expired,
]);

const UNRESOLVED_MARK_STATUSES = new Set<MarkInstanceStatus>([
  MarkInstanceStatus.Planned,
  MarkInstanceStatus.Ready,
  MarkInstanceStatus.Blocked,
  MarkInstanceStatus.Active,
]);

const NEEDS_REPAIR_MARK_STATUSES = new Set<MarkInstanceStatus>([
  MarkInstanceStatus.Planned,
  MarkInstanceStatus.Ready,
  MarkInstanceStatus.Blocked,
  MarkInstanceStatus.Active,
  MarkInstanceStatus.Expired,
]);

const RESOLVABLE_SIGNAL_STATUSES = new Set<SignalStatus>([
  SignalStatus.Scheduled,
  SignalStatus.Ringing,
  SignalStatus.Snoozed,
]);

export class CloseTrailEngineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloseTrailEngineValidationError";
  }
}

export class CloseTrailEngineNotFoundError extends Error {
  constructor(trailDayId: string) {
    super(`TrailDay ${trailDayId} not found.`);
    this.name = "CloseTrailEngineNotFoundError";
  }
}

function nowIso(input?: string): string {
  return input ?? new Date().toISOString();
}

function parseIsoLocalDateTime(iso: string): { date: string; hour: number; minute: number } | null {
  const parts = iso.split("T");
  if (parts.length < 2) {
    return null;
  }
  const date = parts[0];
  const timePart = parts[1].split("Z")[0].split(/[+\-]/)[0];
  const [hourText, minuteText] = timePart.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  return { date, hour, minute };
}

function isAfterCloseThreshold(asOf: string, trailDayDate: string): boolean {
  const parsed = parseIsoLocalDateTime(asOf);
  if (!parsed) {
    return false;
  }
  if (parsed.date > trailDayDate) {
    return true;
  }
  if (parsed.date < trailDayDate) {
    return false;
  }
  return parsed.hour > CLOSE_TRAIL_HOUR || (parsed.hour === CLOSE_TRAIL_HOUR && parsed.minute >= CLOSE_TRAIL_MINUTE);
}

function buildCompletionRatio(completedCount: number, plannedCount: number) {
  return {
    completed: plannedCount > 0 ? completedCount / plannedCount : 0,
    planned: plannedCount,
  };
}

type MarkWithMetadata = {
  mark: CloseTrailMarkReview["resolved"][number];
  metadata: MarkMetadata | null;
};

type CloseTrailSummaryCounts = Pick<
  CloseTrailSummary,
  | "plannedCount"
  | "completedCount"
  | "partiallyCompletedCount"
  | "skippedCount"
  | "rescheduledCount"
  | "substitutedCount"
  | "expiredCount"
  | "cancelledCount"
  | "unresolvedCount"
  | "quickMarkCount"
>;

function buildCloseTrailSummaryCounts(marksWithMetadata: MarkWithMetadata[]): CloseTrailSummaryCounts {
  const markById = new Map(marksWithMetadata.map(({ mark }) => [mark.id, mark] as const));
  const effectivePlannedMarkIds = new Set<string>();
  const substitutedSupervisingOriginalIds: string[] = [];
  let completedCount = 0;
  let partiallyCompletedCount = 0;
  let skippedCount = 0;
  let rescheduledCount = 0;
  let substitutedCount = 0;
  let expiredCount = 0;
  let cancelledCount = 0;
  let unresolvedCount = 0;
  let quickMarkCount = 0;

  for (const { mark, metadata } of marksWithMetadata) {
    const isQuickCapture = mark.origin === MarkInstanceOrigin.QuickCapture;
    const isCancelled = mark.status === MarkInstanceStatus.Cancelled;
    const isSubstitutedSupervisingOriginal =
      metadata?.blockType === "supervising_block" && mark.status === MarkInstanceStatus.Substituted;
    const substitute = mark.substitutedByMarkId ? markById.get(mark.substitutedByMarkId) : undefined;
    const hasSameDaySubstitute = substitute?.trailDayId === mark.trailDayId && substitute.status !== MarkInstanceStatus.Cancelled;

    if (!isCancelled && !isQuickCapture) {
      effectivePlannedMarkIds.add(mark.id);
    }

    if (isSubstitutedSupervisingOriginal && hasSameDaySubstitute) {
      substitutedSupervisingOriginalIds.push(mark.id);
      effectivePlannedMarkIds.delete(mark.id);
      effectivePlannedMarkIds.add(substitute.id);
    }

    if (!isQuickCapture) {
      switch (mark.status) {
        case MarkInstanceStatus.Skipped:
          skippedCount += 1;
          break;
        case MarkInstanceStatus.Rescheduled:
          rescheduledCount += 1;
          break;
        case MarkInstanceStatus.Substituted:
          substitutedCount += 1;
          break;
        case MarkInstanceStatus.Expired:
          expiredCount += 1;
          break;
        case MarkInstanceStatus.Cancelled:
          cancelledCount += 1;
          break;
        default:
          break;
      }
    }

    if (!isQuickCapture && UNRESOLVED_MARK_STATUSES.has(mark.status)) {
      unresolvedCount += 1;
    }

    if (isQuickCapture) {
      quickMarkCount += 1;
    }
  }

  if (substitutedSupervisingOriginalIds.length > 0) {
    const hasCountedSupervisingOriginal = marksWithMetadata.some(
      ({ mark, metadata }) =>
        metadata?.blockType === "supervising_block" &&
        effectivePlannedMarkIds.has(mark.id) &&
        mark.status !== MarkInstanceStatus.Cancelled,
    );
    if (!hasCountedSupervisingOriginal) {
      effectivePlannedMarkIds.add(substitutedSupervisingOriginalIds[0]);
    }
  }

  for (const markId of effectivePlannedMarkIds) {
    const mark = markById.get(markId);
    if (mark?.status === MarkInstanceStatus.Completed || mark?.status === MarkInstanceStatus.PartiallyCompleted) {
      completedCount += 1;
      if (mark.status === MarkInstanceStatus.PartiallyCompleted) {
        partiallyCompletedCount += 1;
      }
    }
  }

  return {
    plannedCount: effectivePlannedMarkIds.size,
    completedCount,
    partiallyCompletedCount,
    skippedCount,
    rescheduledCount,
    substitutedCount,
    expiredCount,
    cancelledCount,
    unresolvedCount,
    quickMarkCount,
  };
}

function shiftLocalDate(localDate: string, days: number) {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isFloatingDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?$/.test(value);
}

function formatTimeLabel(iso?: string) {
  if (!iso) {
    return undefined;
  }
  if (isFloatingDateTime(iso)) {
    const hours = Number(iso.slice(11, 13));
    const minutes = Number(iso.slice(14, 16));
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(2000, 0, 1, hours, minutes)));
    }
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function formatLocalDateLabel(localDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${localDate}T00:00:00.000Z`));
}

function formatRelativeDateLabel(baseLocalDate: string, targetLocalDate: string) {
  if (targetLocalDate === shiftLocalDate(baseLocalDate, 1)) {
    return "Tomorrow";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${targetLocalDate}T00:00:00.000Z`));
}

function formatBlockLabel(
  blockType?: "focus_block" | "supervising_block" | "family_block" | "workout_block",
) {
  switch (blockType) {
    case "focus_block":
      return "Focus Block";
    case "supervising_block":
      return "Supervising Block";
    case "family_block":
      return "Family Block";
    case "workout_block":
      return "Workout Block";
    default:
      return undefined;
  }
}

function formatMarkStatusLabel(status: MarkInstanceStatus) {
  switch (status) {
    case MarkInstanceStatus.Planned:
      return "Planned";
    case MarkInstanceStatus.Ready:
      return "Ready";
    case MarkInstanceStatus.Blocked:
      return "Blocked";
    case MarkInstanceStatus.Active:
      return "Active";
    case MarkInstanceStatus.Completed:
      return "Completed";
    case MarkInstanceStatus.PartiallyCompleted:
      return "Partial complete";
    case MarkInstanceStatus.Skipped:
      return "Skipped";
    case MarkInstanceStatus.Rescheduled:
      return "Moved";
    case MarkInstanceStatus.Substituted:
      return "Substituted";
    case MarkInstanceStatus.Expired:
      return "Needs repair";
    case MarkInstanceStatus.Cancelled:
      return "Cancelled";
    default:
      return "Open";
  }
}

function formatCountLabel(count: number, singular: string, plural?: string) {
  if (count === 1) {
    return `1 ${singular}`;
  }
  return `${count} ${plural ?? `${singular}s`}`;
}

export class DefaultCloseTrailEngine implements CloseTrailEngine {
  constructor(private readonly repositories: WaymarkRepositories, private readonly signalEngine?: SignalEngine) {}

  async evaluateCloseReadiness(trailDayId: string, asOf?: string): Promise<CloseTrailReadiness> {
    const trailDay = await this.getResolvedTrailDay(trailDayId);
    if (!trailDay) {
      throw new CloseTrailEngineNotFoundError(trailDayId);
    }

    const summary = await this.getCloseTrailSummary(trailDayId);
    const now = nowIso(asOf);
    if (trailDay.status === TrailDayStatus.Closed) {
      return {
        status: TrailDayStatus.Closed,
        canClose: false,
        reasonCode: "already_closed",
        reasonMessage: "TrailDay is already closed.",
      };
    }

    if (trailDay.status === TrailDayStatus.ReadyToClose) {
      return {
        status: TrailDayStatus.ReadyToClose,
        canClose: true,
        reasonCode: "already_ready",
        reasonMessage: "TrailDay is ready to close.",
      };
    }

    const thresholdPassed = isAfterCloseThreshold(now, trailDay.date);
    const hasNonCancelledMarks = summary.plannedCount > 0;
    const hasMemoriesOrQuickMarks = summary.memoryCount > 0 || summary.quickMarkCount > 0;
    const hasUnresolvedMarks = summary.unresolvedCount > 0;

    if (!hasNonCancelledMarks && !hasMemoriesOrQuickMarks) {
      return {
        status: trailDay.status === TrailDayStatus.Reopened ? TrailDayStatus.Reopened : TrailDayStatus.Open,
        canClose: false,
        reasonCode: "no_activity",
        reasonMessage: "No planned marks, memories, or quick captures today.",
      };
    }

    if (!hasUnresolvedMarks && hasNonCancelledMarks) {
      return {
        status: TrailDayStatus.ReadyToClose,
        canClose: true,
        reasonCode: "all_planned_marks_resolved",
        reasonMessage: "All planned marks are resolved.",
      };
    }

    if (thresholdPassed && hasNonCancelledMarks) {
      return {
        status: TrailDayStatus.ReadyToClose,
        canClose: true,
        reasonCode: "time_threshold_with_marks",
        reasonMessage: "Time threshold reached and there are planned marks for today.",
      };
    }

    if (thresholdPassed && !hasNonCancelledMarks && hasMemoriesOrQuickMarks) {
      return {
        status: TrailDayStatus.ReadyToClose,
        canClose: true,
        reasonCode: "time_threshold_memories_or_quick_marks",
        reasonMessage: "No planned marks, but there are memories or quick marks after threshold.",
      };
    }

    if (trailDay.status === TrailDayStatus.Reopened) {
      return {
        status: TrailDayStatus.Reopened,
        canClose: false,
        reasonCode: "reopened_not_ready",
        reasonMessage: "Reopened day is not ready to close yet.",
      };
    }

    return {
      status: TrailDayStatus.Open,
      canClose: false,
      reasonCode: "unresolved_marks",
      reasonMessage: "There are unresolved marks remaining.",
    };
  }

  async getCloseTrailSummary(trailDayId: string): Promise<CloseTrailSummary> {
    const trailDay = await this.getResolvedTrailDay(trailDayId);
    if (!trailDay) {
      throw new CloseTrailEngineNotFoundError(trailDayId);
    }

    const marks = await this.repositories.marks.listMarkInstancesByTrailDay(trailDayId);
    const memories = await this.repositories.memories.listMemoriesByTrailDay(trailDayId);
    const packChecks = await this.repositories.packChecks.listInstancesByTrailDay(trailDayId);
    const signals = await this.repositories.signals.listSignalsByTarget(SignalTargetType.TrailDay, trailDayId);
    const counts = buildCloseTrailSummaryCounts(
      await Promise.all(
        marks.map(async (mark) => ({
          mark,
          metadata: await getMarkMetadata(this.repositories.appSettings, trailDay.userId, mark.id),
        })),
      ),
    );

    const signalMissedCount = signals.filter(
      (signal) => signal.status === SignalStatus.Expired || signal.status === SignalStatus.Missed,
    ).length;
    const packCheckCompletedCount = packChecks.filter((instance) => instance.status === "completed").length;

    return {
      trailDayId,
      localDate: trailDay.date,
      plannedCount: counts.plannedCount,
      completedCount: counts.completedCount,
      partiallyCompletedCount: counts.partiallyCompletedCount,
      skippedCount: counts.skippedCount,
      rescheduledCount: counts.rescheduledCount,
      substitutedCount: counts.substitutedCount,
      expiredCount: counts.expiredCount,
      cancelledCount: counts.cancelledCount,
      unresolvedCount: counts.unresolvedCount,
      memoryCount: memories.length,
      quickMarkCount: counts.quickMarkCount,
      signalMissedCount,
      packCheckCompletedCount,
      completionRatio: buildCompletionRatio(counts.completedCount, counts.plannedCount),
    };
  }

  async getCloseTrailReview(trailDayId: string, asOf?: string): Promise<CloseTrailReview> {
    const trailDay = await this.getResolvedTrailDay(trailDayId);
    if (!trailDay) {
      throw new CloseTrailEngineNotFoundError(trailDayId);
    }

    const readiness = await this.evaluateCloseReadiness(trailDayId, asOf);
    const summary = await this.getCloseTrailSummary(trailDayId);
    const marksToReview = await this.listMarksToReviewForClose(trailDayId);
    const memories = await this.listCloseTrailMemories(trailDayId);
    const characterProjection = await this.projectCharacterForTrailDay(this.repositories, trailDay.id);

    return {
      trailDay,
      readiness,
      summary,
      marksToReview,
      memories,
      disciplineOptions: await this.listDisciplineOptions(trailDay.userId),
      characterProjection: {
        judgment: characterProjection.judgment,
        displayLabel: characterProjection.displayLabel,
        keptCount: characterProjection.keptCount,
        protectedCount: characterProjection.protectedCount,
        repairCount: characterProjection.repairCount,
        completedMarkCount: characterProjection.completedMarkCount,
        disciplineProofCount: characterProjection.disciplineProofCount,
        honestResolutionCount: characterProjection.honestResolutionCount,
      },
      suggestedTomorrowFirstStep: await this.getTomorrowFirstStepPreview(this.repositories, trailDay),
    };
  }

  async getCloseTrailJudgment(trailDayId: string): Promise<CloseTrailJudgment> {
    const trailDay = await this.getResolvedTrailDay(trailDayId);
    if (!trailDay) {
      throw new CloseTrailEngineNotFoundError(trailDayId);
    }
    const summary = await this.getCloseTrailSummary(trailDayId);
    return this.buildJudgment(this.repositories, trailDay, summary);
  }

  async closeTrailDay(input: CloseTrailDayInput): Promise<CloseTrailDayResult> {
    const resolvedAt = nowIso(input.closedAt);

    const existingTrailDay = await this.repositories.trailDays.getTrailDayById(input.trailDayId);
    if (!existingTrailDay) {
      throw new CloseTrailEngineNotFoundError(input.trailDayId);
    }

    if (existingTrailDay.status === TrailDayStatus.Closed) {
      throw new CloseTrailEngineValidationError("TrailDay is already closed.");
    }

    const readiness = await this.evaluateCloseReadiness(input.trailDayId, resolvedAt);
    const allowsReviewClose =
      input.allowUnresolvedMarks === true && readiness.reasonCode === "unresolved_marks";
    if (!readiness.canClose && !allowsReviewClose && !input.manualCloseReason) {
      throw new CloseTrailEngineValidationError("TrailDay is not ready to close and manualCloseReason was not provided.");
    }

    return this.repositories.transaction.runInTransaction(async (txRepos) => {
      const trailDay = await txRepos.trailDays.getTrailDayById(input.trailDayId);
      if (!trailDay) {
        throw new CloseTrailEngineNotFoundError(input.trailDayId);
      }

      if (trailDay.status === TrailDayStatus.Closed) {
        throw new CloseTrailEngineValidationError("TrailDay is already closed.");
      }

      let reflectionEntries = await txRepos.trailDays.listReflectionEntries(input.trailDayId);
      if (input.reflectionEntries) {
        reflectionEntries = await txRepos.trailDays.replaceReflectionEntries(input.trailDayId, input.reflectionEntries);
      }

      const updatedTrailDay = await txRepos.trailDays.updateCloseState(input.trailDayId, {
        status: TrailDayStatus.Closed,
        closedAt: resolvedAt,
        closeSummary: input.closeSummary ?? undefined,
        tomorrowFirstStep: input.tomorrowFirstStep ?? undefined,
        characterResult: input.characterResult ?? undefined,
      });

      if (input.resolveSignals ?? true) {
        await this.resolveTrailDaySignals(txRepos, input.trailDayId, resolvedAt);
      }

      if (input.disciplineSelections?.length) {
        for (const selection of input.disciplineSelections) {
          await this.upsertDisciplineProofMark(txRepos, trailDay, selection, resolvedAt);
        }
      }

      const refreshedSummary = await this.getSummaryWithRepositories(txRepos, trailDay.id);
      const judgment = await this.buildJudgment(txRepos, updatedTrailDay, refreshedSummary);
      const characterResult = judgment.character.label ?? input.characterResult ?? "Closed";
      const finalizedTrailDay = await txRepos.trailDays.updateCloseState(updatedTrailDay.id, {
        characterResult,
        closeSummary: input.closeSummary ?? judgment.day.label,
      });

      const marksToReview = await this.listMarksToReviewWithRepositories(txRepos, input.trailDayId);
      const memories = await this.listCloseTrailMemoriesWithRepositories(txRepos, input.trailDayId);

      return {
        trailDay: finalizedTrailDay,
        summary: refreshedSummary,
        reflectionEntries,
        marksToReview,
        memories,
        judgment: {
          ...judgment,
          trailDay: finalizedTrailDay,
        },
      };
    });
  }

  async reopenTrailDay(input: ReopenTrailDayInput): Promise<TrailDay> {
    return this.repositories.transaction.runInTransaction(async (txRepos) => {
      const trailDay = await txRepos.trailDays.getTrailDayById(input.trailDayId);
      if (!trailDay) {
        throw new CloseTrailEngineNotFoundError(input.trailDayId);
      }
      if (trailDay.status !== TrailDayStatus.Closed) {
        throw new CloseTrailEngineValidationError("Only closed TrailDays can be reopened.");
      }

      return txRepos.trailDays.updateCloseState(input.trailDayId, {
        status: TrailDayStatus.Reopened,
        reopenedAt: input.reopenedAt,
      });
    });
  }

  async listMarksToReviewForClose(trailDayId: string): Promise<CloseTrailMarkReview> {
    return this.listMarksToReviewWithRepositories(this.repositories, trailDayId);
  }

  async listCloseTrailMemories(trailDayId: string) {
    return this.listCloseTrailMemoriesWithRepositories(this.repositories, trailDayId);
  }

  private async listMarksToReviewWithRepositories(
    repos: WaymarkRepositories,
    trailDayId: string,
  ): Promise<CloseTrailMarkReview> {
    const marks = await repos.marks.listMarkInstancesByTrailDay(trailDayId);
    const unresolved: typeof marks = [];
    const resolved: typeof marks = [];

    for (const mark of marks) {
      if (mark.status === MarkInstanceStatus.Cancelled) {
        continue;
      }
      if (UNRESOLVED_MARK_STATUSES.has(mark.status)) {
        unresolved.push(mark);
      } else {
        resolved.push(mark);
      }
    }

    return { unresolved, resolved };
  }

  private async listCloseTrailMemoriesWithRepositories(repos: WaymarkRepositories, trailDayId: string) {
    return repos.memories.listMemoriesByTrailDay(trailDayId);
  }

  private async resolveTrailDaySignals(repos: WaymarkRepositories, trailDayId: string, resolvedAt: string) {
    const signals = await repos.signals.listSignalsByTarget(SignalTargetType.TrailDay, trailDayId);
    const resolvedSignals = [];
    for (const signal of signals) {
      if (!RESOLVABLE_SIGNAL_STATUSES.has(signal.status)) {
        continue;
      }
      resolvedSignals.push(
        await repos.signals.updateSignal(signal.id, {
          status: SignalStatus.Resolved,
          resolvedAt,
        }),
      );
    }
    return resolvedSignals;
  }

  private async listDisciplineOptions(userId: string) {
    const configs = await listCloseTrailRuleConfigs(this.repositories.appSettings, userId);
    return configs.flatMap((config) => config.disciplines);
  }

  private async getTomorrowFirstStepPreview(
    repos: WaymarkRepositories,
    trailDay: TrailDay,
  ): Promise<CloseTrailFirstStepPreview | undefined> {
    const nextLocalDate = shiftLocalDate(trailDay.date, 1);
    const nextDayMarks = await repos.marks.listMarkInstancesByDate(trailDay.userId, nextLocalDate);
    const activePaths = await repos.paths.listActivePaths(trailDay.userId);
    const pathTitleById = new Map(activePaths.map((path) => [path.id, path.title] as const));
    const ranked = await Promise.all(
      nextDayMarks.map(async (mark) => ({
        mark,
        metadata: await getMarkMetadata(repos.appSettings, trailDay.userId, mark.id),
      })),
    );

    const first = ranked
      .filter(({ mark, metadata }) =>
        mark.origin !== MarkInstanceOrigin.QuickCapture &&
        mark.status !== MarkInstanceStatus.Cancelled &&
        metadata?.appearsInToday !== false,
      )
      .sort((left, right) => {
        const leftOrder = left.metadata?.orderIndex ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.metadata?.orderIndex ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }
        const leftStart = left.mark.scheduledStartAt ?? "";
        const rightStart = right.mark.scheduledStartAt ?? "";
        if (leftStart !== rightStart) {
          return leftStart.localeCompare(rightStart);
        }
        return left.mark.createdAt.localeCompare(right.mark.createdAt);
      })[0];

    if (!first) {
      return undefined;
    }

    const scheduledTime = formatTimeLabel(first.mark.scheduledStartAt ?? first.mark.dueAt);
    const pathLabel = pathTitleById.get(first.mark.pathId);
    return {
      plannedMarkId: first.mark.id,
      title: first.mark.title,
      pathLabel,
      scheduledTime,
      snapshotText: [scheduledTime, first.mark.title, pathLabel].filter(Boolean).join(" · "),
    };
  }

  private async getResolvedTrailDay(trailDayId: string): Promise<TrailDay> {
    const trailDay = await this.repositories.trailDays.getTrailDayById(trailDayId);
    if (!trailDay) {
      throw new CloseTrailEngineNotFoundError(trailDayId);
    }
    const activePaths = await this.repositories.paths.listActivePaths(trailDay.userId);
    const resolvedAnchorPathId = await resolveAnchorPathIdForDate(
      this.repositories.appSettings,
      trailDay.userId,
      trailDay,
      activePaths,
    );
    if (resolvedAnchorPathId && trailDay.anchorPathId !== resolvedAnchorPathId) {
      return this.repositories.trailDays.setAnchorPath(trailDay.id, resolvedAnchorPathId);
    }
    return trailDay;
  }

  private async projectCharacterForTrailDay(repos: WaymarkRepositories, trailDayId: string) {
    const trailDay = await repos.trailDays.getTrailDayById(trailDayId);
    if (!trailDay) {
      throw new CloseTrailEngineNotFoundError(trailDayId);
    }

    const [marks, disciplineProofs] = await Promise.all([
      repos.marks.listMarkInstancesByTrailDay(trailDayId),
      listDisciplineProofsByTrailDay(repos.appSettings, trailDay.userId, trailDayId),
    ]);
    const marksWithMetadata = await Promise.all(
      marks.map(async (mark) => ({
        mark,
        metadata: await getMarkMetadata(repos.appSettings, trailDay.userId, mark.id),
      })),
    );
    return projectCharacterFromRecords({
      marks: marksWithMetadata,
      disciplineProofs,
    });
  }

  private async getSummaryWithRepositories(repos: WaymarkRepositories, trailDayId: string): Promise<CloseTrailSummary> {
    const trailDay = await repos.trailDays.getTrailDayById(trailDayId);
    if (!trailDay) {
      throw new CloseTrailEngineNotFoundError(trailDayId);
    }

    const marks = await repos.marks.listMarkInstancesByTrailDay(trailDayId);
    const memories = await repos.memories.listMemoriesByTrailDay(trailDayId);
    const packChecks = await repos.packChecks.listInstancesByTrailDay(trailDayId);
    const signals = await repos.signals.listSignalsByTarget(SignalTargetType.TrailDay, trailDayId);
    const counts = buildCloseTrailSummaryCounts(
      await Promise.all(
        marks.map(async (mark) => ({
          mark,
          metadata: await getMarkMetadata(repos.appSettings, trailDay.userId, mark.id),
        })),
      ),
    );

    return {
      trailDayId,
      localDate: trailDay.date,
      plannedCount: counts.plannedCount,
      completedCount: counts.completedCount,
      partiallyCompletedCount: counts.partiallyCompletedCount,
      skippedCount: counts.skippedCount,
      rescheduledCount: counts.rescheduledCount,
      substitutedCount: counts.substitutedCount,
      expiredCount: counts.expiredCount,
      cancelledCount: counts.cancelledCount,
      unresolvedCount: counts.unresolvedCount,
      memoryCount: memories.length,
      quickMarkCount: counts.quickMarkCount,
      signalMissedCount: signals.filter(
        (signal) => signal.status === SignalStatus.Expired || signal.status === SignalStatus.Missed,
      ).length,
      packCheckCompletedCount: packChecks.filter((instance) => instance.status === "completed").length,
      completionRatio: buildCompletionRatio(counts.completedCount, counts.plannedCount),
    };
  }

  private async buildJudgment(
    repos: WaymarkRepositories,
    trailDay: TrailDay,
    summary: CloseTrailSummary,
  ): Promise<CloseTrailJudgment> {
    const disciplineOptions = await this.listDisciplineOptions(trailDay.userId);
    const disciplineProofs = await listDisciplineProofsByTrailDay(repos.appSettings, trailDay.userId, trailDay.id);
    const completedDisciplineKeys = new Set(disciplineProofs.map((proof) => proof.key));
    const totalDisciplineStandards = disciplineOptions.length;
    const completedDisciplineStandards = disciplineProofs.length;
    const plannedCompletionRate = summary.plannedCount > 0 ? summary.completedCount / summary.plannedCount : 0;
    const dayPassed = plannedCompletionRate >= 0.8 && summary.memoryCount >= 1;
    const completedCharacterItems = summary.completedCount + completedDisciplineStandards;
    const totalCharacterItems = summary.plannedCount + totalDisciplineStandards;
    const characterCompletionRate = totalCharacterItems > 0 ? completedCharacterItems / totalCharacterItems : 0;
    const characterPassed = characterCompletionRate >= 0.8;
    const marks = await repos.marks.listMarkInstancesByTrailDay(trailDay.id);
    const marksWithMetadata = await Promise.all(
      marks.map(async (mark) => ({
        mark,
        metadata: await getMarkMetadata(repos.appSettings, trailDay.userId, mark.id),
      })),
    );
    const activePaths = await repos.paths.listActivePaths(trailDay.userId);
    const pathTitleById = new Map(activePaths.map((path) => [path.id, path.title] as const));
    const relatedMarkIds = new Set<string>();
    for (const { mark } of marksWithMetadata) {
      if (mark.substitutedByMarkId) {
        relatedMarkIds.add(mark.substitutedByMarkId);
      }
      if (mark.rescheduledToMarkId) {
        relatedMarkIds.add(mark.rescheduledToMarkId);
      }
    }
    const relatedMarks = await Promise.all(
      [...relatedMarkIds].map(async (markId) => {
        const mark = await repos.marks.getMarkInstanceById(markId);
        if (!mark) {
          return null;
        }
        return {
          mark,
          metadata: await getMarkMetadata(repos.appSettings, trailDay.userId, mark.id),
        };
      }),
    );
    const relatedMarkById = new Map(
      relatedMarks
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .map((entry) => [entry.mark.id, entry] as const),
    );
    const trailDayIds = new Set<string>();
    for (const entry of relatedMarkById.values()) {
      trailDayIds.add(entry.mark.trailDayId);
    }
    const relatedTrailDays = await Promise.all(
      [...trailDayIds].map(async (trailDayId) => {
        const targetDay = await repos.trailDays.getTrailDayById(trailDayId);
        return targetDay ? [trailDayId, targetDay] as const : null;
      }),
    );
    const trailDayById = new Map(
      relatedTrailDays
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .map((entry) => entry),
    );
    const repairEntries = marksWithMetadata.filter(
      ({ mark }) => mark.origin !== MarkInstanceOrigin.QuickCapture && NEEDS_REPAIR_MARK_STATUSES.has(mark.status),
    );
    const outcomeCounts = {
      completed: summary.completedCount,
      partiallyCompleted: summary.partiallyCompletedCount,
      substituted: summary.substitutedCount,
      skipped: summary.skippedCount,
      moved: summary.rescheduledCount,
      unresolved: repairEntries.length,
    };
    const plannedMarkOutcomeSentence = [
      `${formatCountLabel(outcomeCounts.completed, "mark completed", "marks completed")}.`,
      outcomeCounts.partiallyCompleted > 0 ?
        `${formatCountLabel(outcomeCounts.partiallyCompleted, "partial workout", "partial workouts")}.`
      : undefined,
      `${formatCountLabel(outcomeCounts.moved, "moved")}.`,
      `${formatCountLabel(outcomeCounts.skipped, "skipped")}.`,
      `${formatCountLabel(outcomeCounts.substituted, "substituted")}.`,
      `${outcomeCounts.unresolved === 1 ? "1 mark needs repair." : `${outcomeCounts.unresolved} marks need repair.`}`,
    ].filter(Boolean).join(" ");
    const tomorrowFirstStep = await this.getTomorrowFirstStepPreview(repos, trailDay);

    return {
      trailDay,
      summary,
      day: {
        passed: dayPassed,
        label: dayPassed ? "The Day is Marked." : "The Day Needs Repair.",
        icon: dayPassed ? "judgment.trailResult" : "judgment.repairPath",
        memoryCount: summary.memoryCount,
        disciplineProofCount: completedDisciplineStandards,
      },
      character: {
        passed: characterPassed,
        label: characterPassed ? "Character is Protected." : "Character Needs Repair.",
        icon: characterPassed ? "judgment.protectedCharacter" : "judgment.repairPath",
        completedPlannedMarks: summary.completedCount,
        totalPlannedMarks: summary.plannedCount,
        completedDisciplineStandards,
        totalDisciplineStandards,
        completedCharacterItems,
        totalCharacterItems,
      },
      plannedMarkOutcomes: {
        sentence: plannedMarkOutcomeSentence,
        counts: outcomeCounts,
        substituted: marksWithMetadata
          .filter(
            ({ mark }) =>
              mark.origin !== MarkInstanceOrigin.QuickCapture && mark.status === MarkInstanceStatus.Substituted,
          )
          .map(({ mark }) => {
            const substitute = mark.substitutedByMarkId ? relatedMarkById.get(mark.substitutedByMarkId) : undefined;
            return {
              originalMarkId: mark.id,
              originalTitle: mark.title,
              substituteMarkId: substitute?.mark.id,
              substituteTitle: substitute?.mark.title ?? "Substitute mark not found",
              resultLabel: substitute ? formatMarkStatusLabel(substitute.mark.status) : undefined,
            };
          }),
        skipped: marksWithMetadata
          .filter(({ mark }) => mark.origin !== MarkInstanceOrigin.QuickCapture && mark.status === MarkInstanceStatus.Skipped)
          .map(({ mark, metadata }) => ({
            markId: mark.id,
            title: mark.title,
            reason: metadata?.resolutionReason,
          })),
        moved: marksWithMetadata
          .filter(
            ({ mark }) =>
              mark.origin !== MarkInstanceOrigin.QuickCapture && mark.status === MarkInstanceStatus.Rescheduled,
          )
          .map(({ mark, metadata }) => {
            const destination = mark.rescheduledToMarkId ? relatedMarkById.get(mark.rescheduledToMarkId) : undefined;
            const destinationTrailDay =
              destination ? trailDayById.get(destination.mark.trailDayId) : undefined;
            const destinationTime = destination ?
              formatTimeLabel(destination.mark.scheduledStartAt ?? destination.mark.dueAt)
              : undefined;
            const destinationBlock = destination ? formatBlockLabel(destination.metadata?.blockType) : undefined;
            const destinationPath = destination ? pathTitleById.get(destination.mark.pathId) : undefined;
            const destinationDate =
              destinationTrailDay ? formatRelativeDateLabel(trailDay.date, destinationTrailDay.date) : undefined;
            const destinationLabel =
              destination ?
                [destinationDate, destinationTime, destinationBlock, destinationPath].filter(Boolean).join(", ")
              : "Moved — destination not set.";

            return {
              markId: mark.id,
              title: mark.title,
              destinationLabel: destinationLabel || "Moved — destination not set.",
              destinationDate,
              destinationTime,
              destinationBlock,
              destinationPath,
              reason: metadata?.resolutionReason,
            };
          }),
        unresolved: repairEntries.map(({ mark }) => ({
          markId: mark.id,
          title: mark.title,
          statusLabel: formatMarkStatusLabel(mark.status),
        })),
      },
      disciplineProofs: disciplineOptions.map((option) => ({
        key: option.key,
        label: option.label,
        completed: completedDisciplineKeys.has(option.key),
      })),
      tomorrowFirstStep,
    };
  }

  private async upsertDisciplineProofMark(
    repos: WaymarkRepositories,
    trailDay: TrailDay,
    selection: NonNullable<CloseTrailDayInput["disciplineSelections"]>[number],
    resolvedAt: string,
  ) {
    const proofId = `close_trail:${trailDay.id}:${selection.key}`;
    const proof = await createDisciplineProof(repos.appSettings, trailDay.userId, {
      id: proofId,
      trailDayId: trailDay.id,
      pathId: selection.pathId,
      key: selection.key,
      label: selection.label,
      savedAt: resolvedAt,
    });

    const existingMarks = await repos.marks.listMarkInstancesByTrailDay(trailDay.id);
    const existingWithMetadata = await Promise.all(
      existingMarks.map(async (mark) => ({
        mark,
        metadata: await getMarkMetadata(repos.appSettings, trailDay.userId, mark.id),
      })),
    );
    const existing = existingWithMetadata.find(
      ({ metadata }) =>
        metadata?.source === "close_trail" &&
        metadata?.quickMarkType === "discipline_to_keep" &&
        metadata?.sourceDisciplineKey === selection.key,
    );

    const mark =
      existing ?
        await repos.marks.updateMarkInstance(existing.mark.id, {
          pathId: selection.pathId,
          expeditionId: selection.expeditionId ?? null,
          milestoneId: selection.milestoneId ?? null,
          title: selection.label,
          description: `Discipline kept during Close the Trail: ${selection.label}`,
          status: MarkInstanceStatus.Completed,
          scheduledStartAt: resolvedAt,
          dueAt: resolvedAt,
          completedAt: resolvedAt,
          proofNote: selection.label,
          completionSummary: selection.label,
        })
      : await repos.marks.createMarkInstance({
          userId: trailDay.userId,
          pathId: selection.pathId,
          expeditionId: selection.expeditionId ?? null,
          milestoneId: selection.milestoneId ?? null,
          trailDayId: trailDay.id,
          title: selection.label,
          description: `Discipline kept during Close the Trail: ${selection.label}`,
          origin: MarkInstanceOrigin.QuickCapture,
          status: MarkInstanceStatus.Completed,
          scheduledStartAt: resolvedAt,
          dueAt: resolvedAt,
          completedAt: resolvedAt,
          proofNote: selection.label,
          completionSummary: selection.label,
          proofMediaAssetIds: [],
        });

    await saveDisciplineProof(repos.appSettings, trailDay.userId, {
      ...proof,
      createdMarkId: mark.id,
      savedAt: resolvedAt,
    });
    await setMarkMetadata(repos.appSettings, trailDay.userId, {
      ...(existing?.metadata ?? {}),
      markId: mark.id,
      quickMarkType: "discipline_to_keep",
      source: "close_trail",
      sourceDisciplineProofId: proof.id,
      sourceDisciplineKey: selection.key,
      appearsInToday: false,
      appearsInPathProof: true,
      appearsInJournal: true,
      resolutionKind: "discipline_kept",
      characterEffect: "kept",
      countsAsPathProof: true,
    });
  }
}

export function createCloseTrailEngine(repositories: WaymarkRepositories, signalEngine?: SignalEngine): CloseTrailEngine {
  return new DefaultCloseTrailEngine(repositories, signalEngine);
}
