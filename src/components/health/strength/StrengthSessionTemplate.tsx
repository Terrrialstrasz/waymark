import { useEffect, useMemo, useRef } from "react";
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FieldJournalScreenShell } from "../../primitives/FieldJournalScreenShell";
import { WMText } from "../../primitives/Text";
import { foundationColors, semanticRadius, spacing } from "../../../theme/tokens";
import { StrengthSessionData } from "./types";
import { HealthSessionHeader } from "./HealthSessionHeader";
import { HealthSessionHero } from "./HealthSessionHero";
import { StrengthProgressRail } from "./StrengthProgressRail";
import { ExerciseAccordion } from "./ExerciseAccordion";
import { StretchSessionBlock } from "./StretchSessionBlock";
import { WorkoutCompletionSummary } from "./WorkoutCompletionSummary";
import { StrengthSessionPrimaryAction } from "./StrengthSessionPrimaryAction";
import { StrengthSessionSecondaryAction } from "./StrengthSessionSecondaryAction";
import { getStrengthSessionPrimaryAction } from "./getStrengthSessionPrimaryAction";
import { getStrengthSessionPrimaryFocusTarget } from "./getStrengthSessionPrimaryFocusTarget";
import { getHealthStrengthCopy } from "./utils";

type Props = {
  session: StrengthSessionData;
  debugActions?: StrengthSessionDebugAction[];
  onPressExercise?: (exerciseId: string) => void;
  onPressWeight?: (setId: string) => void;
  onChangeWeight?: (setId: string, value: number | null) => void;
  onPrimaryAction?: (actionType: string) => void;
  onEndSession?: () => void;
  onBack?: () => void;
  onMore?: () => void;
  onReset?: () => void;
  withShell?: boolean;
};

export type StrengthSessionDebugAction = {
  id: string;
  label: string;
  disabled?: boolean;
  onPress: () => void;
};

