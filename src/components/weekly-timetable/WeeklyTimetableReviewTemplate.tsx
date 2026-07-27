import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMText } from "../primitives/Text";
import { WeekNavigator } from "../weekly-coding/WeekNavigator";
import type { Locale } from "../../types/ui";
import { foundationColors, spacing } from "../../theme/tokens";

export type WeeklyTimetableReviewDay = {
  id: string;
  localDate: string | null;
  label: string;
  items: Array<{
    id: string;
    timeLabel: string;
    title: string;
    pathLabel: string;
    expeditionLabel?: string;
    milestoneLabel?: string;
    createdMarkInstanceId?: string;
    createdMarkStatus?: string;
    issue?: string;
  }>;
};

export type WeeklyTimetableVerificationSummary = {
  weekPlanItemCount: number;
  materializedMarkCount: number;
  missingCreatedMarkInstanceCount: number;
  duplicateMarkCount: number;
  lastImportedAt?: string;
};

type Props = {
  locale?: Locale;
  selectedWeekLabel: string;
  selectedWeekDateRange: string;
  weekStartDate?: string;
  weekEndDate?: string;
  weekStatus?: string;
  days: WeeklyTimetableReviewDay[];
  summary: WeeklyTimetableVerificationSummary | null;
  previousWeekDisabled?: boolean;
  nextWeekDisabled?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  onOpenItem?: (itemId: string) => void;
};

export function WeeklyTimetableReviewTemplate({
  locale = "en",
  selectedWeekLabel,
  selectedWeekDateRange,
  weekStartDate,
  weekEndDate,
  weekStatus,
  days,
  summary,
  previousWeekDisabled = false,
  nextWeekDisabled = false,
  showBack = false,
  onBack,
  onPreviousWeek,
  onNextWeek,
  onOpenItem,
}: Props) {
  const subtitle = locale === "vi" ? "Xem chinh xac nhung gi da duoc luu vao week_plans va week_plan_items." : "Review exactly what was saved into week_plans and week_plan_items.";
  const table = buildTimetableTable(days, locale);

  return (
    <FieldJournalScreenShell botanicalAmbient variant="navAware">
      <PageHeader
        decorativeAccent
        onBack={onBack}
        showBack={showBack}
        subtitle={subtitle}
        title={locale === "vi" ? "Weekly Timetable" : "Weekly Timetable"}
        variant={showBack ? "withBack" : "standard"}
      />

      <WeekNavigator
        dateRangeLabel={selectedWeekDateRange}
        locale={locale}
        nextDisabled={nextWeekDisabled}
        onNext={onNextWeek}
        onPrevious={onPreviousWeek}
        previousDisabled={previousWeekDisabled}
        weekLabel={selectedWeekLabel}
      />

      <View style={styles.summaryCard}>
        <WMText variant="sectionTitle">{locale === "vi" ? "Verification" : "Verification"}</WMText>
        <WMText variant="body">{`${locale === "vi" ? "Week" : "Week"}: ${weekStartDate ?? "-"} -> ${weekEndDate ?? "-"}`}</WMText>
        <WMText variant="body">{`${locale === "vi" ? "Status" : "Status"}: ${weekStatus ?? "-"}`}</WMText>
        <WMText variant="body">{`${locale === "vi" ? "Items" : "Items"}: ${summary?.weekPlanItemCount ?? 0}`}</WMText>
        <WMText variant="body">{`${locale === "vi" ? "Materialized marks" : "Materialized marks"}: ${summary?.materializedMarkCount ?? 0}`}</WMText>
        <WMText variant="body">{`${locale === "vi" ? "Missing created_mark_instance_id" : "Missing created_mark_instance_id"}: ${summary?.missingCreatedMarkInstanceCount ?? 0}`}</WMText>
        <WMText variant="body">{`${locale === "vi" ? "Duplicate marks" : "Duplicate marks"}: ${summary?.duplicateMarkCount ?? 0}`}</WMText>
        <WMText variant="body">{`${locale === "vi" ? "Last saved" : "Last saved"}: ${summary?.lastImportedAt ?? "-"}`}</WMText>
      </View>

      {days.length === 0 ? (
        <WMEmptyState
          body={
            locale === "vi"
              ? "Khong co Weekly Timetable nao duoc luu cho tuan nay."
              : "No Weekly Timetable has been saved for this week."
          }
          title={locale === "vi" ? "Weekly Timetable trong" : "Weekly Timetable empty"}
        />
      ) : (
        <WeeklyTimetableTable
          dayColumns={table.dayColumns}
          locale={locale}
          onOpenItem={onOpenItem}
          rows={table.rows}
        />
      )}
    </FieldJournalScreenShell>
  );
}

