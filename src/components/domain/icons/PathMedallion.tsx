import { WaymarkPathIdentitySemanticName } from "../../../design/waymark-icon-map";
import { IconBadge } from "../../primitives/IconBadge";

type Props = {
  domain: WaymarkPathIdentitySemanticName;
  state?: "default" | "selected" | "completed";
};

export function PathMedallion({ domain, state = "default" }: Props) {
  return <IconBadge decorative semanticName={`pathIdentity.${domain}`} shape="seal" size="xl" state={state} tone="warm" />;
}
