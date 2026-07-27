import type { MarkInstance, PackCheckInstance, Signal, WaymarkRepositories, WeekPlanItem } from "../domain/waymark";
import {
  MarkInstanceOrigin,
  MarkInstanceStatus,
  MarkTemplateType,
  PackCheckInstanceStatus,
  RecurrenceKind,
  SignalStatus,
  SignalTargetType,
} from "../domain/waymark/enums";
import type { SignalEngine } from "../domain/waymark/services";
import { importWeeklyTimetable, type WeeklyTimetableImportReport, type WeeklyTimetableImportSlotInput } from "../lib/waymark";
import { setMarkTemplateSeedMetadata } from "../lib/waymark/markTemplateSeedStore";
import { recomputeTrailDayCountersForDate } from "../lib/waymark/plannedMarkSourceOfTruth";
import { findSeedRecordBySource } from "../waymark-map/seedRegistry";
import { buildZonedDateTime } from "./waymarkUi";

type ImportServices = {
  repositories: WaymarkRepositories;
  signalEngine: SignalEngine;
};

type WeeklyCatalogIds = {
  pathCareer: string;
  pathSnag: string;
  pathFamily: string;
  pathHealth: string;
  pathGolf: string;
  pathCharacter: string;
  expeditionSch?: string;
  expeditionDch?: string;
  expeditionCutTo70?: string;
  expeditionGolf?: string;
  expeditionWaymark?: string;
  expeditionFamily?: string;
  expeditionChildStudy?: string;
  expeditionWeekend?: string;
  milestoneCutTo70?: string;
  milestoneGolf?: string;
  milestoneWaymark?: string;
};

type WeeklyMarkSignalInput = {
  localDate: string;
  time: string;
  title: string;
  blockKey: string;
};

type WeeklySignalPackInput = {
  localDate: string;
  time: string;
  sourceSeedId: string;
};

type ExistingHierarchyLinkReport = {
  linked: number;
  skipped: Array<{
    title: string;
    localDate: string;
    reason: string;
  }>;
};

export type WeeklyTimetable20260720ImportReport = WeeklyTimetableImportReport & {
  packChecks: PackCheckInstance[];
  signals: Signal[];
  hierarchyLinks: ExistingHierarchyLinkReport;
};

export type WeekendHospitalCarePatchCleanupSkipped = {
  title: string;
  localDate: string;
  reason: string;
};

export type WeekendHospitalCarePatchReport = WeeklyTimetableImportReport & {
  signals: Signal[];
  cleanup: {
    removedMarkIds: string[];
    removedWeekPlanItemIds: string[];
    removedPackCheckInstanceIds: string[];
    skipped: WeekendHospitalCarePatchCleanupSkipped[];
  };
  hierarchyLinks: ExistingHierarchyLinkReport;
};

const WEEK_DATES = [
  "2026-07-20",
  "2026-07-21",
  "2026-07-22",
  "2026-07-23",
  "2026-07-24",
  "2026-07-25",
  "2026-07-26",
] as const;

const WEEKDAY_DATES = WEEK_DATES.slice(0, 5);
const WEEKEND_HOSPITAL_CARE_DATES = ["2026-07-25", "2026-07-26"] as const;
const POST_WORKOUT_ROUTINE_TEMPLATE_TITLE = "Post Workout Routine";
const OBSOLETE_POST_WORKOUT_BLOCK_KEYS = new Set(["morning_food", "family_breakfast"]);
const OBSOLETE_POST_WORKOUT_TITLES = new Set([
  "Morning Food Intake — Brainfood baseline",
  "Chuẩn bị bữa sáng cho cả nhà",
]);
const OBSOLETE_SATURDAY_FAMILY_TITLES = new Set([
  "Family activity",
  "Family support",
  "Morning Support",
  "Afternoon Support",
  "Chuẩn bị đồ golf EPGA",
]);
const OBSOLETE_SNAG_CONTENT_TITLES = new Set([
  "Gắn Google tag website SNAG",
  "Cấu hình event GA4 cho SNAG",
  "Kiểm thử GA4 website SNAG",
]);
const OBSOLETE_WEEKEND_HOSPITAL_PATCH_TITLES = new Set([
  ...OBSOLETE_SATURDAY_FAMILY_TITLES,
  "Mua hoa tặng vợ sáng thứ 7",
  "Chơi ở nhà cùng gia đình",
  "Tham quan Festival Mỹ thuật trẻ tại VCCA",
  "Chuẩn bị đồ golf EPGA ngày mai",
  "EPGA golf — buổi sáng",
  "EPGA golf — buổi chiều",
  "Family recovery",
  "Chuẩn bị bài Toán + tiếng Việt cho thứ 2",
  POST_WORKOUT_ROUTINE_TEMPLATE_TITLE,
]);

const POST_WORKOUT_ROUTINE_CHECKLIST = [
  "Pha sữa Hikid cho con.",
  "Pha Glucerna cho mẹ.",
  "Brainfood: ăn 1-2 trứng, uống một cốc trà xanh, kiểm tra tỏi cho bữa trưa hoặc tối.",
  "Thắp hương buổi sáng: chuẩn bị bàn thờ gọn gàng, thắp hương và dọn lại đồ dùng.",
];

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
    note,
    allowOverlap,
  };
}

function hospitalCareTitle() {
  return "Trông bố trong viện";
}

function hospitalCareDetail(session: "morning" | "noon" | "evening") {
  switch (session) {
    case "morning":
      return "Trông bố trong viện buổi sáng. Hỗ trợ vệ sinh cá nhân, lau người, lau vùng hạ bộ, thay bỉm nếu cần, chỉnh tư thế và đảm bảo bố sạch, khô, thoải mái trước khi kết thúc ca.";
    case "noon":
      return "Trông bố trong viện buổi trưa. Kiểm tra sức khỏe chung, hỗ trợ ăn/uống nếu phù hợp, lau người hoặc lau vùng hạ bộ khi cần, thay bỉm nếu bẩn, chỉnh tư thế và đảm bảo bố sạch, khô, thoải mái.";
    case "evening":
      return "Trông bố trong viện buổi tối. Hỗ trợ vệ sinh trước khi nghỉ, lau người, lau vùng hạ bộ, thay bỉm nếu cần, chỉnh tư thế và đảm bảo bố sạch, khô, thoải mái cho buổi đêm.";
  }
}

function weekendHospitalCareSlots(catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
  return WEEKEND_HOSPITAL_CARE_DATES.flatMap((localDate) => [
    slot(localDate, "07:00", "08:30", hospitalCareTitle(), catalog.pathCharacter, "hospital_care_morning", undefined, undefined, hospitalCareDetail("morning"), true),
    slot(localDate, "11:00", "12:00", hospitalCareTitle(), catalog.pathCharacter, "hospital_care_noon", undefined, undefined, hospitalCareDetail("noon"), true),
    slot(localDate, "18:00", "19:00", hospitalCareTitle(), catalog.pathCharacter, "hospital_care_evening", undefined, undefined, hospitalCareDetail("evening"), true),
  ]);
}

