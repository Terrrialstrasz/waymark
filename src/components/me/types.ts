import { ReactNode } from "react";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { Locale } from "../../types/ui";

export type MeHubCardTone = "green" | "blue" | "ivory";

export type PrivacyStatusBadgeState = "protected" | "neutral" | "unavailable" | "warning";

export type BackupStatus =
  | { kind: "neverBackedUp" }
  | { kind: "lastBackupSuccess"; lastBackupAt: Date }
  | { kind: "backupInProgress" }
  | { kind: "backupFailed"; failedAt?: Date }
  | { kind: "unavailable" };

export type MeHubItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: WaymarkSemanticIconName;
  tone: MeHubCardTone;
  badgeLabel?: string;
  helperText?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export type SettingsRowItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: WaymarkSemanticIconName;
  statusBadge?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export type SettingsRowGroup = {
  id: string;
  title: string;
  subtitle: string;
  privateDocumentsCard?: PrivateDocumentsCardModel | null;
  hubItems?: MeHubItem[];
  childGroups?: SettingsRowGroup[];
  rows: SettingsRowItem[];
};

export type PrivacyStatusRow = {
  title: string;
  subtitle?: string;
  status: PrivacyStatusBadgeState;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export type BackupStatusRowModel = {
  status: BackupStatus;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export type MeOverviewAction = {
  onPress?: () => void;
  accessibilityLabel?: string;
};

export type PrivateDocumentsCardModel = {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};

export type MeOverviewCopy = {
  header: {
    title: string;
    subtitle: string;
    notifications: string;
    more: string;
  };
  privateDocuments: {
    title: string;
    subtitle: string;
    badge: string;
    accessibilityLabel: string;
  };
  settings: {
    title: string;
    subtitle: string;
    backupTitle: string;
    backupAccessibilityLabel: string;
  };
  principle: {
    title: string;
    body: string;
  };
  backup: {
    neverBackedUp: string;
    lastBackupToday: string;
    lastBackupAt: string;
    backupInProgress: string;
    backupFailed: string;
    backupFailedAt: string;
    unavailable: string;
  };
  count: {
    backlogOne: string;
    backlogOther: string;
  };
  weeklyCoding: {
    title: string;
    subtitle: string;
    helperText: string;
  };
  backlogHub: {
    title: string;
    subtitle: string;
  };
};

export type MeOverviewTemplateData = {
  locale: Locale;
  reducedMotion?: boolean;
  actions?: {
    notifications?: MeOverviewAction;
    more?: MeOverviewAction;
  };
  privateDocumentsCard?: PrivateDocumentsCardModel | null;
  hubItems?: MeHubItem[];
  settings?: {
    privacy?: PrivacyStatusRow | null;
    backup?: BackupStatusRowModel | null;
    rows?: SettingsRowItem[];
    groups?: SettingsRowGroup[];
  };
  principle?: {
    title?: string;
    body?: string;
    onPress?: () => void;
    accessibilityLabel?: string;
  } | null;
};
