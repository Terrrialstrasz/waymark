import type { WaymarkRepositories } from "../domain/waymark";
import { importWeeklyTimetable, type WeeklyTimetableImportSlotInput } from "../lib/waymark";

function slot(
  localDate: string,
  startTime: string,
  endTime: string,
  title: string,
  pathRef: string,
  blockKey: string,
  expeditionRef?: string,
  milestoneRef?: string,
  note?: string,
): WeeklyTimetableImportSlotInput {
  return {
    localDate,
    startTime,
    endTime,
    title,
    pathRef,
    blockKey,
    expeditionRef,
    milestoneRef,
    description: note,
  };
}

const PATH_CAREER = "Career";
const PATH_FAMILY = "Family & Home";
const PATH_HEALTH = "Health & Body";
const PATH_GOLF = "Golf Craft";

const EXPEDITION_SCH = "SCH Smart Counter Hub Project";
const EXPEDITION_WAYMARK = "Building Waymark";
const EXPEDITION_ENGLISH = "Dạy con Tiếng Anh";
const EXPEDITION_CUT_TO_70 = "Cut to 70";
const EXPEDITION_GOLF = "Beginning: From SNAG to 3D Line";

const MILESTONE_SCH_FINANCIAL = "GD tài chính thẻ tín dụng — Thu nợ & điều chỉnh thu nợ";
const MILESTONE_SCH_FUNDING_SOURCE = "Đổi nguồn tiền giao dịch JCB HB & QLSD thay đổi nguồn tiền";
const MILESTONE_SCH_LIMIT = "Điều chỉnh hạn mức giao dịch thẻ theo kỳ sao kê — đợt tháng 8";
const MILESTONE_SCH_CARD_ART = "Card Art — Phát hành lại và gia hạn thẻ";
const MILESTONE_WAYMARK = "Xây dựng Waymark Anniversary edition";
const MILESTONE_ENGLISH = "Đọc xong sách ngữ pháp tiếng Anh cho con";
const MILESTONE_CUT_TO_70 = "Reach 76kg";
const MILESTONE_GOLF = "Home and SNAG practice phase";

