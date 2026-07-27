import { StyleSheet, View } from "react-native";
import { BoardSection } from "../../labs/BoardPrimitives";
import {
  foundationColors,
  foundationRadius,
  radius,
  semanticRadius,
  semanticSpacing,
  semanticTokens,
  spacing,
} from "../../theme/tokens";
import { BottomNavBar } from "../../components/primitives/BottomNavBar";
import { CaptureLeafButton } from "../../components/primitives/CaptureLeafButton";
import { WMBadge } from "../../components/primitives/WMBadge";
import { WMButton } from "../../components/primitives/WMButton";
import { WMCard } from "../../components/primitives/WMCard";
import { WMChip } from "../../components/primitives/WMChip";
import { WMListRow } from "../../components/primitives/WMListRow";
import { WMText } from "../../components/primitives/Text";

const tokenEntries = Object.entries(foundationRadius) as Array<
  [keyof typeof foundationRadius, number]
>;

const semanticEntries = [
  ["radius.card.compact", semanticRadius.card.compact],
  ["radius.card.default", semanticRadius.card.default],
  ["radius.card.hero", semanticRadius.card.hero],
  ["radius.row.default", semanticRadius.row.default],
  ["radius.button.default", semanticRadius.button.default],
  ["radius.chip", semanticRadius.chip],
  ["radius.badge", semanticRadius.badge],
  ["radius.nav", semanticRadius.nav],
  ["radius.sheet", semanticRadius.sheet],
  ["radius.capture", semanticRadius.capture],
  ["radius.imageHero", semanticRadius.imageHero],
] as const;

function RadiusTokenTile({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.tokenTile}>
      <View style={[styles.tokenShape, { borderRadius: value }]} />
      <WMText variant="bodyStrong">{label}</WMText>
      <WMText variant="meta">{`${value}px`}</WMText>
    </View>
  );
}

function RadiusStatePreview() {
  return (
    <View style={styles.stateRow}>
      <View style={[styles.stateShape, styles.stateDefault]}>
        <WMText variant="chip">Default</WMText>
      </View>
      <View style={[styles.stateShape, styles.statePressed]}>
        <WMText variant="chip">Pressed</WMText>
      </View>
      <View style={[styles.stateShape, styles.stateActive]}>
        <WMText variant="chip">Active</WMText>
      </View>
      <View style={[styles.stateShape, styles.stateDisabled]}>
        <WMText variant="chip">Disabled</WMText>
      </View>
      <View style={styles.focusRing}>
        <View style={[styles.stateShape, styles.stateDefault]}>
          <WMText variant="chip">Focus</WMText>
        </View>
      </View>
    </View>
  );
}

