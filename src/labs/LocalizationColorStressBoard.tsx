import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { LocalizationLab } from "./LocalizationLab";
import { Locale } from "../types/ui";
import { WMCard } from "../components/primitives/WMCard";
import { WMText } from "../components/primitives/Text";
import { spacing } from "../theme/tokens";

export function LocalizationColorStressBoard({ locale }: { locale: Locale }) {
  const englishExample =
    "Long metadata and status labels should remain readable on cream and paper without fading into decorative color.";
  const vietnameseExample =
    "Những nhãn dài bằng tiếng Việt vẫn phải đọc được rõ ràng trên nền kem và nền giấy, kể cả khi chữ metadata nhỏ hơn.";

  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="LocalizationColorStressBoard"
        subtitle="English and Vietnamese text stress on app background, paper, and gold-soft surfaces."
      >
        <WMCard>
          <WMText variant="cardTitle">English</WMText>
          <WMText variant="body">{englishExample}</WMText>
          <WMText variant="meta">Sunday, May 11 at 7:15 PM</WMText>
        </WMCard>
        <WMCard tint="gold">
          <WMText variant="cardTitle">Tiếng Việt</WMText>
          <WMText variant="body">{vietnameseExample}</WMText>
          <WMText variant="meta">Chủ nhật, ngày 11 tháng 5 lúc 19:15</WMText>
        </WMCard>
      </BoardSection>

      <LocalizationLab locale={locale} />
    </View>
  );
}
