import { StyleSheet, View } from "react-native";
import { markCards, memory, plannedMarks } from "../mocks/data";
import { colors, spacing } from "../theme/tokens";
import { Locale } from "../types/ui";
import { MarkCard } from "../components/domain/MarkCard";
import { MemoryCard } from "../components/domain/MemoryCard";
import { PlannedMarkCard } from "../components/domain/PlannedMarkCard";
import { WMCard } from "../components/primitives/WMCard";
import { WMSectionHeader } from "../components/primitives/WMSectionHeader";
import { WMText } from "../components/primitives/Text";

type Props = {
  locale: Locale;
};

export function LocalizationLab({ locale }: Props) {
  return (
    <View style={styles.stack}>
      <WMSectionHeader
        title={locale === "en" ? "English / Vietnamese fit check" : "Kiểm tra độ vừa của tiếng Anh / tiếng Việt"}
      />
      <WMCard tint="gold">
        <WMText variant="cardTitle">
          {locale === "en" ? "Long-text expectation" : "Kỳ vọng với văn bản dài"}
        </WMText>
        <WMText style={styles.copy} variant="body">
          {locale === "en"
            ? "These examples intentionally use realistic long Vietnamese phrases so cards, chips, buttons, and metadata lines can wrap without clipping."
            : "Những ví dụ này cố ý dùng câu tiếng Việt dài và thật để kiểm tra việc xuống dòng của card, chip, nút bấm và các dòng metadata mà không bị cắt cụt khó chịu."}
        </WMText>
      </WMCard>
      <PlannedMarkCard item={plannedMarks[0]} locale={locale} />
      <MarkCard item={markCards[1]} locale={locale} />
      <MemoryCard item={memory} locale={locale} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  copy: {
    color: colors.textMuted,
  },
});
