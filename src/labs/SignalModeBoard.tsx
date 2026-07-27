import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BoardSection } from "./BoardPrimitives";
import { WMChip } from "../components/primitives/WMChip";
import { WMText } from "../components/primitives/Text";
import { SignalModeCard, SignalModeCardModel, SignalModeCardVariant, useSignalModeController } from "../components/signal";
import { Locale } from "../types/ui";
import { SignalTargetType } from "../domain/waymark/enums";
import { foundationColors, spacing } from "../theme/tokens";

type Props = {
  locale: Locale;
};

type ScenarioId =
  | "ringingMark"
  | "ringingPack"
  | "snoozed"
  | "resolving"
  | "lateMissed"
  | "compact"
  | "vietnamese"
  | "reducedMotion"
  | "resolveRequired"
  | "missingAlternative";

const labels: Record<ScenarioId, string> = {
  ringingMark: "Ringing Mark Strength",
  ringingPack: "Ringing Pack Check",
  snoozed: "Snoozed",
  resolving: "Resolving Primary",
  lateMissed: "Late / Missed",
  compact: "Compact Small Device",
  vietnamese: "Vietnamese Labels",
  reducedMotion: "Reduced Motion",
  resolveRequired: "Resolve Required Exit Attempt",
  missingAlternative: "Missing Alternative Action",
};

export function SignalModeBoard({ locale }: Props) {
  const [scenario, setScenario] = useState<ScenarioId>("ringingMark");
  const model = useMemo(() => buildScenario(locale, scenario), [locale, scenario]);
  const { model: controlledModel, handleIntent } = useSignalModeController({
    model,
  });

  return (
    <View style={styles.stack}>
      <BoardSection
        title="Signal Mode Card"
        subtitle="Signal-mode visual states for Mark and Pack Check targets. The card emits intents only and does not mutate business state."
      >
        <View style={styles.tabRow}>
          {(Object.keys(labels) as ScenarioId[]).map((id) => (
            <WMChip key={id} label={labels[id]} onPress={() => setScenario(id)} selected={scenario === id} />
          ))}
        </View>
        <WMText style={styles.hint} variant="bodySm">
          {locale === "vi"
            ? "Báº£n review nÃ y dá»±ng Ä‘á»§ 10 state signal mode trÆ°á»›c khi ghÃ©p vÃ o Mark Detail / Pack Check Detail."
            : "This review board covers the 10 signal-mode states before integrating the card into Mark Detail and Pack Check Detail."}
        </WMText>
        <SignalModeCard
          model={controlledModel}
          onIntent={handleIntent}
          reducedMotion={scenario === "reducedMotion"}
          variant={resolveVariant(scenario)}
        />
      </BoardSection>
    </View>
  );
}

