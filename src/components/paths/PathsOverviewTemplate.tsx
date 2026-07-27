import { StyleSheet, View } from "react-native";
import { spacing } from "../../theme/tokens";
import { getPathsCopy } from "../../i18n/pathsCopy";
import { BottomTabId, Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { InsightCard } from "../primitives/InsightCard";
import { BottomNavBar } from "../primitives/BottomNavBar";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WMSectionHeader } from "../primitives/WMSectionHeader";
import { PathOverviewStatStrip } from "./PathOverviewStatStrip";
import { PathRow } from "./PathRow";
import { PathRowItem, PathStatCardItem } from "./types";
import { DEBUG_LAYOUT, DEBUG_LAYOUT_VERSION, DebugBanner, DebugLayerBox } from "../../debug/layoutDebug";

type Props = {
  locale: Locale;
  stats: PathStatCardItem[];
  paths: PathRowItem[];
  onOpenPath?: (item: PathRowItem) => void;
  actions?: React.ReactNode;
  showBottomNav?: boolean;
  onTabPress?: (tab: Exclude<BottomTabId, "capture">) => void;
  debugInfo?: {
    summaryPathCount: number;
    pathListLength: number;
    renderedPathRows: number;
    preview: string[];
  };
};

export function PathsOverviewTemplate({
  locale,
  stats,
  paths,
  onOpenPath,
  actions,
  showBottomNav = true,
  onTabPress,
  debugInfo,
}: Props) {
  const c = getPathsCopy(locale);
  const dateLabel = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(new Date());

  return (
    <FieldJournalScreenShell
      botanicalAmbient
      botanicalMotifs={["botanical.trailCurve"]}
      debugLabel="PathsOverviewTemplate.FieldJournalScreenShell"
      debugLines={debugInfo ? [`pathListLength=${debugInfo.pathListLength}`, `renderedPathRows=${debugInfo.renderedPathRows}`] : undefined}
      variant="navAware"
    >
      <DebugLayerBox label="PathsOverviewTemplate.Root" lines={[`dateLabel=${dateLabel}`]} tone="blue">
        <PageHeader
          actions={actions}
          decorativeAccent
          decorativeMotifs={["botanical.trailCurve"]}
          logoSize="lg"
          logoVariant="primary"
          subtitle={dateLabel}
          title={c.overview.title}
          variant="standard"
        />
        {DEBUG_LAYOUT ? (
          <DebugBanner
            label={`DEBUG PATHS OVERVIEW TEMPLATE ACTIVE - ${DEBUG_LAYOUT_VERSION}`}
            lines={[
              `summaryPathCount=${debugInfo?.summaryPathCount ?? stats.length}`,
              `pathListLength=${debugInfo?.pathListLength ?? paths.length}`,
              `renderedPathRows=${debugInfo?.renderedPathRows ?? paths.length}`,
              ...(debugInfo?.preview ?? []).map((line) => `preview=${line}`),
            ]}
          />
        ) : null}
        <DebugLayerBox itemCount={stats.length} label="PathsOverviewTemplate.StatsArea" tone="amber">
          <PathOverviewStatStrip items={stats} locale={locale} />
        </DebugLayerBox>
        <WMSectionHeader title={c.overview.pathsSectionTitle} />
        <DebugLayerBox itemCount={paths.length} label="PathsOverviewTemplate.PathList" style={styles.pathList} tone="green">
          {paths.map((item) => (
            <PathRow key={item.id} item={item} locale={locale} onPress={onOpenPath} />
          ))}
        </DebugLayerBox>
        <DebugLayerBox label="PathsOverviewTemplate.InsightCard" tone="purple">
          <InsightCard body={c.overview.insightBody} title={c.overview.insightTitle} />
        </DebugLayerBox>
        {showBottomNav ? <BottomNavBar activeTab="paths" locale={locale} onTabPress={onTabPress} /> : null}
      </DebugLayerBox>
    </FieldJournalScreenShell>
  );
}

const styles = StyleSheet.create({
  pathList: {
    flexGrow: 0,
    gap: spacing.sm,
  },
});
