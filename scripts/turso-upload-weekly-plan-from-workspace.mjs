import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const compiledRoot = path.resolve(process.cwd(), ".tmp/repo-tests/src/lib/waymark");

if (!fs.existsSync(path.join(compiledRoot, "tursoRemoteAdapter.js"))) {
  throw new Error("Compiled repository files are missing. Run `npx tsc -p tsconfig.repo-tests.json` first.");
}

const { createWaymarkTursoClient, WaymarkTursoRemoteAdapter } = require(path.join(compiledRoot, "tursoRemoteAdapter.js"));

loadDotEnv();

const cliArgs = process.argv.slice(2);
const dryRun = cliArgs.includes("--dry-run");
const apply = cliArgs.includes("--apply");
const artifactPath = cliArgs.find((value) => !value.startsWith("--"));

if (!artifactPath) {
  throw new Error(
    "Usage: npm run turso:upload-weekly-plan -- <weekly-plan.json> --apply\nUse --dry-run to validate without writing.",
  );
}
if (!dryRun && !apply) {
  throw new Error("Refusing to write without --apply. Use --dry-run to validate only.");
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!dryRun && (!url || !authToken)) {
  throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
}

const artifact = readJsonArtifact(artifactPath);
const { vaultId, deviceId, userId, paths, expeditions, milestones, weekPlan, items } = normalizeArtifact(artifact);
const pathSnapshots = paths.map((item) => normalizePathSnapshot({ vaultId, userId, item }));
const expeditionSnapshots = expeditions.map((item) => normalizeExpeditionSnapshot({ vaultId, userId, item }));
const milestoneSnapshots = milestones.map((item) => normalizeMilestoneSnapshot({ vaultId, userId, item }));
const planSnapshot = normalizeWeekPlanSnapshot({ vaultId, userId, weekPlan });
const itemSnapshots = items.map((item) =>
  normalizeWeekPlanItemSnapshot({
    vaultId,
    userId,
    weekPlanId: planSnapshot.id,
    item,
  }),
);

validateWeeklyPlan({
  paths: pathSnapshots,
  expeditions: expeditionSnapshots,
  milestones: milestoneSnapshots,
  plan: planSnapshot,
  items: itemSnapshots,
});

console.log(
  `Weekly plan artifact: vault=${vaultId}, user=${userId}, week=${planSnapshot.weekStartDate}->${planSnapshot.weekEndDate}, paths=${pathSnapshots.length}, expeditions=${expeditionSnapshots.length}, milestones=${milestoneSnapshots.length}, items=${itemSnapshots.length}`,
);
for (const item of expeditionSnapshots) {
  console.log(`  expedition ${item.id}: path=${item.pathId} ${item.title}`);
}
for (const item of milestoneSnapshots) {
  console.log(`  milestone ${item.id}: expedition=${item.expeditionId} ${item.title}`);
}
for (const item of itemSnapshots) {
  console.log(`  ${item.id}: ${item.localDate ?? "no-date"} ${item.startTime ?? "--:--"}-${item.endTime ?? "--:--"} ${item.title ?? "(untitled)"}`);
}

if (dryRun) {
  console.log("Dry run complete. No Turso writes were made.");
  process.exit(0);
}

