import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { WaymarkLogo } from "../components/primitives/WaymarkLogo";
import { WaymarkAppIconPreview } from "../components/primitives/WaymarkAppIconPreview";
import { WMCard } from "../components/primitives/WMCard";
import { WMText } from "../components/primitives/Text";
import { foundationColors, semanticBorder, semanticElevation, semanticRadius, spacing, waymarkLogoTokens } from "../theme/tokens";
import { Locale } from "../types/ui";
import { getBorderStyle } from "../design-system/utils/get-border-style";
import { hasWaymarkLogoAssetSource, waymarkLogoAssets, WaymarkLogoSize, WaymarkLogoVariant } from "../skins/waymark/assets/logo";

type Props = {
  locale: Locale;
};

const sizeOrder: WaymarkLogoSize[] = ["xs", "sm", "md", "lg", "xl", "hero"];
const monoSizes: WaymarkLogoSize[] = ["xs", "sm", "md", "lg"];
const appIconSizes: WaymarkLogoSize[] = ["md", "lg", "xl"];

export function WaymarkLogoBoard({ locale }: Props) {
  const assetsReady = Object.keys(waymarkLogoAssets).every((variant) =>
    hasWaymarkLogoAssetSource(variant as WaymarkLogoVariant)
  );

  return (
    <View style={styles.stack}>
      <BoardSection
        title="Waymark Logo / Registry"
        subtitle="Approved Option C naming is wired through a shared brand registry. This board stays read-only and non-interactive."
      >
        {assetsReady ? null : (
          <WMText style={styles.warning} variant="bodySm">
            Bundled logo assets are missing. Re-run `npm run assets:sync:waymark-skins` to re-sync and rebuild the generated variants.
          </WMText>
        )}
        <View style={styles.metaList}>
          {Object.values(waymarkLogoAssets).map((asset) => (
            <WMText key={asset.id} variant="meta">
              {`${asset.id} -> ${asset.fileName}`}
            </WMText>
          ))}
        </View>
      </BoardSection>

      <BoardSection title="Primary / xs-sm-md-lg-xl-hero">
        <LogoRail locale={locale} sizes={sizeOrder} variant="primary" />
      </BoardSection>

      <BoardSection title="Mono / xs-sm-md-lg">
        <LogoRail locale={locale} sizes={monoSizes} variant="mono" />
      </BoardSection>

      <BoardSection title="App Icon / md-lg-xl">
        <View style={styles.previewRow}>
          {appIconSizes.map((size) => (
            <WaymarkAppIconPreview key={size} locale={locale} size={size} />
          ))}
        </View>
      </BoardSection>

      <BoardSection title="Parchment Background">
        <SurfaceStage backgroundColor={waymarkLogoTokens.surface.parchment}>
          <WaymarkLogo decorative={false} locale={locale} size="lg" variant="primary" />
        </SurfaceStage>
      </BoardSection>

      <BoardSection title="Dark Moss Background">
        <SurfaceStage backgroundColor={waymarkLogoTokens.surface.mossDeep}>
          <WaymarkLogo decorative={false} locale={locale} size="lg" variant="primary" />
        </SurfaceStage>
      </BoardSection>

      <BoardSection title="JournalCard Surface">
        <WMCard>
          <View style={styles.journalSurface}>
            <WaymarkLogo decorative={false} locale={locale} size="lg" variant="primary" />
          </View>
        </WMCard>
      </BoardSection>

      <BoardSection title="Tiny 16px Readability Test">
        <View style={styles.previewRow}>
          <WaymarkLogo decorative locale={locale} size="xs" variant="mono" />
          <WMText variant="meta">`xs` resolves to 16px.</WMText>
        </View>
      </BoardSection>

      <BoardSection title="Accessibility Label Test">
        <View style={styles.previewRow}>
          <WaymarkLogo decorative={false} locale={locale} size="md" variant="primary" />
          <WaymarkLogo decorative={false} locale={locale} size="md" variant="appIcon" />
        </View>
      </BoardSection>
    </View>
  );
}

function LogoRail({
  variant,
  sizes,
  locale,
}: {
  variant: WaymarkLogoVariant;
  sizes: WaymarkLogoSize[];
  locale: Locale;
}) {
  return (
    <View style={styles.previewRow}>
      {sizes.map((size) => (
        <View key={`${variant}-${size}`} style={styles.logoCell}>
          <WaymarkLogo decorative={false} locale={locale} size={size} variant={variant} />
          <WMText variant="meta">{size}</WMText>
        </View>
      ))}
    </View>
  );
}

function SurfaceStage({
  backgroundColor,
  children,
}: {
  backgroundColor: string;
  children: ReactNode;
}) {
  return <View style={[styles.surfaceStage, { backgroundColor }]}>{children}</View>;
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  warning: {
    color: foundationColors.gold.deep,
  },
  metaList: {
    gap: spacing.xs,
  },
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
  },
  logoCell: {
    alignItems: "center",
    gap: spacing.xs,
  },
  surfaceStage: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: semanticRadius.card.default,
    ...getBorderStyle(semanticBorder.card.subtle),
    boxShadow: semanticElevation.row,
    padding: spacing.lg,
  },
  journalSurface: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: semanticRadius.card.default,
    backgroundColor: waymarkLogoTokens.surface.journalCard,
    padding: spacing.lg,
  },
});
