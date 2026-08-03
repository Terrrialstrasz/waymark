import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createSQLiteRepositoryProvider } from "../src/db/adapters";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import {
  MarkInstanceOrigin,
  MarkInstanceStatus,
  SignalStatus,
  SignalTargetType,
  WeekPlanItemStatus,
  WeekPlanStatus,
} from "../src/domain/waymark";
import {
  CloseTrailEngineValidationError,
  createCloseTrailEngine,
  createDailyPlanEngine,
  createMarkEngine,
  DailyPlanIntegrityError,
  getDailyReplanState,
  getSignalBehavior,
  setDailyReplanState,
  setSignalBehavior,
  recomputeTrailDayCountersForDate,
} from "../src/lib/waymark";

type RunResult = { changes: number; lastInsertRowId: number };

class NodeSqliteAdapter {
  constructor(private readonly db: DatabaseSync) {}
  async execAsync(source: string): Promise<void> { this.db.exec(source); }
  async runAsync(source: string, ...params: unknown[]): Promise<RunResult> {
    const result = this.db.prepare(source).run(...(params as any[]));
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid ?? 0) };
  }
  async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
    return (this.db.prepare(source).get(...(params as any[])) as T | undefined) ?? null;
  }
  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(source).all(...(params as any[])) as T[];
  }
  async withExclusiveTransactionAsync(task: (txn: NodeSqliteAdapter) => Promise<void>): Promise<void> {
    this.db.exec("BEGIN IMMEDIATE;");
    try {
      await task(new NodeSqliteAdapter(this.db));
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }
}

async function createHarness() {
  const db = new DatabaseSync(":memory:");
  const adapter = new NodeSqliteAdapter(db);
  await applyMigrationsAsync(adapter as never);
  const repos = createSQLiteRepositoryProvider(async () => adapter as never, async () => adapter as never, false);
  const user = await repos.userProfiles.getOrCreateLocalUserProfile({
    userId: "daily-replan-user",
    locale: "en",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: 1,
  });
  const path = await repos.paths.createPath({
    userId: user.id,
    slug: "daily-replan-path",
    title: "Daily Replan Path",
    sortOrder: 0,
  });
  const now = "2026-08-01T00:00:00.000Z";
  const weekPlan = await repos.weekPlans.upsertWeekPlan({
    id: "daily-replan-week",
    userId: user.id,
    weekStartDate: "2026-07-27",
    weekEndDate: "2026-08-02",
    status: WeekPlanStatus.Active,
    createdAt: now,
    updatedAt: now,
    syncVersion: 0,
  });
  return { db, repos, user, path, weekPlan, close: () => db.close() };
}

async function createWeeklyCandidate(
  harness: Awaited<ReturnType<typeof createHarness>>,
  id: string,
  localDate = "2026-08-01",
) {
  const trailDay = await harness.repos.trailDays.getOrCreateTrailDay(harness.user.id, localDate);
  const mark = await harness.repos.marks.createMarkInstance({
    userId: harness.user.id,
    pathId: harness.path.id,
    trailDayId: trailDay.id,
    title: id,
    origin: MarkInstanceOrigin.WeeklyPlanned,
    status: MarkInstanceStatus.Planned,
    scheduledStartAt: `${localDate}T08:00:00.000`,
    scheduledEndAt: `${localDate}T09:00:00.000`,
    proofMediaAssetIds: [],
  });
  await harness.repos.weekPlans.upsertItems([{
    id: `item-${id}`,
    weekPlanId: harness.weekPlan.id,
    status: WeekPlanItemStatus.Pulled,
    localDate,
    startTime: "08:00",
    endTime: "09:00",
    title: id,
    pathId: harness.path.id,
    origin: "weekly_timetable",
    createdMarkInstanceId: mark.id,
    sortOrder: 0,
    orderIndex: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    syncVersion: 0,
  }]);
  return { mark, trailDay };
}

