import * as Notifications from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import type { Signal, SignalAlarmAdapter, SignalTargetType, WaymarkRepositories } from "../domain/waymark";
import type { PackCheckInstance, Path } from "../domain/waymark";
import { getWaymarkSignalAlarmHealth, scheduleWaymarkNativeSignalAlarm, cancelWaymarkNativeSignalAlarm, type WaymarkNativeAlarmPresentation } from "./waymarkSignalAlarm";
import { getSignalDeliveryRecord, listSignalDeliveryRecords, setSignalDeliveryRecord } from "../lib/waymark/signalDeliveryStore";
import { ensureStrictSignalBehavior, getSignalBehavior } from "../lib/waymark/signalBehaviorStore";
import { listSignalConfigs, type SeededSignalConfig } from "../lib/waymark/signalConfigStore";
import { getPackCheckCatalogEntryByTitle } from "../config/packCheckCatalog";

export const WAYMARK_SIGNAL_CHANNEL_ID = "waymark_signals_alarm";
export const WAYMARK_SIGNAL_MARK_CATEGORY_ID = "waymark_signal_mark";
export const WAYMARK_SIGNAL_PACK_CATEGORY_ID = "waymark_signal_pack_check";
export const WAYMARK_SIGNAL_TRAIL_CATEGORY_ID = "waymark_signal_trail";
export const WAYMARK_SIGNAL_ACTION_OPEN = "WAYMARK_SIGNAL_ACTION_OPEN";
export const WAYMARK_SIGNAL_ACTION_SNOOZE_5 = "WAYMARK_SIGNAL_ACTION_SNOOZE_5";
export const WAYMARK_SIGNAL_ACTION_DISMISS = "WAYMARK_SIGNAL_ACTION_DISMISS";
export const WAYMARK_SIGNAL_ACTION_COMPLETE = "WAYMARK_SIGNAL_ACTION_COMPLETE";
const WAYMARK_SIGNAL_SOUND = "strength_rest_bell.wav";
const WAYMARK_CALLING_TITLE = "Waymark is calling";
const WAYMARK_GENERIC_PACK_ICON = "waymark_pack_check_generic";
const WAYMARK_GENERIC_TARGET_ICON = "waymark_alarm_bell_emblem";

export type WaymarkSignalNotificationData = {
  signalId: string;
  targetId: string;
  targetType: SignalTargetType;
};

export type WaymarkAlarmPermissionBlocker =
  | "notification"
  | "exactAlarm"
  | "fullScreenIntent";

export class WaymarkAlarmPermissionBlockedError extends Error {
  constructor(
    readonly blockers: WaymarkAlarmPermissionBlocker[],
    readonly health: Awaited<ReturnType<typeof getWaymarkSignalAlarmHealth>>,
  ) {
    super(`Waymark strict signal alarm is blocked: ${formatAlarmPermissionBlockers(blockers)}.`);
    this.name = "WaymarkAlarmPermissionBlockedError";
  }
}

let notificationsInitialized = false;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readWaymarkSignalNotificationData(value: unknown): WaymarkSignalNotificationData | null {
  if (!isObjectRecord(value)) {
    return null;
  }
  const signalId = typeof value.signalId === "string" ? value.signalId : null;
  const targetId = typeof value.targetId === "string" ? value.targetId : null;
  const targetType = typeof value.targetType === "string" ? value.targetType : null;
  if (!signalId || !targetId || !targetType) {
    return null;
  }
  return {
    signalId,
    targetId,
    targetType: targetType as SignalTargetType,
  };
}

function formatAlarmPermissionBlockers(blockers: WaymarkAlarmPermissionBlocker[]) {
  return blockers
    .map((blocker) => {
      switch (blocker) {
        case "notification":
          return "notification permission is blocked";
        case "exactAlarm":
          return "exact alarm permission is blocked";
        case "fullScreenIntent":
          return "full-screen intent permission is blocked";
      }
    })
    .join(", ");
}

