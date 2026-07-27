import { ReactNode } from "react";
import { StyleProp, Text as RNText, TextStyle } from "react-native";
import { typography } from "../../theme/tokens";

type Variant = keyof typeof typography;

type Props = {
  children: ReactNode;
  variant?: Variant;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
  allowFontScaling?: boolean;
};

export function WMText({
  children,
  variant = "body",
  style,
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
  allowFontScaling,
}: Props) {
  return (
    <RNText
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      allowFontScaling={allowFontScaling}
      minimumFontScale={minimumFontScale}
      numberOfLines={numberOfLines}
      style={[typography[variant], style]}
    >
      {children}
    </RNText>
  );
}
