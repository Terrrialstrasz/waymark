import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { Locale, PathId } from "../types/ui";
import {
  MoveMarkValue,
  PathOption,
  PlannedMarkActionSheetContent,
  PlannedMarkActionSheetMark,
  PlannedMarkActionSheetMarkStatus,
  QuickSubstituteValue,
  SubstituteCandidateMark,
} from "../components/planned-mark/PlannedMarkActionSheetContent";
import { PlannedMarkConfirmDialog } from "../components/planned-mark/PlannedMarkConfirmDialog";
import { PlannedMarkDateTimePickerDialog } from "../components/planned-mark/PlannedMarkDateTimePickerDialog";
import { PlannedMarkSubstituteDialog } from "../components/planned-mark/PlannedMarkSubstituteDialog";
import { getPlannedMarkPathTheme } from "../components/planned-mark/plannedMarkTheme";
import { WMText } from "../components/primitives/Text";
import { foundationColors, semanticElevation, semanticRadius, spacing } from "../theme/tokens";
import { getCopy } from "../i18n/copy";

type Props = {
  locale: Locale;
};

const longIntention =
  "Be present with my family without distractions. Tonight is not about doing something impressive; it is about proving that I can close the laptop, put the phone down, and give my family the version of me that is calm, available, and fully here.\n\n• No scrolling during dinner.\n• Listen before answering.\n• Help clean up without being asked.\n• Give my child patient attention during learning time.\n• End the evening with warmth, not leftover work tension.\n\nExtra stress test paragraph: this component must keep the header and close button visible while only the internal body scrolls. Long intention text should never push the close button off-screen, never cover the action row, and never force the whole app page to scroll behind the sheet.";

