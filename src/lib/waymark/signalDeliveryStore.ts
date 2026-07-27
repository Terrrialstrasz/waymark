import type { AppSettingsRepository } from "../../domain/waymark";

export type SignalDeliveryRecord = {
  signalId: string;
  deliveryKind?: "expo_notification" | "native_alarm";
  notificationRequestId?: string;
  channelId?: string;
  idempotencyKey?: string;
  scheduledFor?: string;
  lastScheduledAt?: string;
  lastCancelledAt?: string;
};

const PREFIX = "signal_delivery:";

function key(signalId: string) {
  return `${PREFIX}${signalId}`;
}

export async function getSignalDeliveryRecord(
  settings: AppSettingsRepository,
  userId: string,
  signalId: string,
): Promise<SignalDeliveryRecord | null> {
  const setting = await settings.getSetting(userId, key(signalId));
  if (!setting || typeof setting.value !== "object" || setting.value === null) {
    return null;
  }
  return setting.value as SignalDeliveryRecord;
}

export async function setSignalDeliveryRecord(
  settings: AppSettingsRepository,
  userId: string,
  record: SignalDeliveryRecord,
): Promise<SignalDeliveryRecord> {
  await settings.setSetting(userId, key(record.signalId), record);
  return record;
}

export async function listSignalDeliveryRecords(
  settings: AppSettingsRepository,
  userId: string,
): Promise<SignalDeliveryRecord[]> {
  const all = await settings.listSettings(userId);
  return all
    .filter((setting) => setting.key.startsWith(PREFIX))
    .map((setting) => setting.value)
    .filter((value): value is SignalDeliveryRecord => typeof value === "object" && value !== null)
    .map((value) => value as SignalDeliveryRecord);
}

export async function deleteSignalDeliveryRecord(
  settings: AppSettingsRepository,
  userId: string,
  signalId: string,
): Promise<void> {
  await settings.deleteSetting(userId, key(signalId));
}
