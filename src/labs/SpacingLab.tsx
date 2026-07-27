import { View } from "react-native";
import { FoundationSpacingBoard } from "./FoundationSpacingBoard";
import { ScreenRhythmBoard } from "./ScreenRhythmBoard";
import { CardSpacingBoard } from "./CardSpacingBoard";
import { RowSpacingBoard } from "./RowSpacingBoard";
import { ChipSpacingBoard } from "./ChipSpacingBoard";
import { ActionSheetSpacingBoard } from "./ActionSheetSpacingBoard";
import { SessionSpacingBoard } from "./SessionSpacingBoard";
import { VietnameseWrappingSpacingBoard } from "./VietnameseWrappingSpacingBoard";
import { SafeAreaSpacingBoard } from "./SafeAreaSpacingBoard";
import { spacing } from "../theme/tokens";

export function SpacingLab() {
  return (
    <View style={{ gap: spacing.lg }}>
      <FoundationSpacingBoard />
      <ScreenRhythmBoard />
      <CardSpacingBoard />
      <RowSpacingBoard />
      <ChipSpacingBoard />
      <ActionSheetSpacingBoard />
      <SessionSpacingBoard />
      <VietnameseWrappingSpacingBoard />
      <SafeAreaSpacingBoard />
    </View>
  );
}
