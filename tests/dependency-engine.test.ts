import assert from "node:assert/strict";
import { createSQLiteRepositoryProvider } from "../src/db/adapters";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import {
  DependencyRequiredEntityType,
  DependencyStatus,
  DependencyType,
  MarkInstanceOrigin,
  MarkInstanceStatus,
  PackCheckInstanceStatus,
} from "../src/domain/waymark";
import { createDependencyEngine } from "../src/lib/waymark/dependencyEngine";

import { DatabaseSync } from "node:sqlite";

class NodeSqliteAdapter {
  constructor(private readonly db: DatabaseSync) {}
  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
  }
  async runAsync(source: string, ...params: unknown[]): Promise<any> {
    return this.db.prepare(source).run(...(params as any[]));
  }
  async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
    return (this.db.prepare(source).get(...(params as any[])) as T | undefined) ?? null;
  }
  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    return this.db.prepare(source).all(...(params as any[])) as T[];
  }
  async withExclusiveTransactionAsync(task: (txn: NodeSqliteAdapter) => Promise<void>): Promise<void> {
    this.db.exec("BEGIN IMMEDIATE;");
    const txn = new NodeSqliteAdapter(this.db);
    try {
      await task(txn);
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }
}

async function createHarness() {
  const database = new DatabaseSync(":memory:");
  const adapter = new NodeSqliteAdapter(database as any);
  await applyMigrationsAsync(adapter as any);
  const repos = createSQLiteRepositoryProvider(async () => adapter as any, async () => adapter as any, false);
  return { db: adapter, repos, close: () => database.close() };
}

async function createPathAndTrailDay(harness: Awaited<ReturnType<typeof createHarness>>, userId: string, localDate: string) {
  const path = await harness.repos.paths.createPath({ userId, slug: `p-${localDate}`, title: `P ${localDate}`, sortOrder: 0 });
  const trailDay = await harness.repos.trailDays.getOrCreateTrailDay(userId, localDate);
  return { path, trailDay };
}