function buildScenario(locale: Locale, scenario: ScenarioId): SignalModeCardModel {
  const english = locale === "en";

  switch (scenario) {
    case "ringingPack":
      return {
        signalId: "signal-pack-1",
        targetId: "pack-check-1",
        targetType: SignalTargetType.PackCheckInstance,
        status: "ringing",
        title: english ? "Signal Ringing" : "Signal Ä‘ang reo",
        subtitle: english ? "Prepare before leaving." : "Chuáº©n bá»‹ trÆ°á»›c khi rá»i Ä‘i.",
        scheduledTimeLabel: english ? "05:20 AM" : "05:20",
        relativeStatusLabel: english ? "Now" : "BÃ¢y giá»",
        actions: [
          { id: "complete-pack", kind: "PRIMARY", label: english ? "Complete Pack" : "HoÃ n táº¥t pack", prominence: "primary", iconSemanticName: "entity.packCheck" },
          { id: "snooze-5", kind: "SNOOZE", label: english ? "Snooze 5 min" : "HoÃ£n 5 phÃºt", minutes: 5, iconSemanticName: "utility.clock" },
          { id: "not-needed", kind: "ALTERNATIVE", label: english ? "Not needed" : "KhÃ´ng cáº§n", iconSemanticName: "status.active" },
          { id: "skip-pack", kind: "SKIP_WITH_REASON", label: english ? "Skip" : "Bá» qua", iconSemanticName: "status.missed" },
        ],
      };
    case "snoozed":
      return {
        signalId: "signal-snoozed-1",
        targetId: "mark-1",
        targetType: SignalTargetType.MarkInstance,
        status: "snoozed",
        title: english ? "Signal Snoozed" : "Signal Ä‘Ã£ hoÃ£n",
        subtitle: english ? "Health & Body will call again soon." : "Health & Body sáº½ gá»i láº¡i sá»›m.",
        scheduledTimeLabel: english ? "05:40 AM" : "05:40",
        relativeStatusLabel: english ? "Snoozed" : "ÄÃ£ hoÃ£n",
        actions: [
          { id: "start-session", kind: "PRIMARY", label: english ? "Start Session" : "Báº¯t Ä‘áº§u buá»•i táº­p", prominence: "primary", iconSemanticName: "health.strength" },
          { id: "snooze-10", kind: "SNOOZE", label: english ? "Snooze 10 min" : "HoÃ£n 10 phÃºt", minutes: 10, iconSemanticName: "utility.clock" },
          { id: "skip-mark", kind: "SKIP_WITH_REASON", label: english ? "Skip" : "Bá» qua", iconSemanticName: "status.missed" },
        ],
      };
    case "resolving":
      return {
        signalId: "signal-resolving-1",
        targetId: "mark-1",
        targetType: SignalTargetType.MarkInstance,
        status: "resolving",
        title: english ? "Signal Ringing" : "Signal Ä‘ang reo",
        subtitle: english ? "Health & Body is calling." : "Health & Body Ä‘ang gá»i.",
        scheduledTimeLabel: english ? "05:30 AM" : "05:30",
        relativeStatusLabel: english ? "Now" : "BÃ¢y giá»",
        actions: [
          { id: "start-session", kind: "PRIMARY", label: english ? "Start Session" : "Báº¯t Ä‘áº§u buá»•i táº­p", prominence: "primary", loading: true, iconSemanticName: "health.strength" },
          { id: "snooze-10", kind: "SNOOZE", label: english ? "Snooze 10 min" : "HoÃ£n 10 phÃºt", minutes: 10, disabled: true, iconSemanticName: "utility.clock" },
          { id: "substitute", kind: "ALTERNATIVE", label: english ? "Substitute" : "Thay tháº¿", disabled: true, iconSemanticName: "status.inProgress" },
        ],
      };
    case "lateMissed":
      return {
        signalId: "signal-missed-1",
        targetId: "mark-1",
        targetType: SignalTargetType.MarkInstance,
        status: "missed",
        title: english ? "Signal Missed" : "Signal Ä‘Ã£ lá»¡",
        subtitle: english ? "The morning session is still asking for a clear decision." : "Buá»•i sÃ¡ng váº«n cáº§n má»™t quyáº¿t Ä‘á»‹nh rÃµ rÃ ng.",
        scheduledTimeLabel: english ? "05:30 AM" : "05:30",
        relativeStatusLabel: english ? "Missed" : "ÄÃ£ lá»¡",
        actions: [
          { id: "start-now", kind: "PRIMARY", label: english ? "Start Now" : "Báº¯t Ä‘áº§u ngay", prominence: "primary", iconSemanticName: "health.strength" },
          { id: "snooze-10", kind: "SNOOZE", label: english ? "Snooze 10 min" : "HoÃ£n 10 phÃºt", minutes: 10, iconSemanticName: "utility.clock" },
          { id: "skip-mark", kind: "SKIP_WITH_REASON", label: english ? "Skip with reason" : "Bá» qua cÃ³ lÃ½ do", iconSemanticName: "status.missed" },
        ],
      };
    case "compact":
      return {
        signalId: "signal-compact-1",
        targetId: "pack-check-1",
        targetType: SignalTargetType.PackCheckInstance,
        status: "ringing",
        title: english ? "Signal Ringing" : "Signal Ä‘ang reo",
        subtitle: english ? "Prepare before leaving." : "Chuáº©n bá»‹ trÆ°á»›c khi rá»i Ä‘i.",
        scheduledTimeLabel: english ? "05:20 AM" : "05:20",
        relativeStatusLabel: english ? "Now" : "BÃ¢y giá»",
        actions: [
          { id: "complete-pack", kind: "PRIMARY", label: english ? "Complete Pack" : "HoÃ n táº¥t pack", prominence: "primary", iconSemanticName: "entity.packCheck" },
          { id: "snooze-5", kind: "SNOOZE", label: english ? "Snooze 5 min" : "HoÃ£n 5 phÃºt", minutes: 5, iconSemanticName: "utility.clock" },
        ],
      };
    case "vietnamese":
      return {
        signalId: "signal-vi-1",
        targetId: "mark-1",
        targetType: SignalTargetType.MarkInstance,
        status: "ringing",
        title: "Signal Ä‘ang reo",
        subtitle: "Buá»•i táº­p sá»©c máº¡nh sá»›m nay Ä‘ang gá»i báº¡n quay láº¡i vá»›i cam káº¿t Ä‘Ã£ chá»n.",
        scheduledTimeLabel: "05:30",
        relativeStatusLabel: "BÃ¢y giá»",
        actions: [
          { id: "start-session", kind: "PRIMARY", label: "Báº¯t Ä‘áº§u buá»•i táº­p", prominence: "primary", iconSemanticName: "health.strength" },
          { id: "snooze-10", kind: "SNOOZE", label: "HoÃ£n 10 phÃºt", minutes: 10, iconSemanticName: "utility.clock" },
          { id: "substitute", kind: "ALTERNATIVE", label: "Thay tháº¿ má»‘c hÃ´m nay", iconSemanticName: "status.inProgress" },
        ],
      };
    case "reducedMotion":
      return {
        signalId: "signal-reduced-motion-1",
        targetId: "mark-1",
        targetType: SignalTargetType.MarkInstance,
        status: "ringing",
        title: english ? "Signal Ringing" : "Signal Ä‘ang reo",
        subtitle: english ? "Health & Body is calling." : "Health & Body Ä‘ang gá»i.",
        scheduledTimeLabel: english ? "05:30 AM" : "05:30",
        relativeStatusLabel: english ? "Now" : "BÃ¢y giá»",
        actions: [
          { id: "start-session", kind: "PRIMARY", label: english ? "Start Session" : "Báº¯t Ä‘áº§u buá»•i táº­p", prominence: "primary", iconSemanticName: "health.strength" },
          { id: "snooze-10", kind: "SNOOZE", label: english ? "Snooze 10 min" : "HoÃ£n 10 phÃºt", minutes: 10, iconSemanticName: "utility.clock" },
          { id: "skip-mark", kind: "SKIP_WITH_REASON", label: english ? "Skip" : "Bá» qua", iconSemanticName: "status.missed" },
        ],
      };
    case "resolveRequired":
      return {
        signalId: "signal-exit-attempt-1",
        targetId: "mark-1",
        targetType: SignalTargetType.MarkInstance,
        status: "ringing",
        title: english ? "Signal Ringing" : "Signal Ä‘ang reo",
        subtitle: english ? "Health & Body is calling." : "Health & Body Ä‘ang gá»i.",
        scheduledTimeLabel: english ? "05:30 AM" : "05:30",
        relativeStatusLabel: english ? "Now" : "BÃ¢y giá»",
        resolveRequiredHint: english ? "Resolve this signal before leaving." : "HÃ£y giáº£i quyáº¿t signal nÃ y trÆ°á»›c khi rá»i Ä‘i.",
        actions: [
          { id: "start-session", kind: "PRIMARY", label: english ? "Start Session" : "Báº¯t Ä‘áº§u buá»•i táº­p", prominence: "primary", iconSemanticName: "health.strength" },
          { id: "snooze-10", kind: "SNOOZE", label: english ? "Snooze 10 min" : "HoÃ£n 10 phÃºt", minutes: 10, iconSemanticName: "utility.clock" },
          { id: "skip-mark", kind: "SKIP_WITH_REASON", label: english ? "Skip with reason" : "Bá» qua cÃ³ lÃ½ do", iconSemanticName: "status.missed" },
        ],
      };
    case "missingAlternative":
      return {
        signalId: "signal-no-alt-1",
        targetId: "pack-check-1",
        targetType: SignalTargetType.PackCheckInstance,
        status: "ringing",
        title: english ? "Signal Ringing" : "Signal Ä‘ang reo",
        subtitle: english ? "Prepare before leaving." : "Chuáº©n bá»‹ trÆ°á»›c khi rá»i Ä‘i.",
        scheduledTimeLabel: english ? "05:20 AM" : "05:20",
        relativeStatusLabel: english ? "Now" : "BÃ¢y giá»",
        actions: [
          { id: "complete-pack", kind: "PRIMARY", label: english ? "Complete Pack" : "HoÃ n táº¥t pack", prominence: "primary", iconSemanticName: "entity.packCheck" },
          { id: "snooze-5", kind: "SNOOZE", label: english ? "Snooze 5 min" : "HoÃ£n 5 phÃºt", minutes: 5, iconSemanticName: "utility.clock" },
        ],
      };
    default:
      return {
        signalId: "signal-mark-1",
        targetId: "mark-1",
        targetType: SignalTargetType.MarkInstance,
        status: "ringing",
        title: english ? "Signal Ringing" : "Signal Ä‘ang reo",
        subtitle: english ? "Health & Body is calling." : "Health & Body Ä‘ang gá»i.",
        scheduledTimeLabel: english ? "05:30 AM" : "05:30",
        relativeStatusLabel: english ? "Now" : "BÃ¢y giá»",
        actions: [
          { id: "start-session", kind: "PRIMARY", label: english ? "Start Session" : "Báº¯t Ä‘áº§u buá»•i táº­p", prominence: "primary", iconSemanticName: "health.strength" },
          { id: "snooze-10", kind: "SNOOZE", label: english ? "Snooze 10 min" : "HoÃ£n 10 phÃºt", minutes: 10, iconSemanticName: "utility.clock" },
          { id: "substitute", kind: "ALTERNATIVE", label: english ? "Substitute" : "Thay tháº¿", iconSemanticName: "status.inProgress" },
          { id: "skip-mark", kind: "SKIP_WITH_REASON", label: english ? "Skip" : "Bá» qua", iconSemanticName: "status.missed" },
        ],
      };
  }
}

function resolveVariant(scenario: ScenarioId): SignalModeCardVariant {
  switch (scenario) {
    case "compact":
      return "compact";
    case "resolveRequired":
      return "resolveRequired";
    case "ringingMark":
      return "withPrimarySlot";
    case "resolving":
      return "withPrimarySlot";
    case "lateMissed":
      return "hero";
    default:
      return "standard";
  }
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  hint: {
    color: foundationColors.ink.secondary,
  },
});
