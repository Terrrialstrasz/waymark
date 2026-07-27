import { StyleSheet, View } from "react-native";
import { WaymarkImage } from "./WaymarkImage";
import { BotanicalMotifId, getBotanicalMotif } from "../../design/botanical-motifs";

type Props = {
  motif: BotanicalMotifId;
  anchor?: {
    top?: number | `${number}%`;
    right?: number | `${number}%`;
    bottom?: number | `${number}%`;
    left?: number | `${number}%`;
    translateX?: number;
    translateY?: number;
  };
  widthPercent?: number;
  opacity?: number;
  rotation?: number;
  scale?: number;
  tintColor?: string;
  fit?: "contain" | "cover";
  orientLongEdge?: "natural" | "horizontal";
  matchLongEdgeToCardWidth?: boolean;
  debugLabel?: string;
};

export function BotanicalMotifLayer({
  motif,
  anchor,
  widthPercent = 64,
  opacity = 0.2,
  rotation = 0,
  scale = 1,
  tintColor,
  fit = "contain",
  orientLongEdge = "natural",
  matchLongEdgeToCardWidth = false,
  debugLabel,
}: Props) {
  const descriptor = getBotanicalMotif(motif);

  if (!descriptor) {
    if (__DEV__) {
      console.debug(`[BotanicalMotifLayer] missing motif descriptor for ${motif}${debugLabel ? ` (${debugLabel})` : ""}`);
    }
    return null;
  }

  const shouldRotateToHorizontal = orientLongEdge === "horizontal" && descriptor.aspectRatio < 1;
  const resolvedAspectRatio = shouldRotateToHorizontal ? 1 / descriptor.aspectRatio : descriptor.aspectRatio;
  const resolvedRotation = rotation + (shouldRotateToHorizontal ? 90 : 0);
  const resolvedWidthPercent = matchLongEdgeToCardWidth ? 100 : widthPercent;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.layer,
        {
          top: anchor?.top,
          right: anchor?.right,
          bottom: anchor?.bottom,
          left: anchor?.left,
          opacity,
          zIndex: 0,
          transform: [
            { translateX: anchor?.translateX ?? 0 },
            { translateY: anchor?.translateY ?? 0 },
            { rotate: `${resolvedRotation}deg` },
            { scale },
          ],
          width: `${resolvedWidthPercent}%`,
          aspectRatio: resolvedAspectRatio,
        },
      ]}
    >
      <WaymarkImage
        alt=""
        assetId={descriptor.assetId}
        decorative
        imageStyle={[
          styles.image,
          tintColor
            ? {
                tintColor,
              }
            : null,
        ]}
        onError={() => {
          if (__DEV__) {
            console.debug(
              `[BotanicalMotifLayer] failed motif load motif=${motif} asset=${descriptor.assetId}${debugLabel ? ` label=${debugLabel}` : ""}`
            );
          }
        }}
        objectFit={fit}
        style={styles.imageFrame}
        usage="botanical"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
  },
  imageFrame: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
});
