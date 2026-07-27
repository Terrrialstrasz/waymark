import { StyleSheet } from "react-native";
import { CaptureOptionModel } from "../../mocks/data";
import { colors } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMCard } from "../primitives/WMCard";
import { WMText } from "../primitives/Text";

type Props = {
  item: CaptureOptionModel;
  locale: Locale;
};

export function CaptureOptionCard({ item, locale }: Props) {
  return (
    <WMCard gate={item.gate}>
      <WMText variant="display">{item.icon}</WMText>
      <WMText variant="cardTitle">{t(item.title, locale)}</WMText>
      <WMText style={styles.copy} variant="body">
        {t(item.body, locale)}
      </WMText>
    </WMCard>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: colors.textMuted,
  },
});
