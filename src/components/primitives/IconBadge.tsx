import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { WaymarkIcon, WaymarkIconState } from "./WaymarkIcon";
import { WaymarkSkinAssetSize } from "../../design/skin-assets";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import {
  foundationColors,
  getWaymarkPressStyle,
  semanticBorder,
  semanticElevation,
  semanticRadius,
  semanticStateStyles,
  spacing,
  useReducedMotionEnabled,
} from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";

type Shape = "circle" | "rounded" | "softSquare" | "seal";
type Size = "sm" | "md" | "lg" | "xl";
type Tone = "default" | "warm" | "green" | "amber" | "muted" | "warning";
type State = "default" | "selected" | "pressed" | "disabled" | "completed" | "warning";

type Props = {
  semanticName: WaymarkSemanticIconName;
  shape?: Shape;
  size?: Size;
  iconSize?: WaymarkSkinAssetSize;
  tone?: Tone;
  state?: State;
  decorative?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

const badgeSizes: Record<Size, number> = {
  sm: 36,
  md: 44,
  lg: 52,
  xl: 64,
};

const iconSizes: Record<Size, "sm" | "md" | "lg" | "xl"> = {
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
};

const badgeRadii: Record<Shape, number> = {
  circle: semanticRadius.badge,
  rounded: semanticRadius.button.default,
  softSquare: semanticRadius.card.default,
  seal: semanticRadius.capture,
};

const toneSurfaces: Record<Tone, { backgroundColor: string; borderColor: string }> = {
  default: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
  },
  warm: {
    backgroundColor: foundationColors.bg.paperWarm,
    borderColor: foundationColors.border.subtle,
  },
  green: {
    backgroundColor: foundationColors.green.soft,
    borderColor: foundationColors.border.active,
  },
  amber: {
    backgroundColor: foundationColors.gold.soft,
    borderColor: foundationColors.border.proof,
  },
  muted: {
    backgroundColor: foundationColors.bg.disabled,
    borderColor: foundationColors.border.disabled,
  },
  warning: {
    backgroundColor: foundationColors.missed.soft,
    borderColor: foundationColors.border.warning,
  },
};

export function IconBadge({
  semanticName,
  shape = "circle",
  size = "md",
  iconSize,
  tone = "default",
  state = "default",
  decorative = true,
  onPress,
  accessibilityLabel,
}: Props) {
  const reducedMotion = useReducedMotionEnabled();
  const boxSize = badgeSizes[size];
  const surfaceStyle = getSurfaceStyle(tone, state);
  const iconState = getIconState(state);
  const actionable = typeof onPress === "function";
  const resolvedIconSize = iconSize ?? iconSizes[size];
  const content = (
    <View
      style={[
        styles.base,
        {
          width: boxSize,
          height: boxSize,
          minWidth: actionable ? 44 : undefined,
          minHeight: actionable ? 44 : undefined,
          borderRadius: badgeRadii[shape],
          padding: spacing.xs,
        },
        surfaceStyle,
      ]}
    >
      <WaymarkIcon
        accessibilityLabel={decorative ? undefined : accessibilityLabel ?? semanticName}
        decorative={decorative}
        semanticName={semanticName}
        size={resolvedIconSize}
        state={iconState}
      />
    </View>
  );

  if (!actionable) {
    return content;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [getWaymarkPressStyle({ pressed, reducedMotion, variant: "icon" })]}
    >
      {content}
    </Pressable>
  );
}

function getSurfaceStyle(tone: Tone, state: State): ViewStyle {
  if (state === "completed") {
    return {
      backgroundColor: semanticStateStyles.done.bg,
      ...getBorderStyle(semanticBorder.state.done),
      boxShadow: semanticElevation.card,
    };
  }

  if (state === "warning") {
    return {
      backgroundColor: semanticStateStyles.missed.bg,
      ...getBorderStyle(semanticBorder.state.missed),
      boxShadow: semanticElevation.card,
    };
  }

  if (state === "selected") {
    return {
      ...toneSurfaces[tone],
      ...getBorderStyle(semanticBorder.card.strong),
      boxShadow: semanticElevation.card,
    };
  }

  if (state === "pressed") {
    return {
      ...toneSurfaces[tone],
      ...getBorderStyle(semanticBorder.card.subtle),
      boxShadow: semanticElevation.pressed,
    };
  }

  if (state === "disabled") {
    return {
      ...toneSurfaces.muted,
      ...getBorderStyle(semanticBorder.card.subtle),
      opacity: 0.56,
      boxShadow: semanticElevation.flat,
    };
  }

  return {
    ...toneSurfaces[tone],
    ...getBorderStyle(semanticBorder.card.subtle),
    boxShadow: semanticElevation.card,
  };
}

function getIconState(state: State): WaymarkIconState {
  if (state === "disabled") {
    return "disabled";
  }

  if (state === "pressed") {
    return "pressed";
  }

  if (state === "selected" || state === "completed") {
    return "selected";
  }

  if (state === "warning") {
    return "active";
  }

  return "default";
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
});
