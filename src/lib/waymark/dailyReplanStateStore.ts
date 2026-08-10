import type { AppSettingsRepository, LocalDateString } from "../../domain/waymark";

export type DailyReplanDraftState = {
  schemaVersion: 1 | 2;
  localDate: LocalDateString;
  trailDayId: string;
  timezone: string;
  status: "draft";
  startedAt: string;
  candidateRootMarkIds: string[];
};

export type DailyReplanConfirmedPlanEntry = {
  rootMarkId: string;
  baselineLeafMarkId: string;
};

export type DailyReplanConfirmedStateV1 = Omit<DailyReplanDraftState, "schemaVersion" | "status"> & {
  schemaVersion: 1;
  status: "confirmed";
  confirmedAt: string;
};

export type DailyReplanConfirmedStateV2 = Omit<DailyReplanDraftState, "schemaVersion" | "status"> & {
  schemaVersion: 2;
  status: "confirmed";
  confirmedAt: string;
  confirmedPlanEntries: DailyReplanConfirmedPlanEntry[];
};

export type DailyReplanConfirmedState = DailyReplanConfirmedStateV1 | DailyReplanConfirmedStateV2;
export type DailyReplanState = DailyReplanDraftState | DailyReplanConfirmedState;

const DAILY_REPLAN_PREFIX = "daily_replan:";
const DAILY_REPLAN_ACTIVATION_KEY = "daily_replan:feature_activation";

function stateKey(localDate: LocalDateString) {
  return `${DAILY_REPLAN_PREFIX}${localDate}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLocalDate(value: unknown): value is LocalDateString {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isSortedUnique(values: string[]) {
  return new Set(values).size === values.length && !values.some((id, index) => index > 0 && values[index - 1] > id);
}

function parseConfirmedPlanEntries(
  value: unknown,
  candidateRootMarkIds: string[],
): DailyReplanConfirmedPlanEntry[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const roots = new Set(candidateRootMarkIds);
  const entries: DailyReplanConfirmedPlanEntry[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.rootMarkId !== "string" ||
      !item.rootMarkId ||
      typeof item.baselineLeafMarkId !== "string" ||
      !item.baselineLeafMarkId ||
      !roots.has(item.rootMarkId)
    ) {
      return null;
    }
    entries.push({
      rootMarkId: item.rootMarkId,
      baselineLeafMarkId: item.baselineLeafMarkId,
    });
  }
  const entryRoots = entries.map((entry) => entry.rootMarkId);
  return isSortedUnique(entryRoots) ? entries : null;
}

function parseState(value: unknown, expectedDate: LocalDateString): DailyReplanState | null {
  if (
    !isRecord(value) ||
    (value.schemaVersion !== 1 && value.schemaVersion !== 2) ||
    value.localDate !== expectedDate
  ) {
    return null;
  }
  if (
    typeof value.trailDayId !== "string" ||
    !value.trailDayId ||
    typeof value.timezone !== "string" ||
    !value.timezone ||
    typeof value.startedAt !== "string" ||
    !Array.isArray(value.candidateRootMarkIds) ||
    !value.candidateRootMarkIds.every((id) => typeof id === "string" && id.length > 0)
  ) {
    return null;
  }

  const roots = value.candidateRootMarkIds as string[];
  if (!isSortedUnique(roots)) {
    return null;
  }

  if (value.status === "draft") {
    return value as DailyReplanDraftState;
  }
  if (value.status === "confirmed" && typeof value.confirmedAt === "string" && value.confirmedAt >= value.startedAt) {
    if (value.schemaVersion === 1) {
      return value as DailyReplanConfirmedStateV1;
    }
    const confirmedPlanEntries = parseConfirmedPlanEntries(value.confirmedPlanEntries, roots);
    if (!confirmedPlanEntries) {
      return null;
    }
    return {
      ...(value as Omit<DailyReplanConfirmedStateV2, "confirmedPlanEntries">),
      confirmedPlanEntries,
    };
  }
  return null;
}

export async function getDailyReplanState(
  settings: AppSettingsRepository,
  userId: string,
  localDate: LocalDateString,
): Promise<DailyReplanState | null> {
  const setting = await settings.getSetting(userId, stateKey(localDate));
  if (!setting) {
    return null;
  }
  const parsed = parseState(setting.value, localDate);
  if (!parsed) {
    throw new Error(`Invalid Daily Replan state for ${localDate}.`);
  }
  return parsed;
}

export async function setDailyReplanState(
  settings: AppSettingsRepository,
  userId: string,
  state: DailyReplanState,
): Promise<DailyReplanState> {
  const candidateRootMarkIds = [...new Set(state.candidateRootMarkIds)].sort();
  const normalized: DailyReplanState = {
    ...state,
    candidateRootMarkIds,
    ...(state.status === "confirmed" && state.schemaVersion === 2
      ? {
          confirmedPlanEntries: state.confirmedPlanEntries
            .filter((entry) => candidateRootMarkIds.includes(entry.rootMarkId))
            .sort((left, right) => left.rootMarkId.localeCompare(right.rootMarkId)),
        }
      : {}),
  } as DailyReplanState;
  const parsed = parseState(normalized, state.localDate);
  if (!parsed) {
    throw new Error(`Cannot persist invalid Daily Replan state for ${state.localDate}.`);
  }
  await settings.setSetting(userId, stateKey(state.localDate), normalized);
  return normalized;
}

export async function deleteDailyReplanState(
  settings: AppSettingsRepository,
  userId: string,
  localDate: LocalDateString,
): Promise<void> {
  await settings.deleteSetting(userId, stateKey(localDate));
}

export async function getDailyReplanActivationDate(
  settings: AppSettingsRepository,
  userId: string,
): Promise<LocalDateString | null> {
  const setting = await settings.getSetting(userId, DAILY_REPLAN_ACTIVATION_KEY);
  if (!setting) {
    return null;
  }
  return isLocalDate(setting.value) ? setting.value : null;
}

export async function ensureDailyReplanActivationDate(
  settings: AppSettingsRepository,
  userId: string,
  localDate: LocalDateString,
): Promise<LocalDateString> {
  const existing = await getDailyReplanActivationDate(settings, userId);
  if (existing) {
    return existing;
  }
  await settings.setSetting(userId, DAILY_REPLAN_ACTIVATION_KEY, localDate);
  return localDate;
}
