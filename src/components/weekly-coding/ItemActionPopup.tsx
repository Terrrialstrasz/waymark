import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { getCopy } from "../../i18n/copy";
import { foundationColors, semanticElevation, semanticRadius, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { WeeklyCodingItemActionAnchor, WeeklyCodingReportItem } from "./WeeklyCoding.types";

type Props = {
  visible: boolean;
  locale: Locale;
  item?: WeeklyCodingReportItem | null;
  anchor?: WeeklyCodingItemActionAnchor | null;
  onClose: () => void;
  onOpenDetail?: (itemId: string) => void;
  onRemoveFromWeek?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
};

export function ItemActionPopup({
  visible,
  locale,
  item,
  anchor,
  onClose,
  onOpenDetail,
  onRemoveFromWeek,
  onDeleteItem,
}: Props) {
  const c = getCopy(locale).weeklyCoding;
  const { width, height } = useWindowDimensions();

  if (!visible || !item || !anchor) {
    return null;
  }

  const actions = [
    onOpenDetail
      ? {
          id: "openDetail",
          label: c.menu.openDetail,
          accessibilityLabel: c.accessibility.openDetail.replace("{title}", item.title),
          icon: "entity.privateDocument" as const,
          destructive: false,
          onPress: () => onOpenDetail(item.id),
        }
      : null,
    onRemoveFromWeek
      ? {
          id: "remove",
          label: c.menu.removeFromWeek,
          accessibilityLabel: c.accessibility.removeFromWeek.replace("{title}", item.title),
          icon: "utility.close" as const,
          destructive: false,
          onPress: () => onRemoveFromWeek(item.id),
        }
      : null,
    onDeleteItem
      ? {
          id: "delete",
          label: c.menu.delete,
          accessibilityLabel: c.accessibility.deleteItem.replace("{title}", item.title),
          icon: "utility.close" as const,
          destructive: true,
          onPress: () => onDeleteItem(item.id),
        }
      : null,
  ].filter(Boolean);

  if (!actions.length) {
    return null;
  }

  const menuWidth = Math.min(248, width - 24);
  const left = clamp(anchor.x + anchor.width - menuWidth, 12, Math.max(12, width - menuWidth - 12));
  const showAbove = anchor.y > height * 0.6;
  const estimatedHeight = actions.length * 50 + 20;
  const top = showAbove
    ? Math.max(12, anchor.y - estimatedHeight - 12)
    : Math.min(height - estimatedHeight - 12, anchor.y + anchor.height + 10);
  const pointerLeft = clamp(anchor.x + anchor.width - left - 28, 16, menuWidth - 32);

  return (
    <Modal onRequestClose={onClose} transparent visible>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel={c.accessibility.dismissMenu} onPress={onClose} style={StyleSheet.absoluteFill} />

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
                  <WaymarkIcon decorative semanticName={action.icon} size="xs" state="default" />
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
