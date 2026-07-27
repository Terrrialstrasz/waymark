import { WaymarkHealthSemanticName } from "../../../design/waymark-icon-map";
import { IconBadge } from "../../primitives/IconBadge";

type Props = {
  session: WaymarkHealthSemanticName;
  state?: "default" | "selected" | "completed" | "disabled";
};

export function HealthSessionIcon({ session, state = "default" }: Props) {
  return <IconBadge decorative semanticName={`health.${session}`} shape="softSquare" size="lg" state={state} tone="green" />;
}
