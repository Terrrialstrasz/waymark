import { foundationColors, journalCardTokens, motionSemanticTokens, motionTokens, pathColors, semanticBorder, semanticElevation, semanticRadius, semanticSpacing, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";

export const journalVisualTokens = {
  colors: {
    // TODO: align these aliases to explicit surface.paper tokens once the semantic journal token set exists.
    surfacePaper: foundationColors.bg.paperWarm,
    surfacePaperRaised: foundationColors.bg.paper,
    surfacePhotoMat: foundationColors.bg.paperSoft,
    borderPaper: foundationColors.border.soft,
    borderPhotoGutter: foundationColors.bg.paper,
    inkPrimary: foundationColors.ink.primary,
    inkSecondary: foundationColors.ink.secondary,
    botanicalGreen: foundationColors.green.deep,
    accentGold: foundationColors.gold.base,
    statusProtected: foundationColors.green.deep,
    statusWarningMuted: foundationColors.gold.deep,
    pathAccents: pathColors,
  },
  spacing: {
    pagePadding: semanticSpacing.screen.x,
    cardPadding: semanticSpacing.card.padding.md,
    chipPaddingX: semanticSpacing.chip.paddingX,
    chipPaddingY: semanticSpacing.chip.paddingY,
    carouselGap: spacing.md,
    sectionGap: semanticSpacing.section.gap,
  },
  radius: {
    cardXl: semanticRadius.card.hero,
    mediaLg: semanticRadius.card.media,
    mediaMd: semanticRadius.card.default,
    chipPill: semanticRadius.chip,
    dateSealMd: semanticRadius.badge,
  },
  shadow: {
    cardSoft: semanticElevation.card,
    mediaSoft: semanticElevation.card,
    paperSubtle: semanticElevation.flat,
  },
  motion: {
    pressSoft: motionSemanticTokens.button.press.duration,
    imageFadeIn: motionTokens.duration.quick,
    menuOpenGentle: motionTokens.duration.standard,
    reducedMotion: motionTokens.duration.instant,
  },
} as const;

type PlaceholderPalette = {
  backgroundTop: string;
  backgroundBottom: string;
  accent: string;
  accentMuted: string;
  shadow: string;
};

const placeholderPalettes: PlaceholderPalette[] = [
  {
    backgroundTop: "#D7C4A3",
    backgroundBottom: "#876D4B",
    accent: "#F6E0A8",
    accentMuted: "#789D68",
    shadow: "rgba(43,42,34,0.22)",
  },
  {
    backgroundTop: "#C9D8B4",
    backgroundBottom: "#5B6B42",
    accent: "#F2D58A",
    accentMuted: "#AA7E4C",
    shadow: "rgba(43,42,34,0.2)",
  },
  {
    backgroundTop: "#D7BCA6",
    backgroundBottom: "#6C4F43",
    accent: "#EFE3BC",
    accentMuted: "#54735E",
    shadow: "rgba(43,42,34,0.24)",
  },
  {
    backgroundTop: "#C2D4CC",
    backgroundBottom: "#586C69",
    accent: "#F4DFA2",
    accentMuted: "#8A6240",
    shadow: "rgba(43,42,34,0.18)",
  },
];

export function getPlaceholderPhotoPalette(index = 0, seed: string | number = 0) {
  const hash = `${seed}:${index}`.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return placeholderPalettes[Math.abs(hash) % placeholderPalettes.length];
}

export function formatJournalDateLabel(date: Date, locale: Locale, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", options).format(date);
}

export function getJournalMonthLabel(date: Date, locale: Locale) {
  return formatJournalDateLabel(date, locale, { month: locale === "vi" ? "short" : "short" }).replace(".", "").toUpperCase();
}

export function getJournalDayLabel(date: Date, locale: Locale) {
  return formatJournalDateLabel(date, locale, { day: "numeric" });
}

export function getChipToneStyle(colorToken?: string) {
  if (!colorToken) {
    return {
      backgroundColor: foundationColors.bg.paperWarm,
      border: semanticBorder.chip.default,
      color: foundationColors.ink.secondary,
    };
  }

  return {
    backgroundColor: foundationColors.bg.paperWarm,
    border: `1px solid ${colorToken}`,
    color: colorToken,
  };
}

export const journalSkeletonColors = {
  base: foundationColors.bg.paperSoft,
  highlight: foundationColors.bg.paper,
};

export const journalChrome = {
  cardBorder: semanticBorder.card.default,
  subduedBorder: semanticBorder.card.subtle,
  photoBorder: semanticBorder.media.default,
  cardShadow: journalCardTokens.shadow.journal,
  pressedShadow: journalCardTokens.shadow.pressed,
  paperSurface: foundationColors.bg.paper,
  paperWarm: foundationColors.bg.paperWarm,
  photoMat: foundationColors.bg.paperSoft,
  ink: foundationColors.ink.primary,
  inkSecondary: foundationColors.ink.secondary,
  mutedInk: foundationColors.ink.tertiary,
  radiusLg: semanticRadius.card.media,
  radiusMd: semanticRadius.card.default,
  radiusSm: semanticRadius.card.compact,
  radiusPill: semanticRadius.chip,
};
