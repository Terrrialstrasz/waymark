import {
  CompleteMarkInstanceInput,
  CreateDependencyInput,
  CreateMarkInstanceInput,
  DependencyRequiredEntityType,
  DependencyStatus,
  DependencyType,
  EntityId,
  ISODateTimeString,
  LocalDateString,
  MarkDependency,
  MarkEngine,
  MarkInstance,
  MarkInstanceOrigin,
  MarkInstanceStatus,
  MarkReadinessResult,
  MarkTemplate,
  PackCheckInstanceStatus,
  PartiallyCompleteMarkInstanceInput,
  RescheduleMarkInstanceInput,
  RescheduleMarkInstanceResult,
  SignalStatus,
  SignalEngine,
  SignalTargetType,
  SkipMarkInstanceInput,
  SubstituteMarkInstanceInput,
  SubstituteMarkInstanceResult,
  WaymarkRepositories,
} from "../../domain/waymark";
import { type DailyMarkAssignment, getDailyMarkAssignmentForTemplateDate } from "./dailyMarkPlanStore";
import { copyMarkExecutionPresentationMetadata, getMarkMetadata, setMarkMetadata } from "./markMetadataStore";
import { getMarkTemplateSeedMetadata } from "./markTemplateSeedStore";
import { getSignalBehavior, setSignalBehavior } from "./signalBehaviorStore";
import { recomputeEffectiveTrailDayExecutionCounters } from "./plannedMarkSourceOfTruth";
import { buildZonedDateTime } from "../../app/waymarkUi";

const MARK_STATUS_DISPLAY_LABELS: Record<MarkInstanceStatus, string> = {
  [MarkInstanceStatus.Planned]: "Planned",
  [MarkInstanceStatus.Ready]: "Ready",
  [MarkInstanceStatus.Blocked]: "Blocked",
  [MarkInstanceStatus.Active]: "Active",
  [MarkInstanceStatus.Completed]: "Completed",
  [MarkInstanceStatus.PartiallyCompleted]: "Partial Complete",
  [MarkInstanceStatus.Skipped]: "Skipped",
  [MarkInstanceStatus.Rescheduled]: "Rescheduled",
  [MarkInstanceStatus.Substituted]: "Substituted",
  [MarkInstanceStatus.Expired]: "Expired",
  [MarkInstanceStatus.Cancelled]: "Cancelled",
};

const TRANSITION_TABLE: Record<MarkInstanceStatus, ReadonlySet<MarkInstanceStatus>> = {
  [MarkInstanceStatus.Planned]: new Set([
    MarkInstanceStatus.Ready,
    MarkInstanceStatus.Blocked,
    MarkInstanceStatus.Skipped,
    MarkInstanceStatus.Rescheduled,
    MarkInstanceStatus.Substituted,
    MarkInstanceStatus.Expired,
    MarkInstanceStatus.Cancelled,
  ]),
  [MarkInstanceStatus.Ready]: new Set([
    MarkInstanceStatus.Blocked,
    MarkInstanceStatus.Active,
    MarkInstanceStatus.Completed,
    MarkInstanceStatus.PartiallyCompleted,
    MarkInstanceStatus.Skipped,
    MarkInstanceStatus.Rescheduled,
    MarkInstanceStatus.Substituted,
    MarkInstanceStatus.Expired,
    MarkInstanceStatus.Cancelled,
  ]),
  [MarkInstanceStatus.Blocked]: new Set([
    MarkInstanceStatus.Ready,
    MarkInstanceStatus.Skipped,
    MarkInstanceStatus.Rescheduled,
    MarkInstanceStatus.Substituted,
    MarkInstanceStatus.Expired,
    MarkInstanceStatus.Cancelled,
  ]),
  [MarkInstanceStatus.Active]: new Set([
    MarkInstanceStatus.Completed,
    MarkInstanceStatus.PartiallyCompleted,
    MarkInstanceStatus.Skipped,
  ]),
  [MarkInstanceStatus.Completed]: new Set(),
  [MarkInstanceStatus.PartiallyCompleted]: new Set(),
  [MarkInstanceStatus.Skipped]: new Set(),
  [MarkInstanceStatus.Rescheduled]: new Set(),
  [MarkInstanceStatus.Substituted]: new Set(),
  [MarkInstanceStatus.Expired]: new Set(),
  [MarkInstanceStatus.Cancelled]: new Set(),
};

const DEFAULT_VISIBLE_STATUSES = new Set<MarkInstanceStatus>([
  MarkInstanceStatus.Planned,
  MarkInstanceStatus.Ready,
  MarkInstanceStatus.Blocked,
  MarkInstanceStatus.Active,
  MarkInstanceStatus.Completed,
  MarkInstanceStatus.PartiallyCompleted,
  MarkInstanceStatus.Skipped,
  MarkInstanceStatus.Rescheduled,
  MarkInstanceStatus.Substituted,
  MarkInstanceStatus.Expired,
]);

const UNRESOLVED_SIGNAL_STATUSES = new Set<SignalStatus>([
  SignalStatus.Scheduled,
  SignalStatus.Ringing,
  SignalStatus.Snoozed,
]);

const TODAY_STATUS_ORDER: Record<MarkInstanceStatus, number> = {
  [MarkInstanceStatus.Active]: 0,
  [MarkInstanceStatus.Ready]: 1,
  [MarkInstanceStatus.Blocked]: 2,
  [MarkInstanceStatus.Planned]: 3,
  [MarkInstanceStatus.Completed]: 4,
  [MarkInstanceStatus.PartiallyCompleted]: 5,
  [MarkInstanceStatus.Skipped]: 6,
  [MarkInstanceStatus.Rescheduled]: 7,
  [MarkInstanceStatus.Substituted]: 8,
  [MarkInstanceStatus.Expired]: 9,
  [MarkInstanceStatus.Cancelled]: 10,
};

export class InvalidMarkTransitionError extends Error {
  constructor(from: MarkInstanceStatus, to: MarkInstanceStatus) {
    super(`Invalid Mark status transition ${from} -> ${to}.`);
    this.name = "InvalidMarkTransitionError";
  }
}

export class MarkEngineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarkEngineValidationError";
  }
}

export function getMarkStatusDisplayLabel(status: MarkInstanceStatus): string {
  return MARK_STATUS_DISPLAY_LABELS[status];
}

