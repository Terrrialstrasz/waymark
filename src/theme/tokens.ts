import { Platform, TextStyle, ViewStyle } from "react-native";
import { foundationRadius } from "../design-system/tokens/foundation-radius";
import { semanticRadius } from "../design-system/tokens/semantic-radius";
import { foundationBorder, foundationBorderColor, foundationBorderStyle, foundationBorderWidth } from "../design-system/tokens/foundation-border";
import { semanticBorder } from "../design-system/tokens/semantic-border";
import { foundationShadow } from "../design-system/tokens/foundation-shadow";
import { semanticElevation } from "../design-system/tokens/semantic-elevation";
import { botanical, colors, foundationColors, pathColors } from "./foundation-colors";
import { baseSpacing, densityTokens, semanticSpacing, spacingDirection } from "./foundation-spacing";
import { fontFamilyTokens, typographyDirection, typographyReviewOptions } from "./foundation-typography";
import {
  SemanticState,
  getSemanticStateLabel,
  getSemanticStateStyle,
  getSemanticStateToneStyle,
  resolveSemanticState,
  semanticStateStyles,
  semanticStateTokens,
} from "./semantic-state-colors";
import { motionSemanticTokens, motionTokens } from "./motion";

export { botanical, colors, foundationColors, pathColors, getSemanticStateLabel, getSemanticStateStyle, getSemanticStateToneStyle, resolveSemanticState, semanticStateStyles, semanticStateTokens };
export type { SemanticState };
export { fontFamilyTokens, typographyDirection, typographyReviewOptions };
export { baseSpacing, semanticSpacing, densityTokens, spacingDirection };
export { foundationRadius, semanticRadius };
export { foundationBorder, foundationBorderColor, foundationBorderStyle, foundationBorderWidth, semanticBorder };
export { foundationShadow, semanticElevation };
export { getWaymarkEasing, getWaymarkMotionDuration, getWaymarkPressStyle, motionSemanticTokens, motionTokens, useReducedMotionEnabled } from "./motion";

export const spacing = {
  none: baseSpacing[0],
  xxs: baseSpacing[1],
  xs: baseSpacing[3],
  sm: baseSpacing[4],
  md: baseSpacing[5],
  lg: baseSpacing[6],
  xl: baseSpacing[7],
  xxl: baseSpacing[8],
  xxxl: baseSpacing[9],
  xxxxl: baseSpacing[10],
};

export const radius = {
  xs: foundationRadius.xs,
  sm: foundationRadius.sm,
  md: foundationRadius.md,
  lg: foundationRadius.lg,
  xl: foundationRadius.xl,
  "2xl": foundationRadius["2xl"],
  "3xl": foundationRadius["3xl"],
  pill: foundationRadius.full,
  circle: foundationRadius.full,
};

export const shadows: Record<string, ViewStyle> = {
  none: { boxShadow: foundationShadow.none },
  soft: { boxShadow: semanticElevation.card },
  float: { boxShadow: semanticElevation.sheet },
  high: { boxShadow: semanticElevation.nav },
};

