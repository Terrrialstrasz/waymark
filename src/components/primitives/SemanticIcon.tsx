import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";
import { StyleProp, ViewStyle } from "react-native";
import { CodeOwnedWaymarkSemanticIconName } from "../../design/waymark-icon-map";
import { foundationColors, iconSize } from "../../theme/tokens";

type IconSize = keyof typeof iconSize | "hero" | "custom";
type SemanticIconState = "default" | "active" | "selected" | "pressed" | "disabled" | "muted";

type Props = {
  semanticName: CodeOwnedWaymarkSemanticIconName;
  size?: IconSize;
  customWidth?: number;
  customHeight?: number;
  state?: SemanticIconState;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  decorative?: boolean;
};

type GlyphProps = {
  color: string;
  strokeWidth: number;
};

const sizeMap = {
  ...iconSize,
  hero: iconSize.xl,
  custom: iconSize.md,
} as const;

export function SemanticIcon({
  semanticName,
  size = "md",
  customWidth,
  customHeight,
  state = "default",
  color,
  strokeWidth = 1.9,
  style,
  accessibilityLabel,
  decorative = true,
}: Props) {
  const width = customWidth ?? sizeMap[size];
  const height = customHeight ?? sizeMap[size];
  const resolvedColor = color ?? resolveSemanticIconColor(semanticName, state);
  const glyph = renderGlyph(semanticName, {
    color: resolvedColor,
    strokeWidth,
  });

  return (
    <Svg
      accessibilityLabel={decorative ? undefined : accessibilityLabel ?? semanticName}
      accessible={!decorative}
      height={height}
      style={style}
      viewBox="0 0 24 24"
      width={width}
      fill="none"
    >
      {glyph}
    </Svg>
  );
}

