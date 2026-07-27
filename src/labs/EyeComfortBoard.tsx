import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { foundationColors, semanticElevation, spacing } from "../theme/tokens";
import { WMCard } from "../components/primitives/WMCard";
import { WMText } from "../components/primitives/Text";

export function EyeComfortBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="EyeComfortBoard"
        subtitle="Long-reading samples, metadata legibility, and reduced shadow haze under the locked direction."
      >
        <WMCard>
          <WMText variant="cardTitle">Long-reading card</WMText>
          <WMText variant="body">
            Waymark should feel like a private field journal. The paper surface stays warm, the ink stays readable,
            and metadata is dark enough to survive repeated daily use without disappearing into the background.
          </WMText>
          <WMText variant="meta">Metadata should still read at mobile sizes.</WMText>
        </WMCard>
        <View style={{ gap: spacing.sm }}>
          <View
            style={{
              backgroundColor: foundationColors.bg.paper,
              borderColor: foundationColors.border.soft,
              borderRadius: 18,
              borderWidth: 1,
              padding: spacing.md,
              boxShadow: semanticElevation.card,
            }}
          >
            <WMText variant="bodyStrong">Reduced paper shadow</WMText>
            <WMText variant="meta">rgba(80, 58, 22, 0.10)</WMText>
          </View>
          <View
            style={{
              backgroundColor: foundationColors.bg.paperWarm,
              borderColor: foundationColors.border.soft,
              borderRadius: 18,
              borderWidth: 1,
              padding: spacing.md,
              boxShadow: semanticElevation.flat,
            }}
          >
            <WMText variant="bodyStrong">No shadow comparison</WMText>
            <WMText variant="meta">Used for dense, flatter reading surfaces.</WMText>
          </View>
        </View>
      </BoardSection>
    </View>
  );
}
