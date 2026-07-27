import { type ReactNode, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { MarksToLeaveSection } from "../today/MarksToLeaveSection";
import { TodayMarkActionSheet } from "../today/TodayMarkActionSheet";
import { TodayMarkItem } from "../today/__fixtures__/todayCarousel.fixtures";
import { JournalStripRow } from "../journal/JournalStripRow";
import {
  CloseTrailFixture,
  TrailClosedChipViewModel,
  TrailClosedResultViewModel,
} from "./__fixtures__/closeTrail.fixtures";
import { Locale } from "../../types/ui";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WMText } from "../primitives/Text";
import { WMButton } from "../primitives/WMButton";
import { JournalCard } from "../primitives/JournalCard";
import { StatusChip } from "../primitives/StatusChip";
import { EntityChip } from "../primitives/EntityChip";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { foundationColors, semanticBorder, semanticRadius, spacing } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { MoveMarkValue, QuickSubstituteValue } from "../planned-mark/PlannedMarkActionSheetContent";
import { resolveSelectedDisciplines } from "./model";

type Props = {
  locale: Locale;
  fixture: CloseTrailFixture;
  errorMessage?: string | null;
  withShell?: boolean;
  onCloseDay?: (input: {
    disciplineSelections?: Array<{ key: string; label: string; pathId: string; expeditionId?: string; milestoneId?: string }>;
    tomorrowFirstStep?: string;
  }) => void;
  onBackToToday?: () => void;
  onViewInJournal?: () => void;
  onMarkAction?: (markId: string) => void;
  onMoveMark?: (markId: string, value: MoveMarkValue) => void;
  onSkipMark?: (markId: string) => void;
  onSubstituteWithExisting?: (markId: string, substituteMarkId: string) => void;
  onSubstituteWithQuickMark?: (markId: string, value: QuickSubstituteValue) => void;
  onOpenDependencyMark?: (markId: string) => void;
  onOpenDependencyPackCheck?: (packCheckId: string) => void;
};

