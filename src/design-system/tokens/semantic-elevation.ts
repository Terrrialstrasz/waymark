import { foundationShadow } from "./foundation-shadow";

export const semanticElevation = {
  flat: foundationShadow.none,

  row: foundationShadow.paper.low,

  card: foundationShadow.paper.medium,

  hero: foundationShadow.paper.hero,

  nav: foundationShadow.paper.high,

  sheet: foundationShadow.paper.high,

  capture: foundationShadow.float.capture,

  activeCard: foundationShadow.float.greenSoft,

  pressed: foundationShadow.inset.soft,

  focus: foundationShadow.focus,
} as const;

export type SemanticElevation = typeof semanticElevation;