export const typography: Record<string, TextStyle> = {
  displayHero: {
    fontFamily: fontFamilyTokens.serifDisplay.runtime,
    fontSize: 36,
    lineHeight: 42,
    color: foundationColors.ink.primary,
    fontWeight: Platform.OS === "android" ? "700" : "600",
    letterSpacing: -0.72,
  },
  display: {
    fontFamily: fontFamilyTokens.serifDisplay.runtime,
    fontSize: 36,
    lineHeight: 42,
    color: foundationColors.ink.primary,
    fontWeight: Platform.OS === "android" ? "700" : "600",
    letterSpacing: -0.72,
  },
  judgmentHero: {
    fontFamily: fontFamilyTokens.serifDisplay.runtime,
    fontSize: 32,
    lineHeight: 38,
    color: foundationColors.ink.onGold,
    fontWeight: Platform.OS === "android" ? "700" : "600",
    letterSpacing: -0.84,
    fontStyle: "italic",
  },
  screenTitle: {
    fontFamily: fontFamilyTokens.serifDisplay.runtime,
    fontSize: 32,
    lineHeight: 38,
    color: foundationColors.ink.primary,
    fontWeight: Platform.OS === "android" ? "700" : "600",
    letterSpacing: -0.48,
  },
  pageTitle: {
    fontFamily: fontFamilyTokens.serifDisplay.runtime,
    fontSize: 28,
    lineHeight: 34,
    color: foundationColors.ink.primary,
    fontWeight: Platform.OS === "android" ? "700" : "600",
    letterSpacing: -0.28,
  },
  sectionTitle: {
    fontFamily: fontFamilyTokens.serif.runtime,
    fontSize: 19,
    lineHeight: 25,
    color: foundationColors.ink.primary,
    fontWeight: "600",
  },
  cardTitle: {
    fontFamily: fontFamilyTokens.serif.runtime,
    fontSize: 21,
    lineHeight: 27,
    color: foundationColors.ink.primary,
    fontWeight: "600",
    letterSpacing: -0.11,
  },
  sheetTitle: {
    fontFamily: fontFamilyTokens.serif.runtime,
    fontSize: 22,
    lineHeight: 28,
    color: foundationColors.ink.primary,
    fontWeight: "600",
    letterSpacing: -0.11,
  },
  bodyLg: {
    fontFamily: fontFamilyTokens.sans.runtime,
    fontSize: 17,
    lineHeight: 27,
    color: foundationColors.ink.primary,
  },
  body: {
    fontFamily: fontFamilyTokens.sans.runtime,
    fontSize: 15,
    lineHeight: 23,
    color: foundationColors.ink.primary,
  },
  bodyStrong: {
    fontFamily: fontFamilyTokens.sans.runtime,
    fontSize: 15,
    lineHeight: 23,
    color: foundationColors.ink.primary,
    fontWeight: "600",
  },
  bodySm: {
    fontFamily: fontFamilyTokens.sans.runtime,
    fontSize: 14,
    lineHeight: 21,
    color: foundationColors.ink.secondary,
  },
  bodyXs: {
    fontFamily: fontFamilyTokens.sans.runtime,
    fontSize: 13,
    lineHeight: 19,
    color: foundationColors.ink.secondary,
  },
  label: {
    fontFamily: fontFamilyTokens.sans.runtime,
    fontSize: 13,
    lineHeight: 18,
    color: foundationColors.ink.secondary,
    fontWeight: "500",
  },
  meta: {
    fontFamily: fontFamilyTokens.sans.runtime,
    fontSize: 12,
    lineHeight: 16,
    color: foundationColors.ink.tertiary,
    fontWeight: "500",
  },
  metaCompact: {
    fontFamily: fontFamilyTokens.sans.runtime,
    fontSize: 11,
    lineHeight: 15,
    color: foundationColors.ink.tertiary,
    fontWeight: "500",
  },
  chip: {
    fontFamily: fontFamilyTokens.sans.runtime,
    fontSize: 12,
    lineHeight: 16,
    color: foundationColors.ink.primary,
    fontWeight: "600",
  },
  button: {
    fontFamily: fontFamilyTokens.sans.runtime,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: Platform.OS === "android" ? "700" : "600",
  },
  nav: {
    fontFamily: fontFamilyTokens.sans.runtime,
    fontSize: 11,
    lineHeight: 14,
    color: foundationColors.ink.tertiary,
    fontWeight: "600",
  },
  timer: {
    fontFamily: fontFamilyTokens.numeric.runtime,
    fontSize: 34,
    lineHeight: 38,
    color: foundationColors.ink.primary,
    fontWeight: Platform.OS === "android" ? "700" : "600",
    fontVariant: ["tabular-nums"],
  },
  numeric: {
    fontFamily: fontFamilyTokens.numeric.runtime,
    fontSize: 26,
    lineHeight: 30,
    color: foundationColors.ink.primary,
    fontWeight: Platform.OS === "android" ? "700" : "600",
    fontVariant: ["tabular-nums"],
  },
};

export const iconSize = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
};

export const waymarkLogoTokens = {
  size: {
    xs: 16,
    sm: 28,
    md: 48,
    lg: 84,
    xl: 140,
    hero: 208,
  },
  surface: {
    parchment: foundationColors.bg.paperWarm,
    mossDeep: foundationColors.green.deep,
    journalCard: foundationColors.bg.paper,
  },
  opacity: {
    subtle: 0.72,
  },
} as const;

