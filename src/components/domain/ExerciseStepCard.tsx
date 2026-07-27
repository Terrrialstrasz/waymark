import { ExerciseStepModel } from "../../mocks/data";
import { Locale } from "../../types/ui";
import { t } from "../../utils/localized";
import { WMBadge } from "../primitives/WMBadge";
import { WMCard } from "../primitives/WMCard";
import { WMText } from "../primitives/Text";

type Props = {
  item: ExerciseStepModel;
  locale: Locale;
};

function badgeState(state: ExerciseStepModel["state"]) {
  switch (state) {
    case "done":
      return "done";
    case "active":
      return "active";
    case "skipped":
      return "missed";
    default:
      return "upcoming";
  }
}

export function ExerciseStepCard({ item, locale }: Props) {
  return (
    <WMCard tint="muted">
      <WMBadge label={item.state} state={badgeState(item.state)} />
      <WMText variant="cardTitle">{t(item.title, locale)}</WMText>
      <WMText variant="meta">{t(item.target, locale)}</WMText>
      <WMText variant="body">{t(item.actual, locale)}</WMText>
    </WMCard>
  );
}
