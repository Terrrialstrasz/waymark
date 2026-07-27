import {
  CompletePackCheckInstanceInput,
  DependencyRequiredEntityType,
  DependencyStatus,
  DependencyType,
  EntityId,
  ExpirePackCheckInstanceInput,
  ISODateTimeString,
  LocalDateString,
  MarkInstance,
  PackCheckEngine,
  PackCheckInstance,
  PackCheckInstanceStatus,
  PackCheckItemInstance,
  PackCheckTemplate,
  PackCheckVisibilityResult,
  SignalStatus,
  SignalTargetType,
  SkipPackCheckInstanceInput,
  WaymarkRepositories,
} from "../../domain/waymark";
import { getPackCheckSurfacePolicy } from "./packCheckSurfacePolicyStore";

const PACK_CHECK_STATUS_DISPLAY_LABELS: Record<PackCheckInstanceStatus, string> = {
  [PackCheckInstanceStatus.Scheduled]: "Scheduled",
  [PackCheckInstanceStatus.Available]: "Available",
  [PackCheckInstanceStatus.InProgress]: "In Progress",
  [PackCheckInstanceStatus.PartiallyCompleted]: "Partially Completed",
  [PackCheckInstanceStatus.Completed]: "Completed",
  [PackCheckInstanceStatus.Skipped]: "Skipped",
  [PackCheckInstanceStatus.Expired]: "Expired",
  [PackCheckInstanceStatus.Cancelled]: "Cancelled",
};

const PACK_CHECK_TRANSITIONS: Record<PackCheckInstanceStatus, ReadonlySet<PackCheckInstanceStatus>> = {
  [PackCheckInstanceStatus.Scheduled]: new Set([
    PackCheckInstanceStatus.Available,
    PackCheckInstanceStatus.Skipped,
    PackCheckInstanceStatus.Expired,
    PackCheckInstanceStatus.Cancelled,
  ]),
  [PackCheckInstanceStatus.Available]: new Set([
    PackCheckInstanceStatus.InProgress,
    PackCheckInstanceStatus.PartiallyCompleted,
    PackCheckInstanceStatus.Completed,
    PackCheckInstanceStatus.Skipped,
    PackCheckInstanceStatus.Expired,
    PackCheckInstanceStatus.Cancelled,
  ]),
  [PackCheckInstanceStatus.InProgress]: new Set([
    PackCheckInstanceStatus.Available,
    PackCheckInstanceStatus.PartiallyCompleted,
    PackCheckInstanceStatus.Completed,
    PackCheckInstanceStatus.Skipped,
    PackCheckInstanceStatus.Expired,
    PackCheckInstanceStatus.Cancelled,
  ]),
  [PackCheckInstanceStatus.PartiallyCompleted]: new Set([
    PackCheckInstanceStatus.Available,
    PackCheckInstanceStatus.InProgress,
    PackCheckInstanceStatus.Completed,
    PackCheckInstanceStatus.Skipped,
    PackCheckInstanceStatus.Expired,
    PackCheckInstanceStatus.Cancelled,
  ]),
  [PackCheckInstanceStatus.Completed]: new Set(),
  [PackCheckInstanceStatus.Skipped]: new Set(),
  [PackCheckInstanceStatus.Expired]: new Set(),
  [PackCheckInstanceStatus.Cancelled]: new Set(),
};

const UNRESOLVED_SIGNAL_STATUSES = new Set<SignalStatus>([
  SignalStatus.Scheduled,
  SignalStatus.Ringing,
  SignalStatus.Snoozed,
]);

export class InvalidPackCheckTransitionError extends Error {
  constructor(from: PackCheckInstanceStatus, to: PackCheckInstanceStatus) {
    super(`Invalid Pack Check status transition ${from} -> ${to}.`);
    this.name = "InvalidPackCheckTransitionError";
  }
}

export class PackCheckEngineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackCheckEngineValidationError";
  }
}

export function getPackCheckStatusDisplayLabel(status: PackCheckInstanceStatus): string {
  return PACK_CHECK_STATUS_DISPLAY_LABELS[status];
}

export function isPackCheckFinalStatus(status: PackCheckInstanceStatus): boolean {
  return (
    status === PackCheckInstanceStatus.Completed ||
    status === PackCheckInstanceStatus.Skipped ||
    status === PackCheckInstanceStatus.Expired ||
    status === PackCheckInstanceStatus.Cancelled
  );
}

export function isPackCheckCompletableStatus(status: PackCheckInstanceStatus): boolean {
  return (
    status === PackCheckInstanceStatus.Available ||
    status === PackCheckInstanceStatus.InProgress ||
    status === PackCheckInstanceStatus.PartiallyCompleted
  );
}

export function isPackCheckSkippableStatus(status: PackCheckInstanceStatus): boolean {
  return (
    status === PackCheckInstanceStatus.Scheduled ||
    status === PackCheckInstanceStatus.Available ||
    status === PackCheckInstanceStatus.InProgress ||
    status === PackCheckInstanceStatus.PartiallyCompleted
  );
}