async function runTests() {
  // Test 1: Mark blocked by incomplete PackCheckInstance
  {
    const harness = await createHarness();
    try {
      const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-05-21");
      const mark = await harness.repos.marks.createMarkInstance({
        userId: "user_1",
        pathId: path.id,
        trailDayId: trailDay.id,
        title: "Workout",
        origin: MarkInstanceOrigin.ManualPlan,
        status: MarkInstanceStatus.Planned,
      });
      const packTemplate = await harness.repos.packChecks.upsertTemplate({ id: "pct_1", userId: "user_1", title: "Bag", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      const packInstance = await harness.repos.packChecks.upsertInstance({ id: "pci_1", userId: "user_1", templateId: packTemplate.id, trailDayId: trailDay.id, targetMarkInstanceId: mark.id, title: "Bag", status: PackCheckInstanceStatus.Available, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

      await harness.repos.dependencies.createDependency({ dependentMarkInstanceId: mark.id, dependencyType: DependencyType.PackCheckCompleted, requiredEntityType: DependencyRequiredEntityType.PackCheckInstance, requiredEntityId: packInstance.id, isRequired: true, status: DependencyStatus.Pending });

      const engine = createDependencyEngine(harness.repos);
      const evalRes = await engine.evaluateMarkReadiness(mark.id);
      assert.equal(evalRes.isReady, false);
      assert.equal(evalRes.blockingReasons.length, 1);
    } finally {
      harness.close();
    }
  }

  // Test 2: Mark becomes completable after required PackCheckInstance is completed
  {
    const harness = await createHarness();
    try {
      const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-05-22");
      const mark = await harness.repos.marks.createMarkInstance({
        userId: "user_1",
        pathId: path.id,
        trailDayId: trailDay.id,
        title: "Workout",
        origin: MarkInstanceOrigin.ManualPlan,
        status: MarkInstanceStatus.Planned,
      });
      const packTemplate = await harness.repos.packChecks.upsertTemplate({ id: "pct_2", userId: "user_1", title: "Bag2", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      const packInstance = await harness.repos.packChecks.upsertInstance({ id: "pci_2", userId: "user_1", templateId: packTemplate.id, trailDayId: trailDay.id, targetMarkInstanceId: mark.id, title: "Bag2", status: PackCheckInstanceStatus.Available, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

      await harness.repos.dependencies.createDependency({ dependentMarkInstanceId: mark.id, dependencyType: DependencyType.PackCheckCompleted, requiredEntityType: DependencyRequiredEntityType.PackCheckInstance, requiredEntityId: packInstance.id, isRequired: true, status: DependencyStatus.Pending });

      const engine = createDependencyEngine(harness.repos);
      // complete pack check instance
      await harness.repos.packChecks.upsertInstance({ ...packInstance, status: PackCheckInstanceStatus.Completed, updatedAt: new Date().toISOString() });
      // mark dependencies satisfied
      await engine.satisfyDependenciesByRequiredEntity({
        requiredEntityType: DependencyRequiredEntityType.PackCheckInstance,
        requiredEntityId: packInstance.id,
      });

      const evalRes = await engine.evaluateMarkReadiness(mark.id);
      assert.equal(evalRes.isReady, true);
      assert.equal(evalRes.isReady, true);
    } finally {
      harness.close();
    }
  }

  // Test 3: Expired PackCheckInstance does not satisfy dependency
  {
    const harness = await createHarness();
    try {
      const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-05-23");
      const mark = await harness.repos.marks.createMarkInstance({
        userId: "user_1",
        pathId: path.id,
        trailDayId: trailDay.id,
        title: "Workout",
        origin: MarkInstanceOrigin.ManualPlan,
        status: MarkInstanceStatus.Planned,
      });
      const packTemplate = await harness.repos.packChecks.upsertTemplate({ id: "pct_3", userId: "user_1", title: "Bag3", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      const packInstance = await harness.repos.packChecks.upsertInstance({ id: "pci_3", userId: "user_1", templateId: packTemplate.id, trailDayId: trailDay.id, targetMarkInstanceId: mark.id, title: "Bag3", status: PackCheckInstanceStatus.Available, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

      await harness.repos.dependencies.createDependency({ dependentMarkInstanceId: mark.id, dependencyType: DependencyType.PackCheckCompleted, requiredEntityType: DependencyRequiredEntityType.PackCheckInstance, requiredEntityId: packInstance.id, isRequired: true, status: DependencyStatus.Pending });

      const engine = createDependencyEngine(harness.repos);
      // expire pack check
      await harness.repos.packChecks.upsertInstance({ ...packInstance, status: PackCheckInstanceStatus.Expired, updatedAt: new Date().toISOString() });
      // do NOT mark satisfied
      const evalRes = await engine.evaluateMarkReadiness(mark.id);
      assert.equal(evalRes.isReady, false);
      assert.equal(evalRes.isReady, false);
    } finally {
      harness.close();
    }
  }

  // Test 4: Completing one PackCheckInstance must not satisfy dependency for another
  {
    const harness = await createHarness();
    try {
      const { path, trailDay } = await createPathAndTrailDay(harness, "user_1", "2026-05-24");
      const mark = await harness.repos.marks.createMarkInstance({
        userId: "user_1",
        pathId: path.id,
        trailDayId: trailDay.id,
        title: "Workout",
        origin: MarkInstanceOrigin.ManualPlan,
        status: MarkInstanceStatus.Planned,
      });
      const packTemplate = await harness.repos.packChecks.upsertTemplate({ id: "pct_4", userId: "user_1", title: "Bag4", isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      const packA = await harness.repos.packChecks.upsertInstance({ id: "pci_4a", userId: "user_1", templateId: packTemplate.id, trailDayId: trailDay.id, targetMarkInstanceId: mark.id, title: "BagA", status: PackCheckInstanceStatus.Available, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      const packB = await harness.repos.packChecks.upsertInstance({ id: "pci_4b", userId: "user_1", templateId: packTemplate.id, trailDayId: trailDay.id, targetMarkInstanceId: mark.id, title: "BagB", status: PackCheckInstanceStatus.Available, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

      await harness.repos.dependencies.createDependency({ dependentMarkInstanceId: mark.id, dependencyType: DependencyType.PackCheckCompleted, requiredEntityType: DependencyRequiredEntityType.PackCheckInstance, requiredEntityId: packA.id, isRequired: true, status: DependencyStatus.Pending });
      await harness.repos.dependencies.createDependency({ dependentMarkInstanceId: mark.id, dependencyType: DependencyType.PackCheckCompleted, requiredEntityType: DependencyRequiredEntityType.PackCheckInstance, requiredEntityId: packB.id, isRequired: true, status: DependencyStatus.Pending });

      const engine = createDependencyEngine(harness.repos);
      // satisfy packA only
      await harness.repos.packChecks.upsertInstance({ ...packA, status: PackCheckInstanceStatus.Completed, updatedAt: new Date().toISOString() });
      await engine.satisfyDependenciesByRequiredEntity({
        requiredEntityType: DependencyRequiredEntityType.PackCheckInstance,
        requiredEntityId: packA.id,
      });

      const evalRes = await engine.evaluateMarkReadiness(mark.id);
      const unmet = evalRes.dependencies.filter((dependency) => dependency.status === DependencyStatus.Pending);
      assert.equal(unmet.length, 1);
      assert.equal(unmet[0].requiredEntityId, packB.id);
    } finally {
      harness.close();
    }
  }
}

runTests().then(() => console.log("dependency-engine tests passed")).catch((e) => { console.error(e); process.exit(1); });
