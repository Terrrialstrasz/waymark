import { StyleSheet, View } from "react-native";
import { foundationColors, spacing } from "../../theme/tokens";
import { EntityChip } from "../primitives/EntityChip";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";

type Props = {
  title: string;
  subtitle: string;
  badgeLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  reducedMotion?: boolean;
};

export function PrivateDocumentsCard({
  title,
  subtitle,
  badgeLabel,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  reducedMotion,
}: Props) {
  return (
    <JournalCard
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? title}
      actionable={Boolean(onPress) && !disabled}
      contentStyle={styles.cardContent}
      decorative
      decorationPreset="entityCard"
      disabled={disabled}
      loading={loading}
      onPress={disabled ? undefined : onPress}
      reducedMotion={reducedMotion}
      style={styles.card}
      variant="hero"
    >
      <View style={styles.stack}>
        <View style={styles.headerRow}>
          <EntityChip label={badgeLabel} size="compact" variant="metadata" />
        </View>

        <WMText numberOfLines={2} style={styles.title} variant="sheetTitle">
          {title}
        </WMText>

        <WMText numberOfLines={3} style={styles.subtitle} variant="body">
          {subtitle}
        </WMText>
      </View>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    padding: 20,
  },
  card: {
    borderColor: foundationColors.border.soft,
  },
  stack: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
  },
});
