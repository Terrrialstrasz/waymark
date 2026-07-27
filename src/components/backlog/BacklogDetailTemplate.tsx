import { Locale } from "../../types/ui";
import { MarkDetailTemplate } from "../mark-detail/MarkDetailTemplate";
import { MarkDetailItem } from "../mark-detail/model";

type Props = {
  item: MarkDetailItem;
  locale?: Locale;
  onBack?: () => void;
  onOpenExpedition?: Parameters<typeof MarkDetailTemplate>[0]["onOpenExpedition"];
  onAddToWeeklyCoding?: (item: MarkDetailItem) => void;
  onDelete?: (item: MarkDetailItem) => void;
  onCreateMark?: (item: MarkDetailItem) => void;
};

export function BacklogDetailTemplate({
  item,
  locale = "en",
  onBack,
  onOpenExpedition,
  onAddToWeeklyCoding,
  onDelete,
  onCreateMark,
}: Props) {
  return (
    <MarkDetailTemplate
      actionButtons={[
        { id: "weekly", label: "Add to Weekly Coding", variant: "primary", onPress: onAddToWeeklyCoding ? () => onAddToWeeklyCoding(item) : undefined },
        { id: "delete", label: "Delete", variant: "secondary", onPress: onDelete ? () => onDelete(item) : undefined },
        { id: "create-mark", label: "Create Mark", variant: "secondary", onPress: onCreateMark ? () => onCreateMark(item) : undefined },
      ]}
      headerTitle="Backlog Detail"
      locale={locale}
      mark={item}
      onBack={onBack}
      onOpenExpedition={onOpenExpedition}
    />
  );
}
