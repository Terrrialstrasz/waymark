import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { densityTokens, foundationColors, radius, spacing } from "../theme/tokens";
import { WMText } from "../components/primitives/Text";

function SessionCard({
  title,
  subtitle,
  gap,
}: {
  title: string;
  subtitle: string;
  gap: number;
}) {
  return (
    <View
      style={{
        backgroundColor: foundationColors.bg.paper,
        borderColor: foundationColors.border.soft,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: densityTokens.session.cardPadding,
        gap,
      }}
    >
      <WMText variant="cardTitle">{title}</WMText>
      <WMText variant="bodySm">{subtitle}</WMText>
      <WMText variant="meta">Linear and readable sequence.</WMText>
    </View>
  );
}

export function SessionSpacingBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="SessionSpacingBoard"
        subtitle="Strength Session can be slightly denser than Walk Session, but neither should feel like a fitness dashboard."
      >
        <View style={{ gap: spacing.sm }}>
          <SessionCard title="Strength Session" subtitle="Clear sequence, modest density, enough rhythm." gap={10} />
          <SessionCard title="Walk Session" subtitle="Lighter pacing, more air between blocks." gap={14} />
        </View>
      </BoardSection>
    </View>
  );
}
