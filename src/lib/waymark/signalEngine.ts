import {
  CancelSignalInput,
  CancelSignalsForTargetInput,
  CreateSignalInput,
  DismissSignalInput,
  EntityId,
  ExpireSignalInput,
  ISODateTimeString,
  MissSignalInput,
  ResolveSignalInput,
  ResolveSignalsForTargetInput,
  RingDueSignalsInput,
  Signal,
  SignalAlarmAdapter,
  SignalEngine,
  LocalDateString,
  SignalModeContext,
  SignalStatus,
  SignalTargetType,
  SnoozeSignalInput,
  WaymarkRepositories,
} from "../../domain/waymark";
import { buildZonedDateTime } from "../../app/waymarkUi";
import { getSignalBehavior, setSignalBehavior } from "./signalBehaviorStore";
import { listSignalConfigs } from "./signalConfigStore";
import { deleteSignalDeliveryRecord } from "./signalDeliveryStore";

const UNRESOLVED_MARK_STATUSES = new Set(["planned", "ready", "blocked", "active"]);
const UNRESOLVED_PACK_CHECK_STATUSES = new Set(["scheduled", "available", "in_progress", "partially_completed"]);

const SIGNAL_STATUS_DISPLAY_LABELS: Record<SignalStatus, string> = {
  [SignalStatus.Scheduled]: "Scheduled",
  [SignalStatus.Ringing]: "Ringing",
  [SignalStatus.Snoozed]: "Snoozed",
  [SignalStatus.Resolved]: "Resolved",
  [SignalStatus.Dismissed]: "Dismissed",
  [SignalStatus.Missed]: "Missed",
  [SignalStatus.Expired]: "Expired",
  [SignalStatus.Cancelled]: "Cancelled",
};

const SIGNAL_TRANSITIONS: Record<SignalStatus, ReadonlySet<SignalStatus>> = {
  [SignalStatus.Scheduled]: new Set([
    SignalStatus.Ringing,
    SignalStatus.Resolved,
    SignalStatus.Dismissed,
    SignalStatus.Missed,
    SignalStatus.Expired,
    SignalStatus.Cancelled,
  ]),
  [SignalStatus.Ringing]: new Set([
    SignalStatus.Snoozed,
    SignalStatus.Resolved,
    SignalStatus.Dismissed,
    SignalStatus.Missed,
    SignalStatus.Expired,
    SignalStatus.Cancelled,
  ]),
  [SignalStatus.Snoozed]: new Set([
    SignalStatus.Ringing,
    SignalStatus.Resolved,
    SignalStatus.Dismissed,
    SignalStatus.Missed,
    SignalStatus.Expired,
    SignalStatus.Cancelled,
  ]),
  [SignalStatus.Resolved]: new Set(),
  [SignalStatus.Dismissed]: new Set(),
  [SignalStatus.Missed]: new Set(),
  [SignalStatus.Expired]: new Set(),
  [SignalStatus.Cancelled]: new Set(),
};

const UNRESOLVED_SIGNAL_STATUSES = new Set<SignalStatus>([
  SignalStatus.Scheduled,
  SignalStatus.Ringing,
  SignalStatus.Snoozed,
]);

export class InvalidSignalTransitionError extends Error {
  constructor(from: SignalStatus, to: SignalStatus) {
    super(`Invalid Signal status transition ${from} -> ${to}.`);
    this.name = "InvalidSignalTransitionError";
  }
}

export class SignalEngineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignalEngineValidationError";
  }
}

class NoopSignalAlarmAdapter implements SignalAlarmAdapter {
  async schedule(_signal: Signal): Promise<void> {}
  async cancel(_signalId: string): Promise<void> {}
  async reschedule(_signal: Signal): Promise<void> {}
}

export function getSignalStatusDisplayLabel(status: SignalStatus): string {
  return SIGNAL_STATUS_DISPLAY_LABELS[status];
}

export function isSignalFinalStatus(status: SignalStatus): boolean {
  return (
      status === SignalStatus.Resolved ||
      status === SignalStatus.Dismissed ||
      status === SignalStatus.Missed ||
      status === SignalStatus.Expired ||
      status === SignalStatus.Cancelled
  );
}

export function isSignalRingingStatus(status: SignalStatus): boolean {
  return status === SignalStatus.Ringing;
}

export function isSignalResolvableStatus(status: SignalStatus): boolean {
  return UNRESOLVED_SIGNAL_STATUSES.has(status);
}

