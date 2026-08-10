import { Pressable, StyleSheet, View } from "react-native";
import { useMemo, useState } from "react";
import { getPathsCopy } from "../../i18n/pathsCopy";
import { fontFamilyTokens, foundationColors, getWaymarkPressStyle, semanticElevation, semanticRadius, spacing } from "../../theme/tokens";
import { BottomTabId, Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { BottomNavBar } from "../primitives/BottomNavBar";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMSectionHeader } from "../primitives/WMSectionHeader";
import { WMText } from "../primitives/Text";
import { PathPulseCard } from "./PathPulseCard";
import { WhyThisPathCard } from "./WhyThisPathCard";
import { NextMarkItem, PathDetailExpeditionItem, PathDetailItem, PathDetailMarkItem, PathDetailMilestoneItem, PathProofItem } from "./types";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMButton } from "../primitives/WMButton";
import { getTodayPathHeroPath } from "../../lib/waymark/todayPathHero";

type Props = {
  locale: Locale;
  path: PathDetailItem;
  proofs: PathProofItem[];
  nextMarks: NextMarkItem[];
  expeditions: PathDetailExpeditionItem[];
  onBack?: () => void;
  onMore?: () => void;
  onOpenProof?: (item: PathProofItem) => void;
  onOpenNextMark?: (item: NextMarkItem) => void;
  onOpenMilestoneMark?: (item: PathDetailMarkItem) => void;
  onOpenExpedition?: (item: PathDetailExpeditionItem) => void;
  onCompleteMilestone?: (milestoneId: string) => void;
  onViewAllExpeditions?: () => void;
  onRescheduleMilestone?: (milestoneId: string) => void;
  onSkipMilestone?: (milestoneId: string) => void;
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
  onOpenMilestoneMark,
  onOpenExpedition,
  onCompleteMilestone,
  onViewAllExpeditions,
  onRescheduleMilestone,
  onSkipMilestone,
  primaryAction,
  showBottomNav = true,
  onTabPress,
}: Props) {
  const c = getPathsCopy(locale);
  const pathTitle = t(path.title, locale);
  const pathHero = getTodayPathHeroPath(path.pathId);
  const pathDescription = path.statement ? t(path.statement, locale) : pathHero.subtitle[locale].replace(/\n/gu, " ");
  const sortedExpeditions = useMemo(
    () => [...expeditions].sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title)),
    [expeditions],
  );

  return (
    <FieldJournalScreenShell botanicalAmbient botanicalMotifs={["botanical.trailCurve"]} variant="navAware">
      <PageHeader
        backLabel={locale === "vi" ? "Quay lai" : "Back"}
        eyebrow={c.detail.pathLabel}
        onBack={onBack}
        showBack
        title={pathTitle}
        variant="withBack"
      />

      <PathHeroCard locale={locale} onMore={onMore} path={path} subtitle={pathDescription} />

      {primaryAction ? <WMButton fullWidth label={primaryAction.label} onPress={primaryAction.onPress} variant="primary" /> : null}

      <PathExpeditionTree
        emptyBody={c.detail.expeditionsEmptyBody}
        emptyTitle={c.detail.expeditionsEmptyTitle}
        expeditions={sortedExpeditions}
        locale={locale}
        onCompleteMilestone={onCompleteMilestone}
        onOpenMilestoneMark={onOpenMilestoneMark}
        onOpenExpedition={onOpenExpedition}
        onRescheduleMilestone={onRescheduleMilestone}
        onSkipMilestone={onSkipMilestone}
        title={c.detail.currentExpeditionsTitle}
      />

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

      {path.whyThisPathBody ? <WhyThisPathCard body={t(path.whyThisPathBody, locale)} locale={locale} pathId={path.pathId} /> : null}

      {showBottomNav ? <BottomNavBar activeTab="paths" locale={locale} onTabPress={onTabPress} /> : null}
    </FieldJournalScreenShell>
  );
}

