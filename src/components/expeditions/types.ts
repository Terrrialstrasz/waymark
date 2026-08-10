import { FeatureState, Locale, PathId, ExpeditionState } from "../../types/ui";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";

export type LocalizedString = Record<Locale, string>;

export type PathExpeditionItem = {
  id: string;
  pathId: PathId;
  pathName: LocalizedString;
  title: LocalizedString;
  description: LocalizedString;
  status: ExpeditionState | "done";
  loading?: boolean;
  gate?: FeatureState;
};

export type ExpeditionFilterTime = "all_time" | "current" | "upcoming" | "completed";

export type ExpeditionFilterState = "all_status" | ExpeditionState | "done";

export type ExpeditionFilterPathOption = {
  id: string;
  label: LocalizedString;
  pathId?: PathId;
};

export type ExpeditionDetailStatus = Extract<ExpeditionState, "active" | "upcoming" | "done" | "archived">;
export type MilestoneStatus = "done" | "inProgress" | "upcoming" | "skipped";
export type PlannedMarkDetailStatus =
  | "planned"
  | "ready"
  | "blocked"
  | "active"
  | "completed"
  | "partially_completed"
  | "skipped"
  | "rescheduled"
  | "substituted"
  | "expired"
  | "cancelled"
  | "needsRepair";

export type ExpeditionDetailItem = {
  id: string;
  title: string;
  subtitle?: string;
  status: ExpeditionDetailStatus;
  startDate?: string | Date;
  endDate?: string | Date;
  daysLeftLabel?: string;
  summaryTitle?: string;
  summaryText: string;
  completedMarks: number;
  totalMarks: number;
  completedMilestones: number;
  totalMilestones: number;
  percentComplete: number;
  pathId?: PathId;
  pathName: string;
  pathColor?: string;
  pathAccent?: string;
  heroImage?: string;
  whyItMatters?: string;
};

export type ExpeditionMilestoneItem = {
  id: string;
  number: number;
  title: string;
  startDate?: string | Date;
  endDate?: string | Date;
  completedAt?: string | Date;
  status: MilestoneStatus;
  completedMarks: number;
  totalMarks: number;
  plannedMarks: ExpeditionPlannedMarkItem[];
  isExpanded?: boolean;
};

export type ExpeditionNoMilestoneGroupItem = {
  id: string;
  title: string;
  completedMarks: number;
  totalMarks: number;
  plannedMarks: ExpeditionPlannedMarkItem[];
  isExpanded?: boolean;
};

export type ExpeditionMilestoneActions = {
  onCompleteMilestone?: (milestoneId: string) => void;
  onSkipMilestone?: (milestoneId: string) => void;
  onRescheduleMilestone?: (milestoneId: string) => void;
};

export type ExpeditionPlannedMarkItem = {
  id: string;
  title: string;
  subtitle?: string;
  status: PlannedMarkDetailStatus;
  pathId?: PathId;
  pathName: string;
  timingLabel?: string;
  sortTime?: string;
  icon?: WaymarkSemanticIconName;
  heroImage?: string;
  pathHeroImage?: string;
};
