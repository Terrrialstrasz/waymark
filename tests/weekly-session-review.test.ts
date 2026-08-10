import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { loadWorkoutReviewData } from "../src/app/workoutReviewDataLoader";
import { createSQLiteRepositoryProvider } from "../src/db/adapters";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import {
  ExerciseCategory,
  ExerciseTargetType,
  MarkInstanceOrigin,
  MarkInstanceStatus,
  PathStatus,
  WorkoutExercisePhase,
  WorkoutRoutineType,
} from "../src/domain/waymark";
import { createStrengthSessionEngine } from "../src/lib/waymark/strengthEngine";

class NodeSqliteAdapter {
  constructor(private readonly db: DatabaseSync) {}
  async execAsync(source: string) { this.db.exec(source); }
  async runAsync(source: string, ...params: unknown[]) {
    const result = this.db.prepare(source).run(...(params as any[]));
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid ?? 0) };
  }
  async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
    return (this.db.prepare(source).get(...(params as any[])) as T | undefined) ?? null;
  }
  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(source).all(...(params as any[])) as T[];
  }
  async withExclusiveTransactionAsync<T>(work: (txn: NodeSqliteAdapter) => Promise<T>): Promise<T> {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = await work(this);
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

async function run() {
  const raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys = ON;");
  const db = new NodeSqliteAdapter(raw);
  try {
    await applyMigrationsAsync(db as any);
    const repos = createSQLiteRepositoryProvider(async () => db as any);
    await repos.userProfiles.getOrCreateLocalUserProfile({
      userId: "user_review",
      locale: "en",
      timezone: "Asia/Saigon",
      weekStartsOn: 1,
    });
    const path = await repos.paths.createPath({
      userId: "user_review",
      slug: "health",
      title: "Health",
      status: PathStatus.Active,
      sortOrder: 1,
    });
    const trailDay = await repos.trailDays.getOrCreateTrailDay("user_review", "2026-08-10");
    const mark = await repos.marks.createMarkInstance({
      userId: "user_review",
      pathId: path.id,
      trailDayId: trailDay.id,
      title: "Workout Day A",
      origin: MarkInstanceOrigin.WeeklyPlanned,
      status: MarkInstanceStatus.Planned,
      proofMediaAssetIds: [],
    });
    const routine = await repos.strength.upsertRoutine({
      id: "routine_review_day_a",
      userId: "user_review",
      pathId: path.id,
      title: "Workout Day A",
      routineType: WorkoutRoutineType.Strength,
      estimatedDurationMin: 45,
      isActive: true,
      createdAt: "2026-08-09T00:00:00.000Z",
      updatedAt: "2026-08-09T00:00:00.000Z",
    });
    const exercise = await repos.strength.upsertExerciseDefinition({
      id: "exercise_review_squat",
      userId: "user_review",
      pathId: path.id,
      title: "Barbell Squat",
      canonicalSlug: "barbell-squat-review",
      category: ExerciseCategory.Strength,
      targetType: ExerciseTargetType.RepsLoad,
      defaultRestSec: 90,
      isSystem: false,
      createdAt: "2026-08-09T00:00:00.000Z",
      updatedAt: "2026-08-09T00:00:00.000Z",
    });
    await repos.strength.upsertRoutineExercises([{
      id: "routine_exercise_review_squat",
      workoutRoutineTemplateId: routine.id,
      exerciseDefinitionId: exercise.id,
      phase: WorkoutExercisePhase.Strength,
      orderIndex: 1,
      targetType: ExerciseTargetType.RepsLoad,
      targetLoadKg: 60,
      targetReps: 5,
      targetSets: 3,
      restDurationSec: 90,
      createdAt: "2026-08-09T00:00:00.000Z",
      updatedAt: "2026-08-09T00:00:00.000Z",
    }]);

    const before = await snapshotMutationState(db, mark.id);
    const review = await loadWorkoutReviewData({ repositories: repos } as any, mark.id, "en", routine.id);
    const after = await snapshotMutationState(db, mark.id);

    assert.ok(review);
    assert.equal(review.routineId, routine.id);
    assert.equal(review.exercises[0]?.title, "Barbell Squat");
    assert.equal(review.exercises[0]?.prescription, "3 x 5 @ 60 kg");
    assert.deepEqual(after, before, "Opening Weekly workout review must not mutate progress or sync state.");

    const strengthEngine = createStrengthSessionEngine(repos);
    await strengthEngine.startWorkoutSession({ markInstanceId: mark.id, routineTemplateId: routine.id });
    const beforeExistingSessionReview = await snapshotMutationState(db, mark.id);
    const existingSessionReview = await loadWorkoutReviewData({ repositories: repos } as any, mark.id, "en", routine.id);
    const afterExistingSessionReview = await snapshotMutationState(db, mark.id);
    assert.ok(existingSessionReview?.sessionStatusLabel?.includes("active"));
    assert.deepEqual(
      afterExistingSessionReview,
      beforeExistingSessionReview,
      "Reviewing an existing workout session must not resume it or update progress.",
    );
  } finally {
    raw.close();
  }
}

async function snapshotMutationState(db: NodeSqliteAdapter, markId: string) {
  const mark = await db.getFirstAsync<{ status: string; completed_at: number | null; local_revision: number }>(
    "SELECT status, completed_at, local_revision FROM mark_instances WHERE id = ? LIMIT 1;",
    markId,
  );
  const counts: Record<string, number> = {};
  for (const table of [
    "workout_session_instances",
    "session_exercise_snapshots",
    "exercise_set_logs",
    "exercise_progress_states",
    "sync_outbox",
  ]) {
    counts[table] = (await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table};`))?.count ?? -1;
  }
  const trailDay = await db.getFirstAsync<{ planned_mark_count: number; completed_mark_count: number }>(
    `SELECT td.planned_mark_count, td.completed_mark_count
     FROM trail_days td
     INNER JOIN mark_instances mi ON mi.trail_day_id = td.id
     WHERE mi.id = ?
     LIMIT 1;`,
    markId,
  );
  return { mark, trailDay, counts };
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
