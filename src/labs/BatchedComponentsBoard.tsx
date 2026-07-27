import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { Divider } from "../components/primitives/Divider";
import { EntityChip } from "../components/primitives/EntityChip";
import { MetadataList } from "../components/primitives/MetadataList";
import { EntityRow } from "../components/primitives/EntityRow";
import { NoteInputBase } from "../components/primitives/NoteInputBase";
import { SearchBar } from "../components/primitives/SearchBar";
import { FilterChipGroup } from "../components/primitives/FilterChipGroup";
import { SortSelector } from "../components/primitives/SortSelector";
import { SegmentProgress } from "../components/primitives/SegmentProgress";
import { MediaHero } from "../components/primitives/MediaHero";
import { FloatingActionButton } from "../components/primitives/FloatingActionButton";
import { JournalCard } from "../components/primitives/JournalCard";
import { WMText } from "../components/primitives/Text";
import { Locale } from "../types/ui";
import { spacing } from "../theme/tokens";

type Props = {
  locale: Locale;
};

export function BatchedComponentsBoard({ locale }: Props) {
  const [search, setSearch] = useState("");
  const [note, setNote] = useState(locale === "vi" ? "Một ghi chú ngắn để giữ lại dấu vết trong ngày." : "A short note to hold the trace of the day.");
  const [selectedFilters, setSelectedFilters] = useState<string[]>(["memory"]);
  const [sortId, setSortId] = useState("recent");

  return (
    <View style={styles.stack}>
      <BoardSection title="EntityChip">
        <View style={styles.rowWrap}>
          <EntityChip label={locale === "vi" ? "Mark" : "Mark"} iconSemanticName="entity.mark" />
          <EntityChip label={locale === "vi" ? "Đã hoàn thành" : "Done"} stateTone="done" variant="status" />
          <EntityChip label={locale === "vi" ? "Cần chăm sóc" : "Needs care"} stateTone="weak" variant="warningSoft" />
          <EntityChip disabled label={locale === "vi" ? "Chưa khả dụng" : "Unavailable"} />
        </View>
      </BoardSection>

      <BoardSection title="EntityRow">
        <View style={styles.stackSm}>
          <EntityRow
            chipLabel={locale === "vi" ? "Đã hoàn thành" : "Done"}
            chipStateTone="done"
            leadingIconSemanticName="entity.mark"
            metadata={locale === "vi" ? "Sáng nay" : "This morning"}
            subtitle={locale === "vi" ? "Một bằng chứng yên tĩnh cho path sức khỏe." : "A quiet proof for the health path."}
            title={locale === "vi" ? "Đi bộ công viên" : "Park walk"}
          />
          <EntityRow
            leadingIconSemanticName="entity.memory"
            metadata={locale === "vi" ? "Đã lỡ" : "Missed"}
            stateTone="missed"
            subtitle={locale === "vi" ? "Tiêu đề dài hơn để kiểm tra xuống dòng trong tiếng Việt." : "Longer line to test wrapped title in English."}
            title={locale === "vi" ? "Ghi lại buổi chiều bên hiên nhà với ánh nắng rất muộn" : "Record the late porch light from the afternoon"}
            variant="actionable"
          />
        </View>
      </BoardSection>

      <BoardSection title="MetadataList">
        <MetadataList
          items={[
            { id: "date", label: locale === "vi" ? "Ngày" : "Date", value: locale === "vi" ? "12 tháng 5, 2026" : "May 12, 2026", iconSemanticName: "utility.calendar" },
            { id: "time", label: locale === "vi" ? "Thời lượng" : "Duration", value: locale === "vi" ? "42 phút" : "42 min", iconSemanticName: "utility.clock" },
            { id: "path", label: locale === "vi" ? "Path" : "Path", value: locale === "vi" ? "Sức khỏe" : "Health Body", warning: true },
          ]}
          showDividers
        />
      </BoardSection>

      <BoardSection title="Inputs">
        <View style={styles.stackSm}>
          <SearchBar
            accessibilityLabel={locale === "vi" ? "Tìm trong journal" : "Search journal"}
            onChangeText={setSearch}
            placeholder={locale === "vi" ? "Tìm trong Journal" : "Search this journal"}
            value={search}
          />
          <NoteInputBase
            accessibilityLabel={locale === "vi" ? "Ghi chú" : "Note"}
            helperText={locale === "vi" ? "Giữ giọng điệu ngắn và riêng tư." : "Keep the tone short and private."}
            label={locale === "vi" ? "Ghi chú" : "Note"}
            onChangeText={setNote}
            value={note}
            variant="note"
          />
        </View>
      </BoardSection>

      <BoardSection title="Controls">
        <View style={styles.stackSm}>
          <FilterChipGroup
            items={[
              { id: "memory", label: locale === "vi" ? "Memory" : "Memory", iconSemanticName: "entity.memory" },
              { id: "mark", label: locale === "vi" ? "Mark" : "Mark", iconSemanticName: "entity.mark" },
              { id: "backlog", label: locale === "vi" ? "Backlog" : "Backlog", iconSemanticName: "entity.backlog" },
              { id: "path", label: locale === "vi" ? "Path" : "Path", iconSemanticName: "entity.path" },
            ]}
            onToggle={(id) =>
              setSelectedFilters((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))
            }
            selectedIds={selectedFilters}
            variant="wrap"
          />
          <SortSelector
            label={locale === "vi" ? "Sắp xếp" : "Sort"}
            onSelect={setSortId}
            options={[
              { id: "recent", label: locale === "vi" ? "Mới nhất trước" : "Most recent first" },
              { id: "oldest", label: locale === "vi" ? "Cũ nhất trước" : "Oldest first" },
              { id: "quiet", label: locale === "vi" ? "Yên tĩnh nhất" : "Quietest first" },
            ]}
            selectedId={sortId}
            sheetTitle={locale === "vi" ? "Chọn thứ tự" : "Choose order"}
          />
        </View>
      </BoardSection>

      <BoardSection title="Progress / Divider">
        <View style={styles.stackSm}>
          <SegmentProgress completed={2} currentIndex={3} label={locale === "vi" ? "3 trên 6 chặng" : "3 of 6 segments"} total={6} variant="withLabel" />
          <Divider variant="soft" />
          <Divider label={locale === "vi" ? "Ghi chú riêng tư" : "Private notes"} variant="section" />
        </View>
      </BoardSection>

      <BoardSection title="MediaHero">
        <View style={styles.stackSm}>
          <MediaHero
            caption={locale === "vi" ? "Một tấm ảnh được dán vào trang nhớ." : "A photo pasted into the memory page."}
            metadata={<WMText variant="meta">{locale === "vi" ? "Buổi chiều, sân sau" : "Afternoon, back porch"}</WMText>}
            placeholderLabel={locale === "vi" ? "Chưa có media" : "No media yet"}
            variant="hero"
          />
        </View>
      </BoardSection>

      <BoardSection title="FloatingActionButton">
        <JournalCard variant="readOnly">
          <WMText variant="bodySm">{locale === "vi" ? "FAB chỉ là action ngữ cảnh, không thay Capture trung tâm." : "FAB stays contextual and never replaces the center Capture action."}</WMText>
          <FloatingActionButton accessibilityLabel={locale === "vi" ? "Thêm ghi chú" : "Add note"} label={locale === "vi" ? "Thêm ghi chú" : "Add note"} semanticName="entity.mark" variant="extended" />
        </JournalCard>
      </BoardSection>

    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  stackSm: {
    gap: spacing.sm,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
