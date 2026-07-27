import { createClient, type Client, type InStatement } from "@tursodatabase/serverless/compat";
import type { SyncOutboxRow } from "./ssotOutbox";
import type { TursoProjectionRecord } from "./tursoProjection";
import {
  getWaymarkTursoPlanningSchemaSql,
  WAYMARK_TURSO_DEV_CLEAR_TABLES,
  type WaymarkTursoPlanningEntityType,
} from "./tursoPlanningSchema";

export type WaymarkTursoConfig = {
  url: string;
  authToken: string;
};

export type WaymarkTursoPushResult = {
  remoteRevision: number;
  entityType: string;
  entityId: string;
  idempotencyKey: string;
  duplicate: boolean;
};

export type WaymarkTursoPurgeResult = {
  requestedRows: number;
  idempotencyKeys: number;
  entityRecords: number;
  clearedTables?: string[];
};

export type WaymarkTursoDevPurgeInput = {
  vaultId: string;
  outboxRows?: readonly SyncOutboxRow[];
};

type RemoteRow = {
  vault_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  remote_revision: number | bigint;
  last_idempotency_key: string;
  payload_json: string;
  deleted_at: number | bigint | null;
  updated_at: number | bigint;
};

type PlanningChangeRow = {
  change_sequence: number | bigint;
  vault_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  entity_revision: number | bigint;
  payload_snapshot: string;
  payload_schema_version: number | bigint;
  deleted_at: number | bigint | null;
  updated_at: number | bigint;
  mutation_id: string | null;
  created_at: number | bigint;
};

export type TursoPlanningChangeRecord = {
  changeSequence: number;
  vaultId: string;
  entityType: WaymarkTursoPlanningEntityType;
  entityId: string;
  operation: "create" | "update" | "delete";
  entityRevision: number;
  payloadSnapshot: Record<string, unknown>;
  payloadSchemaVersion: number;
  deletedAt: number | null;
  updatedAt: number;
  mutationId: string | null;
  createdAt: number;
};

