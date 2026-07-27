import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { WeeklyCodingReportItem, WeeklyCodingReportTemplate, PulledBacklogItemRow, ItemActionPopup } from "../components/weekly-coding";
import { getPathHeroImage } from "../tokens/pathHeroImages";
import { spacing } from "../theme/tokens";
import { Locale } from "../types/ui";
import { BoardSection } from "./BoardPrimitives";

type Props = {
  locale: Locale;
};

export function WeeklyCodingBoard({ locale }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const weekLabel = locale === "vi" ? "Tuần 20" : "Week 20";
  const dateRangeLabel = locale === "vi" ? "11-17 tháng 5" : "May 11-17";

  const items = useMemo<WeeklyCodingReportItem[]>(
    () => [
      {
        id: "career-api",
        title: locale === "vi" ? "Sửa nhịp đồng bộ API cho nhật ký tuần này" : "Refine weekly journal API sync cadence",
        body: locale === "vi" ? "Giữ luồng đồng bộ nhẹ, yên và đáng tin." : "Keep the sync flow quiet, light, and reliable.",
        pathId: "career",
        pathLabel: locale === "vi" ? "Sự nghiệp" : "Career",
        pathColor: "#8A6F42",
        statusLabel: locale === "vi" ? "Đã lên kế hoạch" : "Planned",
        statusTone: "planned",
        scheduleLabel: locale === "vi" ? "Thứ 2 / Thứ 4 / Thứ 6" : "Mon / Wed / Fri",
        imageAssetId: getPathHeroImage("career")?.assetId,
      },
      {
        id: "health-motion",
        title: locale === "vi" ? "Điều chỉnh reduced motion cho thẻ ngang Weekly Coding" : "Tune reduced motion for weekly horizontal cards",
        body: locale === "vi" ? "Giảm chuyển động mạnh nhưng giữ cảm giác có chủ ý." : "Reduce stronger motion while keeping the card intentional.",
        pathId: "health",
        pathLabel: locale === "vi" ? "Sức khỏe & Thân thể" : "Health & Body",
        pathColor: "#627A54",
        statusLabel: locale === "vi" ? "Đang đi" : "In motion",
        statusTone: "active",
        scheduleLabel: locale === "vi" ? "Cuối tuần" : "Weekend",
        imageAssetId: getPathHeroImage("health")?.assetId,
      },
      {
        id: "culture-copy",
        title: locale === "vi" ? "Làm gọn copy tiếng Việt rất dài cho hàng chip ngang" : "Condense long Vietnamese copy for the horizontal chip rail",
        body: locale === "vi" ? "Tránh vỡ nhịp khi tiêu đề và chip cùng dài." : "Avoid breaking rhythm when both title and chips run long.",
        pathId: "culture",
        pathLabel: locale === "vi" ? "Phong cách, đẳng cấp và lãng mạn rất dài" : "Style & Class",
        pathColor: "#8B5D4B",
        statusLabel: locale === "vi" ? "Đã lên kế hoạch" : "Planned",
        statusTone: "planned",
        scheduleLabel: locale === "vi" ? "Sáng thứ 7, chiều chủ nhật, và buổi tối rảnh hơn" : "Saturday morning, Sunday afternoon, and the first quiet evening after work",
      },
      {
        id: "family-fallback",
        title: locale === "vi" ? "Kiểm tra fallback khi item chưa có ảnh riêng" : "Check the fallback when a row has no dedicated image",
        body: locale === "vi" ? "Nền vẫn phải ấm và dễ đọc." : "The surface should stay warm and readable.",
        pathId: "family",
        pathLabel: locale === "vi" ? "Gia đình & Tổ ấm" : "Family & Home",
        pathColor: "#A87959",
        statusLabel: locale === "vi" ? "Đã lên kế hoạch" : "Planned",
        statusTone: "planned",
        scheduleLabel: locale === "vi" ? "Thứ 3" : "Tuesday",
      },
    ],
    [locale]
  );

  const longVietnameseItem: WeeklyCodingReportItem = {
    ...items[2],
    title: "Thiết kế lại nhịp hiển thị Weekly Coding để tiếng Việt dài vẫn giữ được vẻ điềm tĩnh và không làm vỡ cấu trúc thẻ ngang",
  };

  return (
    <View style={styles.stack}>
      <BoardSection title="WeeklyCodingReportTemplate" subtitle="Default week with four pulled items and the journal-page composition.">
        <WeeklyCodingReportTemplate
          locale={locale}
          onDeleteItem={(itemId) => Alert.alert("Delete", itemId)}
          onNextWeek={() => Alert.alert("Next week")}
          onOpenDetail={(itemId) => Alert.alert("Open detail", itemId)}
          onOpenItem={(itemId) => Alert.alert("Open item", itemId)}
          onPreviousWeek={() => Alert.alert("Previous week")}
          onRemoveFromWeek={(itemId) => Alert.alert("Remove from week", itemId)}
          pulledItems={items}
          selectedWeekDateRange={dateRangeLabel}
          selectedWeekLabel={weekLabel}
          showBack
        />
      </BoardSection>

      <BoardSection title="Empty Week" subtitle="No pulled items and no Open Backlog CTA.">
        <WeeklyCodingReportTemplate locale={locale} pulledItems={[]} selectedWeekDateRange={dateRangeLabel} selectedWeekLabel={weekLabel} />
      </BoardSection>

      <BoardSection title="Stress States" subtitle="Long Vietnamese copy, long path labels, long schedule labels, and missing image fallback.">
        <View style={styles.stackSm}>
          <PulledBacklogItemRow item={longVietnameseItem} locale={locale} />
          <PulledBacklogItemRow item={items[2]} locale={locale} />
          <PulledBacklogItemRow item={items[3]} locale={locale} />
        </View>
      </BoardSection>

      <BoardSection title="Popup + Reduced Motion" subtitle="Row with popup open and a reduced-motion rendering path.">
        <View style={styles.stackSm}>
          <PulledBacklogItemRow
            item={items[0]}
            locale={locale}
            onDelete={() => Alert.alert("Delete", items[0].id)}
            onOpen={() => Alert.alert("Open", items[0].id)}
            onOpenDetail={() => Alert.alert("Detail", items[0].id)}
            onRequestMenuAnchor={() => setMenuOpen(true)}
            onRemoveFromWeek={() => Alert.alert("Remove", items[0].id)}
            reducedMotion
          />
          <ItemActionPopup
            anchor={{ x: 286, y: 320, width: 40, height: 40 }}
            item={items[0]}
            locale={locale}
            onClose={() => setMenuOpen(false)}
            onDeleteItem={(itemId) => Alert.alert("Delete", itemId)}
            onOpenDetail={(itemId) => Alert.alert("Detail", itemId)}
            onRemoveFromWeek={(itemId) => Alert.alert("Remove", itemId)}
            visible={menuOpen}
          />
        </View>
      </BoardSection>

      <BoardSection title="Disabled Navigation" subtitle="Previous and next disabled states.">
        <View style={styles.stackSm}>
          <WeeklyCodingReportTemplate
            locale={locale}
            nextWeekDisabled
            pulledItems={items.slice(0, 1)}
            selectedWeekDateRange={dateRangeLabel}
            selectedWeekLabel={weekLabel}
          />
          <WeeklyCodingReportTemplate
            locale={locale}
            previousWeekDisabled
            pulledItems={items.slice(0, 1)}
            selectedWeekDateRange={dateRangeLabel}
            selectedWeekLabel={weekLabel}
          />
        </View>
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  stackSm: {
    gap: spacing.sm,
  },
});