export function isSignalDismissibleStatus(status: SignalStatus): boolean {
  return (
    status === SignalStatus.Scheduled ||
    status === SignalStatus.Ringing ||
    status === SignalStatus.Snoozed
  );
}

export function isSignalSnoozableStatus(status: SignalStatus): boolean {
  return status === SignalStatus.Ringing || status === SignalStatus.Snoozed;
}

function canTransitionSignalStatusInternal(from: SignalStatus, to: SignalStatus): boolean {
  if (from === to) {
    return true;
  }
  return SIGNAL_TRANSITIONS[from]?.has(to) ?? false;
}

function assertValidSignalTransition(from: SignalStatus, to: SignalStatus): void {
  if (!canTransitionSignalStatusInternal(from, to)) {
    throw new InvalidSignalTransitionError(from, to);
  }
}

function transitionSignalStatus(signal: Signal, to: SignalStatus): Signal {
  assertValidSignalTransition(signal.status, to);
  return { ...signal, status: to };
}

function nowIso(input?: ISODateTimeString): ISODateTimeString {
  return input ?? new Date().toISOString();
}

function toEpoch(input?: ISODateTimeString): number | null {
  return input ? Date.parse(input) : null;
}

function buildDateTime(localDate: LocalDateString, time: string, timezone: string): ISODateTimeString {
  return buildZonedDateTime(localDate, time, timezone);
}

export class DefaultSignalEngine implements SignalEngine {
  constructor(
    private readonly repositories: WaymarkRepositories,
    private readonly alarmAdapter: SignalAlarmAdapter = new NoopSignalAlarmAdapter(),
  ) {}

  canTransitionSignalStatus(from: SignalStatus, to: SignalStatus): boolean {
    return canTransitionSignalStatusInternal(from, to);
  }

  async createSignal(input: CreateSignalInput): Promise<Signal> {
    const created = await this.repositories.signals.createSignal(input);
    await this.alarmAdapter.schedule(created);
    return created;
  }

  async generateSeededSignalsForDate(userId: string, localDate: LocalDateString): Promise<Signal[]> {
    const { generated, createdSignals } = await this.repositories.transaction.runInTransaction(async (repos) => {
      const trailDay = await repos.trailDays.getOrCreateTrailDay(userId, localDate);
      const user = await repos.userProfiles.getUserProfileById(userId);
      const timezone = user?.timezone ?? "UTC";
      const configs = (await listSignalConfigs(repos.appSettings, userId)).filter(
        (config) => config.isActive && config.scheduledTime,
      );
      const generated: Signal[] = [];
      const createdSignals: Signal[] = [];

      for (const config of configs) {
        const scheduledAt = buildDateTime(localDate, config.scheduledTime!, timezone);
        const targets = await this.resolveTargetsForConfig(repos, userId, localDate, trailDay.id, config);
        for (const target of targets) {
          const existing = await repos.signals.listSignalsByTarget(target.targetType, target.targetId);
          const matching = existing.find((signal) => signal.scheduledAt === scheduledAt);
          if (matching) {
            generated.push(matching);
            await this.ensureConfiguredBehavior(repos, matching, config);
            continue;
          }

          const created = await repos.signals.createSignal({
            userId,
            targetType: target.targetType,
            targetId: target.targetId,
            scheduledAt,
            status: SignalStatus.Scheduled,
          });
          await this.ensureConfiguredBehavior(repos, created, config);
          createdSignals.push(created);
          generated.push(created);
        }
      }

      return { generated, createdSignals };
    });

    for (const signal of createdSignals) {
      await this.alarmAdapter.schedule(signal);
    }

    return generated;
  }

