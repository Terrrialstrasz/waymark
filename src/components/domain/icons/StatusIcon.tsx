import { IconBadge } from "../../primitives/IconBadge";

export type WaymarkRealStatusValue =
  | "planned"
  | "done"
  | "active"
  | "weak"
  | "missed"
  | "protected"
  | "upcoming"
  | "inProgress";

type Props = {
  status: WaymarkRealStatusValue;
  state?: "default" | "selected" | "disabled";
};

export function StatusIcon({ status, state = "default" }: Props) {
  const toneByStatus: Record<WaymarkRealStatusValue, "amber" | "green" | "warning" | "muted"> = {
    planned: "amber",
    done: "green",
    active: "green",
    weak: "warning",
    missed: "warning",
    protected: "green",
    upcoming: "amber",
    inProgress: "green",
  };

  return <IconBadge decorative semanticName={`status.${status}`} shape="circle" size="md" state={state} tone={toneByStatus[status]} />;
}
