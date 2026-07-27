import assert from "node:assert/strict";

type PendingRestoreBeforeSeedTest = {
  name: string;
  pendingReason: string;
};

export const restoreBeforeSeedAcceptanceTests: PendingRestoreBeforeSeedTest[] = [
  {
    name: "ssot_restore_before_seed_does_not_duplicate_paths_expeditions_milestones",
    pendingReason: "Phase 1/2 must add fake restore records before this test can execute.",
  },
];

export function assertRestoreBeforeSeedSkeleton() {
  assert.deepEqual(
    restoreBeforeSeedAcceptanceTests.map((test) => test.name),
    ["ssot_restore_before_seed_does_not_duplicate_paths_expeditions_milestones"],
  );
}

assertRestoreBeforeSeedSkeleton();
