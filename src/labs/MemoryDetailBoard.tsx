import { MemoryDetailHarness } from "./MemoryDetailHarness";
import { Locale } from "../types/ui";

type Props = {
  locale: Locale;
};

export function MemoryDetailBoard({ locale }: Props) {
  return <MemoryDetailHarness locale={locale} />;
}
