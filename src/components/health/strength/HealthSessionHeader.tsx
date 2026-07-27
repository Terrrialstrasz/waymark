import { StyleSheet, View } from "react-native";
import { UtilityIconButton } from "../../domain/icons/UtilityIconButton";
import { WMText } from "../../primitives/Text";
import { foundationColors, spacing } from "../../../theme/tokens";
import { StrengthSessionData } from "./types";
import { getHealthStrengthCopy } from "./utils";

type Props = {
  session: StrengthSessionData;
  onBack?: () => void;
  onMore?: () => void;
  onReset?: () => void;
  mode?: "full" | "titleOnly" | "detailsOnly";
};

export function HealthSessionHeader({ session, onBack, onMore, onReset, mode = "full" }: Props) {
  const copy = getHealthStrengthCopy(session.locale);
  const showTopRow = mode !== "detailsOnly";
  const showDetails = false;
  const resetAccessibilityLabel = session.locale === "vi" ? "Reset buoi tap" : "Reset workout session";

  if (!showTopRow && !showDetails) {
    return null;
  }

  return (
    <View style={styles.stack}>
      {showTopRow ? (
        <View style={styles.topRow}>
          <UtilityIconButton accessibilityLabel={copy.accessibility.back} icon="back" onPress={onBack} size="sm" />
          <View style={styles.titleWrap}>
            <WMText numberOfLines={1} style={styles.title} variant="pageTitle">
              {session.dayLabel}
            </WMText>
          </View>
          <View style={styles.actionRow}>
            {onReset ? <UtilityIconButton accessibilityLabel={resetAccessibilityLabel} icon="refresh" onPress={onReset} size="sm" /> : null}
            {onMore ? <UtilityIconButton accessibilityLabel={copy.accessibility.more} icon="more" onPress={onMore} size="sm" /> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 0,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    flex: 1,
    color: foundationColors.ink.primary,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
