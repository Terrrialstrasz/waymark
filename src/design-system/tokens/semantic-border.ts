import { foundationBorder, foundationBorderColor } from "./foundation-border";

export const semanticBorder = {
  none: foundationBorder.none,

  card: {
    default: foundationBorder.paper.soft,
    subtle: foundationBorder.paper.subtle,
    strong: foundationBorder.paper.strong,
  },

  row: {
    default: foundationBorder.paper.subtle,
    active: foundationBorder.active,
    selected: foundationBorder.selected,
  },

  divider: {
    subtle: foundationBorder.paper.subtle,
    default: foundationBorder.paper.soft,
  },

  chip: {
    default: foundationBorder.paper.subtle,
    planned: foundationBorder.planned,
    done: `1px solid ${foundationBorderColor.botanical.activeSoft}`,
    active: foundationBorder.active,
    weak: foundationBorder.weak,
    protected: foundationBorder.protected,
    missed: foundationBorder.missed,
    memory: foundationBorder.memory,
  },

  button: {
    primary: foundationBorder.none,
    secondary: foundationBorder.paper.soft,
    active: foundationBorder.active,
    disabled: foundationBorder.disabled,
  },

  nav: {
    default: foundationBorder.paper.soft,
    active: foundationBorder.active,
  },

  sheet: {
    default: foundationBorder.paper.soft,
  },

  media: {
    default: foundationBorder.paper.soft,
    memory: foundationBorder.memory,
  },

  state: {
    planned: foundationBorder.planned,
    done: `1px solid ${foundationBorderColor.botanical.activeSoft}`,
    active: foundationBorder.active,
    weak: foundationBorder.weak,
    protected: foundationBorder.protected,
    missed: foundationBorder.missed,
    skipped: foundationBorder.paper.strong,
    rescheduled: foundationBorder.proof,
    substituted: `1px solid ${foundationBorderColor.botanical.activeSoft}`,
  },

  focus: foundationBorder.focus,
} as const;

export type SemanticBorder = typeof semanticBorder;
