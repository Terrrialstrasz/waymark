import { Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import {
  entityChipTokens,
  getSemanticStateToneStyle,
  getWaymarkPressStyle,
  SemanticState,
  useReducedMotionEnabled,
} from "../../theme/tokens";
import { WaymarkIcon } from "./WaymarkIcon";
import { WMText } from "./Text";

type EntityChipVariant = "entity" | "status" | "filter" | "metadata" | "selected" | "subtle" | "warningSoft";
export type EntityChipSize = "standard" | "compact";

type Props = {
  label: string;
  iconSemanticName?: WaymarkSemanticIconName;
  stateTone?: Exclude<SemanticState, "hidden">;
  variant?: EntityChipVariant;
  size?: EntityChipSize;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function EntityChip({
  label,
  iconSemanticName,
  stateTone,
  variant = "entity",
  size = "standard",
  selected = false,
  disabled = false,
  onPress,
  accessibilityLabel,
  style,
  textStyle,
}: Props) {
  const reducedMotion = useReducedMotionEnabled();
  const interactive = Boolean(onPress) && !disabled;
  const palette = stateTone ? getSemanticStateToneStyle(stateTone, variant === "subtle" || variant === "metadata" ? "subtle" : "chip") : null;
  const surfaceStyle = getSurfaceStyle({ palette, variant, selected, disabled });

  const content = (
    <View style={[styles.base, sizeStyles[size], surfaceStyle, style]}>
      {iconSemanticName ? (
        <WaymarkIcon
          decorative
          semanticName={iconSemanticName}
          size={size === "compact" ? "xs" : "sm"}
          state={disabled ? "disabled" : selected ? "selected" : "default"}
        />
      ) : null}
      <WMText
        numberOfLines={1}
        style={[styles.label, size === "compact" ? styles.labelCompact : null, { color: surfaceStyle.color }, textStyle]}
        variant="chip"
      >
        {label}
      </WMText>
    </View>
  );

  if (!interactive) {
    return content;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => getWaymarkPressStyle({ pressed, reducedMotion, variant: "secondary" })}
    >
      {content}
    </Pressable>
  );
}

function getSurfaceStyle({
  palette,
  variant,
  selected,
  disabled,
}: {
  palette: ReturnType<typeof getSemanticStateToneStyle> | null;
  variant: EntityChipVariant;
  selected: boolean;
  disabled: boolean;
}) {
  if (disabled) {
    return {
      backgroundColor: entityChipTokens.color.disabledSurface,
      borderColor: entityChipTokens.color.disabledBorder,
      color: entityChipTokens.color.disabledText,
    };
  }

  if (palette) {
    return {
      backgroundColor: palette.bg,
      borderColor: palette.border,
      color: palette.text,
    };
  }

  if (selected || variant === "selected") {
    return {
      backgroundColor: entityChipTokens.color.selectedSurface,
      borderColor: entityChipTokens.color.selectedBorder,
      color: entityChipTokens.color.selectedText,
    };
  }

  if (variant === "warningSoft") {
    return {
      backgroundColor: entityChipTokens.color.warningSurface,
      borderColor: entityChipTokens.color.warningBorder,
      color: entityChipTokens.color.warningText,
    };
  }

  if (variant === "metadata" || variant === "subtle") {
    return {
      backgroundColor: "transparent",
      borderColor: entityChipTokens.color.border,
      color: entityChipTokens.color.text,
    };
  }

  return {
    backgroundColor: entityChipTokens.color.surface,
    borderColor: entityChipTokens.color.border,
    color: entityChipTokens.color.text,
  };
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: entityChipTokens.radius.default,
  },
  label: {
    flexShrink: 1,
  },
  labelCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
});

const sizeStyles = StyleSheet.create({
  standard: {
    minHeight: entityChipTokens.size.standard,
    gap: entityChipTokens.spacing.xCompact,
    paddingHorizontal: entityChipTokens.spacing.x,
    paddingVertical: entityChipTokens.spacing.yCompact,
  },
  compact: {
    minHeight: entityChipTokens.size.compact,
    gap: entityChipTokens.spacing.xCompact,
    paddingHorizontal: entityChipTokens.spacing.xCompact + 1,
    paddingVertical: 3,
  },
});
