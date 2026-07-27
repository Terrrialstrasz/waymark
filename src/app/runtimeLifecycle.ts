import type { Signal, UserProfile, WaymarkRepositories } from "../domain/waymark";
import { SignalStatus } from "../domain/waymark/enums";
import type { MarkEngine, PackCheckEngine, SignalEngine } from "../domain/waymark/services";
import {
  cleanupLegacyTemplateGeneratedMarks,
  recomputeTrailDayCountersForDate,
  resolveAnchorPathIdForDate,
} from "../lib/waymark";
import { formatLocalDate, shiftLocalDate } from "./waymarkUi";

const SIGNAL_STALE_GRACE_WINDOW_MS = 90 * 60 * 1000;

type RuntimeLifecycleServices = {
  repositories: WaymarkRepositories;
  user: UserProfile;
  markEngine: MarkEngine;
  packCheckEngine: PackCheckEngine;
  signalEngine: SignalEngine;
};

export function getCurrentRuntimeLocalDate(timezone: string, now: Date = new Date()) {
  return formatLocalDate(now, timezone);
}

export async function materializeRuntimeForDate(
  services: RuntimeLifecycleServices,
  localDate: string,
  nowIso: string,
) {
  const initialTrailDay = await services.repositories.trailDays.getOrCreateTrailDay(services.user.id, localDate);
  const activePaths = await services.repositories.paths.listActivePaths(services.user.id);
  const resolvedAnchorPathId = await resolveAnchorPathIdForDate(
    services.repositories.appSettings,
    services.user.id,
    initialTrailDay,
    activePaths,
  );
  const trailDay =
    resolvedAnchorPathId && initialTrailDay.anchorPathId !== resolvedAnchorPathId
      ? await services.repositories.trailDays.setAnchorPath(initialTrailDay.id, resolvedAnchorPathId)
      : initialTrailDay;
  const nextLocalDate = shiftLocalDate(localDate, 1);
  const cleanup = await cleanupLegacyTemplateGeneratedMarks(
    services.repositories,
    services.signalEngine,
    services.user.id,
  );
  const marks = await services.repositories.marks.listMarkInstancesByDate(services.user.id, localDate);
  const packChecks = await services.packCheckEngine.listVisiblePackChecksForDay(services.user.id, localDate, nowIso);
  const signals = await services.repositories.signals.listSignalsByStatus([
    SignalStatus.Scheduled,
    SignalStatus.Ringing,
    SignalStatus.Snoozed,
  ]);
  const resolvedNonTodaySignals = await resolveNonTodaySignals(
    services,
    signals.items.filter((signal) => signal.userId === services.user.id),
    localDate,
    nowIso,
  );
  const missedStaleSignals = await missStaleTodaySignals(
    services,
    signals.items.filter((signal) => signal.userId === services.user.id),
    localDate,
    nowIso,
  );
  const ringingSignals = await services.signalEngine.ringDueSignals({ now: nowIso });
  await services.signalEngine.reconcileSignalDeliveries(services.user.id);
  await recomputeTrailDayCountersForDate(services.repositories, services.user.id, localDate);
  await recomputeTrailDayCountersForDate(services.repositories, services.user.id, nextLocalDate);

  return {
    trailDay,
    marks,
    packChecks,
    signals: signals.items.filter((signal) => signal.userId === services.user.id),
    resolvedNonTodaySignals,
    missedStaleSignals,
    ringingSignals,
    cleanup,
  };
}

async function resolveNonTodaySignals(
  services: RuntimeLifecycleServices,
  signals: Signal[],
  todayLocalDate: string,
  resolvedAt: string,
) {
  const resolved: Signal[] = [];
  for (const signal of signals) {
    const signalLocalDate = getSignalLocalDate(signal, services.user.timezone);
    if (!signalLocalDate || signalLocalDate >= todayLocalDate) {
      continue;
    }
    resolved.push(
      await services.signalEngine.resolveSignal({
        signalId: signal.id,
        resolvedAt,
        reason: "Resolved at runtime startup because the signal is not scheduled for today.",
      }),
    );
  }
  return resolved;
}

async function missStaleTodaySignals(
  services: RuntimeLifecycleServices,
  signals: Signal[],
  todayLocalDate: string,
  missedAt: string,
) {
  const missed: Signal[] = [];
  const nowEpoch = Date.parse(missedAt);
  if (!Number.isFinite(nowEpoch)) {
    return missed;
  }

  for (const signal of signals) {
    const signalLocalDate = getSignalLocalDate(signal, services.user.timezone);
    if (signalLocalDate !== todayLocalDate) {
      continue;
    }
    const dueEpoch = getSignalDueEpoch(signal);
    if (dueEpoch === null || nowEpoch - dueEpoch <= SIGNAL_STALE_GRACE_WINDOW_MS) {
      continue;
    }
    missed.push(
      await services.signalEngine.missSignal({
        signalId: signal.id,
        missedAt,
        reason: "Missed at runtime startup because the signal is more than 90 minutes overdue.",
      }),
    );
  }
  return missed;
}

function getSignalLocalDate(signal: Signal, timezone: string) {
  const timestamp = signal.snoozedUntil ?? signal.scheduledAt ?? signal.ringingStartedAt;
  if (!timestamp) {
    return null;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return formatLocalDate(date, timezone);
}

function getSignalDueEpoch(signal: Signal) {
  const timestamp = signal.snoozedUntil ?? signal.scheduledAt;
  if (!timestamp) {
    return null;
  }
  const epoch = Date.parse(timestamp);
  return Number.isFinite(epoch) ? epoch : null;
}
