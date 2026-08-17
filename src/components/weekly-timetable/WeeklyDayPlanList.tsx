import { Pressable, StyleSheet, View } from "react-native";
import { buildWeeklyDayItems, type WeeklyDayPlanSourceDay } from "../../app/weeklyDayPlanModel";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import type { Locale } from "../../types/ui";
import type { TodayMarkItem } from "../today/__fixtures__/todayCarousel.fixtures";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMText } from "../primitives/Text";

type Props = {
  locale: Locale;
  selectedDate: string | null;
  selectedDateLabel: string;
  days: WeeklyDayPlanSourceDay[];
  marks: TodayMarkItem[];
  status: "loading" | "ready" | "error";
  errorMessage?: string;
  isHistorical?: boolean;
  onOpenPlanItem?: (itemId: string) => void;
  onOpenMark?: (mark: TodayMarkItem) => void;
};

export function WeeklyDayPlanList({
  locale,
  selectedDate,
  selectedDateLabel,
  days,
  marks,
  status,
  errorMessage,
  isHistorical = false,
  onOpenPlanItem,
  onOpenMark,
}: Props) {
  const copy = getCopy(locale);
  const items = buildWeeklyDayItems({ days, selectedDate, marks, locale });
  const marksById = new Map(marks.map((mark) => [mark.id, mark] as const));

  return (
    <View style={styles.stack}>
      <View style={styles.header}>
        <WMText style={styles.title} variant="sectionTitle">
          {isHistorical ? copy.historyTitle : selectedDateLabel}
        </WMText>
        <WMText style={styles.meta} variant="meta">
          {`${items.length} ${copy.itemUnit}`}
        </WMText>
      </View>

      {status === "loading" ? (
        <WMEmptyState body={copy.loadingBody} title={copy.loadingTitle} />
      ) : status === "error" ? (
        <WMEmptyState body={errorMessage ?? copy.errorBody} title={copy.errorTitle} />
      ) : items.length === 0 ? (
        <WMEmptyState body={copy.emptyBody} title={copy.emptyTitle} />
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const mark = item.markInstanceId ? marksById.get(item.markInstanceId) : undefined;
            const onPress =
              item.source === "week_plan"
                ? onOpenPlanItem
                  ? () => onOpenPlanItem(item.sourceId)
                  : undefined
                : mark && onOpenMark
                  ? () => onOpenMark(mark)
                  : undefined;
            return (
              <Pressable
                accessibilityLabel={`${item.timeLabel} ${item.title}`.trim()}
                accessibilityRole={onPress ? "button" : undefined}
                disabled={!onPress}
                key={item.id}
                onPress={onPress}
                style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
              >
                <WMText style={styles.time} variant="meta">
                  {item.timeLabel || copy.noTime}
                </WMText>
                <View style={styles.body}>
                  <WMText style={styles.itemTitle} variant="body">
                    {item.title}
                  </WMText>
                  <WMText style={styles.breadcrumb} variant="metaCompact">
                    {[item.pathLabel, item.expeditionLabel, item.milestoneLabel].filter(Boolean).join(" · ")}
                  </WMText>
                  <WMText style={item.issue ? styles.issue : styles.status} variant="metaCompact">
                    {item.issue ?? item.statusLabel ?? copy.notMaterialized}
                  </WMText>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function getCopy(locale: Locale) {
  return {
    historyTitle: locale === "vi" ? "Lịch sử Mark" : "Mark history",
    itemUnit: locale === "vi" ? "mục" : "items",
    noTime: locale === "vi" ? "Chưa có giờ" : "No time",
    notMaterialized: locale === "vi" ? "Chưa materialize Mark" : "Mark not materialized",
    loadingTitle: locale === "vi" ? "Đang tải ngày" : "Loading day",
    loadingBody: locale === "vi" ? "Đang đọc kế hoạch của ngày đã chọn." : "Reading the selected day's plan.",
    errorTitle: locale === "vi" ? "Không tải được ngày" : "Day unavailable",
    errorBody: locale === "vi" ? "Không thể đọc kế hoạch của ngày này." : "The plan for this day could not be read.",
    emptyTitle: locale === "vi" ? "Ngày đang trống" : "Day is clear",
    emptyBody: locale === "vi" ? "Không có Planned Mark trong ngày này." : "There are no planned marks on this day.",
  };
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xxs,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  meta: {
    color: foundationColors.ink.secondary,
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    alignItems: "flex-start",
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  itemPressed: {
    opacity: 0.78,
  },
  time: {
    color: foundationColors.green.deep,
    minWidth: 76,
  },
  body: {
    flex: 1,
    gap: spacing.xxs,
  },
  itemTitle: {
    color: foundationColors.ink.primary,
  },
  breadcrumb: {
    color: foundationColors.ink.secondary,
  },
  status: {
    color: foundationColors.green.deep,
    textTransform: "capitalize",
  },
  issue: {
    color: foundationColors.gold.deep,
  },
});
