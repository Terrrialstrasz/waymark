import { Pressable, StyleSheet, View } from "react-native";
import { CurrentExpeditionItem } from "../today/__fixtures__/todayExpedition.fixtures";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMText } from "../primitives/Text";
import { foundationColors, semanticRadius, spacing, vellumOverlayTokens } from "../../theme/tokens";
import { Locale, PathId } from "../../types/ui";
import { getTodayPathHeroPath, todayPathHeroPaths } from "../../lib/waymark/todayPathHero";
import { MARK_CARD_WIDTH } from "../marks/MarkCard";
import { todayCarouselCard } from "../today/todayCarouselCardTokens";

type Props = {
  expedition: CurrentExpeditionItem;
  locale: Locale;
  onPress?: (expedition: CurrentExpeditionItem) => void;
  isDetailEnabled?: boolean;
  cardWidth?: number;
};

const pathIds = new Set<PathId>(todayPathHeroPaths.map((path) => path.id));
const CURRENT_EXPEDITION_CARD_HEIGHT = todayCarouselCard.height + 8;

export function CurrentExpeditionCard({
  expedition,
  locale,
  onPress,
  isDetailEnabled = expedition.detailEnabled ?? false,
  cardWidth,
}: Props) {
  if (expedition.loading) {
    return <CurrentExpeditionCardSkeleton cardWidth={cardWidth ?? MARK_CARD_WIDTH} />;
  }

  const path = getTodayPathHeroPath(resolvePathId(expedition.pathId));
  const title = expedition.title[locale];
  const milestoneLabel = simplifyMetaLabel(expedition.milestoneLabel?.[locale], locale, "milestone");
  const deadlineLabel = simplifyMetaLabel(expedition.deadlineLabel?.[locale], locale, "deadline");
  const width = cardWidth ?? MARK_CARD_WIDTH;

  const content = (
    <View style={[styles.card, { width, borderColor: path.color.accentMuted, backgroundColor: foundationColors.bg.paper }]}>
      {path.heroAssetId ? (
        <WaymarkImage
          alt=""
          assetId={path.heroAssetId}
          decorative
          imageStyle={styles.heroImage}
          style={styles.heroFill}
          usage="compactCardBackground"
        />
      ) : null}
      <View style={[styles.imageWash, { backgroundColor: path.color.heroPatch }]} />
      <View style={[styles.sideStripe, { backgroundColor: path.color.accent }]} />

      <View style={styles.copyShell}>
        <View style={styles.vellum}>
          <View style={styles.copyGroup}>
            <WMText numberOfLines={2} style={[styles.title, { color: path.color.accentDeep }]} variant="pageTitle">
              {title}
            </WMText>
            {milestoneLabel ? (
              <WMText numberOfLines={2} style={styles.body} variant="bodySm">
                {milestoneLabel}
              </WMText>
            ) : null}
          </View>
          <View style={styles.metaRow}>
            {deadlineLabel ? (
              <WMText numberOfLines={1} style={[styles.meta, { color: path.color.accentDeep }]} variant="metaCompact">
                {deadlineLabel}
              </WMText>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );

  if (!isDetailEnabled || !onPress) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(expedition)} style={styles.pressable}>
      {content}
    </Pressable>
  );
}

function resolvePathId(value: PathId) {
  return pathIds.has(value) ? value : "career";
}

function simplifyMetaLabel(label: string | undefined, locale: Locale, kind: "milestone" | "deadline") {
  if (!label) {
    return undefined;
  }

  const prefixes =
    kind === "milestone"
      ? locale === "vi"
        ? ["Cá»™t má»‘c:", "Cot moc:"]
        : ["Milestone:"]
      : locale === "vi"
        ? ["Háº¡n:", "Han:"]
        : ["Deadline:"];

  let value = label.trim();
  for (const prefix of prefixes) {
    if (value.startsWith(prefix)) {
      value = value.slice(prefix.length).trim();
      break;
    }
  }

  return value;
}

function CurrentExpeditionCardSkeleton({ cardWidth }: { cardWidth: number }) {
  return <View style={[styles.card, styles.skeleton, { width: cardWidth }]} />;
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: semanticRadius.card.default,
  },
  card: {
    height: CURRENT_EXPEDITION_CARD_HEIGHT,
    overflow: "hidden",
    position: "relative",
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
  },
  skeleton: {
    backgroundColor: foundationColors.bg.paperSoft,
  },
  heroFill: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    opacity: 0.22,
  },
  imageWash: {
    ...StyleSheet.absoluteFill,
    opacity: 0.82,
    zIndex: 1,
  },
  sideStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    zIndex: 2,
  },
  copyShell: {
    position: "absolute",
    top: 0,
    right: 14,
    bottom: 0,
    left: 18,
    paddingVertical: 14,
    zIndex: 3,
  },
  vellum: {
    alignSelf: "stretch",
    backgroundColor: vellumOverlayTokens.color.surfaceSoft,
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    borderColor: vellumOverlayTokens.color.borderSoft,
    boxShadow: vellumOverlayTokens.shadow.none,
    flex: 1,
    justifyContent: "space-between",
    minHeight: 0,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  copyGroup: {
    flexShrink: 1,
    gap: 6,
    justifyContent: "flex-start",
    minWidth: 0,
  },
  metaRow: {
    flexShrink: 0,
    justifyContent: "flex-end",
    minHeight: 18,
    paddingTop: 8,
  },
  title: {
    ...todayCarouselCard.titleText,
    fontSize: 18,
    lineHeight: 22,
    textAlign: "left",
    textShadowColor: vellumOverlayTokens.color.textLift,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  body: {
    fontSize: 13,
    lineHeight: 17,
    color: foundationColors.ink.secondary,
    textShadowColor: vellumOverlayTokens.color.textLift,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  meta: {
    fontSize: 11,
    includeFontPadding: false,
    lineHeight: 14,
    color: foundationColors.ink.secondary,
    textShadowColor: vellumOverlayTokens.color.textLift,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
