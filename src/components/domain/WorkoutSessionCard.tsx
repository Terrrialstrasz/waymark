import { StyleSheet } from "react-native";
import { WorkoutModel } from "../../mocks/data";
import { colors, getSemanticStateToneStyle } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMBadge } from "../primitives/WMBadge";
import { WMCard } from "../primitives/WMCard";
import { WMProgressLine } from "../primitives/WMProgressLine";
import { WMText } from "../primitives/Text";

type Props = {
  item: WorkoutModel;
  locale: Locale;
};

function workoutStateToBadge(state: WorkoutModel["state"]) {
  switch (state) {
    case "completed":
      return "done";
    case "partial":
      return "partial";
    case "in_progress":
      return "active";
    default:
      return "upcoming";
  }
}

function formatWorkoutStateLabel(state: WorkoutModel["state"]) {
  return state
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function WorkoutSessionCard({ item, locale }: Props) {
  if (item.state === "not_ready") {
    return null;
  }

  const state = workoutStateToBadge(item.state);
  const palette = getSemanticStateToneStyle(state, "subtle");

  return (
    <WMCard gate={item.gate} style={{ backgroundColor: palette.bg, borderColor: palette.border, borderWidth: 1 }}>
      <WMBadge label={formatWorkoutStateLabel(item.state)} state={state} />
      <WMText variant="cardTitle">{t(item.title, locale)}</WMText>
      <WMText style={styles.copy} variant="body">
        {t(item.summary, locale)}
      </WMText>
      <WMProgressLine
        fillColor={palette.accent}
        label={t(item.progressLabel, locale)}
        value={item.state === "completed" ? 1 : item.state === "in_progress" ? 0.42 : 0.12}
      />
    </WMCard>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.textMuted,
  },
});
