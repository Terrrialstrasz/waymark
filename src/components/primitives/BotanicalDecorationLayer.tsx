import { ReactNode } from "react";
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BotanicalMotif } from "./BotanicalMotif";
import { BotanicalMotifId } from "../../design/botanical-motifs";
import {
  botanicalDecorationTokens,
  BotanicalDecorationPreset,
  BotanicalDensityToken,
  BotanicalPlacementToken,
} from "../../theme/tokens";

type Props = {
  preset: BotanicalDecorationPreset;
  density?: BotanicalDensityToken;
  placement?: BotanicalPlacementToken;
  motifs?: BotanicalMotifId[];
  clip?: boolean;
  respectSafeArea?: boolean;
  avoidContentZone?: boolean;
  reducedMotion?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

type PresetConfig = {
  allowedMotifs: readonly BotanicalMotifId[];
  defaultMotifs: readonly BotanicalMotifId[];
  defaultPlacement: BotanicalPlacementToken;
  defaultDensity: BotanicalDensityToken;
  defaultOpacity: keyof typeof botanicalDecorationTokens.opacity;
  defaultSize: keyof typeof botanicalDecorationTokens.size;
  clip: boolean;
  respectSafeArea: boolean;
  avoidContentZone: boolean;
  maxMotifs: number;
  layer: "background" | "surface" | "overlay" | "seal";
};

const presetConfigs: Record<BotanicalDecorationPreset, PresetConfig> = {
  screenShell: {
    allowedMotifs: [
      "botanical.headerSystemSprig",
      "botanical.headerLeafMark",
      "botanical.cornerBranch",
      "botanical.leafVein",
      "botanical.pressedLeaf",
      "botanical.sectionSprig",
      "botanical.sprig",
      "botanical.wreathSeal",
      "botanical.trailCurve",
      "botanical.photoOverlay",
    ],
    defaultMotifs: ["botanical.headerSystemSprig"],
    defaultPlacement: "backgroundDrift",
    defaultDensity: "trace",
    defaultOpacity: "ghost",
    defaultSize: "hero",
    clip: false,
    respectSafeArea: true,
    avoidContentZone: true,
    maxMotifs: 1,
    layer: "background",
  },
  pageHeader: {
    allowedMotifs: [
      "botanical.headerLeafMark",
      "botanical.sectionSprig",
      "botanical.cornerBranch",
      "botanical.headerSystemSprig",
      "botanical.leafVein",
      "botanical.pressedLeaf",
      "botanical.sprig",
      "botanical.wreathSeal",
      "botanical.photoOverlay",
      "botanical.trailCurve",
    ],
    defaultMotifs: ["botanical.headerLeafMark"],
    defaultPlacement: "topRight",
    defaultDensity: "low",
    defaultOpacity: "soft",
    defaultSize: "xl",
    clip: false,
    respectSafeArea: true,
    avoidContentZone: true,
    maxMotifs: 1,
    layer: "background",
  },
  journalCard: {
    allowedMotifs: ["botanical.pressedLeaf", "botanical.leafVein", "botanical.ribbonBookmark", "botanical.cornerBranch"],
    defaultMotifs: ["botanical.pressedLeaf"],
    defaultPlacement: "cardCorner",
    defaultDensity: "low",
    defaultOpacity: "whisper",
    defaultSize: "md",
    clip: true,
    respectSafeArea: false,
    avoidContentZone: true,
    maxMotifs: 1,
    layer: "surface",
  },
  sectionHeader: {
    allowedMotifs: ["botanical.sectionSprig", "botanical.sprig", "botanical.seedDot"],
    defaultMotifs: ["botanical.sectionSprig"],
    defaultPlacement: "sectionEnd",
    defaultDensity: "trace",
    defaultOpacity: "subtle",
    defaultSize: "sm",
    clip: false,
    respectSafeArea: false,
    avoidContentZone: true,
    maxMotifs: 1,
    layer: "background",
  },
  mediaHero: {
    allowedMotifs: ["botanical.photoOverlay"],
    defaultMotifs: ["botanical.photoOverlay"],
    defaultPlacement: "mediaCorner",
    defaultDensity: "low",
    defaultOpacity: "mediaOverlay",
    defaultSize: "hero",
    clip: true,
    respectSafeArea: false,
    avoidContentZone: true,
    maxMotifs: 1,
    layer: "overlay",
  },
  resultSeal: {
    allowedMotifs: ["botanical.wreathLeft", "botanical.wreathRight", "botanical.wreathSeal", "botanical.stampRing", "botanical.branchTick"],
    defaultMotifs: ["botanical.wreathLeft", "botanical.wreathRight", "botanical.stampRing"],
    defaultPlacement: "sealAround",
    defaultDensity: "seal",
    defaultOpacity: "visible",
    defaultSize: "lg",
    clip: false,
    respectSafeArea: false,
    avoidContentZone: true,
    maxMotifs: 3,
    layer: "seal",
  },
  emptyState: {
    allowedMotifs: ["botanical.sprig", "botanical.trailCurve", "botanical.seedDot", "botanical.pressedLeaf"],
    defaultMotifs: ["botanical.sprig", "botanical.seedDot"],
    defaultPlacement: "behindTitle",
    defaultDensity: "medium",
    defaultOpacity: "visible",
    defaultSize: "xl",
    clip: false,
    respectSafeArea: false,
    avoidContentZone: true,
    maxMotifs: 2,
    layer: "background",
  },
  entityCard: {
    allowedMotifs: ["botanical.cornerBranch", "botanical.trailCurve", "botanical.pressedLeaf"],
    defaultMotifs: ["botanical.cornerBranch"],
    defaultPlacement: "bottomRight",
    defaultDensity: "low",
    defaultOpacity: "whisper",
    defaultSize: "md",
    clip: true,
    respectSafeArea: false,
    avoidContentZone: true,
    maxMotifs: 1,
    layer: "surface",
  },
};

export function BotanicalDecorationLayer({
  preset,
  density,
  placement,
  motifs,
  clip,
  respectSafeArea,
  avoidContentZone,
  reducedMotion,
  style,
  children,
}: Props) {
  const config = presetConfigs[preset];
  const resolvedDensity = density ?? config.defaultDensity;
  const maxMotifs = botanicalDecorationTokens.density[resolvedDensity];
  const resolvedMotifs = (motifs ?? [...config.defaultMotifs])
    .filter((motif) => config.allowedMotifs.includes(motif))
    .slice(0, Math.min(maxMotifs, config.maxMotifs));

  const resolvedPlacement = placement ?? config.defaultPlacement;
  const resolvedClip = clip ?? config.clip;
  const layerStyle = getPlacementStyle(resolvedPlacement, preset, avoidContentZone ?? config.avoidContentZone);

  return (
    <View
      accessible={false}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.root,
        resolvedClip ? styles.clipped : null,
        respectSafeArea ?? config.respectSafeArea ? styles.safeInset : null,
        style,
      ]}
    >
      <View accessible={false} aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={StyleSheet.absoluteFill}>
        {resolvedMotifs.map((motif, index) => (
          <BotanicalMotif
            key={`${preset}-${motif}-${index}`}
            clipToParent={resolvedClip}
            layer={config.layer}
            motif={motif}
            opacity={config.defaultOpacity}
            rotation={getRotationForPreset(preset, index)}
            size={getSizeForPreset(preset, motif, config.defaultSize)}
            style={resolveIndexedPlacement(layerStyle, preset, index)}
          />
        ))}
      </View>
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

function getPlacementStyle(
  placement: BotanicalPlacementToken,
  preset: BotanicalDecorationPreset,
  avoidContentZone: boolean
): ViewStyle {
  const base = botanicalDecorationTokens.placement[placement] as Partial<
    Record<"top" | "right" | "bottom" | "left", DimensionValue>
  >;

  if (placement === "sealAround") {
    return {
      position: "absolute",
      top: base.top,
      left: base.left,
      marginLeft: -54,
      marginTop: -54,
    };
  }

  if (placement === "behindTitle" && avoidContentZone) {
    return {
      position: "absolute",
      top: Number(base.top ?? 0) + 8,
      right: base.right,
    };
  }

  if (placement === "backgroundDrift" && preset === "screenShell") {
    return {
      position: "absolute",
      top: base.top,
      right: base.right,
    };
  }

  return {
    position: "absolute",
    ...base,
  };
}

function resolveIndexedPlacement(base: ViewStyle, preset: BotanicalDecorationPreset, index: number): ViewStyle {
  if (preset !== "resultSeal" && index === 0) {
    return base;
  }

  if (preset === "resultSeal") {
    const offsets = [
      { marginLeft: -92, marginTop: -42 },
      { marginLeft: 12, marginTop: -42 },
      { marginLeft: -36, marginTop: 24 },
    ];

    return {
      ...base,
      ...offsets[index],
    };
  }

  if (preset === "emptyState") {
    return index === 0 ? base : { ...base, bottom: -12, right: -8, top: undefined, left: undefined };
  }

  return base;
}

function getRotationForPreset(preset: BotanicalDecorationPreset, index: number) {
  if (preset === "resultSeal") {
    return index === 0 ? "slightLeft" : index === 1 ? "slightRight" : "none";
  }

  if (preset === "screenShell" || preset === "pageHeader") {
    return "slightRight";
  }

  return "none";
}

function getSizeForPreset(
  preset: BotanicalDecorationPreset,
  motif: BotanicalMotifId,
  fallback: keyof typeof botanicalDecorationTokens.size
) {
  if (preset === "mediaHero") {
    return "hero";
  }

  if (preset === "resultSeal") {
    if (motif === "botanical.stampRing") {
      return "md";
    }

    return "lg";
  }

  if (preset === "emptyState") {
    return motif === "botanical.seedDot" ? "sm" : "xl";
  }

  return fallback;
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
  },
  clipped: {
    overflow: "hidden",
  },
  safeInset: {
    paddingTop: 2,
  },
  content: {
    position: "relative",
    zIndex: 1,
  },
});
