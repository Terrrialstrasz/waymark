import type { PackCheckInstance, Signal, WaymarkRepositories } from "../domain/waymark";
import { PackCheckInstanceStatus, SignalStatus, SignalTargetType } from "../domain/waymark/enums";
import type { SignalEngine } from "../domain/waymark/services";
import { importWeeklyTimetable, type WeeklyTimetableImportReport, type WeeklyTimetableImportSlotInput } from "../lib/waymark";
import { bootstrapWaymarkMap } from "../lib/waymark";
import { WAYMARK_MAP_CONFIG } from "../waymark-map";
import { findSeedRecordBySource } from "../waymark-map/seedRegistry";
import { buildZonedDateTime } from "./waymarkUi";

type WeeklyCatalogIds = {
  pathCareer: string;
  pathFamily: string;
  pathHealth: string;
  pathGolf: string;
  expeditionSch: string;
  expeditionWaymark: string;
  expeditionEnglish: string;
  expeditionCutTo70: string;
  expeditionGolf: string;
  expeditionFamilyWeekend: string;
  expeditionFamilyRhythm: string;
  milestoneSchFinancial: string;
  milestoneSchFundingSource: string;
  milestoneSchHybridPht: string;
  milestoneSchSmbQlsd: string;
  milestoneWaymark: string;
  milestoneEnglish: string;
  milestoneCutTo70: string;
  milestoneGolf: string;
  milestoneFamilyGolfMemory: string;
  milestoneFamilyLotusFestival: string;
  milestoneFamilyRecovery: string;
};

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
    blockKey,
    expeditionId,
    milestoneId,
    note,
  };
}

