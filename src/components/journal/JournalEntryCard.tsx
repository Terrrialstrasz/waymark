import { StyleSheet, View } from "react-native";
import { JournalCard } from "../primitives/JournalCard";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { EntityIcon } from "../domain/icons/EntityIcon";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { getCopy } from "../../i18n/copy";
import { foundationColors, semanticBorder, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { MediaCollage, JournalImageSource } from "./MediaCollage";
import { getChipToneStyle, journalChrome } from "./journalPlaceholders";

type Chip = {
  label: string;
  iconName?: "calendar" | "done" | "heart" | "warning" | "target" | "sparkles" | "clock";
  colorToken?: string;
};

type Props = {
  ownerId?: string;
  locale?: Locale;
  entryType: "mark" | "memory";
  title: string;
  entityLine?: string;
  body?: string;
  image?: JournalImageSource;
  showImagePlaceholder?: boolean;
  chips?: Chip[];
  status?: "default" | "done" | "planned" | "warning" | "missed";
  readonly?: boolean;
  loading?: boolean;
  onPress?: () => void;
};

export function JournalEntryCard({
  ownerId,
  locale = "en",
  entryType,
  title,
  entityLine,
  body,
  image,
  showImagePlaceholder = false,
  chips = [],
  status = "default",
  readonly = false,
  loading = false,
  onPress,
}: Props) {
  const c = getCopy(locale);
  const actionable = Boolean(onPress) && !readonly && !loading;
  const statusChip = (status !== "default" ? [{ label: getStatusLabel(c, status), colorToken: getStatusColor(status) }, ...chips] : chips).slice(0, 2);
  const resolvedOwnerId = ownerId ?? `${entryType}-${title}-${entityLine ?? "entry"}`;
  const accessibilityLabel = `${entryType === "memory" ? c.journal.memory : c.journal.mark}, ${title}${entityLine ? `, ${entityLine}` : ""}${status !== "default" ? `, ${getStatusLabel(c, status)}` : ""}${actionable ? ` ${c.journal.opensDetail}` : ""}`;

  const content = (
    <JournalCard
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={actionable ? "button" : "summary"}
      actionable={actionable}
      loading={loading}
      onPress={actionable ? onPress : undefined}
      variant="standard"
      style={styles.card}
    >
      <View style={styles.stack}>
        <View style={styles.mediaWrap}>
          <View style={styles.mediaSlot}>
            {loading ? (
              <View style={styles.mediaSkeleton} />
            ) : image?.src || showImagePlaceholder ? (
              <MediaCollage
                images={[image ?? {}]}
                locale={locale}
                placeholderSeed={title}
                readonly
                titleForAccessibility={title}
                variant="single"
              />
            ) : (
              <View style={styles.sealFallback}>
                <EntityIcon entity={entryType === "memory" ? "memory" : "mark"} />
              </View>
            )}
          </View>

        </View>

        <View style={styles.copy}>
          <View style={styles.labelStack}>
            <WMText numberOfLines={2} style={styles.title} variant="cardTitle">
              {loading ? " " : title}
            </WMText>
            {entityLine ? (
              <WMText numberOfLines={1} style={styles.entityLine} variant="meta">
                {entityLine}
              </WMText>
            ) : null}

            {statusChip.length ? (
              <View style={styles.chipsRow}>
                {statusChip.map((chip, index) => (
                  <View key={`${resolvedOwnerId}-chip-${chip.iconName ?? "text"}-${chip.label}-${index}`} style={[styles.chip, getChipViewStyle(chip.colorToken)]}>
                    {chip.iconName ? <WaymarkIcon decorative semanticName={getChipIcon(chip.iconName)} size="xs" /> : null}
                    <WMText numberOfLines={1} style={[styles.chipText, { color: getChipToneStyle(chip.colorToken).color }]} variant="metaCompact">
                      {chip.label}
                    </WMText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {body ? (
            <WMText numberOfLines={2} style={styles.body} variant="bodySm">
              {body}
            </WMText>
          ) : null}
        </View>
      </View>
    </JournalCard>
  );

  return content;
}

function getStatusLabel(c: ReturnType<typeof getCopy>, status: Props["status"]) {
  if (status === "done") {
    return c.journal.done;
  }
  if (status === "planned") {
    return c.journal.planned;
  }
  if (status === "warning") {
    return c.journal.needsRepair;
  }
  if (status === "missed") {
    return c.journal.missed;
  }
  return "";
}

function getStatusColor(status: Props["status"]) {
  switch (status) {
    case "done":
      return foundationColors.green.deep;
    case "planned":
      return foundationColors.gold.deep;
    case "warning":
    case "missed":
      return foundationColors.gold.deep;
    default:
      return undefined;
  }
}

function getChipViewStyle(colorToken?: string) {
  const tone = getChipToneStyle(colorToken);
  return {
    backgroundColor: tone.backgroundColor,
    ...getBorderStyle(tone.border),
  };
}

function getChipIcon(iconName: NonNullable<Chip["iconName"]>) {
  switch (iconName) {
    case "calendar":
      return "utility.calendar";
    case "clock":
      return "utility.clock";
    case "done":
      return "status.done";
    case "warning":
      return "status.weak";
    case "target":
      return "entity.mark";
    case "sparkles":
      return "status.planned";
    case "heart":
    default:
      return "entity.memory";
  }
}

const styles = StyleSheet.create({
  card: {
    width: 192,
  },
  stack: {
    gap: spacing.sm,
  },
  mediaWrap: {
    gap: spacing.xs,
  },
  mediaSlot: {
    width: "100%",
  },
  mediaSkeleton: {
    aspectRatio: 1.16,
    backgroundColor: foundationColors.bg.paperSoft,
    borderRadius: journalChrome.radiusMd,
  },
  sealFallback: {
    alignItems: "center",
    aspectRatio: 1.16,
    backgroundColor: foundationColors.bg.paperWarm,
    borderRadius: journalChrome.radiusMd,
    justifyContent: "center",
    ...getBorderStyle(semanticBorder.media.default),
  },
  copy: {
    gap: spacing.xs,
    minWidth: 0,
  },
  labelStack: {
    gap: 4,
    minWidth: 0,
  },
  title: {
    color: journalChrome.ink,
    fontSize: 20,
    lineHeight: 25,
  },
  entityLine: {
    color: foundationColors.ink.tertiary,
  },
  body: {
    color: journalChrome.inkSecondary,
  },
  chipsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: "100%",
    overflow: "hidden",
  },
  chip: {
    alignItems: "center",
    borderRadius: journalChrome.radiusPill,
    flexDirection: "row",
    gap: 4,
    maxWidth: 132,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    flexShrink: 1,
  },
});
