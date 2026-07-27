import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { spacing } from "../theme/tokens";
import { WMCard } from "../components/primitives/WMCard";
import { WMText } from "../components/primitives/Text";

export function BodyReadabilityBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="BodyReadabilityBoard"
        subtitle="English and Vietnamese paragraph reading with generous line height."
      >
        <WMCard>
          <WMText variant="cardTitle">English Reading Sample</WMText>
          <WMText variant="bodyLg">
            Waymark should read like a calm field journal. The body stays sans-led so long notes, reflections, and
            helper text remain stable on mobile.
          </WMText>
          <WMText variant="meta">Body large - 17 / 27</WMText>
        </WMCard>
        <WMCard>
          <WMText variant="cardTitle">Mẫu tiếng Việt</WMText>
          <WMText variant="bodyLg">
            Sức khỏe cần một bước sửa rõ ràng vào ngày mai. Nhịp chữ phải thoáng, đủ thở, và không làm dấu tiếng Việt
            bị dính hoặc chật khi đọc lâu.
          </WMText>
          <WMText variant="meta">Body large - 17 / 27</WMText>
        </WMCard>
      </BoardSection>
    </View>
  );
}
