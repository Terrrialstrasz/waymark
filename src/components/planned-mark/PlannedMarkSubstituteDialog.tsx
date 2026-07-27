import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { IconBadge } from "../primitives/IconBadge";
import { NoteInputBase } from "../primitives/NoteInputBase";
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
import {
  PathOption,
  QuickSubstituteValue,
  SubstituteCandidateMark,
} from "./PlannedMarkActionSheetContent";
import { PlannedMarkPathTheme } from "./plannedMarkTheme";

type Props = {
  title: string;
  locale: Locale;
  chooseExistingMarkLabel: string;
  selectExistingPlaceholder: string;
  quickMarkLabel: string;
  quickMarkPlaceholder: string;
  quickMarkDetailLabel?: string;
  quickMarkDetailPlaceholder?: string;
  choosePathLabel: string;
  emptyExistingLabel: string;
  instructionLabel: string;
  orLabel: string;
  cancelLabel: string;
  substituteLabel: string;
  existingCandidates: SubstituteCandidateMark[];
  pathOptions: PathOption[];
  onCancel: () => void;
  onSubstituteWithExisting?: (substituteMarkId: string) => void;
  onSubstituteWithQuickMark?: (value: QuickSubstituteValue) => void;
  theme: PlannedMarkPathTheme;
};

