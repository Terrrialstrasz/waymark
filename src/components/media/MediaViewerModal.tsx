import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import ImageViewing from "react-native-image-viewing";
import { foundationColors, spacing } from "../../theme/tokens";
import type { Locale } from "../../types/ui";
import type { WaymarkMediaItem } from "../../app/waymarkMediaSelectors";
import { cacheGoogleDriveMediaFile } from "../../app/googleDriveMediaSession";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMButton } from "../primitives/WMButton";
import { WMText } from "../primitives/Text";

type Props = {
  items: WaymarkMediaItem[];
  locale?: Locale;
  onClose: () => void;
  open: boolean;
  initialIndex: number;
};

export function MediaViewerModal({
  items,
  locale = "en",
  onClose,
  open,
  initialIndex,
}: Props) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [previewVideoItem, setPreviewVideoItem] = useState<WaymarkMediaItem | null>(null);
  const [viewerItems, setViewerItems] = useState(items);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const requestedItem = viewerItems[Math.max(0, Math.min(initialIndex, viewerItems.length - 1))];
  const galleryItems = viewerItems.filter((item) => resolveGalleryImageUri(item));
  const images = galleryItems.map((item) => ({ uri: resolveGalleryImageUri(item)! }));
  const requestedImageIndex = Math.max(0, galleryItems.findIndex((item) => item.id === requestedItem?.id));
  const contentWidth = windowWidth;
  const maxMediaHeight = Math.max(1, windowHeight - insets.top - insets.bottom);

  useEffect(() => {
    if (!open) {
      setPreviewVideoItem(null);
      setLoadingMedia(false);
      setViewerItems(items);
    }
  }, [items, open]);

  useEffect(() => {
    let cancelled = false;
    if (!open) {
      return;
    }

    setViewerItems(items);
    const boundedInitialIndex = Math.max(0, Math.min(initialIndex, items.length - 1));
    const initialItem = items[boundedInitialIndex];
    if (!initialItem || !needsViewerHydration(initialItem)) {
      setLoadingMedia(false);
      return;
    }

    setLoadingMedia(true);
    void (async () => {
      const hydratedItem = await hydrateViewerMediaItem(initialItem);
      if (!cancelled) {
        setViewerItems((current) =>
          current.map((item) => (item.id === hydratedItem.id ? hydratedItem : item)),
        );
        setLoadingMedia(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialIndex, items, open]);

  const openVideoPreview = async (item: WaymarkMediaItem) => {
    if (!needsViewerHydration(item)) {
      setPreviewVideoItem(item);
      return;
    }

    setLoadingMedia(true);
    const hydratedItem = await hydrateViewerMediaItem(item);
    setViewerItems((current) =>
      current.map((currentItem) => (currentItem.id === hydratedItem.id ? hydratedItem : currentItem)),
    );
    setPreviewVideoItem(hydratedItem);
    setLoadingMedia(false);
  };

  if (!open) {
    return null;
  }

  if (images.length > 0) {
    return (
      <>
        <ImageViewing
          backgroundColor="rgba(8, 8, 8, 0.98)"
          doubleTapToZoomEnabled
          imageIndex={requestedImageIndex}
          images={images}
          onRequestClose={onClose}
          swipeToCloseEnabled
          visible={open && !previewVideoItem}
          HeaderComponent={({ imageIndex }) => (
            <View pointerEvents="box-none" style={[styles.headerOverlay, { paddingTop: insets.top + spacing.sm }]}>
              <WMText style={styles.headerLabel} variant="bodySm">
                {loadingMedia
                  ? locale === "vi" ? "Dang tai media" : "Loading media"
                  : images.length > 1 ? `${imageIndex + 1} / ${images.length}`
                  : locale === "vi" ? "Media" : "Media"}
              </WMText>
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                <WMText style={styles.closeLabel} variant="bodyStrong">
                  {locale === "vi" ? "Dong" : "Close"}
                </WMText>
              </Pressable>
            </View>
          )}
          FooterComponent={({ imageIndex }) => {
            const item = galleryItems[imageIndex];
            if (item?.kind !== "video") {
              return null;
            }

            return (
              <View pointerEvents="box-none" style={[styles.footerOverlay, { paddingBottom: insets.bottom + spacing.lg }]}>
                <WMButton
                  label={locale === "vi" ? "Mo preview video" : "Open video preview"}
                  onPress={() => void openVideoPreview(item)}
                  variant="primary"
                />
              </View>
            );
          }}
        />
        <VideoPreviewModal
          contentWidth={contentWidth}
          item={previewVideoItem}
          locale={locale}
          maxMediaHeight={maxMediaHeight}
          onBack={() => setPreviewVideoItem(null)}
          onClose={onClose}
          open={Boolean(previewVideoItem)}
          windowHeight={windowHeight}
          windowWidth={windowWidth}
        />
      </>
    );
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={open}>
      <View style={styles.overlay}>
        {requestedItem ? (
          <View style={[styles.page, { height: windowHeight, width: windowWidth }]}>
            <VideoSlide contentWidth={contentWidth} item={requestedItem} locale={locale} maxMediaHeight={maxMediaHeight} />
          </View>
        ) : null}

        <View pointerEvents="box-none" style={[styles.headerOverlay, { paddingTop: insets.top + spacing.sm }]}>
          <WMText style={styles.headerLabel} variant="bodySm">
            {loadingMedia ? locale === "vi" ? "Dang tai media" : "Loading media" : locale === "vi" ? "Media" : "Media"}
          </WMText>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <WMText style={styles.closeLabel} variant="bodyStrong">
              {locale === "vi" ? "Dong" : "Close"}
            </WMText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function resolveGalleryImageUri(item: WaymarkMediaItem) {
  return item.kind === "video" ? item.posterSrc : item.src;
}

function needsViewerHydration(item: WaymarkMediaItem) {
  return Boolean((!item.src && item.driveFileId) || (!item.posterSrc && item.thumbnailDriveFileId));
}

async function hydrateViewerMediaItem(item: WaymarkMediaItem): Promise<WaymarkMediaItem> {
  const [src, posterSrc] = await Promise.all([
    !item.src && item.driveFileId
      ? cacheGoogleDriveMediaFile({
          driveFileId: item.driveFileId,
          fileName: item.fileName ?? item.id,
          mimeType: item.mimeType,
          usage: `media-viewer:${item.id}:source`,
        })
      : undefined,
    !item.posterSrc && item.thumbnailDriveFileId
      ? cacheGoogleDriveMediaFile({
          driveFileId: item.thumbnailDriveFileId,
          fileName: `${item.id}-thumbnail.jpg`,
          mimeType: "image/jpeg",
          usage: `media-viewer:${item.id}:thumbnail`,
        })
      : undefined,
  ]);

  return {
    ...item,
    canRenderNow: item.canRenderNow || Boolean(src || posterSrc),
    posterSrc: item.posterSrc ?? posterSrc ?? (item.kind === "video" ? undefined : src),
    resolvedSourceKind: src || posterSrc ? "remote_cache" : item.resolvedSourceKind,
    src: item.src ?? src,
  };
}

function VideoPreviewModal({
  contentWidth,
  item,
  locale,
  maxMediaHeight,
  onBack,
  onClose,
  open,
  windowHeight,
  windowWidth,
}: {
  contentWidth: number;
  item: WaymarkMediaItem | null;
  locale: Locale;
  maxMediaHeight: number;
  onBack: () => void;
  onClose: () => void;
  open: boolean;
  windowHeight: number;
  windowWidth: number;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="fade" onRequestClose={onBack} transparent visible={open}>
      <View style={styles.overlay}>
        {item ? (
          <View style={[styles.page, { height: windowHeight, width: windowWidth }]}>
            <VideoSlide contentWidth={contentWidth} item={item} locale={locale} maxMediaHeight={maxMediaHeight} />
          </View>
        ) : null}

        <View pointerEvents="box-none" style={[styles.headerOverlay, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.closeButton}>
            <WMText style={styles.closeLabel} variant="bodyStrong">
              {locale === "vi" ? "Quay lai" : "Back"}
            </WMText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <WMText style={styles.closeLabel} variant="bodyStrong">
              {locale === "vi" ? "Dong" : "Close"}
            </WMText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ImageSlide({
  active,
  contentWidth,
  item,
  maxMediaHeight,
  onZoomChange,
}: {
  active: boolean;
  contentWidth: number;
  item: WaymarkMediaItem;
  maxMediaHeight: number;
  onZoomChange: (zoomed: boolean) => void;
}) {
  if (!item.src) {
    return (
      <View style={[styles.placeholderPanel, styles.fullScreenPlaceholder]}>
        <WMText style={styles.placeholderLabel} variant="bodySm">
          Image unavailable
        </WMText>
      </View>
    );
  }

  const mediaSize = resolveMediaDisplaySize(item, contentWidth, maxMediaHeight);

  return (
    <ZoomableImage
      active={active}
      item={item}
      mediaHeight={mediaSize.height}
      mediaWidth={mediaSize.width}
      onZoomChange={onZoomChange}
    />
  );
}

function ZoomableImage({
  active,
  item,
  mediaHeight,
  mediaWidth,
  onZoomChange,
}: {
  active: boolean;
  item: WaymarkMediaItem;
  mediaHeight: number;
  mediaWidth: number;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const gestureRef = useRef({
    initialDistance: 0,
    initialScale: 1,
    lastTapAt: 0,
    scale: 1,
    startX: 0,
    startY: 0,
    translateX: 0,
    translateY: 0,
  });

  useEffect(() => {
    if (!active) {
      resetZoom(scale, translateX, translateY, gestureRef, onZoomChange);
    }
  }, [active, onZoomChange, scale, translateX, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: (event) =>
          active && (event.nativeEvent.touches.length >= 2 || gestureRef.current.scale > 1),
        onMoveShouldSetPanResponderCapture: (event) =>
          active && (event.nativeEvent.touches.length >= 2 || gestureRef.current.scale > 1),
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          active && gestureRef.current.scale > 1 && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2),
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          gestureRef.current.startX = gestureRef.current.translateX;
          gestureRef.current.startY = gestureRef.current.translateY;
          if (touches.length >= 2) {
            gestureRef.current.initialDistance = getTouchDistance(touches);
            gestureRef.current.initialScale = gestureRef.current.scale;
          }
        },
        onPanResponderMove: (event, gestureState) => {
          const touches = event.nativeEvent.touches;
          if (touches.length >= 2) {
            if (gestureRef.current.initialDistance <= 0) {
              gestureRef.current.initialDistance = getTouchDistance(touches);
              gestureRef.current.initialScale = gestureRef.current.scale;
            }
            const nextScale = clamp(
              gestureRef.current.initialScale * (getTouchDistance(touches) / Math.max(1, gestureRef.current.initialDistance)),
              1,
              4,
            );
            gestureRef.current.scale = nextScale;
            scale.setValue(nextScale);
            onZoomChange(nextScale > 1.01);
            return;
          }

          if (gestureRef.current.scale <= 1) {
            return;
          }

          const nextX = clampPan(gestureRef.current.startX + gestureState.dx, mediaWidth, gestureRef.current.scale);
          const nextY = clampPan(gestureRef.current.startY + gestureState.dy, mediaHeight, gestureRef.current.scale);
          gestureRef.current.translateX = nextX;
          gestureRef.current.translateY = nextY;
          translateX.setValue(nextX);
          translateY.setValue(nextY);
        },
        onPanResponderRelease: () => {
          gestureRef.current.initialDistance = 0;
          gestureRef.current.initialScale = gestureRef.current.scale;

          if (gestureRef.current.scale <= 1.01) {
            resetZoom(scale, translateX, translateY, gestureRef, onZoomChange);
            return;
          }

          const nextX = clampPan(gestureRef.current.translateX, mediaWidth, gestureRef.current.scale);
          const nextY = clampPan(gestureRef.current.translateY, mediaHeight, gestureRef.current.scale);
          gestureRef.current.translateX = nextX;
          gestureRef.current.translateY = nextY;
          translateX.setValue(nextX);
          translateY.setValue(nextY);
        },
        onPanResponderTerminate: () => {
          gestureRef.current.initialDistance = 0;
          gestureRef.current.initialScale = gestureRef.current.scale;
        },
        onPanResponderTerminationRequest: () => gestureRef.current.scale <= 1.01,
      }),
    [active, mediaHeight, mediaWidth, onZoomChange, scale, translateX, translateY],
  );

  const handleTap = () => {
    const now = Date.now();
    if (now - gestureRef.current.lastTapAt > 280) {
      gestureRef.current.lastTapAt = now;
      return;
    }

    if (gestureRef.current.scale > 1) {
      resetZoom(scale, translateX, translateY, gestureRef, onZoomChange);
    } else {
      gestureRef.current.scale = 2;
      scale.setValue(2);
      onZoomChange(true);
    }
    gestureRef.current.lastTapAt = 0;
  };

  return (
    <Pressable {...panResponder.panHandlers} onPress={handleTap} style={[styles.zoomViewport, { height: mediaHeight, width: mediaWidth }]}>
      <Animated.View
        style={[
          styles.zoomContent,
          {
            transform: [{ translateX }, { translateY }, { scale }],
          },
        ]}
      >
        <WaymarkImage
          alt={item.alt}
          assetId={item.assetId}
          imageStyle={styles.viewerImage}
          objectFit="contain"
          rounded={false}
          src={item.src}
          style={styles.viewerFrame}
          usage="hero"
        />
      </Animated.View>
    </Pressable>
  );
}

function VideoSlide({
  contentWidth,
  item,
  locale,
  maxMediaHeight,
}: {
  contentWidth: number;
  item: WaymarkMediaItem;
  locale: Locale;
  maxMediaHeight: number;
}) {
  const mediaSize = resolveMediaDisplaySize(item, contentWidth, maxMediaHeight);
  const player = useVideoPlayer(item.src ? { uri: item.src } : null, (nextPlayer) => {
    nextPlayer.loop = false;
    nextPlayer.play();
  });

  return (
    <View style={styles.videoSlide}>
      {item.src ? (
        <VideoView
          contentFit="contain"
          fullscreenOptions={{ enable: true }}
          nativeControls
          player={player}
          style={[styles.videoPlayer, { height: mediaSize.height, width: mediaSize.width }]}
        />
      ) : (
        <View style={[styles.viewerFrame, styles.placeholderPanel, { height: mediaSize.height, width: mediaSize.width }]}>
          <WMText style={styles.placeholderLabel} variant="bodySm">
            Video preview unavailable
          </WMText>
        </View>
      )}
      <View style={styles.videoActions}>
        <WMText style={styles.videoHint} variant="bodySm">
          {locale === "vi" ? "Video phat truc tiep trong Waymark." : "Video plays inside Waymark."}
        </WMText>
      </View>
    </View>
  );
}

function resolveMediaDisplaySize(item: WaymarkMediaItem, contentWidth: number, maxHeight: number) {
  const ratio = item.width && item.height && item.width > 0 && item.height > 0 ? item.width / item.height : 1;
  const safeWidth = Math.max(1, contentWidth);
  const safeHeight = Math.max(1, maxHeight);

  if (ratio >= 1) {
    const width = safeWidth;
    return {
      width,
      height: Math.min(safeHeight, width / ratio),
    };
  }

  const height = safeHeight;
  return {
    width: Math.min(safeWidth, height * ratio),
    height,
  };
}

function getTouchDistance(touches: ReadonlyArray<{ pageX: number; pageY: number }>) {
  const first = touches[0];
  const second = touches[1];
  if (!first || !second) {
    return 1;
  }
  return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampPan(value: number, size: number, scale: number) {
  const limit = Math.max(0, (size * scale - size) / 2);
  return clamp(value, -limit, limit);
}

function resetZoom(
  scale: Animated.Value,
  translateX: Animated.Value,
  translateY: Animated.Value,
  gestureRef: React.MutableRefObject<{
    initialDistance: number;
    initialScale: number;
    lastTapAt: number;
    scale: number;
    startX: number;
    startY: number;
    translateX: number;
    translateY: number;
  }>,
  onZoomChange: (zoomed: boolean) => void,
) {
  gestureRef.current = {
    initialDistance: 0,
    initialScale: 1,
    lastTapAt: gestureRef.current.lastTapAt,
    scale: 1,
    startX: 0,
    startY: 0,
    translateX: 0,
    translateY: 0,
  };
  scale.setValue(1);
  translateX.setValue(0);
  translateY.setValue(0);
  onZoomChange(false);
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(8, 8, 8, 0.98)",
    flex: 1,
    justifyContent: "center",
  },
  headerOverlay: {
    alignItems: "center",
    left: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  headerLabel: {
    color: foundationColors.bg.paper,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 252, 246, 0.14)",
    borderColor: "rgba(255, 252, 246, 0.28)",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  closeLabel: {
    color: foundationColors.bg.paper,
  },
  footerOverlay: {
    alignItems: "center",
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: 0,
    zIndex: 2,
  },
  scroller: {
    flex: 1,
  },
  page: {
    alignItems: "center",
    justifyContent: "center",
  },
  viewerFrame: {
    backgroundColor: "transparent",
    overflow: "hidden",
    width: "100%",
  },
  viewerImage: {
    height: "100%",
    width: "100%",
  },
  videoPlayer: {
    backgroundColor: "black",
  },
  zoomViewport: {
    alignItems: "center",
    backgroundColor: "transparent",
    justifyContent: "center",
    overflow: "hidden",
  },
  zoomContent: {
    height: "100%",
    width: "100%",
  },
  placeholderPanel: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullScreenPlaceholder: {
    flex: 1,
  },
  placeholderLabel: {
    color: foundationColors.bg.paper,
  },
  videoSlide: {
    alignItems: "center",
    gap: spacing.md,
  },
  videoActions: {
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  videoHint: {
    color: foundationColors.bg.paper,
  },
});
