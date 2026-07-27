import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { IconBadge } from "../primitives/IconBadge";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import {
  foundationColors,
  semanticBorder,
  semanticElevation,
  semanticRadius,
  spacing,
  typography,
} from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { Locale } from "../../types/ui";
import { MoveMarkValue } from "./PlannedMarkActionSheetContent";
import { PlannedMarkPathTheme } from "./plannedMarkTheme";

type PickerMode = null | "date" | "start" | "end";

type Props = {
  visible?: boolean;
  title: string;
  locale: Locale;
  dateLabel: string;
  startLabel: string;
  endLabel: string;
  cancelLabel: string;
  saveLabel: string;
  initialValue: MoveMarkValue;
  hasEndTime: boolean;
  onCancel: () => void;
  onSave: (value: MoveMarkValue) => void;
  theme: PlannedMarkPathTheme;
};

type PickerOption = {
  key: string;
  label: string;
  value: string;
};

export function PlannedMarkDateTimePickerDialog({
  visible = true,
  title,
  locale,
  dateLabel,
  startLabel,
  endLabel,
  cancelLabel,
  saveLabel,
  initialValue,
  hasEndTime,
  onCancel,
  onSave,
  theme,
}: Props) {
  const [date, setDate] = useState(initialValue.date);
  const [startTime, setStartTime] = useState(initialValue.startTime ?? "");
  const [endTime, setEndTime] = useState(initialValue.endTime ?? "");
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDate(initialValue.date);
    setStartTime(initialValue.startTime ?? "");
    setEndTime(initialValue.endTime ?? "");
    setPickerMode(null);
  }, [initialValue, visible]);

  const dateOptions = useMemo(() => buildDateOptions(locale), [locale]);
  const timeOptions = useMemo(() => buildTimeOptions(locale), [locale]);
  const selectedDateLabel = useMemo(() => resolveDateDisplayValue(date, dateOptions), [date, dateOptions]);
  const selectedStartLabel = useMemo(() => resolveTimeDisplayValue(startTime, timeOptions, startLabel), [startLabel, startTime, timeOptions]);
  const selectedEndLabel = useMemo(() => resolveTimeDisplayValue(endTime, timeOptions, endLabel), [endLabel, endTime, timeOptions]);

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
      <View style={styles.header}>
        <WMText style={styles.title} variant="pageTitle">
          {title}
        </WMText>
        <IconBadge
          accessibilityLabel={cancelLabel}
          decorative={false}
          onPress={onCancel}
          semanticName="utility.close"
          shape="rounded"
          size="md"
          tone="warm"
        />
      </View>

      <View style={styles.bodyWrap}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
              <PickerField
                icon="utility.calendar"
                label={dateLabel}
                onPress={() => setPickerMode("date")}
                theme={theme}
                value={selectedDateLabel}
              />
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <PickerField
                icon="utility.clock"
                label={startLabel}
                onPress={() => setPickerMode("start")}
                theme={theme}
                value={selectedStartLabel}
              />
            </View>
            {hasEndTime ? (
              <View style={styles.timeField}>
                <PickerField
                  icon="utility.clock"
                  label={endLabel}
                  onPress={() => setPickerMode("end")}
                  theme={theme}
                  value={selectedEndLabel}
                />
              </View>
            ) : null}
          </View>
          <View
            style={[
              styles.noteCard,
              {
                borderColor: theme.border,
                backgroundColor: theme.surfaceSoft,
              },
            ]}
          >
            <WMText style={styles.noteText} variant="bodySm">
              {locale === "vi"
                ? "Bam vao ngay, gio bat dau, hoac gio ket thuc de mo picker noi bo. Khi noi end-to-end, thay bang primitive date/time picker hien co cua ung dung."
                : "Tap date, start, or end to open the in-dialog picker. When wired end-to-end, replace this with the app's existing date/time picker primitive."}
            </WMText>
          </View>
        </ScrollView>

        {pickerMode ? (
          <View style={styles.pickerLayer}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPickerMode(null)} />
            <View
              style={[
                styles.pickerCard,
                {
                  borderColor: theme.border,
                  backgroundColor: foundationColors.bg.paper,
                },
              ]}
            >
              <View style={styles.pickerHeader}>
                <WMText style={styles.pickerTitle} variant="sectionTitle">
                  {pickerMode === "date"
                    ? dateLabel
                    : pickerMode === "start"
                      ? startLabel
                      : endLabel}
                </WMText>
                <IconBadge
                  accessibilityLabel={cancelLabel}
                  decorative={false}
                  onPress={() => setPickerMode(null)}
                  semanticName="utility.close"
                  shape="rounded"
                  size="sm"
                  tone="warm"
                />
              </View>
              <ScrollView
                bounces={false}
                contentContainerStyle={styles.pickerOptions}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {(pickerMode === "date" ? dateOptions : timeOptions).map((option) => {
                  const isSelected =
                    pickerMode === "date"
                      ? option.value === date
                      : pickerMode === "start"
                        ? option.value === startTime
                        : option.value === endTime;

                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => {
                        if (pickerMode === "date") {
                          setDate(option.value);
                        } else if (pickerMode === "start") {
                          setStartTime(option.value);
                          if (hasEndTime) {
                            setEndTime(resolveDefaultEndTime(option.value, timeOptions));
                          }
                        } else {
                          setEndTime(option.value);
                        }
                        setPickerMode(null);
                      }}
                      style={[
                        styles.optionRow,
                        {
                          borderColor: isSelected ? theme.accent : theme.border,
                          backgroundColor: isSelected ? theme.surfaceSoft : foundationColors.bg.paper,
                        },
                      ]}
                    >
                      <WMText style={styles.optionLabel} variant="bodyStrong">
                        {option.label}
                      </WMText>
                      {isSelected ? <WaymarkIcon semanticName="status.done" size="xs" state="selected" /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <DialogButton label={cancelLabel} onPress={onCancel} theme={theme} variant="secondary" />
        <DialogButton
          label={saveLabel}
          onPress={() =>
            onSave({
              date: date.trim(),
              startTime: startTime.trim() || undefined,
              endTime: hasEndTime ? endTime.trim() || undefined : undefined,
            })
          }
          theme={theme}
          variant="primary"
        />
      </View>
    </View>
  );
}

function PickerField({
  label,
  value,
  icon,
  onPress,
  theme,
}: {
  label: string;
  value: string;
  icon: "utility.calendar" | "utility.clock";
  onPress: () => void;
  theme: PlannedMarkPathTheme;
}) {
  return (
    <View style={styles.fieldWrap}>
      <WMText style={styles.fieldLabel} variant="bodySm">
        {label}
      </WMText>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={[
          styles.fieldButton,
          {
            borderColor: theme.border,
            backgroundColor: foundationColors.bg.paper,
          },
        ]}
      >
        <WMText numberOfLines={1} style={styles.fieldValue} variant="body">
          {value}
        </WMText>
        <WaymarkIcon semanticName={icon} size="xs" state="muted" />
      </Pressable>
    </View>
  );
}

function DialogButton({
  label,
  onPress,
  theme,
  variant,
}: {
  label: string;
  onPress: () => void;
  theme: PlannedMarkPathTheme;
  variant: "primary" | "secondary";
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.button,
        variant === "primary"
          ? { backgroundColor: theme.deep, borderColor: theme.deep }
          : { backgroundColor: foundationColors.bg.paper, borderColor: theme.border },
      ]}
    >
      <WMText
        style={variant === "primary" ? styles.primaryButtonText : [styles.secondaryButtonText, { color: theme.deep }]}
        variant="bodyStrong"
      >
        {label}
      </WMText>
    </Pressable>
  );
}

