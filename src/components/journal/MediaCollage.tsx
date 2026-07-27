import { useId, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from "react-native-svg";
import { BotanicalDecorationLayer } from "../primitives/BotanicalDecorationLayer";
import { WMText } from "../primitives/Text";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { getCopy } from "../../i18n/copy";
import { foundationColors, semanticBorder, spacing, useReducedMotionEnabled, getWaymarkPressStyle } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { getPlaceholderPhotoPalette, journalChrome, journalSkeletonColors } from "./journalPlaceholders";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WaymarkImageAssetId } from "../../assets/imageRegistry";

export type JournalImageSource = {
  src?: string;
  assetId?: WaymarkImageAssetId;
  alt?: string;
};

type Props = {
  locale?: Locale;
  images?: JournalImageSource[];
  variant?: "single" | "trio" | "quad";
  loading?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  readonly?: boolean;
  onPress?: () => void;
  placeholderSeed?: string | number;
  titleForAccessibility?: string;
};

export function MediaCollage({
  locale = "en",
  images = [],
  variant = "single",
  loading = false,
  emptyLabel,
  disabled = false,
  readonly = false,
  onPress,
  placeholderSeed = "journal-collage",
  titleForAccessibility = "memory",
}: Props) {
  const c = getCopy(locale);
  const reducedMotion = useReducedMotionEnabled();
  const interactive = Boolean(onPress) && !disabled && !readonly && !loading;
  const normalizedImages = useMemo(() => getVariantImages(images, variant), [images, variant]);
  const imageCount = images.filter((image) => image?.src || image?.assetId).length || normalizedImages.length;

  const content = loading ? (
    <View style={[styles.frame, styles.loadingFrame]}>
      {normalizedImages.map((_, index) => (
        <View key={`${String(placeholderSeed)}-${index}`} style={[styles.loadingCell, getCellFrameStyle(variant, index)]} />
      ))}
    </View>
  ) : normalizedImages.length === 0 ? (
    <View style={[styles.frame, styles.emptyFrame]}>
      <WMText style={styles.emptyLabel} variant="bodySm">
        {emptyLabel ?? c.journal.noPhotos}
      </WMText>
    </View>
  ) : (
    <BotanicalDecorationLayer preset="mediaHero">
      <View style={styles.frame}>
        {normalizedImages.map((image, index) => (
          <ImageCell
            key={`${String(placeholderSeed)}-${index}`}
            image={image}
            index={index}
            placeholderSeed={placeholderSeed}
            style={getCellFrameStyle(variant, index)}
          />
        ))}
      </View>
    </BotanicalDecorationLayer>
  );

  if (!interactive) {
    return (
      <View
        accessibilityLabel={c.journal.photoCollageA11y.replace("{title}", titleForAccessibility).replace("{count}", String(imageCount))}
        accessible={Boolean(imageCount)}
        style={disabled ? styles.disabled : null}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={c.journal.photoCollageA11y.replace("{title}", titleForAccessibility).replace("{count}", String(imageCount))}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [getWaymarkPressStyle({ pressed, reducedMotion, variant: "row" }), disabled ? styles.disabled : null]}
    >
      {content}
    </Pressable>
  );
}

function ImageCell({
  image,
  index,
  placeholderSeed,
  style,
}: {
  image?: JournalImageSource;
  index: number;
  placeholderSeed: string | number;
  style: object;
}) {
  const [errored, setErrored] = useState(false);

  return (
    <View style={[styles.cell, style]}>
      {(image?.src || image?.assetId) && !errored ? (
        <WaymarkImage
          alt={image.alt ?? ""}
          assetId={image.assetId}
          decorative={!image.alt}
          imageStyle={styles.image}
          onError={() => setErrored(true)}
          rounded={false}
          src={image.src}
          usage="journalCard"
        />
      ) : (
        <PlaceholderCell index={index} seed={placeholderSeed} />
      )}
    </View>
  );
}

function PlaceholderCell({ index, seed }: { index: number; seed: string | number }) {
  const palette = getPlaceholderPhotoPalette(index, seed);
  const instanceId = useId().replace(/[:]/g, "_");
  const gradientId = `journal-collage-${instanceId}-${index}`;

  return (
    <Svg accessible={false} height="100%" width="100%">
      <Defs>
        <LinearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
          <Stop offset="0%" stopColor={palette.backgroundTop} />
          <Stop offset="100%" stopColor={palette.backgroundBottom} />
        </LinearGradient>
      </Defs>
      <Rect fill={`url(#${gradientId})`} height="100%" width="100%" />
      <Ellipse cx="76%" cy="24%" fill={palette.accent} opacity={0.48} rx="24%" ry="18%" />
      <Ellipse cx="34%" cy="76%" fill={palette.accentMuted} opacity={0.34} rx="40%" ry="24%" />
      <Rect fill={palette.shadow} height="30%" opacity={0.18} width="100%" y="70%" />
    </Svg>
  );
}

function getVariantImages(images: JournalImageSource[], variant: Props["variant"]) {
  const desiredCount = variant === "single" ? 1 : variant === "trio" ? 3 : 4;

  if (images.length === 0) {
    return Array.from({ length: desiredCount }).map(() => ({}));
  }

  return Array.from({ length: desiredCount }).map((_, index) => images[index] ?? {});
}

function getCellFrameStyle(variant: Props["variant"], index: number) {
  if (variant === "single") {
    return styles.singleCell;
  }

  if (variant === "trio") {
    return index === 0 ? styles.leadCell : trioSecondaryFrames[index as keyof typeof trioSecondaryFrames];
  }

  return index === 0 ? styles.leadCell : quadSecondaryFrames[index as keyof typeof quadSecondaryFrames];
}

const trioSecondaryFrames = {
  1: { bottom: "50%", left: "66.2%", right: 0, top: 0 },
  2: { bottom: 0, left: "66.2%", right: 0, top: "50%" },
} as const;

const quadSecondaryFrames = {
  1: { bottom: "66.66%", left: "66.2%", right: 0, top: 0 },
  2: { bottom: "33.33%", left: "66.2%", right: 0, top: "33.33%" },
  3: { bottom: 0, left: "66.2%", right: 0, top: "66.66%" },
} as const;

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 1.34,
    backgroundColor: journalChrome.photoMat,
    borderRadius: journalChrome.radiusLg,
    overflow: "hidden",
    position: "relative",
    ...getBorderStyle(semanticBorder.media.default),
  },
  loadingFrame: {
    backgroundColor: journalChrome.paperSurface,
  },
  emptyFrame: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 144,
  },
  emptyLabel: {
    color: journalChrome.mutedInk,
  },
  cell: {
    backgroundColor: foundationColors.bg.paper,
    overflow: "hidden",
    position: "absolute",
  },
  image: {
    height: "100%",
    width: "100%",
  },
  loadingCell: {
    backgroundColor: journalSkeletonColors.base,
    borderColor: journalSkeletonColors.highlight,
    borderWidth: 3,
    position: "absolute",
  },
  singleCell: {
    inset: 0,
  },
  leadCell: {
    bottom: 0,
    left: 0,
    right: "33.8%",
    top: 0,
  },
  disabled: {
    opacity: 0.58,
  },
});