export function CloseTrailScreen({
  locale,
  fixture,
  errorMessage,
  withShell = true,
  onCloseDay,
  onBackToToday,
  onViewInJournal,
  onMarkAction,
  onMoveMark,
  onSkipMark,
  onSubstituteWithExisting,
  onSubstituteWithQuickMark,
}: Props) {
  const [selectedDisciplineKeys, setSelectedDisciplineKeys] = useState<string[]>([]);
  const [selectedMark, setSelectedMark] = useState<TodayMarkItem | null>(null);
  const [markSheetVisible, setMarkSheetVisible] = useState(false);

  const content =
    fixture.phase === "review" ? (
      <View style={styles.stack}>
        <PageHeader
          decorativeAccent
          subtitle={locale === "vi" ? "Chi gi thuoc ve viec khep hom nay." : "Only what belongs to closing today."}
          title={locale === "vi" ? "Khep ngay" : "Close the Trail"}
          variant="quiet"
        />

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <WMText style={styles.errorTitle} variant="bodyStrong">
              {locale === "vi" ? "Khong the khep trail" : "Unable to close the trail"}
            </WMText>
            <WMText style={styles.errorBody} variant="bodySm">
              {errorMessage}
            </WMText>
          </View>
        ) : null}

        <MarksToLeaveSection
          marks={fixture.marks as TodayMarkItem[]}
          locale={locale}
          variant="closeTrailReview"
          onOpenMarkDetail={(mark) => {
            setSelectedMark(mark as TodayMarkItem);
            setMarkSheetVisible(true);
          }}
        />

        <TodayMarkActionSheet
          visible={markSheetVisible}
          item={selectedMark}
          marks={fixture.marks as TodayMarkItem[]}
          locale={locale}
          onClose={() => {
            setMarkSheetVisible(false);
            setSelectedMark(null);
          }}
          onOpenDependencyMark={() => undefined}
          onOpenDependencyPackCheck={() => undefined}
          onOpenSignal={() => undefined}
          onMark={(id) => onMarkAction?.(id)}
          onMove={(id, value) => onMoveMark?.(id, value)}
          onSkip={(id) => onSkipMark?.(id)}
          onSubstituteWithExisting={(markId, substituteMarkId) => onSubstituteWithExisting?.(markId, substituteMarkId)}
          onSubstituteWithQuickMark={(markId, value) => onSubstituteWithQuickMark?.(markId, value)}
        />

        <ReviewCard title={locale === "vi" ? "Ky uc tu hom nay" : "Memories from Today"}>
          {fixture.memories.length === 0 ? (
            <WMText style={styles.secondaryText} variant="body">
              {locale === "vi" ? "Chua co ky uc nao duoc luu hom nay." : "No memories have been saved today."}
            </WMText>
          ) : (
            fixture.memories.map((memory) => (
              <JournalStripRow
                key={memory.id}
                variant="closeTrail"
                title={memory.title[locale]}
                metadata={formatMemoryMetadata(memory.metadata?.[locale], locale)}
                chips={[]}
                onPress={() => {}}
              />
            ))
          )}
        </ReviewCard>

        <ReviewCard title={fixture.disciplineCluster.title[locale]}>
          <WMText variant="bodyStrong">{fixture.disciplineCluster.question[locale]}</WMText>
          <WMText style={styles.secondaryText} variant="bodySm">
            {fixture.disciplineCluster.subtitle[locale]}
          </WMText>
          <View style={styles.quickChipsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller}>
              {fixture.disciplineCluster.items.map((chipItem) => {
                const selected = selectedDisciplineKeys.includes(chipItem.key);
                return (
                  <Pressable
                    key={chipItem.key}
                    onPress={() =>
                      setSelectedDisciplineKeys((current) =>
                        current.includes(chipItem.key)
                          ? current.filter((value) => value !== chipItem.key)
                          : [...current, chipItem.key],
                      )
                    }
                    style={[styles.chipButton, selected ? styles.chipButtonSelected : null, styles.quickChip]}
                  >
                    <WMText style={selected ? styles.chipTextSelected : styles.chipTextDefault} variant="meta">
                      {chipItem.label[locale]}
                    </WMText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </ReviewCard>

        <ReviewCard title={fixture.firstStep.title[locale]}>
          <WMText variant="bodyStrong">{fixture.firstStep.value[locale]}</WMText>
          <View style={styles.chipWrap}>
            {fixture.firstStep.chips.map((chipItem) => (
              <StaticChip key={chipItem.id} label={chipItem.label[locale]} />
            ))}
          </View>
        </ReviewCard>

        <WMButton
          fullWidth
          label={locale === "vi" ? "Khep trail" : "Close the Trail"}
          onPress={() =>
            onCloseDay?.({
              disciplineSelections: resolveSelectedDisciplines(fixture.disciplineCluster, selectedDisciplineKeys, locale),
              tomorrowFirstStep: fixture.firstStep.plannedMarkId ? fixture.firstStep.value[locale] : undefined,
            })
          }
        />
      </View>
    ) : (
      <TrailClosedResultContent
        fixture={fixture}
        locale={locale}
        onBackToToday={onBackToToday}
        onViewInJournal={onViewInJournal}
      />
    );

  if (!withShell) {
    return content;
  }

  return (
    <FieldJournalScreenShell botanicalAmbient botanicalMotifs={["botanical.headerSystemSprig"]} variant="navAware">
      {content}
    </FieldJournalScreenShell>
  );
}

function TrailClosedResultContent({
  fixture,
  locale,
  onBackToToday,
  onViewInJournal,
}: {
  fixture: TrailClosedResultViewModel;
  locale: Locale;
  onBackToToday?: () => void;
  onViewInJournal?: () => void;
}) {
  return (
    <View style={styles.stack}>
      <PageHeader decorativeAccent subtitle={fixture.subtitle[locale]} title={fixture.title[locale]} variant="quiet" />

      <TrailClosedJudgmentHeroCard card={fixture} locale={locale} />
      <TrailClosedCharacterJudgmentCard card={fixture} locale={locale} />
      <TrailClosedSummaryCard card={fixture} locale={locale} />
      <TrailClosedDisciplineProofSummary card={fixture} locale={locale} />
      <TrailClosedTomorrowFirstStepCard card={fixture} locale={locale} />

      <View style={styles.actionBlock}>
        {onBackToToday ? (
          <WMButton
            fullWidth
            label={locale === "vi" ? "Quay lai Today" : "Back to Today"}
            onPress={onBackToToday}
            variant="secondary"
          />
        ) : null}
        <WMButton
          fullWidth
          label={locale === "vi" ? "Xem trong Journal" : "View in Journal"}
          onPress={onViewInJournal}
        />
      </View>
    </View>
  );
}

function TrailClosedJudgmentHeroCard({
  card,
  locale,
}: {
  card: TrailClosedResultViewModel;
  locale: Locale;
}) {
  const { width } = useWindowDimensions();
  const stackedBottomRow = width <= 320;
  const judgmentTitleTone =
    card.dayJudgmentHero.judgment === "marked" ? styles.heroTitleMarked : styles.heroTitleRepair;
  return (
    <JournalCard
      contentStyle={styles.heroCardContent}
      decorative
      decorationPreset="resultSeal"
      stateTone={card.dayJudgmentHero.judgment === "marked" ? "protected" : "weak"}
      variant="hero"
    >
      <View style={styles.heroCardLayout}>
        <View style={styles.heroTopColumn}>
          <WMText style={styles.heroEyebrow} variant="meta">
            {locale === "vi" ? "Phan quyet ngay" : "DAY JUDGMENT"}
          </WMText>
          <WMText
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            numberOfLines={1}
            style={[styles.heroTitle, judgmentTitleTone]}
            variant="judgmentHero"
          >
            {card.dayJudgmentHero.label[locale]}
          </WMText>
        </View>

        <View style={[styles.heroBottomRow, stackedBottomRow ? styles.heroBottomRowStacked : null]}>
          <TrailClosedDayJudgmentSeal semanticName={card.dayJudgmentHero.artworkSemanticName} />
          <View style={styles.heroSupportColumn}>
            <WMText style={styles.heroSupport} variant="body">
              {card.dayJudgmentHero.supportText[locale]}
            </WMText>
            {card.dayJudgmentHero.evidenceChips.length > 0 ? (
              <View style={styles.chipWrap}>
                {card.dayJudgmentHero.evidenceChips.map((chipItem) => (
                  <StatusChip key={chipItem.id} label={chipItem.label[locale]} size="compact" stateTone={chipItem.stateTone} />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </JournalCard>
  );
}

function TrailClosedDayJudgmentSeal({
  semanticName,
}: {
  semanticName: TrailClosedResultViewModel["dayJudgmentHero"]["artworkSemanticName"];
}) {
  return (
    <View style={styles.heroSealFrame}>
      <WaymarkIcon customWidth={136} decorative={false} semanticName={semanticName} size="custom" />
    </View>
  );
}

function TrailClosedSummaryCard({
  card,
  locale,
}: {
  card: TrailClosedResultViewModel;
  locale: Locale;
}) {
  const summary = card.plannedMarkOutcomeSummary;

  return (
    <JournalCard decorative decorationPreset="journalCard" variant="standard">
      <View style={styles.cardHeader}>
        <WMText variant="sectionTitle">{summary.title[locale]}</WMText>
      </View>
      <WMText style={styles.summarySentence} variant="body">
        {summary.sentence[locale]}
      </WMText>
      <View style={styles.chipWrap}>
        {summary.chips.map((chipItem) => (
          <StatusChip key={chipItem.id} label={chipItem.label[locale]} size="compact" stateTone={chipItem.stateTone} />
        ))}
      </View>

      {summary.substituted.length > 0 ? (
        <DetailGroup title={locale === "vi" ? "Da thay the" : "Substituted"}>
          {summary.substituted.map((item) => (
            <DetailRow
              key={item.originalMarkId}
              primary={`${item.originalTitle[locale]} -> ${item.substituteTitle[locale]}`}
              secondary={item.resultLabel ? item.resultLabel[locale] : undefined}
            />
          ))}
        </DetailGroup>
      ) : null}

      {summary.skipped.length > 0 ? (
        <DetailGroup title={locale === "vi" ? "Da bo qua" : "Skipped"}>
          {summary.skipped.map((item) => (
            <DetailRow
              key={item.markId}
              primary={item.title[locale]}
              secondary={item.reason ? `${locale === "vi" ? "Ly do" : "Reason"}: ${item.reason[locale]}` : undefined}
            />
          ))}
        </DetailGroup>
      ) : null}

      {summary.moved.length > 0 ? (
        <DetailGroup title={locale === "vi" ? "Da doi lich" : "Moved"}>
          {summary.moved.map((item) => (
            <DetailRow
              key={item.markId}
              primary={`${item.title[locale]} -> ${item.destinationLabel[locale]}`}
              secondary={item.reason ? `${locale === "vi" ? "Ly do" : "Reason"}: ${item.reason[locale]}` : undefined}
            />
          ))}
        </DetailGroup>
      ) : null}

      <DetailGroup title={locale === "vi" ? "Can sua lai" : "Need repair"}>
        {summary.unresolvedPreview.length === 0 ? (
          <WMText style={styles.secondaryText} variant="bodySm">
            {locale === "vi" ? "Khong co planned mark nao can sua lai." : "No planned marks need repair."}
          </WMText>
        ) : (
          summary.unresolvedPreview.map((item) => (
            <DetailRow
              key={item.markId}
              primary={item.title[locale]}
            />
          ))
        )}
        {summary.unresolvedMoreCount > 0 ? (
          <WMText style={styles.secondaryText} variant="bodySm">
            {`+${summary.unresolvedMoreCount} ${locale === "vi" ? "moc can sua lai nua" : "more need repair"}`}
          </WMText>
        ) : null}
      </DetailGroup>
    </JournalCard>
  );
}

function TrailClosedCharacterJudgmentCard({
  card,
  locale,
}: {
  card: TrailClosedResultViewModel;
  locale: Locale;
}) {
  const { width } = useWindowDimensions();
  const stackedBottomRow = width <= 320;
  const characterTitleTone =
    card.characterJudgment.judgment === "protected" ? styles.characterTitleProtected : styles.characterTitleRepair;

  return (
    <JournalCard
      contentStyle={styles.characterCardContent}
      stateTone={card.characterJudgment.judgment === "protected" ? "protected" : "weak"}
      variant="readOnly"
    >
      <View style={styles.characterCardLayout}>
        <View style={styles.characterTopColumn}>
          <WMText style={styles.heroEyebrow} variant="meta">
            {locale === "vi" ? "Phan quyet pham chat" : "CHARACTER JUDGMENT"}
          </WMText>
          <WMText
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            numberOfLines={1}
            style={[styles.characterTitle, characterTitleTone]}
            variant="judgmentHero"
          >
            {card.characterJudgment.label[locale]}
          </WMText>
        </View>

        <View style={[styles.characterBottomRow, stackedBottomRow ? styles.heroBottomRowStacked : null]}>
          {card.characterJudgment.artworkSemanticName ? (
            <View style={styles.characterSealFrame}>
              <WaymarkIcon
                customWidth={92}
                decorative={false}
                semanticName={card.characterJudgment.artworkSemanticName}
                size="custom"
              />
            </View>
          ) : null}
          <View style={styles.characterSupportColumn}>
            <WMText style={styles.characterSupport} variant="bodySm">
              {card.characterJudgment.supportText[locale]}
            </WMText>
            {card.characterJudgment.chips.length > 0 ? (
              <View style={styles.chipWrap}>
                {card.characterJudgment.chips.map((chipItem) => (
                  <StatusChip key={chipItem.id} label={chipItem.label[locale]} size="compact" stateTone={chipItem.stateTone} />
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </JournalCard>
  );
}

function TrailClosedDisciplineProofSummary({
  card,
  locale,
}: {
  card: TrailClosedResultViewModel;
  locale: Locale;
}) {
  const rows = useMemo(
    () => card.disciplineProofSummary.rows.filter((row) => row.tone !== "repair" || row.text[locale].length > 0),
    [card.disciplineProofSummary.rows, locale],
  );

  return (
    <JournalCard variant="readOnly">
      <WMText variant="sectionTitle">{card.disciplineProofSummary.title[locale]}</WMText>
      {rows.length === 0 ? (
        <WMText style={styles.secondaryText} variant="bodySm">
          {card.disciplineProofSummary.emptyText[locale]}
        </WMText>
      ) : (
        <View style={styles.disciplineList}>
          {rows.map((row) => (
            <View key={row.key} style={styles.disciplineRow}>
              <StatusChip
                label={row.label[locale]}
                size="compact"
                stateTone={row.tone === "positive" ? "protected" : row.tone === "repair" ? "weak" : "quieted"}
              />
              <WMText style={styles.disciplineText} variant="bodySm">
                {row.text[locale]}
              </WMText>
            </View>
          ))}
        </View>
      )}
    </JournalCard>
  );
}

function TrailClosedTomorrowFirstStepCard({
  card,
  locale,
}: {
  card: TrailClosedResultViewModel;
  locale: Locale;
}) {
  const firstStep = card.tomorrowFirstStep;
  return (
    <JournalCard variant="readOnly">
      <WMText variant="sectionTitle">{firstStep.title[locale]}</WMText>
      <WMText variant="bodyStrong">
        {firstStep.plannedMarkId ? firstStep.value[locale] : firstStep.emptyText[locale]}
      </WMText>
      {firstStep.plannedMarkId && firstStep.chips.length > 0 ? (
        <View style={styles.chipWrap}>
          {firstStep.chips.map((chipItem) => (
            <EntityChip key={chipItem.id} label={chipItem.label[locale]} size="compact" variant="metadata" />
          ))}
        </View>
      ) : null}
    </JournalCard>
  );
}

function ReviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <JournalCard variant="readOnly">
      <WMText variant="sectionTitle">{title}</WMText>
      <View style={styles.reviewBody}>{children}</View>
    </JournalCard>
  );
}

function DetailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.detailGroup}>
      <WMText style={styles.cardEyebrow} variant="meta">
        {title}
      </WMText>
      <View style={styles.detailRows}>{children}</View>
    </View>
  );
}

function DetailRow({
  primary,
  secondary,
  trailing,
}: {
  primary: string;
  secondary?: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailTextColumn}>
        <WMText variant="bodySm">{primary}</WMText>
        {secondary ? (
          <WMText style={styles.secondaryText} variant="meta">
            {secondary}
          </WMText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

function StaticChip({ label }: { label: string }) {
  return (
    <View style={styles.staticChip}>
      <WMText style={styles.staticChipText} variant="meta">
        {label}
      </WMText>
    </View>
  );
}

function formatMemoryMetadata(value: string | undefined, locale: Locale) {
  if (!value) return "";
  const maybeDate = new Date(value);
  if (!isNaN(maybeDate.getTime())) {
    const localeTag = locale === "vi" ? "vi-VN" : "en-US";
    return new Intl.DateTimeFormat(localeTag, { hour: "numeric", minute: "numeric" }).format(maybeDate);
  }
  return value;
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  reviewBody: {
    gap: spacing.sm,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  quickChipsContainer: {
    marginHorizontal: -spacing.xs,
  },
  chipScroller: {
    paddingHorizontal: spacing.xs,
  },
  chipButton: {
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: semanticRadius.chip,
    backgroundColor: foundationColors.bg.paperWarm,
    ...getBorderStyle(semanticBorder.card.subtle),
  },
  chipButtonSelected: {
    backgroundColor: foundationColors.green.base,
    borderColor: foundationColors.green.base,
  },
  quickChip: {
    minHeight: 40,
    justifyContent: "center",
  },
  chipTextDefault: {
    color: foundationColors.ink.secondary,
  },
  chipTextSelected: {
    color: foundationColors.ink.inverse,
  },
  staticChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: semanticRadius.chip,
    backgroundColor: foundationColors.bg.paperWarm,
    ...getBorderStyle(semanticBorder.card.subtle),
  },
  staticChipText: {
    color: foundationColors.ink.secondary,
  },
  secondaryText: {
    color: foundationColors.ink.secondary,
  },
  errorBanner: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: semanticRadius.card.default,
    backgroundColor: foundationColors.missed.soft,
    ...getBorderStyle(semanticBorder.card.subtle),
  },
  errorTitle: {
    color: foundationColors.ink.onClay,
  },
  errorBody: {
    color: foundationColors.ink.secondary,
  },
  heroCardLayout: {
    gap: spacing.xs,
  },
  heroCardContent: {
    gap: spacing.xs,
    paddingBottom: 14,
    paddingTop: 14,
  },
  heroTopColumn: {
    gap: 4,
  },
  heroBottomRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  heroBottomRowStacked: {
    alignItems: "flex-start",
    flexDirection: "column",
  },
  heroSealFrame: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
    flexBasis: "auto",
    justifyContent: "flex-start",
    minWidth: 116,
  },
  heroSupportColumn: {
    flex: 1,
    gap: 6,
    justifyContent: "center",
    minWidth: 0,
  },
  heroEyebrow: {
    color: foundationColors.gold.deep,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 38,
  },
  heroTitleMarked: {
    color: foundationColors.ink.onGreenSoft,
  },
  heroTitleRepair: {
    color: foundationColors.ink.onGold,
  },
  heroSupport: {
    color: foundationColors.ink.secondary,
    lineHeight: 22,
  },
  cardHeader: {
    gap: spacing.xs,
  },
  summarySentence: {
    color: foundationColors.ink.secondary,
    lineHeight: 24,
  },
  detailGroup: {
    gap: 6,
  },
  detailRows: {
    gap: spacing.xs,
  },
  detailRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  detailTextColumn: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  cardEyebrow: {
    color: foundationColors.ink.tertiary,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  characterCardContent: {
    gap: spacing.xs,
    paddingBottom: 14,
    paddingTop: 14,
  },
  characterCardLayout: {
    gap: spacing.xs,
  },
  characterTopColumn: {
    gap: 4,
  },
  characterBottomRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  characterSealFrame: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
    justifyContent: "flex-start",
    minWidth: 84,
  },
  characterSupportColumn: {
    flex: 1,
    gap: 6,
    justifyContent: "center",
    minWidth: 0,
  },
  characterTitle: {
    fontSize: 26,
    lineHeight: 31,
  },
  characterTitleProtected: {
    color: foundationColors.ink.onGreenSoft,
  },
  characterTitleRepair: {
    color: foundationColors.ink.onGold,
  },
  characterSupport: {
    color: foundationColors.ink.secondary,
    lineHeight: 20,
  },
  disciplineList: {
    gap: spacing.xs,
  },
  disciplineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  disciplineText: {
    color: foundationColors.ink.primary,
    flex: 1,
  },
  actionBlock: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
});
