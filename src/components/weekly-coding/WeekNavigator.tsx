import { Pressable, StyleSheet, View } from "react-native";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { getCopy } from "../../i18n/copy";
import { foundationColors, pageHeaderTokens, semanticElevation, semanticRadius, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";

type Props = {
  weekLabel: string;
  dateRangeLabel: string;
  locale?: Locale;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
};

export function WeekNavigator({
  weekLabel,
  dateRangeLabel,
  locale = "en",
  previousDisabled = false,
  nextDisabled = false,
  onPrevious,
  onNext,
}: Props) {
  const c = getCopy(locale).weeklyCoding;

  return (
    <View style={styles.row}>
      <WeekStepButton accessibilityLabel={c.accessibility.previousWeek} disabled={previousDisabled} direction="previous" onPress={onPrevious} />

      <View accessibilityLabel={c.accessibility.selectedWeek.replace("{week}", weekLabel).replace("{dateRange}", dateRangeLabel)} accessible style={styles.bookmark}>
        <View style={styles.bookmarkInner}>
          <WMText numberOfLines={1} style={styles.weekLabel} variant="sectionTitle">
            {weekLabel}
          </WMText>
          <WMText numberOfLines={1} style={styles.dateRange} variant="bodySm">
            {dateRangeLabel}
          </WMText>
        </View>
      </View>

      <WeekStepButton accessibilityLabel={c.accessibility.nextWeek} disabled={nextDisabled} direction="next" onPress={onNext} />
    </View>
  );
}

function WeekStepButton({
  direction,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  direction: "previous" | "next";
  accessibilityLabel: string;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, disabled ? styles.stepButtonDisabled : null, pressed ? styles.stepButtonPressed : null]}
    >
      <WaymarkIcon decorative semanticName={direction === "previous" ? "utility.back" : "utility.chevron"} size="sm" state={disabled ? "disabled" : "default"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepButton: {
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    borderRadius: semanticRadius.badge,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle("1px solid " + foundationColors.border.soft),
    alignItems: "center",
    justifyContent: "center",
    boxShadow: semanticElevation.flat,
  },
  stepButtonPressed: {
    backgroundColor: foundationColors.bg.paperWarm,
  },
  stepButtonDisabled: {
    opacity: 0.4,
  },
  bookmark: {
    flex: 1,
    minWidth: 0,
    borderRadius: semanticRadius.card.default,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle("1px solid " + foundationColors.border.soft),
    boxShadow: semanticElevation.card,
    overflow: "hidden",
  },
  bookmarkInner: {
    minHeight: 72,
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: pageHeaderTokens.color.surfaceSticky,
  },
  weekLabel: {
    color: foundationColors.ink.primary,
  },
  dateRange: {
    color: foundationColors.ink.secondary,
  },
});
