import type { WaymarkRepositories } from "../domain/waymark";
import { WAYMARK_MAP_CONFIG } from "../waymark-map";
import {
  repairAuthoritativeWorkoutRoutines,
  type AuthoritativeWorkoutRoutineRepairResult,
} from "../waymark-map/bootstrap";

export async function repairWorkoutDatabase(
  repositories: WaymarkRepositories,
  userId: string,
): Promise<AuthoritativeWorkoutRoutineRepairResult> {
  return repairAuthoritativeWorkoutRoutines(
    {
      repositories,
      userId,
    },
    WAYMARK_MAP_CONFIG,
  );
}
