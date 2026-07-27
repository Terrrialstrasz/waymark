import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { baseSpacing, semanticSpacing, spacing } from "../theme/tokens";
import { WMText } from "../components/primitives/Text";

export function FoundationSpacingBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="FoundationSpacingBoard"
        subtitle="Base spacing scale and semantic spacing tokens for Calm Field-Journal Rhythm."
      >
        <View style={{ gap: spacing.sm }}>
          {Object.entries(baseSpacing).map(([key, value]) => (
            <View key={key} style={{ gap: 2 }}>
              <WMText variant="bodyStrong">{`space.${key}`}</WMText>
              <WMText variant="meta">{`${value}px`}</WMText>
            </View>
          ))}
        </View>
      </BoardSection>

      <BoardSection title="Semantic spacing">
        <View style={{ gap: spacing.sm }}>
          <WMText variant="bodyStrong">{`space.screen.x = ${semanticSpacing.screen.x}px`}</WMText>
          <WMText variant="bodyStrong">{`space.screen.bottom = ${semanticSpacing.screen.bottom}px`}</WMText>
          <WMText variant="bodyStrong">{`space.card.padding.md = ${semanticSpacing.card.padding.md}px`}</WMText>
          <WMText variant="bodyStrong">{`space.section.gap = ${semanticSpacing.section.gap}px`}</WMText>
          <WMText variant="bodyStrong">{`space.button.paddingX = ${semanticSpacing.button.paddingX}px`}</WMText>
          <WMText variant="bodyStrong">{`space.nav.safeBottom = ${semanticSpacing.nav.safeBottom}px`}</WMText>
        </View>
      </BoardSection>
    </View>
  );
}
