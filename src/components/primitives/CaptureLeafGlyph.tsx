import Svg, { G, Path } from "react-native-svg";
import { captureLeafTokens, semanticTokens } from "../../theme/tokens";

type Props = {
  size?: number;
  color?: string;
  veinColor?: string;
};

export function CaptureLeafGlyph({
  size = semanticTokens.size.captureLeaf.icon,
  color = captureLeafTokens.icon,
  veinColor = captureLeafTokens.vein,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G transform="rotate(-14 12 12)">
        <Path
          d="M4.9 17.9C5.4 11.7 10.7 6.6 19.3 4.7C18.6 13.5 13.4 18.8 6.3 18.8C5.7 18.8 5.2 18.5 4.9 17.9Z"
          fill={color}
        />
        <Path
          d="M6.5 17.3C9.6 13.2 13.5 9.5 18.4 6.4"
          fill="none"
          stroke={veinColor}
          strokeWidth="1.45"
          strokeLinecap="round"
          opacity={0.82}
        />
        <Path
          d="M9.2 14.4C8.4 13 7.9 11.8 7.7 10.8M11.3 12.1C10.9 10.5 10.7 9.2 10.8 8.2M13.4 10.3C13.3 8.9 13.4 7.8 13.8 6.9M11.1 12.4C12.8 12.6 14.1 13.1 15.3 13.9M13.2 10.4C14.7 10.4 16 10.7 17.1 11.3"
          fill="none"
          stroke={veinColor}
          strokeWidth="1.05"
          strokeLinecap="round"
          opacity={0.7}
        />
      </G>
    </Svg>
  );
}