export async function initializeWaymarkNotificationsAsync(): Promise<void> {
  if (notificationsInitialized) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  await Notifications.setNotificationChannelAsync(WAYMARK_SIGNAL_CHANNEL_ID, {
    name: "Waymark Signals",
    importance: Notifications.AndroidImportance.MAX,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    enableVibrate: true,
    vibrationPattern: [0, 300, 180, 500],
    sound: WAYMARK_SIGNAL_SOUND,
  });

  const sharedActions: Notifications.NotificationAction[] = [
    {
      identifier: WAYMARK_SIGNAL_ACTION_OPEN,
      buttonTitle: "Open",
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: WAYMARK_SIGNAL_ACTION_SNOOZE_5,
      buttonTitle: "Snooze 5m",
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: WAYMARK_SIGNAL_ACTION_DISMISS,
      buttonTitle: "Dismiss",
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: WAYMARK_SIGNAL_ACTION_COMPLETE,
      buttonTitle: "Complete",
      options: {
        opensAppToForeground: true,
      },
    },
  ];

  await Notifications.setNotificationCategoryAsync(WAYMARK_SIGNAL_MARK_CATEGORY_ID, sharedActions);
  await Notifications.setNotificationCategoryAsync(WAYMARK_SIGNAL_PACK_CATEGORY_ID, sharedActions);
  await Notifications.setNotificationCategoryAsync(WAYMARK_SIGNAL_TRAIL_CATEGORY_ID, sharedActions);

  notificationsInitialized = true;
}

async function ensureSignalNotificationPermissionAsync() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    throw new Error("Waymark signal notifications are blocked by device permission settings.");
  }
  const requested = await Notifications.requestPermissionsAsync();
  if (!requested.granted) {
    throw new Error("Waymark signal notification permission was not granted.");
  }
  return true;
}

export async function requestWaymarkSignalNotificationPermissionAsync() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function buildNotificationTrigger(signal: Signal) {
  const triggerAt = signal.snoozedUntil ?? signal.scheduledAt;
  const triggerDate = new Date(triggerAt);
  const now = Date.now();
  const date = signal.status === "ringing" || triggerDate.getTime() <= now ? new Date(now + 1_000) : triggerDate;

  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date,
    channelId: WAYMARK_SIGNAL_CHANNEL_ID,
  } satisfies Notifications.DateTriggerInput;
}

async function buildSignalNotificationContent(
  repositories: WaymarkRepositories,
  signal: Signal,
): Promise<Notifications.NotificationContentInput> {
  const data: WaymarkSignalNotificationData = {
    signalId: signal.id,
    targetId: signal.targetId,
    targetType: signal.targetType,
  };

  if (signal.targetType === "mark_instance") {
    const mark = await repositories.marks.getMarkInstanceById(signal.targetId);
    const title = mark?.title ?? "Planned Mark";
    return {
      title: "Waymark is calling",
      body: `Act now: ${title}`,
      sound: WAYMARK_SIGNAL_SOUND,
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: WAYMARK_SIGNAL_MARK_CATEGORY_ID,
      data,
    };
  }

  if (signal.targetType === "pack_check_instance") {
    const pack = await repositories.packChecks.getInstanceById(signal.targetId);
    const title = pack?.title ?? "Pack Check";
    return {
      title: "Waymark is calling",
      body: `Prepare now: ${title}`,
      sound: WAYMARK_SIGNAL_SOUND,
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: WAYMARK_SIGNAL_PACK_CATEGORY_ID,
      data,
    };
  }

  return {
    title: "Waymark is calling",
    body: "A path action is due now.",
    sound: WAYMARK_SIGNAL_SOUND,
    priority: Notifications.AndroidNotificationPriority.MAX,
    categoryIdentifier: WAYMARK_SIGNAL_TRAIL_CATEGORY_ID,
    data,
  };
}

