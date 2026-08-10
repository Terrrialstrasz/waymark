import { useEffect, useMemo, useState } from "react";
import {
  AccessibilityState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Locale } from "../../types/ui";
import { getCopy } from "../../i18n/copy";
import { foundationColors, semanticBorder, semanticRadius, spacing } from "../../theme/tokens";
import { getBorderStyle } from "../../design-system/utils/get-border-style";
import { EntityChip } from "../primitives/EntityChip";
import { NoteInputBase } from "../primitives/NoteInputBase";
import { WMButton } from "../primitives/WMButton";
import { WaymarkIcon } from "../primitives/WaymarkIcon";
import { WMText } from "../primitives/Text";
import { PlannedMarkHeader } from "./PlannedMarkHeader";
import { PlannedMarkIntentionText } from "./PlannedMarkIntentionText";
import { PlannedMarkPathBlock } from "./PlannedMarkPathBlock";
import { PlannedMarkScheduleContextBlock } from "./PlannedMarkScheduleContextBlock";
import { PlannedMarkConfirmDialog } from "./PlannedMarkConfirmDialog";
import { PlannedMarkDateTimePickerDialog } from "./PlannedMarkDateTimePickerDialog";
import { PlannedMarkSubstituteDialog } from "./PlannedMarkSubstituteDialog";
import { PlannedMarkActionRow, PlannedMarkRowAction } from "./PlannedMarkActionRow";
import { PlannedMarkPathTheme } from "./plannedMarkTheme";

export type PathTheme = PlannedMarkPathTheme;

export type PlannedMarkActionSheetMarkStatus =
  | "ready"
  | "dependency_required"
  | "blocked"
  | "ready_with_advisory"
  | "ready_with_waiver"
  | "needs_decision"
  | "planned"
  | "active"
  | "overdue_today"
  | "done"
  | "rescheduled"
  | "substituted"
  | "skipped"
  | "missed"
  | "resolved"
  | "read_only_history";

export type PlannedMarkDependencyGroup = "critical" | "required" | "optional" | "satisfied" | "waived";

export type PlannedMarkDependencyItem = {
  id: string;
  title: string;
  detail?: string;
  typeLabel?: string;
  statusLabel?: string;
  group: PlannedMarkDependencyGroup;
  onPress?: () => void;
};

export type PlannedMarkPackCheckLink = {
  id: string;
  title: string;
  statusLabel?: string;
  onPress?: () => void;
};

export type PlannedMarkActionSheetMark = {
  id: string;
  title: string;
  status: PlannedMarkActionSheetMarkStatus;
  statusLabel: string;
  path: {
    id: string;
    label: string;
    theme: PathTheme;
    entityId?: string;
  };
  expedition?: {
    id: string;
    label: string;
  };
  milestone?: {
    id: string;
    label: string;
  };
  periodLabel?: string;
  timeLabel?: string;
  expeditionLabel?: string;
  intentionText?: string;
  markNote?: string;
  signalLabel?: string;
  onOpenSignal?: () => void;
  dependencies?: PlannedMarkDependencyItem[];
  relatedPackChecks?: PlannedMarkPackCheckLink[];
  checklist?: {
    packCheckId: string;
    items: Array<{
      id: string;
      label: string;
      checked: boolean;
      disabled?: boolean;
      onToggle?: (checked: boolean) => void;
    }>;
  };
  primaryActionLabel?: string;
  primaryActionHint?: string;
  launchConfig?: PlannedMarkLaunchConfig;
};

export type PlannedMarkLaunchKind = "health_workout" | "golf_practice";

export type PlannedMarkLaunchOption = {
  id: string;
  title: string;
  detail?: string;
  routineTemplateId: string;
  isDefault?: boolean;
};

export type PlannedMarkLaunchConfig = {
  kind: PlannedMarkLaunchKind;
  defaultOptionId: string;
  options: PlannedMarkLaunchOption[];
};

export type SubstituteCandidateMark = {
  id: string;
  title: string;
  pathLabel?: string;
  statusLabel?: string;
};

export type PathOption = {
  id: string;
  label: string;
  theme?: PathTheme;
};

export type ExpeditionOption = {
  id: string;
  label: string;
  pathId: string;
};

export type MilestoneOption = {
  id: string;
  label: string;
  expeditionId: string;
  pathId?: string;
};

export type MoveMarkValue = {
  date: string;
  startTime?: string;
  endTime?: string;
};

export type QuickSubstituteValue = {
  title: string;
  detail?: string;
  pathId: string;
  expeditionId?: string | null;
  milestoneId?: string | null;
};

export type PlannedMarkActionValue = {
  routineTemplateId?: string;
};

export type DialogMode = null | "mark" | "launch" | "skip" | "move" | "substitute";

