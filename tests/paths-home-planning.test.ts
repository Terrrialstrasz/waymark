import assert from "node:assert/strict";
import { buildWeeklyDayItems } from "../src/app/weeklyDayPlanModel";
import { todayPathHeroPaths } from "../src/lib/waymark/todayPathHero";
import type { TodayMarkItem } from "../src/components/today/__fixtures__/todayCarousel.fixtures";

assert.equal(todayPathHeroPaths.length, 7, "Paths Home must expose the seven canonical paths.");

const marks: TodayMarkItem[] = [
  {
    id: "mark-materialized",
    title: { en: "Materialized mark", vi: "Materialized mark" },
    pathId: "health",
    status: "ready",
    timeLabel: { en: "06:00", vi: "06:00" },
  },
  {
    id: "mark-standalone",
    title: { en: "Standalone mark", vi: "Standalone mark" },
    pathId: "career",
    status: "needs_decision",
    timeLabel: { en: "08:00", vi: "08:00" },
  },
];

const items = buildWeeklyDayItems({
  locale: "en",
  selectedDate: "2026-08-17",
  days: [
    {
      id: "2026-08-17",
      localDate: "2026-08-17",
      label: "Monday",
      items: [
        {
          id: "plan-materialized",
          timeLabel: "06:00-07:00",
          title: "Materialized mark",
          pathLabel: "Health",
          createdMarkInstanceId: "mark-materialized",
          createdMarkStatus: "ready",
        },
        {
          id: "plan-unassigned",
          timeLabel: "07:00-07:30",
          title: "Plan without milestone",
          pathLabel: "Family",
          issue: "Missing created mark",
        },
      ],
    },
  ],
  marks,
});

assert.deepEqual(
  items.map((item) => item.id),
  ["week-plan:plan-materialized", "week-plan:plan-unassigned", "mark:mark-standalone"],
  "Selected-day projection must keep raw plan items, append standalone marks, and avoid duplicating materialized marks.",
);
assert.equal(items[1].issue, "Missing created mark");
assert.equal(items[1].milestoneLabel, undefined);
assert.equal(items[2].source, "standalone_mark");

assert.deepEqual(
  buildWeeklyDayItems({ locale: "en", selectedDate: "2026-08-18", days: [], marks: [] }),
  [],
  "An empty selected day must remain empty.",
);
