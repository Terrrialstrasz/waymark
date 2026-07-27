import { ReactNode } from "react";
import { AccessibilityRole, Image, ImageSourcePropType, StyleSheet, View } from "react-native";
import { BotanicalDecorationLayer } from "./BotanicalDecorationLayer";
import { WMText } from "./Text";
import { UtilityIconButton } from "../domain/icons/UtilityIconButton";
import { WaymarkLogoSize, WaymarkLogoVariant } from "../../skins/waymark/assets/logo";
import { foundationColors, pageHeaderTokens, semanticBorder, semanticElevation, semanticRadius, spacing, waymarkLogoTokens } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import type { BotanicalMotifId } from "../../design/botanical-motifs";

type PageHeaderVariant =
  | "standard"
  | "compact"
  | "hero"
  | "withBack"
  | "withoutBack"
  | "withActions"
  | "withoutActions"
  | "sticky"
  | "quiet"
  | "dense";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  logoVariant?: WaymarkLogoVariant;
  logoSize?: WaymarkLogoSize;
  showBack?: boolean;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
  variant?: PageHeaderVariant;
  sticky?: boolean;
  isScrolled?: boolean;
  disabledActions?: boolean;
  decorativeAccent?: boolean;
  decorativeMotifs?: BotanicalMotifId[];
  reducedMotion?: boolean;
  accessibilityRole?: AccessibilityRole;
};

const variantConfig: Record<
  PageHeaderVariant,
  {
    titleVariant: "screenTitle" | "pageTitle";
    paddingY: number;
    alignTop: boolean;
  }
> = {
  standard: { titleVariant: "screenTitle", paddingY: pageHeaderTokens.spacing.paddingY, alignTop: true },
  compact: { titleVariant: "pageTitle", paddingY: pageHeaderTokens.spacing.paddingYCompact, alignTop: true },
  hero: { titleVariant: "screenTitle", paddingY: pageHeaderTokens.spacing.paddingYHero, alignTop: true },
  withBack: { titleVariant: "pageTitle", paddingY: pageHeaderTokens.spacing.paddingYCompact, alignTop: true },
  withoutBack: { titleVariant: "screenTitle", paddingY: pageHeaderTokens.spacing.paddingY, alignTop: true },
  withActions: { titleVariant: "screenTitle", paddingY: pageHeaderTokens.spacing.paddingY, alignTop: true },
  withoutActions: { titleVariant: "screenTitle", paddingY: pageHeaderTokens.spacing.paddingY, alignTop: true },
  sticky: { titleVariant: "pageTitle", paddingY: pageHeaderTokens.spacing.paddingYCompact, alignTop: true },
  quiet: { titleVariant: "screenTitle", paddingY: pageHeaderTokens.spacing.paddingYHero, alignTop: true },
  dense: { titleVariant: "pageTitle", paddingY: pageHeaderTokens.spacing.paddingYCompact, alignTop: false },
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  logoVariant,
  logoSize = "sm",
  showBack = false,
  onBack,
  backLabel = "Back",
  actions,
  variant = "standard",
  sticky = false,
  isScrolled = false,
  disabledActions = false,
  decorativeAccent = false,
  decorativeMotifs,
  accessibilityRole = "header",
}: Props) {
  const config = variantConfig[variant];
  const resolvedShowBack = showBack || variant === "withBack";
  const resolvedActions = variant === "withoutActions" ? null : actions;
  const stickyActive = sticky || variant === "sticky";
  const logoDimension = waymarkLogoTokens.size[logoSize];

  const headerContent = (
    <View
      accessibilityRole={accessibilityRole}
      style={[
        styles.container,
        stickyActive
          ? [
              styles.stickySurface,
              isScrolled ? styles.stickyScrolled : null,
            ]
          : null,
        {
          paddingVertical: config.paddingY,
        },
      ]}
    >
      <View style={[styles.topRow, !config.alignTop ? styles.topRowCentered : null]}>
        <View style={styles.left}>
          <View style={styles.titleWrap}>
            {resolvedShowBack ? (
              <View style={[styles.backSlot, variant === "dense" ? styles.backSlotDense : null]}>
                <UtilityIconButton accessibilityLabel={backLabel} disabled={!onBack} icon="back" onPress={onBack} size={variant === "dense" ? "sm" : "md"} />
              </View>
            ) : null}
            {logoVariant ? (
              <View style={[styles.logoSlot, { minWidth: logoDimension, minHeight: logoDimension }]}>
                <Image source={getHeaderLogoSource(logoVariant, logoSize)} style={[styles.logoImage, { width: logoDimension, height: logoDimension }]} />
              </View>
            ) : null}
            <View style={styles.copy}>
              {eyebrow ? (
                <WMText style={styles.eyebrow} numberOfLines={1} variant="label">
                  {eyebrow}
                </WMText>
              ) : null}
              <WMText numberOfLines={variant === "dense" || variant === "compact" ? 1 : 2} style={styles.title} variant={config.titleVariant}>
                {title}
              </WMText>
              {subtitle ? (
                <WMText numberOfLines={2} style={styles.subtitle} variant="bodySm">
                  {subtitle}
                </WMText>
              ) : null}
              {meta ? <View style={styles.metaSlot}>{meta}</View> : null}
            </View>
          </View>
        </View>

        {resolvedActions ? (
          <View style={[styles.actions, disabledActions ? styles.actionsDisabled : null]}>{resolvedActions}</View>
        ) : null}
      </View>
    </View>
  );

  if (!decorativeAccent) {
    return headerContent;
  }

  return (
    <BotanicalDecorationLayer motifs={decorativeMotifs} preset="pageHeader">
      {headerContent}
    </BotanicalDecorationLayer>
  );
}

