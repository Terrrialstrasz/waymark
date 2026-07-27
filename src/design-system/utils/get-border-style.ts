import { ViewStyle } from "react-native";

type BorderSide = "all" | "top" | "right" | "bottom" | "left";

const borderPattern = /^([\d.]+)px\s+(solid|dashed)\s+(.+)$/;

function withSide(style: {
  borderWidth: number;
  borderStyle: "solid" | "dashed";
  borderColor: string;
}, side: BorderSide): ViewStyle {
  if (side === "all") {
    return style;
  }

  if (side === "top") {
    return {
      borderTopWidth: style.borderWidth,
      borderStyle: style.borderStyle,
      borderTopColor: style.borderColor,
    };
  }

  if (side === "right") {
    return {
      borderRightWidth: style.borderWidth,
      borderStyle: style.borderStyle,
      borderRightColor: style.borderColor,
    };
  }

  if (side === "bottom") {
    return {
      borderBottomWidth: style.borderWidth,
      borderStyle: style.borderStyle,
      borderBottomColor: style.borderColor,
    };
  }

  return {
    borderLeftWidth: style.borderWidth,
    borderStyle: style.borderStyle,
    borderLeftColor: style.borderColor,
  };
}

export function getBorderStyle(border: string, side: BorderSide = "all"): ViewStyle {
  if (border === "0px solid transparent") {
    return withSide(
      {
        borderWidth: 0,
        borderStyle: "solid",
        borderColor: "transparent",
      },
      side
    );
  }

  const match = border.match(borderPattern);

  if (!match) {
    return {};
  }

  const [, width, style, color] = match;

  return withSide(
    {
      borderWidth: Number(width),
      borderStyle: style as "solid" | "dashed",
      borderColor: color,
    },
    side
  );
}