async function buildSignalAlarmPresentation(
  repositories: WaymarkRepositories,
  signal: Signal,
): Promise<{ title: string; body: string; presentation: WaymarkNativeAlarmPresentation }> {
  if (signal.targetType === "mark_instance") {
    const mark = await repositories.marks.getMarkInstanceById(signal.targetId);
    const signalTitle = await resolveSignalDisplayTitle(repositories, signal, mark?.templateId);
    const targetTitle = mark?.title ?? "";
    const targetIconName = mark?.pathId ? await resolvePathAlarmIconName(repositories, mark.pathId) : undefined;

    return {
      title: WAYMARK_CALLING_TITLE,
      body: targetTitle || signalTitle || "Planned Mark",
      presentation: {
        signalTitle,
        targetTitle,
        targetKind: signal.targetType,
        targetIconName,
      },
    };
  }

  if (signal.targetType === "pack_check_instance") {
    const pack = await repositories.packChecks.getInstanceById(signal.targetId);
    const signalTitle = await resolveSignalDisplayTitle(repositories, signal, pack?.templateId);
    const targetTitle = pack?.title ?? "";

    return {
      title: WAYMARK_CALLING_TITLE,
      body: targetTitle || signalTitle || "Pack Check",
      presentation: {
        signalTitle,
        targetTitle,
        targetKind: signal.targetType,
        targetIconName: resolvePackCheckAlarmIconName(pack),
      },
    };
  }

  const signalTitle = await resolveSignalDisplayTitle(repositories, signal);
  return {
    title: WAYMARK_CALLING_TITLE,
    body: signalTitle || "",
    presentation: {
      signalTitle,
      targetTitle: "",
      targetKind: signal.targetType,
      targetIconName: WAYMARK_GENERIC_TARGET_ICON,
    },
  };
}

async function resolveSignalDisplayTitle(
  repositories: WaymarkRepositories,
  signal: Signal,
  targetTemplateId?: string,
): Promise<string> {
  const configs = await listSignalConfigs(repositories.appSettings, signal.userId);

  if (signal.targetType === "mark_instance" && targetTemplateId) {
    const config = configs.find((entry) => entry.targetType === "mark_template" && entry.targetId === targetTemplateId);
    if (config?.label) {
      return config.label;
    }
  }

  if (signal.targetType === "pack_check_instance" && targetTemplateId) {
    const config = configs.find((entry) => entry.targetType === "pack_check_template" && entry.targetId === targetTemplateId);
    if (config?.label) {
      return config.label;
    }
  }

  if (signal.targetType === "trail_day") {
    const config = configs.find((entry) => entry.targetType === "global");
    if (config?.label) {
      return config.label;
    }
  }

  return "";
}

function resolvePackCheckAlarmIconName(pack?: PackCheckInstance | null): string {
  const catalogEntry = getPackCheckCatalogEntryByTitle(pack?.title);
  if (catalogEntry?.sourceSeedId) {
    return WAYMARK_GENERIC_PACK_ICON;
  }
  return WAYMARK_GENERIC_PACK_ICON;
}

async function resolvePathAlarmIconName(repositories: WaymarkRepositories, pathId: string): Promise<string | undefined> {
  const path = await repositories.paths.getPathById(pathId);
  const uiPathId = mapPathToUiPathId(path);
  switch (uiPathId) {
    case "career":
      return "waymark_path_career_craft";
    case "snag":
      return "waymark_path_snag_golf_vietnam";
    case "health":
      return "waymark_path_health_body";
    case "family":
      return "waymark_path_family_home";
    case "character":
      return "waymark_path_character_stoicism";
    case "golf":
      return "waymark_path_golf_craft";
    case "culture":
      return "waymark_path_culture_class_romance";
    default:
      return WAYMARK_GENERIC_TARGET_ICON;
  }
}

function mapPathToUiPathId(path?: Pick<Path, "slug" | "title"> | null) {
  if (!path) {
    return undefined;
  }
  const key = `${path.slug} ${path.title}`.toLowerCase();
  if (key.includes("career")) return "career";
  if (key.includes("snag")) return "snag";
  if (key.includes("health") || key.includes("body")) return "health";
  if (key.includes("family") || key.includes("home")) return "family";
  if (key.includes("character") || key.includes("stoic")) return "character";
  if (key.includes("golf")) return "golf";
  if (key.includes("culture") || key.includes("romance") || key.includes("class")) return "culture";
  return undefined;
}

async function isStrictSignal(repositories: WaymarkRepositories, signal: Signal): Promise<boolean> {
  const behavior = await getSignalBehavior(repositories.appSettings, signal.userId, signal.id);
  if (behavior) {
    return true;
  }

  return (await findMatchingStrictSignalConfig(repositories, signal)) !== null;
}

async function ensureStrictBehaviorForSignal(repositories: WaymarkRepositories, signal: Signal) {
  const config = await findMatchingStrictSignalConfig(repositories, signal);
  if (!config) {
    return null;
  }

  return ensureStrictSignalBehavior(repositories.appSettings, signal.userId, signal.id, {
    maxRings: config.maxRings,
    repeatAfterMinutes: config.repeatAfterMinutes,
  });
}