export function PlannedMarkActionSheetBoard({ locale }: Props) {
  const copy = getCopy(locale);
  const [events, setEvents] = useState<string[]>([]);
  const [smallHeight, setSmallHeight] = useState(false);
  const candidates = useMemo(() => makeCandidates(locale), [locale]);
  const pathOptions = useMemo(() => makePathOptions(locale), [locale]);

  const logEvent = (label: string) => setEvents((current) => [label, ...current].slice(0, 8));

  const sheetStates = useMemo(
    () => [
      {
        key: "planned-family",
        title: "1. Planned / Family / long intention",
        mark: makeMark({
          locale,
          pathId: "family",
          status: "planned",
          title: "Dinner present",
          periodLabel: "Evening",
          timeLabel: "6:00 PM–9:30 PM",
          expeditionLabel: "Expedition: Waymark MVP",
          intentionText: longIntention,
        }),
        featureFlags: { substitutePlannedMark: true },
        substituteCandidates: candidates,
        pathOptions,
      },
      {
        key: "planned-career",
        title: "2. Planned / Career / long title / no intention",
        mark: makeMark({
          locale,
          pathId: "career",
          status: "planned",
          title: "Draft one calm weekly client follow-up note that still leaves room for clear thinking tomorrow morning",
          periodLabel: "Morning",
          timeLabel: "8:00 AM–10:00 AM",
        }),
        featureFlags: { substitutePlannedMark: false },
        substituteCandidates: candidates,
        pathOptions,
      },
      {
        key: "active",
        title: "3. Active / actionable",
        mark: makeMark({
          locale,
          pathId: "health",
          status: "active",
          title: "Strength session A",
          periodLabel: "Now",
          timeLabel: "6:30 AM–7:15 AM",
        }),
        featureFlags: { substitutePlannedMark: false },
        substituteCandidates: candidates,
        pathOptions,
      },
      {
        key: "overdue",
        title: "4. Overdue today / actionable",
        mark: makeMark({
          locale,
          pathId: "culture",
          status: "overdue_today",
          title: "Read poetry aloud",
          periodLabel: "Tonight",
          timeLabel: "9:00 PM",
        }),
        featureFlags: { substitutePlannedMark: true },
        substituteCandidates: candidates,
        pathOptions,
      },
      {
        key: "done",
        title: "5. Done / read-only",
        mark: makeMark({
          locale,
          pathId: "family",
          status: "done",
          title: "Dinner present",
        }),
      },
      {
        key: "skipped",
        title: "6. Skipped / read-only",
        mark: makeMark({
          locale,
          pathId: "career",
          status: "skipped",
          title: "Submit the client update",
        }),
      },
      {
        key: "missed",
        title: "7. Missed / read-only",
        mark: makeMark({
          locale,
          pathId: "character",
          status: "missed",
          title: "Evening reflection",
        }),
      },
      {
        key: "sub-off",
        title: "8. Substitute OFF: Mark, Move, Skip",
        mark: makeMark({
          locale,
          pathId: "golf",
          status: "planned",
          title: "Short putting practice",
        }),
        featureFlags: { substitutePlannedMark: false },
        pathOptions,
      },
      {
        key: "sub-on",
        title: "9. Substitute ON: Mark, Move, Sub, Skip",
        mark: makeMark({
          locale,
          pathId: "golf",
          status: "planned",
          title: "Short putting practice",
        }),
        featureFlags: { substitutePlannedMark: true },
        substituteCandidates: candidates,
        pathOptions,
      },
      {
        key: "small-height",
        title: "10. Small mobile height / internal scroll",
        mark: makeMark({
          locale,
          pathId: "family",
          status: "planned",
          title: "Small-height stress test",
          periodLabel: "Evening",
          timeLabel: "6:00 PM–9:30 PM",
          intentionText: longIntention,
        }),
        featureFlags: { substitutePlannedMark: true },
        substituteCandidates: candidates,
        pathOptions,
      },
      {
        key: "vi-long",
        title: "20. Vietnamese labels / long Vietnamese title",
        mark:
          locale === "vi"
            ? makeMark({
                locale,
                pathId: "family",
                status: "planned",
                title: "Tối nay hãy để lại một dấu mốc thật yên tĩnh nhưng rõ ràng cho gia đình trong khung giờ sau bữa tối",
                periodLabel: "Buổi tối",
                timeLabel: "18:00–21:30",
                intentionText: longIntention,
              })
            : makeMark({
                locale,
                pathId: "family",
                status: "planned",
                title: "Switch locale to Vietnamese for long-label review",
                intentionText: longIntention,
              }),
        featureFlags: { substitutePlannedMark: true },
        substituteCandidates: candidates,
        pathOptions,
      },
    ],
    [candidates, locale, pathOptions],
  );

  return (
    <View style={styles.stack}>
      <BoardSection
        title="Planned Mark Action Sheet"
        subtitle="Compact fixed action row, fixed header, internal body scroll, and overlay dialogs mounted above the sheet."
      >
        <Pressable onPress={() => setSmallHeight((current) => !current)} style={styles.toggle}>
          <WMText variant="bodyStrong">
            {smallHeight ? "Use standard preview height" : "Use very small mobile height"}
          </WMText>
        </Pressable>

        {sheetStates.map((state) => (
          <View key={state.key} style={styles.previewBlock}>
            <WMText variant="bodyStrong">{state.title}</WMText>
            <View style={[styles.sheetFrame, (smallHeight || state.key === "small-height") && styles.sheetFrameSmall]}>
              <View style={styles.handle} />
              <PlannedMarkActionSheetContent
                featureFlags={state.featureFlags}
                locale={locale}
                mark={state.mark}
                maxHeightOverride={smallHeight || state.key === "small-height" ? 430 : undefined}
                onClose={() => logEvent(`${state.key}: close`)}
                onMark={(markId: string) => logEvent(`${state.key}: mark ${markId}`)}
                onMove={(markId: string, value: MoveMarkValue) => logEvent(`${state.key}: move ${markId} ${JSON.stringify(value)}`)}
                onSkip={(markId: string) => logEvent(`${state.key}: skip ${markId}`)}
                onSubstituteWithExisting={
                  state.featureFlags?.substitutePlannedMark
                    ? (markId: string, substituteMarkId: string) => logEvent(`${state.key}: existing ${markId} -> ${substituteMarkId}`)
                    : undefined
                }
                onSubstituteWithQuickMark={
                  state.featureFlags?.substitutePlannedMark
                    ? (markId: string, value: QuickSubstituteValue) => logEvent(`${state.key}: quick ${markId} ${value.title} ${value.pathId}`)
                    : undefined
                }
                pathOptions={state.pathOptions}
                substituteCandidates={state.substituteCandidates}
              />
            </View>
          </View>
        ))}
      </BoardSection>

      <BoardSection title="Dialog states">
        <View style={styles.previewBlock}>
          <WMText variant="bodyStrong">11. Mark confirmation dialog</WMText>
          <PlannedMarkConfirmDialog
            body={copy.plannedMarkAction.confirmMarkBody}
            cancelLabel={copy.plannedMarkAction.cancel}
            confirmLabel={copy.plannedMarkAction.mark}
            onCancel={() => logEvent("dialog: cancel mark")}
            onConfirm={() => logEvent("dialog: confirm mark")}
            theme={getPlannedMarkPathTheme("family")}
            title={copy.plannedMarkAction.confirmMarkTitle}
          />
        </View>

        <View style={styles.previewBlock}>
          <WMText variant="bodyStrong">12. Skip confirmation dialog</WMText>
          <PlannedMarkConfirmDialog
            body={copy.plannedMarkAction.confirmSkipBody}
            cancelLabel={copy.plannedMarkAction.cancel}
            confirmLabel={copy.plannedMarkAction.skip}
            onCancel={() => logEvent("dialog: cancel skip")}
            onConfirm={() => logEvent("dialog: confirm skip")}
            theme={getPlannedMarkPathTheme("career")}
            title={copy.plannedMarkAction.confirmSkipTitle}
          />
        </View>

        <View style={styles.previewBlock}>
          <WMText variant="bodyStrong">13. Move date/time picker dialog</WMText>
          <PlannedMarkDateTimePickerDialog
            cancelLabel={copy.plannedMarkAction.cancel}
            dateLabel={copy.plannedMarkAction.date}
            endLabel={copy.plannedMarkAction.end}
            hasEndTime
            initialValue={{ date: "05/01/2026", startTime: "06:00 PM", endTime: "09:30 PM" }}
            locale={locale}
            onCancel={() => logEvent("dialog: cancel move")}
            onSave={(value) => logEvent(`dialog: save move ${JSON.stringify(value)}`)}
            saveLabel={copy.plannedMarkAction.save}
            startLabel={copy.plannedMarkAction.start}
            theme={getPlannedMarkPathTheme("family")}
            title={copy.plannedMarkAction.moveMarkTitle}
          />
        </View>

        <View style={styles.previewBlock}>
          <WMText variant="bodyStrong">14-19. Substitute dialog states</WMText>
          <PlannedMarkSubstituteDialog
            cancelLabel={copy.plannedMarkAction.cancel}
            chooseExistingMarkLabel={copy.plannedMarkAction.chooseExistingMark}
            choosePathLabel={copy.plannedMarkAction.choosePath}
            emptyExistingLabel={copy.plannedMarkAction.noExistingMarksAvailable}
            existingCandidates={candidates}
            instructionLabel={copy.plannedMarkAction.substituteInstruction}
            locale={locale}
            onCancel={() => logEvent("dialog: cancel substitute")}
            onSubstituteWithExisting={(substituteMarkId: string) => logEvent(`dialog: substitute existing ${substituteMarkId}`)}
            onSubstituteWithQuickMark={(value: QuickSubstituteValue) => logEvent(`dialog: substitute quick ${JSON.stringify(value)}`)}
            orLabel={copy.plannedMarkAction.or}
            pathOptions={pathOptions}
            quickMarkLabel={copy.plannedMarkAction.addQuickMark}
            quickMarkPlaceholder={copy.plannedMarkAction.quickMarkPlaceholder}
            selectExistingPlaceholder={copy.plannedMarkAction.selectMark}
            substituteLabel={copy.plannedMarkAction.substitute}
            theme={getPlannedMarkPathTheme("family")}
            title={copy.plannedMarkAction.substituteTitle}
          />
        </View>

        <View style={styles.previewBlock}>
          <WMText variant="bodyStrong">15. Substitute dialog / no existing candidates / Quick Mark only</WMText>
          <PlannedMarkSubstituteDialog
            cancelLabel={copy.plannedMarkAction.cancel}
            chooseExistingMarkLabel={copy.plannedMarkAction.chooseExistingMark}
            choosePathLabel={copy.plannedMarkAction.choosePath}
            emptyExistingLabel={copy.plannedMarkAction.noExistingMarksAvailable}
            existingCandidates={[]}
            instructionLabel={copy.plannedMarkAction.substituteInstruction}
            locale={locale}
            onCancel={() => logEvent("dialog: cancel substitute quick only")}
            onSubstituteWithQuickMark={(value: QuickSubstituteValue) => logEvent(`dialog: quick only ${JSON.stringify(value)}`)}
            orLabel={copy.plannedMarkAction.or}
            pathOptions={pathOptions}
            quickMarkLabel={copy.plannedMarkAction.addQuickMark}
            quickMarkPlaceholder={copy.plannedMarkAction.quickMarkPlaceholder}
            selectExistingPlaceholder={copy.plannedMarkAction.selectMark}
            substituteLabel={copy.plannedMarkAction.substitute}
            theme={getPlannedMarkPathTheme("health")}
            title={copy.plannedMarkAction.substituteTitle}
          />
        </View>
      </BoardSection>

      <BoardSection title="Interaction log">
        <View style={styles.logStack}>
          {events.length ? (
            events.map((event) => (
              <WMText key={event} variant="bodySm">
                {event}
              </WMText>
            ))
          ) : (
            <WMText variant="bodySm">Tap preview actions to verify callbacks and dialog behavior.</WMText>
          )}
        </View>
      </BoardSection>
    </View>
  );
}

