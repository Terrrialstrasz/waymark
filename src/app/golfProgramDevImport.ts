import type { WaymarkRepositories } from "../domain/waymark";
import { importWeeklyTimetable, type WeeklyTimetableImportReport, type WeeklyTimetableImportSlotInput } from "../lib/waymark/weeklyTimetableImport";
import { bootstrapWaymarkMap } from "../waymark-map/bootstrap";
import { GOLF_PROGRAM_WEEKS } from "../config/golfProgramCatalog";
import { getWaymarkHierarchyBinding } from "../config/waymarkHierarchyBindings";
import { WAYMARK_MAP_CONFIG } from "../waymark-map";

type ImportServices = {
  repositories: WaymarkRepositories;
};

export type GolfProgramDevImportReport = WeeklyTimetableImportReport & {
  importedTitles: string[];
};

const DEV_IMPORT_DATE = "2026-08-05";
const DEV_WEEK_START = "2026-08-05";
const DEV_WEEK_END = "2026-08-05";
const DEV_MARK_WEEK_NUMBERS = [1, 2, 5, 13] as const;

export async function importGolfProgramDevMarks(
  services: ImportServices,
  userId: string,
): Promise<GolfProgramDevImportReport> {
  await bootstrapWaymarkMap({ repositories: services.repositories, userId }, WAYMARK_MAP_CONFIG);

  const hierarchy = await resolveGolfProgramHierarchy(services.repositories, userId);
  const items = buildDevGolfProgramMarks(hierarchy);
  const report = await importWeeklyTimetable(services.repositories, {
    userId,
    weekStartDate: DEV_WEEK_START,
    weekEndDate: DEV_WEEK_END,
    note: "Dev import for Golf Program revision/practice flow testing.",
    importBatchId: "golf_program_dev_marks_2026_08_05_v1",
    items,
    allowTitleRefs: false,
    setMarkDueAt: false,
  });

  return {
    ...report,
    importedTitles: items.map((item) => item.title),
  };
}

function buildDevGolfProgramMarks(hierarchy: GolfProgramHierarchy): WeeklyTimetableImportSlotInput[] {
  const starts = ["09:00", "09:40", "10:20", "11:00"];
  const ends = ["09:30", "10:10", "10:50", "11:30"];

  return DEV_MARK_WEEK_NUMBERS.map((weekNumber, index) => {
    const week = GOLF_PROGRAM_WEEKS[weekNumber - 1];
    return {
      localDate: DEV_IMPORT_DATE,
      startTime: starts[index],
      endTime: ends[index],
      title: week.title,
      pathId: hierarchy.pathId,
      expeditionId: hierarchy.expeditionId,
      milestoneId: hierarchy.milestoneIdsByWeekNumber.get(week.weekNumber)!,
      blockKey: `golf_program_dev_week_${String(week.weekNumber).padStart(2, "0")}`,
      note: `Dev test mark for Golf Program week ${week.weekNumber}. Opens Warm-up${week.weekNumber > 1 ? " -> Revision -> Practice" : " -> Practice"}.`,
      allowOverlap: true,
    };
  });
}

type GolfProgramHierarchy = {
  pathId: string;
  expeditionId: string;
  milestoneIdsByWeekNumber: Map<number, string>;
};

async function resolveGolfProgramHierarchy(
  repositories: WaymarkRepositories,
  userId: string,
): Promise<GolfProgramHierarchy> {
  const missing: string[] = [];
  const pathBinding = getWaymarkHierarchyBinding("path", "golf");
  const expeditionBinding = getWaymarkHierarchyBinding("expedition", "golf.beginning.expedition");
  if (!pathBinding) {
    missing.push("binding:path:golf");
  }
  if (!expeditionBinding) {
    missing.push("binding:expedition:golf.beginning.expedition");
  }
  if (!pathBinding || !expeditionBinding) {
    throw new Error(`Missing Waymark hierarchy bindings for Golf Program dev import: ${missing.join(", ")}.`);
  }

  const path = await repositories.paths.getPathById(pathBinding.id);
  if (!path || path.userId !== userId) {
    missing.push(`path:${pathBinding.id}`);
  }

  const expedition = await repositories.expeditions.getExpeditionById(expeditionBinding.id);
  if (!expedition || expedition.userId !== userId || expedition.pathId !== pathBinding.id) {
    missing.push(`expedition:${expeditionBinding.id}`);
  }

  const milestoneIdsByWeekNumber = new Map<number, string>();
  if (expedition) {
    const milestones = await repositories.expeditions.listMilestonesByExpedition(expedition.id);
    for (const weekNumber of DEV_MARK_WEEK_NUMBERS) {
      const week = GOLF_PROGRAM_WEEKS[weekNumber - 1];
      const binding = getWaymarkHierarchyBinding("milestone", week.milestoneSeedId);
      if (!binding) {
        missing.push(`binding:milestone:${week.milestoneSeedId}`);
        continue;
      }
      const milestone = milestones.find((item) => item.id === binding.id);
      if (!milestone || milestone.userId !== userId || milestone.expeditionId !== expedition.id) {
        missing.push(`milestone:${binding.id}`);
        continue;
      }
      milestoneIdsByWeekNumber.set(week.weekNumber, milestone.id);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Waymark hierarchy is missing for Golf Program dev import (${missing.join("; ")}). Run Me > Turso Sync > Pull Catalog & Hierarchy first.`,
    );
  }

  return {
    pathId: pathBinding.id,
    expeditionId: expeditionBinding.id,
    milestoneIdsByWeekNumber,
  };
}
