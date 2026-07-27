import { StyleSheet, View } from "react-native";
import { segmentProgressTokens, spacing } from "../../theme/tokens";
import { WMText } from "./Text";

type SegmentProgressVariant = "dots" | "bars" | "compact" | "withLabel" | "withoutLabel" | "expedition" | "session";

type Props = {
  total: number;
  completed: number;
  currentIndex?: number;
  label?: string;
  variant?: SegmentProgressVariant;
};

export function SegmentProgress({ total, completed, currentIndex, label, variant = "bars" }: Props) {
  const segments = Array.from({ length: total }, (_, index) => {
    const position = index + 1;
    const state = position <= completed ? "done" : position === currentIndex ? "current" : "remaining";
    return { position, state };
  });

  return (
    <View style={styles.stack}>
      {variant === "withLabel" && label ? (
        <WMText style={styles.label} variant="meta">
          {label}
        </WMText>
      ) : null}
      <View style={styles.row}>
        {segments.map((segment) => (
          <View
            key={segment.position}
            style={[
              variant === "dots" ? styles.dot : variant === "compact" ? styles.compactBar : styles.bar,
              {
                backgroundColor:
                  segment.state === "done"
                    ? segmentProgressTokens.color.done
                    : segment.state === "current"
                      ? segmentProgressTokens.color.current
                      : segmentProgressTokens.color.remaining,
                borderColor: segment.state === "remaining" ? segmentProgressTokens.color.track : "transparent",
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.xs,
  },
  label: {
    color: segmentProgressTokens.color.label,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: segmentProgressTokens.spacing.gap,
  },
  dot: {
    width: segmentProgressTokens.size.dot,
    height: segmentProgressTokens.size.dot,
    borderRadius: segmentProgressTokens.radius.segment,
    borderWidth: 1,
  },
  bar: {
    width: segmentProgressTokens.size.barWidth,
    height: segmentProgressTokens.size.barHeight,
    borderRadius: segmentProgressTokens.radius.segment,
    borderWidth: 1,
  },
  compactBar: {
    width: segmentProgressTokens.size.compactBarWidth,
    height: segmentProgressTokens.size.barHeight,
    borderRadius: segmentProgressTokens.radius.segment,
    borderWidth: 1,
  },
});
