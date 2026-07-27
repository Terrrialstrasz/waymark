import { StyleSheet, View } from "react-native";
import { Locale } from "../../types/ui";
import { foundationColors, spacing } from "../../theme/tokens";
import { getCopy } from "../../i18n/copy";
import { UtilityIconButton } from "../domain/icons/UtilityIconButton";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";

type Props = {
  locale: Locale;
  onBack?: () => void;
  onOpenMore?: () => void;
};

export function BacklogHeader({ locale, onBack, onOpenMore }: Props) {
  const backlog = getCopy(locale).backlog;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.leading}>
          <UtilityIconButton accessibilityLabel={backlog.accessibility.back} icon="back" onPress={onBack} />

          <View style={styles.copyWrap}>
            <View style={styles.titleRow}>
              <WMText style={styles.title} variant="screenTitle">
                {backlog.title}
              </WMText>
            </View>

            <WMText style={styles.subtitle} variant="bodyLg">
              {backlog.subtitle}
            </WMText>
          </View>
        </View>

      </View>

      <View pointerEvents="none" style={styles.sprigWrap}>
        <WaymarkIcon decorative semanticName="botanical.sectionSprig" size="lg" state="muted" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  leading: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  copyWrap: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
    paddingTop: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flexShrink: 1,
  },
  subtitle: {
    color: foundationColors.ink.secondary,
    width: "100%",
  },
  sprigWrap: {
    alignSelf: "flex-end",
    marginRight: spacing.md,
    opacity: 0.58,
  },
});
