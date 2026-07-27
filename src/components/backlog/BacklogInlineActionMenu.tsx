import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Locale } from "../../types/ui";
import { foundationColors, semanticElevation, semanticRadius, spacing } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { getCopy } from "../../i18n/copy";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { BacklogItemViewModel, BacklogMenuAnchor } from "./types";

type Props = {
  visible: boolean;
  locale: Locale;
  item?: BacklogItemViewModel | null;
  anchor?: BacklogMenuAnchor | null;
  canDeleteBacklogItem?: boolean;
  canAddToWeeklyCoding?: boolean;
  canCreateMarkFromBacklog?: boolean;
  onClose: () => void;
  onDeleteBacklogItem?: (itemId: string) => void;
  onAddToWeeklyCoding?: (itemId: string) => void;
  onCreateMarkFromBacklog?: (itemId: string) => void;
};

export function BacklogInlineActionMenu({
  visible,
  locale,
  item,
  anchor,
  canDeleteBacklogItem = false,
  canAddToWeeklyCoding = false,
  canCreateMarkFromBacklog = false,
  onClose,
  onDeleteBacklogItem,
  onAddToWeeklyCoding,
  onCreateMarkFromBacklog,
}: Props) {
  const backlog = getCopy(locale).backlog;
  const { width, height } = useWindowDimensions();

  if (!visible || !item || !anchor) {
    return null;
  }

  const actions = [
    canDeleteBacklogItem && onDeleteBacklogItem
      ? {
          id: "delete",
          label: backlog.actions.delete,
          accessibilityLabel: backlog.accessibility.delete.replace("{title}", item.title),
          icon: "utility.close" as const,
          destructive: true,
          onPress: () => onDeleteBacklogItem(item.id),
        }
      : null,
    canAddToWeeklyCoding && onAddToWeeklyCoding
      ? {
          id: "weeklyCoding",
          label: backlog.actions.addToWeeklyCoding,
          accessibilityLabel: backlog.accessibility.addToWeeklyCoding.replace("{title}", item.title),
          icon: "entity.weeklyCodingReport" as const,
          destructive: false,
          onPress: () => onAddToWeeklyCoding(item.id),
        }
      : null,
    canCreateMarkFromBacklog && onCreateMarkFromBacklog
      ? {
          id: "createMark",
          label: backlog.actions.createMark,
          accessibilityLabel: backlog.accessibility.createMark.replace("{title}", item.title),
          icon: "entity.mark" as const,
          destructive: false,
          onPress: () => onCreateMarkFromBacklog(item.id),
        }
      : null,
  ].filter(Boolean);

  if (!actions.length) {
    return null;
  }

  const menuWidth = Math.min(244, width - 24);
  const left = clamp(anchor.x + anchor.width - menuWidth, 12, Math.max(12, width - menuWidth - 12));
  const showAbove = anchor.y > height * 0.6;
  const top = showAbove ? Math.max(12, anchor.y - 12 - actions.length * 52 - 24) : Math.min(height - 32, anchor.y + anchor.height + 10);
  const pointerLeft = clamp(anchor.x + anchor.width - left - 28, 16, menuWidth - 32);

  return (
    <Modal onRequestClose={onClose} transparent visible>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel={backlog.accessibility.dismissMenu} onPress={onClose} style={StyleSheet.absoluteFill} />

        <View style={[styles.menuWrap, { left, top, width: menuWidth }]}>
          <View
            style={[
              styles.pointer,
              showAbove ? styles.pointerBottom : styles.pointerTop,
              {
                left: pointerLeft,
                backgroundColor: foundationColors.bg.paper,
                borderColor: foundationColors.border.soft,
              },
            ]}
          />

          <View style={styles.menu}>
            {actions.map((action, index) => {
              if (!action) {
                return null;
              }

              return (
                <Pressable
                  accessibilityLabel={action.accessibilityLabel}
                  accessibilityRole="button"
                  key={action.id}
                  onPress={() => {
                    action.onPress();
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.actionRow,
                    index < actions.length - 1 ? styles.actionBorder : null,
                    pressed ? styles.actionPressed : null,
                  ]}
                >
                  <WaymarkIcon
                    decorative
                    semanticName={action.icon}
                    size="xs"
                    state={action.destructive ? "muted" : "default"}
                  />
                  <WMText style={action.destructive ? styles.destructiveText : styles.actionText} variant="body">
                    {action.label}
                  </WMText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  menuWrap: {
    position: "absolute",
  },
  menu: {
    overflow: "hidden",
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.bg.paper,
    ...getBorderStyle("1px solid " + foundationColors.border.soft),
    boxShadow: semanticElevation.sheet,
  },
  pointer: {
    position: "absolute",
    width: 16,
    height: 16,
    transform: [{ rotate: "45deg" }],
    ...getBorderStyle("1px solid " + foundationColors.border.soft),
  },
  pointerTop: {
    top: -8,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  pointerBottom: {
    bottom: -8,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  actionRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionBorder: {
    ...getBorderStyle("1px solid " + foundationColors.border.subtle, "bottom"),
  },
  actionPressed: {
    backgroundColor: foundationColors.bg.paperWarm,
  },
  actionText: {
    color: foundationColors.ink.primary,
  },
  destructiveText: {
    color: foundationColors.missed.base,
  },
});
