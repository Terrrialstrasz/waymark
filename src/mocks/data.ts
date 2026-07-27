import { ExpeditionState, FeatureState, JournalItemKind, Locale, PathId, PathPulse, PlannedMarkState } from "../types/ui";

export type PathCardModel = {
  id: PathId;
  title: Record<Locale, string>;
  note: Record<Locale, string>;
  weeklyCount: number;
  recentMark: Record<Locale, string>;
  pulse: PathPulse;
  gate?: FeatureState;
};

export type MarkCardModel = {
  title: Record<Locale, string>;
  note: Record<Locale, string>;
  pathLabel: Record<Locale, string>;
  timeLabel: Record<Locale, string>;
  state: PlannedMarkState | "private_sensitive";
  memoryLinked?: boolean;
  expeditionLinked?: boolean;
  masked?: boolean;
  gate?: FeatureState;
};

export type PlannedMarkModel = {
  title: Record<Locale, string>;
  intention: Record<Locale, string>;
  windowLabel: Record<Locale, string>;
  pathLabel: Record<Locale, string>;
  state: PlannedMarkState;
  gate?: FeatureState;
};

export type PackCheckItemModel = {
  id: string;
  label: Record<Locale, string>;
  checked: boolean;
  skipped?: boolean;
};

export type PackCheckModel = {
  title: Record<Locale, string>;
  summary: Record<Locale, string>;
  items: PackCheckItemModel[];
  state: "partial" | "done" | "hidden";
  gate?: FeatureState;
};

export type ExpeditionModel = {
  title: Record<Locale, string>;
  summary: Record<Locale, string>;
  pathLabel: Record<Locale, string>;
  progress: number;
  milestoneLabel: Record<Locale, string>;
  state: ExpeditionState;
  gate?: FeatureState;
};

export type MemoryModel = {
  title: Record<Locale, string>;
  caption: Record<Locale, string>;
  pathLabels: Record<Locale, string[]>;
  dateLabel: Record<Locale, string>;
  hasPhoto?: boolean;
  masked?: boolean;
  gate?: FeatureState;
};

export type JournalItemModel = {
  kind: JournalItemKind;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  meta: Record<Locale, string>;
  state?: "done" | "private_sensitive";
  gate?: FeatureState;
};

export type WorkoutModel = {
  title: Record<Locale, string>;
  summary: Record<Locale, string>;
  progressLabel: Record<Locale, string>;
  state:
    | "workout_a_ready"
    | "walk_ready"
    | "workout_b_ready"
    | "in_progress"
    | "completed"
    | "partial"
    | "not_ready";
  gate?: FeatureState;
};

export type ExerciseStepModel = {
  title: Record<Locale, string>;
  target: Record<Locale, string>;
  actual: Record<Locale, string>;
  state: "upcoming" | "active" | "done" | "skipped";
};

export type CaptureOptionModel = {
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  icon: string;
  gate?: FeatureState;
};

export type BacklogItemModel = {
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  typeLabel: Record<Locale, string>;
  horizonLabel: Record<Locale, string>;
  state: "planned" | "upcoming" | "archived";
  gate?: FeatureState;
};

export type WeeklyReportModel = {
  title: Record<Locale, string>;
  summary: Record<Locale, string>;
  pathBalance: Record<Locale, string>;
  completionLabel: Record<Locale, string>;
  gate?: FeatureState;
};

