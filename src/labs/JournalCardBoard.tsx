import { StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { JournalCard } from "../components/primitives/JournalCard";
import { WMText } from "../components/primitives/Text";
import { WMBadge } from "../components/primitives/WMBadge";
import { spacing } from "../theme/tokens";

export function JournalCardBoard() {
  return (
    <View style={styles.stack}>
      <BoardSection
        title="JournalCard"
        subtitle="Reusable warm paper surface for most Waymark content. Calm, tokenized, and composition-friendly."
      >
        <View style={styles.stack}>
          <View style={styles.rowWrap}>
            <JournalCard variant="standard" style={styles.cardWidth}>
              <WMText variant="cardTitle">Standard</WMText>
              <WMText variant="bodySm">Default paper card with soft border and gentle lift.</WMText>
            </JournalCard>

            <JournalCard variant="compact" style={styles.cardWidth}>
              <WMText variant="bodyStrong">Compact</WMText>
              <WMText variant="bodySm">Tighter padding for denser row-like content.</WMText>
            </JournalCard>
          </View>

          <JournalCard decorative decorationPreset="journalCard" variant="hero">
            <WMBadge state="planned" />
            <WMText variant="pageTitle">Hero journal surface</WMText>
            <WMText variant="body">
              More padding, larger radius, and optional low-opacity botanical accent. Still calm and paper-first.
            </WMText>
          </JournalCard>

          <View style={styles.rowWrap}>
            <JournalCard variant="readOnly" style={styles.cardWidth}>
              <WMText variant="cardTitle">Read only</WMText>
              <WMText variant="bodySm">No press affordance. Flat, quiet, still warm.</WMText>
            </JournalCard>

            <JournalCard
              accessibilityLabel="Open planned mark summary"
              actionable
              onPress={() => undefined}
              variant="actionable"
              style={styles.cardWidth}
            >
              <WMBadge state="active" />
              <WMText variant="cardTitle">Actionable</WMText>
              <WMText variant="bodySm">Gentle press treatment only when interactive.</WMText>
            </JournalCard>
          </View>

          <View style={styles.rowWrap}>
            <JournalCard selected variant="selected" style={styles.cardWidth}>
              <WMText variant="cardTitle">Selected</WMText>
              <WMText variant="bodySm">Subtle selected tint, not a loud dashboard active tile.</WMText>
            </JournalCard>

            <JournalCard disabled variant="actionable" style={styles.cardWidth}>
              <WMText variant="cardTitle">Disabled</WMText>
              <WMText variant="bodySm">Muted but still readable.</WMText>
            </JournalCard>
          </View>

          <View style={styles.rowWrap}>
            <JournalCard stateTone="weak" variant="warningSoft" style={styles.cardWidth}>
              <WMBadge state="weak" />
              <WMText variant="cardTitle">Warning soft</WMText>
              <WMText variant="bodySm">Uses semantic state tint softly. No alarm mood.</WMText>
            </JournalCard>

            <JournalCard stateTone="protected" variant="standard" style={styles.cardWidth}>
              <WMBadge state="protected" />
              <WMText variant="cardTitle">Protected tone</WMText>
              <WMText variant="bodySm">Child state can tint the surface without changing primitive meaning.</WMText>
            </JournalCard>
          </View>

          <JournalCard variant="nested">
            <WMText variant="bodyStrong">Nested</WMText>
            <WMText variant="bodySm">Secondary surface inside a larger card should look flatter and lighter.</WMText>
          </JournalCard>

          <JournalCard style={styles.cardWidth}>
            <WMText variant="cardTitle">Long Vietnamese wrapping</WMText>
            <WMText variant="bodySm">
              Day la mot doan noi dung tieng Viet dai hon de kiem tra viec xuong dong, khoang dem, va nhiep dieu cua the JournalCard tren man hinh nho ma khong gay tran ngang hay cam giac chat choi.
            </WMText>
          </JournalCard>

          <JournalCard actionable reducedMotion accessibilityLabel="Reduced motion review card" onPress={() => undefined}>
            <WMText variant="cardTitle">Reduced motion</WMText>
            <WMText variant="bodySm">Press feedback should collapse to nearly instant, with no bounce.</WMText>
          </JournalCard>
        </View>
      </BoardSection>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  cardWidth: {
    flexBasis: 260,
    flexGrow: 1,
  },
});