export function buildWeeklyTimetable20260622To0628(catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
const PATH_CAREER = catalog.pathCareer;
const PATH_FAMILY = catalog.pathFamily;
const PATH_HEALTH = catalog.pathHealth;
const PATH_GOLF = catalog.pathGolf;

const EXPEDITION_SCH = catalog.expeditionSch;
const EXPEDITION_WAYMARK = catalog.expeditionWaymark;
const EXPEDITION_ENGLISH = catalog.expeditionEnglish;
const EXPEDITION_CUT_TO_70 = catalog.expeditionCutTo70;
const EXPEDITION_GOLF = catalog.expeditionGolf;
const EXPEDITION_FAMILY_WEEKEND = catalog.expeditionFamilyWeekend;
const EXPEDITION_FAMILY_RHYTHM = catalog.expeditionFamilyRhythm;

const MILESTONE_SCH_FINANCIAL = catalog.milestoneSchFinancial;
const MILESTONE_SCH_FUNDING_SOURCE = catalog.milestoneSchFundingSource;
const MILESTONE_SCH_HYBRID_PHT = catalog.milestoneSchHybridPht;
const MILESTONE_SCH_SMB_QLSD = catalog.milestoneSchSmbQlsd;
const MILESTONE_WAYMARK = catalog.milestoneWaymark;
const MILESTONE_ENGLISH = catalog.milestoneEnglish;
const MILESTONE_CUT_TO_70 = catalog.milestoneCutTo70;
const MILESTONE_GOLF = catalog.milestoneGolf;
const MILESTONE_FAMILY_GOLF_MEMORY = catalog.milestoneFamilyGolfMemory;
const MILESTONE_FAMILY_LOTUS_FESTIVAL = catalog.milestoneFamilyLotusFestival;
const MILESTONE_FAMILY_RECOVERY = catalog.milestoneFamilyRecovery;

return [
  slot("2026-06-22", "05:30", "07:00", "Workout Day A", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Health Engine owns detail."),
  slot("2026-06-22", "08:00", "09:30", "Fix bug Waymark", PATH_FAMILY, "morning_activity", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-22", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", EXPEDITION_SCH, undefined, "Không dùng cho deep work."),
  slot("2026-06-22", "13:30", "15:00", "Mockup phát hành lại Hybrid + Mockup chuyển nguồn Hybrid", PATH_CAREER, "afternoon_activity", EXPEDITION_SCH, MILESTONE_SCH_FUNDING_SOURCE, "Hybrid / Đổi nguồn tiền giao dịch JCB HB & QLSD thay đổi nguồn tiền."),
  slot("2026-06-22", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", EXPEDITION_SCH, undefined, "Không dùng cho deep work."),
  slot("2026-06-22", "17:00", "18:30", "Fix bug Waymark", PATH_FAMILY, "final_focus", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-22", "20:00", "21:00", "Trông con làm bài tiền tiểu học ngày mai", PATH_FAMILY, "evening_activity", EXPEDITION_ENGLISH, MILESTONE_ENGLISH),

  slot("2026-06-23", "05:30", "07:00", "Workout Day B", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Health Engine owns detail."),
  slot("2026-06-23", "08:00", "09:30", "RSD chuyển nguồn Hybrid", PATH_CAREER, "morning_activity", EXPEDITION_SCH, MILESTONE_SCH_FUNDING_SOURCE),
  slot("2026-06-23", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", EXPEDITION_SCH, undefined, "Không dùng cho deep work."),
  slot("2026-06-23", "13:30", "15:00", "RSD phát hành lại Hybrid", PATH_CAREER, "afternoon_activity", EXPEDITION_SCH, MILESTONE_SCH_HYBRID_PHT),
  slot("2026-06-23", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", EXPEDITION_SCH, undefined, "Không dùng cho deep work."),
  slot("2026-06-23", "17:00", "18:30", "Waymark B — Luồng lưu ảnh tại Waymark", PATH_FAMILY, "final_focus", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-23", "20:00", "21:00", "Học tiếng Anh nhẹ", PATH_FAMILY, "evening_activity", EXPEDITION_ENGLISH, MILESTONE_ENGLISH),

  slot("2026-06-24", "05:30", "07:00", "Workout Walk", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Health Engine owns detail."),
  slot("2026-06-24", "08:00", "09:30", "Xử lý TGYK RSD GDTC Thẻ", PATH_CAREER, "morning_activity", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL),
  slot("2026-06-24", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", EXPEDITION_SCH, undefined, "Không dùng cho deep work."),
  slot("2026-06-24", "13:30", "15:00", "RSD Xác thực KH trên QLSD Thẻ", PATH_CAREER, "afternoon_activity", EXPEDITION_SCH, MILESTONE_SCH_SMB_QLSD),
  slot("2026-06-24", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", EXPEDITION_SCH, undefined, "Không dùng cho deep work."),
  slot("2026-06-24", "17:00", "18:30", "Waymark C — Tích hợp Google Drive", PATH_FAMILY, "final_focus", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-24", "20:00", "21:00", "Học tiếng Anh nhẹ", PATH_FAMILY, "evening_activity", EXPEDITION_ENGLISH, MILESTONE_ENGLISH),

  slot("2026-06-25", "05:30", "07:00", "Workout Day A", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Health Engine owns detail."),
  slot("2026-06-25", "08:00", "09:30", "RSD Xác thực KH trên GDTC Thẻ", PATH_CAREER, "morning_activity", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL),
  slot("2026-06-25", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", EXPEDITION_SCH, undefined, "Không dùng cho deep work."),
  slot("2026-06-25", "13:30", "15:00", "RSD xác nhận SMB GDTC Thẻ", PATH_CAREER, "afternoon_activity", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL),
  slot("2026-06-25", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", EXPEDITION_SCH, undefined, "Không dùng cho deep work."),
  slot("2026-06-25", "17:00", "18:30", "Waymark D — Chạy tích hợp Turso", PATH_FAMILY, "final_focus", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-25", "20:00", "21:00", "Chuẩn bị Cambridge", PATH_FAMILY, "evening_activity", EXPEDITION_ENGLISH, MILESTONE_ENGLISH),

  slot("2026-06-26", "05:30", "07:00", "Workout Day B", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Health Engine owns detail."),
  slot("2026-06-26", "08:00", "09:30", "RSD xác nhận tablet, VNeID GDTC Thẻ", PATH_CAREER, "morning_activity", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL),
  slot("2026-06-26", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", EXPEDITION_SCH, undefined, "Không dùng cho deep work."),
  slot("2026-06-26", "13:30", "15:00", "Waymark F — Test SSoT end-to-end", PATH_FAMILY, "afternoon_activity", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-26", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", EXPEDITION_SCH, undefined, "Không dùng cho deep work."),
  slot("2026-06-26", "17:00", "18:30", "Waymark E — Test lại luồng lưu ảnh / Weekly Coding", PATH_FAMILY, "final_focus", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-26", "20:00", "21:00", "Chuẩn bị đồ đi Nghệ An + nghỉ sớm", PATH_FAMILY, "evening_activity", EXPEDITION_FAMILY_WEEKEND, MILESTONE_FAMILY_GOLF_MEMORY),

  slot("2026-06-27", "05:30", "07:00", "Di chuyển / chuẩn bị giải Golf Diễn Lâm", PATH_GOLF, "golf_prep", EXPEDITION_GOLF, MILESTONE_GOLF),
  slot("2026-06-27", "08:00", "09:30", "Giải Golf Diễn Lâm Nghệ An", PATH_GOLF, "morning_activity", EXPEDITION_GOLF, MILESTONE_GOLF),
  slot("2026-06-27", "09:45", "11:15", "Giải Golf Diễn Lâm Nghệ An", PATH_GOLF, "morning_support", EXPEDITION_GOLF, MILESTONE_GOLF),
  slot("2026-06-27", "13:30", "15:00", "Giải Golf Diễn Lâm Nghệ An", PATH_GOLF, "afternoon_activity", EXPEDITION_GOLF, MILESTONE_GOLF),
  slot("2026-06-27", "15:15", "16:45", "Giải Golf Diễn Lâm Nghệ An", PATH_GOLF, "afternoon_support", EXPEDITION_GOLF, MILESTONE_GOLF),
  slot("2026-06-27", "17:00", "18:30", "Về / ăn tối / recovery", PATH_FAMILY, "family_final", EXPEDITION_FAMILY_WEEKEND, MILESTONE_FAMILY_GOLF_MEMORY),
  slot("2026-06-27", "20:00", "21:00", "Nghỉ sớm sau giải", PATH_FAMILY, "evening_activity", EXPEDITION_FAMILY_WEEKEND, MILESTONE_FAMILY_GOLF_MEMORY),

  slot("2026-06-28", "05:30", "07:00", "Workout Day A nhẹ / phục hồi", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Workout nhẹ / phục hồi."),
  slot("2026-06-28", "08:00", "09:30", "Đi Lễ hội Sen Hà Nội — Tây Hồ", PATH_FAMILY, "morning_activity", EXPEDITION_FAMILY_WEEKEND, MILESTONE_FAMILY_LOTUS_FESTIVAL),
  slot("2026-06-28", "09:45", "11:15", "Lễ hội Sen Hà Nội / tham quan nhẹ", PATH_FAMILY, "morning_support", EXPEDITION_FAMILY_WEEKEND, MILESTONE_FAMILY_LOTUS_FESTIVAL),
  slot("2026-06-28", "13:30", "15:00", "Nghỉ trưa / cafe indoor quanh Tây Hồ", PATH_FAMILY, "afternoon_activity", EXPEDITION_FAMILY_WEEKEND, MILESTONE_FAMILY_LOTUS_FESTIVAL),
  slot("2026-06-28", "15:15", "16:45", "Đi tiếp quanh Hồ Tây nếu thời tiết ổn", PATH_FAMILY, "afternoon_support", EXPEDITION_FAMILY_WEEKEND, MILESTONE_FAMILY_LOTUS_FESTIVAL),
  slot("2026-06-28", "17:00", "18:30", "Ăn tối sớm quanh Tây Hồ / về nhà", PATH_FAMILY, "family_final", EXPEDITION_FAMILY_WEEKEND, MILESTONE_FAMILY_LOTUS_FESTIVAL),
  slot("2026-06-28", "20:00", "21:00", "Chuẩn bị cặp thứ 2 + ngủ sớm", PATH_FAMILY, "evening_activity", EXPEDITION_FAMILY_RHYTHM, MILESTONE_FAMILY_RECOVERY),
];
}

export const WEEKLY_TIMETABLE_2026_06_22_TO_06_28_COUNTS: Record<string, number> = {
  "2026-06-22": 7,
  "2026-06-23": 7,
  "2026-06-24": 7,
  "2026-06-25": 7,
  "2026-06-26": 7,
  "2026-06-27": 7,
  "2026-06-28": 7,
};

type ImportServices = {
  repositories: WaymarkRepositories;
  signalEngine: SignalEngine;
};

type WeeklySignalPackInput = {
  localDate: string;
  time: string;
  sourceSeedId: string;
};

type WeeklyBodyStartSignalInput = {
  localDate: string;
  time: string;
};

export type WeeklyTimetable20260622ImportReport = WeeklyTimetableImportReport & {
  packChecks: PackCheckInstance[];
  signals: Signal[];
};

const WEEKLY_BODY_START_SIGNALS_2026_06_22_TO_06_28: WeeklyBodyStartSignalInput[] = [
  bodyStartSignal("2026-06-22", "05:30"),
  bodyStartSignal("2026-06-23", "05:30"),
  bodyStartSignal("2026-06-24", "05:30"),
  bodyStartSignal("2026-06-25", "05:30"),
  bodyStartSignal("2026-06-26", "05:30"),
  bodyStartSignal("2026-06-27", "05:30"),
  bodyStartSignal("2026-06-28", "05:30"),
];

const WEEKLY_SIGNAL_PACK_2026_06_22_TO_06_28: WeeklySignalPackInput[] = [
  signalPack("2026-06-22", "07:10", "style.daily-grooming-presence-check"),
  signalPack("2026-06-22", "07:30", "family.before-leaving-home-check"),
  signalPack("2026-06-22", "21:30", "family.home-shutdown-check"),

  signalPack("2026-06-23", "07:10", "style.daily-grooming-presence-check"),
  signalPack("2026-06-23", "07:30", "family.before-leaving-home-check"),
  signalPack("2026-06-23", "21:30", "family.home-shutdown-check"),

  signalPack("2026-06-24", "07:10", "style.daily-grooming-presence-check"),
  signalPack("2026-06-24", "07:30", "family.before-leaving-home-check"),
  signalPack("2026-06-24", "21:30", "family.home-shutdown-check"),

  signalPack("2026-06-25", "07:10", "style.daily-grooming-presence-check"),
  signalPack("2026-06-25", "07:30", "family.before-leaving-home-check"),
  signalPack("2026-06-25", "21:30", "family.home-shutdown-check"),

  signalPack("2026-06-26", "07:10", "style.daily-grooming-presence-check"),
  signalPack("2026-06-26", "07:30", "family.before-leaving-home-check"),
  signalPack("2026-06-26", "21:30", "family.home-shutdown-check"),
  signalPack("2026-06-26", "21:45", "family.travel-tour-readiness-check"),

  signalPack("2026-06-27", "06:30", "golf.golf-outing-readiness-check"),
  signalPack("2026-06-27", "07:10", "style.daily-grooming-presence-check"),
  signalPack("2026-06-27", "21:30", "family.home-shutdown-check"),
  signalPack("2026-06-27", "21:45", "family.weekend-around-hanoi-readiness-check"),

  signalPack("2026-06-28", "07:10", "style.daily-grooming-presence-check"),
  signalPack("2026-06-28", "08:00", "family.weekend-around-hanoi-readiness-check"),
  signalPack("2026-06-28", "21:30", "family.home-shutdown-check"),
  signalPack("2026-06-28", "21:45", "character.pilgrimage-readiness-check"),
];

export async function importWeeklyTimetable20260622To0628(
  services: ImportServices,
  userId: string,
  timezone: string,
): Promise<WeeklyTimetable20260622ImportReport> {
  const repos = services.repositories;
  await bootstrapWaymarkMap(
    {
      repositories: repos,
      userId,
    },
    WAYMARK_MAP_CONFIG,
  );
  const catalog = await resolveWeeklyCatalogIds(repos, userId);

  const report = await importWeeklyTimetable(repos, {
    userId,
    weekStartDate: "2026-06-22",
    weekEndDate: "2026-06-28",
    note: "Imported from final weekly timetable 2026-06-22 to 2026-06-28 with source-seed resolved project and milestone IDs.",
    importBatchId: "weekly_timetable_2026_06_22_2026_06_28_final_seed_ids",
    items: buildWeeklyTimetable20260622To0628(catalog),
  });
  const { packChecks, signals } = await ensureWeeklySignals(services, userId, timezone, report);

  return {
    ...report,
    packChecks,
    signals,
  };
}

function signalPack(localDate: string, time: string, sourceSeedId: string): WeeklySignalPackInput {
  return { localDate, time, sourceSeedId };
}

function bodyStartSignal(localDate: string, time: string): WeeklyBodyStartSignalInput {
  return { localDate, time };
}

async function ensureWeeklySignals(
  services: ImportServices,
  userId: string,
  timezone: string,
  report: WeeklyTimetableImportReport,
) {
  const packChecks: PackCheckInstance[] = [];
  const signals: Signal[] = [];

  await removeLegacyBodyStartPackCheckSignals(services, userId);

  const bodyStartMarkIdsByDate = new Map(
    report.items
      .filter((item) => (item.blockKey === "workout" || item.startTime === "05:30") && item.localDate && item.createdMarkInstanceId)
      .map((item) => [item.localDate!, item.createdMarkInstanceId!] as const),
  );

  for (const input of WEEKLY_BODY_START_SIGNALS_2026_06_22_TO_06_28) {
    const markId = bodyStartMarkIdsByDate.get(input.localDate);
    if (!markId) {
      throw new Error(`Missing 05:30 Mark for Body Start signal on ${input.localDate}.`);
    }
    signals.push(
      await ensureSignal(
        services,
        userId,
        SignalTargetType.MarkInstance,
        markId,
        input.localDate,
        input.time,
        timezone,
      ),
    );
  }

  for (const input of WEEKLY_SIGNAL_PACK_2026_06_22_TO_06_28) {
    const packCheck = await ensurePackCheckInstanceForSignal(services.repositories, userId, input);
    packChecks.push(packCheck);
    signals.push(
      await ensureSignal(
        services,
        userId,
        SignalTargetType.PackCheckInstance,
        packCheck.id,
        input.localDate,
        input.time,
        timezone,
      ),
    );
  }

  return {
    packChecks: dedupeById(packChecks),
    signals: dedupeById(signals),
  };
}

async function removeLegacyBodyStartPackCheckSignals(services: ImportServices, userId: string) {
  for (const input of [
    ...WEEKLY_BODY_START_SIGNALS_2026_06_22_TO_06_28.map((item) => ({
      ...item,
      sourceSeedId: item.localDate === "2026-06-24" || item.localDate === "2026-06-27"
        ? "health.walk-readiness-check"
        : "health.workout-readiness-check",
    })),
  ]) {
    const templateId = await resolveSeedEntityId(services.repositories, userId, "pack_check_template", input.sourceSeedId);
    const generationKey = `weekly_signal_pack:2026-06-22:${templateId}:${input.localDate}:${input.time}`;
    const legacyPackCheck = await services.repositories.packChecks.findInstanceByGenerationKey(userId, generationKey);
    if (!legacyPackCheck) {
      continue;
    }

    await services.signalEngine.cancelSignalsForTarget({
      targetType: SignalTargetType.PackCheckInstance,
      targetId: legacyPackCheck.id,
      reason: "Body Start now opens the workout/walk Mark directly.",
    });
    await services.repositories.packChecks.softDeleteInstance(legacyPackCheck.id);
  }
}

async function ensurePackCheckInstanceForSignal(
  repos: WaymarkRepositories,
  userId: string,
  input: WeeklySignalPackInput,
) {
  const templateId = await resolveSeedEntityId(repos, userId, "pack_check_template", input.sourceSeedId);
  const template = await repos.packChecks.getTemplateById(templateId);
  if (!template) {
    throw new Error(`Missing pack check template for source "${input.sourceSeedId}".`);
  }

  const generationKey = `weekly_signal_pack:2026-06-22:${template.id}:${input.localDate}:${input.time}`;
  const existing = await repos.packChecks.findInstanceByGenerationKey(userId, generationKey);
  if (existing) {
    await ensurePackCheckItemSnapshots(repos, existing.id, template.id);
    return existing;
  }

  const trailDay = await repos.trailDays.getOrCreateTrailDay(userId, input.localDate);
  const nowIso = new Date().toISOString();
  const created = await repos.packChecks.upsertInstance({
    id: `pack_check_instance_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    userId,
    templateId: template.id,
    trailDayId: trailDay.id,
    title: template.title,
    description: template.description,
    status: PackCheckInstanceStatus.Available,
    availableFrom: `${input.localDate}T${input.time}:00.000`,
    dueAt: `${input.localDate}T${input.time}:00.000`,
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

async function resolveWeeklyCatalogIds(repos: WaymarkRepositories, userId: string): Promise<WeeklyCatalogIds> {
  return {
    pathCareer: await resolveSeedEntityId(repos, userId, "path", "career"),
    pathFamily: await resolveSeedEntityId(repos, userId, "path", "family"),
    pathHealth: await resolveSeedEntityId(repos, userId, "path", "health"),
    pathGolf: await resolveSeedEntityId(repos, userId, "path", "golf"),
    expeditionSch: await resolveSeedEntityId(repos, userId, "expedition", "career.sch.expedition.smart-counter-hub-project"),
    expeditionWaymark: await resolveSeedEntityId(repos, userId, "expedition", "family.waymark.expedition"),
    expeditionEnglish: await resolveSeedEntityId(repos, userId, "expedition", "family.english.expedition"),
    expeditionCutTo70: await resolveSeedEntityId(repos, userId, "expedition", "health.cut70.expedition"),
    expeditionGolf: await resolveSeedEntityId(repos, userId, "expedition", "golf.beginning.expedition"),
    expeditionFamilyWeekend: await resolveSeedEntityId(repos, userId, "expedition", "family.weekend.expedition"),
    expeditionFamilyRhythm: await resolveSeedEntityId(repos, userId, "expedition", "family.rhythm.expedition"),
    milestoneSchFinancial: await resolveSeedEntityId(repos, userId, "milestone", "career.sch.milestone.2026-08.credit-card-debt-collection-adjustment"),
    milestoneSchFundingSource: await resolveSeedEntityId(repos, userId, "milestone", "career.sch.milestone.2026-09.jcb-hb-funding-source-switch"),
    milestoneSchHybridPht: await resolveSeedEntityId(repos, userId, "milestone", "career.sch.milestone.2026-11.personal-hybrid-credit-pht-with-limit"),
    milestoneSchSmbQlsd: await resolveSeedEntityId(repos, userId, "milestone", "career.sch.milestone.2026-06.card-onboarding-release"),
    milestoneWaymark: await resolveSeedEntityId(repos, userId, "milestone", "family.waymark.milestone.anniversary-edition"),
    milestoneEnglish: await resolveSeedEntityId(repos, userId, "milestone", "family.english.milestone.grammar-book"),
    milestoneCutTo70: await resolveSeedEntityId(repos, userId, "milestone", "health.cut70.milestone.76kg"),
    milestoneGolf: await resolveSeedEntityId(repos, userId, "milestone", "golf.beginning.milestone.home-snag-phase"),
    milestoneFamilyGolfMemory: await resolveSeedEntityId(repos, userId, "milestone", "family.weekend.milestone.golf-tournament-memory"),
    milestoneFamilyLotusFestival: await resolveSeedEntityId(repos, userId, "milestone", "family.weekend.milestone.lotus-festival-west-lake"),
    milestoneFamilyRecovery: await resolveSeedEntityId(repos, userId, "milestone", "family.rhythm.milestone.weekend-recovery"),
  };
}

async function resolveSeedEntityId(
  repos: WaymarkRepositories,
  userId: string,
  entityType: "path" | "expedition" | "milestone" | "pack_check_template",
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
