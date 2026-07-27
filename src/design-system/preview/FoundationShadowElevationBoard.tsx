import { StyleSheet, View } from "react-native";
import { BottomNavBar } from "../../components/primitives/BottomNavBar";
import { CaptureLeafButton } from "../../components/primitives/CaptureLeafButton";
import { WMButton } from "../../components/primitives/WMButton";
import { WMCard } from "../../components/primitives/WMCard";
import { WMListRow } from "../../components/primitives/WMListRow";
import { WMText } from "../../components/primitives/Text";
import { foundationShadow } from "../tokens/foundation-shadow";
import { semanticElevation } from "../tokens/semantic-elevation";
import { composeShadow } from "../utils/compose-shadow";
import { foundationColors, semanticRadius, semanticSpacing, spacing } from "../../theme/tokens";

const shadowRows = [
  ["shadow.none", foundationShadow.none, "Flat surfaces"],
  ["shadow.paper.low", foundationShadow.paper.low, "Rows / compact cards"],
  ["shadow.paper.medium", foundationShadow.paper.medium, "Default cards"],
  ["shadow.paper.high", foundationShadow.paper.high, "Sheet / bottom nav"],
  ["shadow.paper.hero", foundationShadow.paper.hero, "Hero cards"],
  ["shadow.float.capture", foundationShadow.float.capture, "CaptureLeafButton"],
  ["shadow.float.greenSoft", foundationShadow.float.greenSoft, "Rare active card"],
  ["shadow.inset.soft", foundationShadow.inset.soft, "Pressed / sunken state"],
  ["shadow.focus", foundationShadow.focus, "Focus ring support"],
] as const;

const semanticRows = [
  ["elevation.flat", semanticElevation.flat, "Flat surfaces"],
  ["elevation.row", semanticElevation.row, "EntityRow / minor card"],
  ["elevation.card", semanticElevation.card, "JournalCard"],
  ["elevation.hero", semanticElevation.hero, "MediaHero"],
  ["elevation.nav", semanticElevation.nav, "BottomNavBar"],
  ["elevation.sheet", semanticElevation.sheet, "ActionSheet"],
  ["elevation.capture", semanticElevation.capture, "CaptureLeafButton"],
  ["elevation.activeCard", semanticElevation.activeCard, "Rare active card"],
  ["elevation.pressed", semanticElevation.pressed, "Pressed state"],
  ["elevation.focus", semanticElevation.focus, "Focus state"],
] as const;

function ShadowSample({
  name,
  value,
  usage,
}: {
  name: string;
  value: string;
  usage: string;
}) {
  return (
    <View style={[styles.sampleCard, { boxShadow: value }]}>
      <WMText style={styles.sampleName} variant="meta">
        {name}
      </WMText>
      <WMText variant="bodyStrong">{usage}</WMText>
      <WMText style={styles.sampleValue} variant="meta">
        {value}
      </WMText>
    </View>
  );
}

function ComponentStressBoard() {
  return (
    <View style={styles.sectionCard}>
      <WMText style={styles.kicker} variant="meta">
        Component stress board
      </WMText>
      <WMText variant="cardTitle">Shadow applied to primitives</WMText>

      <View style={styles.gridTwo}>
        <WMCard>
          <WMText variant="meta">JournalCard</WMText>
          <WMText variant="cardTitle">Soft paper-card depth</WMText>
          <WMText variant="bodySm">Card should feel lifted like paper, never like a SaaS panel.</WMText>
        </WMCard>

        <WMListRow
          elevated
          icon="•"
          subtitle="Rows should not compete with cards."
          title="EntityRow"
          trailing="Open"
        />

        <WMButton fullWidth label="Primary Action" />

        <View style={styles.sheetPreview}>
          <View style={styles.handle} />
          <WMText variant="sheetTitle">ActionSheet</WMText>
          <WMText variant="bodySm">Sheet must separate clearly from the dimmed background.</WMText>
        </View>

        <View style={styles.navPreview}>
          <BottomNavBar activeTab="capture" locale="en" />
        </View>

        <View style={styles.capturePreview}>
          <CaptureLeafButton
            accessibilityHint="Open capture chooser"
            accessibilityLabel="Open capture chooser"
          />
          <WMText variant="meta">Strongest elevation, reserved for capture.</WMText>
        </View>

        <View style={styles.heroCard}>
          <WMText variant="meta">MediaHero</WMText>
          <WMText variant="cardTitle">Soft hero paper depth</WMText>
          <WMText variant="bodySm">Hero imagery can lift slightly more without turning glossy.</WMText>
        </View>
      </View>
    </View>
  );
}

