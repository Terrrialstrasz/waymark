import { ScrollView, StyleSheet, View } from "react-native";
import { useState } from "react";
import { EntityChip } from "../primitives/EntityChip";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";
import { getCopy } from "../../i18n/copy";
import { foundationColors, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { MediaCollage, JournalImageSource } from "./MediaCollage";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import type { WaymarkMediaItem } from "../../app/waymarkMediaSelectors";
import { MediaCollagePreview } from "../media/MediaCollagePreview";
import { MediaViewerModal } from "../media/MediaViewerModal";

type Props = {
  ownerId?: string;
  locale?: Locale;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  dateLabel?: string;
  pathLabel?: string;
  showDateChip?: boolean;
  images?: JournalImageSource[];
  mediaItems?: WaymarkMediaItem[];
  chips?: Array<{ label: string; iconName?: "heart" | "collection" | "clock"; colorToken?: string }>;
  readonly?: boolean;
  loading?: boolean;
  onPress?: () => void;
};

export function JournalLatestHero({
  ownerId,
  locale = "en",
  title,
  subtitle,
  eyebrow,
  dateLabel,
  pathLabel,
  showDateChip = true,
  images = [],
  mediaItems = [],
  chips = [],
  readonly = false,
  loading = false,
  onPress,
}: Props) {
  const c = getCopy(locale);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const actionable = Boolean(onPress) && !readonly && !loading;
  const resolvedOwnerId = ownerId ?? `hero-${title}`;
  const dateChipLabel = dateLabel ?? eyebrow ?? c.journal.latestMemories;
  const resolvedPathChip = pathLabel ? { label: pathLabel } : chips[1] ?? chips[0];
  const metadataChips = chips.filter((chip) => chip.label !== resolvedPathChip?.label);
  const hasMediaItems = mediaItems.length > 0;
  const shouldShowTopChips = showDateChip || (showDateChip && Boolean(resolvedPathChip));
  const shouldShowCompactBottomChips = !showDateChip && (metadataChips.length > 0 || Boolean(resolvedPathChip));

  return (
    <JournalCard actionable={actionable} onPress={actionable ? onPress : undefined} variant="hero">
      <View style={styles.mediaFrame}>
        {hasMediaItems ? (
          <MediaCollagePreview
            items={mediaItems}
            locale={locale}
            onPressMedia={(index) => {
              setViewerIndex(index);
              setViewerOpen(true);
            }}
            titleForAccessibility={title}
          />
        ) : (
          <MediaCollage
            images={images}
            loading={loading}
            locale={locale}
            placeholderSeed={title}
            readonly={!actionable}
            titleForAccessibility={title}
            variant={images.length >= 4 ? "quad" : images.length >= 3 ? "trio" : "single"}
          />
        )}
        <View pointerEvents="none" style={styles.overlay}>
          {shouldShowTopChips ? (
            <View style={styles.overlayTopRow}>
              {showDateChip ? <EntityChip label={dateChipLabel} size="compact" variant="metadata" /> : <View />}
              {resolvedPathChip ? <EntityChip label={resolvedPathChip.label} size="compact" variant="metadata" /> : null}
            </View>
          ) : null}
          {shouldShowCompactBottomChips ? (
            <View style={styles.overlayBottomCompactRow}>
              {metadataChips.length ? (
                <ScrollView contentContainerStyle={styles.overlayBottomCompactScroll} horizontal showsHorizontalScrollIndicator={false}>
                  {metadataChips.map((chip, index) => (
                    <EntityChip
                      key={`${resolvedOwnerId}-overlay-chip-meta-${index}-${chip.label}`}
                      iconSemanticName={chip.iconName ? getHeroChipIcon(chip.iconName) : undefined}
                      label={chip.label}
                      size="compact"
                      variant="metadata"
                      style={styles.overlayChip}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View />
              )}
              {resolvedPathChip ? <EntityChip label={resolvedPathChip.label} size="compact" variant="metadata" /> : null}
            </View>
          ) : metadataChips.length ? (
            <ScrollView contentContainerStyle={styles.overlayBottomRow} horizontal showsHorizontalScrollIndicator={false}>
              {metadataChips.map((chip, index) => (
                <EntityChip
                  key={`${resolvedOwnerId}-overlay-chip-meta-${index}-${chip.label}`}
                  iconSemanticName={chip.iconName ? getHeroChipIcon(chip.iconName) : undefined}
                  label={chip.label}
                  size="compact"
                  variant="metadata"
                  style={styles.overlayChip}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>

      <View style={styles.copy}>
        <WMText numberOfLines={1} style={styles.eyebrow} variant="meta">
          {eyebrow ?? c.journal.latestMemories}
        </WMText>
        <WMText numberOfLines={2} variant="pageTitle">
          {title}
        </WMText>
        {subtitle ? (
          <WMText numberOfLines={2} style={styles.subtitle} variant="bodySm">
            {subtitle}
          </WMText>
        ) : null}

      </View>
      <MediaViewerModal
        initialIndex={viewerIndex}
        items={mediaItems}
        locale={locale}
        onClose={() => setViewerOpen(false)}
        open={viewerOpen}
      />
    </JournalCard>
  );
}

function getHeroChipIcon(iconName: NonNullable<Props["chips"]>[number]["iconName"]) {
  if (iconName === "collection") {
    return "entity.memory";
  }
  if (iconName === "clock") {
    return "utility.clock";
  }
  return "entity.memory";
}

const styles = StyleSheet.create({
  mediaFrame: {
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: spacing.sm,
  },
  overlayTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  overlayBottomRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingRight: spacing.md,
    paddingBottom: spacing.xs,
  },
  overlayBottomCompactRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: "auto",
    paddingBottom: spacing.xs,
  },
  overlayBottomCompactScroll: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  overlayChip: {
    alignItems: "center",
    backgroundColor: "rgba(255, 248, 234, 0.88)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    maxWidth: 172,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    ...getBorderStyle("1px solid rgba(143, 114, 78, 0.18)"),
  },
  copy: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: foundationColors.gold.deep,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  subtitle: {
    color: foundationColors.ink.secondary,
  },
  chipText: {
    color: foundationColors.ink.secondary,
  },
});
