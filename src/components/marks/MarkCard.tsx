import { Pressable, StyleSheet, View } from "react-native";
import { getWaymarkImageAsset } from "../../assets/imageRegistry";
import { TodayMarkItem, TodayMarkStatus } from "../today/__fixtures__/todayCarousel.fixtures";
import { foundationColors, journalCardTokens, semanticRadius, spacing } from "../../theme/tokens";
import { Locale, PathId } from "../../types/ui";
import { TodayPathHeroPath, WAYMARK_PATH_COLORS, getTodayPathHeroTextColorKey, todayPathHeroPaths } from "../../lib/waymark/todayPathHero";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { todayCarouselCard } from "../today/todayCarouselCardTokens";

type Props = {
  mark: TodayMarkItem;
  locale: Locale;
  onPress?: (mark: TodayMarkItem) => void;
  isDetailEnabled?: boolean;
  variant?: "default" | "closeTrailReview";
};

type MarkVisualState = {
  surfaceColor: string;
  borderColor: string;
  stripeColor: string;
  tintColor: string;
  titleColor: string;
  metaColor: string;
  watermarkOpacity: number;
  shadowOpacity: number;
  opacity: number;
};

const pathMap = new Map<PathId, TodayPathHeroPath>(todayPathHeroPaths.map((path) => [path.id, path]));
const defaultPath = pathMap.get("career")!;

export const MARK_CARD_WIDTH = todayCarouselCard.width;
export const MARK_CARD_HEIGHT = todayCarouselCard.height;

const statusIconMap: Record<TodayMarkStatus, WaymarkSemanticIconName> = {
  ready: "status.planned",
  dependency_required: "status.active",
  blocked: "status.missed",
  ready_with_advisory: "status.weak",
  ready_with_waiver: "status.done",
  needs_decision: "status.active",
  done: "status.done",
  resolved: "status.done",
  overdue: "status.missed",
};

export function MarkCard({
  mark,
  locale,
  onPress,
  isDetailEnabled = mark.detailEnabled ?? false,
  variant = "default",
}: Props) {
  const path = pathMap.get(mark.pathId) ?? defaultPath;
  const colorSet = WAYMARK_PATH_COLORS[getTodayPathHeroTextColorKey(path.id)];
  const visualState = getMarkVisualState(mark.status, colorSet.accentSoft, colorSet.accentDeep, colorSet.accentMuted);
  const title = mark.title[locale];
  const summary = mark.summary?.[locale];
  const showSummary = shouldShowSummary(title, summary, variant);
  const titleLineCount = showSummary ? 3 : 4;
  const timeLabel = mark.timeLabel?.[locale];
  const statusLabel = getStatusLabel(mark.status, locale);
  const pathIconAssetId = path.pathIconAssetId;
  const watermarkSource = pathIconAssetId ? getWaymarkImageAsset(pathIconAssetId)?.fallbackSrc : undefined;
  const accessibilityLabel = mark.accessibilityLabel?.[locale] ?? `${title}. ${statusLabel}.`;
  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: visualState.surfaceColor,
          borderColor: visualState.borderColor,
          opacity: visualState.opacity,
        },
      ]}
    >
      <View style={[styles.overlay, { backgroundColor: visualState.tintColor }]} />
      <View style={[styles.sideStripe, { backgroundColor: visualState.stripeColor }]} />
      {pathIconAssetId ? (
        <View pointerEvents="none" style={styles.watermarkWrap}>
          <WaymarkImage
            alt={path.label[locale]}
            src={watermarkSource}
            fallback={null}
            imageStyle={[styles.watermark, { opacity: visualState.watermarkOpacity }]}
            usage="pathIcon"
          />
        </View>
      ) : null}
      <View style={styles.content}>
        <View style={[styles.body, !showSummary ? styles.bodyWithoutSummary : null]}>
          <View style={styles.titleWrap}>
            <WMText numberOfLines={titleLineCount} style={[styles.title, { color: visualState.titleColor }]} variant="pageTitle">
              {title}
            </WMText>
          </View>

          {showSummary ? (
            <WMText numberOfLines={2} style={[styles.summary, { color: visualState.metaColor }]} variant="bodySm">
              {summary}
            </WMText>
          ) : null}
        </View>

        <View style={styles.footerRow}>
          <View style={[styles.statusPill, { borderColor: visualState.borderColor, backgroundColor: visualState.surfaceColor }]}>
            <WaymarkIcon decorative semanticName={statusIconMap[mark.status]} size="xs" state="muted" />
            <WMText numberOfLines={1} style={[styles.statusText, { color: visualState.metaColor }]} variant="metaCompact">
              {statusLabel}
            </WMText>
          </View>

          <View style={styles.footerMeta}>
            {timeLabel && variant === "default" ? (
              <View style={styles.timeMeta}>
                <WaymarkIcon decorative semanticName="utility.calendar" size="xs" state="muted" />
                <WMText numberOfLines={1} style={[styles.metaText, { color: visualState.metaColor }]} variant="metaCompact">
                  {timeLabel}
                </WMText>
              </View>
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
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={() => onPress(mark)} style={styles.pressable}>
      {({ pressed }) => (
        <View style={[styles.shadowWrap, pressed ? styles.shadowPressed : styles.shadowIdle, { opacity: visualState.shadowOpacity }]}>
          {content}
        </View>
      )}
    </Pressable>
  );
}

