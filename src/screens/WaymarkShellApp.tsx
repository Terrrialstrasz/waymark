import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, Modal, StyleSheet, TextInput, View, Vibration } from "react-native";
import { CloseTrailScreen } from "../components/close-trail/CloseTrailScreen";
import { BacklogDetailTemplate } from "../components/backlog/BacklogDetailTemplate";
import { BacklogTemplate } from "../components/backlog/BacklogTemplate";
import { ExpeditionDetailTemplate } from "../components/expeditions/ExpeditionDetailTemplate";
import { GolfPracticeSessionTemplate } from "../components/golf/GolfPracticeSessionTemplate";
import { DailyJournalTemplate, JournalHomeTemplate } from "../components/journal";
import type { MarkDetailItem } from "../components/mark-detail/model";
import { MarkDetailTemplate as MarkDetailScreen } from "../components/mark-detail/MarkDetailTemplate";
import { MemoryDetailTemplate as MemoryDetailScreen } from "../components/memory-detail/MemoryDetailTemplate";
import { PackCheckTemplate } from "../components/pack-check";
import { PathDetailTemplate } from "../components/paths/PathDetailTemplate";
import { WeeklyMilestonesTemplate } from "../components/paths/WeeklyMilestonesTemplate";
import type { WeeklyMilestoneItem, WeeklyMilestoneMarkItem } from "../components/paths/types";
import { BottomNavBar } from "../components/primitives/BottomNavBar";
import { WMChip } from "../components/primitives/WMChip";
import { FieldJournalScreenShell } from "../components/primitives/FieldJournalScreenShell";
import { WMButton } from "../components/primitives/WMButton";
import { WMEmptyState } from "../components/primitives/WMEmptyState";
import { WMText } from "../components/primitives/Text";
import { SignalModeCard, type SignalModeCardModel, type SignalModeIntentPayload, useSignalModeController } from "../components/signal";
import { StrengthSessionTemplate, type StrengthSessionDebugAction } from "../components/health/strength/StrengthSessionTemplate";
import { WorkoutSessionReviewTemplate } from "../components/health/strength/WorkoutSessionReviewTemplate";
import { TodayCockpitScreen } from "../components/today/TodayCockpitScreen";
import { TodayMarkActionSheet } from "../components/today/TodayMarkActionSheet";
import type { TodayMarkItem, TodayMarkLaunchConfig, TodayMarkStatus, TodayPackCheckItem } from "../components/today/__fixtures__/todayCarousel.fixtures";
import { getActiveExercise, getCurrentSet, getNextExercise, getNextSet } from "../components/health/strength/utils";
import { getStrengthSessionPrimaryAction } from "../components/health/strength/getStrengthSessionPrimaryAction";
import { WeeklySignalReviewTemplate } from "../components/weekly-timetable/WeeklySignalReviewTemplate";
import { WeeklyTimetableReviewTemplate } from "../components/weekly-timetable/WeeklyTimetableReviewTemplate";
import { MeOverviewTemplate } from "./me/MeOverviewTemplate";
import { getCopy } from "../i18n/copy";
import type {
  ExpeditionOption,
  MilestoneOption,
  MoveMarkValue,
  PathOption,
  PlannedMarkActionValue,
  QuickSubstituteValue,
} from "../components/planned-mark/PlannedMarkActionSheetContent";
import {
  clearWaymarkSignalsAsync,
  clearLocalProgressMapForTursoPull,
  exportWaymarkDatabaseAsync,
  getWaymarkSignalAlarmHealth,
  importGolfProgramDevMarks,
  importWeeklyTimetable20260608To0614,
  importWeeklyTimetable20260615To0621,
  importWeeklyTimetable20260622To0628,
  importWeeklyTimetable20260629To0705,
  importWeeklyTimetable202607020305Patch,
  importWeeklyTimetable20260706To0712,
  importBreakfastMarks20260713To0719,
  importWeeklyTimetable20260713To0719,
  importWeekendHospitalCarePatch20260725To0726,
  importWeeklyTimetable20260720To0726,
  importWeeklyTimetable20260727To0802,
  importWeeklyTimetable20260803To0809,
  importDevJournalMemoriesFromExportFixture,
  repairWorkoutDatabase,
  openWaymarkAlarmNotificationSettings,
  openWaymarkExactAlarmSettings,
  openWaymarkFullScreenIntentSettings,
  scheduleWaymarkSignalAlarmTest,
  cancelWaymarkSignalAlarmTest,
  useGoogleDriveDevUpload,
  useWaymarkApp,
  useWaymarkBacklog,
  useWaymarkCapture,
  useWaymarkCloseTrail,
  useWaymarkExpeditionDetail,
  useWaymarkJournal,
  useWaymarkMarkDetail,
  useWaymarkMemoryDetail,
  useWaymarkPackCheckDetail,
  useWaymarkPathDetail,
  useWaymarkStrengthSession,
  useWaymarkWorkoutReview,
  useWaymarkToday,
  useWaymarkTursoDevSync,
  useWaymarkDayReview,
  useWaymarkWeeklyMilestones,
  useWaymarkWeeklyCoding,
} from "../app";
import { formatLocalDate, mapUiPathId, shiftLocalDate } from "../app/waymarkUi";
import { getWaymarkAppVariant } from "../app/googleDriveMediaConfig";
import { buildGolfPracticeLaunchConfig, buildHealthWorkoutLaunchConfig } from "../app/todayDataLoader";
import {
  WAYMARK_SIGNAL_ACTION_COMPLETE,
  WAYMARK_SIGNAL_ACTION_DISMISS,
  WAYMARK_SIGNAL_ACTION_OPEN,
  WAYMARK_SIGNAL_ACTION_SNOOZE_5,
  addWaymarkNotificationResponseListener,
  clearLastWaymarkNotificationResponseAsync,
  dismissWaymarkSignalNotificationAsync,
  getLastWaymarkNotificationResponseAsync,
  readWaymarkSignalNotificationData,
} from "../app/waymarkNotifications";
import type { MarkInstance, MarkInstanceDetail, Signal } from "../domain/waymark/entities";
import {
  MarkInstanceOrigin,
  MarkInstanceStatus,
  MilestoneStatus,
  SignalStatus,
  SignalTargetType,
  WorkoutSessionStatus,
} from "../domain/waymark/enums";
import { advanceStrengthSession, tickStrengthSession, updateStrengthSetActualLoad } from "../lib/waymark/strengthSessionExecution";
import { saveGolfPracticeLog } from "../lib/waymark/golfPractice";
import { buildGolfShortGamePracticePlanForMarkTitle, resolveGolfPracticeWorkoutTypeForMarkTitle } from "../lib/waymark/golfPracticeMark";
import { buildGolfProgramPracticePlanForTitle } from "../config/golfProgramCatalog";
import { deleteMarkDetail, loadStrengthSessionReadModel } from "../lib/waymark/shellAppAdapters";
import { isMarkFinalStatus, setMarkMetadata, type MarkResolutionKind } from "../lib/waymark";
import { getMarkMetadata } from "../lib/waymark/markMetadataStore";
import { getMarkTemplateSeedMetadata } from "../lib/waymark/markTemplateSeedStore";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";
import { createSignalOrchestrator, type SignalPrimaryResolutionInput, type SignalSkipResolutionInput } from "../lib/waymark/signalOrchestrator";
import { colors, foundationColors, spacing } from "../theme/tokens";
import type { StrengthExercise, StrengthSessionData } from "../types/strengthSession";
import type { SaveGolfPracticeLogInput } from "../types/golfPractice";
import type { BottomTabId, Locale, PathId } from "../types/ui";
import type { CaptureMediaAttachment } from "../types/capture";

const ENABLE_PREVIEW_ME_TOOLS =
  getWaymarkAppVariant() === "dev" &&
  (__DEV__ || process.env.EXPO_PUBLIC_WAYMARK_PREVIEW_TOOLS === "true");

type SubstituteHierarchyOptions = {
  pathOptions: PathOption[];
  expeditionOptions: ExpeditionOption[];
  milestoneOptions: MilestoneOption[];
};

const EMPTY_SUBSTITUTE_HIERARCHY_OPTIONS: SubstituteHierarchyOptions = {
  pathOptions: [],
  expeditionOptions: [],
  milestoneOptions: [],
};

const DEV_CHIPPING_TEST_MARKS = [
  {
    localDate: "2026-07-20",
    startTime: "12:00",
    endTime: "12:30",
    title: "Chipping 3 m · Land inside zone at 1.2 m · Hit Flagsticky",
    description:
      "Set plan: 3 sets x 8 reps = 24 chips. Set 1 calibration, Set 2 keep rhythm, Set 3 pressure. Hit only when ball lands inside the 1.2 m zone then touches Flagsticky. Log Hit/Miss only; no make-up shots.",
  },
  {
    localDate: "2026-07-21",
    startTime: "12:00",
    endTime: "12:30",
    title: "Chipping 3 m · Land inside zone at 1.2 m · Hit Flagsticky",
    description:
      "Set plan: 3 sets x 8 reps = 24 chips. Repeat the 3 m setup to compare with 20/07. Hit only when ball lands inside the 1.2 m zone then touches Flagsticky. Log Hit/Miss only; no make-up shots.",
  },
  {
    localDate: "2026-07-22",
    startTime: "12:00",
    endTime: "12:30",
    title: "Chipping 5 m · Land inside zone at 2.0 m · Hit Flagsticky",
    description:
      "Set plan: 3 sets x 8 reps = 24 chips. Set 1 calibration, Set 2 keep rhythm, Set 3 pressure. Hit only when ball lands inside the 2.0 m zone then touches Flagsticky. Log Hit/Miss only; no make-up shots.",
  },
  {
    localDate: "2026-07-23",
    startTime: "12:00",
    endTime: "12:30",
    title: "Chipping 5 m · Land inside zone at 2.0 m · Hit Flagsticky",
    description:
      "Set plan: 3 sets x 8 reps = 24 chips. Repeat the 5 m setup to compare with 22/07. Hit only when ball lands inside the 2.0 m zone then touches Flagsticky. Log Hit/Miss only; no make-up shots.",
  },
  {
    localDate: "2026-07-24",
    startTime: "12:00",
    endTime: "12:30",
    title: "Chipping 7 m · Land inside zone at 2.8 m · Hit Flagsticky",
    description:
      "Set plan: 3 sets x 8 reps = 24 chips. Set 1 calibration, Set 2 keep rhythm, Set 3 pressure. Hit only when ball lands inside the 2.8 m zone then touches Flagsticky. Log Hit/Miss only; no make-up shots.",
  },
  {
    localDate: "2026-07-25",
    startTime: "05:35",
    endTime: "06:05",
    title: "Chipping 7 m · Land inside zone at 2.8 m · Hit Flagsticky",
    description:
      "Set plan: 3 sets x 8 reps = 24 chips. Repeat the 7 m setup to compare with 24/07. Hit only when ball lands inside the 2.8 m zone then touches Flagsticky. Log Hit/Miss only; no make-up shots.",
  },
  {
    localDate: "2026-07-26",
    startTime: "05:35",
    endTime: "06:05",
    title: "Chipping 3-5-7 m · Land inside each zone · Hit Flagsticky",
    description:
      "Set plan: 6 sets x 4 reps = 24 chips. Round 1: 3 m x4, 5 m x4, 7 m x4. Round 2 repeats the same order. Hit only when ball lands inside its zone then touches Flagsticky. Log Hit/Miss only; no make-up shots.",
  },
] as const;

type DetailSourceType = "mark_instance" | "memory" | "backlog_item" | "pack_check_instance";

type WeeklySessionReviewLaunch = {
  kind: "strength_session" | "golf_practice";
  markTitle: string;
  routineTemplateId?: string;
  workoutType?: "putting" | "swing";
};

type WeeklySessionReviewResolution = {
  launch: WeeklySessionReviewLaunch;
  interactionKind: "strength_session" | "golf_practice";
  launchConfig?: TodayMarkLaunchConfig;
};

type AppRoute =
  | { kind: "today" }
  | { kind: "journal" }
  | { kind: "dailyJournal"; dayKey: string }
  | { kind: "paths" }
  | { kind: "me" }
  | { kind: "closeTrail"; trailDayId?: string }
  | { kind: "pathDetail"; pathId: PathId }
  | { kind: "golfPractice"; parentTab: Exclude<BottomTabId, "capture">; markId?: string; markTitle?: string; routineTemplateId?: string; workoutType?: "putting" | "swing"; mode?: "execution" | "review" }
  | { kind: "workoutReview"; parentTab: Exclude<BottomTabId, "capture">; markId: string; routineTemplateId?: string }
  | { kind: "detail"; sourceType: DetailSourceType; sourceId: string; parentTab: Exclude<BottomTabId, "capture">; sessionReview?: WeeklySessionReviewLaunch }
  | { kind: "signal"; signalId: string; parentTab: Exclude<BottomTabId, "capture"> }
  | { kind: "strengthSession"; markId: string; parentTab: Exclude<BottomTabId, "capture"> }
  | { kind: "packCheck"; packId: string }
  | { kind: "expeditionDetail"; expeditionId: string; parentTab: Exclude<BottomTabId, "capture"> }
  | { kind: "backlog" }
  | { kind: "weeklyTimetable" }
  | { kind: "weeklySignal" };

function t(value: Record<Locale, string>, locale: Locale) {
  return value[locale];
}

function pathLabel(pathId: PathId, locale: Locale) {
  return t(todayPathHeroPaths.find((path) => path.id === pathId)?.compactLabel ?? { en: pathId, vi: pathId }, locale);
}

function buildStrengthSessionSyncKey(session: StrengthSessionData | null) {
  if (!session) {
    return "null";
  }

  return JSON.stringify({
    phase: session.phase,
    activeExerciseId: session.activeExerciseId ?? null,
    activeStretchId: session.activeStretchId ?? null,
    strengthComplete: session.strengthComplete,
    cooldownStarted: session.cooldownStarted,
    sessionComplete: session.sessionComplete,
    exercises: session.exercises.map((exercise) => ({
      id: exercise.id,
      state: exercise.state,
      completedSetNumber: exercise.completedSetNumber ?? null,
      nextSetNumber: exercise.nextSetNumber ?? null,
      timerState: exercise.timer?.state ?? null,
      restTimerState: exercise.restTimer?.state ?? null,
      sets: exercise.sets?.map((set) => ({
        id: set.id,
        state: set.state,
      })),
    })),
    stretches: session.stretches.map((stretch) => ({
      id: stretch.id,
      state: stretch.state,
    })),
    stretchTimerState: session.stretchTimer?.state ?? null,
  });
}

function buildMarkDetailItem(mark: TodayMarkItem, locale: Locale): MarkDetailItem {
  const path = todayPathHeroPaths.find((item) => item.id === mark.pathId)!;

  return {
    id: mark.id,
    title: t(mark.title, locale),
    note: mark.summary ? t(mark.summary, locale) : undefined,
    date: new Date().toISOString(),
    status: mark.status === "done" ? "done" : "planned",
    sourceType: "mark_instance",
    path: {
      id: mark.pathId,
      name: t(path.label, locale),
      skin: {
        color: path.color.accent,
        deepColor: path.color.accentDeep,
        softColor: path.color.accentSoft,
      },
    },
    proofDetail: mark.summary ? t(mark.summary, locale) : undefined,
    metadata: [
      { id: "time", label: "Time", value: mark.timeLabel ? t(mark.timeLabel, locale) : "Today" },
      { id: "path", label: "Path", value: t(path.label, locale) },
    ],
  };
}

function buildPackCheckViewModel(pack: TodayPackCheckItem): { name: string; path: PathId } {
  if (pack.pathId) {
    return {
      name: pack.title.en,
      path: pack.pathId,
    };
  }

  const titleEn = pack.title.en.toLowerCase();
  const path: PathId = titleEn.includes("gym")
    ? "health"
    : titleEn.includes("office") || titleEn.includes("desk")
      ? "career"
      : titleEn.includes("morning")
        ? "character"
        : "family";

  return {
    name: pack.title.en,
    path,
  };
}

function buildMeHubItems(
  locale: Locale,
  openBacklog: () => void,
  openWeeklyTimetable: () => void,
  openWeeklySignal: () => void,
  openCloseTrail: () => void,
) {
  const c = getCopy(locale).me;
  return [
    {
      id: "weekly-timetable",
      title: locale === "vi" ? "Weekly Timetable" : "Weekly Timetable",
      subtitle:
        locale === "vi"
          ? "Xem cac week_plan_items va mark materialization."
          : "Review persisted week_plan_items and mark materialization.",
      helperText:
        locale === "vi"
          ? "Xac minh source-of-truth truoc khi vao Today."
          : "Verify the source of truth before Today reads it.",
      icon: "entity.path" as const,
      tone: "ivory" as const,
      onPress: openWeeklyTimetable,
    },
    {
      id: "weekly-signal",
      title: locale === "vi" ? "Weekly Signal" : "Weekly Signal",
      subtitle: locale === "vi" ? "Xem cac signal active trong tuan." : "Review active signals for the week.",
      helperText: locale === "vi" ? "Kiem tra alarm va target truoc khi vao Today." : "Verify alarms and targets before Today runs.",
      icon: "entity.signal" as const,
      tone: "ivory" as const,
      onPress: openWeeklySignal,
    },
    {
      id: "backlog",
      title: c.backlogHub.title,
      subtitle: c.backlogHub.subtitle,
      icon: "entity.memory" as const,
      tone: "blue" as const,
      onPress: openBacklog,
    },
    {
      id: "close-day",
      title: locale === "vi" ? "Khep trail" : "Close the Trail",
      subtitle: locale === "vi" ? "Di qua flow closure day du." : "Walk the closure flow end-to-end.",
      icon: "status.done" as const,
      tone: "ivory" as const,
      onPress: openCloseTrail,
    },
  ];
}

function routeToTab(route: AppRoute): Exclude<BottomTabId, "capture"> {
  switch (route.kind) {
    case "journal":
    case "dailyJournal":
      return "journal";
    case "paths":
    case "pathDetail":
    case "golfPractice":
      return "paths";
    case "me":
    case "backlog":
    case "weeklyTimetable":
    case "weeklySignal":
      return "me";
    case "detail":
    case "signal":
    case "strengthSession":
    case "workoutReview":
    case "expeditionDetail":
      return route.parentTab;
    case "packCheck":
      return "today";
    case "closeTrail":
    case "today":
    default:
      return "today";
  }
}

function ShellSignalCard({
  model,
  resolveIntent,
}: {
  model: SignalModeCardModel;
  resolveIntent: (payload: SignalModeIntentPayload) => Promise<void>;
}) {
  const { model: controlledModel, handleIntent } = useSignalModeController({
    model,
    resolveIntent,
  });

  return <SignalModeCard model={controlledModel} onIntent={handleIntent} variant="withPrimarySlot" />;
}

function formatSignalTimeLabel(value: string, locale: Locale) {
  return new Date(value).toLocaleTimeString(locale === "vi" ? "vi-VN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSignalStatusLabel(status: SignalModeCardModel["status"], locale: Locale) {
  switch (status) {
    case "ringing":
      return locale === "vi" ? "Bay gio" : "Now";
    case "snoozed":
      return locale === "vi" ? "Da hoan" : "Snoozed";
    case "missed":
      return locale === "vi" ? "Da lo" : "Missed";
    case "resolving":
      return locale === "vi" ? "Dang xu ly" : "Resolving";
    case "resolved":
      return locale === "vi" ? "Da xu ly" : "Resolved";
    case "disabled":
      return locale === "vi" ? "Chua kha dung" : "Unavailable";
    case "error":
      return locale === "vi" ? "Loi" : "Error";
    default:
      return locale === "vi" ? "Sap den" : "Due soon";
  }
}

function mapSignalCardStatus(status: SignalStatus): SignalModeCardModel["status"] {
  switch (status) {
    case SignalStatus.Ringing:
      return "ringing";
    case SignalStatus.Snoozed:
      return "snoozed";
    case SignalStatus.Resolved:
      return "resolved";
    case SignalStatus.Missed:
      return "missed";
    case SignalStatus.Expired:
      return "missed";
    case SignalStatus.Cancelled:
    case SignalStatus.Dismissed:
      return "disabled";
    case SignalStatus.Scheduled:
    default:
      return "scheduled";
  }
}

function createLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function collectStrengthTimerStates(session: StrengthSessionData) {
  const states: Record<string, string> = {};

  for (const exercise of session.exercises) {
    if (exercise.restTimer) {
      states[`rest:${exercise.id}`] = exercise.restTimer.state;
    }
    if (exercise.timer) {
      states[`exercise:${exercise.id}`] = exercise.timer.state;
    }
  }

  if (session.stretchTimer) {
    states[`stretch:${session.activeStretchId ?? "session"}`] = session.stretchTimer.state;
  }

  return states;
}

function StrengthSessionAudioEffects({
  session,
}: {
  session: StrengthSessionData;
}) {
  const { setAudioModeAsync, useAudioPlayer } = require("expo-audio") as typeof import("expo-audio");
  const { getWaymarkSoundAsset } = require("../assets/soundRegistry") as typeof import("../assets/soundRegistry");
  const restBellPlayer = useAudioPlayer(getWaymarkSoundAsset("strength.restBell").source, {
    keepAudioSessionActive: true,
  });
  const previousTimerStatesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
    }).catch((error) => {
      console.warn("[WaymarkAudio] Failed to configure audio mode.", error);
    });
  }, [setAudioModeAsync]);

  useEffect(() => {
    const nextTimerStates = collectStrengthTimerStates(session);
    const completedTimers = Object.entries(nextTimerStates).filter(
      ([key, state]) => state === "completed" && previousTimerStatesRef.current[key] === "running",
    );

    if (completedTimers.length > 0) {
      Vibration.vibrate([0, 180, 90, 240]);
      void (async () => {
        try {
          if (restBellPlayer.playing) {
            restBellPlayer.pause();
          }
          if (restBellPlayer.currentTime > 0) {
            await restBellPlayer.seekTo(0);
          }
          restBellPlayer.play();
        } catch (error) {
          console.warn("[WaymarkAudio] Failed to play timer bell.", error);
        }
      })();
    }

    previousTimerStatesRef.current = nextTimerStates;
  }, [restBellPlayer, session]);

  return null;
}

function isUiPathId(value: string): value is PathId {
  return ["career", "snag", "health", "family", "character", "golf", "culture"].includes(value);
}

