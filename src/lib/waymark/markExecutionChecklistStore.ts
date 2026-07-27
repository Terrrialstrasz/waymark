import type { AppSettingsRepository } from "../../domain/waymark";

export type MarkExecutionChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type MarkExecutionChecklist = {
  markId: string;
  items: MarkExecutionChecklistItem[];
  userModified?: boolean;
};

const PREFIX = "mark_execution_checklist:";

function key(markId: string) {
  return `${PREFIX}${markId}`;
}

function buildItemId(markId: string, index: number) {
  return `execution_${markId}_${index}`;
}

export async function getMarkExecutionChecklist(
  settings: AppSettingsRepository,
  userId: string,
  markId: string,
): Promise<MarkExecutionChecklist | null> {
  const setting = await settings.getSetting(userId, key(markId));
  if (!setting || typeof setting.value !== "object" || setting.value === null) {
    return null;
  }
  return setting.value as MarkExecutionChecklist;
}

export async function ensureMarkExecutionChecklist(
  settings: AppSettingsRepository,
  userId: string,
  markId: string,
  labels: string[],
): Promise<MarkExecutionChecklist> {
  const existing = await getMarkExecutionChecklist(settings, userId, markId);
  if (existing) {
    return existing;
  }
  const created: MarkExecutionChecklist = {
    markId,
    items: labels.map((label, index) => ({
      id: buildItemId(markId, index),
      label,
      checked: false,
    })),
    userModified: false,
  };
  await settings.setSetting(userId, key(markId), created);
  return created;
}

export async function setMarkExecutionChecklistItemChecked(
  settings: AppSettingsRepository,
  userId: string,
  markId: string,
  itemId: string,
  checked: boolean,
): Promise<MarkExecutionChecklist | null> {
  const current = await getMarkExecutionChecklist(settings, userId, markId);
  if (!current) {
    return null;
  }
  const updated: MarkExecutionChecklist = {
    markId,
    userModified: true,
    items: current.items.map((item) => (item.id === itemId ? { ...item, checked } : item)),
  };
  await settings.setSetting(userId, key(markId), updated);
  return updated;
}
