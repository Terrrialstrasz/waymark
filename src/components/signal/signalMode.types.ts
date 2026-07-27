import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { EntityId } from "../../domain/waymark/core";
import { SignalTargetType } from "../../domain/waymark/enums";
import type { SignalIntentKind, SignalModeIntentPayload } from "../../types/signalMode";

export type SignalModeVisualState =
  | "scheduled"
  | "ringing"
  | "snoozed"
  | "resolving"
  | "resolved"
  | "disabled"
  | "error"
  | "missed";

export type SignalModeCardVariant =
  | "standard"
  | "compact"
  | "hero"
  | "withPrimarySlot"
  | "secondaryOnly"
  | "resolveRequired"
  | "readOnlyResolved";

export type SignalModeAction = {
  id: string;
  kind: SignalIntentKind;
  label: string;
  iconSemanticName?: WaymarkSemanticIconName;
  minutes?: number;
  disabled?: boolean;
  disabledReason?: string;
  prominence?: "primary" | "secondary";
  loading?: boolean;
};

export type SignalModeCardModel = {
  signalId: EntityId;
  targetId: EntityId;
  targetType: SignalTargetType;
  status: SignalModeVisualState;
  title: string;
  subtitle?: string;
  scheduledTimeLabel?: string;
  relativeStatusLabel: string;
  resolveRequiredHint?: string;
  errorMessage?: string;
  actions: SignalModeAction[];
};

export type { SignalIntentKind, SignalModeIntentPayload };
