import { StyleProp, ViewStyle } from "react-native";
import { Locale } from "../../types/ui";
import { WaymarkLogoSize, WaymarkLogoVariant } from "../../skins/waymark/assets/logo";
import { WaymarkLogoMark } from "./WaymarkLogoMark";

type Props = {
  variant?: WaymarkLogoVariant;
  size?: WaymarkLogoSize;
  decorative?: boolean;
  label?: string;
  locale?: Locale;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function WaymarkLogo({
  variant = "primary",
  size = "md",
  decorative = true,
  label,
  locale = "en",
  style,
  testID,
}: Props) {
  return (
    <WaymarkLogoMark
      decorative={decorative}
      label={label}
      locale={locale}
      size={size}
      style={style}
      testID={testID}
      variant={variant}
    />
  );
}
