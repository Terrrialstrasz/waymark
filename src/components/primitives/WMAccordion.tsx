import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityState, Animated, LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import {
  foundationColors,
  getWaymarkEasing,
  getWaymarkMotionDuration,
  getWaymarkPressStyle,
  motionSemanticTokens,
  motionTokens,
  semanticBorder,
  semanticRadius,
  semanticSpacing,
  useReducedMotionEnabled,
} from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { WMText } from "./Text";
import { WaymarkIcon } from "./WaymarkIcon";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  reducedMotion?: boolean;
  onToggle?: (expanded: boolean) => void;
  size?: "default" | "major" | "level2";
};

export function WMAccordion({
  title,
  subtitle,
  children,
  defaultExpanded = false,
  expanded,
  reducedMotion,
  onToggle,
  size = "default",
}: Props) {
  const prefersReducedMotion = useReducedMotionEnabled(reducedMotion);
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [contentHeight, setContentHeight] = useState(0);
  const isControlled = typeof expanded === "boolean";
  const isExpanded = isControlled ? expanded : internalExpanded;
  const progress = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const accessibilityState = useMemo<AccessibilityState>(
    () => ({ expanded: isExpanded }),
    [isExpanded],
  );

  useEffect(() => {
    const toValue = isExpanded ? 1 : 0;
    const duration = getWaymarkMotionDuration(
      isExpanded ? motionSemanticTokens.accordion.expand.duration : motionSemanticTokens.accordion.collapse.duration,
      prefersReducedMotion,
    );

    Animated.timing(progress, {
      toValue,
      duration,
      easing: getWaymarkEasing(
        isExpanded ? motionSemanticTokens.accordion.expand.easing : motionSemanticTokens.accordion.collapse.easing,
      ),
      useNativeDriver: false,
    }).start();
  }, [isExpanded, prefersReducedMotion, progress]);

  const bodyHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight || 1],
  });

  const bodyOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [motionTokens.opacity.contentRevealStart, motionTokens.opacity.contentRevealEnd],
  });

  const bodyTranslateY = prefersReducedMotion
    ? 0
    : progress.interpolate({
        inputRange: [0, 1],
        outputRange: [motionSemanticTokens.accordion.contentRevealY, 0],
      });

  const chevronRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  const handleToggle = () => {
    const next = !isExpanded;
    if (!isControlled) {
      setInternalExpanded(next);
    }
    onToggle?.(next);
  };

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight !== contentHeight) {
      setContentHeight(nextHeight);
    }
  };

  return (
    <View style={[styles.shell, size === "major" ? styles.majorShell : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        onPress={handleToggle}
        style={({ pressed }) => [
          styles.header,
          size === "major" ? styles.majorHeader : null,
          size === "level2" ? styles.level2Header : null,
          getWaymarkPressStyle({ pressed, reducedMotion: prefersReducedMotion, variant: "row" }),
        ]}
      >
        <View style={styles.copy}>
          <WMText variant={size === "major" ? "sheetTitle" : size === "level2" ? "cardTitle" : "bodyStrong"}>{title}</WMText>
          {subtitle ? (
            <WMText style={styles.subtitle} variant={size === "level2" ? "bodySm" : "meta"}>
              {subtitle}
            </WMText>
          ) : null}
        </View>
        <Animated.View style={[styles.chevronWrap, { transform: [{ rotate: chevronRotate }] }]}>
          <WaymarkIcon decorative semanticName="utility.chevron" size="sm" state="muted" />
          {/*
          <WMText style={styles.chevron} variant="bodyStrong">
            ⌄
          </WMText>
          */}
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[
          styles.bodyViewport,
          {
            height: prefersReducedMotion ? (isExpanded ? undefined : 0) : bodyHeight,
            opacity: bodyOpacity,
            transform: [{ translateY: bodyTranslateY as number | Animated.AnimatedInterpolation<string | number> }],
          },
        ]}
      >
        <View
          onLayout={handleContentLayout}
          pointerEvents={isExpanded ? "auto" : "none"}
          style={[styles.bodyInner, size === "major" ? styles.majorBodyInner : null]}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderRadius: semanticRadius.card.default,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle(semanticBorder.card.subtle),
  },
  majorShell: {
    backgroundColor: "transparent",
  },
  header: {
    minHeight: 44,
    paddingHorizontal: semanticSpacing.row.paddingX,
    paddingVertical: semanticSpacing.row.paddingY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: semanticSpacing.row.gap,
  },
  majorHeader: {
    minHeight: 64,
    paddingHorizontal: semanticSpacing.card.padding.lg,
    paddingVertical: semanticSpacing.card.padding.lg,
  },
  level2Header: {
    minHeight: 96,
    paddingHorizontal: semanticSpacing.card.padding.lg,
    paddingVertical: semanticSpacing.card.padding.lg,
    alignItems: "flex-start",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
  },
  chevronWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  bodyViewport: {
    overflow: "hidden",
  },
  bodyInner: {
    paddingHorizontal: semanticSpacing.row.paddingX,
    paddingTop: 0,
    paddingBottom: semanticSpacing.row.paddingY,
    gap: semanticSpacing.card.gap,
  },
  majorBodyInner: {
    paddingHorizontal: semanticSpacing.card.padding.lg,
    paddingBottom: semanticSpacing.card.gap,
  },
});
