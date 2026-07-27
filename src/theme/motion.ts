import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Easing, EasingFunction, ViewStyle } from "react-native";

export const motionTokens = {
  duration: {
    instant: 0,
    tap: 80,
    release: 120,
    quick: 160,
    standard: 220,
    sheetEnter: 280,
    sheetExit: 200,
    slow: 360,
    timerTick: 1000,
  },
  easingCurve: {
    standard: [0.2, 0, 0, 1] as const,
    enter: [0.16, 1, 0.3, 1] as const,
    exit: [0.7, 0, 0.84, 0] as const,
    press: [0.2, 0, 0.8, 1] as const,
    release: [0.16, 1, 0.3, 1] as const,
    softSettle: [0.25, 1, 0.5, 1] as const,
  },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    enter: Easing.bezier(0.16, 1, 0.3, 1),
    exit: Easing.bezier(0.7, 0, 0.84, 0),
    press: Easing.bezier(0.2, 0, 0.8, 1),
    release: Easing.bezier(0.16, 1, 0.3, 1),
    linear: Easing.linear,
    softSettle: Easing.bezier(0.25, 1, 0.5, 1),
  },
  scale: {
    pressSubtle: 0.985,
    pressSecondary: 0.975,
    pressButton: 0.96,
    pressCapture: 0.94,
    sheetEnterStart: 0.985,
  },
  translate: {
    sheetEnterY: 24,
    sheetExitY: 20,
    contentRevealY: 6,
    toastY: 8,
  },
  rotate: {
    chevronOpen: "180deg",
    chevronClosed: "0deg",
  },
  opacity: {
    hidden: 0,
    subtle: 0.32,
    backdrop: 0.48,
    disabled: 0.45,
    visible: 1,
    decorativeIdleMin: 0.16,
    decorativeIdleMax: 0.28,
    contentRevealStart: 0,
    contentRevealEnd: 1,
  },
} as const;

export const motionSemanticTokens = {
  sheet: {
    enter: {
      duration: motionTokens.duration.sheetEnter,
      easing: "enter",
      translateY: motionTokens.translate.sheetEnterY,
      scaleStart: motionTokens.scale.sheetEnterStart,
    },
    exit: {
      duration: motionTokens.duration.sheetExit,
      easing: "exit",
      translateY: motionTokens.translate.sheetExitY,
    },
  },
  backdrop: {
    enter: {
      duration: motionTokens.duration.standard,
      easing: "standard",
      opacity: motionTokens.opacity.backdrop,
    },
    exit: {
      duration: motionTokens.duration.quick,
      easing: "exit",
      opacity: motionTokens.opacity.hidden,
    },
  },
  accordion: {
    expand: {
      duration: motionTokens.duration.standard,
      easing: "standard",
    },
    collapse: {
      duration: 180,
      easing: "exit",
    },
    contentRevealY: motionTokens.translate.contentRevealY,
  },
  chevron: {
    rotate: {
      duration: motionTokens.duration.quick,
      easing: "standard",
    },
  },
  button: {
    press: {
      duration: motionTokens.duration.tap,
      easing: "press",
    },
    release: {
      duration: motionTokens.duration.release,
      easing: "release",
    },
  },
  timer: {
    progress: {
      duration: motionTokens.duration.timerTick,
      easing: "linear",
    },
    phaseChange: {
      duration: motionTokens.duration.standard,
      easing: "standard",
    },
    completion: {
      duration: motionTokens.duration.slow,
      easing: "softSettle",
    },
  },
  reduced: {
    fadeOnlyDuration: 140,
  },
} as const;

export type WaymarkEasingToken = keyof typeof motionTokens.easing;
export type WaymarkButtonMotionVariant = "primary" | "secondary" | "icon" | "row" | "capture";

const pressScaleMap: Record<WaymarkButtonMotionVariant, number> = {
  primary: motionTokens.scale.pressButton,
  secondary: motionTokens.scale.pressSecondary,
  icon: 0.95,
  row: motionTokens.scale.pressSubtle,
  capture: motionTokens.scale.pressCapture,
};

const pressTranslateMap: Record<WaymarkButtonMotionVariant, number> = {
  primary: 0,
  secondary: 0,
  icon: 0,
  row: 0,
  capture: 1,
};

export function getWaymarkEasing(token: WaymarkEasingToken): EasingFunction {
  return motionTokens.easing[token];
}

export function getWaymarkMotionDuration(duration: number, reducedMotion: boolean) {
  return reducedMotion ? motionTokens.duration.instant : duration;
}

export function getWaymarkPressStyle({
  pressed,
  reducedMotion,
  variant,
}: {
  pressed: boolean;
  reducedMotion: boolean;
  variant: WaymarkButtonMotionVariant;
}): ViewStyle | null {
  if (!pressed || reducedMotion) {
    return null;
  }

  const translateY = pressTranslateMap[variant];

  return {
    transform: [
      translateY ? { translateY } : { translateY: 0 },
      { scale: pressScaleMap[variant] },
    ],
  };
}

export function useReducedMotionEnabled(explicit?: boolean) {
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof explicit === "boolean") {
      return;
    }

    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setSystemReducedMotion(enabled);
        }
      })
      .catch(() => {
        if (mounted) {
          setSystemReducedMotion(false);
        }
      });

    const subscription = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (enabled) => {
      setSystemReducedMotion(enabled);
    });

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, [explicit]);

  return useMemo(() => explicit ?? systemReducedMotion, [explicit, systemReducedMotion]);
}
