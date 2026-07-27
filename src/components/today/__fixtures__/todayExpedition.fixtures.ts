import { FeatureState, Locale, PathId } from "../../../types/ui";

export type CurrentExpeditionItem = {
  id: string;
  title: Record<Locale, string>;
  milestoneLabel?: Record<Locale, string>;
  deadlineLabel?: Record<Locale, string>;
  pathId: PathId;
  accessibilityLabel?: Record<Locale, string>;
  loading?: boolean;
  detailEnabled?: boolean;
};

export type CurrentExpeditionFixture = {
  id: string;
  title: string;
  expeditions: CurrentExpeditionItem[];
  gate?: FeatureState;
};

export type CloseTrailStatus = "default" | "completedToday" | "disabled" | "loading" | "hidden";

export type CloseTrailFixture = {
  id: string;
  title: string;
  status: CloseTrailStatus;
  gate?: FeatureState;
};

export const currentExpeditionFixtures: CurrentExpeditionFixture[] = [
  {
    id: "standard",
    title: "Standard 3 expeditions",
    expeditions: [
      {
        id: "exp-1",
        title: {
          en: "SNAG Family Intro Clinic",
          vi: "Buổi trải nghiệm gia đình SNAG",
        },
        milestoneLabel: {
          en: "Milestone: Family walkthrough close-out",
          vi: "Cột mốc: Khép lại phần walkthrough gia đình",
        },
        deadlineLabel: {
          en: "Deadline: Fri",
          vi: "Hạn: Thứ Sáu",
        },
        pathId: "snag",
        detailEnabled: true,
      },
      {
        id: "exp-2",
        title: {
          en: "September Ninh Binh trail planning",
          vi: "Lên đường mòn du lịch Ninh Bình tháng 9",
        },
        milestoneLabel: {
          en: "Milestone: Lock travel route and stay shortlist",
          vi: "Cột mốc: Chốt lộ trình và danh sách chỗ ở",
        },
        deadlineLabel: {
          en: "Deadline: Aug 31",
          vi: "Hạn: 31/08",
        },
        pathId: "culture",
        detailEnabled: true,
      },
      {
        id: "exp-3",
        title: {
          en: "Health body reset before the week turns",
          vi: "Reset sức khỏe trước khi tuần đổi nhịp",
        },
        milestoneLabel: {
          en: "Milestone: Rebuild Day A consistency",
          vi: "Cột mốc: Dựng lại độ đều cho Day A",
        },
        pathId: "health",
        detailEnabled: true,
      },
    ],
  },
  {
    id: "one",
    title: "One expedition",
    expeditions: [
      {
        id: "exp-single",
        title: {
          en: "Family Intro field note",
          vi: "Ghi chú hiện trường giới thiệu gia đình",
        },
        milestoneLabel: {
          en: "Milestone: Quiet family follow-up",
          vi: "Cột mốc: Theo nhịp lại với gia đình",
        },
        pathId: "family",
        detailEnabled: true,
      },
    ],
  },
  {
    id: "long",
    title: "Long expedition title",
    expeditions: [
      {
        id: "exp-long",
        title: {
          en: "Carry the September trip notes for Ninh Binh without turning the trail into a dashboard",
          vi: "Mang theo ghi chú du lịch tháng 9 ở Ninh Bình mà không biến đường mòn thành dashboard",
        },
        milestoneLabel: {
          en: "Milestone: Keep the plan concrete and finite",
          vi: "Cột mốc: Giữ kế hoạch cụ thể và hữu hạn",
        },
        deadlineLabel: {
          en: "Deadline: Optional",
          vi: "Hạn: Tùy chọn",
        },
        pathId: "culture",
        detailEnabled: true,
      },
    ],
  },
  {
    id: "loading",
    title: "Loading expedition",
    expeditions: [
      {
        id: "exp-loading",
        title: {
          en: "Loading current expedition",
          vi: "Đang tải hành trình hiện tại",
        },
        milestoneLabel: {
          en: "Milestone is settling",
          vi: "Đang ổn định cột mốc",
        },
        pathId: "career",
        loading: true,
      },
    ],
  },
  {
    id: "completed",
    title: "Completed expedition",
    expeditions: [
      {
        id: "exp-completed",
        title: {
          en: "Close the family intro loop",
          vi: "Khép vòng giới thiệu gia đình",
        },
        milestoneLabel: {
          en: "Milestone: Arrival complete",
          vi: "Cột mốc: Đã cán đích",
        },
        deadlineLabel: {
          en: "Finished",
          vi: "Đã xong",
        },
        pathId: "family",
        detailEnabled: true,
      },
    ],
  },
  {
    id: "empty",
    title: "No expedition",
    expeditions: [],
  },
];

export const closeTrailFixtures: CloseTrailFixture[] = [
  { id: "default", title: "Default", status: "default" },
  { id: "completed", title: "Completed today", status: "completedToday" },
  { id: "loading", title: "Loading", status: "loading" },
  { id: "disabled", title: "Disabled", status: "disabled" },
  { id: "hidden", title: "Hidden", status: "hidden" },
];
