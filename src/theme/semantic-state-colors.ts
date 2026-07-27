type StateTone = "subtle" | "chip" | "solid" | "outline" | "ghost";

export const semanticStateLabels = {
  planned: { en: "Planned", vi: "Da len ke hoach" },
  upcoming: { en: "Upcoming", vi: "Sap toi" },
  active: { en: "Active", vi: "Dang thuc hien" },
  done: { en: "Done", vi: "Da hoan thanh" },
  protected: { en: "Protected", vi: "Da duoc bao ve" },
  weak: { en: "Needs care", vi: "Can cham soc" },
  missed: { en: "Missed", vi: "Da lo" },
  warning: { en: "Warning", vi: "Canh bao" },
  disabled: { en: "Unavailable", vi: "Chua kha dung" },
  rescue: { en: "Rescue", vi: "Cuu ngay" },
  substituted: { en: "Substituted", vi: "Da thay the" },
  snoozed: { en: "Later", vi: "De sau" },
  quieted: { en: "Quieted", vi: "Da tat nhe" },
  empty: { en: "Empty", vi: "Chua co gi" },
  error: { en: "Error", vi: "Loi" },
} as const;

export const semanticStateTokens = {
  planned: {
    bg: "#F2F0E7",
    border: "#DDD6C4",
    text: "#5F5848",
    accent: "#B9A978",
    icon: "#B9A978",
    pressedBg: "#EBE6D8",
    mutedBg: "#F7F4EC",
    subtleBg: "#F6F3EA",
    chipBg: "#F2EEE2",
    solidBg: "#B9A978",
    ghostText: "#7D725E",
  },
  upcoming: {
    bg: "#EEF4F7",
    border: "#CBDDE6",
    text: "#3D6272",
    accent: "#1172BA",
    icon: "#1172BA",
    pressedBg: "#E4EEF2",
    mutedBg: "#F3F7F9",
    subtleBg: "#F5F8FA",
    chipBg: "#EDF4F8",
    solidBg: "#1172BA",
    ghostText: "#587482",
  },
  active: {
    bg: "#E8F6F1",
    border: "#BCE2D2",
    text: "#166047",
    accent: "#03A550",
    icon: "#03A550",
    pressedBg: "#DDF1E9",
    mutedBg: "#F0F8F4",
    subtleBg: "#F3FAF6",
    chipBg: "#E5F4EE",
    solidBg: "#03A550",
    ghostText: "#1C7254",
  },
  done: {
    bg: "#E6F5EA",
    border: "#B9DEC3",
    text: "#1F6B3E",
    accent: "#03A550",
    icon: "#03A550",
    pressedBg: "#DAEEDD",
    mutedBg: "#F0F8F1",
    subtleBg: "#F2FAF3",
    chipBg: "#E2F1E5",
    solidBg: "#03A550",
    ghostText: "#2E764A",
  },
  protected: {
    bg: "#EAF3F7",
    border: "#BFD9E6",
    text: "#23566D",
    accent: "#1172BA",
    icon: "#1172BA",
    pressedBg: "#DFEDF3",
    mutedBg: "#F1F6F8",
    subtleBg: "#F4F8FA",
    chipBg: "#E7F0F5",
    solidBg: "#1172BA",
    ghostText: "#3D7086",
  },
  weak: {
    bg: "#FFF6DC",
    border: "#E9CF86",
    text: "#735915",
    accent: "#F3B30F",
    icon: "#D39A10",
    pressedBg: "#FBEFCA",
    mutedBg: "#FFF9EB",
    subtleBg: "#FFF9EF",
    chipBg: "#FFF2D0",
    solidBg: "#F3B30F",
    ghostText: "#8A6C1E",
  },
  missed: {
    bg: "#EFE9E1",
    border: "#D6CBC0",
    text: "#6A5C50",
    accent: "#A88972",
    icon: "#A88972",
    pressedBg: "#E5DDD4",
    mutedBg: "#F4F0EA",
    subtleBg: "#F7F3ED",
    chipBg: "#ECE5DB",
    solidBg: "#A88972",
    ghostText: "#7B6A5C",
  },
  warning: {
    bg: "#FCE7E5",
    border: "#F1B9B6",
    text: "#8B2525",
    accent: "#EB2428",
    icon: "#D6373A",
    pressedBg: "#F8DAD8",
    mutedBg: "#FDF0EE",
    subtleBg: "#FEF4F2",
    chipBg: "#FCE5E2",
    solidBg: "#EB2428",
    ghostText: "#9A3939",
  },
  disabled: {
    bg: "#ECEAE4",
    border: "#D8D4C8",
    text: "#9A9487",
    accent: "#BDB6A8",
    icon: "#BDB6A8",
    pressedBg: "#ECEAE4",
    mutedBg: "#F2F0EB",
    subtleBg: "#F6F4F0",
    chipBg: "#ECE9E2",
    solidBg: "#BDB6A8",
    ghostText: "#A89F92",
  },
  rescue: {
    bg: "#F4F7DF",
    border: "#D7E19B",
    text: "#52651E",
    accent: "#8BA83D",
    icon: "#8BA83D",
    pressedBg: "#ECF0CF",
    mutedBg: "#F7F9EA",
    subtleBg: "#FAFBF1",
    chipBg: "#F1F5DA",
    solidBg: "#8BA83D",
    ghostText: "#65782E",
  },
  substituted: {
    bg: "#FFF3D1",
    border: "#E7C46A",
    text: "#6F520E",
    accent: "#F3B30F",
    icon: "#C69312",
    pressedBg: "#FBEAB9",
    mutedBg: "#FFF7E5",
    subtleBg: "#FFF9EC",
    chipBg: "#FFF0C9",
    solidBg: "#F3B30F",
    ghostText: "#81631D",
  },
  snoozed: {
    bg: "#F6EDE1",
    border: "#E0C6A7",
    text: "#6D4F2E",
    accent: "#C98B3A",
    icon: "#C98B3A",
    pressedBg: "#F0E2D0",
    mutedBg: "#F8F1E8",
    subtleBg: "#FBF6EF",
    chipBg: "#F5E9DA",
    solidBg: "#C98B3A",
    ghostText: "#7F603F",
  },
  quieted: {
    bg: "#EFEDE8",
    border: "#D8D3C8",
    text: "#777064",
    accent: "#AAA28F",
    icon: "#AAA28F",
    pressedBg: "#E6E2DA",
    mutedBg: "#F4F2ED",
    subtleBg: "#F7F5F1",
    chipBg: "#ECE8E0",
    solidBg: "#AAA28F",
    ghostText: "#857C6E",
  },
  skipped: {
    bg: "#EFEDE8",
    border: "#D8D3C8",
    text: "#777064",
    accent: "#AAA28F",
    icon: "#AAA28F",
    pressedBg: "#E6E2DA",
    mutedBg: "#F4F2ED",
    subtleBg: "#F7F5F1",
    chipBg: "#ECE8E0",
    solidBg: "#AAA28F",
    ghostText: "#857C6E",
  },
  rescheduled: {
    bg: "#F6EDE1",
    border: "#E0C6A7",
    text: "#6D4F2E",
    accent: "#C98B3A",
    icon: "#C98B3A",
    pressedBg: "#F0E2D0",
    mutedBg: "#F8F1E8",
    subtleBg: "#FBF6EF",
    chipBg: "#F5E9DA",
    solidBg: "#C98B3A",
    ghostText: "#7F603F",
  },
  empty: {
    bg: "#F7F4EA",
    border: "#E2D9C7",
    text: "#807665",
    accent: "#C5B68D",
    icon: "#C5B68D",
    pressedBg: "#EFEADD",
    mutedBg: "#FAF7F0",
    subtleBg: "#FCFAF5",
    chipBg: "#F5F1E6",
    solidBg: "#C5B68D",
    ghostText: "#928675",
  },
  error: {
    bg: "#FCE7E5",
    border: "#F1B9B6",
    text: "#8B2525",
    accent: "#EB2428",
    icon: "#EB2428",
    pressedBg: "#F8DAD8",
    mutedBg: "#FDF0EE",
    subtleBg: "#FEF4F2",
    chipBg: "#FCE5E2",
    solidBg: "#EB2428",
    ghostText: "#9A3939",
  },
  private_sensitive: {
    bg: "#F1EEE8",
    border: "#DDD6C9",
    text: "#6B6458",
    accent: "#AAA28F",
    icon: "#AAA28F",
    pressedBg: "#EAE4DB",
    mutedBg: "#F6F3EE",
    subtleBg: "#F8F6F2",
    chipBg: "#EFEAE1",
    solidBg: "#AAA28F",
    ghostText: "#7B7368",
  },
  archived: {
    bg: "#EEF2F3",
    border: "#CBD7DC",
    text: "#566C76",
    accent: "#7893A0",
    icon: "#7893A0",
    pressedBg: "#E4EAED",
    mutedBg: "#F4F7F8",
    subtleBg: "#F7F9FA",
    chipBg: "#EBF0F2",
    solidBg: "#7893A0",
    ghostText: "#687E89",
  },
} as const;

