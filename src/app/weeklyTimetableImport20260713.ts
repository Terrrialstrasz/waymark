import type { Expedition, MarkInstance, Milestone, PackCheckInstance, Signal, WaymarkRepositories } from "../domain/waymark";
import { ExpeditionStatus, MarkInstanceOrigin, MarkInstanceStatus, MilestoneStatus, PackCheckInstanceStatus, SignalStatus, SignalTargetType } from "../domain/waymark/enums";
import type { SignalEngine } from "../domain/waymark/services";
import { bootstrapWaymarkMap, importWeeklyTimetable, type WeeklyTimetableImportReport, type WeeklyTimetableImportSlotInput } from "../lib/waymark";
import { recomputeTrailDayCountersForDate } from "../lib/waymark/plannedMarkSourceOfTruth";
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
  pathGolf: string;
  expeditionSch: string;
  expeditionCutTo70: string;
  expeditionGolf: string;
  expeditionWaymark: string;
  expeditionDch: string;
  expeditionTonyGolf: string;
  expeditionBidvDailyOps: string;
  expeditionBidvInnovation: string;
  expeditionChildStudy: string;
  expeditionHomeRitual: string;
  expeditionFamily: string;
  expeditionWeekendHanoi: string;
  expeditionFamilyRecovery: string;
  expeditionPersonalCare: string;
  milestoneSchAutoQlsd: string;
  milestoneSchFinancial: string;
  milestoneSchDomesticDebit: string;
  milestoneCutTo70: string;
  milestoneGolf: string;
  milestoneWaymark: string;
  milestoneDchSprint72: string;
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

type WeeklySignalPackInput = {
  localDate: string;
  time: string;
  sourceSeedId: string;
};

export type WeeklyTimetable20260713ImportReport = WeeklyTimetableImportReport & WeeklyStructureReport & {
  packChecks: PackCheckInstance[];
  signals: Signal[];
};

export type WeeklyBreakfastMarks20260713ImportReport = {
  totalRequested: number;
  created: MarkInstance[];
  skippedExisting: MarkInstance[];
};

const BREAKFAST_WEEK_DATES_2026_07_13_TO_07_19 = [
  "2026-07-13",
  "2026-07-14",
  "2026-07-15",
  "2026-07-16",
  "2026-07-17",
  "2026-07-18",
  "2026-07-19",
] as const;
const BREAKFAST_TITLE = "Chuẩn bị bữa sáng cho cả nhà";
const BREAKFAST_DETAIL = "Luộc 6 quả trứng: 2 bố con lòng đào 6 phút, mẹ chín kỹ. Pha sữa Hikid cho con và pha Glucerna cho mẹ.";

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

