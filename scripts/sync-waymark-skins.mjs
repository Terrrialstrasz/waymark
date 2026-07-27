import { execFileSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(repoRoot, "ai-resources", "Waymark Icon skins");

const sourceDirectories = [
  {
    label: "core skin boards",
    from: path.join(sourceRoot, "01_utility_signature_set"),
    to: path.join(repoRoot, "assets", "skins", "waymark", "default", "01_utility_signature_set"),
  },
  {
    label: "navigation skin boards",
    from: path.join(sourceRoot, "02_navigation_signature_set"),
    to: path.join(repoRoot, "assets", "skins", "waymark", "default", "02_navigation_signature_set"),
  },
  {
    label: "entity skin boards",
    from: path.join(sourceRoot, "03_entity_signature_set"),
    to: path.join(repoRoot, "assets", "skins", "waymark", "default", "03_entity_signature_set"),
  },
  {
    label: "status skin boards",
    from: path.join(sourceRoot, "04_status_signature_set"),
    to: path.join(repoRoot, "assets", "skins", "waymark", "default", "04_status_signature_set"),
  },
  {
    label: "path medallion boards",
    from: path.join(sourceRoot, "05_domain_path_identity_medallions"),
    to: path.join(repoRoot, "assets", "skins", "waymark", "default", "05_domain_path_identity_medallions"),
  },
  {
    label: "judgment seal boards",
    from: path.join(sourceRoot, "06_result_judgment_seals"),
    to: path.join(repoRoot, "assets", "skins", "waymark", "default", "06_result_judgment_seals"),
  },
  {
    label: "health session boards",
    from: path.join(sourceRoot, "07_health_session_icons"),
    to: path.join(repoRoot, "assets", "skins", "waymark", "default", "07_health_session_icons"),
  },
  {
    label: "botanical motif boards",
    from: path.join(sourceRoot, "08_botanical_motif_library"),
    to: path.join(repoRoot, "assets", "skins", "waymark", "default", "08_botanical_motif_library"),
  },
  {
    label: "path hero boards",
    from: path.join(sourceRoot, "11_Path_Hero picture"),
    to: path.join(repoRoot, "assets", "skins", "path-hero"),
  },
  {
    label: "path icon boards",
    from: path.join(sourceRoot, "10_Path_icon"),
    to: path.join(repoRoot, "assets", "skins", "path-icon"),
  },
];

const logoMappings = [
  {
    from: path.join(sourceRoot, "09_Logo", "carved_stone_medallion_with_emblem.webp"),
    to: path.join(repoRoot, "src", "assets", "skins", "waymark", "logo", "waymark-stone-stamp-primary.webp"),
  },
  {
    from: path.join(sourceRoot, "09_Logo", "botanical_stone_emblem_with_river_path.webp"),
    to: path.join(repoRoot, "src", "assets", "skins", "waymark", "logo", "waymark-app-icon-stone-stamp.webp"),
  },
  {
    from: path.join(sourceRoot, "09_Logo", "minimalist_path_with_star_emblem.webp"),
    to: path.join(repoRoot, "src", "assets", "skins", "waymark", "logo", "waymark-stone-stamp-mono.webp"),
  },
];

function ensurePathExists(targetPath, kind) {
  if (!existsSync(targetPath)) {
    throw new Error(`Missing ${kind}: ${targetPath}`);
  }
}

function ensureDirectory(targetPath) {
  mkdirSync(targetPath, { recursive: true });
}

for (const entry of sourceDirectories) {
  ensurePathExists(entry.from, "source directory");
  ensureDirectory(path.dirname(entry.to));
  cpSync(entry.from, entry.to, { recursive: true, force: true });
  console.log(`synced ${entry.label}: ${path.relative(repoRoot, entry.to)}`);
}

for (const mapping of logoMappings) {
  ensurePathExists(mapping.from, "source file");
  ensureDirectory(path.dirname(mapping.to));
  copyFileSync(mapping.from, mapping.to);
  console.log(`synced logo: ${path.relative(repoRoot, mapping.to)}`);
}

const variantScript = path.join(__dirname, "process-waymark-skin-variants.mjs");
execFileSync(process.execPath, [variantScript, repoRoot], {
  cwd: repoRoot,
  stdio: "inherit",
});

console.log("Waymark skin assets synced and processed from ai-resources.");
