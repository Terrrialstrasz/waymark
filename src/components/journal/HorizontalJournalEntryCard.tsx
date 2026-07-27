import { Fragment, ReactNode, useEffect, useMemo, useState } from "react";
import { ImageSourcePropType, StyleSheet, useWindowDimensions, View, StyleProp, ViewStyle, TextStyle } from "react-native";
import { JournalCard } from "../primitives/JournalCard";
import { EntityChip } from "../primitives/EntityChip";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMText } from "../primitives/Text";
import { getCopy } from "../../i18n/copy";
import { foundationColors, SemanticState, spacing, vellumOverlayTokens } from "../../theme/tokens";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { Locale, PathId } from "../../types/ui";
import { getPathHeroImage, resolvePathHeroFromHint, resolvePathIdFromHint } from "../../tokens/pathHeroImages";
import { getPathVisualTokens } from "../../tokens/pathVisualTokens";
import { todayCarouselCard } from "../today/todayCarouselCardTokens";
import { DEBUG_LAYOUT_CARD_STACK, DebugLayerBox } from "../../debug/layoutDebug";
import type { WaymarkMediaItem } from "../../app/waymarkMediaSelectors";
import { MediaCollagePreview } from "../media/MediaCollagePreview";
import { MediaViewerModal } from "../media/MediaViewerModal";

const COMPACT_VELLUM_INSET = 10;
const COMPACT_VELLUM_PADDING_Y = 10;
const COMPACT_VELLUM_PADDING_X = 14;

type Chip = {
  id?: string;
  label: string;
  iconName?: "calendar" | "done" | "heart" | "warning" | "target" | "sparkles" | "clock";
  colorToken?: string;
  variant?: "entity" | "status" | "filter" | "metadata" | "selected" | "subtle" | "warningSoft";
  stateTone?: Exclude<SemanticState, "hidden">;
};

type Props = {
  ownerId?: string;
  sourceType?: string;
  sourceId?: string;
  locale?: Locale;
  entryType: "mark" | "memory";
  title: string;
  entityLine?: string;
  body?: string;
  showImagePlaceholder?: boolean;
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
  mediaItems?: WaymarkMediaItem[];
  chips?: Chip[];
  status?: "default" | "done" | "planned" | "warning" | "missed";
  readonly?: boolean;
  loading?: boolean;
  onPress?: () => void;
  pathLabel?: string;
  pathColorToken?: string;
  pathId?: PathId;
  titleNumberOfLines?: number;
  bodyNumberOfLines?: number;
  density?: "default" | "compact";
  style?: StyleProp<ViewStyle>;
  trailing?: ReactNode;
  compactBodyStyle?: StyleProp<TextStyle>;
  compactContentStyle?: StyleProp<ViewStyle>;
  compactCopyShellStyle?: StyleProp<ViewStyle>;
  compactCopyStyle?: StyleProp<ViewStyle>;
  compactVellumStyle?: StyleProp<ViewStyle>;
  compactRootVellumStyle?: StyleProp<ViewStyle>;
  compactVellumMode?: "inner" | "root";
  compactTitleVariant?: "pageTitle" | "cardTitle" | "sectionTitle" | "bodyStrong";
  compactTitleStyle?: StyleProp<TextStyle>;
  compactTextStackStyle?: StyleProp<ViewStyle>;
  compactChipScrollerStyle?: StyleProp<ViewStyle>;
  suppressAutoMetaChips?: boolean;
  showDetailText?: boolean;
  debugLabel?: string;
  debugLines?: string[];
};