export function isMarkFinalStatus(status: MarkInstanceStatus): boolean {
  return (
    status === MarkInstanceStatus.Completed ||
    status === MarkInstanceStatus.PartiallyCompleted ||
    status === MarkInstanceStatus.Skipped ||
    status === MarkInstanceStatus.Rescheduled ||
    status === MarkInstanceStatus.Substituted ||
    status === MarkInstanceStatus.Expired ||
    status === MarkInstanceStatus.Cancelled
  );
}

export function isMarkResolvedStatus(status: MarkInstanceStatus): boolean {
  return (
    status === MarkInstanceStatus.Completed ||
    status === MarkInstanceStatus.PartiallyCompleted ||
    status === MarkInstanceStatus.Skipped ||
    status === MarkInstanceStatus.Rescheduled ||
    status === MarkInstanceStatus.Substituted ||
    status === MarkInstanceStatus.Cancelled
  );
}

export function isMarkCompletableStatus(status: MarkInstanceStatus): boolean {
  return status === MarkInstanceStatus.Ready || status === MarkInstanceStatus.Active;
}

export function isMarkSkippableStatus(status: MarkInstanceStatus): boolean {
  return (
    status === MarkInstanceStatus.Planned ||
    status === MarkInstanceStatus.Ready ||
    status === MarkInstanceStatus.Blocked ||
    status === MarkInstanceStatus.Active
  );
}

export function canMarkBeCompleted(mark: MarkInstance): boolean {
  return !isMarkFinalStatus(mark.status) && isMarkCompletableStatus(mark.status);
}

export function canMarkBeSkipped(mark: MarkInstance): boolean {
  return !isMarkFinalStatus(mark.status) && isMarkSkippableStatus(mark.status);
}

function canTransitionMarkStatusInternal(from: MarkInstanceStatus, to: MarkInstanceStatus): boolean {
  if (from === to) {
    return true;
  }
  return TRANSITION_TABLE[from]?.has(to) ?? false;
}

function assertValidMarkTransition(from: MarkInstanceStatus, to: MarkInstanceStatus): void {
  if (!canTransitionMarkStatusInternal(from, to)) {
    throw new InvalidMarkTransitionError(from, to);
  }
}

function transitionMarkStatus(mark: MarkInstance, to: MarkInstanceStatus): MarkInstance {
  assertValidMarkTransition(mark.status, to);
  return { ...mark, status: to };
}

function nowIso(input?: ISODateTimeString): ISODateTimeString {
  return input ?? new Date().toISOString();
}

function localDateToEpochDay(localDate: LocalDateString): number {
  return Math.floor(Date.parse(`${localDate}T00:00:00Z`) / 86_400_000);
}

function localDateToWeekday(localDate: LocalDateString): number {
  return new Date(`${localDate}T00:00:00Z`).getUTCDay();
}

