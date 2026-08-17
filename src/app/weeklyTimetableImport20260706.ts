import type { Expedition, Milestone, Signal, WaymarkRepositories } from "../domain/waymark";
import { ExpeditionStatus, MilestoneStatus, SignalStatus, SignalTargetType } from "../domain/waymark/enums";
import type { SignalEngine } from "../domain/waymark/services";
import { importWeeklyTimetable, type WeeklyTimetableImportReport, type WeeklyTimetableImportSlotInput } from "../lib/waymark/weeklyTimetableImport";
import { bootstrapWaymarkMap } from "../waymark-map/bootstrap";
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
  expeditionSch: string;
  expeditionCutTo70: string;
  expeditionWaymark: string;
  expeditionEnglish: string;
  expeditionFamilyRhythm: string;
  expeditionDch: string;
  expeditionTonyGolf: string;
  milestoneSchAutoQlsd: string;
  milestoneSchFinancial: string;
  milestoneSchDomesticDebit: string;
  milestoneCutTo70: string;
  milestoneWaymark: string;
  milestoneEnglish: string;
  milestoneDchSprint0: string;
  milestoneDchSubAccount: string;
  milestoneDchGl: string;
  milestoneTonyGolfQuangNinh: string;
  milestoneTonyGolfEpga: string;
};

type WeeklyStructureReport = {
  expeditions: Expedition[];
  milestones: Milestone[];
};

type WeeklyMarkSignalInput = {
  localDate: string;
  time: string;
  title: string;
  blockKey?: string;
};

