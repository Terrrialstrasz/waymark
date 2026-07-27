import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { spacing } from "../theme/tokens";
import { WMListRow } from "../components/primitives/WMListRow";

export function RowSpacingBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="RowSpacingBoard"
        subtitle="Entity row, journal row, and action row spacing should stay scannable without turning table-like."
      >
        <View>
          <WMListRow icon="●" title="Family & Home" subtitle="One clear visible mark tonight" trailing="Open" />
          <WMListRow icon="◌" title="Journal Entry" subtitle="Private record, not a feed post" trailing="Review" />
          <WMListRow icon="↺" title="Reschedule" subtitle="Intentional movement, still calm" trailing="Choose" />
        </View>
      </BoardSection>
    </View>
  );
}