function PathHeroCard({
  locale,
  onBack,
  onMore,
  path,
  subtitle,
  title,
}: {
  locale: Locale;
  onBack?: () => void;
  onMore?: () => void;
  path: PathDetailItem;
  subtitle: string;
  title?: string;
}) {
  const hero = getTodayPathHeroPath(path.pathId);

  return (
    <View style={[styles.heroCard, { borderColor: hero.color.accentMuted }]}>
      {hero.heroAssetId ? (
        <WaymarkImage
          alt={hero.heroAlt[locale]}
          assetId={hero.heroAssetId}
          decorative
          imageStyle={styles.heroImage}
          priority
          style={styles.heroImageFrame}
          usage="hero"
        />
      ) : (
        <View style={[styles.heroImageFrame, { backgroundColor: hero.color.accentSoft }]} />
      )}
      <View style={styles.heroShade} />
      <View style={styles.heroTopBar}>
        {onBack ? (
          <Pressable
            accessibilityLabel={locale === "vi" ? "Quay lai" : "Back"}
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [styles.heroIconButton, pressed ? styles.heroIconButtonPressed : null]}
          >
            <WMText style={styles.heroBackGlyph} variant="sectionTitle">
              ‹
            </WMText>
          </Pressable>
        ) : (
          <View style={styles.heroIconSpacer} />
        )}
        {onMore ? (
          <Pressable
            accessibilityLabel={locale === "vi" ? "Them tuy chon path" : "More path options"}
            accessibilityRole="button"
            onPress={onMore}
            style={({ pressed }) => [styles.heroIconButton, pressed ? styles.heroIconButtonPressed : null]}
          >
            <WMText style={styles.heroMoreGlyph} variant="sectionTitle">
              ⋯
            </WMText>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.heroCopy}>
        <WMText style={styles.heroEyebrow} variant="metaCompact">
          {locale === "vi" ? "PATH" : "PATH"}
        </WMText>
        <WMText numberOfLines={2} style={styles.heroTitle} variant="screenTitle">
          {title}
        </WMText>
        <WMText
          numberOfLines={2}
          style={[
            styles.heroSubtitle,
            {
              backgroundColor: hero.color.heroPatch,
              borderColor: hero.color.heroPatchBorder,
              color: hero.color.accentDeep,
            },
          ]}
          variant="bodySm"
        >
          {subtitle}
        </WMText>
      </View>
    </View>
  );
}

function PathExpeditionTree({
  emptyBody,
  emptyTitle,
  expeditions,
  locale,
  onOpenMilestoneMark,
  onOpenExpedition,
  onCompleteMilestone,
  onRescheduleMilestone,
  onSkipMilestone,
  title,
}: {
  emptyBody: string;
  emptyTitle: string;
  expeditions: PathDetailExpeditionItem[];
  locale: Locale;
  onOpenMilestoneMark?: (item: PathDetailMarkItem) => void;
  onOpenExpedition?: (item: PathDetailExpeditionItem) => void;
  onCompleteMilestone?: (milestoneId: string) => void;
  onRescheduleMilestone?: (milestoneId: string) => void;
  onSkipMilestone?: (milestoneId: string) => void;
  title: string;
}) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpedition = (expeditionId: string) => {
    setExpandedIds((current) => ({
      ...current,
      [expeditionId]: !current[expeditionId],
    }));
  };

  return (
    <View style={styles.expeditionTree}>
      <WMSectionHeader title={title} />
      {expeditions.length > 0 ? (
        <View style={styles.expeditionList}>
          {expeditions.map((expedition) => (
            <PathExpeditionAccordion
              key={expedition.id}
              expanded={expandedIds[expedition.id] ?? false}
              expedition={expedition}
              locale={locale}
              onCompleteMilestone={onCompleteMilestone}
              onOpenMilestoneMark={onOpenMilestoneMark}
              onOpenExpedition={onOpenExpedition}
              onRescheduleMilestone={onRescheduleMilestone}
              onSkipMilestone={onSkipMilestone}
              onToggle={() => toggleExpedition(expedition.id)}
            />
          ))}
        </View>
      ) : (
        <WMEmptyState body={emptyBody} title={emptyTitle} />
      )}
    </View>
  );
}

