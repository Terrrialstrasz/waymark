import { StyleSheet, View } from "react-native";
import { foundationColors, radius, spacing } from "../../theme/tokens";
import { WMText } from "./Text";

type Props = {
  label: string;
  value: number;
  tint?: "green" | "gold" | "blue";
  fillColor?: string;
};

export function WMProgressLine({ label, value, tint = "green", fillColor }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <WMText variant="meta">{label}</WMText>
        <WMText variant="meta">{Math.round(value * 100)}%</WMText>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.max(0, Math.min(100, value * 100))}%`,
              backgroundColor: fillColor ?? tints[tint],
            },
          ]}
        />
      </View>
    </View>
  );
}

const tints = {
  green: foundationColors.green.base,
  gold: foundationColors.gold.base,
  blue: foundationColors.archive.blue,
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: foundationColors.bg.paperSoft,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
  },
});
