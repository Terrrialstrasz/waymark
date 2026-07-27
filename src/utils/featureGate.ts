import { FeatureState } from "../types/ui";

export const isFeatureVisible = (state: FeatureState = "enabled") =>
  state !== "hidden";

export const isFeatureInteractive = (state: FeatureState = "enabled") =>
  state === "enabled";
