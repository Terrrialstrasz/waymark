import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  foundationColors,
  getWaymarkMotionDuration,
  getWaymarkPressStyle,
  motionTokens,
  semanticBorder,
  semanticElevation,
  semanticRadius,
  spacing,
  typography,
  useReducedMotionEnabled,
} from "../../theme/tokens";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMButton } from "../primitives/WMButton";
import { EntityChip } from "../primitives/EntityChip";
import { StatusChip } from "../primitives/StatusChip";
import {
  SignalModeAction,
  SignalModeCardModel,
  SignalModeCardVariant,
  SignalModeIntentPayload,
} from "./signalMode.types";

type Props = {
  model: SignalModeCardModel;
  variant?: SignalModeCardVariant;
  reducedMotion?: boolean;
  onIntent?: (payload: SignalModeIntentPayload) => void;
};

export function SignalModeCard({
  model,
  variant = "standard",
  reducedMotion,
  onIntent,
}: Props) {
  const prefersReducedMotion = useReducedMotionEnabled(reducedMotion);
  const ringPulse = useRef(new Animated.Value(0.6)).current;
  const showPrimarySlot = variant === "withPrimarySlot" || variant === "hero" || variant === "resolveRequired";
  const compact = variant === "compact";
  const readOnly = variant === "readOnlyResolved" || model.status === "resolved";
  const primaryAction = useMemo(
    () => model.actions.find((action) => action.prominence === "primary" || action.kind === "PRIMARY"),
    [model.actions],
  );
  const secondaryActions = useMemo(
    () => model.actions.filter((action) => action.id !== primaryAction?.id),
    [model.actions, primaryAction?.id],
  );
  const cardVariant =
    model.status === "missed" || model.status === "error"
      ? "warningSoft"
      : variant === "hero"
        ? "hero"
        : "standard";

  useEffect(() => {
    if (model.status !== "ringing" || prefersReducedMotion) {
      ringPulse.stopAnimation();
      ringPulse.setValue(0.8);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, {
          toValue: 1,
          duration: getWaymarkMotionDuration(motionTokens.duration.slow, false),
          useNativeDriver: true,
        }),
        Animated.timing(ringPulse, {
          toValue: 0.55,
          duration: getWaymarkMotionDuration(motionTokens.duration.slow, false),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [model.status, prefersReducedMotion, ringPulse]);

  return (
    <JournalCard
      decorative
      decorationPreset="journalCard"
      preserveSurfaceColorOnPress
      stateTone={resolveStateTone(model.status)}
      style={[styles.card, compact ? styles.cardCompact : null]}
      variant={cardVariant}
    >
      <View style={styles.stack}>
        <View style={styles.headerRow}>
          <View style={[styles.bellBadge, compact ? styles.bellBadgeCompact : null]}>
            <Animated.View style={[styles.bellArcLeftOuter, model.status === "ringing" ? { opacity: ringPulse } : styles.arcQuiet]} />
            <Animated.View style={[styles.bellArcLeftInner, model.status === "ringing" ? { opacity: ringPulse.interpolate({ inputRange: [0.55, 1], outputRange: [0.3, 0.82] }) } : styles.arcQuiet]} />
            <View style={styles.bellCore}>
              <WaymarkIcon
                customHeight={compact ? 34 : 40}
                customWidth={compact ? 34 : 40}
                semanticName="utility.bell"
                size="custom"
                state={model.status === "disabled" ? "disabled" : model.status === "ringing" ? "active" : "default"}
              />
            </View>
            <Animated.View style={[styles.bellArcRightInner, model.status === "ringing" ? { opacity: ringPulse.interpolate({ inputRange: [0.55, 1], outputRange: [0.3, 0.82] }) } : styles.arcQuiet]} />
            <Animated.View style={[styles.bellArcRightOuter, model.status === "ringing" ? { opacity: ringPulse } : styles.arcQuiet]} />
          </View>

          <View style={styles.headerCopy}>
            <WMText numberOfLines={1} style={compact ? styles.titleCompact : styles.title} variant={variant === "hero" ? "sheetTitle" : "cardTitle"}>
              {model.title}
            </WMText>
            <WMText numberOfLines={2} style={styles.subtitle} variant="bodySm">
              {model.subtitle ?? "A Waymark Signal is calling."}
            </WMText>
            <View style={styles.chipRow}>
              {model.scheduledTimeLabel ? (
                <EntityChip
                  iconSemanticName="utility.clock"
                  label={model.scheduledTimeLabel}
                  style={styles.timeChip}
                  textStyle={styles.timeChipText}
                  variant="metadata"
                />
              ) : null}
              <StatusChip
                iconSemanticName={resolveStatusIcon(model.status)}
                label={model.relativeStatusLabel}
                size="compact"
                stateTone={resolveStateTone(model.status)}
              />
            </View>
          </View>
        </View>

        {showPrimarySlot && primaryAction && !readOnly ? (
          <WMButton
            accessibilityLabel={primaryAction.label}
            disabled={Boolean(primaryAction.disabled) || model.status === "resolving"}
            fullWidth
            label={primaryAction.loading ? "..." : primaryAction.label}
            onPress={() => emitIntent(model, primaryAction, onIntent)}
            variant="primary"
          />
        ) : null}

        {secondaryActions.length ? (
          <View style={[styles.actionRow, secondaryActions.length === 1 ? styles.actionRowSingle : null]}>
            {secondaryActions.map((action) => (
              <SignalActionTile
                key={action.id}
                action={action}
                compact={compact}
                disabled={Boolean(action.disabled) || model.status === "resolving" || readOnly}
                onPress={() => emitIntent(model, action, onIntent)}
              />
            ))}
          </View>
        ) : null}

        {!showPrimarySlot && primaryAction && !readOnly ? (
          <SignalActionTile
            action={primaryAction}
            compact={compact}
            disabled={Boolean(primaryAction.disabled) || model.status === "resolving"}
            fullWidth
            onPress={() => emitIntent(model, primaryAction, onIntent)}
            prominent
          />
        ) : null}

        {model.resolveRequiredHint ? (
          <WMText style={styles.resolveHint} variant="metaCompact">
            {model.resolveRequiredHint}
          </WMText>
        ) : null}

        {model.errorMessage ? (
          <View
            accessibilityLabel={model.errorMessage}
            accessibilityRole="alert"
            style={styles.errorStrip}
          >
            <WMText style={styles.errorText} variant="bodyXs">
              {model.errorMessage}
            </WMText>
          </View>
        ) : null}
      </View>
    </JournalCard>
  );
}

function SignalActionTile({
  action,
  compact,
  disabled,
  fullWidth = false,
  prominent = false,
  onPress,
}: {
  action: SignalModeAction;
  compact: boolean;
  disabled: boolean;
  fullWidth?: boolean;
  prominent?: boolean;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotionEnabled();

  return (
    <Pressable
      accessibilityHint={action.disabledReason}
      accessibilityLabel={action.disabledReason ? `${action.label}. ${action.disabledReason}` : action.label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        compact ? styles.actionTileCompact : null,
        fullWidth ? styles.actionTileFullWidth : null,
        prominent ? styles.actionTileProminent : null,
        disabled ? styles.actionTileDisabled : null,
        pressed && !disabled ? styles.actionTilePressed : null,
        getWaymarkPressStyle({ pressed, reducedMotion, variant: prominent ? "primary" : "secondary" }),
      ]}
    >
      {action.iconSemanticName ? (
        <WaymarkIcon
          semanticName={action.iconSemanticName}
          size="sm"
          state={disabled ? "disabled" : pressedState(prominent)}
          style={styles.actionIcon}
        />
      ) : null}
      <WMText numberOfLines={2} style={[styles.actionLabel, disabled ? styles.actionLabelDisabled : null]} variant="label">
        {action.loading ? "..." : action.label}
      </WMText>
    </Pressable>
  );
}

function emitIntent(
  model: SignalModeCardModel,
  action: SignalModeAction,
  onIntent?: (payload: SignalModeIntentPayload) => void,
) {
  if (!onIntent || action.disabled) {
    return;
  }

  onIntent({
    signalId: model.signalId,
    targetId: model.targetId,
    targetType: model.targetType,
    actionId: action.id,
    kind: action.kind,
    minutes: action.minutes,
    occurredAt: new Date().toISOString(),
  });
}

function resolveStateTone(status: SignalModeCardModel["status"]) {
  switch (status) {
    case "ringing":
      return "due_now" as const;
    case "snoozed":
      return "upcoming" as const;
    case "missed":
      return "missed" as const;
    case "error":
      return "error" as const;
    case "resolved":
      return "done" as const;
    case "disabled":
      return "disabled" as const;
    default:
      return undefined;
  }
}

function resolveStatusIcon(status: SignalModeCardModel["status"]) {
  switch (status) {
    case "ringing":
      return "utility.bell" as const;
    case "snoozed":
      return "utility.clock" as const;
    case "resolved":
      return "status.done" as const;
    case "missed":
      return "status.missed" as const;
    case "resolving":
      return "status.inProgress" as const;
    default:
      return "status.upcoming" as const;
  }
}

function pressedState(prominent: boolean) {
  return prominent ? "pressed" : "default";
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
  },
  cardCompact: {
    padding: spacing.sm,
  },
  stack: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  bellBadge: {
    minWidth: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeCompact: {
    minWidth: 54,
    height: 54,
  },
  bellCore: {
    width: 52,
    height: 52,
    borderRadius: semanticRadius.capture,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: foundationColors.bg.paperWarm,
    borderWidth: 1,
    borderColor: foundationColors.gold.base,
    boxShadow: semanticElevation.card,
  },
  bellArcLeftOuter: {
    position: "absolute",
    left: 0,
    width: 16,
    height: 34,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: foundationColors.gold.base,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  bellArcLeftInner: {
    position: "absolute",
    left: 8,
    width: 12,
    height: 24,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: foundationColors.gold.deep,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  bellArcRightOuter: {
    position: "absolute",
    right: 0,
    width: 16,
    height: 34,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: foundationColors.gold.base,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  bellArcRightInner: {
    position: "absolute",
    right: 8,
    width: 12,
    height: 24,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: foundationColors.gold.deep,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  arcQuiet: {
    opacity: 0.28,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  titleCompact: {
    color: foundationColors.ink.primary,
    fontSize: typography.cardTitle.fontSize,
    lineHeight: typography.cardTitle.lineHeight,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    alignItems: "center",
  },
  timeChip: {
    backgroundColor: foundationColors.gold.soft,
    borderColor: foundationColors.gold.base,
  },
  timeChipText: {
    color: foundationColors.gold.deep,
    fontVariant: ["tabular-nums"],
    fontWeight: Platform.OS === "android" ? "700" : "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionRowSingle: {
    flexDirection: "column",
  },
  actionTile: {
    flex: 1,
    minHeight: 64,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    borderRadius: semanticRadius.button.default,
    backgroundColor: foundationColors.bg.paper,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    boxShadow: semanticElevation.row,
  },
  actionTileCompact: {
    minHeight: 56,
    paddingHorizontal: spacing.xs,
  },
  actionTileFullWidth: {
    width: "100%",
  },
  actionTileProminent: {
    backgroundColor: foundationColors.green.base,
    borderColor: foundationColors.green.base,
  },
  actionTileDisabled: {
    opacity: 0.48,
    boxShadow: semanticElevation.flat,
  },
  actionTilePressed: {
    boxShadow: semanticElevation.pressed,
  },
  actionIcon: {
    marginBottom: 2,
  },
  actionLabel: {
    textAlign: "center",
    color: foundationColors.ink.primary,
  },
  actionLabelDisabled: {
    color: foundationColors.ink.tertiary,
  },
  resolveHint: {
    color: foundationColors.ink.tertiary,
    fontStyle: "italic",
  },
  errorStrip: {
    borderWidth: 1,
    borderColor: foundationColors.border.warning,
    backgroundColor: foundationColors.gold.soft,
    borderRadius: semanticRadius.card.compact,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  errorText: {
    color: foundationColors.ink.secondary,
  },
});
