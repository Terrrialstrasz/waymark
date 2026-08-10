import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import {
  GolfClub,
  GolfPracticeMode,
  GolfPuttingSetInput,
  GolfRepResult,
  GolfShortGameSetInput,
  GolfShortGameSetPlan,
  GolfShotType,
  GolfSwingSetInput,
  GolfWorkoutType,
  SaveGolfPracticeLogInput,
} from "../../types/golfPractice";
import type { GolfProgramPracticePlan, GolfProgramSetPlan } from "../../config/golfProgramCatalog";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { Divider } from "../primitives/Divider";
import { JournalCard } from "../primitives/JournalCard";
import { PageHeader } from "../primitives/PageHeader";
import { WMButton } from "../primitives/WMButton";
import { WMText } from "../primitives/Text";
import { WaymarkIcon } from "../primitives/WaymarkIcon";

type GolfPhase = "warmup" | "revision" | "practice" | "complete";

type Props = {
  locale: Locale;
  initialWorkoutType?: GolfWorkoutType;
  workoutTypeLocked?: boolean;
  saving?: boolean;
  reviewOnly?: boolean;
  reviewTitle?: string;
  shortGamePlan?: GolfShortGameSetPlan[] | null;
  swingPlan?: GolfProgramPracticePlan | null;
  onBack?: () => void;
  onSave?: (input: SaveGolfPracticeLogInput) => void;
};

type Option<T extends string> = {
  value: T;
  label: string;
};

type SwingSetDraft = {
  key: string;
  setNumber: number;
  setRole: "revision" | "practice";
  programWeek?: number;
  sourceWeek?: number;
  skillTitle?: string;
  reps: number;
  club: GolfClub;
  clubs?: GolfClub[];
  shotType: GolfShotType;
  practiceMode: GolfPracticeMode;
  distanceValues: string[];
  coachScores: string[];
};

type GolfExerciseState = "done" | "active" | "upcoming";

const WARMUP_EXERCISES = [
  "Neck rolls + shoulder rolls",
  "Wrist circles + grip squeeze",
  "Hip hinge into golf posture",
  "Torso rotation in golf stance",
  "Left-right weight shift",
  "Slow practice swings",
] as const;

const PUTTING_DISTANCES = [60, 90, 120, 150, 180] as const;
const SWING_REPS_PER_SET = 10;
const CLUB_OPTIONS: Option<GolfClub>[] = [
  { value: "snag_launcher", label: "SNAG Launcher" },
  { value: "snag_roller", label: "SNAG Roller" },
  { value: "snag_snapper", label: "SNAG Snapper" },
  { value: "sand_wedge", label: "Sand Wedge" },
  { value: "pitching_wedge", label: "Pitching Wedge" },
  { value: "iron_9", label: "9 Iron" },
  { value: "iron_8", label: "8 Iron" },
  { value: "iron_7", label: "7 Iron" },
  { value: "iron_6", label: "6 Iron" },
  { value: "hybrid", label: "Hybrid" },
  { value: "fairway_wood", label: "Fairway Wood" },
  { value: "driver", label: "Driver" },
];
const SHOT_OPTIONS: Option<GolfShotType>[] = [
  { value: "chip", label: "Chip" },
  { value: "pitch", label: "Pitch" },
  { value: "full_swing", label: "Full swing" },
];
const MODE_OPTIONS: Option<GolfPracticeMode>[] = [
  { value: "distance", label: "Distance" },
  { value: "form", label: "Form" },
];

function parseNonNegativeNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function makePuttingState() {
  return Object.fromEntries(PUTTING_DISTANCES.map((distance) => [distance, Array.from({ length: 10 }, () => null)])) as Record<
    number,
    Array<GolfRepResult | null>
  >;
}

function makeShortGameState(plan: GolfShortGameSetPlan[] | null | undefined) {
  return Object.fromEntries((plan ?? []).map((set) => [set.setNumber, Array.from({ length: set.reps }, () => null)])) as Record<
    number,
    Array<GolfRepResult | null>
  >;
}

function makeSwingSetDraft(plan: GolfProgramSetPlan): SwingSetDraft {
  return {
    key: `${plan.role}-${plan.sourceWeek}-${plan.setNumber}`,
    setNumber: plan.setNumber,
    setRole: plan.role,
    programWeek: plan.programWeek,
    sourceWeek: plan.sourceWeek,
    skillTitle: plan.title,
    reps: plan.reps,
    club: plan.clubs[0] ?? "snag_launcher",
    clubs: plan.clubs,
    shotType: plan.shotType,
    practiceMode: plan.practiceMode,
    distanceValues: Array.from({ length: plan.reps }, () => ""),
    coachScores: Array.from({ length: plan.reps }, () => ""),
  };
}

function makeSwingSets(plan?: GolfProgramPracticePlan | null): SwingSetDraft[] {
  if (plan) {
    return [...plan.revisionSets, ...plan.practiceSets].map(makeSwingSetDraft);
  }
  return [1, 2, 3].map((setNumber) => ({
    key: `practice-legacy-${setNumber}`,
    setNumber,
    setRole: "practice" as const,
    reps: SWING_REPS_PER_SET,
    club: "snag_launcher" as const,
    clubs: ["snag_launcher" as const],
    shotType: "chip" as const,
    practiceMode: "distance" as const,
    distanceValues: Array.from({ length: SWING_REPS_PER_SET }, () => ""),
    coachScores: Array.from({ length: SWING_REPS_PER_SET }, () => ""),
  }));
}

function makeSwingCompletedState(sets: SwingSetDraft[]) {
  return Object.fromEntries(sets.map((set) => [set.key, false])) as Record<string, boolean>;
}

