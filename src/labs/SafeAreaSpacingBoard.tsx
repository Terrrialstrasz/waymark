import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { foundationColors, radius, semanticSpacing, semanticTokens, spacing } from "../theme/tokens";
import { WMText } from "../components/primitives/Text";

export function SafeAreaSpacingBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="SafeAreaSpacingBoard"
        subtitle="Bottom nav clearance, capture tap zone, and sheet safe-area padding."
      >
        <View
          style={{
            backgroundColor: foundationColors.bg.paper,
            borderColor: foundationColors.border.soft,
            borderWidth: 1,
            borderRadius: radius.lg,
            padding: semanticSpacing.screen.x,
            gap: semanticSpacing.section.gap,
          }}
        >
          <View
            style={{
              backgroundColor: foundationColors.bg.paperSoft,
              borderRadius: radius.md,
              padding: semanticSpacing.card.padding.md,
            }}
          >
            <WMText variant="cardTitle">Final content block</WMText>
            <WMText variant="meta">{`${semanticSpacing.screen.bottom}px bottom clearance above nav`}</WMText>
          </View>
          <View
            style={{
              alignSelf: "center",
              width: semanticTokens.size.captureLeaf.tapTarget,
              height: semanticTokens.size.captureLeaf.tapTarget,
              borderRadius: semanticTokens.radius.captureLeaf.tapTarget,
              backgroundColor: foundationColors.green.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WMText variant="chip">{`${semanticTokens.size.captureLeaf.tapTarget}px`}</WMText>
          </View>
        </View>
      </BoardSection>
    </View>
  );
}
