import { Pressable, StyleSheet, View } from "react-native";
import { ReactNode } from "react";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { metadataListTokens, spacing } from "../../theme/tokens";
import { Divider } from "./Divider";
import { WaymarkIcon } from "./WaymarkIcon";
import { WMText } from "./Text";

type MetadataListVariant = "labelValue" | "iconValue" | "compact" | "stacked" | "inline" | "insideCard";

export type MetadataItem = {
  id: string;
  label?: string;
  value?: string;
  iconSemanticName?: WaymarkSemanticIconName;
  leading?: ReactNode;
  hidden?: boolean;
  warning?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

type Props = {
  items: MetadataItem[];
  variant?: MetadataListVariant;
  showDividers?: boolean;
};

export function MetadataList({ items, variant = "labelValue", showDividers = false }: Props) {
  const visibleItems = items.filter((item) => !item.hidden && (item.label || item.value || item.leading));

  return (
    <View style={[styles.stack, variant === "inline" ? styles.inline : null, variant === "compact" ? styles.compact : null]}>
      {visibleItems.map((item, index) => {
        const primaryValue = item.value ?? item.label ?? "";
        const showSecondaryLabel = Boolean(item.label && item.value);
        const row = (
          <View key={item.id} style={[styles.row, variant === "stacked" ? styles.stacked : null, variant === "inline" ? styles.inlineRow : null]}>
            {item.leading ? (
              item.leading
            ) : item.iconSemanticName ? (
              <WaymarkIcon decorative semanticName={item.iconSemanticName} size="sm" state={item.warning ? "active" : "muted"} />
            ) : null}
            {showSecondaryLabel ? (
              <WMText style={item.warning ? { color: metadataListTokens.color.warning } : styles.label} variant="meta">
                {item.label}
              </WMText>
            ) : null}
            <WMText style={styles.value} variant={variant === "compact" ? "meta" : "bodySm"}>
              {primaryValue}
            </WMText>
          </View>
        );

        return (
          <View key={item.id}>
            {item.onPress ? (
              <Pressable accessibilityLabel={item.accessibilityLabel ?? [item.label, item.value].filter(Boolean).join(": ")} onPress={item.onPress}>
                {row}
              </Pressable>
            ) : (
              row
            )}
            {showDividers && index < visibleItems.length - 1 ? <Divider insetStart={item.iconSemanticName ? 24 : 0} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: metadataListTokens.spacing.rowGap,
  },
  compact: {
    gap: metadataListTokens.spacing.compactRowGap,
  },
  inline: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: metadataListTokens.spacing.inlineGap,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  stacked: {
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  inlineRow: {
    flexShrink: 1,
  },
  label: {
    color: metadataListTokens.color.label,
  },
  value: {
    color: metadataListTokens.color.value,
    flexShrink: 1,
  },
});
