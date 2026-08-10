import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { Locale } from "../types/ui";
import {
  BacklogFilterSheet,
  BacklogHorizontalItemCard,
  BacklogInlineActionMenu,
  BacklogItemViewModel,
  BacklogMetadataChip,
  BacklogSearchFilterBar,
  BacklogTemplate,
} from "../components/backlog";
import { spacing } from "../theme/tokens";

type Props = {
  locale: Locale;
};

export function BacklogBoard({ locale }: Props) {
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "idea" | "plan" | "mark">("all");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const baseItems = useMemo<BacklogItemViewModel[]>(
    () => [
      {
        id: "idea-rust",
        title: "Learn Rust",
        subtitle: "Explore systems programming without forcing it into Today.",
        type: "idea",
        horizonTone: "near",
        horizonLabel: locale === "vi" ? "Tuan nay" : "This week",
      },
      {
        id: "plan-trip",
        title: "Hiking in Patagonia with a very long planning title that still needs to truncate cleanly",
        subtitle: "Plan a multi-day route and protect some quiet margin for recovery.",
        type: "plan",
        horizonTone: "next",
        horizonLabel: locale === "vi" ? "Thang toi" : "Next month",
      },
      {
        id: "mark-book",
        title: locale === "vi" ? "Doc lai Atomic Habits va ghi chu then chot de ung dung cham" : "Revisit Atomic Habits",
        subtitle: locale === "vi" ? "Ghi lai nhung dau moc nho truoc khi dua vao Today." : "Keep a quiet mark for later proof.",
        type: "mark",
        horizonTone: "later",
        horizonLabel: locale === "vi" ? "Quy 3" : "Q3",
      },
      {
        id: "idea-blog",
        title: locale === "vi" ? "Bat dau mot blog song cham va co y thuc voi tieu de dai hon de test layout" : "Start a slower life blog with a deliberately long title",
        subtitle: locale === "vi" ? "Viet ve hoc, xay dung, va cach song chu tam hon." : "Write about learning and living intentionally.",
        type: "idea",
        horizonTone: "someday",
        horizonLabel: locale === "vi" ? "Mot ngay nao do" : "Someday",
      },
    ],
    [locale]
  );
  const menuItem = baseItems[1];

  return (
    <View style={styles.stack}>
      <BoardSection
        title="BacklogTemplate"
        subtitle="Default list, long EN/VI text, nav-aware shell, inline menu, and no local floating add button."
      >
        <BacklogTemplate
          featureFlags={{
            canCreateMarkFromBacklog: true,
            canDeleteBacklogItem: true,
            hasBacklogDetail: true,
          }}
          items={baseItems}
          locale={locale}
          onBack={() => Alert.alert("Back", "Backlog")}
          onCreateMarkFromBacklog={(itemId) => Alert.alert("Create mark", itemId)}
          onDeleteBacklogItem={(itemId) => Alert.alert("Delete", itemId)}
          onFilterChange={setSelectedFilter}
          onOpenBacklogItem={(itemId) => Alert.alert("Open backlog item", itemId)}
          onOpenMore={() => Alert.alert("More", "Backlog")}
          onQueryChange={setQuery}
          query={query}
          selectedFilter={selectedFilter}
        />
      </BoardSection>

      <BoardSection title="BacklogHorizontalItemCard" subtitle="Idea, plan, mark, missing subtitle, hidden actions, and detail-disabled states.">
        <View style={styles.stackSm}>
          {baseItems.map((item, index) => (
            <BacklogHorizontalItemCard
              canOpen={index !== 2}
              hasActions={index !== 3}
              item={index === 2 ? { ...item, subtitle: undefined, horizonTone: "unplanned", horizonLabel: undefined } : item}
              key={item.id}
              locale={locale}
              onOpenActionMenu={() => undefined}
              onPress={(itemId) => Alert.alert("Open", itemId)}
            />
          ))}
        </View>
      </BoardSection>

      <BoardSection title="BacklogMetadataChip" subtitle="Type tones, horizon tones, and long-label truncation.">
        <View style={styles.rowWrap}>
          <BacklogMetadataChip label="Idea" tone="idea" />
          <BacklogMetadataChip label="Plan" tone="plan" />
          <BacklogMetadataChip label="Mark" tone="mark" />
          <BacklogMetadataChip label={locale === "vi" ? "Tuan nay" : "This week"} tone="near" />
          <BacklogMetadataChip label={locale === "vi" ? "Thang toi" : "Next month"} tone="next" />
          <BacklogMetadataChip label={locale === "vi" ? "De sau" : "Later"} tone="later" />
          <BacklogMetadataChip label={locale === "vi" ? "Mot ngay nao do" : "Someday"} tone="someday" />
          <BacklogMetadataChip label={locale === "vi" ? "Chua xep nhan dau" : "Unplanned and still intentionally waiting"} tone="unplanned" />
        </View>
      </BoardSection>

      <BoardSection title="BacklogInlineActionMenu" subtitle="All actions visible with inline popup placement beside the card.">
        <View style={styles.stackSm}>
          <BacklogHorizontalItemCard
            canOpen
            hasActions
            item={menuItem}
            locale={locale}
            onOpenActionMenu={() => setMenuVisible(true)}
            onPress={(itemId) => Alert.alert("Open", itemId)}
          />
          <BacklogInlineActionMenu
            anchor={{ x: 280, y: 280, width: 44, height: 44 }}
            canCreateMarkFromBacklog
            canDeleteBacklogItem
            item={menuItem}
            locale={locale}
            onClose={() => setMenuVisible(false)}
            onCreateMarkFromBacklog={(itemId) => Alert.alert("Create mark", itemId)}
            onDeleteBacklogItem={(itemId) => Alert.alert("Delete", itemId)}
            visible={menuVisible}
          />
        </View>
      </BoardSection>

      <BoardSection title="BacklogSearchFilterBar" subtitle="Empty query, typed query, inactive filter, and active filter states.">
        <View style={styles.stackSm}>
          <BacklogSearchFilterBar locale={locale} onOpenFilter={() => setSheetVisible(true)} onQueryChange={setQuery} query={query} selectedFilter="all" />
          <BacklogSearchFilterBar locale={locale} onOpenFilter={() => setSheetVisible(true)} onQueryChange={setQuery} query={locale === "vi" ? "du dinh" : "patagonia"} selectedFilter="plan" />
        </View>
      </BoardSection>

      <BoardSection title="BacklogFilterSheet" subtitle="All backlog, ideas, plans, and marks only.">
        <BacklogFilterSheet
          locale={locale}
          onClose={() => setSheetVisible(false)}
          onSelectFilter={(filter) => {
            setSelectedFilter(filter);
            setSheetVisible(false);
          }}
          selectedFilter={selectedFilter}
          visible={sheetVisible}
        />
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  stackSm: {
    gap: spacing.sm,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
