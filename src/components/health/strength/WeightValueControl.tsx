import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { controlTokens, foundationColors, fontFamilyTokens, semanticRadius, spacing } from "../../../theme/tokens";
import { WMText } from "../../primitives/Text";
import { WeightUnit } from "./types";

type Props = {
  value?: number | null;
  unit: WeightUnit;
  editable?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onChangeValue?: (value: number | null) => void;
};

export function WeightValueControl({ value, unit, editable = false, disabled = false, onPress, onChangeValue }: Props) {
  const [draftValue, setDraftValue] = useState(value === undefined || value === null ? "" : String(value));

  useEffect(() => {
    setDraftValue(value === undefined || value === null ? "" : String(value));
  }, [value]);

  const label = value === undefined || value === null ? `-- ${unit}` : `${value} ${unit}`;
  const content = (
    <View style={[styles.base, editable ? styles.editable : null, disabled ? styles.disabled : null]}>
      {editable ? (
        <View style={styles.inputRow}>
          <TextInput
            editable={!disabled}
            inputMode="numeric"
            keyboardType="numeric"
            onChangeText={(next) => {
              const sanitized = next.replace(/[^0-9.]/g, "");
              setDraftValue(sanitized);
              onChangeValue?.(sanitized.trim() ? Number(sanitized) : null);
            }}
            style={styles.input}
            value={draftValue}
          />
          <WMText numberOfLines={1} style={styles.value} variant="chip">
            {unit}
          </WMText>
        </View>
      ) : (
        <WMText numberOfLines={1} style={styles.value} variant="chip">
          {label}
        </WMText>
      )}
    </View>
  );

  if (!editable || !onPress) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.pressable}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  base: {
    minWidth: 58,
    minHeight: 36,
    borderRadius: semanticRadius.chip,
    backgroundColor: controlTokens.color.surface,
    borderWidth: 1,
    borderColor: controlTokens.color.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  editable: {
    minHeight: 44,
  },
  inputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  input: {
    minWidth: 28,
    color: foundationColors.ink.primary,
    fontFamily: fontFamilyTokens.numeric.runtime,
    fontSize: 12,
    lineHeight: 16,
    padding: 0,
    textAlign: "right",
  },
  disabled: {
    opacity: 0.52,
  },
  value: {
    color: foundationColors.ink.secondary,
    fontFamily: fontFamilyTokens.numeric.runtime,
    fontVariant: ["tabular-nums"],
    fontSize: 12,
    lineHeight: 16,
  },
});
