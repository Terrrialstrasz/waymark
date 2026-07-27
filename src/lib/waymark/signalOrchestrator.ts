import { EntityId, ISODateTimeString } from "../../domain/waymark/core";
import { SignalTargetType } from "../../domain/waymark/enums";
import { SignalEngine } from "../../domain/waymark/services";
import { SignalModeIntentPayload } from "../../types/signalMode";

export interface SignalPrimaryResolutionInput {
  signalId: EntityId;
  targetId: EntityId;
  targetType: SignalTargetType;
  actionId: string;
  occurredAt?: ISODateTimeString;
}

export interface SignalAlternativeResolutionInput extends SignalPrimaryResolutionInput {}
export interface SignalSkipResolutionInput extends SignalPrimaryResolutionInput {
  reason?: string;
}
export interface SignalExitAttemptInput extends SignalPrimaryResolutionInput {}

export interface SignalOrchestratorDependencies {
  signalEngine: SignalEngine;
  resolvePrimary: (input: SignalPrimaryResolutionInput) => Promise<void>;
  resolveAlternative?: (input: SignalAlternativeResolutionInput) => Promise<void>;
  resolveSkipWithReason?: (input: SignalSkipResolutionInput) => Promise<void>;
  handleExitAttempt?: (input: SignalExitAttemptInput) => Promise<void>;
}

export interface SignalOrchestrator {
  resolveSignalIntent(input: SignalModeIntentPayload & { reason?: string }): Promise<void>;
}

export function createSignalOrchestrator(
  dependencies: SignalOrchestratorDependencies,
): SignalOrchestrator {
  return {
    async resolveSignalIntent(input) {
      switch (input.kind) {
        case "SNOOZE": {
          if (!input.minutes || input.minutes <= 0) {
            throw new Error("Snooze minutes are required.");
          }

          const base = input.occurredAt ? new Date(input.occurredAt) : new Date();
          const snoozedUntil = new Date(base.getTime() + input.minutes * 60_000).toISOString();
          await dependencies.signalEngine.snoozeSignal({
            signalId: input.signalId,
            snoozedUntil,
            now: input.occurredAt,
          });
          return;
        }
        case "PRIMARY":
          await dependencies.resolvePrimary(input);
          return;
        case "ALTERNATIVE":
          if (!dependencies.resolveAlternative) {
            throw new Error("Alternative resolution is unavailable.");
          }
          await dependencies.resolveAlternative(input);
          return;
        case "SKIP_WITH_REASON":
          if (!dependencies.resolveSkipWithReason) {
            throw new Error("Skip resolution is unavailable.");
          }
          await dependencies.resolveSkipWithReason(input);
          return;
        case "EXIT_ATTEMPT":
          if (!dependencies.handleExitAttempt) {
            return;
          }
          await dependencies.handleExitAttempt(input);
          return;
        default:
          assertNever(input.kind);
      }
    },
  };
}

function assertNever(value: never): never {
  throw new Error(`Unsupported signal intent: ${String(value)}`);
}
