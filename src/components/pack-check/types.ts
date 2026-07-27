import { PackCheckInstanceStatus } from "../../domain/waymark";
import { ReactNode } from "react";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { FeatureState, Locale, PathId } from "../../types/ui";

export type PackCheckItem = {
  id: string;
  label: string;
  iconName?: WaymarkSemanticIconName;
  checked: boolean;
  required?: boolean;
  disabled?: boolean;
};

export type PackCheckData = {
  id: string;
  name: string;
  path: PathId;
  status?: PackCheckInstanceStatus;
};

export type PackCheckTemplateProps = {
  packCheck: PackCheckData;
  locale: Locale;
  items: PackCheckItem[];
  onToggleItem?: (id: string) => void;
  onComplete?: () => void;
  onClearChecks?: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  gate?: FeatureState;
  showBack?: boolean;
  onBack?: () => void;
  headerActions?: ReactNode;
  signalContent?: ReactNode;
  withShell?: boolean;
};
