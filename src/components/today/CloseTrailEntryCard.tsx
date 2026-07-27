import { Pressable, StyleSheet, View } from "react-native";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { foundationColors, fontFamilyTokens, getWaymarkPressStyle, semanticRadius, spacing, useReducedMotionEnabled } from "../../theme/tokens";
import { Locale } from "../../types/ui";

export type CloseTrailEntryStatus = "default" | "completedToday" | "disabled" | "loading" | "hidden";

type Props = {
  status?: CloseTrailEntryStatus;
  locale: Locale;
  onPress?: () => void;
  isCloseTrailEnabled?: boolean;
  copy?: {
    title?: string;
    subtitle?: string;
    completedSubtitle?: string;
    accessibilityLabel?: string;
  };
  className?: string;
};

const closeTrailTokens = {
  deep: foundationColors.gold.deep,
  border: "#E6C765",
} as const;

export function CloseTrailEntryCard({
  status = "default",
  locale,
  onPress,
  isCloseTrailEnabled = true,
  copy,
}: Props) {
  const reducedMotion = useReducedMotionEnabled();

  if (!isCloseTrailEnabled) {
    return null;
  }

  if (status === "hidden") {
    return null;
  }

  if (status === "loading") {
    return <CloseTrailEntryCardSkeleton />;
  }

  const completed = status === "completedToday";
  const disabled = status === "disabled";
  const defaultTitle = locale === "vi" ? "Khep trail" : "Close the Trail";
  const defaultSubtitle = locale === "vi" ? "Hom nay ban de lai nhung dau moc nao?" : "What marks did you leave today?";
  const defaultCompletedSubtitle = locale === "vi" ? "Hom nay da duoc khep lai." : "Today is closed.";
  const title = copy?.title ?? defaultTitle;
  const subtitle = completed ? copy?.completedSubtitle ?? defaultCompletedSubtitle : copy?.subtitle ?? defaultSubtitle;
  const accessibilityLabel =
    copy?.accessibilityLabel ??
    (completed
      ? locale === "vi"
        ? "Khep ngay. Hom nay da duoc khep lai."
        : "Close the Trail. Today is closed."
      : locale === "vi"
        ? "Khep ngay. Hom nay ban de lai nhung dau moc nao? Mo phan phan tu."
        : "Close the Trail. What marks did you leave today? Opens reflections.");
  const tappable = Boolean(onPress) && !disabled;

  const content = (
    <View
      style={[
        styles.card,
        {
          borderColor: closeTrailTokens.border,
          opacity: disabled ? 0.58 : 1,
        },
      ]}
    >
      <View style={styles.sealWrap}>
        <WaymarkIcon
          customHeight={76}
          customWidth={68}
          decorative
          semanticName="judgment.dayClosed"
          size="custom"
          state={disabled ? "disabled" : completed ? "selected" : "default"}
        />
      </View>

      <View style={styles.textColumn}>
        <WMText numberOfLines={1} style={[styles.title, { color: closeTrailTokens.deep }]} variant="sectionTitle">
          {title}
        </WMText>
        <WMText numberOfLines={2} style={styles.subtitle} variant="body">
          {subtitle}
        </WMText>
      </View>

      <View pointerEvents="none" style={styles.chevronWrap}>
        <WaymarkIcon decorative semanticName="utility.chevron" size="sm" state={disabled ? "disabled" : "default"} />
      </View>
    </View>
  );

  if (!tappable) {
    return content;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, getWaymarkPressStyle({ pressed, reducedMotion, variant: "row" })]}
    >
      {content}
    </Pressable>
  );
}

function CloseTrailEntryCardSkeleton() {
  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <View style={styles.sealWrap}>
        <View style={styles.skeletonSeal} />
      </View>
      <View style={styles.textColumn}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
      </View>
      <View style={styles.chevronWrap}>
        <View style={styles.skeletonChevron} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 22,
  },
  card: {
    alignItems: "center",
    backgroundColor: foundationColors.bg.paper,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 104,
    overflow: "hidden",
    padding: 16,
    width: "100%",
  },
  sealWrap: {
    marginRight: spacing.lg,
    minWidth: 72,
  },
  textColumn: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  title: {
    fontSize: 19,
    lineHeight: 24,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
    fontFamily: fontFamilyTokens.serif.runtime,
    fontSize: 14,
    lineHeight: 19,
  },
  chevronWrap: {
    marginLeft: spacing.sm,
  },
  skeletonCard: {
    backgroundColor: foundationColors.bg.paper,
  },
  skeletonSeal: {
    backgroundColor: foundationColors.bg.paperSoft,
    borderRadius: 8,
    height: 76,
    width: 68,
  },
  skeletonTitle: {
    backgroundColor: foundationColors.bg.paperSoft,
    borderRadius: 8,
    height: 18,
    width: "54%",
  },
  skeletonSubtitle: {
    backgroundColor: foundationColors.bg.paperSoft,
    borderRadius: 8,
    height: 34,
    marginTop: 6,
    width: "82%",
  },
  skeletonChevron: {
    backgroundColor: foundationColors.bg.paperSoft,
    borderRadius: 999,
    height: 16,
    width: 16,
  },
});
