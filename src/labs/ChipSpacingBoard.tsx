import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { semanticSpacing, spacing } from "../theme/tokens";
import { WMBadge } from "../components/primitives/WMBadge";
import { WMChip } from "../components/primitives/WMChip";

export function ChipSpacingBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="ChipSpacingBoard"
        subtitle="Status chips and entity chips should stay readable and touch-safe."
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: semanticSpacing.chip.wrapGap }}>
          <WMBadge label="Protected" state="protected" />
          <WMBadge label="Rescheduled" state="rescheduled" />
          <WMBadge label="Substituted" state="substituted" />
          <WMChip label="Gia đình & Nhà cửa" selected />
          <WMChip label="Sức khỏe cần một bước sửa rõ ràng" />
        </View>
      </BoardSection>
    </View>
  );
}
