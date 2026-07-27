import { useEffect, useMemo, useRef } from "react";
import { AccessibilityState, Animated, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import {
  foundationColors,
  getWaymarkEasing,
  getWaymarkMotionDuration,
  getWaymarkPressStyle,
  motionSemanticTokens,
  motionTokens,
  semanticBorder,
  semanticRadius,
  spacing,
  useReducedMotionEnabled,
} from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { WMText } from "./Text";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type TimerState = "idle" | "running" | "paused" | "warning" | "completed";

type Props = {
  totalSeconds: number;
  elapsedSeconds: number;
  phaseLabel: string;
  state?: TimerState;
  reducedMotion?: boolean;
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function CircularTimer({
  totalSeconds,
  elapsedSeconds,
  phaseLabel,
  state = "idle",
  reducedMotion,
  size = 156,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const prefersReducedMotion = useReducedMotionEnabled(reducedMotion);
  const progressValue = useRef(new Animated.Value(0)).current;
  const phaseOpacity = useRef(new Animated.Value(1)).current;
  const previousPhase = useRef(phaseLabel);
  const clampedProgress = Math.max(0, Math.min(1, totalSeconds <= 0 ? 0 : elapsedSeconds / totalSeconds));
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const palette = getTimerPalette(state);

  useEffect(() => {
    Animated.timing(progressValue, {
      toValue: clampedProgress,
      duration: getWaymarkMotionDuration(motionSemanticTokens.timer.progress.duration, prefersReducedMotion || state !== "running"),
      easing: getWaymarkEasing(motionSemanticTokens.timer.progress.easing),
      useNativeDriver: false,
    }).start();
  }, [clampedProgress, prefersReducedMotion, progressValue, state]);

  useEffect(() => {
    if (previousPhase.current === phaseLabel) {
      return;
    }

    previousPhase.current = phaseLabel;

    if (prefersReducedMotion) {
      phaseOpacity.setValue(1);
      return;
    }

    Animated.sequence([
      Animated.timing(phaseOpacity, {
        toValue: 0.64,
        duration: getWaymarkMotionDuration(motionSemanticTokens.timer.phaseChange.duration / 2, false),
        easing: getWaymarkEasing(motionSemanticTokens.timer.phaseChange.easing),
        useNativeDriver: true,
      }),
      Animated.timing(phaseOpacity, {
        toValue: 1,
        duration: getWaymarkMotionDuration(motionSemanticTokens.timer.phaseChange.duration / 2, false),
        easing: getWaymarkEasing(motionSemanticTokens.timer.phaseChange.easing),
        useNativeDriver: true,
      }),
    ]).start();
  }, [phaseLabel, phaseOpacity, prefersReducedMotion]);

  const dashOffset = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const remaining = Math.max(0, totalSeconds - elapsedSeconds);
  const timeLabel = useMemo(() => formatClock(remaining), [remaining]);
  const accessibilityState = useMemo<AccessibilityState>(
    () => ({ disabled: !onPress, selected: state === "running", busy: state === "running" }),
    [onPress, state],
  );

  const content = (
    <View style={[styles.shell, { width: size, minHeight: size, borderColor: palette.borderColor }]}>
      <Svg height={size} style={styles.ring} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={foundationColors.border.subtle}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          rotation="-90"
          stroke={palette.strokeColor}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>

      <View pointerEvents="none" style={styles.center}>
        <WMText numberOfLines={1} style={[palette.timeStyle, size <= 122 ? styles.timeCompact : null]} variant="timer">
          {timeLabel}
        </WMText>
        <Animated.View style={{ opacity: phaseOpacity }}>
          <WMText style={palette.phaseStyle} variant="meta">
            {phaseLabel}
          </WMText>
        </Animated.View>
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, getWaymarkPressStyle({ pressed, reducedMotion: prefersReducedMotion, variant: "row" })]}
    >
      {content}
    </Pressable>
  );
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getTimerPalette(state: TimerState) {
  if (state === "warning") {
    return {
      strokeColor: foundationColors.gold.base,
      borderColor: foundationColors.border.warning,
      timeStyle: { color: foundationColors.ink.primary },
      phaseStyle: { color: foundationColors.gold.deep },
    };
  }

  if (state === "completed") {
    return {
      strokeColor: foundationColors.green.deep,
      borderColor: foundationColors.border.active,
      timeStyle: { color: foundationColors.green.deep },
      phaseStyle: { color: foundationColors.ink.secondary },
    };
  }

  return {
    strokeColor: foundationColors.green.base,
    borderColor: foundationColors.border.soft,
    timeStyle: { color: foundationColors.ink.primary },
    phaseStyle: { color: foundationColors.ink.secondary },
  };
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: semanticRadius.card.default,
  },
  shell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: semanticRadius.card.default,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle(semanticBorder.card.subtle),
    padding: spacing.md,
  },
  ring: {
    transform: [{ rotate: "0deg" }],
  },
  center: {
    position: "absolute",
    alignItems: "center",
    gap: spacing.xs,
  },
  timeCompact: {
    fontSize: 28,
    lineHeight: 30,
  },
});