export type PlannedMarkActionSheetContentProps = {
  mark: PlannedMarkActionSheetMark;
  locale: Locale;
  substituteCandidates?: SubstituteCandidateMark[];
  pathOptions?: PathOption[];
  expeditionOptions?: ExpeditionOption[];
  milestoneOptions?: MilestoneOption[];
  maxHeightOverride?: number;
  layoutMode?: "sheet" | "fullScreen";
  featureFlags?: {
    substitutePlannedMark?: boolean;
    markPrimaryAction?: boolean;
    markSecondaryActions?: boolean;
  };
  onClose: () => void;
  onMark: (markId: string, value?: PlannedMarkActionValue) => void;
  onMove: (markId: string, value: MoveMarkValue) => void;
  onSubstituteWithExisting?: (markId: string, substituteMarkId: string) => void;
  onSubstituteWithQuickMark?: (markId: string, value: QuickSubstituteValue) => void;
  onSkip: (markId: string) => void;
  onUpdateNote?: (markId: string, note: string) => void | Promise<void>;
};

const actionableStatuses: PlannedMarkActionSheetMarkStatus[] = [
  "ready",
  "dependency_required",
  "blocked",
  "ready_with_advisory",
  "ready_with_waiver",
  "needs_decision",
  "planned",
  "active",
  "overdue_today",
];

