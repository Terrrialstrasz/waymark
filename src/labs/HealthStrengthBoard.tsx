import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WMChip } from "../components/primitives/WMChip";
import { WMText } from "../components/primitives/Text";
import { StrengthSessionTemplate } from "../components/health/strength";
import { Locale } from "../types/ui";
import { foundationColors, spacing } from "../theme/tokens";
import {
  createCompleteScenario,
  createCooldownScenario,
  createFinalStretchScenario,
  createRestScenario,
  createStrengthStrengthScenario,
  createTimedScenario,
} from "./__fixtures__/healthStrength.fixtures";

type Props = {
  locale: Locale;
};

type ScenarioId = "strength" | "rest" | "timed" | "cooldown" | "finalStretch" | "complete";

const scenarioLabels: Record<ScenarioId, string> = {
  strength: "Strength active",
  rest: "Rest",
  timed: "Timed exercise",
  cooldown: "Cooldown stretch",
  finalStretch: "Final stretch complete",
  complete: "Session complete",
};

export function HealthStrengthBoard({ locale }: Props) {
  const [scenario, setScenario] = useState<ScenarioId>("strength");
  const session = useMemo(() => {
    switch (scenario) {
      case "rest":
        return createRestScenario(locale);
      case "timed":
        return createTimedScenario(locale);
      case "cooldown":
        return createCooldownScenario(locale);
      case "finalStretch":
        return createFinalStretchScenario(locale);
      case "complete":
        return createCompleteScenario(locale);
      default:
        return createStrengthStrengthScenario(locale);
    }
  }, [locale, scenario]);

  return (
    <View style={styles.stack}>
      <View style={styles.tabRow}>
        {(Object.keys(scenarioLabels) as ScenarioId[]).map((id) => (
          <WMChip key={id} label={scenarioLabels[id]} onPress={() => setScenario(id)} selected={scenario === id} />
        ))}
      </View>

      <WMText style={styles.hint} variant="bodySm">
        {locale === "vi"
          ? "Sáu trạng thái duyệt cho flow Strength Session dùng chung Day A / Day B."
          : "Six review states for the shared Day A / Day B strength session flow."}
      </WMText>

      <StrengthSessionTemplate session={session} withShell={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  hint: {
    color: foundationColors.ink.secondary,
  },
});
