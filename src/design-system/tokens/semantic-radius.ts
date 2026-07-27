import { foundationRadius } from "./foundation-radius";

export const semanticRadius = {
  card: {
    compact: foundationRadius.md,
    default: foundationRadius.lg,
    hero: foundationRadius.xl,
    media: foundationRadius.xl,
  },
  row: {
    default: foundationRadius.md,
  },
  button: {
    default: foundationRadius.lg,
    compact: foundationRadius.md,
  },
  chip: foundationRadius.full,
  badge: 12,
  nav: foundationRadius["2xl"],
  sheet: foundationRadius["2xl"],
  capture: foundationRadius.full,
  timer: foundationRadius.full,
  image: 20,
  imageHero: foundationRadius.xl,
} as const;
