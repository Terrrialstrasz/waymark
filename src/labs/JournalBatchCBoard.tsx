import { StyleSheet, View } from "react-native";
import { getWaymarkImageAsset } from "../assets/imageRegistry";
import { BoardSection } from "./BoardPrimitives";
import { Locale } from "../types/ui";
import { foundationColors, spacing } from "../theme/tokens";
import { HorizontalJournalEntryCard, RecentCollectionRow } from "../components/journal";

type Props = {
  locale: Locale;
};

const localDevPhoto = {
  assetId: "hero.path.familyHome" as const,
  alt: "Local development-safe sample image",
};

const weekdayRecentDates = [
  new Date(2026, 4, 11),
  new Date(2026, 4, 12),
  new Date(2026, 4, 13),
  new Date(2026, 4, 14),
  new Date(2026, 4, 15),
  new Date(2026, 4, 16),
  new Date(2026, 4, 17),
] as const;

export function JournalBatchCBoard({ locale }: Props) {
  const recentRows = [
    {
      id: "recent-monday",
      date: weekdayRecentDates[0],
      day: "11",
      month: locale === "vi" ? "THG 5" : "MAY",
      label: locale === "vi" ? "Được giữ" : "Protected",
      chips: [{ label: locale === "vi" ? "7 ký ức" : "7 memories", iconName: "done" as const }],
    },
    {
      id: "recent-tuesday",
      date: weekdayRecentDates[1],
      day: "12",
      month: locale === "vi" ? "THG 5" : "MAY",
      label: locale === "vi" ? "Vững nhịp" : "Steady",
      chips: [{ label: locale === "vi" ? "1 ghi chú" : "1 note", iconName: "mark" as const }],
    },
    {
      id: "recent-wednesday",
      date: weekdayRecentDates[2],
      day: "13",
      month: locale === "vi" ? "THG 5" : "MAY",
      label: locale === "vi" ? "Cần sửa lại" : "Needs repair",
      chips: [],
    },
    {
      id: "recent-thursday",
      date: weekdayRecentDates[3],
      day: "14",
      month: locale === "vi" ? "THG 5" : "MAY",
      label: locale === "vi" ? "Lỡ nhịp" : "Missed",
      chips: [{ label: locale === "vi" ? "1 ghi chú" : "1 note", iconName: "memory" as const }],
    },
    {
      id: "recent-friday",
      date: weekdayRecentDates[4],
      day: "15",
      month: locale === "vi" ? "THG 5" : "MAY",
      label: locale === "vi" ? "Được giữ" : "Protected",
      chips: [{ label: locale === "vi" ? "2 ký ức" : "2 memories", iconName: "heart" as const }],
    },
    {
      id: "recent-saturday",
      date: weekdayRecentDates[5],
      day: "16",
      month: locale === "vi" ? "THG 5" : "MAY",
      label: locale === "vi" ? "Vững nhịp" : "Steady",
      chips: [{ label: locale === "vi" ? "Lộ trình sống" : "Living path" }],
    },
    {
      id: "recent-sunday",
      date: weekdayRecentDates[6],
      day: "17",
      month: locale === "vi" ? "THG 5" : "MAY",
      label: locale === "vi" ? "Được giữ" : "Protected",
      chips: [{ label: locale === "vi" ? "3 ký ức" : "3 memories", iconName: "done" as const }],
    },
  ];

  return (
    <View style={styles.stack}>
      <BoardSection title="Batch C · Recent Collections">
        <View style={styles.mobileFrame}>
          <View style={styles.stackTight}>
            {recentRows.map((row, index) => (
              <RecentCollectionRow key={row.id} {...row} locale={locale} onPress={() => undefined} visualIndex={index} />
            ))}
          </View>
        </View>
      </BoardSection>

      <BoardSection title="Batch C · Recent Collection States">
        <View style={styles.mobileFrame}>
          <View style={styles.stackTight}>
            <RecentCollectionRow
              chips={[]}
              date={weekdayRecentDates[0]}
              day="11"
              label={locale === "vi" ? "Được giữ" : "Protected"}
              locale={locale}
              month={locale === "vi" ? "THG 5" : "MAY"}
              onPress={() => undefined}
            />
            <RecentCollectionRow
              chips={[{ label: locale === "vi" ? "7 ký ức" : "7 memories", iconName: "done" }]}
              date={weekdayRecentDates[1]}
              day="12"
              label={locale === "vi" ? "Vững nhịp" : "Steady"}
              locale={locale}
              month={locale === "vi" ? "THG 5" : "MAY"}
              onPress={() => undefined}
            />
            <RecentCollectionRow
              chips={[{ label: locale === "vi" ? "1 ghi chú" : "1 note", iconName: "mark" }]}
              date={weekdayRecentDates[2]}
              day="13"
              label={locale === "vi" ? "Cần sửa lại" : "Needs repair"}
              locale={locale}
              month={locale === "vi" ? "THG 5" : "MAY"}
              onPress={() => undefined}
            />
            <RecentCollectionRow
              chips={[{ label: locale === "vi" ? "1 ghi chú" : "1 note", iconName: "memory" }]}
              date={weekdayRecentDates[3]}
              day="14"
              label={locale === "vi" ? "Lỡ nhịp" : "Missed"}
              locale={locale}
              month={locale === "vi" ? "THG 5" : "MAY"}
              onPress={() => undefined}
            />
            <RecentCollectionRow
              chips={[{ label: locale === "vi" ? "2 ký ức" : "2 memories", iconName: "heart" }]}
              date={weekdayRecentDates[4]}
              day="15"
              forceMotifFallback
              label={locale === "vi" ? "Thiếu motif" : "Missing motif fallback"}
              locale={locale}
              month={locale === "vi" ? "THG 5" : "MAY"}
              onPress={() => undefined}
            />
          </View>
        </View>
      </BoardSection>

      <BoardSection title="Batch C · Horizontal Journal Strips">
        <View style={styles.mobileFrame}>
          <View style={styles.stackTight}>
            <HorizontalJournalEntryCard
              body={locale === "vi" ? "Ảnh cục bộ hợp lệ phải phủ toàn bộ bề mặt strip." : "A valid local asset should flood the strip surface."}
              entryType="mark"
              backgroundPaintImage={getWaymarkImageAsset(localDevPhoto.assetId)?.src}
              backgroundPaintInfo={{
                assetId: localDevPhoto.assetId,
                assetVariant: "hero",
                sourceKind: "lab-demo",
                title: locale === "vi" ? "Bữa sáng cùng nhau trước khi ra khỏi nhà" : "Breakfast together before leaving the house",
              }}
              locale={locale}
              onPress={() => undefined}
              pathId="family"
              pathLabel={locale === "vi" ? "Gia đình" : "Family"}
              status="done"
              title={locale === "vi" ? "Bữa sáng cùng nhau trước khi ra khỏi nhà" : "Breakfast together before leaving the house"}
            />
            <HorizontalJournalEntryCard
              body={locale === "vi" ? "Không có ảnh riêng thì dùng hero của Path." : "Without its own photo, the strip should use the path hero."}
              entryType="memory"
              locale={locale}
              onPress={() => undefined}
              pathId="culture"
              pathLabel={locale === "vi" ? "Văn hóa" : "Culture"}
              status="planned"
              title={locale === "vi" ? "Nhớ lại cuộc trò chuyện dài sau buổi biểu diễn" : "Remembering the long conversation after the performance"}
            />
            <HorizontalJournalEntryCard
              body={locale === "vi" ? "Không ảnh và không hero thì dùng gradient dịu theo Path." : "Without photo or hero, the card should fall back to a quiet path-tinted wash."}
              entryType="memory"
              locale={locale}
              pathColorToken={foundationColors.gold.deep}
              pathLabel={locale === "vi" ? "Không xác định" : "Unknown path"}
              readonly
              status="warning"
              title={
                locale === "vi"
                  ? "Dòng tiêu đề tiếng Việt rất dài để kiểm tra việc cắt gọn trên một dòng trong journal strip"
                  : "A very long English title to validate one-line truncation on the horizontal journal strip"
              }
            />
            <HorizontalJournalEntryCard
              body={
                locale === "vi"
                  ? "Dòng phụ tiếng Việt cũng phải dùng được gần hết chiều ngang khả dụng."
                  : "The supporting line should also use most of the available width before truncating."
              }
              entryType="mark"
              locale={locale}
              onPress={() => undefined}
              pathId="health"
              pathLabel={locale === "vi" ? "Sức khỏe" : "Health"}
              status="planned"
              title={
                locale === "vi"
                  ? "Đặt quần áo tập gần cửa để sáng mai đỡ phải nghĩ nhiều"
                  : "Set the gym clothes near the door so tomorrow starts with less friction"
              }
            />
          </View>
        </View>
      </BoardSection>

      <BoardSection title="Batch C · Horizontal All Paths">
        <View style={styles.mobileFrame}>
          <View style={styles.stackTight}>
            {[
              { pathId: "career" as const, pathLabel: locale === "vi" ? "Sự nghiệp" : "Career", status: "planned" as const },
              { pathId: "snag" as const, pathLabel: "SNAG", status: "done" as const },
              { pathId: "health" as const, pathLabel: locale === "vi" ? "Sức khỏe" : "Health", status: "planned" as const },
              { pathId: "family" as const, pathLabel: locale === "vi" ? "Gia đình" : "Family", status: "done" as const },
              { pathId: "character" as const, pathLabel: locale === "vi" ? "Khí chất" : "Character", status: "warning" as const },
              { pathId: "golf" as const, pathLabel: "Golf", status: "planned" as const },
              { pathId: "culture" as const, pathLabel: locale === "vi" ? "Văn hóa" : "Culture", status: "done" as const },
            ].map((item) => (
              <HorizontalJournalEntryCard
                key={item.pathId}
                body={
                  locale === "vi"
                    ? "Kiểm tra hero nền, trạng thái và độ rộng nội dung ở khung mobile hẹp."
                    : "Check hero visibility, state treatment, and content width inside a narrow mobile frame."
                }
                entryType="mark"
                locale={locale}
                onPress={() => undefined}
                pathId={item.pathId}
                pathLabel={item.pathLabel}
                status={item.status}
                title={`${item.pathLabel} · ${locale === "vi" ? "Kiểm tra chiều rộng nội dung" : "Width usage check"}`}
              />
            ))}
          </View>
        </View>
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  stackTight: {
    gap: spacing.sm,
  },
  mobileFrame: {
    alignSelf: "center",
    maxWidth: 380,
    width: "100%",
  },
});
