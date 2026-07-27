import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { JournalCard } from "../../primitives/JournalCard";
import { CircularTimer } from "../../primitives/CircularTimer";
import { WMText } from "../../primitives/Text";
import { foundationColors, semanticRadius, spacing } from "../../../theme/tokens";
import { StrengthSessionData, StrengthPrimaryActionResolution } from "./types";
import { getActiveStretch, getHealthStrengthCopy, getNextStretch, resolveText } from "./utils";
import { StretchRow } from "./StretchRow";
import { StrengthSessionPrimaryAction } from "./StrengthSessionPrimaryAction";
import { WorkoutCompletionSummary } from "./WorkoutCompletionSummary";

type Props = {
  session: StrengthSessionData;
  primaryAction?: StrengthPrimaryActionResolution;
  primaryActionAnchorKey?: string;
  onPrimaryAction?: (actionType: StrengthPrimaryActionResolution["actionType"]) => void;
  onStretchLayout?: (stretchId: string, y: number) => void;
  onPrimaryActionLayout?: (anchorKey: string, y: number, height: number) => void;
};

export function StretchSessionBlock({
  session,
  primaryAction,
  primaryActionAnchorKey,
  onPrimaryAction,
  onStretchLayout,
  onPrimaryActionLayout,
}: Props) {
  const copy = getHealthStrengthCopy(session.locale);
  const activeStretch = getActiveStretch(session);
  const nextStretch = getNextStretch(session);
  const preview = buildStretchPreview(session, primaryAction?.actionType);

  const registerPrimaryAnchor = (event: LayoutChangeEvent) => {
    if (!primaryActionAnchorKey) {
      return;
    }
    onPrimaryActionLayout?.(primaryActionAnchorKey, event.nativeEvent.layout.y, event.nativeEvent.layout.height);
  };

  return (
    <View style={styles.block}>
      {primaryAction?.actionType === "complete_stretch" && activeStretch && session.stretchTimer ? (
        <View onLayout={registerPrimaryAnchor}>
          <JournalCard contentStyle={styles.primaryCardContent} stateTone="alive" variant="standard">
            <View style={styles.primaryHeader}>
              <WMText style={styles.kicker} variant="label">
                {copy.hero.cooldownTitle}
              </WMText>
              <WMText style={styles.primaryTitle} variant="sectionTitle">
                {resolveText(activeStretch.title, session.locale)}
              </WMText>
              <WMText style={styles.primaryMeta} variant="meta">
                {activeStretch.durationLabel}
              </WMText>
            </View>
            <View style={styles.timerPanel}>
              <WMText style={styles.timerLabel} variant="label">
                {copy.panels.stretchTimer}
              </WMText>
              <CircularTimer
                elapsedSeconds={session.stretchTimer.elapsedSeconds}
                phaseLabel={copy.states.now}
                size={148}
                state={session.stretchTimer.state}
                totalSeconds={session.stretchTimer.totalSeconds}
              />
              <View style={styles.actionWrap}>
                <StrengthSessionPrimaryAction locale={session.locale} onPress={onPrimaryAction} resolution={primaryAction} />
              </View>
            </View>
          </JournalCard>
        </View>
      ) : null}

      {primaryAction?.actionType === "start_next_stretch" && nextStretch ? (
        <View onLayout={registerPrimaryAnchor}>
          <JournalCard contentStyle={styles.primaryCardContent} stateTone="alive" variant="standard">
            <View style={styles.primaryHeader}>
              <WMText style={styles.kicker} variant="label">
                {copy.panels.nextStretchTitle}
              </WMText>
              <WMText style={styles.primaryTitle} variant="sectionTitle">
                {resolveText(nextStretch.title, session.locale)}
              </WMText>
              <WMText style={styles.primaryMeta} variant="meta">
                {nextStretch.durationLabel}
              </WMText>
            </View>
            <View style={styles.actionWrap}>
              <StrengthSessionPrimaryAction locale={session.locale} onPress={onPrimaryAction} resolution={primaryAction} />
            </View>
          </JournalCard>
        </View>
      ) : null}

      {primaryAction?.actionType === "finish_session" ? (
        <View onLayout={registerPrimaryAnchor}>
          <WorkoutCompletionSummary body={copy.summary.finishBody} locale={session.locale} title={copy.summary.finishTitle}>
            <StrengthSessionPrimaryAction locale={session.locale} onPress={onPrimaryAction} resolution={primaryAction} />
          </WorkoutCompletionSummary>
        </View>
      ) : null}

      {preview.length > 0 ? (
        <JournalCard contentStyle={styles.previewCardContent} variant="readOnly">
          <View style={styles.previewStack}>
            {preview.map((stretch) => (
              <View
                key={stretch.id}
                onLayout={(event: LayoutChangeEvent) => {
                  onStretchLayout?.(stretch.id, event.nativeEvent.layout.y);
                }}
                style={styles.previewRow}
              >
                <StretchRow item={stretch} locale={session.locale} />
              </View>
            ))}
          </View>
        </JournalCard>
      ) : null}
    </View>
  );
}

function buildStretchPreview(session: StrengthSessionData, actionType?: StrengthPrimaryActionResolution["actionType"]) {
  const completed = session.stretches.filter((stretch) => stretch.state === "done");
  const upcoming = session.stretches.filter((stretch) => stretch.state === "upcoming");

  switch (actionType) {
    case "complete_stretch": {
      const nextReady = session.stretches.find((stretch) => stretch.state === "next");
      return [...completed.slice(-2), ...(nextReady ? [nextReady] : []), ...upcoming.slice(0, 2)];
    }
    case "start_next_stretch":
      return [...completed.slice(-2), ...upcoming.slice(0, 3)];
    case "finish_session":
      return completed.slice(-3);
    default:
      return session.stretches.slice(0, 4);
  }
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
  },
  primaryCardContent: {
    gap: spacing.sm,
    paddingVertical: 14,
  },
  primaryHeader: {
    gap: 4,
  },
  kicker: {
    color: foundationColors.ink.secondary,
  },
  primaryTitle: {
    color: foundationColors.ink.primary,
  },
  primaryMeta: {
    color: foundationColors.ink.secondary,
  },
  timerPanel: {
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.bg.paperWarm,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: spacing.xs,
  },
  timerLabel: {
    alignSelf: "flex-start",
    color: foundationColors.ink.secondary,
  },
  actionWrap: {
    marginTop: spacing.xs,
    width: "100%",
  },
  previewCardContent: {
    gap: spacing.xs,
    paddingVertical: 12,
  },
  previewStack: {
    gap: spacing.xs,
  },
  previewRow: {
    gap: spacing.xs,
  },
});
