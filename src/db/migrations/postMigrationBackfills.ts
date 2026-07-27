import { MediaAssetKind, MediaAssetOwnerType, MediaAssetType } from "../../domain/waymark";
import { WAYMARK_TABLES } from "../constants";

type MigrationDbLike = {
  getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]>;
  runAsync(source: string, ...params: unknown[]): Promise<unknown>;
};

type ColumnInfoRow = {
  name: string;
};

type LegacyOwnerBackfillConfig = {
  ownerType: MediaAssetOwnerType;
  tableName: string;
  titleColumn?: string;
  createdAtColumn: string;
};

const LEGACY_OWNER_BACKFILL_CONFIGS: LegacyOwnerBackfillConfig[] = [
  {
    ownerType: MediaAssetOwnerType.Memory,
    tableName: WAYMARK_TABLES.memories,
    titleColumn: "title",
    createdAtColumn: "captured_at",
  },
  {
    ownerType: MediaAssetOwnerType.MarkInstance,
    tableName: WAYMARK_TABLES.markInstances,
    titleColumn: "title",
    createdAtColumn: "completed_at",
  },
  {
    ownerType: MediaAssetOwnerType.BacklogItem,
    tableName: WAYMARK_TABLES.backlogItems,
    titleColumn: "title",
    createdAtColumn: "created_at",
  },
];

const LEGACY_MEDIA_COLUMNS = ["photo_uri", "image_uri", "video_uri"] as const;

export async function runPostMigrationBackfillsAsync(db: MigrationDbLike): Promise<void> {
  const mediaColumns = await getColumnSet(db, WAYMARK_TABLES.mediaAssets);
  if (mediaColumns.size === 0) {
    return;
  }

  await backfillMediaKindsAsync(db, mediaColumns);
  await backfillLegacyOwnerMediaAsync(db, mediaColumns);
  await normalizeMediaSortOrderAsync(db, mediaColumns);
}

async function backfillMediaKindsAsync(db: MigrationDbLike, mediaColumns: Set<string>) {
  if (!mediaColumns.has("kind")) {
    return;
  }

  await db.runAsync(
    `UPDATE ${WAYMARK_TABLES.mediaAssets}
     SET kind = CASE
       WHEN lower(COALESCE(mime_type, '')) LIKE 'video/%' OR lower(COALESCE(asset_type, '')) LIKE '%video%'
         THEN ?
       ELSE ?
     END
     WHERE kind IS NULL OR trim(kind) = '';`,
    MediaAssetKind.Video,
    MediaAssetKind.Image,
  );
}

async function backfillLegacyOwnerMediaAsync(db: MigrationDbLike, mediaColumns: Set<string>) {
  for (const config of LEGACY_OWNER_BACKFILL_CONFIGS) {
    const ownerColumns = await getColumnSet(db, config.tableName);
    for (const legacyColumn of LEGACY_MEDIA_COLUMNS) {
      if (!ownerColumns.has(legacyColumn)) {
        continue;
      }

      const kind = legacyColumn === "video_uri" ? MediaAssetKind.Video : MediaAssetKind.Image;
      const assetType = resolveLegacyAssetType(config.ownerType, kind);
      const syntheticIdPrefix = `legacy_${config.ownerType}_${legacyColumn}_`;
      const titleExpression =
        config.titleColumn && ownerColumns.has(config.titleColumn) ? `COALESCE(NULLIF(trim(${config.titleColumn}), ''), 'media')` : `'media'`;

      await db.runAsync(
        `INSERT OR IGNORE INTO ${WAYMARK_TABLES.mediaAssets} (
           id,
           user_id,
           owner_type,
           owner_id,
           kind,
           asset_type,
           local_uri,
           file_name,
           mime_type,
           storage_path,
           sort_index,
           captured_at,
           created_at,
           updated_at,
           backup_status,
           sync_status,
           local_revision
         )
         SELECT
           ? || id,
           user_id,
           ?,
           id,
           ?,
           ?,
           ${legacyColumn},
           ${titleExpression},
           CASE WHEN ? = ? THEN 'video/mp4' ELSE 'image/jpeg' END,
           ${legacyColumn},
           0,
           ${config.createdAtColumn},
           created_at,
           updated_at,
           'local_only',
           sync_status,
           local_revision
         FROM ${config.tableName} owner
         WHERE ${legacyColumn} IS NOT NULL
           AND trim(${legacyColumn}) <> ''
           AND NOT EXISTS (
             SELECT 1
             FROM ${WAYMARK_TABLES.mediaAssets} media
             WHERE media.owner_type = ?
               AND media.owner_id = owner.id
               AND media.deleted_at IS NULL
               AND media.storage_path = owner.${legacyColumn}
           );`,
        syntheticIdPrefix,
        config.ownerType,
        kind,
        assetType,
        kind,
        MediaAssetKind.Video,
        config.ownerType,
      );
    }
  }
}

async function normalizeMediaSortOrderAsync(db: MigrationDbLike, mediaColumns: Set<string>) {
  if (!mediaColumns.has("sort_index")) {
    return;
  }

  await db.runAsync(
    `WITH ranked AS (
       SELECT
         id,
         ROW_NUMBER() OVER (
           PARTITION BY owner_type, owner_id
           ORDER BY sort_index ASC, created_at ASC, id ASC
         ) - 1 AS next_sort_index
       FROM ${WAYMARK_TABLES.mediaAssets}
       WHERE deleted_at IS NULL
     )
     UPDATE ${WAYMARK_TABLES.mediaAssets}
     SET sort_index = (
       SELECT ranked.next_sort_index
       FROM ranked
       WHERE ranked.id = ${WAYMARK_TABLES.mediaAssets}.id
     )
     WHERE id IN (SELECT id FROM ranked);`,
  );
}

async function getColumnSet(db: MigrationDbLike, tableName: string) {
  const rows = await db.getAllAsync<ColumnInfoRow>(`PRAGMA table_info(${tableName});`);
  return new Set(rows.map((row) => row.name));
}

function resolveLegacyAssetType(ownerType: MediaAssetOwnerType, kind: MediaAssetKind) {
  if (ownerType === MediaAssetOwnerType.MarkInstance) {
    return kind === MediaAssetKind.Video ? MediaAssetType.ProofVideo : MediaAssetType.ProofPhoto;
  }

  if (ownerType === MediaAssetOwnerType.BacklogItem) {
    return kind === MediaAssetKind.Video ? MediaAssetType.BacklogVideo : MediaAssetType.BacklogPhoto;
  }

  return kind === MediaAssetKind.Video ? MediaAssetType.MemoryVideo : MediaAssetType.MemoryPhoto;
}