async function findMatchingStrictSignalConfig(
  repositories: WaymarkRepositories,
  signal: Signal,
): Promise<SeededSignalConfig | null> {
  const strictConfigs = (await listSignalConfigs(repositories.appSettings, signal.userId)).filter(
    (config) => config.isActive && config.strict,
  );

  if (signal.targetType === "trail_day") {
    return strictConfigs.find((config) => config.targetType === "global") ?? null;
  }

  if (signal.targetType === "mark_instance") {
    const mark = await repositories.marks.getMarkInstanceById(signal.targetId);
    if (!mark?.templateId) {
      return null;
    }
    return strictConfigs.find((config) => config.targetType === "mark_template" && config.targetId === mark.templateId) ?? null;
  }

  if (signal.targetType === "pack_check_instance") {
    const pack = await repositories.packChecks.getInstanceById(signal.targetId);
    if (!pack?.templateId) {
      return null;
    }
    return strictConfigs.find((config) => config.targetType === "pack_check_template" && config.targetId === pack.templateId) ?? null;
  }

  return null;
}

async function assertNativeAlarmReadiness() {
  const health = await getWaymarkSignalAlarmHealth();
  const blockers: WaymarkAlarmPermissionBlocker[] = [];
  if (!health.notificationPermissionGranted) {
    blockers.push("notification");
  }
  if (!health.exactAlarmPermissionGranted) {
    blockers.push("exactAlarm");
  }
  if (!health.fullScreenIntentPermissionGranted) {
    blockers.push("fullScreenIntent");
  }
  if (blockers.length > 0) {
    throw new WaymarkAlarmPermissionBlockedError(blockers, health);
  }
}

export class ExpoSignalAlarmAdapter implements SignalAlarmAdapter {
  constructor(private readonly repositories: WaymarkRepositories) {}

  async schedule(signal: Signal): Promise<void> {
    await this.upsertNotification(signal);
  }

  async cancel(signalId: string): Promise<void> {
    const signal = await this.repositories.signals.getSignalById(signalId);
    if (!signal) {
      return;
    }
    const delivery = await getSignalDeliveryRecord(this.repositories.appSettings, signal.userId, signalId);
    if (delivery?.notificationRequestId) {
      await dismissSignalNotificationRequestAsync(delivery.notificationRequestId);
    }
    await dismissSignalNotificationRequestAsync(signalId);
  }

  async reschedule(signal: Signal): Promise<void> {
    await this.upsertNotification(signal);
  }

  async reconcile(signals: Signal[]): Promise<void> {
    if (signals.length === 0) {
      return;
    }

    await initializeWaymarkNotificationsAsync();
    await ensureSignalNotificationPermissionAsync();

    const byUser = new Map<string, Signal[]>();
    for (const signal of signals) {
      const group = byUser.get(signal.userId);
      if (group) {
        group.push(signal);
      } else {
        byUser.set(signal.userId, [signal]);
      }
    }

    for (const [userId, userSignals] of byUser.entries()) {
      const activeIds = new Set(userSignals.map((signal) => signal.id));
      const deliveries = await listSignalDeliveryRecords(this.repositories.appSettings, userId);
      for (const delivery of deliveries) {
        if (!activeIds.has(delivery.signalId) && delivery.notificationRequestId) {
          await dismissSignalNotificationRequestAsync(delivery.notificationRequestId);
        }
      }
    }

    for (const signal of signals) {
      await this.upsertNotification(signal);
    }
  }

  private async upsertNotification(signal: Signal): Promise<void> {
    await initializeWaymarkNotificationsAsync();
    await ensureSignalNotificationPermissionAsync();

    const existing = await getSignalDeliveryRecord(this.repositories.appSettings, signal.userId, signal.id);
    if (existing?.notificationRequestId) {
      await dismissSignalNotificationRequestAsync(existing.notificationRequestId);
    }

    const content = await buildSignalNotificationContent(this.repositories, signal);
    const requestId = await Notifications.scheduleNotificationAsync({
      identifier: signal.id,
      content: {
        ...content,
        autoDismiss: true,
        sticky: false,
      },
      trigger: buildNotificationTrigger(signal),
    });

    await setSignalDeliveryRecord(this.repositories.appSettings, signal.userId, {
      signalId: signal.id,
      deliveryKind: "expo_notification",
      notificationRequestId: requestId,
      channelId: WAYMARK_SIGNAL_CHANNEL_ID,
      idempotencyKey: `${signal.targetType}:${signal.targetId}:${signal.scheduledAt}`,
      scheduledFor: signal.snoozedUntil ?? signal.scheduledAt,
      lastScheduledAt: new Date().toISOString(),
    });
  }
}

