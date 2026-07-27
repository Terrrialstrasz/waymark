import { StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import {
  getSemanticStateLabel,
  getSemanticStateToneStyle,
  semanticStateTokens,
  spacing,
} from "../theme/tokens";
import { WMBadge } from "../components/primitives/WMBadge";
import { WMText } from "../components/primitives/Text";

const primaryStates = ["planned", "active", "done", "protected", "weak", "missed", "warning"] as const;
const signalStates = ["active", "snoozed", "done", "quieted"] as const;

export function SemanticStateColorBoard() {
  return (
    <View style={styles.stack}>
      <BoardSection
        title="State chips"
        subtitle="State colors stay soft and readable. Color never carries meaning alone."
      >
        <View style={styles.rowWrap}>
          {primaryStates.map((state) => (
            <WMBadge key={state} state={state} />
          ))}
        </View>
      </BoardSection>

      <BoardSection title="State rows">
        <View style={styles.stackSm}>
          <StateRow description="Future intention with calm paper tab." state="planned" title="Planned Mark row" />
          <StateRow description="Proof captured without celebration." state="done" title="Done Mark row" />
          <StateRow description="Muted consequence, not punishment." state="missed" title="Missed PlannedMark row" />
          <StateRow description="Gentle care signal for an underfed path." state="weak" title="Weak Path row" />
        </View>
      </BoardSection>

      <BoardSection title="State cards">
        <View style={styles.stackSm}>
          <StateCard body="The path has enough proof to stay intact today." state="protected" title="Protected Path card" />
          <StateCard body="This path needs one honest touch, not panic." state="weak" title="Weak Path card" />
          <StateCard body="Use only for serious warning, not ordinary misses." state="warning" title="Warning card" />
        </View>
      </BoardSection>

      <BoardSection title="Dense state view">
        <View style={styles.weekRow}>
          <DenseCell label="P" state="planned" />
          <DenseCell label="A" state="active" />
          <DenseCell label="D" state="done" />
          <DenseCell label="S" state="protected" />
          <DenseCell label="C" state="weak" />
          <DenseCell label="M" state="missed" />
          <DenseCell label="!" state="warning" />
        </View>
      </BoardSection>

      <BoardSection title="Signal state view">
        <View style={styles.rowWrap}>
          {signalStates.map((state) => (
            <StateSignal key={state} state={state} />
          ))}
        </View>
      </BoardSection>

      <BoardSection title="Accessibility check">
        <View style={styles.stackSm}>
          {primaryStates.map((state) => {
            const tone = getSemanticStateToneStyle(state, "chip");
            return (
              <View key={state} style={styles.accessibilityRow}>
                <View style={[styles.dot, { backgroundColor: tone.accent }]} />
                <WMBadge state={state} />
                <WMText variant="meta">{`Screen reader: Morning pack check, ${getSemanticStateLabel(state, "en")}`}</WMText>
              </View>
            );
          })}
        </View>
      </BoardSection>

      <BoardSection title="Localization check">
        <View style={styles.stackSm}>
          {primaryStates.map((state) => (
            <View key={state} style={styles.localeRow}>
              <WMBadge locale="en" state={state} />
              <WMBadge locale="vi" state={state} />
            </View>
          ))}
        </View>
      </BoardSection>

      <BoardSection title="Token swatches">
        <View style={styles.stackSm}>
          {Object.entries(semanticStateTokens).map(([state, token]) => (
            <View key={state} style={[styles.swatchCard, { backgroundColor: token.bg, borderColor: token.border }]}>
              <WMText style={{ color: token.text }} variant="bodyStrong">
                {state}
              </WMText>
              <WMText style={{ color: token.text }} variant="meta">
                {`accent ${token.accent}`}
              </WMText>
            </View>
          ))}
        </View>
      </BoardSection>
    </View>
  );
}

function StateRow({
  state,
  title,
  description,
}: {
  state: "planned" | "done" | "missed" | "weak";
  title: string;
  description: string;
}) {
  const tone = getSemanticStateToneStyle(state, "subtle");
  return (
    <View style={[styles.rowCard, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={[styles.accentBar, { backgroundColor: tone.accent }]} />
      <View style={styles.rowCopy}>
        <View style={styles.rowHeader}>
          <WMText style={{ color: tone.text }} variant="bodyStrong">
            {title}
          </WMText>
          <WMBadge state={state} />
        </View>
        <WMText style={{ color: tone.text }} variant="bodySm">
          {description}
        </WMText>
      </View>
    </View>
  );
}

function StateCard({
  state,
  title,
  body,
}: {
  state: "protected" | "weak" | "warning";
  title: string;
  body: string;
}) {
  const tone = getSemanticStateToneStyle(state, "subtle");
  return (
    <View style={[styles.card, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <WMBadge state={state} />
      <WMText style={{ color: tone.text }} variant="cardTitle">
        {title}
      </WMText>
      <WMText style={{ color: tone.text }} variant="bodySm">
        {body}
      </WMText>
    </View>
  );
}

function DenseCell({ label, state }: { label: string; state: typeof primaryStates[number] }) {
  const tone = getSemanticStateToneStyle(state, "outline");
  return (
    <View style={[styles.denseCell, { borderColor: tone.border }]}>
      <View style={[styles.dot, { backgroundColor: tone.accent }]} />
      <WMText style={{ color: tone.text }} variant="meta">
        {label}
      </WMText>
    </View>
  );
}

function StateSignal({ state }: { state: typeof signalStates[number] }) {
  const tone = getSemanticStateToneStyle(state, "chip");
  return (
    <View style={[styles.signalCard, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={[styles.dot, { backgroundColor: tone.accent }]} />
      <WMText style={{ color: tone.text }} variant="bodyStrong">
        {getSemanticStateLabel(state, "en")}
      </WMText>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  stackSm: {
    gap: spacing.sm,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  rowCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 72,
  },
  accentBar: {
    width: 4,
  },
  rowCopy: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.sm,
  },
  weekRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  denseCell: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  signalCard: {
    minWidth: 120,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  accessibilityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  localeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  swatchCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
