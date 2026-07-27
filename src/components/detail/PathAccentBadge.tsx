import { StyleSheet, View } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { foundationColors, radius } from "../../theme/tokens";
import { PathSkin } from "../../tokens/pathVisualTokens";
import { WaymarkIcon } from "../primitives/WaymarkIcon";

type Props = {
  semanticName: WaymarkSemanticIconName;
  skin: PathSkin;
  size?: "headerSeal" | "sectionIcon" | "expeditionRowIcon";
};

const sizeMap = {
  headerSeal: { badge: 44, image: 34 },
  sectionIcon: { badge: 40, image: 30 },
  expeditionRowIcon: { badge: 36, image: 28 },
} as const;

export function PathAccentBadge({ semanticName, skin, size = "sectionIcon" }: Props) {
  const { badge, image } = sizeMap[size];

  return (
    <View
      accessible={false}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        {
          width: badge,
          height: badge,
          borderColor: withAlpha(skin.color, 0.28),
          backgroundColor: skin.softColor,
        },
      ]}
    >
      <WaymarkIcon customHeight={image} customWidth={image} decorative semanticName={semanticName} size="custom" />
    </View>
  );
}

function withAlpha(color: string, alpha: number) {
  const normalized = color.replace("#", "");

  if (normalized.length !== 6) {
    return color;
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.circle,
    borderWidth: 1,
    backgroundColor: foundationColors.bg.paper,
  },
});