export type TursoPlanningWeekPlanSnapshot = {
  id: string;
  vaultId: string;
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  status: string;
  summary: string | null;
  note: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type TursoPlanningWeekPlanItemSnapshot = {
  id: string;
  vaultId: string;
  userId: string;
  weekPlanId: string;
  backlogItemId: string | null;
  status: string;
  localDate: string | null;
  startTime: string | null;
  endTime: string | null;
  title: string | null;
  pathId: string | null;
  templateId: string | null;
  expeditionId: string | null;
  milestoneId: string | null;
  expeditionContext: string | null;
  milestoneContext: string | null;
  description: string | null;
  note: string | null;
  origin: string | null;
  blockKey: string | null;
  deterministicImportKey: string | null;
  importBatchId: string | null;
  createdMarkInstanceId: string | null;
  sortOrder: number;
  orderIndex: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type TursoPlanningPathSnapshot = {
  id: string;
  vaultId: string;
  userId: string;
  name: string;
  subtitle: string | null;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  colorToken: string | null;
  iconKey: string | null;
  sortOrder: number;
  isActive: number;
  heroMediaAssetId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type TursoPlanningExpeditionSnapshot = {
  id: string;
  vaultId: string;
  userId: string;
  pathId: string;
  title: string;
  purpose: string | null;
  description: string | null;
  status: string;
  sortOrder: number;
  startDate: string | null;
  targetDate: string | null;
  startedAt: number | null;
  targetEndAt: number | null;
  completedAt: number | null;
  heroMediaAssetId: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type TursoPlanningMarkInstanceSnapshot = {
  id: string;
  vaultId: string;
  userId: string;
  pathId: string;
  trailDayId: string;
  templateId: string | null;
  expeditionId: string | null;
  milestoneId: string | null;
  title: string;
  description: string | null;
  origin: string;
  status: string;
  scheduledStartAt: number | null;
  scheduledEndAt: number | null;
  dueAt: number | null;
  completedAt: number | null;
  skippedAt: number | null;
  expiredAt: number | null;
  proofNote: string | null;
  completionSummary: string | null;
  substitutedByMarkId: string | null;
  rescheduledToMarkId: string | null;
  sourceBacklogItemId: string | null;
  generationKey: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type TursoPlanningMutationResult = {
  changeSequence: number;
  entityType: WaymarkTursoPlanningEntityType;
  entityId: string;
  mutationId: string;
  duplicate: boolean;
};

const REMOTE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS waymark_remote_records (
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  remote_revision INTEGER NOT NULL,
  last_idempotency_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_schema_version INTEGER NOT NULL DEFAULT 1,
  deleted_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (vault_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS waymark_remote_change_log (
  remote_revision INTEGER PRIMARY KEY AUTOINCREMENT,
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload_json TEXT NOT NULL,
  payload_schema_version INTEGER NOT NULL DEFAULT 1,
  deleted_at INTEGER,
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS waymark_remote_idempotency (
  idempotency_key TEXT PRIMARY KEY NOT NULL,
  vault_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  remote_revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waymark_remote_change_log_vault_revision
  ON waymark_remote_change_log(vault_id, remote_revision);

CREATE INDEX IF NOT EXISTS idx_waymark_remote_records_entity
  ON waymark_remote_records(entity_type, entity_id);
`;

export function createWaymarkTursoClient(config: WaymarkTursoConfig): Client {
  if (!config.url || !config.authToken) {
    throw new Error("Turso config requires url and authToken.");
  }
  return createClient({
    url: config.url,
    authToken: config.authToken,
  });
}

export function getWaymarkTursoRemoteSchemaSql(): string {
  return `${REMOTE_SCHEMA_SQL}\n${getWaymarkTursoPlanningSchemaSql()}`;
}

export class WaymarkTursoRemoteAdapter {
  constructor(private readonly client: Client) {}

  async ensureSchema(): Promise<void> {
    await repairPlanningSchemaResidue(this.client);
    await this.client.executeMultiple(getWaymarkTursoRemoteSchemaSql());
  }

  async pushOutboxRow(row: SyncOutboxRow): Promise<WaymarkTursoPushResult> {
    const existing = await this.findIdempotency(row.idempotency_key);
    if (existing) {
      return {
        remoteRevision: toNumber(existing.remote_revision as number | bigint),
        entityType: String(existing.entity_type),
        entityId: String(existing.entity_id),
        idempotencyKey: row.idempotency_key,
        duplicate: true,
      };
    }

    const payload = JSON.parse(row.payload_json) as Record<string, unknown>;
    const deletedAt = typeof payload.deleted_at === "number" ? payload.deleted_at : null;
    const now = Date.now();
    const tx = await this.client.transaction("write");

    try {
      const insertedChange = await tx.execute({
        sql: `INSERT INTO waymark_remote_change_log (
          vault_id,
          entity_type,
          entity_id,
          operation,
          payload_json,
          payload_schema_version,
          deleted_at,
          updated_at,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          row.vault_id,
          row.entity_type,
          row.entity_id,
          row.operation,
          row.payload_json,
          row.payload_schema_version,
          deletedAt,
          row.updated_at,
          now,
        ],
      });
      const remoteRevision = toNumber(insertedChange.lastInsertRowid);

      await tx.execute({
        sql: `INSERT INTO waymark_remote_records (
          vault_id,
          entity_type,
          entity_id,
          operation,
          remote_revision,
          last_idempotency_key,
          payload_json,
          payload_schema_version,
          deleted_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(vault_id, entity_type, entity_id) DO UPDATE SET
          operation = excluded.operation,
          remote_revision = excluded.remote_revision,
          last_idempotency_key = excluded.last_idempotency_key,
          payload_json = excluded.payload_json,
          payload_schema_version = excluded.payload_schema_version,
          deleted_at = excluded.deleted_at,
          updated_at = excluded.updated_at;`,
        args: [
          row.vault_id,
          row.entity_type,
          row.entity_id,
          row.operation,
          remoteRevision,
          row.idempotency_key,
          row.payload_json,
          row.payload_schema_version,
          deletedAt,
          row.updated_at,
        ],
      });

      await tx.execute({
        sql: `INSERT INTO waymark_remote_idempotency (
          idempotency_key,
          vault_id,
          entity_type,
          entity_id,
          operation,
          remote_revision,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        args: [
          row.idempotency_key,
          row.vault_id,
          row.entity_type,
          row.entity_id,
          row.operation,
          remoteRevision,
          now,
        ],
      });

      await tx.commit();
      return {
        remoteRevision,
        entityType: row.entity_type,
        entityId: row.entity_id,
        idempotencyKey: row.idempotency_key,
        duplicate: false,
      };
    } catch (error) {
      try {
        await tx.rollback();
      } catch (rollbackError) {
        console.warn("[Waymark Turso] Remote transaction rollback failed after push error.", rollbackError);
      }
      throw error;
    } finally {
      try {
        tx.close();
      } catch (closeError) {
        console.warn("[Waymark Turso] Remote transaction close failed.", closeError);
      }
    }
  }

  async listChangesSince(input: {
    vaultId: string;
    afterRemoteRevision: number;
    entityTypes?: readonly string[];
    limit?: number;
  }): Promise<TursoProjectionRecord[]> {
    const entityFilter = input.entityTypes?.length
      ? `AND entity_type IN (${input.entityTypes.map(() => "?").join(", ")})`
      : "";
    const args = [
      input.vaultId,
      input.afterRemoteRevision,
      ...(input.entityTypes ?? []),
      input.limit ?? 100,
    ];
    const result = await this.client.execute({
      sql: `SELECT
          vault_id,
          entity_type,
          entity_id,
          operation,
          remote_revision,
          payload_json,
          deleted_at,
          updated_at
        FROM waymark_remote_change_log
        WHERE vault_id = ? AND remote_revision > ?
        ${entityFilter}
        ORDER BY remote_revision ASC
        LIMIT ?;`,
      args,
    });

    return result.rows.map((row) => {
      const remoteRow = row as unknown as RemoteRow;
      return {
        vaultId: String(remoteRow.vault_id),
        entityType: remoteRow.entity_type as TursoProjectionRecord["entityType"],
        entityId: String(remoteRow.entity_id),
        operation: remoteRow.operation as TursoProjectionRecord["operation"],
        remoteRevision: toNumber(remoteRow.remote_revision),
        lastIdempotencyKey: `remote_revision:${String(remoteRow.remote_revision)}`,
        payload: JSON.parse(String(remoteRow.payload_json)) as Record<string, unknown>,
        deletedAt: remoteRow.deleted_at === null ? null : toNumber(remoteRow.deleted_at),
        updatedAt: toNumber(remoteRow.updated_at),
      };
    });
  }

  async getPlanningChangeCeiling(input: { vaultId: string }): Promise<number> {
    const result = await this.client.execute({
      sql: `SELECT COALESCE(MAX(change_sequence), 0) AS change_sequence
            FROM waymark_planning_change_log
            WHERE vault_id = ?;`,
      args: [input.vaultId],
    });
    const row = result.rows[0] as unknown as { change_sequence?: number | bigint } | undefined;
    const value = row?.change_sequence;
    return value === undefined || value === null ? 0 : toNumber(value);
  }

  async upsertPlanningWeekPlanSnapshot(input: {
    snapshot: TursoPlanningWeekPlanSnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    const existing = await this.findPlanningIdempotency(input.mutationId);
    if (existing) {
      return {
        changeSequence: toNumber(existing.change_sequence as number | bigint),
        entityType: "week_plan",
        entityId: String(existing.entity_id),
        mutationId: input.mutationId,
        duplicate: true,
      };
    }

    const tx = await this.client.transaction("write");
    const snapshot = input.snapshot;
    try {
      await tx.execute({
        sql: `INSERT INTO week_plans (
          id,
          vault_id,
          user_id,
          week_start_date,
          week_end_date,
          status,
          summary,
          note,
          created_at,
          updated_at,
          deleted_at,
          last_mutation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(vault_id, id) DO UPDATE SET
          status = excluded.status,
          summary = excluded.summary,
          note = excluded.note,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          last_mutation_id = excluded.last_mutation_id;`,
        args: [
          snapshot.id,
          snapshot.vaultId,
          snapshot.userId,
          snapshot.weekStartDate,
          snapshot.weekEndDate,
          snapshot.status,
          snapshot.summary,
          snapshot.note,
          snapshot.createdAt,
          snapshot.updatedAt,
          snapshot.deletedAt,
          input.mutationId,
        ],
      });

      const change = await tx.execute({
        sql: `SELECT MAX(change_sequence) AS change_sequence
              FROM waymark_planning_change_log
              WHERE vault_id = ? AND entity_type = 'week_plan' AND entity_id = ?;`,
        args: [snapshot.vaultId, snapshot.id],
      });
      const changeRow = change.rows[0] as unknown as { change_sequence?: number | bigint } | undefined;
      const changeSequence = toNumber(changeRow?.change_sequence);

      await tx.execute({
        sql: `INSERT INTO waymark_planning_idempotency (
          mutation_id,
          vault_id,
          entity_type,
          entity_id,
          operation,
          change_sequence,
          created_at
        ) VALUES (?, ?, 'week_plan', ?, ?, ?, ?);`,
        args: [
          input.mutationId,
          snapshot.vaultId,
          snapshot.id,
          snapshot.deletedAt === null ? "update" : "delete",
          changeSequence,
          Date.now(),
        ],
      });

      await tx.commit();
      return {
        changeSequence,
        entityType: "week_plan",
        entityId: snapshot.id,
        mutationId: input.mutationId,
        duplicate: false,
      };
    } catch (error) {
      try {
        await tx.rollback();
      } catch (rollbackError) {
        console.warn("[Waymark Turso] Planning transaction rollback failed after push error.", rollbackError);
      }
      throw error;
    } finally {
      try {
        tx.close();
      } catch (closeError) {
        console.warn("[Waymark Turso] Planning transaction close failed.", closeError);
      }
    }
  }

  async upsertPlanningWeekPlanItemSnapshot(input: {
    snapshot: TursoPlanningWeekPlanItemSnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    const existing = await this.findPlanningIdempotency(input.mutationId);
    if (existing) {
      return {
        changeSequence: toNumber(existing.change_sequence as number | bigint),
        entityType: "week_plan_item",
        entityId: String(existing.entity_id),
        mutationId: input.mutationId,
        duplicate: true,
      };
    }

    const tx = await this.client.transaction("write");
    const snapshot = input.snapshot;
    try {
      await tx.execute({
        sql: `INSERT INTO week_plan_items (
          id, vault_id, user_id, week_plan_id, backlog_item_id, status, local_date,
          start_time, end_time, title, path_id, template_id, expedition_id, milestone_id,
          expedition_context, milestone_context, description, note, origin, block_key,
          deterministic_import_key, import_batch_id, created_mark_instance_id, sort_order,
          order_index, created_at, updated_at, deleted_at, last_mutation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(vault_id, id) DO UPDATE SET
          backlog_item_id = excluded.backlog_item_id,
          status = excluded.status,
          local_date = excluded.local_date,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          title = excluded.title,
          path_id = excluded.path_id,
          template_id = excluded.template_id,
          expedition_id = excluded.expedition_id,
          milestone_id = excluded.milestone_id,
          expedition_context = excluded.expedition_context,
          milestone_context = excluded.milestone_context,
          description = excluded.description,
          note = excluded.note,
          origin = excluded.origin,
          block_key = excluded.block_key,
          deterministic_import_key = excluded.deterministic_import_key,
          import_batch_id = excluded.import_batch_id,
          created_mark_instance_id = excluded.created_mark_instance_id,
          sort_order = excluded.sort_order,
          order_index = excluded.order_index,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at,
          last_mutation_id = excluded.last_mutation_id;`,
        args: [
          snapshot.id,
          snapshot.vaultId,
          snapshot.userId,
          snapshot.weekPlanId,
          snapshot.backlogItemId,
          snapshot.status,
          snapshot.localDate,
          snapshot.startTime,
          snapshot.endTime,
          snapshot.title,
          snapshot.pathId,
          snapshot.templateId,
          snapshot.expeditionId,
          snapshot.milestoneId,
          snapshot.expeditionContext,
          snapshot.milestoneContext,
          snapshot.description,
          snapshot.note,
          snapshot.origin,
          snapshot.blockKey,
          snapshot.deterministicImportKey,
          snapshot.importBatchId,
          snapshot.createdMarkInstanceId,
          snapshot.sortOrder,
          snapshot.orderIndex,
          snapshot.createdAt,
          snapshot.updatedAt,
          snapshot.deletedAt,
          input.mutationId,
        ],
      });

      const change = await tx.execute({
        sql: `SELECT MAX(change_sequence) AS change_sequence
              FROM waymark_planning_change_log
              WHERE vault_id = ? AND entity_type = 'week_plan_item' AND entity_id = ?;`,
        args: [snapshot.vaultId, snapshot.id],
      });
      const changeRow = change.rows[0] as unknown as { change_sequence?: number | bigint } | undefined;
      const changeSequence = toNumber(changeRow?.change_sequence);

      await tx.execute({
        sql: `INSERT INTO waymark_planning_idempotency (
          mutation_id, vault_id, entity_type, entity_id, operation, change_sequence, created_at
        ) VALUES (?, ?, 'week_plan_item', ?, ?, ?, ?);`,
        args: [
          input.mutationId,
          snapshot.vaultId,
          snapshot.id,
          snapshot.deletedAt === null ? "update" : "delete",
          changeSequence,
          Date.now(),
        ],
      });

      await tx.commit();
      return {
        changeSequence,
        entityType: "week_plan_item",
        entityId: snapshot.id,
        mutationId: input.mutationId,
        duplicate: false,
      };
    } catch (error) {
      try {
        await tx.rollback();
      } catch (rollbackError) {
        console.warn("[Waymark Turso] Planning item transaction rollback failed after push error.", rollbackError);
      }
      throw error;
    } finally {
      try {
        tx.close();
      } catch (closeError) {
        console.warn("[Waymark Turso] Planning item transaction close failed.", closeError);
      }
    }
  }

  async upsertPlanningPathSnapshot(input: {
    snapshot: TursoPlanningPathSnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    const snapshot = input.snapshot;
    return this.upsertReadOnlyPlanningSnapshot({
      entityType: "path",
      entityId: snapshot.id,
      vaultId: snapshot.vaultId,
      deletedAt: snapshot.deletedAt,
      updatedAt: snapshot.updatedAt,
      mutationId: input.mutationId,
      payload: toPathPlanningPayload(snapshot),
      writeSnapshot: (tx) =>
        tx.execute({
          sql: `INSERT INTO paths (
            id, vault_id, user_id, name, subtitle, slug, title, description, status,
            color_token, icon_key, sort_order, is_active, hero_media_asset_id,
            created_at, updated_at, deleted_at, last_mutation_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(vault_id, id) DO UPDATE SET
            name = excluded.name,
            subtitle = excluded.subtitle,
            slug = excluded.slug,
            title = excluded.title,
            description = excluded.description,
            status = excluded.status,
            color_token = excluded.color_token,
            icon_key = excluded.icon_key,
            sort_order = excluded.sort_order,
            is_active = excluded.is_active,
            hero_media_asset_id = excluded.hero_media_asset_id,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at,
            last_mutation_id = excluded.last_mutation_id;`,
          args: [
            snapshot.id,
            snapshot.vaultId,
            snapshot.userId,
            snapshot.name,
            snapshot.subtitle,
            snapshot.slug,
            snapshot.title,
            snapshot.description,
            snapshot.status,
            snapshot.colorToken,
            snapshot.iconKey,
            snapshot.sortOrder,
            snapshot.isActive,
            snapshot.heroMediaAssetId,
            snapshot.createdAt,
            snapshot.updatedAt,
            snapshot.deletedAt,
            input.mutationId,
          ],
        }),
    });
  }

  async upsertPlanningExpeditionSnapshot(input: {
    snapshot: TursoPlanningExpeditionSnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    const snapshot = input.snapshot;
    return this.upsertReadOnlyPlanningSnapshot({
      entityType: "expedition",
      entityId: snapshot.id,
      vaultId: snapshot.vaultId,
      deletedAt: snapshot.deletedAt,
      updatedAt: snapshot.updatedAt,
      mutationId: input.mutationId,
      payload: toExpeditionPlanningPayload(snapshot),
      writeSnapshot: (tx) =>
        tx.execute({
          sql: `INSERT INTO expeditions (
            id, vault_id, user_id, path_id, title, purpose, description, status,
            sort_order, start_date, target_date, started_at, target_end_at,
            completed_at, hero_media_asset_id, created_at, updated_at,
            deleted_at, last_mutation_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(vault_id, id) DO UPDATE SET
            path_id = excluded.path_id,
            title = excluded.title,
            purpose = excluded.purpose,
            description = excluded.description,
            status = excluded.status,
            sort_order = excluded.sort_order,
            start_date = excluded.start_date,
            target_date = excluded.target_date,
            started_at = excluded.started_at,
            target_end_at = excluded.target_end_at,
            completed_at = excluded.completed_at,
            hero_media_asset_id = excluded.hero_media_asset_id,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at,
            last_mutation_id = excluded.last_mutation_id;`,
          args: [
            snapshot.id,
            snapshot.vaultId,
            snapshot.userId,
            snapshot.pathId,
            snapshot.title,
            snapshot.purpose,
            snapshot.description,
            snapshot.status,
            snapshot.sortOrder,
            snapshot.startDate,
            snapshot.targetDate,
            snapshot.startedAt,
            snapshot.targetEndAt,
            snapshot.completedAt,
            snapshot.heroMediaAssetId,
            snapshot.createdAt,
            snapshot.updatedAt,
            snapshot.deletedAt,
            input.mutationId,
          ],
        }),
    });
  }

  async upsertPlanningMarkInstanceSnapshot(input: {
    snapshot: TursoPlanningMarkInstanceSnapshot;
    mutationId: string;
  }): Promise<TursoPlanningMutationResult> {
    const snapshot = input.snapshot;
    return this.upsertReadOnlyPlanningSnapshot({
      entityType: "mark_instance",
      entityId: snapshot.id,
      vaultId: snapshot.vaultId,
      deletedAt: snapshot.deletedAt,
      updatedAt: snapshot.updatedAt,
      mutationId: input.mutationId,
      payload: toMarkInstancePlanningPayload(snapshot),
      writeSnapshot: (tx) =>
        tx.execute({
          sql: `INSERT INTO mark_instances (
            id, vault_id, user_id, path_id, trail_day_id, template_id, expedition_id,
            milestone_id, title, description, origin, status, scheduled_start_at,
            scheduled_end_at, due_at, completed_at, skipped_at, expired_at,
            proof_note, completion_summary, substituted_by_mark_id,
            rescheduled_to_mark_id, source_backlog_item_id, generation_key,
            created_at, updated_at, deleted_at, last_mutation_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(vault_id, id) DO UPDATE SET
            path_id = excluded.path_id,
            trail_day_id = excluded.trail_day_id,
            template_id = excluded.template_id,
            expedition_id = excluded.expedition_id,
            milestone_id = excluded.milestone_id,
            title = excluded.title,
            description = excluded.description,
            origin = excluded.origin,
            status = excluded.status,
            scheduled_start_at = excluded.scheduled_start_at,
            scheduled_end_at = excluded.scheduled_end_at,
            due_at = excluded.due_at,
            completed_at = excluded.completed_at,
            skipped_at = excluded.skipped_at,
            expired_at = excluded.expired_at,
            proof_note = excluded.proof_note,
            completion_summary = excluded.completion_summary,
            substituted_by_mark_id = excluded.substituted_by_mark_id,
            rescheduled_to_mark_id = excluded.rescheduled_to_mark_id,
            source_backlog_item_id = excluded.source_backlog_item_id,
            generation_key = excluded.generation_key,
            updated_at = excluded.updated_at,
            deleted_at = excluded.deleted_at,
            last_mutation_id = excluded.last_mutation_id;`,
          args: [
            snapshot.id,
            snapshot.vaultId,
            snapshot.userId,
            snapshot.pathId,
            snapshot.trailDayId,
            snapshot.templateId,
            snapshot.expeditionId,
            snapshot.milestoneId,
            snapshot.title,
            snapshot.description,
            snapshot.origin,
            snapshot.status,
            snapshot.scheduledStartAt,
            snapshot.scheduledEndAt,
            snapshot.dueAt,
            snapshot.completedAt,
            snapshot.skippedAt,
            snapshot.expiredAt,
            snapshot.proofNote,
            snapshot.completionSummary,
            snapshot.substitutedByMarkId,
            snapshot.rescheduledToMarkId,
            snapshot.sourceBacklogItemId,
            snapshot.generationKey,
            snapshot.createdAt,
            snapshot.updatedAt,
            snapshot.deletedAt,
            input.mutationId,
          ],
        }),
    });
  }

  async listPlanningChangesInWindow(input: {
    vaultId: string;
    afterChangeSequence: number;
    throughChangeSequence: number;
    entityTypes?: readonly WaymarkTursoPlanningEntityType[];
    limit?: number;
  }): Promise<TursoPlanningChangeRecord[]> {
    if (input.throughChangeSequence <= input.afterChangeSequence) {
      return [];
    }

    const entityFilter = input.entityTypes?.length
      ? `AND entity_type IN (${input.entityTypes.map(() => "?").join(", ")})`
      : "";
    const args = [
      input.vaultId,
      input.afterChangeSequence,
      input.throughChangeSequence,
      ...(input.entityTypes ?? []),
      input.limit ?? 500,
    ];
    const result = await this.client.execute({
      sql: `SELECT
          change_sequence,
          vault_id,
          entity_type,
          entity_id,
          operation,
          entity_revision,
          payload_snapshot,
          payload_schema_version,
          deleted_at,
          updated_at,
          mutation_id,
          created_at
        FROM waymark_planning_change_log
        WHERE vault_id = ?
          AND change_sequence > ?
          AND change_sequence <= ?
          ${entityFilter}
        ORDER BY change_sequence ASC
        LIMIT ?;`,
      args,
    });

    return result.rows.map((row) => {
      const remoteRow = row as unknown as PlanningChangeRow;
      return {
        changeSequence: toNumber(remoteRow.change_sequence),
        vaultId: String(remoteRow.vault_id),
        entityType: remoteRow.entity_type as WaymarkTursoPlanningEntityType,
        entityId: String(remoteRow.entity_id),
        operation: remoteRow.operation as TursoPlanningChangeRecord["operation"],
        entityRevision: toNumber(remoteRow.entity_revision),
        payloadSnapshot: JSON.parse(String(remoteRow.payload_snapshot)) as Record<string, unknown>,
        payloadSchemaVersion: toNumber(remoteRow.payload_schema_version),
        deletedAt: remoteRow.deleted_at === null ? null : toNumber(remoteRow.deleted_at),
        updatedAt: toNumber(remoteRow.updated_at),
        mutationId: remoteRow.mutation_id === null ? null : String(remoteRow.mutation_id),
        createdAt: toNumber(remoteRow.created_at),
      };
    });
  }

  async upsertRemoteEdit(input: Omit<TursoProjectionRecord, "remoteRevision" | "lastIdempotencyKey">): Promise<TursoProjectionRecord> {
    const payloadJson = JSON.stringify(input.payload);
    const now = Date.now();
    const tx = await this.client.transaction("write");
    try {
      const insertedChange = await tx.execute({
        sql: `INSERT INTO waymark_remote_change_log (
          vault_id,
          entity_type,
          entity_id,
          operation,
          payload_json,
          payload_schema_version,
          deleted_at,
          updated_at,
          created_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?);`,
        args: [
          input.vaultId,
          input.entityType,
          input.entityId,
          input.operation,
          payloadJson,
          input.deletedAt,
          input.updatedAt,
          now,
        ],
      });
      const remoteRevision = toNumber(insertedChange.lastInsertRowid);
      const idempotencyKey = `remote_edit:${input.vaultId}:${input.entityType}:${input.entityId}:${remoteRevision}`;

      await tx.execute({
        sql: `INSERT INTO waymark_remote_records (
          vault_id,
          entity_type,
          entity_id,
          operation,
          remote_revision,
          last_idempotency_key,
          payload_json,
          payload_schema_version,
          deleted_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(vault_id, entity_type, entity_id) DO UPDATE SET
          operation = excluded.operation,
          remote_revision = excluded.remote_revision,
          last_idempotency_key = excluded.last_idempotency_key,
          payload_json = excluded.payload_json,
          payload_schema_version = excluded.payload_schema_version,
          deleted_at = excluded.deleted_at,
          updated_at = excluded.updated_at;`,
        args: [
          input.vaultId,
          input.entityType,
          input.entityId,
          input.operation,
          remoteRevision,
          idempotencyKey,
          payloadJson,
          input.deletedAt,
          input.updatedAt,
        ],
      });

      await tx.commit();
      return {
        ...input,
        remoteRevision,
        lastIdempotencyKey: idempotencyKey,
      };
    } catch (error) {
      await rollbackTursoTransaction(tx, "[Waymark Turso] Projection transaction rollback failed after push error.");
      throw error;
    } finally {
      tx.close();
    }
  }

  async purgeRemoteOutboxPushes(rows: readonly SyncOutboxRow[]): Promise<WaymarkTursoPurgeResult> {
    const idempotencyKeys = Array.from(new Set(rows.map((row) => row.idempotency_key).filter(Boolean)));
    const entityKeys = Array.from(new Map(rows.map((row) => [`${row.vault_id}:${row.entity_type}:${row.entity_id}`, row])).values());
    if (idempotencyKeys.length === 0 && entityKeys.length === 0) {
      return {
        requestedRows: rows.length,
        idempotencyKeys: 0,
        entityRecords: 0,
      };
    }

    const tx = await this.client.transaction("write");
    try {
      for (const chunk of chunkValues(idempotencyKeys, 50)) {
        const placeholders = chunk.map(() => "?").join(", ");
        await tx.execute({
          sql: `DELETE FROM waymark_remote_records WHERE last_idempotency_key IN (${placeholders});`,
          args: chunk,
        });
        await tx.execute({
          sql: `DELETE FROM waymark_remote_idempotency WHERE idempotency_key IN (${placeholders});`,
          args: chunk,
        });
      }

      for (const row of entityKeys) {
        await tx.execute({
          sql: `DELETE FROM waymark_remote_change_log
                WHERE vault_id = ? AND entity_type = ? AND entity_id = ?;`,
          args: [row.vault_id, row.entity_type, row.entity_id],
        });
      }

      await tx.commit();
      return {
        requestedRows: rows.length,
        idempotencyKeys: idempotencyKeys.length,
        entityRecords: entityKeys.length,
      };
    } catch (error) {
      await rollbackTursoTransaction(tx, "[Waymark Turso] Purge transaction rollback failed.");
      throw error;
    } finally {
      tx.close();
    }
  }

  async purgeWaymarkDevData(input: WaymarkTursoDevPurgeInput): Promise<WaymarkTursoPurgeResult> {
    const rows = input.outboxRows ?? [];
    const idempotencyKeys = Array.from(new Set(rows.map((row) => row.idempotency_key).filter(Boolean)));
    const entityKeys = Array.from(new Map(rows.map((row) => [`${row.vault_id}:${row.entity_type}:${row.entity_id}`, row])).values());
    const clearedTables = WAYMARK_TURSO_DEV_CLEAR_TABLES.map((table) => table.tableName);

    const tx = await this.client.transaction("write");
    try {
      for (const table of WAYMARK_TURSO_DEV_CLEAR_TABLES) {
        await tx.execute({
          sql: table.vaultScoped ? `DELETE FROM ${table.tableName} WHERE vault_id = ?;` : `DELETE FROM ${table.tableName};`,
          args: table.vaultScoped ? [input.vaultId] : [],
        });
      }

      await tx.commit();
      return {
        requestedRows: rows.length,
        idempotencyKeys: idempotencyKeys.length,
        entityRecords: entityKeys.length,
        clearedTables,
      };
    } catch (error) {
      await rollbackTursoTransaction(tx, "[Waymark Turso] Dev purge transaction rollback failed.");
      throw error;
    } finally {
      tx.close();
    }
  }

  private async findIdempotency(idempotencyKey: string): Promise<Record<string, unknown> | null> {
    const result = await this.client.execute({
      sql: `SELECT * FROM waymark_remote_idempotency WHERE idempotency_key = ? LIMIT 1;`,
      args: [idempotencyKey],
    });
    return (result.rows[0] as unknown as Record<string, unknown> | undefined) ?? null;
  }

  private async findPlanningIdempotency(mutationId: string): Promise<Record<string, unknown> | null> {
    const result = await this.client.execute({
      sql: `SELECT * FROM waymark_planning_idempotency WHERE mutation_id = ? LIMIT 1;`,
      args: [mutationId],
    });
    return (result.rows[0] as unknown as Record<string, unknown> | undefined) ?? null;
  }

  private async upsertReadOnlyPlanningSnapshot(input: {
    entityType: "path" | "expedition" | "mark_instance";
    entityId: string;
    vaultId: string;
    deletedAt: number | null;
    updatedAt: number;
    mutationId: string;
    payload: Record<string, unknown>;
    writeSnapshot(tx: TursoTransactionLike): Promise<unknown>;
  }): Promise<TursoPlanningMutationResult> {
    const existing = await this.findIdempotency(input.mutationId);
    if (existing) {
      return {
        changeSequence: toNumber(existing.remote_revision as number | bigint),
        entityType: input.entityType,
        entityId: String(existing.entity_id),
        mutationId: input.mutationId,
        duplicate: true,
      };
    }

    const tx = await this.client.transaction("write");
    try {
      await input.writeSnapshot(tx);
      const payloadJson = JSON.stringify(input.payload);
      const insertedChange = await tx.execute({
        sql: `INSERT INTO waymark_remote_change_log (
          vault_id,
          entity_type,
          entity_id,
          operation,
          payload_json,
          payload_schema_version,
          deleted_at,
          updated_at,
          created_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?);`,
        args: [
          input.vaultId,
          input.entityType,
          input.entityId,
          input.deletedAt === null ? "update" : "delete",
          payloadJson,
          input.deletedAt,
          input.updatedAt,
          Date.now(),
        ],
      });
      const remoteRevision = toNumber(insertedChange.lastInsertRowid);

      await tx.execute({
        sql: `INSERT INTO waymark_remote_records (
          vault_id,
          entity_type,
          entity_id,
          operation,
          remote_revision,
          last_idempotency_key,
          payload_json,
          payload_schema_version,
          deleted_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(vault_id, entity_type, entity_id) DO UPDATE SET
          operation = excluded.operation,
          remote_revision = excluded.remote_revision,
          last_idempotency_key = excluded.last_idempotency_key,
          payload_json = excluded.payload_json,
          payload_schema_version = excluded.payload_schema_version,
          deleted_at = excluded.deleted_at,
          updated_at = excluded.updated_at;`,
        args: [
          input.vaultId,
          input.entityType,
          input.entityId,
          input.deletedAt === null ? "update" : "delete",
          remoteRevision,
          input.mutationId,
          payloadJson,
          input.deletedAt,
          input.updatedAt,
        ],
      });

      await tx.execute({
        sql: `INSERT INTO waymark_remote_idempotency (
          idempotency_key,
          vault_id,
          entity_type,
          entity_id,
          operation,
          remote_revision,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        args: [
          input.mutationId,
          input.vaultId,
          input.entityType,
          input.entityId,
          input.deletedAt === null ? "update" : "delete",
          remoteRevision,
          Date.now(),
        ],
      });

      await tx.commit();
      return {
        changeSequence: remoteRevision,
        entityType: input.entityType,
        entityId: input.entityId,
        mutationId: input.mutationId,
        duplicate: false,
      };
    } catch (error) {
      await rollbackTursoTransaction(tx, "[Waymark Turso] Read-only planning transaction rollback failed after push error.");
      throw error;
    } finally {
      tx.close();
    }
  }
}

type TursoTransactionLike = {
  execute(stmt: InStatement): Promise<{ rows: unknown[]; lastInsertRowid?: number | bigint }>;
  commit(): Promise<unknown>;
  rollback(): Promise<unknown>;
  close(): unknown;
};

function toPathPlanningPayload(snapshot: TursoPlanningPathSnapshot): Record<string, unknown> {
  return {
    id: snapshot.id,
    vault_id: snapshot.vaultId,
    user_id: snapshot.userId,
    name: snapshot.name,
    subtitle: snapshot.subtitle,
    slug: snapshot.slug,
    title: snapshot.title,
    description: snapshot.description,
    status: snapshot.status,
    color_token: snapshot.colorToken,
    icon_key: snapshot.iconKey,
    sort_order: snapshot.sortOrder,
    is_active: snapshot.isActive,
    hero_media_asset_id: snapshot.heroMediaAssetId,
    entity_revision: 1,
    created_at: snapshot.createdAt,
    updated_at: snapshot.updatedAt,
    deleted_at: snapshot.deletedAt,
  };
}

function toExpeditionPlanningPayload(snapshot: TursoPlanningExpeditionSnapshot): Record<string, unknown> {
  return {
    id: snapshot.id,
    vault_id: snapshot.vaultId,
    user_id: snapshot.userId,
    path_id: snapshot.pathId,
    title: snapshot.title,
    purpose: snapshot.purpose,
    description: snapshot.description,
    status: snapshot.status,
    sort_order: snapshot.sortOrder,
    start_date: snapshot.startDate,
    target_date: snapshot.targetDate,
    started_at: snapshot.startedAt,
    target_end_at: snapshot.targetEndAt,
    completed_at: snapshot.completedAt,
    hero_media_asset_id: snapshot.heroMediaAssetId,
    entity_revision: 1,
    created_at: snapshot.createdAt,
    updated_at: snapshot.updatedAt,
    deleted_at: snapshot.deletedAt,
  };
}

function toMarkInstancePlanningPayload(snapshot: TursoPlanningMarkInstanceSnapshot): Record<string, unknown> {
  return {
    id: snapshot.id,
    vault_id: snapshot.vaultId,
    user_id: snapshot.userId,
    path_id: snapshot.pathId,
    trail_day_id: snapshot.trailDayId,
    template_id: snapshot.templateId,
    expedition_id: snapshot.expeditionId,
    milestone_id: snapshot.milestoneId,
    title: snapshot.title,
    description: snapshot.description,
    origin: snapshot.origin,
    status: snapshot.status,
    scheduled_start_at: snapshot.scheduledStartAt,
    scheduled_end_at: snapshot.scheduledEndAt,
    due_at: snapshot.dueAt,
    completed_at: snapshot.completedAt,
    skipped_at: snapshot.skippedAt,
    expired_at: snapshot.expiredAt,
    proof_note: snapshot.proofNote,
    completion_summary: snapshot.completionSummary,
    substituted_by_mark_id: snapshot.substitutedByMarkId,
    rescheduled_to_mark_id: snapshot.rescheduledToMarkId,
    source_backlog_item_id: snapshot.sourceBacklogItemId,
    generation_key: snapshot.generationKey,
    entity_revision: 1,
    created_at: snapshot.createdAt,
    updated_at: snapshot.updatedAt,
    deleted_at: snapshot.deletedAt,
  };
}

function chunkValues<T>(values: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export function buildTursoExecuteStatementsFromSql(sql: string): InStatement[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function toNumber(value: number | bigint | undefined | null): number {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "number") {
    return value;
  }
  throw new Error("Expected numeric Turso value.");
}

async function rollbackTursoTransaction(tx: { rollback(): Promise<unknown> }, message: string): Promise<void> {
  try {
    await tx.rollback();
  } catch (rollbackError) {
    console.warn(message, rollbackError);
  }
}

async function repairPlanningSchemaResidue(client: Pick<Client, "execute">): Promise<void> {
  await dropPlanningTriggers(client);
  await restoreInterruptedPlanningTableRename(client, "waymark_planning_authority");
  await restoreInterruptedPlanningTableRename(client, "waymark_planning_idempotency");
  await restoreInterruptedPlanningTableRename(client, "waymark_planning_change_log");
}

async function dropPlanningTriggers(client: Pick<Client, "execute">): Promise<void> {
  for (const triggerName of [
    "trg_turso_week_plans_insert_log",
    "trg_turso_week_plans_update_log",
    "trg_turso_week_plans_delete_log",
    "trg_turso_week_plan_items_insert_log",
    "trg_turso_week_plan_items_update_log",
    "trg_turso_week_plan_items_delete_log",
  ]) {
    await client.execute(`DROP TRIGGER IF EXISTS ${triggerName};`);
  }
}

async function restoreInterruptedPlanningTableRename(client: Pick<Client, "execute">, tableName: string): Promise<void> {
  const nextTableName = `${tableName}_next`;
  const result = await client.execute({
    sql: `SELECT name
          FROM sqlite_master
          WHERE type = 'table' AND name IN (?, ?);`,
    args: [tableName, nextTableName],
  });
  const tableNames = new Set(result.rows.map((row) => String((row as { name?: unknown }).name)));
  if (!tableNames.has(tableName) && tableNames.has(nextTableName)) {
    await client.execute(`ALTER TABLE ${nextTableName} RENAME TO ${tableName};`);
  }
}
