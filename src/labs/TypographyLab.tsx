import { View } from "react-native";
import { TypographyVisualReviewBoard } from "./TypographyVisualReviewBoard";
import { FoundationTypographyBoard } from "./FoundationTypographyBoard";
import { SerifIdentityBoard } from "./SerifIdentityBoard";
import { BodyReadabilityBoard } from "./BodyReadabilityBoard";
import { ComponentTypographyStressBoard } from "./ComponentTypographyStressBoard";
import { VietnameseWrappingBoard } from "./VietnameseWrappingBoard";
import { TimerNumberBoard } from "./TimerNumberBoard";
import { AccessibilityTextScaleBoard } from "./AccessibilityTextScaleBoard";
import { Locale } from "../types/ui";
import { spacing } from "../theme/tokens";

export function TypographyLab({ locale }: { locale: Locale }) {
  return (
    <View style={{ gap: spacing.lg }}>
      <TypographyVisualReviewBoard />
      <FoundationTypographyBoard />
      <SerifIdentityBoard />
      <BodyReadabilityBoard />
      <ComponentTypographyStressBoard locale={locale} />
      <VietnameseWrappingBoard />
      <TimerNumberBoard />
      <AccessibilityTextScaleBoard />
    </View>
  );
}