export function PlannedMarkActionSheetContent({
  mark,
  locale,
  substituteCandidates = [],
  pathOptions = [],
  expeditionOptions = [],
  milestoneOptions = [],
  maxHeightOverride,
  layoutMode = "sheet",
  featureFlags,
  onClose,
  onMark,
  onMove,
  onSubstituteWithExisting,
  onSubstituteWithQuickMark,
  onSkip,
  onUpdateNote,
}: PlannedMarkActionSheetContentProps) {
  const copy = getCopy(locale);
  const { height } = useWindowDimensions();
  const keyboardAwareViewportHeight = useKeyboardAwareViewportHeight(height);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [noteDraft, setNoteDraft] = useState(mark.markNote ?? "");
  const [persistedNote, setPersistedNote] = useState(mark.markNote ?? "");
  const [selectedLaunchOptionId, setSelectedLaunchOptionId] = useState(mark.launchConfig?.defaultOptionId ?? null);
  const isFullScreen = layoutMode === "fullScreen";
  const maxHeight = maxHeightOverride ?? Math.max(430, Math.min(height * 0.82, 820));
  const dialogVerticalPadding = keyboardAwareViewportHeight < 520 ? spacing.sm : spacing.xl;
  const dialogAvailableHeight = Math.max(320, keyboardAwareViewportHeight - dialogVerticalPadding * 2);
  const isActionable = actionableStatuses.includes(mark.status);
  const showSubstitute =
    isActionable &&
    featureFlags?.substitutePlannedMark === true &&
    (typeof onSubstituteWithExisting === "function" || typeof onSubstituteWithQuickMark === "function");
  const showPrimaryAction = featureFlags?.markPrimaryAction !== false;
  const showSecondaryActions = featureFlags?.markSecondaryActions !== false;
  const hasTimeRange = Boolean(mark.timeLabel && /[-–]/u.test(mark.timeLabel));
  const initialMoveValue = useMemo(() => getNormalizedInitialMoveValue(mark.timeLabel), [mark.timeLabel]);
  const dependencyGroups = groupDependencies(mark.dependencies ?? []);
  const blockingDependencies = [...dependencyGroups.critical, ...dependencyGroups.required];
  const hasBlockingDependencies = blockingDependencies.length > 0;
  const primaryAction = useMemo(() => {
    const resolved = resolvePrimaryAction(mark, locale);
    if (mark.primaryActionLabel) {
      return resolved;
    }
    return {
      ...resolved,
      label: locale === "vi" ? "Đánh dấu" : "Mark",
    };
  }, [locale, mark]);
  useEffect(() => {
    setNoteDraft(mark.markNote ?? "");
    setPersistedNote(mark.markNote ?? "");
    setSelectedLaunchOptionId(mark.launchConfig?.defaultOptionId ?? null);
  }, [mark.id, mark.markNote]);

  const normalizedInitialNote = persistedNote.trim();
  const normalizedDraftNote = noteDraft.trim();

  async function persistNoteDraft() {
    if (!onUpdateNote || normalizedDraftNote === normalizedInitialNote) {
      return;
    }

    await onUpdateNote(mark.id, noteDraft);
    setPersistedNote(noteDraft);
  }

  function handleClose() {
    void (async () => {
      await persistNoteDraft();
      onClose();
    })();
  }

  const actions: PlannedMarkRowAction[] = showSecondaryActions
    ? [
        {
          key: "move",
          label: copy.plannedMarkAction.move,
          variant: "secondary",
          icon: "utility.calendar",
          onPress: () => setDialogMode("move"),
        },
        {
          key: "skip",
          label: copy.plannedMarkAction.skip,
          variant: "secondary",
          icon: "status.missed",
          onPress: () => setDialogMode("skip"),
        },
      ]
    : [];

  if (showSubstitute) {
    actions.splice(1, 0, {
      key: "substitute",
      label: copy.plannedMarkAction.substituteShort,
      variant: "secondary",
      icon: "status.inProgress",
      onPress: () => setDialogMode("substitute"),
    });
  }

  return (
    <View
      style={[
        styles.root,
        {
          minHeight: isFullScreen ? 0 : 430,
          maxHeight: isFullScreen ? undefined : maxHeight,
          backgroundColor: mark.path.theme.surface,
          borderColor: mark.path.theme.border,
        },
        isFullScreen ? styles.rootFullScreen : null,
      ]}
    >
      <View style={styles.headerWrap}>
        <PlannedMarkHeader locale={locale} onClose={handleClose} title={mark.title} />
      </View>

      <View style={styles.bodyWrap}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.bodyContent}
          nestedScrollEnabled
          scrollEnabled={!dialogMode}
          showsVerticalScrollIndicator
        >
          <PlannedMarkScheduleContextBlock
            expeditionLabel={mark.expeditionLabel}
            periodLabel={mark.periodLabel}
            theme={mark.path.theme}
            timeLabel={mark.timeLabel}
          />

          {mark.signalLabel ? <SignalNotice label={mark.signalLabel} locale={locale} onPress={mark.onOpenSignal} /> : null}

          <View style={styles.detailEditorBlock}>
            <PlannedMarkIntentionText
              intentionText={mark.intentionText}
              label={copy.markDetail.section.markDetail}
              theme={mark.path.theme}
            />
            <NoteInputBase
              accessibilityLabel={copy.plannedMarkAction.markNote}
              label={copy.plannedMarkAction.markNote}
              onChangeText={setNoteDraft}
              onEndEditing={() => {
                void persistNoteDraft();
              }}
              placeholder={copy.plannedMarkAction.markNotePlaceholder}
              value={noteDraft}
            />
          </View>

          {hasBlockingDependencies ? (
            <View style={styles.dependenciesPanel}>
              <WMText style={styles.dependenciesTitle} variant="label">
                {locale === "vi" ? "Phụ thuộc" : "Dependencies"}
              </WMText>
              <DependencySection dependencies={blockingDependencies} tone="required" />
            </View>
          ) : null}

          {mark.relatedPackChecks?.length ? (
            <View style={styles.dependenciesPanel}>
              <WMText style={styles.dependenciesTitle} variant="label">
                Pack Checks
              </WMText>
              <PackCheckLinkSection links={mark.relatedPackChecks} />
            </View>
          ) : null}

          {mark.checklist?.items.length ? (
            <View style={styles.dependenciesPanel}>
              <WMText style={styles.dependenciesTitle} variant="label">
                {locale === "vi" ? "Checklist" : "Checklist"}
              </WMText>
              <View style={styles.checklistBlock}>
                {mark.checklist.items.map((item) => (
                  <ChecklistRow item={item} key={item.id} locale={locale} theme={mark.path.theme} />
                ))}
              </View>
            </View>
          ) : null}

          <PlannedMarkPathBlock label={copy.plannedMarkAction.pathLabel} pathLabel={mark.path.label} theme={mark.path.theme} />
        </ScrollView>
      </View>

      {isActionable && (showPrimaryAction || actions.length > 0) ? (
        <View style={styles.footerWrap}>
          {showPrimaryAction ? (
            <>
              <WMButton
                fullWidth
                label={primaryAction.label}
                disabled={dialogBusy}
                onPress={() => setDialogMode(mark.launchConfig ? "launch" : "mark")}
                variant="primary"
              />
              {mark.primaryActionHint ?? primaryAction.hint ? (
                <WMText style={styles.primaryHint} variant="metaCompact">
                  {mark.primaryActionHint ?? primaryAction.hint}
                </WMText>
              ) : null}
            </>
          ) : null}
          <PlannedMarkActionRow actions={actions} theme={mark.path.theme} />
        </View>
      ) : null}

      <Modal transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent visible={Boolean(dialogMode)} onRequestClose={() => (!dialogBusy ? setDialogMode(null) : undefined)}>
        <SafeAreaView
          edges={["top", "bottom"]}
          style={[
            styles.dialogModalRoot,
            Platform.OS === "web" ? { height: keyboardAwareViewportHeight } : null,
          ]}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.dialogKeyboardAvoiding}>
            <View style={[styles.dialogLayer, { paddingVertical: dialogVerticalPadding }]}>
              <Pressable disabled={dialogBusy} style={StyleSheet.absoluteFillObject} onPress={() => setDialogMode(null)} />
              {dialogMode === "mark" ? (
                <PlannedMarkConfirmDialog
                body={resolvePrimaryActionBody(mark, locale, primaryAction.hint)}
                cancelLabel={copy.plannedMarkAction.cancel}
                confirmLabel={primaryAction.label}
                disabled={dialogBusy}
                onCancel={() => setDialogMode(null)}
                onConfirm={async () => {
                  if (dialogBusy) {
                    return;
                  }
                  setDialogBusy(true);
                  try {
                    await persistNoteDraft();
                    await onMark(mark.id);
                    setDialogMode(null);
                  } finally {
                    setDialogBusy(false);
                  }
                }}
                theme={mark.path.theme}
                title={resolvePrimaryActionTitle(mark, locale, primaryAction.label)}
                />
              ) : null}
            {dialogMode === "launch" && mark.launchConfig ? (
              <PlannedMarkLaunchDialog
                cancelLabel={copy.plannedMarkAction.cancel}
                confirmLabel={primaryAction.label}
                defaultBadgeLabel={locale === "vi" ? "Theo ke hoach" : "Planned"}
                disabled={dialogBusy}
                onCancel={() => setDialogMode(null)}
                onConfirm={async (option) => {
                  if (dialogBusy) {
                    return;
                  }
                  setDialogBusy(true);
                  try {
                    await persistNoteDraft();
                    await onMark(mark.id, { routineTemplateId: option.routineTemplateId });
                    setDialogMode(null);
                  } finally {
                    setDialogBusy(false);
                  }
                }}
                onSelect={setSelectedLaunchOptionId}
                options={mark.launchConfig.options}
                selectedOptionId={selectedLaunchOptionId ?? mark.launchConfig.defaultOptionId}
                theme={mark.path.theme}
                title={
                  mark.launchConfig.kind === "golf_practice"
                    ? locale === "vi"
                      ? "Chon bai Golf Practice"
                      : "Choose Golf Practice"
                    : locale === "vi"
                      ? "Chon bai workout"
                      : "Choose Workout"
                }
              />
            ) : null}
            {dialogMode === "skip" ? (
              <PlannedMarkConfirmDialog
                body={copy.plannedMarkAction.confirmSkipBody}
                cancelLabel={copy.plannedMarkAction.cancel}
                confirmLabel={copy.plannedMarkAction.skip}
                disabled={dialogBusy}
                onCancel={() => setDialogMode(null)}
                onConfirm={async () => {
                  if (dialogBusy) {
                    return;
                  }
                  setDialogBusy(true);
                  try {
                    await persistNoteDraft();
                    await onSkip(mark.id);
                    setDialogMode(null);
                  } finally {
                    setDialogBusy(false);
                  }
                }}
                theme={mark.path.theme}
                title={copy.plannedMarkAction.confirmSkipTitle}
              />
            ) : null}
            {dialogMode === "move" ? (
              <PlannedMarkDateTimePickerDialog
                cancelLabel={copy.plannedMarkAction.cancel}
                dateLabel={copy.plannedMarkAction.date}
                endLabel={copy.plannedMarkAction.end}
                hasEndTime={hasTimeRange}
                initialValue={initialMoveValue}
                locale={locale}
                onCancel={() => setDialogMode(null)}
                onSave={async (value) => {
                  if (dialogBusy) {
                    return;
                  }
                  setDialogBusy(true);
                  try {
                    await persistNoteDraft();
                    await onMove(mark.id, value);
                    setDialogMode(null);
                  } finally {
                    setDialogBusy(false);
                  }
                }}
                saveLabel={copy.plannedMarkAction.save}
                startLabel={copy.plannedMarkAction.start}
                theme={mark.path.theme}
                title={copy.plannedMarkAction.moveMarkTitle}
              />
            ) : null}
            {dialogMode === "substitute" ? (
              <PlannedMarkSubstituteDialog
                cancelLabel={copy.plannedMarkAction.cancel}
                chooseExistingMarkLabel={copy.plannedMarkAction.chooseExistingMark}
                choosePathLabel={copy.plannedMarkAction.choosePath}
                emptyExistingLabel={copy.plannedMarkAction.noExistingMarksAvailable}
                existingCandidates={substituteCandidates}
                initialExpeditionId={mark.expedition?.id}
                initialMilestoneId={mark.milestone?.id}
                initialPathId={mark.path.entityId ?? mark.path.id}
                instructionLabel={copy.plannedMarkAction.substituteInstruction}
                locale={locale}
                expeditionOptions={expeditionOptions}
                milestoneOptions={milestoneOptions}
                maxAvailableHeight={dialogAvailableHeight}
                onCancel={() => setDialogMode(null)}
                onSubstituteWithExisting={
                  onSubstituteWithExisting
                    ? async (substituteMarkId) => {
                        if (dialogBusy) {
                          return;
                        }
                        setDialogBusy(true);
                        try {
                          await persistNoteDraft();
                          await onSubstituteWithExisting(mark.id, substituteMarkId);
                          setDialogMode(null);
                        } finally {
                          setDialogBusy(false);
                        }
                      }
                    : undefined
                }
                onSubstituteWithQuickMark={
                  onSubstituteWithQuickMark
                    ? async (value) => {
                        if (dialogBusy) {
                          return;
                        }
                        setDialogBusy(true);
                        try {
                          await persistNoteDraft();
                          await onSubstituteWithQuickMark(mark.id, value);
                          setDialogMode(null);
                        } finally {
                          setDialogBusy(false);
                        }
                      }
                    : undefined
                }
                orLabel={copy.plannedMarkAction.or}
                pathOptions={pathOptions}
                quickMarkLabel={copy.plannedMarkAction.addQuickMark}
                quickMarkPlaceholder={copy.plannedMarkAction.quickMarkPlaceholder}
                quickMarkDetailLabel={copy.plannedMarkAction.markDetail}
                quickMarkDetailPlaceholder={copy.plannedMarkAction.markDetailPlaceholder}
                selectExistingPlaceholder={copy.plannedMarkAction.selectMark}
                substituteLabel={copy.plannedMarkAction.substitute}
                theme={mark.path.theme}
                title={copy.plannedMarkAction.substituteTitle}
              />
            ) : null}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function useKeyboardAwareViewportHeight(fallbackHeight: number) {
  const [viewportHeight, setViewportHeight] = useState(fallbackHeight);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !window.visualViewport) {
      setViewportHeight(fallbackHeight);
      return;
    }

    const visualViewport = window.visualViewport;
    const updateViewportHeight = () => {
      setViewportHeight(Math.max(320, Math.round(visualViewport.height)));
    };

    updateViewportHeight();
    visualViewport.addEventListener("resize", updateViewportHeight);
    visualViewport.addEventListener("scroll", updateViewportHeight);

    return () => {
      visualViewport.removeEventListener("resize", updateViewportHeight);
      visualViewport.removeEventListener("scroll", updateViewportHeight);
    };
  }, [fallbackHeight]);

  return viewportHeight;
}

