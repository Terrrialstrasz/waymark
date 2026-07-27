import { useCopy } from "../../i18n/useCopy";
import { MarkDetailTemplate } from "../mark-detail/MarkDetailTemplate";
import { MarkDetailTemplateProps } from "../mark-detail/model";

export function MemoryDetailTemplate({ locale = "en", ...props }: MarkDetailTemplateProps) {
  const c = useCopy(locale);

  return <MarkDetailTemplate {...props} entityKind="memory" headerTitle={c.memoryDetail.title} locale={locale} />;
}
