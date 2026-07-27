import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { inputTokens, spacing } from "../../theme/tokens";
import { WaymarkIcon } from "./WaymarkIcon";

type SearchBarVariant = "standard" | "compact" | "insideCard" | "standalone" | "withClear" | "withoutClear";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onSubmitEditing?: () => void;
  onClear?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: SearchBarVariant;
  accessibilityLabel?: string;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onSubmitEditing,
  onClear,
  disabled = false,
  loading = false,
  variant = "standard",
  accessibilityLabel,
}: Props) {
  const [focused, setFocused] = useState(false);
  const showClear = variant !== "withoutClear" && value.length > 0;

  return (
    <View
      style={[
        styles.base,
        variant === "compact" ? styles.compact : null,
        {
          backgroundColor: disabled ? inputTokens.color.disabledSurface : inputTokens.color.surface,
          borderColor: focused ? inputTokens.color.focus : inputTokens.color.border,
          opacity: loading ? 0.72 : 1,
        },
      ]}
    >
      <WaymarkIcon decorative semanticName="utility.search" size="sm" state={disabled ? "disabled" : focused ? "active" : "muted"} />
      <TextInput
        accessibilityLabel={accessibilityLabel ?? placeholder}
        editable={!disabled}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={inputTokens.color.placeholder}
        style={styles.input}
        value={value}
      />
      {showClear ? (
        <Pressable accessibilityLabel="Clear" onPress={onClear ?? (() => onChangeText(""))} style={styles.clear}>
          <WaymarkIcon decorative semanticName="utility.close" size="sm" state="muted" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: inputTokens.size.singleLineHeight,
    borderWidth: 1,
    borderRadius: inputTokens.radius.default,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  compact: {
    minHeight: 44,
  },
  input: {
    flex: 1,
    color: inputTokens.color.text,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: 0,
  },
  clear: {
    minWidth: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
