import { StyleSheet, View } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { foundationColors, spacing } from "../../theme/tokens";
import { EntityChip } from "../primitives/EntityChip";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";
import { MeHubCardTone } from "./types";

type Props = {
  title: string;
  subtitle: string;
  icon: WaymarkSemanticIconName;
  tone: MeHubCardTone;
  badgeLabel?: string;
  helperText?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  reducedMotion?: boolean;
};

export function MeHubCard({
  title,
  subtitle,
  tone,
  badgeLabel,
  helperText,
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
      decorative={tone !== "blue"}
      decorationPreset="journalCard"
      disabled={disabled}
      loading={loading}
      onPress={disabled ? undefined : onPress}
      preserveSurfaceColorOnPress={tone === "ivory"}
      reducedMotion={reducedMotion}
      style={tone === "blue" ? styles.blueCard : undefined}
      variant="actionable"
    >
      <View style={styles.stack}>
        <View style={styles.headerRow}>
          <WMText numberOfLines={2} style={styles.title} variant="cardTitle">
            {title}
          </WMText>
          {badgeLabel ? <EntityChip label={badgeLabel} size="compact" variant="metadata" /> : null}
        </View>

        <View style={styles.copy}>
          <WMText numberOfLines={2} style={styles.subtitle} variant="bodySm">
            {subtitle}
          </WMText>
          {helperText ? (
            <WMText numberOfLines={1} style={[styles.helper, tone === "blue" ? styles.blueHelper : null]} variant="meta">
              {helperText}
            </WMText>
          ) : null}
        </View>
      </View>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    padding: 20,
  },
  stack: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  copy: {
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: foundationColors.ink.primary,
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
  },
  helper: {
    color: foundationColors.gold.deep,
  },
  blueHelper: {
    color: foundationColors.archive.blue,
  },
  blueCard: {
    borderColor: foundationColors.archive.blue,
    backgroundColor: "#FBFCFD",
  },
});
