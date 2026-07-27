function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

const GENERATED_WEEKLY_TIMETABLE_PROVENANCE_PATTERNS = [
  /^Imported from cleaned \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2} weekly timetable\.$/,
] as const;
const PACK_CHECK_REFERENCE_PATTERN = /\bPack checks?:\s*([^.]+)\.?/i;

export function isGeneratedImportProvenanceText(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const normalized = normalizeWhitespace(value);
  return GENERATED_WEEKLY_TIMETABLE_PROVENANCE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function sanitizeImportedWeeklyPlannedStorageText(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeWhitespace(value);
  if (normalized.length === 0) {
    return undefined;
  }
  if (isGeneratedImportProvenanceText(normalized)) {
    return undefined;
  }
  return normalized;
}

export function sanitizeUserFacingMarkDetail(value: string | null | undefined) {
  const sanitized = sanitizeImportedWeeklyPlannedStorageText(value);
  if (!sanitized) {
    return undefined;
  }

  const withoutPackChecks = normalizeWhitespace(sanitized.replace(PACK_CHECK_REFERENCE_PATTERN, ""));
  return withoutPackChecks.length > 0 ? withoutPackChecks : undefined;
}

export function extractPackCheckReferenceLabels(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  const normalized = normalizeWhitespace(value);
  const match = normalized.match(PACK_CHECK_REFERENCE_PATTERN);
  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(",")
    .map((token) => token.trim().replace(/\.$/, ""))
    .filter((token) => token.length > 0);
}
