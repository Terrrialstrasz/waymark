import { JournalItemModel } from "../../mocks/data";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMBadge } from "../primitives/WMBadge";
import { WMCard } from "../primitives/WMCard";
import { WMText } from "../primitives/Text";

type Props = {
  item: JournalItemModel;
  locale: Locale;
};

export function JournalItem({ item, locale }: Props) {
  const state = item.state === "private_sensitive" ? "private_sensitive" : "done";
  return (
    <WMCard gate={item.gate}>
      <WMBadge label={item.kind} state={state} />
      <WMText variant="cardTitle">{t(item.title, locale)}</WMText>
      <WMText variant="body">{t(item.body, locale)}</WMText>
      <WMText variant="meta">{t(item.meta, locale)}</WMText>
    </WMCard>
  );
}
