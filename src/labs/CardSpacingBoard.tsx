import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { densityTokens, foundationColors, radius, semanticSpacing, spacing } from "../theme/tokens";
import { WMText } from "../components/primitives/Text";

function SpacingCard({
  label,
  padding,
}: {
  label: string;
  padding: number;
}) {
  return (
    <View
      style={{
        backgroundColor: foundationColors.bg.paper,
        borderColor: foundationColors.border.soft,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding,
        gap: semanticSpacing.card.gap,
      }}
    >
      <WMText variant="cardTitle">{label}</WMText>
      <WMText variant="bodySm">Card padding changes density without shrinking typography.</WMText>
      <WMText variant="meta">{`${padding}px padding`}</WMText>
    </View>
  );
}

export function CardSpacingBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="CardSpacingBoard"
        subtitle="Compact, default, and hero card spacing."
      >
        <View style={{ gap: spacing.sm }}>
          <SpacingCard label="Compact Card" padding={densityTokens.compact.cardPadding} />
          <SpacingCard label="Default Card" padding={densityTokens.calm.cardPadding} />
          <SpacingCard label="Hero Card" padding={densityTokens.hero.cardPadding} />
        </View>
      </BoardSection>
    </View>
  );
}
