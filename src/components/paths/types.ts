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

export type WeeklyMilestoneUrgency = "overdue" | "due_this_week" | "ahead" | "no_target";

export type WeeklyMilestoneMarkItem = {
  id: string;
  title: string;
  weekdayLabel: string;
  completed: boolean;
};

export type WeeklyMilestoneItem = {
  id: string;
  pathRecordId: string;
  pathId: PathId;
  pathTitle: string;
  pathAccent: string;
  pathAccentDeep: string;
  pathAccentSoft: string;
  pathIconSemanticName: import("../../design/waymark-icon-map").WaymarkSemanticIconName;
  expeditionId: string;
  expeditionTitle: string;
  title: string;
  startDate: string | null;
  targetDate: string | null;
  targetDateLabel: string;
  urgency: WeeklyMilestoneUrgency;
  marks: WeeklyMilestoneMarkItem[];
  sortOrder: number;
};

export type WeeklyMilestonePathFilterItem = {
  id: "all" | PathId;
  label: string;
  count: number;
};
