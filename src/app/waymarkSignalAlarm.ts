import { NativeModules, Platform } from "react-native";

export type WaymarkNativeAlarmPresentation = {
  signalTitle?: string;
  targetTitle?: string;
  targetKind?: string;
  targetIconName?: string;
  bellIconName?: string;
};

export type WaymarkSignalAlarmHealth = {
  sdkInt: number;
  notificationPermissionGranted: boolean;
  exactAlarmPermissionGranted: boolean;
  fullScreenIntentPermissionGranted: boolean;
  batteryOptimizationIgnored: boolean;
  canShowFullScreenAlarm: boolean;
  lastAlarmId: string | null;
  lastAction: string | null;
  lastScheduledAt: number;
  lastTitle: string | null;
  lastBody: string | null;
};

type NativeWaymarkSignalAlarmModule = {
  getAlarmHealth(): Promise<WaymarkSignalAlarmHealth>;
  scheduleAlarm(
    alarmId: string,
    triggerAtMillis: number,
    title: string,
    body: string,
    presentation?: WaymarkNativeAlarmPresentation,
  ): Promise<{ alarmId: string; fireAt: number }>;
  cancelAlarm(alarmId: string): Promise<void>;
  scheduleTestAlarm(
    delayMs: number,
    title: string,
    body: string,
    presentation?: WaymarkNativeAlarmPresentation,
  ): Promise<{ alarmId: string; fireAt: number }>;
  cancelTestAlarm(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
  openFullScreenIntentSettings(): Promise<void>;
};

const nativeModule = NativeModules.WaymarkSignalAlarm as NativeWaymarkSignalAlarmModule | undefined;

function requireNativeModule() {
  if (Platform.OS !== "android") {
    throw new Error("Waymark native signal alarm is only available on Android.");
  }
  if (!nativeModule) {
    throw new Error("WaymarkSignalAlarm native module is unavailable in this build.");
  }
  return nativeModule;
}

export async function getWaymarkSignalAlarmHealth() {
  return requireNativeModule().getAlarmHealth();
}

export async function scheduleWaymarkNativeSignalAlarm({
  alarmId,
  triggerAtMillis,
  title,
  body,
  presentation,
}: {
  alarmId: string;
  triggerAtMillis: number;
  title: string;
  body: string;
  presentation?: WaymarkNativeAlarmPresentation;
}) {
  return requireNativeModule().scheduleAlarm(alarmId, triggerAtMillis, title, body, presentation);
}

export async function cancelWaymarkNativeSignalAlarm(alarmId: string) {
  return requireNativeModule().cancelAlarm(alarmId);
}

export async function scheduleWaymarkSignalAlarmTest({
  delayMs = 30_000,
  title = "Waymark Signal Test",
  body = "This is a native full-screen alarm test.",
  presentation,
}: {
  delayMs?: number;
  title?: string;
  body?: string;
  presentation?: WaymarkNativeAlarmPresentation;
} = {}) {
  return requireNativeModule().scheduleTestAlarm(delayMs, title, body, presentation);
}

export async function cancelWaymarkSignalAlarmTest() {
  return requireNativeModule().cancelTestAlarm();
}

export async function openWaymarkAlarmNotificationSettings() {
  return requireNativeModule().openNotificationSettings();
}

export async function openWaymarkExactAlarmSettings() {
  return requireNativeModule().openExactAlarmSettings();
}

export async function openWaymarkFullScreenIntentSettings() {
  return requireNativeModule().openFullScreenIntentSettings();
}
