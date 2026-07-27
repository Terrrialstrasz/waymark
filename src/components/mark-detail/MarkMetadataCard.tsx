import { PathSkin } from "../../tokens/pathVisualTokens";
import { MarkDetailMetadataItem } from "./model";
import { MetadataList } from "../primitives/MetadataList";
import { JournalCard } from "../primitives/JournalCard";
import { PathAccentBadge } from "../detail/PathAccentBadge";

type Props = {
  items: MarkDetailMetadataItem[];
  pathSkin: PathSkin;
};

export function MarkMetadataCard({ items, pathSkin }: Props) {
  if (!items.length) {
    return null;
  }

  return (
    <JournalCard preserveSurfaceColorOnPress variant="readOnly">
      <MetadataList
        items={items.map((item) => ({
          id: item.id,
          label: item.label,
          value: item.value,
          leading:
            item.icon ??
            (item.iconSemanticName ? <PathAccentBadge semanticName={item.iconSemanticName} size="expeditionRowIcon" skin={pathSkin} /> : undefined),
          onPress: item.onPress,
        }))}
        showDividers
        variant="insideCard"
      />
    </JournalCard>
  );
}
