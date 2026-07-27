import { Pressable, StyleSheet, View } from "react-native";
import {
  foundationColors,
  journalCardTokens,
  semanticBorder,
  semanticRadius,
  spacing,
  typography,
} from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { WMText } from "../primitives/Text";
import { TodayPackCheckItem } from "../today/__fixtures__/todayCarousel.fixtures";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { getPackCheckCatalogEntryBySourceSeedId, getPackCheckCatalogEntryByTitle } from "../../config/packCheckCatalog";
import { PackCheckLogo } from "./PackCheckLogo";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { getPathVisualTokens } from "../../tokens/pathVisualTokens";

type Props = {
  pack: TodayPackCheckItem;
  locale: Locale;
  onPress?: (pack: TodayPackCheckItem) => void;
  isDetailEnabled?: boolean;
  size?: number;
  height?: number;
};

export function PackCheckMiniCard({ pack, locale, onPress, isDetailEnabled = pack.detailEnabled ?? false, size, height }: Props) {
  const title = pack.title[locale];
  const supportLabel = pack.supportLabel?.[locale];
  const catalogEntry = getPackCheckCatalogEntryBySourceSeedId(pack.sourceSeedId) ?? getPackCheckCatalogEntryByTitle(pack.title.en);
  const pathVisual = getPathVisualTokens(pack.pathId ?? catalogEntry?.uiPathId);
  const accessibilityLabel = pack.accessibilityLabel?.[locale] ?? `${title}. ${supportLabel ? `${supportLabel}.` : ""}`.trim();
  const resolvedSize = size ?? 156;
  const resolvedHeight = height ?? resolvedSize;
  const isCompact = resolvedSize < 140;
  const iconStageHeight = Math.max(54, Math.round(resolvedSize * 0.48));
  const haloSize = Math.max(48, Math.round(resolvedSize * 0.42));
  const logoSize = Math.max(36, Math.round(resolvedSize * 0.32));
  const displayTitle = isCompact ? formatCompactPackCheckTitle(title) : title;
  const content = (
    <View style={[styles.card, isCompact ? styles.cardCompact : null, { borderColor: pathVisual.accentMuted, height: resolvedHeight, width: resolvedSize }]}>
      <View style={[styles.content, isCompact ? styles.contentCompact : null]}>
        <View style={[styles.iconStage, { backgroundColor: pathVisual.accentSoft, borderColor: pathVisual.accentMuted, height: iconStageHeight }]}>
          <View style={[styles.iconHalo, { height: haloSize, width: haloSize }]}>
            {catalogEntry ? (
              <PackCheckLogo color={pathVisual.accentDeep} size={logoSize} sourceSeedId={catalogEntry.sourceSeedId} />
            ) : (
              <WaymarkIcon decorative semanticName="entity.packCheck" customHeight={logoSize} customWidth={logoSize} size="custom" state="default" />
            )}
          </View>
        </View>
        <WMText
          allowFontScaling={!isCompact}
          numberOfLines={isCompact ? 2 : 3}
          style={[styles.title, isCompact ? styles.titleCompact : null, { color: pathVisual.accentDeep }]}
          variant="bodyStrong"
        >
          {displayTitle}
        </WMText>
      </View>
    </View>
  );

  if (!isDetailEnabled || !onPress) {
    return content;
  }

  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={() => onPress(pack)} style={styles.pressable}>
      {({ pressed }) => <View style={[styles.shadowWrap, pressed ? styles.shadowPressed : styles.shadowIdle]}>{content}</View>}
    </Pressable>
  );
}

function formatCompactPackCheckTitle(title: string) {
  return title
    .replace(/\s+(Readiness\s+Check|Presence\s+Check|Check)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: semanticRadius.card.compact,
  },
  shadowWrap: {
    borderRadius: semanticRadius.card.compact,
  },
  shadowIdle: {
    boxShadow: journalCardTokens.shadow.none,
  },
  shadowPressed: {
    boxShadow: journalCardTokens.shadow.pressed,
  },
  card: {
    backgroundColor: foundationColors.bg.paperWarm,
    borderRadius: semanticRadius.card.compact,
    ...getBorderStyle(semanticBorder.card.subtle),
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cardCompact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  content: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
  },
  contentCompact: {
    gap: spacing.sm,
  },
  iconStage: {
    alignItems: "center",
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    height: 82,
    justifyContent: "center",
    width: "100%",
  },
  iconHalo: {
    alignItems: "center",
    backgroundColor: foundationColors.bg.paper,
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  title: {
    ...typography.bodyStrong,
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    minWidth: 0,
    textAlign: "center",
    width: "100%",
  },
  titleCompact: {
    fontSize: 13,
    lineHeight: 16,
  },
});