export const captureLeafTokens = {
  outerRingLight: foundationColors.bg.paperWarm,
  outerRing: foundationColors.bg.paper,
  outerRingShadow: foundationColors.bg.paperSoft,
  outerRingEdge: foundationColors.gold.base,
  enamelSurface: foundationColors.green.base,
  enamelDeep: foundationColors.green.deep,
  enamelPressed: foundationColors.green.deep,
  enamelActive: foundationColors.green.base,
  enamelDisabled: "#9BAA96",
  icon: foundationColors.bg.paper,
  vein: foundationColors.green.deep,
  dashRing: "rgba(252,243,223,.72)",
  focusRing: "rgba(200,154,58,.42)",
  size: {
    visual: 50,
    halo: 60,
    tapTarget: 88,
    navSlotMin: 88,
    navSlotPreferred: 88,
  },
  radius: {
    badge: semanticRadius.capture,
    tapTarget: semanticRadius.capture,
  },
  shadow: {
    idle: { boxShadow: semanticElevation.capture } satisfies ViewStyle,
    pressed: { boxShadow: semanticElevation.pressed } satisfies ViewStyle,
    active: { boxShadow: semanticElevation.capture } satisfies ViewStyle,
    disabled: { boxShadow: semanticElevation.flat } satisfies ViewStyle,
  },
  motion: {
    pressDuration: motionSemanticTokens.button.press.duration,
    releaseDuration: 140,
    easing: motionTokens.easingCurve.release,
    pressedScale: motionTokens.scale.pressCapture,
    pressedTranslateY: 1,
  },
} as const;

export const semanticTokens = {
  color: {
    captureLeaf: {
      surface: captureLeafTokens.enamelSurface,
      surfacePressed: captureLeafTokens.enamelPressed,
      surfaceActive: captureLeafTokens.enamelActive,
      surfaceDisabled: captureLeafTokens.enamelDisabled,
      icon: captureLeafTokens.icon,
      iconActive: captureLeafTokens.icon,
      iconDisabled: captureLeafTokens.icon,
      rim: captureLeafTokens.outerRing,
      rimPressed: captureLeafTokens.outerRingShadow,
      rimActive: captureLeafTokens.outerRingLight,
      rimDisabled: captureLeafTokens.outerRingEdge,
      highlight: "rgba(255,255,255,.18)",
      innerShadow: "rgba(0,0,0,.24)",
      focusRing: captureLeafTokens.focusRing,
    },
  },
  size: {
    captureLeaf: {
      visual: captureLeafTokens.size.visual,
      halo: captureLeafTokens.size.halo,
      tapTarget: captureLeafTokens.size.tapTarget,
      tapTargetMin: 88,
      icon: 48,
      rimWidth: 1,
      focusRingWidth: 2,
      navSlot: captureLeafTokens.size.navSlotPreferred,
      maxNavRise: 8,
      pressedTranslateY: captureLeafTokens.motion.pressedTranslateY,
    },
  },
  radius: {
    captureLeaf: {
      surface: semanticRadius.capture,
      tapTarget: semanticRadius.capture,
    },
  },
  shadow: {
    captureLeaf: {
      idle: captureLeafTokens.shadow.idle,
      pressed: captureLeafTokens.shadow.pressed,
      active: captureLeafTokens.shadow.active,
      disabled: captureLeafTokens.shadow.disabled,
      focus: {
        boxShadow: semanticElevation.focus,
      } satisfies ViewStyle,
    },
  },
  motion: {
    captureLeaf: {
      pressDuration: captureLeafTokens.motion.pressDuration,
      releaseDuration: captureLeafTokens.motion.releaseDuration,
      easing: captureLeafTokens.motion.easing,
      pressedScale: captureLeafTokens.motion.pressedScale,
      pressedTranslateY: captureLeafTokens.motion.pressedTranslateY,
      iconActiveRotate: "0deg",
      reducedMotionDuration: 0,
    },
  },
} as const;

