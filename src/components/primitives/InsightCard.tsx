import { StyleSheet } from "react-native";
import { colors } from "../../theme/tokens";
import { WMCard } from "./WMCard";
import { WMText } from "./Text";

type Props = {
  title: string;
  body: string;
};

export function InsightCard({ title, body }: Props) {
  return (
    <WMCard tint="gold">
      <WMText variant="cardTitle">{title}</WMText>
      <WMText style={styles.body} variant="body">
        {body}
      </WMText>
    </WMCard>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textMuted,
  },
});
