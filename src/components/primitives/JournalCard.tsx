import { ReactNode, useEffect, useMemo, useState } from "react";
import { AccessibilityRole, Image, ImageSourcePropType, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import {
  SemanticState,
  getSemanticStateToneStyle,
  getWaymarkPressStyle,
  journalCardTokens,
  semanticBorder,
  semanticElevation,
  semanticRadius,
  semanticSpacing,
  useReducedMotionEnabled,
} from "../../theme/tokens";
import { FeatureState, PathId } from "../../types/ui";
import { isFeatureInteractive, isFeatureVisible } from "../../utils/featureGate";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { BotanicalDecorationLayer } from "./BotanicalDecorationLayer";
import { DEBUG_LAYOUT_CARD_STACK, DebugLayerBox } from "../../debug/layoutDebug";
import { getPathHeroImage } from "../../tokens/pathHeroImages";

type JournalCardVariant =
  | "standard"
  | "compact"
  | "hero"
  | "listGroup"
  | "rowSurface"
  | "withImage"
  | "withoutImage"
  | "withIcon"
  | "withoutIcon"
  | "readOnly"
  | "actionable"
  | "selected"
  | "warningSoft"
  | "nested";

type Props = {
  children: ReactNode;
  hidden?: boolean;
  gate?: FeatureState;
  variant?: JournalCardVariant;
  actionable?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  loading?: boolean;
  reducedMotion?: boolean;
  stateTone?: Exclude<SemanticState, "hidden">;
  decorationPreset?: "journalCard" | "entityCard" | "resultSeal";
  decorative?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  backgroundPaintImage?: ImageSourcePropType;
  backgroundPaintInfo?: {
    assetId?: string;
    assetVariant?: string;
    sourceKind?: "entry-image" | "path-hero" | "lab-demo" | "unknown";
    title?: string;
    focalPoint?: {
      x: number;
      y: number;
    };
  };
  backgroundLayer?: ReactNode | ((state: { pressed: boolean; disabled: boolean; loading: boolean }) => ReactNode);
  overlayLayer?: ReactNode | ((state: { pressed: boolean; disabled: boolean; loading: boolean }) => ReactNode);
  layoutGuardInfo?: {
    cardType: string;
    sourceId?: string;
    sourceType?: string;
    pathId?: PathId;
    title?: string;
  };
  preserveSurfaceColorOnPress?: boolean;
  debugLabel?: string;
  debugLines?: string[];
};

const variantConfig: Record<
  JournalCardVariant,
  {
    padding: number;
    gap: number;
    radius: number;
    shadow: string;
    border: string;
    surface: string;
    readOnly: boolean;
  }
> = {
  standard: {
    padding: journalCardTokens.spacing.paddingStandard,
    gap: journalCardTokens.spacing.gapSm,
    radius: journalCardTokens.radius.standard,
    shadow: journalCardTokens.shadow.journal,
    border: journalCardTokens.border.journal,
    surface: journalCardTokens.color.surface,
    readOnly: true,
  },
  compact: {
    padding: journalCardTokens.spacing.paddingCompact,
    gap: journalCardTokens.spacing.gapXs,
    radius: journalCardTokens.radius.compact,
    shadow: journalCardTokens.shadow.none,
    border: journalCardTokens.border.journal,
    surface: journalCardTokens.color.surface,
    readOnly: true,
  },
  hero: {
    padding: journalCardTokens.spacing.paddingHero,
    gap: journalCardTokens.spacing.gapMd,
    radius: journalCardTokens.radius.hero,
    shadow: journalCardTokens.shadow.hero,
    border: journalCardTokens.border.journal,
    surface: journalCardTokens.color.surfaceElevated,
    readOnly: true,
  },
  listGroup: {
    padding: journalCardTokens.spacing.paddingStandard,
    gap: journalCardTokens.spacing.gapSm,
    radius: journalCardTokens.radius.standard,
    shadow: journalCardTokens.shadow.journal,
    border: journalCardTokens.border.journal,
    surface: journalCardTokens.color.surface,
    readOnly: true,
  },
  rowSurface: {
    padding: journalCardTokens.spacing.paddingCompact,
    gap: journalCardTokens.spacing.gapXs,
    radius: journalCardTokens.radius.compact,
    shadow: journalCardTokens.shadow.none,
    border: journalCardTokens.border.journal,
    surface: journalCardTokens.color.surface,
    readOnly: false,
  },
  withImage: {
    padding: journalCardTokens.spacing.paddingStandard,
    gap: journalCardTokens.spacing.gapSm,
    radius: semanticRadius.card.media,
    shadow: journalCardTokens.shadow.journal,
    border: journalCardTokens.border.journal,
    surface: journalCardTokens.color.surface,
    readOnly: true,
  },
  withoutImage: {
    padding: journalCardTokens.spacing.paddingStandard,
    gap: journalCardTokens.spacing.gapSm,
    radius: journalCardTokens.radius.standard,
    shadow: journalCardTokens.shadow.journal,
    border: journalCardTokens.border.journal,
    surface: journalCardTokens.color.surface,
    readOnly: true,
  },
  withIcon: {
    padding: journalCardTokens.spacing.paddingStandard,
    gap: journalCardTokens.spacing.gapSm,
    radius: journalCardTokens.radius.standard,
    shadow: journalCardTokens.shadow.journal,
    border: journalCardTokens.border.journal,
    surface: journalCardTokens.color.surface,
    readOnly: true,
  },
  withoutIcon: {
    padding: journalCardTokens.spacing.paddingStandard,
    gap: journalCardTokens.spacing.gapSm,
    radius: journalCardTokens.radius.standard,
    shadow: journalCardTokens.shadow.journal,
    border: journalCardTokens.border.journal,
    surface: journalCardTokens.color.surface,
    readOnly: true,
  },
  readOnly: {
    padding: journalCardTokens.spacing.paddingStandard,
    gap: journalCardTokens.spacing.gapSm,
    radius: journalCardTokens.radius.standard,
    shadow: journalCardTokens.shadow.none,
    border: semanticBorder.card.subtle,
    surface: journalCardTokens.color.surfaceSubtle,
    readOnly: true,
  },
  actionable: {
    padding: journalCardTokens.spacing.paddingStandard,
    gap: journalCardTokens.spacing.gapSm,
    radius: journalCardTokens.radius.standard,
    shadow: journalCardTokens.shadow.journal,
    border: journalCardTokens.border.journal,
    surface: journalCardTokens.color.surface,
    readOnly: false,
  },
  selected: {
    padding: journalCardTokens.spacing.paddingStandard,
    gap: journalCardTokens.spacing.gapSm,
    radius: journalCardTokens.radius.standard,
    shadow: journalCardTokens.shadow.selected,
    border: journalCardTokens.border.selected,
    surface: journalCardTokens.color.selected,
    readOnly: true,
  },
  warningSoft: {
    padding: journalCardTokens.spacing.paddingStandard,
    gap: journalCardTokens.spacing.gapSm,
    radius: journalCardTokens.radius.standard,
    shadow: journalCardTokens.shadow.none,
    border: journalCardTokens.border.warning,
    surface: journalCardTokens.color.warningTint,
    readOnly: true,
  },
  nested: {
    padding: journalCardTokens.spacing.paddingCompact,
    gap: journalCardTokens.spacing.gapXs,
    radius: journalCardTokens.radius.compact,
    shadow: journalCardTokens.shadow.none,
    border: semanticBorder.card.subtle,
    surface: journalCardTokens.color.surfaceSubtle,
    readOnly: true,
  },
};

export function JournalCard({
  children,
  hidden,
  gate = "enabled",
  variant = "standard",
  actionable,
  onPress,
  disabled,
  selected,
  loading,
  reducedMotion,
  stateTone,
  decorationPreset,
  decorative = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  style,
  contentStyle,
  backgroundPaintImage,
  backgroundPaintInfo,
  backgroundLayer,
  overlayLayer,
  layoutGuardInfo,
  preserveSurfaceColorOnPress = false,
  debugLabel,
  debugLines,
}: Props) {
  const prefersReducedMotion = useReducedMotionEnabled(reducedMotion);
  const [surfaceLayout, setSurfaceLayout] = useState<{ width: number; height: number } | null>(null);
  const resolvedBackgroundPaintImage = backgroundPaintImage ?? null;
  const resolvedBackgroundPaintSource = useMemo(
    () => (resolvedBackgroundPaintImage ? Image.resolveAssetSource(resolvedBackgroundPaintImage) : undefined),
    [resolvedBackgroundPaintImage]
  );
  const focalPoint = useMemo(
    () => resolveBackgroundFocalPoint({ backgroundPaintInfo, layoutGuardInfo }),
    [backgroundPaintInfo, layoutGuardInfo]
  );
  const backgroundCropStyle = useMemo(
    () =>
      resolveBackgroundCropStyle({
        focalPoint,
        layout: surfaceLayout,
        source: resolvedBackgroundPaintSource,
      }),
    [focalPoint, resolvedBackgroundPaintSource, surfaceLayout]
  );

  if (hidden || !isFeatureVisible(gate)) {
    return null;
  }

  const config = variantConfig[variant];
  const interactive = Boolean(actionable ?? onPress ?? !config.readOnly);
  const statePalette = stateTone ? getSemanticStateToneStyle(stateTone, "subtle") : null;
  const surfaceStyle = {
    backgroundColor:
      disabled
        ? journalCardTokens.color.disabled
        : statePalette?.bg ?? (selected ? journalCardTokens.color.selected : config.surface),
    borderColor: statePalette?.border,
  };

  const renderLayer = (
    layer: Props["backgroundLayer"] | Props["overlayLayer"],
    pressed: boolean
  ) => {
    if (!layer) {
      return null;
    }

    return typeof layer === "function" ? layer({ pressed, disabled: Boolean(disabled), loading: Boolean(loading) }) : layer;
  };

  const renderCard = (pressed: boolean) => {
    const resolvedBackgroundLayer = renderLayer(backgroundLayer, pressed);
    const resolvedOverlayLayer = renderLayer(overlayLayer, pressed);
    const handleLayout = (event: { nativeEvent: { layout: { height: number; width: number; x: number; y: number } } }) => {
      const { height, width, x, y } = event.nativeEvent.layout;
      setSurfaceLayout((current) => (current && current.width === width && current.height === height ? current : { width, height }));

      if (!__DEV__ || variant !== "compact" || height <= 260) {
        return;
      }

      const info = layoutGuardInfo
        ? ` cardType=${layoutGuardInfo.cardType}${layoutGuardInfo.sourceType ? ` sourceType=${layoutGuardInfo.sourceType}` : ""}${layoutGuardInfo.sourceId ? ` sourceId=${layoutGuardInfo.sourceId}` : ""}${layoutGuardInfo.pathId ? ` pathId=${layoutGuardInfo.pathId}` : ""}`
        : "";
      console.warn(`[JournalCard] compact height guard height=${height} width=${width} x=${x} y=${y}${info}`);
    };

    const cardNode = (
      <View
        onLayout={handleLayout}
        style={[
          styles.base,
          getBorderStyle(statePalette?.border ? `1px solid ${statePalette.border}` : selected ? config.border : config.border),
          {
            borderRadius: config.radius,
            backgroundColor:
              pressed && !preserveSurfaceColorOnPress ? journalCardTokens.color.pressed : surfaceStyle.backgroundColor,
            boxShadow: pressed ? journalCardTokens.shadow.pressed : disabled ? semanticElevation.flat : config.shadow,
            opacity: disabled ? 0.66 : loading ? 0.84 : 1,
          },
          style,
        ]}
      >
        <View style={styles.surfaceLayer}>
          {resolvedBackgroundPaintImage ? (
            <View pointerEvents="none" style={styles.backgroundImageLayer}>
              <Image
                accessibilityIgnoresInvertColors
                accessible={false}
                resizeMode="cover"
                source={resolvedBackgroundPaintImage}
                style={[styles.backgroundImage, backgroundCropStyle]}
              />
            </View>
          ) : null}
          {resolvedBackgroundLayer ? (
            <DebugLayerBox label={debugLabel ? `${debugLabel}.DecorationLayer` : "JournalCard.DecorationLayer"} lines={debugLines} tone="purple">
              {resolvedBackgroundLayer}
            </DebugLayerBox>
          ) : null}
          {resolvedOverlayLayer ? (
            <DebugLayerBox label={debugLabel ? `${debugLabel}.FooterSlot` : "JournalCard.FooterSlot"} lines={debugLines} tone="amber">
              {resolvedOverlayLayer}
            </DebugLayerBox>
          ) : null}
        </View>
        <DebugLayerBox label={debugLabel ? `${debugLabel}.ContentWrapper` : "JournalCard.ContentWrapper"} lines={debugLines} tone="green">
          <View
            style={[
              styles.inner,
              {
                padding: config.padding,
                gap: config.gap,
              },
              contentStyle,
            ]}
          >
            <DebugLayerBox label={debugLabel ? `${debugLabel}.ChildrenSlot` : "JournalCard.ChildrenSlot"} lines={debugLines} tone="blue">
              {children}
            </DebugLayerBox>
          </View>
        </DebugLayerBox>
      </View>
    );

    if (!DEBUG_LAYOUT_CARD_STACK) {
      return cardNode;
    }

    return (
      <DebugLayerBox label={debugLabel ? `${debugLabel}.Root` : "JournalCard.Root"} lines={debugLines} tone="amber">
        <DebugLayerBox label={debugLabel ? `${debugLabel}.Surface` : "JournalCard.Surface"} lines={debugLines} tone="green">
          {cardNode}
        </DebugLayerBox>
      </DebugLayerBox>
    );
  };

  useEffect(() => {
    if (!__DEV__ || !resolvedBackgroundPaintSource || !surfaceLayout) {
      return;
    }

    const title = backgroundPaintInfo?.title ?? layoutGuardInfo?.title ?? "unknown";
    const cropMode = focalPoint.x === 0.5 && focalPoint.y === 0.5 ? "cover-center" : "cover-focal";
    const ratio = surfaceLayout.height > 0 ? (surfaceLayout.width / surfaceLayout.height).toFixed(3) : "unknown";
    const sourceUri = resolvedBackgroundPaintSource.uri ?? "unknown";
    const sourceKind = backgroundPaintInfo?.sourceKind ?? "unknown";
    const assetId = backgroundPaintInfo?.assetId ?? "unknown";
    const rendition = backgroundPaintInfo?.assetVariant ?? "unknown";
    console.debug(
      `[JournalCard] background crop title=${title} uri=${sourceUri} assetId=${assetId} rendition=${rendition} sourceKind=${sourceKind} resizeMode=cover cropMode=${cropMode} contentPosition=${focalPoint.x.toFixed(2)},${focalPoint.y.toFixed(2)} cardAspectRatio=${ratio}`
    );
  }, [backgroundPaintInfo, focalPoint, layoutGuardInfo, resolvedBackgroundPaintSource, surfaceLayout]);

  const cardBody = renderCard(false);
  const wrapped = decorative && decorationPreset ? (
    <BotanicalDecorationLayer preset={decorationPreset}>{cardBody}</BotanicalDecorationLayer>
  ) : (
    cardBody
  );

  if (!interactive) {
    return wrapped;
  }

  const pressable = (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      disabled={disabled || !isFeatureInteractive(gate)}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: config.radius,
        },
        getWaymarkPressStyle({ pressed, reducedMotion: prefersReducedMotion, variant: "row" }),
      ]}
    >
      {({ pressed }) => renderCard(pressed)}
    </Pressable>
  );

  return decorative && decorationPreset ? (
    <BotanicalDecorationLayer preset={decorationPreset}>{pressable}</BotanicalDecorationLayer>
  ) : (
    pressable
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "stretch",
    flexGrow: 0,
    flexShrink: 0,
    overflow: "hidden",
    position: "relative",
  },
  surfaceLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  backgroundImageLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  backgroundImage: {
    position: "absolute",
  },
  inner: {
    minHeight: 0,
    position: "relative",
    zIndex: 2,
  },
});

