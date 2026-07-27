export const foundationShadow = {
  none: "none",

  paper: {
    low: "0 4px 10px rgba(80, 58, 22, 0.06)",
    medium: "0 10px 24px rgba(80, 58, 22, 0.10)",
    high: "0 18px 42px rgba(80, 58, 22, 0.12)",
    hero: "0 16px 36px rgba(80, 58, 22, 0.11)",
  },

  float: {
    capture: "0 20px 44px rgba(47, 127, 70, 0.18)",
    greenSoft: "0 12px 28px rgba(67, 169, 93, 0.12)",
  },

  inset: {
    soft: "inset 0 1px 4px rgba(80, 58, 22, 0.10)",
  },

  focus: "0 0 0 3px rgba(67, 169, 93, 0.22)",
} as const;

export type FoundationShadow = typeof foundationShadow;
