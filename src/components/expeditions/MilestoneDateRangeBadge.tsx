import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { EntityChip } from "../primitives/EntityChip";
import { foundationColors } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { formatExpeditionDateRange } from "./detailModel";

type Props = {
  startDate?: string | Date;
  endDate?: string | Date;
  locale: Locale;
  style?: StyleProp<ViewStyle>;
};

export function MilestoneDateRangeBadge({ startDate, endDate, locale, style }: Props) {
  const label = formatExpeditionDateRange(startDate, endDate, locale);

  if (!label) {
    return null;
  }

  return <EntityChip label={label} size="compact" style={[styles.badge, style]} variant="metadata" />;
}

const styles = StyleSheet.create({
  badge: {
    borderColor: foundationColors.border.subtle,
  },
});
