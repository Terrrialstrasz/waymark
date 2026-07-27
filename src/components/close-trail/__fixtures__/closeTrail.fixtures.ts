import { Locale } from "../../../types/ui";
import { TodayMarkItem } from "../../today/__fixtures__/todayCarousel.fixtures";
import type { WaymarkSemanticIconName } from "../../../design/waymark-icon-map";

export type TrailClosedChipViewModel = {
  id: string;
  label: Record<Locale, string>;
  stateTone?:
    | "done"
    | "substituted"
    | "rescheduled"
    | "skipped"
    | "weak"
    | "protected"
    | "planned"
    | "quieted";
};

export type CloseTrailMemoryItem = {
  id: string;
  title: Record<Locale, string>;
  metadata: Record<Locale, string>;
  imageAssetId?: "hero.path.familyHome" | "hero.path.healthBody" | "hero.path.cultureRomance";
};

export type CloseTrailFirstStep = {
  title: Record<Locale, string>;
  plannedMarkId?: string;
  value: Record<Locale, string>;
  chips: Array<{ id: string; label: Record<Locale, string> }>;
  emptyText: Record<Locale, string>;
};

export type CloseTrailDisciplineItem = {
  key: string;
  label: Record<Locale, string>;
  pathId: string;
  expeditionId?: string;
  milestoneId?: string;
};

export type CloseTrailDisciplineCluster = {
  title: Record<Locale, string>;
  subtitle: Record<Locale, string>;
  question: Record<Locale, string>;
  items: CloseTrailDisciplineItem[];
};

export type CloseTrailReviewFixture = {
  phase: "review";
  marks: TodayMarkItem[];
  memories: CloseTrailMemoryItem[];
  disciplineCluster: CloseTrailDisciplineCluster;
  firstStep: CloseTrailFirstStep;
};

export type TrailClosedResultViewModel = {
  phase: "judgment";
  title: Record<Locale, string>;
  subtitle: Record<Locale, string>;
  dayJudgmentHero: {
    judgment: "marked" | "needs_repair";
    label: Record<Locale, string>;
    supportText: Record<Locale, string>;
    artworkSemanticName: Extract<WaymarkSemanticIconName, "judgment.trailResult" | "judgment.repairPath">;
    evidenceChips: TrailClosedChipViewModel[];
  };
  plannedMarkOutcomeSummary: {
    title: Record<Locale, string>;
    sentence: Record<Locale, string>;
    chips: TrailClosedChipViewModel[];
    counts: {
      completed: number;
      substituted: number;
      skipped: number;
      moved: number;
      unresolved: number;
    };
    substituted: Array<{
      originalMarkId: string;
      originalTitle: Record<Locale, string>;
      substituteMarkId?: string;
      substituteTitle: Record<Locale, string>;
      resultLabel?: Record<Locale, string>;
    }>;
    skipped: Array<{
      markId: string;
      title: Record<Locale, string>;
      reason?: Record<Locale, string>;
    }>;
    moved: Array<{
      markId: string;
      title: Record<Locale, string>;
      destinationLabel: Record<Locale, string>;
      destinationDate?: Record<Locale, string>;
      destinationTime?: Record<Locale, string>;
      destinationBlock?: Record<Locale, string>;
      destinationPath?: Record<Locale, string>;
      reason?: Record<Locale, string>;
    }>;
    unresolvedPreview: Array<{
      markId: string;
      title: Record<Locale, string>;
      statusLabel: Record<Locale, string>;
    }>;
    unresolvedMoreCount: number;
  };
  characterJudgment: {
    judgment: "protected" | "needs_repair";
    label: Record<Locale, string>;
    supportText: Record<Locale, string>;
    artworkSemanticName?: Extract<WaymarkSemanticIconName, "judgment.protectedCharacter" | "judgment.repairPath">;
    chips: TrailClosedChipViewModel[];
  };
  disciplineProofSummary: {
    title: Record<Locale, string>;
    rows: Array<{
      key: string;
      label: Record<Locale, string>;
      text: Record<Locale, string>;
      tone: "positive" | "repair" | "muted";
    }>;
    emptyText: Record<Locale, string>;
  };
  tomorrowFirstStep: CloseTrailFirstStep;
};

export type CloseTrailFixture = CloseTrailReviewFixture | TrailClosedResultViewModel;

export const closeTrailFixture: CloseTrailFixture = {
  phase: "review",
  marks: [],
  memories: [],
  disciplineCluster: {
    title: { en: "Discipline Proof", vi: "Discipline Proof" },
    subtitle: {
      en: "Select only what you can honestly keep as proof.",
      vi: "Chi chon dieu ban co the thanh that giu lai nhu bang chung.",
    },
    question: {
      en: "What discipline did I keep today?",
      vi: "Hom nay toi giu duoc ky luat nao?",
    },
    items: [],
  },
  firstStep: {
    title: { en: "Tomorrow's first step", vi: "Buoc dau tien cua ngay mai" },
    value: { en: "No planned mark is set for tomorrow.", vi: "Chua co planned mark nao cho ngay mai." },
    chips: [],
    emptyText: {
      en: "No planned mark is set for tomorrow.",
      vi: "Chua co planned mark nao cho ngay mai.",
    },
  },
};
