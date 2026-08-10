import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@tursodatabase/serverless/compat";

loadDotEnv();

const args = parseArgs(process.argv.slice(2));
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
}

const outputPath = path.resolve(
  process.cwd(),
  args.output ?? "ai-resources/Waymark DB sources/generated/waymark-hierarchy.production.json",
);

const client = createClient({ url, authToken });

try {
  const hierarchy = await pullHierarchy(client, args.vaultId);
  validateHierarchy(hierarchy);

  const contentHash = hashJson({
    paths: hierarchy.paths,
    expeditions: hierarchy.expeditions,
    milestones: hierarchy.milestones,
  });
  const artifact = {
    metadata: {
      source: "turso",
      pulledAt: new Date().toISOString(),
      vaultId: hierarchy.vaultId,
      contentHash,
      counts: {
        paths: hierarchy.paths.length,
        expeditions: hierarchy.expeditions.length,
        milestones: hierarchy.milestones.length,
      },
    },
    paths: hierarchy.paths,
    expeditions: hierarchy.expeditions,
    milestones: hierarchy.milestones,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(
    `Pulled hierarchy: paths=${artifact.metadata.counts.paths}, expeditions=${artifact.metadata.counts.expeditions}, milestones=${artifact.metadata.counts.milestones}, vault=${artifact.metadata.vaultId}`,
  );
  console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
} finally {
  client.close();
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--vault-id") {
      parsed.vaultId = values[index + 1];
      index += 1;
      continue;
    }
    if (value === "--output") {
      parsed.output = values[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument "${value}". Usage: npm run turso:pull-hierarchy-workspace -- [--vault-id <vault>] [--output <path>]`);
  }
  return parsed;
}

async function pullHierarchy(client, requestedVaultId) {
  const vaultResult = await client.execute(`
    SELECT vault_id, COUNT(*) AS rows
    FROM (
      SELECT vault_id FROM paths WHERE deleted_at IS NULL
      UNION ALL
      SELECT vault_id FROM expeditions WHERE deleted_at IS NULL
      UNION ALL
      SELECT vault_id FROM milestones WHERE deleted_at IS NULL
    )
    GROUP BY vault_id
    ORDER BY rows DESC, vault_id ASC;
  `);
  const vaults = vaultResult.rows.map((row) => String(row.vault_id));
  const vaultId = requestedVaultId ?? vaults[0];
  if (!vaultId) {
    throw new Error("No active Waymark hierarchy rows found in Turso.");
  }
  if (requestedVaultId && !vaults.includes(requestedVaultId)) {
    throw new Error(`Vault "${requestedVaultId}" has no active hierarchy rows. Available vaults: ${vaults.join(", ") || "<none>"}.`);
  }
  if (!requestedVaultId && vaults.length > 1) {
    console.warn(`Multiple vaults found; using largest active hierarchy vault "${vaultId}". Pass --vault-id to select explicitly.`);
  }

  const [paths, expeditions, milestones] = await Promise.all([
    client.execute({
      sql: `
        SELECT id, vault_id, user_id, slug, title, status, sort_order, entity_revision, updated_at
        FROM paths
        WHERE vault_id = ? AND deleted_at IS NULL
        ORDER BY sort_order ASC, title ASC;
      `,
      args: [vaultId],
    }),
    client.execute({
      sql: `
        SELECT id, vault_id, user_id, path_id, title, status, sort_order, start_date, target_date, entity_revision, updated_at
        FROM expeditions
        WHERE vault_id = ? AND deleted_at IS NULL
        ORDER BY path_id ASC, sort_order ASC, title ASC;
      `,
      args: [vaultId],
    }),
    client.execute({
      sql: `
        SELECT id, vault_id, user_id, expedition_id, title, status, sort_order, order_index, start_date, target_date, entity_revision, updated_at
        FROM milestones
        WHERE vault_id = ? AND deleted_at IS NULL
        ORDER BY expedition_id ASC, sort_order ASC, order_index ASC, title ASC;
      `,
      args: [vaultId],
    }),
  ]);

  return {
    vaultId,
    paths: paths.rows.map((row) => ({
      id: String(row.id),
      vaultId: String(row.vault_id),
      userId: String(row.user_id),
      slug: String(row.slug),
      title: String(row.title),
      status: String(row.status),
      sortOrder: numberValue(row.sort_order, "paths.sort_order"),
      entityRevision: numberValue(row.entity_revision, "paths.entity_revision"),
      updatedAt: numberValue(row.updated_at, "paths.updated_at"),
    })),
    expeditions: expeditions.rows.map((row) => ({
      id: String(row.id),
      vaultId: String(row.vault_id),
      userId: String(row.user_id),
      pathId: String(row.path_id),
      title: String(row.title),
      status: String(row.status),
      sortOrder: numberValue(row.sort_order, "expeditions.sort_order"),
      startDate: nullableString(row.start_date),
      targetDate: nullableString(row.target_date),
      entityRevision: numberValue(row.entity_revision, "expeditions.entity_revision"),
      updatedAt: numberValue(row.updated_at, "expeditions.updated_at"),
    })),
    milestones: milestones.rows.map((row) => ({
      id: String(row.id),
      vaultId: String(row.vault_id),
      userId: String(row.user_id),
      expeditionId: String(row.expedition_id),
      title: String(row.title),
      status: String(row.status),
      sortOrder: numberValue(row.sort_order, "milestones.sort_order"),
      orderIndex: numberValue(row.order_index, "milestones.order_index"),
      startDate: nullableString(row.start_date),
      targetDate: nullableString(row.target_date),
      entityRevision: numberValue(row.entity_revision, "milestones.entity_revision"),
      updatedAt: numberValue(row.updated_at, "milestones.updated_at"),
    })),
  };
}

function validateHierarchy(hierarchy) {
  assertUnique(hierarchy.paths.map((item) => item.id), "path id");
  assertUnique(hierarchy.paths.map((item) => item.slug), "path slug");
  assertUnique(hierarchy.expeditions.map((item) => item.id), "expedition id");
  assertUnique(hierarchy.milestones.map((item) => item.id), "milestone id");

  const pathIds = new Set(hierarchy.paths.map((item) => item.id));
  const expeditionIds = new Set(hierarchy.expeditions.map((item) => item.id));
  const missingExpeditionParents = hierarchy.expeditions.filter((item) => !pathIds.has(item.pathId));
  const missingMilestoneParents = hierarchy.milestones.filter((item) => !expeditionIds.has(item.expeditionId));

  if (missingExpeditionParents.length > 0 || missingMilestoneParents.length > 0) {
    throw new Error(
      `Invalid hierarchy parent links: expeditions=${missingExpeditionParents.length}, milestones=${missingMilestoneParents.length}.`,
    );
  }
}

function assertUnique(values, label) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  if (duplicates.size > 0) {
    throw new Error(`Duplicate ${label}: ${Array.from(duplicates).join(", ")}.`);
  }
}

function hashJson(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function nullableString(value) {
  return value === null || value === undefined ? null : String(value);
}

function numberValue(value, label) {
  const next = Number(value);
  if (!Number.isFinite(next)) {
    throw new Error(`Expected numeric Turso value for ${label}.`);
  }
  return next;
}

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator < 0) {
      continue;
    }
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