export const shellTokens = {
  color: {
    canvas: foundationColors.bg.app,
    canvasSubtle: foundationColors.bg.paperWarm,
    ambientBotanical: foundationColors.green.soft,
    edgeWarmth: foundationColors.bg.paperSoft,
  },
  spacing: {
    screenX: semanticSpacing.screen.x,
    screenXCompact: semanticSpacing.screen.xCompact,
    screenY: semanticSpacing.screen.top,
    topSafe: semanticSpacing.screen.top,
    bottomSafe: spacing.lg,
    bottomNavBodyHeight: 66,
    bottomNavClearance: 90,
    bottomNavClearanceCompact: 80,
    bottomNavBreathingRoom: spacing.md,
    stack: semanticSpacing.section.gap,
    stackQuiet: semanticSpacing.section.gapLarge,
  },
  radius: {
    paper: semanticRadius.card.default,
  },
  shadow: {
    none: foundationColors.shadow.none,
    softInset: semanticElevation.flat,
  },
  border: {
    none: "0px solid transparent",
    hairline: semanticBorder.divider.subtle,
  },
  motion: {
    enterDuration: motionSemanticTokens.sheet.enter.duration,
    reduceDuration: motionTokens.duration.instant,
  },
} as const;

export const journalCardTokens = {
  color: {
    surface: foundationColors.bg.paper,
    surfaceSubtle: foundationColors.bg.paperWarm,
    surfaceElevated: "#FFFDF8",
    border: foundationColors.border.soft,
    borderSoft: foundationColors.border.subtle,
    pressed: foundationColors.bg.paperSoft,
    selected: foundationColors.green.soft,
    disabled: foundationColors.bg.disabled,
    warningTint: "#FFF7E7",
    botanicalSubtle: foundationColors.green.soft,
  },
  spacing: {
    paddingCompact: semanticSpacing.card.padding.sm,
    paddingStandard: semanticSpacing.card.padding.md,
    paddingHero: semanticSpacing.card.padding.lg,
    gapXs: spacing.xs,
    gapSm: semanticSpacing.card.gap,
    gapMd: spacing.md,
  },
  radius: {
    compact: semanticRadius.card.compact,
    standard: semanticRadius.card.default,
    hero: semanticRadius.card.hero,
  },
  shadow: {
    journal: semanticElevation.card,
    pressed: semanticElevation.pressed,
    selected: semanticElevation.activeCard,
    none: semanticElevation.flat,
    hero: semanticElevation.hero,
  },
  border: {
    journal: semanticBorder.card.default,
    selected: semanticBorder.card.strong,
    warning: semanticBorder.state.weak,
    none: semanticBorder.none,
  },
  motion: {
    pressDuration: motionSemanticTokens.button.press.duration,
    enterDuration: motionTokens.duration.quick,
    reduceDuration: motionTokens.duration.instant,
  },
} as const;

export const pageHeaderTokens = {
  color: {
    title: foundationColors.ink.primary,
    subtitle: foundationColors.ink.secondary,
    icon: foundationColors.ink.primary,
    iconPressedBg: foundationColors.bg.paperSoft,
    surfaceSticky: foundationColors.bg.paperWarm,
    borderSubtle: foundationColors.border.subtle,
    botanicalSubtle: foundationColors.green.soft,
    eyebrow: foundationColors.gold.deep,
  },
  typography: {
    titleSerif: "screenTitle",
    compactTitleSerif: "pageTitle",
    subtitle: "bodySm",
    meta: "label",
  },
  spacing: {
    paddingY: spacing.sm,
    paddingYCompact: spacing.xs,
    paddingYHero: spacing.md,
    gapTitle: spacing.xs,
    gapActions: spacing.xs,
    blockGap: spacing.lg,
  },
  radius: {
    action: semanticRadius.badge,
    stickySurface: semanticRadius.card.default,
  },
  shadow: {
    none: semanticElevation.flat,
    stickySoft: semanticElevation.flat,
  },
  border: {
    stickyHairline: semanticBorder.divider.subtle,
  },
  icon: {
    size: 22,
  },
  motion: {
    enter: motionTokens.duration.quick,
    press: motionSemanticTokens.button.press.duration,
    collapse: motionTokens.duration.standard,
  },
} as const;

