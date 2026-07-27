import { ReactNode } from "react";
import { ViewStyle } from "react-native";
import { SemanticState } from "../../theme/tokens";
import { FeatureState } from "../../types/ui";
import { JournalCard } from "./JournalCard";

type Props = {
  children: ReactNode;
  hidden?: boolean;
  gate?: FeatureState;
  pressable?: boolean;
  onPress?: () => void;
  tint?: "default" | "green" | "gold" | "blue" | "muted";
  decorationPreset?: "journalCard" | "entityCard" | "resultSeal";
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

export function WMCard({
  children,
  hidden,
  gate = "enabled",
  pressable,
  onPress,
  tint = "default",
  decorationPreset,
  style,
  contentStyle,
}: Props) {
  return (
    <JournalCard
      actionable={pressable}
      decorationPreset={decorationPreset}
      decorative={Boolean(decorationPreset)}
      gate={gate}
      hidden={hidden}
      onPress={onPress}
      stateTone={mapTintToStateTone(tint)}
      style={style}
      contentStyle={contentStyle}
      variant={mapTintToVariant(tint, pressable)}
    >
      {children}
    </JournalCard>
  );
}

function mapTintToStateTone(tint: Props["tint"]): Exclude<SemanticState, "hidden"> | undefined {
  switch (tint) {
    case "green":
      return "done";
    case "gold":
      return "planned";
    case "blue":
      return "protected";
    case "muted":
      return "quieted";
    default:
      return undefined;
  }
}

function mapTintToVariant(tint: Props["tint"], pressable?: boolean) {
  if (pressable) {
    return "actionable" as const;
  }

  if (tint === "muted") {
    return "nested" as const;
  }

  return "standard" as const;
}
