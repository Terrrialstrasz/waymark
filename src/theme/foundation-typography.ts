import { Platform } from "react-native";

type RuntimeFamily = {
  web: string;
  native: string;
};

function selectRuntimeFamily(family: RuntimeFamily) {
  return Platform.select({
    web: family.web,
    ios: family.native,
    android: family.native,
    default: family.native,
  });
}

const fallbackSerifStack = "ui-serif, Georgia, Cambria, serif";
const fallbackSansStack = "ui-sans-serif, system-ui, sans-serif";

export const typographyDirection = "Fresh Field Journal Serif";

export const fontFamilyTokens = {
  serifDisplay: {
    label: "Noto Serif Display",
    runtime: selectRuntimeFamily({
      web: `"Noto Serif Display", "Noto Serif", ${fallbackSerifStack}`,
      native: "serif",
    }),
  },
  serif: {
    label: "Noto Serif",
    runtime: selectRuntimeFamily({
      web: `"Noto Serif", ${fallbackSerifStack}`,
      native: "serif",
    }),
  },
  sans: {
    label: "Noto Sans",
    runtime: selectRuntimeFamily({
      web: `"Noto Sans", ${fallbackSansStack}`,
      native: Platform.select({
        ios: "System",
        android: "sans-serif",
        default: "sans-serif",
      }) as string,
    }),
  },
  numeric: {
    label: "Noto Sans",
    runtime: selectRuntimeFamily({
      web: `"Noto Sans", ${fallbackSansStack}`,
      native: Platform.select({
        ios: "System",
        android: "sans-serif",
        default: "sans-serif",
      }) as string,
    }),
  },
  fallbackSerif: fallbackSerifStack,
  fallbackSans: fallbackSansStack,
} as const;

export const typographyReviewOptions = [
  {
    id: "A",
    name: "Fresh Field Journal Serif",
    pairing: "Noto Serif Display + Noto Sans",
    status: "Recommended",
    notes: "Elegant, fresh, Vietnamese-safe, mobile-safe.",
    families: {
      display: fontFamilyTokens.serifDisplay.runtime,
      serif: fontFamilyTokens.serif.runtime,
      sans: fontFamilyTokens.sans.runtime,
    },
  },
  {
    id: "B",
    name: "Bookish Digital Journal",
    pairing: "Literata + Noto Sans",
    status: "Higher Risk",
    notes: "Warmer and more book-like, but needs tighter Vietnamese validation.",
    families: {
      display: Platform.select({
        web: `"Literata", "Noto Serif", ${fallbackSerifStack}`,
        ios: "serif",
        android: "serif",
        default: "serif",
      }),
      serif: Platform.select({
        web: `"Literata", "Noto Serif", ${fallbackSerifStack}`,
        ios: "serif",
        android: "serif",
        default: "serif",
      }),
      sans: fontFamilyTokens.sans.runtime,
    },
  },
  {
    id: "C",
    name: "Soft Universal Journal",
    pairing: "Noto Serif + Noto Sans",
    status: "Fallback",
    notes: "Safer and calmer, but less distinctive than Display.",
    families: {
      display: fontFamilyTokens.serif.runtime,
      serif: fontFamilyTokens.serif.runtime,
      sans: fontFamilyTokens.sans.runtime,
    },
  },
] as const;