export function FoundationRadiusBoard() {
  return (
    <View style={styles.stack}>
      <BoardSection
        title="FoundationRadiusBoard"
        subtitle="Soft Paper Journal with slightly generous sheet/nav radius."
      >
        <View style={styles.tokenGrid}>
          {tokenEntries.map(([label, value]) => (
            <RadiusTokenTile key={label} label={label} value={value} />
          ))}
        </View>
      </BoardSection>

      <BoardSection title="Semantic mapping">
        <View style={styles.semanticList}>
          {semanticEntries.map(([label, value]) => (
            <WMText key={label} variant="bodyStrong">{`${label} = ${value}px`}</WMText>
          ))}
        </View>
      </BoardSection>

      <BoardSection title="Component stress board">
        <WMCard>
          <WMBadge label="Protected" state="protected" />
          <WMText variant="cardTitle">JournalCard radius.card.default</WMText>
          <WMText variant="bodySm">Soft paper corners, never toy-like.</WMText>
        </WMCard>
        <View style={styles.rowSurface}>
          <WMListRow
            icon="●"
            title="EntityRow radius.row.default"
            subtitle="Rounded enough to avoid table feeling"
            trailing="Open"
          />
        </View>
        <View style={styles.chipRow}>
          <WMBadge label="StatusChip" state="active" />
          <WMChip label="EntityChip" selected />
        </View>
        <View style={styles.buttonColumn}>
          <WMButton label="Primary Action" fullWidth />
          <WMButton label="Secondary Action" fullWidth variant="secondary" />
        </View>
      </BoardSection>

      <BoardSection title="Mobile preview">
        <View style={styles.phoneFrame}>
          <WMCard>
            <WMText variant="screenTitle">Today stays soft</WMText>
            <WMText variant="bodySm">Cards, rows, chips, and buttons keep one family shape language.</WMText>
          </WMCard>
          <BottomNavBar activeTab="capture" locale="en" />
        </View>
      </BoardSection>

      <BoardSection title="State preview">
        <RadiusStatePreview />
      </BoardSection>

      <BoardSection title="Skeleton preview">
        <View style={styles.skeletonCard}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        </View>
      </BoardSection>

      <BoardSection title="Vietnamese stress">
        <WMCard>
          <WMText variant="cardTitle">Kết quả hôm nay được bảo vệ</WMText>
          <WMText variant="bodySm">Sức khỏe cần một bước sửa rõ ràng vào ngày mai</WMText>
          <View style={styles.chipRow}>
            <WMBadge label="Đã dời lịch có chủ đích" state="rescheduled" />
            <WMChip label="Ghi lại một dấu mốc nhỏ nhưng thật" />
          </View>
          <WMButton fullWidth label="Đóng ngày hôm nay" />
        </WMCard>
      </BoardSection>

      <BoardSection title="Capture and sheet">
        <View style={styles.captureArea}>
          <CaptureLeafButton
            accessibilityHint="Open capture chooser"
            accessibilityLabel="Open capture chooser"
            focusVisible
          />
          <WMText variant="meta">{`Capture tap radius ${semanticTokens.radius.captureLeaf.tapTarget}px`}</WMText>
        </View>
        <View style={styles.sheetSurface}>
          <WMText variant="sheetTitle">ActionSheet radius.sheet</WMText>
          <WMText variant="body">Sheet corners stay soft and private.</WMText>
        </View>
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  tokenGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tokenTile: {
    width: 104,
    gap: spacing.xs,
    alignItems: "center",
  },
  tokenShape: {
    width: 88,
    height: 56,
    backgroundColor: foundationColors.green.soft,
    borderWidth: 1,
    borderColor: foundationColors.border.active,
  },
  semanticList: {
    gap: spacing.xs,
  },
  rowSurface: {
    borderRadius: semanticRadius.row.default,
    backgroundColor: foundationColors.bg.paper,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    overflow: "hidden",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: semanticSpacing.chip.wrapGap,
  },
  buttonColumn: {
    gap: spacing.sm,
  },
  phoneFrame: {
    gap: spacing.md,
    borderRadius: semanticRadius.card.hero,
    backgroundColor: foundationColors.bg.app,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    padding: semanticSpacing.screen.x,
  },
  stateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  stateShape: {
    minWidth: 88,
    paddingHorizontal: semanticSpacing.button.paddingX,
    paddingVertical: spacing.sm,
    borderRadius: semanticRadius.button.default,
    borderWidth: 1,
    alignItems: "center",
  },
  stateDefault: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
  },
  statePressed: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.protected,
    transform: [{ scale: 0.98 }],
  },
  stateActive: {
    backgroundColor: foundationColors.green.soft,
    borderColor: foundationColors.border.active,
  },
  stateDisabled: {
    backgroundColor: foundationColors.bg.disabled,
    borderColor: foundationColors.border.disabled,
    opacity: 0.6,
  },
  focusRing: {
    borderRadius: semanticRadius.button.default + 4,
    borderWidth: 2,
    borderColor: foundationColors.border.focus,
    padding: 2,
  },
  skeletonCard: {
    borderRadius: semanticRadius.card.default,
    backgroundColor: foundationColors.bg.paper,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    padding: semanticSpacing.card.padding.md,
    gap: semanticSpacing.card.gap,
  },
  skeletonTitle: {
    height: 20,
    width: "60%",
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonLine: {
    height: 12,
    width: "100%",
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  skeletonLineShort: {
    width: "72%",
  },
  captureArea: {
    alignItems: "center",
    gap: spacing.xs,
  },
  sheetSurface: {
    borderTopLeftRadius: semanticRadius.sheet,
    borderTopRightRadius: semanticRadius.sheet,
    borderBottomLeftRadius: semanticRadius.card.default,
    borderBottomRightRadius: semanticRadius.card.default,
    backgroundColor: foundationColors.bg.paper,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    paddingHorizontal: semanticSpacing.sheet.paddingX,
    paddingTop: semanticSpacing.sheet.paddingTop,
    paddingBottom: semanticSpacing.sheet.paddingBottom,
    gap: semanticSpacing.card.gap,
  },
});
