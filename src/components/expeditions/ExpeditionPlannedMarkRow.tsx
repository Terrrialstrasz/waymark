import { ExpeditionPlannedMarkItem } from "./types";
import { Locale } from "../../types/ui";
import { buildMarkScreenReaderLabel, getPlannedMarkStatusTone, getStatusLabel, resolvePathChipIcon, resolvePlannedMarkPathId } from "./detailModel";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { JournalCard } from "../primitives/JournalCard";
import { EntityChip } from "../primitives/EntityChip";
import { StatusChip } from "../primitives/StatusChip";
import { WMText } from "../primitives/Text";
import { foundationColors, spacing } from "../../theme/tokens";
import { StyleSheet, View } from "react-native";
import { isFinalMarkInstanceStatus } from "../../domain/waymark/markStatus";

type Props = {
  mark: ExpeditionPlannedMarkItem;
  locale: Locale;
  onOpenMarkDetail?: (markId: string) => void;
};

export function ExpeditionPlannedMarkRow({ mark, locale, onOpenMarkDetail }: Props) {
  const pathId = resolvePlannedMarkPathId(mark);
  const interactive = Boolean(onOpenMarkDetail);
  const final = isFinalMarkInstanceStatus(mark.status);
  const content = (
    <View style={styles.content}>
      <View style={styles.topRow}>
        <WMText numberOfLines={2} style={[styles.title, final ? styles.titleFinal : null]} variant="bodyStrong">
          {mark.title}
        </WMText>
        {interactive ? <WaymarkIcon semanticName="utility.chevron" size="sm" state="muted" /> : null}
      </View>

      <View style={styles.metaRow}>
        <StatusChip label={getStatusLabel(mark.status, locale)} size="compact" stateTone={getPlannedMarkStatusTone(mark.status)} />
        <EntityChip
          iconSemanticName={resolvePathChipIcon(pathId)}
          label={mark.pathName}
          size="compact"
          variant="metadata"
        />
        {mark.timingLabel ? <EntityChip label={mark.timingLabel} size="compact" variant="metadata" /> : null}
      </View>

      {mark.subtitle ? (
        <WMText numberOfLines={3} style={styles.subtitle} variant="bodySm">
          {mark.subtitle}
        </WMText>
      ) : null}
    </View>
  );

  return (
    <JournalCard
      accessibilityLabel={buildMarkScreenReaderLabel(mark, locale)}
      accessibilityRole={interactive ? "button" : "summary"}
      actionable={interactive}
      contentStyle={styles.cardContent}
      onPress={interactive ? () => onOpenMarkDetail?.(mark.id) : undefined}
      style={styles.card}
      variant="nested"
    >
      {content}
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: foundationColors.border.soft,
  },
  cardContent: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  content: {
    gap: spacing.xs,
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
  },
  title: {
    color: foundationColors.ink.primary,
    flex: 1,
    minWidth: 0,
  },
  titleFinal: {
    color: foundationColors.ink.disabled,
    textDecorationLine: "line-through",
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
  },
});