function sortMarksForToday(items: MarkInstance[]): MarkInstance[] {
  return [...items].sort((left, right) => {
    const statusOrder = (TODAY_STATUS_ORDER[left.status] ?? 99) - (TODAY_STATUS_ORDER[right.status] ?? 99);
    if (statusOrder !== 0) {
      return statusOrder;
    }

    const leftStart = left.scheduledStartAt ?? "";
    const rightStart = right.scheduledStartAt ?? "";
    if (leftStart !== rightStart) {
      return leftStart.localeCompare(rightStart);
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

type GeneratedMarkPresentation = {
  input: CreateMarkInstanceInput;
  metadata: {
    sourceKind?: "weekly_coding" | "generated_by_engine";
    appearsInToday?: boolean;
    countsAsPathProof?: boolean;
    orderIndex?: number;
    blockType?: "focus_block" | "supervising_block" | "family_block" | "workout_block";
    taskKind?: "work_focus";
    requiresText?: boolean;
    milestoneSourceSeedId?: string;
  };
};

function buildGenerationKey(template: MarkTemplate, localDate: LocalDateString): string {
  if (template.recurrenceRule.kind === "custom_cycle") {
    return `mark_template:${template.id}:date:${localDate}:cycle:${template.recurrenceRule.customCycleKey ?? "default"}:${template.recurrenceRule.customCycleIndex ?? 0}`;
  }

  return `mark_template:${template.id}:date:${localDate}:kind:${template.recurrenceRule.kind}`;
}

function equalNullableString(left?: string | null, right?: string | null) {
  return (left ?? null) === (right ?? null);
}

function shouldGenerateForDate(
  template: MarkTemplate,
  localDate: LocalDateString,
  cycleGroupSize: number,
  metadata?: Awaited<ReturnType<typeof getMarkTemplateSeedMetadata>> | null,
): boolean {
  if (metadata?.startDate && localDate < metadata.startDate) {
    return false;
  }
  if (metadata?.endDate && localDate > metadata.endDate) {
    return false;
  }

  const rule = template.recurrenceRule;
  switch (rule.kind) {
    case "calendar":
      return metadata?.calendarDates?.includes(localDate) ?? false;
    case "daily": {
      const interval = Math.max(rule.interval ?? 1, 1);
      return localDateToEpochDay(localDate) % interval === 0;
    }
    case "weekly": {
      const weekdays = rule.daysOfWeek ?? [];
      const weekday = localDateToWeekday(localDate);
      const interval = Math.max(rule.interval ?? 1, 1);
      return weekdays.includes(weekday) && Math.floor(localDateToEpochDay(localDate) / 7) % interval === 0;
    }
    case "manual":
      return false;
    case "custom_cycle": {
      if (!cycleGroupSize || rule.customCycleIndex === undefined) {
        return false;
      }
      const baseEpochDay = metadata?.startDate ? localDateToEpochDay(metadata.startDate) : 0;
      const cyclePosition =
        (((localDateToEpochDay(localDate) - baseEpochDay) % cycleGroupSize) + cycleGroupSize) % cycleGroupSize;
      return cyclePosition === rule.customCycleIndex;
    }
    default:
      return false;
  }
}

export class DefaultMarkEngine implements MarkEngine {
  constructor(
    private readonly repositories: WaymarkRepositories,
    private readonly signalEngine?: SignalEngine,
  ) {}

  canTransitionMarkStatus(from: MarkInstanceStatus, to: MarkInstanceStatus): boolean {
    return canTransitionMarkStatusInternal(from, to);
  }

  async completeMarkInstance(input: CompleteMarkInstanceInput): Promise<MarkInstance> {
    if (input.force) {
      throw new MarkEngineValidationError("Force completion is not supported in the current Mark Engine pass.");
    }

    const updated = await this.repositories.transaction.runInTransaction(async (repos) => {
      const mark = await this.requireMark(repos, input.markInstanceId);
      const completedAt = nowIso(input.completedAt);

      const candidate = await this.ensureCompletableMark(repos, mark);
      const updated = await repos.marks.updateMarkInstance(candidate.id, {
        status: transitionMarkStatus(candidate, MarkInstanceStatus.Completed).status,
        completedAt,
        proofNote: input.proofNote ?? null,
        completionSummary: input.completionSummary ?? null,
      });

      await this.resolveSignalsForMark(repos, updated.id, completedAt);
      await this.settleDependenciesForResolvedMark(repos, updated, completedAt);
      const trailDay = await repos.trailDays.getTrailDayById(updated.trailDayId);
      if (trailDay) {
        await recomputeEffectiveTrailDayExecutionCounters(repos, updated.userId, trailDay.date);
      }

      return updated;
    });
    await this.reconcileSignalDeliveriesAfterCommit(updated.userId);
    return updated;
  }

  async partiallyCompleteMarkInstance(input: PartiallyCompleteMarkInstanceInput): Promise<MarkInstance> {
    const updated = await this.repositories.transaction.runInTransaction(async (repos) => {
      const mark = await this.requireMark(repos, input.markInstanceId);
      const completedAt = nowIso(input.completedAt);

      const candidate = await this.ensureCompletableMark(repos, mark);
      const updated = await repos.marks.updateMarkInstance(candidate.id, {
        status: transitionMarkStatus(candidate, MarkInstanceStatus.PartiallyCompleted).status,
        completedAt,
        proofNote: input.proofNote ?? null,
        completionSummary: input.completionSummary ?? null,
      });

      await this.resolveSignalsForMark(repos, updated.id, completedAt);
      await this.settleDependenciesForResolvedMark(repos, updated, completedAt);
      const trailDay = await repos.trailDays.getTrailDayById(updated.trailDayId);
      if (trailDay) {
        await recomputeEffectiveTrailDayExecutionCounters(repos, updated.userId, trailDay.date);
      }

      return updated;
    });
    await this.reconcileSignalDeliveriesAfterCommit(updated.userId);
    return updated;
  }

  async skipMarkInstance(input: SkipMarkInstanceInput): Promise<MarkInstance> {
    const updated = await this.repositories.transaction.runInTransaction(async (repos) => {
      const mark = await this.requireMark(repos, input.markInstanceId);
      if (!canMarkBeSkipped(mark)) {
        throw new MarkEngineValidationError(`Mark ${mark.id} in status ${mark.status} cannot be skipped.`);
      }

      const skippedAt = nowIso(input.skippedAt);
      const updated = await repos.marks.updateMarkInstance(mark.id, {
        status: transitionMarkStatus(mark, MarkInstanceStatus.Skipped).status,
        skippedAt,
      });
      const existingMetadata = await getMarkMetadata(repos.appSettings, mark.userId, mark.id);
      await setMarkMetadata(repos.appSettings, mark.userId, {
        ...existingMetadata,
        markId: mark.id,
        resolutionReason: input.reason ?? input.note ?? existingMetadata?.resolutionReason,
      });

      await this.cancelSignalsForMark(repos, updated.id);
      await this.settleDependenciesForResolvedMark(repos, updated, skippedAt);
      const trailDay = await repos.trailDays.getTrailDayById(updated.trailDayId);
      if (trailDay) {
        await recomputeEffectiveTrailDayExecutionCounters(repos, updated.userId, trailDay.date);
      }
      return updated;
    });
    await this.reconcileSignalDeliveriesAfterCommit(updated.userId);
    return updated;
  }

  async rescheduleMarkInstance(input: RescheduleMarkInstanceInput): Promise<RescheduleMarkInstanceResult> {
    const result = await this.repositories.transaction.runInTransaction(async (repos) => {
      const original = await this.requireMark(repos, input.markInstanceId);
      if (
        !(
          original.status === MarkInstanceStatus.Planned ||
          original.status === MarkInstanceStatus.Ready ||
          original.status === MarkInstanceStatus.Blocked
        )
      ) {
        throw new MarkEngineValidationError(`Mark ${original.id} in status ${original.status} cannot be rescheduled.`);
      }

      const targetTrailDay = await this.resolveTargetTrailDay(
        repos,
        original.userId,
        input.targetTrailDayId,
        input.targetLocalDate,
      );
      const sourceTrailDay = await repos.trailDays.getTrailDayById(original.trailDayId);
      if (!sourceTrailDay) {
        throw new MarkEngineValidationError(`Source TrailDay ${original.trailDayId} does not exist.`);
      }
      if (targetTrailDay.date <= sourceTrailDay.date) {
        throw new MarkEngineValidationError("A moved Mark must target a future TrailDay.");
      }

      const replacement = await repos.marks.createMarkInstance({
        userId: original.userId,
        pathId: original.pathId,
        trailDayId: targetTrailDay.id,
        templateId: original.templateId ?? null,
        expeditionId: original.expeditionId ?? null,
        milestoneId: original.milestoneId ?? null,
        title: original.title,
        description: original.description ?? null,
        origin: original.origin,
        status: MarkInstanceStatus.Planned,
        scheduledStartAt:
          input.scheduledStartAt ??
          rebaseDateTimeToLocalDate(original.scheduledStartAt, targetTrailDay.date) ??
          null,
        scheduledEndAt:
          input.scheduledEndAt ??
          rebaseDateTimeToLocalDate(original.scheduledEndAt, targetTrailDay.date) ??
          null,
        dueAt: input.dueAt ?? rebaseDateTimeToLocalDate(original.dueAt, targetTrailDay.date) ?? null,
        sourceBacklogItemId: original.sourceBacklogItemId ?? null,
        proofMediaAssetIds: [],
      });

      await this.recreateDependenciesForReplacement(repos, original.id, replacement.id);
      const readyReplacement = await this.refreshMarkReadinessWithinTransaction(repos, replacement.id);
      const updatedOriginal = await repos.marks.updateMarkInstance(original.id, {
        status: transitionMarkStatus(original, MarkInstanceStatus.Rescheduled).status,
        rescheduledToMarkId: replacement.id,
      });
      const existingMetadata = await getMarkMetadata(repos.appSettings, original.userId, original.id);
      await setMarkMetadata(repos.appSettings, original.userId, {
        ...existingMetadata,
        markId: original.id,
        resolutionReason: input.reason ?? existingMetadata?.resolutionReason,
      });

      await setMarkMetadata(
        repos.appSettings,
        original.userId,
        copyMarkExecutionPresentationMetadata(existingMetadata, readyReplacement.id),
      );

      await this.transferSignalsToReplacement(repos, updatedOriginal, readyReplacement, targetTrailDay.date);
      await this.settleDependenciesForResolvedMark(repos, updatedOriginal, nowIso());
      await recomputeEffectiveTrailDayExecutionCounters(repos, original.userId, sourceTrailDay.date);
      await recomputeEffectiveTrailDayExecutionCounters(repos, original.userId, targetTrailDay.date);

      return {
        original: updatedOriginal,
        replacement: readyReplacement,
      };
    });
    await this.reconcileSignalDeliveriesAfterCommit(result.original.userId);
    return result;
  }

  async substituteMarkInstance(input: SubstituteMarkInstanceInput): Promise<SubstituteMarkInstanceResult> {
    const result = await this.repositories.transaction.runInTransaction(async (repos) => {
      const original = await this.requireMark(repos, input.markInstanceId);
      if (
        !(
          original.status === MarkInstanceStatus.Planned ||
          original.status === MarkInstanceStatus.Ready ||
          original.status === MarkInstanceStatus.Blocked
        )
      ) {
        throw new MarkEngineValidationError(`Mark ${original.id} in status ${original.status} cannot be substituted.`);
      }
      if (await this.hasSubstitutionAncestor(repos, original.id)) {
        throw new MarkEngineValidationError(`Mark ${original.id} already belongs to a substitution chain.`);
      }

      const substituteTrailDay = await this.resolveTargetTrailDay(
        repos,
        original.userId,
        input.substituteTrailDayId ?? original.trailDayId,
        input.substituteLocalDate,
      );
      const sourceTrailDay = await repos.trailDays.getTrailDayById(original.trailDayId);
      if (!sourceTrailDay) {
        throw new MarkEngineValidationError(`Source TrailDay ${original.trailDayId} does not exist.`);
      }

      const substitute = await repos.marks.createMarkInstance({
        userId: original.userId,
        pathId: input.substitutePathId ?? original.pathId,
        trailDayId: substituteTrailDay.id,
        expeditionId: original.expeditionId ?? null,
        milestoneId: original.milestoneId ?? null,
        title: input.substituteTitle,
        description: input.substituteDescription ?? null,
        origin: MarkInstanceOrigin.Substitution,
        status: MarkInstanceStatus.Planned,
        scheduledStartAt: input.substituteScheduledStartAt ?? original.scheduledStartAt ?? null,
        scheduledEndAt: input.substituteScheduledEndAt ?? original.scheduledEndAt ?? null,
        dueAt: input.substituteDueAt ?? original.dueAt ?? null,
        proofMediaAssetIds: [],
      });

      await this.recreateDependenciesForReplacement(repos, original.id, substitute.id);

      let finalizedSubstitute: MarkInstance;
      if (input.substituteMode.mode === "completed_now") {
        const refreshed = await this.refreshMarkReadinessWithinTransaction(repos, substitute.id);
        const completable = await this.ensureCompletableMark(repos, refreshed);
        finalizedSubstitute = await repos.marks.updateMarkInstance(completable.id, {
          status: transitionMarkStatus(completable, MarkInstanceStatus.Completed).status,
          completedAt: nowIso(input.substituteMode.completedAt),
          proofNote: input.substituteMode.proofNote ?? null,
          completionSummary: input.substituteMode.completionSummary ?? null,
        });
      } else {
        finalizedSubstitute = await this.refreshMarkReadinessWithinTransaction(repos, substitute.id);
      }

      const updatedOriginal = await repos.marks.updateMarkInstance(original.id, {
        status: transitionMarkStatus(original, MarkInstanceStatus.Substituted).status,
        substitutedByMarkId: finalizedSubstitute.id,
      });

      const existingMetadata = await getMarkMetadata(repos.appSettings, original.userId, original.id);
      await setMarkMetadata(
        repos.appSettings,
        original.userId,
        copyMarkExecutionPresentationMetadata(existingMetadata, finalizedSubstitute.id),
      );

      await this.transferSignalsToReplacement(repos, updatedOriginal, finalizedSubstitute, substituteTrailDay.date);
      await this.settleDependenciesForResolvedMark(repos, updatedOriginal, nowIso());
      if (finalizedSubstitute.status === MarkInstanceStatus.Completed) {
        await this.resolveSignalsForMark(repos, finalizedSubstitute.id, finalizedSubstitute.completedAt ?? nowIso());
        await this.settleDependenciesForResolvedMark(
          repos,
          finalizedSubstitute,
          finalizedSubstitute.completedAt ?? nowIso(),
        );
      }
      await recomputeEffectiveTrailDayExecutionCounters(repos, original.userId, sourceTrailDay.date);
      if (substituteTrailDay.date !== sourceTrailDay.date) {
        await recomputeEffectiveTrailDayExecutionCounters(repos, original.userId, substituteTrailDay.date);
      }

      return {
        original: updatedOriginal,
        substitute: finalizedSubstitute,
      };
    });
    await this.reconcileSignalDeliveriesAfterCommit(result.original.userId);
    return result;
  }

  async evaluateMarkReadiness(markInstanceId: EntityId): Promise<MarkReadinessResult> {
    const mark = await this.requireMark(this.repositories, markInstanceId);
    return this.evaluateMarkReadinessWithRepositories(this.repositories, mark);
  }

  async refreshMarkReadiness(markInstanceId: EntityId): Promise<MarkInstance> {
    return this.repositories.transaction.runInTransaction((repos) =>
      this.refreshMarkReadinessWithinTransaction(repos, markInstanceId),
    );
  }

  async listVisibleMarksForDay(userId: EntityId, localDate: LocalDateString): Promise<MarkInstance[]> {
    const marks = await this.repositories.marks.listMarkInstancesByDate(userId, localDate);
    const visible: Array<{ mark: MarkInstance; orderIndex?: number }> = [];
    for (const mark of marks) {
      if (!DEFAULT_VISIBLE_STATUSES.has(mark.status)) {
        continue;
      }
      const metadata = await getMarkMetadata(this.repositories.appSettings, userId, mark.id);
      if (metadata?.appearsInToday === false) {
        continue;
      }
      visible.push({ mark, orderIndex: metadata?.orderIndex });
    }
    return sortMarksForToday(
      visible
        .sort((left, right) => {
          const leftOrder = left.orderIndex ?? Number.MAX_SAFE_INTEGER;
          const rightOrder = right.orderIndex ?? Number.MAX_SAFE_INTEGER;
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }
          return 0;
        })
        .map((entry) => entry.mark),
    );
  }

  async generateMarkInstancesForDate(userId: EntityId, localDate: LocalDateString): Promise<MarkInstance[]> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const generated: MarkInstance[] = [];
      const activePaths = await repos.paths.listActivePaths(userId);
      const activePathIds = new Set(activePaths.map((path) => path.id));
      const expectedGenerationKeys = new Set<string>();

      for (const path of activePaths) {
        const templates = await repos.marks.listActiveMarkTemplatesByPath(path.id);
        const cycleGroupSizes = new Map<string, number>();
        for (const template of templates) {
          const key = template.recurrenceRule.customCycleKey;
          if (template.recurrenceRule.kind === "custom_cycle" && key) {
            const groupSize = templates.filter(
              (candidate) =>
                candidate.recurrenceRule.kind === "custom_cycle" &&
                candidate.recurrenceRule.customCycleKey === key &&
                candidate.pathId === template.pathId,
            ).length;
            cycleGroupSizes.set(`${template.pathId}:${key}`, groupSize);
          }
        }

        for (const template of templates) {
          const templateMetadata = await getMarkTemplateSeedMetadata(repos.appSettings, userId, template.id);
          const cycleGroupSize =
            template.recurrenceRule.kind === "custom_cycle" && template.recurrenceRule.customCycleKey ?
              cycleGroupSizes.get(`${template.pathId}:${template.recurrenceRule.customCycleKey}`) ?? 0
            : 0;
          if (!shouldGenerateForDate(template, localDate, cycleGroupSize, templateMetadata)) {
            continue;
          }

          const generationKey = buildGenerationKey(template, localDate);
          expectedGenerationKeys.add(generationKey);
          const assignment = await getDailyMarkAssignmentForTemplateDate(
            repos.appSettings,
            userId,
            template.id,
            localDate,
          );
          const existing = await repos.marks.findMarkInstanceByGenerationKey(userId, generationKey);
          if (existing) {
            generated.push(
              await this.reconcileExistingGeneratedMark(
                repos,
                existing,
                template,
                localDate,
                templateMetadata,
                assignment,
              ),
            );
            continue;
          }

          const trailDay = await repos.trailDays.getOrCreateTrailDay(userId, localDate);
          const generatedPresentation = this.buildGeneratedMarkInput(
            template,
            trailDay.id,
            generationKey,
            localDate,
            templateMetadata,
            assignment,
          );
          const created = await repos.marks.createMarkInstance(generatedPresentation.input);
          await setMarkMetadata(repos.appSettings, userId, {
            markId: created.id,
            sourceKind: generatedPresentation.metadata.sourceKind,
            appearsInToday: generatedPresentation.metadata.appearsInToday,
            appearsInPathProof:
              generatedPresentation.metadata.countsAsPathProof === false ? false : undefined,
            countsAsPathProof: generatedPresentation.metadata.countsAsPathProof,
            orderIndex: generatedPresentation.metadata.orderIndex,
            blockType: generatedPresentation.metadata.blockType,
            taskKind: generatedPresentation.metadata.taskKind,
            requiresText: generatedPresentation.metadata.requiresText,
            milestoneSourceSeedId: generatedPresentation.metadata.milestoneSourceSeedId,
          });
          generated.push(created);
        }
      }

      const dayMarks = await repos.marks.listMarkInstancesByDate(userId, localDate);
      for (const mark of dayMarks) {
        if (!shouldRemoveStaleGeneratedMark(mark, activePathIds, expectedGenerationKeys)) {
          continue;
        }
        await repos.marks.softDeleteMarkInstance(mark.id);
      }

      return generated;
    });
  }

  private buildGeneratedMarkInput(
    template: MarkTemplate,
    trailDayId: EntityId,
    generationKey: string,
    localDate: LocalDateString,
    metadata?: Awaited<ReturnType<typeof getMarkTemplateSeedMetadata>> | null,
    assignment?: DailyMarkAssignment | null,
  ): GeneratedMarkPresentation {
    const scheduledTime = assignment?.scheduledTime ?? metadata?.scheduledTime;
    const scheduledEndTime = assignment?.scheduledEndTime ?? metadata?.scheduledEndTime;
    const dueTime = assignment?.dueTime ?? metadata?.dueTime;
    const scheduledStartAt = scheduledTime ? buildDateTime(localDate, scheduledTime) : undefined;
    const scheduledEndAt = scheduledEndTime ? buildDateTime(localDate, scheduledEndTime) : undefined;
    const dueAt = dueTime ? buildDateTime(localDate, dueTime) : undefined;
    const resolvedPresentation = resolveSeedPresentation(template, localDate, metadata);
    const title = assignment?.title ?? resolvedPresentation.title;
    const description = assignment?.description ?? resolvedPresentation.description ?? null;
    const expeditionId = assignment?.expeditionId ?? metadata?.expeditionId ?? undefined;
    const milestoneId = assignment?.milestoneId ?? metadata?.milestoneId ?? undefined;

    return {
      input: {
        userId: template.userId,
        pathId: assignment?.pathId ?? template.pathId,
        trailDayId,
        templateId: template.id,
        expeditionId,
        milestoneId,
        title,
        description,
        origin: MarkInstanceOrigin.TemplateGenerated,
        status: MarkInstanceStatus.Planned,
        scheduledStartAt: scheduledStartAt ?? null,
        scheduledEndAt: scheduledEndAt ?? null,
        dueAt: dueAt ?? null,
        generationKey,
        proofMediaAssetIds: [],
      },
      metadata: {
        sourceKind: assignment?.source ?? metadata?.source,
        appearsInToday: assignment?.appearsInToday ?? metadata?.appearsInToday,
        countsAsPathProof: assignment?.countsAsPathProof ?? metadata?.countsAsPathProof,
        orderIndex: assignment?.orderIndex ?? metadata?.orderIndex,
        blockType: assignment?.blockType ?? metadata?.blockType,
        taskKind: assignment?.taskKind ?? metadata?.taskKind,
        requiresText: assignment?.requiresText ?? metadata?.requiresText,
        milestoneSourceSeedId: assignment?.milestoneSourceSeedId ?? metadata?.milestoneSourceSeedId,
      },
    };
  }

  private async reconcileExistingGeneratedMark(
    repos: WaymarkRepositories,
    existing: MarkInstance,
    template: MarkTemplate,
    localDate: LocalDateString,
    metadata?: Awaited<ReturnType<typeof getMarkTemplateSeedMetadata>> | null,
    assignment?: DailyMarkAssignment | null,
  ): Promise<MarkInstance> {
    const generatedPresentation = this.buildGeneratedMarkInput(
      template,
      existing.trailDayId,
      existing.generationKey ?? buildGenerationKey(template, localDate),
      localDate,
      metadata,
      assignment,
    );

    const preserveUserEditedCoreFields = (existing.syncVersion ?? 0) > 0;
    const patch: {
      pathId?: string;
      title?: string;
      description?: string | null;
      expeditionId?: string | null;
      milestoneId?: string | null;
      scheduledStartAt?: string | null;
      scheduledEndAt?: string | null;
      dueAt?: string | null;
    } = {};

    if (!preserveUserEditedCoreFields) {
      if (existing.pathId !== generatedPresentation.input.pathId) {
        patch.pathId = generatedPresentation.input.pathId;
      }
      if (!equalNullableString(existing.title, generatedPresentation.input.title)) {
        patch.title = generatedPresentation.input.title;
      }
      if (!equalNullableString(existing.description, generatedPresentation.input.description)) {
        patch.description = generatedPresentation.input.description ?? null;
      }
      if (!equalNullableString(existing.expeditionId, generatedPresentation.input.expeditionId)) {
        patch.expeditionId = generatedPresentation.input.expeditionId ?? null;
      }
      if (!equalNullableString(existing.milestoneId, generatedPresentation.input.milestoneId)) {
        patch.milestoneId = generatedPresentation.input.milestoneId ?? null;
      }
      if (!equalNullableString(existing.scheduledStartAt, generatedPresentation.input.scheduledStartAt)) {
        patch.scheduledStartAt = generatedPresentation.input.scheduledStartAt ?? null;
      }
      if (!equalNullableString(existing.scheduledEndAt, generatedPresentation.input.scheduledEndAt)) {
        patch.scheduledEndAt = generatedPresentation.input.scheduledEndAt ?? null;
      }
      if (!equalNullableString(existing.dueAt, generatedPresentation.input.dueAt)) {
        patch.dueAt = generatedPresentation.input.dueAt ?? null;
      }
    }

    const reconciled =
      Object.keys(patch).length > 0 ? await repos.marks.updateMarkInstance(existing.id, patch) : existing;

    const existingMetadata = await getMarkMetadata(repos.appSettings, existing.userId, existing.id);
    await setMarkMetadata(repos.appSettings, existing.userId, {
      ...existingMetadata,
      markId: existing.id,
      sourceKind: generatedPresentation.metadata.sourceKind,
      appearsInToday: generatedPresentation.metadata.appearsInToday,
      appearsInPathProof:
        generatedPresentation.metadata.countsAsPathProof === false ? false : existingMetadata?.appearsInPathProof,
      countsAsPathProof: generatedPresentation.metadata.countsAsPathProof,
      orderIndex: generatedPresentation.metadata.orderIndex,
      blockType: generatedPresentation.metadata.blockType,
      taskKind: generatedPresentation.metadata.taskKind,
      requiresText: generatedPresentation.metadata.requiresText,
      milestoneSourceSeedId: generatedPresentation.metadata.milestoneSourceSeedId,
    });

    return reconciled;
  }

  private async ensureCompletableMark(repos: WaymarkRepositories, mark: MarkInstance): Promise<MarkInstance> {
    if (mark.status === MarkInstanceStatus.Planned) {
      const refreshed = await this.refreshMarkReadinessWithinTransaction(repos, mark.id);
      if (refreshed.status === MarkInstanceStatus.Blocked) {
        throw new MarkEngineValidationError(`Mark ${mark.id} is blocked and cannot be completed.`);
      }
      if (!canMarkBeCompleted(refreshed)) {
        throw new MarkEngineValidationError(`Mark ${mark.id} in status ${refreshed.status} cannot be completed.`);
      }
      return refreshed;
    }

    if (!canMarkBeCompleted(mark)) {
      throw new MarkEngineValidationError(`Mark ${mark.id} in status ${mark.status} cannot be completed.`);
    }

    return mark;
  }

  private async evaluateMarkReadinessWithRepositories(
    repos: WaymarkRepositories,
    mark: MarkInstance,
  ): Promise<MarkReadinessResult> {
    const dependencies = await repos.dependencies.listDependenciesForMark(mark.id);
    const unmetDependencies: MarkDependency[] = [];

    for (const dependency of dependencies) {
      if (!dependency.isRequired) {
        continue;
      }

      const satisfied = await this.isDependencySatisfied(repos, dependency);
      if (!satisfied) {
        unmetDependencies.push(dependency);
      }
    }

    return {
      mark,
      status: unmetDependencies.length === 0 ? MarkInstanceStatus.Ready : MarkInstanceStatus.Blocked,
      unmetDependencies,
    };
  }

  private async refreshMarkReadinessWithinTransaction(
    repos: WaymarkRepositories,
    markInstanceId: EntityId,
  ): Promise<MarkInstance> {
    const mark = await this.requireMark(repos, markInstanceId);
    if (isMarkFinalStatus(mark.status) || mark.status === MarkInstanceStatus.Active) {
      return mark;
    }

    const readiness = await this.evaluateMarkReadinessWithRepositories(repos, mark);
    const nextStatus = readiness.status;
    if (mark.status === nextStatus) {
      return mark;
    }

    const allowed =
      (mark.status === MarkInstanceStatus.Planned &&
        (nextStatus === MarkInstanceStatus.Ready || nextStatus === MarkInstanceStatus.Blocked)) ||
      (mark.status === MarkInstanceStatus.Ready && nextStatus === MarkInstanceStatus.Blocked) ||
      (mark.status === MarkInstanceStatus.Blocked && nextStatus === MarkInstanceStatus.Ready);

    if (!allowed) {
      return mark;
    }

    return repos.marks.updateMarkInstance(mark.id, {
      status: transitionMarkStatus(mark, nextStatus).status,
    });
  }

  private async requireMark(repos: WaymarkRepositories, markInstanceId: EntityId): Promise<MarkInstance> {
    const mark = await repos.marks.getMarkInstanceById(markInstanceId);
    if (!mark) {
      throw new MarkEngineValidationError(`Mark ${markInstanceId} does not exist.`);
    }
    return mark;
  }

  private async isDependencySatisfied(repos: WaymarkRepositories, dependency: MarkDependency): Promise<boolean> {
    if (dependency.status === DependencyStatus.Waived || dependency.status === DependencyStatus.Satisfied) {
      if (dependency.status === DependencyStatus.Waived) {
        return true;
      }
    }
    if (dependency.status === DependencyStatus.Cancelled || dependency.status === DependencyStatus.Failed) {
      return false;
    }

    switch (dependency.dependencyType) {
      case DependencyType.MarkCompleted: {
        const required = await repos.marks.getMarkInstanceById(dependency.requiredEntityId);
        return required?.status === MarkInstanceStatus.Completed;
      }
      case DependencyType.MarkResolved: {
        const required = await repos.marks.getMarkInstanceById(dependency.requiredEntityId);
        return required ? isMarkResolvedStatus(required.status) : false;
      }
      case DependencyType.PackCheckCompleted:
      case DependencyType.SessionLevelPackCheck: {
        const required = await repos.packChecks.getInstanceById(dependency.requiredEntityId);
        return required?.status === PackCheckInstanceStatus.Completed;
      }
      case DependencyType.ManualUnlock:
        return dependency.status !== DependencyStatus.Pending;
      default:
        return false;
    }
  }

  private async resolveSignalsForMark(
    repos: WaymarkRepositories,
    markInstanceId: EntityId,
    resolvedAt: ISODateTimeString,
  ): Promise<void> {
    const signals = await repos.signals.listSignalsByTarget(SignalTargetType.MarkInstance, markInstanceId);
    for (const signal of signals) {
      if (!UNRESOLVED_SIGNAL_STATUSES.has(signal.status)) {
        continue;
      }
      await repos.signals.updateSignal(signal.id, {
        status: SignalStatus.Resolved,
        resolvedAt,
      });
    }
  }

  private async cancelSignalsForMark(repos: WaymarkRepositories, markInstanceId: EntityId): Promise<void> {
    const signals = await repos.signals.listSignalsByTarget(SignalTargetType.MarkInstance, markInstanceId);
    for (const signal of signals) {
      if (!UNRESOLVED_SIGNAL_STATUSES.has(signal.status)) {
        continue;
      }
      await repos.signals.updateSignal(signal.id, {
        status: SignalStatus.Cancelled,
        cancelledAt: nowIso(),
      });
    }
  }

  private async hasSubstitutionAncestor(repos: WaymarkRepositories, markInstanceId: EntityId): Promise<boolean> {
    const visited = new Set<string>([markInstanceId]);
    let currentId = markInstanceId;
    for (let depth = 0; depth < 32; depth += 1) {
      const predecessors = await repos.marks.listPredecessorMarkInstances(currentId);
      if (predecessors.length > 1) {
        throw new MarkEngineValidationError(`Mark ${currentId} has multiple lineage predecessors.`);
      }
      const predecessor = predecessors[0];
      if (!predecessor) {
        return false;
      }
      if (visited.has(predecessor.id)) {
        throw new MarkEngineValidationError(`Mark lineage cycle detected at ${predecessor.id}.`);
      }
      if (predecessor.status === MarkInstanceStatus.Substituted) {
        return true;
      }
      visited.add(predecessor.id);
      currentId = predecessor.id;
    }
    throw new MarkEngineValidationError(`Mark lineage for ${markInstanceId} exceeds 32 nodes.`);
  }

  private async transferSignalsToReplacement(
    repos: WaymarkRepositories,
    original: MarkInstance,
    replacement: MarkInstance,
    replacementLocalDate: LocalDateString,
  ): Promise<void> {
    const signals = await repos.signals.listSignalsByTarget(SignalTargetType.MarkInstance, original.id);
    const timezone = (await repos.userProfiles.getUserProfileById(original.userId))?.timezone ?? "UTC";
    for (const signal of signals) {
      if (!UNRESOLVED_SIGNAL_STATUSES.has(signal.status)) {
        continue;
      }
      await repos.signals.updateSignal(signal.id, {
        status: SignalStatus.Cancelled,
        cancelledAt: nowIso(),
        ringingStartedAt: null,
        snoozedUntil: null,
      });
      const scheduledAt = rebaseSignalForReplacement(
        signal.scheduledAt,
        original,
        replacement,
        replacementLocalDate,
        timezone,
      );
      const created = await repos.signals.createSignal({
        userId: original.userId,
        targetType: SignalTargetType.MarkInstance,
        targetId: replacement.id,
        scheduledAt,
        status: SignalStatus.Scheduled,
      });
      const behavior = await getSignalBehavior(repos.appSettings, original.userId, signal.id);
      if (behavior) {
        await setSignalBehavior(repos.appSettings, original.userId, {
          signalId: created.id,
          ringCount: 0,
          maxRings: behavior.maxRings,
          repeatAfterMinutes: behavior.repeatAfterMinutes,
        });
      }
    }
  }

  private async reconcileSignalDeliveriesAfterCommit(userId: string) {
    if (!this.signalEngine) {
      return;
    }
    try {
      await this.signalEngine.reconcileSignalDeliveries(userId);
    } catch (error) {
      console.warn("[MarkEngine] Signal delivery reconciliation will retry later.", error);
    }
  }

  private async settleDependenciesForResolvedMark(
    repos: WaymarkRepositories,
    mark: MarkInstance,
    resolvedAt: ISODateTimeString,
  ): Promise<void> {
    const dependents = await repos.dependencies.listDependenciesByRequiredEntity(
      DependencyRequiredEntityType.MarkInstance,
      mark.id,
    );

    for (const dependency of dependents) {
      if (dependency.dependencyType === DependencyType.MarkCompleted) {
        if (mark.status === MarkInstanceStatus.Completed) {
          await repos.dependencies.updateDependency(dependency.id, {
            status: DependencyStatus.Satisfied,
            satisfiedAt: resolvedAt,
            waivedAt: null,
          });
        } else {
          await repos.dependencies.updateDependency(dependency.id, {
            status: DependencyStatus.Failed,
            satisfiedAt: null,
            waivedAt: null,
          });
        }
        continue;
      }

      if (dependency.dependencyType === DependencyType.MarkResolved) {
        if (isMarkResolvedStatus(mark.status)) {
          await repos.dependencies.updateDependency(dependency.id, {
            status: DependencyStatus.Satisfied,
            satisfiedAt: resolvedAt,
            waivedAt: null,
          });
        } else {
          await repos.dependencies.updateDependency(dependency.id, {
            status: DependencyStatus.Failed,
            satisfiedAt: null,
            waivedAt: null,
          });
        }
      }
    }
  }

  private async recreateDependenciesForReplacement(
    repos: WaymarkRepositories,
    originalMarkId: EntityId,
    replacementMarkId: EntityId,
  ): Promise<MarkDependency[]> {
    const originalDependencies = await repos.dependencies.listDependenciesForMark(originalMarkId);
    const recreated: MarkDependency[] = [];

    for (const dependency of originalDependencies) {
      const preservedStatus = dependency.status === DependencyStatus.Waived ? DependencyStatus.Waived : DependencyStatus.Pending;
      const input: CreateDependencyInput = {
        dependentMarkInstanceId: replacementMarkId,
        dependencyType: dependency.dependencyType,
        requiredEntityType: dependency.requiredEntityType,
        requiredEntityId: dependency.requiredEntityId,
        isRequired: dependency.isRequired,
        status: preservedStatus,
        satisfiedAt: null,
        waivedAt: preservedStatus === DependencyStatus.Waived ? dependency.waivedAt ?? null : null,
      };
      recreated.push(await repos.dependencies.createDependency(input));
    }

    return recreated;
  }

  private async resolveTargetTrailDay(
    repos: WaymarkRepositories,
    userId: EntityId,
    targetTrailDayId?: EntityId,
    targetLocalDate?: LocalDateString,
  ): Promise<{ id: EntityId; date: LocalDateString }> {
    if (targetTrailDayId) {
      const trailDay = await repos.trailDays.getTrailDayById(targetTrailDayId);
      if (!trailDay) {
        throw new MarkEngineValidationError(`Target TrailDay ${targetTrailDayId} does not exist.`);
      }
      if (trailDay.status === "closed" || trailDay.status === "reopened") {
        throw new MarkEngineValidationError(`Target TrailDay ${targetTrailDayId} is ${trailDay.status}.`);
      }
      return trailDay;
    }

    if (!targetLocalDate) {
      throw new MarkEngineValidationError("Reschedule/substitute requires targetTrailDayId or targetLocalDate.");
    }

    const trailDay = await repos.trailDays.getOrCreateTrailDay(userId, targetLocalDate);
    if (trailDay.status === "closed" || trailDay.status === "reopened") {
      throw new MarkEngineValidationError(`Target TrailDay ${trailDay.id} is ${trailDay.status}.`);
    }
    return trailDay;
  }
}

