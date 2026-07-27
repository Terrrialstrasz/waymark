export const foundationBorderColor = {
  none: "transparent",

  paper: {
    soft: "#E2D0AE",
    subtle: "#EBDCC0",
    strong: "#D4BD94",
  },

  botanical: {
    active: "#43A95D",
    activeStrong: "#2F7F46",
    activeSoft: "rgba(67, 169, 93, 0.38)",
  },

  gold: {
    proof: "#D9AD3F",
    proofStrong: "#A97822",
    proofSoft: "rgba(217, 173, 63, 0.42)",
  },

  clay: {
    weak: "#C07C5D",
    missed: "#D28778",
    weakSoft: "rgba(192, 124, 93, 0.42)",
    missedSoft: "rgba(210, 135, 120, 0.42)",
  },

  archive: {
    memory: "#7893A0",
    memorySoft: "rgba(120, 147, 160, 0.42)",
  },

  disabled: "#D7C8AA",

  focus: "#43A95D",
} as const;

export const foundationBorderWidth = {
  none: "0px",
  hairline: "1px",
  default: "1px",
  active: "1.5px",
  selected: "1.5px",
  focus: "2px",
} as const;

export const foundationBorderStyle = {
  solid: "solid",
  dashed: "dashed",
} as const;

export const foundationBorder = {
  none: "0px solid transparent",

  paper: {
    subtle: `1px solid ${foundationBorderColor.paper.subtle}`,
    soft: `1px solid ${foundationBorderColor.paper.soft}`,
    strong: `1px solid ${foundationBorderColor.paper.strong}`,
  },

  active: `1.5px solid ${foundationBorderColor.botanical.active}`,
  selected: `1.5px solid ${foundationBorderColor.botanical.active}`,
  protected: `1.5px solid ${foundationBorderColor.botanical.activeStrong}`,

  proof: `1px solid ${foundationBorderColor.gold.proof}`,
  planned: `1px solid ${foundationBorderColor.gold.proofSoft}`,

  weak: `1px solid ${foundationBorderColor.clay.weak}`,
  missed: `1px solid ${foundationBorderColor.clay.missed}`,

  memory: `1px solid ${foundationBorderColor.archive.memory}`,

  disabled: `1px solid ${foundationBorderColor.disabled}`,

  focus: `2px solid ${foundationBorderColor.focus}`,
} as const;

export type FoundationBorderColor = typeof foundationBorderColor;
export type FoundationBorderWidth = typeof foundationBorderWidth;
export type FoundationBorder = typeof foundationBorder;
