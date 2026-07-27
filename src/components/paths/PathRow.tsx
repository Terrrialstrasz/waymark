import { StyleSheet, View } from "react-native";
import { getWaymarkImageAsset } from "../../assets/imageRegistry";
import { getPathHeroImage } from "../../tokens/pathHeroImages";
import { getPathsCopy } from "../../i18n/pathsCopy";
import { getPathVisualTokens } from "../../tokens/pathVisualTokens";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { isFeatureInteractive, isFeatureVisible } from "../../utils/featureGate";
import { t } from "../../utils/localized";
import { PathRowItem } from "./types";
import { HorizontalJournalEntryCard } from "../journal";
import { JournalCard } from "../primitives/JournalCard";
import { DEBUG_LAYOUT, DebugLayerBox } from "../../debug/layoutDebug";

type Props = {
  item: PathRowItem;
  locale: Locale;
  onPress?: (item: PathRowItem) => void;
};

export function PathRow({ item, locale, onPress }: Props) {
  if (!isFeatureVisible(item.gate)) {
    return null;
  }

  if (item.loading) {
    return <PathRowSkeleton />;
  }

  const c = getPathsCopy(locale);
  const visual = getPathVisualTokens(item.pathId);
  const title = t(item.title, locale);
  const question = t(item.question, locale).replace(/\s+/g, " ").trim();
  const statusLabel = c.status[item.status];
  const marksLabel = c.common.marks(item.markCount);
  const interactive = Boolean(onPress) && isFeatureInteractive(item.gate);
  const hero = getPathHeroImage(item.pathId);

  const rowNode = (
    <HorizontalJournalEntryCard
      debugLabel={`PathRow.${item.id}.HorizontalJournalEntryCard`}
      debugLines={[`pathId=${item.pathId}`, `title=${title}`]}
      density="compact"
      entryType="mark"
      chips={[
        { id: "status", label: statusLabel, stateTone: item.status, variant: "status" },
        { id: "marks", label: marksLabel, variant: "metadata" },
      ]}
      body={question}
      backgroundPaintImage={hero?.assetId ? getWaymarkImageAsset(hero.assetId)?.src : undefined}
      backgroundPaintInfo={
        hero?.assetId
          ? {
              assetId: hero.assetId,
              assetVariant: "hero",
              focalPoint: hero.focalPoint,
              sourceKind: "path-hero",
              title,
            }
          : {
              sourceKind: "unknown",
              title,
            }
      }
      onPress={interactive ? () => onPress?.(item) : undefined}
      pathId={item.pathId}
      pathLabel={title}
      pathColorToken={visual.accent}
      sourceId={item.pathId}
      sourceType="path"
      status={item.status === "weak" ? "warning" : "planned"}
      title={title}
      titleNumberOfLines={2}
      bodyNumberOfLines={1}
    />
  );

  if (DEBUG_LAYOUT) {
    return (
      <DebugLayerBox label={`PathRow.${item.id}`} lines={[`pathId=${item.pathId}`, `title=${title}`]} tone="purple">
        {rowNode}
      </DebugLayerBox>
    );
  }

  return rowNode;
}

function PathRowSkeleton() {
  return (
    <JournalCard style={styles.skeletonCard} variant="actionable">
      <View style={[styles.skeletonAccentRail, styles.skeletonRail]} />
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonLeadingWrap}>
          <View style={[styles.skeletonIconBadge, styles.skeletonIcon]} />
        </View>
        <View style={styles.skeletonCopy}>
          <View style={[styles.skeletonBlock, styles.skeletonTitle]} />
          <View style={[styles.skeletonBlock, styles.skeletonQuestion]} />
          <View style={styles.skeletonChipRow}>
            <View style={[styles.skeletonBlock, styles.skeletonChip]} />
            <View style={[styles.skeletonBlock, styles.skeletonChipWide]} />
          </View>
        </View>
      </View>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  skeletonCard: {
    overflow: "hidden",
    paddingLeft: spacing.sm,
  },
  skeletonAccentRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: semanticRadius.card.compact,
    borderBottomRightRadius: semanticRadius.card.compact,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  skeletonLeadingWrap: {
    paddingTop: 2,
  },
  skeletonIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: foundationColors.bg.paperWarm,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  skeletonRail: {
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonIcon: {
    borderColor: foundationColors.border.subtle,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonBlock: {
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonTitle: {
    width: "58%",
    height: 24,
  },
  skeletonQuestion: {
    width: "88%",
    height: 34,
  },
  skeletonChipRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  skeletonChip: {
    width: 76,
    height: 28,
    borderRadius: 999,
  },
  skeletonChipWide: {
    width: 88,
    height: 28,
    borderRadius: 999,
  },
});