function PathExpeditionAccordion({
  expanded,
  expedition,
  locale,
  onCompleteMilestone,
  onOpenMilestoneMark,
  onOpenExpedition,
  onRescheduleMilestone,
  onSkipMilestone,
  onToggle,
}: {
  expanded: boolean;
  expedition: PathDetailExpeditionItem;
  locale: Locale;
  onCompleteMilestone?: (milestoneId: string) => void;
  onOpenMilestoneMark?: (item: PathDetailMarkItem) => void;
  onOpenExpedition?: (item: PathDetailExpeditionItem) => void;
  onRescheduleMilestone?: (milestoneId: string) => void;
  onSkipMilestone?: (milestoneId: string) => void;
  onToggle: () => void;
}) {
  const completedCount = expedition.milestones.filter((milestone) => milestone.status === "completed").length;
  const sortedMilestones = [...expedition.milestones].sort(comparePathMilestones);
  const [expandedMilestoneIds, setExpandedMilestoneIds] = useState<Record<string, boolean>>({});
  const noMilestoneGroupId = `${expedition.id}:no-milestone`;
  const hasUnassignedMarks = expedition.unassignedMarks.length > 0;
  const hasMilestoneContent = sortedMilestones.length > 0 || hasUnassignedMarks;

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestoneIds((current) => ({
      ...current,
      [milestoneId]: !current[milestoneId],
    }));
  };

  return (
    <View style={styles.expeditionCard}>
      <Pressable
        accessibilityLabel={expanded ? collapseExpeditionLabel(expedition.title, locale) : expandExpeditionLabel(expedition.title, locale)}
        accessibilityRole="button"
        onPress={onToggle}
        style={({ pressed }) => [styles.expeditionHeader, getWaymarkPressStyle({ pressed, reducedMotion: false, variant: "secondary" })]}
      >
        <View style={styles.expeditionHeaderCopy}>
          <WMText numberOfLines={2} style={styles.expeditionTitle} variant="bodyStrong">
            {expedition.title}
          </WMText>
          <WMText numberOfLines={1} style={styles.expeditionMeta} variant="meta">
            {buildExpeditionMeta(expedition, completedCount, locale)}
          </WMText>
        </View>
        <WaymarkIcon decorative semanticName={expanded ? "utility.chevronUp" : "utility.chevronDown"} size="sm" state="muted" />
      </Pressable>

      {expanded ? (
        <View style={styles.milestonePanel}>
          {hasMilestoneContent ? (
            sortedMilestones.map((milestone, index) => (
              <PathMilestoneRow
                key={milestone.id}
                expanded={expandedMilestoneIds[milestone.id] ?? false}
                index={index}
                locale={locale}
                milestone={milestone}
                onCompleteMilestone={onCompleteMilestone}
                onOpenMilestoneMark={onOpenMilestoneMark}
                onRescheduleMilestone={onRescheduleMilestone}
                onSkipMilestone={onSkipMilestone}
                onToggle={() => toggleMilestone(milestone.id)}
              />
            ))
          ) : (
            <WMText style={styles.emptyMilestonesText} variant="bodySm">
              {locale === "vi" ? "Expedition nay chua co milestone." : "This expedition does not have milestones yet."}
            </WMText>
          )}
          {hasUnassignedMarks ? (
            <PathNoMilestoneRow
              expanded={expandedMilestoneIds[noMilestoneGroupId] ?? false}
              locale={locale}
              marks={expedition.unassignedMarks}
              onOpenMilestoneMark={onOpenMilestoneMark}
              onToggle={() => toggleMilestone(noMilestoneGroupId)}
            />
          ) : null}
          {onOpenExpedition ? (
            <Pressable
              accessibilityLabel={locale === "vi" ? `Mo chi tiet expedition ${expedition.title}` : `Open expedition detail ${expedition.title}`}
              accessibilityRole="button"
              onPress={() => onOpenExpedition(expedition)}
              style={({ pressed }) => [styles.openExpeditionLink, pressed ? styles.openExpeditionLinkPressed : null]}
            >
              <WMText style={styles.openExpeditionText} variant="metaCompact">
                {locale === "vi" ? "Open Expedition Detail" : "Open Expedition Detail"}
              </WMText>
              <WaymarkIcon decorative semanticName="utility.chevron" size="xs" state="muted" />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function PathNoMilestoneRow({
  expanded,
  locale,
  marks,
  onOpenMilestoneMark,
  onToggle,
}: {
  expanded: boolean;
  locale: Locale;
  marks: PathDetailMarkItem[];
  onOpenMilestoneMark?: (item: PathDetailMarkItem) => void;
  onToggle: () => void;
}) {
  return (
    <View style={styles.milestoneStack}>
      <Pressable
        accessibilityLabel={expanded ? noMilestoneCollapseLabel(locale) : noMilestoneExpandLabel(locale)}
        accessibilityRole="button"
        onPress={onToggle}
        style={({ pressed }) => [styles.milestoneRow, pressed ? styles.milestoneRowPressed : null]}
      >
        <View style={[styles.milestoneOrdinal, styles.noMilestoneOrdinal]}>
          <WMText style={styles.noMilestoneOrdinalText} variant="metaCompact">
            --
          </WMText>
        </View>
        <View style={styles.milestoneCopy}>
          <WMText numberOfLines={2} style={styles.milestoneTitle} variant="bodyStrong">
            {locale === "vi" ? "Khong co milestone" : "No milestone"}
          </WMText>
          <WMText numberOfLines={1} style={styles.milestoneMeta} variant="metaCompact">
            {formatNoMilestoneMarkCount(marks.length, locale)}
          </WMText>
        </View>
        <WaymarkIcon decorative semanticName={expanded ? "utility.chevronUp" : "utility.chevronDown"} size="xs" state="muted" />
      </Pressable>

      {expanded ? (
        <View style={styles.milestoneExpandedPanel}>
          <View style={styles.milestoneMarksPanel}>
            <WMText style={styles.milestoneMarksLabel} variant="metaCompact">
              {locale === "vi" ? "MARKS" : "MARKS"}
            </WMText>
            <View style={styles.pathMarkList}>
              {marks.map((mark) => (
                <PathMilestoneMarkRow key={mark.id} locale={locale} mark={mark} onOpenMark={onOpenMilestoneMark} />
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PathMilestoneRow({
  expanded,
  index,
  locale,
  milestone,
  onCompleteMilestone,
  onOpenMilestoneMark,
  onRescheduleMilestone,
  onSkipMilestone,
  onToggle,
}: {
  expanded: boolean;
  index: number;
  locale: Locale;
  milestone: PathDetailMilestoneItem;
  onCompleteMilestone?: (milestoneId: string) => void;
  onOpenMilestoneMark?: (item: PathDetailMarkItem) => void;
  onRescheduleMilestone?: (milestoneId: string) => void;
  onSkipMilestone?: (milestoneId: string) => void;
  onToggle: () => void;
}) {
  const done = milestone.status === "completed";
  const closed = done || milestone.status === "missed" || milestone.status === "archived";
  return (
    <View style={styles.milestoneStack}>
      <Pressable
        accessibilityLabel={expanded ? collapseMilestoneLabel(milestone.title, locale) : expandMilestoneLabel(milestone.title, locale)}
        accessibilityRole="button"
        onPress={onToggle}
        style={({ pressed }) => [styles.milestoneRow, pressed ? styles.milestoneRowPressed : null]}
      >
        <View style={[styles.milestoneOrdinal, done ? styles.milestoneOrdinalDone : null]}>
          <WMText style={[styles.milestoneOrdinalText, done ? styles.milestoneOrdinalTextDone : null]} variant="metaCompact">
            {String(index + 1).padStart(2, "0")}
          </WMText>
        </View>
        <View style={styles.milestoneCopy}>
          <WMText numberOfLines={2} style={[styles.milestoneTitle, done ? styles.milestoneTitleDone : null]} variant="bodyStrong">
            {milestone.title}
          </WMText>
          <WMText numberOfLines={1} style={[styles.milestoneMeta, done ? styles.milestoneMetaDone : null]} variant="metaCompact">
            {buildMilestoneMeta(milestone, locale)}
          </WMText>
        </View>
        <WaymarkIcon decorative semanticName={expanded ? "utility.chevronUp" : "utility.chevronDown"} size="xs" state="muted" />
      </Pressable>

      {expanded ? (
        <View style={styles.milestoneExpandedPanel}>
          <View style={styles.milestoneActionsRow}>
            <PathMilestoneActionButton
              disabled={!onCompleteMilestone || closed}
              label={locale === "vi" ? "Hoan thanh" : "Complete"}
              tone="done"
              onPress={() => onCompleteMilestone?.(milestone.id)}
            />
            <PathMilestoneActionButton
              disabled={!onRescheduleMilestone || closed}
              label={locale === "vi" ? "Doi lich" : "Reschedule"}
              tone="move"
              onPress={() => onRescheduleMilestone?.(milestone.id)}
            />
            <PathMilestoneActionButton
              disabled={!onSkipMilestone || closed}
              label={locale === "vi" ? "Huy" : "Cancel"}
              tone="cancel"
              onPress={() => onSkipMilestone?.(milestone.id)}
            />
          </View>
          <View style={styles.milestoneMarksPanel}>
            <WMText style={styles.milestoneMarksLabel} variant="metaCompact">
              {locale === "vi" ? "MARKS" : "MARKS"}
            </WMText>
            {milestone.marks.length > 0 ? (
              <View style={styles.pathMarkList}>
                {milestone.marks.map((mark) => (
                  <PathMilestoneMarkRow key={mark.id} locale={locale} mark={mark} onOpenMark={onOpenMilestoneMark} />
                ))}
              </View>
            ) : (
              <WMText style={styles.emptyMilestonesText} variant="bodySm">
                {locale === "vi" ? "Chua co mark nao link milestone nay." : "No marks are linked to this milestone yet."}
              </WMText>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PathMilestoneActionButton({
  disabled,
  label,
  onPress,
  tone,
}: {
  disabled?: boolean;
  label: string;
  onPress?: () => void;
  tone: "done" | "move" | "cancel";
}) {
  const color =
    tone === "done"
      ? foundationColors.green.deep
      : tone === "move"
        ? foundationColors.gold.deep
        : foundationColors.clay.base;
  const icon = tone === "done" ? "✓" : tone === "move" ? "↻" : "×";

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pathMilestoneActionButton,
        { borderColor: color, opacity: disabled ? 0.38 : pressed ? 0.76 : 1 },
      ]}
    >
      <WMText style={[styles.pathMilestoneActionIcon, { color }]} variant="sectionTitle">
        {icon}
      </WMText>
    </Pressable>
  );
}

function PathMilestoneMarkRow({
  locale,
  mark,
  onOpenMark,
}: {
  locale: Locale;
  mark: PathDetailMarkItem;
  onOpenMark?: (item: PathDetailMarkItem) => void;
}) {
  const interactive = Boolean(onOpenMark);
  const done = mark.isDone;
  return (
    <Pressable
      accessibilityLabel={locale === "vi" ? `Mo mark ${mark.title}` : `Open mark ${mark.title}`}
      accessibilityRole={interactive ? "button" : "text"}
      disabled={!interactive}
      onPress={() => onOpenMark?.(mark)}
      style={({ pressed }) => [styles.pathMarkRow, done ? styles.pathMarkRowDone : null, pressed ? styles.pathMarkRowPressed : null]}
    >
      <WMText numberOfLines={1} style={[styles.pathMarkTime, done ? styles.pathMarkMetaDone : null]} variant="metaCompact">
        {formatMarkTime(mark, locale)}
      </WMText>
      <WMText numberOfLines={2} style={[styles.pathMarkTitle, done ? styles.pathMarkTitleDone : null]} variant="bodySm">
        {mark.title}
      </WMText>
      <WMText numberOfLines={1} style={[styles.pathMarkStatus, done ? styles.pathMarkMetaDone : null]} variant="metaCompact">
        {markStatusLabel(mark.status, locale)}
      </WMText>
    </Pressable>
  );
}

function buildExpeditionMeta(expedition: PathDetailExpeditionItem, completedCount: number, locale: Locale) {
  const milestoneLabel =
    locale === "vi"
      ? `${completedCount}/${expedition.milestones.length} milestone`
      : `${completedCount}/${expedition.milestones.length} milestones`;
  const date = expedition.targetDate ? formatPathDate(expedition.targetDate) : null;
  return date ? `${milestoneLabel} · ${date}` : milestoneLabel;
}

function buildMilestoneMeta(milestone: PathDetailMilestoneItem, locale: Locale) {
  const statusLabel = milestoneStatusLabel(milestone.status, locale);
  const start = milestone.startDate ? formatPathDate(milestone.startDate) : null;
  const target = milestone.targetDate ? formatPathDate(milestone.targetDate) : null;
  const completed = milestone.completedAt ? formatPathDate(milestone.completedAt) : null;
  if (milestone.status === "completed" && completed) {
    return `${statusLabel} Â· ${completed}`;
  }
  if (start && target && start !== target) {
    return `${statusLabel} · ${start} - ${target}`;
  }
  return target ? `${statusLabel} · ${target}` : statusLabel;
}

function milestoneStatusLabel(status: PathDetailMilestoneItem["status"], locale: Locale) {
  const labels: Record<PathDetailMilestoneItem["status"], Record<Locale, string>> = {
    active: { en: "Active", vi: "Dang lam" },
    planned: { en: "Planned", vi: "Da len ke hoach" },
    completed: { en: "Completed", vi: "Hoan thanh" },
    missed: { en: "Missed", vi: "Missed" },
    archived: { en: "Cancelled", vi: "Cancelled" },
  };
  return labels[status][locale];
}

function expandExpeditionLabel(title: string, locale: Locale) {
  return locale === "vi" ? `Mo milestone cua expedition ${title}` : `Show milestones for ${title}`;
}

function collapseExpeditionLabel(title: string, locale: Locale) {
  return locale === "vi" ? `Thu gon milestone cua expedition ${title}` : `Hide milestones for ${title}`;
}

function expandMilestoneLabel(title: string, locale: Locale) {
  return locale === "vi" ? `Mo mark cua milestone ${title}` : `Show marks for milestone ${title}`;
}

function collapseMilestoneLabel(title: string, locale: Locale) {
  return locale === "vi" ? `Thu gon mark cua milestone ${title}` : `Hide marks for milestone ${title}`;
}

function noMilestoneExpandLabel(locale: Locale) {
  return locale === "vi" ? "Mo mark khong co milestone" : "Show marks without a milestone";
}

function noMilestoneCollapseLabel(locale: Locale) {
  return locale === "vi" ? "Thu gon mark khong co milestone" : "Hide marks without a milestone";
}

function formatNoMilestoneMarkCount(count: number, locale: Locale) {
  return locale === "vi" ? `${count} mark` : count === 1 ? "1 mark" : `${count} marks`;
}

function formatMarkTime(mark: PathDetailMarkItem, locale: Locale) {
  const value = mark.scheduledStartAt ?? mark.dueAt ?? mark.completedAt ?? mark.createdAt;
  const [datePart, timePart] = value.split("T");
  const date = formatPathDate(datePart);
  const time = timePart?.slice(0, 5);
  void locale;
  return time ? `${date} ${time}` : date;
}

function markStatusLabel(status: PathDetailMarkItem["status"], locale: Locale) {
  const labels: Record<PathDetailMarkItem["status"], Record<Locale, string>> = {
    planned: { en: "Planned", vi: "Planned" },
    ready: { en: "Ready", vi: "Ready" },
    blocked: { en: "Blocked", vi: "Blocked" },
    active: { en: "Active", vi: "Active" },
    completed: { en: "Done", vi: "Done" },
    partially_completed: { en: "Partial", vi: "Partial" },
    skipped: { en: "Cancelled", vi: "Cancelled" },
    rescheduled: { en: "Rescheduled", vi: "Rescheduled" },
    substituted: { en: "Substituted", vi: "Substituted" },
    expired: { en: "Expired", vi: "Expired" },
    cancelled: { en: "Cancelled", vi: "Cancelled" },
  };
  return labels[status][locale];
}

function comparePathMilestones(left: PathDetailMilestoneItem, right: PathDetailMilestoneItem) {
  return (
    getPathMilestoneSortDate(left).localeCompare(getPathMilestoneSortDate(right)) ||
    left.sortOrder - right.sortOrder ||
    (left.orderIndex ?? 0) - (right.orderIndex ?? 0) ||
    left.title.localeCompare(right.title)
  );
}

function getPathMilestoneSortDate(milestone: PathDetailMilestoneItem) {
  return milestone.startDate ?? milestone.targetDate ?? "9999-12-31";
}

function formatPathDate(value: string) {
  const [datePart] = value.split("T");
  const [, month, day] = datePart.split("-");
  return day && month ? `${day}/${month}` : datePart;
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: semanticRadius.card.hero,
    borderWidth: 1,
    boxShadow: semanticElevation.hero,
    height: 244,
    overflow: "hidden",
    position: "relative",
  },
  heroImageFrame: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28, 26, 19, 0.08)",
    zIndex: 1,
  },
  heroTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    zIndex: 3,
  },
  heroIconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 238, 0.58)",
    borderColor: "rgba(255, 250, 238, 0.48)",
    borderRadius: semanticRadius.badge,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  heroIconButtonPressed: {
    opacity: 0.72,
  },
  heroIconSpacer: {
    height: 44,
    width: 44,
  },
  heroBackGlyph: {
    color: foundationColors.ink.primary,
    fontSize: 34,
    lineHeight: 36,
    marginTop: -2,
  },
  heroMoreGlyph: {
    color: foundationColors.ink.primary,
    fontSize: 24,
    lineHeight: 28,
    marginTop: -6,
  },
  heroCopy: {
    gap: spacing.xs,
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  heroEyebrow: {
    display: "none",
    color: "rgba(255, 250, 238, 0.86)",
    fontWeight: "700",
    letterSpacing: 2,
  },
  heroTitle: {
    display: "none",
    color: foundationColors.bg.paper,
    textShadowColor: "rgba(0,0,0,0.22)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 7,
  },
  heroSubtitle: {
    alignSelf: "flex-start",
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    fontFamily: fontFamilyTokens.serif.runtime,
    fontSize: 18,
    fontStyle: "italic",
    fontWeight: "600",
    lineHeight: 25,
    maxWidth: "88%",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textShadowColor: "rgba(255,255,255,0.42)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pathStatement: {
    color: foundationColors.ink.secondary,
  },
  expeditionTree: {
    gap: spacing.sm,
  },
  expeditionList: {
    gap: spacing.sm,
  },
  expeditionCard: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    boxShadow: semanticElevation.card,
    overflow: "hidden",
  },
  expeditionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  expeditionHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  expeditionTitle: {
    color: foundationColors.ink.primary,
  },
  expeditionMeta: {
    color: foundationColors.ink.tertiary,
  },
  milestonePanel: {
    borderTopColor: foundationColors.border.subtle,
    borderTopWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  milestoneStack: {
    gap: spacing.xs,
  },
  milestoneRow: {
    alignItems: "flex-start",
    borderRadius: semanticRadius.button.compact,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  milestoneRowPressed: {
    backgroundColor: "rgba(64, 53, 40, 0.04)",
  },
  milestoneOrdinal: {
    alignItems: "center",
    backgroundColor: foundationColors.bg.paperWarm,
    borderColor: foundationColors.border.subtle,
    borderRadius: semanticRadius.badge,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  milestoneOrdinalDone: {
    backgroundColor: foundationColors.green.soft,
    borderColor: foundationColors.border.protected,
  },
  milestoneOrdinalText: {
    color: foundationColors.ink.tertiary,
    fontWeight: "700",
  },
  milestoneOrdinalTextDone: {
    color: foundationColors.green.deep,
  },
  noMilestoneOrdinal: {
    backgroundColor: foundationColors.bg.paperSoft,
  },
  noMilestoneOrdinalText: {
    color: foundationColors.ink.tertiary,
    fontWeight: "700",
  },
  milestoneCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  milestoneTitle: {
    color: foundationColors.ink.primary,
  },
  milestoneTitleDone: {
    color: foundationColors.ink.secondary,
    textDecorationLine: "line-through",
  },
  milestoneMeta: {
    color: foundationColors.ink.tertiary,
  },
  milestoneMetaDone: {
    color: foundationColors.ink.disabled,
  },
  milestoneExpandedPanel: {
    borderLeftColor: foundationColors.border.subtle,
    borderLeftWidth: 1,
    gap: spacing.sm,
    marginLeft: 16,
    paddingBottom: spacing.xs,
    paddingLeft: spacing.md,
  },
  milestoneActionsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  pathMilestoneActionButton: {
    alignItems: "center",
    backgroundColor: foundationColors.bg.paper,
    borderRadius: semanticRadius.badge,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingVertical: spacing.xs,
  },
  pathMilestoneActionIcon: {
    fontSize: 21,
    lineHeight: 24,
    fontWeight: "700",
  },
  milestoneMarksPanel: {
    gap: spacing.xs,
  },
  milestoneMarksLabel: {
    color: foundationColors.ink.secondary,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pathMarkList: {
    gap: spacing.xxs,
  },
  pathMarkRow: {
    alignItems: "flex-start",
    borderRadius: semanticRadius.button.compact,
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  pathMarkRowDone: {
    opacity: 0.82,
  },
  pathMarkRowPressed: {
    backgroundColor: "rgba(64, 53, 40, 0.04)",
  },
  pathMarkTime: {
    color: foundationColors.ink.secondary,
    minWidth: 68,
  },
  pathMarkTitle: {
    color: foundationColors.ink.primary,
    flex: 1,
    minWidth: 0,
  },
  pathMarkStatus: {
    color: foundationColors.ink.tertiary,
    textAlign: "right",
  },
  pathMarkTitleDone: {
    color: foundationColors.ink.disabled,
    textDecorationLine: "line-through",
  },
  pathMarkMetaDone: {
    color: foundationColors.ink.disabled,
  },
  emptyMilestonesText: {
    color: foundationColors.ink.secondary,
  },
  openExpeditionLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  openExpeditionLinkPressed: {
    opacity: 0.72,
  },
  openExpeditionText: {
    color: foundationColors.green.deep,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
