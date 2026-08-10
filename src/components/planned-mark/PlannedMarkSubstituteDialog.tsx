import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, View } from "react-native";
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
  ExpeditionOption,
  MilestoneOption,
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
  chooseExpeditionLabel?: string;
  chooseMilestoneLabel?: string;
  emptyExistingLabel: string;
  instructionLabel: string;
  orLabel: string;
  cancelLabel: string;
  substituteLabel: string;
  existingCandidates: SubstituteCandidateMark[];
  pathOptions: PathOption[];
  expeditionOptions?: ExpeditionOption[];
  milestoneOptions?: MilestoneOption[];
  maxAvailableHeight?: number;
  initialPathId?: string;
  initialExpeditionId?: string | null;
  initialMilestoneId?: string | null;
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
  chooseExpeditionLabel,
  chooseMilestoneLabel,
  emptyExistingLabel,
  instructionLabel,
  orLabel,
  cancelLabel,
  substituteLabel,
  existingCandidates,
  pathOptions,
  expeditionOptions = [],
  milestoneOptions = [],
  maxAvailableHeight,
  initialPathId,
  initialExpeditionId,
  initialMilestoneId,
  onCancel,
  onSubstituteWithExisting,
  onSubstituteWithQuickMark,
  theme,
}: Props) {
  const [selectedSubstituteMarkId, setSelectedSubstituteMarkId] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDetail, setQuickDetail] = useState("");
  const [selectedPathId, setSelectedPathId] = useState<string | null>(initialPathId ?? null);
  const [selectedExpeditionId, setSelectedExpeditionId] = useState<string | null>(initialExpeditionId ?? null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(initialMilestoneId ?? null);
  const [showExistingList, setShowExistingList] = useState(false);
  const [showPathList, setShowPathList] = useState(false);
  const [showExpeditionList, setShowExpeditionList] = useState(false);
  const [showMilestoneList, setShowMilestoneList] = useState(false);
  const bodyScrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    setSelectedSubstituteMarkId(null);
    setQuickTitle("");
    setQuickDetail("");
    setSelectedPathId(initialPathId ?? null);
    setSelectedExpeditionId(initialExpeditionId ?? null);
    setSelectedMilestoneId(initialMilestoneId ?? null);
    setShowExistingList(false);
    setShowPathList(false);
    setShowExpeditionList(false);
    setShowMilestoneList(false);
  }, [initialExpeditionId, initialMilestoneId, initialPathId, title]);

  const selectedCandidate = useMemo(
    () => existingCandidates.find((candidate) => candidate.id === selectedSubstituteMarkId) ?? null,
    [existingCandidates, selectedSubstituteMarkId],
  );
  const selectedPath = useMemo(
    () => pathOptions.find((path) => path.id === selectedPathId) ?? null,
    [pathOptions, selectedPathId],
  );
  const availableExpeditions = useMemo(
    () => expeditionOptions.filter((expedition) => !selectedPathId || expedition.pathId === selectedPathId),
    [expeditionOptions, selectedPathId],
  );
  const selectedExpedition = useMemo(
    () => availableExpeditions.find((expedition) => expedition.id === selectedExpeditionId) ?? null,
    [availableExpeditions, selectedExpeditionId],
  );
  const availableMilestones = useMemo(
    () =>
      milestoneOptions.filter(
        (milestone) =>
          (!selectedPathId || !milestone.pathId || milestone.pathId === selectedPathId) &&
          Boolean(selectedExpeditionId) &&
          milestone.expeditionId === selectedExpeditionId,
      ),
    [milestoneOptions, selectedExpeditionId, selectedPathId],
  );
  const selectedMilestone = useMemo(
    () => availableMilestones.find((milestone) => milestone.id === selectedMilestoneId) ?? null,
    [availableMilestones, selectedMilestoneId],
  );
  const quickModeActive = quickTitle.trim().length > 0 || quickDetail.trim().length > 0;
  const existingModeActive = Boolean(selectedSubstituteMarkId);
  const canSubmitExisting = Boolean(selectedSubstituteMarkId && onSubstituteWithExisting);
  const canSubmitQuick = Boolean(
    quickTitle.trim().length > 0 && selectedPathId && onSubstituteWithQuickMark,
  );
  const canSubmit = canSubmitExisting || canSubmitQuick;
  const cardMaxHeight = maxAvailableHeight ? Math.min(560, maxAvailableHeight) : 560;
  const cardMinHeight = maxAvailableHeight ? Math.min(440, Math.max(320, cardMaxHeight)) : 440;

  function toggleDropdown(dropdown: "existing" | "path" | "expedition" | "milestone") {
    Keyboard.dismiss();
    setShowExistingList((current) => (dropdown === "existing" ? !current : false));
    setShowPathList((current) => (dropdown === "path" ? !current : false));
    setShowExpeditionList((current) => (dropdown === "expedition" ? !current : false));
    setShowMilestoneList((current) => (dropdown === "milestone" ? !current : false));
  }

  function closeDropdowns() {
    setShowExistingList(false);
    setShowPathList(false);
    setShowExpeditionList(false);
    setShowMilestoneList(false);
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: foundationColors.bg.paper,
          borderColor: theme.border,
          maxHeight: cardMaxHeight,
          minHeight: cardMinHeight,
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
          ref={bodyScrollRef}
          bounces={false}
          contentContainerStyle={styles.body}
          keyboardDismissMode="on-drag"
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
              onPress={() => toggleDropdown("existing")}
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
                        setSelectedExpeditionId(null);
                        setSelectedMilestoneId(null);
                        closeDropdowns();
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
                  closeDropdowns();
                }
              }}
              onFocus={() => bodyScrollRef.current?.scrollTo({ y: 210, animated: true })}
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
                  closeDropdowns();
                }
              }}
              onFocus={() => bodyScrollRef.current?.scrollTo({ y: 300, animated: true })}
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
                toggleDropdown("path");
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
                      setSelectedExpeditionId(null);
                      setSelectedMilestoneId(null);
                      setSelectedSubstituteMarkId(null);
                      closeDropdowns();
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
            <SelectField
              active={!existingModeActive && Boolean(selectedPathId)}
              disabled={!selectedPathId}
              label={
                selectedExpedition
                  ? selectedExpedition.label
                  : chooseExpeditionLabel ?? (locale === "vi" ? "Chon expedition" : "Choose expedition")
              }
              onPress={() => {
                if (!selectedPathId) {
                  return;
                }
                toggleDropdown("expedition");
              }}
              theme={theme}
            />
            {showExpeditionList && selectedPathId ? (
              <View style={styles.optionList}>
                <OptionRow
                  active={!selectedExpeditionId}
                  label={locale === "vi" ? "Khong gan expedition" : "No expedition"}
                  onPress={() => {
                    setSelectedExpeditionId(null);
                    setSelectedMilestoneId(null);
                    setSelectedSubstituteMarkId(null);
                    closeDropdowns();
                  }}
                  theme={theme}
                />
                {availableExpeditions.map((expedition) => (
                  <OptionRow
                    active={expedition.id === selectedExpeditionId}
                    key={expedition.id}
                    label={expedition.label}
                    onPress={() => {
                      setSelectedExpeditionId(expedition.id);
                      setSelectedMilestoneId(null);
                      setSelectedSubstituteMarkId(null);
                      closeDropdowns();
                    }}
                    theme={theme}
                  />
                ))}
              </View>
            ) : null}
            <SelectField
              active={!existingModeActive && Boolean(selectedExpeditionId)}
              disabled={!selectedExpeditionId}
              label={
                selectedMilestone
                  ? selectedMilestone.label
                  : chooseMilestoneLabel ?? (locale === "vi" ? "Chon milestone" : "Choose milestone")
              }
              onPress={() => {
                if (!selectedExpeditionId) {
                  return;
                }
                toggleDropdown("milestone");
              }}
              theme={theme}
            />
            {showMilestoneList && selectedExpeditionId ? (
              <View style={styles.optionList}>
                <OptionRow
                  active={!selectedMilestoneId}
                  label={locale === "vi" ? "Khong gan milestone" : "No milestone"}
                  onPress={() => {
                    setSelectedMilestoneId(null);
                    setSelectedSubstituteMarkId(null);
                    closeDropdowns();
                  }}
                  theme={theme}
                />
                {availableMilestones.map((milestone) => (
                  <OptionRow
                    active={milestone.id === selectedMilestoneId}
                    key={milestone.id}
                    label={milestone.label}
                    onPress={() => {
                      setSelectedMilestoneId(milestone.id);
                      setSelectedSubstituteMarkId(null);
                      closeDropdowns();
                    }}
                    theme={theme}
                  />
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
                expeditionId: selectedExpeditionId,
                milestoneId: selectedMilestoneId,
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

function OptionRow({
  active,
  label,
  onPress,
  theme,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  theme: PlannedMarkPathTheme;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionRow,
        {
          borderColor: active ? theme.accent : theme.border,
          backgroundColor: active ? theme.surfaceSoft : foundationColors.bg.paper,
        },
      ]}
    >
      <View style={styles.optionCopy}>
        <WMText numberOfLines={1} variant="bodyStrong">
          {label}
        </WMText>
      </View>
      {active ? <WaymarkIcon semanticName="status.done" size="xs" state="selected" /> : null}
    </Pressable>
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
