import { Children, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { foundationColors, spacing } from "../../theme/tokens";
import { Divider } from "../primitives/Divider";
import { IconBadge } from "../primitives/IconBadge";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function SettingsGroupCard({ title, subtitle, children }: Props) {
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <JournalCard decorative decorationPreset="journalCard" preserveSurfaceColorOnPress variant="standard">
      <View style={styles.header}>
        <View style={styles.copy}>
          <WMText numberOfLines={2} style={styles.title} variant="cardTitle">
            {title}
          </WMText>
          <WMText numberOfLines={2} style={styles.subtitle} variant="bodySm">
            {subtitle}
          </WMText>
        </View>
        <IconBadge semanticName="utility.more" shape="seal" size="sm" tone="warm" />
      </View>

      <View style={styles.rows}>
        {rows.map((row, index) => (
          <View key={index}>
            {index > 0 ? <Divider variant="soft" /> : null}
            {row}
          </View>
        ))}
      </View>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
  },
  rows: {
    gap: 0,
  },
});
