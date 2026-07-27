import assert from "node:assert/strict";
import { PackCheckInstanceStatus, SignalStatus, SignalTargetType } from "../src/domain/waymark";
import {
  derivePackCheckActionState,
  derivePackCheckHeroState,
  optimisticallyClearPackCheckItems,
  optimisticallyTogglePackCheckItem,
} from "../src/app/packCheckDetailState";
import {
  optimisticallyCompleteTodayMark,
  optimisticallyToggleChecklistItem,
  rollbackCompletedTodayMark,
  type TodayMutationData,
} from "../src/app/todayMutationState";
import { buildEmptyCloseTrailReviewFixture } from "../src/app/closeTrailViewModel";
import { countCompletedTodayMarks } from "../src/app/todayMarksSummary";

function buildTodayData(): TodayMutationData {
  return {
    trailDayId: "trail_1",
    hasWeeklyTimetableForDate: true,
    selectedPathId: "health",
    paths: [],
    marks: [
      {
        id: "mark_1",
        title: { en: "Workout", vi: "Tap" },
        pathId: "health",
        status: "ready",
        actionSheet: {
          embeddedChecklist: {
            packCheckId: "execution:mark_1",
            items: [
              { id: "band", label: "Resistance band", checked: false },
              { id: "water", label: "Water", checked: true },
            ],
          },
          statusLabel: { en: "Ready", vi: "San sang" },
          signalLabel: { en: "Open signal", vi: "Mo signal" },
        },
      },
      {
        id: "mark_2",
        title: { en: "Journal", vi: "Nhat ky" },
        pathId: "family",
        status: "needs_decision",
      },
    ],
    packChecks: [],
    allPackChecks: [],
    packCheckItemsById: {},
    currentExpeditions: [],
    closeTrailStatus: "default",
    featureFlags: {
      isPathHeroEnabled: true,
      isPathDetailEnabled: true,
      isMarksEnabled: true,
      isMarkDetailEnabled: true,
      isIndependentPackChecksEnabled: true,
      isPrepareTomorrowEnabled: true,
      isPackCheckDetailEnabled: true,
      isCurrentExpeditionEnabled: true,
      isExpeditionDetailEnabled: true,
      isCloseTrailEnabled: true,
    },
    signalIdByMarkId: {
      mark_1: "signal_1",
    },
    signalIdByPackId: {},
    signalsById: {
      signal_1: {
        id: "signal_1",
        targetType: SignalTargetType.MarkInstance,
        targetId: "mark_1",
        status: SignalStatus.Scheduled,
        scheduledAt: "2026-05-28T09:00:00.000Z",
      },
    },
  };
}

