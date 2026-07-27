import { Pressable, StyleSheet, View } from "react-native";
import { WMText } from "../primitives/Text";
import { foundationColors, semanticElevation, semanticRadius, spacing, typography } from "../../theme/tokens";
import { PlannedMarkPathTheme } from "./plannedMarkTheme";

type Props = {
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  theme: PlannedMarkPathTheme;
  disabled?: boolean;
};

export function PlannedMarkConfirmDialog({ title, body, cancelLabel, confirmLabel, onCancel, onConfirm, theme, disabled = false }: Props) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: foundationColors.bg.paper,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.content}>
        <WMText style={styles.title} variant="pageTitle">
          {title}
        </WMText>
        <WMText style={styles.body} variant="body">
          {body}
        </WMText>
      </View>
      <View style={styles.footer}>
        <DialogButton disabled={disabled} label={cancelLabel} onPress={onCancel} theme={theme} variant="secondary" />
        <DialogButton disabled={disabled} label={confirmLabel} onPress={onConfirm} theme={theme} variant="primary" />
      </View>
    </View>
  );
}

function DialogButton({
  label,
  onPress,
  theme,
  variant,
  disabled = false,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  theme: PlannedMarkPathTheme;
  variant: "primary" | "secondary";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary"
          ? { backgroundColor: theme.deep, borderColor: theme.deep }
          : { backgroundColor: foundationColors.bg.paper, borderColor: theme.border },
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <WMText style={variant === "primary" ? styles.primaryButtonText : [styles.secondaryButtonText, { color: theme.deep }]} variant="bodyStrong">
        {label}
      </WMText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: semanticRadius.sheet,
    borderWidth: 1,
    boxShadow: semanticElevation.sheet,
    overflow: "hidden",
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.pageTitle,
    fontSize: 22,
    lineHeight: 29,
  },
  body: {
    color: foundationColors.ink.secondary,
    lineHeight: 26,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: semanticRadius.button.default,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.56,
  },
  primaryButtonText: {
    color: foundationColors.ink.inverse,
  },
  secondaryButtonText: {
    color: foundationColors.ink.primary,
  },
});
