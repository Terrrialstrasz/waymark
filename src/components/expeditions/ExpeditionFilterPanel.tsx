import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { getPathsCopy } from "../../i18n/pathsCopy";
import { spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { JournalCard } from "../primitives/JournalCard";
import { WMSectionHeader } from "../primitives/WMSectionHeader";
import { EntityChip } from "../primitives/EntityChip";
import { ExpeditionFilterPathOption, ExpeditionFilterState, ExpeditionFilterTime } from "./types";

type Props = {
  locale: Locale;
  pathOptions: ExpeditionFilterPathOption[];
  selectedPathId: string;
  selectedTime: ExpeditionFilterTime;
  selectedStatus: ExpeditionFilterState;
  onSelectPath: (id: string) => void;
  onSelectTime: (value: ExpeditionFilterTime) => void;
  onSelectStatus: (value: ExpeditionFilterState) => void;
  onClear: () => void;
};

export function ExpeditionFilterPanel({
  locale,
  pathOptions,
  selectedPathId,
  selectedTime,
  selectedStatus,
  onSelectPath,
  onSelectTime,
  onSelectStatus,
  onClear,
}: Props) {
  const c = getPathsCopy(locale);

  const timeOptions: { id: ExpeditionFilterTime; label: string }[] = [
    { id: "all_time", label: c.filters.allTime },
    { id: "current", label: c.filters.current },
    { id: "upcoming", label: c.nextMarks.upcoming },
    { id: "completed", label: c.filters.completed },
  ];

  const statusOptions: { id: ExpeditionFilterState; label: string }[] = [
    { id: "all_status", label: c.filters.allStatus },
    { id: "active", label: c.expeditions.status.active },
    { id: "planned", label: c.expeditions.status.planned },
    { id: "upcoming", label: c.expeditions.status.upcoming },
    { id: "done", label: c.expeditions.status.done },
  ];

  return (
    <JournalCard style={styles.panel} variant="nested">
      <WMSectionHeader actionLabel={c.filters.clear} onAction={onClear} title={c.filters.title} />

      <FilterGroup title={c.filters.pathGroup}>
        <EntityChip label={c.filters.allPaths} onPress={() => onSelectPath("all_paths")} selected={selectedPathId === "all_paths"} variant="filter" />
        {pathOptions.map((option) => (
          <EntityChip
            key={option.id}
            label={t(option.label, locale)}
            onPress={() => onSelectPath(option.id)}
            selected={selectedPathId === option.id}
            variant="filter"
          />
        ))}
      </FilterGroup>

      <FilterGroup title={c.filters.timeGroup}>
        {timeOptions.map((option) => (
          <EntityChip key={option.id} label={option.label} onPress={() => onSelectTime(option.id)} selected={selectedTime === option.id} variant="filter" />
        ))}
      </FilterGroup>

      <FilterGroup title={c.filters.statusGroup}>
        {statusOptions.map((option) => (
          <EntityChip
            key={option.id}
            label={option.label}
            onPress={() => onSelectStatus(option.id)}
            selected={selectedStatus === option.id}
            variant="filter"
          />
        ))}
      </FilterGroup>
    </JournalCard>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View accessibilityRole="summary" style={styles.group}>
      <EntityChip label={title} variant="metadata" />
      <View style={styles.options}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.md,
  },
  group: {
    gap: spacing.xs,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