function StateBoard() {
  const cards = [
    {
      label: "Default",
      shadow: semanticElevation.card,
      backgroundColor: foundationColors.bg.paper,
      borderColor: foundationColors.border.soft,
    },
    {
      label: "Pressed",
      shadow: semanticElevation.pressed,
      backgroundColor: foundationColors.bg.paperSoft,
      borderColor: foundationColors.border.soft,
    },
    {
      label: "Active",
      shadow: semanticElevation.activeCard,
      backgroundColor: foundationColors.green.soft,
      borderColor: foundationColors.border.active,
    },
    {
      label: "Selected",
      shadow: semanticElevation.card,
      backgroundColor: foundationColors.bg.paper,
      borderColor: foundationColors.border.protected,
    },
    {
      label: "Disabled",
      shadow: semanticElevation.flat,
      backgroundColor: foundationColors.bg.disabled,
      borderColor: foundationColors.border.disabled,
    },
    {
      label: "Loading",
      shadow: semanticElevation.flat,
      backgroundColor: foundationColors.bg.paper,
      borderColor: foundationColors.border.subtle,
    },
    {
      label: "Focus",
      shadow: composeShadow(semanticElevation.card, semanticElevation.focus),
      backgroundColor: foundationColors.bg.paper,
      borderColor: foundationColors.border.active,
    },
  ] as const;

  return (
    <View style={styles.sectionCard}>
      <WMText style={styles.kicker} variant="meta">
        State behavior
      </WMText>
      <WMText variant="cardTitle">Shadow must not become reward or punishment</WMText>
      <View style={styles.gridThree}>
        {cards.map((card) => (
          <View
            key={card.label}
            style={[
              styles.stateTile,
              {
                backgroundColor: card.backgroundColor,
                borderColor: card.borderColor,
                boxShadow: card.shadow,
              },
            ]}
          >
            <WMText variant="bodyStrong">{card.label}</WMText>
            <WMText variant="meta">Use color, border, and surface before stronger shadow.</WMText>
          </View>
        ))}
      </View>
    </View>
  );
}

function NegativeStateBoard() {
  return (
    <View style={styles.sectionCard}>
      <WMText style={styles.kicker} variant="meta">
        Negative-state board
      </WMText>
      <WMText variant="cardTitle">Weak and missed do not get stronger shadow</WMText>
      <View style={styles.gridTwo}>
        <View
          style={[
            styles.stateTile,
            {
              backgroundColor: foundationColors.clay.soft,
              borderColor: foundationColors.border.warning,
              boxShadow: semanticElevation.card,
            },
          ]}
        >
          <WMText variant="bodyStrong">Weak</WMText>
          <WMText variant="meta">No punishment haze. Keep depth consistent.</WMText>
        </View>
        <View
          style={[
            styles.stateTile,
            {
              backgroundColor: foundationColors.missed.soft,
              borderColor: foundationColors.border.missed,
              boxShadow: semanticElevation.card,
            },
          ]}
        >
          <WMText variant="bodyStrong">Missed</WMText>
          <WMText variant="meta">Use color shift, not heavier lift.</WMText>
        </View>
      </View>
    </View>
  );
}

function PhonePreview() {
  return (
    <View style={styles.sectionCard}>
      <WMText style={styles.kicker} variant="meta">
        Phone preview
      </WMText>
      <WMText variant="cardTitle">Waymark mobile layering</WMText>
      <View style={styles.phoneFrame}>
        <View style={styles.phoneHero}>
          <WMText variant="meta">MediaHero</WMText>
          <WMText variant="screenTitle">Today stays soft</WMText>
          <WMText variant="bodySm">Warm paper depth, calm nav, and one strong capture action.</WMText>
        </View>
        <WMCard>
          <WMText variant="cardTitle">JournalCard</WMText>
          <WMText variant="bodySm">Lifted paper, readable ink, no dashboard feel.</WMText>
        </WMCard>
        <View style={styles.phoneSheet}>
          <View style={styles.handle} />
          <WMText variant="sheetTitle">ActionSheet</WMText>
          <WMText variant="bodySm">Clear separation from the dimmed background.</WMText>
        </View>
        <BottomNavBar activeTab="capture" locale="en" />
      </View>
    </View>
  );
}