const client = createWaymarkTursoClient({ url, authToken });
try {
  const adapter = new WaymarkTursoRemoteAdapter(client);
  await adapter.ensureSchema();

  await uploadSnapshots({
    label: "paths",
    entityType: "path",
    snapshots: pathSnapshots,
    vaultId,
    deviceId,
    upload: (snapshot, mutationId) => adapter.upsertPlanningPathSnapshot({ snapshot, mutationId }),
  });
  await uploadSnapshots({
    label: "expeditions",
    entityType: "expedition",
    snapshots: expeditionSnapshots,
    vaultId,
    deviceId,
    upload: (snapshot, mutationId) => adapter.upsertPlanningExpeditionSnapshot({ snapshot, mutationId }),
  });
  await uploadSnapshots({
    label: "milestones",
    entityType: "milestone",
    snapshots: milestoneSnapshots,
    vaultId,
    deviceId,
    upload: (snapshot, mutationId) => adapter.upsertPlanningMilestoneSnapshot({ snapshot, mutationId }),
  });

  const planMutation = await adapter.upsertPlanningWeekPlanSnapshot({
    snapshot: planSnapshot,
    mutationId: buildWorkspaceMutationId("week_plan", vaultId, deviceId, planSnapshot.id, planSnapshot),
  });
  console.log(
    `Uploaded week_plan ${planSnapshot.id}: change=${planMutation.changeSequence}, duplicate=${planMutation.duplicate ? "yes" : "no"}`,
  );

  const itemResult = await uploadSnapshots({
    label: "week_plan_items",
    entityType: "week_plan_item",
    snapshots: itemSnapshots,
    vaultId,
    deviceId,
    upload: (snapshot, mutationId) => adapter.upsertPlanningWeekPlanItemSnapshot({ snapshot, mutationId }),
  });
  if (itemResult.failed.length > 0) {
    process.exitCode = 1;
  }
} finally {
  client.close();
}

