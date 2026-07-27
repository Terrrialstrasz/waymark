import { ReactNode } from "react";
import { AccessibilityRole, ImageSourcePropType, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { WaymarkImageAssetId } from "../../assets/imageRegistry";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import {
  entityRowTokens,
  getSemanticStateToneStyle,
  getWaymarkPressStyle,
  SemanticState,
  spacing,
  useReducedMotionEnabled,
} from "../../theme/tokens";
import { EntityChip } from "./EntityChip";
import { IconBadge } from "./IconBadge";
import { WMText } from "./Text";
import { WaymarkIcon } from "./WaymarkIcon";
import { WaymarkImage } from "./WaymarkImage";

type EntityRowVariant = "standard" | "compact" | "withIcon" | "withImage" | "withMetadata" | "readOnly" | "actionable" | "grouped";

type Props = {
  title: string;
  subtitle?: string;
  metadata?: string;
  chipLabel?: string;
  chipStateTone?: Exclude<SemanticState, "hidden">;
  stateTone?: Exclude<SemanticState, "hidden">;
  leadingIconSemanticName?: WaymarkSemanticIconName;
  leading?: ReactNode;
  imageAssetId?: WaymarkImageAssetId;
  imageSource?: ImageSourcePropType;
  trailing?: ReactNode;
  variant?: EntityRowVariant;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  style?: ViewStyle;
};

export function EntityRow({
  title,
  subtitle,
  metadata,
  chipLabel,
  chipStateTone,
  stateTone,
  leadingIconSemanticName,
  leading,
  imageAssetId,
  imageSource,
  trailing,
  variant = "standard",
  disabled = false,
  loading = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  style,
}: Props) {
  const reducedMotion = useReducedMotionEnabled();
  const interactive = Boolean(onPress) && variant !== "readOnly" && !disabled;
  const statePalette = stateTone ? getSemanticStateToneStyle(stateTone, "subtle") : null;
  const hasLeading = Boolean(leading || imageAssetId || imageSource || leadingIconSemanticName);
  const trailingNode = trailing === undefined ? (interactive ? <WaymarkIcon decorative semanticName="utility.chevron" size="sm" state="muted" /> : null) : trailing;
  const hasTrailing = trailingNode !== null;

  const rowBody = (
    <View
      style={[
        styles.base,
        variant === "compact" ? styles.compact : null,
        {
          backgroundColor: statePalette?.bg ?? entityRowTokens.color.surface,
          borderColor: statePalette?.border ?? entityRowTokens.color.border,
          opacity: disabled ? 0.56 : loading ? 0.72 : 1,
        },
        style,
      ]}
    >
      {statePalette ? <View style={[styles.accent, { backgroundColor: statePalette.accent }]} /> : null}
      <View style={[styles.inner, variant === "compact" ? styles.innerCompact : null]}>
        {hasLeading ? (
          <View style={[styles.leading, variant === "compact" ? styles.leadingCompact : null]}>
            {leading ? (
              leading
            ) : imageAssetId || imageSource ? (
              <WaymarkImage
                alt={title}
                assetId={imageAssetId}
                imageStyle={styles.thumb}
                rounded
                src={imageSource}
                usage="compactCardBackground"
              />
            ) : leadingIconSemanticName ? (
              <IconBadge semanticName={leadingIconSemanticName} shape="rounded" size="sm" tone="warm" />
            ) : null}
          </View>
        ) : null}

        <View style={styles.copy}>
          <View style={styles.header}>
            <WMText numberOfLines={variant === "compact" ? 1 : 2} style={styles.title} variant={variant === "compact" ? "bodyStrong" : "body"}>
              {title}
            </WMText>
            {metadata ? (
              <WMText numberOfLines={1} style={styles.meta} variant="meta">
                {metadata}
              </WMText>
            ) : null}
          </View>
          {subtitle ? (
            <WMText numberOfLines={2} style={styles.subtitle} variant="bodySm">
              {subtitle}
            </WMText>
          ) : null}
          {chipLabel && chipStateTone ? <EntityChip label={chipLabel} stateTone={chipStateTone} variant="metadata" /> : null}
        </View>

        {hasTrailing ? <View style={styles.trailing}>{trailingNode}</View> : null}
      </View>
    </View>
  );

  if (!interactive) {
    return rowBody;
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole={accessibilityRole}
      onPress={onPress}
      style={({ pressed }) => getWaymarkPressStyle({ pressed, reducedMotion, variant: "row" })}
    >
      {rowBody}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: entityRowTokens.radius.default,
    overflow: "hidden",
  },
  compact: {
    minHeight: 48,
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: entityRowTokens.spacing.gap,
    paddingHorizontal: entityRowTokens.spacing.paddingX,
    paddingVertical: entityRowTokens.spacing.paddingY,
  },
  innerCompact: {
    gap: entityRowTokens.spacing.gapCompact,
    paddingHorizontal: spacing.sm,
    paddingVertical: entityRowTokens.spacing.paddingCompactY,
  },
  leading: {
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  leadingCompact: {
    minWidth: 36,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: entityRowTokens.spacing.gapCompact,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  title: {
    color: entityRowTokens.color.title,
    flex: 1,
  },
  subtitle: {
    color: entityRowTokens.color.subtitle,
  },
  meta: {
    color: entityRowTokens.color.meta,
  },
  trailing: {
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
