import type { TextStyle } from "react-native";

export const todayCarouselCard = {
  width: 252,
  height: 156,
  titleText: {
    fontSize: 17,
    lineHeight: 20,
  } satisfies TextStyle,
  bodyText: {
    fontSize: 14,
    lineHeight: 18,
  } satisfies TextStyle,
  metadataText: {
    fontSize: 10,
    lineHeight: 12,
  } satisfies TextStyle,
  statusChipText: {
    fontSize: 10,
    lineHeight: 12,
  } satisfies TextStyle,
} as const;
