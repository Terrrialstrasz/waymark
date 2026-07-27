import { View } from "react-native";
import { PackCheckItemModel } from "../../mocks/data";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMBadge } from "../primitives/WMBadge";
import { WMListRow } from "../primitives/WMListRow";

type Props = {
  items: PackCheckItemModel[];
  locale: Locale;
};

export function PackCheckList({ items, locale }: Props) {
  return (
    <View>
      {items.map((item) => (
        <WMListRow
          key={item.id}
          icon={item.checked ? "✓" : item.skipped ? "–" : "○"}
          title={t(item.label, locale)}
          trailing={
            item.checked
              ? locale === "en"
                ? "Ready"
                : "Đã sẵn sàng"
              : locale === "en"
                ? "Pending"
                : "Chưa xong"
          }
        />
      ))}
    </View>
  );
}
