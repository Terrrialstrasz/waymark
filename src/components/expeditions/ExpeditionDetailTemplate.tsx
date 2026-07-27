import { StyleSheet, View } from "react-native";
import { ExpeditionDetailItem, ExpeditionMilestoneActions, ExpeditionMilestoneItem } from "./types";
import { Locale } from "../../types/ui";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { ExpeditionHeader } from "./ExpeditionHeader";
import { ExpeditionSummaryCard } from "./ExpeditionSummaryCard";
import { MilestoneTimeline } from "./MilestoneTimeline";
import { JournalCard } from "../primitives/JournalCard";
import { IconBadge } from "../primitives/IconBadge";
import { WMText } from "../primitives/Text";
import { foundationColors, spacing } from "../../theme/tokens";
import { getCopy } from "../../i18n/copy";
import { WMEmptyState } from "../primitives/WMEmptyState";

type Props = {
  expedition: ExpeditionDetailItem;
  milestones: ExpeditionMilestoneItem[];
  locale?: Locale;
  loading?: boolean;
  error?: boolean;
  onBack?: () => void;
  onMore?: () => void;
  onOpenMarkDetail?: (markId: string) => void;
} & ExpeditionMilestoneActions;

export function ExpeditionDetailTemplate({
  expedition,
  milestones,
  locale = "en",
  loading = false,
  error = false,
  onBack,
  onMore,
  onOpenMarkDetail,
  onCompleteMilestone,
  onSkipMilestone,
  onRescheduleMilestone,
}: Props) {
  const copy = getCopy(locale).expeditionDetail;

  return (
    <FieldJournalScreenShell botanicalAmbient scrollable variant="navAware">
      <ExpeditionHeader expedition={expedition} locale={locale} onBack={onBack} />

      {loading ? <LoadingState /> : error ? <WMEmptyState body={copy.errorBody} title={copy.errorTitle} /> : null}

      {!loading && !error ? (
        <>
          <ExpeditionSummaryCard expedition={expedition} locale={locale} />
          <MilestoneTimeline
            locale={locale}
            milestones={milestones}
            onCompleteMilestone={onCompleteMilestone}
            onOpenMarkDetail={onOpenMarkDetail}
            onRescheduleMilestone={onRescheduleMilestone}
            onSkipMilestone={onSkipMilestone}
          />
          {expedition.whyItMatters ? <WhyItMattersCard body={expedition.whyItMatters} locale={locale} /> : null}
        </>
      ) : null}
    </FieldJournalScreenShell>
  );
}

function WhyItMattersCard({ body, locale }: { body: string; locale: Locale }) {
  const copy = getCopy(locale).expeditionDetail;

  return (
    <JournalCard decorative decorationPreset="entityCard" style={styles.whyCard} variant="standard">
      <View style={styles.whyRow}>
        <IconBadge semanticName="botanical.sectionSprig" shape="circle" size="md" tone="warm" />
        <View style={styles.whyCopy}>
          <WMText variant="sheetTitle">{copy.whyItMattersTitle}</WMText>
          <WMText style={styles.whyBody} variant="body">
            {body}
          </WMText>
        </View>
      </View>
    </JournalCard>
  );
}

function LoadingState() {
  return (
    <View style={styles.loadingStack}>
      <JournalCard style={styles.loadingCard} variant="hero">
        <View style={[styles.skeletonLine, styles.skeletonTitle]} />
        <View style={[styles.skeletonLine, styles.skeletonBody]} />
        <View style={[styles.skeletonLine, styles.skeletonBodyShort]} />
        <View style={[styles.skeletonTrack, styles.skeletonLine]} />
      </JournalCard>

      <JournalCard style={styles.loadingCard} variant="standard">
        <View style={[styles.skeletonLine, styles.skeletonSectionTitle]} />
        <View style={[styles.skeletonLine, styles.skeletonMeta]} />
        <View style={[styles.skeletonMilestone, styles.skeletonLine]} />
        <View style={[styles.skeletonMilestone, styles.skeletonLine]} />
      </JournalCard>
    </View>
  );
}

const styles = StyleSheet.create({
  whyCard: {
    borderColor: foundationColors.border.soft,
  },
  whyRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  whyCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  whyBody: {
    color: foundationColors.ink.secondary,
  },
  loadingStack: {
    gap: spacing.md,
  },
  loadingCard: {
    borderColor: foundationColors.border.soft,
  },
  skeletonLine: {
    backgroundColor: foundationColors.bg.paperSoft,
    borderRadius: 999,
  },
  skeletonTitle: {
    height: 30,
    width: "52%",
  },
  skeletonBody: {
    height: 18,
    width: "92%",
  },
  skeletonBodyShort: {
    height: 18,
    width: "76%",
  },
  skeletonTrack: {
    height: 8,
    marginTop: spacing.sm,
    width: "100%",
  },
  skeletonSectionTitle: {
    height: 24,
    width: "42%",
  },
  skeletonMeta: {
    height: 16,
    width: "58%",
  },
  skeletonMilestone: {
    height: 84,
    marginTop: spacing.xs,
    width: "100%",
  },
});
