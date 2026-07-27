import { StyleSheet, View } from "react-native";
import { derivePackCheckHeroState } from "../../app/packCheckDetailState";
import { useCopy } from "../../i18n/useCopy";
import { getTodayPathHeroPath } from "../../lib/waymark/todayPathHero";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { Locale, PathId } from "../../types/ui";
import { PackCheckInstanceStatus } from "../../domain/waymark";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMText } from "../primitives/Text";
import type { PackCheckItem } from "./types";

type Props = {
  packCheckName: string;
  packCheckStatus?: PackCheckInstanceStatus;
  path: PathId;
  items: PackCheckItem[];
  locale: Locale;
  isLoading?: boolean;
};

export function PackCheckHero({
  packCheckName,
  packCheckStatus,
  path,
  items,
  locale,
  isLoading = false,
}: Props) {
  const c = useCopy(locale).packCheck;
  const pathMeta = getTodayPathHeroPath(path);
  const heroState = derivePackCheckHeroState(items, packCheckStatus);
  const supportText =
    heroState.isEmpty ? c.hero.support.empty
    : heroState.isCompleted ? (locale === "vi" ? "Da hoan tat cho lan nay." : "Completed for now.")
    : heroState.allChecked ? c.hero.support.complete
    : c.hero.support.incomplete;

  return (
    <View style={[styles.card, { backgroundColor: pathMeta.color.accentSoft, borderColor: pathMeta.color.accentMuted }]}>
      {pathMeta.heroAssetId ? (
        <WaymarkImage
          alt={pathMeta.heroAlt[locale]}
          assetId={pathMeta.heroAssetId}
          decorative
          imageStyle={styles.heroImage}
          style={styles.heroFill}
          usage="hero"
        />
      ) : null}
      <View style={[styles.imageWash, { backgroundColor: pathMeta.color.heroPatch, borderColor: pathMeta.color.heroPatchBorder }]} />

      <View style={styles.copy}>
        <WMText numberOfLines={2} style={[styles.eyebrow, { color: pathMeta.color.accentDeep }]} variant="label">
          {packCheckName}
        </WMText>
        <WMText style={styles.support} variant="bodySm">
          {isLoading ? c.loading.heroSupport : supportText}
        </WMText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    minHeight: 132,
    overflow: "hidden",
    position: "relative",
  },
  heroFill: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    opacity: 0.26,
  },
  imageWash: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    opacity: 0.86,
    zIndex: 1,
  },
  copy: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "relative",
    zIndex: 2,
  },
  eyebrow: {
    letterSpacing: 0.4,
  },
  support: {
    color: foundationColors.ink.secondary,
    lineHeight: 18,
    maxWidth: "92%",
  },
});
