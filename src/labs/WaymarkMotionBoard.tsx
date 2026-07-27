import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { WMChip } from "../components/primitives/WMChip";
import { WMButton } from "../components/primitives/WMButton";
import { WMIconButton } from "../components/primitives/WMIconButton";
import { CaptureLeafButton } from "../components/primitives/CaptureLeafButton";
import { WMSheet } from "../components/primitives/WMSheet";
import { WMListRow } from "../components/primitives/WMListRow";
import { WMAccordion } from "../components/primitives/WMAccordion";
import { CircularTimer } from "../components/primitives/CircularTimer";
import { WMText } from "../components/primitives/Text";
import { foundationColors, spacing } from "../theme/tokens";

type MotionTab = "buttonPress" | "sheet" | "accordion" | "timer" | "reduced";

const motionTabs: Array<{ id: MotionTab; label: string }> = [
  { id: "buttonPress", label: "Button Press" },
  { id: "sheet", label: "Sheet" },
  { id: "accordion", label: "Accordion" },
  { id: "timer", label: "Timer" },
  { id: "reduced", label: "Reduced" },
];

export function WaymarkMotionBoard() {
  const [activeTab, setActiveTab] = useState<MotionTab>("buttonPress");

  return (
    <View style={styles.stack}>
      <BoardSection
        subtitle="Reusable motion tokens for sheet, accordion, button press, and timer primitives."
        title="Waymark Motion Review"
      >
        <View style={styles.tabRow}>
          {motionTabs.map((tab) => (
            <WMChip key={tab.id} label={tab.label} onPress={() => setActiveTab(tab.id)} selected={activeTab === tab.id} />
          ))}
        </View>
      </BoardSection>

      {activeTab === "buttonPress" ? <ButtonPressBoard /> : null}
      {activeTab === "sheet" ? <SheetBoard /> : null}
      {activeTab === "accordion" ? <AccordionBoard /> : null}
      {activeTab === "timer" ? <TimerBoard /> : null}
      {activeTab === "reduced" ? <ReducedMotionBoard /> : null}
    </View>
  );
}

function ButtonPressBoard() {
  return (
    <>
      <BoardSection title="Motion/ButtonPress/Primary">
        <View style={styles.rowWrap}>
          <WMButton label="Mark today" variant="primary" />
          <WMButton label="Disabled" variant="primary" disabled />
          <WMButton label="Loading" variant="primary" loading />
        </View>
      </BoardSection>

      <BoardSection title="Motion/ButtonPress/Secondary">
        <View style={styles.rowWrap}>
          <WMButton label="Review note" variant="secondary" />
          <WMButton label="Ghost action" variant="ghost" />
          <WMIconButton icon="⋯" label="More" />
        </View>
      </BoardSection>

      <BoardSection title="Motion/ButtonPress/CaptureLeaf">
        <View style={styles.captureRow}>
          <CaptureLeafButton accessibilityLabel="Capture" />
          <CaptureLeafButton accessibilityLabel="Capture open" active accessibilityLabelOpen="Capture chooser open" />
          <CaptureLeafButton accessibilityLabel="Capture disabled" disabled />
        </View>
      </BoardSection>
    </>
  );
}

function SheetBoard() {
  const [sheetState, setSheetState] = useState<"closed" | "open">("closed");

  return (
    <BoardSection
      subtitle="Bottom page reveal only. No bounce, no launcher feel, no dark corporate modal."
      title="Motion/Sheet/CaptureChooser"
    >
      <View style={styles.rowWrap}>
        <WMButton label="Open sheet" onPress={() => setSheetState("open")} variant="primary" />
        <WMButton label="Close sheet" onPress={() => setSheetState("closed")} variant="secondary" />
      </View>
      <WMSheet onClose={() => setSheetState("closed")} title="Capture" visible={sheetState === "open"}>
        <View style={styles.sheetStack}>
          <WMListRow elevated action={() => undefined} subtitle="Turn a quick proof into a real mark." title="Mark" />
          <WMListRow elevated action={() => undefined} subtitle="Keep the moment with a softer memory note." title="Memory" />
          <WMListRow elevated action={() => undefined} subtitle="Save the idea without forcing it into today." title="Backlog" />
        </View>
      </WMSheet>
    </BoardSection>
  );
}

