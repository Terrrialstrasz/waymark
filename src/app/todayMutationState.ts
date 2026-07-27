import type { TodayMarkStatus } from "../components/today/__fixtures__/todayCarousel.fixtures";
import type { TodayData } from "./todayDataLoader";

export type TodayMutationData = TodayData;

function doneStatusLabel(locale: "en" | "vi") {
  return locale === "vi" ? "Đã xong" : "Done";
}

function resolvedStatusLabel(locale: "en" | "vi") {
  return locale === "vi" ? "Da giai quyet" : "Resolved";
}

export function optimisticallyCompleteTodayMark(data: TodayMutationData, markId: string): TodayMutationData {
  const markIndex = data.marks.findIndex((mark) => mark.id === markId);
  if (markIndex < 0) {
    return data;
  }

  const nextMarks = [...data.marks];
  const currentMark = nextMarks[markIndex];
  nextMarks[markIndex] = {
    ...currentMark,
    status: "done",
    actionSheet: currentMark.actionSheet
      ? {
          ...currentMark.actionSheet,
          signalLabel: undefined,
          statusLabel: {
            en: doneStatusLabel("en"),
            vi: doneStatusLabel("vi"),
          },
        }
      : currentMark.actionSheet,
  };

  const markSignalId = data.signalIdByMarkId[markId];
  if (!markSignalId) {
    return {
      ...data,
      marks: nextMarks,
    };
  }

  const { [markId]: _removedSignalId, ...nextSignalIdByMarkId } = data.signalIdByMarkId;
  const { [markSignalId]: _removedSignal, ...nextSignalsById } = data.signalsById;

  return {
    ...data,
    marks: nextMarks,
    signalIdByMarkId: nextSignalIdByMarkId,
    signalsById: nextSignalsById,
  };
}

export function optimisticallyResolveTodayMark(
  data: TodayMutationData,
  markId: string,
  status: TodayMarkStatus = "resolved",
): TodayMutationData {
  const markIndex = data.marks.findIndex((mark) => mark.id === markId);
  if (markIndex < 0) {
    return data;
  }

  const nextMarks = [...data.marks];
  const currentMark = nextMarks[markIndex];
  nextMarks[markIndex] = {
    ...currentMark,
    status,
    actionSheet: currentMark.actionSheet
      ? {
          ...currentMark.actionSheet,
          signalLabel: undefined,
          statusLabel: {
            en: resolvedStatusLabel("en"),
            vi: resolvedStatusLabel("vi"),
          },
        }
      : currentMark.actionSheet,
  };

  const markSignalId = data.signalIdByMarkId[markId];
  if (!markSignalId) {
    return {
      ...data,
      marks: nextMarks,
    };
  }

  const { [markId]: _removedSignalId, ...nextSignalIdByMarkId } = data.signalIdByMarkId;
  const { [markSignalId]: _removedSignal, ...nextSignalsById } = data.signalsById;

  return {
    ...data,
    marks: nextMarks,
    signalIdByMarkId: nextSignalIdByMarkId,
    signalsById: nextSignalsById,
  };
}

export function rollbackCompletedTodayMark(
  current: TodayMutationData,
  snapshot: TodayMutationData,
  markId: string,
): TodayMutationData {
  const snapshotMark = snapshot.marks.find((mark) => mark.id === markId);
  if (!snapshotMark) {
    return current;
  }

  const currentMarkIndex = current.marks.findIndex((mark) => mark.id === markId);
  if (currentMarkIndex < 0) {
    return current;
  }

  const nextMarks = [...current.marks];
  nextMarks[currentMarkIndex] = snapshotMark;

  const nextSignalIdByMarkId = { ...current.signalIdByMarkId };
  const nextSignalsById = { ...current.signalsById };
  const snapshotSignalId = snapshot.signalIdByMarkId[markId];
  const currentSignalId = current.signalIdByMarkId[markId];

  if (snapshotSignalId) {
    nextSignalIdByMarkId[markId] = snapshotSignalId;
    const snapshotSignal = snapshot.signalsById[snapshotSignalId];
    if (snapshotSignal) {
      nextSignalsById[snapshotSignalId] = snapshotSignal;
    }
  } else if (currentSignalId) {
    delete nextSignalIdByMarkId[markId];
    delete nextSignalsById[currentSignalId];
  }

  return {
    ...current,
    marks: nextMarks,
    signalIdByMarkId: nextSignalIdByMarkId,
    signalsById: nextSignalsById,
  };
}

export function optimisticallyToggleChecklistItem(
  data: TodayMutationData,
  markId: string,
  packCheckId: string,
  itemId: string,
  checked: boolean,
): TodayMutationData {
  const markIndex = data.marks.findIndex((mark) => mark.id === markId);
  if (markIndex < 0) {
    return data;
  }

  const mark = data.marks[markIndex];
  const embeddedChecklist = mark.actionSheet?.embeddedChecklist;
  if (!embeddedChecklist || embeddedChecklist.packCheckId !== packCheckId) {
    return data;
  }

  const checklistItemIndex = embeddedChecklist.items.findIndex((item) => item.id === itemId);
  if (checklistItemIndex < 0 || embeddedChecklist.items[checklistItemIndex]?.checked === checked) {
    return data;
  }

  const nextChecklistItems = [...embeddedChecklist.items];
  nextChecklistItems[checklistItemIndex] = {
    ...nextChecklistItems[checklistItemIndex],
    checked,
  };

  const nextMarks = [...data.marks];
  nextMarks[markIndex] = {
    ...mark,
    actionSheet: mark.actionSheet
      ? {
          ...mark.actionSheet,
          embeddedChecklist: {
            ...embeddedChecklist,
            items: nextChecklistItems,
          },
        }
      : mark.actionSheet,
  };

  return {
    ...data,
    marks: nextMarks,
  };
}

export function optimisticallyToggleTodayPackCheckItem(
  data: TodayMutationData,
  packCheckId: string,
  itemId: string,
  checked: boolean,
): TodayMutationData {
  const packItems = data.packCheckItemsById[packCheckId];
  if (!packItems) {
    return data;
  }

  const itemIndex = packItems.findIndex((item) => item.id === itemId);
  if (itemIndex < 0 || packItems[itemIndex]?.checked === checked) {
    return data;
  }

  const nextPackItems = [...packItems];
  nextPackItems[itemIndex] = {
    ...nextPackItems[itemIndex],
    checked,
  };

  return {
    ...data,
    packCheckItemsById: {
      ...data.packCheckItemsById,
      [packCheckId]: nextPackItems,
    },
  };
}

export function optimisticallyCompleteTodayPackCheck(data: TodayMutationData, packCheckId: string): TodayMutationData {
  const packItems = data.packCheckItemsById[packCheckId];
  if (!packItems) {
    return data;
  }

  return {
    ...data,
    packCheckItemsById: {
      ...data.packCheckItemsById,
      [packCheckId]: packItems.map((item) => (item.checked ? item : { ...item, checked: true })),
    },
  };
}
