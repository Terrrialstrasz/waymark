import { ScrollView, StyleSheet, View } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { spacing } from "../../theme/tokens";
import { EntityChip } from "./EntityChip";

type FilterChipGroupVariant = "singleSelect" | "multiSelect" | "wrap" | "scroll" | "compact" | "insideCard";

type FilterChipItem = {
  id: string;
  label: string;
  iconSemanticName?: WaymarkSemanticIconName;
  disabled?: boolean;
};

type Props = {
  items: FilterChipItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  variant?: FilterChipGroupVariant;
};

export function FilterChipGroup({ items, selectedIds, onToggle, variant = "wrap" }: Props) {
  const content = (
    <View style={[styles.row, variant === "compact" ? styles.compactRow : null]}>
      {items.map((item) => (
        <EntityChip
          key={item.id}
          disabled={item.disabled}
          iconSemanticName={item.iconSemanticName}
          label={item.label}
          onPress={() => onToggle(item.id)}
          selected={selectedIds.includes(item.id)}
          variant="filter"
        />
      ))}
    </View>
  );

  if (variant === "scroll") {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {content}
      </ScrollView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  compactRow: {
    gap: spacing.xs,
  },
});
