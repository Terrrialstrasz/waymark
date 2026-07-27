import { StatusChip } from "../primitives/StatusChip";
import { PrivacyStatusBadgeState } from "./types";

type Props = {
  label: string;
  state: PrivacyStatusBadgeState;
  accessibilityLabel?: string;
};

export function PrivacyStatusBadge({ label, state, accessibilityLabel }: Props) {
  const resolvedStateTone =
    state === "protected"
      ? "done"
      : state === "warning"
        ? "warning"
        : state === "unavailable"
          ? "disabled"
          : "quieted";

  const iconSemanticName =
    state === "protected"
      ? "status.protected"
      : state === "warning"
        ? "status.missed"
        : state === "unavailable"
          ? "utility.close"
          : "status.upcoming";

  return (
    <StatusChip
      accessibilityLabel={accessibilityLabel ?? label}
      iconSemanticName={iconSemanticName}
      label={label}
      size="compact"
      stateTone={resolvedStateTone}
    />
  );
}