export function HorizontalJournalEntryCard({
  ownerId,
  sourceType,
  sourceId,
  locale = "en",
  entryType,
  title,
  entityLine,
  body,
  backgroundPaintImage,
  backgroundPaintInfo,
  mediaItems = [],
  chips = [],
  status = "default",
  readonly = false,
  loading = false,
  onPress,
  pathLabel,
  pathColorToken,
  pathId,
  titleNumberOfLines,
  bodyNumberOfLines,
  density = "default",
  style,
  trailing,
  compactBodyStyle,
  compactContentStyle,
  compactCopyShellStyle,
  compactCopyStyle,
  compactVellumStyle,
  compactRootVellumStyle,
  compactVellumMode = "inner",
  compactTitleVariant = "pageTitle",
  compactTitleStyle,
  compactTextStackStyle,
  compactChipScrollerStyle,
  suppressAutoMetaChips = false,
  showDetailText = true,
  debugLabel,
  debugLines,
}: Props) {
  const c = getCopy(locale);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const { width } = useWindowDimensions();
  const compactMobile = width <= 360;
  const compactDensity = density === "compact";
  const actionable = Boolean(onPress) && !readonly && !loading;
  const meta = useMemo(
    () => getCompactMeta({ c, chips, entryType, entityLine, pathColorToken, pathId, pathLabel, status }),
    [c, chips, entryType, entityLine, pathColorToken, pathId, pathLabel, status]
  );
  const resolvedPathId = useMemo(() => meta.pathId ?? pathId ?? resolvePathIdFromHint(pathLabel ?? entityLine), [entityLine, meta.pathId, pathId, pathLabel]);
  const resolvedCompactVellumMode = compactVellumMode;
  const metaChips: Chip[] = useMemo(() => {
    if (chips.length) {
      return chips;
    }

    if (suppressAutoMetaChips) {
      return [];
    }

    const autoLabels = [meta.statusLabel, meta.pathLabel].filter(Boolean) as string[];
    if (autoLabels.length > 0) {
      return autoLabels.map((label, index): Chip => ({
        id: `meta-${index}-${label}`,
        label,
        variant: (index === 0 && status !== "default" ? "status" : "metadata") as "status" | "metadata",
        stateTone: index === 0 ? getStatusStateTone(status) : undefined,
      }));
    }

    return [
      {
        id: "meta-fallback",
        label: entryType === "memory" ? c.journal.memory : c.journal.mark,
        variant: "metadata",
      },
    ];
  }, [chips, entryType, meta.pathLabel, meta.statusLabel, status, c.journal.mark, c.journal.memory]);

  const resolvedOwnerId = ownerId ?? `${entryType}-${title}-${meta.pathId ?? "entry"}`;
  const accessibilityLabel = [meta.statusLabel, meta.pathLabel, title].filter(Boolean).join(", ");
  const showsCompactMediaPreview = compactDensity && entryType === "memory" && mediaItems.length > 0;

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    console.debug(
      `[HorizontalJournalEntryCard] backgroundPaintImage owner=${resolvedOwnerId} pathId=${resolvedPathId ?? "unknown"} hasBackgroundPaintImage=${Boolean(backgroundPaintImage)}`
    );
  }, [backgroundPaintImage, resolvedOwnerId, resolvedPathId]);

  if (loading) {
    return (
      <JournalCard
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="summary"
        contentStyle={[styles.cardContent, compactDensity ? styles.cardContentCompact : null]}
        debugLabel={debugLabel ? `${debugLabel}.JournalCard` : undefined}
        debugLines={debugLines}
        loading
        style={styles.cardSurface}
        variant="standard"
      >
        <View style={styles.loadingCard}>
          <View style={styles.loadingTextStack}>
            <View style={[styles.skeletonLine, styles.skeletonTitle]} />
            <View style={[styles.skeletonLine, styles.skeletonBody]} />
            <View style={[styles.skeletonLine, styles.skeletonMeta]} />
          </View>
        </View>
      </JournalCard>
    );
  }

  const cardNode = (
    <JournalCard
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={actionable ? "button" : "summary"}
      actionable={actionable}
      backgroundPaintImage={backgroundPaintImage}
      backgroundPaintInfo={backgroundPaintInfo}
      layoutGuardInfo={{
        cardType: "HorizontalJournalEntryCard",
        sourceId: sourceId ?? resolvedOwnerId,
        sourceType: sourceType ?? entryType,
        pathId: resolvedPathId,
        title,
      }}
      contentStyle={[
        styles.cardContent,
        compactDensity ? styles.cardContentCompact : null,
        compactDensity ? styles.cardContentOverlay : null,
        compactDensity ? compactContentStyle : null,
      ]}
      disabled={!actionable && readonly}
      onPress={actionable ? onPress : undefined}
      overlayLayer={({ pressed }) => (
        <Fragment>
          {compactDensity ? (
            <View
              pointerEvents="none"
              style={[
                styles.compactOverlayRoot,
                __DEV__ && DEBUG_LAYOUT_CARD_STACK ? styles.compactOverlayRootDebug : null,
              ]}
            >
              <View
                style={[
                  styles.copyShell,
                  styles.copyShellCompact,
                  entryType === "memory" ? styles.copyShellCompactMemory : styles.copyShellCompactMark,
                  __DEV__ && DEBUG_LAYOUT_CARD_STACK ? styles.copyShellCompactDebug : null,
                  compactCopyShellStyle,
                ]}
              >
                  <View style={[styles.copy, styles.copyCompact, compactCopyStyle]}>
                    {showsCompactMediaPreview ? (
                      <View style={styles.compactMediaRow}>
                        <View style={styles.compactMediaPreview}>
                          <MediaCollagePreview
                            items={mediaItems}
                            locale={locale}
                            onPressMedia={(index) => {
                              setViewerIndex(index);
                              setViewerOpen(true);
                            }}
                            titleForAccessibility={title}
                          />
                        </View>
                        <View style={[styles.textStack, styles.textStackCompact, styles.textStackCompactWithMedia, compactTextStackStyle]}>
                          <DebugLayerBox label={debugLabel ? `${debugLabel}.TitleText` : "HorizontalJournalEntryCard.TitleText"} tone="blue">
                            <WMText
                              numberOfLines={titleNumberOfLines ?? 2}
                              style={[
                                styles.title,
                                styles.titleCompact,
                                compactTitleStyle,
                                compactMobile && !compactDensity ? styles.titleNarrow : null,
                              ]}
                              variant={compactTitleVariant}
                            >
                              {title}
                            </WMText>
                          </DebugLayerBox>

                          {showDetailText && (body ?? entityLine) ? (
                            <DebugLayerBox label={debugLabel ? `${debugLabel}.MetaText` : "HorizontalJournalEntryCard.MetaText"} tone="blue">
                              <WMText
                                numberOfLines={bodyNumberOfLines ?? 2}
                                style={[
                                  styles.body,
                                  styles.bodyCompact,
                                  compactBodyStyle,
                                  compactMobile && !compactDensity ? styles.bodyNarrow : null,
                                ]}
                                variant="bodySm"
                              >
                                {body ?? entityLine}
                              </WMText>
                            </DebugLayerBox>
                          ) : null}
                        </View>
                      </View>
                    ) : (
                      <View style={[styles.textStack, styles.textStackCompact, compactTextStackStyle]}>
                        <DebugLayerBox label={debugLabel ? `${debugLabel}.TitleText` : "HorizontalJournalEntryCard.TitleText"} tone="blue">
                          <WMText
                            numberOfLines={titleNumberOfLines ?? 2}
                            style={[
                              styles.title,
                              styles.titleCompact,
                              compactTitleStyle,
                              compactMobile && !compactDensity ? styles.titleNarrow : null,
                            ]}
                            variant={compactTitleVariant}
                          >
                            {title}
                          </WMText>
                        </DebugLayerBox>

                        {showDetailText && (body ?? entityLine) ? (
                          <DebugLayerBox label={debugLabel ? `${debugLabel}.MetaText` : "HorizontalJournalEntryCard.MetaText"} tone="blue">
                            <WMText
                              numberOfLines={bodyNumberOfLines ?? 2}
                              style={[
                                styles.body,
                                styles.bodyCompact,
                                compactBodyStyle,
                                compactMobile && !compactDensity ? styles.bodyNarrow : null,
                              ]}
                              variant="bodySm"
                            >
                              {body ?? entityLine}
                            </WMText>
                          </DebugLayerBox>
                        ) : null}
                      </View>
                    )}

                  {metaChips.length > 0 ? (
                    <View style={[styles.metaRow, styles.metaRowCompact]}>
                      {metaChips.map((chip) => (
                        <EntityChip
                          key={chip.id ?? chip.label}
                          label={chip.label}
                          iconSemanticName={chip.iconName ? getChipIcon(chip.iconName) : undefined}
                          stateTone={chip.stateTone}
                          textStyle={styles.chipTextCompact}
                          variant={chip.variant ?? (chip.stateTone || chip.iconName ? "status" : "metadata")}
                          size="compact"
                          style={[styles.chip, styles.chipCompact]}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
                {entryType === "memory" ? <MemoryBookmarkMarker /> : null}
              </View>
            </View>
          ) : null}
          {compactDensity && resolvedCompactVellumMode === "root" ? (
            <View pointerEvents="none" style={[styles.rootVellum, compactRootVellumStyle]} />
          ) : null}
          <HorizontalCardSurfaceOverlay pressed={pressed} />
        </Fragment>
      )}
      preserveSurfaceColorOnPress
      style={[
        styles.cardSurface,
        compactDensity ? styles.cardSurfaceCompact : null,
        compactMobile ? styles.cardSurfaceNarrow : null,
        style,
      ]}
      variant={compactDensity ? "compact" : "standard"}
      debugLabel={debugLabel ? `${debugLabel}.JournalCard` : undefined}
      debugLines={debugLines}
      >
      <DebugLayerBox label={debugLabel ? `${debugLabel}.CardShell` : "HorizontalJournalEntryCard.CardShell"} lines={debugLines} tone="amber">
        <View style={[styles.cardFrame, compactDensity ? styles.cardFrameCompact : null]}>
          {!compactDensity && entryType === "memory" ? <MemoryBookmarkMarker /> : null}
          {!compactDensity && trailing ? (
            <DebugLayerBox label={debugLabel ? `${debugLabel}.ActionArea` : "HorizontalJournalEntryCard.ActionArea"} tone="purple">
              <View style={styles.trailing}>{trailing}</View>
            </DebugLayerBox>
          ) : null}
          {!compactDensity ? (
            <DebugLayerBox
            label={debugLabel ? `${debugLabel}.PrimaryContent` : "HorizontalJournalEntryCard.PrimaryContent"}
            lines={[`pathId=${pathId ?? "unknown"}`]}
            tone="green"
            >
            <View
              style={[
                styles.copyShell,
                compactDensity ? styles.copyShellCompact : null,
                compactDensity ? compactCopyShellStyle : null,
              ]}
            >
              {compactDensity && !(resolvedCompactVellumMode === "root") ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.textBoundVellumCompact,
                    compactVellumStyle,
                  ]}
                />
              ) : !compactDensity && !(resolvedCompactVellumMode === "root") ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.textBoundVellum,
                    compactDensity ? styles.textBoundVellumCompact : null,
                    compactDensity ? compactVellumStyle : null,
                  ]}
                />
              ) : null}
              <View style={[styles.copy, compactDensity ? styles.copyCompact : null, compactDensity ? compactCopyStyle : null]}>
                <View style={[styles.textStack, compactDensity ? styles.textStackCompact : null, compactDensity ? compactTextStackStyle : null]}>
                  <DebugLayerBox label={debugLabel ? `${debugLabel}.TitleText` : "HorizontalJournalEntryCard.TitleText"} tone="blue">
              <WMText
                numberOfLines={titleNumberOfLines ?? 2}
                style={[
                  styles.title,
                  compactDensity ? styles.titleCompact : null,
                  compactDensity ? compactTitleStyle : null,
                  compactMobile && !compactDensity ? styles.titleNarrow : null,
                ]}
                variant={compactDensity ? compactTitleVariant : "cardTitle"}
              >
                {title}
              </WMText>
                  </DebugLayerBox>

              {showDetailText && (body ?? entityLine) ? (
                    <DebugLayerBox label={debugLabel ? `${debugLabel}.MetaText` : "HorizontalJournalEntryCard.MetaText"} tone="blue">
                <WMText
                  numberOfLines={bodyNumberOfLines ?? 2}
                  style={[
                    styles.body,
                    compactDensity ? styles.bodyCompact : null,
                    compactDensity ? compactBodyStyle : null,
                    compactMobile && !compactDensity ? styles.bodyNarrow : null,
                  ]}
                  variant={compactDensity ? "bodySm" : "body"}
                >
                  {body ?? entityLine}
                </WMText>
                    </DebugLayerBox>
              ) : null}
            </View>

            {metaChips.length > 0 ? (
              <View style={[styles.metaRow, compactDensity ? styles.metaRowCompact : null]}>
                {metaChips.map((chip) => (
                  <EntityChip
                    key={chip.id ?? chip.label}
                    label={chip.label}
                    iconSemanticName={chip.iconName ? getChipIcon(chip.iconName) : undefined}
                    stateTone={chip.stateTone}
                    textStyle={compactDensity ? styles.chipTextCompact : undefined}
                    variant={chip.variant ?? (chip.stateTone || chip.iconName ? "status" : "metadata")}
                    size="compact"
                    style={[styles.chip, compactDensity ? styles.chipCompact : null]}
                  />
                ))}
              </View>
            ) : null}
          </View>
            </View>
            </DebugLayerBox>
          ) : null}
        </View>
      </DebugLayerBox>
    </JournalCard>
  );

  if (DEBUG_LAYOUT_CARD_STACK && debugLabel) {
    return (
      <DebugLayerBox itemCount={metaChips.length} label={debugLabel} lines={debugLines} tone="red">
        <>
          {cardNode}
          <MediaViewerModal
            initialIndex={viewerIndex}
            items={mediaItems}
            locale={locale}
            onClose={() => setViewerOpen(false)}
            open={viewerOpen}
          />
        </>
      </DebugLayerBox>
    );
  }

  return (
    <>
      {cardNode}
      <MediaViewerModal
        initialIndex={viewerIndex}
        items={mediaItems}
        locale={locale}
        onClose={() => setViewerOpen(false)}
        open={viewerOpen}
      />
    </>
  );
}

