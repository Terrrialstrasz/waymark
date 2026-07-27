import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { spacing } from "../theme/tokens";
import { WMCard } from "../components/primitives/WMCard";
import { WMText } from "../components/primitives/Text";

export function TimerNumberBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="TimerNumberBoard"
        subtitle="Tabular number behavior for timer, counts, and compact date numerals."
      >
        <WMCard>
          <WMText variant="timer">12:48</WMText>
          <WMText variant="meta">CircularTimer number</WMText>
        </WMCard>
        <WMCard>
          <WMText variant="numeric">24</WMText>
          <WMText variant="meta">Date badge number</WMText>
        </WMCard>
      </BoardSection>
    </View>
  );
}
