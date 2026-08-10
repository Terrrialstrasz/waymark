import type { WaymarkRepositories } from "../domain/waymark";
import { importWeeklyTimetable, type WeeklyTimetableImportSlotInput } from "../lib/waymark";

function slot(
  localDate: string,
  startTime: string,
  endTime: string,
  title: string,
  pathId: string,
  blockKey: string,
  expeditionId?: string,
  milestoneId?: string,
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
    expeditionRef: expeditionId ? expeditionRefFromId(expeditionId) : undefined,
    milestoneId,
    milestoneRef: milestoneId ? milestoneRefFromId(milestoneId) : undefined,
  };
}

const PATH_CAREER = "path_mpuywm3c_2mk36507";
const PATH_FAMILY = "path_mpuywm4a_c5gk1p07";
const PATH_HEALTH = "path_mpuywm4t_l3n1hknd";

const EXPEDITION_SCH = "expedition_mpuywm7g_wi7rpzdr";
const EXPEDITION_ENGLISH = "expedition_mpuywm98_y8p9108x";
const EXPEDITION_WAYMARK = "expedition_mpuywma4_7yrmadyd";
const EXPEDITION_CUT_TO_70 = "expedition_mpuywmbi_sli3qt9g";

const MILESTONE_ENGLISH = "milestone_mpuywpar_5d7zv1dr";
const MILESTONE_WAYMARK = "milestone_mpuywpc7_9b1an21s";
const MILESTONE_CUT_TO_70_FIRST = "milestone_mpuywpcw_gruw2rjv";

function pathRefFromId(pathId: string) {
  switch (pathId) {
    case PATH_CAREER:
      return "Career";
    case PATH_FAMILY:
      return "Family & Home";
    case PATH_HEALTH:
      return "Health & Body";
    default:
      return undefined;
  }
}

function expeditionRefFromId(expeditionId: string) {
  switch (expeditionId) {
    case EXPEDITION_SCH:
      return "SCH Smart Counter Hub Project";
    case EXPEDITION_ENGLISH:
      return "Dạy con Tiếng Anh";
    case EXPEDITION_WAYMARK:
      return "Building Waymark";
    case EXPEDITION_CUT_TO_70:
      return "Cut to 70";
    default:
      return undefined;
  }
}

function milestoneRefFromId(milestoneId: string) {
  switch (milestoneId) {
    case MILESTONE_ENGLISH:
      return "Đọc xong sách ngữ pháp tiếng Anh cho con";
    case MILESTONE_WAYMARK:
      return "Xây dựng Waymark Anniversary edition";
    case MILESTONE_CUT_TO_70_FIRST:
      return "Reach 76kg";
    default:
      return undefined;
  }
}