function renderGlyph(name: CodeOwnedWaymarkSemanticIconName, props: GlyphProps) {
  const key = normalizeSemanticIconName(name);

  switch (key) {
    case "utility.back":
    case "utility.chevronLeft":
      return <Polyline points="15 5 8 12 15 19" {...strokeProps(props)} />;
    case "utility.chevron":
    case "utility.chevronRight":
    case "health.next":
      return <Polyline points="9 5 16 12 9 19" {...strokeProps(props)} />;
    case "utility.chevronUp":
      return <Polyline points="5 15 12 8 19 15" {...strokeProps(props)} />;
    case "utility.chevronDown":
      return <Polyline points="5 9 12 16 19 9" {...strokeProps(props)} />;
    case "utility.close":
      return (
        <>
          <Line x1="6" x2="18" y1="6" y2="18" {...strokeProps(props)} />
          <Line x1="18" x2="6" y1="6" y2="18" {...strokeProps(props)} />
        </>
      );
    case "utility.search":
      return (
        <>
          <Circle cx="11" cy="11" r="5.5" {...strokeProps(props)} />
          <Line x1="15.5" x2="19" y1="15.5" y2="19" {...strokeProps(props)} />
        </>
      );
    case "utility.more":
      return (
        <>
          <Circle cx="6" cy="12" fill={props.color} r="1.5" />
          <Circle cx="12" cy="12" fill={props.color} r="1.5" />
          <Circle cx="18" cy="12" fill={props.color} r="1.5" />
        </>
      );
    case "utility.calendar":
      return (
        <>
          <Rect height="14" rx="2.5" width="14" x="5" y="6" {...strokeProps(props)} />
          <Line x1="8" x2="8" y1="4" y2="8" {...strokeProps(props)} />
          <Line x1="16" x2="16" y1="4" y2="8" {...strokeProps(props)} />
          <Line x1="5" x2="19" y1="10" y2="10" {...strokeProps(props)} />
        </>
      );
    case "utility.clock":
    case "health.duration":
    case "health.sessionTimer":
    case "health.workTimer":
    case "health.restTimer":
    case "health.stretchTimer":
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...strokeProps(props)} />
          <Line x1="12" x2="12" y1="8" y2="12.5" {...strokeProps(props)} />
          <Line x1="12" x2="15.5" y1="12.5" y2="14.5" {...strokeProps(props)} />
        </>
      );
    case "utility.camera":
    case "utility.image":
    case "entity.photoAttachment":
      return (
        <>
          <Rect height="12" rx="2.5" width="16" x="4" y="7" {...strokeProps(props)} />
          <Path d="M8 7l1.4-2h5.2L16 7" {...strokeProps(props)} />
          <Circle cx="12" cy="13" r="3" {...strokeProps(props)} />
        </>
      );
    case "utility.video":
    case "entity.videoAttachment":
      return (
        <>
          <Rect height="12" rx="2.5" width="12" x="4" y="6" {...strokeProps(props)} />
          <Path d="M16 10l4-2.5v9L16 14z" {...strokeProps(props)} />
        </>
      );
    case "utility.microphone":
    case "entity.audioAttachment":
      return (
        <>
          <Rect height="8" rx="3" width="6" x="9" y="4" {...strokeProps(props)} />
          <Path d="M7.5 10.5a4.5 4.5 0 009 0" {...strokeProps(props)} />
          <Line x1="12" x2="12" y1="15" y2="19" {...strokeProps(props)} />
          <Line x1="9" x2="15" y1="19" y2="19" {...strokeProps(props)} />
        </>
      );
    case "utility.bell":
      return (
        <>
          <Path d="M8.5 17h7a2 2 0 002-2l-.6-1.2c-.6-1.2-.9-2.5-.9-3.9V9a4 4 0 00-8 0v.9c0 1.4-.3 2.7-.9 3.9L6.5 15a2 2 0 002 2z" {...strokeProps(props)} />
          <Path d="M10 18.2a2.2 2.2 0 004 0" {...strokeProps(props)} />
        </>
      );
    case "utility.language":
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...strokeProps(props)} />
          <Path d="M5.5 12h13" {...strokeProps(props)} />
          <Path d="M12 5c2 2 3 4.4 3 7s-1 5-3 7c-2-2-3-4.4-3-7s1-5 3-7z" {...strokeProps(props)} />
        </>
      );
    case "utility.settings":
      return (
        <>
          <Circle cx="12" cy="12" r="3.25" {...strokeProps(props)} />
          <Path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.6 6.6l1.4 1.4M16 16l1.4 1.4M17.4 6.6L16 8M8 16l-1.4 1.4" {...strokeProps(props)} />
        </>
      );
    case "utility.edit":
      return (
        <>
          <Path d="M5 19l3.3-.7L18 8.6 15.4 6 5.7 15.7 5 19z" {...strokeProps(props)} />
          <Path d="M13.8 7.6L16.4 10.2" {...strokeProps(props)} />
        </>
      );
    case "utility.delete":
      return (
        <>
          <Path d="M7 7h10M9 7V5.5h6V7M8.5 7l.7 11h5.6l.7-11" {...strokeProps(props)} />
          <Line x1="10" x2="10" y1="10" y2="16" {...strokeProps(props)} />
          <Line x1="14" x2="14" y1="10" y2="16" {...strokeProps(props)} />
        </>
      );
    case "utility.add":
      return (
        <>
          <Line x1="12" x2="12" y1="5" y2="19" {...strokeProps(props)} />
          <Line x1="5" x2="19" y1="12" y2="12" {...strokeProps(props)} />
        </>
      );
    case "utility.remove":
      return <Line x1="5" x2="19" y1="12" y2="12" {...strokeProps(props)} />;
    case "utility.share":
      return (
        <>
          <Circle cx="7" cy="12" fill={props.color} r="1.75" />
          <Circle cx="16.5" cy="7" fill={props.color} r="1.75" />
          <Circle cx="16.5" cy="17" fill={props.color} r="1.75" />
          <Line x1="8.7" x2="14.8" y1="11.2" y2="7.8" {...strokeProps(props)} />
          <Line x1="8.7" x2="14.8" y1="12.8" y2="16.2" {...strokeProps(props)} />
        </>
      );
    case "utility.download":
      return (
        <>
          <Line x1="12" x2="12" y1="5" y2="15" {...strokeProps(props)} />
          <Polyline points="8 11 12 15 16 11" {...strokeProps(props)} />
          <Line x1="6" x2="18" y1="19" y2="19" {...strokeProps(props)} />
        </>
      );
    case "utility.upload":
      return (
        <>
          <Line x1="12" x2="12" y1="19" y2="9" {...strokeProps(props)} />
          <Polyline points="8 13 12 9 16 13" {...strokeProps(props)} />
          <Line x1="6" x2="18" y1="5" y2="5" {...strokeProps(props)} />
        </>
      );
    case "utility.refresh":
    case "status.synced":
      return (
        <>
          <Path d="M7 8a6.5 6.5 0 019.8-.9L18 8.5V5h-3.4l1.1 1.1A5 5 0 106.5 15" {...strokeProps(props)} />
        </>
      );
    case "utility.filter":
      return <Path d="M5 6h14l-5.4 6v5l-3.2 1v-6L5 6z" {...strokeProps(props)} />;
    case "utility.sort":
      return (
        <>
          <Line x1="8" x2="8" y1="6" y2="18" {...strokeProps(props)} />
          <Polyline points="5.5 8.5 8 6 10.5 8.5" {...strokeProps(props)} />
          <Line x1="16" x2="16" y1="6" y2="18" {...strokeProps(props)} />
          <Polyline points="13.5 15.5 16 18 18.5 15.5" {...strokeProps(props)} />
        </>
      );
    case "utility.lock":
      return (
        <>
          <Rect height="9" rx="2" width="12" x="6" y="10" {...strokeProps(props)} />
          <Path d="M8.5 10V8.5a3.5 3.5 0 017 0V10" {...strokeProps(props)} />
        </>
      );
    case "utility.unlock":
      return (
        <>
          <Rect height="9" rx="2" width="12" x="6" y="10" {...strokeProps(props)} />
          <Path d="M15.5 10V8.5a3.5 3.5 0 00-7 0" {...strokeProps(props)} />
        </>
      );
    case "utility.info":
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...strokeProps(props)} />
          <Line x1="12" x2="12" y1="10.5" y2="15.5" {...strokeProps(props)} />
          <Circle cx="12" cy="7.5" fill={props.color} r="1" />
        </>
      );
    case "utility.warning":
      return (
        <>
          <Path d="M12 5l7 13H5l7-13z" {...strokeProps(props)} />
          <Line x1="12" x2="12" y1="9" y2="13.5" {...strokeProps(props)} />
          <Circle cx="12" cy="16.5" fill={props.color} r="1" />
        </>
      );
    case "utility.help":
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...strokeProps(props)} />
          <Path d="M9.5 9.5a2.6 2.6 0 115 0c0 1.8-2.5 2.1-2.5 4" {...strokeProps(props)} />
          <Circle cx="12" cy="17.5" fill={props.color} r="1" />
        </>
      );
    case "entity.mark":
    case "entity.plannedMark":
    case "entity.quickMark":
    case "entity.event":
      return (
        <>
          <Path d="M12 5a4.2 4.2 0 014.2 4.2c0 3.4-4.2 8.8-4.2 8.8s-4.2-5.4-4.2-8.8A4.2 4.2 0 0112 5z" {...strokeProps(props)} />
          <Circle cx="12" cy="9.2" r="1.4" {...strokeProps(props)} />
        </>
      );
    case "entity.proof":
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...strokeProps(props)} />
          <Polyline points="8.5 12.5 11 15 15.5 9.5" {...strokeProps(props)} />
        </>
      );
    case "entity.memory":
    case "entity.journalEntry":
    case "entity.note":
    case "entity.reflection":
      return (
        <>
          <Path d="M7 5.5h8l3 3V18H7z" {...strokeProps(props)} />
          <Path d="M15 5.5V9h3" {...strokeProps(props)} />
          <Line x1="9" x2="15" y1="12" y2="12" {...strokeProps(props)} />
          <Line x1="9" x2="14" y1="15" y2="15" {...strokeProps(props)} />
        </>
      );
    case "entity.backlog":
      return (
        <>
          <Rect height="13" rx="2" width="12" x="6" y="6" {...strokeProps(props)} />
          <Line x1="9" x2="15" y1="10" y2="10" {...strokeProps(props)} />
          <Line x1="9" x2="15" y1="13" y2="13" {...strokeProps(props)} />
          <Line x1="9" x2="13" y1="16" y2="16" {...strokeProps(props)} />
        </>
      );
    case "entity.path":
      return (
        <>
          <Line x1="8" x2="8" y1="4.5" y2="19.5" {...strokeProps(props)} />
          <Path d="M8 6h9l-2.2 3L17 12H8" {...strokeProps(props)} />
        </>
      );
    case "entity.expedition":
    case "entity.familyActivity":
      return (
        <>
          <Path d="M5 18l4.5-8 3 4 2.5-5 4 9" {...strokeProps(props)} />
          <Path d="M7 18h10" {...strokeProps(props)} />
          <Path d="M9.5 6l1.8 1.2L15 5.5" {...strokeProps(props)} />
        </>
      );
    case "entity.milestone":
      return (
        <>
          <Circle cx="7" cy="12" fill={props.color} r="1.5" />
          <Circle cx="12" cy="8" fill={props.color} r="1.5" />
          <Circle cx="17" cy="14" fill={props.color} r="1.5" />
          <Line x1="8.2" x2="10.8" y1="11" y2="9" {...strokeProps(props)} />
          <Line x1="13.2" x2="15.8" y1="9" y2="13" {...strokeProps(props)} />
        </>
      );
    case "entity.packCheck":
    case "entity.checklist":
      return (
        <>
          <Rect height="11" rx="2.5" width="12" x="6" y="7" {...strokeProps(props)} />
          <Path d="M9 7V6a3 3 0 016 0v1" {...strokeProps(props)} />
          <Line x1="10" x2="14" y1="12" y2="12" {...strokeProps(props)} />
          <Line x1="10" x2="14" y1="15" y2="15" {...strokeProps(props)} />
        </>
      );
    case "entity.signal":
      return (
        <>
          <Path d="M12 6l4 7h-3l1 5-6-8h3l1-4z" {...strokeProps(props)} />
        </>
      );
    case "entity.privateDocument":
      return (
        <>
          <Path d="M7 5.5h8l3 3V18H7z" {...strokeProps(props)} />
          <Path d="M15 5.5V9h3" {...strokeProps(props)} />
          <Rect height="4" rx="1" width="5" x="9.5" y="12" {...strokeProps(props)} />
          <Path d="M10.5 12v-1a1.5 1.5 0 013 0v1" {...strokeProps(props)} />
        </>
      );
    case "entity.weeklyCodingReport":
      return (
        <>
          <Rect height="13" rx="2" width="12" x="6" y="6" {...strokeProps(props)} />
          <Line x1="9" x2="9" y1="15" y2="11.5" {...strokeProps(props)} />
          <Line x1="12" x2="12" y1="15" y2="9.5" {...strokeProps(props)} />
          <Line x1="15" x2="15" y1="15" y2="13" {...strokeProps(props)} />
        </>
      );
    case "entity.mediaAttachment":
      return (
        <>
          <Rect height="12" rx="2" width="14" x="5" y="6" {...strokeProps(props)} />
          <Circle cx="10" cy="11" r="1.4" {...strokeProps(props)} />
          <Path d="M8 16l3-3 2.5 2.5L16 13l3 3" {...strokeProps(props)} />
        </>
      );
    case "entity.document":
      return (
        <>
          <Path d="M7 5.5h8l3 3V18H7z" {...strokeProps(props)} />
          <Path d="M15 5.5V9h3" {...strokeProps(props)} />
        </>
      );
    case "entity.task":
      return (
        <>
          <Rect height="12" rx="2" width="12" x="6" y="6" {...strokeProps(props)} />
          <Polyline points="9 11.5 11 13.5 15 9.5" {...strokeProps(props)} />
        </>
      );
    case "status.planned":
    case "status.pending":
    case "status.upcoming":
    case "status.postponed":
    case "status.rescheduled":
      return <Path d="M12 5l1.9 3.8 4.1.6-3 2.9.7 4.2L12 14.7 8.3 16.5 9 12.3 6 9.4l4.1-.6L12 5z" {...strokeProps(props)} />;
    case "status.done":
    case "status.completed":
    case "status.resolved":
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...strokeProps(props)} />
          <Polyline points="8.5 12.5 11 15 15.5 9.5" {...strokeProps(props)} />
        </>
      );
    case "status.active":
      return (
        <>
          <Circle cx="12" cy="12" fill={props.color} r="3.2" />
          <Circle cx="12" cy="12" opacity="0.28" r="6.4" stroke={props.color} strokeWidth="1.5" />
        </>
      );
    case "status.inProgress":
    case "status.substituted":
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...strokeProps(props)} />
          <Path d="M12 8v4l2.8 2.8" {...strokeProps(props)} />
        </>
      );
    case "status.missed":
    case "status.failed":
    case "status.error":
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...strokeProps(props)} />
          <Line x1="9" x2="15" y1="9" y2="15" {...strokeProps(props)} />
          <Line x1="15" x2="9" y1="9" y2="15" {...strokeProps(props)} />
        </>
      );
    case "status.weak":
    case "status.warning":
      return (
        <>
          <Path d="M12 5l7 13H5l7-13z" {...strokeProps(props)} />
          <Line x1="12" x2="12" y1="9" y2="13.5" {...strokeProps(props)} />
          <Circle cx="12" cy="16.5" fill={props.color} r="1" />
        </>
      );
    case "status.protected":
    case "status.repaired":
      return (
        <>
          <Path d="M12 5l5 2v4.2c0 3.1-2 5.9-5 7.3-3-1.4-5-4.2-5-7.3V7l5-2z" {...strokeProps(props)} />
          <Polyline points="9.5 12.2 11.3 14 14.8 10.5" {...strokeProps(props)} />
        </>
      );
    case "status.blocked":
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...strokeProps(props)} />
          <Line x1="8.5" x2="15.5" y1="15.5" y2="8.5" {...strokeProps(props)} />
        </>
      );
    case "status.skipped":
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...strokeProps(props)} />
          <Polyline points="8.5 12 11 14.5 15.5 9.5" opacity="0.45" {...strokeProps(props)} />
          <Line x1="8" x2="16" y1="8" y2="16" {...strokeProps(props)} />
        </>
      );
    case "status.archived":
      return (
        <>
          <Rect height="11" rx="2" width="14" x="5" y="7" {...strokeProps(props)} />
          <Line x1="5" x2="19" y1="10" y2="10" {...strokeProps(props)} />
          <Line x1="10" x2="14" y1="13.5" y2="13.5" {...strokeProps(props)} />
        </>
      );
    case "status.unresolved":
    case "status.offline":
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...strokeProps(props)} />
          <Line x1="8.5" x2="15.5" y1="12" y2="12" {...strokeProps(props)} />
        </>
      );
    case "health.strength":
    case "health.load":
    case "health.exercise":
      return (
        <>
          <Line x1="9" x2="15" y1="12" y2="12" {...strokeProps(props)} />
          <Line x1="7.2" x2="7.2" y1="9.5" y2="14.5" {...strokeProps(props)} />
          <Line x1="16.8" x2="16.8" y1="9.5" y2="14.5" {...strokeProps(props)} />
          <Line x1="5.5" x2="5.5" y1="10.5" y2="13.5" {...strokeProps(props)} />
          <Line x1="18.5" x2="18.5" y1="10.5" y2="13.5" {...strokeProps(props)} />
        </>
      );
    case "health.walk":
    case "health.steps":
      return (
        <>
          <Path d="M8.5 8.5c1.3 1.3 1.8 2.8 1.6 4.6-.2 1.8-1.2 3.2-3 4.4" {...strokeProps(props)} />
          <Path d="M15.5 6.5c1.3 1.3 1.8 2.8 1.6 4.6-.2 1.8-1.2 3.2-3 4.4" {...strokeProps(props)} />
        </>
      );
    case "health.stretch":
    case "health.warmup":
    case "health.recovery":
      return (
        <>
          <Circle cx="12" cy="6.5" fill={props.color} r="1.4" />
          <Path d="M12 8.5v5M12 10.5l-3 2M12 10.5l3 2M12 13.5l-2.5 4M12 13.5l2.5 4" {...strokeProps(props)} />
        </>
      );
    case "health.cooldown":
      return (
        <>
          <Path d="M12 5.5l1.2 2.6L16 6.9l-.6 2.8 2.7.3-2.2 1.6 1.7 2.1-2.6-.8-.5 2.7-1.4-2.3-1.4 2.3-.5-2.7-2.6.8 1.7-2.1L5.9 10l2.7-.3L8 6.9l2.8 1.2L12 5.5z" {...strokeProps(props)} />
        </>
      );
    case "health.rest":
    case "health.pause":
      return (
        <>
          <Line x1="9.5" x2="9.5" y1="7" y2="17" {...strokeProps(props)} />
          <Line x1="14.5" x2="14.5" y1="7" y2="17" {...strokeProps(props)} />
        </>
      );
    case "health.play":
      return <Path d="M9 7.5v9l7-4.5-7-4.5z" {...strokeProps(props)} />;
    case "health.stop":
      return <Rect height="8" rx="1.5" width="8" x="8" y="8" {...strokeProps(props)} />;
    case "health.set":
    case "health.reps":
      return (
        <>
          <Line x1="8" x2="16" y1="9" y2="9" {...strokeProps(props)} />
          <Line x1="8" x2="16" y1="12" y2="12" {...strokeProps(props)} />
          <Line x1="8" x2="16" y1="15" y2="15" {...strokeProps(props)} />
        </>
      );
    case "health.setDone":
      return (
        <>
          <Rect height="12" rx="2" width="12" x="6" y="6" {...strokeProps(props)} />
          <Polyline points="9 12.2 11.2 14.4 15 10.2" {...strokeProps(props)} />
        </>
      );
    case "health.distance":
      return (
        <>
          <Line x1="6" x2="18" y1="12" y2="12" {...strokeProps(props)} />
          <Polyline points="8.5 9.5 6 12 8.5 14.5" {...strokeProps(props)} />
          <Polyline points="15.5 9.5 18 12 15.5 14.5" {...strokeProps(props)} />
        </>
      );
    default:
      return (
        <>
          <Circle cx="12" cy="12" r="7" {...strokeProps(props)} />
          <Line x1="12" x2="12" y1="8" y2="12" {...strokeProps(props)} />
          <Circle cx="12" cy="16" fill={props.color} r="1" />
        </>
      );
  }
}

