import { mkdir, readFile, rm, writeFile, copyFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const sourceRoot = path.join(repoRoot, "ai-resources", "Waymark Icon skins");
const generatedRoot = path.join(repoRoot, "assets", "skins", "generated");
const generatedTsDir = path.join(repoRoot, "src", "assets", "generated");
const generatedTsPath = path.join(generatedTsDir, "waymarkGeneratedImageVariants.ts");

const transparentIconVariants = [
  { key: "iconSm", max: 54 },
  { key: "iconMd", max: 66 },
  { key: "iconLg", max: 84 },
];

const transparentPathIdentityVariants = [
  { key: "iconMd", max: 72 },
  { key: "iconLg", max: 108 },
];

const transparentSealVariants = [
  { key: "iconLg", max: 96 },
  { key: "sealMd", max: 144 },
];

const transparentMotifVariants = [{ key: "motifLg", max: 960 }];

const transparentLogoVariants = [
  { key: "iconSm", max: 32 },
  { key: "iconMd", max: 64 },
  { key: "iconLg", max: 128 },
];

const heroVariants = [
  { key: "compact", max: 480, quality: 82 },
  { key: "card", max: 720, quality: 84 },
  { key: "hero", max: 1440, quality: 86 },
  { key: "large", max: 1600, quality: 88 },
];

const manualLogoDefinitions = [
  {
    assetId: "logo.primary",
    sourcePath: "09_Logo/carved_stone_medallion_with_emblem.webp",
    outputDir: "logo/waymark-stone-stamp-primary",
    variants: transparentLogoVariants,
    paddingRatio: 0.03,
  },
  {
    assetId: "logo.appIcon",
    sourcePath: "09_Logo/botanical_stone_emblem_with_river_path.webp",
    outputDir: "logo/waymark-app-icon-stone-stamp",
    variants: transparentLogoVariants,
    paddingRatio: 0.03,
  },
  {
    assetId: "logo.mono",
    sourcePath: "09_Logo/minimalist_path_with_star_emblem.webp",
    outputDir: "logo/waymark-stone-stamp-mono",
    variants: transparentLogoVariants,
    paddingRatio: 0.02,
  },
];

const expoAppConfigLogoOutputs = [
  {
    inputPath: "09_Logo/carved_stone_medallion_with_emblem.webp",
    outputName: "waymark-adaptive-foreground-square.png",
    size: 1024,
    paddingRatio: 0.03,
  },
  {
    inputPath: "09_Logo/minimalist_path_with_star_emblem.webp",
    outputName: "waymark-adaptive-monochrome-square.png",
    size: 1024,
    paddingRatio: 0.02,
  },
  {
    inputPath: "09_Logo/botanical_stone_emblem_with_river_path.webp",
    outputName: "waymark-icon-square.png",
    size: 1024,
    paddingRatio: 0.03,
  },
];

const manualPathIconDefinitions = [
  ["pathIcon.board.careerCraft", "10_Path_icon/career-craft_seal_icon.webp", "path-icon/career-craft_seal_icon"],
  ["pathIcon.board.snagGolf", "10_Path_icon/snag-golf-vietnam_seal_icon.webp", "path-icon/snag-golf-vietnam_seal_icon"],
  ["pathIcon.board.healthBody", "10_Path_icon/health-body_seal_icon.webp", "path-icon/health-body_seal_icon"],
  ["pathIcon.board.familyHome", "10_Path_icon/family-home_seal_icon.webp", "path-icon/family-home_seal_icon"],
  ["pathIcon.board.characterStoicism", "10_Path_icon/character-stoicism_seal_icon.webp", "path-icon/character-stoicism_seal_icon"],
  ["pathIcon.board.golfCraft", "10_Path_icon/golf-craft_seal_icon.webp", "path-icon/golf-craft_seal_icon"],
  ["pathIcon.board.cultureRomance", "10_Path_icon/culture-class-romance_seal_icon.webp", "path-icon/culture-class-romance_seal_icon"],
].map(([assetId, sourcePath, outputDir]) => ({
  assetId,
  sourcePath,
  outputDir,
  variants: transparentPathIdentityVariants,
  paddingRatio: 0.03,
}));

const manualHeroDefinitions = [
  ["hero.path.careerCraft", "11_Path_Hero picture/career-craft_hero_picture.webp", "path-hero/career-craft_hero_picture"],
  ["hero.path.snagGolf", "11_Path_Hero picture/snag-golf-vietnam_hero_picture.webp", "path-hero/snag-golf-vietnam_hero_picture"],
  ["hero.path.healthBody", "11_Path_Hero picture/health-body_hero_picture.webp", "path-hero/health-body_hero_picture"],
  ["hero.path.familyHome", "11_Path_Hero picture/family-home_hero_picture.webp", "path-hero/family-home_hero_picture"],
  ["hero.path.characterStoicism", "11_Path_Hero picture/character-stoicism_hero_picture.webp", "path-hero/character-stoicism_hero_picture"],
  ["hero.path.golfCraft", "11_Path_Hero picture/golf-craft_hero_picture.webp", "path-hero/golf-craft_hero_picture"],
  ["hero.path.cultureRomance", "11_Path_Hero picture/culture-class-romance_hero_picture.webp", "path-hero/culture-class-romance_hero_picture"],
].map(([assetId, sourcePath, outputDir]) => ({
  assetId,
  sourcePath,
  outputDir,
}));

const variantRecords = [];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function ensureDirectory(targetPath) {
  await mkdir(targetPath, { recursive: true });
}

async function cleanupLegacyVariants(outputDir) {
  await ensureDirectory(outputDir);
  const entries = await readdir(outputDir, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /\.(png|jpg|jpeg)$/iu.test(entry.name))
      .map(async (entry) => {
        try {
          await rm(path.join(outputDir, entry.name), { force: true });
        } catch {
          // Metro/dev tooling may keep old files open. They are ignored once registry points to new WebP variants.
        }
      })
  );
}