  async ringDueSignals(input: RingDueSignalsInput): Promise<Signal[]> {
    const now = nowIso(input.now);
    const result = await this.repositories.transaction.runInTransaction(async (repos) => {
      const candidates = await repos.signals.listSignalsByStatus([SignalStatus.Scheduled, SignalStatus.Snoozed]);
      const updated: Signal[] = [];

      for (const signal of candidates.items) {
        const behavior = await getSignalBehavior(repos.appSettings, signal.userId, signal.id);
        if (signal.status === SignalStatus.Scheduled) {
          const due = toEpoch(signal.scheduledAt);
          if (due !== null && due <= (toEpoch(now) ?? 0)) {
            updated.push(
              await repos.signals.updateSignal(signal.id, {
                status: transitionSignalStatus(signal, SignalStatus.Ringing).status,
                ringingStartedAt: now,
              }),
            );
            if (behavior) {
              await setSignalBehavior(repos.appSettings, signal.userId, {
                ...behavior,
                ringCount: behavior.ringCount + 1,
              });
            }
          }
          continue;
        }

        if (signal.status === SignalStatus.Snoozed) {
          const due = toEpoch(signal.snoozedUntil);
          if (due !== null && due <= (toEpoch(now) ?? 0)) {
            if (behavior && behavior.ringCount >= behavior.maxRings) {
              const silenced = await repos.signals.updateSignal(signal.id, {
                status: transitionSignalStatus(signal, SignalStatus.Missed).status,
              });
              await setSignalBehavior(repos.appSettings, signal.userId, {
                ...behavior,
                silencedAt: now,
                nextRingAt: undefined,
              });
              updated.push(silenced);
              continue;
            }

            updated.push(
              await repos.signals.updateSignal(signal.id, {
                status: transitionSignalStatus(signal, SignalStatus.Ringing).status,
                ringingStartedAt: now,
              }),
            );
            if (behavior) {
              await setSignalBehavior(repos.appSettings, signal.userId, {
                ...behavior,
                ringCount: behavior.ringCount + 1,
                nextRingAt: undefined,
              });
            }
          }
        }
      }

      return updated;
    });

    for (const signal of result) {
      if (signal.status === SignalStatus.Missed) {
        await this.alarmAdapter.cancel(signal.id);
        await deleteSignalDeliveryRecord(this.repositories.appSettings, signal.userId, signal.id);
      }
    }

    return result;
  }

  async snoozeSignal(input: SnoozeSignalInput): Promise<Signal> {
    const snoozedUntil = nowIso(input.snoozedUntil);
    const currentTime = nowIso(input.now);
    if ((toEpoch(snoozedUntil) ?? 0) <= (toEpoch(currentTime) ?? 0)) {
      throw new SignalEngineValidationError("snoozedUntil must be in the future.");
    }

    const updated = await this.repositories.transaction.runInTransaction(async (repos) => {
      const signal = await this.requireSignal(repos, input.signalId);
      if (!isSignalSnoozableStatus(signal.status)) {
        throw new SignalEngineValidationError(`Signal ${signal.id} in status ${signal.status} cannot be snoozed.`);
      }

      return repos.signals.updateSignal(signal.id, {
        status: transitionSignalStatus(signal, SignalStatus.Snoozed).status,
        snoozedUntil,
      });
    });

    await this.alarmAdapter.reschedule(updated);
    return updated;
  }

  async dismissSignal(input: DismissSignalInput): Promise<Signal> {
    const dismissedAt = nowIso(input.dismissedAt);
    const updated = await this.repositories.transaction.runInTransaction(async (repos) => {
      const signal = await this.requireSignal(repos, input.signalId);
      if (!isSignalDismissibleStatus(signal.status)) {
        throw new SignalEngineValidationError(`Signal ${signal.id} in status ${signal.status} cannot be dismissed.`);
      }

      const behavior = await getSignalBehavior(repos.appSettings, signal.userId, signal.id);
      if (behavior) {
        await setSignalBehavior(repos.appSettings, signal.userId, {
          ...behavior,
          silencedAt: dismissedAt,
          nextRingAt: undefined,
        });
      }

      return repos.signals.updateSignal(signal.id, {
        status: transitionSignalStatus(signal, SignalStatus.Dismissed).status,
        dismissedAt,
      });
    });

    await this.alarmAdapter.cancel(updated.id);
    await deleteSignalDeliveryRecord(this.repositories.appSettings, updated.userId, updated.id);
    return updated;
  }

  async resolveSignal(input: ResolveSignalInput): Promise<Signal> {
    const resolvedAt = nowIso(input.resolvedAt);
    const updated = await this.repositories.transaction.runInTransaction(async (repos) => {
      const signal = await this.requireSignal(repos, input.signalId);
      if (!isSignalResolvableStatus(signal.status)) {
        throw new SignalEngineValidationError(`Signal ${signal.id} in status ${signal.status} cannot be resolved.`);
      }

      return repos.signals.updateSignal(signal.id, {
        status: transitionSignalStatus(signal, SignalStatus.Resolved).status,
        resolvedAt,
      });
    });

    await this.alarmAdapter.cancel(updated.id);
    await deleteSignalDeliveryRecord(this.repositories.appSettings, updated.userId, updated.id);
    return updated;
  }