function getHeaderLogoSource(variant: WaymarkLogoVariant, size: WaymarkLogoSize): ImageSourcePropType {
  const imageVariant = size === "xs" || size === "sm" ? "iconSm" : size === "md" ? "iconMd" : "iconLg";

  if (variant === "appIcon") {
    if (imageVariant === "iconSm") {
      return require("../../../assets/skins/generated/logo/waymark-app-icon-stone-stamp/iconSm.webp");
    }

    if (imageVariant === "iconMd") {
      return require("../../../assets/skins/generated/logo/waymark-app-icon-stone-stamp/iconMd.webp");
    }

    return require("../../../assets/skins/generated/logo/waymark-app-icon-stone-stamp/iconLg.webp");
  }

  if (variant === "mono") {
    if (imageVariant === "iconSm") {
      return require("../../../assets/skins/generated/logo/waymark-stone-stamp-mono/iconSm.webp");
    }

    if (imageVariant === "iconMd") {
      return require("../../../assets/skins/generated/logo/waymark-stone-stamp-mono/iconMd.webp");
    }

    return require("../../../assets/skins/generated/logo/waymark-stone-stamp-mono/iconLg.webp");
  }

  if (imageVariant === "iconSm") {
    return require("../../../assets/skins/generated/logo/waymark-stone-stamp-primary/iconSm.webp");
  }

  if (imageVariant === "iconMd") {
    return require("../../../assets/skins/generated/logo/waymark-stone-stamp-primary/iconMd.webp");
  }

  return require("../../../assets/skins/generated/logo/waymark-stone-stamp-primary/iconLg.webp");
}

const styles = StyleSheet.create({
  container: {
    gap: pageHeaderTokens.spacing.gapTitle,
    overflow: "visible",
  },
  stickySurface: {
    borderRadius: pageHeaderTokens.radius.stickySurface,
    backgroundColor: pageHeaderTokens.color.surfaceSticky,
    paddingHorizontal: spacing.sm,
  },
  stickyScrolled: {
    ...getBorderStyle(pageHeaderTokens.border.stickyHairline),
    boxShadow: pageHeaderTokens.shadow.stickySoft,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  topRowCentered: {
    alignItems: "center",
  },
  left: {
    flex: 1,
    minWidth: 0,
    overflow: "visible",
  },
  titleWrap: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    overflow: "visible",
  },
  backSlot: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backSlotDense: {
    minWidth: 36,
    minHeight: 36,
  },
  logoSlot: {
    alignItems: "center",
    flexShrink: 0,
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  },
  logoImage: {
    resizeMode: "contain",
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: pageHeaderTokens.spacing.gapTitle,
    position: "relative",
    zIndex: 1,
  },
  eyebrow: {
    color: pageHeaderTokens.color.eyebrow,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: pageHeaderTokens.color.title,
  },
  subtitle: {
    color: pageHeaderTokens.color.subtitle,
  },
  metaSlot: {
    paddingTop: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: pageHeaderTokens.spacing.gapActions,
  },
  actionsDisabled: {
    opacity: 0.48,
  },
});
