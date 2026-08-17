import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { TodayPathHeroPath } from "../../lib/waymark/todayPathHero";
import { foundationColors, getWaymarkPressStyle, semanticRadius, spacing, useReducedMotionEnabled } from "../../theme/tokens";
import type { Locale, PathId } from "../../types/ui";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMText } from "../primitives/Text";

type Props = {
  locale: Locale;
  paths: TodayPathHeroPath[];
  onOpenPath?: (pathId: PathId) => void;
};

export function PathHeroStrip({ locale, paths, onOpenPath }: Props) {
  return (
    <View style={styles.stack}>
      <WMText style={styles.statement} variant="sectionTitle">
        My life has 7 paths
      </WMText>
      <ScrollView
        contentContainerStyle={styles.row}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
      >
        {paths.map((path) => (
          <PathHeroButton key={path.id} locale={locale} onPress={() => onOpenPath?.(path.id)} path={path} />
        ))}
      </ScrollView>
    </View>
  );
}

function PathHeroButton({
  locale,
  path,
  onPress,
}: {
  locale: Locale;
  path: TodayPathHeroPath;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotionEnabled();
  return (
    <Pressable
      accessibilityLabel={`${path.label[locale]} path`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: path.color.accentMuted },
        getWaymarkPressStyle({ pressed, reducedMotion, variant: "secondary" }),
      ]}
    >
      <View style={[styles.iconBadge, { backgroundColor: path.color.accentSoft }]}>
        {path.pathIconAssetId ? (
          <WaymarkImage
            alt={path.heroAlt[locale]}
            assetId={path.pathIconAssetId}
            imageStyle={styles.icon}
            usage="pathIcon"
          />
        ) : null}
      </View>
      <WMText numberOfLines={2} style={[styles.label, { color: path.color.accentDeep }]} variant="metaCompact">
        {path.compactLabel[locale]}
      </WMText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  statement: {
    color: foundationColors.ink.primary,
  },
  scroller: {
    marginRight: -spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  button: {
    alignItems: "center",
    backgroundColor: foundationColors.bg.paper,
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    gap: spacing.xs,
    minHeight: 112,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    width: 92,
  },
  iconBadge: {
    alignItems: "center",
    borderRadius: 36,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  icon: {
    height: 54,
    width: 54,
  },
  label: {
    textAlign: "center",
  },
});
