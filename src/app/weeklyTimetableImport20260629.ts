import type { Expedition, MarkInstance, Milestone, PackCheckInstance, Signal, WaymarkRepositories } from "../domain/waymark";
import { ExpeditionStatus, MarkInstanceOrigin, MarkInstanceStatus, MilestoneStatus, PackCheckInstanceStatus, SignalStatus, SignalTargetType } from "../domain/waymark/enums";
import type { SignalEngine } from "../domain/waymark/services";
import { bootstrapWaymarkMap, importWeeklyTimetable, type WeeklyTimetableImportReport, type WeeklyTimetableImportSlotInput } from "../lib/waymark";
import { WAYMARK_MAP_CONFIG } from "../waymark-map";
import { findSeedRecordBySource } from "../waymark-map/seedRegistry";
import { buildZonedDateTime } from "./waymarkUi";

type ImportServices = {
  repositories: WaymarkRepositories;
  signalEngine: SignalEngine;
};

type WeeklyCatalogIds = {
  pathCareer: string;
  pathFamily: string;
  pathHealth: string;
  pathSnag: string;
  expeditionSch: string;
  expeditionCutTo70: string;
  expeditionWaymark: string;
  expeditionEnglish: string;
  expeditionFamilyRhythm: string;
  expeditionDch: string;
  expeditionBaCore: string;
  milestoneSchAutoQlsd: string;
  milestoneSchFinancial: string;
  milestoneWaymark: string;
  milestoneEnglish: string;
  milestoneCutTo70: string;
  milestoneDchSprint0: string;
  milestoneBaRsd: string;
};

type WeeklySignalPackInput = {
  localDate: string;
  time: string;
  sourceSeedId: string;
};

type WeeklyMarkSignalInput = {
  localDate: string;
  time: string;
  title: string;
};

type WeeklyStructureReport = {
  expeditions: Expedition[];
  milestones: Milestone[];
};

export type WeeklyTimetable20260629ImportReport = WeeklyTimetableImportReport & WeeklyStructureReport & {
  packChecks: PackCheckInstance[];
  signals: Signal[];
};

export type WeeklyTimetable202607020305PatchReport = WeeklyTimetableImportReport & WeeklyStructureReport & {
  removedWeekPlanItemIds: string[];
  removedMarkIds: string[];
  cancelledSignals: Signal[];
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
  allowOverlap = false,
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
    description: note,
    allowOverlap,
  };
}

