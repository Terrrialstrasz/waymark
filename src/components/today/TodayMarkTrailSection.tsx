import { Pressable, StyleSheet, View } from "react-native";
import { getTodayMarkPathLabels } from "../../app/todayMarkActionSheetMapper";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import {
  foundationColors,
  semanticBorder,
  semanticElevation,
  semanticRadius,
  spacing,
  typography,
} from "../../theme/tokens";
import { Locale, PathId } from "../../types/ui";
import {
  TodayPathHeroPath,
  WAYMARK_PATH_COLORS,
  getTodayPathHeroTextColorKey,
  todayPathHeroPaths,
} from "../../lib/waymark/todayPathHero";
import { isSettledTodayMarkStatus } from "../../app/todayMarksSummary";
import { BotanicalDecorationLayer } from "../primitives/BotanicalDecorationLayer";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMText } from "../primitives/Text";
import { TodayMarkItem, TodayMarkStatus } from "./__fixtures__/todayCarousel.fixtures";

type Props = {
  marks: TodayMarkItem[];
  locale: Locale;
  hasWeeklyTimetableForDate?: boolean;
  onOpenMarkDetail?: (mark: TodayMarkItem) => void;
  copyOverrides?: Partial<TodayMarkTrailCopy>;
};

type TrailMarkModel = {
  focusedMark: TodayMarkItem | null;
  listMarks: TodayMarkItem[];
};

type MarkVisualState = {
  surfaceColor: string;
  borderColor: string;
  accentColor: string;
  accentSoft: string;
  titleColor: string;
  metaColor: string;
  opacity: number;
};

type TodayMarkTrailCopy = {
  focusedTitle: string;
  listTitle: string;
  noMarksTitle: string;
  noMarksBody: string;
  missingTimetableTitle: string;
  missingTimetableBody: string;
  clearTitle: string;
  clearBody: string;
};

const pathMap = new Map<PathId, TodayPathHeroPath>(todayPathHeroPaths.map((path) => [path.id, path]));
const pathLabels = getTodayMarkPathLabels();

const statusIconMap: Record<TodayMarkStatus, WaymarkSemanticIconName> = {
  ready: "status.planned",
  dependency_required: "status.active",
  blocked: "status.missed",
  ready_with_advisory: "status.weak",
  ready_with_waiver: "status.done",
  needs_decision: "status.active",
  done: "status.done",
  resolved: "status.done",
  overdue: "status.missed",
};