export function GolfPracticeSessionTemplate({
  locale,
  initialWorkoutType = "putting",
  workoutTypeLocked = false,
  saving = false,
  reviewOnly = false,
  reviewTitle,
  shortGamePlan = null,
  swingPlan = null,
  onBack,
  onSave,
}: Props) {
  const [workoutType, setWorkoutType] = useState<GolfWorkoutType>(initialWorkoutType);
  const [phase, setPhase] = useState<GolfPhase>("warmup");
  const [warmupCompleted, setWarmupCompleted] = useState<boolean[]>(() => WARMUP_EXERCISES.map(() => false));
  const [puttingResults, setPuttingResults] = useState<Record<number, Array<GolfRepResult | null>>>(makePuttingState);
  const [shortGameResults, setShortGameResults] = useState<Record<number, Array<GolfRepResult | null>>>(() => makeShortGameState(shortGamePlan));
  const [swingSets, setSwingSets] = useState<SwingSetDraft[]>(() => makeSwingSets(swingPlan));
  const [swingCompleted, setSwingCompleted] = useState<Record<string, boolean>>(() => makeSwingCompletedState(makeSwingSets(swingPlan)));
  const [note, setNote] = useState("");
  const scrollViewRef = useRef<ScrollView | null>(null);
  const warmupLayoutRef = useRef<Record<number, { y: number; height: number }>>({});
  const practiceLayoutRef = useRef<Record<number, { y: number; height: number }>>({});
  const inputLayoutRef = useRef<Record<string, { y: number; height: number }>>({});
  const viewportHeightRef = useRef(0);
  const scrollYRef = useRef(0);
  const warmupFocusKeyRef = useRef<string | null>(null);
  const practiceFocusKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setWorkoutType(initialWorkoutType);
  }, [initialWorkoutType]);

  const shortGamePlanKey = useMemo(
    () => (shortGamePlan ?? []).map((set) => `${set.setNumber}:${set.label}:${set.reps}`).join("|"),
    [shortGamePlan],
  );
  useEffect(() => {
    setShortGameResults(makeShortGameState(shortGamePlan));
  }, [shortGamePlanKey]);

  const swingPlanKey = useMemo(
    () =>
      swingPlan
        ? `${swingPlan.programWeek}:${swingPlan.revisionSets.length}:${swingPlan.practiceSets.length}:${swingPlan.title}`
        : "legacy",
    [swingPlan],
  );
  useEffect(() => {
    const nextSets = makeSwingSets(swingPlan);
    setSwingSets(nextSets);
    setSwingCompleted(makeSwingCompletedState(nextSets));
  }, [swingPlanKey]);

  const warmupDone = warmupCompleted.every(Boolean);
  const warmupActiveIndex = Math.max(0, warmupCompleted.findIndex((done) => !done));
  const shortGameActive = workoutType === "putting" && Boolean(shortGamePlan?.length);
  const revisionSwingSets = useMemo(() => swingSets.filter((set) => set.setRole === "revision"), [swingSets]);
  const practiceSwingSets = useMemo(() => swingSets.filter((set) => set.setRole === "practice"), [swingSets]);
  const puttingSets = useMemo<GolfPuttingSetInput[]>(
    () =>
      PUTTING_DISTANCES.map((distanceCm) => {
        const results = puttingResults[distanceCm] ?? [];
        const repResults = results.filter((result): result is GolfRepResult => result === "hit" || result === "miss");
        const hits = repResults.filter((result) => result === "hit").length;
        const misses = repResults.filter((result) => result === "miss").length;
        return { distanceCm, reps: results.length || 10, hits, misses, repResults };
      }),
    [puttingResults],
  );
  const shortGameSets = useMemo<GolfShortGameSetInput[]>(
    () =>
      (shortGamePlan ?? []).map((planSet) => {
        const results = shortGameResults[planSet.setNumber] ?? Array.from({ length: planSet.reps }, () => null);
        const repResults = results.filter((result): result is GolfRepResult => result === "hit" || result === "miss");
        const hits = repResults.filter((result) => result === "hit").length;
        const misses = repResults.filter((result) => result === "miss").length;
        return { ...planSet, hits, misses, repResults };
      }),
    [shortGamePlan, shortGameResults],
  );
  const swingSetInputs = useMemo<GolfSwingSetInput[]>(
    () =>
      swingSets.map((set) => {
        const distancesYards = set.distanceValues
          .map(parseNonNegativeNumber)
          .filter((value): value is number => typeof value === "number");
        const formScores = set.coachScores
          .map(parseNonNegativeNumber)
          .filter((value): value is number => typeof value === "number");
        const averageFormScore = formScores.length ? formScores.reduce((total, value) => total + value, 0) / formScores.length : undefined;
        return {
          setNumber: set.setNumber,
          setRole: set.setRole,
          programWeek: set.programWeek,
          sourceWeek: set.sourceWeek,
          skillTitle: set.skillTitle,
          reps: set.reps,
          club: set.club,
          clubs: set.clubs,
          shotType: set.shotType,
          practiceMode: set.practiceMode,
          distancesYards: set.practiceMode === "distance" ? distancesYards : undefined,
          formScores: set.practiceMode === "form" ? formScores : undefined,
          coachScore: set.practiceMode === "form" ? averageFormScore : undefined,
        };
      }),
    [swingSets],
  );
  const revisionDone = workoutType !== "swing" || revisionSwingSets.length === 0 || revisionSwingSets.every((set) => swingCompleted[set.key]);
  const practiceSwingDone = practiceSwingSets.every((set) => swingCompleted[set.key]);
  const practiceDone =
    workoutType === "putting"
      ? shortGameActive
        ? shortGameSets.every((set) => set.repResults?.length === set.reps)
        : puttingSets.every((set) => set.repResults?.length === set.reps)
      : revisionDone && practiceSwingDone;
  const canSave = warmupDone && practiceDone && !saving;
  const activePracticeIndex =
    workoutType === "putting"
      ? Math.max(0, (shortGameActive ? shortGameSets : puttingSets).findIndex((set) => set.repResults?.length !== set.reps))
      : Math.max(
          0,
          practiceSwingSets.findIndex((set) => !swingCompleted[set.key]),
        );
  const activeRevisionIndex = Math.max(
    0,
    revisionSwingSets.findIndex((set) => !swingCompleted[set.key]),
  );
  const progressTotal =
    phase === "warmup" ? WARMUP_EXERCISES.length
    : phase === "revision" ? revisionSwingSets.length || 1
    : phase === "practice" ? workoutType === "putting" ? shortGameActive ? shortGameSets.length : PUTTING_DISTANCES.length : practiceSwingSets.length
    : 1;
  const progressCurrent =
    phase === "warmup" ? Math.min(warmupActiveIndex + 1, WARMUP_EXERCISES.length)
    : phase === "revision" ? revisionDone ? progressTotal : activeRevisionIndex + 1
    : phase === "practice" ? practiceDone ? progressTotal : activePracticeIndex + 1
    : phase === "complete" ? 1
    : 1;
  const progressLabel =
    phase === "warmup" ? "Warm-up"
    : phase === "revision" ? "Revision"
    : phase === "practice" ? workoutType === "putting" ? "Short Game" : "Swing"
    : "Complete";

  const updateSwingSet = (key: string, patch: Partial<SwingSetDraft>) => {
    setSwingCompleted((current) => ({ ...current, [key]: false }));
    setSwingSets((current) => current.map((set) => (set.key === key ? { ...set, ...patch } : set)));
  };

  const updatePuttingRep = (distanceCm: number, repIndex: number, result: GolfRepResult) => {
    setPuttingResults((current) => {
      const nextResults = [...(current[distanceCm] ?? Array.from({ length: 10 }, () => null))];
      nextResults[repIndex] = nextResults[repIndex] === result ? null : result;
      return { ...current, [distanceCm]: nextResults };
    });
  };

  const updateShortGameRep = (setNumber: number, reps: number, repIndex: number, result: GolfRepResult) => {
    setShortGameResults((current) => {
      const nextResults = [...(current[setNumber] ?? Array.from({ length: reps }, () => null))];
      nextResults[repIndex] = nextResults[repIndex] === result ? null : result;
      return { ...current, [setNumber]: nextResults };
    });
  };

  const updateSwingRep = (key: string, repIndex: number, value: string) => {
    setSwingCompleted((current) => ({ ...current, [key]: false }));
    setSwingSets((current) =>
      current.map((set) => {
        if (set.key !== key) {
          return set;
        }
        const valueKey = set.practiceMode === "distance" ? "distanceValues" : "coachScores";
        const values = [...set[valueKey]];
        values[repIndex] = value;
        return { ...set, [valueKey]: values };
      }),
    );
  };

  const completeSwingSet = (key: string) => {
    setSwingCompleted((current) => ({ ...current, [key]: true }));
  };

  const focusActiveWarmup = (retryCount = 0) => {
    if (phase !== "warmup" || warmupDone) {
      return;
    }

    const cardLayout = warmupLayoutRef.current[warmupActiveIndex];
    const viewportHeight = viewportHeightRef.current;
    if (!cardLayout || viewportHeight <= 0) {
      if (retryCount < 6) {
        requestAnimationFrame(() => focusActiveWarmup(retryCount + 1));
      }
      return;
    }

    const topInset = 12;
    const targetY = Math.max(0, cardLayout.y - topInset);

    if (Math.abs(scrollYRef.current - targetY) <= 4) {
      return;
    }

    scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
  };

  const focusActivePractice = (retryCount = 0) => {
    if (phase !== "practice" || practiceDone) {
      return;
    }

    const cardLayout = practiceLayoutRef.current[activePracticeIndex];
    const viewportHeight = viewportHeightRef.current;
    if (!cardLayout || viewportHeight <= 0) {
      if (retryCount < 6) {
        requestAnimationFrame(() => focusActivePractice(retryCount + 1));
      }
      return;
    }

    const topInset = 12;
    const targetY = Math.max(0, cardLayout.y - topInset);

    if (Math.abs(scrollYRef.current - targetY) <= 4) {
      return;
    }

    scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
  };

  const focusInputField = (inputKey: string, retryCount = 0) => {
    const inputLayout = inputLayoutRef.current[inputKey];
    const viewportHeight = viewportHeightRef.current;
    if (!inputLayout || viewportHeight <= 0) {
      if (retryCount < 6) {
        requestAnimationFrame(() => focusInputField(inputKey, retryCount + 1));
      }
      return;
    }

    const targetY = Math.max(0, inputLayout.y - viewportHeight * 0.32);
    if (Math.abs(scrollYRef.current - targetY) <= 4) {
      return;
    }
    scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
  };

  useEffect(() => {
    const focusKey = `${phase}:${warmupActiveIndex}:${warmupDone ? "done" : "active"}`;
    if (phase !== "warmup" || warmupDone || warmupFocusKeyRef.current === focusKey) {
      return;
    }
    warmupFocusKeyRef.current = focusKey;
    requestAnimationFrame(() => focusActiveWarmup());
  }, [phase, warmupActiveIndex, warmupDone]);

  useEffect(() => {
    const focusKey = `${phase}:${workoutType}:${activePracticeIndex}:${practiceDone ? "done" : "active"}`;
    if (phase !== "practice" || practiceDone || practiceFocusKeyRef.current === focusKey) {
      return;
    }
    practiceFocusKeyRef.current = focusKey;
    requestAnimationFrame(() => focusActivePractice());
  }, [phase, workoutType, activePracticeIndex, practiceDone]);

  const handleSave = () => {
    if (!canSave || !onSave) {
      return;
    }
    onSave({
      workoutType,
      warmupCompleted: true,
      puttingSets: workoutType === "putting" && !shortGameActive ? puttingSets : undefined,
      shortGameSets: workoutType === "putting" && shortGameActive ? shortGameSets : undefined,
      swingSets: workoutType === "swing" ? swingSetInputs : undefined,
      note: note.trim() || undefined,
    });
    setPhase("complete");
  };

  if (reviewOnly) {
    return (
      <GolfPracticeReview
        locale={locale}
        onBack={onBack}
        reviewTitle={reviewTitle}
        shortGamePlan={shortGamePlan}
        swingPlan={swingPlan}
        workoutType={initialWorkoutType}
      />
    );
  }

  return (
    <FieldJournalScreenShell contentContainerStyle={styles.shellContent} scrollable={false} variant="noBottomNav">
      <View style={styles.screen}>
        <PageHeader onBack={onBack} showBack subtitle="Golf Craft" title="Golf Practice" variant="withBack" />
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onLayout={(event: LayoutChangeEvent) => {
            viewportHeightRef.current = event.nativeEvent.layout.height;
          }}
          onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <SegmentedControl
            disabled={workoutTypeLocked || phase !== "warmup"}
            options={[
              { value: "putting", label: "Short Game" },
              { value: "swing", label: "Swing" },
            ]}
            value={workoutType}
            onChange={setWorkoutType}
          />
          <GolfProgressRail current={progressCurrent} label={progressLabel} total={progressTotal} />

          {phase === "warmup" ? (
            <View style={styles.exerciseList}>
              {WARMUP_EXERCISES.map((item, index) => (
                <View
                  key={item}
                  onLayout={(event: LayoutChangeEvent) => {
                    warmupLayoutRef.current[index] = event.nativeEvent.layout;
                  }}
                >
                  <GolfWarmupAccordion
                    completed={warmupCompleted[index] ?? false}
                    expanded={index === warmupActiveIndex && !warmupDone}
                    index={index}
                    title={item}
                    onComplete={() => setWarmupCompleted((current) => current.map((done, doneIndex) => (doneIndex === index ? true : done)))}
                    onUndo={() => setWarmupCompleted((current) => current.map((done, doneIndex) => (doneIndex === index ? false : done)))}
                  />
                </View>
              ))}
              <View style={styles.footerAction}>
                <WMButton
                  disabled={!warmupDone}
                  fullWidth
                  label={revisionSwingSets.length > 0 && workoutType === "swing" ? "Continue to revision" : "Continue to practice"}
                  onPress={() => setPhase(revisionSwingSets.length > 0 && workoutType === "swing" ? "revision" : "practice")}
                  variant="primary"
                />
              </View>
            </View>
          ) : null}

          {phase === "revision" && workoutType === "swing" ? (
            <View style={styles.exerciseList}>
              {revisionSwingSets.map((set, index) => {
                const values = set.practiceMode === "distance" ? set.distanceValues : set.coachScores;
                const readyToComplete = values.every((value) => typeof parseNonNegativeNumber(value) === "number");
                const completed = swingCompleted[set.key] ?? false;
                return (
                  <View
                    key={set.key}
                    onLayout={(event: LayoutChangeEvent) => {
                      practiceLayoutRef.current[index] = event.nativeEvent.layout;
                    }}
                  >
                    <GolfSwingAccordion
                      completed={completed}
                      readyToComplete={readyToComplete}
                      expanded={!revisionDone && index === activeRevisionIndex}
                      set={set}
                      totalSets={revisionSwingSets.length}
                      onChange={(patch) => updateSwingSet(set.key, patch)}
                      onComplete={() => completeSwingSet(set.key)}
                      onChangeRep={(repIndex, value) => updateSwingRep(set.key, repIndex, value)}
                      onFocusRepInput={(repIndex) => requestAnimationFrame(() => focusInputField(`swing-${set.key}-${repIndex}`))}
                      onLayoutRepInput={(repIndex, event) => {
                        inputLayoutRef.current[`swing-${set.key}-${repIndex}`] = {
                          y: (practiceLayoutRef.current[index]?.y ?? 0) + event.nativeEvent.layout.y,
                          height: event.nativeEvent.layout.height,
                        };
                      }}
                    />
                  </View>
                );
              })}
              <View style={styles.footerAction}>
                <WMButton disabled={!revisionDone} fullWidth label="Continue to practice" onPress={() => setPhase("practice")} variant="primary" />
              </View>
            </View>
          ) : null}

          {phase === "practice" && workoutType === "putting" ? (
            <View style={styles.exerciseList}>
              {shortGameActive ? shortGameSets.map((set, index) => {
                const results = shortGameResults[set.setNumber] ?? Array.from({ length: set.reps }, () => null);
                const completed = results.every(Boolean);
                return (
                  <View
                    key={set.setNumber}
                    onLayout={(event: LayoutChangeEvent) => {
                      practiceLayoutRef.current[index] = event.nativeEvent.layout;
                      if (phase === "practice" && workoutType === "putting" && index === activePracticeIndex && !practiceDone) {
                        requestAnimationFrame(() => focusActivePractice());
                      }
                    }}
                  >
                    <GolfShortGameAccordion
                      completed={completed}
                      expanded={index === activePracticeIndex && !practiceDone}
                      index={index}
                      results={results}
                      set={set}
                      totalSets={shortGameSets.length}
                      onChangeRep={(repIndex, result) => updateShortGameRep(set.setNumber, set.reps, repIndex, result)}
                    />
                  </View>
                );
              }) : PUTTING_DISTANCES.map((distance, index) => {
                const results = puttingResults[distance] ?? [];
                const completed = results.every(Boolean);
                return (
                  <View
                    key={distance}
                    onLayout={(event: LayoutChangeEvent) => {
                      practiceLayoutRef.current[index] = event.nativeEvent.layout;
                      if (phase === "practice" && workoutType === "putting" && index === activePracticeIndex && !practiceDone) {
                        requestAnimationFrame(() => focusActivePractice());
                      }
                    }}
                  >
                    <GolfPuttingAccordion
                      completed={completed}
                      distance={distance}
                      expanded={index === activePracticeIndex && !practiceDone}
                      index={index}
                      results={results}
                      onChangeRep={(repIndex, result) => updatePuttingRep(distance, repIndex, result)}
                    />
                  </View>
                );
              })}
            </View>
          ) : null}

          {phase === "practice" && workoutType === "swing" ? (
            <View style={styles.exerciseList}>
              {practiceSwingSets.map((set, index) => {
                const values = set.practiceMode === "distance" ? set.distanceValues : set.coachScores;
                const readyToComplete = values.every((value) => typeof parseNonNegativeNumber(value) === "number");
                const completed = swingCompleted[set.key] ?? false;
                return (
                  <View
                    key={set.key}
                    onLayout={(event: LayoutChangeEvent) => {
                      practiceLayoutRef.current[index] = event.nativeEvent.layout;
                      if (phase === "practice" && workoutType === "swing" && index === activePracticeIndex && !practiceDone) {
                        requestAnimationFrame(() => focusActivePractice());
                      }
                    }}
                  >
                    <GolfSwingAccordion
                      completed={completed}
                      readyToComplete={readyToComplete}
                      expanded={index === activePracticeIndex && !practiceDone}
                      set={set}
                      totalSets={practiceSwingSets.length}
                      onChange={(patch) => updateSwingSet(set.key, patch)}
                      onComplete={() => completeSwingSet(set.key)}
                      onChangeRep={(repIndex, value) => updateSwingRep(set.key, repIndex, value)}
                      onFocusRepInput={(repIndex) => requestAnimationFrame(() => focusInputField(`swing-${set.key}-${repIndex}`))}
                      onLayoutRepInput={(repIndex, event) => {
                        inputLayoutRef.current[`swing-${set.key}-${repIndex}`] = {
                          y: (practiceLayoutRef.current[index]?.y ?? 0) + event.nativeEvent.layout.y,
                          height: event.nativeEvent.layout.height,
                        };
                      }}
                    />
                  </View>
                );
              })}
            </View>
          ) : null}

          {phase === "practice" ? (
            <>
              <View
                onLayout={(event: LayoutChangeEvent) => {
                  inputLayoutRef.current["session-note"] = event.nativeEvent.layout;
                }}
                style={styles.section}
              >
                <WMText variant="sectionTitle">Session note</WMText>
                <View>
                  <TextInput
                    multiline
                    onChangeText={setNote}
                    onFocus={() => requestAnimationFrame(() => focusInputField("session-note"))}
                    placeholder="Optional note"
                    placeholderTextColor={foundationColors.ink.tertiary}
                    style={[styles.textInput, styles.noteInput]}
                    value={note}
                  />
                </View>
              </View>
              <View style={styles.footerAction}>
                <WMButton disabled={!canSave} fullWidth label={saving ? "Saving..." : "Finish practice"} onPress={handleSave} variant="primary" />
              </View>
            </>
          ) : null}

          {phase === "complete" ? (
            <View style={styles.section}>
              <WMText variant="sectionTitle">Practice complete</WMText>
              <WMText style={styles.meta} variant="body">
                Your golf practice has been logged. Nice work today.
              </WMText>
              <View style={styles.footerAction}>
                <WMButton fullWidth label="Back" onPress={onBack} variant="primary" />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </FieldJournalScreenShell>
  );
}

function GolfPracticeReview({
  locale,
  onBack,
  reviewTitle,
  shortGamePlan,
  swingPlan,
  workoutType,
}: {
  locale: Locale;
  onBack?: () => void;
  reviewTitle?: string;
  shortGamePlan?: GolfShortGameSetPlan[] | null;
  swingPlan?: GolfProgramPracticePlan | null;
  workoutType: GolfWorkoutType;
}) {
  const swingSets = swingPlan ? [...swingPlan.revisionSets, ...swingPlan.practiceSets] : [];
  return (
    <FieldJournalScreenShell contentContainerStyle={styles.shellContent} variant="navAware">
      <PageHeader
        onBack={onBack}
        showBack
        subtitle={workoutType === "putting" ? "Short Game" : "Swing"}
        title={reviewTitle ?? swingPlan?.title ?? "Golf Practice"}
        variant="withBack"
      />
      <View style={styles.reviewBanner}>
        <WMText style={styles.reviewBannerTitle} variant="label">Review only</WMText>
        <WMText style={styles.reviewBannerBody} variant="bodySm">
          {locale === "vi"
            ? "Mo tu Weekly Timetable. Buoi tap golf nay khong duoc tinh vao progress."
            : "Opened from Weekly Timetable. This golf session is not counted toward progress."}
        </WMText>
      </View>

      <ReviewList title="Warm-up" items={WARMUP_EXERCISES.map((title) => ({ title }))} />
      {workoutType === "putting" ? (
        <ReviewList
          title="Short Game"
          items={
            shortGamePlan?.length
              ? shortGamePlan.map((set) => ({ title: set.label, detail: `${set.reps} reps` }))
              : PUTTING_DISTANCES.map((distance) => ({ title: `${distance} cm`, detail: "10 putts" }))
          }
        />
      ) : (
        <ReviewList
          title={swingPlan?.title ?? "Swing plan"}
          items={swingSets.map((set) => ({
            title: set.title,
            detail: `${set.role === "revision" ? "Revision" : "Practice"} · ${set.reps} reps · ${set.clubs.join(", ")} · ${set.practiceMode}`,
          }))}
        />
      )}
    </FieldJournalScreenShell>
  );
}

function ReviewList({ title, items }: { title: string; items: Array<{ title: string; detail?: string }> }) {
  return (
    <View style={styles.reviewSection}>
      <WMText variant="sectionTitle">{title}</WMText>
      {items.map((item, index) => (
        <JournalCard contentStyle={styles.reviewCard} key={`${title}:${index}:${item.title}`} variant="nested">
          <WMText variant="bodyStrong">{item.title}</WMText>
          {item.detail ? <WMText style={styles.reviewDetail} variant="bodySm">{item.detail}</WMText> : null}
        </JournalCard>
      ))}
    </View>
  );
}

function GolfProgressRail({ label, current, total }: { label: string; current: number; total: number }) {
  return (
    <View style={styles.progressRow}>
      <WMText style={styles.progressLabel} variant="bodySm">
        {label} {current} of {total}
      </WMText>
      <View style={styles.progressRail}>
        {Array.from({ length: total }, (_, index) => {
          const position = index + 1;
          const isCompleted = position < current;
          const isActive = position === current;
          return (
            <View
              key={`${label}-${position}`}
              style={[
                styles.progressSegment,
                isActive ? styles.progressSegmentActive : isCompleted ? styles.progressSegmentDone : null,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

function GolfWarmupAccordion({
  index,
  title,
  completed,
  expanded,
  onComplete,
  onUndo,
}: {
  index: number;
  title: string;
  completed: boolean;
  expanded: boolean;
  onComplete: () => void;
  onUndo: () => void;
}) {
  return (
    <GolfExerciseCard completed={completed} expanded={expanded} index={index} prescription="1 x 10 reps" title={title}>
      <GolfSetRow active completed={completed} label="10 reps" meta={completed ? "Done" : "Current"} number={1} />
      <View style={styles.actionWrap}>
        <WMButton label={completed ? "Undo set" : "Complete Set 1 of 1"} onPress={completed ? onUndo : onComplete} variant={completed ? "secondary" : "primary"} />
      </View>
    </GolfExerciseCard>
  );
}

function GolfPuttingAccordion({
  index,
  distance,
  results,
  completed,
  expanded,
  onChangeRep,
}: {
  index: number;
  distance: number;
  results: Array<GolfRepResult | null>;
  completed: boolean;
  expanded: boolean;
  onChangeRep: (repIndex: number, result: GolfRepResult) => void;
}) {
  const recorded = results.filter(Boolean).length;
  const hits = results.filter((result) => result === "hit").length;
  const misses = results.filter((result) => result === "miss").length;
  return (
    <GolfExerciseCard completed={completed} expanded={expanded} index={index} prescription="1 x 10 putts" title={`Putting ${distance} cm`}>
      <GolfSetRow active completed={completed} label="10 putts" meta={completed ? `${hits} hit / ${misses} miss` : `${recorded}/10 recorded`} number={1} />
      <View style={styles.repList}>
        {results.map((result, repIndex) => (
          <GolfPuttingRepRow
            key={`${distance}-${repIndex}`}
            number={repIndex + 1}
            result={result}
            onSelect={(nextResult) => onChangeRep(repIndex, nextResult)}
          />
        ))}
      </View>
    </GolfExerciseCard>
  );
}

function GolfShortGameAccordion({
  index,
  set,
  totalSets,
  results,
  completed,
  expanded,
  onChangeRep,
}: {
  index: number;
  set: GolfShortGameSetInput;
  totalSets: number;
  results: Array<GolfRepResult | null>;
  completed: boolean;
  expanded: boolean;
  onChangeRep: (repIndex: number, result: GolfRepResult) => void;
}) {
  const recorded = results.filter(Boolean).length;
  const hits = results.filter((result) => result === "hit").length;
  const misses = results.filter((result) => result === "miss").length;
  const zoneCopy = set.landingZoneLabel ? ` · Zone ${set.landingZoneLabel}` : "";
  return (
    <GolfExerciseCard completed={completed} expanded={expanded} index={index} prescription={`Set ${set.setNumber}/${totalSets} · ${set.reps} chips`} title={`Chipping ${set.label}`}>
      <GolfSetRow
        active
        completed={completed}
        label={`${set.reps} chips`}
        meta={completed ? `${hits} hit / ${misses} miss` : `${recorded}/${set.reps} recorded${zoneCopy}`}
        number={set.setNumber}
      />
      {set.note ? (
        <WMText style={styles.meta} variant="bodySm">
          {set.note}
        </WMText>
      ) : null}
      <View style={styles.repList}>
        {results.map((result, repIndex) => (
          <GolfPuttingRepRow
            key={`${set.setNumber}-${repIndex}`}
            number={repIndex + 1}
            result={result}
            onSelect={(nextResult) => onChangeRep(repIndex, nextResult)}
          />
        ))}
      </View>
    </GolfExerciseCard>
  );
}

function GolfSwingAccordion({
  set,
  completed,
  readyToComplete,
  expanded,
  totalSets,
  onChange,
  onComplete,
  onChangeRep,
  onFocusRepInput,
  onLayoutRepInput,
}: {
  set: SwingSetDraft;
  completed: boolean;
  readyToComplete: boolean;
  expanded: boolean;
  totalSets: number;
  onChange: (patch: Partial<SwingSetDraft>) => void;
  onComplete: () => void;
  onChangeRep: (repIndex: number, value: string) => void;
  onFocusRepInput: (repIndex: number) => void;
  onLayoutRepInput: (repIndex: number, event: LayoutChangeEvent) => void;
}) {
  const club = formatClubPlan(set.clubs?.length ? set.clubs : [set.club], set.reps);
  const shot = SHOT_OPTIONS.find((option) => option.value === set.shotType)?.label ?? "Shot";
  const mode = MODE_OPTIONS.find((option) => option.value === set.practiceMode)?.label ?? "Record";
  const values = set.practiceMode === "distance" ? set.distanceValues : set.coachScores;
  const recorded = values.filter((value) => typeof parseNonNegativeNumber(value) === "number").length;
  const roleLabel = set.setRole === "revision" ? "Revision" : "Practice";
  const title = set.skillTitle ? `${roleLabel}: ${set.skillTitle}` : `Swing Set ${set.setNumber}`;
  return (
    <GolfExerciseCard completed={completed} expanded={expanded} index={set.setNumber - 1} prescription={`${set.reps} reps - ${club} / ${shot} / ${mode}`} title={title}>
      <GolfSetRow active completed={completed} label={`${set.reps} reps`} meta={completed ? "Recorded" : `${recorded}/${set.reps} recorded`} number={set.setNumber}>
        <View style={styles.inlineDropdownRow}>
          <Dropdown compact label="Club" options={CLUB_OPTIONS} value={set.club} onChange={(value) => onChange({ club: value, clubs: [value] })} />
          <Dropdown compact label="Shot" options={SHOT_OPTIONS} value={set.shotType} onChange={(value) => onChange({ shotType: value })} />
          <Dropdown compact label="Record" options={MODE_OPTIONS} value={set.practiceMode} onChange={(value) => onChange({ practiceMode: value })} />
        </View>
      </GolfSetRow>
      <View style={styles.repList}>
        {values.map((value, repIndex) => (
          <GolfSwingRepRow
            key={`${set.setNumber}-${set.practiceMode}-${repIndex}`}
            mode={set.practiceMode}
            number={repIndex + 1}
            value={value}
            onFocus={() => onFocusRepInput(repIndex)}
            onLayout={(event) => onLayoutRepInput(repIndex, event)}
            onChangeText={(nextValue) => onChangeRep(repIndex, nextValue)}
          />
        ))}
      </View>
      <View style={styles.actionWrap}>
        <WMButton
          disabled={!readyToComplete || completed}
          fullWidth
          label={completed ? "Set complete" : `Complete Set ${set.setNumber} of ${totalSets}`}
          onPress={onComplete}
          variant={completed ? "secondary" : "primary"}
        />
      </View>
    </GolfExerciseCard>
  );
}

function formatClubPlan(clubs: GolfClub[], reps: number) {
  const uniqueClubs = [...new Set(clubs)];
  if (uniqueClubs.length <= 1) {
    return CLUB_OPTIONS.find((option) => option.value === uniqueClubs[0])?.label ?? "Club";
  }
  const baseReps = Math.floor(reps / uniqueClubs.length);
  const extra = reps % uniqueClubs.length;
  return uniqueClubs
    .map((club, index) => {
      const label = CLUB_OPTIONS.find((option) => option.value === club)?.label ?? club;
      return `${baseReps + (index < extra ? 1 : 0)} ${label}`;
    })
    .join(" + ");
}

function GolfPuttingRepRow({
  number,
  result,
  onSelect,
}: {
  number: number;
  result: GolfRepResult | null;
  onSelect: (result: GolfRepResult) => void;
}) {
  return (
    <View style={styles.repResultRow}>
      <View style={[styles.setBadge, result ? styles.repBadgeDone : null]}>
        <WMText style={[styles.setBadgeText, result ? styles.repBadgeDoneText : null]} variant="chip">
          {number}
        </WMText>
      </View>
      <View style={styles.repResultCopy}>
        <WMText variant="bodyStrong">Rep {number}</WMText>
        <WMText style={styles.meta} variant="meta">
          {result ? (result === "hit" ? "Hit recorded" : "Miss recorded") : "Pick result"}
        </WMText>
      </View>
      <View style={styles.hitMissGroup}>
        <ResultButton label="Hit" selected={result === "hit"} tone="hit" onPress={() => onSelect("hit")} />
        <ResultButton label="Miss" selected={result === "miss"} tone="miss" onPress={() => onSelect("miss")} />
      </View>
    </View>
  );
}

function GolfSwingRepRow({
  number,
  mode,
  value,
  onFocus,
  onLayout,
  onChangeText,
}: {
  number: number;
  mode: GolfPracticeMode;
  value: string;
  onFocus: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onChangeText: (value: string) => void;
}) {
  const hasValue = typeof parseNonNegativeNumber(value) === "number";
  return (
    <View onLayout={onLayout} style={styles.swingRepRow}>
      <View style={[styles.setBadge, hasValue ? styles.repBadgeDone : null]}>
        <WMText style={[styles.setBadgeText, hasValue ? styles.repBadgeDoneText : null]} variant="chip">
          {number}
        </WMText>
      </View>
      <View style={styles.repResultCopy}>
        <WMText variant="bodyStrong">Rep {number}</WMText>
        <WMText style={styles.meta} variant="meta">
          {mode === "distance" ? "Yards" : "Form score"}
        </WMText>
      </View>
      <TextInput
        keyboardType="numeric"
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={mode === "distance" ? "yd" : "1-10"}
        placeholderTextColor={foundationColors.ink.tertiary}
        style={styles.repTextInput}
        value={value}
      />
    </View>
  );
}

function ResultButton({
  label,
  selected,
  tone,
  onPress,
}: {
  label: string;
  selected: boolean;
  tone: GolfRepResult;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.resultButton,
        selected ? (tone === "hit" ? styles.resultButtonHitSelected : styles.resultButtonMissSelected) : null,
      ]}
    >
      <WMText style={selected ? styles.resultButtonTextSelected : styles.resultButtonText} variant="label">
        {label}
      </WMText>
    </Pressable>
  );
}

function GolfExerciseCard({
  index,
  title,
  prescription,
  completed,
  expanded,
  children,
}: {
  index: number;
  title: string;
  prescription: string;
  completed: boolean;
  expanded: boolean;
  children: ReactNode;
}) {
  const state: GolfExerciseState = completed ? "done" : expanded ? "active" : "upcoming";
  const palette = getExercisePalette(state);
  return (
    <JournalCard
      contentStyle={styles.exerciseCardContent}
      preserveSurfaceColorOnPress
      stateTone={completed ? "alive" : undefined}
      style={expanded ? styles.activeCard : undefined}
      variant={expanded ? "standard" : "rowSurface"}
    >
      <View style={styles.exerciseHeader}>
        <View style={[styles.exerciseBadge, { backgroundColor: palette.badgeBackgroundColor, borderColor: palette.badgeBorderColor }]}>
          <WMText style={[styles.exerciseBadgeText, { color: palette.badgeTextColor }]} variant="chip">
            {completed ? "OK" : index + 1}
          </WMText>
        </View>
        <View style={styles.exerciseTitleBlock}>
          <WMText numberOfLines={2} style={styles.exerciseTitle} variant="sectionTitle">
            {title}
          </WMText>
          <WMText style={styles.meta} variant="bodySm">
            {prescription}
          </WMText>
        </View>
        <View style={styles.chevronSlot}>
          <WaymarkIcon
            decorative
            semanticName="utility.chevron"
            size="sm"
            state="muted"
            style={expanded ? styles.chevronExpanded : undefined}
          />
        </View>
      </View>
      {expanded ? <View style={styles.expandedContent}>{children}</View> : null}
    </JournalCard>
  );
}

function GolfSetRow({
  number,
  label,
  meta,
  active = false,
  completed = false,
  children,
}: {
  number: number;
  label: string;
  meta?: string;
  active?: boolean;
  completed?: boolean;
  children?: ReactNode;
}) {
  const palette = getSetPalette(completed ? "done" : active ? "active" : "upcoming");
  return (
    <View style={[styles.golfSetRow, { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor }]}>
      <View style={styles.golfSetHeader}>
        <View style={[styles.setBadge, { backgroundColor: palette.badgeBackgroundColor, borderColor: palette.badgeBorderColor }]}>
          <WMText style={[styles.setBadgeText, { color: palette.badgeTextColor }]} variant="chip">
            {completed ? "OK" : number}
          </WMText>
        </View>
        <View style={styles.logLabel}>
          <WMText variant="bodyStrong">{label}</WMText>
          {meta ? (
            <WMText style={styles.meta} variant="meta">
              {meta}
            </WMText>
          ) : null}
        </View>
      </View>
      {children ? (
        <>
          <Divider variant="soft" />
          <View style={styles.setChildren}>{children}</View>
        </>
      ) : null}
    </View>
  );
}

function getExercisePalette(state: GolfExerciseState) {
  switch (state) {
    case "done":
      return {
        badgeBackgroundColor: foundationColors.green.deep,
        badgeBorderColor: foundationColors.green.deep,
        badgeTextColor: foundationColors.ink.inverse,
      };
    case "active":
      return {
        badgeBackgroundColor: foundationColors.green.base,
        badgeBorderColor: foundationColors.green.base,
        badgeTextColor: foundationColors.ink.inverse,
      };
    default:
      return {
        badgeBackgroundColor: foundationColors.bg.paper,
        badgeBorderColor: foundationColors.border.subtle,
        badgeTextColor: foundationColors.ink.tertiary,
      };
  }
}

function getSetPalette(state: GolfExerciseState) {
  switch (state) {
    case "done":
      return {
        backgroundColor: foundationColors.green.soft,
        borderColor: foundationColors.border.active,
        badgeBackgroundColor: foundationColors.green.deep,
        badgeBorderColor: foundationColors.green.deep,
        badgeTextColor: foundationColors.ink.inverse,
      };
    case "active":
      return {
        backgroundColor: foundationColors.bg.paper,
        borderColor: foundationColors.border.active,
        badgeBackgroundColor: foundationColors.green.base,
        badgeBorderColor: foundationColors.green.base,
        badgeTextColor: foundationColors.ink.inverse,
      };
    default:
      return {
        backgroundColor: foundationColors.bg.paperWarm,
        borderColor: foundationColors.border.subtle,
        badgeBackgroundColor: foundationColors.bg.paper,
        badgeBorderColor: foundationColors.border.subtle,
        badgeTextColor: foundationColors.ink.tertiary,
      };
  }
}

function SegmentedControl<T extends string>({ options, value, onChange, disabled = false }: { options: Option<T>[]; value: T; onChange: (value: T) => void; disabled?: boolean }) {
  return (
    <View style={[styles.segmented, disabled ? styles.controlDisabled : null]}>
      {options.map((option) => (
        <Pressable accessibilityRole="button" disabled={disabled} key={option.value} onPress={() => onChange(option.value)} style={[styles.segment, option.value === value ? styles.segmentSelected : null]}>
          <WMText style={option.value === value ? styles.segmentTextSelected : styles.segmentText} variant="label">
            {option.label}
          </WMText>
        </Pressable>
      ))}
    </View>
  );
}

function Dropdown<T extends string>({ label, options, value, onChange, compact = false }: { label: string; options: Option<T>[]; value: T; onChange: (value: T) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View style={[styles.dropdownWrap, compact ? styles.dropdownWrapCompact : null]}>
      <WMText style={styles.meta} variant="meta">
        {label}
      </WMText>
      <Pressable accessibilityRole="button" onPress={() => setOpen((current) => !current)} style={[styles.dropdownButton, compact ? styles.dropdownButtonCompact : null]}>
        <WMText numberOfLines={1} variant="bodyStrong">{selected?.label ?? label}</WMText>
      </Pressable>
      {open ? (
        <View style={styles.dropdownList}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              key={option.value}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={[styles.dropdownItem, option.value === value ? styles.dropdownItemSelected : null]}
            >
              <WMText variant="body">{option.label}</WMText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shellContent: { paddingHorizontal: 16 },
  screen: { flex: 1, gap: spacing.sm },
  content: { gap: spacing.sm, paddingBottom: 120 },
  reviewBanner: {
    gap: spacing.xxs,
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    borderColor: foundationColors.border.active,
    backgroundColor: foundationColors.bg.paperWarm,
    padding: spacing.md,
  },
  reviewBannerTitle: { color: foundationColors.ink.primary },
  reviewBannerBody: { color: foundationColors.ink.secondary },
  reviewSection: { gap: spacing.sm },
  reviewCard: { gap: spacing.xxs },
  reviewDetail: { color: foundationColors.ink.secondary },
  segmented: { flexDirection: "row", gap: spacing.xs, borderRadius: semanticRadius.card.compact, backgroundColor: foundationColors.bg.paperWarm, padding: 4 },
  controlDisabled: { opacity: 0.72 },
  segment: { minHeight: 40, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: semanticRadius.button.default },
  segmentSelected: { backgroundColor: foundationColors.green.deep },
  segmentText: { color: foundationColors.ink.secondary },
  segmentTextSelected: { color: foundationColors.ink.inverse },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  progressLabel: { flex: 1, color: foundationColors.ink.secondary },
  progressRail: { flexDirection: "row", alignItems: "center", gap: 4 },
  progressSegment: {
    width: 20,
    height: 7,
    borderWidth: 1,
    borderRadius: semanticRadius.chip,
    borderColor: foundationColors.border.subtle,
    backgroundColor: foundationColors.bg.paperSoft,
  },
  progressSegmentActive: { borderColor: "transparent", backgroundColor: foundationColors.green.base },
  progressSegmentDone: { borderColor: "transparent", backgroundColor: foundationColors.green.soft },
  phaseRail: { flexDirection: "row", gap: spacing.xs },
  phasePill: { minHeight: 34, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: semanticRadius.button.compact, backgroundColor: foundationColors.bg.paperWarm },
  phasePillActive: { backgroundColor: foundationColors.green.soft },
  phaseText: { color: foundationColors.ink.tertiary },
  phaseTextActive: { color: foundationColors.green.deep },
  section: { gap: spacing.xs, borderRadius: semanticRadius.card.default, borderWidth: 1, borderColor: foundationColors.border.subtle, backgroundColor: foundationColors.bg.paper, padding: spacing.sm },
  setCard: { gap: spacing.xs, borderRadius: semanticRadius.card.compact, borderWidth: 1, borderColor: foundationColors.border.subtle, backgroundColor: foundationColors.bg.paperWarm, padding: spacing.sm },
  setCardDone: { borderColor: foundationColors.green.deep, backgroundColor: foundationColors.green.soft },
  exerciseList: { gap: spacing.sm },
  exerciseCardContent: { position: "relative", gap: spacing.xs, paddingVertical: 14 },
  activeCard: { borderWidth: 1, borderColor: foundationColors.border.active, borderRadius: semanticRadius.card.default },
  exerciseHeader: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  exerciseBadge: {
    width: 46,
    height: 46,
    borderRadius: semanticRadius.badge,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  exerciseBadgeText: { fontWeight: "700" },
  exerciseTitleBlock: { flex: 1, minWidth: 0, gap: 2 },
  exerciseTitle: { color: foundationColors.ink.primary },
  chevronSlot: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chevronExpanded: {
    transform: [{ rotate: "90deg" }],
  },
  expandedContent: { gap: spacing.xs },
  golfSetRow: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: semanticRadius.card.compact,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: spacing.xs,
  },
  golfSetHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  setBadge: {
    width: 30,
    height: 30,
    borderRadius: semanticRadius.badge,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  setBadgeText: { fontWeight: "700", fontSize: 11 },
  setChildren: { gap: spacing.xs },
  actionWrap: { marginTop: spacing.xs },
  footerAction: { paddingBottom: 44 },
  setHeader: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logLabel: { flex: 1, minWidth: 0, gap: 2 },
  meta: { color: foundationColors.ink.secondary },
  doneText: { color: foundationColors.green.deep },
  repList: { gap: spacing.xs },
  repResultRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    backgroundColor: foundationColors.bg.paperWarm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  swingRepRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: semanticRadius.card.compact,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    backgroundColor: foundationColors.bg.paperWarm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  repBadgeDone: { borderColor: foundationColors.green.deep, backgroundColor: foundationColors.green.deep },
  repBadgeDoneText: { color: foundationColors.ink.inverse },
  repResultCopy: { flex: 1, minWidth: 0, gap: 2 },
  hitMissGroup: { flexDirection: "row", gap: 6 },
  resultButton: {
    minHeight: 36,
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: semanticRadius.button.compact,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    backgroundColor: foundationColors.bg.paper,
    paddingHorizontal: 10,
  },
  resultButtonHitSelected: { borderColor: foundationColors.green.deep, backgroundColor: foundationColors.green.deep },
  resultButtonMissSelected: { borderColor: foundationColors.ink.secondary, backgroundColor: foundationColors.ink.secondary },
  resultButtonText: { color: foundationColors.ink.secondary },
  resultButtonTextSelected: { color: foundationColors.ink.inverse },
  repTextInput: {
    minHeight: 40,
    width: 82,
    borderRadius: semanticRadius.button.compact,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    color: foundationColors.ink.primary,
    backgroundColor: foundationColors.bg.paper,
    paddingHorizontal: 10,
    textAlign: "right",
  },
  dropdownWrap: { gap: 4 },
  dropdownWrapCompact: { flex: 1, minWidth: 0 },
  dropdownButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: semanticRadius.button.compact, borderWidth: 1, borderColor: foundationColors.border.subtle, paddingHorizontal: spacing.sm },
  dropdownButtonCompact: { minHeight: 40, gap: 4, paddingHorizontal: spacing.xs },
  dropdownList: { gap: 4 },
  dropdownItem: { minHeight: 38, justifyContent: "center", borderRadius: semanticRadius.card.compact, backgroundColor: foundationColors.bg.paperWarm, paddingHorizontal: spacing.sm },
  dropdownItemSelected: { backgroundColor: foundationColors.green.soft },
  inlineDropdownRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
  textInput: { minHeight: 44, borderRadius: semanticRadius.button.compact, borderWidth: 1, borderColor: foundationColors.border.subtle, color: foundationColors.ink.primary, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  noteInput: { minHeight: 74, textAlignVertical: "top" },
});
