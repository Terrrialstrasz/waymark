import { View } from "react-native";
import { WMCard } from "../primitives/WMCard";
import { WMText } from "../primitives/Text";
import { EntityChip } from "../primitives/EntityChip";
import { Locale } from "../../types/ui";
import { spacing } from "../../theme/tokens";

type Props = {
  locale: Locale;
  title: string;
  resultLabel: string;
  supportingText: string;
  chips: Array<{ id: string; label: string }>;
};

export function CharacterResultSummary({ locale, title, resultLabel, supportingText, chips }: Props) {
  void locale;

  return (
    <WMCard contentStyle={{ gap: spacing.sm }} tint="muted">
      <View style={{ gap: spacing.xs }}>
        <WMText variant="sectionTitle">{title}</WMText>
        <WMText variant="bodyStrong">{resultLabel}</WMText>
        <WMText variant="body">{supportingText}</WMText>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
        {chips.map((chip) => (
          <EntityChip key={chip.id} label={chip.label} selected />
        ))}
      </View>
    </WMCard>
  );
}
