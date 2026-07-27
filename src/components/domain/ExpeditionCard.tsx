import { StyleSheet } from "react-native";
import { ExpeditionModel } from "../../mocks/data";
import { colors } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMBadge } from "../primitives/WMBadge";
import { WMCard } from "../primitives/WMCard";
import { WMProgressLine } from "../primitives/WMProgressLine";
import { WMText } from "../primitives/Text";

type Props = {
  item: ExpeditionModel;
  locale: Locale;
};

export function ExpeditionCard({ item, locale }: Props) {
  return (
    <WMCard gate={item.gate} tint="blue">
      <WMBadge label={item.state} state={item.state} />
      <WMText variant="cardTitle">{t(item.title, locale)}</WMText>
      <WMText style={styles.copy} variant="body">
        {t(item.summary, locale)}
      </WMText>
      <WMText variant="meta">{t(item.pathLabel, locale)}</WMText>
      <WMProgressLine label={t(item.milestoneLabel, locale)} value={item.progress} tint="blue" />
    </WMCard>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.textMuted,
  },
});
