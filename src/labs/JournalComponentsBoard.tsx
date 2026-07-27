import { StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { Locale } from "../types/ui";
import { spacing } from "../theme/tokens";
import {
  DailyJournalTemplate,
  DateSelectorChip,
  DayClosedJournalCard,
  JournalEntryCard,
  JournalHomeTemplate,
  MediaCollage,
} from "../components/journal";

type Props = {
  locale: Locale;
};

const remoteDemoPhotos = [
  { src: "https://images.example.invalid/one.jpg", alt: "Placeholder one" },
  { src: "https://images.example.invalid/two.jpg", alt: "Placeholder two" },
  { src: "https://images.example.invalid/three.jpg", alt: "Placeholder three" },
  { src: "https://images.example.invalid/four.jpg", alt: "Placeholder four" },
];

export function JournalComponentsBoard({ locale }: Props) {
  return (
    <View style={styles.stack}>
      <BoardSection title="Batch A · DateSelectorChip">
        <View style={styles.rowWrap}>
          <DateSelectorChip label={locale === "vi" ? "Hôm nay, 13 tháng 5" : "Today, May 13"} />
          <DateSelectorChip
            active
            label={locale === "vi" ? "Tuần này" : "This week"}
            onSelect={() => undefined}
            options={[
              { id: "today", label: locale === "vi" ? "Hôm nay, 13 tháng 5" : "Today, May 13" },
              { id: "yesterday", label: locale === "vi" ? "Hôm qua, 12 tháng 5" : "Yesterday, May 12" },
            ]}
            selectedId="today"
          />
          <DateSelectorChip label={locale === "vi" ? "Thứ tư, ngày 13 tháng 5 năm 2026" : "Wednesday, May 13, 2026"} readonly />
          <DateSelectorChip disabled label={locale === "vi" ? "Đã khóa" : "Disabled"} />
          <DateSelectorChip label={locale === "vi" ? "Đang tải" : "Loading"} loading />
        </View>
      </BoardSection>

      <BoardSection title="Batch A · MediaCollage">
        <View style={styles.stack}>
          <MediaCollage images={[remoteDemoPhotos[0]]} placeholderSeed="single-real" variant="single" />
          <MediaCollage images={[{}]} placeholderSeed="single-placeholder" variant="single" />
          <MediaCollage images={[{}, {}, {}]} placeholderSeed="trio" variant="trio" />
          <MediaCollage images={[{}, {}, {}, {}]} placeholderSeed="quad" variant="quad" />
          <MediaCollage emptyLabel={locale === "vi" ? "Chưa có ảnh" : "No photos yet"} images={[]} variant="single" />
          <MediaCollage loading images={[{}, {}, {}, {}]} variant="quad" />
        </View>
      </BoardSection>

      <BoardSection title="Batch B · JournalEntryCard">
        <View style={styles.stack}>
          <JournalEntryCard
            body={locale === "vi" ? "Một ghi chú ngắn để giữ lại nhịp của buổi tối." : "A short note to keep the evening intact."}
            chips={[{ label: locale === "vi" ? "Gia đình" : "Family" }]}
            entryType="memory"
            image={remoteDemoPhotos[0]}
            locale={locale}
            onPress={() => undefined}
            title={locale === "vi" ? "Bữa tối ngoài hiên sau cơn mưa" : "Porch dinner after the rain"}
          />
          <JournalEntryCard
            body={locale === "vi" ? "Ký ức vẫn có chỗ ngay cả khi chưa có ảnh thật." : "Memory still has room even when the real photo is missing."}
            entryType="memory"
            locale={locale}
            showImagePlaceholder
            title={locale === "vi" ? "Giữ lại ánh đèn cuối chiều" : "Keeping the last light of the afternoon"}
          />
          <JournalEntryCard
            body={locale === "vi" ? "Không có ảnh nên dùng con dấu ký ức yên tĩnh." : "No photo available, so the seal stands in quietly."}
            entryType="memory"
            locale={locale}
            title={locale === "vi" ? "Một ký ức chỉ có chữ" : "A memory held only in words"}
          />
          <JournalEntryCard
            chips={[{ label: locale === "vi" ? "Sức khỏe" : "Health", iconName: "target" }]}
            entryType="mark"
            locale={locale}
            status="done"
            title={locale === "vi" ? "Hoàn tất buổi vận động sáng" : "Finished the morning body session"}
          />
          <JournalEntryCard
            chips={[{ label: locale === "vi" ? "Ngày mai" : "Tomorrow", iconName: "calendar" }]}
            entryType="mark"
            locale={locale}
            status="planned"
            title={locale === "vi" ? "Đặt quần áo tập gần cửa" : "Set the gym clothes near the door"}
          />
          <JournalEntryCard
            chips={[{ label: locale === "vi" ? "Cần sửa lại" : "Repair note", iconName: "warning" }]}
            entryType="mark"
            locale={locale}
            status="warning"
            title={locale === "vi" ? "Bỏ lỡ cuộc đi bộ chiều" : "Missed the afternoon walk"}
          />
          <JournalEntryCard entryType="mark" locale={locale} readonly title={locale === "vi" ? "Bản ghi chỉ xem" : "Read-only entry"} />
          <JournalEntryCard entryType="memory" loading locale={locale} title="Loading" />
        </View>
      </BoardSection>

      <BoardSection title="Batch B · DayClosedJournalCard">
        <View style={styles.stack}>
          <DayClosedJournalCard
            locale={locale}
            markCountLabel={locale === "vi" ? "2 trên 4 dấu mốc thành bằng chứng" : "2 of 4 planned marks became proof"}
            summary={locale === "vi" ? "Ngày vẫn được giữ vì điều quan trọng đã được chạm tới." : "The day still held because the essential thing was touched."}
            tomorrowFirstStep={locale === "vi" ? "Đặt quần áo tập gần cửa." : "Put gym clothes near the door."}
            variant="protected"
            whatMattered={locale === "vi" ? "Ăn tối đủ hiện diện với gia đình." : "Dinner with the family felt fully present."}
          />
          <DayClosedJournalCard
            locale={locale}
            summary={locale === "vi" ? "Có phần cần sửa nhưng không cần phán xét lớn tiếng." : "Some repair is needed, but the tone stays gentle."}
            variant="repair"
          />
          <DayClosedJournalCard
            locale={locale}
            summary={locale === "vi" ? "Ngày đi qua đều, không huy hoàng nhưng vẫn thật." : "The day moved steadily, not grand, but honest."}
            variant="neutral"
          />
          <DayClosedJournalCard locale={locale} loading variant="protected" />
        </View>
      </BoardSection>

      <BoardSection title="Journal Home Composition">
        <JournalHomeTemplate
          dateLabel={locale === "vi" ? "Hôm nay, 13 tháng 5" : "Today, May 13"}
          dateOptions={[
            { id: "today", label: locale === "vi" ? "Hôm nay, 13 tháng 5" : "Today, May 13" },
            { id: "yesterday", label: locale === "vi" ? "Hôm qua, 12 tháng 5" : "Yesterday, May 12" },
            { id: "monday", label: locale === "vi" ? "Thứ hai, 11 tháng 5" : "Monday, May 11" },
          ]}
          datePickerReady
          latestHero={{
            title: locale === "vi" ? "Chiều muộn ở sân sau" : "Late afternoon in the backyard",
            subtitle: locale === "vi" ? "4 ký ức gần đây được gom lại trên một bề mặt riêng tư." : "Four recent memories gathered onto one private surface.",
            images: [{}, {}, {}, {}],
            chips: [{ label: locale === "vi" ? "4 ký ức" : "4 memories" }, { label: locale === "vi" ? "Gia đình" : "Family" }],
            readonly: false,
            onPress: () => undefined,
          }}
          locale={locale}
          lookBackCards={[
            { id: "lb-1", title: locale === "vi" ? "Bữa tối sau cơn mưa" : "Dinner after the rain", meta: locale === "vi" ? "1 năm trước" : "1 year ago", onPress: () => undefined },
            { id: "lb-2", title: locale === "vi" ? "Buổi dã ngoại đầu hè" : "The first summer picnic", meta: locale === "vi" ? "Gia đình" : "Family", readonly: true },
          ]}
          recentRows={[
            {
              id: "rc-1",
              label: locale === "vi" ? "Được bảo vệ" : "Protected",
              title: locale === "vi" ? "Giữ phần cốt lõi thật đơn giản" : "Kept the core simple",
              subtitle: locale === "vi" ? "Tập trung vào điều quan trọng và để phần còn lại trôi qua." : "Focused on what mattered and let the rest fall away.",
              day: "30",
              month: locale === "vi" ? "THG 4" : "APR",
              chips: [
                { label: locale === "vi" ? "6 ký ức" : "6 memories", iconName: "done" },
                { label: locale === "vi" ? "Gia đình" : "Family", iconName: "heart" },
              ],
              onPress: () => undefined,
            },
            {
              id: "rc-2",
              label: locale === "vi" ? "Vững" : "Steady",
              title: locale === "vi" ? "Đi bộ, làm việc, giữ hiện diện" : "Walked, worked, stayed present",
              subtitle: locale === "vi" ? "Một ngày trọn với những khoảng dừng nhỏ tạo khác biệt." : "A full day with small pauses that made a difference.",
              day: "29",
              month: locale === "vi" ? "THG 4" : "APR",
              chips: [
                { label: locale === "vi" ? "7 ký ức" : "7 memories", iconName: "done" },
                { label: locale === "vi" ? "Đi bộ" : "Walk", iconName: "mark" },
              ],
              onPress: () => undefined,
            },
            {
              id: "rc-3",
              label: locale === "vi" ? "Cần sửa lại" : "Needs repair",
              title: locale === "vi" ? "Làm chậm lại đủ để nhớ" : "Slowed down enough to remember",
              subtitle: locale === "vi" ? "Giữ nhịp ngày nhẹ hơn và bớt rơi khỏi điều quan trọng." : "Kept the day gentler and less likely to drift from what mattered.",
              day: "28",
              month: locale === "vi" ? "THG 4" : "APR",
              chips: [
                { label: locale === "vi" ? "4 ký ức" : "4 memories", iconName: "done" },
                { label: locale === "vi" ? "2 dấu mốc" : "2 marks", iconName: "mark" },
              ],
              readonly: true,
            },
          ]}
          upcomingCards={[
            { id: "up-1", title: locale === "vi" ? "Bữa trưa với bố mẹ" : "Lunch with the parents", subtitle: locale === "vi" ? "Chủ nhật tuần này" : "This Sunday", day: "21", month: locale === "vi" ? "THG 5" : "MAY", tone: "green", onPress: () => undefined },
            { id: "up-2", title: locale === "vi" ? "Kỷ niệm ngày cưới" : "Wedding anniversary", subtitle: locale === "vi" ? "Tháng sau" : "Next month", day: "07", month: locale === "vi" ? "THG 6" : "JUN", tone: "gold", readonly: true },
          ]}
        />
      </BoardSection>

      <BoardSection title="Daily Journal Composition">
        <DailyJournalTemplate
          closedDayCard={{
            variant: "protected",
            summary: locale === "vi" ? "Ngày được giữ vì những điều cần giữ đã được làm." : "The day was protected because the right things were actually done.",
            whatMattered: locale === "vi" ? "Giữ bữa tối đủ hiện diện." : "Keeping dinner truly present.",
            tomorrowFirstStep: locale === "vi" ? "Đặt bình nước gần cửa." : "Set the water bottle near the door.",
            markCountLabel: locale === "vi" ? "2 trên 4 dấu mốc thành bằng chứng" : "2 of 4 planned marks became proof",
            readonly: true,
          }}
          dateLabel={locale === "vi" ? "Thứ tư, 13 tháng 5" : "Wednesday, May 13"}
          dateOptions={[
            { id: "wed", label: locale === "vi" ? "Thứ tư, 13 tháng 5" : "Wednesday, May 13" },
            { id: "tue", label: locale === "vi" ? "Thứ ba, 12 tháng 5" : "Tuesday, May 12" },
            { id: "mon", label: locale === "vi" ? "Thứ hai, 11 tháng 5" : "Monday, May 11" },
          ]}
          datePickerReady
          entries={[
            {
              id: "dj-1",
              entryType: "mark",
              title: locale === "vi" ? "Hoàn tất buổi vận động sáng" : "Finished the morning body session",
              body: locale === "vi" ? "Không dài, nhưng đủ thật để thành bằng chứng." : "Not long, but honest enough to count as proof.",
              pathLabel: locale === "vi" ? "Sức khỏe" : "Health",
              pathColorToken: "#5F8A5F",
              status: "done",
              onPress: () => undefined,
            },
            {
              id: "dj-2",
              entryType: "memory",
              title: locale === "vi" ? "Giữ lại bữa tối ngoài hiên" : "Keeping the porch dinner",
              body: locale === "vi" ? "Một ký ức mềm và ấm." : "A softer, warmer memory.",
              pathLabel: locale === "vi" ? "Gia đình" : "Family",
              pathColorToken: "#C89A3A",
              showImagePlaceholder: true,
              readonly: true,
            },
          ]}
          locale={locale}
        />
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
