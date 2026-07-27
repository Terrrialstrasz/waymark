import { FeatureState, Locale, PathId } from "../../../types/ui";
import { WaymarkSemanticIconName } from "../../../design/waymark-icon-map";
import { SemanticState } from "../../../theme/tokens";
import type { PackCheckSourceSeedId } from "../../../config/packCheckCatalog";
import type { PlannedMarkDependencyGroup } from "../../planned-mark/PlannedMarkActionSheetContent";

export type TodayMarkStatus =
  | "ready"
  | "dependency_required"
  | "blocked"
  | "ready_with_advisory"
  | "ready_with_waiver"
  | "needs_decision"
  | "done"
  | "resolved"
  | "overdue";

export type TodayMarkItem = {
  id: string;
  title: Record<Locale, string>;
  pathId: PathId;
  status: TodayMarkStatus;
  interactionKind?: "default" | "strength_session" | "golf_practice";
  summary?: Record<Locale, string>;
  timeLabel?: Record<Locale, string>;
  timeRangeLabel?: {
    start?: Record<Locale, string>;
    end?: Record<Locale, string>;
  };
  sortAt?: string;
  accessibilityLabel?: Record<Locale, string>;
  detailEnabled?: boolean;
  reviewChips?: TodayMarkReviewChip[];
  actionSheet?: TodayMarkActionSheetConfig;
};

export type TodayMarkReviewChip = {
  id: string;
  label: Record<Locale, string>;
  iconSemanticName?: WaymarkSemanticIconName;
  stateTone?: Exclude<SemanticState, "hidden">;
};

export type TodayMarkActionSheetConfig = {
  statusLabel?: Record<Locale, string>;
  intentionText?: Record<Locale, string>;
  periodLabel?: Record<Locale, string>;
  expeditionLabel?: Record<Locale, string>;
  signalLabel?: Record<Locale, string>;
  primaryActionLabel?: Record<Locale, string>;
  primaryActionHint?: Record<Locale, string>;
  dependencies?: TodayMarkActionSheetDependency[];
  relatedPackChecks?: TodayMarkActionSheetPackLink[];
  embeddedChecklist?: {
    packCheckId: string;
    items: Array<{
      id: string;
      label: string;
      checked: boolean;
      disabled?: boolean;
    }>;
  };
};

export type TodayMarkActionSheetDependency = {
  id: string;
  title: Record<Locale, string>;
  detail?: Record<Locale, string>;
  typeLabel?: Record<Locale, string>;
  statusLabel?: Record<Locale, string>;
  group: PlannedMarkDependencyGroup;
  targetType?: "mark" | "pack_check";
  targetId?: string;
};

export type TodayMarkActionSheetPackLink = {
  id: string;
  title: Record<Locale, string>;
  statusLabel?: Record<Locale, string>;
  targetId: string;
};

export type PackCheckTone = "morning" | "office" | "gym" | "evening";

export type TodayPackCheckItem = {
  id: string;
  title: Record<Locale, string>;
  count: number;
  tone: PackCheckTone;
  sourceSeedId?: PackCheckSourceSeedId;
  section: "independent" | "prepare_tomorrow";
  pathId?: PathId;
  supportLabel?: Record<Locale, string>;
  accessibilityLabel?: Record<Locale, string>;
  detailEnabled?: boolean;
};

export type MarksToLeaveFixture = {
  id: string;
  title: string;
  marks: TodayMarkItem[];
  gate?: FeatureState;
};

export type PackChecksFixture = {
  id: string;
  title: string;
  packs: TodayPackCheckItem[];
  gate?: FeatureState;
};

export const markStressTitles = {
  one: {
    en: "Review RSD mapping for SMB digitization flow",
    vi: "Review phan mapping RSD cho luong so hoa SMB",
  },
  two: {
    en: "Write article: Why SNAG helps beginners learn faster",
    vi: "Viet bai: Vi sao SNAG giup nguoi moi hoc nhanh hon",
  },
  three: {
    en: "Plan a September trip to Ninh Binh",
    vi: "Len ke hoach du lich Ninh Binh vao thang 9",
  },
} as const;

