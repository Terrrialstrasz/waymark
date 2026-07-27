import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import type { PackCheckSourceSeedId } from "../../config/packCheckCatalog";

type Props = {
  sourceSeedId: PackCheckSourceSeedId;
  color: string;
  size?: number;
};

export function PackCheckLogo({ sourceSeedId, color, size = 64 }: Props) {
  return (
    <Svg
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      viewBox="0 0 64 64"
      width={size}
    >
      {sourceSeedId === "family.before-leaving-home-check" ? (
        <>
          <Path d="M22 18 C22 10 42 10 42 18" />
          <Rect height={40} rx={9} width={30} x={17} y={17} />
          <Rect height={19} rx={3} width={7} x={10} y={29} />
          <Rect height={19} rx={3} width={7} x={47} y={29} />
          <Rect height={14} rx={3} width={16} x={24} y={35} />
          <Path d="M27 41 H37" />
          <Path d="M21 23 H43" />
        </>
      ) : null}
      {sourceSeedId === "style.daily-grooming-presence-check" ? (
        <G transform="rotate(-45 32 32)">
          <Rect height={10} rx={5} width={49} x={9} y={24} />
          <Path d="M27 34 V48" />
          <Path d="M31 34 V48" />
          <Path d="M35 34 V48" />
          <Path d="M39 34 V48" />
          <Path d="M43 34 V48" />
          <Path d="M47 34 V48" />
          <Path d="M51 34 V48" />
        </G>
      ) : null}
      {sourceSeedId === "health.workout-readiness-check" ? (
        <>
          <Path d="M7 32 H57" />
          <Rect height={12} rx={2} width={5} x={12} y={26} />
          <Rect height={20} rx={2} width={6} x={20} y={22} />
          <Rect height={20} rx={2} width={6} x={38} y={22} />
          <Rect height={12} rx={2} width={5} x={47} y={26} />
          <Path d="M4 32 H7" />
          <Path d="M57 32 H60" />
        </>
      ) : null}
      {sourceSeedId === "health.walk-readiness-check" ? (
        <>
          <Path d="M6 39 C8 31 11 24 17 24 C21 24 23 30 26 30 C29 30 31 26 34 23 L51 35 C57 39 60 44 55 49 H14 C8 49 5 44 6 39 Z" />
          <Path d="M9 48 H56" />
          <Path d="M12 53 H51 C55 53 57 51 57 48" />
          <Path d="M37 30 L33 36" />
          <Path d="M43 33 L39 39" />
          <Path d="M49 36 L45 42" />
        </>
      ) : null}
      {sourceSeedId === "family.home-shutdown-check" ? (
        <>
          <Path d="M12 34 L31 16 L50 34" />
          <Path d="M18 32 V56 H44 V32" />
          <Rect height={13} rx={1} width={9} x={27} y={43} />
          <Path d="M55 6 C50 9 49 17 54 22 C57 25 61 25 64 23 C61 29 53 29 48 24 C43 17 47 8 55 6 Z" />
        </>
      ) : null}
      {sourceSeedId === "golf.golf-outing-readiness-check" ? (
        <>
          <Rect height={31} rx={5} width={18} x={24} y={23} />
          <Rect height={6} rx={2} width={14} x={26} y={18} />
          <Path d="M23 30 C16 34 16 45 23 50" />
          <Path d="M31 18 V9" />
          <Ellipse cx={28} cy={9} rx={5} ry={3} />
          <Path d="M39 18 V11" />
          <Path d="M39 11 C46 10 49 15 42 18" />
          <Path d="M52 27 V56" />
          <Path d="M52 28 L60 33 L52 38" />
          <Path d="M48 56 H58" />
        </>
      ) : null}
      {sourceSeedId === "family.weekend-around-hanoi-readiness-check" ? (
        <>
          <Path d="M32 60 C20 46 13 37 13 26 C13 14 22 7 32 7 C42 7 51 14 51 26 C51 37 44 46 32 60 Z" />
          <Path d="M22 34 Q32 24 42 34" />
          <Path d="M25 37 H39" />
          <Path d="M24 47 H40" />
          <Path d="M27 37 V47" />
          <Path d="M32 37 V47" />
          <Path d="M37 37 V47" />
          <Path d="M32 25 V20" />
        </>
      ) : null}
      {sourceSeedId === "family.travel-tour-readiness-check" ? (
        <>
          <Path d="M24 18 V12 H40 V18" />
          <Rect height={37} rx={6} width={30} x={17} y={18} />
          <Path d="M26 27 V48" />
          <Path d="M38 27 V48" />
          <Circle cx={24} cy={58} r={2} />
          <Circle cx={40} cy={58} r={2} />
          <Path d="M17 31 H13 V47 H17" />
          <Path d="M47 31 H51 V47 H47" />
        </>
      ) : null}
      {sourceSeedId === "character.pilgrimage-readiness-check" ? (
        <>
          <Path d="M32 8 V15" />
          <Path d="M15 27 Q32 15 49 27" />
          <Path d="M19 30 H45" />
          <Path d="M20 39 Q32 30 44 39" />
          <Path d="M18 42 H46" />
          <Path d="M22 42 V53" />
          <Path d="M32 42 V53" />
          <Path d="M42 42 V53" />
          <Path d="M18 53 H46" />
          <Path d="M14 58 H50" />
        </>
      ) : null}
    </Svg>
  );
}
