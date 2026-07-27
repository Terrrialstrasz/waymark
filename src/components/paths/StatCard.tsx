import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { WaymarkImageAssetId } from "../../assets/imageRegistry";
import { foundationColors, fontFamilyTokens, journalCardTokens, semanticBorder, semanticRadius } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMText } from "../primitives/Text";

type Props = {
  label: string;
  value?: string;
  heroAssetId?: WaymarkImageAssetId | string;
  watermarkAssetId?: WaymarkImageAssetId | string;
  backgroundIconSemanticName?: WaymarkSemanticIconName;
  state?: "default" | "loading" | "empty" | "warning";
  style?: any;
  debugLabel?: string;
  debugLines?: string[];
};

export function StatCard({
  label,
  value,
  heroAssetId,
  watermarkAssetId,
  backgroundIconSemanticName,
  state = "default",
  style,
}: Props) {
  if (state === "loading") {
    return (
      <View style={[styles.card, style]}>
        <View style={styles.contentLayer}>
          <View style={[styles.skeletonBlock, styles.skeletonLabel]} />
          <View style={[styles.skeletonBlock, styles.skeletonValue]} />
        </View>
      </View>
    );
  }

  const watermarkLayer = (
    <StatCardWatermark
      assetId={watermarkAssetId ?? heroAssetId}
      semanticName={backgroundIconSemanticName}
    />
  );
  return (
    <View style={[state === "warning" ? styles.warningCardResolved : styles.card, style]}>
      {watermarkLayer}
      <View style={styles.foregroundLayer}>
        <WMText style={styles.label} variant="label">
          {label}
        </WMText>
        <WMText adjustsFontSizeToFit minimumFontScale={0.74} numberOfLines={1} style={styles.value} variant="cardTitle">
          {value}
        </WMText>
      </View>
    </View>
  );
}

function StatCardWatermark({
  assetId,
  semanticName,
}: {
  assetId?: WaymarkImageAssetId | string;
  semanticName?: WaymarkSemanticIconName;
}) {
  const [cardWidth, setCardWidth] = useState(0);
  const scale = 0.96;
  const opacity = 1;
  const iconSize = Math.max(0, Math.round(cardWidth * scale));

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setCardWidth((current) => (Math.abs(current - nextWidth) < 1 ? current : nextWidth));
  };

  if (!assetId && !semanticName) {
    return null;
  }

  return (
    <View onLayout={handleLayout} pointerEvents="none" style={[styles.watermarkLayer, { opacity }]}>
      {iconSize > 0 && assetId ? (
        <WaymarkImage
          alt=""
          assetId={assetId}
          decorative
          imageStyle={styles.assetWatermarkImage}
          style={{ width: iconSize, height: iconSize }}
          usage="pathIcon"
        />
      ) : null}
      {iconSize > 0 && !assetId && semanticName ? (
        <WaymarkIcon decorative semanticName={semanticName} size="custom" customHeight={iconSize} customWidth={iconSize} state="default" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    aspectRatio: 0.5,
    backgroundColor: journalCardTokens.color.surfaceSubtle,
    ...getBorderStyle(semanticBorder.card.subtle),
    borderRadius: semanticRadius.card.compact,
    flexGrow: 0,
    overflow: "hidden",
    position: "relative",
  },
  warningCardResolved: {
    alignSelf: "stretch",
    aspectRatio: 0.5,
    flexGrow: 0,
    backgroundColor: foundationColors.gold.soft,
    ...getBorderStyle(semanticBorder.state.weak),
    borderRadius: semanticRadius.card.compact,
    overflow: "hidden",
    position: "relative",
  },
  label: {
    color: foundationColors.ink.secondary,
    textAlign: "center",
    width: "100%",
  },
  value: {
    color: foundationColors.ink.primary,
    fontFamily: fontFamilyTokens.serifDisplay.runtime,
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
    width: "100%",
  },
  watermarkLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    zIndex: 0,
  },
  assetWatermarkImage: {
    ...StyleSheet.absoluteFillObject,
  },
  foregroundLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 12,
    zIndex: 2,
  },
  contentLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    justifyContent: "flex-end",
    padding: 12,
  },
  skeletonBlock: {
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonLabel: {
    width: "48%",
    height: 16,
  },
  skeletonValue: {
    width: "62%",
    height: 28,
  },
});
