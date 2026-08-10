import type { SQLiteQueryable, SQLiteTransactionalDatabase } from "../../db/adapters/SQLiteRepositoryBase";
import type { WaymarkRepositories } from "../../domain/waymark";
import { reconcilePulledHierarchySeedRegistry } from "../../waymark-map/bootstrap";
import type { WaymarkMapConfig } from "../../waymark-map/types";
import {
  pullWaymarkFullDatabaseChanges,
  pullWaymarkFullDatabaseSnapshot,
  type FullDbPullAdapter,
  type WaymarkFullDbPullResult,
} from "./tursoFullDatabaseSync";
import {
  pullTypedPlanningFromTurso,
  pullTypedPlanningWeekPlansFromTurso,
  reconcileLocalWeeklyPlanningMaterialization,
  type PullTypedPlanningFromTursoInput,
  type PullTypedPlanningFromTursoResult,
  type ReconcileLocalWeeklyPlanningResult,
} from "./tursoPlanningSync";

export type WaymarkTursoPullMode = "full" | "planning" | "hierarchy";
export type WaymarkTursoPullStage = "full_database" | "typed_planning" | "hierarchy_reconciliation" | "local_materialization";

type CoordinatorBase = {
  database: SQLiteTransactionalDatabase;
  executor?: SQLiteQueryable;
  planningAdapter: PullTypedPlanningFromTursoInput["adapter"];
  vaultId: string;
  deviceId: string;
  now?: number;
};

type HierarchyContext = {
  repositories: WaymarkRepositories;
  userId: string;
  mapConfig: WaymarkMapConfig;
};

export type RunWaymarkTursoPullInput = CoordinatorBase &
  (
    | ({ mode: "full"; fullDbMode: "snapshot" | "incremental"; fullDbAdapter: FullDbPullAdapter } & HierarchyContext)
    | ({ mode: "hierarchy" } & HierarchyContext)
    | { mode: "planning" }
  );

export type WaymarkTursoPullResult = {
  mode: WaymarkTursoPullMode;
  fullDatabase: WaymarkFullDbPullResult | null;
  planning: PullTypedPlanningFromTursoResult;
  localRepair: ReconcileLocalWeeklyPlanningResult;
  hierarchyReconciled: boolean;
};

export class WaymarkTursoPullInProgressError extends Error {
  readonly code = "WAYMARK_TURSO_PULL_IN_PROGRESS";

  constructor(readonly vaultId: string) {
    super(`A Waymark Turso pull is already running for vault ${vaultId}.`);
    this.name = "WaymarkTursoPullInProgressError";
  }
}

export class WaymarkTursoPullStageError extends Error {
  readonly code = "WAYMARK_TURSO_PULL_STAGE_FAILED";

  constructor(readonly stage: WaymarkTursoPullStage, cause: unknown) {
    super(`Waymark Turso pull failed during ${stage}: ${formatCoordinatorError(cause)}`, { cause });
    this.name = "WaymarkTursoPullStageError";
  }
}

const activePullVaults = new Set<string>();

/** The only app-facing Turso pull pipeline. Low-level pull functions remain exported for tests and migration tooling. */
export async function runWaymarkTursoPull(input: RunWaymarkTursoPullInput): Promise<WaymarkTursoPullResult> {
  if (activePullVaults.has(input.vaultId)) {
    throw new WaymarkTursoPullInProgressError(input.vaultId);
  }
  activePullVaults.add(input.vaultId);
  try {
    return await runWaymarkTursoPullUnlocked(input);
  } finally {
    activePullVaults.delete(input.vaultId);
  }
}

async function runWaymarkTursoPullUnlocked(input: RunWaymarkTursoPullInput): Promise<WaymarkTursoPullResult> {
  const executor = input.executor ?? input.database;
  let fullDatabase: WaymarkFullDbPullResult | null = null;

  if (input.mode === "full") {
    fullDatabase = await runStage("full_database", () =>
      input.fullDbMode === "snapshot"
        ? pullWaymarkFullDatabaseSnapshot({
            database: input.database,
            adapter: input.fullDbAdapter,
            vaultId: input.vaultId,
            deviceId: input.deviceId,
            now: input.now,
          })
        : pullWaymarkFullDatabaseChanges({
            database: input.database,
            adapter: input.fullDbAdapter,
            vaultId: input.vaultId,
            deviceId: input.deviceId,
            now: input.now,
          }),
    );
  }

  const planning = await runStage("typed_planning", () => {
    if (input.mode === "hierarchy") {
      return pullTypedPlanningFromTurso({
        executor,
        adapter: input.planningAdapter,
        vaultId: input.vaultId,
        deviceId: input.deviceId,
        entityTypes: ["path", "expedition", "milestone"],
        retireLocalHierarchy: true,
        replayFromBeginning: true,
        advancePlanningCursor: false,
        now: input.now,
      });
    }
    if (input.mode === "full") {
      return pullTypedPlanningFromTurso({
        executor,
        adapter: input.planningAdapter,
        vaultId: input.vaultId,
        deviceId: input.deviceId,
        entityTypes: ["path", "expedition", "milestone", "week_plan", "week_plan_item"],
        retireLocalHierarchy: true,
        now: input.now,
      });
    }
    return pullTypedPlanningWeekPlansFromTurso({
      executor,
      adapter: input.planningAdapter,
      vaultId: input.vaultId,
      deviceId: input.deviceId,
      now: input.now,
    });
  });

  let hierarchyReconciled = false;
  if (input.mode === "full" || input.mode === "hierarchy") {
    await runStage("hierarchy_reconciliation", () =>
      reconcilePulledHierarchySeedRegistry(
        { repositories: input.repositories, userId: input.userId },
        input.mapConfig,
      ),
    );
    hierarchyReconciled = true;
  }

  const localRepair = await runStage("local_materialization", () =>
    reconcileLocalWeeklyPlanningMaterialization({ executor, now: input.now }),
  );

  return { mode: input.mode, fullDatabase, planning, localRepair, hierarchyReconciled };
}

async function runStage<T>(stage: WaymarkTursoPullStage, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    if (error instanceof WaymarkTursoPullStageError) throw error;
    throw new WaymarkTursoPullStageError(stage, error);
  }
}

function formatCoordinatorError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
