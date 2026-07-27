import { TextInput, StyleSheet, View } from "react-native";
import { captureChooserTokens, inputTokens, spacing } from "../../theme/tokens";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  accessibilityLabel: string;
};

export function CaptureNoteInput({
  value,
  onChangeText,
  placeholder,
  disabled = false,
  accessibilityLabel,
}: Props) {
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: inputTokens.color.surface,
          borderColor: inputTokens.color.border,
          opacity: disabled ? 0.56 : 1,
        },
      ]}
    >
      <TextInput
        accessibilityLabel={accessibilityLabel}
        editable={!disabled}
        multiline
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={inputTokens.color.placeholder}
        style={styles.input}
        textAlignVertical="top"
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: captureChooserTokens.radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
    boxShadow: "0px 2px 10px rgba(80, 58, 22, 0.05)",
  },
  input: {
    minHeight: 40,
    color: inputTokens.color.text,
    fontSize: 15,
    lineHeight: 21,
    padding: 0,
  },
});