export function buildWeeklyTimetable20260629To0705(catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
  const H = catalog.pathHealth;
  const F = catalog.pathFamily;
  const C = catalog.pathCareer;
  const S = catalog.pathSnag;

  return [
    slot("2026-06-29", "05:30", "07:00", "Workout A1", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Health Engine owns detail."),
    slot("2026-06-29", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "1-2 eggs; 1 cup green tea; plan garlic lunch/dinner; skip ginkgo by default."),
    slot("2026-06-29", "08:00", "09:30", "RSD — Mapping biểu mẫu QLSD thẻ", C, "morning_activity", catalog.expeditionSch, catalog.milestoneSchAutoQlsd, "Output: mapping biểu mẫu / field / rule chính."),
    slot("2026-06-29", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_am", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-06-29", "13:30", "15:00", "RSD — Biểu mẫu / Chứng từ GDTC Thẻ", C, "afternoon_activity", catalog.expeditionSch, catalog.milestoneSchFinancial, "Output: mapping biểu mẫu, chứng từ, quy tắc in/email/ký số."),
    slot("2026-06-29", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_pm", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-06-29", "17:00", "18:30", "Biên bản bàn giao công việc squad Thẻ", C, "final_focus", undefined, undefined, "1 mark duy nhất; output: đầu việc, trạng thái, owner."),
    slot("2026-06-29", "20:00", "21:00", "Trông con làm bài Toán + Tiếng Việt", F, "evening_activity", catalog.expeditionFamilyRhythm, undefined, "Theo rule evening: hôm sau học tiền tiểu học."),
    slot("2026-06-29", "20:00", "21:00", "Thắp hương ngày rằm", F, "lunar_mark", catalog.expeditionFamilyRhythm, undefined, "15/5 âm lịch. Mark nhẹ, không chen Focus Block.", true),

    slot("2026-06-30", "05:30", "07:00", "Workout B", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Health Engine owns detail."),
    slot("2026-06-30", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "1-2 eggs; green tea; plan garlic; skip ginkgo."),
    slot("2026-06-30", "08:00", "09:30", "DCH Sprint 0 — Đọc tài liệu tổng thể DCH", C, "morning_activity", catalog.expeditionDch, catalog.milestoneDchSprint0, "Output: note tổng thể DCH, phạm vi, actors, câu hỏi."),
    slot("2026-06-30", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_am", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-06-30", "13:30", "15:00", "RSD — Trình ký RSD giao dịch tài chính thẻ", C, "afternoon_activity", catalog.expeditionSch, catalog.milestoneSchFinancial, "Output: draft/cập nhật phần trình ký RSD."),
    slot("2026-06-30", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_pm", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-06-30", "17:00", "18:30", "Chuyển lên Ban Core", C, "final_focus", undefined, undefined, "1 block cuối ngày; không tạo buffer pending riêng."),
    slot("2026-06-30", "20:00", "21:00", "Chuẩn bị / học Tiếng Anh Cambridge cho Thứ 4", F, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish, "Theo correction mới nhất: Thứ 4 học Cambridge."),

    slot("2026-07-01", "05:30", "07:00", "Walk", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Walk detail do Health Engine xử lý."),
    slot("2026-07-01", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "1-2 eggs; green tea; plan garlic; skip ginkgo."),
    slot("2026-07-01", "07:00", "07:05", "Nhắc vợ gọi cô Giang trường Tiểu học Đống Đa", F, "micro_mark", catalog.expeditionFamilyRhythm, undefined, "Mark riêng lúc 07:00."),
    slot("2026-07-01", "08:00", "09:30", "DCH Sprint 0 — Đề xuất backlog giai đoạn 1", C, "morning_activity", catalog.expeditionDch, catalog.milestoneDchSprint0, "Output: backlog draft giai đoạn 1."),
    slot("2026-07-01", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_am", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-07-01", "13:30", "15:00", "DCH Sprint 0 — Mockup giao diện mở mới trên SCH, sử dụng multi account", C, "afternoon_activity", catalog.expeditionDch, catalog.milestoneDchSprint0, "Output: mockup luồng mở mới trên SCH có multi account."),
    slot("2026-07-01", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_pm", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-07-01", "17:00", "18:30", "Waymark — Fix bug Google Drive", F, "final_focus", catalog.expeditionWaymark, catalog.milestoneWaymark, "Carryover. Waymark chỉ đặt block cuối ngày."),
    slot("2026-07-01", "20:00", "21:00", "Học tiếng Anh / kiểm tra bài ngày mai", F, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish, "Thứ 5 không có lớp cố định. Evening nhẹ."),

    slot("2026-07-02", "05:30", "07:00", "Workout A2", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Health Engine owns detail."),
    slot("2026-07-02", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "1-2 eggs; green tea; plan garlic; skip ginkgo."),
    slot("2026-07-02", "08:00", "09:30", "DCH — Đề xuất cơ chế quản lý dự án, lấy story done trong tuần, công việc Scrum Master, masterplan DCH", C, "morning_activity", catalog.expeditionDch, catalog.milestoneDchSprint0, "Output: cơ chế quản lý dự án, story done, việc Scrum Master, masterplan DCH."),
    slot("2026-07-02", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_am", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-07-02", "13:30", "15:00", "DCH — Luồng giao dịch rút tiền sub account; luồng giao dịch chuyển tiền nội bộ sub account", C, "afternoon_activity", catalog.expeditionDch, catalog.milestoneDchSprint0, "Output: luồng rút tiền và chuyển tiền nội bộ sub account."),
    slot("2026-07-02", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_pm", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-07-02", "17:00", "18:30", "DCH — Luồng sequence hạch toán sub account", C, "final_focus", catalog.expeditionDch, catalog.milestoneDchSprint0, "Output: sequence hạch toán sub account."),
    slot("2026-07-02", "20:00", "21:00", "Chuẩn bị / học Tiếng Anh Cambridge cho Thứ 6", F, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish, "Theo lịch học của con."),

    slot("2026-07-03", "05:30", "07:00", "Workout B", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Health Engine owns detail."),
    slot("2026-07-03", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "1-2 eggs; green tea; plan garlic; skip ginkgo."),
    slot("2026-07-03", "08:00", "09:30", "Chỉnh sửa / xin ý kiến / transfer luồng sequence sub account", C, "morning_activity", catalog.expeditionDch, catalog.milestoneDchSprint0, "Output: chỉnh sửa, xin ý kiến, transfer luồng sequence sub account."),
    slot("2026-07-03", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_am", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-07-03", "13:30", "15:00", "Book họp team SCH", C, "afternoon_activity", catalog.expeditionSch, undefined, "Output: book họp team SCH."),
    slot("2026-07-03", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_pm", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-07-03", "17:00", "18:30", "Weekly Planning", F, "final_focus", catalog.expeditionWaymark, catalog.milestoneWaymark, "Weekly Planning cuối tuần."),
    slot("2026-07-03", "20:00", "21:00", "Đọc sách / tiếng Anh nhẹ", F, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish, "Thứ 7 không còn Cambridge. Evening nhẹ."),

    slot("2026-07-04", "05:30", "07:00", "Walk", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Walk detail do Health Engine xử lý."),
    slot("2026-07-04", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "1-2 eggs; green tea; plan garlic; skip ginkgo."),
    slot("2026-07-04", "08:00", "11:15", "SNAG Golf League — cả nhà tham dự", S, "snag_golf_league", undefined, undefined, "Sự kiện chính sáng Thứ 7."),
    slot("2026-07-04", "13:30", "16:45", "Chơi ở công viên", F, "afternoon_family", catalog.expeditionFamilyRhythm, undefined, "Chơi nhẹ, không tìm event đặc biệt."),
    slot("2026-07-04", "17:00", "18:30", "Nấu ăn / chơi nhẹ tại nhà", F, "family_final", catalog.expeditionFamilyRhythm, undefined, "Recovery sau SNAG + công viên."),
    slot("2026-07-04", "20:00", "21:00", "Home recovery sau SNAG + công viên", F, "evening_activity", catalog.expeditionFamilyRhythm, undefined, "Tắm, ăn tối, ngủ sớm."),

    slot("2026-07-05", "05:30", "07:00", "Walk", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Walk detail do Health Engine xử lý."),
    slot("2026-07-05", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "1-2 eggs; green tea; plan garlic; skip ginkgo."),
    slot("2026-07-05", "08:00", "11:15", "Tony học golf tại EPGA", F, "morning_family", catalog.expeditionFamilyRhythm, undefined, "Không xếp outing đè lên."),
    slot("2026-07-05", "09:45", "11:15", "EPGA support — đưa đón / theo dõi buổi học", F, "morning_support", catalog.expeditionFamilyRhythm, undefined, "Đưa đón / theo dõi buổi học.", true),
    slot("2026-07-05", "13:30", "15:00", "Thi đấu 9 hố ở EPGA", F, "afternoon_family", catalog.expeditionFamilyRhythm, undefined, "Thi đấu 9 hố ở EPGA."),
    slot("2026-07-05", "15:15", "16:45", "Thi đấu 9 hố ở EPGA — tiếp tục / support", F, "afternoon_support", catalog.expeditionFamilyRhythm, undefined, "Tiếp tục / support thi đấu 9 hố ở EPGA."),
    slot("2026-07-05", "17:00", "18:30", "Recovery sau thi đấu / meal prep nhẹ", F, "family_final", catalog.expeditionFamilyRhythm, undefined, "Recovery sau thi đấu / meal prep nhẹ."),
    slot("2026-07-05", "20:00", "21:00", "Chuẩn bị cặp sách + Toán/Tiếng Việt cho Thứ 2", F, "evening_activity", catalog.expeditionFamilyRhythm, undefined, "Theo rule evening: Thứ 2 tiền tiểu học."),
  ];
}

export function buildWeeklyTimetable202607020305Patch(catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
  const H = catalog.pathHealth;
  const F = catalog.pathFamily;
  const C = catalog.pathCareer;

  return [
    slot("2026-07-02", "05:30", "07:00", "Workout A2", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Health Engine owns detail."),
    slot("2026-07-02", "08:00", "09:30", "DCH — Đề xuất cơ chế quản lý dự án, lấy story done trong tuần, công việc Scrum Master, masterplan DCH", C, "morning_activity", catalog.expeditionDch, catalog.milestoneDchSprint0, "Output: cơ chế quản lý dự án, story done, việc Scrum Master, masterplan DCH."),
    slot("2026-07-02", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_am", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-07-02", "13:30", "15:00", "DCH — Luồng giao dịch rút tiền sub account; luồng giao dịch chuyển tiền nội bộ sub account", C, "afternoon_activity", catalog.expeditionDch, catalog.milestoneDchSprint0, "Output: luồng rút tiền và chuyển tiền nội bộ sub account."),
    slot("2026-07-02", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_pm", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-07-02", "17:00", "18:30", "DCH — Luồng sequence hạch toán sub account", C, "final_focus", catalog.expeditionDch, catalog.milestoneDchSprint0, "Output: sequence hạch toán sub account."),
    slot("2026-07-02", "20:00", "21:00", "Chuẩn bị / học Tiếng Anh Cambridge cho Thứ 6", F, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish, "Theo lịch học của con."),

    slot("2026-07-03", "05:30", "07:00", "Workout B", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Health Engine owns detail."),
    slot("2026-07-03", "08:00", "09:30", "Chỉnh sửa / xin ý kiến / transfer luồng sequence sub account", C, "morning_activity", catalog.expeditionDch, catalog.milestoneDchSprint0, "Output: chỉnh sửa, xin ý kiến, transfer luồng sequence sub account."),
    slot("2026-07-03", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_am", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-07-03", "13:30", "15:00", "Book họp team SCH", C, "afternoon_activity", catalog.expeditionSch, undefined, "Output: book họp team SCH."),
    slot("2026-07-03", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_pm", undefined, undefined, "Giữ nguyên supervising block."),
    slot("2026-07-03", "17:00", "18:30", "Weekly Planning", F, "final_focus", catalog.expeditionWaymark, catalog.milestoneWaymark, "Weekly Planning cuối tuần."),
    slot("2026-07-03", "20:00", "21:00", "Đọc sách / tiếng Anh nhẹ", F, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish, "Thứ 7 không còn Cambridge. Evening nhẹ."),

    slot("2026-07-05", "05:30", "07:00", "Walk", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Walk detail do Health Engine xử lý."),
    slot("2026-07-05", "08:00", "11:15", "Tony học golf tại EPGA", F, "morning_family", catalog.expeditionFamilyRhythm, undefined, "Không xếp outing đè lên.", true),
    slot("2026-07-05", "09:45", "11:15", "EPGA support — đưa đón / theo dõi buổi học", F, "morning_support", catalog.expeditionFamilyRhythm, undefined, "Đưa đón / theo dõi buổi học.", true),
    slot("2026-07-05", "13:30", "15:00", "Thi đấu 9 hố ở EPGA", F, "afternoon_family", catalog.expeditionFamilyRhythm, undefined, "Thi đấu 9 hố ở EPGA.", true),
    slot("2026-07-05", "15:15", "16:45", "Thi đấu 9 hố ở EPGA — tiếp tục / support", F, "afternoon_support", catalog.expeditionFamilyRhythm, undefined, "Tiếp tục / support thi đấu 9 hố ở EPGA.", true),
    slot("2026-07-05", "17:00", "18:30", "Recovery sau thi đấu / meal prep nhẹ", F, "family_final", catalog.expeditionFamilyRhythm, undefined, "Recovery sau thi đấu / meal prep nhẹ."),
    slot("2026-07-05", "20:00", "21:00", "Chuẩn bị cặp sách + Toán/Tiếng Việt cho Thứ 2", F, "evening_activity", catalog.expeditionFamilyRhythm, undefined, "Theo rule evening: Thứ 2 tiền tiểu học."),
  ];
}

const WEEKLY_BODY_START_DATES = ["2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"] as const;

const WEEKLY_SIGNAL_PACK_2026_06_29_TO_07_05: WeeklySignalPackInput[] = [
  ...WEEKLY_BODY_START_DATES.map((localDate) => signalPack(localDate, "07:10", "style.daily-grooming-presence-check")),
  ...["2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03"].map((localDate) => signalPack(localDate, "07:30", "family.before-leaving-home-check")),
  ...WEEKLY_BODY_START_DATES.map((localDate) => signalPack(localDate, "21:30", "family.home-shutdown-check")),
  signalPack("2026-06-29", "19:45", "character.pilgrimage-readiness-check"),
  signalPack("2026-07-04", "07:00", "golf.golf-outing-readiness-check"),
  signalPack("2026-07-04", "13:00", "family.before-leaving-home-check"),
  signalPack("2026-07-05", "06:30", "golf.golf-outing-readiness-check"),
];

const WEEKLY_MARK_SIGNALS_2026_06_29_TO_07_05: WeeklyMarkSignalInput[] = [
  markSignal("2026-07-01", "07:00", "Nhắc vợ gọi cô Giang trường Tiểu học Đống Đa"),
];

export async function importWeeklyTimetable20260629To0705(
  services: ImportServices,
  userId: string,
  timezone: string,
): Promise<WeeklyTimetable20260629ImportReport> {
  const repos = services.repositories;
  await bootstrapWaymarkMap({ repositories: repos, userId }, WAYMARK_MAP_CONFIG);
  const structure = await ensureWeeklyStructure(repos, userId);
  const catalog = await resolveWeeklyCatalogIds(repos, userId, structure);

  const report = await importWeeklyTimetable(repos, {
    userId,
    weekStartDate: "2026-06-29",
    weekEndDate: "2026-07-05",
    note: "Imported from approved weekly timetable 2026-06-29 to 2026-07-05. Planned/Routine/Micro/Lunar marks use schedule only; due dates live only on the two Expeditions and two Milestones.",
    importBatchId: "weekly_timetable_2026_06_29_2026_07_05_approved_no_mark_due_dates",
    allowTitleRefs: true,
    items: buildWeeklyTimetable20260629To0705(catalog),
    setMarkDueAt: false,
  });
  const { packChecks, signals } = await ensureWeeklySignals(services, userId, timezone, report);

  return {
    ...report,
    ...structure,
    packChecks,
    signals,
  };
}

export async function importWeeklyTimetable202607020305Patch(
  services: ImportServices,
  userId: string,
): Promise<WeeklyTimetable202607020305PatchReport> {
  const repos = services.repositories;
  await bootstrapWaymarkMap({ repositories: repos, userId }, WAYMARK_MAP_CONFIG);
  const structure = await ensureWeeklyStructure(repos, userId);
  const catalog = await resolveWeeklyCatalogIds(repos, userId, structure);
  const items = buildWeeklyTimetable202607020305Patch(catalog);
  const cleanup = await cleanupSupersededPatchItems(services, userId, items);

  const report = await importWeeklyTimetable(repos, {
    userId,
    weekStartDate: "2026-06-29",
    weekEndDate: "2026-07-05",
    note: "Patched only 2026-07-02, 2026-07-03, and 2026-07-05 weekly timetable marks.",
    importBatchId: "weekly_timetable_2026_07_02_03_05_patch_only",
    allowTitleRefs: true,
    items,
    setMarkDueAt: false,
  });
  await repairPatchMaterializedMarks(repos, report);

  return {
    ...report,
    items: report.items.filter((item) => item.localDate === "2026-07-02" || item.localDate === "2026-07-03" || item.localDate === "2026-07-05"),
    ...structure,
    ...cleanup,
  };
}

async function cleanupSupersededPatchItems(
  services: ImportServices,
  userId: string,
  desiredItems: WeeklyTimetableImportSlotInput[],
) {
  const repos = services.repositories;
  const targetDates = new Set(desiredItems.map((item) => item.localDate));
  const desiredKeys = new Set(desiredItems.map((item) => buildPatchImportKey(item)));
  const weekPlan = await repos.weekPlans.getByWeekStart(userId, "2026-06-29");
  const removedWeekPlanItemIds: string[] = [];
  const removedMarkIds: string[] = [];
  const cancelledSignals: Signal[] = [];

  if (!weekPlan) {
    return { removedWeekPlanItemIds, removedMarkIds, cancelledSignals };
  }

  const weekItems = await repos.weekPlans.listItems(weekPlan.id);
  for (const item of weekItems) {
    if (!item.localDate || !targetDates.has(item.localDate) || !item.deterministicImportKey || desiredKeys.has(item.deterministicImportKey)) {
      continue;
    }
    if (!item.deterministicImportKey.startsWith("weekly_timetable:2026-06-29:")) {
      continue;
    }

    const mark = item.createdMarkInstanceId ? await repos.marks.getMarkInstanceById(item.createdMarkInstanceId) : null;
    if (mark && !isRemovableWeeklyPatchMark(mark)) {
      continue;
    }

    await repos.weekPlans.softDeleteWeekPlanItem(item.id);
    removedWeekPlanItemIds.push(item.id);

    if (mark) {
      cancelledSignals.push(
        ...(await services.signalEngine.cancelSignalsForTarget({
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          reason: "Weekly timetable patch superseded this unresolved mark.",
        })),
      );
      await repos.marks.softDeleteMarkInstance(mark.id);
      removedMarkIds.push(mark.id);
    }
  }

  return { removedWeekPlanItemIds, removedMarkIds, cancelledSignals };
}

async function repairPatchMaterializedMarks(repos: WaymarkRepositories, report: WeeklyTimetableImportReport) {
  for (const item of report.items) {
    if (!item.createdMarkInstanceId || !item.localDate || !item.startTime || !item.endTime || !item.title) {
      continue;
    }
    if (item.localDate !== "2026-07-02" && item.localDate !== "2026-07-03" && item.localDate !== "2026-07-05") {
      continue;
    }
    const mark = await repos.marks.getMarkInstanceById(item.createdMarkInstanceId);
    if (!mark || isFinalMark(mark)) {
      continue;
    }

    await repos.marks.updateMarkInstance(mark.id, {
      title: item.title,
      description: item.description ?? null,
      pathId: item.pathId,
      templateId: item.templateId ?? null,
      expeditionId: item.expeditionId ?? null,
      milestoneId: item.milestoneId ?? null,
      scheduledStartAt: buildFloatingDateTime(item.localDate, item.startTime),
      scheduledEndAt: buildFloatingDateTime(item.localDate, item.endTime),
      dueAt: null,
    });
  }
}

async function ensureWeeklyStructure(repos: WaymarkRepositories, userId: string): Promise<WeeklyStructureReport> {
  const pathCareer = await resolveSeedEntityId(repos, userId, "path", "career");
  const dch = await ensureExpedition(repos, userId, pathCareer, "DCH Deposit Core Hub", "DCH weekly structure import.", "2026-12-30", 20);
  const baCore = await ensureExpedition(repos, userId, pathCareer, "Transfer kiến thức BA lên Core", "Core BA knowledge transfer.", "2026-12-30", 21);
  const dchSprint0 = await ensureMilestone(repos, userId, dch.id, "DCH Sprint 0", "Milestone mới thuộc DCH.", "2026-07-12", 0);
  const baRsd = await ensureMilestone(repos, userId, baCore.id, "Quy trình BA và RSD", "Milestone mới thuộc Transfer kiến thức BA lên Core.", "2026-07-12", 0);
  return { expeditions: [dch, baCore], milestones: [dchSprint0, baRsd] };
}

async function ensureExpedition(
  repos: WaymarkRepositories,
  userId: string,
  pathId: string,
  title: string,
  description: string,
  targetDate: string,
  sortOrder: number,
) {
  const existing = (await repos.expeditions.listExpeditionsByPath(pathId)).items.find((item) => item.title === title);
  if (existing) {
    return repos.expeditions.updateExpedition(existing.id, {
      description,
      status: ExpeditionStatus.Planned,
      targetDate,
      sortOrder,
    });
  }
  return repos.expeditions.createExpedition({
    userId,
    pathId,
    title,
    description,
    status: ExpeditionStatus.Planned,
    targetDate,
    sortOrder,
  });
}

async function ensureMilestone(
  repos: WaymarkRepositories,
  userId: string,
  expeditionId: string,
  title: string,
  description: string,
  targetDate: string,
  sortOrder: number,
) {
  const existing = (await repos.expeditions.listMilestonesByExpedition(expeditionId)).find((item) => item.title === title);
  if (existing) {
    return repos.expeditions.updateMilestone(existing.id, {
      description,
      status: MilestoneStatus.Planned,
      targetDate,
      sortOrder,
      orderIndex: sortOrder,
    });
  }
  return repos.expeditions.createMilestone({
    userId,
    expeditionId,
    title,
    description,
    status: MilestoneStatus.Planned,
    targetDate,
    sortOrder,
    orderIndex: sortOrder,
  });
}

async function ensureWeeklySignals(
  services: ImportServices,
  userId: string,
  timezone: string,
  report: WeeklyTimetableImportReport,
) {
  const packChecks: PackCheckInstance[] = [];
  const signals: Signal[] = [];
  const markByTitleDate = new Map(report.items.map((item) => [`${item.localDate}:${item.title}`, item.createdMarkInstanceId] as const));

  for (const localDate of WEEKLY_BODY_START_DATES) {
    const markId = report.items.find((item) => item.localDate === localDate && item.blockKey === "workout")?.createdMarkInstanceId;
    if (!markId) {
      throw new Error(`Missing workout/walk Mark for Body Start signal on ${localDate}.`);
    }
    signals.push(await ensureSignal(services, userId, SignalTargetType.MarkInstance, markId, localDate, "05:30", timezone));
  }

  for (const input of WEEKLY_MARK_SIGNALS_2026_06_29_TO_07_05) {
    const markId = markByTitleDate.get(`${input.localDate}:${input.title}`);
    if (!markId) {
      throw new Error(`Missing Mark "${input.title}" for signal on ${input.localDate}.`);
    }
    signals.push(await ensureSignal(services, userId, SignalTargetType.MarkInstance, markId, input.localDate, input.time, timezone));
  }

  for (const input of WEEKLY_SIGNAL_PACK_2026_06_29_TO_07_05) {
    const packCheck = await ensurePackCheckInstanceForSignal(services.repositories, userId, input);
    packChecks.push(packCheck);
    signals.push(await ensureSignal(services, userId, SignalTargetType.PackCheckInstance, packCheck.id, input.localDate, input.time, timezone));
  }

  return { packChecks: dedupeById(packChecks), signals: dedupeById(signals) };
}

async function ensurePackCheckInstanceForSignal(repos: WaymarkRepositories, userId: string, input: WeeklySignalPackInput) {
  const templateId = await resolveSeedEntityId(repos, userId, "pack_check_template", input.sourceSeedId);
  const template = await repos.packChecks.getTemplateById(templateId);
  if (!template) {
    throw new Error(`Missing pack check template for source "${input.sourceSeedId}".`);
  }

  const generationKey = `weekly_signal_pack:2026-06-29:${template.id}:${input.localDate}:${input.time}`;
  const existing = await repos.packChecks.findInstanceByGenerationKey(userId, generationKey);
  if (existing) {
    await ensurePackCheckItemSnapshots(repos, existing.id, template.id);
    return existing;
  }

  const trailDay = await repos.trailDays.getOrCreateTrailDay(userId, input.localDate);
  const nowIso = new Date().toISOString();
  const created = await repos.packChecks.upsertInstance({
    id: createLocalId("pack_check_instance"),
    userId,
    templateId: template.id,
    trailDayId: trailDay.id,
    title: template.title,
    description: template.description,
    status: PackCheckInstanceStatus.Available,
    availableFrom: `${input.localDate}T${input.time}:00.000`,
    dueAt: undefined,
    generationKey,
    createdAt: nowIso,
    updatedAt: nowIso,
    syncVersion: 0,
  });
  await ensurePackCheckItemSnapshots(repos, created.id, template.id);
  return created;
}

async function ensurePackCheckItemSnapshots(repos: WaymarkRepositories, packCheckInstanceId: string, templateId: string) {
  const existingItems = await repos.packChecks.listItemInstances(packCheckInstanceId);
  if (existingItems.length > 0) {
    return;
  }

  const nowIso = new Date().toISOString();
  const templates = await repos.packChecks.listItemTemplates(templateId);
  await repos.packChecks.upsertItemInstances(
    templates.map((item) => ({
      id: createLocalId("pack_check_item_instance"),
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
  const existing = (await services.repositories.signals.listSignalsByTarget(targetType, targetId)).find((signal) => signal.scheduledAt === scheduledAt);
  if (existing) {
    return existing;
  }
  return services.signalEngine.createSignal({ userId, targetType, targetId, scheduledAt, status: SignalStatus.Scheduled });
}

async function resolveWeeklyCatalogIds(
  repos: WaymarkRepositories,
  userId: string,
  structure: WeeklyStructureReport,
): Promise<WeeklyCatalogIds> {
  return {
    pathCareer: await resolveSeedEntityId(repos, userId, "path", "career"),
    pathFamily: await resolveSeedEntityId(repos, userId, "path", "family"),
    pathHealth: await resolveSeedEntityId(repos, userId, "path", "health"),
    pathSnag: await resolveSeedEntityId(repos, userId, "path", "snag"),
    expeditionSch: await resolveSeedEntityId(repos, userId, "expedition", "career.sch.expedition.smart-counter-hub-project"),
    expeditionCutTo70: await resolveSeedEntityId(repos, userId, "expedition", "health.cut70.expedition"),
    expeditionWaymark: await resolveSeedEntityId(repos, userId, "expedition", "family.waymark.expedition"),
    expeditionEnglish: await resolveSeedEntityId(repos, userId, "expedition", "family.english.expedition"),
    expeditionFamilyRhythm: await resolveSeedEntityId(repos, userId, "expedition", "family.rhythm.expedition"),
    expeditionDch: structure.expeditions[0].id,
    expeditionBaCore: structure.expeditions[1].id,
    milestoneSchAutoQlsd: await resolveSeedEntityId(repos, userId, "milestone", "career.sch.milestone.2026-08.auto-qlsd-form"),
    milestoneSchFinancial: await resolveSeedEntityId(repos, userId, "milestone", "career.sch.milestone.2026-08.credit-card-debt-collection-adjustment"),
    milestoneWaymark: await resolveSeedEntityId(repos, userId, "milestone", "family.waymark.milestone.anniversary-edition"),
    milestoneEnglish: await resolveSeedEntityId(repos, userId, "milestone", "family.english.milestone.grammar-book"),
    milestoneCutTo70: await resolveSeedEntityId(repos, userId, "milestone", "health.cut70.milestone.76kg"),
    milestoneDchSprint0: structure.milestones[0].id,
    milestoneBaRsd: structure.milestones[1].id,
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

function signalPack(localDate: string, time: string, sourceSeedId: string): WeeklySignalPackInput {
  return { localDate, time, sourceSeedId };
}

function markSignal(localDate: string, time: string, title: string): WeeklyMarkSignalInput {
  return { localDate, time, title };
}

function buildPatchImportKey(item: WeeklyTimetableImportSlotInput) {
  return `weekly_timetable:2026-06-29:${item.localDate}:${item.startTime}:${item.endTime}:${item.blockKey}:${item.pathId}`;
}

function buildFloatingDateTime(localDate: string, time: string): string {
  return `${localDate}T${time}:00.000`;
}

function isFinalMark(mark: MarkInstance) {
  return (
    mark.status === MarkInstanceStatus.Completed ||
    mark.status === MarkInstanceStatus.Skipped ||
    mark.status === MarkInstanceStatus.Rescheduled ||
    mark.status === MarkInstanceStatus.Substituted ||
    mark.status === MarkInstanceStatus.Cancelled ||
    mark.status === MarkInstanceStatus.Expired
  );
}

function isRemovableWeeklyPatchMark(mark: MarkInstance) {
  return (
    mark.origin === MarkInstanceOrigin.WeeklyPlanned &&
    !isFinalMark(mark) &&
    (mark.status === MarkInstanceStatus.Planned ||
      mark.status === MarkInstanceStatus.Ready ||
      mark.status === MarkInstanceStatus.Blocked ||
      mark.status === MarkInstanceStatus.Active)
  );
}

function createLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function dedupeById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
