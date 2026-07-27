import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { CircularTimer } from "../../primitives/CircularTimer";
import { WMText } from "../../primitives/Text";
import { foundationColors, semanticRadius, spacing } from "../../../theme/tokens";
import { SessionTimer, StrengthPrimaryActionResolution } from "./types";
import { Locale } from "../../../types/ui";
import { formatTemplate, getHealthStrengthCopy } from "./utils";
import { StrengthSessionPrimaryAction } from "./StrengthSessionPrimaryAction";

type Props = {
  locale: Locale;
  timer: SessionTimer;
  completedSetNumber: number;
  primaryAction?: StrengthPrimaryActionResolution;
  primaryActionAnchorKey?: string;
  onPrimaryAction?: (actionType: StrengthPrimaryActionResolution["actionType"]) => void;
  onPanelLayout?: (y: number) => void;
  onPrimaryActionLayout?: (anchorKey: string, y: number, height: number) => void;
};

export function RestPanel({
  locale,
  timer,
  completedSetNumber,
  primaryAction,
  primaryActionAnchorKey,
  onPrimaryAction,
  onPanelLayout,
  onPrimaryActionLayout,
}: Props) {
  const copy = getHealthStrengthCopy(locale);
  const actionLayoutKey =
    primaryAction ?
      ["rest", completedSetNumber, primaryAction.actionType, primaryAction.labelKey, JSON.stringify(primaryAction.labelParams ?? {})].join(":")
    : null;

  return (
    <View onLayout={(event: LayoutChangeEvent) => onPanelLayout?.(event.nativeEvent.layout.y)} style={styles.panel}>
      <WMText style={styles.label} variant="label">
        {formatTemplate(copy.panels.restAfterSet, { completedSetNumber })}
      </WMText>

      <View style={styles.timerRow}>
        <CircularTimer
          elapsedSeconds={timer.elapsedSeconds}
          phaseLabel={copy.states.rest}
          size={122}
          state={timer.state}
          totalSeconds={timer.totalSeconds}
        />
      </View>
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
          <StrengthSessionPrimaryAction
            locale={locale}
            onPress={onPrimaryAction}
            resolution={primaryAction}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.green.soft,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: spacing.xs,
  },
  label: {
    color: foundationColors.green.deep,
  },
  timerRow: {
    alignItems: "center",
  },
  actionWrap: {
    marginTop: spacing.xs,
  },
});
