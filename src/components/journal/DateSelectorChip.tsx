import { useEffect, useMemo, useState } from "react";
import { AccessibilityRole, Pressable, StyleSheet, View } from "react-native";
import { IconBadge } from "../primitives/IconBadge";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMSheet } from "../primitives/WMSheet";
import { WMText } from "../primitives/Text";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { getCopy } from "../../i18n/copy";
import { controlTokens, foundationColors, semanticBorder, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { journalChrome } from "./journalPlaceholders";

export type DateSelectorOption = {
  id: string;
  label: string;
};

type Props = {
  locale?: Locale;
  label: string;
  active?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  loading?: boolean;
  onPress?: () => void;
  options?: DateSelectorOption[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  sheetTitle?: string;
  triggerVariant?: "chip" | "icon";
};

export function DateSelectorChip({
  locale = "en",
  label,
  active = false,
  disabled = false,
  readonly = false,
  loading = false,
  onPress,
  options,
  selectedId,
  onSelect,
  sheetTitle,
  triggerVariant = "chip",
}: Props) {
  const c = getCopy(locale);
  const [open, setOpen] = useState(false);
  const hasOptions = Boolean(options?.length && onSelect);
  const interactive = (Boolean(onPress) || hasOptions) && !readonly && !disabled && !loading;
  const resolvedOnPress = useMemo(() => {
    if (onPress) {
      return onPress;
    }

    if (hasOptions) {
      return () => setOpen(true);
    }

    return undefined;
  }, [hasOptions, onPress]);
  const content =
    triggerVariant === "icon" ? (
      <IconBadge
        accessibilityLabel={c.journal.dateSelectorA11y.replace("{label}", label)}
        decorative={false}
        onPress={interactive ? resolvedOnPress : undefined}
        semanticName="utility.calendar"
        shape="rounded"
        size="md"
        state={interactive ? "default" : "disabled"}
        tone={open || active ? "green" : "default"}
      />
    ) : (
      <View style={[styles.base, active || open ? styles.active : null, disabled ? styles.disabled : null]}>
        <View style={styles.leading}>
          <WaymarkIcon decorative semanticName="utility.calendar" size="sm" />
          <WMText numberOfLines={1} style={styles.label} variant="label">
            {loading ? "..." : label}
          </WMText>
        </View>
      </View>
    );

  if (!interactive) {
    return (
      <View accessibilityLabel={c.journal.dateSelectorA11y.replace("{label}", label)} accessibilityRole={"text" satisfies AccessibilityRole}>
        {content}
      </View>
    );
  }

  return (
    <>
      {triggerVariant === "icon" ? (
        content
      ) : (
        <Pressable
          accessibilityLabel={c.journal.dateSelectorA11y.replace("{label}", label)}
          accessibilityRole="button"
          disabled={!interactive}
          onPress={resolvedOnPress}
          style={styles.pressable}
        >
          {content}
        </Pressable>
      )}

      {hasOptions ? (
        <WMSheet onClose={() => setOpen(false)} title={sheetTitle ?? c.journal.title} visible={open}>
          <JournalCalendarPicker
            locale={locale}
            maxDateId={options?.[0]?.id}
            onSelect={(id) => {
              onSelect?.(id);
              setOpen(false);
            }}
            selectedId={selectedId ?? options?.[0]?.id}
          />
        </WMSheet>
      ) : null}
    </>
  );
}

function JournalCalendarPicker({
  locale,
  maxDateId,
  selectedId,
  onSelect,
}: {
  locale: Locale;
  maxDateId?: string;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const maxDate = parseDateKey(maxDateId) ?? getTodayUtcDate();
  const selectedDate = parseDateKey(selectedId) ?? maxDate;
  const [visibleMonth, setVisibleMonth] = useState(() => startOfUtcMonth(selectedDate));

  useEffect(() => {
    setVisibleMonth(startOfUtcMonth(selectedDate));
  }, [selectedId]);

  const monthCells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const nextMonth = addUtcMonths(visibleMonth, 1);
  const canGoNext = toDateKey(nextMonth) <= toDateKey(startOfUtcMonth(maxDate));
  const weekDays = locale === "vi" ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <View style={styles.calendarStack}>
      <View style={styles.calendarHeader}>
        <Pressable
          accessibilityLabel={locale === "vi" ? "Thang truoc" : "Previous month"}
          accessibilityRole="button"
          onPress={() => setVisibleMonth((current) => addUtcMonths(current, -1))}
          style={styles.monthNavButton}
        >
          <WaymarkIcon decorative semanticName="utility.chevronLeft" size="sm" state="muted" />
        </Pressable>
        <WMText style={styles.monthTitle} variant="sectionTitle">
          {formatMonthTitle(visibleMonth, locale)}
        </WMText>
        <Pressable
          accessibilityLabel={locale === "vi" ? "Thang sau" : "Next month"}
          accessibilityRole="button"
          disabled={!canGoNext}
          onPress={() => setVisibleMonth((current) => addUtcMonths(current, 1))}
          style={[styles.monthNavButton, !canGoNext ? styles.monthNavButtonDisabled : null]}
        >
          <WaymarkIcon decorative semanticName="utility.chevronRight" size="sm" state={!canGoNext ? "disabled" : "muted"} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {weekDays.map((day) => (
          <WMText key={day} style={styles.weekdayText} variant="caption">
            {day}
          </WMText>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {monthCells.map((date, index) => {
          const dateId = date ? toDateKey(date) : "";
          const selected = Boolean(dateId && dateId === selectedId);
          const disabledDate = Boolean(!date || dateId > toDateKey(maxDate));

          return (
            <Pressable
              accessibilityLabel={date ? formatDateA11y(date, locale) : undefined}
              accessibilityRole={date ? "button" : undefined}
              disabled={disabledDate}
              key={dateId || `blank-${index}`}
              onPress={() => dateId && onSelect(dateId)}
              style={[styles.dayCell, selected ? styles.dayCellSelected : null, disabledDate ? styles.dayCellDisabled : null]}
            >
              {date ? (
                <WMText style={[styles.dayText, selected ? styles.dayTextSelected : null]} variant="label">
                  {date.getUTCDate()}
                </WMText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function parseDateKey(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function getTodayUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function toDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthCells(month: Date) {
  const firstDay = startOfUtcMonth(month);
  const leadingBlankCount = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: Array<Date | null> = Array.from({ length: leadingBlankCount }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day)));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function formatMonthTitle(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function formatDateA11y(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(date);
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: "flex-start",
    minHeight: 44,
    minWidth: 44,
  },
  base: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: journalChrome.paperWarm,
    borderRadius: controlTokens.radius.default,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between",
    minHeight: 44,
    minWidth: 132,
    maxWidth: 220,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    ...getBorderStyle(semanticBorder.chip.default),
  },
  active: {
    backgroundColor: "#F4FAF1",
    ...getBorderStyle(semanticBorder.chip.active),
  },
  disabled: {
    opacity: 0.56,
  },
  leading: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
  },
  label: {
    color: journalChrome.inkSecondary,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    minWidth: 0,
  },
  calendarStack: {
    gap: spacing.md,
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  monthNavButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  monthNavButtonDisabled: {
    opacity: 0.4,
  },
  monthTitle: {
    color: journalChrome.ink,
    flex: 1,
    textAlign: "center",
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekdayText: {
    color: journalChrome.inkSecondary,
    flex: 1,
    textAlign: "center",
    textTransform: "uppercase",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    alignItems: "center",
    aspectRatio: 1,
    justifyContent: "center",
    width: `${100 / 7}%`,
  },
  dayCellSelected: {
    backgroundColor: controlTokens.color.selected,
    borderRadius: controlTokens.radius.default,
  },
  dayCellDisabled: {
    opacity: 0.32,
  },
  dayText: {
    color: journalChrome.ink,
    fontSize: 15,
    lineHeight: 20,
  },
  dayTextSelected: {
    color: foundationColors.green.deep,
  },
});
