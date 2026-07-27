import { StyleSheet, View } from "react-native";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { clampProgress } from "./detailModel";
import { WMText } from "../primitives/Text";

type Props = {
  percentComplete: number;
  accentColor?: string;
  locale: Locale;
};

export function ExpeditionProgressBlock({ percentComplete, accentColor, locale }: Props) {
  const progress = clampProgress(percentComplete);
  const formatter = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US");

  return (
    <View style={styles.block}>
      <View style={styles.headerRow}>
        <WMText style={styles.label} variant="meta">
          {formatter.format(progress)}%
        </WMText>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: accentColor ?? foundationColors.green.base,
              width: `${progress}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.xs,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  label: {
    color: foundationColors.ink.secondary,
    fontVariant: ["tabular-nums"],
  },
  track: {
    backgroundColor: foundationColors.bg.paperSoft,
    borderRadius: semanticRadius.chip,
    height: 8,
    overflow: "hidden",
  },
  fill: {
    borderRadius: semanticRadius.chip,
    height: "100%",
    minWidth: 0,
  },
});
