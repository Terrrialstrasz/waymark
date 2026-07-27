import { ReactNode, useMemo, useState } from "react";
import { LayoutChangeEvent, ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { spacing } from "../../theme/tokens";

type Props = {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
  itemGap?: number;
  snap?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
};

export function FieldJournalCarouselRail({
  children,
  ariaLabel,
  itemGap = spacing.md,
  snap = true,
  style,
  contentContainerStyle,
}: Props) {
  const childArray = useMemo(() => (Array.isArray(children) ? children : [children]).filter(Boolean), [children]);
  const [snapOffsets, setSnapOffsets] = useState<number[]>([]);

  const updateOffset = (index: number, event: LayoutChangeEvent) => {
    const nextOffset = event.nativeEvent.layout.x;
    setSnapOffsets((current) => {
      if (current[index] === nextOffset) {
        return current;
      }

      const next = [...current];
      next[index] = nextOffset;
      return next;
    });
  };

  return (
    <View style={[styles.frame, style]}>
      <ScrollView
        accessibilityLabel={ariaLabel}
        contentContainerStyle={[
          styles.content,
          {
            columnGap: itemGap,
            paddingRight: spacing.xxxl,
          },
          contentContainerStyle,
        ]}
        decelerationRate={snap ? "fast" : "normal"}
        directionalLockEnabled
        horizontal
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToOffsets={snap && snapOffsets.length === childArray.length ? snapOffsets : undefined}
      >
        {childArray.map((child, index) => (
          <View key={index} onLayout={(event) => updateOffset(index, event)} style={styles.item}>
            {child}
          </View>
        ))}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "relative",
  },
  content: {
    paddingLeft: 0,
  },
  item: {
    flexShrink: 0,
  },
});
