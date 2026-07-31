import type { GolfShortGameSetPlan, GolfWorkoutType } from "../../types/golfPractice";

const CHIPPING_SET_LABELS = ["Calibration", "Giữ nhịp", "Pressure"] as const;
const CHIPPING_LANDING_ZONES: Record<string, string> = {
  "3": "1.2 m",
  "5": "2.0 m",
  "7": "2.8 m",
};
const PUTTING_PRESCRIPTION: Array<{ distanceCm: 60 | 90 | 120 | 150 | 180; reps: number }> = [
  { distanceCm: 60, reps: 3 },
  { distanceCm: 90, reps: 1 },
  { distanceCm: 120, reps: 2 },
  { distanceCm: 150, reps: 2 },
  { distanceCm: 180, reps: 15 },
];

function normalizeDistanceToken(value: string) {
  return value.trim().replace(",", ".").replace(/\s*m$/i, "");
}

export function buildChippingShortGamePracticePlanForMarkTitle(title: string): GolfShortGameSetPlan[] | null {
  const normalized = title.trim().toLowerCase();
  if (!normalized.includes("chipping") && !normalized.includes("chip ")) {
    return null;
  }

  if (normalized.includes("3-5-7")) {
    const distances = ["3", "5", "7"];
    return [1, 2].flatMap((round) =>
      distances.map((distance, distanceIndex) => ({
        setNumber: (round - 1) * distances.length + distanceIndex + 1,
        label: `${distance} m · Round ${round}`,
        distanceLabel: `${distance} m`,
        landingZoneLabel: CHIPPING_LANDING_ZONES[distance],
        reps: 4,
        note: "Hit only when the ball lands inside the target zone and touches Flagsticky. No make-up shots.",
      })),
    );
  }

  const distanceMatch = normalized.match(/chipping\s+([0-9]+(?:[.,][0-9]+)?)\s*m/);
  const distance = distanceMatch ? normalizeDistanceToken(distanceMatch[1] ?? "") : null;
  if (!distance || !CHIPPING_LANDING_ZONES[distance]) {
    return null;
  }

  return CHIPPING_SET_LABELS.map((label, index) => ({
    setNumber: index + 1,
    label: `${distance} m · ${label}`,
    distanceLabel: `${distance} m`,
    landingZoneLabel: CHIPPING_LANDING_ZONES[distance],
    reps: 8,
    note:
      index === 0
        ? "Calibration set. Find landing feel; Hit only when land-inside-zone then Flagsticky."
        : index === 1
          ? "Hold rhythm. Hit/Miss only; miss still counts as a rep."
          : "Pressure set. Keep the same routine; no make-up shots.",
  }));
}

export function buildPuttingShortGamePracticePlanForMarkTitle(title: string): GolfShortGameSetPlan[] | null {
  const normalized = title.trim().toLowerCase();
  if (!normalized.includes("putt") || !normalized.includes("23 putts")) {
    return null;
  }

  return PUTTING_PRESCRIPTION.map(({ distanceCm, reps }, index) => ({
    setNumber: index + 1,
    label: `Putting ${distanceCm} cm`,
    distanceLabel: `${distanceCm} cm`,
    reps,
    note: "Record Hit/Miss for every putt. Misses still count as reps; no make-up putts.",
  }));
}

export function buildGolfShortGamePracticePlanForMarkTitle(title: string): GolfShortGameSetPlan[] | null {
  return buildChippingShortGamePracticePlanForMarkTitle(title) ?? buildPuttingShortGamePracticePlanForMarkTitle(title);
}

export function resolveGolfPracticeWorkoutTypeForMarkTitle(title: string): GolfWorkoutType | null {
  const normalized = title.trim().toLowerCase();

  if (
    normalized.includes("short game") ||
    normalized.includes("chipping") ||
    normalized.includes("chip ")
  ) {
    return "putting";
  }

  if (
    normalized.includes("swing practice") ||
    normalized.includes("golf swing") ||
    normalized.includes("snag launcher") ||
    normalized.includes("snag roller") ||
    normalized.includes("snag snapper")
  ) {
    return "swing";
  }

  if (
    normalized.includes("putt practice") ||
    normalized.includes("putting practice") ||
    normalized.includes("putting ladder") ||
    normalized.includes("golf practice putting")
  ) {
    return "putting";
  }

  return null;
}
