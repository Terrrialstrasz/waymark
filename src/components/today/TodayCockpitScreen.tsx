import { useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { IconBadge } from "../primitives/IconBadge";
import { PageHeader } from "../primitives/PageHeader";
import { WMSheet } from "../primitives/WMSheet";
import { useCopy } from "../../i18n/useCopy";
import { Locale, PathId } from "../../types/ui";
import { TodayPathHeroPath } from "../../lib/waymark/todayPathHero";
import { TodayMarkItem, TodayPackCheckItem } from "./__fixtures__/todayCarousel.fixtures";
import { CurrentExpeditionItem, CloseTrailStatus } from "./__fixtures__/todayExpedition.fixtures";
import { PackChecksSection } from "./PackChecksSection";
import { CurrentExpeditionSection } from "./CurrentExpeditionSection";
import { CloseTrailEntryCard } from "./CloseTrailEntryCard";
import { PackCheckMiniCard } from "../pack-checks/PackCheckMiniCard";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMButton } from "../primitives/WMButton";
import { WMText } from "../primitives/Text";
import { spacing, useReducedMotionEnabled } from "../../theme/tokens";
import { TodayMarkTrailSection } from "./TodayMarkTrailSection";

export type TodayCockpitFeatureFlags = {
  isPathHeroEnabled: boolean;
  isPathDetailEnabled: boolean;
  isMarksEnabled: boolean;
  isMarkDetailEnabled: boolean;
  isIndependentPackChecksEnabled: boolean;
  isPrepareTomorrowEnabled: boolean;
  isPackCheckDetailEnabled: boolean;
  isCurrentExpeditionEnabled: boolean;
  isExpeditionDetailEnabled: boolean;
  isCloseTrailEnabled: boolean;
};

export type TodayCockpitScreenProps = {
  selectedPathId: PathId;
  paths: TodayPathHeroPath[];
  marks: TodayMarkItem[];
  dailyPlanMode?: "replan" | "execution";
  hasWeeklyTimetableForDate?: boolean;
  packChecks: TodayPackCheckItem[];
  allPackChecks?: TodayPackCheckItem[];
  currentExpeditions: CurrentExpeditionItem[];
  closeTrailStatus: CloseTrailStatus;
  featureFlags: TodayCockpitFeatureFlags;
  locale: Locale;
  onPathChange: (pathId: PathId) => void;
  onOpenPathDetail?: (pathId: PathId) => void;
  onOpenMarkDetail?: (mark: TodayMarkItem) => void;
  onOpenPackCheck?: (pack: TodayPackCheckItem) => void;
  onOpenExpedition?: (expedition: CurrentExpeditionItem) => void;
  onOpenCloseTrail?: () => void;
  onConfirmDailyPlan?: () => void;
  withShell?: boolean;
};

