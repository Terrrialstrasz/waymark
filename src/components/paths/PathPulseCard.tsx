import { ScrollView, StyleSheet, View } from "react-native";
import { getPathsCopy } from "../../i18n/pathsCopy";
import { getTodayPathHeroPath } from "../../lib/waymark/todayPathHero";
import { getPathVisualTokens } from "../../tokens/pathVisualTokens";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { Locale, PathId, PathPulse } from "../../types/ui";
import { t } from "../../utils/localized";
import { EntityChip } from "../primitives/EntityChip";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { PATH_IDENTITY_ASSET_IDS } from "../shared/pathIdentityAssets";
import { PathPulseMetric } from "./types";

type Props = {
  locale: Locale;
  pathId: PathId;
  status?: PathPulse;
  summary?: string;
  body?: string;
  metrics?: PathPulseMetric[];
  loading?: boolean;
  empty?: boolean;
};

export function PathPulseCard({ locale, pathId, status, summary, body, metrics, loading, empty }: Props) {
  const c = getPathsCopy(locale);
  const visual = getPathVisualTokens(pathId);
  const hero = getTodayPathHeroPath(pathId);

  if (loading) {
    return (
      <JournalCard style={styles.card} variant="standard">
        <View style={[styles.skeletonBadge, styles.skeletonBlock]} />
        <View style={[styles.skeletonTitle, styles.skeletonBlock]} />
        <View style={[styles.skeletonBody, styles.skeletonBlock]} />
      </JournalCard>
    );
  }

  const resolvedStatus = status ?? "protected";
  const resolvedSummary = summary ?? c.common.empty;
  const resolvedBody = body ?? (empty ? c.detail.expeditionsEmptyBody : "");

  return (
    <JournalCard
      style={[styles.card, { backgroundColor: visual.accentSoft, borderColor: visual.accentMuted }]}
      variant="standard"
      backgroundLayer={
        <View style={styles.backgroundLayer}>
          <WaymarkImage
            assetId={hero.heroAssetId}
            alt={hero.heroAlt[locale]}
            usage="hero"
            style={styles.heroBackground}
            imageStyle={styles.heroImage}
          />
          <View style={styles.heroOverlay} />
        </View>
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.leading}>
          <View style={[styles.iconBadge, { borderColor: visual.accentMuted }]}>
            <WaymarkImage alt="" assetId={PATH_IDENTITY_ASSET_IDS[pathId]} decorative imageStyle={styles.iconImage} usage="pathIcon" />
          </View>
          <View style={styles.headerCopy}>
            <WMText variant="label">{c.detail.pulseTitle}</WMText>
            <WMText style={styles.summary} variant="sectionTitle">
              {resolvedSummary}
            </WMText>
          </View>
        </View>
      </View>

      {resolvedBody ? (
        <WMText style={styles.body} variant="body">
          {resolvedBody}
        </WMText>
      ) : null}

      <ScrollView contentContainerStyle={styles.metricRow} horizontal showsHorizontalScrollIndicator={false}>
        <EntityChip label={c.status[resolvedStatus]} size="compact" stateTone={resolvedStatus} variant="status" />
        {metrics?.map((metric) => (
          <EntityChip key={metric.id} label={`${t(metric.label, locale)} · ${t(metric.value, locale)}`} size="compact" variant="metadata" />
        ))}
      </ScrollView>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  leading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: foundationColors.bg.paperWarm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconImage: {
    width: 42,
    height: 42,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  summary: {
    color: foundationColors.ink.primary,
  },
  body: {
    color: foundationColors.ink.secondary,
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.36)",
  },
  skeletonBlock: {
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonBadge: {
    width: 88,
    height: 28,
  },
  skeletonTitle: {
    width: "52%",
    height: 24,
  },
  skeletonBody: {
    width: "86%",
    height: 38,
  },
});
