import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import {
  GolfClub,
  GolfPracticeHistory,
  GolfPracticeMode,
  GolfShotType,
  GolfSwingSetInput,
  GolfWorkoutType,
  SaveGolfPracticeLogInput,
} from "../../types/golfPractice";
import { foundationColors, semanticRadius, spacing } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { FieldJournalScreenShell } from "../primitives/FieldJournalScreenShell";
import { PageHeader } from "../primitives/PageHeader";
import { WMButton } from "../primitives/WMButton";
import { WMText } from "../primitives/Text";

type Props = {
  locale: Locale;
  history: GolfPracticeHistory | null;
  initialWorkoutType?: GolfWorkoutType;
  workoutTypeLocked?: boolean;
  saving?: boolean;
  onBack?: () => void;
  onSave: (input: SaveGolfPracticeLogInput) => void;
};

type Option<T extends string> = {
  value: T;
  label: string;
};

const PUTTING_DISTANCES = [60, 90, 120, 150, 180] as const;
const SWING_REPS_PER_SET = 10;
const CLUB_OPTIONS: Option<GolfClub>[] = [
  { value: "snag_launcher", label: "SNAG Launcher" },
  { value: "snag_roller", label: "SNAG Roller" },
  { value: "snag_snapper", label: "SNAG Snapper" },
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

function clampCount(value: string, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : fallback;
}

function parseDistances(value: string) {
  return value
    .split(/[,\s]+/)
    .map((entry) => Number.parseFloat(entry))
    .filter((entry) => Number.isFinite(entry) && entry >= 0);
}

function formatRate(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function GolfPracticeTemplate({ locale, history, initialWorkoutType = "putting", workoutTypeLocked = false, saving = false, onBack, onSave }: Props) {
  const [workoutType, setWorkoutType] = useState<GolfWorkoutType>(initialWorkoutType);
  const [warmupCompleted, setWarmupCompleted] = useState(false);
  const [puttingHits, setPuttingHits] = useState<Record<number, string>>(
    Object.fromEntries(PUTTING_DISTANCES.map((distance) => [distance, "0"])),
  );
  const [puttingMisses, setPuttingMisses] = useState<Record<number, string>>(
    Object.fromEntries(PUTTING_DISTANCES.map((distance) => [distance, "0"])),
  );
  const [club, setClub] = useState<GolfClub>("snag_launcher");
  const [shotType, setShotType] = useState<GolfShotType>("chip");
  const [practiceMode, setPracticeMode] = useState<GolfPracticeMode>("distance");
  const [distanceValues, setDistanceValues] = useState(["", "", ""]);
  const [coachScores, setCoachScores] = useState(["", "", ""]);
  const [note, setNote] = useState("");

  const puttingSets = useMemo(
    () =>
      PUTTING_DISTANCES.map((distanceCm) => {
        const hits = clampCount(puttingHits[distanceCm] ?? "0");
        const misses = clampCount(puttingMisses[distanceCm] ?? "0");
        return {
          distanceCm,
          reps: Math.max(10, hits + misses),
          hits,
          misses,
        };
      }),
    [puttingHits, puttingMisses],
  );

  const swingSets = useMemo<GolfSwingSetInput[]>(
    () =>
      [0, 1, 2].map((index) => {
        const distancesYards = parseDistances(distanceValues[index] ?? "");
        const coachScore = Number.parseFloat(coachScores[index] ?? "");
        return {
          setNumber: index + 1,
          reps: SWING_REPS_PER_SET,
          club,
          shotType,
          practiceMode,
          distancesYards: practiceMode === "distance" ? distancesYards : undefined,
          coachScore: practiceMode === "form" && Number.isFinite(coachScore) ? coachScore : undefined,
        };
      }),
    [club, coachScores, distanceValues, practiceMode, shotType],
  );

  const saveDisabled =
    saving ||
    !warmupCompleted ||
    (workoutType === "putting" && puttingSets.every((set) => set.hits + set.misses === 0)) ||
    (workoutType === "swing" &&
      swingSets.every((set) =>
        set.practiceMode === "distance" ? !set.distancesYards?.length : typeof set.coachScore !== "number",
      ));

  const handleSave = () => {
    onSave({
      workoutType,
      warmupCompleted,
      puttingSets: workoutType === "putting" ? puttingSets : undefined,
      swingSets: workoutType === "swing" ? swingSets : undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <FieldJournalScreenShell contentContainerStyle={styles.shellContent} scrollable={false} variant="noBottomNav">
      <View style={styles.screen}>
        <PageHeader onBack={onBack} showBack subtitle="Golf Craft" title="Golf Practice" variant="withBack" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <SegmentedControl
            options={[
              { value: "putting", label: "Short Game" },
              { value: "swing", label: "Swing" },
            ]}
            value={workoutType}
            onChange={workoutTypeLocked ? undefined : setWorkoutType}
          />

          <View style={styles.section}>
            <WMText variant="sectionTitle">Warm-up</WMText>
            {[
              "Neck rolls + shoulder rolls",
              "Wrist circles + grip squeeze",
              "Hip hinge into golf posture",
              "Torso rotation in golf stance",
              "Left-right weight shift",
              "Slow practice swings",
            ].map((item, index) => (
              <View key={item} style={styles.warmupRow}>
                <WMText style={styles.warmupNumber} variant="meta">
                  {index + 1}
                </WMText>
                <WMText style={styles.warmupText} variant="body">
                  {item}
                </WMText>
              </View>
            ))}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: warmupCompleted }}
              onPress={() => setWarmupCompleted((current) => !current)}
              style={[styles.checkboxRow, warmupCompleted ? styles.checkboxRowChecked : null]}
            >
              <WMText variant="bodyStrong">{warmupCompleted ? "Warm-up completed" : "Mark warm-up completed"}</WMText>
            </Pressable>
          </View>

          {workoutType === "putting" ? (
            <View style={styles.section}>
              <WMText variant="sectionTitle">Short game ladder</WMText>
              {PUTTING_DISTANCES.map((distance) => (
                <View key={distance} style={styles.logRow}>
                  <View style={styles.logLabel}>
                    <WMText variant="bodyStrong">{distance} cm</WMText>
                    <WMText style={styles.meta} variant="meta">
                      10 putts
                    </WMText>
                  </View>
                  <NumberInput
                    label="Hits"
                    value={puttingHits[distance] ?? "0"}
                    onChangeText={(value) => setPuttingHits((current) => ({ ...current, [distance]: value }))}
                  />
                  <NumberInput
                    label="Misses"
                    value={puttingMisses[distance] ?? "0"}
                    onChangeText={(value) => setPuttingMisses((current) => ({ ...current, [distance]: value }))}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.section}>
              <WMText variant="sectionTitle">Swing practice</WMText>
              <Dropdown label="Club" options={CLUB_OPTIONS} value={club} onChange={setClub} />
              <Dropdown label="Shot" options={SHOT_OPTIONS} value={shotType} onChange={setShotType} />
              <Dropdown label="Mode" options={MODE_OPTIONS} value={practiceMode} onChange={setPracticeMode} />
              {[0, 1, 2].map((index) => (
                <View key={index} style={styles.swingSet}>
                  <WMText variant="bodyStrong">Set {index + 1}</WMText>
                  {practiceMode === "distance" ? (
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={(value) => setDistanceValues((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))}
                      placeholder="10 yards values, e.g. 8, 9, 10..."
                      placeholderTextColor={foundationColors.ink.tertiary}
                      style={styles.textInput}
                      value={distanceValues[index]}
                    />
                  ) : (
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={(value) => setCoachScores((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))}
                      placeholder="Coach score 1-10"
                      placeholderTextColor={foundationColors.ink.tertiary}
                      style={styles.textInput}
                      value={coachScores[index]}
                    />
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <WMText variant="sectionTitle">Note</WMText>
            <TextInput
              multiline
              onChangeText={setNote}
              placeholder="Optional note"
              placeholderTextColor={foundationColors.ink.tertiary}
              style={[styles.textInput, styles.noteInput]}
              value={note}
            />
          </View>

          <View style={styles.section}>
            <WMText variant="sectionTitle">Progress history</WMText>
            {history?.items.length ? (
              history.items.slice(0, 4).map((item) => (
                <View key={item.id} style={styles.historyRow}>
                  <View style={styles.logLabel}>
                    <WMText variant="bodyStrong">{item.title}</WMText>
                    <WMText style={styles.meta} variant="meta">
                      {new Date(item.completedAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US")}
                    </WMText>
                  </View>
                  <WMText style={styles.historySummary} variant="body">
                    {item.summary}
                  </WMText>
                </View>
              ))
            ) : (
              <WMText style={styles.meta} variant="body">
                No golf practice logs yet.
              </WMText>
            )}
            {history?.puttingByDistance.length ? (
              <View style={styles.historyGrid}>
                {history.puttingByDistance.map((item) => (
                  <View key={item.distanceCm} style={styles.metricTile}>
                    <WMText variant="bodyStrong">{item.distanceCm} cm</WMText>
                    <WMText style={styles.meta} variant="meta">
                      {formatRate(item.hitRate)}
                    </WMText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <WMButton disabled={saveDisabled} fullWidth label={saving ? "Saving..." : "Save practice log"} onPress={handleSave} variant="primary" />
        </ScrollView>
      </View>
    </FieldJournalScreenShell>
  );
}

function SegmentedControl<T extends string>({ options, value, onChange }: { options: Option<T>[]; value: T; onChange?: (value: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <Pressable
          accessibilityRole="button"
          disabled={!onChange}
          key={option.value}
          onPress={() => onChange?.(option.value)}
          style={[styles.segment, option.value === value ? styles.segmentSelected : null]}
        >
          <WMText style={option.value === value ? styles.segmentTextSelected : styles.segmentText} variant="label">
            {option.label}
          </WMText>
        </Pressable>
      ))}
    </View>
  );
}

function Dropdown<T extends string>({ label, options, value, onChange }: { label: string; options: Option<T>[]; value: T; onChange: (value: T) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View style={styles.dropdownWrap}>
      <WMText style={styles.meta} variant="meta">
        {label}
      </WMText>
      <Pressable accessibilityRole="button" onPress={() => setOpen((current) => !current)} style={styles.dropdownButton}>
        <WMText variant="bodyStrong">{selected?.label ?? label}</WMText>
        <WMText style={styles.meta} variant="meta">
          {open ? "Close" : "Choose"}
        </WMText>
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

function NumberInput({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.numberInputWrap}>
      <WMText style={styles.meta} variant="meta">
        {label}
      </WMText>
      <TextInput keyboardType="number-pad" onChangeText={onChangeText} style={styles.numberInput} value={value} />
    </View>
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
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  segmented: {
    flexDirection: "row",
    gap: spacing.xs,
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.bg.paperWarm,
    padding: 4,
  },
  segment: {
    minHeight: 40,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: semanticRadius.button.default,
  },
  segmentSelected: {
    backgroundColor: foundationColors.green.deep,
  },
  segmentText: {
    color: foundationColors.ink.secondary,
  },
  segmentTextSelected: {
    color: foundationColors.ink.inverse,
  },
  section: {
    gap: spacing.xs,
    borderRadius: semanticRadius.card.default,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    backgroundColor: foundationColors.bg.paper,
    padding: spacing.sm,
  },
  warmupRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  warmupNumber: {
    width: 22,
    color: foundationColors.ink.tertiary,
  },
  warmupText: {
    flex: 1,
    color: foundationColors.ink.primary,
  },
  checkboxRow: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: semanticRadius.button.default,
    borderWidth: 1,
    borderColor: foundationColors.border.proof,
    backgroundColor: foundationColors.bg.paperWarm,
    paddingHorizontal: spacing.sm,
  },
  checkboxRowChecked: {
    borderColor: foundationColors.green.deep,
    backgroundColor: foundationColors.green.soft,
  },
  logRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  logLabel: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  meta: {
    color: foundationColors.ink.secondary,
  },
  numberInputWrap: {
    width: 74,
    gap: 2,
  },
  numberInput: {
    minHeight: 38,
    borderRadius: semanticRadius.button.compact,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    color: foundationColors.ink.primary,
    paddingHorizontal: 10,
  },
  dropdownWrap: {
    gap: 4,
  },
  dropdownButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: semanticRadius.button.compact,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    paddingHorizontal: spacing.sm,
  },
  dropdownList: {
    gap: 4,
  },
  dropdownItem: {
    minHeight: 38,
    justifyContent: "center",
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.bg.paperWarm,
    paddingHorizontal: spacing.sm,
  },
  dropdownItemSelected: {
    backgroundColor: foundationColors.green.soft,
  },
  swingSet: {
    gap: 6,
  },
  textInput: {
    minHeight: 44,
    borderRadius: semanticRadius.button.compact,
    borderWidth: 1,
    borderColor: foundationColors.border.subtle,
    color: foundationColors.ink.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  noteInput: {
    minHeight: 74,
    textAlignVertical: "top",
  },
  historyRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  historySummary: {
    color: foundationColors.ink.secondary,
    textAlign: "right",
  },
  historyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  metricTile: {
    minWidth: 80,
    flexGrow: 1,
    borderRadius: semanticRadius.card.compact,
    backgroundColor: foundationColors.bg.paperWarm,
    padding: spacing.xs,
  },
});
