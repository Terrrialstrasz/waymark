import { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMText } from "../primitives/Text";
import { Locale, PathId } from "../../types/ui";
import {
  foundationColors,
  semanticElevation,
  semanticRadius,
  spacing,
  typography,
  useReducedMotionEnabled,
  vellumOverlayTokens,
} from "../../theme/tokens";
import {
  TodayPathHeroPath,
  WAYMARK_PATH_COLORS,
  getTodayPathHeroPath,
  getTodayPathHeroTextColorKey,
  todayPathHeroCopy,
} from "../../lib/waymark/todayPathHero";
import { getBorderStyle } from "../../design-system/utils/get-border-style";

type Props = {
  selectedPathId: PathId;
  paths: TodayPathHeroPath[];
  locale: Locale;
  onPathChange: (pathId: PathId) => void;
  onOpenPathDetail?: (pathId: PathId) => void;
  isPathDetailEnabled?: boolean;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function TodayPathHero({
  selectedPathId,
  paths,
  locale,
  onPathChange,
  onOpenPathDetail,
  isPathDetailEnabled = false,
  isLoading = false,
  style,
}: Props) {
  const reducedMotion = useReducedMotionEnabled();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [titleBoundsWidth, setTitleBoundsWidth] = useState(0);
  const [fullLabelWidth, setFullLabelWidth] = useState(0);
  const path = useMemo(() => getTodayPathHeroPath(selectedPathId, paths), [paths, selectedPathId]);
  const copy = todayPathHeroCopy[locale] ?? todayPathHeroCopy.en;
  const interactiveHero = Boolean(isPathDetailEnabled && onOpenPathDetail);
  const accessibilitySummary = `${copy.anchorLabel}: ${path.label[locale]}. ${path.subtitle[locale].replace(/\n/gu, " ")}`;
  const textColorSet = WAYMARK_PATH_COLORS[getTodayPathHeroTextColorKey(path.id)];
  const resolvedTitleLabel =
    titleBoundsWidth > 0 && fullLabelWidth > titleBoundsWidth ? path.compactLabel[locale] : path.label[locale];

  if (isLoading) {
    return <TodayPathHeroSkeleton style={style} />;
  }

  const CardRoot = interactiveHero ? Pressable : View;

  return (
    <>
      <CardRoot
        accessibilityLabel={accessibilitySummary}
        accessibilityRole={interactiveHero ? "button" : undefined}
        onPress={interactiveHero ? () => onOpenPathDetail?.(path.id) : undefined}
        style={[
          styles.card,
          {
            borderColor: path.color.accentMuted,
          },
          style,
        ]}
      >
        {path.heroAssetId ? (
          <View style={styles.heroMedia}>
            <WaymarkImage
              alt={path.heroAlt[locale]}
              assetId={path.heroAssetId}
              decorative
              imageStyle={styles.heroImage}
              priority
              style={styles.heroImageFill}
              usage="hero"
            />
            <View style={styles.heroWash} />
            <BookmarkRibbon />
            <HeroOverlay
              locale={locale}
              path={path}
              reducedMotion={reducedMotion}
              resolvedTitleLabel={resolvedTitleLabel}
              selectLabel={copy.selectLabel}
              textColorSet={textColorSet}
              onMeasureFullLabel={setFullLabelWidth}
              onMeasureTitleBounds={setTitleBoundsWidth}
              onOpenSelector={() => setSelectorOpen(true)}
            />
          </View>
        ) : (
          <MissingHeroArtwork
            accent={path.color.accent}
            accentMuted={path.color.accentMuted}
            accentSoft={path.color.accentSoft}
            heroText={path.color.heroText}
            locale={locale}
            path={path}
            reducedMotion={reducedMotion}
            resolvedTitleLabel={resolvedTitleLabel}
            selectLabel={copy.selectLabel}
            textColorSet={textColorSet}
            onMeasureFullLabel={setFullLabelWidth}
            onMeasureTitleBounds={setTitleBoundsWidth}
            onOpenSelector={() => setSelectorOpen(true)}
          />
        )}
      </CardRoot>

      <PathSelectorModal
        locale={locale}
        paths={paths}
        selectedPathId={selectedPathId}
        visible={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onPathChange={(pathId) => {
          onPathChange(pathId);
          setSelectorOpen(false);
        }}
      />
    </>
  );
}

function HeroOverlay({
  path,
  locale,
  resolvedTitleLabel,
  selectLabel,
  textColorSet,
  onMeasureFullLabel,
  onMeasureTitleBounds,
  onOpenSelector,
  reducedMotion,
}: {
  path: TodayPathHeroPath;
  locale: Locale;
  resolvedTitleLabel: string;
  selectLabel: string;
  textColorSet: (typeof WAYMARK_PATH_COLORS)[keyof typeof WAYMARK_PATH_COLORS];
  onMeasureFullLabel: (width: number) => void;
  onMeasureTitleBounds: (width: number) => void;
  onOpenSelector: () => void;
  reducedMotion: boolean;
}) {
  const titleSize = path.titleFontSize;

  return (
    <View style={styles.overlay}>
      <AnchorLabel labelColor={textColorSet.labelText} locale={locale} />

      <View pointerEvents="none" style={styles.hiddenMeasureWrap}>
        <Text
          numberOfLines={1}
          onLayout={(event: LayoutChangeEvent) => onMeasureFullLabel(event.nativeEvent.layout.width)}
          style={[
            styles.titleMeasure,
            {
              fontSize: titleSize,
              lineHeight: titleSize + 4,
            },
          ]}
        >
          {path.label[locale]}
        </Text>
      </View>

      <Pressable
        accessibilityHint={path.label[locale]}
        accessibilityLabel={`${selectLabel}: ${path.label[locale]}`}
        accessibilityRole="button"
        onPress={onOpenSelector}
        onLayout={(event: LayoutChangeEvent) => {
          onMeasureTitleBounds(Math.max(event.nativeEvent.layout.width - 44, 0));
        }}
        style={({ pressed }) => [
          styles.titleSelector,
          !reducedMotion && pressed ? styles.titleSelectorPressed : null,
        ]}
      >
        <WMText
          numberOfLines={1}
          style={[
            styles.title,
            {
              color: textColorSet.titleText,
              fontSize: titleSize,
              lineHeight: titleSize + 4,
            },
          ]}
        >
          {resolvedTitleLabel}
        </WMText>
        <View
          style={[
            styles.chevronCircle,
            {
              borderColor: "rgba(255,255,255,0.34)",
            },
          ]}
        >
          <WMText style={[styles.chevronGlyph, { color: textColorSet.chevronText }]}>{`\u203A`}</WMText>
        </View>
      </Pressable>

      <DecorativeRule accent={path.color.accent} accentMuted={path.color.accentMuted} />
      <SubtitleBlock inkColor={textColorSet.subtitleInk} subtitle={path.subtitle[locale]} />
    </View>
  );
}

function MissingHeroArtwork(props: {
  path: TodayPathHeroPath;
  locale: Locale;
  resolvedTitleLabel: string;
  selectLabel: string;
  textColorSet: (typeof WAYMARK_PATH_COLORS)[keyof typeof WAYMARK_PATH_COLORS];
  onMeasureFullLabel: (width: number) => void;
  onMeasureTitleBounds: (width: number) => void;
  onOpenSelector: () => void;
  reducedMotion: boolean;
  accent: string;
  accentMuted: string;
  accentSoft: string;
  heroText: string;
}) {
  const { accent, accentMuted, accentSoft } = props;

  return (
    <View style={styles.heroMedia}>
      <Svg height="100%" style={StyleSheet.absoluteFillObject} width="100%">
        <Defs>
          <LinearGradient id="todayPathHeroFallback" x1="0%" x2="100%" y1="0%" y2="100%">
            <Stop offset="0%" stopColor={accentSoft} />
            <Stop offset="58%" stopColor={accentMuted} />
            <Stop offset="100%" stopColor={accent} stopOpacity={0.82} />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#todayPathHeroFallback)" height="100%" rx={semanticRadius.card.hero} ry={semanticRadius.card.hero} width="100%" />
      </Svg>
      <View pointerEvents="none" style={styles.fallbackMotif}>
        <WaymarkIcon decorative semanticName="botanical.pressedLeaf" size="xl" state="muted" />
      </View>
      <HeroOverlay {...props} />
    </View>
  );
}

function AnchorLabel({
  labelColor,
  locale,
}: {
  labelColor: string;
  locale: Locale;
}) {
  return (
    <View style={styles.anchorRow}>
      <View style={styles.anchorDot} />
      <WMText style={[styles.anchorText, { color: labelColor }]}>{todayPathHeroCopy[locale].anchorLabel}</WMText>
    </View>
  );
}

function DecorativeRule({
}: {
  accent: string;
  accentMuted: string;
}) {
  return (
    <View style={styles.ruleRow}>
      <WMText style={styles.ruleStar}>{`\u2726`}</WMText>
      <View style={styles.ruleLine} />
    </View>
  );
}

function SubtitleBlock({
  subtitle,
  inkColor,
}: {
  subtitle: string;
  inkColor: string;
}) {
  const subtitleText = subtitle.replace(/\n+/gu, " ");

  return (
    <View style={styles.subtitleWrap}>
      <View style={styles.subtitleVellum}>
        <WMText style={[styles.subtitle, { color: inkColor }]}>{subtitleText}</WMText>
      </View>
    </View>
  );
}

function BookmarkRibbon() {
  return (
    <View accessible={false} pointerEvents="none" style={styles.ribbonWrap}>
      <WaymarkImage
        alt=""
        assetId="08_botanical_motif_library.header_leaf_mark_motif"
        decorative
        imageStyle={styles.ribbonImage}
        objectFit="contain"
        style={styles.ribbonImageFrame}
        usage="botanical"
      />
    </View>
  );
}

function PathSelectorModal({
  visible,
  paths,
  selectedPathId,
  locale,
  onClose,
  onPathChange,
}: {
  visible: boolean;
  paths: TodayPathHeroPath[];
  selectedPathId: PathId;
  locale: Locale;
  onClose: () => void;
  onPathChange: (pathId: PathId) => void;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalCard}>
          <WMText style={styles.modalTitle} variant="sheetTitle">
            {todayPathHeroCopy[locale].selectLabel}
          </WMText>
          <ScrollView contentContainerStyle={styles.modalList}>
            {paths.map((path) => {
              const selected = path.id === selectedPathId;

              return (
                <Pressable
                  key={path.id}
                  accessibilityRole="button"
                  onPress={() => onPathChange(path.id)}
                  style={[
                    styles.optionRow,
                    {
                      borderColor: selected ? path.color.accentMuted : foundationColors.border.subtle,
                      backgroundColor: selected ? path.color.accentSoft : foundationColors.bg.paper,
                    },
                  ]}
                >
                  <View style={[styles.optionSwatch, { backgroundColor: path.color.accent }]} />
                  <View style={styles.optionCopy}>
                    <WMText numberOfLines={1} style={[styles.optionTitle, { color: path.color.accentDeep }]}>
                      {path.label[locale]}
                    </WMText>
                    <WMText numberOfLines={2} style={styles.optionSubtitle} variant="bodySm">
                      {path.subtitle[locale].replace(/\n/gu, " ")}
                    </WMText>
                  </View>
                  <View style={styles.optionIcon}>
                    <WaymarkIcon decorative semanticName={`pathIdentity.${path.icon}`} size="sm" state="default" />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function TodayPathHeroSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, styles.skeletonCard, style]}>
      <View style={styles.skeletonOverlay}>
        <View style={styles.skeletonLabel} />
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonRule} />
        <View style={styles.skeletonSubtitleLong} />
        <View style={styles.skeletonSubtitleShort} />
      </View>
      <View style={styles.skeletonRibbon} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    minHeight: 232,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    boxShadow: semanticElevation.hero,
    backgroundColor: foundationColors.bg.paper,
  },
  heroMedia: {
    flex: 1,
    position: "relative",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  heroImageFill: {
    ...StyleSheet.absoluteFillObject,
  },
  heroWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 248, 236, 0.18)",
    zIndex: 1,
  },
  overlay: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    gap: 10,
    backgroundColor: vellumOverlayTokens.color.surfaceStrong,
    borderRadius: semanticRadius.card.compact,
    borderColor: vellumOverlayTokens.color.border,
    borderWidth: 1,
    minWidth: 0,
    paddingLeft: spacing.sm,
    paddingRight: 72,
    paddingVertical: spacing.sm,
    boxShadow: vellumOverlayTokens.shadow.none,
    zIndex: 3,
  },
  hiddenMeasureWrap: {
    position: "absolute",
    opacity: 0,
    left: -9999,
    top: -9999,
  },
  titleMeasure: {
    ...typography.display,
    includeFontPadding: false,
  },
  anchorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 3,
  },
  anchorDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: foundationColors.bg.paper,
  },
  anchorText: {
    ...typography.meta,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    textShadowColor: "rgba(255,250,239,0.88)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  titleSelector: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: "100%",
    alignSelf: "flex-start",
    zIndex: 3,
  },
  titleSelectorPressed: {
    opacity: 0.88,
  },
  title: {
    ...typography.display,
    flexShrink: 1,
    maxWidth: "100%",
    includeFontPadding: false,
    textAlign: "left",
    textShadowColor: "rgba(255,250,239,0.88)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.30)",
    borderWidth: 1,
    flexShrink: 0,
  },
  chevronGlyph: {
    fontSize: 20,
    lineHeight: 20,
    transform: [{ rotate: "90deg" }],
    textShadowColor: "rgba(255,250,239,0.88)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 3,
  },
  ruleStar: {
    fontSize: 12,
    lineHeight: 14,
    color: foundationColors.bg.paper,
    textShadowColor: "rgba(255,250,239,0.88)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  ruleLine: {
    height: 1,
    width: 72,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.48)",
  },
  subtitle: {
    ...typography.sectionTitle,
    fontStyle: "italic",
    fontSize: 16,
    lineHeight: 18,
    textAlign: "left",
    includeFontPadding: false,
    textShadowColor: "rgba(255,255,255,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleWrap: {
    maxWidth: "100%",
    alignItems: "flex-start",
    marginTop: "auto",
    zIndex: 3,
  },
  subtitleVellum: {
    alignSelf: "flex-start",
    backgroundColor: vellumOverlayTokens.color.surfaceSoft,
    borderColor: vellumOverlayTokens.color.borderSoft,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ribbonWrap: {
    position: "absolute",
    top: -6,
    right: 10,
    width: 54,
    height: 84,
    alignItems: "center",
    zIndex: 4,
  },
  ribbonImageFrame: {
    width: 54,
    height: 84,
    backgroundColor: "transparent",
  },
  ribbonImage: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent",
  },
  fallbackMotif: {
    position: "absolute",
    right: -12,
    bottom: -6,
    opacity: 0.22,
    zIndex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(43, 42, 34, 0.24)",
  },
  modalCard: {
    maxHeight: "70%",
    borderTopLeftRadius: semanticRadius.sheet,
    borderTopRightRadius: semanticRadius.sheet,
    backgroundColor: foundationColors.bg.paper,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    boxShadow: semanticElevation.sheet,
  },
  modalTitle: {
    color: foundationColors.ink.secondary,
  },
  modalList: {
    gap: spacing.sm,
  },
  optionRow: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: semanticRadius.card.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  optionSwatch: {
    width: 10,
    height: 40,
    borderRadius: 999,
    flexShrink: 0,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  optionTitle: {
    ...typography.sectionTitle,
  },
  optionSubtitle: {
    color: foundationColors.ink.secondary,
  },
  optionIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonCard: {
    backgroundColor: foundationColors.bg.paperWarm,
    borderColor: foundationColors.border.subtle,
  },
  skeletonOverlay: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: spacing.sm,
  },
  skeletonLabel: {
    width: 138,
    height: 12,
    borderRadius: 999,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonTitle: {
    width: "72%",
    height: 38,
    borderRadius: semanticRadius.row.default,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonRule: {
    width: 92,
    height: 12,
    borderRadius: 999,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonSubtitleLong: {
    width: "78%",
    height: 18,
    borderRadius: semanticRadius.row.default,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonSubtitleShort: {
    width: "62%",
    height: 18,
    borderRadius: semanticRadius.row.default,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonRibbon: {
    position: "absolute",
    top: -4,
    right: 18,
    width: 48,
    height: 76,
    borderRadius: 14,
    backgroundColor: foundationColors.bg.paperSoft,
  },
});
