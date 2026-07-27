import { getCopy } from "./copy";
import { Locale } from "../types/ui";

export const useCopy = (locale: Locale) => getCopy(locale);
