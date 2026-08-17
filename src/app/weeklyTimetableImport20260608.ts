import type { MarkInstance, PackCheckInstance, Signal, WaymarkRepositories } from "../domain/waymark";
import { PackCheckInstanceStatus, SignalStatus, SignalTargetType } from "../domain/waymark/enums";
import type { PackCheckEngine, SignalEngine } from "../domain/waymark/services";
import { importWeeklyTimetable, type WeeklyTimetableImportReport, type WeeklyTimetableImportSlotInput } from "../lib/waymark/weeklyTimetableImport";
import { bootstrapWaymarkMap } from "../waymark-map/bootstrap";
import { WAYMARK_MAP_CONFIG } from "../waymark-map";
import { findSeedRecordBySource } from "../waymark-map/seedRegistry";
import { buildZonedDateTime } from "./waymarkUi";

function slot(
  localDate: string,
  startTime: string,
  endTime: string,
  title: string,
  pathId: string,
  blockKey: string,
  expeditionId?: string,
  milestoneId?: string,
  note?: string,
): WeeklyTimetableImportSlotInput {
  return {
    localDate,
    startTime,
    endTime,
    title,
    pathId,
    pathRef: pathRefFromId(pathId),
    blockKey,
    expeditionId,
    milestoneId,
    description: note,
  };
}

const PATH_CAREER = "path_mpuywm3c_2mk36507";
const PATH_SNAG = "path_mpuywm3s_mny5kr8i";
const PATH_FAMILY = "path_mpuywm4a_c5gk1p07";
const PATH_HEALTH = "path_mpuywm4t_l3n1hknd";
const PATH_GOLF = "path_mpuywm5w_fvr4zcd4";

const PATH_SEED_CAREER = "career";
const PATH_SEED_SNAG = "snag";
const PATH_SEED_FAMILY = "family";
const PATH_SEED_HEALTH = "health";
const PATH_SEED_GOLF = "golf";

const EXPEDITION_SEED_SCH = "career.sch.expedition.smart-counter-hub-project";
const EXPEDITION_SEED_SNAG = "snag.growth.expedition";
const EXPEDITION_SEED_ENGLISH = "family.english.expedition";
const EXPEDITION_SEED_WAYMARK = "family.waymark.expedition";
const EXPEDITION_SEED_CUT_TO_70 = "health.cut70.expedition";
const EXPEDITION_SEED_GOLF = "golf.beginning.expedition";

const MILESTONE_SEED_SCH_QLSD = "career.sch.milestone.2026-06.card-onboarding-release";
const MILESTONE_SEED_SCH_FINANCIAL = "career.sch.milestone.2026-08.credit-card-debt-collection-adjustment";
const MILESTONE_SEED_SCH_FORM = "career.sch.milestone.2026-08.auto-qlsd-form";
const MILESTONE_SEED_SCH_PHT = "career.sch.milestone.2026-10.international-domestic-debit-pht";
const MILESTONE_SEED_SNAG_DASHBOARD = "snag.growth.milestone.dashboard-analysis";
const MILESTONE_SEED_ENGLISH = "family.english.milestone.grammar-book";
const MILESTONE_SEED_WAYMARK = "family.waymark.milestone.anniversary-edition";
const MILESTONE_SEED_CUT_TO_70 = "health.cut70.milestone.76kg";
const MILESTONE_SEED_GOLF = "golf.beginning.milestone.home-snag-phase";

type WeeklyCatalogIds = {
  expeditionSch: string;
  expeditionSnag: string;
  expeditionEnglish: string;
  expeditionWaymark: string;
  expeditionCutTo70: string;
  expeditionGolf: string;
  milestoneSchQlsd: string;
  milestoneSchFinancial: string;
  milestoneSchForm: string;
  milestoneSchPht: string;
  milestoneSnagDashboard: string;
  milestoneEnglish: string;
  milestoneWaymark: string;
  milestoneCutTo70: string;
  milestoneGolf: string;
};

