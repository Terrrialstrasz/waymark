import type { AppSettingsRepository } from "../../domain/waymark";

export type SignalBehavior = {
  signalId: string;
  ringCount: number;
  maxRings: number;
  repeatAfterMinutes: number;
  nextRingAt?: string;
  silencedAt?: string;
};

const PREFIX = "signal_behavior:";

function key(signalId: string) {
  return `${PREFIX}${signalId}`;
}

export async function getSignalBehavior(
  settings: AppSettingsRepository,
  userId: string,
  signalId: string,
): Promise<SignalBehavior | null> {
  const setting = await settings.getSetting(userId, key(signalId));
  if (!setting || typeof setting.value !== "object" || setting.value === null) {
    return null;
  }
  return setting.value as SignalBehavior;
}

export async function setSignalBehavior(
  settings: AppSettingsRepository,
  userId: string,
  behavior: SignalBehavior,
): Promise<SignalBehavior> {
  await settings.setSetting(userId, key(behavior.signalId), behavior);
  return behavior;
}

export async function ensureStrictSignalBehavior(
  settings: AppSettingsRepository,
  userId: string,
  signalId: string,
  defaults?: Partial<SignalBehavior>,
): Promise<SignalBehavior> {
  const existing = await getSignalBehavior(settings, userId, signalId);
  if (existing) {
    return existing;
  }
  const created: SignalBehavior = {
    signalId,
    ringCount: defaults?.ringCount ?? 0,
    maxRings: defaults?.maxRings ?? 3,
    repeatAfterMinutes: defaults?.repeatAfterMinutes ?? 5,
    nextRingAt: defaults?.nextRingAt,
    silencedAt: defaults?.silencedAt,
  };
  await setSignalBehavior(settings, userId, created);
  return created;
}
