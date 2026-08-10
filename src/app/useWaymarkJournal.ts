import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MarkInstance, Memory, TrailDay } from "../domain/waymark/entities";
import { MarkInstanceStatus, MediaAssetOwnerType, TrailDayStatus } from "../domain/waymark/enums";
import { getMarkMetadata, listDisciplineProofsByTrailDay, projectCharacterFromRecords } from "../lib/waymark";
import { isMarkFinalStatus } from "../lib/waymark/markEngine";
import { getPathHeroImage } from "../tokens/pathHeroImages";
import { resolveRecentCollectionCardSkin } from "../tokens/recentCollectionCardSkins";
import { mapMarkToJournalEntry } from "./readModelProjections";
import { resolveMarkJournalTime, resolveMemoryJournalTime } from "./journalEntryTime";
import { mapMemoryToDailyEntry } from "./journalEntryMappers";
import type { Locale, PathId } from "../types/ui";
import type { BotanicalMotifId } from "../design/botanical-motifs";
import type { CaptureMediaAttachment, CapturePhotoAttachment } from "../types/capture";
import { useWaymarkApp, type WaymarkAppServices } from "./WaymarkAppProvider";
import { createJournalMemoryCapture } from "./journalMemoryCapture";
import { formatLocalDate } from "./waymarkUi";
import { listWaymarkMediaForOwner, type WaymarkMediaItem } from "./waymarkMediaSelectors";
import {
  projectDailyJournalViewState,
  shiftDailyJournalDate,
  type DailyJournalClosedDayCard,
  type DailyJournalViewState,
} from "./dailyJournalViewState";
import { createDailyPlanEngine } from "../lib/waymark/dailyPlanEngine";
import { projectConfirmedDailyPlan } from "../lib/waymark/confirmedDailyPlanProjection";

type JournalRecentRow = {
  id: string;
  label: string;
  date: Date;
  chips: { label: string }[];
};

type JournalHomeData = {
  dateLabel: string;
  dateOptions: Array<{ id: string; label: string }>;
  latestHero: {
    sourceId?: string;
    sourceType?: "memory";
    title: string;
    subtitle?: string;
    eyebrow: string;
    dateLabel: string;
    pathLabel?: string;
    images?: Array<{ assetId?: string; alt: string; src?: string }>;
    mediaItems?: WaymarkMediaItem[];
  };
  recentRows: JournalRecentRow[];
  lookBackCards: Array<{
    id: string;
    title: string;
    meta: string;
    image?: { assetId?: string; alt: string; src?: string };
  }>;
  upcomingCards: Array<{
    id: string;
    title: string;
    subtitle: string;
    day: string;
    month: string;
  }>;
};

export type DailyJournalData = DailyJournalViewState & {
  debug?: {
    selectedDate: string;
    trailDayId: string;
    journalEntries: number;
    memoryEntries: number;
    completedMarks: number;
    hasClosedTrail: boolean;
  };
};

type JournalState =
  | { status: "loading"; error: null; home: JournalHomeData | null }
  | { status: "error"; error: Error; home: JournalHomeData | null }
  | {
      status: "ready";
      error: null;
      home: JournalHomeData;
      dailyByDay: Record<string, DailyJournalData>;
      dailyLoadStateByDay: Record<string, DailyJournalLoadState>;
    };

const JOURNAL_HOME_DAY_COUNT = 7;
const JOURNAL_MEDIA_DOWNLOAD_POLICY = "thumbnails" satisfies Parameters<typeof listWaymarkMediaForOwner>[1]["downloadPolicy"];

export type DailyJournalLoadState =
  | { status: "idle" | "loading" | "ready"; error: null }
  | { status: "error"; error: Error };