export const botanicalDecorationTokens = {
  opacity: {
    none: 0,
    ghost: 0.04,
    whisper: 0.06,
    subtle: 0.08,
    soft: 0.12,
    visible: 0.16,
    mediaOverlay: 0.18,
    hero: 0.22,
    max: 0.24,
  },
  size: {
    xs: 24,
    sm: 40,
    md: 64,
    lg: 104,
    xl: 160,
    hero: 248,
    background: 360,
  },
  density: {
    none: 0,
    trace: 1,
    low: 1,
    medium: 2,
    seal: 3,
  },
  placement: {
    topRight: {
      top: -8,
      right: -6,
    },
    topLeft: {
      top: -8,
      left: -6,
    },
    bottomRight: {
      bottom: -12,
      right: -10,
    },
    bottomLeft: {
      bottom: -12,
      left: -10,
    },
    cardCorner: {
      bottom: -10,
      right: -8,
    },
    sectionEnd: {
      top: -4,
      right: 0,
    },
    behindTitle: {
      top: -10,
      right: spacing.sm,
    },
    mediaCorner: {
      bottom: 0,
      right: 0,
    },
    sealAround: {
      top: "50%",
      left: "50%",
    },
    backgroundDrift: {
      top: -32,
      right: -28,
    },
  },
  layer: {
    background: 0,
    surface: 1,
    overlay: 2,
    seal: 3,
    debug: 4,
  },
  motion: {
    none: 0,
    fadeIn: 150,
    pressFade: 120,
    reduce: 0,
  },
} as const;

export const entityChipTokens = {
  color: {
    surface: foundationColors.bg.paperWarm,
    border: foundationColors.border.subtle,
    text: foundationColors.ink.secondary,
    selectedSurface: foundationColors.green.soft,
    selectedBorder: foundationColors.border.active,
    selectedText: foundationColors.ink.onGreenSoft,
    warningSurface: "#FFF5E1",
    warningBorder: foundationColors.gold.base,
    warningText: foundationColors.gold.deep,
    disabledSurface: foundationColors.bg.disabled,
    disabledBorder: foundationColors.border.disabled,
    disabledText: foundationColors.ink.disabled,
  },
  spacing: {
    x: spacing.sm,
    xCompact: spacing.xs,
    y: 6,
    yCompact: 4,
  },
  radius: {
    default: semanticRadius.chip,
    ticket: semanticRadius.card.compact,
  },
  size: {
    compact: 24,
    standard: 28,
    touch: 36,
  },
} as const;

export const entityRowTokens = {
  color: {
    surface: foundationColors.bg.paper,
    pressed: foundationColors.bg.paperSoft,
    title: foundationColors.ink.primary,
    subtitle: foundationColors.ink.secondary,
    meta: foundationColors.ink.tertiary,
    border: foundationColors.border.subtle,
    accent: foundationColors.border.soft,
    disabled: foundationColors.ink.disabled,
  },
  spacing: {
    paddingX: spacing.md,
    paddingY: spacing.md,
    paddingCompactY: spacing.sm,
    gap: spacing.sm,
    gapCompact: spacing.xs,
  },
  radius: {
    default: semanticRadius.card.compact,
  },
} as const;

export const mediaHeroTokens = {
  color: {
    placeholder: foundationColors.bg.paperWarm,
    border: foundationColors.border.soft,
    overlay: "rgba(43, 42, 34, 0.12)",
    caption: foundationColors.ink.primary,
    muted: foundationColors.ink.secondary,
  },
  radius: {
    hero: semanticRadius.card.media,
    inline: semanticRadius.card.default,
    thumbnail: semanticRadius.card.compact,
  },
  shadow: {
    soft: semanticElevation.card,
    none: semanticElevation.flat,
  },
  size: {
    thumbnailHeight: 112,
    inlineHeight: 188,
    heroHeight: 232,
  },
} as const;

export const vellumOverlayTokens = {
  color: {
    surfaceSoft: "rgba(255, 250, 238, 0.55)",
    surface: "rgba(255, 250, 238, 0.62)",
    surfaceStrong: "rgba(255, 250, 238, 0.68)",
    borderSoft: "rgba(139, 94, 52, 0.10)",
    border: "rgba(139, 94, 52, 0.14)",
    textLift: "rgba(255, 252, 246, 0.42)",
  },
  shadow: {
    none: semanticElevation.flat,
  },
} as const;

export const inputTokens = {
  color: {
    surface: foundationColors.bg.paper,
    border: foundationColors.border.soft,
    focus: foundationColors.border.active,
    text: foundationColors.ink.primary,
    placeholder: foundationColors.ink.tertiary,
    error: foundationColors.missed.base,
    helper: foundationColors.ink.secondary,
    disabledSurface: foundationColors.bg.disabled,
  },
  radius: {
    default: semanticRadius.button.default,
  },
  spacing: {
    paddingX: spacing.md,
    paddingY: spacing.sm,
    gap: spacing.xs,
  },
  size: {
    singleLineHeight: 46,
    noteMinHeight: 112,
    captionMinHeight: 96,
  },
} as const;