export function PlannedMarkSubstituteDialog({
  title,
  locale,
  chooseExistingMarkLabel,
  selectExistingPlaceholder,
  quickMarkLabel,
  quickMarkPlaceholder,
  quickMarkDetailLabel,
  quickMarkDetailPlaceholder,
  choosePathLabel,
  emptyExistingLabel,
  instructionLabel,
  orLabel,
  cancelLabel,
  substituteLabel,
  existingCandidates,
  pathOptions,
  onCancel,
  onSubstituteWithExisting,
  onSubstituteWithQuickMark,
  theme,
}: Props) {
  const [selectedSubstituteMarkId, setSelectedSubstituteMarkId] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDetail, setQuickDetail] = useState("");
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [showExistingList, setShowExistingList] = useState(false);
  const [showPathList, setShowPathList] = useState(false);

  useEffect(() => {
    setSelectedSubstituteMarkId(null);
    setQuickTitle("");
    setQuickDetail("");
    setSelectedPathId(null);
    setShowExistingList(false);
    setShowPathList(false);
  }, [title]);

  const selectedCandidate = useMemo(
    () => existingCandidates.find((candidate) => candidate.id === selectedSubstituteMarkId) ?? null,
    [existingCandidates, selectedSubstituteMarkId],
  );
  const selectedPath = useMemo(
    () => pathOptions.find((path) => path.id === selectedPathId) ?? null,
    [pathOptions, selectedPathId],
  );
  const quickModeActive = quickTitle.trim().length > 0 || Boolean(selectedPathId);
  const existingModeActive = Boolean(selectedSubstituteMarkId);
  const canSubmitExisting = Boolean(selectedSubstituteMarkId && onSubstituteWithExisting);
  const canSubmitQuick = Boolean(
    quickTitle.trim().length > 0 && selectedPathId && onSubstituteWithQuickMark,
  );
  const canSubmit = canSubmitExisting || canSubmitQuick;

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
          <SectionCard active={!quickModeActive} theme={theme}>
            <WMText style={styles.sectionTitle} variant="sectionTitle">
              {chooseExistingMarkLabel}
            </WMText>
            <SelectField
              active={!quickModeActive}
              label={selectedCandidate ? selectedCandidate.title : selectExistingPlaceholder}
              onPress={() => setShowExistingList((current) => !current)}
              theme={theme}
            />
            {showExistingList ? (
              existingCandidates.length ? (
                <View style={styles.optionList}>
                  {existingCandidates.map((candidate) => (
                    <Pressable
                      key={candidate.id}
                      onPress={() => {
                        setSelectedSubstituteMarkId(candidate.id);
                        setQuickTitle("");
                        setQuickDetail("");
                        setSelectedPathId(null);
                        setShowExistingList(false);
                      }}
                      style={[
                        styles.optionRow,
                        {
                          borderColor:
                            candidate.id === selectedSubstituteMarkId ? theme.accent : theme.border,
                          backgroundColor:
                            candidate.id === selectedSubstituteMarkId
                              ? theme.surfaceSoft
                              : foundationColors.bg.paper,
                        },
                      ]}
                    >
                      <View style={styles.optionCopy}>
                        <WMText numberOfLines={2} variant="bodyStrong">
                          {candidate.title}
                        </WMText>
                        {candidate.pathLabel || candidate.statusLabel ? (
                          <WMText numberOfLines={2} style={styles.optionMeta} variant="bodyXs">
                            {[candidate.pathLabel, candidate.statusLabel].filter(Boolean).join(" · ")}
                          </WMText>
                        ) : null}
                      </View>
                      {candidate.id === selectedSubstituteMarkId ? (
                        <WaymarkIcon semanticName="status.done" size="xs" state="selected" />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : (
                <QuietEmptyState label={emptyExistingLabel} theme={theme} />
              )
            ) : null}
            {!existingCandidates.length && !showExistingList ? (
              <QuietEmptyState label={emptyExistingLabel} theme={theme} />
            ) : null}
          </SectionCard>

          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: theme.border }]} />
            <WMText style={styles.orLabel} variant="meta">
              {orLabel}
            </WMText>
            <View style={[styles.orLine, { backgroundColor: theme.border }]} />
          </View>

          <SectionCard active={!existingModeActive} theme={theme}>
            <WMText style={styles.sectionTitle} variant="sectionTitle">
              {quickMarkLabel}
            </WMText>
            <NoteInputBase
              accessibilityLabel={quickMarkLabel}
              onChangeText={(value) => {
                setQuickTitle(value);
                if (value.trim().length > 0) {
                  setSelectedSubstituteMarkId(null);
                }
              }}
              placeholder={quickMarkPlaceholder}
              value={quickTitle}
              variant="singleLine"
            />
            <NoteInputBase
              accessibilityLabel={quickMarkDetailLabel}
              label={quickMarkDetailLabel ?? quickMarkLabel}
              onChangeText={(value) => {
                setQuickDetail(value);
                if (value.trim().length > 0) {
                  setSelectedSubstituteMarkId(null);
                }
              }}
              placeholder={quickMarkDetailPlaceholder ?? quickMarkPlaceholder}
              value={quickDetail}
            />
            <SelectField
              active={!existingModeActive && pathOptions.length > 0}
              disabled={!pathOptions.length}
              label={selectedPath ? selectedPath.label : choosePathLabel}
              onPress={() => {
                if (!pathOptions.length) {
                  return;
                }
                setShowPathList((current) => !current);
              }}
              theme={theme}
            />
            {showPathList && pathOptions.length ? (
              <View style={styles.optionList}>
                {pathOptions.map((path) => (
                  <Pressable
                    key={path.id}
                    onPress={() => {
                      setSelectedPathId(path.id);
                      setSelectedSubstituteMarkId(null);
                      setShowPathList(false);
                    }}
                    style={[
                      styles.optionRow,
                      {
                        borderColor: path.id === selectedPathId ? theme.accent : theme.border,
                        backgroundColor:
                          path.id === selectedPathId ? theme.surfaceSoft : foundationColors.bg.paper,
                      },
                    ]}
                  >
                    <View style={styles.optionCopy}>
                      <WMText numberOfLines={1} variant="bodyStrong">
                        {path.label}
                      </WMText>
                    </View>
                    {path.id === selectedPathId ? (
                      <WaymarkIcon semanticName="status.done" size="xs" state="selected" />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
          </SectionCard>

          <View
            style={[
              styles.instructionCard,
              {
                borderColor: theme.border,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <WMText style={styles.instructionText} variant="bodySm">
              {instructionLabel}
            </WMText>
          </View>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <DialogButton label={cancelLabel} onPress={onCancel} theme={theme} variant="secondary" />
        <DialogButton
          disabled={!canSubmit}
          label={substituteLabel}
          onPress={() => {
            if (canSubmitExisting && selectedSubstituteMarkId && onSubstituteWithExisting) {
              onSubstituteWithExisting(selectedSubstituteMarkId);
              return;
            }

            if (canSubmitQuick && selectedPathId && onSubstituteWithQuickMark) {
              onSubstituteWithQuickMark({
                title: quickTitle.trim(),
                detail: quickDetail.trim() || undefined,
                pathId: selectedPathId,
              });
            }
          }}
          theme={theme}
          variant="primary"
        />
      </View>
    </View>
  );
}

function SectionCard({
  active,
  theme,
  children,
}: {
  active: boolean;
  theme: PlannedMarkPathTheme;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.sectionCard,
        {
          borderColor: theme.border,
          backgroundColor: active ? theme.surface : "rgba(255,253,244,0.62)",
          opacity: active ? 1 : 0.72,
        },
      ]}
    >
      {children}
    </View>
  );
}

function SelectField({
  label,
  onPress,
  theme,
  disabled = false,
  active = true,
}: {
  label: string;
  onPress: () => void;
  theme: PlannedMarkPathTheme;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.selectField,
        {
          borderColor: theme.border,
          backgroundColor: foundationColors.bg.paper,
          opacity: disabled ? 0.5 : active ? 1 : 0.78,
        },
      ]}
    >
      <WMText numberOfLines={1} style={styles.selectLabel} variant="body">
        {label}
      </WMText>
      <WaymarkIcon semanticName="utility.chevron" size="xs" state="muted" />
    </Pressable>
  );
}

function QuietEmptyState({ label, theme }: { label: string; theme: PlannedMarkPathTheme }) {
  return (
    <View
      style={[
        styles.emptyState,
        {
          borderColor: theme.border,
          backgroundColor: theme.surface,
        },
      ]}
    >
      <WMText style={styles.emptyText} variant="bodySm">
        {label}
      </WMText>
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
  onPress: () => void;
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
      style={[
        styles.button,
        variant === "primary"
          ? { backgroundColor: theme.deep, borderColor: theme.deep }
          : { backgroundColor: foundationColors.bg.paper, borderColor: theme.border },
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <WMText
        style={
          variant === "primary"
            ? styles.primaryButtonText
            : [styles.secondaryButtonText, { color: theme.deep }]
        }
        variant="bodyStrong"
      >
        {label}
      </WMText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    minHeight: 440,
    maxHeight: 560,
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
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionCard: {
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  selectField: {
    minHeight: 48,
    borderRadius: semanticRadius.button.default,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  selectLabel: {
    flex: 1,
    color: foundationColors.ink.primary,
  },
  optionList: {
    gap: spacing.xs,
  },
  optionRow: {
    minHeight: 48,
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionMeta: {
    color: foundationColors.ink.secondary,
  },
  emptyState: {
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  emptyText: {
    color: foundationColors.ink.secondary,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orLabel: {
    color: foundationColors.ink.tertiary,
    textTransform: "uppercase",
  },
  instructionCard: {
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  instructionText: {
    color: foundationColors.ink.secondary,
    lineHeight: 22,
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
  buttonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: foundationColors.ink.inverse,
  },
  secondaryButtonText: {
    color: foundationColors.ink.primary,
  },
});
