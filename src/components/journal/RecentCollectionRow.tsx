import { StyleSheet, View } from "react-native";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";
import { BotanicalMotifLayer } from "../primitives/BotanicalMotifLayer";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { foundationColors, spacing } from "../../theme/tokens";
import { formatJournalDateLabel, getJournalDayLabel, getJournalMonthLabel } from "./journalPlaceholders";
import { getRecentCollectionWeekdayKey, resolveRecentCollectionCardSkin } from "../../tokens/recentCollectionCardSkins";
import { Locale } from "../../types/ui";

type Chip = { label: string; colorToken?: string; iconName?: "memory" | "mark" | "heart" | "done" };

type Props = {
  ownerId?: string;
  locale?: Locale;
  label?: string;
  title?: string;
  subtitle?: string;
  day?: string;
  month?: string;
  date?: Date;
  chips?: Chip[];
  readonly?: boolean;
  loading?: boolean;
  onPress?: () => void;
  visualIndex?: number;
  forceMotifFallback?: boolean;
};

export function RecentCollectionRow({
  ownerId,
  locale = "en",
  label,
  day = "13",
  month = "MAY",
  date,
  chips = [],
  readonly = false,
  loading = false,
  onPress,
  visualIndex = 0,
  forceMotifFallback = false,
}: Props) {
  const actionable = Boolean(onPress) && !readonly && !loading;
  const resolvedOwnerId = ownerId ?? `collection-${month}-${day}`;
  const resolvedDate = resolveRecentCollectionDate({ date, day, locale, month });
  const weekdayKey = getRecentCollectionWeekdayKey(resolvedDate, visualIndex);
  const skin = resolveRecentCollectionCardSkin(resolvedDate, visualIndex);
  const dateLabel = getRecentCollectionDateLabel({ day, locale, month, resolvedDate });
  const monthLabel = resolvedDate ? getJournalMonthLabel(resolvedDate, locale) : month;
  const dayLabel = resolvedDate ? getJournalDayLabel(resolvedDate, locale) : day;
  const visibleChips = chips.filter((chip) => chip.label.trim() && chip.label.trim() !== "...").slice(0, 2);
  const primaryLine = label?.trim() || "";
  const accessibilityLabel = [dateLabel, primaryLine, ...visibleChips.map((chip) => chip.label.trim())].filter(Boolean).join(", ");

  return (
    <JournalCard
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={actionable ? "button" : "summary"}
      actionable={actionable}
      backgroundLayer={
        <View style={styles.backgroundBase}>
          {!forceMotifFallback ? (
            <BotanicalMotifLayer
              anchor={skin.anchor}
              debugLabel={`recent:${weekdayKey}`}
              fit="cover"
              matchLongEdgeToCardWidth
              motif={skin.motif}
              opacity={Math.max(0.4, skin.opacity + 0.04)}
              orientLongEdge="horizontal"
              rotation={skin.rotation}
              scale={Math.max(1.5, skin.scale)}
            />
          ) : null}
        </View>
      }
      contentStyle={styles.cardContent}
      loading={loading}
      onPress={actionable ? onPress : undefined}
      overlayLayer={({ pressed }) => <RecentCollectionSurfaceOverlay pressed={pressed} />}
      preserveSurfaceColorOnPress
      style={styles.cardSurface}
      variant="standard"
    >
      <View style={styles.row}>
        <View style={styles.dateBlock}>
          <View style={styles.dateTile}>
            <WMText numberOfLines={1} style={styles.dateMonth} variant="metaCompact">
              {monthLabel}
            </WMText>
            <WMText numberOfLines={1} style={styles.dateDay} variant="display">
              {dayLabel}
            </WMText>
          </View>
        </View>

        <View style={styles.contentColumn}>
          {primaryLine ? (
            <WMText numberOfLines={1} style={styles.label} variant="cardTitle">
              {primaryLine}
            </WMText>
          ) : null}

          {visibleChips.length ? (
            <View style={styles.chipsRow}>
              {visibleChips.map((chip, index) => (
                <View key={`${resolvedOwnerId}-chip-${chip.label}-${index}`} style={[styles.chip, getChipViewStyle(chip.colorToken)]}>
                  <WMText numberOfLines={1} style={[styles.chipText, chip.colorToken ? styles.chipTextAccent : null]} variant="metaCompact">
                    {chip.label}
                  </WMText>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </JournalCard>
  );
}

function RecentCollectionSurfaceOverlay({ pressed }: { pressed: boolean }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.vellumOverlay} />
      {pressed ? <View style={styles.pressedOverlay} /> : null}
    </View>
  );
}

function resolveRecentCollectionDate({
  date,
  day,
  locale,
  month,
}: {
  date?: Date;
  day: string;
  locale: Locale;
  month: string;
}) {
  if (date && !Number.isNaN(date.getTime())) {
    return date;
  }

  const monthIndex = resolveMonthIndex(month, locale);
  const dayNumber = Number.parseInt(day, 10);

  if (monthIndex === null || Number.isNaN(dayNumber)) {
    return null;
  }

  return new Date(new Date().getFullYear(), monthIndex, dayNumber);
}

function resolveMonthIndex(month: string, locale: Locale) {
  const normalizedInput = normalizeMonthToken(month);

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const probe = new Date(2026, monthIndex, 1);
    const probeLabel = normalizeMonthToken(formatJournalDateLabel(probe, locale, { month: "short" }));

    if (probeLabel === normalizedInput) {
      return monthIndex;
    }
  }

  return null;
}

function normalizeMonthToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\./gu, "")
    .replace(/\s+/gu, "")
    .toLocaleUpperCase("en-US");
}