export function StrengthSessionTemplate({
  session,
  debugActions,
  onPressExercise,
  onPressWeight,
  onChangeWeight,
  onPrimaryAction,
  onEndSession,
  onBack,
  onMore,
  onReset,
  withShell = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const exerciseLayoutRef = useRef<Record<string, number>>({});
  const actionAnchorRef = useRef<Record<string, { y: number; height: number }>>({});
  const viewportHeightRef = useRef(0);
  const scrollYRef = useRef(0);
  const lastFocusedKeyRef = useRef<string | null>(null);
  const pendingRetryKeyRef = useRef<string | null>(null);
  const userDraggingRef = useRef(false);
  const forceFocusNextRef = useRef(false);
  const primaryAction = getStrengthSessionPrimaryAction(session);
  const copy = getHealthStrengthCopy(session.locale);
  const focusTarget = useMemo(() => getStrengthSessionPrimaryFocusTarget(session, primaryAction), [primaryAction, session]);
  const focusTargetRef = useRef(focusTarget);
  const bottomScrollClearance = Math.max(insets.bottom + spacing.xl, 112);

  focusTargetRef.current = focusTarget;

  const scrollToY = (targetY: number, animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, targetY), animated });
    });
  };

  const attemptFocusTarget = () => {
    const target = focusTargetRef.current;
    if (!target) {
      return;
    }

    if (userDraggingRef.current && !forceFocusNextRef.current) {
      return;
    }

    const anchor = actionAnchorRef.current[target.anchorKey];
    const viewportHeight = viewportHeightRef.current;
    if (!anchor || viewportHeight <= 0) {
      if (pendingRetryKeyRef.current !== target.focusKey) {
        pendingRetryKeyRef.current = target.focusKey;
        requestAnimationFrame(() => {
          if (pendingRetryKeyRef.current === target.focusKey) {
            attemptFocusTarget();
          }
        });
      }
      return;
    }

    pendingRetryKeyRef.current = null;

    const topInset = 24;
    const bottomInset = 24;
    const visibleTop = scrollYRef.current + topInset;
    const visibleBottom = scrollYRef.current + viewportHeight - bottomInset;
    const targetTop = anchor.y;
    const targetBottom = anchor.y + anchor.height;
    const fullyVisible = targetTop >= visibleTop && targetBottom <= visibleBottom;

    lastFocusedKeyRef.current = target.focusKey;
    forceFocusNextRef.current = false;

    if (fullyVisible) {
      return;
    }

    let targetY = targetTop - topInset;
    switch (target.preferredAlignment) {
      case "center":
        targetY = targetTop - Math.max(0, (viewportHeight - anchor.height) / 2);
        break;
      case "upper-middle":
        targetY = targetTop - viewportHeight * 0.28;
        break;
      case "top":
      default:
        targetY = targetTop - topInset;
        break;
    }
    scrollToY(targetY, true);
  };

  const registerActionAnchor = (anchorKey: string, y: number, height: number) => {
    actionAnchorRef.current[anchorKey] = { y, height };
    if (focusTargetRef.current?.anchorKey === anchorKey && focusTargetRef.current.focusKey !== lastFocusedKeyRef.current) {
      attemptFocusTarget();
    }
  };

  const handlePrimaryAction = (actionType: string) => {
    forceFocusNextRef.current = true;
    onPrimaryAction?.(actionType);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  };

  useEffect(() => {
    if (!focusTarget?.focusKey || focusTarget.focusKey === lastFocusedKeyRef.current) {
      return;
    }
    attemptFocusTarget();
  }, [focusTarget?.focusKey]);

  const scrollContent = (
    <View style={styles.scrollStack}>
      {session.phase !== "cooldown" && session.phase !== "complete" ? (
        <StrengthProgressRail current={session.strengthIndex} locale={session.locale} phase="strength" total={session.strengthTotal} />
      ) : null}

      {debugActions?.length ? <HealthEngineDebugActions actions={debugActions} /> : null}

      {session.phase === "cooldown" ? (
        <HealthSessionHero dayLabel={session.dayLabel} locale={session.locale} phase={session.phase} />
      ) : null}

      {session.phase === "cooldown" ? (
        <StretchSessionBlock
          onPrimaryAction={handlePrimaryAction}
          onPrimaryActionLayout={registerActionAnchor}
          primaryAction={primaryAction}
          primaryActionAnchorKey={focusTarget?.anchorKey}
          session={session}
        />
      ) : session.phase === "complete" ? (
        <View
          onLayout={(event: LayoutChangeEvent) => {
            registerActionAnchor("done:session-complete", event.nativeEvent.layout.y, event.nativeEvent.layout.height);
          }}
          style={styles.completeActionWrap}
        >
          <WorkoutCompletionSummary
            body={copy.summary.completeBody}
            exerciseCount={session.exercises.length}
            locale={session.locale}
            title={copy.summary.completeTitle}
          >
            <StrengthSessionPrimaryAction onPress={handlePrimaryAction} resolution={primaryAction} session={session} />
          </WorkoutCompletionSummary>
        </View>
      ) : (
        <View style={styles.exerciseList}>
          {buildOrderedExerciseList(session.exercises, session.activeExerciseId).map((exercise) => {
            const isExpanded = exercise.id === session.activeExerciseId || exercise.state === "active" || exercise.state === "rest";
            return (
              <View
                key={exercise.id}
                onLayout={(event: LayoutChangeEvent) => {
                  exerciseLayoutRef.current[exercise.id] = event.nativeEvent.layout.y;
                  if (focusTarget?.anchorKey && focusTarget.focusKey !== lastFocusedKeyRef.current) {
                    attemptFocusTarget();
                  }
                }}
              >
                <ExerciseAccordion
                  expanded={isExpanded}
                  exercise={exercise}
                  locale={session.locale}
                  onChangeWeight={onChangeWeight}
                  onPress={onPressExercise ? () => onPressExercise(exercise.id) : undefined}
                  onPrimaryAction={handlePrimaryAction}
                  onPrimaryActionLayout={(anchorKey, y, height) =>
                    registerActionAnchor(anchorKey, (exerciseLayoutRef.current[exercise.id] ?? 0) + y, height)
                  }
                  onPressWeight={onPressWeight}
                  primaryAction={isExpanded ? primaryAction : undefined}
                  primaryActionAnchorKey={isExpanded ? focusTarget?.anchorKey : undefined}
                  unit={session.unit}
                />
              </View>
            );
          })}
        </View>
      )}

      {session.phase !== "cooldown" &&
      session.phase !== "complete" &&
      (primaryAction.actionType === "start_cooldown" || primaryAction.actionType === "finish_session") ? (
        <View
          onLayout={(event: LayoutChangeEvent) => {
            registerActionAnchor(
              primaryAction.actionType === "start_cooldown" ? "start_cooldown:session-main" : "finish_session:cooldown-final",
              event.nativeEvent.layout.y,
              event.nativeEvent.layout.height,
            );
          }}
        >
          <WorkoutCompletionSummary
            body={primaryAction.actionType === "start_cooldown" ? copy.summary.readyBody : copy.summary.finishBody}
            exerciseCount={session.exercises.length}
            locale={session.locale}
            title={primaryAction.actionType === "start_cooldown" ? copy.summary.readyTitle : copy.summary.finishTitle}
          >
            <StrengthSessionPrimaryAction onPress={handlePrimaryAction} resolution={primaryAction} session={session} />
          </WorkoutCompletionSummary>
        </View>
      ) : null}

      {session.phase !== "complete" ? (
        <View style={styles.actionArea}>
          <StrengthSessionSecondaryAction locale={session.locale} onPress={onEndSession} />
        </View>
      ) : null}
    </View>
  );

  const content = (
    <View style={styles.screen}>
      <View style={styles.headerWrap}>
        <HealthSessionHeader mode="titleOnly" onBack={onBack} onMore={onMore} onReset={onReset} session={session} />
      </View>
      
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomScrollClearance }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        onLayout={(event: LayoutChangeEvent) => {
          viewportHeightRef.current = event.nativeEvent.layout.height;
          if (focusTarget?.focusKey && focusTarget.focusKey !== lastFocusedKeyRef.current) {
            attemptFocusTarget();
          }
        }}
        onMomentumScrollEnd={() => {
          userDraggingRef.current = false;
        }}
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          userDraggingRef.current = true;
        }}
        onScrollEndDrag={() => {
          userDraggingRef.current = false;
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {scrollContent}
      </ScrollView>
    </View>
  );

  if (!withShell) {
    return content;
  }

  return (
    <FieldJournalScreenShell contentContainerStyle={styles.shellContent} scrollable={false} variant="noBottomNav">
      {content}
    </FieldJournalScreenShell>
  );
}

