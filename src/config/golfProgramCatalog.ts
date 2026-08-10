import type { GolfClub, GolfPracticeMode, GolfShotType } from "../types/golfPractice";

export type GolfProgramWeek = {
  weekNumber: number;
  milestoneSeedId: string;
  routineSeedId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  clubs: GolfClub[];
  shotType: GolfShotType;
  practiceMode: GolfPracticeMode;
  mainSets: number;
  mainReps: number;
};

export type GolfProgramSetPlan = {
  role: "revision" | "practice";
  programWeek: number;
  sourceWeek: number;
  setNumber: number;
  totalSets: number;
  reps: number;
  title: string;
  clubs: GolfClub[];
  shotType: GolfShotType;
  practiceMode: GolfPracticeMode;
};

export type GolfProgramPracticePlan = {
  programWeek: number;
  title: string;
  revisionSets: GolfProgramSetPlan[];
  practiceSets: GolfProgramSetPlan[];
};

const MAIN_SETS = 3;
const MAIN_REPS = 8;

function week(
  weekNumber: number,
  key: string,
  title: string,
  description: string,
  startDate: string,
  endDate: string,
  clubs: GolfClub[],
  shotType: GolfShotType,
  practiceMode: GolfPracticeMode = "form",
): GolfProgramWeek {
  return {
    weekNumber,
    milestoneSeedId: `golf.beginning.weekly.${key}`,
    routineSeedId: `golf_program_week_${String(weekNumber).padStart(2, "0")}_routine`,
    title,
    description,
    startDate,
    endDate,
    clubs,
    shotType,
    practiceMode,
    mainSets: MAIN_SETS,
    mainReps: MAIN_REPS,
  };
}

export const GOLF_PROGRAM_WEEKS: GolfProgramWeek[] = [
  week(1, "snag-chipping", "SNAG Chipping", "Chip straight with stable landing and roll.", "2026-08-10", "2026-08-16", ["snag_launcher"], "chip"),
  week(2, "snag-pitching", "SNAG Pitching", "Pitch with height and controlled landing.", "2026-08-17", "2026-08-23", ["snag_launcher"], "pitch"),
  week(3, "snag-full-swing-iron", "SNAG Full Swing Iron", "Build a stable SNAG iron-style full swing.", "2026-08-24", "2026-08-30", ["snag_launcher"], "full_swing"),
  week(4, "snag-full-swing-driver", "SNAG Full Swing Driver", "Build a stable SNAG driver-style full swing.", "2026-08-31", "2026-09-06", ["snag_launcher"], "full_swing"),
  week(5, "chipping-sw-pw", "Chipping SW + PW", "Use one chip motion across sand wedge and pitching wedge.", "2026-09-07", "2026-09-13", ["sand_wedge", "pitching_wedge"], "chip"),
  week(6, "chipping-8i", "Chipping 8i", "Complete the chipping family: SW, PW, and 8 iron.", "2026-09-14", "2026-09-20", ["iron_8"], "chip"),
  week(7, "stock-pitch-sw-pw", "Stock Pitch SW + PW", "Control stock pitching with two wedge clubs.", "2026-09-21", "2026-09-27", ["sand_wedge", "pitching_wedge"], "pitch"),
  week(8, "short-pitch-sw-pw", "Short Pitch SW + PW", "Own shorter pitch distance with two wedge clubs.", "2026-09-28", "2026-10-04", ["sand_wedge", "pitching_wedge"], "pitch"),
  week(9, "long-pitch-sw-pw", "Long Pitch SW + PW", "Complete long pitch control with two wedge clubs.", "2026-10-05", "2026-10-11", ["sand_wedge", "pitching_wedge"], "pitch"),
  week(10, "full-swing-sw-pw", "Full Swing SW + PW", "Build stock full swings with two wedge clubs.", "2026-10-12", "2026-10-18", ["sand_wedge", "pitching_wedge"], "full_swing"),
  week(11, "full-swing-8i-6i", "Full Swing 8i + 6i", "Stabilize full swing with mid irons.", "2026-10-19", "2026-10-25", ["iron_8", "iron_6"], "full_swing"),
  week(12, "full-swing-hybrid", "Full Swing Hybrid", "Add hybrid to the playable full-swing set.", "2026-10-26", "2026-11-01", ["hybrid"], "full_swing"),
  week(13, "driver", "Driver", "Create a playable driver setup and full swing.", "2026-11-02", "2026-11-08", ["driver"], "full_swing"),
];

export function findGolfProgramWeekByTitle(title: string | undefined | null): GolfProgramWeek | null {
  const normalized = title?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return GOLF_PROGRAM_WEEKS.find((week) => week.title.toLowerCase() === normalized) ?? null;
}

export function findGolfProgramWeekByRoutineTitle(title: string | undefined | null): GolfProgramWeek | null {
  const normalized = title?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return GOLF_PROGRAM_WEEKS.find((week) => golfProgramRoutineTitle(week).toLowerCase() === normalized) ?? null;
}

export function buildGolfProgramPracticePlanForTitle(title: string | undefined | null): GolfProgramPracticePlan | null {
  const current = findGolfProgramWeekByTitle(title);
  if (!current) {
    return null;
  }
  const previous = current.weekNumber > 1 ? GOLF_PROGRAM_WEEKS[current.weekNumber - 2] : undefined;
  return {
    programWeek: current.weekNumber,
    title: current.title,
    revisionSets: previous
      ? [
          {
            role: "revision",
            programWeek: current.weekNumber,
            sourceWeek: previous.weekNumber,
            setNumber: 1,
            totalSets: 1,
            reps: MAIN_REPS,
            title: previous.title,
            clubs: previous.clubs,
            shotType: previous.shotType,
            practiceMode: previous.practiceMode,
          },
        ]
      : [],
    practiceSets: Array.from({ length: current.mainSets }, (_, index) => ({
      role: "practice",
      programWeek: current.weekNumber,
      sourceWeek: current.weekNumber,
      setNumber: index + 1,
      totalSets: current.mainSets,
      reps: current.mainReps,
      title: current.title,
      clubs: current.clubs,
      shotType: current.shotType,
      practiceMode: current.practiceMode,
    })),
  };
}

export function golfProgramRoutineTitle(week: GolfProgramWeek): string {
  return `Golf Program Week ${String(week.weekNumber).padStart(2, "0")} - ${week.title}`;
}
