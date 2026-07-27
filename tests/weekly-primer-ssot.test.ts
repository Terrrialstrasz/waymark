import assert from "node:assert/strict";

type PendingWeeklyPrimerTest = {
  name: string;
  pendingReason: string;
};

export const weeklyPrimerSsotAcceptanceTests: PendingWeeklyPrimerTest[] = [
  {
    name: "ssot_weekly_regenerate_preserves_materialized_mark_primer_and_user_edits",
    pendingReason: "Phase 1 must choose Mark Detail storage before this test can execute.",
  },
];

export function assertWeeklyPrimerSsotSkeleton() {
  assert.deepEqual(
    weeklyPrimerSsotAcceptanceTests.map((test) => test.name),
    ["ssot_weekly_regenerate_preserves_materialized_mark_primer_and_user_edits"],
  );
}

assertWeeklyPrimerSsotSkeleton();
