import { StyleSheet, View, ViewStyle } from "react-native";
import { dividerTokens, spacing } from "../../theme/tokens";
import { WMText } from "./Text";

type DividerVariant = "full" | "inset" | "soft" | "dotted" | "section" | "vertical";

type Props = {
  variant?: DividerVariant;
  insetStart?: number;
  insetEnd?: number;
  label?: string;
  style?: ViewStyle;
};

export function Divider({ variant = "soft", insetStart = 0, insetEnd = 0, label, style }: Props) {
  if (label && variant !== "vertical") {
    return (
      <View accessible={false} style={[styles.labelRow, { marginVertical: dividerTokens.spacing.ySection }, style]}>
        <View style={[styles.line, getLineStyle("section"), { marginLeft: insetStart }]} />
        <WMText variant="meta">{label}</WMText>
        <View style={[styles.line, getLineStyle("section"), { marginRight: insetEnd }]} />
      </View>
    );
  }

  if (variant === "vertical") {
    return <View accessible={false} style={[styles.vertical, getLineStyle("soft"), style]} />;
  }

  return <View accessible={false} style={[styles.line, getLineStyle(variant), { marginLeft: insetStart, marginRight: insetEnd }, style]} />;
}

function getLineStyle(variant: Exclude<DividerVariant, "vertical"> | "soft"): ViewStyle {
  if (variant === "dotted") {
    return {
      borderTopWidth: 1,
      borderStyle: "dotted",
      borderColor: dividerTokens.color.decorative,
      backgroundColor: "transparent",
    };
  }

  if (variant === "full") {
    return {
      backgroundColor: dividerTokens.color.strong,
    };
  }

  if (variant === "section") {
    return {
      backgroundColor: dividerTokens.color.decorative,
    };
  }

  return {
    backgroundColor: dividerTokens.color.subtle,
  };
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    marginVertical: dividerTokens.spacing.y,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  vertical: {
    width: 1,
    alignSelf: "stretch",
    marginHorizontal: spacing.sm,
  },
});