  async resolveSignalsForTarget(input: ResolveSignalsForTargetInput): Promise<Signal[]> {
    const resolvedAt = nowIso(input.resolvedAt);
    const updated = await this.repositories.transaction.runInTransaction(async (repos) => {
      const signals = await repos.signals.listSignalsByTarget(input.targetType, input.targetId);
      const results: Signal[] = [];
      for (const signal of signals) {
        if (!isSignalResolvableStatus(signal.status)) {
          continue;
        }
        results.push(
          await repos.signals.updateSignal(signal.id, {
            status: transitionSignalStatus(signal, SignalStatus.Resolved).status,
            resolvedAt,
          }),
        );
      }
      return results;
    });

    for (const signal of updated) {
      await this.alarmAdapter.cancel(signal.id);
      await deleteSignalDeliveryRecord(this.repositories.appSettings, signal.userId, signal.id);
    }
    return updated;
  }

  async expireSignal(input: ExpireSignalInput): Promise<Signal> {
    const expiredAt = nowIso(input.expiredAt);
    const updated = await this.repositories.transaction.runInTransaction(async (repos) => {
      const signal = await this.requireSignal(repos, input.signalId);
      if (!UNRESOLVED_SIGNAL_STATUSES.has(signal.status)) {
        throw new SignalEngineValidationError(`Signal ${signal.id} in status ${signal.status} cannot be expired.`);
      }
      return repos.signals.updateSignal(signal.id, {
        status: transitionSignalStatus(signal, SignalStatus.Expired).status,
        expiredAt,
      });
    });

    await this.alarmAdapter.cancel(updated.id);
    await deleteSignalDeliveryRecord(this.repositories.appSettings, updated.userId, updated.id);
    return updated;
  }

  async missSignal(input: MissSignalInput): Promise<Signal> {
    const missedAt = nowIso(input.missedAt);
    const updated = await this.repositories.transaction.runInTransaction(async (repos) => {
      const signal = await this.requireSignal(repos, input.signalId);
      if (!UNRESOLVED_SIGNAL_STATUSES.has(signal.status)) {
        throw new SignalEngineValidationError(`Signal ${signal.id} in status ${signal.status} cannot be missed.`);
      }
      return repos.signals.updateSignal(signal.id, {
        status: transitionSignalStatus(signal, SignalStatus.Missed).status,
      });
    });

    const behavior = await getSignalBehavior(this.repositories.appSettings, updated.userId, updated.id);
    if (behavior) {
      await setSignalBehavior(this.repositories.appSettings, updated.userId, {
        ...behavior,
        silencedAt: missedAt,
        nextRingAt: undefined,
      });
    }

    await this.alarmAdapter.cancel(updated.id);
    await deleteSignalDeliveryRecord(this.repositories.appSettings, updated.userId, updated.id);
    return updated;
  }

  async cancelSignal(input: CancelSignalInput): Promise<Signal> {
    const updated = await this.repositories.transaction.runInTransaction(async (repos) => {
      const signal = await this.requireSignal(repos, input.signalId);
      if (!UNRESOLVED_SIGNAL_STATUSES.has(signal.status)) {
        throw new SignalEngineValidationError(`Signal ${signal.id} in status ${signal.status} cannot be cancelled.`);
      }
      return repos.signals.updateSignal(signal.id, {
        status: transitionSignalStatus(signal, SignalStatus.Cancelled).status,
        cancelledAt: nowIso(input.cancelledAt),
      });
    });

    await this.alarmAdapter.cancel(updated.id);
    await deleteSignalDeliveryRecord(this.repositories.appSettings, updated.userId, updated.id);
    return updated;
  }

  async cancelSignalsForTarget(input: CancelSignalsForTargetInput): Promise<Signal[]> {
    const updated = await this.repositories.transaction.runInTransaction(async (repos) => {
      const signals = await repos.signals.listSignalsByTarget(input.targetType, input.targetId);
      const results: Signal[] = [];
      const cancelledAt = nowIso(input.cancelledAt);
      for (const signal of signals) {
        if (!UNRESOLVED_SIGNAL_STATUSES.has(signal.status)) {
          continue;
        }
        results.push(
          await repos.signals.updateSignal(signal.id, {
            status: transitionSignalStatus(signal, SignalStatus.Cancelled).status,
            cancelledAt,
          }),
        );
      }
      return results;
    });

    for (const signal of updated) {
      await this.alarmAdapter.cancel(signal.id);
      await deleteSignalDeliveryRecord(this.repositories.appSettings, signal.userId, signal.id);
    }
    return updated;
  }

