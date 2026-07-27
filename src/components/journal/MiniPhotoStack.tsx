import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop, Ellipse } from "react-native-svg";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { semanticBorder, semanticElevation, spacing } from "../../theme/tokens";
import { getPlaceholderPhotoPalette, journalChrome } from "./journalPlaceholders";
import { WaymarkImage } from "../primitives/WaymarkImage";

type Photo = {
  src?: string;
  alt?: string;
};

type Props = {
  photos?: Photo[];
  placeholderSeed?: string | number;
};

export function MiniPhotoStack({ photos = [], placeholderSeed = "mini-stack" }: Props) {
  const visiblePhotos = photos.slice(0, 3);

  return (
    <View style={styles.stack}>
      {[0, 1, 2].map((index) => {
        const photo = visiblePhotos[index];
        return (
          <View key={index} style={[styles.card, stackTransforms[index]]}>
            {photo?.src ? (
              <WaymarkImage
                alt={photo.alt ?? ""}
                decorative={!photo.alt}
                imageStyle={styles.image}
                rounded
                src={photo.src}
                usage="compactCardBackground"
              />
            ) : (
              <MiniPlaceholder index={index} seed={placeholderSeed} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function MiniPlaceholder({ index, seed }: { index: number; seed: string | number }) {
  const palette = getPlaceholderPhotoPalette(index, seed);
  const instanceId = useId().replace(/[:]/g, "_");
  const gradientId = `mini-gradient-${instanceId}-${index}`;

  return (
    <Svg accessible={false} height="100%" width="100%">
      <Defs>
        <LinearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
          <Stop offset="0%" stopColor={palette.backgroundTop} />
          <Stop offset="100%" stopColor={palette.backgroundBottom} />
        </LinearGradient>
      </Defs>
      <Rect fill={`url(#${gradientId})`} height="100%" width="100%" />
      <Ellipse cx="72%" cy="26%" fill={palette.accent} opacity={0.5} rx="26%" ry="20%" />
      <Ellipse cx="30%" cy="78%" fill={palette.accentMuted} opacity={0.32} rx="38%" ry="22%" />
    </Svg>
  );
}

const stackTransforms = [
  { right: 0, zIndex: 3 },
  { right: 18, top: 7, zIndex: 2 },
  { right: 36, top: 14, zIndex: 1 },
] as const;

const styles = StyleSheet.create({
  stack: {
    flexShrink: 0,
    height: 58,
    minWidth: 76,
    position: "relative",
  },
  card: {
    backgroundColor: journalChrome.paperSurface,
    borderRadius: 12,
    height: 44,
    overflow: "hidden",
    position: "absolute",
    top: 0,
    width: 44,
    ...getBorderStyle(semanticBorder.media.default),
    boxShadow: semanticElevation.flat,
  },
  image: {
    height: "100%",
    width: "100%",
  },
});
