import { StyleSheet } from "react-native";
import { foundationColors } from "../../theme/tokens";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";

type Props = {
  title: string;
  body: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  reducedMotion?: boolean;
};

export function WaymarkPrincipleCard({ title, body, onPress, accessibilityLabel, reducedMotion }: Props) {
  return (
    <JournalCard
      accessibilityLabel={accessibilityLabel ?? title}
      actionable={Boolean(onPress)}
      decorative
      decorationPreset="journalCard"
      onPress={onPress}
      preserveSurfaceColorOnPress
      reducedMotion={reducedMotion}
      variant="readOnly"
    >
      <WMText numberOfLines={2} style={styles.title} variant="sectionTitle">
        {title}
      </WMText>
      <WMText style={styles.body} variant="bodySm">
        {body}
      </WMText>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: foundationColors.ink.primary,
  },
  body: {
    color: foundationColors.ink.secondary,
  },
});
