import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { foundationColors, radius, semanticElevation, semanticSpacing, spacing } from "../theme/tokens";
import { WMButton } from "../components/primitives/WMButton";
import { WMText } from "../components/primitives/Text";

export function ActionSheetSpacingBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="ActionSheetSpacingBoard"
        subtitle="Capture chooser and action sheet spacing should stay thumb-friendly and low on the screen."
      >
        <View
          style={{
            backgroundColor: foundationColors.bg.paper,
            borderColor: foundationColors.border.soft,
            borderWidth: 1,
            borderRadius: radius.xl,
            paddingHorizontal: semanticSpacing.sheet.paddingX,
            paddingTop: semanticSpacing.sheet.paddingTop,
            paddingBottom: semanticSpacing.sheet.paddingBottom,
            gap: semanticSpacing.card.gap,
            boxShadow: semanticElevation.sheet,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 48,
              height: 4,
              borderRadius: 999,
              backgroundColor: foundationColors.border.proof,
            }}
          />
          <WMText variant="sheetTitle">Capture Chooser</WMText>
          <WMButton label="Leave Mark" fullWidth />
          <WMButton label="Save Memory" fullWidth variant="secondary" />
          <WMButton label="Backlog Later" fullWidth variant="secondary" />
        </View>
      </BoardSection>
    </View>
  );
}