function HorizontalCardSurfaceOverlay({ pressed }: { pressed: boolean }) {
  if (!pressed) {
    return null;
  }

  return <View style={styles.pressedOverlay} />;
}

function MemoryBookmarkMarker() {
  return (
    <View accessible={false} pointerEvents="none" style={styles.memoryBookmarkWrap}>
      <WaymarkImage
        assetId="08_botanical_motif_library.ribbon_bookmark_motif"
        alt=""
        decorative
        imageStyle={styles.memoryBookmarkImage}
        objectFit="contain"
        style={styles.memoryBookmarkFrame}
        usage="botanical"
      />
    </View>
  );
}

function getCompactMeta({
  c,
  chips,
  entryType,
  entityLine,
  pathColorToken,
  pathId,
  pathLabel,
  status,
}: {
  c: ReturnType<typeof getCopy>;
  chips: Chip[];
  entryType: Props["entryType"];
  entityLine?: string;
  pathColorToken?: string;
  pathId?: PathId;
  pathLabel?: string;
  status: Props["status"];
}) {
  const statusLabel = getStatusLabel(c, entryType, status);
  const nonStatusChip = chips.find((chip) => !isStatusChip(chip));
  const resolvedPathLabel = pathLabel ?? nonStatusChip?.label ?? entityLine;
  const resolvedPathId = pathId ?? resolvePathIdFromHint(resolvedPathLabel);
  const hero = resolvedPathId ? getPathHeroImage(resolvedPathId) : resolvePathHeroFromHint(resolvedPathLabel);
  const resolvedPathVisual = getPathVisualTokens(resolvedPathId ?? hero?.pathId, pathColorToken ?? nonStatusChip?.colorToken ?? hero?.accentColor);
  const metaSegments = [statusLabel, resolvedPathLabel].filter(Boolean);

  return {
    statusLabel,
    pathId: hero?.pathId ?? resolvedPathId,
    pathLabel: resolvedPathLabel,
    pathVisual: resolvedPathVisual,
    heroAssetId: hero?.assetId,
    metaText: metaSegments.join(" · ") || (entryType === "memory" ? c.journal.memory : c.journal.mark),
  };
}

