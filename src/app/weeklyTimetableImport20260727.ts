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

export type WeeklyTimetable20260727ImportReport = WeeklyTimetableImportReport & {
  packChecks: PackCheckInstance[];
  signals: Signal[];
  hierarchyLinks: ExistingHierarchyLinkReport;
};

const WEEK_DATES = [
  "2026-07-27",
  "2026-07-28",
  "2026-07-29",
  "2026-07-30",
  "2026-07-31",
  "2026-08-01",
  "2026-08-02",
] as const;

const WEEKDAY_DATES = WEEK_DATES.slice(0, 5);
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

export function buildWeeklyTimetable20260727To0802(catalog: WeeklyCatalogIds): WeeklyTimetableImportSlotInput[] {
  const C = catalog.pathCareer;
  const S = catalog.pathSnag;
  const F = catalog.pathFamily;
  const H = catalog.pathHealth;
  const G = catalog.pathGolf;

  return [
    ...WEEK_DATES.map((date) =>
      slot(date, "05:30", "05:35", "Weight In", H, "weight", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Cân ngay sau khi thức dậy, trước ăn uống và vận động. Mark Detail để trống hoặc ghi giá trị thực tế khi thực hiện; không ghi đè cân nặng đã nhập."),
    ),

    slot("2026-07-27", "05:35", "07:00", "Workout Day A", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, thực hiện đúng session Day A và cooldown. Kết thúc khi đã ghi đủ bài tập, mức nặng và cảm nhận."),
    slot("2026-07-28", "05:35", "07:00", "Workout Day B", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, thực hiện đúng session Day B và cooldown. Kết thúc khi đã ghi đủ bài tập, mức nặng và cảm nhận."),
    slot("2026-07-29", "05:35", "07:00", "Workout Walk", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở phiên Walk, đi đủ thời lượng theo Health Engine và duy trì nhịp ổn định. Kết thúc khi quãng đường và cảm nhận được ghi lại."),
    slot("2026-07-30", "05:35", "07:00", "Workout Day A", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, thực hiện đúng session Day A và cooldown. Kết thúc khi đã ghi đủ bài tập, mức nặng và cảm nhận."),
    slot("2026-07-31", "05:35", "07:00", "Workout Day B", H, "workout", catalog.expeditionCutTo70, catalog.milestoneCutTo70, "Mở Health Engine, thực hiện đúng session Day B và cooldown. Kết thúc khi đã ghi đủ bài tập, mức nặng và cảm nhận."),

    ...WEEK_DATES.map((date) => postWorkoutRoutineSlot(date, F, catalog.expeditionFamily)),

    slot("2026-07-27", "08:00", "09:30", "Brainstorm pipeline tăng view website", S, "snag_content", undefined, undefined, "Rà nguồn traffic Facebook, Zalo và Google, xác định cách kéo người đọc vào website. Kết thúc khi có pipeline gồm nguồn, nội dung và CTA. Output: sơ đồ pipeline traffic."),
    slot("2026-07-28", "08:00", "09:30", "Tạo prompt mark đăng bài hàng tuần", S, "snag_content", undefined, undefined, "Viết prompt sinh các mark nghiên cứu, viết, duyệt và đăng bài theo nhịp tuần. Kết thúc khi prompt có thể tái sử dụng với chủ đề mới. Output: prompt dùng lại hằng tuần."),
    slot("2026-07-29", "08:00", "09:30", "Viết bài website SNAG #1", S, "snag_content", undefined, undefined, "Chọn chủ đề ưu tiên từ pipeline, viết bài hoàn chỉnh với tiêu đề, nội dung, keyword và CTA. Kết thúc khi bài có thể đăng. Output: bài website hoàn chỉnh."),
    slot("2026-07-30", "08:00", "09:30", "Viết bài website SNAG #2", S, "snag_content", undefined, undefined, "Viết bài thứ hai dựa trên nhu cầu khách hàng, liên kết với bài trước và thêm CTA phù hợp. Kết thúc khi bài sẵn sàng đăng. Output: bài website hoàn chỉnh."),
    slot("2026-07-31", "08:00", "09:30", "Viết bài website SNAG #3", S, "snag_content", undefined, undefined, "Hoàn thiện bài thứ ba trong cụm nội dung, bổ sung internal link và CTA. Kết thúc khi cả cụm ba bài có luồng đọc rõ. Output: bài thứ ba và cụm internal link."),

    ...WEEKDAY_DATES.map((date) =>
      slot(date, "09:45", "11:15", "Supervising BIDV buổi sáng", C, "supervising_am", catalog.expeditionSch, undefined, "Kiểm tra Zalo, mail, Confluence và Jira; xử lý việc dưới 5 phút, ghi lại việc cần Focus Block và người đang chờ phản hồi."),
    ),

    slot("2026-07-27", "12:00", "12:30", chippingTitle("3 m", "1.2 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("3 m", "1.2 m")),
    slot("2026-07-28", "12:00", "12:30", chippingTitle("3 m", "1.2 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("3 m", "1.2 m")),
    slot("2026-07-29", "12:00", "12:30", chippingTitle("5 m", "2.0 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("5 m", "2.0 m")),
    slot("2026-07-30", "12:00", "12:30", chippingTitle("5 m", "2.0 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("5 m", "2.0 m")),
    slot("2026-07-31", "12:00", "12:30", chippingTitle("7 m", "2.8 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("7 m", "2.8 m")),

    slot("2026-07-27", "13:30", "15:00", "Viết RSD luồng ghi nợ GL", C, "bidv_focus", catalog.expeditionSch, undefined, "Mở RSD hiện tại, viết input, validate, API, hạch toán và trạng thái ghi nợ GL. Kết thúc khi section sẵn sàng review. Output: section ghi nợ GL."),
    slot("2026-07-27", "17:00", "18:30", "Viết RSD luồng ghi có GL", C, "bidv_focus", catalog.expeditionSch, undefined, "Viết mapping, sequence, trạng thái và xử lý lỗi ghi có GL. Kết thúc khi section đủ điều kiện gửi review. Output: section ghi có GL."),
    slot("2026-07-28", "13:30", "15:00", "Viết RSD tiền mặt — khởi tạo", C, "bidv_focus", catalog.expeditionDch, undefined, "Viết luồng từ nhập giao dịch đến lưu nháp và đẩy duyệt. Kết thúc khi có flow, rule và Acceptance Criteria. Output: flow khởi tạo."),
    slot("2026-07-28", "17:00", "18:30", "Viết RSD tiền mặt — chi tiết", C, "bidv_focus", catalog.expeditionDch, undefined, "Viết màn chi tiết, mapping dữ liệu, nút thao tác và trạng thái. Kết thúc khi UI rule và mapping sẵn sàng review. Output: UI rule và mapping."),
    slot("2026-07-29", "13:30", "15:00", "Viết RSD tiền mặt — phê duyệt", C, "bidv_focus", catalog.expeditionDch, undefined, "Viết sequence duyệt, retry, timeout, override và chuyển trạng thái. Kết thúc khi có sequence và bảng trạng thái. Output: sequence phê duyệt."),
    slot("2026-07-29", "17:00", "18:30", "Viết RSD liên ngân hàng — tạo", C, "bidv_focus", catalog.expeditionSch, undefined, "Viết luồng khởi tạo, validate, phí và dữ liệu gửi hệ thống liên ngân hàng. Kết thúc khi có flow và mapping chính. Output: flow khởi tạo LNH."),
    slot("2026-07-30", "13:30", "15:00", "Viết RSD liên ngân hàng — duyệt", C, "bidv_focus", catalog.expeditionSch, undefined, "Hoàn thiện luồng duyệt, trạng thái, xử lý lỗi và bằng chứng hạch toán. Kết thúc khi section sẵn sàng transfer. Output: luồng duyệt LNH."),

    ...WEEKDAY_DATES.map((date) =>
      slot(date, "15:15", "16:45", "Daily DCH và supervising", C, "supervising_pm", catalog.expeditionDch, undefined, "Thực hiện Daily DCH, kiểm tra Zalo, mail, Confluence và Jira. Kết thúc khi blocker, owner và việc cần Focus Block đã được ghi lại."),
    ),

    slot("2026-07-30", "17:00", "18:30", "Book lịch Transfer SCH–DCH", C, "bidv_meeting", catalog.expeditionSch, undefined, "Chốt người tham gia, phạm vi tính năng, agenda, câu hỏi và link tài liệu; gửi invitation. Kết thúc khi lịch đã vào calendar. Output: invitation Transfer."),
    slot("2026-07-31", "13:30", "15:00", "Book họp PMH và chốt agenda", C, "bidv_meeting", catalog.expeditionSch, undefined, "Chốt mục tiêu, thành phần, nội dung cần quyết định và tài liệu đọc trước; gửi lịch họp PMH. Output: invitation PMH."),
    slot("2026-07-31", "17:00", "18:30", "Waymark Planning", F, "waymark_planning", catalog.expeditionWaymark, catalog.milestoneWaymark, "Rà tuần, chốt carryover, thiết lập chu kỳ xuất bản nội dung và chuẩn bị tuần tiếp theo. Output: kế hoạch tuần tiếp theo."),

    ...["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31"].map((date) =>
      slot(date, "18:30", "19:00", puttingTitle(), G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttingNote()),
    ),

    slot("2026-07-27", "20:00", "21:00", "Trông con học Toán + tiếng Việt", F, "family_evening", catalog.expeditionChildStudy ?? catalog.expeditionFamily, undefined, "Mở bài cần học, trông con hoàn thành Toán và tiếng Việt. Kết thúc khi bài xong và sách vở ngày mai đã soạn."),
    slot("2026-07-28", "20:00", "21:00", "Chuẩn bị bài Cambridge", F, "family_evening", catalog.expeditionChildStudy ?? catalog.expeditionFamily, undefined, "Mở bài Cambridge, cùng con đọc yêu cầu và chuẩn bị phần cần làm. Kết thúc khi cặp và tài liệu đã sẵn sàng."),
    slot("2026-07-29", "20:00", "21:00", "Đọc sách nhẹ cùng con", F, "family_evening", catalog.expeditionChildStudy ?? catalog.expeditionFamily, undefined, "Giữ nhịp tối nhẹ bằng đọc sách cùng con. Kết thúc khi con đã đọc xong phần tối thiểu và sẵn sàng nghỉ."),
    slot("2026-07-29", "21:00", "21:20", "Chuẩn bị trứng ngâm tương 3 ngày", F, "family_fixed", catalog.expeditionFamily, undefined, soyEggNote()),
    slot("2026-07-30", "20:00", "21:00", "Đưa vợ đi massage thứ 5", F, "family_fixed", catalog.expeditionFamily, undefined, "Kiểm tra lịch hẹn và tuyến đường, chuẩn bị di chuyển rồi đưa vợ đến nơi massage. Kết thúc khi giờ đón về đã được thống nhất."),
    slot("2026-07-31", "20:00", "21:00", "Family recovery", F, "family_evening", catalog.expeditionFamily, undefined, "Giữ buổi tối nhẹ, hồi phục sau tuần làm việc và chốt việc gia đình còn mở."),

    slot("2026-08-01", "05:35", "06:05", chippingTitle("7 m", "2.8 m"), G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, chippingNote("7 m", "2.8 m")),
    slot("2026-08-01", "06:05", "06:35", puttingTitle(), G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttingNote()),
    slot("2026-08-01", "07:30", "08:00", "Mua hoa tặng vợ sáng thứ 7", F, "family_fixed", catalog.expeditionFamily, undefined, "Ghé điểm bán hoa đã chọn, mua một bó phù hợp và mang về tặng vợ trước SNAG Golf League. Kết thúc khi hoa đã được trao.", true),
    slot("2026-08-01", "08:00", "11:30", "SNAG Golf League", G, "golf_event", catalog.expeditionGolf, catalog.milestoneGolf, "Tham gia giải đấu SNAG, áp dụng kỹ thuật chipping thực tế và ghi nhận kết quả. Đây là hoạt động golf thực tế được chọn cho cuối tuần."),
    slot("2026-08-01", "13:30", "16:45", "Lái xe cùng con tại phố đi bộ", F, "family_weekend_afternoon", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Đưa con trải nghiệm lái xe, tạo memory gia đình và chụp ảnh lưu giữ. Nếu trời mưa, ưu tiên phương án linh hoạt cùng khung giờ."),
    slot("2026-08-01", "17:00", "18:30", "Chọn ảnh và kể lại trải nghiệm ngày", F, "family_weekend_recap", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Chọn ảnh đẹp trong ngày, cùng con kể lại trải nghiệm SNAG Golf League và phố đi bộ. Kết thúc khi memory chính đã được ghi lại."),
    slot("2026-08-01", "20:00", "21:00", "Chuẩn bị đồ golf EPGA ngày mai", F, "family_evening", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Kiểm tra gậy, bóng, quần áo, mũ, nước và giờ xuất phát. Kết thúc khi toàn bộ đồ golf đã được đặt sẵn cho sáng hôm sau."),

    slot("2026-08-02", "05:35", "06:05", "Chipping 3-5-7 m · Land inside each zone · Hit Flagsticky", G, "golf_swing", catalog.expeditionGolf, catalog.milestoneGolf, "Chipping test 3-5-7 m. Set plan: 6 sets x 4 reps = 24 chips. Round 1: 3 m x4, 5 m x4, 7 m x4. Round 2 repeats the same order. Hit chỉ tính khi bóng land inside đúng zone rồi chạm Flagsticky. Ghi Hit/Miss, không ghi điểm phụ và không đánh bù miss."),
    slot("2026-08-02", "06:05", "06:35", puttingTitle(), G, "golf_putt", catalog.expeditionGolf, catalog.milestoneGolf, puttingNote()),
    slot("2026-08-02", "08:00", "11:15", "EPGA golf — buổi sáng", F, "family_epga", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Giữ lịch EPGA buổi sáng. Không xếp thêm BIDV, SNAG hoặc Waymark vào Chủ nhật."),
    slot("2026-08-02", "13:30", "16:45", "EPGA golf — buổi chiều", F, "family_epga", catalog.expeditionWeekend ?? catalog.expeditionFamily, undefined, "Giữ lịch EPGA buổi chiều. Không xếp thêm BIDV, SNAG hoặc Waymark vào Chủ nhật."),
    slot("2026-08-02", "17:00", "18:30", "Nghỉ và sắp đồ cho tuần mới", F, "family_recovery", catalog.expeditionFamily, undefined, "Hồi phục sau EPGA và sắp đồ cho tuần mới. Kết thúc khi các việc chuẩn bị tối thiểu đã xong."),
    slot("2026-08-02", "20:00", "21:00", "Chuẩn bị bài Thứ 2", F, "family_evening", catalog.expeditionChildStudy ?? catalog.expeditionFamily, undefined, "Chuẩn bị bài Toán và tiếng Việt cho thứ 2. Kết thúc khi sách vở và yêu cầu học đã rõ."),
    slot("2026-08-02", "21:00", "21:20", "Chuẩn bị trứng ngâm tương 3 ngày", F, "family_fixed", catalog.expeditionFamily, undefined, soyEggNote()),

  ];
}

const WEEKLY_MARK_SIGNALS: WeeklyMarkSignalInput[] = [
  ...WEEK_DATES.map((localDate) => markSignal(localDate, "05:30", "Weight In", "weight")),
  markSignal("2026-07-27", "05:35", "Workout Day A", "workout"),
  markSignal("2026-07-28", "05:35", "Workout Day B", "workout"),
  markSignal("2026-07-29", "05:35", "Workout Walk", "workout"),
  markSignal("2026-07-30", "05:35", "Workout Day A", "workout"),
  markSignal("2026-07-31", "05:35", "Workout Day B", "workout"),
  markSignal("2026-07-27", "11:30", chippingTitle("3 m", "1.2 m"), "golf_swing"),
  markSignal("2026-07-28", "11:30", chippingTitle("3 m", "1.2 m"), "golf_swing"),
  markSignal("2026-07-29", "11:30", chippingTitle("5 m", "2.0 m"), "golf_swing"),
  markSignal("2026-07-30", "11:30", chippingTitle("5 m", "2.0 m"), "golf_swing"),
  markSignal("2026-07-31", "11:30", chippingTitle("7 m", "2.8 m"), "golf_swing"),
  markSignal("2026-08-01", "05:35", chippingTitle("7 m", "2.8 m"), "golf_swing"),
  markSignal("2026-08-02", "05:35", "Chipping 3-5-7 m · Land inside each zone · Hit Flagsticky", "golf_swing"),
  ...["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31"].map((localDate) => markSignal(localDate, "18:00", puttingTitle(), "golf_putt")),
  markSignal("2026-08-01", "06:05", puttingTitle(), "golf_putt"),
  markSignal("2026-08-02", "06:05", puttingTitle(), "golf_putt"),
  markSignal("2026-07-30", "19:30", "Đưa vợ đi massage thứ 5", "family_fixed"),
  markSignal("2026-08-01", "07:30", "Mua hoa tặng vợ sáng thứ 7", "family_fixed"),
  markSignal("2026-07-29", "21:00", "Chuẩn bị trứng ngâm tương 3 ngày", "family_fixed"),
  markSignal("2026-08-02", "21:00", "Chuẩn bị trứng ngâm tương 3 ngày", "family_fixed"),
];

const WEEKLY_SIGNAL_PACKS: WeeklySignalPackInput[] = [
  ...WEEK_DATES.map((localDate) => signalPack(localDate, "07:10", "style.daily-grooming-presence-check")),
  ...WEEK_DATES.map((localDate) => signalPack(localDate, "07:30", "family.before-leaving-home-check")),
  ...WEEK_DATES.map((localDate) => signalPack(localDate, "21:30", "family.home-shutdown-check")),
  signalPack("2026-07-27", "21:45", "family.home-shutdown-check"),
  signalPack("2026-07-28", "21:45", "family.home-shutdown-check"),
  signalPack("2026-07-29", "21:45", "family.home-shutdown-check"),
  signalPack("2026-07-30", "21:45", "family.home-shutdown-check"),
  signalPack("2026-07-31", "21:45", "family.weekend-around-hanoi-readiness-check"),
  signalPack("2026-08-01", "21:45", "golf.golf-outing-readiness-check"),
  signalPack("2026-08-02", "21:45", "family.home-shutdown-check"),
];

export async function importWeeklyTimetable20260727To0802(
  services: ImportServices,
  userId: string,
  timezone: string,
): Promise<WeeklyTimetable20260727ImportReport> {
  const repos = services.repositories;
  const catalog = await resolveWeeklyCatalogIds(repos, userId);
  await ensurePostWorkoutRoutineTemplate(repos, userId, catalog.pathFamily, catalog.expeditionFamily);
  const items = buildWeeklyTimetable20260727To0802(catalog);
  const report = await importWeeklyTimetable(repos, {
    userId,
    weekStartDate: "2026-07-27",
    weekEndDate: "2026-08-02",
    note: "Imported from approved data-only weekly plan 2026-07-27 to 2026-08-02. Uses scheduled date/time, no dueAt, no hierarchy creation, and direct mark/pack-check signals.",
    importBatchId: "weekly_timetable_2026_07_27_2026_08_02_data_only_v1",
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

  const generationKey = `weekly_signal_pack:2026-07-27:${template.id}:${input.localDate}:${input.time}`;
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

  return {
    pathCareer,
    pathSnag,
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


