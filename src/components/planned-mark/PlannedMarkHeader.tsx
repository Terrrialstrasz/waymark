import { StyleSheet, View } from "react-native";
import { IconBadge } from "../primitives/IconBadge";
import { WMText } from "../primitives/Text";
import { foundationColors, spacing, typography } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { getCopy } from "../../i18n/copy";

type Props = {
  title: string;
  onClose: () => void;
  locale: Locale;
};

export function PlannedMarkHeader({ title, onClose, locale }: Props) {
  const copy = getCopy(locale);

  return (
    <View style={styles.topRow}>
      <WMText numberOfLines={2} style={styles.title} variant="pageTitle">
        {title}
      </WMText>
      <IconBadge
        accessibilityLabel={copy.plannedMarkAction.close}
        decorative={false}
        onPress={onClose}
        semanticName="utility.close"
        shape="rounded"
        size="lg"
        tone="warm"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    ...typography.pageTitle,
    color: foundationColors.ink.primary,
    fontSize: 24,
    lineHeight: 30,
    textAlign: "left",
    flex: 1,
  },
});
