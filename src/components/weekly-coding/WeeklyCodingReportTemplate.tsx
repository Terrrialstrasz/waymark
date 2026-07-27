import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { getCopy } from "../../i18n/copy";
import { foundationColors } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { UtilityIconButton } from "../domain/icons/UtilityIconButton";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { ItemActionPopup } from "./ItemActionPopup";
import { PulledIntoWeekSection } from "./PulledIntoWeekSection";
import { WeekEmptyState } from "./WeekEmptyState";
import { WeekNavigator } from "./WeekNavigator";
import { WeeklyCodingItemActionAnchor, WeeklyCodingReportItem } from "./WeeklyCoding.types";

export type WeeklyCodingReportTemplateProps = {
  locale?: Locale;
  reducedMotion?: boolean;
  selectedWeekLabel: string;
  selectedWeekDateRange: string;
  pulledItems: WeeklyCodingReportItem[];
  previousWeekDisabled?: boolean;
  nextWeekDisabled?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onOpenMore?: () => void;
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  onOpenItem?: (itemId: string) => void;
  onOpenItemMenu?: (itemId: string) => void;
  onOpenDetail?: (itemId: string) => void;
  onRemoveFromWeek?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
};

type OpenMenuState = {
  item: WeeklyCodingReportItem;
  anchor: WeeklyCodingItemActionAnchor;
};

export function WeeklyCodingReportTemplate({
  locale = "en",
  reducedMotion,
  selectedWeekLabel,
  selectedWeekDateRange,
  pulledItems,
  previousWeekDisabled = false,
  nextWeekDisabled = false,
  showBack = false,
  onBack,
  onOpenMore,
  onPreviousWeek,
  onNextWeek,
  onOpenItem,
  onOpenItemMenu,
  onOpenDetail,
  onRemoveFromWeek,
  onDeleteItem,
}: WeeklyCodingReportTemplateProps) {
  const c = getCopy(locale).weeklyCoding;
  const [openMenu, setOpenMenu] = useState<OpenMenuState | null>(null);
  const hasPulledItems = pulledItems.length > 0;

  return (
    <View style={styles.root}>
      <FieldJournalScreenShell botanicalAmbient variant="navAware">
        <PageHeader
          decorativeAccent
          onBack={onBack}
          showBack={showBack}
          subtitle={c.subtitle}
          title="Weekly Coding"
          variant={showBack ? "withBack" : "standard"}
        />

        <WeekNavigator
          dateRangeLabel={selectedWeekDateRange}
          locale={locale}
          nextDisabled={nextWeekDisabled}
          onNext={onNextWeek}
          onPrevious={onPreviousWeek}
          previousDisabled={previousWeekDisabled}
          weekLabel={selectedWeekLabel}
        />

        {hasPulledItems ? (
          <PulledIntoWeekSection
            items={pulledItems}
            locale={locale}
            onDeleteItem={onDeleteItem}
            onOpenItem={onOpenDetail ?? onOpenItem}
            onOpenItemDetail={onOpenDetail}
            onRemoveFromWeek={onRemoveFromWeek}
            onRequestMenuAnchor={(item, anchor) => {
              setOpenMenu({ item, anchor });
              onOpenItemMenu?.(item.id);
            }}
            reducedMotion={reducedMotion}
            weekLabel={selectedWeekLabel}
          />
        ) : (
          <WeekEmptyState locale={locale} />
        )}
      </FieldJournalScreenShell>

      <ItemActionPopup
        anchor={openMenu?.anchor}
        item={openMenu?.item}
        locale={locale}
        onClose={() => setOpenMenu(null)}
        onDeleteItem={onDeleteItem}
        onOpenDetail={onOpenDetail ?? onOpenItem}
        onRemoveFromWeek={onRemoveFromWeek}
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
});
