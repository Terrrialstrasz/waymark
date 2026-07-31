import type { PackCheckInstance, Signal, WaymarkRepositories } from "../domain/waymark";
import {
  MarkTemplateType,
  PackCheckInstanceStatus,
  RecurrenceKind,
  SignalStatus,
  SignalTargetType,
} from "../domain/waymark/enums";
import type { SignalEngine } from "../domain/waymark/services";
import { importWeeklyTimetable, type WeeklyTimetableImportReport, type WeeklyTimetableImportSlotInput } from "../lib/waymark";
import { setMarkTemplateSeedMetadata } from "../lib/waymark/markTemplateSeedStore";
import { WAYMARK_MAP_CONFIG } from "../waymark-map";
import {
  GOLF_AUTHORITATIVE_WORKOUT_ROUTINE_REPAIR_SEED_IDS,
  repairAuthoritativeWorkoutRoutines,
} from "../waymark-map/bootstrap";
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
  expeditionSch?: string;
  expeditionDch?: string;
  expeditionCutTo70?: string;
  expeditionGolf?: string;
  expeditionWaymark?: string;
  expeditionFamily?: string;
  expeditionChildStudy?: string;
  expeditionWeekend?: string;
  milestoneSchAutoQlsd?: string;
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

export type WeeklyTimetable20260803ImportReport = WeeklyTimetableImportReport & {
  packChecks: PackCheckInstance[];
  signals: Signal[];
  hierarchyLinks: ExistingHierarchyLinkReport;
};

const WEEK_DATES = [
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
] as const;

const WEEKDAY_DATES = WEEK_DATES.slice(0, 5);
const COURSE_DATES = WEEK_DATES.slice(1, 5);
const POST_WORKOUT_ROUTINE_TEMPLATE_TITLE = "Post Workout Routine";
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
  templateRef?: string,
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
    templateRef,
  };
}

