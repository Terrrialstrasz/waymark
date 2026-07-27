import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useCopy } from "../../i18n/useCopy";
import { waymarkLogoTokens } from "../../theme/tokens";
import { Locale } from "../../types/ui";
import { WaymarkLogoSize, WaymarkLogoVariant } from "../../skins/waymark/assets/logo";
import { WaymarkImage } from "./WaymarkImage";

type Props = {
  variant: WaymarkLogoVariant;
  size?: WaymarkLogoSize;
  decorative?: boolean;
  label?: string;
  locale?: Locale;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function WaymarkLogoMark({
  variant,
  size = "md",
  decorative = true,
  label,
  locale = "en",
  style,
  testID,
}: Props) {
  const c = useCopy(locale);
  const boxSize = waymarkLogoTokens.size[size];
  const assetId = getLogoAssetId(variant);
  const source = getLogoPngSource(variant, size);
  const accessibilityLabel =
    label ?? (variant === "appIcon" ? c.brand.appIconLabel : c.brand.logoLabel);

  return (
    <View
      accessible={!decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "auto"}
      style={[styles.frame, { width: boxSize, height: boxSize }, style]}
      testID={testID}
    >
      <WaymarkImage
        alt={accessibilityLabel}
        assetId={source ? undefined : assetId}
        decorative={decorative}
        imageStyle={styles.image}
        src={source}
        usage="logo"
      />
    </View>
  );
}

function getLogoAssetId(variant: WaymarkLogoVariant) {
  if (variant === "appIcon") {
    return "logo.appIcon";
  }

  if (variant === "mono") {
    return "logo.mono";
  }

  return "logo.primary";
}

function getLogoImageVariant(size: WaymarkLogoSize) {
  if (size === "xs" || size === "sm") {
    return "iconSm";
  }

  if (size === "md") {
    return "iconMd";
  }

  return "iconLg";
}

function getLogoPngSource(variant: WaymarkLogoVariant, size: WaymarkLogoSize) {
  const imageVariant = getLogoImageVariant(size);

  if (variant === "appIcon") {
    if (imageVariant === "iconSm") {
      return require("../../../assets/skins/generated/logo/waymark-app-icon-stone-stamp/iconSm.webp");
    }

    if (imageVariant === "iconMd") {
      return require("../../../assets/skins/generated/logo/waymark-app-icon-stone-stamp/iconMd.webp");
    }

    return require("../../../assets/skins/generated/logo/waymark-app-icon-stone-stamp/iconLg.webp");
  }

  if (variant === "mono") {
    if (imageVariant === "iconSm") {
      return require("../../../assets/skins/generated/logo/waymark-stone-stamp-mono/iconSm.webp");
    }

    if (imageVariant === "iconMd") {
      return require("../../../assets/skins/generated/logo/waymark-stone-stamp-mono/iconMd.webp");
    }

    return require("../../../assets/skins/generated/logo/waymark-stone-stamp-mono/iconLg.webp");
  }

  if (imageVariant === "iconSm") {
    return require("../../../assets/skins/generated/logo/waymark-stone-stamp-primary/iconSm.webp");
  }

  if (imageVariant === "iconMd") {
    return require("../../../assets/skins/generated/logo/waymark-stone-stamp-primary/iconMd.webp");
  }

  return require("../../../assets/skins/generated/logo/waymark-stone-stamp-primary/iconLg.webp");
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
});