export const todayMarksFixture: TodayMarkItem[] = [
  {
    id: "mark-career-rsd",
    title: markStressTitles.one,
    pathId: "career",
    status: "dependency_required",
    summary: {
      en: "Finish draft review before stakeholder send-out.",
      vi: "Hoan tat review ban nhap truoc khi gui stakeholder.",
    },
    timeLabel: { en: "3:00 PM", vi: "15:00" },
    timeRangeLabel: { start: { en: "15:00", vi: "15:00" } },
    sortAt: "2026-07-10T15:00:00.000",
    detailEnabled: true,
    actionSheet: {
      statusLabel: { en: "Dependency Required", vi: "Can phu thuoc" },
      dependencies: [
        {
          id: "dep-career-before-leaving",
          title: { en: "Before Leaving Home Check", vi: "Before Leaving Home Check" },
          detail: {
            en: "The departure readiness pack still needs to be settled before this review block.",
            vi: "Pack truoc khi ra khoi nha van can duoc chot truoc khi vao block review nay.",
          },
          typeLabel: { en: "Pack Check", vi: "Pack Check" },
          statusLabel: { en: "Required", vi: "Bat buoc" },
          group: "required",
          targetType: "pack_check",
          targetId: "before-leaving-home-check",
        },
        {
          id: "dep-career-home-shutdown",
          title: { en: "Home Shutdown Check", vi: "Home Shutdown Check" },
          detail: {
            en: "A quiet close-down flow is still pending for tomorrow's setup.",
            vi: "Nhip dong nha van dang cho de giu setup ngay mai gon gang.",
          },
          typeLabel: { en: "Pack Check", vi: "Pack Check" },
          statusLabel: { en: "Pending", vi: "Dang cho" },
          group: "required",
          targetType: "pack_check",
          targetId: "home-shutdown-check",
        },
      ],
    },
  },
  {
    id: "mark-snag-article",
    title: markStressTitles.two,
    pathId: "snag",
    status: "ready",
    summary: {
      en: "Prep is already complete and the source notes are open.",
      vi: "Phan chuan bi da xong va ghi chu nguon da duoc mo.",
    },
    timeLabel: { en: "10:30 AM", vi: "10:30" },
    timeRangeLabel: { start: { en: "10:30", vi: "10:30" } },
    sortAt: "2026-07-10T10:30:00.000",
    detailEnabled: true,
  },
  {
    id: "mark-culture-travel",
    title: markStressTitles.three,
    pathId: "culture",
    status: "ready_with_advisory",
    summary: {
      en: "Weather note is still recommended, not blocking.",
      vi: "Ghi chu thoi tiet van chi la khuyen nghi, chua chan.",
    },
    timeLabel: { en: "Tonight", vi: "Toi nay" },
    timeRangeLabel: { start: { en: "20:00", vi: "20:00" } },
    sortAt: "2026-07-10T20:00:00.000",
    detailEnabled: true,
  },
  {
    id: "mark-family-dinner",
    title: {
      en: "Prepare a slower family dinner and leave the phone outside the room",
      vi: "Chuan bi mot bua toi gia dinh cham rai va de dien thoai o ngoai phong an",
    },
    pathId: "family",
    status: "done",
    summary: {
      en: "Readiness protected the evening.",
      vi: "Su chuan bi da giu duoc buoi toi nay.",
    },
    timeLabel: { en: "7:00 PM", vi: "19:00" },
    timeRangeLabel: { start: { en: "19:00", vi: "19:00" } },
    sortAt: "2026-07-10T19:00:00.000",
    detailEnabled: true,
  },
  {
    id: "mark-health-walk",
    title: {
      en: "Walk 25 quiet minutes after lunch",
      vi: "Di bo yen tinh 25 phut sau bua trua",
    },
    pathId: "health",
    status: "blocked",
    summary: {
      en: "Phone-away boundary still needs to be cleared.",
      vi: "Boundary de dien thoai sang mot ben van chua duoc xu ly.",
    },
    timeLabel: { en: "12:40 PM", vi: "12:40" },
    timeRangeLabel: { start: { en: "12:40", vi: "12:40" } },
    sortAt: "2026-07-10T12:40:00.000",
    detailEnabled: true,
    actionSheet: {
      statusLabel: { en: "Blocked", vi: "Bi chan" },
      dependencies: [
        {
          id: "dep-health-grooming-pack",
          title: { en: "Daily Grooming Presence Check", vi: "Daily Grooming Presence Check" },
          detail: {
            en: "The day-opening readiness flow is still unresolved, so the quiet walk is blocked.",
            vi: "Nhip mo ngay van chua xong nen buoi di bo yen dang bi chan.",
          },
          typeLabel: { en: "Pack Check", vi: "Pack Check" },
          statusLabel: { en: "Blocked", vi: "Bi chan" },
          group: "critical",
          targetType: "pack_check",
          targetId: "daily-grooming-presence-check",
        },
      ],
    },
  },
];

