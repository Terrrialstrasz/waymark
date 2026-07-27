import { ExpeditionState, Locale, PathId, PathPulse } from "../types/ui";

type PathsCopy = {
  overview: {
    title: string;
    subtitle: string;
    pathsSectionTitle: string;
    insightTitle: string;
    insightBody: string;
    stats: {
      pathAlive: string;
      strongest: string;
      weakest: string;
    };
  };
  detail: {
    pathLabel: string;
    pulseTitle: string;
    recentProofTitle: string;
    nextMarksTitle: string;
    currentExpeditionsTitle: string;
    currentExpeditionsAction: string;
    whyThisPathTitle: string;
    recentProofEmptyTitle: string;
    recentProofEmptyBody: string;
    nextMarksEmptyTitle: string;
    nextMarksEmptyBody: string;
    expeditionsEmptyTitle: string;
    expeditionsEmptyBody: string;
  };
  status: Record<PathPulse, string>;
  stats: {
    pathAlive: string;
    strongest: string;
    weakest: string;
    aliveLabel: string;
    weeklyBalanceLabel: string;
    strongestPathLabel: string;
    needsAttentionLabel: string;
    emptyValue: string;
    loadingValue: string;
    aliveSupport: string;
    balanceSupport: string;
    strongestSupport: string;
    needsAttentionSupport: string;
  };
  pathShortNames: Record<PathId, string>;
  proof: {
    markLabel: string;
    memoryLabel: string;
  };
  nextMarks: {
    today: string;
    thisWeek: string;
    planned: string;
    upcoming: string;
    missed: string;
    disabled: string;
  };
  expeditions: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    searchA11y: string;
    filterButton: string;
    filterActiveButton: string;
    filteredSummary: string;
    emptyTitle: string;
    emptyBody: string;
    noteTitle: string;
    noteBody: string;
    status: Record<ExpeditionState | "done", string>;
  };
  filters: {
    title: string;
    pathGroup: string;
    timeGroup: string;
    statusGroup: string;
    clear: string;
    allPaths: string;
    allTime: string;
    current: string;
    completed: string;
    allStatus: string;
  };
  common: {
    marks: (count: number) => string;
    since: (value: string) => string;
    loading: string;
    empty: string;
    filterCount: (count: number) => string;
    filteredResultCount: (count: number) => string;
  };
};

