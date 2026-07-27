import { useMemo, useState } from "react";
import { AccessibilityState, Platform, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { captureLeafTokens, foundationBorderColor, foundationColors, getWaymarkPressStyle, semanticElevation, semanticTokens, useReducedMotionEnabled } from "../../theme/tokens";
import { composeShadow } from "../../design-system/utils/compose-shadow";
import { WaymarkSkinAsset } from "./WaymarkSkinAsset";
import { waymarkIconMap } from "../../design/waymark-icon-map";

type Props = {
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityLabelOpen?: string;
  active?: boolean;
  disabled?: boolean;
  focusVisible?: boolean;
  reducedMotion?: boolean;
  pressed?: boolean;
  visualSize?: number;
  haloSize?: number;
  iconSize?: number;
  onPress?: () => void;
};

type VisualState = "idle" | "pressed" | "active" | "disabled";

export function CaptureLeafButton({
  accessibilityLabel,
  accessibilityHint,
  accessibilityLabelOpen,
  active = false,
  disabled = false,
  focusVisible = false,
  reducedMotion = false,
  pressed = false,
  visualSize = captureLeafTokens.size.visual,
  haloSize = semanticTokens.size.captureLeaf.halo,
  iconSize = semanticTokens.size.captureLeaf.icon,
  onPress,
}: Props) {
  const [focused, setFocused] = useState(false);
  const prefersReducedMotion = useReducedMotionEnabled(reducedMotion);
  const accessibilityState = useMemo<AccessibilityState>(() => ({ disabled, expanded: active }), [active, disabled]);

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={active && accessibilityLabelOpen ? accessibilityLabelOpen : accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      disabled={disabled}
      focusable
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed: pressState }) => {
        const visualState = getVisualState({
          active,
          disabled,
          pressed: pressed || pressState,
        });

        return [
          styles.root,
          {
            width: captureLeafTokens.size.tapTarget,
            height: captureLeafTokens.size.tapTarget,
            borderRadius: captureLeafTokens.radius.tapTarget,
          },
          focusVisible || focused ? styles.rootFocus : null,
          getPressTransformStyle({ reducedMotion: prefersReducedMotion, visualState }),
        ];
      }}
    >
      {({ pressed: pressState }) => {
        const visualState = getVisualState({
          active,
          disabled,
          pressed: pressed || pressState,
        });
        const showFocus = focusVisible || focused;

        return (
          <View style={[styles.halo, getHaloStyle(visualState, showFocus, haloSize)]}>
            <View
              style={[
                styles.surface,
                {
                  width: visualSize,
                  height: visualSize,
                  borderRadius: captureLeafTokens.radius.badge,
                  backgroundColor: "transparent",
                },
              ]}
            >
              <WaymarkSkinAsset
                assetId={waymarkIconMap.nav.capture}
                customWidth={iconSize}
                decorative
                size="custom"
                visualTone={visualState === "disabled" ? "disabled" : "default"}
              />
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

function getVisualState({
  active,
  disabled,
  pressed,
}: {
  active: boolean;
  disabled: boolean;
  pressed: boolean;
}): VisualState {
  if (disabled) {
    return "disabled";
  }

  if (pressed) {
    return "pressed";
  }

  if (active) {
    return "active";
  }

  return "idle";
}

function getPressTransformStyle({
  reducedMotion,
  visualState,
}: {
  reducedMotion: boolean;
  visualState: VisualState;
}): ViewStyle {
  if (reducedMotion || visualState !== "pressed") {
    return styles.rootIdle;
  }

  return getWaymarkPressStyle({
    pressed: true,
    reducedMotion,
    variant: "capture",
  }) ?? styles.rootIdle;
}

function getHaloStyle(visualState: VisualState, showFocus: boolean, haloSize: number): ViewStyle {
  return {
    width: haloSize,
    height: haloSize,
    borderRadius: captureLeafTokens.radius.badge,
    backgroundColor: getHaloFill(visualState),
    borderWidth: showFocus || visualState === "active" ? semanticTokens.size.captureLeaf.focusRingWidth : 1,
    borderColor: showFocus || visualState === "active" ? captureLeafTokens.outerRingEdge : "rgba(200,154,58,0.12)",
    boxShadow: showFocus ? composeShadow(getSurfaceShadow(visualState), semanticElevation.focus) : getSurfaceShadow(visualState),
  };
}

function getHaloFill(visualState: VisualState) {
  if (visualState === "disabled") {
    return "rgba(241,229,205,0.18)";
  }

  if (visualState === "pressed") {
    return "rgba(255,248,234,0.6)";
  }

  if (visualState === "active") {
    return "rgba(255,253,244,0.38)";
  }

  return "rgba(255,253,244,0.14)";
}

function getSurfaceShadow(visualState: VisualState) {
  if (visualState === "disabled") {
    return semanticElevation.flat;
  }

  if (visualState === "pressed") {
    return semanticElevation.flat;
  }

  if (visualState === "active") {
    return semanticElevation.card;
  }

  return foundationColors.shadow.none;
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  rootIdle: {
    transform: [{ translateY: 0 }, { scale: 1 }],
  },
  rootFocus: {
    outlineColor: Platform.OS === "web" ? foundationBorderColor.focus : undefined,
    outlineStyle: Platform.OS === "web" ? "solid" : undefined,
    outlineWidth: Platform.OS === "web" ? semanticTokens.size.captureLeaf.focusRingWidth : undefined,
  },
  halo: {
    alignItems: "center",
    justifyContent: "center",
  },
  surface: {
    alignItems: "center",
    justifyContent: "center",
    boxShadow: foundationColors.shadow.none,
  },
});
