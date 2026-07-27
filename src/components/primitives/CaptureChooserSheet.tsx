import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import { Locale, PathId } from "../../types/ui";
import {
  captureChooserTokens,
  getWaymarkEasing,
  getWaymarkMotionDuration,
  motionSemanticTokens,
  motionTokens,
  spacing,
  useReducedMotionEnabled,
} from "../../theme/tokens";
import { CaptureAttachmentButton } from "./CaptureAttachmentButton";
import { CaptureDestinationButton } from "./CaptureDestinationButton";
import { CaptureNoteInput } from "./CaptureNoteInput";
import { NoteInputBase } from "./NoteInputBase";
import { WMText } from "./Text";
import { WaymarkIcon } from "./WaymarkIcon";
import { EntityChip } from "./EntityChip";
import { todayPathHeroPaths } from "../../lib/waymark/todayPathHero";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CaptureMediaAttachment } from "../../types/capture";

type CaptureDestinationId = "mark" | "memory" | "backlog";

type Props = {
  locale: Locale;
  visible: boolean;
  title: string;
  onClose: () => void;
  onDestinationPress?: (
    destination: CaptureDestinationId,
    noteTitle: string,
    noteDetail: string,
    pathId: PathId,
    mediaAttachments: CaptureMediaAttachment[],
  ) => void;
  onAddMediaPress?: () => void;
  mediaAttachmentEnabled?: boolean;
  mediaAttachments?: CaptureMediaAttachment[];
  onAddPhotoPress?: () => void;
  photoAttachmentEnabled?: boolean;
  photoAttachment?: CaptureMediaAttachment | null;
};

const copy = {
  en: {
    noteTitleLabel: "Note title",
    noteTitlePlaceholder: "Give this capture a title",
    notePlaceholder: "Type a quick note...",
    addMedia: "Add media",
    mediaAdded: "{count} attached",
    mark: "Mark",
    memory: "Memory",
    backlog: "Backlog",
  },
  vi: {
    noteTitleLabel: "Tiêu đề ghi chú",
    noteTitlePlaceholder: "Đặt tiêu đề cho mục này",
    notePlaceholder: "Ghi nhanh một dòng...",
    addMedia: "Them media",
    mediaAdded: "Da them {count}",
    mark: "Mark",
    memory: "Memory",
    backlog: "Backlog",
  },
} as const;

const destinations: { id: CaptureDestinationId; iconSemanticName: "entity.mark" | "entity.memory" | "entity.backlog" }[] = [
  { id: "mark", iconSemanticName: "entity.mark" },
  { id: "memory", iconSemanticName: "entity.memory" },
  { id: "backlog", iconSemanticName: "entity.backlog" },
];

