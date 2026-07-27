export function normalizeWaymarkTimezone(timezone?: string | null) {
  if (!timezone || timezone.trim() === "") {
    return "UTC";
  }
  return timezone === "Asia/Saigon" ? "Asia/Ho_Chi_Minh" : timezone;
}

export function resolveWaymarkLocalDate(date: Date, timezone?: string | null) {
  const normalizedTimezone = normalizeWaymarkTimezone(timezone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizedTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}
