import type { SeedEntityType } from "./types";

export type SeedClassification =
  | "static_config_allowed"
  | "template_allowed"
  | "remote_primary_required"
  | "user_owned_blocked"
  | "dev_demo_only"
  | "needs_decision";

export type SeedRuntimeMode = "production" | "development";

export type SeedPolicyOptions = {
  mode?: SeedRuntimeMode;
  includeDevDemoSeed?: boolean;
  includeBlockedUserOwnedSeed?: boolean;
  allowHierarchySeedCreation?: boolean;
  trustExistingPulledHierarchy?: boolean;
};

export type SeedClassificationReportRow = {
  entityType: SeedEntityType;
  classification: SeedClassification;
  productionBehavior: "seed_allowed" | "seed_blocked" | "conditional";
  notes: string;
};

export const SEED_CLASSIFICATION_REPORT: readonly SeedClassificationReportRow[] = [
  {
    entityType: "path",
    classification: "remote_primary_required",
    productionBehavior: "seed_blocked",
    notes: "Turso-primary hierarchy. Runtime bootstrap may only adopt a unique pulled row; creation is test-only.",
  },
  {
    entityType: "expedition",
    classification: "remote_primary_required",
    productionBehavior: "seed_blocked",
    notes: "Turso-primary hierarchy. Runtime bootstrap may only adopt a unique pulled row; creation is test-only.",
  },
  {
    entityType: "milestone",
    classification: "remote_primary_required",
    productionBehavior: "seed_blocked",
    notes: "Turso-primary hierarchy. Runtime bootstrap may only adopt a unique pulled row; creation is test-only.",
  },
  {
    entityType: "mark_template",
    classification: "template_allowed",
    productionBehavior: "seed_allowed",
    notes: "Template definitions only; runtime marks are user-owned data.",
  },
  {
    entityType: "pack_check_template",
    classification: "template_allowed",
    productionBehavior: "seed_allowed",
    notes: "Template definitions only; pack check runs are user-owned data.",
  },
  {
    entityType: "signal_config",
    classification: "template_allowed",
    productionBehavior: "seed_allowed",
    notes: "Default signal templates/config only; signal occurrences are user-owned data.",
  },
  {
    entityType: "workout_routine",
    classification: "template_allowed",
    productionBehavior: "seed_allowed",
    notes: "Routine templates and exercise definitions only.",
  },
  {
    entityType: "close_trail_rule",
    classification: "static_config_allowed",
    productionBehavior: "seed_allowed",
    notes: "Static close-trail rule config only, not daily closures or judgments.",
  },
  {
    entityType: "anchor_path_rotation",
    classification: "static_config_allowed",
    productionBehavior: "seed_allowed",
    notes: "Static template/config only, not user-owned plans.",
  },
  {
    entityType: "daily_mark_assignment",
    classification: "user_owned_blocked",
    productionBehavior: "seed_blocked",
    notes: "Treat as planned marks/plans; do not production-seed user-owned plans.",
  },
  {
    entityType: "backlog_item",
    classification: "dev_demo_only",
    productionBehavior: "seed_blocked",
    notes: "May exist in development/demo data only; disabled for production seed.",
  },
];

const CLASSIFICATION_BY_ENTITY = new Map(
  SEED_CLASSIFICATION_REPORT.map((row) => [row.entityType, row.classification] as const),
);

export function classifySeedEntity(entityType: SeedEntityType): SeedClassification {
  return CLASSIFICATION_BY_ENTITY.get(entityType) ?? "needs_decision";
}

export function canSeedEntity(entityType: SeedEntityType, options: SeedPolicyOptions = {}): boolean {
  const classification = classifySeedEntity(entityType);
  if (classification === "remote_primary_required") {
    return options.allowHierarchySeedCreation === true;
  }
  if (classification === "user_owned_blocked") {
    return options.includeBlockedUserOwnedSeed === true;
  }
  if (classification === "dev_demo_only") {
    return options.mode === "development" && options.includeDevDemoSeed === true;
  }
  return true;
}
