import { StyleSheet } from "react-native";
import { WeeklyReportModel } from "../../mocks/data";
import { colors } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMCard } from "../primitives/WMCard";
import { WMProgressLine } from "../primitives/WMProgressLine";
import { WMText } from "../primitives/Text";

type Props = {
  item: WeeklyReportModel;
  locale: Locale;
};

export function WeeklyReportCard({ item, locale }: Props) {
  return (
    <WMCard gate={item.gate} tint="blue">
      <WMText variant="cardTitle">{t(item.title, locale)}</WMText>
      <WMText style={styles.copy} variant="body">
        {t(item.summary, locale)}
      </WMText>
      <WMText variant="body">{t(item.pathBalance, locale)}</WMText>
      <WMProgressLine label={t(item.completionLabel, locale)} value={0.75} tint="blue" />
    </WMCard>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.textMuted,
  },
});