export const pathCards: PathCardModel[] = [
  {
    id: "family",
    title: { en: "Family & Home", vi: "Gia đình & tổ ấm" },
    note: {
      en: "A calm path should still feel touched today.",
      vi: "Một lối sống yên ấm vẫn cần được chạm tới hôm nay bằng hành động thật.",
    },
    weeklyCount: 4,
    recentMark: { en: "School pickup and dinner together", vi: "Đón con đi học và ăn tối cùng nhau" },
    pulse: "protected",
  },
  {
    id: "career",
    title: { en: "Career Craft", vi: "Sự nghiệp & tay nghề" },
    note: {
      en: "Steady skill, less noise, one useful proof at a time.",
      vi: "Tay nghề đi đều, bớt ồn ào, mỗi ngày để lại một bằng chứng hữu ích.",
    },
    weeklyCount: 6,
    recentMark: { en: "Client follow-up note shipped", vi: "Đã gửi ghi chú theo dõi khách hàng" },
    pulse: "alive",
  },
  {
    id: "culture",
    title: { en: "Culture, Class & Romance", vi: "Văn hoá, khí chất & sự lãng mạn" },
    note: {
      en: "This path should feel lived, not theoretical.",
      vi: "Con đường này phải được sống thật, không chỉ là ý niệm đẹp để đó.",
    },
    weeklyCount: 2,
    recentMark: { en: "Bought flowers and read poetry aloud", vi: "Mua hoa và đọc thơ thành tiếng trong buổi tối yên" },
    pulse: "growing",
  },
];

export const markCards: MarkCardModel[] = [
  {
    title: { en: "Walked 25 quiet minutes after lunch", vi: "Đi bộ yên tĩnh 25 phút sau bữa trưa" },
    note: {
      en: "No podcast, just attention back in the body.",
      vi: "Không bật podcast, chỉ kéo sự chú ý trở về thân thể và nhịp thở thật đều.",
    },
    pathLabel: { en: "Health & Body", vi: "Sức khoẻ & cơ thể" },
    timeLabel: { en: "12:40 PM", vi: "12:40" },
    state: "done",
  },
  {
    title: { en: "Wrote the note I needed, not the perfect note", vi: "Viết đúng ghi chú cần viết, không đợi thành bản hoàn hảo" },
    note: {
      en: "Shared with the team before the idea went stale.",
      vi: "Đã gửi cho cả nhóm trước khi ý tưởng nguội dần và mất hết lực đẩy ban đầu.",
    },
    pathLabel: { en: "Career Craft", vi: "Sự nghiệp & tay nghề" },
    timeLabel: { en: "3:15 PM", vi: "15:15" },
    state: "private_sensitive",
    masked: true,
  },
];

export const plannedMarks: PlannedMarkModel[] = [
  {
    title: { en: "Leave one visible mark for Family tonight", vi: "Tối nay để lại một dấu mốc rõ ràng cho gia đình" },
    intention: {
      en: "Make home feel chosen instead of leftover.",
      vi: "Làm cho tổ ấm được chọn chủ động, chứ không phải phần thời gian còn sót lại sau công việc.",
    },
    windowLabel: { en: "7:00 PM - 8:30 PM", vi: "19:00 - 20:30" },
    pathLabel: { en: "Family & Home", vi: "Gia đình & tổ ấm" },
    state: "due_now",
  },
  {
    title: { en: "Draft one calm weekly client follow-up", vi: "Soạn một bản theo dõi khách hàng thật bình tĩnh cho tuần này" },
    intention: {
      en: "Small proof is enough for today.",
      vi: "Một bằng chứng nhỏ nhưng thật vẫn là đủ cho ngày hôm nay.",
    },
    windowLabel: { en: "Tomorrow morning", vi: "Sáng mai" },
    pathLabel: { en: "Career Craft", vi: "Sự nghiệp & tay nghề" },
    state: "postponed",
  },
  {
    title: { en: "Body session A", vi: "Buổi cơ thể A" },
    intention: { en: "Strength first, then a short stretch.", vi: "Ưu tiên sức mạnh trước, rồi thả lỏng thật gọn." },
    windowLabel: { en: "6:30 AM", vi: "06:30" },
    pathLabel: { en: "Health & Body", vi: "Sức khoẻ & cơ thể" },
    state: "done",
  },
];

export const packCheck: PackCheckModel = {
  title: { en: "Before Leaving Home Check", vi: "Before Leaving Home Check" },
  summary: {
    en: "Quiet transition before you step out.",
    vi: "Mot nhip chuyen canh binh tinh truoc khi roi nha va buoc vao ngay moi.",
  },
  items: [
    { id: "phone", label: { en: "Phone", vi: "Dien thoai" }, checked: true },
    { id: "wallet", label: { en: "Wallet", vi: "Vi" }, checked: true },
    { id: "keys", label: { en: "Keys", vi: "Chia khoa" }, checked: false },
  ],
  state: "partial",
};

