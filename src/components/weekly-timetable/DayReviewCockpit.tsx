import { StyleSheet, View } from "react-native";
import type { TodayMarkItem } from "../today/__fixtures__/todayCarousel.fixtures";
import { TodayMarkTrailSection } from "../today/TodayMarkTrailSection";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { WMText } from "../primitives/Text";
import { foundationColors, spacing } from "../../theme/tokens";
import type { Locale } from "../../types/ui";

type Props = {
  locale: Locale;
  localDate: string | null;
  dateLabel: string;
  status: "loading" | "ready" | "error";
  errorMessage?: string;
  marks: TodayMarkItem[];
  hasWeeklyTimetableForDate: boolean;
  plannedItemCount: number;
  isHistorical?: boolean;
  onOpenMarkDetail?: (mark: TodayMarkItem) => void;
};

export function DayReviewCockpit({
  locale,
  localDate,
  dateLabel,
  status,
  errorMessage,
  marks,
  hasWeeklyTimetableForDate,
  plannedItemCount,
  isHistorical = false,
  onOpenMarkDetail,
}: Props) {
  const copy = getCopy(locale);

  return (
    <View style={styles.stack}>
      <View style={styles.header}>
        <WMText style={styles.title} variant="sectionTitle">
          {isHistorical ? copy.historyTitle : copy.title}
        </WMText>
        <WMText style={styles.meta} variant="meta">
          {localDate ? `${dateLabel} - ${plannedItemCount} ${copy.planUnit}` : copy.noDate}
        </WMText>
      </View>

      {status === "error" ? (
        <WMEmptyState body={errorMessage ?? copy.errorBody} title={copy.errorTitle} />
      ) : status === "loading" ? (
        <WMEmptyState body={copy.loadingBody} title={copy.loadingTitle} />
      ) : (
        <TodayMarkTrailSection
          copyOverrides={{
            focusedTitle: copy.focusedTitle,
            listTitle: copy.listTitle,
            noMarksTitle: copy.noMarksTitle,
            noMarksBody: copy.noMarksBody,
            missingTimetableTitle: copy.missingTimetableTitle,
            missingTimetableBody: copy.missingTimetableBody,
            clearTitle: copy.clearTitle,
            clearBody: copy.clearBody,
          }}
          hasWeeklyTimetableForDate={hasWeeklyTimetableForDate}
          locale={locale}
          marks={marks}
          onOpenMarkDetail={onOpenMarkDetail}
        />
      )}
    </View>
  );
}

function getCopy(locale: Locale) {
  return {
    title: locale === "vi" ? "Day Review Cockpit" : "Day Review Cockpit",
    historyTitle: locale === "vi" ? "Lịch sử Mark" : "Mark history",
    noDate: locale === "vi" ? "Chua chon ngay" : "No day selected",
    planUnit: locale === "vi" ? "plan" : "plan",
    loadingTitle: locale === "vi" ? "Dang tai ngay" : "Loading day",
    loadingBody: locale === "vi" ? "Dang gom cac Mark cho ngay da chon." : "Gathering marks for the selected day.",
    errorTitle: locale === "vi" ? "Khong tai duoc ngay" : "Day review could not load",
    errorBody: locale === "vi" ? "Thu refresh sau khi database san sang." : "Try refreshing after the database is ready.",
    focusedTitle: locale === "vi" ? "Diem chinh trong ngay" : "Day Focus",
    listTitle: locale === "vi" ? "Cac viec con lai" : "Day Trail",
    noMarksTitle: locale === "vi" ? "Chua co Mark" : "No marks yet",
    noMarksBody:
      locale === "vi"
        ? "Ngay nay co ke hoach, nhung chua co Mark nao hien thi."
        : "This day has a plan, but no marks are visible yet.",
    missingTimetableTitle: locale === "vi" ? "Chua co Weekly Timetable" : "Weekly Timetable missing",
    missingTimetableBody:
      locale === "vi"
        ? "Ngay nay chua co item nao trong Weekly Timetable local."
        : "This date has no local Weekly Timetable items.",
    clearTitle: locale === "vi" ? "Ngay da gon" : "Day is clear",
    clearBody: locale === "vi" ? "Tat ca Mark hien thi trong ngay da duoc xu ly." : "Every visible mark for the day is settled.",
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
});
