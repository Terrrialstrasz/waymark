import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { JournalCard } from "../primitives/JournalCard";
import { PageHeader } from "../primitives/PageHeader";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMText } from "../primitives/Text";
import { getCopy } from "../../i18n/copy";
import { Locale, PathId } from "../../types/ui";
import { foundationColors, radius, semanticElevation, semanticRadius, spacing, typography } from "../../theme/tokens";
import {
  resolveDailyJournalContentState,
  type DailyJournalEntryItem,
  type DailyJournalMemoryItem,
  type DailyJournalTrailItem,
} from "../../app/dailyJournalViewState";
import type { BotanicalMotifId } from "../../design/botanical-motifs";
import { DayClosedJournalCard } from "./DayClosedJournalCard";
import { JournalLatestHero } from "./JournalLatestHero";
import { DEBUG_LAYOUT, DEBUG_LAYOUT_VERSION, DebugBanner, DebugLayerBox } from "../../debug/layoutDebug";
import { getPathHeroImage, resolvePathIdFromHint } from "../../tokens/pathHeroImages";
import {
  TodayPathHeroPath,
  WAYMARK_PATH_COLORS,
  getTodayPathHeroTextColorKey,
  todayPathHeroPaths,
} from "../../lib/waymark/todayPathHero";
import { BotanicalDecorationLayer } from "../primitives/BotanicalDecorationLayer";

type Props = {
  locale?: Locale;
  dayKey?: string;
  dateLabel: string;
  isToday?: boolean;
  backgroundMotif?: BotanicalMotifId;
  memoryCount?: number;
  featuredMemory?: DailyJournalMemoryItem & { onPress?: () => void };
  memoryPreviews?: Array<DailyJournalMemoryItem & { onPress?: () => void }>;
  memoryOverflowCount?: number;
  trailEntries?: Array<DailyJournalTrailItem & { onPress?: () => void }>;
  entries?: CompatibleDailyEntry[];
  closedDayCard?: Omit<Parameters<typeof DayClosedJournalCard>[0], "locale">;
  loadState?: "idle" | "loading" | "ready" | "error";
  errorMessage?: string;
  dateOptions?: Array<{ id: string; label: string }>;
  datePickerReady?: boolean;
  onBack?: () => void;
  backLabel?: string;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  debugInfo?: {
    selectedDate: string;
    trailDayId?: string;
    journalEntries: number;
    memoryEntries: number;
    completedMarks: number;
    hasClosedTrail: boolean;
  };
};

const SWIPE_THRESHOLD = 64;
const dailyTrailPathMap = new Map<PathId, TodayPathHeroPath>(todayPathHeroPaths.map((path) => [path.id, path]));

type CompatibleDailyEntry = Partial<DailyJournalEntryItem> &
  Pick<DailyJournalEntryItem, "entryType" | "id" | "title"> & {
    onPress?: () => void;
    pathColorToken?: string;
    readonly?: boolean;
    showImagePlaceholder?: boolean;
  };

