import { StyleProp, ViewStyle } from "react-native";
import { Locale } from "../../types/ui";
import { WaymarkLogoMark } from "./WaymarkLogoMark";
import { WaymarkLogoSize, WaymarkLogoVariant } from "../../skins/waymark/assets/logo";

type Props = {
  variant?: Exclude<WaymarkLogoVariant, "appIcon">;
  size?: WaymarkLogoSize;
  decorative?: boolean;
  label?: string;
  locale?: Locale;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// The approved Option C delivery in this repo is mark-only for now.
// Keep the lockup surface stable so a future approved wordmark can slot in
// without changing usage sites.
export function WaymarkLogoLockup({
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