function makeMark({
  locale,
  pathId,
  status,
  title,
  periodLabel,
  timeLabel,
  expeditionLabel,
  intentionText,
}: {
  locale: Locale;
  pathId: PathId;
  status: PlannedMarkActionSheetMarkStatus;
  title: string;
  periodLabel?: string;
  timeLabel?: string;
  expeditionLabel?: string;
  intentionText?: string;
}): PlannedMarkActionSheetMark {
  const pathLabels: Record<PathId, Record<Locale, string>> = {
    career: { en: "Career Craft", vi: "Sự nghiệp & tay nghề" },
    snag: { en: "SNAG Golf Vietnam", vi: "SNAG Golf Vietnam" },
    health: { en: "Health & Body", vi: "Sức khỏe & cơ thể" },
    family: { en: "Family & Home", vi: "Gia đình & tổ ấm" },
    character: { en: "Character & Stoicism", vi: "Character & Stoicism" },
    golf: { en: "Golf Craft", vi: "Golf Craft" },
    culture: { en: "Culture, Class & Romance", vi: "Văn hóa, khí chất & sự lãng mạn" },
  };

  return {
    id: `${pathId}-${status}-${title}`,
    title,
    status,
    statusLabel: getStatusLabel(status, locale),
    path: {
      id: pathId,
      label: pathLabels[pathId][locale],
      theme: getPlannedMarkPathTheme(pathId),
    },
    periodLabel,
    timeLabel,
    expeditionLabel,
    intentionText,
  };
}

