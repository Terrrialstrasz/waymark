import { BottomTabId } from "../../../types/ui";
import { WaymarkIcon, WaymarkIconState } from "../../primitives/WaymarkIcon";
import { WaymarkSemanticIconName } from "../../../design/waymark-icon-map";

type Props = {
  tab: BottomTabId;
  state?: Extract<WaymarkIconState, "default" | "active" | "pressed" | "disabled" | "muted">;
};

const semanticByTab: Record<BottomTabId, WaymarkSemanticIconName> = {
  today: "nav.today",
  journal: "nav.journal",
  capture: "nav.capture",
  paths: "nav.paths",
  me: "nav.me",
};

export function BottomNavIcon({ tab, state = "default" }: Props) {
  return (
    <WaymarkIcon
      customHeight={tab === "capture" ? undefined : 34}
      customWidth={tab === "capture" ? undefined : 34}
      decorative
      semanticName={semanticByTab[tab]}
      size={tab === "capture" ? "xl" : "custom"}
      state={state}
    />
  );
}
