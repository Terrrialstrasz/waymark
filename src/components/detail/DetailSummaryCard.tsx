import { StyleSheet, View } from "react-native";
import { EntityChip } from "../primitives/EntityChip";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";
import { SemanticState, foundationColors, spacing } from "../../theme/tokens";

type SummaryChip = {
  id: string;
  label: string;
  stateTone?: Exclude<SemanticState, "hidden">;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
};

type Props = {
  title: string;
  note?: string;
  chips: SummaryChip[];
};

export function DetailSummaryCard({ title, note, chips }: Props) {
  return (
    <JournalCard decorative decorationPreset="journalCard" variant="standard">
      <View style={styles.stack}>
        <WMText numberOfLines={3} style={styles.title} variant="cardTitle">
          {title}
        </WMText>
        {note ? (
          <WMText numberOfLines={2} style={styles.note} variant="bodySm">
            {note}
          </WMText>
        ) : null}
        {chips.length ? (
          <View style={styles.chipRow}>
            {chips.map((chip) =>
              chip.stateTone ? (
                <EntityChip key={chip.id} label={chip.label} stateTone={chip.stateTone} variant="status" />
              ) : (
                <View
                  key={chip.id}
                  style={[
                    styles.customChip,
                    {
                      backgroundColor: chip.backgroundColor ?? "transparent",
                      borderColor: chip.borderColor ?? foundationColors.border.subtle,
                    },
                  ]}
                >
                  <WMText style={{ color: chip.textColor ?? foundationColors.ink.secondary }} variant="chip">
                    {chip.label}
                  </WMText>
                </View>
              )
            )}
          </View>
        ) : null}
      </View>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  note: {
    color: foundationColors.ink.secondary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  customChip: {
    minHeight: 28,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