export const todayMarksAllDoneFixture: TodayMarkItem[] = todayMarksFixture.map((mark, index) => ({
  ...mark,
  id: `${mark.id}-done-${index}`,
  status: "done",
}));

export const marksToLeaveFixtures: MarksToLeaveFixture[] = [
  {
    id: "mixed",
    title: "Mixed readiness and done",
    marks: todayMarksFixture,
  },
  {
    id: "all-done",
    title: "All done",
    marks: todayMarksAllDoneFixture,
  },
  {
    id: "empty",
    title: "No marks",
    marks: [],
  },
];

export const todayPackChecksFixture: TodayPackCheckItem[] = [
  {
    id: "daily-grooming-presence-check",
    title: { en: "Daily Grooming Presence Check", vi: "Daily Grooming Presence Check" },
    count: 1,
    tone: "morning",
    sourceSeedId: "style.daily-grooming-presence-check",
    section: "independent",
    detailEnabled: true,
  },
  {
    id: "before-leaving-home-check",
    title: { en: "Before Leaving Home Check", vi: "Before Leaving Home Check" },
    count: 2,
    tone: "office",
    sourceSeedId: "family.before-leaving-home-check",
    section: "independent",
    detailEnabled: true,
  },
  {
    id: "workout-readiness-check",
    title: { en: "Workout Readiness Check", vi: "Workout Readiness Check" },
    count: 0,
    tone: "gym",
    sourceSeedId: "health.workout-readiness-check",
    section: "prepare_tomorrow",
    supportLabel: { en: "For Day A Strength", vi: "For Day A Strength" },
    detailEnabled: true,
  },
  {
    id: "home-shutdown-check",
    title: { en: "Home Shutdown Check", vi: "Home Shutdown Check" },
    count: 1,
    tone: "evening",
    sourceSeedId: "family.home-shutdown-check",
    section: "independent",
    detailEnabled: true,
  },
  {
    id: "travel-tour-readiness-check",
    title: { en: "Travel Tour Readiness Check", vi: "Travel Tour Readiness Check" },
    count: 3,
    tone: "office",
    sourceSeedId: "family.travel-tour-readiness-check",
    section: "independent",
    detailEnabled: true,
  },
];

export const packChecksFixtures: PackChecksFixture[] = [
  {
    id: "standard",
    title: "Independent and future-linked packs",
    packs: todayPackChecksFixture,
  },
  {
    id: "independent-only",
    title: "Independent only",
    packs: todayPackChecksFixture.filter((pack) => pack.section === "independent"),
  },
  {
    id: "empty",
    title: "No pack checks",
    packs: [],
  },
];