function PlannedMarkLaunchDialog({
  title,
  options,
  selectedOptionId,
  defaultBadgeLabel,
  cancelLabel,
  confirmLabel,
  onSelect,
  onCancel,
  onConfirm,
  theme,
  disabled = false,
}: {
  title: string;
  options: PlannedMarkLaunchOption[];
  selectedOptionId: string;
  defaultBadgeLabel: string;
  cancelLabel: string;
  confirmLabel: string;
  onSelect: (optionId: string) => void;
  onCancel: () => void;
  onConfirm: (option: PlannedMarkLaunchOption) => void | Promise<void>;
  theme: PlannedMarkPathTheme;
  disabled?: boolean;
}) {
  const selectedOption = options.find((option) => option.id === selectedOptionId) ?? options.find((option) => option.isDefault) ?? options[0];
  if (!selectedOption) {
    return null;
  }

  return (
    <View style={[styles.launchCard, { backgroundColor: foundationColors.bg.paper, borderColor: theme.border }]}>
      <View style={styles.launchContent}>
        <WMText style={styles.launchTitle} variant="pageTitle">
          {title}
        </WMText>
        <ScrollView bounces={false} style={styles.launchOptionScroll} contentContainerStyle={styles.launchOptionList}>
          {options.map((option) => {
            const selected = option.id === selectedOption.id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected } as AccessibilityState}
                disabled={disabled}
                key={option.id}
                onPress={() => onSelect(option.id)}
                style={({ pressed }) => [
                  styles.launchOptionRow,
                  {
                    borderColor: selected ? theme.deep : theme.border,
                    backgroundColor: selected ? theme.surfaceSoft : foundationColors.bg.paper,
                  },
                  pressed && !disabled ? styles.launchOptionRowPressed : null,
                ]}
              >
                <View style={[styles.launchRadio, { borderColor: selected ? theme.deep : theme.border }]}>
                  {selected ? <View style={[styles.launchRadioDot, { backgroundColor: theme.deep }]} /> : null}
                </View>
                <View style={styles.launchOptionText}>
                  <View style={styles.launchOptionTitleRow}>
                    <WMText style={styles.launchOptionTitle} variant="bodyStrong">
                      {option.title}
                    </WMText>
                    {option.isDefault ? (
                      <EntityChip label={defaultBadgeLabel} size="compact" stateTone="planned" variant="status" />
                    ) : null}
                  </View>
                  {option.detail ? (
                    <WMText style={styles.launchOptionDetail} variant="metaCompact">
                      {option.detail}
                    </WMText>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.launchFooter}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.launchButton,
            { backgroundColor: foundationColors.bg.paper, borderColor: theme.border },
            disabled ? styles.buttonDisabled : null,
            pressed && !disabled ? styles.buttonPressed : null,
          ]}
        >
          <WMText style={[styles.secondaryButtonText, { color: theme.deep }]} variant="bodyStrong">
            {cancelLabel}
          </WMText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onConfirm(selectedOption)}
          style={({ pressed }) => [
            styles.launchButton,
            { backgroundColor: theme.deep, borderColor: theme.deep },
            disabled ? styles.buttonDisabled : null,
            pressed && !disabled ? styles.buttonPressed : null,
          ]}
        >
          <WMText style={styles.primaryButtonText} variant="bodyStrong">
            {confirmLabel}
          </WMText>
        </Pressable>
      </View>
    </View>
  );
}

