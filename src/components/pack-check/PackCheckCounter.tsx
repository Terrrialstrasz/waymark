import { StyleSheet } from "react-native";
import { foundationColors, typography } from "../../theme/tokens";
import { WMText } from "../primitives/Text";

type Props = {
  label: string;
  variant?: "hero" | "compact";
};

export function PackCheckCounter({ label, variant = "hero" }: Props) {
  return (
    <WMText style={[styles.base, variant === "compact" ? styles.compact : styles.hero]} variant="body">
      {label}
    </WMText>
  );
}

const styles = StyleSheet.create({
  base: {
    color: foundationColors.ink.primary,
    flexShrink: 1,
  },
  hero: {
    ...typography.pageTitle,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.22,
  },
  compact: {
    ...typography.cardTitle,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.08,
  },
});
