import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { spacing } from "../theme/tokens";
import { WMButton } from "../components/primitives/WMButton";
import { WMCard } from "../components/primitives/WMCard";
import { WMText } from "../components/primitives/Text";

export function VietnameseWrappingSpacingBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="VietnameseWrappingSpacingBoard"
        subtitle="Long Vietnamese labels should wrap vertically instead of forcing cramped spacing."
      >
        <WMCard>
          <WMText variant="cardTitle">Sức khỏe cần một bước sửa rõ ràng vào ngày mai</WMText>
          <WMText variant="bodySm">Gia đình & Nhà cửa</WMText>
          <WMText variant="meta">Đã dời lịch có chủ đích</WMText>
        </WMCard>
        <View style={{ gap: spacing.sm }}>
          <WMButton fullWidth label="Ghi lại một dấu mốc nhỏ nhưng thật" />
          <WMButton fullWidth label="Đóng ngày hôm nay" variant="secondary" />
        </View>
      </BoardSection>
    </View>
  );
}
