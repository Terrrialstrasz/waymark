import type { Path } from "../domain/waymark";
import type { Locale, PathId } from "../types/ui";
import { todayPathHeroPaths } from "../lib/waymark/todayPathHero";

export function formatLocalDate(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function buildZonedDateTime(localDate: string, time: string, timezone: string) {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const [year, month, day] = localDate.split("-").map((value) => Number.parseInt(value, 10));
  const [hour, minute, second] = normalizedTime.split(":").map((value) => Number.parseInt(value, 10));
  const utcGuess = Date.UTC(year, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, second ?? 0);
  const utcDate = new Date(utcGuess);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(utcDate);
  const actualYear = Number.parseInt(parts.find((part) => part.type === "year")?.value ?? "1970", 10);
  const actualMonth = Number.parseInt(parts.find((part) => part.type === "month")?.value ?? "01", 10);
  const actualDay = Number.parseInt(parts.find((part) => part.type === "day")?.value ?? "01", 10);
  const actualHour = Number.parseInt(parts.find((part) => part.type === "hour")?.value ?? "00", 10);
  const actualMinute = Number.parseInt(parts.find((part) => part.type === "minute")?.value ?? "00", 10);
  const actualSecond = Number.parseInt(parts.find((part) => part.type === "second")?.value ?? "00", 10);
  const actualUtc = Date.UTC(actualYear, actualMonth - 1, actualDay, actualHour, actualMinute, actualSecond);
  const targetUtc = Date.UTC(year, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, second ?? 0);
  return new Date(utcGuess - (actualUtc - targetUtc)).toISOString();
}

export function shiftLocalDate(localDate: string, offsetDays: number) {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function getWeekStartDate(localDate: string, weekStartsOn: number) {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const offset = (day - weekStartsOn + 7) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export function getWeekEndDate(weekStartDate: string) {
  return shiftLocalDate(weekStartDate, 6);
}

export function formatDayLabel(localDate: string, locale: Locale) {
  return new Date(`${localDate}T00:00:00.000Z`).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatWeekRangeLabel(weekStartDate: string, locale: Locale) {
  const start = new Date(`${weekStartDate}T00:00:00.000Z`);
  const end = new Date(`${getWeekEndDate(weekStartDate)}T00:00:00.000Z`);
  const formatter = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    month: "short",
    day: "numeric",
  });
  return `${formatter.format(start)}-${formatter.format(end)}`;
}

export function mapUiPathId(slug?: string, title?: string): PathId | undefined {
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

export function mapUiPathLabel(slug: string, title: string, locale: Locale) {
  const pathId = mapUiPathId(slug, title);
  return pathId ? pathLabelById(pathId, locale) : title;
}

export function pathLabelById(pathId: PathId, locale: Locale) {
  return todayPathHeroPaths.find((path) => path.id === pathId)?.compactLabel[locale] ?? pathId;
}

export function findPathByUiPathId(paths: Path[], pathId: PathId) {
  return paths.find((path) => mapUiPathId(path.slug, path.title) === pathId);
}
