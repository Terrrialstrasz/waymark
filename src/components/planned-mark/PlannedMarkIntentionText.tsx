import { StyleSheet, View } from "react-native";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { foundationColors, semanticRadius, spacing, typography } from "../../theme/tokens";
import { PlannedMarkPathTheme } from "./plannedMarkTheme";

type Props = {
  fallbackText?: string;
  label?: string;
  intentionText?: string;
  theme: PlannedMarkPathTheme;
};

export function PlannedMarkIntentionText({ label, intentionText, fallbackText, theme }: Props) {
  const resolvedText = intentionText?.trim() || fallbackText?.trim();

  if (!resolvedText) {
    return null;
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      {label ? (
        <WMText style={[styles.label, { color: theme.deep }]} variant="meta">
          {label}
        </WMText>
      ) : null}
      <WMText style={[styles.quote, { color: theme.accent }]}>"</WMText>
      <WMText style={[styles.body, { color: foundationColors.ink.primary }]} variant="bodyLg">
        {resolvedText}
      </WMText>
      <View pointerEvents="none" style={styles.decoration}>
        <WaymarkIcon semanticName="botanical.sectionSprig" size="lg" state="muted" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    overflow: "hidden",
  },
  label: {
    marginBottom: spacing.xs,
  },
  quote: {
    ...typography.display,
    fontSize: 34,
    lineHeight: 34,
    marginBottom: 2,
  },
  body: {
    lineHeight: 28,
    paddingRight: spacing.xl,
  },
  decoration: {
    position: "absolute",
    right: -2,
    bottom: -6,
    opacity: 0.2,
  },
});
