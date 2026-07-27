import { StyleSheet, View } from "react-native";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { PlannedMarkPathTheme } from "./plannedMarkTheme";

type Props = {
  periodLabel?: string;
  timeLabel?: string;
  expeditionLabel?: string;
  theme: PlannedMarkPathTheme;
};

export function PlannedMarkScheduleContextBlock({ periodLabel, timeLabel, expeditionLabel, theme }: Props) {
  const scheduleText = [periodLabel, timeLabel].filter(Boolean).join(" · ");

  if (!scheduleText && !expeditionLabel) {
    return null;
  }

  return (
    <View style={styles.stack}>
      {scheduleText ? (
        <View style={styles.row}>
          <WaymarkIcon semanticName="utility.clock" size="sm" state="muted" />
          <WMText style={styles.scheduleText} variant="bodyStrong">
            {scheduleText}
          </WMText>
        </View>
      ) : null}

      {expeditionLabel ? (
        <View
          style={[
            styles.chip,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <WaymarkIcon semanticName="entity.expedition" size="xs" state="muted" />
          <WMText style={[styles.chipLabel, { color: theme.deep }]} variant="bodySm">
            {expeditionLabel}
          </WMText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  scheduleText: {
    color: foundationColors.ink.primary,
    flexShrink: 1,
  },
  chip: {
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: semanticRadius.chip,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  chipLabel: {
    color: foundationColors.ink.secondary,
  },
});
