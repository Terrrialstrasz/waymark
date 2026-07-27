import { StyleSheet, View } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { fontFamilyTokens, foundationColors, spacing } from "../../theme/tokens";
import { PathSkin } from "../../tokens/pathVisualTokens";
import { PathAccentBadge } from "../detail/PathAccentBadge";
import { JournalCard } from "../primitives/JournalCard";
import { WMText } from "../primitives/Text";

type Props = {
  title: string;
  body: string;
  pathSkin: PathSkin;
  iconSemanticName: WaymarkSemanticIconName;
};

export function MarkProofBlock({ title, body, pathSkin, iconSemanticName }: Props) {
  return (
    <JournalCard
      backgroundLayer={<View accessible={false} aria-hidden style={[styles.pathWash, { backgroundColor: pathSkin.softColor }]} />}
      decorative
      decorationPreset="entityCard"
      preserveSurfaceColorOnPress
      variant="standard"
    >
      <View style={styles.header}>
        <PathAccentBadge semanticName={iconSemanticName} size="sectionIcon" skin={pathSkin} />
        <WMText style={styles.title} variant="sectionTitle">
          {title}
        </WMText>
      </View>
      <WMText style={styles.body} variant="bodyLg">
        {body}
      </WMText>
    </JournalCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  body: {
    color: foundationColors.ink.primary,
    fontFamily: fontFamilyTokens.serif.runtime,
    fontSize: 18,
    lineHeight: 30,
  },
  title: {
    flex: 1,
  },
  pathWash: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "52%",
    height: "100%",
    opacity: 0.22,
    borderBottomLeftRadius: 96,
  },
});