function relativeToRepo(targetPath) {
  return toPosix(path.relative(repoRoot, targetPath));
}

function relativeFromGeneratedTs(targetPath) {
  return toPosix(path.relative(generatedTsDir, targetPath));
}

function sourceAssetIdFromFile(file) {
  return file.replace(/\.webp$/u, "").replaceAll("/", ".");
}

function paddingRatioForCategory(category) {
  switch (category) {
    case "08_botanical_motif_library":
      return 0.015;
    case "06_result_judgment_seals":
      return 0.025;
    default:
      return 0.03;
  }
}

function variantsForCategory(category) {
  switch (category) {
    case "01_utility_signature_set":
    case "02_navigation_signature_set":
    case "03_entity_signature_set":
    case "04_status_signature_set":
    case "07_health_session_icons":
      return transparentIconVariants;
    case "05_domain_path_identity_medallions":
      return transparentPathIdentityVariants;
    case "06_result_judgment_seals":
      return transparentSealVariants;
    case "08_botanical_motif_library":
      return transparentMotifVariants;
    default:
      throw new Error(`Unsupported category: ${category}`);
  }
}

async function createTransparentVariant(inputPath, outputPath, maxDimension, paddingRatio) {
  const trimmedBuffer = await sharp(inputPath, { animated: false }).trim().ensureAlpha().toBuffer();
  const padding = Math.max(0, Math.round(maxDimension * paddingRatio));
  const innerMaxDimension = Math.max(1, maxDimension - padding * 2);

  const pipeline = sharp(trimmedBuffer, { animated: false })
    .resize({
      width: innerMaxDimension,
      height: innerMaxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({
      quality: 90,
      alphaQuality: 100,
      effort: 6,
      smartSubsample: true,
    });

  await pipeline.toFile(outputPath);
  const finalMetadata = await sharp(outputPath).metadata();
  return {
    width: finalMetadata.width ?? maxDimension,
    height: finalMetadata.height ?? maxDimension,
  };
}

async function createSquarePngVariant(inputPath, outputPath, size, paddingRatio) {
  const base = sharp(inputPath, { animated: false }).trim();
  const metadata = await base.metadata();
  const largestDimension = Math.max(metadata.width ?? size, metadata.height ?? size);
  const padding = Math.max(1, Math.round(largestDimension * paddingRatio));
  const innerSize = Math.max(1, size - padding * 2);

  const centeredBuffer = await base
    .ensureAlpha()
    .resize({
      width: innerSize,
      height: innerSize,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: centeredBuffer, gravity: "center" }])
    .png()
    .toFile(outputPath);
}

async function createHeroVariant(inputPath, outputPath, maxDimension, quality) {
  const image = sharp(inputPath, { animated: false });
  const metadata = await image.metadata();
  const largestDimension = Math.max(metadata.width ?? maxDimension, metadata.height ?? maxDimension);
  const shouldResize = largestDimension > maxDimension;

  const pipeline = shouldResize
    ? image.resize({
        width: maxDimension,
        height: maxDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
    : image;

  await pipeline.webp({
    quality,
    effort: 6,
    smartSubsample: true,
  }).toFile(outputPath);

  const finalMetadata = await sharp(outputPath).metadata();
  return {
    width: finalMetadata.width ?? metadata.width ?? maxDimension,
    height: finalMetadata.height ?? metadata.height ?? maxDimension,
  };
}

function addVariantRecord(assetId, variant, outputPath, width, height) {
  variantRecords.push({
    assetId,
    variant,
    requirePath: relativeFromGeneratedTs(outputPath),
    sourcePath: relativeToRepo(outputPath),
    width,
    height,
  });
}

async function writeTransparentVariants({ assetId, inputPath, outputDir, variants, paddingRatio }) {
  await ensureDirectory(outputDir);
  await cleanupLegacyVariants(outputDir);

  for (const variant of variants) {
    const outputPath = path.join(outputDir, `${variant.key}.webp`);
    const dimensions = await createTransparentVariant(inputPath, outputPath, variant.max, paddingRatio);
    addVariantRecord(assetId, variant.key, outputPath, dimensions.width, dimensions.height);
  }
}

async function writeHeroVariants({ assetId, inputPath, outputDir }) {
  await ensureDirectory(outputDir);
  await cleanupLegacyVariants(outputDir);

  for (const variant of heroVariants) {
    const outputPath = path.join(outputDir, `${variant.key}.webp`);
    const dimensions = await createHeroVariant(inputPath, outputPath, variant.max, variant.quality);
    addVariantRecord(assetId, variant.key, outputPath, dimensions.width, dimensions.height);
  }

  const fullOutputPath = path.join(outputDir, "full.webp");
  await copyFile(inputPath, fullOutputPath);
  const fullMetadata = await sharp(fullOutputPath).metadata();
  addVariantRecord(assetId, "full", fullOutputPath, fullMetadata.width ?? 0, fullMetadata.height ?? 0);
}

async function buildGeneratedModule() {
  const variantKeyOrder = ["iconSm", "iconMd", "iconLg", "sealMd", "motifLg", "compact", "card", "hero", "large", "full"];
  const grouped = new Map();

  for (const record of variantRecords) {
    if (!grouped.has(record.assetId)) {
      grouped.set(record.assetId, []);
    }
    grouped.get(record.assetId).push(record);
  }

  const lines = [
    'import { ImageSourcePropType } from "react-native";',
    "",
    "// This file is generated by `npm run assets:sync:waymark-skins`.",
    "// Do not edit by hand.",
    "export type GeneratedWaymarkImageVariantKey =",
    ...variantKeyOrder.map((key, index) => `  '${key}'${index === variantKeyOrder.length - 1 ? ";" : " |"}`),
    "",
    "export type GeneratedWaymarkImageVariant = {",
    "  source: ImageSourcePropType;",
    "  width: number;",
    "  height: number;",
    "  sourcePath: string;",
    "};",
    "",
    "export const generatedWaymarkImageVariants = {",
  ];

  for (const assetId of [...grouped.keys()].sort()) {
    lines.push(`  '${assetId}': {`);
    const records = grouped.get(assetId).sort(
      (left, right) => variantKeyOrder.indexOf(left.variant) - variantKeyOrder.indexOf(right.variant)
    );

    records.forEach((record, index) => {
      lines.push(
        `    ${record.variant}: { source: require('${record.requirePath}') as ImageSourcePropType, width: ${record.width}, height: ${record.height}, sourcePath: '${record.sourcePath}' }${
          index === records.length - 1 ? "" : ","
        }`
      );
    });

    lines.push("  },");
  }

  lines.push(
    "} as const satisfies Record<string, Partial<Record<GeneratedWaymarkImageVariantKey, GeneratedWaymarkImageVariant>>>;",
    "",
    "export function getGeneratedWaymarkImageVariants(assetId: string): Partial<Record<GeneratedWaymarkImageVariantKey, GeneratedWaymarkImageVariant>> | undefined {",
    "  return generatedWaymarkImageVariants[assetId as keyof typeof generatedWaymarkImageVariants];",
    "}",
    ""
  );

  await ensureDirectory(generatedTsDir);
  await writeFile(generatedTsPath, lines.join("\n"), "utf8");
}

await ensureDirectory(generatedRoot);

const manifest = JSON.parse(await readFile(path.join(sourceRoot, "manifest.json"), "utf8"));

for (const asset of manifest.assets) {
  const assetId = sourceAssetIdFromFile(asset.file);
  const inputPath = path.join(sourceRoot, ...asset.file.split("/"));
  const outputDir = path.join(generatedRoot, "waymark", "default", ...asset.file.replace(/\.webp$/u, "").split("/"));
  await writeTransparentVariants({
    assetId,
    inputPath,
    outputDir,
    variants: variantsForCategory(asset.category),
    paddingRatio: paddingRatioForCategory(asset.category),
  });
}

for (const logo of manualLogoDefinitions) {
  await writeTransparentVariants({
    assetId: logo.assetId,
    inputPath: path.join(sourceRoot, ...logo.sourcePath.split("/")),
    outputDir: path.join(generatedRoot, ...logo.outputDir.split("/")),
    variants: logo.variants,
    paddingRatio: logo.paddingRatio,
  });
}

const appConfigLogoDir = path.join(generatedRoot, "logo", "app-config");
await ensureDirectory(appConfigLogoDir);

for (const output of expoAppConfigLogoOutputs) {
  await createSquarePngVariant(
    path.join(sourceRoot, ...output.inputPath.split("/")),
    path.join(appConfigLogoDir, output.outputName),
    output.size,
    output.paddingRatio
  );
}

for (const pathIcon of manualPathIconDefinitions) {
  await writeTransparentVariants({
    assetId: pathIcon.assetId,
    inputPath: path.join(sourceRoot, ...pathIcon.sourcePath.split("/")),
    outputDir: path.join(generatedRoot, ...pathIcon.outputDir.split("/")),
    variants: pathIcon.variants,
    paddingRatio: pathIcon.paddingRatio,
  });
}

for (const hero of manualHeroDefinitions) {
  await writeHeroVariants({
    assetId: hero.assetId,
    inputPath: path.join(sourceRoot, ...hero.sourcePath.split("/")),
    outputDir: path.join(generatedRoot, ...hero.outputDir.split("/")),
  });
}

await buildGeneratedModule();
console.log("Generated Waymark skin variants and registry module.");
