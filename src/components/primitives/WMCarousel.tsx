import { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { spacing } from "../../theme/tokens";

type Props = {
  children: ReactNode;
};

export function WMCarousel({ children }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.row}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
});
