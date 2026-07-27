import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  foundationColors,
  getWaymarkEasing,
  getWaymarkMotionDuration,
  motionSemanticTokens,
  motionTokens,
  semanticBorder,
  semanticElevation,
  semanticRadius,
  semanticSpacing,
  useReducedMotionEnabled,
} from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { WMText } from "./Text";

type Props = {
  visible: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  presentation?: "bottomSheet" | "fullScreen";
  sheetStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  handleStyle?: StyleProp<ViewStyle>;
};

export function WMSheet({
  visible,
  title,
  children,
  onClose,
  presentation = "bottomSheet",
  sheetStyle,
  contentStyle,
  handleStyle,
}: Props) {
  const reducedMotion = useReducedMotionEnabled();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const isFullScreen = presentation === "fullScreen";

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1,
          duration: getWaymarkMotionDuration(motionSemanticTokens.sheet.enter.duration, reducedMotion),
          easing: getWaymarkEasing(motionSemanticTokens.sheet.enter.easing),
          useNativeDriver: false,
        }),
      ]).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: getWaymarkMotionDuration(motionSemanticTokens.sheet.exit.duration, reducedMotion),
      easing: getWaymarkEasing(motionSemanticTokens.sheet.exit.easing),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [progress, reducedMotion, visible]);

  if (!mounted) {
    return null;
  }

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [motionTokens.opacity.hidden, motionSemanticTokens.backdrop.enter.opacity],
  });

  const sheetTranslateY = reducedMotion
    ? 0
    : progress.interpolate({
        inputRange: [0, 1],
        outputRange: [motionSemanticTokens.sheet.enter.translateY, 0],
      });

  const sheetScale = reducedMotion
    ? 1
    : progress.interpolate({
        inputRange: [0, 1],
        outputRange: [motionSemanticTokens.sheet.enter.scaleStart, 1],
      });

  const sheetOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [motionTokens.opacity.hidden, motionTokens.opacity.visible],
  });

  return (
    <Modal transparent animationType="none" visible={mounted} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            isFullScreen ? styles.sheetFullScreen : null,
            sheetStyle,
            {
              opacity: sheetOpacity,
              paddingTop: isFullScreen ? insets.top + semanticSpacing.sheet.paddingTop : semanticSpacing.sheet.paddingTop,
              paddingBottom: isFullScreen ? insets.bottom + semanticSpacing.sheet.paddingBottom : semanticSpacing.sheet.paddingBottom,
              transform: [{ translateY: sheetTranslateY as number | Animated.AnimatedInterpolation<string | number> }, { scale: sheetScale as number | Animated.AnimatedInterpolation<string | number> }],
            },
          ]}
        >
          <View style={[styles.handle, handleStyle]} />
          {title ? <WMText variant="sheetTitle">{title}</WMText> : null}
          <View style={[styles.content, isFullScreen ? styles.contentFullScreen : null, contentStyle]}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: foundationColors.bg.overlay,
  },
  sheet: {
    backgroundColor: foundationColors.bg.paper,
    borderTopLeftRadius: semanticRadius.sheet,
    borderTopRightRadius: semanticRadius.sheet,
    ...getBorderStyle(semanticBorder.sheet.default),
    paddingHorizontal: semanticSpacing.sheet.paddingX,
    gap: semanticSpacing.card.gap,
    boxShadow: semanticElevation.sheet,
  },
  sheetFullScreen: {
    height: "100%",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  handle: {
    alignSelf: "center",
    width: 48,
    height: 4,
    borderRadius: semanticRadius.chip,
    backgroundColor: foundationColors.border.subtle,
  },
  content: {
    gap: semanticSpacing.card.gap,
  },
  contentFullScreen: {
    flex: 1,
    minHeight: 0,
  },
});
