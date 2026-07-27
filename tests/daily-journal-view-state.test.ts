import assert from "node:assert/strict";
import {
  projectDailyJournalViewState,
  resolveDailyJournalContentState,
  shiftDailyJournalDate,
  type DailyJournalEntryItem,
} from "../src/app/dailyJournalViewState";

function memory(id: string, title: string, imageSrc?: string): DailyJournalEntryItem {
  return {
    id,
    sourceId: id,
    sourceType: "memory",
    entryType: "memory",
    title,
    chips: [{ id: `${id}-time`, label: "07:00", iconName: "clock", variant: "metadata" }],
    pathLabel: "Journal",
    status: "default",
    image: imageSrc ? { alt: title, src: imageSrc } : undefined,
    mediaItems: imageSrc
      ? [{ alt: title, id: `${id}-media`, kind: "photo" as never, posterSrc: imageSrc, sortIndex: 0 }]
      : [],
  };
}

function mark(id: string, title: string): DailyJournalEntryItem {
  return {
    id,
    sourceId: id,
    sourceType: "mark_instance",
    entryType: "mark",
    title,
    chips: [
      { id: `${id}-time`, label: "05:30", iconName: "clock", variant: "metadata" },
      { id: `${id}-status`, label: "Resolved", stateTone: "done", variant: "status" },
    ],
    pathLabel: "Health",
    status: "done",
  };
}

{
  const view = projectDailyJournalViewState({
    dayKey: "2026-02-28",
    todayKey: "2026-03-01",
    dateLabel: "Feb 28, 2026",
    entries: [
      { sortAt: "2026-02-28T08:00:00.000Z", entry: memory("memory-no-media", "Newest text") },
      { sortAt: "2026-02-28T07:00:00.000Z", entry: memory("memory-with-media", "Older photo", "file://photo.jpg") },
      { sortAt: "2026-02-28T06:00:00.000Z", entry: memory("memory-third", "Third") },
      { sortAt: "2026-02-28T05:30:00.000Z", entry: mark("mark-1", "Workout") },
    ],
  });

  assert.equal(view.featuredMemory?.id, "memory-with-media");
  assert.deepEqual(view.memoryPreviews.map((item) => item.id), ["memory-no-media", "memory-third"]);
  assert.equal(view.memoryOverflowCount, 0);
  assert.deepEqual(view.trailEntries.map((item) => item.id), ["mark-1"]);
  assert.equal(view.trailEntries[0].timeLabel, "05:30");
  assert.equal(view.trailEntries[0].statusLabel, "Resolved");
  assert.equal(view.previousDayKey, "2026-02-27");
  assert.equal(view.nextDayKey, "2026-03-01");
}

{
  const view = projectDailyJournalViewState({
    dayKey: "2026-03-01",
    todayKey: "2026-03-01",
    dateLabel: "Mar 1, 2026",
    entries: [
      { sortAt: "2026-03-01T06:00:00.000Z", entry: memory("m1", "One") },
      { sortAt: "2026-03-01T07:00:00.000Z", entry: memory("m2", "Two") },
      { sortAt: "2026-03-01T08:00:00.000Z", entry: memory("m3", "Three") },
      { sortAt: "2026-03-01T09:00:00.000Z", entry: memory("m4", "Four") },
    ],
  });

  assert.equal(view.featuredMemory?.id, "m4");
  assert.deepEqual(view.memoryPreviews.map((item) => item.id), ["m3", "m2", "m1"]);
  assert.equal(view.memoryOverflowCount, 0);
  assert.equal(view.nextDayKey, undefined);
}

assert.equal(shiftDailyJournalDate("2024-03-01", -1), "2024-02-29");
assert.equal(shiftDailyJournalDate("2026-12-31", 1), "2027-01-01");
assert.equal(resolveDailyJournalContentState({ memoryCount: 0, trailEntries: [], entries: [] }), "empty");
assert.equal(resolveDailyJournalContentState({ memoryCount: 0, trailEntries: [], closedDayCard: {} }), "content");
