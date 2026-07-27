import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { CircularTimer } from "../../primitives/CircularTimer";
import { EntityChip } from "../../primitives/EntityChip";
import { WMText } from "../../primitives/Text";
import { foundationColors, semanticRadius, spacing } from "../../../theme/tokens";
import { Locale } from "../../../types/ui";
import { StrengthExercise, StrengthPrimaryActionResolution } from "./types";
import { formatTemplate, getHealthStrengthCopy } from "./utils";
import { StrengthSessionPrimaryAction } from "./StrengthSessionPrimaryAction";

type Props = {
  locale: Locale;
  exercise: StrengthExercise;
  primaryAction?: StrengthPrimaryActionResolution;
  primaryActionAnchorKey?: string;
  onPrimaryAction?: (actionType: StrengthPrimaryActionResolution["actionType"]) => void;
  onPanelLayout?: (y: number) => void;
  onPrimaryActionLayout?: (anchorKey: string, y: number, height: number) => void;
};

export function TimedExercisePanel({
  locale,
  exercise,
  primaryAction,
  primaryActionAnchorKey,
  onPrimaryAction,
  onPanelLayout,
  onPrimaryActionLayout,
}: Props) {
  const copy = getHealthStrengthCopy(locale);
  const timer = exercise.timer;
  const actionLayoutKey =
    primaryAction ?
      [exercise.id, primaryAction.actionType, primaryAction.labelKey, JSON.stringify(primaryAction.labelParams ?? {})].join(":")
    : null;

  if (!timer) {
    return null;
  }

  return (
    <View style={styles.stack}>
      <EntityChip label={formatTemplate(copy.panels.setCount, { current: 1, total: 1 })} stateTone="active" variant="metadata" />
      <View onLayout={(event: LayoutChangeEvent) => onPanelLayout?.(event.nativeEvent.layout.y)} style={styles.timerPanel}>
        <WMText style={styles.timerLabel} variant="label">
          {copy.panels.exerciseTimer}
        </WMText>
        <CircularTimer elapsedSeconds={timer.elapsedSeconds} phaseLabel={copy.states.current} size={156} state={timer.state} totalSeconds={timer.totalSeconds} />
        {primaryAction ? (
          <View
            key={actionLayoutKey ?? undefined}
            onLayout={(event: LayoutChangeEvent) => {
              if (!primaryActionAnchorKey) {
                return;
              }
              onPrimaryActionLayout?.(primaryActionAnchorKey, event.nativeEvent.layout.y, event.nativeEvent.layout.height);
            }}
            style={styles.actionWrap}
          >
            <StrengthSessionPrimaryAction locale={locale} onPress={onPrimaryAction} resolution={primaryAction} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.xs,
  },
  timerPanel: {
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.bg.paperWarm,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: spacing.xs,
  },
  timerLabel: {
    color: foundationColors.ink.secondary,
    alignSelf: "flex-start",
  },
  actionWrap: {
    marginTop: spacing.xs,
    width: "100%",
  },
});
