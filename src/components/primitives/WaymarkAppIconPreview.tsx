import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { foundationColors, semanticBorder, semanticRadius, semanticElevation, spacing } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { Locale } from "../../types/ui";
import { WaymarkLogo } from "./WaymarkLogo";
import { WaymarkLogoSize } from "../../skins/waymark/assets/logo";

type Props = {
  size?: WaymarkLogoSize;
  locale?: Locale;
  style?: StyleProp<ViewStyle>;
};

export function WaymarkAppIconPreview({ size = "lg", locale = "en", style }: Props) {
  return (
    <View style={[styles.tile, style]}>
      <WaymarkLogo decorative={false} locale={locale} size={size} variant="appIcon" />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: semanticRadius.card.default,
    backgroundColor: foundationColors.bg.paperWarm,
    ...getBorderStyle(semanticBorder.card.subtle),
    boxShadow: semanticElevation.row,
  },
});
