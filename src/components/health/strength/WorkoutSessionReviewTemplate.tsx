import { StyleSheet, View } from "react-native";
import type { WorkoutReviewData } from "../../../app/workoutReviewDataLoader";
import type { Locale } from "../../../types/ui";
import { foundationColors, semanticRadius, spacing } from "../../../theme/tokens";
import { FieldJournalScreenShell } from "../../primitives/FieldJournalScreenShell";
import { JournalCard } from "../../primitives/JournalCard";
import { PageHeader } from "../../primitives/PageHeader";
import { WMText } from "../../primitives/Text";

type Props = {
  data: WorkoutReviewData;
  locale: Locale;
  onBack?: () => void;
};

export function WorkoutSessionReviewTemplate({ data, locale, onBack }: Props) {
  const mainExercises = data.exercises.filter((exercise) => exercise.phase === "main");
  const cooldownExercises = data.exercises.filter((exercise) => exercise.phase === "cooldown");
  return (
    <FieldJournalScreenShell botanicalAmbient contentContainerStyle={styles.shell} variant="navAware">
      <PageHeader onBack={onBack} showBack subtitle={data.routineTitle} title={data.markTitle} variant="withBack" />
      <View style={styles.reviewBanner}>
        <WMText style={styles.reviewTitle} variant="label">
          {locale === "vi" ? "Review only" : "Review only"}
        </WMText>
        <WMText style={styles.reviewBody} variant="bodySm">
          {locale === "vi"
            ? "Mo tu Weekly Timetable. Buoi tap nay khong duoc tinh vao progress."
            : "Opened from Weekly Timetable. This workout is not counted toward progress."}
        </WMText>
      </View>

      <JournalCard contentStyle={styles.summaryCard} variant="standard">
        <WMText variant="sectionTitle">{data.routineTitle}</WMText>
        {data.routineDescription ? <WMText variant="bodySm">{data.routineDescription}</WMText> : null}
        <View style={styles.metaRow}>
          {data.durationLabel ? <WMText style={styles.meta} variant="meta">{data.durationLabel}</WMText> : null}
          {data.sessionStatusLabel ? <WMText style={styles.meta} variant="meta">{data.sessionStatusLabel}</WMText> : null}
        </View>
      </JournalCard>

      <ReviewSection exercises={mainExercises} title={locale === "vi" ? "Workout plan" : "Workout plan"} />
      {cooldownExercises.length > 0 ? (
        <ReviewSection exercises={cooldownExercises} title={locale === "vi" ? "Cooldown" : "Cooldown"} />
      ) : null}
    </FieldJournalScreenShell>
  );
}

function ReviewSection({ exercises, title }: { exercises: WorkoutReviewData["exercises"]; title: string }) {
  return (
    <View style={styles.section}>
      <WMText variant="sectionTitle">{title}</WMText>
      {exercises.map((exercise, index) => (
        <JournalCard contentStyle={styles.exerciseCard} key={exercise.id} variant="nested">
          <View style={styles.exerciseHeader}>
            <WMText style={styles.order} variant="metaCompact">{String(index + 1).padStart(2, "0")}</WMText>
            <View style={styles.exerciseCopy}>
              <WMText variant="bodyStrong">{exercise.title}</WMText>
              <WMText style={styles.prescription} variant="bodySm">{exercise.prescription}</WMText>
              {exercise.restLabel ? <WMText style={styles.meta} variant="meta">{exercise.restLabel}</WMText> : null}
              {exercise.resultLabel ? <WMText style={styles.result} variant="meta">{exercise.resultLabel}</WMText> : null}
            </View>
          </View>
        </JournalCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: spacing.md },
  reviewBanner: {
    gap: spacing.xxs,
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    borderColor: foundationColors.border.active,
    backgroundColor: foundationColors.bg.paperWarm,
    padding: spacing.md,
  },
  reviewTitle: { color: foundationColors.ink.primary },
  reviewBody: { color: foundationColors.ink.secondary },
  summaryCard: { gap: spacing.xs },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  meta: { color: foundationColors.ink.secondary },
  section: { gap: spacing.sm },
  exerciseCard: { gap: spacing.xs },
  exerciseHeader: { flexDirection: "row", gap: spacing.sm },
  order: { color: foundationColors.ink.tertiary, paddingTop: 2 },
  exerciseCopy: { flex: 1, gap: spacing.xxs },
  prescription: { color: foundationColors.ink.primary },
  result: { color: foundationColors.green.deep },
});