type WeeklyTimetableTableDay = Pick<WeeklyTimetableReviewDay, "id" | "label" | "localDate">;
type WeeklyTimetableTableItem = WeeklyTimetableReviewDay["items"][number];
type WeeklyTimetableTableRow = {
  id: string;
  blockLabel: string;
  sortKey: string;
  itemsByDayId: Record<string, WeeklyTimetableTableItem[]>;
};

const BLOCK_COLUMN_WIDTH = 104;
const DAY_COLUMN_WIDTH = 214;

function WeeklyTimetableTable({
  dayColumns,
  locale,
  onOpenItem,
  rows,
}: {
  dayColumns: WeeklyTimetableTableDay[];
  locale: Locale;
  onOpenItem?: (itemId: string) => void;
  rows: WeeklyTimetableTableRow[];
}) {
  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHintRow}>
        <WMText style={styles.tableHint} variant="meta">
          {locale === "vi" ? "Scroll ngang de xem tung ngay. Cot Block duoc giu co dinh." : "Scroll horizontally by day. The Block column stays fixed."}
        </WMText>
      </View>
      <View style={styles.tableFrame}>
        <View style={styles.blockPane}>
          <View style={[styles.headerCell, styles.blockHeaderCell]}>
            <WMText style={styles.headerLabel} variant="meta">
              Block
            </WMText>
          </View>
          {rows.map((row) => (
            <View key={row.id} style={[styles.blockCell, styles.tableRowCell]}>
              <WMText numberOfLines={2} style={styles.blockLabel} variant="bodyStrong">
                {row.blockLabel}
              </WMText>
            </View>
          ))}
        </View>
        <ScrollView
          decelerationRate="fast"
          disableIntervalMomentum
          horizontal
          showsHorizontalScrollIndicator
          snapToInterval={DAY_COLUMN_WIDTH}
        >
          <View>
            <View style={styles.dayHeaderRow}>
              {dayColumns.map((day) => (
                <View key={day.id} style={[styles.headerCell, styles.dayHeaderCell]}>
                  <WMText numberOfLines={1} style={styles.headerLabel} variant="meta">
                    {day.label}
                  </WMText>
                  {day.localDate ? (
                    <WMText numberOfLines={1} style={styles.headerDate} variant="bodyXs">
                      {day.localDate}
                    </WMText>
                  ) : null}
                </View>
              ))}
            </View>
            {rows.map((row) => (
              <View key={row.id} style={styles.dayRow}>
                {dayColumns.map((day) => (
                  <View key={`${row.id}-${day.id}`} style={[styles.dayCell, styles.tableRowCell]}>
                    {(row.itemsByDayId[day.id] ?? []).length > 0 ? (
                      row.itemsByDayId[day.id].map((item) => (
                        <WeeklyTimetableTableItemCard
                          key={item.id}
                          item={item}
                          locale={locale}
                          onOpenItem={onOpenItem}
                        />
                      ))
                    ) : (
                      <WMText style={styles.emptyCellText} variant="bodyXs">
                        -
                      </WMText>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function WeeklyTimetableTableItemCard({
  item,
  locale,
  onOpenItem,
}: {
  item: WeeklyTimetableTableItem;
  locale: Locale;
  onOpenItem?: (itemId: string) => void;
}) {
  const content = (
    <View style={[styles.tableItemCard, item.issue ? styles.tableItemIssueCard : null]}>
      <WMText numberOfLines={2} style={styles.tableItemTitle} variant="bodyStrong">
        {item.title}
      </WMText>
      <WMText numberOfLines={2} style={styles.itemMeta} variant="bodyXs">
        {item.pathLabel}
      </WMText>
      {item.expeditionLabel || item.milestoneLabel ? (
        <WMText numberOfLines={2} style={styles.itemMeta} variant="bodyXs">
          {[item.expeditionLabel, item.milestoneLabel].filter(Boolean).join(" / ")}
        </WMText>
      ) : null}
      <WMText numberOfLines={1} style={styles.itemMeta} variant="bodyXs">
        {`${locale === "vi" ? "Mark" : "Mark"}: ${item.createdMarkInstanceId ? item.createdMarkStatus ?? "linked" : "missing"}`}
      </WMText>
      {item.issue ? (
        <WMText numberOfLines={2} style={styles.issue} variant="bodyXs">
          {item.issue}
        </WMText>
      ) : null}
    </View>
  );

  if (!onOpenItem) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" onPress={() => onOpenItem(item.id)}>
      {content}
    </Pressable>
  );
}

function buildTimetableTable(days: WeeklyTimetableReviewDay[], locale: Locale) {
  const dayColumns = days.map((day) => ({
    id: day.id,
    label: day.label,
    localDate: day.localDate,
  }));
  const rowsByBlock = new Map<string, WeeklyTimetableTableRow>();

  for (const day of days) {
    for (const item of day.items) {
      const blockLabel = item.timeLabel || (locale === "vi" ? "Chua xep gio" : "No slot");
      const row =
        rowsByBlock.get(blockLabel) ??
        {
          id: sanitizeTableId(blockLabel),
          blockLabel,
          sortKey: resolveBlockSortKey(blockLabel),
          itemsByDayId: {},
        };
      row.itemsByDayId[day.id] = [...(row.itemsByDayId[day.id] ?? []), item].sort((left, right) =>
        left.title.localeCompare(right.title),
      );
      rowsByBlock.set(blockLabel, row);
    }
  }

  return {
    dayColumns,
    rows: [...rowsByBlock.values()].sort((left, right) => left.sortKey.localeCompare(right.sortKey)),
  };
}

function resolveBlockSortKey(blockLabel: string) {
  const time = blockLabel.match(/\d{1,2}:\d{2}/)?.[0];
  return time ? `${time.padStart(5, "0")} ${blockLabel}` : `99:99 ${blockLabel}`;
}

function sanitizeTableId(value: string) {
  return value.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "block";
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  tableCard: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: spacing.lg,
    overflow: "hidden",
  },
  tableHintRow: {
    borderBottomColor: foundationColors.border.soft,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tableHint: {
    color: foundationColors.ink.secondary,
  },
  tableFrame: {
    flexDirection: "row",
  },
  blockPane: {
    backgroundColor: foundationColors.bg.paperWarm,
    borderRightColor: foundationColors.border.soft,
    borderRightWidth: 1,
    width: BLOCK_COLUMN_WIDTH,
  },
  dayHeaderRow: {
    flexDirection: "row",
  },
  dayRow: {
    flexDirection: "row",
  },
  headerCell: {
    borderBottomColor: foundationColors.border.soft,
    borderBottomWidth: 1,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  blockHeaderCell: {
    width: BLOCK_COLUMN_WIDTH,
  },
  dayHeaderCell: {
    backgroundColor: foundationColors.bg.paperSoft,
    borderRightColor: foundationColors.border.soft,
    borderRightWidth: 1,
    width: DAY_COLUMN_WIDTH,
  },
  headerLabel: {
    color: foundationColors.ink.primary,
    fontWeight: "700",
  },
  headerDate: {
    color: foundationColors.ink.secondary,
  },
  tableRowCell: {
    borderBottomColor: foundationColors.border.soft,
    borderBottomWidth: 1,
    minHeight: 138,
    padding: spacing.sm,
  },
  blockCell: {
    justifyContent: "flex-start",
    width: BLOCK_COLUMN_WIDTH,
  },
  blockLabel: {
    color: foundationColors.ink.primary,
  },
  dayCell: {
    backgroundColor: foundationColors.bg.paper,
    borderRightColor: foundationColors.border.soft,
    borderRightWidth: 1,
    gap: spacing.xs,
    width: DAY_COLUMN_WIDTH,
  },
  tableItemCard: {
    backgroundColor: "rgba(255, 252, 246, 0.86)",
    borderColor: foundationColors.border.soft,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
    padding: spacing.sm,
  },
  tableItemIssueCard: {
    borderColor: foundationColors.clay.base,
  },
  tableItemTitle: {
    color: foundationColors.ink.primary,
  },
  emptyCellText: {
    color: foundationColors.ink.tertiary,
    textAlign: "center",
  },
  dayStack: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  dayCard: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  itemCard: {
    borderTopColor: foundationColors.border.soft,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  itemMeta: {
    color: foundationColors.ink.secondary,
  },
  issue: {
    color: foundationColors.clay.base,
  },
});