function getRecentCollectionDateLabel({
  day,
  locale,
  month,
  resolvedDate,
}: {
  day: string;
  locale: Locale;
  month: string;
  resolvedDate: Date | null;
}) {
  if (!resolvedDate) {
    return `${month} ${day}`.trim();
  }

  return formatJournalDateLabel(resolvedDate, locale, { month: "short", day: "numeric" }).replace(/\./gu, "");
}

function getChipViewStyle(colorToken?: string) {
  if (!colorToken) {
    return {
      backgroundColor: "rgba(255,248,234,0.56)",
      ...getBorderStyle("1px solid rgba(143, 114, 78, 0.16)"),
    };
  }

  return {
    backgroundColor: "rgba(255,248,234,0.56)",
    ...getBorderStyle(`1px solid ${colorToken}33`),
  };
}

const styles = StyleSheet.create({
  cardSurface: {
    minHeight: 98,
  },
  cardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  vellumOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: foundationColors.bg.paperWarm,
    opacity: 0.025,
  },
  pressedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: foundationColors.bg.paperSoft,
    opacity: 0.12,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 72,
    position: "relative",
  },
  dateBlock: {
    marginRight: 14,
    width: 78,
  },
  dateTile: {
    alignItems: "center",
    backgroundColor: "rgba(255,248,234,0.56)",
    borderRadius: 22,
    justifyContent: "center",
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 8,
    ...getBorderStyle("1px solid rgba(143, 114, 78, 0.16)"),
  },
  dateMonth: {
    color: foundationColors.ink.secondary,
    fontSize: 12,
    letterSpacing: 1.1,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  dateDay: {
    color: foundationColors.ink.primary,
    fontSize: 36,
    fontWeight: "600",
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  contentColumn: {
    flex: 1,
    flexShrink: 1,
    justifyContent: "center",
    minWidth: 0,
    paddingRight: 22,
  },
  label: {
    color: foundationColors.ink.primary,
    flexShrink: 1,
    fontSize: 22,
    lineHeight: 26,
    marginBottom: 6,
    width: "100%",
  },
  chipsRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    maxWidth: "100%",
    overflow: "hidden",
  },
  chip: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    minHeight: 24,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    color: foundationColors.ink.secondary,
    flexShrink: 1,
  },
  chipTextAccent: {
    color: foundationColors.ink.primary,
  },
});
