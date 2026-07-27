import { StyleSheet, View } from "react-native";
import { foundationColors, semanticRadius, spacing } from "../../../theme/tokens";
import { WMText } from "../../primitives/Text";
import { Locale } from "../../../types/ui";
import { StrengthSet, WeightUnit } from "./types";
import { WeightValueControl } from "./WeightValueControl";
import { getHealthStrengthCopy } from "./utils";

type Props = {
  locale: Locale;
  item: StrengthSet;
  unit: WeightUnit;
  showWeightControl?: boolean;
  onPressWeight?: (setId: string) => void;
  onChangeWeight?: (setId: string, value: number | null) => void;
};

export function SetRow({ locale, item, unit, showWeightControl = false, onPressWeight, onChangeWeight }: Props) {
  const copy = getHealthStrengthCopy(locale);
  const stateCopy = getStateCopy(copy, item.state);
  const palette = getRowPalette(item.state);
  const resolvedValue = item.actualLoad ?? item.actualWeight;
  const editable = showWeightControl && item.canEditWeight !== false;

  return (
    <View style={[styles.row, { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor }]}>
      <View style={[styles.badge, { backgroundColor: palette.badgeBackgroundColor, borderColor: palette.badgeBorderColor }]}>
        <WMText style={[styles.badgeText, { color: palette.badgeTextColor }]} variant="chip">
          {item.state === "done" ? "✓" : item.setNumber}
        </WMText>
      </View>

      <View style={styles.copy}>
        <WMText numberOfLines={1} style={styles.reps} variant="bodyStrong">
          {item.repsLabel}
        </WMText>
        {stateCopy && item.state !== "active" ? (
          <WMText style={styles.meta} variant="meta">
            {stateCopy}
          </WMText>
        ) : null}
      </View>

      {showWeightControl ? (
        <WeightValueControl
          disabled={!editable}
          editable={editable}
          onChangeValue={(value) => onChangeWeight?.(item.id, value)}
          onPress={editable && onPressWeight ? () => onPressWeight(item.id) : undefined}
          unit={unit}
          value={resolvedValue}
        />
      ) : null}
    </View>
  );
}

function getStateCopy(copy: ReturnType<typeof getHealthStrengthCopy>, state: StrengthSet["state"]) {
  switch (state) {
    case "done":
      return "";
    case "active":
      return copy.states.current;
    case "next":
      return copy.states.nextSet;
    case "failed":
      return copy.states.failed;
    case "skipped":
      return copy.states.skipped;
    default:
      return copy.states.upcoming;
  }
}

function getRowPalette(state: StrengthSet["state"]) {
  switch (state) {
    case "done":
      return {
        backgroundColor: foundationColors.green.soft,
        borderColor: foundationColors.border.active,
        badgeBackgroundColor: foundationColors.green.deep,
        badgeBorderColor: foundationColors.green.deep,
        badgeTextColor: foundationColors.ink.inverse,
      };
    case "active":
      return {
        backgroundColor: foundationColors.bg.paper,
        borderColor: foundationColors.border.active,
        badgeBackgroundColor: foundationColors.green.base,
        badgeBorderColor: foundationColors.green.base,
        badgeTextColor: foundationColors.ink.inverse,
      };
    case "next":
      return {
        backgroundColor: foundationColors.bg.paperWarm,
        borderColor: foundationColors.border.proof,
        badgeBackgroundColor: foundationColors.green.soft,
        badgeBorderColor: foundationColors.border.active,
        badgeTextColor: foundationColors.green.deep,
      };
    case "failed":
    case "skipped":
      return {
        backgroundColor: foundationColors.bg.paperWarm,
        borderColor: foundationColors.border.warning,
        badgeBackgroundColor: foundationColors.bg.paper,
        badgeBorderColor: foundationColors.border.warning,
        badgeTextColor: foundationColors.gold.deep,
      };
    default:
      return {
        backgroundColor: foundationColors.bg.paperWarm,
        borderColor: foundationColors.border.subtle,
        badgeBackgroundColor: foundationColors.bg.paper,
        badgeBorderColor: foundationColors.border.subtle,
        badgeTextColor: foundationColors.ink.tertiary,
      };
  }
}

const styles = StyleSheet.create({
  row: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: semanticRadius.card.compact,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  badge: {
    width: 30,
    height: 30,
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
  reps: {
    color: foundationColors.ink.primary,
  },
  meta: {
    color: foundationColors.ink.secondary,
  },
});