export function useWaymarkJournal(locale: Locale, options: { enabled?: boolean } = {}) {
  const app = useWaymarkApp();
  const enabled = options.enabled ?? true;
  const lastLoadedReloadTokenRef = useRef<number | null>(null);
  const stateRef = useRef<JournalState>({
    status: "loading",
    error: null,
    home: null,
  });
  const inFlightDailyLoadsRef = useRef(new Map<string, Promise<void>>());
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<JournalState>({
    status: "loading",
    error: null,
    home: null,
  });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refresh = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    if (lastLoadedReloadTokenRef.current === reloadToken) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      setState((current) =>
        current.home ? current : { status: "loading", error: null, home: null },
      );

      try {
        const now = new Date();
        const todayLocalDate = formatLocalDate(now, app.user.timezone);
        await app.repositories.trailDays.getOrCreateTrailDay(app.user.id, todayLocalDate);
        const rangeStart = shiftDailyJournalDate(todayLocalDate, -(JOURNAL_HOME_DAY_COUNT - 1));
        const trailDays = await app.repositories.trailDays.listTrailDaysInRange(
          app.user.id,
          rangeStart,
          todayLocalDate,
        );

        const paths = await app.repositories.paths.listActivePaths(app.user.id);
        const pathLabelById = new Map(
          paths.map((path) => [path.id, mapUiPathLabel(path.slug, path.title, locale)] as const),
        );
        const pathUiIdById = new Map(paths.map((path) => [path.id, mapUiPathId(path.slug, path.title)] as const));

        const dayPayloads = await Promise.all(
          trailDays.map(async (trailDay) => {
            const marks = await listJournalTrailMarksForTrailDay(
              { repositories: app.repositories, userId: app.user.id, dailyPlanEngine: app.dailyPlanEngine },
              trailDay,
            );
            const memories = await app.repositories.memories.listMemoriesByTrailDay(trailDay.id);
            const reflections = await app.repositories.trailDays.listReflectionEntries(trailDay.id);
            const disciplineProofs = await listDisciplineProofsByTrailDay(
              app.repositories.appSettings,
              app.user.id,
              trailDay.id,
            );
            const memoriesWithMedia = await Promise.all(
              memories.map(async (memory) => ({
                memory,
                mediaItems: await listWaymarkMediaForOwner(app.repositories, {
                  ownerType: MediaAssetOwnerType.Memory,
                  ownerId: memory.id,
                  alt: memory.title,
                  legacyMediaAssetIds: memory.mediaAssetIds,
                  downloadPolicy: JOURNAL_MEDIA_DOWNLOAD_POLICY,
                  usage: `journal:memory:${memory.id}`,
                }),
              })),
            );

            const marksWithMetadata = await Promise.all(
              marks.map(async (mark) => ({
                mark,
                metadata: await getMarkMetadata(app.repositories.appSettings, app.user.id, mark.id),
              })),
            );

            return {
              trailDay,
              marks: marksWithMetadata,
              memories: memoriesWithMedia,
              reflections,
              disciplineProofs,
              judgment:
                trailDay.status === TrailDayStatus.Closed ?
                  await app.closeTrailEngine.getCloseTrailJudgment(trailDay.id)
                : undefined,
              characterProjection: projectCharacterFromRecords({
                marks: marksWithMetadata,
                disciplineProofs,
              }),
            };
          }),
        );

        const latestMemory = dayPayloads
          .flatMap((payload) => payload.memories)
          .sort((left, right) => right.memory.capturedAt.localeCompare(left.memory.capturedAt))[0];
        const latestMemoryPathHeroAssetId =
          latestMemory && latestMemory.mediaItems.length === 0
            ? getPathHeroImage(pathUiIdById.get(latestMemory.memory.pathId ?? ""))?.assetId
            : undefined;

        const recentRows = dayPayloads
          .filter(
            (payload) =>
              payload.marks.some(({ mark }) => mark.status === MarkInstanceStatus.Completed || mark.status === MarkInstanceStatus.PartiallyCompleted) ||
              payload.memories.length > 0 ||
              payload.disciplineProofs.length > 0 ||
              payload.trailDay.status === TrailDayStatus.Closed,
          )
          .sort((left, right) => right.trailDay.date.localeCompare(left.trailDay.date))
          .map((payload) => {
            const markCount = payload.marks.filter(({ mark }) => mark.status === MarkInstanceStatus.Completed || mark.status === MarkInstanceStatus.PartiallyCompleted).length;
            const memoryCount = payload.memories.length;
            const chips = [
              markCount > 0
                ? { label: locale === "vi" ? `${markCount} mark` : `${markCount} mark${markCount === 1 ? "" : "s"}` }
                : null,
              memoryCount > 0
                ? {
                    label:
                      locale === "vi"
                        ? `${memoryCount} ky uc`
                        : `${memoryCount} memor${memoryCount === 1 ? "y" : "ies"}`,
                  }
                : null,
              payload.disciplineProofs.length > 0
                ? {
                    label:
                      locale === "vi"
                        ? `${payload.disciplineProofs.length} discipline`
                        : `${payload.disciplineProofs.length} discipline`,
                  }
                : null,
              payload.trailDay.status === TrailDayStatus.Closed
                ? { label: locale === "vi" ? "Khep ngay" : "Closed day" }
                : null,
            ].filter(Boolean) as { label: string }[];

            return {
              id: payload.trailDay.date,
              label: locale === "vi" ? "Nhat ky ngay" : "Daily journal",
              date: resolveJournalDayDate(payload.trailDay.date),
              chips,
            } satisfies JournalRecentRow;
          });

        const dailyByDay = Object.fromEntries(
          dayPayloads.map((payload) => {
            const entries = [
              ...payload.memories.map(({ memory, mediaItems }) =>
                ({
                  sortAt: resolveMemoryJournalTime({ ...memory, timezone: app.user.timezone }).sortAt,
                  entry: mapMemoryToDailyEntry(
                    memory,
                    locale,
                    pathLabelById.get(memory.pathId ?? "") ?? defaultPathLabel(locale),
                    pathUiIdById.get(memory.pathId ?? ""),
                    app.user.timezone,
                    toJournalImageSource(mediaItems[0]),
                    mediaItems,
                  ),
                }),
              ),
              ...payload.marks
                .filter(
                  ({ mark, metadata }) =>
                    isJournalFinalMark(mark.status) && metadata?.appearsInJournal !== false,
                )
                .map(({ mark, metadata }) =>
                  ({
                    sortAt: resolveMarkJournalTime({ ...mark, timezone: app.user.timezone }).sortAt,
                    entry: mapMarkToJournalEntry(
                      mark,
                      metadata,
                      locale,
                      pathLabelById.get(mark.pathId) ?? defaultPathLabel(locale),
                      app.user.timezone,
                      pathUiIdById.get(mark.pathId),
                    ),
                  }),
                ),
            ]
              .sort((left, right) => left.sortAt.localeCompare(right.sortAt));

            const closedDayCard =
              payload.trailDay.status === TrailDayStatus.Closed
                ? {
                    variant: (
                      payload.judgment?.day.passed === false ? "repair"
                      : payload.judgment?.character.passed ? "protected"
                      : "neutral"
                    ) as "protected" | "repair" | "neutral",
                    dayTitle: payload.judgment?.day.label ?? (locale === "vi" ? "Ngay da khep" : "Day closed"),
                    dayIconSemanticName: payload.judgment?.day.icon,
                    characterLabel:
                      payload.judgment?.character.label ??
                      payload.characterProjection.displayLabel ??
                      payload.trailDay.characterResult ??
                      (locale === "vi" ? "Da khep" : "Closed"),
                    characterIconSemanticName: payload.judgment?.character.icon,
                    summary:
                      payload.judgment ?
                        payload.judgment.plannedMarkOutcomes.sentence
                      : payload.trailDay.closeSummary ?? undefined,
                    whatMattered: payload.reflections[0]?.text ?? payload.memories[0]?.memory.title,
                    tomorrowFirstStep: payload.trailDay.tomorrowFirstStep ?? undefined,
                    markCountLabel:
                      payload.judgment ?
                        `${payload.judgment.character.completedDisciplineStandards} discipline proof${payload.judgment.character.completedDisciplineStandards === 1 ? "" : "s"}`
                      :
                      (locale === "vi"
                        ? `${payload.characterProjection.keptCount} kept - ${payload.characterProjection.protectedCount} protected`
                        : `${payload.characterProjection.keptCount} kept - ${payload.characterProjection.protectedCount} protected`),
                  }
                : undefined satisfies DailyJournalClosedDayCard | undefined;

            const projected = projectDailyJournalViewState({
              dayKey: payload.trailDay.date,
              todayKey: todayLocalDate,
              dateLabel: formatDailyDayLabel(payload.trailDay.date, locale),
              backgroundMotif: resolveRecentCollectionCardSkin(resolveJournalDayDate(payload.trailDay.date)).motif,
              entries,
              closedDayCard,
            });

            return [
              payload.trailDay.date,
              {
                ...projected,
                debug: {
                  selectedDate: payload.trailDay.date,
                  trailDayId: payload.trailDay.id,
                  journalEntries: projected.entries.length,
                  memoryEntries: payload.memories.length,
                  completedMarks: payload.marks.filter(({ mark }) => mark.status === MarkInstanceStatus.Completed || mark.status === MarkInstanceStatus.PartiallyCompleted).length,
                  hasClosedTrail: payload.trailDay.status === TrailDayStatus.Closed,
                },
              } satisfies DailyJournalData,
            ] as const;
          }),
        );

        const home: JournalHomeData = {
          dateLabel: locale === "vi" ? "Hom nay" : "Today",
          dateOptions: Array.from({ length: JOURNAL_HOME_DAY_COUNT }, (_, index) => {
            const id = shiftDailyJournalDate(todayLocalDate, -index);
            return { id, label: formatDayLabel(id, locale) };
          }),
          latestHero: latestMemory
            ? {
                sourceId: latestMemory.memory.id,
                sourceType: "memory" as const,
                title: latestMemory.memory.title,
                subtitle: latestMemory.memory.note ?? latestMemory.memory.capturedAt,
                eyebrow: locale === "vi" ? "Ky uc moi nhat" : "Latest memory",
                dateLabel: formatDayLabel(latestMemory.memory.capturedAt.slice(0, 10), locale),
                pathLabel: pathLabelById.get(latestMemory.memory.pathId ?? ""),
                images:
                  latestMemory.mediaItems.length > 0 ? latestMemory.mediaItems.map(toJournalImageSource).filter(isDefined)
                  : latestMemoryPathHeroAssetId ? [{ assetId: latestMemoryPathHeroAssetId, alt: latestMemory.memory.title }]
                  : [],
                mediaItems: latestMemory.mediaItems,
              }
            : {
                title: locale === "vi" ? "Chua co ky uc nao" : "No memories yet",
                subtitle:
                  locale === "vi"
                    ? "Ky uc se xuat hien o day ngay khi duoc luu vao journal."
                    : "Memories will appear here as soon as they are saved into the journal.",
                eyebrow: locale === "vi" ? "Ky uc moi nhat" : "Latest memory",
                dateLabel: formatDayLabel(todayLocalDate, locale),
                pathLabel: defaultPathLabel(locale),
              },
          recentRows,
          lookBackCards: [],
          upcomingCards: [],
        };

        if (!cancelled) {
          lastLoadedReloadTokenRef.current = reloadToken;
          const dailyLoadStateByDay = Object.fromEntries(
            Object.keys(dailyByDay).map((dayKey) => [dayKey, { status: "ready", error: null } satisfies DailyJournalLoadState]),
          );
          setState({
            status: "ready",
            error: null,
            home,
            dailyByDay,
            dailyLoadStateByDay,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            status: "error",
            error: error instanceof Error ? error : new Error("Failed to load journal."),
            home: current.home,
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [app, enabled, locale, reloadToken]);

  const actions = useMemo(
    () => ({
      refresh,
      async loadDailyJournal(dayKey: string) {
        if (!enabled) {
          return;
        }

        const current = stateRef.current;
        if (current.status !== "ready") {
          return;
        }
        if (current.dailyLoadStateByDay[dayKey]?.status === "ready" && current.dailyByDay[dayKey]) {
          return;
        }
        const existingLoad = inFlightDailyLoadsRef.current.get(dayKey);
        if (existingLoad) {
          await existingLoad;
          return;
        }

        setState((currentState) => {
          if (currentState.status !== "ready") {
            return currentState;
          }
          return {
            ...currentState,
            dailyLoadStateByDay: {
              ...currentState.dailyLoadStateByDay,
              [dayKey]: { status: "loading", error: null },
            },
          };
        });

        const loadPromise = (async () => {
          try {
            const todayLocalDate = formatLocalDate(new Date(), app.user.timezone);
            const paths = await app.repositories.paths.listActivePaths(app.user.id);
            const pathLabelById = new Map(
              paths.map((path) => [path.id, mapUiPathLabel(path.slug, path.title, locale)] as const),
            );
            const pathUiIdById = new Map(paths.map((path) => [path.id, mapUiPathId(path.slug, path.title)] as const));
            const trailDay = await app.repositories.trailDays.getTrailDayByDate(app.user.id, dayKey);
            const daily =
              trailDay ?
                await loadDailyJournalData({
                  closeTrailEngine: app.closeTrailEngine,
                  repositories: app.repositories,
                  userId: app.user.id,
                  timezone: app.user.timezone,
                  locale,
                  trailDay,
                  todayLocalDate,
                  pathLabelById,
                  pathUiIdById,
                })
              : createEmptyDailyJournal(dayKey, todayLocalDate, locale);

            setState((currentState) => {
              if (currentState.status !== "ready") {
                return currentState;
              }
              return {
                ...currentState,
                dailyByDay: {
                  ...currentState.dailyByDay,
                  [dayKey]: daily,
                },
                dailyLoadStateByDay: {
                  ...currentState.dailyLoadStateByDay,
                  [dayKey]: { status: "ready", error: null },
                },
              };
            });
          } catch (error) {
            const resolvedError = error instanceof Error ? error : new Error("Failed to load daily journal.");
            setState((currentState) => {
              if (currentState.status !== "ready") {
                return currentState;
              }
              return {
                ...currentState,
                dailyLoadStateByDay: {
                  ...currentState.dailyLoadStateByDay,
                  [dayKey]: { status: "error", error: resolvedError },
                },
              };
            });
          }
        })();

        inFlightDailyLoadsRef.current.set(dayKey, loadPromise);
        try {
          await loadPromise;
        } finally {
          if (inFlightDailyLoadsRef.current.get(dayKey) === loadPromise) {
            inFlightDailyLoadsRef.current.delete(dayKey);
          }
        }
      },
      invalidateDailyJournal(dayKey: string) {
        setState((current) => {
          if (current.status !== "ready") {
            return current;
          }
          const { [dayKey]: _removedDaily, ...dailyByDay } = current.dailyByDay;
          const { [dayKey]: _removedState, ...dailyLoadStateByDay } = current.dailyLoadStateByDay;
          return {
            ...current,
            dailyByDay,
            dailyLoadStateByDay,
          };
        });
      },
      async createMemory(
        title: string,
        noteDetail: string,
        pathId: PathId,
        mediaAttachments?: CaptureMediaAttachment[],
        photoAttachment?: CapturePhotoAttachment | null,
      ) {
        const paths = await app.repositories.paths.listActivePaths(app.user.id);
        const resolvedPath = paths.find((path) => mapUiPathId(path.slug, path.title) === pathId);
        await createJournalMemoryCapture({
          repositories: app.repositories,
          user: app.user,
          locale,
          title,
          noteDetail,
          resolvedPathId: resolvedPath?.id ?? null,
          mediaAttachments,
          photoAttachment,
        });
        refresh();
      },
    }),
    [app, enabled, locale, refresh],
  );

  const getDailyJournal = useCallback(
    (dayKey: string) => {
      const fallback = createEmptyDailyJournal(dayKey, formatLocalDate(new Date(), app.user.timezone), locale);
      if (state.status !== "ready") {
        return fallback;
      }
      return state.dailyByDay[dayKey] ?? fallback;
    },
    [app.user.timezone, locale, state],
  );

  const getDailyJournalLoadState = useCallback(
    (dayKey: string): DailyJournalLoadState => {
      if (state.status === "loading") {
        return { status: "loading", error: null };
      }
      if (state.status === "error") {
        return { status: "error", error: state.error };
      }
      return state.dailyLoadStateByDay[dayKey] ?? (state.dailyByDay[dayKey] ? { status: "ready", error: null } : { status: "idle", error: null });
    },
    [state],
  );

  return {
    ...state,
    ...actions,
    getDailyJournal,
    getDailyJournalLoadState,
  };
}

function createEmptyDailyJournal(dayKey: string, todayKey: string, locale: Locale): DailyJournalData {
  return {
    ...projectDailyJournalViewState({
      dayKey,
      todayKey,
      dateLabel: formatDailyDayLabel(dayKey, locale),
      entries: [],
    }),
    debug: {
      selectedDate: dayKey,
      trailDayId: "",
      journalEntries: 0,
      memoryEntries: 0,
      completedMarks: 0,
      hasClosedTrail: false,
    },
  };
}

async function loadDailyJournalData(input: {
  closeTrailEngine: WaymarkAppServices["closeTrailEngine"];
  repositories: WaymarkAppServices["repositories"];
  userId: string;
  timezone: string;
  locale: Locale;
  trailDay: TrailDay;
  todayLocalDate: string;
  pathLabelById: Map<string, string>;
  pathUiIdById: Map<string, PathId | undefined>;
}): Promise<DailyJournalData> {
  const marks = await listJournalTrailMarksForTrailDay(input, input.trailDay);
  const memories = await input.repositories.memories.listMemoriesByTrailDay(input.trailDay.id);
  const reflections = await input.repositories.trailDays.listReflectionEntries(input.trailDay.id);
  const disciplineProofs = await listDisciplineProofsByTrailDay(
    input.repositories.appSettings,
    input.userId,
    input.trailDay.id,
  );
  const memoriesWithMedia = await Promise.all(
    memories.map(async (memory) => ({
      memory,
      mediaItems: await listWaymarkMediaForOwner(input.repositories, {
        ownerType: MediaAssetOwnerType.Memory,
        ownerId: memory.id,
        alt: memory.title,
        legacyMediaAssetIds: memory.mediaAssetIds,
        downloadPolicy: JOURNAL_MEDIA_DOWNLOAD_POLICY,
        usage: `journal:memory:${memory.id}`,
      }),
    })),
  );
  const marksWithMetadata = await Promise.all(
    marks.map(async (mark) => ({
      mark,
      metadata: await getMarkMetadata(input.repositories.appSettings, input.userId, mark.id),
    })),
  );
  const judgment =
    input.trailDay.status === TrailDayStatus.Closed
      ? await input.closeTrailEngine.getCloseTrailJudgment(input.trailDay.id)
      : undefined;
  const characterProjection = projectCharacterFromRecords({
    marks: marksWithMetadata,
    disciplineProofs,
  });
  const entries = [
    ...memoriesWithMedia.map(({ memory, mediaItems }) =>
      ({
        sortAt: resolveMemoryJournalTime({ ...memory, timezone: input.timezone }).sortAt,
        entry: mapMemoryToDailyEntry(
          memory,
          input.locale,
          input.pathLabelById.get(memory.pathId ?? "") ?? defaultPathLabel(input.locale),
          input.pathUiIdById.get(memory.pathId ?? ""),
          input.timezone,
          toJournalImageSource(mediaItems[0]),
          mediaItems,
        ),
      }),
    ),
    ...marksWithMetadata
      .filter(({ mark, metadata }) => isJournalFinalMark(mark.status) && metadata?.appearsInJournal !== false)
      .map(({ mark, metadata }) =>
        ({
          sortAt: resolveMarkJournalTime({ ...mark, timezone: input.timezone }).sortAt,
          entry: mapMarkToJournalEntry(
            mark,
            metadata,
            input.locale,
            input.pathLabelById.get(mark.pathId) ?? defaultPathLabel(input.locale),
            input.timezone,
          input.pathUiIdById.get(mark.pathId),
        ),
      }),
    ),
  ].sort((left, right) => left.sortAt.localeCompare(right.sortAt));
  const closedDayCard =
    input.trailDay.status === TrailDayStatus.Closed
      ? {
          variant: (
            judgment?.day.passed === false ? "repair"
            : judgment?.character.passed ? "protected"
            : "neutral"
          ) as "protected" | "repair" | "neutral",
          dayTitle: judgment?.day.label ?? (input.locale === "vi" ? "Ngay da khep" : "Day closed"),
          dayIconSemanticName: judgment?.day.icon,
          characterLabel:
            judgment?.character.label ??
            characterProjection.displayLabel ??
            input.trailDay.characterResult ??
            (input.locale === "vi" ? "Da khep" : "Closed"),
          characterIconSemanticName: judgment?.character.icon,
          summary: judgment ? judgment.plannedMarkOutcomes.sentence : input.trailDay.closeSummary ?? undefined,
          whatMattered: reflections[0]?.text ?? memoriesWithMedia[0]?.memory.title,
          tomorrowFirstStep: input.trailDay.tomorrowFirstStep ?? undefined,
          markCountLabel:
            judgment
              ? `${judgment.character.completedDisciplineStandards} discipline proof${judgment.character.completedDisciplineStandards === 1 ? "" : "s"}`
              : input.locale === "vi"
                ? `${characterProjection.keptCount} kept - ${characterProjection.protectedCount} protected`
                : `${characterProjection.keptCount} kept - ${characterProjection.protectedCount} protected`,
        }
      : undefined satisfies DailyJournalClosedDayCard | undefined;
  const projected = projectDailyJournalViewState({
    dayKey: input.trailDay.date,
    todayKey: input.todayLocalDate,
    dateLabel: formatDailyDayLabel(input.trailDay.date, input.locale),
    backgroundMotif: resolveRecentCollectionCardSkin(resolveJournalDayDate(input.trailDay.date)).motif,
    entries,
    closedDayCard,
  });
  return {
    ...projected,
    debug: {
      selectedDate: input.trailDay.date,
      trailDayId: input.trailDay.id,
      journalEntries: projected.entries.length,
      memoryEntries: memoriesWithMedia.length,
      completedMarks: marksWithMetadata.filter(({ mark }) => mark.status === MarkInstanceStatus.Completed || mark.status === MarkInstanceStatus.PartiallyCompleted).length,
      hasClosedTrail: input.trailDay.status === TrailDayStatus.Closed,
    },
  };
}

async function listJournalTrailMarksForTrailDay(
  input: Pick<WaymarkAppServices, "repositories"> & { userId: string; dailyPlanEngine?: WaymarkAppServices["dailyPlanEngine"] },
  trailDay: TrailDay,
): Promise<MarkInstance[]> {
  const dailyPlanEngine = input.dailyPlanEngine ?? createDailyPlanEngine(input.repositories);
  if ((await dailyPlanEngine.getCloseCompatibility(input.userId, trailDay.date)) === "legacy") {
    return input.repositories.marks.listMarkInstancesByTrailDay(trailDay.id);
  }

  const plan = await dailyPlanEngine.resolveEffectiveDailyPlan(input.userId, trailDay.date);
  if (plan.state?.status !== "confirmed") {
    return plan.effectiveMarks;
  }

  return projectConfirmedDailyPlan(plan)
    .entries
    .map((entry) => entry.outcomeMark)
    .filter((mark) => mark.trailDayId === trailDay.id);
}

function toJournalImageSource(
  mediaItem?: Awaited<ReturnType<typeof listWaymarkMediaForOwner>>[number],
) {
  if (!mediaItem) {
    return undefined;
  }

  return {
    alt: mediaItem.alt,
    src: mediaItem.posterSrc ?? mediaItem.src,
  };
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function isJournalFinalMark(status: MarkInstanceStatus) {
  return (
    isMarkFinalStatus(status) &&
    status !== MarkInstanceStatus.Cancelled &&
    status !== MarkInstanceStatus.Expired
  );
}

function defaultPathLabel(locale: Locale) {
  return locale === "vi" ? "Journal" : "Journal";
}

function mapUiPathLabel(slug: string, title: string, locale: Locale) {
  const pathId = mapUiPathId(slug, title);
  switch (pathId) {
    case "career":
      return locale === "vi" ? "Su nghiep" : "Career";
    case "snag":
      return "SNAG";
    case "health":
      return locale === "vi" ? "Suc khoe" : "Health";
    case "family":
      return locale === "vi" ? "Gia dinh" : "Family";
    case "character":
      return locale === "vi" ? "Khi chat" : "Character";
    case "golf":
      return "Golf";
    case "culture":
      return locale === "vi" ? "Van hoa" : "Culture";
    default:
      return title;
  }
}

function mapUiPathId(slug?: string, title?: string): PathId | undefined {
  const key = `${slug ?? ""} ${title ?? ""}`.toLowerCase();
  if (key.includes("career")) return "career";
  if (key.includes("snag")) return "snag";
  if (key.includes("health") || key.includes("body")) return "health";
  if (key.includes("family") || key.includes("home")) return "family";
  if (key.includes("character") || key.includes("stoic")) return "character";
  if (key.includes("golf")) return "golf";
  if (key.includes("culture") || key.includes("romance") || key.includes("class")) return "culture";
  return undefined;
}

function formatDayLabel(localDate: string, locale: Locale) {
  return resolveJournalDayDate(localDate).toLocaleDateString(
    locale === "vi" ? "vi-VN" : "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

function formatDailyDayLabel(localDate: string, locale: Locale) {
  return resolveJournalDayDate(localDate).toLocaleDateString(
    locale === "vi" ? "vi-VN" : "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

function resolveJournalDayDate(localDate: string) {
  return new Date(`${localDate}T00:00:00.000Z`);
}