export function TodayCockpitScreen({
  marks,
  dailyPlanMode = "execution",
  hasWeeklyTimetableForDate = true,
  packChecks,
  allPackChecks,
  currentExpeditions,
  closeTrailStatus,
  featureFlags,
  locale,
  onOpenMarkDetail,
  onOpenPackCheck,
  onOpenExpedition,
  onOpenCloseTrail,
  onConfirmDailyPlan,
  withShell = true,
}: TodayCockpitScreenProps) {
  const c = useCopy(locale);
  const reducedMotion = useReducedMotionEnabled();
  const [packCheckSheetVisible, setPackCheckSheetVisible] = useState(false);
  const dateLabel = formatTodayDate(locale);
  const showMarks = featureFlags.isMarksEnabled && featureFlags.isMarkDetailEnabled;
  const showExpeditions = featureFlags.isCurrentExpeditionEnabled && featureFlags.isExpeditionDetailEnabled;
  const independentPackChecks = packChecks.filter((pack) => pack.section === "independent");
  const prepareTomorrowPacks = packChecks.filter((pack) => pack.section === "prepare_tomorrow");
  const showIndependentPackChecks = featureFlags.isIndependentPackChecksEnabled && featureFlags.isPackCheckDetailEnabled;
  const showPrepareTomorrow = featureFlags.isPrepareTomorrowEnabled && featureFlags.isPackCheckDetailEnabled;
  const isReplanMode = dailyPlanMode === "replan";

  const content = (
    <View style={styles.stack}>
      <PageHeader
        decorativeAccent
        decorativeMotifs={["botanical.wreathSeal"]}
        logoSize="lg"
        logoVariant="primary"
        subtitle={dateLabel}
        title={c.today.title}
        actions={
          !isReplanMode && featureFlags.isPackCheckDetailEnabled ? (
            <IconBadge
              accessibilityLabel={locale === "vi" ? "Hien thi tat ca Pack Check" : "Show all Pack Checks"}
              decorative={false}
              onPress={() => setPackCheckSheetVisible(true)}
              semanticName="entity.packCheck"
              shape="rounded"
              size="md"
              tone="warm"
            />
          ) : undefined
        }
      />

      <View style={styles.sections}>
        {showMarks ? (
          <TodayMarkTrailSection
            hasWeeklyTimetableForDate={hasWeeklyTimetableForDate}
            locale={locale}
            marks={marks}
            onOpenMarkDetail={onOpenMarkDetail}
          />
        ) : null}

        {isReplanMode ? (
          <WMButton
            label={locale === "vi" ? "Xác nhận kế hoạch hôm nay" : "Confirm Today’s Plan"}
            onPress={onConfirmDailyPlan}
            variant="primary"
          />
        ) : null}

        {!isReplanMode && showExpeditions ? (
          <CurrentExpeditionSection
            gate="enabled"
            locale={locale}
            onOpenExpeditionDetail={onOpenExpedition}
            expeditions={currentExpeditions}
            title={c.today.expedition.sectionTitle}
          />
        ) : null}

        {!isReplanMode && showIndependentPackChecks ? (
          <PackChecksSection
            gate="enabled"
            locale={locale}
            onOpenPackCheck={onOpenPackCheck}
            packs={independentPackChecks}
            title={c.today.packChecks.sectionTitle}
          />
        ) : null}

        {!isReplanMode && showPrepareTomorrow ? (
          <PackChecksSection
            gate="enabled"
            locale={locale}
            onOpenPackCheck={onOpenPackCheck}
            packs={prepareTomorrowPacks}
            title={c.today.prepareTomorrow.sectionTitle}
          />
        ) : null}

        {!isReplanMode && featureFlags.isCloseTrailEnabled ? (
          <CloseTrailEntryCard
            copy={{
              accessibilityLabel: c.today.closeTrail.accessibilityLabel,
              completedSubtitle: c.today.closeTrail.completedSubtitle,
              subtitle: c.today.closeTrail.subtitle,
              title: c.today.closeTrail.title,
            }}
            isCloseTrailEnabled={featureFlags.isCloseTrailEnabled}
            locale={locale}
            onPress={onOpenCloseTrail}
            status={closeTrailStatus}
          />
        ) : null}
      </View>

      <AllPackChecksSheet
        locale={locale}
        onClose={() => setPackCheckSheetVisible(false)}
        onOpenPackCheck={(pack) => {
          setPackCheckSheetVisible(false);
          onOpenPackCheck?.(pack);
        }}
        packs={allPackChecks ?? packChecks}
        visible={packCheckSheetVisible}
      />
    </View>
  );

  if (!withShell) {
    return content;
  }

  return (
    <FieldJournalScreenShell
      botanicalAmbient
      botanicalMotifs={["botanical.wreathSeal"]}
      reducedMotion={reducedMotion}
      variant="navAware"
    >
      {content}
    </FieldJournalScreenShell>
  );
}

function AllPackChecksSheet({
  visible,
  locale,
  packs,
  onClose,
  onOpenPackCheck,
}: {
  visible: boolean;
  locale: Locale;
  packs: TodayPackCheckItem[];
  onClose: () => void;
  onOpenPackCheck?: (pack: TodayPackCheckItem) => void;
}) {
  const { width } = useWindowDimensions();
  const sheetHorizontalPadding = spacing.lg * 2;
  const gridGap = spacing.sm;
  const cardSize = Math.floor((width - sheetHorizontalPadding - gridGap * 2) / 3);
  const resolvedCardSize = Math.max(96, Math.min(132, cardSize));
  const resolvedCardHeight = Math.max(158, Math.round(resolvedCardSize * 1.42));

  return (
    <WMSheet
      contentStyle={styles.packCheckSheetContent}
      onClose={onClose}
      presentation="fullScreen"
      visible={visible}
    >
      <View style={styles.packCheckSheetHeader}>
        <WMText style={styles.packCheckSheetTitle} variant="sheetTitle">
          {locale === "vi" ? "Tat ca Pack Check" : "All Pack Checks"}
        </WMText>
        <WMButton label={locale === "vi" ? "Dong" : "Close"} onPress={onClose} variant="secondary" />
      </View>
      {packs.length > 0 ? (
        <ScrollView contentContainerStyle={styles.packCheckGrid} showsVerticalScrollIndicator={false}>
          {packs.map((pack) => (
            <View key={pack.id} style={[styles.packCheckGridCell, { width: resolvedCardSize }]}>
              <PackCheckMiniCard
                height={resolvedCardHeight}
                isDetailEnabled={pack.detailEnabled}
                locale={locale}
                onPress={onOpenPackCheck}
                pack={pack}
                size={resolvedCardSize}
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        <WMEmptyState
          body={locale === "vi" ? "Hom nay chua co Pack Check nao can hien thi." : "There are no Pack Checks to show today."}
          title={locale === "vi" ? "Chua co Pack Check" : "No Pack Checks yet"}
        />
      )}
    </WMSheet>
  );
}

function formatTodayDate(locale: Locale) {
  const localeTag = locale === "vi" ? "vi-VN" : "en-US";
  return new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(new Date());
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.none,
  },
  sections: {
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  packCheckSheetContent: {
    flex: 1,
    minHeight: 0,
  },
  packCheckSheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  packCheckSheetTitle: {
    flex: 1,
  },
  packCheckGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
    paddingBottom: spacing.xl,
  },
  packCheckGridCell: {
    alignItems: "center",
  },
});