export function isPackCheckVisibleStatus(status: PackCheckInstanceStatus): boolean {
  return status !== PackCheckInstanceStatus.Scheduled && status !== PackCheckInstanceStatus.Cancelled;
}

export function canCompletePackCheck(instance: PackCheckInstance, items: PackCheckItemInstance[]): boolean {
  return (
    (isPackCheckCompletableStatus(instance.status) ||
      (instance.status === PackCheckInstanceStatus.Completed && isReusableIndependentPackCheckInstance(instance))) &&
    areRequiredItemsChecked(items)
  );
}

export function canSkipPackCheck(instance: PackCheckInstance): boolean {
  return isPackCheckSkippableStatus(instance.status) && !isPackCheckFinalStatus(instance.status);
}

function canTransitionPackCheckStatusInternal(from: PackCheckInstanceStatus, to: PackCheckInstanceStatus): boolean {
  if (from === to) {
    return true;
  }
  return PACK_CHECK_TRANSITIONS[from]?.has(to) ?? false;
}

function assertValidPackCheckTransition(from: PackCheckInstanceStatus, to: PackCheckInstanceStatus): void {
  if (!canTransitionPackCheckStatusInternal(from, to)) {
    throw new InvalidPackCheckTransitionError(from, to);
  }
}

function transitionPackCheckStatus(
  instance: PackCheckInstance,
  to: PackCheckInstanceStatus,
): PackCheckInstance {
  assertValidPackCheckTransition(instance.status, to);
  return { ...instance, status: to };
}

function applyPackCheckStatus(
  instance: PackCheckInstance,
  to: PackCheckInstanceStatus,
): PackCheckInstance {
  if (
    instance.status === PackCheckInstanceStatus.Completed &&
    isReusableIndependentPackCheckInstance(instance) &&
    (to === PackCheckInstanceStatus.Available ||
      to === PackCheckInstanceStatus.InProgress ||
      to === PackCheckInstanceStatus.PartiallyCompleted)
  ) {
    return { ...instance, status: to };
  }

  return transitionPackCheckStatus(instance, to);
}

function nowIso(value?: ISODateTimeString): ISODateTimeString {
  return value ?? new Date().toISOString();
}

function isFloatingDateTime(value: ISODateTimeString): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?$/.test(value);
}

