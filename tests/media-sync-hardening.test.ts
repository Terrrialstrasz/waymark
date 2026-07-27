import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createSQLiteRepositoryProvider } from "../src/db/adapters";
import { applyMigrationsAsync } from "../src/db/migrations/runner";
import { MediaAssetKind, MemoryPrivacy, type UserProfile } from "../src/domain/waymark";
import { createJournalMemoryCapture } from "../src/app/journalMemoryCapture";

type PendingMediaHardeningTest = {
  name: string;
  pendingReason: string;
};

export const mediaSyncHardeningAcceptanceTests: PendingMediaHardeningTest[] = [
  {
    name: "ssot_media_create_memory_photo_upload_fail_keeps_memory_and_marks_media_failed",
    pendingReason: "Phase 1 must keep Memory canonical when media persistence/upload fails.",
  },
  {
    name: "ssot_drive_upload_retry_reuses_existing_drive_file_for_media_asset",
    pendingReason: "Phase 1/2 must assert Drive upload idempotency by media asset appProperties.",
  },
  {
    name: "ssot_journal_missing_local_media_does_not_render_ghost_poster",
    pendingReason: "Phase 1 must keep media rendering behind file-existence-aware selectors.",
  },
];

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
  const adapter = new NodeSqliteAdapter(database);
  await applyMigrationsAsync(adapter as any);
  const repos = createSQLiteRepositoryProvider(async () => adapter as any, async () => adapter as any, false);
  return { db: adapter, repos, close: () => database.close() };
}

export function assertMediaSyncHardeningSkeleton() {
  assert.deepEqual(
    mediaSyncHardeningAcceptanceTests.map((test) => test.name),
    [
      "ssot_media_create_memory_photo_upload_fail_keeps_memory_and_marks_media_failed",
      "ssot_drive_upload_retry_reuses_existing_drive_file_for_media_asset",
      "ssot_journal_missing_local_media_does_not_render_ghost_poster",
    ],
  );
}

async function runExecutablePhase1Tests() {
  assertMediaSyncHardeningSkeleton();

  {
    const harness = await createHarness();
    try {
      const user: UserProfile = {
        id: "user_1",
        userId: "user_1",
        locale: "en",
        timezone: "UTC",
        weekStartsOn: 1,
        createdAt: "2026-07-09T00:00:00.000Z",
        updatedAt: "2026-07-09T00:00:00.000Z",
      };

      await assert.rejects(
        () =>
          createJournalMemoryCapture({
            repositories: harness.repos,
            user,
            locale: "en",
            title: "Memory survives media failure",
            noteDetail: "Keep the canonical memory row.",
            mediaAttachments: [
              {
                uri: "file:///tmp/missing.jpg",
                kind: MediaAssetKind.Image,
                mimeType: "image/jpeg",
              },
            ],
            persistMediaAttachment: async () => {
              throw new Error("forced media persist failure");
            },
          }),
        /forced media persist failure/,
      );

      const memory = await harness.db.getFirstAsync<{ id: string; title: string; privacy: string; deleted_at: number | null }>(
        "SELECT id, title, privacy, deleted_at FROM memories WHERE title = ? LIMIT 1;",
        "Memory survives media failure",
      );
      assert.equal(memory?.title, "Memory survives media failure");
      assert.equal(memory?.privacy, MemoryPrivacy.Private);
      assert.equal(memory?.deleted_at, null);
    } finally {
      harness.close();
    }
  }
}

void runExecutablePhase1Tests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
