import { StyleSheet, View } from "react-native";
import { WMText } from "../../primitives/Text";
import { foundationColors, semanticRadius, spacing } from "../../../theme/tokens";
import { Locale } from "../../../types/ui";
import { formatTemplate, getHealthStrengthCopy } from "./utils";

type Props = {
  locale: Locale;
  phase: "strength" | "cooldown";
  current: number;
  total: number;
};

export function StrengthProgressRail({ locale, phase, current, total }: Props) {
  const copy = getHealthStrengthCopy(locale);
  const label = phase === "cooldown"
    ? formatTemplate(copy.progress.cooldown, { current, total })
    : formatTemplate(copy.progress.strength, { current, total });

  return (
    <View style={styles.row}>
      <WMText style={styles.label} variant="bodySm">
        {label}
      </WMText>
      <View style={styles.rail}>
        {Array.from({ length: total }, (_, index) => {
          const position = index + 1;
          const isCompleted = position < current;
          const isActive = position === current;

          return (
            <View
              key={`${phase}-${position}`}
              style={[
                styles.segment,
                {
                  backgroundColor: isActive
                    ? foundationColors.green.base
                    : isCompleted
                      ? foundationColors.green.soft
                      : foundationColors.bg.paperSoft,
                  borderColor: isCompleted || isActive ? "transparent" : foundationColors.border.subtle,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  label: {
    flex: 1,
    color: foundationColors.ink.secondary,
  },
  rail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  segment: {
    width: 20,
    height: 7,
    borderWidth: 1,
    borderRadius: semanticRadius.chip,
  },
});
