import { MarkInstanceOrigin, MarkInstanceStatus } from "../domain/waymark/enums";

type MarkTimeInput = {
  origin?: MarkInstanceOrigin;
  status: MarkInstanceStatus;
  timezone: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  completedAt?: string;
  skippedAt?: string;
  createdAt: string;
};

type MemoryTimeInput = {
  timezone: string;
  capturedAt: string;
};

function isFloatingDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?$/.test(value);
}

function formatTime(iso: string, timezone: string) {
  if (isFloatingDateTime(iso)) {
    const hours = iso.slice(11, 13);
    const minutes = iso.slice(14, 16);
    return `${hours}h${minutes}`;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date(iso));
  const hours = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minutes = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hours}h${minutes}`;
}

export function formatJournalTimeChipLabel(input: {
  start?: string;
  end?: string;
  timezone: string;
}) {
  const { start, end, timezone } = input;
  if (start && end) {
    return `${formatTime(start, timezone)}-${formatTime(end, timezone)}`;
  }
  if (start) {
    return formatTime(start, timezone);
  }
  if (end) {
    return formatTime(end, timezone);
  }
  return undefined;
}

export function resolveMarkJournalTime(input: MarkTimeInput) {
  if (input.origin === MarkInstanceOrigin.QuickCapture) {
    const capturedAt =
      input.status === MarkInstanceStatus.Completed || input.status === MarkInstanceStatus.PartiallyCompleted ? input.completedAt
      : input.status === MarkInstanceStatus.Skipped ? input.skippedAt
      : input.createdAt;

    return {
      sortAt: capturedAt ?? input.createdAt,
      chipLabel:
        capturedAt ?
          formatJournalTimeChipLabel({ start: capturedAt, timezone: input.timezone })
        : undefined,
    };
  }

  if (input.scheduledStartAt || input.scheduledEndAt) {
    return {
      sortAt: input.scheduledStartAt ?? input.scheduledEndAt ?? input.createdAt,
      chipLabel: formatJournalTimeChipLabel({
        start: input.scheduledStartAt,
        end: input.scheduledEndAt,
        timezone: input.timezone,
      }),
    };
  }

  const resolvedAt =
    input.status === MarkInstanceStatus.Completed || input.status === MarkInstanceStatus.PartiallyCompleted ? input.completedAt
    : input.status === MarkInstanceStatus.Skipped ? input.skippedAt
    : input.createdAt;

  return {
    sortAt: resolvedAt ?? input.createdAt,
    chipLabel:
      resolvedAt ?
        formatJournalTimeChipLabel({ start: resolvedAt, timezone: input.timezone })
      : undefined,
  };
}

export function resolveMemoryJournalTime(input: MemoryTimeInput) {
  return {
    sortAt: input.capturedAt,
    chipLabel: formatJournalTimeChipLabel({ start: input.capturedAt, timezone: input.timezone }),
  };
}
