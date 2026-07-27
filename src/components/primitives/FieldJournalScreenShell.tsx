import { ReactNode, RefObject } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { foundationColors, shellTokens } from "../../theme/tokens";
import { BotanicalDecorationLayer } from "./BotanicalDecorationLayer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BotanicalMotifId } from "../../design/botanical-motifs";
import { DEBUG_LAYOUT, DebugLayerBox } from "../../debug/layoutDebug";

type FieldJournalScreenShellVariant =
  | "standard"
  | "compact"
  | "immersive"
  | "navAware"
  | "noBottomNav"
  | "quiet"
  | "botanicalSoft"
  | "plainPaper";

type Props = {
  children: ReactNode;
  scrollable?: boolean;
  variant?: FieldJournalScreenShellVariant;
  reducedMotion?: boolean;
  keyboardAware?: boolean;
  botanicalAmbient?: boolean;
  botanicalMotifs?: BotanicalMotifId[];
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  scrollViewRef?: RefObject<ScrollView | null>;
  debugLabel?: string;
  debugLines?: string[];
};

const variantStyles: Record<
  FieldJournalScreenShellVariant,
  {
    paddingHorizontal: number;
    paddingTop: number;
    paddingBottom: number;
    sectionGap: number;
    useBotanicalLayer: boolean;
    ambientOpacity: number;
  }
> = {
  standard: {
    paddingHorizontal: shellTokens.spacing.screenX,
    paddingTop: shellTokens.spacing.screenY,
    paddingBottom: shellTokens.spacing.bottomSafe,
    sectionGap: shellTokens.spacing.stack,
    useBotanicalLayer: false,
    ambientOpacity: 0.08,
  },
  compact: {
    paddingHorizontal: shellTokens.spacing.screenXCompact,
    paddingTop: shellTokens.spacing.screenY,
    paddingBottom: shellTokens.spacing.bottomSafe,
    sectionGap: shellTokens.spacing.stack,
    useBotanicalLayer: false,
    ambientOpacity: 0.06,
  },
  immersive: {
    paddingHorizontal: shellTokens.spacing.screenXCompact,
    paddingTop: shellTokens.spacing.topSafe,
    paddingBottom: shellTokens.spacing.bottomSafe,
    sectionGap: shellTokens.spacing.stack,
    useBotanicalLayer: true,
    ambientOpacity: 0.1,
  },
  navAware: {
    paddingHorizontal: shellTokens.spacing.screenXCompact,
    paddingTop: shellTokens.spacing.screenY,
    paddingBottom: shellTokens.spacing.bottomNavClearance,
    sectionGap: shellTokens.spacing.stack,
    useBotanicalLayer: false,
    ambientOpacity: 0.08,
  },
  noBottomNav: {
    paddingHorizontal: shellTokens.spacing.screenX,
    paddingTop: shellTokens.spacing.screenY,
    paddingBottom: shellTokens.spacing.bottomSafe,
    sectionGap: shellTokens.spacing.stack,
    useBotanicalLayer: false,
    ambientOpacity: 0.08,
  },
  quiet: {
    paddingHorizontal: shellTokens.spacing.screenX,
    paddingTop: shellTokens.spacing.screenY,
    paddingBottom: shellTokens.spacing.bottomSafe,
    sectionGap: shellTokens.spacing.stackQuiet,
    useBotanicalLayer: false,
    ambientOpacity: 0.05,
  },
  botanicalSoft: {
    paddingHorizontal: shellTokens.spacing.screenX,
    paddingTop: shellTokens.spacing.screenY,
    paddingBottom: shellTokens.spacing.bottomSafe,
    sectionGap: shellTokens.spacing.stack,
    useBotanicalLayer: true,
    ambientOpacity: 0.08,
  },
  plainPaper: {
    paddingHorizontal: shellTokens.spacing.screenX,
    paddingTop: shellTokens.spacing.screenY,
    paddingBottom: shellTokens.spacing.bottomSafe,
    sectionGap: shellTokens.spacing.stack,
    useBotanicalLayer: false,
    ambientOpacity: 0,
  },
};

