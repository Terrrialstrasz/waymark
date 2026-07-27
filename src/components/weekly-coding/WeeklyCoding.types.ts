import { ImageSourcePropType } from "react-native";
import { WaymarkImageAssetId } from "../../assets/imageRegistry";
import { WaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { SemanticState } from "../../theme/tokens";
import { Locale, PathId } from "../../types/ui";

export type WeeklyCodingItemActionAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WeeklyCodingReportItem = {
  id: string;
  title: string;
  body?: string;
  description?: string;
  pathLabel: string;
  pathColor?: string;
  pathId?: PathId;
  statusLabel: string;
  statusTone?: Exclude<SemanticState, "hidden">;
  scheduleLabel: string;
  imageSrc?: ImageSourcePropType | string;
  imageAssetId?: WaymarkImageAssetId | string;
  pathHeroImageSrc?: ImageSourcePropType | string;
  iconSemanticName?: WaymarkSemanticIconName;
};

export type WeeklyCodingTemplateBaseProps = {
  locale?: Locale;
  reducedMotion?: boolean;
};