const tests: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "first open begins draft automatically and freezes membership",
    run: async () => {
      const harness = await createHarness();
      try {
        const first = await createWeeklyCandidate(harness, "first");
        const engine = createDailyPlanEngine(harness.repos);
        const begun = await engine.beginReplan(harness.user.id, "2026-08-01", harness.user.timezone, "2026-08-01T06:00:00.000Z");
        assert.equal(begun.membership, "draft");
        assert.deepEqual(begun.candidateRootMarkIds, [first.mark.id]);
        await createWeeklyCandidate(harness, "materialized-after-begin");
        const resumed = await engine.beginReplan(harness.user.id, "2026-08-01", harness.user.timezone);
        assert.deepEqual(resumed.candidateRootMarkIds, [first.mark.id]);
        assert.deepEqual(resumed.effectiveMarks.map((mark) => mark.id), [first.mark.id]);
        const weeklyPlanningCounters = await recomputeTrailDayCountersForDate(
          harness.repos,
          harness.user.id,
          "2026-08-01",
        );
        assert.equal(weeklyPlanningCounters?.plannedMarkCount, 2);
        assert.equal((await engine.resolveEffectiveDailyPlan(harness.user.id, "2026-08-01")).effectiveMarks.length, 1);
      } finally { harness.close(); }
    },
  },
  {
    name: "empty first open persists confirmed state without a visible provisional mode",
    run: async () => {
      const harness = await createHarness();
      try {
        const plan = await createDailyPlanEngine(harness.repos).beginReplan(harness.user.id, "2026-08-01", harness.user.timezone);
        assert.equal(plan.membership, "confirmed");
        assert.deepEqual(plan.candidateRootMarkIds, []);
        assert.equal(plan.state?.status, "confirmed");
      } finally { harness.close(); }
    },
  },
  {
    name: "confirmed execution move keeps root snapshot and transfers unresolved signal intent",
    run: async () => {
      const harness = await createHarness();
      try {
        const { mark } = await createWeeklyCandidate(harness, "move-after-confirm");
        const dailyPlan = createDailyPlanEngine(harness.repos);
        await dailyPlan.beginReplan(harness.user.id, "2026-08-01", harness.user.timezone, "2026-08-01T06:00:00.000Z");
        await dailyPlan.confirmReplan(harness.user.id, "2026-08-01", "2026-08-01T06:05:00.000Z");
        const signal = await harness.repos.signals.createSignal({
          userId: harness.user.id,
          targetType: SignalTargetType.MarkInstance,
          targetId: mark.id,
          scheduledAt: "2026-08-01T07:45:00.000",
          status: SignalStatus.Scheduled,
        });
        await setSignalBehavior(harness.repos.appSettings, harness.user.id, {
          signalId: signal.id, ringCount: 2, maxRings: 4, repeatAfterMinutes: 7,
        });
        const moved = await createMarkEngine(harness.repos).rescheduleMarkInstance({
          markInstanceId: mark.id,
          targetLocalDate: "2026-08-02",
          scheduledStartAt: "2026-08-02T09:00:00.000",
          scheduledEndAt: "2026-08-02T10:00:00.000",
        });
        const state = await getDailyReplanState(harness.repos.appSettings, harness.user.id, "2026-08-01");
        assert.deepEqual(state?.candidateRootMarkIds, [mark.id]);
        assert.equal((await dailyPlan.resolveEffectiveDailyPlan(harness.user.id, "2026-08-01")).effectiveMarks.length, 0);
        const tomorrow = await dailyPlan.resolveEffectiveDailyPlan(harness.user.id, "2026-08-02");
        assert.equal(tomorrow.membership, "provisional");
        assert.deepEqual(tomorrow.effectiveMarks.map((item) => item.id), [moved.replacement.id]);
        assert.equal((await harness.repos.signals.getSignalById(signal.id))?.status, SignalStatus.Cancelled);
        const replacementSignals = await harness.repos.signals.listSignalsByTarget(SignalTargetType.MarkInstance, moved.replacement.id);
        assert.equal(replacementSignals.length, 1);
        assert.equal(replacementSignals[0]?.scheduledAt, "2026-08-02T01:45:00.000Z");
        assert.deepEqual(await getSignalBehavior(harness.repos.appSettings, harness.user.id, replacementSignals[0]!.id), {
          signalId: replacementSignals[0]!.id, ringCount: 0, maxRings: 4, repeatAfterMinutes: 7,
        });
      } finally { harness.close(); }
    },
  },
  {
    name: "confirmed execution skip remains allowed and Close resolves from the immutable root",
    run: async () => {
      const harness = await createHarness();
      try {
        const { mark, trailDay } = await createWeeklyCandidate(harness, "skip-after-confirm");
        const dailyPlan = createDailyPlanEngine(harness.repos);
        await dailyPlan.beginReplan(harness.user.id, "2026-08-01", harness.user.timezone);
        await dailyPlan.confirmReplan(harness.user.id, "2026-08-01");
        await createMarkEngine(harness.repos).skipMarkInstance({ markInstanceId: mark.id });
        assert.deepEqual((await getDailyReplanState(harness.repos.appSettings, harness.user.id, "2026-08-01"))?.candidateRootMarkIds, [mark.id]);
        const summary = await createCloseTrailEngine(harness.repos).getCloseTrailSummary(trailDay.id);
        assert.equal(summary.plannedCount, 0);
        assert.equal(summary.skippedCount, 1);
      } finally { harness.close(); }
    },
  },
  {
    name: "confirmed execution substitute updates the effective leaf without changing the snapshot",
    run: async () => {
      const harness = await createHarness();
      try {
        const { mark, trailDay } = await createWeeklyCandidate(harness, "substitute-after-confirm");
        const dailyPlan = createDailyPlanEngine(harness.repos);
        await dailyPlan.beginReplan(harness.user.id, "2026-08-01", harness.user.timezone);
        await dailyPlan.confirmReplan(harness.user.id, "2026-08-01");
        const result = await createMarkEngine(harness.repos).substituteMarkInstance({
          markInstanceId: mark.id,
          substituteTitle: "effective substitute",
          substituteMode: { mode: "ready" },
        });
        const state = await getDailyReplanState(harness.repos.appSettings, harness.user.id, "2026-08-01");
        assert.deepEqual(state?.candidateRootMarkIds, [mark.id]);
        const resolved = await dailyPlan.resolveEffectiveDailyPlan(harness.user.id, "2026-08-01");
        assert.deepEqual(resolved.effectiveMarks.map((item) => item.id), [result.substitute.id]);
        const summary = await createCloseTrailEngine(harness.repos).getCloseTrailSummary(trailDay.id);
        assert.equal(summary.plannedCount, 1);
        assert.equal(summary.substitutedCount, 1);
      } finally { harness.close(); }
    },
  },
  {
    name: "draft new-flow day blocks Close while historical day without state stays legacy-compatible",
    run: async () => {
      const harness = await createHarness();
      try {
        const current = await createWeeklyCandidate(harness, "draft-close-blocked");
        await createDailyPlanEngine(harness.repos).beginReplan(harness.user.id, "2026-08-01", harness.user.timezone);
        const close = createCloseTrailEngine(harness.repos);
        const readiness = await close.evaluateCloseReadiness(current.trailDay.id, "2026-08-01T22:00:00.000");
        assert.equal(readiness.reasonCode, "daily_replan_not_confirmed");
        await assert.rejects(
          () => close.closeTrailDay({ trailDayId: current.trailDay.id, closedAt: "2026-08-01T22:00:00.000", manualCloseReason: "test" }),
          CloseTrailEngineValidationError,
        );
        const historicalDay = await harness.repos.trailDays.getOrCreateTrailDay(harness.user.id, "2026-07-01");
        await harness.repos.marks.createMarkInstance({
          userId: harness.user.id,
          pathId: harness.path.id,
          trailDayId: historicalDay.id,
          title: "legacy planned mark",
          origin: MarkInstanceOrigin.ManualPlan,
          status: MarkInstanceStatus.Completed,
          completedAt: "2026-07-01T10:00:00.000Z",
          proofMediaAssetIds: [],
        });
        assert.equal((await close.getCloseTrailSummary(historicalDay.id)).plannedCount, 1);
        assert.notEqual((await close.evaluateCloseReadiness(historicalDay.id, "2026-07-01T22:00:00.000")).reasonCode, "daily_replan_not_confirmed");
      } finally { harness.close(); }
    },
  },
  {
    name: "selector rejects converging candidate roots",
    run: async () => {
      const harness = await createHarness();
      try {
        const first = await createWeeklyCandidate(harness, "converging-first");
        const second = await createWeeklyCandidate(harness, "converging-second");
        const leaf = await harness.repos.marks.createMarkInstance({
          userId: harness.user.id,
          pathId: harness.path.id,
          trailDayId: first.trailDay.id,
          title: "shared leaf",
          origin: MarkInstanceOrigin.Substitution,
          status: MarkInstanceStatus.Planned,
          proofMediaAssetIds: [],
        });
        await harness.repos.marks.updateMarkInstance(first.mark.id, { status: MarkInstanceStatus.Rescheduled, rescheduledToMarkId: leaf.id });
        await harness.repos.marks.updateMarkInstance(second.mark.id, { status: MarkInstanceStatus.Rescheduled, rescheduledToMarkId: leaf.id });
        await setDailyReplanState(harness.repos.appSettings, harness.user.id, {
          schemaVersion: 1,
          localDate: "2026-08-01",
          trailDayId: first.trailDay.id,
          timezone: harness.user.timezone,
          status: "draft",
          startedAt: "2026-08-01T06:00:00.000Z",
          candidateRootMarkIds: [first.mark.id, second.mark.id].sort(),
        });
        await assert.rejects(
          () => createDailyPlanEngine(harness.repos).resolveEffectiveDailyPlan(harness.user.id, "2026-08-01"),
          DailyPlanIntegrityError,
        );
      } finally { harness.close(); }
    },
  },
];

async function main() {
  for (const test of tests) {
    await test.run();
    console.log(`PASS ${test.name}`);
  }
  console.log(`Daily Replan tests passed: ${tests.length}/${tests.length}`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