const pathsCopy: Record<Locale, PathsCopy> = {
  en: {
    overview: {
      title: "My Paths",
      subtitle: "Seven directions. One life.",
      pathsSectionTitle: "Your Life Paths",
      insightTitle: "Path Insight",
      insightBody: "Paths stay alive through quiet proof, not dashboards.",
      stats: {
        pathAlive: "Path alive",
        strongest: "Strongest",
        weakest: "Weakest",
      },
    },
    detail: {
      pathLabel: "Path",
      pulseTitle: "Path Pulse",
      recentProofTitle: "Recent Proof",
      nextMarksTitle: "Next Marks",
      currentExpeditionsTitle: "Current Expeditions",
      currentExpeditionsAction: "View all expeditions",
      whyThisPathTitle: "Why this Path matters",
      recentProofEmptyTitle: "No recent proof yet",
      recentProofEmptyBody: "A path becomes visible again when a real proof is left.",
      nextMarksEmptyTitle: "No marks planned",
      nextMarksEmptyBody: "Nothing is queued here right now.",
      expeditionsEmptyTitle: "No current expeditions",
      expeditionsEmptyBody: "This path is quiet at the moment.",
    },
    status: {
      alive: "Alive",
      protected: "Protected",
      weak: "Weak",
      neglected: "Weak",
      growing: "Growing",
    },
    stats: {
      pathAlive: "Path alive",
      strongest: "Strongest",
      weakest: "Weakest",
      aliveLabel: "Paths Alive",
      weeklyBalanceLabel: "Weekly Balance",
      strongestPathLabel: "Strongest Path",
      needsAttentionLabel: "Needs Attention",
      emptyValue: "Not yet",
      loadingValue: "Loading",
      aliveSupport: "Quiet signs of life this week.",
      balanceSupport: "How the week is spreading across life.",
      strongestSupport: "Where proof is gathering most naturally.",
      needsAttentionSupport: "A gentle nudge, not an alarm.",
    },
    pathShortNames: {
      career: "Career",
      snag: "SNAG",
      health: "Health",
      family: "Family",
      character: "Character",
      golf: "Golf",
      culture: "Culture",
    },
    proof: {
      markLabel: "Mark",
      memoryLabel: "Memory",
    },
    nextMarks: {
      today: "Today",
      thisWeek: "This week",
      planned: "Planned",
      upcoming: "Upcoming",
      missed: "Missed",
      disabled: "Unavailable",
    },
    expeditions: {
      title: "Expeditions",
      subtitle: "All expeditions across all paths.",
      searchPlaceholder: "Search expeditions",
      searchA11y: "Search expeditions",
      filterButton: "Filter",
      filterActiveButton: "Filter",
      filteredSummary: "Showing filtered expeditions",
      emptyTitle: "No expeditions found",
      emptyBody: "Try another path, time, or status filter.",
      noteTitle: "Quiet reminder",
      noteBody: "An expedition is a finite season within a path, not the path itself.",
      status: {
        planned: "Planning",
        active: "Active",
        upcoming: "Upcoming",
        done: "Done",
        paused: "Paused",
        archived: "Done",
      },
    },
    filters: {
      title: "Filters",
      pathGroup: "Path",
      timeGroup: "Time",
      statusGroup: "Status",
      clear: "Clear filters",
      allPaths: "All paths",
      allTime: "All time",
      current: "Current",
      completed: "Completed",
      allStatus: "All status",
    },
    common: {
      marks: (count) => `${count} ${count === 1 ? "mark" : "marks"}`,
      since: (value) => `Since ${value}`,
      loading: "Loading",
      empty: "Empty",
      filterCount: (count) => `Filter · ${count}`,
      filteredResultCount: (count) => `Showing filtered expeditions · ${count} results`,
    },
  },
  vi: {
    overview: {
      title: "Các Path của tôi",
      subtitle: "Bảy hướng sống. Một cuộc đời.",
      pathsSectionTitle: "Những Path trong đời sống",
      insightTitle: "Gợi ý cho Path",
      insightBody: "Path sống nhờ bằng chứng thật, không phải nhờ bảng điều khiển.",
      stats: {
        pathAlive: "Path con song",
        strongest: "Manh nhat",
        weakest: "Yeu nhat",
      },

    },
    detail: {
      pathLabel: "Path",
      pulseTitle: "Nhịp của Path",
      recentProofTitle: "Bằng chứng gần đây",
      nextMarksTitle: "Dấu mốc tiếp theo",
      currentExpeditionsTitle: "Các Expedition hiện tại",
      currentExpeditionsAction: "Xem tất cả expedition",
      whyThisPathTitle: "Vì sao Path này quan trọng",
      recentProofEmptyTitle: "Chưa có bằng chứng gần đây",
      recentProofEmptyBody: "Một path hiện lên lại khi có một bằng chứng thật được để lại.",
      nextMarksEmptyTitle: "Chưa có dấu mốc nào",
      nextMarksEmptyBody: "Hiện chưa có gì được xếp vào đây.",
      expeditionsEmptyTitle: "Chưa có expedition hiện tại",
      expeditionsEmptyBody: "Path này đang ở một nhịp yên hơn.",
    },
    status: {
      alive: "Đang sống",
      protected: "Được giữ",
      weak: "Đang yếu",
      neglected: "Đang yếu",
      growing: "Đang lớn lên",
    },
    stats: {
      pathAlive: "Path con song",
      strongest: "Manh nhat",
      weakest: "Yeu nhat",
      aliveLabel: "Path còn sống",
      weeklyBalanceLabel: "Độ cân của tuần",
      strongestPathLabel: "Path rõ nhất",
      needsAttentionLabel: "Cần để ý",
      emptyValue: "Chưa có",
      loadingValue: "Đang tải",
      aliveSupport: "Dấu hiệu sống yên trong tuần này.",
      balanceSupport: "Tuần này đang trải ra qua các phần đời như thế nào.",
      strongestSupport: "Nơi bằng chứng đang tụ lại tự nhiên nhất.",
      needsAttentionSupport: "Một lời nhắc nhẹ, không phải báo động.",
    },
    pathShortNames: {
      career: "Career",
      snag: "SNAG",
      health: "Health",
      family: "Family",
      character: "Character",
      golf: "Golf",
      culture: "Culture",
    },
    proof: {
      markLabel: "Dấu mốc",
      memoryLabel: "Ký ức",
    },
    nextMarks: {
      today: "Hôm nay",
      thisWeek: "Tuần này",
      planned: "Đã lên kế hoạch",
      upcoming: "Sắp tới",
      missed: "Đã lỡ",
      disabled: "Chưa khả dụng",
    },
    expeditions: {
      title: "Expeditions",
      subtitle: "Tất cả expedition trên mọi path.",
      searchPlaceholder: "Tìm expedition",
      searchA11y: "Tìm expedition",
      filterButton: "Lọc",
      filterActiveButton: "Lọc",
      filteredSummary: "Đang hiển thị expedition đã lọc",
      emptyTitle: "Không tìm thấy expedition",
      emptyBody: "Hãy thử path, thời gian, hoặc trạng thái khác.",
      noteTitle: "Nhắc nhẹ",
      noteBody: "Expedition là một mùa hữu hạn bên trong path, không phải chính path đó.",
      status: {
        planned: "Đang chuẩn bị",
        active: "Đang diễn ra",
        upcoming: "Sắp tới",
        done: "Đã xong",
        paused: "Tạm dừng",
        archived: "Đã xong",
      },
    },
    filters: {
      title: "Bộ lọc",
      pathGroup: "Path",
      timeGroup: "Thời gian",
      statusGroup: "Trạng thái",
      clear: "Xóa bộ lọc",
      allPaths: "Tất cả path",
      allTime: "Mọi thời gian",
      current: "Hiện tại",
      completed: "Đã xong",
      allStatus: "Mọi trạng thái",
    },
    common: {
      marks: (count) => `${count} dấu mốc`,
      since: (value) => `Từ ${value}`,
      loading: "Đang tải",
      empty: "Trống",
      filterCount: (count) => `Lọc · ${count}`,
      filteredResultCount: (count) => `Đang hiển thị expedition đã lọc · ${count} kết quả`,
    },
  },
};

export function getPathsCopy(locale: Locale) {
  return pathsCopy[locale];
}
