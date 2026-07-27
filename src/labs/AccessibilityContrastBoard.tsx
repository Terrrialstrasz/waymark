import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { formatContrastRatio, meetsContrast } from "../theme/color-contrast";
import { foundationColors, semanticStateTokens, spacing } from "../theme/tokens";
import { WMText } from "../components/primitives/Text";

const contrastChecks = [
  {
    label: "Primary ink on paper",
    fg: foundationColors.ink.primary,
    bg: foundationColors.bg.paper,
    minimum: 4.5,
  },
  {
    label: "Tertiary metadata on app bg",
    fg: foundationColors.ink.tertiary,
    bg: foundationColors.bg.app,
    minimum: 4.5,
  },
  {
    label: "Inverse text on primary green button",
    fg: foundationColors.ink.inverse,
    bg: foundationColors.green.base,
    minimum: 4.5,
  },
  {
    label: "On-gold text on planned surface",
    fg: semanticStateTokens.planned.text,
    bg: semanticStateTokens.planned.bg,
    minimum: 4.5,
  },
  {
    label: "On-clay text on weak surface",
    fg: semanticStateTokens.weak.text,
    bg: semanticStateTokens.weak.bg,
    minimum: 4.5,
  },
  {
    label: "On-green-soft text on active surface",
    fg: semanticStateTokens.active.text,
    bg: semanticStateTokens.active.bg,
    minimum: 4.5,
  },
];

export function AccessibilityContrastBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="AccessibilityContrastBoard"
        subtitle="Contrast checks for the combinations most likely to be used in cards, buttons, chips, and metadata."
      >
        <View style={{ gap: spacing.sm }}>
          {contrastChecks.map((check) => {
            const passed = meetsContrast(check.fg, check.bg, check.minimum);

            return (
              <View
                key={check.label}
                style={{
                  backgroundColor: check.bg,
                  borderColor: passed
                    ? foundationColors.border.active
                    : foundationColors.border.warning,
                  borderWidth: 1,
                  borderRadius: 18,
                  padding: spacing.md,
                  gap: spacing.xs,
                }}
              >
                <WMText style={{ color: check.fg }} variant="bodyStrong">
                  {check.label}
                </WMText>
                <WMText style={{ color: check.fg }} variant="meta">
                  {formatContrastRatio(check.fg, check.bg)} - {passed ? "PASS" : "FAIL"} - target{" "}
                  {check.minimum}:1
                </WMText>
              </View>
            );
          })}
        </View>
      </BoardSection>
    </View>
  );
}
