export type GolfWorkoutType = "putting" | "swing";

export type GolfClub =
  | "snag_launcher"
  | "snag_roller"
  | "snag_snapper"
  | "sand_wedge"
  | "pitching_wedge"
  | "iron_9"
  | "iron_8"
  | "iron_7"
  | "iron_6"
  | "hybrid"
  | "fairway_wood"
  | "driver";

export type GolfShotType = "chip" | "pitch" | "full_swing";
export type GolfPracticeMode = "distance" | "form";
export type GolfRepResult = "hit" | "miss";

export type GolfPuttingSetInput = {
  distanceCm: 60 | 90 | 120 | 150 | 180;
  reps: number;
  hits: number;
  misses: number;
  repResults?: GolfRepResult[];
  note?: string;
};

export type GolfShortGameSetPlan = {
  setNumber: number;
  label: string;
  distanceLabel: string;
  landingZoneLabel?: string;
  reps: number;
  note?: string;
};

export type GolfShortGameSetInput = GolfShortGameSetPlan & {
  hits: number;
  misses: number;
  repResults?: GolfRepResult[];
};

export type GolfSwingSetInput = {
  setNumber: number;
  setRole?: "revision" | "practice";
  programWeek?: number;
  sourceWeek?: number;
  skillTitle?: string;
  reps: number;
  club: GolfClub;
  clubs?: GolfClub[];
  shotType: GolfShotType;
  practiceMode: GolfPracticeMode;
  distancesYards?: number[];
  formScores?: number[];
  coachScore?: number;
  note?: string;
};

export type SaveGolfPracticeLogInput = {
  markInstanceId?: string;
  routineTemplateId?: string;
  workoutType: GolfWorkoutType;
  warmupCompleted: boolean;
  puttingSets?: GolfPuttingSetInput[];
  shortGameSets?: GolfShortGameSetInput[];
  swingSets?: GolfSwingSetInput[];
  note?: string;
  completedAt?: string;
};

export type GolfPracticeHistoryItem = {
  id: string;
  markId: string;
  completedAt: string;
  workoutType: GolfWorkoutType;
  title: string;
  summary: string;
};

export type GolfPracticeHistory = {
  items: GolfPracticeHistoryItem[];
  puttingByDistance: Array<{ distanceCm: number; hits: number; reps: number; hitRate: number }>;
  swingDistanceAverages: Array<{ club: GolfClub; shotType: GolfShotType; averageYards: number; reps: number }>;
  swingFormAverages: Array<{ club: GolfClub; shotType: GolfShotType; averageCoachScore: number; sets: number }>;
};