export class NativeSignalAlarmAdapter implements SignalAlarmAdapter {
  constructor(private readonly repositories: WaymarkRepositories) {}

  async schedule(signal: Signal): Promise<void> {
    await this.upsertNativeAlarm(signal);
  }

  async cancel(signalId: string): Promise<void> {
    await cancelWaymarkNativeSignalAlarm(signalId);
  }

  async reschedule(signal: Signal): Promise<void> {
    await this.upsertNativeAlarm(signal);
  }

  async reconcile(signals: Signal[]): Promise<void> {
    if (signals.length === 0) {
      return;
    }

    await assertNativeAlarmReadiness();
    for (const signal of signals) {
      if (signal.status === "ringing") {
        await cancelWaymarkNativeSignalAlarm(signal.id);
        continue;
      }
      await this.upsertNativeAlarm(signal);
    }
  }

  private async upsertNativeAlarm(signal: Signal): Promise<void> {
    await assertNativeAlarmReadiness();
    await ensureStrictBehaviorForSignal(this.repositories, signal);
    const scheduledFor = signal.snoozedUntil ?? signal.scheduledAt;
    const triggerAtMillis = Date.parse(scheduledFor);
    if (!Number.isFinite(triggerAtMillis)) {
      throw new Error(`Waymark strict signal ${signal.id} has an invalid scheduled time.`);
    }

    const presentation = await buildSignalAlarmPresentation(this.repositories, signal);
    await scheduleWaymarkNativeSignalAlarm({
      alarmId: signal.id,
      triggerAtMillis,
      title: presentation.title,
      body: presentation.body,
      presentation: presentation.presentation,
    });

    await setSignalDeliveryRecord(this.repositories.appSettings, signal.userId, {
      signalId: signal.id,
      deliveryKind: "native_alarm",
      idempotencyKey: `${signal.targetType}:${signal.targetId}:${signal.scheduledAt}`,
      scheduledFor,
      lastScheduledAt: new Date().toISOString(),
    });
  }
}

export class CompositeSignalAlarmAdapter implements SignalAlarmAdapter {
  constructor(
    private readonly repositories: WaymarkRepositories,
    private readonly expoAdapter: SignalAlarmAdapter = new ExpoSignalAlarmAdapter(repositories),
    private readonly nativeAdapter: SignalAlarmAdapter = new NativeSignalAlarmAdapter(repositories),
  ) {}

  async schedule(signal: Signal): Promise<void> {
    await this.expoAdapter.cancel(signal.id);
    await this.nativeAdapter.schedule(signal);
  }

  async cancel(signalId: string): Promise<void> {
    const signal = await this.repositories.signals.getSignalById(signalId);
    if (signal) {
      await this.expoAdapter.cancel(signalId);
      await this.nativeAdapter.cancel(signalId);
      return;
    }

    await this.expoAdapter.cancel(signalId);
    await this.nativeAdapter.cancel(signalId);
  }

  async reschedule(signal: Signal): Promise<void> {
    await this.expoAdapter.cancel(signal.id);
    await this.nativeAdapter.reschedule(signal);
  }

  async reconcile(signals: Signal[]): Promise<void> {
    for (const signal of signals) {
      await this.expoAdapter.cancel(signal.id);
    }

    await this.nativeAdapter.reconcile?.(signals);
  }
}

export async function dismissWaymarkSignalNotificationAsync(response: NotificationResponse): Promise<void> {
  await dismissSignalNotificationRequestAsync(response.notification.request.identifier);
}

async function dismissSignalNotificationRequestAsync(notificationRequestId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationRequestId);
  await Notifications.dismissNotificationAsync(notificationRequestId);
}

export async function getLastWaymarkNotificationResponseAsync(): Promise<NotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync();
}

export async function clearLastWaymarkNotificationResponseAsync(): Promise<void> {
  await Notifications.clearLastNotificationResponseAsync();
}

export function addWaymarkNotificationResponseListener(
  listener: (response: NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}
