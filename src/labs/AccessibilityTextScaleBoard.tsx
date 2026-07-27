import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { foundationColors, radius, spacing, typography } from "../theme/tokens";
import { WMText } from "../components/primitives/Text";

export function AccessibilityTextScaleBoard() {
  const titleScale = {
    ...typography.cardTitle,
    fontSize: 24,
    lineHeight: 31,
  };

  const bodyScale = {
    ...typography.body,
    fontSize: 18,
    lineHeight: 28,
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="AccessibilityTextScaleBoard"
        subtitle="Larger text scaling should preserve hierarchy, wrapping, and calm spacing."
      >
        <View
          style={{
            backgroundColor: foundationColors.bg.paper,
            borderColor: foundationColors.border.soft,
            borderWidth: 1,
            borderRadius: radius.lg,
            padding: spacing.md,
            gap: spacing.sm,
          }}
        >
          <WMText style={titleScale} variant="cardTitle">
            Kết quả hôm nay được bảo vệ
          </WMText>
          <WMText style={bodyScale} variant="body">
            Sức khỏe cần một bước sửa rõ ràng vào ngày mai.
          </WMText>
          <WMText style={{ ...typography.metaCompact, fontSize: 13, lineHeight: 18 }} variant="metaCompact">
            Gia đình & Nhà cửa - 19:15
          </WMText>
        </View>
      </BoardSection>
    </View>
  );
}
