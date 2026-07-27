import { Pressable, StyleSheet, View } from "react-native";
import { getPathsCopy } from "../../i18n/pathsCopy";
import { foundationColors, getWaymarkPressStyle, spacing, useReducedMotionEnabled } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { InsightCard } from "../primitives/InsightCard";
import { BottomNavBar } from "../primitives/BottomNavBar";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { SearchBar } from "../primitives/SearchBar";
import { WMText } from "../primitives/Text";
import { WMEmptyState } from "../primitives/WMEmptyState";
import { ExpeditionFilterPanel } from "./ExpeditionFilterPanel";
import { ExpeditionFilterPathOption, ExpeditionFilterState, ExpeditionFilterTime, PathExpeditionItem } from "./types";
import { PathExpeditionCard } from "./PathExpeditionCard";

type Props = {
  locale: Locale;
  items: PathExpeditionItem[];
  searchValue: string;
  onSearchChange?: (value: string) => void;
  isSearchFunctional?: boolean;
  filterPanelOpen: boolean;
  selectedPathId: string;
  selectedTime: ExpeditionFilterTime;
  selectedStatus: ExpeditionFilterState;
  pathOptions: ExpeditionFilterPathOption[];
  onToggleFilterPanel: () => void;
  onSelectPath: (id: string) => void;
  onSelectTime: (value: ExpeditionFilterTime) => void;
  onSelectStatus: (value: ExpeditionFilterState) => void;
  onClearFilters: () => void;
  onOpenExpedition?: (item: PathExpeditionItem) => void;
  showBottomNote?: boolean;
};

export function ExpeditionsTemplate({
  locale,
  items,
  searchValue,
  onSearchChange,
  isSearchFunctional = true,
  filterPanelOpen,
  selectedPathId,
  selectedTime,
  selectedStatus,
  pathOptions,
  onToggleFilterPanel,
  onSelectPath,
  onSelectTime,
  onSelectStatus,
  onClearFilters,
  onOpenExpedition,
  showBottomNote = true,
}: Props) {
  const c = getPathsCopy(locale);
  const reducedMotion = useReducedMotionEnabled();
  const activeFilterCount = [
    selectedPathId !== "all_paths",
    selectedTime !== "all_time",
    selectedStatus !== "all_status",
  ].filter(Boolean).length;

  return (
    <FieldJournalScreenShell variant="navAware">
      <PageHeader subtitle={c.expeditions.subtitle} title={c.expeditions.title} />

      <SearchBar
        accessibilityLabel={c.expeditions.searchA11y}
        disabled={!isSearchFunctional}
        onChangeText={onSearchChange ?? (() => undefined)}
        placeholder={c.expeditions.searchPlaceholder}
        value={searchValue}
      />

      <Pressable
        accessibilityLabel={activeFilterCount ? c.common.filterCount(activeFilterCount) : c.expeditions.filterButton}
        accessibilityRole="button"
        accessibilityState={{ expanded: filterPanelOpen }}
        onPress={onToggleFilterPanel}
        style={({ pressed }) => [
          styles.filterButton,
          (filterPanelOpen || activeFilterCount) ? styles.filterButtonActive : null,
          getWaymarkPressStyle({ pressed, reducedMotion, variant: "secondary" }),
        ]}
      >
        <WMText variant="bodyStrong">
          {activeFilterCount ? c.common.filterCount(activeFilterCount) : c.expeditions.filterButton}
        </WMText>
      </Pressable>

      {filterPanelOpen ? (
        <ExpeditionFilterPanel
          locale={locale}
          onClear={onClearFilters}
          onSelectPath={onSelectPath}
          onSelectStatus={onSelectStatus}
          onSelectTime={onSelectTime}
          pathOptions={pathOptions}
          selectedPathId={selectedPathId}
          selectedStatus={selectedStatus}
          selectedTime={selectedTime}
        />
      ) : null}

      {activeFilterCount > 0 && !filterPanelOpen ? (
        <WMText style={styles.filteredSummary} variant="meta">
          {c.common.filteredResultCount(items.length)}
        </WMText>
      ) : null}

      <View style={styles.list}>
        {items.length ? (
          items.map((item) => <PathExpeditionCard key={item.id} item={item} locale={locale} onPress={onOpenExpedition} />)
        ) : (
          <WMEmptyState body={c.expeditions.emptyBody} title={c.expeditions.emptyTitle} />
        )}
      </View>

      {showBottomNote ? <InsightCard body={c.expeditions.noteBody} title={c.expeditions.noteTitle} /> : null}

      <BottomNavBar activeTab="paths" locale={locale} />
    </FieldJournalScreenShell>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    backgroundColor: foundationColors.bg.paperWarm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  filterButtonActive: {
    backgroundColor: foundationColors.green.soft,
    borderColor: foundationColors.border.active,
  },
  filteredSummary: {
    color: foundationColors.ink.secondary,
  },
  list: {
    gap: spacing.sm,
  },
});
