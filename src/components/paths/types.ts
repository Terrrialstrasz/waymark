import { FeatureState, Locale, PathId, PathPulse } from "../../types/ui";
import { WaymarkImageAssetId } from "../../assets/imageRegistry";

export type LocalizedString = Record<Locale, string>;

export type PathStatCardItem = {
  id: string;
  label: LocalizedString;
  value?: LocalizedString;
  supportingText?: LocalizedString;
  iconSemanticName?: "entity.path" | "status.active" | "status.protected" | "status.weak";
  heroAssetId?: string;
  watermarkAssetId?: WaymarkImageAssetId | string;
  backgroundIconSemanticName?: import("../../design/waymark-icon-map").WaymarkSemanticIconName;
  state?: "default" | "loading" | "empty" | "warning";
};

export type PathRowItem = {
  id: string;
  pathId: PathId;
  title: LocalizedString;
  question: LocalizedString;
  status: PathPulse;
  markCount: number;
  active?: boolean;
  loading?: boolean;
  gate?: FeatureState;
};

export type PathPulseMetric = {
  id: string;
  label: LocalizedString;
  value: LocalizedString;
};

export type PathProofItem = {
  id: string;
  kind: "mark" | "memory";
  title: LocalizedString;
  metadata: LocalizedString;
  sourceDisciplineProofId?: string;
  loading?: boolean;
  gate?: FeatureState;
};

export type NextMarkTimingState = "today" | "this_week" | "planned" | "upcoming" | "missed";

export type NextMarkItem = {
  id: string;
  title: LocalizedString;
  timingState: NextMarkTimingState;
  loading?: boolean;
  disabled?: boolean;
  gate?: FeatureState;
};

export type PathDetailItem = {
  id: string;
  pathId: PathId;
  title: LocalizedString;
  statement?: LocalizedString;
  status: PathPulse;
  sinceLabel?: LocalizedString;
  pulseSummary?: LocalizedString;
  pulseBody?: LocalizedString;
  whyThisPathBody?: LocalizedString;
  pulseMetrics?: PathPulseMetric[];
};

export type PathDetailMilestoneItem = {
  id: string;
  title: string;
  description?: string;
  status: "active" | "planned" | "completed" | "missed" | "archived";
  startDate?: string;
  targetDate?: string;
  completedAt?: string;
  sortOrder: number;
  orderIndex?: number;
  marks: PathDetailMarkItem[];
};

export type PathDetailMarkItem = {
  id: string;
  title: string;
  status:
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
    | "cancelled";
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
  sortTime: string;
  isDone: boolean;
  isFinal: boolean;
};

export type PathDetailExpeditionItem = {
  id: string;
  pathId: PathId;
  title: string;
  description?: string;
  status: "active" | "planned" | "paused" | "completed" | "archived";
  startDate?: string;
  targetDate?: string;
  sortOrder: number;
  milestones: PathDetailMilestoneItem[];
  unassignedMarks: PathDetailMarkItem[];
};

export type WeeklyMilestoneItem = {
  id: string;
  pathRecordId: string;
  pathId: PathId;
  pathTitle: string;
  pathAccent: string;
  pathAccentDeep: string;
  pathAccentSoft: string;
  pathIconAssetId?: string;
  pathIconSemanticName: import("../../design/waymark-icon-map").WaymarkSemanticIconName;
  expeditionId: string;
  expeditionTitle: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  status: "active" | "planned" | "completed" | "missed" | "archived";
  sortOrder: number;
  marks: WeeklyMilestoneMarkItem[];
};

export type WeeklyMilestoneMarkItem = {
  id: string;
  title: string;
  status:
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
    | "cancelled";
  localDate: string;
  dayLabel: string;
  isDone: boolean;
  isFinal: boolean;
  expeditionTitle?: string;
  milestoneTitle?: string;
  description?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  dueAt?: string;
};
