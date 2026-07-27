import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { foundationColors, radius, semanticSpacing, spacing } from "../theme/tokens";
import { WMText } from "../components/primitives/Text";

export function ScreenRhythmBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="ScreenRhythmBoard"
        subtitle="Screen margin, section rhythm, and bottom nav clearance."
      >
        <View
          style={{
            backgroundColor: foundationColors.bg.paper,
            borderColor: foundationColors.border.soft,
            borderRadius: radius.lg,
            borderWidth: 1,
            paddingHorizontal: semanticSpacing.screen.x,
            paddingTop: semanticSpacing.screen.top,
            paddingBottom: semanticSpacing.screen.bottom,
            gap: semanticSpacing.section.gap,
          }}
        >
          <View style={{ gap: spacing.xs }}>
            <WMText variant="screenTitle">Today stays breathable</WMText>
            <WMText variant="bodySm">Calm intro space before the first major card.</WMText>
          </View>
          <View
            style={{
              backgroundColor: foundationColors.bg.paperSoft,
              borderRadius: radius.md,
              padding: semanticSpacing.card.padding.md,
            }}
          >
            <WMText variant="cardTitle">First section card</WMText>
          </View>
          <View
            style={{
              backgroundColor: foundationColors.green.soft,
              borderRadius: radius.md,
              padding: semanticSpacing.card.padding.md,
            }}
          >
            <WMText variant="cardTitle">Final card still breathes above nav</WMText>
          </View>
        </View>
      </BoardSection>
    </View>
  );
}
