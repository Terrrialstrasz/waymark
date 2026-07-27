import { getPathsCopy } from "../../i18n/pathsCopy";
import { getWaymarkImageAsset } from "../../assets/imageRegistry";
import { getPathHeroImage } from "../../tokens/pathHeroImages";
import { Locale, PathId } from "../../types/ui";
import { t } from "../../utils/localized";
import { HorizontalJournalEntryCard } from "../journal";
import { NextMarkItem } from "./types";

type Props = {
  item: NextMarkItem;
  locale: Locale;
  pathId: PathId;
  pathLabel: string;
  onPress?: (item: NextMarkItem) => void;
};

function getTimingLabel(locale: Locale, state: NextMarkItem["timingState"]) {
  const c = getPathsCopy(locale);
  switch (state) {
    case "today":
      return c.nextMarks.today;
    case "this_week":
      return c.nextMarks.thisWeek;
    case "planned":
      return c.nextMarks.planned;
    case "upcoming":
      return c.nextMarks.upcoming;
    case "missed":
      return c.nextMarks.missed;
  }
}

function getTimingTone(state: NextMarkItem["timingState"]) {
  switch (state) {
    case "today":
      return "active" as const;
    case "this_week":
      return "protected" as const;
    case "planned":
      return "planned" as const;
    case "upcoming":
      return "upcoming" as const;
    case "missed":
      return "missed" as const;
  }
}

export function NextMarkRow({ item, locale, pathId, pathLabel, onPress }: Props) {
  const timingLabel = getTimingLabel(locale, item.timingState);
  const title = t(item.title, locale);
  const hero = getPathHeroImage(pathId);
  return (
    <HorizontalJournalEntryCard
      backgroundPaintImage={hero?.assetId ? getWaymarkImageAsset(hero.assetId)?.src : undefined}
      backgroundPaintInfo={
        hero?.assetId
          ? {
              assetId: hero.assetId,
              assetVariant: "hero",
              focalPoint: hero.focalPoint,
              sourceKind: "path-hero",
              title,
            }
          : {
              sourceKind: "unknown",
              title,
            }
      }
      density="compact"
      entryType="mark"
      chips={[
        { id: "timing", label: timingLabel, stateTone: getTimingTone(item.timingState), variant: "status" },
        ...(item.disabled
          ? [{ id: "disabled", label: getPathsCopy(locale).nextMarks.disabled, variant: "metadata" as const }]
          : []),
      ]}
      onPress={onPress ? () => onPress(item) : undefined}
      pathId={pathId}
      pathLabel={pathLabel}
      showDetailText={false}
      status={item.timingState === "missed" ? "missed" : "planned"}
      title={title}
    />
  );
}
