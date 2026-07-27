import { StyleSheet, useWindowDimensions, View } from "react-native";
import { JournalCard } from "../primitives/JournalCard";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { getCopy } from "../../i18n/copy";
import { foundationColors, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { getChipToneStyle } from "./journalPlaceholders";
import { getBorderStyle } from "../../design-system/utils/get-border-style";

type Props = {
  ownerId?: string;
  locale?: Locale;
  variant?: "protected" | "repair" | "neutral" | "notClosed";
  dayTitle?: string;
  dayIconSemanticName?: "judgment.trailResult" | "judgment.repairPath";
  characterLabel?: string;
  characterIconSemanticName?: "judgment.protectedCharacter" | "judgment.repairPath";
  summary?: string;
  whatMattered?: string;
  tomorrowFirstStep?: string;
  markCountLabel?: string;
  readonly?: boolean;
  loading?: boolean;
  onPress?: () => void;
};

export function DayClosedJournalCard({
  ownerId,
  locale = "en",
  variant = "protected",
  dayTitle,
  dayIconSemanticName,
  characterLabel,
  characterIconSemanticName,
  summary,
  whatMattered,
  tomorrowFirstStep,
  markCountLabel,
  readonly = false,
  loading = false,
  onPress,
}: Props) {
  const c = getCopy(locale);
  const { width } = useWindowDimensions();
  const compactMobile = width <= 360;
  const actionable = Boolean(onPress) && !readonly && !loading;
  const resolvedOwnerId = ownerId ?? `day-closed-${variant}`;
  const resultText = characterLabel ?? getResultLabel(c, variant);
  const chips = [
    { label: resultText, colorToken: getVariantColor(variant) },
    ...(markCountLabel ? [{ label: markCountLabel, colorToken: foundationColors.ink.tertiary }] : []),
    ...(variant === "repair" ? [{ label: c.journal.needsRepair, colorToken: foundationColors.gold.deep }] : []),
  ].slice(0, 2);
  const accessibilityLabel = `${dayTitle ?? c.journal.dayClosed}. ${c.journal.characterResult}: ${resultText}.${markCountLabel ? ` ${markCountLabel}.` : ""}${tomorrowFirstStep ? ` ${c.journal.tomorrowFirstStep}: ${tomorrowFirstStep}.` : ""}`;

  return (
    <JournalCard
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={actionable ? "button" : "summary"}
      actionable={actionable}
      decorationPreset="resultSeal"
      decorative
      onPress={actionable ? onPress : undefined}
      contentStyle={compactMobile ? styles.compactCardContent : undefined}
      variant="hero"
    >
      <View style={styles.header}>
        <WaymarkIcon
          customHeight={compactMobile ? 48 : undefined}
          customWidth={compactMobile ? 48 : undefined}
          decorative={false}
          semanticName={dayIconSemanticName ?? (variant === "repair" ? "judgment.repairPath" : "judgment.dayClosed")}
          size={compactMobile ? "custom" : "lg"}
        />
        <View style={styles.headerCopy}>
          <WMText style={compactMobile ? styles.compactTitle : undefined} variant="sectionTitle">
            {dayTitle ?? c.journal.dayClosed}
          </WMText>
          <WMText numberOfLines={compactMobile ? 2 : undefined} style={[styles.resultLine, compactMobile ? styles.compactResultLine : undefined]} variant="bodySm">
            {c.journal.characterResult + ": " + resultText}
          </WMText>
        </View>
      </View>

      {characterIconSemanticName ? (
        <View style={styles.characterRow}>
          <WaymarkIcon decorative={false} semanticName={characterIconSemanticName} size="md" />
          <WMText variant="bodySm">{resultText}</WMText>
        </View>
      ) : null}

      {summary ? (
        <WMText numberOfLines={compactMobile ? 3 : undefined} style={styles.summary} variant="body">
          {summary}
        </WMText>
      ) : null}

      <View style={styles.chipsRow}>
        {chips.map((chip, index) => (
          <View key={`${resolvedOwnerId}-chip-${chip.label}-${index}`} style={[styles.chip, getChipViewStyle(chip.colorToken)]}>
            <WMText numberOfLines={1} style={styles.chipText} variant="metaCompact">
              {chip.label}
            </WMText>
          </View>
        ))}
      </View>

      {whatMattered ? (
        <View style={styles.reflectBlock}>
          <WMText style={styles.reflectLabel} variant="meta">
            {c.journal.whatMattered}
          </WMText>
          <WMText variant="bodySm">{whatMattered}</WMText>
        </View>
      ) : null}

      {tomorrowFirstStep ? (
        <View style={styles.reflectBlock}>
          <WMText style={styles.reflectLabel} variant="meta">
            {c.journal.tomorrowFirstStep}
          </WMText>
          <WMText variant="bodySm">{tomorrowFirstStep}</WMText>
        </View>
      ) : null}
    </JournalCard>
  );
}

function getResultLabel(c: ReturnType<typeof getCopy>, variant: NonNullable<Props["variant"]>) {
  if (variant === "repair") {
    return c.journal.needsRepair;
  }
  if (variant === "neutral") {
    return c.journal.steady;
  }
  if (variant === "notClosed") {
    return c.journal.notClosed;
  }
  return c.journal.protected;
}

function getVariantColor(variant: NonNullable<Props["variant"]>) {
  if (variant === "repair") {
    return foundationColors.gold.deep;
  }
  if (variant === "neutral") {
    return foundationColors.ink.tertiary;
  }
  return foundationColors.green.deep;
}

function getChipViewStyle(colorToken?: string) {
  const tone = getChipToneStyle(colorToken);
  return {
    backgroundColor: tone.backgroundColor,
    ...getBorderStyle(tone.border),
  };
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  compactCardContent: {
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  compactTitle: {
    fontSize: 28,
    lineHeight: 32,
  },
  compactResultLine: {
    fontSize: 16,
    lineHeight: 22,
  },
  resultLine: {
    color: foundationColors.ink.secondary,
  },
  summary: {
    color: foundationColors.ink.secondary,
  },
  chipsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    overflow: "hidden",
  },
  chip: {
    borderRadius: 999,
    maxWidth: "100%",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  chipText: {
    color: foundationColors.ink.primary,
    flexShrink: 1,
  },
  characterRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  reflectBlock: {
    gap: 4,
  },
  reflectLabel: {
    color: foundationColors.ink.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
});