export const SAMPLE_WEEKLY_TIMETABLE_2026_06_01_TO_06_07: WeeklyTimetableImportSlotInput[] = [
  slot("2026-06-01", "05:30", "07:00", "Workout Day A", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70_FIRST),
  slot("2026-06-01", "08:00", "09:30", "Execute Testcase — PHT GNQT Luồng KHCN thẻ phụ", PATH_CAREER, "morning_activity", EXPEDITION_SCH),
  slot("2026-06-01", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am"),
  slot("2026-06-01", "13:30", "15:00", "Execute Testcase — PHT GNQT Luồng KHCN làm mịn", PATH_CAREER, "afternoon_activity", EXPEDITION_SCH),
  slot("2026-06-01", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm"),
  slot("2026-06-01", "17:00", "18:30", "Cập nhật và Ký duyệt RSD biểu mẫu", PATH_CAREER, "final_focus", EXPEDITION_SCH),
  slot("2026-06-01", "20:00", "21:00", "Trông con làm bài về nhà môn Toán + Tiếng Việt", PATH_FAMILY, "evening_activity"),

  slot("2026-06-02", "05:30", "07:00", "Workout Day B", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70_FIRST),
  slot("2026-06-02", "08:00", "09:30", "Execute Testcase — PHT GNQT Luồng KHTC hiện hữu", PATH_CAREER, "morning_activity", EXPEDITION_SCH),
  slot("2026-06-02", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am"),
  slot("2026-06-02", "13:30", "15:00", "Execute Testcase — PHT GNQT Luồng KHTC mở mới", PATH_CAREER, "afternoon_activity", EXPEDITION_SCH),
  slot("2026-06-02", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm"),
  slot("2026-06-02", "17:00", "18:30", "Viết Testcase — PHT GNQT Luồng KHTC", PATH_CAREER, "final_focus", EXPEDITION_SCH),
  slot("2026-06-02", "20:00", "21:00", "Học tiếng Anh / đọc sách ngữ pháp", PATH_FAMILY, "evening_activity", EXPEDITION_ENGLISH, MILESTONE_ENGLISH),

  slot("2026-06-03", "05:30", "07:00", "Workout Walk", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70_FIRST),
  slot("2026-06-03", "08:00", "09:30", "Waymark Anniversary — Refactor phần Cloud DB", PATH_FAMILY, "morning_activity", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-03", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am"),
  slot("2026-06-03", "13:30", "15:00", "Waymark Anniversary — Luồng vững Cloud Media lên Google Drive", PATH_FAMILY, "afternoon_activity", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-03", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm"),
  slot("2026-06-03", "17:00", "18:30", "Waymark Anniversary — UI Assets Skins cho Anniversary edition", PATH_FAMILY, "final_focus", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-03", "20:00", "21:00", "Học tiếng Anh / đọc sách ngữ pháp", PATH_FAMILY, "evening_activity", EXPEDITION_ENGLISH, MILESTONE_ENGLISH),

  slot("2026-06-04", "05:30", "07:00", "Workout Day A", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70_FIRST),
  slot("2026-06-04", "08:00", "09:30", "Dữ liệu kỷ niệm — Inventory mốc 11 năm", PATH_FAMILY, "morning_activity", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-04", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am"),
  slot("2026-06-04", "13:30", "15:00", "Dữ liệu kỷ niệm — Batch 1: giai đoạn đầu", PATH_FAMILY, "afternoon_activity", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-04", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm"),
  slot("2026-06-04", "17:00", "18:30", "Dữ liệu kỷ niệm — Batch 2: giai đoạn giữa", PATH_FAMILY, "final_focus", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-04", "20:00", "21:00", "Trông con ôn Tiếng Anh Cambridge", PATH_FAMILY, "evening_activity"),

  slot("2026-06-05", "05:30", "07:00", "Workout Day B", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70_FIRST),
  slot("2026-06-05", "08:00", "09:30", "Dữ liệu kỷ niệm — Batch 3: giai đoạn gần đây", PATH_FAMILY, "morning_activity", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-05", "09:45", "11:15", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am"),
  slot("2026-06-05", "13:30", "15:00", "Dữ liệu kỷ niệm — Batch 4: giai đoạn hiện tại", PATH_FAMILY, "afternoon_activity", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-05", "15:15", "16:45", "Supervising Block — Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm"),
  slot("2026-06-05", "17:00", "18:30", "Dữ liệu kỷ niệm — Review & chuẩn hóa metadata", PATH_FAMILY, "final_focus", EXPEDITION_WAYMARK, MILESTONE_WAYMARK),
  slot("2026-06-05", "20:00", "21:00", "Trông con ôn Tiếng Anh Cambridge", PATH_FAMILY, "evening_activity"),

  slot("2026-06-06", "05:30", "07:00", "Workout Walk", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70_FIRST),
  slot("2026-06-06", "08:00", "11:15", "Family Morning — Ở nhà nhẹ / chơi với con / chuẩn bị về cụ ngoại", PATH_FAMILY, "morning_family"),
  slot("2026-06-06", "13:30", "16:45", "Family Afternoon — Về cụ ngoại", PATH_FAMILY, "afternoon_family"),
  slot("2026-06-06", "17:00", "18:30", "Family Final — Nghỉ / ăn tối cùng gia đình", PATH_FAMILY, "family_final"),
  slot("2026-06-06", "20:00", "21:00", "Học tiếng Anh nhẹ / đọc sách", PATH_FAMILY, "evening_activity", EXPEDITION_ENGLISH, MILESTONE_ENGLISH),

  slot("2026-06-07", "05:30", "07:00", "Workout Day A", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70_FIRST),
  slot("2026-06-07", "08:00", "11:15", "Family Morning — Con học vẽ", PATH_FAMILY, "morning_family"),
  slot("2026-06-07", "13:30", "16:45", "Family Afternoon — Chơi nhẹ với con / nghỉ phục hồi / nhà sách gần nhà nếu còn sức", PATH_FAMILY, "afternoon_family"),
  slot("2026-06-07", "17:00", "18:30", "Weekly Reset — chuẩn bị tuần mới", PATH_FAMILY, "family_final"),
  slot("2026-06-07", "20:00", "21:00", "Trông con làm bài về nhà môn Toán + Tiếng Việt", PATH_FAMILY, "evening_activity"),
];

export const SAMPLE_WEEKLY_TIMETABLE_2026_06_01_TO_06_07_COUNTS: Record<string, number> = {
  "2026-06-01": 7,
  "2026-06-02": 7,
  "2026-06-03": 7,
  "2026-06-04": 7,
  "2026-06-05": 7,
  "2026-06-06": 5,
  "2026-06-07": 5,
};

export async function importSampleWeeklyTimetable20260601To0607(
  repos: WaymarkRepositories,
  userId: string,
) {
  return importWeeklyTimetable(repos, {
    userId,
    weekStartDate: "2026-06-01",
    weekEndDate: "2026-06-07",
    note: "Imported from cleaned final timetable 2026-06-01 to 2026-06-07.",
    importBatchId: "weekly_timetable_2026_06_01_2026_06_07_clean",
    allowTitleRefs: true,
    items: SAMPLE_WEEKLY_TIMETABLE_2026_06_01_TO_06_07,
  });
}