function AccordionBoard() {
  return (
    <>
      <BoardSection title="Motion/Accordion/Standard">
        <View style={styles.stack}>
          <WMAccordion
            subtitle="Like opening a folded note, not a dashboard widget."
            title="Weekly coding note"
          >
            <WMText variant="bodySm">
              Keep the reveal quiet. The body fades in and settles upward slightly while the chevron rotates into place.
            </WMText>
            <WMText variant="bodySm">
              Vietnamese and longer localized content should expand from measured height, not from a guessed row count.
            </WMText>
          </WMAccordion>

          <WMAccordion
            defaultExpanded
            subtitle="Expanded example for localization tolerance."
            title="Ghi chu tuan nay"
          >
            <WMText variant="bodySm">
              Day gio dang mo san de review. Motion o day chi co opacity va mot chut vertical reveal, khong co bounce hay auto scroll.
            </WMText>
          </WMAccordion>
        </View>
      </BoardSection>
    </>
  );
}

function TimerBoard() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const totalSeconds = 20;

  useEffect(() => {
    if (!running) {
      return;
    }

    const id = setInterval(() => {
      setElapsed((current) => {
        if (current >= totalSeconds) {
          setRunning(false);
          return totalSeconds;
        }
        return current + 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [running]);

  const timerState = useMemo(() => {
    if (elapsed >= totalSeconds) {
      return "completed" as const;
    }
    if (elapsed >= totalSeconds - 5) {
      return "warning" as const;
    }
    if (!running && elapsed > 0) {
      return "paused" as const;
    }
    return "running" as const;
  }, [elapsed, running]);

  return (
    <>
      <BoardSection title="Motion/Timer/Circular">
        <View style={styles.timerRow}>
          <CircularTimer
            accessibilityHint="Tap to pause, resume, or reset this timer."
            accessibilityLabel={
              elapsed >= totalSeconds
                ? "Session timer completed. Tap to reset."
                : running
                  ? "Session timer running. Tap to pause."
                  : "Session timer paused. Tap to continue."
            }
            elapsedSeconds={elapsed}
            onPress={() => {
              if (elapsed >= totalSeconds) {
                setElapsed(0);
                setRunning(true);
                return;
              }

              setRunning((current) => !current);
            }}
            phaseLabel={running ? "Focused block" : "Paused"}
            state={timerState}
            totalSeconds={totalSeconds}
          />
          <CircularTimer elapsedSeconds={totalSeconds} phaseLabel="Completed" state="completed" totalSeconds={totalSeconds} />
        </View>
        <WMText style={styles.caption} variant="meta">
          Tap inside the timer: running pauses, paused continues, 00:00 resets.
        </WMText>
      </BoardSection>
    </>
  );
}

function ReducedMotionBoard() {
  return (
    <>
      <BoardSection title="Motion/ReducedMotion">
        <View style={styles.stack}>
          <WMText style={styles.caption} variant="bodySm">
            Reduced motion keeps fade/state clarity and removes large translate, scale, and rotation emphasis.
          </WMText>
          <View style={styles.captureRow}>
            <CaptureLeafButton accessibilityLabel="Capture reduced motion" reducedMotion />
          </View>
          <WMAccordion reducedMotion subtitle="Instant layout change, calm content visibility." title="Reduced motion accordion">
            <WMText variant="bodySm">No bouncing, no overshoot, and no decorative motion.</WMText>
          </WMAccordion>
          <View style={styles.timerRow}>
            <CircularTimer elapsedSeconds={8} phaseLabel="Reduced motion" reducedMotion state="running" totalSeconds={20} />
          </View>
        </View>
      </BoardSection>
    </>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    alignItems: "center",
  },
  captureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 112,
  },
  sheetStack: {
    gap: spacing.xs,
  },
  timerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  caption: {
    color: foundationColors.ink.secondary,
  },
});