function readJsonArtifact(inputPath) {
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Weekly plan artifact not found: ${resolved}`);
  }
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

function normalizeArtifact(artifact) {
  const vaultId = stringValue(artifact.vaultId ?? artifact.vault_id ?? process.env.WAYMARK_VAULT_ID, "vaultId");
  const deviceId = stringValue(artifact.deviceId ?? artifact.device_id ?? process.env.WAYMARK_DEVICE_ID ?? "workspace-dev", "deviceId");
  const userId = stringValue(artifact.userId ?? artifact.user_id ?? process.env.WAYMARK_USER_ID, "userId");
  const paths = optionalArrayValue(artifact.paths, "paths");
  const expeditions = optionalArrayValue(artifact.expeditions, "expeditions");
  const milestones = optionalArrayValue(artifact.milestones, "milestones");
  const weekPlan = objectValue(artifact.weekPlan ?? artifact.week_plan, "weekPlan");
  const items = arrayValue(artifact.items ?? artifact.weekPlanItems ?? artifact.week_plan_items, "items");
  return { vaultId, deviceId, userId, paths, expeditions, milestones, weekPlan, items };
}

function normalizePathSnapshot({ vaultId, userId, item }) {
  const now = Date.now();
  const title = stringValue(item.title, "path.title");
  const slug = stringValue(item.slug, "path.slug");
  return {
    id: stringValue(item.id, "path.id"),
    vaultId,
    userId,
    name: nullableStringValue(item.name, "path.name") ?? title,
    subtitle: nullableStringValue(item.subtitle, "path.subtitle"),
    slug,
    title,
    description: nullableStringValue(item.description, "path.description"),
    status: stringValue(item.status ?? "active", "path.status"),
    colorToken: nullableStringValue(item.colorToken ?? item.color_token, "path.colorToken"),
    iconKey: nullableStringValue(item.iconKey ?? item.icon_key, "path.iconKey"),
    sortOrder: numberValue(item.sortOrder ?? item.sort_order ?? 0, "path.sortOrder"),
    isActive: numberValue(item.isActive ?? item.is_active ?? 1, "path.isActive"),
    heroMediaAssetId: nullableStringValue(item.heroMediaAssetId ?? item.hero_media_asset_id, "path.heroMediaAssetId"),
    createdAt: numberValue(item.createdAt ?? item.created_at ?? now, "path.createdAt"),
    updatedAt: numberValue(item.updatedAt ?? item.updated_at ?? now, "path.updatedAt"),
    deletedAt: nullableNumberValue(item.deletedAt ?? item.deleted_at, "path.deletedAt"),
  };
}

function normalizeExpeditionSnapshot({ vaultId, userId, item }) {
  const now = Date.now();
  return {
    id: stringValue(item.id, "expedition.id"),
    vaultId,
    userId,
    pathId: stringValue(item.pathId ?? item.path_id, "expedition.pathId"),
    title: stringValue(item.title, "expedition.title"),
    purpose: nullableStringValue(item.purpose, "expedition.purpose"),
    description: nullableStringValue(item.description, "expedition.description"),
    status: stringValue(item.status ?? "active", "expedition.status"),
    sortOrder: numberValue(item.sortOrder ?? item.sort_order ?? 0, "expedition.sortOrder"),
    startDate: nullableLocalDateValue(item.startDate ?? item.start_date, "expedition.startDate"),
    targetDate: nullableLocalDateValue(item.targetDate ?? item.target_date, "expedition.targetDate"),
    startedAt: nullableNumberValue(item.startedAt ?? item.started_at, "expedition.startedAt"),
    targetEndAt: nullableNumberValue(item.targetEndAt ?? item.target_end_at, "expedition.targetEndAt"),
    completedAt: nullableNumberValue(item.completedAt ?? item.completed_at, "expedition.completedAt"),
    heroMediaAssetId: nullableStringValue(item.heroMediaAssetId ?? item.hero_media_asset_id, "expedition.heroMediaAssetId"),
    createdAt: numberValue(item.createdAt ?? item.created_at ?? now, "expedition.createdAt"),
    updatedAt: numberValue(item.updatedAt ?? item.updated_at ?? now, "expedition.updatedAt"),
    deletedAt: nullableNumberValue(item.deletedAt ?? item.deleted_at, "expedition.deletedAt"),
  };
}

function normalizeMilestoneSnapshot({ vaultId, userId, item }) {
  const now = Date.now();
  return {
    id: stringValue(item.id, "milestone.id"),
    vaultId,
    userId,
    expeditionId: stringValue(item.expeditionId ?? item.expedition_id, "milestone.expeditionId"),
    title: stringValue(item.title, "milestone.title"),
    description: nullableStringValue(item.description, "milestone.description"),
    status: stringValue(item.status ?? "planned", "milestone.status"),
    startDate: nullableLocalDateValue(item.startDate ?? item.start_date, "milestone.startDate"),
    targetDate: nullableLocalDateValue(item.targetDate ?? item.target_date, "milestone.targetDate"),
    sortOrder: numberValue(item.sortOrder ?? item.sort_order ?? 0, "milestone.sortOrder"),
    orderIndex: numberValue(item.orderIndex ?? item.order_index ?? 0, "milestone.orderIndex"),
    completedAt: nullableNumberValue(item.completedAt ?? item.completed_at, "milestone.completedAt"),
    createdAt: numberValue(item.createdAt ?? item.created_at ?? now, "milestone.createdAt"),
    updatedAt: numberValue(item.updatedAt ?? item.updated_at ?? now, "milestone.updatedAt"),
    deletedAt: nullableNumberValue(item.deletedAt ?? item.deleted_at, "milestone.deletedAt"),
  };
}

function normalizeWeekPlanSnapshot({ vaultId, userId, weekPlan }) {
  const now = Date.now();
  return {
    id: stringValue(weekPlan.id, "weekPlan.id"),
    vaultId,
    userId,
    weekStartDate: localDateValue(weekPlan.weekStartDate ?? weekPlan.week_start_date, "weekPlan.weekStartDate"),
    weekEndDate: localDateValue(weekPlan.weekEndDate ?? weekPlan.week_end_date, "weekPlan.weekEndDate"),
    status: stringValue(weekPlan.status ?? "active", "weekPlan.status"),
    summary: nullableStringValue(weekPlan.summary, "weekPlan.summary"),
    note: nullableStringValue(weekPlan.note, "weekPlan.note"),
    createdAt: numberValue(weekPlan.createdAt ?? weekPlan.created_at ?? now, "weekPlan.createdAt"),
    updatedAt: numberValue(weekPlan.updatedAt ?? weekPlan.updated_at ?? now, "weekPlan.updatedAt"),
    deletedAt: nullableNumberValue(weekPlan.deletedAt ?? weekPlan.deleted_at, "weekPlan.deletedAt"),
  };
}

function normalizeWeekPlanItemSnapshot({ vaultId, userId, weekPlanId, item }) {
  const now = Date.now();
  const planningKey = stringValue(
    item.planningKey ?? item.planning_key ?? item.deterministicImportKey ?? item.deterministic_import_key,
    "item.planningKey",
  );
  if (item.createdMarkInstanceId ?? item.created_mark_instance_id) {
    throw new Error(`Item ${item.id ?? planningKey} must not provide createdMarkInstanceId; local pull materializes marks.`);
  }
  const deterministicImportKey = planningKey.startsWith("workspace_weekly_plan:")
    ? planningKey
    : `workspace_weekly_plan:${weekPlanId}:${planningKey}`;
  return {
    id: nullableStringValue(item.id, "item.id") ?? deterministicId("week_plan_item", `${vaultId}:${userId}:${weekPlanId}:${planningKey}`),
    vaultId,
    userId,
    weekPlanId,
    backlogItemId: nullableStringValue(item.backlogItemId ?? item.backlog_item_id, "item.backlogItemId"),
    status: stringValue(item.status ?? "pulled", "item.status"),
    localDate: nullableLocalDateValue(item.localDate ?? item.local_date, "item.localDate"),
    startTime: nullableTimeValue(item.startTime ?? item.start_time, "item.startTime"),
    endTime: nullableTimeValue(item.endTime ?? item.end_time, "item.endTime"),
    title: nullableStringValue(item.title, "item.title"),
    pathId: nullableStringValue(item.pathId ?? item.path_id, "item.pathId"),
    templateId: nullableStringValue(item.templateId ?? item.template_id, "item.templateId"),
    expeditionId: nullableStringValue(item.expeditionId ?? item.expedition_id, "item.expeditionId"),
    milestoneId: nullableStringValue(item.milestoneId ?? item.milestone_id, "item.milestoneId"),
    expeditionContext: nullableStringValue(item.expeditionContext ?? item.expedition_context, "item.expeditionContext"),
    milestoneContext: nullableStringValue(item.milestoneContext ?? item.milestone_context, "item.milestoneContext"),
    description: nullableStringValue(item.description, "item.description"),
    note: nullableStringValue(item.note, "item.note"),
    origin: nullableStringValue(item.origin ?? "weekly_timetable", "item.origin"),
    blockKey: nullableStringValue(item.blockKey ?? item.block_key, "item.blockKey"),
    deterministicImportKey,
    importBatchId: nullableStringValue(item.importBatchId ?? item.import_batch_id, "item.importBatchId"),
    createdMarkInstanceId: null,
    sortOrder: numberValue(item.sortOrder ?? item.sort_order ?? 0, "item.sortOrder"),
    orderIndex: numberValue(item.orderIndex ?? item.order_index ?? 0, "item.orderIndex"),
    createdAt: numberValue(item.createdAt ?? item.created_at ?? now, "item.createdAt"),
    updatedAt: numberValue(item.updatedAt ?? item.updated_at ?? now, "item.updatedAt"),
    deletedAt: nullableNumberValue(item.deletedAt ?? item.deleted_at, "item.deletedAt"),
  };
}

function validateWeeklyPlan({ paths, expeditions, milestones, plan, items }) {
  if (plan.weekEndDate < plan.weekStartDate) {
    throw new Error("weekPlan.weekEndDate must be on or after weekPlan.weekStartDate.");
  }
  const pathIds = new Set(paths.map((item) => item.id));
  const expeditionIds = new Set(expeditions.map((item) => item.id));
  const milestoneIds = new Set(milestones.map((item) => item.id));
  assertUniqueIds("paths", paths);
  assertUniqueIds("expeditions", expeditions);
  assertUniqueIds("milestones", milestones);
  assertUniqueIds("items", items);
  assertUniqueField("items", "deterministicImportKey", items);
  for (const expedition of expeditions) {
    if (pathIds.size > 0 && !pathIds.has(expedition.pathId)) {
      throw new Error(`Expedition ${expedition.id} references path ${expedition.pathId}, which is not in artifact paths.`);
    }
  }
  for (const milestone of milestones) {
    if (expeditionIds.size > 0 && !expeditionIds.has(milestone.expeditionId)) {
      throw new Error(`Milestone ${milestone.id} references expedition ${milestone.expeditionId}, which is not in artifact expeditions.`);
    }
  }
  for (const item of items) {
    if (item.localDate && (item.localDate < plan.weekStartDate || item.localDate > plan.weekEndDate)) {
      throw new Error(`Item ${item.id} localDate ${item.localDate} is outside the week plan range.`);
    }
    if (item.startTime && item.endTime && item.endTime <= item.startTime) {
      throw new Error(`Item ${item.id} endTime must be after startTime.`);
    }
    if (item.expeditionId && expeditionIds.size > 0 && !expeditionIds.has(item.expeditionId)) {
      throw new Error(`Item ${item.id} references expedition ${item.expeditionId}, which is not in artifact expeditions.`);
    }
    if (item.milestoneId && milestoneIds.size > 0 && !milestoneIds.has(item.milestoneId)) {
      throw new Error(`Item ${item.id} references milestone ${item.milestoneId}, which is not in artifact milestones.`);
    }
  }
}

function assertUniqueIds(label, items) {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) {
      throw new Error(`Duplicate ${label} id: ${item.id}`);
    }
    ids.add(item.id);
  }
}

function assertUniqueField(label, fieldName, items) {
  const values = new Set();
  for (const item of items) {
    const value = item[fieldName];
    if (!value) {
      throw new Error(`${label} item ${item.id} is missing ${fieldName}.`);
    }
    if (values.has(value)) {
      throw new Error(`Duplicate ${label} ${fieldName}: ${value}`);
    }
    values.add(value);
  }
}

async function uploadSnapshots({ label, entityType, snapshots, vaultId, deviceId, upload }) {
  let uploaded = 0;
  let duplicates = 0;
  const failed = [];
  for (const snapshot of snapshots) {
    try {
      const mutation = await upload(snapshot, buildWorkspaceMutationId(entityType, vaultId, deviceId, snapshot.id, snapshot));
      if (mutation.duplicate) {
        duplicates += 1;
      } else {
        uploaded += 1;
      }
    } catch (error) {
      failed.push({ entityId: snapshot.id, message: formatError(error) });
    }
  }
  console.log(`Uploaded ${label}: scanned=${snapshots.length}, uploaded=${uploaded}, duplicates=${duplicates}, failed=${failed.length}`);
  if (failed.length > 0) {
    console.error(JSON.stringify(failed, null, 2));
  }
  return { uploaded, duplicates, failed };
}

function buildWorkspaceMutationId(entityType, vaultId, deviceId, entityId, snapshot) {
  const hash = crypto.createHash("sha256").update(JSON.stringify(snapshot)).digest("hex").slice(0, 16);
  return `workspace_weekly_plan:${vaultId}:${deviceId}:${entityType}:${entityId}:${hash}`;
}

function deterministicId(prefix, seed) {
  const hash = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 24);
  return `${prefix}_${hash}`;
}

function stringValue(value, label) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  throw new Error(`${label} must be a non-empty string.`);
}

function nullableStringValue(value, label) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`${label} must be a string or null.`);
}

function objectValue(value, label) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  throw new Error(`${label} must be an object.`);
}

function arrayValue(value, label) {
  if (Array.isArray(value)) {
    return value;
  }
  throw new Error(`${label} must be an array.`);
}

function optionalArrayValue(value, label) {
  if (value === null || value === undefined) {
    return [];
  }
  return arrayValue(value, label);
}

function numberValue(value, label) {
  const number = Number(value);
  if (Number.isFinite(number)) {
    return number;
  }
  throw new Error(`${label} must be a finite number.`);
}

function nullableNumberValue(value, label) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return numberValue(value, label);
}

function localDateValue(value, label) {
  const date = stringValue(value, label);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  throw new Error(`${label} must use YYYY-MM-DD.`);
}

function nullableLocalDateValue(value, label) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return localDateValue(value, label);
}

function nullableTimeValue(value, label) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const time = stringValue(value, label);
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time;
  }
  throw new Error(`${label} must use HH:mm.`);
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) {
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  }
}