export const expedition: ExpeditionModel = {
  title: { en: "SNAG Family Intro Clinic", vi: "Buổi trải nghiệm gia đình SNAG" },
  summary: {
    en: "A finite rollout with milestones, proof, and a real finish line.",
    vi: "Một đợt triển khai hữu hạn có mốc, có bằng chứng, và có một điểm kết thúc thật rõ.",
  },
  pathLabel: { en: "SNAG Golf Vietnam", vi: "SNAG Golf Việt Nam" },
  milestoneLabel: { en: "3 of 5 milestones complete", vi: "Đã xong 3 trên 5 cột mốc" },
  progress: 0.62,
  state: "active",
};

export const memory: MemoryModel = {
  title: { en: "Garden dinner after the rain", vi: "Bữa tối ngoài sân sau cơn mưa nhẹ cuối chiều" },
  caption: {
    en: "The photo matters, but the warmth matters more.",
    vi: "Tấm ảnh này đẹp, nhưng điều đáng giữ hơn là cảm giác ấm áp còn đọng lại sau bữa tối quây quần.",
  },
  pathLabels: {
    en: ["Family & Home", "Culture, Class & Romance"],
    vi: ["Gia đình & tổ ấm", "Văn hoá, khí chất & sự lãng mạn"],
  },
  dateLabel: { en: "Sunday, May 11", vi: "Chủ nhật, ngày 11 tháng 5" },
  hasPhoto: true,
};

export const journalItems: JournalItemModel[] = [
  {
    kind: "mark",
    title: { en: "Morning body session completed", vi: "Đã hoàn tất buổi cơ thể buổi sáng" },
    body: {
      en: "A small honest session still kept the day anchored.",
      vi: "Một buổi tập ngắn nhưng thật vẫn đủ để giữ cho ngày hôm nay có trục và có lực.",
    },
    meta: { en: "Health & Body • 6:42 AM", vi: "Sức khoẻ & cơ thể • 06:42" },
  },
  {
    kind: "memory",
    title: { en: "Saved a memory with the family", vi: "Đã giữ lại một ký ức với gia đình" },
    body: {
      en: "Photo-linked memory with a soft reflection note.",
      vi: "Ký ức có đính kèm ảnh cùng một đoạn phản chiếu ngắn, mềm và đủ chân thật để nhớ lại sau này.",
    },
    meta: { en: "Journal • 7:55 PM", vi: "Journal • 19:55" },
  },
  {
    kind: "closure",
    title: { en: "Today is marked. Rest.", vi: "Hôm nay đã có dấu mốc. Nghỉ ngơi thôi." },
    body: {
      en: "Three planned marks completed, one postponed without guilt.",
      vi: "Ba dấu mốc theo kế hoạch đã xong, một việc được dời lại mà không cần tự trách hay thổi phồng thất bại.",
    },
    meta: { en: "Close the Trail", vi: "Khép đường mòn" },
  },
];

export const workoutCards: WorkoutModel[] = [
  {
    title: { en: "Strength Session A", vi: "Buổi sức mạnh A" },
    summary: {
      en: "Shared template for Day A and Day B. Calm, data-driven, no duplicated screen logic.",
      vi: "Template dùng chung cho Ngày A và Ngày B. Bình tĩnh, theo dữ liệu, không nhân bản màn hình một cách thừa thãi.",
    },
    progressLabel: { en: "2 of 5 exercises complete", vi: "Đã xong 2 trên 5 bài tập" },
    state: "in_progress",
  },
  {
    title: { en: "Walk Day", vi: "Ngày đi bộ" },
    summary: {
      en: "Lighter than strength. It should feel breathable.",
      vi: "Nhẹ hơn buổi sức mạnh. Cảm giác phải thoáng, dễ vào và dễ hoàn tất.",
    },
    progressLabel: { en: "Ready for 25 minutes", vi: "Sẵn sàng cho 25 phút" },
    state: "walk_ready",
  },
  {
    title: { en: "Strength Session B", vi: "Buổi sức mạnh B" },
    summary: {
      en: "Keep the same system, different exercise data.",
      vi: "Giữ nguyên một hệ thống, chỉ thay dữ liệu bài tập chứ không thay khái niệm màn hình.",
    },
    progressLabel: { en: "Completed today", vi: "Đã hoàn tất hôm nay" },
    state: "completed",
  },
];

