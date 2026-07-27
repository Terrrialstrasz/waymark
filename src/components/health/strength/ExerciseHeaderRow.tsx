import { Pressable, StyleSheet, View } from "react-native";
import { WMText } from "../../primitives/Text";
import { WaymarkIcon } from "../../primitives/WaymarkIcon";
import { foundationColors, semanticRadius, spacing } from "../../../theme/tokens";
import { StrengthExercise } from "./types";
import { Locale } from "../../../types/ui";
import { resolveText, getHealthStrengthCopy } from "./utils";

type Props = {
  locale: Locale;
  exercise: StrengthExercise;
  expanded: boolean;
  onPress?: () => void;
};

export function ExerciseHeaderRow({ locale, exercise, expanded, onPress }: Props) {
  const copy = getHealthStrengthCopy(locale);
  const stateStyle = getBadgeStyle(exercise.state);
  const title = resolveText(exercise.title, locale);
  const pressable = (
    <View style={styles.row}>
      <View style={[styles.badge, stateStyle.badge]}>
        {exercise.state === "done" ? (
          <WaymarkIcon decorative semanticName="status.done" size="lg" state="selected" />
        ) : (
          <WMText style={[styles.badgeText, { color: stateStyle.badgeTextColor }]} variant="chip">
            {exercise.order}
          </WMText>
        )}
      </View>

      <View style={styles.copy}>
        <WMText numberOfLines={expanded ? 2 : 1} style={styles.title} variant={expanded ? "sectionTitle" : "bodyStrong"}>
          {title}
        </WMText>
        <View style={styles.metaRow}>
          <WMText numberOfLines={1} style={styles.prescription} variant="meta">
            {exercise.prescriptionLabel}
          </WMText>
          {exercise.state === "done" ? (
            <WMText style={styles.doneLabel} variant="meta">
              {copy.states.done}
            </WMText>
          ) : null}
        </View>
      </View>
      {onPress ? (
        <View style={styles.chevronSlot}>
          <WaymarkIcon
            decorative
            semanticName="utility.chevron"
            size="sm"
            state="muted"
            style={expanded ? styles.chevronExpanded : undefined}
          />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) {
    return pressable;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.pressable}>
      {pressable}
    </Pressable>
  );
}

function getBadgeStyle(state: StrengthExercise["state"]) {
  switch (state) {
    case "active":
    case "rest":
      return {
        badge: {
          backgroundColor: foundationColors.green.base,
          borderColor: foundationColors.green.base,
        },
        badgeTextColor: foundationColors.ink.inverse,
      };
    case "done":
      return {
        badge: {
          backgroundColor: foundationColors.green.soft,
          borderColor: foundationColors.border.active,
        },
        badgeTextColor: foundationColors.green.deep,
      };
    default:
      return {
        badge: {
          backgroundColor: foundationColors.bg.paper,
          borderColor: foundationColors.border.soft,
        },
        badgeTextColor: foundationColors.ink.secondary,
      };
  }
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: 44,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: semanticRadius.badge,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badgeText: {
    fontWeight: "700",
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  prescription: {
    color: foundationColors.ink.secondary,
  },
  doneLabel: {
    color: foundationColors.green.deep,
  },
  chevronSlot: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chevronExpanded: {
    transform: [{ rotate: "90deg" }],
  },
});
