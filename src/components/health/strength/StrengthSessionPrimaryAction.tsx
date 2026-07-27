import { Pressable, StyleSheet } from "react-native";
import { WMText } from "../../primitives/Text";
import { foundationColors, fontFamilyTokens, semanticElevation, semanticRadius, spacing } from "../../../theme/tokens";
import { Locale } from "../../../types/ui";
import { StrengthPrimaryActionResolution, StrengthSessionData } from "./types";
import { formatTemplate, getHealthStrengthCopy } from "./utils";
import { getStrengthSessionPrimaryAction } from "./getStrengthSessionPrimaryAction";

type Props = {
  session?: StrengthSessionData;
  locale?: Locale;
  resolution?: StrengthPrimaryActionResolution;
  onPress?: (action: StrengthPrimaryActionResolution["actionType"]) => void;
};

export function StrengthSessionPrimaryAction({ session, locale, resolution, onPress }: Props) {
  const resolvedLocale = locale ?? session?.locale ?? "en";
  const copy = getHealthStrengthCopy(resolvedLocale);
  const resolved = resolution ?? (session ? getStrengthSessionPrimaryAction(session) : undefined);

  if (!resolved) {
    return null;
  }

  const label = formatTemplate(copy.actions[resolved.labelKey], resolved.labelParams);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={resolved.disabled}
      onPress={onPress ? () => onPress(resolved.actionType) : undefined}
      style={[styles.button, resolved.disabled ? styles.disabled : null]}
    >
      <WMText numberOfLines={2} style={styles.label} variant="button">
        {label}
      </WMText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: semanticRadius.button.default,
    backgroundColor: foundationColors.green.base,
    boxShadow: semanticElevation.card,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
    boxShadow: semanticElevation.flat,
  },
  label: {
    color: foundationColors.ink.inverse,
    textAlign: "center",
    fontFamily: fontFamilyTokens.sans.runtime,
    fontSize: 17,
    lineHeight: 22,
  },
});