function isStatusChip(chip: Chip) {
  return chip.iconName === "done" || chip.iconName === "warning" || chip.iconName === "calendar" || chip.iconName === "clock";
}

function getChipIcon(iconName: NonNullable<Chip["iconName"]>): WaymarkSemanticIconName {
  switch (iconName) {
    case "calendar":
      return "utility.calendar";
    case "clock":
      return "utility.clock";
    case "done":
      return "status.done";
    case "warning":
      return "status.weak";
    case "target":
      return "entity.mark";
    case "sparkles":
      return "status.planned";
    case "heart":
    default:
      return "entity.memory";
  }
}

function getStatusLabel(c: ReturnType<typeof getCopy>, entryType: Props["entryType"], status: Props["status"]) {
  if (status === "done") {
    return c.journal.done;
  }
  if (status === "planned") {
    return c.journal.planned;
  }
  if (status === "warning") {
    return c.journal.needsRepair;
  }
  if (status === "missed") {
    return c.journal.missed;
  }
  if (entryType === "memory") {
    return c.journal.memory;
  }
  return c.journal.mark;
}

function getStatusStateTone(status: Props["status"]) {
  if (status === "done") {
    return "done";
  }
  if (status === "planned") {
    return "planned";
  }
  if (status === "warning") {
    return "weak";
  }
  if (status === "missed") {
    return "missed";
  }
  return undefined;
}

