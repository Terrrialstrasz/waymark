import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { foundationColors, radius, spacing } from "../theme/tokens";
import { WMCard } from "../components/primitives/WMCard";
import { WMText } from "../components/primitives/Text";

export function BoardSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <WMCard>
      <WMText variant="cardTitle">{title}</WMText>
      {subtitle ? (
        <WMText style={styles.subtitle} variant="body">
          {subtitle}
        </WMText>
      ) : null}
      <View style={styles.stack}>{children}</View>
    </WMCard>
  );
}

export function TokenSwatch({
  label,
  token,
  value,
  textColor,
  borderColor,
}: {
  label: string;
  token: string;
  value: string;
  textColor?: string;
  borderColor?: string;
}) {
  return (
    <View style={styles.swatchRow}>
      <View
        style={[
          styles.swatch,
          {
            backgroundColor: value,
            borderColor: borderColor ?? foundationColors.border.soft,
          },
        ]}
      />
      <View style={styles.swatchCopy}>
        <WMText variant="bodyStrong">{label}</WMText>
        <WMText style={textColor ? { color: textColor } : null} variant="meta">
          {token}
        </WMText>
        <WMText style={textColor ? { color: textColor } : null} variant="meta">
          {value}
        </WMText>
      </View>
    </View>
  );
}

export function TokenGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function PreviewPill({
  label,
  backgroundColor,
  color,
  borderColor,
}: {
  label: string;
  backgroundColor: string;
  color: string;
  borderColor: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor, borderColor }]}>
      <WMText style={{ color }} variant="chip">
        {label}
      </WMText>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
  },
  grid: {
    gap: spacing.sm,
  },
  swatchRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  swatchCopy: {
    flex: 1,
    gap: 2,
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
});
