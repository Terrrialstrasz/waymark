import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { useRef } from "react";
import { JournalCard } from "../../primitives/JournalCard";
import { Divider } from "../../primitives/Divider";
import { Locale } from "../../../types/ui";
import { foundationColors, semanticBorder, semanticRadius, spacing } from "../../../theme/tokens";
import { getBorderStyle } from "../../../design-system/utils/get-border-style";
import { ExerciseHeaderRow } from "./ExerciseHeaderRow";
import { RestPanel } from "./RestPanel";
import { SetRow } from "./SetRow";
import { StrengthExercise, StrengthPrimaryActionResolution, WeightUnit } from "./types";
import { TimedExercisePanel } from "./TimedExercisePanel";
import { StrengthSessionPrimaryAction } from "./StrengthSessionPrimaryAction";

type Props = {
  locale: Locale;
  exercise: StrengthExercise;
  unit: WeightUnit;
  expanded: boolean;
  primaryAction?: StrengthPrimaryActionResolution;
  primaryActionAnchorKey?: string;
  onPress?: () => void;
  onPrimaryAction?: (actionType: StrengthPrimaryActionResolution["actionType"]) => void;
  onPressWeight?: (setId: string) => void;
  onChangeWeight?: (setId: string, value: number | null) => void;
  onPrimaryActionLayout?: (anchorKey: string, y: number, height: number) => void;
};

export function ExerciseAccordion({
  locale,
  exercise,
  unit,
  expanded,
  primaryAction,
  primaryActionAnchorKey,
  onPress,
  onPrimaryAction,
  onPressWeight,
  onChangeWeight,
  onPrimaryActionLayout,
}: Props) {
  const setBlockLayoutRef = useRef<Record<string, number>>({});
  const restPanelLayoutRef = useRef<Record<string, number>>({});
  const timedPanelYRef = useRef(0);
  const actionLayoutKey =
    primaryAction ?
      [exercise.id, primaryAction.actionType, primaryAction.labelKey, JSON.stringify(primaryAction.labelParams ?? {})].join(":")
    : null;
  const cardTone = exercise.state === "done" ? "alive" : undefined;
  const isCurrent = exercise.state === "active";
  const showWeightControl = exercise.mode === "reps_load" && exercise.supportsLoad !== false;
  const completedSetIndex =
    exercise.state === "rest" && exercise.completedSetNumber
      ? exercise.sets?.findIndex((set) => set.setNumber === exercise.completedSetNumber) ?? -1
      : -1;
  const hasInlineRestPanel = exercise.state === "rest" && Boolean(exercise.restTimer) && completedSetIndex >= 0;
  const inlineActionSetNumber = resolveInlineActionSetNumber(exercise, primaryAction, hasInlineRestPanel);

  return (
    <JournalCard
      contentStyle={styles.cardContent}
      preserveSurfaceColorOnPress
      stateTone={cardTone}
      style={expanded && isCurrent ? styles.activeCard : undefined}
      variant={expanded ? "standard" : "rowSurface"}
    >
      <ExerciseHeaderRow expanded={expanded} exercise={exercise} locale={locale} onPress={onPress} />

      {expanded ? (
        <View style={styles.expandedContent}>
          {exercise.mode === "timed" ? (
            <TimedExercisePanel
              exercise={exercise}
              locale={locale}
              onPrimaryAction={onPrimaryAction}
              primaryActionAnchorKey={primaryActionAnchorKey}
              onPanelLayout={(y) => {
                timedPanelYRef.current = y;
              }}
              onPrimaryActionLayout={(anchorKey, y, height) => onPrimaryActionLayout?.(anchorKey, timedPanelYRef.current + y, height)}
              primaryAction={primaryAction}
            />
          ) : (
            <>
              {exercise.sets?.map((set, index) => (
                <View
                  key={set.id}
                  onLayout={(event: LayoutChangeEvent) => {
                    setBlockLayoutRef.current[set.id] = event.nativeEvent.layout.y;
                  }}
                  style={styles.setBlock}
                >
                  <SetRow item={set} locale={locale} onChangeWeight={onChangeWeight} onPressWeight={onPressWeight} showWeightControl={showWeightControl} unit={unit} />
                  {hasInlineRestPanel && index === completedSetIndex ? (
                    <RestPanel
                      completedSetNumber={exercise.completedSetNumber ?? set.setNumber}
                      locale={locale}
                      onPrimaryAction={onPrimaryAction}
                      primaryActionAnchorKey={primaryActionAnchorKey}
                      onPanelLayout={(y) => {
                        restPanelLayoutRef.current[set.id] = y;
                      }}
                      onPrimaryActionLayout={(anchorKey, y, height) =>
                        onPrimaryActionLayout?.(
                          anchorKey,
                          (setBlockLayoutRef.current[set.id] ?? 0) + (restPanelLayoutRef.current[set.id] ?? 0) + y,
                          height,
                        )
                      }
                      primaryAction={primaryAction}
                      timer={exercise.restTimer!}
                    />
                  ) : null}
                  {primaryAction && inlineActionSetNumber === set.setNumber ? (
                    <View
                      key={actionLayoutKey ?? undefined}
                      onLayout={(event: LayoutChangeEvent) => {
                        if (!primaryActionAnchorKey) {
                          return;
                        }
                        onPrimaryActionLayout?.(
                          primaryActionAnchorKey,
                          (setBlockLayoutRef.current[set.id] ?? 0) + event.nativeEvent.layout.y,
                          event.nativeEvent.layout.height,
                        );
                      }}
                      style={styles.actionWrap}
                    >
                      <StrengthSessionPrimaryAction locale={locale} onPress={onPrimaryAction} resolution={primaryAction} />
                    </View>
                  ) : null}
                  {index < (exercise.sets?.length ?? 0) - 1 && index !== completedSetIndex ? (
                    <Divider insetEnd={4} insetStart={4} variant="soft" />
                  ) : null}
                </View>
              ))}
            </>
          )}
        </View>
      ) : null}
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    position: "relative",
    gap: spacing.xs,
    paddingVertical: 14,
  },
  activeCard: {
    ...getBorderStyle(semanticBorder.card.strong),
    borderRadius: semanticRadius.card.default,
    borderColor: foundationColors.border.active,
  },
  expandedContent: {
    gap: spacing.xs,
  },
  setBlock: {
    gap: spacing.xs,
  },
  actionWrap: {
    marginTop: spacing.xs,
  },
});

function resolveInlineActionSetNumber(
  exercise: StrengthExercise,
  primaryAction?: StrengthPrimaryActionResolution,
  hasInlineRestPanel?: boolean,
) {
  if (!primaryAction || hasInlineRestPanel || exercise.mode === "timed" || !exercise.sets?.length) {
    return undefined;
  }

  switch (primaryAction.actionType) {
    case "complete_strength_set":
      return exercise.sets.find((set) => set.state === "active")?.setNumber;
    case "start_next_set":
      return exercise.sets.find((set) => set.state === "next")?.setNumber;
    case "next_exercise":
    case "continue_disabled":
      return exercise.sets[exercise.sets.length - 1]?.setNumber;
    default:
      return undefined;
  }
}
