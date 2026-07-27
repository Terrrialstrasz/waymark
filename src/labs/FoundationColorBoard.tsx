import { View } from "react-native";
import { BoardSection, PreviewPill, TokenGrid, TokenSwatch } from "./BoardPrimitives";
import { foundationColors, spacing } from "../theme/tokens";

export function FoundationColorBoard() {
  return (
    <View style={{ gap: spacing.lg }}>
      <BoardSection
        title="FoundationColorBoard / Eye Comfort Hybrid"
        subtitle="Warm cream surfaces, restrained gold, protected green, humane repair tones, and darker metadata for long reading."
      >
        <TokenGrid>
          <TokenSwatch label="App background" token="color.bg.app" value={foundationColors.bg.app} />
          <TokenSwatch label="Paper surface" token="color.bg.paper" value={foundationColors.bg.paper} />
          <TokenSwatch label="Paper warm" token="color.bg.paperWarm" value={foundationColors.bg.paperWarm} />
          <TokenSwatch label="Paper soft" token="color.bg.paperSoft" value={foundationColors.bg.paperSoft} />
          <TokenSwatch label="Sunken" token="color.bg.sunken" value={foundationColors.bg.sunken} />
          <TokenSwatch label="Disabled surface" token="color.bg.disabled" value={foundationColors.bg.disabled} />
        </TokenGrid>
      </BoardSection>

      <BoardSection title="FoundationColorBoard / Ink">
        <TokenGrid>
          <TokenSwatch label="Primary ink" token="color.ink.primary" value={foundationColors.ink.primary} />
          <TokenSwatch label="Secondary ink" token="color.ink.secondary" value={foundationColors.ink.secondary} />
          <TokenSwatch label="Tertiary ink" token="color.ink.tertiary" value={foundationColors.ink.tertiary} />
          <TokenSwatch label="Inverse ink" token="color.ink.inverse" value={foundationColors.ink.inverse} />
          <TokenSwatch label="On gold" token="color.ink.onGold" value={foundationColors.ink.onGold} />
          <TokenSwatch label="Disabled ink" token="color.ink.disabled" value={foundationColors.ink.disabled} />
        </TokenGrid>
      </BoardSection>

      <BoardSection title="FoundationColorBoard / Accents">
        <TokenGrid>
          <TokenSwatch label="Green primary" token="color.green.primary" value={foundationColors.green.base} />
          <TokenSwatch label="Green deep" token="color.green.deep" value={foundationColors.green.deep} />
          <TokenSwatch label="Green soft" token="color.green.soft" value={foundationColors.green.soft} />
          <TokenSwatch label="Gold base" token="color.gold.base" value={foundationColors.gold.base} />
          <TokenSwatch label="Gold soft" token="color.gold.soft" value={foundationColors.gold.soft} />
          <TokenSwatch label="Clay base" token="color.clay.base" value={foundationColors.clay.base} />
          <TokenSwatch label="Missed soft" token="color.missed.soft" value={foundationColors.missed.soft} />
          <TokenSwatch label="Archive blue" token="color.archive.blue" value={foundationColors.archive.blue} />
        </TokenGrid>
      </BoardSection>

      <BoardSection title="FoundationColorBoard / Borders and Shadows">
        <TokenGrid>
          <TokenSwatch label="Soft border" token="color.border.soft" value={foundationColors.border.soft} />
          <TokenSwatch label="Active border" token="color.border.active" value={foundationColors.border.active} />
          <TokenSwatch label="Proof border" token="color.border.proof" value={foundationColors.border.proof} />
          <TokenSwatch label="Warning border" token="color.border.warning" value={foundationColors.border.warning} />
          <TokenSwatch label="Missed border" token="color.border.missed" value={foundationColors.border.missed} />
        </TokenGrid>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <PreviewPill
            label={`paper ${foundationColors.shadow.paper}`}
            backgroundColor={foundationColors.bg.paper}
            color={foundationColors.ink.secondary}
            borderColor={foundationColors.border.soft}
          />
          <PreviewPill
            label={`paperMedium ${foundationColors.shadow.paperMedium}`}
            backgroundColor={foundationColors.bg.paper}
            color={foundationColors.ink.secondary}
            borderColor={foundationColors.border.soft}
          />
          <PreviewPill
            label={`green ${foundationColors.shadow.green}`}
            backgroundColor={foundationColors.green.soft}
            color={foundationColors.ink.onGreenSoft}
            borderColor={foundationColors.border.active}
          />
        </View>
      </BoardSection>
    </View>
  );
}
