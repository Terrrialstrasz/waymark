import { StyleSheet, View } from "react-native";
import { WMText } from "../../primitives/Text";
import { WaymarkIcon } from "../../primitives/WaymarkIcon";
import { foundationColors, semanticRadius, spacing } from "../../../theme/tokens";
import { StretchItem } from "./types";
import { Locale } from "../../../types/ui";
import { getHealthStrengthCopy, resolveText } from "./utils";

type Props = {
  locale: Locale;
  item: StretchItem;
};

export function StretchRow({ locale, item }: Props) {
  const copy = getHealthStrengthCopy(locale);
  const palette = getPalette(item.state);
  const label = getLabel(copy, item.state);

  return (
    <View style={[styles.row, { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor }]}>
      <View style={[styles.badge, { backgroundColor: palette.badgeBackgroundColor, borderColor: palette.badgeBorderColor }]}>
        {item.state === "done" ? (
          <WaymarkIcon decorative semanticName="status.done" size="lg" state="selected" />
        ) : (
          <WMText style={[styles.badgeText, { color: palette.badgeTextColor }]} variant="chip">
            {item.order}
          </WMText>
        )}
      </View>

      <View style={styles.copy}>
        <WMText numberOfLines={1} style={styles.title} variant="bodyStrong">
          {resolveText(item.title, locale)}
        </WMText>
        <WMText style={styles.duration} variant="meta">
          {item.durationLabel}
        </WMText>
      </View>

      <WMText style={styles.stateLabel} variant="meta">
        {label}
      </WMText>
    </View>
  );
}

function getLabel(copy: ReturnType<typeof getHealthStrengthCopy>, state: StretchItem["state"]) {
  switch (state) {
    case "active":
      return copy.states.now;
    case "next":
      return copy.states.next;
    case "done":
      return copy.states.done;
    default:
      return copy.states.upcoming;
  }
}

function getPalette(state: StretchItem["state"]) {
  switch (state) {
    case "active":
      return {
        backgroundColor: foundationColors.green.soft,
        borderColor: foundationColors.border.active,
        badgeBackgroundColor: foundationColors.green.base,
        badgeBorderColor: foundationColors.green.base,
        badgeTextColor: foundationColors.ink.inverse,
      };
    case "next":
      return {
        backgroundColor: foundationColors.gold.soft,
        borderColor: foundationColors.border.proof,
        badgeBackgroundColor: foundationColors.bg.paper,
        badgeBorderColor: foundationColors.border.proof,
        badgeTextColor: foundationColors.gold.deep,
      };
    case "done":
      return {
        backgroundColor: foundationColors.bg.paperWarm,
        borderColor: foundationColors.border.active,
        badgeBackgroundColor: foundationColors.green.soft,
        badgeBorderColor: foundationColors.border.active,
        badgeTextColor: foundationColors.green.deep,
      };
    default:
      return {
        backgroundColor: foundationColors.bg.paperWarm,
        borderColor: foundationColors.border.subtle,
        badgeBackgroundColor: foundationColors.bg.paper,
        badgeBorderColor: foundationColors.border.subtle,
        badgeTextColor: foundationColors.ink.secondary,
      };
  }
}

const styles = StyleSheet.create({
  row: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: semanticRadius.card.compact,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  badge: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: semanticRadius.badge,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontWeight: "700",
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: foundationColors.ink.primary,
  },
  duration: {
    color: foundationColors.ink.secondary,
  },
  stateLabel: {
    color: foundationColors.ink.secondary,
    maxWidth: 64,
    textAlign: "right",
  },
});
