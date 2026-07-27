import { useState } from "react";
import { NativeSyntheticEvent, StyleSheet, TextInput, TextInputEndEditingEventData, View } from "react-native";
import { inputTokens, spacing } from "../../theme/tokens";
import { WMText } from "./Text";

type NoteInputVariant = "singleLine" | "note" | "reflection" | "caption" | "insideCard" | "readOnly";

type Props = {
  label?: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  errorText?: string;
  maxLength?: number;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  variant?: NoteInputVariant;
  accessibilityLabel?: string;
  onBlur?: () => void;
  onEndEditing?: (event: NativeSyntheticEvent<TextInputEndEditingEventData>) => void;
};

export function NoteInputBase({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  errorText,
  maxLength,
  disabled = false,
  readOnly = false,
  loading = false,
  variant = "note",
  accessibilityLabel,
  onBlur,
  onEndEditing,
}: Props) {
  const [focused, setFocused] = useState(false);
  const multiline = variant !== "singleLine";
  const resolvedReadOnly = readOnly || variant === "readOnly";

  return (
    <View style={styles.stack}>
      {label ? <WMText variant="label">{label}</WMText> : null}
      <View
        style={[
          styles.field,
          multiline ? styles.multiline : styles.singleLine,
          {
            backgroundColor: disabled ? inputTokens.color.disabledSurface : inputTokens.color.surface,
            borderColor: errorText ? inputTokens.color.error : focused ? inputTokens.color.focus : inputTokens.color.border,
            opacity: loading ? 0.72 : 1,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
          editable={!disabled && !resolvedReadOnly}
          multiline={multiline}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onChangeText={onChangeText}
          onEndEditing={onEndEditing}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          placeholderTextColor={inputTokens.color.placeholder}
          style={[styles.input, multiline ? styles.inputMultiline : null]}
          textAlignVertical={multiline ? "top" : "center"}
          value={value}
          maxLength={maxLength}
        />
      </View>
      {errorText ? (
        <WMText style={{ color: inputTokens.color.error }} variant="meta">
          {errorText}
        </WMText>
      ) : helperText ? (
        <WMText style={styles.helper} variant="meta">
          {helperText}
        </WMText>
      ) : null}
      {maxLength ? (
        <WMText style={styles.helper} variant="meta">
          {`${value.length}/${maxLength}`}
        </WMText>
      ) : null}
    </View>
  );
}

export const TextInputBase = NoteInputBase;

const styles = StyleSheet.create({
  stack: {
    gap: inputTokens.spacing.gap,
  },
  field: {
    borderWidth: 1,
    borderRadius: inputTokens.radius.default,
    paddingHorizontal: inputTokens.spacing.paddingX,
    paddingVertical: inputTokens.spacing.paddingY,
  },
  singleLine: {
    minHeight: inputTokens.size.singleLineHeight,
    justifyContent: "center",
  },
  multiline: {
    minHeight: inputTokens.size.noteMinHeight,
  },
  input: {
    color: inputTokens.color.text,
    fontSize: 15,
    lineHeight: 22,
    padding: 0,
  },
  inputMultiline: {
    minHeight: inputTokens.size.captionMinHeight,
  },
  helper: {
    color: inputTokens.color.helper,
  },
});
