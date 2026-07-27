import { StyleSheet, View } from "react-native";
import { PathSkin } from "../../tokens/pathVisualTokens";
import { foundationColors, spacing } from "../../theme/tokens";
import { MarkDetailExpeditionItem } from "../mark-detail/model";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";
import { PathAccentBadge } from "./PathAccentBadge";
import { ContainerLinkRow } from "./ContainerLinkRow";

type Props = {
  title: string;
  entityLabel: string;
  items: MarkDetailExpeditionItem[];
  pathSkin: PathSkin;
  accessibilityHint?: string;
};

export function ContainerLinkList({ title, entityLabel, items, pathSkin, accessibilityHint }: Props) {
  const visibleItems = items.filter((item) => item.gate !== "hidden");

  if (!visibleItems.length) {
    return null;
  }

  return (
    <JournalCard preserveSurfaceColorOnPress variant="standard">
      <View style={styles.header}>
        <PathAccentBadge semanticName="entity.expedition" size="sectionIcon" skin={pathSkin} />
        <WMText numberOfLines={1} style={styles.title} variant="sectionTitle">
          {title}
        </WMText>
      </View>
      <View style={styles.stack}>
        {visibleItems.map((item) => (
          <ContainerLinkRow
            accessibilityHint={accessibilityHint}
            entityLabel={entityLabel}
            item={item}
            key={item.id}
            pathSkin={pathSkin}
          />
        ))}
      </View>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  stack: {
    gap: spacing.sm,
  },
});