export function FieldJournalScreenShell({
  children,
  scrollable = true,
  variant = "standard",
  reducedMotion = false,
  keyboardAware = true,
  botanicalAmbient,
  botanicalMotifs,
  contentContainerStyle,
  style,
  scrollViewRef,
  debugLabel,
  debugLines,
}: Props) {
  const insets = useSafeAreaInsets();
  const config = variantStyles[variant];
  const showBotanicalLayer = botanicalAmbient ?? config.useBotanicalLayer;
  const paddingTop = insets.top + Math.max(config.paddingTop, 16);
  const paddingBottom =
    variant === "navAware"
      ? insets.bottom + shellTokens.spacing.bottomNavBodyHeight + shellTokens.spacing.bottomNavBreathingRoom + 32 + 16
      : config.paddingBottom + insets.bottom;
  const content = scrollable ? (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingHorizontal: config.paddingHorizontal,
          paddingTop,
          paddingBottom,
          gap: config.sectionGap,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      <DebugLayerBox
        itemCount={Array.isArray(children) ? children.length : undefined}
        label={debugLabel ? `${debugLabel}.ScrollViewContent` : "FieldJournalScreenShell.ScrollViewContent"}
        lines={debugLines}
        tone="green"
      >
        {children}
      </DebugLayerBox>
    </ScrollView>
  ) : (
    <DebugLayerBox
      itemCount={Array.isArray(children) ? children.length : undefined}
      label={debugLabel ? `${debugLabel}.StaticContent` : "FieldJournalScreenShell.StaticContent"}
      lines={debugLines}
      style={[
        styles.staticContent,
        {
          paddingHorizontal: config.paddingHorizontal,
          paddingTop,
          paddingBottom,
          gap: config.sectionGap,
        },
        contentContainerStyle,
      ]}
      tone="green"
    >
      {children}
    </DebugLayerBox>
  );

  const shellBody = (
    <DebugLayerBox
      label={debugLabel ? `${debugLabel}.PaperCanvas` : "FieldJournalScreenShell.PaperCanvas"}
      lines={debugLines}
      style={[styles.paperCanvas, style]}
      tone="amber"
    >
      <View
        pointerEvents="none"
        style={[
          styles.ambientWash,
          {
            opacity: reducedMotion ? 0 : config.ambientOpacity,
          },
        ]}
      />
      {showBotanicalLayer ? (
        <BotanicalDecorationLayer
          motifs={botanicalMotifs}
          preset="screenShell"
          reducedMotion={reducedMotion}
          style={styles.decorationLayer}
        >
          <DebugLayerBox
            label={debugLabel ? `${debugLabel}.ContentLayer` : "FieldJournalScreenShell.ContentLayer"}
            lines={debugLines}
            tone="blue"
          >
            {content}
          </DebugLayerBox>
        </BotanicalDecorationLayer>
      ) : (
        <DebugLayerBox
          label={debugLabel ? `${debugLabel}.ContentLayer` : "FieldJournalScreenShell.ContentLayer"}
          lines={debugLines}
          style={styles.contentLayer}
          tone="blue"
        >
          {content}
        </DebugLayerBox>
      )}
    </DebugLayerBox>
  );

  if (!keyboardAware) {
    return DEBUG_LAYOUT && debugLabel ? (
      <DebugLayerBox label={`${debugLabel}.SafeRoot`} lines={debugLines} style={styles.safe} tone="purple">
        {shellBody}
      </DebugLayerBox>
    ) : (
      <View style={styles.safe}>{shellBody}</View>
    );
  }

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardLayer}>
        {DEBUG_LAYOUT && debugLabel ? (
          <DebugLayerBox label={`${debugLabel}.KeyboardLayer`} lines={debugLines} style={styles.keyboardLayer} tone="purple">
            {shellBody}
          </DebugLayerBox>
        ) : (
          shellBody
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: shellTokens.color.canvas,
  },
  keyboardLayer: {
    flex: 1,
  },
  paperCanvas: {
    flex: 1,
    backgroundColor: shellTokens.color.canvas,
    overflow: "hidden",
  },
  ambientWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: shellTokens.color.ambientBotanical,
  },
  decorationLayer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentLayer: {
    flex: 1,
    position: "relative",
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  staticContent: {
    flex: 1,
  },
});
