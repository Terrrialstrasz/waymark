import { useRef } from "react";
import { GestureResponderEvent, Pressable, StyleSheet, View } from "react-native";
import { Locale } from "../../types/ui";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { colors, foundationColors, semanticRadius } from "../../theme/tokens";
import {
  BacklogItemViewModel,
  BacklogMenuAnchor,
  getBacklogHorizonLabel,
  getBacklogResolvedIcon,
  getBacklogTypeLabel,
} from "./types";
import { getCopy } from "../../i18n/copy";
import { HorizontalJournalEntryCard } from "../journal";

type Props = {
  item: BacklogItemViewModel;
  locale: Locale;
  canOpen?: boolean;
  hasActions?: boolean;
  onPress?: (itemId: string) => void;
  onOpenActionMenu?: (item: BacklogItemViewModel, anchor: BacklogMenuAnchor) => void;
};

export function BacklogHorizontalItemCard({
  item,
  locale,
  canOpen = false,
  hasActions = false,
  onPress,
  onOpenActionMenu,
}: Props) {
  const backlog = getCopy(locale).backlog;
  const anchorRef = useRef<View | null>(null);
  const resolvedHorizonLabel = getBacklogHorizonLabel(locale, item.horizonTone, item.horizonLabel);
  const palette = getCardPalette(item.type);

  return (
    <HorizontalJournalEntryCard
      entryType="mark"
      chips={[
        { id: "type", label: getBacklogTypeLabel(locale, item.type), variant: "metadata" },
        { id: "horizon", label: resolvedHorizonLabel, variant: "metadata" },
      ]}
      body={item.subtitle}
      onPress={canOpen && onPress ? () => onPress(item.id) : undefined}
      pathLabel={getBacklogTypeLabel(locale, item.type)}
      pathColorToken={palette.start}
      title={item.title}
      trailing={hasActions ? (
        <View collapsable={false} ref={anchorRef} style={styles.menuAnchor}>
          <Pressable
            accessibilityLabel={backlog.accessibility.openActions.replace("{title}", item.title)}
            accessibilityRole="button"
            hitSlop={6}
            onPress={(event) => {
              stopEvent(event);
              anchorRef.current?.measureInWindow((x, y, width, height) => {
                onOpenActionMenu?.(item, { x, y, width, height });
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

function getCardPalette(type: BacklogItemViewModel["type"]) {
  switch (type) {
    case "idea":
      return {
        start: foundationColors.green.soft,
        end: "#F5F9EE",
        medallionSurface: "#FFF7EC",
      };
    case "plan":
      return {
        start: colors.blueSoft,
        end: "#EEF4F6",
        medallionSurface: "#FFF8EC",
      };
    case "mark":
      return {
        start: foundationColors.gold.soft,
        end: "#F8F0E4",
        medallionSurface: "#FFF7EC",
      };
  }
}

function stopEvent(event: GestureResponderEvent) {
  event.stopPropagation();
}

function buildCardAccessibilityLabel(title: string, type: BacklogItemViewModel["type"], horizonLabel: string, locale: Locale) {
  return [title, getBacklogTypeLabel(locale, type), horizonLabel].filter(Boolean).join(", ");
}

const styles = StyleSheet.create({
  menuAnchor: {
    justifyContent: "center",
  },
  menuButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: semanticRadius.badge,
  },
  menuButtonPressed: {
    backgroundColor: "rgba(255, 248, 234, 0.88)",
  },
});
