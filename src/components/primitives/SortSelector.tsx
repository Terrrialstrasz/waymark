import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { controlTokens, spacing } from "../../theme/tokens";
import { Divider } from "./Divider";
import { WMSheet } from "./WMSheet";
import { WaymarkIcon } from "./WaymarkIcon";
import { WMText } from "./Text";

type SortSelectorVariant = "compact" | "textOnly" | "chip" | "insideHeader" | "insideCard";

type SortOption = {
  id: string;
  label: string;
};

type Props = {
  options: SortOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  label: string;
  sheetTitle: string;
  disabled?: boolean;
  variant?: SortSelectorVariant;
};

export function SortSelector({
  options,
  selectedId,
  onSelect,
  label,
  sheetTitle,
  disabled = false,
  variant = "chip",
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((option) => option.id === selectedId) ?? options[0], [options, selectedId]);

  if (!selected) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.trigger, variant === "textOnly" ? styles.triggerTextOnly : null, disabled ? styles.disabled : null]}
      >
        <WaymarkIcon decorative semanticName="utility.more" size="sm" state={disabled ? "disabled" : "muted"} />
        <WMText style={styles.triggerText} variant="chip">
          {selected.label}
        </WMText>
      </Pressable>

      <WMSheet onClose={() => setOpen(false)} title={sheetTitle} visible={open}>
        <View style={styles.sheetStack}>
          {options.map((option, index) => (
            <View key={option.id}>
              <Pressable
                accessibilityLabel={option.label}
                accessibilityRole="button"
                onPress={() => {
                  onSelect(option.id);
                  setOpen(false);
                }}
                style={styles.option}
              >
                <WMText style={styles.optionLabel} variant="body">
                  {option.label}
                </WMText>
                {option.id === selectedId ? <WaymarkIcon decorative semanticName="status.done" size="sm" state="selected" /> : null}
              </Pressable>
              {index < options.length - 1 ? <Divider insetStart={0} insetEnd={0} /> : null}
            </View>
          ))}
        </View>
      </WMSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 40,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: controlTokens.color.border,
    borderRadius: controlTokens.radius.default,
    backgroundColor: controlTokens.color.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  triggerTextOnly: {
    backgroundColor: "transparent",
  },
  triggerText: {
    color: controlTokens.color.text,
  },
  disabled: {
    opacity: 0.52,
  },
  sheetStack: {
    gap: 0,
  },
  option: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  optionLabel: {
    flex: 1,
  },
});
