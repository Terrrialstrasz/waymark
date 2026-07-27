import { getPathsCopy } from "../../i18n/pathsCopy";
import { getWaymarkImageAsset } from "../../assets/imageRegistry";
import { getPathHeroImage } from "../../tokens/pathHeroImages";
import { Locale, PathId } from "../../types/ui";
import { t } from "../../utils/localized";
import { EntityRow } from "../primitives/EntityRow";
import { PathProofItem } from "./types";
import { HorizontalJournalEntryCard } from "../journal";

type Props = {
  item: PathProofItem;
  locale: Locale;
  pathId: PathId;
  pathLabel: string;
  onPress?: (item: PathProofItem) => void;
};

export function RecentProofRow({ item, locale, pathId, pathLabel, onPress }: Props) {
  const c = getPathsCopy(locale);

  if (item.loading) {
    return (
      <EntityRow
        loading
        leadingIconSemanticName="entity.mark"
        subtitle={c.common.loading}
        title={c.common.loading}
        variant="actionable"
      />
    );
  }

  const title = t(item.title, locale);
  const metadata = t(item.metadata, locale);
  const kindLabel = item.kind === "mark" ? c.proof.markLabel : c.proof.memoryLabel;
  const chipStateTone = item.kind === "mark" ? "done" : "protected";
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
      entryType={item.kind === "memory" ? "memory" : "mark"}
      chips={[
        { id: "kind", label: kindLabel, stateTone: chipStateTone, variant: "status" },
        { id: "date", label: metadata, variant: "metadata" },
      ]}
      onPress={onPress ? () => onPress(item) : undefined}
      pathId={pathId}
      pathLabel={pathLabel}
      showDetailText={false}
      title={title}
    />
  );
}