export function TodayMarkTrailSection({
  marks,
  locale,
  hasWeeklyTimetableForDate = true,
  onOpenMarkDetail,
  copyOverrides,
}: Props) {
  const copy = { ...getDefaultTrailCopy(locale), ...copyOverrides };
  const model = buildTrailMarkModel(marks);

  if (marks.length === 0) {
    return (
      <View style={styles.stack}>
        <SectionHeader title={copy.focusedTitle} />
        <WMEmptyState
          body={hasWeeklyTimetableForDate ? copy.noMarksBody : copy.missingTimetableBody}
          title={hasWeeklyTimetableForDate ? copy.noMarksTitle : copy.missingTimetableTitle}
        />
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {model.focusedMark ? (
        <View style={styles.group}>
          <SectionHeader title={copy.focusedTitle} />
          <FocusedMarkCard locale={locale} mark={model.focusedMark} onPress={onOpenMarkDetail} />
        </View>
      ) : null}

      <View style={styles.group}>
        <SectionHeader title={copy.listTitle} />
        <View style={styles.list}>
          {model.listMarks.length > 0 ? (
            model.listMarks.map((mark) => (
              <TodayMarkRow key={mark.id} locale={locale} mark={mark} onPress={onOpenMarkDetail} />
            ))
          ) : (
            <WMEmptyState
              body={copy.clearBody}
              title={copy.clearTitle}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function getDefaultTrailCopy(locale: Locale): TodayMarkTrailCopy {
  return {
    focusedTitle: locale === "vi" ? "Now on the Trail" : "Now on the Trail",
    listTitle: locale === "vi" ? "Next on the Trail" : "Next on the Trail",
    noMarksTitle: locale === "vi" ? "Chua co dau moc" : "No marks yet",
    noMarksBody: locale === "vi" ? "Hom nay chua co dau moc nao." : "No marks are visible for today yet.",
    missingTimetableTitle: locale === "vi" ? "Chua co Weekly Timetable" : "Weekly Timetable missing",
    missingTimetableBody:
      locale === "vi"
        ? "Khong co Weekly Timetable nao duoc tai cho ngay nay."
        : "No Weekly Timetable has been loaded for this date.",
    clearTitle: locale === "vi" ? "Trail da gon" : "Trail is clear",
    clearBody: locale === "vi" ? "Moi dau moc trong ngay da duoc xu ly." : "Every visible mark for the day is settled.",
  };
}

function FocusedMarkCard({
  mark,
  locale,
  onPress,
}: {
  mark: TodayMarkItem;
  locale: Locale;
  onPress?: (mark: TodayMarkItem) => void;
}) {
  const path = getPath(mark.pathId);
  const visual = getMarkVisualState(mark);
  const title = getLocalizedMarkTitle(mark, locale);
  const timeLabel = getLocalizedText(mark.timeLabel, locale);
  const pathLabel = getLocalizedPathLabel(mark.pathId, locale);
  const summary = getLocalizedText(mark.summary, locale);
  const statusLabel = getStatusLabel(mark.status, locale);

  const cardLayers = (
    <>
      <View pointerEvents="none" style={[styles.focusWash, { backgroundColor: visual.accentSoft }]} />
      <View pointerEvents="none" style={styles.focusMotif}>
        <WaymarkIcon decorative semanticName={`pathIdentity.${path.icon}` as WaymarkSemanticIconName} size="xl" state="muted" />
      </View>
      <PathWatermark path={path} variant="focus" />
      <View style={styles.focusContentFrame}>
        <View style={styles.focusTextBlock}>
          <WMText numberOfLines={1} style={[styles.focusPathLabel, { color: visual.metaColor }]} variant="meta">
            {pathLabel}
          </WMText>
          <WMText
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            numberOfLines={2}
            style={[styles.focusTitle, { color: visual.titleColor }]}
            variant="pageTitle"
          >
            {title}
          </WMText>
          <View style={[styles.focusRule, { backgroundColor: visual.accentColor }]} />
          {timeLabel ? (
            <WMText numberOfLines={1} style={[styles.focusTime, { color: visual.accentColor }]} variant="sectionTitle">
              {timeLabel}
            </WMText>
          ) : null}
          {summary ? (
            <WMText numberOfLines={2} style={styles.focusSummary} variant="bodySm">
              {summary}
            </WMText>
          ) : null}
        </View>
        <View style={styles.focusFooter}>
          <StatusPill label={statusLabel} status={mark.status} visual={visual} />
          {onPress ? (
            <View style={styles.focusChevronCircle}>
              <WaymarkIcon decorative semanticName="utility.chevron" size="sm" state="muted" />
            </View>
          ) : null}
        </View>
      </View>
    </>
  );

  const content = (
    <View
      style={[
        styles.focusCard,
        {
          backgroundColor: visual.surfaceColor,
          borderColor: visual.borderColor,
          opacity: visual.opacity,
        },
      ]}
    >
      <View style={styles.focusBackground}>{cardLayers}</View>
    </View>
  );

  if (!onPress || mark.detailEnabled === false) {
    return content;
  }

  return (
    <Pressable accessibilityLabel={`${title}. ${statusLabel}.`} accessibilityRole="button" onPress={() => onPress(mark)}>
      {content}
    </Pressable>
  );
}

function TodayMarkRow({
  mark,
  locale,
  onPress,
}: {
  mark: TodayMarkItem;
  locale: Locale;
  onPress?: (mark: TodayMarkItem) => void;
}) {
  const visual = getMarkVisualState(mark);
  const path = getPath(mark.pathId);
  const settled = isSettledTodayMarkStatus(mark.status);
  const title = getLocalizedMarkTitle(mark, locale);
  const timeStartLabel = getLocalizedText(mark.timeRangeLabel?.start, locale) ?? getLocalizedText(mark.timeLabel, locale) ?? "--";
  const timeEndLabel = getLocalizedText(mark.timeRangeLabel?.end, locale);
  const statusLabel = getStatusLabel(mark.status, locale);
  const content = (
    <View
      style={[
        styles.row,
        {
          backgroundColor: visual.surfaceColor,
          borderColor: visual.borderColor,
          opacity: visual.opacity,
        },
      ]}
    >
      <PathWatermark path={path} variant="row" />
      <View style={styles.rowTimeWrap}>
        <WMText numberOfLines={1} style={[styles.rowTime, { color: visual.accentColor }]} variant="meta">
          {timeStartLabel}
        </WMText>
        {timeEndLabel ? (
          <WMText numberOfLines={1} style={[styles.rowTimeEnd, { color: visual.metaColor }]} variant="metaCompact">
            {timeEndLabel}
          </WMText>
        ) : null}
      </View>
      <View style={[styles.rowDivider, { backgroundColor: visual.borderColor }]} />
      <View style={styles.rowCopy}>
        <WMText numberOfLines={2} style={[styles.rowTitle, { color: visual.titleColor }, settled ? styles.rowTitleFinal : null]} variant="sectionTitle">
          {title}
        </WMText>
      </View>
      {settled ? (
        <View style={styles.donePill}>
          <WMText numberOfLines={1} style={styles.doneText} variant="metaCompact">
            {statusLabel}
          </WMText>
        </View>
      ) : onPress ? (
        <WaymarkIcon decorative semanticName="utility.chevron" size="sm" state="muted" />
      ) : null}
    </View>
  );

  if (!onPress || mark.detailEnabled === false) {
    return content;
  }

  return (
    <Pressable accessibilityLabel={`${title}. ${statusLabel}.`} accessibilityRole="button" onPress={() => onPress(mark)}>
      {content}
    </Pressable>
  );
}

function StatusPill({
  label,
  status,
  visual,
}: {
  label: string;
  status: TodayMarkStatus;
  visual: MarkVisualState;
}) {
  return (
    <View style={[styles.statusPill, { borderColor: visual.borderColor, backgroundColor: visual.surfaceColor }]}>
      <WaymarkIcon decorative semanticName={statusIconMap[status]} size="xs" state="muted" />
      <WMText numberOfLines={1} style={[styles.statusText, { color: visual.metaColor }]} variant="metaCompact">
        {label}
      </WMText>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
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

function PathWatermark({
  path,
  variant,
}: {
  path: TodayPathHeroPath;
  variant: "focus" | "row";
}) {
  if (!path.pathIconAssetId) {
    return null;
  }

  return (
    <View pointerEvents="none" style={variant === "focus" ? styles.focusWatermarkWrap : styles.rowWatermarkWrap}>
      <WaymarkImage
        alt=""
        assetId={path.pathIconAssetId}
        decorative
        fallback={null}
        imageStyle={variant === "focus" ? styles.focusWatermarkImage : styles.rowWatermarkImage}
        usage="pathIcon"
      />
    </View>
  );
}

function buildTrailMarkModel(marks: TodayMarkItem[]): TrailMarkModel {
  const displayMarks = marks.filter(hasDisplayTitle);
  const activeMarks = sortMarksChronologically(displayMarks.filter((mark) => !isSettledTodayMarkStatus(mark.status)));
  const settledMarks = sortMarksChronologically(displayMarks.filter((mark) => isSettledTodayMarkStatus(mark.status)));
  const focusedMark = activeMarks[0] ?? null;
  return {
    focusedMark,
    listMarks: [...activeMarks.slice(1), ...settledMarks],
  };
}

function sortMarksChronologically(marks: TodayMarkItem[]) {
  return [...marks].sort((left, right) => {
    const leftSort = left.sortAt ?? "";
    const rightSort = right.sortAt ?? "";
    if (leftSort !== rightSort) {
      if (!leftSort) return 1;
      if (!rightSort) return -1;
      return leftSort.localeCompare(rightSort);
    }
    return left.id.localeCompare(right.id);
  });
}

function getPath(pathId: PathId) {
  return pathMap.get(pathId) ?? pathMap.get("career")!;
}

function hasDisplayTitle(mark: TodayMarkItem) {
  return Boolean(getLocalizedText(mark.title, "en") || getLocalizedText(mark.title, "vi"));
}

function getLocalizedMarkTitle(mark: TodayMarkItem, locale: Locale) {
  return getLocalizedText(mark.title, locale) ?? "Untitled mark";
}

function getLocalizedPathLabel(pathId: PathId, locale: Locale) {
  return pathLabels[locale]?.[pathId] ?? pathLabels.en[pathId] ?? pathLabels.vi[pathId] ?? pathId;
}

function getLocalizedText(value: Partial<Record<Locale, string>> | undefined, locale: Locale) {
  const text = value?.[locale] ?? value?.en ?? value?.vi;
  return text?.trim() ? text : undefined;
}

function getMarkVisualState(mark: TodayMarkItem): MarkVisualState {
  const path = getPath(mark.pathId);
  const colorSet = WAYMARK_PATH_COLORS[getTodayPathHeroTextColorKey(path.id)];

  if (isSettledTodayMarkStatus(mark.status)) {
    return {
      surfaceColor: "#EFEAE1",
      borderColor: "#DED4C5",
      accentColor: "#8E877C",
      accentSoft: "#F5F1EA",
      titleColor: "#716B62",
      metaColor: foundationColors.ink.tertiary,
      opacity: 0.72,
    };
  }

  if (mark.status === "blocked" || mark.status === "overdue") {
    return {
      surfaceColor: makePathSurfaceColor(colorSet.accentSoft),
      borderColor: "#D8B48D",
      accentColor: "#8B5E34",
      accentSoft: "#F4E0CC",
      titleColor: foundationColors.ink.primary,
      metaColor: "#7A5811",
      opacity: 1,
    };
  }

  if (mark.status === "dependency_required") {
    return {
      surfaceColor: makePathSurfaceColor(colorSet.accentSoft),
      borderColor: "#D9BA63",
      accentColor: "#A36D0B",
      accentSoft: "#F8EBC9",
      titleColor: foundationColors.ink.primary,
      metaColor: "#7A5811",
      opacity: 1,
    };
  }

  return {
    surfaceColor: makePathSurfaceColor(colorSet.accentSoft),
    borderColor: colorSet.accentMuted,
    accentColor: colorSet.accentDeep,
    accentSoft: colorSet.accentSoft,
    titleColor: foundationColors.ink.primary,
    metaColor: colorSet.accentDeep,
    opacity: 1,
  };
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

function getStatusLabel(status: TodayMarkStatus, locale: Locale) {
  switch (status) {
    case "dependency_required":
      return locale === "vi" ? "Can phu thuoc" : "Dependency Required";
    case "blocked":
      return locale === "vi" ? "Bi chan" : "Blocked";
    case "ready_with_advisory":
      return locale === "vi" ? "Khuyen nghi" : "Advisory";
    case "ready_with_waiver":
      return locale === "vi" ? "Da mien" : "Waived";
    case "needs_decision":
      return locale === "vi" ? "Da len ke hoach" : "Planned";
    case "done":
      return locale === "vi" ? "Done" : "Done";
    case "resolved":
      return locale === "vi" ? "Resolved" : "Resolved";
    case "overdue":
      return locale === "vi" ? "Qua han" : "Overdue";
    default:
      return locale === "vi" ? "San sang" : "Ready";
  }
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.xl,
  },
  group: {
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
  focusCard: {
    borderRadius: semanticRadius.card.hero,
    borderWidth: 1,
    minHeight: 258,
    overflow: "hidden",
    position: "relative",
    ...getBorderStyle(semanticBorder.card.subtle),
    boxShadow: semanticElevation.hero,
  },
  focusWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
    zIndex: 1,
  },
  focusBackground: {
    flex: 1,
    position: "relative",
  },
  focusMotif: {
    bottom: 18,
    opacity: 0.08,
    position: "absolute",
    right: 12,
    zIndex: 2,
  },
  focusWatermarkWrap: {
    marginTop: -64,
    position: "absolute",
    right: -8,
    top: "50%",
    zIndex: 2,
  },
  focusWatermarkImage: {
    height: 128,
    opacity: 0.075,
    width: 128,
  },
  focusContentFrame: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    position: "relative",
    zIndex: 10,
  },
  focusTextBlock: {
    flexShrink: 1,
    gap: spacing.sm,
    minHeight: 0,
  },
  focusPathLabel: {
    textTransform: "uppercase",
    fontSize: 14,
    letterSpacing: 3,
    lineHeight: 18,
  },
  focusTitle: {
    color: foundationColors.ink.primary,
    fontSize: 29,
    lineHeight: 35,
    letterSpacing: 0,
  },
  focusRule: {
    borderRadius: 999,
    height: 2,
    marginTop: 2,
    width: 56,
  },
  focusTime: {
    fontSize: 20,
    fontVariant: ["tabular-nums"],
    lineHeight: 25,
  },
  focusSummary: {
    color: foundationColors.ink.secondary,
    fontSize: 14,
    lineHeight: 19,
  },
  focusFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  focusChevronCircle: {
    alignItems: "center",
    backgroundColor: "rgba(255, 248, 226, 0.58)",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  statusPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  statusText: {
    maxWidth: 148,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
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
  rowWatermarkWrap: {
    marginTop: -24,
    position: "absolute",
    right: 8,
    top: "50%",
    zIndex: 0,
  },
  rowWatermarkImage: {
    height: 64,
    opacity: 0.08,
    width: 64,
  },
  rowTimeWrap: {
    alignItems: "center",
    gap: 2,
    justifyContent: "center",
    minWidth: 62,
    zIndex: 2,
  },
  rowTime: {
    fontSize: 19,
    lineHeight: 25,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  rowTimeEnd: {
    fontSize: 19,
    lineHeight: 25,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  rowDivider: {
    height: 46,
    width: 1,
    zIndex: 2,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    zIndex: 2,
  },
  rowTitle: {
    color: foundationColors.ink.primary,
  },
  rowTitleFinal: {
    textDecorationLine: "line-through",
  },
  donePill: {
    backgroundColor: "#E8E3D5",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    zIndex: 2,
  },
  doneText: {
    color: "#35552F",
  },
});