function buildDateOptions(locale: Locale): PickerOption[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 21 }, (_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + index);
    const isoValue = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

    const formatted =
      locale === "vi"
        ? `${String(value.getDate()).padStart(2, "0")}/${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`
        : `${String(value.getMonth() + 1).padStart(2, "0")}/${String(value.getDate()).padStart(2, "0")}/${value.getFullYear()}`;

    const label = value.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    return {
      key: `${isoValue}-${index}`,
      label: `${label} · ${formatted}`,
      value: isoValue,
    };
  });
}

function buildTimeOptions(locale: Locale): PickerOption[] {
  const formatter = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2);
    const minute = index % 2 === 0 ? 0 : 30;
    const date = new Date(2026, 0, 1, hour, minute);
    const label = formatter.format(date);

    return {
      key: `${hour}-${minute}`,
      label,
      value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    };
  });
}

function resolveDefaultEndTime(startValue: string, options: PickerOption[]) {
  const startIndex = options.findIndex((option) => option.value === startValue);
  if (startIndex === -1) {
    return "";
  }

  const endIndex = Math.min(startIndex + 3, options.length - 1);
  return options[endIndex]?.value ?? "";
}

function resolveDateDisplayValue(value: string, options: PickerOption[]) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function resolveTimeDisplayValue(value: string, options: PickerOption[], fallbackLabel: string) {
  if (!value) {
    return fallbackLabel;
  }

  return options.find((option) => option.value === value)?.label ?? value;
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    minHeight: 420,
    maxHeight: 520,
    borderRadius: semanticRadius.sheet,
    borderWidth: 1,
    boxShadow: semanticElevation.sheet,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    ...getBorderStyle(semanticBorder.divider.subtle),
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  title: {
    ...typography.pageTitle,
    flex: 1,
    fontSize: 22,
    lineHeight: 29,
  },
  bodyWrap: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  fieldWrap: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: foundationColors.ink.secondary,
  },
  fieldButton: {
    minHeight: 48,
    borderRadius: semanticRadius.button.default,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  fieldValue: {
    flex: 1,
    color: foundationColors.ink.primary,
  },
  timeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  timeField: {
    flex: 1,
  },
  noteCard: {
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  noteText: {
    color: foundationColors.ink.secondary,
    lineHeight: 23,
  },
  pickerLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: spacing.md,
    backgroundColor: "rgba(43,42,34,0.08)",
  },
  pickerCard: {
    maxHeight: 280,
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    boxShadow: semanticElevation.row,
    overflow: "hidden",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    ...getBorderStyle(semanticBorder.divider.subtle),
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  pickerTitle: {
    flex: 1,
  },
  pickerOptions: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  optionRow: {
    minHeight: 44,
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  optionLabel: {
    flex: 1,
    color: foundationColors.ink.primary,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: "rgba(255,253,244,0.96)",
    ...getBorderStyle(semanticBorder.divider.subtle),
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
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
  primaryButtonText: {
    color: foundationColors.ink.inverse,
  },
  secondaryButtonText: {
    color: foundationColors.ink.primary,
  },
});
