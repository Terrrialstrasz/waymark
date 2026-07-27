import { StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { foundationColors, semanticElevation, spacing } from "../theme/tokens";
import { Locale } from "../types/ui";
import { BottomNavBar } from "../components/primitives/BottomNavBar";
import { PageHeader } from "../components/primitives/PageHeader";
import { WMBadge } from "../components/primitives/WMBadge";
import { WMButton } from "../components/primitives/WMButton";
import { WMCard } from "../components/primitives/WMCard";
import { WMText } from "../components/primitives/Text";

export function ComponentTypographyStressBoard({ locale }: { locale: Locale }) {
  return (
    <View style={styles.stack}>
      <BoardSection
        title="ComponentTypographyStressBoard"
        subtitle="Typography applied to header, cards, chips, buttons, nav, and action sheet content."
      >
        <PageHeader
          eyebrow="Waymark"
          title={locale === "en" ? "Today is still recoverable" : "Hôm nay vẫn có thể cứu lại được"}
          subtitle={
            locale === "en"
              ? "One visible mark is enough."
              : "Chỉ cần một dấu mốc nhìn thấy được là đủ."
          }
        />
      </BoardSection>

      <WMCard>
        <WMBadge label={locale === "en" ? "Protected" : "Được bảo vệ"} state="protected" />
        <WMText variant="cardTitle">Kết quả hôm nay được bảo vệ</WMText>
        <WMText variant="bodySm">Sức khỏe cần một bước sửa rõ ràng vào ngày mai.</WMText>
        <WMText variant="meta">Gia đình & Nhà cửa - 19:15</WMText>
      </WMCard>

      <View style={styles.buttonRow}>
        <WMButton label={locale === "en" ? "Leave Mark" : "Ghi lại dấu mốc"} />
        <WMButton label={locale === "en" ? "Reschedule" : "Đã dời lịch có chủ đích"} variant="secondary" />
      </View>

      <View style={styles.sheetPreview}>
        <WMText variant="sheetTitle">{locale === "en" ? "Close the Day" : "Đóng ngày hôm nay"}</WMText>
        <WMText variant="body">
          {locale === "en"
            ? "Choose the calm next action."
            : "Chọn hành động tiếp theo một cách bình tĩnh."}
        </WMText>
      </View>

      <BottomNavBar activeTab="today" locale={locale} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  buttonRow: {
    gap: spacing.sm,
  },
  sheetPreview: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: 28,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
    boxShadow: semanticElevation.sheet,
  },
});
