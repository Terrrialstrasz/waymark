import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { WMText } from "../primitives/Text";
import { Locale } from "../../types/ui";
import { foundationColors, spacing } from "../../theme/tokens";
import { BacklogEmptyState } from "./BacklogEmptyState";
import { BacklogFilterSheet } from "./BacklogFilterSheet";
import { BacklogHeader } from "./BacklogHeader";
import { BacklogHorizontalItemCard } from "./BacklogHorizontalItemCard";
import { BacklogInlineActionMenu } from "./BacklogInlineActionMenu";
import { BacklogSearchFilterBar } from "./BacklogSearchFilterBar";
import {
  BacklogFeatureFlags,
  BacklogFilterValue,
  BacklogItemViewModel,
  BacklogMenuAnchor,
  getBacklogCountLabel,
  matchesBacklogQuery,
} from "./types";

export interface BacklogTemplateProps {
  items: BacklogItemViewModel[];
  locale?: Locale;
  selectedFilter?: BacklogFilterValue;
  query?: string;
  onBack?: () => void;
  onOpenMore?: () => void;
  onQueryChange?: (query: string) => void;
  onFilterChange?: (filter: BacklogFilterValue) => void;
  onOpenBacklogItem?: (itemId: string) => void;
  onDeleteBacklogItem?: (itemId: string) => void;
  onCreateMarkFromBacklog?: (itemId: string) => void;
  featureFlags?: BacklogFeatureFlags;
}

type OpenMenuState = {
  item: BacklogItemViewModel;
  anchor: BacklogMenuAnchor;
};

export function BacklogTemplate({
  items,
  locale = "en",
  selectedFilter = "all",
  query = "",
  onBack,
  onOpenMore,
  onQueryChange,
  onFilterChange,
  onOpenBacklogItem,
  onDeleteBacklogItem,
  onCreateMarkFromBacklog,
  featureFlags,
}: BacklogTemplateProps) {
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenuState | null>(null);
  const normalizedQuery = query.trim();

  const visibleItems = items.filter((item) => {
    const filterMatch = selectedFilter === "all" ? true : item.type === selectedFilter;
    const queryMatch = matchesBacklogQuery(locale, item, normalizedQuery);
    return filterMatch && queryMatch;
  });

  const isQueryActive = normalizedQuery.length > 0;
  const isFilterActive = selectedFilter !== "all";
  const hasResetView = isQueryActive || isFilterActive;
  const availableActionCount = Number(Boolean(featureFlags?.canDeleteBacklogItem && onDeleteBacklogItem))
    + Number(Boolean(featureFlags?.canCreateMarkFromBacklog && onCreateMarkFromBacklog));
  const showEmptyState = visibleItems.length === 0;
  const emptyMode = items.length === 0 ? "trueEmpty" : isQueryActive ? "searchEmpty" : "filterEmpty";

  return (
    <View style={styles.root}>
      <FieldJournalScreenShell botanicalAmbient variant="navAware">
        <BacklogHeader locale={locale} onBack={onBack} onOpenMore={onOpenMore} />

        <BacklogSearchFilterBar
          locale={locale}
          onOpenFilter={() => {
            setOpenMenu(null);
            setFilterSheetVisible(true);
          }}
          onQueryChange={onQueryChange}
          query={query}
          selectedFilter={selectedFilter}
        />

        <WMText style={styles.countText} variant="meta">
          {getBacklogCountLabel(locale, visibleItems.length)}
        </WMText>

        {showEmptyState ? (
          <BacklogEmptyState
            canReset={hasResetView}
            locale={locale}
            mode={emptyMode}
            onResetView={
              hasResetView
                ? () => {
                    onQueryChange?.("");
                    onFilterChange?.("all");
                  }
                : undefined
            }
            selectedFilter={selectedFilter}
          />
        ) : (
          <View style={styles.list}>
            {visibleItems.map((item) => (
              <BacklogHorizontalItemCard
                canOpen={Boolean(featureFlags?.hasBacklogDetail && onOpenBacklogItem)}
                hasActions={availableActionCount > 0}
                item={item}
                key={item.id}
                locale={locale}
                onOpenActionMenu={(menuItem, anchor) => {
                  setOpenMenu((current) =>
                    current?.item.id === menuItem.id
                      ? null
                      : {
                          item: menuItem,
                          anchor,
                        }
                  );
                }}
                onPress={onOpenBacklogItem}
              />
            ))}
          </View>
        )}
      </FieldJournalScreenShell>

      <BacklogFilterSheet
        locale={locale}
        onClose={() => setFilterSheetVisible(false)}
        onSelectFilter={(filter) => {
          setOpenMenu(null);
          onFilterChange?.(filter);
        }}
        selectedFilter={selectedFilter}
        visible={filterSheetVisible}
      />

      <BacklogInlineActionMenu
        anchor={openMenu?.anchor}
        canCreateMarkFromBacklog={featureFlags?.canCreateMarkFromBacklog}
        canDeleteBacklogItem={featureFlags?.canDeleteBacklogItem}
        item={openMenu?.item}
        locale={locale}
        onClose={() => setOpenMenu(null)}
        onCreateMarkFromBacklog={onCreateMarkFromBacklog}
        onDeleteBacklogItem={onDeleteBacklogItem}
        visible={Boolean(openMenu)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: foundationColors.bg.app,
  },
  countText: {
    color: foundationColors.ink.secondary,
  },
  list: {
    gap: spacing.md,
  },
});
