import { View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { fontFamilyTokens, spacing } from "../theme/tokens";
import { WMText } from "../components/primitives/Text";

const tokenRows = [
  ["font.family.serifDisplay", fontFamilyTokens.serifDisplay.label],
  ["font.family.serif", fontFamilyTokens.serif.label],
  ["font.family.sans", fontFamilyTokens.sans.label],
  ["font.family.numeric", `${fontFamilyTokens.numeric.label} with tabular numbers`],
  ["type.display.hero", "36 / 42 / 600 / serif display"],
  ["type.screen.title", "32 / 38 / 600 / serif display"],
  ["type.card.title", "21 / 27 / 600 / serif"],
  ["type.body.md", "15 / 23 / 400 / sans"],
  ["type.meta", "12 / 16 / 500 / sans"],
  ["type.nav", "11 / 14 / 600 / sans"],
] as const;

export function FoundationTypographyBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="FoundationTypographyBoard"
        subtitle="Official typography tokens for the locked direction."
      >
        <View style={{ gap: spacing.sm }}>
          {tokenRows.map(([token, value]) => (
            <View key={token} style={{ gap: 2 }}>
              <WMText variant="bodyStrong">{token}</WMText>
              <WMText variant="meta">{value}</WMText>
            </View>
          ))}
        </View>
      </BoardSection>
    </View>
  );
}
