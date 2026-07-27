export const baseSpacing = {
  0: 0,
  1: 4,
  2: 6,
  3: 8,
  4: 12,
  5: 16,
  6: 20,
  7: 24,
  8: 32,
  9: 40,
  10: 48,
} as const;

export const spacingDirection = "Calm Field-Journal Rhythm";

export const semanticSpacing = {
  screen: {
    x: 20,
    xCompact: 16,
    top: 20,
    bottom: 96,
  },
  card: {
    padding: {
      sm: 12,
      md: 16,
      lg: 20,
    },
    gap: 12,
  },
  section: {
    gap: 24,
    gapLarge: 32,
  },
  row: {
    paddingY: 12,
    paddingX: 14,
    gap: 10,
  },
  chip: {
    gap: 6,
    paddingX: 10,
    paddingY: 5,
    wrapGap: 8,
  },
  button: {
    paddingX: 18,
    gap: 8,
    minHeight: 48,
  },
  sheet: {
    paddingX: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  nav: {
    paddingX: 12,
    safeBottom: 12,
  },
} as const;

export const densityTokens = {
  calm: {
    cardPadding: semanticSpacing.card.padding.md,
    sectionGap: semanticSpacing.section.gap,
  },
  compact: {
    cardPadding: semanticSpacing.card.padding.sm,
    sectionGap: 20,
  },
  hero: {
    cardPadding: semanticSpacing.card.padding.lg,
    sectionGap: semanticSpacing.section.gapLarge,
  },
  sheet: {
    cardPadding: semanticSpacing.sheet.paddingX,
    sectionGap: semanticSpacing.card.gap,
  },
  session: {
    cardPadding: semanticSpacing.card.padding.md,
    sectionGap: 20,
  },
} as const;