const styles = StyleSheet.create({
  shellContent: {
    paddingHorizontal: 16,
  },
  screen: {
    flex: 1,
    gap: spacing.sm,
  },
  headerWrap: {
    flexShrink: 0,
    paddingTop: spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.sm,
  },
  scrollStack: {
    gap: spacing.sm,
  },
  sessionMetaStack: {
    gap: spacing.sm,
  },
  exerciseList: {
    gap: spacing.xs,
  },
  actionArea: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  completeActionWrap: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  debugPanel: {
    gap: spacing.xs,
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    borderColor: foundationColors.border.proof,
    backgroundColor: foundationColors.bg.paperWarm,
    padding: spacing.sm,
  },
  debugTitle: {
    color: foundationColors.ink.secondary,
  },
  debugButtonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  debugButton: {
    minHeight: 36,
    minWidth: 104,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: semanticRadius.button.default,
    borderWidth: 1,
    borderColor: foundationColors.green.base,
    backgroundColor: foundationColors.green.soft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  debugButtonDisabled: {
    opacity: 0.42,
  },
  debugButtonLabel: {
    color: foundationColors.ink.primary,
    textAlign: "center",
  },
});

function buildOrderedExerciseList(exercises: StrengthSessionData["exercises"], activeExerciseId?: string) {
  if (!activeExerciseId) {
    return exercises;
  }
  const activeExercise = exercises.find((exercise) => exercise.id === activeExerciseId);
  if (!activeExercise) {
    return exercises;
  }
  return [activeExercise, ...exercises.filter((exercise) => exercise.id !== activeExerciseId)];
}

function HealthEngineDebugActions({ actions }: { actions: StrengthSessionDebugAction[] }) {
  return (
    <View style={styles.debugPanel}>
      <WMText style={styles.debugTitle} variant="meta">
        Health engine test
      </WMText>
      <View style={styles.debugButtonGrid}>
        {actions.map((action) => (
          <Pressable
            accessibilityRole="button"
            disabled={action.disabled}
            key={action.id}
            onPress={action.onPress}
            style={[styles.debugButton, action.disabled ? styles.debugButtonDisabled : null]}
          >
            <WMText adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.debugButtonLabel} variant="label">
              {action.label}
            </WMText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