export function buildWeeklyTimetable20260713To0719(catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
  const C = catalog.pathCareer;
  const F = catalog.pathFamily;
  const H = catalog.pathHealth;
  const G = catalog.pathGolf;

  return [
    slot("2026-07-13", "05:30", "07:00", "Workout Day A", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, thực hiện đúng session Day A và cooldown. Kết thúc khi log đủ bài, mức nặng và cảm nhận sau buổi tập."),
    breakfastSlot("2026-07-13", F, catalog.expeditionFamily),
    slot("2026-07-13", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "Ăn 1-2 trứng và uống 1 cốc trà xanh sau buổi sáng. Kiểm tra đã chuẩn bị tỏi cho bữa trưa hoặc tối; bỏ qua ginkgo."),
    slot("2026-07-13", "08:00", "09:30", "Planning SCH và chốt việc tuần", C, "morning_activity", catalog.expeditionSch, undefined, "Nhập Chuyển tiền nội bộ và Thu chi GL vào Sprint 7.2 SCH, gắn link RSD tương ứng. Kết thúc khi sprint có đủ đầu việc và link RSD."),
    slot("2026-07-13", "09:45", "11:15", "Supervising BIDV buổi sáng", C, "supervising_am", catalog.expeditionBidvDailyOps, undefined, "Kiểm tra Zalo, mail, Confluence và Jira theo thứ tự; xử lý việc dưới 5 phút. Kết thúc khi ghi lại việc cần Focus Block."),
    slot("2026-07-13", "12:00", "12:30", "SNAG Roller Stroke 7h-5h", G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, puttingStrokeNote("12:00-12:30", "Cầm Roller theo cue trái vàng-phải đỏ, setup bóng ở 6h, stroke 7h-5h về mục tiêu.")),
    slot("2026-07-13", "13:30", "15:00", "Xử lý TGYK RSD GDTC Thẻ", C, "afternoon_activity", catalog.expeditionSch, catalog.milestoneSchFinancial, "Mở RSD GDTC Thẻ hiện tại, xử lý từng comment theo từng trang. Kết thúc khi có bản RSD cập nhật và điểm cần hỏi lại."),
    slot("2026-07-13", "15:15", "16:45", "Supervising BIDV buổi chiều", C, "supervising_pm", catalog.expeditionBidvDailyOps, undefined, "Kiểm tra Zalo, mail, Confluence và Jira theo thứ tự; xử lý việc dưới 5 phút. Kết thúc khi ghi lại việc cần Focus Block."),
    slot("2026-07-13", "17:00", "18:30", "Viết RSD Thu chi GL SCH", C, "final_focus", catalog.expeditionDch, catalog.milestoneDchSprint72, "Mở RSD Thu chi GL, link tới RSD Chuyển tiền nội bộ phần tìm kiếm tài khoản và update mô tả hạch toán. Kết thúc khi có draft v0."),
    slot("2026-07-13", "18:30", "19:00", "Putting Ladder Mon 60-180 cm", G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttNote()),
    slot("2026-07-13", "20:00", "21:00", "Trông con học Toán tiếng Việt", F, "evening_activity", catalog.expeditionChildStudy, undefined, "Mở BTVN của con, trông con làm hết bài Toán và tiếng Việt. Kết thúc khi bài xong và sách vở ngày mai đã soạn."),
    slot("2026-07-13", "20:00", "21:00", "Chuẩn bị lễ mùng 1 âm lịch", F, "home_ritual", catalog.expeditionHomeRitual, undefined, "Kiểm tra đồ lễ, hương và lịch thắp hương ngày mai. Kết thúc khi đồ cần dùng đã sẵn sàng và không chen vào Focus Block.", true),

    slot("2026-07-14", "05:30", "07:00", "Workout Day B", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, thực hiện đúng session Day B và cooldown. Kết thúc khi log đủ bài, mức nặng và điểm cần chỉnh."),
    slot("2026-07-14", "06:45", "07:00", "Thắp hương mùng 1 âm lịch", F, "home_ritual", catalog.expeditionHomeRitual, undefined, "Chuẩn bị bàn thờ gọn gàng, thắp hương mùng 1 và giữ phiên thật nhẹ. Kết thúc khi hoàn tất lễ và dọn lại đồ dùng.", true),
    breakfastSlot("2026-07-14", F, catalog.expeditionFamily),
    slot("2026-07-14", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "Ăn 1-2 trứng và uống 1 cốc trà xanh sau buổi sáng. Kiểm tra đã chuẩn bị tỏi cho bữa trưa hoặc tối; bỏ qua ginkgo.", true),
    slot("2026-07-14", "08:00", "09:30", "Viết RSD nguồn tiền mặt", C, "morning_activity", catalog.expeditionDch, catalog.milestoneDchSprint72, "Vẽ kỹ luồng dữ liệu gọi vào XES theo khảo sát SCH, sau đó lấy log chi tiết. Kết thúc khi hẹn được họp transfer với team DCH."),
    slot("2026-07-14", "09:45", "11:15", "Supervising BIDV buổi sáng", C, "supervising_am", catalog.expeditionBidvDailyOps, undefined, "Kiểm tra Zalo, mail, Confluence và Jira theo thứ tự; xử lý việc dưới 5 phút. Kết thúc khi ghi lại việc cần Focus Block."),
    slot("2026-07-14", "12:00", "12:30", "SNAG Launcher Chip 8h-4h", G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("12:00-12:30", "Cầm Launcher trái vàng-phải đỏ, đặt bóng trên Launch Pad, chip biên độ 8h-4h về Flagsticky.")),
    slot("2026-07-14", "13:30", "15:00", "Transfer RSD nguồn tiền mặt", C, "afternoon_activity", catalog.expeditionDch, catalog.milestoneDchSprint72, "Dùng draft tiền mặt làm agenda transfer, chốt issue với team liên quan. Kết thúc khi có meeting note, owner và câu hỏi cần confirm."),
    slot("2026-07-14", "15:15", "16:45", "Supervising BIDV buổi chiều", C, "supervising_pm", catalog.expeditionBidvDailyOps, undefined, "Kiểm tra Zalo, mail, Confluence và Jira theo thứ tự; xử lý việc dưới 5 phút. Kết thúc khi ghi lại việc cần Focus Block."),
    slot("2026-07-14", "17:00", "18:30", "Chốt quy trình Scrum DCH", C, "final_focus", catalog.expeditionDch, catalog.milestoneDchSprint72, "Mở draft quy trình Scrum DCH, chốt agenda, output và vai trò trong Planning. Kết thúc khi có kịch bản Planning dùng được."),
    slot("2026-07-14", "18:30", "19:00", "Putting Ladder Tue 60-180 cm", G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttNote()),
    slot("2026-07-14", "20:00", "21:00", "Chuẩn bị bài Cambridge cùng con", F, "evening_activity", catalog.expeditionChildStudy, undefined, "Mở bài Cambridge ngày mai, cùng con đọc yêu cầu và hoàn thành phần cần chuẩn bị. Kết thúc khi cặp và tài liệu đã sẵn sàng."),

    slot("2026-07-15", "05:30", "07:00", "Workout Walk", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, đi bộ theo phiên Walk hiện tại và giữ nhịp nhẹ. Kết thúc khi hoàn thành thời lượng và ghi cảm nhận cơ thể."),
    breakfastSlot("2026-07-15", F, catalog.expeditionFamily),
    slot("2026-07-15", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "Ăn 1-2 trứng và uống 1 cốc trà xanh sau buổi sáng. Kiểm tra đã chuẩn bị tỏi cho bữa trưa hoặc tối; bỏ qua ginkgo."),
    slot("2026-07-15", "08:00", "09:30", "Hoàn thiện RSD nguồn tiền mặt", C, "morning_activity", catalog.expeditionDch, catalog.milestoneDchSprint72, "Mở meeting note transfer, cập nhật lại RSD tiền mặt theo ý kiến đã chốt. Kết thúc khi có bản gửi review và open questions cuối."),
    slot("2026-07-15", "09:45", "11:15", "Supervising BIDV buổi sáng", C, "supervising_am", catalog.expeditionBidvDailyOps, undefined, "Kiểm tra Zalo, mail, Confluence và Jira theo thứ tự; xử lý việc dưới 5 phút. Kết thúc khi ghi lại việc cần Focus Block."),
    slot("2026-07-15", "12:00", "12:30", "SNAG Launcher Chip Reinforcement", G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("12:00-12:30", "Cầm Launcher trái vàng-phải đỏ, đặt bóng trên Launch Pad, chip biên độ 8h-4h về Flagsticky.")),
    slot("2026-07-15", "13:30", "15:00", "Viết RSD QLSD GNNĐ", C, "afternoon_activity", catalog.expeditionSch, catalog.milestoneSchAutoQlsd, "Mở tài liệu QLSD GNNĐ, viết flow, UI rule và mapping dữ liệu chính. Kết thúc khi có draft v0 đủ để review nhanh."),
    slot("2026-07-15", "15:15", "16:45", "Supervising BIDV buổi chiều", C, "supervising_pm", catalog.expeditionBidvDailyOps, undefined, "Kiểm tra Zalo, mail, Confluence và Jira theo thứ tự; xử lý việc dưới 5 phút. Kết thúc khi ghi lại việc cần Focus Block."),
    slot("2026-07-15", "17:00", "18:30", "Gửi review RSD tiền mặt", C, "final_focus", catalog.expeditionDch, catalog.milestoneDchSprint72, "Mở bản RSD tiền mặt đã hoàn thiện, rà lỗi nhanh và gửi review cho người liên quan. Kết thúc khi có bản gửi và note follow-up."),
    slot("2026-07-15", "18:30", "19:00", "Putting Ladder Wed 60-180 cm", G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttNote()),
    slot("2026-07-15", "20:00", "21:00", "Học tiếng Anh nhẹ cùng con", F, "evening_activity", catalog.expeditionChildStudy, undefined, "Mở BTVN Oxford Phonics World, trông con làm phần được giao. Kết thúc khi bài hoàn thành và tài liệu ngày mai sẵn sàng."),

    slot("2026-07-16", "05:30", "07:00", "Workout Day A", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, thực hiện đúng session Day A và cooldown. Kết thúc khi log đủ bài, mức nặng và cảm nhận sau buổi tập."),
    breakfastSlot("2026-07-16", F, catalog.expeditionFamily),
    slot("2026-07-16", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "Ăn 1-2 trứng và uống 1 cốc trà xanh sau buổi sáng. Kiểm tra đã chuẩn bị tỏi cho bữa trưa hoặc tối; bỏ qua ginkgo."),
    slot("2026-07-16", "08:00", "09:30", "Viết RSD phát hành GNNĐ", C, "morning_activity", catalog.expeditionSch, catalog.milestoneSchDomesticDebit, "Mở note phát hành thẻ GNNĐ, viết scope, rule và acceptance criteria chính. Kết thúc khi có draft section sẵn sàng review."),
    slot("2026-07-16", "09:45", "11:15", "Supervising BIDV buổi sáng", C, "supervising_am", catalog.expeditionBidvDailyOps, undefined, "Kiểm tra Zalo, mail, Confluence và Jira theo thứ tự; xử lý việc dưới 5 phút. Kết thúc khi ghi lại việc cần Focus Block."),
    slot("2026-07-16", "12:00", "12:30", "SNAG Launcher Pitch 9h-3h", G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, pitchingNote("12:00-12:30", "Cầm Launcher trái vàng-phải đỏ, đặt bóng trên Launch Pad, pitch biên độ 9h-3h về mục tiêu.")),
    slot("2026-07-16", "13:30", "15:00", "Nghiên cứu yêu cầu đổi mới", C, "afternoon_activity", catalog.expeditionBidvInnovation, undefined, "Mở đề bài đổi mới, phân loại 2 hướng: hệ thống đào tạo nội bộ và bộ đề chuyên môn. Kết thúc khi có problem statement phase 1."),
    slot("2026-07-16", "15:15", "16:45", "Supervising BIDV buổi chiều", C, "supervising_pm", catalog.expeditionBidvDailyOps, undefined, "Kiểm tra Zalo, mail, Confluence và Jira theo thứ tự; xử lý việc dưới 5 phút. Kết thúc khi ghi lại việc cần Focus Block."),
    slot("2026-07-16", "17:00", "18:30", "Thiết kế đề tài đào tạo nội bộ", C, "final_focus", catalog.expeditionBidvInnovation, undefined, "Phác thảo mô hình KB+VOD trên app: học, thi, ghi nhận kết quả, khen thưởng. Kết thúc khi có outline phase 1 trong tháng 8."),
    slot("2026-07-16", "18:30", "19:00", "Putting Ladder Thu 60-180 cm", G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttNote()),
    slot("2026-07-16", "20:00", "21:00", "Chuẩn bị bài Cambridge cùng con", F, "evening_activity", catalog.expeditionChildStudy, undefined, "Mở bài Cambridge ngày mai, cùng con đọc yêu cầu và hoàn thành phần cần chuẩn bị. Kết thúc khi cặp và tài liệu đã sẵn sàng."),

    slot("2026-07-17", "05:30", "07:00", "Workout Day B", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, thực hiện đúng session Day B và cooldown. Kết thúc khi log đủ bài, mức nặng và điểm cần chỉnh."),
    breakfastSlot("2026-07-17", F, catalog.expeditionFamily),
    slot("2026-07-17", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "Ăn 1-2 trứng và uống 1 cốc trà xanh sau buổi sáng. Kiểm tra đã chuẩn bị tỏi cho bữa trưa hoặc tối; bỏ qua ginkgo."),
    slot("2026-07-17", "08:00", "09:30", "Planning DCH Sprint 7.2", C, "morning_activity", catalog.expeditionDch, catalog.milestoneDchSprint72, "Mở backlog DCH, rà mục tiêu Sprint 7.2, story ưu tiên và owner từng việc. Kết thúc khi có danh sách Sprint sẵn sàng trao đổi."),
    slot("2026-07-17", "09:45", "11:15", "Supervising BIDV buổi sáng", C, "supervising_am", catalog.expeditionBidvDailyOps, undefined, "Kiểm tra Zalo, mail, Confluence và Jira theo thứ tự; xử lý việc dưới 5 phút. Kết thúc khi ghi lại việc cần Focus Block."),
    slot("2026-07-17", "12:00", "12:30", "SNAG Launcher Pitch Reinforcement", G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, pitchingNote("12:00-12:30", "Cầm Launcher trái vàng-phải đỏ, đặt bóng trên Launch Pad, pitch biên độ 9h-3h về mục tiêu.")),
    slot("2026-07-17", "13:30", "15:00", "Buffer SCH/DCH cuối tuần", C, "afternoon_activity", catalog.expeditionDch, catalog.milestoneDchSprint72, "Rà việc phát sinh sau Planning DCH và các output SCH/DCH trong tuần. Kết thúc khi có danh sách carryover rõ cho tuần sau."),
    slot("2026-07-17", "15:15", "16:45", "Supervising BIDV buổi chiều", C, "supervising_pm", catalog.expeditionBidvDailyOps, undefined, "Kiểm tra Zalo, mail, Confluence và Jira theo thứ tự; xử lý việc dưới 5 phút. Kết thúc khi ghi lại việc cần Focus Block."),
    slot("2026-07-17", "17:00", "18:30", "Planning Waymark tuần sau", F, "final_focus", catalog.expeditionWaymark, catalog.milestoneWaymark, "Mở kế hoạch tuần hiện tại, gom việc done, carryover và constraint tuần sau. Kết thúc khi có draft timetable tuần kế tiếp."),
    slot("2026-07-17", "18:30", "19:00", "Putting Ladder Fri 60-180 cm", G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttNote()),
    slot("2026-07-17", "20:00", "21:00", "Chuẩn bị lễ giỗ cụ nội", F, "evening_activity", catalog.expeditionFamily, undefined, "Kiểm tra đồ lễ, quần áo và lịch di chuyển cho giỗ cụ nội ngày mai. Kết thúc khi đồ cần mang đã gom xong và cả nhà biết giờ đi."),

    slot("2026-07-18", "05:30", "06:00", "SNAG Launcher Full Swing 10h-2h", G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, fullSwingNote("05:30-06:00", "Cầm SNAG Launcher trái vàng-phải đỏ, bóng trên Launch Pad, full swing 10h-2h.")),
    slot("2026-07-18", "06:00", "06:30", "Putting Ladder Sat 60-180 cm", G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttNote()),
    breakfastSlot("2026-07-18", F, catalog.expeditionFamily),
    slot("2026-07-18", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "Ăn 1-2 trứng và uống 1 cốc trà xanh sau buổi sáng. Kiểm tra đã chuẩn bị tỏi cho bữa trưa hoặc tối; bỏ qua ginkgo."),
    slot("2026-07-18", "08:00", "09:30", "Chuẩn bị và về dự giỗ cụ nội", F, "morning_activity", catalog.expeditionFamily, undefined, "Chuẩn bị quần áo, đồ lễ và lịch di chuyển cho cả nhà; xuất phát đúng giờ. Kết thúc khi dự giỗ xong và gia đình về an toàn."),
    slot("2026-07-18", "09:45", "11:15", "Hỗ trợ gia đình buổi giỗ", F, "morning_support", catalog.expeditionFamily, undefined, "Theo sát việc gia đình trong buổi giỗ, ưu tiên hỗ trợ con và giữ nhịp nhẹ. Kết thúc khi các việc chính đã ổn định."),
    slot("2026-07-18", "13:30", "15:00", "Xem quy hoạch Hà Nội 100 năm", F, "afternoon_activity", catalog.expeditionWeekendHanoi, undefined, "Đi xem triển lãm quy hoạch Thủ đô tầm nhìn 100 năm sau lịch giỗ. Kết thúc khi có ảnh hoặc note làm Waymark Memory."),
    slot("2026-07-18", "15:15", "16:45", "Nghỉ sau triển lãm Hà Nội", F, "afternoon_support", catalog.expeditionFamilyRecovery, undefined, "Rời triển lãm sớm, tránh kéo dài sau ngày giỗ và đưa cả nhà về nghỉ. Kết thúc khi lịch tối không còn việc gấp."),
    slot("2026-07-18", "17:00", "18:30", "Ăn tối và phục hồi gia đình", F, "family_final", catalog.expeditionFamilyRecovery, undefined, "Chuẩn bị bữa tối đơn giản, giữ nhịp gia đình nhẹ sau ngày đi giỗ. Kết thúc khi ăn tối xong và đồ EPGA được nhắc lại."),
    slot("2026-07-18", "20:00", "21:00", "Chuẩn bị đồ golf EPGA", F, "evening_activity", catalog.expeditionTonyGolf, undefined, "Chuẩn bị gậy, găng, mũ, nước và đồ học golf cho con. Kết thúc khi túi golf và lịch đi EPGA ngày mai đã sẵn sàng."),

    slot("2026-07-19", "05:30", "06:00", "SNAG Snapper POP Full Swing", G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, fullSwingNote("05:30-06:00", "Cầm Snapper trái vàng-phải đỏ, tập full swing tạo tiếng POP, cảm nhận vòng swing và chuyển trọng tâm.")),
    slot("2026-07-19", "06:00", "06:30", "Putting Ladder Sun 60-180 cm", G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttNote()),
    breakfastSlot("2026-07-19", F, catalog.expeditionFamily),
    slot("2026-07-19", "07:00", "07:10", "Morning Food Intake — Brainfood baseline", H, "morning_food", catalog.expeditionCutTo70, undefined, "Ăn 1-2 trứng và uống 1 cốc trà xanh sau buổi sáng. Kiểm tra đã chuẩn bị tỏi cho bữa trưa hoặc tối; bỏ qua ginkgo."),
    slot("2026-07-19", "08:00", "09:30", "Đưa con học EPGA buổi sáng", F, "morning_activity", catalog.expeditionTonyGolf, undefined, "Chuẩn bị đồ golf, đưa con tới EPGA và quan sát buổi học sáng. Kết thúc khi ghi lại điểm con cần luyện thêm."),
    slot("2026-07-19", "09:45", "11:15", "Hỗ trợ con học EPGA sáng", F, "morning_support", catalog.expeditionTonyGolf, undefined, "Quan sát con trong buổi EPGA sáng, ưu tiên nước, nghỉ và tinh thần ổn định. Kết thúc khi có một note kỹ thuật hoặc thái độ."),
    slot("2026-07-19", "13:30", "15:00", "Đưa con học EPGA buổi chiều", F, "afternoon_activity", catalog.expeditionTonyGolf, undefined, "Tiếp tục hỗ trợ con ở buổi EPGA chiều, ưu tiên nước, nghỉ và quan sát kỹ thuật. Kết thúc khi về nhà và ghi note ngắn."),
    slot("2026-07-19", "15:15", "16:45", "Hỗ trợ con học EPGA chiều", F, "afternoon_support", catalog.expeditionTonyGolf, undefined, "Theo sát phần học chiều, không thêm outing khác sau EPGA. Kết thúc khi con về nhà an toàn và có thời gian phục hồi."),
    slot("2026-07-19", "17:00", "18:30", "Cắt tóc sau lịch EPGA", H, "personal_care", catalog.expeditionPersonalCare, undefined, "Đi cắt tóc sau khi kết thúc EPGA và ổn định đồ của con. Kết thúc khi cắt tóc xong và chuẩn bị lại cho tuần mới."),
    slot("2026-07-19", "20:00", "21:00", "Chuẩn bị bài Toán tiếng Việt", F, "evening_activity", catalog.expeditionChildStudy, undefined, "Mở lịch Thứ 2 của con, chuẩn bị Toán và tiếng Việt cho ngày mai. Kết thúc khi bài, cặp và đồ học đã sẵn sàng."),
  ];
}

const WEEKLY_BODY_START_DATES = ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19"] as const;

const WEEKLY_MARK_SIGNALS_2026_07_13_TO_07_19: WeeklyMarkSignalInput[] = [
  markSignal("2026-07-13", "05:30", "Workout Day A", "workout"),
  markSignal("2026-07-14", "05:30", "Workout Day B", "workout"),
  markSignal("2026-07-15", "05:30", "Workout Walk", "workout"),
  markSignal("2026-07-16", "05:30", "Workout Day A", "workout"),
  markSignal("2026-07-17", "05:30", "Workout Day B", "workout"),
  markSignal("2026-07-18", "05:30", "SNAG Launcher Full Swing 10h-2h", "golf_swing"),
  markSignal("2026-07-19", "05:30", "SNAG Snapper POP Full Swing", "golf_swing"),

  markSignal("2026-07-13", "11:30", "SNAG Roller Stroke 7h-5h", "golf_swing"),
  markSignal("2026-07-13", "18:00", "Putting Ladder Mon 60-180 cm", "golf_putt"),
  markSignal("2026-07-14", "11:30", "SNAG Launcher Chip 8h-4h", "golf_swing"),
  markSignal("2026-07-14", "18:00", "Putting Ladder Tue 60-180 cm", "golf_putt"),
  markSignal("2026-07-15", "11:30", "SNAG Launcher Chip Reinforcement", "golf_swing"),
  markSignal("2026-07-15", "18:00", "Putting Ladder Wed 60-180 cm", "golf_putt"),
  markSignal("2026-07-16", "11:30", "SNAG Launcher Pitch 9h-3h", "golf_swing"),
  markSignal("2026-07-16", "18:00", "Putting Ladder Thu 60-180 cm", "golf_putt"),
  markSignal("2026-07-17", "11:30", "SNAG Launcher Pitch Reinforcement", "golf_swing"),
  markSignal("2026-07-17", "18:00", "Putting Ladder Fri 60-180 cm", "golf_putt"),
  markSignal("2026-07-18", "05:30", "SNAG Launcher Full Swing 10h-2h", "golf_swing"),
  markSignal("2026-07-18", "06:00", "Putting Ladder Sat 60-180 cm", "golf_putt"),
  markSignal("2026-07-19", "05:30", "SNAG Snapper POP Full Swing", "golf_swing"),
  markSignal("2026-07-19", "06:00", "Putting Ladder Sun 60-180 cm", "golf_putt"),

  markSignal("2026-07-14", "06:45", "Thắp hương mùng 1 âm lịch", "home_ritual"),
  markSignal("2026-07-17", "19:45", "Chuẩn bị lễ giỗ cụ nội", "evening_activity"),
  markSignal("2026-07-18", "12:45", "Xem quy hoạch Hà Nội 100 năm", "afternoon_activity"),
  markSignal("2026-07-19", "16:45", "Cắt tóc sau lịch EPGA", "personal_care"),
];

const WEEKLY_SIGNAL_PACK_2026_07_13_TO_07_19: WeeklySignalPackInput[] = [
  ...WEEKLY_BODY_START_DATES.map((localDate) => signalPack(localDate, "07:10", "style.daily-grooming-presence-check")),
  ...["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17"].map((localDate) => signalPack(localDate, "07:30", "family.before-leaving-home-check")),
  signalPack("2026-07-18", "07:30", "character.pilgrimage-readiness-check"),
  signalPack("2026-07-19", "07:30", "golf.golf-outing-readiness-check"),
  ...WEEKLY_BODY_START_DATES.map((localDate) => signalPack(localDate, "21:30", "family.home-shutdown-check")),
  signalPack("2026-07-13", "21:45", "character.pilgrimage-readiness-check"),
  signalPack("2026-07-14", "21:45", "family.home-shutdown-check"),
  signalPack("2026-07-15", "21:45", "family.home-shutdown-check"),
  signalPack("2026-07-16", "21:45", "family.home-shutdown-check"),
  signalPack("2026-07-17", "21:45", "family.weekend-around-hanoi-readiness-check"),
  signalPack("2026-07-18", "21:45", "golf.golf-outing-readiness-check"),
  signalPack("2026-07-19", "21:45", "family.home-shutdown-check"),
];

export async function importWeeklyTimetable20260713To0719(
  services: ImportServices,
  userId: string,
  timezone: string,
): Promise<WeeklyTimetable20260713ImportReport> {
  const repos = services.repositories;
  await bootstrapWaymarkMap({ repositories: repos, userId }, WAYMARK_MAP_CONFIG);
  const structure = await ensureWeeklyStructure(repos, userId);
  const catalog = await resolveWeeklyCatalogIds(repos, userId, structure);

  const report = await importWeeklyTimetable(repos, {
    userId,
    weekStartDate: "2026-07-13",
    weekEndDate: "2026-07-19",
    note: "Imported from approved Mark + Signal plan 2026-07-13 to 2026-07-19. Weekday golf uses 12:00/18:30, weekend golf uses 05:30/06:00, and golf signals open Planned Marks directly without Golf Practice Pack Checks.",
    importBatchId: "weekly_timetable_2026_07_13_2026_07_19_mark_signal_v3",
    allowTitleRefs: true,
    items: buildWeeklyTimetable20260713To0719(catalog),
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

export async function importBreakfastMarks20260713To0719(
  repos: WaymarkRepositories,
  userId: string,
): Promise<WeeklyBreakfastMarks20260713ImportReport> {
  await bootstrapWaymarkMap({ repositories: repos, userId }, WAYMARK_MAP_CONFIG);
  const pathFamily = await resolveSeedEntityId(repos, userId, "path", "family");
  const expeditionFamily = await ensureExpedition(repos, userId, pathFamily, "Family", "Family duties and shared events.", "2026-12-31", 35);
  const created: MarkInstance[] = [];
  const skippedExisting: MarkInstance[] = [];

  for (const localDate of BREAKFAST_WEEK_DATES_2026_07_13_TO_07_19) {
    const generationKey = buildBreakfastGenerationKey(localDate);
    const existing =
      (await repos.marks.findMarkInstanceByGenerationKey(userId, generationKey)) ??
      (await findExistingBreakfastMarkByDate(repos, userId, localDate));
    if (existing) {
      skippedExisting.push(existing);
      continue;
    }

    const trailDay = await repos.trailDays.getOrCreateTrailDay(userId, localDate);
    const mark = await repos.marks.createMarkInstance({
      userId,
      pathId: pathFamily,
      trailDayId: trailDay.id,
      expeditionId: expeditionFamily.id,
      title: BREAKFAST_TITLE,
      description: BREAKFAST_DETAIL,
      origin: MarkInstanceOrigin.WeeklyPlanned,
      status: MarkInstanceStatus.Planned,
      scheduledStartAt: `${localDate}T07:00:00.000`,
      scheduledEndAt: `${localDate}T07:20:00.000`,
      dueAt: null,
      generationKey,
      proofMediaAssetIds: [],
    });
    created.push(mark);
    await recomputeTrailDayCountersForDate(repos, userId, localDate);
  }

  return {
    totalRequested: BREAKFAST_WEEK_DATES_2026_07_13_TO_07_19.length,
    created,
    skippedExisting,
  };
}

async function ensureWeeklyStructure(repos: WaymarkRepositories, userId: string): Promise<WeeklyStructureReport> {
  const pathCareer = await resolveSeedEntityId(repos, userId, "path", "career");
  const pathFamily = await resolveSeedEntityId(repos, userId, "path", "family");
  const pathHealth = await resolveSeedEntityId(repos, userId, "path", "health");

  const dch = await ensureExpedition(repos, userId, pathCareer, "DCH Deposit Core Hub", "DCH weekly structure import.", "2026-12-30", 20);
  const tonyGolf = await ensureExpedition(repos, userId, pathFamily, "Tony Golf", "Family golf logistics and learning.", "2026-12-31", 30);
  const bidvDailyOps = await ensureExpedition(repos, userId, pathCareer, "BIDV Daily Ops", "Daily Zalo, mail, Confluence, and Jira supervising rhythm.", "2026-12-31", 31);
  const bidvInnovation = await ensureExpedition(repos, userId, pathCareer, "BIDV Innovation", "Innovation proposal and internal training idea work.", "2026-08-31", 32);
  const childStudy = await ensureExpedition(repos, userId, pathFamily, "Child Study", "Child study preparation and evening support.", "2026-12-31", 33);
  const homeRitual = await ensureExpedition(repos, userId, pathFamily, "Home Ritual", "Light home ritual preparation and completion.", "2026-12-31", 34);
  const family = await ensureExpedition(repos, userId, pathFamily, "Family", "Family duties and shared events.", "2026-12-31", 35);
  const weekendHanoi = await ensureExpedition(repos, userId, pathFamily, "Weekend Hanoi", "Weekend Hanoi outing and memory capture.", "2026-12-31", 36);
  const familyRecovery = await ensureExpedition(repos, userId, pathFamily, "Family Recovery", "Recovery and low-friction family rhythm.", "2026-12-31", 37);
  const personalCare = await ensureExpedition(repos, userId, pathHealth, "Personal Care", "Basic grooming and personal care upkeep.", "2026-12-31", 38);

  const dchSprint72 = await ensureMilestone(repos, userId, dch.id, "DCH Sprint 7.2", "Sprint 7.2 planning, SCH/DCH carryover, and RSD outputs.", "2026-07-19", 3);

  return {
    expeditions: [dch, tonyGolf, bidvDailyOps, bidvInnovation, childStudy, homeRitual, family, weekendHanoi, familyRecovery, personalCare],
    milestones: [dchSprint72],
  };
}

async function ensureWeeklySignals(
  services: ImportServices,
  userId: string,
  timezone: string,
  report: WeeklyTimetableImportReport,
) {
  const packChecks: PackCheckInstance[] = [];
  const signals: Signal[] = [];
  const markByTitleDateBlock = new Map(
    report.items.map((item) => [`${item.localDate}:${item.title}:${item.blockKey}`, item.createdMarkInstanceId] as const),
  );

  for (const input of WEEKLY_MARK_SIGNALS_2026_07_13_TO_07_19) {
    const markId = markByTitleDateBlock.get(`${input.localDate}:${input.title}:${input.blockKey}`);
    if (!markId) {
      throw new Error(`Missing Mark "${input.title}" for signal on ${input.localDate} ${input.time}.`);
    }
    signals.push(await ensureSignal(services, userId, SignalTargetType.MarkInstance, markId, input.localDate, input.time, timezone));
  }

  for (const input of WEEKLY_SIGNAL_PACK_2026_07_13_TO_07_19) {
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

  const generationKey = `weekly_signal_pack:2026-07-13:${template.id}:${input.localDate}:${input.time}`;
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
    if (
      existing.status === SignalStatus.Resolved ||
      existing.status === SignalStatus.Dismissed ||
      existing.status === SignalStatus.Missed ||
      existing.status === SignalStatus.Expired ||
      existing.status === SignalStatus.Cancelled
    ) {
      return services.repositories.signals.updateSignal(existing.id, {
        status: SignalStatus.Scheduled,
        ringingStartedAt: null,
        snoozedUntil: null,
        resolvedAt: null,
        dismissedAt: null,
        expiredAt: null,
        cancelledAt: null,
      });
    }
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
    pathGolf: await resolveSeedEntityId(repos, userId, "path", "golf"),
    expeditionSch: await resolveSeedEntityId(repos, userId, "expedition", "career.sch.expedition.smart-counter-hub-project"),
    expeditionCutTo70: await resolveSeedEntityId(repos, userId, "expedition", "health.cut70.expedition"),
    expeditionGolf: await resolveSeedEntityId(repos, userId, "expedition", "golf.beginning.expedition"),
    expeditionWaymark: await resolveSeedEntityId(repos, userId, "expedition", "family.waymark.expedition"),
    expeditionDch: structure.expeditions[0].id,
    expeditionTonyGolf: structure.expeditions[1].id,
    expeditionBidvDailyOps: structure.expeditions[2].id,
    expeditionBidvInnovation: structure.expeditions[3].id,
    expeditionChildStudy: structure.expeditions[4].id,
    expeditionHomeRitual: structure.expeditions[5].id,
    expeditionFamily: structure.expeditions[6].id,
    expeditionWeekendHanoi: structure.expeditions[7].id,
    expeditionFamilyRecovery: structure.expeditions[8].id,
    expeditionPersonalCare: structure.expeditions[9].id,
    milestoneSchAutoQlsd: await resolveSeedEntityId(repos, userId, "milestone", "career.sch.milestone.2026-08.auto-qlsd-form"),
    milestoneSchFinancial: await resolveSeedEntityId(repos, userId, "milestone", "career.sch.milestone.2026-08.credit-card-debt-collection-adjustment"),
    milestoneSchDomesticDebit: await resolveSeedEntityId(repos, userId, "milestone", "career.sch.milestone.2026-10.domestic-debit-card-issuance-cortex"),
    milestoneCutTo70: await resolveSeedEntityId(repos, userId, "milestone", "health.cut70.milestone.76kg"),
    milestoneGolf: await resolveSeedEntityId(repos, userId, "milestone", "golf.beginning.milestone.home-snag-phase"),
    milestoneWaymark: await resolveSeedEntityId(repos, userId, "milestone", "family.waymark.milestone.anniversary-edition"),
    milestoneDchSprint72: structure.milestones[0].id,
  };
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

function markSignal(localDate: string, time: string, title: string, blockKey: string): WeeklyMarkSignalInput {
  return { localDate, time, title, blockKey };
}

function signalPack(localDate: string, time: string, sourceSeedId: string): WeeklySignalPackInput {
  return { localDate, time, sourceSeedId };
}

function puttNote() {
  return [
    "Kỹ thuật Putting: Chân chữ A. Cúi chào. Gạt 7h đến 5h. Tích-tắc.",
    "Thực hiện đủ rep putting bằng gậy Roller ở cự ly 60/90/120/150/180 cm; ghi Hit/Miss từng lượt.",
    "Kết thúc khi hoàn thành tất cả rep.",
  ].join(" ");
}

function puttingStrokeNote(timeLabel: string, sessionDetail: string) {
  return [
    `${timeLabel}: ${sessionDetail}`,
    "Kỹ thuật Putting: Chân chữ A. Cúi chào. Gạt 7h đến 5h. Tích-tắc.",
    "Kết thúc khi hoàn thành tất cả rep.",
  ].join(" ");
}

function chippingNote(timeLabel: string, sessionDetail: string) {
  return [
    `${timeLabel}: ${sessionDetail}`,
    "Kỹ thuật Chipping: Chân chữ A. Cúi chào. 8h đến 4h. Tích-tắc.",
    "Kết thúc khi hoàn thành tất cả rep.",
  ].join(" ");
}

function pitchingNote(timeLabel: string, sessionDetail: string) {
  return [
    `${timeLabel}: ${sessionDetail}`,
    "Kỹ thuật Pitching: Chân chữ A. Cúi chào. 9h chữ L đến 3h.",
    "Kết thúc khi hoàn thành tất cả rep.",
  ].join(" ");
}

function fullSwingNote(timeLabel: string, sessionDetail: string) {
  return [
    `${timeLabel}: ${sessionDetail}`,
    "Kỹ thuật Full swing: Chân chữ A. Cúi chào. 10h chữ L. Kết thúc ở 2h.",
    "Bản đầy đủ: 9h chữ L đến 10h, qua 3h chữ L, kết thúc ở 2h.",
    "Kết thúc khi hoàn thành tất cả rep.",
  ].join(" ");
}

function breakfastSlot(localDate: string, pathFamily: string, expeditionFamily: string): WeeklyTimetableImportSlotInput {
  return slot(
    localDate,
    "07:00",
    "07:20",
    "Chuẩn bị bữa sáng cho cả nhà",
    pathFamily,
    "family_breakfast",
    expeditionFamily,
    undefined,
    "Luộc 6 quả trứng: 2 bố con lòng đào 6 phút, mẹ chín kỹ. Pha sữa Hikid cho con và pha Glucerna cho mẹ.",
    true,
  );
}

function createLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function findExistingBreakfastMarkByDate(repos: WaymarkRepositories, userId: string, localDate: string) {
  const marks = await repos.marks.listMarkInstancesByDate(userId, localDate);
  return marks.find((mark) => mark.title === BREAKFAST_TITLE) ?? null;
}

function buildBreakfastGenerationKey(localDate: string) {
  return `weekly_breakfast_2026_07_13:${localDate}:family_breakfast`;
}

function dedupeById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
