import { StyleSheet, View } from "react-native";
import { SemanticState, getSemanticStateLabel, getSemanticStateToneStyle, semanticRadius, spacing } from "../../theme/tokens";
import { WMText } from "./Text";

type Props = {
  label?: string;
  state: Exclude<SemanticState, "hidden">;
  tone?: "subtle" | "chip" | "solid" | "outline" | "ghost";
  locale?: "en" | "vi";
};

function formatBadgeLabel(label: string) {
  return label
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function WMBadge({ label, state, tone = "chip", locale = "en" }: Props) {
  const palette = getSemanticStateToneStyle(state, tone);

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: palette.bg,
          borderWidth: tone === "ghost" ? 0 : 1,
          borderColor: palette.border,
          borderStyle: "solid",
        },
      ]}
    >
      <WMText style={{ color: palette.text }} variant="chip">
        {formatBadgeLabel(label ?? getSemanticStateLabel(state, locale))}
      </WMText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: semanticRadius.chip,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
  },
});