export function buildWeeklyTimetable20260803To0809(catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
  const C = catalog.pathCareer;
  const F = catalog.pathFamily;
  const H = catalog.pathHealth;
  const G = catalog.pathGolf;

  return [
    ...WEEK_DATES.map((date) =>
      slot(date, "05:30", "05:35", "Weight In", H, "weight", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Cân ngay sau khi thức dậy, trước ăn uống và vận động. Mark Detail để trống hoặc ghi giá trị thực tế khi thực hiện; không ghi đè cân nặng đã nhập."),
    ),

    workoutSlot("2026-08-03", "Workout A1", "Workout A1", H, catalog),
    workoutSlot("2026-08-04", "Workout B", "Workout B", H, catalog),
    workoutSlot("2026-08-05", "Workout Walk", "Workout Walk", H, catalog),
    workoutSlot("2026-08-06", "Workout A2", "Workout A2", H, catalog),
    workoutSlot("2026-08-07", "Workout B", "Workout B", H, catalog),

    slot("2026-08-08", "05:35", "06:05", chippingTitle("7 m", "2.8 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("7 m", "2.8 m")),
    slot("2026-08-08", "06:05", "06:35", puttingTitle(), G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttingNote()),
    slot("2026-08-09", "05:35", "06:05", chippingTitle("3 m", "1.2 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("3 m", "1.2 m")),
    slot("2026-08-09", "06:05", "06:35", puttingTitle(), G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttingNote()),

    ...WEEK_DATES.map((date) => postWorkoutRoutineSlot(date, F, catalog.expeditionFamily)),

    slot("2026-08-03", "07:30", "08:00", "Chuẩn bị đi làm", F, "family_departure", catalog.expeditionFamily, undefined, "Chuẩn bị trang phục, đồ đi làm, nước và checklist ra khỏi nhà. Kết thúc khi đã sẵn sàng rời nhà đúng giờ."),
    ...COURSE_DATES.map((date) =>
      slot(date, "07:30", "08:00", "Chuẩn bị khóa học", F, "family_departure", catalog.expeditionFamily, undefined, "Chuẩn bị máy, sạc, tai nghe, nước và tài liệu khóa học AI n8n. Kết thúc khi đã sẵn sàng vào block học lúc 08:00."),
    ),
    slot("2026-08-08", "07:30", "08:00", "Mua hoa tặng vợ", F, "family_fixed", catalog.expeditionFamily, undefined, "Ghé điểm bán hoa đã chọn, mua một bó phù hợp và mang về tặng vợ trước khi đi VCCA. Kết thúc khi hoa đã được trao.", true),
    slot("2026-08-09", "07:30", "08:00", "Chuẩn bị EPGA", F, "family_epga_prep", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Kiểm tra gậy, bóng, nước, mũ, quần áo và giờ xuất phát EPGA. Kết thúc khi cả nhà sẵn sàng di chuyển."),

    slot("2026-08-03", "08:00", "09:30", "Test biểu mẫu QLSD Thẻ", C, "bidv_focus", catalog.expeditionSch, catalog.milestoneSchAutoQlsd, "Mở build và danh sách biểu mẫu QLSD Thẻ, test từng luồng chính và lưu evidence. Kết thúc khi có bảng Pass/Fail cùng bug cần tạo. Output: evidence và bug list."),
    slot("2026-08-03", "09:45", "11:15", "Hoàn thiện slide Sub Account LNH", C, "bidv_focus", catalog.expeditionSch, undefined, "Mở deck hiện tại, hoàn thiện luồng chuyển và nhận tiền Sub Account liên ngân hàng. Kết thúc khi deck V1 đủ nội dung để review. Output: deck V1 có đủ hai chiều chuyển/nhận."),

    ...WEEKDAY_DATES.map((date) =>
      slot(date, "12:00", "12:30", weekdayChippingForDate(date).title, G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, weekdayChippingForDate(date).note),
    ),

    slot("2026-08-03", "13:30", "15:00", "Planning SCH và rà checklist golive", C, "bidv_focus", catalog.expeditionSch, undefined, "Rà backlog SCH và checklist go-live DCH giai đoạn 1, chốt ưu tiên, tài liệu thiếu và owner. Kết thúc khi có hai danh sách sẵn sàng theo dõi. Output: backlog tuần + checklist gap/owner."),
    slot("2026-08-03", "15:15", "16:45", "Supervising BIDV + Daily DCH", C, "supervising_pm", catalog.expeditionDch, undefined, "Kiểm tra Zalo, mail, Confluence và Jira; thực hiện Daily DCH. Kết thúc khi blocker, owner và việc cần theo dõi đã được ghi lại. Output: blocker list."),
    slot("2026-08-03", "17:00", "18:30", "Thiết kế báo cáo và đối soát DCH", C, "bidv_focus", catalog.expeditionDch, undefined, "Xác định dữ liệu báo cáo, khóa đối chiếu SCH-DCH, trạng thái lệch và hướng xử lý. Kết thúc khi có phương án và flow V1. Output: phương án báo cáo + flow đối soát."),

    ...COURSE_DATES.flatMap((date) => courseDaySlots(date, C, catalog)),

    ...WEEKDAY_DATES.map((date) =>
      slot(date, "18:30", "19:00", puttingTitle(), G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttingNote()),
    ),

    slot("2026-08-03", "20:00", "21:00", "Trông con làm Toán và tiếng Việt", F, "family_evening", catalog.expeditionChildStudy ?? catalog.expeditionFamily, undefined, "Mở bài cần học, trông con hoàn thành Toán và tiếng Việt. Kết thúc khi bài xong và sách vở ngày mai đã soạn."),
    slot("2026-08-04", "20:00", "21:00", "Chuẩn bị bài Cambridge cùng con", F, "family_evening", catalog.expeditionChildStudy ?? catalog.expeditionFamily, undefined, "Mở bài Cambridge, cùng con đọc yêu cầu và chuẩn bị phần cần làm. Kết thúc khi cặp và tài liệu đã sẵn sàng."),
    slot("2026-08-05", "20:00", "21:00", "Đọc sách nhẹ cùng con", F, "family_evening", catalog.expeditionChildStudy ?? catalog.expeditionFamily, undefined, "Giữ nhịp tối nhẹ bằng đọc sách cùng con. Kết thúc khi con đã đọc xong phần tối thiểu và sẵn sàng nghỉ."),
    slot("2026-08-05", "21:00", "21:20", "Trứng ngâm tương", F, "family_fixed", catalog.expeditionFamily, undefined, soyEggNote()),
    slot("2026-08-06", "20:00", "21:00", "Đưa vợ đi massage", F, "family_fixed", catalog.expeditionFamily, undefined, "Kiểm tra lịch hẹn và tuyến đường, chuẩn bị di chuyển rồi đưa vợ đến nơi massage. Kết thúc khi giờ đón về đã được thống nhất."),
    slot("2026-08-07", "20:00", "21:00", "Nghỉ cùng gia đình", F, "family_evening", catalog.expeditionFamily, undefined, "Giữ buổi tối nhẹ, hồi phục sau tuần học và làm việc. Kết thúc khi các việc gia đình còn mở đã được chốt."),
    slot("2026-08-07", "21:00", "21:30", "Waymark Planning", F, "waymark_planning", catalog.expeditionWaymark, catalog.milestoneWaymark, "Rà tuần, chốt carryover, kiểm tra các mark đã route đúng Workout/Golf và chuẩn bị tuần tiếp theo. Đây là Planned Mark review/operational, không tính Focus Block."),
    slot("2026-08-08", "20:00", "21:00", "Chuẩn bị đồ golf EPGA", F, "family_evening", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Kiểm tra gậy, bóng, quần áo, mũ, nước và giờ xuất phát. Kết thúc khi toàn bộ đồ golf đã được đặt sẵn cho sáng hôm sau."),
    slot("2026-08-09", "20:00", "21:00", "Chuẩn bị bài Thứ 2", F, "family_evening", catalog.expeditionChildStudy ?? catalog.expeditionFamily, undefined, "Chuẩn bị bài Toán và tiếng Việt cho thứ 2. Kết thúc khi sách vở và yêu cầu học đã rõ."),
    slot("2026-08-09", "21:00", "21:20", "Trứng ngâm tương", F, "family_fixed", catalog.expeditionFamily, undefined, soyEggNote()),

    slot("2026-08-08", "08:00", "09:30", "Chơi ở nhà, chuẩn bị đi VCCA", F, "family_weekend_morning", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Chơi nhẹ ở nhà cùng con và chuẩn bị đồ đi VCCA. Kết thúc khi cả nhà sẵn sàng rời nhà."),
    slot("2026-08-08", "09:45", "11:15", "Tham quan Festival Mỹ thuật Trẻ tại VCCA", F, "family_weekend_morning", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Tham quan Festival Mỹ thuật Trẻ tại VCCA, cùng con chọn ba tác phẩm đáng nhớ. Kết thúc khi mỗi người đã chia sẻ một nhận xét."),
    slot("2026-08-08", "13:30", "15:00", "Nghỉ trưa tại nhà", F, "family_weekend_afternoon", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Nghỉ trưa và phục hồi tại nhà sau buổi VCCA. Kết thúc khi cả nhà sẵn sàng cho block chiều."),
    slot("2026-08-08", "15:15", "16:45", "Chơi LEGO cùng con ở nhà", F, "family_weekend_afternoon", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Chơi LEGO cùng con, ưu tiên cùng xây một mô hình nhỏ và chụp ảnh lưu memory. Kết thúc khi đồ chơi được dọn gọn."),
    slot("2026-08-08", "17:00", "18:30", "Chuẩn bị bữa tối cùng gia đình", F, "family_weekend_recap", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Chuẩn bị bữa tối cùng gia đình và kể lại điểm vui trong ngày. Kết thúc khi memory chính đã được ghi lại."),

    slot("2026-08-09", "08:00", "09:30", "EPGA golf — buổi sáng 1", F, "family_epga", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Giữ lịch EPGA buổi sáng. Không xếp thêm BIDV, SNAG hoặc Waymark vào block này."),
    slot("2026-08-09", "09:45", "11:15", "EPGA golf — buổi sáng 2", F, "family_epga", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Tiếp tục hỗ trợ EPGA buổi sáng. Kết thúc khi có một note kỹ thuật hoặc thái độ của con."),
    slot("2026-08-09", "13:30", "15:00", "EPGA golf — buổi chiều 1", F, "family_epga", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Giữ lịch EPGA buổi chiều. Không xếp thêm BIDV, SNAG hoặc Waymark vào block này."),
    slot("2026-08-09", "15:15", "16:45", "EPGA golf — buổi chiều 2", F, "family_epga", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Tiếp tục hỗ trợ EPGA buổi chiều. Kết thúc khi con về nhà an toàn và có thời gian phục hồi."),
    slot("2026-08-09", "17:00", "18:30", "Nghỉ và chuẩn bị tuần mới", F, "family_recovery", catalog.expeditionFamily, undefined, "Hồi phục sau EPGA và chuẩn bị tuần mới. Kết thúc khi các việc chuẩn bị tối thiểu đã xong."),
  ];
}

const WEEKLY_MARK_SIGNALS: WeeklyMarkSignalInput[] = [
  ...WEEK_DATES.map((localDate) => markSignal(localDate, "05:30", "Weight In", "weight")),
  markSignal("2026-08-03", "05:35", "Workout A1", "workout"),
  markSignal("2026-08-04", "05:35", "Workout B", "workout"),
  markSignal("2026-08-05", "05:35", "Workout Walk", "workout"),
  markSignal("2026-08-06", "05:35", "Workout A2", "workout"),
  markSignal("2026-08-07", "05:35", "Workout B", "workout"),
  markSignal("2026-08-03", "11:30", chippingTitle("3 m", "1.2 m"), "golf_swing"),
  markSignal("2026-08-04", "11:30", chippingTitle("3 m", "1.2 m"), "golf_swing"),
  markSignal("2026-08-05", "11:30", chippingTitle("5 m", "2.0 m"), "golf_swing"),
  markSignal("2026-08-06", "11:30", chippingTitle("5 m", "2.0 m"), "golf_swing"),
  markSignal("2026-08-07", "11:30", chippingTitle("7 m", "2.8 m"), "golf_swing"),
  markSignal("2026-08-08", "05:35", chippingTitle("7 m", "2.8 m"), "golf_swing"),
  markSignal("2026-08-09", "05:35", chippingTitle("3 m", "1.2 m"), "golf_swing"),
  ...WEEKDAY_DATES.map((localDate) => markSignal(localDate, "18:00", puttingTitle(), "golf_putt")),
  markSignal("2026-08-08", "06:05", puttingTitle(), "golf_putt"),
  markSignal("2026-08-09", "06:05", puttingTitle(), "golf_putt"),
  markSignal("2026-08-06", "19:30", "Đưa vợ đi massage", "family_fixed"),
  markSignal("2026-08-08", "07:30", "Mua hoa tặng vợ", "family_fixed"),
  markSignal("2026-08-05", "21:00", "Trứng ngâm tương", "family_fixed"),
  markSignal("2026-08-09", "21:00", "Trứng ngâm tương", "family_fixed"),
];

const WEEKLY_SIGNAL_PACKS: WeeklySignalPackInput[] = [
  ...WEEK_DATES.map((localDate) => signalPack(localDate, "07:10", "style.daily-grooming-presence-check")),
  ...WEEK_DATES.map((localDate) => signalPack(localDate, "07:30", "family.before-leaving-home-check")),
  ...WEEK_DATES.map((localDate) => signalPack(localDate, "21:30", "family.home-shutdown-check")),
  signalPack("2026-08-03", "21:45", "family.home-shutdown-check"),
  signalPack("2026-08-04", "21:45", "family.home-shutdown-check"),
  signalPack("2026-08-05", "21:45", "family.home-shutdown-check"),
  signalPack("2026-08-06", "21:45", "family.home-shutdown-check"),
  signalPack("2026-08-07", "21:45", "family.weekend-around-hanoi-readiness-check"),
  signalPack("2026-08-08", "21:45", "golf.golf-outing-readiness-check"),
  signalPack("2026-08-09", "21:45", "family.home-shutdown-check"),
];

export async function importWeeklyTimetable20260803To0809(
  services: ImportServices,
  userId: string,
  timezone: string,
): Promise<WeeklyTimetable20260803ImportReport> {
  const repos = services.repositories;
  const catalog = await resolveWeeklyCatalogIds(repos, userId);
  await repairAuthoritativeWorkoutRoutines({ repositories: repos, userId }, WAYMARK_MAP_CONFIG, GOLF_AUTHORITATIVE_WORKOUT_ROUTINE_REPAIR_SEED_IDS);
  await ensurePostWorkoutRoutineTemplate(repos, userId, catalog.pathFamily, catalog.expeditionFamily);
  const items = buildWeeklyTimetable20260803To0809(catalog);
  const report = await importWeeklyTimetable(repos, {
    userId,
    weekStartDate: "2026-08-03",
    weekEndDate: "2026-08-09",
    note: "Imported from approved weekly plan 2026-08-03 to 2026-08-09. Keeps every Focus Block at 90 minutes, splits each n8n block into a separate mark, and uses canonical Workout/Golf titles for direct session routing.",
    importBatchId: "weekly_timetable_2026_08_03_2026_08_09_v1",
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

function workoutSlot(
  localDate: string,
  title: "Workout A1" | "Workout B" | "Workout Walk" | "Workout A2",
  templateRef: "Workout A1" | "Workout B" | "Workout Walk" | "Workout A2",
  pathHealth: string,
  catalog: WeeklyCatalogIds,
) {
  return slot(
    localDate,
    "05:35",
    "07:00",
    title,
    pathHealth,
    "workout",
    catalog.expeditionCutTo70,
    catalog.milestoneCutTo70,
    `Mở Health Engine, thực hiện đúng session ${title} và hoàn thành cooldown. Kết thúc khi đủ bài, mức nặng và cảm nhận sau tập.`,
    false,
    templateRef,
  );
}

function courseDaySlots(localDate: string, pathCareer: string, catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
  return [
    courseSlot(localDate, "08:00", "09:30", "Học AI n8n — Block 1", pathCareer, catalog, "Theo sát bài giảng đầu ngày, ghi note các khái niệm chính và mở môi trường thực hành. Output: note học + checklist cần hỏi."),
    courseSlot(localDate, "09:45", "11:15", "Học AI n8n — Block 2", pathCareer, catalog, "Thực hành workflow theo bài học, ghi lại lỗi và cách xử lý. Output: workflow đang chạy hoặc lỗi đã cô lập."),
    courseSlot(localDate, "13:30", "15:00", "Học AI n8n — Block 3", pathCareer, catalog, "Tiếp tục bài thực hành, chuẩn hóa node, credential và data mapping. Output: workflow mở lại được."),
    courseSlot(localDate, "15:15", "16:45", "Học AI n8n — Block 4", pathCareer, catalog, "Hoàn tất phần học trong ngày, ghi bài học chính và bước cần thử lại. Output: note ngày học + workflow."),
    slot(localDate, "17:00", "18:30", "Supervising + Daily DCH + tổng hợp n8n", pathCareer, "supervising_pm", catalog.expeditionDch, undefined, "Kiểm tra các kênh BIDV, hoàn thành Daily DCH rồi chuẩn hóa note và flow n8n trong ngày. Kết thúc khi blocker và tài liệu học đã được lưu. Output: blocker list + note n8n."),
  ];
}

function courseSlot(localDate: string, startTime: string, endTime: string, title: string, pathCareer: string, catalog: WeeklyCatalogIds, note: string) {
  return slot(localDate, startTime, endTime, title, pathCareer, "n8n_course", catalog.expeditionSch, undefined, note);
}

function weekdayChippingForDate(localDate: string) {
  if (localDate === "2026-08-03" || localDate === "2026-08-04") {
    return { title: chippingTitle("3 m", "1.2 m"), note: chippingNote("3 m", "1.2 m") };
  }
  if (localDate === "2026-08-05" || localDate === "2026-08-06") {
    return { title: chippingTitle("5 m", "2.0 m"), note: chippingNote("5 m", "2.0 m") };
  }
  return { title: chippingTitle("7 m", "2.8 m"), note: chippingNote("7 m", "2.8 m") };
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

async function ensurePackCheckInstanceForSignal(repos: WaymarkRepositories, userId: string, input: WeeklySignalPackInput) {
  const templateId = await resolveSeedEntityId(repos, userId, "pack_check_template", input.sourceSeedId);
  const template = await repos.packChecks.getTemplateById(templateId);
  if (!template) {
    throw new Error(`Missing pack check template for source "${input.sourceSeedId}".`);
  }

  const generationKey = `weekly_signal_pack:2026-08-03:${template.id}:${input.localDate}:${input.time}`;
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
  const pathFamily = await resolveSeedEntityId(repos, userId, "path", "family");
  const pathHealth = await resolveSeedEntityId(repos, userId, "path", "health");
  const pathGolf = await resolveSeedEntityId(repos, userId, "path", "golf");

  return {
    pathCareer,
    pathFamily,
    pathHealth,
    pathGolf,
    expeditionSch: await resolveSeedEntityIdOptional(repos, userId, "expedition", "career.sch.expedition.smart-counter-hub-project"),
    expeditionDch: await findExistingExpeditionIdByTitle(repos, pathCareer, "DCH Deposit Core Hub"),
    expeditionCutTo70: await resolveSeedEntityIdOptional(repos, userId, "expedition", "health.cut70.expedition"),
    expeditionGolf: await resolveSeedEntityIdOptional(repos, userId, "expedition", "golf.beginning.expedition"),
    expeditionWaymark: await resolveSeedEntityIdOptional(repos, userId, "expedition", "family.waymark.expedition"),
    expeditionFamily: await resolveSeedEntityIdOptional(repos, userId, "expedition", "family.rhythm.expedition"),
    expeditionChildStudy: await resolveSeedEntityIdOptional(repos, userId, "expedition", "family.english.expedition"),
    expeditionWeekend: await resolveSeedEntityIdOptional(repos, userId, "expedition", "family.weekend.expedition"),
    milestoneSchAutoQlsd: await resolveSeedEntityIdOptional(repos, userId, "milestone", "career.sch.milestone.2026-08.auto-qlsd-form"),
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
      POST_WORKOUT_ROUTINE_TEMPLATE_TITLE,
    ),
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