function buildDateTime(localDate: LocalDateString, time: string): ISODateTimeString {
  const normalized = time.length === 5 ? `${time}:00` : time;
  return `${localDate}T${normalized}.000`;
}

function rebaseDateTimeToLocalDate(
  value: ISODateTimeString | undefined,
  targetLocalDate: LocalDateString,
): ISODateTimeString | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/T(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)/);
  if (!match) {
    return undefined;
  }

  const time = match[1].includes(".") ? match[1] : `${match[1]}.000`;
  return `${targetLocalDate}T${time}`;
}

function parseDateTimeAsEpoch(value?: string, timezone = "UTC"): number | null {
  if (!value) {
    return null;
  }
  const floating = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/);
  if (floating) {
    return Date.parse(buildZonedDateTime(value.slice(0, 10), value.slice(11, 19), timezone));
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function rebaseSignalForReplacement(
  signalAt: string,
  original: MarkInstance,
  replacement: MarkInstance,
  replacementLocalDate: LocalDateString,
  timezone: string,
): string {
  const originalStart = parseDateTimeAsEpoch(original.scheduledStartAt, timezone);
  const replacementStart = parseDateTimeAsEpoch(replacement.scheduledStartAt, timezone);
  const signalEpoch = parseDateTimeAsEpoch(signalAt, timezone);
  if (originalStart !== null && replacementStart !== null && signalEpoch !== null) {
    return new Date(replacementStart + (signalEpoch - originalStart)).toISOString();
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(signalAt));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const time = `${value("hour") ?? "00"}:${value("minute") ?? "00"}:${value("second") ?? "00"}`;
  return buildZonedDateTime(replacementLocalDate, time, timezone);
}

function shouldRemoveStaleGeneratedMark(
  mark: MarkInstance,
  activePathIds: ReadonlySet<string>,
  expectedGenerationKeys: ReadonlySet<string>,
): boolean {
  if (mark.origin !== MarkInstanceOrigin.TemplateGenerated) {
    return false;
  }
  if (!mark.generationKey || expectedGenerationKeys.has(mark.generationKey)) {
    return false;
  }
  if (!activePathIds.has(mark.pathId)) {
    return false;
  }
  if ((mark.syncVersion ?? 0) > 0) {
    return false;
  }

  return (
    mark.status === MarkInstanceStatus.Planned ||
    mark.status === MarkInstanceStatus.Ready ||
    mark.status === MarkInstanceStatus.Blocked ||
    mark.status === MarkInstanceStatus.Active
  );
}

function resolveSeedPresentation(
  template: MarkTemplate,
  localDate: LocalDateString,
  metadata?: Awaited<ReturnType<typeof getMarkTemplateSeedMetadata>> | null,
): { title: string; description?: string } {
  if (metadata?.phaseResolver?.kind === "golf_practice_phase") {
    const afterSwitch = localDate >= metadata.phaseResolver.switchDate;
    return {
      title: `${template.title} ${afterSwitch ? metadata.phaseResolver.afterTitleSuffix : metadata.phaseResolver.beforeTitleSuffix}`,
      description:
        afterSwitch ?
          metadata.phaseResolver.afterDescription ?? template.description
        : metadata.phaseResolver.beforeDescription ?? template.description,
    };
  }

  return {
    title: template.title,
    description: template.description ?? undefined,
  };
}

export function createMarkEngine(repositories: WaymarkRepositories, signalEngine?: SignalEngine): MarkEngine {
  return new DefaultMarkEngine(repositories, signalEngine);
}
