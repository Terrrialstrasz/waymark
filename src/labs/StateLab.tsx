import { StyleSheet, View } from "react-native";
import { plannedMarks, workoutCards } from "../mocks/data";
import { spacing } from "../theme/tokens";
import { Locale } from "../types/ui";
import { MarkCard } from "../components/domain/MarkCard";
import { PlannedMarkCard } from "../components/domain/PlannedMarkCard";
import { WorkoutSessionCard } from "../components/domain/WorkoutSessionCard";
import { WMBadge } from "../components/primitives/WMBadge";
import { WMCard } from "../components/primitives/WMCard";
import { WMSectionHeader } from "../components/primitives/WMSectionHeader";
import { WMText } from "../components/primitives/Text";

type Props = {
  locale: Locale;
};

export function StateLab({ locale }: Props) {
  const stateMarks = [
    plannedMarks[0],
    plannedMarks[1],
    plannedMarks[2],
    {
      ...plannedMarks[0],
      title: { en: "Replacement walk with family", vi: "Buổi đi bộ thay thế cùng gia đình" },
      state: "substituted" as const,
    },
    {
      ...plannedMarks[0],
      title: { en: "Missed reading mark", vi: "Dấu mốc đọc sách bị lỡ" },
      state: "missed" as const,
    },
    {
      ...plannedMarks[0],
      title: { en: "Blocked call", vi: "Cuộc gọi đang bị chặn" },
      state: "blocked" as const,
    },
    {
      ...plannedMarks[0],
      title: { en: "Hidden pack check gate", vi: "Pack check đang bị ẩn bởi gate" },
      state: "hidden" as const,
    },
  ];

  const privateMark = {
    title: {
      en: "Sensitive family note",
      vi: "Ghi chú gia đình mang tính riêng tư và cần được che khi thiết bị đang khoá",
    },
    note: {
      en: "This text should not be fully visible on a locked device.",
      vi: "Đoạn nội dung này không nên hiện nguyên vẹn khi điện thoại chưa được mở khoá an toàn.",
    },
    pathLabel: { en: "Family & Home", vi: "Gia đình & tổ ấm" },
    timeLabel: { en: "8:15 PM", vi: "20:15" },
    state: "private_sensitive" as const,
    masked: true,
  };

  return (
    <View style={styles.stack}>
      <WMSectionHeader
        title={locale === "en" ? "PlannedMark states" : "Các trạng thái của PlannedMark"}
      />
      {stateMarks.map((item, index) => (
        <PlannedMarkCard key={`${item.state}-${index}`} item={item} locale={locale} />
      ))}

      <WMSectionHeader title={locale === "en" ? "Sensitive proof" : "Bằng chứng nhạy cảm"} />
      <MarkCard item={privateMark} locale={locale} />

      <WMSectionHeader title={locale === "en" ? "Workout states" : "Các trạng thái buổi tập"} />
      {workoutCards.map((item, index) => (
        <WorkoutSessionCard key={`${item.state}-${index}`} item={item} locale={locale} />
      ))}

      <WMCard tint="muted">
        <WMText variant="cardTitle">
          {locale === "en" ? "Shared badge language" : "Ngôn ngữ badge dùng chung"}
        </WMText>
        <View style={styles.badges}>
          <WMBadge label="planned" state="planned" />
          <WMBadge label="done" state="done" />
          <WMBadge label="postponed" state="postponed" />
          <WMBadge label="blocked" state="blocked" />
          <WMBadge label="alive" state="alive" />
          <WMBadge label="private" state="private_sensitive" />
        </View>
      </WMCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
