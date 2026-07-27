import { StyleSheet, View } from "react-native";
import { WMText } from "../primitives/Text";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { journalChrome } from "./journalPlaceholders";
import { semanticBorder, semanticElevation, spacing } from "../../theme/tokens";

type Props = {
  day: string;
  month: string;
  tone?: "green" | "gold" | "paper";
  variant?: "standard" | "collection";
};

export function DateSeal({ day, month, tone = "paper", variant = "standard" }: Props) {
  const toneStyle =
    tone === "green"
      ? styles.greenTone
      : tone === "gold"
        ? styles.goldTone
        : null;

  return (
    <View style={[styles.wrap, variant === "collection" ? styles.collectionWrap : null, toneStyle]}>
      <WMText numberOfLines={1} style={styles.month} variant="metaCompact">
        {month}
      </WMText>
      <WMText numberOfLines={1} style={styles.day} variant="numeric">
        {day}
      </WMText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: journalChrome.paperWarm,
    borderRadius: 16,
    minHeight: 64,
    minWidth: 64,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...getBorderStyle(semanticBorder.card.default),
    boxShadow: semanticElevation.flat,
  },
  collectionWrap: {
    borderRadius: 22,
    minHeight: 92,
    minWidth: 74,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  greenTone: {
    backgroundColor: "#EEF7EB",
  },
  goldTone: {
    backgroundColor: "#FBF2D9",
  },
  month: {
    color: journalChrome.mutedInk,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  day: {
    color: journalChrome.ink,
    fontSize: 22,
    lineHeight: 25,
  },
});
