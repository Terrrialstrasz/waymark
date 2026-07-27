import { StyleSheet, View } from "react-native";
import { colors, spacing } from "../../theme/tokens";
import { WMText } from "./Text";
import { BotanicalDecorationLayer } from "./BotanicalDecorationLayer";

type Props = {
  title: string;
  body: string;
};

export function WMEmptyState({ title, body }: Props) {
  return (
    <BotanicalDecorationLayer preset="emptyState">
      <View style={styles.wrap}>
        <WMText variant="sectionTitle">{title}</WMText>
        <WMText style={styles.body} variant="body">
          {body}
        </WMText>
      </View>
    </BotanicalDecorationLayer>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  body: {
    textAlign: "center",
    color: colors.textMuted,
  },
});
