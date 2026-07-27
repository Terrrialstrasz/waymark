import { Locale } from "../../types/ui";
import { PrivacyStatusBadge } from "./PrivacyStatusBadge";
import { SettingsRow } from "./SettingsRow";
import { BackupStatus, PrivacyStatusBadgeState } from "./types";

type Props = {
  locale: Locale;
  title: string;
  status: BackupStatus;
  copy: {
    neverBackedUp: string;
    backedUp: string;
    lastBackupToday: string;
    lastBackupAt: string;
    backupInProgress: string;
    backupFailed: string;
    backupFailedAt: string;
    unavailable: string;
  };
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function BackupStatusRow({
  locale,
  title,
  status,
  copy,
  onPress,
  disabled,
  loading,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const description = getBackupDescription(status, locale, copy);
  const badge = getBackupBadge(status, copy);

  return (
    <SettingsRow
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? `${title}. ${description}`}
      disabled={disabled}
      icon="utility.calendar"
      loading={loading}
      onPress={onPress}
      statusBadge={badge ? <PrivacyStatusBadge label={badge.label} state={badge.state} /> : undefined}
      subtitle={description}
      title={title}
    />
  );
}

function getBackupDescription(
  status: BackupStatus,
  locale: Locale,
  copy: Props["copy"],
) {
  if (status.kind === "neverBackedUp") {
    return copy.neverBackedUp;
  }

  if (status.kind === "backupInProgress") {
    return copy.backupInProgress;
  }

  if (status.kind === "unavailable") {
    return copy.unavailable;
  }

  if (status.kind === "backupFailed") {
    if (!status.failedAt) {
      return copy.backupFailed;
    }

    return copy.backupFailedAt.replace("{date}", formatBackupDateTime(status.failedAt, locale));
  }

  if (isSameDay(status.lastBackupAt, new Date())) {
    return copy.lastBackupToday;
  }

  return copy.lastBackupAt.replace("{date}", formatBackupDateTime(status.lastBackupAt, locale));
}

function getBackupBadge(status: BackupStatus, copy: Props["copy"]): { label: string; state: PrivacyStatusBadgeState } | null {
  if (status.kind === "lastBackupSuccess") {
    return { label: copy.backedUp, state: "protected" };
  }

  if (status.kind === "backupFailed") {
    return { label: copy.backupFailed, state: "warning" };
  }

  if (status.kind === "backupInProgress") {
    return { label: copy.backupInProgress, state: "neutral" };
  }

  if (status.kind === "unavailable") {
    return { label: copy.unavailable, state: "unavailable" };
  }

  return null;
}

function formatBackupDateTime(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
