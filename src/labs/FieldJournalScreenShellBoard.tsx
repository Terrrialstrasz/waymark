import { StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { FieldJournalScreenShell } from "../components/primitives/FieldJournalScreenShell";
import { WMText } from "../components/primitives/Text";
import { WMCard } from "../components/primitives/WMCard";
import { WMBadge } from "../components/primitives/WMBadge";
import { spacing } from "../theme/tokens";

export function FieldJournalScreenShellBoard() {
  return (
    <View style={styles.stack}>
      <BoardSection
        title="FieldJournalScreenShell"
        subtitle="Shared atmosphere only: safe area, paper canvas, page breathing room, bottom clearance, and optional botanical ambience."
      >
        <View style={styles.stack}>
          <ShellFrame title="standard">
            <FieldJournalScreenShell scrollable={false} variant="standard">
              <ShellSample label="Standard shell" note="Warm paper, default rhythm, no shell-owned state mood." />
            </FieldJournalScreenShell>
          </ShellFrame>

          <ShellFrame title="compact">
            <FieldJournalScreenShell scrollable={false} variant="compact">
              <ShellSample label="Compact detail shell" note="Tighter side padding, same calm tone." />
            </FieldJournalScreenShell>
          </ShellFrame>

          <ShellFrame title="quiet">
            <FieldJournalScreenShell scrollable={false} variant="quiet">
              <ShellSample label="Quiet reflection shell" note="More open vertical breathing room, lower background pressure." />
            </FieldJournalScreenShell>
          </ShellFrame>

          <ShellFrame title="plainPaper">
            <FieldJournalScreenShell scrollable={false} variant="plainPaper">
              <ShellSample label="Plain paper shell" note="Readability-first surface with minimal ambience." />
            </FieldJournalScreenShell>
          </ShellFrame>

          <ShellFrame title="botanicalSoft">
            <FieldJournalScreenShell scrollable={false} variant="botanicalSoft">
              <ShellSample label="Botanical soft shell" note="Subtle ambient motif only, no wallpaper effect." />
            </FieldJournalScreenShell>
          </ShellFrame>

          <ShellFrame title="navAware">
            <FieldJournalScreenShell scrollable={false} variant="navAware">
              <ShellSample label="Nav-aware shell" note="Bottom clearance reserved for bottom nav and center capture." />
              <View style={styles.navGhost} />
            </FieldJournalScreenShell>
          </ShellFrame>

          <ShellFrame title="noBottomNav">
            <FieldJournalScreenShell scrollable={false} variant="noBottomNav">
              <ShellSample label="No-bottom-nav shell" note="Detail mode with safe bottom padding only." />
            </FieldJournalScreenShell>
          </ShellFrame>

          <ShellFrame title="small-screen scroll">
            <FieldJournalScreenShell variant="navAware">
              <ShellSample label="Long content scroll" note="Bottom padding stays clear of nav area." />
              <WMCard>
                <WMText variant="bodySm">Section A</WMText>
              </WMCard>
              <WMCard>
                <WMText variant="bodySm">Section B</WMText>
              </WMCard>
              <WMCard>
                <WMText variant="bodySm">Section C</WMText>
              </WMCard>
              <WMCard>
                <WMText variant="bodySm">Section D</WMText>
              </WMCard>
            </FieldJournalScreenShell>
          </ShellFrame>

          <ShellFrame title="reduced motion">
            <FieldJournalScreenShell reducedMotion scrollable={false} variant="botanicalSoft">
              <ShellSample label="Reduced-motion shell" note="Ambient layer remains static and non-animated." />
            </FieldJournalScreenShell>
          </ShellFrame>
        </View>
      </BoardSection>
    </View>
  );
}

function ShellFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.frameStack}>
      <WMBadge label={title} state="protected" tone="outline" />
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

function ShellSample({ label, note }: { label: string; note: string }) {
  return (
    <View style={styles.sampleStack}>
      <WMText variant="pageTitle">{label}</WMText>
      <WMText variant="bodySm">{note}</WMText>
      <WMCard>
        <WMText variant="body">Child content owns its own skin. The shell only provides atmosphere and breathing room.</WMText>
      </WMCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  frameStack: {
    gap: spacing.sm,
  },
  frame: {
    height: 260,
    overflow: "hidden",
    borderRadius: 24,
  },
  sampleStack: {
    gap: spacing.md,
  },
  navGhost: {
    height: 36,
  },
});