function SignalNotice({ label, locale, onPress }: { label: string; locale: Locale; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => (pressed ? styles.signalNoticePressed : null)}>
        <View style={styles.signalNotice}>
          <WMText style={styles.signalTitle} variant="metaCompact">
            {locale === "vi" ? "Signal Ä‘ang rung" : "Signal is active"}
          </WMText>
          <WMText variant="bodySm">{label}</WMText>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.signalNotice}>
      <WMText style={styles.signalTitle} variant="metaCompact">
        {locale === "vi" ? "Signal đang rung" : "Signal is active"}
      </WMText>
      <WMText variant="bodySm">{label}</WMText>
    </View>
  );
}

function DependencySection({
  dependencies,
  tone,
}: {
  dependencies: PlannedMarkDependencyItem[];
  tone: "critical" | "required" | "optional" | "satisfied" | "waived";
}) {
  if (dependencies.length === 0) {
    return null;
  }

  const toneStyle = dependencyToneStyles[tone];

  return (
    <View style={styles.dependencySection}>
      <View style={styles.dependencyList}>
        {dependencies.map((dependency) => (
          <Pressable
            key={dependency.id}
            accessibilityRole={dependency.onPress ? "button" : undefined}
            disabled={!dependency.onPress}
            onPress={dependency.onPress}
            style={({ pressed }) => [
              styles.dependencyRow,
              { borderColor: toneStyle.borderColor, backgroundColor: toneStyle.backgroundColor },
              dependency.onPress && pressed ? styles.dependencyRowPressed : null,
            ]}
          >
            <View style={styles.dependencyRowHeader}>
              <WMText style={styles.dependencyTitle} variant="bodySm">
                {dependency.title}
              </WMText>
              {dependency.statusLabel ? (
                <EntityChip
                  label={dependency.statusLabel}
                  size="compact"
                  stateTone={dependency.group === "critical" ? "blocked" : dependency.group === "satisfied" ? "done" : "planned"}
                  variant={dependency.group === "critical" ? "warningSoft" : "status"}
                />
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function PackCheckLinkSection({
  links,
}: {
  links: PlannedMarkPackCheckLink[];
}) {
  return (
    <View style={styles.dependencySection}>
      <View style={styles.dependencyList}>
        {links.map((link) => (
          <Pressable
            key={link.id}
            accessibilityRole={link.onPress ? "button" : undefined}
            disabled={!link.onPress}
            onPress={link.onPress}
            style={({ pressed }) => [
              styles.dependencyRow,
              styles.packCheckLinkRow,
              link.onPress && pressed ? styles.dependencyRowPressed : null,
            ]}
          >
            <View style={styles.dependencyRowHeader}>
              <WMText style={styles.dependencyTitle} variant="bodySm">
                {link.title}
              </WMText>
              {link.statusLabel ? (
                <EntityChip
                  label={link.statusLabel}
                  size="compact"
                  stateTone="planned"
                  variant="status"
                />
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ChecklistRow({
  item,
  locale,
  theme,
}: {
  item: NonNullable<PlannedMarkActionSheetMark["checklist"]>["items"][number];
  locale: Locale;
  theme: PlannedMarkPathTheme;
}) {
  const blocked = item.disabled || !item.onToggle;
  const accessibilityState: AccessibilityState = { checked: item.checked, disabled: blocked };

  return (
    <Pressable
      accessibilityLabel={locale === "vi" ? `${item.label}. ${item.checked ? "Đã tick" : "Chưa tick"}` : `${item.label}. ${item.checked ? "Checked" : "Unchecked"}`}
      accessibilityRole="checkbox"
      accessibilityState={accessibilityState}
      disabled={blocked}
      onPress={() => item.onToggle?.(!item.checked)}
      style={({ pressed }) => [
        styles.checklistRow,
        {
          borderColor: item.checked ? theme.border : "rgba(43,42,34,0.08)",
          backgroundColor: item.checked ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.48)",
        },
        item.disabled ? styles.checklistRowDisabled : null,
        pressed && !blocked ? styles.checklistRowPressed : null,
      ]}
    >
      <View
        style={[
          styles.checklistCheckbox,
          {
            borderColor: item.checked ? theme.deep : theme.border,
            backgroundColor: item.checked ? theme.accent : foundationColors.bg.paper,
          },
        ]}
      >
        <WaymarkIcon
          decorative
          semanticName="status.done"
          size="xs"
          state={item.checked ? "selected" : "disabled"}
        />
      </View>

      <WMText
        style={[
          styles.checklistLabel,
          item.checked ? styles.checklistLabelChecked : null,
        ]}
        variant="bodySm"
      >
        {item.label}
      </WMText>
    </Pressable>
  );
}

const dependencyToneStyles = {
  critical: {
    backgroundColor: "rgba(184,74,37,0.08)",
    borderColor: "rgba(184,74,37,0.18)",
    titleColor: "#7A3A24",
  },
  required: {
    backgroundColor: "rgba(216,165,29,0.1)",
    borderColor: "rgba(216,165,29,0.22)",
    titleColor: "#7A5811",
  },
  optional: {
    backgroundColor: "rgba(122,131,53,0.08)",
    borderColor: "rgba(122,131,53,0.18)",
    titleColor: "#4A5220",
  },
  satisfied: {
    backgroundColor: "rgba(30,95,158,0.08)",
    borderColor: "rgba(30,95,158,0.16)",
    titleColor: "#0B3764",
  },
  waived: {
    backgroundColor: "rgba(90,86,77,0.08)",
    borderColor: "rgba(90,86,77,0.16)",
    titleColor: "#5A564D",
  },
} as const;

function groupDependencies(dependencies: PlannedMarkDependencyItem[]) {
  return {
    critical: dependencies.filter((dependency) => dependency.group === "critical"),
    required: dependencies.filter((dependency) => dependency.group === "required"),
    optional: dependencies.filter((dependency) => dependency.group === "optional"),
    satisfied: dependencies.filter((dependency) => dependency.group === "satisfied"),
    waived: dependencies.filter((dependency) => dependency.group === "waived"),
  };
}

function resolvePrimaryAction(mark: PlannedMarkActionSheetMark, locale: Locale) {
  if (mark.primaryActionLabel) {
    return {
      label: mark.primaryActionLabel,
      hint: mark.primaryActionHint,
    };
  }

  const topCritical = (mark.dependencies ?? []).find((dependency) => dependency.group === "critical");
  const topRequired = (mark.dependencies ?? []).find((dependency) => dependency.group === "required");

  if (mark.status === "blocked" && topCritical) {
    return {
      label: locale === "vi" ? "Gỡ blocker trước" : "Resolve blocker first",
      hint: topCritical.title,
    };
  }

  if (mark.status === "dependency_required" && topRequired) {
    return {
      label:
        topRequired.typeLabel === "Pack Check" || topRequired.typeLabel === "Pack Check Instance"
          ? locale === "vi"
            ? "Mở Pack Check"
            : "Open Pack Check"
          : locale === "vi"
            ? "Mở phụ thuộc"
            : "Open dependency",
      hint: topRequired.title,
    };
  }

  if (mark.status === "needs_decision") {
    return {
      label: locale === "vi" ? "Quyết định lại" : "Review decision",
      hint: locale === "vi" ? "Một phụ thuộc phía trước đã đổi nhịp." : "An upstream dependency changed.",
    };
  }

  if (mark.status === "ready_with_waiver") {
    return {
      label: locale === "vi" ? "Bắt đầu với miễn trừ" : "Start with waiver",
      hint: locale === "vi" ? "Miễn trừ sẽ được ghi lại." : "The waiver will be recorded.",
    };
  }

  return {
    label: locale === "vi" ? "Bắt đầu / Hoàn tất" : "Start / Complete",
    hint:
      mark.status === "ready_with_advisory"
        ? locale === "vi"
          ? "Khuyến nghị vẫn đang mở nhưng không chặn."
          : "Advisories are still open but do not block the mark."
        : undefined,
  };
}

function resolvePrimaryActionTitle(mark: PlannedMarkActionSheetMark, locale: Locale, label: string) {
  return mark.primaryActionLabel ? label : getCopy(locale).plannedMarkAction.confirmMarkTitle;
}

function resolvePrimaryActionBody(mark: PlannedMarkActionSheetMark, locale: Locale, hint?: string) {
  return mark.primaryActionLabel ? hint ?? getCopy(locale).plannedMarkAction.confirmMarkBody : getCopy(locale).plannedMarkAction.confirmMarkBody;
}

function getInitialMoveValue(locale: Locale, timeLabel?: string): MoveMarkValue {
  const today = new Date();
  const date =
    locale === "vi"
      ? `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`
      : `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}/${today.getFullYear()}`;

  if (!timeLabel) {
    return { date };
  }

  const [startTime, endTime] = timeLabel.split(/[-–]/u).map((value) => value.trim());

  return {
    date,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
  };
}

function getNormalizedInitialMoveValue(timeLabel?: string): MoveMarkValue {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  if (!timeLabel) {
    return { date };
  }

  const [startTimeLabel, endTimeLabel] = timeLabel.split(/[-â€“]/u).map((value) => value.trim());

  return {
    date,
    startTime: normalizeMoveTimeValue(startTimeLabel),
    endTime: normalizeMoveTimeValue(endTimeLabel),
  };
}

function normalizeMoveTimeValue(value?: string) {
  if (!value) {
    return undefined;
  }

  const compact = value.trim().replace(/\s+/g, " ");
  const meridiem = compact.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (meridiem) {
    let hour = Number(meridiem[1]);
    const minute = Number(meridiem[2]);
    const suffix = meridiem[3].toUpperCase();
    if (suffix === "AM" && hour === 12) {
      hour = 0;
    } else if (suffix === "PM" && hour < 12) {
      hour += 12;
    }
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const twentyFourHour = compact.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }

  return undefined;
}

const styles = StyleSheet.create({
  root: {
    borderRadius: semanticRadius.sheet,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    backgroundColor: foundationColors.bg.paperWarm,
  },
  rootFullScreen: {
    flex: 1,
    borderRadius: 0,
  },
  headerWrap: {
    position: "relative",
    zIndex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    ...getBorderStyle(semanticBorder.divider.subtle),
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  bodyWrap: {
    flex: 1,
    minHeight: 0,
    position: "relative",
    zIndex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  signalNotice: {
    backgroundColor: "rgba(255,255,255,0.56)",
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    borderColor: "rgba(43,42,34,0.08)",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  signalTitle: {
    color: foundationColors.ink.secondary,
    fontWeight: "700",
  },
  signalNoticePressed: {
    opacity: 0.78,
  },
  dependenciesPanel: {
    gap: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.48)",
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    borderColor: "rgba(43,42,34,0.08)",
    padding: spacing.sm,
  },
  checklistBlock: {
    gap: spacing.xs,
  },
  detailEditorBlock: {
    gap: spacing.sm,
  },
  checklistRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.48)",
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  checklistRowDisabled: {
    opacity: 0.48,
  },
  checklistRowPressed: {
    opacity: 0.84,
  },
  checklistCheckbox: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  checklistLabel: {
    flex: 1,
    minWidth: 0,
  },
  checklistLabelChecked: {
    color: foundationColors.ink.secondary,
    opacity: 0.78,
    textDecorationLine: "line-through",
  },
  dependenciesTitle: {
    color: foundationColors.ink.secondary,
    textTransform: "uppercase",
  },
  dependencySection: {
    gap: spacing.xs,
  },
  dependencyList: {
    gap: spacing.xs,
  },
  packCheckLinkRow: {
    backgroundColor: "rgba(30,95,158,0.08)",
    borderColor: "rgba(30,95,158,0.16)",
  },
  dependencyRow: {
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dependencyRowPressed: {
    opacity: 0.82,
  },
  dependencyRowHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  dependencyTitle: {
    flex: 1,
  },
  footerWrap: {
    position: "relative",
    zIndex: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    ...getBorderStyle(semanticBorder.divider.subtle),
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    backgroundColor: "rgba(255,255,255,0.52)",
  },
  primaryHint: {
    color: foundationColors.ink.secondary,
  },
  launchCard: {
    borderRadius: semanticRadius.sheet,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  launchContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  launchTitle: {
    fontSize: 22,
    lineHeight: 29,
  },
  launchOptionList: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  launchOptionScroll: {
    maxHeight: 360,
  },
  launchOptionRow: {
    alignItems: "center",
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 64,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  launchOptionRowPressed: {
    opacity: 0.84,
  },
  launchRadio: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  launchRadioDot: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  launchOptionText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  launchOptionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  launchOptionTitle: {
    flex: 1,
  },
  launchOptionDetail: {
    color: foundationColors.ink.secondary,
  },
  launchFooter: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  launchButton: {
    alignItems: "center",
    borderRadius: semanticRadius.button.default,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
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
  dialogLayer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: "rgba(43,42,34,0.26)",
  },
  dialogKeyboardAvoiding: {
    flex: 1,
  },
  dialogModalRoot: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
