import { StyleSheet, Text as RNText, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { foundationColors, radius, spacing, typographyReviewOptions } from "../theme/tokens";

export function TypographyVisualReviewBoard() {
  return (
    <View style={styles.stack}>
      <BoardSection
        title="Typography Visual Review Board"
        subtitle="Compare the three typography directions before locking primitive usage."
      >
        <View style={styles.stack}>
          {typographyReviewOptions.map((option) => (
            <View key={option.id} style={styles.optionCard}>
              <View style={styles.optionHeader}>
                <RNText style={[styles.optionTag, styles.optionTagPrimary]}>{option.id}</RNText>
                <RNText style={styles.optionStatus}>{option.status}</RNText>
              </View>
              <RNText
                style={[
                  styles.optionDisplay,
                  {
                    fontFamily: option.families.display,
                  },
                ]}
              >
                Kết quả hôm nay được bảo vệ
              </RNText>
              <RNText
                style={[
                  styles.optionTitle,
                  {
                    fontFamily: option.families.serif,
                  },
                ]}
              >
                {option.name}
              </RNText>
              <RNText
                style={[
                  styles.optionBody,
                  {
                    fontFamily: option.families.sans,
                  },
                ]}
              >
                Sức khỏe cần một bước sửa rõ ràng vào ngày mai.
              </RNText>
              <RNText style={styles.optionMeta}>{option.pairing}</RNText>
              <RNText style={styles.optionMeta}>{option.notes}</RNText>
            </View>
          ))}
        </View>
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  optionCard: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionTag: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  optionTagPrimary: {
    color: foundationColors.green.base,
  },
  optionStatus: {
    fontSize: 11,
    lineHeight: 15,
    color: foundationColors.ink.tertiary,
    fontWeight: "500",
  },
  optionDisplay: {
    fontSize: 28,
    lineHeight: 34,
    color: foundationColors.ink.primary,
    fontWeight: "600",
    letterSpacing: -0.28,
  },
  optionTitle: {
    fontSize: 20,
    lineHeight: 26,
    color: foundationColors.ink.primary,
    fontWeight: "600",
  },
  optionBody: {
    fontSize: 15,
    lineHeight: 23,
    color: foundationColors.ink.secondary,
  },
  optionMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: foundationColors.ink.tertiary,
  },
});