export const exerciseSteps: ExerciseStepModel[] = [
  {
    title: { en: "Goblet squat", vi: "Goblet squat" },
    target: { en: "3 x 10 at 18kg", vi: "3 hiệp x 10 lần ở mức 18kg" },
    actual: { en: "2 sets done", vi: "Đã xong 2 hiệp" },
    state: "active",
  },
  {
    title: { en: "Plank hold", vi: "Giữ plank" },
    target: { en: "45 seconds", vi: "45 giây" },
    actual: { en: "Up next", vi: "Chuẩn bị tới lượt" },
    state: "upcoming",
  },
  {
    title: { en: "Breathing stretch", vi: "Giãn cơ kết hợp nhịp thở" },
    target: { en: "2 rounds", vi: "2 vòng" },
    actual: { en: "Completed", vi: "Đã xong" },
    state: "done",
  },
];

export const captureOptions: CaptureOptionModel[] = [
  {
    title: { en: "Mark", vi: "Dấu mốc" },
    body: {
      en: "Turn a quick proof into a real mark right now.",
      vi: "Biến một bằng chứng nhanh thành dấu mốc thật ngay trong lúc cảm giác còn nóng.",
    },
    icon: "•",
  },
  {
    title: { en: "Memory", vi: "Ký ức" },
    body: {
      en: "Keep the moment with a softer, longer memory note.",
      vi: "Giữ lại khoảnh khắc bằng một ghi chú ký ức dài hơn, mềm hơn và có chiều sâu hơn.",
    },
    icon: "◦",
  },
  {
    title: { en: "Backlog", vi: "Backlog" },
    body: {
      en: "Save the idea without forcing it into today.",
      vi: "Lưu ý tưởng lại mà không ép nó phải chen vào ngày hôm nay cho đủ thành tích.",
    },
    icon: "+",
  },
];

export const backlogItems: BacklogItemModel[] = [
  {
    title: { en: "Family river walk on Sunday dusk", vi: "Đi dạo bờ sông cùng gia đình vào chiều chạng vạng Chủ nhật" },
    body: {
      en: "A simple memory-first outing, not a productivity event.",
      vi: "Một chuyến đi thiên về ký ức và sự hiện diện, không phải một sự kiện phải tối ưu hay biến thành nhiệm vụ.",
    },
    typeLabel: { en: "Idea", vi: "Ý tưởng" },
    horizonLabel: { en: "This month", vi: "Trong tháng này" },
    state: "planned",
  },
  {
    title: { en: "Write a softer parent newsletter draft", vi: "Viết bản nháp newsletter mềm hơn cho phụ huynh" },
    body: {
      en: "Could become a Weekly Coding pull when the season is ready.",
      vi: "Có thể được kéo vào Weekly Coding khi đúng nhịp và đúng mùa làm việc hơn.",
    },
    typeLabel: { en: "Plan", vi: "Kế hoạch" },
    horizonLabel: { en: "Next week", vi: "Tuần tới" },
    state: "upcoming",
  },
];

export const weeklyReport: WeeklyReportModel = {
  title: { en: "Weekly Coding Report", vi: "Báo cáo Weekly Coding" },
  summary: {
    en: "Selected week only. Pulled items, visible proof, and path balance.",
    vi: "Chỉ cho tuần đang chọn. Những gì đã được kéo vào tuần, bằng chứng nhìn thấy được, và độ cân bằng giữa các path.",
  },
  pathBalance: {
    en: "Family is protected. Health is alive. Culture needs one honest mark.",
    vi: "Gia đình đang được giữ. Sức khoẻ đang còn sống. Path văn hoá cần đúng một dấu mốc thật để không trôi mất.",
  },
  completionLabel: { en: "9 of 12 pulled marks completed", vi: "Đã xong 9 trên 12 dấu mốc được kéo vào tuần" },
};