export function CaptureChooserSheet({
  locale,
  visible,
  title,
  onClose,
  onDestinationPress,
  onAddMediaPress,
  mediaAttachmentEnabled = true,
  mediaAttachments = [],
  onAddPhotoPress,
  photoAttachmentEnabled,
  photoAttachment,
}: Props) {
  const reducedMotion = useReducedMotionEnabled();
  const insets = useSafeAreaInsets();
  const content = copy[locale];
  const [mounted, setMounted] = useState(visible);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDetail, setNoteDetail] = useState("");
  const [selectedPathId, setSelectedPathId] = useState<PathId | null>(null);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const resolvedMediaAttachments = mediaAttachments.length > 0 ? mediaAttachments : photoAttachment ? [photoAttachment] : [];
  const resolvedMediaAttachmentEnabled = photoAttachmentEnabled ?? mediaAttachmentEnabled;
  const resolvedAddMediaPress = onAddMediaPress ?? onAddPhotoPress;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: getWaymarkMotionDuration(motionSemanticTokens.sheet.enter.duration, reducedMotion),
        easing: getWaymarkEasing(motionSemanticTokens.sheet.enter.easing),
        useNativeDriver: false,
      }).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: getWaymarkMotionDuration(motionSemanticTokens.sheet.exit.duration, reducedMotion),
      easing: getWaymarkEasing(motionSemanticTokens.sheet.exit.easing),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [progress, reducedMotion, visible]);

  useEffect(() => {
    if (!visible) {
      setNoteTitle("");
      setNoteDetail("");
      setSelectedPathId(null);
    }
  }, [visible]);

  const getPathChipStyle = (path: typeof todayPathHeroPaths[number], selected: boolean) => ({
    borderColor: selected ? path.color.accentDeep : path.color.accentMuted,
    backgroundColor: selected ? path.color.accentMuted : path.color.accentSoft,
  });

  const getPathChipTextStyle = (path: typeof todayPathHeroPaths[number], selected: boolean) => ({
    color: path.color.accentDeep,
    fontWeight: selected ? ("700" as const) : ("600" as const),
  });

  if (!mounted) {
    return null;
  }

  const handleDestinationPress = (destination: CaptureDestinationId) => {
    if (!selectedPathId || noteTitle.trim().length === 0) {
      return;
    }

    onDestinationPress?.(destination, noteTitle.trim(), noteDetail.trim(), selectedPathId, resolvedMediaAttachments);
    setNoteTitle("");
    setNoteDetail("");
    onClose();
  };

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [motionTokens.opacity.hidden, motionSemanticTokens.backdrop.enter.opacity],
  });

  const sheetTranslateY = reducedMotion
    ? 0
    : progress.interpolate({
        inputRange: [0, 1],
        outputRange: [motionSemanticTokens.sheet.enter.translateY, 0],
      });

  const sheetScale = reducedMotion
    ? 1
    : progress.interpolate({
        inputRange: [0, 1],
        outputRange: [motionSemanticTokens.sheet.enter.scaleStart, 1],
      });

  return (
    <Modal transparent animationType="none" onRequestClose={onClose} visible={mounted}>
      <View style={styles.overlay}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: backdropOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              marginBottom: Math.max(insets.bottom, spacing.sm),
              paddingBottom: captureChooserTokens.spacing.sheetPaddingBottom + Math.max(insets.bottom, spacing.sm),
              transform: [
                { translateY: sheetTranslateY as number | Animated.AnimatedInterpolation<string | number> },
                { scale: sheetScale as number | Animated.AnimatedInterpolation<string | number> },
              ],
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <WMText style={styles.title} variant="sheetTitle">
              {title}
            </WMText>
            <WaymarkIcon decorative semanticName="botanical.headerLeafMark" size="sm" state="muted" />
          </View>

          <NoteInputBase
            accessibilityLabel={content.noteTitleLabel}
            label={content.noteTitleLabel}
            onChangeText={setNoteTitle}
            placeholder={content.noteTitlePlaceholder}
            value={noteTitle}
            variant="singleLine"
          />

          <CaptureNoteInput
            accessibilityLabel={content.notePlaceholder}
            onChangeText={setNoteDetail}
            placeholder={content.notePlaceholder}
            value={noteDetail}
          />

          <View style={styles.pathSection}>
            <View style={styles.pathChipWrap}>
              {todayPathHeroPaths.map((path) => {
                const selected = selectedPathId === path.id;
                return (
                  <EntityChip
                    key={path.id}
                    label={path.compactLabel[locale]}
                    onPress={() => setSelectedPathId(path.id)}
                    selected={selected}
                    style={getPathChipStyle(path, selected)}
                    textStyle={getPathChipTextStyle(path, selected)}
                    variant="filter"
                  />
                );
              })}
            </View>
          </View>

          {resolvedMediaAttachmentEnabled ? (
            <CaptureAttachmentButton
              accessibilityLabel={resolvedMediaAttachments.length > 0 ? content.mediaAdded.replace("{count}", String(resolvedMediaAttachments.length)) : content.addMedia}
              disabled={!resolvedAddMediaPress}
              label={resolvedMediaAttachments.length > 0 ? content.mediaAdded.replace("{count}", String(resolvedMediaAttachments.length)) : content.addMedia}
              onPress={resolvedAddMediaPress}
              selected={resolvedMediaAttachments.length > 0}
            />
          ) : null}

          <View style={styles.destinationRow}>
            {destinations.map((destination) => {
              const label =
                destination.id === "mark"
                  ? content.mark
                  : destination.id === "memory"
                    ? content.memory
                    : content.backlog;

              return (
                <CaptureDestinationButton
                  key={destination.id}
                  accessibilityLabel={`Create ${label}`}
                  disabled={!selectedPathId || noteTitle.trim().length === 0}
                  iconSemanticName={destination.iconSemanticName}
                  label={label}
                  onPress={() => handleDestinationPress(destination.id)}
                />
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: captureChooserTokens.color.backdrop,
  },
  sheet: {
    borderTopLeftRadius: captureChooserTokens.radius.sheet,
    borderTopRightRadius: captureChooserTokens.radius.sheet,
    backgroundColor: captureChooserTokens.color.surface,
    paddingHorizontal: captureChooserTokens.spacing.sheetPaddingX,
    paddingTop: captureChooserTokens.spacing.sheetPaddingTop,
    paddingBottom: captureChooserTokens.spacing.sheetPaddingBottom,
    gap: spacing.md,
    boxShadow: `0px -2px 14px ${captureChooserTokens.color.shadow}`,
  },
  handle: {
    alignSelf: "center",
    width: captureChooserTokens.size.handleWidth,
    height: captureChooserTokens.size.handleHeight,
    borderRadius: 999,
    backgroundColor: captureChooserTokens.color.border,
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 24,
  },
  title: {
    color: captureChooserTokens.color.prompt,
  },
  pathSection: {
    gap: spacing.xs,
  },
  pathChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  destinationRow: {
    flexDirection: "row",
    gap: captureChooserTokens.spacing.destinationGap,
  },
});
