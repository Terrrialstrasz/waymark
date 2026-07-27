import { StyleSheet, View } from "react-native";
import { getPathsCopy } from "../../i18n/pathsCopy";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { getPathVisualTokens } from "../../tokens/pathVisualTokens";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { isFeatureInteractive, isFeatureVisible } from "../../utils/featureGate";
import { JournalCard } from "../primitives/JournalCard";
import { PATH_IDENTITY_ASSET_IDS } from "../shared/pathIdentityAssets";
import { PathExpeditionItem } from "./types";
import { HorizontalJournalEntryCard } from "../journal";

type Props = {
  item: PathExpeditionItem;
  locale: Locale;
  onPress?: (item: PathExpeditionItem) => void;
};

export function PathExpeditionCard({ item, locale, onPress }: Props) {
  if (!isFeatureVisible(item.gate)) {
    return null;
  }

  if (item.loading) {
    return <PathExpeditionCardSkeleton />;
  }

  const visual = getPathVisualTokens(item.pathId);
  const c = getPathsCopy(locale);
  const title = t(item.title, locale);
  const description = t(item.description, locale);
  const pathName = t(item.pathName, locale);
  const statusLabel = c.expeditions.status[item.status];
  const interactive = Boolean(onPress) && isFeatureInteractive(item.gate);

  return (
    <HorizontalJournalEntryCard
      entryType="mark"
      chips={[
        { id: "status", label: statusLabel, stateTone: item.status === "done" ? "done" : item.status, variant: "status" },
        { id: "path", label: pathName, variant: "metadata" },
      ]}
      body={description}
      onPress={interactive ? () => onPress?.(item) : undefined}
      pathId={item.pathId}
      pathLabel={pathName}
      pathColorToken={visual.accent}
      status={item.status === "done" ? "done" : "planned"}
      title={title}
    />
  );
}

function PathExpeditionCardSkeleton() {
  return (
    <JournalCard style={styles.card} variant="actionable">
      <View style={[styles.rail, styles.skeletonRail]} />
      <View style={styles.topRow}>
        <View style={styles.titleSlot} />
        <View style={[styles.skeletonBlock, styles.skeletonBadge]} />
      </View>
      <View style={[styles.skeletonBlock, styles.skeletonTitle]} />
      <View style={[styles.skeletonBlock, styles.skeletonBody]} />
      <View style={styles.footerRow}>
        <View style={[styles.skeletonBlock, styles.skeletonMeta]} />
        <View style={[styles.accentLine, styles.skeletonRail]} />
      </View>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    paddingLeft: spacing.sm,
  },
  rail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: semanticRadius.card.compact,
    borderBottomRightRadius: semanticRadius.card.compact,
  },
  watermarkWrap: {
    position: "absolute",
    right: -8,
    top: 10,
  },
  watermark: {
    width: 84,
    height: 84,
    opacity: 0.06,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  titleSlot: {
    flex: 1,
  },
  title: {
    paddingRight: spacing.xl,
  },
  description: {
    paddingRight: spacing.xl,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    minHeight: 16,
  },
  pathName: {
    color: foundationColors.ink.tertiary,
    flex: 1,
  },
  accentLine: {
    width: 28,
    height: 2,
    borderRadius: 999,
  },
  skeletonRail: {
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonBlock: {
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonBadge: {
    width: 72,
    height: 28,
    borderRadius: 999,
  },
  skeletonTitle: {
    width: "72%",
    height: 26,
  },
  skeletonBody: {
    width: "84%",
    height: 36,
  },
  skeletonMeta: {
    width: 88,
    height: 14,
  },
});
