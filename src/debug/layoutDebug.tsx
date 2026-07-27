import { PropsWithChildren } from "react";
import { LayoutChangeEvent, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

export const DEBUG_LAYOUT_CARD_STACK = false;
export const DEBUG_LAYOUT = DEBUG_LAYOUT_CARD_STACK;
export const DEBUG_LAYOUT_VERSION = "layout-debug-2026-06-02-11-07";

type DebugLayerBoxProps = PropsWithChildren<{
  label: string;
  lines?: string[];
  style?: StyleProp<ViewStyle>;
  itemCount?: number;
  tone?: "red" | "blue" | "green" | "amber" | "purple";
}>;

type DebugBannerProps = {
  label: string;
  lines?: string[];
};

const toneMap: Record<NonNullable<DebugLayerBoxProps["tone"]>, { border: string; background: string }> = {
  red: { border: "#C53B2A", background: "rgba(197,59,42,0.12)" },
  blue: { border: "#1D5FA7", background: "rgba(29,95,167,0.12)" },
  green: { border: "#2D7D46", background: "rgba(45,125,70,0.12)" },
  amber: { border: "#AA6B00", background: "rgba(170,107,0,0.12)" },
  purple: { border: "#6F43B6", background: "rgba(111,67,182,0.12)" },
};

export function DebugBanner({ label, lines = [] }: DebugBannerProps) {
  if (!DEBUG_LAYOUT) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerTitle}>{label}</Text>
      <Text style={styles.bannerMeta}>{DEBUG_LAYOUT_VERSION}</Text>
      {lines.map((line) => (
        <Text key={`${label}-${line}`} style={styles.bannerLine}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export function DebugLayerBox({
  children,
  label,
  lines = [],
  style,
  itemCount,
  tone = "red",
}: DebugLayerBoxProps) {
  if (!DEBUG_LAYOUT) {
    return <>{children}</>;
  }

  const colors = toneMap[tone];

  const handleLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    console.warn(`[LayoutDebug] ${label}`, {
      x,
      y,
      width,
      height,
      itemCount,
    });
  };

  return (
    <View onLayout={handleLayout} style={style}>
      <View pointerEvents="none" style={[styles.overlay, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <View style={[styles.tag, { borderColor: colors.border }]}>
          <Text style={styles.tagTitle}>{`LAYER: ${label}`}</Text>
          {typeof itemCount === "number" ? <Text style={styles.tagLine}>{`items=${itemCount}`}</Text> : null}
          {lines.map((line) => (
            <Text key={`${label}-${line}`} style={styles.tagLine}>
              {line}
            </Text>
          ))}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 2,
    borderColor: "#C53B2A",
    backgroundColor: "#FFF4E7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bannerTitle: {
    color: "#7A1E13",
    fontSize: 13,
    fontWeight: "800",
  },
  bannerMeta: {
    color: "#7A1E13",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  bannerLine: {
    color: "#3D2A1E",
    fontSize: 11,
    marginTop: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderStyle: "dashed",
    zIndex: 9999,
  },
  tag: {
    alignSelf: "flex-start",
    margin: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.96)",
    maxWidth: "92%",
  },
  tagTitle: {
    color: "#23170F",
    fontSize: 10,
    fontWeight: "800",
  },
  tagLine: {
    color: "#3D2A1E",
    fontSize: 10,
    marginTop: 1,
  },
});
