import { WaymarkEntitySemanticName } from "../../../design/waymark-icon-map";
import { IconBadge } from "../../primitives/IconBadge";

type Props = {
  entity: WaymarkEntitySemanticName;
  state?: "default" | "selected" | "pressed" | "disabled";
};

export function EntityIcon({ entity, state = "default" }: Props) {
  return <IconBadge decorative semanticName={`entity.${entity}`} shape="rounded" size="lg" state={state} tone="warm" />;
}