function resolveBackgroundFocalPoint({
  backgroundPaintInfo,
  layoutGuardInfo,
}: {
  backgroundPaintInfo?: {
    sourceKind?: "entry-image" | "path-hero" | "lab-demo" | "unknown";
    title?: string;
    assetId?: string;
    assetVariant?: string;
    focalPoint?: {
      x: number;
      y: number;
    };
  };
  layoutGuardInfo?: {
    cardType: string;
    sourceId?: string;
    sourceType?: string;
    pathId?: PathId;
    title?: string;
  };
}) {
  if (backgroundPaintInfo?.sourceKind !== "path-hero") {
    return { x: 0.5, y: 0.5 };
  }

  if (backgroundPaintInfo.focalPoint) {
    return backgroundPaintInfo.focalPoint;
  }

  const pathHero = getPathHeroImage(layoutGuardInfo?.pathId);
  return pathHero?.focalPoint ?? { x: 0.5, y: 0.5 };
}

function resolveBackgroundCropStyle({
  focalPoint,
  layout,
  source,
}: {
  focalPoint: { x: number; y: number };
  layout: { width: number; height: number } | null;
  source?: { width?: number; height?: number };
}) {
  const containerWidth = layout?.width;
  const containerHeight = layout?.height;
  const sourceWidth = source?.width;
  const sourceHeight = source?.height;

  if (!containerWidth || !containerHeight || !sourceWidth || !sourceHeight) {
    return StyleSheet.absoluteFillObject;
  }

  const safeFocalX = clamp01(focalPoint.x);
  const safeFocalY = clamp01(focalPoint.y);
  const scale = Math.max(containerWidth / sourceWidth, containerHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  const left = clamp(containerWidth / 2 - safeFocalX * renderedWidth, containerWidth - renderedWidth, 0);
  const top = clamp(containerHeight / 2 - safeFocalY * renderedHeight, containerHeight - renderedHeight, 0);

  return {
    position: "absolute" as const,
    width: renderedWidth,
    height: renderedHeight,
    left,
    top,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}