export type CanonicalSemanticState =
  | "planned"
  | "upcoming"
  | "active"
  | "done"
  | "protected"
  | "weak"
  | "missed"
  | "warning"
  | "disabled"
  | "rescue"
  | "substituted"
  | "snoozed"
  | "quieted"
  | "skipped"
  | "rescheduled"
  | "empty"
  | "error";

export type InternalSemanticState = "private_sensitive" | "archived";

export type LegacySemanticState =
  | "due_now"
  | "postponed"
  | "blocked"
  | "alive"
  | "neglected"
  | "growing"
  | "paused"
  | "partial"
  | "hidden"
  | InternalSemanticState;

export type SemanticState = CanonicalSemanticState | LegacySemanticState | InternalSemanticState;

export const semanticStateAliases: Record<LegacySemanticState, keyof typeof semanticStateTokens> = {
  due_now: "active",
  postponed: "snoozed",
  blocked: "weak",
  alive: "active",
  neglected: "weak",
  growing: "protected",
  paused: "quieted",
  partial: "rescue",
  hidden: "disabled",
  private_sensitive: "private_sensitive",
  archived: "archived",
} as const;

export type ResolvedSemanticState = keyof typeof semanticStateTokens;

export function resolveSemanticState(state: SemanticState): ResolvedSemanticState {
  if (state in semanticStateAliases) {
    return semanticStateAliases[state as LegacySemanticState];
  }
  return state as ResolvedSemanticState;
}