  async getSignalModeContext(signalId: EntityId): Promise<SignalModeContext> {
    const signal = await this.requireSignal(this.repositories, signalId);
    await this.assertTargetExists(this.repositories, signal.targetType, signal.targetId);

    return {
      signal,
      targetType: signal.targetType,
      targetId: signal.targetId,
      mode: "signal",
      openedAt: new Date().toISOString(),
    };
  }

  async reconcileSignalDeliveries(userId: EntityId): Promise<void> {
    const unresolved = await this.repositories.signals.listSignalsByStatus([
      SignalStatus.Scheduled,
      SignalStatus.Ringing,
      SignalStatus.Snoozed,
    ]);
    const relevantSignals = unresolved.items.filter((signal) => signal.userId === userId);
    await this.alarmAdapter.reconcile?.(relevantSignals);
  }

  private async resolveTargetsForConfig(
    repos: WaymarkRepositories,
    userId: string,
    localDate: LocalDateString,
    trailDayId: string,
    config: Awaited<ReturnType<typeof listSignalConfigs>>[number],
  ): Promise<Array<{ targetType: SignalTargetType; targetId: string }>> {
    switch (config.targetType) {
      case "global":
        return [{ targetType: SignalTargetType.TrailDay, targetId: trailDayId }];
      case "mark_template": {
        if (!config.targetId) {
          return [];
        }
        const marks = await repos.marks.listMarkInstancesByTemplate(config.targetId, {
          startDate: localDate,
          endDate: localDate,
        });
        return marks
          .filter((mark) => mark.userId === userId && UNRESOLVED_MARK_STATUSES.has(mark.status))
          .map((mark) => ({ targetType: SignalTargetType.MarkInstance, targetId: mark.id }));
      }
      case "pack_check_template": {
        if (!config.targetId) {
          return [];
        }
        const instances = await repos.packChecks.listInstancesByTrailDay(trailDayId);
        return instances
          .filter(
            (instance) =>
              instance.userId === userId &&
              instance.templateId === config.targetId &&
              UNRESOLVED_PACK_CHECK_STATUSES.has(instance.status),
          )
          .map((instance) => ({ targetType: SignalTargetType.PackCheckInstance, targetId: instance.id }));
      }
      default:
        return [];
    }
  }

  private async ensureConfiguredBehavior(
    repos: WaymarkRepositories,
    signal: Signal,
    config: Awaited<ReturnType<typeof listSignalConfigs>>[number],
  ): Promise<void> {
    if (!config.strict) {
      return;
    }

    const existing = await getSignalBehavior(repos.appSettings, signal.userId, signal.id);
    await setSignalBehavior(repos.appSettings, signal.userId, {
      signalId: signal.id,
      ringCount: existing?.ringCount ?? 0,
      maxRings: config.maxRings ?? existing?.maxRings ?? 3,
      repeatAfterMinutes: config.repeatAfterMinutes ?? existing?.repeatAfterMinutes ?? 5,
      nextRingAt: existing?.nextRingAt,
      silencedAt: existing?.silencedAt,
    });
  }

  private async requireSignal(repos: WaymarkRepositories, signalId: EntityId): Promise<Signal> {
    const signal = await repos.signals.getSignalById(signalId);
    if (!signal) {
      throw new SignalEngineValidationError(`Signal ${signalId} does not exist.`);
    }
    return signal;
  }

  private async assertTargetExists(
    repos: WaymarkRepositories,
    targetType: SignalTargetType,
    targetId: EntityId,
  ): Promise<void> {
    switch (targetType) {
      case SignalTargetType.MarkInstance: {
        const mark = await repos.marks.getMarkInstanceById(targetId);
        if (!mark) {
          throw new SignalEngineValidationError(`Signal target MarkInstance ${targetId} does not exist.`);
        }
        return;
      }
      case SignalTargetType.PackCheckInstance: {
        const packCheck = await repos.packChecks.getInstanceById(targetId);
        if (!packCheck) {
          throw new SignalEngineValidationError(`Signal target PackCheckInstance ${targetId} does not exist.`);
        }
        return;
      }
      case SignalTargetType.TrailDay: {
        const trailDay = await repos.trailDays.getTrailDayById(targetId);
        if (!trailDay) {
          throw new SignalEngineValidationError(`Signal target TrailDay ${targetId} does not exist.`);
        }
        return;
      }
      default:
        throw new SignalEngineValidationError(`Unsupported Signal target type ${String(targetType)}.`);
    }
  }
}

export function createSignalEngine(
  repositories: WaymarkRepositories,
  alarmAdapter?: SignalAlarmAdapter,
): SignalEngine {
  return new DefaultSignalEngine(repositories, alarmAdapter);
}