export function DailyJournalTemplate({
  locale = "en",
  dayKey = "daily-journal",
  dateLabel,
  isToday = false,
  backgroundMotif,
  memoryCount,
  featuredMemory,
  memoryPreviews,
  trailEntries,
  entries,
  closedDayCard,
  loadState = "ready",
  errorMessage,
  dateOptions,
  datePickerReady,
  onBack,
  backLabel,
  onPreviousDay,
  onNextDay,
  debugInfo,
}: Props) {
  const c = getCopy(locale);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const translateX = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  void dateOptions;
  void datePickerReady;
  const legacyMemories = (entries ?? [])
    .filter((entry) => entry.entryType === "memory")
    .map((entry) => normalizeCompatibleMemory(entry));
  const legacyTrailEntries = (entries ?? [])
    .filter((entry) => entry.entryType === "mark")
    .map((entry) => normalizeCompatibleTrailEntry(entry));
  const resolvedMemoryCount = memoryCount ?? legacyMemories.length;
  const resolvedFeaturedMemory = featuredMemory ?? legacyMemories[0];
  const resolvedMemoryPreviews = memoryPreviews ?? legacyMemories.slice(1);
  const resolvedTrailEntries = trailEntries ?? legacyTrailEntries;
  const contentState = resolveDailyJournalContentState({
    memoryCount: resolvedMemoryCount,
    trailEntries: resolvedTrailEntries,
    entries,
    closedDayCard,
  });
  const resolvedBackgroundMotif = backgroundMotif ?? "botanical.photoOverlay";

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    translateX.setValue(0);
  }, [dayKey, translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
        onPanResponderMove: (_, gesture) => {
          const canMoveLeft = gesture.dx < 0 && Boolean(onNextDay);
          const canMoveRight = gesture.dx > 0 && Boolean(onPreviousDay);
          if (canMoveLeft || canMoveRight) {
            translateX.setValue(gesture.dx * 0.32);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldGoPrevious = gesture.dx > SWIPE_THRESHOLD && Boolean(onPreviousDay);
          const shouldGoNext = gesture.dx < -SWIPE_THRESHOLD && Boolean(onNextDay);
          Animated.timing(translateX, {
            duration: 140,
            toValue: shouldGoPrevious ? Math.min(width * 0.18, 72) : shouldGoNext ? -Math.min(width * 0.18, 72) : 0,
            useNativeDriver: true,
          }).start(() => {
            if (shouldGoPrevious) {
              onPreviousDay?.();
              return;
            }
            if (shouldGoNext) {
              onNextDay?.();
              return;
            }
            translateX.setValue(0);
          });
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [onNextDay, onPreviousDay, translateX, width],
  );

  return (
    <FieldJournalScreenShell
      botanicalAmbient
      botanicalMotifs={[resolvedBackgroundMotif]}
      contentContainerStyle={styles.shellContent}
      debugLabel="DailyJournalTemplate.FieldJournalScreenShell"
      debugLines={debugInfo ? [`selectedDate=${debugInfo.selectedDate}`, `entries=${debugInfo.journalEntries}`] : undefined}
      scrollViewRef={scrollViewRef}
      variant="navAware"
    >
      <Animated.View
        accessibilityActions={[
          { name: "decrement", label: locale === "vi" ? "Ngay truoc" : "Previous day" },
          ...(onNextDay ? [{ name: "increment", label: locale === "vi" ? "Ngay sau" : "Next day" }] : []),
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "decrement") {
            onPreviousDay?.();
          }
          if (event.nativeEvent.actionName === "increment") {
            onNextDay?.();
          }
        }}
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <DebugLayerBox label="DailyJournalTemplate.Root" lines={debugInfo ? [`dateLabel=${dateLabel}`] : undefined} tone="blue">
          <DailyJournalHeader
            backLabel={backLabel ?? (locale === "vi" ? "Quay lai Journal" : "Back to Journal")}
            dateLabel={dateLabel}
            isToday={isToday}
            locale={locale}
            onBack={onBack}
          />
          {DEBUG_LAYOUT ? (
            <DebugBanner
              label={`DEBUG DAILY JOURNAL TEMPLATE ACTIVE - ${DEBUG_LAYOUT_VERSION}`}
              lines={[
                `selectedDate=${debugInfo?.selectedDate ?? "unknown"}`,
                `trailDayId=${debugInfo?.trailDayId ?? "missing"}`,
                `journalEntries=${debugInfo?.journalEntries ?? resolvedTrailEntries.length + resolvedMemoryCount}`,
                `memoryEntries=${debugInfo?.memoryEntries ?? resolvedMemoryCount}`,
                `completedMarks=${debugInfo?.completedMarks ?? resolvedTrailEntries.length}`,
                `closedTrail=${debugInfo?.hasClosedTrail ? "yes" : "no"}`,
              ]}
            />
          ) : null}

          {loadState === "loading" || loadState === "idle" ? (
            <WMEmptyState
              body={
                locale === "vi"
                  ? "Waymark dang lay trail va memories cua ngay nay."
                  : "Waymark is loading this day's trail and memories."
              }
              title={locale === "vi" ? "Dang tai journal" : "Loading journal"}
            />
          ) : loadState === "error" ? (
            <WMEmptyState
              body={
                errorMessage ??
                (locale === "vi"
                  ? "Khong tai duoc journal cua ngay nay. Thu quay lai ngay nay sau it phut."
                  : "This day's journal could not be loaded. Try returning to this day in a moment.")
              }
              title={locale === "vi" ? "Journal chua tai duoc" : "Journal unavailable"}
            />
          ) : contentState === "empty" ? (
            <WMEmptyState body={c.journal.emptyDayBody} title={c.journal.emptyDayTitle} />
          ) : (
            <View style={styles.stack}>
              <DailyJournalMemoriesSection
                featuredMemory={resolvedFeaturedMemory}
                locale={locale}
                memoryCount={resolvedMemoryCount}
                memoryPreviews={resolvedMemoryPreviews}
              />
              <DailyJournalTrailSection locale={locale} trailEntries={resolvedTrailEntries} />
              {closedDayCard ? <DayClosedJournalCard locale={locale} ownerId="daily-journal-day-closed" {...closedDayCard} /> : null}
            </View>
          )}
        </DebugLayerBox>
      </Animated.View>
    </FieldJournalScreenShell>
  );
}

