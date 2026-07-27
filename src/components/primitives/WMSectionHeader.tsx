import { Pressable, StyleSheet, View } from "react-native";
import { spacing } from "../../theme/tokens";
import { WMText } from "./Text";
import { BotanicalDecorationLayer } from "./BotanicalDecorationLayer";

type Props = {
  title: string;
  actionLabel?: string;
  actionHidden?: boolean;
  onAction?: () => void;
};

export function WMSectionHeader({ title, actionLabel, actionHidden, onAction }: Props) {
  return (
    <BotanicalDecorationLayer preset="sectionHeader">
      <View style={styles.row}>
        <WMText variant="sectionTitle" numberOfLines={1}>
          {title}
        </WMText>
        {!actionHidden && actionLabel ? (
          <Pressable onPress={onAction}>
            <WMText variant="label">{actionLabel}</WMText>
          </Pressable>
        ) : null}
      </View>
    </BotanicalDecorationLayer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
});
