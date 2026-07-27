import { StyleSheet, View } from "react-native";
import { getPathsCopy } from "../../i18n/pathsCopy";
import { foundationColors, spacing } from "../../theme/tokens";
import { BottomTabId, Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import type { CurrentExpeditionItem } from "../today/__fixtures__/todayExpedition.fixtures";
import { CurrentExpeditionSection } from "../today/CurrentExpeditionSection";
import { BottomNavBar } from "../primitives/BottomNavBar";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WMSectionHeader } from "../primitives/WMSectionHeader";
import { WMText } from "../primitives/Text";
import { NextMarksList } from "./NextMarksList";
import { PathPulseCard } from "./PathPulseCard";
import { RecentProofList } from "./RecentProofList";
import { WhyThisPathCard } from "./WhyThisPathCard";
import { NextMarkItem, PathDetailItem, PathProofItem } from "./types";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMButton } from "../primitives/WMButton";

type Props = {
  locale: Locale;
  path: PathDetailItem;
  proofs: PathProofItem[];
  nextMarks: NextMarkItem[];
  expeditions: CurrentExpeditionItem[];
  onBack?: () => void;
  onMore?: () => void;
  onOpenProof?: (item: PathProofItem) => void;
  onOpenNextMark?: (item: NextMarkItem) => void;
  onOpenExpedition?: (item: CurrentExpeditionItem) => void;
  onViewAllExpeditions?: () => void;
  primaryAction?: { label: string; onPress: () => void };
  showBottomNav?: boolean;
  onTabPress?: (tab: Exclude<BottomTabId, "capture">) => void;
};

export function PathDetailTemplate({
  locale,
  path,
  proofs,
  nextMarks,
  expeditions,
  onBack,
  onMore,
  onOpenProof,
  onOpenNextMark,
  onOpenExpedition,
  onViewAllExpeditions,
  primaryAction,
  showBottomNav = true,
  onTabPress,
}: Props) {
  const c = getPathsCopy(locale);
  const pathTitle = t(path.title, locale);

  return (
    <FieldJournalScreenShell variant="navAware">
      <PageHeader
        onBack={onBack}
        showBack
        subtitle={c.detail.pathLabel}
        title={pathTitle}
        variant="withBack"
      />

        {path.statement ? (
          <WMText style={styles.pathStatement} variant="bodyLg">
            {t(path.statement, locale)}
          </WMText>
        ) : null}

      {path.pulseSummary && path.pulseBody ? (
        <PathPulseCard
          body={t(path.pulseBody, locale)}
          locale={locale}
          metrics={path.pulseMetrics}
          pathId={path.pathId}
          status={path.status}
          summary={t(path.pulseSummary, locale)}
        />
      ) : null}

      {primaryAction ? <WMButton fullWidth label={primaryAction.label} onPress={primaryAction.onPress} variant="primary" /> : null}

      <WMSectionHeader title={c.detail.recentProofTitle} />
      <RecentProofList items={proofs} locale={locale} onPressItem={onOpenProof} pathId={path.pathId} pathLabel={pathTitle} />

      <WMSectionHeader title={c.detail.nextMarksTitle} />
      <NextMarksList items={nextMarks} locale={locale} onPressItem={onOpenNextMark} pathId={path.pathId} pathLabel={pathTitle} />

      {expeditions.length ? (
        <CurrentExpeditionSection expeditions={expeditions} locale={locale} onOpenExpeditionDetail={onOpenExpedition} title={c.detail.currentExpeditionsTitle} />
      ) : (
        <View style={styles.expeditionList}>
          <WMSectionHeader actionLabel={c.detail.currentExpeditionsAction} onAction={onViewAllExpeditions} title={c.detail.currentExpeditionsTitle} />
          <WMEmptyState body={c.detail.expeditionsEmptyBody} title={c.detail.expeditionsEmptyTitle} />
        </View>
      )}

      {path.whyThisPathBody ? <WhyThisPathCard body={t(path.whyThisPathBody, locale)} locale={locale} pathId={path.pathId} /> : null}

      {showBottomNav ? <BottomNavBar activeTab="paths" locale={locale} onTabPress={onTabPress} /> : null}
    </FieldJournalScreenShell>
  );
}

const styles = StyleSheet.create({
  pathStatement: {
    color: foundationColors.ink.secondary,
  },
  expeditionList: {
    gap: spacing.sm,
  },
});