export function WaymarkShellApp() {
  const [locale, setLocale] = useState<Locale>("en");
  const app = useWaymarkApp();
  const [selectedPathId, setSelectedPathId] = useState<PathId>("family");
  const [routeStack, setRouteStack] = useState<AppRoute[]>([{ kind: "today" }]);
  const [selectedTodayMark, setSelectedTodayMark] = useState<TodayMarkItem | null>(null);
  const [selectedWeeklyMark, setSelectedWeeklyMark] = useState<TodayMarkItem | null>(null);
  const [selectedWeeklyMarkActionMode, setSelectedWeeklyMarkActionMode] = useState<"execution" | "review">("execution");
  const [selectedWeeklyTimetableDayDate, setSelectedWeeklyTimetableDayDate] = useState(() =>
    formatLocalDate(new Date(), app.user.timezone),
  );
  const [substituteHierarchyOptions, setSubstituteHierarchyOptions] = useState<SubstituteHierarchyOptions>(
    EMPTY_SUBSTITUTE_HIERARCHY_OPTIONS,
  );
  const [startingStrengthMarkId, setStartingStrengthMarkId] = useState<string | null>(null);
  const handledNotificationResponseRef = useRef<string | null>(null);
  const handledDeepLinkUrlRef = useRef<string | null>(null);
  const redirectedSignalMarkIdRef = useRef<string | null>(null);
  const pendingJournalDriveLoginRef = useRef(false);
  const [routeSignalRecord, setRouteSignalRecord] = useState<Signal | null>(null);

  const route = routeStack[routeStack.length - 1] ?? { kind: "today" };
  const activeTab = routeToTab(route);
  const detailRoute = route.kind === "detail" ? route : null;
  const shouldLoadJournal = activeTab === "journal" || route.kind === "dailyJournal";
  const shouldLoadBacklog = route.kind === "backlog" || detailRoute?.sourceType === "backlog_item";
  const shouldLoadWeekly =
    route.kind === "weeklyTimetable" ||
    route.kind === "weeklySignal";
  const shouldLoadCloseTrail = route.kind === "closeTrail";
  const shouldLoadToday = activeTab === "today" || route.kind === "signal" || shouldLoadCloseTrail;
  const shouldLoadWeeklyMilestones = route.kind === "paths" || route.kind === "weeklyTimetable";

  const googleDriveDevUpload = useGoogleDriveDevUpload(locale);
  const tursoDevSync = useWaymarkTursoDevSync(locale);
  const [confirmingDailyPlan, setConfirmingDailyPlan] = useState(false);
  const [tursoLinkModalOpen, setTursoLinkModalOpen] = useState(false);
  const [tursoLinkUrl, setTursoLinkUrl] = useState("");
  const [tursoLinkToken, setTursoLinkToken] = useState("");
  const liveToday = useWaymarkToday(locale, { enabled: shouldLoadToday });
  const journal = useWaymarkJournal(locale, { enabled: shouldLoadJournal });
  const backlog = useWaymarkBacklog(locale, { enabled: shouldLoadBacklog });
  const capture = useWaymarkCapture();
  const weekly = useWaymarkWeeklyCoding(locale, { enabled: shouldLoadWeekly });
  const weeklyMilestones = useWaymarkWeeklyMilestones(locale, {
    enabled: shouldLoadWeeklyMilestones,
    weekStartDate: route.kind === "weeklyTimetable" ? weekly.selectedWeekStart : undefined,
  });
  const previousWeeklyTimetableWeekStartRef = useRef(weekly.selectedWeekStart);

  useEffect(() => {
    const previousWeekStart = previousWeeklyTimetableWeekStartRef.current;
    previousWeeklyTimetableWeekStartRef.current = weekly.selectedWeekStart;

    if (route.kind !== "weeklyTimetable") {
      return;
    }

    setSelectedWeeklyTimetableDayDate((current) => {
      const weekStart = weekly.selectedWeekStart;
      const weekEnd = shiftLocalDate(weekStart, 6);
      if (current >= weekStart && current <= weekEnd) {
        return current;
      }

      const today = formatLocalDate(new Date(), app.user.timezone);
      if (today >= weekStart && today <= weekEnd) {
        return today;
      }

      const offset = clampDayOffset(getLocalDateDiff(current, previousWeekStart));
      return shiftLocalDate(weekStart, offset);
    });
  }, [app.user.timezone, route.kind, weekly.selectedWeekStart]);

  const dayReview = useWaymarkDayReview(locale, {
    enabled: route.kind === "weeklyTimetable",
    localDate: route.kind === "weeklyTimetable" ? selectedWeeklyTimetableDayDate : null,
  });
  const weeklyTimetableDayNavigatorDays = useMemo(() => {
    const today = formatLocalDate(new Date(), app.user.timezone);
    return buildWeeklyTimetableDayNavigatorDays(
      weekly.selectedWeekStart,
      locale,
      today,
      weekly.reviewDays,
      dayReview.localDate,
      dayReview.marks.length,
    );
  }, [app.user.timezone, dayReview.localDate, dayReview.marks.length, locale, weekly.reviewDays, weekly.selectedWeekStart]);
  const selectedWeeklyTimetableDayLabel = useMemo(
    () => formatWeeklyTimetableDayLabel(selectedWeeklyTimetableDayDate, locale),
    [locale, selectedWeeklyTimetableDayDate],
  );

  const liveTodayData = liveToday.status === "ready" ? liveToday.data : null;
  const activeSignalRouteId = route.kind === "signal" ? route.signalId : null;
  const signalRouteSignal =
    route.kind === "signal"
      ? liveTodayData?.signalsById[route.signalId] ?? routeSignalRecord ?? null
      : null;
  const signalRouteMarkId =
    signalRouteSignal?.targetType === SignalTargetType.MarkInstance ? signalRouteSignal.targetId : null;
  const signalRoutePackCheckId =
    signalRouteSignal?.targetType === SignalTargetType.PackCheckInstance ? signalRouteSignal.targetId : null;
  const signalRouteTrailDayId =
    signalRouteSignal?.targetType === SignalTargetType.TrailDay ? signalRouteSignal.targetId : null;
  const pathDetail = useWaymarkPathDetail(locale, route.kind === "pathDetail" ? route.pathId : null);
  const expeditionDetail = useWaymarkExpeditionDetail(locale, route.kind === "expeditionDetail" ? route.expeditionId : null);
  const markDetail = useWaymarkMarkDetail(
    locale,
    detailRoute?.sourceType === "mark_instance" ? detailRoute.sourceId : signalRouteMarkId,
  );
  const memoryDetail = useWaymarkMemoryDetail(locale, detailRoute?.sourceType === "memory" ? detailRoute.sourceId : null);
  const packCheckDetailId =
    route.kind === "packCheck"
      ? route.packId
      : detailRoute?.sourceType === "pack_check_instance"
        ? detailRoute.sourceId
        : signalRoutePackCheckId;
  const packCheckDetail = useWaymarkPackCheckDetail(locale, packCheckDetailId);
  const strengthSession = useWaymarkStrengthSession(locale, route.kind === "strengthSession" ? route.markId : null);
  const workoutReview = useWaymarkWorkoutReview(
    locale,
    route.kind === "workoutReview" ? route.markId : null,
    route.kind === "workoutReview" ? route.routineTemplateId : undefined,
  );
  const closeTrailTrailDayId =
    route.kind === "closeTrail"
      ? route.trailDayId ?? liveTodayData?.trailDayId ?? null
      : signalRouteTrailDayId ?? liveTodayData?.trailDayId ?? null;
  const closeTrail = useWaymarkCloseTrail(locale, liveTodayData?.marks ?? [], closeTrailTrailDayId, {
    enabled: shouldLoadCloseTrail,
  });
  const todayMarks = liveTodayData?.marks ?? [];
  const todayPackChecks = liveTodayData?.packChecks ?? [];
  const allTodayPackChecks = liveTodayData?.allPackChecks ?? todayPackChecks;
  const todayPackCheckItems = liveTodayData?.packCheckItemsById ?? {};
  const [strengthSessionDraft, setStrengthSessionDraft] = useState<StrengthSessionData | null>(null);
  const [savingGolfPractice, setSavingGolfPractice] = useState(false);
  const strengthAutoPrepKeyRef = useRef<string | null>(null);
  const strengthPendingSyncKeyRef = useRef<string | null>(null);
  const strengthMarkId = route.kind === "strengthSession" ? route.markId : null;
  const strengthReadModel = strengthSession.data.status === "ready" ? strengthSession.data : null;
  const dailyJournalRouteDayKey = route.kind === "dailyJournal" ? route.dayKey : null;

  useEffect(() => {
    if (!dailyJournalRouteDayKey) {
      return;
    }
    void journal.loadDailyJournal(dailyJournalRouteDayKey);
  }, [dailyJournalRouteDayKey, journal.loadDailyJournal, journal.status]);
  const resolvedStrengthSession = strengthSessionDraft ?? strengthReadModel?.uiSession ?? null;

  async function loadSubstituteHierarchyOptions(): Promise<SubstituteHierarchyOptions> {
    const paths = await app.repositories.paths.listActivePaths(app.user.id);
    const pathOptions: PathOption[] = paths.map((path) => ({
      id: path.id,
      label: path.title,
    }));
    const expeditionOptions: ExpeditionOption[] = [];
    const milestoneOptions: MilestoneOption[] = [];

    for (const path of paths) {
      const expeditions = await app.repositories.expeditions.listExpeditionsByPath(path.id);
      for (const expedition of expeditions.items) {
        expeditionOptions.push({
          id: expedition.id,
          label: expedition.title,
          pathId: path.id,
        });

        const milestones = await app.repositories.expeditions.listMilestonesByExpedition(expedition.id);
        for (const milestone of milestones) {
          milestoneOptions.push({
            id: milestone.id,
            label: milestone.title,
            expeditionId: expedition.id,
            pathId: path.id,
          });
        }
      }
    }

    return { pathOptions, expeditionOptions, milestoneOptions };
  }

  useEffect(() => {
    if (route.kind !== "signal") {
      setRouteSignalRecord(null);
      return;
    }

    let cancelled = false;
    const signalId = route.signalId;

    void (async () => {
      try {
        const signal = await app.repositories.signals.getSignalById(signalId);
        if (!cancelled) {
          setRouteSignalRecord(signal);
        }
      } catch (error) {
        console.warn("[WaymarkSignal] Failed to load signal route record", signalId, error);
        if (!cancelled) {
          setRouteSignalRecord(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app.repositories.signals, route]);

  useEffect(() => {
    if (liveTodayData?.selectedPathId) {
      setSelectedPathId((current) => (current === liveTodayData.selectedPathId ? current : liveTodayData.selectedPathId));
    }
  }, [liveTodayData?.selectedPathId]);

  useEffect(() => {
    if (route.kind !== "today" && selectedTodayMark) {
      setSelectedTodayMark(null);
    }
  }, [route.kind, selectedTodayMark]);

  useEffect(() => {
    if (!isContextMarkActionSheetRoute(route.kind) && selectedWeeklyMark) {
      setSelectedWeeklyMark(null);
      setSelectedWeeklyMarkActionMode("execution");
    }
  }, [route.kind, selectedWeeklyMark]);

  useEffect(() => {
    const selectedMark = selectedTodayMark ?? selectedWeeklyMark;
    if (!selectedMark) {
      setSubstituteHierarchyOptions(EMPTY_SUBSTITUTE_HIERARCHY_OPTIONS);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const options = await loadSubstituteHierarchyOptions();
        if (!cancelled) {
          setSubstituteHierarchyOptions(options);
        }
      } catch (error) {
        console.warn("[WaymarkSubstitute] Failed to load substitute hierarchy options.", error);
        if (!cancelled) {
          setSubstituteHierarchyOptions(EMPTY_SUBSTITUTE_HIERARCHY_OPTIONS);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedTodayMark, selectedWeeklyMark]);

  useEffect(() => {
    if (route.kind !== "signal" || signalRouteSignal?.targetType !== SignalTargetType.MarkInstance) {
      redirectedSignalMarkIdRef.current = null;
      return;
    }

    const targetMark = todayMarks.find((item) => item.id === signalRouteSignal.targetId);
    if (!targetMark) {
      return;
    }

    if (redirectedSignalMarkIdRef.current === signalRouteSignal.id) {
      return;
    }

    redirectedSignalMarkIdRef.current = signalRouteSignal.id;
    setRouteStack([{ kind: "today" }]);
    setSelectedTodayMark(targetMark);
  }, [route.kind, signalRouteSignal, todayMarks]);

  useEffect(() => {
    if (route.kind !== "signal" || signalRouteSignal?.targetType !== SignalTargetType.TrailDay) {
      return;
    }

    const trailDayId = signalRouteSignal.targetId;
    setRouteStack((current) => {
      const activeRoute = current[current.length - 1];
      if (activeRoute?.kind !== "signal" || activeRoute.signalId !== activeSignalRouteId) {
        return current;
      }
      return [...current.slice(0, -1), { kind: "closeTrail", trailDayId }];
    });
  }, [activeSignalRouteId, route.kind, signalRouteSignal]);

  useEffect(() => {
    if (!selectedTodayMark) {
      return;
    }

    const stillVisible = todayMarks.some((mark) => mark.id === selectedTodayMark.id);
    if (!stillVisible) {
      setSelectedTodayMark(null);
    }
  }, [selectedTodayMark, todayMarks]);

  useEffect(() => {
    setStrengthSessionDraft(null);
    strengthAutoPrepKeyRef.current = null;
    strengthPendingSyncKeyRef.current = null;
  }, [strengthMarkId]);

  useEffect(() => {
    if (route.kind !== "strengthSession" || !strengthReadModel || !strengthPendingSyncKeyRef.current) {
      return;
    }

    if (strengthPendingSyncKeyRef.current === buildStrengthSessionSyncKey(strengthReadModel.uiSession)) {
      strengthPendingSyncKeyRef.current = null;
      setStrengthSessionDraft(null);
    }
  }, [route.kind, strengthReadModel]);

  useEffect(() => {
    if (route.kind !== "strengthSession" || !strengthReadModel || strengthSessionDraft) {
      return;
    }

    const sessionId = strengthReadModel.session.id;
    const shouldStartExercise =
      strengthReadModel.session.sessionStatus === WorkoutSessionStatus.Active &&
      strengthReadModel.uiSession.phase === "strength" &&
      !strengthReadModel.uiSession.activeExerciseId &&
      !strengthReadModel.uiSession.strengthComplete;

    if (!shouldStartExercise) {
      return;
    }

    const prepKey = [
      sessionId,
      strengthReadModel.session.sessionStatus,
      strengthReadModel.uiSession.activeExerciseId ?? "none",
      "exercise",
    ].join(":");
    if (strengthAutoPrepKeyRef.current === prepKey) {
      return;
    }
    strengthAutoPrepKeyRef.current = prepKey;

    let cancelled = false;

    void (async () => {
      try {
        if (shouldStartExercise) {
          const startedExercise = await app.strengthSessionEngine.startExercise({ workoutSessionInstanceId: sessionId });
          const firstExercise = strengthReadModel.uiSession.exercises.find((exercise) => exercise.id === startedExercise.currentExerciseSnapshotId);
          if (firstExercise && firstExercise.mode !== "timed") {
            await app.strengthSessionEngine.startSet({
              workoutSessionInstanceId: sessionId,
              sessionExerciseSnapshotId: startedExercise.currentExerciseSnapshotId!,
              setNumber: 1,
            });
          }
        }

        if (!cancelled) {
          strengthSession.refresh();
        }
      } catch (error) {
        if (!cancelled) {
          strengthAutoPrepKeyRef.current = null;
          Alert.alert(
            locale === "vi" ? "Khong khoi tao duoc buoi tap" : "Unable to prepare workout session",
            error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, locale, route.kind, strengthReadModel, strengthSession.refresh, strengthSessionDraft]);

  useEffect(() => {
    if (route.kind !== "strengthSession" || !resolvedStrengthSession) {
      return;
    }

    const hasRunningTimer =
      (resolvedStrengthSession.phase === "rest" &&
        resolvedStrengthSession.exercises.some((exercise) => exercise.restTimer?.state === "running")) ||
      (resolvedStrengthSession.phase === "timed" &&
        resolvedStrengthSession.exercises.some((exercise) => exercise.timer?.state === "running")) ||
      (resolvedStrengthSession.phase === "cooldown" && resolvedStrengthSession.stretchTimer?.state === "running");

    if (!hasRunningTimer) {
      return;
    }

    const timerId = setInterval(() => {
      setStrengthSessionDraft((current) => tickStrengthSession(current ?? resolvedStrengthSession));
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, [resolvedStrengthSession, route.kind]);

  const updateLocale = () => {
    setLocale((current) => (current === "en" ? "vi" : "en"));
  };

  const handleExportLocalDatabase = () => {
    void (async () => {
      try {
        const result = await exportWaymarkDatabaseAsync();
        const exportedSummary = result.exportedFiles.map((file: { name: string }) => file.name).join(", ");
        Alert.alert(
          locale === "vi" ? "Da xuat database local" : "Local database exported",
          locale === "vi"
            ? `Da copy: ${exportedSummary}\n\nThu muc:\n${result.exportDirectoryUri}\n\n${
                result.shareMethod
                  ? `Da mo chia se bang ${result.shareMethod}.`
                  : "Khong mo duoc chia se tu dong, nhung duong dan da duoc ghi log."
              }`
            : `Copied: ${exportedSummary}\n\nFolder:\n${result.exportDirectoryUri}\n\n${
                result.shareMethod
                  ? `Share sheet opened via ${result.shareMethod}.`
                  : "Share was not opened automatically, but the export path was logged."
              }`,
        );
      } catch (error) {
        console.error("[WaymarkDBExport] Export failed", error);
        Alert.alert(
          locale === "vi" ? "Khong xuat duoc database" : "Unable to export database",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const refreshLoadedShellData = () => {
    if (shouldLoadToday) {
      liveToday.refresh();
    }
    if (shouldLoadWeekly) {
      weekly.refresh();
    }
    if (route.kind === "weeklyTimetable") {
      dayReview.refresh();
    }
    if (shouldLoadJournal) {
      journal.refresh();
    }
    weeklyMilestones.refresh();
    pathDetail.refresh();
    expeditionDetail.refresh();
  };

  const handleImportSampleWeeklyTimetable = () => {
    void (async () => {
      try {
        const report = await importWeeklyTimetable20260608To0614(app, app.user.id, app.user.timezone);
        refreshLoadedShellData();
        Alert.alert(
          locale === "vi" ? "Da import Weekly Timetable" : "Weekly Timetable imported",
          locale === "vi"
            ? `Da luu ${report.items.length} week_plan_items, materialize ${report.results.length} marks, tao/cap nhat ${report.signals.length} signals cho tuan 2026-06-08 den 2026-06-14.`
            : `Saved ${report.items.length} week_plan_items, materialized ${report.results.length} marks, and created/kept ${report.signals.length} signals for the week of 2026-06-08 to 2026-06-14.`,
          [
            {
              text: "OK",
              onPress: () => pushRoute({ kind: "weeklyTimetable" }),
            },
          ],
        );
      } catch (error) {
        console.error("[WaymarkWeeklyTimetable] Import failed", error);
        Alert.alert(
          locale === "vi" ? "Khong import duoc Weekly Timetable" : "Unable to import Weekly Timetable",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleImportWeeklyTimetable20260615 = () => {
    void (async () => {
      try {
        const report = await importWeeklyTimetable20260615To0621(app.repositories, app.user.id);
        refreshLoadedShellData();
        Alert.alert(
          locale === "vi" ? "Da import Weekly Timetable" : "Weekly Timetable imported",
          locale === "vi"
            ? `Da luu ${report.items.length} week_plan_items va materialize ${report.results.length} marks cho tuan 2026-06-15 den 2026-06-21.`
            : `Saved ${report.items.length} week_plan_items and materialized ${report.results.length} marks for the week of 2026-06-15 to 2026-06-21.`,
          [
            {
              text: "OK",
              onPress: () => pushRoute({ kind: "weeklyTimetable" }),
            },
          ],
        );
      } catch (error) {
        console.error("[WaymarkWeeklyTimetable20260615] Import failed", error);
        Alert.alert(
          locale === "vi" ? "Khong import duoc Weekly Timetable" : "Unable to import Weekly Timetable",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleImportWeeklyTimetable20260622 = () => {
    void (async () => {
      try {
        const report = await importWeeklyTimetable20260622To0628(app, app.user.id, app.user.timezone);
        refreshLoadedShellData();
        Alert.alert(
          locale === "vi" ? "Da import Weekly Timetable" : "Weekly Timetable imported",
          locale === "vi"
            ? `Da luu ${report.items.length} week_plan_items, materialize ${report.results.length} marks, tao/cap nhat ${report.packChecks.length} pack checks va ${report.signals.length} signals cho tuan 2026-06-22 den 2026-06-28.`
            : `Saved ${report.items.length} week_plan_items, materialized ${report.results.length} marks, and created/updated ${report.packChecks.length} pack checks plus ${report.signals.length} signals for the week of 2026-06-22 to 2026-06-28.`,
          [
            {
              text: "OK",
              onPress: () => pushRoute({ kind: "weeklyTimetable" }),
            },
          ],
        );
      } catch (error) {
        console.error("[WaymarkWeeklyTimetable20260622] Import failed", error);
        Alert.alert(
          locale === "vi" ? "Khong import duoc Weekly Timetable" : "Unable to import Weekly Timetable",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleImportWeeklyTimetable20260629 = () => {
    void (async () => {
      try {
        const report = await importWeeklyTimetable20260629To0705(app, app.user.id, app.user.timezone);
        refreshLoadedShellData();
        Alert.alert(
          locale === "vi" ? "Da import Weekly Timetable" : "Weekly Timetable imported",
          locale === "vi"
            ? `Da luu ${report.items.length} week_plan_items, materialize ${report.results.length} marks, tao/cap nhat ${report.expeditions.length} expeditions, ${report.milestones.length} milestones, ${report.packChecks.length} pack checks va ${report.signals.length} signals cho tuan 2026-06-29 den 2026-07-05.`
            : `Saved ${report.items.length} week_plan_items, materialized ${report.results.length} marks, and created/updated ${report.expeditions.length} expeditions, ${report.milestones.length} milestones, ${report.packChecks.length} pack checks, and ${report.signals.length} signals for the week of 2026-06-29 to 2026-07-05.`,
          [
            {
              text: "OK",
              onPress: () => pushRoute({ kind: "weeklyTimetable" }),
            },
          ],
        );
      } catch (error) {
        console.error("[WaymarkWeeklyTimetable20260629] Import failed", error);
        Alert.alert(
          locale === "vi" ? "Khong import duoc Weekly Timetable" : "Unable to import Weekly Timetable",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleImportWeeklyTimetable202607020305Patch = () => {
    void (async () => {
      try {
        const report = await importWeeklyTimetable202607020305Patch(app, app.user.id);
        refreshLoadedShellData();
        Alert.alert(
          locale === "vi" ? "Da patch Weekly Timetable" : "Weekly Timetable patched",
          locale === "vi"
            ? `Da update rieng ${report.items.length} mark slots cho 02/07, 03/07 va 05/07. Da don ${report.removedWeekPlanItemIds.length} week items cu va ${report.removedMarkIds.length} marks cu con pristine; cac mark da xu ly/user-edited duoc giu nguyen.`
            : `Updated ${report.items.length} mark slots for 2026-07-02, 2026-07-03, and 2026-07-05 only. Cleaned ${report.removedWeekPlanItemIds.length} old week items and ${report.removedMarkIds.length} old pristine marks; handled/user-edited marks were preserved.`,
          [
            {
              text: "OK",
              onPress: () => pushRoute({ kind: "weeklyTimetable" }),
            },
          ],
        );
      } catch (error) {
        console.error("[WaymarkWeeklyTimetable202607020305Patch] Import failed", error);
        Alert.alert(
          locale === "vi" ? "Khong patch duoc Weekly Timetable" : "Unable to patch Weekly Timetable",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleImportWeeklyTimetable20260706 = () => {
    void (async () => {
      try {
        const report = await importWeeklyTimetable20260706To0712(app, app.user.id, app.user.timezone);
        refreshLoadedShellData();
        Alert.alert(
          locale === "vi" ? "Da import Weekly Timetable" : "Weekly Timetable imported",
          locale === "vi"
            ? `Da luu ${report.items.length} week_plan_items, materialize ${report.results.length} marks, tao/cap nhat ${report.expeditions.length} expeditions, ${report.milestones.length} milestones va ${report.signals.length} fullscreen alarm signals cho tuan 2026-07-06 den 2026-07-12.`
            : `Saved ${report.items.length} week_plan_items, materialized ${report.results.length} marks, and created/updated ${report.expeditions.length} expeditions, ${report.milestones.length} milestones, and ${report.signals.length} full-screen alarm signals for the week of 2026-07-06 to 2026-07-12.`,
          [
            {
              text: "OK",
              onPress: () => pushRoute({ kind: "weeklyTimetable" }),
            },
          ],
        );
      } catch (error) {
        console.error("[WaymarkWeeklyTimetable20260706] Import failed", error);
        Alert.alert(
          locale === "vi" ? "Khong import duoc Weekly Timetable" : "Unable to import Weekly Timetable",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleImportWeeklyTimetable20260713 = () => {
    void (async () => {
      try {
        const report = await importWeeklyTimetable20260713To0719(app, app.user.id, app.user.timezone);
        refreshLoadedShellData();
        Alert.alert(
          locale === "vi" ? "Da import Weekly Timetable" : "Weekly Timetable imported",
          locale === "vi"
            ? `Da luu ${report.items.length} week_plan_items, materialize ${report.results.length} marks, tao/cap nhat ${report.expeditions.length} expeditions, ${report.milestones.length} milestones, ${report.packChecks.length} pack checks va ${report.signals.length} signals cho tuan 2026-07-13 den 2026-07-19.`
            : `Saved ${report.items.length} week_plan_items, materialized ${report.results.length} marks, and created/updated ${report.expeditions.length} expeditions, ${report.milestones.length} milestones, ${report.packChecks.length} pack checks, and ${report.signals.length} signals for the week of 2026-07-13 to 2026-07-19.`,
          [
            {
              text: "OK",
              onPress: () => pushRoute({ kind: "weeklyTimetable" }),
            },
          ],
        );
      } catch (error) {
        console.error("[WaymarkWeeklyTimetable20260713] Import failed", error);
        Alert.alert(
          locale === "vi" ? "Khong import duoc Weekly Timetable" : "Unable to import Weekly Timetable",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleImportWeeklyTimetable20260720 = () => {
    void (async () => {
      try {
        const report = await importWeeklyTimetable20260720To0726(app, app.user.id, app.user.timezone);
        refreshLoadedShellData();
        Alert.alert(
          locale === "vi" ? "Da import Weekly Timetable" : "Weekly Timetable imported",
          locale === "vi"
            ? `Da luu ${report.items.length} week_plan_items, materialize ${report.results.length} marks, tao/cap nhat ${report.packChecks.length} pack checks va ${report.signals.length} signals cho tuan 2026-07-20 den 2026-07-26. Hierarchy: link ${report.hierarchyLinks.linked}, bo trong ${report.hierarchyLinks.skipped.length}.`
            : `Saved ${report.items.length} week_plan_items, materialized ${report.results.length} marks, and created/kept ${report.packChecks.length} pack checks plus ${report.signals.length} signals for the week of 2026-07-20 to 2026-07-26. Hierarchy: linked ${report.hierarchyLinks.linked}, left blank ${report.hierarchyLinks.skipped.length}.`,
          [
            {
              text: "OK",
              onPress: () => pushRoute({ kind: "weeklyTimetable" }),
            },
          ],
        );
      } catch (error) {
        console.error("[WaymarkWeeklyTimetable20260720] Import failed", error);
        Alert.alert(
          locale === "vi" ? "Khong import duoc Weekly Timetable" : "Unable to import Weekly Timetable",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleWeekendHospitalCarePatch20260725 = () => {
    Alert.alert(
      locale === "vi" ? "Patch lich 25-26/07?" : "Patch 07/25-07/26 schedule?",
      locale === "vi"
        ? "Cap nhat rieng thu 7 va chu nhat thanh 6 mark trong bo trong vien. Cac mark cu con pristine se duoc don; mark da chay hoac co history se duoc giu lai va bao skipped."
        : "Update only Saturday and Sunday into six hospital care marks. Old pristine marks are cleaned; marks with history are preserved and reported as skipped.",
      [
        { text: locale === "vi" ? "Huy" : "Cancel", style: "cancel" },
        {
          text: locale === "vi" ? "Patch" : "Patch",
          onPress: () => {
            void (async () => {
              try {
                const report = await importWeekendHospitalCarePatch20260725To0726(app, app.user.id, app.user.timezone);
                refreshLoadedShellData();
                Alert.alert(
                  locale === "vi" ? "Da patch lich weekend" : "Weekend schedule patched",
                  locale === "vi"
                    ? `Da materialize ${report.results.length} marks cho 25-26/07 va tao/cap nhat ${report.signals.length} signals cham bo. Da don ${report.cleanup.removedWeekPlanItemIds.length} week items, ${report.cleanup.removedMarkIds.length} marks cu, ${report.cleanup.removedPackCheckInstanceIds.length} pack checks cu; skipped ${report.cleanup.skipped.length} item co history.`
                    : `Materialized ${report.results.length} marks for 07/25-07/26 and created/kept ${report.signals.length} father-care signals. Cleaned ${report.cleanup.removedWeekPlanItemIds.length} week items, ${report.cleanup.removedMarkIds.length} old marks, ${report.cleanup.removedPackCheckInstanceIds.length} old pack checks; skipped ${report.cleanup.skipped.length} items with history.`,
                  [
                    {
                      text: "OK",
                      onPress: () => pushRoute({ kind: "weeklyTimetable" }),
                    },
                  ],
                );
              } catch (error) {
                console.error("[WaymarkWeekendHospitalCarePatch20260725] Import failed", error);
                Alert.alert(
                  locale === "vi" ? "Khong patch duoc lich weekend" : "Unable to patch weekend schedule",
                  error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const handleImportWeeklyTimetable20260727 = () => {
    void (async () => {
      try {
        const report = await importWeeklyTimetable20260727To0802(app, app.user.id, app.user.timezone);
        refreshLoadedShellData();
        Alert.alert(
          locale === "vi" ? "Da import Weekly Timetable" : "Weekly Timetable imported",
          locale === "vi"
            ? `Da luu ${report.items.length} week_plan_items, materialize ${report.results.length} marks, tao/cap nhat ${report.packChecks.length} pack checks va ${report.signals.length} signals cho tuan 2026-07-27 den 2026-08-02. Hierarchy: link ${report.hierarchyLinks.linked}, bo trong ${report.hierarchyLinks.skipped.length}.`
            : `Saved ${report.items.length} week_plan_items, materialized ${report.results.length} marks, and created/kept ${report.packChecks.length} pack checks plus ${report.signals.length} signals for the week of 2026-07-27 to 2026-08-02. Hierarchy: linked ${report.hierarchyLinks.linked}, left blank ${report.hierarchyLinks.skipped.length}.`,
          [
            {
              text: "OK",
              onPress: () => pushRoute({ kind: "weeklyTimetable" }),
            },
          ],
        );
      } catch (error) {
        console.error("[WaymarkWeeklyTimetable20260727] Import failed", error);
        Alert.alert(
          locale === "vi" ? "Khong import duoc Weekly Timetable" : "Unable to import Weekly Timetable",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleImportWeeklyTimetable20260803 = () => {
    void (async () => {
      try {
        const report = await importWeeklyTimetable20260803To0809(app, app.user.id, app.user.timezone);
        refreshLoadedShellData();
        Alert.alert(
          locale === "vi" ? "Da import Weekly Timetable" : "Weekly Timetable imported",
          locale === "vi"
            ? `Da luu ${report.items.length} week_plan_items, materialize ${report.results.length} marks, tao/cap nhat ${report.packChecks.length} pack checks va ${report.signals.length} signals cho tuan 2026-08-03 den 2026-08-09. Hierarchy: link ${report.hierarchyLinks.linked}, bo trong ${report.hierarchyLinks.skipped.length}.`
            : `Saved ${report.items.length} week_plan_items, materialized ${report.results.length} marks, and created/kept ${report.packChecks.length} pack checks plus ${report.signals.length} signals for the week of 2026-08-03 to 2026-08-09. Hierarchy: linked ${report.hierarchyLinks.linked}, left blank ${report.hierarchyLinks.skipped.length}.`,
          [
            {
              text: "OK",
              onPress: () => pushRoute({ kind: "weeklyTimetable" }),
            },
          ],
        );
      } catch (error) {
        console.error("[WaymarkWeeklyTimetable20260803] Import failed", error);
        Alert.alert(
          locale === "vi" ? "Khong import duoc Weekly Timetable" : "Unable to import Weekly Timetable",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleRepairWorkoutDatabase = () => {
    Alert.alert(
      locale === "vi" ? "Cap nhat DB Workout A/B?" : "Update Workout A/B database?",
      locale === "vi"
        ? "Ghi lai routine Day A va Day B theo cau hinh 4 bai hien tai. Lich su workout da hoan thanh duoc giu nguyen; reset buoi tap hien tai sau khi cap nhat de tao lai danh sach bai."
        : "Rewrite the Day A and Day B routines from the current four-exercise configuration. Completed workout history is preserved; reset the current session afterward to rebuild its exercise list.",
      [
        { text: locale === "vi" ? "Huy" : "Cancel", style: "cancel" },
        {
          text: locale === "vi" ? "Cap nhat" : "Update",
          onPress: () => {
            void (async () => {
              try {
                const report = await repairWorkoutDatabase(app.repositories, app.user.id);
                refreshLoadedShellData();
                Alert.alert(
                  locale === "vi" ? "Da cap nhat DB Workout" : "Workout database updated",
                  locale === "vi"
                    ? `Da repair ${report.repaired.length} routine Workout A/B. Hay mo buoi tap hien tai va chon Reset workout de tao lai snapshot theo danh sach 4 bai.`
                    : `Repaired ${report.repaired.length} Workout A/B routines. Open the current workout and choose Reset workout to rebuild its snapshot from the four-exercise list.`,
                );
              } catch (error) {
                console.error("[WaymarkWorkoutDatabaseRepair] Repair failed", error);
                Alert.alert(
                  locale === "vi" ? "Khong cap nhat duoc DB Workout" : "Unable to update workout database",
                  error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const handleImportBreakfastMarks20260713 = () => {
    void (async () => {
      try {
        const report = await importBreakfastMarks20260713To0719(app.repositories, app.user.id);
        refreshLoadedShellData();
        Alert.alert(
          locale === "vi" ? "Da import 7 mark bua sang" : "Breakfast marks imported",
          locale === "vi"
            ? `Da tao ${report.created.length}/${report.totalRequested} marks. Bo qua ${report.skippedExisting.length} marks da ton tai cung ngay/cung tieu de.`
            : `Created ${report.created.length}/${report.totalRequested} marks. Skipped ${report.skippedExisting.length} existing same-day/same-title marks.`,
          [
            {
              text: "OK",
              onPress: () => pushRoute({ kind: "weeklyTimetable" }),
            },
          ],
        );
      } catch (error) {
        console.error("[WaymarkBreakfastMarks20260713] Import failed", error);
        Alert.alert(
          locale === "vi" ? "Khong import duoc mark bua sang" : "Unable to import breakfast marks",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleClearSignalDatabase = () => {
    Alert.alert(
      locale === "vi" ? "Xoa Signal database?" : "Clear Signal database?",
      locale === "vi"
        ? "Thao tac nay se xoa signals va metadata runtime cua signal. Planned Marks va Pack Checks duoc giu nguyen."
        : "This removes signals and signal runtime metadata. Planned Marks and Pack Checks stay intact.",
      [
        {
          text: locale === "vi" ? "Huy" : "Cancel",
          style: "cancel",
        },
        {
          text: locale === "vi" ? "Xoa signals" : "Clear signals",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                const unresolved = await app.repositories.signals.listSignalsByStatus([
                  SignalStatus.Scheduled,
                  SignalStatus.Ringing,
                  SignalStatus.Snoozed,
                ]);
                for (const signal of unresolved.items) {
                  try {
                    await app.signalEngine.cancelSignal({ signalId: signal.id });
                  } catch (error) {
                    console.warn("[WaymarkSignals] Unable to cancel signal before clearing", signal.id, error);
                  }
                }

                const result = await clearWaymarkSignalsAsync(app.user.id);
                refreshLoadedShellData();
                Alert.alert(
                  locale === "vi" ? "Da xoa Signal database" : "Signal database cleared",
                  locale === "vi"
                    ? `Da xoa ${result.deletedSignals} signals, ${result.deletedSignalRuntimeSettings} signal runtime settings, va ${result.deletedSignalConfigs} signal configs.`
                    : `Removed ${result.deletedSignals} signals, ${result.deletedSignalRuntimeSettings} signal runtime settings, and ${result.deletedSignalConfigs} signal configs.`,
                );
              } catch (error) {
                console.error("[WaymarkSignals] Clear failed", error);
                Alert.alert(
                  locale === "vi" ? "Khong xoa duoc signals" : "Unable to clear signals",
                  error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const handleOpenTursoLinkModal = () => {
    setTursoLinkUrl("");
    setTursoLinkToken("");
    setTursoLinkModalOpen(true);
  };

  const handleImportGolfProgramDevMarks = () => {
    void (async () => {
      try {
        const report = await importGolfProgramDevMarks(app, app.user.id);
        refreshLoadedShellData();
        Alert.alert(
          locale === "vi" ? "Da import Golf Program dev marks" : "Golf Program dev marks imported",
          locale === "vi"
            ? `Da tao/cap nhat ${report.results.length} marks test Golf Program: ${report.importedTitles.join(", ")}.`
            : `Created/updated ${report.results.length} Golf Program test marks: ${report.importedTitles.join(", ")}.`,
        );
      } catch (error) {
        console.error("[GolfProgramDevImport] Import failed", error);
        Alert.alert(
          locale === "vi" ? "Khong import duoc Golf Program dev marks" : "Unable to import Golf Program dev marks",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleSubmitTursoLink = () => {
    void (async () => {
      const linked = await tursoDevSync.linkTurso({
        url: tursoLinkUrl,
        authToken: tursoLinkToken,
      });
      if (linked) {
        setTursoLinkModalOpen(false);
        setTursoLinkUrl("");
        setTursoLinkToken("");
      }
      Alert.alert(
        linked
          ? locale === "vi"
            ? "Da link Turso"
            : "Turso linked"
          : locale === "vi"
            ? "Khong link duoc Turso"
            : "Unable to link Turso",
        tursoDevSync.lastMessage ??
          (linked
            ? locale === "vi"
              ? "Waymark da ket noi voi Turso tren thiet bi nay."
              : "Waymark is connected to Turso on this device."
            : locale === "vi"
              ? "Kiem tra lai database URL va auth token."
              : "Check the database URL and auth token."),
      );
    })();
  };

  const handleUnlinkTurso = () => {
    Alert.alert(
      locale === "vi" ? "Bo link Turso?" : "Unlink Turso?",
      locale === "vi"
        ? "Thao tac nay chi xoa URL/token da luu tren thiet bi. Du lieu local va Turso khong bi xoa."
        : "This only removes the saved URL/token on this device. Local and Turso data are not deleted.",
      [
        { text: locale === "vi" ? "Huy" : "Cancel", style: "cancel" },
        {
          text: locale === "vi" ? "Bo link" : "Unlink",
          style: "destructive",
          onPress: () => {
            void tursoDevSync.unlinkTurso();
          },
        },
      ],
    );
  };

  const handleTursoManualUpload = () => {
    void (async () => {
      const result = await tursoDevSync.runEodUpload();
      Alert.alert(
        locale === "vi" ? "Turso EOD Full-DB" : "Turso EOD Full-DB",
        tursoDevSync.lastMessage ??
          (result
            ? locale === "vi"
              ? `Da day ${result.uploaded}/${result.attempted} mutation, ${result.duplicates} trung lap, ${result.rejected} bi tu choi, ${result.failed.length} loi.`
              : `Uploaded ${result.uploaded}/${result.attempted} mutations, ${result.duplicates} duplicates, ${result.rejected} rejected, ${result.failed.length} failed.`
            : locale === "vi"
              ? "Khong chay duoc Turso upload."
              : "Turso upload did not run."),
      );
    })();
  };

  const handleTursoPullRemoteEdits = () => {
    void (async () => {
      const result = await tursoDevSync.pullRemoteEdits();
      refreshLoadedShellData();
      const message = tursoDevSync.getLastMessage();
      Alert.alert(
        locale === "vi" ? "Turso Full-DB pull" : "Turso Full-DB pull",
        result
          ? message ?? (locale === "vi" ? "Full-DB pull va reconciliation da hoan tat." : "Full-DB pull and reconciliation completed.")
          : message ?? (locale === "vi" ? "Khong pull duoc Turso edits." : "Unable to pull Turso edits."),
      );
    })();
  };

  const handleTursoPullMarks = () => {
    void (async () => {
      const result = await tursoDevSync.pullAllMarkInstances();
      refreshLoadedShellData();
      const message = tursoDevSync.getLastMessage();
      Alert.alert(
        locale === "vi" ? "Pull all Marks" : "Pull all Marks",
        result
          ? locale === "vi"
            ? `Fetched ${result.fetched}, inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped}, conflicts ${result.conflicts}, trail days ${result.affectedTrailDays}.`
            : `Fetched ${result.fetched}, inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped}, conflicts ${result.conflicts}, trail days ${result.affectedTrailDays}.`
          : message ?? (locale === "vi" ? "Khong pull duoc Marks." : "Unable to pull Marks."),
      );
    })();
  };

  const handleTursoPullTrailDays = () => {
    void (async () => {
      const result = await tursoDevSync.pullAllTrailDays();
      refreshLoadedShellData();
      const message = tursoDevSync.getLastMessage();
      Alert.alert(
        "Pull all Trail Days",
        result
          ? `Fetched ${result.fetched}, inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped}, conflicts ${result.conflicts}.`
          : message ?? (locale === "vi" ? "Khong pull duoc Trail Days." : "Unable to pull Trail Days."),
      );
    })();
  };

  const handleTursoPullHierarchyProjection = () => {
    void (async () => {
      const result = await tursoDevSync.pullHierarchyProjection();
      refreshLoadedShellData();
      const message = tursoDevSync.getLastMessage();
      Alert.alert(
        locale === "vi" ? "Pull hierarchy planning" : "Pull hierarchy planning",
        result
          ? locale === "vi"
            ? `Paths ${result.byEntityType.path}, expeditions ${result.byEntityType.expedition}, milestones ${result.byEntityType.milestone}. Fetched ${result.fetched}, applied ${result.applied}, cursor ${result.fromChangeSequence}->${result.throughChangeSequence}.`
            : `Paths ${result.byEntityType.path}, expeditions ${result.byEntityType.expedition}, milestones ${result.byEntityType.milestone}. Fetched ${result.fetched}, applied ${result.applied}, cursor ${result.fromChangeSequence}->${result.throughChangeSequence}.`
          : message ?? (locale === "vi" ? "Khong pull duoc hierarchy planning." : "Unable to pull hierarchy planning."),
      );
    })();
  };

  const handleClearLocalProgressMapForTursoPull = () => {
    Alert.alert(
      locale === "vi" ? "Xoa local Expedition/Milestone/Mark?" : "Clear local Expedition/Milestone/Mark?",
      locale === "vi"
        ? "Dev only: hard-delete local expeditions, milestones, marks va cac row phu dang tham chieu mark. Turso khong bi xoa. Hay upload/export truoc neu can backup."
        : "Dev only: hard-delete local expeditions, milestones, marks, and child rows that reference marks. Turso is not touched. Export/upload first if you need a backup.",
      [
        { text: locale === "vi" ? "Huy" : "Cancel", style: "cancel" },
        {
          text: locale === "vi" ? "Xoa local" : "Clear local",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                const report = await clearLocalProgressMapForTursoPull();
                refreshLoadedShellData();
                Alert.alert(
                  locale === "vi" ? "Da xoa local progress map" : "Local progress map cleared",
                  locale === "vi"
                    ? `Deleted ${report.markInstances} marks, ${report.milestones} milestones, ${report.expeditions} expeditions. Cleared ${report.weekPlanItemsUpdated} weekly item links, ${report.dependentSettings} mark-dependent settings, ${report.syncOutboxRows} outbox rows, ${report.planningStateRows} planning state rows.`
                    : `Deleted ${report.markInstances} marks, ${report.milestones} milestones, ${report.expeditions} expeditions. Cleared ${report.weekPlanItemsUpdated} weekly item links, ${report.dependentSettings} mark-dependent settings, ${report.syncOutboxRows} outbox rows, ${report.planningStateRows} planning state rows.`,
                );
              } catch (error) {
                Alert.alert(
                  locale === "vi" ? "Khong xoa duoc local progress map" : "Unable to clear local progress map",
                  error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const handleShowSignalAlarmHealth = () => {
    void (async () => {
      try {
        const health = await getWaymarkSignalAlarmHealth();
        Alert.alert(
          locale === "vi" ? "Signal alarm health" : "Signal alarm health",
          [
            `SDK: ${health.sdkInt}`,
            `Notifications: ${health.notificationPermissionGranted ? "granted" : "blocked"}`,
            `Exact alarm: ${health.exactAlarmPermissionGranted ? "granted" : "blocked"}`,
            `Full-screen intent: ${health.fullScreenIntentPermissionGranted ? "granted" : "blocked"}`,
            `Battery optimization ignored: ${health.batteryOptimizationIgnored ? "yes" : "no"}`,
            `Can show full-screen alarm: ${health.canShowFullScreenAlarm ? "yes" : "no"}`,
            `Last action: ${health.lastAction ?? "none"}`,
            `Last alarm id: ${health.lastAlarmId ?? "none"}`,
          ].join("\n"),
        );
      } catch (error) {
        Alert.alert(
          locale === "vi" ? "Khong doc duoc signal alarm health" : "Unable to read signal alarm health",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleScheduleSignalAlarmTest = () => {
    void (async () => {
      try {
        const result = await scheduleWaymarkSignalAlarmTest({
          delayMs: 30_000,
          title: locale === "vi" ? "Waymark dang goi" : "Waymark is calling",
          body: "Workout Readiness Check",
          presentation: {
            signalTitle: "Wake up",
            targetTitle: "Workout Readiness Check",
            targetKind: SignalTargetType.PackCheckInstance,
            targetIconName: "waymark_pack_check_generic",
            bellIconName: "waymark_alarm_bell_emblem",
          },
        });
        const fireAt = new Date(result.fireAt).toLocaleTimeString();
        Alert.alert(
          locale === "vi" ? "Da schedule native test alarm" : "Native test alarm scheduled",
          locale === "vi"
            ? `Alarm se no luc ${fireAt}. Khoa man hinh va doi 30 giay de test full-screen flow.`
            : `Alarm will fire at ${fireAt}. Lock the phone and wait 30 seconds to test the full-screen flow.`,
        );
      } catch (error) {
        Alert.alert(
          locale === "vi" ? "Khong schedule duoc native test alarm" : "Unable to schedule native test alarm",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleCreateTodayMarkSignalTest = () => {
    void (async () => {
      try {
        const localDate = formatLocalDate(new Date(), app.user.timezone);
        const visibleMarks = await app.markEngine.listVisibleMarksForDay(app.user.id, localDate);
        const candidate = visibleMarks.find((mark) =>
          mark.status === MarkInstanceStatus.Planned ||
          mark.status === MarkInstanceStatus.Ready ||
          mark.status === MarkInstanceStatus.Blocked ||
          mark.status === MarkInstanceStatus.Active,
        );

        if (!candidate) {
          Alert.alert(
            locale === "vi" ? "Khong co planned mark de test" : "No planned mark available for testing",
            locale === "vi"
              ? "Hom nay khong co planned mark nao o trang thai co the gan signal."
              : "There is no today's planned mark in a state that can be linked to a signal.",
          );
          return;
        }

        const existingSignals = await app.repositories.signals.listSignalsByTarget(SignalTargetType.MarkInstance, candidate.id);
        const unresolved = existingSignals.find(
          (signal) =>
            signal.status === SignalStatus.Scheduled ||
            signal.status === SignalStatus.Ringing ||
            signal.status === SignalStatus.Snoozed,
        );

        if (unresolved) {
          Alert.alert(
            locale === "vi" ? "Mark nay da co signal" : "This mark already has a signal",
            locale === "vi"
              ? `Planned mark "${candidate.title}" dang co signal unresolved (${unresolved.status}).`
              : `Planned mark "${candidate.title}" already has an unresolved signal (${unresolved.status}).`,
          );
          return;
        }

        const fireAt = new Date(Date.now() + 30_000);
        const signal = await app.signalEngine.createSignal({
          userId: app.user.id,
          targetType: SignalTargetType.MarkInstance,
          targetId: candidate.id,
          scheduledAt: fireAt.toISOString(),
          status: SignalStatus.Scheduled,
        });

        await Promise.all([liveToday.refresh(), journal.refresh()]);

        Alert.alert(
          locale === "vi" ? "Da tao signal cho planned mark" : "Signal created for today's planned mark",
          locale === "vi"
            ? `Signal ${signal.id} da duoc gan vao "${candidate.title}" va se no luc ${fireAt.toLocaleTimeString()}.`
            : `Signal ${signal.id} was linked to "${candidate.title}" and will fire at ${fireAt.toLocaleTimeString()}.`,
        );
      } catch (error) {
        Alert.alert(
          locale === "vi" ? "Khong tao duoc signal test" : "Unable to create test signal",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const createPlannedMarkForDevTest = async (input: {
    pathId: PathId;
    title: string;
    description: string;
    templateTitle?: string;
    scheduledOffsetMinutes?: number;
    durationMinutes?: number;
    localDate?: string;
    startTime?: string;
    endTime?: string;
    generationKey?: string;
    status?: MarkInstanceStatus;
    completedAt?: string;
    skippedAt?: string;
    completionSummary?: string;
    proofNote?: string;
  }) => {
    if (input.generationKey) {
      const existing = await app.repositories.marks.findMarkInstanceByGenerationKey(app.user.id, input.generationKey);
      if (existing) {
        return existing;
      }
    }

    const paths = await app.repositories.paths.listActivePaths(app.user.id);
    const path = paths.find((entry) => mapUiPathId(entry.slug, entry.title) === input.pathId);
    if (!path) {
      throw new Error(`${input.pathId} path is not available.`);
    }

    const now = new Date();
    const localDate = input.localDate ?? formatLocalDate(now, app.user.timezone);
    const scheduledStartAt = input.startTime
      ? new Date(`${localDate}T${input.startTime}:00`)
      : new Date(now.getTime() + (input.scheduledOffsetMinutes ?? 0) * 60_000);
    const scheduledEndAt = input.endTime
      ? new Date(`${localDate}T${input.endTime}:00`)
      : new Date(scheduledStartAt.getTime() + (input.durationMinutes ?? 45) * 60_000);
    const trailDay = await app.repositories.trailDays.getOrCreateTrailDay(app.user.id, localDate);
    const template = input.templateTitle
      ? (await app.repositories.marks.listActiveMarkTemplatesByPath(path.id)).find((item) => item.title === input.templateTitle)
      : undefined;
    if (input.templateTitle && !template) {
      throw new Error(`${input.templateTitle} template is not available.`);
    }

    return app.repositories.marks.createMarkInstance({
      userId: app.user.id,
      pathId: path.id,
      trailDayId: trailDay.id,
      templateId: template?.id,
      title: input.title,
      description: input.description,
      origin: MarkInstanceOrigin.ManualPlan,
      status: input.status ?? MarkInstanceStatus.Planned,
      scheduledStartAt: scheduledStartAt.toISOString(),
      scheduledEndAt: scheduledEndAt.toISOString(),
      dueAt: scheduledEndAt.toISOString(),
      completedAt: input.completedAt,
      skippedAt: input.skippedAt,
      completionSummary: input.completionSummary,
      proofNote: input.proofNote,
      generationKey: input.generationKey,
    });
  };

  const handleCreateWorkoutCoverageTest = () => {
    void (async () => {
      try {
        const dayA1 = await createPlannedMarkForDevTest({
          pathId: "health",
          title: "Workout A1",
          templateTitle: "Workout A1",
          description: "Waymark dev test mark. Open this card and start the Day A1 workout flow.",
          scheduledOffsetMinutes: 0,
        });
        const dayA2 = await createPlannedMarkForDevTest({
          pathId: "health",
          title: "Workout A2",
          templateTitle: "Workout A2",
          description: "Waymark dev test mark. Open this card and start the Day A2 workout flow.",
          scheduledOffsetMinutes: 60,
        });
        const dayB = await createPlannedMarkForDevTest({
          pathId: "health",
          title: "Workout Day B",
          templateTitle: "Workout Day B",
          description: "Waymark dev test mark. Open this card and start the Day B workout flow.",
          scheduledOffsetMinutes: 120,
        });
        const walk = await createPlannedMarkForDevTest({
          pathId: "health",
          title: "Workout Walk",
          templateTitle: "Workout Walk",
          description: "Waymark dev test mark. Open this card and start the Walk workout flow.",
          scheduledOffsetMinutes: 180,
        });
        const putting = await createPlannedMarkForDevTest({
          pathId: "golf",
          title: "Golf Practice - Short Game",
          description: "Waymark dev test mark. Use Golf Craft > Log Golf Practice to test short game logs.",
          scheduledOffsetMinutes: 240,
        });
        const swing = await createPlannedMarkForDevTest({
          pathId: "golf",
          title: "Golf Practice - Swing",
          description: "Waymark dev test mark. Use Golf Craft > Log Golf Practice to test swing logs.",
          scheduledOffsetMinutes: 300,
        });

        await Promise.all([liveToday.refresh(), journal.refresh()]);

        Alert.alert(
          locale === "vi" ? "Da tao planned workout marks" : "Workout test marks created",
          [
            "Created planned marks for:",
            `Day A1: ${dayA1.id}`,
            `Day A2: ${dayA2.id}`,
            `Day B: ${dayB.id}`,
            `Walk: ${walk.id}`,
            `Short Game: ${putting.id}`,
            `Swing: ${swing.id}`,
          ].join("\n"),
        );
      } catch (error) {
        Alert.alert(
          locale === "vi" ? "Khong tao duoc planned workout marks" : "Unable to create workout test marks",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleCreateChippingTestMark = () => {
    void (async () => {
      try {
        const testLocalDate = formatLocalDate(new Date(), app.user.timezone);
        const marks = [];
        for (const [index, item] of DEV_CHIPPING_TEST_MARKS.entries()) {
          marks.push(
            await createPlannedMarkForDevTest({
              pathId: "golf",
              title: item.title,
              description: `Dev test copy of ${item.localDate} ${item.startTime}-${item.endTime}. ${item.description}`,
              localDate: testLocalDate,
              scheduledOffsetMinutes: index * 30,
              durationMinutes: 30,
              generationKey: `dev_chipping_test:${testLocalDate}:${item.localDate}:${index + 1}`,
            }),
          );
        }

        await Promise.all([liveToday.refresh(), journal.refresh()]);

        Alert.alert(
          locale === "vi" ? "Da tao chipping test marks" : "Chipping test marks created",
          locale === "vi"
            ? `Da tao/giu ${marks.length} mark Chipping tren Today ${testLocalDate}. Bam Start Practice tung mark de test set/rep.`
            : `Created/kept ${marks.length} Chipping marks on Today ${testLocalDate}. Tap Start Practice on each mark to test set/rep.`,
        );
      } catch (error) {
        Alert.alert(
          locale === "vi" ? "Khong tao duoc chipping test mark" : "Unable to create chipping test mark",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleCreateDailyJournalTrailTestMarks = () => {
    void (async () => {
      try {
        const todayLocalDate = formatLocalDate(new Date(), app.user.timezone);
        const fixtures = buildDailyJournalTrailTestMarkFixtures(todayLocalDate);
        const marks = [];
        for (const fixture of fixtures) {
          const status = fixture.status ?? MarkInstanceStatus.Completed;
          const resolvedAt = buildLocalDateTimeIso(fixture.localDate, fixture.resolvedTime ?? fixture.completedTime);
          const mark = await createPlannedMarkForDevTest({
            pathId: fixture.pathId,
            title: fixture.title,
            description: fixture.description,
            localDate: fixture.localDate,
            startTime: fixture.startTime,
            endTime: fixture.endTime,
            status,
            completedAt: status === MarkInstanceStatus.Completed ? resolvedAt : undefined,
            skippedAt: status === MarkInstanceStatus.Skipped ? resolvedAt : undefined,
            completionSummary: fixture.completionSummary,
            proofNote: fixture.proofNote,
            generationKey: `dev_daily_journal_trail_test:${fixture.localDate}:${fixture.order}`,
          });
          if (fixture.resolutionKind) {
            await setMarkMetadata(app.repositories.appSettings, app.user.id, {
              markId: mark.id,
              appearsInJournal: true,
              appearsInPathProof: false,
              appearsInToday: false,
              resolutionKind: fixture.resolutionKind,
              characterEffect: fixture.resolutionKind === "not_kept" ? "broken" : "protected",
            });
          }
          marks.push(mark);
        }

        await Promise.all([liveToday.refresh(), journal.refresh()]);
        const greyTestDate = fixtures.find((item) => item.testFocus === "grey")?.localDate ?? todayLocalDate;
        setRouteStack([{ kind: "dailyJournal", dayKey: greyTestDate }]);

        Alert.alert(
          locale === "vi" ? "Da tao Today's trail test" : "Daily Journal trail test created",
          locale === "vi"
            ? `Da tao/giu ${marks.length} mark cho ${new Set(fixtures.map((item) => item.localDate)).size} ngay, gom ngay grey test ${greyTestDate}.`
            : `Created/kept ${marks.length} marks across ${new Set(fixtures.map((item) => item.localDate)).size} days, including grey test day ${greyTestDate}.`,
        );
      } catch (error) {
        Alert.alert(
          locale === "vi" ? "Khong tao duoc trail test" : "Unable to create trail test marks",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const clearTodayDevMarks = async () => {
    const localDate = formatLocalDate(new Date(), app.user.timezone);
    const marks = await app.repositories.marks.listMarkInstancesByDate(app.user.id, localDate);
    for (const mark of marks) {
      await deleteMarkDetail(app, mark.id);
    }
    await Promise.all([liveToday.refresh(), journal.refresh()]);
    return { localDate, count: marks.length };
  };

  const handleCreateDevJournalMemories = () => {
    void (async () => {
      try {
        const result = await importDevJournalMemoriesFromExportFixture({
          repositories: app.repositories,
          user: app.user,
        });
        await Promise.all([liveToday.refresh(), journal.refresh()]);
        setRouteStack([{ kind: "journal" }]);
        Alert.alert(
          locale === "vi" ? "Da tao memories test" : "Dev memories created",
          locale === "vi"
            ? `Today ${result.localDate}: tao ${result.createdMemories} memory, bo qua ${result.skippedMemories}, tao ${result.createdMediaAssets} media asset, sua ${result.repairedMediaAssets} media asset.`
            : `Today ${result.localDate}: created ${result.createdMemories} memories, skipped ${result.skippedMemories}, created ${result.createdMediaAssets} media assets, repaired ${result.repairedMediaAssets} media assets.`,
        );
      } catch (error) {
        Alert.alert(
          locale === "vi" ? "Khong tao duoc memories test" : "Unable to create dev memories",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleClearTodayDevMarks = () => {
    Alert.alert(
      locale === "vi" ? "Clear today marks?" : "Clear today's marks?",
      locale === "vi"
        ? "Dev tool nay se an/toi thieu hoa tat ca mark cua Today hien tai de tao san test sach."
        : "This dev tool will soft-delete all marks on the current Today so you can start with a clean test surface.",
      [
        { text: locale === "vi" ? "Huy" : "Cancel", style: "cancel" },
        {
          text: locale === "vi" ? "Clear today" : "Clear today",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                const result = await clearTodayDevMarks();
                Alert.alert(
                  locale === "vi" ? "Da clear Today" : "Today cleared",
                  locale === "vi"
                    ? `Da an ${result.count} mark cua Today ${result.localDate}.`
                    : `Soft-deleted ${result.count} marks from Today ${result.localDate}.`,
                );
              } catch (error) {
                Alert.alert(
                  locale === "vi" ? "Khong clear duoc Today" : "Unable to clear Today",
                  error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const handleCancelSignalAlarmTest = () => {
    void (async () => {
      try {
        await cancelWaymarkSignalAlarmTest();
        Alert.alert(
          locale === "vi" ? "Da huy native test alarm" : "Native test alarm cancelled",
          locale === "vi" ? "Signal alarm test da duoc huy." : "The signal alarm test has been cancelled.",
        );
      } catch (error) {
        Alert.alert(
          locale === "vi" ? "Khong huy duoc native test alarm" : "Unable to cancel native test alarm",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleOpenSignalAlarmNotificationSettings = () => {
    void openWaymarkAlarmNotificationSettings().catch((error) => {
      Alert.alert(
        locale === "vi" ? "Khong mo duoc notification settings" : "Unable to open notification settings",
        error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
      );
    });
  };

  const handleOpenSignalAlarmExactSettings = () => {
    void openWaymarkExactAlarmSettings().catch((error) => {
      Alert.alert(
        locale === "vi" ? "Khong mo duoc exact alarm settings" : "Unable to open exact alarm settings",
        error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
      );
    });
  };

  const handleOpenSignalAlarmFullScreenSettings = () => {
    void openWaymarkFullScreenIntentSettings().catch((error) => {
      Alert.alert(
        locale === "vi" ? "Khong mo duoc full-screen intent settings" : "Unable to open full-screen intent settings",
        error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
      );
    });
  };

  const pushRoute = (nextRoute: AppRoute) => setRouteStack((current) => [...current, nextRoute]);
  const replaceRoute = (nextRoute: AppRoute) =>
    setRouteStack((current) => (current.length > 0 ? [...current.slice(0, -1), nextRoute] : [nextRoute]));
  const popRoute = () => setRouteStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  const jumpToTab = (tab: Exclude<BottomTabId, "capture">) => {
    if (tab !== "journal") {
      pendingJournalDriveLoginRef.current = false;
      setRouteStack([{ kind: tab }]);
      return;
    }

    googleDriveDevUpload.recordDebugEvent("journal_tab_drive_auth_check", {
      connected: googleDriveDevUpload.connected,
      disabled: googleDriveDevUpload.disabled,
      status: googleDriveDevUpload.status,
    });

    setRouteStack([{ kind: tab }]);
  };

  useEffect(() => {
    if (!pendingJournalDriveLoginRef.current || !googleDriveDevUpload.connected) {
      return;
    }

    pendingJournalDriveLoginRef.current = false;
    googleDriveDevUpload.recordDebugEvent("journal_tab_drive_auth_connected");
    setRouteStack([{ kind: "journal" }]);
    journal.refresh();
  }, [googleDriveDevUpload, journal]);

  useEffect(() => {
    let active = true;

    const handleUrl = async (url: string) => {
      if (handledDeepLinkUrlRef.current === url) {
        return;
      }

      try {
        const parsed = new URL(url);
        const target = parsed.host || parsed.pathname.replace(/^\//, "");
        if (target === "oauthredirect") {
          handledDeepLinkUrlRef.current = url;
          googleDriveDevUpload.recordOAuthCallbackUrl(url);
          return;
        }

        if (target !== "alarm-test") {
          if (target !== "signal-alarm") {
            return;
          }

          const signalId = parsed.searchParams.get("alarmId");
          if (!signalId) {
            return;
          }

          handledDeepLinkUrlRef.current = url;

          const signal = await app.repositories.signals.getSignalById(signalId);
          if (!signal) {
            Alert.alert(
              locale === "vi" ? "Signal khong con ton tai" : "Signal is no longer available",
              locale === "vi"
                ? "Signal nay da bien mat truoc khi app mo duoc native alarm."
                : "This signal disappeared before the app could open the native alarm.",
            );
            return;
          }

          const action = parsed.searchParams.get("action") ?? "open";
          const actionIdentifier =
            action === "snooze"
              ? WAYMARK_SIGNAL_ACTION_SNOOZE_5
              : action === "dismiss"
                ? WAYMARK_SIGNAL_ACTION_DISMISS
                : WAYMARK_SIGNAL_ACTION_OPEN;

          await handleSignalResponse(actionIdentifier, {
            signalId: signal.id,
            targetId: signal.targetId,
            targetType: signal.targetType,
          });
          return;
        }

        handledDeepLinkUrlRef.current = url;
        jumpToTab("me");
        const action = parsed.searchParams.get("action") ?? "open";
        Alert.alert(
          locale === "vi" ? "Native signal alarm action" : "Native signal alarm action",
          locale === "vi"
            ? `App da duoc mo tu native alarm voi action "${action}".`
            : `The app was opened from the native alarm with action "${action}".`,
        );
      } catch (error) {
        console.warn("[WaymarkSignalAlarm] Failed to parse URL", url, error);
      }
    };

    void Linking.getInitialURL().then((url) => {
      if (active && url) {
        void handleUrl(url);
      }
    });

    const subscription = Linking.addEventListener("url", (event) => {
      void handleUrl(event.url);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [app.repositories.signals, googleDriveDevUpload.recordOAuthCallbackUrl, handleSignalResponse, locale]);

  const openDetail = (
    sourceType: DetailSourceType,
    sourceId: string,
    parentTab: Exclude<BottomTabId, "capture"> = "today",
  ) => {
    pushRoute({ kind: "detail", sourceType, sourceId, parentTab });
  };

  const openMarkDetail = (mark: TodayMarkItem | string, parentTab: Exclude<BottomTabId, "capture"> = "today") => {
    const sourceId = typeof mark === "string" ? mark : mark.id;
    openDetail("mark_instance", sourceId, parentTab);
  };

  const openBacklogDetail = (itemId: string, parentTab: Exclude<BottomTabId, "capture"> = "me") => {
    openDetail("backlog_item", itemId, parentTab);
  };

  const openPackCheck = (pack: TodayPackCheckItem) => pushRoute({ kind: "packCheck", packId: pack.id });
  const openSignal = (signalId: string, parentTab: Exclude<BottomTabId, "capture"> = "today") =>
    pushRoute({ kind: "signal", signalId, parentTab });
  const openExpedition = (expeditionId: string, parentTab: Exclude<BottomTabId, "capture"> = "today") =>
    pushRoute({ kind: "expeditionDetail", expeditionId, parentTab });
  const completeWeeklyMilestone = async (milestoneId: string) => {
    await app.repositories.expeditions.updateMilestone(milestoneId, {
      status: MilestoneStatus.Completed,
      completedAt: new Date().toISOString(),
    });
    weeklyMilestones.refresh();
  };
  const skipWeeklyMilestone = async (milestoneId: string) => {
    await app.repositories.expeditions.updateMilestone(milestoneId, {
      status: MilestoneStatus.Archived,
      completedAt: null,
    });
    weeklyMilestones.refresh();
  };
  const moveWeeklyMilestone = async (milestoneId: string) => {
    const milestone = weeklyMilestones.allItems.find((item) => item.id === milestoneId);
    const currentStartDate = milestone?.startDate;
    const currentEndDate = milestone?.endDate ?? formatLocalDate(new Date(), app.user.timezone);
    await app.repositories.expeditions.updateMilestone(milestoneId, {
      status: MilestoneStatus.Active,
      startDate: currentStartDate ? shiftLocalDate(currentStartDate, 7) : undefined,
      targetDate: shiftLocalDate(currentEndDate, 7),
      completedAt: null,
    });
    weeklyMilestones.refresh();
  };
  const openWeeklyMilestoneMark = (
    milestone: WeeklyMilestoneItem,
    mark: WeeklyMilestoneMarkItem,
    parentTab: Exclude<BottomTabId, "capture"> = "paths",
    entryContext: "default" | "weekly_timetable" = "default",
  ) => {
    void milestone;
    void openMarkByStatus(mark.id, parentTab, "execution", entryContext);
  };
  const openDayReviewMark = (mark: TodayMarkItem) => {
    void openMarkByStatus(mark.id, "me", "review", "weekly_timetable");
  };
  const openMarkByStatus = async (
    markId: string,
    parentTab: Exclude<BottomTabId, "capture"> = "paths",
    actionMode: "execution" | "review" = "execution",
    entryContext: "default" | "weekly_timetable" = "default",
  ) => {
    const mark = await app.repositories.marks.getMarkInstanceById(markId);
    if (!mark) {
      Alert.alert(
        locale === "vi" ? "Khong tim thay mark" : "Mark unavailable",
        locale === "vi" ? "Mark nay khong con ton tai trong local database." : "This mark no longer exists in the local database.",
      );
      return;
    }

    const sessionReview = entryContext === "weekly_timetable" ? await resolveWeeklySessionReview(mark) : null;

    if (isMarkFinalStatus(mark.status)) {
      if (sessionReview) {
        pushRoute({ kind: "detail", sourceType: "mark_instance", sourceId: mark.id, parentTab, sessionReview: sessionReview.launch });
      } else {
        openMarkDetail(mark.id, parentTab);
      }
      return;
    }

    const path = await app.repositories.paths.getPathById(mark.pathId);
    const expedition = mark.expeditionId ? await app.repositories.expeditions.getExpeditionById(mark.expeditionId) : null;
    const milestone = expedition && mark.milestoneId
      ? (await app.repositories.expeditions.listMilestonesByExpedition(expedition.id)).find((item) => item.id === mark.milestoneId)
      : undefined;
    const detail = await app.repositories.marks.getMarkInstanceDetail(mark.id);
    const mapped = mapMarkInstanceToActionSheetItem(mark, detail, locale, { path, milestoneTitle: milestone?.title, expeditionTitle: expedition?.title });
    if (sessionReview) {
      mapped.interactionKind = sessionReview.interactionKind;
      mapped.actionSheet = {
        ...mapped.actionSheet,
        launchConfig: sessionReview.launchConfig,
        primaryActionLabel: {
          en: sessionReview.interactionKind === "strength_session" ? "Review Workout" : "Review Golf Session",
          vi: sessionReview.interactionKind === "strength_session" ? "Review Workout" : "Review Golf Session",
        },
        primaryActionHint: {
          en: "Open a read-only session review. This does not count toward progress.",
          vi: "Mo session chi de review. Session nay khong duoc tinh vao progress.",
        },
      };
    }
    setSelectedWeeklyMarkActionMode(actionMode);
    setSelectedWeeklyMark(mapped);
  };

  const resolveWeeklySessionReview = async (mark: MarkInstance): Promise<WeeklySessionReviewResolution | null> => {
    const [path, markMetadata, templateMetadata, existingSession] = await Promise.all([
      app.repositories.paths.getPathById(mark.pathId),
      getMarkMetadata(app.repositories.appSettings, app.user.id, mark.id),
      mark.templateId ? getMarkTemplateSeedMetadata(app.repositories.appSettings, app.user.id, mark.templateId) : Promise.resolve(null),
      app.repositories.strength.getSessionByMarkInstance(mark.id),
    ]);
    const pathId = mapUiPathId(path?.slug, path?.title);
    const golfWorkoutType = pathId === "golf" ? resolveGolfPracticeWorkoutTypeForMarkTitle(mark.title) : null;
    if (golfWorkoutType) {
      const launchConfig = await buildGolfPracticeLaunchConfig(app, mark);
      const routineTemplateId = existingSession?.routineTemplateId ?? launchConfig?.defaultOptionId;
      return {
        interactionKind: "golf_practice",
        launchConfig,
        launch: {
          kind: "golf_practice",
          markTitle: mark.title,
          routineTemplateId,
          workoutType: golfWorkoutType,
        },
      };
    }

    if (markMetadata?.blockType !== "workout_block" && templateMetadata?.blockType !== "workout_block") {
      return null;
    }
    const launchConfig = await buildHealthWorkoutLaunchConfig(app, mark);
    return {
      interactionKind: "strength_session",
      launchConfig,
      launch: {
        kind: "strength_session",
        markTitle: mark.title,
        routineTemplateId: existingSession?.routineTemplateId ?? launchConfig?.defaultOptionId,
      },
    };
  };
  const refreshAfterWeeklyMarkMutation = () => {
    refreshLoadedShellData();
  };
  const handleWeeklyMarkAction = async (markId: string, value?: PlannedMarkActionValue) => {
    if (selectedWeeklyMark?.id === markId && selectedWeeklyMark.interactionKind === "strength_session") {
      setSelectedWeeklyMark(null);
      setSelectedWeeklyMarkActionMode("execution");
      pushRoute({ kind: "workoutReview", markId, parentTab: "me", routineTemplateId: value?.routineTemplateId });
      return;
    }
    if (selectedWeeklyMark?.id === markId && selectedWeeklyMark.interactionKind === "golf_practice") {
      const option = value?.routineTemplateId
        ? selectedWeeklyMark.actionSheet?.launchConfig?.options.find((item) => item.routineTemplateId === value.routineTemplateId)
        : undefined;
      const markTitle = option?.title.en ?? selectedWeeklyMark.title.en;
      setSelectedWeeklyMark(null);
      setSelectedWeeklyMarkActionMode("execution");
      pushRoute({
        kind: "golfPractice",
        parentTab: "me",
        markId,
        markTitle,
        routineTemplateId: value?.routineTemplateId,
        workoutType: resolveGolfPracticeWorkoutTypeForMarkTitle(markTitle) ?? "putting",
        mode: "review",
      });
      return;
    }
    await app.markEngine.completeMarkInstance({ markInstanceId: markId });
    refreshAfterWeeklyMarkMutation();
  };
  const handleWeeklyMoveMark = async (markId: string, value: MoveMarkValue) => {
    await app.markEngine.rescheduleMarkInstance({
      markInstanceId: markId,
      targetLocalDate: value.date,
      scheduledStartAt: value.startTime ? buildWaymarkLocalDateTime(value.date, value.startTime) : undefined,
      scheduledEndAt: value.endTime ? buildWaymarkLocalDateTime(value.date, value.endTime) : undefined,
    });
    refreshAfterWeeklyMarkMutation();
  };
  const handleWeeklySkipMark = async (markId: string) => {
    await app.markEngine.skipMarkInstance({ markInstanceId: markId });
    refreshAfterWeeklyMarkMutation();
  };
  const handleWeeklyUpdateMarkNote = async (markId: string, note: string) => {
    const normalizedNote = note.trim();
    await app.repositories.marks.upsertMarkInstanceDetail(markId, {
      preActionComment: normalizedNote || null,
      userEditedAt: new Date().toISOString(),
    });
    refreshAfterWeeklyMarkMutation();
  };
  const openGolfPractice = (
    parentTab: Exclude<BottomTabId, "capture"> = "paths",
    options?: { markId?: string; markTitle?: string; routineTemplateId?: string; workoutType?: "putting" | "swing" },
  ) => {
    pushRoute({ kind: "golfPractice", parentTab, markId: options?.markId, markTitle: options?.markTitle, routineTemplateId: options?.routineTemplateId, workoutType: options?.workoutType });
  };
  const openWeeklySessionReview = (
    markId: string,
    launch: WeeklySessionReviewLaunch,
    parentTab: Exclude<BottomTabId, "capture">,
  ) => {
    if (launch.kind === "strength_session") {
      pushRoute({ kind: "workoutReview", markId, parentTab, routineTemplateId: launch.routineTemplateId });
      return;
    }
    pushRoute({
      kind: "golfPractice",
      parentTab,
      markId,
      markTitle: launch.markTitle,
      routineTemplateId: launch.routineTemplateId,
      workoutType: launch.workoutType ?? "putting",
      mode: "review",
    });
  };
  const refreshTodayCockpitAfterMarkCompletion = async () => {
    await Promise.all([liveToday.refresh(false), journal.refresh()]);
  };
  const handleConfirmDailyPlan = () => {
    if (confirmingDailyPlan) {
      return;
    }
    Alert.alert(
      locale === "vi" ? "Xác nhận kế hoạch hôm nay?" : "Confirm today’s plan?",
      locale === "vi"
        ? "Sau khi xác nhận, Waymark sẽ chuyển Today sang chế độ thực thi và tải lại cockpit ngay."
        : "After confirmation, Waymark will switch Today into execution mode and reload the cockpit immediately.",
      [
        { text: locale === "vi" ? "Hủy" : "Cancel", style: "cancel" },
        {
          text: locale === "vi" ? "Xác nhận" : "Confirm",
          onPress: () => {
            void (async () => {
              setConfirmingDailyPlan(true);
              try {
                await liveToday.confirmDailyPlan();
                await liveToday.refresh(false);
              } catch (error) {
                Alert.alert(
                  locale === "vi" ? "Không thể xác nhận kế hoạch" : "Unable to confirm today’s plan",
                  error instanceof Error ? error.message : locale === "vi" ? "Đã có lỗi xảy ra." : "An unexpected error occurred.",
                );
              } finally {
                setConfirmingDailyPlan(false);
              }
            })();
          },
        },
      ],
    );
  };
  const handleSaveGolfPractice = (input: SaveGolfPracticeLogInput) => {
    if (savingGolfPractice) {
      return;
    }
    void (async () => {
      setSavingGolfPractice(true);
      try {
        await saveGolfPracticeLog(
          app.repositories,
          app.user.id,
          route.kind === "golfPractice" && route.markId
            ? { ...input, markInstanceId: route.markId, routineTemplateId: route.routineTemplateId }
            : input,
        );
        await refreshTodayCockpitAfterMarkCompletion();
      } catch (error) {
        Alert.alert(
          locale === "vi" ? "Khong luu duoc Golf Practice" : "Unable to save Golf Practice",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      } finally {
        setSavingGolfPractice(false);
      }
    })();
  };
  const openStrengthSessionFromMark = (markId: string, parentTab: Exclude<BottomTabId, "capture"> = "today", value?: PlannedMarkActionValue) => {
    if (startingStrengthMarkId === markId) {
      return;
    }
    void (async () => {
      setStartingStrengthMarkId(markId);
      try {
        await app.strengthSessionEngine.startWorkoutSession({ markInstanceId: markId, routineTemplateId: value?.routineTemplateId });
        pushRoute({ kind: "strengthSession", markId, parentTab });
      } catch (error) {
        Alert.alert(
          locale === "vi" ? "Khong mo duoc buoi tap" : "Unable to open workout session",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      } finally {
        setStartingStrengthMarkId((current) => (current === markId ? null : current));
      }
    })();
  };

  const findSignalForMark = (markId: string) => {
    const signalId = liveTodayData?.signalIdByMarkId[markId];
    return signalId ? liveTodayData?.signalsById[signalId] ?? null : null;
  };

  const findSignalForPack = (packId: string) => {
    const signalId = liveTodayData?.signalIdByPackId[packId];
    return signalId ? liveTodayData?.signalsById[signalId] ?? null : null;
  };

  const handleStrengthWeightChange = (setId: string, value: number | null) => {
    if (!resolvedStrengthSession) {
      return;
    }

    setStrengthSessionDraft((current) => updateStrengthSetActualLoad(current ?? resolvedStrengthSession, setId, value));
  };

  const startStrengthExerciseForInteraction = async (sessionId: string, exerciseId: string, mode: "reps_load" | "reps_only" | "timed") => {
    const startedExercise = await app.strengthSessionEngine.startExercise({
      workoutSessionInstanceId: sessionId,
      sessionExerciseSnapshotId: exerciseId,
    });

    if (mode !== "timed" && startedExercise.currentExerciseSnapshotId) {
      await app.strengthSessionEngine.startSet({
        workoutSessionInstanceId: sessionId,
        sessionExerciseSnapshotId: startedExercise.currentExerciseSnapshotId,
        setNumber: 1,
      });
    }
  };

  const enterStrengthCooldownForInteraction = async (sessionId: string, sessionState: StrengthSessionData) => {
    const nextSession = advanceStrengthSession(sessionState, "start_cooldown");
    strengthPendingSyncKeyRef.current = buildStrengthSessionSyncKey(nextSession);
    setStrengthSessionDraft(nextSession);
    await app.strengthSessionEngine.enterCooldown({ workoutSessionInstanceId: sessionId });
  };

  const handleStrengthExercisePress = (exerciseId: string) => {
    if (!strengthReadModel || !resolvedStrengthSession) {
      return;
    }

    const selectedExercise = resolvedStrengthSession.exercises.find((exercise) => exercise.id === exerciseId);
    if (!selectedExercise || selectedExercise.state === "done" || resolvedStrengthSession.phase === "cooldown" || resolvedStrengthSession.phase === "complete") {
      return;
    }

    if (resolvedStrengthSession.activeExerciseId === exerciseId && (selectedExercise.state === "active" || selectedExercise.state === "rest")) {
      return;
    }

    void (async () => {
      try {
        await startStrengthExerciseForInteraction(strengthReadModel.session.id, exerciseId, selectedExercise.mode);
        setStrengthSessionDraft(null);
        strengthSession.refresh();
      } catch (error) {
        Alert.alert(
          locale === "vi" ? "Khong chuyen duoc bai tap" : "Unable to switch exercise",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleStrengthPrimaryAction = (actionType: string) => {
    if (!strengthReadModel || !resolvedStrengthSession) {
      return;
    }

    const sessionId = strengthReadModel.session.id;
    const activeExercise = getActiveExercise(resolvedStrengthSession);
    const currentSet = getCurrentSet(activeExercise);

    void (async () => {
      try {
        switch (actionType) {
          case "complete_strength_set": {
            if (!activeExercise || !currentSet) {
              return;
            }

            const nextSession = advanceStrengthSession(resolvedStrengthSession, "complete_strength_set");
            strengthPendingSyncKeyRef.current = buildStrengthSessionSyncKey(nextSession);
            setStrengthSessionDraft(nextSession);
            const actualLoadKg =
              activeExercise.mode === "reps_load" ? (currentSet.actualLoad ?? currentSet.actualWeight ?? currentSet.targetLoad ?? undefined) : undefined;
            const targetValue = activeExercise.targetValue ?? undefined;
            await app.strengthSessionEngine.completeExerciseSet({
              workoutSessionInstanceId: sessionId,
              sessionExerciseSnapshotId: activeExercise.id,
              setNumber: currentSet.setNumber,
              actualLoadKg,
              actualReps: activeExercise.targetMetric === "reps" ? targetValue : undefined,
              actualDistanceM: activeExercise.targetMetric === "distance_m" ? targetValue : undefined,
              actualSteps: activeExercise.targetMetric === "steps" ? targetValue : undefined,
              completed: true,
            });
            strengthSession.refresh();
            await liveToday.refresh(false);
            return;
          }
          case "start_next_set": {
            const nextSession = advanceStrengthSession(resolvedStrengthSession, "start_next_set");
            strengthPendingSyncKeyRef.current = buildStrengthSessionSyncKey(nextSession);
            setStrengthSessionDraft(nextSession);
            if (strengthReadModel.session.sessionStatus === WorkoutSessionStatus.Resting) {
              await app.strengthSessionEngine.completeRest({ workoutSessionInstanceId: sessionId });
            } else {
              if (!activeExercise) {
                return;
              }
              const nextSet = getNextSet(activeExercise);
              await app.strengthSessionEngine.startSet({
                workoutSessionInstanceId: sessionId,
                sessionExerciseSnapshotId: activeExercise.id,
                setNumber: nextSet?.setNumber,
              });
            }
            strengthSession.refresh();
            return;
          }
          case "next_exercise": {
            if (!activeExercise) {
              return;
            }
            const nextExercise = getNextExercise(resolvedStrengthSession, activeExercise.id);
            if (!nextExercise) {
              return;
            }
            const nextSession = advanceStrengthSession(resolvedStrengthSession, "next_exercise");
            strengthPendingSyncKeyRef.current = buildStrengthSessionSyncKey(nextSession);
            setStrengthSessionDraft(nextSession);
            await startStrengthExerciseForInteraction(sessionId, nextExercise.id, nextExercise.mode);
            strengthSession.refresh();
            return;
          }
          case "complete_timed_set": {
            if (!activeExercise) {
              return;
            }
            const nextSession = advanceStrengthSession(resolvedStrengthSession, "complete_timed_set");
            strengthPendingSyncKeyRef.current = buildStrengthSessionSyncKey(nextSession);
            setStrengthSessionDraft(nextSession);
            await app.strengthSessionEngine.completeExerciseSet({
              workoutSessionInstanceId: sessionId,
              sessionExerciseSnapshotId: activeExercise.id,
              setNumber: 1,
              actualDurationSec: activeExercise.targetMetric === "duration" ? (activeExercise.targetValue ?? undefined) : undefined,
              actualDistanceM: activeExercise.targetMetric === "distance_m" ? (activeExercise.targetValue ?? undefined) : undefined,
              actualSteps: activeExercise.targetMetric === "steps" ? (activeExercise.targetValue ?? undefined) : undefined,
              completed: true,
            });
            strengthSession.refresh();
            await liveToday.refresh(false);
            return;
          }
          case "start_cooldown":
            await enterStrengthCooldownForInteraction(sessionId, resolvedStrengthSession);
            strengthSession.refresh();
            return;
          case "complete_stretch":
          case "start_next_stretch":
            setStrengthSessionDraft((current) => advanceStrengthSession(current ?? resolvedStrengthSession, actionType));
            return;
          case "finish_session":
            await app.strengthSessionEngine.completeCooldown({ workoutSessionInstanceId: sessionId });
            setStrengthSessionDraft(null);
            strengthSession.refresh();
            await refreshTodayCockpitAfterMarkCompletion();
            return;
          case "done":
            setStrengthSessionDraft(null);
            popRoute();
            return;
          default:
            return;
        }
      } catch (error) {
        strengthPendingSyncKeyRef.current = null;
        setStrengthSessionDraft(null);
        Alert.alert(
          locale === "vi" ? "Khong cap nhat duoc buoi tap" : "Unable to update workout session",
          error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleEndStrengthSession = () => {
    if (!strengthReadModel) {
      popRoute();
      return;
    }

    Alert.alert(
      locale === "vi" ? "Ket thuc buoi tap?" : "End workout session?",
      locale === "vi"
        ? "Neu 2 bai dau da hoan thanh, buoi tap se la Hoan thanh mot phan; neu chua, buoi tap se bi bo do."
        : "If the first two exercises are complete, this session becomes Partial Complete; otherwise it will be abandoned.",
      [
        { text: locale === "vi" ? "Huy" : "Cancel", style: "cancel" },
        {
          text: locale === "vi" ? "Ket thuc" : "End session",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await app.strengthSessionEngine.endWorkoutSession({ workoutSessionInstanceId: strengthReadModel.session.id });
                setStrengthSessionDraft(null);
                strengthSession.refresh();
                await refreshTodayCockpitAfterMarkCompletion();
                popRoute();
              } catch (error) {
                Alert.alert(
                  locale === "vi" ? "Khong ket thuc duoc buoi tap" : "Unable to end workout session",
                  error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const handleResetStrengthSession = () => {
    if (!strengthReadModel) {
      return;
    }

    Alert.alert(
      locale === "vi" ? "Reset buoi tap?" : "Reset workout session?",
      locale === "vi"
        ? "Toan bo tien do hien tai cua buoi tap nay se duoc lam moi va bat dau lai tu dau."
        : "The current progress for this workout session will be cleared and rebuilt from the start.",
      [
        { text: locale === "vi" ? "Huy" : "Cancel", style: "cancel" },
        {
          text: locale === "vi" ? "Reset" : "Reset",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await app.strengthSessionEngine.resetWorkoutSession({ workoutSessionInstanceId: strengthReadModel.session.id });
                const restarted = await app.strengthSessionEngine.startWorkoutSession({ markInstanceId: strengthReadModel.session.markInstanceId });
                const restartedReadModel = await loadStrengthSessionReadModel(app, strengthReadModel.session.markInstanceId, locale);
                const firstExercise =
                  restartedReadModel.status === "ready" ? restartedReadModel.uiSession.exercises[0] : undefined;
                if (firstExercise) {
                  await startStrengthExerciseForInteraction(restarted.id, firstExercise.id, firstExercise.mode);
                }
                strengthAutoPrepKeyRef.current = `${restarted.id}:${WorkoutSessionStatus.ExerciseActive}:manual-reset:exercise`;
                setStrengthSessionDraft(null);
                strengthSession.refresh();
                await liveToday.refresh(false);
              } catch (error) {
                Alert.alert(
                  locale === "vi" ? "Khong reset duoc buoi tap" : "Unable to reset workout session",
                  error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const showHealthEngineError = (error: unknown) => {
    Alert.alert(
      locale === "vi" ? "Health engine test loi" : "Health engine test failed",
      error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
    );
  };

  const refreshStrengthEngineSurfaces = async () => {
    setStrengthSessionDraft(null);
    strengthPendingSyncKeyRef.current = null;
    strengthSession.refresh();
    await refreshTodayCockpitAfterMarkCompletion();
  };

  const completeStrengthExerciseForTest = async (sessionId: string, exercise: StrengthExercise) => {
    if (exercise.state === "done") {
      return;
    }

    if (exercise.state === "rest") {
      await app.strengthSessionEngine.completeRest({ workoutSessionInstanceId: sessionId });
    }

    if (exercise.state !== "active" && exercise.state !== "rest") {
      await app.strengthSessionEngine.startExercise({
        workoutSessionInstanceId: sessionId,
        sessionExerciseSnapshotId: exercise.id,
      });
    }

    if (exercise.mode === "timed") {
      await app.strengthSessionEngine.completeExerciseSet({
        workoutSessionInstanceId: sessionId,
        sessionExerciseSnapshotId: exercise.id,
        setNumber: 1,
        actualDurationSec: exercise.targetMetric === "duration" ? (exercise.targetValue ?? undefined) : undefined,
        actualDistanceM: exercise.targetMetric === "distance_m" ? (exercise.targetValue ?? undefined) : undefined,
        actualSteps: exercise.targetMetric === "steps" ? (exercise.targetValue ?? undefined) : undefined,
        completed: true,
      });
      return;
    }

    const sets = exercise.sets ?? [];
    for (let index = 0; index < sets.length; index += 1) {
      const set = sets[index];
      if (set.state === "done") {
        continue;
      }

      await app.strengthSessionEngine.startSet({
        workoutSessionInstanceId: sessionId,
        sessionExerciseSnapshotId: exercise.id,
        setNumber: set.setNumber,
      });

      await app.strengthSessionEngine.completeExerciseSet({
        workoutSessionInstanceId: sessionId,
        sessionExerciseSnapshotId: exercise.id,
        setNumber: set.setNumber,
        actualLoadKg: exercise.mode === "reps_load" ? (set.actualLoad ?? set.actualWeight ?? set.targetLoad ?? undefined) : undefined,
        actualReps: exercise.targetMetric === "reps" ? (exercise.targetValue ?? undefined) : undefined,
        completed: true,
      });

      const hasMoreSets = sets.slice(index + 1).some((nextSet) => nextSet.state !== "done");
      if (hasMoreSets) {
        await app.strengthSessionEngine.completeRest({ workoutSessionInstanceId: sessionId });
      }
    }
  };

  const handleHealthEngineTestStartNextExercise = () => {
    if (!strengthReadModel || !resolvedStrengthSession) {
      return;
    }

        const targetExercise = resolvedStrengthSession.exercises.find((exercise) => exercise.state === "upcoming");
    if (!targetExercise) {
      return;
    }

    void (async () => {
      try {
        await startStrengthExerciseForInteraction(strengthReadModel.session.id, targetExercise.id, targetExercise.mode);
        await refreshStrengthEngineSurfaces();
      } catch (error) {
        showHealthEngineError(error);
      }
    })();
  };

  const handleHealthEngineTestCompleteStrength = () => {
    if (!strengthReadModel || !resolvedStrengthSession) {
      return;
    }

    void (async () => {
      try {
        const sessionId = strengthReadModel.session.id;
        for (const exercise of resolvedStrengthSession.exercises) {
          await completeStrengthExerciseForTest(sessionId, exercise);
        }
        await refreshStrengthEngineSurfaces();
      } catch (error) {
        showHealthEngineError(error);
      }
    })();
  };

  const handleHealthEngineTestEnterCooldown = () => {
    if (!strengthReadModel || !resolvedStrengthSession) {
      return;
    }

    void (async () => {
      try {
        await enterStrengthCooldownForInteraction(strengthReadModel.session.id, resolvedStrengthSession);
        await refreshStrengthEngineSurfaces();
      } catch (error) {
        showHealthEngineError(error);
      }
    })();
  };

  const handleHealthEngineTestFinishCooldown = () => {
    if (!strengthReadModel) {
      return;
    }

    void (async () => {
      try {
        await app.strengthSessionEngine.completeCooldown({ workoutSessionInstanceId: strengthReadModel.session.id });
        await refreshStrengthEngineSurfaces();
      } catch (error) {
        showHealthEngineError(error);
      }
    })();
  };

  const handleHealthEngineTestAbandon = () => {
    if (!strengthReadModel) {
      return;
    }

    void (async () => {
      try {
        await app.strengthSessionEngine.abandonWorkoutSession({
          workoutSessionInstanceId: strengthReadModel.session.id,
          note: "Health engine dev test",
        });
        await refreshStrengthEngineSurfaces();
        popRoute();
      } catch (error) {
        showHealthEngineError(error);
      }
    })();
  };

  const buildHealthEngineDebugActions = (): StrengthSessionDebugAction[] | undefined => {
    if (!__DEV__ || !strengthReadModel || !resolvedStrengthSession) {
      return undefined;
    }

    const primaryAction = getStrengthSessionPrimaryAction(resolvedStrengthSession);
    const isFinalSession =
      strengthReadModel.session.sessionStatus === WorkoutSessionStatus.Completed ||
      strengthReadModel.session.sessionStatus === WorkoutSessionStatus.PartiallyCompleted ||
      strengthReadModel.session.sessionStatus === WorkoutSessionStatus.Abandoned;
    const canUseMainFlow =
      !isFinalSession &&
      resolvedStrengthSession.phase !== "cooldown" &&
      resolvedStrengthSession.phase !== "complete";
    const hasUpcomingExercise = resolvedStrengthSession.exercises.some(
      (exercise) => exercise.state === "upcoming",
    );

    return [
      {
        id: "health-engine-debug-start-next",
        label: "Start next",
        disabled: !canUseMainFlow || !hasUpcomingExercise,
        onPress: handleHealthEngineTestStartNextExercise,
      },
      {
        id: "health-engine-debug-primary",
        label: "Step primary",
        disabled: isFinalSession || primaryAction.disabled,
        onPress: () => handleStrengthPrimaryAction(primaryAction.actionType),
      },
      {
        id: "health-engine-debug-complete-strength",
        label: "Complete strength",
        disabled: !canUseMainFlow || resolvedStrengthSession.strengthComplete,
        onPress: handleHealthEngineTestCompleteStrength,
      },
      {
        id: "health-engine-debug-enter-cooldown",
        label: "Enter cooldown",
        disabled: isFinalSession || !resolvedStrengthSession.strengthComplete || resolvedStrengthSession.cooldownStarted,
        onPress: handleHealthEngineTestEnterCooldown,
      },
      {
        id: "health-engine-debug-finish-cooldown",
        label: "Finish cooldown",
        disabled: isFinalSession || !resolvedStrengthSession.cooldownStarted,
        onPress: handleHealthEngineTestFinishCooldown,
      },
      {
        id: "health-engine-debug-reset",
        label: "Reset",
        disabled: false,
        onPress: handleResetStrengthSession,
      },
      {
        id: "health-engine-debug-abandon",
        label: "Abandon",
        disabled: isFinalSession,
        onPress: handleHealthEngineTestAbandon,
      },
    ];
  };

  const handleCaptureDestination = (
    destination: "mark" | "memory" | "backlog",
    noteTitle: string,
    noteDetail: string,
    pathId: PathId,
    mediaAttachments: CaptureMediaAttachment[],
  ) => {
    if (destination === "memory") {
      void (async () => {
        try {
          await journal.createMemory(noteTitle, noteDetail, pathId, mediaAttachments);
          liveToday.refresh();
          jumpToTab("journal");
        } catch (error) {
          Alert.alert(
            locale === "vi" ? "Khong luu duoc ky uc" : "Unable to save memory",
            error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
          );
        }
      })();
      return;
    }

    if (destination === "backlog") {
      void (async () => {
        try {
          await backlog.createCapturedBacklogItem(noteTitle, noteDetail, pathId, mediaAttachments);
          setRouteStack([{ kind: "me" }, { kind: "backlog" }]);
        } catch (error) {
          Alert.alert(
            locale === "vi" ? "Khong luu duoc backlog" : "Unable to save backlog item",
            error instanceof Error ? error.message : locale === "vi" ? "Da co loi xay ra." : "An unexpected error occurred.",
          );
        }
      })();
      return;
    }

    void (async () => {
      const markId = await capture.createQuickCaptureMark(noteTitle, noteDetail, pathId, mediaAttachments);
      if (!markId) {
        Alert.alert(locale === "vi" ? "Path chua san sang" : "Path is not ready yet");
        return;
      }
      liveToday.refresh();
      journal.refresh();
      openDetail("mark_instance", markId, "today");
    })();
  };

  const handleMarkAction = async (markId: string, value?: PlannedMarkActionValue) => {
    const mark = todayMarks.find((item) => item.id === markId);
    if (mark?.interactionKind === "strength_session") {
      setSelectedTodayMark(null);
      openStrengthSessionFromMark(markId, "today", value);
      return;
    }
    if (mark?.interactionKind === "golf_practice") {
      const selectedOption = value?.routineTemplateId
        ? mark.actionSheet?.launchConfig?.options.find((option) => option.routineTemplateId === value.routineTemplateId)
        : undefined;
      const selectedTitle = selectedOption?.title.en ?? mark.title.en;
      setSelectedTodayMark(null);
      openGolfPractice("today", {
        markId,
        markTitle: selectedTitle,
        routineTemplateId: value?.routineTemplateId,
        workoutType: resolveGolfPracticeWorkoutTypeForMarkTitle(selectedTitle) ?? "putting",
      });
      return;
    }

    try {
      await liveToday.completeMark(markId);
      journal.refresh();
    } catch (error) {
      Alert.alert(
        locale === "vi" ? "Khong danh dau duoc mark" : "Unable to mark complete",
        error instanceof Error
          ? error.message
          : locale === "vi"
            ? "Da co loi xay ra."
            : "An unexpected error occurred.",
      );
      throw error;
    }
  };

  const handleMoveMark = (markId: string, value: MoveMarkValue) => {
    void (async () => {
      const session = await app.repositories.strength.getSessionByMarkInstance(markId);
      if (session && session.status !== WorkoutSessionStatus.NotStarted && session.status !== WorkoutSessionStatus.Completed && session.status !== WorkoutSessionStatus.PartiallyCompleted && session.status !== WorkoutSessionStatus.Abandoned) {
        Alert.alert(
          locale === "vi" ? "Buổi tập đang dở" : "Workout in progress",
          locale === "vi"
            ? "Hãy hoàn tất hoặc kết thúc buổi tập hiện tại trước khi chuyển lịch planned mark này."
            : "Finish or end the current workout session before moving this planned mark.",
        );
        return;
      }

      await liveToday.rescheduleMark(markId, value);
    })();
  };

  const handleSkipMark = (markId: string) => {
    void (async () => {
      const session = await app.repositories.strength.getSessionByMarkInstance(markId);
      if (session && session.status !== WorkoutSessionStatus.NotStarted && session.status !== WorkoutSessionStatus.Completed && session.status !== WorkoutSessionStatus.PartiallyCompleted && session.status !== WorkoutSessionStatus.Abandoned) {
        Alert.alert(
          locale === "vi" ? "Buổi tập đang dở" : "Workout in progress",
          locale === "vi"
            ? "Hãy hoàn tất hoặc kết thúc buổi tập hiện tại trước khi bỏ planned mark này."
            : "Finish or end the current workout session before skipping this planned mark.",
        );
        return;
      }

      await liveToday.skipMark(markId);
    })();
  };

  const handleUpdateMarkNote = async (markId: string, note: string) => {
    const normalizedNote = note.trim();
    await app.repositories.marks.upsertMarkInstanceDetail(markId, {
      preActionComment: normalizedNote || null,
      userEditedAt: new Date().toISOString(),
    });
    liveToday.refresh();
  };

  const handleCompletePackCheck = () => {
    void (async () => {
      try {
        await packCheckDetail.complete();
        liveToday.refresh();
        journal.refresh();
        popRoute();
      } catch (error) {
        Alert.alert(
          locale === "vi" ? "Khong hoan tat duoc Pack Check" : "Unable to complete Pack Check",
          error instanceof Error
            ? error.message
            : locale === "vi"
              ? "Da co loi xay ra."
              : "An unexpected error occurred.",
        );
      }
    })();
  };

  const handleSubstituteWithExisting = (markId: string, substituteMarkId: string) => {
    void substituteMarkId;
    void (async () => {
      const session = await app.repositories.strength.getSessionByMarkInstance(markId);
      if (session && session.status !== WorkoutSessionStatus.NotStarted && session.status !== WorkoutSessionStatus.Completed && session.status !== WorkoutSessionStatus.PartiallyCompleted && session.status !== WorkoutSessionStatus.Abandoned) {
        Alert.alert(
          locale === "vi" ? "Buổi tập đang dở" : "Workout in progress",
          locale === "vi"
            ? "Hãy hoàn tất hoặc kết thúc buổi tập hiện tại trước khi substitute planned mark này."
            : "Finish or end the current workout session before substituting this planned mark.",
        );
        return;
      }

      Alert.alert(
        locale === "vi" ? "Chưa hỗ trợ thay thế bằng mark có sẵn" : "Substitute with existing mark is not supported yet",
        locale === "vi"
          ? "Hiện tại chỉ hỗ trợ tạo substitute mark mới từ sheet này."
          : "This sheet currently supports creating a new substitute mark, not linking to an existing mark.",
      );
    })();
  };

  const handleSubstituteWithQuickMark = (markId: string, value: QuickSubstituteValue) => {
    void (async () => {
      const session = await app.repositories.strength.getSessionByMarkInstance(markId);
      if (session && session.status !== WorkoutSessionStatus.NotStarted && session.status !== WorkoutSessionStatus.Completed && session.status !== WorkoutSessionStatus.PartiallyCompleted && session.status !== WorkoutSessionStatus.Abandoned) {
        Alert.alert(
          locale === "vi" ? "Buổi tập đang dở" : "Workout in progress",
          locale === "vi"
            ? "Hãy hoàn tất hoặc kết thúc buổi tập hiện tại trước khi substitute planned mark này."
            : "Finish or end the current workout session before substituting this planned mark.",
        );
        return;
      }

      const activePaths = await app.repositories.paths.listActivePaths(app.user.id);
      const targetPath = activePaths.find((path) => path.id === value.pathId) ?? activePaths.find((path) => {
        const normalized = `${path.slug} ${path.title}`.toLowerCase();
        return (
          (value.pathId === "career" && normalized.includes("career")) ||
          (value.pathId === "snag" && normalized.includes("snag")) ||
          (value.pathId === "health" && (normalized.includes("health") || normalized.includes("body"))) ||
          (value.pathId === "family" && (normalized.includes("family") || normalized.includes("home"))) ||
          (value.pathId === "character" && (normalized.includes("character") || normalized.includes("stoic"))) ||
          (value.pathId === "golf" && normalized.includes("golf")) ||
          (value.pathId === "culture" && (normalized.includes("culture") || normalized.includes("romance") || normalized.includes("class")))
        );
      });

      await liveToday.assertReplanActionAllowed(markId);
      await app.markEngine.substituteMarkInstance({
        markInstanceId: markId,
        substituteTitle: value.title.trim(),
        substituteDescription: value.detail?.trim() || undefined,
        substitutePathId: targetPath?.id,
        substituteExpeditionId: value.expeditionId,
        substituteMilestoneId: value.milestoneId,
        substituteMode: { mode: "ready" },
      });
      liveToday.refresh();
      journal.refresh();
    })();
  };

  const togglePackCheckItem = (packId: string, itemId: string) => {
    const item = todayPackCheckItems[packId]?.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }
    void liveToday.togglePackCheckItem(packId, itemId, !item.checked);
  };

  const clearPackCheck = async (packId: string) => {
    const checkedItems = (todayPackCheckItems[packId] ?? []).filter((item) => item.checked);
    for (const item of checkedItems) {
      await app.packCheckEngine.setPackCheckItemChecked(packId, item.id, false);
    }
    liveToday.refresh();
  };

  const completePackCheck = (packId: string) => {
    void liveToday.completePackCheck(packId);
  };

  const resolveSignalPrimary = async (payload: SignalPrimaryResolutionInput) => {
    const signal = liveTodayData?.signalsById[payload.signalId];
    if (!signal) {
      return;
    }

    if (signal.targetType === SignalTargetType.MarkInstance) {
      await liveToday.completeMark(signal.targetId);
      popRoute();
      return;
    }

    if (signal.targetType === SignalTargetType.PackCheckInstance) {
      await liveToday.completePackCheck(signal.targetId);
      popRoute();
      return;
    }

    if (signal.targetType === SignalTargetType.TrailDay) {
      pushRoute({ kind: "closeTrail", trailDayId: signal.targetId });
    }
  };

  const resolveSignalAlternative = async (payload: SignalPrimaryResolutionInput) => {
    await app.signalEngine.dismissSignal({
      signalId: payload.signalId,
      dismissedAt: payload.occurredAt,
    });
    liveToday.refresh();
    if (route.kind === "signal" && route.signalId === payload.signalId) {
      popRoute();
    }
  };

  const resolveSignalSkip = async (payload: SignalSkipResolutionInput) => {
    const signal = liveTodayData?.signalsById[payload.signalId];
    if (!signal) {
      return;
    }

    if (signal.targetType === SignalTargetType.MarkInstance) {
      await liveToday.skipMark(signal.targetId);
    }

    popRoute();
  };

  const signalOrchestrator = useMemo(
    () =>
      createSignalOrchestrator({
        signalEngine: app.signalEngine,
        resolvePrimary: resolveSignalPrimary,
        resolveAlternative: resolveSignalAlternative,
        resolveSkipWithReason: resolveSignalSkip,
      }),
    [app.signalEngine, liveTodayData, route],
  );

  async function handleSignalResponse(
    actionIdentifier: string,
    data: ReturnType<typeof readWaymarkSignalNotificationData>,
  ) {
    if (!data) {
      return;
    }

    if (actionIdentifier === WAYMARK_SIGNAL_ACTION_SNOOZE_5) {
      await app.signalEngine.snoozeSignal({
        signalId: data.signalId,
        snoozedUntil: new Date(Date.now() + 5 * 60_000).toISOString(),
      });
      liveToday.refresh();
      return;
    }

    if (actionIdentifier === WAYMARK_SIGNAL_ACTION_DISMISS) {
      await app.signalEngine.dismissSignal({
        signalId: data.signalId,
        dismissedAt: new Date().toISOString(),
      });
      liveToday.refresh();
      return;
    }

    if (actionIdentifier === WAYMARK_SIGNAL_ACTION_COMPLETE) {
      if (data.targetType === SignalTargetType.MarkInstance) {
        await liveToday.completeMark(data.targetId);
        return;
      }
      if (data.targetType === SignalTargetType.PackCheckInstance) {
        await liveToday.completePackCheck(data.targetId);
        return;
      }
    }

    if (actionIdentifier === WAYMARK_SIGNAL_ACTION_OPEN) {
      const signal = await app.repositories.signals.getSignalById(data.signalId);
      if (
        signal &&
        (signal.status === SignalStatus.Scheduled ||
          signal.status === SignalStatus.Ringing ||
          signal.status === SignalStatus.Snoozed)
      ) {
        await app.signalEngine.dismissSignal({
          signalId: data.signalId,
          dismissedAt: new Date().toISOString(),
        });
      }
      liveToday.refresh();

      if (data.targetType === SignalTargetType.MarkInstance) {
        openDetail("mark_instance", data.targetId, routeToTab(route));
        return;
      }

      if (data.targetType === SignalTargetType.PackCheckInstance) {
        pushRoute({ kind: "packCheck", packId: data.targetId });
        return;
      }
    }

    if (data.targetType === SignalTargetType.TrailDay) {
      pushRoute({ kind: "closeTrail", trailDayId: data.targetId });
      return;
    }

    openSignal(data.signalId, routeToTab(route));
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const initialResponse = await getLastWaymarkNotificationResponseAsync();
      if (cancelled || !initialResponse) {
        return;
      }
      const responseKey = `${initialResponse.notification.request.identifier}:${initialResponse.actionIdentifier}`;
      if (handledNotificationResponseRef.current === responseKey) {
        return;
      }
      handledNotificationResponseRef.current = responseKey;
      const data = readWaymarkSignalNotificationData(initialResponse.notification.request.content.data);
      await dismissWaymarkSignalNotificationAsync(initialResponse);
      await handleSignalResponse(initialResponse.actionIdentifier, data);
      await clearLastWaymarkNotificationResponseAsync();
    })();

    const subscription = addWaymarkNotificationResponseListener((response) => {
      const responseKey = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handledNotificationResponseRef.current === responseKey) {
        return;
      }
      handledNotificationResponseRef.current = responseKey;
      void (async () => {
        await dismissWaymarkSignalNotificationAsync(response);
        await handleSignalResponse(
          response.actionIdentifier,
          readWaymarkSignalNotificationData(response.notification.request.content.data),
        );
      })();
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [handleSignalResponse, liveToday, route]);

  const buildSignalModel = (signalId: string): SignalModeCardModel | null => {
    const signal =
      liveTodayData?.signalsById[signalId] ??
      (route.kind === "signal" && route.signalId === signalId && signalRouteSignal ? signalRouteSignal : null);
    if (!signal) {
      return null;
    }

    const signalStatus = mapSignalCardStatus(signal.status);
    const scheduledTimeLabel = formatSignalTimeLabel(signal.snoozedUntil ?? signal.scheduledAt, locale);

    if (signal.targetType === SignalTargetType.MarkInstance) {
      const markPathId = route.kind === "signal" && route.signalId === signalId ? markDetail.mark?.path.id : undefined;
      const subtitle =
        markPathId && isUiPathId(markPathId)
          ? locale === "vi"
            ? `${pathLabel(markPathId, locale)} dang goi ban quay lai moc da chon.`
            : `${pathLabel(markPathId, locale)} is calling you back to a chosen mark.`
          : locale === "vi"
            ? "Signal dang goi ban quay lai moc da chon."
            : "A signal is calling you back to a chosen mark.";

      return {
        signalId: signal.id,
        targetId: signal.targetId,
        targetType: signal.targetType,
        status: signalStatus,
        title: locale === "vi" ? "Signal dang reo" : "Signal Ringing",
        subtitle,
        scheduledTimeLabel,
        relativeStatusLabel: getSignalStatusLabel(signalStatus, locale),
        resolveRequiredHint:
          locale === "vi" ? "Hay giai quyet signal nay truoc khi roi di." : "Resolve this signal before leaving.",
        actions: [
          {
            id: "primary",
            kind: "PRIMARY",
            label: locale === "vi" ? "Hoan tat moc" : "Complete Mark",
            prominence: "primary",
            iconSemanticName: "entity.mark",
          },
          {
            id: "snooze-5",
            kind: "SNOOZE",
            label: locale === "vi" ? "Hoan 5 phut" : "Snooze 5 min",
            minutes: 5,
            iconSemanticName: "utility.clock",
          },
          {
            id: "dismiss",
            kind: "ALTERNATIVE",
            label: locale === "vi" ? "Bo qua luc nay" : "Dismiss",
            iconSemanticName: "utility.close",
          },
        ],
      };
    }

    if (signal.targetType === SignalTargetType.TrailDay) {
      return {
        signalId: signal.id,
        targetId: signal.targetId,
        targetType: signal.targetType,
        status: signalStatus,
        title: locale === "vi" ? "Signal khep ngay" : "Close the Trail",
        subtitle: locale === "vi" ? "Ngay nay dang san sang de review va khep lai." : "This day is ready to review and close.",
        scheduledTimeLabel,
        relativeStatusLabel: getSignalStatusLabel(signalStatus, locale),
        resolveRequiredHint:
          locale === "vi" ? "Hay khep Trail hoac hoan signal nay truoc khi roi di." : "Close the Trail or snooze this signal before leaving.",
        actions: [
          {
            id: "primary",
            kind: "PRIMARY",
            label: locale === "vi" ? "Mo Close Trail" : "Open Close Trail",
            prominence: "primary",
            iconSemanticName: "status.done",
          },
          {
            id: "snooze-5",
            kind: "SNOOZE",
            label: locale === "vi" ? "Hoan 5 phut" : "Snooze 5 min",
            minutes: 5,
            iconSemanticName: "utility.clock",
          },
          {
            id: "dismiss",
            kind: "ALTERNATIVE",
            label: locale === "vi" ? "Bo qua luc nay" : "Dismiss",
            iconSemanticName: "utility.close",
          },
        ],
      };
    }

    return {
      signalId: signal.id,
      targetId: signal.targetId,
      targetType: signal.targetType,
      status: signalStatus,
      title: locale === "vi" ? "Signal dang reo" : "Signal Ringing",
      subtitle: locale === "vi" ? "Chuan bi truoc khi roi di." : "Prepare before leaving.",
      scheduledTimeLabel,
      relativeStatusLabel: getSignalStatusLabel(signalStatus, locale),
      actions: [
        {
          id: "primary",
          kind: "PRIMARY",
          label: locale === "vi" ? "Hoan tat pack" : "Complete Pack",
          prominence: "primary",
          iconSemanticName: "entity.packCheck",
        },
        {
          id: "snooze-5",
          kind: "SNOOZE",
          label: locale === "vi" ? "Hoan 5 phut" : "Snooze 5 min",
          minutes: 5,
          iconSemanticName: "utility.clock",
        },
        {
          id: "dismiss",
          kind: "ALTERNATIVE",
          label: locale === "vi" ? "Bo qua luc nay" : "Dismiss",
          iconSemanticName: "utility.close",
        },
      ],
    };
  };

  const screen = (() => {
    switch (route.kind) {
      case "today":
        if (liveToday.status === "error") {
          return (
            <FieldJournalScreenShell variant="navAware">
              <View style={styles.todayErrorState}>
                <WMEmptyState
                  body={liveToday.error.message || (locale === "vi" ? "Du lieu hom nay khong the tai." : "Today's data could not load.")}
                  title={locale === "vi" ? "Khong tai duoc Today" : "Today could not load"}
                />
                <WMButton
                  label={locale === "vi" ? "Thu lai" : "Retry"}
                  onPress={() => void liveToday.refresh()}
                  variant="primary"
                />
              </View>
            </FieldJournalScreenShell>
          );
        }
        return (
          <TodayCockpitScreen
            closeTrailStatus={liveToday.status === "loading" ? "loading" : liveTodayData?.closeTrailStatus ?? "default"}
            confirmDailyPlanLoading={confirmingDailyPlan}
            currentExpeditions={liveTodayData?.currentExpeditions ?? []}
            dailyPlanMode={liveTodayData?.dailyPlanMode ?? "execution"}
            featureFlags={liveTodayData?.featureFlags ?? {
              isPathHeroEnabled: false,
              isPathDetailEnabled: false,
              isMarksEnabled: true,
              isMarkDetailEnabled: true,
              isIndependentPackChecksEnabled: false,
              isPrepareTomorrowEnabled: false,
              isPackCheckDetailEnabled: true,
              isCurrentExpeditionEnabled: false,
              isExpeditionDetailEnabled: false,
              isCloseTrailEnabled: true,
            }}
            hasWeeklyTimetableForDate={liveTodayData?.hasWeeklyTimetableForDate ?? false}
            allPackChecks={allTodayPackChecks}
            locale={locale}
            marks={todayMarks}
            onOpenCloseTrail={() => pushRoute({ kind: "closeTrail" })}
            onConfirmDailyPlan={handleConfirmDailyPlan}
            onOpenExpedition={(expedition) => openExpedition(expedition.id)}
            onOpenMarkDetail={(mark) => {
              setSelectedTodayMark(mark);
            }}
            onOpenPackCheck={openPackCheck}
            onOpenPathDetail={(pathId) => pushRoute({ kind: "pathDetail", pathId })}
            onPathChange={(pathId) => {
              setSelectedPathId(pathId);
              void liveToday.setAnchorPath(pathId);
            }}
            packChecks={todayPackChecks}
            paths={liveTodayData?.paths ?? []}
            selectedPathId={selectedPathId}
            withShell
          />
        );
      case "journal":
        {
          const latestHero =
            journal.home?.latestHero ?
              {
                ...journal.home.latestHero,
                onPress:
                  journal.home.latestHero.sourceType === "memory" && journal.home.latestHero.sourceId ?
                    () => openDetail("memory", journal.home!.latestHero.sourceId!, "journal")
                  : undefined,
              }
            : {
                title: locale === "vi" ? "Chua co ky uc nao" : "No memories yet",
                eyebrow: locale === "vi" ? "Ky uc moi nhat" : "Latest memory",
                dateLabel: journal.home?.dateLabel ?? (locale === "vi" ? "Hom nay" : "Today"),
              };

          return (
            <JournalHomeTemplate
              dateOptions={journal.home?.dateOptions}
              dateLabel={journal.home?.dateLabel ?? (locale === "vi" ? "Hom nay" : "Today")}
              datePickerReady={journal.status === "ready"}
              latestHero={latestHero}
              locale={locale}
              lookBackCards={journal.home?.lookBackCards ?? []}
              onOpenRecentCollection={(rowId) => pushRoute({ kind: "dailyJournal", dayKey: rowId })}
              onSelectDate={(dayKey) => pushRoute({ kind: "dailyJournal", dayKey })}
              recentRows={journal.home?.recentRows ?? []}
              selectedDateId={journal.home?.dateOptions[0]?.id}
              upcomingCards={journal.home?.upcomingCards ?? []}
            />
          );
        }
      case "dailyJournal": {
        const dailyJournal = journal.getDailyJournal(route.dayKey);
        const dailyJournalLoadState = journal.getDailyJournalLoadState(route.dayKey);
        return (
          <DailyJournalTemplate
            backgroundMotif={dailyJournal.backgroundMotif}
            closedDayCard={dailyJournal.closedDayCard}
            dayKey={route.dayKey}
            dateLabel={dailyJournal.dateLabel}
            errorMessage={dailyJournalLoadState.error?.message}
            debugInfo={{
              selectedDate: dailyJournal.debug?.selectedDate ?? route.dayKey,
              trailDayId: dailyJournal.debug?.trailDayId,
              journalEntries: dailyJournal.debug?.journalEntries ?? dailyJournal.entries.length,
              memoryEntries: dailyJournal.debug?.memoryEntries ?? dailyJournal.entries.filter((entry) => entry.entryType === "memory").length,
              completedMarks: dailyJournal.debug?.completedMarks ?? dailyJournal.entries.filter((entry) => entry.entryType === "mark").length,
              hasClosedTrail: dailyJournal.debug?.hasClosedTrail ?? Boolean(dailyJournal.closedDayCard),
            }}
            featuredMemory={
              dailyJournal.featuredMemory
                ? {
                    ...dailyJournal.featuredMemory,
                    onPress: () => openDetail("memory", dailyJournal.featuredMemory!.sourceId, "journal"),
                  }
                : undefined
            }
            isToday={dailyJournal.isToday}
            loadState={dailyJournalLoadState.status}
            locale={locale}
            memoryCount={dailyJournal.memoryCount}
            memoryOverflowCount={dailyJournal.memoryOverflowCount}
            memoryPreviews={dailyJournal.memoryPreviews.map((entry) => ({
              ...entry,
              onPress: () => openDetail("memory", entry.sourceId, "journal"),
            }))}
            onBack={() => setRouteStack([{ kind: "journal" }])}
            onNextDay={
              dailyJournal.nextDayKey
                ? () => replaceRoute({ kind: "dailyJournal", dayKey: dailyJournal.nextDayKey! })
                : undefined
            }
            onPreviousDay={() => replaceRoute({ kind: "dailyJournal", dayKey: dailyJournal.previousDayKey })}
            trailEntries={dailyJournal.trailEntries.map((entry) => ({
              ...entry,
              onPress: () => openDetail("mark_instance", entry.sourceId, "journal"),
            }))}
          />
        );
      }
      case "paths":
        return (
          <WeeklyMilestonesTemplate
            errorMessage={weeklyMilestones.error?.message}
            locale={locale}
            milestones={weeklyMilestones.items}
            onCompleteMilestone={(milestoneId) => void completeWeeklyMilestone(milestoneId)}
            onMoveMilestone={(milestoneId) => void moveWeeklyMilestone(milestoneId)}
            onOpenMark={openWeeklyMilestoneMark}
            onOpenPath={(pathId) => pushRoute({ kind: "pathDetail", pathId })}
            onOpenExpedition={(expeditionId) => openExpedition(expeditionId, "paths")}
            onSkipMilestone={(milestoneId) => void skipWeeklyMilestone(milestoneId)}
            showBottomNav={false}
            status={weeklyMilestones.status}
          />
        );
      case "me":
        return (
          <MeOverviewTemplate
            hubItems={buildMeHubItems(
              locale,
              () => pushRoute({ kind: "backlog" }),
              () => pushRoute({ kind: "weeklyTimetable" }),
              () => pushRoute({ kind: "weeklySignal" }),
              () => pushRoute({ kind: "closeTrail" }),
            )}
            locale={locale}
            principle={null}
            privateDocumentsCard={{
              onPress: () => Alert.alert(locale === "vi" ? "Tai lieu rieng tu se duoc noi sau" : "Private documents will be wired next"),
            }}
            settings={{
              privacy: {
                title: locale === "vi" ? "Quyen rieng tu" : "Privacy",
                subtitle: locale === "vi" ? "Moi thu van luu local-first." : "Everything still stays local-first.",
                status: "protected",
                label: locale === "vi" ? "Duoc bao ve" : "Protected",
              },
              backup: {
                status: { kind: "neverBackedUp" },
              },
              rows: [
                {
                  id: "lang",
                  title: locale === "vi" ? "Ngon ngu" : "Language",
                  subtitle:
                    locale === "vi"
                      ? "Toggle English / Tieng Viet"
                      : "Toggle English / Vietnamese",
                  icon: "entity.path",
                  statusBadge: <WMChip label={locale === "vi" ? "VI" : "EN"} selected />,
                  onPress: updateLocale,
                },
              ],
              groups: [
                ...(ENABLE_PREVIEW_ME_TOOLS ? [{
                  id: "dev-weekly-imports",
                  title: locale === "vi" ? "Weekly Timetable Import" : "Weekly Timetable Import",
                  subtitle:
                    locale === "vi"
                      ? "Nhap/cap nhat lich tuan vao week plans, planned marks va signals."
                      : "Import and update weekly schedules into week plans, planned marks, and signals.",
                  rows: [
                    {
                      id: "prod-import-golf-program-dev-marks",
                      title: locale === "vi" ? "Import Golf Program dev marks" : "Import Golf Program dev marks",
                      subtitle:
                        locale === "vi"
                          ? "Tao 4 marks test cho flow Warm-up -> Revision -> Practice cua chuong trinh golf 13 tuan."
                          : "Create 4 test marks for the Golf Program Warm-up -> Revision -> Practice flow.",
                      icon: "entity.mark" as const,
                      onPress: handleImportGolfProgramDevMarks,
                    },
                    {
                      id: "prod-import-weekly-timetable-20260803",
                      title: locale === "vi" ? "Import Weekly Timetable 03/08" : "Import Weekly Timetable 08/03",
                      subtitle:
                        locale === "vi"
                          ? "Import lich 03/08-09/08: 85 Planned Marks, workout/golf dung flow, n8n tach tung block."
                          : "Import the 2026-08-03 to 2026-08-09 plan: 85 Planned Marks, routed workout/golf flows, and separate n8n blocks.",
                      icon: "entity.mark" as const,
                      onPress: handleImportWeeklyTimetable20260803,
                    },
                    {
                      id: "prod-import-weekly-timetable-20260727",
                      title: locale === "vi" ? "Import Weekly Timetable 27/07" : "Import Weekly Timetable 07/27",
                      subtitle:
                        locale === "vi"
                          ? "Import lich 27/07-02/08 data-only: 74 Planned Marks, signals truc tiep, khong tao hierarchy moi."
                          : "Import the 2026-07-27 to 2026-08-02 data-only plan: 74 Planned Marks, direct signals, and no new hierarchy.",
                      icon: "entity.mark" as const,
                      onPress: handleImportWeeklyTimetable20260727,
                    },
                    {
                      id: "prod-import-weekly-timetable-20260720",
                      title: locale === "vi" ? "Import Weekly Timetable 20/07" : "Import Weekly Timetable 07/20",
                      subtitle:
                        locale === "vi"
                          ? "Import lich 20/07-26/07 data-only: 69 Planned Marks, signals truc tiep, khong tao hierarchy moi."
                          : "Import the 2026-07-20 to 2026-07-26 data-only plan: 69 Planned Marks, direct signals, and no new hierarchy.",
                      icon: "entity.mark" as const,
                      onPress: handleImportWeeklyTimetable20260720,
                    },
                    {
                      id: "prod-patch-weekend-hospital-care-20260725",
                      title: locale === "vi" ? "Patch cham bo 25-26/07" : "Patch father care 07/25-07/26",
                      subtitle:
                        locale === "vi"
                          ? "Cap nhat rieng thu 7/chu nhat: 6 mark trong bo trong vien, signal truc tiep truoc 15 phut, khong tao pack check moi."
                          : "Update only Sat/Sun: six hospital care marks, direct 15-minute signals, and no new pack checks.",
                      icon: "entity.mark" as const,
                      onPress: handleWeekendHospitalCarePatch20260725,
                    },
                    {
                      id: "prod-repair-workout-database",
                      title: locale === "vi" ? "Cap nhat DB Workout A/B" : "Update Workout A/B database",
                      subtitle:
                        locale === "vi"
                          ? "Repair routine Day A/B theo cau hinh 4 bai; giu nguyen lich su workout da hoan thanh."
                          : "Repair Day A/B routines from the four-exercise configuration while preserving completed workout history.",
                      icon: "health.strength" as const,
                      onPress: handleRepairWorkoutDatabase,
                    },
                    {
                      id: "prod-import-weekly-timetable-20260713",
                      title: locale === "vi" ? "Import Weekly Timetable 13/07" : "Import Weekly Timetable 07/13",
                      subtitle:
                        locale === "vi"
                          ? "Import lich 13/07-19/07, gom Mark + Signal V3, golf weekday/weekend dung rule va khong tao Golf Practice Pack Check."
                          : "Import the 2026-07-13 to 2026-07-19 Mark + Signal V3 plan with weekday/weekend golf rules and no Golf Practice Pack Check.",
                      icon: "entity.mark" as const,
                      onPress: handleImportWeeklyTimetable20260713,
                    },
                    {
                      id: "prod-import-breakfast-marks-20260713",
                      title: locale === "vi" ? "Import 7 mark bua sang 13/07" : "Import 7 breakfast marks 07/13",
                      subtitle:
                        locale === "vi"
                          ? "Chi tao mark 07:00 cho 13/07-19/07; bo qua ngay da co mark cung tieu de de tranh trung."
                          : "Only creates the 07:00 marks for 2026-07-13 to 2026-07-19; skips days that already have the same title.",
                      icon: "entity.mark" as const,
                      onPress: handleImportBreakfastMarks20260713,
                    },
                    {
                      id: "prod-import-weekly-timetable-20260706",
                      title: locale === "vi" ? "Import Weekly Timetable 06/07" : "Import Weekly Timetable 07/06",
                      subtitle:
                        locale === "vi"
                          ? "Import lich 06/07-12/07, tao Tony Golf/DCH structure, planned marks khong due date va fullscreen alarm signals."
                          : "Import the 2026-07-06 to 2026-07-12 schedule, Tony Golf/DCH structure, no-due-date planned marks, and full-screen alarm signals.",
                      icon: "entity.mark" as const,
                      onPress: handleImportWeeklyTimetable20260706,
                    },
                    {
                      id: "prod-patch-weekly-timetable-202607020305",
                      title: locale === "vi" ? "Patch Timetable 02/07, 03/07, 05/07" : "Patch Timetable 07/02, 07/03, 07/05",
                      subtitle:
                        locale === "vi"
                          ? "Chi update mark slots cho Thu 5, Thu 6 va Chu nhat; giu nguyen cac ngay khac va mark da xu ly."
                          : "Only updates mark slots for Thu, Fri, and Sunday; preserves other days and handled marks.",
                      icon: "entity.mark" as const,
                      onPress: handleImportWeeklyTimetable202607020305Patch,
                    },
                    {
                      id: "prod-import-weekly-timetable-20260629",
                      title: locale === "vi" ? "Import Weekly Timetable 29/06" : "Import Weekly Timetable 06/29",
                      subtitle:
                        locale === "vi"
                          ? "Import lich 29/06-05/07, tao DCH/BA Core structure, planned marks khong due date, pack checks va signals."
                          : "Import the 2026-06-29 to 2026-07-05 schedule, DCH/BA Core structure, no-due-date planned marks, pack checks, and signals.",
                      icon: "entity.mark" as const,
                      onPress: handleImportWeeklyTimetable20260629,
                    },
                    {
                      id: "prod-import-weekly-timetable-20260622",
                      title: locale === "vi" ? "Import Weekly Timetable 22/06" : "Import Weekly Timetable 06/22",
                      subtitle:
                        locale === "vi"
                          ? "Import lich 22/06-28/06 vao week_plans va planned marks, giu nguyen ten Mark tieng Viet co dau."
                          : "Import the 2026-06-22 to 2026-06-28 schedule into week_plans and planned marks, preserving Vietnamese Mark titles.",
                      icon: "entity.mark" as const,
                      onPress: handleImportWeeklyTimetable20260622,
                    },
                    {
                      id: "prod-import-weekly-timetable-20260615",
                      title: locale === "vi" ? "Import Weekly Timetable 15/06" : "Import Weekly Timetable 06/15",
                      subtitle:
                        locale === "vi"
                          ? "Import lich 15/06-21/06 vao week_plans va planned marks bang path/expedition/milestone refs."
                          : "Import the 2026-06-15 to 2026-06-21 schedule into week_plans and planned marks using path, expedition, and milestone refs.",
                      icon: "entity.mark" as const,
                      onPress: handleImportWeeklyTimetable20260615,
                    },
                    {
                      id: "prod-import-weekly-timetable",
                      title: locale === "vi" ? "Import Weekly Timetable 08/06" : "Import Weekly Timetable 06/08",
                      subtitle:
                        locale === "vi"
                          ? "Import lich 08/06-14/06 vao week_plans, planned marks, anchors, pack checks va signals."
                          : "Import the 2026-06-08 to 2026-06-14 schedule into week_plans, planned marks, anchors, pack checks, and signals.",
                      icon: "entity.mark" as const,
                      onPress: handleImportSampleWeeklyTimetable,
                    },
                  ],
                }] : []),
                {
                  id: "prod-turso-sync",
                  title: locale === "vi" ? "Turso Sync" : "Turso Sync",
                  subtitle:
                    tursoDevSync.lastMessage ??
                    (locale === "vi"
                      ? "Turso Full-DB la source of truth; Waymark pull vao cache va chi push mutation khi EOD."
                      : "Turso Full-DB is source of truth; Waymark pulls into cache and pushes mutations only at EOD."),
                  rows: [
                    {
                      id: "prod-turso-link",
                      title: tursoDevSync.configured
                        ? locale === "vi"
                          ? "Turso da link"
                          : "Turso linked"
                        : locale === "vi"
                          ? "Link Waymark voi Turso"
                          : "Link Waymark with Turso",
                      subtitle:
                        tursoDevSync.configSummary ??
                        (locale === "vi"
                          ? "Nhap Turso database URL va auth token de bat cac nut upload/pull."
                          : "Enter the Turso database URL and auth token to enable upload/pull."),
                      icon: "status.protected" as const,
                      loading: tursoDevSync.status === "uploading",
                      disabled: tursoDevSync.disabled,
                      onPress: tursoDevSync.configured ? handleUnlinkTurso : handleOpenTursoLinkModal,
                    },
                    {
                      id: "prod-turso-manual-upload",
                      title: locale === "vi" ? "Chay EOD Full-DB Sync" : "Run EOD Full-DB Sync",
                      subtitle:
                        locale === "vi"
                          ? "Day cac mutation Waymark duoc phep vao bang typed tren Turso; ownership va field allowlist duoc kiem tra."
                          : "Push allowed Waymark mutations into typed Turso tables with ownership and field allowlists.",
                      icon: "status.protected" as const,
                      loading: tursoDevSync.status === "uploading",
                      disabled: tursoDevSync.disabled || !tursoDevSync.configured,
                      onPress: handleTursoManualUpload,
                    },
                    {
                      id: "prod-turso-pull-remote-edits",
                      title: locale === "vi" ? "Pull Turso Full-DB" : "Pull Turso Full-DB",
                      subtitle:
                        locale === "vi"
                          ? "Lan dau keo full snapshot; cac lan sau chi keo change log vao SQLite cache."
                          : "Pull a full snapshot first, then apply incremental change-log entries into the SQLite cache.",
                      icon: "entity.signal" as const,
                      loading: tursoDevSync.status === "pulling",
                      disabled: tursoDevSync.disabled || !tursoDevSync.configured,
                      onPress: handleTursoPullRemoteEdits,
                    },
                    {
                      id: "prod-turso-download-log",
                      title: locale === "vi" ? "Get Turso Log" : "Get Turso Log",
                      subtitle: tursoDevSync.debugLogSummary,
                      icon: "entity.privateDocument" as const,
                      onPress: tursoDevSync.downloadDebugLog,
                    },
                  ],
                },
                {
                  id: "prod-google-drive",
                  title: locale === "vi" ? "Google Drive" : "Google Drive",
                  subtitle:
                    locale === "vi"
                      ? "Ket noi va van hanh upload media that len Drive."
                      : "Connect and run real media upload operations through Drive.",
                  rows: [
                    {
                      id: "prod-google-drive-connect",
                        title: googleDriveDevUpload.connected
                          ? locale === "vi"
                            ? "Google Drive da ket noi"
                            : "Google Drive connected"
                          : locale === "vi"
                            ? "Ket noi Google Drive"
                            : "Connect Google Drive",
                        subtitle:
                          googleDriveDevUpload.lastMessage ??
                          (locale === "vi"
                            ? `OAuth ${googleDriveDevUpload.oauthConfig.variant}: ${googleDriveDevUpload.oauthConfig.packageName} / ${googleDriveDevUpload.displayClientId} / ${googleDriveDevUpload.authDebug.redirectUri}`
                            : `OAuth ${googleDriveDevUpload.oauthConfig.variant}: ${googleDriveDevUpload.oauthConfig.packageName} / ${googleDriveDevUpload.displayClientId} / ${googleDriveDevUpload.authDebug.redirectUri}`),
                        icon: "status.protected" as const,
                        loading: googleDriveDevUpload.status === "authenticating",
                        disabled: googleDriveDevUpload.disabled,
                        onPress: googleDriveDevUpload.connect,
                      },
                      {
                        id: "prod-google-drive-run-upload",
                        title: locale === "vi" ? "Run Drive media upload" : "Run Drive media upload",
                        subtitle:
                          googleDriveDevUpload.connected
                            ? locale === "vi"
                              ? "Upload pending days cu truoc; hom nay se hoi xac nhan snapshot."
                              : "Uploads old pending days first; today requires snapshot confirmation."
                            : locale === "vi"
                              ? "Dang nhap Google Drive truoc khi chay EOD batch that."
                              : "Sign in to Google Drive before running the real EOD batch.",
                        icon: "entity.privateDocument" as const,
                        loading: googleDriveDevUpload.status === "uploading",
                        disabled: googleDriveDevUpload.disabled,
                        onPress: googleDriveDevUpload.runPendingUpload,
                      },
                      {
                        id: "prod-google-drive-check-log",
                        title: locale === "vi" ? "Check Google Drive log" : "Check Google Drive log",
                        subtitle: googleDriveDevUpload.debugLogSummary,
                        icon: "entity.privateDocument" as const,
                        onPress: googleDriveDevUpload.checkDebugLog,
                      },
                      {
                        id: "prod-google-drive-download-log",
                        title: locale === "vi" ? "Download Google Drive log" : "Download Google Drive log",
                        subtitle:
                          locale === "vi"
                            ? "Xuat toan bo OAuth/Drive log thanh file .txt de luu hoac gui."
                            : "Exports the full OAuth/Drive log as a .txt file to save or send.",
                        icon: "entity.privateDocument" as const,
                        onPress: googleDriveDevUpload.downloadDebugLog,
                      },
                  ],
                },
                {
                  id: "prod-phone-signal-settings",
                  title: locale === "vi" ? "Phone Signal Settings" : "Phone Signal Settings",
                  subtitle:
                    locale === "vi"
                      ? "Kiem tra va mo cac quyen dien thoai can cho fullscreen alarm."
                      : "Check and open phone permissions required by full-screen alarms.",
                  rows: [
                      {
                        id: "prod-native-alarm-health",
                        title: locale === "vi" ? "Xem signal alarm health" : "Inspect signal alarm health",
                        subtitle:
                          locale === "vi"
                            ? "Kiem tra notification, exact alarm, full-screen intent va battery optimization."
                            : "Check notification, exact alarm, full-screen intent, and battery optimization readiness.",
                        icon: "status.protected" as const,
                        onPress: handleShowSignalAlarmHealth,
                      },
                      {
                        id: "prod-native-alarm-notification-settings",
                        title: locale === "vi" ? "Mo notification settings" : "Open notification settings",
                        subtitle:
                          locale === "vi"
                            ? "Mo settings de cap quyen thong bao cho native signal alarm."
                            : "Open Android settings to grant notification access for native signal alarms.",
                        icon: "status.active" as const,
                        onPress: handleOpenSignalAlarmNotificationSettings,
                      },
                      {
                        id: "prod-native-alarm-exact-settings",
                        title: locale === "vi" ? "Mo exact alarm settings" : "Open exact alarm settings",
                        subtitle:
                          locale === "vi"
                            ? "Mo Alarms & reminders de cap quyen exact alarm."
                            : "Open Alarms & reminders to grant exact alarm permission.",
                        icon: "status.active" as const,
                        onPress: handleOpenSignalAlarmExactSettings,
                      },
                      {
                        id: "prod-native-alarm-full-screen-settings",
                        title: locale === "vi" ? "Mo full-screen intent settings" : "Open full-screen intent settings",
                        subtitle:
                          locale === "vi"
                            ? "Mo special access cho full-screen alarm takeover."
                            : "Open special access settings for full-screen alarm takeover.",
                        icon: "status.active" as const,
                        onPress: handleOpenSignalAlarmFullScreenSettings,
                      },
                  ],
                },
                ...(ENABLE_PREVIEW_ME_TOOLS
                  ? [
                      {
                        id: "dev-mode",
                        title: locale === "vi" ? "Dev Mode" : "Dev Mode",
                        subtitle:
                          locale === "vi"
                            ? "Cong cu reset, test va debug chi dung khi phat trien."
                            : "Reset, test, and debug tools used only during development.",
                        rows: [
                      {
                        id: "debug-turso-pull-trail-days",
                        title: "Pull all Trail Days",
                        subtitle:
                          locale === "vi"
                            ? "Dev recovery: keo toan bo trail_days tu Turso ve local; chay truoc Pull all Marks."
                            : "Dev recovery: pull all trail_days from Turso into local; run before Pull all Marks.",
                        icon: "utility.calendar" as const,
                        loading: tursoDevSync.status === "pulling",
                        disabled: tursoDevSync.disabled || !tursoDevSync.configured,
                        onPress: handleTursoPullTrailDays,
                      },
                      {
                        id: "debug-turso-pull-marks",
                        title: locale === "vi" ? "Pull all Marks" : "Pull all Marks",
                        subtitle:
                          locale === "vi"
                            ? "Dev recovery: keo toan bo mark_instances tu Turso ve local; tach rieng voi pull hierarchy."
                            : "Dev recovery: pull all mark_instances from Turso into local; separate from hierarchy pull.",
                        icon: "entity.mark" as const,
                        loading: tursoDevSync.status === "pulling",
                        disabled: tursoDevSync.disabled || !tursoDevSync.configured,
                        onPress: handleTursoPullMarks,
                      },
                      {
                        id: "debug-clear-local-progress-map-for-turso-pull",
                        title:
                          locale === "vi"
                            ? "Xoa local Expedition/Milestone/Mark"
                            : "Clear local Expedition/Milestone/Mark",
                        subtitle:
                          locale === "vi"
                            ? "Dev only: hard-delete local hierarchy + marks de pull lai tu Turso cho sach."
                            : "Dev only: hard-delete local hierarchy + marks so Turso can repopulate them cleanly.",
                        icon: "status.missed" as const,
                        onPress: handleClearLocalProgressMapForTursoPull,
                      },
                      {
                        id: "debug-download-turso-log",
                        title: locale === "vi" ? "Download Turso log" : "Download Turso log",
                        subtitle: tursoDevSync.debugLogSummary,
                        icon: "entity.privateDocument" as const,
                        onPress: tursoDevSync.downloadDebugLog,
                      },
                      {
                        id: "debug-export-db",
                        title: locale === "vi" ? "Export database local" : "Export local database",
                        subtitle:
                          locale === "vi"
                            ? "Copy waymark.db, -wal, -shm vao app documents va mo chia se."
                            : "Copy waymark.db, -wal, and -shm into app documents and open sharing.",
                        icon: "entity.privateDocument" as const,
                        onPress: handleExportLocalDatabase,
                      },
                      {
                        id: "debug-clear-signal-db",
                        title: locale === "vi" ? "Xoa Signal database" : "Clear Signal database",
                        subtitle:
                          locale === "vi"
                            ? "Xoa signals va metadata runtime cua signal truoc khi import lich moi."
                            : "Remove signals and signal runtime metadata before importing the new schedule.",
                        icon: "status.missed" as const,
                        onPress: handleClearSignalDatabase,
                      },
                      {
                        id: "debug-google-drive-reset-log",
                        title: locale === "vi" ? "Reset Google Drive log" : "Reset Google Drive log",
                        subtitle:
                          locale === "vi"
                            ? "Xoa token/log phien test trong app de thu lai OAuth tu dau."
                            : "Clears the in-app token/log state so OAuth can be tested again cleanly.",
                        icon: "entity.privateDocument" as const,
                        disabled: googleDriveDevUpload.disabled,
                        onPress: googleDriveDevUpload.resetDebugSession,
                      },
                      {
                        id: "debug-google-drive-reset-july-media",
                        title: locale === "vi" ? "Reset Drive media 09/10-07" : "Reset Drive media 07/09-07/10",
                        subtitle:
                          locale === "vi"
                            ? "Xoa metadata Drive cua anh ngay 2026-07-09 va 2026-07-10 de upload lai."
                            : "Clears Drive metadata for images on 2026-07-09 and 2026-07-10 so upload can run again.",
                        icon: "entity.privateDocument" as const,
                        disabled: googleDriveDevUpload.disabled,
                        onPress: googleDriveDevUpload.resetDriveMediaForJulyTest,
                      },
                      {
                        id: "debug-create-workout-coverage-test",
                        title: locale === "vi" ? "Tao planned workout test" : "Create workout test marks",
                        subtitle:
                          locale === "vi"
                            ? "Tao planned marks cho Day A1, Day A2, Day B, Walk, Short Game va Swing."
                            : "Create planned marks for Day A1, Day A2, Day B, Walk, Short Game, and Swing.",
                        icon: "health.strength" as const,
                        onPress: handleCreateWorkoutCoverageTest,
                      },
                      {
                        id: "debug-create-journal-memories-export-20260721",
                        title: locale === "vi" ? "Tao Daily Journal memories test" : "Create Daily Journal memory test",
                        subtitle:
                          locale === "vi"
                            ? "Seed 4 memories cua Today tu export waymark-db-export-20260721-085610 de test mockup Daily Journal."
                            : "Seed 4 Today memories from waymark-db-export-20260721-085610 to test the Daily Journal mockup.",
                        icon: "entity.memory" as const,
                        onPress: handleCreateDevJournalMemories,
                      },
                      {
                        id: "debug-create-daily-journal-trail-test",
                        title: locale === "vi" ? "Tao Daily Journal trail test" : "Create Daily Journal trail test",
                        subtitle:
                          locale === "vi"
                            ? "Seed completed marks cho 3 ngay gan nhat de test Today's trail tren Daily Journal."
                            : "Seed completed marks across the last 3 days to test Today's trail in Daily Journal.",
                        icon: "entity.mark" as const,
                        onPress: handleCreateDailyJournalTrailTestMarks,
                      },
                      {
                        id: "debug-clear-today-marks",
                        title: locale === "vi" ? "Clear today marks" : "Clear today marks",
                        subtitle:
                          locale === "vi"
                            ? "Dev only: an tat ca mark cua Today hien tai de test tren mat bang sach."
                            : "Dev only: soft-delete all marks on the current Today for a clean test surface.",
                        icon: "entity.mark" as const,
                        onPress: handleClearTodayDevMarks,
                      },
                      {
                        id: "debug-create-chipping-test-mark",
                        title: locale === "vi" ? "Tao mark chipping test" : "Create chipping test mark",
                        subtitle:
                          locale === "vi"
                            ? "Tao du 7 Chipping marks tren Today hien tai de test set/rep."
                            : "Create all 7 Chipping marks on the current Today to test set/rep.",
                        icon: "entity.mark" as const,
                        onPress: handleCreateChippingTestMark,
                      },
                      {
                        id: "debug-native-alarm-schedule",
                        title: locale === "vi" ? "Schedule native signal alarm test" : "Schedule native signal alarm test",
                        subtitle:
                          locale === "vi"
                            ? "Dat test alarm trong 30 giay voi full-screen native activity."
                            : "Schedule a 30-second test alarm with the native full-screen activity.",
                        icon: "entity.signal" as const,
                        onPress: handleScheduleSignalAlarmTest,
                      },
                      {
                        id: "debug-native-alarm-cancel",
                        title: locale === "vi" ? "Huy native signal alarm test" : "Cancel native signal alarm test",
                        subtitle:
                          locale === "vi"
                            ? "Huy test alarm va xoa native notification dang treo."
                            : "Cancel the test alarm and clear any hanging native notification.",
                        icon: "status.missed" as const,
                        onPress: handleCancelSignalAlarmTest,
                      },
                      {
                        id: "debug-create-today-mark-signal",
                        title: locale === "vi" ? "Gan signal vao planned mark hom nay" : "Attach a signal to today's planned mark",
                        subtitle:
                          locale === "vi"
                            ? "Tao signal that cho planned mark dau tien hop le cua hom nay va cho no no sau 30 giay."
                            : "Create a real signal for the first eligible planned mark today and ring it in 30 seconds.",
                        icon: "entity.mark" as const,
                        onPress: handleCreateTodayMarkSignalTest,
                      },
                    ],
                  },
                ]
                  : []),
              ],
            }}
            showBottomNav={false}
          />
        );
      case "closeTrail":
        if (closeTrail.status === "loading") {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={locale === "vi" ? "Dang tai du lieu khep ngay tu journal local." : "Loading close-the-day data from the local journal."}
                title={locale === "vi" ? "Dang tai Close the Trail" : "Loading Close the Trail"}
              />
            </FieldJournalScreenShell>
          );
        }

        if (!closeTrail.fixture) {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={
                  locale === "vi"
                    ? "Khong the tai du lieu khep ngay luc nay. Thu lai sau khi Today va journal da san sang."
                    : "Close-the-day data is not available right now. Try again after Today and Journal are ready."
                }
                title={locale === "vi" ? "Close the Trail tam thoi chua san sang" : "Close the Trail unavailable"}
              />
            </FieldJournalScreenShell>
          );
        }

        return (
          <CloseTrailScreen
            errorMessage={closeTrail.status === "error" ? closeTrail.error.message : null}
            fixture={closeTrail.fixture}
            locale={locale}
            onCloseDay={(input) => {
              void (async () => {
                try {
                  await closeTrail.closeDay(input);
                  await tursoDevSync.runEodUpload();
                  liveToday.refresh();
                  journal.refresh();
                } catch (error) {
                  const message =
                    error instanceof Error && error.message.trim().length > 0
                      ? error.message
                      : locale === "vi"
                        ? "Khong the khep ngay luc nay. Vui long thu lai."
                        : "Unable to close the trail right now. Please try again.";
                  Alert.alert(
                    locale === "vi" ? "Khong the khep ngay" : "Unable to Close the Trail",
                    message,
                  );
                }
              })();
            }}
            onBackToToday={() => setRouteStack([{ kind: "today" }])}
            onViewInJournal={() => jumpToTab("journal")}
            onMarkAction={handleMarkAction}
            onMoveMark={handleMoveMark}
            onOpenDependencyMark={(markId) => openMarkDetail(markId, "today")}
            onOpenDependencyPackCheck={(packCheckId) => {
              openDetail("pack_check_instance", packCheckId, "today");
            }}
            onSkipMark={handleSkipMark}
            onSubstituteWithExisting={handleSubstituteWithExisting}
            onSubstituteWithQuickMark={handleSubstituteWithQuickMark}
            withShell
          />
        );
      case "signal": {
        const signalModel = buildSignalModel(route.signalId);
        if (!signalModel) {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={
                  locale === "vi"
                    ? "Signal da mo, nhung du lieu muc tieu cua no chua san sang. Thu quay lai Today sau khi du lieu refresh."
                    : "This signal opened, but its target data is not ready yet. Try returning to Today after the data refreshes."
                }
                title={locale === "vi" ? "Signal tam thoi chua san sang" : "Signal temporarily unavailable"}
              />
            </FieldJournalScreenShell>
          );
        }

        if (signalModel.targetType === SignalTargetType.PackCheckInstance) {
          if (packCheckDetail.status === "loading" || packCheckDetail.status === "idle") {
            return (
              <FieldJournalScreenShell variant="navAware">
                <WMEmptyState
                  body={locale === "vi" ? "Dang tai du lieu Pack Check cho signal nay." : "Loading the Pack Check behind this signal."}
                  title={locale === "vi" ? "Dang mo Pack Check" : "Opening Pack Check"}
                />
              </FieldJournalScreenShell>
            );
          }

          if (!packCheckDetail.data?.packCheck) {
            return (
              <FieldJournalScreenShell variant="navAware">
                <WMEmptyState
                  body={locale === "vi" ? "Pack Check nay chua co du lieu backend." : "This Pack Check is not available from the backend yet."}
                  title={locale === "vi" ? "Khong tim thay Pack Check" : "Pack Check unavailable"}
                />
              </FieldJournalScreenShell>
            );
          }

          return (
            <PackCheckTemplate
              headerActions={
                <WMChip
                  label={locale === "vi" ? "Xoa" : "Delete"}
                  onPress={() => {
                    void (async () => {
                      await packCheckDetail.deletePackCheck();
                      liveToday.refresh();
                      journal.refresh();
                      popRoute();
                    })();
                  }}
                />
              }
              isDisabled={packCheckDetail.data.isDisabled}
              items={packCheckDetail.data.items}
              locale={locale}
              onBack={popRoute}
              onClearChecks={() => void packCheckDetail.clearChecks()}
              onComplete={handleCompletePackCheck}
              onToggleItem={(id) => {
                const item = packCheckDetail.data?.items.find((entry) => entry.id === id);
                if (!item) {
                  return;
                }
                void packCheckDetail.toggleItem(id, !item.checked);
              }}
              packCheck={packCheckDetail.data.packCheck}
              showBack
              withShell
            />
          );
        }

        if (signalModel.targetType === SignalTargetType.MarkInstance) {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={
                  locale === "vi"
                    ? "Dang mo planned mark action sheet cho signal nay."
                    : "Opening the planned mark action sheet for this signal."
                }
                title={locale === "vi" ? "Dang mo Planned Mark" : "Opening Planned Mark"}
              />
            </FieldJournalScreenShell>
          );
        }

        if (signalModel.targetType === SignalTargetType.TrailDay) {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={locale === "vi" ? "Dang mo flow khep ngay cho signal nay." : "Opening Close the Trail for this signal."}
                title={locale === "vi" ? "Dang mo Close the Trail" : "Opening Close the Trail"}
              />
            </FieldJournalScreenShell>
          );
        }
      }
      case "packCheck": {
        if (!packCheckDetail.data?.packCheck) {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={locale === "vi" ? "Pack Check nay chua co du lieu backend." : "This Pack Check is not available from the backend yet."}
                title={locale === "vi" ? "Khong tim thay Pack Check" : "Pack Check unavailable"}
              />
            </FieldJournalScreenShell>
          );
        }
        const packSignal = findSignalForPack(packCheckDetail.data.packCheck.id);

        return (
          <PackCheckTemplate
            headerActions={
              <View style={styles.packCheckHeaderActions}>
                {packSignal ? <WMChip label={locale === "vi" ? "Signal" : "Signal"} onPress={() => openSignal(packSignal.id, "today")} /> : null}
                <WMChip
                  label={locale === "vi" ? "Xoa" : "Delete"}
                  onPress={() => {
                    void (async () => {
                      await packCheckDetail.deletePackCheck();
                      liveToday.refresh();
                      journal.refresh();
                      popRoute();
                    })();
                  }}
                />
              </View>
            }
            isDisabled={packCheckDetail.data.isDisabled}
            items={packCheckDetail.data.items}
            locale={locale}
            onBack={popRoute}
            onClearChecks={() => void packCheckDetail.clearChecks()}
            onComplete={handleCompletePackCheck}
            onToggleItem={(id) => {
              const item = packCheckDetail.data?.items.find((entry) => entry.id === id);
              if (!item) {
                return;
              }
              void packCheckDetail.toggleItem(id, !item.checked);
            }}
            packCheck={packCheckDetail.data.packCheck}
            showBack
            withShell
          />
        );
      }
      case "golfPractice": {
        const markTitle = route.markTitle ?? (route.markId ? todayMarks.find((item) => item.id === route.markId)?.title.en : undefined);
        return (
          <GolfPracticeSessionTemplate
            initialWorkoutType={route.workoutType ?? "putting"}
            locale={locale}
            onBack={popRoute}
            onSave={route.mode === "review" ? undefined : handleSaveGolfPractice}
            reviewOnly={route.mode === "review"}
            reviewTitle={markTitle}
            saving={savingGolfPractice}
            shortGamePlan={markTitle ? buildGolfShortGamePracticePlanForMarkTitle(markTitle) : null}
            swingPlan={markTitle ? buildGolfProgramPracticePlanForTitle(markTitle) : null}
            workoutTypeLocked={Boolean(route.markId)}
          />
        );
      }
      case "workoutReview":
        if (workoutReview.status === "loading" || workoutReview.status === "idle") {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={locale === "vi" ? "Dang dung workout review tu routine template." : "Building the workout review from the routine template."}
                title={locale === "vi" ? "Dang tai workout review" : "Loading workout review"}
              />
            </FieldJournalScreenShell>
          );
        }
        if (workoutReview.status === "error" || !workoutReview.data) {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={workoutReview.status === "error" ? workoutReview.error.message : locale === "vi" ? "Khong tim thay routine phu hop cho mark nay." : "No matching routine is available for this mark."}
                title={locale === "vi" ? "Workout review khong kha dung" : "Workout review unavailable"}
              />
            </FieldJournalScreenShell>
          );
        }
        return <WorkoutSessionReviewTemplate data={workoutReview.data} locale={locale} onBack={popRoute} />;
      case "detail": {
        if (route.sourceType === "pack_check_instance") {
          if (!packCheckDetail.data?.packCheck) {
            return (
              <FieldJournalScreenShell variant="navAware">
                <WMEmptyState
                  body={locale === "vi" ? "Pack Check nay chua co du lieu backend." : "This Pack Check is not available from the backend yet."}
                  title={locale === "vi" ? "Khong tim thay Pack Check" : "Pack Check unavailable"}
                />
              </FieldJournalScreenShell>
            );
          }

          return (
            <PackCheckTemplate
              headerActions={
                <WMChip
                  label={locale === "vi" ? "Xoa" : "Delete"}
                  onPress={() => {
                    void (async () => {
                      await packCheckDetail.deletePackCheck();
                      liveToday.refresh();
                      journal.refresh();
                      popRoute();
                    })();
                  }}
                />
              }
              isDisabled={packCheckDetail.data.isDisabled}
              items={packCheckDetail.data.items}
              locale={locale}
              onBack={popRoute}
              onClearChecks={() => void packCheckDetail.clearChecks()}
              onComplete={handleCompletePackCheck}
              onToggleItem={(id) => {
                const item = packCheckDetail.data?.items.find((entry) => entry.id === id);
                if (!item) {
                  return;
                }
                void packCheckDetail.toggleItem(id, !item.checked);
              }}
              packCheck={packCheckDetail.data.packCheck}
              showBack
              withShell
            />
          );
        }

        const detailItem =
          route.sourceType === "mark_instance"
            ? markDetail.mark
            : route.sourceType === "memory"
              ? memoryDetail.memory
            : route.sourceType === "backlog_item"
              ? backlog.detailById[route.sourceId] ?? null
              : null;

        if (!detailItem && route.sourceType === "memory" && memoryDetail.status === "loading") {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={locale === "vi" ? "Waymark dang lay noi dung memory nay." : "Waymark is loading this memory."}
                title={locale === "vi" ? "Dang tai memory" : "Loading memory"}
              />
            </FieldJournalScreenShell>
          );
        }

        if (!detailItem) {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={locale === "vi" ? "Chi tiet nay chua san sang tu backend." : "This detail is not available from the backend yet."}
                title={locale === "vi" ? "Khong tim thay chi tiet" : "Detail unavailable"}
              />
            </FieldJournalScreenShell>
          );
        }

        const activeSignal = route.sourceType === "mark_instance" ? findSignalForMark(detailItem.id) : null;
        const actionButtons = activeSignal
          ? [
              {
                id: "open-signal",
                label: locale === "vi" ? "Signal" : "Signal",
                variant: "secondary" as const,
                onPress: () => openSignal(activeSignal.id, route.parentTab),
              },
            ]
          : undefined;

        if (route.sourceType === "backlog_item") {
          return (
            <BacklogDetailTemplate
              item={detailItem}
              locale={locale}
              onBack={popRoute}
              onDelete={() => {
                void (async () => {
                  await backlog.deleteItem(detailItem.id);
                  popRoute();
                })();
              }}
              onOpenExpedition={(expedition) => openExpedition(expedition.id, route.parentTab)}
            />
          );
        }

        if (route.sourceType === "memory") {
          return (
            <MemoryDetailScreen
              actionButtons={[
                {
                  id: "delete-memory",
                  label: locale === "vi" ? "Xoa" : "Delete",
                  variant: "secondary",
                  onPress: () => {
                    void (async () => {
                      await memoryDetail.deleteMemory();
                      journal.refresh();
                      popRoute();
                    })();
                  },
                },
              ]}
              locale={locale}
              mark={detailItem}
              onBack={popRoute}
              onOpenExpedition={(expedition) => openExpedition(expedition.id, route.parentTab)}
            />
          );
        }

        return (
          <MarkDetailScreen
            actionButtons={[
              ...(actionButtons ?? []),
              ...(route.sessionReview
                ? [
                    {
                      id: "review-session",
                      label: route.sessionReview.kind === "strength_session" ? "Review Workout" : "Review Golf Session",
                      variant: "secondary" as const,
                      onPress: () => openWeeklySessionReview(route.sourceId, route.sessionReview!, route.parentTab),
                    },
                  ]
                : []),
              {
                id: "delete-mark",
                label: locale === "vi" ? "Xoa" : "Delete",
                variant: "secondary" as const,
                onPress: () => {
                  void (async () => {
                    await markDetail.deleteMark();
                    liveToday.refresh();
                    journal.refresh();
                    popRoute();
                  })();
                },
              },
            ]}
            locale={locale}
            mark={detailItem}
            onBack={popRoute}
            onMarkAsMemory={
              route.sourceType === "mark_instance"
                ? (mark) => {
                    const pathId = mark.path.id;
                    if (!pathId || !isUiPathId(pathId)) {
                      Alert.alert(locale === "vi" ? "Path chua san sang" : "Path is not ready yet");
                      return;
                    }

                    void (async () => {
                      await journal.createMemory(mark.title, mark.note ?? "", pathId);
                      jumpToTab("journal");
                    })();
                  }
                : undefined
            }
            onOpenExpedition={(expedition) => openExpedition(expedition.id, route.parentTab)}
          />
        );
      }
      case "strengthSession":
        if (strengthSession.status === "loading") {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={locale === "vi" ? "Dang tai du lieu buoi tap..." : "Loading workout session..."}
                title={locale === "vi" ? "Dang mo buoi tap" : "Opening workout session"}
              />
            </FieldJournalScreenShell>
          );
        }

        if (strengthSession.status === "error") {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={strengthSession.error.message}
                title={locale === "vi" ? "Khong mo duoc buoi tap" : "Unable to open workout session"}
              />
            </FieldJournalScreenShell>
          );
        }

        if (!strengthReadModel || !resolvedStrengthSession) {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={
                  locale === "vi"
                    ? "Workout mark nay chua co session backend de tiep tuc."
                    : "This workout mark does not have a backend session to continue yet."
                }
                title={locale === "vi" ? "Khong tim thay buoi tap" : "Workout session unavailable"}
              />
            </FieldJournalScreenShell>
          );
        }

        return (
          <StrengthSessionTemplate
            debugActions={buildHealthEngineDebugActions()}
            onBack={popRoute}
            onChangeWeight={handleStrengthWeightChange}
            onEndSession={handleEndStrengthSession}
            onPressExercise={handleStrengthExercisePress}
            onPrimaryAction={handleStrengthPrimaryAction}
            onReset={handleResetStrengthSession}
            session={resolvedStrengthSession}
            withShell
          />
        );
      case "expeditionDetail":
        if (!expeditionDetail.expedition) {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={locale === "vi" ? "Expedition nay chua co du lieu backend." : "This expedition does not exist in the backend yet."}
                title={locale === "vi" ? "Khong tim thay expedition" : "Expedition unavailable"}
              />
            </FieldJournalScreenShell>
          );
        }
        return (
          <ExpeditionDetailTemplate
            expedition={expeditionDetail.expedition}
            locale={locale}
            milestones={expeditionDetail.milestones}
            onBack={popRoute}
            onCompleteMilestone={(milestoneId) => void expeditionDetail.completeMilestone(milestoneId)}
            onOpenMarkDetail={(markId) => void openMarkByStatus(markId, route.parentTab)}
            onRescheduleMilestone={(milestoneId) => void expeditionDetail.rescheduleMilestone(milestoneId)}
            onSkipMilestone={(milestoneId) => void expeditionDetail.skipMilestone(milestoneId)}
            unassignedMarks={expeditionDetail.unassignedMarks}
          />
        );
      case "pathDetail":
        if (!pathDetail.data.path) {
          return (
            <FieldJournalScreenShell variant="navAware">
              <WMEmptyState
                body={locale === "vi" ? "Path nay chua co du lieu seed hoac rich copy canonical." : "This path does not have seed data or canonical rich copy yet."}
                title={locale === "vi" ? "Path dang trong" : "Path is empty"}
              />
            </FieldJournalScreenShell>
          );
        }
        return (
          <PathDetailTemplate
            expeditions={pathDetail.data.expeditions}
            locale={locale}
            nextMarks={pathDetail.data.nextMarks}
            onBack={popRoute}
            onCompleteMilestone={(milestoneId) => void pathDetail.completeMilestone(milestoneId)}
            onOpenExpedition={(item) => openExpedition(item.id, "paths")}
            onOpenMilestoneMark={(item) => void openMarkByStatus(item.id, "paths")}
            onOpenNextMark={(item) => void openMarkByStatus(item.id, "paths")}
            onOpenProof={(item) => {
              if (item.kind === "mark") {
                void openMarkByStatus(item.id, "paths");
                return;
              }
              jumpToTab("journal");
            }}
            onRescheduleMilestone={(milestoneId) => void pathDetail.rescheduleMilestone(milestoneId)}
            onSkipMilestone={(milestoneId) => void pathDetail.skipMilestone(milestoneId)}
            onViewAllExpeditions={pathDetail.data.expeditions[0] ? () => openExpedition(pathDetail.data.expeditions[0].id, "paths") : undefined}
            path={pathDetail.data.path}
            primaryAction={
              pathDetail.data.path.pathId === "golf"
                ? { label: locale === "vi" ? "Log Golf Practice" : "Log Golf Practice", onPress: () => openGolfPractice("paths") }
                : undefined
            }
            proofs={pathDetail.data.proofs}
            showBottomNav={false}
          />
        );
      case "backlog":
        return (
          <BacklogTemplate
            featureFlags={{
              canCreateMarkFromBacklog: false,
              canDeleteBacklogItem: true,
              hasBacklogDetail: true,
            }}
            items={backlog.items}
            locale={locale}
            onBack={popRoute}
            onDeleteBacklogItem={(itemId) => void backlog.deleteItem(itemId)}
            onOpenBacklogItem={(itemId) => openBacklogDetail(itemId, "me")}
            onQueryChange={() => undefined}
          />
        );
      case "weeklyTimetable":
        return (
          <WeeklyTimetableReviewTemplate
            errorMessage={weeklyMilestones.error?.message}
            dayNavigatorDays={weeklyTimetableDayNavigatorDays}
            dayReviewErrorMessage={dayReview.error?.message}
            dayReviewHasWeeklyTimetableForDate={dayReview.hasWeeklyTimetableForDate}
            dayReviewMarks={dayReview.marks}
            dayReviewPlannedItemCount={dayReview.plannedItemCount}
            dayReviewStatus={dayReview.status}
            locale={locale}
            milestones={weeklyMilestones.items}
            nextWeekDisabled={weekly.nextWeekDisabled}
            onBack={popRoute}
            onCompleteMilestone={(milestoneId) => void completeWeeklyMilestone(milestoneId)}
            onMoveMilestone={(milestoneId) => void moveWeeklyMilestone(milestoneId)}
            onNextWeek={weekly.nextWeek}
            onOpenExpedition={(expeditionId) => openExpedition(expeditionId, "me")}
            onOpenMark={(milestone, mark) => openWeeklyMilestoneMark(milestone, mark, "me", "weekly_timetable")}
            onOpenDayReviewMark={openDayReviewMark}
            onOpenPath={(pathId) => pushRoute({ kind: "pathDetail", pathId })}
            onPreviousWeek={weekly.previousWeek}
            onSelectDayDate={setSelectedWeeklyTimetableDayDate}
            onSkipMilestone={(milestoneId) => void skipWeeklyMilestone(milestoneId)}
            previousWeekDisabled={weekly.previousWeekDisabled}
            selectedDayDate={selectedWeeklyTimetableDayDate}
            selectedDayLabel={selectedWeeklyTimetableDayLabel}
            selectedWeekDateRange={weekly.selectedWeekDateRange}
            selectedWeekLabel={weekly.selectedWeekLabel}
            showBack
            status={weeklyMilestones.status}
          />
        );
      case "weeklySignal":
        return (
          <WeeklySignalReviewTemplate
            days={weekly.signalDays}
            locale={locale}
            nextWeekDisabled={weekly.nextWeekDisabled}
            onBack={popRoute}
            onNextWeek={weekly.nextWeek}
            onOpenSignal={(signalId) => openSignal(signalId, "me")}
            onPreviousWeek={weekly.previousWeek}
            previousWeekDisabled={weekly.previousWeekDisabled}
            selectedWeekDateRange={weekly.selectedWeekDateRange}
            selectedWeekLabel={weekly.selectedWeekLabel}
            showBack
            summary={weekly.signalSummary}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <View style={styles.root}>
      {route.kind === "strengthSession" && resolvedStrengthSession ? (
        <StrengthSessionAudioEffects session={resolvedStrengthSession} />
      ) : null}
      {screen}
      {route.kind !== "strengthSession" && route.kind !== "workoutReview" && route.kind !== "golfPractice" ? (
        <BottomNavBar activeTab={activeTab} locale={locale} onCaptureDestinationPress={handleCaptureDestination} onTabPress={jumpToTab} />
      ) : null}
      <Modal
        animationType="fade"
        onRequestClose={() => setTursoLinkModalOpen(false)}
        transparent
        visible={tursoLinkModalOpen}
      >
        <View style={styles.tursoModalRoot}>
          <View style={styles.tursoModalCard}>
            <WMText style={styles.tursoModalTitle} variant="sectionTitle">
              {locale === "vi" ? "Link Waymark voi Turso" : "Link Waymark with Turso"}
            </WMText>
            <WMText style={styles.tursoModalBody} variant="bodySm">
              {locale === "vi"
                ? "Dan database URL va auth token tu Turso. Waymark se test connection roi luu credential vao SecureStore tren thiet bi nay."
                : "Paste the database URL and auth token from Turso. Waymark will test the connection and save the credential in SecureStore on this device."}
            </WMText>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onChangeText={setTursoLinkUrl}
              placeholder="libsql://..."
              placeholderTextColor={foundationColors.ink.tertiary}
              style={styles.tursoInput}
              value={tursoLinkUrl}
            />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              onChangeText={setTursoLinkToken}
              placeholder={locale === "vi" ? "Turso auth token" : "Turso auth token"}
              placeholderTextColor={foundationColors.ink.tertiary}
              secureTextEntry={false}
              style={[styles.tursoInput, styles.tursoTokenInput]}
              value={tursoLinkToken}
            />
            <View style={styles.tursoModalActions}>
              <WMButton
                label={locale === "vi" ? "Huy" : "Cancel"}
                onPress={() => setTursoLinkModalOpen(false)}
                variant="secondary"
              />
              <WMButton
                disabled={!tursoLinkUrl.trim() || !tursoLinkToken.trim() || tursoDevSync.disabled}
                label={locale === "vi" ? "Link Turso" : "Link Turso"}
                loading={tursoDevSync.status === "uploading"}
                onPress={handleSubmitTursoLink}
              />
            </View>
          </View>
        </View>
      </Modal>
      <TodayMarkActionSheet
        item={selectedTodayMark}
        locale={locale}
        mode={liveTodayData?.dailyPlanMode ?? "execution"}
        marks={todayMarks}
        pathOptions={substituteHierarchyOptions.pathOptions}
        expeditionOptions={substituteHierarchyOptions.expeditionOptions}
        milestoneOptions={substituteHierarchyOptions.milestoneOptions}
        onClose={() => setSelectedTodayMark(null)}
        onMark={handleMarkAction}
        onMove={handleMoveMark}
        onOpenDependencyMark={(markId) => {
          setSelectedTodayMark(null);
          openMarkDetail(markId, "today");
        }}
        onOpenDependencyPackCheck={(packCheckId) => {
          setSelectedTodayMark(null);
          const dependencyPack = todayPackChecks.find((pack) => pack.id === packCheckId);
          if (dependencyPack) {
            openPackCheck(dependencyPack);
            return;
          }
          pushRoute({ kind: "packCheck", packId: packCheckId });
        }}
        onSkip={handleSkipMark}
        onUpdateNote={handleUpdateMarkNote}
        onToggleEmbeddedChecklistItem={(markId, packCheckId, itemId, checked) => {
          void liveToday.toggleEmbeddedChecklistItem(markId, packCheckId, itemId, checked);
        }}
        onSubstituteWithQuickMark={handleSubstituteWithQuickMark}
        visible={route.kind === "today" && selectedTodayMark !== null}
      />
      <TodayMarkActionSheet
        allowPrimaryActionInReview={selectedWeeklyMark?.interactionKind === "strength_session" || selectedWeeklyMark?.interactionKind === "golf_practice"}
        item={selectedWeeklyMark}
        locale={locale}
        marks={selectedWeeklyMark ? [selectedWeeklyMark] : []}
        mode={selectedWeeklyMarkActionMode}
        pathOptions={substituteHierarchyOptions.pathOptions}
        expeditionOptions={substituteHierarchyOptions.expeditionOptions}
        milestoneOptions={substituteHierarchyOptions.milestoneOptions}
        onClose={() => {
          setSelectedWeeklyMark(null);
          setSelectedWeeklyMarkActionMode("execution");
        }}
        onMark={handleWeeklyMarkAction}
        onMove={handleWeeklyMoveMark}
        onSkip={handleWeeklySkipMark}
        onSubstituteWithExisting={handleSubstituteWithExisting}
        onSubstituteWithQuickMark={handleSubstituteWithQuickMark}
        onUpdateNote={handleWeeklyUpdateMarkNote}
        visible={isContextMarkActionSheetRoute(route.kind) && selectedWeeklyMark !== null}
      />
    </View>
  );
}

type DailyJournalTrailTestMarkFixture = {
  order: number;
  localDate: string;
  pathId: PathId;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  completedTime: string;
  resolvedTime?: string;
  status?: MarkInstanceStatus;
  resolutionKind?: MarkResolutionKind;
  completionSummary: string;
  proofNote: string;
  testFocus?: "grey";
};

function buildDailyJournalTrailTestMarkFixtures(todayLocalDate: string): DailyJournalTrailTestMarkFixture[] {
  const daySpecs = [
    {
      offset: 0,
      entries: [
        {
          pathId: "health" as const,
          title: "Workout Day A",
          description: "Daily Journal trail fixture: completed strength workout.",
          startTime: "05:30",
          endTime: "06:20",
          completedTime: "06:18",
          completionSummary: "Finished the full strength block with steady tempo.",
          proofNote: "Resolved for Daily Journal trail testing.",
        },
        {
          pathId: "family" as const,
          title: "Morning Food Intake — Brainfood baseline",
          description: "Daily Journal trail fixture: family breakfast baseline.",
          startTime: "07:00",
          endTime: "07:25",
          completedTime: "07:22",
          completionSummary: "Prepared breakfast and logged the morning baseline.",
          proofNote: "Breakfast routine completed.",
        },
        {
          pathId: "golf" as const,
          title: "Golf Swing Practice",
          description: "Daily Journal trail fixture: compact golf session.",
          startTime: "12:00",
          endTime: "12:30",
          completedTime: "12:28",
          completionSummary: "Completed a focused swing rhythm session.",
          proofNote: "Good contact pattern held through the last set.",
        },
      ],
    },
    {
      offset: -1,
      entries: [
        {
          pathId: "career" as const,
          title: "Waymark UI review pass",
          description: "Daily Journal trail fixture: product/UI review mark.",
          startTime: "09:00",
          endTime: "10:15",
          completedTime: "10:12",
          completionSummary: "Reviewed Daily Journal UI details and noted follow-ups.",
          proofNote: "Review pass completed.",
        },
        {
          pathId: "character" as const,
          title: "Stoic reset after interruption",
          description: "Daily Journal trail fixture: character protection mark.",
          startTime: "14:30",
          endTime: "14:45",
          completedTime: "14:43",
          completionSummary: "Paused, reset, and returned without letting the interruption steer the day.",
          proofNote: "Protected attention after interruption.",
        },
        {
          pathId: "family" as const,
          title: "Evening family check-in",
          description: "Daily Journal trail fixture: evening family connection.",
          startTime: "20:00",
          endTime: "20:30",
          completedTime: "20:27",
          completionSummary: "Closed the evening with a short family check-in.",
          proofNote: "Family check-in completed.",
        },
      ],
    },
    {
      offset: -2,
      entries: [
        {
          pathId: "health" as const,
          title: "Walk recovery block",
          description: "Daily Journal trail fixture: recovery walk.",
          startTime: "06:20",
          endTime: "06:50",
          completedTime: "06:48",
          completionSummary: "Kept the recovery walk easy and consistent.",
          proofNote: "Recovery completed.",
        },
        {
          pathId: "culture" as const,
          title: "Culture reading notes",
          description: "Daily Journal trail fixture: short culture reading.",
          startTime: "21:00",
          endTime: "21:25",
          completedTime: "21:22",
          completionSummary: "Captured a few useful reading notes before bed.",
          proofNote: "Reading notes saved.",
        },
        {
          pathId: "golf" as const,
          title: "Putting ladder drill",
          description: "Daily Journal trail fixture: putting ladder practice.",
          startTime: "17:30",
          endTime: "18:00",
          completedTime: "17:58",
          completionSummary: "Completed the putting ladder drill with calm pace control.",
          proofNote: "Putting ladder complete.",
        },
      ],
    },
    {
      localDate: "2026-07-22",
      entries: [
        {
          pathId: "career" as const,
          title: "Move deep work block after production interruption",
          description: "Daily Journal grey fixture: mark was rescheduled instead of completed.",
          startTime: "08:30",
          endTime: "09:45",
          completedTime: "09:40",
          resolvedTime: "09:40",
          status: MarkInstanceStatus.Rescheduled,
          resolutionKind: "honestly_resolved_rescheduled" as const,
          completionSummary: "Moved the deep work block after a production interruption.",
          proofNote: "Rescheduled honestly for Daily Journal grey testing.",
          testFocus: "grey" as const,
        },
        {
          pathId: "health" as const,
          title: "Skip recovery walk after poor sleep",
          description: "Daily Journal grey fixture: skipped health mark.",
          startTime: "11:00",
          endTime: "11:30",
          completedTime: "11:22",
          resolvedTime: "11:22",
          status: MarkInstanceStatus.Skipped,
          resolutionKind: "not_kept" as const,
          completionSummary: "Skipped recovery walk because sleep debt was too high.",
          proofNote: "Not kept for Daily Journal grey testing.",
          testFocus: "grey" as const,
        },
        {
          pathId: "family" as const,
          title: "Substitute family errand with short check-in",
          description: "Daily Journal grey fixture: substituted family mark.",
          startTime: "15:00",
          endTime: "15:40",
          completedTime: "15:35",
          resolvedTime: "15:35",
          status: MarkInstanceStatus.Substituted,
          resolutionKind: "honestly_resolved_substituted" as const,
          completionSummary: "Substituted the errand with a short check-in.",
          proofNote: "Substituted honestly for Daily Journal grey testing.",
          testFocus: "grey" as const,
        },
        {
          pathId: "golf" as const,
          title: "Skip putting drill because of rain",
          description: "Daily Journal grey fixture: skipped golf mark.",
          startTime: "17:30",
          endTime: "18:00",
          completedTime: "17:52",
          resolvedTime: "17:52",
          status: MarkInstanceStatus.Skipped,
          resolutionKind: "not_kept" as const,
          completionSummary: "Skipped putting drill because the practice area was rained out.",
          proofNote: "Not kept for Daily Journal grey testing.",
          testFocus: "grey" as const,
        },
      ],
    },
  ];

  let order = 0;
  return daySpecs.flatMap((day) => {
    const localDate =
      "localDate" in day && day.localDate ? day.localDate : shiftLocalDateKey(todayLocalDate, day.offset ?? 0);
    return day.entries.map((entry) => ({
      ...entry,
      order: (order += 1),
      localDate,
    }));
  });
}

function mapWeeklyMilestoneMarkToTodayItem(
  milestone: WeeklyMilestoneItem,
  mark: WeeklyMilestoneMarkItem,
  locale: Locale,
): TodayMarkItem {
  const status = mapWeeklyMarkStatus(mark.status);
  const statusLabel = humanizeWeeklyMarkStatus(status, locale);
  return {
    id: mark.id,
    title: { en: mark.title, vi: mark.title },
    pathId: milestone.pathId,
    pathEntityId: milestone.pathRecordId,
    expeditionId: milestone.expeditionId,
    milestoneId: milestone.id,
    status,
    summary: mark.description ? { en: mark.description, vi: mark.description } : undefined,
    timeLabel: buildWeeklyMarkTimeLabel(mark),
    detailEnabled: true,
    actionSheet: {
      statusLabel: { en: humanizeWeeklyMarkStatus(status, "en"), vi: humanizeWeeklyMarkStatus(status, "vi") },
      intentionText: mark.description ? { en: mark.description, vi: mark.description } : undefined,
      periodLabel: { en: `${mark.dayLabel} ${formatWeeklyMarkDate(mark.localDate)}`, vi: `${mark.dayLabel} ${formatWeeklyMarkDate(mark.localDate)}` },
      expeditionLabel: { en: milestone.expeditionTitle, vi: milestone.expeditionTitle },
      milestoneLabel: { en: milestone.title, vi: milestone.title },
      primaryActionLabel: { en: "Complete", vi: "Complete" },
      primaryActionHint: {
        en: `Complete this mark for ${milestone.title}.`,
        vi: `Complete mark nay cho milestone ${milestone.title}.`,
      },
    },
    accessibilityLabel: { en: `${statusLabel}: ${mark.title}`, vi: `${statusLabel}: ${mark.title}` },
  };
}

function mapMarkInstanceToActionSheetItem(
  mark: MarkInstance,
  detail: MarkInstanceDetail | null,
  locale: Locale,
  context: {
    path: { id: string; slug?: string; title: string } | null;
    expeditionTitle?: string;
    milestoneTitle?: string;
  },
): TodayMarkItem {
  const pathId = mapUiPathId(context.path?.slug, context.path?.title) ?? "career";
  const status = mapMarkInstanceStatusToTodayStatus(mark.status);
  const statusLabel = humanizeMarkInstanceStatus(mark.status, locale);
  const primerText = detail?.primerSnapshot?.trim() || mark.description;
  const markNote = detail?.preActionComment?.trim();
  return {
    id: mark.id,
    title: { en: mark.title, vi: mark.title },
    pathId,
    pathEntityId: context.path?.id ?? mark.pathId,
    expeditionId: mark.expeditionId,
    milestoneId: mark.milestoneId,
    status,
    summary: primerText ? { en: primerText, vi: primerText } : undefined,
    timeLabel: buildMarkInstanceTimeLabel(mark),
    sortAt: mark.scheduledStartAt ?? mark.dueAt ?? mark.createdAt,
    detailEnabled: true,
    actionSheet: {
      statusLabel: { en: humanizeMarkInstanceStatus(mark.status, "en"), vi: humanizeMarkInstanceStatus(mark.status, "vi") },
      intentionText: primerText ? { en: primerText, vi: primerText } : undefined,
      markNote: markNote ? { en: markNote, vi: markNote } : undefined,
      periodLabel: buildMarkInstancePeriodLabel(mark),
      expeditionLabel: context.expeditionTitle ? { en: context.expeditionTitle, vi: context.expeditionTitle } : undefined,
      milestoneLabel: context.milestoneTitle ? { en: context.milestoneTitle, vi: context.milestoneTitle } : undefined,
      primaryActionLabel: { en: "Complete", vi: "Complete" },
      primaryActionHint: {
        en: `Complete ${mark.title}.`,
        vi: `Complete mark ${mark.title}.`,
      },
    },
    accessibilityLabel: { en: `${statusLabel}: ${mark.title}`, vi: `${statusLabel}: ${mark.title}` },
  };
}

function mapWeeklyMarkStatus(status: WeeklyMilestoneMarkItem["status"]): TodayMarkStatus {
  switch (status) {
    case "completed":
    case "partially_completed":
    case "skipped":
    case "rescheduled":
    case "substituted":
    case "cancelled":
      return "done";
    case "expired":
      return "overdue";
    case "blocked":
      return "blocked";
    case "active":
    case "ready":
      return "ready";
    case "planned":
    default:
      return "needs_decision";
  }
}

function humanizeWeeklyMarkStatus(status: TodayMarkStatus, locale: Locale) {
  const labels: Record<TodayMarkStatus, Record<Locale, string>> = {
    ready: { en: "Ready", vi: "San sang" },
    dependency_required: { en: "Dependency Required", vi: "Can phu thuoc" },
    blocked: { en: "Blocked", vi: "Bi chan" },
    ready_with_advisory: { en: "Ready", vi: "San sang" },
    ready_with_waiver: { en: "Ready", vi: "San sang" },
    needs_decision: { en: "Planned", vi: "Da len ke hoach" },
    done: { en: "Done", vi: "Da xong" },
    resolved: { en: "Resolved", vi: "Da xu ly" },
    overdue: { en: "Overdue", vi: "Qua han" },
  };
  return labels[status][locale];
}

function mapMarkInstanceStatusToTodayStatus(status: MarkInstanceStatus): TodayMarkStatus {
  switch (status) {
    case MarkInstanceStatus.Completed:
    case MarkInstanceStatus.PartiallyCompleted:
      return "done";
    case MarkInstanceStatus.Expired:
      return "overdue";
    case MarkInstanceStatus.Blocked:
      return "blocked";
    case MarkInstanceStatus.Active:
    case MarkInstanceStatus.Ready:
      return "ready";
    case MarkInstanceStatus.Skipped:
    case MarkInstanceStatus.Rescheduled:
    case MarkInstanceStatus.Substituted:
    case MarkInstanceStatus.Cancelled:
      return "resolved";
    case MarkInstanceStatus.Planned:
    default:
      return "needs_decision";
  }
}

function humanizeMarkInstanceStatus(status: MarkInstanceStatus, locale: Locale) {
  const labels: Record<MarkInstanceStatus, Record<Locale, string>> = {
    [MarkInstanceStatus.Planned]: { en: "Planned", vi: "Da len ke hoach" },
    [MarkInstanceStatus.Ready]: { en: "Ready", vi: "San sang" },
    [MarkInstanceStatus.Blocked]: { en: "Blocked", vi: "Bi chan" },
    [MarkInstanceStatus.Active]: { en: "Active", vi: "Dang lam" },
    [MarkInstanceStatus.Completed]: { en: "Done", vi: "Da xong" },
    [MarkInstanceStatus.PartiallyCompleted]: { en: "Partially done", vi: "Da lam mot phan" },
    [MarkInstanceStatus.Skipped]: { en: "Skipped", vi: "Da skip" },
    [MarkInstanceStatus.Rescheduled]: { en: "Rescheduled", vi: "Da doi lich" },
    [MarkInstanceStatus.Substituted]: { en: "Substituted", vi: "Da thay the" },
    [MarkInstanceStatus.Expired]: { en: "Expired", vi: "Qua han" },
    [MarkInstanceStatus.Cancelled]: { en: "Cancelled", vi: "Da huy" },
  };
  return labels[status][locale];
}

function buildMarkInstanceTimeLabel(mark: MarkInstance): TodayMarkItem["timeLabel"] | undefined {
  const value = mark.scheduledStartAt ?? mark.dueAt ?? mark.completedAt;
  if (!value) {
    return undefined;
  }
  const label = formatWeeklyMarkDate(value.slice(0, 10));
  return { en: label, vi: label };
}

function buildMarkInstancePeriodLabel(mark: MarkInstance): NonNullable<TodayMarkItem["actionSheet"]>["periodLabel"] {
  const start = mark.scheduledStartAt ?? mark.dueAt ?? mark.createdAt;
  const date = formatWeeklyMarkDate(start.slice(0, 10));
  const startTime = mark.scheduledStartAt?.includes("T") ? mark.scheduledStartAt.slice(11, 16) : undefined;
  const endTime = mark.scheduledEndAt?.includes("T") ? mark.scheduledEndAt.slice(11, 16) : undefined;
  const time = startTime && endTime ? `${startTime}-${endTime}` : startTime;
  const label = time ? `${date} ${time}` : date;
  return { en: label, vi: label };
}

function buildWeeklyMarkTimeLabel(mark: WeeklyMilestoneMarkItem): TodayMarkItem["timeLabel"] | undefined {
  const start = mark.scheduledStartAt;
  const end = mark.scheduledEndAt;
  const date = start || mark.dueAt || end;
  if (!date) {
    return undefined;
  }

  const enOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const viOptions: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  const enStart = start ? new Date(start).toLocaleTimeString("en-US", enOptions) : undefined;
  const viStart = start ? new Date(start).toLocaleTimeString("vi-VN", viOptions) : undefined;
  const enEnd = end ? new Date(end).toLocaleTimeString("en-US", enOptions) : undefined;
  const viEnd = end ? new Date(end).toLocaleTimeString("vi-VN", viOptions) : undefined;

  if (enStart && enEnd && viStart && viEnd) {
    return { en: `${enStart}-${enEnd}`, vi: `${viStart}-${viEnd}` };
  }

  return {
    en: new Date(date).toLocaleTimeString("en-US", enOptions),
    vi: new Date(date).toLocaleTimeString("vi-VN", viOptions),
  };
}

function formatWeeklyMarkDate(localDate: string) {
  const [, month, day] = localDate.split("-");
  return day && month ? `${day}/${month}` : localDate;
}

type WeeklyTimetableDayCountSource = {
  localDate: string | null;
  items: Array<{
    createdMarkInstanceId?: string;
  }>;
};

function buildWeeklyTimetableDayNavigatorDays(
  weekStart: string,
  locale: Locale,
  today: string,
  reviewDays: WeeklyTimetableDayCountSource[],
  loadedReviewDate: string | null,
  loadedReviewMarkCount: number,
) {
  const dayByDate = new Map(reviewDays.filter((day) => day.localDate).map((day) => [day.localDate!, day]));

  return Array.from({ length: 7 }, (_, index) => {
    const localDate = shiftLocalDate(weekStart, index);
    const source = dayByDate.get(localDate);
    const fallbackMarkCount = source?.items.filter((item) => item.createdMarkInstanceId).length ?? 0;
    return {
      localDate,
      weekdayLabel: formatWeeklyTimetableWeekdayLabel(localDate, locale),
      dateLabel: formatWeeklyTimetableShortDateLabel(localDate),
      plannedItemCount: source?.items.length ?? 0,
      markCount: localDate === loadedReviewDate ? loadedReviewMarkCount : fallbackMarkCount,
      isToday: localDate === today,
    };
  });
}

function formatWeeklyTimetableWeekdayLabel(localDate: string, locale: Locale) {
  return new Date(`${localDate}T00:00:00.000Z`).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "short",
  });
}

function formatWeeklyTimetableShortDateLabel(localDate: string) {
  const [, month, day] = localDate.split("-");
  return day && month ? `${day}/${month}` : localDate;
}

function formatWeeklyTimetableDayLabel(localDate: string, locale: Locale) {
  return new Date(`${localDate}T00:00:00.000Z`).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function getLocalDateDiff(left: string, right: string) {
  const leftTime = new Date(`${left}T00:00:00.000Z`).getTime();
  const rightTime = new Date(`${right}T00:00:00.000Z`).getTime();
  return Math.round((leftTime - rightTime) / 86400000);
}

function clampDayOffset(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(6, value));
}

function isContextMarkActionSheetRoute(kind: AppRoute["kind"]) {
  return kind === "paths" || kind === "pathDetail" || kind === "expeditionDetail" || kind === "weeklyTimetable";
}

function buildWaymarkLocalDateTime(localDate: string, time: string) {
  return `${localDate}T${time}:00.000`;
}

function shiftLocalDateKey(localDate: string, offsetDays: number) {
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function buildLocalDateTimeIso(localDate: string, time: string) {
  return new Date(`${localDate}T${time}:00`).toISOString();
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  todayErrorState: {
    flex: 1,
    justifyContent: "center",
  },
  packCheckHeaderActions: {
    flexDirection: "row",
    gap: 8,
  },
  tursoModalRoot: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(16, 24, 20, 0.42)",
  },
  tursoModalCard: {
    gap: spacing.md,
    borderRadius: 18,
    padding: spacing.lg,
    backgroundColor: foundationColors.bg.paper,
  },
  tursoModalTitle: {
    color: foundationColors.ink.primary,
  },
  tursoModalBody: {
    color: foundationColors.ink.secondary,
  },
  tursoInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: foundationColors.ink.primary,
    backgroundColor: foundationColors.bg.app,
  },
  tursoTokenInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  tursoModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
});
