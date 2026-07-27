import { isFeatureInteractive, isFeatureVisible } from "../../utils/featureGate";
import { PathSkin } from "../../tokens/pathVisualTokens";
import { EntityRow } from "../primitives/EntityRow";
import { PathAccentBadge } from "./PathAccentBadge";
import { MarkDetailExpeditionItem } from "../mark-detail/model";

type Props = {
  item: MarkDetailExpeditionItem;
  entityLabel: string;
  pathSkin: PathSkin;
  accessibilityHint?: string;
};

export function ContainerLinkRow({ item, entityLabel, pathSkin, accessibilityHint }: Props) {
  if (!isFeatureVisible(item.gate)) {
    return null;
  }

  const disabled = item.disabled || !item.onPress || !isFeatureInteractive(item.gate);

  return (
    <EntityRow
      accessibilityHint={accessibilityHint}
      accessibilityLabel={[item.title, entityLabel].filter(Boolean).join(". ")}
      accessibilityRole={disabled ? "text" : "link"}
      disabled={disabled}
      leading={
        item.icon ?? (
          <PathAccentBadge semanticName={item.iconSemanticName ?? "entity.expedition"} size="expeditionRowIcon" skin={pathSkin} />
        )
      }
      subtitle={item.milestoneLabel ?? item.description}
      onPress={disabled ? undefined : item.onPress}
      title={item.title}
      variant="compact"
    />
  );
}