function DailyJournalHeader({
  locale,
  dateLabel,
  isToday: _isToday,
  onBack: _onBack,
  backLabel: _backLabel,
}: {
  locale: Locale;
  dateLabel: string;
  isToday: boolean;
  onBack?: () => void;
  backLabel: string;
}) {
  return (
    <View style={styles.header}>
      <PageHeader
        decorativeAccent
        decorativeMotifs={["botanical.wreathSeal"]}
        logoSize="lg"
        logoVariant="primary"
        subtitle={formatDailyJournalHeaderDate(dateLabel, locale)}
        title="Daily Journal"
      />
    </View>
  );
}

function DailyJournalMemoriesSection({
  locale,
  memoryCount,
  featuredMemory,
  memoryPreviews,
}: {
  locale: Locale;
  memoryCount: number;
  featuredMemory?: DailyJournalMemoryItem & { onPress?: () => void };
  memoryPreviews: Array<DailyJournalMemoryItem & { onPress?: () => void }>;
}) {
  const [showAllMemories, setShowAllMemories] = useState(false);
  const countLabel =
    locale === "vi" ? `${memoryCount} ky uc` : `${memoryCount} memor${memoryCount === 1 ? "y" : "ies"}`;
  const hasHiddenMemories = memoryPreviews.length > 0;

  useEffect(() => {
    setShowAllMemories(false);
  }, [featuredMemory?.id, memoryCount]);

  return (
    <View style={[styles.section, styles.memorySection]}>
      <DailyJournalSectionHeader title={locale === "vi" ? "Memories" : "Memories"} />
      {featuredMemory ? (
        <DailyJournalMemoryHero locale={locale} memory={featuredMemory} />
      ) : (
        <JournalCard variant="readOnly">
          <WMText style={styles.emptyInline} variant="bodySm">
            {locale === "vi" ? "Chua co ky uc nao trong ngay nay." : "No memories for this day yet."}
          </WMText>
        </JournalCard>
      )}
      {hasHiddenMemories ? (
        <Pressable
          accessibilityLabel={
            showAllMemories
              ? locale === "vi"
                ? "Dang hien tat ca ky uc trong ngay"
                : "Showing all memories for this day"
              : locale === "vi"
                ? `Xem tat ca ${memoryCount} ky uc trong ngay`
                : `View all ${countLabel} for this day`
          }
          accessibilityRole="button"
          onPress={() => setShowAllMemories((current) => !current)}
          style={styles.memoryCountButton}
        >
          <View style={styles.memoryCountButtonCopy}>
            <WMText style={styles.memoryCountButtonTitle} variant="bodyStrong">
              {countLabel}
            </WMText>
            <WMText style={styles.memoryCountButtonSubtitle} variant="bodyXs">
              {showAllMemories
                ? locale === "vi"
                  ? "Dang hien tat ca memories"
                  : "Showing all memories"
                : locale === "vi"
                  ? "Cham de xem tat ca memories"
                  : "Tap to view all memories"}
            </WMText>
          </View>
          <WaymarkIcon
            decorative
            semanticName={showAllMemories ? "utility.chevronUp" : "utility.chevronDown"}
            size="sm"
            state="selected"
          />
        </Pressable>
      ) : null}
      {showAllMemories && memoryPreviews.length > 0 ? (
        <View style={styles.memoryHeroStack}>
          {memoryPreviews.map((memory) => (
            <DailyJournalMemoryHero key={memory.id} locale={locale} memory={memory} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DailyJournalMemoryHero({
  locale,
  memory,
}: {
  locale: Locale;
  memory: DailyJournalMemoryItem & { onPress?: () => void };
}) {
  const pathId = memory.pathId ?? resolvePathIdFromHint(memory.pathLabel);
  const pathHero = getPathHeroImage(pathId);
  const images = memory.image?.src ? [memory.image] : pathHero?.assetId ? [{ assetId: pathHero.assetId, alt: memory.pathLabel }] : [];
  const timeChips = memory.timeLabel ? [{ label: memory.timeLabel, iconName: "clock" as const }] : [];

  return (
    <JournalLatestHero
      chips={timeChips}
      eyebrow={locale === "vi" ? "Memory" : "Memory"}
      images={images}
      locale={locale}
      mediaItems={memory.mediaItems}
      onPress={memory.onPress}
      ownerId={memory.id}
      pathLabel={memory.pathLabel}
      showDateChip={false}
      subtitle={memory.body}
      title={memory.title}
    />
  );
}

function DailyJournalTrailSection({
  locale,
  trailEntries,
}: {
  locale: Locale;
  trailEntries: Array<DailyJournalTrailItem & { onPress?: () => void }>;
}) {
  const visibleTrailEntries = trailEntries.filter(shouldShowDailyTrailEntry).sort(compareDailyTrailEntries);

  return (
    <View style={styles.section}>
      <DailyJournalSectionHeader title={locale === "vi" ? "Today's trail" : "Today's trail"} />
      {visibleTrailEntries.length > 0 ? (
        <View style={styles.trailList}>
          {visibleTrailEntries.map((entry) => (
            <DailyJournalTrailRow key={entry.id} entry={entry} locale={locale} />
          ))}
        </View>
      ) : (
        <WMEmptyState
          body={locale === "vi" ? "Chua co trail entry nao trong ngay nay." : "No trail entries for this day yet."}
          title={locale === "vi" ? "Trail trong" : "Trail is empty"}
        />
      )}
    </View>
  );
}

function DailyJournalSectionHeader({ title }: { title: string }) {
  return (
    <BotanicalDecorationLayer preset="sectionHeader">
      <View style={styles.sectionHeader}>
        <WaymarkIcon decorative semanticName="botanical.sectionSprig" size="sm" state="muted" />
        <WMText style={styles.sectionTitle}>{title}</WMText>
        <View style={styles.sectionRule} />
      </View>
    </BotanicalDecorationLayer>
  );
}

function DailyJournalTrailRow({
  entry,
  locale: _locale,
}: {
  entry: DailyJournalTrailItem & { onPress?: () => void };
  locale: Locale;
}) {
  const visual = getDailyTrailVisualState(entry);
  const path = getDailyTrailPath(entry.pathId);
  const time = splitDailyTrailTimeLabel(entry.timeLabel);
  const greyed = isGreyDailyTrailEntry(entry);
  const content = (
    <View
      style={[
        styles.trailRow,
        {
          backgroundColor: visual.surfaceColor,
          borderColor: visual.borderColor,
          opacity: visual.opacity,
        },
      ]}
    >
      <DailyJournalTrailWatermark path={path} />
      <View style={styles.trailTimeWrap}>
        <WMText numberOfLines={1} style={[styles.trailTime, { color: visual.accentColor }]} variant="meta">
          {time.start}
        </WMText>
        {time.end ? (
          <WMText numberOfLines={1} style={[styles.trailTimeEnd, { color: visual.metaColor }]} variant="metaCompact">
            {time.end}
          </WMText>
        ) : null}
      </View>
      <View style={[styles.trailDivider, { backgroundColor: visual.borderColor }]} />
      <View style={styles.trailCopy}>
        <WMText numberOfLines={2} style={[styles.trailTitle, { color: visual.titleColor }]} variant="sectionTitle">
          {entry.title}
        </WMText>
      </View>
      {entry.statusLabel ? (
        <View style={styles.trailDonePill}>
          <WMText numberOfLines={1} style={[styles.trailDoneText, greyed ? styles.trailGreyText : null]} variant="metaCompact">
            {entry.statusLabel}
          </WMText>
        </View>
      ) : entry.onPress ? (
        <WaymarkIcon decorative semanticName="utility.chevron" size="sm" state="muted" />
      ) : null}
    </View>
  );

  if (!entry.onPress) {
    return content;
  }

  return (
    <Pressable accessibilityLabel={entry.title} accessibilityRole="button" onPress={entry.onPress}>
      {content}
    </Pressable>
  );
}

function DailyJournalTrailWatermark({ path }: { path: TodayPathHeroPath }) {
  if (!path.pathIconAssetId) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.trailWatermarkWrap}>
      <WaymarkImage
        alt=""
        assetId={path.pathIconAssetId}
        decorative
        fallback={null}
        imageStyle={styles.trailWatermarkImage}
        usage="pathIcon"
      />
    </View>
  );
}

function getDailyTrailPath(pathId?: PathId) {
  return dailyTrailPathMap.get(pathId ?? "career") ?? dailyTrailPathMap.get("career")!;
}

function getDailyTrailVisualState(entry: DailyJournalTrailItem) {
  if (isGreyDailyTrailEntry(entry)) {
    return {
      surfaceColor: "#EFEAE1",
      borderColor: "#DED4C5",
      accentColor: "#8E877C",
      metaColor: foundationColors.ink.tertiary,
      titleColor: "#716B62",
      opacity: 0.72,
    };
  }

  const path = getDailyTrailPath(entry.pathId);
  const colorSet = WAYMARK_PATH_COLORS[getTodayPathHeroTextColorKey(path.id)];
  return {
    surfaceColor: makePathSurfaceColor(colorSet.accentSoft),
    borderColor: colorSet.accentMuted,
    accentColor: colorSet.accentDeep,
    metaColor: foundationColors.ink.secondary,
    titleColor: foundationColors.ink.primary,
    opacity: 1,
  };
}

function shouldShowDailyTrailEntry(entry: DailyJournalTrailItem) {
  return entry.status === "done" || entry.statusTone === "done" || entry.statusTone === "missed" || entry.statusTone === "weak";
}

function isGreyDailyTrailEntry(entry: DailyJournalTrailItem) {
  return entry.statusTone === "missed" || entry.statusTone === "weak";
}

function compareDailyTrailEntries(left: DailyJournalTrailItem, right: DailyJournalTrailItem) {
  const leftSort = getDailyTrailTimeSortValue(left.timeLabel);
  const rightSort = getDailyTrailTimeSortValue(right.timeLabel);
  if (leftSort !== rightSort) {
    return leftSort - rightSort;
  }
  return left.id.localeCompare(right.id);
}

function getDailyTrailTimeSortValue(timeLabel?: string) {
  const parsed = parseDailyTrailClock(timeLabel);
  return parsed ?? Number.MAX_SAFE_INTEGER;
}

function splitDailyTrailTimeLabel(timeLabel?: string) {
  const label = timeLabel?.trim();
  if (!label) {
    return { start: "--" };
  }

  const [start, end] = label.split(/\s*[-–—]\s*/u).map((part) => part.trim()).filter(Boolean);
  return {
    start: start ?? label,
    end,
  };
}

function parseDailyTrailClock(timeLabel?: string) {
  const start = splitDailyTrailTimeLabel(timeLabel).start;
  const normalized = start.replace("h", ":");
  const match = normalized.match(/(\d{1,2})(?::(\d{2}))?/u);
  if (!match) {
    return undefined;
  }
  const hours = Number.parseInt(match[1], 10);
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return undefined;
  }
  return hours * 60 + minutes;
}

function makePathSurfaceColor(hexColor: string) {
  const normalized = hexColor.replace("#", "");
  if (normalized.length !== 6) {
    return hexColor;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, 0.42)`;
}

function formatDailyJournalHeaderDate(dateLabel: string, locale: Locale) {
  const parsed = new Date(dateLabel.replace(/^([A-Za-z]{3}),/, "$1"));
  if (Number.isNaN(parsed.getTime())) {
    return dateLabel;
  }
  return parsed.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function normalizeCompatibleMemory(entry: CompatibleDailyEntry): DailyJournalMemoryItem & { onPress?: () => void } {
  return {
    id: entry.id,
    sourceId: entry.sourceId ?? entry.id,
    sourceType: "memory",
    entryType: "memory",
    title: entry.title,
    body: entry.body,
    pathId: entry.pathId,
    chips: entry.chips ?? [],
    pathLabel: entry.pathLabel ?? "Journal",
    status: "default",
    image: entry.image,
    mediaItems: entry.mediaItems,
    onPress: entry.onPress,
  };
}

function normalizeCompatibleTrailEntry(entry: CompatibleDailyEntry): DailyJournalTrailItem & { onPress?: () => void } {
  const statusTone = entry.status === "done" ? "done" : entry.chips?.find((chip) => chip.variant === "status")?.stateTone;
  return {
    id: entry.id,
    sourceId: entry.sourceId ?? entry.id,
    sourceType: "mark_instance",
    entryType: "mark",
    title: entry.title,
    body: entry.body,
    pathId: entry.pathId,
    chips: entry.chips ?? [],
    pathLabel: entry.pathLabel ?? "Journal",
    status: entry.status === "done" ? "done" : "default",
    image: entry.image,
    mediaItems: entry.mediaItems,
    statusTone,
    onPress: entry.onPress,
  };
}

const styles = StyleSheet.create({
  shellContent: {
    gap: spacing.lg,
  },
  stack: {
    gap: spacing.xl,
  },
  header: {
    marginTop: -spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  memorySection: {
    gap: spacing.sm,
  },
  memoryCountButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 252, 246, 0.82)",
    borderColor: "rgba(182, 145, 94, 0.24)",
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  memoryCountButtonCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  memoryCountButtonTitle: {
    color: foundationColors.ink.primary,
  },
  memoryCountButtonSubtitle: {
    color: foundationColors.ink.secondary,
  },
  memoryHeroStack: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 28,
  },
  sectionTitle: {
    ...typography.label,
    color: foundationColors.ink.primary,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  sectionRule: {
    backgroundColor: foundationColors.border.subtle,
    flex: 1,
    height: 1,
    marginLeft: spacing.sm,
  },
  trailList: {
    gap: spacing.sm,
  },
  trailRow: {
    alignItems: "center",
    borderRadius: semanticRadius.row.default,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 70,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "relative",
    boxShadow: semanticElevation.flat,
  },
  trailWatermarkWrap: {
    marginTop: -24,
    position: "absolute",
    right: 8,
    top: "50%",
    zIndex: 0,
  },
  trailWatermarkImage: {
    height: 64,
    opacity: 0.08,
    width: 64,
  },
  trailTimeWrap: {
    alignItems: "center",
    gap: 2,
    justifyContent: "center",
    minWidth: 62,
    zIndex: 2,
  },
  trailTime: {
    fontSize: 19,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
    lineHeight: 25,
  },
  trailTimeEnd: {
    fontSize: 19,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
    lineHeight: 25,
  },
  trailDivider: {
    height: 46,
    width: 1,
    zIndex: 2,
  },
  trailCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    zIndex: 2,
  },
  trailTitle: {
    color: foundationColors.ink.primary,
  },
  trailDonePill: {
    backgroundColor: "#E8E3D5",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    zIndex: 2,
  },
  trailDoneText: {
    color: "#35552F",
  },
  trailGreyText: {
    color: foundationColors.ink.tertiary,
  },
  emptyInline: {
    color: foundationColors.ink.secondary,
  },
});