function runTests() {
  {
    const initial = buildTodayData();
    initial.marks[1].status = "resolved";
    const next = optimisticallyCompleteTodayMark(initial, "mark_1");

    assert.equal(countCompletedTodayMarks(initial.marks), 1);
    assert.equal(countCompletedTodayMarks(next.marks), 2);
    assert.equal(next.marks[0].status, "done");
    assert.equal(next.marks[0].actionSheet?.statusLabel?.en, "Done");
    assert.equal(next.marks[0].actionSheet?.statusLabel?.vi, "Đã xong");
    assert.equal(next.marks[0].actionSheet?.signalLabel, undefined);
    assert.equal(next.signalIdByMarkId.mark_1, undefined);
    assert.equal(next.signalsById.signal_1, undefined);
    assert.equal(next.marks[1], initial.marks[1]);
  }

  {
    const snapshot = buildTodayData();
    snapshot.marks[1].status = "resolved";
    const optimistic = optimisticallyCompleteTodayMark(snapshot, "mark_1");
    const rolledBack = rollbackCompletedTodayMark(optimistic, snapshot, "mark_1");

    assert.equal(countCompletedTodayMarks(optimistic.marks), 2);
    assert.equal(countCompletedTodayMarks(rolledBack.marks), 1);
    assert.equal(rolledBack.marks[0].status, "ready");
    assert.equal(rolledBack.marks[0].actionSheet?.statusLabel?.en, "Ready");
    assert.equal(rolledBack.marks[0].actionSheet?.signalLabel?.en, "Open signal");
    assert.equal(rolledBack.signalIdByMarkId.mark_1, "signal_1");
    assert.deepEqual(rolledBack.signalsById.signal_1, snapshot.signalsById.signal_1);
  }

  {
    const snapshot = buildTodayData();
    const toggled = optimisticallyToggleChecklistItem(snapshot, "mark_1", "execution:mark_1", "band", true);

    assert.equal(toggled.marks[0].actionSheet?.embeddedChecklist?.items[0]?.checked, true);
    assert.equal(toggled.marks[0].actionSheet?.embeddedChecklist?.items[1]?.checked, true);
    assert.equal(snapshot.marks[0].actionSheet?.embeddedChecklist?.items[0]?.checked, false);
  }

  {
    const snapshot = buildTodayData();
    const toggled = optimisticallyToggleChecklistItem(snapshot, "mark_1", "execution:mark_1", "band", true);
    const rolledBack = rollbackCompletedTodayMark(toggled, snapshot, "mark_1");

    assert.equal(rolledBack.marks[0].actionSheet?.embeddedChecklist?.items[0]?.checked, false);
    assert.equal(rolledBack.marks[0].actionSheet?.embeddedChecklist?.items[1]?.checked, true);
  }

  {
    const snapshot = buildTodayData();
    const fixture = buildEmptyCloseTrailReviewFixture(snapshot.marks);

    assert.equal(fixture.phase, "review");
    assert.equal(fixture.marks, snapshot.marks);
    assert.deepEqual(fixture.memories, []);
    assert.deepEqual(fixture.disciplineCluster.items, []);
    assert.equal(fixture.firstStep.chips.length, 0);
    assert.equal(fixture.firstStep.value.en, "No planned mark is set for tomorrow.");
  }

  {
    const noneChecked = derivePackCheckActionState(
      [
        { checked: false, required: true },
        { checked: false, required: true },
      ],
      false,
      PackCheckInstanceStatus.Available,
    );
    assert.equal(noneChecked.canComplete, false);
    assert.equal(noneChecked.canClear, false);

    const partialChecked = derivePackCheckActionState(
      [
        { checked: true, required: true },
        { checked: false, required: true },
      ],
      false,
      PackCheckInstanceStatus.InProgress,
    );
    assert.equal(partialChecked.canComplete, false);
    assert.equal(partialChecked.canClear, true);

    const allRequiredChecked = derivePackCheckActionState(
      [
        { checked: true, required: true },
        { checked: true, required: true },
        { checked: false, required: false },
      ],
      false,
      PackCheckInstanceStatus.PartiallyCompleted,
    );
    assert.equal(allRequiredChecked.canComplete, true);
    assert.equal(allRequiredChecked.canClear, true);

    const alreadyCompleted = derivePackCheckActionState(
      [
        { checked: true, required: true },
        { checked: true, required: true },
      ],
      false,
      PackCheckInstanceStatus.Completed,
    );
    assert.equal(alreadyCompleted.canComplete, false);
    assert.equal(alreadyCompleted.canClear, true);
  }

  {
    const heroEmpty = derivePackCheckHeroState([], PackCheckInstanceStatus.Available);
    const heroIncomplete = derivePackCheckHeroState([
      { checked: true, required: true },
      { checked: false, required: true },
    ], PackCheckInstanceStatus.InProgress);
    const heroComplete = derivePackCheckHeroState([
      { checked: true, required: true },
      { checked: true, required: false },
    ], PackCheckInstanceStatus.Completed);

    assert.equal("counterLabel" in heroEmpty, false);
    assert.equal(heroEmpty.isEmpty, true);
    assert.equal(heroIncomplete.allChecked, false);
    assert.equal(heroComplete.allChecked, true);
    assert.equal(heroComplete.isCompleted, true);
  }

  {
    const detail = {
      packCheck: {
        id: "pack_1",
        name: "Before Leaving Home Check",
        path: "family" as const,
        status: PackCheckInstanceStatus.Available,
        isReusable: false,
      },
      items: [
        { id: "keys", label: "Keys", checked: false, required: true },
        { id: "wallet", label: "Wallet", checked: true, required: true },
      ],
      isDisabled: false,
    };

    const toggled = optimisticallyTogglePackCheckItem(detail, "keys", true);
    const cleared = optimisticallyClearPackCheckItems(toggled);

    assert.equal(detail.items[0].checked, false);
    assert.equal(toggled.items[0].checked, true);
    assert.equal(cleared.items.every((item) => item.checked === false), true);
  }
}

runTests();
console.log("today-mutation-state tests passed");
