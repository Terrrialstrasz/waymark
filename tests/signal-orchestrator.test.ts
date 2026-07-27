import assert from "node:assert/strict";
import type { SignalEngine, SnoozeSignalInput } from "../src/domain/waymark/services";
import { SignalTargetType } from "../src/domain/waymark/enums";
import { createSignalOrchestrator } from "../src/lib/waymark/signalOrchestrator";

function expectDefined<T>(value: T | null | undefined, label: string): NonNullable<T> {
  assert.ok(value, `${label} should be defined`);
  return value as NonNullable<T>;
}

function createSignalEngineStub(overrides: {
  snoozeSignal?: (input: SnoozeSignalInput) => Promise<Awaited<ReturnType<SignalEngine["snoozeSignal"]>>>;
} = {}): SignalEngine {
  const unsupported = async () => {
    throw new Error("Unexpected SignalEngine call in test.");
  };

  return {
    canTransitionSignalStatus: () => true,
    createSignal: unsupported,
    generateSeededSignalsForDate: unsupported,
    ringDueSignals: unsupported,
    snoozeSignal: overrides.snoozeSignal ?? unsupported,
    dismissSignal: unsupported,
    missSignal: unsupported,
    resolveSignal: unsupported,
    resolveSignalsForTarget: unsupported,
    expireSignal: unsupported,
    cancelSignal: unsupported,
    cancelSignalsForTarget: unsupported,
    getSignalModeContext: unsupported,
    reconcileSignalDeliveries: unsupported,
  };
}

async function runTests() {
  {
    const snoozeCapture: { current?: SnoozeSignalInput } = {};

    const orchestrator = createSignalOrchestrator({
      signalEngine: createSignalEngineStub({
        snoozeSignal: async (input) => {
          snoozeCapture.current = input;
          throw new Error("snoozeSignal return value should not be observed in this test.");
        },
      }),
      resolvePrimary: async () => {
        throw new Error("PRIMARY should not be called for snooze.");
      },
    });

    await orchestrator.resolveSignalIntent({
      signalId: "signal-1",
      targetId: "mark-1",
      targetType: SignalTargetType.MarkInstance,
      actionId: "snooze-10",
      kind: "SNOOZE",
      minutes: 10,
      occurredAt: "2026-05-20T05:30:00.000Z",
    });

    const resolvedSnoozePayload = expectDefined(snoozeCapture.current, "snooze payload");
    assert.equal(resolvedSnoozePayload.signalId, "signal-1");
    assert.equal(resolvedSnoozePayload.now, "2026-05-20T05:30:00.000Z");
    assert.equal(resolvedSnoozePayload.snoozedUntil, "2026-05-20T05:40:00.000Z");
  }

  {
    const calls: string[] = [];

    const orchestrator = createSignalOrchestrator({
      signalEngine: createSignalEngineStub({
        snoozeSignal: async () => {
          throw new Error("SNOOZE should not be called for primary/alternative/skip.");
        },
      }),
      resolvePrimary: async () => {
        calls.push("primary");
      },
      resolveAlternative: async () => {
        calls.push("alternative");
      },
      resolveSkipWithReason: async () => {
        calls.push("skip");
      },
      handleExitAttempt: async () => {
        calls.push("exit");
      },
    });

    await orchestrator.resolveSignalIntent({
      signalId: "signal-2",
      targetId: "pack-1",
      targetType: SignalTargetType.PackCheckInstance,
      actionId: "primary",
      kind: "PRIMARY",
    });
    await orchestrator.resolveSignalIntent({
      signalId: "signal-2",
      targetId: "pack-1",
      targetType: SignalTargetType.PackCheckInstance,
      actionId: "alternative",
      kind: "ALTERNATIVE",
    });
    await orchestrator.resolveSignalIntent({
      signalId: "signal-2",
      targetId: "pack-1",
      targetType: SignalTargetType.PackCheckInstance,
      actionId: "skip",
      kind: "SKIP_WITH_REASON",
    });
    await orchestrator.resolveSignalIntent({
      signalId: "signal-2",
      targetId: "pack-1",
      targetType: SignalTargetType.PackCheckInstance,
      actionId: "exit",
      kind: "EXIT_ATTEMPT",
    });

    assert.deepEqual(calls, ["primary", "alternative", "skip", "exit"]);
  }
}

runTests()
  .then(() => console.log("signal-orchestrator tests passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
