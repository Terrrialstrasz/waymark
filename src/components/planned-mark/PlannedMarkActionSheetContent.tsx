import { useEffect, useMemo, useState } from "react";
import { AccessibilityState, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
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
  };
  periodLabel?: string;
  timeLabel?: string;
  expeditionLabel?: string;
  intentionText?: string;
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

export type MoveMarkValue = {
  date: string;
  startTime?: string;
  endTime?: string;
};

export type QuickSubstituteValue = {
  title: string;
  detail?: string;
  pathId: string;
};

export type DialogMode = null | "mark" | "skip" | "move" | "substitute";

export type PlannedMarkActionSheetContentProps = {
  mark: PlannedMarkActionSheetMark;
  locale: Locale;
  substituteCandidates?: SubstituteCandidateMark[];
  pathOptions?: PathOption[];
  maxHeightOverride?: number;
  layoutMode?: "sheet" | "fullScreen";
  featureFlags?: {
    substitutePlannedMark?: boolean;
    markPrimaryAction?: boolean;
  };
  onClose: () => void;
  onMark: (markId: string) => void;
  onMove: (markId: string, value: MoveMarkValue) => void;
  onSubstituteWithExisting?: (markId: string, substituteMarkId: string) => void;
  onSubstituteWithQuickMark?: (markId: string, value: QuickSubstituteValue) => void;
  onSkip: (markId: string) => void;
  onUpdateDetail?: (markId: string, detail: string) => void | Promise<void>;
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
  maxHeightOverride,
  layoutMode = "sheet",
  featureFlags,
  onClose,
  onMark,
  onMove,
  onSubstituteWithExisting,
  onSubstituteWithQuickMark,
  onSkip,
  onUpdateDetail,
}: PlannedMarkActionSheetContentProps) {
  const copy = getCopy(locale);
  const { height } = useWindowDimensions();
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [detailDraft, setDetailDraft] = useState("");
  const [persistedDetail, setPersistedDetail] = useState("");
  const isFullScreen = layoutMode === "fullScreen";
  const maxHeight = maxHeightOverride ?? Math.max(430, Math.min(height * 0.82, 820));
  const isActionable = actionableStatuses.includes(mark.status);
  const showSubstitute =
    isActionable &&
    featureFlags?.substitutePlannedMark === true &&
    (typeof onSubstituteWithExisting === "function" || typeof onSubstituteWithQuickMark === "function");
  const showPrimaryAction = featureFlags?.markPrimaryAction !== false;
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
    setDetailDraft("");
    setPersistedDetail("");
  }, [mark.id]);

  const normalizedInitialDetail = persistedDetail.trim();
  const normalizedDraftDetail = detailDraft.trim();

  async function persistDetailDraft() {
    if (!onUpdateDetail || normalizedDraftDetail === normalizedInitialDetail) {
      return;
    }

    await onUpdateDetail(mark.id, detailDraft);
    setPersistedDetail(detailDraft);
  }

  function handleClose() {
    void (async () => {
      await persistDetailDraft();
      onClose();
    })();
  }

  const actions: PlannedMarkRowAction[] = [
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
  ];

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
              onChangeText={setDetailDraft}
              onEndEditing={() => {
                void persistDetailDraft();
              }}
              placeholder={copy.plannedMarkAction.markNotePlaceholder}
              value={detailDraft}
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

      {isActionable ? (
        <View style={styles.footerWrap}>
          {showPrimaryAction ? (
            <>
              <WMButton
                fullWidth
                label={primaryAction.label}
                disabled={dialogBusy}
                onPress={() => setDialogMode("mark")}
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
        <SafeAreaView edges={["top", "bottom"]} style={styles.dialogModalRoot}>
          <View style={styles.dialogLayer}>
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
                    await persistDetailDraft();
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
                    await persistDetailDraft();
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
                    await persistDetailDraft();
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
                instructionLabel={copy.plannedMarkAction.substituteInstruction}
                locale={locale}
                onCancel={() => setDialogMode(null)}
                onSubstituteWithExisting={
                  onSubstituteWithExisting
                    ? async (substituteMarkId) => {
                        if (dialogBusy) {
                          return;
                        }
                        setDialogBusy(true);
                        try {
                          await persistDetailDraft();
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
                          await persistDetailDraft();
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
        </SafeAreaView>
      </Modal>
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
  dialogLayer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: "rgba(43,42,34,0.26)",
  },
  dialogModalRoot: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
