import { StyleSheet, View } from "react-native";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { colors, foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";

type BacklogMetadataChipTone =
  | "idea"
  | "plan"
  | "mark"
  | "near"
  | "next"
  | "later"
  | "someday"
  | "unplanned"
  | "neutral";

type Props = {
  label: string;
  tone: BacklogMetadataChipTone;
  iconSemanticName?: WaymarkSemanticIconName;
};

const chipPalettes: Record<
  BacklogMetadataChipTone,
  { backgroundColor: string; borderColor: string; color: string; borderStyle?: "solid" | "dashed" }
> = {
  idea: {
    backgroundColor: foundationColors.green.soft,
    borderColor: foundationColors.border.active,
    color: foundationColors.ink.onGreenSoft,
  },
  plan: {
    backgroundColor: colors.blueSoft,
    borderColor: foundationColors.archive.blue,
    color: foundationColors.ink.primary,
  },
  mark: {
    backgroundColor: foundationColors.gold.soft,
    borderColor: foundationColors.border.proof,
    color: foundationColors.gold.deep,
  },
  near: {
    backgroundColor: foundationColors.green.soft,
    borderColor: foundationColors.border.active,
    color: foundationColors.ink.onGreenSoft,
  },
  next: {
    backgroundColor: colors.blueSoft,
    borderColor: foundationColors.archive.blue,
    color: foundationColors.ink.primary,
  },
  later: {
    backgroundColor: foundationColors.bg.paperWarm,
    borderColor: foundationColors.border.soft,
    color: foundationColors.ink.secondary,
  },
  someday: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.subtle,
    color: foundationColors.ink.tertiary,
  },
  unplanned: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.subtle,
    color: foundationColors.ink.tertiary,
    borderStyle: "dashed",
  },
  neutral: {
    backgroundColor: foundationColors.bg.paper,
    borderColor: foundationColors.border.soft,
    color: foundationColors.ink.secondary,
  },
};

export function BacklogMetadataChip({ label, tone, iconSemanticName }: Props) {
  const palette = chipPalettes[tone];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          borderStyle: palette.borderStyle ?? "solid",
        },
      ]}
    >
      {iconSemanticName ? <WaymarkIcon decorative semanticName={iconSemanticName} size="xs" state="muted" /> : null}
      <WMText numberOfLines={1} style={{ color: palette.color }} variant="chip">
        {label}
      </WMText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    minHeight: 26,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    borderWidth: 1,
    borderRadius: semanticRadius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
