import { Locale } from "../types/ui";

export function t<T extends string | string[]>(
  value: Record<Locale, T>,
  locale: Locale
): T {
  return value[locale];
}