function EyeComfortCheck() {
  return (
    <View style={styles.sectionCard}>
      <WMText style={styles.kicker} variant="meta">
        Eye comfort check
      </WMText>
      <WMText variant="cardTitle">Warm, not hazy</WMText>
      <View style={styles.gridTwo}>
        <View style={[styles.sampleCard, { boxShadow: foundationShadow.paper.medium }]}>
          <WMText variant="bodyStrong">Warm layered paper</WMText>
          <WMText variant="meta">Brown-tinted shadow keeps the surface calm.</WMText>
        </View>
        <View style={[styles.sampleCard, { boxShadow: foundationShadow.none }]}>
          <WMText variant="bodyStrong">Flat comparison</WMText>
          <WMText variant="meta">Dense reading surfaces can stay flat without losing hierarchy.</WMText>
        </View>
      </View>
    </View>
  );
}

export function FoundationShadowElevationBoard() {
  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <WMText style={styles.kicker} variant="meta">
          Waymark Foundation
        </WMText>
        <WMText variant="screenTitle">Shadow / Elevation Preview Board</WMText>
        <WMText variant="bodySm">
          Soft Layered Paper Elevation: warm paper-card depth, quiet row shadows, clear sheet/nav
          layering, and one stronger Capture shadow.
        </WMText>
      </View>

      <View style={styles.sectionCard}>
        <WMText style={styles.kicker} variant="meta">
          Foundation tokens
        </WMText>
        <WMText variant="cardTitle">Shadow scale</WMText>
        <View style={styles.gridThree}>
          {shadowRows.map(([name, value, usage]) => (
            <ShadowSample key={name} name={name} usage={usage} value={value} />
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <WMText style={styles.kicker} variant="meta">
          Semantic elevation
        </WMText>
        <WMText variant="cardTitle">Component mapping</WMText>
        <View style={styles.gridTwo}>
          {semanticRows.map(([name, value, usage]) => (
            <ShadowSample key={name} name={name} usage={usage} value={value} />
          ))}
        </View>
      </View>

      <ComponentStressBoard />
      <StateBoard />
      <NegativeStateBoard />
      <PhonePreview />
      <EyeComfortCheck />
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
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    padding: spacing.lg,
    gap: spacing.sm,
    boxShadow: semanticElevation.hero,
  },
  sectionCard: {
    backgroundColor: foundationColors.bg.paper,
    borderRadius: semanticRadius.card.hero,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    padding: spacing.lg,
    gap: spacing.md,
    boxShadow: semanticElevation.card,
  },
  kicker: {
    color: foundationColors.ink.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  gridTwo: {
    gap: spacing.sm,
  },
  gridThree: {
    gap: spacing.sm,
  },
  sampleCard: {
    backgroundColor: foundationColors.bg.paper,
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    padding: spacing.md,
    gap: spacing.xs,
  },
  sampleName: {
    color: foundationColors.green.deep,
  },
  sampleValue: {
    color: foundationColors.ink.tertiary,
  },
  sheetPreview: {
    backgroundColor: foundationColors.bg.paper,
    borderRadius: semanticRadius.sheet,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    paddingHorizontal: semanticSpacing.sheet.paddingX,
    paddingTop: semanticSpacing.sheet.paddingTop,
    paddingBottom: semanticSpacing.sheet.paddingBottom,
    gap: spacing.sm,
    boxShadow: semanticElevation.sheet,
  },
  handle: {
    alignSelf: "center",
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: foundationColors.border.proof,
  },
  navPreview: {
    overflow: "hidden",
    borderRadius: semanticRadius.nav,
  },
  capturePreview: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  heroCard: {
    backgroundColor: foundationColors.bg.paperWarm,
    borderRadius: semanticRadius.imageHero,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    padding: spacing.lg,
    gap: spacing.xs,
    boxShadow: semanticElevation.hero,
  },
  stateTile: {
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  phoneFrame: {
    backgroundColor: foundationColors.bg.app,
    borderRadius: semanticRadius.card.hero,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    padding: semanticSpacing.screen.x,
    gap: spacing.md,
  },
  phoneHero: {
    backgroundColor: foundationColors.bg.paperWarm,
    borderRadius: semanticRadius.imageHero,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    padding: spacing.lg,
    gap: spacing.xs,
    boxShadow: semanticElevation.hero,
  },
  phoneSheet: {
    backgroundColor: foundationColors.bg.paper,
    borderRadius: semanticRadius.sheet,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    paddingHorizontal: semanticSpacing.sheet.paddingX,
    paddingTop: semanticSpacing.sheet.paddingTop,
    paddingBottom: semanticSpacing.sheet.paddingBottom,
    gap: spacing.sm,
    boxShadow: semanticElevation.sheet,
  },
});
