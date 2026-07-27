import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { derivePackCheckActionState } from "../../app/packCheckDetailState";
import { useCopy } from "../../i18n/useCopy";
import { getPathVisualTokens } from "../../tokens/pathVisualTokens";
import { foundationColors, semanticElevation, semanticRadius, shellTokens, spacing } from "../../theme/tokens";
import { isFeatureVisible } from "../../utils/featureGate";
import { Divider } from "../primitives/Divider";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WMButton } from "../primitives/WMButton";
import { WMCard } from "../primitives/WMCard";
import { WMText } from "../primitives/Text";
import { PackCheckHero } from "./PackCheckHero";
import { PackCheckItemRow } from "./PackCheckItemRow";
import { PackCheckResetAction } from "./PackCheckResetAction";
import { PackCheckTemplateProps } from "./types";

const ACTION_BAR_HEIGHT = 64;
const ACTION_BAR_BOTTOM_GAP = 20;

export function PackCheckTemplate({
  packCheck,
  locale,
  items,
  onToggleItem,
  onComplete,
  onClearChecks,
  isLoading = false,
  isDisabled = false,
  gate = "enabled",
  showBack = false,
  onBack,
  headerActions,
  signalContent,
  withShell = true,
}: PackCheckTemplateProps) {
  const c = useCopy(locale).packCheck;
  const insets = useSafeAreaInsets();

  if (!isFeatureVisible(gate)) {
    return null;
  }

  const actionState = derivePackCheckActionState(items, isDisabled, packCheck.status);
  const pathVisual = getPathVisualTokens(packCheck.path);
  const stickyBottom =
    shellTokens.spacing.bottomNavBodyHeight +
    insets.bottom +
    Math.max(shellTokens.spacing.bottomNavBreathingRoom, ACTION_BAR_BOTTOM_GAP);
  const scrollBottomClearance = stickyBottom + ACTION_BAR_HEIGHT + spacing.lg;

  const header = (
    <PageHeader
      actions={headerActions}
      backLabel={c.header.back}
      onBack={onBack}
      showBack={showBack}
      title="Pack Check"
      variant="dense"
    />
  );

  const hero = (
    <PackCheckHero
      isLoading={isLoading}
      items={items}
      locale={locale}
      packCheckName={packCheck.name}
      packCheckStatus={packCheck.status}
      path={packCheck.path}
    />
  );

  const checklist = (
    <WMCard
      contentStyle={styles.cardContent}
      style={{
        ...styles.listCard,
        backgroundColor: pathVisual.accentSoft,
        borderColor: pathVisual.accentMuted,
      }}
    >
      {items.length === 0 ? (
        <WMText style={styles.emptyLabel} variant="bodySm">
          {c.empty.items}
        </WMText>
      ) : (
        items.map((item, index) => (
          <View key={item.id}>
            <PackCheckItemRow
              checked={item.checked}
              disabled={isDisabled || item.disabled}
              id={item.id}
              index={index}
              label={item.label}
              loading={isLoading}
              locale={locale}
              onToggle={onToggleItem}
              path={packCheck.path}
            />
            {index < items.length - 1 ? (
              <Divider
                insetEnd={spacing.sm + 8}
                insetStart={spacing.sm + 38 + spacing.sm}
                style={styles.rowDivider}
                variant="soft"
              />
            ) : null}
          </View>
        ))
      )}
    </WMCard>
  );

  const content = (
    <View style={styles.stack}>
      {header}
      {hero}
      {signalContent}
      {checklist}
    </View>
  );

  const actions = (
    <View
      style={[
        styles.actionBar,
        {
          bottom: stickyBottom,
        },
      ]}
    >
      <View style={styles.actionPrimary}>
        <WMButton
          disabled={!actionState.canComplete || isLoading}
          fullWidth
          accessibilityLabel={c.actions.completeAccessibility}
          label={c.actions.complete}
          loading={isLoading}
          onPress={onComplete}
          variant="primary"
        />
      </View>
      <View style={styles.actionSecondary}>
        <PackCheckResetAction
          disabled={!actionState.canClear}
          loading={isLoading}
          locale={locale}
          onClearChecks={onClearChecks}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      {withShell ? (
        <FieldJournalScreenShell contentContainerStyle={{ paddingBottom: scrollBottomClearance }} variant="navAware">
          {content}
        </FieldJournalScreenShell>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.previewScrollContent,
            {
              paddingTop: insets.top + spacing.sm,
              paddingBottom: scrollBottomClearance,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      )}
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  previewScrollContent: {
    flexGrow: 1,
    gap: spacing.sm,
    paddingHorizontal: shellTokens.spacing.screenXCompact,
  },
  stack: {
    gap: spacing.sm,
  },
  listCard: {
    borderWidth: 1,
  },
  cardContent: {
    gap: 0,
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
  },
  emptyLabel: {
    color: foundationColors.ink.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: "center",
  },
  actionBar: {
    left: shellTokens.spacing.screenXCompact,
    position: "absolute",
    right: shellTokens.spacing.screenXCompact,
    zIndex: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 8,
    boxShadow: semanticElevation.nav,
  },
  actionPrimary: {
    flex: 1.3,
  },
  actionSecondary: {
    flex: 1,
  },
  rowDivider: {
    backgroundColor: "rgba(120, 108, 83, 0.18)",
    marginVertical: 0,
  },
});
