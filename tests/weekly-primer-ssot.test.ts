import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createSQLiteRepositoryProvider } from "../src/db/adapters";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import { MarkInstanceOrigin, MarkInstanceStatus, PathStatus, WeekPlanItemStatus, WeekPlanStatus } from "../src/domain/waymark";
import { materializeWeeklyPlannedMark } from "../src/lib/waymark";

type RunResult = {
  changes: number;
  lastInsertRowId: number;
};

class NodeSqliteAdapter {
  constructor(private readonly db: DatabaseSync) {}

  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
  }

  async runAsync(source: string, ...params: unknown[]): Promise<RunResult> {
    const result = this.db.prepare(source).run(...(params as any[]));
    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid ?? 0),
    };
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

async function createHarness() {
  const raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys = ON;");
  const db = new NodeSqliteAdapter(raw);
  await applyMigrationsAsync(db as any);
  const repos = createSQLiteRepositoryProvider(async () => db as any);
  return {
    db,
    repos,
    close: () => raw.close(),
  };
}

async function seedWeeklyPrimerHarness() {
  const harness = await createHarness();
  const now = "2026-08-08T00:00:00.000Z";
  await harness.repos.userProfiles.getOrCreateLocalUserProfile({
    userId: "user_1",
    locale: "en",
    timezone: "Asia/Saigon",
    weekStartsOn: 1,
  });
  const path = await harness.repos.paths.createPath({
    userId: "user_1",
    slug: "health",
    title: "Health",
    status: PathStatus.Active,
    sortOrder: 1,
  });
  const weekPlan = await harness.repos.weekPlans.upsertWeekPlan({
    id: "week_plan_2026_08_10",
    userId: "user_1",
    weekStartDate: "2026-08-10",
    weekEndDate: "2026-08-16",
    status: WeekPlanStatus.Active,
    createdAt: now,
    updatedAt: now,
  });
  const [item] = await harness.repos.weekPlans.upsertItems([
    {
      id: "week_item_1",
      weekPlanId: weekPlan.id,
      status: WeekPlanItemStatus.Pulled,
      localDate: "2026-08-10",
      startTime: "05:20",
      endTime: "06:15",
      title: "Workout Minimal",
      pathId: path.id,
      description: "Primer from weekly planning.",
      note: "Internal planning note must not appear as Mark Detail.",
      origin: "weekly_timetable",
      deterministicImportKey: "weekly_timetable:2026-08-10:0520:workout-minimal",
      sortOrder: 1,
      orderIndex: 1,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  return { ...harness, item: item! };
}

export async function ssot_weekly_materialization_writes_primer_to_detail_not_note() {
  const harness = await seedWeeklyPrimerHarness();
  try {
    const result = await materializeWeeklyPlannedMark(harness.repos, "user_1", harness.item, { allowOverlap: true });
    assert.equal(result.outcome, "created");
    assert.ok(result.mark);
    assert.equal(result.mark.description, "Primer from weekly planning.");

    const detail = await harness.repos.marks.getMarkInstanceDetail(result.mark.id);
    assert.equal(detail?.primerSnapshot, "Primer from weekly planning.");
    assert.equal(detail?.preActionComment, undefined);
    assert.notEqual(detail?.primerSnapshot, harness.item.note);
  } finally {
    harness.close();
  }
}

export async function ssot_planned_mark_note_updates_pre_action_comment_only() {
  const harness = await seedWeeklyPrimerHarness();
  try {
    const result = await materializeWeeklyPlannedMark(harness.repos, "user_1", harness.item, { allowOverlap: true });
    assert.ok(result.mark);
    await harness.repos.marks.upsertMarkInstanceDetail(result.mark.id, {
      preActionComment: "Typed by user before action.",
      userEditedAt: "2026-08-10T00:30:00.000Z",
    });

    const mark = await harness.repos.marks.getMarkInstanceById(result.mark.id);
    const detail = await harness.repos.marks.getMarkInstanceDetail(result.mark.id);
    assert.equal(mark?.description, "Primer from weekly planning.");
    assert.equal(detail?.primerSnapshot, "Primer from weekly planning.");
    assert.equal(detail?.preActionComment, "Typed by user before action.");
  } finally {
    harness.close();
  }
}

export async function ssot_weekly_regenerate_preserves_materialized_mark_primer_and_user_edits() {
  const harness = await seedWeeklyPrimerHarness();
  try {
    const first = await materializeWeeklyPlannedMark(harness.repos, "user_1", harness.item, { allowOverlap: true });
    assert.ok(first.mark);
    await harness.repos.marks.upsertMarkInstanceDetail(first.mark.id, {
      primerSnapshot: "User protected primer.",
      preActionComment: "User note.",
      postActionFeedback: "User feedback.",
      userEditedAt: "2026-08-10T00:30:00.000Z",
    });

    const updatedItem = {
      ...harness.item,
      description: "Changed planning primer.",
      note: "Changed internal note.",
      createdMarkInstanceId: first.mark.id,
    };
    const second = await materializeWeeklyPlannedMark(harness.repos, "user_1", updatedItem, { allowOverlap: true });
    assert.equal(second.outcome, "protected");

    const detail = await harness.repos.marks.getMarkInstanceDetail(first.mark.id);
    assert.equal(detail?.primerSnapshot, "User protected primer.");
    assert.equal(detail?.preActionComment, "User note.");
    assert.equal(detail?.postActionFeedback, "User feedback.");
  } finally {
    harness.close();
  }
}

export async function ssot_weekly_pull_backfills_missing_primer_when_only_mark_note_was_edited() {
  const harness = await seedWeeklyPrimerHarness();
  try {
    const itemWithoutPrimer = {
      ...harness.item,
      description: undefined,
    };
    const first = await materializeWeeklyPlannedMark(harness.repos, "user_1", itemWithoutPrimer, { allowOverlap: true });
    assert.ok(first.mark);
    await harness.repos.marks.upsertMarkInstanceDetail(first.mark.id, {
      preActionComment: "User-authored Mark Note.",
      userEditedAt: "2026-08-10T00:30:00.000Z",
    });

    const second = await materializeWeeklyPlannedMark(
      harness.repos,
      "user_1",
      {
        ...harness.item,
        createdMarkInstanceId: first.mark.id,
      },
      { allowOverlap: true },
    );
    assert.equal(second.outcome, "protected");
    assert.equal(second.mark?.id, first.mark.id);

    const detail = await harness.repos.marks.getMarkInstanceDetail(first.mark.id);
    assert.equal(detail?.primerSnapshot, "Primer from weekly planning.");
    assert.equal(detail?.preActionComment, "User-authored Mark Note.");
  } finally {
    harness.close();
  }
}

export async function ssot_weekly_pull_uses_created_mark_link_before_generation_key() {
  const harness = await seedWeeklyPrimerHarness();
  try {
    const first = await materializeWeeklyPlannedMark(
      harness.repos,
      "user_1",
      { ...harness.item, description: undefined },
      { allowOverlap: true },
    );
    assert.ok(first.mark);
    await harness.repos.marks.updateMarkInstance(first.mark.id, {
      generationKey: "legacy:weekly-planned-key",
    });

    const second = await materializeWeeklyPlannedMark(
      harness.repos,
      "user_1",
      {
        ...harness.item,
        createdMarkInstanceId: first.mark.id,
      },
      { allowOverlap: true },
    );
    assert.equal(second.outcome, "protected");
    assert.equal(second.mark?.id, first.mark.id);

    const marks = await harness.repos.marks.listMarkInstancesByDate("user_1", "2026-08-10");
    assert.equal(marks.length, 1);
    const detail = await harness.repos.marks.getMarkInstanceDetail(first.mark.id);
    assert.equal(detail?.primerSnapshot, "Primer from weekly planning.");
  } finally {
    harness.close();
  }
}

void (async () => {
  await ssot_weekly_materialization_writes_primer_to_detail_not_note();
  await ssot_planned_mark_note_updates_pre_action_comment_only();
  await ssot_weekly_regenerate_preserves_materialized_mark_primer_and_user_edits();
  await ssot_weekly_pull_backfills_missing_primer_when_only_mark_note_was_edited();
  await ssot_weekly_pull_uses_created_mark_link_before_generation_key();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
