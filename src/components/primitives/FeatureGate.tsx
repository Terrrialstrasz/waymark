import { ReactNode } from "react";
import { View } from "react-native";
import { FeatureState } from "../../types/ui";
import { isFeatureVisible } from "../../utils/featureGate";

type Props = {
  state?: FeatureState;
  children: ReactNode;
};

export function FeatureGate({ state = "enabled", children }: Props) {
  if (!isFeatureVisible(state)) {
    return null;
  }

  return <View>{children}</View>;
}