const styles = StyleSheet.create({
  cardSurface: {
    minHeight: 102,
  },
  cardSurfaceCompact: {
    minHeight: 124,
    maxHeight: 140,
  },
  cardSurfaceNarrow: {
    minHeight: 124,
  },
  cardContent: {
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  cardContentCompact: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardContentOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  compactOverlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  compactOverlayRootDebug: {
    borderColor: "blue",
    borderWidth: 1,
  },
  cardFrame: {
    flex: 1,
    justifyContent: "flex-start",
    minHeight: 0,
    minWidth: 0,
    position: "relative",
  },
  pressedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: foundationColors.bg.paperWarm,
    opacity: 0.14,
  },
  copyShell: {
    justifyContent: "flex-start",
    minWidth: 0,
    paddingLeft: 22,
    paddingRight: 24,
    position: "relative",
    zIndex: 2,
  },
  copyShellCompact: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    minHeight: 104,
    backgroundColor: "rgba(255, 252, 243, 0.92)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: vellumOverlayTokens.color.border,
    overflow: "hidden",
    paddingTop: COMPACT_VELLUM_PADDING_Y,
    paddingBottom: COMPACT_VELLUM_PADDING_Y,
    paddingLeft: COMPACT_VELLUM_PADDING_X,
    paddingRight: 36,
    zIndex: 2,
  },
  copyShellCompactMemory: {
    paddingRight: 36,
  },
  copyShellCompactMark: {
    paddingRight: 4,
  },
  copyShellCompactDebug: {
    borderColor: "red",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaRowCompact: {
    marginTop: "auto",
  },
  textBoundVellum: {
    backgroundColor: foundationColors.bg.paperWarm,
    borderRadius: 18,
    bottom: -4,
    left: -4,
    opacity: 0.75,
    position: "absolute",
    right: -2,
    top: -4,
    zIndex: 0,
  },
  textBoundVellumCompact: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderRadius: 18,
    zIndex: 0,
  },
  textBoundVellumCompactDebug: {
    backgroundColor: "transparent",
  },
  rootVellum: {
    backgroundColor: "rgba(255, 252, 243, 0.92)",
    borderRadius: 22,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 0,
  },
  cardFrameCompact: {
    justifyContent: "flex-end",
  },
  memoryBookmarkWrap: {
    alignItems: "stretch",
    height: 65,
    justifyContent: "flex-start",
    position: "absolute",
    right: 10,
    top: -6,
    width: 42,
    zIndex: 4,
  },
  memoryBookmarkFrame: {
    backgroundColor: "transparent",
    height: 65,
    opacity: 0.9,
    width: 42,
  },
  memoryBookmarkImage: {
    ...StyleSheet.absoluteFillObject,
  },
  copy: {
    minWidth: 0,
    position: "relative",
    zIndex: 2,
  },
  copyCompact: {
    alignItems: "stretch",
    alignSelf: "stretch",
    flex: 1,
    gap: 8,
    justifyContent: "flex-start",
    width: "100%",
  },
  textStack: {
    gap: 3,
    minWidth: 0,
  },
  textStackCompact: {
    alignSelf: "stretch",
    gap: 8,
    width: "100%",
  },
  textStackCompactWithMedia: {
    flex: 1,
  },
  compactMediaRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.sm,
  },
  compactMediaPreview: {
    flexShrink: 0,
    width: 78,
  },
  chipScroller: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    marginTop: 4,
  },
  chipScrollerCompact: {
    marginTop: spacing.md,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 28,
    paddingRight: 10,
  },
  chipRowCompact: {
    minHeight: 32,
    paddingRight: 0,
  },
  chip: {
    marginRight: 8,
  },
  chipCompact: {
    marginRight: 6,
  },
  title: {
    color: foundationColors.ink.primary,
    flexShrink: 1,
    fontSize: 23,
    letterSpacing: -0.28,
    lineHeight: 27,
    width: "100%",
  },
  titleCompact: {
    ...todayCarouselCard.titleText,
  },
  titleNarrow: {
    fontSize: 23,
    lineHeight: 27,
  },
  body: {
    color: foundationColors.ink.secondary,
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 19,
    width: "100%",
  },
  bodyCompact: {
    ...todayCarouselCard.bodyText,
    alignSelf: "stretch",
    width: "100%",
  },
  chipTextCompact: {
    ...todayCarouselCard.metadataText,
  },
  bodyNarrow: {
    fontSize: 15,
    lineHeight: 19,
  },
  trailing: {
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 4,
  },
  meta: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
    width: "100%",
  },
  metaNarrow: {
    fontSize: 14,
    lineHeight: 18,
  },
  loadingCard: {
    justifyContent: "center",
    minHeight: 76,
    position: "relative",
  },
  loadingTextStack: {
    gap: 7,
    minWidth: 0,
    paddingLeft: 22,
    paddingRight: 24,
  },
  skeletonLine: {
    backgroundColor: foundationColors.bg.paperSoft,
    borderRadius: 999,
  },
  skeletonTitle: {
    height: 22,
    width: "68%",
  },
  skeletonBody: {
    height: 15,
    width: "84%",
  },
  skeletonMeta: {
    height: 13,
    width: "46%",
  },
});