export function getSemanticStateStyle(state: Exclude<SemanticState, "hidden">) {
  return semanticStateTokens[resolveSemanticState(state)];
}

export function getSemanticStateLabel(state: SemanticState, locale: "en" | "vi" = "en") {
  const resolved = resolveSemanticState(state);
  if (resolved in semanticStateLabels) {
    return semanticStateLabels[resolved as keyof typeof semanticStateLabels][locale];
  }
  return resolved;
}

export function getSemanticStateToneStyle(state: Exclude<SemanticState, "hidden">, tone: StateTone) {
  const token = getSemanticStateStyle(state);

  switch (tone) {
    case "subtle":
      return {
        bg: token.subtleBg,
        text: token.text,
        border: token.border,
        accent: token.accent,
        icon: token.icon,
      };
    case "chip":
      return {
        bg: token.chipBg,
        text: token.text,
        border: token.border,
        accent: token.accent,
        icon: token.icon,
      };
    case "solid":
      return {
        bg: token.solidBg,
        text: "#FFFDF4",
        border: token.solidBg,
        accent: token.solidBg,
        icon: "#FFFDF4",
      };
    case "outline":
      return {
        bg: "transparent",
        text: token.text,
        border: token.border,
        accent: token.accent,
        icon: token.icon,
      };
    case "ghost":
      return {
        bg: "transparent",
        text: token.ghostText,
        border: "transparent",
        accent: token.accent,
        icon: token.icon,
      };
    default:
      return {
        bg: token.bg,
        text: token.text,
        border: token.border,
        accent: token.accent,
        icon: token.icon,
      };
  }
}

export const semanticStateStyles: Record<
  Exclude<SemanticState, "hidden">,
  { bg: string; fg: string; border: string; accent: string; icon: string; pressedBg: string; mutedBg: string }
> = {
  planned: mapStateStyle("planned"),
  upcoming: mapStateStyle("upcoming"),
  active: mapStateStyle("active"),
  done: mapStateStyle("done"),
  protected: mapStateStyle("protected"),
  weak: mapStateStyle("weak"),
  missed: mapStateStyle("missed"),
  warning: mapStateStyle("warning"),
  disabled: mapStateStyle("disabled"),
  rescue: mapStateStyle("rescue"),
  substituted: mapStateStyle("substituted"),
  snoozed: mapStateStyle("snoozed"),
  quieted: mapStateStyle("quieted"),
  skipped: mapStateStyle("skipped"),
  rescheduled: mapStateStyle("rescheduled"),
  empty: mapStateStyle("empty"),
  error: mapStateStyle("error"),
  private_sensitive: mapStateStyle("private_sensitive"),
  archived: mapStateStyle("archived"),
  due_now: mapStateStyle("active"),
  postponed: mapStateStyle("snoozed"),
  blocked: mapStateStyle("weak"),
  alive: mapStateStyle("active"),
  neglected: mapStateStyle("weak"),
  growing: mapStateStyle("protected"),
  paused: mapStateStyle("quieted"),
  partial: mapStateStyle("rescue"),
} as const;

function mapStateStyle(state: ResolvedSemanticState) {
  const token = semanticStateTokens[state];
  return {
    bg: token.bg,
    fg: token.text,
    border: token.border,
    accent: token.accent,
    icon: token.icon,
    pressedBg: token.pressedBg,
    mutedBg: token.mutedBg,
  };
}
