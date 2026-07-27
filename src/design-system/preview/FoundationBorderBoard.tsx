import { StyleSheet, View } from "react-native";
import { BottomNavBar } from "../../components/primitives/BottomNavBar";
import { WMBadge } from "../../components/primitives/WMBadge";
import { WMButton } from "../../components/primitives/WMButton";
import { WMCard } from "../../components/primitives/WMCard";
import { WMChip } from "../../components/primitives/WMChip";
import { WMListRow } from "../../components/primitives/WMListRow";
import { WMText } from "../../components/primitives/Text";
import {
  foundationBorder,
  foundationBorderColor,
  foundationBorderWidth,
  foundationColors,
  semanticBorder,
  semanticRadius,
  semanticSpacing,
  spacing,
} from "../../theme/tokens";
import { getBorderStyle } from "../utils/get-border-style";

const borderColorRows = [
  ["paper.soft", foundationBorderColor.paper.soft],
  ["paper.subtle", foundationBorderColor.paper.subtle],
  ["paper.strong", foundationBorderColor.paper.strong],
  ["botanical.active", foundationBorderColor.botanical.active],
  ["botanical.activeStrong", foundationBorderColor.botanical.activeStrong],
  ["gold.proof", foundationBorderColor.gold.proof],
  ["clay.weak", foundationBorderColor.clay.weak],
  ["clay.missed", foundationBorderColor.clay.missed],
  ["archive.memory", foundationBorderColor.archive.memory],
  ["disabled", foundationBorderColor.disabled],
  ["focus", foundationBorderColor.focus],
] as const;

const borderWidthRows = [
  ["none", foundationBorderWidth.none],
  ["hairline", foundationBorderWidth.hairline],
  ["default", foundationBorderWidth.default],
  ["active", foundationBorderWidth.active],
  ["focus", foundationBorderWidth.focus],
] as const;

function BorderColorSwatch({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowCard}>
      <View style={[styles.colorChip, { backgroundColor: value, borderColor: value }]} />
      <View style={styles.rowCopy}>
        <WMText variant="bodyStrong">{label}</WMText>
        <WMText variant="meta">{value}</WMText>
      </View>
    </View>
  );
}

function BorderWidthSample({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.widthSample}>
      <WMText variant="bodyStrong">{label}</WMText>
      <View style={[styles.widthRule, { height: Number.parseFloat(value), backgroundColor: foundationBorderColor.paper.strong }]} />
      <WMText variant="meta">{value}</WMText>
    </View>
  );
}

function ComponentExamples() {
  return (
    <View style={styles.sectionCard}>
      <WMText style={styles.kicker} variant="meta">
        Component examples
      </WMText>
      <WMText variant="cardTitle">Soft botanical paper outlines</WMText>
      <View style={styles.grid}>
        <WMCard>
          <WMText variant="meta">Card</WMText>
          <WMText variant="cardTitle">Warm paper outline</WMText>
        </WMCard>

        <WMListRow elevated icon="•" title="EntityRow" subtitle="Quiet border" trailing="Open" />

        <View style={styles.chipRow}>
          <WMBadge label="planned" state="planned" />
          <WMBadge label="active" state="active" />
          <WMChip label="EntityChip" />
        </View>

        <View style={styles.buttonStack}>
          <WMButton label="Primary Action" fullWidth />
          <WMButton label="Secondary Action" fullWidth variant="secondary" />
        </View>

        <View style={styles.navPreview}>
          <BottomNavBar activeTab="today" locale="en" />
        </View>

        <View style={styles.sheetPreview}>
          <View style={styles.handle} />
          <WMText variant="sheetTitle">ActionSheet</WMText>
          <WMText variant="bodySm">Sheet outline stays warm and clear.</WMText>
        </View>

        <View style={styles.mediaPreview}>
          <WMText variant="meta">Media</WMText>
          <WMText variant="cardTitle">Default media outline</WMText>
        </View>

        <View style={styles.memoryPreview}>
          <WMText variant="meta">Memory media</WMText>
          <WMText variant="cardTitle">Archive outline</WMText>
        </View>
      </View>
    </View>
  );
}

function StateExamples() {
  const states = [
    { label: "Planned", border: semanticBorder.state.planned, bg: foundationColors.gold.soft },
    { label: "Done", border: semanticBorder.state.done, bg: foundationColors.green.soft },
    { label: "Active", border: semanticBorder.state.active, bg: foundationColors.green.soft },
    { label: "Weak", border: semanticBorder.state.weak, bg: foundationColors.clay.soft },
    { label: "Protected", border: semanticBorder.state.protected, bg: "#D8E5D3" },
    { label: "Missed", border: semanticBorder.state.missed, bg: foundationColors.missed.soft },
  ] as const;

  return (
    <View style={styles.sectionCard}>
      <WMText style={styles.kicker} variant="meta">
        State examples
      </WMText>
      <WMText variant="cardTitle">Border carries meaning without punishment</WMText>
      <View style={styles.grid}>
        {states.map((state) => (
          <View key={state.label} style={[styles.stateTile, getBorderStyle(state.border), { backgroundColor: state.bg }]}>
            <WMText variant="bodyStrong">{state.label}</WMText>
            <WMText variant="meta">Border + surface, not border alone.</WMText>
          </View>
        ))}
      </View>
    </View>
  );
}

