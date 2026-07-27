import { ReactNode } from "react";
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { JournalCard } from "../primitives/JournalCard";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMText } from "../primitives/Text";
import { EntityChip } from "../primitives/EntityChip";
import { WaymarkImageAssetId } from "../../assets/imageRegistry";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { WaymarkIcon } from "../primitives/WaymarkIcon";

type StripChip = {
  id: string;
  label: string;
  iconSemanticName?: WaymarkSemanticIconName;
  stateTone?: "alive" | "protected" | "weak" | "neglected" | "growing" | "planned" | "due_now" | "done" | "missed" | "postponed" | "substituted" | "blocked" | "active" | "upcoming" | "paused" | "archived";
  variant?: "metadata" | "status" | "entity";
};

type Props = {
  title: string;
  metadata?: string;
  subtitle?: string;
  imageAssetId?: WaymarkImageAssetId;
  imageSrc?: string;
  imageAlt?: string;
  iconSemanticName?: WaymarkSemanticIconName;
  leading?: ReactNode;
  chips?: StripChip[];
  trailing?: ReactNode;
  onPress?: () => void;
  variant?: "default" | "closeTrail";
  accentColor?: string;
  tintColor?: string;
  titleNumberOfLines?: number;
  subtitleNumberOfLines?: number;
  imageUsage?: "compactCardBackground" | "detailImage" | "hero";
  style?: StyleProp<ViewStyle>;
};

export function HorizontalJournalStrip({
  title,
  metadata,
  subtitle,
  imageAssetId,
  imageSrc,
  imageAlt,
  iconSemanticName,
  leading,
  chips = [],
  trailing,
  onPress,
  variant = "default",
  accentColor,
  tintColor,
  titleNumberOfLines = 1,
  subtitleNumberOfLines = 2,
  imageUsage = "compactCardBackground",
  style,
}: Props) {
  const compact = variant === "closeTrail";
  const visibleSubtitle = subtitle?.trim() || metadata?.trim();
  const hasThumb = Boolean(imageAssetId || imageSrc || iconSemanticName || leading);

  return (
    <JournalCard
      accessibilityLabel={[title, visibleSubtitle, ...chips.map((chip) => chip.label)].filter(Boolean).join(", ")}
      accessibilityRole={onPress ? "button" : "summary"}
      actionable={Boolean(onPress)}
      onPress={onPress}
      preserveSurfaceColorOnPress
      style={[styles.surface, tintColor ? { backgroundColor: tintColor } : null, style]}
      variant="standard"
    >
      {accentColor ? <View pointerEvents="none" style={[styles.accentRail, { backgroundColor: accentColor }]} /> : null}
      <View style={[styles.row, compact ? styles.rowCompact : null]}>
        {hasThumb ? (
          <View style={[styles.thumbWrap, compact ? styles.thumbWrapCompact : null]}>
            {leading ? (
              leading
            ) : imageAssetId || imageSrc ? (
              <WaymarkImage
                alt={imageAlt ?? title}
                assetId={imageAssetId}
                imageStyle={styles.thumb}
                rounded
                src={imageSrc}
                usage={imageUsage}
              />
            ) : iconSemanticName ? (
              <View style={styles.iconWrap}>
                <WaymarkIcon decorative semanticName={iconSemanticName} size={compact ? "md" : "lg"} />
              </View>
            ) : (
              <View style={styles.thumbFallback} />
            )}
          </View>
        ) : null}

        <View style={styles.copy}>
            <WMText numberOfLines={titleNumberOfLines} style={styles.title} variant="bodyStrong">
              {title}
            </WMText>
          {visibleSubtitle ? (
            <WMText numberOfLines={subtitleNumberOfLines} style={styles.metadata} variant="meta">
              {visibleSubtitle}
            </WMText>
          ) : null}
          {chips.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroller}
              contentContainerStyle={styles.chipsRow}
            >
              {chips.map((chip) => (
                <EntityChip
                  key={chip.id}
                  iconSemanticName={chip.iconSemanticName}
                  label={chip.label}
                  size="compact"
                  stateTone={chip.stateTone}
                  variant={chip.variant ?? (chip.stateTone ? "status" : "metadata")}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>

        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </JournalCard>
  );
}

export const JournalStripRow = HorizontalJournalStrip;

const styles = StyleSheet.create({
  surface: {
    minHeight: 96,
  },
  accentRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: semanticRadius.card.compact,
    borderBottomRightRadius: semanticRadius.card.compact,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  rowCompact: {
    gap: spacing.sm,
  },
  thumbWrap: {
    borderRadius: semanticRadius.card.compact,
    height: 72,
    overflow: "hidden",
    width: 72,
    ...getBorderStyle("1px solid rgba(143,114,78,0.14)"),
  },
  thumbWrapCompact: {
    height: 64,
    width: 64,
  },
  iconWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: foundationColors.bg.paperWarm,
  },
  thumb: {
    height: "100%",
    width: "100%",
  },
  thumbFallback: {
    backgroundColor: foundationColors.bg.paperWarm,
    flex: 1,
  },
  copy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  metadata: {
    color: foundationColors.ink.secondary,
  },
  chipScroller: {
    flexGrow: 0,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  trailing: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 18,
  },
});