export const controlTokens = {
  color: {
    surface: foundationColors.bg.paperWarm,
    border: foundationColors.border.subtle,
    text: foundationColors.ink.secondary,
    selected: foundationColors.green.soft,
    selectedBorder: foundationColors.border.active,
    selectedText: foundationColors.ink.onGreenSoft,
    pressed: foundationColors.bg.paperSoft,
    disabled: foundationColors.ink.disabled,
  },
  radius: {
    default: semanticRadius.chip,
  },
  motion: {
    press: motionSemanticTokens.button.press.duration,
  },
} as const;

export const segmentProgressTokens = {
  color: {
    done: foundationColors.green.base,
    current: foundationColors.gold.base,
    remaining: foundationColors.bg.paperSoft,
    track: foundationColors.border.subtle,
    label: foundationColors.ink.secondary,
  },
  radius: {
    segment: semanticRadius.chip,
  },
  spacing: {
    gap: 4,
  },
  size: {
    dot: 10,
    barWidth: 28,
    barHeight: 8,
    compactBarWidth: 18,
  },
} as const;

export const metadataListTokens = {
  color: {
    label: foundationColors.ink.tertiary,
    value: foundationColors.ink.primary,
    icon: foundationColors.ink.secondary,
    divider: foundationColors.border.subtle,
    warning: foundationColors.gold.deep,
  },
  spacing: {
    rowGap: spacing.sm,
    compactRowGap: spacing.xs,
    inlineGap: spacing.md,
  },
} as const;

export const floatingActionButtonTokens = {
  color: {
    surface: foundationColors.bg.paper,
    icon: foundationColors.green.deep,
    border: foundationColors.border.soft,
    pressed: foundationColors.bg.paperSoft,
    subtleSurface: foundationColors.bg.paperWarm,
  },
  radius: {
    fab: semanticRadius.capture,
    extended: semanticRadius.button.default,
  },
  shadow: {
    soft: semanticElevation.card,
    pressed: semanticElevation.pressed,
    none: semanticElevation.flat,
  },
  size: {
    iconOnly: 54,
    extendedMinHeight: 48,
  },
} as const;

export const dividerTokens = {
  color: {
    subtle: foundationColors.border.subtle,
    strong: foundationColors.border.soft,
    decorative: foundationColors.gold.soft,
  },
  spacing: {
    y: spacing.sm,
    ySection: spacing.md,
  },
} as const;

export const captureChooserTokens = {
  color: {
    surface: foundationColors.bg.paper,
    surfaceWarm: foundationColors.bg.paperWarm,
    border: foundationColors.border.subtle,
    shadow: foundationColors.shadow.paperMedium,
    backdrop: foundationColors.bg.overlay,
    title: foundationColors.ink.primary,
    prompt: foundationColors.ink.secondary,
    helper: foundationColors.ink.tertiary,
    attachmentText: foundationColors.green.deep,
  },
  spacing: {
    sheetPaddingX: spacing.lg,
    sheetPaddingTop: spacing.sm,
    sheetPaddingBottom: spacing.lg,
    headerGap: spacing.xs,
    contentGap: spacing.md,
    destinationGap: spacing.sm,
  },
  radius: {
    sheet: semanticRadius.sheet,
    input: semanticRadius.card.default,
    attachment: semanticRadius.button.default,
    destination: semanticRadius.card.default,
  },
  size: {
    titleSeal: 56,
    attachmentMinWidth: 144,
    destinationMinHeight: 68,
    handleWidth: 54,
    handleHeight: 6,
  },
} as const;

export type BotanicalOpacityToken = keyof typeof botanicalDecorationTokens.opacity;
export type BotanicalSizeToken = keyof typeof botanicalDecorationTokens.size;
export type BotanicalDensityToken = keyof typeof botanicalDecorationTokens.density;
export type BotanicalPlacementToken = keyof typeof botanicalDecorationTokens.placement;
export type BotanicalLayerToken = keyof typeof botanicalDecorationTokens.layer;
export type BotanicalMotionToken = keyof typeof botanicalDecorationTokens.motion;
export type BotanicalDecorationPreset =
  | "screenShell"
  | "pageHeader"
  | "journalCard"
  | "sectionHeader"
  | "mediaHero"
  | "resultSeal"
  | "emptyState"
  | "entityCard";
