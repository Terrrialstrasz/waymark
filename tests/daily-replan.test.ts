import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createSQLiteRepositoryProvider } from "../src/db/adapters";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import {
  MarkInstanceOrigin,
  MarkInstanceStatus,
  MemoryPrivacy,
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
  setCloseTrailRuleConfig,
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

async function seedDisciplineRules(harness: Awaited<ReturnType<typeof createHarness>>) {
  await setCloseTrailRuleConfig(harness.repos.appSettings, harness.user.id, {
    id: "daily-replan-disciplines",
    sourceSeedId: "daily-replan-test",
    disciplines: [
      { key: "discipline-a", label: "Discipline A", pathId: harness.path.id },
      { key: "discipline-b", label: "Discipline B", pathId: harness.path.id },
    ],
  });
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
    name: "empty confirmed first open reopens draft when weekly timetable marks arrive later",
    run: async () => {
      const harness = await createHarness();
      try {
        const dailyPlan = createDailyPlanEngine(harness.repos);
        const empty = await dailyPlan.beginReplan(harness.user.id, "2026-08-01", harness.user.timezone, "2026-08-01T06:00:00.000Z");
        assert.equal(empty.membership, "confirmed");
        assert.deepEqual(empty.candidateRootMarkIds, []);

        const { mark } = await createWeeklyCandidate(harness, "late-weekly-mark");
        const reopened = await dailyPlan.beginReplan(harness.user.id, "2026-08-01", harness.user.timezone, "2026-08-01T06:05:00.000Z");
        assert.equal(reopened.membership, "draft");
        assert.deepEqual(reopened.candidateRootMarkIds, [mark.id]);
        assert.deepEqual(reopened.effectiveMarks.map((item) => item.id), [mark.id]);

        const state = await getDailyReplanState(harness.repos.appSettings, harness.user.id, "2026-08-01");
        assert.equal(state?.status, "draft");
      } finally { harness.close(); }
    },
  },
  {
    name: "begin replan self-heals a stale state whose root mark was cleared locally",
    run: async () => {
      const harness = await createHarness();
      try {
        const stale = await createWeeklyCandidate(harness, "stale-root");
        await setDailyReplanState(harness.repos.appSettings, harness.user.id, {
          schemaVersion: 2,
          localDate: "2026-08-01",
          trailDayId: stale.trailDay.id,
          timezone: harness.user.timezone,
          status: "draft",
          startedAt: "2026-08-01T06:00:00.000Z",
          candidateRootMarkIds: [stale.mark.id],
        });
        await harness.repos.marks.softDeleteMarkInstance(stale.mark.id);

        const restored = await createWeeklyCandidate(harness, "restored-root");
        const plan = await createDailyPlanEngine(harness.repos).beginReplan(
          harness.user.id,
          "2026-08-01",
          harness.user.timezone,
          "2026-08-01T06:10:00.000Z",
        );

        assert.deepEqual(plan.candidateRootMarkIds, [restored.mark.id]);
        assert.deepEqual(
          (await getDailyReplanState(harness.repos.appSettings, harness.user.id, "2026-08-01"))?.candidateRootMarkIds,
          [restored.mark.id],
        );
      } finally { harness.close(); }
    },
  },
  {
    name: "confirmed execution move keeps root snapshot and transfers unresolved signal intent",
    run: async () => {
      const harness = await createHarness();
      try {
        const { mark, trailDay } = await createWeeklyCandidate(harness, "move-after-confirm");
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
        assert.deepEqual(state?.status === "confirmed" && state.schemaVersion === 2 ? state.confirmedPlanEntries : [], [
          { rootMarkId: mark.id, baselineLeafMarkId: mark.id },
        ]);
        assert.equal((await dailyPlan.resolveEffectiveDailyPlan(harness.user.id, "2026-08-01")).effectiveMarks.length, 0);
        const summary = await createCloseTrailEngine(harness.repos).getCloseTrailSummary(trailDay.id);
        assert.equal(summary.plannedCount, 1);
        assert.equal(summary.completedCount, 0);
        assert.equal(summary.rescheduledCount, 1);
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
        assert.equal(summary.plannedCount, 1);
        assert.equal(summary.completedCount, 0);
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
    name: "draft replan exclusions happen before the confirmed denominator is frozen",
    run: async () => {
      const harness = await createHarness();
      try {
        const skipped = await createWeeklyCandidate(harness, "preconfirm-skip");
        const moved = await createWeeklyCandidate(harness, "preconfirm-move");
        const substituted = await createWeeklyCandidate(harness, "preconfirm-substitute");
        const dailyPlan = createDailyPlanEngine(harness.repos);
        await dailyPlan.beginReplan(harness.user.id, "2026-08-01", harness.user.timezone, "2026-08-01T06:00:00.000Z");
        const markEngine = createMarkEngine(harness.repos);
        await markEngine.skipMarkInstance({
          markInstanceId: skipped.mark.id,
          skippedAt: "2026-08-01T06:01:00.000Z",
        });
        await markEngine.rescheduleMarkInstance({
          markInstanceId: moved.mark.id,
          targetLocalDate: "2026-08-02",
        });
        const replacement = await markEngine.substituteMarkInstance({
          markInstanceId: substituted.mark.id,
          substituteTitle: "preconfirm substitute leaf",
          substituteMode: { mode: "ready" },
        });

        await dailyPlan.confirmReplan(harness.user.id, "2026-08-01", "2026-08-01T06:05:00.000Z");
        await markEngine.completeMarkInstance({
          markInstanceId: replacement.substitute.id,
          completedAt: "2026-08-01T07:00:00.000Z",
        });

        const state = await getDailyReplanState(harness.repos.appSettings, harness.user.id, "2026-08-01");
        assert.deepEqual(state?.status === "confirmed" && state.schemaVersion === 2 ? state.confirmedPlanEntries : [], [
          { rootMarkId: substituted.mark.id, baselineLeafMarkId: replacement.substitute.id },
        ]);
        const summary = await createCloseTrailEngine(harness.repos).getCloseTrailSummary(substituted.trailDay.id);
        assert.equal(summary.plannedCount, 1);
        assert.equal(summary.completedCount, 1);
        assert.equal(summary.skippedCount, 0);
        assert.equal(summary.rescheduledCount, 0);
        assert.equal(summary.substitutedCount, 0);
      } finally { harness.close(); }
    },
  },
  {
    name: "carry-over baseline does not count the historical move on the target day",
    run: async () => {
      const harness = await createHarness();
      try {
        const source = await createWeeklyCandidate(harness, "carry-over-source", "2026-08-01");
        const moved = await createMarkEngine(harness.repos).rescheduleMarkInstance({
          markInstanceId: source.mark.id,
          targetLocalDate: "2026-08-02",
        });
        const dailyPlan = createDailyPlanEngine(harness.repos);
        await dailyPlan.beginReplan(harness.user.id, "2026-08-02", harness.user.timezone, "2026-08-02T06:00:00.000Z");
        await dailyPlan.confirmReplan(harness.user.id, "2026-08-02", "2026-08-02T06:05:00.000Z");
        const targetTrailDay = await harness.repos.trailDays.getTrailDayById(moved.replacement.trailDayId);
        assert.ok(targetTrailDay);

        const state = await getDailyReplanState(harness.repos.appSettings, harness.user.id, "2026-08-02");
        assert.deepEqual(state?.status === "confirmed" && state.schemaVersion === 2 ? state.confirmedPlanEntries : [], [
          { rootMarkId: source.mark.id, baselineLeafMarkId: moved.replacement.id },
        ]);
        const summary = await createCloseTrailEngine(harness.repos).getCloseTrailSummary(targetTrailDay!.id);
        assert.equal(summary.plannedCount, 1);
        assert.equal(summary.rescheduledCount, 0);
        assert.equal(summary.unresolvedCount, 1);
      } finally { harness.close(); }
    },
  },
  {
    name: "move into an existing target draft merges the incoming weekly root",
    run: async () => {
      const harness = await createHarness();
      try {
        const source = await createWeeklyCandidate(harness, "draft-incoming-source", "2026-08-01");
        const target = await createWeeklyCandidate(harness, "draft-existing-target", "2026-08-02");
        const dailyPlan = createDailyPlanEngine(harness.repos);
        await dailyPlan.beginReplan(
          harness.user.id,
          "2026-08-02",
          harness.user.timezone,
          "2026-08-02T06:00:00.000Z",
        );

        const moved = await createMarkEngine(harness.repos).rescheduleMarkInstance({
          markInstanceId: source.mark.id,
          targetLocalDate: "2026-08-02",
        });

        const state = await getDailyReplanState(harness.repos.appSettings, harness.user.id, "2026-08-02");
        assert.equal(state?.status, "draft");
        assert.deepEqual(state?.candidateRootMarkIds, [source.mark.id, target.mark.id].sort());
        const resolved = await dailyPlan.resolveEffectiveDailyPlan(harness.user.id, "2026-08-02");
        assert.deepEqual(
          new Set(resolved.effectiveMarks.map((mark) => mark.id)),
          new Set([target.mark.id, moved.replacement.id]),
        );
      } finally { harness.close(); }
    },
  },
  {
    name: "move into a confirmed target reopens replan with the incoming weekly root",
    run: async () => {
      const harness = await createHarness();
      try {
        const source = await createWeeklyCandidate(harness, "confirmed-incoming-source", "2026-08-01");
        const target = await createWeeklyCandidate(harness, "confirmed-existing-target", "2026-08-02");
        const dailyPlan = createDailyPlanEngine(harness.repos);
        await dailyPlan.beginReplan(
          harness.user.id,
          "2026-08-02",
          harness.user.timezone,
          "2026-08-02T06:00:00.000Z",
        );
        await dailyPlan.confirmReplan(harness.user.id, "2026-08-02", "2026-08-02T06:05:00.000Z");

        const moved = await createMarkEngine(harness.repos).rescheduleMarkInstance({
          markInstanceId: source.mark.id,
          targetLocalDate: "2026-08-02",
        });

        const state = await getDailyReplanState(harness.repos.appSettings, harness.user.id, "2026-08-02");
        assert.equal(state?.status, "draft");
        assert.deepEqual(state?.candidateRootMarkIds, [source.mark.id, target.mark.id].sort());
        const resolved = await dailyPlan.resolveEffectiveDailyPlan(harness.user.id, "2026-08-02");
        assert.equal(resolved.membership, "draft");
        assert.deepEqual(
          new Set(resolved.effectiveMarks.map((mark) => mark.id)),
          new Set([target.mark.id, moved.replacement.id]),
        );
      } finally { harness.close(); }
    },
  },
  {
    name: "Aug 4 style replan keeps pre-confirm exclusions out and post-confirm skips in",
    run: async () => {
      const harness = await createHarness();
      try {
        const entries = [];
        for (let index = 0; index < 13; index += 1) {
          entries.push(await createWeeklyCandidate(harness, `aug4-mark-${index}`, "2026-08-04"));
        }
        const dailyPlan = createDailyPlanEngine(harness.repos);
        await dailyPlan.beginReplan(harness.user.id, "2026-08-04", harness.user.timezone, "2026-08-04T06:26:27.000Z");
        const markEngine = createMarkEngine(harness.repos);
        for (const entry of entries.slice(0, 3)) {
          await markEngine.skipMarkInstance({
            markInstanceId: entry.mark.id,
            skippedAt: "2026-08-04T06:28:00.000Z",
          });
        }
        await markEngine.substituteMarkInstance({
          markInstanceId: entries[3]!.mark.id,
          substituteTitle: "aug4 preconfirm substitute",
          substituteMode: { mode: "ready" },
        });
        const confirmed = await dailyPlan.confirmReplan(harness.user.id, "2026-08-04", "2026-08-04T06:30:19.000Z");
        assert.equal(
          confirmed.state?.status === "confirmed" && confirmed.state.schemaVersion === 2
            ? confirmed.state.confirmedPlanEntries.length
            : 0,
          10,
        );

        for (const entry of entries.slice(4, 6)) {
          await markEngine.completeMarkInstance({
            markInstanceId: entry.mark.id,
            completedAt: "2026-08-04T07:00:00.000Z",
          });
        }
        for (const entry of entries.slice(6, 8)) {
          await markEngine.skipMarkInstance({
            markInstanceId: entry.mark.id,
            skippedAt: "2026-08-04T07:50:00.000Z",
          });
        }

        const summary = await createCloseTrailEngine(harness.repos).getCloseTrailSummary(entries[0]!.trailDay.id);
        assert.equal(summary.plannedCount, 10);
        assert.equal(summary.completedCount, 2);
        assert.equal(summary.skippedCount, 2);
        assert.equal(summary.rescheduledCount, 0);
        assert.equal(summary.substitutedCount, 0);
        assert.equal(summary.unresolvedCount, 6);
        const trailDay = await harness.repos.trailDays.getTrailDayById(entries[0]!.trailDay.id);
        assert.equal(trailDay?.plannedMarkCount, 10);
        assert.equal(trailDay?.completedMarkCount, 2);
        assert.equal(trailDay?.skippedMarkCount, 2);
      } finally { harness.close(); }
    },
  },
  {
    name: "Close Trail judges the Aug 3 post-confirm outcome from confirmed commitments",
    run: async () => {
      const harness = await createHarness();
      try {
        await seedDisciplineRules(harness);
        const entries = [];
        for (let index = 0; index < 12; index += 1) {
          entries.push(await createWeeklyCandidate(harness, `aug3-mark-${index}`, "2026-08-03"));
        }
        const dailyPlan = createDailyPlanEngine(harness.repos);
        await dailyPlan.beginReplan(harness.user.id, "2026-08-03", harness.user.timezone, "2026-08-03T06:49:29.000Z");
        await dailyPlan.confirmReplan(harness.user.id, "2026-08-03", "2026-08-03T06:50:32.000Z");
        const markEngine = createMarkEngine(harness.repos);

        for (const entry of entries.slice(0, 5)) {
          await markEngine.completeMarkInstance({
            markInstanceId: entry.mark.id,
            completedAt: "2026-08-03T18:00:00.000Z",
          });
        }
        for (const entry of entries.slice(5, 9)) {
          await markEngine.skipMarkInstance({
            markInstanceId: entry.mark.id,
            skippedAt: "2026-08-03T21:02:00.000Z",
          });
        }
        for (const entry of entries.slice(9, 11)) {
          await markEngine.rescheduleMarkInstance({
            markInstanceId: entry.mark.id,
            targetLocalDate: "2026-08-04",
          });
        }
        await markEngine.substituteMarkInstance({
          markInstanceId: entries[11]!.mark.id,
          substituteTitle: "aug3 completed substitute",
          substituteMode: {
            mode: "completed_now",
            completedAt: "2026-08-03T21:03:50.000Z",
          },
        });
        await harness.repos.memories.createMemory({
          userId: harness.user.id,
          trailDayId: entries[0]!.trailDay.id,
          pathId: harness.path.id,
          title: "Aug 3 memory",
          capturedAt: "2026-08-03T21:01:17.000Z",
          privacy: MemoryPrivacy.Private,
        });

        const result = await createCloseTrailEngine(harness.repos).closeTrailDay({
          trailDayId: entries[0]!.trailDay.id,
          closedAt: "2026-08-03T21:03:56.000Z",
          disciplineSelections: [
            { key: "discipline-a", label: "Discipline A", pathId: harness.path.id },
            { key: "discipline-b", label: "Discipline B", pathId: harness.path.id },
          ],
        });

        assert.equal(result.summary.plannedCount, 12);
        assert.equal(result.summary.completedCount, 6);
        assert.equal(result.summary.skippedCount, 4);
        assert.equal(result.summary.rescheduledCount, 2);
        assert.equal(result.summary.substitutedCount, 1);
        assert.equal(result.judgment.day.passed, false);
        assert.equal(result.judgment.character.passed, false);
        assert.equal(result.judgment.character.completedCharacterItems, 8);
        assert.equal(result.judgment.character.totalCharacterItems, 14);
        const trailDay = await harness.repos.trailDays.getTrailDayById(entries[0]!.trailDay.id);
        assert.equal(trailDay?.plannedMarkCount, 12);
        assert.equal(trailDay?.completedMarkCount, 6);
        assert.equal(trailDay?.skippedMarkCount, 4);
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