function makeCandidates(locale: Locale): SubstituteCandidateMark[] {
  return [
    {
      id: "candidate-1",
      title:
        locale === "vi"
          ? "Đi bộ yên tĩnh 20 phút quanh khu nhà sau bữa tối để giữ nhịp hiện diện"
          : "Quiet 20-minute neighborhood walk after dinner to hold the evening together",
      pathLabel: locale === "vi" ? "Sức khỏe & cơ thể" : "Health & Body",
      statusLabel: locale === "vi" ? "Đã lên kế hoạch" : "Planned",
    },
    {
      id: "candidate-2",
      title:
        locale === "vi"
          ? "Viết một ghi chú ngắn cho khách hàng nhưng không để công việc tràn vào bữa tối gia đình"
          : "Write a short client note without letting work spill into family dinner",
      pathLabel: locale === "vi" ? "Sự nghiệp & tay nghề" : "Career Craft",
      statusLabel: locale === "vi" ? "Đang thực hiện" : "Active",
    },
  ];
}

function makePathOptions(locale: Locale): PathOption[] {
  return [
    { id: "family", label: locale === "vi" ? "Gia đình & tổ ấm" : "Family & Home", theme: getPlannedMarkPathTheme("family") },
    { id: "career", label: locale === "vi" ? "Sự nghiệp & tay nghề" : "Career Craft", theme: getPlannedMarkPathTheme("career") },
    { id: "health", label: locale === "vi" ? "Sức khỏe & cơ thể" : "Health & Body", theme: getPlannedMarkPathTheme("health") },
    { id: "culture", label: locale === "vi" ? "Văn hóa, khí chất & sự lãng mạn" : "Culture, Class & Romance", theme: getPlannedMarkPathTheme("culture") },
  ];
}

function getStatusLabel(status: PlannedMarkActionSheetMarkStatus, locale: Locale) {
  switch (status) {
    case "active":
      return locale === "vi" ? "Đang thực hiện" : "Active";
    case "overdue_today":
      return locale === "vi" ? "Quá giờ hôm nay" : "Overdue today";
    case "done":
      return locale === "vi" ? "Đã hoàn thành" : "Done";
    case "rescheduled":
      return locale === "vi" ? "Đã dời lịch" : "Rescheduled";
    case "substituted":
      return locale === "vi" ? "Đã thay thế" : "Substituted";
    case "skipped":
      return locale === "vi" ? "Đã bỏ qua" : "Skipped";
    case "missed":
      return locale === "vi" ? "Đã lỡ" : "Missed";
    case "read_only_history":
      return locale === "vi" ? "Lịch sử" : "History";
    default:
      return locale === "vi" ? "Đã lên kế hoạch" : "Planned";
  }
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  toggle: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: semanticRadius.button.default,
    borderWidth: 1,
    borderColor: foundationColors.border.soft,
    backgroundColor: foundationColors.bg.paper,
  },
  previewBlock: {
    gap: spacing.sm,
  },
  sheetFrame: {
    borderTopLeftRadius: semanticRadius.sheet,
    borderTopRightRadius: semanticRadius.sheet,
    backgroundColor: foundationColors.bg.paperWarm,
    paddingTop: spacing.sm,
    overflow: "hidden",
    boxShadow: semanticElevation.sheet,
  },
  sheetFrameSmall: {
    height: 460,
  },
  handle: {
    alignSelf: "center",
    width: 54,
    height: 6,
    borderRadius: 999,
    backgroundColor: foundationColors.border.subtle,
    marginBottom: spacing.xs,
  },
  logStack: {
    gap: spacing.xs,
  },
});
