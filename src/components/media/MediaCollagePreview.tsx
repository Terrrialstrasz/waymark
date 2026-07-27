import { Pressable, StyleSheet, View } from "react-native";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMText } from "../primitives/Text";
import { foundationColors, spacing } from "../../theme/tokens";
import type { Locale } from "../../types/ui";
import type { WaymarkMediaItem } from "../../app/waymarkMediaSelectors";

type Props = {
  items: WaymarkMediaItem[];
  locale?: Locale;
  onPressMedia?: (index: number) => void;
  titleForAccessibility?: string;
};

type VisibleCell = {
  item: WaymarkMediaItem;
  index: number;
  remainingCount?: number;
};

export function MediaCollagePreview({
  items,
  locale = "en",
  onPressMedia,
  titleForAccessibility = "media",
}: Props) {
  const visibleCells = getVisibleCells(items);

  if (visibleCells.length === 0) {
    return null;
  }

  return (
    <View
      accessibilityLabel={`${titleForAccessibility} media gallery`}
      style={[styles.frame, visibleCells.length === 1 ? styles.singleFrame : null]}
    >
      {visibleCells.map((cell, cellIndex) => {
        const cellStyle = getCellStyle(visibleCells.length, cellIndex);
        const interactive = Boolean(onPressMedia);
        const content = (
          <View style={styles.cellContent}>
            <MediaPoster item={cell.item} />
            {cell.item.kind === "video" ? (
              <View pointerEvents="none" style={styles.playBadge}>
                <WMText style={styles.playBadgeLabel} variant="bodySm">
                  Play
                </WMText>
              </View>
            ) : null}
            {cell.remainingCount ? (
              <View pointerEvents="none" style={styles.remainingOverlay}>
                <WMText style={styles.remainingLabel} variant="sectionTitle">
                  +{cell.remainingCount}
                </WMText>
              </View>
            ) : null}
          </View>
        );

        if (!interactive) {
          return (
            <View key={cell.item.id} style={[styles.cell, cellStyle]}>
              {content}
            </View>
          );
        }

        return (
          <Pressable key={cell.item.id} onPress={() => onPressMedia?.(cell.index)} style={[styles.cell, cellStyle]}>
            {content}
          </Pressable>
        );
      })}
    </View>
  );
}

function MediaPoster({ item }: { item: WaymarkMediaItem }) {
  if (item.posterSrc || (item.kind === "image" && item.src)) {
    return (
      <WaymarkImage
        alt={item.alt}
        assetId={item.assetId}
        decorative={!item.alt}
        imageStyle={styles.image}
        rounded={false}
        src={item.posterSrc ?? item.src}
        usage="journalCard"
      />
    );
  }

  return (
    <View style={[styles.image, styles.fallback]}>
      <WMText style={styles.fallbackLabel} variant="bodySm">
        {item.kind === "video" ? "Video" : "Image"}
      </WMText>
    </View>
  );
}

function getVisibleCells(items: WaymarkMediaItem[]): VisibleCell[] {
  const visibleItems = items.slice(0, 4);
  return visibleItems.map((item, index) => ({
    item,
    index,
    remainingCount: index === 3 && items.length > 4 ? items.length - 4 : undefined,
  }));
}

function getCellStyle(count: number, index: number) {
  if (count === 1) {
    return styles.singleCell;
  }
  if (count === 2) {
    return index === 0 ? styles.twoLeft : styles.twoRight;
  }
  if (count === 3) {
    return index === 0 ? styles.threeLead : index === 1 ? styles.threeTopRight : styles.threeBottomRight;
  }
  return index === 0
    ? styles.fourTopLeft
    : index === 1
      ? styles.fourTopRight
      : index === 2
        ? styles.fourBottomLeft
        : styles.fourBottomRight;
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 1.34,
    backgroundColor: foundationColors.bg.paperSoft,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  singleFrame: {
    aspectRatio: 1.18,
  },
  cell: {
    overflow: "hidden",
    position: "absolute",
  },
  cellContent: {
    flex: 1,
  },
  image: {
    height: "100%",
    width: "100%",
  },
  fallback: {
    alignItems: "center",
    backgroundColor: foundationColors.bg.paperWarm,
    justifyContent: "center",
  },
  fallbackLabel: {
    color: foundationColors.ink.secondary,
  },
  singleCell: {
    inset: 0,
  },
  twoLeft: {
    bottom: 0,
    left: 0,
    right: "50.5%",
    top: 0,
  },
  twoRight: {
    bottom: 0,
    left: "50.5%",
    right: 0,
    top: 0,
  },
  threeLead: {
    bottom: 0,
    left: 0,
    right: "40%",
    top: 0,
  },
  threeTopRight: {
    bottom: "50.5%",
    left: "60.5%",
    right: 0,
    top: 0,
  },
  threeBottomRight: {
    bottom: 0,
    left: "60.5%",
    right: 0,
    top: "50.5%",
  },
  fourTopLeft: {
    bottom: "50.5%",
    left: 0,
    right: "50.5%",
    top: 0,
  },
  fourTopRight: {
    bottom: "50.5%",
    left: "50.5%",
    right: 0,
    top: 0,
  },
  fourBottomLeft: {
    bottom: 0,
    left: 0,
    right: "50.5%",
    top: "50.5%",
  },
  fourBottomRight: {
    bottom: 0,
    left: "50.5%",
    right: 0,
    top: "50.5%",
  },
  playBadge: {
    alignItems: "center",
    backgroundColor: "rgba(17, 17, 17, 0.72)",
    borderRadius: 999,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    position: "absolute",
    top: spacing.sm,
  },
  playBadgeLabel: {
    color: foundationColors.bg.paper,
  },
  remainingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(17, 17, 17, 0.56)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  remainingLabel: {
    color: foundationColors.bg.paper,
  },
});
