import { Pressable, StyleSheet, View } from "react-native";
import { Locale } from "../../types/ui";
import { controlTokens, inputTokens, semanticElevation, semanticRadius, spacing } from "../../theme/tokens";
import { SearchBar } from "../primitives/SearchBar";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { getCopy } from "../../i18n/copy";
import { BacklogFilterValue } from "./types";

type Props = {
  locale: Locale;
  query: string;
  selectedFilter?: BacklogFilterValue;
  onQueryChange?: (query: string) => void;
  onOpenFilter?: () => void;
};

export function BacklogSearchFilterBar({
  locale,
  query,
  selectedFilter = "all",
  onQueryChange,
  onOpenFilter,
}: Props) {
  const backlog = getCopy(locale).backlog;
  const filterActive = selectedFilter !== "all";

  return (
    <View style={styles.row}>
      <View style={styles.searchWrap}>
        <SearchBar
          accessibilityLabel={backlog.accessibility.search}
          onChangeText={onQueryChange ?? (() => undefined)}
          placeholder={backlog.searchPlaceholder}
          value={query}
          variant="compact"
        />
      </View>

      <Pressable
        accessibilityLabel={backlog.accessibility.filter}
        accessibilityRole="button"
        onPress={onOpenFilter}
        style={({ pressed }) => [
          styles.filterButton,
          {
            backgroundColor: filterActive ? controlTokens.color.selected : inputTokens.color.surface,
            borderColor: filterActive ? controlTokens.color.selectedBorder : inputTokens.color.border,
            boxShadow: pressed ? semanticElevation.pressed : semanticElevation.flat,
          },
        ]}
      >
        <WMText
          style={{ color: filterActive ? controlTokens.color.selectedText : controlTokens.color.text }}
          variant="bodyStrong"
        >
          {backlog.filter.label}
        </WMText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchWrap: {
    flex: 1,
    minWidth: 0,
  },
  filterButton: {
    minHeight: 44,
    minWidth: 104,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: semanticRadius.button.default,
    ...getBorderStyle("1px solid transparent"),
  },
});
