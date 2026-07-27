import { ImageSourcePropType, ImageStyle, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { WaymarkImageAssetId } from "../../assets/imageRegistry";
import { foundationColors, mediaHeroTokens, spacing } from "../../theme/tokens";
import { BotanicalDecorationLayer } from "./BotanicalDecorationLayer";
import { IconBadge } from "./IconBadge";
import { WMText } from "./Text";
import { WaymarkImage } from "./WaymarkImage";
import { WaymarkIcon } from "./WaymarkIcon";

type MediaHeroVariant = "hero" | "standard" | "inline" | "thumbnail" | "withCaption" | "withoutCaption" | "actionable" | "readOnly";

export type MediaHeroOverlayMeta = {
  dateLabel?: string;
  pathLabel?: string;
  proofPhotoCountLabel?: string;
  pathTintColor?: string;
  pathTintTextColor?: string;
  statusChipNodes?: React.ReactNode[];
};

type Props = {
  assetId?: WaymarkImageAssetId;
  source?: ImageSourcePropType;
  caption?: string;
  metadata?: React.ReactNode;
  placeholderLabel?: string;
  errorLabel?: string;
  loading?: boolean;
  error?: boolean;
  onPress?: () => void;
  variant?: MediaHeroVariant;
  frameStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  overlayMeta?: MediaHeroOverlayMeta;
};

export function MediaHero({
  assetId,
  source,
  caption,
  metadata,
  placeholderLabel,
  errorLabel,
  loading = false,
  error = false,
  onPress,
  variant = "hero",
  frameStyle,
  imageStyle,
  overlayMeta,
}: Props) {
  const height =
    variant === "thumbnail"
      ? mediaHeroTokens.size.thumbnailHeight
      : variant === "standard"
        ? 176
      : variant === "inline"
        ? mediaHeroTokens.size.inlineHeight
        : mediaHeroTokens.size.heroHeight;

  const body = (
    <View style={[styles.frame, { height }, frameStyle]}>
      {(assetId || source) && !error ? (
        <WaymarkImage
          alt={caption ?? "media"}
          assetId={assetId}
          imageStyle={[styles.image, imageStyle]}
          rounded
          src={source}
          usage={variant === "thumbnail" ? "compactCardBackground" : variant === "hero" ? "hero" : "detailImage"}
        />
      ) : (
        <View style={styles.placeholder}>
          <IconBadge semanticName={error ? "utility.close" : "entity.memory"} shape="rounded" size="md" tone="warm" />
          <WMText style={styles.placeholderText} variant="bodySm">
            {error ? errorLabel : loading ? placeholderLabel : placeholderLabel}
          </WMText>
        </View>
      )}
      {variant !== "thumbnail" && overlayMeta ? <MediaHeroOverlayChips overlayMeta={overlayMeta} /> : null}
      {(caption || metadata) && variant !== "thumbnail" ? (
        <View style={styles.captionBlock}>
          {caption ? (
            <WMText style={styles.caption} variant="bodySm">
              {caption}
            </WMText>
          ) : null}
          {metadata}
        </View>
      ) : null}
    </View>
  );

  const wrapped = <BotanicalDecorationLayer preset="mediaHero">{body}</BotanicalDecorationLayer>;

  if (!onPress || variant === "readOnly") {
    return wrapped;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {wrapped}
    </Pressable>
  );
}

export function MediaHeroOverlayChips({ overlayMeta }: { overlayMeta: MediaHeroOverlayMeta }) {
  const statusChipNodes = overlayMeta.statusChipNodes ?? [];
  const hasDateChip = Boolean(overlayMeta.dateLabel);
  const hasMediaCountChip = Boolean(overlayMeta.proofPhotoCountLabel);
  const hasOverlayRow = hasDateChip || Boolean(overlayMeta.pathLabel) || statusChipNodes.length > 0 || hasMediaCountChip;

  if (!hasOverlayRow) {
    return null;
  }

  return (
    <View accessible={false} aria-hidden pointerEvents="none" style={styles.overlayShell}>
      <View style={styles.bottomRow}>
        <View style={styles.bottomLeft}>
          {overlayMeta.dateLabel ? (
            <View style={[styles.overlayChip, styles.bottomChip]}>
              <WaymarkIcon customHeight={16} customWidth={16} decorative semanticName="utility.calendar" size="custom" />
              <WMText numberOfLines={1} style={styles.overlayChipText} variant="meta">
                {overlayMeta.dateLabel}
              </WMText>
            </View>
          ) : null}
          {overlayMeta.pathLabel ? (
            <View
              style={[
                styles.overlayChip,
                styles.bottomChip,
                {
                  borderColor: overlayMeta.pathTintColor ? withAlpha(overlayMeta.pathTintColor, 0.24) : foundationColors.border.subtle,
                  backgroundColor: "rgba(255, 248, 236, 0.94)",
                },
              ]}
            >
              <WMText
                numberOfLines={1}
                style={[styles.overlayChipText, overlayMeta.pathTintTextColor ? { color: overlayMeta.pathTintTextColor } : null]}
                variant="meta"
              >
                {overlayMeta.pathLabel}
              </WMText>
            </View>
          ) : null}
          {statusChipNodes.map((chipNode, index) => (
            <View key={`status-chip-${index}`} style={styles.statusChipWrap}>
              {chipNode}
            </View>
          ))}
        </View>
        {overlayMeta.proofPhotoCountLabel ? (
          <View style={styles.bottomRight}>
            <View style={styles.overlayChip}>
              <WMText numberOfLines={1} style={styles.overlayChipText} variant="meta">
                {overlayMeta.proofPhotoCountLabel}
              </WMText>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function withAlpha(color: string, alpha: number) {
  const normalized = color.replace("#", "");

  if (normalized.length !== 6) {
    return color;
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: mediaHeroTokens.color.border,
    borderRadius: mediaHeroTokens.radius.hero,
    backgroundColor: mediaHeroTokens.color.placeholder,
    boxShadow: mediaHeroTokens.shadow.soft,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  placeholderText: {
    color: mediaHeroTokens.color.muted,
    textAlign: "center",
  },
  captionBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: mediaHeroTokens.color.overlay,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  caption: {
    color: mediaHeroTokens.color.caption,
  },
  overlayShell: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  topLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  bottomLeft: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
  },
  bottomRight: {
    alignItems: "flex-end",
    flexShrink: 0,
    maxWidth: "42%",
  },
  overlayChip: {
    maxWidth: "100%",
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    borderRadius: 999,
    backgroundColor: "rgba(255, 252, 246, 0.88)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    boxShadow: "0px 2px 10px rgba(80, 58, 22, 0.08)",
  },
  bottomChip: {
    alignSelf: "flex-start",
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "50%",
  },
  statusChipWrap: {
    alignSelf: "flex-start",
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "32%",
  },
  overlayChipText: {
    color: foundationColors.ink.primary,
    flexShrink: 1,
  },
});
