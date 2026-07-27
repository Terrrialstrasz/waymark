import { useRef } from "react";
import { GestureResponderEvent, Pressable, StyleSheet, View } from "react-native";
import { getCopy } from "../../i18n/copy";
import { getPathVisualTokens } from "../../tokens/pathVisualTokens";
import { foundationColors, semanticRadius } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { StatusChip } from "../primitives/StatusChip";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WeeklyCodingItemActionAnchor, WeeklyCodingReportItem } from "./WeeklyCoding.types";
import { HorizontalJournalEntryCard } from "../journal";

type Props = {
  item: WeeklyCodingReportItem;
  locale?: Locale;
  reducedMotion?: boolean;
  onOpen?: (itemId: string) => void;
  onOpenDetail?: (itemId: string) => void;
  onRemoveFromWeek?: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
  onOpenMenu?: (itemId: string) => void;
  onRequestMenuAnchor?: (item: WeeklyCodingReportItem, anchor: WeeklyCodingItemActionAnchor) => void;
};

export function PulledBacklogItemRow({
  item,
  locale = "en",
  reducedMotion,
  onOpen,
  onOpenDetail,
  onRemoveFromWeek,
  onDelete,
  onOpenMenu,
  onRequestMenuAnchor,
}: Props) {
  const c = getCopy(locale).weeklyCoding;
  const anchorRef = useRef<View | null>(null);
  const pathVisual = getPathVisualTokens(item.pathId, item.pathColor);
  const hasMenu = Boolean(onOpenDetail || onRemoveFromWeek || onDelete);
  const canOpen = Boolean(onOpen);

  return (
    <HorizontalJournalEntryCard
      entryType="mark"
      chips={[
        { id: "status", label: item.statusLabel, stateTone: resolveWeeklyStatusTone(item.statusTone), variant: "status" },
        { id: "path", label: item.pathLabel, variant: "metadata" },
        { id: "schedule", label: item.scheduleLabel, variant: "metadata" },
      ]}
      body={item.body ?? item.description}
      onPress={canOpen ? () => onOpen?.(item.id) : undefined}
      pathId={item.pathId}
      pathLabel={item.pathLabel}
      pathColorToken={pathVisual.accent}
      title={item.title}
      trailing={hasMenu ? (
        <View collapsable={false} ref={anchorRef} style={styles.menuAnchor}>
          <Pressable
            accessibilityLabel={c.accessibility.openItemMenu.replace("{title}", item.title)}
            accessibilityRole="button"
            hitSlop={6}
            onPress={(event) => {
              stopEvent(event);
              onOpenMenu?.(item.id);
              anchorRef.current?.measureInWindow((x, y, width, height) => {
                onRequestMenuAnchor?.(item, { x, y, width, height });
              });
            }}
            style={({ pressed }) => [styles.menuButton, pressed ? styles.menuButtonPressed : null]}
          >
            <WaymarkIcon decorative semanticName="utility.more" size="sm" state="muted" />
          </Pressable>
        </View>
      ) : undefined}
    />
  );
}

function stopEvent(event: GestureResponderEvent) {
  event.stopPropagation();
}

function resolveWeeklyStatusTone(statusTone?: WeeklyCodingReportItem["statusTone"]) {
  switch (statusTone) {
    case "warning":
      return "weak" as const;
    case "rescue":
    case "snoozed":
    case "quieted":
    case "rescheduled":
      return "planned" as const;
    case "disabled":
      return "weak" as const;
    default:
      return statusTone as
        | "planned"
        | "upcoming"
        | "active"
        | "done"
        | "protected"
        | "weak"
        | "missed"
        | "substituted"
        | "archived"
        | "due_now"
        | "postponed"
        | "blocked"
        | "alive"
        | "neglected"
        | "growing"
        | "paused"
        | undefined;
  }
}

const styles = StyleSheet.create({
  menuAnchor: {
    justifyContent: "center",
  },
  menuButton: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 248, 236, 0.7)",
  },
  menuButtonPressed: {
    backgroundColor: "rgba(248, 239, 223, 0.92)",
  },
});
