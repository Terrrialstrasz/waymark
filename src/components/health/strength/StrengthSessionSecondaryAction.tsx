import { Pressable, StyleSheet } from "react-native";
import { WMText } from "../../primitives/Text";
import { foundationColors, semanticBorder, semanticRadius, spacing } from "../../../theme/tokens";
import { getBorderStyle } from "../../../design-system/utils/get-border-style";
import { Locale } from "../../../types/ui";
import { getHealthStrengthCopy } from "./utils";

type Props = {
  locale: Locale;
  onPress?: () => void;
};

export function StrengthSessionSecondaryAction({ locale, onPress }: Props) {
  const copy = getHealthStrengthCopy(locale);

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <WMText style={styles.label} variant="button">
        {copy.actions.endSession}
      </WMText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 42,
    alignSelf: "center",
    borderRadius: semanticRadius.button.default,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle(semanticBorder.button.secondary),
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  label: {
    color: foundationColors.green.deep,
    fontSize: 15,
    lineHeight: 20,
  },
});
