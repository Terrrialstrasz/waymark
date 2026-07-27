import { Pressable, StyleSheet, View } from "react-native";
import { Locale } from "../../types/ui";
import { foundationColors, semanticBorder, spacing } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { getCopy } from "../../i18n/copy";
import { WMSheet } from "../primitives/WMSheet";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { BacklogFilterValue, getBacklogFilterLabel } from "./types";

type Props = {
  visible: boolean;
  locale: Locale;
  selectedFilter: BacklogFilterValue;
  onClose: () => void;
  onSelectFilter?: (filter: BacklogFilterValue) => void;
};

const filterOptions: BacklogFilterValue[] = ["all", "idea", "plan", "mark"];

export function BacklogFilterSheet({
  visible,
  locale,
  selectedFilter,
  onClose,
  onSelectFilter,
}: Props) {
  const backlog = getCopy(locale).backlog;

  return (
    <WMSheet onClose={onClose} title={backlog.filter.label} visible={visible}>
      <View style={styles.stack}>
        {filterOptions.map((filter, index) => {
          const selected = filter === selectedFilter;

          return (
            <Pressable
              accessibilityLabel={getBacklogFilterLabel(locale, filter)}
              accessibilityRole="button"
              key={filter}
              onPress={() => {
                onSelectFilter?.(filter);
                onClose();
              }}
              style={({ pressed }) => [
                styles.row,
                index < filterOptions.length - 1 ? styles.rowBorder : null,
                pressed ? styles.rowPressed : null,
              ]}
            >
              <WMText style={selected ? styles.rowLabelSelected : null} variant="body">
                {getBacklogFilterLabel(locale, filter)}
              </WMText>
              <View style={styles.trailing}>
                {selected ? <WaymarkIcon decorative semanticName="status.done" size="sm" state="active" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </WMSheet>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 0,
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowBorder: {
    ...getBorderStyle(semanticBorder.divider.subtle, "bottom"),
  },
  rowPressed: {
    backgroundColor: foundationColors.bg.paperWarm,
  },
  rowLabelSelected: {
    color: foundationColors.green.deep,
  },
  trailing: {
    width: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