export type WeeklyTimetable20260706ImportReport = WeeklyTimetableImportReport & WeeklyStructureReport & {
  signals: Signal[];
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

export function buildWeeklyTimetable20260706To0712(catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
  const C = catalog.pathCareer;
  const F = catalog.pathFamily;
  const H = catalog.pathHealth;

  return [
    slot("2026-07-06", "05:30", "07:00", "Workout Day A", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Health Engine owns details."),
    slot("2026-07-06", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "1-2 trứng; trà xanh; plan garlic."),
    slot("2026-07-06", "08:00", "09:30", "DCH Sprint 0: quy trình Scrum Master áp dụng Sprint 7.1", C, "morning_activity", catalog.expeditionDch, catalog.milestoneDchSprint0, "Output: rule áp dụng Sprint 7.1 / checklist Scrum Master."),
    slot("2026-07-06", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_am", undefined, undefined, "Check & triage, không xử lý sâu."),
    slot("2026-07-06", "13:30", "15:00", "DCH: RSD rút tiền mặt + RSD chuyển tiền nội bộ", C, "afternoon_activity", catalog.expeditionDch, catalog.milestoneDchSubAccount, "Output: draft/update section chính; cảnh báo không đủ cho full RSD."),
    slot("2026-07-06", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_pm", undefined, undefined, "Check & triage."),
    slot("2026-07-06", "17:00", "18:30", "RSD thu chi GL", C, "final_focus", catalog.expeditionDch, catalog.milestoneDchGl, "Output: draft rule/flow thu chi GL."),
    slot("2026-07-06", "20:00", "21:00", "Trông con làm bài Toán + tiếng Việt", F, "evening_activity", catalog.expeditionFamilyRhythm, undefined, "Hỗ trợ bài tiền tiểu học."),

    slot("2026-07-07", "05:30", "07:00", "Workout Day B", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Health Engine owns details."),
    slot("2026-07-07", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "1-2 trứng; trà xanh; plan garlic."),
    slot("2026-07-07", "08:00", "09:30", "Họp transfer yêu cầu giao dịch tài chính Sub-account", C, "morning_activity", catalog.expeditionDch, catalog.milestoneDchSubAccount, "Output: meeting note, issue list, owner/action list."),
    slot("2026-07-07", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_am", undefined, undefined, "Check & triage."),
    slot("2026-07-07", "13:30", "15:00", "Update RSD giao dịch Sub-account", C, "afternoon_activity", catalog.expeditionDch, catalog.milestoneDchSubAccount, "Output: update bản RSD theo input họp sáng."),
    slot("2026-07-07", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_pm", undefined, undefined, "Check & triage."),
    slot("2026-07-07", "17:00", "18:30", "Update RSD phát hành thẻ GNNĐ", C, "final_focus", catalog.expeditionSch, catalog.milestoneSchDomesticDebit, "Output: update section/rule còn thiếu."),
    slot("2026-07-07", "20:00", "21:00", "Học tiếng Anh / chuẩn bị Cambridge", F, "evening_activity", catalog.expeditionEnglish, catalog.milestoneEnglish, "Chuẩn bị bài Cambridge."),

    slot("2026-07-08", "05:30", "07:00", "Workout Walk", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Walk giữ nhịp trước ngày di chuyển."),
    slot("2026-07-08", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "Ăn/uống trước ngày di chuyển."),
    slot("2026-07-08", "08:00", "09:30", "QLSD Thẻ GNNĐ", C, "morning_activity", catalog.expeditionSch, catalog.milestoneSchAutoQlsd, "Output: chốt nội dung cần update / review."),
    slot("2026-07-08", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", C, "supervising_am", undefined, undefined, "Check trước khi di chuyển."),
    slot("2026-07-08", "13:30", "15:00", "Di chuyển đi Quảng Ninh — không đặt block việc", F, "afternoon_activity", catalog.expeditionTonyGolf, catalog.milestoneTonyGolfQuangNinh, "Travel block."),
    slot("2026-07-08", "15:15", "16:45", "Di chuyển đi Quảng Ninh — không đặt block việc", F, "travel_support", catalog.expeditionTonyGolf, catalog.milestoneTonyGolfQuangNinh, "Travel block."),
    slot("2026-07-08", "17:00", "18:30", "Ổn định khách sạn / kiểm tra đồ golf", F, "family_final", catalog.expeditionTonyGolf, catalog.milestoneTonyGolfQuangNinh, "Gậy, bóng, găng, giày, nước, trang phục."),
    slot("2026-07-08", "20:00", "21:00", "Family travel evening — kiểm tra đồ golf ngày mai", F, "evening_activity", catalog.expeditionTonyGolf, catalog.milestoneTonyGolfQuangNinh, "Không học nặng."),

    slot("2026-07-09", "05:30", "07:00", "Workout Day A nhẹ / Walk khách sạn", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Không quá tải trước lịch giải."),
    slot("2026-07-09", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "Linh hoạt theo khách sạn."),
    slot("2026-07-09", "08:00", "09:30", "Đưa con đi giải golf Quảng Ninh", F, "morning_activity", catalog.expeditionTonyGolf, catalog.milestoneTonyGolfQuangNinh, "Family-first."),
    slot("2026-07-09", "09:45", "11:15", "Remote Supervising — check điện thoại/máy tính", C, "supervising_am", undefined, undefined, "Chỉ check/triage, không deep work."),
    slot("2026-07-09", "13:30", "15:00", "Waymark — Tích hợp Google Drive", F, "afternoon_activity", catalog.expeditionWaymark, catalog.milestoneWaymark, "Một block Waymark buổi chiều; output nhỏ, không biến thành BIDV deep work."),
    slot("2026-07-09", "15:15", "16:45", "Remote Supervising — check điện thoại/máy tính", C, "supervising_pm", undefined, undefined, "Chỉ check/triage."),
    slot("2026-07-09", "17:00", "18:30", "Phục hồi sau ngày thi đấu", F, "family_final", catalog.expeditionTonyGolf, catalog.milestoneTonyGolfQuangNinh, "Ăn tối, nghỉ, không học nặng."),
    slot("2026-07-09", "20:00", "21:00", "Family recovery sau giải", F, "evening_activity", catalog.expeditionFamilyRhythm, undefined, "Đọc sách nhẹ / ngủ sớm."),

    slot("2026-07-10", "05:30", "07:00", "Workout Day B nhẹ / Walk khách sạn", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Không quá tải."),
    slot("2026-07-10", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "Linh hoạt theo khách sạn."),
    slot("2026-07-10", "08:00", "09:30", "Đưa con đi giải golf Quảng Ninh", F, "morning_activity", catalog.expeditionTonyGolf, catalog.milestoneTonyGolfQuangNinh, "Family-first."),
    slot("2026-07-10", "09:45", "11:15", "Remote Supervising — check điện thoại/máy tính", C, "supervising_am", undefined, undefined, "Chỉ check/triage."),
    slot("2026-07-10", "13:30", "15:00", "Waymark — Tích hợp Turso", F, "afternoon_activity", catalog.expeditionWaymark, catalog.milestoneWaymark, "Một block Waymark buổi chiều; output nhỏ, không biến thành BIDV deep work."),
    slot("2026-07-10", "15:15", "16:45", "Remote Supervising — check điện thoại/máy tính", C, "supervising_pm", undefined, undefined, "Chỉ check/triage."),
    slot("2026-07-10", "17:00", "18:30", "Kết thúc giải / di chuyển về nếu phù hợp", F, "family_final", catalog.expeditionTonyGolf, catalog.milestoneTonyGolfQuangNinh, "Tùy lịch thực tế."),
    slot("2026-07-10", "20:00", "21:00", "Family recovery / đọc sách nhẹ", F, "evening_activity", catalog.expeditionFamilyRhythm, undefined, "Không học nặng."),

    slot("2026-07-11", "05:30", "07:00", "Workout Walk", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Walk nhẹ."),
    slot("2026-07-11", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "Quay lại routine."),
    slot("2026-07-11", "08:00", "09:30", "Chơi ở nhà / recovery sau Quảng Ninh", F, "morning_activity", catalog.expeditionFamilyRhythm, undefined, "Không đặt outing sáng."),
    slot("2026-07-11", "09:45", "11:15", "Chơi ở nhà / dọn đồ / nghỉ", F, "morning_support", catalog.expeditionFamilyRhythm, undefined, "Giặt đồ, dọn đồ golf."),
    slot("2026-07-11", "13:30", "15:00", "Đi công viên", F, "afternoon_activity", catalog.expeditionFamilyRhythm, undefined, "Đi nhẹ, không quá xa."),
    slot("2026-07-11", "15:15", "16:45", "Công viên / ăn nhẹ / về nhà", F, "afternoon_support", catalog.expeditionFamilyRhythm, undefined, "Kết thúc sớm."),
    slot("2026-07-11", "17:00", "18:30", "Về nhà, tắm, nghỉ, ăn tối nhẹ", F, "family_final", catalog.expeditionFamilyRhythm, undefined, "Không kéo dài."),
    slot("2026-07-11", "20:00", "21:00", "Đọc sách nhẹ / family recovery", F, "evening_activity", catalog.expeditionFamilyRhythm, undefined, "Ngủ sớm."),

    slot("2026-07-12", "05:30", "07:00", "Workout Day A nhẹ", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Không quá tải trước EPGA."),
    slot("2026-07-12", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "Bữa sáng đủ năng lượng."),
    slot("2026-07-12", "08:00", "09:30", "Đưa con học golf EPGA — buổi sáng", F, "morning_activity", catalog.expeditionTonyGolf, catalog.milestoneTonyGolfEpga, "Fixed family schedule."),
    slot("2026-07-12", "09:45", "11:15", "EPGA — support con học golf", F, "morning_support", catalog.expeditionTonyGolf, catalog.milestoneTonyGolfEpga, "Theo sát / hỗ trợ logistics."),
    slot("2026-07-12", "13:30", "15:00", "Đưa con học golf EPGA — buổi chiều", F, "afternoon_activity", catalog.expeditionTonyGolf, catalog.milestoneTonyGolfEpga, "Fixed family schedule."),
    slot("2026-07-12", "15:15", "16:45", "EPGA — support con học golf", F, "afternoon_support", catalog.expeditionTonyGolf, catalog.milestoneTonyGolfEpga, "Theo sát / hỗ trợ logistics."),
    slot("2026-07-12", "17:00", "18:30", "Về nhà, nghỉ, chuẩn bị tuần mới", F, "family_final", catalog.expeditionFamilyRhythm, undefined, "Chuẩn bị đồ đi làm/đồ học."),
    slot("2026-07-12", "20:00", "21:00", "Chuẩn bị Toán + tiếng Việt cho Thứ 2", F, "evening_activity", catalog.expeditionFamilyRhythm, undefined, "Tiền tiểu học — Toán + tiếng Việt."),
  ];
}

const WEEKLY_MARK_SIGNALS_2026_07_06_TO_07_12: WeeklyMarkSignalInput[] = [
  markSignal("2026-07-06", "05:20", "Workout Day A"),
  markSignal("2026-07-06", "07:55", "DCH Sprint 0: quy trình Scrum Master áp dụng Sprint 7.1"),
  markSignal("2026-07-06", "09:40", "Supervising Block — Check Zalo, mail, Confluence, Jira", "supervising_am"),
  markSignal("2026-07-06", "13:00", "DCH: RSD rút tiền mặt + RSD chuyển tiền nội bộ"),
  markSignal("2026-07-06", "15:10", "Supervising Block — Check Zalo, mail, Confluence, Jira", "supervising_pm"),
  markSignal("2026-07-06", "16:55", "RSD thu chi GL"),
  markSignal("2026-07-06", "19:55", "Trông con làm bài Toán + tiếng Việt"),

  markSignal("2026-07-07", "05:20", "Workout Day B"),
  markSignal("2026-07-07", "07:55", "Họp transfer yêu cầu giao dịch tài chính Sub-account"),
  markSignal("2026-07-07", "09:40", "Supervising Block — Check Zalo, mail, Confluence, Jira", "supervising_am"),
  markSignal("2026-07-07", "13:00", "Update RSD giao dịch Sub-account"),
  markSignal("2026-07-07", "15:10", "Supervising Block — Check Zalo, mail, Confluence, Jira", "supervising_pm"),
  markSignal("2026-07-07", "16:55", "Update RSD phát hành thẻ GNNĐ"),
  markSignal("2026-07-07", "19:55", "Học tiếng Anh / chuẩn bị Cambridge"),

  markSignal("2026-07-08", "05:20", "Workout Walk"),
  markSignal("2026-07-08", "07:55", "QLSD Thẻ GNNĐ"),
  markSignal("2026-07-08", "09:40", "Supervising Block — Check Zalo, mail, Confluence, Jira", "supervising_am"),
  markSignal("2026-07-08", "13:20", "Di chuyển đi Quảng Ninh — không đặt block việc", "afternoon_activity"),
  markSignal("2026-07-08", "16:55", "Ổn định khách sạn / kiểm tra đồ golf"),
  markSignal("2026-07-08", "19:55", "Family travel evening — kiểm tra đồ golf ngày mai"),

  markSignal("2026-07-09", "05:20", "Workout Day A nhẹ / Walk khách sạn"),
  markSignal("2026-07-09", "07:55", "Đưa con đi giải golf Quảng Ninh"),
  markSignal("2026-07-09", "09:40", "Remote Supervising — check điện thoại/máy tính", "supervising_am"),
  markSignal("2026-07-09", "13:00", "Waymark — Tích hợp Google Drive"),
  markSignal("2026-07-09", "15:10", "Remote Supervising — check điện thoại/máy tính", "supervising_pm"),
  markSignal("2026-07-09", "16:55", "Phục hồi sau ngày thi đấu"),

  markSignal("2026-07-10", "05:20", "Workout Day B nhẹ / Walk khách sạn"),
  markSignal("2026-07-10", "07:55", "Đưa con đi giải golf Quảng Ninh"),
  markSignal("2026-07-10", "09:40", "Remote Supervising — check điện thoại/máy tính", "supervising_am"),
  markSignal("2026-07-10", "13:00", "Waymark — Tích hợp Turso"),
  markSignal("2026-07-10", "15:10", "Remote Supervising — check điện thoại/máy tính", "supervising_pm"),
  markSignal("2026-07-10", "16:55", "Kết thúc giải / di chuyển về nếu phù hợp"),

  markSignal("2026-07-11", "05:20", "Workout Walk"),
  markSignal("2026-07-11", "08:00", "Chơi ở nhà / recovery sau Quảng Ninh"),
  markSignal("2026-07-11", "13:20", "Đi công viên"),
  markSignal("2026-07-11", "16:45", "Về nhà, tắm, nghỉ, ăn tối nhẹ"),
  markSignal("2026-07-11", "20:30", "Đọc sách nhẹ / family recovery"),

  markSignal("2026-07-12", "05:20", "Workout Day A nhẹ"),
  markSignal("2026-07-12", "07:55", "Đưa con học golf EPGA — buổi sáng"),
  markSignal("2026-07-12", "09:40", "EPGA — support con học golf", "morning_support"),
  markSignal("2026-07-12", "13:25", "Đưa con học golf EPGA — buổi chiều"),
  markSignal("2026-07-12", "15:10", "EPGA — support con học golf", "afternoon_support"),
  markSignal("2026-07-12", "16:55", "Về nhà, nghỉ, chuẩn bị tuần mới"),
  markSignal("2026-07-12", "19:55", "Chuẩn bị Toán + tiếng Việt cho Thứ 2"),
];

const WEEKLY_CLOSE_TRAIL_SIGNALS_2026_07_06_TO_07_12 = [
  trailSignal("2026-07-06", "21:15"),
  trailSignal("2026-07-07", "21:15"),
  trailSignal("2026-07-08", "21:15"),
  trailSignal("2026-07-09", "21:00"),
  trailSignal("2026-07-10", "21:00"),
  trailSignal("2026-07-11", "21:00"),
  trailSignal("2026-07-12", "21:15"),
];

export async function importWeeklyTimetable20260706To0712(
  services: ImportServices,
  userId: string,
  timezone: string,
): Promise<WeeklyTimetable20260706ImportReport> {
  const repos = services.repositories;
  await bootstrapWaymarkMap({ repositories: repos, userId }, WAYMARK_MAP_CONFIG);
  const structure = await ensureWeeklyStructure(repos, userId);
  const catalog = await resolveWeeklyCatalogIds(repos, userId, structure);

  const report = await importWeeklyTimetable(repos, {
    userId,
    weekStartDate: "2026-07-06",
    weekEndDate: "2026-07-12",
    note: "Imported from approved weekly timetable 2026-07-06 to 2026-07-12. Work/Career Monday-Wednesday; Family/Home Thursday-Sunday with Waymark afternoon blocks on 2026-07-09 and 2026-07-10. Signals are scheduled as full-screen alarms by the app alarm adapter.",
    importBatchId: "weekly_timetable_2026_07_06_2026_07_12_family_golf_waymark_signals",
    allowTitleRefs: true,
    items: buildWeeklyTimetable20260706To0712(catalog),
    setMarkDueAt: false,
  });
  const signals = await ensureWeeklySignals(services, userId, timezone, report);

  return {
    ...report,
    ...structure,
    signals,
  };
}

async function ensureWeeklyStructure(repos: WaymarkRepositories, userId: string): Promise<WeeklyStructureReport> {
  const pathCareer = await resolveSeedEntityId(repos, userId, "path", "career");
  const pathFamily = await resolveSeedEntityId(repos, userId, "path", "family");
  const dch = await ensureExpedition(repos, userId, pathCareer, "DCH Deposit Core Hub", "DCH weekly structure import.", "2026-12-30", 20);
  const tonyGolf = await ensureExpedition(repos, userId, pathFamily, "Tony Golf", "Family golf logistics and learning.", "2026-12-31", 30);
  const dchSprint0 = await ensureMilestone(repos, userId, dch.id, "DCH Sprint 0", "Scrum Master process and Sprint 7.1 setup.", "2026-07-12", 0);
  const dchSubAccount = await ensureMilestone(repos, userId, dch.id, "Giao dịch tài chính Sub-account", "RSD rút tiền mặt, chuyển tiền nội bộ, transfer và update.", "2026-07-12", 1);
  const dchGl = await ensureMilestone(repos, userId, dch.id, "Thu chi GL", "RSD flow/rule thu chi GL.", "2026-07-12", 2);
  const quangNinh = await ensureMilestone(repos, userId, tonyGolf.id, "Giải golf Quảng Ninh", "Travel, tournament support, recovery.", "2026-07-10", 0);
  const epga = await ensureMilestone(repos, userId, tonyGolf.id, "EPGA", "Sunday EPGA morning and afternoon support.", "2026-07-12", 1);
  return { expeditions: [dch, tonyGolf], milestones: [dchSprint0, dchSubAccount, dchGl, quangNinh, epga] };
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
  const signals: Signal[] = [];
  const markByTitleDateBlock = new Map(
    report.items.map((item) => [`${item.localDate}:${item.title}:${item.blockKey}`, item.createdMarkInstanceId] as const),
  );
  const markByTitleDate = new Map(report.items.map((item) => [`${item.localDate}:${item.title}`, item.createdMarkInstanceId] as const));

  for (const input of WEEKLY_MARK_SIGNALS_2026_07_06_TO_07_12) {
    const markId = input.blockKey
      ? markByTitleDateBlock.get(`${input.localDate}:${input.title}:${input.blockKey}`)
      : markByTitleDate.get(`${input.localDate}:${input.title}`);
    if (!markId) {
      throw new Error(`Missing Mark "${input.title}" for signal on ${input.localDate} ${input.time}.`);
    }
    signals.push(await ensureSignal(services, userId, SignalTargetType.MarkInstance, markId, input.localDate, input.time, timezone));
  }

  for (const input of WEEKLY_CLOSE_TRAIL_SIGNALS_2026_07_06_TO_07_12) {
    const trailDay = await services.repositories.trailDays.getOrCreateTrailDay(userId, input.localDate);
    signals.push(await ensureSignal(services, userId, SignalTargetType.TrailDay, trailDay.id, input.localDate, input.time, timezone));
  }

  return dedupeById(signals);
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
    expeditionSch: await resolveSeedEntityId(repos, userId, "expedition", "career.sch.expedition.smart-counter-hub-project"),
    expeditionCutTo70: await resolveSeedEntityId(repos, userId, "expedition", "health.cut70.expedition"),
    expeditionWaymark: await resolveSeedEntityId(repos, userId, "expedition", "family.waymark.expedition"),
    expeditionEnglish: await resolveSeedEntityId(repos, userId, "expedition", "family.english.expedition"),
    expeditionFamilyRhythm: await resolveSeedEntityId(repos, userId, "expedition", "family.rhythm.expedition"),
    expeditionDch: structure.expeditions[0].id,
    expeditionTonyGolf: structure.expeditions[1].id,
    milestoneSchAutoQlsd: await resolveSeedEntityId(repos, userId, "milestone", "career.sch.milestone.2026-08.auto-qlsd-form"),
    milestoneSchFinancial: await resolveSeedEntityId(repos, userId, "milestone", "career.sch.milestone.2026-08.credit-card-debt-collection-adjustment"),
    milestoneSchDomesticDebit: await resolveSeedEntityId(repos, userId, "milestone", "career.sch.milestone.2026-10.domestic-debit-card-issuance-cortex"),
    milestoneCutTo70: await resolveSeedEntityId(repos, userId, "milestone", "health.cut70.milestone.76kg"),
    milestoneWaymark: await resolveSeedEntityId(repos, userId, "milestone", "family.waymark.milestone.anniversary-edition"),
    milestoneEnglish: await resolveSeedEntityId(repos, userId, "milestone", "family.english.milestone.grammar-book"),
    milestoneDchSprint0: structure.milestones[0].id,
    milestoneDchSubAccount: structure.milestones[1].id,
    milestoneDchGl: structure.milestones[2].id,
    milestoneTonyGolfQuangNinh: structure.milestones[3].id,
    milestoneTonyGolfEpga: structure.milestones[4].id,
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

function markSignal(localDate: string, time: string, title: string, blockKey?: string): WeeklyMarkSignalInput {
  return { localDate, time, title, blockKey };
}

function trailSignal(localDate: string, time: string) {
  return { localDate, time };
}

function dedupeById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
