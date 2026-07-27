import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ExpeditionMilestoneActions, ExpeditionMilestoneItem } from "./types";
import { Locale } from "../../types/ui";
import { JournalCard } from "../primitives/JournalCard";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMText } from "../primitives/Text";
import { foundationColors, spacing } from "../../theme/tokens";
import { MilestoneRow } from "./MilestoneRow";
import { getCopy } from "../../i18n/copy";

type Props = {
  milestones: ExpeditionMilestoneItem[];
  locale: Locale;
  onOpenMarkDetail?: (markId: string) => void;
} & ExpeditionMilestoneActions;

export function MilestoneTimeline({
  milestones,
  locale,
  onCompleteMilestone,
  onOpenMarkDetail,
  onRescheduleMilestone,
  onSkipMilestone,
}: Props) {
  const copy = getCopy(locale).expeditionDetail;
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() =>
    milestones.reduce<Record<string, boolean>>((acc, milestone) => {
      acc[milestone.id] = Boolean(milestone.isExpanded);
      return acc;
    }, {})
  );

  const hasMilestones = milestones.length > 0;
  const toggleMilestone = (milestoneId: string) => {
    setExpandedIds((current) => ({
      ...current,
      [milestoneId]: !current[milestoneId],
    }));
  };

  if (!hasMilestones) {
    return <WMEmptyState body={copy.emptyMilestonesBody} title={copy.emptyMilestonesTitle} />;
  }

  return (
    <JournalCard style={styles.card} variant="standard">
      <View style={styles.header}>
        <WMText variant="pageTitle">{copy.timedMilestonesTitle}</WMText>
        <WMText style={styles.support} variant="bodySm">
          {copy.timedMilestonesBody}
        </WMText>
      </View>

      <View style={styles.list}>
        {milestones.map((milestone, index) => (
          <MilestoneRow
            expanded={Boolean(expandedIds[milestone.id])}
            key={milestone.id}
            locale={locale}
            milestone={milestone}
            onCompleteMilestone={onCompleteMilestone}
            onOpenMarkDetail={onOpenMarkDetail}
            onRescheduleMilestone={onRescheduleMilestone}
            onSkipMilestone={onSkipMilestone}
            onToggle={() => toggleMilestone(milestone.id)}
            showConnector={index < milestones.length - 1}
          />
        ))}
      </View>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: foundationColors.border.soft,
  },
  header: {
    gap: spacing.xxs,
  },
  support: {
    color: foundationColors.ink.secondary,
  },
  list: {
    gap: spacing.sm,
  },
});