export const WEEKLY_TIMETABLE_2026_06_15_TO_06_21: WeeklyTimetableImportSlotInput[] = [
  slot("2026-06-15", "05:30", "07:00", "Workout Day A", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Health Engine owns detail."),
  slot("2026-06-15", "07:00", "08:00", "Thap huong ngay mung 1 am lich", PATH_FAMILY, "morning_family", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Ngoai block; sang sau Workout, truoc Focus."),
  slot("2026-06-15", "08:00", "09:30", "RSD Hoan no the tin dung #1 - scope, use case, UI", PATH_CAREER, "morning_activity", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Chot pham vi, use case, man hinh chinh, dieu kien hien thi."),
  slot("2026-06-15", "09:45", "11:15", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Khong dung cho deep work."),
  slot("2026-06-15", "13:30", "15:00", "RSD Hoan no the tin dung #2 - nguon tien, CorePRF, tien mat", PATH_CAREER, "afternoon_activity", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Mo ta nguon hach toan, tien mat, lam tron, bang ke."),
  slot("2026-06-15", "15:15", "16:45", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Khong dung cho deep work."),
  slot("2026-06-15", "17:00", "18:30", "RSD Hoan no the tin dung #3 - sequence, AC, open issues", PATH_CAREER, "final_focus", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Sequence xu ly, acceptance criteria, diem can confirm."),
  slot("2026-06-15", "20:00", "21:00", "Trong con Toan/Tieng Viet cho Thu 3", PATH_FAMILY, "evening_activity", EXPEDITION_ENGLISH, MILESTONE_ENGLISH, "Theo lich hoc tien tieu hoc Thu 3."),
  slot("2026-06-15", "21:00", "21:30", "Close the day + home_shutdown_check", PATH_FAMILY, "close_the_day", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Chuan bi ngay sau, shutdown nha."),

  slot("2026-06-16", "05:30", "07:00", "Workout Day B", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Health Engine owns detail."),
  slot("2026-06-16", "08:00", "09:30", "RSD Nop tien the Prepaid", PATH_CAREER, "morning_activity", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Hoan thanh section gon trong 1 block: scope, mapping chinh, behavior, open issues."),
  slot("2026-06-16", "09:45", "11:15", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Khong dung cho deep work."),
  slot("2026-06-16", "13:30", "15:00", "RSD Hach toan giao dich the #1 - cau truc 4 nguon CorePRF", PATH_CAREER, "afternoon_activity", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Chuyen khoan, GL, Tien mat, Khong hach toan CorePRF."),
  slot("2026-06-16", "15:15", "16:45", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Khong dung cho deep work."),
  slot("2026-06-16", "17:00", "18:30", "RSD Hach toan giao dich the #2 - tien mat, lam tron, GL 998, bang ke", PATH_CAREER, "final_focus", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Rule lam tron, bang ke thu/chi, GL tien le 998."),
  slot("2026-06-16", "20:00", "21:00", "Hoc tieng Anh / kiem tra bai ngay mai", PATH_FAMILY, "evening_activity", EXPEDITION_ENGLISH, MILESTONE_ENGLISH, "Khong co mon ro ngay hom sau."),
  slot("2026-06-16", "21:00", "21:30", "Close the day + home_shutdown_check", PATH_FAMILY, "close_the_day", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Chuan bi ngay sau, shutdown nha."),

  slot("2026-06-17", "05:30", "07:00", "Workout Walk", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Health Engine owns detail."),
  slot("2026-06-17", "08:00", "09:30", "RSD Hach toan giao dich the #3 - sequence, AC, open issues", PATH_CAREER, "morning_activity", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Sequence BE/ESB/CorePRF/Way4/MakerChecker, AC, loi can xu ly."),
  slot("2026-06-17", "09:45", "11:15", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Khong dung cho deep work."),
  slot("2026-06-17", "13:30", "15:00", "Nut xac nhan giao dich tai chinh the #1 - validate, luu, xac nhan, day duyet", PATH_CAREER, "afternoon_activity", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Hanh vi nut, validate truoc xac nhan, luu GD, day duyet."),
  slot("2026-06-17", "15:15", "16:45", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Khong dung cho deep work."),
  slot("2026-06-17", "17:00", "18:30", "Nut xac nhan giao dich tai chinh the #2 - sequence, trang thai, MakerChecker, loi validate", PATH_CAREER, "final_focus", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Sequence trang thai giao dich, loi validate, popup, MakerChecker."),
  slot("2026-06-17", "20:00", "21:00", "Hoc tieng Anh nhe", PATH_FAMILY, "evening_activity", EXPEDITION_ENGLISH, MILESTONE_ENGLISH, "Giu nhe giua tuan."),
  slot("2026-06-17", "21:00", "21:30", "Close the day + home_shutdown_check", PATH_FAMILY, "close_the_day", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Chuan bi ngay sau, shutdown nha."),

  slot("2026-06-18", "05:30", "07:00", "Workout Day A", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Health Engine owns detail."),
  slot("2026-06-18", "08:00", "09:30", "Nut In va in chung tu #1 - trigger, dieu kien in, du lieu chung tu", PATH_CAREER, "morning_activity", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Dieu kien enable nut In, nguon du lieu in, mau chung tu."),
  slot("2026-06-18", "09:45", "11:15", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Khong dung cho deep work."),
  slot("2026-06-18", "13:30", "15:00", "Nut In va in chung tu #2 - chung tu, email, in lai, loi in", PATH_CAREER, "afternoon_activity", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Gui email chung tu, in lai, loi in, xu ly sau phe duyet."),
  slot("2026-06-18", "15:15", "16:45", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Khong dung cho deep work."),
  slot("2026-06-18", "17:00", "18:30", "Doi nguon thanh toan the Hybrid", PATH_CAREER, "final_focus", EXPEDITION_SCH, MILESTONE_SCH_FUNDING_SOURCE, "Rule, flow, mapping, diem can confirm."),
  slot("2026-06-18", "20:00", "21:00", "Trong con chuan bi Tieng Anh Cambridge cho Thu 6", PATH_FAMILY, "evening_activity", EXPEDITION_ENGLISH, MILESTONE_ENGLISH, "Theo lich hoc Thu 6."),
  slot("2026-06-18", "21:00", "21:30", "Close the day + home_shutdown_check", PATH_FAMILY, "close_the_day", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Chuan bi ngay sau, shutdown nha."),

  slot("2026-06-19", "05:30", "07:00", "Workout Day B", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Health Engine owns detail."),
  slot("2026-06-19", "08:00", "09:30", "Dieu chinh han muc giao dich", PATH_CAREER, "morning_activity", EXPEDITION_SCH, MILESTONE_SCH_LIMIT, "Mapping + rule RSD, cau hoi can confirm."),
  slot("2026-06-19", "09:45", "11:15", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_am", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Khong dung cho deep work."),
  slot("2026-06-19", "13:30", "15:00", "Dang ky Card Art cho the phat hanh lai", PATH_CAREER, "afternoon_activity", EXPEDITION_SCH, MILESTONE_SCH_CARD_ART, "Rule + mapping, dieu kien hien thi, du lieu Card Art."),
  slot("2026-06-19", "15:15", "16:45", "Supervising Block - Check Zalo, mail, Confluence, Jira", PATH_CAREER, "supervising_pm", EXPEDITION_SCH, MILESTONE_SCH_FINANCIAL, "Khong dung cho deep work."),
  slot("2026-06-19", "17:00", "18:30", "Waymark Weekly Coding / Weekly Planning", PATH_FAMILY, "final_focus", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Nhap planned marks, status, anchor, expedition/milestone refs."),
  slot("2026-06-19", "20:00", "21:00", "Chuan bi do First Tee", PATH_FAMILY, "evening_activity", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Quan ao, nuoc, snack, lich trinh, ngu som."),
  slot("2026-06-19", "21:00", "21:30", "Close the day + pack do First Tee lan cuoi", PATH_FAMILY, "close_the_day", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Packcheck First Tee, ngu som."),

  slot("2026-06-20", "05:30", "07:00", "Workout Walk", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Walk nhe vi First Tee ca ngay."),
  slot("2026-06-20", "08:00", "09:30", "First Tee Golf - di chuyen, check-in, khoi dong", PATH_GOLF, "morning_activity", EXPEDITION_GOLF, MILESTONE_GOLF, "Dong hanh con di giai."),
  slot("2026-06-20", "09:45", "11:15", "First Tee - dong hanh con thi dau", PATH_GOLF, "morning_support", EXPEDITION_GOLF, MILESTONE_GOLF, "Support, anh, nuoc, tinh than."),
  slot("2026-06-20", "13:30", "15:00", "First Tee - thi dau / an trua / support", PATH_GOLF, "afternoon_activity", EXPEDITION_GOLF, MILESTONE_GOLF, "Khong dat viec SCH."),
  slot("2026-06-20", "15:15", "16:45", "First Tee - support cuoi ngay / trao giai", PATH_GOLF, "afternoon_support", EXPEDITION_GOLF, MILESTONE_GOLF, "Ket thuc giai, ghi memory."),
  slot("2026-06-20", "17:00", "18:30", "Ve nha, tam, an nhe, recovery", PATH_FAMILY, "family_final", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Recovery sau giai."),
  slot("2026-06-20", "18:30", "19:00", "Cat toc", PATH_HEALTH, "optional_candidate", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Optional/Candidate: chi lam neu tien sau First Tee; khong dat vao main block."),
  slot("2026-06-20", "20:00", "21:00", "Recovery family: ke chuyen giai, khong hoc nang", PATH_FAMILY, "evening_activity", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Tao memory nhe."),
  slot("2026-06-20", "21:00", "21:30", "Close the day rat nhe", PATH_FAMILY, "close_the_day", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Khong review nang sau giai."),

  slot("2026-06-21", "05:30", "07:00", "Workout Walk", PATH_HEALTH, "workout", EXPEDITION_CUT_TO_70, MILESTONE_CUT_TO_70, "Walk phuc hoi sau First Tee."),
  slot("2026-06-21", "08:00", "09:30", "Lop ve cua con / slow family morning", PATH_FAMILY, "morning_family", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Giu lich co dinh Chu nhat."),
  slot("2026-06-21", "09:45", "11:15", "Nha cua nhe / nghi sau First Tee", PATH_FAMILY, "morning_support", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Khong overload."),
  slot("2026-06-21", "13:30", "15:00", "Family recovery: chon anh, ke lai giai, memory note", PATH_FAMILY, "afternoon_family", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Chon anh dep, ghi lai ky niem."),
  slot("2026-06-21", "15:15", "16:45", "Chuan bi tuan moi / mua do thieu", PATH_FAMILY, "afternoon_support", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Nha cua, do hoc, do di lam."),
  slot("2026-06-21", "17:00", "18:30", "Meal prep / family dinner som", PATH_FAMILY, "family_final", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Giam tai Thu 2."),
  slot("2026-06-21", "20:00", "21:00", "Trong con Toan/Tieng Viet cho Thu 2 tuan sau", PATH_FAMILY, "evening_activity", EXPEDITION_ENGLISH, MILESTONE_ENGLISH, "Theo lich hoc tien tieu hoc Thu 2."),
  slot("2026-06-21", "21:00", "21:30", "Weekly close + chuan bi Thu 2", PATH_FAMILY, "close_the_day", EXPEDITION_WAYMARK, MILESTONE_WAYMARK, "Review tuan, set Monday readiness."),
];

export const WEEKLY_TIMETABLE_2026_06_15_TO_06_21_COUNTS: Record<string, number> = {
  "2026-06-15": 9,
  "2026-06-16": 8,
  "2026-06-17": 8,
  "2026-06-18": 8,
  "2026-06-19": 8,
  "2026-06-20": 9,
  "2026-06-21": 8,
};

export async function importWeeklyTimetable20260615To0621(
  repos: WaymarkRepositories,
  userId: string,
) {
  return importWeeklyTimetable(repos, {
    userId,
    weekStartDate: "2026-06-15",
    weekEndDate: "2026-06-21",
    note: "Imported from approved weekly timetable 2026-06-15 to 2026-06-21 using path, expedition, and milestone refs.",
    importBatchId: "weekly_timetable_2026_06_15_2026_06_21_approved_refs",
    allowTitleRefs: true,
    items: WEEKLY_TIMETABLE_2026_06_15_TO_06_21,
  });
}