function formatFloatingDateTime(date: Date): ISODateTimeString {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  const millis = `${date.getMilliseconds()}`.padStart(3, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}`;
}

function toEpoch(iso?: ISODateTimeString): number | null {
  return iso ? Date.parse(iso) : null;
}

function subtractMinutes(iso: ISODateTimeString, minutes: number): ISODateTimeString {
  const shifted = new Date(Date.parse(iso) - minutes * 60_000);
  return isFloatingDateTime(iso) ? formatFloatingDateTime(shifted) : shifted.toISOString();
}

function extractLocalDate(iso: ISODateTimeString): LocalDateString {
  return iso.slice(0, 10);
}

function buildLocalSevenPm(localDate: LocalDateString): ISODateTimeString {
  return `${localDate}T19:00:00.000`;
}

function areRequiredItemsChecked(items: PackCheckItemInstance[]): boolean {
  const requiredItems = items.filter((item) => item.isRequired);
  if (requiredItems.length === 0) {
    return true;
  }
  return requiredItems.every((item) => item.isChecked);
}

function hasAnyItemChecked(items: PackCheckItemInstance[]): boolean {
  return items.some((item) => item.isChecked);
}

function hasSomeButNotAllRequiredChecked(items: PackCheckItemInstance[]): boolean {
  const requiredItems = items.filter((item) => item.isRequired);
  if (requiredItems.length === 0) {
    return false;
  }

  const checkedCount = requiredItems.filter((item) => item.isChecked).length;
  return checkedCount > 0 && checkedCount < requiredItems.length;
}

function buildIndependentGenerationKey(templateId: EntityId, localDate: LocalDateString): string {
  return `pack_check_template:${templateId}:date:${localDate}:independent`;
}

function buildAllPackChecksGenerationKey(templateId: EntityId, localDate: LocalDateString): string {
  return `pack_check_template:${templateId}:date:${localDate}:all_pack_checks`;
}

function buildLinkedGenerationKey(
  templateId: EntityId,
  targetMarkId: EntityId,
  prepLocalDate: LocalDateString,
  targetLocalDate: LocalDateString,
): string {
  if (prepLocalDate === targetLocalDate) {
    return `pack_check_template:${templateId}:target_mark:${targetMarkId}`;
  }
  return `pack_check_template:${templateId}:target_mark:${targetMarkId}:prep_date:${prepLocalDate}`;
}

function sameId(left?: string | null, right?: string | null): boolean {
  return (left ?? undefined) === (right ?? undefined);
}

export function isReusableIndependentPackCheckInstance(
  instance: Pick<PackCheckInstance, "targetMarkInstanceId">,
): boolean {
  return !instance.targetMarkInstanceId;
}

type PackCheckPreparationWindow = {
  availableAt: ISODateTimeString;
  dueAt?: ISODateTimeString;
};

export class DefaultPackCheckEngine implements PackCheckEngine {
  constructor(private readonly repositories: WaymarkRepositories) {}

  canTransitionPackCheckStatus(from: PackCheckInstanceStatus, to: PackCheckInstanceStatus): boolean {
    return canTransitionPackCheckStatusInternal(from, to);
  }

  async refreshPackCheckAvailability(packCheckInstanceId: string, now: ISODateTimeString): Promise<PackCheckInstance> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const instance = await this.requirePackCheck(repos, packCheckInstanceId);
      if (isPackCheckFinalStatus(instance.status)) {
        return instance;
      }

      const currentTime = nowIso(now);
      const currentEpoch = toEpoch(currentTime) ?? 0;
      const dueEpoch = toEpoch(instance.dueAt);

      if (
        dueEpoch !== null &&
        currentEpoch >= dueEpoch &&
        (
          instance.status === PackCheckInstanceStatus.Scheduled ||
          instance.status === PackCheckInstanceStatus.Available ||
          instance.status === PackCheckInstanceStatus.InProgress ||
          instance.status === PackCheckInstanceStatus.PartiallyCompleted
        )
      ) {
        return this.expirePackCheckInstanceWithinTransaction(repos, instance, currentTime);
      }

      if (
        instance.status === PackCheckInstanceStatus.Scheduled &&
        currentEpoch >= (toEpoch(await this.getAvailabilityTime(repos, instance)) ?? Number.MAX_SAFE_INTEGER)
      ) {
        return this.persistPackCheck(repos, {
          ...transitionPackCheckStatus(instance, PackCheckInstanceStatus.Available),
          availableFrom: instance.availableFrom ?? await this.getAvailabilityTime(repos, instance),
        });
      }

      return instance;
    });
  }

  async generatePackCheckInstancesForDate(userId: string, localDate: string): Promise<PackCheckInstance[]> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const todayTrailDay = await repos.trailDays.getOrCreateTrailDay(userId, localDate);
      const activePaths = await repos.paths.listActivePaths(userId);
      const generated: PackCheckInstance[] = [];

      for (const path of activePaths) {
        const templates = (await repos.packChecks.listTemplatesByPath(path.id)).filter((template) => template.isActive);
        const markTemplates = await repos.marks.listActiveMarkTemplatesByPath(path.id);

        for (const template of templates) {
          const rulesByPackCheckTemplate = await repos.packChecks.listMarkPackCheckRulesForPackCheckTemplate(template.id);
          if (rulesByPackCheckTemplate.length === 0) {
            generated.push(await this.ensureIndependentPackCheckForDate(repos, template, todayTrailDay.id, localDate));
            continue;
          }

          for (const markTemplate of markTemplates) {
            const rules = (await repos.packChecks.listMarkPackCheckRulesForMarkTemplate(markTemplate.id)).filter(
              (rule) => rule.packCheckTemplateId === template.id,
            );
            if (rules.length === 0) {
              continue;
            }

            const markInstances = await repos.marks.listMarkInstancesByTemplate(markTemplate.id);
            for (const mark of markInstances) {
              const targetTrailDay = mark.trailDayId ? await repos.trailDays.getTrailDayById(mark.trailDayId) : null;
              if (!targetTrailDay || targetTrailDay.date < localDate) {
                continue;
              }

              for (const rule of rules) {
                const computed = await this.computeLinkedGenerationWindow(repos, mark, template, rule.availableOffsetMin, rule.dueOffsetMin);
                if (computed.prepLocalDate !== localDate) {
                  continue;
                }

                generated.push(
                  await this.ensureLinkedPackCheckInstance(
                    repos,
                    template,
                    mark,
                    todayTrailDay.id,
                    computed.prepLocalDate,
                    computed.targetLocalDate,
                    computed.availableFrom,
                    computed.dueAt,
                  ),
                );
              }
            }
          }
        }
      }

      return generated;
    });
  }

  async generatePackChecksForMarkInstance(markInstanceId: string): Promise<PackCheckInstance[]> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const mark = await this.requireMark(repos, markInstanceId);
      if (!mark.templateId) {
        return [];
      }

      const rules = await repos.packChecks.listMarkPackCheckRulesForMarkTemplate(mark.templateId);
      if (rules.length === 0) {
        return [];
      }

      const generated: PackCheckInstance[] = [];
      for (const rule of rules) {
        const template = await repos.packChecks.getTemplateById(rule.packCheckTemplateId);
        if (!template || !template.isActive) {
          continue;
        }

        const computed = await this.computeLinkedGenerationWindow(repos, mark, template, rule.availableOffsetMin, rule.dueOffsetMin);
        const prepTrailDay = await repos.trailDays.getOrCreateTrailDay(mark.userId, computed.prepLocalDate);
        generated.push(
          await this.ensureLinkedPackCheckInstance(
            repos,
            template,
            mark,
            prepTrailDay.id,
            computed.prepLocalDate,
            computed.targetLocalDate,
            computed.availableFrom,
            computed.dueAt,
          ),
        );
      }

      return generated;
    });
  }

  async listVisiblePackChecksForDay(
    userId: string,
    localDate: string,
    now: ISODateTimeString,
  ): Promise<PackCheckVisibilityResult> {
    const trailDay = await this.repositories.trailDays.getTrailDayByDate(userId, localDate);
    if (!trailDay) {
      return { today: [], prepareTomorrow: [] };
    }

    const instances = await this.repositories.packChecks.listInstancesByTrailDay(trailDay.id);
    const refreshed: PackCheckInstance[] = [];
    for (const instance of instances) {
      refreshed.push(await this.refreshPackCheckAvailability(instance.id, now));
    }

    const today: PackCheckInstance[] = [];
    const prepareTomorrow: PackCheckInstance[] = [];

    for (const instance of refreshed) {
      if (!isPackCheckVisibleStatus(instance.status)) {
        continue;
      }
      if (instance.templateId) {
        const template = await this.repositories.packChecks.getTemplateById(instance.templateId);
        if (!template || !template.isActive) {
          continue;
        }
      }

      const policy = await getPackCheckSurfacePolicy(this.repositories.appSettings, userId, instance.templateId);
      if (policy === "all_pack_checks_only" || policy === "embedded_in_mark" || policy === "manual_only") {
        continue;
      }

      if (await this.isFutureLinkedPackCheck(this.repositories, instance, localDate)) {
        prepareTomorrow.push(instance);
      } else {
        today.push(instance);
      }
    }

    return { today, prepareTomorrow };
  }

  async listAllPackChecksForDay(
    userId: string,
    localDate: string,
    now: ISODateTimeString,
  ): Promise<PackCheckInstance[]> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const trailDay = await repos.trailDays.getOrCreateTrailDay(userId, localDate);
      const activePaths = await repos.paths.listActivePaths(userId);
      const existing = await repos.packChecks.listInstancesByTrailDay(trailDay.id);
      const byTemplateId = new Map(existing.map((instance) => [instance.templateId, instance] as const));
      const all: PackCheckInstance[] = [...existing];

      for (const path of activePaths) {
        const templates = (await repos.packChecks.listTemplatesByPath(path.id)).filter((template) => template.isActive);
        for (const template of templates) {
          if (byTemplateId.has(template.id)) {
            continue;
          }
          const created = await this.ensureAllPackCheckInstanceForDate(repos, template, trailDay.id, localDate);
          byTemplateId.set(template.id, created);
          all.push(created);
        }
      }

      const refreshed: PackCheckInstance[] = [];
      for (const instance of all) {
        refreshed.push(await this.refreshPackCheckAvailabilityWithinTransaction(repos, instance, now));
      }
      return refreshed;
    });
  }

  async setPackCheckItemChecked(
    packCheckInstanceId: string,
    itemInstanceId: string,
    checked: boolean,
    checkedAt?: ISODateTimeString,
  ): Promise<{ packCheck: PackCheckInstance; items: PackCheckItemInstance[] }> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const instance = await this.requirePackCheck(repos, packCheckInstanceId);
      const isReusableCompletedIndependent =
        instance.status === PackCheckInstanceStatus.Completed && isReusableIndependentPackCheckInstance(instance);
      if (isPackCheckFinalStatus(instance.status)) {
        if (isReusableCompletedIndependent) {
          // Independent Pack Checks are reusable daily operations and can restart after completion.
        } else {
          throw new PackCheckEngineValidationError(`PackCheckInstance ${instance.id} in status ${instance.status} cannot edit items.`);
        }
      }

      const currentTime = nowIso(checkedAt);
      const availableInstance = await this.refreshPackCheckAvailabilityWithinTransaction(repos, instance, currentTime);
      if (availableInstance.status === PackCheckInstanceStatus.Scheduled) {
        throw new PackCheckEngineValidationError("PackCheckInstance is not yet available for item editing.");
      }

      const items = await repos.packChecks.listItemInstances(packCheckInstanceId);
      const targetItem = items.find((item) => item.id === itemInstanceId);
      if (!targetItem) {
        throw new PackCheckEngineValidationError(`PackCheckItemInstance ${itemInstanceId} does not belong to ${packCheckInstanceId}.`);
      }
      const updatedItems = items.map((item) =>
        item.id === itemInstanceId ?
          {
            ...item,
            isChecked: checked,
            checkedAt: checked ? currentTime : undefined,
          }
        : item,
      );
      await repos.packChecks.upsertItemInstances(updatedItems);

      const nextItems = await repos.packChecks.listItemInstances(packCheckInstanceId);
      const nextStatus = this.deriveProgressStatus(availableInstance, nextItems, checked);

      if (nextStatus === PackCheckInstanceStatus.Completed) {
        const completed = await this.completePackCheckInstanceWithinTransaction(repos, availableInstance, nextItems, currentTime);
        return {
          packCheck: completed,
          items: await repos.packChecks.listItemInstances(packCheckInstanceId),
        };
      }

      const updatedInstance =
        availableInstance.status === nextStatus ? availableInstance : await this.persistPackCheck(repos, {
          ...applyPackCheckStatus(availableInstance, nextStatus),
          completedAt: undefined,
        });

      return {
        packCheck: updatedInstance,
        items: nextItems,
      };
    });
  }

  async completePackCheckInstance(input: CompletePackCheckInstanceInput): Promise<PackCheckInstance> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      let instance = await this.requirePackCheck(repos, input.packCheckInstanceId);
      const completedAt = nowIso(input.completedAt);
      instance = await this.refreshPackCheckAvailabilityWithinTransaction(repos, instance, completedAt);

      if (instance.status === PackCheckInstanceStatus.Scheduled) {
        throw new PackCheckEngineValidationError("Scheduled PackCheckInstance cannot complete before availability window opens.");
      }
      if (isPackCheckFinalStatus(instance.status)) {
        if (!(instance.status === PackCheckInstanceStatus.Completed && isReusableIndependentPackCheckInstance(instance))) {
          throw new PackCheckEngineValidationError(`PackCheckInstance ${instance.id} in status ${instance.status} cannot be completed.`);
        }
      }

      if (input.checkedItemIds && input.checkedItemIds.length > 0) {
        const items = await repos.packChecks.listItemInstances(instance.id);
        const updatedItems = items.map((item) =>
          input.checkedItemIds!.includes(item.id) ? { ...item, isChecked: true, checkedAt: completedAt } : item,
        );
        await repos.packChecks.upsertItemInstances(updatedItems);
      }

      const currentItems = await repos.packChecks.listItemInstances(instance.id);
      return this.completePackCheckInstanceWithinTransaction(repos, instance, currentItems, completedAt);
    });
  }

  async skipPackCheckInstance(input: SkipPackCheckInstanceInput): Promise<PackCheckInstance> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const instance = await this.requirePackCheck(repos, input.packCheckInstanceId);
      if (!canSkipPackCheck(instance)) {
        throw new PackCheckEngineValidationError(`PackCheckInstance ${instance.id} in status ${instance.status} cannot be skipped.`);
      }

      const updated = await this.persistPackCheck(repos, {
        ...transitionPackCheckStatus(instance, PackCheckInstanceStatus.Skipped),
        skippedAt: nowIso(input.skippedAt),
      });
      await this.cancelSignalsForPackCheck(repos, updated.id);
      await this.failOrCancelDependenciesForPackCheck(repos, updated.id, "failed");
      return updated;
    });
  }

  async expirePackCheckInstance(input: ExpirePackCheckInstanceInput): Promise<PackCheckInstance> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const instance = await this.requirePackCheck(repos, input.packCheckInstanceId);
      return this.expirePackCheckInstanceWithinTransaction(repos, instance, nowIso(input.expiredAt));
    });
  }

  async cancelPackChecksForMarkInstance(markInstanceId: string): Promise<PackCheckInstance[]> {
    return this.repositories.transaction.runInTransaction(async (repos) => {
      const instances = await repos.packChecks.listInstancesByTargetMark(markInstanceId);
      const results: PackCheckInstance[] = [];

      for (const instance of instances) {
        if (isPackCheckFinalStatus(instance.status) || !sameId(instance.targetMarkInstanceId, markInstanceId)) {
          continue;
        }

        const updated = await this.persistPackCheck(repos, {
          ...transitionPackCheckStatus(instance, PackCheckInstanceStatus.Cancelled),
          cancelledAt: nowIso(),
        });
        await this.cancelSignalsForPackCheck(repos, updated.id);
        await this.failOrCancelDependenciesForPackCheck(repos, updated.id, "cancelled");
        results.push(updated);
      }

      return results;
    });
  }

  private async completePackCheckInstanceWithinTransaction(
    repos: WaymarkRepositories,
    instance: PackCheckInstance,
    items: PackCheckItemInstance[],
    completedAt: ISODateTimeString,
  ): Promise<PackCheckInstance> {
    if (!canCompletePackCheck(instance, items)) {
      throw new PackCheckEngineValidationError("All required PackCheck items must be checked before completion.");
    }

    const updated = await this.persistPackCheck(repos, {
      ...applyPackCheckStatus(instance, PackCheckInstanceStatus.Completed),
      completedAt,
    });
    await this.resolveSignalsForPackCheck(repos, updated.id, completedAt);
    await this.satisfyDependenciesForPackCheck(repos, updated.id, completedAt);
    return updated;
  }

  private async expirePackCheckInstanceWithinTransaction(
    repos: WaymarkRepositories,
    instance: PackCheckInstance,
    expiredAt: ISODateTimeString,
  ): Promise<PackCheckInstance> {
    if (isPackCheckFinalStatus(instance.status)) {
      return instance;
    }
    if (
      !(
        instance.status === PackCheckInstanceStatus.Scheduled ||
        instance.status === PackCheckInstanceStatus.Available ||
        instance.status === PackCheckInstanceStatus.InProgress ||
        instance.status === PackCheckInstanceStatus.PartiallyCompleted
      )
    ) {
      return instance;
    }

    const updated = await this.persistPackCheck(repos, {
      ...transitionPackCheckStatus(instance, PackCheckInstanceStatus.Expired),
      dueAt: instance.dueAt,
    });
    await this.expireSignalsForPackCheck(repos, updated.id, expiredAt);
    await this.failOrCancelDependenciesForPackCheck(repos, updated.id, "failed");
    return updated;
  }

  private async refreshPackCheckAvailabilityWithinTransaction(
    repos: WaymarkRepositories,
    instance: PackCheckInstance,
    now: ISODateTimeString,
  ): Promise<PackCheckInstance> {
    if (isPackCheckFinalStatus(instance.status)) {
      return instance;
    }

    const currentEpoch = toEpoch(now) ?? 0;
    const dueEpoch = toEpoch(instance.dueAt);
    if (
      dueEpoch !== null &&
      currentEpoch >= dueEpoch &&
      (
        instance.status === PackCheckInstanceStatus.Scheduled ||
        instance.status === PackCheckInstanceStatus.Available ||
        instance.status === PackCheckInstanceStatus.InProgress ||
        instance.status === PackCheckInstanceStatus.PartiallyCompleted
      )
    ) {
      return this.expirePackCheckInstanceWithinTransaction(repos, instance, now);
    }

    const availabilityAt = await this.getAvailabilityTime(repos, instance);
    if (
      instance.status === PackCheckInstanceStatus.Scheduled &&
      currentEpoch >= (toEpoch(availabilityAt) ?? Number.MAX_SAFE_INTEGER)
    ) {
      return this.persistPackCheck(repos, {
        ...transitionPackCheckStatus(instance, PackCheckInstanceStatus.Available),
        availableFrom: instance.availableFrom ?? availabilityAt,
      });
    }

    return instance;
  }

  private async persistPackCheck(repos: WaymarkRepositories, instance: PackCheckInstance): Promise<PackCheckInstance> {
    return repos.packChecks.upsertInstance(instance);
  }

  private async requirePackCheck(repos: WaymarkRepositories, packCheckInstanceId: string): Promise<PackCheckInstance> {
    const instance = await repos.packChecks.getInstanceById(packCheckInstanceId);
    if (!instance) {
      throw new PackCheckEngineValidationError(`PackCheckInstance ${packCheckInstanceId} does not exist.`);
    }
    return instance;
  }

  private async requireMark(repos: WaymarkRepositories, markInstanceId: string): Promise<MarkInstance> {
    const mark = await repos.marks.getMarkInstanceById(markInstanceId);
    if (!mark) {
      throw new PackCheckEngineValidationError(`MarkInstance ${markInstanceId} does not exist.`);
    }
    return mark;
  }

  private async getAvailabilityTime(repos: WaymarkRepositories, instance: PackCheckInstance): Promise<ISODateTimeString> {
    if (instance.availableFrom) {
      return instance.availableFrom;
    }

    const trailDay = await repos.trailDays.getTrailDayById(instance.trailDayId);
    if (!trailDay) {
      throw new PackCheckEngineValidationError(`TrailDay ${instance.trailDayId} does not exist for PackCheckInstance ${instance.id}.`);
    }

    if (instance.targetMarkInstanceId && (await this.isFutureLinkedPackCheck(repos, instance, trailDay.date))) {
      const fallback = buildLocalSevenPm(trailDay.date);
      const signals = await repos.signals.listSignalsByTarget(SignalTargetType.PackCheckInstance, instance.id);
      const earliestUnresolved = signals
        .filter((signal) => UNRESOLVED_SIGNAL_STATUSES.has(signal.status))
        .map((signal) => signal.scheduledAt)
        .sort()[0];
      if (earliestUnresolved && earliestUnresolved < fallback) {
        return earliestUnresolved;
      }
      return fallback;
    }

    return `${trailDay.date}T00:00:00.000Z`;
  }

  private async isFutureLinkedPackCheck(
    repos: WaymarkRepositories,
    instance: PackCheckInstance,
    currentLocalDate: LocalDateString,
  ): Promise<boolean> {
    if (!instance.targetMarkInstanceId) {
      return false;
    }

    const targetMark = await repos.marks.getMarkInstanceById(instance.targetMarkInstanceId);
    if (!targetMark) {
      return false;
    }

    const targetTrailDay = await repos.trailDays.getTrailDayById(targetMark.trailDayId);
    return !!targetTrailDay && targetTrailDay.date > currentLocalDate;
  }

  private deriveProgressStatus(
    instance: PackCheckInstance,
    items: PackCheckItemInstance[],
    checkedAction: boolean,
  ): PackCheckInstanceStatus {
    if (checkedAction && hasAnyItemChecked(items)) {
      return PackCheckInstanceStatus.PartiallyCompleted;
    }

    if (hasAnyItemChecked(items)) {
      return PackCheckInstanceStatus.InProgress;
    }

    return PackCheckInstanceStatus.Available;
  }

  private async ensureIndependentPackCheckForDate(
    repos: WaymarkRepositories,
    template: PackCheckTemplate,
    trailDayId: EntityId,
    localDate: LocalDateString,
  ): Promise<PackCheckInstance> {
    const generationKey = buildIndependentGenerationKey(template.id, localDate);
    const existing = await repos.packChecks.findInstanceByGenerationKey(template.userId, generationKey);
    if (existing) {
      return existing;
    }

    const instance: PackCheckInstance = {
      id: `pack_check_instance_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      userId: template.userId,
      templateId: template.id,
      trailDayId,
      title: template.title,
      description: template.description ?? undefined,
      status: PackCheckInstanceStatus.Available,
      availableFrom: undefined,
      dueAt: undefined,
      generationKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncVersion: 0,
    };
    const created = await repos.packChecks.upsertInstance(instance);
    await this.ensurePackCheckItemSnapshots(repos, created.id, template.id, created.userId);
    return created;
  }

  private async ensureAllPackCheckInstanceForDate(
    repos: WaymarkRepositories,
    template: PackCheckTemplate,
    trailDayId: EntityId,
    localDate: LocalDateString,
  ): Promise<PackCheckInstance> {
    const generationKey = buildAllPackChecksGenerationKey(template.id, localDate);
    const existing = await repos.packChecks.findInstanceByGenerationKey(template.userId, generationKey);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const instance: PackCheckInstance = {
      id: `pack_check_instance_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      userId: template.userId,
      templateId: template.id,
      trailDayId,
      title: template.title,
      description: template.description ?? undefined,
      status: PackCheckInstanceStatus.Available,
      availableFrom: undefined,
      dueAt: undefined,
      generationKey,
      createdAt: now,
      updatedAt: now,
      syncVersion: 0,
    };
    const created = await repos.packChecks.upsertInstance(instance);
    await this.ensurePackCheckItemSnapshots(repos, created.id, template.id, created.userId);
    return created;
  }

  private async ensureLinkedPackCheckInstance(
    repos: WaymarkRepositories,
    template: PackCheckTemplate,
    mark: MarkInstance,
    prepTrailDayId: EntityId,
    prepLocalDate: LocalDateString,
    targetLocalDate: LocalDateString,
    availableFrom?: ISODateTimeString,
    dueAt?: ISODateTimeString,
  ): Promise<PackCheckInstance> {
    const generationKey = buildLinkedGenerationKey(template.id, mark.id, prepLocalDate, targetLocalDate);
    const existing = await repos.packChecks.findInstanceByGenerationKey(mark.userId, generationKey);
    if (existing) {
      return existing;
    }

    const initialStatus =
      availableFrom ? PackCheckInstanceStatus.Scheduled : PackCheckInstanceStatus.Available;
    const instance: PackCheckInstance = {
      id: `pack_check_instance_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      userId: mark.userId,
      templateId: template.id,
      trailDayId: prepTrailDayId,
      targetMarkInstanceId: mark.id,
      title: template.title,
      description: template.description ?? undefined,
      status: initialStatus,
      availableFrom,
      dueAt,
      generationKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncVersion: 0,
    };
    const created = await repos.packChecks.upsertInstance(instance);
    await this.ensurePackCheckItemSnapshots(repos, created.id, template.id, created.userId);
    return created;
  }

  private async ensurePackCheckItemSnapshots(
    repos: WaymarkRepositories,
    packCheckInstanceId: EntityId,
    templateId: EntityId,
    userId: EntityId,
  ): Promise<void> {
    const existingItems = await repos.packChecks.listItemInstances(packCheckInstanceId);
    if (existingItems.length > 0) {
      return;
    }

    const itemTemplates = await repos.packChecks.listItemTemplates(templateId);
    const snapshots: PackCheckItemInstance[] = itemTemplates.map((itemTemplate) => ({
      id: `pack_check_item_instance_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      packCheckInstanceId,
      templateItemId: itemTemplate.id,
      label: itemTemplate.label,
      isRequired: itemTemplate.isRequired,
      isChecked: false,
      orderIndex: itemTemplate.orderIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncVersion: 0,
    }));
    if (snapshots.length > 0) {
      await repos.packChecks.upsertItemInstances(snapshots);
    }
  }

  private async computeLinkedGenerationWindow(
    repos: WaymarkRepositories,
    mark: MarkInstance,
    template: PackCheckTemplate,
    availableOffsetMin?: number,
    dueOffsetMin?: number,
  ): Promise<{ prepLocalDate: LocalDateString; targetLocalDate: LocalDateString; availableFrom?: ISODateTimeString; dueAt?: ISODateTimeString }> {
    const trailDay = await repos.trailDays.getTrailDayById(mark.trailDayId);
    if (!trailDay) {
      throw new PackCheckEngineValidationError(`TrailDay ${mark.trailDayId} does not exist for Mark ${mark.id}.`);
    }

    const referenceTime =
      mark.scheduledStartAt ??
      mark.dueAt ??
      `${trailDay.date}T09:00:00.000`;
    const resolvedAvailableOffset = availableOffsetMin ?? template.defaultAvailableOffsetMin;
    const resolvedDueOffset = dueOffsetMin ?? template.defaultDueOffsetMin;
    const availableFrom = resolvedAvailableOffset !== undefined ? subtractMinutes(referenceTime, resolvedAvailableOffset) : undefined;
    const dueAt = resolvedDueOffset !== undefined ? subtractMinutes(referenceTime, resolvedDueOffset) : undefined;
    const prepLocalDate = availableFrom ? extractLocalDate(availableFrom) : trailDay.date;

    return {
      prepLocalDate,
      targetLocalDate: trailDay.date,
      availableFrom,
      dueAt,
    };
  }

  private async resolveSignalsForPackCheck(
    repos: WaymarkRepositories,
    packCheckInstanceId: EntityId,
    resolvedAt: ISODateTimeString,
  ): Promise<void> {
    const signals = await repos.signals.listSignalsByTarget(SignalTargetType.PackCheckInstance, packCheckInstanceId);
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

  private async cancelSignalsForPackCheck(repos: WaymarkRepositories, packCheckInstanceId: EntityId): Promise<void> {
    const signals = await repos.signals.listSignalsByTarget(SignalTargetType.PackCheckInstance, packCheckInstanceId);
    for (const signal of signals) {
      if (!UNRESOLVED_SIGNAL_STATUSES.has(signal.status)) {
        continue;
      }
      await repos.signals.updateSignal(signal.id, {
        status: SignalStatus.Cancelled,
      });
    }
  }

  private async expireSignalsForPackCheck(
    repos: WaymarkRepositories,
    packCheckInstanceId: EntityId,
    expiredAt: ISODateTimeString,
  ): Promise<void> {
    const signals = await repos.signals.listSignalsByTarget(SignalTargetType.PackCheckInstance, packCheckInstanceId);
    for (const signal of signals) {
      if (!UNRESOLVED_SIGNAL_STATUSES.has(signal.status)) {
        continue;
      }
      await repos.signals.updateSignal(signal.id, {
        status: SignalStatus.Expired,
        expiredAt,
      });
    }
  }

  private async satisfyDependenciesForPackCheck(
    repos: WaymarkRepositories,
    packCheckInstanceId: EntityId,
    satisfiedAt: ISODateTimeString,
  ): Promise<void> {
    const dependencies = await repos.dependencies.listDependenciesByRequiredEntity(
      DependencyRequiredEntityType.PackCheckInstance,
      packCheckInstanceId,
    );
    for (const dependency of dependencies) {
      if (dependency.status !== DependencyStatus.Pending) {
        continue;
      }
      if (dependency.dependencyType !== DependencyType.PackCheckCompleted) {
        continue;
      }
      await repos.dependencies.updateDependency(dependency.id, {
        status: DependencyStatus.Satisfied,
        satisfiedAt,
        waivedAt: null,
      });
    }
  }

  private async failOrCancelDependenciesForPackCheck(
    repos: WaymarkRepositories,
    packCheckInstanceId: EntityId,
    outcome: "failed" | "cancelled",
  ): Promise<void> {
    const dependencies = await repos.dependencies.listDependenciesByRequiredEntity(
      DependencyRequiredEntityType.PackCheckInstance,
      packCheckInstanceId,
    );
    for (const dependency of dependencies) {
      if (dependency.status !== DependencyStatus.Pending) {
        continue;
      }
      await repos.dependencies.updateDependency(dependency.id, {
        status: outcome === "failed" ? DependencyStatus.Failed : DependencyStatus.Cancelled,
        satisfiedAt: null,
        waivedAt: null,
      });
    }
  }
}

export function createPackCheckEngine(repositories: WaymarkRepositories): PackCheckEngine {
  return new DefaultPackCheckEngine(repositories);
}
