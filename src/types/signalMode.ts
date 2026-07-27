import { EntityId, ISODateTimeString } from "../domain/waymark/core";
import { SignalTargetType } from "../domain/waymark/enums";

export type SignalIntentKind =
  | "PRIMARY"
  | "SNOOZE"
  | "ALTERNATIVE"
  | "SKIP_WITH_REASON"
  | "EXIT_ATTEMPT";

export type SignalModeIntentPayload = {
  signalId: EntityId;
  targetId: EntityId;
  targetType: SignalTargetType;
  actionId: string;
  kind: SignalIntentKind;
  minutes?: number;
  occurredAt?: ISODateTimeString;
};