function FocusExample() {
  return (
    <View style={styles.sectionCard}>
      <WMText style={styles.kicker} variant="meta">
        Focus example
      </WMText>
      <WMText variant="cardTitle">Focus ring composes with the base border</WMText>
      <View style={styles.focusOuter}>
        <View style={styles.focusInner}>
          <WMText variant="bodyStrong">Focused card</WMText>
          <WMText variant="meta">The focus ring sits outside the semantic card border.</WMText>
        </View>
      </View>
    </View>
  );
}

function VietnameseStress() {
  return (
    <View style={styles.sectionCard}>
      <WMText style={styles.kicker} variant="meta">
        Vietnamese stress
      </WMText>
      <WMText variant="cardTitle">Long labels inside bordered surfaces</WMText>
      <View style={styles.vietnameseCard}>
        <WMText variant="bodyStrong">Kết quả hôm nay được bảo vệ và vẫn còn đủ mềm để sửa vào ngày mai</WMText>
        <View style={styles.chipRow}>
          <WMBadge label="đã dời lịch có chủ đích" state="rescheduled" />
          <WMChip label="ghi lại một dấu mốc nhỏ nhưng thật" selected />
        </View>
        <WMButton fullWidth label="Đóng ngày hôm nay" variant="secondary" />
      </View>
    </View>
  );
}

export function FoundationBorderBoard() {
  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <WMText style={styles.kicker} variant="meta">
          Waymark Foundation
        </WMText>
        <WMText variant="screenTitle">Border Preview Board</WMText>
        <WMText variant="bodySm">
          Soft Botanical Paper Outlines: warm card edges, quiet dividers, green active borders, gold
          planned borders, and clay repair-state borders.
        </WMText>
      </View>

      <View style={styles.sectionCard}>
        <WMText style={styles.kicker} variant="meta">
          Foundation border colors
        </WMText>
        <WMText variant="cardTitle">Warm and semantic</WMText>
        <View style={styles.grid}>
          {borderColorRows.map(([label, value]) => (
            <BorderColorSwatch key={label} label={label} value={value} />
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <WMText style={styles.kicker} variant="meta">
          Border width scale
        </WMText>
        <WMText variant="cardTitle">Quiet widths, no jitter</WMText>
        <View style={styles.grid}>
          {borderWidthRows.map(([label, value]) => (
            <BorderWidthSample key={label} label={label} value={value} />
          ))}
        </View>
      </View>

      <ComponentExamples />
      <StateExamples />
      <FocusExample />
      <VietnameseStress />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  hero: {
    backgroundColor: foundationColors.bg.paper,
    borderRadius: semanticRadius.card.hero,
    padding: spacing.lg,
    gap: spacing.sm,
    ...getBorderStyle(semanticBorder.card.default),
  },
  sectionCard: {
    backgroundColor: foundationColors.bg.paper,
    borderRadius: semanticRadius.card.hero,
    padding: spacing.lg,
    gap: spacing.md,
    ...getBorderStyle(semanticBorder.card.default),
  },
  kicker: {
    color: foundationColors.ink.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: semanticRadius.card.default,
    padding: spacing.md,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle(semanticBorder.card.subtle),
  },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: semanticRadius.chip,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  widthSample: {
    gap: spacing.xs,
    borderRadius: semanticRadius.card.default,
    padding: spacing.md,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle(semanticBorder.card.subtle),
  },
  widthRule: {
    width: "100%",
    borderRadius: semanticRadius.chip,
  },
  grid: {
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  buttonStack: {
    gap: spacing.sm,
  },
  navPreview: {
    overflow: "hidden",
    borderRadius: semanticRadius.nav,
  },
  sheetPreview: {
    borderRadius: semanticRadius.sheet,
    paddingHorizontal: semanticSpacing.sheet.paddingX,
    paddingTop: semanticSpacing.sheet.paddingTop,
    paddingBottom: semanticSpacing.sheet.paddingBottom,
    gap: spacing.sm,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle(semanticBorder.sheet.default),
  },
  handle: {
    alignSelf: "center",
    width: 48,
    height: 4,
    borderRadius: semanticRadius.chip,
    backgroundColor: foundationColors.border.subtle,
  },
  mediaPreview: {
    borderRadius: semanticRadius.imageHero,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: foundationColors.bg.paperWarm,
    ...getBorderStyle(semanticBorder.media.default),
  },
  memoryPreview: {
    borderRadius: semanticRadius.imageHero,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: foundationColors.bg.paperSoft,
    ...getBorderStyle(semanticBorder.media.memory),
  },
  stateTile: {
    borderRadius: semanticRadius.card.default,
    padding: spacing.md,
    gap: spacing.xs,
  },
  focusOuter: {
    padding: 3,
    borderRadius: semanticRadius.card.default + 4,
    ...getBorderStyle(semanticBorder.focus),
  },
  focusInner: {
    borderRadius: semanticRadius.card.default,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle(semanticBorder.card.default),
  },
  vietnameseCard: {
    borderRadius: semanticRadius.card.default,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle(semanticBorder.card.default),
  },
});