function getMarkVisualState(status: TodayMarkStatus, accentSoft: string, accentDeep: string, accentMuted: string): MarkVisualState {
  switch (status) {
    case "done":
    case "resolved":
      return {
        surfaceColor: "#EEE8DE",
        borderColor: "#D9D1C4",
        stripeColor: "#B8AFA1",
        tintColor: "#F6F2EB",
        titleColor: "#5A564D",
        metaColor: foundationColors.ink.tertiary,
        watermarkOpacity: 0.05,
        shadowOpacity: 0.72,
        opacity: 0.78,
      };
    case "blocked":
    case "overdue":
      return {
        surfaceColor: "#FBF2EA",
        borderColor: "#D7B58F",
        stripeColor: "#B88456",
        tintColor: "#F6E3D3",
        titleColor: foundationColors.ink.primary,
        metaColor: "#7A5811",
        watermarkOpacity: 0.07,
        shadowOpacity: 1,
        opacity: 1,
      };
    case "dependency_required":
      return {
        surfaceColor: "#FFF9EA",
        borderColor: "#D9BA63",
        stripeColor: "#C38C12",
        tintColor: "#F8EBC9",
        titleColor: foundationColors.ink.primary,
        metaColor: "#7A5811",
        watermarkOpacity: 0.075,
        shadowOpacity: 1,
        opacity: 1,
      };
    case "ready_with_advisory":
      return {
        surfaceColor: "#F8FAF2",
        borderColor: "#B5C39E",
        stripeColor: "#7A8335",
        tintColor: "#E9E6C9",
        titleColor: foundationColors.ink.primary,
        metaColor: foundationColors.ink.secondary,
        watermarkOpacity: 0.065,
        shadowOpacity: 1,
        opacity: 1,
      };
    case "ready_with_waiver":
      return {
        surfaceColor: "#F8FBFD",
        borderColor: "#A5C0DB",
        stripeColor: "#1E5F9E",
        tintColor: "#DCECF7",
        titleColor: foundationColors.ink.primary,
        metaColor: foundationColors.ink.secondary,
        watermarkOpacity: 0.065,
        shadowOpacity: 1,
        opacity: 1,
      };
    case "needs_decision":
      return {
        surfaceColor: "#FBF4EC",
        borderColor: "#D7B58F",
        stripeColor: "#8B5E34",
        tintColor: "#F1E6D9",
        titleColor: foundationColors.ink.primary,
        metaColor: foundationColors.ink.secondary,
        watermarkOpacity: 0.065,
        shadowOpacity: 1,
        opacity: 1,
      };
    default:
      return {
        surfaceColor: "#FFFDF6",
        borderColor: accentMuted,
        stripeColor: accentDeep,
        tintColor: accentSoft,
        titleColor: foundationColors.ink.primary,
        metaColor: accentDeep,
        watermarkOpacity: 0.085,
        shadowOpacity: 1,
        opacity: 1,
      };
  }
}

function shouldShowSummary(title: string, summary: string | undefined, variant: Props["variant"]) {
  if (!summary || variant !== "default") {
    return false;
  }

  return title.length <= 42;
}

function getStatusLabel(status: TodayMarkStatus, locale: Locale) {
  switch (status) {
    case "dependency_required":
      return locale === "vi" ? "Cần phụ thuộc" : "Dependency Required";
    case "blocked":
      return locale === "vi" ? "Bị chặn" : "Blocked";
    case "ready_with_advisory":
      return locale === "vi" ? "Khuyến nghị" : "Advisory";
    case "ready_with_waiver":
      return locale === "vi" ? "Đã miễn" : "Waived";
    case "needs_decision":
      return locale === "vi" ? "Cần quyết định" : "Needs Decision";
    case "done":
      return locale === "vi" ? "Đã xong" : "Done";
    case "resolved":
      return locale === "vi" ? "Đã xử lý" : "Resolved";
    case "overdue":
      return locale === "vi" ? "Quá hạn" : "Overdue";
    default:
      return locale === "vi" ? "Sẵn sàng" : "Ready";
  }
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: semanticRadius.card.default,
  },
  shadowWrap: {
    borderRadius: semanticRadius.card.default,
  },
  shadowIdle: {
    boxShadow: journalCardTokens.shadow.journal,
  },
  shadowPressed: {
    boxShadow: journalCardTokens.shadow.pressed,
  },
  card: {
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    height: MARK_CARD_HEIGHT,
    overflow: "hidden",
    position: "relative",
    width: MARK_CARD_WIDTH,
  },
  sideStripe: {
    borderBottomRightRadius: semanticRadius.card.compact,
    borderTopRightRadius: semanticRadius.card.compact,
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 6,
    zIndex: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    zIndex: 0,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.xs,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    position: "relative",
    zIndex: 3,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    justifyContent: "flex-start",
  },
  bodyWithoutSummary: {
    justifyContent: "center",
  },
  titleWrap: {
    paddingRight: spacing.xs,
  },
  title: {
    color: foundationColors.ink.primary,
    ...todayCarouselCard.titleText,
  },
  summary: {
    ...todayCarouselCard.bodyText,
  },
  watermarkWrap: {
    position: "absolute",
    right: 4,
    top: 6,
    zIndex: 1,
  },
  watermark: {
    height: 104,
    width: 104,
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 24,
    marginTop: spacing.xs,
  },
  statusPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 22,
    paddingHorizontal: spacing.xs,
  },
  statusText: {
    ...todayCarouselCard.statusChipText,
  },
  footerMeta: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  timeMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginLeft: "auto",
  },
  metaText: {
    ...todayCarouselCard.metadataText,
  },
});
