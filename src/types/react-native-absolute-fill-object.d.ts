import type { ViewStyle } from "react-native";

declare module "react-native" {
  interface StyleSheetStatic {
    absoluteFillObject: ViewStyle;
  }
}