function normalizeSemanticIconName(name: CodeOwnedWaymarkSemanticIconName) {
  if (name === "health.timer") {
    return "health.sessionTimer";
  }
  return name;
}

function resolveSemanticIconColor(name: CodeOwnedWaymarkSemanticIconName, state: SemanticIconState) {
  if (state === "disabled") {
    return foundationColors.ink.disabled;
  }

  if (state === "muted") {
    return foundationColors.ink.tertiary;
  }

  if (name.startsWith("status.")) {
    return resolveStatusColor(name);
  }

  if (name.startsWith("health.")) {
    return state === "active" || state === "selected" ? foundationColors.green.base : foundationColors.green.deep;
  }

  if (state === "active" || state === "selected") {
    return foundationColors.green.deep;
  }

  return foundationColors.ink.primary;
}

function resolveStatusColor(name: CodeOwnedWaymarkSemanticIconName) {
  if (
    name === "status.done" ||
    name === "status.completed" ||
    name === "status.resolved" ||
    name === "status.protected" ||
    name === "status.repaired" ||
    name === "status.active" ||
    name === "status.inProgress" ||
    name === "status.synced"
  ) {
    return foundationColors.green.deep;
  }

  if (
    name === "status.missed" ||
    name === "status.failed" ||
    name === "status.error"
  ) {
    return foundationColors.missed.base;
  }

  if (
    name === "status.warning" ||
    name === "status.weak" ||
    name === "status.blocked"
  ) {
    return foundationColors.gold.deep;
  }

  if (
    name === "status.unresolved" ||
    name === "status.offline" ||
    name === "status.archived"
  ) {
    return foundationColors.ink.tertiary;
  }

  return foundationColors.gold.deep;
}

function strokeProps({ color, strokeWidth }: GlyphProps) {
  return {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}