function weekendPreservedSlots(catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
  const H = catalog.pathHealth;
  const G = catalog.pathGolf;
  const F = catalog.pathFamily;
  return [
    ...WEEKEND_HOSPITAL_CARE_DATES.map((date) =>
      slot(date, "05:30", "05:35", "Weight In", H, "weight", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Cân ngay sau khi thức dậy, trước ăn uống và vận động. Mark Detail để trống hoặc ghi giá trị thực tế khi thực hiện; không ghi đè cân nặng đã nhập."),
    ),
    slot("2026-07-25", "05:35", "06:05", chippingTitle("7 m", "2.8 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("7 m", "2.8 m")),
    slot("2026-07-25", "06:05", "06:35", puttingTitle(), G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttingNote()),
    slot("2026-07-26", "05:35", "06:05", "Chipping 3-5-7 m · Land inside each zone · Hit Flagsticky", G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, "Chipping test 3-5-7 m. Set plan: 6 sets x 4 reps = 24 chips. Round 1: 3 m x4, 5 m x4, 7 m x4. Round 2 repeats the same order. Hit chỉ tính khi bóng land inside đúng zone rồi chạm Flagsticky. Ghi Hit/Miss, không ghi điểm phụ và không đánh bù miss."),
    slot("2026-07-26", "06:05", "06:35", puttingTitle(), G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttingNote()),
    slot("2026-07-26", "21:00", "21:20", "Chuẩn bị trứng ngâm tương 3 ngày", F, "family_fixed", catalog.expeditionFamily, undefined, soyEggNote()),
  ];
}

function withWeekendHospitalCareSlots(
  items: WeeklyTimetableImportSlotInput[],
  catalog: WeeklyCatalogIds,
): WeeklyTimetableImportSlotInput[] {
  return [
    ...items.filter((item) => !isWeekendHospitalPatchItem(item)),
    ...weekendHospitalCareSlots(catalog),
  ];
}

function buildWeekendHospitalCarePatchSlots(catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
  return [...weekendPreservedSlots(catalog), ...weekendHospitalCareSlots(catalog)];
}

export function buildWeeklyTimetable20260720To0726(catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
  const C = catalog.pathCareer;
  const S = catalog.pathSnag;
  const F = catalog.pathFamily;
  const H = catalog.pathHealth;
  const G = catalog.pathGolf;

  return withWeekendHospitalCareSlots([
    ...WEEK_DATES.map((date) =>
      slot(date, "05:30", "05:35", "Weight In", H, "weight", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Cân ngay sau khi thức dậy, trước ăn uống và vận động. Mark Detail để trống hoặc ghi giá trị thực tế khi thực hiện; không ghi đè cân nặng đã nhập."),
    ),

    slot("2026-07-20", "05:35", "07:00", "Workout Day A", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, thực hiện đúng session Day A và cooldown. Kết thúc khi đã ghi đủ bài tập, mức nặng và cảm nhận."),
    slot("2026-07-21", "05:35", "07:00", "Workout Day B", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, thực hiện đúng session Day B và cooldown. Kết thúc khi đã ghi đủ bài tập, mức nặng và cảm nhận."),
    slot("2026-07-22", "05:35", "07:00", "Workout Walk", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở phiên Walk, đi đủ thời lượng theo Health Engine và duy trì nhịp ổn định. Kết thúc khi quãng đường và cảm nhận được ghi lại."),
    slot("2026-07-23", "05:35", "07:00", "Workout Day A", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, thực hiện đúng session Day A và cooldown. Kết thúc khi đã ghi đủ bài tập, mức nặng và cảm nhận."),
    slot("2026-07-24", "05:35", "07:00", "Workout Day B", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, thực hiện đúng session Day B và cooldown. Kết thúc khi đã ghi đủ bài tập, mức nặng và cảm nhận."),

    ...WEEKDAY_DATES.map((date) => postWorkoutRoutineSlot(date, F, catalog.expeditionFamily)),

    slot("2026-07-20", "08:00", "09:30", "Tạo GA4 cho website SNAG", S, "snag_analytics", undefined, undefined, "Tạo GA4 Property và Web Data Stream cho đúng domain, timezone và website SNAG. Kết thúc khi có Measurement ID chính thức để tích hợp. Proof: GA4 Property, Web Stream và Measurement ID."),
    slot("2026-07-21", "08:00", "09:30", "Cập nhật sự kiện golf tháng 5–7", S, "snag_content", undefined, undefined, "Rà ảnh, video và thông tin các sự kiện golf từ tháng 5 đến tháng 7, lập backlog bài viết. Kết thúc khi mỗi sự kiện có dữ liệu và góc nội dung."),
    slot("2026-07-22", "08:00", "09:30", "Lập kế hoạch content đa kênh SNAG", S, "snag_content", undefined, undefined, "Dùng backlog sự kiện để phân bổ nội dung cho website, Facebook và các kênh hiện có. Kết thúc khi có ma trận chủ đề, định dạng và kênh đăng."),
    slot("2026-07-23", "08:00", "09:30", "Thiết kế Mark đăng bài định kỳ", S, "snag_content", undefined, undefined, "Chuyển kế hoạch content thành các Mark lặp lại để chuẩn bị, viết, duyệt và đăng bài. Kết thúc khi có lịch Mark định kỳ theo từng kênh."),

    ...WEEKDAY_DATES.map((date) =>
      slot(date, "09:45", "11:15", "Supervising BIDV buổi sáng", C, "supervising_am", catalog.expeditionSch, undefined, "Kiểm tra Zalo, mail, Confluence và Jira; xử lý việc dưới 5 phút, ghi lại việc cần Focus Block và người đang chờ phản hồi."),
    ),

    slot("2026-07-20", "12:00", "12:30", chippingTitle("3 m", "1.2 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("3 m", "1.2 m")),
    slot("2026-07-21", "12:00", "12:30", chippingTitle("3 m", "1.2 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("3 m", "1.2 m")),
    slot("2026-07-22", "12:00", "12:30", chippingTitle("5 m", "2.0 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("5 m", "2.0 m")),
    slot("2026-07-23", "12:00", "12:30", chippingTitle("5 m", "2.0 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("5 m", "2.0 m")),
    slot("2026-07-24", "12:00", "12:30", chippingTitle("7 m", "2.8 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("7 m", "2.8 m")),

    slot("2026-07-20", "13:30", "15:00", "Viết RSD chi tiết giao dịch DDA-DDA", C, "bidv_focus", catalog.expeditionSch, undefined, "Mở RSD hiện tại, hoàn thiện xử lý chi tiết, validation, dữ liệu và ngoại lệ của giao dịch. Kết thúc khi bản chi tiết sẵn sàng review. Output: bản RSD chi tiết."),
    slot("2026-07-20", "17:00", "18:30", "Viết RSD phê duyệt giao dịch DDA-DDA", C, "bidv_focus", catalog.expeditionSch, undefined, "Dùng luồng khởi tạo làm nguồn, viết xử lý maker-checker, phê duyệt, từ chối và lỗi. Kết thúc khi đủ rule và acceptance criteria."),
    slot("2026-07-21", "13:30", "15:00", "Viết RSD khởi tạo thu chi GL", C, "bidv_focus", catalog.expeditionSch, undefined, "Mở tài liệu thu chi GL, viết luồng khởi tạo, trường nhập, validation và bước gọi dịch vụ. Kết thúc khi bản khởi tạo sẵn sàng review."),
    slot("2026-07-21", "17:00", "18:30", "Viết RSD chi tiết thu chi GL", C, "bidv_focus", catalog.expeditionSch, undefined, "Mở RSD khởi tạo, viết xử lý chi tiết, hạch toán, mapping dữ liệu và trường hợp ngoại lệ. Kết thúc khi phần chi tiết đủ để review."),
    slot("2026-07-22", "13:30", "15:00", "Viết RSD phê duyệt thu chi GL", C, "bidv_focus", catalog.expeditionSch, undefined, "Dùng RSD khởi tạo và chi tiết làm nguồn, viết luồng phê duyệt, từ chối và kiểm soát trạng thái. Kết thúc khi đủ rule và acceptance criteria."),
    slot("2026-07-22", "17:00", "18:30", "Viết RSD chi tiền mặt DCH", C, "bidv_focus", catalog.expeditionDch, undefined, "Mở yêu cầu chi tiền mặt DCH, viết luồng nghiệp vụ, hạch toán, dữ liệu tích hợp và lỗi. Kết thúc khi có bản RSD đủ phạm vi review."),
    slot("2026-07-23", "13:30", "15:00", "Viết test SIT QLSD Thẻ", C, "bidv_focus", catalog.expeditionSch, undefined, "Mở RSD QLSD Thẻ, lập testcase theo từng rule, validation và luồng lỗi. Kết thúc khi đủ precondition, bước test và expected result."),

    ...WEEKDAY_DATES.map((date) =>
      slot(date, "15:15", "16:45", "Daily DCH và supervising", C, "supervising_pm", catalog.expeditionDch, undefined, "Thực hiện Daily DCH, kiểm tra Zalo, mail, Confluence và Jira. Kết thúc khi blocker, owner và việc cần Focus Block đã được ghi lại."),
    ),

    slot("2026-07-23", "17:00", "18:30", "Hoàn thiện Backup/Restore Turso", F, "waymark_turso", catalog.expeditionWaymark, catalog.milestoneWaymark, "Kiểm tra backup dữ liệu lên Turso và restore xuống local, gồm lỗi và xác nhận kết quả. Kết thúc khi chạy trọn một vòng thành công."),
    slot("2026-07-24", "08:00", "09:30", "Hoàn thiện edit hierarchy Turso", F, "waymark_turso", catalog.expeditionWaymark, catalog.milestoneWaymark, "Kiểm tra edit Path, Expedition và Planned Mark gắn Expedition, gồm lưu, pull và hiển thị local. Kết thúc khi quan hệ dữ liệu được giữ đúng."),
    slot("2026-07-24", "13:30", "15:00", "Hoàn thiện Weekly Planning Turso", F, "waymark_turso", catalog.expeditionWaymark, catalog.milestoneWaymark, "Chạy luồng tạo và chỉnh Weekly Planning trên Turso rồi Manual Pull xuống local. Kết thúc khi toàn tuần hiển thị đúng và không duplicate."),
    slot("2026-07-24", "17:00", "18:30", "Waymark Planning", C, "buffer", undefined, undefined, "Chỉ xử lý task chưa hoàn thành hoặc lỗi chặn dependency BIDV, SNAG hay Turso. Nếu không có carryover, review kết quả và đóng tuần."),

    ...["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24"].map((date) =>
      slot(date, "18:30", "19:00", puttingTitle(), G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttingNote()),
    ),

    slot("2026-07-20", "20:00", "21:00", "Trông con học Toán + tiếng Việt", F, "family_evening", catalog.expeditionChildStudy ?? catalog.expeditionFamily, undefined, "Mở bài cần học, trông con hoàn thành Toán và tiếng Việt. Kết thúc khi bài xong và sách vở ngày mai đã soạn."),
    slot("2026-07-21", "20:00", "21:00", "Chuẩn bị bài Cambridge", F, "family_evening", catalog.expeditionChildStudy ?? catalog.expeditionFamily, undefined, "Mở bài Cambridge, cùng con đọc yêu cầu và chuẩn bị phần cần làm. Kết thúc khi cặp và tài liệu đã sẵn sàng."),
    slot("2026-07-22", "20:00", "21:00", "Học tiếng Anh hoặc đọc sách nhẹ", F, "family_evening", catalog.expeditionChildStudy ?? catalog.expeditionFamily, undefined, "Giữ nhịp học nhẹ buổi tối: tiếng Anh hoặc đọc sách. Kết thúc khi con đã hoàn thành phần tối thiểu và sẵn sàng nghỉ."),
    slot("2026-07-22", "21:00", "21:20", "Chuẩn bị trứng ngâm tương 3 ngày", F, "family_fixed", catalog.expeditionFamily, undefined, soyEggNote()),
    slot("2026-07-23", "20:00", "21:00", "Đưa vợ đi massage thứ 5", F, "family_fixed", catalog.expeditionFamily, undefined, "Kiểm tra lịch hẹn và tuyến đường, chuẩn bị di chuyển rồi đưa vợ đến nơi massage. Kết thúc khi giờ đón về đã được thống nhất."),
    slot("2026-07-24", "20:00", "21:00", "Family recovery", F, "family_evening", catalog.expeditionFamily, undefined, "Giữ buổi tối nhẹ, hồi phục sau tuần làm việc và chốt việc gia đình còn mở."),

    slot("2026-07-25", "05:35", "06:05", chippingTitle("7 m", "2.8 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("7 m", "2.8 m")),
    slot("2026-07-25", "06:05", "06:35", puttingTitle(), G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttingNote()),
    slot("2026-07-25", "07:00", "07:30", "Mua hoa tặng vợ sáng thứ 7", F, "family_fixed", catalog.expeditionFamily, undefined, "Ghé điểm bán hoa đã chọn, mua một bó phù hợp và mang về tặng vợ trước hoạt động gia đình. Kết thúc khi hoa đã được trao.", true),
    slot("2026-07-25", "08:00", "11:15", "Chơi ở nhà cùng gia đình", F, "family_weekend_morning", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Dành buổi sáng chơi cùng con tại nhà, ưu tiên hoạt động con tự chọn và không mở việc công việc. Kết thúc khi cả nhà ăn trưa và chuẩn bị đi VCCA."),
    slot("2026-07-25", "13:30", "16:45", "Tham quan Festival Mỹ thuật trẻ tại VCCA", F, "family_weekend_afternoon", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Đưa cả nhà đến VCCA xem Festival Mỹ thuật trẻ, cùng con chọn ba tác phẩm đáng nhớ. Kết thúc khi mỗi người đã chia sẻ một nhận xét. Note: Festival Mỹ thuật trẻ lần thứ VIII năm 2026 tại VCCA, Royal City, 72A Nguyễn Trãi."),
    slot("2026-07-25", "20:00", "21:00", "Chuẩn bị đồ golf EPGA ngày mai", F, "family_evening", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Kiểm tra gậy, bóng, quần áo, mũ, nước và giờ xuất phát. Kết thúc khi toàn bộ đồ golf đã được đặt sẵn cho sáng hôm sau."),

    slot("2026-07-26", "05:35", "06:05", "Chipping 3-5-7 m · Land inside each zone · Hit Flagsticky", G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, "Chipping test 3-5-7 m. Set plan: 6 sets x 4 reps = 24 chips. Round 1: 3 m x4, 5 m x4, 7 m x4. Round 2 repeats the same order. Hit chỉ tính khi bóng land inside đúng zone rồi chạm Flagsticky. Ghi Hit/Miss, không ghi điểm phụ và không đánh bù miss."),
    slot("2026-07-26", "06:05", "06:35", puttingTitle(), G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttingNote()),
    slot("2026-07-26", "08:00", "11:15", "EPGA golf — buổi sáng", F, "family_epga", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Giữ lịch EPGA buổi sáng. Không xếp thêm BIDV, SNAG hoặc Waymark vào Chủ nhật."),
    slot("2026-07-26", "13:30", "16:45", "EPGA golf — buổi chiều", F, "family_epga", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Giữ lịch EPGA buổi chiều. Không xếp thêm BIDV, SNAG hoặc Waymark vào Chủ nhật."),
    slot("2026-07-26", "17:00", "18:30", "Family recovery", F, "family_recovery", catalog.expeditionFamily, undefined, "Hồi phục sau EPGA và giữ tối Chủ nhật nhẹ."),
    slot("2026-07-26", "20:00", "21:00", "Chuẩn bị bài Toán + tiếng Việt cho thứ 2", F, "family_evening", catalog.expeditionChildStudy ?? catalog.expeditionFamily, undefined, "Chuẩn bị bài Toán và tiếng Việt cho thứ 2. Kết thúc khi sách vở và yêu cầu học đã rõ."),
    slot("2026-07-26", "21:00", "21:20", "Chuẩn bị trứng ngâm tương 3 ngày", F, "family_fixed", catalog.expeditionFamily, undefined, soyEggNote()),

  ], catalog);
}

const BASE_WEEKLY_MARK_SIGNALS: WeeklyMarkSignalInput[] = [
  ...WEEK_DATES.map((localDate) => markSignal(localDate, "05:30", "Weight In", "weight")),
  markSignal("2026-07-20", "05:35", "Workout Day A", "workout"),
  markSignal("2026-07-21", "05:35", "Workout Day B", "workout"),
  markSignal("2026-07-22", "05:35", "Workout Walk", "workout"),
  markSignal("2026-07-23", "05:35", "Workout Day A", "workout"),
  markSignal("2026-07-24", "05:35", "Workout Day B", "workout"),
  markSignal("2026-07-20", "11:30", chippingTitle("3 m", "1.2 m"), "golf_swing"),
  markSignal("2026-07-21", "11:30", chippingTitle("3 m", "1.2 m"), "golf_swing"),
  markSignal("2026-07-22", "11:30", chippingTitle("5 m", "2.0 m"), "golf_swing"),
  markSignal("2026-07-23", "11:30", chippingTitle("5 m", "2.0 m"), "golf_swing"),
  markSignal("2026-07-24", "11:30", chippingTitle("7 m", "2.8 m"), "golf_swing"),
  markSignal("2026-07-25", "05:35", chippingTitle("7 m", "2.8 m"), "golf_swing"),
  markSignal("2026-07-26", "05:35", "Chipping 3-5-7 m · Land inside each zone · Hit Flagsticky", "golf_swing"),
  ...["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24"].map((localDate) => markSignal(localDate, "18:00", puttingTitle(), "golf_putt")),
  markSignal("2026-07-25", "06:05", puttingTitle(), "golf_putt"),
  markSignal("2026-07-26", "06:05", puttingTitle(), "golf_putt"),
  markSignal("2026-07-23", "19:30", "Đưa vợ đi massage thứ 5", "family_fixed"),
  markSignal("2026-07-25", "07:00", "Mua hoa tặng vợ sáng thứ 7", "family_fixed"),
  markSignal("2026-07-22", "21:00", "Chuẩn bị trứng ngâm tương 3 ngày", "family_fixed"),
  markSignal("2026-07-26", "21:00", "Chuẩn bị trứng ngâm tương 3 ngày", "family_fixed"),
];

const WEEKEND_HOSPITAL_CARE_SIGNALS: WeeklyMarkSignalInput[] = WEEKEND_HOSPITAL_CARE_DATES.flatMap((localDate) => [
  markSignal(localDate, "06:45", hospitalCareTitle(), "hospital_care_morning"),
  markSignal(localDate, "10:45", hospitalCareTitle(), "hospital_care_noon"),
  markSignal(localDate, "17:45", hospitalCareTitle(), "hospital_care_evening"),
]);

const WEEKLY_MARK_SIGNALS: WeeklyMarkSignalInput[] = [
  ...BASE_WEEKLY_MARK_SIGNALS.filter((input) => !isWeekendHospitalPatchSignal(input)),
  ...WEEKEND_HOSPITAL_CARE_SIGNALS,
];

const BASE_WEEKLY_SIGNAL_PACKS: WeeklySignalPackInput[] = [
  ...WEEK_DATES.map((localDate) => signalPack(localDate, "07:10", "style.daily-grooming-presence-check")),
  ...WEEK_DATES.map((localDate) => signalPack(localDate, "07:30", "family.before-leaving-home-check")),
  ...WEEK_DATES.map((localDate) => signalPack(localDate, "21:30", "family.home-shutdown-check")),
  signalPack("2026-07-20", "21:45", "family.home-shutdown-check"),
  signalPack("2026-07-21", "21:45", "family.home-shutdown-check"),
  signalPack("2026-07-22", "21:45", "family.home-shutdown-check"),
  signalPack("2026-07-23", "21:45", "family.home-shutdown-check"),
  signalPack("2026-07-24", "21:45", "family.weekend-around-hanoi-readiness-check"),
  signalPack("2026-07-25", "21:45", "golf.golf-outing-readiness-check"),
  signalPack("2026-07-26", "21:45", "family.home-shutdown-check"),
];

const WEEKLY_SIGNAL_PACKS: WeeklySignalPackInput[] = BASE_WEEKLY_SIGNAL_PACKS.filter(
  (input) => !(input.localDate === "2026-07-25" && input.sourceSeedId === "golf.golf-outing-readiness-check"),
);

export async function importWeeklyTimetable20260720To0726(
  services: ImportServices,
  userId: string,
  timezone: string,
): Promise<WeeklyTimetable20260720ImportReport> {
  const repos = services.repositories;
  const catalog = await resolveWeeklyCatalogIds(repos, userId);
  await ensurePostWorkoutRoutineTemplate(repos, userId, catalog.pathFamily, catalog.expeditionFamily);
  await cleanupObsoletePostWorkoutRoutineMarks(services, userId);
  await cleanupWeekendHospitalCarePatchTargets(services, userId);
  await cleanupObsoleteSnagContentMarks(services, userId);
  const items = buildWeeklyTimetable20260720To0726(catalog);
  const report = await importWeeklyTimetable(repos, {
    userId,
    weekStartDate: "2026-07-20",
    weekEndDate: "2026-07-26",
    note: "Imported from approved data-only weekly plan 2026-07-20 to 2026-07-26. Uses scheduled date/time, no dueAt, no hierarchy creation, and direct mark/pack-check signals.",
    importBatchId: "weekly_timetable_2026_07_20_2026_07_26_data_only_v1",
    items,
    setMarkDueAt: false,
  });
  const { packChecks, signals } = await ensureWeeklySignals(services, userId, timezone, report);

  return {
    ...report,
    packChecks,
    signals,
    hierarchyLinks: summarizeHierarchyLinks(items),
  };
}

export async function importWeekendHospitalCarePatch20260725To0726(
  services: ImportServices,
  userId: string,
  timezone: string,
): Promise<WeekendHospitalCarePatchReport> {
  const repos = services.repositories;
  const catalog = await resolveWeeklyCatalogIds(repos, userId);
  const cleanup = await cleanupWeekendHospitalCarePatchTargets(services, userId);
  const items = buildWeekendHospitalCarePatchSlots(catalog);
  const report = await importWeeklyTimetable(repos, {
    userId,
    weekStartDate: "2026-07-20",
    weekEndDate: "2026-07-26",
    note: "Weekend hospital care patch for 2026-07-25 to 2026-07-26. Preserves weight, chipping, putting, and Sunday soy eggs; replaces pristine family/VCCA/EPGA weekend placeholders with Character care marks.",
    importBatchId: "weekly_timetable_2026_07_25_2026_07_26_hospital_care_patch_v1",
    items,
    setMarkDueAt: false,
  });
  const signals = await ensureWeekendHospitalCareSignals(services, userId, timezone, report);

  return {
    ...report,
    signals,
    cleanup,
    hierarchyLinks: summarizeHierarchyLinks(items),
  };
}

async function cleanupObsoletePostWorkoutRoutineMarks(services: ImportServices, userId: string) {
  const repos = services.repositories;
  const removedMarkIds = new Set<string>();
  const affectedDates = new Set<string>();
  const weekPlan = await repos.weekPlans.getByWeekStart(userId, "2026-07-20");

  if (weekPlan) {
    const weekItems = await repos.weekPlans.listItems(weekPlan.id);
    for (const item of weekItems) {
      if (!item.localDate || !WEEK_DATES.includes(item.localDate as (typeof WEEK_DATES)[number])) {
        continue;
      }
      if (!isObsoletePostWorkoutRoutineItem(item)) {
        continue;
      }

      const mark = item.createdMarkInstanceId ? await repos.marks.getMarkInstanceById(item.createdMarkInstanceId) : null;
      if (mark && !isRemovableObsoletePostWorkoutRoutineMark(mark)) {
        continue;
      }

      await repos.weekPlans.softDeleteWeekPlanItem(item.id);
      affectedDates.add(item.localDate);
      if (mark) {
        await removeObsoletePostWorkoutRoutineMark(services, mark);
        removedMarkIds.add(mark.id);
      }
    }
  }

  for (const localDate of WEEK_DATES) {
    const marks = await repos.marks.listMarkInstancesByDate(userId, localDate);
    for (const mark of marks) {
      if (removedMarkIds.has(mark.id) || !OBSOLETE_POST_WORKOUT_TITLES.has(mark.title)) {
        continue;
      }
      if (!isRemovableObsoletePostWorkoutRoutineMark(mark)) {
        continue;
      }
      await removeObsoletePostWorkoutRoutineMark(services, mark);
      removedMarkIds.add(mark.id);
      affectedDates.add(localDate);
    }
  }

  for (const localDate of affectedDates) {
    await recomputeTrailDayCountersForDate(repos, userId, localDate);
  }
}

async function removeObsoletePostWorkoutRoutineMark(services: ImportServices, mark: MarkInstance) {
  await services.signalEngine.cancelSignalsForTarget({
    targetType: SignalTargetType.MarkInstance,
    targetId: mark.id,
    reason: "Merged legacy morning food/breakfast mark into Post Workout Routine.",
  });
  await services.repositories.marks.softDeleteMarkInstance(mark.id);
}

async function cleanupObsoleteSaturdayFamilyMarks(services: ImportServices, userId: string) {
  const repos = services.repositories;
  const removedMarkIds = new Set<string>();
  const localDate = "2026-07-25";
  const weekPlan = await repos.weekPlans.getByWeekStart(userId, "2026-07-20");

  if (weekPlan) {
    const weekItems = await repos.weekPlans.listItems(weekPlan.id);
    for (const item of weekItems) {
      if (item.localDate !== localDate || !isObsoleteSaturdayFamilyItem(item)) {
        continue;
      }

      const mark = item.createdMarkInstanceId ? await repos.marks.getMarkInstanceById(item.createdMarkInstanceId) : null;
      if (mark && !isRemovableObsoleteSaturdayFamilyMark(mark)) {
        continue;
      }

      await repos.weekPlans.softDeleteWeekPlanItem(item.id);
      if (mark) {
        await removeObsoleteSaturdayFamilyMark(services, mark);
        removedMarkIds.add(mark.id);
      }
    }
  }

  const marks = await repos.marks.listMarkInstancesByDate(userId, localDate);
  for (const mark of marks) {
    if (removedMarkIds.has(mark.id) || !isRemovableObsoleteSaturdayFamilyMark(mark)) {
      continue;
    }
    await removeObsoleteSaturdayFamilyMark(services, mark);
    removedMarkIds.add(mark.id);
  }

  if (removedMarkIds.size > 0) {
    await recomputeTrailDayCountersForDate(repos, userId, localDate);
  }
}

async function removeObsoleteSaturdayFamilyMark(services: ImportServices, mark: MarkInstance) {
  await services.signalEngine.cancelSignalsForTarget({
    targetType: SignalTargetType.MarkInstance,
    targetId: mark.id,
    reason: "Replaced generic Saturday family mark with the approved 2026-07-25 family event plan.",
  });
  await services.repositories.marks.softDeleteMarkInstance(mark.id);
}

async function cleanupWeekendHospitalCarePatchTargets(
  services: ImportServices,
  userId: string,
): Promise<WeekendHospitalCarePatchReport["cleanup"]> {
  const repos = services.repositories;
  const removedMarkIds = new Set<string>();
  const removedWeekPlanItemIds = new Set<string>();
  const skippedByKey = new Map<string, WeekendHospitalCarePatchCleanupSkipped>();
  const affectedDates = new Set<string>();
  const weekPlan = await repos.weekPlans.getByWeekStart(userId, "2026-07-20");

  function addSkip(mark: MarkInstance, reason = "Skipped - execution history exists.", localDate?: string) {
    const effectiveDate = localDate ?? mark.scheduledStartAt?.slice(0, 10) ?? "unknown";
    skippedByKey.set(`${effectiveDate}:${mark.id}`, {
      title: mark.title,
      localDate: effectiveDate,
      reason,
    });
  }

  if (weekPlan) {
    const weekItems = await repos.weekPlans.listItems(weekPlan.id);
    for (const item of weekItems) {
      if (!isWeekendHospitalPatchItem(item)) {
        continue;
      }

      const mark = item.createdMarkInstanceId ? await repos.marks.getMarkInstanceById(item.createdMarkInstanceId) : null;
      if (mark && !isRemovableWeekendHospitalPatchMark(mark, item.localDate)) {
        addSkip(mark, "Skipped - execution history exists.", item.localDate);
        continue;
      }

      await repos.weekPlans.softDeleteWeekPlanItem(item.id);
      removedWeekPlanItemIds.add(item.id);
      if (item.localDate) {
        affectedDates.add(item.localDate);
      }
      if (mark) {
        await removeWeekendHospitalPatchMark(services, mark);
        removedMarkIds.add(mark.id);
      }
    }
  }

  for (const localDate of WEEKEND_HOSPITAL_CARE_DATES) {
    const marks = await repos.marks.listMarkInstancesByDate(userId, localDate);
    for (const mark of marks) {
      if (removedMarkIds.has(mark.id) || !isWeekendHospitalPatchMarkCandidate(mark, localDate)) {
        continue;
      }
      if (!isRemovableWeekendHospitalPatchMark(mark, localDate)) {
        addSkip(mark, "Skipped - execution history exists.", localDate);
        continue;
      }
      await removeWeekendHospitalPatchMark(services, mark);
      removedMarkIds.add(mark.id);
      affectedDates.add(localDate);
    }
  }

  const removedPackCheckInstanceIds = await cleanupObsoleteGolfReadinessPackCheck(services, userId, skippedByKey);

  for (const localDate of affectedDates) {
    await recomputeTrailDayCountersForDate(repos, userId, localDate);
  }

  return {
    removedMarkIds: [...removedMarkIds],
    removedWeekPlanItemIds: [...removedWeekPlanItemIds],
    removedPackCheckInstanceIds,
    skipped: [...skippedByKey.values()],
  };
}

async function removeWeekendHospitalPatchMark(services: ImportServices, mark: MarkInstance) {
  await services.signalEngine.cancelSignalsForTarget({
    targetType: SignalTargetType.MarkInstance,
    targetId: mark.id,
    reason: "Replaced pristine weekend family/VCCA/EPGA placeholder with the approved hospital care plan.",
  });
  await services.repositories.marks.softDeleteMarkInstance(mark.id);
}

async function cleanupObsoleteGolfReadinessPackCheck(
  services: ImportServices,
  userId: string,
  skippedByKey: Map<string, WeekendHospitalCarePatchCleanupSkipped>,
) {
  const repos = services.repositories;
  const record = await findSeedRecordBySource(
    repos.appSettings,
    userId,
    "pack_check_template",
    "golf.golf-outing-readiness-check",
  );
  if (!record?.entityId) {
    return [];
  }

  const generationKey = `weekly_signal_pack:2026-07-20:${record.entityId}:2026-07-25:21:45`;
  const existing = await repos.packChecks.findInstanceByGenerationKey(userId, generationKey);
  if (!existing) {
    return [];
  }

  if (isProtectedPackCheckInstance(existing)) {
    skippedByKey.set(`pack:${existing.id}`, {
      title: existing.title,
      localDate: existing.availableFrom?.slice(0, 10) ?? "2026-07-25",
      reason: "Skipped - execution history exists.",
    });
    return [];
  }

  await services.signalEngine.cancelSignalsForTarget({
    targetType: SignalTargetType.PackCheckInstance,
    targetId: existing.id,
    reason: "Removed obsolete Saturday EPGA golf readiness signal from the hospital care patch.",
  });
  await repos.packChecks.softDeleteInstance(existing.id);
  return [existing.id];
}

async function cleanupObsoleteSnagContentMarks(services: ImportServices, userId: string) {
  const repos = services.repositories;
  const removedMarkIds = new Set<string>();
  const targetDates = new Set(["2026-07-21", "2026-07-22", "2026-07-23"]);
  const affectedDates = new Set<string>();
  const weekPlan = await repos.weekPlans.getByWeekStart(userId, "2026-07-20");

  if (weekPlan) {
    const weekItems = await repos.weekPlans.listItems(weekPlan.id);
    for (const item of weekItems) {
      if (!item.localDate || !targetDates.has(item.localDate) || !isObsoleteSnagContentItem(item)) {
        continue;
      }

      const mark = item.createdMarkInstanceId ? await repos.marks.getMarkInstanceById(item.createdMarkInstanceId) : null;
      if (mark && !isRemovableObsoleteSnagContentMark(mark)) {
        continue;
      }

      await repos.weekPlans.softDeleteWeekPlanItem(item.id);
      affectedDates.add(item.localDate);
      if (mark) {
        await removeObsoleteSnagContentMark(services, mark);
        removedMarkIds.add(mark.id);
      }
    }
  }

  for (const localDate of targetDates) {
    const marks = await repos.marks.listMarkInstancesByDate(userId, localDate);
    for (const mark of marks) {
      if (removedMarkIds.has(mark.id) || !isRemovableObsoleteSnagContentMark(mark)) {
        continue;
      }
      await removeObsoleteSnagContentMark(services, mark);
      removedMarkIds.add(mark.id);
      affectedDates.add(localDate);
    }
  }

  for (const localDate of affectedDates) {
    await recomputeTrailDayCountersForDate(repos, userId, localDate);
  }
}

async function removeObsoleteSnagContentMark(services: ImportServices, mark: MarkInstance) {
  await services.signalEngine.cancelSignalsForTarget({
    targetType: SignalTargetType.MarkInstance,
    targetId: mark.id,
    reason: "Replaced remaining GA implementation marks with the approved SNAG content plan.",
  });
  await services.repositories.marks.softDeleteMarkInstance(mark.id);
}

async function ensurePostWorkoutRoutineTemplate(
  repos: WaymarkRepositories,
  userId: string,
  pathFamily: string,
  expeditionFamily?: string,
) {
  const existing = (await repos.marks.listActiveMarkTemplatesByPath(pathFamily)).find(
    (template) => template.title === POST_WORKOUT_ROUTINE_TEMPLATE_TITLE,
  );
  const template =
    existing ??
    (await repos.marks.createMarkTemplate({
      userId,
      pathId: pathFamily,
      title: POST_WORKOUT_ROUTINE_TEMPLATE_TITLE,
      description: "Routine sau workout/golf buổi sáng: chuẩn bị sữa, Brainfood và thắp hương.",
      templateType: MarkTemplateType.Routine,
      recurrenceRule: { kind: RecurrenceKind.Manual },
      defaultDurationMin: 30,
      isActive: true,
    }));

  await setMarkTemplateSeedMetadata(repos.appSettings, userId, {
    templateId: template.id,
    sourceSeedId: "family.post-workout-routine",
    expeditionId: expeditionFamily,
    executionChecklistItems: POST_WORKOUT_ROUTINE_CHECKLIST,
    blockType: "family_block",
    appearsInToday: true,
  });

  return template;
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

  for (const input of WEEKLY_MARK_SIGNALS) {
    const markId = markByTitleDateBlock.get(`${input.localDate}:${input.title}:${input.blockKey}`);
    if (!markId) {
      throw new Error(`Missing Mark "${input.title}" for signal on ${input.localDate} ${input.time}.`);
    }
    signals.push(await ensureSignal(services, userId, SignalTargetType.MarkInstance, markId, input.localDate, input.time, timezone));
  }

  for (const input of WEEKLY_SIGNAL_PACKS) {
    const packCheck = await ensurePackCheckInstanceForSignal(services.repositories, userId, input);
    packChecks.push(packCheck);
    signals.push(await ensureSignal(services, userId, SignalTargetType.PackCheckInstance, packCheck.id, input.localDate, input.time, timezone));
  }

  return { packChecks: dedupeById(packChecks), signals: dedupeById(signals) };
}

async function ensureWeekendHospitalCareSignals(
  services: ImportServices,
  userId: string,
  timezone: string,
  report: WeeklyTimetableImportReport,
) {
  const signals: Signal[] = [];
  const markByTitleDateBlock = new Map(
    report.items.map((item) => [`${item.localDate}:${item.title}:${item.blockKey}`, item.createdMarkInstanceId] as const),
  );

  for (const input of WEEKEND_HOSPITAL_CARE_SIGNALS) {
    const markId = markByTitleDateBlock.get(`${input.localDate}:${input.title}:${input.blockKey}`);
    if (!markId) {
      throw new Error(`Missing Mark "${input.title}" for signal on ${input.localDate} ${input.time}.`);
    }
    signals.push(await ensureSignal(services, userId, SignalTargetType.MarkInstance, markId, input.localDate, input.time, timezone));
  }

  return dedupeById(signals);
}

async function ensurePackCheckInstanceForSignal(repos: WaymarkRepositories, userId: string, input: WeeklySignalPackInput) {
  const templateId = await resolveSeedEntityId(repos, userId, "pack_check_template", input.sourceSeedId);
  const template = await repos.packChecks.getTemplateById(templateId);
  if (!template) {
    throw new Error(`Missing pack check template for source "${input.sourceSeedId}".`);
  }

  const generationKey = `weekly_signal_pack:2026-07-20:${template.id}:${input.localDate}:${input.time}`;
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

async function resolveWeeklyCatalogIds(repos: WaymarkRepositories, userId: string): Promise<WeeklyCatalogIds> {
  const pathCareer = await resolveSeedEntityId(repos, userId, "path", "career");
  const pathSnag = await resolveSeedEntityId(repos, userId, "path", "snag");
  const pathFamily = await resolveSeedEntityId(repos, userId, "path", "family");
  const pathHealth = await resolveSeedEntityId(repos, userId, "path", "health");
  const pathGolf = await resolveSeedEntityId(repos, userId, "path", "golf");
  const pathCharacter = await resolveSeedEntityId(repos, userId, "path", "character");

  return {
    pathCareer,
    pathSnag,
    pathFamily,
    pathHealth,
    pathGolf,
    pathCharacter,
    expeditionSch: await resolveSeedEntityIdOptional(repos, userId, "expedition", "career.sch.expedition.smart-counter-hub-project"),
    expeditionDch: await findExistingExpeditionIdByTitle(repos, pathCareer, "DCH Deposit Core Hub"),
    expeditionCutTo70: await resolveSeedEntityIdOptional(repos, userId, "expedition", "health.cut70.expedition"),
    expeditionGolf: await resolveSeedEntityIdOptional(repos, userId, "expedition", "golf.beginning.expedition"),
    expeditionWaymark: await resolveSeedEntityIdOptional(repos, userId, "expedition", "family.waymark.expedition"),
    expeditionFamily: await resolveSeedEntityIdOptional(repos, userId, "expedition", "family.rhythm.expedition"),
    expeditionChildStudy: await resolveSeedEntityIdOptional(repos, userId, "expedition", "family.english.expedition"),
    expeditionWeekend: await resolveSeedEntityIdOptional(repos, userId, "expedition", "family.weekend.expedition"),
    milestoneCutTo70: await resolveSeedEntityIdOptional(repos, userId, "milestone", "health.cut70.milestone.76kg"),
    milestoneGolf: await resolveSeedEntityIdOptional(repos, userId, "milestone", "golf.beginning.milestone.home-snag-phase"),
    milestoneWaymark: await resolveSeedEntityIdOptional(repos, userId, "milestone", "family.waymark.milestone.anniversary-edition"),
  };
}

async function resolveSeedEntityId(
  repos: WaymarkRepositories,
  userId: string,
  entityType: "path" | "pack_check_template",
  sourceSeedId: string,
) {
  const record = await findSeedRecordBySource(repos.appSettings, userId, entityType, sourceSeedId);
  if (!record?.entityId) {
    throw new Error(`Missing seeded ${entityType} for source "${sourceSeedId}".`);
  }
  return record.entityId;
}

async function resolveSeedEntityIdOptional(
  repos: WaymarkRepositories,
  userId: string,
  entityType: "expedition" | "milestone",
  sourceSeedId: string,
) {
  const record = await findSeedRecordBySource(repos.appSettings, userId, entityType, sourceSeedId);
  return record?.entityId;
}

async function findExistingExpeditionIdByTitle(repos: WaymarkRepositories, pathId: string, title: string) {
  return (await repos.expeditions.listExpeditionsByPath(pathId)).items.find((item) => item.title === title)?.id;
}

function summarizeHierarchyLinks(items: WeeklyTimetableImportSlotInput[]): ExistingHierarchyLinkReport {
  const skipped = items
    .filter((item) => !item.expeditionId)
    .map((item) => ({
      title: item.title,
      localDate: item.localDate,
      reason: "No matching existing Expedition was found; Path-only link was kept.",
    }));
  return {
    linked: items.length - skipped.length,
    skipped,
  };
}

function markSignal(localDate: string, time: string, title: string, blockKey: string): WeeklyMarkSignalInput {
  return { localDate, time, title, blockKey };
}

function signalPack(localDate: string, time: string, sourceSeedId: string): WeeklySignalPackInput {
  return { localDate, time, sourceSeedId };
}

function isObsoletePostWorkoutRoutineItem(item: { blockKey?: string; title?: string }) {
  return Boolean(item.blockKey && OBSOLETE_POST_WORKOUT_BLOCK_KEYS.has(item.blockKey)) || Boolean(item.title && OBSOLETE_POST_WORKOUT_TITLES.has(item.title));
}

function isObsoleteSaturdayFamilyItem(item: { blockKey?: string; title?: string }) {
  return Boolean(item.title && OBSOLETE_SATURDAY_FAMILY_TITLES.has(item.title));
}

function isObsoleteSnagContentItem(item: { blockKey?: string; title?: string }) {
  return Boolean(item.title && OBSOLETE_SNAG_CONTENT_TITLES.has(item.title));
}

function isWeekendHospitalPatchItem(item: Pick<WeekPlanItem, "localDate" | "blockKey" | "title">) {
  if (!item.localDate || !WEEKEND_HOSPITAL_CARE_DATES.includes(item.localDate as (typeof WEEKEND_HOSPITAL_CARE_DATES)[number])) {
    return false;
  }
  if (item.title && OBSOLETE_WEEKEND_HOSPITAL_PATCH_TITLES.has(item.title)) {
    return true;
  }
  return Boolean(
    item.blockKey &&
      [
        "family_weekend_morning",
        "family_weekend_afternoon",
        "family_epga",
        "family_recovery",
        "post_workout_routine",
      ].includes(item.blockKey),
  );
}

function isWeekendHospitalPatchSignal(input: WeeklyMarkSignalInput) {
  if (!WEEKEND_HOSPITAL_CARE_DATES.includes(input.localDate as (typeof WEEKEND_HOSPITAL_CARE_DATES)[number])) {
    return false;
  }
  return OBSOLETE_WEEKEND_HOSPITAL_PATCH_TITLES.has(input.title);
}

function isWeekendHospitalPatchMarkCandidate(mark: MarkInstance, localDateOverride?: string) {
  const localDate = localDateOverride ?? mark.scheduledStartAt?.slice(0, 10);
  if (!localDate || !WEEKEND_HOSPITAL_CARE_DATES.includes(localDate as (typeof WEEKEND_HOSPITAL_CARE_DATES)[number])) {
    return false;
  }
  return OBSOLETE_WEEKEND_HOSPITAL_PATCH_TITLES.has(mark.title);
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

function isRemovableObsoletePostWorkoutRoutineMark(mark: MarkInstance) {
  return (
    mark.origin === MarkInstanceOrigin.WeeklyPlanned &&
    !isFinalMark(mark) &&
    OBSOLETE_POST_WORKOUT_TITLES.has(mark.title) &&
    (mark.status === MarkInstanceStatus.Planned ||
      mark.status === MarkInstanceStatus.Ready ||
      mark.status === MarkInstanceStatus.Blocked ||
      mark.status === MarkInstanceStatus.Active)
  );
}

function isRemovableObsoleteSaturdayFamilyMark(mark: MarkInstance) {
  return (
    mark.origin === MarkInstanceOrigin.WeeklyPlanned &&
    !isFinalMark(mark) &&
    OBSOLETE_SATURDAY_FAMILY_TITLES.has(mark.title) &&
    (mark.status === MarkInstanceStatus.Planned ||
      mark.status === MarkInstanceStatus.Ready ||
      mark.status === MarkInstanceStatus.Blocked ||
      mark.status === MarkInstanceStatus.Active)
  );
}

function isRemovableObsoleteSnagContentMark(mark: MarkInstance) {
  return (
    mark.origin === MarkInstanceOrigin.WeeklyPlanned &&
    !isFinalMark(mark) &&
    OBSOLETE_SNAG_CONTENT_TITLES.has(mark.title) &&
    (mark.status === MarkInstanceStatus.Planned ||
      mark.status === MarkInstanceStatus.Ready ||
      mark.status === MarkInstanceStatus.Blocked ||
      mark.status === MarkInstanceStatus.Active)
  );
}

function hasMarkExecutionHistory(mark: MarkInstance) {
  return (
    mark.status === MarkInstanceStatus.Active ||
    isFinalMark(mark) ||
    (mark.syncVersion ?? 0) > 0 ||
    Boolean(mark.completedAt || mark.skippedAt || mark.expiredAt || mark.proofNote || mark.completionSummary) ||
    mark.proofMediaAssetIds.length > 0
  );
}

function isRemovableWeekendHospitalPatchMark(mark: MarkInstance, localDateOverride?: string) {
  return (
    mark.origin === MarkInstanceOrigin.WeeklyPlanned &&
    isWeekendHospitalPatchMarkCandidate(mark, localDateOverride) &&
    !hasMarkExecutionHistory(mark) &&
    (mark.status === MarkInstanceStatus.Planned ||
      mark.status === MarkInstanceStatus.Ready ||
      mark.status === MarkInstanceStatus.Blocked)
  );
}

function isProtectedPackCheckInstance(packCheck: PackCheckInstance) {
  return (
    packCheck.status === PackCheckInstanceStatus.InProgress ||
    packCheck.status === PackCheckInstanceStatus.PartiallyCompleted ||
    packCheck.status === PackCheckInstanceStatus.Completed ||
    packCheck.status === PackCheckInstanceStatus.Skipped ||
    packCheck.status === PackCheckInstanceStatus.Expired ||
    packCheck.status === PackCheckInstanceStatus.Cancelled ||
    (packCheck.syncVersion ?? 0) > 0
  );
}

function chippingTitle(distance: string, baseline: string) {
  return `Chipping ${distance} · Land inside zone at ${baseline} · Hit Flagsticky`;
}

function puttingTitle() {
  return "Putt Practice · Putting · 23 putts · Hit/Miss";
}

function chippingNote(distance: string, baseline: string) {
  return [
    `Total distance ${distance}; landing zone baseline ${baseline}.`,
    "Set plan: 3 sets x 8 reps = 24 chips. Set 1 calibration, Set 2 keep rhythm, Set 3 pressure.",
    "Gate -> Land -> Flagsticky.",
    "Hit chỉ tính khi bóng land inside zone rồi chạm Flagsticky.",
    "Chỉ ghi Hit/Miss; không ghi điểm phụ và không đánh bù miss.",
  ].join(" ");
}

function postWorkoutRoutineSlot(localDate: string, pathFamily: string, expeditionFamily?: string): WeeklyTimetableImportSlotInput {
  return {
    ...slot(
      localDate,
      "07:00",
      "07:30",
      POST_WORKOUT_ROUTINE_TEMPLATE_TITLE,
      pathFamily,
      "post_workout_routine",
      expeditionFamily,
      undefined,
      "Routine sau vận động buổi sáng: chuẩn bị sữa cho cả nhà, hoàn tất Brainfood và thắp hương buổi sáng theo checklist.",
      true,
    ),
    templateRef: POST_WORKOUT_ROUTINE_TEMPLATE_TITLE,
  };
}

function puttingNote() {
  return "Thực hiện 3 cú 60 cm, 1 cú 90 cm, 2 cú 120 cm, 2 cú 150 cm và 15 cú 180 cm theo thứ tự 60 -> 90 -> 120 -> 150 -> 180 cm. Ghi Hit/Miss từng cú; miss vẫn tính rep; không đánh bù; chỉ số là tổng Hit / 23.";
}

function soyEggNote() {
  return "Luộc và bóc trứng, pha nước tương, ngâm lượng đủ dùng trong ba ngày rồi cất lạnh. Kết thúc khi hộp đã ghi ngày chuẩn bị.";
}

function createLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function dedupeById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
