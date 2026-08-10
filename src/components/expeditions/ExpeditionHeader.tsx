import { StyleSheet, View } from "react-native";
import { UtilityIconButton } from "../domain/icons/UtilityIconButton";
import { EntityChip } from "../primitives/EntityChip";
import { WMText } from "../primitives/Text";
import { foundationColors, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { ExpeditionDetailItem } from "./types";
import {
  formatExpeditionDateRangeLong,
  getExpeditionStatusTone,
  getStatusLabel,
} from "./detailModel";
import { getCopy } from "../../i18n/copy";

type Props = {
  expedition: ExpeditionDetailItem;
  locale: Locale;
  onBack?: () => void;
};

export function ExpeditionHeader({ expedition, locale, onBack }: Props) {
  const copy = getCopy(locale).expeditionDetail;
  const subtitleParts = [expedition.subtitle, formatExpeditionDateRangeLong(expedition.startDate, expedition.endDate, locale)].filter(Boolean);

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <UtilityIconButton accessibilityLabel={copy.actions.back} icon="back" onPress={onBack} />
        <WMText style={styles.eyebrow} variant="sectionTitle">
          Expedition
        </WMText>
      </View>

      <WMText numberOfLines={2} style={styles.title} variant="display">
        {expedition.title}
      </WMText>

      {subtitleParts.length ? (
        <WMText numberOfLines={2} style={styles.subtitle} variant="bodyLg">
          {subtitleParts.join(" · ")}
        </WMText>
      ) : null}

      <View style={styles.chipRow}>
        <EntityChip label={getStatusLabel(expedition.status, locale)} size="compact" stateTone={getExpeditionStatusTone(expedition.status)} variant="status" />
        <EntityChip label={expedition.pathName} size="compact" variant="entity" />
        {expedition.daysLeftLabel ? <EntityChip iconSemanticName="utility.calendar" label={expedition.daysLeftLabel} size="compact" variant="metadata" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  eyebrow: {
    color: foundationColors.green.deep,
  },
  title: {
    color: foundationColors.ink.primary,
    marginTop: spacing.xxs,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
