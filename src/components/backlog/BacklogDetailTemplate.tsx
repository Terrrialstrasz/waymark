import { Locale } from "../../types/ui";
import { MarkDetailTemplate } from "../mark-detail/MarkDetailTemplate";
import { MarkDetailItem } from "../mark-detail/model";

type Props = {
  item: MarkDetailItem;
  locale?: Locale;
  onBack?: () => void;
  onOpenExpedition?: Parameters<typeof MarkDetailTemplate>[0]["onOpenExpedition"];
  onDelete?: (item: MarkDetailItem) => void;
  onCreateMark?: (item: MarkDetailItem) => void;
};

export function BacklogDetailTemplate({
  item,
  locale = "en",
  onBack,
  onOpenExpedition,
  onDelete,
  onCreateMark,
}: Props) {
  return (
    <MarkDetailTemplate
      actionButtons={[
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
