import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { spacing } from "../theme/tokens";
import { WMButton } from "../components/primitives/WMButton";
import { WMCard } from "../components/primitives/WMCard";
import { WMText } from "../components/primitives/Text";

export function VietnameseWrappingBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="VietnameseWrappingBoard"
        subtitle="Stress strings for wrapping, diacritics, and density."
      >
        <WMCard>
          <WMText numberOfLines={3} variant="cardTitle">
            Kết quả hôm nay được bảo vệ
          </WMText>
          <WMText variant="bodySm">Sức khỏe cần một bước sửa rõ ràng vào ngày mai</WMText>
          <WMText variant="meta">Gia đình & Nhà cửa</WMText>
        </WMCard>
        <View style={{ gap: spacing.sm }}>
          <WMButton fullWidth label="Ghi lại một dấu mốc nhỏ nhưng thật" />
          <WMButton fullWidth label="Đã dời lịch có chủ đích" variant="secondary" />
        </View>
        <WMText variant="meta">Đóng ngày hôm nay</WMText>
      </BoardSection>
    </View>
  );
}
