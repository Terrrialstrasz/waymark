import { StyleSheet, View } from "react-native";
import { Locale, PathId } from "../../types/ui";
import { PATH_IDENTITY_ASSET_IDS } from "../shared/pathIdentityAssets";
import { getPathsCopy } from "../../i18n/pathsCopy";
import { foundationColors, spacing } from "../../theme/tokens";
import { JournalCard } from "../primitives/JournalCard";
import { WaymarkImage } from "../primitives/WaymarkImage";
import { WMText } from "../primitives/Text";

type Props = {
  locale: Locale;
  pathId: PathId;
  body: string;
};

export function WhyThisPathCard({ locale, pathId, body }: Props) {
  const c = getPathsCopy(locale);

  return (
    <JournalCard
      backgroundLayer={
        <View pointerEvents="none" style={styles.watermarkWrap}>
          <WaymarkImage alt="" assetId={PATH_IDENTITY_ASSET_IDS[pathId]} decorative imageStyle={styles.watermark} usage="pathIcon" />
        </View>
      }
      style={styles.card}
      variant="standard"
    >
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <WaymarkImage alt="" assetId={PATH_IDENTITY_ASSET_IDS[pathId]} decorative imageStyle={styles.iconImage} usage="pathIcon" />
        </View>
        <WMText style={styles.title} variant="sectionTitle">
          {c.detail.whyThisPathTitle}
        </WMText>
      </View>
      <WMText numberOfLines={3} style={styles.body} variant="body">
        {body}
      </WMText>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: foundationColors.bg.paperWarm,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  iconImage: {
    width: 24,
    height: 24,
  },
  title: {
    flex: 1,
  },
  body: {
    color: foundationColors.ink.secondary,
  },
  watermarkWrap: {
    position: "absolute",
    right: -8,
    bottom: -6,
  },
  watermark: {
    width: 92,
    height: 92,
    opacity: 0.05,
  },
});