function buildWeeklyTimetable20260608To0614(catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
  return [
  slot("2026-06-08", "05:30", "07:00", "Workout Day A", PATH_HEALTH, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70),
  slot("2026-06-08", "08:00", "09:30", "Viet RSD - Bo sung nut xac nhan va luong xac nhan SMB tren giao dien QLSD The SCH", PATH_CAREER, "morning_activity", catalog.expeditionSch, catalog.milestoneSchQlsd),
  slot("2026-06-08", "09:45", "11:15", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", catalog.expeditionSch, catalog.milestoneSchQlsd),
  slot("2026-06-08", "13:30", "15:00", "Viet RSD - Maker checker: Bo sung luong xac nhan SMB cho giao dich phi tai chinh tong quat", PATH_CAREER, "afternoon_activity", catalog.expeditionSch, catalog.milestoneSchQlsd),
  slot("2026-06-08", "15:15", "16:45", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", catalog.expeditionSch, catalog.milestoneSchQlsd),
  slot("2026-06-08", "17:00", "18:30", "Viet RSD - API van tin chi tiet giao dich QLSD The tren SCH", PATH_CAREER, "final_focus", catalog.expeditionSch, catalog.milestoneSchQlsd),
  slot("2026-06-08", "20:00", "21:00", "Trong con lam bai Toan + Tieng Viet", PATH_FAMILY, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish),
  slot("2026-06-08", "21:00", "21:30", "Prepare Tomorrow - chuan bi Workout Day B + shutdown nha", PATH_HEALTH, "prepare_tomorrow", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Pack checks: workout_readiness_check, home_shutdown_check."),

  slot("2026-06-09", "05:30", "07:00", "Workout Day B", PATH_HEALTH, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70),
  slot("2026-06-09", "08:00", "09:30", "Viet RSD - Template xac nhan giao dich QLSD The tren SMB", PATH_CAREER, "morning_activity", catalog.expeditionSch, catalog.milestoneSchQlsd),
  slot("2026-06-09", "09:45", "11:15", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", catalog.expeditionSch, catalog.milestoneSchQlsd),
  slot("2026-06-09", "13:30", "15:00", "Test SIT PHT KHTC - setup scope, du lieu, checklist test", PATH_CAREER, "afternoon_activity", catalog.expeditionSch, catalog.milestoneSchPht),
  slot("2026-06-09", "15:15", "16:45", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", catalog.expeditionSch, catalog.milestoneSchQlsd),
  slot("2026-06-09", "17:00", "18:30", "Test SIT Bieu mau - BM logic, mapping, evidence, bug log", PATH_CAREER, "final_focus", catalog.expeditionSch, catalog.milestoneSchForm),
  slot("2026-06-09", "20:00", "21:00", "Hoc tieng Anh / kiem tra bai ngay mai", PATH_FAMILY, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish),
  slot("2026-06-09", "21:00", "21:30", "Prepare Tomorrow - chuan bi Walk + shutdown nha", PATH_HEALTH, "prepare_tomorrow", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Pack checks: walk_readiness_check, home_shutdown_check."),

  slot("2026-06-10", "05:30", "07:00", "Workout Walk", PATH_HEALTH, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70),
  slot("2026-06-10", "08:00", "09:30", "RSD GD tai chinh the - (1) Khoi tao va tim kiem the", PATH_CAREER, "morning_activity", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-10", "09:45", "11:15", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-10", "13:30", "15:00", "RSD GD tai chinh the - (2) Chi tiet giao dich", PATH_CAREER, "afternoon_activity", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-10", "15:15", "16:45", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-10", "17:00", "18:30", "RSD GD tai chinh the - (3) Nguon tien mat - khoi tao/nhap lieu/xu ly nguon", PATH_CAREER, "final_focus", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-10", "20:00", "21:00", "Hoc tieng Anh / doc sach nhe", PATH_FAMILY, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish),
  slot("2026-06-10", "21:00", "21:30", "Prepare Tomorrow - chuan bi Workout Day A + shutdown nha", PATH_HEALTH, "prepare_tomorrow", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Pack checks: workout_readiness_check, home_shutdown_check."),

  slot("2026-06-11", "05:30", "07:00", "Workout Day A", PATH_HEALTH, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70),
  slot("2026-06-11", "08:00", "09:30", "RSD GD tai chinh the - (4) Nguon tien mat - hach toan/exception/AC", PATH_CAREER, "morning_activity", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-11", "09:45", "11:15", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-11", "13:30", "15:00", "RSD GD tai chinh the - (5) Nguon chuyen khoan / nguon GL", PATH_CAREER, "afternoon_activity", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-11", "15:15", "16:45", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-11", "17:00", "18:30", "RSD GD tai chinh the - (6) Giao dich thu no", PATH_CAREER, "final_focus", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-11", "20:00", "21:00", "Chuan bi Tieng Anh Cambridge", PATH_FAMILY, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish),
  slot("2026-06-11", "21:00", "21:30", "Prepare Tomorrow - chuan bi Workout Day B + shutdown nha", PATH_HEALTH, "prepare_tomorrow", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Pack checks: workout_readiness_check, home_shutdown_check."),

  slot("2026-06-12", "05:30", "07:00", "Workout Day B", PATH_HEALTH, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70),
  slot("2026-06-12", "08:00", "09:30", "RSD GD tai chinh the - (7) Giao dich topup", PATH_CAREER, "morning_activity", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-12", "09:45", "11:15", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-12", "13:30", "15:00", "RSD GD tai chinh the - (8) Giao dich hoan no", PATH_CAREER, "afternoon_activity", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-12", "15:15", "16:45", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", catalog.expeditionSch, catalog.milestoneSchFinancial),
  slot("2026-06-12", "17:00", "18:30", "Waymark - Backup cloud DB + Google Drive/multimedia triage", PATH_FAMILY, "final_focus", catalog.expeditionWaymark, catalog.milestoneWaymark, "Carryover: backup restore proof, Google Drive implementation, multimedia E2E test, skins, and media/memories prep move to next week if unfinished. Do not carry to Saturday."),
  slot("2026-06-12", "20:00", "21:00", "Chuan bi Tieng Anh Cambridge", PATH_FAMILY, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish),
  slot("2026-06-12", "21:00", "21:30", "Prepare Tomorrow - chuan bi Walk + shutdown nha", PATH_HEALTH, "prepare_tomorrow", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Pack checks: walk_readiness_check, home_shutdown_check."),

  slot("2026-06-13", "05:30", "07:00", "Workout Walk", PATH_HEALTH, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70),
  slot("2026-06-13", "08:00", "09:30", "Dua con hoc Tieng Anh Cambridge / chuan bi bai", PATH_FAMILY, "morning_activity", catalog.expeditionEnglish, catalog.milestoneEnglish),
  slot("2026-06-13", "09:45", "11:15", "Family buffer - di chuyen, nghi, viec nha nhe", PATH_FAMILY, "family_support"),
  slot("2026-06-13", "13:30", "15:00", "Family rest / dua con choi nhe / viec nha", PATH_FAMILY, "afternoon_activity"),
  slot("2026-06-13", "15:15", "16:45", "Family buffer - nghi / doc sach / choi voi con", PATH_FAMILY, "family_support_pm"),
  slot("2026-06-13", "17:00", "18:30", "Family dinner / don nha nhe", PATH_FAMILY, "family_final"),
  slot("2026-06-13", "20:00", "21:00", "Chuan bi thuyet trinh + golf bag cho Chu nhat", PATH_FAMILY, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish),
  slot("2026-06-13", "21:00", "21:30", "Prepare Tomorrow - chuan bi Workout Day A + shutdown nha", PATH_HEALTH, "prepare_tomorrow", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Pack checks: workout_readiness_check, home_shutdown_check."),

  slot("2026-06-14", "05:30", "07:00", "Workout Day A", PATH_HEALTH, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70),
  slot("2026-06-14", "08:00", "09:30", "Dua con di hoc thuyet trinh", PATH_FAMILY, "morning_activity", catalog.expeditionEnglish, catalog.milestoneEnglish),
  slot("2026-06-14", "09:45", "11:15", "Dua con di hoc golf", PATH_GOLF, "morning_support", catalog.expeditionGolf, catalog.milestoneGolf),
  slot("2026-06-14", "13:30", "15:00", "Ecopark family outing", PATH_FAMILY, "afternoon_activity"),
  slot("2026-06-14", "15:15", "16:45", "Ecopark buffer - nghi / an nhe / fallback", PATH_FAMILY, "family_support_pm"),
  slot("2026-06-14", "17:00", "18:30", "Ve nha, tam rua, an toi som", PATH_FAMILY, "family_final"),
  slot("2026-06-14", "20:00", "21:00", "Trong con lam bai Toan + Tieng Viet / chuan bi tuan moi", PATH_FAMILY, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish),
  slot("2026-06-14", "21:00", "21:30", "Prepare Tomorrow - chuan bi Workout Day B + shutdown nha", PATH_HEALTH, "prepare_tomorrow", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Pack checks: workout_readiness_check, home_shutdown_check."),
  ];
}

export const WEEKLY_TIMETABLE_2026_06_08_TO_06_14_COUNTS: Record<string, number> = {
  "2026-06-08": 8,
  "2026-06-09": 8,
  "2026-06-10": 8,
  "2026-06-11": 8,
  "2026-06-12": 8,
  "2026-06-13": 8,
  "2026-06-14": 8,
};

const DAY_ANCHORS: Record<string, string> = {
  "2026-06-08": PATH_CAREER,
  "2026-06-09": PATH_CAREER,
  "2026-06-10": PATH_CAREER,
  "2026-06-11": PATH_CAREER,
  "2026-06-12": PATH_CAREER,
  "2026-06-13": PATH_FAMILY,
  "2026-06-14": PATH_FAMILY,
};

type ImportServices = {
  repositories: WaymarkRepositories;
  signalEngine: SignalEngine;
  packCheckEngine: PackCheckEngine;
};

type ResolvedPathIds = {
  career: string;
  snag: string;
  family: string;
  health: string;
  golf: string;
};

export type WeeklyTimetable20260608ImportReport = WeeklyTimetableImportReport & {
  anchorTrailDays: number;
  packChecks: PackCheckInstance[];
  signals: Signal[];
  skippedSignals: Array<{ reason: string; localDate: string; label: string }>;
};

export async function importWeeklyTimetable20260608To0614(
  services: ImportServices,
  userId: string,
  timezone: string,
): Promise<WeeklyTimetable20260608ImportReport> {
  await bootstrapWaymarkMap(
    {
      repositories: services.repositories,
      userId,
    },
    WAYMARK_MAP_CONFIG,
  );
  const catalog = await resolveWeeklyCatalogIds(services.repositories, userId);
  const resolvedPathIds = await resolveLivePathIds(services.repositories, userId);
  const report = await importWeeklyTimetable(services.repositories, {
    userId,
    weekStartDate: "2026-06-08",
    weekEndDate: "2026-06-14",
    note: "Imported from approved weekly timetable 2026-06-08 to 2026-06-14.",
    importBatchId: "weekly_timetable_2026_06_08_2026_06_14_approved",
    allowTitleRefs: true,
    items: buildWeeklyTimetable20260608To0614(catalog),
  });

  const anchorTrailDays = await setDayAnchors(services.repositories, userId, resolvedPathIds);
  const packChecks = await ensurePrepareTomorrowPackChecks(services, userId, report, resolvedPathIds);
  const { signals, skippedSignals } = await ensureWeeklySignals(services, userId, timezone, report);

  return {
    ...report,
    anchorTrailDays,
    packChecks,
    signals,
    skippedSignals,
  };
}

async function setDayAnchors(repos: WaymarkRepositories, userId: string, pathIds: ResolvedPathIds) {
  let count = 0;
  for (const [localDate, anchorPathKey] of Object.entries(DAY_ANCHORS)) {
    const trailDay = await repos.trailDays.getOrCreateTrailDay(userId, localDate);
    const anchorPathId = resolveLivePathId(pathIds, anchorPathKey);
    await repos.trailDays.setAnchorPath(trailDay.id, anchorPathId);
    count += 1;
  }
  return count;
}

async function ensurePrepareTomorrowPackChecks(
  services: ImportServices,
  userId: string,
  report: WeeklyTimetableImportReport,
  pathIds: ResolvedPathIds,
) {
  const generated: PackCheckInstance[] = [];

  const workoutMarksByDate = new Map<string, MarkInstance>();
  const prepareMarks = new Map<string, MarkInstance>();
  for (const item of report.items) {
    if (!item.createdMarkInstanceId || !item.localDate) {
      continue;
    }
    if (item.blockKey !== "workout" && item.blockKey !== "prepare_tomorrow") {
      continue;
    }
    const mark = await services.repositories.marks.getMarkInstanceById(item.createdMarkInstanceId);
    if (!mark) {
      continue;
    }
    if (item.blockKey === "workout") {
      workoutMarksByDate.set(item.localDate, mark);
    } else {
      prepareMarks.set(item.localDate, mark);
    }
  }

  for (const localDate of Object.keys(DAY_ANCHORS)) {
    const nextDate = shiftLocalDate(localDate, 1);
    const nextWorkout = workoutMarksByDate.get(nextDate);
    if (nextWorkout) {
      generated.push(...await services.packCheckEngine.generatePackChecksForMarkInstance(nextWorkout.id));
    }

    const prepareMark = prepareMarks.get(localDate);
    if (!prepareMark) {
      continue;
    }

    const homeShutdown = await ensureHomeShutdownPackCheck(services.repositories, userId, localDate, prepareMark, pathIds);
    if (homeShutdown) {
      generated.push(homeShutdown);
    }
  }

  return dedupeById(generated);
}

async function ensureHomeShutdownPackCheck(
  repos: WaymarkRepositories,
  userId: string,
  localDate: string,
  prepareMark: MarkInstance,
  pathIds: ResolvedPathIds,
): Promise<PackCheckInstance | null> {
  const templates = await repos.packChecks.listTemplatesByPath(pathIds.family);
  const template = templates.find((item) => item.title === "Home Shutdown Check");
  if (!template) {
    return null;
  }

  const generationKey = `weekly_prepare_tomorrow:${template.id}:${prepareMark.id}:home_shutdown`;
  const existing = await repos.packChecks.findInstanceByGenerationKey(userId, generationKey);
  if (existing) {
    await ensurePackCheckItemSnapshots(repos, existing.id, template.id);
    return existing;
  }

  const trailDay = await repos.trailDays.getOrCreateTrailDay(userId, localDate);
  const nowIso = new Date().toISOString();
  const created = await repos.packChecks.upsertInstance({
    id: `pack_check_instance_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    userId,
    templateId: template.id,
    trailDayId: trailDay.id,
    targetMarkInstanceId: prepareMark.id,
    title: template.title,
    description: template.description,
    status: PackCheckInstanceStatus.Available,
    availableFrom: `${localDate}T21:00:00.000`,
    dueAt: `${localDate}T21:30:00.000`,
    generationKey,
    createdAt: nowIso,
    updatedAt: nowIso,
    syncVersion: 0,
  });
  await ensurePackCheckItemSnapshots(repos, created.id, template.id);
  return created;
}

async function ensurePackCheckItemSnapshots(
  repos: WaymarkRepositories,
  packCheckInstanceId: string,
  templateId: string,
) {
  const existingItems = await repos.packChecks.listItemInstances(packCheckInstanceId);
  if (existingItems.length > 0) {
    return;
  }

  const nowIso = new Date().toISOString();
  const templates = await repos.packChecks.listItemTemplates(templateId);
  await repos.packChecks.upsertItemInstances(
    templates.map((item) => ({
      id: `pack_check_item_instance_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      packCheckInstanceId,
      templateItemId: item.id,
      label: item.label,
      isRequired: item.isRequired,
      isChecked: false,
      orderIndex: item.orderIndex,
      createdAt: nowIso,
      updatedAt: nowIso,
      syncVersion: 0,
    })),
  );
}

async function ensureWeeklySignals(
  services: ImportServices,
  userId: string,
  timezone: string,
  report: WeeklyTimetableImportReport,
) {
  const signals: Signal[] = [];
  const skippedSignals = Object.keys(DAY_ANCHORS)
    .filter((localDate) => !localDate.endsWith("-13") && !localDate.endsWith("-14"))
    .map((localDate) => ({
      localDate,
      label: "Signal - Going Home",
      reason: "Skipped because the current SignalTargetType model has no routine/reminder target.",
    }));

  for (const item of report.items) {
    if (!item.createdMarkInstanceId || !item.localDate) {
      continue;
    }
    if (item.blockKey === "workout") {
      signals.push(
        await ensureSignal(services, userId, SignalTargetType.MarkInstance, item.createdMarkInstanceId, item.localDate, "06:00", timezone),
      );
    }
    if (item.blockKey === "evening_activity") {
      signals.push(
        await ensureSignal(services, userId, SignalTargetType.MarkInstance, item.createdMarkInstanceId, item.localDate, "20:00", timezone),
      );
    }
    if (item.blockKey === "prepare_tomorrow") {
      signals.push(
        await ensureSignal(services, userId, SignalTargetType.MarkInstance, item.createdMarkInstanceId, item.localDate, "21:00", timezone),
      );
    }
  }

  for (const localDate of Object.keys(DAY_ANCHORS)) {
    const trailDay = await services.repositories.trailDays.getOrCreateTrailDay(userId, localDate);
    signals.push(
      await ensureSignal(services, userId, SignalTargetType.TrailDay, trailDay.id, localDate, "21:30", timezone),
    );
  }

  return {
    signals: dedupeById(signals),
    skippedSignals,
  };
}

async function ensureSignal(
  services: ImportServices,
  userId: string,
  targetType: SignalTargetType,
  targetId: string,
  localDate: string,
  time: string,
  timezone: string,
) {
  const scheduledAt = buildZonedDateTime(localDate, time, timezone);
  const existing = (await services.repositories.signals.listSignalsByTarget(targetType, targetId))
    .find((signal) => signal.scheduledAt === scheduledAt);
  if (existing) {
    return existing;
  }

  return services.signalEngine.createSignal({
    userId,
    targetType,
    targetId,
    scheduledAt,
    status: SignalStatus.Scheduled,
  });
}

function pathRefFromId(pathId: string) {
  switch (pathId) {
    case PATH_CAREER:
      return "Career";
    case PATH_SNAG:
      return "SNAG Golf Vietnam";
    case PATH_FAMILY:
      return "Family & Home";
    case PATH_HEALTH:
      return "Health & Body";
    case PATH_GOLF:
      return "Golf Craft";
    default:
      return undefined;
  }
}

function shiftLocalDate(localDate: string, days: number) {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function resolveLivePathIds(repos: WaymarkRepositories, userId: string): Promise<ResolvedPathIds> {
  return {
    career: await resolveSeedEntityId(repos, userId, "path", PATH_SEED_CAREER),
    snag: await resolveSeedEntityId(repos, userId, "path", PATH_SEED_SNAG),
    family: await resolveSeedEntityId(repos, userId, "path", PATH_SEED_FAMILY),
    health: await resolveSeedEntityId(repos, userId, "path", PATH_SEED_HEALTH),
    golf: await resolveSeedEntityId(repos, userId, "path", PATH_SEED_GOLF),
  };
}

function resolveLivePathId(pathIds: ResolvedPathIds, legacyPathId: string) {
  switch (legacyPathId) {
    case PATH_CAREER:
      return pathIds.career;
    case PATH_SNAG:
      return pathIds.snag;
    case PATH_FAMILY:
      return pathIds.family;
    case PATH_HEALTH:
      return pathIds.health;
    case PATH_GOLF:
      return pathIds.golf;
    default:
      return legacyPathId;
  }
}

async function resolveWeeklyCatalogIds(repos: WaymarkRepositories, userId: string): Promise<WeeklyCatalogIds> {
  return {
    expeditionSch: await resolveSeedEntityId(repos, userId, "expedition", EXPEDITION_SEED_SCH),
    expeditionSnag: await resolveSeedEntityId(repos, userId, "expedition", EXPEDITION_SEED_SNAG),
    expeditionEnglish: await resolveSeedEntityId(repos, userId, "expedition", EXPEDITION_SEED_ENGLISH),
    expeditionWaymark: await resolveSeedEntityId(repos, userId, "expedition", EXPEDITION_SEED_WAYMARK),
    expeditionCutTo70: await resolveSeedEntityId(repos, userId, "expedition", EXPEDITION_SEED_CUT_TO_70),
    expeditionGolf: await resolveSeedEntityId(repos, userId, "expedition", EXPEDITION_SEED_GOLF),
    milestoneSchQlsd: await resolveSeedEntityId(repos, userId, "milestone", MILESTONE_SEED_SCH_QLSD),
    milestoneSchFinancial: await resolveSeedEntityId(repos, userId, "milestone", MILESTONE_SEED_SCH_FINANCIAL),
    milestoneSchForm: await resolveSeedEntityId(repos, userId, "milestone", MILESTONE_SEED_SCH_FORM),
    milestoneSchPht: await resolveSeedEntityId(repos, userId, "milestone", MILESTONE_SEED_SCH_PHT),
    milestoneSnagDashboard: await resolveSeedEntityId(repos, userId, "milestone", MILESTONE_SEED_SNAG_DASHBOARD),
    milestoneEnglish: await resolveSeedEntityId(repos, userId, "milestone", MILESTONE_SEED_ENGLISH),
    milestoneWaymark: await resolveSeedEntityId(repos, userId, "milestone", MILESTONE_SEED_WAYMARK),
    milestoneCutTo70: await resolveSeedEntityId(repos, userId, "milestone", MILESTONE_SEED_CUT_TO_70),
    milestoneGolf: await resolveSeedEntityId(repos, userId, "milestone", MILESTONE_SEED_GOLF),
  };
}

async function resolveSeedEntityId(
  repos: WaymarkRepositories,
  userId: string,
  entityType: "path" | "expedition" | "milestone",
  sourceSeedId: string,
) {
  const record = await findSeedRecordBySource(repos.appSettings, userId, entityType, sourceSeedId);
  if (!record?.entityId) {
    throw new Error(`Missing seeded ${entityType} for source "${sourceSeedId}".`);
  }
  return record.entityId;
}

function dedupeById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
